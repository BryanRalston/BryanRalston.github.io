(() => {
  const state = {
    ok: false,
    currentMonth: Ledger.currentMonthKey(),
    categories: [],
    transactions: [],
    months: {},
    pane: "budget",
    showArchived: false,
  };

  const els = {
    storageFail: document.getElementById("storageFail"),
    monthInput: document.getElementById("monthInput"),
    monthTitle: document.getElementById("monthTitle"),
    assignHero: document.getElementById("assignHero"),
    assignHeading: document.getElementById("assignHeading"),
    assignKicker: document.getElementById("assignKicker"),
    assignStatus: document.getElementById("assignStatus"),
    metricIncome: document.getElementById("metricIncome"),
    metricAssigned: document.getElementById("metricAssigned"),
    metricSpent: document.getElementById("metricSpent"),
    metricLeft: document.getElementById("metricLeft"),
    overspendWarn: document.getElementById("overspendWarn"),
    budgetEmpty: document.getElementById("budgetEmpty"),
    envelopeList: document.getElementById("envelopeList"),
    activityEmpty: document.getElementById("activityEmpty"),
    activityList: document.getElementById("activityList"),
    reportEmpty: document.getElementById("reportEmpty"),
    reportList: document.getElementById("reportList"),
    txnDialog: document.getElementById("txnDialog"),
    txnForm: document.getElementById("txnForm"),
    txnTitle: document.getElementById("txnTitle"),
    txnKicker: document.getElementById("txnKicker"),
    txnCategory: document.getElementById("txnCategory"),
    txnCatWrap: document.getElementById("txnCatWrap"),
    btnDeleteTxn: document.getElementById("btnDeleteTxn"),
    envDialog: document.getElementById("envDialog"),
    envForm: document.getElementById("envForm"),
    envDialogTitle: document.getElementById("envDialogTitle"),
    envGroup: document.getElementById("envGroup"),
    btnArchiveEnv: document.getElementById("btnArchiveEnv"),
    btnUnarchiveEnv: document.getElementById("btnUnarchiveEnv"),
    aboutDialog: document.getElementById("aboutDialog"),
    menuDialog: document.getElementById("menuDialog"),
    importFile: document.getElementById("importFile"),
    toast: document.getElementById("toast"),
    btnSplit: document.getElementById("btnSplit"),
    btnFillPlans: document.getElementById("btnFillPlans"),
    btnRoll: document.getElementById("btnRoll"),
  };

  let toastTimer = 0;

  function persist() {
    if (!state.ok) {
      failLoud("save refused");
      return false;
    }
    const ok = Ledger.save(state);
    if (!ok) failLoud("write failed");
    return ok;
  }

  function failLoud(reason) {
    state.ok = false;
    els.storageFail.hidden = false;
    const extra = reason ? " (" + reason + ")" : "";
    els.storageFail.textContent =
      "Pocket Ledger cannot save on this device. Browser storage is blocked" +
      extra +
      ". Numbers will not persist.";
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  function ym() {
    return state.currentMonth;
  }

  function totals() {
    return Ledger.summarize(state, ym());
  }

  function fillGroupSelect() {
    els.envGroup.innerHTML = "";
    Ledger.GROUPS.forEach((group) => {
      const opt = document.createElement("option");
      opt.value = group.id;
      opt.textContent = group.label;
      els.envGroup.append(opt);
    });
  }

  function fillTxnCategories(selected) {
    els.txnCategory.innerHTML = "";
    const active = state.categories.filter((cat) => !cat.archived || cat.id === selected);
    if (active.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Add an envelope first";
      els.txnCategory.append(opt);
      return;
    }
    Ledger.categoriesByGroup(state, ym(), true).forEach((block) => {
      const opts = block.categories.filter((cat) => !cat.archived || cat.id === selected);
      if (opts.length === 0) return;
      const wrap = document.createElement("optgroup");
      wrap.label = block.group.label;
      opts.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        wrap.append(opt);
      });
      els.txnCategory.append(wrap);
    });
    if (selected) els.txnCategory.value = selected;
  }

  function setTxnType(type) {
    const isIncome = type === "income";
    els.txnTitle.textContent = els.txnForm.elements.id.value
      ? isIncome
        ? "Edit income"
        : "Edit expense"
      : isIncome
        ? "Add income"
        : "Add expense";
    els.txnKicker.textContent = isIncome ? "Inflow" : "Spending";
    els.txnCatWrap.hidden = isIncome;
    els.txnCategory.required = !isIncome;
  }

  function openTxnDialog(preset) {
    const data = preset || {};
    els.txnForm.reset();
    els.txnForm.elements.id.value = data.id || "";
    const type = data.type || "expense";
    els.txnForm.elements.type.value = type;
    els.txnForm.elements.date.value = data.date || Ledger.defaultTxnDate(ym());
    els.txnForm.elements.amount.value = data.amountCents != null ? Ledger.formatInputMoney(data.amountCents) : "";
    els.txnForm.elements.payee.value = data.payee || "";
    els.txnForm.elements.note.value = data.note || "";
    fillTxnCategories(data.categoryId || "");
    setTxnType(type);
    els.btnDeleteTxn.classList.toggle("hidden", !data.id);
    els.txnDialog.showModal();
    window.setTimeout(() => {
      const focusEl = type === "income" ? els.txnForm.elements.amount : els.txnForm.elements.payee;
      focusEl.focus();
    }, 10);
  }

  function openEnvDialog(cat) {
    els.envForm.reset();
    fillGroupSelect();
    els.envForm.elements.id.value = cat ? cat.id : "";
    els.envForm.elements.name.value = cat ? cat.name : "";
    els.envForm.elements.group.value = cat ? cat.group : "needs";
    els.envForm.elements.plan.value = cat && cat.planCents ? Ledger.formatInputMoney(cat.planCents) : "";
    els.envDialogTitle.textContent = cat ? "Edit envelope" : "Add envelope";
    els.btnArchiveEnv.classList.toggle("hidden", !cat || cat.archived);
    els.btnUnarchiveEnv.classList.toggle("hidden", !cat || !cat.archived);
    els.envDialog.showModal();
    window.setTimeout(() => els.envForm.elements.name.focus(), 10);
  }

  function download(filename, text, type) {
    const blob = new Blob([text], { type: type || "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const stamp = Ledger.todayISO();
    download("pocket-ledger-" + stamp + ".json", JSON.stringify(Ledger.exportPayload(state), null, 2));
    toast("JSON backup downloaded. Keep it off this browser if you switch phones.");
  }

  function exportCsv() {
    download("pocket-ledger-transactions-" + Ledger.todayISO() + ".csv", Ledger.transactionsCsv(state), "text/csv");
    toast("Transaction CSV downloaded.");
  }

  function importJsonFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const next = Ledger.sanitizeState(parsed);
        if (
          !window.confirm(
            "Replace the ledger on this device with this backup? This cannot be undone unless you exported first."
          )
        ) {
          return;
        }
        state.currentMonth = next.currentMonth;
        state.categories = next.categories;
        state.transactions = next.transactions;
        state.months = next.months;
        persist();
        render();
        toast("Backup imported. This device now holds that copy.");
      } catch (err) {
        toast("Could not read that file. Use a Pocket Ledger JSON export.");
      }
    };
    reader.readAsText(file);
  }

  function clearDevice() {
    if (!window.confirm("Erase Pocket Ledger on this device? Export a backup first if you want it back.")) return;
    Ledger.clearDevice();
    const fresh = Ledger.emptyState();
    state.currentMonth = fresh.currentMonth;
    state.categories = fresh.categories;
    state.transactions = fresh.transactions;
    state.months = fresh.months;
    persist();
    render();
    toast("This device is empty again.");
  }

  function renderCoach(t) {
    document.getElementById("coachIncome").classList.toggle("is-done", t.income > 0);
    document.getElementById("coachEnvelopes").classList.toggle("is-done", state.categories.some((c) => !c.archived));
    document.getElementById("coachAssign").classList.toggle("is-done", t.income > 0 && t.leftover === 0 && t.assignedTotal > 0);
    document.getElementById("coachSpend").classList.toggle("is-done", t.spentTotal > 0);
  }

  function renderHero(t) {
    els.monthInput.value = ym();
    els.monthTitle.textContent = Ledger.monthLabel(ym());
    els.assignHeading.textContent = Ledger.formatMoney(t.leftover);
    els.metricIncome.textContent = Ledger.formatMoney(t.income);
    els.metricAssigned.textContent = Ledger.formatMoney(t.assignedTotal);
    els.metricSpent.textContent = Ledger.formatMoney(t.spentTotal);
    els.metricLeft.textContent = Ledger.formatMoney(t.envelopeLeft);

    els.assignHero.classList.remove("is-ready", "is-open", "is-over");
    if (t.income === 0 && t.assignedTotal === 0) {
      els.assignKicker.textContent = "Ready to assign";
      els.assignStatus.textContent = "Add income, then give every dollar a job.";
    } else if (t.leftover > 0) {
      els.assignHero.classList.add("is-open");
      els.assignKicker.textContent = "Left to assign";
      els.assignStatus.textContent =
        "Income " +
        Ledger.formatMoney(t.income) +
        " · assigned " +
        Ledger.formatMoney(t.assignedTotal) +
        ". Split leftover, fill plans, or type amounts.";
    } else if (t.leftover < 0) {
      els.assignHero.classList.add("is-over");
      els.assignKicker.textContent = "Assigned past income";
      els.assignStatus.textContent =
        "You’ve assigned " +
        Ledger.formatMoney(Math.abs(t.leftover)) +
        " more than this month’s income. Pull an envelope back.";
    } else {
      els.assignHero.classList.add("is-ready");
      els.assignKicker.textContent = "Every dollar assigned";
      els.assignStatus.textContent =
        "Income " +
        Ledger.formatMoney(t.income) +
        " is fully assigned. Log spend to watch remaining move.";
    }

    const canAssign = t.leftover > 0 && state.categories.some((c) => !c.archived);
    els.btnSplit.disabled = !canAssign;
    els.btnFillPlans.disabled = !canAssign || !state.categories.some((c) => !c.archived && (c.planCents || 0) > 0);

    if (t.overspent.length || t.uncategorizedSpent) {
      const names = t.overspent.map((c) => c.name);
      if (t.uncategorizedSpent) names.push("Uncategorized");
      els.overspendWarn.hidden = false;
      els.overspendWarn.textContent =
        "Overspent: " + names.join(", ") + ". Cover it from another envelope or log a fix.";
    } else {
      els.overspendWarn.hidden = true;
    }
  }

  function renderEnvelopes(t) {
    const virgin =
      state.categories.length === 0 &&
      t.income === 0 &&
      t.spentTotal === 0 &&
      t.assignedTotal === 0;
    const waitingOnEnvelopes = state.categories.length === 0 && t.income > 0;
    els.budgetEmpty.classList.toggle("hidden", !virgin && !waitingOnEnvelopes);
    if (virgin || waitingOnEnvelopes) renderCoach(t);

    els.envelopeList.innerHTML = "";
    const groups = Ledger.categoriesByGroup(state, ym(), state.showArchived);
    groups.forEach((block) => {
      const wrap = document.createElement("div");
      wrap.className = "group-block";
      const heading = document.createElement("h3");
      heading.textContent = block.group.label;
      wrap.append(heading);
      block.categories.forEach((cat) => {
        const row = t.byCat[cat.id] || { assigned: 0, spent: 0, remaining: 0, plan: 0 };
        const over = row.remaining < 0;
        const el = document.createElement("article");
        el.className = "env-row" + (over ? " is-over" : "");

        const name = document.createElement("div");
        name.className = "env-name";
        const titleBtn = document.createElement("button");
        titleBtn.type = "button";
        titleBtn.textContent = cat.archived ? cat.name + " (archived)" : cat.name;
        titleBtn.addEventListener("click", () => openEnvDialog(cat));
        const plan = document.createElement("p");
        plan.className = "env-plan";
        plan.textContent = row.plan
          ? "Plan " + Ledger.formatMoney(row.plan)
          : "No monthly plan";
        name.append(titleBtn, plan);

        const assigned = document.createElement("div");
        assigned.className = "env-num";
        const assignedLabel = document.createElement("label");
        assignedLabel.textContent = "Assigned";
        const input = document.createElement("input");
        input.className = "assign-input";
        input.inputMode = "decimal";
        input.setAttribute("aria-label", "Assigned to " + cat.name);
        input.value = Ledger.formatInputMoney(row.assigned);
        input.addEventListener("change", () => {
          const parsed = Ledger.parseMoney(input.value);
          if (parsed == null || parsed < 0) {
            toast("Enter an assigned amount like 150 or 150.00");
            input.value = Ledger.formatInputMoney(row.assigned);
            return;
          }
          Ledger.setAssigned(state, ym(), cat.id, parsed);
          persist();
          render();
        });
        assignedLabel.append(input);
        assigned.append(assignedLabel);

        const spent = document.createElement("div");
        spent.className = "env-num";
        const spentLabel = document.createElement("label");
        spentLabel.textContent = "Spent";
        const spentVal = document.createElement("div");
        spentVal.className = "spent";
        spentVal.textContent = Ledger.formatMoney(row.spent);
        spent.append(spentLabel, spentVal);

        const remain = document.createElement("div");
        remain.className = "env-num";
        const remainLabel = document.createElement("label");
        remainLabel.textContent = "Remaining";
        const remainVal = document.createElement("div");
        remainVal.className = "remain" + (over ? " is-over" : row.remaining > 0 ? " is-ok" : "");
        remainVal.textContent = Ledger.formatMoney(row.remaining);
        remain.append(remainLabel, remainVal);

        const bar = document.createElement("div");
        bar.className = "env-bar" + (over ? " is-over" : "");
        bar.setAttribute("role", "progressbar");
        const pct = row.assigned > 0 ? Math.min(100, Math.round((row.spent / row.assigned) * 100)) : row.spent > 0 ? 100 : 0;
        bar.setAttribute("aria-valuenow", String(pct));
        bar.setAttribute("aria-valuemin", "0");
        bar.setAttribute("aria-valuemax", "100");
        const fill = document.createElement("span");
        fill.style.width = pct + "%";
        bar.append(fill);

        const actions = document.createElement("div");
        actions.className = "env-actions";
        if (t.leftover > 0 && !cat.archived) {
          const move = document.createElement("button");
          move.type = "button";
          move.className = "tiny";
          move.textContent = "Assign leftover here";
          move.addEventListener("click", () => {
            Ledger.assignLeftoverTo(state, ym(), cat.id);
            persist();
            render();
            toast("Leftover moved into " + cat.name + ".");
          });
          actions.append(move);
        }

        el.append(name, assigned, spent, remain, bar, actions);
        wrap.append(el);
      });
      els.envelopeList.append(wrap);
    });
  }

  function renderActivity() {
    const rows = Ledger.monthTransactions(state, ym());
    els.activityEmpty.classList.toggle("hidden", rows.length > 0);
    els.activityList.innerHTML = "";
    rows.forEach((txn) => {
      const cat = state.categories.find((c) => c.id === txn.categoryId);
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "row";
      const left = document.createElement("div");
      const payee = document.createElement("div");
      payee.className = "payee";
      payee.textContent = txn.payee;
      const meta = document.createElement("p");
      meta.className = "act-meta";
      const when = txn.date.slice(5).replace("-", "/");
      meta.textContent =
        when +
        " · " +
        (txn.type === "income" ? "Income" : cat ? cat.name : "Uncategorized") +
        (txn.note ? " · " + txn.note : "");
      left.append(payee, meta);
      const amt = document.createElement("div");
      amt.className = "act-amt" + (txn.type === "income" ? " in" : "");
      amt.textContent = Ledger.formatMoney(txn.type === "income" ? txn.amountCents : -txn.amountCents, {
        signed: true,
      });
      btn.append(left, amt);
      btn.addEventListener("click", () => openTxnDialog(txn));
      li.append(btn);
      els.activityList.append(li);
    });
  }

  function renderReport() {
    const report = Ledger.spendReport(state, ym());
    els.reportEmpty.classList.toggle("hidden", report.rows.length > 0);
    els.reportList.innerHTML = "";
    report.rows.forEach((row) => {
      const el = document.createElement("div");
      el.className = "rep-row";
      const line = document.createElement("p");
      const name = document.createElement("span");
      name.textContent = row.name;
      const amt = document.createElement("strong");
      amt.textContent = Ledger.formatMoney(row.spent);
      line.append(name, amt);
      const bar = document.createElement("div");
      bar.className = "rep-bar";
      const fill = document.createElement("span");
      fill.style.width = report.max ? Math.round((row.spent / report.max) * 100) + "%" : "0%";
      bar.append(fill);
      el.append(line, bar);
      els.reportList.append(el);
    });
  }

  function renderPanes() {
    document.querySelectorAll("[data-pane]").forEach((pane) => {
      pane.classList.toggle("is-on", pane.getAttribute("data-pane") === state.pane);
    });
    document.querySelectorAll("[data-dock]").forEach((btn) => {
      btn.classList.toggle("is-on", btn.getAttribute("data-dock") === state.pane);
    });
  }

  function render() {
    const t = totals();
    renderHero(t);
    renderEnvelopes(t);
    renderActivity();
    renderReport();
    renderPanes();
  }

  function boot() {
    const loaded = Ledger.load();
    state.ok = loaded.ok;
    state.currentMonth = loaded.state.currentMonth;
    state.categories = loaded.state.categories;
    state.transactions = loaded.state.transactions;
    state.months = loaded.state.months;
    if (!loaded.ok) failLoud(loaded.reason);
    fillGroupSelect();
    render();
  }

  document.getElementById("btnPrevMonth").addEventListener("click", () => {
    state.currentMonth = Ledger.shiftMonth(ym(), -1);
    persist();
    render();
  });
  document.getElementById("btnNextMonth").addEventListener("click", () => {
    state.currentMonth = Ledger.shiftMonth(ym(), 1);
    persist();
    render();
  });
  document.getElementById("btnThisMonth").addEventListener("click", () => {
    state.currentMonth = Ledger.currentMonthKey();
    persist();
    render();
  });
  els.monthInput.addEventListener("change", () => {
    if (/^\d{4}-\d{2}$/.test(els.monthInput.value)) {
      state.currentMonth = els.monthInput.value;
      persist();
      render();
    }
  });

  document.getElementById("btnAddIncome").addEventListener("click", () => openTxnDialog({ type: "income" }));
  document.getElementById("btnEmptyIncome").addEventListener("click", () => openTxnDialog({ type: "income" }));
  document.getElementById("btnAddExpense").addEventListener("click", () => {
    if (!state.categories.some((c) => !c.archived)) {
      toast("Add an envelope before logging an expense.");
      openEnvDialog(null);
      return;
    }
    openTxnDialog({ type: "expense" });
  });
  document.getElementById("btnAddEnv").addEventListener("click", () => openEnvDialog(null));
  document.getElementById("btnStarter").addEventListener("click", () => {
    const added = Ledger.addStarterEnvelopes(state);
    persist();
    render();
    toast(added ? "Household envelopes added with monthly plans." : "Those names are already here.");
  });
  document.getElementById("btnEmptyStarter").addEventListener("click", () => {
    Ledger.addStarterEnvelopes(state);
    persist();
    render();
    toast("Household envelopes ready. Assign leftover next.");
  });
  document.getElementById("btnSample").addEventListener("click", () => {
    Ledger.loadSample(state);
    persist();
    render();
    toast("Sample month loaded. Export first if you want to keep real numbers.");
  });

  els.btnSplit.addEventListener("click", () => {
    const result = Ledger.splitLeftover(state, ym());
    persist();
    render();
    toast(result.added ? "Leftover split across envelopes." : "Nothing left to split.");
  });
  els.btnFillPlans.addEventListener("click", () => {
    const result = Ledger.fillPlans(state, ym());
    persist();
    render();
    toast(result.added ? "Plans filled from Ready to assign." : "No leftover, or plans are already filled.");
  });
  els.btnRoll.addEventListener("click", () => {
    const result = Ledger.copyForward(state, ym());
    persist();
    render();
    if (!result.source || !result.copied) {
      toast("No prior month assignments to roll.");
      return;
    }
    toast("Rolled " + result.copied + " envelopes from " + Ledger.monthLabel(result.source) + ".");
  });

  document.querySelectorAll("[data-dock]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.pane = btn.getAttribute("data-dock");
      renderPanes();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  els.txnForm.querySelectorAll('input[name="type"]').forEach((radio) => {
    radio.addEventListener("change", () => setTxnType(els.txnForm.elements.type.value));
  });
  els.txnForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const type = els.txnForm.elements.type.value;
    const amountCents = Ledger.parseMoney(els.txnForm.elements.amount.value);
    if (amountCents == null || amountCents <= 0) {
      toast("Enter an amount greater than zero.");
      return;
    }
    const saved = Ledger.upsertTransaction(state, {
      id: els.txnForm.elements.id.value || undefined,
      type,
      payee: els.txnForm.elements.payee.value,
      amountCents,
      date: els.txnForm.elements.date.value,
      categoryId: type === "income" ? null : els.txnForm.elements.category.value,
      note: els.txnForm.elements.note.value,
    });
    if (!saved) {
      toast(type === "expense" ? "Expense needs a payee, amount, and envelope." : "Income needs a payee and amount.");
      return;
    }
    persist();
    els.txnDialog.close();
    render();
    toast(type === "income" ? "Income in. Assign it next." : "Expense logged. Remaining updated.");
  });
  document.getElementById("btnCancelTxn").addEventListener("click", () => els.txnDialog.close());
  els.btnDeleteTxn.addEventListener("click", () => {
    const id = els.txnForm.elements.id.value;
    if (!id) return;
    if (!window.confirm("Delete this transaction?")) return;
    Ledger.deleteTransaction(state, id);
    persist();
    els.txnDialog.close();
    render();
    toast("Transaction removed.");
  });

  els.envForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const planCents = els.envForm.elements.plan.value
      ? Ledger.parseMoney(els.envForm.elements.plan.value)
      : 0;
    if (els.envForm.elements.plan.value && (planCents == null || planCents < 0)) {
      toast("Plan should look like 600 or 600.00");
      return;
    }
    const saved = Ledger.upsertCategory(state, {
      id: els.envForm.elements.id.value || undefined,
      name: els.envForm.elements.name.value,
      group: els.envForm.elements.group.value,
      planCents: planCents || 0,
    });
    if (!saved) {
      toast("Name the envelope.");
      return;
    }
    persist();
    els.envDialog.close();
    render();
    toast("Envelope saved.");
  });
  document.getElementById("btnCancelEnv").addEventListener("click", () => els.envDialog.close());
  els.btnArchiveEnv.addEventListener("click", () => {
    const id = els.envForm.elements.id.value;
    Ledger.archiveCategory(state, id, true);
    persist();
    els.envDialog.close();
    render();
    toast("Envelope archived. Past months keep their history.");
  });
  els.btnUnarchiveEnv.addEventListener("click", () => {
    const id = els.envForm.elements.id.value;
    Ledger.archiveCategory(state, id, false);
    persist();
    els.envDialog.close();
    render();
    toast("Envelope is active again.");
  });

  function openAbout() {
    els.aboutDialog.showModal();
  }
  document.getElementById("btnAbout").addEventListener("click", openAbout);
  document.getElementById("btnAboutMenu").addEventListener("click", () => {
    els.menuDialog.close();
    openAbout();
  });
  document.getElementById("btnCloseAbout").addEventListener("click", () => els.aboutDialog.close());
  document.getElementById("btnMenu").addEventListener("click", () => els.menuDialog.showModal());
  document.getElementById("btnCloseMenu").addEventListener("click", () => els.menuDialog.close());

  document.getElementById("btnExport").addEventListener("click", exportJson);
  document.getElementById("btnExportMenu").addEventListener("click", () => {
    els.menuDialog.close();
    exportJson();
  });
  document.getElementById("btnCsv").addEventListener("click", exportCsv);
  document.getElementById("btnCsvMenu").addEventListener("click", () => {
    els.menuDialog.close();
    exportCsv();
  });
  document.getElementById("btnImport").addEventListener("click", () => els.importFile.click());
  document.getElementById("btnImportMenu").addEventListener("click", () => {
    els.menuDialog.close();
    els.importFile.click();
  });
  els.importFile.addEventListener("change", () => {
    const file = els.importFile.files && els.importFile.files[0];
    importJsonFile(file);
    els.importFile.value = "";
  });
  document.getElementById("btnReset").addEventListener("click", clearDevice);
  document.getElementById("btnResetMenu").addEventListener("click", () => {
    els.menuDialog.close();
    clearDevice();
  });

  boot();
})();
