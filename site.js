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
  const slug = card => card.querySelector('h2').textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  for (const card of gallery.querySelectorAll('.demo')) {
    card.tabIndex = 0;
    card.setAttribute('aria-label', `Open ${card.querySelector('h2').textContent}`);
  }

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

  function openCard(card) {
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
    card.removeAttribute('aria-label');
    modal.append(card);
    open = { card, placeholder, mode };
    modal.showModal();
    modal.scrollTop = 0;
    if (mode === 'zoom' && !reduceMotion.matches) flip(card, from, card.getBoundingClientRect());
    if (mode === 'page') history.pushState({ cssLabCard: slug(card) }, '', '#' + slug(card));
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
  document.getElementById('theme-css')?.addEventListener('load', syncCardFocus);
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

  // "page" mode closes through history, like navigating back
  const goBack = () => (open?.mode === 'page' ? history.back() : closeCard());
  window.addEventListener('popstate', () => { if (open?.mode === 'page') modal.close(); });

  modal.querySelector('.card-modal-close').addEventListener('click', closeCard);
  modal.querySelector('.card-modal-back').addEventListener('click', goBack);
  // Click on the backdrop (the dialog box itself, outside the card) closes it,
  // except in "page" mode, where only Back does
  modal.addEventListener('click', e => { if (e.target === modal && open?.mode !== 'page') closeCard(); });
  modal.addEventListener('cancel', e => { e.preventDefault(); goBack(); }); // Esc
  modal.addEventListener('close', restoreCard);
});
