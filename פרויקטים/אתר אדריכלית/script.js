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

/* ---------- Tour: scroll-driven stops + zoom/drag ---------- */
(function initTour() {
  const section = document.getElementById('tour');
  if (!section) return;
  const stage = document.getElementById('tourStage');
  const imgs = [...section.querySelectorAll('.tour-img')];
  const dots = [...section.querySelectorAll('.tour-dot')];
  const caption = document.getElementById('tourCaption');
  const hint = document.getElementById('tourHint');
  const zoomIn = document.getElementById('zoomIn');
  const zoomOut = document.getElementById('zoomOut');
  const N = imgs.length;

  const MIN = 1, MAX = 2.5, STEP = .5;
  let scale = 1, panX = 0, panY = 0, active = -1;

  function apply() {
    stage.style.transform = `translate(${panX.toFixed(1)}px, ${panY.toFixed(1)}px) scale(${scale.toFixed(2)})`;
    stage.classList.toggle('zoomed', scale > 1);
  }
  function clamp() {
    const r = stage.getBoundingClientRect();
    const maxX = (scale - 1) * (r.width / scale) * .5;
    const maxY = (scale - 1) * (r.height / scale) * .5;
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }
  function reset() { scale = 1; panX = 0; panY = 0; apply(); }

  function setActive(i) {
    if (i === active) return;
    active = i;
    imgs.forEach((im, k) => im.classList.toggle('active', k === i));
    dots.forEach((d, k) => d.classList.toggle('active', k === i));
    caption.textContent = dots[i].querySelector('span').textContent;
    reset();
  }

  function onScroll() {
    const r = section.getBoundingClientRect();
    const scrollable = r.height - window.innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / scrollable));
    setActive(Math.min(N - 1, Math.floor(p * N)));
  }
  setActive(0);
  window.addEventListener('scroll', onScroll, { passive: true });

  dots.forEach((d, i) => d.addEventListener('click', () => {
    const r = section.getBoundingClientRect();
    const scrollable = r.height - window.innerHeight;
    // aim at the middle of that stop's band so we don't land on a boundary
    const top = window.scrollY + r.top + ((i + .5) / N) * scrollable;
    window.scrollTo({ top, behavior: 'smooth' });
  }));

  /* hint shown once the tour fills the screen, gone on first interaction */
  let hintTimer = null;
  function dropHint() { hint.classList.remove('on'); clearTimeout(hintTimer); }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          hint.classList.add('on');
          hintTimer = setTimeout(dropHint, 4200);
          io.disconnect();
        }
      });
    }, { threshold: .55 });
    io.observe(section);
  }

  zoomIn.addEventListener('click', () => { dropHint(); scale = Math.min(MAX, scale + STEP); clamp(); apply(); });
  zoomOut.addEventListener('click', () => { scale = Math.max(MIN, scale - STEP); clamp(); apply(); });

  let dragging = false, sx = 0, sy = 0, px = 0, py = 0;
  stage.addEventListener('mousedown', (e) => {
    if (scale <= 1) return;
    dropHint();
    dragging = true; sx = e.clientX; sy = e.clientY; px = panX; py = panY;
    stage.classList.add('dragging');
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    panX = px + (e.clientX - sx);
    panY = py + (e.clientY - sy);
    clamp(); apply();
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    stage.classList.remove('dragging');
  });
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
