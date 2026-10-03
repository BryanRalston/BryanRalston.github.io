(function (root) {
  "use strict";

  const STORAGE_KEY = "lock-panic-v1";
  const STORAGE_BACKUP_KEY = "lock-panic-v1-corrupt";
  const HISTORY_CAP = 24;
  const STARTER_MAX = 80;
  const BACKUP_MAX = 80;
  const MINUTES_MAX = 40;
  const NOTE_MAX = 80;
  const ROAST_MAX = 240;
  const SALT_MAX = 9999;
  const SAMPLE_ID = "sample-chase-lock";
  const SAMPLE_AT = 1790985600000;
  const STAMPS = ["HOLD", "LEAN HOLD", "COIN FLIP", "LEAN SWAP", "PANIC"];

  const TAGS = {
    HOLD: ["LOCK IT", "STAY PUT"],
    "LEAN HOLD": ["NERVOUS HOLD", "SWEATY START"],
    "COIN FLIP": ["TOSS-UP", "SPLIT DECISION"],
    "LEAN SWAP": ["SWAP ITCH", "BACKUP LEAN"],
    PANIC: ["FULL PANIC", "LOCK FREAKOUT"],
  };

  const ROASTS = {
    HOLD: {
      named: [
        "Hold {S}. {U} can stay seated. The lock is theater.",
        "{S} keeps the spot. {U} is the name you almost typed over.",
        "Stay with {S}. The booth is not handing the ball to {U}.",
        "Hold. {S} is still your starter, and {U} is still a maybe.",
        "The clock is loud and the card says hold {S}. {U} waits.",
        "Unclench. {S} stays, and {U} does not get the call.",
        "{S} holds. {U} is the backup, not the plot.",
        "Lock it. {S} over {U}. The costume is a hold.",
      ],
      solo: [
        "Hold {S}. The spot is not up for a vote.",
        "{S} keeps it. Everyone can sit down.",
        "Stay with {S}. The clock is just noise.",
        "Unclench. {S} is your starter.",
        "Hold. {S} has the lineup.",
        "{S} stays. That is the card.",
        "No backup named. {S} holds anyway.",
        "Lock it on {S}. You did not name a backup.",
      ],
    },
    "LEAN HOLD": {
      named: [
        "Lean hold on {S}. {U} is the itch, not the pick.",
        "{S} stays, barely. {U} is why your thumb is hovering.",
        "Nervous hold. {S} keeps it, and {U} stays in the group chat.",
        "You are leaning hold with {S}. {U} is the other tab.",
        "{S} survives the stare-down with {U}. Lean hold.",
        "Sweaty start. {S} is still in. {U} is still loud.",
        "Lean hold. {S} gets the spot. {U} gets the screenshot.",
        "{S} over {U}, with the booth holding its breath.",
      ],
      solo: [
        "Lean hold on {S}. Your thumb can hover.",
        "Nervous hold. {S} stays.",
        "{S} survives the stare-down.",
        "Sweaty start. {S} is still in.",
        "Lean hold. {S} keeps the spot.",
        "Barely. {S} stays.",
        "No backup named, and {S} still leans hold.",
        "{S} is the lean hold. You did not name a backup.",
      ],
    },
    "COIN FLIP": {
      named: [
        "Coin flip. {S} or {U}, and the lock does not care which way you flinch.",
        "{S} versus {U}. The booth calls it a coin flip.",
        "Toss-up. {S} and {U} are the same panic in two fonts.",
        "Flip it. {S} on one side, {U} on the other.",
        "The card will not pick. {S} and {U} are a coin flip.",
        "Coin flip between {S} and {U}. Your thumb is the referee.",
        "{S} or {U}. The stamp is a coin flip, not a ranking.",
        "Split decision. {S} and {U} walked into the same lock.",
      ],
      solo: [
        "Coin flip on {S}. The lock will not pick for you.",
        "Toss-up. {S} versus the clock.",
        "{S} is the whole argument.",
        "Split decision, one name. {S}.",
        "Flip a coin. {S} is all you gave it.",
        "The stamp is a coin flip and {S} is the name.",
        "No backup named. {S} is a coin flip anyway.",
        "You did not name a backup. {S} versus the void.",
      ],
    },
    "LEAN SWAP": {
      named: [
        "Lean swap. {U} is the lean, and {S} is the doubt.",
        "The booth is side-eyeing {S}. {U} is the lean.",
        "Lean swap toward {U}. {S} can feel the hook.",
        "{U} is the name your thumb wants. {S} is still in the lineup, for now.",
        "Swap itch. {S} is the start, and {U} is the lean.",
        "Lean swap. {U} over the worry that is {S}.",
        "{S} is questionable. {U} is the lean. The lock is close.",
        "The card leans {U}. {S} is why you opened the app.",
      ],
      solo: [
        "Lean swap. {S} is the doubt.",
        "The group chat wants off {S}.",
        "Swap itch on {S}.",
        "{S} is the questionable start.",
        "The card leans away from {S}.",
        "You are leaning off {S}.",
        "No backup named. The lean off {S} has nowhere to go.",
        "You did not name a backup, so {S} just sits there.",
      ],
    },
    PANIC: {
      named: [
        "Panic. {S} is the questionable start and {U} is the exit.",
        "Full freakout. {S} in, {U} screaming from the bench.",
        "Panic stamp. {S} versus the clock, with {U} as the alibi.",
        "{S} has you pacing. {U} is the panic button.",
        "Lock freakout. {S} stays typed, and {U} stays tempting.",
        "Panic. The lineup wants {U} and you still have {S}.",
        "{S} is the name you cannot defend. {U} is the panic.",
        "The booth lost it. {S} or {U}, and the stamp says panic.",
      ],
      solo: [
        "Panic on {S}. The group chat is pacing.",
        "Full panic. {S} versus the clock.",
        "Lock freakout on {S}.",
        "{S} has everybody screaming.",
        "The stamp says panic. {S}.",
        "Full freakout on {S}.",
        "No backup named. {S} is the whole panic.",
        "You did not name a backup, and {S} still says panic.",
      ],
    },
  };

  const LEADS = [
    "The booth goes again. ",
    "Same stamp, new mouth. ",
    "Take two. ",
    "Run it back. ",
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
    return ("k" + stamp + rand).slice(0, 40);
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
    const stripped = String(text || "")
      .normalize("NFD")
      .replace(/\p{M}+/gu, "")
      .toLowerCase()
      .replace(/['’`]/g, "")
      .replace(/\./g, "");
    const words = stripped.split(/[^\p{L}\p{N}\p{Extended_Pictographic}]+/u).filter(Boolean);
    const folded = [];
    let initials = "";
    for (let i = 0; i < words.length; i += 1) {
      const word = words[i];
      if (word.length === 1 && /^\p{L}$/u.test(word)) {
        initials += word;
        continue;
      }
      if (initials) {
        folded.push(initials);
        initials = "";
      }
      folded.push(word);
    }
    if (initials) folded.push(initials);
    if (!folded.length) return stripped.trim();
    folded.sort();
    return folded.join(" ");
  }

  function pairKey(starter, backup) {
    return nameKey(starter) + "\n" + nameKey(backup);
  }

  function pairSeed(starter, backup) {
    const left = nameKey(starter);
    const right = nameKey(backup);
    if (!right) return { key: left + "\n", flip: false };
    if (left <= right) return { key: left + "\n" + right, flip: false };
    return { key: right + "\n" + left, flip: true };
  }

  function mirrorStamp(stamp) {
    switch (stamp) {
      case "HOLD":
        return "PANIC";
      case "LEAN HOLD":
        return "LEAN SWAP";
      case "COIN FLIP":
        return "COIN FLIP";
      case "LEAN SWAP":
        return "LEAN HOLD";
      case "PANIC":
        return "HOLD";
      default: {
        const _never = stamp;
        throw new Error("Unknown stamp " + _never);
      }
    }
  }

  function clockLabel(minutes) {
    const text = clampLine(minutes, MINUTES_MAX);
    if (!text) return "";
    if (/^\d{1,4}$/.test(text)) {
      const n = parseInt(text, 10);
      if (n === 0) return "Locked";
      if (n === 1) return "1 min to lock";
      return n + " min to lock";
    }
    return text;
  }

  function stampFor(hash, backup, flip) {
    let index = hash % STAMPS.length;
    if (!backup && index >= 3) index -= 2;
    const stamp = STAMPS[index];
    if (flip && backup) return mirrorStamp(stamp);
    return stamp;
  }

  function minutesProblem(text) {
    const value = clampLine(text, MINUTES_MAX);
    if (!value) return "";
    if (!/^\d{1,3}$/.test(value)) return "minutes";
    if (parseInt(value, 10) > 240) return "minutes";
    return "";
  }

  function meterFor(stamp, hash) {
    const wobble = hash % 7;
    let base;
    switch (stamp) {
      case "HOLD":
        base = 14;
        break;
      case "LEAN HOLD":
        base = 32;
        break;
      case "COIN FLIP":
        base = 50;
        break;
      case "LEAN SWAP":
        base = 68;
        break;
      case "PANIC":
        base = 86;
        break;
      default: {
        const _never = stamp;
        throw new Error("Unknown stamp " + _never);
      }
    }
    return base + wobble;
  }

  function fill(line, starter, backup) {
    let out = "";
    for (let i = 0; i < line.length; i += 1) {
      const token = line.slice(i, i + 3);
      if (token === "{S}") {
        out += starter;
        i += 2;
        continue;
      }
      if (token === "{U}") {
        out += backup;
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

  function roastPool(stamp, named) {
    let entry;
    switch (stamp) {
      case "HOLD":
      case "LEAN HOLD":
      case "COIN FLIP":
      case "LEAN SWAP":
      case "PANIC":
        entry = ROASTS[stamp];
        break;
      default: {
        const _never = stamp;
        throw new Error("Unknown stamp " + _never);
      }
    }
    return named ? entry.named : entry.solo;
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

  function leadFor(salt, line) {
    if (salt <= 0) return "";
    if (/^(?:panic|full panic|full freakout|lock freakout|freakout)\b/i.test(line)) return "";
    return LEADS[Math.abs(salt) % LEADS.length];
  }

  function roastLine(stamp, salt, hash, named) {
    const pool = roastPool(stamp, named);
    if (!pool.length) throw new Error("Empty roast pool for " + stamp);
    const index = (mixHash(hash) + Math.abs(salt)) % pool.length;
    const line = pool[index];
    return leadFor(salt, line) + line;
  }

  function tagFor(stamp, hash) {
    switch (stamp) {
      case "HOLD":
      case "LEAN HOLD":
      case "COIN FLIP":
      case "LEAN SWAP":
      case "PANIC":
        return TAGS[stamp][hash % TAGS[stamp].length];
      default: {
        const _never = stamp;
        throw new Error("Unknown stamp " + _never);
      }
    }
  }

  function bandFor(stamp) {
    switch (stamp) {
      case "HOLD":
        return "hold";
      case "LEAN HOLD":
        return "lean";
      case "COIN FLIP":
        return "flip";
      case "LEAN SWAP":
        return "swap";
      case "PANIC":
        return "panic";
      default: {
        const _never = stamp;
        throw new Error("Unknown stamp " + _never);
      }
    }
  }

  function callPanic(starterRaw, backupRaw, salt) {
    const starter = clampLine(starterRaw, STARTER_MAX);
    const backup = clampLine(backupRaw, BACKUP_MAX);
    if (!starter) return null;
    if (backup && nameKey(starter) === nameKey(backup)) return null;
    const cleanSalt = normalizeSalt(salt);
    const usedSalt = cleanSalt == null ? 0 : cleanSalt;
    const seed = pairSeed(starter, backup);
    const hash = fnv1a(seed.key);
    const stamp = stampFor(hash, backup, seed.flip);
    const roast = polish(fill(roastLine(stamp, usedSalt, hash, !!backup), starter, backup));
    return {
      stamp: stamp,
      roast: roast,
      meter: meterFor(stamp, hash),
      tag: tagFor(stamp, hash),
      hash: hash,
    };
  }

  function readSit(input) {
    const source = input && typeof input === "object" ? input : {};
    return {
      starter: clampLine(source.starter != null ? source.starter : source.s, STARTER_MAX),
      backup: clampLine(source.backup != null ? source.backup : source.b, BACKUP_MAX),
      minutes: clampLine(source.minutes != null ? source.minutes : source.m, MINUTES_MAX),
      note: clampLine(source.note != null ? source.note : source.n, NOTE_MAX),
    };
  }

  function rejectSit(sit) {
    if (!sit.starter && !sit.backup && !sit.minutes && !sit.note) return "blank";
    if (!sit.starter) return "starter";
    if (minutesProblem(sit.minutes)) return "minutes";
    if (sit.backup && nameKey(sit.starter) === nameKey(sit.backup)) return "same";
    return "";
  }

  function normalizeCard(raw, fromShare) {
    if (!raw || typeof raw !== "object") return null;
    const id = clampLine(raw.id, 40);
    if (!/^[A-Za-z0-9_-]{2,40}$/.test(id)) return null;
    const sit = readSit(raw);
    if (!sit.starter) return null;
    const salt = normalizeSalt(raw.salt != null ? raw.salt : raw.sa);
    if (salt == null) return null;
    const call = callPanic(sit.starter, sit.backup, salt);
    if (!call) return null;
    const starred = fromShare ? false : (raw.starred === true || raw.star === 1 || raw.star === true);
    return {
      id: id,
      starter: sit.starter,
      backup: sit.backup,
      minutes: sit.minutes,
      note: sit.note,
      salt: salt,
      stamp: call.stamp,
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
    if (raw == null || raw === "") return { corrupt: false, state: null, backup: "", dropped: 0 };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return { corrupt: true, state: emptyState(), backup: String(raw), dropped: 0 };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { corrupt: true, state: emptyState(), backup: String(raw), dropped: 0 };
    }
    if (Object.prototype.hasOwnProperty.call(parsed, "cards") && !Array.isArray(parsed.cards)) {
      return { corrupt: true, state: emptyState(), backup: String(raw), dropped: 0 };
    }
    const list = Array.isArray(parsed.cards) ? parsed.cards : [];
    const bad = [];
    const good = [];
    for (let i = 0; i < list.length; i += 1) {
      if (normalizeCard(list[i])) good.push(list[i]);
      else bad.push(list[i]);
    }
    const state = normalizeState({
      v: parsed.v,
      filter: parsed.filter,
      cards: good,
      openId: parsed.openId,
    });
    if (!bad.length) return { corrupt: false, state: state, backup: "", dropped: 0 };
    return { corrupt: true, state: state, backup: JSON.stringify(bad), dropped: bad.length };
  }

  function findIndex(cards, id) {
    return cards.findIndex(function (card) { return card.id === id; });
  }

  function findPair(cards, starter, backup) {
    const key = pairKey(starter, backup);
    return cards.find(function (card) { return pairKey(card.starter, card.backup) === key; }) || null;
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
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (canDrop(list[i], protectId)) return i;
    }
    return -1;
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

  function panic(state, input, now) {
    const next = normalizeState(state);
    const sit = readSit(input);
    const reason = rejectSit(sit);
    if (reason) return { ok: false, reason: reason, state: next };
    const existing = findPair(next.cards, sit.starter, sit.backup);
    if (existing) {
      const card = {
        id: existing.id,
        starter: existing.starter,
        backup: existing.backup,
        minutes: sit.minutes,
        note: sit.note,
        salt: existing.salt,
        stamp: existing.stamp,
        meter: existing.meter,
        roast: existing.roast,
        tag: existing.tag,
        starred: existing.starred,
        created: existing.created,
        updated: stampOf(now) || Date.now(),
      };
      liftCard(next, card);
      return { ok: true, state: next, card: card, already: true, dropped: [] };
    }
    const room = makeRoom(next.cards, 1, "");
    if (!room) return { ok: false, reason: "cap", state: next };
    const when = stampOf(now) || Date.now();
    const call = callPanic(sit.starter, sit.backup, 0);
    if (!call) return { ok: false, reason: "starter", state: next };
    const card = normalizeCard({
      id: uid(when),
      starter: sit.starter,
      backup: sit.backup,
      minutes: sit.minutes,
      note: sit.note,
      salt: 0,
      stamp: call.stamp,
      meter: call.meter,
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

  function repanic(state, id, now) {
    const peek = normalizeState(state);
    const current = peek.cards.find(function (card) { return card.id === id; });
    if (!current) return { ok: false, reason: "missing", state: peek };
    if (current.salt >= SALT_MAX) return { ok: false, reason: "salt", state: peek };
    return replaceCard(state, id, function (card) {
      const salt = card.salt + 1;
      const call = callPanic(card.starter, card.backup, salt);
      if (!call) return null;
      return {
        id: card.id,
        starter: card.starter,
        backup: card.backup,
        minutes: card.minutes,
        note: card.note,
        salt: salt,
        stamp: call.stamp,
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
        starter: card.starter,
        backup: card.backup,
        minutes: card.minutes,
        note: card.note,
        salt: card.salt,
        stamp: card.stamp,
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
      starter: "Ja'Marr Chase",
      backup: "A committee receiver",
      minutes: "12",
      note: "Sunday lock · work league",
    };
  }

  function sampleCard() {
    const sit = sampleInput();
    const call = callPanic(sit.starter, sit.backup, 0);
    return normalizeCard({
      id: SAMPLE_ID,
      starter: sit.starter,
      backup: sit.backup,
      minutes: sit.minutes,
      note: sit.note,
      salt: 0,
      stamp: call.stamp,
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
    const touched = stampOf(Date.now());
    const pair = findPair(next.cards, sit.starter, sit.backup);
    if (pair) {
      pair.updated = touched;
      liftCard(next, pair);
      return { ok: true, state: next, already: true, card: pair, dropped: [] };
    }
    const byId = next.cards.find(function (card) { return card.id === SAMPLE_ID; });
    if (byId) {
      byId.updated = touched;
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
      cr: card.created,
      up: card.updated,
      s: card.starter,
      b: card.backup,
      m: card.minutes,
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
      const key = pairKey(clean.starter, clean.backup);
      if (findPair(next.cards, clean.starter, clean.backup) || fresh.some(function (row) {
        return pairKey(row.starter, row.backup) === key;
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
        : (first ? findPair(next.cards, first.starter || first.s, first.backup || first.b) : null);
      return { ok: false, reason: "exists", state: next, card: existing || null };
    }
    const plan = planKeep(next.cards, packed.fresh.length);
    if (!plan.adds) return { ok: false, reason: "cap", state: next };
    const batch = packed.fresh.slice(0, plan.adds);
    const touched = stampOf(Date.now());
    for (let i = 0; i < batch.length; i += 1) batch[i].updated = touched;
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
    if (dropped === 1) return "Kept. The oldest panic made room.";
    if (dropped > 1) return "Kept. Dropped your " + dropped + " oldest unstarred.";
    return "Kept on this phone.";
  }

  function face(card) {
    const clean = normalizeCard(card);
    if (!clean) return "";
    const clock = clockLabel(clean.minutes);
    let line = clean.stamp + " · " + clean.starter;
    if (clean.backup) line += " · " + clean.backup;
    if (clock) line += " · " + clock;
    return line;
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

  root.LockPanic = {
    STORAGE_KEY: STORAGE_KEY,
    STORAGE_BACKUP_KEY: STORAGE_BACKUP_KEY,
    HISTORY_CAP: HISTORY_CAP,
    STARTER_MAX: STARTER_MAX,
    BACKUP_MAX: BACKUP_MAX,
    MINUTES_MAX: MINUTES_MAX,
    NOTE_MAX: NOTE_MAX,
    SAMPLE_ID: SAMPLE_ID,
    STAMPS: STAMPS,
    emptyState: emptyState,
    normalizeState: normalizeState,
    normalizeCard: normalizeCard,
    readStored: readStored,
    callPanic: callPanic,
    clockLabel: clockLabel,
    nameKey: nameKey,
    bandFor: bandFor,
    keptLine: keptLine,
    panic: panic,
    repanic: repanic,
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
