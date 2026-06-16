/**
 * scroll-to-game.js
 * Automatically scrolls + locks the viewport so the game canvas
 * is optimally centered on screen when a game starts.
 *
 * Usage: call  window.scrollToGame(targetEl, opts)
 *   targetEl  — the canvas or .game-panel element
 *   opts      — { offset: 0 }  extra px from top (e.g. to clear a sticky nav)
 *
 * Automatically called by patching lockScroll() on each game page.
 */
(function () {
  "use strict";

  /**
   * Compute the ideal scrollY so that `el` sits centred
   * (or top-aligned if too tall) in the visible viewport.
   */
  function idealScrollY(el, navH) {
    const rect    = el.getBoundingClientRect();
    const elH     = rect.height;
    const vpH     = window.innerHeight;
    const current = window.scrollY;

    // Ideal: element top = navH + (remaining space - elH) / 2
    const remaining = vpH - navH;
    let idealTop;
    if (elH >= remaining) {
      // Taller than viewport — align top to just below nav
      idealTop = navH + 4;
    } else {
      idealTop = navH + (remaining - elH) / 2;
    }

    // Convert idealTop (viewport-relative) → absolute scrollY
    const targetScrollY = current + rect.top - idealTop;
    return Math.max(0, targetScrollY);
  }

  /**
   * Smooth-scroll to the game panel and then freeze scroll.
   * @param {Element} el          – canvas or game-panel element
   * @param {number}  [navH=56]  – sticky nav height in px
   * @param {Function} [done]    – callback after scroll settles
   */
  function scrollToGame(el, navH, done) {
    if (!el) { if (done) done(); return; }
    navH = navH || 56;

    const target = idealScrollY(el, navH);
    const current = window.scrollY;
    const dist = Math.abs(target - current);

    // If already within 40px, skip animation
    if (dist < 40) { if (done) done(); return; }

    // Use native smooth scroll if supported
    if ('scrollBehavior' in document.documentElement.style) {
      window.scrollTo({ top: target, behavior: 'smooth' });
      // Wait for scroll to settle (rough estimate based on distance)
      const ms = Math.min(600, 150 + dist * 0.4);
      setTimeout(() => { if (done) done(); }, ms);
    } else {
      // Fallback: instant
      window.scrollTo(0, target);
      if (done) done();
    }
  }

  // Expose globally
  window.scrollToGame = scrollToGame;

  /**
   * Auto-patch: once the DOM is ready, find the game panel
   * and hook into each game's lockScroll function to auto-centre.
   */
  function patchLockScroll() {
    // Find the main interactive element — canvas inside .game-panel or .game-panel itself
    const panel = document.querySelector('.game-panel canvas, canvas#snake-canvas, canvas#gameCanvas, canvas#gc, .board');
    if (!panel) return;

    // Measure the sticky nav height
    const nav = document.querySelector('.game-nav, .nav');
    const navH = nav ? (nav.getBoundingClientRect().height || 56) : 56;

    // Wrap the original lockScroll
    const origLock = window.lockScroll;
    if (typeof origLock === 'function') {
      window.lockScroll = function () {
        // First scroll to ideal position, then call original lock
        scrollToGame(panel, navH, function () {
          origLock.call(window);
        });
      };
    }
  }

  // Run after everything else has loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchLockScroll);
  } else {
    // Already loaded — patch on next tick so game JS has run
    setTimeout(patchLockScroll, 0);
  }
})();
