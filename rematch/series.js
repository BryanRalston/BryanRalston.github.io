(function (root) {
  const STORAGE_KEY = "rematch-v1";
  const SERIES_CAP = 24;
  const TITLE_MAX = 60;
  const NAME_MAX = 18;
  const STAKES_MAX = 80;
  const NOTE_MAX = 80;
  const ID_MAX = 40;
  const BEST_MIN = 1;
  const BEST_MAX = 21;
  const PRESETS = [3, 5, 7];
  const SAMPLE_ID = "sample-fifa";

  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "s-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function clampLine(value, max) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u001F]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
  }

  function nameOr(value, fallback) {
    return clampLine(value, NAME_MAX) || fallback;
  }

  function winsNeeded(bestOf) {
    return Math.ceil(bestOf / 2);
  }

  function normalizeBestOf(value) {
    const n = typeof value === "number" ? value : parseInt(String(value == null ? "" : value), 10);
    if (!Number.isFinite(n)) return null;
    const rounded = Math.round(n);
    if (rounded < BEST_MIN || rounded > BEST_MAX) return null;
    if (rounded % 2 === 0) return null;
    return rounded;
  }

  function normalizeGame(raw) {
    if (!raw || typeof raw !== "object") return null;
    let winner = null;
    if (raw.winner === "you" || raw.w === "y") winner = "you";
    else if (raw.winner === "rival" || raw.w === "r") winner = "rival";
    if (!winner) return null;
    const at = Number(raw.at != null ? raw.at : raw.t);
    return {
      winner: winner,
      note: clampLine(raw.note != null ? raw.note : raw.n, NOTE_MAX),
      at: Number.isFinite(at) ? at : 0,
    };
  }

  function sidePhrase(name, role, kind) {
    const stockYou = role === "you" && name === "You";
    const stockRival = role === "rival" && name === "Rival";
    switch (kind) {
      case "lead":
        if (stockYou) return "You lead";
        if (stockRival) return "They lead";
        return name + " leads";
      case "clinched":
        if (stockYou) return "You clinched";
        if (stockRival) return "They clinched";
        return name + " clinched";
      case "need":
        if (stockYou) return "You need";
        if (stockRival) return "They need";
        return name + " needs";
      default: {
        const _never = kind;
        throw new Error("Unknown phrase " + _never);
      }
    }
  }

  function tally(games) {
    let you = 0;
    let rival = 0;
    games.forEach(function (game) {
      if (game.winner === "you") you += 1;
      else if (game.winner === "rival") rival += 1;
    });
    return { you: you, rival: rival };
  }

  function statusOf(score, played, need) {
    if (score.you >= need) return "you";
    if (score.rival >= need) return "rival";
    if (played > 0 && score.you === score.rival) return "tied";
    return "active";
  }

  function summary(series) {
    const score = tally(series.games);
    const need = winsNeeded(series.bestOf);
    const status = statusOf(score, series.games.length, need);
    let headline;
    switch (status) {
      case "you":
        headline = sidePhrase(series.you, "you", "clinched");
        break;
      case "rival":
        headline = sidePhrase(series.rival, "rival", "clinched");
        break;
      case "tied":
        headline = "Tied";
        break;
      case "active":
        if (series.games.length === 0) headline = "Series open";
        else if (score.you > score.rival) headline = sidePhrase(series.you, "you", "lead");
        else headline = sidePhrase(series.rival, "rival", "lead");
        break;
      default: {
        const _never = status;
        throw new Error("Unknown status " + _never);
      }
    }
    let detail;
    switch (status) {
      case "you":
      case "rival":
        detail = "Final · Best of " + series.bestOf;
        break;
      case "tied":
      case "active":
        detail = "First to " + need
          + " · " + sidePhrase(series.you, "you", "need") + " " + (need - score.you)
          + " · " + sidePhrase(series.rival, "rival", "need") + " " + (need - score.rival);
        break;
      default: {
        const _never = status;
        throw new Error("Unknown status " + _never);
      }
    }
    return {
      you: score.you,
      rival: score.rival,
      need: need,
      status: status,
      played: series.games.length,
      youLeft: Math.max(0, need - score.you),
      rivalLeft: Math.max(0, need - score.rival),
      clinched: status === "you" || status === "rival",
      headline: headline,
      detail: detail,
    };
  }

  function normalizeSeries(raw) {
    if (!raw || typeof raw !== "object") return null;
    const title = clampLine(raw.title, TITLE_MAX);
    const bestOf = normalizeBestOf(raw.bestOf != null ? raw.bestOf : raw.bo);
    if (!title || !bestOf) return null;
    const id = clampLine(raw.id, ID_MAX) || uid();
    const gamesIn = Array.isArray(raw.games) ? raw.games : (Array.isArray(raw.g) ? raw.g : []);
    const games = [];
    const need = winsNeeded(bestOf);
    let you = 0;
    let rival = 0;
    for (let i = 0; i < gamesIn.length; i += 1) {
      if (you >= need || rival >= need) break;
      if (games.length >= bestOf) break;
      const game = normalizeGame(gamesIn[i]);
      if (!game) continue;
      games.push(game);
      if (game.winner === "you") you += 1;
      else rival += 1;
    }
    const created = Number(raw.created);
    const updated = Number(raw.updated);
    return {
      id: id,
      title: title,
      bestOf: bestOf,
      stakes: clampLine(raw.stakes, STAKES_MAX),
      you: nameOr(raw.you, "You"),
      rival: nameOr(raw.rival, "Rival"),
      games: games,
      created: Number.isFinite(created) ? created : 0,
      updated: Number.isFinite(updated) ? updated : 0,
    };
  }

  function emptyState() {
    return { v: 1, you: "You", rival: "Rival", activeId: "", series: [] };
  }

  function normalizeState(raw) {
    const next = emptyState();
    if (!raw || typeof raw !== "object") return next;
    next.you = nameOr(raw.you, "You");
    next.rival = nameOr(raw.rival, "Rival");
    const list = Array.isArray(raw.series) ? raw.series : [];
    const seen = Object.create(null);
    list.forEach(function (item) {
      if (next.series.length >= SERIES_CAP) return;
      const series = normalizeSeries(item);
      if (!series || seen[series.id]) return;
      seen[series.id] = true;
      next.series.push(series);
    });
    const activeId = typeof raw.activeId === "string" ? raw.activeId : "";
    next.activeId = next.series.some(function (series) { return series.id === activeId; }) ? activeId : "";
    return next;
  }

  function replaceSeries(state, id, series) {
    state.series = state.series.map(function (row) {
      return row.id === id ? series : row;
    });
  }

  function setNames(state, you, rival) {
    const next = normalizeState(state);
    next.you = nameOr(you, "You");
    next.rival = nameOr(rival, "Rival");
    if (next.activeId) {
      const active = next.series.find(function (series) { return series.id === next.activeId; });
      if (active) {
        replaceSeries(next, active.id, {
          id: active.id,
          title: active.title,
          bestOf: active.bestOf,
          stakes: active.stakes,
          you: next.you,
          rival: next.rival,
          games: active.games,
          created: active.created,
          updated: active.updated,
        });
      }
    }
    return { ok: true, state: next };
  }

  function startSeries(state, draft, now) {
    const next = normalizeState(state);
    if (next.series.length >= SERIES_CAP) return { ok: false, reason: "cap", state: next };
    const title = clampLine(draft && draft.title, TITLE_MAX);
    if (!title) return { ok: false, reason: "title", state: next };
    const bestOf = normalizeBestOf(draft && draft.bestOf);
    if (!bestOf) return { ok: false, reason: "bestOf", state: next };
    const series = {
      id: uid(),
      title: title,
      bestOf: bestOf,
      stakes: clampLine(draft && draft.stakes, STAKES_MAX),
      you: next.you,
      rival: next.rival,
      games: [],
      created: now,
      updated: now,
    };
    next.series = [series].concat(next.series);
    next.activeId = series.id;
    return { ok: true, state: next, series: series };
  }

  function logGame(state, id, winner, note, now) {
    const next = normalizeState(state);
    if (winner !== "you" && winner !== "rival") return { ok: false, reason: "winner", state: next };
    const current = next.series.find(function (series) { return series.id === id; });
    if (!current) return { ok: false, reason: "missing", state: next };
    if (summary(current).clinched) return { ok: false, reason: "clinched", state: next };
    const game = normalizeGame({ winner: winner, note: note, at: now });
    if (!game) return { ok: false, reason: "winner", state: next };
    const updated = {
      id: current.id,
      title: current.title,
      bestOf: current.bestOf,
      stakes: current.stakes,
      you: current.you,
      rival: current.rival,
      games: current.games.concat([game]),
      created: current.created,
      updated: now,
    };
    replaceSeries(next, id, updated);
    return { ok: true, state: next, series: updated };
  }

  function undoLastGame(state, id) {
    const next = normalizeState(state);
    const current = next.series.find(function (series) { return series.id === id; });
    if (!current) return { ok: false, reason: "missing", state: next };
    if (!current.games.length) return { ok: false, reason: "empty", state: next };
    const games = current.games.slice(0, -1);
    const updated = {
      id: current.id,
      title: current.title,
      bestOf: current.bestOf,
      stakes: current.stakes,
      you: current.you,
      rival: current.rival,
      games: games,
      created: current.created,
      updated: games.length ? games[games.length - 1].at : current.created,
    };
    replaceSeries(next, id, updated);
    return { ok: true, state: next, series: updated };
  }

  function removeSeries(state, id) {
    const next = normalizeState(state);
    const idx = next.series.findIndex(function (series) { return series.id === id; });
    if (idx < 0) return { ok: false, reason: "missing", state: next, removed: null, index: -1, wasActive: false };
    const removed = next.series[idx];
    const wasActive = next.activeId === id;
    next.series = next.series.filter(function (series) { return series.id !== id; });
    if (wasActive) next.activeId = "";
    return { ok: true, state: next, removed: removed, index: idx, wasActive: wasActive };
  }

  function restoreSeries(state, series, index, wasActive) {
    const next = normalizeState(state);
    const clean = normalizeSeries(series);
    if (!clean) return { ok: false, reason: "missing", state: next };
    if (next.series.some(function (row) { return row.id === clean.id; })) {
      return { ok: false, reason: "exists", state: next };
    }
    if (next.series.length >= SERIES_CAP) return { ok: false, reason: "cap", state: next };
    const copy = next.series.slice();
    const at = Math.max(0, Math.min(Number(index) || 0, copy.length));
    copy.splice(at, 0, clean);
    next.series = copy;
    if (wasActive) next.activeId = clean.id;
    return { ok: true, state: next };
  }

  function clearSeries(state) {
    const next = normalizeState(state);
    const previous = next.series;
    const activeId = next.activeId;
    next.series = [];
    next.activeId = "";
    return { ok: true, state: next, previous: previous, activeId: activeId };
  }

  function restoreAll(state, previous, activeId) {
    const next = normalizeState({
      v: 1,
      you: state && state.you,
      rival: state && state.rival,
      activeId: activeId,
      series: previous || [],
    });
    return { ok: true, state: next };
  }

  function activateSeries(state, id) {
    const next = normalizeState(state);
    const series = next.series.find(function (row) { return row.id === id; });
    if (!series) return { ok: false, reason: "missing", state: next };
    next.activeId = series.id;
    next.you = series.you;
    next.rival = series.rival;
    return { ok: true, state: next, series: series };
  }

  function shelveSeries(state) {
    const next = normalizeState(state);
    if (!next.activeId) return { ok: false, reason: "missing", state: next };
    const series = next.series.find(function (row) { return row.id === next.activeId; });
    if (!series) return { ok: false, reason: "missing", state: next };
    next.activeId = "";
    return { ok: true, state: next, series: series };
  }

  function fromSenderSide(series) {
    return {
      id: series.id,
      title: series.title,
      bestOf: series.bestOf,
      stakes: series.stakes,
      you: series.you === "You" ? "Sender" : series.you,
      rival: series.rival === "Rival" ? "Them" : series.rival,
      games: series.games,
      created: series.created,
      updated: series.updated,
    };
  }

  function sampleSeries(now, you, rival) {
    return {
      id: SAMPLE_ID,
      title: "FIFA 25",
      bestOf: 5,
      stakes: "Loser buys wings",
      you: nameOr(you, "You"),
      rival: nameOr(rival, "Rival"),
      games: [
        { winner: "you", note: "Early counter", at: now - 300000 },
        { winner: "rival", note: "", at: now - 200000 },
        { winner: "you", note: "OT nailbiter", at: now - 100000 },
      ],
      created: now - 300000,
      updated: now - 100000,
    };
  }

  function loadSample(state, now) {
    const next = normalizeState(state);
    const existing = next.series.find(function (series) { return series.id === SAMPLE_ID; });
    if (existing) {
      next.activeId = existing.id;
      next.you = existing.you;
      next.rival = existing.rival;
      return { ok: true, state: next, already: true, series: existing };
    }
    if (next.series.length >= SERIES_CAP) return { ok: false, reason: "cap", state: next };
    const series = normalizeSeries(sampleSeries(now, next.you, next.rival));
    next.series = [series].concat(next.series);
    next.activeId = series.id;
    return { ok: true, state: next, already: false, series: series };
  }

  function shareSeries(series) {
    const clean = normalizeSeries(series);
    if (!clean) return null;
    return {
      v: 1,
      k: "series",
      s: {
        id: clean.id,
        title: clean.title,
        bo: clean.bestOf,
        stakes: clean.stakes,
        you: clean.you,
        rival: clean.rival,
        g: clean.games.map(function (game) {
          const out = { w: game.winner === "you" ? "y" : "r", t: game.at };
          if (game.note) out.n = game.note;
          return out;
        }),
        created: clean.created,
        updated: clean.updated,
      },
    };
  }

  function parseShare(raw) {
    if (!raw || typeof raw !== "object" || raw.k !== "series") return null;
    const series = normalizeSeries(raw.s);
    if (!series) return null;
    return { v: 1, k: "series", series: fromSenderSide(series) };
  }

  function keepShare(state, share) {
    const next = normalizeState(state);
    const incoming = share && share.series ? normalizeSeries(share.series) : null;
    if (!incoming) return { ok: false, reason: "missing", state: next };
    if (next.series.some(function (series) { return series.id === incoming.id; })) {
      return { ok: false, reason: "exists", state: next, series: incoming };
    }
    let dropped = null;
    if (next.series.length >= SERIES_CAP) {
      let dropAt = -1;
      for (let i = next.series.length - 1; i >= 0; i -= 1) {
        if (next.series[i].id !== next.activeId) {
          dropAt = i;
          break;
        }
      }
      if (dropAt < 0) return { ok: false, reason: "cap", state: next };
      dropped = next.series[dropAt];
      next.series = next.series.filter(function (_, index) { return index !== dropAt; });
    }
    next.series = [incoming].concat(next.series);
    const becameActive = !next.activeId;
    if (becameActive) next.activeId = incoming.id;
    return {
      ok: true,
      state: next,
      series: incoming,
      dropped: dropped,
      becameActive: becameActive,
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

  root.Rematch = {
    STORAGE_KEY: STORAGE_KEY,
    SERIES_CAP: SERIES_CAP,
    TITLE_MAX: TITLE_MAX,
    NAME_MAX: NAME_MAX,
    STAKES_MAX: STAKES_MAX,
    NOTE_MAX: NOTE_MAX,
    BEST_MIN: BEST_MIN,
    BEST_MAX: BEST_MAX,
    PRESETS: PRESETS,
    winsNeeded: winsNeeded,
    normalizeBestOf: normalizeBestOf,
    emptyState: emptyState,
    normalizeState: normalizeState,
    summary: summary,
    setNames: setNames,
    startSeries: startSeries,
    logGame: logGame,
    undoLastGame: undoLastGame,
    removeSeries: removeSeries,
    restoreSeries: restoreSeries,
    clearSeries: clearSeries,
    restoreAll: restoreAll,
    activateSeries: activateSeries,
    shelveSeries: shelveSeries,
    loadSample: loadSample,
    shareSeries: shareSeries,
    parseShare: parseShare,
    keepShare: keepShare,
    compressPayload: compressPayload,
    decompressPayload: decompressPayload,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
