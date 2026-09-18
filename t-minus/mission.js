const Mission = (() => {
  const STORAGE_KEY = "t-minus-v1";
  const HASH_PREFIX = "#t=";
  const UNIT_DAYS = { days: 1, weeks: 7, months: 365.25 / 12, years: 365.25 };
  const UNITS = ["days", "weeks", "months", "years"];
  const CATEGORIES = ["calendar", "normal", "disliked", "custom"];
  const CALENDARS = ["mondays", "fridays", "weekends", "paychecks", "summers", "holidays"];
  const PAYCHECK_EPOCH = "2020-01-03";

  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clip(value, max) {
    return String(value == null ? "" : value).slice(0, max);
  }

  function clampText(value, max) {
    return clip(value, max).trim();
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toISODate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  function parseISODate(iso) {
    const parts = String(iso || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
    if (d.getFullYear() !== parts[0] || d.getMonth() !== parts[1] - 1 || d.getDate() !== parts[2]) return null;
    return d;
  }

  function todayISO(now) {
    const d = now ? new Date(now.getTime()) : new Date();
    return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0));
  }

  function addMonths(date, months) {
    const next = new Date(date.getTime());
    const day = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + months);
    const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, last));
    next.setHours(12, 0, 0, 0);
    return next;
  }

  function addYears(date, years) {
    return addMonths(date, years * 12);
  }

  function daysInclusive(fromISO, toISO) {
    const from = parseISODate(fromISO);
    const to = parseISODate(toISO);
    if (!from || !to || to < from) return 0;
    return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  }

  function ageOn(birthISO, onISO) {
    const birth = parseISODate(birthISO);
    const on = parseISODate(onISO);
    if (!birth || !on || on < birth) return null;
    let years = on.getFullYear() - birth.getFullYear();
    if (on.getMonth() < birth.getMonth() || (on.getMonth() === birth.getMonth() && on.getDate() < birth.getDate())) {
      years -= 1;
    }
    return years;
  }

  function retireDateFromAge(birthISO, age) {
    const birth = parseISODate(birthISO);
    const years = Number(age);
    if (!birth || !Number.isFinite(years) || years < 1 || years > 120) return "";
    return toISODate(addYears(birth, years));
  }

  function countWeekdays(fromISO, toISO, weekday) {
    const from = parseISODate(fromISO);
    const to = parseISODate(toISO);
    if (!from || !to || to < from) return 0;
    const span = Math.round((to.getTime() - from.getTime()) / 86400000);
    const delta = (weekday - from.getDay() + 7) % 7;
    if (delta > span) return 0;
    return Math.floor((span - delta) / 7) + 1;
  }

  function countPaychecks(fromISO, toISO) {
    const from = parseISODate(fromISO);
    const to = parseISODate(toISO);
    const epoch = parseISODate(PAYCHECK_EPOCH);
    if (!from || !to || !epoch || to < from) return 0;
    const firstDelta = (5 - from.getDay() + 7) % 7;
    const cursor = new Date(from.getTime());
    cursor.setDate(cursor.getDate() + firstDelta);
    let count = 0;
    while (cursor <= to) {
      const fromEpoch = Math.round((cursor.getTime() - epoch.getTime()) / 86400000);
      if (fromEpoch % 14 === 0) count += 1;
      cursor.setDate(cursor.getDate() + 7);
    }
    return count;
  }

  function countSeasonOverlaps(fromISO, toISO, startMonth, startDay, endMonth, endDay) {
    const from = parseISODate(fromISO);
    const to = parseISODate(toISO);
    if (!from || !to || to < from) return 0;
    let count = 0;
    for (let year = from.getFullYear(); year <= to.getFullYear(); year += 1) {
      const seasonStart = new Date(year, startMonth - 1, startDay, 12, 0, 0, 0);
      const seasonEnd = new Date(year, endMonth - 1, endDay, 12, 0, 0, 0);
      if (from <= seasonEnd && to >= seasonStart) count += 1;
    }
    return count;
  }

  function cadenceRemaining(daysLeft, count, per, unit) {
    if (daysLeft <= 0) return 0;
    const unitDays = UNIT_DAYS[unit] || 7;
    const periodDays = Math.max(0.0001, (Number(per) || 1) * unitDays);
    const n = (Number(count) || 0) * (daysLeft / periodDays);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n);
  }

  function starterMarkers() {
    return [
      { id: "mondays", name: "Mondays", kind: "calendar", calendar: "mondays", category: "calendar", active: true, starter: true, hero: true },
      { id: "fridays", name: "Fridays", kind: "calendar", calendar: "fridays", category: "calendar", active: true, starter: true },
      { id: "weekends", name: "Weekends", kind: "calendar", calendar: "weekends", category: "calendar", active: true, starter: true },
      { id: "paychecks", name: "Paychecks", kind: "calendar", calendar: "paychecks", category: "calendar", active: true, starter: true, note: "biweekly" },
      { id: "summers", name: "Summers", kind: "calendar", calendar: "summers", category: "calendar", active: true, starter: true },
      { id: "holidays", name: "Holiday seasons", kind: "calendar", calendar: "holidays", category: "calendar", active: true, starter: true },
      { id: "coffees", name: "Coffees", kind: "cadence", count: 10, per: 1, unit: "weeks", category: "normal", active: true, starter: true },
      { id: "haircuts", name: "Haircuts", kind: "cadence", count: 1, per: 3, unit: "weeks", category: "normal", active: true, starter: true },
      { id: "gym", name: "Gym sessions", kind: "cadence", count: 3, per: 1, unit: "weeks", category: "normal", active: true, starter: true },
      { id: "grocery", name: "Grocery runs", kind: "cadence", count: 1, per: 1, unit: "weeks", category: "normal", active: true, starter: true },
      { id: "laundry", name: "Laundry days", kind: "cadence", count: 2, per: 1, unit: "weeks", category: "normal", active: true, starter: true },
      { id: "oil", name: "Oil changes", kind: "cadence", count: 2, per: 1, unit: "years", category: "normal", active: true, starter: true },
      { id: "alarms", name: "Alarms", kind: "cadence", count: 5, per: 1, unit: "weeks", category: "disliked", active: true, starter: true },
      { id: "commutes", name: "Commutes", kind: "cadence", count: 5, per: 1, unit: "weeks", category: "disliked", active: true, starter: true },
      { id: "syncs", name: "Quick syncs", kind: "cadence", count: 3, per: 1, unit: "weeks", category: "disliked", active: true, starter: true },
      { id: "passwords", name: "Password resets", kind: "cadence", count: 1, per: 1, unit: "months", category: "disliked", active: true, starter: true },
      { id: "dmv", name: "DMV mornings", kind: "cadence", count: 2, per: 1, unit: "years", category: "disliked", active: true, starter: true },
      { id: "reviews", name: "Perf-review seasons", kind: "cadence", count: 1, per: 1, unit: "years", category: "disliked", active: true, starter: true },
      { id: "junk", name: "Junk-mail weeks", kind: "cadence", count: 1, per: 1, unit: "weeks", category: "disliked", active: true, starter: true },
      { id: "hold", name: "Hold-music calls", kind: "cadence", count: 1, per: 1, unit: "months", category: "disliked", active: true, starter: true },
    ].map(normalizeMarker).filter(Boolean);
  }

  function emptyState() {
    return {
      v: 1,
      briefed: false,
      birth: "",
      retireMode: "date",
      retireDate: "",
      retireAge: 65,
      objective: "",
      earlyRetireDate: "",
      markers: starterMarkers(),
      goals: [],
    };
  }

  function sampleState() {
    return {
      v: 1,
      briefed: true,
      birth: "1978-06-15",
      retireMode: "date",
      retireDate: "2043-06-15",
      retireAge: 65,
      objective: "First Monday that belongs to nobody but you.",
      earlyRetireDate: "",
      markers: starterMarkers(),
      goals: [],
    };
  }

  function normalizeUnit(unit) {
    const value = String(unit || "weeks").toLowerCase();
    return UNITS.indexOf(value) >= 0 ? value : "weeks";
  }

  function normalizeCategory(cat) {
    const value = String(cat || "custom").toLowerCase();
    return CATEGORIES.indexOf(value) >= 0 ? value : "custom";
  }

  function normalizeCalendar(kind) {
    const value = String(kind || "").toLowerCase();
    return CALENDARS.indexOf(value) >= 0 ? value : "";
  }

  function numOr(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function normalizeMarker(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = clampText(raw.name, 40);
    if (!name) return null;
    const kind = raw.kind === "calendar" ? "calendar" : "cadence";
    const calendar = kind === "calendar" ? normalizeCalendar(raw.calendar) : "";
    if (kind === "calendar" && !calendar) return null;
    return {
      id: clip(raw.id, 64) || uid(),
      name,
      kind,
      calendar,
      count: numOr(raw.count, 1, 0, 9999),
      per: numOr(raw.per, 1, 0.01, 999),
      unit: normalizeUnit(raw.unit),
      category: normalizeCategory(raw.category || (kind === "calendar" ? "calendar" : "custom")),
      active: raw.active !== false,
      starter: !!raw.starter,
      hero: !!raw.hero,
      note: clampText(raw.note, 32),
    };
  }

  function normalizeGoal(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = clampText(raw.name, 40);
    if (!name) return null;
    return {
      id: clip(raw.id, 64) || uid(),
      name,
      target: numOr(raw.target, 0, 0, 1e12),
      current: numOr(raw.current, 0, 0, 1e12),
      monthly: numOr(raw.monthly, 0, 0, 1e9),
      returnPct: numOr(raw.returnPct, 0, 0, 40),
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return emptyState();
    const markers = Array.isArray(raw.markers) ? raw.markers.map(normalizeMarker).filter(Boolean) : starterMarkers();
    return {
      v: 1,
      briefed: !!raw.briefed,
      birth: clampText(raw.birth, 10),
      retireMode: raw.retireMode === "age" ? "age" : "date",
      retireDate: clampText(raw.retireDate, 10),
      retireAge: numOr(raw.retireAge, 65, 1, 120),
      objective: clampText(raw.objective, 140),
      earlyRetireDate: clampText(raw.earlyRetireDate, 10),
      markers: markers.length ? markers : starterMarkers(),
      goals: Array.isArray(raw.goals) ? raw.goals.map(normalizeGoal).filter(Boolean) : [],
    };
  }

  function missionEndISO(state) {
    if (state.retireMode === "age") {
      return retireDateFromAge(state.birth, state.retireAge);
    }
    return parseISODate(state.retireDate) ? state.retireDate : "";
  }

  function boardEndISO(state) {
    if (state.earlyRetireDate && parseISODate(state.earlyRetireDate)) return state.earlyRetireDate;
    return missionEndISO(state);
  }

  function calendarRemaining(calendar, fromISO, toISO) {
    switch (calendar) {
      case "mondays":
        return countWeekdays(fromISO, toISO, 1);
      case "fridays":
        return countWeekdays(fromISO, toISO, 5);
      case "weekends":
        return countWeekdays(fromISO, toISO, 6);
      case "paychecks":
        return countPaychecks(fromISO, toISO);
      case "summers":
        return countSeasonOverlaps(fromISO, toISO, 6, 1, 8, 31);
      case "holidays":
        return countSeasonOverlaps(fromISO, toISO, 11, 15, 12, 31);
      default:
        return 0;
    }
  }

  function markerRemaining(marker, fromISO, toISO) {
    if (!marker) return 0;
    if (marker.kind === "calendar") return calendarRemaining(marker.calendar, fromISO, toISO);
    return cadenceRemaining(daysInclusive(fromISO, toISO), marker.count, marker.per, marker.unit);
  }

  function cadenceLabel(marker) {
    if (!marker) return "";
    if (marker.kind === "calendar") {
      if (marker.calendar === "paychecks") return "biweekly";
      if (marker.calendar === "weekends") return "Sat–Sun";
      if (marker.calendar === "summers") return "Jun–Aug";
      if (marker.calendar === "holidays") return "Nov–Dec";
      return "on the calendar";
    }
    const count = marker.count;
    const per = marker.per;
    const unit = marker.unit.replace(/s$/, "");
    if (per === 1) return count + " / " + unit;
    return count + " / " + per + " " + marker.unit;
  }

  function projectGoal(goal, asOfISO) {
    const asOf = parseISODate(asOfISO) || parseISODate(todayISO());
    const target = Number(goal && goal.target) || 0;
    const current = Number(goal && goal.current) || 0;
    const monthly = Number(goal && goal.monthly) || 0;
    const annualPct = Number(goal && goal.returnPct) || 0;
    const pct = target > 0 ? (current / target) * 100 : 0;
    const base = { pct, months: null, hitDate: "", reachable: false, already: current >= target && target > 0 };

    if (!asOf || target <= 0) return base;
    if (current >= target) {
      return { pct, months: 0, hitDate: toISODate(asOf), reachable: true, already: true };
    }

    const r = annualPct / 100 / 12;
    let months = null;

    if (monthly <= 0 && r <= 0) return base;

    if (monthly <= 0) {
      if (current <= 0 || r <= 0) return base;
      const n = Math.log(target / current) / Math.log(1 + r);
      if (!Number.isFinite(n) || n < 0) return base;
      months = Math.ceil(n);
    } else if (r <= 0) {
      months = Math.ceil((target - current) / monthly);
    } else {
      const denom = current + monthly / r;
      if (denom <= 0) return base;
      const g = (target + monthly / r) / denom;
      if (g <= 0) return base;
      const n = Math.log(g) / Math.log(1 + r);
      if (!Number.isFinite(n) || n < 0) return base;
      months = Math.ceil(n);
    }

    if (!Number.isFinite(months) || months < 0 || months > 1200) return base;
    return {
      pct,
      months,
      hitDate: toISODate(addMonths(asOf, months)),
      reachable: true,
      already: false,
    };
  }

  function board(state, asOfISO) {
    const from = asOfISO || todayISO();
    const officialEnd = missionEndISO(state);
    const end = boardEndISO(state);
    const early = !!(state.earlyRetireDate && end && state.earlyRetireDate === end && officialEnd && end !== officialEnd);
    const days = end ? daysInclusive(from, end) : 0;
    const rows = (state.markers || [])
      .filter((row) => row.active)
      .map((row) => ({
        marker: row,
        remaining: end ? markerRemaining(row, from, end) : 0,
        label: cadenceLabel(row),
      }));
    const hero = rows.find((row) => row.marker.hero || row.marker.calendar === "mondays") || rows[0] || null;
    const goals = (state.goals || []).map((goal) => {
      const projection = projectGoal(goal, from);
      const earlier = !!(projection.reachable && projection.hitDate && officialEnd && projection.hitDate < officialEnd);
      return { goal, projection, earlier };
    });
    return {
      from,
      officialEnd,
      end,
      early,
      days,
      ageNow: ageOn(state.birth, from),
      ageAtEnd: ageOn(state.birth, end),
      mondays: end ? calendarRemaining("mondays", from, end) : 0,
      hero,
      rows,
      goals,
      ready: !!(state.briefed && parseISODate(state.birth) && end),
    };
  }

  function sharePayload(state) {
    const view = board(state);
    return {
      v: 1,
      birth: state.birth,
      retireMode: state.retireMode,
      retireDate: state.retireDate,
      retireAge: state.retireAge,
      objective: state.objective,
      earlyRetireDate: state.earlyRetireDate || "",
      earlyLabel: view.early ? "Early extraction" : "",
      markers: (state.markers || []).map((row) => ({
        id: row.id,
        name: row.name,
        kind: row.kind,
        calendar: row.calendar,
        count: row.count,
        per: row.per,
        unit: row.unit,
        category: row.category,
        active: row.active,
        starter: row.starter,
        hero: row.hero,
        note: row.note,
      })),
    };
  }

  function payloadLooksLikeMoney(value) {
    if (value == null) return false;
    if (typeof value === "string") {
      if (/\$/.test(value)) return true;
      if (/\b(target|current|monthly|returnPct|balance|amount|dollars?|401k)\b/i.test(value) && /\d/.test(value)) {
        return /\$/.test(value);
      }
      return false;
    }
    if (typeof value === "object") {
      const keys = Object.keys(value);
      if (keys.some((key) => /^(target|current|monthly|returnPct|balance|amount|dollars)$/i.test(key))) return true;
      return keys.some((key) => payloadLooksLikeMoney(value[key]));
    }
    return false;
  }

  function shareOmitsMoney(state) {
    const payload = sharePayload(state);
    const json = JSON.stringify(payload);
    return !payloadLooksLikeMoney(payload) && json.indexOf("$") < 0 && !/"goals"\s*:/.test(json);
  }

  function formatInt(n) {
    const value = Math.round(Number(n) || 0);
    return value.toLocaleString("en-US");
  }

  function formatMoney(n) {
    const value = Number(n) || 0;
    return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }

  function formatLong(iso) {
    const d = parseISODate(iso);
    if (!d) return iso || "—";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function upsertMarker(state, payload) {
    const saved = normalizeMarker(payload);
    if (!saved) return null;
    const idx = state.markers.findIndex((row) => row.id === saved.id);
    if (idx >= 0) {
      if (state.markers[idx].hero) saved.hero = true;
      if (state.markers[idx].starter) saved.starter = true;
      state.markers[idx] = saved;
    } else {
      state.markers.push(saved);
    }
    return saved;
  }

  function removeMarker(state, id) {
    const before = state.markers.length;
    state.markers = state.markers.filter((row) => row.id !== id);
    return state.markers.length !== before;
  }

  function restoreStarter(state, starterId) {
    const catalog = starterMarkers();
    const fresh = catalog.find((row) => row.id === starterId);
    if (!fresh) return null;
    const idx = state.markers.findIndex((row) => row.id === starterId);
    if (idx >= 0) {
      state.markers[idx].active = true;
      return state.markers[idx];
    }
    state.markers.push(fresh);
    return fresh;
  }

  function upsertGoal(state, payload) {
    const saved = normalizeGoal(payload);
    if (!saved) return null;
    const idx = state.goals.findIndex((row) => row.id === saved.id);
    if (idx >= 0) state.goals[idx] = saved;
    else state.goals.push(saved);
    return saved;
  }

  function removeGoal(state, id) {
    const before = state.goals.length;
    state.goals = state.goals.filter((row) => row.id !== id);
    return state.goals.length !== before;
  }

  function applyEarlyRetire(state, iso) {
    const date = parseISODate(iso);
    if (!date) return false;
    state.earlyRetireDate = toISODate(date);
    return true;
  }

  function clearEarlyRetire(state) {
    state.earlyRetireDate = "";
  }

  return {
    STORAGE_KEY,
    HASH_PREFIX,
    UNITS,
    starterMarkers,
    emptyState,
    sampleState,
    normalizeState,
    normalizeMarker,
    normalizeGoal,
    uid,
    clip,
    clampText,
    toISODate,
    parseISODate,
    todayISO,
    addMonths,
    daysInclusive,
    ageOn,
    retireDateFromAge,
    countWeekdays,
    countPaychecks,
    countSeasonOverlaps,
    cadenceRemaining,
    cadenceLabel,
    calendarRemaining,
    markerRemaining,
    missionEndISO,
    boardEndISO,
    projectGoal,
    board,
    sharePayload,
    shareOmitsMoney,
    payloadLooksLikeMoney,
    formatInt,
    formatMoney,
    formatLong,
    upsertMarker,
    removeMarker,
    restoreStarter,
    upsertGoal,
    removeGoal,
    applyEarlyRetire,
    clearEarlyRetire,
  };
})();
