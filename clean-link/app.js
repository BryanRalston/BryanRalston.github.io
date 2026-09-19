(() => {
  const els = {
    storageFail: document.getElementById("storageFail"),
    pasteField: document.getElementById("pasteField"),
    extractNote: document.getElementById("extractNote"),
    statusLine: document.getElementById("statusLine"),
    resultPanel: document.getElementById("resultPanel"),
    beforeUrl: document.getElementById("beforeUrl"),
    afterUrl: document.getElementById("afterUrl"),
    stripChips: document.getElementById("stripChips"),
    btnCopy: document.getElementById("btnCopy"),
    btnCopyMd: document.getElementById("btnCopyMd"),
    btnOpen: document.getElementById("btnOpen"),
    familyList: document.getElementById("familyList"),
    familyMeta: document.getElementById("familyMeta"),
    historyEmpty: document.getElementById("historyEmpty"),
    historyList: document.getElementById("historyList"),
    btnClearHistory: document.getElementById("btnClearHistory"),
    aboutDialog: document.getElementById("aboutDialog"),
    toast: document.getElementById("toast"),
    mobileCta: document.getElementById("mobileCta"),
    btnMobileCopy: document.getElementById("btnMobileCopy"),
  };

  const SAMPLE = "https://example.com/item?id=42&utm_source=x&fbclid=abc";

  let storageOk = true;
  let state = CleanLink.emptyState();
  let lastResult = null;
  let toastTimer = 0;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toast(message, ms) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), ms || 2600);
  }

  function probeStorage() {
    try {
      const probe = CleanLink.STORAGE_KEY + "-probe";
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
      "Clean Link cannot save on this device. Browser storage is blocked" +
      (reason ? " (" + reason + ")" : "") +
      ". History and toggles will not persist.";
  }

  function loadStored() {
    if (!probeStorage()) {
      failStorage();
      return CleanLink.emptyState();
    }
    try {
      const raw = localStorage.getItem(CleanLink.STORAGE_KEY);
      if (!raw) return CleanLink.emptyState();
      return CleanLink.normalizeState(JSON.parse(raw));
    } catch (err) {
      failStorage(err && err.message ? err.message : "unreadable store");
      return CleanLink.emptyState();
    }
  }

  function save() {
    if (!storageOk) return false;
    try {
      localStorage.setItem(CleanLink.STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      failStorage(err && err.name ? err.name : "write failed");
      return false;
    }
  }

  function setStatus(kind, message) {
    els.statusLine.className = "status is-" + kind;
    els.statusLine.textContent = message;
  }

  function renderHighlight(raw) {
    const parts = CleanLink.highlightParts(raw, state.families);
    if (!parts) {
      els.beforeUrl.textContent = raw;
      return;
    }
    let html = escapeHtml(parts.originAndPath);
    parts.params.forEach((param) => {
      const piece =
        escapeHtml(param.name) +
        "=" +
        escapeHtml(param.value);
      html +=
        (param.first ? "?" : "&") +
        "<span class=\"" +
        (param.junk ? "junk" : "keep") +
        "\">" +
        piece +
        "</span>";
    });
    if (parts.hash) {
      html +=
        "<span class=\"" +
        (parts.hashJunk ? "junk" : "keep") +
        "\">" +
        escapeHtml(parts.hash) +
        "</span>";
    }
    els.beforeUrl.innerHTML = html;
  }

  function renderFamilies() {
    const onCount = CleanLink.FAMILIES.filter((family) => state.families[family.id] !== false).length;
    els.familyMeta.textContent = onCount + " of " + CleanLink.FAMILIES.length + " armed";
    els.familyList.innerHTML = CleanLink.FAMILIES.map((family) => {
      const checked = state.families[family.id] !== false ? " checked" : "";
      return (
        "<li><input type=\"checkbox\" id=\"fam-" +
        family.id +
        "\" data-family=\"" +
        family.id +
        "\"" +
        checked +
        " /><label for=\"fam-" +
        family.id +
        "\">" +
        escapeHtml(family.label) +
        "<span>" +
        escapeHtml(family.hint) +
        "</span></label></li>"
      );
    }).join("");
  }

  function relativeTime(iso) {
    if (!iso) return "just now";
    const then = Date.parse(iso);
    if (!Number.isFinite(then)) return "just now";
    const delta = Math.max(0, Date.now() - then);
    const mins = Math.floor(delta / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + "h ago";
    const days = Math.floor(hours / 24);
    return days + "d ago";
  }

  function renderHistory() {
    const rows = state.history;
    els.historyEmpty.hidden = rows.length > 0;
    els.historyList.hidden = rows.length === 0;
    els.btnClearHistory.hidden = rows.length === 0;
    els.historyList.innerHTML = rows
      .map((row, index) => {
        const cut = row.strippedCount
          ? row.strippedCount + (row.strippedCount === 1 ? " tag cut" : " tags cut")
          : "already clean";
        return (
          "<li><p class=\"history-url\">" +
          escapeHtml(row.clean) +
          "</p><p class=\"history-meta\">" +
          escapeHtml(cut) +
          " · " +
          escapeHtml(relativeTime(row.at)) +
          "</p><div class=\"history-actions\">" +
          "<button type=\"button\" class=\"btn ghost hist-copy\" data-index=\"" +
          index +
          "\">Copy</button>" +
          "<button type=\"button\" class=\"btn ghost hist-reuse\" data-index=\"" +
          index +
          "\">Reuse</button>" +
          "<a class=\"btn ghost\" href=\"" +
          escapeHtml(row.clean) +
          "\" target=\"_blank\" rel=\"noopener noreferrer\">Open</a>" +
          "</div></li>"
        );
      })
      .join("");
  }

  function showResult(result, extracted) {
    lastResult = result;
    els.resultPanel.hidden = false;
    els.mobileCta.hidden = false;
    els.mobileCta.classList.add("is-on");
    renderHighlight(extracted.raw);
    els.afterUrl.textContent = result.clean;
    els.btnOpen.href = result.clean;
    if (result.stripped.length) {
      els.stripChips.hidden = false;
      els.stripChips.innerHTML = result.stripped
        .map((row) => "<li>" + escapeHtml(row.name) + "</li>")
        .join("");
    } else {
      els.stripChips.hidden = true;
      els.stripChips.innerHTML = "";
    }
    els.resultPanel.classList.remove("is-snip");
    void els.resultPanel.offsetWidth;
    els.resultPanel.classList.add("is-snip");
  }

  function hideResult() {
    lastResult = null;
    els.resultPanel.hidden = true;
    els.mobileCta.hidden = true;
    els.mobileCta.classList.remove("is-on");
    els.extractNote.hidden = true;
    els.extractNote.textContent = "";
  }

  function applyClean(options) {
    const record = !options || options.record !== false;
    const extracted = CleanLink.extractUrl(els.pasteField.value);
    if (!extracted.ok) {
      hideResult();
      if (extracted.reason === "empty") {
        setStatus("idle", "Drop a messy link. We’ll snip the tracking.");
      } else {
        setStatus("bad", "That doesn’t look like a URL. Paste an http(s) link — or a blob that contains one.");
      }
      return null;
    }

    if (extracted.fromBlob) {
      els.extractNote.hidden = false;
      els.extractNote.textContent = "Pulled the first link from your paste.";
    } else if (extracted.inferred) {
      els.extractNote.hidden = false;
      els.extractNote.textContent = "Added https:// so the browser can parse it.";
    } else {
      els.extractNote.hidden = true;
      els.extractNote.textContent = "";
    }

    const result = CleanLink.cleanUrl(extracted.raw, state.families);
    if (!result.ok) {
      hideResult();
      setStatus("bad", "Couldn’t parse that as an http(s) URL.");
      return null;
    }

    showResult(result, extracted);

    if (!result.changed) {
      setStatus("warn", "Already clean. Nothing to strip.");
    } else {
      const n = result.stripped.length;
      setStatus("ok", n === 1 ? "Cut 1 tracking tag." : "Cut " + n + " tracking tags.");
    }

    if (record) {
      CleanLink.pushHistory(state, result);
      save();
      renderHistory();
    }
    return result;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      try {
        els.pasteField.focus();
        const ok = window.prompt("Copy this clean URL:", text);
        return !!ok;
      } catch (err) {
        return false;
      }
    }
  }

  async function copyClean() {
    if (!lastResult) {
      const result = applyClean({ record: true });
      if (!result) return;
    }
    const copied = await copyText(lastResult.clean);
    toast(copied ? "Copied the clean URL." : "Select and copy the clean URL.", 2800);
  }

  async function copyMarkdown() {
    if (!lastResult) {
      const result = applyClean({ record: true });
      if (!result) return;
    }
    const md = CleanLink.markdownLink(lastResult.clean);
    const copied = await copyText(md);
    toast(copied ? "Copied as a markdown link." : "Select and copy the markdown.", 2800);
  }

  function render() {
    renderFamilies();
    renderHistory();
  }

  document.getElementById("btnClean").addEventListener("click", () => applyClean({ record: true }));
  document.getElementById("btnSample").addEventListener("click", () => {
    els.pasteField.value =
      "Saw this — " + SAMPLE + " — wild how long these get.";
    applyClean({ record: true });
    toast("Sample loaded. id=42 stays. Tracking goes.");
  });
  document.getElementById("btnClearPaste").addEventListener("click", () => {
    els.pasteField.value = "";
    hideResult();
    setStatus("idle", "Drop a messy link. We’ll snip the tracking.");
    els.pasteField.focus();
  });
  document.getElementById("btnCopy").addEventListener("click", copyClean);
  document.getElementById("btnCopyMd").addEventListener("click", copyMarkdown);
  els.btnMobileCopy.addEventListener("click", copyClean);
  document.getElementById("btnAbout").addEventListener("click", () => els.aboutDialog.showModal());
  document.getElementById("btnCloseAbout").addEventListener("click", () => els.aboutDialog.close());

  els.pasteField.addEventListener("paste", () => {
    window.setTimeout(() => applyClean({ record: true }), 0);
  });
  els.pasteField.addEventListener("blur", () => {
    if (els.pasteField.value.trim()) applyClean({ record: true });
  });

  els.familyList.addEventListener("change", (event) => {
    const input = event.target.closest("[data-family]");
    if (!input) return;
    state.families[input.getAttribute("data-family")] = input.checked;
    save();
    renderFamilies();
    if (els.pasteField.value.trim()) applyClean({ record: true });
  });

  els.btnClearHistory.addEventListener("click", () => {
    if (!state.history.length) return;
    if (!window.confirm("Clear the on-device history?")) return;
    state.history = [];
    save();
    renderHistory();
    toast("History cleared. Still on this device only.");
  });

  els.historyList.addEventListener("click", async (event) => {
    const copyBtn = event.target.closest(".hist-copy");
    const reuseBtn = event.target.closest(".hist-reuse");
    if (copyBtn) {
      const row = state.history[Number(copyBtn.getAttribute("data-index"))];
      if (!row) return;
      const copied = await copyText(row.clean);
      toast(copied ? "Copied from history." : "Copy the clean URL from history.", 2600);
      return;
    }
    if (reuseBtn) {
      const row = state.history[Number(reuseBtn.getAttribute("data-index"))];
      if (!row) return;
      els.pasteField.value = row.original;
      applyClean({ record: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  state = loadStored();
  render();
  setStatus("idle", "Drop a messy link. We’ll snip the tracking.");
})();
