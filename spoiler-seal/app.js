(() => {
  "use strict";

  const HASH_PREFIX = "#v=";
  const QUERY_KEY = "v";

  const els = {
    storageFail: document.getElementById("storageFail"),
    announce: document.getElementById("announce"),
    shareOffer: document.getElementById("shareOffer"),
    offerLead: document.getElementById("offerLead"),
    offerFace: document.getElementById("offerFace"),
    btnKeepShare: document.getElementById("btnKeepShare"),
    shelfView: document.getElementById("shelfView"),
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
    btnSampleShelf: document.getElementById("btnSampleShelf"),
    formPanel: document.getElementById("formPanel"),
    sealForm: document.getElementById("sealForm"),
    formKicker: document.getElementById("formKicker"),
    formHeading: document.getElementById("formHeading"),
    fieldTitle: document.getElementById("fieldTitle"),
    fieldTag: document.getElementById("fieldTag"),
    fieldNote: document.getElementById("fieldNote"),
    fieldResult: document.getElementById("fieldResult"),
    resultCount: document.getElementById("resultCount"),
    tagChips: document.getElementById("tagChips"),
    presetChips: document.getElementById("presetChips"),
    fieldUnlock: document.getElementById("fieldUnlock"),
    formError: document.getElementById("formError"),
    btnSave: document.getElementById("btnSave"),
    cardPanel: document.getElementById("cardPanel"),
    cardLabel: document.getElementById("cardLabel"),
    vaultCard: document.getElementById("vaultCard"),
    btnBreak: document.getElementById("btnBreak"),
    btnCardStar: document.getElementById("btnCardStar"),
    shareDialog: document.getElementById("shareDialog"),
    shareTitle: document.getElementById("shareTitle"),
    shareLead: document.getElementById("shareLead"),
    shareUrlBox: document.getElementById("shareUrlBox"),
    toast: document.getElementById("toast"),
    toastText: document.getElementById("toastText"),
    toastUndo: document.getElementById("toastUndo"),
  };

  let storageOk = true;
  let state = SpoilerSeal.emptyState();
  let incoming = null;
  let view = "shelf";
  let formMode = "add";
  let editingId = "";
  let cardId = "";
  let undoBag = null;
  let toastTimer = 0;
  let tickTimer = 0;
  let crackId = "";
  let pendingFocus = "";
  let shareImporting = false;

  function reasonMessage(reason) {
    switch (reason) {
      case "title":
        return "Name the game, show, or episode.";
      case "unlock":
        return "Pick when this can open.";
      case "far":
        return "Unlock has to land within 400 days.";
      case "cap":
        return "This vault holds 24 seals. Remove one to seal another.";
      case "missing":
        return "That seal is not on this device.";
      case "exists":
        return "Already on this phone.";
      case "open":
        return "The clock already landed.";
      default: {
        const _never = reason;
        throw new Error("Unknown reason " + _never);
      }
    }
  }

  function announce(message) {
    const current = els.announce.textContent;
    els.announce.textContent = current === message ? message + "\u200b" : message;
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
      const probe = SpoilerSeal.STORAGE_KEY + "-probe";
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
      "Spoiler Seal cannot save on this device. Browser storage is blocked (private mode or a setting). Seals will not persist.";
  }

  function loadStored() {
    if (!probeStorage()) {
      failStorage();
      return null;
    }
    try {
      const raw = localStorage.getItem(SpoilerSeal.STORAGE_KEY);
      if (!raw) return null;
      return SpoilerSeal.normalizeState(JSON.parse(raw));
    } catch (_) {
      failStorage();
      return null;
    }
  }

  function save() {
    if (!storageOk) return false;
    try {
      localStorage.setItem(SpoilerSeal.STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (_) {
      failStorage();
      return false;
    }
  }

  function findSeal(id) {
    return state.seals.find((seal) => seal.id === id) || null;
  }

  function hasSample() {
    return state.seals.some((seal) => seal.id === SpoilerSeal.SAMPLE_ID);
  }

  function setView(next) {
    view = next;
    document.body.dataset.view = next;
    els.shelfView.hidden = next !== "shelf";
    els.formPanel.hidden = next !== "form";
    els.cardPanel.hidden = next !== "card";
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
    els.fieldUnlock.removeAttribute("aria-invalid");
  }

  function showFormError(reason) {
    switch (reason) {
      case "title":
        els.formError.hidden = false;
        els.formError.textContent = reasonMessage(reason);
        els.fieldTitle.setAttribute("aria-invalid", "true");
        els.fieldTitle.focus();
        break;
      case "unlock":
      case "far":
        els.formError.hidden = false;
        els.formError.textContent = reasonMessage(reason);
        els.fieldUnlock.setAttribute("aria-invalid", "true");
        els.fieldUnlock.focus();
        break;
      case "cap":
        els.formError.hidden = false;
        els.formError.textContent = reasonMessage(reason);
        break;
      case "missing":
      case "exists":
      case "open":
        toast(reasonMessage(reason));
        break;
      default: {
        const _never = reason;
        throw new Error("Unknown reason " + _never);
      }
    }
  }

  function paintResultCount() {
    els.resultCount.textContent = els.fieldResult.value.length + " / " + SpoilerSeal.RESULT_MAX;
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
    els.formHeading.textContent = "Seal a spoiler";
    els.btnSave.textContent = "Seal it";
    els.fieldTitle.value = "";
    els.fieldTag.value = "";
    els.fieldNote.value = "";
    els.fieldResult.value = "";
    hideFormError();
    paintResultCount();
    paintTagChips();
    applyUnlock(SpoilerSeal.presetUnlock("3h", Date.now()), "3h");
    setView("form");
    render();
    els.fieldTitle.focus();
  }

  function openEdit(id) {
    const seal = findSeal(id);
    if (!seal) {
      toast(reasonMessage("missing"));
      return;
    }
    formMode = "edit";
    editingId = id;
    els.formKicker.textContent = "Edit";
    els.formHeading.textContent = "Edit this seal";
    els.btnSave.textContent = "Save seal";
    els.fieldTitle.value = seal.title;
    els.fieldTag.value = seal.tag;
    els.fieldNote.value = seal.note;
    els.fieldResult.value = seal.result;
    hideFormError();
    paintResultCount();
    paintTagChips();
    applyUnlock(seal.unlockAt, "");
    setView("form");
    render();
    els.fieldTitle.focus();
  }

  function cancelForm() {
    const backTo = editingId && findSeal(editingId) ? "card" : "shelf";
    if (backTo === "card") cardId = editingId;
    setView(backTo);
    render();
  }

  function readDraft() {
    const raw = els.fieldUnlock.value;
    return {
      title: els.fieldTitle.value,
      tag: els.fieldTag.value,
      note: els.fieldNote.value,
      result: els.fieldResult.value,
      unlockAt: raw ? new Date(raw).getTime() : NaN,
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

  function whenLine(face) {
    const clock = SpoilerSeal.formatUnlock(face.unlockAt);
    switch (face.phase) {
      case "sealed":
        return "Unlocks " + clock;
      case "cracked":
        return "Opened " + clock;
      default: {
        const _never = face.phase;
        throw new Error("Unknown phase " + _never);
      }
    }
  }

  function crackSentence(seal) {
    const face = SpoilerSeal.publicFace(seal, Date.now());
    if (face.awaiting) return "Cracked. " + seal.title + " is ready for your notes.";
    if (face.result) return "Cracked. " + seal.title + ". " + face.result;
    return "Cracked. " + seal.title + " is open.";
  }

  function paintMeter(now) {
    if (!state.seals.length) {
      els.meter.hidden = true;
      return;
    }
    const next = SpoilerSeal.spotlight(state, now);
    const face = SpoilerSeal.publicFace(next, now);
    els.meter.hidden = false;
    els.meter.dataset.band = face.phase;
    els.meterClass.textContent = face.stamp;
    els.meterDigits.removeAttribute("data-countdown");
    switch (face.phase) {
      case "sealed":
        els.meterDigits.textContent = SpoilerSeal.formatCountdown(face.unlockAt - now);
        els.meterDigits.setAttribute("data-countdown", String(face.unlockAt));
        els.meterLabel.textContent = "Until the vault cracks";
        els.meterSub.textContent = face.title + " · " + SpoilerSeal.formatUnlock(face.unlockAt);
        break;
      case "cracked":
        els.meterDigits.textContent = "OPEN";
        els.meterLabel.textContent = SpoilerSeal.counts(state, now).sealed === 0 ? "The vault is open" : "A seal is open";
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
          body: "Cracked results are still on this device. Switch the filter, or seal another.",
        };
      case "cracked":
        return {
          kicker: "Still shut",
          title: "Nothing has cracked.",
          body: "Sealed games and episodes are still on this device. The clock has to land, or you break the seal.",
        };
      case "all":
        return {
          kicker: "The vault is dark",
          title: "Nothing in the vault yet.",
          body: "Seal a game or an episode and it will land here.",
        };
      default: {
        const _never = filter;
        throw new Error("Unknown filter " + _never);
      }
    }
  }

  function paintFilters(now) {
    const tally = SpoilerSeal.counts(state, now);
    els.filters.querySelectorAll("[data-filter]").forEach((btn) => {
      const filter = btn.dataset.filter;
      let label = "All";
      switch (filter) {
        case "all":
          label = "All " + tally.all;
          break;
        case "sealed":
          label = "Sealed " + tally.sealed;
          break;
        case "cracked":
          label = "Cracked " + tally.cracked;
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

  function paintStarButton(btn, seal) {
    const on = seal.starred === true;
    btn.textContent = on ? "Starred" : "Star";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", (on ? "Unstar " : "Star ") + seal.title);
  }

  function cardNode(seal, now) {
    const face = SpoilerSeal.publicFace(seal, now);
    const item = document.createElement("li");
    const card = el("article", "seal-card " + face.phase);
    card.dataset.id = seal.id;
    if (crackId === seal.id) card.classList.add("cracking");

    const top = el("div", "seal-top");
    top.append(el("span", "seal-stamp", face.stamp));
    if (face.tag) top.append(el("span", "tag", face.tag));
    if (face.starred) top.append(el("span", "star-mark", "★"));
    card.append(top);
    card.append(el("h3", "seal-title", face.title));

    switch (face.phase) {
      case "sealed": {
        const count = el("p", "row-clock", SpoilerSeal.formatCountdown(face.unlockAt - now));
        count.setAttribute("data-countdown", String(face.unlockAt));
        count.setAttribute("aria-hidden", "true");
        card.append(count);
        const bars = el("div", "mini-bars");
        bars.setAttribute("aria-hidden", "true");
        bars.append(el("span"), el("span"));
        card.append(bars);
        card.append(el("p", "seal-note", "Result redacted."));
        break;
      }
      case "cracked":
        if (face.awaiting) card.append(el("p", "seal-result", "Ready for your notes."));
        else card.append(el("p", "seal-result", face.result));
        break;
      default: {
        const _never = face.phase;
        throw new Error("Unknown phase " + _never);
      }
    }

    if (face.note) card.append(el("p", "seal-note", face.note));
    card.append(el("p", "seal-when", whenLine(face)));

    const actions = el("div", "seal-actions");
    actions.append(actionButton("open", "Open", "btn primary"));
    if (face.phase === "sealed") actions.append(actionButton("break", "Break the seal"));
    const star = actionButton("star", face.starred ? "Starred" : "Star");
    paintStarButton(star, seal);
    actions.append(star, actionButton("edit", "Edit"), actionButton("remove", "Remove", "btn ghost danger"));
    const removeBtn = actions.querySelector('[data-action="remove"]');
    if (removeBtn) removeBtn.setAttribute("aria-label", "Remove " + face.title);
    card.append(actions);
    item.append(card);
    return item;
  }

  function paintList(now) {
    const visible = SpoilerSeal.visibleSeals(state, now);
    const hasAny = state.seals.length > 0;
    els.toolbar.hidden = !hasAny;
    els.btnShareVault.disabled = !hasAny;
    els.filters.hidden = !hasAny;
    els.btnClear.hidden = !hasAny;
    els.btnSampleShelf.hidden = !hasAny || hasSample();
    els.emptyState.hidden = hasAny;
    els.list.hidden = !visible.length;
    els.list.replaceChildren();
    visible.forEach((seal) => els.list.append(cardNode(seal, now)));

    const tally = SpoilerSeal.counts(state, now);
    els.shelfSub.textContent = hasAny
      ? tally.sealed + " sealed · " + tally.cracked + " cracked"
      : "Nothing in the vault yet.";

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

  function paintCard(now) {
    const seal = findSeal(cardId);
    els.vaultCard.replaceChildren();
    if (!seal) {
      els.btnBreak.hidden = true;
      return;
    }
    const face = SpoilerSeal.publicFace(seal, now);
    els.cardLabel.textContent = face.phase === "sealed" ? "Sealed card" : "Cracked card";
    els.vaultCard.className = "vault-card " + face.phase + (crackId === seal.id ? " cracking" : "");
    els.vaultCard.append(el("p", "card-brand", "SPOILER SEAL"));

    const top = el("div", "card-chrome");
    top.append(el("span", "seal-stamp", face.stamp));
    if (face.starred) top.append(el("span", "star-mark", "★"));
    els.vaultCard.append(top);
    els.vaultCard.append(el("h3", "card-title", face.title));
    if (face.tag) els.vaultCard.append(el("p", "card-tag", face.tag));
    if (face.note) els.vaultCard.append(el("p", "card-note", face.note));

    const well = el("div", "result-well");
    well.append(el("p", "result-kicker", "Result"));
    switch (face.phase) {
      case "sealed": {
        const bars = el("div", "bars");
        bars.setAttribute("aria-hidden", "true");
        bars.append(el("span"), el("span"), el("span"));
        well.append(bars);
        well.append(el("span", "wax", "SEALED"));
        well.setAttribute("aria-label", "Result redacted until unlock");
        break;
      }
      case "cracked":
        if (face.awaiting) {
          well.append(el("p", "ready-copy", "Ready for your notes."));
          well.append(el("p", "ready-hint", "The result line was left blank. Edit to write what you saw."));
        } else {
          well.append(el("p", "result-copy", face.result));
        }
        break;
      default: {
        const _never = face.phase;
        throw new Error("Unknown phase " + _never);
      }
    }
    els.vaultCard.append(well);

    if (face.phase === "sealed") {
      const count = el("p", "clock", SpoilerSeal.formatCountdown(face.unlockAt - now));
      count.setAttribute("data-countdown", String(face.unlockAt));
      count.setAttribute("aria-hidden", "true");
      els.vaultCard.append(count);
    }
    els.vaultCard.append(el("p", "card-when", whenLine(face)));
    els.btnBreak.hidden = face.phase !== "sealed";
    paintStarButton(els.btnCardStar, seal);
  }

  function offerLines(share, now) {
    return share.seals.map((seal) => {
      const face = SpoilerSeal.publicFace(seal, now);
      const tag = face.tag ? " · " + face.tag : "";
      return face.title + tag + " · " + face.stamp;
    }).join("\n");
  }

  function paintOffer(now) {
    const show = Boolean(incoming) && view === "shelf";
    els.shareOffer.hidden = !show;
    if (!incoming) return;
    els.offerFace.textContent = offerLines(incoming, now);
    switch (incoming.k) {
      case "card":
        els.offerLead.textContent = "Someone sent one seal. It is a copy, not live sync. A sealed result stays blacked out until it cracks.";
        break;
      case "vault":
        els.offerLead.textContent = "Someone sent a vault of seals. It is a copy, not live sync. Later edits on their phone do not move this one.";
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
    if (view === "shelf") {
      paintMeter(now);
      paintList(now);
    }
    if (view === "card") paintCard(now);
    if (pendingFocus === "card") {
      pendingFocus = "";
      const target = els.btnBreak.hidden ? document.getElementById("btnCardBack") : els.btnBreak;
      if (target) target.focus();
    }
  }

  function applyCrack(id, message) {
    crackId = id;
    save();
    announce(message);
    const breakWasFocused = document.activeElement === els.btnBreak;
    render();
    if (breakWasFocused && els.btnBreak.hidden) {
      const back = document.getElementById("btnCardBack");
      if (back) back.focus();
    }
    window.setTimeout(() => {
      if (crackId !== id) return;
      crackId = "";
      if (view !== "form") render();
    }, 700);
  }

  function onBreak(id) {
    const before = findSeal(id);
    if (!before) {
      toast(reasonMessage("missing"));
      return;
    }
    const result = SpoilerSeal.breakSeal(state, id, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    if (result.already) {
      cardId = id;
      pendingFocus = "card";
      setView("card");
      render();
      return;
    }
    const early = Date.now() < before.unlockAt;
    state = result.state;
    cardId = id;
    pendingFocus = "card";
    if (view !== "card") setView("card");
    const sentence = crackSentence(result.seal);
    applyCrack(id, sentence);
    toast(early ? "Seal broken." : "The seal cracked.", {
      undo() {
        if (Date.now() >= before.unlockAt) {
          toast(reasonMessage("open"));
          return;
        }
        const restored = SpoilerSeal.replaceSeal(state, before);
        if (!restored.ok) {
          toast(reasonMessage(restored.reason));
          return;
        }
        state = restored.state;
        save();
        render();
        announce("Resealed. " + before.title + " is blacked out again.");
        toast("Resealed.");
      },
    });
  }

  function onStar(id) {
    const before = findSeal(id);
    if (!before) {
      toast(reasonMessage("missing"));
      return;
    }
    const result = SpoilerSeal.setStar(state, id, !before.starred, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    if (result.already) return;
    state = result.state;
    save();
    render();
    const line = result.seal.starred ? "Starred " + result.seal.title + "." : "Star removed.";
    announce(line);
    toast(line, {
      undo() {
        const restored = SpoilerSeal.replaceSeal(state, before);
        if (!restored.ok) {
          toast(reasonMessage(restored.reason));
          return;
        }
        state = restored.state;
        save();
        render();
        toast(before.starred ? "Star put back." : "Star removed.");
      },
    });
  }

  function onRemove(id) {
    const result = SpoilerSeal.removeSeal(state, id);
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    state = result.state;
    save();
    if (cardId === id) {
      cardId = "";
      setView("shelf");
    }
    render();
    announce("Removed " + result.seal.title + ".");
    toast("Removed " + result.seal.title + ".", {
      undo() {
        const restored = SpoilerSeal.restoreSeal(state, result.seal, result.index);
        if (!restored.ok) {
          toast(reasonMessage(restored.reason));
          return;
        }
        state = restored.state;
        save();
        render();
        announce("Restored " + result.seal.title + ".");
        toast("Restored.");
      },
    });
  }

  function clearVault() {
    if (!state.seals.length) return;
    const previous = state;
    state = SpoilerSeal.clearSeals(state);
    save();
    cardId = "";
    setView("shelf");
    render();
    announce("Vault cleared.");
    toast("Vault cleared.", {
      undo() {
        state = previous;
        save();
        render();
        announce("Vault restored.");
        toast("Vault restored.");
      },
    });
  }

  function keepShare() {
    if (!incoming) return;
    const share = incoming;
    const result = SpoilerSeal.keepShare(state, share);
    incoming = null;
    if (!result.ok) {
      if (result.reason === "exists") {
        if (share.k === "card" && share.seals[0] && findSeal(share.seals[0].id)) {
          cardId = share.seals[0].id;
          pendingFocus = "card";
          setView("card");
        }
        render();
        announce("Already on this phone.");
        toast("Already on this phone.");
        return;
      }
      render();
      toast(reasonMessage(result.reason));
      return;
    }
    state = result.state;
    save();
    if (share.k === "card" && result.addedIds.length) {
      cardId = result.addedIds[0];
      pendingFocus = "card";
      setView("card");
    } else {
      setView("shelf");
    }
    render();
    const note = result.dropped
      ? "Kept on this phone. The vault holds 24, so " + result.dropped + " did not fit."
      : "Kept on this phone.";
    announce(note);
    toast(note);
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
      const packed = await SpoilerSeal.compressPayload(JSON.stringify(payload));
      const url = location.origin + location.pathname + HASH_PREFIX + packed;
      els.shareUrlBox.value = url;
      switch (kind) {
        case "card":
          els.shareTitle.textContent = "A copy of this seal.";
          els.shareLead.textContent = "Send this URL. They open this seal. The result stays blacked out until it cracks. Later edits here do not update their copy.";
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
      else toast("That snapshot could not be packed.");
    } catch (_) {
      toast("That snapshot could not be packed.");
    }
  }

  async function shareVault() {
    if (!state.seals.length) {
      toast("Seal something before you copy the vault.");
      return;
    }
    await presentShare(SpoilerSeal.shareVault(state), "vault");
  }

  async function shareCard() {
    const seal = findSeal(cardId);
    if (!seal) {
      toast(reasonMessage("missing"));
      return;
    }
    const payload = SpoilerSeal.shareCard(seal);
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
    try {
      if (hash.startsWith(HASH_PREFIX)) token = decodeURIComponent(hash.slice(HASH_PREFIX.length));
      else token = new URLSearchParams(location.search).get(QUERY_KEY) || "";
    } catch (_) {
      cleanShareUrl();
      toast("That snapshot could not be read.");
      return null;
    }
    if (!token) return null;
    try {
      const json = await SpoilerSeal.decompressPayload(token);
      const parsed = SpoilerSeal.parseShare(JSON.parse(json));
      cleanShareUrl();
      if (!parsed) throw new Error("empty");
      return parsed;
    } catch (_) {
      cleanShareUrl();
      toast("That snapshot could not be read.");
      return null;
    }
  }

  async function pullShare() {
    if (shareImporting) return false;
    shareImporting = true;
    try {
      const parsed = await tryImportShare();
      if (!parsed) return false;
      incoming = parsed;
      if (view !== "shelf") setView("shelf");
      return true;
    } finally {
      shareImporting = false;
    }
  }

  function onShareNav() {
    pullShare().then((applied) => {
      if (applied) render();
    });
  }

  function onListClick(event) {
    const btn = event.target.closest("button");
    if (!btn || !els.list.contains(btn)) return;
    const card = btn.closest("[data-id]");
    if (!card) return;
    const id = card.dataset.id;
    const action = btn.dataset.action;
    switch (action) {
      case "open":
        cardId = id;
        pendingFocus = "card";
        setView("card");
        render();
        break;
      case "break":
        onBreak(id);
        break;
      case "star":
        onStar(id);
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
    const added = SpoilerSeal.loadSample(state, Date.now());
    if (!added.ok) {
      if (added.reason === "exists") {
        cardId = SpoilerSeal.SAMPLE_ID;
        pendingFocus = "card";
        setView("card");
        render();
        announce("Already on this phone.");
        toast("Already on this phone.");
        return;
      }
      toast(reasonMessage(added.reason));
      return;
    }
    state = added.state;
    save();
    cardId = added.seal.id;
    pendingFocus = "card";
    setView("card");
    render();
    announce("Sealed " + added.seal.title + " until " + SpoilerSeal.formatUnlock(added.seal.unlockAt) + ".");
    toast("Sample sealed on this phone.", {
      undo() {
        const removed = SpoilerSeal.removeSeal(state, added.seal.id);
        if (!removed.ok) {
          toast(reasonMessage(removed.reason));
          return;
        }
        state = removed.state;
        save();
        cardId = "";
        setView("shelf");
        render();
        toast("Sample removed.");
      },
    });
  }

  function tick() {
    const now = Date.now();
    const result = SpoilerSeal.crackDue(state, now);
    if (result.opened.length) {
      state = result.state;
      const last = result.opened[result.opened.length - 1];
      const seal = findSeal(last);
      const sentence = result.opened.length === 1 && seal
        ? crackSentence(seal)
        : result.opened.length + " seals cracked.";
      applyCrack(last, sentence);
      toast(result.opened.length === 1 ? "The seal cracked." : result.opened.length + " seals cracked.");
      return;
    }
    document.querySelectorAll("[data-countdown]").forEach((node) => {
      const unlock = Number(node.getAttribute("data-countdown"));
      node.textContent = SpoilerSeal.formatCountdown(unlock - now);
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
    els.fieldTitle.maxLength = SpoilerSeal.TITLE_MAX;
    els.fieldTag.maxLength = SpoilerSeal.TAG_MAX;
    els.fieldNote.maxLength = SpoilerSeal.NOTE_MAX;
    els.fieldResult.maxLength = SpoilerSeal.RESULT_MAX;
    document.getElementById("btnAdd").addEventListener("click", openAdd);
    document.getElementById("btnEmptyAdd").addEventListener("click", openAdd);
    document.getElementById("btnSample").addEventListener("click", loadSample);
    els.btnSampleShelf.addEventListener("click", loadSample);
    document.getElementById("btnCancelForm").addEventListener("click", cancelForm);
    els.btnShareVault.addEventListener("click", () => { shareVault(); });
    els.btnClear.addEventListener("click", clearVault);
    els.btnKeepShare.addEventListener("click", keepShare);
    document.getElementById("btnDismissShare").addEventListener("click", dismissShare);
    document.getElementById("btnCardBack").addEventListener("click", () => {
      setView("shelf");
      render();
    });
    els.btnBreak.addEventListener("click", () => onBreak(cardId));
    document.getElementById("btnCardShare").addEventListener("click", () => { shareCard(); });
    document.getElementById("btnCardEdit").addEventListener("click", () => openEdit(cardId));
    els.btnCardStar.addEventListener("click", () => onStar(cardId));
    document.getElementById("btnCardRemove").addEventListener("click", () => onRemove(cardId));
    document.getElementById("btnCopyShare").addEventListener("click", async () => {
      const url = els.shareUrlBox.value;
      const copied = await copyText(url);
      toast(copied ? "Link copied. A snapshot, not live sync." : "Select the link and copy it.");
    });
    document.getElementById("btnCloseShare").addEventListener("click", () => {
      if (typeof els.shareDialog.close === "function") els.shareDialog.close();
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
      state = SpoilerSeal.setFilter(state, btn.dataset.filter);
      save();
      render();
    });
    els.presetChips.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-preset]");
      if (!btn) return;
      applyUnlock(SpoilerSeal.presetUnlock(btn.dataset.preset, Date.now()), btn.dataset.preset);
    });
    els.tagChips.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-tag]");
      if (!btn) return;
      els.fieldTag.value = els.fieldTag.value.trim() === btn.dataset.tag ? "" : btn.dataset.tag;
      paintTagChips();
    });
    els.fieldTag.addEventListener("input", paintTagChips);
    els.fieldResult.addEventListener("input", paintResultCount);
    els.fieldUnlock.addEventListener("input", () => pressPreset(""));
    els.sealForm.addEventListener("submit", (event) => {
      event.preventDefault();
      hideFormError();
      const draft = readDraft();
      const now = Date.now();
      const before = formMode === "edit" ? findSeal(editingId) : null;
      const result = formMode === "edit"
        ? SpoilerSeal.updateSeal(state, editingId, draft, now)
        : SpoilerSeal.addSeal(state, draft, now);
      if (!result.ok) {
        showFormError(result.reason);
        return;
      }
      const wasEdit = formMode === "edit";
      state = result.state;
      save();
      cardId = result.seal.id;
      pendingFocus = "card";
      setView("card");
      const face = SpoilerSeal.publicFace(result.seal, now);
      if (face.phase === "cracked") announce(crackSentence(result.seal));
      else announce("Sealed " + result.seal.title + " until " + SpoilerSeal.formatUnlock(result.seal.unlockAt) + ".");
      render();
      toast(wasEdit ? "Updated on this phone." : "Sealed on this phone.", {
        undo() {
          if (wasEdit) {
            if (!before) return;
            const restored = SpoilerSeal.replaceSeal(state, before);
            if (!restored.ok) {
              toast(reasonMessage(restored.reason));
              return;
            }
            state = restored.state;
            save();
            render();
            toast("Edit undone.");
            return;
          }
          const removed = SpoilerSeal.removeSeal(state, result.seal.id);
          if (!removed.ok) {
            toast(reasonMessage(removed.reason));
            return;
          }
          state = removed.state;
          save();
          cardId = "";
          setView("shelf");
          render();
          toast("Seal undone.");
        },
      });
    });
  }

  async function boot() {
    const stored = loadStored();
    if (stored) state = stored;
    const due = SpoilerSeal.crackDue(state, Date.now());
    if (due.opened.length) {
      state = due.state;
      save();
      const seal = findSeal(due.opened[due.opened.length - 1]);
      if (seal && due.opened.length === 1) announce(crackSentence(seal));
      else announce(due.opened.length + " seals cracked.");
    }
    wire();
    await pullShare();
    render();
    scheduleTick();
    window.addEventListener("hashchange", onShareNav);
    window.addEventListener("popstate", onShareNav);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") tick();
    });
  }

  boot();
})();
