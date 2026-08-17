// Sticky nav background + dark/light icon swap over the hero
const topnav = document.getElementById('topnav');
const heroEl = document.getElementById('hero');

function updateNav() {
  const scrolled = window.scrollY > 40;
  topnav.classList.toggle('scrolled', scrolled);

  const heroHeight = heroEl.offsetHeight;
  document.body.classList.toggle('dark-nav', window.scrollY < heroHeight - 80);
}
updateNav();
window.addEventListener('scroll', updateNav, { passive: true });

// Mobile menu toggle
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  burger.classList.toggle('active');
});
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Scroll reveal (only hide content once the observer is armed, so a JS failure never leaves sections invisible)
if ('IntersectionObserver' in window) {
  document.documentElement.classList.add('js-ready');
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => io.observe(el));
}

// Parallax on the hero/contact background photos
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReduced) {
  const parallaxImgs = [...document.querySelectorAll('.hero-bg img, .contact-bg img')];
  function updateParallax() {
    parallaxImgs.forEach(img => {
      const top = img.parentElement.getBoundingClientRect().top;
      const offset = Math.max(-70, Math.min(70, top * 0.12));
      img.style.transform = `translateY(${offset}px) scale(1.18)`;
    });
  }
  updateParallax();
  window.addEventListener('scroll', updateParallax, { passive: true });
  window.addEventListener('resize', updateParallax);
}

// Smooth inertial scroll on desktop (mouse) only — touch devices keep native scrolling,
// and it's skipped entirely for prefers-reduced-motion.
if (!prefersReduced && window.matchMedia('(pointer: fine)').matches) {
  document.documentElement.classList.add('smooth-scroll');
  let current = window.scrollY;
  let target = window.scrollY;
  let maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  let rafId = null;

  function recalcBounds() {
    maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    target = Math.min(target, maxScroll);
  }
  recalcBounds();
  window.addEventListener('resize', recalcBounds);
  document.querySelectorAll('img').forEach(img => {
    if (!img.complete) img.addEventListener('load', recalcBounds, { once: true });
  });

  // Force instant jumps here — CSS has `scroll-behavior: smooth` on <html> for the
  // touch/reduced-motion fallback path, and without this every per-frame scrollTo()
  // would itself be smoothed by the browser, fighting our own lerp and freezing the scroll.
  function jumpTo(y) {
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
  }

  function tick() {
    current += (target - current) * 0.1;
    if (Math.abs(target - current) < 0.4) {
      current = target;
      jumpTo(current);
      rafId = null;
      return;
    }
    jumpTo(current);
    rafId = requestAnimationFrame(tick);
  }

  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    recalcBounds();
    target = Math.max(0, Math.min(target + e.deltaY, maxScroll));
    if (!rafId) rafId = requestAnimationFrame(tick);
  }, { passive: false });

  // Keep target in sync with scrollbar drag / keyboard scrolling (native, outside our loop)
  window.addEventListener('scroll', () => {
    if (!rafId) { current = window.scrollY; target = window.scrollY; }
  }, { passive: true });

  // Route in-page nav links through the same smooth system
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const el = document.getElementById(link.getAttribute('href').slice(1));
      if (!el) return;
      e.preventDefault();
      recalcBounds();
      const headerOffset = topnav.offsetHeight;
      target = Math.max(0, Math.min(el.getBoundingClientRect().top + window.scrollY - headerOffset, maxScroll));
      if (!rafId) rafId = requestAnimationFrame(tick);
    });
  });
}

// Scroll-scrubbed video tour: a preloaded frame sequence painted to a canvas,
// where scroll position (not playback time) picks the frame — so scrolling
// down plays the tour forward and scrolling up rewinds it.
(function initTour() {
  const section = document.getElementById('tour');
  if (!section) return;
  const canvas = document.getElementById('tourCanvas');
  const ctx = canvas.getContext('2d');
  const loadingEl = document.getElementById('tourLoading');
  const progressBar = document.getElementById('tourProgressBar');
  const captionLines = [...document.querySelectorAll('.tour-caption-line')];

  const FRAME_COUNT = 150;
  const framePath = (i) => `images/tour/f_${String(i).padStart(3, '0')}.jpg`;

  const frames = new Array(FRAME_COUNT);
  let loadedCount = 0;
  let currentFrame = -1;

  function resizeCanvas() {
    const rect = section.querySelector('.tour-sticky').getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    if (currentFrame >= 0) drawFrame(currentFrame, true);
  }

  function drawFrame(index, force) {
    if (!force && index === currentFrame) return;
    const img = frames[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    currentFrame = index;
    const cw = canvas.width, ch = canvas.height;
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = cw / ch;
    let dw, dh, dx, dy;
    if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
    else { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function updateCaption(progress) {
    const phase = progress < 0.48 ? '0' : '1';
    captionLines.forEach(el => el.classList.toggle('active', el.dataset.phase === phase));
  }

  function onScroll() {
    const rect = section.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
    progressBar.style.width = (progress * 100) + '%';
    updateCaption(progress);
    const index = Math.min(FRAME_COUNT - 1, Math.round(progress * (FRAME_COUNT - 1)));
    drawFrame(index);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('scroll', onScroll, { passive: true });

  for (let i = 1; i <= FRAME_COUNT; i++) {
    const img = new Image();
    img.onload = img.onerror = () => {
      loadedCount++;
      if (i === 1) drawFrame(0, true);
      if (loadedCount === FRAME_COUNT) {
        loadingEl.classList.add('hidden');
        onScroll();
      }
    };
    img.src = framePath(i);
    frames[i - 1] = img;
  }
})();
