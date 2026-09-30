(function (root) {
  "use strict";

  const STORAGE_KEY = "trade-grade-v1";
  const HISTORY_CAP = 24;
  const GIVE_MAX = 80;
  const GET_MAX = 80;
  const NOTE_MAX = 80;
  const ROAST_MAX = 240;
  const TAG_MAX = 24;
  const SALT_MAX = 9999;
  const SAMPLE_ID = "sample-chase-dart";
  const SAMPLE_AT = 1759017600000;
  const LETTERS = ["A+", "A", "B+", "B", "C+", "C", "D", "F"];

  const GOOD = ["elite", "alpha", "stud", "wr1", "rb1", "qb1", "te1", "bellcow", "hammer", "smash", "workhorse"];
  const BAD = ["dart", "darts", "stash", "handcuff", "lottery", "lotto", "kicker", "kickers", "defense", "dst", "streamer", "vibes", "handshake", "flyer"];

  const ROASTS = {
    "A+": [
      "{G} for {T}. The booth is filing this under grand larceny. Entertainment only.",
      "You gave {G} and came home with {T}. The other manager needs a moment.",
      "Fleece theater: {T} arrives, {G} leaves, and the group chat owes you a statue.",
      "{T} over {G}. This card is a victory lap, not a model.",
    ],
    "A": [
      "{G} out, {T} in. The booth clapped. It is still not advice.",
      "Winning the screenshot: you shipped {G} and pocketed {T}.",
      "{T} for {G}. Call it a heist with a waiver wire.",
      "The card says you cooked. {G} leaves, {T} stays. Not a ranking.",
    ],
    "B+": [
      "{G} for {T}. Respectable theater. The booth is only a little smug.",
      "You did fine. {T} over {G}. Fine is not a projection.",
      "Solid costume: {G} walks, {T} starts the parade. Still a gag.",
      "{T} looks like the better jersey. {G} can live in the group chat.",
    ],
    "B": [
      "{G} for {T}. Even. The booth refuses to be impressed.",
      "Fair on paper, loud in the chat. {G} out, {T} in.",
      "Nobody got robbed. {T} for {G}. That is the whole roast.",
      "A polite trade. {G} and {T} shook hands and the meter is a prop.",
    ],
    "C+": [
      "{G} for {T}. Coin-flip energy with shoulder pads.",
      "The booth shrugged. {G} leaves, {T} arrives, nobody learned anything.",
      "Could go either way, which means the group chat will not. {G} for {T}.",
      "Middle of the card. {T} over {G}. Bring snacks, not a spreadsheet.",
    ],
    "C": [
      "{G} for {T}. The booth smelled a side deal and still graded it for fun.",
      "You can explain {T} for {G}. The explanation is the tell.",
      "Lateral move, vertical feelings. {G} out, {T} in.",
      "C for calm down. {G} and {T} are not a model.",
    ],
    "D": [
      "You shipped {G} for {T}. The group chat is already typing.",
      "{G} walks. {T} shows up in a costume. The booth is wincing.",
      "This is how screenshot bait is born. {G} for {T}.",
      "D for do not send it. {G} out, {T} in. Not advice. A roast.",
    ],
    "F": [
      "{G} for {T}. The booth asked if this was a bit.",
      "Catastrophic theater: {G} leaves, {T} is the punchline.",
      "F as in friends will see this. {G} for {T}.",
      "You gave {G} and accepted {T}. The meter is laughing. Entertainment only.",
    ],
  };

  const REMATCH = {
    "A+": [
      "Re-grade, same heist. {G} for {T}. Still not a second opinion.",
      "Fresh stamp on a fleece. {T} over {G}. The booth did not hire an analyst.",
      "Another pass, same grand larceny costume. {G} out, {T} in.",
      "The letter stayed. The roast got louder. {T} for {G}.",
    ],
    "A": [
      "Re-grade energy. {G} for {T}. The clap is the same, the line is new.",
      "Same win, new caption. {T} stays, {G} still walks.",
      "The booth rerolled the joke, not the letter. {G} out, {T} in.",
      "Still a heist. New roast. {T} for {G}. Not advice.",
    ],
    "B+": [
      "Re-grade: still respectable. {G} for {T}. The smugness changed outfits.",
      "Same fine trade, new sentence. {T} over {G}.",
      "The letter held. The booth found a different compliment. {G} out, {T} in.",
      "Fresh flavor on a solid card. {T} for {G}. Still a gag.",
    ],
    "B": [
      "Re-grade, still even. {G} for {T}. The booth remains unimpressed.",
      "New line, same handshake. {T} for {G}.",
      "The letter did not move. The roast did. {G} out, {T} in.",
      "Another polite take. {G} and {T}. The meter is still a prop.",
    ],
    "C+": [
      "Re-grade shrug. {G} for {T}. Coin-flip, new costume.",
      "Same middle, new mutter. {T} over {G}.",
      "The booth flipped the sentence, not the grade. {G} out, {T} in.",
      "Still a coin in shoulder pads. {G} for {T}.",
    ],
    "C": [
      "Re-grade, still a side deal. {G} for {T}. New way to say it.",
      "The letter stayed lateral. The roast did not. {T} for {G}.",
      "Another explanation, same tell. {G} out, {T} in.",
      "C again. Fresh wording. {G} and {T} are not a model.",
    ],
    "D": [
      "Re-grade, same wince. {G} for {T}. The group chat is still typing.",
      "New roast, same bad idea energy. {T} for {G}.",
      "The letter held at a wince. {G} out, {T} in.",
      "Do not send it, second take. {G} for {T}. Entertainment only.",
    ],
    "F": [
      "Re-grade asked again if this was a bit. {G} for {T}.",
      "Same punchline, new delivery. {T} for {G}.",
      "The F stayed. The roast found a sharper stick. {G} out, {T} in.",
      "Friends will still see this. New caption. {G} for {T}.",
    ],
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
    return ("c" + stamp + rand).slice(0, 40);
  }

  function fnv1a(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function tokens(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean);
  }

  function heat(text) {
    const words = tokens(text);
    let score = 0;
    for (let i = 0; i < words.length; i += 1) {
      if (GOOD.indexOf(words[i]) !== -1) score += 3;
      if (BAD.indexOf(words[i]) !== -1) score -= 3;
    }
    return score;
  }

  function fill(line, give, get) {
    let out = "";
    for (let i = 0; i < line.length; i += 1) {
      if (line.slice(i, i + 3) === "{G}") {
        out += give;
        i += 2;
        continue;
      }
      if (line.slice(i, i + 3) === "{T}") {
        out += get;
        i += 2;
        continue;
      }
      out += line.charAt(i);
    }
    return out;
  }

  function letterIndex(lean, pairHash) {
    const steps = Math.min(4, Math.floor(Math.abs(lean) / 2));
    const shift = lean < 0 ? -steps : steps;
    let index = 4 - shift;
    if (Math.abs(lean) < 3) index += (pairHash % 5) - 2;
    if (index < 0) index = 0;
    if (index > 7) index = 7;
    return index;
  }

  function tagFor(salt, lean) {
    if (salt > 0) return "RE-GRADE";
    if (lean >= 6) return "FLEECE CARD";
    if (lean <= -6) return "ROAST READY";
    if (Math.abs(lean) >= 3) return "PACKAGE HEAT";
    return "COIN JERSEY";
  }

  function poolFor(letter, salt) {
    const table = salt > 0 ? REMATCH : ROASTS;
    switch (letter) {
      case "A+":
      case "A":
      case "B+":
      case "B":
      case "C+":
      case "C":
      case "D":
      case "F":
        return table[letter];
      default: {
        const _never = letter;
        throw new Error("Unknown letter " + _never);
      }
    }
  }

  function bandFor(letter) {
    switch (letter) {
      case "A+":
      case "A":
        return "a";
      case "B+":
      case "B":
        return "b";
      case "C+":
      case "C":
        return "c";
      case "D":
        return "d";
      case "F":
        return "f";
      default: {
        const _never = letter;
        throw new Error("Unknown letter " + _never);
      }
    }
  }

  function callBooth(giveRaw, getRaw, salt) {
    const give = clampLine(giveRaw, GIVE_MAX);
    const get = clampLine(getRaw, GET_MAX);
    const cleanSalt = normalizeSalt(salt);
    const usedSalt = cleanSalt == null ? 0 : cleanSalt;
    const pairKey = give.toLowerCase() + "\n" + get.toLowerCase();
    const pairHash = fnv1a(pairKey);
    const saltHash = fnv1a(pairKey + "\n" + String(usedSalt));
    const lean = heat(get) - heat(give);
    const letter = LETTERS[letterIndex(lean, pairHash)];
    const pool = poolFor(letter, usedSalt);
    const roast = clampLine(fill(pool[saltHash % pool.length], give, get), ROAST_MAX);
    let confidence = 64 + Math.min(24, Math.abs(lean) * 4) + (saltHash % 5);
    if (confidence > 96) confidence = 96;
    return {
      letter: letter,
      roast: roast,
      confidence: confidence,
      tag: tagFor(usedSalt, lean),
      lean: lean,
      hash: saltHash,
    };
  }

  function alternateRoast(letter, salt, hash, give, get, previous) {
    const pool = poolFor(letter, salt);
    const start = hash % pool.length;
    for (let step = 0; step < pool.length; step += 1) {
      const line = clampLine(fill(pool[(start + step) % pool.length], give, get), ROAST_MAX);
      if (line !== previous) return line;
    }
    return previous;
  }

  function isLetter(value) {
    return LETTERS.indexOf(value) !== -1;
  }

  function callFieldsOk(letter, confidence, roast, tag) {
    return isLetter(letter)
      && Number.isInteger(confidence)
      && confidence >= 50
      && confidence <= 99
      && !!roast
      && !!tag;
  }

  function normalizeCard(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = clampLine(raw.id, 40);
    if (!/^[A-Za-z0-9_-]{2,40}$/.test(id)) return null;
    const give = clampLine(raw.give != null ? raw.give : raw.g, GIVE_MAX);
    const get = clampLine(raw.get != null ? raw.get : raw.t, GET_MAX);
    const note = clampLine(raw.note != null ? raw.note : raw.n, NOTE_MAX);
    if (!give || !get) return null;
    if (give.toLowerCase() === get.toLowerCase()) return null;
    const salt = normalizeSalt(raw.salt != null ? raw.salt : raw.sa);
    if (salt == null) return null;
    let letter = raw.letter || raw.lt;
    let confidence = Number(raw.confidence != null ? raw.confidence : raw.cf);
    let roast = clampLine(raw.roast != null ? raw.roast : raw.rs, ROAST_MAX);
    let tag = clampLine(raw.tag != null ? raw.tag : raw.tg, TAG_MAX);
    if (!callFieldsOk(letter, confidence, roast, tag)) {
      const call = callBooth(give, get, salt);
      letter = call.letter;
      confidence = call.confidence;
      roast = call.roast;
      tag = call.tag;
    }
    return {
      id: id,
      give: give,
      get: get,
      note: note,
      salt: salt,
      letter: letter,
      confidence: confidence,
      roast: roast,
      tag: tag,
      starred: raw.starred === true || raw.star === 1 || raw.star === true,
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
    if (!raw || typeof raw !== "object") return state;
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

  function findIndex(cards, id) {
    return cards.findIndex(function (card) { return card.id === id; });
  }

  function findPair(cards, give, get) {
    const left = give.toLowerCase();
    const right = get.toLowerCase();
    return cards.find(function (card) {
      return card.give.toLowerCase() === left && card.get.toLowerCase() === right;
    }) || null;
  }

  function liftCard(state, card) {
    const idx = findIndex(state.cards, card.id);
    if (idx > 0) {
      state.cards = [card].concat(state.cards.filter(function (_, index) { return index !== idx; }));
    }
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

  function readSides(input) {
    const source = input && typeof input === "object" ? input : {};
    return {
      give: clampLine(source.give, GIVE_MAX),
      get: clampLine(source.get, GET_MAX),
      note: clampLine(source.note, NOTE_MAX),
    };
  }

  function rejectSides(give, get) {
    if (!give && !get) return "blank";
    if (!give) return "give";
    if (!get) return "get";
    if (give.toLowerCase() === get.toLowerCase()) return "same";
    return "";
  }

  function grade(state, input, now) {
    const next = normalizeState(state);
    const sides = readSides(input);
    const reason = rejectSides(sides.give, sides.get);
    if (reason) return { ok: false, reason: reason, state: next };
    const existing = findPair(next.cards, sides.give, sides.get);
    if (existing) {
      liftCard(next, existing);
      return { ok: true, state: next, card: existing, already: true, dropped: [] };
    }
    const room = makeRoom(next.cards, 1, "");
    if (!room) return { ok: false, reason: "cap", state: next };
    const when = stampOf(now) || Date.now();
    const call = callBooth(sides.give, sides.get, 0);
    const card = normalizeCard({
      id: uid(when),
      give: sides.give,
      get: sides.get,
      note: sides.note,
      salt: 0,
      letter: call.letter,
      confidence: call.confidence,
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

  function regrade(state, id, now) {
    const peek = normalizeState(state);
    const current = peek.cards.find(function (card) { return card.id === id; });
    if (!current) return { ok: false, reason: "missing", state: peek };
    if (current.salt >= SALT_MAX) return { ok: false, reason: "salt", state: peek };
    return replaceCard(state, id, function (card) {
      const salt = card.salt + 1;
      const call = callBooth(card.give, card.get, salt);
      const roast = alternateRoast(call.letter, salt, call.hash, card.give, card.get, card.roast);
      return {
        id: card.id,
        give: card.give,
        get: card.get,
        note: card.note,
        salt: salt,
        letter: call.letter,
        confidence: call.confidence,
        roast: roast,
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
        give: card.give,
        get: card.get,
        note: card.note,
        salt: card.salt,
        letter: card.letter,
        confidence: card.confidence,
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
      give: "Ja'Marr Chase",
      get: "A flex dart and vibes",
      note: "Work league · 12 team",
    };
  }

  function sampleCard() {
    const sides = sampleInput();
    const call = callBooth(sides.give, sides.get, 0);
    return normalizeCard({
      id: SAMPLE_ID,
      give: sides.give,
      get: sides.get,
      note: sides.note,
      salt: 0,
      letter: call.letter,
      confidence: call.confidence,
      roast: call.roast,
      tag: call.tag,
      starred: false,
      created: SAMPLE_AT,
      updated: SAMPLE_AT,
    });
  }

  function loadSample(state) {
    const next = normalizeState(state);
    const sides = sampleInput();
    const pair = findPair(next.cards, sides.give, sides.get);
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
      lt: card.letter,
      cf: card.confidence,
      rs: card.roast,
      tg: card.tag,
      star: card.starred ? 1 : 0,
      cr: card.created,
      up: card.updated,
      g: card.give,
      t: card.get,
      n: card.note,
    };
  }

  function shareCard(card) {
    const clean = normalizeCard(card);
    if (!clean) return null;
    return { v: 1, k: "card", c: [slim(clean)] };
  }

  function shareVault(state) {
    const next = normalizeState(state);
    return {
      v: 1,
      k: "vault",
      c: next.cards.slice(0, HISTORY_CAP).map(slim),
    };
  }

  function parseShare(raw) {
    if (!raw || typeof raw !== "object" || raw.v !== 1 || !Array.isArray(raw.c)) return null;
    let kind = null;
    switch (raw.k) {
      case "card":
      case "vault":
        kind = raw.k;
        break;
      default:
        return null;
    }
    const limit = kind === "card" ? 1 : HISTORY_CAP;
    const cards = [];
    for (let i = 0; i < raw.c.length && cards.length < limit; i += 1) {
      const card = normalizeCard(raw.c[i]);
      if (card) cards.push(card);
    }
    if (!cards.length) return null;
    return { v: 1, k: kind, cards: cards };
  }

  function keepShare(state, share) {
    const next = normalizeState(state);
    if (!share || !Array.isArray(share.cards) || !share.cards.length) {
      return { ok: false, reason: "missing", state: next };
    }
    const haveId = Object.create(null);
    next.cards.forEach(function (card) { haveId[card.id] = true; });
    const fresh = [];
    share.cards.forEach(function (card) {
      const clean = normalizeCard(card);
      if (!clean || haveId[clean.id]) return;
      if (findPair(next.cards, clean.give, clean.get) || fresh.some(function (row) {
        return row.give.toLowerCase() === clean.give.toLowerCase() && row.get.toLowerCase() === clean.get.toLowerCase();
      })) return;
      haveId[clean.id] = true;
      clean.starred = false;
      fresh.push(clean);
    });
    if (!fresh.length) {
      const existing = findIndex(next.cards, share.cards[0].id) >= 0
        ? next.cards[findIndex(next.cards, share.cards[0].id)]
        : findPair(next.cards, share.cards[0].give, share.cards[0].get);
      return { ok: false, reason: "exists", state: next, card: existing || null };
    }
    const batch = fresh.slice(0, HISTORY_CAP);
    const room = makeRoom(next.cards, batch.length, next.openId);
    if (!room) return { ok: false, reason: "cap", state: next };
    next.cards = batch.concat(room.cards);
    next.openId = batch[0].id;
    return {
      ok: true,
      state: next,
      cards: batch,
      dropped: room.dropped,
    };
  }

  function face(card) {
    const clean = normalizeCard(card);
    if (!clean) return "";
    return clean.letter + " · " + clean.give + " ↔ " + clean.get;
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

  root.TradeGrade = {
    STORAGE_KEY: STORAGE_KEY,
    HISTORY_CAP: HISTORY_CAP,
    GIVE_MAX: GIVE_MAX,
    GET_MAX: GET_MAX,
    NOTE_MAX: NOTE_MAX,
    SAMPLE_ID: SAMPLE_ID,
    LETTERS: LETTERS,
    emptyState: emptyState,
    normalizeState: normalizeState,
    normalizeCard: normalizeCard,
    callBooth: callBooth,
    bandFor: bandFor,
    grade: grade,
    regrade: regrade,
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
    shareVault: shareVault,
    parseShare: parseShare,
    keepShare: keepShare,
    face: face,
    compressPayload: compressPayload,
    decompressPayload: decompressPayload,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
