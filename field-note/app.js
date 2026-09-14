(() => {
  const STORAGE_KEY = 'field-note-v1';
  const HASH_PREFIX = '#n=';

  const DEFAULT_ITEMS = [
    'Cleats',
    'Water bottle',
    'Shin guards',
    'Snack',
    'Jersey / pinnie',
    'Extra socks',
    'Ball',
    'Sunscreen',
  ];

  const els = {
    storageFail: document.getElementById('storageFail'),
    title: document.getElementById('titleInput'),
    date: document.getElementById('dateInput'),
    arrive: document.getElementById('arriveInput'),
    place: document.getElementById('placeInput'),
    weather: document.getElementById('weatherInput'),
    bringList: document.getElementById('bringList'),
    bringEmpty: document.getElementById('bringEmpty'),
    bringProgress: document.getElementById('bringProgress'),
    bringTape: document.getElementById('bringTape'),
    addItemForm: document.getElementById('addItemForm'),
    newItem: document.getElementById('newItem'),
    kidsEmpty: document.getElementById('kidsEmpty'),
    kidsGrid: document.getElementById('kidsGrid'),
    addKidForm: document.getElementById('addKidForm'),
    newKid: document.getElementById('newKid'),
    printSheet: document.getElementById('printSheet'),
    aboutDialog: document.getElementById('aboutDialog'),
    toast: document.getElementById('toast'),
  };

  let storageOk = true;
  let state = blankNote();

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function defaultItems() {
    return DEFAULT_ITEMS.map((label) => ({ id: uid(), label, packed: false }));
  }

  function blankNote() {
    return {
      v: 1,
      title: '',
      date: todayISO(),
      arriveBy: '',
      place: '',
      weather: '',
      items: defaultItems(),
      kids: [],
    };
  }

  function sampleSaturday() {
    const d = new Date();
    const add = (6 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + add);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const items = defaultItems();
    items[0].packed = true;
    items[1].packed = true;
    items[3].packed = true;
    const mia = { id: uid(), name: 'Mia', note: 'Inhaler in the side pocket.', checks: {} };
    const leo = { id: uid(), name: 'Leo', note: 'New cleats — double-knot.', checks: {} };
    mia.checks[items[0].id] = true;
    mia.checks[items[2].id] = true;
    leo.checks[items[0].id] = true;
    leo.checks[items[1].id] = true;
    return {
      v: 1,
      title: 'U10 soccer practice',
      date,
      arriveBy: '08:40',
      place: 'Riverside Field 3 — 1200 Oak St',
      weather: 'Cool and damp. Extra layer. Leave the house by 8:15.',
      items,
      kids: [mia, leo],
    };
  }

  function clip(value, max) {
    return String(value || '').slice(0, max);
  }

  function clampText(value, max) {
    return clip(value, max).trim();
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const items = Array.isArray(raw.items)
      ? raw.items
          .map((item) => ({
            id: String((item && item.id) || uid()).slice(0, 64),
            label: clampText(item && item.label, 40),
            packed: !!(item && item.packed),
          }))
          .filter((item) => item.label)
      : [];
    const itemIds = new Set(items.map((item) => item.id));
    const kids = Array.isArray(raw.kids)
      ? raw.kids
          .map((kid) => {
            const checks = {};
            const src = kid && kid.checks && typeof kid.checks === 'object' ? kid.checks : {};
            for (const id of itemIds) {
              if (src[id]) checks[id] = true;
            }
            return {
              id: String((kid && kid.id) || uid()).slice(0, 64),
              name: clampText(kid && kid.name, 40),
              note: clampText(kid && kid.note, 80),
              checks,
            };
          })
          .filter((kid) => kid.name)
      : [];
    return {
      v: 1,
      title: clampText(raw.title, 80),
      date: typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : todayISO(),
      arriveBy: typeof raw.arriveBy === 'string' && /^\d{2}:\d{2}$/.test(raw.arriveBy) ? raw.arriveBy : '',
      place: clampText(raw.place, 120),
      weather: clampText(raw.weather, 400),
      items,
      kids,
    };
  }

  function toast(msg, ms) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove('show'), ms || 2800);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function probeStorage() {
    try {
      const probe = '__field_note_probe__';
      localStorage.setItem(probe, 'ok');
      const readback = localStorage.getItem(probe);
      localStorage.removeItem(probe);
      return readback === 'ok';
    } catch (_) {
      return false;
    }
  }

  function failStorage(reason) {
    storageOk = false;
    els.storageFail.hidden = false;
    if (reason) {
      els.storageFail.textContent =
        'Field Note cannot save on this device. Browser storage is blocked' +
        (reason ? ` (${reason})` : '') +
        '. The sheet will not persist.';
    }
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
      failStorage(err && err.message ? err.message : 'unreadable store');
      return null;
    }
  }

  function save() {
    if (!storageOk) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      failStorage(err && err.name ? err.name : 'write failed');
      return false;
    }
  }

  function bytesToB64url(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function b64urlToBytes(token) {
    let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function compressPayload(json) {
    if (typeof CompressionStream === 'undefined') return 'j.' + bytesToB64url(new TextEncoder().encode(json));
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate'));
    const buf = await new Response(stream).arrayBuffer();
    const z = 'z.' + bytesToB64url(new Uint8Array(buf));
    const j = 'j.' + bytesToB64url(new TextEncoder().encode(json));
    return z.length <= j.length ? z : j;
  }

  async function decompressPayload(token) {
    const kind = token.slice(0, 2);
    const body = token.slice(2);
    if (kind === 'j.') {
      return new TextDecoder().decode(b64urlToBytes(body));
    }
    if (kind === 'z.') {
      if (typeof DecompressionStream === 'undefined') throw new Error('no decompress');
      const bytes = b64urlToBytes(body);
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
      return await new Response(stream).text();
    }
    return decodeURIComponent(escape(atob(token)));
  }

  async function encodeShare() {
    const json = JSON.stringify(state);
    const packed = await compressPayload(json);
    return `${location.origin}${location.pathname}${HASH_PREFIX}${packed}`;
  }

  async function tryImportHash() {
    const hash = location.hash || '';
    if (!hash.startsWith(HASH_PREFIX)) return null;
    try {
      const json = await decompressPayload(decodeURIComponent(hash.slice(HASH_PREFIX.length)));
      const data = normalizeState(JSON.parse(json));
      history.replaceState(null, '', location.pathname + location.search);
      return data;
    } catch (_) {
      history.replaceState(null, '', location.pathname + location.search);
      toast('That snapshot link could not be read.', 3200);
      return null;
    }
  }

  function formatDate(iso) {
    if (!iso) return 'Date TBD';
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatTime(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const dt = new Date(1970, 0, 1, h, m);
    return dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function packedCount() {
    return state.items.filter((item) => item.packed).length;
  }

  function kidPacked(kid) {
    return state.items.filter((item) => kid.checks[item.id]).length;
  }

  function readFields() {
    state.title = clip(els.title.value, 80);
    state.date = els.date.value || todayISO();
    state.arriveBy = els.arrive.value || '';
    state.place = clip(els.place.value, 120);
    state.weather = clip(els.weather.value, 400);
  }

  function renderFields() {
    els.title.value = state.title;
    els.date.value = state.date;
    els.arrive.value = state.arriveBy;
    els.place.value = state.place;
    els.weather.value = state.weather;
    document.title = state.title ? `${state.title} · Field Note` : 'Field Note';
  }

  function renderBring() {
    const total = state.items.length;
    const packed = packedCount();
    els.bringEmpty.classList.toggle('hidden', total > 0);
    els.bringProgress.textContent = total
      ? `${packed} of ${total} packed`
      : 'Nothing to pack yet';
    const pct = total ? Math.round((packed / total) * 100) : 0;
    els.bringTape.classList.toggle('full', total > 0 && packed === total);
    els.bringTape.querySelector('span').style.width = `${pct}%`;
    els.bringList.innerHTML = state.items
      .map(
        (item) => `<li class="bring-item${item.packed ? ' done' : ''}" data-id="${escapeHtml(item.id)}">
        <input class="check" type="checkbox" ${item.packed ? 'checked' : ''} aria-label="${escapeHtml(item.label)}" />
        <span class="item-label">${escapeHtml(item.label)}</span>
        <button type="button" class="icon-btn remove-item no-print" aria-label="Remove ${escapeHtml(item.label)}">✕</button>
      </li>`
      )
      .join('');
  }

  function renderKids() {
    els.kidsEmpty.classList.toggle('hidden', state.kids.length > 0);
    els.kidsGrid.innerHTML = state.kids
      .map((kid) => {
        const n = kidPacked(kid);
        const checks = state.items
          .map(
            (item) => `<li class="kid-check" data-item="${escapeHtml(item.id)}">
            <input class="check kid-box" type="checkbox" ${kid.checks[item.id] ? 'checked' : ''} aria-label="${escapeHtml(item.label)} for ${escapeHtml(kid.name)}" />
            <span class="item-label">${escapeHtml(item.label)}</span>
          </li>`
          )
          .join('');
        return `<article class="kid-card" data-id="${escapeHtml(kid.id)}">
          <div class="kid-head">
            <input class="kid-name" maxlength="40" value="${escapeHtml(kid.name)}" aria-label="Kid name" />
            <button type="button" class="icon-btn remove-kid no-print" aria-label="Remove ${escapeHtml(kid.name)}">✕</button>
          </div>
          <p class="kid-meta">${n} of ${state.items.length} packed</p>
          <ul class="kid-checks">${checks || '<li class="kid-check"><span class="item-label">Add items to the bring list first.</span></li>'}</ul>
          <input class="kid-note" maxlength="80" value="${escapeHtml(kid.note)}" placeholder="Short note — inhaler, new cleats…" aria-label="Note for ${escapeHtml(kid.name)}" />
        </article>`;
      })
      .join('');
  }

  function renderPrint() {
    const title = state.title || 'Today’s field note';
    const when = [formatDate(state.date), state.arriveBy ? `Arrive ${formatTime(state.arriveBy)}` : '', state.place]
      .filter(Boolean)
      .join(' · ');
    const heads = ['Item', 'Bag'].concat(state.kids.map((kid) => kid.name));
    const rows = state.items
      .map((item) => {
        const cells = [`<td>${escapeHtml(item.label)}</td>`, `<td>${item.packed ? '☑' : '☐'}</td>`]
          .concat(state.kids.map((kid) => `<td>${kid.checks[item.id] ? '☑' : '☐'}</td>`));
        return `<tr>${cells.join('')}</tr>`;
      })
      .join('');
    const notes = state.kids
      .filter((kid) => kid.note)
      .map((kid) => `<p><strong>${escapeHtml(kid.name)}:</strong> ${escapeHtml(kid.note)}</p>`)
      .join('');
    els.printSheet.innerHTML = `
      <h1>${escapeHtml(title)}</h1>
      <p class="meta">${escapeHtml(when)}</p>
      ${state.weather ? `<p class="meta">${escapeHtml(state.weather)}</p>` : ''}
      <table>
        <thead><tr>${heads.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${notes ? `<div class="print-notes">${notes}</div>` : ''}
    `;
  }

  function render() {
    renderFields();
    renderBring();
    renderKids();
    renderPrint();
    save();
  }

  function persistFields() {
    readFields();
    document.title = state.title ? `${state.title} · Field Note` : 'Field Note';
    renderPrint();
    save();
  }

  function addItem(label) {
    const text = clampText(label, 40);
    if (!text) return;
    state.items.push({ id: uid(), label: text, packed: false });
    render();
    toast('Added to the bring list');
  }

  function removeItem(id) {
    state.items = state.items.filter((item) => item.id !== id);
    state.kids.forEach((kid) => {
      delete kid.checks[id];
    });
    render();
  }

  function toggleItem(id, packed) {
    const item = state.items.find((row) => row.id === id);
    if (!item) return;
    item.packed = packed;
    render();
  }

  function addKid(name) {
    const text = clampText(name, 40);
    if (!text) return;
    state.kids.push({ id: uid(), name: text, note: '', checks: {} });
    render();
    toast('Kid added — check off their bag');
  }

  function removeKid(id) {
    state.kids = state.kids.filter((kid) => kid.id !== id);
    render();
  }

  function newToday() {
    if (!confirm('Uncheck every bag and set the date to today? Names and the bring list stay.')) return;
    readFields();
    state.date = todayISO();
    state.items.forEach((item) => {
      item.packed = false;
    });
    state.kids.forEach((kid) => {
      kid.checks = {};
    });
    render();
    toast('Fresh sheet for today');
  }

  function resetDevice() {
    if (!confirm('Clear this device and start a blank field note?')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    state = blankNote();
    render();
    toast('Cleared — this device only');
  }

  async function shareSnapshot() {
    readFields();
    save();
    const url = await encodeShare();
    try {
      await navigator.clipboard.writeText(url);
      toast('Copied a snapshot — not live sync. Send a fresh link after edits.', 3600);
    } catch (_) {
      prompt('Copy this snapshot share link (not live sync):', url);
    }
  }

  ['title', 'date', 'arrive', 'place', 'weather'].forEach((key) => {
    els[key].addEventListener('change', persistFields);
    els[key].addEventListener('input', persistFields);
  });

  els.addItemForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addItem(els.newItem.value);
    els.addItemForm.reset();
    els.newItem.focus();
  });

  els.bringList.addEventListener('change', (event) => {
    const row = event.target.closest('.bring-item');
    if (!row || !event.target.classList.contains('check')) return;
    toggleItem(row.dataset.id, event.target.checked);
  });

  els.bringList.addEventListener('click', (event) => {
    const btn = event.target.closest('.remove-item');
    if (!btn) return;
    removeItem(btn.closest('.bring-item').dataset.id);
  });

  els.addKidForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addKid(els.newKid.value);
    els.addKidForm.reset();
    els.newKid.focus();
  });

  els.kidsGrid.addEventListener('change', (event) => {
    const card = event.target.closest('.kid-card');
    if (!card) return;
    const kid = state.kids.find((row) => row.id === card.dataset.id);
    if (!kid) return;
    if (event.target.classList.contains('kid-box')) {
      const itemId = event.target.closest('.kid-check').dataset.item;
      if (event.target.checked) kid.checks[itemId] = true;
      else delete kid.checks[itemId];
      render();
    }
  });

  els.kidsGrid.addEventListener('click', (event) => {
    const btn = event.target.closest('.remove-kid');
    if (!btn) return;
    removeKid(btn.closest('.kid-card').dataset.id);
  });

  els.kidsGrid.addEventListener('input', (event) => {
    const card = event.target.closest('.kid-card');
    if (!card) return;
    const kid = state.kids.find((row) => row.id === card.dataset.id);
    if (!kid) return;
    if (event.target.classList.contains('kid-name')) {
      kid.name = clip(event.target.value, 40);
      save();
    }
    if (event.target.classList.contains('kid-note')) {
      kid.note = clip(event.target.value, 80);
      save();
    }
  });

  els.kidsGrid.addEventListener('change', (event) => {
    const card = event.target.closest('.kid-card');
    if (!card) return;
    const kid = state.kids.find((row) => row.id === card.dataset.id);
    if (!kid) return;
    if (event.target.classList.contains('kid-name')) {
      kid.name = clampText(event.target.value, 40) || kid.name;
      render();
    }
    if (event.target.classList.contains('kid-note')) {
      kid.note = clip(event.target.value, 80);
      save();
      renderPrint();
    }
  });

  document.getElementById('btnShare').addEventListener('click', () => {
    shareSnapshot();
  });
  document.getElementById('btnPrint').addEventListener('click', () => {
    readFields();
    renderPrint();
    window.print();
  });
  document.getElementById('btnAbout').addEventListener('click', () => els.aboutDialog.showModal());
  document.getElementById('btnCloseAbout').addEventListener('click', () => els.aboutDialog.close());
  document.getElementById('btnNewToday').addEventListener('click', newToday);
  document.getElementById('btnReset').addEventListener('click', resetDevice);
  document.getElementById('btnSample').addEventListener('click', () => {
    state = sampleSaturday();
    render();
    toast('Sample Saturday loaded — demo names are fictional');
  });

  async function boot() {
    const fromShare = await tryImportHash();
    const stored = loadStored();
    state = fromShare || stored || blankNote();
    render();
    if (fromShare) {
      toast('Loaded a shared snapshot. Edits stay on this device until you share again.', 3600);
    }
  }

  boot();
})();
