const Ledger = (() => {
  const STORAGE_KEY = "pocket-ledger-v1";
  const VERSION = 1;

  const GROUPS = [
    { id: "needs", label: "Needs" },
    { id: "wants", label: "Wants" },
    { id: "savings", label: "Savings" },
    { id: "giving", label: "Giving" },
    { id: "other", label: "Other" },
  ];

  const STARTER_ENVELOPES = [
    { name: "Groceries", group: "needs", planCents: 60000 },
    { name: "Housing", group: "needs", planCents: 160000 },
    { name: "Utilities", group: "needs", planCents: 25000 },
    { name: "Transport", group: "needs", planCents: 20000 },
    { name: "Insurance", group: "needs", planCents: 15000 },
    { name: "Healthcare", group: "needs", planCents: 10000 },
    { name: "Dining out", group: "wants", planCents: 15000 },
    { name: "Fun", group: "wants", planCents: 10000 },
    { name: "Personal", group: "wants", planCents: 8000 },
    { name: "Emergency fund", group: "savings", planCents: 20000 },
    { name: "Goals", group: "savings", planCents: 15000 },
    { name: "Giving", group: "giving", planCents: 10000 },
  ];

  function uid(prefix) {
    const core = crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    return prefix + core;
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function currentMonthKey(date) {
    const d = date || new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1);
  }

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function monthLabel(ym) {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  function shiftMonth(ym, delta) {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return currentMonthKey(d);
  }

  function lastDayISO(ym) {
    const [y, m] = ym.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return ym + "-" + pad2(last);
  }

  function clampDateToMonth(iso, ym) {
    if (!iso) return ym + "-01";
    if (iso.startsWith(ym)) return iso;
    const day = Number(iso.slice(8, 10)) || 1;
    const last = Number(lastDayISO(ym).slice(8, 10));
    return ym + "-" + pad2(Math.min(day, last));
  }

  function defaultTxnDate(ym) {
    const today = todayISO();
    if (today.startsWith(ym)) return today;
    return ym + "-01";
  }

  function inMonth(iso, ym) {
    return typeof iso === "string" && iso.startsWith(ym);
  }

  function parseMoney(raw) {
    if (raw == null) return null;
    let text = String(raw).trim();
    if (!text) return null;
    text = text.replace(/[$\s,]/g, "");
    const neg = text.startsWith("(") && text.endsWith(")");
    if (neg) text = text.slice(1, -1);
    if (text.startsWith("-")) {
      text = text.slice(1);
    }
    if (!text || text === ".") return null;
    if (!/^\d+(\.\d{0,2})?$/.test(text)) return null;
    const cents = Math.round(Number(text) * 100);
    if (!Number.isFinite(cents)) return null;
    const signed = neg || String(raw).trim().startsWith("-") ? -cents : cents;
    return signed;
  }

  function formatMoney(cents, opts) {
    const options = opts || {};
    const value = Number(cents) || 0;
    const abs = Math.abs(value);
    const dollars = Math.floor(abs / 100);
    const rem = abs % 100;
    const body = "$" + dollars.toLocaleString("en-US") + "." + pad2(rem);
    if (value < 0) return options.signed === false ? "-" + body : "−" + body;
    if (options.signed && value > 0) return "+" + body;
    return body;
  }

  function formatInputMoney(cents) {
    const value = Number(cents) || 0;
    const abs = Math.abs(value);
    const whole = Math.floor(abs / 100);
    const rem = abs % 100;
    const body = rem === 0 ? String(whole) : whole + "." + pad2(rem);
    return value < 0 ? "-" + body : body;
  }

  function groupLabel(id) {
    const found = GROUPS.find((g) => g.id === id);
    return found ? found.label : "Other";
  }

  function emptyState() {
    return {
      version: VERSION,
      currentMonth: currentMonthKey(),
      categories: [],
      transactions: [],
      months: {},
    };
  }

  function monthRecord(state, ym) {
    if (!state.months[ym]) state.months[ym] = { assignments: {} };
    if (!state.months[ym].assignments) state.months[ym].assignments = {};
    return state.months[ym];
  }

  function assignedOf(state, ym, categoryId) {
    const rec = state.months[ym];
    if (!rec || !rec.assignments) return 0;
    return Number(rec.assignments[categoryId]) || 0;
  }

  function setAssigned(state, ym, categoryId, cents) {
    const rec = monthRecord(state, ym);
    const value = Math.max(0, Math.round(Number(cents) || 0));
    rec.assignments[categoryId] = value;
    return value;
  }

  function summarize(state, ym) {
    const incomeTxns = state.transactions.filter((t) => t.type === "income" && inMonth(t.date, ym));
    const expenseTxns = state.transactions.filter((t) => t.type === "expense" && inMonth(t.date, ym));
    const income = incomeTxns.reduce((sum, t) => sum + (t.amountCents || 0), 0);
    const spentTotal = expenseTxns.reduce((sum, t) => sum + (t.amountCents || 0), 0);

    const byCat = {};
    let assignedTotal = 0;
    state.categories.forEach((cat) => {
      const spent = expenseTxns
        .filter((t) => t.categoryId === cat.id)
        .reduce((sum, t) => sum + (t.amountCents || 0), 0);
      const assigned = assignedOf(state, ym, cat.id);
      assignedTotal += assigned;
      byCat[cat.id] = {
        spent,
        assigned,
        remaining: assigned - spent,
        plan: Number(cat.planCents) || 0,
      };
    });

    const uncategorizedSpent = expenseTxns
      .filter((t) => !t.categoryId || !byCat[t.categoryId])
      .reduce((sum, t) => sum + (t.amountCents || 0), 0);

    const leftover = income - assignedTotal;
    const envelopeLeft = Object.keys(byCat).reduce((sum, id) => sum + byCat[id].remaining, 0);
    const overspent = state.categories.filter((cat) => byCat[cat.id] && byCat[cat.id].remaining < 0);

    return {
      income,
      assignedTotal,
      spentTotal,
      leftover,
      envelopeLeft,
      byCat,
      uncategorizedSpent,
      overspent,
      incomeCount: incomeTxns.length,
      expenseCount: expenseTxns.length,
    };
  }

  function visibleCategories(state, ym, showArchived) {
    const totals = summarize(state, ym);
    return state.categories.filter((cat) => {
      if (!cat.archived) return true;
      if (showArchived) return true;
      const row = totals.byCat[cat.id];
      return row && (row.assigned > 0 || row.spent > 0);
    });
  }

  function categoriesByGroup(state, ym, showArchived) {
    const visible = visibleCategories(state, ym, showArchived);
    return GROUPS.map((group) => ({
      group,
      categories: visible.filter((cat) => (cat.group || "other") === group.id),
    })).filter((block) => block.categories.length > 0);
  }

  function monthTransactions(state, ym) {
    return state.transactions
      .filter((t) => inMonth(t.date, ym))
      .slice()
      .sort((a, b) => {
        if (a.date === b.date) return (b.createdAt || 0) - (a.createdAt || 0);
        return a.date < b.date ? 1 : -1;
      });
  }

  function spendReport(state, ym) {
    const totals = summarize(state, ym);
    const rows = state.categories
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        group: cat.group,
        spent: totals.byCat[cat.id] ? totals.byCat[cat.id].spent : 0,
      }))
      .filter((row) => row.spent > 0)
      .sort((a, b) => b.spent - a.spent);
    if (totals.uncategorizedSpent > 0) {
      rows.push({
        id: "uncategorized",
        name: "Uncategorized",
        group: "other",
        spent: totals.uncategorizedSpent,
      });
    }
    const max = rows.reduce((n, row) => Math.max(n, row.spent), 0);
    return { rows, max, total: totals.spentTotal };
  }

  function previousMonthWithAssignments(state, ym) {
    const keys = Object.keys(state.months)
      .filter((key) => key < ym)
      .sort();
    for (let i = keys.length - 1; i >= 0; i -= 1) {
      const assignments = state.months[keys[i]].assignments || {};
      if (Object.keys(assignments).some((id) => (assignments[id] || 0) > 0)) {
        return keys[i];
      }
    }
    return shiftMonth(ym, -1);
  }

  function copyForward(state, ym) {
    const source = previousMonthWithAssignments(state, ym);
    const src = state.months[source];
    if (!src || !src.assignments) return { copied: 0, source: null };
    const dest = monthRecord(state, ym);
    let copied = 0;
    state.categories.forEach((cat) => {
      if (cat.archived) return;
      const amount = Number(src.assignments[cat.id]) || 0;
      if (amount > 0) {
        dest.assignments[cat.id] = amount;
        copied += 1;
      }
    });
    return { copied, source };
  }

  function splitLeftover(state, ym) {
    const totals = summarize(state, ym);
    if (totals.leftover <= 0) return { added: 0, leftover: totals.leftover };
    const targets = state.categories.filter((cat) => !cat.archived);
    if (targets.length === 0) return { added: 0, leftover: totals.leftover };
    const base = Math.floor(totals.leftover / targets.length);
    let remainder = totals.leftover - base * targets.length;
    targets.forEach((cat) => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      setAssigned(state, ym, cat.id, assignedOf(state, ym, cat.id) + base + extra);
    });
    return { added: totals.leftover, leftover: 0 };
  }

  function fillPlans(state, ym) {
    const totals = summarize(state, ym);
    let leftover = totals.leftover;
    if (leftover <= 0) return { added: 0, leftover };
    let added = 0;
    const needy = state.categories
      .filter((cat) => !cat.archived && (cat.planCents || 0) > 0)
      .map((cat) => {
        const assigned = assignedOf(state, ym, cat.id);
        return { cat, need: Math.max(0, (cat.planCents || 0) - assigned) };
      })
      .filter((row) => row.need > 0);

    needy.forEach((row) => {
      if (leftover <= 0) return;
      const give = Math.min(leftover, row.need);
      setAssigned(state, ym, row.cat.id, assignedOf(state, ym, row.cat.id) + give);
      leftover -= give;
      added += give;
    });
    return { added, leftover };
  }

  function assignLeftoverTo(state, ym, categoryId) {
    const totals = summarize(state, ym);
    if (totals.leftover <= 0) return { added: 0 };
    setAssigned(state, ym, categoryId, assignedOf(state, ym, categoryId) + totals.leftover);
    return { added: totals.leftover };
  }

  function addStarterEnvelopes(state) {
    const existing = new Set(state.categories.map((c) => c.name.toLowerCase()));
    let added = 0;
    STARTER_ENVELOPES.forEach((row) => {
      if (existing.has(row.name.toLowerCase())) return;
      state.categories.push({
        id: uid("env-"),
        name: row.name,
        group: row.group,
        archived: false,
        planCents: row.planCents,
      });
      added += 1;
    });
    return added;
  }

  function upsertCategory(state, payload) {
    const name = String(payload.name || "").trim();
    if (!name) return null;
    const group = GROUPS.some((g) => g.id === payload.group) ? payload.group : "other";
    const planCents = Math.max(0, Number(payload.planCents) || 0);
    if (payload.id) {
      const cat = state.categories.find((c) => c.id === payload.id);
      if (!cat) return null;
      cat.name = name;
      cat.group = group;
      cat.planCents = planCents;
      if (typeof payload.archived === "boolean") cat.archived = payload.archived;
      return cat;
    }
    const cat = {
      id: uid("env-"),
      name,
      group,
      archived: false,
      planCents,
    };
    state.categories.push(cat);
    return cat;
  }

  function archiveCategory(state, id, archived) {
    const cat = state.categories.find((c) => c.id === id);
    if (!cat) return null;
    cat.archived = archived;
    return cat;
  }

  function upsertTransaction(state, payload) {
    const type = payload.type === "income" ? "income" : "expense";
    const payee = String(payload.payee || "").trim();
    const amountCents = Math.abs(Number(payload.amountCents) || 0);
    const date = payload.date;
    if (!payee || !amountCents || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const categoryId = type === "income" ? null : payload.categoryId || null;
    if (type === "expense" && !categoryId) return null;
    const note = String(payload.note || "").trim();
    if (payload.id) {
      const txn = state.transactions.find((t) => t.id === payload.id);
      if (!txn) return null;
      txn.type = type;
      txn.payee = payee;
      txn.amountCents = amountCents;
      txn.date = date;
      txn.categoryId = categoryId;
      txn.note = note;
      return txn;
    }
    const txn = {
      id: uid("txn-"),
      type,
      payee,
      amountCents,
      date,
      categoryId,
      note,
      createdAt: Date.now(),
    };
    state.transactions.push(txn);
    return txn;
  }

  function deleteTransaction(state, id) {
    const before = state.transactions.length;
    state.transactions = state.transactions.filter((t) => t.id !== id);
    return state.transactions.length !== before;
  }

  function loadSample(state) {
    const ym = state.currentMonth || currentMonthKey();
    state.currentMonth = ym;
    if (state.categories.length === 0) addStarterEnvelopes(state);
    const byName = {};
    state.categories.forEach((cat) => {
      byName[cat.name] = cat;
    });
    const assign = (name, cents) => {
      const cat = byName[name];
      if (cat) setAssigned(state, ym, cat.id, cents);
    };
    assign("Groceries", 60000);
    assign("Housing", 160000);
    assign("Utilities", 22000);
    assign("Transport", 18000);
    assign("Insurance", 15000);
    assign("Healthcare", 8000);
    assign("Dining out", 12000);
    assign("Fun", 8000);
    assign("Personal", 6000);
    assign("Emergency fund", 20000);
    assign("Goals", 10000);
    assign("Giving", 10000);

    const hasIncome = state.transactions.some((t) => t.type === "income" && inMonth(t.date, ym));
    if (!hasIncome) {
      upsertTransaction(state, {
        type: "income",
        payee: "Paycheck",
        amountCents: 280000,
        date: ym + "-01",
      });
      upsertTransaction(state, {
        type: "income",
        payee: "Side gig",
        amountCents: 45000,
        date: ym + "-08",
      });
    }
    const hasSpend = state.transactions.some((t) => t.type === "expense" && inMonth(t.date, ym));
    if (!hasSpend) {
      const groc = byName["Groceries"];
      const dine = byName["Dining out"];
      const gas = byName["Transport"];
      const util = byName["Utilities"];
      if (groc) {
        upsertTransaction(state, {
          type: "expense",
          payee: "Market Basket",
          amountCents: 12843,
          date: ym + "-03",
          categoryId: groc.id,
          note: "Weekly shop",
        });
        upsertTransaction(state, {
          type: "expense",
          payee: "Aldi",
          amountCents: 6420,
          date: ym + "-10",
          categoryId: groc.id,
        });
      }
      if (dine) {
        upsertTransaction(state, {
          type: "expense",
          payee: "Taco truck",
          amountCents: 1865,
          date: ym + "-06",
          categoryId: dine.id,
        });
        upsertTransaction(state, {
          type: "expense",
          payee: "Pizza night",
          amountCents: 3210,
          date: ym + "-12",
          categoryId: dine.id,
        });
      }
      if (gas) {
        upsertTransaction(state, {
          type: "expense",
          payee: "Shell",
          amountCents: 4822,
          date: ym + "-05",
          categoryId: gas.id,
        });
      }
      if (util) {
        upsertTransaction(state, {
          type: "expense",
          payee: "Electric co-op",
          amountCents: 11450,
          date: ym + "-04",
          categoryId: util.id,
        });
      }
    }
    return summarize(state, ym);
  }

  function sanitizeState(raw) {
    const next = emptyState();
    if (!raw || typeof raw !== "object") return next;
    next.currentMonth = /^\d{4}-\d{2}$/.test(raw.currentMonth) ? raw.currentMonth : currentMonthKey();
    if (Array.isArray(raw.categories)) {
      raw.categories.forEach((cat) => {
        if (!cat || !cat.id || !cat.name) return;
        next.categories.push({
          id: String(cat.id),
          name: String(cat.name).slice(0, 40),
          group: GROUPS.some((g) => g.id === cat.group) ? cat.group : "other",
          archived: Boolean(cat.archived),
          planCents: Math.max(0, Math.round(Number(cat.planCents) || 0)),
        });
      });
    }
    if (Array.isArray(raw.transactions)) {
      raw.transactions.forEach((txn) => {
        if (!txn || !txn.id || !txn.payee || !txn.date) return;
        const amountCents = Math.abs(Math.round(Number(txn.amountCents) || 0));
        if (!amountCents) return;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(txn.date)) return;
        next.transactions.push({
          id: String(txn.id),
          type: txn.type === "income" ? "income" : "expense",
          payee: String(txn.payee).slice(0, 60),
          amountCents,
          date: txn.date,
          categoryId: txn.categoryId ? String(txn.categoryId) : null,
          note: String(txn.note || "").slice(0, 140),
          createdAt: Number(txn.createdAt) || 0,
        });
      });
    }
    if (raw.months && typeof raw.months === "object") {
      Object.keys(raw.months).forEach((ym) => {
        if (!/^\d{4}-\d{2}$/.test(ym)) return;
        const assignments = raw.months[ym] && raw.months[ym].assignments;
        const clean = {};
        if (assignments && typeof assignments === "object") {
          Object.keys(assignments).forEach((id) => {
            const cents = Math.max(0, Math.round(Number(assignments[id]) || 0));
            if (cents) clean[id] = cents;
          });
        }
        next.months[ym] = { assignments: clean };
      });
    }
    return next;
  }

  function exportPayload(state) {
    return {
      app: "pocket-ledger",
      version: VERSION,
      exportedAt: new Date().toISOString(),
      currentMonth: state.currentMonth,
      categories: state.categories,
      transactions: state.transactions,
      months: state.months,
    };
  }

  function transactionsCsv(state) {
    const header = ["date", "type", "payee", "category", "amount", "note"];
    const nameOf = (id) => {
      const cat = state.categories.find((c) => c.id === id);
      return cat ? cat.name : "";
    };
    const rows = state.transactions
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map((txn) => {
        const amount = (txn.amountCents / 100).toFixed(2);
        const cells = [
          txn.date,
          txn.type,
          txn.payee,
          txn.type === "income" ? "" : nameOf(txn.categoryId),
          amount,
          txn.note || "",
        ];
        return cells.map(csvCell).join(",");
      });
    return [header.join(","), ...rows].join("\n") + "\n";
  }

  function csvCell(value) {
    const text = String(value == null ? "" : value);
    if (/[",\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function probeStorage() {
    try {
      const probe = "__pocket_ledger_probe__";
      localStorage.setItem(probe, "ok");
      const readback = localStorage.getItem(probe);
      localStorage.removeItem(probe);
      return readback === "ok";
    } catch (err) {
      return false;
    }
  }

  function load() {
    if (!probeStorage()) {
      return { ok: false, state: emptyState(), reason: "blocked" };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ok: true, state: emptyState() };
      return { ok: true, state: sanitizeState(JSON.parse(raw)) };
    } catch (err) {
      return {
        ok: false,
        state: emptyState(),
        reason: err && err.message ? err.message : "unreadable store",
      };
    }
  }

  function save(state) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: VERSION,
          currentMonth: state.currentMonth,
          categories: state.categories,
          transactions: state.transactions,
          months: state.months,
        })
      );
      return true;
    } catch (err) {
      return false;
    }
  }

  function clearDevice() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (err) {
      return false;
    }
  }

  return {
    STORAGE_KEY,
    GROUPS,
    STARTER_ENVELOPES,
    uid,
    currentMonthKey,
    todayISO,
    monthLabel,
    shiftMonth,
    lastDayISO,
    clampDateToMonth,
    defaultTxnDate,
    inMonth,
    parseMoney,
    formatMoney,
    formatInputMoney,
    groupLabel,
    emptyState,
    monthRecord,
    assignedOf,
    setAssigned,
    summarize,
    visibleCategories,
    categoriesByGroup,
    monthTransactions,
    spendReport,
    previousMonthWithAssignments,
    copyForward,
    splitLeftover,
    fillPlans,
    assignLeftoverTo,
    addStarterEnvelopes,
    upsertCategory,
    archiveCategory,
    upsertTransaction,
    deleteTransaction,
    loadSample,
    sanitizeState,
    exportPayload,
    transactionsCsv,
    probeStorage,
    load,
    save,
    clearDevice,
  };
})();
