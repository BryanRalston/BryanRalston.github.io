(() => {
  const els = {
    storageFail: document.getElementById("storageFail"),
    briefing: document.getElementById("briefing"),
    briefForm: document.getElementById("briefForm"),
    retireDateWrap: document.getElementById("retireDateWrap"),
    retireAgeWrap: document.getElementById("retireAgeWrap"),
    mainApp: document.getElementById("mainApp"),
    liveClock: document.getElementById("liveClock"),
    mondayDigits: document.getElementById("mondayDigits"),
    objectiveLine: document.getElementById("objectiveLine"),
    windowMeta: document.getElementById("windowMeta"),
    earlyBanner: document.getElementById("earlyBanner"),
    markerGrid: document.getElementById("markerGrid"),
    boardSub: document.getElementById("boardSub"),
    vaultBox: document.getElementById("vaultBox"),
    goalsEmpty: document.getElementById("goalsEmpty"),
    goalList: document.getElementById("goalList"),
    markerDialog: document.getElementById("markerDialog"),
    markerForm: document.getElementById("markerForm"),
    markerDialogTitle: document.getElementById("markerDialogTitle"),
    cadenceFields: document.getElementById("cadenceFields"),
    btnDeleteMarker: document.getElementById("btnDeleteMarker"),
    goalDialog: document.getElementById("goalDialog"),
    goalForm: document.getElementById("goalForm"),
    goalDialogTitle: document.getElementById("goalDialogTitle"),
    btnDeleteGoal: document.getElementById("btnDeleteGoal"),
    aboutDialog: document.getElementById("aboutDialog"),
    shareDialog: document.getElementById("shareDialog"),
    shareUrlBox: document.getElementById("shareUrlBox"),
    shareGuard: document.getElementById("shareGuard"),
    toast: document.getElementById("toast"),
    btnMobilePrimary: document.getElementById("btnMobilePrimary"),
  };

  let storageOk = true;
  let state = Mission.emptyState();
  let toastTimer = 0;
  let clockTimer = 0;

  const ICONS = {
    mondays: '<svg viewBox="0 0 32 32" class="marker-icon"><rect x="4" y="6" width="24" height="22" rx="3" fill="none" stroke="#ffb020" stroke-width="1.6"/><path d="M4 12h24" stroke="#ff3b2f" stroke-width="1.4"/><text x="16" y="24" text-anchor="middle" font-size="9" fill="#ff3b2f" font-family="ui-monospace,monospace">M</text></svg>',
    fridays: '<svg viewBox="0 0 32 32" class="marker-icon"><rect x="4" y="6" width="24" height="22" rx="3" fill="none" stroke="#ffb020" stroke-width="1.6"/><path d="M4 12h24" stroke="#ff3b2f" stroke-width="1.4"/><text x="16" y="24" text-anchor="middle" font-size="9" fill="#ffb020" font-family="ui-monospace,monospace">F</text></svg>',
    weekends: '<svg viewBox="0 0 32 32" class="marker-icon"><circle cx="16" cy="16" r="9" fill="none" stroke="#ffb020" stroke-width="1.6"/><path d="M16 10v6l4 2" stroke="#ff3b2f" stroke-width="1.5" fill="none"/></svg>',
    paychecks: '<svg viewBox="0 0 32 32" class="marker-icon"><rect x="5" y="9" width="22" height="14" rx="2" fill="none" stroke="#ffb020" stroke-width="1.6"/><path d="M5 13h22" stroke="#ff3b2f"/><text x="16" y="21" text-anchor="middle" font-size="8" fill="#ffb020">$</text></svg>',
    summers: '<svg viewBox="0 0 32 32" class="marker-icon"><circle cx="16" cy="16" r="5" fill="#ffb020"/><path d="M16 5v4M16 23v4M5 16h4M23 16h4M8.5 8.5l2.6 2.6M20.9 20.9l2.6 2.6M8.5 23.5l2.6-2.6M20.9 11.1l2.6-2.6" stroke="#ffb020" stroke-width="1.4"/></svg>',
    holidays: '<svg viewBox="0 0 32 32" class="marker-icon"><path d="M16 5l2.4 7.2H26l-6 4.6 2.3 7.2L16 19.4 9.7 24l2.3-7.2-6-4.6h7.6z" fill="none" stroke="#ff3b2f" stroke-width="1.4"/></svg>',
    coffees: '<svg viewBox="0 0 32 32" class="marker-icon"><path d="M8 12h13v9a5 5 0 0 1-5 5h-3a5 5 0 0 1-5-5v-9z" fill="none" stroke="#ffb020" stroke-width="1.6"/><path d="M21 14h3a3 3 0 0 1 0 6h-3" fill="none" stroke="#ffb020"/><path d="M12 6c.6 1.4.6 2.6 0 4M16 6c.6 1.4.6 2.6 0 4" stroke="#ff3b2f" fill="none"/></svg>',
    haircuts: '<svg viewBox="0 0 32 32" class="marker-icon"><circle cx="9" cy="10" r="3" fill="none" stroke="#ffb020"/><circle cx="23" cy="10" r="3" fill="none" stroke="#ffb020"/><path d="M11 12l5 12 5-12" fill="none" stroke="#ff3b2f" stroke-width="1.5"/></svg>',
    gym: '<svg viewBox="0 0 32 32" class="marker-icon"><path d="M6 12v8M10 10v12M22 10v12M26 12v8M10 16h12" stroke="#ffb020" stroke-width="1.8" fill="none"/></svg>',
    grocery: '<svg viewBox="0 0 32 32" class="marker-icon"><path d="M7 9h3l2 14h12l3-10H10" fill="none" stroke="#ffb020" stroke-width="1.6"/><circle cx="14" cy="26" r="1.5" fill="#ff3b2f"/><circle cx="22" cy="26" r="1.5" fill="#ff3b2f"/></svg>',
    laundry: '<svg viewBox="0 0 32 32" class="marker-icon"><rect x="7" y="6" width="18" height="20" rx="3" fill="none" stroke="#ffb020" stroke-width="1.6"/><circle cx="16" cy="18" r="5" fill="none" stroke="#ff3b2f"/><circle cx="11" cy="10" r="1" fill="#ffb020"/></svg>',
    oil: '<svg viewBox="0 0 32 32" class="marker-icon"><path d="M16 6c5 6 8 10 8 14a8 8 0 1 1-16 0c0-4 3-8 8-14z" fill="none" stroke="#ffb020" stroke-width="1.6"/></svg>',
    alarms: '<svg viewBox="0 0 32 32" class="marker-icon"><circle cx="16" cy="17" r="8" fill="none" stroke="#ff3b2f" stroke-width="1.6"/><path d="M16 13v5l3 2M8 8l3 3M24 8l-3 3" stroke="#ffb020" fill="none"/></svg>',
    commutes: '<svg viewBox="0 0 32 32" class="marker-icon"><rect x="5" y="13" width="22" height="9" rx="2" fill="none" stroke="#ff3b2f" stroke-width="1.5"/><path d="M9 13l3-5h8l3 5" fill="none" stroke="#ffb020"/><circle cx="10" cy="22" r="1.6" fill="#ffb020"/><circle cx="22" cy="22" r="1.6" fill="#ffb020"/></svg>',
    syncs: '<svg viewBox="0 0 32 32" class="marker-icon"><path d="M8 10h12l4 4v8H8z" fill="none" stroke="#ff3b2f" stroke-width="1.5"/><path d="M12 15h8M12 19h5" stroke="#ffb020"/></svg>',
    passwords: '<svg viewBox="0 0 32 32" class="marker-icon"><rect x="9" y="14" width="14" height="11" rx="2" fill="none" stroke="#ff3b2f"/><path d="M12 14v-3a4 4 0 0 1 8 0v3" fill="none" stroke="#ffb020"/></svg>',
    dmv: '<svg viewBox="0 0 32 32" class="marker-icon"><path d="M5 22V12l11-6 11 6v10H5z" fill="none" stroke="#ff3b2f" stroke-width="1.5"/><path d="M13 22v-7h6v7" fill="none" stroke="#ffb020"/></svg>',
    reviews: '<svg viewBox="0 0 32 32" class="marker-icon"><rect x="8" y="6" width="16" height="20" rx="2" fill="none" stroke="#ff3b2f"/><path d="M12 12h8M12 16h8M12 20h5" stroke="#ffb020"/></svg>',
    junk: '<svg viewBox="0 0 32 32" class="marker-icon"><rect x="6" y="10" width="20" height="14" rx="2" fill="none" stroke="#ff3b2f"/><path d="M6 10l10 8 10-8" fill="none" stroke="#ffb020"/></svg>',
    hold: '<svg viewBox="0 0 32 32" class="marker-icon"><path d="M10 14a6 6 0 0 1 12 0v6a3 3 0 0 1-3 3h-1v-7h4M10 14v6a3 3 0 0 0 3 3h1v-7H10z" fill="none" stroke="#ff3b2f" stroke-width="1.4"/></svg>',
    custom: '<svg viewBox="0 0 32 32" class="marker-icon"><circle cx="16" cy="16" r="9" fill="none" stroke="#3ecf8e" stroke-width="1.6"/><path d="M16 11v10M11 16h10" stroke="#3ecf8e" stroke-width="1.6"/></svg>',
  };

  function iconFor(marker) {
    return ICONS[marker.id] || ICONS[marker.calendar] || ICONS.custom;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toast(message, ms) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), ms || 2800);
  }

  function probeStorage() {
    try {
      const probe = Mission.STORAGE_KEY + "-probe";
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
      "T-Minus cannot save on this device. Browser storage is blocked" +
      (reason ? " (" + reason + ")" : "") +
      ". The board will not persist.";
  }

  function loadStored() {
    if (!probeStorage()) {
      failStorage();
      return null;
    }
    try {
      const raw = localStorage.getItem(Mission.STORAGE_KEY);
      if (!raw) return null;
      return Mission.normalizeState(JSON.parse(raw));
    } catch (err) {
      failStorage(err && err.message ? err.message : "unreadable store");
      return null;
    }
  }

  function save() {
    if (!storageOk) return false;
    try {
      localStorage.setItem(Mission.STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      failStorage(err && err.name ? err.name : "write failed");
      return false;
    }
  }

  function persist() {
    save();
    render();
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
    if (kind === "j.") return new TextDecoder().decode(b64urlToBytes(body));
    if (kind === "z.") {
      if (typeof DecompressionStream === "undefined") throw new Error("no decompress");
      const bytes = b64urlToBytes(body);
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
      return await new Response(stream).text();
    }
    return decodeURIComponent(escape(atob(token)));
  }

  async function encodeShare() {
    const payload = Mission.sharePayload(state);
    const packed = await compressPayload(JSON.stringify(payload));
    return location.origin + location.pathname + Mission.HASH_PREFIX + packed;
  }

  async function tryImportHash() {
    const hash = location.hash || "";
    if (!hash.startsWith(Mission.HASH_PREFIX)) return null;
    try {
      const json = await decompressPayload(decodeURIComponent(hash.slice(Mission.HASH_PREFIX.length)));
      const data = Mission.normalizeState(JSON.parse(json));
      data.briefed = true;
      data.goals = [];
      history.replaceState(null, "", location.pathname + location.search);
      return data;
    } catch (_) {
      history.replaceState(null, "", location.pathname + location.search);
      toast("That snapshot could not be read.", 3200);
      return null;
    }
  }

  function tickClock() {
    const now = new Date();
    els.liveClock.textContent =
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0") +
      ":" +
      String(now.getSeconds()).padStart(2, "0");
  }

  function fillBriefForm() {
    const f = els.briefForm;
    f.birth.value = state.birth || "";
    f.retireMode.value = state.retireMode || "date";
    f.retireDate.value = state.retireDate || "";
    f.retireAge.value = state.retireAge || 65;
    f.objective.value = state.objective || "";
    toggleRetireMode();
  }

  function toggleRetireMode() {
    const age = els.briefForm.retireMode.value === "age";
    els.retireDateWrap.hidden = age;
    els.retireAgeWrap.hidden = !age;
    els.briefForm.retireDate.required = !age;
    els.briefForm.retireAge.required = age;
  }

  function renderDigits(value) {
    const text = value == null || value === "" ? "—" : String(value);
    return text
      .split("")
      .map((ch) => {
        if (ch === "," || ch === "—" || ch === "-") {
          return "<span class=\"digit-comma\">" + escapeHtml(ch) + "</span>";
        }
        return "<span class=\"digit-cell\">" + escapeHtml(ch) + "</span>";
      })
      .join("");
  }

  function renderWindow(view) {
    els.mondayDigits.innerHTML = renderDigits(view.ready ? Mission.formatInt(view.mondays) : "—");
    els.objectiveLine.textContent = state.objective
      ? "“" + state.objective + "”"
      : "Write the Monday you are walking toward.";
    const bits = [];
    if (view.ageNow != null) bits.push("Age " + view.ageNow);
    if (view.officialEnd) bits.push("Extraction " + Mission.formatLong(view.officialEnd));
    if (view.days) bits.push(Mission.formatInt(view.days) + " days on the clock");
    els.windowMeta.textContent = bits.join(" · ");
    if (view.early) {
      els.earlyBanner.hidden = false;
      els.earlyBanner.textContent =
        "Early extraction armed · " + Mission.formatLong(view.end) + " · Mondays already recalculated.";
    } else {
      els.earlyBanner.hidden = true;
      els.earlyBanner.textContent = "";
    }
  }

  function markerCard(row) {
    const tone = row.marker.hero
      ? " is-hero"
      : row.marker.category === "disliked"
        ? " is-disliked"
        : row.marker.category === "custom"
          ? " is-custom"
          : "";
    const extra = row.marker.note && row.marker.note !== row.label ? " · " + row.marker.note : "";
    return (
      "<button type=\"button\" class=\"marker" +
      tone +
      "\" data-id=\"" +
      escapeHtml(row.marker.id) +
      "\">" +
      iconFor(row.marker) +
      "<span class=\"marker-name\">" +
      escapeHtml(row.marker.name) +
      "</span><span class=\"marker-count\">" +
      escapeHtml(Mission.formatInt(row.remaining)) +
      "</span><span class=\"marker-cadence\">" +
      escapeHtml(row.label + extra) +
      "</span></button>"
    );
  }

  function renderMarkers(view) {
    const rows = view.rows;
    els.boardSub.textContent = rows.length
      ? rows.length + " armed · tap a card to edit, disarm, or cut it"
      : "Nothing armed. Restore a starter or add a custom cadence.";
    const groups = [
      { id: "calendar", title: "On the calendar", line: "Mondays first. The rest of the year reports in." },
      { id: "normal", title: "Worth showing up for", line: "The small repeats that still count." },
      { id: "disliked", title: "The ones you will not miss", line: "Count them down. Then never again." },
      { id: "custom", title: "Your own cadence", line: "You named it. The board does the math." },
    ];
    els.markerGrid.innerHTML = groups
      .map((group) => {
        const subset = rows.filter((row) => row.marker.category === group.id);
        if (!subset.length) return "";
        return (
          "<section class=\"marker-group\" data-group=\"" +
          group.id +
          "\"><h3>" +
          escapeHtml(group.title) +
          "</h3><p>" +
          escapeHtml(group.line) +
          "</p><div class=\"marker-grid\">" +
          subset.map(markerCard).join("") +
          "</div></section>"
        );
      })
      .join("");

    const inactive = state.markers.filter((row) => !row.active);
    const missing = Mission.starterMarkers().filter((row) => !state.markers.some((m) => m.id === row.id));
    if (!inactive.length && !missing.length) {
      els.vaultBox.hidden = true;
      els.vaultBox.innerHTML = "";
      return;
    }
    const chips = inactive
      .map(
        (row) =>
          "<button type=\"button\" class=\"btn ghost restore-marker\" data-id=\"" +
          escapeHtml(row.id) +
          "\">Rearm " +
          escapeHtml(row.name) +
          "</button>"
      )
      .join("");
    const missingChips = missing
      .map(
        (row) =>
          "<button type=\"button\" class=\"btn ghost restore-starter\" data-id=\"" +
          escapeHtml(row.id) +
          "\">Restore " +
          escapeHtml(row.name) +
          "</button>"
      )
      .join("");
    els.vaultBox.hidden = false;
    els.vaultBox.innerHTML =
      "<p class=\"kicker quiet\">The vault</p><p>Disarmed or cut markers live here. The board stays clean.</p><div class=\"vault-list\">" +
      chips +
      missingChips +
      "</div>";
  }

  function renderGoals(view) {
    const rows = view.goals;
    els.goalsEmpty.hidden = rows.length > 0;
    els.goalList.hidden = rows.length === 0;
    els.goalList.innerHTML = rows
      .map((row) => {
        const pct = Math.max(0, Math.min(100, row.projection.pct));
        const hit = row.projection.reachable
          ? row.projection.already
            ? "Already there. The vault is open."
            : "Projected hit " +
              Mission.formatLong(row.projection.hitDate) +
              (row.earlier ? " — ahead of extraction." : " — still inside the mission.")
          : "Need a monthly or a return % to sketch a hit date.";
        const earlyBtn = row.earlier
          ? "<button type=\"button\" class=\"btn primary use-early\" data-date=\"" +
            escapeHtml(row.projection.hitDate) +
            "\">Use as early extraction</button>"
          : "";
        const clearBtn =
          state.earlyRetireDate && row.projection.hitDate === state.earlyRetireDate
            ? "<button type=\"button\" class=\"btn ghost\" id=\"btnClearEarly\">Return to official date</button>"
            : "";
        return (
          "<li><article class=\"goal-card\" data-id=\"" +
          escapeHtml(row.goal.id) +
          "\"><h3>" +
          escapeHtml(row.goal.name) +
          "</h3><div class=\"goal-bar\" aria-hidden=\"true\"><span style=\"width:" +
          pct +
          "%\"></span></div><p class=\"goal-meta\">" +
          escapeHtml(Mission.formatMoney(row.goal.current)) +
          " of " +
          escapeHtml(Mission.formatMoney(row.goal.target)) +
          " · " +
          escapeHtml(Math.round(row.projection.pct)) +
          "% · " +
          escapeHtml(hit) +
          "</p><div class=\"dialog-actions\">" +
          "<button type=\"button\" class=\"btn ghost open-goal\" data-id=\"" +
          escapeHtml(row.goal.id) +
          "\">Edit</button>" +
          earlyBtn +
          clearBtn +
          "</div></article></li>"
        );
      })
      .join("");
  }

  function render() {
    const view = Mission.board(state);
    const showBoard = view.ready;
    els.briefing.hidden = showBoard;
    els.mainApp.hidden = !showBoard;
    document.title = showBoard ? "T-Minus · " + Mission.formatInt(view.mondays) + " Mondays" : "T-Minus";
    els.btnMobilePrimary.textContent = showBoard ? "Add custom" : "Accept mission";
    if (!showBoard) fillBriefForm();
    renderWindow(view);
    if (showBoard) {
      renderMarkers(view);
      renderGoals(view);
    }
    save();
  }

  function openMarkerDialog(marker) {
    const f = els.markerForm;
    const isCal = !!(marker && marker.kind === "calendar");
    f.id.value = marker ? marker.id : "";
    f.name.value = marker ? marker.name : "";
    f.count.value = marker ? marker.count : 1;
    f.per.value = marker ? marker.per : 1;
    f.unit.value = marker ? marker.unit : "weeks";
    f.active.checked = marker ? marker.active : true;
    els.cadenceFields.hidden = isCal;
    els.markerDialogTitle.textContent = marker ? "Edit marker" : "Add a custom cadence";
    els.btnDeleteMarker.classList.toggle("hidden", !marker);
    els.markerDialog.showModal();
    window.setTimeout(() => f.name.focus(), 10);
  }

  function openGoalDialog(goal) {
    const f = els.goalForm;
    f.id.value = goal ? goal.id : "";
    f.name.value = goal ? goal.name : "";
    f.target.value = goal ? goal.target : "";
    f.current.value = goal ? goal.current : "";
    f.monthly.value = goal ? goal.monthly : "";
    f.returnPct.value = goal ? goal.returnPct : "";
    els.goalDialogTitle.textContent = goal ? "Edit goal" : "Add a goal";
    els.btnDeleteGoal.classList.toggle("hidden", !goal);
    els.goalDialog.showModal();
    window.setTimeout(() => f.name.focus(), 10);
  }

  function moneyField(value) {
    const n = Number(String(value || "").replace(/[$,\s]/g, ""));
    return Number.isFinite(n) ? n : 0;
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
    if (!Mission.board(state).ready) {
      toast("Lock the briefing before you share a snapshot.");
      return;
    }
    if (!Mission.shareOmitsMoney(state)) {
      toast("Share blocked — vault numbers tried to sneak into the drop.");
      return;
    }
    const url = await encodeShare();
    if (url.indexOf("$") >= 0 || /(?:target|current|monthly)=/i.test(url)) {
      toast("Share blocked — URL looked like it carried money.");
      return;
    }
    els.shareUrlBox.value = url;
    els.shareGuard.textContent = "Checked: no $ and no goal balances in this link.";
    els.shareDialog.showModal();
    const copied = await copyText(url);
    toast(copied ? "Copied — board snapshot, no vault." : "Copy the snapshot. Board only.", 3600);
  }

  function resetDevice() {
    if (!window.confirm("Burn the dossier on this device? Snapshot-share first if you want the board back.")) return;
    state = Mission.emptyState();
    try {
      localStorage.removeItem(Mission.STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
    render();
    toast("Dossier burned. Briefing is blank.");
  }

  els.briefForm.addEventListener("change", (event) => {
    if (event.target.name === "retireMode") toggleRetireMode();
  });

  els.briefForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const f = els.briefForm;
    const birth = Mission.clampText(f.birth.value, 10);
    const mode = f.retireMode.value === "age" ? "age" : "date";
    const retireDate = Mission.clampText(f.retireDate.value, 10);
    const retireAge = Number(f.retireAge.value);
    if (!Mission.parseISODate(birth)) {
      toast("Need a birth date.");
      return;
    }
    if (mode === "date" && !Mission.parseISODate(retireDate)) {
      toast("Need an extraction date.");
      return;
    }
    if (mode === "age" && !(retireAge >= 1 && retireAge <= 120)) {
      toast("Need an age between 1 and 120.");
      return;
    }
    const end = mode === "age" ? Mission.retireDateFromAge(birth, retireAge) : retireDate;
    if (!end || end < birth) {
      toast("Extraction has to land after the birth date.");
      return;
    }
    state.briefed = true;
    state.birth = birth;
    state.retireMode = mode;
    state.retireDate = mode === "date" ? retireDate : end;
    state.retireAge = mode === "age" ? retireAge : Mission.ageOn(birth, end) || 65;
    state.objective = Mission.clampText(f.objective.value, 140);
    persist();
    toast("Mission accepted. Mondays are on the glass.");
  });

  els.markerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const f = els.markerForm;
    const existing = state.markers.find((row) => row.id === f.id.value);
    const saved = Mission.upsertMarker(state, {
      id: f.id.value || Mission.uid(),
      name: f.name.value,
      kind: existing && existing.kind === "calendar" ? "calendar" : "cadence",
      calendar: existing ? existing.calendar : "",
      count: f.count.value,
      per: f.per.value,
      unit: f.unit.value,
      category: existing ? existing.category : "custom",
      active: f.active.checked,
      starter: existing ? existing.starter : false,
      hero: existing ? existing.hero : false,
      note: existing ? existing.note : "",
    });
    if (!saved) {
      toast("Need a marker name.");
      return;
    }
    els.markerDialog.close();
    persist();
    toast(saved.active ? saved.name + " is on the board." : saved.name + " is in the vault.");
  });

  els.goalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const f = els.goalForm;
    const saved = Mission.upsertGoal(state, {
      id: f.id.value || Mission.uid(),
      name: f.name.value,
      target: moneyField(f.target.value),
      current: moneyField(f.current.value),
      monthly: moneyField(f.monthly.value),
      returnPct: Number(f.returnPct.value) || 0,
    });
    if (!saved) {
      toast("Need a goal name.");
      return;
    }
    els.goalDialog.close();
    persist();
    toast(saved.name + " is in the vault. It will not ride a share link.");
  });

  document.getElementById("btnSample").addEventListener("click", () => {
    state = Mission.sampleState();
    persist();
    toast("Sample dossier locked. Edit anything — including the defaults.");
  });
  document.getElementById("btnBriefing").addEventListener("click", () => {
    state.briefed = false;
    render();
    fillBriefForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.getElementById("btnAddMarker").addEventListener("click", () => openMarkerDialog(null));
  document.getElementById("btnAddGoal").addEventListener("click", () => openGoalDialog(null));
  document.getElementById("btnEmptyGoal").addEventListener("click", () => openGoalDialog(null));
  document.getElementById("btnCancelMarker").addEventListener("click", () => els.markerDialog.close());
  document.getElementById("btnCancelGoal").addEventListener("click", () => els.goalDialog.close());
  document.getElementById("btnAbout").addEventListener("click", () => els.aboutDialog.showModal());
  document.getElementById("btnCloseAbout").addEventListener("click", () => els.aboutDialog.close());
  document.getElementById("btnShare").addEventListener("click", shareSnapshot);
  document.getElementById("btnCloseShare").addEventListener("click", () => els.shareDialog.close());
  document.getElementById("btnReset").addEventListener("click", resetDevice);
  document.getElementById("btnCopyShare").addEventListener("click", async () => {
    const url = els.shareUrlBox.value;
    const copied = await copyText(url);
    if (!copied) window.prompt("Copy this board snapshot (no $):", url);
    else toast("Copied — board snapshot, no vault.", 3200);
  });

  document.getElementById("btnDeleteMarker").addEventListener("click", () => {
    const id = els.markerForm.id.value;
    const row = state.markers.find((item) => item.id === id);
    if (!row) return;
    if (!window.confirm("Cut “" + row.name + "” from the dossier?")) return;
    Mission.removeMarker(state, id);
    els.markerDialog.close();
    persist();
    toast(row.name + " is gone. Restore it from the vault if it was a starter.");
  });

  document.getElementById("btnDeleteGoal").addEventListener("click", () => {
    const id = els.goalForm.id.value;
    const row = state.goals.find((item) => item.id === id);
    if (!row) return;
    if (!window.confirm("Remove “" + row.name + "” from the vault?")) return;
    Mission.removeGoal(state, id);
    els.goalDialog.close();
    persist();
    toast("Goal burned. The share link never had it anyway.");
  });

  els.markerGrid.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-id]");
    if (!btn) return;
    const row = state.markers.find((item) => item.id === btn.getAttribute("data-id"));
    if (row) openMarkerDialog(row);
  });

  els.vaultBox.addEventListener("click", (event) => {
    const rearm = event.target.closest(".restore-marker");
    const restore = event.target.closest(".restore-starter");
    if (rearm) {
      const row = state.markers.find((item) => item.id === rearm.getAttribute("data-id"));
      if (row) row.active = true;
      persist();
      toast((row ? row.name : "Marker") + " is back on the glass.");
      return;
    }
    if (restore) {
      const saved = Mission.restoreStarter(state, restore.getAttribute("data-id"));
      persist();
      toast((saved ? saved.name : "Starter") + " restored.");
    }
  });

  els.goalList.addEventListener("click", (event) => {
    const open = event.target.closest(".open-goal");
    const early = event.target.closest(".use-early");
    const clear = event.target.closest("#btnClearEarly");
    if (open) {
      const row = state.goals.find((item) => item.id === open.getAttribute("data-id"));
      if (row) openGoalDialog(row);
      return;
    }
    if (early) {
      const date = early.getAttribute("data-date");
      if (Mission.applyEarlyRetire(state, date)) {
        persist();
        toast("Early extraction locked. Every marker just recalculated.");
      }
      return;
    }
    if (clear) {
      Mission.clearEarlyRetire(state);
      persist();
      toast("Back to the official extraction date.");
    }
  });

  els.btnMobilePrimary.addEventListener("click", () => {
    if (!Mission.board(state).ready) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    openMarkerDialog(null);
  });

  async function boot() {
    tickClock();
    clockTimer = window.setInterval(tickClock, 1000);
    const fromShare = await tryImportHash();
    const stored = loadStored();
    if (fromShare && fromShare.briefed) {
      state = fromShare;
      save();
      render();
      toast("Loaded a shared board. Vault stays empty on purpose.", 3800);
      return;
    }
    if (stored && stored.briefed) {
      state = stored;
      render();
      return;
    }
    state = Mission.sampleState();
    render();
    toast("Sample dossier is on the glass. Edit the briefing anytime.", 3800);
  }

  boot();
})();
