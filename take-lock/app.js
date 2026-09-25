(() => {
  const HASH_PREFIX = "#t=";
  const QUERY_KEY = "t";

  const els = {
    storageFail: document.getElementById("storageFail"),
    honest: document.getElementById("honest"),
    shareOffer: document.getElementById("shareOffer"),
    offerLead: document.getElementById("offerLead"),
    offerFace: document.getElementById("offerFace"),
    btnKeepShare: document.getElementById("btnKeepShare"),
    btnMergeShare: document.getElementById("btnMergeShare"),
    vaultView: document.getElementById("vaultView"),
    meter: document.getElementById("meter"),
    meterClass: document.getElementById("meterClass"),
    meterDigits: document.getElementById("meterDigits"),
    meterLabel: document.getElementById("meterLabel"),
    meterSub: document.getElementById("meterSub"),
    toolbar: document.getElementById("toolbar"),
    btnShareVault: document.getElementById("btnShareVault"),
    filters: document.getElementById("filters"),
    shelfSub: document.getElementById("shelfSub"),
    emptyState: document.getElementById("emptyState"),
    filterEmpty: document.getElementById("filterEmpty"),
    filterEmptyKicker: document.getElementById("filterEmptyKicker"),
    filterEmptyTitle: document.getElementById("filterEmptyTitle"),
    filterEmptyBody: document.getElementById("filterEmptyBody"),
    list: document.getElementById("list"),
    btnClear: document.getElementById("btnClear"),
    formPanel: document.getElementById("formPanel"),
    takeForm: document.getElementById("takeForm"),
    formKicker: document.getElementById("formKicker"),
    formHeading: document.getElementById("formHeading"),
    fieldTitle: document.getElementById("fieldTitle"),
    fieldBody: document.getElementById("fieldBody"),
    bodyCount: document.getElementById("bodyCount"),
    fieldTag: document.getElementById("fieldTag"),
    tagChips: document.getElementById("tagChips"),
    presetChips: document.getElementById("presetChips"),
    fieldUnlock: document.getElementById("fieldUnlock"),
    formError: document.getElementById("formError"),
    btnSave: document.getElementById("btnSave"),
    posterPanel: document.getElementById("posterPanel"),
    poster: document.getElementById("poster"),
    btnPosterReveal: document.getElementById("btnPosterReveal"),
    shareDialog: document.getElementById("shareDialog"),
    shareTitle: document.getElementById("shareTitle"),
    shareLead: document.getElementById("shareLead"),
    shareUrlBox: document.getElementById("shareUrlBox"),
    toast: document.getElementById("toast"),
    toastText: document.getElementById("toastText"),
    toastUndo: document.getElementById("toastUndo"),
  };

  let storageOk = true;
  let state = TakeLock.emptyState();
  let incoming = null;
  let view = "vault";
  let formMode = "add";
  let editingId = "";
  let posterId = "";
  let armed = new Set();
  let undoBag = null;
  let toastTimer = 0;
  let tickTimer = 0;
  let crackId = "";
  let pendingFocus = "";

  function reasonMessage(reason) {
    switch (reason) {
      case "title":
        return "Name the game or the matchup.";
      case "body":
        return "Write the take before you seal it.";
      case "unlock":
        return "Pick when the seal can break.";
      case "far":
        return "Unlock has to land within 400 days.";
      case "cap":
        return "This vault holds 24 takes. Remove one to seal another.";
      case "missing":
        return "That take is not on this device.";
      case "locked":
        return "That seal is still shut.";
      case "exists":
        return "That take is already on this device.";
      default: {
        const _never = reason;
        throw new Error("Unknown reason " + _never);
      }
    }
  }

  function toast(message, options) {
    const opts = options || {};
    els.toastText.textContent = message;
    undoBag = opts.undo || null;
    els.toastUndo.hidden = !undoBag;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      els.toast.classList.remove("show");
      els.toastUndo.hidden = true;
      undoBag = null;
    }, opts.ms || 6400);
  }

  function probeStorage() {
    try {
      const probe = TakeLock.STORAGE_KEY + "-probe";
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
      "Take Lock cannot save on this device. Browser storage is blocked (private mode or a setting). The vault will not persist.";
  }

  function loadStored() {
    if (!probeStorage()) {
      failStorage();
      return null;
    }
    try {
      const raw = localStorage.getItem(TakeLock.STORAGE_KEY);
      if (!raw) return null;
      return TakeLock.normalizeState(JSON.parse(raw));
    } catch (_) {
      failStorage();
      return null;
    }
  }

  function save() {
    if (!storageOk) return false;
    try {
      localStorage.setItem(TakeLock.STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (_) {
      failStorage();
      return false;
    }
  }

  function syncArmed(now) {
    const next = new Set();
    state.takes.forEach((take) => {
      if (TakeLock.phase(take, now) === "sealed") next.add(take.id);
    });
    armed = next;
  }

  function findTake(id) {
    return state.takes.find((take) => take.id === id) || null;
  }

  function setView(next) {
    view = next;
    document.body.dataset.view = next;
    els.vaultView.hidden = next !== "vault";
    els.formPanel.hidden = next !== "form";
    els.posterPanel.hidden = next !== "poster";
  }

  function toLocalInput(ms) {
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function hideFormError() {
    els.formError.hidden = true;
    els.formError.textContent = "";
    els.fieldTitle.removeAttribute("aria-invalid");
    els.fieldBody.removeAttribute("aria-invalid");
    els.fieldUnlock.removeAttribute("aria-invalid");
  }

  function showFormError(reason) {
    els.formError.hidden = false;
    els.formError.textContent = reasonMessage(reason);
    switch (reason) {
      case "title":
        els.fieldTitle.setAttribute("aria-invalid", "true");
        els.fieldTitle.focus();
        break;
      case "body":
        els.fieldBody.setAttribute("aria-invalid", "true");
        els.fieldBody.focus();
        break;
      case "unlock":
      case "far":
        els.fieldUnlock.setAttribute("aria-invalid", "true");
        els.fieldUnlock.focus();
        break;
      case "cap":
      case "missing":
      case "locked":
      case "exists":
        break;
      default: {
        const _never = reason;
        throw new Error("Unknown reason " + _never);
      }
    }
  }

  function paintBodyCount() {
    const len = els.fieldBody.value.length;
    els.bodyCount.textContent = len + " / " + TakeLock.BODY_MAX;
  }

  function pressPreset(kind) {
    els.presetChips.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.preset === kind ? "true" : "false");
    });
  }

  function applyUnlock(ms, kind) {
    els.fieldUnlock.value = toLocalInput(ms);
    pressPreset(kind);
  }

  function paintTagChips() {
    const current = els.fieldTag.value.trim();
    els.tagChips.querySelectorAll("[data-tag]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.tag === current ? "true" : "false");
    });
  }

  function openAdd() {
    formMode = "add";
    editingId = "";
    els.formKicker.textContent = "New seal";
    els.formHeading.textContent = "Seal a take";
    els.btnSave.textContent = "Seal on this device";
    els.fieldTitle.value = "";
    els.fieldBody.value = "";
    els.fieldTag.value = "";
    hideFormError();
    paintBodyCount();
    paintTagChips();
    applyUnlock(TakeLock.presetUnlock("60", Date.now()), "60");
    setView("form");
    render();
    els.fieldTitle.focus();
  }

  function openEdit(id) {
    const take = findTake(id);
    if (!take) {
      toast(reasonMessage("missing"));
      return;
    }
    formMode = "edit";
    editingId = id;
    els.formKicker.textContent = "Edit";
    els.formHeading.textContent = "Edit this take";
    els.btnSave.textContent = "Save on this device";
    els.fieldTitle.value = take.title;
    els.fieldBody.value = take.body;
    els.fieldTag.value = take.tag;
    hideFormError();
    paintBodyCount();
    paintTagChips();
    applyUnlock(take.unlockAt, "");
    setView("form");
    render();
    els.fieldTitle.focus();
  }

  function cancelForm() {
    const backTo = editingId && findTake(editingId) ? "poster" : "vault";
    if (backTo === "poster") posterId = editingId;
    setView(backTo);
    render();
  }

  function readDraft() {
    const raw = els.fieldUnlock.value;
    const unlockAt = raw ? new Date(raw).getTime() : NaN;
    return {
      title: els.fieldTitle.value,
      body: els.fieldBody.value,
      tag: els.fieldTag.value,
      unlockAt: unlockAt,
    };
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function actionButton(action, label, className) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.action = action;
    btn.className = className || "btn ghost";
    btn.textContent = label;
    return btn;
  }

  function paintMeter(now) {
    if (!state.takes.length) {
      els.meter.hidden = true;
      return;
    }
    const next = TakeLock.spotlight(state, now);
    const face = TakeLock.publicFace(next, now);
    els.meter.hidden = false;
    els.meter.dataset.band = face.phase;
    els.meterClass.textContent = face.stamp;
    els.meterDigits.removeAttribute("data-countdown");
    switch (face.phase) {
      case "sealed":
        els.meterDigits.textContent = TakeLock.formatCountdown(face.unlockAt - now);
        els.meterDigits.setAttribute("data-countdown", String(face.unlockAt));
        els.meterLabel.textContent = "Until the next seal breaks";
        els.meterSub.textContent = face.title + " · " + TakeLock.formatUnlock(face.unlockAt);
        break;
      case "ready":
        els.meterDigits.textContent = "BREAK";
        els.meterLabel.textContent = "A seal can break";
        els.meterSub.textContent = face.title + " · tap Reveal";
        break;
      case "exposed":
        els.meterDigits.textContent = "OPEN";
        els.meterLabel.textContent = TakeLock.counts(state, now).exposed === 1 ? "The take is out" : "Every seal is open";
        els.meterSub.textContent = face.title;
        break;
      default: {
        const _never = face.phase;
        throw new Error("Unknown phase " + _never);
      }
    }
  }

  function filterEmptyCopy(filter) {
    switch (filter) {
      case "sealed":
        return {
          kicker: "Nothing shut",
          title: "Nothing is under seal.",
          body: "Exposed takes are still on this device. Switch the filter, or seal a new one.",
        };
      case "exposed":
        return {
          kicker: "Still shut",
          title: "Nothing has broken open.",
          body: "Sealed takes are still on this device. The clock has to land, then the seal can break.",
        };
      case "all":
        return {
          kicker: "The vault is empty",
          title: "Nothing kept yet.",
          body: "Seal a take and it will land here.",
        };
      default: {
        const _never = filter;
        throw new Error("Unknown filter " + _never);
      }
    }
  }

  function paintFilters(now) {
    const tally = TakeLock.counts(state, now);
    const waiting = tally.sealed + tally.ready;
    els.filters.querySelectorAll("[data-filter]").forEach((btn) => {
      const filter = btn.dataset.filter;
      let label = "All";
      switch (filter) {
        case "all":
          label = "All " + tally.all;
          break;
        case "sealed":
          label = "Sealed " + waiting;
          break;
        case "exposed":
          label = "Exposed " + tally.exposed;
          break;
        default: {
          const _never = filter;
          throw new Error("Unknown filter " + _never);
        }
      }
      btn.textContent = label;
      btn.setAttribute("aria-pressed", state.filter === filter ? "true" : "false");
    });
  }

  function whenLine(face) {
    const clock = TakeLock.formatUnlock(face.unlockAt);
    switch (face.phase) {
      case "sealed":
        return "Opens " + clock;
      case "ready":
        return "Unlocked " + clock;
      case "exposed":
        return "Opened " + clock;
      default: {
        const _never = face.phase;
        throw new Error("Unknown phase " + _never);
      }
    }
  }

  function cardNode(take, now) {
    const face = TakeLock.publicFace(take, now);
    const item = document.createElement("li");
    const card = el("article", "take-card " + face.phase);
    card.dataset.id = take.id;
    if (crackId === take.id) card.classList.add("cracking");

    const top = el("div", "take-top");
    top.append(el("span", "stamp", face.stamp));
    if (face.tag) top.append(el("span", "tag", face.tag));
    card.append(top);
    card.append(el("h3", "take-title", face.title));

    switch (face.phase) {
      case "sealed": {
        const count = el("p", "count", TakeLock.formatCountdown(face.unlockAt - now));
        count.setAttribute("data-countdown", String(face.unlockAt));
        count.setAttribute("aria-hidden", "true");
        card.append(count);
        const bars = el("div", "redact");
        bars.setAttribute("aria-hidden", "true");
        bars.append(el("span"), el("span"), el("span"));
        card.append(bars);
        card.append(el("p", "redact-note", "The take stays under the seal."));
        break;
      }
      case "ready":
        card.append(el("p", "redact-note", "The clock has landed. The words are still covered."));
        break;
      case "exposed":
        card.append(el("p", "take-body", face.body));
        break;
      default: {
        const _never = face.phase;
        throw new Error("Unknown phase " + _never);
      }
    }

    card.append(el("p", "take-when", whenLine(face)));

    const actions = el("div", "take-actions");
    if (face.phase === "ready") actions.append(actionButton("reveal", "Break the seal", "btn primary"));
    actions.append(
      actionButton("poster", "Card"),
      actionButton("edit", "Edit"),
      actionButton("remove", "Remove", "btn ghost danger")
    );
    card.append(actions);
    item.append(card);
    return item;
  }

  function paintList(now) {
    const visible = TakeLock.visibleTakes(state, now);
    const hasAny = state.takes.length > 0;
    els.toolbar.hidden = !hasAny;
    els.btnShareVault.disabled = !hasAny;
    els.filters.hidden = !hasAny;
    els.btnClear.hidden = !hasAny;
    els.emptyState.hidden = hasAny;
    els.list.hidden = !visible.length;
    els.list.replaceChildren();
    visible.forEach((take) => els.list.append(cardNode(take, now)));

    const waiting = TakeLock.counts(state, now);
    const shut = waiting.sealed + waiting.ready;
    els.shelfSub.textContent = hasAny
      ? shut + " waiting · " + waiting.exposed + " exposed"
      : "Nothing kept yet.";

    const showFilterEmpty = hasAny && !visible.length;
    els.filterEmpty.hidden = !showFilterEmpty;
    if (showFilterEmpty) {
      const copy = filterEmptyCopy(state.filter);
      els.filterEmptyKicker.textContent = copy.kicker;
      els.filterEmptyTitle.textContent = copy.title;
      els.filterEmptyBody.textContent = copy.body;
    }
    paintFilters(now);
  }

  function paintPoster(now) {
    const take = findTake(posterId);
    els.poster.replaceChildren();
    if (!take) {
      els.btnPosterReveal.hidden = true;
      return;
    }
    const face = TakeLock.publicFace(take, now);
    els.poster.className = "poster " + face.phase + (crackId === take.id ? " cracking" : "");
    els.poster.append(el("p", "poster-brand", "TAKE LOCK"));
    els.poster.append(el("p", "stamp poster-stamp", face.stamp));
    els.poster.append(el("h3", "poster-title", face.title));
    if (face.tag) els.poster.append(el("p", "poster-tag", face.tag));
    switch (face.phase) {
      case "sealed": {
        const count = el("p", "poster-count", TakeLock.formatCountdown(face.unlockAt - now));
        count.setAttribute("data-countdown", String(face.unlockAt));
        count.setAttribute("aria-hidden", "true");
        els.poster.append(count);
        const bars = el("div", "redact");
        bars.setAttribute("aria-hidden", "true");
        bars.append(el("span"), el("span"), el("span"));
        els.poster.append(bars);
        els.poster.append(el("p", "poster-when", "Sealed until " + TakeLock.formatUnlock(face.unlockAt)));
        break;
      }
      case "ready":
        els.poster.append(el("p", "poster-count", "BREAK"));
        els.poster.append(el("p", "poster-when", "Unlocked " + TakeLock.formatUnlock(face.unlockAt) + ". The take is still covered."));
        break;
      case "exposed":
        els.poster.append(el("p", "poster-body", face.body));
        els.poster.append(el("p", "poster-when", "Exposed · opened " + TakeLock.formatUnlock(face.unlockAt)));
        break;
      default: {
        const _never = face.phase;
        throw new Error("Unknown phase " + _never);
      }
    }
    els.btnPosterReveal.hidden = face.phase !== "ready";
  }

  function offerLines(share, now) {
    return share.takes.map((take) => {
      const face = TakeLock.publicFace(take, now);
      return face.title + " · " + face.stamp;
    }).join("\n");
  }

  function paintOffer(now) {
    const show = Boolean(incoming) && view === "vault";
    els.shareOffer.hidden = !show;
    if (!incoming) return;
    const localEmpty = state.takes.length === 0;
    els.btnKeepShare.textContent = localEmpty ? "Keep on this phone" : "Replace my vault";
    const have = new Set(state.takes.map((take) => take.id));
    const fresh = incoming.takes.filter((take) => !have.has(take.id)).length;
    els.btnMergeShare.hidden = localEmpty || fresh === 0;
    els.offerFace.textContent = offerLines(incoming, now);
    switch (incoming.k) {
      case "card":
        els.offerLead.textContent = "Someone sent one take. It is a copy, not live sync. The words stay hidden here until the unlock time.";
        break;
      case "vault":
        els.offerLead.textContent = "Someone sent a vault. It is a copy, not live sync. Later edits on their phone do not move this one.";
        break;
      default: {
        const _never = incoming.k;
        throw new Error("Unknown snapshot " + _never);
      }
    }
  }

  function render() {
    const now = Date.now();
    paintOffer(now);
    if (view === "vault") {
      paintMeter(now);
      paintList(now);
    }
    if (view === "poster") paintPoster(now);
    syncArmed(now);
    if (pendingFocus === "poster") {
      pendingFocus = "";
      const target = els.btnPosterReveal.hidden
        ? document.getElementById("btnPosterBack")
        : els.btnPosterReveal;
      if (target) target.focus();
    }
  }

  function reveal(id) {
    const result = TakeLock.revealTake(state, id, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    state = result.state;
    save();
    crackId = id;
    armed.delete(id);
    render();
    toast("Exposed.");
    window.setTimeout(() => {
      if (crackId === id) crackId = "";
    }, 900);
  }

  function onRemove(id) {
    const result = TakeLock.removeTake(state, id);
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    state = result.state;
    save();
    if (posterId === id) {
      posterId = "";
      setView("vault");
    }
    render();
    toast("Removed " + result.take.title + ".", {
      undo() {
        const restored = TakeLock.restoreTake(state, result.take, result.index);
        if (!restored.ok) {
          toast(reasonMessage(restored.reason));
          return;
        }
        state = restored.state;
        save();
        render();
        toast("Restored.");
      },
    });
  }

  function clearVault() {
    if (!state.takes.length) return;
    const previous = state;
    state = TakeLock.clearTakes(state);
    save();
    posterId = "";
    setView("vault");
    render();
    toast("Vault cleared.", {
      undo() {
        state = previous;
        save();
        render();
        toast("Vault restored.");
      },
    });
  }

  function keepShare() {
    if (!incoming) return;
    state = TakeLock.replaceWithShare(state, incoming);
    save();
    const opened = incoming.k === "card" ? incoming.takes[0].id : "";
    incoming = null;
    if (opened) {
      posterId = opened;
      pendingFocus = "poster";
      setView("poster");
    } else {
      setView("vault");
    }
    render();
    toast("Kept on this device.");
  }

  function mergeIncoming() {
    if (!incoming) return;
    const merged = TakeLock.mergeShare(state, incoming);
    state = merged.state;
    save();
    incoming = null;
    setView("vault");
    render();
    toast(mergeNote(merged));
  }

  function mergeNote(result) {
    if (!result.added && result.skipped) return "Those takes are already on this device.";
    if (result.dropped) return "Kept " + result.added + ". The vault holds 24, so " + result.dropped + " did not fit.";
    if (result.added === 1) return "Added 1 take on this device.";
    return "Added " + result.added + " takes on this device.";
  }

  function dismissShare() {
    incoming = null;
    render();
    toast("Snapshot dropped.");
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {
      /* fall through */
    }
    try {
      els.shareUrlBox.focus();
      els.shareUrlBox.select();
      return document.execCommand("copy");
    } catch (_) {
      return false;
    }
  }

  async function presentShare(payload, kind) {
    try {
      const packed = await TakeLock.compressPayload(JSON.stringify(payload));
      const url = location.origin + location.pathname + HASH_PREFIX + packed;
      els.shareUrlBox.value = url;
      switch (kind) {
        case "card":
          els.shareTitle.textContent = "A copy of this card.";
          els.shareLead.textContent = "Send this URL. They open this take. The screen stays sealed until the unlock time. Later edits here do not update their copy.";
          break;
        case "vault":
          els.shareTitle.textContent = "A copy of this vault.";
          els.shareLead.textContent = "Send this URL. They open this whole vault. Later edits here do not update their copy. Not live sync.";
          break;
        default: {
          const _never = kind;
          throw new Error("Unknown share " + _never);
        }
      }
      if (typeof els.shareDialog.showModal === "function") els.shareDialog.showModal();
    } catch (_) {
      toast("That snapshot could not be packed.");
    }
  }

  async function shareVault() {
    if (!state.takes.length) {
      toast("Seal a take before you copy the vault.");
      return;
    }
    await presentShare(TakeLock.shareVault(state), "vault");
  }

  async function sharePoster() {
    const take = findTake(posterId);
    if (!take) {
      toast(reasonMessage("missing"));
      return;
    }
    const payload = TakeLock.shareCard(take);
    if (!payload) {
      toast("That card could not be packed.");
      return;
    }
    await presentShare(payload, "card");
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
    if (hash.startsWith(HASH_PREFIX)) token = decodeURIComponent(hash.slice(HASH_PREFIX.length));
    else token = new URLSearchParams(location.search).get(QUERY_KEY) || "";
    if (!token) return null;
    try {
      const json = await TakeLock.decompressPayload(token);
      const parsed = TakeLock.parseShare(JSON.parse(json));
      cleanShareUrl();
      if (!parsed) throw new Error("empty");
      return parsed;
    } catch (_) {
      cleanShareUrl();
      toast("That snapshot could not be read.");
      return null;
    }
  }

  function onListClick(event) {
    const btn = event.target.closest("button");
    if (!btn || !els.list.contains(btn)) return;
    const card = btn.closest("[data-id]");
    if (!card) return;
    const id = card.dataset.id;
    const action = btn.dataset.action;
    switch (action) {
      case "reveal":
        reveal(id);
        break;
      case "poster":
        posterId = id;
        pendingFocus = "poster";
        setView("poster");
        render();
        break;
      case "edit":
        openEdit(id);
        break;
      case "remove":
        onRemove(id);
        break;
      default: {
        const _never = action;
        throw new Error("Unknown action " + _never);
      }
    }
  }

  function loadSample() {
    const added = TakeLock.addTake(state, TakeLock.sampleDraft(Date.now()), Date.now());
    if (!added.ok) {
      toast(reasonMessage(added.reason));
      return;
    }
    state = added.state;
    save();
    posterId = added.take.id;
    pendingFocus = "poster";
    setView("poster");
    render();
    toast("Sample sealed on this device.");
  }

  function tick() {
    const now = Date.now();
    const result = TakeLock.exposeArmed(state, Array.from(armed), now);
    if (result.opened.length) {
      state = result.state;
      result.opened.forEach((id) => armed.delete(id));
      crackId = result.opened[result.opened.length - 1];
      save();
      if (view !== "form") render();
      else syncArmed(Date.now());
      toast(result.opened.length === 1 ? "The seal cracked." : result.opened.length + " seals cracked.");
      window.setTimeout(() => { crackId = ""; }, 900);
      return;
    }
    document.querySelectorAll("[data-countdown]").forEach((node) => {
      const unlock = Number(node.getAttribute("data-countdown"));
      node.textContent = TakeLock.formatCountdown(unlock - now);
    });
  }

  function scheduleTick() {
    const delay = 1000 - (Date.now() % 1000) + 30;
    tickTimer = window.setTimeout(() => {
      tick();
      scheduleTick();
    }, delay);
  }

  function wire() {
    els.fieldTitle.maxLength = TakeLock.TITLE_MAX;
    els.fieldBody.maxLength = TakeLock.BODY_MAX;
    els.fieldTag.maxLength = TakeLock.TAG_MAX;
    document.getElementById("btnAdd").addEventListener("click", openAdd);
    document.getElementById("btnEmptyAdd").addEventListener("click", openAdd);
    document.getElementById("btnSample").addEventListener("click", loadSample);
    document.getElementById("btnCancelForm").addEventListener("click", cancelForm);
    els.btnShareVault.addEventListener("click", () => { shareVault(); });
    els.btnClear.addEventListener("click", clearVault);
    els.btnKeepShare.addEventListener("click", keepShare);
    els.btnMergeShare.addEventListener("click", mergeIncoming);
    document.getElementById("btnDismissShare").addEventListener("click", dismissShare);
    document.getElementById("btnPosterBack").addEventListener("click", () => {
      setView("vault");
      render();
    });
    els.btnPosterReveal.addEventListener("click", () => reveal(posterId));
    document.getElementById("btnPosterShare").addEventListener("click", () => { sharePoster(); });
    document.getElementById("btnPosterEdit").addEventListener("click", () => openEdit(posterId));
    document.getElementById("btnPosterRemove").addEventListener("click", () => onRemove(posterId));
    document.getElementById("btnCopyShare").addEventListener("click", async () => {
      const url = els.shareUrlBox.value;
      const copied = await copyText(url);
      if (!copied) window.prompt("Copy this snapshot:", url);
      else toast("Copied. A snapshot, not live sync.");
    });
    document.getElementById("btnCloseShare").addEventListener("click", () => {
      els.shareDialog.close();
    });
    els.toastUndo.addEventListener("click", () => {
      const undo = undoBag;
      undoBag = null;
      els.toast.classList.remove("show");
      els.toastUndo.hidden = true;
      window.clearTimeout(toastTimer);
      if (undo) undo();
    });
    els.list.addEventListener("click", onListClick);
    els.filters.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-filter]");
      if (!btn) return;
      state = TakeLock.setFilter(state, btn.dataset.filter);
      save();
      render();
    });
    els.presetChips.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-preset]");
      if (!btn) return;
      applyUnlock(TakeLock.presetUnlock(btn.dataset.preset, Date.now()), btn.dataset.preset);
    });
    els.tagChips.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-tag]");
      if (!btn) return;
      els.fieldTag.value = els.fieldTag.value.trim() === btn.dataset.tag ? "" : btn.dataset.tag;
      paintTagChips();
    });
    els.fieldTag.addEventListener("input", paintTagChips);
    els.fieldBody.addEventListener("input", paintBodyCount);
    els.fieldUnlock.addEventListener("input", () => pressPreset(""));
    els.takeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      hideFormError();
      const draft = readDraft();
      const now = Date.now();
      const result = formMode === "edit"
        ? TakeLock.updateTake(state, editingId, draft, now)
        : TakeLock.addTake(state, draft, now);
      if (!result.ok) {
        showFormError(result.reason);
        return;
      }
      state = result.state;
      save();
      posterId = result.take.id;
      pendingFocus = "poster";
      setView("poster");
      render();
      toast(formMode === "edit" ? "Updated on this device." : "Sealed on this device.");
    });
  }

  async function boot() {
    const stored = loadStored();
    if (stored) state = stored;
    wire();
    incoming = await tryImportShare();
    render();
    scheduleTick();
  }

  boot();
})();
