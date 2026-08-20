document.documentElement.classList.add('js');

/* ---------- Nav: active link + mobile menu ---------- */
(function initNav() {
  const pill = document.getElementById('navPill');
  const burger = document.getElementById('burger');
  const links = [...pill.querySelectorAll('a')];

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

/* ---------- Scroll reveal ---------- */
(function initReveal() {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: .2, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
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

/* ---------- Services tabs ---------- */
(function initServices() {
  const rail = document.getElementById('svcRail');
  if (!rail) return;
  const tabs = [...rail.querySelectorAll('button')];
  const panels = [...document.querySelectorAll('.svc-panel')];
  tabs.forEach((t, i) => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    t.classList.add('active');
    panels[i].classList.add('active');
  }));
})();

/* ---------- Projects marquee ---------- */
(function initMarquee() {
  const track = document.getElementById('projTrack');
  if (!track) return;
  // duplicate the row so the -50% keyframe loops seamlessly
  track.innerHTML += track.innerHTML;

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
