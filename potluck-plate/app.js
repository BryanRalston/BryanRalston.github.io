(() => {
  const STORAGE_KEY = 'potluck-plate-v2';
  const LEGACY_KEY = 'potluck-plate-v1';

  const THEMES = [
    { id: 'paprika', name: 'Warm paprika', color: '#8b3a2a' },
    { id: 'mint', name: 'Fresh mint', color: '#2a6b58' },
    { id: 'sky', name: 'Sky / coral', color: '#2f6f8f' },
    { id: 'ink', name: 'Midnight ink', color: '#12161c' },
  ];

  const TEMPLATES = {
    potluck: {
      id: 'potluck',
      name: 'Potluck / fellowship lunch',
      emoji: '🍽️',
      blurb: 'Mains, sides, salad, dessert, drinks.',
      defaultTitle: 'Sunday Fellowship Lunch',
      tagline: 'Claim a dish. Fill the table. No accounts.',
      emptyTitle: 'The table is empty',
      emptyBody: 'Be the first — grab a Main or Dessert and get the table started.',
      claimCta: 'Claim a dish',
      claimTitle: 'Claim a dish',
      editTitle: 'Edit claim',
      itemLabel: 'Dish name',
      itemPlaceholder: 'Honey cornbread',
      placePlaceholder: 'Fellowship hall, picnic shelter…',
      notesPlaceholder: 'Bring serving utensils, arrive by 11:45…',
      sheetTitle: 'Sign-up sheet',
      categories: [
        { id: 'main', name: 'Main', needed: 3 },
        { id: 'side', name: 'Side', needed: 4 },
        { id: 'salad', name: 'Salad', needed: 2 },
        { id: 'dessert', name: 'Dessert', needed: 3 },
        { id: 'drinks', name: 'Drinks', needed: 2 },
        { id: 'other', name: 'Other', needed: 1 },
      ],
    },
    birthday: {
      id: 'birthday',
      name: 'Birthday party',
      emoji: '🎂',
      blurb: 'Cake, food, drinks, plates, activities.',
      defaultTitle: 'Birthday signup',
      tagline: 'Cake, snacks, and helping hands.',
      emptyTitle: 'The party list is empty',
      emptyBody: 'Claim the cake, snacks, drinks, or an activity.',
      claimCta: 'Claim a spot',
      claimTitle: 'Claim a spot',
      editTitle: 'Edit claim',
      itemLabel: 'What you’re bringing',
      itemPlaceholder: 'Chocolate sheet cake',
      placePlaceholder: 'Backyard, rec room…',
      notesPlaceholder: 'Arrive by 2, gifts on the side table…',
      sheetTitle: 'Party signup',
      categories: [
        { id: 'cake', name: 'Cake', needed: 1 },
        { id: 'food', name: 'Food', needed: 4 },
        { id: 'drinks', name: 'Drinks', needed: 2 },
        { id: 'plates', name: 'Plates / cups', needed: 1 },
        { id: 'activities', name: 'Activities', needed: 2 },
      ],
    },
    office: {
      id: 'office',
      name: 'Office lunch / team meal',
      emoji: '🥗',
      blurb: 'Mains, sides, salads, dessert, supplies.',
      defaultTitle: 'Team lunch',
      tagline: 'Fill the conference table.',
      emptyTitle: 'Nobody’s signed up yet',
      emptyBody: 'Claim a main, side, or the drinks run.',
      claimCta: 'Claim an item',
      claimTitle: 'Claim an item',
      editTitle: 'Edit claim',
      itemLabel: 'What you’re bringing',
      itemPlaceholder: 'Tray of sandwiches',
      placePlaceholder: 'Conference room B…',
      notesPlaceholder: 'Allergies on the fridge note…',
      sheetTitle: 'Team signup',
      categories: [
        { id: 'main', name: 'Main', needed: 3 },
        { id: 'side', name: 'Side', needed: 3 },
        { id: 'salad', name: 'Salad', needed: 2 },
        { id: 'dessert', name: 'Dessert', needed: 2 },
        { id: 'drinks', name: 'Drinks', needed: 2 },
        { id: 'supplies', name: 'Plates & utensils', needed: 1 },
      ],
    },
    bbq: {
      id: 'bbq',
      name: 'BBQ / cookout',
      emoji: '🔥',
      blurb: 'Grill, sides, salads, dessert, extras.',
      defaultTitle: 'Saturday cookout',
      tagline: 'Grill, sides, and cold drinks.',
      emptyTitle: 'The grill list is empty',
      emptyBody: 'Claim meat, a side, or the ice run.',
      claimCta: 'Claim an item',
      claimTitle: 'Claim an item',
      editTitle: 'Edit claim',
      itemLabel: 'What you’re bringing',
      itemPlaceholder: 'Dry-rub chicken',
      placePlaceholder: 'Park shelter, backyard…',
      notesPlaceholder: 'Coals lit at 4. Bring a chair…',
      sheetTitle: 'Cookout signup',
      categories: [
        { id: 'grill', name: 'Grill / meat', needed: 3 },
        { id: 'side', name: 'Sides', needed: 4 },
        { id: 'salad', name: 'Salads', needed: 2 },
        { id: 'dessert', name: 'Dessert', needed: 2 },
        { id: 'drinks', name: 'Drinks', needed: 2 },
        { id: 'extras', name: 'Extras', needed: 2 },
      ],
    },
    shower: {
      id: 'shower',
      name: 'Baby / bridal shower',
      emoji: '🎁',
      blurb: 'Food, drinks, dessert — gifts optional.',
      defaultTitle: 'Shower signup',
      tagline: 'Food, gifts, and extras.',
      emptyTitle: 'The shower list is empty',
      emptyBody: 'Claim food, drinks, or a gift item.',
      claimCta: 'Claim an item',
      claimTitle: 'Claim an item',
      editTitle: 'Edit claim',
      itemLabel: 'What you’re bringing',
      itemPlaceholder: 'Fruit tray',
      placePlaceholder: 'Living room, church parlor…',
      notesPlaceholder: 'Games at 1. Registry on the fridge…',
      sheetTitle: 'Shower signup',
      categories: [
        { id: 'food', name: 'Food', needed: 4 },
        { id: 'drinks', name: 'Drinks', needed: 2 },
        { id: 'dessert', name: 'Dessert', needed: 2 },
        { id: 'gifts', name: 'Gifts', needed: 3 },
        { id: 'decor', name: 'Decorations', needed: 1 },
        { id: 'other', name: 'Other', needed: 1 },
      ],
    },
    custom: {
      id: 'custom',
      name: 'Custom (blank)',
      emoji: '✏️',
      blurb: 'Name every category from scratch.',
      defaultTitle: 'Event signup',
      tagline: 'Name your categories. Share the list.',
      emptyTitle: 'Start with categories',
      emptyBody: 'Add what this event needs, then invite people to claim a spot.',
      claimCta: 'Claim a spot',
      claimTitle: 'Claim a spot',
      editTitle: 'Edit claim',
      itemLabel: 'Item',
      itemPlaceholder: 'What you’re bringing',
      placePlaceholder: 'Where are we meeting?',
      notesPlaceholder: 'Anything guests should know…',
      sheetTitle: 'Sign-up sheet',
      categories: [],
    },
  };

  const TEMPLATE_IDS = Object.keys(TEMPLATES);

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function clamp(n, min, max) {
    const x = Number(n);
    if (Number.isNaN(x)) return min;
    return Math.max(min, Math.min(max, x));
  }

  function cloneCats(cats) {
    return cats.map((c) => ({ id: c.id, name: c.name, needed: c.needed }));
  }

  function toast(msg, ms) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), ms || 2800);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function tpl() {
    return TEMPLATES[state.templateId] || TEMPLATES.potluck;
  }

  function applyTheme(themeId) {
    const theme = THEMES.find((t) => t.id === themeId) ? themeId : 'paprika';
    document.documentElement.dataset.theme = theme;
    const meta = document.getElementById('themeColor');
    const found = THEMES.find((t) => t.id === theme);
    if (meta && found) meta.content = found.color;
    return theme;
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (typeof raw.title !== 'string' || !Array.isArray(raw.claims)) return null;
    const templateId = TEMPLATE_IDS.includes(raw.templateId) ? raw.templateId : inferTemplate(raw);
    const theme = THEMES.some((t) => t.id === raw.theme) ? raw.theme : 'paprika';
    let categories = Array.isArray(raw.categories)
      ? raw.categories.map((c) => ({
        id: String((c && c.id) || uid()).slice(0, 40),
        name: String((c && c.name) || 'Category').slice(0, 40),
        needed: clamp(c && c.needed, 0, 99),
      }))
      : [];
    if (!categories.length && templateId !== 'custom') {
      categories = cloneCats(TEMPLATES[templateId].categories);
    }
    const claims = raw.claims.map((c) => ({
      id: String((c && c.id) || uid()),
      person: String((c && c.person) || '').slice(0, 40),
      dish: String((c && c.dish) || '').slice(0, 60),
      category: String((c && c.category) || (categories[0] && categories[0].id) || ''),
      tags: Array.isArray(c && c.tags) ? c.tags.map(String) : [],
      notes: String((c && c.notes) || '').slice(0, 120),
    })).filter((c) => c.person && c.dish);
    return {
      title: raw.title.trim().slice(0, 80) || 'Untitled event',
      date: typeof raw.date === 'string' ? raw.date : '',
      place: typeof raw.place === 'string' ? raw.place.slice(0, 80) : '',
      notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 400) : '',
      templateId,
      theme,
      categories,
      claims,
    };
  }

  function inferTemplate(raw) {
    const ids = (raw.categories || []).map((c) => c.id).join(',');
    if (ids === TEMPLATES.potluck.categories.map((c) => c.id).join(',')) return 'potluck';
    return 'custom';
  }

  function demoEvent() {
    const d = new Date();
    d.setDate(d.getDate() + ((0 + 7 - d.getDay()) % 7 || 7));
    return {
      title: 'Sunday Fellowship Lunch',
      date: d.toISOString().slice(0, 10),
      place: 'Fellowship hall',
      notes: 'Doors open 11:45. Label allergens. Warming ovens available.',
      templateId: 'potluck',
      theme: 'paprika',
      categories: cloneCats(TEMPLATES.potluck.categories),
      claims: [
        { id: uid(), person: 'Alex M.', dish: 'Herb roasted chicken', category: 'main', tags: ['GF'], notes: 'Serves 10' },
        { id: uid(), person: 'Jordan P.', dish: 'Honey cornbread', category: 'side', tags: ['V'], notes: '' },
        { id: uid(), person: 'Sam R.', dish: 'Fruit tray', category: 'salad', tags: ['VE', 'GF', 'NF'], notes: '' },
        { id: uid(), person: 'Casey L.', dish: 'Lemon bars', category: 'dessert', tags: ['V'], notes: 'Nut-free kitchen' },
      ],
    };
  }

  function eventFromSetup(templateId, title, date, theme) {
    const t = TEMPLATES[templateId] || TEMPLATES.potluck;
    return {
      title: (title || t.defaultTitle).trim().slice(0, 80) || t.defaultTitle,
      date: date || '',
      place: '',
      notes: '',
      templateId: t.id,
      theme: THEMES.some((x) => x.id === theme) ? theme : 'paprika',
      categories: cloneCats(t.categories),
      claims: [],
    };
  }

  function applyTemplateToState(templateId) {
    const t = TEMPLATES[templateId] || TEMPLATES.custom;
    const used = new Set(state.claims.map((c) => c.category));
    const next = cloneCats(t.categories);
    for (const cat of state.categories) {
      if (used.has(cat.id) && !next.some((n) => n.id === cat.id)) next.push({ ...cat });
    }
    state.templateId = t.id;
    state.categories = next;
  }

  function loadStored() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      return normalizeState(JSON.parse(raw));
    } catch (_) {
      return null;
    }
  }

  function save(next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    try { localStorage.removeItem(LEGACY_KEY); } catch (_) {}
  }

  function encodeShare(next) {
    const json = JSON.stringify(next);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return `${location.origin}${location.pathname}#p=${b64}`;
  }

  function tryImportHash() {
    const h = location.hash || '';
    const m = h.match(/^#p=(.+)$/);
    if (!m) return null;
    try {
      const json = decodeURIComponent(escape(atob(m[1])));
      const data = normalizeState(JSON.parse(json));
      if (!data) return null;
      history.replaceState(null, '', location.pathname + location.search);
      return data;
    } catch (_) {
      return null;
    }
  }

  const fromShare = tryImportHash();
  let stored = loadStored();
  let state = fromShare || stored;
  let needsSetup = !state;
  if (state) save(state);

  const els = {
    setup: document.getElementById('setup'),
    setupDetails: document.getElementById('setupDetails'),
    setupTitleInput: document.getElementById('setupTitleInput'),
    setupDate: document.getElementById('setupDate'),
    templateGrid: document.getElementById('templateGrid'),
    setupThemes: document.getElementById('setupThemes'),
    title: document.getElementById('eventTitle'),
    tagline: document.getElementById('eventTagline'),
    brandEmoji: document.getElementById('brandEmoji'),
    meta: document.getElementById('eventMeta'),
    meters: document.getElementById('meters'),
    claimsList: document.getElementById('claimsList'),
    claimsEmpty: document.getElementById('claimsEmpty'),
    emptyTitle: document.getElementById('emptyTitle'),
    emptyArt: document.getElementById('emptyArt'),
    emptyBody: document.getElementById('emptyBody'),
    emptyClaim: document.getElementById('btnEmptyClaim'),
    catList: document.getElementById('catList'),
    catsEmpty: document.getElementById('catsEmpty'),
    sheetTitle: document.getElementById('sheetTitle'),
    eventDialog: document.getElementById('eventDialog'),
    eventForm: document.getElementById('eventForm'),
    eventTemplate: document.getElementById('eventTemplate'),
    eventThemes: document.getElementById('eventThemes'),
    eventPlace: document.getElementById('eventPlace'),
    eventNotes: document.getElementById('eventNotes'),
    claimDialog: document.getElementById('claimDialog'),
    claimForm: document.getElementById('claimForm'),
    claimCategory: document.getElementById('claimCategory'),
    claimDialogTitle: document.getElementById('claimDialogTitle'),
    btnDeleteClaim: document.getElementById('btnDeleteClaim'),
    btnAddClaim: document.getElementById('btnAddClaim'),
    btnMobileClaim: document.getElementById('btnMobileClaim'),
    aboutDialog: document.getElementById('aboutDialog'),
    mobileCta: document.getElementById('mobileCta'),
  };

  let setupPick = { templateId: '', theme: 'paprika' };

  function formatDate(iso) {
    if (!iso) return 'Date TBD';
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function catName(id) {
    const c = state.categories.find((x) => x.id === id);
    return c ? c.name : id;
  }

  function renderThemeRow(host, selected, onPick) {
    host.innerHTML = THEMES.map((t) => (
      `<button type="button" class="theme-swatch" data-theme-id="${t.id}" aria-pressed="${t.id === selected}">
        <span class="swatch-dot ${t.id}" aria-hidden="true"></span>${escapeHtml(t.name)}
      </button>`
    )).join('');
    host.querySelectorAll('[data-theme-id]').forEach((btn) => {
      btn.addEventListener('click', () => onPick(btn.dataset.themeId));
    });
  }

  function bindThemeRow(host, getSelected, setSelected) {
    const paint = () => {
      const selected = getSelected();
      renderThemeRow(host, selected, (id) => {
        setSelected(id);
        paint();
      });
    };
    paint();
  }

  function renderTemplateGrid() {
    els.templateGrid.innerHTML = TEMPLATE_IDS.map((id) => {
      const t = TEMPLATES[id];
      const pressed = setupPick.templateId === id;
      return `<button type="button" class="template-card" data-template="${id}" aria-pressed="${pressed}">
        <span class="emoji">${t.emoji}</span>
        <strong>${escapeHtml(t.name)}</strong>
        <span>${escapeHtml(t.blurb)}</span>
      </button>`;
    }).join('');
  }

  function renderCopy() {
    if (!state) return;
    const t = tpl();
    els.brandEmoji.textContent = t.emoji;
    if (els.emptyArt) els.emptyArt.textContent = t.emoji;
    els.tagline.textContent = t.tagline;
    els.sheetTitle.textContent = t.sheetTitle;
    els.emptyTitle.textContent = t.emptyTitle;
    els.emptyBody.textContent = t.emptyBody;
    els.emptyClaim.textContent = t.claimCta;
    els.btnAddClaim.textContent = `+ ${t.claimCta}`;
    els.btnMobileClaim.textContent = `+ ${t.claimCta}`;
    document.title = `${state.title} · Potluck Plate`;
  }

  function renderMeta() {
    els.title.value = state.title || '';
    const line = [formatDate(state.date), state.place, state.notes].filter(Boolean);
    const themeName = (THEMES.find((t) => t.id === state.theme) || THEMES[0]).name;
    els.meta.innerHTML = `
      <p class="meta-line">${line.map((part, i) => i === 0 ? `<strong>${escapeHtml(part)}</strong>` : escapeHtml(part)).join(' <span class="dot" aria-hidden="true">·</span> ')}</p>
      <div class="meta-pills">
        <span class="chip quiet">${escapeHtml(tpl().name)}</span>
        <span class="chip quiet">${escapeHtml(themeName)}</span>
      </div>`;
  }

  function renderMeters() {
    if (!state.categories.length) {
      els.meters.innerHTML = '<p class="meters-empty">Add categories to track what’s still needed.</p>';
      return;
    }
    els.meters.innerHTML = state.categories.map((cat) => {
      const n = state.claims.filter((c) => c.category === cat.id).length;
      const target = clamp(cat.needed, 0, 99);
      const need = Math.max(1, target);
      const pct = Math.min(100, Math.round((n / need) * 100));
      const full = target > 0 && n >= target ? ' full' : '';
      return `<div class="meter${full}"><div class="label">${escapeHtml(cat.name)}</div><div class="count">${n} / ${target}</div><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>`;
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
      const tags = (c.tags || []).map((x) => `<span class="pill">${escapeHtml(x)}</span>`).join('');
      return `<li class="claim" data-id="${escapeHtml(c.id)}">
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
    els.catsEmpty.classList.toggle('hidden', state.categories.length > 0);
    els.catList.innerHTML = state.categories.map((cat, i) => {
      const n = state.claims.filter((c) => c.category === cat.id).length;
      const claimed = n === 1 ? '1 claimed' : `${n} claimed`;
      return `<li class="cat" data-id="${escapeHtml(cat.id)}">
        <div class="cat-reorder">
          <button type="button" class="icon-btn cat-up" aria-label="Move ${escapeHtml(cat.name)} up" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="icon-btn cat-down" aria-label="Move ${escapeHtml(cat.name)} down" ${i === state.categories.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <div class="cat-copy">
          <input class="cat-name" maxlength="32" value="${escapeHtml(cat.name)}" aria-label="Category name" />
          <div class="who">${claimed}</div>
        </div>
        <label class="needed-wrap">Need
          <input type="number" min="0" max="99" value="${cat.needed}" data-needed="${escapeHtml(cat.id)}" aria-label="Needed ${escapeHtml(cat.name)}" />
        </label>
        <button type="button" class="icon-btn cat-del" aria-label="Remove ${escapeHtml(cat.name)}">✕</button>
      </li>`;
    }).join('');
  }

  function fillCategorySelect(selected) {
    els.claimCategory.innerHTML = state.categories.map((c) =>
      `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
    ).join('');
  }

  function render() {
    if (!state) return;
    applyTheme(state.theme);
    renderCopy();
    renderMeta();
    renderMeters();
    renderClaims();
    renderCats();
    els.mobileCta.classList.toggle('hidden', !state.categories.length);
    save(state);
  }

  function showSetup(show) {
    needsSetup = show;
    els.setup.classList.toggle('hidden', !show);
    els.mobileCta.classList.toggle('hidden', show);
    if (show) {
      renderTemplateGrid();
      bindThemeRow(els.setupThemes, () => setupPick.theme, (id) => {
        setupPick.theme = applyTheme(id);
      });
      applyTheme(setupPick.theme);
    }
  }

  function pickSetupTemplate(id) {
    setupPick.templateId = id;
    const t = TEMPLATES[id];
    els.setupDetails.classList.remove('hidden');
    els.setupTitleInput.value = t.defaultTitle;
    els.setupTitleInput.focus();
    renderTemplateGrid();
  }

  function startFromSetup() {
    if (!setupPick.templateId) {
      toast('Pick an event type first');
      return;
    }
    state = eventFromSetup(
      setupPick.templateId,
      els.setupTitleInput.value,
      els.setupDate.value,
      setupPick.theme
    );
    showSetup(false);
    render();
    toast('Event ready — add claims, then share a snapshot link', 3200);
  }

  function openEventDialog() {
    const f = els.eventForm;
    const t = tpl();
    f.title.value = state.title || '';
    f.date.value = state.date || '';
    f.place.value = state.place || '';
    f.notes.value = state.notes || '';
    els.eventPlace.placeholder = t.placePlaceholder;
    els.eventNotes.placeholder = t.notesPlaceholder;
    els.eventTemplate.innerHTML = TEMPLATE_IDS.map((id) =>
      `<option value="${id}" ${id === state.templateId ? 'selected' : ''}>${escapeHtml(TEMPLATES[id].name)}</option>`
    ).join('');
    bindThemeRow(els.eventThemes, () => state.theme, (id) => {
      state.theme = applyTheme(id);
      save(state);
    });
    els.eventDialog.showModal();
  }

  function openClaimDialog(claim) {
    if (!state.categories.length) {
      toast('Add a category first');
      return;
    }
    const f = els.claimForm;
    const t = tpl();
    f.reset();
    f.id.value = claim ? claim.id : '';
    f.person.value = claim ? claim.person : '';
    f.dish.value = claim ? claim.dish : '';
    f.notes.value = claim ? (claim.notes || '') : '';
    document.getElementById('itemLabelText').textContent = t.itemLabel;
    f.dish.placeholder = t.itemPlaceholder;
    fillCategorySelect(claim ? claim.category : state.categories[0].id);
    f.querySelectorAll('input[name="tag"]').forEach((box) => {
      box.checked = !!(claim && claim.tags && claim.tags.includes(box.value));
    });
    els.claimDialogTitle.textContent = claim ? t.editTitle : t.claimTitle;
    els.btnDeleteClaim.classList.toggle('hidden', !claim);
    els.claimDialog.showModal();
  }

  function catIdFromName(name) {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
    let id = slug || uid();
    if (state.categories.some((c) => c.id === id)) id = `${slug || 'cat'}-${uid().slice(0, 4)}`;
    return id;
  }

  function addCategory() {
    const name = prompt('Category name?');
    if (!name || !name.trim()) return;
    state.categories.push({ id: catIdFromName(name), name: name.trim().slice(0, 32), needed: 2 });
    render();
    toast('Category added');
  }

  function moveCat(id, dir) {
    const i = state.categories.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= state.categories.length) return;
    const next = state.categories.slice();
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
    state.categories = next;
    render();
  }

  function removeCat(id) {
    const cat = state.categories.find((c) => c.id === id);
    if (!cat) return;
    const n = state.claims.filter((c) => c.category === id).length;
    if (n && state.categories.length === 1) {
      toast('Add another category before removing this one');
      return;
    }
    if (n) {
      const dest = state.categories.find((c) => c.id !== id);
      if (!confirm(`Remove “${cat.name}”? ${n} claim(s) move to “${dest.name}”.`)) return;
      state.claims.forEach((c) => { if (c.category === id) c.category = dest.id; });
    }
    state.categories = state.categories.filter((c) => c.id !== id);
    render();
  }

  document.getElementById('templateGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-template]');
    if (!btn) return;
    pickSetupTemplate(btn.dataset.template);
  });
  document.getElementById('btnStart').addEventListener('click', startFromSetup);
  document.getElementById('btnSample').addEventListener('click', () => {
    state = demoEvent();
    showSetup(false);
    render();
    toast('Sample potluck loaded — demo names are fictional');
  });

  document.getElementById('btnEditEvent').addEventListener('click', openEventDialog);
  document.getElementById('btnCancelEvent').addEventListener('click', () => els.eventDialog.close());
  els.eventForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = els.eventForm;
    const nextTemplate = f.template.value;
    state.title = f.title.value.trim() || 'Untitled event';
    state.date = f.date.value;
    state.place = f.place.value.trim();
    state.notes = f.notes.value.trim();
    const pressedTheme = els.eventThemes.querySelector('[aria-pressed="true"]');
    if (pressedTheme) state.theme = applyTheme(pressedTheme.dataset.themeId);
    if (nextTemplate !== state.templateId) applyTemplateToState(nextTemplate);
    els.eventDialog.close();
    render();
    toast('Event saved');
  });

  els.title.addEventListener('change', () => {
    if (!state) return;
    state.title = els.title.value.trim() || 'Untitled event';
    save(state);
    document.title = `${state.title} · Potluck Plate`;
  });

  document.getElementById('btnAddClaim').addEventListener('click', () => openClaimDialog(null));
  document.getElementById('btnEmptyClaim').addEventListener('click', () => openClaimDialog(null));
  document.getElementById('btnMobileClaim').addEventListener('click', () => openClaimDialog(null));
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
    toast(idx >= 0 ? 'Claim updated' : 'Claimed');
  });

  els.btnDeleteClaim.addEventListener('click', () => {
    const id = els.claimForm.id.value;
    state.claims = state.claims.filter((c) => c.id !== id);
    els.claimDialog.close();
    render();
    toast('Claim removed');
  });

  document.getElementById('btnAddCat').addEventListener('click', addCategory);
  document.getElementById('btnAddCatEmpty').addEventListener('click', addCategory);

  els.catList.addEventListener('change', (e) => {
    const needed = e.target.closest('input[data-needed]');
    if (needed) {
      const cat = state.categories.find((c) => c.id === needed.dataset.needed);
      if (!cat) return;
      cat.needed = clamp(needed.value, 0, 99);
      render();
      return;
    }
    const nameInput = e.target.closest('.cat-name');
    if (nameInput) {
      const cat = state.categories.find((c) => c.id === nameInput.closest('.cat').dataset.id);
      if (!cat) return;
      cat.name = nameInput.value.trim().slice(0, 32) || cat.name;
      render();
    }
  });

  els.catList.addEventListener('click', (e) => {
    const row = e.target.closest('.cat');
    if (!row) return;
    if (e.target.closest('.cat-up')) moveCat(row.dataset.id, -1);
    else if (e.target.closest('.cat-down')) moveCat(row.dataset.id, 1);
    else if (e.target.closest('.cat-del')) removeCat(row.dataset.id);
  });

  document.getElementById('btnShare').addEventListener('click', async () => {
    if (!state) return;
    const url = encodeShare(state);
    try {
      await navigator.clipboard.writeText(url);
      toast('Copied — snapshot link, not live sync', 3400);
    } catch (_) {
      prompt('Copy this snapshot share link (not live sync):', url);
    }
  });

  document.getElementById('btnPrint').addEventListener('click', () => window.print());
  document.getElementById('btnAbout').addEventListener('click', () => els.aboutDialog.showModal());
  document.getElementById('btnCloseAbout').addEventListener('click', () => els.aboutDialog.close());

  document.getElementById('btnReset').addEventListener('click', () => {
    if (!confirm('Clear this device and start a new event?')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
    state = null;
    setupPick = { templateId: '', theme: 'paprika' };
    els.setupDetails.classList.add('hidden');
    showSetup(true);
    toast('Cleared — pick a template to start again');
  });

  if (fromShare) {
    queueMicrotask(() => toast('Loaded a shared snapshot. Edits stay on this device until you share again.', 3600));
  }

  if (needsSetup) {
    showSetup(true);
  } else {
    showSetup(false);
    render();
  }
})();
