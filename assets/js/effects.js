/* ================================================================
   ASHTON STUBBLEFIELD — KINETIC EFFECTS ENGINE
   Effects: custom cursor, scroll progress, chromatic aberration
   on scroll velocity, variable font weight, magnetic buttons,
   number counters, reveal observer, mobile nav
   ================================================================ */

(function () {
  'use strict';

  // ── CUSTOM CURSOR ──────────────────────────────────────────────
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  let mx = 0, my = 0, rx = 0, ry = 0;

  if (dot && ring) {
    document.addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
      // Use transform instead of left/top — GPU-composited, no layout
      dot.style.transform = `translate(calc(${mx}px - 50%), calc(${my}px - 50%))`;
    });

    (function animateRing() {
      rx += (mx - rx) * 0.10;
      ry += (my - ry) * 0.10;
      ring.style.transform = `translate(calc(${rx}px - 50%), calc(${ry}px - 50%))`;
      requestAnimationFrame(animateRing);
    })();

    const interactives = 'a, button, .btn, .tier-cta, .module-card, .portfolio-card, input[type="submit"]';
    document.querySelectorAll(interactives).forEach(el => {
      el.addEventListener('mouseenter', () => {
        ring.style.width  = '50px';
        ring.style.height = '50px';
        ring.style.opacity = '1';
        dot.style.opacity = '0';
      });
      el.addEventListener('mouseleave', () => {
        ring.style.width  = '32px';
        ring.style.height = '32px';
        ring.style.opacity = '0.55';
        dot.style.opacity = '1';
      });
    });
  }

  // ── MERGED SCROLL HANDLER (rAF-batched) ───────────────────────
  // Single listener + requestAnimationFrame prevents layout thrash
  // from three independent handlers firing in series on every scroll.
  const scrollBar = document.getElementById('scroll-bar');
  const root = document.documentElement;

  let scrollRafPending = false;

  function onScrollFrame() {
    scrollRafPending = false;
    const y = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;

    // Progress bar
    if (scrollBar) {
      scrollBar.style.transform = 'scaleX(' + Math.min(y / maxScroll, 1) + ')';
    }

    // Variable font weight
    const ratio = Math.min(y / 700, 1);
    root.style.setProperty('--scroll-weight', Math.round(700 - ratio * 200));
  }

  window.addEventListener('scroll', () => {
    if (!scrollRafPending) {
      scrollRafPending = true;
      requestAnimationFrame(onScrollFrame);
    }
  }, { passive: true });

  // ── MAGNETIC BUTTONS ──────────────────────────────────────────
  // Cache getBoundingClientRect on mouseenter — reading it inside
  // mousemove forces a synchronous layout recalculation every event.
  document.querySelectorAll('.btn-primary, .btn-fire, .nav-cta, .tier-card.featured .tier-cta').forEach(btn => {
    let rect = null;

    btn.addEventListener('mouseenter', () => {
      rect = btn.getBoundingClientRect();
    });

    btn.addEventListener('mousemove', e => {
      if (!rect) return;
      const x = (e.clientX - rect.left - rect.width  / 2) * 0.26;
      const y = (e.clientY - rect.top  - rect.height / 2) * 0.34;
      btn.style.transform = `translate(${x}px, ${y}px) scale(1.04)`;
    });

    btn.addEventListener('mouseleave', () => {
      rect = null;
      btn.style.transform = '';
    });

    // Invalidate cached rect if window is resized
    window.addEventListener('resize', () => { rect = null; }, { passive: true });
  });

  // ── NUMBER COUNTERS ───────────────────────────────────────────
  function animateCounter(el) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const isInt  = Number.isInteger(target);
    const dur    = 1600;
    const t0     = performance.now();

    (function step(now) {
      const progress = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(2, -10 * progress);
      const val   = target * eased;
      el.textContent = prefix + (isInt ? Math.round(val) : val.toFixed(1)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    })(t0);
  }

  const counterObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.counted) {
        entry.target.dataset.counted = '1';
        animateCounter(entry.target);
        counterObs.unobserve(entry.target); // stop watching after fire
      }
    });
  }, { threshold: 0.6 });

  document.querySelectorAll('[data-target]').forEach(el => counterObs.observe(el));

  // ── SCROLL REVEAL ─────────────────────────────────────────────
  let revealedCount = 0;
  const revealEls = document.querySelectorAll('.reveal');
  const total = revealEls.length;

  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
        revealedCount++;
        if (revealedCount >= total) revealObs.disconnect();
      }
    });
  }, { threshold: 0.09 });

  revealEls.forEach(el => revealObs.observe(el));

  // ── MOBILE NAV ────────────────────────────────────────────────
  const hamburger = document.getElementById('nav-hamburger');
  const drawer    = document.getElementById('nav-drawer');

  hamburger?.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  drawer?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      drawer.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // ── NAV SCROLLED STATE ────────────────────────────────────────
  // Activates backdrop-filter blur only after scroll starts —
  // avoids blurring hero content before user has scrolled at all.
  const siteNav = document.getElementById('site-nav');
  if (siteNav) {
    const toggleNav = () => siteNav.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', toggleNav, { passive: true });
    toggleNav();
  }

  // ── V-PROGRESS SECTION TRACKER ────────────────────────────────
  // Side chapter indicator updates as data-section elements enter
  // viewport. 30% threshold = section is clearly in frame, not
  // just touching the edge.
  const vNum  = document.getElementById('v-progress-num');
  const vFill = document.getElementById('v-progress-fill');
  const dataSections = document.querySelectorAll('[data-section]');

  if (vNum && vFill && dataSections.length) {
    const total = dataSections.length;
    const secObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = parseInt(e.target.dataset.section, 10);
          vNum.textContent = e.target.dataset.section;
          vFill.style.height = Math.round((idx / total) * 100) + '%';
        }
      });
    }, { threshold: 0.3 });
    dataSections.forEach(s => secObs.observe(s));
  }

})();
