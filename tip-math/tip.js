(function (root) {
  const STORAGE_KEY = "tip-math-v1";
  const HISTORY_CAP = 10;
  const TIP_CHIPS = [15, 18, 20, 22, 25];
  const PEOPLE_MIN = 1;
  const PEOPLE_MAX = 20;
  const MONEY_MAX_CENTS = 99999999;

  function clampPeople(value) {
    const n = Math.trunc(Number(value));
    if (!Number.isFinite(n)) return 1;
    return Math.min(PEOPLE_MAX, Math.max(PEOPLE_MIN, n));
  }

  function parseMoney(value) {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const cleaned = raw.replace(/[$\s]/g, "").replace(/,/g, "");
    if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
    const dollars = Number(cleaned);
    if (!Number.isFinite(dollars) || dollars < 0) return null;
    const cents = Math.round(dollars * 100);
    if (cents > MONEY_MAX_CENTS) return null;
    return cents;
  }

  function parsePercent(value) {
    if (value == null) return null;
    const cleaned = String(value).trim().replace(/%/g, "");
    if (!cleaned) return null;
    if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    return n;
  }

  function formatMoney(cents) {
    const n = Number(cents);
    if (!Number.isFinite(n)) return "$0.00";
    const sign = n < 0 ? "−" : "";
    const abs = Math.abs(Math.round(n));
    const dollars = Math.floor(abs / 100);
    const rem = String(abs % 100).padStart(2, "0");
    return sign + "$" + dollars.toLocaleString("en-US") + "." + rem;
  }

  function formatPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0%";
    return String(n) + "%";
  }

  function splitFair(totalCents, people) {
    const n = clampPeople(people);
    const total = Math.max(0, Math.round(Number(totalCents) || 0));
    const base = Math.floor(total / n);
    const remainder = total % n;
    const shares = [];
    for (let i = 0; i < n; i++) {
      shares.push(base + (i < remainder ? 1 : 0));
    }
    return { shares: shares, base: base, remainder: remainder };
  }

  function roundUpCents(cents) {
    const n = Math.max(0, Math.round(Number(cents) || 0));
    if (n % 100 === 0) return n;
    return n + (100 - (n % 100));
  }

  function normalizeTipOn(value) {
    return value === "total" ? "total" : "subtotal";
  }

  function compute(input) {
    const subtotalCents = Math.max(0, Math.round(Number(input && input.subtotalCents) || 0));
    const taxCents = Math.max(0, Math.round(Number(input && input.taxCents) || 0));
    const tipPercent = parsePercent(input && input.tipPercent != null ? input.tipPercent : 20);
    const tipOn = normalizeTipOn(input && input.tipOn);
    const people = clampPeople(input && input.people);
    const roundUp = !!(input && input.roundUp);

    if (tipPercent == null) {
      return { ok: false, reason: "percent" };
    }

    const tipBaseCents = tipOn === "total" ? subtotalCents + taxCents : subtotalCents;
    const tipCents = Math.round((tipBaseCents * tipPercent) / 100);
    const billTotalCents = subtotalCents + taxCents + tipCents;

    let shares;
    let tableTotalCents;
    let extraFromRoundUp = 0;

    if (roundUp) {
      const fair = splitFair(billTotalCents, people);
      shares = fair.shares.map(roundUpCents);
      tableTotalCents = shares.reduce(function (sum, part) {
        return sum + part;
      }, 0);
      extraFromRoundUp = tableTotalCents - billTotalCents;
    } else {
      const fair = splitFair(billTotalCents, people);
      shares = fair.shares;
      tableTotalCents = billTotalCents;
    }

    const paidTipCents = tableTotalCents - subtotalCents - taxCents;
    const unique = {};
    for (let i = 0; i < shares.length; i++) {
      const key = String(shares[i]);
      unique[key] = (unique[key] || 0) + 1;
    }
    const buckets = Object.keys(unique)
      .map(function (key) {
        return { cents: Number(key), count: unique[key] };
      })
      .sort(function (a, b) {
        return b.cents - a.cents;
      });

    return {
      ok: true,
      subtotalCents: subtotalCents,
      taxCents: taxCents,
      tipPercent: tipPercent,
      tipOn: tipOn,
      people: people,
      roundUp: roundUp,
      tipBaseCents: tipBaseCents,
      tipCents: tipCents,
      paidTipCents: paidTipCents,
      billTotalCents: billTotalCents,
      tableTotalCents: tableTotalCents,
      extraFromRoundUp: extraFromRoundUp,
      shares: shares,
      buckets: buckets,
    };
  }

  function blankDraft() {
    return {
      subtotal: "",
      tax: "",
      tipPercent: 20,
      customPercent: "",
      tipOn: "subtotal",
      people: 2,
      roundUp: false,
    };
  }

  function normalizeDraft(raw) {
    const blank = blankDraft();
    if (!raw || typeof raw !== "object") return blank;
    const tipPercent = parsePercent(raw.tipPercent);
    const customPercent = raw.customPercent == null ? "" : String(raw.customPercent).slice(0, 8);
    return {
      subtotal: String(raw.subtotal || "").slice(0, 16),
      tax: String(raw.tax || "").slice(0, 16),
      tipPercent: tipPercent == null ? 20 : tipPercent,
      customPercent: customPercent,
      tipOn: normalizeTipOn(raw.tipOn),
      people: clampPeople(raw.people == null ? 2 : raw.people),
      roundUp: !!raw.roundUp,
    };
  }

  function draftFromCompute(result) {
    if (!result || !result.ok) return blankDraft();
    const chipHit = TIP_CHIPS.indexOf(result.tipPercent) !== -1;
    return {
      subtotal: (result.subtotalCents / 100).toFixed(2),
      tax: result.taxCents ? (result.taxCents / 100).toFixed(2) : "",
      tipPercent: result.tipPercent,
      customPercent: chipHit ? "" : String(result.tipPercent),
      tipOn: result.tipOn,
      people: result.people,
      roundUp: result.roundUp,
    };
  }

  function computeDraft(draft) {
    const src = normalizeDraft(draft);
    const subtotalCents = parseMoney(src.subtotal);
    if (subtotalCents == null || subtotalCents <= 0) {
      return { ok: false, reason: "subtotal", draft: src };
    }
    let taxCents = 0;
    if (String(src.tax || "").trim()) {
      const parsedTax = parseMoney(src.tax);
      if (parsedTax == null) return { ok: false, reason: "tax", draft: src };
      taxCents = parsedTax;
    }
    const result = compute({
      subtotalCents: subtotalCents,
      taxCents: taxCents,
      tipPercent: src.tipPercent,
      tipOn: src.tipOn,
      people: src.people,
      roundUp: src.roundUp,
    });
    result.draft = src;
    return result;
  }

  function fingerprint(result) {
    if (!result || typeof result !== "object") return "";
    const subtotalCents = Math.round(Number(result.subtotalCents) || 0);
    if (subtotalCents <= 0) return "";
    return [
      subtotalCents,
      Math.round(Number(result.taxCents) || 0),
      result.tipPercent,
      normalizeTipOn(result.tipOn),
      clampPeople(result.people),
      result.roundUp ? 1 : 0,
    ].join("|");
  }

  function historyItem(result, now) {
    return {
      id: String(result && result.id ? result.id : uid()).slice(0, 64),
      at: Number.isFinite(now) ? now : Date.now(),
      subtotalCents: result.subtotalCents,
      taxCents: result.taxCents,
      tipPercent: result.tipPercent,
      tipOn: result.tipOn,
      people: result.people,
      roundUp: !!result.roundUp,
      tipCents: result.paidTipCents,
      tableTotalCents: result.tableTotalCents,
    };
  }

  function normalizeHistoryItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const result = compute({
      subtotalCents: raw.subtotalCents,
      taxCents: raw.taxCents,
      tipPercent: raw.tipPercent,
      tipOn: raw.tipOn,
      people: raw.people,
      roundUp: raw.roundUp,
    });
    if (!result.ok || result.subtotalCents <= 0) return null;
    return historyItem(
      Object.assign({ id: raw.id }, result),
      Number.isFinite(raw.at) ? raw.at : Date.now()
    );
  }

  function emptyState() {
    return { v: 1, draft: blankDraft(), history: [] };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return emptyState();
    const history = Array.isArray(raw.history)
      ? raw.history.map(normalizeHistoryItem).filter(Boolean).slice(0, HISTORY_CAP)
      : [];
    return {
      v: 1,
      draft: normalizeDraft(raw.draft),
      history: history,
    };
  }

  function pushHistory(state, result) {
    if (!state || !result || !result.ok || result.subtotalCents <= 0) return state;
    const item = historyItem(result, Date.now());
    const print = fingerprint(result);
    state.history = [item]
      .concat(
        state.history.filter(function (row) {
          return fingerprint(row) !== print;
        })
      )
      .slice(0, HISTORY_CAP);
    return state;
  }

  function sharePayload(result) {
    return {
      v: 1,
      subtotalCents: result.subtotalCents,
      taxCents: result.taxCents,
      tipPercent: result.tipPercent,
      tipOn: result.tipOn,
      people: result.people,
      roundUp: !!result.roundUp,
    };
  }

  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function formatSharesLine(result) {
    if (!result || !result.ok) return "";
    if (result.people === 1) return "1 person · " + formatMoney(result.tableTotalCents);
    if (result.buckets.length === 1) {
      return result.people + " pay " + formatMoney(result.buckets[0].cents) + " each";
    }
    return result.buckets
      .map(function (bucket) {
        const verb = bucket.count === 1 ? "pays" : "pay";
        return bucket.count + " " + verb + " " + formatMoney(bucket.cents);
      })
      .join(" · ");
  }

  function formatAsText(result) {
    if (!result || !result.ok) return "Tip Math — enter a subtotal.";
    const lines = [
      "Tip Math",
      "Subtotal  " + formatMoney(result.subtotalCents),
    ];
    if (result.taxCents) lines.push("Tax       " + formatMoney(result.taxCents));
    const tipLabel = result.tipOn === "total" ? "on total" : "on subtotal";
    lines.push("Tip " + formatPercent(result.tipPercent) + " " + tipLabel + "  " + formatMoney(result.paidTipCents));
    lines.push("Total     " + formatMoney(result.tableTotalCents));
    lines.push(formatSharesLine(result));
    if (result.roundUp && result.extraFromRoundUp) {
      lines.push("Rounded up per person (+" + formatMoney(result.extraFromRoundUp) + " to tip)");
    }
    return lines.join("\n");
  }

  const TipMath = {
    STORAGE_KEY: STORAGE_KEY,
    HISTORY_CAP: HISTORY_CAP,
    TIP_CHIPS: TIP_CHIPS,
    PEOPLE_MIN: PEOPLE_MIN,
    PEOPLE_MAX: PEOPLE_MAX,
    parseMoney: parseMoney,
    parsePercent: parsePercent,
    formatMoney: formatMoney,
    formatPercent: formatPercent,
    clampPeople: clampPeople,
    splitFair: splitFair,
    roundUpCents: roundUpCents,
    compute: compute,
    computeDraft: computeDraft,
    blankDraft: blankDraft,
    normalizeDraft: normalizeDraft,
    draftFromCompute: draftFromCompute,
    fingerprint: fingerprint,
    emptyState: emptyState,
    normalizeState: normalizeState,
    pushHistory: pushHistory,
    sharePayload: sharePayload,
    formatSharesLine: formatSharesLine,
    formatAsText: formatAsText,
  };

  root.TipMath = TipMath;
})(typeof globalThis !== "undefined" ? globalThis : this);
