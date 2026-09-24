(function (root) {
  const STORAGE_KEY = "beat-log-v1";
  const ENTRY_CAP = 48;
  const TITLE_MAX = 80;
  const PLATFORM_MAX = 40;
  const TAKE_MAX = 140;
  const STATUSES = ["wishlist", "playing", "beaten", "dropped"];
  const PLATFORMS = ["Switch", "PlayStation", "Xbox", "PC", "Steam Deck", "Phone"];

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

  function normalizeStatus(value) {
    const status = String(value == null ? "" : value).trim().toLowerCase();
    if (STATUSES.indexOf(status) === -1) return null;
    return status;
  }

  function normalizeRating(value) {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isFinite(n)) return null;
    const halves = Math.round(n * 2);
    if (halves < 1 || halves > 10) return null;
    return halves / 2;
  }

  function stamp(now) {
    const n = Number(now);
    return Number.isFinite(n) ? Math.round(n) : Date.now();
  }

  function statusLabel(status) {
    switch (status) {
      case "wishlist":
        return "Wishlist";
      case "playing":
        return "Playing";
      case "beaten":
        return "Beaten";
      case "dropped":
        return "Dropped";
      default: {
        const _never = status;
        throw new Error("Unknown status " + _never);
      }
    }
  }

  function filterLabel(filter) {
    switch (filter) {
      case "all":
        return "All";
      case "wishlist":
        return "Wishlist";
      case "playing":
        return "Playing";
      case "beaten":
        return "Beaten";
      case "dropped":
        return "Dropped";
      default: {
        const _never = filter;
        throw new Error("Unknown filter " + _never);
      }
    }
  }

  function ratingPhrase(rating) {
    if (rating == null) return "Unrated";
    const rounded = Math.round(rating * 2) / 2;
    const text = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
    if (rounded === 1) return "1 star";
    return text + " stars";
  }

  function starPercent(rating) {
    if (rating == null) return 0;
    return (rating / 5) * 100;
  }

  function normalizeEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    const title = clampLine(raw.title, TITLE_MAX);
    if (!title) return null;
    const status = normalizeStatus(raw.status) || "wishlist";
    const platform = clampLine(raw.platform, PLATFORM_MAX);
    const take = clampLine(raw.take, TAKE_MAX);
    const rating = normalizeRating(raw.rating);
    const id = clampId(raw.id) || uid();
    return {
      id: id,
      title: title,
      status: status,
      platform: platform,
      rating: rating,
      take: take,
      updated: stamp(raw.updated),
    };
  }

  function takeEntries(list, cap) {
    const seen = Object.create(null);
    const entries = [];
    if (!Array.isArray(list)) return entries;
    for (let i = 0; i < list.length; i++) {
      const entry = normalizeEntry(list[i]);
      if (!entry || seen[entry.id]) continue;
      seen[entry.id] = true;
      entries.push(entry);
      if (entries.length >= cap) break;
    }
    return entries;
  }

  function emptyState() {
    return { v: 1, filter: "all", sort: "recent", entries: [] };
  }

  function normalizeFilter(value) {
    if (value === "all") return "all";
    return normalizeStatus(value) || "all";
  }

  function normalizeSort(value) {
    if (value === "recent" || value === "title") return value;
    return "recent";
  }

  function normalizeState(raw) {
    const base = emptyState();
    if (!raw || typeof raw !== "object") return base;
    return {
      v: 1,
      filter: normalizeFilter(raw.filter),
      sort: normalizeSort(raw.sort),
      entries: takeEntries(raw.entries, ENTRY_CAP),
    };
  }

  function copyState(state, entries) {
    return {
      v: 1,
      filter: state.filter,
      sort: state.sort,
      entries: entries,
    };
  }

  function buildEntry(draft, now, id) {
    const title = clampLine(draft && draft.title, TITLE_MAX);
    if (!title) return { ok: false, reason: "title" };
    const status = normalizeStatus(draft && draft.status);
    if (!status) return { ok: false, reason: "status" };
    const rawRating = draft ? draft.rating : null;
    let rating = null;
    if (rawRating != null && rawRating !== "") {
      rating = normalizeRating(rawRating);
      if (rating == null) return { ok: false, reason: "rating" };
    }
    return {
      ok: true,
      entry: {
        id: id || uid(),
        title: title,
        status: status,
        platform: clampLine(draft && draft.platform, PLATFORM_MAX),
        rating: rating,
        take: clampLine(draft && draft.take, TAKE_MAX),
        updated: stamp(now),
      },
    };
  }

  function addEntry(state, draft, now) {
    if (state.entries.length >= ENTRY_CAP) return { ok: false, reason: "cap", state: state };
    const built = buildEntry(draft, now);
    if (!built.ok) return { ok: false, reason: built.reason, state: state };
    return {
      ok: true,
      entry: built.entry,
      state: copyState(state, [built.entry].concat(state.entries)),
    };
  }

  function updateEntry(state, id, draft, now) {
    const idx = state.entries.findIndex(function (entry) { return entry.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state };
    const built = buildEntry(draft, now, id);
    if (!built.ok) return { ok: false, reason: built.reason, state: state };
    const next = state.entries.slice();
    next[idx] = built.entry;
    return { ok: true, entry: built.entry, state: copyState(state, next) };
  }

  function removeEntry(state, id) {
    const idx = state.entries.findIndex(function (entry) { return entry.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: state, entry: null, index: -1 };
    const next = state.entries.slice();
    const entry = next[idx];
    next.splice(idx, 1);
    return { ok: true, entry: entry, index: idx, state: copyState(state, next) };
  }

  function restoreEntry(state, entry, index) {
    const clean = normalizeEntry(entry);
    if (!clean) return { ok: false, reason: "title", state: state };
    if (state.entries.some(function (row) { return row.id === clean.id; })) {
      return { ok: false, reason: "exists", state: state };
    }
    if (state.entries.length >= ENTRY_CAP) return { ok: false, reason: "cap", state: state };
    const next = state.entries.slice();
    const at = Math.max(0, Math.min(Number(index) || 0, next.length));
    next.splice(at, 0, clean);
    return { ok: true, state: copyState(state, next) };
  }

  function setFilter(state, filter) {
    const next = filter === "all" ? "all" : normalizeStatus(filter);
    if (!next) return state;
    return { v: 1, filter: next, sort: state.sort, entries: state.entries };
  }

  function setSort(state, sort) {
    const next = normalizeSort(sort);
    if (sort !== "recent" && sort !== "title") return state;
    return { v: 1, filter: state.filter, sort: next, entries: state.entries };
  }

  function visibleEntries(state) {
    let list = state.entries.slice();
    if (state.filter !== "all") {
      list = list.filter(function (entry) { return entry.status === state.filter; });
    }
    if (state.sort === "title") {
      list.sort(function (a, b) {
        const byTitle = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        if (byTitle) return byTitle;
        return b.updated - a.updated;
      });
    } else if (state.sort === "recent") {
      list.sort(function (a, b) {
        if (b.updated !== a.updated) return b.updated - a.updated;
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      });
    } else {
      const _never = state.sort;
      throw new Error("Unknown sort " + _never);
    }
    return list;
  }

  function counts(state) {
    const tally = { all: state.entries.length, wishlist: 0, playing: 0, beaten: 0, dropped: 0 };
    state.entries.forEach(function (entry) {
      switch (entry.status) {
        case "wishlist":
        case "playing":
        case "beaten":
        case "dropped":
          tally[entry.status] += 1;
          break;
        default: {
          const _never = entry.status;
          throw new Error("Unknown status " + _never);
        }
      }
    });
    return tally;
  }

  function slim(entry) {
    const out = {
      id: entry.id,
      title: entry.title,
      status: entry.status,
      updated: entry.updated,
    };
    if (entry.platform) out.platform = entry.platform;
    if (entry.take) out.take = entry.take;
    if (entry.rating != null) out.rating = entry.rating;
    return out;
  }

  function shareShelf(state) {
    return {
      v: 1,
      k: "shelf",
      e: state.entries.slice(0, ENTRY_CAP).map(slim),
    };
  }

  function shareCard(entry) {
    const clean = normalizeEntry(entry);
    if (!clean) return null;
    return { v: 1, k: "card", e: [slim(clean)] };
  }

  function parseShare(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.e)) return null;
    let kind = null;
    if (raw.k === "card") kind = "card";
    else if (raw.k === "shelf") kind = "shelf";
    if (!kind) return null;
    const entries = takeEntries(raw.e, kind === "card" ? 1 : ENTRY_CAP);
    if (!entries.length) return null;
    return { v: 1, k: kind, entries: entries };
  }

  function replaceWithShare(state, share) {
    return copyState(state, share.entries.slice(0, ENTRY_CAP));
  }

  function mergeShare(state, share) {
    const have = Object.create(null);
    state.entries.forEach(function (entry) { have[entry.id] = true; });
    const fresh = [];
    let skipped = 0;
    share.entries.forEach(function (entry) {
      if (have[entry.id]) {
        skipped += 1;
        return;
      }
      have[entry.id] = true;
      fresh.push(entry);
    });
    const room = Math.max(0, ENTRY_CAP - state.entries.length);
    const added = fresh.slice(0, room);
    return {
      state: copyState(state, added.concat(state.entries)),
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

  root.BeatLog = {
    STORAGE_KEY: STORAGE_KEY,
    ENTRY_CAP: ENTRY_CAP,
    TITLE_MAX: TITLE_MAX,
    PLATFORM_MAX: PLATFORM_MAX,
    TAKE_MAX: TAKE_MAX,
    STATUSES: STATUSES,
    PLATFORMS: PLATFORMS,
    statusLabel: statusLabel,
    filterLabel: filterLabel,
    ratingPhrase: ratingPhrase,
    starPercent: starPercent,
    normalizeRating: normalizeRating,
    emptyState: emptyState,
    normalizeState: normalizeState,
    addEntry: addEntry,
    updateEntry: updateEntry,
    removeEntry: removeEntry,
    restoreEntry: restoreEntry,
    setFilter: setFilter,
    setSort: setSort,
    visibleEntries: visibleEntries,
    counts: counts,
    shareShelf: shareShelf,
    shareCard: shareCard,
    parseShare: parseShare,
    replaceWithShare: replaceWithShare,
    mergeShare: mergeShare,
    compressPayload: compressPayload,
    decompressPayload: decompressPayload,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
