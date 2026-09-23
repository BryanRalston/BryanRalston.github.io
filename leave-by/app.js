(() => {
  const HASH_PREFIX = "#m=";
  const QUERY_KEY = "m";

  const els = {
    storageFail: document.getElementById("storageFail"),
    shareOffer: document.getElementById("shareOffer"),
    offerLead: document.getElementById("offerLead"),
    offerTime: document.getElementById("offerTime"),
    offerTick: document.getElementById("offerTick"),
    offerMeta: document.getElementById("offerMeta"),
    emptyState: document.getElementById("emptyState"),
    hero: document.getElementById("hero"),
    heroKicker: document.getElementById("heroKicker"),
    heroTime: document.getElementById("heroTime"),
    drain: document.getElementById("drain"),
    drainFill: document.getElementById("drainFill"),
    heroTick: document.getElementById("heroTick"),
    heroTickLabel: document.getElementById("heroTickLabel"),
    remainSpoken: document.getElementById("remainSpoken"),
    heroNote: document.getElementById("heroNote"),
    heroPaid: document.getElementById("heroPaid"),
    heroSub: document.getElementById("heroSub"),
    meterActions: document.getElementById("meterActions"),
    btnExtend: document.getElementById("btnExtend"),
    btnEnded: document.getElementById("btnEnded"),
    btnShare: document.getElementById("btnShare"),
    btnStartOver: document.getElementById("btnStartOver"),
    btnClear: document.getElementById("btnClear"),
    startPanel: document.getElementById("startPanel"),
    meterForm: document.getElementById("meterForm"),
    modeChip: document.getElementById("modeChip"),
    modeClock: document.getElementById("modeClock"),
    chipPanel: document.getElementById("chipPanel"),
    chipList: document.getElementById("chipList"),
    clockPanel: document.getElementById("clockPanel"),
    fieldClock: document.getElementById("fieldClock"),
    fieldNote: document.getElementById("fieldNote"),
    fieldPaid: document.getElementById("fieldPaid"),
    historySub: document.getElementById("historySub"),
    historyEmpty: document.getElementById("historyEmpty"),
    historyList: document.getElementById("historyList"),
    btnClearHistory: document.getElementById("btnClearHistory"),
    shareDialog: document.getElementById("shareDialog"),
    shareLead: document.getElementById("shareLead"),
    shareUrlBox: document.getElementById("shareUrlBox"),
    toast: document.getElementById("toast"),
    theme: document.querySelector('meta[name="theme-color"]'),
  };

  let storageOk = true;
  let state = LeaveBy.emptyState();
  let incoming = null;
  let mode = "chip";
  let selectedChip = 60;
  let lastSpokenKey = "";
  let paintedPhase = "empty";
  let tickTimer = 0;
  let armClearHistory = false;

  function toast(msg, ms) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove("show"), ms || 2400);
  }

  function probeStorage() {
    try {
      const probe = LeaveBy.STORAGE_KEY + "-probe";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return true;
    } catch (_) {
      return false;
    }
  }

  function load() {
    storageOk = probeStorage();
    els.storageFail.hidden = storageOk;
    if (!storageOk) return LeaveBy.emptyState();
    try {
      const raw = localStorage.getItem(LeaveBy.STORAGE_KEY);
      if (!raw) return LeaveBy.emptyState();
      return LeaveBy.normalizeState(JSON.parse(raw));
    } catch (_) {
      return LeaveBy.emptyState();
    }
  }

  function save() {
    if (!storageOk) return;
    try {
      localStorage.setItem(LeaveBy.STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
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
    if (kind === "j.") return new TextDecoder().decode(b64urlToBytes(body));
    if (kind === "z.") {
      if (typeof DecompressionStream === "undefined") throw new Error("no decompress");
      const bytes = b64urlToBytes(body);
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
      return await new Response(stream).text();
    }
    return decodeURIComponent(escape(atob(token)));
  }

  async function encodeShare(session) {
    const payload = LeaveBy.sharePayload(session);
    if (!payload) throw new Error("empty");
    const packed = await compressPayload(JSON.stringify(payload));
    return location.origin + location.pathname + HASH_PREFIX + packed;
  }

  function cleanShareUrl() {
    const url = new URL(location.href);
    url.hash = "";
    url.searchParams.delete(QUERY_KEY);
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  async function tryImportShare() {
    const hash = location.hash || "";
    let token = "";
    if (hash.startsWith(HASH_PREFIX)) {
      token = decodeURIComponent(hash.slice(HASH_PREFIX.length));
    } else {
      const params = new URLSearchParams(location.search);
      token = params.get(QUERY_KEY) || "";
    }
    if (!token) return null;
    try {
      const json = await decompressPayload(token);
      const session = LeaveBy.parseSharePayload(JSON.parse(json));
      cleanShareUrl();
      if (!session) throw new Error("empty");
      return session;
    } catch (_) {
      cleanShareUrl();
      toast("That snapshot could not be read.", 3200);
      return null;
    }
  }

  function reasonMessage(reason) {
    if (reason === "past") return "That time today has already passed.";
    if (reason === "short") return "Pick a leave-by time at least a minute away.";
    if (reason === "long") return "Leave By caps a meter at 16 hours.";
    if (reason === "paid") return "Amount paid should look like 2.50, or be left blank.";
    if (reason === "chip") return "Pick a duration.";
    if (reason === "clock") return "That clock time could not be read.";
    if (reason === "range") return "That length is outside what Leave By can run.";
    if (reason === "cap") return "That's the 16 hour cap.";
    if (reason === "ended") return "This meter isn't running.";
    return "That meter could not be started.";
  }

  function phaseOf(session, now) {
    const status = session ? LeaveBy.statusOf(session, now) : "empty";
    if (status === "empty" || status === "active" || status === "ended") return status;
    throw new Error("Unknown status " + status);
  }

  function applyMode(next) {
    if (next === "chip" || next === "clock") mode = next;
    if (mode === "chip") {
      els.chipPanel.hidden = false;
      els.clockPanel.hidden = true;
    } else if (mode === "clock") {
      els.chipPanel.hidden = true;
      els.clockPanel.hidden = false;
    } else {
      throw new Error("Unknown mode " + mode);
    }
    els.modeChip.setAttribute("aria-pressed", mode === "chip" ? "true" : "false");
    els.modeClock.setAttribute("aria-pressed", mode === "clock" ? "true" : "false");
  }

  function buildChips() {
    els.chipList.textContent = "";
    LeaveBy.CHIPS.forEach((min) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.setAttribute("role", "radio");
      btn.dataset.min = String(min);
      btn.setAttribute("aria-label", min + " minutes");
      const num = document.createElement("span");
      num.className = "chip-num";
      num.textContent = String(min);
      const unit = document.createElement("span");
      unit.className = "chip-unit";
      unit.textContent = "min";
      btn.append(num, unit);
      btn.addEventListener("click", () => {
        selectedChip = min;
        syncChips();
      });
      btn.addEventListener("keydown", onChipKey);
      els.chipList.append(btn);
    });
    syncChips();
  }

  function syncChips() {
    const buttons = [...els.chipList.querySelectorAll(".chip")];
    buttons.forEach((btn) => {
      const on = Number(btn.dataset.min) === selectedChip;
      btn.setAttribute("aria-checked", on ? "true" : "false");
      btn.tabIndex = on ? 0 : -1;
    });
  }

  function onChipKey(event) {
    const buttons = [...els.chipList.querySelectorAll(".chip")];
    const index = buttons.indexOf(event.currentTarget);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % buttons.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buttons.length - 1;
    else return;
    event.preventDefault();
    selectedChip = Number(buttons[next].dataset.min);
    syncChips();
    buttons[next].focus();
  }

  function updateTitle(session, now) {
    const phase = phaseOf(session, now);
    if (phase === "active") {
      document.title = LeaveBy.formatRemaining(LeaveBy.remainingMs(session, now)) + " · Leave By";
    } else if (phase === "ended") {
      document.title = "Ended · Leave By";
    } else {
      document.title = "Leave By";
    }
    if (!els.theme) return;
    const level = session ? LeaveBy.urgency(session, now) : "empty";
    if (level === "ended") els.theme.content = "#3a1412";
    else if (level === "urgent") els.theme.content = "#3a1c10";
    else if (level === "short") els.theme.content = "#3a2410";
    else els.theme.content = "#081114";
  }

  function writeClock(session, now, forceSpoken) {
    const phase = phaseOf(session, now);
    const level = LeaveBy.urgency(session, now);
    els.hero.classList.remove("is-calm", "is-short", "is-urgent", "is-ended");
    if (level === "calm" || level === "short" || level === "urgent" || level === "ended") {
      els.hero.classList.add("is-" + level);
    } else {
      throw new Error("Unknown urgency " + level);
    }

    const left = LeaveBy.remainingMs(session, now);
    els.heroKicker.textContent = phase === "ended" ? "Ended" : "Leave by";
    els.heroTime.textContent = LeaveBy.formatLeaveBy(session.leaveAt, now);
    els.heroTick.textContent = phase === "active" ? LeaveBy.formatTick(left) : "00:00";
    els.heroTickLabel.textContent = phase === "ended" ? LeaveBy.endedCopy(session) : "minutes remaining";
    els.heroTickLabel.classList.toggle("is-sentence", phase === "ended");

    const ratio = LeaveBy.drainRatio(session, now);
    els.drainFill.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
    els.drain.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));

    if (session.note) {
      els.heroNote.hidden = false;
      els.heroNote.textContent = session.note;
    } else {
      els.heroNote.hidden = true;
    }

    if (session.paid != null) {
      els.heroPaid.hidden = false;
      els.heroPaid.textContent = "Paid " + LeaveBy.formatPaid(session.paid) + " · on this phone only";
    } else {
      els.heroPaid.hidden = true;
    }

    els.heroSub.textContent = LeaveBy.meterSummary(session);

    const spoken = phase === "ended" ? LeaveBy.endedCopy(session) : LeaveBy.spokenRemaining(left);
    const spokenKey = phase + ":" + (phase === "ended" ? "ended" : String(Math.floor(left / 60000)));
    if (forceSpoken || spokenKey !== lastSpokenKey) {
      els.remainSpoken.textContent = spoken;
      lastSpokenKey = spokenKey;
    }
    updateTitle(session, now);
  }

  function paintOffer(now) {
    if (!incoming) return;
    const phase = phaseOf(incoming, now);
    const left = LeaveBy.remainingMs(incoming, now);
    els.offerTime.textContent = LeaveBy.formatLeaveBy(incoming.leaveAt, now);
    els.offerTick.textContent = phase === "active" ? LeaveBy.formatTick(left) + " left" : "Ended";
    const bits = [LeaveBy.meterSummary(incoming)];
    if (incoming.note) bits.push(incoming.note);
    els.offerMeta.textContent = bits.join(" · ");
  }

  function renderOffer() {
    if (!incoming) {
      els.shareOffer.hidden = true;
      return;
    }
    els.shareOffer.hidden = false;
    els.offerLead.textContent = state.current
      ? "Someone sent a meter. It is a copy, not live sync. Keeping it replaces the meter already on this phone — yours moves into history. Later changes on their phone do not move this copy."
      : "Someone sent a meter. It is a copy, not live sync. The leave-by time was packed into the link. Later changes on their phone do not move this one.";
    paintOffer(Date.now());
  }

  function renderHistory() {
    const rows = state.history;
    els.btnClearHistory.hidden = rows.length === 0;
    if (!armClearHistory) els.btnClearHistory.textContent = "Clear history";
    if (!rows.length) {
      els.historyList.hidden = true;
      els.historyEmpty.hidden = false;
      els.historySub.textContent = "Last 12 sessions on this device. Leave-by time, duration, and note.";
      return;
    }
    els.historyEmpty.hidden = true;
    els.historyList.hidden = false;
    els.historySub.textContent = "Last 12 sessions on this device. Leave-by time, duration, and note.";
    els.historyList.textContent = "";
    const now = Date.now();
    rows.forEach((item) => {
      const li = document.createElement("li");
      li.className = "ticket";
      const when = document.createElement("p");
      when.className = "ticket-time";
      when.textContent = LeaveBy.formatLeaveBy(item.leaveAt, now);
      const meta = document.createElement("p");
      meta.className = "ticket-meta";
      meta.textContent = LeaveBy.historyMeta(item);
      const again = document.createElement("button");
      again.type = "button";
      again.className = "btn ghost";
      again.dataset.replay = item.id;
      again.textContent = "Same length";
      li.append(when, again, meta);
      els.historyList.append(li);
    });
  }

  function render() {
    const now = Date.now();
    const session = state.current;
    const phase = phaseOf(session, now);
    paintedPhase = phase;
    els.storageFail.hidden = storageOk;
    els.emptyState.hidden = phase !== "empty";
    els.hero.hidden = phase === "empty";
    els.startPanel.hidden = phase === "active";
    document.body.classList.toggle("is-running", phase === "active");
    els.btnExtend.hidden = phase !== "active";
    els.btnEnded.hidden = phase !== "active";
    els.meterActions.hidden = phase !== "active";
    els.btnClear.hidden = phase !== "ended";
    els.btnStartOver.hidden = phase === "empty";
    els.btnShare.hidden = phase === "empty";
    renderOffer();
    if (session) writeClock(session, now, true);
    else updateTitle(null, now);
    renderHistory();
    applyMode();
    syncChips();
  }

  function paintLive(now) {
    if (incoming) paintOffer(now);
    const session = state.current;
    if (!session) return;
    const phase = phaseOf(session, now);
    if (phase !== paintedPhase) {
      render();
      return;
    }
    writeClock(session, now, false);
  }

  function onTick() {
    const now = Date.now();
    const expired = LeaveBy.finishIfExpired(state, now);
    if (expired.changed) {
      state = expired.state;
      save();
      render();
      toast("Time's up.");
      return;
    }
    if (document.hidden) return;
    paintLive(now);
  }

  function armTick() {
    clearTimeout(tickTimer);
    const wait = 1000 - (Date.now() % 1000) + 30;
    tickTimer = setTimeout(function step() {
      onTick();
      tickTimer = setTimeout(step, 1000 - (Date.now() % 1000) + 30);
    }, wait);
  }

  function focusHero() {
    els.heroTime.focus();
  }

  function onExtend() {
    const result = LeaveBy.extendSession(state.current, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    state.current = result.session;
    save();
    render();
    toast("Added 15 minutes. Leave by " + LeaveBy.formatLeaveBy(state.current.leaveAt, Date.now()) + ".");
  }

  function onEnded() {
    const result = LeaveBy.endEarly(state, Date.now());
    if (!result.ok) return;
    state = result.state;
    save();
    render();
    toast("Meter ended.");
    focusHero();
  }

  function onStartOver() {
    state = LeaveBy.clearCurrent(state, Date.now());
    save();
    mode = "chip";
    render();
    toast("Ready for a new meter.");
    const selected = els.chipList.querySelector('.chip[aria-checked="true"]');
    if (selected) selected.focus();
  }

  function onClear() {
    state = LeaveBy.clearCurrent(state, Date.now());
    save();
    render();
    toast("Cleared.");
  }

  function onSubmit(event) {
    event.preventDefault();
    const now = Date.now();
    const note = els.fieldNote.value;
    const paid = els.fieldPaid.value;
    let started;
    if (mode === "clock") {
      const parsed = LeaveBy.parseClockInput(els.fieldClock.value);
      if (!parsed) {
        toast("Set the leave-by time.");
        els.fieldClock.focus();
        return;
      }
      started = LeaveBy.startFromClock(parsed.hours, parsed.minutes, note, paid, now);
    } else if (mode === "chip") {
      started = LeaveBy.startFromChip(selectedChip, note, paid, now);
    } else {
      throw new Error("Unknown mode " + mode);
    }
    if (!started.ok) {
      toast(reasonMessage(started.reason));
      return;
    }
    const adopted = LeaveBy.adoptSession(state, started.session, now);
    if (!adopted.ok) {
      toast("That meter could not be started.");
      return;
    }
    state = adopted.state;
    save();
    els.fieldNote.value = "";
    els.fieldPaid.value = "";
    els.fieldClock.value = "";
    render();
    toast("Meter started. Leave by " + LeaveBy.formatLeaveBy(state.current.leaveAt, now) + ".");
    focusHero();
  }

  function replay(item) {
    const now = Date.now();
    const total = LeaveBy.totalMinutes(item);
    const paid = item.paid == null ? "" : item.paid.toFixed(2);
    const started = LeaveBy.startFromMinutes(total, item.note, paid, now);
    if (!started.ok) {
      toast(reasonMessage(started.reason));
      return;
    }
    const adopted = LeaveBy.adoptSession(state, started.session, now);
    if (!adopted.ok) return;
    state = adopted.state;
    save();
    render();
    toast("Started " + LeaveBy.formatDuration(total) + ".");
    focusHero();
  }

  function onClearHistory() {
    if (!state.history.length) return;
    if (!armClearHistory) {
      armClearHistory = true;
      els.btnClearHistory.textContent = "Confirm clear";
      setTimeout(() => {
        armClearHistory = false;
        if (els.btnClearHistory) els.btnClearHistory.textContent = "Clear history";
      }, 2800);
      return;
    }
    armClearHistory = false;
    state = LeaveBy.clearHistory(state);
    save();
    render();
    toast("History cleared.");
  }

  async function onShare() {
    if (!state.current) return;
    try {
      const url = await encodeShare(state.current);
      els.shareLead.textContent =
        "Leave by " +
        LeaveBy.formatLeaveBy(state.current.leaveAt, Date.now()) +
        " · " +
        LeaveBy.meterSummary(state.current) +
        (state.current.note ? " · " + state.current.note : "");
      els.shareUrlBox.value = url;
      if (typeof els.shareDialog.showModal === "function") els.shareDialog.showModal();
      else toast("Snapshot ready, but this browser cannot open the share sheet.");
    } catch (_) {
      toast("Could not build a snapshot link.");
    }
  }

  async function onCopyShare() {
    const url = els.shareUrlBox.value;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied.");
    } catch (_) {
      els.shareUrlBox.focus();
      els.shareUrlBox.select();
      toast("Copy blocked. The link is selected — copy it from the box.");
    }
  }

  function onKeepShare() {
    if (!incoming) return;
    const adopted = LeaveBy.adoptSession(state, incoming, Date.now());
    if (!adopted.ok) {
      toast("That snapshot could not be kept.");
      return;
    }
    state = adopted.state;
    const fin = LeaveBy.finishIfExpired(state, Date.now());
    state = fin.state;
    incoming = null;
    save();
    render();
    toast("Meter kept on this phone.");
    if (state.current) focusHero();
  }

  function onDismissShare() {
    incoming = null;
    render();
    toast("Snapshot dismissed.");
  }

  document.getElementById("btnExtend").addEventListener("click", onExtend);
  document.getElementById("btnEnded").addEventListener("click", onEnded);
  document.getElementById("btnStartOver").addEventListener("click", onStartOver);
  document.getElementById("btnClear").addEventListener("click", onClear);
  document.getElementById("btnShare").addEventListener("click", onShare);
  document.getElementById("btnCopyShare").addEventListener("click", onCopyShare);
  document.getElementById("btnCloseShare").addEventListener("click", () => els.shareDialog.close());
  document.getElementById("btnUseShare").addEventListener("click", onKeepShare);
  document.getElementById("btnDismissShare").addEventListener("click", onDismissShare);
  document.getElementById("btnClearHistory").addEventListener("click", onClearHistory);
  els.meterForm.addEventListener("submit", onSubmit);
  els.modeChip.addEventListener("click", () => applyMode("chip"));
  els.modeClock.addEventListener("click", () => {
    applyMode("clock");
    els.fieldClock.focus();
  });
  els.historyList.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-replay]");
    if (!btn) return;
    const item = state.history.find((row) => row.id === btn.getAttribute("data-replay"));
    if (item) replay(item);
  });
  els.shareDialog.addEventListener("click", (event) => {
    if (event.target === els.shareDialog) els.shareDialog.close();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) onTick();
  });

  buildChips();

  async function boot() {
    state = load();
    const fin = LeaveBy.finishIfExpired(state, Date.now());
    state = fin.state;
    if (fin.changed) save();
    incoming = await tryImportShare();
    render();
    armTick();
  }

  boot();
})();
