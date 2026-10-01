(function () {
  "use strict";

  const HASH_PREFIX = "#n=";
  const QUERY_KEY = "n";

  const els = {};
  let storageOk = true;
  let state = BenchBomb.emptyState();
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
      "shelfBar", "btnLatest", "emptyHero", "bombCard", "stamp", "starPill",
      "bombHeading", "bombWord", "energyMark", "pointsFigure", "pointsBig", "pointsUnit",
      "roastLine", "falloutValue", "meter", "meterFill",
      "exchange", "satName", "startSide", "startName", "leagueNote",
      "actionRow", "btnRebomb", "btnStar", "btnUndo", "btnShare", "btnRemove",
      "bombForm", "sitKicker", "sitHeading",
      "fieldSat", "fieldStart", "fieldPoints", "fieldNote", "formError", "btnSample",
      "historySub", "filters", "historyEmpty", "filterEmpty", "historyList", "btnClear", "btnShareShelf",
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
        return "Name who you benched and the points they dropped.";
      case "sat":
        return "Name who you benched.";
      case "points":
        return "Say how many points they dropped. A number or a rough range is enough.";
      case "cap":
        return "This phone holds 24 bombs. Starred bombs stay. Remove one to bomb another.";
      case "missing":
        return "That bomb is no longer on this phone.";
      case "exists":
        return "Already on this phone.";
      case "salt":
        return "This card is out of re-bombs.";
      default: {
        const _never = reason;
        throw new Error("Unknown reason " + _never);
      }
    }
  }

  function takenBackCopy(action) {
    switch (action) {
      case "rebomb":
        return "Re-bomb taken back.";
      case "star":
        return "Star taken back.";
      case "bomb":
        return "Bomb taken back.";
      default: {
        const _never = action;
        throw new Error("Unknown undo " + _never);
      }
    }
  }

  function undoWord(action) {
    switch (action) {
      case "bomb":
        return "Undo";
      case "rebomb":
        return "Undo re-bomb";
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
      const probe = BenchBomb.STORAGE_KEY + "-probe";
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
    if (!storageOk) return BenchBomb.emptyState();
    let raw = null;
    try {
      raw = localStorage.getItem(BenchBomb.STORAGE_KEY);
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
      return BenchBomb.emptyState();
    }
    const parsed = BenchBomb.readStored(raw);
    if (!parsed.corrupt) return parsed.state || BenchBomb.emptyState();
    try {
      localStorage.setItem(BenchBomb.STORAGE_BACKUP_KEY, parsed.backup);
      localStorage.setItem(BenchBomb.STORAGE_KEY, JSON.stringify(parsed.state));
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
      localStorage.setItem(BenchBomb.STORAGE_KEY, JSON.stringify(state));
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
    if (reason === "sat" || reason === "blank") {
      els.fieldSat.setAttribute("aria-invalid", "true");
    }
    if (reason === "points" || reason === "blank") {
      els.fieldPoints.setAttribute("aria-invalid", "true");
    }
    if (reason === "points") els.fieldPoints.focus();
    else if (reason === "sat" || reason === "blank") els.fieldSat.focus();
  }

  function hideFormError() {
    els.formError.hidden = true;
    els.formError.textContent = "";
    els.fieldSat.removeAttribute("aria-invalid");
    els.fieldPoints.removeAttribute("aria-invalid");
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
      const json = await BenchBomb.decompressPayload(token);
      const share = BenchBomb.parseShare(JSON.parse(json));
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
        return BenchBomb.face(share.cards[0]);
      case "shelf":
        return share.cards.length + " bombs · " + BenchBomb.face(share.cards[0]);
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
    const preview = BenchBomb.previewKeep(state, share);
    let lead;
    if (!preview.fresh) {
      lead = "Already on this phone.";
    } else if (!preview.adds) {
      lead = "Starred bombs fill this phone. Remove one to keep this.";
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
      card.energy,
      card.sat,
      card.points,
      card.roast,
      String(card.fallout),
    ].join("|");
    if (key === spokenKey) return;
    spokenKey = key;
    els.spoken.textContent = "Bomb " + card.energy + ". Benched " + card.sat + " for " + card.points + ". "
      + card.roast + " Fallout " + card.fallout + " percent. Not fantasy advice.";
  }

  function undoReady() {
    const card = current();
    return !!(actionUndo && card && card.id === actionUndo.cardId);
  }

  function pointsLookNumeric(text) {
    return /\d/.test(text || "");
  }

  function paintCard(card) {
    const has = !!card;
    els.emptyHero.hidden = has;
    els.bombCard.hidden = !has;
    els.actionRow.hidden = !has;
    const latest = state.cards[0];
    els.shelfBar.hidden = !has || !latest || card.id === latest.id;
    if (!has) return;
    const band = BenchBomb.bandFor(card.energy);
    els.bombWord.setAttribute("data-band", band);
    els.energyMark.textContent = card.energy;
    els.energyMark.setAttribute("data-band", band);
    els.bombHeading.textContent = "Bomb " + card.energy + ". Benched " + card.sat + " for " + card.points + ".";
    els.pointsBig.textContent = card.points;
    els.pointsFigure.setAttribute("data-long", card.points.length > 8 ? "true" : "false");
    els.pointsUnit.hidden = !pointsLookNumeric(card.points);
    els.roastLine.textContent = card.roast;
    els.stamp.textContent = card.tag;
    els.starPill.hidden = !card.starred;
    els.falloutValue.textContent = String(card.fallout);
    els.meterFill.style.width = card.fallout + "%";
    els.meter.setAttribute("aria-valuenow", String(card.fallout));
    els.meter.setAttribute(
      "aria-valuetext",
      "Fallout meter " + card.fallout + " percent. Entertainment only. Not a projection."
    );
    els.satName.textContent = card.sat;
    const named = !!card.start;
    els.startSide.hidden = !named;
    els.startName.textContent = card.start;
    els.exchange.classList.toggle("solo", !named);
    const exchangeLabel = named
      ? "Benched " + card.sat + ". Started " + card.start + " instead."
      : "Benched " + card.sat + ".";
    els.exchange.setAttribute("aria-label", exchangeLabel);
    els.leagueNote.hidden = !card.note;
    els.leagueNote.textContent = card.note || "";
    els.btnStar.textContent = card.starred ? "Starred" : "Star";
    els.btnStar.setAttribute("aria-pressed", card.starred ? "true" : "false");
    els.btnStar.setAttribute("aria-label", card.starred ? "Starred. Remove the star." : "Star this bomb");
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
    const visible = BenchBomb.visibleCards(state);
    const total = state.cards.length;
    if (state.filter === "starred") {
      els.historySub.textContent = visible.length + " starred · " + total + " of " + BenchBomb.HISTORY_CAP + " on this phone.";
    } else {
      els.historySub.textContent = total + " of " + BenchBomb.HISTORY_CAP + " on this phone.";
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
      open.setAttribute("aria-label", "Open bomb " + card.energy + ", benched " + card.sat + ", " + card.points);
      const energy = document.createElement("span");
      energy.className = "history-energy";
      energy.setAttribute("data-band", BenchBomb.bandFor(card.energy));
      energy.textContent = card.energy;
      const title = document.createElement("span");
      title.className = "history-title";
      title.textContent = (card.starred ? "★ " : "") + card.sat;
      const score = document.createElement("span");
      score.className = "history-score";
      score.textContent = card.points + " · " + card.tag + " · " + card.fallout + "% fallout";
      const meta = document.createElement("span");
      meta.className = "history-meta";
      meta.textContent = card.start ? ("Started " + card.start) : card.roast;
      open.append(energy, title, score, meta);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "history-remove";
      remove.setAttribute("data-remove", card.id);
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove bomb " + card.energy + ", benched " + card.sat + ", " + card.points);
      li.append(open, remove);
      els.historyList.append(li);
    });
  }

  function paintSitChrome() {
    const has = state.cards.length > 0;
    els.sitKicker.textContent = has ? "Next bomb" : "The sit";
    els.sitHeading.textContent = has ? "Bomb another" : "Name the sit";
  }

  function render() {
    els.shareOffer.hidden = !incoming;
    if (incoming) {
      els.offerFace.textContent = offerLine(incoming);
      els.offerHint.textContent = offerHint(incoming);
    }
    paintCard(current());
    paintHistory();
    paintSitChrome();
  }

  function scrollCard() {
    if (els.bombCard.hidden) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    els.bombCard.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }

  function readForm() {
    return {
      sat: els.fieldSat.value,
      start: els.fieldStart.value,
      points: els.fieldPoints.value,
      note: els.fieldNote.value,
    };
  }

  function writeForm(card) {
    els.fieldSat.value = card.sat;
    els.fieldStart.value = card.start;
    els.fieldPoints.value = card.points;
    els.fieldNote.value = card.note;
  }

  function forgetUndo(cardId) {
    if (actionUndo && actionUndo.cardId === cardId) actionUndo = null;
  }

  function applyUndo(bag) {
    if (!bag) return;
    switch (bag.action) {
      case "bomb": {
        forgetUndo(bag.cardId);
        let draft = state;
        if (draft.cards.some(function (card) { return card.id === bag.cardId; })) {
          const removed = BenchBomb.removeCard(draft, bag.cardId);
          if (!removed.ok) {
            toast(reasonMessage(removed.reason), { important: true });
            return;
          }
          draft = removed.state;
        }
        const drops = (bag.dropped || []).slice().sort(function (a, b) { return a.index - b.index; });
        for (let i = 0; i < drops.length; i += 1) {
          if (draft.cards.some(function (card) { return card.id === drops[i].card.id; })) continue;
          const restored = BenchBomb.restoreCard(draft, drops[i].card, drops[i].index, false);
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
          const opened = BenchBomb.openCard(draft, bag.previousOpenId);
          if (opened.ok) draft = opened.state;
        }
        state = draft;
        save();
        render();
        toast("Bomb taken back.");
        return;
      }
      case "rebomb":
      case "star": {
        forgetUndo(bag.cardId);
        const result = BenchBomb.putCard(state, bag.previous);
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

  function onBomb(event) {
    event.preventDefault();
    hideFormError();
    const previousOpenId = state.openId;
    const result = BenchBomb.bomb(state, readForm(), Date.now());
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
        action: "bomb",
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
      toast("Bombed. The oldest bomb made room.", {
        ms: 8000,
        undo: function () { applyUndo(bag); },
      });
      return;
    }
    toast("Bomb is up.");
  }

  function onRebomb() {
    const card = current();
    if (!card) return;
    const result = BenchBomb.rebomb(state, card.id, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason), { important: true });
      return;
    }
    actionUndo = { action: "rebomb", cardId: result.card.id, previous: result.previous, previousOpenId: "", dropped: [] };
    state = result.state;
    save();
    render();
    toast("New roast. Same energy.");
  }

  function onStar() {
    const card = current();
    if (!card) return;
    const result = BenchBomb.setStarred(state, card.id, !card.starred, Date.now());
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
    const result = BenchBomb.removeCard(state, id);
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
    toast("Removed " + snapshot.energy + " · " + snapshot.sat + ".", {
      ms: 8000,
      undo: function () {
        const restored = BenchBomb.restoreCard(state, snapshot, index, wasOpen);
        if (!restored.ok) {
          toast(reasonMessage(restored.reason), { important: true });
          return;
        }
        state = restored.state;
        save();
        render();
        toast("Put " + snapshot.energy + " back.");
      },
    });
  }

  function clearAll() {
    if (!state.cards.length) return;
    const previous = state.cards.slice();
    const openId = state.openId;
    const cleared = BenchBomb.clearCards(state);
    actionUndo = null;
    state = cleared.state;
    save();
    render();
    toast("Cleared every bomb.", {
      ms: 8000,
      undo: function () {
        if (state.cards.length) {
          toast("A new bomb is already on this phone.", { important: true });
          return;
        }
        state = BenchBomb.restoreAll(state, previous, openId).state;
        save();
        render();
        toast("Bombs restored.");
      },
    });
  }

  function openFromShelf(id) {
    const result = BenchBomb.openCard(state, id);
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
    const result = BenchBomb.loadSample(state);
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
        action: "bomb",
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
      toast("Sample loaded. The oldest bomb made room.", {
        ms: 8000,
        undo: function () { applyUndo(bag); },
      });
      return;
    }
    toast("Sample bomb loaded.");
  }

  function keptNote(result) {
    const dropped = result.dropped.length;
    if (result.added < result.offered) return "Kept " + result.added + " of " + result.offered + ".";
    if (dropped === 1) return "Kept. The oldest bomb made room.";
    if (dropped > 1) return "Kept. Dropped your " + dropped + " oldest unstarred.";
    return "Kept on this phone.";
  }

  function keepIncoming() {
    if (!incoming) return;
    const share = incoming;
    const result = BenchBomb.keepShare(state, share);
    if (!result.ok) {
      if (result.reason === "exists") {
        incoming = null;
        if (result.card) {
          const opened = BenchBomb.openCard(state, result.card.id);
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
        toast("Starred bombs fill this phone. Remove one to keep this.", { ms: 4200, important: true });
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
          const removed = BenchBomb.removeCard(draft, addedIds[i]);
          if (!removed.ok) {
            toast(reasonMessage(removed.reason), { important: true });
            return;
          }
          draft = removed.state;
        }
        const ordered = dropped.slice().sort(function (a, b) { return a.index - b.index; });
        for (let i = 0; i < ordered.length; i += 1) {
          const restored = BenchBomb.restoreCard(draft, ordered[i].card, ordered[i].index, false);
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
      toast("That bomb could not be packed.", { important: true });
      return;
    }
    try {
      const packed = await BenchBomb.compressPayload(JSON.stringify(payload));
      els.shareUrlBox.value = location.origin + location.pathname + HASH_PREFIX + packed;
      switch (kind) {
        case "card":
          els.shareTitle.textContent = "A copy of this bomb.";
          els.shareLead.textContent = "Send this URL. They can keep the same card. Later re-bombs here do not update their copy. Not live sync.";
          break;
        case "shelf":
          els.shareTitle.textContent = "A copy of this shelf.";
          els.shareLead.textContent = "Send this URL. They can keep these bombs. Later re-bombs here do not update their copies. Not live sync.";
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

  function shareShelf() {
    if (!state.cards.length) {
      toast("Bomb something before you copy the shelf.", { important: true });
      return;
    }
    presentShare(BenchBomb.shareShelf(state), "shelf");
  }

  async function copyCardLink() {
    const card = current();
    if (!card) {
      toast(reasonMessage("missing"), { important: true });
      return;
    }
    const payload = BenchBomb.shareCard(card);
    if (!payload) {
      toast("That bomb could not be packed.", { important: true });
      return;
    }
    try {
      const packed = await BenchBomb.compressPayload(JSON.stringify(payload));
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

    els.bombForm.addEventListener("submit", onBomb);
    els.fieldSat.addEventListener("input", hideFormError);
    els.fieldPoints.addEventListener("input", hideFormError);
    els.btnSample.addEventListener("click", loadSample);
    els.btnRebomb.addEventListener("click", onRebomb);
    els.btnStar.addEventListener("click", onStar);
    els.btnUndo.addEventListener("click", undoLast);
    els.btnRemove.addEventListener("click", function () {
      const card = current();
      if (card) removeCurrent(card.id);
    });
    els.btnShare.addEventListener("click", copyCardLink);
    els.btnShareShelf.addEventListener("click", shareShelf);
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
      state = BenchBomb.setFilter(state, btn.getAttribute("data-filter"));
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
