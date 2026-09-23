(function (root) {
  const STORAGE_KEY = "doom-parlay-v1";
  const HISTORY_CAP = 12;
  const MIN_LEGS = 2;
  const MAX_LEGS = 8;
  const LABEL_MAX = 40;
  const RAW_MAX = 24;
  const AMERICAN_MIN_ABS = 100;
  const AMERICAN_MAX_ABS = 100000;
  const PERCENT_MIN = 0.1;
  const PERCENT_MAX = 99.9;
  const AMERICAN_DISPLAY_CAP = 10000000;

  const BANDS = [
    {
      id: "comfortable",
      min: 0.62,
      label: "COMFORTABLE",
      roast: "Favorites stacked on favorites. The meter is still mostly lit. Boredom is undefeated.",
    },
    {
      id: "sweating",
      min: 0.45,
      label: "SWEATING",
      roast: "Coin-flip country with extra paperwork. The fuse is warm.",
    },
    {
      id: "fuse",
      min: 0.25,
      label: "FUSE LIT",
      roast: "Independent legs. This product does not share a gut feeling.",
    },
    {
      id: "red",
      min: 0.15,
      label: "RED LIGHT",
      roast: "This is how a Tuesday becomes a story. The glass is draining.",
    },
    {
      id: "doom",
      min: 0.06,
      label: "DOOM",
      roast: "Single digits. The mission clock does not negotiate.",
    },
    {
      id: "mayday",
      min: 0.02,
      label: "MAYDAY",
      roast: "Long shots, stacked. The extraction window is mostly shut.",
    },
    {
      id: "terminal",
      min: 0.005,
      label: "TERMINAL",
      roast: "A sliver of glass. This slip is theater with a percent sign.",
    },
    {
      id: "black",
      min: 0,
      label: "BLACK",
      roast: "A rounding error with confidence. The board has left the building.",
    },
  ];

  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clampLabel(value) {
    return String(value == null ? "" : value)
      .replace(/[\r\n]+/g, " ")
      .trim()
      .slice(0, LABEL_MAX);
  }

  function clampRaw(value) {
    return String(value == null ? "" : value)
      .replace(/[\r\n]+/g, " ")
      .trim()
      .slice(0, RAW_MAX);
  }

  function cleanNumeric(value) {
    return String(value == null ? "" : value)
      .trim()
      .replace(/[\u2212\u2013\u2014]/g, "-")
      .replace(/[$,\s]/g, "");
  }

  function americanToProb(odds) {
    const o = Number(odds);
    if (!Number.isFinite(o) || !Number.isInteger(o) || o === 0) return null;
    const abs = Math.abs(o);
    if (abs < AMERICAN_MIN_ABS || abs > AMERICAN_MAX_ABS) return null;
    if (o < 0) return abs / (abs + 100);
    return 100 / (o + 100);
  }

  function probToAmerican(p) {
    const n = Number(p);
    if (!Number.isFinite(n) || n <= 0 || n >= 1) return null;
    const mag = n >= 0.5 ? (100 * n) / (1 - n) : (100 * (1 - n)) / n;
    if (!Number.isFinite(mag)) return null;
    const rounded = n >= 0.5 ? -Math.round(mag) : Math.round(mag);
    if (!Number.isSafeInteger(rounded) || Math.abs(rounded) > AMERICAN_DISPLAY_CAP || rounded === 0) {
      return null;
    }
    return rounded;
  }

  function formatAmerican(odds) {
    const n = Number(odds);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n === 0) return "—";
    if (n > 0) return "+" + n;
    return String(n);
  }

  function formatWin(p, digits) {
    const n = Number(p);
    if (!Number.isFinite(n) || n <= 0 || n >= 1) return "—";
    const pct = n * 100;
    if (pct < 0.005) return "<0.01%";
    let places = digits;
    if (places == null) places = pct >= 10 ? 1 : 2;
    if (!Number.isInteger(places) || places < 0 || places > 4) places = 2;
    return pct.toFixed(places) + "%";
  }

  function formatDoom(p) {
    const n = Number(p);
    if (!Number.isFinite(n) || n <= 0 || n >= 1) return "—";
    const doom = (1 - n) * 100;
    if (!Number.isFinite(doom)) return "—";
    if (doom >= 10) return doom.toFixed(1) + "%";
    return doom.toFixed(2) + "%";
  }

  function parseAmericanText(raw) {
    const text = cleanNumeric(raw).replace(/%/g, "");
    if (!/^[+-]?\d+$/.test(text)) return null;
    const odds = Number(text);
    const p = americanToProb(odds);
    if (p == null) return null;
    return { odds: odds, p: p };
  }

  function parsePercentText(raw) {
    const text = cleanNumeric(raw).replace(/%/g, "");
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
    const percent = Number(text);
    if (!Number.isFinite(percent) || percent < PERCENT_MIN || percent > PERCENT_MAX) return null;
    return { percent: percent, p: percent / 100 };
  }

  function normalizeMode(mode) {
    return mode === "percent" ? "percent" : "american";
  }

  function parseLegInput(raw, mode) {
    const modeUsed = normalizeMode(mode);
    const original = String(raw == null ? "" : raw);
    if (!original.trim()) return { ok: false, reason: "empty", p: null, mode: modeUsed, odds: null };
    const compact = cleanNumeric(original);
    const explicitPercent = /%/.test(original);
    const explicitSign = /^[+-]/.test(compact);
    let asAmerican;
    if (explicitPercent && !explicitSign) asAmerican = false;
    else if (explicitSign) asAmerican = true;
    else if (modeUsed === "percent") asAmerican = false;
    else asAmerican = true;

    if (asAmerican) {
      const parsed = parseAmericanText(original);
      if (!parsed) return { ok: false, reason: "american", p: null, mode: "american", odds: null };
      return { ok: true, reason: "", p: parsed.p, mode: "american", odds: parsed.odds };
    }
    const parsed = parsePercentText(original);
    if (!parsed) return { ok: false, reason: "percent", p: null, mode: "percent", odds: null };
    return {
      ok: true,
      reason: "",
      p: parsed.p,
      mode: "percent",
      odds: probToAmerican(parsed.p),
    };
  }

  function formatPercentInput(p) {
    const n = Number(p);
    if (!Number.isFinite(n) || n <= 0 || n >= 1) return "";
    const pct = n * 100;
    if (Math.abs(pct - Math.round(pct)) < 0.001) return String(Math.round(pct));
    return pct.toFixed(2);
  }

  function convertRaw(raw, fromMode, toMode) {
    const parsed = parseLegInput(raw, fromMode);
    const target = normalizeMode(toMode);
    if (!parsed.ok) return clampRaw(raw);
    if (target === "american") {
      const odds = parsed.odds != null ? parsed.odds : probToAmerican(parsed.p);
      return odds == null ? clampRaw(raw) : formatAmerican(odds);
    }
    return formatPercentInput(parsed.p);
  }

  function compound(probs) {
    if (!Array.isArray(probs) || !probs.length) return null;
    let p = 1;
    for (let i = 0; i < probs.length; i++) {
      const n = Number(probs[i]);
      if (!Number.isFinite(n) || n <= 0 || n >= 1) return null;
      p *= n;
      if (!Number.isFinite(p) || p <= 0) return null;
    }
    return p;
  }

  function standbyBand() {
    return {
      id: "standby",
      label: "STANDBY",
      roast: "Two legs arm the meter. One leg is just a hunch.",
      doom: 0,
    };
  }

  function doomBand(p, validCount) {
    if (!Number.isFinite(validCount) || validCount < MIN_LEGS || !Number.isFinite(p) || p <= 0 || p >= 1) {
      return standbyBand();
    }
    const doom = 1 - p;
    for (let i = 0; i < BANDS.length; i++) {
      const band = BANDS[i];
      if (p >= band.min) {
        return { id: band.id, label: band.label, roast: band.roast, doom: doom };
      }
    }
    const last = BANDS[BANDS.length - 1];
    return { id: last.id, label: last.label, roast: last.roast, doom: doom };
  }

  function blankLeg() {
    return { id: uid(), label: "", raw: "", mode: "american" };
  }

  function normalizeLeg(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      id: String(raw.id || uid()).slice(0, 64),
      label: clampLabel(raw.label),
      raw: clampRaw(raw.raw),
      mode: normalizeMode(raw.mode),
    };
  }

  function emptyLegs() {
    return [blankLeg(), blankLeg()];
  }

  function emptyState() {
    return { v: 1, legs: emptyLegs(), history: [] };
  }

  function sampleState() {
    return {
      v: 1,
      legs: [
        { id: uid(), label: "The lock", raw: "-110", mode: "american" },
        { id: uid(), label: "The other lock", raw: "-110", mode: "american" },
        { id: uid(), label: "The long shot", raw: "+200", mode: "american" },
      ],
      history: [],
    };
  }

  function legFingerprint(legs) {
    return legs
      .map(function (leg) {
        return [leg.mode, clampRaw(leg.raw), clampLabel(leg.label)].join(":");
      })
      .join("|");
  }

  function evaluate(state) {
    const legs = state && Array.isArray(state.legs) ? state.legs : [];
    const rows = legs.map(function (leg) {
      const parsed = parseLegInput(leg && leg.raw, leg && leg.mode);
      return { leg: leg, parsed: parsed };
    });
    const valid = rows.filter(function (row) {
      return row.parsed.ok && Number.isFinite(row.parsed.p);
    });
    const parlayP = valid.length >= MIN_LEGS ? compound(valid.map(function (row) { return row.parsed.p; })) : null;
    const american = parlayP == null ? null : probToAmerican(parlayP);
    const band = doomBand(parlayP, valid.length);
    const formula = valid
      .map(function (row) {
        return formatAmerican(row.parsed.odds);
      })
      .join(" × ");
    return {
      rows: rows,
      validCount: valid.length,
      parlayP: parlayP,
      american: american,
      band: band,
      ready: parlayP != null && Number.isFinite(parlayP),
      formula: formula,
    };
  }

  function normalizeHistoryItem(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.legs)) return null;
    const legs = raw.legs.map(normalizeLeg).filter(Boolean).slice(0, MAX_LEGS);
    const view = evaluate({ legs: legs });
    if (!view.ready) return null;
    const at = Number(raw.at);
    return {
      id: String(raw.id || uid()).slice(0, 64),
      at: Number.isFinite(at) && at > 0 ? Math.round(at) : Date.now(),
      legs: legs,
      winP: view.parlayP,
      american: view.american,
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return emptyState();
    const legs = Array.isArray(raw.legs) ? raw.legs.map(normalizeLeg).filter(Boolean).slice(0, MAX_LEGS) : emptyLegs();
    const history = Array.isArray(raw.history)
      ? raw.history.map(normalizeHistoryItem).filter(Boolean).slice(0, HISTORY_CAP)
      : [];
    return {
      v: 1,
      legs: legs,
      history: history,
    };
  }

  function addLeg(state) {
    if (!state || !Array.isArray(state.legs) || state.legs.length >= MAX_LEGS) return false;
    state.legs.push(blankLeg());
    return true;
  }

  function removeLeg(state, id) {
    if (!state || !Array.isArray(state.legs)) return false;
    const before = state.legs.length;
    state.legs = state.legs.filter(function (leg) {
      return leg.id !== id;
    });
    return state.legs.length !== before;
  }

  function startOver(state) {
    return {
      v: 1,
      legs: emptyLegs(),
      history: state && Array.isArray(state.history) ? state.history.slice(0, HISTORY_CAP) : [],
    };
  }

  function snapshotLegs(legs) {
    return legs.map(function (leg) {
      return {
        id: uid(),
        label: clampLabel(leg.label),
        raw: clampRaw(leg.raw),
        mode: normalizeMode(leg.mode),
      };
    });
  }

  function pushHistory(state, now) {
    if (!state || !Array.isArray(state.legs)) return state;
    const view = evaluate(state);
    if (!view.ready) return state;
    const legs = snapshotLegs(state.legs);
    const print = legFingerprint(legs);
    const item = {
      id: uid(),
      at: Number.isFinite(now) ? Math.round(now) : Date.now(),
      legs: legs,
      winP: view.parlayP,
      american: view.american,
    };
    const rest = (state.history || []).filter(function (row) {
      return legFingerprint(row.legs || []) !== print;
    });
    state.history = [item].concat(rest).slice(0, HISTORY_CAP);
    return state;
  }

  function sharePayload(state) {
    const legs = state && Array.isArray(state.legs) ? state.legs : [];
    return {
      v: 1,
      legs: legs.slice(0, MAX_LEGS).map(function (leg) {
        return {
          label: clampLabel(leg && leg.label),
          raw: clampRaw(leg && leg.raw),
          mode: normalizeMode(leg && leg.mode),
        };
      }),
    };
  }

  function parseShare(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.legs) || !raw.legs.length) return null;
    const legs = raw.legs.map(normalizeLeg).filter(Boolean).slice(0, MAX_LEGS);
    if (!legs.length) return null;
    return { v: 1, legs: legs };
  }

  const Parlay = {
    STORAGE_KEY: STORAGE_KEY,
    HISTORY_CAP: HISTORY_CAP,
    MIN_LEGS: MIN_LEGS,
    MAX_LEGS: MAX_LEGS,
    LABEL_MAX: LABEL_MAX,
    americanToProb: americanToProb,
    probToAmerican: probToAmerican,
    formatAmerican: formatAmerican,
    formatWin: formatWin,
    formatDoom: formatDoom,
    parseLegInput: parseLegInput,
    convertRaw: convertRaw,
    compound: compound,
    doomBand: doomBand,
    blankLeg: blankLeg,
    emptyState: emptyState,
    sampleState: sampleState,
    normalizeState: normalizeState,
    evaluate: evaluate,
    addLeg: addLeg,
    removeLeg: removeLeg,
    startOver: startOver,
    pushHistory: pushHistory,
    sharePayload: sharePayload,
    parseShare: parseShare,
    legFingerprint: legFingerprint,
  };

  root.Parlay = Parlay;
})(typeof globalThis !== "undefined" ? globalThis : this);
