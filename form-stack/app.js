(() => {
  const STORAGE_KEY = "form-stack-v1";
  const HASH_PREFIX = "#f=";
  const PHOTO_MAX = 720;
  const PHOTO_QUALITY = 0.62;
  const PHOTO_MAX_CHARS = 180000;

  const CATEGORIES = [
    { id: "permission", label: "Permission" },
    { id: "health", label: "Health" },
    { id: "volunteer", label: "Volunteer" },
    { id: "other", label: "Other" },
  ];

  const STATUSES = [
    { id: "need-print", label: "Need print" },
    { id: "need-signature", label: "Need signature" },
    { id: "signed", label: "Signed" },
    { id: "turned-in", label: "Turned in" },
  ];

  const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
  const STATUS_IDS = STATUSES.map((s) => s.id);

  const els = {
    storageFail: document.getElementById("storageFail"),
    dueStamp: document.getElementById("dueStamp"),
    dueCount: document.getElementById("dueCount"),
    dueLabel: document.getElementById("dueLabel"),
    weekSection: document.getElementById("weekSection"),
    weekList: document.getElementById("weekList"),
    weekEmpty: document.getElementById("weekEmpty"),
    weekMeta: document.getElementById("weekMeta"),
    filters: document.getElementById("filters"),
    emptyState: document.getElementById("emptyState"),
    filterEmpty: document.getElementById("filterEmpty"),
    formList: document.getElementById("formList"),
    kidChips: document.getElementById("kidChips"),
    statusChips: document.getElementById("statusChips"),
    kidList: document.getElementById("kidList"),
    formDialog: document.getElementById("formDialog"),
    formForm: document.getElementById("formForm"),
    formDialogTitle: document.getElementById("formDialogTitle"),
    btnDeleteForm: document.getElementById("btnDeleteForm"),
    btnClearPhoto: document.getElementById("btnClearPhoto"),
    photoInput: document.getElementById("photoInput"),
    photoPreview: document.getElementById("photoPreview"),
    photoHint: document.getElementById("photoHint"),
    aboutDialog: document.getElementById("aboutDialog"),
    printSheet: document.getElementById("printSheet"),
    toast: document.getElementById("toast"),
  };

  let storageOk = true;
  let state = { v: 1, forms: [] };
  let filters = { kid: "all", status: "all" };
  let draftPhoto = "";
  let toastTimer = 0;

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function todayISO() {
    const now = new Date();
    return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
  }

  function addDaysISO(iso, days) {
    const dt = parseISODate(iso);
    dt.setDate(dt.getDate() + days);
    return dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate());
  }

  function parseISODate(iso) {
    const parts = String(iso || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return new Date(NaN);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function daysUntil(iso) {
    const a = parseISODate(todayISO());
    const b = parseISODate(iso);
    return Math.round((b.getTime() - a.getTime()) / 86400000);
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

  function categoryLabel(id) {
    const found = CATEGORIES.find((c) => c.id === id);
    return found ? found.label : id;
  }

  function statusLabel(id) {
    const found = STATUSES.find((s) => s.id === id);
    return found ? found.label : id;
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
      "Form Stack cannot save on this device. Browser storage is blocked" +
      (reason ? " (" + reason + ")" : "") +
      ". Forms will not persist.";
  }

  function normalizeForm(raw) {
    if (!raw || typeof raw !== "object") return null;
    const title = clip(raw.title, 80);
    const kid = clip(raw.kid, 40);
    const due = typeof raw.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.due) ? raw.due : "";
    if (!title || !kid || !due) return null;
    const category = CATEGORY_IDS.includes(raw.category) ? raw.category : "other";
    const status = STATUS_IDS.includes(raw.status) ? raw.status : "need-print";
    const photo = typeof raw.photo === "string" && raw.photo.startsWith("data:image/") ? raw.photo : "";
    return {
      id: clip(raw.id, 64) || uid(),
      title,
      kid,
      due,
      category,
      status,
      notes: clip(raw.notes, 240),
      photo,
      sample: !!raw.sample,
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return { v: 1, forms: [] };
    const list = Array.isArray(raw.forms) ? raw.forms : Array.isArray(raw) ? raw : [];
    return {
      v: 1,
      forms: list.map(normalizeForm).filter(Boolean),
    };
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
    return {
      v: 1,
      forms: state.forms.map((form) => ({
        id: form.id,
        title: form.title,
        kid: form.kid,
        due: form.due,
        category: form.category,
        status: form.status,
        notes: form.notes,
        sample: form.sample,
      })),
    };
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

  function loadImageFallback(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that image"));
      };
      img.src = url;
    });
  }

  async function compressToDataUrl(file) {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (_) {
      bitmap = await loadImageFallback(file);
    }
    const scale = bitmap.width > PHOTO_MAX ? PHOTO_MAX / bitmap.width : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);
    if (bitmap.close) bitmap.close();
    let quality = PHOTO_QUALITY;
    let url = canvas.toDataURL("image/jpeg", quality);
    while (url.length > PHOTO_MAX_CHARS && quality > 0.38) {
      quality -= 0.08;
      url = canvas.toDataURL("image/jpeg", quality);
    }
    return url;
  }

  function sampleForms() {
    return [
      {
        id: uid(),
        title: "Field trip permission slip",
        kid: "Kid A",
        due: addDaysISO(todayISO(), 3),
        category: "permission",
        status: "need-signature",
        notes: "Example — needs a parent signature before Friday.",
        photo: "",
        sample: true,
      },
      {
        id: uid(),
        title: "Sports physical",
        kid: "Kid B",
        due: addDaysISO(todayISO(), -1),
        category: "health",
        status: "need-print",
        notes: "Example — clinic form, already overdue.",
        photo: "",
        sample: true,
      },
      {
        id: uid(),
        title: "Library overdue notice",
        kid: "Kid A",
        due: addDaysISO(todayISO(), 6),
        category: "other",
        status: "signed",
        notes: "Example — return or renew.",
        photo: "",
        sample: true,
      },
      {
        id: uid(),
        title: "Classroom volunteer signup",
        kid: "Kid B",
        due: addDaysISO(todayISO(), 12),
        category: "volunteer",
        status: "need-signature",
        notes: "Example — two hour slots next month.",
        photo: "",
        sample: true,
      },
    ];
  }

  function sortedForms(list) {
    return list.slice().sort((a, b) => {
      if (a.due !== b.due) return a.due < b.due ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  }

  function isOpen(form) {
    return form.status !== "turned-in";
  }

  function isOverdue(form) {
    return isOpen(form) && daysUntil(form.due) < 0;
  }

  function isDueSoon(form) {
    if (!isOpen(form)) return false;
    const days = daysUntil(form.due);
    return days <= 7;
  }

  function isThisWeek(form) {
    if (!isOpen(form)) return false;
    const days = daysUntil(form.due);
    return days <= 7;
  }

  function duePhrase(form) {
    const days = daysUntil(form.due);
    if (days < 0) {
      const n = Math.abs(days);
      return n === 1 ? "1 day overdue" : n + " days overdue";
    }
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return "Due in " + days + " days";
  }

  function formatDate(iso) {
    const dt = parseISODate(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  function kids() {
    const names = [];
    state.forms.forEach((form) => {
      if (!names.includes(form.kid)) names.push(form.kid);
    });
    return names.sort((a, b) => a.localeCompare(b));
  }

  function filteredForms() {
    return sortedForms(state.forms).filter((form) => {
      if (filters.kid !== "all" && form.kid !== filters.kid) return false;
      if (filters.status !== "all" && form.status !== filters.status) return false;
      return true;
    });
  }

  function setPhotoPreview(url) {
    draftPhoto = url || "";
    els.photoPreview.src = draftPhoto;
    els.photoPreview.hidden = !draftPhoto;
    els.btnClearPhoto.hidden = !draftPhoto;
    els.photoHint.textContent = draftPhoto
      ? "Compressed for this browser. Snapshot links skip photos."
      : "Compressed and stored in this browser. Snapshot links skip photos.";
  }

  function fillKidList() {
    els.kidList.innerHTML = kids()
      .map((name) => "<option value=\"" + escapeHtml(name) + "\"></option>")
      .join("");
  }

  function renderChips() {
    const kidNames = kids();
    const kidOptions = [{ id: "all", label: "All kids" }].concat(
      kidNames.map((name) => ({ id: name, label: name }))
    );
    els.kidChips.innerHTML = kidOptions
      .map(
        (opt) =>
          "<button type=\"button\" class=\"chip\" data-kid=\"" +
          escapeHtml(opt.id) +
          "\" aria-pressed=\"" +
          (filters.kid === opt.id) +
          "\">" +
          escapeHtml(opt.label) +
          "</button>"
      )
      .join("");
    els.statusChips.innerHTML = [{ id: "all", label: "All statuses" }]
      .concat(STATUSES)
      .map(
        (opt) =>
          "<button type=\"button\" class=\"chip\" data-status=\"" +
          escapeHtml(opt.id) +
          "\" aria-pressed=\"" +
          (filters.status === opt.id) +
          "\">" +
          escapeHtml(opt.label) +
          "</button>"
      )
      .join("");
  }

  function renderHeader() {
    const soon = state.forms.filter(isDueSoon);
    const overdue = state.forms.filter(isOverdue);
    els.dueCount.textContent = String(soon.length);
    els.dueLabel.textContent = soon.length === 1 ? "due soon" : "due soon";
    els.dueStamp.classList.toggle("is-hot", overdue.length > 0);
    els.dueStamp.title = overdue.length
      ? overdue.length + " overdue · " + soon.length + " due in the next 7 days"
      : soon.length + " open form" + (soon.length === 1 ? "" : "s") + " due in the next 7 days";
  }

  function renderWeek() {
    const week = sortedForms(filteredForms().filter(isThisWeek));
    els.weekMeta.textContent = week.length
      ? week.length + (week.length === 1 ? " slip" : " slips")
      : "Clear";
    els.weekEmpty.hidden = week.length > 0;
    els.weekList.innerHTML = week
      .map((form) => {
        const over = isOverdue(form);
        return (
          "<li class=\"week-row" +
          (over ? " is-over" : "") +
          "\">" +
          "<div><strong>" +
          escapeHtml(form.title) +
          "</strong><p class=\"meta\">" +
          escapeHtml(form.kid) +
          " · " +
          escapeHtml(categoryLabel(form.category)) +
          " · " +
          escapeHtml(statusLabel(form.status)) +
          "</p></div>" +
          "<div class=\"when\">" +
          escapeHtml(duePhrase(form)) +
          "</div></li>"
        );
      })
      .join("");
  }

  function renderList() {
    const virgin = state.forms.length === 0;
    const rows = filteredForms();
    els.emptyState.hidden = !virgin;
    els.weekSection.hidden = virgin;
    els.filters.hidden = virgin;
    els.filterEmpty.hidden = virgin || rows.length > 0;
    els.formList.innerHTML = rows
      .map((form) => {
        const over = isOverdue(form);
        const soon = isDueSoon(form) && !over;
        const statusBtns = STATUSES.map((status) => {
          return (
            "<button type=\"button\" class=\"status-btn\" data-id=\"" +
            escapeHtml(form.id) +
            "\" data-status=\"" +
            status.id +
            "\" aria-pressed=\"" +
            (form.status === status.id) +
            "\">" +
            escapeHtml(status.label) +
            "</button>"
          );
        }).join("");
        const sample = form.sample ? "<span class=\"badge\">Example</span> " : "";
        const notes = form.notes ? "<p class=\"notes\">" + escapeHtml(form.notes) + "</p>" : "";
        const photo = form.photo
          ? "<div class=\"thumb-wrap\"><img class=\"thumb\" src=\"" +
            form.photo +
            "\" alt=\"Photo of " +
            escapeHtml(form.title) +
            "\" /></div>"
          : "";
        return (
          "<li>" +
          "<article class=\"form-card cat-" +
          escapeHtml(form.category) +
          (over ? " is-over" : "") +
          "\" data-id=\"" +
          escapeHtml(form.id) +
          "\">" +
          "<div class=\"form-card-head\">" +
          "<div><h3 class=\"form-title\">" +
          sample +
          escapeHtml(form.title) +
          "</h3><p class=\"meta\">" +
          escapeHtml(form.kid) +
          " · " +
          escapeHtml(categoryLabel(form.category)) +
          " · " +
          escapeHtml(formatDate(form.due)) +
          "</p></div>" +
          "<div class=\"due-pill" +
          (over ? " is-over" : soon ? " is-soon" : "") +
          "\">" +
          escapeHtml(duePhrase(form)) +
          "</div></div>" +
          "<div class=\"status-row\">" +
          statusBtns +
          "</div>" +
          notes +
          photo +
          "<div class=\"card-actions\">" +
          "<button type=\"button\" class=\"tiny edit-form\" data-id=\"" +
          escapeHtml(form.id) +
          "\">Edit</button>" +
          "<button type=\"button\" class=\"tiny danger delete-form\" data-id=\"" +
          escapeHtml(form.id) +
          "\">Delete</button>" +
          "</div></article></li>"
        );
      })
      .join("");
  }

  function renderPrint() {
    const week = sortedForms(state.forms.filter(isThisWeek));
    const rows = week
      .map((form) => {
        return (
          "<tr><td>" +
          escapeHtml(form.title) +
          "</td><td>" +
          escapeHtml(form.kid) +
          "</td><td>" +
          escapeHtml(formatDate(form.due)) +
          "</td><td>" +
          escapeHtml(duePhrase(form)) +
          "</td><td>" +
          escapeHtml(statusLabel(form.status)) +
          "</td></tr>"
        );
      })
      .join("");
    els.printSheet.innerHTML =
      "<h1>Form Stack — due this week</h1>" +
      "<p class=\"meta\">Printed " +
      escapeHtml(formatDate(todayISO())) +
      ". Snapshot of this device only. " +
      (week.length ? week.length + " open slip" + (week.length === 1 ? "" : "s") + "." : "Nothing due.") +
      "</p>" +
      "<table><thead><tr><th>Form</th><th>Kid</th><th>Due</th><th></th><th>Status</th></tr></thead><tbody>" +
      (rows || "<tr><td colspan=\"5\">Nothing due in the next 7 days.</td></tr>") +
      "</tbody></table>";
  }

  function render() {
    renderHeader();
    renderChips();
    fillKidList();
    renderWeek();
    renderList();
    renderPrint();
    save();
  }

  function upsertForm(payload) {
    const next = normalizeForm(payload);
    if (!next) return false;
    const idx = state.forms.findIndex((form) => form.id === next.id);
    if (idx >= 0) state.forms[idx] = next;
    else state.forms.push(next);
    return true;
  }

  function deleteForm(id) {
    const form = state.forms.find((row) => row.id === id);
    if (!form) return;
    if (!window.confirm("Delete “" + form.title + "”? This cannot be undone on this device.")) return;
    state.forms = state.forms.filter((row) => row.id !== id);
    render();
    toast("Form removed.");
  }

  function openFormDialog(form) {
    const f = els.formForm;
    f.reset();
    f.id.value = form ? form.id : "";
    f.title.value = form ? form.title : "";
    f.kid.value = form ? form.kid : "";
    f.due.value = form ? form.due : "";
    f.category.value = form ? form.category : "permission";
    f.status.value = form ? form.status : "need-print";
    f.notes.value = form ? form.notes : "";
    setPhotoPreview(form && form.photo ? form.photo : "");
    els.photoInput.value = "";
    els.formDialogTitle.textContent = form ? "Edit form" : "Add a form";
    els.btnDeleteForm.classList.toggle("hidden", !form);
    fillKidList();
    els.formDialog.showModal();
    window.setTimeout(() => f.title.focus(), 10);
  }

  function loadSamples() {
    if (state.forms.length) {
      if (!window.confirm("Add labeled example forms (Kid A / Kid B) to this device?")) return;
    }
    state.forms = state.forms.concat(sampleForms());
    render();
    toast("Example forms loaded — Kid A / Kid B, fake sample data.", 3400);
  }

  els.kidChips.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-kid]");
    if (!btn) return;
    filters.kid = btn.getAttribute("data-kid");
    render();
  });

  els.statusChips.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-status]");
    if (!btn) return;
    filters.status = btn.getAttribute("data-status");
    render();
  });

  els.formList.addEventListener("click", (event) => {
    const statusBtn = event.target.closest(".status-btn");
    if (statusBtn) {
      const id = statusBtn.getAttribute("data-id");
      const nextStatus = statusBtn.getAttribute("data-status");
      const form = state.forms.find((row) => row.id === id);
      if (!form || !STATUS_IDS.includes(nextStatus)) return;
      form.status = nextStatus;
      render();
      toast("Marked " + statusLabel(nextStatus).toLowerCase() + ".");
      return;
    }
    const del = event.target.closest(".delete-form");
    if (del) {
      deleteForm(del.getAttribute("data-id"));
      return;
    }
    const edit = event.target.closest(".edit-form");
    if (edit) {
      const form = state.forms.find((row) => row.id === edit.getAttribute("data-id"));
      if (form) openFormDialog(form);
    }
  });

  document.getElementById("btnAdd").addEventListener("click", () => openFormDialog(null));
  document.getElementById("btnEmptyAdd").addEventListener("click", () => openFormDialog(null));
  document.getElementById("btnMobileAdd").addEventListener("click", () => openFormDialog(null));
  document.getElementById("btnSample").addEventListener("click", loadSamples);
  document.getElementById("btnCancelForm").addEventListener("click", () => els.formDialog.close());
  document.getElementById("btnAbout").addEventListener("click", () => els.aboutDialog.showModal());
  document.getElementById("btnCloseAbout").addEventListener("click", () => els.aboutDialog.close());

  els.btnDeleteForm.addEventListener("click", () => {
    const id = els.formForm.elements.id.value;
    els.formDialog.close();
    deleteForm(id);
  });

  document.getElementById("btnClearPhoto").addEventListener("click", () => {
    els.photoInput.value = "";
    setPhotoPreview("");
  });

  els.photoInput.addEventListener("change", async () => {
    const file = els.photoInput.files && els.photoInput.files[0];
    if (!file) return;
    try {
      const url = await compressToDataUrl(file);
      setPhotoPreview(url);
      toast("Photo compressed for this device.");
    } catch (_) {
      toast("Could not read or compress that photo.");
      els.photoInput.value = "";
    }
  });

  els.formForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const f = els.formForm;
    const saved = upsertForm({
      id: f.id.value || uid(),
      title: f.title.value,
      kid: f.kid.value,
      due: f.due.value,
      category: f.category.value,
      status: f.status.value,
      notes: f.notes.value,
      photo: draftPhoto,
      sample: false,
    });
    if (!saved) {
      toast("Need a title, kid, and due date.");
      return;
    }
    els.formDialog.close();
    render();
    toast(f.id.value ? "Form updated." : "Form stacked. Due date is on the list.");
  });

  document.getElementById("btnShare").addEventListener("click", async () => {
    if (!state.forms.length) {
      toast("Add a form before sharing a snapshot.");
      return;
    }
    const url = await encodeShare();
    try {
      await navigator.clipboard.writeText(url);
      toast("Copied — snapshot link, not live sync. Photos omitted.", 3600);
    } catch (_) {
      window.prompt("Copy this snapshot share link (not live sync, no photos):", url);
    }
  });

  document.getElementById("btnPrint").addEventListener("click", () => {
    renderPrint();
    window.print();
  });

  document.getElementById("btnReset").addEventListener("click", () => {
    if (!window.confirm("Erase Form Stack on this device? Snapshot-share first if you want the list back.")) return;
    state = { v: 1, forms: [] };
    filters = { kid: "all", status: "all" };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
    render();
    toast("This device is empty again.");
  });

  async function boot() {
    const fromShare = await tryImportHash();
    const stored = loadStored();
    if (fromShare) {
      state = fromShare;
      save();
      render();
      toast("Loaded a shared snapshot (no photos). Edits stay on this device until you share again.", 3800);
      return;
    }
    if (stored) state = stored;
    render();
  }

  boot();
})();
