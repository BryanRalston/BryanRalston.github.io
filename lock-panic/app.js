(function () {
  "use strict";

  const HASH_PREFIX = "#k=";
  const QUERY_KEY = "k";

  const els = {};
  let storageOk = true;
  let state = LockPanic.emptyState();
  let incoming = null;
  let actionUndo = null;
  let toastBag = null;
  let toastUndoMeta = null;
  let spokenKey = "";
  let wired = false;
  let shareChain = Promise.resolve();

  function grab(id) {
    els[id] = document.getElementById(id);
  }

  function cacheEls() {
    [
      "storageFail", "storageCorrupt", "spoken", "shareOffer", "offerFace", "offerHint", "btnKeepShare", "btnDismissShare",
      "shelfBar", "btnLatest", "emptyHero", "panicCard", "stamp", "starPill",
      "panicHeading", "panicWord", "stampMark", "clockChip",
      "roastLine", "anxietyValue", "meter", "meterFill",
      "exchange", "starterName", "backupSide", "backupName", "leagueNote",
      "actionRow", "btnRepanic", "btnStar", "btnUndo", "btnShare", "btnRemove",
      "panicForm", "sitKicker", "sitHeading",
      "fieldStarter", "fieldBackup", "fieldMinutes", "fieldNote", "formError", "btnSample",
      "historySub", "filters", "historyEmpty", "filterEmpty", "historyList", "btnClear", "btnShareShelf",
      "toast", "toastText", "toastExtra", "toastUndo",
      "shareDialog", "shareTitle", "shareLead", "shareUrlBox", "btnCopyShare", "btnCloseShare",
    ].forEach(grab);
  }

  function hideToastExtra() {
    els.toastExtra.hidden = true;
    els.toastExtra.textContent = "";
  }

  function undoToastWorks() {
    if (!toastBag || !toastUndoMeta) return false;
    const kind = toastUndoMeta.kind;
    switch (kind) {
      case "clear":
        return state.cards.length === 0;
      case "remove":
        return state.cards.length < LockPanic.HISTORY_CAP && !state.cards.some(function (card) {
          return card.id === toastUndoMeta.cardId;
        });
      case "room": {
        const card = state.cards.find(function (row) { return row.id === toastUndoMeta.cardId; });
        if (!card || card.starred || card.salt > 0) return false;
        return true;
      }
      case "keep":
        return toastUndoMeta.ids.every(function (id) {
          return state.cards.some(function (card) { return card.id === id; });
        });
      default: {
        const _never = kind;
        throw new Error("Unknown undo toast " + _never);
      }
    }
  }

  function retireStaleUndo() {
    if (!toastBag || undoToastWorks()) return;
    toastBag = null;
    toastUndoMeta = null;
    els.toast.classList.remove("show");
    els.toastUndo.hidden = true;
    hideToastExtra();
    clearTimeout(toast._t);
  }

  function toast(msg, opts) {
    const options = opts || {};
    retireStaleUndo();
    if (toastBag && !options.undo) {
      els.toastExtra.hidden = false;
      els.toastExtra.textContent = msg;
      els.spoken.textContent = msg;
      return;
    }
    els.toastText.textContent = msg;
    hideToastExtra();
    if (options.undo) {
      toastBag = options.undo;
      toastUndoMeta = options.meta || null;
      els.toastUndo.hidden = false;
    } else {
      toastBag = null;
      toastUndoMeta = null;
      els.toastUndo.hidden = true;
    }
    els.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      els.toast.classList.remove("show");
      toastBag = null;
      toastUndoMeta = null;
      els.toastUndo.hidden = true;
      hideToastExtra();
    }, options.ms || 2600);
  }

  function reasonMessage(reason) {
    switch (reason) {
      case "blank":
        return "Name the questionable starter. A backup is optional.";
      case "starter":
        return "Name the questionable starter.";
      case "cap":
        return "This phone holds 24 panics. Starred panics stay. Remove one to panic another.";
      case "missing":
        return "That panic is no longer on this phone.";
      case "exists":
        return "Already on this phone.";
      case "salt":
        return "This card is out of re-panics.";
      default: {
        const _never = reason;
        throw new Error("Unknown reason " + _never);
      }
    }
  }

  function takenBackCopy(action) {
    switch (action) {
      case "repanic":
        return "Re-panic taken back.";
      case "star":
        return "Star taken back.";
      case "panic":
        return "Panic taken back.";
      default: {
        const _never = action;
        throw new Error("Unknown undo " + _never);
      }
    }
  }

  function undoWord(action) {
    switch (action) {
      case "panic":
        return "Undo";
      case "repanic":
        return "Undo re-panic";
      case "star":
        return "Undo star";
      default: {
        const _never = action;
        throw new Error("Unknown undo " + _never);
      }
    }
  }

  function probeStorage() {
    try {
      const probe = LockPanic.STORAGE_KEY + "-probe";
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
    els.storageCorrupt.hidden = true;
    if (!storageOk) return LockPanic.emptyState();
    let raw = null;
    try {
      raw = localStorage.getItem(LockPanic.STORAGE_KEY);
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
      return LockPanic.emptyState();
    }
    const parsed = LockPanic.readStored(raw);
    if (!parsed.corrupt) return parsed.state || LockPanic.emptyState();
    try {
      localStorage.setItem(LockPanic.STORAGE_BACKUP_KEY, parsed.backup);
      localStorage.setItem(LockPanic.STORAGE_KEY, JSON.stringify(parsed.state));
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
      return parsed.state;
    }
    els.storageCorrupt.hidden = false;
    return parsed.state;
  }

  function save() {
    if (!storageOk) return;
    try {
      localStorage.setItem(LockPanic.STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
    }
  }

  function current() {
    return state.cards.find(function (card) { return card.id === state.openId; }) || null;
  }

  function showFormError(msg) {
    els.formError.textContent = msg;
    els.formError.hidden = false;
    els.fieldStarter.setAttribute("aria-invalid", "true");
    els.fieldStarter.focus();
  }

  function hideFormError() {
    els.formError.hidden = true;
    els.formError.textContent = "";
    els.fieldStarter.removeAttribute("aria-invalid");
  }

  function cleanShareUrl() {
    try {
      const url = new URL(location.href);
      url.hash = "";
      url.searchParams.delete(QUERY_KEY);
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    } catch (_) {
      /* ignore */
    }
  }

  function clearEmptyPanicHash() {
    try {
      const url = new URL(location.href);
      if ((url.hash || "").indexOf(HASH_PREFIX) !== 0) return;
      url.hash = "";
      history.replaceState(null, "", url.pathname + url.search);
    } catch (_) {
      /* ignore */
    }
  }

  async function tryImportShare() {
    const hash = location.hash || "";
    let token = "";
    let fromHash = false;
    if (hash.indexOf(HASH_PREFIX) === 0) {
      fromHash = true;
      try {
        token = decodeURIComponent(hash.slice(HASH_PREFIX.length));
      } catch (_) {
        token = hash.slice(HASH_PREFIX.length);
      }
      if (!String(token).trim()) {
        clearEmptyPanicHash();
        fromHash = false;
        token = "";
      }
    }
    if (!fromHash) token = new URLSearchParams(location.search).get(QUERY_KEY) || "";
    if (!String(token).trim()) return null;
    try {
      const json = await LockPanic.decompressPayload(token);
      const share = LockPanic.parseShare(JSON.parse(json));
      cleanShareUrl();
      if (!share) throw new Error("empty");
      return share;
    } catch (_) {
      cleanShareUrl();
      toast("That snapshot could not be read.", { ms: 3200, important: true });
      return null;
    }
  }

  function scheduleShareImport() {
    shareChain = shareChain.then(function () {
      return tryImportShare();
    }).then(function (share) {
      if (!share) return;
      incoming = share;
      render();
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      els.shareOffer.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    }).catch(function () {
      toast("That snapshot could not be read.", { ms: 3200, important: true });
    });
    return shareChain;
  }

  function offerLine(share) {
    if (!share || !share.cards || !share.cards.length) return "";
    switch (share.k) {
      case "card":
        return LockPanic.face(share.cards[0]);
      case "shelf":
        return share.cards.length + " panics · " + LockPanic.face(share.cards[0]);
      default: {
        const _never = share.k;
        throw new Error("Unknown share " + _never);
      }
    }
  }

  function dropPhrase(drops) {
    if (drops === 1) return "drops your oldest unstarred";
    return "drops your " + drops + " oldest unstarred";
  }

  function offerHint(share) {
    const preview = LockPanic.previewKeep(state, share);
    let lead;
    if (!preview.fresh) {
      lead = "Already on this phone.";
    } else if (!preview.adds) {
      lead = "Starred panics fill this phone. Remove one to keep this.";
    } else if (preview.adds < preview.offered && preview.drops) {
      lead = "Adds " + preview.adds + " of " + preview.offered + ", " + dropPhrase(preview.drops) + ".";
    } else if (preview.adds < preview.offered) {
      lead = "Adds " + preview.adds + " of " + preview.offered + ".";
    } else if (preview.drops) {
      lead = "Adds " + preview.adds + ", " + dropPhrase(preview.drops) + ".";
    } else {
      lead = "Adds " + preview.adds + ".";
    }
    return lead + " Not now drops the copy. Refresh will not bring it back.";
  }

  function announce(card) {
    const clock = LockPanic.clockLabel(card.minutes);
    const key = [
      card.id,
      String(card.salt),
      card.stamp,
      card.starter,
      card.backup,
      card.roast,
      String(card.meter),
      clock,
    ].join("|");
    if (key === spokenKey) return;
    spokenKey = key;
    const who = card.backup ? (card.starter + ", backup " + card.backup) : card.starter;
    els.spoken.textContent = "Lock panic " + card.stamp + ". Starter " + who + ". "
      + card.roast + " Anxiety " + card.meter + " percent. Not fantasy advice.";
  }

  function undoReady() {
    const card = current();
    return !!(actionUndo && card && card.id === actionUndo.cardId);
  }

  function paintCard(card) {
    const has = !!card;
    els.emptyHero.hidden = has;
    els.panicCard.hidden = !has;
    els.actionRow.hidden = !has;
    const latest = state.cards[0];
    els.shelfBar.hidden = !has || !latest || card.id === latest.id;
    if (!has) return;
    const band = LockPanic.bandFor(card.stamp);
    els.panicWord.setAttribute("data-band", band);
    els.stampMark.textContent = card.stamp;
    els.stampMark.setAttribute("data-band", band);
    const who = card.backup ? (card.starter + ". Backup " + card.backup + ".") : (card.starter + ".");
    els.panicHeading.textContent = "Lock panic " + card.stamp + ". Starter " + who;
    els.roastLine.textContent = card.roast;
    els.stamp.textContent = card.tag;
    els.starPill.hidden = !card.starred;
    const clock = LockPanic.clockLabel(card.minutes);
    els.clockChip.hidden = !clock;
    els.clockChip.textContent = clock;
    els.anxietyValue.textContent = String(card.meter);
    els.meterFill.style.width = card.meter + "%";
    els.meter.setAttribute("aria-valuenow", String(card.meter));
    els.meter.setAttribute(
      "aria-valuetext",
      "Anxiety meter " + card.meter + " percent. Entertainment only. Not a projection. Not fantasy advice."
    );
    els.starterName.textContent = card.starter;
    const named = !!card.backup;
    els.backupSide.hidden = !named;
    els.backupName.textContent = card.backup;
    els.exchange.classList.toggle("solo", !named);
    const exchangeLabel = named
      ? "Questionable starter " + card.starter + ". Backup " + card.backup + "."
      : "Questionable starter " + card.starter + ".";
    els.exchange.setAttribute("aria-label", exchangeLabel);
    els.leagueNote.hidden = !card.note;
    els.leagueNote.textContent = card.note || "";
    els.btnStar.textContent = card.starred ? "Starred" : "Star";
    els.btnStar.setAttribute("aria-pressed", card.starred ? "true" : "false");
    els.btnStar.setAttribute("aria-label", card.starred ? "Starred. Remove the star." : "Star this panic");
    const ready = undoReady();
    els.btnUndo.disabled = !ready;
    els.btnUndo.textContent = ready ? undoWord(actionUndo.action) : "Undo";
    els.btnUndo.setAttribute(
      "aria-label",
      ready ? undoWord(actionUndo.action) : "Undo, nothing to take back"
    );
    announce(card);
  }

  function paintHistory() {
    const visible = LockPanic.visibleCards(state);
    const total = state.cards.length;
    if (state.filter === "starred") {
      els.historySub.textContent = visible.length + " starred · " + total + " of " + LockPanic.HISTORY_CAP + " on this phone.";
    } else {
      els.historySub.textContent = total + " of " + LockPanic.HISTORY_CAP + " on this phone.";
    }
    els.historyEmpty.hidden = total > 0;
    els.filterEmpty.hidden = total === 0 || visible.length > 0;
    els.historyList.hidden = visible.length === 0;
    els.filters.hidden = total === 0;
    els.btnClear.hidden = total === 0;
    els.btnShareShelf.disabled = total === 0;
    els.filters.querySelectorAll("[data-filter]").forEach(function (btn) {
      const filter = btn.getAttribute("data-filter");
      switch (filter) {
        case "all":
        case "starred":
          btn.setAttribute("aria-pressed", state.filter === filter ? "true" : "false");
          break;
        default: {
          const _never = filter;
          throw new Error("Unknown filter " + _never);
        }
      }
    });
    els.historyList.replaceChildren();
    visible.forEach(function (card) {
      const li = document.createElement("li");
      li.className = "history-row";
      const open = document.createElement("button");
      open.type = "button";
      open.className = "history-open";
      open.setAttribute("data-open", card.id);
      if (card.id === state.openId) open.setAttribute("aria-current", "true");
      open.setAttribute("aria-label", "Open panic " + card.stamp + ", starter " + card.starter);
      const energy = document.createElement("span");
      energy.className = "history-energy";
      energy.setAttribute("data-band", LockPanic.bandFor(card.stamp));
      energy.textContent = card.stamp;
      const title = document.createElement("span");
      title.className = "history-title";
      title.textContent = (card.starred ? "★ " : "") + card.starter;
      const score = document.createElement("span");
      score.className = "history-score";
      score.textContent = card.tag + " · " + card.meter + "% anxiety";
      const meta = document.createElement("span");
      meta.className = "history-meta";
      const clock = LockPanic.clockLabel(card.minutes);
      if (card.backup) meta.textContent = "Backup " + card.backup + (clock ? " · " + clock : "");
      else meta.textContent = clock || card.roast;
      open.append(energy, title, score, meta);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "history-remove";
      remove.setAttribute("data-remove", card.id);
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove panic " + card.stamp + ", starter " + card.starter);
      li.append(open, remove);
      els.historyList.append(li);
    });
  }

  function paintSitChrome() {
    const has = state.cards.length > 0;
    els.sitKicker.textContent = has ? "Next panic" : "The lock";
    els.sitHeading.textContent = has ? "Panic another" : "Name the starter";
  }

  function render() {
    els.shareOffer.hidden = !incoming;
    if (incoming) {
      const preview = LockPanic.previewKeep(state, incoming);
      els.btnKeepShare.textContent = preview.fresh ? "Keep on this phone" : "Already on this phone";
      els.offerFace.textContent = offerLine(incoming);
      els.offerHint.textContent = offerHint(incoming);
    }
    paintCard(current());
    paintHistory();
    paintSitChrome();
  }

  function scrollCard() {
    if (els.panicCard.hidden) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    els.panicCard.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }

  function readForm() {
    return {
      starter: els.fieldStarter.value,
      backup: els.fieldBackup.value,
      minutes: els.fieldMinutes.value,
      note: els.fieldNote.value,
    };
  }

  function writeForm(card) {
    els.fieldStarter.value = card.starter;
    els.fieldBackup.value = card.backup;
    els.fieldMinutes.value = card.minutes;
    els.fieldNote.value = card.note;
  }

  function forgetUndo(cardId) {
    if (actionUndo && actionUndo.cardId === cardId) actionUndo = null;
  }

  function applyUndo(bag) {
    if (!bag) return;
    switch (bag.action) {
      case "panic": {
        forgetUndo(bag.cardId);
        let draft = state;
        if (draft.cards.some(function (card) { return card.id === bag.cardId; })) {
          const removed = LockPanic.removeCard(draft, bag.cardId);
          if (!removed.ok) {
            toast(reasonMessage(removed.reason), { important: true });
            return;
          }
          draft = removed.state;
        }
        const drops = (bag.dropped || []).slice().sort(function (a, b) { return a.index - b.index; });
        for (let i = 0; i < drops.length; i += 1) {
          if (draft.cards.some(function (card) { return card.id === drops[i].card.id; })) continue;
          const restored = LockPanic.restoreCard(draft, drops[i].card, drops[i].index, false);
          if (!restored.ok) {
            state = draft;
            save();
            render();
            toast(reasonMessage(restored.reason), { important: true });
            return;
          }
          draft = restored.state;
        }
        if (bag.previousOpenId && draft.cards.some(function (card) { return card.id === bag.previousOpenId; })) {
          const opened = LockPanic.openCard(draft, bag.previousOpenId);
          if (opened.ok) draft = opened.state;
        }
        state = draft;
        save();
        render();
        toast("Panic taken back.");
        return;
      }
      case "repanic":
      case "star": {
        forgetUndo(bag.cardId);
        const result = LockPanic.putCard(state, bag.previous);
        if (!result.ok) {
          toast(reasonMessage(result.reason), { important: true });
          return;
        }
        state = result.state;
        save();
        render();
        toast(takenBackCopy(bag.action));
        return;
      }
      default: {
        const _never = bag.action;
        throw new Error("Unknown undo " + _never);
      }
    }
  }

  function undoLast() {
    const bag = actionUndo;
    const card = current();
    if (!bag || !card || card.id !== bag.cardId) return;
    applyUndo(bag);
  }

  function formReason(reason) {
    switch (reason) {
      case "blank":
      case "starter":
        return true;
      case "cap":
      case "missing":
      case "exists":
      case "salt":
        return false;
      default: {
        const _never = reason;
        throw new Error("Unknown reason " + _never);
      }
    }
  }

  function onPanic(event) {
    event.preventDefault();
    hideFormError();
    const previousOpenId = state.openId;
    const result = LockPanic.panic(state, readForm(), Date.now());
    if (!result.ok) {
      const msg = reasonMessage(result.reason);
      if (formReason(result.reason)) {
        showFormError(msg);
        if (!toastBag) toast(msg, { important: true });
        return;
      }
      toast(msg, { ms: result.reason === "cap" ? 4200 : 2600, important: true });
      return;
    }
    state = result.state;
    save();
    if (!result.already) writeForm(result.card);
    const dropped = result.dropped || [];
    if (!result.already) {
      actionUndo = {
        action: "panic",
        cardId: result.card.id,
        previous: null,
        previousOpenId: previousOpenId,
        dropped: dropped,
      };
    }
    render();
    scrollCard();
    if (result.already) {
      toast("Already on the shelf.");
      return;
    }
    if (dropped.length) {
      const bag = actionUndo;
      toast("Panicked. The oldest panic made room.", {
        ms: 8000,
        meta: { kind: "room", cardId: result.card.id },
        undo: function () { applyUndo(bag); },
      });
      return;
    }
    toast("Panic is up.");
  }

  function onRepanic() {
    const card = current();
    if (!card) return;
    const result = LockPanic.repanic(state, card.id, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason), { important: true });
      return;
    }
    actionUndo = { action: "repanic", cardId: result.card.id, previous: result.previous, previousOpenId: "", dropped: [] };
    state = result.state;
    save();
    render();
    toast("New roast. Same stamp.");
  }

  function onStar() {
    const card = current();
    if (!card) return;
    const result = LockPanic.setStarred(state, card.id, !card.starred, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason), { important: true });
      return;
    }
    actionUndo = { action: "star", cardId: result.card.id, previous: result.previous, previousOpenId: "", dropped: [] };
    state = result.state;
    save();
    render();
    toast(result.card.starred ? "Starred on this phone." : "Star removed.");
  }

  function removeCurrent(id) {
    const result = LockPanic.removeCard(state, id);
    if (!result.ok) {
      toast(reasonMessage(result.reason), { important: true });
      return;
    }
    const snapshot = result.removed;
    const index = result.index;
    const wasOpen = result.wasOpen;
    forgetUndo(id);
    state = result.state;
    save();
    render();
    toast("Removed " + snapshot.stamp + " · " + snapshot.starter + ".", {
      ms: 8000,
      meta: { kind: "remove", cardId: snapshot.id },
      undo: function () {
        const restored = LockPanic.restoreCard(state, snapshot, index, wasOpen);
        if (!restored.ok) {
          toast(reasonMessage(restored.reason), { important: true });
          return;
        }
        state = restored.state;
        save();
        render();
        toast("Put " + snapshot.stamp + " back.");
      },
    });
  }

  function clearAll() {
    if (!state.cards.length) return;
    const previous = state.cards.slice();
    const openId = state.openId;
    const cleared = LockPanic.clearCards(state);
    actionUndo = null;
    state = cleared.state;
    save();
    render();
    toast("Cleared every panic.", {
      ms: 8000,
      meta: { kind: "clear" },
      undo: function () {
        if (state.cards.length) {
          toast("A new panic is already on this phone.", { important: true });
          return;
        }
        state = LockPanic.restoreAll(state, previous, openId).state;
        save();
        render();
        toast("Panics restored.");
      },
    });
  }

  function openFromShelf(id) {
    const result = LockPanic.openCard(state, id);
    if (!result.ok) {
      toast(reasonMessage(result.reason), { important: true });
      return;
    }
    state = result.state;
    save();
    render();
    scrollCard();
  }

  function loadSample() {
    const previousOpenId = state.openId;
    const result = LockPanic.loadSample(state);
    if (!result.ok) {
      toast(reasonMessage(result.reason), { important: true });
      return;
    }
    state = result.state;
    save();
    hideFormError();
    writeForm(result.card);
    const dropped = result.dropped || [];
    if (!result.already) {
      actionUndo = {
        action: "panic",
        cardId: result.card.id,
        previous: null,
        previousOpenId: previousOpenId,
        dropped: dropped,
      };
    }
    render();
    scrollCard();
    if (result.already) {
      toast("Sample is back on the card.");
      return;
    }
    if (dropped.length) {
      const bag = actionUndo;
      toast("Sample loaded. The oldest panic made room.", {
        ms: 8000,
        meta: { kind: "room", cardId: result.card.id },
        undo: function () { applyUndo(bag); },
      });
      return;
    }
    toast("Sample panic loaded.");
  }

  function keptNote(result) {
    return LockPanic.keptLine(result.added, result.offered, result.fresh, result.dropped.length);
  }

  function keepIncoming() {
    if (!incoming) return;
    const share = incoming;
    const result = LockPanic.keepShare(state, share);
    if (!result.ok) {
      if (result.reason === "exists") {
        incoming = null;
        if (result.card) {
          const opened = LockPanic.openCard(state, result.card.id);
          if (opened.ok) state = opened.state;
          save();
        }
        render();
        scrollCard();
        toast("Already on this phone.");
        return;
      }
      render();
      if (result.reason === "cap") {
        toast("Starred panics fill this phone. Remove one to keep this now.", { ms: 4200, important: true });
        return;
      }
      toast(reasonMessage(result.reason), { important: true });
      return;
    }
    incoming = null;
    const addedIds = result.cards.map(function (card) { return card.id; });
    const dropped = result.dropped.slice();
    state = result.state;
    save();
    render();
    scrollCard();
    const note = keptNote(result);
    toast(note, dropped.length ? {
      ms: 8000,
      meta: { kind: "keep", ids: addedIds },
      undo: function () {
        let draft = state;
        for (let i = 0; i < addedIds.length; i += 1) {
          if (!draft.cards.some(function (card) { return card.id === addedIds[i]; })) continue;
          const removed = LockPanic.removeCard(draft, addedIds[i]);
          if (!removed.ok) {
            toast(reasonMessage(removed.reason), { important: true });
            return;
          }
          draft = removed.state;
        }
        const ordered = dropped.slice().sort(function (a, b) { return a.index - b.index; });
        for (let i = 0; i < ordered.length; i += 1) {
          const restored = LockPanic.restoreCard(draft, ordered[i].card, ordered[i].index, false);
          if (!restored.ok) {
            state = draft;
            save();
            render();
            toast(reasonMessage(restored.reason), { important: true });
            return;
          }
          draft = restored.state;
        }
        state = draft;
        save();
        render();
        toast("Snapshot put back.");
      },
    } : { ms: 2600 });
  }

  function dismissShare() {
    incoming = null;
    render();
    toast("Snapshot dropped.");
  }

  async function writeClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {
      return false;
    }
    return false;
  }

  async function copyText(text) {
    if (await writeClipboard(text)) return true;
    try {
      els.shareUrlBox.focus();
      els.shareUrlBox.select();
      return document.execCommand("copy");
    } catch (_) {
      return false;
    }
  }

  async function presentShare(payload, kind) {
    if (!payload) {
      toast("That panic could not be packed.", { important: true });
      return;
    }
    try {
      const packed = await LockPanic.compressPayload(JSON.stringify(payload));
      els.shareUrlBox.value = location.origin + location.pathname + HASH_PREFIX + packed;
      switch (kind) {
        case "card":
          els.shareTitle.textContent = "A copy of this panic.";
          els.shareLead.textContent = "Send this URL. They can keep the same card. Later re-panics here do not update their copy. Not live sync.";
          break;
        case "shelf":
          els.shareTitle.textContent = "A copy of this shelf.";
          els.shareLead.textContent = "Send this URL. They can keep these panics. Later re-panics here do not update their copies. Not live sync.";
          break;
        default: {
          const _never = kind;
          throw new Error("Unknown share " + _never);
        }
      }
      if (typeof els.shareDialog.showModal === "function") {
        if (!els.shareDialog.open) els.shareDialog.showModal();
      } else {
        toast("That snapshot could not be packed.", { important: true });
      }
    } catch (_) {
      toast("That snapshot could not be packed.", { important: true });
    }
  }

  async function copyShelfLink() {
    if (!state.cards.length) {
      toast("Panic something before you copy the shelf.", { important: true });
      return;
    }
    const payload = LockPanic.shareShelf(state);
    if (!payload) {
      toast("That panic could not be packed.", { important: true });
      return;
    }
    try {
      const packed = await LockPanic.compressPayload(JSON.stringify(payload));
      const url = location.origin + location.pathname + HASH_PREFIX + packed;
      if (await writeClipboard(url)) {
        toast("Shelf link copied.");
        return;
      }
      await presentShare(payload, "shelf");
    } catch (_) {
      toast("That snapshot could not be packed.", { important: true });
    }
  }

  async function copyCardLink() {
    const card = current();
    if (!card) {
      toast(reasonMessage("missing"), { important: true });
      return;
    }
    const payload = LockPanic.shareCard(card);
    if (!payload) {
      toast("That panic could not be packed.", { important: true });
      return;
    }
    try {
      const packed = await LockPanic.compressPayload(JSON.stringify(payload));
      const url = location.origin + location.pathname + HASH_PREFIX + packed;
      if (await writeClipboard(url)) {
        toast("Link copied.");
        return;
      }
      await presentShare(payload, "card");
    } catch (_) {
      toast("That snapshot could not be packed.", { important: true });
    }
  }

  function wire() {
    if (wired) return;
    wired = true;

    els.panicForm.addEventListener("submit", onPanic);
    els.fieldStarter.addEventListener("input", hideFormError);
    els.fieldBackup.addEventListener("input", hideFormError);
    els.fieldMinutes.addEventListener("input", hideFormError);
    els.btnSample.addEventListener("click", loadSample);
    els.btnRepanic.addEventListener("click", onRepanic);
    els.btnStar.addEventListener("click", onStar);
    els.btnUndo.addEventListener("click", undoLast);
    els.btnRemove.addEventListener("click", function () {
      const card = current();
      if (card) removeCurrent(card.id);
    });
    els.btnShare.addEventListener("click", copyCardLink);
    els.btnShareShelf.addEventListener("click", copyShelfLink);
    els.btnClear.addEventListener("click", clearAll);
    els.btnLatest.addEventListener("click", function () {
      const latest = state.cards[0];
      if (latest) openFromShelf(latest.id);
    });
    els.btnKeepShare.addEventListener("click", keepIncoming);
    els.btnDismissShare.addEventListener("click", dismissShare);
    els.btnCopyShare.addEventListener("click", async function () {
      const ok = await copyText(els.shareUrlBox.value);
      toast(ok ? "Link copied." : "Select the link and copy it.", ok ? {} : { important: true });
    });
    els.btnCloseShare.addEventListener("click", function () {
      els.shareDialog.close();
    });
    els.toastUndo.addEventListener("click", function () {
      const run = toastBag;
      toastBag = null;
      toastUndoMeta = null;
      els.toast.classList.remove("show");
      els.toastUndo.hidden = true;
      hideToastExtra();
      clearTimeout(toast._t);
      if (run) run();
    });
    els.historyList.addEventListener("click", function (event) {
      const removeBtn = event.target.closest("[data-remove]");
      if (removeBtn) {
        removeCurrent(removeBtn.getAttribute("data-remove"));
        return;
      }
      const openBtn = event.target.closest("[data-open]");
      if (openBtn) openFromShelf(openBtn.getAttribute("data-open"));
    });
    els.filters.addEventListener("click", function (event) {
      const btn = event.target.closest("[data-filter]");
      if (!btn) return;
      state = LockPanic.setFilter(state, btn.getAttribute("data-filter"));
      save();
      render();
    });
  }

  function boot() {
    cacheEls();
    state = load();
    wire();
    render();
    window.addEventListener("hashchange", function () {
      scheduleShareImport();
    });
    scheduleShareImport();
  }

  boot();
})();
