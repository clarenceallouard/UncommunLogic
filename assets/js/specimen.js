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

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* The figures used to be written the instant the page finished loading,
     which on this page is several screens above where they are read: by the
     time anyone arrived, they had already teleported into place. They are held
     until the panel is on screen, then counted up, on the same curve as every
     other number on the site. A panel whose whole argument is that these were
     measured should be seen to arrive at them. */
  var visible = false;
  var pending = {};
  var counted = {};

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function count(el, target, decimals, suffix) {
    var t0 = null;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / 760, 1);
      el.textContent = (target * ease(p)).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(frame);
  }

  /* One pass of a rule across the cell as its figure lands. The width has to
     be handed to CSS because the animation travels the cell's own width and a
     percentage on translateX would measure the rule, which is one pixel. */
  function measure(el) {
    var cell = el.closest ? el.closest('.spec-cell') : null;
    if (!cell || REDUCED) return;
    cell.style.setProperty('--w', Math.round(cell.getBoundingClientRect().width) + 'px');
    cell.classList.add('is-measured');
  }

  function write(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    var m = /^(\d+(?:\.\d+)?)(.*)$/.exec(value);
    if (REDUCED || !m || counted[id]) { el.textContent = value; return; }
    counted[id] = true;
    measure(el);
    var num = parseFloat(m[1]);
    var dec = (m[1].split('.')[1] || '').length;
    count(el, num, dec, m[2]);
  }

  function set(id, value, note) {
    var el = document.getElementById(id);
    if (!el) return;
    if (note) {
      var n = el.parentNode.querySelector('[data-note]');
      if (n) n.textContent = note;
    }
    if (!visible) { pending[id] = value; return; }
    write(id, value);
  }

  function flush() {
    visible = true;
    Object.keys(pending).forEach(function (id) { write(id, pending[id]); });
    pending = {};
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      flush();
    }, { threshold: 0.25 }).observe(root);
    /* If the observer never fires, the numbers still have to appear. */
    window.setTimeout(function () { if (!visible) flush(); }, 6000);
  } else {
    visible = true;
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
      var ttfb = nav.responseStart - nav.requestStart;
      if (ttfb >= 0) set('spTtfb', ms(ttfb));
    }

    root.setAttribute('data-live', '');
  }

  /* Chrome does not do occlusion testing, so an element behind an opaque
     overlay still counts as painted. On first visit the opening animation
     covers the page, which made the published LCP figure flattering and
     wrong. If the animation ran, say so and report when the page actually
     became readable instead of pretending the two are the same. */
  function noteIntro() {
    var el = document.getElementById('spLcp');
    if (!el) return;
    var intro = document.querySelector('.intro');
    if (!intro) return;
    var note = el.parentNode.querySelector('[data-note]');
    var t0 = performance.now();
    var obs = new MutationObserver(function () {
      if (document.querySelector('.intro')) return;
      obs.disconnect();
      var cleared = Math.round(performance.now());
      if (note) {
        note.textContent = 'Measured behind the opening animation, which is why it reads '
          + 'so low. The page actually became readable at ' + cleared + ' ms.';
      }
    });
    obs.observe(document.body, { childList: true });
    window.setTimeout(function () { obs.disconnect(); }, 8000);
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
    noteIntro();
  }

  boot();
})();
