(function (root) {
  "use strict";

  const STORAGE_KEY = "queue-lock-v1";
  const LOCK_CAP = 24;
  const GAME_MAX = 80;
  const NOTE_MAX = 140;
  const SAMPLE_ID = "sample-ranked-control";
  const MAX_AHEAD_MS = 400 * 24 * 60 * 60 * 1000;
  const MIN_UNLOCK = Date.UTC(2020, 0, 1);
  const MAX_UNLOCK = Date.UTC(2100, 0, 1);
  const REASON_ORDER = ["bad-call", "lag", "cheese", "self-destruct", "teammates", "just-salty"];

  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function clampLine(value, max) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u001F\u007F]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
  }

  function clampId(value) {
    return String(value == null ? "" : value)
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 48);
  }

  function stamp(now) {
    const n = Number(now);
    return Number.isFinite(n) ? Math.round(n) : Date.now();
  }

  function normalizeUnlock(value) {
    const n = typeof value === "number" ? value : Number(String(value == null ? "" : value).trim());
    if (!Number.isFinite(n)) return null;
    const rounded = Math.round(n);
    if (rounded < MIN_UNLOCK || rounded > MAX_UNLOCK) return null;
    return rounded;
  }

  function normalizeWhen(value) {
    if (value == null || value === "") return 0;
    const n = normalizeUnlock(value);
    return n == null ? 0 : n;
  }

  function reasonLabel(id) {
    switch (id) {
      case "bad-call":
        return "Bad call";
      case "lag":
        return "Lag";
      case "cheese":
        return "Cheese";
      case "self-destruct":
        return "Self-destruct";
      case "teammates":
        return "Teammates";
      case "just-salty":
        return "Just salty";
      default: {
        const _never = id;
        throw new Error("Unknown reason " + _never);
      }
    }
  }

  function normalizeReasons(value) {
    const picked = Object.create(null);
    const list = Array.isArray(value) ? value : [];
    list.forEach(function (item) {
      const id = String(item == null ? "" : item).trim();
      switch (id) {
        case "bad-call":
        case "lag":
        case "cheese":
        case "self-destruct":
        case "teammates":
        case "just-salty":
          picked[id] = true;
          break;
        default:
          break;
      }
    });
    return REASON_ORDER.filter(function (id) { return picked[id]; });
  }

  function phase(lock, now) {
    if (!lock) throw new Error("Unknown phase");
    if (lock.broke) return "broke";
    if (stamp(now) < lock.unlockAt) return "locked";
    return "waited";
  }

  function phaseRank(name) {
    switch (name) {
      case "locked":
        return 0;
      case "waited":
        return 1;
      case "broke":
        return 1;
      default: {
        const _never = name;
        throw new Error("Unknown phase " + _never);
      }
    }
  }

  function phaseStamp(name) {
    switch (name) {
      case "locked":
        return "LOCKED FROM QUEUE";
      case "waited":
        return "QUEUE OPEN";
      case "broke":
        return "LOCK BROKEN";
      default: {
        const _never = name;
        throw new Error("Unknown phase " + _never);
      }
    }
  }

  function phaseLabel(name) {
    switch (name) {
      case "locked":
        return "Active";
      case "waited":
        return "Waited";
      case "broke":
        return "Broke";
      default: {
        const _never = name;
        throw new Error("Unknown phase " + _never);
      }
    }
  }

  function phaseBadge(name) {
    switch (name) {
      case "locked":
        return "";
      case "waited":
        return "Waited";
      case "broke":
        return "Broke";
      default: {
        const _never = name;
        throw new Error("Unknown phase " + _never);
      }
    }
  }

  function stampLines(name) {
    switch (name) {
      case "locked":
        return ["LOCKED", "FROM QUEUE"];
      case "waited":
        return ["QUEUE", "OPEN"];
      case "broke":
        return ["LOCK", "BROKEN"];
      default: {
        const _never = name;
        throw new Error("Unknown phase " + _never);
      }
    }
  }

  function formatCountdown(ms) {
    const remaining = Number(ms);
    if (!Number.isFinite(remaining) || remaining <= 0) return "00:00";
    const total = Math.ceil(remaining / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = function (n) { return String(n).padStart(2, "0"); };
    if (days > 0) return days + "d " + pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
    if (hours > 0) return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
    return pad(minutes) + ":" + pad(seconds);
  }

  function formatUnlock(ms) {
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let hours = d.getHours();
    const suffix = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return months[d.getMonth()] + " " + d.getDate() + ", " + hours + ":" + minutes + " " + suffix;
  }

  function presetUnlock(kind, now) {
    const at = stamp(now);
    switch (kind) {
      case "5":
        return at + 5 * 60 * 1000;
      case "15":
        return at + 15 * 60 * 1000;
      case "30":
        return at + 30 * 60 * 1000;
      case "60":
        return at + 60 * 60 * 1000;
      default: {
        const _never = kind;
        throw new Error("Unknown preset " + _never);
      }
    }
  }

  function normalizeLock(raw) {
    if (!raw || typeof raw !== "object") return null;
    const game = clampLine(raw.game != null ? raw.game : raw.title, GAME_MAX);
    const unlockAt = normalizeUnlock(raw.unlockAt != null ? raw.unlockAt : raw.unlock);
    if (!game || unlockAt == null) return null;
    const created = stamp(raw.created != null ? raw.created : raw.updated);
    const broke = raw.broke === true;
    let brokeAt = 0;
    if (broke) {
      brokeAt = normalizeWhen(raw.brokeAt);
      if (!brokeAt) brokeAt = created;
    }
    return {
      id: clampId(raw.id) || uid(),
      game: game,
      reasons: normalizeReasons(raw.reasons),
      note: clampLine(raw.note, NOTE_MAX),
      unlockAt: unlockAt,
      broke: broke,
      brokeAt: brokeAt,
      waitedAt: broke ? 0 : normalizeWhen(raw.waitedAt),
      starred: raw.starred === true,
      created: created,
      updated: stamp(raw.updated != null ? raw.updated : created),
    };
  }

  function takeLocks(list, cap) {
    const seen = Object.create(null);
    const locks = [];
    if (!Array.isArray(list)) return locks;
    for (let i = 0; i < list.length; i++) {
      const lock = normalizeLock(list[i]);
      if (!lock || seen[lock.id]) continue;
      seen[lock.id] = true;
      locks.push(lock);
      if (locks.length >= cap) break;
    }
    return locks;
  }

  function emptyState() {
    return { v: 1, filter: "all", locks: [] };
  }

  function normalizeFilter(value) {
    if (value === "all" || value === "active" || value === "done") return value;
    return null;
  }

  function normalizeState(raw) {
    const base = emptyState();
    if (!raw || typeof raw !== "object") return base;
    return {
      v: 1,
      filter: normalizeFilter(raw.filter) || "all",
      locks: takeLocks(raw.locks, LOCK_CAP),
    };
  }

  function copyState(state, locks) {
    return { v: 1, filter: state.filter, locks: locks };
  }

  function buildLock(draft, now) {
    const game = clampLine(draft && draft.game, GAME_MAX);
    if (!game) return { ok: false, reason: "game" };
    const unlockAt = normalizeUnlock(draft && draft.unlockAt);
    if (unlockAt == null) return { ok: false, reason: "unlock" };
    const at = stamp(now);
    if (unlockAt > at + MAX_AHEAD_MS) return { ok: false, reason: "far" };
    const opening = unlockAt <= at;
    return {
      ok: true,
      lock: {
        id: clampId(draft && draft.id) || uid(),
        game: game,
        reasons: normalizeReasons(draft && draft.reasons),
        note: clampLine(draft && draft.note, NOTE_MAX),
        unlockAt: unlockAt,
        broke: false,
        brokeAt: 0,
        waitedAt: opening ? at : 0,
        starred: false,
        created: at,
        updated: at,
      },
    };
  }

  function addLock(state, draft, now) {
    if (state.locks.length >= LOCK_CAP) return { ok: false, reason: "cap", state: state };
    const built = buildLock(draft, now);
    if (!built.ok) return { ok: false, reason: built.reason, state: state };
    if (state.locks.some(function (lock) { return lock.id === built.lock.id; })) {
      return { ok: false, reason: "exists", state: state };
    }
    return {
      ok: true,
      lock: built.lock,
      state: copyState(state, [built.lock].concat(state.locks)),
    };
  }

  function removeLock(state, id) {
    const idx = state.locks.findIndex(function (lock) { return lock.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state, lock: null, index: -1 };
    const next = state.locks.slice();
    const lock = next[idx];
    next.splice(idx, 1);
    return { ok: true, lock: lock, index: idx, state: copyState(state, next) };
  }

  function restoreLock(state, lock, index) {
    const clean = normalizeLock(lock);
    if (!clean) return { ok: false, reason: "game", state: state };
    if (state.locks.some(function (row) { return row.id === clean.id; })) {
      return { ok: false, reason: "exists", state: state };
    }
    if (state.locks.length >= LOCK_CAP) return { ok: false, reason: "cap", state: state };
    const next = state.locks.slice();
    const at = Math.max(0, Math.min(Number(index) || 0, next.length));
    next.splice(at, 0, clean);
    return { ok: true, state: copyState(state, next) };
  }

  function replaceLock(state, previous) {
    const clean = normalizeLock(previous);
    if (!clean) return { ok: false, reason: "game", state: state };
    const idx = state.locks.findIndex(function (lock) { return lock.id === clean.id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state };
    const next = state.locks.slice();
    next[idx] = clean;
    return { ok: true, lock: clean, state: copyState(state, next) };
  }

  function withLock(lock, patch) {
    return {
      id: lock.id,
      game: lock.game,
      reasons: lock.reasons.slice(),
      note: lock.note,
      unlockAt: lock.unlockAt,
      broke: patch.broke,
      brokeAt: patch.brokeAt,
      waitedAt: patch.waitedAt,
      starred: patch.starred,
      created: lock.created,
      updated: patch.updated,
    };
  }

  function breakLock(state, id, now) {
    const idx = state.locks.findIndex(function (lock) { return lock.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state };
    const lock = state.locks[idx];
    const at = stamp(now);
    if (lock.broke) return { ok: true, lock: lock, state: state, already: true };
    if (at >= lock.unlockAt) {
      if (lock.waitedAt) return { ok: false, reason: "open", state: state };
      const settled = withLock(lock, {
        broke: false,
        brokeAt: 0,
        waitedAt: lock.unlockAt,
        starred: lock.starred,
        updated: at,
      });
      const next = state.locks.slice();
      next[idx] = settled;
      return { ok: false, reason: "open", state: copyState(state, next) };
    }
    const opened = withLock(lock, {
      broke: true,
      brokeAt: at,
      waitedAt: 0,
      starred: lock.starred,
      updated: at,
    });
    const next = state.locks.slice();
    next[idx] = opened;
    return { ok: true, lock: opened, state: copyState(state, next), already: false };
  }

  function undoBreak(state, id, now) {
    const idx = state.locks.findIndex(function (lock) { return lock.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state };
    const lock = state.locks[idx];
    if (!lock.broke) return { ok: true, lock: lock, state: state, already: true };
    const at = stamp(now);
    if (at >= lock.unlockAt) return { ok: false, reason: "open", state: state };
    const restored = withLock(lock, {
      broke: false,
      brokeAt: 0,
      waitedAt: 0,
      starred: lock.starred,
      updated: at,
    });
    const next = state.locks.slice();
    next[idx] = restored;
    return { ok: true, lock: restored, state: copyState(state, next) };
  }

  function settleDue(state, now) {
    const at = stamp(now);
    const opened = [];
    let changed = false;
    const locks = state.locks.map(function (lock) {
      if (lock.broke || lock.waitedAt || at < lock.unlockAt) return lock;
      changed = true;
      opened.push(lock.id);
      return withLock(lock, {
        broke: false,
        brokeAt: 0,
        waitedAt: lock.unlockAt,
        starred: lock.starred,
        updated: at,
      });
    });
    if (!changed) return { state: state, opened: opened };
    return { state: copyState(state, locks), opened: opened };
  }

  function setStar(state, id, starred, now) {
    const idx = state.locks.findIndex(function (lock) { return lock.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state };
    const lock = state.locks[idx];
    const nextStar = starred === true;
    if (lock.starred === nextStar) return { ok: true, lock: lock, state: state, already: true };
    const updated = withLock(lock, {
      broke: lock.broke,
      brokeAt: lock.brokeAt,
      waitedAt: lock.waitedAt,
      starred: nextStar,
      updated: stamp(now),
    });
    const next = state.locks.slice();
    next[idx] = updated;
    return { ok: true, lock: updated, state: copyState(state, next), already: false };
  }

  function clearLocks(state) {
    return copyState(state, []);
  }

  function restoreAll(state, locks) {
    if (state.locks.length) return { ok: false, reason: "exists", state: state };
    return { ok: true, state: copyState(state, takeLocks(locks, LOCK_CAP)) };
  }

  function setFilter(state, filter) {
    const next = normalizeFilter(filter);
    if (!next) return state;
    return { v: 1, filter: next, locks: state.locks };
  }

  function visibleLocks(state, now) {
    const at = stamp(now);
    const list = state.locks.filter(function (lock) {
      const name = phase(lock, at);
      switch (state.filter) {
        case "all":
          return true;
        case "active":
          return name === "locked";
        case "done":
          return name === "waited" || name === "broke";
        default: {
          const _never = state.filter;
          throw new Error("Unknown filter " + _never);
        }
      }
    });
    list.sort(function (a, b) {
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      const pa = phase(a, at);
      const pb = phase(b, at);
      const rank = phaseRank(pa) - phaseRank(pb);
      if (rank) return rank;
      switch (pa) {
        case "locked":
          return a.unlockAt - b.unlockAt || a.game.localeCompare(b.game);
        case "waited":
          return b.updated - a.updated || a.game.localeCompare(b.game);
        case "broke":
          return b.updated - a.updated || a.game.localeCompare(b.game);
        default: {
          const _never = pa;
          throw new Error("Unknown phase " + _never);
        }
      }
    });
    return list;
  }

  function spotlight(state, now) {
    const at = stamp(now);
    const locked = state.locks.filter(function (lock) { return phase(lock, at) === "locked"; });
    locked.sort(function (a, b) {
      return a.unlockAt - b.unlockAt || a.game.localeCompare(b.game);
    });
    return locked.length ? locked[0] : null;
  }

  function counts(state, now) {
    const at = stamp(now);
    const tally = { all: state.locks.length, active: 0, done: 0, locked: 0, waited: 0, broke: 0 };
    state.locks.forEach(function (lock) {
      const name = phase(lock, at);
      switch (name) {
        case "locked":
          tally.locked += 1;
          tally.active += 1;
          break;
        case "waited":
          tally.waited += 1;
          tally.done += 1;
          break;
        case "broke":
          tally.broke += 1;
          tally.done += 1;
          break;
        default: {
          const _never = name;
          throw new Error("Unknown phase " + _never);
        }
      }
    });
    return tally;
  }

  function publicFace(lock, now) {
    const name = phase(lock, stamp(now));
    return {
      phase: name,
      stamp: phaseStamp(name),
      label: phaseLabel(name),
      badge: phaseBadge(name),
      lines: stampLines(name),
      game: lock.game,
      reasons: lock.reasons.slice(),
      note: lock.note,
      unlockAt: lock.unlockAt,
      brokeAt: name === "broke" ? lock.brokeAt : 0,
      waitedAt: name === "waited" ? (lock.waitedAt || lock.unlockAt) : 0,
      starred: lock.starred === true,
    };
  }

  function sampleDraft(now) {
    return {
      id: SAMPLE_ID,
      game: "Ranked — Control",
      reasons: ["lag", "bad-call"],
      note: "One more queue will not fix it.",
      unlockAt: presetUnlock("15", now),
    };
  }

  function loadSample(state, now) {
    if (state.locks.some(function (lock) { return lock.id === SAMPLE_ID; })) {
      return { ok: false, reason: "exists", state: state };
    }
    return addLock(state, sampleDraft(now), now);
  }

  function slim(lock) {
    const out = {
      id: lock.id,
      game: lock.game,
      unlockAt: lock.unlockAt,
      created: lock.created,
      updated: lock.updated,
    };
    if (lock.reasons.length) out.reasons = lock.reasons.slice();
    if (lock.note) out.note = lock.note;
    return out;
  }

  function sharedLock(lock) {
    const clean = normalizeLock(lock);
    if (!clean) return null;
    return {
      id: clean.id,
      game: clean.game,
      reasons: clean.reasons.slice(),
      note: clean.note,
      unlockAt: clean.unlockAt,
      broke: false,
      brokeAt: 0,
      waitedAt: 0,
      starred: false,
      created: clean.created,
      updated: clean.updated,
    };
  }

  function shareVault(state) {
    return {
      v: 1,
      k: "vault",
      e: state.locks.slice(0, LOCK_CAP).map(slim),
    };
  }

  function shareCard(lock) {
    const clean = normalizeLock(lock);
    if (!clean) return null;
    return { v: 1, k: "card", e: [slim(clean)] };
  }

  function parseShare(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.e)) return null;
    let kind = null;
    switch (raw.k) {
      case "card":
      case "vault":
        kind = raw.k;
        break;
      default:
        return null;
    }
    const locks = [];
    takeLocks(raw.e, kind === "card" ? 1 : LOCK_CAP).forEach(function (lock) {
      const shared = sharedLock(lock);
      if (shared) locks.push(shared);
    });
    if (!locks.length) return null;
    return { v: 1, k: kind, locks: locks };
  }

  function pickDropIndex(list, protectId) {
    let best = -1;
    for (let i = 0; i < list.length; i++) {
      if (protectId && list[i].id === protectId) continue;
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

  function keepShare(state, share, openId) {
    if (!share || !Array.isArray(share.locks) || !share.locks.length) {
      return { ok: false, reason: "missing", state: state };
    }
    const have = Object.create(null);
    state.locks.forEach(function (lock) { have[lock.id] = true; });
    const fresh = [];
    share.locks.forEach(function (lock) {
      const clean = sharedLock(lock);
      if (!clean || have[clean.id]) return;
      have[clean.id] = true;
      fresh.push(clean);
    });
    if (!fresh.length) return { ok: false, reason: "exists", state: state };
    const batch = fresh.slice(0, LOCK_CAP);
    const protect = clampId(openId);
    const next = state.locks.slice();
    const dropped = [];
    while (next.length + batch.length > LOCK_CAP) {
      let dropAt = pickDropIndex(next, protect);
      if (dropAt < 0) dropAt = pickDropIndex(next, "");
      if (dropAt < 0) return { ok: false, reason: "cap", state: state };
      const victim = next[dropAt];
      const originalIndex = state.locks.findIndex(function (lock) { return lock.id === victim.id; });
      dropped.push({ lock: victim, index: originalIndex });
      next.splice(dropAt, 1);
    }
    return {
      ok: true,
      state: copyState(state, batch.concat(next)),
      addedIds: batch.map(function (lock) { return lock.id; }),
      dropped: dropped,
    };
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
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
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

  root.QueueLock = {
    STORAGE_KEY: STORAGE_KEY,
    LOCK_CAP: LOCK_CAP,
    GAME_MAX: GAME_MAX,
    NOTE_MAX: NOTE_MAX,
    SAMPLE_ID: SAMPLE_ID,
    MAX_AHEAD_MS: MAX_AHEAD_MS,
    REASON_ORDER: REASON_ORDER,
    reasonLabel: reasonLabel,
    phase: phase,
    phaseStamp: phaseStamp,
    phaseLabel: phaseLabel,
    phaseBadge: phaseBadge,
    stampLines: stampLines,
    formatCountdown: formatCountdown,
    formatUnlock: formatUnlock,
    presetUnlock: presetUnlock,
    emptyState: emptyState,
    normalizeState: normalizeState,
    addLock: addLock,
    removeLock: removeLock,
    restoreLock: restoreLock,
    replaceLock: replaceLock,
    breakLock: breakLock,
    undoBreak: undoBreak,
    settleDue: settleDue,
    setStar: setStar,
    clearLocks: clearLocks,
    restoreAll: restoreAll,
    setFilter: setFilter,
    visibleLocks: visibleLocks,
    spotlight: spotlight,
    counts: counts,
    publicFace: publicFace,
    sampleDraft: sampleDraft,
    loadSample: loadSample,
    shareVault: shareVault,
    shareCard: shareCard,
    parseShare: parseShare,
    keepShare: keepShare,
    compressPayload: compressPayload,
    decompressPayload: decompressPayload,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
