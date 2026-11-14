document.documentElement.classList.add('js');

/* ---------- Nav: active link + mobile menu ---------- */
(function initNav() {
  const pill = document.getElementById('navPill');
  const burger = document.getElementById('burger');
  const links = [...pill.querySelectorAll('a')];

  // The logo/phone flip from light to ink once they stop riding over the video.
  // initHero owns that now: the warm paper appears under the header part-way
  // through the hero, long before the section itself ends. Pages with no hero
  // (the tour) style their own header and want no flip at all.

  burger.addEventListener('click', () => pill.classList.toggle('open'));
  links.forEach(a => a.addEventListener('click', () => pill.classList.remove('open')));

  const sections = links
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  if (!('IntersectionObserver' in window)) return;
  // Track which section owns the middle of the viewport, so the pill highlight
  // follows the reader rather than firing on every partial overlap.
  const seen = new Map();
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => seen.set(e.target, e.intersectionRatio));
    let best = null, bestRatio = 0;
    seen.forEach((ratio, el) => { if (ratio > bestRatio) { bestRatio = ratio; best = el; } });
    if (!best) return;
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + best.id));
  }, { threshold: [0, .25, .5, .75, 1], rootMargin: '-45% 0px -45% 0px' });
  sections.forEach(s => io.observe(s));
})();

/* ---------- Hero: the picture draws itself in to a card on the paper ----------
   Scroll position becomes one number, --hp, from 0 to 1. Every piece of the
   motion — the clip-path, the scrim, the words leaving, the name arriving, the
   hairline — is plain CSS calc() off that number. Cheap to run, easy to retune.

   The update is written straight from the scroll handler rather than inside
   requestAnimationFrame: all it does is read scrollY (already cached by the
   scroll event) and write one custom property, with no layout read after the
   write, so there is nothing to batch. It also means the hero is never left
   half-drawn on a page whose rAF is suspended — a backgrounded tab, or a window
   the compositor has parked. The offsets it needs are measured ahead of time. */
(function initHero() {
  const hero = document.getElementById('hero');
  const nav = document.getElementById('nav');
  if (!hero) return;

  const root = document.documentElement;
  // Reduced motion: the stylesheet already parks --hp at 1, so leave it there
  // and just settle the header, which is over paper from the first pixel.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (nav) nav.classList.add('solid');
    return;
  }

  let top = 0, travel = 1, last = -1;

  function measure() {
    top = hero.offsetTop;
    travel = Math.max(1, hero.offsetHeight - window.innerHeight);
  }

  function update() {
    const p = Math.min(Math.max((window.scrollY - top) / travel, 0), 1);
    // smoothstep, so the card eases in and settles instead of tracking the
    // wheel one-to-one
    const hp = p * p * (3 - 2 * p);
    if (hp === last) return;
    last = hp;
    root.style.setProperty('--hp', hp.toFixed(4));
    // The header sits on bare paper from about here on, so the light logo and
    // phone number have to turn to ink before they land on it.
    if (nav) nav.classList.toggle('solid', hp > 0.45);
  }

  measure();
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', () => { measure(); update(); }, { passive: true });
  // The hero holds a video, and a phone's address bar collapses on first scroll:
  // either can move the numbers measured above.
  window.addEventListener('load', () => { measure(); update(); });
})();

/* ---------- Scroll reveal + count-up ----------
   Driven by scroll position rather than IntersectionObserver: IO silently
   never firing would leave every section below the hero stuck at opacity 0.
   The hiding styles are also only armed here (html.anim), so if this script
   fails to run the page still renders fully, just without animation. */
