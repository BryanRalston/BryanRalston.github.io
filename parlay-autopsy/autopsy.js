(function (root) {
  "use strict";

  const STORAGE_KEY = "parlay-autopsy-v1";
  const STORAGE_BACKUP_KEY = "parlay-autopsy-v1-corrupt";
  const HISTORY_CAP = 24;
  const LEG_MIN = 2;
  const LEG_MAX = 6;
  const NAME_MAX = 80;
  const ODDS_MAX = 16;
  const NOTE_MAX = 80;
  const ROAST_MAX = 240;
  const SALT_MAX = 9999;
  const SAMPLE_ID = "sample-last-leg";
  const SAMPLE_AT = 1790899200000;
  const CAUSES = ["LAST LEG", "MIDDLE BLEED", "TOTAL COLLAPSE", "NEAR MISS", "ONE-TICK"];

  const TAGS = {
    "LAST LEG": ["BUZZER DEATH", "FINAL CUT"],
    "MIDDLE BLEED": ["GUT SHOT", "MID SLIP"],
    "TOTAL COLLAPSE": ["NO SURVIVORS", "FULL WIPE"],
    "NEAR MISS": ["ONE ALIVE", "ALMOST"],
    "ONE-TICK": ["JUICE BAND", "PHOTO FINISH"],
  };

  const ROASTS = {
    "LAST LEG": [
      { fit: "single", line: "The ticket died on {K}. {C}" },
      { fit: "single", line: "Last leg. {K} flatlined. {C}" },
      { fit: "single", line: "Buzzer death. {K} never cashed. {C}" },
      { fit: "single", line: "{C} {K} still killed the ticket." },
      { fit: "single", line: "{K} at the end of a {N}-leg slip. {C}" },
      { fit: "single", line: "{K} never cashed. {C} Last leg." },
      { fit: "single", line: "One killer. {K} ended a {N}-leg slip. {C}" },
      { fit: "single", line: "{C} The corpse is {K}." },
      { fit: "position", line: "Final cut: {P}. {C}" },
      { fit: "position", line: "The last name on the slip was {P}. {C}" },
      { fit: "position", line: "{P} closed the slip. {C}" },
      { fit: "position", line: "{P} wrote the ending. {C}" },
      { fit: "multi", line: "{K} killed it. {P} closed the slip." },
      { fit: "multi", line: "{D} dead on a {N}-leg slip. Final cut: {P}." },
      { fit: "multi", line: "The last name on the slip was {P}. The dead list is {K}." },
      { fit: "multi", line: "{K} took the ticket down. {P} wrote the ending." },
      { fit: "multi", line: "Several legs died. {P} was the buzzer." },
      { fit: "multi", line: "{C} Still dead: {K}. The ending was {P}." },
      { fit: "multi", line: "Not one killer. {K}. {P} finished it." },
      { fit: "multi", line: "{P} at the end of a {N}-leg slip. {K} never cashed." },
    ],
    "MIDDLE BLEED": [
      { fit: "single", line: "{K} died between the cashed legs. {C}" },
      { fit: "single", line: "Not the opener. Not the closer. {K}. {C}" },
      { fit: "single", line: "{C} {K} still emptied the ticket." },
      { fit: "single", line: "{K} took the ticket with them. {C}" },
      { fit: "single", line: "One killer, parked in the middle. {K}. {C}" },
      { fit: "single", line: "The wound was {K}, with cashed legs on both sides. {C}" },
      { fit: "single", line: "{K} was the only leg that died. It sat in the middle. {C}" },
      { fit: "single", line: "Middle bleed on {K}. Everyone else cashed. {C}" },
      { fit: "position", line: "Middle of the pile: {P}. {C}" },
      { fit: "position", line: "{P} bled out in the middle. {C}" },
      { fit: "position", line: "Gut shot. {P} in the middle of {N}. {C}" },
      { fit: "position", line: "The middle of the slip was {P}. {C}" },
      { fit: "multi", line: "{K} killed it. Middle of the pile: {P}." },
      { fit: "multi", line: "{D} dead on a {N}-leg slip. {C}" },
      { fit: "multi", line: "{K} emptied the ticket. {C}" },
      { fit: "multi", line: "The last leg cashed. {K} did not." },
      { fit: "multi", line: "{P} bled out in the middle. The dead list is {K}." },
      { fit: "multi", line: "Middle bleed. {K} took the slip. {C}" },
      { fit: "multi", line: "{C} The damage was {K}." },
      { fit: "multi", line: "{K} on a {N}-leg slip. The closer cashed." },
    ],
    "TOTAL COLLAPSE": [
      { fit: "multi", line: "Total collapse. {K}. Nobody cashed a {N}-leg slip." },
      { fit: "multi", line: "{K} all flatlined. Total collapse." },
      { fit: "multi", line: "No survivors. {K}." },
      { fit: "multi", line: "Every leg died. {K}." },
      { fit: "multi", line: "Full wipe. {N} legs, {D} dead. {K}." },
      { fit: "multi", line: "The whole ticket face-planted. {K}." },
      { fit: "multi", line: "Nothing cashed. {K} took the slip with them." },
      { fit: "multi", line: "Total collapse on {K}." },
      { fit: "multi", line: "{N} names. Zero pulse. {K}." },
      { fit: "multi", line: "The slab has no survivor. {K}." },
    ],
    "NEAR MISS": [
      { fit: "single", line: "Near miss. {K} died. {C}" },
      { fit: "single", line: "{C} {K} still buried the ticket." },
      { fit: "single", line: "The opener died. {K}. {C}" },
      { fit: "single", line: "One breath short. {K} killed it. {C}" },
      { fit: "single", line: "Near miss on a {N}-leg slip. {K}. {C}" },
      { fit: "single", line: "{K} kept this from cashing. {C}" },
      { fit: "single", line: "The rest lived. {K} did not. {C}" },
      { fit: "single", line: "Close enough to sting. {K}. {C}" },
      { fit: "single", line: "Near miss. The corpse is {K}. {C}" },
      { fit: "single", line: "{C} The killer was {K}." },
    ],
    "ONE-TICK": [
      { fit: "single", line: "{K} was one tick from living. {C}" },
      { fit: "single", line: "One tick. {K} died inside the juice. {C}" },
      { fit: "single", line: "The number was right there. {K} still died. {C}" },
      { fit: "single", line: "Juice-band death. {K}. {C}" },
      { fit: "single", line: "One tick on {K}. {C}" },
      { fit: "single", line: "{K} lost by a tick, not a mile. {C}" },
      { fit: "single", line: "Photo finish, wrong side. {K}. {C}" },
      { fit: "single", line: "One tick. A {N}-leg slip died on {K}. {C}" },
      { fit: "single", line: "{C} {K} was the coin-flip that landed dead." },
      { fit: "single", line: "The price was close. {K} was not lucky. {C}" },
    ],
  };

  const LEADS = [
    "The slab goes again. ",
    "Same stamp, new mouth. ",
    "Take two. ",
    "Another cut. ",
    "",
  ];

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
    return ("a" + stamp + rand).slice(0, 40);
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
    const normalized = String(text || "")
      .normalize("NFC")
      .toLowerCase()
      .trim()
      .replace(/\u2212/g, "-")
      .replace(/[–—]/g, "-");
    const tokens = [];
    const re = /[+-]?\d+(?:\.\d+)?\+?|\p{Extended_Pictographic}|[\p{L}\p{N}]+/gu;
    let match;
    while ((match = re.exec(normalized))) tokens.push(match[0]);
    if (!tokens.length) return normalized;
    tokens.sort();
    return tokens.join(" ");
  }

  function oddsResult(ok, display, value, implied) {
    return { ok: ok, display: display, value: value, implied: implied };
  }

  function parseOdds(raw) {
    const cleaned = clampLine(raw, ODDS_MAX);
    if (!cleaned) return oddsResult(true, "", null, false);
    const text = cleaned.replace(/\u2212/g, "-").replace(/[–—]/g, "-");
    if (/\s/.test(text)) return oddsResult(false, "", null, false);
    if (/^(?:even|ev)$/i.test(text)) return oddsResult(true, "+100", 100, false);
    const match = text.match(/^([+-])?(\d+)$/);
    if (!match) return oddsResult(false, "", null, false);
    if (match[2].length > 6) return oddsResult(false, "", null, false);
    const magnitude = parseInt(match[2], 10);
    if (!Number.isFinite(magnitude) || magnitude < 100 || magnitude > 100000) {
      return oddsResult(false, "", null, false);
    }
    const value = (match[1] === "-" ? -1 : 1) * magnitude;
    const display = value > 0 ? "+" + String(value) : String(value);
    return oddsResult(true, display, value, !match[1]);
  }

  function inJuice(value) {
    if (value == null || !Number.isFinite(value)) return false;
    if (value < -130 || value > 130) return false;
    if (value > -100 && value < 100) return false;
    return true;
  }

  function truthyKill(raw) {
    return raw === true || raw === 1 || raw === "1";
  }

  function prepareSlip(input) {
    const source = input && Array.isArray(input.legs) ? input.legs : [];
    const note = clampLine(input && input.note != null ? input.note : input && input.d, NOTE_MAX);
    const rows = [];
    for (let i = 0; i < source.length; i += 1) {
      const raw = source[i] && typeof source[i] === "object" ? source[i] : {};
      const name = clampLine(raw.name != null ? raw.name : raw.n, NAME_MAX);
      const oddsRaw = clampLine(raw.odds != null ? raw.odds : raw.o, ODDS_MAX);
      const killer = truthyKill(raw.killer) || truthyKill(raw.k);
      if (!name && !oddsRaw && !killer) continue;
      rows.push({ name: name, oddsRaw: oddsRaw, killer: killer, index: i });
    }
    if (!rows.length) return { ok: false, reason: "blank", index: 0 };
    for (let i = 0; i < rows.length; i += 1) {
      if (!rows[i].name) return { ok: false, reason: "name", index: rows[i].index };
    }
    if (rows.length > LEG_MAX) return { ok: false, reason: "many", index: LEG_MAX };
    const legs = [];
    for (let i = 0; i < rows.length; i += 1) {
      const parsed = parseOdds(rows[i].oddsRaw);
      if (!parsed.ok) return { ok: false, reason: "odds", index: rows[i].index };
      legs.push({
        name: rows[i].name,
        odds: parsed.display,
        oddsValue: parsed.value,
        killer: rows[i].killer,
      });
    }
    if (legs.length < LEG_MIN) return { ok: false, reason: "few", index: 0 };
    let dead = 0;
    for (let i = 0; i < legs.length; i += 1) {
      if (legs[i].killer) dead += 1;
    }
    if (!dead) return { ok: false, reason: "killer", index: 0 };
    return { ok: true, legs: legs, note: note };
  }

  function legSortKey(leg) {
    return nameKey(leg.name) + "\n" + (leg.odds || "") + "\n" + (leg.killer ? "1" : "0");
  }

  function slipKey(legs) {
    const keys = [];
    for (let i = 0; i < legs.length; i += 1) keys.push(legSortKey(legs[i]));
    keys.sort();
    return keys.join("\n");
  }

  function causeOf(legs) {
    const n = legs.length;
    const killers = [];
    for (let i = 0; i < n; i += 1) {
      if (legs[i].killer) killers.push(i);
    }
    if (!killers.length) return null;
    if (killers.length === n) return "TOTAL COLLAPSE";
    if (killers.length === 1 && inJuice(legs[killers[0]].oddsValue)) return "ONE-TICK";
    if (killers.length === 1 && killers[0] === n - 1) return "LAST LEG";
    if (killers.length === 1 && killers[0] === 0) return "NEAR MISS";
    if (killers.length === 1) return "MIDDLE BLEED";
    if (killers[killers.length - 1] === n - 1) return "LAST LEG";
    return "MIDDLE BLEED";
  }

  function meterFor(legs, hash) {
    const n = legs.length;
    const dead = deadCount(legs);
    let long = 0;
    for (let i = 0; i < legs.length; i += 1) {
      if (legs[i].killer && legs[i].oddsValue != null && legs[i].oddsValue >= 300) long += 1;
    }
    const share = n ? Math.round((dead * 100) / n) : 0;
    let meter = share + (hash % 7) + Math.min(6, long * 3);
    if (meter > 96) meter = 96;
    if (meter < 8) meter = 8;
    return meter;
  }

  function joinNames(list) {
    if (list.length === 1) return list[0];
    if (list.length === 2) return list[0] + " and " + list[1];
    let out = "";
    for (let i = 0; i < list.length; i += 1) {
      if (i === list.length - 1) out += "and " + list[i];
      else out += list[i] + ", ";
    }
    return out;
  }

  function killerClause(legs) {
    const names = [];
    for (let i = 0; i < legs.length; i += 1) {
      if (legs[i].killer) names.push(legs[i].name);
    }
    return joinNames(names);
  }

  function cashedClause(legs) {
    const names = [];
    for (let i = 0; i < legs.length; i += 1) {
      if (!legs[i].killer) names.push(legs[i].name);
    }
    if (!names.length) return "Nobody cashed.";
    if (names.length === 1) return names[0] + " cashed.";
    return joinNames(names) + " cashed.";
  }

  function deadCount(legs) {
    let dead = 0;
    for (let i = 0; i < legs.length; i += 1) {
      if (legs[i].killer) dead += 1;
    }
    return dead;
  }

  function fill(line, killers, cashed, count, dead, positional) {
    let out = "";
    for (let i = 0; i < line.length; i += 1) {
      const token = line.slice(i, i + 3);
      if (token === "{K}") {
        out += killers;
        i += 2;
        continue;
      }
      if (token === "{C}") {
        out += cashed;
        i += 2;
        continue;
      }
      if (token === "{N}") {
        out += String(count);
        i += 2;
        continue;
      }
      if (token === "{D}") {
        out += String(dead);
        i += 2;
        continue;
      }
      if (token === "{P}") {
        out += positional;
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

  function roastPool(cause) {
    switch (cause) {
      case "LAST LEG":
      case "MIDDLE BLEED":
      case "TOTAL COLLAPSE":
      case "NEAR MISS":
      case "ONE-TICK":
        return ROASTS[cause];
      default: {
        const _never = cause;
        throw new Error("Unknown cause " + _never);
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

  function leadFor(salt) {
    if (salt <= 0) return "";
    return LEADS[Math.abs(salt) % LEADS.length];
  }

  function positionNames(cause, legs) {
    const names = [];
    const n = legs.length;
    switch (cause) {
      case "LAST LEG":
        if (legs[n - 1].killer) names.push(legs[n - 1].name);
        break;
      case "MIDDLE BLEED":
        for (let i = 1; i < n - 1; i += 1) {
          if (legs[i].killer) names.push(legs[i].name);
        }
        break;
      case "NEAR MISS":
        if (legs[0].killer) names.push(legs[0].name);
        break;
      case "ONE-TICK":
        for (let i = 0; i < n; i += 1) {
          if (legs[i].killer) names.push(legs[i].name);
        }
        break;
      case "TOTAL COLLAPSE":
        break;
      default: {
        const _never = cause;
        throw new Error("Unknown cause " + _never);
      }
    }
    return names;
  }

  function lineFits(entry, legs, cause) {
    const dead = deadCount(legs);
    switch (entry.fit) {
      case "single":
        return dead === 1;
      case "position":
        return positionNames(cause, legs).length > 0;
      case "multi":
        if (dead < 2) return false;
        if (entry.line.indexOf("{P}") !== -1 && positionNames(cause, legs).length === 0) return false;
        return true;
      default: {
        const _never = entry.fit;
        throw new Error("Unknown roast fit " + _never);
      }
    }
  }

  function fittingLines(cause, legs) {
    const pool = roastPool(cause);
    const fitting = [];
    for (let i = 0; i < pool.length; i += 1) {
      if (lineFits(pool[i], legs, cause)) fitting.push(pool[i]);
    }
    return fitting;
  }

  function roastLine(cause, salt, hash, legs) {
    const pool = fittingLines(cause, legs);
    if (!pool.length) throw new Error("Empty roast pool for " + cause);
    const index = (mixHash(hash) + Math.abs(salt)) % pool.length;
    return pool[index];
  }

  function roastFits(cause) {
    return roastPool(cause).map(function (entry) { return entry.fit; });
  }

  function tagFor(cause, hash) {
    switch (cause) {
      case "LAST LEG":
      case "MIDDLE BLEED":
      case "TOTAL COLLAPSE":
      case "NEAR MISS":
      case "ONE-TICK":
        return TAGS[cause][hash % TAGS[cause].length];
      default: {
        const _never = cause;
        throw new Error("Unknown cause " + _never);
      }
    }
  }

  function bandFor(cause) {
    switch (cause) {
      case "LAST LEG":
        return "last";
      case "MIDDLE BLEED":
        return "middle";
      case "TOTAL COLLAPSE":
        return "collapse";
      case "NEAR MISS":
        return "near";
      case "ONE-TICK":
        return "tick";
      default: {
        const _never = cause;
        throw new Error("Unknown cause " + _never);
      }
    }
  }

  function buildCall(legs, salt) {
    const cause = causeOf(legs);
    if (!cause) return null;
    const hash = fnv1a(slipKey(legs));
    const killers = killerClause(legs);
    const cashed = cashedClause(legs);
    const positional = joinNames(positionNames(cause, legs));
    const picked = roastLine(cause, salt, hash, legs);
    const roast = polish(
      leadFor(salt) + fill(picked.line, killers, cashed, legs.length, deadCount(legs), positional)
    );
    return {
      cause: cause,
      roast: roast,
      meter: meterFor(legs, hash),
      tag: tagFor(cause, hash),
      hash: hash,
    };
  }

  function callAutopsy(legs, salt) {
    const prepared = prepareSlip({ legs: legs, note: "" });
    if (!prepared.ok) return null;
    const cleanSalt = normalizeSalt(salt);
    const usedSalt = cleanSalt == null ? 0 : cleanSalt;
    return buildCall(prepared.legs, usedSalt);
  }

  function persistLegs(legs) {
    const out = [];
    for (let i = 0; i < legs.length; i += 1) {
      out.push({
        name: legs[i].name,
        odds: legs[i].odds,
        killer: legs[i].killer === true,
      });
    }
    return out;
  }

  function normalizeCard(raw, fromShare) {
    if (!raw || typeof raw !== "object") return null;
    const id = clampLine(raw.id, 40);
    if (!/^[A-Za-z0-9_-]{2,40}$/.test(id)) return null;
    const prepared = prepareSlip({
      legs: Array.isArray(raw.legs) ? raw.legs : raw.l,
      note: raw.note != null ? raw.note : raw.d,
    });
    if (!prepared.ok) return null;
    const salt = normalizeSalt(raw.salt != null ? raw.salt : raw.sa);
    if (salt == null) return null;
    const call = buildCall(prepared.legs, salt);
    if (!call) return null;
    const starred = fromShare ? false : (raw.starred === true || raw.star === 1 || raw.star === true);
    return {
      id: id,
      legs: persistLegs(prepared.legs),
      note: prepared.note,
      salt: salt,
      cause: call.cause,
      meter: call.meter,
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
    if (storedCardFailed(parsed)) {
      return { corrupt: true, state: emptyState(), backup: String(raw) };
    }
    return { corrupt: false, state: normalizeState(parsed), backup: "" };
  }

  function storedCardFailed(parsed) {
    const list = Array.isArray(parsed.cards) ? parsed.cards : [];
    for (let i = 0; i < list.length; i += 1) {
      if (!normalizeCard(list[i])) return true;
    }
    return false;
  }

  function findIndex(cards, id) {
    return cards.findIndex(function (card) { return card.id === id; });
  }

  function cardKey(card) {
    const prepared = prepareSlip({ legs: card.legs, note: "" });
    if (!prepared.ok) return "";
    return slipKey(prepared.legs);
  }

  function findSlip(cards, legs) {
    const prepared = prepareSlip({ legs: legs, note: "" });
    if (!prepared.ok) return null;
    const key = slipKey(prepared.legs);
    return cards.find(function (card) { return cardKey(card) === key; }) || null;
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

  function autopsy(state, input, now) {
    const next = normalizeState(state);
    const prepared = prepareSlip(input);
    if (!prepared.ok) return { ok: false, reason: prepared.reason, index: prepared.index, state: next };
    const existing = findSlip(next.cards, prepared.legs);
    if (existing) {
      let card = existing;
      if (prepared.note !== existing.note) {
        card = {
          id: existing.id,
          legs: existing.legs,
          note: prepared.note,
          salt: existing.salt,
          cause: existing.cause,
          meter: existing.meter,
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
    if (!room) return { ok: false, reason: "cap", index: 0, state: next };
    const when = stampOf(now) || Date.now();
    const call = buildCall(prepared.legs, 0);
    if (!call) return { ok: false, reason: "killer", index: 0, state: next };
    const card = normalizeCard({
      id: uid(when),
      legs: persistLegs(prepared.legs),
      note: prepared.note,
      salt: 0,
      cause: call.cause,
      meter: call.meter,
      roast: call.roast,
      tag: call.tag,
      starred: false,
      created: when,
      updated: when,
    });
    if (!card) return { ok: false, reason: "missing", index: 0, state: next };
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

  function reautopsy(state, id, now) {
    const peek = normalizeState(state);
    const current = peek.cards.find(function (card) { return card.id === id; });
    if (!current) return { ok: false, reason: "missing", state: peek };
    if (current.salt >= SALT_MAX) return { ok: false, reason: "salt", state: peek };
    return replaceCard(state, id, function (card) {
      const salt = card.salt + 1;
      const prepared = prepareSlip({ legs: card.legs, note: card.note });
      if (!prepared.ok) return null;
      const call = buildCall(prepared.legs, salt);
      if (!call) return null;
      return {
        id: card.id,
        legs: persistLegs(prepared.legs),
        note: card.note,
        salt: salt,
        cause: call.cause,
        meter: call.meter,
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
        legs: card.legs,
        note: card.note,
        salt: card.salt,
        cause: card.cause,
        meter: card.meter,
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
      legs: [
        { name: "Bills moneyline", odds: "-150", killer: false },
        { name: "Over 48.5", odds: "-110", killer: false },
        { name: "Mahomes anytime TD", odds: "+180", killer: true },
      ],
      note: "Sunday slate · group chat",
    };
  }

  function sampleCard() {
    const sit = sampleInput();
    const prepared = prepareSlip(sit);
    const call = buildCall(prepared.legs, 0);
    return normalizeCard({
      id: SAMPLE_ID,
      legs: persistLegs(prepared.legs),
      note: prepared.note,
      salt: 0,
      cause: call.cause,
      meter: call.meter,
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
    const pair = findSlip(next.cards, sit.legs);
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
    const legs = [];
    for (let i = 0; i < card.legs.length; i += 1) {
      legs.push({
        n: card.legs[i].name,
        o: card.legs[i].odds,
        k: card.legs[i].killer ? 1 : 0,
      });
    }
    return {
      id: card.id,
      sa: card.salt,
      cr: card.created,
      up: card.updated,
      d: card.note,
      l: legs,
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
      const key = cardKey(clean);
      if (findSlip(next.cards, clean.legs) || fresh.some(function (row) { return cardKey(row) === key; })) return;
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
        : (first ? findSlip(next.cards, first.legs || first.l) : null);
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
      fresh: packed.fresh.length,
    };
  }

  function keptLine(added, offered, fresh, dropped) {
    const already = offered - fresh;
    if (already > 0 && added === fresh) {
      return "Kept " + added + " new, " + already + " already here.";
    }
    if (added < offered) return "Kept " + added + " of " + offered + ".";
    if (dropped === 1) return "Kept. The oldest autopsy made room.";
    if (dropped > 1) return "Kept. Dropped your " + dropped + " oldest unstarred.";
    return "Kept on this phone.";
  }

  function face(card) {
    const clean = normalizeCard(card);
    if (!clean) return "";
    const prepared = prepareSlip({ legs: clean.legs, note: "" });
    if (!prepared.ok) return clean.cause;
    return clean.cause + " · " + killerClause(prepared.legs);
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

  root.ParlayAutopsy = {
    STORAGE_KEY: STORAGE_KEY,
    STORAGE_BACKUP_KEY: STORAGE_BACKUP_KEY,
    HISTORY_CAP: HISTORY_CAP,
    LEG_MIN: LEG_MIN,
    LEG_MAX: LEG_MAX,
    NAME_MAX: NAME_MAX,
    ODDS_MAX: ODDS_MAX,
    NOTE_MAX: NOTE_MAX,
    SAMPLE_ID: SAMPLE_ID,
    CAUSES: CAUSES,
    emptyState: emptyState,
    normalizeState: normalizeState,
    normalizeCard: normalizeCard,
    readStored: readStored,
    callAutopsy: callAutopsy,
    prepareSlip: prepareSlip,
    parseOdds: parseOdds,
    nameKey: nameKey,
    roastFits: roastFits,
    keptLine: keptLine,
    slipKey: slipKey,
    causeOf: causeOf,
    bandFor: bandFor,
    autopsy: autopsy,
    reautopsy: reautopsy,
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
