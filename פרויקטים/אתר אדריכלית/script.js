document.documentElement.classList.add('js');

/* ---------- Nav: active link + mobile menu ---------- */
(function initNav() {
  const pill = document.getElementById('navPill');
  const burger = document.getElementById('burger');
  const links = [...pill.querySelectorAll('a')];

  // The logo/phone ride over the hero video (light) and then over cream (dark),
  // so flip them once the hero has scrolled past.
  const nav = document.getElementById('nav');
  const hero = document.getElementById('hero');
  if (nav && hero) {
    const flip = () => nav.classList.toggle('solid', window.scrollY > hero.offsetHeight - 90);
    flip();
    window.addEventListener('scroll', flip, { passive: true });
  }

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

/* ---------- Projects: tap a card to raise its testimonial ----------
   Hover and focus are handled in CSS; this covers touch, where there is no
   hover, by toggling one card open at a time. */
(function initProjectCards() {
  const track = document.getElementById('projTrack');
  if (!track) return;
  track.addEventListener('click', (e) => {
    const card = e.target.closest('.proj-card');
    if (!card) return;
    const wasOpen = card.classList.contains('is-open');
    track.querySelectorAll('.proj-card.is-open').forEach(c => c.classList.remove('is-open'));
    if (!wasOpen) card.classList.add('is-open');
  });
})();

/* ---------- Projects marquee ---------- */
(function initMarquee() {
  const track = document.getElementById('projTrack');
  if (!track) return;
  // The keyframe travels -50%, so the row must hold an even number of identical
  // copies AND one copy must be wider than the viewport — otherwise the tail of
  // the row runs out mid-loop and leaves a blank gap on wide screens.
  const oneCopy = track.innerHTML;
  track.innerHTML = oneCopy + oneCopy;
  for (let guard = 0; guard < 4; guard++) {
    const halfWidth = track.scrollWidth / 2;
    if (halfWidth >= window.innerWidth * 1.15) break;
    track.innerHTML += track.innerHTML;   // stays even: 2 -> 4 -> 8
  }

  // Cards drift through view continuously, so lazy-loading makes them pop in
  // blank mid-scroll. Once the section is near, load the whole row up front.
  // Plain scroll check rather than IntersectionObserver: the row is a wide,
  // continuously-transformed element, which makes IO's intersection reporting
  // unreliable here.
  const imgs = [...track.querySelectorAll('img')];
  let loaded = false;
  function maybeLoad() {
    if (loaded) return;
    const top = track.getBoundingClientRect().top;
    if (top > window.innerHeight + 600) return;
    loaded = true;
    imgs.forEach(i => { i.loading = 'eager'; if (!i.complete) i.src = i.src; });
    window.removeEventListener('scroll', maybeLoad);
  }
  maybeLoad();
  window.addEventListener('scroll', maybeLoad, { passive: true });
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
