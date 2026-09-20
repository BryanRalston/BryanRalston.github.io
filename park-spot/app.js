(() => {
  const STORAGE_KEY = "park-spot-v1";
  const HASH_PREFIX = "#p=";
  const QUERY_KEY = "p";
  const HISTORY_CAP = 8;

  const COLORS = [
    { id: "white", label: "White", hex: "#f4f1ea" },
    { id: "black", label: "Black", hex: "#1c1c1c" },
    { id: "silver", label: "Silver", hex: "#c5c8cc" },
    { id: "gray", label: "Gray", hex: "#6d7178" },
    { id: "red", label: "Red", hex: "#c0392b" },
    { id: "blue", label: "Blue", hex: "#2b5aa8" },
    { id: "green", label: "Green", hex: "#2d6a4f" },
    { id: "gold", label: "Gold", hex: "#c9a227" },
    { id: "orange", label: "Orange", hex: "#d35400" },
    { id: "none", label: "Skip", hex: "" },
  ];

  const els = {
    storageFail: document.getElementById("storageFail"),
    shareOffer: document.getElementById("shareOffer"),
    sharePreview: document.getElementById("sharePreview"),
    emptyState: document.getElementById("emptyState"),
    hero: document.getElementById("hero"),
    heroKicker: document.getElementById("heroKicker"),
    heroSpot: document.getElementById("heroSpot"),
    heroVenue: document.getElementById("heroVenue"),
    heroMeta: document.getElementById("heroMeta"),
    heroColor: document.getElementById("heroColor"),
    heroSwatch: document.getElementById("heroSwatch"),
    heroColorLabel: document.getElementById("heroColorLabel"),
    heroNote: document.getElementById("heroNote"),
    heroTime: document.getElementById("heroTime"),
    editorBox: document.getElementById("editorBox"),
    editorTitle: document.getElementById("editorTitle"),
    editorMeta: document.getElementById("editorMeta"),
    spotForm: document.getElementById("spotForm"),
    fieldVenue: document.getElementById("fieldVenue"),
    fieldGarage: document.getElementById("fieldGarage"),
    fieldLevel: document.getElementById("fieldLevel"),
    fieldSection: document.getElementById("fieldSection"),
    fieldSpot: document.getElementById("fieldSpot"),
    fieldNote: document.getElementById("fieldNote"),
    colorChips: document.getElementById("colorChips"),
    venueHints: document.getElementById("venueHints"),
    historyEmpty: document.getElementById("historyEmpty"),
    historyList: document.getElementById("historyList"),
    btnClearHistory: document.getElementById("btnClearHistory"),
    aboutDialog: document.getElementById("aboutDialog"),
    shareDialog: document.getElementById("shareDialog"),
    shareUrlBox: document.getElementById("shareUrlBox"),
    toast: document.getElementById("toast"),
    mobileCta: document.getElementById("mobileCta"),
  };

  let storageOk = true;
  let state = blankState();
  let incoming = null;
  let selectedColor = "none";

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

  function colorById(id) {
    return COLORS.find((color) => color.id === id) || COLORS[COLORS.length - 1];
  }

  function blankSpot() {
    return {
      id: uid(),
      venue: "",
      garage: "",
      level: "",
      section: "",
      spot: "",
      note: "",
      color: "none",
      savedAt: 0,
    };
  }

  function blankState() {
    return { v: 1, current: null, history: [] };
  }

  function normalizeSpot(raw) {
    if (!raw || typeof raw !== "object") return null;
    const spot = {
      id: String(raw.id || uid()).slice(0, 64),
      venue: clampText(raw.venue, 80),
      garage: clampText(raw.garage, 24),
      level: clampText(raw.level, 24),
      section: clampText(raw.section, 24),
      spot: clampText(raw.spot, 16),
      note: clampText(raw.note, 160),
      color: colorById(raw.color).id,
      savedAt: Number.isFinite(raw.savedAt) ? raw.savedAt : Date.now(),
    };
    if (!spot.garage && !spot.level && !spot.section && !spot.spot) return null;
    return spot;
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return blankState();
    const history = Array.isArray(raw.history)
      ? raw.history.map(normalizeSpot).filter(Boolean).slice(0, HISTORY_CAP)
      : [];
    return {
      v: 1,
      current: normalizeSpot(raw.current),
      history,
    };
  }

  function fingerprint(spot) {
    if (!spot) return "";
    return [spot.venue, spot.garage, spot.level, spot.section, spot.spot, spot.color]
      .map((part) => String(part || "").toLowerCase())
      .join("|");
  }

  function formValues() {
    return {
      venue: clampText(els.fieldVenue.value, 80),
      garage: clampText(els.fieldGarage.value, 24),
      level: clampText(els.fieldLevel.value, 24),
      section: clampText(els.fieldSection.value, 24),
      spot: clampText(els.fieldSpot.value, 16),
      note: clampText(els.fieldNote.value, 160),
      color: selectedColor,
    };
  }

  function fillForm(spot) {
    const src = spot || blankSpot();
    els.fieldVenue.value = src.venue;
    els.fieldGarage.value = src.garage;
    els.fieldLevel.value = src.level;
    els.fieldSection.value = src.section;
    els.fieldSpot.value = src.spot;
    els.fieldNote.value = src.note;
    selectedColor = colorById(src.color).id;
    renderColorChips();
  }

  function pushHistory(spot) {
    if (!spot) return;
    const print = fingerprint(spot);
    state.history = [spot, ...state.history.filter((item) => fingerprint(item) !== print)].slice(0, HISTORY_CAP);
  }

  function sampleSpot() {
    return {
      id: uid(),
      venue: "Westfield Valley Fair",
      garage: "C",
      level: "3",
      section: "H",
      spot: "412",
      note: "By the elevator, near the cart return",
      color: "silver",
      savedAt: Date.now(),
    };
  }

  function toast(msg, ms) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove("show"), ms || 2400);
  }

  function probeStorage() {
    try {
      const probe = STORAGE_KEY + "-probe";
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
    if (!storageOk) return blankState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return blankState();
      return normalizeState(JSON.parse(raw));
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
      return blankState();
    }
  }

  function save() {
    if (!storageOk) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
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

  function sharePayload(spot) {
    return {
      v: 1,
      venue: spot.venue,
      garage: spot.garage,
      level: spot.level,
      section: spot.section,
      spot: spot.spot,
      note: spot.note,
      color: spot.color,
      savedAt: spot.savedAt,
    };
  }

  async function encodeShare(spot) {
    const packed = await compressPayload(JSON.stringify(sharePayload(spot)));
    return location.origin + location.pathname + HASH_PREFIX + packed;
  }

  function cleanShareUrl() {
    const url = new URL(location.href);
    url.hash = "";
    url.searchParams.delete(QUERY_KEY);
    history.replaceState(null, "", url.pathname + url.search);
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
      const spot = normalizeSpot(JSON.parse(json));
      cleanShareUrl();
      return spot;
    } catch (_) {
      cleanShareUrl();
      toast("That snapshot could not be read.", 3200);
      return null;
    }
  }

  function formatSpotLine(spot) {
    const bits = [];
    if (spot.garage) bits.push("Garage " + spot.garage);
    if (spot.level) bits.push("Level " + spot.level);
    if (spot.section) bits.push("Row " + spot.section);
    if (spot.spot) bits.push("#" + spot.spot);
    return bits.join(" · ");
  }

  function formatAsText(spot) {
    const lines = [];
    if (spot.venue) lines.push(spot.venue);
    const line = formatSpotLine(spot);
    if (line) lines.push(line);
    const color = colorById(spot.color);
    if (color.id !== "none") lines.push("Car: " + color.label);
    if (spot.note) lines.push(spot.note);
    return lines.join("\n") || "Parked — details on this device.";
  }

  function heroLabel(spot) {
    if (spot.spot) return spot.spot;
    if (spot.section) return spot.section;
    if (spot.level) return "L" + spot.level;
    if (spot.garage) return spot.garage;
    return "—";
  }

  function relativeTime(ts) {
    if (!ts) return "";
    const delta = Date.now() - ts;
    if (delta < 45 * 1000) return "Saved just now";
    if (delta < 90 * 1000) return "Saved 1 min ago";
    if (delta < 50 * 60 * 1000) return "Saved " + Math.round(delta / 60000) + " min ago";
    if (delta < 36 * 60 * 60 * 1000) return "Saved " + Math.round(delta / 3600000) + " hr ago";
    const days = Math.round(delta / 86400000);
    return days === 1 ? "Saved yesterday" : "Saved " + days + " days ago";
  }

  function renderColorChips() {
    els.colorChips.innerHTML = "";
    for (const color of COLORS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-chip";
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", color.id === selectedColor ? "true" : "false");
      btn.dataset.color = color.id;
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = color.hex || "transparent";
      if (!color.hex) {
        swatch.style.background =
          "repeating-linear-gradient(135deg, #3a362e 0 4px, transparent 4px 8px)";
      }
      btn.appendChild(swatch);
      btn.appendChild(document.createTextNode(color.label));
      btn.addEventListener("click", () => {
        selectedColor = color.id;
        renderColorChips();
      });
      els.colorChips.appendChild(btn);
    }
  }

  function renderShareOffer() {
    if (!incoming) {
      els.shareOffer.hidden = true;
      return;
    }
    els.shareOffer.hidden = false;
    els.sharePreview.textContent = formatAsText(incoming);
  }

  function renderHero() {
    const spot = state.current;
    if (!spot) {
      els.hero.hidden = true;
      els.emptyState.hidden = false;
      return;
    }
    els.emptyState.hidden = true;
    els.hero.hidden = false;
    els.heroKicker.textContent = spot.venue ? "You parked at" : "You parked";
    els.heroSpot.textContent = heroLabel(spot);
    els.heroVenue.textContent = spot.venue;
    els.heroVenue.hidden = !spot.venue;
    els.heroMeta.textContent = formatSpotLine(spot);
    const color = colorById(spot.color);
    if (color.id === "none") {
      els.heroColor.hidden = true;
    } else {
      els.heroColor.hidden = false;
      els.heroSwatch.style.background = color.hex;
      els.heroColorLabel.textContent = color.label;
    }
    if (spot.note) {
      els.heroNote.hidden = false;
      els.heroNote.textContent = spot.note;
    } else {
      els.heroNote.hidden = true;
    }
    els.heroTime.textContent = relativeTime(spot.savedAt);
  }

  function renderEditor() {
    const hasCurrent = !!state.current;
    els.editorTitle.textContent = hasCurrent ? "Edit this spot" : "Save this spot";
    els.editorMeta.textContent = hasCurrent
      ? "Change a field and save. The old stall moves into recent history."
      : "Venue is optional. Need at least a garage, level, row, or stall.";
    if (!hasCurrent) els.editorBox.open = true;
  }

  function renderHistory() {
    const items = state.history;
    els.btnClearHistory.hidden = items.length === 0;
    if (!items.length) {
      els.historyEmpty.hidden = false;
      els.historyList.hidden = true;
      els.historyList.innerHTML = "";
      return;
    }
    els.historyEmpty.hidden = true;
    els.historyList.hidden = false;
    els.historyList.innerHTML = "";
    for (const spot of items) {
      const li = document.createElement("li");
      const main = document.createElement("div");
      main.className = "history-main";
      const title = document.createElement("p");
      title.className = "history-title";
      title.textContent = spot.venue || formatSpotLine(spot) || "Parked";
      const meta = document.createElement("p");
      meta.className = "history-meta";
      const extras = [formatSpotLine(spot), relativeTime(spot.savedAt)].filter(Boolean);
      meta.textContent = extras.join(" · ");
      main.appendChild(title);
      main.appendChild(meta);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn ghost";
      btn.textContent = "Restore";
      btn.addEventListener("click", () => restoreSpot(spot.id));
      li.appendChild(main);
      li.appendChild(btn);
      els.historyList.appendChild(li);
    }
  }

  function renderVenues() {
    const names = [];
    const seen = new Set();
    const pool = [state.current, ...state.history].filter(Boolean);
    for (const spot of pool) {
      if (!spot.venue) continue;
      const key = spot.venue.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(spot.venue);
    }
    els.venueHints.replaceChildren();
    for (const name of names) {
      const option = document.createElement("option");
      option.value = name;
      els.venueHints.appendChild(option);
    }
  }

  function render() {
    renderShareOffer();
    renderHero();
    renderEditor();
    renderHistory();
    renderVenues();
    renderColorChips();
  }

  function saveCurrent(fromForm) {
    const values = fromForm || formValues();
    const next = normalizeSpot({
      ...values,
      id: uid(),
      savedAt: Date.now(),
    });
    if (!next) {
      toast("Need a garage, level, row, or spot number.");
      return false;
    }
    if (state.current && fingerprint(state.current) !== fingerprint(next)) {
      pushHistory(state.current);
    }
    state.history = state.history.filter((item) => fingerprint(item) !== fingerprint(next));
    state.current = next;
    els.editorBox.open = false;
    persist();
    toast("Spot saved on this device.");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  function clearCurrent() {
    if (!state.current) return;
    pushHistory(state.current);
    state.current = null;
    fillForm(null);
    persist();
    toast("Current stall cleared. It is in recent history.");
  }

  function restoreSpot(id) {
    const idx = state.history.findIndex((item) => item.id === id);
    if (idx < 0) return;
    const chosen = state.history[idx];
    state.history.splice(idx, 1);
    if (state.current) pushHistory(state.current);
    state.current = chosen;
    fillForm(chosen);
    els.editorBox.open = false;
    persist();
    toast("Restored as current.");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    if (!state.current) {
      toast("Save a stall before you share a snapshot.");
      return;
    }
    const url = await encodeShare(state.current);
    els.shareUrlBox.value = url;
    els.shareDialog.showModal();
  }

  function useIncoming() {
    if (!incoming) return;
    if (state.current && fingerprint(state.current) !== fingerprint(incoming)) {
      pushHistory(state.current);
    }
    state.history = state.history.filter((item) => fingerprint(item) !== fingerprint(incoming));
    state.current = { ...incoming, id: uid(), savedAt: Date.now() };
    incoming = null;
    fillForm(state.current);
    els.editorBox.open = false;
    persist();
    toast("Shared stall is now current on this device.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function dismissIncoming() {
    incoming = null;
    renderShareOffer();
  }

  els.spotForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveCurrent();
  });

  document.getElementById("btnMobileSave").addEventListener("click", () => saveCurrent());
  document.getElementById("btnResetForm").addEventListener("click", () => {
    fillForm(state.current);
    toast(state.current ? "Form reset to the saved stall." : "Form cleared.");
  });
  document.getElementById("btnSample").addEventListener("click", () => {
    fillForm(sampleSpot());
    els.editorBox.open = true;
    els.fieldSpot.focus();
    toast("Sample stall loaded. Save it if you want it on this device.");
  });
  document.getElementById("btnClear").addEventListener("click", clearCurrent);
  document.getElementById("btnShare").addEventListener("click", shareSnapshot);
  document.getElementById("btnCopyText").addEventListener("click", async () => {
    if (!state.current) return;
    const ok = await copyText(formatAsText(state.current));
    toast(ok ? "Copied as text." : "Could not copy. Select the hero and copy.");
  });
  document.getElementById("btnUseShare").addEventListener("click", useIncoming);
  document.getElementById("btnDismissShare").addEventListener("click", dismissIncoming);
  document.getElementById("btnClearHistory").addEventListener("click", () => {
    if (!window.confirm("Clear recent parks on this device? The current stall stays.")) return;
    state.history = [];
    persist();
    toast("History cleared.");
  });
  document.getElementById("btnAbout").addEventListener("click", () => els.aboutDialog.showModal());
  document.getElementById("btnCloseAbout").addEventListener("click", () => els.aboutDialog.close());
  document.getElementById("btnCloseShare").addEventListener("click", () => els.shareDialog.close());
  document.getElementById("btnCopyShare").addEventListener("click", async () => {
    const ok = await copyText(els.shareUrlBox.value);
    toast(ok ? "Link copied." : "Copy the URL from the box.");
  });

  async function boot() {
    state = load();
    incoming = await tryImportShare();
    if (incoming && state.current && fingerprint(incoming) === fingerprint(state.current)) {
      incoming = null;
      toast("This shared stall is already current.");
    }
    fillForm(state.current);
    render();
  }

  boot();
})();
