// Themes + customizations. Loaded in <head>, so the saved theme and overrides
// are in place before first paint.
//
// Model
// - Built-in themes are CSS files (themes/<id>.css), loaded into @layer theme.
//   Default is the minimal, neutral one (and the starting point for your own).
// - Every theme can be customized. Settings → CSS by generateCss(), written
//   UNLAYERED into <style id="theme-overrides">, so it beats the theme without
//   !important. Built-in themes keep their changes in prefs.overrides[id].
// - Custom themes ({id, name, base, settings}) are a base theme file + settings.
//   Export = a .css file with the settings as JSON in its first comment, so
//   Import restores it exactly.
(() => {
  const THEMES = [
    { id: 'default',   name: 'Default',        fonts: { heading: 'system UI', body: 'system UI', code: 'system mono' }, sw: ['#fafafa', '#1b1b1f', '#2f5bea'] },
    { id: 'darkroom',  name: 'Darkroom',       fonts: { heading: 'Bricolage Grotesque', body: 'Instrument Sans', code: 'JetBrains Mono' }, sw: ['#0e0f12', '#ece8df', '#ffb454'] },
    { id: 'editorial', name: 'Editorial',      fonts: { heading: 'Fraunces', body: 'Newsreader', code: 'IBM Plex Mono' }, sw: ['#f2ece1', '#1c1915', '#b3301c'] },
    { id: 'arcade',    name: 'Arcade',         fonts: { heading: 'Press Start 2P', body: 'Space Mono', code: 'Space Mono' }, sw: ['#0a0720', '#e6f6ff', '#ff3ea5'] },
    { id: 'extra',     name: 'Extra! Extra!',    fonts: { heading: 'Anton', body: 'Old Standard TT', code: 'Courier Prime' }, sw: ['#ece7dc', '#1c1814', '#ad1f18'] },
    { id: 'creepy-carousel', name: 'Something Wicked', fonts: { heading: 'Rye', body: 'IM Fell English', code: 'Cutive Mono' }, sw: ['#120d11', '#ecdcb8', '#b3342c'] },
    { id: 'html1',     name: 'HTML 1.0',       fonts: { heading: 'browser default', body: 'browser default', code: 'browser default' }, sw: ['#ffffff', '#000000', '#0000ee'] },
    { id: 'dangerous-forest', name: 'Dangerous Forest', fonts: { heading: 'Gloock', body: 'Alegreya', code: 'Overpass Mono' }, sw: ['#0b120e', '#e6dcc0', '#e3b23c'] },
    { id: 'silent-movie', name: 'Silent Movie', fonts: { heading: 'Federant', body: 'Cormorant Garamond', code: 'Xanh Mono' }, sw: ['#0a0908', '#ece3cf', '#d9b672'] },
    { id: 'fight-night', name: 'Fight Night', fonts: { heading: 'Alfa Slab One', body: 'Zilla Slab', code: 'DM Mono' }, sw: ['#e9d9ad', '#17120d', '#c4221a'] },
    { id: 'gig-flyer', name: 'Gig Flyer', fonts: { heading: 'Rubik Dirt', body: 'Archivo Narrow', code: 'Courier Prime' }, sw: ['#4a4845', '#121212', '#ff2e88'] },
    { id: 'camper-van', name: 'Camper Van', fonts: { heading: 'Shrikhand', body: 'Fraunces', code: 'DM Mono' }, sw: ['#f1deb6', '#3a2212', '#c8541a'] },
    { id: 'cowboy-comic', name: 'Cowboy Comic', fonts: { heading: 'Smokum', body: 'Comic Neue', code: 'Victor Mono' }, sw: ['#efe0b9', '#1d1712', '#c7311e'] },
    // (in progress) { id: 'case-file', name: 'Case File', fonts: { heading: 'TBD', body: 'TBD', code: 'TBD' }, sw: ['#888888', '#111111', '#555555'] },
    // (in progress) { id: 'gallery', name: 'Gallery', fonts: { heading: 'TBD', body: 'TBD', code: 'TBD' }, sw: ['#888888', '#111111', '#555555'] },
    // (in progress) { id: 'creature-feature', name: 'Creature Feature', fonts: { heading: 'TBD', body: 'TBD', code: 'TBD' }, sw: ['#888888', '#111111', '#555555'] },
    // (in progress) { id: 'nouvelle-vague', name: 'Nouvelle Vague', fonts: { heading: 'TBD', body: 'TBD', code: 'TBD' }, sw: ['#888888', '#111111', '#555555'] },
    // (in progress) { id: 'orange-grove', name: 'Orange Grove', fonts: { heading: 'TBD', body: 'TBD', code: 'TBD' }, sw: ['#888888', '#111111', '#555555'] },
    // (in progress) { id: 'alaska', name: 'Alaska', fonts: { heading: 'TBD', body: 'TBD', code: 'TBD' }, sw: ['#888888', '#111111', '#555555'] },
  ];
  const DEFAULT_THEME = 'default';
  // "Blank" was renamed "Default": anything saved under the old id carries over
  const renamed = id => (id === 'blank' ? 'default' : id);
  // Generic fallback per catalog category: Sans Serif, Serif, Display, Handwriting, Monospace
  const FALLBACK = ['sans-serif', 'serif', 'sans-serif', 'cursive', 'monospace'];
  const KEY = 'css-lab:prefs';
  const clone = o => JSON.parse(JSON.stringify(o ?? {}));

  // ---------- storage ----------
  function read() {
    let p;
    try { p = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { p = {}; }
    p.overrides ??= {};
    p.custom ??= [];
    if (p.theme) p.theme = renamed(p.theme);
    if (p.overrides.blank) { p.overrides.default ??= p.overrides.blank; delete p.overrides.blank; }
    for (const c of p.custom) c.base = renamed(c.base);
    // Older shape: {heading, body} applied to every theme → move onto the current theme
    for (const slot of ['heading', 'body']) {
      if (p[slot]) {
        const id = p.theme || DEFAULT_THEME;
        ((p.overrides[id] ??= {}).fonts ??= {})[slot] = p[slot];
        delete p[slot];
      }
    }
    return p;
  }
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {} };
  let prefs = read();

  // ---------- theme lookup ----------
  const builtin = id => THEMES.find(t => t.id === id);
  function current() {
    const c = prefs.custom.find(t => t.id === prefs.theme);
    if (c) return { ...c, custom: true, info: builtin(c.base) || builtin(DEFAULT_THEME) };
    const b = builtin(prefs.theme) || builtin(DEFAULT_THEME);
    return { id: b.id, name: b.name, base: b.id, custom: false, info: b };
  }
  function settings() {
    const c = prefs.custom.find(t => t.id === prefs.theme);
    if (c) return (c.settings ??= {});
    return (prefs.overrides[current().id] ??= {});
  }

  // ---------- fonts ----------
  const loaded = new Set();
  function loadFont(family, weights = [400]) {
    const want = weights.filter(w => w === 400 || w === 700);
    const ws = want.length ? want : [weights[0]];
    const url = 'https://fonts.googleapis.com/css2?family=' +
      encodeURIComponent(family).replace(/%20/g, '+') + ':wght@' + ws.join(';') + '&display=swap';
    if (loaded.has(url)) return;
    loaded.add(url);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.append(link);
  }
  const fontStack = f => `"${f.family}", ${FALLBACK[f.cat] ?? 'sans-serif'}`;

  // ---------- settings → CSS ----------
  // Only settings that are set produce CSS, so an untouched theme is unchanged.
  // Each value sets the theme variable (built-in themes are built on these)
  // AND a plain rule (so it also works on themes with no variables, like HTML 1.0).
  function generateCss(s = {}) {
    const root = [];
    const bySelector = new Map(); // merge everything aimed at the same selector
    const rule = (sel, decls) => bySelector.set(sel, [...(bySelector.get(sel) || []), ...decls]);
    const f = s.fonts || {}, t = s.type || {}, c = s.colors || {};

    if (f.heading) { root.push(`--font-heading: ${fontStack(f.heading)}`); rule('h1, h2, h3', [`font-family: ${fontStack(f.heading)}`]); }
    if (f.body)    { root.push(`--font-body: ${fontStack(f.body)}`);       rule('body', [`font-family: ${fontStack(f.body)}`]); }
    if (f.code)    { root.push(`--font-mono: ${fontStack(f.code)}`);       rule('code, pre, textarea', [`font-family: ${fontStack(f.code)}`]); }

    const h = [];
    if (t.headingWeight) h.push(`font-weight: ${t.headingWeight}`);
    if (t.headingCase === 'small-caps') h.push('text-transform: none', 'font-variant-caps: all-small-caps');
    else if (t.headingCase) h.push(`text-transform: ${t.headingCase}`, 'font-variant-caps: normal');
    if (t.headingTracking != null) h.push(`letter-spacing: ${t.headingTracking}em`);
    if (h.length) rule('h1, h2, h3', h);
    // zoom scales a heading whatever font-size the theme gave it
    if (t.headingScale != null && t.headingScale !== 1) rule('header.site h1, .demo > h2', [`zoom: ${t.headingScale}`]);

    const b = [];
    if (t.bodySize != null) b.push(`font-size: ${t.bodySize}px`);
    if (t.lineHeight != null) b.push(`line-height: ${t.lineHeight}`);
    if (t.textAlign) b.push(`text-align: ${t.textAlign}`, `hyphens: ${t.textAlign === 'justify' ? 'auto' : 'manual'}`);
    if (b.length) rule('body', b);
    if (t.headerAlign) {
      rule('header.site', [`text-align: ${t.headerAlign}`]);
      rule('.filter-bar', [`justify-content: ${{ left: 'flex-start', center: 'center', right: 'flex-end' }[t.headerAlign]}`]);
    }

    if (c.bg)      { root.push(`--bg: ${c.bg}`);       rule('body', [`background-color: ${c.bg}`]); }
    if (c.text)    { root.push(`--text: ${c.text}`);   rule('body', [`color: ${c.text}`]); }
    if (c.surface) { root.push(`--panel: ${c.surface}`); rule('.demo, .filter-bar', [`background-color: ${c.surface}`]); }
    if (c.muted)   { root.push(`--muted: ${c.muted}`); rule('header.site p, .filter-count, .tools summary', [`color: ${c.muted}`]); }
    if (c.accent)  { root.push(`--accent: ${c.accent}`, `accent-color: ${c.accent}`); rule('a', [`color: ${c.accent}`]); }
    if (c.line)    { root.push(`--line: ${c.line}`);   rule('.demo, .filter-bar, .preview', [`border-color: ${c.line}`]); }

    const rules = [...bySelector].map(([sel, decls]) => `${sel} {\n  ${decls.join(';\n  ')};\n}`);
    if (root.length) rules.unshift(`:root {\n  ${root.join(';\n  ')};\n}`);
    return rules.join('\n\n');
  }

  // ---------- apply ----------
  const themeCss = base => `@layer core, theme;\n@import url("lab.css") layer(core);\n@import url("themes/${base}.css") layer(theme);\n`;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const themeReady = () => document.dispatchEvent(new CustomEvent('lab:themeready'));

  // A theme's images are all listed in its credits (credits-data.js), so they
  // can be fetched and decoded before the theme is shown.
  function themeImages(base) {
    const list = (window.THEME_CREDITS || {})[base] || [];
    return list.map(c => { const img = new Image(); img.src = `themes/${base}/${c.file}`; return img.decode().catch(() => {}); });
  }
  // Wait (up to a limit) for what makes a theme look "ready": its web fonts
  // (layout must have run, so the fonts it uses have started loading) and images.
  async function settle(base, images = themeImages(base)) {
    void document.body?.offsetWidth;
    await Promise.race([Promise.all([document.fonts.ready, ...images]), sleep(1500)]);
  }

  // Switching themes without a flash of half-styled page:
  // 1. load the new theme into a second, disabled <style> (the old theme stays
  //    on screen and usable meanwhile), with its images;
  // 2. then swap inside a View Transition, which keeps showing the old frame
  //    until the new theme's fonts are in, and cross-fades to it.
  let swapSeq = 0;
  async function swapTheme(base, afterSwap) {
    const seq = ++swapSeq;
    const next = document.createElement('style');
    next.media = 'not all';
    next.textContent = themeCss(base);
    const loaded = new Promise(r => { next.onload = next.onerror = r; });
    document.getElementById('theme-css').after(next);
    const images = themeImages(base);
    await Promise.race([loaded, sleep(4000)]);
    if (seq !== swapSeq) { next.remove(); return; } // a newer switch took over
    const update = async () => {
      const old = document.getElementById('theme-css');
      next.removeAttribute('media');
      old.remove();
      next.id = 'theme-css';
      afterSwap();
      await settle(base, images);
    };
    if (document.startViewTransition) await document.startViewTransition(update).updateCallbackDone.catch(() => {});
    else await update();
    themeReady();
  }

  let booted = false;
  function apply() {
    const cur = current();
    const s = settings();
    const finish = () => {
      for (const f of Object.values(s.fonts || {})) loadFont(f.family, f.weights);
      const out = document.getElementById('theme-overrides');
      if (out) out.textContent = generateCss(s);
      document.documentElement.dataset.theme = cur.base;
    };
    const sheet = document.getElementById('theme-css');
    const css = themeCss(cur.base);
    if (!booted) {
      // First run, while <head> is still being parsed: nothing is on screen
      // yet and the theme sheet is render-blocking, so set it directly.
      booted = true;
      if (sheet.textContent.trim() !== css.trim()) sheet.textContent = css;
      sheet.addEventListener('load', themeReady, { once: true });
      finish();
    } else if (sheet.textContent.trim() !== css.trim()) {
      swapTheme(cur.base, finish);
    } else {
      finish();
    }
    document.dispatchEvent(new CustomEvent('lab:change'));
  }

  // ---------- first load: hidden until ready ----------
  // index.html hides the page (and pauses animations) while <html> has
  // .lab-loading, so the first thing you see is the finished page, not one
  // still swapping in fonts. Revealed once fonts + theme images are in (max
  // 1.5s; a CSS fallback in index.html reveals it after 3s regardless).
  document.documentElement.classList.add('lab-loading');
  document.addEventListener('DOMContentLoaded', async () => {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await settle(current().base);
    document.documentElement.classList.remove('lab-loading');
  });
  function commit() { write(); apply(); }

  // ---------- actions ----------
  function setPath(path, value) {
    const keys = path.split('.');
    let o = settings();
    for (const k of keys.slice(0, -1)) o = (o[k] ??= {});
    const last = keys.at(-1);
    if (value == null || value === '') delete o[last]; else o[last] = value;
    commit();
  }
  function setTheme(id) { prefs.theme = id; commit(); }
  function newId() { return 'custom-' + Date.now().toString(36); }
  function duplicate() {
    const cur = current();
    const t = { id: newId(), name: `${cur.name} (copy)`, base: cur.base, settings: clone(settings()) };
    prefs.custom.push(t);
    prefs.theme = t.id;
    commit();
  }
  function rename(name) {
    const c = prefs.custom.find(t => t.id === prefs.theme);
    if (c && name) { c.name = name; commit(); }
  }
  function remove() {
    const i = prefs.custom.findIndex(t => t.id === prefs.theme);
    if (i < 0) return;
    const base = prefs.custom[i].base;
    prefs.custom.splice(i, 1);
    prefs.theme = base;
    commit();
  }
  function resetCurrent() {
    const c = prefs.custom.find(t => t.id === prefs.theme);
    if (c) c.settings = {}; else delete prefs.overrides[current().id];
    commit();
  }
  function exportCurrent() {
    const cur = current();
    const meta = { name: cur.name, base: cur.base, settings: settings() };
    const text =
      `/* css-lab theme\n${JSON.stringify(meta, null, 2)}\n*/\n` +
      `@import url("themes/${cur.base}.css");\n\n` +
      generateCss(meta.settings) + '\n';
    const slug = cur.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme';
    return { filename: `css-lab-theme-${slug}.css`, text };
  }
  function importText(text) {
    const m = /\/\*\s*css-lab theme\s*([\s\S]*?)\*\//.exec(text);
    if (!m) throw new Error('This file has no css-lab theme settings in its first comment.');
    const meta = JSON.parse(m[1]);
    const base = renamed(meta.base);
    const t = { id: newId(), name: meta.name || 'Imported theme', base: builtin(base) ? base : DEFAULT_THEME, settings: meta.settings || {} };
    prefs.custom.push(t);
    prefs.theme = t.id;
    commit();
  }

  window.Lab = {
    THEMES, FALLBACK, fontStack, loadFont, generateCss,
    current, settings, customs: () => prefs.custom, setPath, setTheme,
    duplicate, rename, remove, resetCurrent, exportCurrent, importText,
  };
  apply();

  // Change something in one tab and other open css-lab tabs follow.
  window.addEventListener('storage', e => {
    if (e.key === KEY) { prefs = read(); apply(); }
  });
})();
