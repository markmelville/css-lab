// The Customize panel UI: theme list + actions, typography and colour fields,
// and the font browser sub-view. All state lives in Lab (lab.js); this file
// only renders it and calls Lab when something changes.
document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('meta-panel');
  if (!panel) return;
  const $ = sel => panel.querySelector(sel);
  const mainView = $('.meta-main');
  const fontView = $('.meta-fonts');

  // ---------- helpers ----------
  const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
  const ctx = document.createElement('canvas').getContext('2d');
  function toHex(color, fallback) {
    if (!color) return fallback;
    ctx.fillStyle = '#000';
    ctx.fillStyle = color.trim();
    const v = ctx.fillStyle; // '#rrggbb' or 'rgba(r, g, b, a)'
    if (v.startsWith('#')) return v;
    const m = v.match(/\d+(\.\d+)?/g);
    return m ? '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('') : fallback;
  }

  // ---------- theme list + actions ----------
  function renderThemes() {
    const box = $('.meta-themes');
    box.replaceChildren();
    const cur = Lab.current();
    const items = [
      ...Lab.THEMES.map(t => ({ id: t.id, name: t.name, sw: t.sw })),
      ...Lab.customs().map(c => {
        const base = Lab.THEMES.find(t => t.id === c.base) || Lab.THEMES[0];
        const col = c.settings?.colors || {};
        return { id: c.id, name: c.name, custom: true, sw: [col.bg || base.sw[0], col.text || base.sw[1], col.accent || base.sw[2]] };
      }),
    ];
    for (const t of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'meta-theme';
      b.setAttribute('aria-pressed', t.id === cur.id);
      b.innerHTML = '<span class="meta-swatch"></span><span class="meta-theme-name"></span>';
      b.querySelector('.meta-theme-name').textContent = t.name;
      if (t.custom) b.classList.add('is-custom');
      const [bg, text, accent] = t.sw;
      b.firstChild.style.cssText = `--sw-bg:${bg};--sw-text:${text};--sw-accent:${accent}`;
      b.addEventListener('click', () => Lab.setTheme(t.id));
      box.append(b);
    }
    $('[data-act="rename"]').disabled = !cur.custom;
    $('[data-act="delete"]').disabled = !cur.custom;
    const changed = Object.keys(Lab.settings()).some(k => Object.keys(Lab.settings()[k] || {}).length);
    $('[data-act="reset"]').disabled = !changed;
    $('.meta-note').textContent = cur.custom
      ? `Your theme, based on ${cur.info.name}.`
      : cur.id === 'default'
        ? 'Default is a minimal, neutral starting point. Everything you set below builds your theme. Duplicate it to keep several.'
        : `Changes you make here are kept on top of ${cur.name}. Duplicate to make it your own copy.`;
  }

  const fileIn = $('input[type="file"]');
  panel.querySelector('.meta-actions').addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const cur = Lab.current();
    if (act === 'duplicate') Lab.duplicate();
    if (act === 'rename') { const n = prompt('Theme name', cur.name); if (n) Lab.rename(n.trim()); }
    if (act === 'delete' && confirm(`Delete "${cur.name}"?`)) Lab.remove();
    if (act === 'reset' && confirm(`Reset all changes to "${cur.name}"?`)) Lab.resetCurrent();
    if (act === 'export') {
      const { filename, text } = Lab.exportCurrent();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'text/css' }));
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    if (act === 'import') fileIn.click();
  });
  fileIn.addEventListener('change', async () => {
    const file = fileIn.files[0];
    fileIn.value = '';
    if (!file) return;
    try { Lab.importText(await file.text()); }
    catch (err) { alert(`Couldn't import: ${err.message}`); }
  });

  // ---------- fields ----------
  const TYPE_FIELDS = [
    { kind: 'font', slot: 'heading', label: 'Headings' },
    { kind: 'font', slot: 'body', label: 'Body' },
    { kind: 'font', slot: 'code', label: 'Code' },
    { kind: 'range', key: 'type.headingScale', label: 'Heading size', min: 0.5, max: 2, step: 0.05, def: 1, fmt: v => Math.round(v * 100) + '%' },
    { kind: 'select', key: 'type.headingWeight', label: 'Heading weight',
      options: [['', 'Theme'], ['300', 'Light'], ['400', 'Regular'], ['500', 'Medium'], ['700', 'Bold'], ['900', 'Black']] },
    { kind: 'select', key: 'type.headingCase', label: 'Heading case',
      options: [['', 'Theme'], ['none', 'As written'], ['uppercase', 'UPPERCASE'], ['small-caps', 'Small caps'], ['capitalize', 'Capitalized']] },
    { kind: 'range', key: 'type.headingTracking', label: 'Heading spacing', min: -0.05, max: 0.3, step: 0.01, def: 0, fmt: v => (+v).toFixed(2) + 'em' },
    { kind: 'range', key: 'type.bodySize', label: 'Body size', min: 12, max: 22, step: 1, def: 16, fmt: v => v + 'px' },
    { kind: 'range', key: 'type.lineHeight', label: 'Line height', min: 1, max: 2.2, step: 0.05, def: 1.5, fmt: v => (+v).toFixed(2) },
    { kind: 'select', key: 'type.headerAlign', label: 'Header align', options: [['', 'Theme'], ['left', 'Left'], ['center', 'Centre'], ['right', 'Right']] },
    { kind: 'select', key: 'type.textAlign', label: 'Text align', options: [['', 'Theme'], ['left', 'Left'], ['justify', 'Justified']] },
  ];
  const COLOR_FIELDS = [
    { key: 'colors.bg', label: 'Background', cssVar: '--bg', blank: '#ffffff' },
    { key: 'colors.surface', label: 'Cards', cssVar: '--panel', blank: '#ffffff' },
    { key: 'colors.text', label: 'Text', cssVar: '--text', blank: '#000000' },
    { key: 'colors.muted', label: 'Muted text', cssVar: '--muted', blank: '#555555' },
    { key: 'colors.accent', label: 'Accent', cssVar: '--accent', blank: '#0000ee' },
    { key: 'colors.line', label: 'Lines', cssVar: '--line', blank: '#cccccc' },
  ].map(f => ({ ...f, kind: 'color' }));

  const rows = [];
  function buildFields(group, fields) {
    const box = panel.querySelector(`.meta-fields[data-group="${group}"]`);
    for (const f of fields) {
      const row = document.createElement('div');
      row.className = 'meta-field';
      const label = document.createElement('span');
      label.className = 'meta-label';
      label.textContent = f.label;
      row.append(label);
      let control, valueOut;
      if (f.kind === 'font') {
        control = document.createElement('button');
        control.type = 'button';
        control.className = 'meta-font-name';
        control.title = 'Choose a font';
        control.addEventListener('click', () => openFonts(f.slot, f.label));
        f.key = 'fonts.' + f.slot;
      } else if (f.kind === 'range') {
        control = document.createElement('input');
        control.type = 'range';
        Object.assign(control, { min: f.min, max: f.max, step: f.step });
        valueOut = document.createElement('output');
        control.addEventListener('input', () => Lab.setPath(f.key, +control.value));
      } else if (f.kind === 'select') {
        control = document.createElement('select');
        for (const [v, t] of f.options) control.append(new Option(t, v));
        control.addEventListener('change', () => Lab.setPath(f.key, control.value));
      } else if (f.kind === 'color') {
        control = document.createElement('input');
        control.type = 'color';
        valueOut = document.createElement('output');
        control.addEventListener('input', () => Lab.setPath(f.key, control.value));
      }
      control.setAttribute('aria-label', f.label);
      row.append(control);
      if (valueOut) row.append(valueOut);
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'meta-x';
      x.textContent = '×';
      x.title = 'Back to the theme’s value';
      x.setAttribute('aria-label', `Reset ${f.label}`);
      x.addEventListener('click', () => Lab.setPath(f.key, null));
      row.append(x);
      box.append(row);
      rows.push({ f, row, control, valueOut });
    }
  }
  buildFields('type', TYPE_FIELDS);
  buildFields('colors', COLOR_FIELDS);

  function syncFields() {
    const s = Lab.settings();
    const cur = Lab.current();
    const rootStyle = getComputedStyle(document.documentElement);
    for (const { f, row, control, valueOut } of rows) {
      const v = get(s, f.key);
      const isSet = v != null && v !== '';
      row.classList.toggle('is-set', isSet);
      if (f.kind === 'font') {
        const themeName = cur.info.fonts[f.slot];
        control.textContent = isSet ? v.family : `${themeName} (theme)`;
        control.style.fontFamily = isSet ? Lab.fontStack(v) : (themeName === 'browser default' ? '' : `"${themeName}"`);
      } else if (f.kind === 'range') {
        const shown = isSet ? v : f.def;
        if (document.activeElement !== control) control.value = shown;
        valueOut.textContent = isSet ? f.fmt(v) : 'theme';
      } else if (f.kind === 'select') {
        control.value = isSet ? v : '';
      } else if (f.kind === 'color') {
        const hex = isSet ? v : toHex(rootStyle.getPropertyValue(f.cssVar), f.blank);
        if (document.activeElement !== control) control.value = hex;
        valueOut.textContent = isSet ? v : 'theme';
      }
    }
  }

  // ---------- font browser sub-view ----------
  const CATS = window.FONT_CATEGORIES;
  const FONTS = window.GOOGLE_FONTS.map(([family, cat, pop, weights]) => ({ family, cat, pop, weights }));
  const DEFAULT_TEXT = 'Sphinx of black quartz, judge my vow';
  const store = {
    get: (k, d) => { try { return localStorage.getItem('css-lab:' + k) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem('css-lab:' + k, v); } catch {} },
  };
  const textIn = $('#preview-text');
  const searchIn = $('#font-search');
  const sortSel = $('#font-sort');
  const sizeIn = $('#font-size');
  const countEl = $('#font-count');
  const chips = $('.meta-chips');
  const list = $('.meta-font-list');
  const state = {
    slot: 'heading',
    text: store.get('preview-text', DEFAULT_TEXT),
    query: '',
    cat: -1,
    sort: 'pop',
    size: Number(store.get('panel-preview-size', 32)),
  };
  textIn.value = state.text;
  sizeIn.value = state.size;
  list.style.setProperty('--sample-size', state.size + 'px');
  chips.innerHTML = ['All', ...CATS]
    .map((c, i) => `<button type="button" data-cat="${i - 1}" aria-pressed="${i === 0}">${c}</button>`)
    .join('');

  let fontRows = null;
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const f = e.target.font;
      Lab.loadFont(f.family, f.weights.includes(400) ? [400] : [f.weights[0]]);
      io.unobserve(e.target);
    }
  }, { root: fontView, rootMargin: '400px 0px' });

  function buildFontRows() {
    fontRows = FONTS.map(f => {
      const row = document.createElement('div');
      row.className = 'meta-font-row';
      row.font = f;
      row.innerHTML = `
        <div class="meta-font-top"><b></b><span>${CATS[f.cat]}</span><button type="button" data-use>Use</button></div>
        <p class="meta-sample"></p>`;
      row.querySelector('b').textContent = f.family;
      const sample = row.querySelector('.meta-sample');
      sample.style.fontFamily = Lab.fontStack(f);
      sample.textContent = state.text;
      io.observe(row);
      return row;
    });
  }
  function renderFontList() {
    const q = state.query.trim().toLowerCase();
    const sorted = state.sort === 'az'
      ? [...fontRows].sort((a, b) => a.font.family.localeCompare(b.font.family))
      : fontRows;
    let shown = 0;
    for (const row of sorted) {
      const f = row.font;
      const match = (state.cat < 0 || f.cat === state.cat) && (!q || f.family.toLowerCase().includes(q));
      row.hidden = !match;
      if (match) shown++;
      list.append(row);
    }
    countEl.textContent = `${shown.toLocaleString()} fonts`;
  }
  function markCurrentFont() {
    if (!fontRows) return;
    const picked = Lab.settings().fonts?.[state.slot]?.family;
    for (const row of fontRows) {
      const on = row.font.family === picked;
      row.classList.toggle('is-current', on);
      row.querySelector('[data-use]').textContent = on ? 'In use' : 'Use';
    }
  }
  function setCat(cat) {
    state.cat = cat;
    for (const c of chips.children) c.setAttribute('aria-pressed', Number(c.dataset.cat) === cat);
  }

  function openFonts(slot, label) {
    state.slot = slot;
    $('.meta-fonts-title').textContent = `${label} font`;
    if (!fontRows) buildFontRows();
    setCat(slot === 'code' ? CATS.indexOf('Monospace') : -1);
    renderFontList();
    markCurrentFont();
    panel.classList.add('show-fonts');
    mainView.inert = true;
    fontView.inert = false;
    fontView.scrollTop = 0;
    searchIn.focus();
  }
  function closeFonts() {
    panel.classList.remove('show-fonts');
    fontView.inert = true;
    mainView.inert = false;
  }
  $('[data-back]').addEventListener('click', closeFonts);
  panel.addEventListener('toggle', e => { if (e.newState === 'closed') closeFonts(); });

  textIn.addEventListener('input', () => {
    state.text = textIn.value || DEFAULT_TEXT;
    store.set('preview-text', textIn.value);
    if (fontRows) for (const row of fontRows) row.lastElementChild.textContent = state.text;
  });
  searchIn.addEventListener('input', () => { state.query = searchIn.value; renderFontList(); });
  sortSel.addEventListener('change', () => { state.sort = sortSel.value; renderFontList(); });
  sizeIn.addEventListener('input', () => {
    state.size = Number(sizeIn.value);
    list.style.setProperty('--sample-size', state.size + 'px');
    store.set('panel-preview-size', state.size);
  });
  chips.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    setCat(Number(b.dataset.cat));
    renderFontList();
  });
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-use]');
    if (!b) return;
    const { family, cat, weights } = b.closest('.meta-font-row').font;
    const picked = Lab.settings().fonts?.[state.slot]?.family;
    // Clicking the font in use again un-picks it (back to the theme's font)
    Lab.setPath('fonts.' + state.slot, picked === family ? null : { family, cat, weights });
  });

  // ---------- image credits for the theme in use (from credits-data.js) ----------
  function renderCredits() {
    const box = $('.meta-credits');
    const list = (window.THEME_CREDITS || {})[Lab.current().info.id] || [];
    box.hidden = !list.length;
    const ol = $('.meta-credit-list');
    ol.replaceChildren();
    for (const c of list) {
      const li = document.createElement('li');
      const link = (href, text) => {
        const a = document.createElement('a');
        a.href = href; a.textContent = text; a.target = '_blank'; a.rel = 'noopener';
        return a;
      };
      const title = document.createElement('div');
      title.className = 'meta-credit-title';
      title.append(c.source_url ? link(c.source_url, c.title) : c.title);
      const by = document.createElement('div');
      by.append(c.author + ' · ', c.license_url ? link(c.license_url, c.license) : c.license);
      const changes = document.createElement('div');
      changes.className = 'meta-credit-changes';
      changes.textContent = c.changes;
      li.append(title, by, changes);
      ol.append(li);
    }
  }

  // ---------- keep everything in sync ----------
  function sync() { renderThemes(); syncFields(); markCurrentFont(); renderCredits(); }
  document.addEventListener('lab:change', sync);
  // Theme fonts and colours arrive with the theme stylesheet, so re-read them once loaded
  document.fonts.ready.then(syncFields);
  window.addEventListener('load', syncFields);
  document.getElementById('theme-css')?.addEventListener('load', syncFields);
  sync();
});
