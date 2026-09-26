(function () {
  const HASH_PREFIX = "#r=";
  const QUERY_KEY = "r";

  const els = {};
  let storageOk = true;
  let state = Rematch.emptyState();
  let incoming = null;
  let view = "board";
  let archiveId = "";
  let showStart = false;
  let draftBest = 5;
  let customBest = false;
  let undoBag = null;
  let lastLogAt = 0;
  let wired = false;

  function grab(id) {
    els[id] = document.getElementById(id);
  }

  function cacheEls() {
    [
      "storageFail", "shareOffer", "offerFace", "fieldYou", "fieldRival", "nameRow",
      "archiveBar", "btnArchiveBack", "board", "boardKicker", "stamp", "boardTitle",
      "sideYou", "sideRival", "scoreYou", "scoreRival", "nameYouBoard", "nameRivalBoard",
      "statusLine", "detailLine", "stakesLine", "stakesText", "pips", "spoken",
      "logPanel", "fieldNote", "btnYou", "btnRival", "youWinName", "rivalWinName",
      "tapeWrap", "tape", "actionRow", "btnShare", "btnUndoGame", "btnNewSeries",
      "btnContinue", "btnRemove", "startPanel", "startKicker", "startHeading",
      "seriesForm", "fieldTitle", "presetChips", "customBest", "fieldBest", "fieldStakes",
      "formError", "btnCancelStart", "btnSample", "historyPanel", "historySub",
      "historyEmpty", "historyEmptyTitle", "historyList", "btnClear", "toast", "toastText",
      "toastUndo", "shareDialog", "shareTitle", "shareLead", "shareUrlBox", "btnCopyShare",
      "btnCloseShare", "btnKeepShare", "btnDismissShare",
    ].forEach(grab);
  }

  function toast(msg, opts) {
    const options = opts || {};
    els.toastText.textContent = msg;
    if (options.undo) {
      undoBag = options.undo;
      els.toastUndo.hidden = false;
    } else {
      undoBag = null;
      els.toastUndo.hidden = true;
    }
    els.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      els.toast.classList.remove("show");
      undoBag = null;
      els.toastUndo.hidden = true;
    }, options.ms || 2600);
  }

  function reasonMessage(reason) {
    switch (reason) {
      case "title":
        return "A series needs a game.";
      case "bestOf":
        return "Best of has to be an odd number from 1 to 21 so someone can clinch.";
      case "cap":
        return "This phone holds 24 series. Remove one to start another.";
      case "winner":
        return "Log it as you or them.";
      case "missing":
        return "That series is no longer on this phone.";
      case "clinched":
        return "That series is already clinched.";
      case "empty":
        return "No game to take back.";
      case "exists":
        return "That series is already on this phone.";
      default: {
        const _never = reason;
        throw new Error("Unknown reason " + _never);
      }
    }
  }

  function probeStorage() {
    try {
      const probe = Rematch.STORAGE_KEY + "-probe";
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
    if (!storageOk) return Rematch.emptyState();
    try {
      const raw = localStorage.getItem(Rematch.STORAGE_KEY);
      if (!raw) return Rematch.emptyState();
      return Rematch.normalizeState(JSON.parse(raw));
    } catch (_) {
      return Rematch.emptyState();
    }
  }

  function save() {
    if (!storageOk) return;
    try {
      localStorage.setItem(Rematch.STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
    }
  }

  function seriesById(id) {
    return state.series.find(function (series) { return series.id === id; }) || null;
  }

  function activeSeries() {
    return seriesById(state.activeId);
  }

  function glassSeries() {
    if (view === "archive") return seriesById(archiveId);
    return activeSeries();
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
    if (hash.startsWith(HASH_PREFIX)) {
      token = decodeURIComponent(hash.slice(HASH_PREFIX.length));
    } else {
      token = new URLSearchParams(location.search).get(QUERY_KEY) || "";
    }
    if (!token) return null;
    try {
      const json = await Rematch.decompressPayload(token);
      const share = Rematch.parseShare(JSON.parse(json));
      cleanShareUrl();
      if (!share) throw new Error("empty");
      return share;
    } catch (_) {
      cleanShareUrl();
      toast("That snapshot could not be read.", { ms: 3200 });
      return null;
    }
  }

  function showFormError(msg) {
    els.formError.textContent = msg;
    els.formError.hidden = false;
  }

  function hideFormError() {
    els.formError.hidden = true;
    els.formError.textContent = "";
  }

  function face(series) {
    const sum = Rematch.summary(series);
    const stakes = series.stakes ? " · " + series.stakes : "";
    return series.title + " · " + series.you + " " + sum.you + "–" + sum.rival + " " + series.rival
      + " · " + sum.headline + " · Best of " + series.bestOf + stakes;
  }

  function bandOf(sum) {
    switch (sum.status) {
      case "you":
        return "you";
      case "rival":
        return "rival";
      case "tied":
        return "tied";
      case "active":
        if (sum.played === 0) return "open";
        return sum.you > sum.rival ? "you" : "rival";
      default: {
        const _never = sum.status;
        throw new Error("Unknown status " + _never);
      }
    }
  }

  function stampFor(band, clinched) {
    if (clinched) return "Clinched";
    switch (band) {
      case "open":
        return "Open";
      case "tied":
        return "Tied";
      case "you":
      case "rival":
        return "Lead";
      default: {
        const _never = band;
        throw new Error("Unknown band " + _never);
      }
    }
  }

  function paintNames() {
    const onGlass = activeSeries();
    if (document.activeElement !== els.fieldYou) {
      els.fieldYou.value = onGlass ? onGlass.you : state.you;
    }
    if (document.activeElement !== els.fieldRival) {
      els.fieldRival.value = onGlass ? onGlass.rival : state.rival;
    }
    els.youWinName.textContent = state.you;
    els.rivalWinName.textContent = state.rival;
    els.btnYou.setAttribute("aria-label", "You won, " + state.you);
    els.btnRival.setAttribute("aria-label", "They won, " + state.rival);
  }

  function paintSide(side, name, score) {
    side.setAttribute("aria-label", name + ", " + score);
  }

  function paintPips(series, sum) {
    els.pips.replaceChildren();
    if (!series) {
      els.pips.hidden = true;
      return;
    }
    const slots = sum.clinched ? series.games.length : series.bestOf;
    if (!slots) {
      els.pips.hidden = true;
      return;
    }
    els.pips.hidden = false;
    for (let i = 0; i < slots; i += 1) {
      const li = document.createElement("li");
      const game = series.games[i];
      li.className = "pip" + (game ? " " + game.winner : "");
      els.pips.appendChild(li);
    }
  }

  function paintBoard(series, announce) {
    if (!series) {
      els.board.dataset.band = "idle";
      els.board.dataset.clinch = "no";
      els.boardKicker.textContent = "The glass";
      els.stamp.textContent = "Standby";
      els.boardTitle.textContent = "No series yet";
      els.scoreYou.textContent = "0";
      els.scoreRival.textContent = "0";
      els.nameYouBoard.hidden = state.you === "You";
      els.nameRivalBoard.hidden = state.rival === "Rival";
      els.nameYouBoard.textContent = state.you;
      els.nameRivalBoard.textContent = state.rival;
      els.statusLine.textContent = "Waiting on a series.";
      els.detailLine.textContent = "Name yourselves. Pick a game. Log who won.";
      els.stakesLine.hidden = true;
      els.stakesText.textContent = "";
      paintSide(els.sideYou, state.you, 0);
      paintSide(els.sideRival, state.rival, 0);
      paintPips(null, null);
      const idleSpoken = "No series on the glass. " + state.you + " and " + state.rival + ".";
      if (announce !== false && els.spoken.textContent !== idleSpoken) els.spoken.textContent = idleSpoken;
      return;
    }
    const sum = Rematch.summary(series);
    const band = bandOf(sum);
    els.board.dataset.band = band;
    els.board.dataset.clinch = sum.clinched ? "yes" : "no";
    els.boardKicker.textContent = "Best of " + series.bestOf;
    els.stamp.textContent = stampFor(band, sum.clinched);
    els.boardTitle.textContent = series.title;
    els.scoreYou.textContent = String(sum.you);
    els.scoreRival.textContent = String(sum.rival);
    els.nameYouBoard.hidden = series.you === "You";
    els.nameRivalBoard.hidden = series.rival === "Rival";
    els.nameYouBoard.textContent = series.you;
    els.nameRivalBoard.textContent = series.rival;
    els.statusLine.textContent = sum.headline;
    els.detailLine.textContent = sum.detail;
    els.stakesText.textContent = series.stakes;
    els.stakesLine.hidden = !series.stakes;
    paintSide(els.sideYou, series.you, sum.you);
    paintSide(els.sideRival, series.rival, sum.rival);
    paintPips(series, sum);
    const spoken = series.title + ". " + series.you + " " + sum.you + ", " + series.rival + " " + sum.rival
      + ". " + sum.headline + ". " + sum.detail
      + (series.stakes ? ". Stakes: " + series.stakes : "") + ".";
    if (announce !== false && els.spoken.textContent !== spoken) els.spoken.textContent = spoken;
  }

  function paintTape(series) {
    els.tape.replaceChildren();
    if (!series || !series.games.length) {
      els.tapeWrap.hidden = true;
      return;
    }
    els.tapeWrap.hidden = false;
    series.games.forEach(function (game, index) {
      const li = document.createElement("li");
      const idx = document.createElement("span");
      idx.className = "tape-index";
      idx.textContent = "Game " + (index + 1);
      const who = document.createElement("span");
      who.className = "tape-who " + game.winner;
      who.textContent = game.winner === "you" ? series.you : series.rival;
      li.appendChild(idx);
      li.appendChild(who);
      if (game.note) {
        const note = document.createElement("span");
        note.className = "tape-note";
        note.textContent = game.note;
        li.appendChild(note);
      }
      els.tape.appendChild(li);
    });
  }

  function paintHistory() {
    const past = state.series.filter(function (series) { return series.id !== state.activeId; });
    els.historySub.textContent = state.series.length + " of " + Rematch.SERIES_CAP + " on this phone.";
    els.historyList.replaceChildren();
    els.btnClear.hidden = state.series.length === 0;
    if (!past.length) {
      els.historyList.hidden = true;
      els.historyEmpty.hidden = false;
      els.historyEmptyTitle.textContent = state.series.length
        ? "This is the only series on this phone."
        : "Past series land here.";
      return;
    }
    els.historyEmpty.hidden = true;
    els.historyList.hidden = false;
    past.forEach(function (series) {
      const sum = Rematch.summary(series);
      const li = document.createElement("li");
      li.className = "history-row";
      const open = document.createElement("button");
      open.type = "button";
      open.className = "history-open";
      open.dataset.open = series.id;
      const title = document.createElement("span");
      title.className = "history-title";
      title.textContent = series.title;
      const score = document.createElement("span");
      score.className = "history-score";
      score.textContent = series.you + " " + sum.you + "–" + sum.rival + " " + series.rival;
      const meta = document.createElement("span");
      meta.className = "history-meta";
      meta.textContent = sum.headline + (series.stakes ? " · " + series.stakes : "");
      open.appendChild(title);
      open.appendChild(score);
      open.appendChild(meta);
      open.setAttribute("aria-label", "Open " + series.title + ", " + score.textContent);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "history-remove";
      remove.dataset.remove = series.id;
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + series.title);
      li.appendChild(open);
      li.appendChild(remove);
      els.historyList.appendChild(li);
    });
  }

  function paintPresets() {
    Array.prototype.forEach.call(els.presetChips.querySelectorAll("button"), function (btn) {
      const value = btn.dataset.best;
      const pressed = customBest ? value === "custom" : value === String(draftBest);
      btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    });
    els.customBest.hidden = !customBest;
    els.fieldBest.disabled = !customBest;
    if (!customBest) els.fieldBest.value = "";
  }

  function applyView(name) {
    switch (name) {
      case "board":
      case "archive":
        document.body.dataset.view = name;
        return;
      default: {
        const _never = name;
        throw new Error("Unknown view " + _never);
      }
    }
  }

  function render() {
    if (view === "archive" && !seriesById(archiveId)) {
      view = "board";
      archiveId = "";
    }
    applyView(view);
    const glass = glassSeries();
    const active = activeSeries();
    const sum = glass ? Rematch.summary(glass) : null;
    const onBoard = view === "board";

    els.shareOffer.hidden = !incoming;
    if (incoming) els.offerFace.textContent = face(incoming.series);

    els.nameRow.hidden = !onBoard;
    els.archiveBar.hidden = onBoard;
    els.historyPanel.hidden = !onBoard;
    paintNames();
    paintBoard(glass);
    paintTape(glass);

    const logging = onBoard && active && sum && !sum.clinched;
    els.logPanel.hidden = !logging;
    els.actionRow.hidden = !glass;
    els.btnUndoGame.hidden = !(onBoard && active && active.games.length);
    const openSeries = onBoard && active && sum && !sum.clinched;
    const clinchedSeries = onBoard && active && sum && sum.clinched;
    els.btnNewSeries.hidden = !(openSeries || clinchedSeries);
    els.btnNewSeries.textContent = openSeries ? "Shelve and start new" : "New series";
    els.btnContinue.hidden = !(view === "archive" && sum && !sum.clinched);
    els.btnShare.hidden = !glass;
    els.btnRemove.hidden = !glass;

    const starting = onBoard && (!active || showStart);
    els.startPanel.hidden = !starting;
    els.btnCancelStart.hidden = !showStart;
    els.btnSample.hidden = !!active;
    if (starting) {
      if (!active) {
        els.startKicker.textContent = "On the glass";
        els.startHeading.textContent = "Start a series";
      } else {
        els.startKicker.textContent = "Next one";
        els.startHeading.textContent = "New series";
      }
    }
    paintPresets();
    if (onBoard) paintHistory();
  }

  function commitNames(force) {
    const you = els.fieldYou.value.trim() || (force ? "" : state.you);
    const rival = els.fieldRival.value.trim() || (force ? "" : state.rival);
    state = Rematch.setNames(state, you, rival).state;
    save();
    if (force) {
      if (document.activeElement !== els.fieldYou) els.fieldYou.value = state.you;
      if (document.activeElement !== els.fieldRival) els.fieldRival.value = state.rival;
    }
    paintNames();
    paintBoard(glassSeries(), force);
  }

  function flashScore(winner) {
    const el = winner === "you" ? els.scoreYou : els.scoreRival;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  function onWin(winner) {
    const series = activeSeries();
    if (!series || view !== "board") return;
    const now = Date.now();
    if (now - lastLogAt < 350) return;
    lastLogAt = now;
    const result = Rematch.logGame(state, series.id, winner, els.fieldNote.value, now);
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    state = result.state;
    save();
    els.fieldNote.value = "";
    render();
    flashScore(winner);
    const sum = Rematch.summary(result.series);
    if (sum.clinched) toast(sum.headline + ".");
  }

  function undoGame() {
    const series = activeSeries();
    if (!series) return;
    const result = Rematch.undoLastGame(state, series.id);
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    state = result.state;
    save();
    showStart = false;
    render();
    toast("Last game taken back.");
  }

  function removeCurrent(id) {
    const result = Rematch.removeSeries(state, id);
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    const snapshot = result.removed;
    const index = result.index;
    const wasActive = result.wasActive;
    state = result.state;
    save();
    if (archiveId === id) {
      view = "board";
      archiveId = "";
    }
    if (wasActive) showStart = false;
    render();
    toast("Removed " + snapshot.title + ".", {
      ms: 8000,
      undo: function () {
        const restored = Rematch.restoreSeries(state, snapshot, index, wasActive);
        if (!restored.ok) {
          toast(reasonMessage(restored.reason));
          return;
        }
        state = restored.state;
        save();
        render();
        toast("Put " + snapshot.title + " back.");
      },
    });
  }

  function clearAll() {
    if (!state.series.length) return;
    const previous = state.series.slice();
    const activeId = state.activeId;
    const cleared = Rematch.clearSeries(state);
    state = cleared.state;
    save();
    view = "board";
    archiveId = "";
    showStart = false;
    render();
    toast("Cleared every series.", {
      ms: 8000,
      undo: function () {
        if (state.series.length) {
          toast("A new series is already on this phone.");
          return;
        }
        state = Rematch.restoreAll(state, previous, activeId).state;
        save();
        render();
        toast("Series restored.");
      },
    });
  }

  function openArchive(id) {
    if (!seriesById(id)) {
      toast(reasonMessage("missing"));
      return;
    }
    view = "archive";
    archiveId = id;
    showStart = false;
    hideFormError();
    render();
    window.scrollTo(0, 0);
  }

  function backToGlass() {
    view = "board";
    archiveId = "";
    render();
  }

  function continueSeries() {
    const result = Rematch.activateSeries(state, archiveId);
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    state = result.state;
    save();
    view = "board";
    archiveId = "";
    render();
    toast(result.series.title + " is on the glass.");
  }

  function openStart() {
    showStart = true;
    view = "board";
    hideFormError();
    render();
    els.fieldTitle.focus();
  }

  function shelveAndStart() {
    const result = Rematch.shelveSeries(state);
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    state = result.state;
    save();
    showStart = false;
    hideFormError();
    view = "board";
    archiveId = "";
    render();
    toast(result.series.title + " is on the shelf.");
    els.fieldTitle.focus();
  }

  function loadSample() {
    const result = Rematch.loadSample(state, Date.now());
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    state = result.state;
    save();
    view = "board";
    archiveId = "";
    showStart = false;
    render();
    toast(result.already ? "Sample is back on the glass." : "Sample series loaded.");
  }

  function keepIncoming() {
    if (!incoming) return;
    const result = Rematch.keepShare(state, incoming);
    const kept = incoming.series;
    incoming = null;
    if (!result.ok) {
      if (result.reason === "exists") {
        const existing = seriesById(kept.id);
        if (existing && state.activeId !== existing.id) {
          view = "archive";
          archiveId = existing.id;
        } else {
          view = "board";
        }
        render();
        toast("Already on this phone.");
        return;
      }
      render();
      toast(reasonMessage(result.reason));
      return;
    }
    state = result.state;
    save();
    if (result.becameActive) {
      view = "board";
      archiveId = "";
    } else {
      view = "archive";
      archiveId = result.series.id;
    }
    render();
    toast(result.dropped ? "Kept. The oldest series made room." : "Kept on this phone.");
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

  async function presentShare(series) {
    const payload = Rematch.shareSeries(series);
    if (!payload) {
      toast("That series could not be packed.");
      return;
    }
    try {
      const packed = await Rematch.compressPayload(JSON.stringify(payload));
      els.shareUrlBox.value = location.origin + location.pathname + HASH_PREFIX + packed;
      els.shareTitle.textContent = "A copy of this series.";
      els.shareLead.textContent = "Send this URL. They open the same series. Later games here do not update their copy. Not live sync.";
      els.shareDialog.showModal();
    } catch (_) {
      toast("That snapshot could not be packed.");
    }
  }

  function wire() {
    if (wired) return;
    wired = true;

    function selectName(event) {
      event.target.select();
    }
    els.fieldYou.addEventListener("focus", selectName);
    els.fieldRival.addEventListener("focus", selectName);
    els.fieldYou.addEventListener("input", function () { commitNames(false); });
    els.fieldRival.addEventListener("input", function () { commitNames(false); });
    els.fieldYou.addEventListener("blur", function () { commitNames(true); });
    els.fieldRival.addEventListener("blur", function () { commitNames(true); });

    els.btnYou.addEventListener("click", function () { onWin("you"); });
    els.btnRival.addEventListener("click", function () { onWin("rival"); });
    els.btnUndoGame.addEventListener("click", undoGame);
    els.btnRemove.addEventListener("click", function () {
      const series = glassSeries();
      if (series) removeCurrent(series.id);
    });
    els.btnNewSeries.addEventListener("click", function () {
      const series = activeSeries();
      const sum = series ? Rematch.summary(series) : null;
      if (sum && !sum.clinched) shelveAndStart();
      else openStart();
    });
    els.btnContinue.addEventListener("click", continueSeries);
    els.btnArchiveBack.addEventListener("click", backToGlass);
    els.btnShare.addEventListener("click", function () {
      const series = glassSeries();
      if (series) presentShare(series);
    });
    els.btnClear.addEventListener("click", clearAll);
    els.btnSample.addEventListener("click", loadSample);
    els.btnCancelStart.addEventListener("click", function () {
      showStart = false;
      hideFormError();
      render();
    });
    els.btnKeepShare.addEventListener("click", keepIncoming);
    els.btnDismissShare.addEventListener("click", dismissShare);
    els.btnCopyShare.addEventListener("click", async function () {
      const ok = await copyText(els.shareUrlBox.value);
      toast(ok ? "Link copied." : "Select the link and copy it.");
    });
    els.btnCloseShare.addEventListener("click", function () { els.shareDialog.close(); });
    els.toastUndo.addEventListener("click", function () {
      const run = undoBag;
      undoBag = null;
      els.toast.classList.remove("show");
      els.toastUndo.hidden = true;
      if (run) run();
    });

    els.presetChips.addEventListener("click", function (event) {
      const btn = event.target.closest("button");
      if (!btn || !btn.dataset.best) return;
      if (btn.dataset.best === "custom") customBest = true;
      else {
        customBest = false;
        draftBest = Number(btn.dataset.best);
      }
      hideFormError();
      paintPresets();
    });

    els.seriesForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const bestOf = customBest ? els.fieldBest.value : draftBest;
      const result = Rematch.startSeries(state, {
        title: els.fieldTitle.value,
        bestOf: bestOf,
        stakes: els.fieldStakes.value,
      }, Date.now());
      if (!result.ok) {
        showFormError(reasonMessage(result.reason));
        return;
      }
      state = result.state;
      save();
      showStart = false;
      els.fieldTitle.value = "";
      els.fieldStakes.value = "";
      els.fieldBest.value = "";
      draftBest = 5;
      customBest = false;
      hideFormError();
      view = "board";
      archiveId = "";
      render();
      toast(result.series.title + " is on the glass.");
    });

    els.historyList.addEventListener("click", function (event) {
      const removeBtn = event.target.closest("[data-remove]");
      if (removeBtn) {
        removeCurrent(removeBtn.dataset.remove);
        return;
      }
      const openBtn = event.target.closest("[data-open]");
      if (openBtn) openArchive(openBtn.dataset.open);
    });
  }

  async function boot() {
    cacheEls();
    state = load();
    wire();
    render();
    incoming = await tryImportShare();
    render();
    window.addEventListener("hashchange", async function () {
      const share = await tryImportShare();
      if (!share) return;
      incoming = share;
      render();
    });
  }

  boot();
})();
