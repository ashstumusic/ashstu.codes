(function () {
  'use strict';

  const hamburger = document.getElementById('nav-hamburger');
  const drawer    = document.getElementById('nav-drawer');

  if (hamburger && drawer) {
    // pointerdown fires before click, eliminating the 300ms mobile tap delay
    hamburger.addEventListener('pointerdown', () => {
      const isOpen = drawer.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('pointerdown', () => {
        hamburger.classList.remove('open');
        drawer.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  const siteNav = document.getElementById('site-nav');
  if (siteNav) {
    // rAF throttle: coalesces multiple scroll events per frame into one
    // DOM write, preventing layout thrashing on high-frequency scroll.
    let rafPending = false;
    const applyScrolled = () => {
      siteNav.classList.toggle('scrolled', window.scrollY > 20);
      rafPending = false;
    };
    window.addEventListener('scroll', () => {
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(applyScrolled);
      }
    }, { passive: true });
    applyScrolled();
  }

})();
