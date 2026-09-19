(() => {
  const els = {
    storageFail: document.getElementById("storageFail"),
    dirtyInput: document.getElementById("dirtyInput"),
    errorLine: document.getElementById("errorLine"),
    result: document.getElementById("result"),
    beforeUrl: document.getElementById("beforeUrl"),
    afterUrl: document.getElementById("afterUrl"),
    cleanBox: document.getElementById("cleanBox"),
    cutCount: document.getElementById("cutCount"),
    chipRow: document.getElementById("chipRow"),
    pulseText: document.getElementById("pulseText"),
    historyList: document.getElementById("historyList"),
    historySub: document.getElementById("historySub"),
    btnClearHistory: document.getElementById("btnClearHistory"),
    aboutDialog: document.getElementById("aboutDialog"),
    toast: document.getElementById("toast"),
    btnCopy: document.getElementById("btnCopy"),
  };

  let storageOk = true;
  let history = [];
  let lastResult = null;
  let toastTimer = 0;
  let debounceTimer = 0;

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
      "Clean Link cannot save history on this device. Browser storage is blocked" +
      (reason ? " (" + reason + ")" : "") +
      ". Cleaning still works.";
  }

  function loadHistory() {
    if (!probeStorage()) {
      failStorage();
      return [];
    }
    try {
      const raw = localStorage.getItem(CleanLink.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return CleanLink.normalizeHistory(parsed);
    } catch (err) {
      failStorage(err && err.message ? err.message : "unreadable store");
      return [];
    }
  }

  function saveHistory() {
    if (!storageOk) return false;
    try {
      localStorage.setItem(
        CleanLink.STORAGE_KEY,
        JSON.stringify({ v: 1, history })
      );
      return true;
    } catch (err) {
      failStorage(err && err.name ? err.name : "write failed");
      return false;
    }
  }

  function remember(result) {
    if (!result || !result.ok) return;
    history = CleanLink.pushHistory(history, {
      dirty: result.dirty,
      clean: result.clean,
      stripped: result.stripped,
      at: Date.now(),
    });
    saveHistory();
    renderHistory();
  }

  function showError(message) {
    els.errorLine.hidden = !message;
    els.errorLine.textContent = message || "";
    if (message) {
      els.result.hidden = true;
      els.pulseText.textContent = "Could not wash";
    }
  }

  function renderChips(stripped) {
    if (!stripped.length) {
      els.chipRow.hidden = true;
      els.chipRow.innerHTML = "";
      return;
    }
    els.chipRow.hidden = false;
    els.chipRow.innerHTML = stripped
      .slice(0, 16)
      .map((item) => {
        const value = item.value ? "=" + item.value : "";
        return "<span class=\"chip\">" + escapeHtml(item.key + value) + "</span>";
      })
      .join("");
  }

  function renderResult(result) {
    lastResult = result;
    els.result.hidden = false;
    els.beforeUrl.textContent = result.dirty;
    els.afterUrl.textContent = result.clean;
    els.cleanBox.value = result.clean;
    const n = result.stripped.length;
    const hops = result.unwrapped.length;
    const bits = [];
    if (n) bits.push(n === 1 ? "1 tracker cut" : n + " trackers cut");
    else bits.push("Already clean");
    if (hops) bits.push(hops === 1 ? "1 unwrap" : hops + " unwraps");
    els.cutCount.textContent = bits.join(" · ");
    els.pulseText.textContent = n ? "Washed" : "Already clean";
    renderChips(result.stripped);
    els.btnCopy.textContent = "Copy";
  }

  function applyClean(persist) {
    const raw = els.dirtyInput.value;
    const result = CleanLink.clean(raw);
    if (!result.ok) {
      if (!raw.trim()) {
        showError("");
        els.result.hidden = true;
        els.pulseText.textContent = "Ready to wash";
        lastResult = null;
        return null;
      }
      const message =
        result.error === "unsupported"
          ? "Need an http or https link."
          : "That does not look like a URL yet.";
      showError(message);
      return null;
    }
    showError("");
    renderResult(result);
    if (persist) remember(result);
    return result;
  }

  function renderHistory() {
    const rows = history;
    els.btnClearHistory.hidden = rows.length === 0;
    els.historySub.textContent = rows.length
      ? rows.length + " on this device · tap a row to reuse · reload keeps them"
      : "Last 10 cleans stay in this browser. Reload keeps them.";
    els.historyList.innerHTML = rows
      .map((row, index) => {
        const n = row.stripped.length;
        return (
          "<li><div class=\"history-item\">" +
          "<button type=\"button\" class=\"use\" data-index=\"" +
          index +
          "\"><span class=\"history-clean\">" +
          escapeHtml(row.clean) +
          "</span><span class=\"history-dirty\">" +
          escapeHtml(row.dirty) +
          "</span></button>" +
          "<div class=\"history-meta\"><span>" +
          (n ? n + " cut" : "already clean") +
          "</span><button type=\"button\" class=\"btn ghost copy-row-btn\" data-copy=\"" +
          index +
          "\">Copy</button></div></div></li>"
        );
      })
      .join("");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      try {
        els.cleanBox.focus();
        els.cleanBox.select();
        return document.execCommand("copy");
      } catch (__) {
        return false;
      }
    }
  }

  async function copyClean(openAfter) {
    const result = lastResult && lastResult.ok ? lastResult : applyClean(true);
    if (!result || !result.ok) {
      toast("Clean a URL first.");
      return;
    }
    const copied = await copyText(result.clean);
    window.__cleanLinkLastCopied = copied ? result.clean : "";
    els.btnCopy.textContent = copied ? "Copied" : "Copy";
    toast(copied ? "Copied the clean link." : "Select the clean URL and copy it.", 2800);
    if (openAfter) {
      window.open(result.clean, "_blank", "noopener,noreferrer");
    }
  }

  function clearForm() {
    els.dirtyInput.value = "";
    lastResult = null;
    showError("");
    els.result.hidden = true;
    els.pulseText.textContent = "Ready to wash";
    els.dirtyInput.focus();
  }

  document.getElementById("btnClean").addEventListener("click", () => {
    const result = applyClean(true);
    if (result) toast(result.stripped.length ? "Trackers cut. Copy when you want." : "Already clean.");
  });

  document.getElementById("btnSample").addEventListener("click", () => {
    els.dirtyInput.value = CleanLink.sampleDirty();
    applyClean(true);
    toast("Sample dirty YouTube link — video and timestamp stayed.");
  });

  document.getElementById("btnClear").addEventListener("click", clearForm);

  document.getElementById("btnCopy").addEventListener("click", () => {
    copyClean(false);
  });

  document.getElementById("btnCopyOpen").addEventListener("click", () => {
    copyClean(true);
  });

  document.getElementById("btnAbout").addEventListener("click", () => els.aboutDialog.showModal());
  document.getElementById("btnCloseAbout").addEventListener("click", () => els.aboutDialog.close());

  document.getElementById("btnClearHistory").addEventListener("click", () => {
    if (!window.confirm("Clear the last washes on this device?")) return;
    history = [];
    saveHistory();
    renderHistory();
    toast("History cleared on this device.");
  });

  els.historyList.addEventListener("click", (event) => {
    const copyBtn = event.target.closest("[data-copy]");
    const useBtn = event.target.closest(".use");
    if (copyBtn) {
      const row = history[Number(copyBtn.getAttribute("data-copy"))];
      if (!row) return;
      els.dirtyInput.value = row.dirty;
      applyClean(false);
      copyClean(false);
      return;
    }
    if (useBtn) {
      const row = history[Number(useBtn.getAttribute("data-index"))];
      if (!row) return;
      els.dirtyInput.value = row.dirty;
      applyClean(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  els.dirtyInput.addEventListener("paste", () => {
    window.setTimeout(() => applyClean(true), 0);
  });

  els.dirtyInput.addEventListener("input", () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => applyClean(false), 280);
  });

  els.cleanBox.addEventListener("focus", () => els.cleanBox.select());

  history = loadHistory();
  renderHistory();
  els.dirtyInput.focus();
})();
