(function (root) {
  const STORAGE_KEY = "start-sit-v1";
  const HISTORY_CAP = 24;
  const NAME_MAX = 32;
  const TEAM_MAX = 18;
  const NOTE_MAX = 80;
  const REASON_MAX = 240;
  const TAG_MAX = 24;
  const SALT_MAX = 9999;
  const SAMPLE_ID = "sample-knox-vale";
  const SAMPLE_AT = 1759017600000;

  const HOT = ["start", "must", "hot", "boom", "stud", "hammer", "smash", "featured", "bellcow", "green", "alpha", "fire"];
  const COLD = ["sit", "ankle", "knee", "questionable", "cold", "committee", "bye", "dud", "shrug", "limited", "bench", "doubt", "quiet", "injured"];

  const COIN_LINES = [
    "Start {S}. Sit {T}. The booth dressed a coin flip in shoulder pads.",
    "{S} gets the gold. {T} gets the ice. Nobody ran a model.",
    "Flex theater: {S} starts because the spelling won.",
    "{S} over {T}. Sunday anxiety, resolved out loud and on purpose.",
    "One lineup, zero analysts. {S} in, {T} out.",
    "{S} takes the snap in this costume. {T} is the decoy.",
    "Give the nod to {S}. Leave {T} in the group chat.",
    "{S} starts. {T} sits. The confidence meter is a prop.",
  ];

  const NOTE_LINES = [
    "The gut notes picked a side. {S} plays. {T} can argue with a hash.",
    "Start {S}. {T} wrote the colder sentence, and the booth is petty.",
    "{S} over {T}. The notes had a temperature. This is still not a model.",
    "{S} gets the green light. {T}'s gut note lost the costume vote.",
    "Booth call from the notes: {S} in, {T} on ice.",
    "{S} starts. The scribble on {T} sounded like a shrug in cleats.",
    "Heat check, fake as a coin: {S} over {T}.",
    "{S} plays. {T} sits. Your own words did this, not a ranking.",
  ];

  const REMATCH_LINES = [
    "Rematch energy. Start {S}. Sit {T}. Still not a second opinion.",
    "New seed, same anxiety. {S} gets the nod. {T} gets the bench costume.",
    "The booth rerolled. {S} starts this take. {T} is the sit.",
    "Reroll theater: {S} over {T}. Bring the card to friends, not a book.",
    "Fresh flavor, same two names. Start {S}. Leave {T} cold.",
    "{S} wins the rematch coin. {T} can demand another one.",
    "Another seeded guess. {S} in, {T} out. Not a projection.",
    "The booth changed its mind on purpose. Start {S}. Sit {T}.",
  ];

  function clampLine(value, max) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u001F]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
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

  function heat(note) {
    const text = " " + String(note || "").toLowerCase().replace(/[^a-z0-9]+/g, " ") + " ";
    let score = 0;
    for (let i = 0; i < HOT.length; i += 1) {
      if (text.indexOf(" " + HOT[i] + " ") !== -1) score += 3;
    }
    for (let i = 0; i < COLD.length; i += 1) {
      if (text.indexOf(" " + COLD[i] + " ") !== -1) score -= 3;
    }
    return score;
  }

  function fill(line, startName, sitName) {
    let out = "";
    for (let i = 0; i < line.length; i += 1) {
      if (line.slice(i, i + 3) === "{S}") {
        out += startName;
        i += 2;
        continue;
      }
      if (line.slice(i, i + 3) === "{T}") {
        out += sitName;
        i += 2;
        continue;
      }
      out += line.charAt(i);
    }
    return out;
  }

  function poolFor(salt, lean) {
    if (salt > 0) return REMATCH_LINES;
    if (Math.abs(lean) >= 3) return NOTE_LINES;
    return COIN_LINES;
  }

  function cmpText(left, right) {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }

  function comparePlayers(left, right) {
    const name = cmpText(left.name.toLowerCase(), right.name.toLowerCase());
    if (name) return name;
    const team = cmpText(left.team.toLowerCase(), right.team.toLowerCase());
    if (team) return team;
    return cmpText(left.note.toLowerCase(), right.note.toLowerCase());
  }

  function playersMatch(left, right) {
    return left.name.toLowerCase() === right.name.toLowerCase()
      && left.team.toLowerCase() === right.team.toLowerCase()
      && left.note.toLowerCase() === right.note.toLowerCase();
  }

  function sameMatchup(card, a, b) {
    return (playersMatch(card.a, a) && playersMatch(card.b, b))
      || (playersMatch(card.a, b) && playersMatch(card.b, a));
  }

  function mindChangeReason(startName, sitName) {
    return fill("The booth changed its mind on purpose. Start {S}. Sit {T}.", startName, sitName);
  }

  function tagFor(salt, lean) {
    if (salt > 0) return "REMATCH";
    const mag = Math.abs(lean);
    if (mag >= 6) return "NOTE HEAT";
    if (mag >= 3) return "GUT NUDGE";
    return "COIN JERSEY";
  }

  function callBooth(playerA, playerB, salt) {
    const slotA = normalizePlayer(playerA);
    const slotB = normalizePlayer(playerB);
    const flip = comparePlayers(slotA, slotB) > 0;
    const left = flip ? slotB : slotA;
    const right = flip ? slotA : slotB;
    const leftSlot = flip ? "b" : "a";
    const rightSlot = flip ? "a" : "b";
    const cleanSalt = normalizeSalt(salt);
    const usedSalt = cleanSalt == null ? 0 : cleanSalt;
    const hash = fnv1a([
      left.name.toLowerCase(),
      left.team.toLowerCase(),
      left.note.toLowerCase(),
      right.name.toLowerCase(),
      right.team.toLowerCase(),
      right.note.toLowerCase(),
      String(usedSalt),
    ].join("\n"));
    const lean = heat(left.note) - heat(right.note);
    const scoreLeft = 50 + (lean * 8) + ((hash % 11) - 5);
    const leftWins = scoreLeft >= 50;
    const starter = leftWins ? leftSlot : rightSlot;
    const margin = Math.abs(scoreLeft - 50);
    let confidence = 60 + Math.min(32, margin) + (hash % 5);
    if (confidence > 96) confidence = 96;
    const startPlayer = leftWins ? left : right;
    const sitPlayer = leftWins ? right : left;
    const pool = poolFor(usedSalt, lean);
    const reason = fill(pool[hash % pool.length], startPlayer.name, sitPlayer.name);
    return {
      starter: starter,
      confidence: confidence,
      reason: reason,
      tag: tagFor(usedSalt, lean),
      lean: lean,
      hash: hash,
    };
  }

  function normalizePlayer(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const name = source.name != null ? source.name : source.n;
    const team = source.team != null ? source.team : source.t;
    const note = source.note != null ? source.note : source.g;
    return {
      name: clampLine(name, NAME_MAX),
      team: clampLine(team, TEAM_MAX),
      note: clampLine(note, NOTE_MAX),
    };
  }

  function callFieldsOk(starter, confidence, reason, tag) {
    return (starter === "a" || starter === "b")
      && Number.isInteger(confidence)
      && confidence >= 50
      && confidence <= 99
      && !!reason
      && !!tag;
  }

  function normalizeCard(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = clampLine(raw.id, 40);
    if (!/^[A-Za-z0-9_-]{2,40}$/.test(id)) return null;
    const a = normalizePlayer(raw.a);
    const b = normalizePlayer(raw.b);
    if (!a.name || !b.name) return null;
    if (a.name.toLowerCase() === b.name.toLowerCase()) return null;
    const salt = normalizeSalt(raw.salt != null ? raw.salt : raw.sa);
    if (salt == null) return null;
    let starter = raw.starter || raw.st;
    let confidence = Number(raw.confidence != null ? raw.confidence : raw.cf);
    let reason = clampLine(raw.reason != null ? raw.reason : raw.rs, REASON_MAX);
    let tag = clampLine(raw.tag != null ? raw.tag : raw.tg, TAG_MAX);
    if (!callFieldsOk(starter, confidence, reason, tag)) {
      const call = callBooth(a, b, salt);
      starter = call.starter;
      confidence = call.confidence;
      reason = call.reason;
      tag = call.tag;
    }
    const starred = raw.starred === true || raw.star === 1 || raw.star === true;
    return {
      id: id,
      a: a,
      b: b,
      salt: salt,
      starter: starter,
      confidence: confidence,
      reason: reason,
      tag: tag,
      starred: starred,
      created: stampOf(raw.created != null ? raw.created : raw.cr),
      updated: stampOf(raw.updated != null ? raw.updated : raw.up),
    };
  }

  function emptyState() {
    return { v: 1, cards: [], openId: "" };
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
    const openId = typeof raw.openId === "string" ? raw.openId : "";
    if (state.cards.some(function (card) { return card.id === openId; })) state.openId = openId;
    else state.openId = state.cards.length ? state.cards[0].id : "";
    return state;
  }

  function findIndex(cards, id) {
    return cards.findIndex(function (card) { return card.id === id; });
  }

  function decide(state, input, now) {
    const next = normalizeState(state);
    const source = input && typeof input === "object" ? input : {};
    const a = normalizePlayer(source.a);
    const b = normalizePlayer(source.b);
    if (!a.name && !b.name) return { ok: false, reason: "names", state: next };
    if (!a.name) return { ok: false, reason: "nameA", state: next };
    if (!b.name) return { ok: false, reason: "nameB", state: next };
    if (a.name.toLowerCase() === b.name.toLowerCase()) return { ok: false, reason: "same", state: next };
    const existingIdx = next.cards.findIndex(function (card) { return sameMatchup(card, a, b); });
    if (existingIdx >= 0) {
      const existing = next.cards[existingIdx];
      if (existingIdx > 0) {
        next.cards = [existing].concat(next.cards.filter(function (_, index) { return index !== existingIdx; }));
      }
      next.openId = existing.id;
      return { ok: true, state: next, card: existing, already: true };
    }
    if (next.cards.length >= HISTORY_CAP) return { ok: false, reason: "cap", state: next };
    const when = stampOf(now) || Date.now();
    const call = callBooth(a, b, 0);
    const card = normalizeCard({
      id: uid(when),
      a: a,
      b: b,
      salt: 0,
      starter: call.starter,
      confidence: call.confidence,
      reason: call.reason,
      tag: call.tag,
      starred: false,
      created: when,
      updated: when,
    });
    if (!card) return { ok: false, reason: "missing", state: next };
    next.cards = [card].concat(next.cards);
    next.openId = card.id;
    return { ok: true, state: next, card: card, already: false };
  }

  function replaceCard(state, id, mapper, now) {
    const next = normalizeState(state);
    const idx = findIndex(next.cards, id);
    if (idx < 0) return { ok: false, reason: "missing", state: next };
    const previous = normalizeCard(next.cards[idx]);
    const mapped = mapper(previous);
    const clean = normalizeCard(mapped);
    if (!clean) return { ok: false, reason: "missing", state: next };
    clean.updated = stampOf(now) || Date.now();
    next.cards = next.cards.slice();
    next.cards[idx] = clean;
    return { ok: true, state: next, card: clean, previous: previous };
  }

  function swapSides(state, id, now) {
    return replaceCard(state, id, function (card) {
      return {
        id: card.id,
        a: card.b,
        b: card.a,
        salt: card.salt,
        starter: card.starter === "a" ? "b" : "a",
        confidence: card.confidence,
        reason: card.reason,
        tag: card.tag,
        starred: card.starred,
        created: card.created,
        updated: now,
      };
    }, now);
  }

  function reroll(state, id, now) {
    const peek = normalizeState(state);
    const current = peek.cards.find(function (card) { return card.id === id; });
    if (!current) return { ok: false, reason: "missing", state: peek };
    if (current.salt >= SALT_MAX) return { ok: false, reason: "salt", state: peek };
    return replaceCard(state, id, function (card) {
      const salt = card.salt + 1;
      const call = callBooth(card.a, card.b, salt);
      const startPlayer = call.starter === "a" ? card.a : card.b;
      const sitPlayer = call.starter === "a" ? card.b : card.a;
      let reason = call.reason;
      if (call.starter === card.starter && reason === mindChangeReason(startPlayer.name, sitPlayer.name)) {
        const pool = REMATCH_LINES.filter(function (line) {
          return line.indexOf("changed its mind on purpose") === -1;
        });
        reason = fill(pool[call.hash % pool.length], startPlayer.name, sitPlayer.name);
      }
      return {
        id: card.id,
        a: card.a,
        b: card.b,
        salt: salt,
        starter: call.starter,
        confidence: call.confidence,
        reason: reason,
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
        a: card.a,
        b: card.b,
        salt: card.salt,
        starter: card.starter,
        confidence: card.confidence,
        reason: card.reason,
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
    next.cards = [];
    next.openId = "";
    return { ok: true, state: next, previous: previous, openId: openId };
  }

  function restoreAll(state, previous, openId) {
    const next = normalizeState({ v: 1, cards: previous || [], openId: openId || "" });
    return { ok: true, state: next };
  }

  function sampleInput() {
    return {
      a: { name: "Avery Knox", team: "PHI RB", note: "goal line hammer" },
      b: { name: "Nico Vale", team: "DAL RB", note: "committee whispers" },
    };
  }

  function sampleCard() {
    const players = sampleInput();
    const call = callBooth(players.a, players.b, 0);
    return normalizeCard({
      id: SAMPLE_ID,
      a: players.a,
      b: players.b,
      salt: 0,
      starter: call.starter,
      confidence: call.confidence,
      reason: call.reason,
      tag: call.tag,
      starred: false,
      created: SAMPLE_AT,
      updated: SAMPLE_AT,
    });
  }

  function loadSample(state) {
    const next = normalizeState(state);
    const existing = next.cards.find(function (card) { return card.id === SAMPLE_ID; });
    if (existing) {
      next.openId = existing.id;
      return { ok: true, state: next, already: true, card: existing };
    }
    if (next.cards.length >= HISTORY_CAP) return { ok: false, reason: "cap", state: next };
    const card = sampleCard();
    if (!card) return { ok: false, reason: "missing", state: next };
    next.cards = [card].concat(next.cards);
    next.openId = card.id;
    return { ok: true, state: next, already: false, card: card };
  }

  function shareCard(card) {
    const clean = normalizeCard(card);
    if (!clean) return null;
    return {
      v: 1,
      k: "verdict",
      c: {
        id: clean.id,
        sa: clean.salt,
        st: clean.starter,
        cf: clean.confidence,
        rs: clean.reason,
        tg: clean.tag,
        star: clean.starred ? 1 : 0,
        cr: clean.created,
        up: clean.updated,
        a: { n: clean.a.name, t: clean.a.team, g: clean.a.note },
        b: { n: clean.b.name, t: clean.b.team, g: clean.b.note },
      },
    };
  }

  function parseShare(raw) {
    if (!raw || typeof raw !== "object" || raw.v !== 1 || raw.k !== "verdict") return null;
    const card = normalizeCard(raw.c);
    if (!card) return null;
    return { v: 1, k: "verdict", card: card };
  }

  function keepShare(state, share) {
    const next = normalizeState(state);
    const incoming = share && share.card ? normalizeCard(share.card) : null;
    if (!incoming) return { ok: false, reason: "missing", state: next };
    incoming.starred = false;
    if (findIndex(next.cards, incoming.id) >= 0) {
      return { ok: false, reason: "exists", state: next, card: incoming };
    }
    let dropped = null;
    let droppedIndex = -1;
    if (next.cards.length >= HISTORY_CAP) {
      for (let i = next.cards.length - 1; i >= 0; i -= 1) {
        if (next.cards[i].id !== next.openId) {
          droppedIndex = i;
          break;
        }
      }
      if (droppedIndex < 0) return { ok: false, reason: "cap", state: next };
      dropped = next.cards[droppedIndex];
      next.cards = next.cards.filter(function (_, index) { return index !== droppedIndex; });
    }
    next.cards = [incoming].concat(next.cards);
    next.openId = incoming.id;
    return {
      ok: true,
      state: next,
      card: incoming,
      dropped: dropped,
      droppedIndex: droppedIndex,
    };
  }

  function starterPlayer(card) {
    return card.starter === "a" ? card.a : card.b;
  }

  function sitterPlayer(card) {
    return card.starter === "a" ? card.b : card.a;
  }

  function face(card) {
    const clean = normalizeCard(card);
    if (!clean) return "";
    return "START " + starterPlayer(clean).name + " · SIT " + sitterPlayer(clean).name + " · " + clean.confidence + "% theater";
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

  root.StartSit = {
    STORAGE_KEY: STORAGE_KEY,
    HISTORY_CAP: HISTORY_CAP,
    NAME_MAX: NAME_MAX,
    TEAM_MAX: TEAM_MAX,
    NOTE_MAX: NOTE_MAX,
    SAMPLE_ID: SAMPLE_ID,
    emptyState: emptyState,
    normalizeState: normalizeState,
    normalizePlayer: normalizePlayer,
    normalizeCard: normalizeCard,
    callBooth: callBooth,
    decide: decide,
    swapSides: swapSides,
    reroll: reroll,
    setStarred: setStarred,
    putCard: putCard,
    openCard: openCard,
    removeCard: removeCard,
    restoreCard: restoreCard,
    clearCards: clearCards,
    restoreAll: restoreAll,
    loadSample: loadSample,
    sampleCard: sampleCard,
    shareCard: shareCard,
    parseShare: parseShare,
    keepShare: keepShare,
    starterPlayer: starterPlayer,
    sitterPlayer: sitterPlayer,
    face: face,
    compressPayload: compressPayload,
    decompressPayload: decompressPayload,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
