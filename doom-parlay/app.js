(() => {
  const HASH_PREFIX = "#p=";
  const QUERY_KEY = "p";

  const els = {
    storageFail: document.getElementById("storageFail"),
    shareOffer: document.getElementById("shareOffer"),
    offerFace: document.getElementById("offerFace"),
    hero: document.getElementById("hero"),
    heroPct: document.getElementById("heroPct"),
    heroLabel: document.getElementById("heroLabel"),
    heroAmerican: document.getElementById("heroAmerican"),
    doomMeter: document.getElementById("doomMeter"),
    surviveFill: document.getElementById("surviveFill"),
    surviveCaption: document.getElementById("surviveCaption"),
    doomCaption: document.getElementById("doomCaption"),
    heroRoast: document.getElementById("heroRoast"),
    heroFormula: document.getElementById("heroFormula"),
    heroSpoken: document.getElementById("heroSpoken"),
    btnShare: document.getElementById("btnShare"),
    btnKeep: document.getElementById("btnKeep"),
    btnAdd: document.getElementById("btnAdd"),
    btnAddBottom: document.getElementById("btnAddBottom"),
    legsSub: document.getElementById("legsSub"),
    legList: document.getElementById("legList"),
    historyEmpty: document.getElementById("historyEmpty"),
    historyList: document.getElementById("historyList"),
    btnClearHistory: document.getElementById("btnClearHistory"),
    shareDialog: document.getElementById("shareDialog"),
    shareUrlBox: document.getElementById("shareUrlBox"),
    toast: document.getElementById("toast"),
  };

  let storageOk = true;
  let state = Parlay.emptyState();
  let incoming = null;
  let builtIds = "";
  let toastTimer = 0;
  let spokenKey = "";

  function toast(message, ms) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), ms || 2600);
  }

  function probeStorage() {
    try {
      const probe = Parlay.STORAGE_KEY + "-probe";
      localStorage.setItem(probe, "ok");
      const readback = localStorage.getItem(probe);
      localStorage.removeItem(probe);
      return readback === "ok";
    } catch (_) {
      return false;
    }
  }

  function failStorage() {
    storageOk = false;
    els.storageFail.hidden = false;
    els.storageFail.textContent =
      "Doom Parlay cannot save on this device. Browser storage is blocked (private mode or a setting). The slip will not persist.";
  }

  function loadStored() {
    if (!probeStorage()) {
      failStorage();
      return null;
    }
    try {
      const raw = localStorage.getItem(Parlay.STORAGE_KEY);
      if (!raw) return null;
      return Parlay.normalizeState(JSON.parse(raw));
    } catch (_) {
      failStorage();
      return null;
    }
  }

  function save() {
    if (!storageOk) return false;
    try {
      localStorage.setItem(Parlay.STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (_) {
      failStorage();
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
    const packed = await compressPayload(JSON.stringify(Parlay.sharePayload(state)));
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
      const parsed = Parlay.parseShare(JSON.parse(json));
      cleanShareUrl();
      if (!parsed) throw new Error("empty");
      return parsed;
    } catch (_) {
      cleanShareUrl();
      toast("That snapshot could not be read.", 3200);
      return null;
    }
  }

  function reasonCopy(reason) {
    switch (reason) {
      case "empty":
        return "Implied —";
      case "american":
        return "American odds are whole numbers from -100 to -100000, or +100 to +100000.";
      case "percent":
        return "Win chance runs from 0.1% to 99.9%.";
      default: {
        const unknown = reason;
        throw new Error("Unknown leg reason " + unknown);
      }
    }
  }

  function readoutFor(parsed, mode) {
    if (!parsed.ok) return { text: reasonCopy(parsed.reason), bad: parsed.reason !== "empty" };
    const via =
      parsed.mode !== mode ? (parsed.mode === "american" ? " · read as American" : " · read as percent") : "";
    return {
      text: "Implied " + Parlay.formatWin(parsed.p, 2) + " · " + Parlay.formatAmerican(parsed.odds) + via,
      bad: false,
    };
  }

  function legNode(leg, index) {
    const item = document.createElement("li");
    item.className = "leg";
    item.dataset.id = leg.id;

    const head = document.createElement("div");
    head.className = "leg-head";

    const indexEl = document.createElement("span");
    indexEl.className = "leg-index";
    indexEl.textContent = String(index + 1).padStart(2, "0");

    const label = document.createElement("input");
    label.className = "leg-label";
    label.maxLength = Parlay.LABEL_MAX;
    label.autocomplete = "off";
    label.placeholder = "Team, player, or market";
    label.setAttribute("aria-label", "Leg " + (index + 1) + " label");
    label.value = leg.label;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-remove";
    remove.dataset.action = "remove";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", "Remove leg " + (index + 1));

    head.append(indexEl, label, remove);

    const controls = document.createElement("div");
    controls.className = "leg-controls";

    const modes = document.createElement("div");
    modes.className = "modes";
    modes.setAttribute("role", "group");
    modes.setAttribute("aria-label", "Format for leg " + (index + 1));

    const american = document.createElement("button");
    american.type = "button";
    american.dataset.action = "mode";
    american.dataset.mode = "american";
    american.textContent = "American";
    american.setAttribute("aria-pressed", leg.mode === "american" ? "true" : "false");

    const percent = document.createElement("button");
    percent.type = "button";
    percent.dataset.action = "mode";
    percent.dataset.mode = "percent";
    percent.textContent = "Percent";
    percent.setAttribute("aria-pressed", leg.mode === "percent" ? "true" : "false");

    modes.append(american, percent);

    const raw = document.createElement("input");
    raw.className = "leg-raw";
    raw.autocomplete = "off";
    raw.spellcheck = false;
    raw.maxLength = 24;
    raw.inputMode = leg.mode === "percent" ? "decimal" : "text";
    raw.placeholder = leg.mode === "percent" ? "52.4" : "-110 or +150";
    raw.setAttribute("aria-label", "Leg " + (index + 1) + " odds");
    raw.value = leg.raw;

    controls.append(modes, raw);

    const readout = document.createElement("p");
    readout.className = "leg-readout";

    item.append(head, controls, readout);
    return item;
  }

  function ensureLegs() {
    const sig = state.legs.map((leg) => leg.id).join("|");
    if (sig === builtIds) return;
    builtIds = sig;
    els.legList.replaceChildren();
    state.legs.forEach((leg, index) => {
      els.legList.append(legNode(leg, index));
    });
  }

  function findLeg(id) {
    return state.legs.find((leg) => leg.id === id) || null;
  }

  function paintLegReadouts(view) {
    view.rows.forEach((row, index) => {
      const node = els.legList.querySelector('[data-id="' + row.leg.id + '"]');
      if (!node) return;
      const readout = node.querySelector(".leg-readout");
      const copy = readoutFor(row.parsed, row.leg.mode);
      readout.textContent = copy.text;
      readout.classList.toggle("is-bad", copy.bad);
      const indexEl = node.querySelector(".leg-index");
      if (indexEl) indexEl.textContent = String(index + 1).padStart(2, "0");
      node.querySelectorAll("[data-action='mode']").forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.mode === row.leg.mode ? "true" : "false");
      });
      const label = node.querySelector(".leg-label");
      if (label && document.activeElement !== label) label.value = row.leg.label;
      const raw = node.querySelector(".leg-raw");
      if (raw && document.activeElement !== raw) {
        raw.value = row.leg.raw;
        raw.placeholder = row.leg.mode === "percent" ? "52.4" : "-110 or +150";
        raw.inputMode = row.leg.mode === "percent" ? "decimal" : "text";
      }
    });
  }

  function paintHero(view) {
    const band = view.band.id;
    els.hero.dataset.band = band;
    els.heroLabel.textContent = view.band.label;
    els.heroRoast.textContent = view.band.roast;
    if (!view.ready) {
      els.heroPct.textContent = "—";
      els.heroAmerican.textContent = "American —";
      els.heroFormula.textContent = "";
      els.surviveFill.style.width = "0%";
      els.surviveCaption.textContent = view.validCount === 1 ? "One more leg" : "Arm two legs";
      els.doomCaption.textContent = "Doom —";
      els.doomMeter.setAttribute("aria-valuenow", "0");
      els.doomMeter.setAttribute("aria-valuetext", view.band.roast);
      document.title = "Doom Parlay";
    } else {
      const win = Parlay.formatWin(view.parlayP);
      const american = Parlay.formatAmerican(view.american);
      els.heroPct.textContent = win;
      els.heroAmerican.textContent = view.american == null ? "American off the board" : "American " + american;
      els.heroFormula.textContent = view.formula;
      const survive = Math.max(view.parlayP * 100, 1.25);
      els.surviveFill.style.width = survive + "%";
      els.surviveCaption.textContent = win + " still alive";
      els.doomCaption.textContent = Parlay.formatDoom(view.parlayP) + " doom";
      const doomNow = Math.round((1 - view.parlayP) * 100);
      els.doomMeter.setAttribute("aria-valuenow", String(doomNow));
      els.doomMeter.setAttribute(
        "aria-valuetext",
        "Win chance " + win + ". " + view.band.label + ". " + els.doomCaption.textContent + "."
      );
      document.title = "Doom Parlay · " + win;
    }

    const spoken =
      (view.ready ? "Parlay win chance " + els.heroPct.textContent + ". " : "Standby. ") +
      view.band.label +
      ". " +
      els.heroAmerican.textContent +
      ".";
    if (spoken !== spokenKey) {
      spokenKey = spoken;
      els.heroSpoken.textContent = spoken;
    }

    const ready = view.ready;
    els.btnShare.disabled = !ready;
    els.btnKeep.disabled = !ready;
    const atCap = state.legs.length >= Parlay.MAX_LEGS;
    els.btnAdd.disabled = atCap;
    els.btnAddBottom.disabled = atCap;
    if (atCap) els.legsSub.textContent = "Eight legs is the cap.";
    else if (!state.legs.length) els.legsSub.textContent = "No legs on the slip. Add one.";
    else els.legsSub.textContent = view.validCount + " of " + state.legs.length + " legs armed · 2 to 8";
  }

  function formatWhen(ms) {
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function paintHistory() {
    const rows = state.history || [];
    els.historyEmpty.hidden = rows.length > 0;
    els.historyList.hidden = rows.length === 0;
    els.btnClearHistory.hidden = rows.length === 0;
    els.historyList.replaceChildren();
    rows.forEach((item) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-row";
      button.dataset.id = item.id;

      const pct = document.createElement("span");
      pct.className = "history-pct";
      pct.textContent = Parlay.formatWin(item.winP);

      const odds = document.createElement("span");
      odds.className = "history-odds";
      odds.textContent = Parlay.formatAmerican(item.american);

      const when = document.createElement("span");
      when.className = "history-when";
      when.textContent = formatWhen(item.at);

      const legs = document.createElement("span");
      legs.className = "history-legs";
      legs.textContent = item.legs
        .map((leg) => {
          const name = leg.label ? leg.label + " " : "";
          return name + (leg.raw || "—");
        })
        .join(" · ");

      button.setAttribute("aria-label", "Restore parlay " + pct.textContent + " " + odds.textContent);
      button.append(pct, odds, when, legs);
      li.append(button);
      els.historyList.append(li);
    });
  }

  function render() {
    ensureLegs();
    const view = Parlay.evaluate(state);
    paintHero(view);
    paintLegReadouts(view);
    paintHistory();
    save();
  }

  function previewShare(payload) {
    const view = Parlay.evaluate({ legs: payload.legs });
    if (!view.ready) return "Legs loaded. Arm at least two before the meter wakes.";
    return view.formula + " → " + Parlay.formatWin(view.parlayP) + " · " + Parlay.formatAmerican(view.american);
  }

  function showShareOffer() {
    if (!incoming) {
      els.shareOffer.hidden = true;
      return;
    }
    els.offerFace.textContent = previewShare(incoming);
    els.shareOffer.hidden = false;
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
    const view = Parlay.evaluate(state);
    if (!view.ready) {
      toast("Arm at least two legs before you share a snapshot.");
      return;
    }
    Parlay.pushHistory(state, Date.now());
    save();
    paintHistory();
    const url = await encodeShare();
    els.shareUrlBox.value = url;
    els.shareDialog.showModal();
    const copied = await copyText(url);
    toast(copied ? "Copied. A snapshot, not live sync." : "Copy the snapshot link.", 3200);
  }

  function addLegAndFocus() {
    if (!Parlay.addLeg(state)) {
      toast("Eight legs is the cap. Doom does not need a ninth.");
      return;
    }
    builtIds = "";
    render();
    const last = els.legList.querySelector(".leg:last-child .leg-raw");
    if (last) last.focus();
  }

  function adoptShare() {
    if (!incoming) return;
    state.legs = incoming.legs.map((leg) => ({
      id: leg.id,
      label: leg.label,
      raw: leg.raw,
      mode: leg.mode,
    }));
    incoming = null;
    builtIds = "";
    showShareOffer();
    render();
    toast("Loaded a shared slip. Copy, not live sync.", 3200);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function loadSample() {
    const history = state.history.slice();
    state = Parlay.sampleState();
    state.history = history;
    builtIds = "";
    render();
    toast("Sample slip loaded. Three legs, and the meter already knows.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startOver() {
    if (!window.confirm("Start over? This slip clears. History on this device stays.")) return;
    state = Parlay.startOver(state);
    builtIds = "";
    render();
    toast("Slip cleared. History stayed.");
  }

  els.legList.addEventListener("input", (event) => {
    const node = event.target.closest(".leg");
    if (!node) return;
    const leg = findLeg(node.dataset.id);
    if (!leg) return;
    if (event.target.classList.contains("leg-label")) leg.label = event.target.value;
    if (event.target.classList.contains("leg-raw")) leg.raw = event.target.value;
    const view = Parlay.evaluate(state);
    paintHero(view);
    paintLegReadouts(view);
    save();
  });

  els.legList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const node = button.closest(".leg");
    const leg = node ? findLeg(node.dataset.id) : null;
    if (!leg) return;
    if (button.dataset.action === "remove") {
      Parlay.removeLeg(state, leg.id);
      builtIds = "";
      render();
      toast("Leg removed.");
      return;
    }
    if (button.dataset.action === "mode") {
      const next = button.dataset.mode === "percent" ? "percent" : "american";
      if (leg.mode === next) return;
      leg.raw = Parlay.convertRaw(leg.raw, leg.mode, next);
      leg.mode = next;
      const raw = node.querySelector(".leg-raw");
      if (raw) raw.value = leg.raw;
      render();
    }
  });

  els.historyList.addEventListener("click", (event) => {
    const button = event.target.closest(".history-row");
    if (!button) return;
    const item = state.history.find((row) => row.id === button.dataset.id);
    if (!item) return;
    state.legs = item.legs.map((leg) => ({
      id: leg.id,
      label: leg.label,
      raw: leg.raw,
      mode: leg.mode,
    }));
    builtIds = "";
    render();
    toast("Restored to the glass.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.getElementById("btnAdd").addEventListener("click", addLegAndFocus);
  document.getElementById("btnAddBottom").addEventListener("click", addLegAndFocus);
  document.getElementById("btnSample").addEventListener("click", loadSample);
  document.getElementById("btnStartOver").addEventListener("click", startOver);
  document.getElementById("btnKeep").addEventListener("click", () => {
    if (!Parlay.evaluate(state).ready) {
      toast("Arm at least two legs before you keep a parlay.");
      return;
    }
    Parlay.pushHistory(state, Date.now());
    render();
    toast("Kept on this device.");
  });
  document.getElementById("btnShare").addEventListener("click", shareSnapshot);
  document.getElementById("btnClearHistory").addEventListener("click", () => {
    if (!window.confirm("Clear the last parlays on this device?")) return;
    state.history = [];
    render();
    toast("History cleared.");
  });
  document.getElementById("btnUseShare").addEventListener("click", adoptShare);
  document.getElementById("btnDismissShare").addEventListener("click", () => {
    incoming = null;
    showShareOffer();
    toast("Snapshot dropped.");
  });
  document.getElementById("btnCloseShare").addEventListener("click", () => els.shareDialog.close());
  document.getElementById("btnCopyShare").addEventListener("click", async () => {
    const url = els.shareUrlBox.value;
    const copied = await copyText(url);
    if (!copied) window.prompt("Copy this snapshot:", url);
    else toast("Copied. A snapshot, not live sync.", 2800);
  });

  async function boot() {
    const fromShare = await tryImportShare();
    const stored = loadStored();
    if (stored) state = stored;
    else state = Parlay.sampleState();
    if (fromShare) incoming = fromShare;
    showShareOffer();
    render();
    if (fromShare) toast("A shared slip is waiting above the glass.", 3200);
    else if (!stored) toast("Sample slip is on the glass. Edit any leg.", 3200);
  }

  boot();
})();
