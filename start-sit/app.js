(function () {
  const HASH_PREFIX = "#s=";
  const QUERY_KEY = "s";

  const els = {};
  let storageOk = true;
  let state = StartSit.emptyState();
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
      "storageFail", "spoken", "shareOffer", "offerFace", "btnKeepShare", "btnDismissShare",
      "shelfBar", "btnLatest", "emptyHero", "verdictCard", "stamp", "starPill",
      "laneA", "wordA", "laneNameA", "laneTeamA", "laneNoteA",
      "laneB", "wordB", "laneNameB", "laneTeamB", "laneNoteB",
      "verdictHeading", "reasonLine", "confValue", "meter", "meterFill",
      "actionRow", "btnSwap", "btnRematch", "btnStar", "btnUndo", "btnShare", "btnRemove",
      "fightForm", "fightKicker", "fightHeading",
      "nameA", "teamA", "noteA", "nameB", "teamB", "noteB", "formError", "btnSample",
      "historySub", "historyEmpty", "historyList", "btnClear",
      "toast", "toastText", "toastUndo",
      "shareDialog", "shareUrlBox", "btnCopyShare", "btnCloseShare",
    ].forEach(grab);
  }

  function toast(msg, opts) {
    const options = opts || {};
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
      case "names":
        return "Both players need a name.";
      case "nameA":
        return "Player A needs a name.";
      case "nameB":
        return "Player B needs a name.";
      case "same":
        return "Those are the same name. The booth needs two players.";
      case "cap":
        return "This phone holds 24 verdicts. Remove one to decide another.";
      case "missing":
        return "That verdict is no longer on this phone.";
      case "exists":
        return "That verdict is already on this phone.";
      case "salt":
        return "This card is out of rematches.";
      default: {
        const _never = reason;
        throw new Error("Unknown reason " + _never);
      }
    }
  }

  function takenBackCopy(action) {
    switch (action) {
      case "swap":
        return "Swap taken back.";
      case "rematch":
        return "Rematch taken back.";
      case "star":
        return "Star taken back.";
      case "decide":
        return "Decision taken back.";
      default: {
        const _never = action;
        throw new Error("Unknown undo " + _never);
      }
    }
  }

  function undoWord(action) {
    switch (action) {
      case "decide":
        return "Undo";
      case "swap":
        return "Undo swap";
      case "rematch":
        return "Undo rematch";
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
      const probe = StartSit.STORAGE_KEY + "-probe";
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
    if (!storageOk) return StartSit.emptyState();
    try {
      const raw = localStorage.getItem(StartSit.STORAGE_KEY);
      if (!raw) return StartSit.emptyState();
      return StartSit.normalizeState(JSON.parse(raw));
    } catch (_) {
      return StartSit.emptyState();
    }
  }

  function save() {
    if (!storageOk) return;
    try {
      localStorage.setItem(StartSit.STORAGE_KEY, JSON.stringify(state));
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
  }

  function hideFormError() {
    els.formError.hidden = true;
    els.formError.textContent = "";
    els.nameA.removeAttribute("aria-invalid");
    els.nameB.removeAttribute("aria-invalid");
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
      const json = await StartSit.decompressPayload(token);
      const share = StartSit.parseShare(JSON.parse(json));
      cleanShareUrl();
      if (!share) throw new Error("empty");
      return share;
    } catch (_) {
      cleanShareUrl();
      toast("That snapshot could not be read.", { ms: 3200 });
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
      toast("That snapshot could not be read.", { ms: 3200 });
    });
    return shareChain;
  }

  function paintLane(lane, wordEl, nameEl, teamEl, noteEl, kind, player) {
    lane.classList.toggle("start", kind === "start");
    lane.classList.toggle("sit", kind === "sit");
    wordEl.textContent = kind === "start" ? "Start" : "Sit";
    nameEl.textContent = player.name;
    teamEl.hidden = !player.team;
    teamEl.textContent = player.team || "";
    noteEl.hidden = !player.note;
    noteEl.textContent = player.note || "";
    const bits = [kind === "start" ? "Start" : "Sit", player.name];
    if (player.team) bits.push(player.team);
    if (player.note) bits.push(player.note);
    lane.setAttribute("aria-label", bits.join(", "));
  }

  function announce(card) {
    const key = [
      card.id,
      String(card.salt),
      card.starter,
      card.a.name,
      card.b.name,
      card.reason,
      String(card.confidence),
    ].join("|");
    if (key === spokenKey) return;
    spokenKey = key;
    const start = StartSit.starterPlayer(card);
    const sit = StartSit.sitterPlayer(card);
    els.spoken.textContent = "Start " + start.name + ". Sit " + sit.name + ". " + card.reason
      + " Entertainment confidence " + card.confidence + " percent. Not fantasy advice.";
  }

  function undoReady() {
    const card = current();
    return !!(actionUndo && card && card.id === actionUndo.cardId);
  }

  function paintCard(card) {
    const has = !!card;
    els.emptyHero.hidden = has;
    els.verdictCard.hidden = !has;
    els.actionRow.hidden = !has;
    const latest = state.cards[0];
    els.shelfBar.hidden = !has || !latest || card.id === latest.id;
    if (!has) return;
    const start = StartSit.starterPlayer(card);
    const sit = StartSit.sitterPlayer(card);
    const aKind = card.starter === "a" ? "start" : "sit";
    const bKind = card.starter === "b" ? "start" : "sit";
    paintLane(els.laneA, els.wordA, els.laneNameA, els.laneTeamA, els.laneNoteA, aKind, card.a);
    paintLane(els.laneB, els.wordB, els.laneNameB, els.laneTeamB, els.laneNoteB, bKind, card.b);
    els.verdictHeading.textContent = "Start " + start.name + ". Sit " + sit.name + ".";
    els.reasonLine.textContent = card.reason;
    els.stamp.textContent = card.tag;
    els.starPill.hidden = !card.starred;
    els.confValue.textContent = String(card.confidence);
    els.meterFill.style.width = card.confidence + "%";
    els.meter.setAttribute("aria-valuenow", String(card.confidence));
    els.meter.setAttribute(
      "aria-valuetext",
      "Entertainment confidence " + card.confidence + " percent. Not a projection."
    );
    els.btnStar.textContent = card.starred ? "Starred" : "Star";
    els.btnStar.setAttribute("aria-pressed", card.starred ? "true" : "false");
    els.btnStar.setAttribute("aria-label", card.starred ? "Starred. Remove the star." : "Star this verdict");
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
    els.historySub.textContent = state.cards.length + " of " + StartSit.HISTORY_CAP + " on this phone.";
    els.historyEmpty.hidden = state.cards.length > 0;
    els.historyList.hidden = state.cards.length === 0;
    els.btnClear.hidden = state.cards.length === 0;
    els.historyList.replaceChildren();
    state.cards.forEach(function (card) {
      const start = StartSit.starterPlayer(card);
      const sit = StartSit.sitterPlayer(card);
      const li = document.createElement("li");
      li.className = "history-row";
      const open = document.createElement("button");
      open.type = "button";
      open.className = "history-open";
      open.setAttribute("data-open", card.id);
      if (card.id === state.openId) open.setAttribute("aria-current", "true");
      open.setAttribute("aria-label", "Open verdict, start " + start.name + ", sit " + sit.name);
      const title = document.createElement("span");
      title.className = "history-title";
      title.textContent = (card.starred ? "★ " : "") + "Start " + start.name;
      const score = document.createElement("span");
      score.className = "history-score";
      score.textContent = "Sit " + sit.name + " · " + card.confidence + "% theater";
      const meta = document.createElement("span");
      meta.className = "history-meta";
      const tags = [card.a.team, card.b.team].filter(Boolean).join(" · ");
      meta.textContent = card.tag + (tags ? " · " + tags : "");
      open.append(title, score, meta);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "history-remove";
      remove.setAttribute("data-remove", card.id);
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove verdict, start " + start.name + ", sit " + sit.name);
      li.append(open, remove);
      els.historyList.append(li);
    });
  }

  function paintFightChrome() {
    const has = state.cards.length > 0;
    els.fightKicker.textContent = has ? "Next pair" : "The fight";
    els.fightHeading.textContent = has ? "Another fight" : "Name the fight";
  }

  function render() {
    els.shareOffer.hidden = !incoming;
    if (incoming) els.offerFace.textContent = StartSit.face(incoming.card);
    paintCard(current());
    paintHistory();
    paintFightChrome();
  }

  function scrollCard() {
    if (els.verdictCard.hidden) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    els.verdictCard.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }

  function readFight() {
    return {
      a: { name: els.nameA.value, team: els.teamA.value, note: els.noteA.value },
      b: { name: els.nameB.value, team: els.teamB.value, note: els.noteB.value },
    };
  }

  function writeFight(card) {
    els.nameA.value = card.a.name;
    els.teamA.value = card.a.team;
    els.noteA.value = card.a.note;
    els.nameB.value = card.b.name;
    els.teamB.value = card.b.team;
    els.noteB.value = card.b.note;
  }

  function onDecide(event) {
    event.preventDefault();
    hideFormError();
    const previousOpenId = state.openId;
    const result = StartSit.decide(state, readFight(), Date.now());
    if (!result.ok) {
      showFormError(reasonMessage(result.reason));
      if (result.reason === "nameB" || result.reason === "same") {
        els.nameB.setAttribute("aria-invalid", "true");
        els.nameB.focus();
      } else if (result.reason === "nameA" || result.reason === "names") {
        els.nameA.setAttribute("aria-invalid", "true");
        els.nameA.focus();
      }
      if (result.reason === "names") els.nameB.setAttribute("aria-invalid", "true");
      return;
    }
    state = result.state;
    save();
    writeFight(result.card);
    actionUndo = { action: "decide", cardId: result.card.id, previous: null, previousOpenId: previousOpenId };
    render();
    scrollCard();
    toast("Booth call is up.");
  }

  function onSwap() {
    const card = current();
    if (!card) return;
    const result = StartSit.swapSides(state, card.id, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    actionUndo = { action: "swap", cardId: result.card.id, previous: result.previous, previousOpenId: "" };
    state = result.state;
    save();
    render();
    toast("Sides swapped. Same player still starts.");
  }

  function onRematch() {
    const card = current();
    if (!card) return;
    const result = StartSit.reroll(state, card.id, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    actionUndo = { action: "rematch", cardId: result.card.id, previous: result.previous, previousOpenId: "" };
    state = result.state;
    save();
    render();
    toast("New seeded flavor.");
  }

  function onStar() {
    const card = current();
    if (!card) return;
    const result = StartSit.setStarred(state, card.id, !card.starred, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    actionUndo = { action: "star", cardId: result.card.id, previous: result.previous, previousOpenId: "" };
    state = result.state;
    save();
    render();
    toast(result.card.starred ? "Starred on this phone." : "Star removed.");
  }

  function undoLast() {
    const bag = actionUndo;
    const card = current();
    if (!bag || !card || card.id !== bag.cardId) return;
    actionUndo = null;
    switch (bag.action) {
      case "decide": {
        const result = StartSit.removeCard(state, bag.cardId);
        if (!result.ok) {
          toast(reasonMessage(result.reason));
          return;
        }
        state = result.state;
        if (bag.previousOpenId && state.cards.some(function (row) { return row.id === bag.previousOpenId; })) {
          const opened = StartSit.openCard(state, bag.previousOpenId);
          if (opened.ok) state = opened.state;
        }
        save();
        render();
        toast("Decision taken back.");
        return;
      }
      case "swap":
      case "rematch":
      case "star": {
        const result = StartSit.putCard(state, bag.previous);
        if (!result.ok) {
          toast(reasonMessage(result.reason));
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

  function removeCurrent(id) {
    const result = StartSit.removeCard(state, id);
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    const snapshot = result.removed;
    const index = result.index;
    const wasOpen = result.wasOpen;
    if (actionUndo && actionUndo.cardId === id) actionUndo = null;
    state = result.state;
    save();
    render();
    const start = StartSit.starterPlayer(snapshot);
    toast("Removed " + start.name + ".", {
      ms: 8000,
      undo: function () {
        const restored = StartSit.restoreCard(state, snapshot, index, wasOpen);
        if (!restored.ok) {
          toast(reasonMessage(restored.reason));
          return;
        }
        state = restored.state;
        save();
        render();
        toast("Put " + start.name + " back.");
      },
    });
  }

  function clearAll() {
    if (!state.cards.length) return;
    const previous = state.cards.slice();
    const openId = state.openId;
    const cleared = StartSit.clearCards(state);
    actionUndo = null;
    state = cleared.state;
    save();
    render();
    toast("Cleared every verdict.", {
      ms: 8000,
      undo: function () {
        if (state.cards.length) {
          toast("A new verdict is already on this phone.");
          return;
        }
        state = StartSit.restoreAll(state, previous, openId).state;
        save();
        render();
        toast("Verdicts restored.");
      },
    });
  }

  function openFromShelf(id) {
    const result = StartSit.openCard(state, id);
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    state = result.state;
    save();
    render();
    scrollCard();
  }

  function loadSample() {
    const previousOpenId = state.openId;
    const result = StartSit.loadSample(state);
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    state = result.state;
    save();
    hideFormError();
    if (!result.already) {
      actionUndo = { action: "decide", cardId: result.card.id, previous: null, previousOpenId: previousOpenId };
    }
    render();
    scrollCard();
    toast(result.already ? "Sample is back on the card." : "Sample fight loaded.");
  }

  function keepIncoming() {
    if (!incoming) return;
    const result = StartSit.keepShare(state, incoming);
    const kept = incoming.card;
    incoming = null;
    if (!result.ok) {
      if (result.reason === "exists") {
        const opened = StartSit.openCard(state, kept.id);
        if (opened.ok) state = opened.state;
        save();
        render();
        toast("Already on this phone.");
        return;
      }
      render();
      toast(reasonMessage(result.reason));
      return;
    }
    const dropped = result.dropped;
    const droppedIndex = result.droppedIndex;
    state = result.state;
    save();
    render();
    scrollCard();
    toast(dropped ? "Kept. The oldest verdict made room." : "Kept on this phone.", dropped ? {
      ms: 8000,
      undo: function () {
        const removed = StartSit.removeCard(state, kept.id);
        if (!removed.ok) {
          toast(reasonMessage(removed.reason));
          return;
        }
        state = removed.state;
        const restored = StartSit.restoreCard(state, dropped, droppedIndex, false);
        if (!restored.ok) {
          save();
          render();
          toast(reasonMessage(restored.reason));
          return;
        }
        state = restored.state;
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

  async function presentShare(card) {
    const payload = StartSit.shareCard(card);
    if (!payload) {
      toast("That verdict could not be packed.");
      return;
    }
    try {
      const packed = await StartSit.compressPayload(JSON.stringify(payload));
      els.shareUrlBox.value = location.origin + location.pathname + HASH_PREFIX + packed;
      if (!els.shareDialog.open) els.shareDialog.showModal();
    } catch (_) {
      toast("That snapshot could not be packed.");
    }
  }

  function wire() {
    if (wired) return;
    wired = true;

    els.fightForm.addEventListener("submit", onDecide);
    els.nameA.addEventListener("input", hideFormError);
    els.nameB.addEventListener("input", hideFormError);
    els.btnSample.addEventListener("click", loadSample);
    els.btnSwap.addEventListener("click", onSwap);
    els.btnRematch.addEventListener("click", onRematch);
    els.btnStar.addEventListener("click", onStar);
    els.btnUndo.addEventListener("click", undoLast);
    els.btnRemove.addEventListener("click", function () {
      const card = current();
      if (card) removeCurrent(card.id);
    });
    els.btnShare.addEventListener("click", function () {
      const card = current();
      if (card) presentShare(card);
    });
    els.btnClear.addEventListener("click", clearAll);
    els.btnLatest.addEventListener("click", function () {
      const latest = state.cards[0];
      if (latest) openFromShelf(latest.id);
    });
    els.btnKeepShare.addEventListener("click", keepIncoming);
    els.btnDismissShare.addEventListener("click", dismissShare);
    els.btnCopyShare.addEventListener("click", async function () {
      const ok = await copyText(els.shareUrlBox.value);
      toast(ok ? "Link copied." : "Select the link and copy it.");
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
