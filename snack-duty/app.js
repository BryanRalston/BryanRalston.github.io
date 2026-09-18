(() => {
  const STORAGE_KEY = "snack-duty-v1";
  const HASH_PREFIX = "#s=";

  const els = {
    storageFail: document.getElementById("storageFail"),
    appView: document.getElementById("appView"),
    emptyState: document.getElementById("emptyState"),
    mainApp: document.getElementById("mainApp"),
    nextStamp: document.getElementById("nextStamp"),
    nextStampDay: document.getElementById("nextStampDay"),
    nextStampLabel: document.getElementById("nextStampLabel"),
    onDeck: document.getElementById("onDeck"),
    groupBar: document.getElementById("groupBar"),
    suggestCard: document.getElementById("suggestCard"),
    undoRow: document.getElementById("undoRow"),
    datesSub: document.getElementById("datesSub"),
    datesEmpty: document.getElementById("datesEmpty"),
    dateList: document.getElementById("dateList"),
    familiesSub: document.getElementById("familiesSub"),
    familiesEmpty: document.getElementById("familiesEmpty"),
    familyList: document.getElementById("familyList"),
    clipView: document.getElementById("clipView"),
    printSheet: document.getElementById("printSheet"),
    groupDialog: document.getElementById("groupDialog"),
    groupForm: document.getElementById("groupForm"),
    groupDialogTitle: document.getElementById("groupDialogTitle"),
    familyDialog: document.getElementById("familyDialog"),
    familyForm: document.getElementById("familyForm"),
    familyDialogTitle: document.getElementById("familyDialogTitle"),
    btnDeleteFamily: document.getElementById("btnDeleteFamily"),
    dateDialog: document.getElementById("dateDialog"),
    dateForm: document.getElementById("dateForm"),
    dateDialogTitle: document.getElementById("dateDialogTitle"),
    dateFamilySelect: document.getElementById("dateFamilySelect"),
    dateSuggestHint: document.getElementById("dateSuggestHint"),
    btnDeleteDate: document.getElementById("btnDeleteDate"),
    aboutDialog: document.getElementById("aboutDialog"),
    shareDialog: document.getElementById("shareDialog"),
    shareUrlBox: document.getElementById("shareUrlBox"),
    toast: document.getElementById("toast"),
    mobileCta: document.getElementById("mobileCta"),
    btnMobilePrimary: document.getElementById("btnMobilePrimary"),
  };

  let storageOk = true;
  let state = emptyStore();
  let view = "app";
  let toastTimer = 0;

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clip(value, max) {
    return String(value || "").slice(0, max);
  }

  function clampText(value, max) {
    return clip(value, max).trim();
  }

  function emptyStore() {
    return { v: 1, group: null, families: [], assignments: [], undo: null };
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toISODate(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  function parseISODate(iso) {
    const parts = String(iso || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }

  function todayISO() {
    const now = new Date();
    return toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0));
  }

  function addDays(date, days) {
    const next = new Date(date.getTime());
    next.setDate(next.getDate() + days);
    return next;
  }

  function saturdayOnOrAfter(date) {
    const d = new Date(date.getTime());
    const add = (6 - d.getDay() + 7) % 7;
    return addDays(d, add);
  }

  function saturdayBefore(date) {
    const d = new Date(date.getTime());
    const sub = d.getDay() === 6 ? 7 : d.getDay() + 1;
    return addDays(d, -sub);
  }

  function formatLong(iso) {
    const d = parseISODate(iso);
    if (!d) return iso || "—";
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  function formatShort(iso) {
    const d = parseISODate(iso);
    if (!d) return iso || "—";
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatStamp(iso) {
    const d = parseISODate(iso);
    if (!d) return "—";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function daysUntil(iso) {
    const target = parseISODate(iso);
    const today = parseISODate(todayISO());
    if (!target || !today) return 0;
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  function relativePhrase(iso) {
    const n = daysUntil(iso);
    if (n === 0) return "Today";
    if (n === 1) return "Tomorrow";
    if (n === -1) return "Yesterday";
    if (n > 1) return n + " days out";
    return Math.abs(n) + " days ago";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeFamily(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = clampText(raw.name, 40);
    if (!name) return null;
    return {
      id: clip(raw.id, 64) || uid(),
      name,
      dietary: clampText(raw.dietary, 48),
    };
  }

  function normalizeAssignment(raw) {
    if (!raw || typeof raw !== "object") return null;
    const date = clampText(raw.date, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    return {
      id: clip(raw.id, 64) || uid(),
      date,
      familyId: clip(raw.familyId, 64),
    };
  }

  function normalizeUndo(raw) {
    if (!raw || typeof raw !== "object") return null;
    const type = raw.type;
    if (type === "setFamily") {
      return {
        type: "setFamily",
        assignmentId: clip(raw.assignmentId, 64),
        prevFamilyId: clip(raw.prevFamilyId, 64),
      };
    }
    if (type === "add") {
      const assignment = normalizeAssignment(raw.assignment);
      return assignment ? { type: "add", assignment } : null;
    }
    if (type === "remove") {
      const assignment = normalizeAssignment(raw.assignment);
      return assignment ? { type: "remove", assignment } : null;
    }
    return null;
  }

  function normalizeGroup(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = clampText(raw.name, 48);
    if (!name) return null;
    return {
      name,
      season: clampText(raw.season, 32),
    };
  }

  function normalizeStore(raw) {
    if (!raw || typeof raw !== "object") return emptyStore();
    const families = Array.isArray(raw.families) ? raw.families.map(normalizeFamily).filter(Boolean) : [];
    const assignments = Array.isArray(raw.assignments)
      ? raw.assignments.map(normalizeAssignment).filter(Boolean)
      : [];
    return {
      v: 1,
      group: normalizeGroup(raw.group),
      families,
      assignments,
      undo: normalizeUndo(raw.undo),
    };
  }

  function toast(message, ms) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), ms || 2800);
  }

  function probeStorage() {
    try {
      const probe = STORAGE_KEY + "-probe";
      localStorage.setItem(probe, "ok");
      const readback = localStorage.getItem(probe);
      localStorage.removeItem(probe);
      return readback === "ok";
    } catch (_) {
      return false;
    }
  }

  function failStorage(reason) {
    storageOk = false;
    els.storageFail.hidden = false;
    els.storageFail.textContent =
      "Snack Duty cannot save on this device. Browser storage is blocked" +
      (reason ? " (" + reason + ")" : "") +
      ". The rotation will not persist.";
  }

  function loadStored() {
    if (!probeStorage()) {
      failStorage();
      return null;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalizeStore(JSON.parse(raw));
    } catch (err) {
      failStorage(err && err.message ? err.message : "unreadable store");
      return null;
    }
  }

  function save() {
    if (!storageOk) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      failStorage(err && err.name ? err.name : "write failed");
      return false;
    }
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
    let b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = b64.length % 4;
    if (padLen) b64 += "=".repeat(4 - padLen);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function compressPayload(json) {
    if (typeof CompressionStream === "undefined") {
      return "j." + bytesToB64url(new TextEncoder().encode(json));
    }
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate"));
    const buf = await new Response(stream).arrayBuffer();
    const z = "z." + bytesToB64url(new Uint8Array(buf));
    const j = "j." + bytesToB64url(new TextEncoder().encode(json));
    return z.length <= j.length ? z : j;
  }

  async function decompressPayload(token) {
    const kind = token.slice(0, 2);
    const body = token.slice(2);
    if (kind === "j.") {
      return new TextDecoder().decode(b64urlToBytes(body));
    }
    if (kind === "z.") {
      if (typeof DecompressionStream === "undefined") throw new Error("no decompress");
      const bytes = b64urlToBytes(body);
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
      return await new Response(stream).text();
    }
    return decodeURIComponent(escape(atob(token)));
  }

  function sharePayload() {
    return {
      v: 1,
      group: state.group,
      families: state.families,
      assignments: state.assignments,
    };
  }

  async function encodeShare() {
    const packed = await compressPayload(JSON.stringify(sharePayload()));
    return location.origin + location.pathname + HASH_PREFIX + packed;
  }

  async function tryImportHash() {
    const hash = location.hash || "";
    if (!hash.startsWith(HASH_PREFIX)) return null;
    try {
      const json = await decompressPayload(decodeURIComponent(hash.slice(HASH_PREFIX.length)));
      const data = normalizeStore(JSON.parse(json));
      history.replaceState(null, "", location.pathname + location.search);
      return data;
    } catch (_) {
      history.replaceState(null, "", location.pathname + location.search);
      toast("That snapshot link could not be read.", 3200);
      return null;
    }
  }

  function starterState() {
    const families = [
      { id: uid(), name: "Family A", dietary: "nut-free" },
      { id: uid(), name: "Family B", dietary: "" },
      { id: uid(), name: "Family C", dietary: "dairy-free" },
      { id: uid(), name: "Family D", dietary: "" },
      { id: uid(), name: "Family E", dietary: "no strawberries" },
    ];
    const today = parseISODate(todayISO());
    const lastSat = saturdayBefore(today);
    const prevSat = addDays(lastSat, -7);
    const nextSat = saturdayOnOrAfter(today);
    const dates = [
      { date: toISODate(prevSat), family: families[1] },
      { date: toISODate(lastSat), family: families[0] },
      { date: toISODate(nextSat), family: families[2] },
      { date: toISODate(addDays(nextSat, 7)), family: families[3] },
      { date: toISODate(addDays(nextSat, 14)), family: families[0] },
      { date: toISODate(addDays(nextSat, 21)), family: families[1] },
    ];
    return {
      v: 1,
      group: { name: "Soccer U8", season: "Fall 2026" },
      families,
      assignments: dates.map((row) => ({
        id: uid(),
        date: row.date,
        familyId: row.family.id,
      })),
      undo: null,
    };
  }

  function findFamily(id) {
    return state.families.find((row) => row.id === id) || null;
  }

  function findAssignment(id) {
    return state.assignments.find((row) => row.id === id) || null;
  }

  function assignmentOn(iso) {
    return state.assignments.find((row) => row.date === iso) || null;
  }

  function lastBroughtISO(familyId) {
    const dates = state.assignments
      .filter((row) => row.familyId === familyId)
      .map((row) => row.date)
      .sort();
    return dates.length ? dates[dates.length - 1] : "";
  }

  function sortedAssignments() {
    return state.assignments.slice().sort((a, b) => {
      if (a.date === b.date) return a.id.localeCompare(b.id);
      return a.date < b.date ? -1 : 1;
    });
  }

  function upcomingAssignments() {
    const today = todayISO();
    return sortedAssignments().filter((row) => row.date >= today);
  }

  function nextUp() {
    const upcoming = upcomingAssignments();
    return upcoming[0] || null;
  }

  function isToday(iso) {
    return iso === todayISO();
  }

  function longestWaitFamily() {
    if (!state.families.length) return null;
    const ranked = state.families
      .map((family) => {
        const last = lastBroughtISO(family.id);
        return { family, last };
      })
      .sort((a, b) => {
        if (!a.last && !b.last) return a.family.name.localeCompare(b.family.name);
        if (!a.last) return -1;
        if (!b.last) return 1;
        if (a.last === b.last) return a.family.name.localeCompare(b.family.name);
        return a.last < b.last ? -1 : 1;
      });
    return ranked[0] || null;
  }

  function nextOpenSaturday() {
    const today = parseISODate(todayISO());
    let cursor = saturdayOnOrAfter(today);
    for (let i = 0; i < 52; i += 1) {
      const iso = toISODate(cursor);
      if (!assignmentOn(iso)) return iso;
      cursor = addDays(cursor, 7);
    }
    return toISODate(addDays(saturdayOnOrAfter(today), 7));
  }

  function setUndo(action) {
    state.undo = action;
  }

  function applyUndo() {
    const action = state.undo;
    if (!action) return false;
    switch (action.type) {
      case "setFamily": {
        const row = findAssignment(action.assignmentId);
        if (!row) {
          state.undo = null;
          return false;
        }
        row.familyId = action.prevFamilyId;
        state.undo = null;
        return true;
      }
      case "add": {
        state.assignments = state.assignments.filter((row) => row.id !== action.assignment.id);
        state.undo = null;
        return true;
      }
      case "remove": {
        if (!findAssignment(action.assignment.id)) {
          state.assignments.push(action.assignment);
        }
        state.undo = null;
        return true;
      }
      default: {
        state.undo = null;
        return false;
      }
    }
  }

  function persist() {
    save();
    render();
  }

  function setView(next) {
    view = next;
    document.body.classList.toggle("is-clip", view === "clip");
    els.appView.hidden = view === "clip";
    els.clipView.hidden = view !== "clip";
    els.mobileCta.hidden = view === "clip";
    if (view === "clip") renderPrint();
  }

  function renderStamp() {
    const next = nextUp();
    if (!next) {
      els.nextStampDay.textContent = "—";
      els.nextStampLabel.textContent = "on deck";
      els.nextStamp.className = "due-stamp is-empty";
      els.nextStamp.title = "No upcoming snack date";
      return;
    }
    const family = findFamily(next.familyId);
    els.nextStampDay.textContent = formatStamp(next.date);
    els.nextStampLabel.textContent = isToday(next.date) ? "today" : "on deck";
    els.nextStamp.className = "due-stamp " + (isToday(next.date) ? "is-today" : "is-next");
    els.nextStamp.title = (family ? family.name : "Unassigned") + " · " + formatLong(next.date);
  }

  function renderOnDeck() {
    const next = nextUp();
    if (!next) {
      els.onDeck.className = "on-deck card";
      els.onDeck.innerHTML =
        "<p class=\"on-deck-kicker\">On deck</p>" +
        "<p class=\"on-deck-date\">No upcoming date</p>" +
        "<h2 class=\"on-deck-name\">Assign a Saturday</h2>" +
        "<p class=\"on-deck-meta\">Add a date so the sideline knows who is bringing snacks.</p>";
      return;
    }
    const family = findFamily(next.familyId);
    const today = isToday(next.date);
    els.onDeck.className = "on-deck card " + (today ? "is-today" : "is-next");
    const diet = family && family.dietary
      ? "<span class=\"chip diet\">" + escapeHtml(family.dietary) + "</span>"
      : "";
    els.onDeck.innerHTML =
      "<p class=\"on-deck-kicker\">" +
      (today ? "Today" : "Next up") +
      "</p>" +
      "<p class=\"on-deck-date\">" +
      escapeHtml(formatLong(next.date)) +
      " · " +
      escapeHtml(relativePhrase(next.date)) +
      "</p>" +
      "<h2 class=\"on-deck-name\" id=\"onDeckHeading\">" +
      escapeHtml(family ? family.name : "Unassigned") +
      "</h2>" +
      "<p class=\"on-deck-meta\">" +
      (family ? "Brings snacks." : "Pick a family for this date.") +
      "</p>" +
      diet;
  }

  function renderGroupBar() {
    const group = state.group;
    if (!group) {
      els.groupBar.innerHTML = "";
      return;
    }
    els.groupBar.innerHTML =
      "<div><h2>" +
      escapeHtml(group.name) +
      "</h2><p>" +
      escapeHtml(group.season || "No season label") +
      "</p></div>" +
      "<button type=\"button\" class=\"btn ghost\" id=\"btnEditGroup\">Edit group</button>";
  }

  function renderSuggest() {
    const wait = longestWaitFamily();
    if (!wait || !state.families.length) {
      els.suggestCard.hidden = true;
      els.suggestCard.innerHTML = "";
      return;
    }
    const open = nextOpenSaturday();
    const lastLine = wait.last
      ? "Last brought " + formatShort(wait.last) + " · " + relativePhrase(wait.last)
      : "Has not brought yet";
    els.suggestCard.hidden = false;
    els.suggestCard.innerHTML =
      "<p class=\"kicker quiet\">Who has not gone</p>" +
      "<strong>" +
      escapeHtml(wait.family.name) +
      " has waited longest</strong>" +
      "<p>" +
      escapeHtml(lastLine) +
      ". Assign them to " +
      escapeHtml(formatShort(open)) +
      "?</p>" +
      "<button type=\"button\" class=\"btn primary\" id=\"btnSuggestAssign\" data-family=\"" +
      escapeHtml(wait.family.id) +
      "\" data-date=\"" +
      escapeHtml(open) +
      "\">Assign " +
      escapeHtml(wait.family.name) +
      "</button>";
  }

  function renderDates() {
    const rows = sortedAssignments();
    const next = nextUp();
    els.datesEmpty.hidden = rows.length > 0;
    els.dateList.hidden = rows.length === 0;
    els.datesSub.textContent = rows.length
      ? rows.length + " date" + (rows.length === 1 ? "" : "s") + " on the rotation"
      : "Assign the first snack date.";
    els.dateList.innerHTML = rows
      .map((row) => {
        const family = findFamily(row.familyId);
        const today = isToday(row.date);
        const isNext = next && next.id === row.id && !today;
        const past = row.date < todayISO();
        const tone = today ? "is-today" : isNext ? "is-next" : past ? "is-past" : "";
        const pill = today
          ? "<span class=\"pill today\">Today</span>"
          : isNext
            ? "<span class=\"pill next\">Next up</span>"
            : past
              ? "<span class=\"pill past\">Done</span>"
              : "<span class=\"pill\">Upcoming</span>";
        const diet = family && family.dietary
          ? "<span class=\"chip diet\">" + escapeHtml(family.dietary) + "</span>"
          : "";
        return (
          "<li>" +
          "<article class=\"date-card " +
          tone +
          "\" data-id=\"" +
          escapeHtml(row.id) +
          "\">" +
          "<div class=\"date-card-head\">" +
          "<div><p class=\"date-when\">" +
          escapeHtml(formatLong(row.date)) +
          " · " +
          escapeHtml(relativePhrase(row.date)) +
          "</p><h3 class=\"date-family\">" +
          escapeHtml(family ? family.name : "Unassigned") +
          "</h3>" +
          diet +
          "</div>" +
          pill +
          "</div>" +
          "<div class=\"card-actions no-print\">" +
          "<button type=\"button\" class=\"btn ghost open-date\" data-id=\"" +
          escapeHtml(row.id) +
          "\">Change</button>" +
          "</div></article></li>"
        );
      })
      .join("");
  }

  function renderFamilies() {
    const rows = state.families.slice().sort((a, b) => a.name.localeCompare(b.name));
    els.familiesEmpty.hidden = rows.length > 0;
    els.familyList.hidden = rows.length === 0;
    els.familiesSub.textContent = rows.length
      ? rows.length + " famil" + (rows.length === 1 ? "y" : "ies") + " in the rotation"
      : "Add who can bring snacks.";
    els.familyList.innerHTML = rows
      .map((family) => {
        const last = lastBroughtISO(family.id);
        const lastLine = last
          ? "Last brought " + formatShort(last)
          : "Has not brought yet";
        const diet = family.dietary
          ? "<span class=\"chip diet\">" + escapeHtml(family.dietary) + "</span>"
          : "<span class=\"chip ok\">No dietary note</span>";
        return (
          "<li>" +
          "<article class=\"family-card\" data-id=\"" +
          escapeHtml(family.id) +
          "\">" +
          "<div class=\"family-card-head\">" +
          "<div><h3 class=\"family-name\">" +
          escapeHtml(family.name) +
          "</h3><p class=\"family-meta\">" +
          escapeHtml(lastLine) +
          "</p>" +
          diet +
          "</div></div>" +
          "<div class=\"card-actions\">" +
          "<button type=\"button\" class=\"btn ghost open-family\" data-id=\"" +
          escapeHtml(family.id) +
          "\">Edit</button>" +
          "</div></article></li>"
        );
      })
      .join("");
  }

  function renderPrint() {
    const group = state.group;
    const rows = sortedAssignments();
    const upcoming = upcomingAssignments();
    const title = group ? group.name : "Snack Duty";
    const season = group && group.season ? group.season : "Snack rotation";
    const body = rows.length
      ? "<table><thead><tr><th>Date</th><th>Family</th><th>Dietary</th></tr></thead><tbody>" +
        rows
          .map((row) => {
            const family = findFamily(row.familyId);
            const mark = isToday(row.date) ? " (today)" : nextUp() && nextUp().id === row.id ? " (next up)" : "";
            return (
              "<tr><td>" +
              escapeHtml(formatShort(row.date)) +
              escapeHtml(mark) +
              "</td><td>" +
              escapeHtml(family ? family.name : "Unassigned") +
              "</td><td>" +
              escapeHtml(family && family.dietary ? family.dietary : "—") +
              "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table>"
      : "<p class=\"muted\">No snack dates assigned yet.</p>";
    const roster = state.families.length
      ? "<ul>" +
        state.families
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((family) => {
            const extra = family.dietary ? " — " + escapeHtml(family.dietary) : "";
            return "<li><strong>" + escapeHtml(family.name) + "</strong>" + extra + "</li>";
          })
          .join("") +
        "</ul>"
      : "<p class=\"muted\">No families on the roster.</p>";
    els.printSheet.innerHTML =
      "<p class=\"clip-kicker\">Snack Duty · coach clipboard</p>" +
      "<h1 class=\"clip-title\">" +
      escapeHtml(title) +
      "</h1>" +
      "<p class=\"clip-season\">" +
      escapeHtml(season) +
      " · " +
      upcoming.length +
      " upcoming</p>" +
      "<h2>Dates</h2>" +
      body +
      "<h2>Families</h2>" +
      roster +
      "<p class=\"muted\">Snapshot copy — not live sync. Printed " +
      escapeHtml(formatShort(todayISO())) +
      ".</p>";
  }

  function renderMobile() {
    const virgin = !state.group;
    if (virgin) {
      els.btnMobilePrimary.textContent = "Create a group";
      return;
    }
    if (!state.families.length) {
      els.btnMobilePrimary.textContent = "Add family";
      return;
    }
    els.btnMobilePrimary.textContent = "Assign date";
  }

  function render() {
    const virgin = !state.group;
    els.emptyState.hidden = !virgin;
    els.mainApp.hidden = virgin;
    document.body.classList.toggle("has-cta", true);
    document.title = state.group ? state.group.name + " · Snack Duty" : "Snack Duty";
    els.undoRow.hidden = !state.undo;
    renderStamp();
    renderMobile();
    if (!virgin) {
      renderOnDeck();
      renderGroupBar();
      renderSuggest();
      renderDates();
      renderFamilies();
    } else {
      els.suggestCard.hidden = true;
    }
    renderPrint();
    save();
  }

  function openGroupDialog() {
    const f = els.groupForm;
    f.name.value = state.group ? state.group.name : "";
    f.season.value = state.group ? state.group.season : "";
    els.groupDialogTitle.textContent = state.group ? "Edit group" : "Create a group";
    els.groupDialog.showModal();
    window.setTimeout(() => f.name.focus(), 10);
  }

  function fillFamilySelect(selectedId) {
    const wait = longestWaitFamily();
    els.dateFamilySelect.innerHTML = state.families
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((family) => {
        const mark = wait && wait.family.id === family.id ? " — waited longest" : "";
        return (
          "<option value=\"" +
          escapeHtml(family.id) +
          "\">" +
          escapeHtml(family.name) +
          escapeHtml(mark) +
          "</option>"
        );
      })
      .join("");
    const pick = selectedId || (wait ? wait.family.id : "");
    if (pick) els.dateFamilySelect.value = pick;
    els.dateSuggestHint.textContent = wait
      ? wait.family.name +
        (wait.last ? " last brought " + formatShort(wait.last) : " has not brought yet") +
        "."
      : "Add a family first.";
  }

  function openFamilyDialog(family) {
    const f = els.familyForm;
    f.id.value = family ? family.id : "";
    f.name.value = family ? family.name : "";
    f.dietary.value = family ? family.dietary : "";
    els.familyDialogTitle.textContent = family ? "Edit family" : "Add a family";
    els.btnDeleteFamily.classList.toggle("hidden", !family);
    els.familyDialog.showModal();
    window.setTimeout(() => f.name.focus(), 10);
  }

  function openDateDialog(assignment) {
    if (!state.families.length) {
      toast("Add a family before assigning a date.");
      openFamilyDialog(null);
      return;
    }
    const f = els.dateForm;
    f.id.value = assignment ? assignment.id : "";
    f.date.value = assignment ? assignment.date : nextOpenSaturday();
    fillFamilySelect(assignment ? assignment.familyId : "");
    els.dateDialogTitle.textContent = assignment ? "Change date" : "Assign a date";
    els.btnDeleteDate.classList.toggle("hidden", !assignment);
    els.dateDialog.showModal();
  }

  function upsertAssignment(payload, isNew) {
    const date = clampText(payload.date, 10);
    const familyId = clip(payload.familyId, 64);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !findFamily(familyId)) return null;
    const existingSameDay = assignmentOn(date);
    if (isNew && existingSameDay) {
      setUndo({ type: "setFamily", assignmentId: existingSameDay.id, prevFamilyId: existingSameDay.familyId });
      existingSameDay.familyId = familyId;
      return existingSameDay;
    }
    if (!isNew && payload.id) {
      const row = findAssignment(payload.id);
      if (!row) return null;
      const clash = assignmentOn(date);
      if (clash && clash.id !== row.id) {
        state.assignments = state.assignments.filter((item) => item.id !== clash.id);
      }
      setUndo({ type: "setFamily", assignmentId: row.id, prevFamilyId: row.familyId });
      row.date = date;
      row.familyId = familyId;
      return row;
    }
    const created = { id: uid(), date, familyId };
    state.assignments.push(created);
    setUndo({ type: "add", assignment: { id: created.id, date: created.date, familyId: created.familyId } });
    return created;
  }

  function assignSuggested(familyId, date) {
    const saved = upsertAssignment({ date, familyId }, true);
    if (!saved) {
      toast("Could not assign that date.");
      return;
    }
    persist();
    const family = findFamily(familyId);
    toast("Assigned " + (family ? family.name : "family") + " to " + formatShort(date) + ". Undo is ready.");
  }

  function loadStarters() {
    if (state.group || state.families.length || state.assignments.length) {
      if (!window.confirm("Replace this device with the generic Soccer U8 example (Family A–E)?")) return;
    }
    state = starterState();
    persist();
    toast("Soccer U8 example loaded — Family A–E, not a real roster.", 3600);
  }

  function resetDevice() {
    if (!window.confirm("Erase Snack Duty on this device? Snapshot-share first if you want the rotation back.")) return;
    state = emptyStore();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
    setView("app");
    render();
    toast("This device is empty again.");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function shareSnapshot() {
    if (!state.group) {
      toast("Create a group before sharing a snapshot.");
      return;
    }
    const url = await encodeShare();
    els.shareUrlBox.value = url;
    els.shareDialog.showModal();
    const copied = await copyText(url);
    toast(copied ? "Copied — snapshot link, not live sync." : "Copy the snapshot link. Not live sync.", 3600);
  }

  els.groupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = clampText(els.groupForm.name.value, 48);
    if (!name) {
      toast("Need a group name.");
      return;
    }
    state.group = {
      name,
      season: clampText(els.groupForm.season.value, 32),
    };
    els.groupDialog.close();
    persist();
    toast(name + " is the group.");
  });

  els.familyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const f = els.familyForm;
    const saved = normalizeFamily({
      id: f.id.value,
      name: f.name.value,
      dietary: f.dietary.value,
    });
    if (!saved) {
      toast("Need a family name.");
      return;
    }
    const idx = state.families.findIndex((row) => row.id === saved.id);
    if (idx >= 0) state.families[idx] = saved;
    else state.families.push(saved);
    els.familyDialog.close();
    persist();
    toast(idx >= 0 ? "Family updated." : "Family added to the rotation.");
  });

  els.dateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const f = els.dateForm;
    const isNew = !f.id.value;
    const saved = upsertAssignment(
      {
        id: f.id.value,
        date: f.date.value,
        familyId: f.familyId.value,
      },
      isNew
    );
    if (!saved) {
      toast("Need a date and a family.");
      return;
    }
    els.dateDialog.close();
    persist();
    toast("Snack date saved. Undo is ready.");
  });

  document.getElementById("btnCancelGroup").addEventListener("click", () => els.groupDialog.close());
  document.getElementById("btnCancelFamily").addEventListener("click", () => els.familyDialog.close());
  document.getElementById("btnCancelDate").addEventListener("click", () => els.dateDialog.close());
  document.getElementById("btnAbout").addEventListener("click", () => els.aboutDialog.showModal());
  document.getElementById("btnCloseAbout").addEventListener("click", () => els.aboutDialog.close());
  document.getElementById("btnCloseShare").addEventListener("click", () => els.shareDialog.close());
  document.getElementById("btnEmptyGroup").addEventListener("click", openGroupDialog);
  document.getElementById("btnStarters").addEventListener("click", loadStarters);
  document.getElementById("btnAddFamily").addEventListener("click", () => openFamilyDialog(null));
  document.getElementById("btnEmptyFamily").addEventListener("click", () => openFamilyDialog(null));
  document.getElementById("btnAddDate").addEventListener("click", () => openDateDialog(null));
  document.getElementById("btnEmptyDate").addEventListener("click", () => openDateDialog(null));
  document.getElementById("btnReset").addEventListener("click", resetDevice);
  document.getElementById("btnShare").addEventListener("click", shareSnapshot);
  document.getElementById("btnClipboard").addEventListener("click", () => {
    if (!state.group) {
      toast("Create a group first.");
      return;
    }
    setView("clip");
  });
  document.getElementById("btnClipBack").addEventListener("click", () => setView("app"));
  document.getElementById("btnPrint").addEventListener("click", () => {
    setView("clip");
    window.print();
  });

  document.getElementById("btnCopyShare").addEventListener("click", async () => {
    const url = els.shareUrlBox.value;
    const copied = await copyText(url);
    if (!copied) window.prompt("Copy this snapshot share link (not live sync):", url);
    else toast("Copied — snapshot link, not live sync.", 3200);
  });

  document.getElementById("btnDeleteFamily").addEventListener("click", () => {
    const id = els.familyForm.id.value;
    const family = findFamily(id);
    if (!family) return;
    if (!window.confirm("Remove “" + family.name + "” from the rotation? Their dates stay unassigned.")) return;
    state.families = state.families.filter((row) => row.id !== id);
    els.familyDialog.close();
    persist();
    toast("Family removed. Dates stay on the list.");
  });

  document.getElementById("btnDeleteDate").addEventListener("click", () => {
    const id = els.dateForm.id.value;
    const row = findAssignment(id);
    if (!row) return;
    if (!window.confirm("Remove " + formatShort(row.date) + " from the rotation?")) return;
    setUndo({ type: "remove", assignment: { id: row.id, date: row.date, familyId: row.familyId } });
    state.assignments = state.assignments.filter((item) => item.id !== id);
    els.dateDialog.close();
    persist();
    toast("Date removed. Undo is ready.");
  });

  document.getElementById("btnUndo").addEventListener("click", () => {
    if (!applyUndo()) {
      toast("Nothing to undo.");
      persist();
      return;
    }
    persist();
    toast("Last assign undone.");
  });

  els.groupBar.addEventListener("click", (event) => {
    if (event.target.closest("#btnEditGroup")) openGroupDialog();
  });

  els.suggestCard.addEventListener("click", (event) => {
    const btn = event.target.closest("#btnSuggestAssign");
    if (!btn) return;
    assignSuggested(btn.getAttribute("data-family"), btn.getAttribute("data-date"));
  });

  els.dateList.addEventListener("click", (event) => {
    const btn = event.target.closest(".open-date");
    const card = event.target.closest("[data-id]");
    const id = (btn && btn.getAttribute("data-id")) || (card && card.getAttribute("data-id"));
    if (!id) return;
    const row = findAssignment(id);
    if (row) openDateDialog(row);
  });

  els.familyList.addEventListener("click", (event) => {
    const btn = event.target.closest(".open-family");
    const card = event.target.closest("[data-id]");
    const id = (btn && btn.getAttribute("data-id")) || (card && card.getAttribute("data-id"));
    if (!id) return;
    const family = findFamily(id);
    if (family) openFamilyDialog(family);
  });

  els.btnMobilePrimary.addEventListener("click", () => {
    if (!state.group) {
      openGroupDialog();
      return;
    }
    if (!state.families.length) {
      openFamilyDialog(null);
      return;
    }
    openDateDialog(null);
  });

  async function boot() {
    const fromShare = await tryImportHash();
    const stored = loadStored();
    if (fromShare && fromShare.group) {
      state = fromShare;
      save();
      setView("app");
      render();
      toast("Loaded a shared snapshot. Edits stay on this device until you share again.", 3800);
      return;
    }
    if (stored) {
      state = stored;
      setView("app");
      render();
      return;
    }
    state = starterState();
    setView("app");
    render();
    toast("Soccer U8 example is on deck. Family A–E only — edit or clear anytime.", 3800);
  }

  boot();
})();
