(() => {
  const STORAGE_KEY = TipMath.STORAGE_KEY;
  const HASH_PREFIX = "#t=";
  const QUERY_KEY = "t";

  const els = {
    storageFail: document.getElementById("storageFail"),
    shareOffer: document.getElementById("shareOffer"),
    sharePreview: document.getElementById("sharePreview"),
    emptyState: document.getElementById("emptyState"),
    hero: document.getElementById("hero"),
    heroKicker: document.getElementById("heroKicker"),
    heroTotal: document.getElementById("heroTotal"),
    heroSplit: document.getElementById("heroSplit"),
    heroTip: document.getElementById("heroTip"),
    heroEach: document.getElementById("heroEach"),
    heroSeats: document.getElementById("heroSeats"),
    heroNote: document.getElementById("heroNote"),
    fieldSubtotal: document.getElementById("fieldSubtotal"),
    fieldTax: document.getElementById("fieldTax"),
    fieldCustom: document.getElementById("fieldCustom"),
    fieldPeople: document.getElementById("fieldPeople"),
    fieldRoundUp: document.getElementById("fieldRoundUp"),
    tipChips: document.getElementById("tipChips"),
    customWrap: document.getElementById("customWrap"),
    tipOnHint: document.getElementById("tipOnHint"),
    historyEmpty: document.getElementById("historyEmpty"),
    historyList: document.getElementById("historyList"),
    btnClearHistory: document.getElementById("btnClearHistory"),
    shareDialog: document.getElementById("shareDialog"),
    shareUrlBox: document.getElementById("shareUrlBox"),
    toast: document.getElementById("toast"),
  };

  let storageOk = true;
  let state = TipMath.emptyState();
  let incoming = false;
  let lastResult = null;
  let toastTimer = 0;

  function toast(msg, ms) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), ms || 2400);
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
    if (!storageOk) return TipMath.emptyState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return TipMath.emptyState();
      return TipMath.normalizeState(JSON.parse(raw));
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
      return TipMath.emptyState();
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

  async function encodeShare(result) {
    const packed = await compressPayload(JSON.stringify(TipMath.sharePayload(result)));
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
      const raw = JSON.parse(json);
      const result = TipMath.compute(raw);
      cleanShareUrl();
      if (!result.ok || result.subtotalCents <= 0) throw new Error("empty");
      return result;
    } catch (_) {
      cleanShareUrl();
      toast("That snapshot could not be read.", 3200);
      return null;
    }
  }

  function sampleDraft() {
    return {
      subtotal: "86.40",
      tax: "7.56",
      tipPercent: 20,
      customPercent: "",
      tipOn: "subtotal",
      people: 3,
      roundUp: false,
    };
  }

  function readForm() {
    const custom = TipMath.parsePercent(els.fieldCustom.value);
    const usingCustom = !els.customWrap.hidden && custom != null;
    return {
      subtotal: els.fieldSubtotal.value,
      tax: els.fieldTax.value,
      tipPercent: usingCustom ? custom : state.draft.tipPercent,
      customPercent: els.fieldCustom.value,
      tipOn: state.draft.tipOn,
      people: TipMath.clampPeople(els.fieldPeople.value),
      roundUp: els.fieldRoundUp.checked,
    };
  }

  function fillForm(draft) {
    const src = TipMath.normalizeDraft(draft);
    state.draft = src;
    els.fieldSubtotal.value = src.subtotal;
    els.fieldTax.value = src.tax;
    els.fieldPeople.value = String(src.people);
    els.fieldRoundUp.checked = src.roundUp;
    const chipHit = TipMath.TIP_CHIPS.indexOf(src.tipPercent) !== -1;
    els.customWrap.hidden = chipHit && !src.customPercent;
    els.fieldCustom.value = src.customPercent || (chipHit ? "" : String(src.tipPercent));
    renderTipOn();
    renderTipChips();
  }

  function captureDraft() {
    state.draft = TipMath.normalizeDraft(readForm());
    return TipMath.computeDraft(state.draft);
  }

  function relativeTime(ts) {
    if (!ts) return "";
    const delta = Date.now() - ts;
    if (delta < 45 * 1000) return "just now";
    if (delta < 90 * 1000) return "1 min ago";
    if (delta < 50 * 60 * 1000) return Math.round(delta / 60000) + " min ago";
    if (delta < 36 * 60 * 60 * 1000) return Math.round(delta / 3600000) + " hr ago";
    const days = Math.round(delta / 86400000);
    return days === 1 ? "yesterday" : days + " days ago";
  }

  function renderTipOn() {
    const onTotal = state.draft.tipOn === "total";
    document.getElementById("btnTipSubtotal").setAttribute("aria-pressed", onTotal ? "false" : "true");
    document.getElementById("btnTipTotal").setAttribute("aria-pressed", onTotal ? "true" : "false");
    els.tipOnHint.textContent = onTotal
      ? "Tip is figured on subtotal plus tax."
      : "Tip is figured on the food and drink, before tax.";
  }

  function renderTipChips() {
    els.tipChips.innerHTML = "";
    const current = state.draft.tipPercent;
    const chipHit = TipMath.TIP_CHIPS.indexOf(current) !== -1 && els.customWrap.hidden;
    for (const pct of TipMath.TIP_CHIPS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tip-chip";
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", chipHit && pct === current ? "true" : "false");
      btn.textContent = pct + "%";
      btn.addEventListener("click", () => {
        state.draft.tipPercent = pct;
        state.draft.customPercent = "";
        els.customWrap.hidden = true;
        els.fieldCustom.value = "";
        onFormChange();
      });
      els.tipChips.appendChild(btn);
    }
    const customBtn = document.createElement("button");
    customBtn.type = "button";
    customBtn.className = "tip-chip";
    customBtn.setAttribute("role", "radio");
    customBtn.setAttribute("aria-checked", chipHit ? "false" : "true");
    customBtn.textContent = "Custom";
    customBtn.addEventListener("click", () => {
      els.customWrap.hidden = false;
      if (!els.fieldCustom.value) els.fieldCustom.value = String(state.draft.tipPercent);
      const parsed = TipMath.parsePercent(els.fieldCustom.value);
      if (parsed != null) state.draft.tipPercent = parsed;
      els.fieldCustom.focus();
      onFormChange();
    });
    els.tipChips.appendChild(customBtn);
  }

  function renderShareOffer() {
    els.shareOffer.hidden = !incoming;
    if (incoming && lastResult) {
      els.sharePreview.textContent = TipMath.formatAsText(lastResult);
    }
  }

  function renderHero(result) {
    lastResult = result && result.ok ? result : null;
    if (!lastResult) {
      els.hero.hidden = true;
      els.emptyState.hidden = false;
      return;
    }
    els.emptyState.hidden = true;
    els.hero.hidden = false;
    const people = lastResult.people;
    els.heroKicker.textContent = people === 1 ? "Solo check" : people + " at the table";
    els.heroTotal.textContent = TipMath.formatMoney(lastResult.tableTotalCents);
    els.heroSplit.textContent = TipMath.formatSharesLine(lastResult);
    els.heroTip.textContent = TipMath.formatMoney(lastResult.paidTipCents);
    const top = lastResult.buckets[0];
    els.heroEach.textContent = top ? TipMath.formatMoney(top.cents) : "—";

    els.heroSeats.innerHTML = "";
    if (people > 1 && people <= 12) {
      els.heroSeats.hidden = false;
      const maxShare = Math.max.apply(null, lastResult.shares);
      lastResult.shares.forEach((cents, index) => {
        const li = document.createElement("li");
        if (cents === maxShare && lastResult.buckets.length > 1) li.className = "is-extra";
        const label = document.createElement("span");
        label.className = "seat-label";
        label.textContent = "Seat " + (index + 1);
        const amt = document.createElement("span");
        amt.className = "seat-amt";
        amt.textContent = TipMath.formatMoney(cents);
        li.appendChild(label);
        li.appendChild(amt);
        els.heroSeats.appendChild(li);
      });
    } else {
      els.heroSeats.hidden = true;
    }

    if (lastResult.roundUp && lastResult.extraFromRoundUp) {
      els.heroNote.hidden = false;
      els.heroNote.textContent =
        "Rounded up per person. Extra " +
        TipMath.formatMoney(lastResult.extraFromRoundUp) +
        " lands in the tip.";
    } else if (lastResult.buckets.length > 1) {
      els.heroNote.hidden = false;
      els.heroNote.textContent = "Leftover pennies go to the first seats so the table still adds up.";
    } else {
      els.heroNote.hidden = true;
    }
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
    for (const row of items) {
      const result = TipMath.compute(row);
      const li = document.createElement("li");
      const main = document.createElement("div");
      main.className = "history-main";
      const title = document.createElement("p");
      title.className = "history-title";
      title.textContent = TipMath.formatMoney(result.tableTotalCents) + " · " + result.people + (result.people === 1 ? " person" : " people");
      const meta = document.createElement("p");
      meta.className = "history-meta";
      meta.textContent = [
        "tip " + TipMath.formatPercent(result.tipPercent),
        result.tipOn === "total" ? "after tax" : "on subtotal",
        relativeTime(row.at),
      ].join(" · ");
      main.appendChild(title);
      main.appendChild(meta);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn ghost";
      btn.textContent = "Restore";
      btn.addEventListener("click", () => restoreRow(row.id));
      li.appendChild(main);
      li.appendChild(btn);
      els.historyList.appendChild(li);
    }
  }

  function render() {
    const result = captureDraft();
    renderTipOn();
    renderTipChips();
    renderHero(result);
    renderShareOffer();
    renderHistory();
  }

  function onFormChange() {
    const result = captureDraft();
    els.fieldPeople.value = String(state.draft.people);
    save();
    renderHero(result);
    renderTipOn();
    renderTipChips();
    renderShareOffer();
    renderHistory();
  }

  function keepCheck() {
    const result = captureDraft();
    if (!result.ok) {
      toast("Enter a subtotal first.");
      return false;
    }
    TipMath.pushHistory(state, result);
    persist();
    toast("Check kept on this device.");
    return true;
  }

  function restoreRow(id) {
    const row = state.history.find((item) => item.id === id);
    if (!row) return;
    const result = TipMath.compute(row);
    fillForm(TipMath.draftFromCompute(result));
    persist();
    toast("Restored to the pad.");
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
    const result = captureDraft();
    if (!result.ok) {
      toast("Enter a subtotal before you share a snapshot.");
      return;
    }
    TipMath.pushHistory(state, result);
    save();
    renderHistory();
    const url = await encodeShare(result);
    els.shareUrlBox.value = url;
    els.shareDialog.showModal();
  }

  document.getElementById("btnTipSubtotal").addEventListener("click", () => {
    state.draft.tipOn = "subtotal";
    onFormChange();
  });
  document.getElementById("btnTipTotal").addEventListener("click", () => {
    state.draft.tipOn = "total";
    onFormChange();
  });
  document.getElementById("btnPeopleDown").addEventListener("click", () => {
    els.fieldPeople.value = String(TipMath.clampPeople(Number(els.fieldPeople.value) - 1));
    onFormChange();
  });
  document.getElementById("btnPeopleUp").addEventListener("click", () => {
    els.fieldPeople.value = String(TipMath.clampPeople(Number(els.fieldPeople.value) + 1));
    onFormChange();
  });

  ["fieldSubtotal", "fieldTax", "fieldCustom", "fieldPeople"].forEach((id) => {
    const node = document.getElementById(id);
    node.addEventListener("input", onFormChange);
    node.addEventListener("change", onFormChange);
  });
  els.fieldRoundUp.addEventListener("change", onFormChange);

  document.getElementById("billForm").addEventListener("submit", (event) => {
    event.preventDefault();
    keepCheck();
  });
  document.getElementById("btnSample").addEventListener("click", () => {
    fillForm(sampleDraft());
    persist();
    toast("Sample check loaded. Keep it if you want it on this device.");
  });
  document.getElementById("btnShare").addEventListener("click", shareSnapshot);
  document.getElementById("btnCopyText").addEventListener("click", async () => {
    const result = captureDraft();
    if (!result.ok) return;
    const ok = await copyText(TipMath.formatAsText(result));
    toast(ok ? "Copied as text." : "Could not copy. Select the check and copy.");
  });
  document.getElementById("btnKeep").addEventListener("click", keepCheck);
  document.getElementById("btnDismissShare").addEventListener("click", () => {
    incoming = false;
    renderShareOffer();
  });
  document.getElementById("btnClearHistory").addEventListener("click", () => {
    if (!window.confirm("Clear recent checks on this device? The pad stays.")) return;
    state.history = [];
    persist();
    toast("History cleared.");
  });
  document.getElementById("btnCloseShare").addEventListener("click", () => els.shareDialog.close());
  document.getElementById("btnCopyShare").addEventListener("click", async () => {
    const ok = await copyText(els.shareUrlBox.value);
    toast(ok ? "Link copied." : "Copy the URL from the box.");
  });

  async function boot() {
    state = load();
    fillForm(state.draft);
    const shared = await tryImportShare();
    if (shared) {
      fillForm(TipMath.draftFromCompute(shared));
      incoming = true;
      lastResult = shared;
      save();
    }
    render();
  }

  boot();
})();
