// Site behaviour (never used by the demos themselves):
// 1. The theme menu in the header: quick theme picker + "Customize…".
// 2. Selecting a card opens it in the modal, the only place its CSS/HTML
//    editing controls show. The theme chooses how via --card-open.
document.addEventListener('DOMContentLoaded', () => {
  // ---------- theme menu ----------
  const menu = document.querySelector('.theme-menu');
  const list = menu.querySelector('.theme-menu-list');
  const panel = document.getElementById('meta-panel');

  function renderThemeMenu() {
    const cur = Lab.current().id;
    const items = [
      ...Lab.THEMES.map(t => ({ id: t.id, name: t.name })),
      ...Lab.customs().map(c => ({ id: c.id, name: c.name, custom: true })),
    ];
    list.replaceChildren(...items.map(t => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.theme = t.id;
      b.textContent = t.name;
      b.setAttribute('aria-pressed', t.id === cur);
      if (t.custom) b.classList.add('is-custom');
      li.append(b);
      return li;
    }));
  }
  // Picking a theme keeps the menu open, so you can flip through them
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-theme]');
    if (b) Lab.setTheme(b.dataset.theme);
  });
  menu.querySelector('.theme-menu-customize').addEventListener('click', () => {
    menu.open = false;
    if (!panel.matches(':popover-open')) panel.showPopover();
  });
  // Close on a click elsewhere or Esc (like a dropdown)
  document.addEventListener('click', e => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  menu.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
  document.addEventListener('lab:change', renderThemeMenu);
  renderThemeMenu();

  // ---------- card modal ----------
  const modal = document.querySelector('.card-modal');
  const gallery = document.querySelector('main.gallery');
  let open = null; // { card, placeholder, mode }
  const modeOf = () => getComputedStyle(modal).getPropertyValue('--card-open').trim();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // Each card's bookmark name is its "View this demo" link (#neon-sign), fixed
  // in the HTML so renaming a demo doesn't break old links.
  const slug = card => card.querySelector('.demo-link').getAttribute('href').slice(1);
  const cardFor = id => id && [...gallery.querySelectorAll('.demo:not(.demo-placeholder)')].find(c => slug(c) === id);

  for (const card of gallery.querySelectorAll('.demo')) {
    card.tabIndex = 0;
    card.setAttribute('aria-label', `Open ${card.querySelector('h2').textContent}`);
  }

  // ---------- numbering the visible cards ----------
  // CSS can count siblings (:nth-child, sibling-index()) but not only the ones
  // a filter has hidden with display:none. So the visible cards are numbered
  // here, for themes whose layout depends on position (pairs, rings, rows):
  //   data-vis="1".."n"  data-vis-end="1" (last).."n"  data-vis-parity="odd|even"
  //   --vis-k: 0-based position (on the card)   --vis-n: count (on <html>)
  // Works for any number of cards; renumbered on every search/filter change.
  function numberVisible() {
    const cards = [...gallery.children].filter(c => c.matches('.demo'));
    const shown = cards.filter(c => c.checkVisibility());
    for (const c of cards) {
      const k = shown.indexOf(c);
      if (k < 0) {
        delete c.dataset.vis; delete c.dataset.visEnd; delete c.dataset.visParity;
        c.style.removeProperty('--vis-k');
        continue;
      }
      c.dataset.vis = k + 1;
      c.dataset.visEnd = shown.length - k;
      c.dataset.visParity = k % 2 ? 'even' : 'odd';
      c.style.setProperty('--vis-k', k);
    }
    document.documentElement.style.setProperty('--vis-n', shown.length);
  }
  document.getElementById('demo-search').addEventListener('input', numberVisible);
  document.querySelector('.filter-chips').addEventListener('change', numberVisible);
  numberVisible();

  // FLIP: make the card look like it's still at `from`, then animate to where it is
  function flip(card, from, to, reverse = false) {
    const dx = from.left - to.left, dy = from.top - to.top, s = from.width / to.width;
    const frames = [
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, transformOrigin: 'top left' },
      { transform: 'none', transformOrigin: 'top left' },
    ];
    return card.animate(reverse ? frames.reverse() : frames, {
      duration: reverse ? 450 : 650,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      fill: reverse ? 'forwards' : 'none',
    });
  }

  // An open card is in the URL (#neon-sign), in every theme, so it can be
  // bookmarked or shared. Opening adds a history entry: Back closes the card.
  // push: false when the URL already names the card (a link, Back/Forward).
  function openCard(card, { push = true, animate = true } = {}) {
    if (open) return;
    const mode = modeOf();
    const from = card.getBoundingClientRect();
    // Hold the card's slot so the page behind doesn't reflow
    const placeholder = document.createElement('section');
    placeholder.className = 'demo demo-placeholder';
    placeholder.dataset.features = card.dataset.features;
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.style.height = card.offsetHeight + 'px';
    card.replaceWith(placeholder);
    numberVisible();
    card.removeAttribute('aria-label');
    modal.append(card);
    open = { card, placeholder, mode };
    modal.showModal();
    modal.scrollTop = 0;
    if (mode === 'zoom' && animate && !reduceMotion.matches) flip(card, from, card.getBoundingClientRect());
    if (push) history.pushState({ cssLabCard: slug(card) }, '', '#' + slug(card));
  }

  async function closeCard() {
    if (!open || modal.classList.contains('closing')) return;
    if (open.mode === 'zoom' && !reduceMotion.matches) {
      modal.classList.add('closing');
      const to = open.placeholder.getBoundingClientRect();
      await flip(open.card, to, open.card.getBoundingClientRect(), true).finished;
    }
    modal.close();
  }
  function restoreCard() {
    modal.classList.remove('closing');
    if (!open) return;
    const { card, placeholder } = open;
    open = null;
    // drop the zoom-out animation that's holding the card in its shrunk pose
    card.getAnimations().forEach(a => { if (!(a instanceof CSSAnimation)) a.cancel(); });
    placeholder.replaceWith(card);
    numberVisible();
    // Closed without going back (e.g. it was opened from a link): drop the #card
    if (location.hash === '#' + slug(card)) history.replaceState(null, '', location.pathname + location.search);
    card.querySelectorAll('.tools details').forEach(d => { d.open = false; }); // editor starts closed next time
    card.setAttribute('aria-label', `Open ${card.querySelector('h2').textContent}`);
    (selectByLink() ? card.querySelector('.demo-link') : card).focus({ preventScroll: true });
  }

  // Cards are keyboard stops only when the theme opens them by clicking the card
  function syncCardFocus() {
    const byLink = selectByLink();
    for (const card of gallery.querySelectorAll('.demo:not(.demo-placeholder)')) card.tabIndex = byLink ? -1 : 0;
  }
  document.addEventListener('lab:change', syncCardFocus);
  document.addEventListener('lab:themeready', syncCardFocus);
  window.addEventListener('load', syncCardFocus);

  // How a card is selected is the theme's choice too (--card-select):
  // "link" = only the "View this demo" link under the title opens it;
  // otherwise a click anywhere on the card except its live demo.
  const selectByLink = () => getComputedStyle(gallery).getPropertyValue('--card-select').trim() === 'link';
  gallery.addEventListener('click', e => {
    const link = e.target.closest('.demo-link');
    if (link) {
      e.preventDefault();
      openCard(link.closest('.demo'));
      return;
    }
    if (selectByLink()) return;
    if (e.target.closest('a')) return; // e.g. a credit link: follow it, don't open the card
    const card = e.target.closest('.demo:not(.demo-placeholder)');
    if (!card || e.target.closest('.preview')) return;
    openCard(card);
  });
  gallery.addEventListener('keydown', e => {
    if (selectByLink()) return;
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.demo:not(.demo-placeholder)')) {
      e.preventDefault();
      openCard(e.target);
    }
  });

  // Closing goes back through history when opening added an entry, so Back
  // and the close button agree; otherwise (opened from a link) it just closes.
  const goBack = () => (history.state?.cssLabCard ? history.back() : closeCard());
  // Back/Forward, or a #card typed into the address bar
  window.addEventListener('popstate', () => {
    const want = location.hash.slice(1);
    if (open) { if (slug(open.card) !== want) open.mode === 'page' ? modal.close() : closeCard(); }
    else if (cardFor(want)) openCard(cardFor(want), { push: false });
  });

  modal.querySelector('.card-modal-close').addEventListener('click', goBack);
  modal.querySelector('.card-modal-back').addEventListener('click', goBack);
  // Click on the backdrop (the dialog box itself, outside the card) closes it,
  // except in "page" mode, where only Back does
  modal.addEventListener('click', e => { if (e.target === modal && open?.mode !== 'page') goBack(); });
  modal.addEventListener('cancel', e => { e.preventDefault(); goBack(); }); // Esc
  modal.addEventListener('close', restoreCard);

  // A link to a card (…?theme=fight-night#neon-sign) opens it straight away,
  // with the gallery behind scrolled to it, so closing lands you there.
  const linked = cardFor(location.hash.slice(1));
  if (linked) {
    linked.scrollIntoView({ block: 'center', behavior: 'instant' });
    openCard(linked, { push: false, animate: false });
  }
});
