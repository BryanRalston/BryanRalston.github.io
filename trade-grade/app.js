(function () {
  "use strict";

  const HASH_PREFIX = "#g=";
  const QUERY_KEY = "g";

  const els = {};
  let storageOk = true;
  let state = TradeGrade.emptyState();
  let incoming = null;
  let actionUndo = null;
  let toastBag = null;
  let spokenKey = "";
  let wired = false;
  let shareChain = Promise.resolve();

  function grab(id) {
    els[id] = document.getElementById(id);
  }

  function cacheEls() {
    [
      "storageFail", "storageCorrupt", "spoken", "shareOffer", "offerFace", "offerHint", "btnKeepShare", "btnDismissShare",
      "shelfBar", "btnLatest", "emptyHero", "gradeCard", "stamp", "starPill",
      "gradeHeading", "letterMark", "roastLine", "confValue", "meter", "meterFill",
      "exchange", "giveName", "getName", "leagueNote",
      "actionRow", "btnRegrade", "btnStar", "btnUndo", "btnShare", "btnRemove",
      "tradeForm", "tradeKicker", "tradeHeading",
      "fieldGive", "fieldGet", "fieldNote", "formError", "btnSample",
      "historySub", "filters", "historyEmpty", "filterEmpty", "historyList", "btnClear", "btnShareVault",
      "toast", "toastText", "toastUndo",
      "shareDialog", "shareTitle", "shareLead", "shareUrlBox", "btnCopyShare", "btnCloseShare",
    ].forEach(grab);
  }

  function toast(msg, opts) {
    const options = opts || {};
    if (toastBag && !options.undo && !options.important) return;
    els.toastText.textContent = msg;
    if (options.undo) {
      toastBag = options.undo;
      els.toastUndo.hidden = false;
    } else {
      toastBag = null;
      els.toastUndo.hidden = true;
    }
    els.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      els.toast.classList.remove("show");
      toastBag = null;
      els.toastUndo.hidden = true;
    }, options.ms || 2600);
  }

  function reasonMessage(reason) {
    switch (reason) {
      case "blank":
        return "Name what you give and what you get.";
      case "give":
        return "Name what you give.";
      case "get":
        return "Name what you get.";
      case "same":
        return "Those are the same package. The booth needs two sides.";
      case "cap":
        return "This phone holds 24 grades. Starred grades stay. Remove one to grade another.";
      case "missing":
        return "That grade is no longer on this phone.";
      case "exists":
        return "Already on this phone.";
      case "salt":
        return "This card is out of re-grades.";
      default: {
        const _never = reason;
        throw new Error("Unknown reason " + _never);
      }
    }
  }

  function takenBackCopy(action) {
    switch (action) {
      case "regrade":
        return "Re-grade taken back.";
      case "star":
        return "Star taken back.";
      case "grade":
        return "Grade taken back.";
      default: {
        const _never = action;
        throw new Error("Unknown undo " + _never);
      }
    }
  }

  function undoWord(action) {
    switch (action) {
      case "grade":
        return "Undo";
      case "regrade":
        return "Undo re-grade";
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
      const probe = TradeGrade.STORAGE_KEY + "-probe";
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
    if (!storageOk) return TradeGrade.emptyState();
    let raw = null;
    try {
      raw = localStorage.getItem(TradeGrade.STORAGE_KEY);
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
      return TradeGrade.emptyState();
    }
    const parsed = TradeGrade.readStored(raw);
    if (!parsed.corrupt) return parsed.state || TradeGrade.emptyState();
    try {
      localStorage.setItem(TradeGrade.STORAGE_BACKUP_KEY, parsed.backup);
      localStorage.setItem(TradeGrade.STORAGE_KEY, JSON.stringify(parsed.state));
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
      localStorage.setItem(TradeGrade.STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
    }
  }

  function current() {
    return state.cards.find(function (card) { return card.id === state.openId; }) || null;
  }

  function showFormError(msg, reason) {
    els.formError.textContent = msg;
    els.formError.hidden = false;
    if (reason === "give" || reason === "blank" || reason === "same") {
      els.fieldGive.setAttribute("aria-invalid", "true");
    }
    if (reason === "get" || reason === "blank" || reason === "same") {
      els.fieldGet.setAttribute("aria-invalid", "true");
    }
    if (reason === "get") els.fieldGet.focus();
    else if (reason === "give" || reason === "blank" || reason === "same") els.fieldGive.focus();
  }

  function hideFormError() {
    els.formError.hidden = true;
    els.formError.textContent = "";
    els.fieldGive.removeAttribute("aria-invalid");
    els.fieldGet.removeAttribute("aria-invalid");
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

  async function tryImportShare() {
    const hash = location.hash || "";
    let token = "";
    if (hash.indexOf(HASH_PREFIX) === 0) {
      try {
        token = decodeURIComponent(hash.slice(HASH_PREFIX.length));
      } catch (_) {
        token = hash.slice(HASH_PREFIX.length);
      }
    } else {
      token = new URLSearchParams(location.search).get(QUERY_KEY) || "";
    }
    if (!token) return null;
    try {
      const json = await TradeGrade.decompressPayload(token);
      const share = TradeGrade.parseShare(JSON.parse(json));
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
        return TradeGrade.face(share.cards[0]);
      case "vault":
        return share.cards.length + " grades · " + TradeGrade.face(share.cards[0]);
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
    const preview = TradeGrade.previewKeep(state, share);
    let lead;
    if (!preview.fresh) {
      lead = "Already on this phone.";
    } else if (!preview.adds) {
      lead = "Starred grades fill this phone. Remove one to keep this.";
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
    const key = [
      card.id,
      String(card.salt),
      card.letter,
      card.give,
      card.get,
      card.roast,
      String(card.confidence),
    ].join("|");
    if (key === spokenKey) return;
    spokenKey = key;
    els.spoken.textContent = "Grade " + card.letter + ". Give " + card.give + ". Get " + card.get + ". "
      + card.roast + " Entertainment confidence " + card.confidence + " percent. Not fantasy advice.";
  }

  function undoReady() {
    const card = current();
    return !!(actionUndo && card && card.id === actionUndo.cardId);
  }

  function paintCard(card) {
    const has = !!card;
    els.emptyHero.hidden = has;
    els.gradeCard.hidden = !has;
    els.actionRow.hidden = !has;
    const latest = state.cards[0];
    els.shelfBar.hidden = !has || !latest || card.id === latest.id;
    if (!has) return;
    els.letterMark.textContent = card.letter;
    els.letterMark.setAttribute("data-band", TradeGrade.bandFor(card.letter));
    els.gradeHeading.textContent = "Grade " + card.letter + ". Give " + card.give + ". Get " + card.get + ".";
    els.roastLine.textContent = card.roast;
    els.stamp.textContent = card.tag;
    els.starPill.hidden = !card.starred;
    els.confValue.textContent = String(card.confidence);
    els.meterFill.style.width = card.confidence + "%";
    els.meter.setAttribute("aria-valuenow", String(card.confidence));
    els.meter.setAttribute(
      "aria-valuetext",
      "Entertainment confidence " + card.confidence + " percent. Not a projection."
    );
    els.giveName.textContent = card.give;
    els.getName.textContent = card.get;
    els.exchange.setAttribute("aria-label", "Give " + card.give + ". Get " + card.get + ".");
    els.leagueNote.hidden = !card.note;
    els.leagueNote.textContent = card.note || "";
    els.btnStar.textContent = card.starred ? "Starred" : "Star";
    els.btnStar.setAttribute("aria-pressed", card.starred ? "true" : "false");
    els.btnStar.setAttribute("aria-label", card.starred ? "Starred. Remove the star." : "Star this grade");
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
    const visible = TradeGrade.visibleCards(state);
    const total = state.cards.length;
    if (state.filter === "starred") {
      els.historySub.textContent = visible.length + " starred · " + total + " of " + TradeGrade.HISTORY_CAP + " on this phone.";
    } else {
      els.historySub.textContent = total + " of " + TradeGrade.HISTORY_CAP + " on this phone.";
    }
    els.historyEmpty.hidden = total > 0;
    els.filterEmpty.hidden = total === 0 || visible.length > 0;
    els.historyList.hidden = visible.length === 0;
    els.filters.hidden = total === 0;
    els.btnClear.hidden = total === 0;
    els.btnShareVault.disabled = total === 0;
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
      open.setAttribute("aria-label", "Open grade " + card.letter + ", give " + card.give + ", get " + card.get);
      const letter = document.createElement("span");
      letter.className = "history-letter";
      letter.setAttribute("data-band", TradeGrade.bandFor(card.letter));
      letter.textContent = card.letter;
      const title = document.createElement("span");
      title.className = "history-title";
      title.textContent = (card.starred ? "★ " : "") + card.give + " ↔ " + card.get;
      const score = document.createElement("span");
      score.className = "history-score";
      score.textContent = card.tag + " · " + card.confidence + "% theater";
      const meta = document.createElement("span");
      meta.className = "history-meta";
      meta.textContent = card.note || card.roast;
      open.append(letter, title, score, meta);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "history-remove";
      remove.setAttribute("data-remove", card.id);
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove grade " + card.letter + ", give " + card.give + ", get " + card.get);
      li.append(open, remove);
      els.historyList.append(li);
    });
  }

  function paintTradeChrome() {
    const has = state.cards.length > 0;
    els.tradeKicker.textContent = has ? "Next trade" : "The trade";
    els.tradeHeading.textContent = has ? "Grade another" : "Name the trade";
  }

  function render() {
    els.shareOffer.hidden = !incoming;
    if (incoming) {
      els.offerFace.textContent = offerLine(incoming);
      els.offerHint.textContent = offerHint(incoming);
    }
    paintCard(current());
    paintHistory();
    paintTradeChrome();
  }

  function scrollCard() {
    if (els.gradeCard.hidden) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    els.gradeCard.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }

  function readForm() {
    return {
      give: els.fieldGive.value,
      get: els.fieldGet.value,
      note: els.fieldNote.value,
    };
  }

  function writeForm(card) {
    els.fieldGive.value = card.give;
    els.fieldGet.value = card.get;
    els.fieldNote.value = card.note;
  }

  function forgetUndo(cardId) {
    if (actionUndo && actionUndo.cardId === cardId) actionUndo = null;
  }

  function applyUndo(bag) {
    if (!bag) return;
    switch (bag.action) {
      case "grade": {
        forgetUndo(bag.cardId);
        let draft = state;
        if (draft.cards.some(function (card) { return card.id === bag.cardId; })) {
          const removed = TradeGrade.removeCard(draft, bag.cardId);
          if (!removed.ok) {
            toast(reasonMessage(removed.reason), { important: true });
            return;
          }
          draft = removed.state;
        }
        const drops = (bag.dropped || []).slice().sort(function (a, b) { return a.index - b.index; });
        for (let i = 0; i < drops.length; i += 1) {
          if (draft.cards.some(function (card) { return card.id === drops[i].card.id; })) continue;
          const restored = TradeGrade.restoreCard(draft, drops[i].card, drops[i].index, false);
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
          const opened = TradeGrade.openCard(draft, bag.previousOpenId);
          if (opened.ok) draft = opened.state;
        }
        state = draft;
        save();
        render();
        toast("Grade taken back.");
        return;
      }
      case "regrade":
      case "star": {
        forgetUndo(bag.cardId);
        const result = TradeGrade.putCard(state, bag.previous);
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

  function onGrade(event) {
    event.preventDefault();
    hideFormError();
    const previousOpenId = state.openId;
    const result = TradeGrade.grade(state, readForm(), Date.now());
    if (!result.ok) {
      const msg = reasonMessage(result.reason);
      if (result.reason === "cap") toast(msg, { ms: 4200, important: true });
      else {
        showFormError(msg, result.reason);
        toast(msg, { important: true });
      }
      return;
    }
    state = result.state;
    save();
    writeForm(result.card);
    const dropped = result.dropped || [];
    if (!result.already) {
      actionUndo = {
        action: "grade",
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
      toast("Graded. The oldest grade made room.", {
        ms: 8000,
        undo: function () { applyUndo(bag); },
      });
      return;
    }
    toast("Grade is up.");
  }

  function onRegrade() {
    const card = current();
    if (!card) return;
    const result = TradeGrade.regrade(state, card.id, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason), { important: true });
      return;
    }
    actionUndo = { action: "regrade", cardId: result.card.id, previous: result.previous, previousOpenId: "", dropped: [] };
    state = result.state;
    save();
    render();
    toast("New roast. Same letter.");
  }

  function onStar() {
    const card = current();
    if (!card) return;
    const result = TradeGrade.setStarred(state, card.id, !card.starred, Date.now());
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
    const result = TradeGrade.removeCard(state, id);
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
    toast("Removed " + snapshot.letter + " · " + snapshot.give + ".", {
      ms: 8000,
      undo: function () {
        const restored = TradeGrade.restoreCard(state, snapshot, index, wasOpen);
        if (!restored.ok) {
          toast(reasonMessage(restored.reason), { important: true });
          return;
        }
        state = restored.state;
        save();
        render();
        toast("Put " + snapshot.letter + " back.");
      },
    });
  }

  function clearAll() {
    if (!state.cards.length) return;
    const previous = state.cards.slice();
    const openId = state.openId;
    const cleared = TradeGrade.clearCards(state);
    actionUndo = null;
    state = cleared.state;
    save();
    render();
    toast("Cleared every grade.", {
      ms: 8000,
      undo: function () {
        if (state.cards.length) {
          toast("A new grade is already on this phone.", { important: true });
          return;
        }
        state = TradeGrade.restoreAll(state, previous, openId).state;
        save();
        render();
        toast("Grades restored.");
      },
    });
  }

  function openFromShelf(id) {
    const result = TradeGrade.openCard(state, id);
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
    const result = TradeGrade.loadSample(state);
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
        action: "grade",
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
      toast("Sample loaded. The oldest grade made room.", {
        ms: 8000,
        undo: function () { applyUndo(bag); },
      });
      return;
    }
    toast("Sample trade loaded.");
  }

  function keptNote(result) {
    const dropped = result.dropped.length;
    if (result.added < result.offered) return "Kept " + result.added + " of " + result.offered + ".";
    if (dropped === 1) return "Kept. The oldest grade made room.";
    if (dropped > 1) return "Kept. Dropped your " + dropped + " oldest unstarred.";
    return "Kept on this phone.";
  }

  function keepIncoming() {
    if (!incoming) return;
    const share = incoming;
    const result = TradeGrade.keepShare(state, share);
    if (!result.ok) {
      if (result.reason === "exists") {
        incoming = null;
        if (result.card) {
          const opened = TradeGrade.openCard(state, result.card.id);
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
        toast("Starred grades fill this phone. Remove one to keep this.", { ms: 4200, important: true });
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
      undo: function () {
        let draft = state;
        for (let i = 0; i < addedIds.length; i += 1) {
          if (!draft.cards.some(function (card) { return card.id === addedIds[i]; })) continue;
          const removed = TradeGrade.removeCard(draft, addedIds[i]);
          if (!removed.ok) {
            toast(reasonMessage(removed.reason), { important: true });
            return;
          }
          draft = removed.state;
        }
        const ordered = dropped.slice().sort(function (a, b) { return a.index - b.index; });
        for (let i = 0; i < ordered.length; i += 1) {
          const restored = TradeGrade.restoreCard(draft, ordered[i].card, ordered[i].index, false);
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
      toast("That grade could not be packed.", { important: true });
      return;
    }
    try {
      const packed = await TradeGrade.compressPayload(JSON.stringify(payload));
      els.shareUrlBox.value = location.origin + location.pathname + HASH_PREFIX + packed;
      switch (kind) {
        case "card":
          els.shareTitle.textContent = "A copy of this grade.";
          els.shareLead.textContent = "Send this URL. They can keep the same card. Later re-grades here do not update their copy. Not live sync.";
          break;
        case "vault":
          els.shareTitle.textContent = "A copy of this shelf.";
          els.shareLead.textContent = "Send this URL. They can keep these grades. Later re-grades here do not update their copies. Not live sync.";
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

  function shareVault() {
    if (!state.cards.length) {
      toast("Grade something before you copy the shelf.", { important: true });
      return;
    }
    presentShare(TradeGrade.shareVault(state), "vault");
  }

  async function copyCardLink() {
    const card = current();
    if (!card) {
      toast(reasonMessage("missing"), { important: true });
      return;
    }
    const payload = TradeGrade.shareCard(card);
    if (!payload) {
      toast("That grade could not be packed.", { important: true });
      return;
    }
    try {
      const packed = await TradeGrade.compressPayload(JSON.stringify(payload));
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

    els.tradeForm.addEventListener("submit", onGrade);
    els.fieldGive.addEventListener("input", hideFormError);
    els.fieldGet.addEventListener("input", hideFormError);
    els.btnSample.addEventListener("click", loadSample);
    els.btnRegrade.addEventListener("click", onRegrade);
    els.btnStar.addEventListener("click", onStar);
    els.btnUndo.addEventListener("click", undoLast);
    els.btnRemove.addEventListener("click", function () {
      const card = current();
      if (card) removeCurrent(card.id);
    });
    els.btnShare.addEventListener("click", copyCardLink);
    els.btnShareVault.addEventListener("click", shareVault);
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
      els.toast.classList.remove("show");
      els.toastUndo.hidden = true;
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
      state = TradeGrade.setFilter(state, btn.getAttribute("data-filter"));
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
