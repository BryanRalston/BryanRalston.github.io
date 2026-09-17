(() => {
  const STORAGE_KEY = "practice-pack-v1";
  const HASH_PREFIX = "#k=";

  const TEMPLATES = {
    blank: { id: "blank", name: "Blank", dayHint: "", items: [] },
    soccer: {
      id: "soccer",
      name: "Soccer",
      dayHint: "Tue / Thu",
      tone: "mint",
      items: [
        ["Cleats", true],
        ["Water bottle", true],
        ["Shin guards", true],
        ["Jersey", true],
        ["Snack", true],
        ["Extra socks", false],
        ["Ball", false],
        ["Sunscreen", false],
      ],
    },
    dance: {
      id: "dance",
      name: "Dance",
      dayHint: "Wed",
      tone: "coral",
      items: [
        ["Dance shoes", true],
        ["Water bottle", true],
        ["Outfit / leotard", true],
        ["Hair ties", true],
        ["Snack", false],
        ["Sweater", false],
      ],
    },
    swimming: {
      id: "swimming",
      name: "Swimming",
      dayHint: "Sat",
      tone: "sky",
      items: [
        ["Suit", true],
        ["Towel", true],
        ["Goggles", true],
        ["Cap", true],
        ["Water bottle", true],
        ["Snack", false],
        ["Flip-flops", false],
      ],
    },
    scouts: {
      id: "scouts",
      name: "Scouts",
      dayHint: "Mon",
      tone: "mint",
      items: [
        ["Handbook", true],
        ["Water bottle", true],
        ["Snack", true],
        ["Flashlight", true],
        ["Rain jacket", false],
        ["Sit-upon", false],
      ],
    },
  };

  const STARTER_IDS = ["soccer", "dance", "swimming", "scouts"];

  const els = {
    storageFail: document.getElementById("storageFail"),
    homeView: document.getElementById("homeView"),
    bagView: document.getElementById("bagView"),
    leaveView: document.getElementById("leaveView"),
    remainStamp: document.getElementById("remainStamp"),
    remainCount: document.getElementById("remainCount"),
    remainLabel: document.getElementById("remainLabel"),
    emptyState: document.getElementById("emptyState"),
    bagList: document.getElementById("bagList"),
    bagRemainStamp: document.getElementById("bagRemainStamp"),
    bagRemainCount: document.getElementById("bagRemainCount"),
    bagRemainLabel: document.getElementById("bagRemainLabel"),
    bagHero: document.getElementById("bagHero"),
    itemsSub: document.getElementById("itemsSub"),
    alwaysBlock: document.getElementById("alwaysBlock"),
    optionalBlock: document.getElementById("optionalBlock"),
    alwaysList: document.getElementById("alwaysList"),
    optionalList: document.getElementById("optionalList"),
    itemsEmpty: document.getElementById("itemsEmpty"),
    addItemForm: document.getElementById("addItemForm"),
    newItem: document.getElementById("newItem"),
    newItemAlways: document.getElementById("newItemAlways"),
    leaveKicker: document.getElementById("leaveKicker"),
    leaveTitle: document.getElementById("leaveTitle"),
    leaveMeta: document.getElementById("leaveMeta"),
    leaveStamp: document.getElementById("leaveStamp"),
    leaveCount: document.getElementById("leaveCount"),
    leaveLabel: document.getElementById("leaveLabel"),
    celebrate: document.getElementById("celebrate"),
    celebrateLine: document.getElementById("celebrateLine"),
    leaveAlwaysBlock: document.getElementById("leaveAlwaysBlock"),
    leaveOptionalBlock: document.getElementById("leaveOptionalBlock"),
    leaveAlwaysList: document.getElementById("leaveAlwaysList"),
    leaveOptionalList: document.getElementById("leaveOptionalList"),
    leaveEmpty: document.getElementById("leaveEmpty"),
    bagDialog: document.getElementById("bagDialog"),
    bagForm: document.getElementById("bagForm"),
    bagDialogTitle: document.getElementById("bagDialogTitle"),
    templateField: document.getElementById("templateField"),
    templateRow: document.getElementById("templateRow"),
    aboutDialog: document.getElementById("aboutDialog"),
    mobileCta: document.getElementById("mobileCta"),
    toast: document.getElementById("toast"),
  };

  let storageOk = true;
  let state = { v: 1, bags: [] };
  let view = "home";
  let selectedId = "";
  let draftTemplate = "blank";
  let toastTimer = 0;

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clip(value, max) {
    return String(value || "").trim().slice(0, max);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toast(message, ms) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), ms || 2800);
  }

  function makeItems(pairs) {
    return pairs.map(([label, always]) => ({
      id: uid(),
      label,
      always: !!always,
      packed: false,
    }));
  }

  function bagFromTemplate(templateId, extras) {
    const tpl = TEMPLATES[templateId] || TEMPLATES.blank;
    return normalizeBag({
      id: uid(),
      name: extras && extras.name ? extras.name : tpl.name,
      dayHint: extras && extras.dayHint != null ? extras.dayHint : tpl.dayHint,
      kid: extras && extras.kid ? extras.kid : "",
      notes: extras && extras.notes ? extras.notes : "",
      tone: tpl.tone || "sky",
      items: makeItems(tpl.items),
    });
  }

  function starterBags() {
    return STARTER_IDS.map((id) => bagFromTemplate(id));
  }

  function normalizeItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const label = clip(raw.label, 40);
    if (!label) return null;
    return {
      id: clip(raw.id, 64) || uid(),
      label,
      always: !!raw.always,
      packed: !!raw.packed,
    };
  }

  function normalizeBag(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = clip(raw.name, 48);
    if (!name) return null;
    const tone = raw.tone === "mint" || raw.tone === "coral" || raw.tone === "sky" ? raw.tone : "sky";
    const items = Array.isArray(raw.items) ? raw.items.map(normalizeItem).filter(Boolean) : [];
    return {
      id: clip(raw.id, 64) || uid(),
      name,
      dayHint: clip(raw.dayHint, 32),
      kid: clip(raw.kid, 40),
      notes: clip(raw.notes, 240),
      tone,
      items,
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return { v: 1, bags: [] };
    const list = Array.isArray(raw.bags) ? raw.bags : Array.isArray(raw) ? raw : [];
    return {
      v: 1,
      bags: list.map(normalizeBag).filter(Boolean),
    };
  }

  function probeStorage() {
    try {
      const probe = STORAGE_KEY + "-probe";
      localStorage.setItem(probe, "ok");
      const readback = localStorage.getItem(probe);
      localStorage.removeItem(probe);
      return readback === "ok";
    } catch (_) {
      return false;
    }
  }

  function failStorage(reason) {
    storageOk = false;
    els.storageFail.hidden = false;
    els.storageFail.textContent =
      "Practice Pack cannot save on this device. Browser storage is blocked" +
      (reason ? " (" + reason + ")" : "") +
      ". Bags will not persist.";
  }

  function loadStored() {
    if (!probeStorage()) {
      failStorage();
      return null;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalizeState(JSON.parse(raw));
    } catch (err) {
      failStorage(err && err.message ? err.message : "unreadable store");
      return null;
    }
  }

  function save() {
    if (!storageOk) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      failStorage(err && err.name ? err.name : "write failed");
      return false;
    }
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
    if (kind === "j.") {
      return new TextDecoder().decode(b64urlToBytes(body));
    }
    if (kind === "z.") {
      if (typeof DecompressionStream === "undefined") throw new Error("no decompress");
      const bytes = b64urlToBytes(body);
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
      return await new Response(stream).text();
    }
    return decodeURIComponent(escape(atob(token)));
  }

  function sharePayload() {
    return { v: 1, bags: state.bags };
  }

  async function encodeShare() {
    const packed = await compressPayload(JSON.stringify(sharePayload()));
    return location.origin + location.pathname + HASH_PREFIX + packed;
  }

  async function tryImportHash() {
    const hash = location.hash || "";
    if (!hash.startsWith(HASH_PREFIX)) return null;
    try {
      const json = await decompressPayload(decodeURIComponent(hash.slice(HASH_PREFIX.length)));
      const data = normalizeState(JSON.parse(json));
      history.replaceState(null, "", location.pathname + location.search);
      return data;
    } catch (_) {
      history.replaceState(null, "", location.pathname + location.search);
      toast("That snapshot link could not be read.", 3200);
      return null;
    }
  }

  function selectedBag() {
    return state.bags.find((bag) => bag.id === selectedId) || null;
  }

  function alwaysItems(bag) {
    return bag.items.filter((item) => item.always);
  }

  function optionalItems(bag) {
    return bag.items.filter((item) => !item.always);
  }

  function remainingFor(bag) {
    const always = alwaysItems(bag);
    const pool = always.length ? always : bag.items;
    return pool.filter((item) => !item.packed).length;
  }

  function totalRemaining() {
    return state.bags.reduce((sum, bag) => sum + remainingFor(bag), 0);
  }

  function packedAlways(bag) {
    const always = alwaysItems(bag);
    const pool = always.length ? always : bag.items;
    return pool.filter((item) => item.packed).length;
  }

  function remainPhrase(n) {
    if (n === 0) return "Packed";
    if (n === 1) return "1 left";
    return n + " left";
  }

  function findBag(id) {
    return state.bags.find((bag) => bag.id === id) || null;
  }

  function findItem(bag, id) {
    return bag.items.find((item) => item.id === id) || null;
  }

  function setView(next, bagId) {
    view = next;
    if (bagId) selectedId = bagId;
    document.body.classList.toggle("is-bag", view === "bag");
    document.body.classList.toggle("is-leave", view === "leave");
    els.homeView.hidden = view !== "home";
    els.bagView.hidden = view !== "bag";
    els.leaveView.hidden = view !== "leave";
    els.mobileCta.hidden = view !== "home";
    render();
  }

  function renderHeader() {
    const left = totalRemaining();
    const bags = state.bags.length;
    els.remainCount.textContent = String(left);
    els.remainLabel.textContent = left === 0 ? (bags ? "packed" : "to pack") : "to pack";
    els.remainStamp.classList.toggle("is-hot", left > 0);
    els.remainStamp.classList.toggle("is-ready", bags > 0 && left === 0);
    els.remainStamp.title = bags
      ? left + " always-pack item" + (left === 1 ? "" : "s") + " still out across " + bags + " bag" + (bags === 1 ? "" : "s")
      : "No bags yet";
  }

  function renderHome() {
    const virgin = state.bags.length === 0;
    els.emptyState.hidden = !virgin;
    els.bagList.innerHTML = state.bags
      .map((bag) => {
        const left = remainingFor(bag);
        const always = alwaysItems(bag).length;
        const optional = optionalItems(bag).length;
        const done = packedAlways(bag);
        const total = always || bag.items.length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const chips =
          (bag.kid ? "<span class=\"chip kid\">" + escapeHtml(bag.kid) + "</span>" : "") +
          (bag.dayHint ? "<span class=\"chip day\">" + escapeHtml(bag.dayHint) + "</span>" : "");
        const notes = bag.notes ? "<p class=\"notes\">" + escapeHtml(bag.notes) + "</p>" : "";
        return (
          "<li>" +
          "<article class=\"bag-card tone-" +
          escapeHtml(bag.tone) +
          "\" data-id=\"" +
          escapeHtml(bag.id) +
          "\">" +
          "<div class=\"bag-card-head\">" +
          "<div><h3 class=\"bag-title\">" +
          escapeHtml(bag.name) +
          "</h3><p class=\"meta\">" +
          chips +
          always +
          " always · " +
          optional +
          " optional</p></div>" +
          "<div class=\"remain-pill" +
          (left === 0 && bag.items.length ? " is-ready" : left > 3 ? " is-hot" : "") +
          "\">" +
          escapeHtml(bag.items.length ? remainPhrase(left) : "Empty") +
          "</div></div>" +
          "<div class=\"progress\" aria-hidden=\"true\"><span style=\"width:" +
          pct +
          "%\"></span></div>" +
          notes +
          "<div class=\"card-actions\">" +
          "<button type=\"button\" class=\"btn primary open-leave\" data-id=\"" +
          escapeHtml(bag.id) +
          "\">Leaving now</button>" +
          "<button type=\"button\" class=\"btn ghost open-bag\" data-id=\"" +
          escapeHtml(bag.id) +
          "\">Open bag</button>" +
          "</div></article></li>"
        );
      })
      .join("");
  }

  function renderBag() {
    const bag = selectedBag();
    if (!bag) {
      setView("home");
      return;
    }
    const left = remainingFor(bag);
    const always = alwaysItems(bag);
    const optional = optionalItems(bag);
    els.bagRemainCount.textContent = String(left);
    els.bagRemainLabel.textContent = left === 0 ? "packed" : "left";
    els.bagRemainStamp.classList.toggle("is-ready", left === 0 && bag.items.length > 0);
    els.bagRemainStamp.classList.toggle("is-hot", left > 0);
    const chips =
      (bag.kid ? "<span class=\"chip kid\">" + escapeHtml(bag.kid) + "</span>" : "") +
      (bag.dayHint ? "<span class=\"chip day\">" + escapeHtml(bag.dayHint) + "</span>" : "");
    els.bagHero.innerHTML =
      "<p class=\"kicker quiet\">This bag</p><h1>" +
      escapeHtml(bag.name) +
      "</h1><p class=\"meta\">" +
      (chips || "No day or kid label") +
      "</p>" +
      (bag.notes ? "<p class=\"notes\">" + escapeHtml(bag.notes) + "</p>" : "");
    els.itemsSub.textContent = bag.items.length
      ? left
        ? left + " always-pack still out. Optional items don’t block the door."
        : "Always-pack is done. Reset after practice."
      : "Add the thing you forgot last week.";
    els.itemsEmpty.hidden = bag.items.length > 0;
    els.alwaysBlock.hidden = always.length === 0;
    els.optionalBlock.hidden = optional.length === 0;
    els.alwaysList.innerHTML = always.map(itemRow).join("");
    els.optionalList.innerHTML = optional.map(itemRow).join("");
  }

  function itemRow(item) {
    return (
      "<li class=\"item-row" +
      (item.packed ? " is-packed" : "") +
      "\" data-id=\"" +
      escapeHtml(item.id) +
      "\">" +
      "<input class=\"check toggle-pack\" type=\"checkbox\" data-id=\"" +
      escapeHtml(item.id) +
      "\" " +
      (item.packed ? "checked " : "") +
      "aria-label=\"Packed " +
      escapeHtml(item.label) +
      "\" />" +
      "<span class=\"item-label\">" +
      escapeHtml(item.label) +
      "</span>" +
      "<span>" +
      "<button type=\"button\" class=\"tiny toggle-always\" data-id=\"" +
      escapeHtml(item.id) +
      "\">" +
      (item.always ? "Always" : "Optional") +
      "</button>" +
      "<button type=\"button\" class=\"tiny danger delete-item\" data-id=\"" +
      escapeHtml(item.id) +
      "\">Delete</button>" +
      "</span></li>"
    );
  }

  function leaveButton(item) {
    return (
      "<li><button type=\"button\" class=\"leave-check\" data-id=\"" +
      escapeHtml(item.id) +
      "\" aria-pressed=\"" +
      item.packed +
      "\">" +
      "<span class=\"box\" aria-hidden=\"true\">✓</span>" +
      "<span class=\"leave-item\">" +
      escapeHtml(item.label) +
      "</span></button></li>"
    );
  }

  function renderLeave() {
    const bag = selectedBag();
    if (!bag) {
      setView("home");
      return;
    }
    const left = remainingFor(bag);
    const always = alwaysItems(bag);
    const optional = optionalItems(bag);
    const ready = bag.items.length > 0 && left === 0;
    els.leaveTitle.textContent = bag.name;
    els.leaveKicker.textContent = "Leaving now";
    els.leaveMeta.textContent = [bag.kid, bag.dayHint].filter(Boolean).join(" · ") || "Check the always-pack list.";
    els.leaveCount.textContent = String(left);
    els.leaveLabel.textContent = left === 0 ? "go" : "left";
    els.leaveStamp.classList.toggle("is-ready", ready);
    els.celebrate.hidden = !ready;
    els.celebrateLine.textContent = bag.kid
      ? bag.kid + "’s bag is ready. Go."
      : "Bag’s ready. Go.";
    els.leaveEmpty.hidden = bag.items.length > 0;
    els.leaveAlwaysBlock.hidden = always.length === 0;
    els.leaveOptionalBlock.hidden = optional.length === 0;
    els.leaveAlwaysList.innerHTML = always.map(leaveButton).join("");
    els.leaveOptionalList.innerHTML = optional.map(leaveButton).join("");
  }

  function render() {
    renderHeader();
    if (view === "home") renderHome();
    else if (view === "bag") renderBag();
    else if (view === "leave") renderLeave();
    else {
      const _never = view;
      void _never;
      renderHome();
    }
    save();
  }

  function upsertBag(payload, templateId) {
    const existing = payload.id ? findBag(payload.id) : null;
    let next;
    if (existing) {
      next = normalizeBag({
        ...existing,
        name: payload.name,
        dayHint: payload.dayHint,
        kid: payload.kid,
        notes: payload.notes,
      });
      if (!next) return false;
      const idx = state.bags.findIndex((bag) => bag.id === existing.id);
      state.bags[idx] = next;
      selectedId = next.id;
      return true;
    }
    next = bagFromTemplate(templateId || "blank", payload);
    if (!next) return false;
    if (payload.id) next.id = clip(payload.id, 64);
    state.bags.push(next);
    selectedId = next.id;
    return true;
  }

  function resetBag(bag) {
    bag.items.forEach((item) => {
      item.packed = false;
    });
  }

  function openBagDialog(bag) {
    const f = els.bagForm;
    f.reset();
    f.id.value = bag ? bag.id : "";
    f.name.value = bag ? bag.name : "";
    f.dayHint.value = bag ? bag.dayHint : "";
    f.kid.value = bag ? bag.kid : "";
    f.notes.value = bag ? bag.notes : "";
    draftTemplate = "blank";
    els.bagDialogTitle.textContent = bag ? "Edit bag" : "New bag";
    els.templateField.hidden = !!bag;
    els.templateRow.innerHTML = Object.keys(TEMPLATES)
      .map((id) => {
        const tpl = TEMPLATES[id];
        return (
          "<button type=\"button\" class=\"template-chip\" data-template=\"" +
          id +
          "\" aria-pressed=\"" +
          (draftTemplate === id) +
          "\">" +
          escapeHtml(tpl.name) +
          "</button>"
        );
      })
      .join("");
    els.bagDialog.showModal();
    window.setTimeout(() => f.name.focus(), 10);
  }

  function loadStarters() {
    if (state.bags.length) {
      if (!window.confirm("Add Soccer, Dance, Swimming, and Scouts to this device?")) return;
    }
    state.bags = state.bags.concat(starterBags());
    setView("home");
    toast("Starter bags loaded — generic lists, not a real family.", 3400);
  }

  function togglePacked(itemId) {
    const bag = selectedBag();
    if (!bag) return;
    const item = findItem(bag, itemId);
    if (!item) return;
    item.packed = !item.packed;
    render();
    if (view === "leave" && remainingFor(bag) === 0 && bag.items.length) {
      toast("Always-pack is done.");
    }
  }

  els.bagList.addEventListener("click", (event) => {
    const leave = event.target.closest(".open-leave");
    if (leave) {
      setView("leave", leave.getAttribute("data-id"));
      return;
    }
    const open = event.target.closest(".open-bag");
    if (open) {
      setView("bag", open.getAttribute("data-id"));
      return;
    }
    const card = event.target.closest(".bag-card");
    if (card) setView("bag", card.getAttribute("data-id"));
  });

  els.alwaysList.addEventListener("click", onItemListClick);
  els.optionalList.addEventListener("click", onItemListClick);
  els.alwaysList.addEventListener("change", onItemListChange);
  els.optionalList.addEventListener("change", onItemListChange);

  function onItemListClick(event) {
    const bag = selectedBag();
    if (!bag) return;
    const alwaysBtn = event.target.closest(".toggle-always");
    if (alwaysBtn) {
      const item = findItem(bag, alwaysBtn.getAttribute("data-id"));
      if (!item) return;
      item.always = !item.always;
      render();
      toast(item.always ? "Pinned as always-pack." : "Moved to optional.");
      return;
    }
    const del = event.target.closest(".delete-item");
    if (del) {
      const item = findItem(bag, del.getAttribute("data-id"));
      if (!item) return;
      if (!window.confirm("Remove “" + item.label + "” from this bag?")) return;
      bag.items = bag.items.filter((row) => row.id !== item.id);
      render();
      toast("Item removed.");
    }
  }

  function onItemListChange(event) {
    const box = event.target.closest(".toggle-pack");
    if (!box) return;
    togglePacked(box.getAttribute("data-id"));
  }

  els.leaveAlwaysList.addEventListener("click", onLeaveClick);
  els.leaveOptionalList.addEventListener("click", onLeaveClick);

  function onLeaveClick(event) {
    const btn = event.target.closest(".leave-check");
    if (!btn) return;
    togglePacked(btn.getAttribute("data-id"));
  }

  els.addItemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const bag = selectedBag();
    if (!bag) return;
    const label = clip(els.newItem.value, 40);
    if (!label) {
      toast("Name the item first.");
      return;
    }
    bag.items.push({
      id: uid(),
      label,
      always: !!els.newItemAlways.checked,
      packed: false,
    });
    els.newItem.value = "";
    els.newItemAlways.checked = true;
    render();
    toast("Added to the bag.");
  });

  els.templateRow.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-template]");
    if (!btn) return;
    draftTemplate = btn.getAttribute("data-template");
    const tpl = TEMPLATES[draftTemplate];
    const f = els.bagForm;
    if (tpl && !f.id.value) {
      if (!f.name.value || Object.values(TEMPLATES).some((row) => row.name === f.name.value)) {
        f.name.value = tpl.name === "Blank" ? "" : tpl.name;
      }
      if (!f.dayHint.value) f.dayHint.value = tpl.dayHint;
    }
    Array.from(els.templateRow.querySelectorAll("[data-template]")).forEach((chip) => {
      chip.setAttribute("aria-pressed", chip === btn ? "true" : "false");
    });
  });

  els.bagForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const f = els.bagForm;
    const saved = upsertBag(
      {
        id: f.id.value,
        name: f.name.value,
        dayHint: f.dayHint.value,
        kid: f.kid.value,
        notes: f.notes.value,
      },
      f.id.value ? null : draftTemplate
    );
    if (!saved) {
      toast("Need a bag name.");
      return;
    }
    els.bagDialog.close();
    setView("bag", selectedId);
    toast(f.id.value ? "Bag updated." : "Bag is on the porch.");
  });

  document.getElementById("btnAdd").addEventListener("click", () => openBagDialog(null));
  document.getElementById("btnEmptyAdd").addEventListener("click", () => openBagDialog(null));
  document.getElementById("btnMobileAdd").addEventListener("click", () => openBagDialog(null));
  document.getElementById("btnStarters").addEventListener("click", loadStarters);
  document.getElementById("btnCancelBag").addEventListener("click", () => els.bagDialog.close());
  document.getElementById("btnAbout").addEventListener("click", () => els.aboutDialog.showModal());
  document.getElementById("btnCloseAbout").addEventListener("click", () => els.aboutDialog.close());
  document.getElementById("btnBackHome").addEventListener("click", () => setView("home"));
  document.getElementById("btnLeaveFromBag").addEventListener("click", () => setView("leave", selectedId));
  document.getElementById("btnLeaveBack").addEventListener("click", () => setView("bag", selectedId));
  document.getElementById("btnLeaveDone").addEventListener("click", () => setView("home"));

  document.getElementById("btnEditBag").addEventListener("click", () => {
    const bag = selectedBag();
    if (bag) openBagDialog(bag);
  });

  document.getElementById("btnDeleteBag").addEventListener("click", () => {
    const bag = selectedBag();
    if (!bag) return;
    if (!window.confirm("Delete “" + bag.name + "”? This cannot be undone on this device.")) return;
    state.bags = state.bags.filter((row) => row.id !== bag.id);
    selectedId = "";
    setView("home");
    toast("Bag removed.");
  });

  function resetSelected() {
    const bag = selectedBag();
    if (!bag) return;
    resetBag(bag);
    render();
    toast("Checks cleared. Always-pack is still listed.");
  }

  document.getElementById("btnResetBag").addEventListener("click", resetSelected);
  document.getElementById("btnLeaveReset").addEventListener("click", resetSelected);

  document.getElementById("btnShare").addEventListener("click", async () => {
    if (!state.bags.length) {
      toast("Add a bag before sharing a snapshot.");
      return;
    }
    const url = await encodeShare();
    try {
      await navigator.clipboard.writeText(url);
      toast("Copied — snapshot link, not live sync.", 3600);
    } catch (_) {
      window.prompt("Copy this snapshot share link (not live sync):", url);
    }
  });

  document.getElementById("btnReset").addEventListener("click", () => {
    if (!window.confirm("Erase Practice Pack on this device? Snapshot-share first if you want the bags back.")) return;
    state = { v: 1, bags: [] };
    selectedId = "";
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
    setView("home");
    toast("This device is empty again.");
  });

  async function boot() {
    const fromShare = await tryImportHash();
    const stored = loadStored();
    if (fromShare) {
      state = fromShare;
      save();
      setView("home");
      toast("Loaded a shared snapshot. Edits stay on this device until you share again.", 3800);
      return;
    }
    if (stored) {
      state = stored;
      setView("home");
      return;
    }
    state = { v: 1, bags: starterBags() };
    setView("home");
    toast("Starter bags are on the porch. Edit or delete any of them.", 3600);
  }

  boot();
})();
