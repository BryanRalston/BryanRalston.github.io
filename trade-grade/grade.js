(function (root) {
  "use strict";

  const STORAGE_KEY = "trade-grade-v1";
  const STORAGE_BACKUP_KEY = "trade-grade-v1-corrupt";
  const HISTORY_CAP = 24;
  const GIVE_MAX = 80;
  const GET_MAX = 80;
  const NOTE_MAX = 80;
  const ROAST_MAX = 240;
  const SALT_MAX = 9999;
  const SAMPLE_ID = "sample-chase-dart";
  const SAMPLE_AT = 1759017600000;
  const LETTERS = ["A+", "A", "B+", "C", "C-", "D-", "F"];
  const CENTER = 3;

  const WORD_HEAT = {
    elite: 3,
    elites: 3,
    alpha: 3,
    alphas: 3,
    stud: 3,
    studs: 3,
    wr1: 3,
    rb1: 3,
    qb1: 3,
    te1: 3,
    bellcow: 3,
    bellcows: 3,
    hammer: 3,
    hammers: 3,
    smash: 3,
    workhorse: 3,
    workhorses: 3,
    "1st": 4,
    first: 2,
    "2nd": 2,
    second: 1,
    pick: 1,
    picks: 1,
    qb: 1,
    rb: 1,
    wr: 1,
    te: 1,
    flex: -1,
    "3rd": -1,
    third: -1,
    bench: -2,
    benches: -2,
    backup: -2,
    backups: -2,
    ir: -2,
    injured: -2,
    injury: -2,
    wr2: -2,
    rb2: -2,
    wr3: -2,
    rb3: -2,
    qb2: -2,
    te2: -2,
    "4th": -2,
    "5th": -2,
    fourth: -2,
    fifth: -2,
    stash: -3,
    stashes: -3,
    handcuff: -3,
    handcuffs: -3,
    lottery: -3,
    lotto: -3,
    lottos: -3,
    dart: -3,
    darts: -3,
    flyer: -3,
    flyers: -3,
    flier: -3,
    fliers: -3,
    streamer: -4,
    streamers: -4,
    vibes: -3,
    handshake: -2,
    scrub: -2,
    scrubs: -2,
    filler: -2,
    fillers: -2,
    defense: -6,
    defenses: -6,
    dst: -6,
    def: -6,
    kicker: -8,
    kickers: -8,
    k: -8,
  };

  const TAGS = {
    "A+": ["FLEECE CARD", "GRAND LARCENY"],
    "A": ["HEIST NIGHT", "CLEAN STEAL"],
    "B+": ["SOLID COSTUME", "QUIET WIN"],
    "C": ["COIN JERSEY", "EVEN STEVEN"],
    "C-": ["THIN ICE", "SIDE EYE"],
    "D-": ["DO NOT SEND", "WINCE CARD"],
    "F": ["ROAST READY", "CATASTROPHE"],
  };

  const JOKE_TAGS = ["KEY SMASH", "NOT A ROSTER", "GARBAGE TIME"];

  const ROASTS = {
    "A+": [
      "{G} for {T}. The booth is filing this under grand larceny. Entertainment only.",
      "You gave {G} and came home with {T}. The other manager needs a moment.",
      "Fleece theater: {G} leaves, {T} arrives, and the group chat owes you a statue.",
      "You gave {G} and got {T}. This card is a victory lap, not a model.",
    ],
    "A": [
      "{G} out, {T} in. The booth clapped. It is still not advice.",
      "Winning the screenshot: you shipped {G} and pocketed {T}.",
      "You gave {G} and got {T}. Call it a heist with a waiver wire.",
      "The card says you cooked. {G} leaves, {T} stays. Not a ranking.",
    ],
    "B+": [
      "{G} for {T}. Respectable theater. The booth is only a little smug.",
      "You did fine giving {G} for {T}. Fine is not a projection.",
      "Solid costume: {G} walks, {T} starts the parade. Still a gag.",
      "You gave {G} and got {T}. Still a gag, not a ranking.",
    ],
    "C": [
      "{G} for {T}. The booth calls this a coin in shoulder pads.",
      "You gave {G} and got {T}. The booth shrugged.",
      "Even theater. {G} out, {T} in. Bring snacks, not a spreadsheet.",
      "C for calm down. {G} and {T} shook hands. Not a model.",
    ],
    "C-": [
      "{G} for {T}. The booth smelled a side deal and still graded it for fun.",
      "You gave {G} and accepted {T}. The explanation will be the tell.",
      "Thin ice. {G} out, {T} in. Not advice.",
      "You gave {G} for {T}. The group chat is already squinting.",
    ],
    "D-": [
      "You shipped {G} for {T}. The group chat is already typing.",
      "{G} walks. {T} shows up in a costume. The booth is wincing.",
      "This is how screenshot bait is born. {G} for {T}.",
      "Do not send it. {G} out, {T} in. Not advice. A roast.",
    ],
    "F": [
      "{G} for {T}. The booth asked if this was a bit.",
      "Catastrophic theater: {G} leaves, {T} is the punchline.",
      "F as in friends will see this. {G} for {T}.",
      "You gave {G} and accepted {T}. The meter is laughing. Entertainment only.",
    ],
  };

  const JOKE_ROASTS = [
    "{G} for {T}. The booth heard a keyboard and filed a joke grade.",
    "You gave {G} and got {T}. Neither side is a roster. Keyboard grade.",
    "Random letters. {G} out, {T} in. The keyboard is the whole bit.",
    "The booth read {G} for {T} and stamped a joke. Entertainment only.",
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

  function pieceList(text) {
    const lower = String(text || "").toLowerCase();
    const parts = lower.split(/\s*(?:,|\+|&|\/|\band\b)\s*/);
    const seen = Object.create(null);
    const keys = [];
    for (let i = 0; i < parts.length; i += 1) {
      const key = parts[i].replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
      if (!key || seen[key]) continue;
      seen[key] = true;
      keys.push(key);
    }
    keys.sort();
    return keys;
  }

  function packageKey(text) {
    const pieces = pieceList(text);
    if (pieces.length) return pieces.join(" | ");
    return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function wordWeight(word) {
    if (!Object.prototype.hasOwnProperty.call(WORD_HEAT, word)) return null;
    return WORD_HEAT[word];
  }

  function heat(text) {
    const words = tokens(text);
    let nameish = 0;
    for (let i = 0; i < words.length; i += 1) {
      const word = words[i];
      if (wordWeight(word) != null) continue;
      if (word.length >= 4 && /[aeiou]/.test(word)) nameish += 1;
    }
    let score = 0;
    for (let i = 0; i < words.length; i += 1) {
      const word = words[i];
      if (word === "k" && nameish > 0) continue;
      const weight = wordWeight(word);
      if (weight != null) score += weight;
    }
    return score;
  }

  function countSignal(giveText, getText) {
    const diff = pieceList(giveText).length - pieceList(getText).length;
    let stepped = diff * 2;
    if (stepped > 8) stepped = 8;
    if (stepped < -8) stepped = -8;
    return stepped;
  }

  const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

  function isKeyboardMash(word) {
    if (word.length < 4) return false;
    for (let i = 0; i < KEY_ROWS.length; i += 1) {
      const row = KEY_ROWS[i];
      if (row.indexOf(word) !== -1) return true;
      let reversed = "";
      for (let j = row.length - 1; j >= 0; j -= 1) reversed += row.charAt(j);
      if (reversed.indexOf(word) !== -1) return true;
    }
    return false;
  }

  function isGibberish(word) {
    if (wordWeight(word) != null) return false;
    if (!/^[a-z]{4,}$/.test(word)) return false;
    if (isKeyboardMash(word)) return true;
    const vowels = (word.match(/[aeiou]/g) || []).length;
    if (vowels === 0) return true;
    if (word.length >= 5 && vowels * 5 < word.length) return true;
    if (/^(.)\1+$/.test(word)) return true;
    return false;
  }

  function isNonsense(text) {
    const words = tokens(text);
    const letters = [];
    for (let i = 0; i < words.length; i += 1) {
      if (/^[a-z]{4,}$/.test(words[i])) letters.push(words[i]);
    }
    if (!letters.length) return false;
    let junk = 0;
    for (let i = 0; i < letters.length; i += 1) {
      if (isGibberish(letters[i])) junk += 1;
    }
    return junk > 0 && junk * 2 >= letters.length;
  }

  function packageLean(giveText, getText) {
    let lean = heat(getText) - heat(giveText) + countSignal(giveText, getText);
    if (isNonsense(giveText) && !isNonsense(getText)) lean += 8;
    if (!isNonsense(giveText) && isNonsense(getText)) lean -= 8;
    if (lean > 12) lean = 12;
    if (lean < -12) lean = -12;
    return lean;
  }

  function indexFor(lean, hash) {
    const magnitude = Math.abs(lean);
    const span = magnitude >= 8 ? 0 : magnitude >= 5 ? 1 : magnitude >= 3 ? 2 : 3;
    const flavor = span === 0 ? 0 : (hash % (span * 2 + 1)) - span;
    let steps = Math.round(lean / 2) + flavor;
    if (steps > 3) steps = 3;
    if (steps < -3) steps = -3;
    let index = CENTER - steps;
    if (index < 0) index = 0;
    if (index > LETTERS.length - 1) index = LETTERS.length - 1;
    return index;
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

  function polish(line) {
    const text = clampLine(line, ROAST_MAX);
    if (!text) return text;
    const first = text.charAt(0);
    const upper = first.toUpperCase();
    if (first === upper) return text;
    return upper + text.slice(1);
  }

  function roastLine(letter, salt) {
    let base;
    switch (letter) {
      case "A+":
      case "A":
      case "B+":
      case "C":
      case "C-":
      case "D-":
      case "F":
        base = ROASTS[letter][Math.abs(salt) % ROASTS[letter].length];
        break;
      default: {
        const _never = letter;
        throw new Error("Unknown letter " + _never);
      }
    }
    return salt > 0 ? "Another pass. " + base : base;
  }

  function jokeLine(salt) {
    const base = JOKE_ROASTS[Math.abs(salt) % JOKE_ROASTS.length];
    return salt > 0 ? "Another pass. " + base : base;
  }

  function tagFor(letter, saltHash) {
    switch (letter) {
      case "A+":
      case "A":
      case "B+":
      case "C":
      case "C-":
      case "D-":
      case "F":
        return TAGS[letter][saltHash % TAGS[letter].length];
      default: {
        const _never = letter;
        throw new Error("Unknown letter " + _never);
      }
    }
  }

  function meterFor(index, hash) {
    const extreme = Math.abs(index - CENTER);
    let confidence = 50 + extreme * 12 + (hash % 13);
    if (confidence > 96) confidence = 96;
    return confidence;
  }

  function bandFor(letter) {
    switch (letter) {
      case "A+":
      case "A":
        return "a";
      case "B+":
        return "b";
      case "C":
      case "C-":
        return "c";
      case "D-":
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
    const giveKey = packageKey(give);
    const getKey = packageKey(get);
    const giveFirst = giveKey <= getKey;
    const orderedFirst = giveFirst ? giveKey : getKey;
    const orderedSecond = giveFirst ? getKey : giveKey;
    const pairHash = fnv1a(orderedFirst + "\n" + orderedSecond);
    const saltHash = fnv1a(orderedFirst + "\n" + orderedSecond + "\n" + String(usedSalt));
    if (isNonsense(give) && isNonsense(get)) {
      return {
        letter: "C",
        roast: polish(fill(jokeLine(usedSalt), give, get)),
        confidence: 41 + (saltHash % 23),
        tag: JOKE_TAGS[pairHash % JOKE_TAGS.length],
        lean: 0,
        hash: saltHash,
      };
    }
    const firstText = giveFirst ? give : get;
    const secondText = giveFirst ? get : give;
    const lean = packageLean(firstText, secondText);
    let index = indexFor(lean, pairHash);
    if (!giveFirst) index = LETTERS.length - 1 - index;
    const letter = LETTERS[index];
    return {
      letter: letter,
      roast: polish(fill(roastLine(letter, usedSalt), give, get)),
      confidence: meterFor(index, saltHash),
      tag: tagFor(letter, pairHash),
      lean: giveFirst ? lean : -lean,
      hash: saltHash,
    };
  }

  function normalizeCard(raw, fromShare) {
    if (!raw || typeof raw !== "object") return null;
    const id = clampLine(raw.id, 40);
    if (!/^[A-Za-z0-9_-]{2,40}$/.test(id)) return null;
    const give = clampLine(raw.give != null ? raw.give : raw.g, GIVE_MAX);
    const get = clampLine(raw.get != null ? raw.get : raw.t, GET_MAX);
    const note = clampLine(raw.note != null ? raw.note : raw.n, NOTE_MAX);
    if (!give || !get) return null;
    if (packageKey(give) === packageKey(get)) return null;
    const salt = normalizeSalt(raw.salt != null ? raw.salt : raw.sa);
    if (salt == null) return null;
    const call = callBooth(give, get, salt);
    const starred = fromShare ? false : (raw.starred === true || raw.star === 1 || raw.star === true);
    return {
      id: id,
      give: give,
      get: get,
      note: note,
      salt: salt,
      letter: call.letter,
      confidence: call.confidence,
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

  function findPair(cards, give, get) {
    const left = packageKey(give);
    const right = packageKey(get);
    return cards.find(function (card) {
      return packageKey(card.give) === left && packageKey(card.get) === right;
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
    if (packageKey(give) === packageKey(get)) return "same";
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
      return {
        id: card.id,
        give: card.give,
        get: card.get,
        note: card.note,
        salt: salt,
        letter: call.letter,
        confidence: call.confidence,
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
      const keyGive = packageKey(clean.give);
      const keyGet = packageKey(clean.get);
      if (findPair(next.cards, clean.give, clean.get) || fresh.some(function (row) {
        return packageKey(row.give) === keyGive && packageKey(row.get) === keyGet;
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
        : (first ? findPair(next.cards, first.give || first.g, first.get || first.t) : null);
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
    STORAGE_BACKUP_KEY: STORAGE_BACKUP_KEY,
    HISTORY_CAP: HISTORY_CAP,
    GIVE_MAX: GIVE_MAX,
    GET_MAX: GET_MAX,
    NOTE_MAX: NOTE_MAX,
    SAMPLE_ID: SAMPLE_ID,
    LETTERS: LETTERS,
    emptyState: emptyState,
    normalizeState: normalizeState,
    normalizeCard: normalizeCard,
    readStored: readStored,
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
    previewKeep: previewKeep,
    keepShare: keepShare,
    face: face,
    compressPayload: compressPayload,
    decompressPayload: decompressPayload,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
