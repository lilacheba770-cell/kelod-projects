document.documentElement.classList.add('js');

/* mobile menu */
(function () {
  const pill = document.querySelector('.nav-pill');
  const burger = document.getElementById('burger');
  if (!pill || !burger) return;
  burger.addEventListener('click', () => pill.classList.toggle('open'));
  pill.querySelectorAll('a').forEach(a => a.addEventListener('click', () => pill.classList.remove('open')));
})();

/* Scroll-driven video tour.
   Each stop is a short muted clip that loops while it is the active one.
   Only the active clip plays, and only it plus its neighbours are allowed to
   download — otherwise twelve clips would all fetch at once. */
(function initTour() {
  const section = document.getElementById('tour');
  if (!section) return;
  const clips = [...section.querySelectorAll('.tour-clip')];
  const dots = [...section.querySelectorAll('.tour-dot')];
  const caption = document.getElementById('tourCaption');
  const bar = document.getElementById('tourBar');
  const cue = document.getElementById('tourCue');
  const N = clips.length;
  let active = -1;

  function safePlay(v) {
    const p = v.play();
    if (p && p.catch) p.catch(() => {}); // refused autoplay just leaves the poster up
  }

  function warm(i) {
    [i - 1, i, i + 1].forEach(k => {
      const v = clips[k];
      if (v && v.preload === 'none') v.preload = 'auto';
    });
  }

  // A clip that isn't buffered yet when it becomes active can't start, and that
  // first play() would otherwise be lost — so retry once its data lands.
  clips.forEach((v, k) => {
    v.addEventListener('canplay', () => {
      if (k === active && !document.hidden) safePlay(v);
    });
  });

  function setActive(i) {
    if (i === active) return;
    active = i;
    warm(i);
    clips.forEach((v, k) => {
      const on = k === i;
      v.classList.toggle('active', on);
      if (on) safePlay(v);
      else if (!v.paused) { v.pause(); v.currentTime = 0; }
    });
    dots.forEach((d, k) => d.classList.toggle('active', k === i));
    caption.textContent = dots[i].querySelector('span').textContent;
  }

  function onScroll() {
    const r = section.getBoundingClientRect();
    const scrollable = r.height - window.innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / scrollable));
    bar.style.transform = `scaleX(${p})`;
    if (cue && p > 0.02) cue.classList.add('gone');
    setActive(Math.min(N - 1, Math.floor(p * N)));
  }

  setActive(0);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  dots.forEach((d, i) => d.addEventListener('click', () => {
    const r = section.getBoundingClientRect();
    const scrollable = r.height - window.innerHeight;
    // aim mid-band so we never land exactly on a stop boundary
    window.scrollTo({ top: window.scrollY + r.top + ((i + 0.5) / N) * scrollable, behavior: 'smooth' });
  }));

  // Pause everything while the tab is hidden so clips don't run in the background
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clips.forEach(v => v.pause());
    else if (clips[active]) { const p = clips[active].play(); if (p && p.catch) p.catch(() => {}); }
  });
})();