(function initReveal() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const groups = [...document.querySelectorAll('.reveal, .stagger')];
  if (reduce || !groups.length) return;

  document.documentElement.classList.add('anim');

  function countUp(el) {
    const target = parseInt(el.dataset.count, 10);
    if (!target) return;
    const suffix = el.querySelector('i');
    const started = performance.now();
    const dur = 1100;
    (function step(now) {
      const t = Math.min(1, (now - started) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.firstChild.nodeValue = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
      else if (suffix) el.firstChild.nodeValue = String(target);
    })(started);
  }

  function show(el) {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    el.querySelectorAll('[data-count]').forEach(countUp);
  }

  function revealAll() {
    groups.forEach(show);
    window.removeEventListener('scroll', check);
  }

  function check() {
    // A viewport height of 0 can happen transiently before first layout. Waiting
    // it out is right; revealing everything here would fire every section at
    // once and leave nothing to animate on scroll.
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!vh) return;
    const trigger = vh * 0.88;
    let remaining = false;
    groups.forEach(el => {
      if (el.classList.contains('in')) return;
      if (el.getBoundingClientRect().top < trigger) show(el);
      else remaining = true;
    });
    if (!remaining) window.removeEventListener('scroll', check);
  }

  // Wait for first layout before the initial pass, so nothing reveals early.
  requestAnimationFrame(check);
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check);
  window.addEventListener('load', () => setTimeout(check, 200));
  // Last resort: if the viewport never reports a height, show everything rather
  // than leave the page blank.
  setTimeout(() => {
    if (!(window.innerHeight || document.documentElement.clientHeight)) revealAll();
  }, 3000);
})();

/* ---------- Tour teaser: clip plays while the card is on screen ---------- */
(function initTeaser() {
  const clip = document.getElementById('teaserClip');
  if (!clip) return;
  function play() { const p = clip.play(); if (p && p.catch) p.catch(() => {}); }
  if (!('IntersectionObserver' in window)) { clip.preload = 'auto'; play(); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { clip.preload = 'auto'; play(); }
      else clip.pause();
    });
  }, { threshold: .35 });
  io.observe(clip);
})();

/* ---------- Services: one column lit at a time ----------
   Hover drives it on a mouse; tap/focus drives it everywhere else, so the
   photo reveal is reachable on touch and by keyboard too. */
(function initServices() {
  const wrap = document.getElementById('svcCols');
  if (!wrap) return;
  const cols = [...wrap.querySelectorAll('.svc-col')];
  if (!cols.length) return;

  let pinned = 0;               // survives when the pointer leaves the row
  const fine = window.matchMedia('(pointer: fine)').matches;

  const light = (i) => cols.forEach((c, k) => c.classList.toggle('is-on', k === i));

  cols.forEach((col, i) => {
    if (fine) col.addEventListener('mouseenter', () => light(i));
    col.addEventListener('focus', () => light(i));
    col.addEventListener('click', () => { pinned = i; light(i); });
    col.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pinned = i; light(i); }
    });
  });

  if (fine) wrap.addEventListener('mouseleave', () => light(pinned));
  light(pinned);
})();

/* ---------- Lead form ----------
   No backend here, so a valid submission hands the details to the visitor's
   mail client. Swap this for a real endpoint (Formspree/Netlify/etc.) before
   the site goes live. */
(function initLeadForm() {
  const form = document.getElementById('leadForm');
  if (!form) return;
  const note = document.getElementById('formNote');
  const TO = 'info@alto-example.co.il';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const el = form.elements;
    const name = el.name.value.trim();
    const phone = el.phone.value.trim();
    const digits = phone.replace(/\D/g, '');

    if (name.length < 2) return fail('נשמח לשם מלא כדי שנדע למי לחזור.', el.name);
    if (digits.length < 9) return fail('מספר הטלפון נראה קצר מדי — בדקו אותו שוב.', el.phone);

    const body =
      `שם: ${name}\n` +
      `טלפון: ${phone}\n` +
      `אימייל: ${el.email ? el.email.value.trim() || '—' : '—'}\n` +
      `מתעניין ב: ${el.interest.value}\n` +
      `הערה: ${el.note.value.trim() || '—'}`;
    window.location.href =
      `mailto:${TO}?subject=${encodeURIComponent('פנייה מהאתר — ' + name)}&body=${encodeURIComponent(body)}`;

    note.className = 'cta-note ok';
    note.textContent = 'נפתח אצלכם חלון מייל עם הפרטים — רק לשלוח, ונחזור אליכם.';
  });

  function fail(msg, field) {
    note.className = 'cta-note err';
    note.textContent = msg;
    field.focus();
  }
})();
