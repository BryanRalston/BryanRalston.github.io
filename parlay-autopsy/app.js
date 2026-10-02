(function () {
  "use strict";

  const HASH_PREFIX = "#a=";
  const QUERY_KEY = "a";

  const els = {};
  let storageOk = true;
  let state = ParlayAutopsy.emptyState();
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
      "shelfBar", "btnLatest", "emptyHero", "autopsyCard", "stamp", "starPill",
      "autopsyHeading", "autopsyWord", "causeMark", "slipCount",
      "roastLine", "corpseValue", "meter", "meterFill",
      "legList", "leagueNote",
      "actionRow", "btnReautopsy", "btnStar", "btnUndo", "btnShare", "btnRemove",
      "slipForm", "slipKicker", "slipHeading", "fieldNote", "formError", "btnAutopsy", "btnSample", "btnAddLeg",
      "historySub", "filters", "historyEmpty", "filterEmpty", "historyList", "btnClear", "btnShareShelf",
      "toast", "toastText", "toastExtra", "toastUndo",
      "shareDialog", "shareTitle", "shareLead", "shareUrlBox", "btnCopyShare", "btnCloseShare",
    ].forEach(grab);
  }

  function legRows() {
    return Array.from(document.querySelectorAll("#legEditor .leg-row"));
  }

  function visibleLegCount() {
    return legRows().filter(function (row) { return !row.hidden; }).length;
  }

  function readRow(row) {
    return {
      name: row.querySelector(".leg-name").value,
      odds: row.querySelector(".leg-odds").value,
      killer: row.querySelector(".leg-kill").checked,
    };
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
        return state.cards.length < ParlayAutopsy.HISTORY_CAP && !state.cards.some(function (card) {
          return card.id === toastUndoMeta.cardId;
        });
      case "room":
        return state.cards.some(function (card) { return card.id === toastUndoMeta.cardId; });
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
        return "Name the legs on the dead slip.";
      case "few":
        return "Name at least two legs. A parlay needs a pile.";
      case "name":
        return "Name that leg, or clear the odds and the kill mark.";
      case "odds":
        return "American odds look like -110 or +180. Leave the box empty for a name only.";
      case "killer":
        return "Mark the leg that killed it.";
      case "many":
        return "Six legs is the slab limit.";
      case "cap":
        return "This phone holds 24 autopsies. Starred slips stay. Remove one to cut another.";
      case "missing":
        return "That autopsy is no longer on this phone.";
      case "exists":
        return "Already on this phone.";
      case "salt":
        return "This card is out of re-autopsies.";
      default: {
        const _never = reason;
        throw new Error("Unknown reason " + _never);
      }
    }
  }

  function takenBackCopy(action) {
    switch (action) {
      case "reautopsy":
        return "Re-autopsy taken back.";
      case "star":
        return "Star taken back.";
      case "autopsy":
        return "Autopsy taken back.";
      default: {
        const _never = action;
        throw new Error("Unknown undo " + _never);
      }
    }
  }

  function undoWord(action) {
    switch (action) {
      case "autopsy":
        return "Undo";
      case "reautopsy":
        return "Undo re-autopsy";
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
      const probe = ParlayAutopsy.STORAGE_KEY + "-probe";
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
    if (!storageOk) return ParlayAutopsy.emptyState();
    let raw = null;
    try {
      raw = localStorage.getItem(ParlayAutopsy.STORAGE_KEY);
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
      return ParlayAutopsy.emptyState();
    }
    const parsed = ParlayAutopsy.readStored(raw);
    if (!parsed.corrupt) return parsed.state || ParlayAutopsy.emptyState();
    try {
      localStorage.setItem(ParlayAutopsy.STORAGE_BACKUP_KEY, parsed.backup);
      localStorage.setItem(ParlayAutopsy.STORAGE_KEY, JSON.stringify(parsed.state));
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
      localStorage.setItem(ParlayAutopsy.STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
    }
  }

  function current() {
    return state.cards.find(function (card) { return card.id === state.openId; }) || null;
  }

  function visibleRows() {
    return legRows().filter(function (row) { return !row.hidden; });
  }

  function showFormError(msg, reason, index) {
    els.formError.textContent = msg;
    els.formError.hidden = false;
    const rows = visibleRows();
    const row = rows[index] || rows[0];
    if (!row) return;
    let field = null;
    switch (reason) {
      case "odds":
        field = row.querySelector(".leg-odds");
        break;
      case "killer":
        field = row.querySelector(".leg-kill");
        break;
      case "blank":
      case "few":
      case "name":
      case "many":
        field = row.querySelector(".leg-name");
        break;
      default: {
        const _never = reason;
        throw new Error("Unknown form reason " + _never);
      }
    }
    if (field) {
      field.setAttribute("aria-invalid", "true");
      field.focus();
    }
  }

  function hideFormError() {
    els.formError.hidden = true;
    els.formError.textContent = "";
    els.slipForm.querySelectorAll("[aria-invalid]").forEach(function (field) {
      field.removeAttribute("aria-invalid");
    });
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
      const json = await ParlayAutopsy.decompressPayload(token);
      const share = ParlayAutopsy.parseShare(JSON.parse(json));
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
        return ParlayAutopsy.face(share.cards[0]);
      case "shelf":
        return share.cards.length + " autopsies · " + ParlayAutopsy.face(share.cards[0]);
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
    const preview = ParlayAutopsy.previewKeep(state, share);
    let lead;
    if (!preview.fresh) {
      lead = "Already on this phone.";
    } else if (!preview.adds) {
      lead = "Starred autopsies fill this phone. Remove one to keep this.";
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

  function killerLabel(card) {
    const names = [];
    card.legs.forEach(function (leg) {
      if (leg.killer) names.push(leg.name);
    });
    if (!names.length) return card.cause;
    if (names.length === 1) return names[0];
    return names[0] + " +" + (names.length - 1);
  }

  function announce(card) {
    const key = [
      card.id,
      String(card.salt),
      card.cause,
      killerLabel(card),
      card.roast,
      String(card.meter),
    ].join("|");
    if (key === spokenKey) return;
    spokenKey = key;
    els.spoken.textContent = "Autopsy " + card.cause + ". Killer " + killerLabel(card) + ". "
      + card.roast + " Corpse meter " + card.meter + " percent. Not betting advice.";
  }

  function undoReady() {
    const card = current();
    return !!(actionUndo && card && card.id === actionUndo.cardId);
  }

  function paintLegs(card) {
    els.legList.replaceChildren();
    let dead = 0;
    card.legs.forEach(function (leg) {
      if (leg.killer) dead += 1;
      const li = document.createElement("li");
      li.className = "leg-line " + (leg.killer ? "dead" : "live");
      const flag = document.createElement("span");
      flag.className = "leg-flag";
      flag.textContent = leg.killer ? "Dead" : "Cashed";
      const name = document.createElement("span");
      name.className = "leg-line-name";
      name.textContent = leg.name;
      const odds = document.createElement("span");
      odds.className = "leg-line-odds";
      odds.textContent = leg.odds || "";
      if (!leg.odds) odds.hidden = true;
      li.append(flag, name, odds);
      els.legList.append(li);
    });
    els.slipCount.textContent = card.legs.length + " legs · " + dead + (dead === 1 ? " killer" : " killers");
  }

  function paintCard(card) {
    const has = !!card;
    els.emptyHero.hidden = has;
    els.autopsyCard.hidden = !has;
    els.actionRow.hidden = !has;
    const latest = state.cards[0];
    els.shelfBar.hidden = !has || !latest || card.id === latest.id;
    if (!has) return;
    const band = ParlayAutopsy.bandFor(card.cause);
    els.autopsyWord.setAttribute("data-band", band);
    els.causeMark.textContent = card.cause;
    els.causeMark.setAttribute("data-band", band);
    els.autopsyHeading.textContent = "Autopsy " + card.cause + ". Killer " + killerLabel(card) + ".";
    els.roastLine.textContent = card.roast;
    els.stamp.textContent = card.tag;
    els.starPill.hidden = !card.starred;
    els.corpseValue.textContent = String(card.meter);
    els.meterFill.style.width = card.meter + "%";
    els.meter.setAttribute("aria-valuenow", String(card.meter));
    els.meter.setAttribute(
      "aria-valuetext",
      "Corpse meter " + card.meter + " percent. Entertainment only. Not a probability. Not betting advice."
    );
    paintLegs(card);
    els.leagueNote.hidden = !card.note;
    els.leagueNote.textContent = card.note || "";
    els.btnStar.textContent = card.starred ? "Starred" : "Star";
    els.btnStar.setAttribute("aria-pressed", card.starred ? "true" : "false");
    els.btnStar.setAttribute("aria-label", card.starred ? "Starred. Remove the star." : "Star this autopsy");
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
    const visible = ParlayAutopsy.visibleCards(state);
    const total = state.cards.length;
    if (state.filter === "starred") {
      els.historySub.textContent = visible.length + " starred · " + total + " of " + ParlayAutopsy.HISTORY_CAP + " on this phone.";
    } else {
      els.historySub.textContent = total + " of " + ParlayAutopsy.HISTORY_CAP + " on this phone.";
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
      open.setAttribute("aria-label", "Open autopsy " + card.cause + ", " + killerLabel(card));
      const energy = document.createElement("span");
      energy.className = "history-energy";
      energy.setAttribute("data-band", ParlayAutopsy.bandFor(card.cause));
      energy.textContent = card.cause;
      const title = document.createElement("span");
      title.className = "history-title";
      title.textContent = (card.starred ? "★ " : "") + killerLabel(card);
      const score = document.createElement("span");
      score.className = "history-score";
      score.textContent = card.tag + " · " + card.meter + "% corpse";
      const meta = document.createElement("span");
      meta.className = "history-meta";
      meta.textContent = card.roast;
      open.append(energy, title, score, meta);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "history-remove";
      remove.setAttribute("data-remove", card.id);
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove autopsy " + card.cause + ", " + killerLabel(card));
      li.append(open, remove);
      els.historyList.append(li);
    });
  }

  function paintSlipChrome() {
    const has = state.cards.length > 0;
    els.slipKicker.textContent = has ? "Next autopsy" : "The slip";
    els.slipHeading.textContent = has ? "Cut another" : "Name the legs";
  }

  function render() {
    els.shareOffer.hidden = !incoming;
    if (incoming) {
      const preview = ParlayAutopsy.previewKeep(state, incoming);
      els.btnKeepShare.textContent = preview.fresh ? "Keep on this phone" : "Already on this phone";
      els.offerFace.textContent = offerLine(incoming);
      els.offerHint.textContent = offerHint(incoming);
    }
    paintCard(current());
    paintHistory();
    paintSlipChrome();
  }

  function scrollCard() {
    if (els.autopsyCard.hidden) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    els.autopsyCard.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }

  function readForm() {
    const legs = [];
    legRows().forEach(function (row) {
      if (row.hidden) return;
      legs.push(readRow(row));
    });
    return { legs: legs, note: els.fieldNote.value };
  }

  function setLegCount(count, legs) {
    const rows = legRows();
    const n = Math.max(2, Math.min(ParlayAutopsy.LEG_MAX, count));
    rows.forEach(function (row, i) {
      const name = row.querySelector(".leg-name");
      const odds = row.querySelector(".leg-odds");
      const kill = row.querySelector(".leg-kill");
      const leg = legs && legs[i] ? legs[i] : null;
      if (i < n) {
        row.hidden = false;
        if (legs) {
          name.value = leg ? leg.name : "";
          odds.value = leg ? leg.odds : "";
          kill.checked = !!(leg && leg.killer);
        }
      } else {
        row.hidden = true;
        name.value = "";
        odds.value = "";
        kill.checked = false;
      }
      row.querySelector(".leg-index").textContent = "Leg " + (i + 1);
      row.querySelector(".leg-remove").hidden = n <= 2;
    });
    els.btnAddLeg.disabled = n >= ParlayAutopsy.LEG_MAX;
  }

  function writeForm(card) {
    setLegCount(card.legs.length, card.legs);
    els.fieldNote.value = card.note || "";
  }

  function forgetUndo(cardId) {
    if (actionUndo && actionUndo.cardId === cardId) actionUndo = null;
  }

  function applyUndo(bag) {
    if (!bag) return;
    switch (bag.action) {
      case "autopsy": {
        forgetUndo(bag.cardId);
        let draft = state;
        if (draft.cards.some(function (card) { return card.id === bag.cardId; })) {
          const removed = ParlayAutopsy.removeCard(draft, bag.cardId);
          if (!removed.ok) {
            toast(reasonMessage(removed.reason), { important: true });
            return;
          }
          draft = removed.state;
        }
        const drops = (bag.dropped || []).slice().sort(function (a, b) { return a.index - b.index; });
        for (let i = 0; i < drops.length; i += 1) {
          if (draft.cards.some(function (card) { return card.id === drops[i].card.id; })) continue;
          const restored = ParlayAutopsy.restoreCard(draft, drops[i].card, drops[i].index, false);
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
          const opened = ParlayAutopsy.openCard(draft, bag.previousOpenId);
          if (opened.ok) draft = opened.state;
        }
        state = draft;
        save();
        render();
        toast("Autopsy taken back.");
        return;
      }
      case "reautopsy":
      case "star": {
        forgetUndo(bag.cardId);
        const result = ParlayAutopsy.putCard(state, bag.previous);
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
      case "few":
      case "name":
      case "odds":
      case "killer":
        return true;
      case "many":
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

  function onAutopsy(event) {
    event.preventDefault();
    hideFormError();
    const previousOpenId = state.openId;
    const result = ParlayAutopsy.autopsy(state, readForm(), Date.now());
    if (!result.ok) {
      const msg = reasonMessage(result.reason);
      if (formReason(result.reason)) {
        showFormError(msg, result.reason, result.index || 0);
        if (!toastBag) toast(msg, { important: true });
        return;
      }
      toast(msg, { ms: result.reason === "cap" ? 4200 : 2600, important: true });
      return;
    }
    state = result.state;
    save();
    writeForm(result.card);
    const dropped = result.dropped || [];
    if (!result.already) {
      actionUndo = {
        action: "autopsy",
        cardId: result.card.id,
        previous: null,
        previousOpenId: previousOpenId,
        dropped: dropped,
      };
    }
    render();
    scrollCard();
    if (result.already) {
      toast("Already on the slab.");
      return;
    }
    if (dropped.length) {
      const bag = actionUndo;
      toast("Cut. The oldest autopsy made room.", {
        ms: 8000,
        meta: { kind: "room", cardId: result.card.id },
        undo: function () { applyUndo(bag); },
      });
      return;
    }
    toast("Autopsy is up.");
  }

  function onReautopsy() {
    const card = current();
    if (!card) return;
    const result = ParlayAutopsy.reautopsy(state, card.id, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason), { important: true });
      return;
    }
    actionUndo = { action: "reautopsy", cardId: result.card.id, previous: result.previous, previousOpenId: "", dropped: [] };
    state = result.state;
    save();
    render();
    toast("New roast. Same stamp.");
  }

  function onStar() {
    const card = current();
    if (!card) return;
    const result = ParlayAutopsy.setStarred(state, card.id, !card.starred, Date.now());
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
    const result = ParlayAutopsy.removeCard(state, id);
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
    toast("Removed " + snapshot.cause + " · " + killerLabel(snapshot) + ".", {
      ms: 8000,
      meta: { kind: "remove", cardId: snapshot.id },
      undo: function () {
        const restored = ParlayAutopsy.restoreCard(state, snapshot, index, wasOpen);
        if (!restored.ok) {
          toast(reasonMessage(restored.reason), { important: true });
          return;
        }
        state = restored.state;
        save();
        render();
        toast("Put " + snapshot.cause + " back.");
      },
    });
  }

  function clearAll() {
    if (!state.cards.length) return;
    const previous = state.cards.slice();
    const openId = state.openId;
    const cleared = ParlayAutopsy.clearCards(state);
    actionUndo = null;
    state = cleared.state;
    save();
    render();
    toast("Cleared every autopsy.", {
      ms: 8000,
      meta: { kind: "clear" },
      undo: function () {
        if (state.cards.length) {
          toast("A new autopsy is already on this phone.", { important: true });
          return;
        }
        state = ParlayAutopsy.restoreAll(state, previous, openId).state;
        save();
        render();
        toast("Autopsies restored.");
      },
    });
  }

  function openFromShelf(id) {
    const result = ParlayAutopsy.openCard(state, id);
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
    const result = ParlayAutopsy.loadSample(state);
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
        action: "autopsy",
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
      toast("Sample loaded. The oldest autopsy made room.", {
        ms: 8000,
        meta: { kind: "room", cardId: result.card.id },
        undo: function () { applyUndo(bag); },
      });
      return;
    }
    toast("Sample autopsy loaded.");
  }

  function keptNote(result) {
    const dropped = result.dropped.length;
    if (result.added < result.offered) return "Kept " + result.added + " of " + result.offered + ".";
    if (dropped === 1) return "Kept. The oldest autopsy made room.";
    if (dropped > 1) return "Kept. Dropped your " + dropped + " oldest unstarred.";
    return "Kept on this phone.";
  }

  function keepIncoming() {
    if (!incoming) return;
    const share = incoming;
    const result = ParlayAutopsy.keepShare(state, share);
    if (!result.ok) {
      if (result.reason === "exists") {
        incoming = null;
        if (result.card) {
          const opened = ParlayAutopsy.openCard(state, result.card.id);
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
        toast("Starred autopsies fill this phone. Remove one to keep this.", { ms: 4200, important: true });
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
          const removed = ParlayAutopsy.removeCard(draft, addedIds[i]);
          if (!removed.ok) {
            toast(reasonMessage(removed.reason), { important: true });
            return;
          }
          draft = removed.state;
        }
        const ordered = dropped.slice().sort(function (a, b) { return a.index - b.index; });
        for (let i = 0; i < ordered.length; i += 1) {
          const restored = ParlayAutopsy.restoreCard(draft, ordered[i].card, ordered[i].index, false);
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
      toast("That autopsy could not be packed.", { important: true });
      return;
    }
    try {
      const packed = await ParlayAutopsy.compressPayload(JSON.stringify(payload));
      els.shareUrlBox.value = location.origin + location.pathname + HASH_PREFIX + packed;
      switch (kind) {
        case "card":
          els.shareTitle.textContent = "A copy of this autopsy.";
          els.shareLead.textContent = "Send this URL. They can keep the same card. Later re-autopsies here do not update their copy. Not live sync.";
          break;
        case "shelf":
          els.shareTitle.textContent = "A copy of this shelf.";
          els.shareLead.textContent = "Send this URL. They can keep these autopsies. Later re-autopsies here do not update their copies. Not live sync.";
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
      toast("Cut an autopsy before you copy the shelf.", { important: true });
      return;
    }
    const payload = ParlayAutopsy.shareShelf(state);
    if (!payload) {
      toast("That autopsy could not be packed.", { important: true });
      return;
    }
    try {
      const packed = await ParlayAutopsy.compressPayload(JSON.stringify(payload));
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
    const payload = ParlayAutopsy.shareCard(card);
    if (!payload) {
      toast("That autopsy could not be packed.", { important: true });
      return;
    }
    try {
      const packed = await ParlayAutopsy.compressPayload(JSON.stringify(payload));
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

  function addLeg() {
    const n = visibleLegCount();
    if (n >= ParlayAutopsy.LEG_MAX) {
      toast("Six legs is the slab limit.");
      return;
    }
    setLegCount(n + 1);
    const row = legRows()[n];
    if (row) row.querySelector(".leg-name").focus();
  }

  function removeLegAt(domIndex) {
    const rows = legRows();
    const values = [];
    rows.forEach(function (row, i) {
      if (row.hidden || i === domIndex) return;
      values.push(readRow(row));
    });
    if (values.length < ParlayAutopsy.LEG_MIN) return;
    setLegCount(values.length, values);
  }

  function wire() {
    if (wired) return;
    wired = true;

    els.slipForm.addEventListener("submit", onAutopsy);
    els.slipForm.addEventListener("input", hideFormError);
    els.slipForm.addEventListener("change", hideFormError);
    els.btnSample.addEventListener("click", loadSample);
    els.btnAddLeg.addEventListener("click", addLeg);
    els.btnReautopsy.addEventListener("click", onReautopsy);
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
    document.getElementById("legEditor").addEventListener("click", function (event) {
      const button = event.target.closest(".leg-remove");
      if (!button) return;
      const row = button.closest(".leg-row");
      if (!row) return;
      removeLegAt(Number(row.getAttribute("data-leg")));
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
      state = ParlayAutopsy.setFilter(state, btn.getAttribute("data-filter"));
      save();
      render();
    });
  }

  function boot() {
    cacheEls();
    state = load();
    setLegCount(2);
    wire();
    render();
    window.addEventListener("hashchange", function () {
      scheduleShareImport();
    });
    scheduleShareImport();
  }

  boot();
})();
