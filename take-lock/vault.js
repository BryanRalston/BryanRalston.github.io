(function (root) {
  const STORAGE_KEY = "take-lock-v1";
  const TAKE_CAP = 24;
  const TITLE_MAX = 80;
  const BODY_MAX = 280;
  const TAG_MAX = 32;
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

  function phase(take, now) {
    if (!take) {
      throw new Error("Unknown phase");
    }
    if (now < take.unlockAt) return "sealed";
    if (!take.revealed) return "ready";
    return "exposed";
  }

  function phaseRank(name) {
    switch (name) {
      case "sealed":
        return 0;
      case "ready":
        return 1;
      case "exposed":
        return 2;
      default: {
        const _never = name;
        throw new Error("Unknown phase " + _never);
      }
    }
  }

  function phaseStamp(name) {
    switch (name) {
      case "sealed":
        return "SEALED";
      case "ready":
        return "UNLOCKED";
      case "exposed":
        return "EXPOSED";
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
      case "ready":
        return "Unlocked";
      case "exposed":
        return "Exposed";
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
      case "now":
        return at - 1000;
      case "15":
        return at + 15 * 60 * 1000;
      case "60":
        return at + 60 * 60 * 1000;
      case "tonight": {
        const target = new Date(at);
        target.setHours(19, 0, 0, 0);
        if (target.getTime() <= at) target.setDate(target.getDate() + 1);
        return target.getTime();
      }
      case "tomorrow": {
        const target = new Date(at);
        target.setDate(target.getDate() + 1);
        target.setHours(13, 0, 0, 0);
        return target.getTime();
      }
      default: {
        const _never = kind;
        throw new Error("Unknown preset " + _never);
      }
    }
  }

  function normalizeTake(raw) {
    if (!raw || typeof raw !== "object") return null;
    const title = clampLine(raw.title, TITLE_MAX);
    const body = clampLine(raw.body, BODY_MAX);
    const unlockAt = normalizeUnlock(raw.unlockAt != null ? raw.unlockAt : raw.unlock);
    if (!title || !body || unlockAt == null) return null;
    const created = stamp(raw.created != null ? raw.created : raw.updated);
    return {
      id: clampId(raw.id) || uid(),
      title: title,
      body: body,
      tag: clampLine(raw.tag, TAG_MAX),
      unlockAt: unlockAt,
      revealed: raw.revealed === true,
      created: created,
      updated: stamp(raw.updated != null ? raw.updated : created),
    };
  }

  function takeTakes(list, cap) {
    const seen = Object.create(null);
    const takes = [];
    if (!Array.isArray(list)) return takes;
    for (let i = 0; i < list.length; i++) {
      const take = normalizeTake(list[i]);
      if (!take || seen[take.id]) continue;
      seen[take.id] = true;
      takes.push(take);
      if (takes.length >= cap) break;
    }
    return takes;
  }

  function emptyState() {
    return { v: 1, filter: "all", takes: [] };
  }

  function normalizeFilter(value) {
    if (value === "all" || value === "sealed" || value === "exposed") return value;
    return null;
  }

  function normalizeState(raw) {
    const base = emptyState();
    if (!raw || typeof raw !== "object") return base;
    return {
      v: 1,
      filter: normalizeFilter(raw.filter) || "all",
      takes: takeTakes(raw.takes, TAKE_CAP),
    };
  }

  function copyState(state, takes) {
    return { v: 1, filter: state.filter, takes: takes };
  }

  function buildTake(draft, now, id, previous) {
    const title = clampLine(draft && draft.title, TITLE_MAX);
    if (!title) return { ok: false, reason: "title" };
    const body = clampLine(draft && draft.body, BODY_MAX);
    if (!body) return { ok: false, reason: "body" };
    const unlockAt = normalizeUnlock(draft && draft.unlockAt);
    if (unlockAt == null) return { ok: false, reason: "unlock" };
    if (unlockAt > stamp(now) + MAX_AHEAD_MS) return { ok: false, reason: "far" };
    const revealed = Boolean(previous && previous.revealed && unlockAt <= stamp(now));
    return {
      ok: true,
      take: {
        id: id || uid(),
        title: title,
        body: body,
        tag: clampLine(draft && draft.tag, TAG_MAX),
        unlockAt: unlockAt,
        revealed: revealed,
        created: previous ? previous.created : stamp(now),
        updated: stamp(now),
      },
    };
  }

  function addTake(state, draft, now) {
    if (state.takes.length >= TAKE_CAP) return { ok: false, reason: "cap", state: state };
    const built = buildTake(draft, now);
    if (!built.ok) return { ok: false, reason: built.reason, state: state };
    return {
      ok: true,
      take: built.take,
      state: copyState(state, [built.take].concat(state.takes)),
    };
  }

  function updateTake(state, id, draft, now) {
    const idx = state.takes.findIndex(function (take) { return take.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state };
    const built = buildTake(draft, now, id, state.takes[idx]);
    if (!built.ok) return { ok: false, reason: built.reason, state: state };
    const next = state.takes.slice();
    next[idx] = built.take;
    return { ok: true, take: built.take, state: copyState(state, next) };
  }

  function removeTake(state, id) {
    const idx = state.takes.findIndex(function (take) { return take.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state, take: null, index: -1 };
    const next = state.takes.slice();
    const take = next[idx];
    next.splice(idx, 1);
    return { ok: true, take: take, index: idx, state: copyState(state, next) };
  }

  function restoreTake(state, take, index) {
    const clean = normalizeTake(take);
    if (!clean) return { ok: false, reason: "title", state: state };
    if (state.takes.some(function (row) { return row.id === clean.id; })) {
      return { ok: false, reason: "exists", state: state };
    }
    if (state.takes.length >= TAKE_CAP) return { ok: false, reason: "cap", state: state };
    const next = state.takes.slice();
    const at = Math.max(0, Math.min(Number(index) || 0, next.length));
    next.splice(at, 0, clean);
    return { ok: true, state: copyState(state, next) };
  }

  function revealTake(state, id, now) {
    const idx = state.takes.findIndex(function (take) { return take.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state };
    const take = state.takes[idx];
    if (phase(take, stamp(now)) === "sealed") return { ok: false, reason: "locked", state: state };
    if (take.revealed) return { ok: true, take: take, state: state };
    const next = state.takes.slice();
    const opened = {
      id: take.id,
      title: take.title,
      body: take.body,
      tag: take.tag,
      unlockAt: take.unlockAt,
      revealed: true,
      created: take.created,
      updated: stamp(now),
    };
    next[idx] = opened;
    return { ok: true, take: opened, state: copyState(state, next) };
  }

  function exposeArmed(state, ids, now) {
    const at = stamp(now);
    let next = state;
    const opened = [];
    const list = Array.isArray(ids) ? ids : [];
    for (let i = 0; i < list.length; i++) {
      const id = list[i];
      const take = next.takes.find(function (row) { return row.id === id; });
      if (!take || take.revealed || at < take.unlockAt) continue;
      const result = revealTake(next, id, at);
      if (!result.ok) continue;
      next = result.state;
      opened.push(id);
    }
    return { state: next, opened: opened };
  }

  function clearTakes(state) {
    return copyState(state, []);
  }

  function setFilter(state, filter) {
    const next = normalizeFilter(filter);
    if (!next) return state;
    return { v: 1, filter: next, takes: state.takes };
  }

  function visibleTakes(state, now) {
    const at = stamp(now);
    const list = state.takes.filter(function (take) {
      const name = phase(take, at);
      switch (state.filter) {
        case "all":
          return true;
        case "sealed":
          return name === "sealed" || name === "ready";
        case "exposed":
          return name === "exposed";
        default: {
          const _never = state.filter;
          throw new Error("Unknown filter " + _never);
        }
      }
    });
    list.sort(function (a, b) {
      const pa = phase(a, at);
      const pb = phase(b, at);
      const rank = phaseRank(pa) - phaseRank(pb);
      if (rank) return rank;
      switch (pa) {
        case "sealed":
          return a.unlockAt - b.unlockAt || a.title.localeCompare(b.title);
        case "ready":
          return b.unlockAt - a.unlockAt || a.title.localeCompare(b.title);
        case "exposed":
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
    const list = visibleTakes({ v: 1, filter: "all", takes: state.takes }, now);
    return list.length ? list[0] : null;
  }

  function counts(state, now) {
    const at = stamp(now);
    const tally = { all: state.takes.length, sealed: 0, ready: 0, exposed: 0 };
    state.takes.forEach(function (take) {
      const name = phase(take, at);
      switch (name) {
        case "sealed":
        case "ready":
        case "exposed":
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

  function publicFace(take, now) {
    const name = phase(take, stamp(now));
    return {
      phase: name,
      stamp: phaseStamp(name),
      label: phaseLabel(name),
      title: take.title,
      tag: take.tag,
      unlockAt: take.unlockAt,
      body: name === "exposed" ? take.body : "",
    };
  }

  function sampleDraft(now) {
    return {
      title: "City vs Coast",
      body: "City's home crowd carries the fourth. Coast looks fine until the travel day shows.",
      tag: "City",
      unlockAt: presetUnlock("60", now),
    };
  }

  function slim(take) {
    const out = {
      id: take.id,
      title: take.title,
      body: take.body,
      unlockAt: take.unlockAt,
      created: take.created,
      updated: take.updated,
    };
    if (take.tag) out.tag = take.tag;
    if (take.revealed) out.revealed = true;
    return out;
  }

  function shareVault(state) {
    return {
      v: 1,
      k: "vault",
      e: state.takes.slice(0, TAKE_CAP).map(slim),
    };
  }

  function shareCard(take) {
    const clean = normalizeTake(take);
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
    const takes = takeTakes(raw.e, kind === "card" ? 1 : TAKE_CAP);
    if (!takes.length) return null;
    return { v: 1, k: kind, takes: takes };
  }

  function replaceWithShare(state, share) {
    return copyState(state, share.takes.slice(0, TAKE_CAP));
  }

  function mergeShare(state, share) {
    const have = Object.create(null);
    state.takes.forEach(function (take) { have[take.id] = true; });
    const fresh = [];
    let skipped = 0;
    share.takes.forEach(function (take) {
      if (have[take.id]) {
        skipped += 1;
        return;
      }
      have[take.id] = true;
      fresh.push(take);
    });
    const room = Math.max(0, TAKE_CAP - state.takes.length);
    const added = fresh.slice(0, room);
    return {
      state: copyState(state, added.concat(state.takes)),
      added: added.length,
      skipped: skipped,
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

  root.TakeLock = {
    STORAGE_KEY: STORAGE_KEY,
    TAKE_CAP: TAKE_CAP,
    TITLE_MAX: TITLE_MAX,
    BODY_MAX: BODY_MAX,
    TAG_MAX: TAG_MAX,
    MAX_AHEAD_MS: MAX_AHEAD_MS,
    phase: phase,
    phaseStamp: phaseStamp,
    phaseLabel: phaseLabel,
    formatCountdown: formatCountdown,
    formatUnlock: formatUnlock,
    presetUnlock: presetUnlock,
    emptyState: emptyState,
    normalizeState: normalizeState,
    addTake: addTake,
    updateTake: updateTake,
    removeTake: removeTake,
    restoreTake: restoreTake,
    revealTake: revealTake,
    exposeArmed: exposeArmed,
    clearTakes: clearTakes,
    setFilter: setFilter,
    visibleTakes: visibleTakes,
    spotlight: spotlight,
    counts: counts,
    publicFace: publicFace,
    sampleDraft: sampleDraft,
    shareVault: shareVault,
    shareCard: shareCard,
    parseShare: parseShare,
    replaceWithShare: replaceWithShare,
    mergeShare: mergeShare,
    compressPayload: compressPayload,
    decompressPayload: decompressPayload,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
