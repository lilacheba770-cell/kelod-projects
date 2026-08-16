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
      target = Math.max(0, Math.min(el.getBoundingClientRect().top + window.scrollY, maxScroll));
      if (!rafId) rafId = requestAnimationFrame(tick);
    });
  });
}
