/* GSAP heading + text motion.
   Everything here is additive: if GSAP or ScrollTrigger is missing, or the
   visitor prefers reduced motion, nothing is split and nothing is hidden —
   the page just renders as it already does. */
(function () {
  const gsap = window.gsap;
  if (!gsap || !window.ScrollTrigger) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(window.ScrollTrigger);

  /* Splitting a heading parks its words outside an overflow:hidden mask, so if
     the tween engine never ticks the text would sit there invisible. Wait for a
     real ticker frame before touching anything — until one arrives nothing is
     split, and the page just renders its headings plainly.
     No timeout here on purpose: the ticker runs on requestAnimationFrame, which
     is suspended while the tab is in the background, so a deadline would expire
     on a page opened in a background tab and kill the motion for good. */
  let started = false;
  function begin() {
    if (started) return;
    started = true;
    gsap.ticker.remove(begin);
    run();
  }
  gsap.ticker.add(begin);

  function run() {

  /* ---- split a heading into word masks, keeping its inner markup ---- */
  function splitWords(root) {
    const words = [];

    (function walk(node) {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const parts = child.nodeValue.split(/(\s+)/);
          if (!parts.some(p => p.trim())) return;
          const frag = document.createDocumentFragment();
          parts.forEach(part => {
            if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
            const mask = document.createElement('span');
            mask.className = 'w';
            const inner = document.createElement('span');
            inner.className = 'wi';
            inner.textContent = part;
            mask.appendChild(inner);
            frag.appendChild(mask);
            words.push(inner);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);   // keep .bracket / .dot wrappers intact, split inside them
        }
      });
    })(root);

    return words;
  }

  /* ---- headings: words rise out of their own mask ---- */
  document.querySelectorAll('[data-split]').forEach(el => {
    const words = splitWords(el);
    if (!words.length) return;
    gsap.set(words, { yPercent: 115 });
    gsap.to(words, {
      yPercent: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  /* ---- supporting copy drifts up just behind its heading ---- */
  document.querySelectorAll('[data-rise]').forEach(el => {
    gsap.from(el, {
      y: 26,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      delay: 0.12,
      scrollTrigger: { trigger: el, start: 'top 92%', once: true }
    });
  });

  /* ---- eyebrows settle their tracking as they arrive ---- */
  document.querySelectorAll('.eyebrow, .teaser-eyebrow, .tour-eyebrow').forEach(el => {
    gsap.from(el, {
      opacity: 0,
      letterSpacing: '0.5em',
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true }
    });
  });

    // Sections above resize as media loads, so keep trigger positions honest.
    window.addEventListener('load', () => window.ScrollTrigger.refresh());
  }
})();
