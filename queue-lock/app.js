(() => {
  "use strict";

  const HASH_PREFIX = "#q=";
  const QUERY_KEY = "q";

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
    lockForm: document.getElementById("lockForm"),
    fieldGame: document.getElementById("fieldGame"),
    fieldNote: document.getElementById("fieldNote"),
    reasonChips: document.getElementById("reasonChips"),
    presetChips: document.getElementById("presetChips"),
    fieldUnlock: document.getElementById("fieldUnlock"),
    formError: document.getElementById("formError"),
    cardPanel: document.getElementById("cardPanel"),
    cardLabel: document.getElementById("cardLabel"),
    lockCard: document.getElementById("lockCard"),
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
  let state = QueueLock.emptyState();
  let incoming = null;
  let view = "shelf";
  let cardId = "";
  let undoBag = null;
  let toastTimer = 0;
  let tickTimer = 0;
  let tripId = "";
  let pendingFocus = "";
  let shareImporting = false;

  function reasonMessage(reason) {
    switch (reason) {
      case "game":
        return "Name the game or mode.";
      case "unlock":
        return "Pick when the cool-down ends.";
      case "far":
        return "Cool-down has to land within 400 days.";
      case "cap":
        return "This phone holds 24 locks. Remove one to lock another.";
      case "missing":
        return "That lock is not on this phone.";
      case "exists":
        return "Already on this phone.";
      case "open":
        return "The cool-down already ended.";
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
      const probe = QueueLock.STORAGE_KEY + "-probe";
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
      "Queue Lock cannot save on this device. Browser storage is blocked (private mode or a setting). Locks will not persist.";
  }

  function loadStored() {
    if (!probeStorage()) {
      failStorage();
      return null;
    }
    try {
      const raw = localStorage.getItem(QueueLock.STORAGE_KEY);
      if (!raw) return null;
      return QueueLock.normalizeState(JSON.parse(raw));
    } catch (_) {
      failStorage();
      return null;
    }
  }

  function save() {
    if (!storageOk) return false;
    try {
      localStorage.setItem(QueueLock.STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (_) {
      failStorage();
      return false;
    }
  }

  function findLock(id) {
    return state.locks.find((lock) => lock.id === id) || null;
  }

  function hasSample() {
    return state.locks.some((lock) => lock.id === QueueLock.SAMPLE_ID);
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
    els.fieldGame.removeAttribute("aria-invalid");
    els.fieldUnlock.removeAttribute("aria-invalid");
  }

  function showFormError(reason) {
    els.formError.hidden = false;
    els.formError.textContent = reasonMessage(reason);
    switch (reason) {
      case "game":
        els.fieldGame.setAttribute("aria-invalid", "true");
        els.fieldGame.focus();
        break;
      case "unlock":
      case "far":
        els.fieldUnlock.setAttribute("aria-invalid", "true");
        els.fieldUnlock.focus();
        break;
      case "cap":
      case "missing":
      case "exists":
      case "open":
        break;
      default: {
        const _never = reason;
        throw new Error("Unknown reason " + _never);
      }
    }
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

  function clearReasons() {
    els.reasonChips.querySelectorAll("[data-reason]").forEach((btn) => {
      btn.setAttribute("aria-pressed", "false");
    });
  }

  function openAdd() {
    if (state.locks.length >= QueueLock.LOCK_CAP) {
      toast(reasonMessage("cap"));
      return;
    }
    els.fieldGame.value = "";
    els.fieldNote.value = "";
    clearReasons();
    hideFormError();
    applyUnlock(QueueLock.presetUnlock("15", Date.now()), "15");
    setView("form");
    render();
    els.fieldGame.focus();
  }

  function readDraft() {
    const raw = els.fieldUnlock.value;
    const reasons = [];
    els.reasonChips.querySelectorAll("[data-reason]").forEach((btn) => {
      if (btn.getAttribute("aria-pressed") === "true") reasons.push(btn.dataset.reason);
    });
    return {
      game: els.fieldGame.value,
      reasons: reasons,
      note: els.fieldNote.value,
      unlockAt: raw ? new Date(raw).getTime() : NaN,
    };
  }

  function cancelForm() {
    setView(cardId && findLock(cardId) ? "card" : "shelf");
    render();
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

  function lockGlyph() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 64 64");
    svg.setAttribute("class", "glyph");
    svg.setAttribute("aria-hidden", "true");
    const shackle = document.createElementNS(svg.namespaceURI, "path");
    shackle.setAttribute("d", "M22 30V23.5a10 10 0 0 1 20 0V30");
    shackle.setAttribute("fill", "none");
    shackle.setAttribute("stroke", "currentColor");
    shackle.setAttribute("stroke-width", "3.2");
    shackle.setAttribute("stroke-linecap", "round");
    const body = document.createElementNS(svg.namespaceURI, "rect");
    body.setAttribute("x", "16");
    body.setAttribute("y", "28");
    body.setAttribute("width", "32");
    body.setAttribute("height", "22");
    body.setAttribute("rx", "4");
    body.setAttribute("fill", "currentColor");
    body.setAttribute("opacity", "0.18");
    body.setAttribute("stroke", "currentColor");
    body.setAttribute("stroke-width", "2");
    const dot = document.createElementNS(svg.namespaceURI, "circle");
    dot.setAttribute("cx", "32");
    dot.setAttribute("cy", "37");
    dot.setAttribute("r", "3");
    dot.setAttribute("fill", "currentColor");
    svg.append(shackle, body, dot);
    return svg;
  }

  function whenLine(face) {
    switch (face.phase) {
      case "locked":
        return "Unlocks " + QueueLock.formatUnlock(face.unlockAt);
      case "waited":
        return "Waited until " + QueueLock.formatUnlock(face.waitedAt || face.unlockAt);
      case "broke":
        return "Broke at " + QueueLock.formatUnlock(face.brokeAt);
      default: {
        const _never = face.phase;
        throw new Error("Unknown phase " + _never);
      }
    }
  }

  function offerLine(lock, now) {
    const face = QueueLock.publicFace(lock, now);
    switch (face.phase) {
      case "locked":
        return face.game + " · locked until " + QueueLock.formatUnlock(face.unlockAt);
      case "waited":
        return face.game + " · cool-down already over";
      case "broke":
        return face.game + " · broke the lock";
      default: {
        const _never = face.phase;
        throw new Error("Unknown phase " + _never);
      }
    }
  }

  function cardAria(face, now) {
    switch (face.phase) {
      case "locked":
        return "Locked from queue. " + face.game + ". " + QueueLock.formatCountdown(face.unlockAt - now) + " left.";
      case "waited":
        return "Queue open. " + face.game + ". Waited.";
      case "broke":
        return "Lock broken. " + face.game + ". Broke.";
      default: {
        const _never = face.phase;
        throw new Error("Unknown phase " + _never);
      }
    }
  }

  function dueSentence(result) {
    if (result.opened.length === 1) {
      const lock = findLock(result.opened[0]);
      return lock ? "Queue is open. " + lock.game + "." : "Queue is open.";
    }
    return result.opened.length + " cool-downs ended.";
  }

  function reasonRow(reasons) {
    if (!reasons.length) return null;
    const row = el("ul", "reason-pills");
    reasons.forEach((id) => {
      row.append(el("li", "", QueueLock.reasonLabel(id)));
    });
    return row;
  }

  function stampPlate(face) {
    const plate = el("div", "stamp-plate");
    const lines = QueueLock.stampLines(face.phase);
    lines.forEach((line, index) => {
      plate.append(el("span", index === 0 ? "stamp-word" : "stamp-sub", line));
    });
    return plate;
  }

  function paintMeter(now) {
    const next = QueueLock.spotlight(state, now);
    els.meterDigits.removeAttribute("data-countdown");
    if (!next) {
      els.meter.hidden = true;
      return;
    }
    const face = QueueLock.publicFace(next, now);
    els.meter.hidden = false;
    els.meter.dataset.band = face.phase;
    els.meterClass.textContent = face.stamp;
    els.meterDigits.textContent = QueueLock.formatCountdown(face.unlockAt - now);
    els.meterDigits.setAttribute("data-countdown", String(face.unlockAt));
    els.meterLabel.textContent = face.game;
    els.meterSub.textContent = whenLine(face);
  }

  function filterEmptyCopy(filter) {
    switch (filter) {
      case "active":
        return {
          kicker: "Queue is quiet",
          title: "Nothing is locked.",
          body: "Done locks are still on this phone. Switch the filter, or lock another.",
        };
      case "done":
        return {
          kicker: "Still locked",
          title: "No finished locks.",
          body: "Active cool-downs are still on this phone. The clock has to land, or you break the lock.",
        };
      case "all":
        return {
          kicker: "Queue is open",
          title: "Nothing locked yet.",
          body: "Lock a game or mode and it will land here.",
        };
      default: {
        const _never = filter;
        throw new Error("Unknown filter " + _never);
      }
    }
  }

  function paintFilters(now) {
    const tally = QueueLock.counts(state, now);
    els.filters.querySelectorAll("[data-filter]").forEach((btn) => {
      const filter = btn.dataset.filter;
      let label = "All";
      switch (filter) {
        case "all":
          label = "All " + tally.all;
          break;
        case "active":
          label = "Active " + tally.active;
          break;
        case "done":
          label = "Done " + tally.done;
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

  function paintStarButton(btn, lock) {
    const on = lock.starred === true;
    btn.textContent = on ? "Starred" : "Star";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", (on ? "Unstar " : "Star ") + lock.game);
  }

  function rowNode(lock, now) {
    const face = QueueLock.publicFace(lock, now);
    const item = document.createElement("li");
    const card = el("article", "lock-row " + face.phase);
    card.dataset.id = lock.id;
    if (tripId === lock.id) card.classList.add("tripping");

    const top = el("div", "row-top");
    top.append(el("span", "row-stamp", face.stamp));
    if (face.badge) top.append(el("span", "badge " + face.phase, face.badge));
    if (face.starred) top.append(el("span", "star-mark", "★"));
    card.append(top);
    card.append(el("h3", "row-title", face.game));

    switch (face.phase) {
      case "locked": {
        const count = el("p", "row-clock", QueueLock.formatCountdown(face.unlockAt - now));
        count.setAttribute("data-countdown", String(face.unlockAt));
        count.setAttribute("aria-hidden", "true");
        card.append(count);
        break;
      }
      case "waited":
      case "broke":
        break;
      default: {
        const _never = face.phase;
        throw new Error("Unknown phase " + _never);
      }
    }

    const reasons = reasonRow(face.reasons);
    if (reasons) card.append(reasons);
    if (face.note) card.append(el("p", "row-note", face.note));
    card.append(el("p", "row-when", whenLine(face)));

    const actions = el("div", "row-actions");
    actions.append(actionButton("open", "Open", "btn primary"));
    if (face.phase === "locked") actions.append(actionButton("break", "Break the lock"));
    const star = actionButton("star", face.starred ? "Starred" : "Star");
    paintStarButton(star, lock);
    actions.append(star, actionButton("remove", "Remove", "btn ghost danger"));
    const removeBtn = actions.querySelector('[data-action="remove"]');
    if (removeBtn) removeBtn.setAttribute("aria-label", "Remove " + face.game);
    card.append(actions);
    item.append(card);
    return item;
  }

  function paintList(now) {
    const visible = QueueLock.visibleLocks(state, now);
    const hasAny = state.locks.length > 0;
    els.toolbar.hidden = !hasAny;
    els.btnShareVault.disabled = !hasAny;
    els.filters.hidden = !hasAny;
    els.btnClear.hidden = !hasAny;
    els.btnSampleShelf.hidden = !hasAny || hasSample();
    els.emptyState.hidden = hasAny;
    els.list.hidden = !visible.length;
    els.list.replaceChildren();
    visible.forEach((lock) => els.list.append(rowNode(lock, now)));

    const tally = QueueLock.counts(state, now);
    let sub = hasAny
      ? tally.active + " active · " + tally.done + " done"
      : "Nothing locked yet.";
    if (state.locks.length >= QueueLock.LOCK_CAP) {
      sub += " This phone holds 24. Remove one to lock another.";
    }
    els.shelfSub.textContent = sub;

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

  function readout(face, now) {
    const node = el("p", "clock");
    node.setAttribute("aria-hidden", "true");
    switch (face.phase) {
      case "locked":
        node.textContent = QueueLock.formatCountdown(face.unlockAt - now);
        node.setAttribute("data-countdown", String(face.unlockAt));
        break;
      case "waited":
        node.textContent = "OPEN";
        break;
      case "broke":
        node.textContent = "BROKE";
        break;
      default: {
        const _never = face.phase;
        throw new Error("Unknown phase " + _never);
      }
    }
    return node;
  }

  function paintCard(now) {
    const lock = findLock(cardId);
    els.lockCard.replaceChildren();
    if (!lock) {
      els.btnBreak.hidden = true;
      return;
    }
    const face = QueueLock.publicFace(lock, now);
    switch (face.phase) {
      case "locked":
        els.cardLabel.textContent = "Locked card";
        break;
      case "waited":
        els.cardLabel.textContent = "Queue open";
        break;
      case "broke":
        els.cardLabel.textContent = "Lock broken";
        break;
      default: {
        const _never = face.phase;
        throw new Error("Unknown phase " + _never);
      }
    }
    els.lockCard.className = "lock-card " + face.phase + (tripId === lock.id ? " tripping" : "");
    els.lockCard.setAttribute("aria-label", cardAria(face, now));
    const brand = el("p", "card-brand", "QUEUE LOCK");
    brand.prepend(lockGlyph());
    els.lockCard.append(brand);
    const chrome = el("div", "card-chrome");
    if (face.badge) chrome.append(el("span", "badge " + face.phase, face.badge));
    if (face.starred) chrome.append(el("span", "star-mark", "★"));
    if (chrome.childNodes.length) els.lockCard.append(chrome);
    els.lockCard.append(stampPlate(face));
    els.lockCard.append(readout(face, now));
    els.lockCard.append(el("h3", "card-title", face.game));
    const reasons = reasonRow(face.reasons);
    if (reasons) els.lockCard.append(reasons);
    if (face.note) els.lockCard.append(el("p", "card-note", face.note));
    els.lockCard.append(el("p", "card-when", whenLine(face)));
    els.btnBreak.hidden = face.phase !== "locked";
    paintStarButton(els.btnCardStar, lock);
  }

  function paintOffer(now) {
    if (!incoming) {
      els.shareOffer.hidden = true;
      els.offerFace.replaceChildren();
      return;
    }
    els.shareOffer.hidden = false;
    switch (incoming.k) {
      case "card":
        els.offerLead.textContent = "Someone sent a cool-down. It is a copy, not live sync. Their break does not travel. This phone follows the unlock time.";
        break;
      case "vault":
        els.offerLead.textContent = "Someone sent a shelf of locks. It is a copy, not live sync. Their breaks do not travel. This phone follows each unlock time.";
        break;
      default: {
        const _never = incoming.k;
        throw new Error("Unknown share " + _never);
      }
    }
    els.offerFace.replaceChildren();
    incoming.locks.slice(0, 3).forEach((lock) => {
      els.offerFace.append(el("p", "", offerLine(lock, now)));
    });
    if (incoming.locks.length > 3) {
      els.offerFace.append(el("p", "", "and " + (incoming.locks.length - 3) + " more"));
    }
  }

  function render() {
    const now = Date.now();
    paintOffer(now);
    paintMeter(now);
    paintList(now);
    if (view === "card") paintCard(now);
    else els.lockCard.replaceChildren();
    if (pendingFocus === "card") {
      pendingFocus = "";
      const target = els.btnBreak.hidden ? document.getElementById("btnCardBack") : els.btnBreak;
      if (target) target.focus();
    }
  }

  function flash(id) {
    tripId = id;
    render();
    window.setTimeout(() => {
      if (tripId !== id) return;
      tripId = "";
      if (view !== "form") render();
    }, 700);
  }

  function onBreak(id) {
    const before = findLock(id);
    if (!before) {
      toast(reasonMessage("missing"));
      return;
    }
    const result = QueueLock.breakLock(state, id, Date.now());
    if (!result.ok) {
      if (result.state && result.state !== state) {
        state = result.state;
        save();
      }
      cardId = id;
      setView("card");
      render();
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
    state = result.state;
    save();
    cardId = id;
    pendingFocus = "card";
    setView("card");
    announce("Broke the lock on " + result.lock.game + ".");
    flash(id);
    toast("Broke the lock.", {
      undo() {
        const back = QueueLock.undoBreak(state, id, Date.now());
        if (!back.ok) {
          toast(reasonMessage(back.reason));
          return;
        }
        if (back.already) return;
        state = back.state;
        save();
        cardId = id;
        setView("card");
        render();
        toast("Lock restored.");
      },
    });
  }

  function onStar(id) {
    const before = findLock(id);
    if (!before) {
      toast(reasonMessage("missing"));
      return;
    }
    const result = QueueLock.setStar(state, id, !before.starred, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    if (result.already) return;
    state = result.state;
    save();
    render();
    const line = result.lock.starred ? "Starred " + result.lock.game + "." : "Star removed.";
    announce(line);
    toast(line, {
      undo() {
        const restored = QueueLock.replaceLock(state, before);
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
    const result = QueueLock.removeLock(state, id);
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
    announce("Removed " + result.lock.game + ".");
    toast("Removed " + result.lock.game + ".", {
      undo() {
        const restored = QueueLock.restoreLock(state, result.lock, result.index);
        if (!restored.ok) {
          toast(reasonMessage(restored.reason));
          return;
        }
        state = restored.state;
        save();
        render();
        announce("Restored " + result.lock.game + ".");
        toast("Restored.");
      },
    });
  }

  function clearAll() {
    if (!state.locks.length) return;
    const previous = state.locks.slice();
    state = QueueLock.clearLocks(state);
    save();
    cardId = "";
    setView("shelf");
    render();
    announce("Locks cleared.");
    toast("Cleared every lock.", {
      ms: 8000,
      undo() {
        if (state.locks.length) {
          toast("A new lock is already on this phone.");
          return;
        }
        const restored = QueueLock.restoreAll(state, previous);
        if (!restored.ok) {
          toast(reasonMessage(restored.reason));
          return;
        }
        state = restored.state;
        save();
        render();
        toast("Locks restored.");
      },
    });
  }

  function keepIncoming() {
    if (!incoming) return;
    const share = incoming;
    const result = QueueLock.keepShare(state, share, cardId);
    incoming = null;
    if (!result.ok) {
      if (result.reason === "exists") {
        const existing = share.locks[0];
        if (share.k === "card" && existing && findLock(existing.id)) {
          cardId = existing.id;
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
    const addedIds = result.addedIds.slice();
    const dropped = result.dropped.slice();
    state = result.state;
    save();
    if (share.k === "card" && addedIds.length === 1) {
      cardId = addedIds[0];
      pendingFocus = "card";
      setView("card");
    } else if (view === "card" && cardId && !findLock(cardId)) {
      cardId = "";
      setView("shelf");
    }
    render();
    const note = dropped.length === 1
      ? "Kept. The oldest lock made room."
      : dropped.length > 1
        ? "Kept. The oldest locks made room."
        : "Kept on this phone.";
    announce(note);
    const undo = dropped.length ? function undoKeep() {
      let draft = state;
      for (let i = 0; i < addedIds.length; i += 1) {
        if (!draft.locks.some((lock) => lock.id === addedIds[i])) continue;
        const removed = QueueLock.removeLock(draft, addedIds[i]);
        if (!removed.ok) {
          toast(reasonMessage(removed.reason));
          return;
        }
        draft = removed.state;
      }
      const ordered = dropped.slice().sort((a, b) => a.index - b.index);
      for (let i = 0; i < ordered.length; i += 1) {
        const restored = QueueLock.restoreLock(draft, ordered[i].lock, ordered[i].index);
        if (!restored.ok) {
          toast(reasonMessage(restored.reason));
          return;
        }
        draft = restored.state;
      }
      state = draft;
      save();
      if (cardId && !findLock(cardId)) {
        cardId = "";
        setView("shelf");
      }
      render();
      toast("Snapshot put back.");
    } : null;
    toast(note, undo ? { ms: 8000, undo: undo } : { ms: 4200 });
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
      const packed = await QueueLock.compressPayload(JSON.stringify(payload));
      els.shareUrlBox.value = location.origin + location.pathname + HASH_PREFIX + packed;
      switch (kind) {
        case "card":
          els.shareTitle.textContent = "A copy of this lock.";
          els.shareLead.textContent = "Send this URL. They follow the unlock time. If you already broke the lock, their copy stays locked until the clock.";
          break;
        case "vault":
          els.shareTitle.textContent = "A copy of this shelf.";
          els.shareLead.textContent = "Send this URL. They open these locks. Each one follows its unlock time. A break does not travel. Not live sync.";
          break;
        default: {
          const _never = kind;
          throw new Error("Unknown share " + _never);
        }
      }
      if (typeof els.shareDialog.showModal === "function") {
        if (!els.shareDialog.open) els.shareDialog.showModal();
      } else {
        toast("That snapshot could not be packed.");
      }
    } catch (_) {
      toast("That snapshot could not be packed.");
    }
  }

  async function shareVault() {
    if (!state.locks.length) {
      toast("Lock something before you copy the shelf.");
      return;
    }
    await presentShare(QueueLock.shareVault(state), "vault");
  }

  async function shareCard() {
    const lock = findLock(cardId);
    if (!lock) {
      toast(reasonMessage("missing"));
      return;
    }
    const payload = QueueLock.shareCard(lock);
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
      const json = await QueueLock.decompressPayload(token);
      const parsed = QueueLock.parseShare(JSON.parse(json));
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
      announce("A shared cool-down is ready to keep on this phone.");
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
    const added = QueueLock.loadSample(state, Date.now());
    if (!added.ok) {
      if (added.reason === "exists") {
        cardId = QueueLock.SAMPLE_ID;
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
    cardId = added.lock.id;
    pendingFocus = "card";
    setView("card");
    announce("Locked " + added.lock.game + " until " + QueueLock.formatUnlock(added.lock.unlockAt) + ".");
    flash(added.lock.id);
    toast("Sample locked on this phone.", {
      undo() {
        const removed = QueueLock.removeLock(state, added.lock.id);
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
    const result = QueueLock.settleDue(state, now);
    if (result.opened.length) {
      state = result.state;
      save();
      const last = result.opened[result.opened.length - 1];
      const sentence = dueSentence(result);
      announce(sentence);
      tripId = last;
      render();
      toast(result.opened.length === 1 ? "Cool-down ended." : result.opened.length + " cool-downs ended.");
      window.setTimeout(() => {
        if (tripId !== last) return;
        tripId = "";
        if (view !== "form") render();
      }, 700);
      return;
    }
    document.querySelectorAll("[data-countdown]").forEach((node) => {
      const unlock = Number(node.getAttribute("data-countdown"));
      node.textContent = QueueLock.formatCountdown(unlock - now);
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
    els.fieldGame.maxLength = QueueLock.GAME_MAX;
    els.fieldNote.maxLength = QueueLock.NOTE_MAX;
    document.getElementById("btnAdd").addEventListener("click", openAdd);
    document.getElementById("btnEmptyAdd").addEventListener("click", openAdd);
    document.getElementById("btnSample").addEventListener("click", loadSample);
    els.btnSampleShelf.addEventListener("click", loadSample);
    document.getElementById("btnCancelForm").addEventListener("click", cancelForm);
    document.getElementById("btnOpenMeter").addEventListener("click", () => {
      const next = QueueLock.spotlight(state, Date.now());
      if (!next) return;
      cardId = next.id;
      pendingFocus = "card";
      setView("card");
      render();
    });
    els.btnShareVault.addEventListener("click", () => { shareVault(); });
    els.btnClear.addEventListener("click", clearAll);
    els.btnKeepShare.addEventListener("click", keepIncoming);
    document.getElementById("btnDismissShare").addEventListener("click", dismissShare);
    document.getElementById("btnCardBack").addEventListener("click", () => {
      setView("shelf");
      render();
    });
    els.btnBreak.addEventListener("click", () => onBreak(cardId));
    document.getElementById("btnCardShare").addEventListener("click", () => { shareCard(); });
    els.btnCardStar.addEventListener("click", () => onStar(cardId));
    document.getElementById("btnCardRemove").addEventListener("click", () => onRemove(cardId));
    document.getElementById("btnCopyShare").addEventListener("click", async () => {
      const copied = await copyText(els.shareUrlBox.value);
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
      state = QueueLock.setFilter(state, btn.dataset.filter);
      save();
      render();
    });
    els.presetChips.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-preset]");
      if (!btn) return;
      applyUnlock(QueueLock.presetUnlock(btn.dataset.preset, Date.now()), btn.dataset.preset);
    });
    els.reasonChips.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-reason]");
      if (!btn) return;
      const on = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", on ? "false" : "true");
    });
    els.fieldUnlock.addEventListener("input", () => pressPreset(""));
    els.lockForm.addEventListener("submit", (event) => {
      event.preventDefault();
      hideFormError();
      const draft = readDraft();
      const now = Date.now();
      const result = QueueLock.addLock(state, draft, now);
      if (!result.ok) {
        showFormError(result.reason);
        return;
      }
      state = result.state;
      save();
      cardId = result.lock.id;
      pendingFocus = "card";
      setView("card");
      const face = QueueLock.publicFace(result.lock, now);
      switch (face.phase) {
        case "locked":
          announce("Locked " + result.lock.game + " until " + QueueLock.formatUnlock(result.lock.unlockAt) + ".");
          break;
        case "waited":
          announce("Queue is open. " + result.lock.game + ".");
          break;
        case "broke":
          announce("Broke the lock on " + result.lock.game + ".");
          break;
        default: {
          const _never = face.phase;
          throw new Error("Unknown phase " + _never);
        }
      }
      flash(result.lock.id);
      toast(face.phase === "locked" ? "Locked on this phone." : "That time already passed. Queue is open.", {
        undo() {
          const removed = QueueLock.removeLock(state, result.lock.id);
          if (!removed.ok) {
            toast(reasonMessage(removed.reason));
            return;
          }
          state = removed.state;
          save();
          cardId = "";
          setView("shelf");
          render();
          toast("Lock undone.");
        },
      });
    });
  }

  async function boot() {
    const stored = loadStored();
    if (stored) state = stored;
    const due = QueueLock.settleDue(state, Date.now());
    if (due.opened.length) {
      state = due.state;
      save();
      announce(dueSentence(due));
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
