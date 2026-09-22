(() => {
  const STORAGE_KEY = WhosRound.STORAGE_KEY;
  const HASH_PREFIX = "#r=";
  const QUERY_KEY = "r";

  const els = {
    storageFail: document.getElementById("storageFail"),
    shareOffer: document.getElementById("shareOffer"),
    sharePreview: document.getElementById("sharePreview"),
    emptyState: document.getElementById("emptyState"),
    hero: document.getElementById("hero"),
    heroKicker: document.getElementById("heroKicker"),
    heroName: document.getElementById("heroName"),
    heroGroup: document.getElementById("heroGroup"),
    heroMeta: document.getElementById("heroMeta"),
    btnBoughtDue: document.getElementById("btnBoughtDue"),
    btnUndo: document.getElementById("btnUndo"),
    groupPanel: document.getElementById("groupPanel"),
    fieldGroupName: document.getElementById("fieldGroupName"),
    peopleList: document.getElementById("peopleList"),
    peopleHint: document.getElementById("peopleHint"),
    fieldAddName: document.getElementById("fieldAddName"),
    btnClearHistory: document.getElementById("btnClearHistory"),
    btnClearGroup: document.getElementById("btnClearGroup"),
    historyPanel: document.getElementById("historyPanel"),
    historyEmpty: document.getElementById("historyEmpty"),
    historyList: document.getElementById("historyList"),
    shareDialog: document.getElementById("shareDialog"),
    shareUrlBox: document.getElementById("shareUrlBox"),
    renameDialog: document.getElementById("renameDialog"),
    fieldRename: document.getElementById("fieldRename"),
    toast: document.getElementById("toast"),
  };

  let storageOk = true;
  let state = WhosRound.emptyState();
  let incoming = null;
  let renameId = null;
  let toastTimer = 0;

  function toast(msg, ms) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), ms || 2400);
  }

  function probeStorage() {
    try {
      const probe = STORAGE_KEY + "-probe";
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
    if (!storageOk) return WhosRound.emptyState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return WhosRound.emptyState();
      return WhosRound.normalizeState(JSON.parse(raw));
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
      return WhosRound.emptyState();
    }
  }

  function save() {
    if (!storageOk) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      storageOk = false;
      els.storageFail.hidden = false;
    }
  }

  function persist() {
    save();
    render();
  }

  function bytesToB64url(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function b64urlToBytes(token) {
    let b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = b64.length % 4;
    if (padLen) b64 += "=".repeat(4 - padLen);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function compressPayload(json) {
    if (typeof CompressionStream === "undefined") {
      return "j." + bytesToB64url(new TextEncoder().encode(json));
    }
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate"));
    const buf = await new Response(stream).arrayBuffer();
    const z = "z." + bytesToB64url(new Uint8Array(buf));
    const j = "j." + bytesToB64url(new TextEncoder().encode(json));
    return z.length <= j.length ? z : j;
  }

  async function decompressPayload(token) {
    const kind = token.slice(0, 2);
    const body = token.slice(2);
    if (kind === "j.") return new TextDecoder().decode(b64urlToBytes(body));
    if (kind === "z.") {
      if (typeof DecompressionStream === "undefined") throw new Error("no decompress");
      const bytes = b64urlToBytes(body);
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
      return await new Response(stream).text();
    }
    return decodeURIComponent(escape(atob(token)));
  }

  async function encodeShare(group) {
    const packed = await compressPayload(JSON.stringify(WhosRound.sharePayload(group)));
    return location.origin + location.pathname + HASH_PREFIX + packed;
  }

  function cleanShareUrl() {
    const url = new URL(location.href);
    url.hash = "";
    url.searchParams.delete(QUERY_KEY);
    history.replaceState(null, "", url.pathname + url.search);
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
      const json = await decompressPayload(token);
      const group = WhosRound.parseSharePayload(JSON.parse(json));
      cleanShareUrl();
      if (!group) throw new Error("empty");
      return group;
    } catch (_) {
      cleanShareUrl();
      toast("That snapshot could not be read.", 3200);
      return null;
    }
  }

  function fingerprint(group) {
    if (!group) return "";
    const names = (group.people || [])
      .map((person) => String(person.name || "").toLowerCase())
      .sort()
      .join("|");
    const stamps = (group.people || [])
      .map((person) => String(person.lastBoughtAt || 0))
      .join(",");
    return [String(group.groupName || "").toLowerCase(), names, stamps].join("::");
  }

  function relativeTime(ts) {
    if (!ts) return "never bought";
    const delta = Date.now() - ts;
    if (delta < 45 * 1000) return "just now";
    if (delta < 90 * 1000) return "1 min ago";
    if (delta < 50 * 60 * 1000) return Math.round(delta / 60000) + " min ago";
    if (delta < 36 * 60 * 60 * 1000) return Math.round(delta / 3600000) + " hr ago";
    const days = Math.round(delta / 86400000);
    return days === 1 ? "yesterday" : days + " days ago";
  }

  function renderShareOffer() {
    if (!incoming) {
      els.shareOffer.hidden = true;
      return;
    }
    els.shareOffer.hidden = false;
    els.sharePreview.textContent = WhosRound.formatAsText(incoming);
  }

  function renderHero() {
    const tracking = WhosRound.canTrack(state);
    if (!tracking) {
      els.hero.hidden = true;
      els.emptyState.hidden = state.people.length > 0;
      return;
    }
    els.emptyState.hidden = true;
    els.hero.hidden = false;
    const due = WhosRound.findDuePerson(state.people);
    els.heroKicker.textContent = "Due next";
    els.heroName.textContent = due ? due.name : "—";
    if (state.groupName) {
      els.heroGroup.hidden = false;
      els.heroGroup.textContent = state.groupName;
    } else {
      els.heroGroup.hidden = true;
      els.heroGroup.textContent = "";
    }
    els.heroMeta.textContent = due
      ? "Last bought " + relativeTime(due.lastBoughtAt) + " · " + state.people.length + " people"
      : "";
    els.btnUndo.hidden = state.history.length === 0;
  }

  function renderPeople() {
    els.groupPanel.hidden = false;
    els.fieldGroupName.value = state.groupName;
    els.btnClearGroup.hidden = state.people.length === 0;
    els.btnClearHistory.hidden = state.history.length === 0;

    if (state.people.length < WhosRound.PEOPLE_MIN) {
      els.peopleHint.hidden = false;
      els.peopleHint.textContent =
        state.people.length === 0
          ? "Add at least two people to track whose turn it is."
          : "Add one more person to start tracking.";
    } else {
      els.peopleHint.hidden = true;
    }

    const due = WhosRound.findDuePerson(state.people);
    const dueId = due ? due.id : null;
    const sorted = state.people.slice().sort((a, b) => WhosRound.compareNames(a.name, b.name));

    els.peopleList.innerHTML = "";
    for (const person of sorted) {
      const li = document.createElement("li");
      if (person.id === dueId) li.className = "is-due";

      const main = document.createElement("div");
      main.className = "person-main";
      const title = document.createElement("p");
      title.className = "person-name";
      title.textContent = person.name + (person.id === dueId ? " · due" : "");
      const meta = document.createElement("p");
      meta.className = "person-meta";
      meta.textContent = "Last bought " + relativeTime(person.lastBoughtAt);
      main.appendChild(title);
      main.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "person-actions";

      if (WhosRound.canTrack(state)) {
        const bought = document.createElement("button");
        bought.type = "button";
        bought.className = "btn bought";
        bought.textContent = "Bought";
        bought.addEventListener("click", () => markBought(person.id));
        actions.appendChild(bought);
      }

      const rename = document.createElement("button");
      rename.type = "button";
      rename.className = "btn ghost";
      rename.textContent = "Rename";
      rename.addEventListener("click", () => openRename(person.id));
      actions.appendChild(rename);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn ghost danger";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => removePerson(person.id));
      actions.appendChild(remove);

      li.appendChild(main);
      li.appendChild(actions);
      els.peopleList.appendChild(li);
    }
  }

  function renderHistory() {
    if (!state.people.length && !state.history.length) {
      els.historyPanel.hidden = true;
      return;
    }
    els.historyPanel.hidden = false;
    const items = state.history;
    if (!items.length) {
      els.historyEmpty.hidden = false;
      els.historyList.hidden = true;
      els.historyList.innerHTML = "";
      return;
    }
    els.historyEmpty.hidden = true;
    els.historyList.hidden = false;
    els.historyList.innerHTML = "";
    for (const row of items) {
      const li = document.createElement("li");
      const main = document.createElement("div");
      main.className = "history-main";
      const title = document.createElement("p");
      title.className = "history-title";
      title.textContent = row.personName + " bought";
      const meta = document.createElement("p");
      meta.className = "history-meta";
      meta.textContent = relativeTime(row.at);
      main.appendChild(title);
      main.appendChild(meta);
      li.appendChild(main);
      els.historyList.appendChild(li);
    }
  }

  function render() {
    renderShareOffer();
    renderHero();
    renderPeople();
    renderHistory();
  }

  function markBought(personId) {
    const result = WhosRound.recordBought(state, personId);
    if (!result.ok) {
      if (result.reason === "min") toast("Add at least two people first.");
      else toast("Could not record that buy.");
      return;
    }
    state = result.state;
    persist();
    toast(result.item.personName + " bought. Next is up.");
  }

  function undoBought() {
    const result = WhosRound.undoLastBought(state);
    if (!result.ok) {
      toast("Nothing to undo.");
      return;
    }
    state = result.state;
    persist();
    toast("Undid " + result.undone.personName + "’s Bought.");
  }

  function addPerson(name) {
    const result = WhosRound.addPerson(state, name);
    if (!result.ok) {
      if (result.reason === "empty") toast("Enter a name.");
      else if (result.reason === "dup") toast("That name is already in the group.");
      else if (result.reason === "max") toast("Group is full.");
      return false;
    }
    state = result.state;
    persist();
    return true;
  }

  function removePerson(personId) {
    const person = state.people.find((row) => row.id === personId);
    if (!person) return;
    if (!window.confirm("Remove " + person.name + " from this group?")) return;
    const result = WhosRound.removePerson(state, personId);
    if (!result.ok) return;
    state = result.state;
    persist();
    toast(person.name + " removed.");
  }

  function openRename(personId) {
    const person = state.people.find((row) => row.id === personId);
    if (!person) return;
    renameId = personId;
    els.fieldRename.value = person.name;
    els.renameDialog.showModal();
    els.fieldRename.focus();
    els.fieldRename.select();
  }

  function saveRename() {
    if (!renameId) return;
    const result = WhosRound.renamePerson(state, renameId, els.fieldRename.value);
    if (!result.ok) {
      if (result.reason === "empty") toast("Enter a name.");
      else if (result.reason === "dup") toast("That name is already in the group.");
      return;
    }
    state = result.state;
    renameId = null;
    els.renameDialog.close();
    persist();
    toast("Name updated.");
  }

  function useIncoming() {
    if (!incoming) return;
    state = WhosRound.normalizeState(incoming);
    incoming = null;
    persist();
    toast("Shared group saved on this device.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function dismissIncoming() {
    incoming = null;
    renderShareOffer();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function shareSnapshot() {
    if (!WhosRound.canTrack(state)) {
      toast("Add at least two people before you share.");
      return;
    }
    const url = await encodeShare(state);
    els.shareUrlBox.value = url;
    els.shareDialog.showModal();
  }

  document.getElementById("btnSample").addEventListener("click", () => {
    state = WhosRound.sampleGroup();
    persist();
    toast("Sample group loaded. Tap Bought when someone pays.");
  });

  document.getElementById("btnBoughtDue").addEventListener("click", () => {
    const due = WhosRound.findDuePerson(state.people);
    if (!due) return;
    markBought(due.id);
  });

  document.getElementById("btnUndo").addEventListener("click", undoBought);
  document.getElementById("btnShare").addEventListener("click", shareSnapshot);

  document.getElementById("addForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (addPerson(els.fieldAddName.value)) {
      els.fieldAddName.value = "";
      els.fieldAddName.focus();
    }
  });

  els.fieldGroupName.addEventListener("change", () => {
    state = WhosRound.setGroupName(state, els.fieldGroupName.value);
    persist();
  });
  els.fieldGroupName.addEventListener("blur", () => {
    state = WhosRound.setGroupName(state, els.fieldGroupName.value);
    save();
  });

  document.getElementById("btnUseShare").addEventListener("click", useIncoming);
  document.getElementById("btnDismissShare").addEventListener("click", dismissIncoming);

  document.getElementById("btnClearHistory").addEventListener("click", () => {
    if (!window.confirm("Clear round history on this device? Names stay. Who's due resets.")) return;
    state = WhosRound.clearHistory(state);
    persist();
    toast("History cleared.");
  });

  document.getElementById("btnClearGroup").addEventListener("click", () => {
    if (!window.confirm("Clear this whole group on this device?")) return;
    state = WhosRound.clearGroup();
    persist();
    toast("Group cleared.");
  });

  document.getElementById("btnCloseShare").addEventListener("click", () => els.shareDialog.close());
  document.getElementById("btnCopyShare").addEventListener("click", async () => {
    const ok = await copyText(els.shareUrlBox.value);
    toast(ok ? "Link copied." : "Copy the URL from the box.");
  });

  document.getElementById("btnSaveRename").addEventListener("click", saveRename);
  document.getElementById("btnCloseRename").addEventListener("click", () => {
    renameId = null;
    els.renameDialog.close();
  });
  els.fieldRename.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveRename();
    }
  });

  async function boot() {
    state = load();
    incoming = await tryImportShare();
    if (incoming && fingerprint(incoming) === fingerprint(state) && WhosRound.canTrack(state)) {
      incoming = null;
      toast("This shared group is already on this device.");
    }
    render();
  }

  boot();
})();
