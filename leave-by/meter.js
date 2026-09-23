(function (root) {
  const STORAGE_KEY = "leave-by-v1";
  const HISTORY_CAP = 12;
  const EXTEND_MIN = 15;
  const CHIPS = [15, 30, 45, 60, 90, 120];
  const NOTE_MAX = 80;
  const MAX_AHEAD_MIN = 16 * 60;
  const PAID_MAX = 999.99;

  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clampNote(value) {
    return String(value == null ? "" : value)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, NOTE_MAX);
  }

  function parsePaid(value) {
    if (value == null) return { ok: true, paid: null };
    const raw = String(value).trim();
    if (!raw) return { ok: true, paid: null };
    const cleaned = raw.replace(/[$\s]/g, "").replace(/,/g, "");
    if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return { ok: false, reason: "paid", paid: null };
    const paid = Math.round(Number(cleaned) * 100) / 100;
    if (paid > PAID_MAX) return { ok: false, reason: "paid", paid: null };
    return { ok: true, paid: paid };
  }

  function normalizePaid(value) {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isFinite(n) || n < 0 || n > PAID_MAX) return null;
    return Math.round(n * 100) / 100;
  }

  function normalizeSource(value) {
    if (value === "clock" || value === "replay" || value === "chip") return value;
    return "chip";
  }

  function finiteMs(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n);
  }

  function emptyState() {
    return { v: 1, current: null, history: [] };
  }

  function normalizeSession(raw) {
    if (!raw || typeof raw !== "object") return null;
    const startedAt = finiteMs(raw.startedAt);
    const leaveAt = finiteMs(raw.leaveAt);
    if (!startedAt || !leaveAt || leaveAt <= startedAt) return null;
    if (leaveAt - startedAt > MAX_AHEAD_MIN * 60000 + 60000) return null;
    const durationMin = Math.round(Number(raw.durationMin));
    const extendedMin = Math.round(Number(raw.extendedMin));
    if (!Number.isInteger(durationMin) || durationMin < 1 || durationMin > MAX_AHEAD_MIN) return null;
    if (!Number.isInteger(extendedMin) || extendedMin < 0 || extendedMin > MAX_AHEAD_MIN) return null;
    const endedRaw = Number(raw.endedAt);
    const endedAt = Number.isFinite(endedRaw) && endedRaw > 0 ? Math.round(endedRaw) : 0;
    return {
      id: String(raw.id || uid()).slice(0, 64),
      startedAt: startedAt,
      leaveAt: leaveAt,
      durationMin: durationMin,
      extendedMin: extendedMin,
      note: clampNote(raw.note),
      paid: normalizePaid(raw.paid),
      endedAt: endedAt,
      source: normalizeSource(raw.source),
    };
  }

  function toHistoryItem(session) {
    return {
      id: session.id,
      startedAt: session.startedAt,
      leaveAt: session.leaveAt,
      durationMin: session.durationMin,
      extendedMin: session.extendedMin,
      note: session.note,
      paid: session.paid,
      endedAt: session.endedAt || session.leaveAt,
      source: session.source,
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return emptyState();
    const history = Array.isArray(raw.history)
      ? raw.history
          .map(normalizeSession)
          .filter(Boolean)
          .slice(0, HISTORY_CAP)
          .map(toHistoryItem)
      : [];
    return {
      v: 1,
      current: normalizeSession(raw.current),
      history: history,
    };
  }

  function withHistory(state, session) {
    const next = {
      v: 1,
      current: state.current,
      history: state.history.slice(),
    };
    const clean = normalizeSession(session);
    if (!clean) return next;
    const item = toHistoryItem(clean);
    const idx = next.history.findIndex(function (row) {
      return row.id === item.id;
    });
    if (idx === 0) {
      next.history[0] = item;
      return next;
    }
    if (idx > 0) next.history.splice(idx, 1);
    next.history.unshift(item);
    if (next.history.length > HISTORY_CAP) next.history.length = HISTORY_CAP;
    return next;
  }

  function createSession(fields) {
    return normalizeSession({
      id: fields.id || uid(),
      startedAt: fields.startedAt,
      leaveAt: fields.leaveAt,
      durationMin: fields.durationMin,
      extendedMin: fields.extendedMin || 0,
      note: fields.note,
      paid: fields.paid,
      endedAt: fields.endedAt || 0,
      source: fields.source,
    });
  }

  function startFromMinutes(minutes, note, paidInput, now, source) {
    const mins = Math.round(Number(minutes));
    if (!Number.isInteger(mins) || mins < 1 || mins > MAX_AHEAD_MIN) {
      return { ok: false, reason: "range" };
    }
    const paidParsed = parsePaid(paidInput);
    if (!paidParsed.ok) return { ok: false, reason: "paid" };
    const startedAt = now;
    const session = createSession({
      startedAt: startedAt,
      leaveAt: startedAt + mins * 60000,
      durationMin: mins,
      note: note,
      paid: paidParsed.paid,
      source: source || (CHIPS.indexOf(mins) === -1 ? "replay" : "chip"),
    });
    if (!session) return { ok: false, reason: "invalid" };
    return { ok: true, session: session };
  }

  function startFromChip(minutes, note, paidInput, now) {
    if (CHIPS.indexOf(minutes) === -1) return { ok: false, reason: "chip" };
    return startFromMinutes(minutes, note, paidInput, now, "chip");
  }

  function parseClockInput(value) {
    const match = /^(\d{1,2}):(\d{2})/.exec(String(value || "").trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return { hours: hours, minutes: minutes };
  }

  function startFromClock(hours, minutes, note, paidInput, now) {
    const h = Number(hours);
    const m = Number(minutes);
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      return { ok: false, reason: "clock" };
    }
    const paidParsed = parsePaid(paidInput);
    if (!paidParsed.ok) return { ok: false, reason: "paid" };
    const base = new Date(now);
    const leaveAt = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0).getTime();
    if (leaveAt <= now) return { ok: false, reason: "past" };
    if (leaveAt - now < 60 * 1000) return { ok: false, reason: "short" };
    if (leaveAt - now > MAX_AHEAD_MIN * 60000) return { ok: false, reason: "long" };
    const durationMin = Math.max(1, Math.round((leaveAt - now) / 60000));
    const session = createSession({
      startedAt: now,
      leaveAt: leaveAt,
      durationMin: durationMin,
      note: note,
      paid: paidParsed.paid,
      source: "clock",
    });
    if (!session) return { ok: false, reason: "invalid" };
    return { ok: true, session: session };
  }

  function extendSession(session, now) {
    const current = normalizeSession(session);
    if (!current) return { ok: false, reason: "invalid" };
    if (current.endedAt || current.leaveAt <= now) return { ok: false, reason: "ended" };
    const nextLeave = current.leaveAt + EXTEND_MIN * 60000;
    if (nextLeave - current.startedAt > MAX_AHEAD_MIN * 60000) {
      return { ok: false, reason: "cap" };
    }
    const next = normalizeSession({
      id: current.id,
      startedAt: current.startedAt,
      leaveAt: nextLeave,
      durationMin: current.durationMin,
      extendedMin: current.extendedMin + EXTEND_MIN,
      note: current.note,
      paid: current.paid,
      endedAt: 0,
      source: current.source,
    });
    if (!next) return { ok: false, reason: "cap" };
    return { ok: true, session: next };
  }

  function archiveCurrent(state, now) {
    const next = normalizeState(state);
    if (!next.current) return next;
    if (!next.current.endedAt) {
      const endedAt = now < next.current.leaveAt ? now : next.current.leaveAt;
      next.current = normalizeSession({
        id: next.current.id,
        startedAt: next.current.startedAt,
        leaveAt: next.current.leaveAt,
        durationMin: next.current.durationMin,
        extendedMin: next.current.extendedMin,
        note: next.current.note,
        paid: next.current.paid,
        endedAt: endedAt,
        source: next.current.source,
      });
    }
    const stored = withHistory(next, next.current);
    stored.current = next.current;
    return stored;
  }

  function endEarly(state, now) {
    const next = normalizeState(state);
    if (!next.current) return { ok: false, reason: "empty", state: next };
    if (next.current.endedAt) return { ok: true, already: true, state: next };
    return { ok: true, already: false, state: archiveCurrent(next, now) };
  }

  function clearCurrent(state, now) {
    const archived = archiveCurrent(state, now);
    archived.current = null;
    return archived;
  }

  function adoptSession(state, session, now) {
    const clean = normalizeSession(session);
    const base = normalizeState(state);
    if (!clean) return { ok: false, reason: "invalid", state: base };
    const archived = archiveCurrent(base, now);
    archived.current = clean;
    return { ok: true, state: archived };
  }

  function clearHistory(state) {
    const next = normalizeState(state);
    next.history = [];
    return next;
  }

  function finishIfExpired(state, now) {
    const next = normalizeState(state);
    if (!next.current || next.current.endedAt || next.current.leaveAt > now) {
      return { state: next, changed: false };
    }
    const stamped = normalizeSession({
      id: next.current.id,
      startedAt: next.current.startedAt,
      leaveAt: next.current.leaveAt,
      durationMin: next.current.durationMin,
      extendedMin: next.current.extendedMin,
      note: next.current.note,
      paid: next.current.paid,
      endedAt: next.current.leaveAt,
      source: next.current.source,
    });
    const stored = withHistory({ v: 1, current: stamped, history: next.history }, stamped);
    stored.current = stamped;
    return { state: stored, changed: true };
  }

  function statusOf(session, now) {
    if (!session) return "empty";
    if (session.endedAt || session.leaveAt <= now) return "ended";
    return "active";
  }

  function remainingMs(session, now) {
    if (!session) return 0;
    if (session.endedAt) return 0;
    return Math.max(0, session.leaveAt - now);
  }

  function remainingParts(ms) {
    const safe = Math.max(0, Math.floor(Number(ms) || 0));
    const totalSeconds = Math.floor(safe / 1000);
    return {
      hours: Math.floor(totalSeconds / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      totalMinutes: Math.floor(safe / 60000),
    };
  }

  function formatDuration(minutes) {
    const n = Math.max(0, Math.round(Number(minutes) || 0));
    const h = Math.floor(n / 60);
    const m = n % 60;
    if (h && m) return h + " hr " + m + " min";
    if (h) return h + " hr";
    return m + " min";
  }

  function formatTick(ms) {
    const parts = remainingParts(ms);
    const ss = String(parts.seconds).padStart(2, "0");
    const mm = String(parts.minutes).padStart(2, "0");
    if (parts.hours) return parts.hours + ":" + mm + ":" + ss;
    return mm + ":" + ss;
  }

  function formatRemaining(ms) {
    if (ms <= 0) return "0 min";
    const parts = remainingParts(ms);
    const mins = parts.hours * 60 + parts.minutes;
    if (mins === 0) return "under 1 min";
    return formatDuration(mins);
  }

  function spokenRemaining(ms) {
    if (ms <= 0) return "Meter ended. 0 minutes remaining.";
    const parts = remainingParts(ms);
    const mins = parts.hours * 60 + parts.minutes;
    if (mins === 0) return "Less than a minute remaining.";
    if (mins === 1) return "1 minute remaining.";
    return mins + " minutes remaining.";
  }

  function formatLeaveBy(ts, now) {
    const when = new Date(ts);
    const time = when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    if (now == null) return time;
    const today = new Date(now);
    const sameDay =
      today.getFullYear() === when.getFullYear() &&
      today.getMonth() === when.getMonth() &&
      today.getDate() === when.getDate();
    if (sameDay) return time;
    const day = when.toLocaleDateString(undefined, { weekday: "short" });
    return time + " · " + day;
  }

  function formatPaid(paid) {
    if (paid == null) return "";
    return "$" + Number(paid).toFixed(2);
  }

  function meterSummary(session) {
    if (!session) return "";
    const base = formatDuration(session.durationMin);
    if (session.extendedMin) return base + " · +" + session.extendedMin + " min";
    if (session.source === "clock") return "Clock · " + base;
    if (session.source === "replay") return "Same length · " + base;
    return base + " meter";
  }

  function endedCopy(session) {
    if (!session || !session.endedAt) return "";
    if (session.endedAt < session.leaveAt) return "You closed this meter with time still on it.";
    return "Time's up.";
  }

  function urgency(session, now) {
    const status = statusOf(session, now);
    if (status === "ended") return "ended";
    if (status !== "active") return "empty";
    const left = session.leaveAt - now;
    if (left <= 2 * 60 * 1000) return "urgent";
    if (left <= 10 * 60 * 1000) return "short";
    return "calm";
  }

  function drainRatio(session, now) {
    if (!session) return 0;
    if (session.endedAt || session.leaveAt <= now) return 0;
    const total = session.leaveAt - session.startedAt;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, (session.leaveAt - now) / total));
  }

  function totalMinutes(session) {
    if (!session) return 0;
    return session.durationMin + session.extendedMin;
  }

  function sharePayload(session) {
    const src = normalizeSession(session);
    if (!src) return null;
    return {
      v: 1,
      id: src.id,
      startedAt: src.startedAt,
      leaveAt: src.leaveAt,
      durationMin: src.durationMin,
      extendedMin: src.extendedMin,
      note: src.note,
      endedAt: src.endedAt,
      source: src.source,
    };
  }

  function parseSharePayload(raw) {
    const session = normalizeSession(raw);
    if (!session) return null;
    return {
      id: session.id,
      startedAt: session.startedAt,
      leaveAt: session.leaveAt,
      durationMin: session.durationMin,
      extendedMin: session.extendedMin,
      note: session.note,
      paid: null,
      endedAt: session.endedAt,
      source: session.source,
    };
  }

  function historyMeta(item) {
    const bits = [formatDuration(totalMinutes(item))];
    if (item.extendedMin) bits.push("extended");
    if (item.note) bits.push(item.note);
    if (item.paid != null) bits.push(formatPaid(item.paid));
    return bits.join(" · ");
  }

  const LeaveBy = {
    STORAGE_KEY: STORAGE_KEY,
    HISTORY_CAP: HISTORY_CAP,
    EXTEND_MIN: EXTEND_MIN,
    CHIPS: CHIPS,
    NOTE_MAX: NOTE_MAX,
    MAX_AHEAD_MIN: MAX_AHEAD_MIN,
    emptyState: emptyState,
    clampNote: clampNote,
    parsePaid: parsePaid,
    parseClockInput: parseClockInput,
    normalizeSession: normalizeSession,
    normalizeState: normalizeState,
    startFromMinutes: startFromMinutes,
    startFromChip: startFromChip,
    startFromClock: startFromClock,
    extendSession: extendSession,
    endEarly: endEarly,
    clearCurrent: clearCurrent,
    adoptSession: adoptSession,
    clearHistory: clearHistory,
    finishIfExpired: finishIfExpired,
    statusOf: statusOf,
    remainingMs: remainingMs,
    remainingParts: remainingParts,
    formatDuration: formatDuration,
    formatTick: formatTick,
    formatRemaining: formatRemaining,
    spokenRemaining: spokenRemaining,
    formatLeaveBy: formatLeaveBy,
    formatPaid: formatPaid,
    meterSummary: meterSummary,
    endedCopy: endedCopy,
    urgency: urgency,
    drainRatio: drainRatio,
    totalMinutes: totalMinutes,
    sharePayload: sharePayload,
    parseSharePayload: parseSharePayload,
    historyMeta: historyMeta,
  };

  root.LeaveBy = LeaveBy;
})(typeof globalThis !== "undefined" ? globalThis : this);
