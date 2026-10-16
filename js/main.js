(() => {
  'use strict';

  // Niente effetti legati al mouse (richiesta di Francesco): tutto il movimento dipende dallo scorrimento.
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const header = document.querySelector('.site-header');
  const headerH = () => (header ? header.offsetHeight : 0);

  // ---------- Apertura FK: al tocco le due ante si aprono sulla landing ----------
  const root = document.documentElement;
  const gate = document.querySelector('[data-gate]');
  if (gate && root.classList.contains('intro')) {
    const btn = gate.querySelector('[data-gate-open]');
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      try { sessionStorage.setItem('fk-entrato', '1'); } catch (e) { /* niente */ }
      root.classList.add('opening');
      setTimeout(() => {
        root.classList.remove('intro', 'opening');
        gate.remove();
        window.dispatchEvent(new Event('scroll'));
      }, still ? 220 : 1150);
    };
    btn.addEventListener('click', open);
    document.addEventListener('keydown', (e) => { if (['Enter', ' ', 'Escape'].includes(e.key) && root.classList.contains('intro')) { e.preventDefault(); open(); } });
    btn.focus({ preventScroll: true });
  } else if (gate) {
    gate.remove();
  }

  // ---------- Servizi: tocchi un servizio e il dettaglio cambia ----------
  document.querySelectorAll('[data-svc]').forEach((svc) => {
    const items = [...svc.querySelectorAll('.svc-item')];
    const wide = window.matchMedia('(min-width: 901px)');
    items.forEach((it) => {
      it.querySelector('.svc-head').addEventListener('click', () => {
        const wasOpen = it.classList.contains('is-open');
        // sul computer resta sempre un servizio aperto; sul telefono si può richiudere
        if (wasOpen && wide.matches) return;
        items.forEach((o) => {
          const on = o === it && !wasOpen;
          o.classList.toggle('is-open', on);
          o.querySelector('.svc-head').setAttribute('aria-expanded', on ? 'true' : 'false');
        });
      });
    });
  });

  // ---------- Pagine che scorrono dentro i mockup, solo dopo il clic su "Clicca per scorrere" ----------
  const scrollers = new Map();
  const startScroll = (img) => {
    const old = scrollers.get(img);
    if (old) old.cancel();
    scrollers.delete(img);
    if (still) return;
    const run = () => {
      const screen = img.parentElement;
      const dist = img.getBoundingClientRect().height - screen.clientHeight;
      if (dist < 12 || !screen.clientHeight) return;
      const speed = screen.classList.contains('screen-mob') ? 34 : 55; // pixel al secondo
      // in loop: parte dall'alto, scende fino in fondo, svanisce e ricomincia (mai all'indietro)
      const end = `translateY(${-dist}px)`;
      const anim = img.animate([
        { transform: 'translateY(0)', opacity: 1, offset: 0, easing: 'ease-in-out' },
        { transform: end, opacity: 1, offset: .86 },
        { transform: end, opacity: 1, offset: .93 },
        { transform: end, opacity: 0, offset: .98 },
        { transform: 'translateY(0)', opacity: 0, offset: .98 },
        { transform: 'translateY(0)', opacity: 1, offset: 1 },
      ], { duration: Math.max(7000, dist / speed * 1000 / .82), iterations: Infinity });
      const media = img.closest('.project-media');
      if (!media.classList.contains('is-playing') || !img.dataset.visible) anim.pause();
      scrollers.set(img, anim);
    };
    if (img.complete && img.naturalHeight) run();
    else img.addEventListener('load', run, { once: true });
  };
  const shots = [...document.querySelectorAll('.scroll-shot')];
  const playing = (img) => img.closest('.project-media').classList.contains('is-playing');
  // si muovono solo se avviate col pulsante e quando sono sullo schermo
  const shotIO = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const img = en.target;
      img.dataset.visible = en.isIntersecting ? '1' : '';
      const a = scrollers.get(img);
      if (!a) { if (en.isIntersecting) startScroll(img); return; }
      if (en.isIntersecting && playing(img)) a.play(); else a.pause();
    });
  }, { rootMargin: '100px 0px' }) : null;
  shots.forEach((img) => { if (shotIO) shotIO.observe(img); else { img.dataset.visible = '1'; startScroll(img); } });
  // pulsante sotto ogni anteprima: avvia e ferma lo scorrimento (con il movimento ridotto non compare)
  if (!still) document.querySelectorAll('.project-media:not(.project-media-static)').forEach((m) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scroll-btn';
    const label = () => {
      const on = m.classList.contains('is-playing');
      btn.innerHTML = on ? '<span class="scroll-ico" aria-hidden="true">❚❚</span>Ferma' : '<span class="scroll-ico" aria-hidden="true">↓</span>Clicca per scorrere';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    };
    btn.addEventListener('click', () => {
      const on = m.classList.toggle('is-playing');
      m.querySelectorAll('.scroll-shot').forEach((i) => {
        const a = scrollers.get(i);
        if (!a) { startScroll(i); return; }
        if (on) a.play(); else a.pause();
      });
      label();
    });
    label();
    m.after(btn); // le barrette delle sezioni si mettono tra l'anteprima e il pulsante
  });
  let rz = null;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => shots.forEach(startScroll), 200); });

  // ---------- Sezioni dei siti: pulsanti, frecce, dito ----------
  const projects = [...document.querySelectorAll('[data-shots]')].map((box) => {
    const tabs = [...box.querySelectorAll('.tab')];
    const desk = box.querySelector('[data-shot-desk]');
    const mob = box.querySelector('[data-shot-mob]');
    const deskName = desk.alt.split(':')[0];
    const mobName = mob.alt.split(':')[0];
    const prev = box.querySelector('[data-tab-prev]');
    const next = box.querySelector('[data-tab-next]');
    const steps = document.createElement('div');
    steps.className = 'scene-steps';
    steps.setAttribute('aria-hidden', 'true');
    steps.innerHTML = tabs.map(() => '<i></i>').join('');
    box.querySelector('.project-media').after(steps);
    const p = { box, tabs, index: 0 };

    p.set = (i) => {
      i = clamp(i, 0, tabs.length - 1);
      prev.disabled = i === 0;
      next.disabled = i === tabs.length - 1;
      [...steps.children].forEach((s, k) => s.classList.toggle('is-on', k <= i));
      if (i === p.index && desk.src.includes(tabs[i].dataset.desk.split('/').pop())) return;
      p.index = i;
      const tab = tabs[i];
      tabs.forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      box.classList.add('is-swapping');
      let ready = 0;
      const done = () => {
        if (++ready < 2 || p.index !== i) return;
        desk.src = tab.dataset.desk;
        mob.src = tab.dataset.mob;
        desk.alt = deskName + ': ' + tab.dataset.alt;
        mob.alt = mobName + ': ' + tab.dataset.alt;
        box.classList.remove('is-swapping');
        startScroll(desk);
        startScroll(mob);
      };
      [tab.dataset.desk, tab.dataset.mob].forEach((src) => { const im = new Image(); im.onload = im.onerror = done; im.src = src; });
    };
    p.choose = (i) => p.set(clamp(i, 0, tabs.length - 1));
    tabs.forEach((t, k) => t.addEventListener('click', () => p.choose(k)));
    prev.addEventListener('click', () => p.choose(p.index - 1));
    next.addEventListener('click', () => p.choose(p.index + 1));

    // trascinando l'anteprima a destra o a sinistra (dito o mouse) cambia sezione
    const media = box.querySelector('.project-media');
    let sx = 0, sy = 0, down = false, moved = false;
    media.addEventListener('dragstart', (e) => e.preventDefault());
    media.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; sy = e.clientY;
    });
    media.addEventListener('pointermove', (e) => {
      if (!down || e.pointerType !== 'mouse') return;
      if (!moved && Math.abs(e.clientX - sx) > 6) { moved = true; media.classList.add('is-dragging'); }
    });
    const end = (e) => {
      if (!down) return;
      down = false;
      media.classList.remove('is-dragging');
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 6) moved = true;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) p.choose(p.index + (dx < 0 ? 1 : -1));
    };
    media.addEventListener('pointerup', end);
    media.addEventListener('pointerleave', (e) => { if (down && e.pointerType === 'mouse') end(e); });
    media.addEventListener('pointercancel', () => { down = false; media.classList.remove('is-dragging'); });
    // dopo un trascinamento il clic non apre il sito
    media.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } });

    p.set(0);
    return p;
  });

  // ---------- Barra di avanzamento e linea del tempo ----------
  const bar = document.querySelector('[data-progress]');
  const tl = document.querySelector('[data-timeline]');
  const tlFill = tl && tl.querySelector('[data-tl-fill]');
  const tlSteps = tl ? [...tl.querySelectorAll('.tl-step')] : [];
  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(window.scrollY / max, 0, 1) : 0})`;
    if (tl && !still) {
      const r = tl.getBoundingClientRect();
      const mark = window.innerHeight * .62;
      const prog = clamp((mark - r.top) / r.height, 0, 1);
      tlFill.style.transform = `scaleY(${prog})`;
      tlSteps.forEach((s) => s.classList.toggle('is-lit', s.getBoundingClientRect().top + 10 < mark));
    }
  };
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; onScroll(); });
  }, { passive: true });
  const relayout = () => onScroll();
  window.addEventListener('resize', () => { clearTimeout(relayout.t); relayout.t = setTimeout(relayout, 150); });
  window.addEventListener('load', relayout);
  relayout();
  if (still) tlSteps.forEach((s) => s.classList.add('is-lit'));

  // ---------- Carosello "Chi c'è dietro": frecce, puntini, contatore ----------
  document.querySelectorAll('[data-carousel]').forEach((car) => {
    const track = car.querySelector('[data-track]');
    const items = [...track.children];
    const prev = car.querySelector('[data-prev]');
    const next = car.querySelector('[data-next]');
    const count = car.querySelector('[data-count]');
    const dotsBox = car.querySelector('[data-dots]');
    const pad = (n) => String(n).padStart(2, '0');
    const step = () => items[1].offsetLeft - items[0].offsetLeft;
    const current = () => Math.round(track.scrollLeft / step());
    const maxIndex = () => Math.round((track.scrollWidth - track.clientWidth) / step());
    const goTo = (i) => track.scrollTo({ left: clamp(i, 0, maxIndex()) * step() });
    const dots = items.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Vai al punto ' + (i + 1));
      b.addEventListener('click', () => goTo(i));
      dotsBox.appendChild(b);
      return b;
    });
    const update = () => {
      const i = current();
      const last = maxIndex();
      count.textContent = pad(Math.min(i + 1, items.length));
      prev.disabled = i <= 0;
      next.disabled = i >= last;
      dots.forEach((d, k) => { d.hidden = k > last; d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    };
    prev.addEventListener('click', () => goTo(current() - 1));
    next.addEventListener('click', () => goTo(current() + 1));
    let t = null;
    track.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(update, 60); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  // ---------- Vetrina dei lavori: una fila che scorre, la scheda al centro è accesa ----------
  document.querySelectorAll('[data-vt]').forEach((vt) => {
    const track = vt.querySelector('[data-vt-track]');
    const items = [...track.children];
    const prev = vt.querySelector('[data-vt-prev]');
    const next = vt.querySelector('[data-vt-next]');
    const count = vt.querySelector('[data-vt-count]');
    // su PC la fila è allineata a sinistra (scheda corrente = la prima in vista), su telefono al centro
    const isStart = () => getComputedStyle(items[0]).scrollSnapAlign.includes('start');
    const padL = () => parseFloat(getComputedStyle(track).paddingLeft);
    const mid = (it) => (isStart() ? it.offsetLeft - padL() + track.clientWidth / 2 : it.offsetLeft + it.offsetWidth / 2);
    const centre = () => {
      const c = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      items.forEach((it, i) => { if (Math.abs(mid(it) - c) < Math.abs(mid(items[best]) - c)) best = i; });
      return best;
    };
    const goTo = (i) => {
      const it = items[clamp(i, 0, items.length - 1)];
      track.scrollTo({ left: mid(it) - track.clientWidth / 2, behavior: still ? 'auto' : 'smooth' });
    };
    const update = () => {
      const i = centre();
      items.forEach((it, k) => it.classList.toggle('is-active', k === i));
      count.textContent = String(i + 1).padStart(2, '0');
      prev.disabled = i <= 0;
      next.disabled = i >= items.length - 1 || track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    };
    prev.addEventListener('click', () => goTo(centre() - 1));
    next.addEventListener('click', () => goTo(centre() + 1));
    // trascinamento col mouse (col dito scorre già da sé); dopo un trascinamento il clic non apre il lavoro
    let drag = null;
    let moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft };
      moved = false;
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('is-dragging'); }
      if (moved) track.scrollLeft = drag.left - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!drag) return;
      drag = null;
      if (!moved) return;
      const i = centre();
      track.classList.remove('is-dragging');
      goTo(i);
    });
    // tocco su una scheda spenta: la porta al centro invece di aprire il lavoro
    items.forEach((it, k) => it.querySelector('a').addEventListener('click', (e) => {
      if (moved) { e.preventDefault(); moved = false; return; }
      if (!isStart() && !it.classList.contains('is-active')) { e.preventDefault(); goTo(k); }
    }));
    let t = null;
    track.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(update, 60); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  // ---------- Titoli che compaiono parola per parola ----------
  document.querySelectorAll('[data-words]').forEach((h) => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--i:${i}">${w}</span>`).join(' ');
  });

  // ---------- Confronto: selettore a pillole ----------
  document.querySelectorAll('[data-cmp]').forEach((cmp) => {
    const wrap = cmp.querySelector('.cmp-wrap');
    const btns = [...cmp.querySelectorAll('[data-cmp-vs]')];
    const phone = window.matchMedia('(max-width: 767px)');
    const choose = (b) => {
      btns.forEach((o) => { const on = o === b; o.classList.toggle('is-active', on); o.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      wrap.dataset.vs = b.dataset.cmpVs;
    };
    btns.forEach((b) => b.addEventListener('click', () => choose(b)));
    // sul telefono "Tutti" non c'è: si parte da Agenzia
    const fit = () => { if (phone.matches && wrap.dataset.vs === 'all') choose(btns[1]); };
    phone.addEventListener('change', fit);
    fit();
  });
  // "Quando non sono la scelta giusta": aperto su PC, chiuso sul telefono
  document.querySelectorAll('[data-honest]').forEach((d) => { if (window.matchMedia('(max-width: 767px)').matches) d.open = false; });

  // ---------- Prima e dopo: compare solo se ci sono entrambe le immagini ----------
  document.querySelectorAll('[data-compare]').forEach((sec) => {
    const imgs = [...sec.querySelectorAll('img')];
    let ok = 0;
    imgs.forEach((im) => {
      const test = new Image();
      test.onload = () => { if (++ok === imgs.length) { sec.hidden = false; relayout(); } };
      test.src = im.getAttribute('src');
    });
    const ba = sec.querySelector('[data-ba]');
    const range = sec.querySelector('.ba-range');
    range.addEventListener('input', () => ba.style.setProperty('--pos', range.value + '%'));
  });

  // ---------- Filtri per settore ----------
  const chips = [...document.querySelectorAll('[data-filter]')];
  const cats = [...document.querySelectorAll('[data-category]')];
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => { const on = c === chip; c.classList.toggle('is-active', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      cats.forEach((cat) => { cat.hidden = f !== 'all' && cat.dataset.category !== f; });
      cats.forEach((cat) => cat.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in')));
      relayout();
    });
  });
  chips.forEach((c) => c.setAttribute('aria-pressed', c.classList.contains('is-active') ? 'true' : 'false'));

  // ---------- Comparsa allo scroll e contatori ----------
  const els = document.querySelectorAll('[data-reveal]');
  const counters = [...document.querySelectorAll('[data-count-to]')];
  const countUp = (el) => {
    // dietro l'apertura FK aspetta che si entri
    if (root.classList.contains('intro')) { setTimeout(() => countUp(el), 200); return; }
    const to = +el.dataset.countTo;
    if (still) { el.textContent = to; return; }
    const t0 = performance.now();
    const tick = (t) => {
      const k = clamp((t - t0) / 1400, 0, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  };
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      if (en.target.dataset.countTo) countUp(en.target); else en.target.classList.add('is-in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .08 });
  els.forEach((el) => io.observe(el));
  counters.forEach((el) => io.observe(el));
})();
