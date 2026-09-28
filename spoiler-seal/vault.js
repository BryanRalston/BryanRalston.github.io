(function (root) {
  "use strict";

  const STORAGE_KEY = "spoiler-seal-v1";
  const SEAL_CAP = 24;
  const TITLE_MAX = 80;
  const TAG_MAX = 32;
  const NOTE_MAX = 140;
  const RESULT_MAX = 280;
  const SAMPLE_ID = "sample-chiefs-bills";
  const MAX_AHEAD_MS = 400 * 24 * 60 * 60 * 1000;
  const MIN_UNLOCK = Date.UTC(2020, 0, 1);
  const MAX_UNLOCK = Date.UTC(2100, 0, 1);

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

  function normalizeCrackedAt(value) {
    if (value == null || value === "") return 0;
    const n = normalizeUnlock(value);
    return n == null ? 0 : n;
  }

  function phase(seal, now) {
    if (!seal) throw new Error("Unknown phase");
    if (seal.cracked) return "cracked";
    if (stamp(now) < seal.unlockAt) return "sealed";
    return "cracked";
  }

  function phaseStamp(name) {
    switch (name) {
      case "sealed":
        return "SEALED";
      case "cracked":
        return "CRACKED";
      default: {
        const _never = name;
        throw new Error("Unknown phase " + _never);
      }
    }
  }

  function phaseLabel(name) {
    switch (name) {
      case "sealed":
        return "Sealed";
      case "cracked":
        return "Cracked";
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
      case "1h":
        return at + 60 * 60 * 1000;
      case "3h":
        return at + 3 * 60 * 60 * 1000;
      case "night": {
        const target = new Date(at);
        target.setHours(23, 59, 0, 0);
        if (target.getTime() <= at) target.setDate(target.getDate() + 1);
        return target.getTime();
      }
      default: {
        const _never = kind;
        throw new Error("Unknown preset " + _never);
      }
    }
  }

  function normalizeSeal(raw) {
    if (!raw || typeof raw !== "object") return null;
    const title = clampLine(raw.title, TITLE_MAX);
    const unlockAt = normalizeUnlock(raw.unlockAt != null ? raw.unlockAt : raw.unlock);
    if (!title || unlockAt == null) return null;
    const created = stamp(raw.created != null ? raw.created : raw.updated);
    return {
      id: clampId(raw.id) || uid(),
      title: title,
      tag: clampLine(raw.tag, TAG_MAX),
      note: clampLine(raw.note, NOTE_MAX),
      result: clampLine(raw.result, RESULT_MAX),
      unlockAt: unlockAt,
      cracked: raw.cracked === true,
      crackedAt: normalizeCrackedAt(raw.crackedAt),
      starred: raw.starred === true,
      created: created,
      updated: stamp(raw.updated != null ? raw.updated : created),
    };
  }

  function takeSeals(list, cap) {
    const seen = Object.create(null);
    const seals = [];
    if (!Array.isArray(list)) return seals;
    for (let i = 0; i < list.length; i++) {
      const seal = normalizeSeal(list[i]);
      if (!seal || seen[seal.id]) continue;
      seen[seal.id] = true;
      seals.push(seal);
      if (seals.length >= cap) break;
    }
    return seals;
  }

  function emptyState() {
    return { v: 1, filter: "all", seals: [] };
  }

  function normalizeFilter(value) {
    if (value === "all" || value === "sealed" || value === "cracked") return value;
    return null;
  }

  function normalizeState(raw) {
    const base = emptyState();
    if (!raw || typeof raw !== "object") return base;
    return {
      v: 1,
      filter: normalizeFilter(raw.filter) || "all",
      seals: takeSeals(raw.seals, SEAL_CAP),
    };
  }

  function copyState(state, seals) {
    return { v: 1, filter: state.filter, seals: seals };
  }

  function buildSeal(draft, now, id, previous) {
    const title = clampLine(draft && draft.title, TITLE_MAX);
    if (!title) return { ok: false, reason: "title" };
    const unlockAt = normalizeUnlock(draft && draft.unlockAt);
    if (unlockAt == null) return { ok: false, reason: "unlock" };
    const at = stamp(now);
    if (unlockAt > at + MAX_AHEAD_MS) return { ok: false, reason: "far" };
    const chosenId = id || clampId(draft && draft.id) || uid();
    const opening = unlockAt <= at;
    let crackedAt = 0;
    if (opening) {
      if (previous && previous.cracked) crackedAt = previous.crackedAt || 0;
      else crackedAt = at;
    }
    return {
      ok: true,
      seal: {
        id: chosenId,
        title: title,
        tag: clampLine(draft && draft.tag, TAG_MAX),
        note: clampLine(draft && draft.note, NOTE_MAX),
        result: clampLine(draft && draft.result, RESULT_MAX),
        unlockAt: unlockAt,
        cracked: opening,
        crackedAt: crackedAt,
        starred: previous ? previous.starred === true : false,
        created: previous ? previous.created : at,
        updated: at,
      },
    };
  }

  function addSeal(state, draft, now) {
    if (state.seals.length >= SEAL_CAP) return { ok: false, reason: "cap", state: state };
    const built = buildSeal(draft, now);
    if (!built.ok) return { ok: false, reason: built.reason, state: state };
    if (state.seals.some(function (seal) { return seal.id === built.seal.id; })) {
      return { ok: false, reason: "exists", state: state };
    }
    return {
      ok: true,
      seal: built.seal,
      state: copyState(state, [built.seal].concat(state.seals)),
    };
  }

  function updateSeal(state, id, draft, now) {
    const idx = state.seals.findIndex(function (seal) { return seal.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state };
    const built = buildSeal(draft, now, id, state.seals[idx]);
    if (!built.ok) return { ok: false, reason: built.reason, state: state };
    const next = state.seals.slice();
    next[idx] = built.seal;
    return { ok: true, seal: built.seal, state: copyState(state, next) };
  }

  function replaceSeal(state, previous) {
    const clean = normalizeSeal(previous);
    if (!clean) return { ok: false, reason: "title", state: state };
    const idx = state.seals.findIndex(function (seal) { return seal.id === clean.id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state };
    const next = state.seals.slice();
    next[idx] = clean;
    return { ok: true, seal: clean, state: copyState(state, next) };
  }

  function removeSeal(state, id) {
    const idx = state.seals.findIndex(function (seal) { return seal.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state, seal: null, index: -1 };
    const next = state.seals.slice();
    const seal = next[idx];
    next.splice(idx, 1);
    return { ok: true, seal: seal, index: idx, state: copyState(state, next) };
  }

  function restoreSeal(state, seal, index) {
    const clean = normalizeSeal(seal);
    if (!clean) return { ok: false, reason: "title", state: state };
    if (state.seals.some(function (row) { return row.id === clean.id; })) {
      return { ok: false, reason: "exists", state: state };
    }
    if (state.seals.length >= SEAL_CAP) return { ok: false, reason: "cap", state: state };
    const next = state.seals.slice();
    const at = Math.max(0, Math.min(Number(index) || 0, next.length));
    next.splice(at, 0, clean);
    return { ok: true, state: copyState(state, next) };
  }

  function breakSeal(state, id, now) {
    const idx = state.seals.findIndex(function (seal) { return seal.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state };
    const seal = state.seals[idx];
    if (phase(seal, stamp(now)) === "cracked" && seal.cracked) {
      return { ok: true, seal: seal, state: state, already: true };
    }
    const at = stamp(now);
    const opened = {
      id: seal.id,
      title: seal.title,
      tag: seal.tag,
      note: seal.note,
      result: seal.result,
      unlockAt: seal.unlockAt,
      cracked: true,
      crackedAt: at,
      starred: seal.starred,
      created: seal.created,
      updated: at,
    };
    const next = state.seals.slice();
    next[idx] = opened;
    return { ok: true, seal: opened, state: copyState(state, next), already: false };
  }

  function crackDue(state, now) {
    const at = stamp(now);
    const opened = [];
    let changed = false;
    const seals = state.seals.map(function (seal) {
      if (seal.cracked || at < seal.unlockAt) return seal;
      changed = true;
      opened.push(seal.id);
      return {
        id: seal.id,
        title: seal.title,
        tag: seal.tag,
        note: seal.note,
        result: seal.result,
        unlockAt: seal.unlockAt,
        cracked: true,
        crackedAt: seal.unlockAt,
        starred: seal.starred,
        created: seal.created,
        updated: at,
      };
    });
    if (!changed) return { state: state, opened: opened };
    return { state: copyState(state, seals), opened: opened };
  }

  function setStar(state, id, starred, now) {
    const idx = state.seals.findIndex(function (seal) { return seal.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state };
    const seal = state.seals[idx];
    const nextStar = starred === true;
    if (seal.starred === nextStar) return { ok: true, seal: seal, state: state, already: true };
    const updated = {
      id: seal.id,
      title: seal.title,
      tag: seal.tag,
      note: seal.note,
      result: seal.result,
      unlockAt: seal.unlockAt,
      cracked: seal.cracked,
      crackedAt: seal.crackedAt || 0,
      starred: nextStar,
      created: seal.created,
      updated: stamp(now),
    };
    const next = state.seals.slice();
    next[idx] = updated;
    return { ok: true, seal: updated, state: copyState(state, next), already: false };
  }

  function clearSeals(state) {
    return copyState(state, []);
  }

  function setFilter(state, filter) {
    const next = normalizeFilter(filter);
    if (!next) return state;
    return { v: 1, filter: next, seals: state.seals };
  }

  function visibleSeals(state, now) {
    const at = stamp(now);
    const list = state.seals.filter(function (seal) {
      const name = phase(seal, at);
      switch (state.filter) {
        case "all":
          return true;
        case "sealed":
          return name === "sealed";
        case "cracked":
          return name === "cracked";
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
      if (pa !== pb) return pa === "sealed" ? -1 : 1;
      switch (pa) {
        case "sealed":
          return a.unlockAt - b.unlockAt || a.title.localeCompare(b.title);
        case "cracked":
          return b.updated - a.updated || a.title.localeCompare(b.title);
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
    const sealed = state.seals.filter(function (seal) { return phase(seal, at) === "sealed"; });
    sealed.sort(function (a, b) { return a.unlockAt - b.unlockAt || a.title.localeCompare(b.title); });
    if (sealed.length) return sealed[0];
    const cracked = state.seals.filter(function (seal) { return phase(seal, at) === "cracked"; });
    cracked.sort(function (a, b) { return b.updated - a.updated || a.title.localeCompare(b.title); });
    return cracked.length ? cracked[0] : null;
  }

  function counts(state, now) {
    const at = stamp(now);
    const tally = { all: state.seals.length, sealed: 0, cracked: 0 };
    state.seals.forEach(function (seal) {
      const name = phase(seal, at);
      switch (name) {
        case "sealed":
        case "cracked":
          tally[name] += 1;
          break;
        default: {
          const _never = name;
          throw new Error("Unknown phase " + _never);
        }
      }
    });
    return tally;
  }

  function publicFace(seal, now) {
    const name = phase(seal, stamp(now));
    const open = name === "cracked";
    return {
      phase: name,
      stamp: phaseStamp(name),
      label: phaseLabel(name),
      title: seal.title,
      tag: seal.tag,
      note: seal.note,
      unlockAt: seal.unlockAt,
      crackedAt: seal.crackedAt || 0,
      starred: seal.starred === true,
      result: open ? seal.result : "",
      awaiting: open && !seal.result,
    };
  }

  function sampleDraft(now) {
    return {
      id: SAMPLE_ID,
      title: "Chiefs @ Bills",
      tag: "NFL",
      note: "Sealed until after the 4th.",
      result: "Bills 31, Chiefs 24",
      unlockAt: presetUnlock("3h", now),
    };
  }

  function loadSample(state, now) {
    if (state.seals.some(function (seal) { return seal.id === SAMPLE_ID; })) {
      return { ok: false, reason: "exists", state: state };
    }
    return addSeal(state, sampleDraft(now), now);
  }

  function slim(seal) {
    const out = {
      id: seal.id,
      title: seal.title,
      unlockAt: seal.unlockAt,
      created: seal.created,
      updated: seal.updated,
    };
    if (seal.tag) out.tag = seal.tag;
    if (seal.note) out.note = seal.note;
    if (seal.result) out.result = seal.result;
    if (seal.starred) out.starred = true;
    return out;
  }

  function sharedSeal(seal) {
    return {
      id: seal.id,
      title: seal.title,
      tag: seal.tag,
      note: seal.note,
      result: seal.result,
      unlockAt: seal.unlockAt,
      cracked: false,
      crackedAt: 0,
      starred: seal.starred === true,
      created: seal.created,
      updated: seal.updated,
    };
  }

  function shareVault(state) {
    return {
      v: 1,
      k: "vault",
      e: state.seals.slice(0, SEAL_CAP).map(slim),
    };
  }

  function shareCard(seal) {
    const clean = normalizeSeal(seal);
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
    const seals = takeSeals(raw.e, kind === "card" ? 1 : SEAL_CAP).map(sharedSeal);
    if (!seals.length) return null;
    return { v: 1, k: kind, seals: seals };
  }

  function keepShare(state, share) {
    if (!share || !Array.isArray(share.seals) || !share.seals.length) {
      return { ok: false, reason: "missing", state: state };
    }
    const have = Object.create(null);
    state.seals.forEach(function (seal) { have[seal.id] = true; });
    const fresh = [];
    share.seals.forEach(function (seal) {
      const clean = sharedSeal(seal);
      if (have[clean.id]) return;
      have[clean.id] = true;
      fresh.push(clean);
    });
    if (!fresh.length) return { ok: false, reason: "exists", state: state };
    const room = Math.max(0, SEAL_CAP - state.seals.length);
    if (!room) return { ok: false, reason: "cap", state: state };
    const added = fresh.slice(0, room);
    return {
      ok: true,
      state: copyState(state, added.concat(state.seals)),
      addedIds: added.map(function (seal) { return seal.id; }),
      dropped: fresh.length - added.length,
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

  root.SpoilerSeal = {
    STORAGE_KEY: STORAGE_KEY,
    SEAL_CAP: SEAL_CAP,
    TITLE_MAX: TITLE_MAX,
    TAG_MAX: TAG_MAX,
    NOTE_MAX: NOTE_MAX,
    RESULT_MAX: RESULT_MAX,
    SAMPLE_ID: SAMPLE_ID,
    MAX_AHEAD_MS: MAX_AHEAD_MS,
    phase: phase,
    phaseStamp: phaseStamp,
    phaseLabel: phaseLabel,
    formatCountdown: formatCountdown,
    formatUnlock: formatUnlock,
    presetUnlock: presetUnlock,
    emptyState: emptyState,
    normalizeState: normalizeState,
    addSeal: addSeal,
    updateSeal: updateSeal,
    replaceSeal: replaceSeal,
    removeSeal: removeSeal,
    restoreSeal: restoreSeal,
    breakSeal: breakSeal,
    crackDue: crackDue,
    setStar: setStar,
    clearSeals: clearSeals,
    setFilter: setFilter,
    visibleSeals: visibleSeals,
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
