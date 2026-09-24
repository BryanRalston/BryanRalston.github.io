(() => {
  const HASH_PREFIX = "#b=";
  const QUERY_KEY = "b";

  const els = {
    storageFail: document.getElementById("storageFail"),
    shareOffer: document.getElementById("shareOffer"),
    offerHeading: document.getElementById("offerHeading"),
    offerLead: document.getElementById("offerLead"),
    offerPoster: document.getElementById("offerPoster"),
    offerList: document.getElementById("offerList"),
    offerHint: document.getElementById("offerHint"),
    btnUseShare: document.getElementById("btnUseShare"),
    btnAddShare: document.getElementById("btnAddShare"),
    btnOpenMine: document.getElementById("btnOpenMine"),
    btnDismissShare: document.getElementById("btnDismissShare"),
    shelf: document.getElementById("shelf"),
    shelfSub: document.getElementById("shelfSub"),
    toolbar: document.getElementById("toolbar"),
    btnAdd: document.getElementById("btnAdd"),
    btnShareShelf: document.getElementById("btnShareShelf"),
    filters: document.getElementById("filters"),
    sortBar: document.getElementById("sortBar"),
    sortRecent: document.getElementById("sortRecent"),
    sortTitle: document.getElementById("sortTitle"),
    emptyState: document.getElementById("emptyState"),
    btnEmptyAdd: document.getElementById("btnEmptyAdd"),
    filterEmpty: document.getElementById("filterEmpty"),
    filterEmptyTitle: document.getElementById("filterEmptyTitle"),
    list: document.getElementById("list"),
    btnClearShelf: document.getElementById("btnClearShelf"),
    formPanel: document.getElementById("formPanel"),
    formKicker: document.getElementById("formKicker"),
    formHeading: document.getElementById("formHeading"),
    gameForm: document.getElementById("gameForm"),
    fieldTitle: document.getElementById("fieldTitle"),
    fieldPlatform: document.getElementById("fieldPlatform"),
    fieldTake: document.getElementById("fieldTake"),
    starPicker: document.getElementById("starPicker"),
    starRow: document.getElementById("starRow"),
    starReadout: document.getElementById("starReadout"),
    btnClearRating: document.getElementById("btnClearRating"),
    formError: document.getElementById("formError"),
    btnSave: document.getElementById("btnSave"),
    btnCancelForm: document.getElementById("btnCancelForm"),
    cardPanel: document.getElementById("cardPanel"),
    cardPoster: document.getElementById("cardPoster"),
    btnCardShare: document.getElementById("btnCardShare"),
    btnCardEdit: document.getElementById("btnCardEdit"),
    btnCardRemove: document.getElementById("btnCardRemove"),
    btnCardBack: document.getElementById("btnCardBack"),
    shareDialog: document.getElementById("shareDialog"),
    shareTitle: document.getElementById("shareTitle"),
    shareLead: document.getElementById("shareLead"),
    shareUrlBox: document.getElementById("shareUrlBox"),
    toast: document.getElementById("toast"),
    toastText: document.getElementById("toastText"),
    toastUndo: document.getElementById("toastUndo"),
  };

  let storageOk = true;
  let state = BeatLog.emptyState();
  let incoming = null;
  let view = "shelf";
  let formMode = "add";
  let editingId = "";
  let cardId = "";
  let draftStatus = "playing";
  let draftRating = null;
  let focusNext = false;
  let undoBag = null;

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
    toast._t = setTimeout(() => {
      els.toast.classList.remove("show");
      undoBag = null;
      els.toastUndo.hidden = true;
    }, options.ms || 2600);
  }

  function reasonMessage(reason) {
    switch (reason) {
      case "title":
        return "A game needs a title.";
      case "status":
        return "Pick wishlist, playing, beaten, or dropped.";
      case "rating":
        return "Stars go from 0.5 to 5, in half steps.";
      case "cap":
        return "This shelf holds 48 games. Remove one to log another.";
      case "missing":
        return "That game is no longer on this shelf.";
      case "exists":
        return "That game is already back on the shelf.";
      default: {
        const _never = reason;
        throw new Error("Unknown reason " + _never);
      }
    }
  }

  function probeStorage() {
    try {
      const probe = BeatLog.STORAGE_KEY + "-probe";
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
    if (!storageOk) return BeatLog.emptyState();
    try {
      const raw = localStorage.getItem(BeatLog.STORAGE_KEY);
      if (!raw) return BeatLog.emptyState();
      return BeatLog.normalizeState(JSON.parse(raw));
    } catch (_) {
      return BeatLog.emptyState();
    }
  }

  function save() {
    if (!storageOk) return;
    try {
      localStorage.setItem(BeatLog.STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
    }
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
    if (hash.startsWith(HASH_PREFIX)) {
      token = decodeURIComponent(hash.slice(HASH_PREFIX.length));
    } else {
      const params = new URLSearchParams(location.search);
      token = params.get(QUERY_KEY) || "";
    }
    if (!token) return null;
    try {
      const json = await BeatLog.decompressPayload(token);
      const share = BeatLog.parseShare(JSON.parse(json));
      cleanShareUrl();
      if (!share) throw new Error("empty");
      return share;
    } catch (_) {
      cleanShareUrl();
      toast("That snapshot could not be read.", { ms: 3200 });
      return null;
    }
  }

  function setView(next) {
    switch (next) {
      case "shelf":
      case "form":
      case "card":
        view = next;
        break;
      default: {
        const _never = next;
        throw new Error("Unknown view " + _never);
      }
    }
    focusNext = true;
    syncChrome();
  }

  function syncChrome() {
    document.body.dataset.view = view;
    els.shelf.hidden = view !== "shelf";
    els.formPanel.hidden = view !== "form";
    els.cardPanel.hidden = view !== "card";
  }

  function formatWhen(ms) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(ms));
    } catch (_) {
      return "";
    }
  }

  function starLine(rating, onDark) {
    const wrap = document.createElement("span");
    wrap.className = onDark ? "starline on-dark" : "starline";
    wrap.setAttribute("aria-hidden", "true");
    const base = document.createElement("span");
    base.className = "starline-base";
    base.textContent = "★★★★★";
    const fill = document.createElement("span");
    fill.className = "starline-fill";
    fill.textContent = "★★★★★";
    fill.style.width = BeatLog.starPercent(rating) + "%";
    wrap.append(base, fill);
    return wrap;
  }

  function fillPoster(host, entry) {
    host.textContent = "";
    host.dataset.status = entry.status;
    host.hidden = false;

    const top = document.createElement("div");
    top.className = "poster-top";
    const brand = document.createElement("p");
    brand.className = "poster-brand";
    brand.textContent = "Beat Log";
    const pill = document.createElement("p");
    pill.className = "poster-status";
    pill.textContent = BeatLog.statusLabel(entry.status);
    top.append(brand, pill);

    const title = document.createElement("h2");
    title.className = "poster-title";
    title.tabIndex = -1;
    title.textContent = entry.title;

    const meta = document.createElement("p");
    meta.className = "poster-meta";
    const bits = [];
    if (entry.platform) bits.push(entry.platform);
    const when = formatWhen(entry.updated);
    if (when) bits.push(when);
    meta.textContent = bits.join(" · ");

    const stars = document.createElement("p");
    stars.className = "poster-stars";
    stars.setAttribute("aria-label", BeatLog.ratingPhrase(entry.rating));
    if (entry.rating == null) {
      stars.classList.add("is-unrated");
      stars.textContent = "Unrated";
    } else {
      stars.append(starLine(entry.rating, false));
      const num = document.createElement("span");
      num.className = "poster-score";
      num.setAttribute("aria-hidden", "true");
      num.textContent = entry.rating % 1 === 0 ? String(entry.rating) : entry.rating.toFixed(1);
      stars.append(num);
    }

    host.append(top, title, meta, stars);

    if (entry.take) {
      const quote = document.createElement("blockquote");
      quote.className = "poster-take";
      quote.textContent = entry.take;
      host.append(quote);
    }

    const foot = document.createElement("p");
    foot.className = "poster-foot";
    foot.textContent = "On this device · a snapshot, not a feed";
    host.append(foot);
  }

  function paintStatus() {
    document.querySelectorAll("#statusPicks button").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.status === draftStatus ? "true" : "false");
    });
  }

  function paintStars() {
    const rating = draftRating;
    els.starPicker.setAttribute("aria-valuenow", rating == null ? "0" : String(rating));
    els.starPicker.setAttribute("aria-valuetext", BeatLog.ratingPhrase(rating));
    els.starReadout.textContent = BeatLog.ratingPhrase(rating);
    els.btnClearRating.disabled = rating == null;
    els.starRow.querySelectorAll("button").forEach((btn) => {
      const n = Number(btn.dataset.star);
      const fill = btn.querySelector(".star-hit-fill");
      let width = 0;
      if (rating != null) {
        if (rating >= n) width = 100;
        else if (rating >= n - 0.5) width = 50;
      }
      fill.style.width = width + "%";
    });
  }

  function hideFormError() {
    els.formError.hidden = true;
    els.formError.textContent = "";
    els.fieldTitle.removeAttribute("aria-invalid");
  }

  function showFormError(msg) {
    els.formError.hidden = false;
    els.formError.textContent = msg;
    if (msg.indexOf("title") !== -1) {
      els.fieldTitle.setAttribute("aria-invalid", "true");
      els.fieldTitle.focus();
    }
  }

  function shelfLine() {
    const n = state.entries.length;
    if (!n) return "Nothing kept yet.";
    const games = n === 1 ? "1 game on this device." : n + " games on this device.";
    let line = games;
    if (state.filter !== "all") line += " A shelf link still packs all of them.";
    const left = BeatLog.ENTRY_CAP - n;
    if (left === 0) line += " Shelf is full.";
    else if (left <= 8) line += " " + left + " spots left.";
    return line;
  }

  function renderFilters() {
    const tally = BeatLog.counts(state);
    document.querySelectorAll("#filters button").forEach((btn) => {
      const filter = btn.dataset.filter;
      btn.textContent = BeatLog.filterLabel(filter) + " " + tally[filter];
      btn.setAttribute("aria-pressed", state.filter === filter ? "true" : "false");
    });
    els.sortRecent.setAttribute("aria-pressed", state.sort === "recent" ? "true" : "false");
    els.sortTitle.setAttribute("aria-pressed", state.sort === "title" ? "true" : "false");
    const has = state.entries.length > 0;
    els.filters.hidden = !has;
    els.sortBar.hidden = state.entries.length < 2;
    els.btnClearShelf.hidden = !has;
  }

  function entryRow(entry, index) {
    const li = document.createElement("li");
    li.className = "entry";
    li.dataset.status = entry.status;

    const open = document.createElement("button");
    open.type = "button";
    open.className = "entry-open";
    open.addEventListener("click", () => {
      cardId = entry.id;
      setView("card");
      render();
    });

    const indexEl = document.createElement("span");
    indexEl.className = "entry-index";
    indexEl.setAttribute("aria-hidden", "true");
    indexEl.textContent = String(index + 1).padStart(2, "0");

    const body = document.createElement("span");
    body.className = "entry-body";

    const titleRow = document.createElement("span");
    titleRow.className = "entry-title-row";
    const title = document.createElement("span");
    title.className = "entry-title";
    title.textContent = entry.title;
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.dataset.status = entry.status;
    pill.textContent = BeatLog.statusLabel(entry.status);
    titleRow.append(title, pill);

    const meta = document.createElement("span");
    meta.className = "entry-meta";
    if (entry.platform) {
      const plat = document.createElement("span");
      plat.textContent = entry.platform;
      meta.append(plat);
    }
    if (entry.rating == null) {
      const unrated = document.createElement("span");
      unrated.textContent = "Unrated";
      meta.append(unrated);
    } else {
      meta.append(starLine(entry.rating, true));
    }

    body.append(titleRow, meta);
    if (entry.take) {
      const take = document.createElement("span");
      take.className = "entry-take";
      take.textContent = entry.take;
      body.append(take);
    }
    open.append(indexEl, body);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "entry-remove";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", "Remove " + entry.title);
    remove.addEventListener("click", () => removeGame(entry.id));

    li.append(open, remove);
    return li;
  }

  function renderList() {
    const visible = BeatLog.visibleEntries(state);
    const has = state.entries.length > 0;
    els.emptyState.hidden = has;
    els.toolbar.hidden = !has;
    els.list.hidden = visible.length === 0;
    els.btnShareShelf.disabled = !has;
    els.shelfSub.textContent = shelfLine();
    const showFilterEmpty = has && visible.length === 0 && state.filter !== "all";
    els.filterEmpty.hidden = !showFilterEmpty;
    if (showFilterEmpty) {
      els.filterEmptyTitle.textContent = "Nothing marked " + BeatLog.statusLabel(state.filter).toLowerCase() + ".";
    }
    els.list.textContent = "";
    visible.forEach((entry, index) => {
      els.list.append(entryRow(entry, index));
    });
  }

  function renderCard() {
    if (view !== "card") {
      if (view !== "form") document.title = "Beat Log";
      return;
    }
    const entry = state.entries.find((row) => row.id === cardId);
    if (!entry) {
      view = "shelf";
      syncChrome();
      document.title = "Beat Log";
      return;
    }
    fillPoster(els.cardPoster, entry);
    document.title = entry.title + " · Beat Log";
  }

  function renderOffer() {
    if (!incoming) {
      els.shareOffer.hidden = true;
      return;
    }
    els.shareOffer.hidden = false;
    const kind = incoming.k;
    switch (kind) {
      case "card": {
        const entry = incoming.entries[0];
        const owned = state.entries.some((row) => row.id === entry.id);
        els.offerHeading.textContent = "One game, this phone.";
        els.offerLead.textContent = "Someone sent a card. It is a copy, not live sync. Later edits on their phone do not change this one.";
        els.offerPoster.hidden = false;
        els.offerList.hidden = true;
        fillPoster(els.offerPoster, entry);
        els.btnUseShare.hidden = true;
        els.btnAddShare.hidden = owned;
        els.btnAddShare.textContent = "Keep this game";
        els.btnOpenMine.hidden = !owned;
        els.offerHint.textContent = owned
          ? "This game is already on the shelf. Not now drops the link. Refresh will not bring it back — the address bar is cleared on purpose."
          : "Keep writes this copy onto this device. Not now drops it. Refresh will not bring it back — the address bar is cleared on purpose.";
        break;
      }
      case "shelf": {
        els.offerHeading.textContent = "Same shelf, this phone.";
        els.offerLead.textContent = "Someone sent a shelf of " + incoming.entries.length + (incoming.entries.length === 1 ? " game." : " games.") + " It is a copy, not live sync. Later logs on their phone do not move this one.";
        els.offerPoster.hidden = true;
        els.offerList.hidden = false;
        els.offerList.textContent = "";
        incoming.entries.slice(0, 6).forEach((entry) => {
          const li = document.createElement("li");
          li.textContent = entry.title + " · " + BeatLog.statusLabel(entry.status);
          els.offerList.append(li);
        });
        if (incoming.entries.length > 6) {
          const li = document.createElement("li");
          li.textContent = "and " + (incoming.entries.length - 6) + " more";
          els.offerList.append(li);
        }
        els.btnUseShare.hidden = false;
        els.btnUseShare.textContent = "Use this copy";
        els.btnAddShare.hidden = state.entries.length === 0;
        els.btnAddShare.textContent = "Add to my log";
        els.btnOpenMine.hidden = true;
        els.offerHint.textContent = "Use this copy replaces the shelf on this device. Add keeps both. Not now drops it. Refresh will not bring it back — the address bar is cleared on purpose.";
        break;
      }
      default: {
        const _never = kind;
        throw new Error("Unknown snapshot " + _never);
      }
    }
  }

  function render() {
    renderFilters();
    renderList();
    renderCard();
    renderOffer();
    paintStatus();
    paintStars();
    if (!focusNext) return;
    focusNext = false;
    if (view === "form") {
      els.fieldTitle.focus();
    } else if (view === "card") {
      const title = els.cardPoster.querySelector(".poster-title");
      if (title) title.focus();
    }
  }

  function openAdd() {
    formMode = "add";
    editingId = "";
    draftStatus = "playing";
    draftRating = null;
    els.fieldTitle.value = "";
    els.fieldPlatform.value = "";
    els.fieldTake.value = "";
    els.formKicker.textContent = "New log";
    els.formHeading.textContent = "Log a game";
    els.btnSave.textContent = "Save to this device";
    hideFormError();
    setView("form");
    render();
  }

  function openEdit(id) {
    const entry = state.entries.find((row) => row.id === id);
    if (!entry) {
      toast(reasonMessage("missing"));
      setView("shelf");
      render();
      return;
    }
    formMode = "edit";
    editingId = id;
    draftStatus = entry.status;
    draftRating = entry.rating;
    els.fieldTitle.value = entry.title;
    els.fieldPlatform.value = entry.platform;
    els.fieldTake.value = entry.take;
    els.formKicker.textContent = "Edit log";
    els.formHeading.textContent = "Update this game";
    els.btnSave.textContent = "Save changes";
    hideFormError();
    setView("form");
    render();
  }

  function cancelForm() {
    hideFormError();
    if (formMode === "edit" && editingId) {
      cardId = editingId;
      setView("card");
    } else {
      setView("shelf");
    }
    render();
  }

  function readDraft() {
    return {
      title: els.fieldTitle.value,
      status: draftStatus,
      platform: els.fieldPlatform.value,
      rating: draftRating,
      take: els.fieldTake.value,
    };
  }

  function removeGame(id) {
    const result = BeatLog.removeEntry(state, id);
    if (!result.ok) {
      toast(reasonMessage(result.reason));
      return;
    }
    const snapshot = result.entry;
    const index = result.index;
    state = result.state;
    save();
    if (view === "card" && cardId === id) setView("shelf");
    render();
    toast("Removed " + snapshot.title + ".", {
      ms: 7000,
      undo: () => {
        const restored = BeatLog.restoreEntry(state, snapshot, index);
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

  function clearShelf() {
    if (!state.entries.length) return;
    const previous = state.entries.slice();
    const filter = state.filter;
    const sort = state.sort;
    state = { v: 1, filter: filter, sort: sort, entries: [] };
    save();
    setView("shelf");
    render();
    toast("Cleared the shelf.", {
      ms: 8000,
      undo: () => {
        if (state.entries.length) {
          toast("The shelf already has a new game.");
          return;
        }
        state = { v: 1, filter: state.filter, sort: state.sort, entries: previous };
        save();
        render();
        toast("Shelf restored.");
      },
    });
  }

  function mergeNote(merged) {
    if (!merged.added && merged.skipped && !merged.dropped) return "Those games are already on this shelf.";
    if (!merged.added && merged.dropped) return "The shelf is full at 48.";
    let msg = "Added " + merged.added + (merged.added === 1 ? " game." : " games.");
    if (merged.skipped) msg += " " + merged.skipped + " already here.";
    if (merged.dropped) msg += " Shelf stops at 48.";
    return msg;
  }

  function addIncomingCard() {
    if (!incoming || incoming.k !== "card") return;
    const entry = incoming.entries[0];
    if (state.entries.some((row) => row.id === entry.id)) {
      toast("That game is already on this shelf.");
      return;
    }
    const merged = BeatLog.mergeShare(state, incoming);
    if (!merged.added) {
      toast(merged.dropped ? reasonMessage("cap") : "That game is already on this shelf.");
      return;
    }
    state = merged.state;
    save();
    cardId = entry.id;
    incoming = null;
    setView("card");
    render();
    toast("Kept on this device. Not live sync.");
  }

  function useShare() {
    if (!incoming) return;
    switch (incoming.k) {
      case "shelf":
        state = BeatLog.replaceWithShare(state, incoming);
        save();
        incoming = null;
        setView("shelf");
        render();
        toast("This copy is the shelf now. Not live sync.");
        break;
      case "card":
        addIncomingCard();
        break;
      default: {
        const _never = incoming.k;
        throw new Error("Unknown snapshot " + _never);
      }
    }
  }

  function addShare() {
    if (!incoming) return;
    switch (incoming.k) {
      case "card":
        addIncomingCard();
        break;
      case "shelf": {
        const merged = BeatLog.mergeShare(state, incoming);
        state = merged.state;
        save();
        incoming = null;
        setView("shelf");
        render();
        toast(mergeNote(merged));
        break;
      }
      default: {
        const _never = incoming.k;
        throw new Error("Unknown snapshot " + _never);
      }
    }
  }

  function openMine() {
    if (!incoming || incoming.k !== "card") return;
    cardId = incoming.entries[0].id;
    incoming = null;
    setView("card");
    render();
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
      /* fall through to the box */
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
      const packed = await BeatLog.compressPayload(JSON.stringify(payload));
      const url = location.origin + location.pathname + HASH_PREFIX + packed;
      els.shareUrlBox.value = url;
      switch (kind) {
        case "card":
          els.shareTitle.textContent = "A copy of this card.";
          els.shareLead.textContent = "Send this URL. They open the same game. Later edits here do not update their copy. Not live sync.";
          break;
        case "shelf":
          els.shareTitle.textContent = "A copy of this shelf.";
          els.shareLead.textContent = "Send this URL. They open this whole log, not just the filter on screen. Later edits here do not update their copy. Not live sync.";
          break;
        default: {
          const _never = kind;
          throw new Error("Unknown share " + _never);
        }
      }
      els.shareDialog.showModal();
    } catch (_) {
      toast("That snapshot could not be packed.");
    }
  }

  async function shareShelf() {
    if (!state.entries.length) {
      toast("Log a game before you copy a shelf.");
      return;
    }
    await presentShare(BeatLog.shareShelf(state), "shelf");
  }

  async function shareCard() {
    const entry = state.entries.find((row) => row.id === cardId);
    if (!entry) {
      toast(reasonMessage("missing"));
      return;
    }
    const payload = BeatLog.shareCard(entry);
    if (!payload) {
      toast("That card could not be packed.");
      return;
    }
    await presentShare(payload, "card");
  }

  function buildStars() {
    for (let n = 1; n <= 5; n += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "star-hit";
      btn.tabIndex = -1;
      btn.dataset.star = String(n);
      btn.setAttribute("aria-label", n === 1 ? "1 star" : n + " stars");
      const base = document.createElement("span");
      base.className = "star-hit-base";
      base.setAttribute("aria-hidden", "true");
      base.textContent = "★";
      const fill = document.createElement("span");
      fill.className = "star-hit-fill";
      fill.setAttribute("aria-hidden", "true");
      fill.textContent = "★";
      btn.append(base, fill);
      btn.addEventListener("click", (event) => {
        const rect = btn.getBoundingClientRect();
        const keyboard = event.detail === 0;
        draftRating = keyboard || rect.width === 0 ? n : (event.clientX - rect.left < rect.width / 2 ? n - 0.5 : n);
        paintStars();
      });
      els.starRow.append(btn);
    }
  }

  function wire() {
    buildStars();
    els.btnAdd.addEventListener("click", openAdd);
    els.btnEmptyAdd.addEventListener("click", openAdd);
    els.btnCancelForm.addEventListener("click", cancelForm);
    els.btnShareShelf.addEventListener("click", () => { shareShelf(); });
    els.btnClearShelf.addEventListener("click", clearShelf);
    els.btnCardBack.addEventListener("click", () => {
      setView("shelf");
      render();
    });
    els.btnCardEdit.addEventListener("click", () => openEdit(cardId));
    els.btnCardRemove.addEventListener("click", () => removeGame(cardId));
    els.btnCardShare.addEventListener("click", () => { shareCard(); });
    els.btnUseShare.addEventListener("click", useShare);
    els.btnAddShare.addEventListener("click", addShare);
    els.btnOpenMine.addEventListener("click", openMine);
    els.btnDismissShare.addEventListener("click", dismissShare);
    els.btnClearRating.addEventListener("click", () => {
      draftRating = null;
      paintStars();
    });
    document.getElementById("btnCopyShare").addEventListener("click", async () => {
      const url = els.shareUrlBox.value;
      const copied = await copyText(url);
      if (!copied) window.prompt("Copy this snapshot:", url);
      else toast("Copied. A snapshot, not live sync.", { ms: 2800 });
    });
    document.getElementById("btnCloseShare").addEventListener("click", () => {
      els.shareDialog.close();
    });
    els.toastUndo.addEventListener("click", () => {
      const undo = undoBag;
      undoBag = null;
      els.toast.classList.remove("show");
      els.toastUndo.hidden = true;
      clearTimeout(toast._t);
      if (undo) undo();
    });
    els.gameForm.addEventListener("submit", (event) => {
      event.preventDefault();
      hideFormError();
      const draft = readDraft();
      const now = Date.now();
      const result = formMode === "edit"
        ? BeatLog.updateEntry(state, editingId, draft, now)
        : BeatLog.addEntry(state, draft, now);
      if (!result.ok) {
        showFormError(reasonMessage(result.reason));
        return;
      }
      state = result.state;
      save();
      cardId = result.entry.id;
      setView("card");
      render();
      toast(formMode === "edit" ? "Updated on this device." : "Logged on this device.");
    });
    els.fieldTitle.addEventListener("input", () => {
      els.fieldTitle.removeAttribute("aria-invalid");
      if (!els.formError.hidden) hideFormError();
    });
    document.querySelectorAll("#statusPicks button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const status = btn.dataset.status;
        if (BeatLog.STATUSES.indexOf(status) === -1) return;
        draftStatus = status;
        paintStatus();
      });
    });
    document.querySelectorAll("#platformChips button").forEach((btn) => {
      btn.addEventListener("click", () => {
        els.fieldPlatform.value = btn.getAttribute("data-platform") || "";
        els.fieldPlatform.focus();
      });
    });
    document.querySelectorAll("#filters button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state = BeatLog.setFilter(state, btn.dataset.filter);
        save();
        render();
      });
    });
    els.sortRecent.addEventListener("click", () => {
      state = BeatLog.setSort(state, "recent");
      save();
      render();
    });
    els.sortTitle.addEventListener("click", () => {
      state = BeatLog.setSort(state, "title");
      save();
      render();
    });
    els.starPicker.addEventListener("keydown", (event) => {
      let next = draftRating;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowUp":
          next = next == null ? 0.5 : Math.min(5, next + 0.5);
          break;
        case "ArrowLeft":
        case "ArrowDown":
          next = next == null ? null : (next <= 0.5 ? null : next - 0.5);
          break;
        case "Home":
          next = 0.5;
          break;
        case "End":
          next = 5;
          break;
        case "Delete":
        case "Backspace":
          next = null;
          break;
        default:
          return;
      }
      event.preventDefault();
      draftRating = next;
      paintStars();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (els.shareDialog.open) return;
      if (view === "form") {
        event.preventDefault();
        cancelForm();
      } else if (view === "card") {
        event.preventDefault();
        setView("shelf");
        render();
      }
    });
  }

  async function boot() {
    wire();
    const fromShare = await tryImportShare();
    state = load();
    incoming = fromShare;
    setView("shelf");
    render();
    if (fromShare) toast("A snapshot is waiting at the top.", { ms: 3200 });
  }

  boot();
})();
