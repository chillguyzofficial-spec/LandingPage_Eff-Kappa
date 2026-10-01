(() => {
  'use strict';

  // Glow che segue il mouse (solo con un puntatore vero)
  const glow = document.querySelector('.glow');
  if (glow && window.matchMedia('(hover: hover)').matches) {
    let raf = null;
    window.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        glow.style.setProperty('--gx', e.clientX + 'px');
        glow.style.setProperty('--gy', e.clientY + 'px');
      });
    }, { passive: true });
  }

  // Filtri per settore
  const chips = [...document.querySelectorAll('[data-filter]')];
  const cats = [...document.querySelectorAll('[data-category]')];
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => {
        const on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      cats.forEach((cat) => { cat.hidden = f !== 'all' && cat.dataset.category !== f; });
      // i blocchi appena mostrati devono essere visibili subito
      cats.forEach((cat) => cat.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in')));
    });
  });
  chips.forEach((c) => c.setAttribute('aria-pressed', c.classList.contains('is-active') ? 'true' : 'false'));

  // Comparsa morbida allo scroll
  const els = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .08 });
  els.forEach((el) => io.observe(el));
})();

