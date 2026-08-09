/* Runs before first paint, from <head>, so the page never flashes.
   Kept as an external file so the Content-Security-Policy can forbid all
   inline script. Adds the capability class and locks scroll for the intro. */
(function () {
  var h = document.documentElement;
  h.className += ' js';
  try {
    if (h.hasAttribute('data-intro') &&
        sessionStorage.getItem('ul-intro') !== '1' &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      h.className += ' intro-lock';
    } else {
      h.setAttribute('data-intro-skip', '');
    }
  } catch (e) {
    h.setAttribute('data-intro-skip', '');
  }
})();
