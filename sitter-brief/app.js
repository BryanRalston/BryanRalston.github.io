(() => {
  const STORAGE_KEY = "sitter-brief-v1";
  const HASH_PREFIX = "#b=";

  const els = {
    storageFail: document.getElementById("storageFail"),
    emptyState: document.getElementById("emptyState"),
    briefApp: document.getElementById("briefApp"),
    profileChips: document.getElementById("profileChips"),
    profileInput: document.getElementById("profileInput"),
    returnInput: document.getElementById("returnInput"),
    returnStampTime: document.getElementById("returnStampTime"),
    returnStamp: document.getElementById("returnStamp"),
    kidsList: document.getElementById("kidsList"),
    contactsList: document.getElementById("contactsList"),
    addKidForm: document.getElementById("addKidForm"),
    newKidName: document.getElementById("newKidName"),
    newKidNotes: document.getElementById("newKidNotes"),
    addContactForm: document.getElementById("addContactForm"),
    newContactName: document.getElementById("newContactName"),
    newContactPhone: document.getElementById("newContactPhone"),
    newContactNote: document.getElementById("newContactNote"),
    bedtimeInput: document.getElementById("bedtimeInput"),
    foodInput: document.getElementById("foodInput"),
    wifiNameInput: document.getElementById("wifiNameInput"),
    wifiPassInput: document.getElementById("wifiPassInput"),
    houseInput: document.getElementById("houseInput"),
    printSheet: document.getElementById("printSheet"),
    aboutDialog: document.getElementById("aboutDialog"),
    shareDialog: document.getElementById("shareDialog"),
    shareUrlBox: document.getElementById("shareUrlBox"),
    toast: document.getElementById("toast"),
    mobileCta: document.getElementById("mobileCta"),
    btnMobilePrimary: document.getElementById("btnMobilePrimary"),
  };

  let storageOk = true;
  let state = emptyStore();
  let toastTimer = 0;

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clip(value, max) {
    return String(value || "").slice(0, max);
  }

  function clampText(value, max) {
    return clip(value, max).trim();
  }

  function emptyStore() {
    return { v: 1, activeId: "", briefs: [] };
  }

  function blankBrief(profile) {
    return {
      id: uid(),
      profile: clampText(profile, 48) || "Sitter brief",
      returnTime: "",
      kids: [],
      bedtime: "",
      food: "",
      contacts: [],
      wifiName: "",
      wifiPass: "",
      house: "",
      sample: false,
    };
  }

  function sampleBriefs() {
    const saturday = blankBrief("Saturday sitter");
    saturday.returnTime = "21:30";
    saturday.kids = [
      { id: uid(), name: "Kid A", notes: "age 7 — example, blue night light" },
      { id: uid(), name: "Kid B", notes: "age 4 — example, stuffed fox on the bed" },
    ];
    saturday.bedtime = "Kid A 8:00, Kid B 7:30. Story, water, night light. Example routine only.";
    saturday.food = "Kid A — no peanuts (example allergy). Leftover pasta in the fridge. Kid B can have apple slices.";
    saturday.contacts = [
      { id: uid(), name: "Parent A", phone: "555-0100", note: "example — call first" },
      { id: uid(), name: "Neighbor", phone: "555-0199", note: "example next door" },
    ];
    saturday.wifiName = "ExampleNet";
    saturday.wifiPass = "example-password";
    saturday.house = "Back door sticks. Trash goes out Thursday. Example house only.";
    saturday.sample = true;

    const grandma = blankBrief("Grandma");
    grandma.returnTime = "17:00";
    grandma.kids = [
      { id: uid(), name: "Kid A", notes: "age 7 — example" },
    ];
    grandma.bedtime = "Nap if needed around 1:30. Regular bedtime is your call. Example only.";
    grandma.food = "Same as usual. No peanuts (Kid A, example).";
    grandma.contacts = [
      { id: uid(), name: "Parent A", phone: "555-0100", note: "example" },
    ];
    grandma.wifiName = "ExampleNet";
    grandma.wifiPass = "example-password";
    grandma.house = "Extra snacks in the pantry. Example only.";
    grandma.sample = true;

    return [saturday, grandma];
  }

  function normalizeKid(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = clampText(raw.name, 40);
    const notes = clampText(raw.notes, 120);
    if (!name && !notes) return null;
    return {
      id: clip(raw.id, 64) || uid(),
      name: name || "Kid",
      notes,
    };
  }

  function normalizeContact(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = clampText(raw.name, 40);
    const phone = clampText(raw.phone, 40);
    const note = clampText(raw.note, 80);
    if (!name && !phone) return null;
    return {
      id: clip(raw.id, 64) || uid(),
      name: name || "Contact",
      phone,
      note,
    };
  }

  function normalizeBrief(raw) {
    if (!raw || typeof raw !== "object") return null;
    const kids = Array.isArray(raw.kids) ? raw.kids.map(normalizeKid).filter(Boolean) : [];
    const contacts = Array.isArray(raw.contacts) ? raw.contacts.map(normalizeContact).filter(Boolean) : [];
    const returnTime = typeof raw.returnTime === "string" && /^\d{2}:\d{2}$/.test(raw.returnTime)
      ? raw.returnTime
      : "";
    return {
      id: clip(raw.id, 64) || uid(),
      profile: clampText(raw.profile, 48) || "Sitter brief",
      returnTime,
      kids,
      bedtime: clampText(raw.bedtime, 400),
      food: clampText(raw.food, 400),
      contacts,
      wifiName: clampText(raw.wifiName, 64),
      wifiPass: clampText(raw.wifiPass, 64),
      house: clampText(raw.house, 400),
      sample: !!raw.sample,
    };
  }

  function normalizeStore(raw) {
    if (!raw || typeof raw !== "object") return emptyStore();
    if (raw.brief && !Array.isArray(raw.briefs)) {
      const brief = normalizeBrief(raw.brief);
      return brief ? { v: 1, activeId: brief.id, briefs: [brief] } : emptyStore();
    }
    const briefs = Array.isArray(raw.briefs) ? raw.briefs.map(normalizeBrief).filter(Boolean) : [];
    const activeId = briefs.some((b) => b.id === raw.activeId)
      ? raw.activeId
      : briefs[0]
        ? briefs[0].id
        : "";
    return { v: 1, activeId, briefs };
  }

  function toast(message, ms) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), ms || 2800);
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
      "Sitter Brief cannot save on this device. Browser storage is blocked" +
      (reason ? " (" + reason + ")" : "") +
      ". The brief will not persist.";
  }

  function loadStored() {
    if (!probeStorage()) {
      failStorage();
      return null;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalizeStore(JSON.parse(raw));
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

  function activeBrief() {
    return state.briefs.find((b) => b.id === state.activeId) || state.briefs[0] || null;
  }

  function sharePayload() {
    const brief = activeBrief();
    return { v: 1, brief };
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
      const incoming = JSON.parse(json);
      history.replaceState(null, "", location.pathname + location.search);
      return incoming;
    } catch (_) {
      history.replaceState(null, "", location.pathname + location.search);
      toast("That snapshot link could not be read.", 3200);
      return null;
    }
  }

  function mergeImported(incoming) {
    const imported = normalizeStore(incoming);
    if (!imported.briefs.length) return false;
    imported.briefs.forEach((brief) => {
      const idx = state.briefs.findIndex((row) => row.id === brief.id);
      if (idx >= 0) state.briefs[idx] = brief;
      else state.briefs.push(brief);
    });
    state.activeId = imported.activeId || imported.briefs[0].id;
    return true;
  }

  function formatTime(hhmm) {
    if (!hhmm) return "—";
    const parts = hhmm.split(":").map(Number);
    if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return hhmm;
    const dt = new Date(1970, 0, 1, parts[0], parts[1]);
    return dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readFields() {
    const brief = activeBrief();
    if (!brief) return;
    brief.profile = clampText(els.profileInput.value, 48) || "Sitter brief";
    brief.returnTime = els.returnInput.value || "";
    brief.bedtime = clampText(els.bedtimeInput.value, 400);
    brief.food = clampText(els.foodInput.value, 400);
    brief.wifiName = clampText(els.wifiNameInput.value, 64);
    brief.wifiPass = clampText(els.wifiPassInput.value, 64);
    brief.house = clampText(els.houseInput.value, 400);
  }

  function persist() {
    readFields();
    renderPrint();
    save();
    renderStamp();
    renderChips();
    document.title = (activeBrief() ? activeBrief().profile : "Sitter Brief") + " · Sitter Brief";
  }

  function renderStamp() {
    const brief = activeBrief();
    els.returnStampTime.textContent = brief ? formatTime(brief.returnTime) : "—";
    els.returnStamp.title = brief && brief.returnTime
      ? "Back by " + formatTime(brief.returnTime)
      : "Return time not set";
  }

  function renderChips() {
    els.profileChips.innerHTML = state.briefs
      .map((brief) => {
        return (
          "<button type=\"button\" class=\"chip\" role=\"tab\" data-id=\"" +
          escapeHtml(brief.id) +
          "\" aria-pressed=\"" +
          (brief.id === state.activeId) +
          "\">" +
          escapeHtml(brief.profile) +
          "</button>"
        );
      })
      .join("");
  }

  function renderKids() {
    const brief = activeBrief();
    if (!brief) {
      els.kidsList.innerHTML = "";
      return;
    }
    if (!brief.kids.length) {
      els.kidsList.innerHTML = "<li class=\"row-empty\">No kids on this brief yet.</li>";
      return;
    }
    els.kidsList.innerHTML = brief.kids
      .map((kid) => {
        return (
          "<li class=\"row-card\" data-id=\"" +
          escapeHtml(kid.id) +
          "\">" +
          "<div class=\"row-fields kid\">" +
          "<input class=\"kid-name\" maxlength=\"40\" value=\"" +
          escapeHtml(kid.name) +
          "\" aria-label=\"Kid name\" />" +
          "<input class=\"kid-notes\" maxlength=\"120\" value=\"" +
          escapeHtml(kid.notes) +
          "\" aria-label=\"Age or notes\" placeholder=\"Age / notes\" />" +
          "</div>" +
          "<button type=\"button\" class=\"remove-row no-print\" aria-label=\"Remove " +
          escapeHtml(kid.name) +
          "\">✕</button></li>"
        );
      })
      .join("");
  }

  function renderContacts() {
    const brief = activeBrief();
    if (!brief) {
      els.contactsList.innerHTML = "";
      return;
    }
    if (!brief.contacts.length) {
      els.contactsList.innerHTML = "<li class=\"row-empty\">No contacts yet. Add who they should call.</li>";
      return;
    }
    els.contactsList.innerHTML = brief.contacts
      .map((contact) => {
        return (
          "<li class=\"row-card\" data-id=\"" +
          escapeHtml(contact.id) +
          "\">" +
          "<div class=\"row-fields contact\">" +
          "<input class=\"contact-name\" maxlength=\"40\" value=\"" +
          escapeHtml(contact.name) +
          "\" aria-label=\"Contact name\" />" +
          "<input class=\"contact-phone\" maxlength=\"40\" value=\"" +
          escapeHtml(contact.phone) +
          "\" aria-label=\"Phone\" />" +
          "<input class=\"contact-note\" maxlength=\"80\" value=\"" +
          escapeHtml(contact.note) +
          "\" aria-label=\"Note\" placeholder=\"Note\" />" +
          "</div>" +
          "<button type=\"button\" class=\"remove-row no-print\" aria-label=\"Remove " +
          escapeHtml(contact.name) +
          "\">✕</button></li>"
        );
      })
      .join("");
  }

  function renderFields() {
    const brief = activeBrief();
    if (!brief) return;
    els.profileInput.value = brief.profile;
    els.returnInput.value = brief.returnTime;
    els.bedtimeInput.value = brief.bedtime;
    els.foodInput.value = brief.food;
    els.wifiNameInput.value = brief.wifiName;
    els.wifiPassInput.value = brief.wifiPass;
    els.houseInput.value = brief.house;
    document.title = brief.profile + " · Sitter Brief";
  }

  function printLines(text, empty) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return "<p class=\"muted\">" + escapeHtml(empty) + "</p>";
    return trimmed
      .split(/\n+/)
      .map((line) => "<p>" + escapeHtml(line) + "</p>")
      .join("");
  }

  function renderPrint() {
    const brief = activeBrief();
    if (!brief) {
      els.printSheet.innerHTML = "<h1>Sitter Brief</h1><p class=\"muted\">Nothing on this device.</p>";
      return;
    }
    const kids = brief.kids.length
      ? "<ul>" +
        brief.kids
          .map((kid) => {
            const extra = kid.notes ? " — " + escapeHtml(kid.notes) : "";
            return "<li><strong>" + escapeHtml(kid.name) + "</strong>" + extra + "</li>";
          })
          .join("") +
        "</ul>"
      : "<p class=\"muted\">No kids listed.</p>";
    const contacts = brief.contacts.length
      ? "<ul>" +
        brief.contacts
          .map((c) => {
            const bits = [c.phone, c.note].filter(Boolean).map(escapeHtml).join(" · ");
            return "<li><strong>" + escapeHtml(c.name) + "</strong>" + (bits ? " — " + bits : "") + "</li>";
          })
          .join("") +
        "</ul>"
      : "<p class=\"muted\">No emergency contacts listed.</p>";
    const wifi = brief.wifiName || brief.wifiPass
      ? "<div class=\"pair\"><p><strong>Network</strong><br>" +
        escapeHtml(brief.wifiName || "—") +
        "</p><p><strong>Password</strong><br>" +
        escapeHtml(brief.wifiPass || "—") +
        "</p></div>"
      : "<p class=\"muted\">Wifi not listed.</p>";
    els.printSheet.innerHTML =
      "<div class=\"mast\">" +
      "<div><p class=\"eyebrow\">Sitter Brief</p><h1>" +
      escapeHtml(brief.profile) +
      "</h1></div>" +
      "<div class=\"back-by\"><span>Back by</span><strong>" +
      escapeHtml(formatTime(brief.returnTime)) +
      "</strong></div></div>" +
      "<h2>Kids</h2>" +
      kids +
      "<h2>Bedtime / routine</h2>" +
      printLines(brief.bedtime, "No bedtime notes.") +
      "<h2>Food / allergies</h2>" +
      printLines(brief.food, "No food notes.") +
      "<h2>Emergency contacts</h2>" +
      contacts +
      "<h2>Wifi</h2>" +
      wifi +
      "<h2>House notes</h2>" +
      printLines(brief.house, "No house notes.");
  }

  function summaryText() {
    const brief = activeBrief();
    if (!brief) return "";
    const lines = [
      "SITTER BRIEF — " + brief.profile,
      "Back by " + formatTime(brief.returnTime),
      "",
      "KIDS",
    ];
    if (brief.kids.length) {
      brief.kids.forEach((kid) => {
        lines.push("• " + kid.name + (kid.notes ? " — " + kid.notes : ""));
      });
    } else {
      lines.push("• None listed");
    }
    lines.push("", "BEDTIME / ROUTINE", brief.bedtime || "None listed");
    lines.push("", "FOOD / ALLERGIES", brief.food || "None listed");
    lines.push("", "EMERGENCY CONTACTS");
    if (brief.contacts.length) {
      brief.contacts.forEach((c) => {
        const bits = [c.phone, c.note].filter(Boolean).join(" · ");
        lines.push("• " + c.name + (bits ? " — " + bits : ""));
      });
    } else {
      lines.push("• None listed");
    }
    lines.push("", "WIFI");
    if (brief.wifiName || brief.wifiPass) {
      lines.push((brief.wifiName || "—") + " / " + (brief.wifiPass || "—"));
    } else {
      lines.push("None listed");
    }
    lines.push("", "HOUSE NOTES", brief.house || "None listed");
    return lines.join("\n");
  }

  function render() {
    const virgin = state.briefs.length === 0;
    els.emptyState.hidden = !virgin;
    els.briefApp.hidden = virgin;
    els.mobileCta.hidden = !virgin;
    document.body.classList.toggle("has-cta", virgin);
    els.btnMobilePrimary.textContent = "Write a brief";
    if (virgin) document.title = "Sitter Brief";
    renderStamp();
    if (!virgin) {
      renderChips();
      renderFields();
      renderKids();
      renderContacts();
    }
    renderPrint();
    save();
  }

  function startBlank() {
    const brief = blankBrief("Sitter brief");
    state.briefs.push(brief);
    state.activeId = brief.id;
    render();
    window.setTimeout(() => els.profileInput.focus(), 10);
    toast("Blank brief — fill, then print or share.");
  }

  function loadSamples() {
    if (state.briefs.length) {
      if (!window.confirm("Add labeled example briefs (Kid A / Kid B) to this device?")) return;
    }
    const samples = sampleBriefs();
    state.briefs = state.briefs.concat(samples);
    state.activeId = samples[0].id;
    render();
    toast("Example briefs loaded — Kid A / Kid B, fake sample data.", 3400);
  }

  function switchBrief(id) {
    readFields();
    if (!state.briefs.some((b) => b.id === id)) return;
    state.activeId = id;
    render();
  }

  function addKid(name, notes) {
    const brief = activeBrief();
    if (!brief) return;
    const kid = normalizeKid({ id: uid(), name, notes });
    if (!kid) {
      toast("Need a kid name or a note.");
      return;
    }
    brief.kids.push(kid);
    render();
    toast("Kid added.");
  }

  function addContact(name, phone, note) {
    const brief = activeBrief();
    if (!brief) return;
    const contact = normalizeContact({ id: uid(), name, phone, note });
    if (!contact) {
      toast("Need a name or a phone.");
      return;
    }
    brief.contacts.push(contact);
    render();
    toast("Contact added.");
  }

  function deleteBrief() {
    const brief = activeBrief();
    if (!brief) return;
    if (!window.confirm("Delete “" + brief.profile + "”? This cannot be undone on this device.")) return;
    state.briefs = state.briefs.filter((row) => row.id !== brief.id);
    state.activeId = state.briefs[0] ? state.briefs[0].id : "";
    render();
    toast("Brief removed.");
  }

  function resetDevice() {
    if (!window.confirm("Erase Sitter Brief on this device? Snapshot-share first if you want a brief back.")) return;
    state = emptyStore();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
    render();
    toast("This device is empty again.");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      try {
        window.prompt("Copy this text:", text);
        return true;
      } catch (__) {
        return false;
      }
    }
  }

  async function shareSnapshot() {
    if (!activeBrief()) {
      toast("Write a brief before sharing a snapshot.");
      return;
    }
    readFields();
    save();
    const url = await encodeShare();
    els.shareUrlBox.value = url;
    if (navigator.share) {
      try {
        await navigator.share({
          title: activeBrief().profile + " · Sitter Brief",
          text: "Sitter Brief snapshot — not live sync",
          url,
        });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    const copied = await copyText(url);
    els.shareDialog.showModal();
    els.shareUrlBox.focus();
    els.shareUrlBox.select();
    toast(
      copied
        ? "Copied a snapshot — not live sync. Send a fresh link after edits."
        : "Snapshot ready — copy the link. Not live sync.",
      3600
    );
  }

  ["profileInput", "returnInput", "bedtimeInput", "foodInput", "wifiNameInput", "wifiPassInput", "houseInput"].forEach((key) => {
    els[key].addEventListener("input", persist);
    els[key].addEventListener("change", persist);
  });

  els.addKidForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addKid(els.newKidName.value, els.newKidNotes.value);
    els.addKidForm.reset();
    els.newKidName.focus();
  });

  els.addContactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addContact(els.newContactName.value, els.newContactPhone.value, els.newContactNote.value);
    els.addContactForm.reset();
    els.newContactName.focus();
  });

  els.kidsList.addEventListener("input", (event) => {
    const row = event.target.closest(".row-card");
    const brief = activeBrief();
    if (!row || !brief) return;
    const kid = brief.kids.find((k) => k.id === row.getAttribute("data-id"));
    if (!kid) return;
    if (event.target.classList.contains("kid-name")) kid.name = clip(event.target.value, 40);
    if (event.target.classList.contains("kid-notes")) kid.notes = clip(event.target.value, 120);
    persist();
  });

  els.kidsList.addEventListener("change", (event) => {
    const row = event.target.closest(".row-card");
    const brief = activeBrief();
    if (!row || !brief) return;
    const kid = brief.kids.find((k) => k.id === row.getAttribute("data-id"));
    if (!kid) return;
    if (event.target.classList.contains("kid-name")) {
      kid.name = clampText(event.target.value, 40) || "Kid";
      renderKids();
      persist();
    }
    if (event.target.classList.contains("kid-notes")) {
      kid.notes = clampText(event.target.value, 120);
      persist();
    }
  });

  els.kidsList.addEventListener("click", (event) => {
    const btn = event.target.closest(".remove-row");
    if (!btn) return;
    const brief = activeBrief();
    const row = btn.closest(".row-card");
    if (!brief || !row) return;
    brief.kids = brief.kids.filter((k) => k.id !== row.getAttribute("data-id"));
    renderKids();
    persist();
    toast("Kid removed.");
  });

  els.contactsList.addEventListener("input", (event) => {
    const row = event.target.closest(".row-card");
    const brief = activeBrief();
    if (!row || !brief) return;
    const contact = brief.contacts.find((c) => c.id === row.getAttribute("data-id"));
    if (!contact) return;
    if (event.target.classList.contains("contact-name")) contact.name = clip(event.target.value, 40);
    if (event.target.classList.contains("contact-phone")) contact.phone = clip(event.target.value, 40);
    if (event.target.classList.contains("contact-note")) contact.note = clip(event.target.value, 80);
    persist();
  });

  els.contactsList.addEventListener("change", (event) => {
    const row = event.target.closest(".row-card");
    const brief = activeBrief();
    if (!row || !brief) return;
    const contact = brief.contacts.find((c) => c.id === row.getAttribute("data-id"));
    if (!contact) return;
    if (event.target.classList.contains("contact-name")) {
      contact.name = clampText(event.target.value, 40) || "Contact";
      renderContacts();
      persist();
    }
    if (event.target.classList.contains("contact-phone")) {
      contact.phone = clampText(event.target.value, 40);
      persist();
    }
    if (event.target.classList.contains("contact-note")) {
      contact.note = clampText(event.target.value, 80);
      persist();
    }
  });

  els.contactsList.addEventListener("click", (event) => {
    const btn = event.target.closest(".remove-row");
    if (!btn) return;
    const brief = activeBrief();
    const row = btn.closest(".row-card");
    if (!brief || !row) return;
    brief.contacts = brief.contacts.filter((c) => c.id !== row.getAttribute("data-id"));
    renderContacts();
    persist();
    toast("Contact removed.");
  });

  els.profileChips.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-id]");
    if (!btn) return;
    switchBrief(btn.getAttribute("data-id"));
  });

  document.getElementById("btnEmptyWrite").addEventListener("click", startBlank);
  document.getElementById("btnNewBrief").addEventListener("click", startBlank);
  document.getElementById("btnSample").addEventListener("click", loadSamples);
  document.getElementById("btnDeleteBrief").addEventListener("click", deleteBrief);
  document.getElementById("btnReset").addEventListener("click", resetDevice);
  document.getElementById("btnAbout").addEventListener("click", () => els.aboutDialog.showModal());
  document.getElementById("btnCloseAbout").addEventListener("click", () => els.aboutDialog.close());
  document.getElementById("btnShare").addEventListener("click", () => {
    shareSnapshot();
  });
  document.getElementById("btnCopyShare").addEventListener("click", async () => {
    const copied = await copyText(els.shareUrlBox.value);
    toast(copied ? "Copied a snapshot — not live sync." : "Select the link and copy it.", 2800);
  });
  document.getElementById("btnCloseShare").addEventListener("click", () => els.shareDialog.close());
  document.getElementById("btnCopyText").addEventListener("click", async () => {
    if (!activeBrief()) {
      toast("Write a brief first.");
      return;
    }
    readFields();
    const copied = await copyText(summaryText());
    toast(copied ? "Copied a text summary of this brief." : "Could not copy the summary.", 3000);
  });
  document.getElementById("btnPrint").addEventListener("click", () => {
    if (!activeBrief()) {
      toast("Write a brief before printing.");
      return;
    }
    readFields();
    renderPrint();
    window.print();
  });
  els.btnMobilePrimary.addEventListener("click", () => {
    if (!activeBrief()) {
      startBlank();
      return;
    }
    readFields();
    renderPrint();
    window.print();
  });

  async function boot() {
    const stored = loadStored();
    if (stored) state = stored;
    const fromShare = await tryImportHash();
    if (fromShare) {
      mergeImported(fromShare);
      save();
      render();
      toast("Loaded a shared snapshot. Edits stay on this device until you share again.", 3800);
      return;
    }
    render();
  }

  boot();
})();
