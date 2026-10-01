(function (root) {
  "use strict";

  const STORAGE_KEY = "bench-bomb-v1";
  const STORAGE_BACKUP_KEY = "bench-bomb-v1-corrupt";
  const HISTORY_CAP = 24;
  const SAT_MAX = 80;
  const START_MAX = 80;
  const POINTS_MAX = 40;
  const NOTE_MAX = 80;
  const ROAST_MAX = 240;
  const SALT_MAX = 9999;
  const SAMPLE_ID = "sample-jefferson-bomb";
  const SAMPLE_AT = 1790812800000;
  const ENERGIES = ["DUD", "SPARK", "BLAST", "CRATER", "NUCLEAR"];

  const TAGS = {
    DUD: ["QUIET BENCH", "FALSE ALARM"],
    SPARK: ["BENCH SPARK", "SMALL REGRET"],
    BLAST: ["LINEUP WOUND", "BENCH BLAST"],
    CRATER: ["CRATER SIT", "SHOULD'VE STARTED"],
    NUCLEAR: ["NUCLEAR SIT", "BENCH BOMB"],
  };

  const ROASTS = {
    DUD: [
      "{S} on the bench scored {P}. The booth barely flinched. {I}",
      "You sat {S} and the damage was {P}. A dud, played loud. {I}",
      "False alarm. {S} put up {P}. The group chat can stand down. {I}",
      "{P} from {S}. That is a sparkler, not a bomb. {I}",
      "{S} managed {P} on the pine. Dud. The lineup never felt it. {I}",
      "You left {S} sitting and they returned {P}. A quiet dud. {I}",
      "Bench dud. {S} at {P}. Not a story, just a sit. {I}",
      "{P} from {S}. You can tell the group chat it was a dud. {I}",
      "{S} posted {P} where nobody needed it. A dud with a name. {I}",
      "Quiet bench. {S} and {P}. The booth already moved on. {I}",
      "You sat {S}. {P} points. Dud, and the week kept walking. {I}",
      "{P} from {S} on the pine. Nothing here is a bomb. {I}",
      "Dud. {S} scraped together {P}. The booth shrugged. {I}",
      "You sat {S}. {P} points. A dud, filed and forgotten. {I}",
      "{S} at {P}. Dud energy. Nobody is clipping that. {I}",
      "{P} from {S}. The bench stayed quiet, and so did the booth. {I}",
    ],
    SPARK: [
      "{S} dropped {P} on the pine. A spark, not a crater. {I}",
      "You sat {S}. {P} points. The booth called it a spark. {I}",
      "Bench spark. {S} went for {P}. Annoying, not historic. {I}",
      "{P} from {S} while you looked away. Small regret, real roast. {I}",
      "{S} sparked {P} on the bench. A flicker, not a fire. {I}",
      "You sat {S} and ate a spark of {P}. The week survived. {I}",
      "Spark only. {S} put up {P}. Mention it, then let it go. {I}",
      "{P} from {S}. The bench coughed. That is a spark. {I}",
      "{S} at {P}. A spark on the pine, not a week-ender. {I}",
      "You left {S} sitting. {P} points. The booth called it a spark. {I}",
      "Small regret. {S} went for {P} and the lineup barely smoked. {I}",
      "{P} from {S} on the bench. Spark, then back to the game. {I}",
      "You sat {S} and got a spark back. {P} points. That is the whole story. {I}",
      "{S} flickered for {P}. Spark, not a crater. {I}",
      "Spark. {S} put {P} on the pine. Annoying in a small way. {I}",
      "{P} from {S}. A spark the group chat will forget by Monday. {I}",
    ],
    BLAST: [
      "{S} blasted {P} on your bench. {I}",
      "You sat {S} and ate {P} points of silence. {I}",
      "Blast radius: {S}, {P}. The lineup feels it. {I}",
      "{P} from {S}. That start is going to get mentioned. {I}",
      "{S} went for {P} on the bench. Blast, and the booth heard it. {I}",
      "You sat {S}. {P} points. That is a blast, not a footnote. {I}",
      "Bench blast. {S} dropped {P}. The group chat has a screenshot. {I}",
      "{P} from {S} while the starter watched. Blast radius includes you. {I}",
      "{S} put {P} on the pine. The booth felt the blast. {I}",
      "You sat {S} and the bench answered with {P}. Blast. {I}",
      "That is a blast. {S} at {P}, and the lineup is the punchline. {I}",
      "{P} from {S}. Blast on the bench. The group chat is warming up. {I}",
      "You sat {S}. The blast was {P}. The booth wrote it down. {I}",
      "{S} unloaded {P} on the bench. Blast, full stop. {I}",
      "Blast. {P} from {S}, and the lineup felt the shove. {I}",
      "{S} at {P}. That is a blast with your fingerprints on it. {I}",
    ],
    CRATER: [
      "{S} cratered your week with {P}. {I}",
      "You sat {S}. {P} points. The booth heard the impact. {I}",
      "Crater sit. {S} went for {P}. Screenshot bait, entertainment only. {I}",
      "{P} from {S} on the bench. That is a hole in the lineup. {I}",
      "{S} left a crater at {P}. The sit is the story. {I}",
      "You sat {S} and the week fell in. {P} points. Crater. {I}",
      "Crater. {S} put up {P} on the pine. The booth is not letting it go. {I}",
      "{P} from {S}. That bench score is a crater with your name on it. {I}",
      "{S} cratered it. {P} on the bench, and the lineup has a hole. {I}",
      "You sat {S}. {P} points. Crater sit. The group chat will frame it. {I}",
      "Impact crater: {S} for {P}. The booth heard it twice. {I}",
      "{P} from {S} where you could not spend it. That is a crater. {I}",
      "You sat {S} and opened a crater. {P} points. The booth flinched. {I}",
      "{S} for {P}. Crater sit. The week has a hole in it. {I}",
      "Crater. {P} from {S} on the pine. Screenshot bait. {I}",
      "{S} cratered {P} onto the bench. The lineup is the joke. {I}",
    ],
    NUCLEAR: [
      "{S} went nuclear for {P} on your bench. {I}",
      "You sat {S}. {P} points. The group chat is already typing. {I}",
      "Nuclear sit. {S} dropped {P}. Entertainment only, and still brutal. {I}",
      "{P} from {S}, and they never saw the field. {I}",
      "{S} went nuclear. {P} on the bench. The booth lost its voice. {I}",
      "You sat {S} and they detonated for {P}. Nuclear, for the group chat. {I}",
      "Nuclear. {S} put up {P} where you could not use it. {I}",
      "{P} from {S} on the pine. That is a bench bomb. {I}",
      "{S} for {P}. Nuclear sit. The screenshot is already ugly. {I}",
      "You left {S} on the bench and they went nuclear for {P}. {I}",
      "Bench bomb. {S} dropped {P}. The booth is still ringing. {I}",
      "{P} from {S}. Nuclear, and the lineup never got a vote. {I}",
      "You sat {S}. Nuclear. {P} points, and the group chat is feral. {I}",
      "{S} detonated for {P} on the bench. Nuclear sit. {I}",
      "Nuclear bomb. {P} from {S}. The booth is still on the floor. {I}",
      "{S} went nuclear at {P}. You can hear the group chat from here. {I}",
    ],
  };

  const DODGED = [
    "You dodged it. {S} put up {P}. The bench did you a favor. {I}",
    "{S} at {P}. You dodged it. The booth can sit down. {I}",
    "Dodged. {S} finished at {P}. That sit was a save. {I}",
    "You sat {S} and they scored {P}. You dodged it. {I}",
    "{P} from {S}. You dodged a bomb that never armed. {I}",
    "The bench held. {S} at {P}. You dodged it. {I}",
    "You dodged it. {S} at {P} was not the explosion. {I}",
    "{S} on the pine at {P}. You dodged it, and the group chat can wait. {I}",
    "Save. {S} posted {P}. You dodged it. {I}",
    "{P} from {S}. You dodged it, and the booth can unclench. {I}",
    "You sat {S}. {P} points. You dodged it. {I}",
    "Dodged bomb. {S} at {P}. The pine was the right chair. {I}",
    "You dodged it. {P} from {S} never got into the lineup. {I}",
    "{S} finished {P}. Dodged. The booth can breathe. {I}",
    "Close call you won. {S} at {P}. You dodged it. {I}",
    "{P} from {S}. You dodged it. That bench was a save. {I}",
  ];

  const REBOMB_LEADS = [
    "",
    "Another detonation. ",
    "The booth goes again. ",
    "Same energy, new mouth. ",
    "Take two. ",
  ];

  const ZERO_WORDS = {
    none: true,
    nada: true,
    zilch: true,
    zip: true,
    dnp: true,
    bye: true,
    out: true,
    inactive: true,
    injured: true,
    ir: true,
    donut: true,
    doughnut: true,
    goose: true,
    zero: true,
    nothing: true,
    blank: true,
  };

  const FILLER_WORDS = {
    about: true,
    around: true,
    roughly: true,
    approx: true,
    approximately: true,
    like: true,
    some: true,
    a: true,
    an: true,
    the: true,
    of: true,
    for: true,
    just: true,
    only: true,
    maybe: true,
    half: true,
  };

  const UNIT_WORDS = {
    point: true,
    points: true,
    pts: true,
    pt: true,
    ppr: true,
  };

  const ONES = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
  };

  const TENS = {
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90,
  };

  function clampLine(value, max) {
    const cleaned = String(value == null ? "" : value)
      .replace(/[\u0000-\u001F\u007F]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const chars = Array.from(cleaned);
    if (chars.length <= max) return cleaned;
    return chars.slice(0, max).join("");
  }

  function stampOf(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 8640000000000000) return 0;
    return Math.round(n);
  }

  function normalizeSalt(value) {
    const n = typeof value === "number" ? value : parseInt(String(value == null ? "" : value), 10);
    if (!Number.isFinite(n)) return null;
    const rounded = Math.round(n);
    if (rounded < 0 || rounded > SALT_MAX) return null;
    return rounded;
  }

  function uid(now) {
    const stamp = Math.max(0, stampOf(now) || Date.now()).toString(36);
    const rand = Math.floor(Math.random() * 2176782336).toString(36);
    return ("b" + stamp + rand).slice(0, 40);
  }

  function fnv1a(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function nameKey(text) {
    const normalized = String(text || "").normalize("NFC").toLowerCase().trim();
    const words = normalized.split(/[^\p{L}\p{N}\p{Extended_Pictographic}]+/u).filter(Boolean);
    if (!words.length) return normalized;
    words.sort();
    return words.join(" ");
  }

  function pointsToken(n) {
    if (!Number.isFinite(n)) return "0";
    const rounded = Math.round(n * 10) / 10;
    if (Math.abs(rounded) >= 1000000) return rounded < 0 ? "-999" : "999";
    if (Math.abs(rounded - Math.round(rounded)) < 0.001) return String(Math.round(rounded));
    const text = rounded.toFixed(1);
    if (text.endsWith(".0")) return String(Math.round(rounded));
    return text;
  }

  function energyValue(n) {
    if (n > 80) return 80;
    return n;
  }

  function numberResult(n) {
    const token = pointsToken(n);
    return { display: token, value: energyValue(n), key: token, ok: true };
  }

  function normalizePointText(text) {
    let next = String(text || "").toLowerCase().replace(/\u2212/g, "-");
    next = next.replace(/(^|\s)[–—](?=\d)/g, "$1-");
    next = next.replace(/\b(?:minus|negative)\b\s*/g, "-");
    next = next.replace(/(\d),(\d{1,2})(?!\d)/g, "$1.$2");
    next = next.replace(/(\d),(?=\d{3}(?!\d))/g, "$1");
    return next;
  }

  function contentWords(text) {
    return text.split(/[^a-z0-9]+/).filter(Boolean).filter(function (word) {
      return !FILLER_WORDS[word] && !UNIT_WORDS[word];
    });
  }

  function parseSpelled(words) {
    if (!words.length || words.length > 2) return null;
    if (words.length === 1) {
      if (Object.prototype.hasOwnProperty.call(ONES, words[0])) return ONES[words[0]];
      if (Object.prototype.hasOwnProperty.call(TENS, words[0])) return TENS[words[0]];
      return null;
    }
    if (!Object.prototype.hasOwnProperty.call(TENS, words[0])) return null;
    if (!Object.prototype.hasOwnProperty.call(ONES, words[1]) || ONES[words[1]] > 9) return null;
    return TENS[words[0]] + ONES[words[1]];
  }

  function parseNumeric(text) {
    if (!/\d/.test(text)) return null;
    const range = text.match(/(?:^|[^\d.])(-?\d+(?:\.\d+)?)\s*(?:-|–|—|\bto\b)\s*(-?\d+(?:\.\d+)?)(?![\d.])/);
    if (range) {
      let low = Number(range[1]);
      let high = Number(range[2]);
      if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
      if (high < low) {
        const swap = low;
        low = high;
        high = swap;
      }
      const mid = (low + high) / 2;
      return {
        display: pointsToken(low) + "-" + pointsToken(high),
        value: energyValue(mid),
        key: pointsToken(low) + "-" + pointsToken(high),
        ok: true,
      };
    }
    const plus = text.match(/(?:^|[^\d.])(-?\d+(?:\.\d+)?)\s*(?:\+(?!\d)|\bplus\b)/);
    if (plus) {
      const n = Number(plus[1]);
      if (!Number.isFinite(n)) return null;
      return {
        display: pointsToken(n) + "+",
        value: energyValue(n + 4),
        key: pointsToken(n) + "+",
        ok: true,
      };
    }
    const num = text.match(/(?:^|[^\d.])(-?\d+(?:\.\d+)?)/);
    if (!num) return null;
    const n = Number(num[1]);
    if (!Number.isFinite(n)) return null;
    return numberResult(n);
  }

  function pointsReading(raw) {
    const original = clampLine(raw, POINTS_MAX);
    if (!original) return { display: "", value: null, key: "", ok: false };
    const text = normalizePointText(original);
    const numeric = parseNumeric(text);
    if (numeric) return numeric;
    const words = contentWords(text);
    if (words.length && words.every(function (word) { return ZERO_WORDS[word] === true; })) {
      return { display: "0", value: 0, key: "0", ok: true };
    }
    const spelled = parseSpelled(words);
    if (spelled != null) return numberResult(spelled);
    return { display: original, value: null, key: "", ok: false };
  }

  function energyIndex(value) {
    if (value == null || value < 6) return 0;
    if (value < 14) return 1;
    if (value < 22) return 2;
    if (value < 32) return 3;
    return 4;
  }

  function falloutFor(value, hash) {
    let points = value == null ? (hash % 36) : value;
    if (points < 0) points = 0;
    if (points > 80) points = 80;
    let meter = Math.round(8 + points * 2.15 + (hash % 5));
    if (meter > 96) meter = 96;
    if (meter < 8) meter = 8;
    return meter;
  }

  function insteadClause(start) {
    if (!start) return "No alibi on file.";
    return "You started " + start + " instead.";
  }

  function fill(line, sat, start, points) {
    const instead = insteadClause(start);
    let out = "";
    for (let i = 0; i < line.length; i += 1) {
      const token = line.slice(i, i + 3);
      if (token === "{S}") {
        out += sat;
        i += 2;
        continue;
      }
      if (token === "{P}") {
        out += points;
        i += 2;
        continue;
      }
      if (token === "{I}") {
        out += instead;
        i += 2;
        continue;
      }
      out += line.charAt(i);
    }
    return out;
  }

  function truncateAtWord(line, max) {
    const chars = Array.from(line);
    if (chars.length <= max) return chars.join("");
    const ellipsis = "…";
    const budget = max - Array.from(ellipsis).length;
    if (budget < 1) return ellipsis;
    let slice = chars.slice(0, budget).join("");
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace >= 24) slice = slice.slice(0, lastSpace);
    slice = slice.replace(/[\s,;:.!?—-]+$/g, "");
    const out = slice + ellipsis;
    if (Array.from(out).length <= max) return out;
    return Array.from(slice).slice(0, budget).join("").replace(/[\s,;:.!?—-]+$/g, "") + ellipsis;
  }

  function polish(line) {
    const cleaned = String(line || "").replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim();
    const text = truncateAtWord(cleaned, ROAST_MAX);
    if (!text) return text;
    const first = text.charAt(0);
    const upper = first.toUpperCase();
    if (first === upper) return text;
    return upper + text.slice(1);
  }

  function roastPool(energy, dodged) {
    if (dodged) return DODGED;
    switch (energy) {
      case "DUD":
      case "SPARK":
      case "BLAST":
      case "CRATER":
      case "NUCLEAR":
        return ROASTS[energy];
      default: {
        const _never = energy;
        throw new Error("Unknown energy " + _never);
      }
    }
  }

  function mixHash(hash) {
    let x = hash >>> 0;
    x ^= x >>> 16;
    x = Math.imul(x, 0x7feb352d);
    x ^= x >>> 15;
    x = Math.imul(x, 0x846ca68b);
    x ^= x >>> 16;
    return x >>> 0;
  }

  function roastLine(energy, salt, pairHash, dodged) {
    const pool = roastPool(energy, dodged);
    const index = (mixHash(pairHash) + Math.abs(salt)) % pool.length;
    const base = pool[index];
    const lead = salt > 0 ? REBOMB_LEADS[Math.abs(salt) % REBOMB_LEADS.length] : "";
    return lead + base;
  }

  function tagFor(energy, hash) {
    switch (energy) {
      case "DUD":
      case "SPARK":
      case "BLAST":
      case "CRATER":
      case "NUCLEAR":
        return TAGS[energy][hash % TAGS[energy].length];
      default: {
        const _never = energy;
        throw new Error("Unknown energy " + _never);
      }
    }
  }

  function bandFor(energy) {
    switch (energy) {
      case "DUD":
        return "dud";
      case "SPARK":
        return "spark";
      case "BLAST":
        return "blast";
      case "CRATER":
        return "crater";
      case "NUCLEAR":
        return "nuclear";
      default: {
        const _never = energy;
        throw new Error("Unknown energy " + _never);
      }
    }
  }

  function callBomb(satRaw, startRaw, pointsRaw, salt) {
    const sat = clampLine(satRaw, SAT_MAX);
    const start = clampLine(startRaw, START_MAX);
    const reading = pointsReading(pointsRaw);
    if (!reading.ok) return null;
    const cleanSalt = normalizeSalt(salt);
    const usedSalt = cleanSalt == null ? 0 : cleanSalt;
    const pairHash = fnv1a(nameKey(sat) + "\n" + nameKey(start) + "\n" + reading.key);
    const dodged = reading.value <= 0;
    const energy = ENERGIES[energyIndex(reading.value)];
    return {
      energy: energy,
      roast: polish(fill(roastLine(energy, usedSalt, pairHash, dodged), sat, start, reading.display)),
      fallout: falloutFor(reading.value, pairHash),
      tag: tagFor(energy, pairHash),
      hash: pairHash,
    };
  }

  function trioKey(sat, start, points) {
    return nameKey(sat) + "\n" + nameKey(start) + "\n" + pointsReading(points).key;
  }

  function normalizeCard(raw, fromShare) {
    if (!raw || typeof raw !== "object") return null;
    const id = clampLine(raw.id, 40);
    if (!/^[A-Za-z0-9_-]{2,40}$/.test(id)) return null;
    const sat = clampLine(raw.sat != null ? raw.sat : raw.s, SAT_MAX);
    const start = clampLine(raw.start != null ? raw.start : raw.w, START_MAX);
    const pointsRaw = clampLine(raw.points != null ? raw.points : raw.p, POINTS_MAX);
    const note = clampLine(raw.note != null ? raw.note : raw.n, NOTE_MAX);
    const reading = pointsReading(pointsRaw);
    if (!sat || !reading.ok) return null;
    const points = reading.display;
    const salt = normalizeSalt(raw.salt != null ? raw.salt : raw.sa);
    if (salt == null) return null;
    const call = callBomb(sat, start, points, salt);
    if (!call) return null;
    const starred = fromShare ? false : (raw.starred === true || raw.star === 1 || raw.star === true);
    return {
      id: id,
      sat: sat,
      start: start,
      points: points,
      note: note,
      salt: salt,
      energy: call.energy,
      fallout: call.fallout,
      roast: call.roast,
      tag: call.tag,
      starred: starred,
      created: stampOf(raw.created != null ? raw.created : raw.cr),
      updated: stampOf(raw.updated != null ? raw.updated : raw.up),
    };
  }

  function normalizeFilter(value) {
    switch (value) {
      case "all":
      case "starred":
        return value;
      default:
        return "all";
    }
  }

  function emptyState() {
    return { v: 1, filter: "all", cards: [], openId: "" };
  }

  function normalizeState(raw) {
    const state = emptyState();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return state;
    const list = Array.isArray(raw.cards) ? raw.cards : [];
    const seen = Object.create(null);
    for (let i = 0; i < list.length && state.cards.length < HISTORY_CAP; i += 1) {
      const card = normalizeCard(list[i]);
      if (!card || seen[card.id]) continue;
      seen[card.id] = true;
      state.cards.push(card);
    }
    state.filter = normalizeFilter(raw.filter);
    const openId = typeof raw.openId === "string" ? raw.openId : "";
    if (state.cards.some(function (card) { return card.id === openId; })) state.openId = openId;
    else state.openId = state.cards.length ? state.cards[0].id : "";
    return state;
  }

  function readStored(raw) {
    if (raw == null || raw === "") return { corrupt: false, state: null, backup: "" };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return { corrupt: true, state: emptyState(), backup: String(raw) };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { corrupt: true, state: emptyState(), backup: String(raw) };
    }
    if (Object.prototype.hasOwnProperty.call(parsed, "cards") && !Array.isArray(parsed.cards)) {
      return { corrupt: true, state: emptyState(), backup: String(raw) };
    }
    return { corrupt: false, state: normalizeState(parsed), backup: "" };
  }

  function findIndex(cards, id) {
    return cards.findIndex(function (card) { return card.id === id; });
  }

  function findTrio(cards, sat, start, points) {
    const key = trioKey(sat, start, points);
    return cards.find(function (card) { return trioKey(card.sat, card.start, card.points) === key; }) || null;
  }

  function liftCard(state, card) {
    const rest = state.cards.filter(function (row) { return row.id !== card.id; });
    state.cards = [card].concat(rest);
    state.openId = card.id;
    return state;
  }

  function canDrop(card, protectId) {
    if (!card || card.starred) return false;
    if (protectId && card.id === protectId) return false;
    return true;
  }

  function pickDropIndex(list, protectId) {
    let best = -1;
    for (let i = 0; i < list.length; i += 1) {
      if (!canDrop(list[i], protectId)) continue;
      if (best < 0) {
        best = i;
        continue;
      }
      const created = list[i].created;
      const bestCreated = list[best].created;
      if (created < bestCreated || (created === bestCreated && i > best)) best = i;
    }
    return best;
  }

  function makeRoom(cards, incomingCount, protectId) {
    const next = cards.slice();
    const dropped = [];
    while (next.length + incomingCount > HISTORY_CAP) {
      const dropAt = pickDropIndex(next, protectId);
      if (dropAt < 0) return null;
      const victim = next[dropAt];
      const originalIndex = cards.findIndex(function (card) { return card.id === victim.id; });
      dropped.push({ card: victim, index: originalIndex });
      next.splice(dropAt, 1);
    }
    return { cards: next, dropped: dropped };
  }

  function readSit(input) {
    const source = input && typeof input === "object" ? input : {};
    return {
      sat: clampLine(source.sat, SAT_MAX),
      start: clampLine(source.start, START_MAX),
      points: clampLine(source.points, POINTS_MAX),
      note: clampLine(source.note, NOTE_MAX),
    };
  }

  function rejectSit(sit) {
    if (!sit.sat && !sit.points) return "blank";
    if (!sit.sat) return "sat";
    if (!sit.points) return "points";
    if (!pointsReading(sit.points).ok) return "number";
    return "";
  }

  function bomb(state, input, now) {
    const next = normalizeState(state);
    const sit = readSit(input);
    const reason = rejectSit(sit);
    if (reason) return { ok: false, reason: reason, state: next };
    const existing = findTrio(next.cards, sit.sat, sit.start, sit.points);
    if (existing) {
      let card = existing;
      if (sit.note !== existing.note) {
        card = {
          id: existing.id,
          sat: existing.sat,
          start: existing.start,
          points: existing.points,
          note: sit.note,
          salt: existing.salt,
          energy: existing.energy,
          fallout: existing.fallout,
          roast: existing.roast,
          tag: existing.tag,
          starred: existing.starred,
          created: existing.created,
          updated: stampOf(now) || Date.now(),
        };
      }
      liftCard(next, card);
      return { ok: true, state: next, card: card, already: true, dropped: [] };
    }
    const room = makeRoom(next.cards, 1, "");
    if (!room) return { ok: false, reason: "cap", state: next };
    const when = stampOf(now) || Date.now();
    const call = callBomb(sit.sat, sit.start, sit.points, 0);
    if (!call) return { ok: false, reason: "number", state: next };
    const card = normalizeCard({
      id: uid(when),
      sat: sit.sat,
      start: sit.start,
      points: sit.points,
      note: sit.note,
      salt: 0,
      energy: call.energy,
      fallout: call.fallout,
      roast: call.roast,
      tag: call.tag,
      starred: false,
      created: when,
      updated: when,
    });
    if (!card) return { ok: false, reason: "missing", state: next };
    next.cards = [card].concat(room.cards);
    next.openId = card.id;
    return { ok: true, state: next, card: card, already: false, dropped: room.dropped };
  }

  function replaceCard(state, id, mapper, now) {
    const next = normalizeState(state);
    const idx = findIndex(next.cards, id);
    if (idx < 0) return { ok: false, reason: "missing", state: next };
    const previous = normalizeCard(next.cards[idx]);
    const clean = normalizeCard(mapper(previous));
    if (!clean) return { ok: false, reason: "missing", state: next };
    clean.updated = stampOf(now) || Date.now();
    next.cards = next.cards.slice();
    next.cards[idx] = clean;
    next.openId = clean.id;
    return { ok: true, state: next, card: clean, previous: previous };
  }

  function rebomb(state, id, now) {
    const peek = normalizeState(state);
    const current = peek.cards.find(function (card) { return card.id === id; });
    if (!current) return { ok: false, reason: "missing", state: peek };
    if (current.salt >= SALT_MAX) return { ok: false, reason: "salt", state: peek };
    return replaceCard(state, id, function (card) {
      const salt = card.salt + 1;
      const call = callBomb(card.sat, card.start, card.points, salt);
      if (!call) return null;
      return {
        id: card.id,
        sat: card.sat,
        start: card.start,
        points: card.points,
        note: card.note,
        salt: salt,
        energy: call.energy,
        fallout: call.fallout,
        roast: call.roast,
        tag: call.tag,
        starred: card.starred,
        created: card.created,
        updated: now,
      };
    }, now);
  }

  function setStarred(state, id, starred, now) {
    return replaceCard(state, id, function (card) {
      return {
        id: card.id,
        sat: card.sat,
        start: card.start,
        points: card.points,
        note: card.note,
        salt: card.salt,
        energy: card.energy,
        fallout: card.fallout,
        roast: card.roast,
        tag: card.tag,
        starred: !!starred,
        created: card.created,
        updated: now,
      };
    }, now);
  }

  function putCard(state, card) {
    const next = normalizeState(state);
    const clean = normalizeCard(card);
    if (!clean) return { ok: false, reason: "missing", state: next };
    const idx = findIndex(next.cards, clean.id);
    if (idx < 0) return { ok: false, reason: "missing", state: next };
    next.cards = next.cards.slice();
    next.cards[idx] = clean;
    next.openId = clean.id;
    return { ok: true, state: next, card: clean };
  }

  function openCard(state, id) {
    const next = normalizeState(state);
    if (findIndex(next.cards, id) < 0) return { ok: false, reason: "missing", state: next };
    next.openId = id;
    return { ok: true, state: next };
  }

  function removeCard(state, id) {
    const next = normalizeState(state);
    const idx = findIndex(next.cards, id);
    if (idx < 0) return { ok: false, reason: "missing", state: next, removed: null, index: -1, wasOpen: false };
    const removed = next.cards[idx];
    const wasOpen = next.openId === id;
    next.cards = next.cards.filter(function (card) { return card.id !== id; });
    if (wasOpen) {
      if (!next.cards.length) next.openId = "";
      else next.openId = next.cards[Math.min(idx, next.cards.length - 1)].id;
    }
    return { ok: true, state: next, removed: removed, index: idx, wasOpen: wasOpen };
  }

  function restoreCard(state, card, index, wasOpen) {
    const next = normalizeState(state);
    const clean = normalizeCard(card);
    if (!clean) return { ok: false, reason: "missing", state: next };
    if (findIndex(next.cards, clean.id) >= 0) return { ok: false, reason: "exists", state: next };
    if (next.cards.length >= HISTORY_CAP) return { ok: false, reason: "cap", state: next };
    const copy = next.cards.slice();
    const at = Math.max(0, Math.min(Number(index) || 0, copy.length));
    copy.splice(at, 0, clean);
    next.cards = copy;
    if (wasOpen) next.openId = clean.id;
    return { ok: true, state: next, card: clean };
  }

  function clearCards(state) {
    const next = normalizeState(state);
    const previous = next.cards;
    const openId = next.openId;
    const filter = next.filter;
    next.cards = [];
    next.openId = "";
    return { ok: true, state: next, previous: previous, openId: openId, filter: filter };
  }

  function restoreAll(state, previous, openId) {
    const filter = normalizeState(state).filter;
    const next = normalizeState({ v: 1, filter: filter, cards: previous || [], openId: openId || "" });
    return { ok: true, state: next };
  }

  function setFilter(state, filter) {
    const next = normalizeState(state);
    next.filter = normalizeFilter(filter);
    return next;
  }

  function visibleCards(state) {
    const next = normalizeState(state);
    switch (next.filter) {
      case "all":
        return next.cards.slice();
      case "starred":
        return next.cards.filter(function (card) { return card.starred; });
      default: {
        const _never = next.filter;
        throw new Error("Unknown filter " + _never);
      }
    }
  }

  function sampleInput() {
    return {
      sat: "Justin Jefferson",
      start: "A committee back",
      points: "38.4",
      note: "Week 4 · work league",
    };
  }

  function sampleCard() {
    const sit = sampleInput();
    const call = callBomb(sit.sat, sit.start, sit.points, 0);
    return normalizeCard({
      id: SAMPLE_ID,
      sat: sit.sat,
      start: sit.start,
      points: sit.points,
      note: sit.note,
      salt: 0,
      energy: call.energy,
      fallout: call.fallout,
      roast: call.roast,
      tag: call.tag,
      starred: false,
      created: SAMPLE_AT,
      updated: SAMPLE_AT,
    });
  }

  function loadSample(state) {
    const next = normalizeState(state);
    const sit = sampleInput();
    const pair = findTrio(next.cards, sit.sat, sit.start, sit.points);
    if (pair) {
      liftCard(next, pair);
      return { ok: true, state: next, already: true, card: pair, dropped: [] };
    }
    const byId = next.cards.find(function (card) { return card.id === SAMPLE_ID; });
    if (byId) {
      liftCard(next, byId);
      return { ok: true, state: next, already: true, card: byId, dropped: [] };
    }
    const room = makeRoom(next.cards, 1, "");
    if (!room) return { ok: false, reason: "cap", state: next };
    const card = sampleCard();
    if (!card) return { ok: false, reason: "missing", state: next };
    next.cards = [card].concat(room.cards);
    next.openId = card.id;
    return { ok: true, state: next, already: false, card: card, dropped: room.dropped };
  }

  function slim(card) {
    return {
      id: card.id,
      sa: card.salt,
      en: card.energy,
      fo: card.fallout,
      rs: card.roast,
      tg: card.tag,
      cr: card.created,
      up: card.updated,
      s: card.sat,
      w: card.start,
      p: card.points,
      n: card.note,
    };
  }

  function shareCard(card) {
    const clean = normalizeCard(card);
    if (!clean) return null;
    return { v: 1, k: "card", c: [slim(clean)] };
  }

  function shareShelf(state) {
    const next = normalizeState(state);
    return {
      v: 1,
      k: "shelf",
      c: next.cards.slice(0, HISTORY_CAP).map(slim),
    };
  }

  function parseShare(raw) {
    if (!raw || typeof raw !== "object" || raw.v !== 1 || !Array.isArray(raw.c)) return null;
    let kind = null;
    switch (raw.k) {
      case "card":
      case "shelf":
        kind = raw.k;
        break;
      default:
        return null;
    }
    const limit = kind === "card" ? 1 : HISTORY_CAP;
    const cards = [];
    for (let i = 0; i < raw.c.length && cards.length < limit; i += 1) {
      const card = normalizeCard(raw.c[i], true);
      if (card) cards.push(card);
    }
    if (!cards.length) return null;
    return { v: 1, k: kind, cards: cards };
  }

  function freshCards(state, share) {
    const next = normalizeState(state);
    const fresh = [];
    if (!share || !Array.isArray(share.cards)) return { state: next, fresh: fresh };
    const haveId = Object.create(null);
    next.cards.forEach(function (card) { haveId[card.id] = true; });
    share.cards.forEach(function (card) {
      const clean = normalizeCard(card, true);
      if (!clean || haveId[clean.id]) return;
      const key = trioKey(clean.sat, clean.start, clean.points);
      if (findTrio(next.cards, clean.sat, clean.start, clean.points) || fresh.some(function (row) {
        return trioKey(row.sat, row.start, row.points) === key;
      })) return;
      haveId[clean.id] = true;
      clean.starred = false;
      fresh.push(clean);
    });
    return { state: next, fresh: fresh };
  }

  function planKeep(cards, freshCount) {
    let droppable = 0;
    for (let i = 0; i < cards.length; i += 1) {
      if (!cards[i].starred) droppable += 1;
    }
    const free = Math.max(0, HISTORY_CAP - cards.length);
    const capacity = Math.min(HISTORY_CAP, free + droppable);
    const adds = Math.min(Math.max(0, freshCount), capacity);
    const drops = adds > 0 ? Math.max(0, cards.length + adds - HISTORY_CAP) : 0;
    return { adds: adds, drops: drops };
  }

  function previewKeep(state, share) {
    const packed = freshCards(state, share);
    const plan = planKeep(packed.state.cards, packed.fresh.length);
    const offered = share && Array.isArray(share.cards) ? share.cards.length : 0;
    return {
      adds: plan.adds,
      drops: plan.drops,
      fresh: packed.fresh.length,
      offered: offered,
    };
  }

  function keepShare(state, share) {
    const packed = freshCards(state, share);
    const next = packed.state;
    if (!share || !Array.isArray(share.cards) || !share.cards.length) {
      return { ok: false, reason: "missing", state: next };
    }
    if (!packed.fresh.length) {
      const first = share.cards[0];
      const existing = first && findIndex(next.cards, first.id) >= 0
        ? next.cards[findIndex(next.cards, first.id)]
        : (first ? findTrio(next.cards, first.sat || first.s, first.start || first.w, first.points || first.p) : null);
      return { ok: false, reason: "exists", state: next, card: existing || null };
    }
    const plan = planKeep(next.cards, packed.fresh.length);
    if (!plan.adds) return { ok: false, reason: "cap", state: next };
    const batch = packed.fresh.slice(0, plan.adds);
    const room = makeRoom(next.cards, batch.length, "");
    if (!room) return { ok: false, reason: "cap", state: next };
    next.cards = batch.concat(room.cards);
    next.openId = batch[0].id;
    return {
      ok: true,
      state: next,
      cards: batch,
      dropped: room.dropped,
      added: batch.length,
      offered: share.cards.length,
    };
  }

  function face(card) {
    const clean = normalizeCard(card);
    if (!clean) return "";
    return clean.energy + " · " + clean.sat + " · " + clean.points;
  }

  function bytesToB64url(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function b64urlToBytes(token) {
    let b64 = String(token).replace(/-/g, "+").replace(/_/g, "/");
    const padLen = b64.length % 4;
    if (padLen) b64 += "====".slice(0, 4 - padLen);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function compressPayload(json) {
    const plain = "j." + bytesToB64url(new TextEncoder().encode(json));
    if (typeof CompressionStream === "undefined") return plain;
    try {
      const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate"));
      const buf = await new Response(stream).arrayBuffer();
      const zipped = "z." + bytesToB64url(new Uint8Array(buf));
      return zipped.length <= plain.length ? zipped : plain;
    } catch (_) {
      return plain;
    }
  }

  async function decompressPayload(token) {
    if (typeof token !== "string" || token.length < 2) throw new Error("bad token");
    const kind = token.slice(0, 2);
    const body = token.slice(2);
    if (kind === "j.") return new TextDecoder().decode(b64urlToBytes(body));
    if (kind === "z.") {
      if (typeof DecompressionStream === "undefined") throw new Error("no decompress");
      const bytes = b64urlToBytes(body);
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
      return await new Response(stream).text();
    }
    return decodeURIComponent(escape(atob(token)));
  }

  root.BenchBomb = {
    STORAGE_KEY: STORAGE_KEY,
    STORAGE_BACKUP_KEY: STORAGE_BACKUP_KEY,
    HISTORY_CAP: HISTORY_CAP,
    SAT_MAX: SAT_MAX,
    START_MAX: START_MAX,
    POINTS_MAX: POINTS_MAX,
    NOTE_MAX: NOTE_MAX,
    SAMPLE_ID: SAMPLE_ID,
    ENERGIES: ENERGIES,
    emptyState: emptyState,
    normalizeState: normalizeState,
    normalizeCard: normalizeCard,
    readStored: readStored,
    callBomb: callBomb,
    pointsReading: pointsReading,
    nameKey: nameKey,
    bandFor: bandFor,
    bomb: bomb,
    rebomb: rebomb,
    setStarred: setStarred,
    putCard: putCard,
    openCard: openCard,
    removeCard: removeCard,
    restoreCard: restoreCard,
    clearCards: clearCards,
    restoreAll: restoreAll,
    setFilter: setFilter,
    visibleCards: visibleCards,
    loadSample: loadSample,
    sampleCard: sampleCard,
    sampleInput: sampleInput,
    shareCard: shareCard,
    shareShelf: shareShelf,
    parseShare: parseShare,
    previewKeep: previewKeep,
    keepShare: keepShare,
    face: face,
    compressPayload: compressPayload,
    decompressPayload: decompressPayload,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
