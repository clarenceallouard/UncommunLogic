/* ==========================================================================
   Uncommun Logic — the live specimen
   Reads the browser's own measurements of the page it is running on and
   prints them. Nothing here is a claim we make about our work: it is the
   visitor's own device reporting what it just did. Same-origin resources
   only, so transferSize is populated without any CORS arrangement.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.getElementById('specimen');
  if (!root) return;

  function set(id, value, note) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
    if (note) {
      var n = el.parentNode.querySelector('[data-note]');
      if (n) n.textContent = note;
    }
  }

  function kb(bytes) { return (bytes / 1024).toFixed(1) + ' KB'; }
  function ms(v) { return Math.round(v) + ' ms'; }

  function report() {
    if (!window.performance || !performance.getEntriesByType) {
      root.setAttribute('data-unsupported', '');
      return;
    }

    var res = performance.getEntriesByType('resource');
    var nav = performance.getEntriesByType('navigation')[0];

    /* Requests: every resource plus the document itself. */
    var requests = res.length + 1;

    /* Transfer: what actually came down the wire. Zero means the browser
       answered from its own cache, which is worth saying rather than
       reporting a flattering zero. */
    var transferred = res.reduce(function (a, r) { return a + (r.transferSize || 0); }, 0);
    if (nav) transferred += nav.transferSize || 0;

    var thirdParty = res.filter(function (r) {
      try { return new URL(r.name).origin !== location.origin; }
      catch (e) { return false; }
    }).length;

    set('spRequests', String(requests));
    if (transferred > 0) {
      set('spWeight', kb(transferred), 'Compressed, on this visit. A repeat visit transfers less, because your browser keeps what it already has.');
    } else {
      set('spWeight', 'cached', 'Your browser answered from its own cache, so nothing came down the wire. Reload with a cleared cache to see the transfer figure.');
    }
    set('spThird', String(thirdParty));
    set('spCookies', String(document.cookie ? document.cookie.split(';').length : 0));

    if (nav) {
      set('spDom', ms(nav.domContentLoadedEventEnd));
      var ttfb = nav.responseStart - nav.requestStart;
      if (ttfb >= 0) set('spTtfb', ms(ttfb));
    }

    root.setAttribute('data-live', '');
  }

  /* Largest Contentful Paint arrives asynchronously and can be revised, so
     it is observed rather than read once. */
  function watchLcp() {
    if (!('PerformanceObserver' in window)) return;
    try {
      var po = new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        var last = entries[entries.length - 1];
        if (last) set('spLcp', ms(last.startTime));
      });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) { /* not supported, the row keeps its dash */ }
  }

  function boot() {
    /* Wait for load so the resource list is complete. */
    if (document.readyState === 'complete') {
      setTimeout(report, 0);
    } else {
      window.addEventListener('load', function () { setTimeout(report, 0); });
    }
    watchLcp();
  }

  boot();
})();
