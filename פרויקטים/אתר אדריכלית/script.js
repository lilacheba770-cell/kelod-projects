// Sticky nav background on scroll
const topnav = document.getElementById('topnav');

function updateNav() {
  topnav.classList.toggle('scrolled', window.scrollY > 40);
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

// Scroll tour: a handful of full-quality photos crossfade as you scroll through
// a pinned section, with a side step-list for direct navigation to any stop.
(function initTour() {
  const section = document.getElementById('tour');
  if (!section) return;
  const images = [...section.querySelectorAll('.tour-img')];
  const stopBtns = [...section.querySelectorAll('.tour-stop')];
  const captionEl = document.getElementById('tourCaption');
  const STOPS = images.length;
  let activeIndex = -1;

  function setActive(index) {
    if (index === activeIndex) return;
    activeIndex = index;
    images.forEach((img, i) => img.classList.toggle('active', i === index));
    stopBtns.forEach((btn, i) => btn.classList.toggle('active', i === index));
    captionEl.textContent = stopBtns[index].querySelector('.tour-stop-label').textContent;
  }

  function onScroll() {
    const rect = section.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
    setActive(Math.min(STOPS - 1, Math.floor(progress * STOPS)));
  }

  setActive(0);
  window.addEventListener('scroll', onScroll, { passive: true });

  stopBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const rect = section.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const targetProgress = (i + 0.5) / STOPS; // land solidly inside that stop's zone, not right on the boundary
      window.scrollTo({ top: window.scrollY + rect.top + targetProgress * scrollable, behavior: 'smooth' });
    });
  });

  // Mouse-parallax "look around" — desktop pointer only, and only once the section is
  // actually on screen (an IntersectionObserver hint, dismissed on first real interaction).
  const stickyEl = document.getElementById('tourSticky');
  const imagesEl = document.getElementById('tourImages');
  const hintEl = document.getElementById('tourHint');
  const canParallax = window.matchMedia('(pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (canParallax && stickyEl && imagesEl && hintEl) {
    let hintShown = false;
    let hintTimeout = null;

    function dismissHint() {
      hintEl.classList.remove('visible');
      if (hintTimeout) clearTimeout(hintTimeout);
    }

    if ('IntersectionObserver' in window) {
      const hintObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !hintShown) {
            hintShown = true;
            hintEl.classList.add('visible');
            hintTimeout = setTimeout(dismissHint, 4500);
            hintObserver.disconnect();
          }
        });
      }, { threshold: 0.6 });
      hintObserver.observe(section);
    }

    stickyEl.addEventListener('mousemove', (e) => {
      dismissHint();
      const rect = stickyEl.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      const maxShift = 22;
      imagesEl.style.transform = `translate(${(-px * maxShift).toFixed(1)}px, ${(-py * maxShift).toFixed(1)}px)`;
    });
    stickyEl.addEventListener('mouseleave', () => {
      imagesEl.style.transform = '';
    });
  }
})();

// Services tab switcher
(function initServiceTabs() {
  const tabs = [...document.querySelectorAll('.service-tab')];
  const panels = [...document.querySelectorAll('.service-panel')];
  if (!tabs.length) return;
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      panels[i].classList.add('active');
    });
  });
})();

// Portfolio carousel arrows
(function initPortfolioArrows() {
  const track = document.querySelector('.portfolio-scroll');
  const prev = document.getElementById('portfolioPrev');
  const next = document.getElementById('portfolioNext');
  if (!track || !prev || !next) return;
  const scrollAmount = () => (track.querySelector('.portfolio-card')?.offsetWidth || 320) + 20;
  // RTL: visually-next content sits toward negative scrollLeft in most browsers
  prev.addEventListener('click', () => track.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
})();
