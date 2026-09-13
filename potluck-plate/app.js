(() => {
  const STORAGE_KEY = 'potluck-plate-v1';
  const DEFAULT_CATS = [
    { id: 'main', name: 'Main', needed: 3 },
    { id: 'side', name: 'Side', needed: 4 },
    { id: 'salad', name: 'Salad', needed: 2 },
    { id: 'dessert', name: 'Dessert', needed: 3 },
    { id: 'drinks', name: 'Drinks', needed: 2 },
    { id: 'other', name: 'Other', needed: 1 },
  ];

  function demoEvent() {
    const d = new Date();
    d.setDate(d.getDate() + ((0 + 7 - d.getDay()) % 7 || 7));
    const iso = d.toISOString().slice(0, 10);
    return {
      title: 'Sunday Fellowship Lunch',
      date: iso,
      place: 'Fellowship hall',
      notes: 'Doors open 11:45. Label allergens. Warming ovens available.',
      categories: DEFAULT_CATS.map((c) => ({ ...c })),
      claims: [
        { id: uid(), person: 'Alex M.', dish: 'Herb roasted chicken', category: 'main', tags: ['GF'], notes: 'Serves 10' },
        { id: uid(), person: 'Jordan P.', dish: 'Honey cornbread', category: 'side', tags: ['V'], notes: '' },
        { id: uid(), person: 'Sam R.', dish: 'Fruit tray', category: 'salad', tags: ['VE', 'GF', 'NF'], notes: '' },
        { id: uid(), person: 'Casey L.', dish: 'Lemon bars', category: 'dessert', tags: ['V'], notes: 'Nut-free kitchen' },
      ],
    };
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function encodeShare(state) {
    const json = JSON.stringify(state);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return `${location.origin}${location.pathname}#p=${b64}`;
  }

  function tryImportHash() {
    const h = location.hash || '';
    const m = h.match(/^#p=(.+)$/);
    if (!m) return null;
    try {
      const json = decodeURIComponent(escape(atob(m[1])));
      const data = JSON.parse(json);
      if (!data || !data.title || !Array.isArray(data.claims)) return null;
      history.replaceState(null, '', location.pathname + location.search);
      return data;
    } catch (_) {
      return null;
    }
  }

  const fromShare = tryImportHash();
  let state = fromShare || load() || demoEvent();
  save(state);
  if (fromShare) {
    queueMicrotask(() => toast('Loaded shared potluck snapshot'));
  }

  const els = {
    title: document.getElementById('eventTitle'),
    meta: document.getElementById('eventMeta'),
    meters: document.getElementById('meters'),
    claimsList: document.getElementById('claimsList'),
    claimsEmpty: document.getElementById('claimsEmpty'),
    catList: document.getElementById('catList'),
    eventDialog: document.getElementById('eventDialog'),
    eventForm: document.getElementById('eventForm'),
    claimDialog: document.getElementById('claimDialog'),
    claimForm: document.getElementById('claimForm'),
    claimCategory: document.getElementById('claimCategory'),
    claimDialogTitle: document.getElementById('claimDialogTitle'),
    btnDeleteClaim: document.getElementById('btnDeleteClaim'),
  };

  function catName(id) {
    const c = state.categories.find((x) => x.id === id);
    return c ? c.name : id;
  }

  function formatDate(iso) {
    if (!iso) return 'Date TBD';
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function renderMeta() {
    els.title.value = state.title || '';
    const bits = [];
    bits.push(`<span><strong>${formatDate(state.date)}</strong></span>`);
    if (state.place) bits.push(`<span>${escapeHtml(state.place)}</span>`);
    if (state.notes) bits.push(`<span>${escapeHtml(state.notes)}</span>`);
    els.meta.innerHTML = bits.join('');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderMeters() {
    els.meters.innerHTML = state.categories.map((cat) => {
      const n = state.claims.filter((c) => c.category === cat.id).length;
      const need = Math.max(1, Number(cat.needed) || 1);
      const pct = Math.min(100, Math.round((n / need) * 100));
      const full = n >= need ? ' full' : '';
      return `<div class="meter${full}"><div class="label">${escapeHtml(cat.name)}</div><div class="count">${n} / ${need}</div><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>`;
    }).join('');
  }

  function renderClaims() {
    const sorted = [...state.claims].sort((a, b) => {
      const ai = state.categories.findIndex((c) => c.id === a.category);
      const bi = state.categories.findIndex((c) => c.id === b.category);
      return (ai - bi) || a.person.localeCompare(b.person);
    });
    els.claimsEmpty.classList.toggle('hidden', sorted.length > 0);
    els.claimsList.innerHTML = sorted.map((c) => {
      const tags = (c.tags || []).map((t) => `<span class="pill">${escapeHtml(t)}</span>`).join('');
      return `<li class="claim" data-id="${c.id}">
        <div>
          <div class="dish">${escapeHtml(c.dish)}</div>
          <div class="who">${escapeHtml(c.person)}${c.notes ? ' · ' + escapeHtml(c.notes) : ''}</div>
          <div class="pill-row"><span class="pill cat">${escapeHtml(catName(c.category))}</span>${tags}</div>
        </div>
        <button type="button" class="btn small ghost edit-claim">Edit</button>
      </li>`;
    }).join('');
  }

  function renderCats() {
    els.catList.innerHTML = state.categories.map((cat) => {
      const n = state.claims.filter((c) => c.category === cat.id).length;
      return `<li class="cat" data-id="${cat.id}">
        <div>
          <div class="name">${escapeHtml(cat.name)}</div>
          <div class="who">${n} claimed</div>
        </div>
        <label class="sr">Needed for ${escapeHtml(cat.name)}</label>
        <input type="number" min="0" max="99" value="${cat.needed}" data-needed="${cat.id}" aria-label="Needed ${escapeHtml(cat.name)}" />
      </li>`;
    }).join('');
  }

  function fillCategorySelect(selected) {
    els.claimCategory.innerHTML = state.categories.map((c) =>
      `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
    ).join('');
  }

  function render() {
    renderMeta();
    renderMeters();
    renderClaims();
    renderCats();
    save(state);
  }

  function openEventDialog() {
    const f = els.eventForm;
    f.title.value = state.title || '';
    f.date.value = state.date || '';
    f.place.value = state.place || '';
    f.notes.value = state.notes || '';
    els.eventDialog.showModal();
  }

  function openClaimDialog(claim) {
    const f = els.claimForm;
    f.reset();
    f.id.value = claim ? claim.id : '';
    f.person.value = claim ? claim.person : '';
    f.dish.value = claim ? claim.dish : '';
    f.notes.value = claim ? (claim.notes || '') : '';
    fillCategorySelect(claim ? claim.category : state.categories[0]?.id);
    f.querySelectorAll('input[name="tag"]').forEach((box) => {
      box.checked = !!(claim && claim.tags && claim.tags.includes(box.value));
    });
    els.claimDialogTitle.textContent = claim ? 'Edit claim' : 'Claim a dish';
    els.btnDeleteClaim.classList.toggle('hidden', !claim);
    els.claimDialog.showModal();
  }

  document.getElementById('btnEditEvent').addEventListener('click', openEventDialog);
  document.getElementById('btnCancelEvent').addEventListener('click', () => els.eventDialog.close());
  els.eventForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = els.eventForm;
    state.title = f.title.value.trim() || 'Untitled potluck';
    state.date = f.date.value;
    state.place = f.place.value.trim();
    state.notes = f.notes.value.trim();
    els.eventDialog.close();
    render();
    toast('Event saved');
  });

  els.title.addEventListener('change', () => {
    state.title = els.title.value.trim() || 'Untitled potluck';
    save(state);
  });

  document.getElementById('btnAddClaim').addEventListener('click', () => openClaimDialog(null));
  document.getElementById('btnCancelClaim').addEventListener('click', () => els.claimDialog.close());
  els.claimsList.addEventListener('click', (e) => {
    const btn = e.target.closest('.edit-claim');
    if (!btn) return;
    const id = btn.closest('.claim').dataset.id;
    openClaimDialog(state.claims.find((c) => c.id === id));
  });

  els.claimForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = els.claimForm;
    const tags = [...f.querySelectorAll('input[name="tag"]:checked')].map((x) => x.value);
    const payload = {
      id: f.id.value || uid(),
      person: f.person.value.trim(),
      dish: f.dish.value.trim(),
      category: f.category.value,
      tags,
      notes: f.notes.value.trim(),
    };
    const idx = state.claims.findIndex((c) => c.id === payload.id);
    if (idx >= 0) state.claims[idx] = payload;
    else state.claims.push(payload);
    els.claimDialog.close();
    render();
    toast(idx >= 0 ? 'Claim updated' : 'Dish claimed');
  });

  els.btnDeleteClaim.addEventListener('click', () => {
    const id = els.claimForm.id.value;
    state.claims = state.claims.filter((c) => c.id !== id);
    els.claimDialog.close();
    render();
    toast('Claim removed');
  });

  document.getElementById('btnAddCat').addEventListener('click', () => {
    const name = prompt('Category name?');
    if (!name || !name.trim()) return;
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24) || uid();
    if (state.categories.some((c) => c.id === id)) {
      toast('That category already exists');
      return;
    }
    state.categories.push({ id, name: name.trim(), needed: 2 });
    render();
  });

  els.catList.addEventListener('change', (e) => {
    const input = e.target.closest('input[data-needed]');
    if (!input) return;
    const cat = state.categories.find((c) => c.id === input.dataset.needed);
    if (!cat) return;
    cat.needed = Math.max(0, Math.min(99, Number(input.value) || 0));
    render();
  });

  document.getElementById('btnShare').addEventListener('click', async () => {
    const url = encodeShare(state);
    try {
      await navigator.clipboard.writeText(url);
      toast('Share link copied');
    } catch (_) {
      prompt('Copy this share link:', url);
    }
  });

  document.getElementById('btnPrint').addEventListener('click', () => window.print());

  document.getElementById('btnReset').addEventListener('click', () => {
    if (!confirm('Clear this device and reload the demo potluck?')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = demoEvent();
    render();
    toast('Reset to demo');
  });

  // hash may have been imported at start — toast once
  if (location.search.includes('shared=1') || sessionStorage.getItem('pp-imported') === '1') {
    sessionStorage.removeItem('pp-imported');
  }

  render();
})();
