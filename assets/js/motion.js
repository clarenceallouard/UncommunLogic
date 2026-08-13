/* ==========================================================================
   Uncommun Logic — motion and behaviour
   One easing curve: cubic-bezier(.16, 1, .3, 1). Nothing overshoots.
   Everything degrades to a static page without JS and stops dead under
   prefers-reduced-motion.
   ========================================================================== */

(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- easing ---------------------------------------------------- */

  /* Exact cubic-bezier(.16, 1, .3, 1) solver, Newton-Raphson with bisection
     fallback. Used by every scripted animation so scripted and CSS motion
     share one curve. */
  function bezier(x1, y1, x2, y2) {
    function A(a, b) { return 1 - 3 * b + 3 * a; }
    function B(a, b) { return 3 * b - 6 * a; }
    function C(a) { return 3 * a; }
    function calc(t, a, b) { return ((A(a, b) * t + B(a, b)) * t + C(a)) * t; }
    function slope(t, a, b) { return 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a); }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      /* Newton first, then bisect from its result. The previous version
         reset t = x and threw the Newton iterations away. */
      var t = x;
      for (var i = 0; i < 8; i++) {
        var sl = slope(t, x1, x2);
        if (sl === 0) break;
        t -= (calc(t, x1, x2) - x) / sl;
      }
      var lo = 0, hi = 1;
      while (lo < hi) {
        var v = calc(t, x1, x2);
        if (Math.abs(v - x) < 1e-5) break;
        if (v > x) hi = t; else lo = t;
        t = (hi + lo) / 2;
      }
      return calc(t, y1, y2);
    };
  }
  var EASE = bezier(0.16, 1, 0.3, 1);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- 01 reveal engine ----------------------------------------- */

  /* Declarative: data-reveal="mask|up|fade|rule|wipe", data-stagger,
     data-delay="120" (ms). Fires once, then unobserves. */
  function reveals() {
    var nodes = $$('[data-reveal], [data-stagger], .step');
    if (!nodes.length) return;

    if (REDUCED || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = e.target;
        var d = n.getAttribute('data-delay');
        if (d) n.style.setProperty('--d', d + 'ms');
        n.classList.add('in');
        io.unobserve(n);
      });
    /* threshold 0, not a fraction of the target: a section taller than the
       viewport can never reach a fractional threshold and would stay hidden. */
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

    nodes.forEach(function (n) { io.observe(n); });

    /* Belt and braces. If an observer never fires for something already on
       screen, reveal it rather than leave a blank block. */
    window.setTimeout(function () {
      nodes.forEach(function (n) {
        if (n.classList.contains('in')) return;
        var r = n.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.1) n.classList.add('in');
      });
    }, 2500);
  }

  /* Split a heading into words, each in its own clip, so they can rise in
     sequence. <br> is kept as a hard break.

     It used to flatten the heading to textContent, which meant any emphasis
     inside it was destroyed on the way through. It now walks the children, so
     a phrase wrapped in <i data-hl> survives: it is kept whole rather than cut
     into words, because it is one unit of meaning, and it carries a rule that
     draws under it once the line has landed. */
  function prepareWords() {
    $$('[data-reveal="words"]').forEach(function (n) {
      if ($('.wd', n)) return;
      var out = document.createDocumentFragment();
      var k = 0;

      function word(text, hl) {
        var w = document.createElement('span');
        w.className = 'wd' + (hl ? ' is-hl' : '');
        var i = document.createElement('i');
        i.textContent = text;
        i.style.transitionDelay = (k++ * 0.055).toFixed(3) + 's';
        w.appendChild(i);
        out.appendChild(w);
        out.appendChild(document.createTextNode(' '));
      }

      Array.prototype.slice.call(n.childNodes).forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/\s+/).forEach(function (t) { if (t) word(t, false); });
        } else if (node.nodeName === 'BR') {
          out.appendChild(document.createElement('br'));
        } else if (node.hasAttribute && node.hasAttribute('data-hl')) {
          word(node.textContent.replace(/\s+/g, ' ').trim(), true);
        } else {
          node.textContent.split(/\s+/).forEach(function (t) { if (t) word(t, false); });
        }
      });

      n.innerHTML = '';
      n.appendChild(out);
    });
  }

  /* ---------- 02 counters --------------------------------------------- */

  function counters() {
    var nodes = $$('[data-count]');
    if (!nodes.length) return;

    function run(el) {
      var to = parseFloat(el.getAttribute('data-count'));
      var dur = parseInt(el.getAttribute('data-count-dur') || '1200', 10);
      var pre = el.getAttribute('data-count-pre') || '';
      var suf = el.getAttribute('data-count-suf') || '';
      if (REDUCED) { el.textContent = pre + to + suf; return; }
      var t0 = null;
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var p = clamp((ts - t0) / dur, 0, 1);
        el.textContent = pre + Math.round(EASE(p) * to) + suf;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in window)) { nodes.forEach(run); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ---------- 04 scroll progress + header ----------------------------- */

  function scrollChrome() {
    var bar = $('.progress i');
    var header = $('.header');
    /* The mark rides the document on a hairline at the right edge: the same
       progress figure the bar uses, spent on the logo instead of on a bar. */
    var rail = $('.srail');
    var last = window.scrollY;
    var ticking = false;

    /* The mark has to stay legible over three different surfaces without
       leaving the palette. Blending arrives at mint green over oxblood, so it
       asks the document what is underneath it instead: one hit test per
       scroll frame, on an element that is already pointer-events: none. */
    var railX = 0, wasDark = null;

    function railSurface() {
      if (!rail) return;
      var mark = $('.srail-mark', rail);
      if (!mark) return;
      var r = mark.getBoundingClientRect();
      if (!r.width) return;
      railX = r.left + r.width / 2;
      var y = clamp(r.top + r.height / 2, 1, window.innerHeight - 2);
      var el = document.elementFromPoint(railX, y);
      var dark = !!(el && el.closest && el.closest('.on-ink, .on-ox'));
      if (dark === wasDark) return;
      wasDark = dark;
      if (dark) rail.setAttribute('data-on', 'dark');
      else rail.removeAttribute('data-on');
    }

    function apply() {
      var y = window.scrollY;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? clamp(y / h, 0, 1) : 0;
      if (bar) bar.style.setProperty('--p', p);
      if (rail) {
        rail.style.setProperty('--p', p.toFixed(4));
        railSurface();
      }
      if (header) {
        header.classList.toggle('is-stuck', y > 8);
        if (!$('.drawer.is-open')) {
          var down = y > last && y > 420;
          header.classList.toggle('is-hidden', down);
        }
      }
      last = y;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }, { passive: true });
    /* The document is not at its final height at DOMContentLoaded: the
       portraits are lazy and the fonts land after first paint, and both change
       how far there is left to scroll. Recompute when they do, or the rail
       reports 93% while the visitor is looking at the footer. */
    window.addEventListener('load', apply);
    window.addEventListener('resize', apply);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(apply);
    apply();

    /* The ring fills once the footer is on screen: the gate has fired, and the
       visitor read the page. Asking the footer is the honest question. A
       fraction of the scroll height is not: the page is not at its final
       height until the fonts and the portraits have landed, so the same
       position can read 93% one moment and 100% the next. */
    var foot = $('.footer');
    if (rail && foot && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) rail.setAttribute('data-end', '');
        else rail.removeAttribute('data-end');
      }, { threshold: 0.5 }).observe(foot);
    }
  }

  /* ---------- 05 mobile drawer --------------------------------------- */

  function drawer() {
    var burger = $('.burger');
    var panel = $('.drawer');
    if (!burger || !panel) return;

    function set(open) {
      burger.setAttribute('aria-expanded', String(open));
      var dm = $('.dock-menu');
      if (dm) dm.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
      if (open) {
        var first = $('a', panel);
        if (first) first.focus({ preventScroll: true });
      } else {
        burger.focus({ preventScroll: true });
      }
    }

    burger.addEventListener('click', function () {
      set(burger.getAttribute('aria-expanded') !== 'true');
    });

    /* The bottom dock opens the same drawer. */
    var dockMenu = $('.dock-menu');
    if (dockMenu) {
      dockMenu.addEventListener('click', function () {
        set(!panel.classList.contains('is-open'));
      });
    }
    panel.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') set(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) set(false);
    });

    /* BUG: crossing the breakpoint with the drawer open left body scroll
       locked while both the drawer and the burger became display:none, with
       no visible way to recover. Close it when the desktop nav takes over. */
    var wide = window.matchMedia('(min-width: 62.01rem)');
    var onWide = function (e) { if (e.matches) set(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  /* ---------- 06 hero lattice ---------------------------------------- */

  /* A field of NOT gates on a grid. Cells near the pointer invert: the
     brand mechanism, made into the interaction. Paused off-screen and on
     hidden tabs. */
  function lattice() {
    var cv = $('.hero-canvas');
    if (!cv || REDUCED) return;
    /* 17,280 canvas operations a second to react to a pointer that does not
       exist. One static frame on touch instead. */
    var COARSE = window.matchMedia('(pointer: coarse)').matches;
    var ctx = cv.getContext('2d', { alpha: true });
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, cells = [];
    var STEP = 64;
    var px = -9999, py = -9999, tpx = -9999, tpy = -9999;
    var running = true, t0 = performance.now();

    function build() {
      var r = cv.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      STEP = W < 640 ? 72 : W < 1100 ? 88 : 104;
      cells = [];
      var cols = Math.ceil(W / STEP) + 2;
      var rows = Math.ceil(H / STEP) + 2;
      for (var r2 = 0; r2 < rows; r2++) {
        for (var c = 0; c < cols; c++) {
          cells.push({
            x: c * STEP,
            y: r2 * STEP,
            /* deterministic pseudo-random so the field is stable on resize */
            k: ((c * 73856093) ^ (r2 * 19349663)) % 1000 / 1000,
            v: 0
          });
        }
      }
    }

    function gate(x, y, s, alpha, ring) {
      /* triangle with notched back, then the inversion ring */
      var w = s, h = s * 0.72, notch = s * 0.2;
      ctx.beginPath();
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x, y + h / 2);
      ctx.lineTo(x + notch, y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(244,241,234,' + alpha + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + w + s * 0.22, y, s * 0.15, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1, s * 0.11);
      ctx.strokeStyle = ring
        ? 'rgba(122,18,32,' + Math.min(1, alpha * 6) + ')'
        : 'rgba(244,241,234,' + alpha + ')';
      ctx.stroke();
    }

    function frame(ts) {
      if (!running) return;
      var drift = ((ts - t0) / 1000) * 5;
      px += (tpx - px) * 0.09;
      py += (tpy - py) * 0.09;

      ctx.clearRect(0, 0, W, H);
      var R = 230, R2 = R * R;

      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        var x = c.x - (drift % STEP) - STEP;
        var y = c.y + Math.sin((drift * 0.08) + c.k * 6.28) * 3 - STEP;
        if (x < -STEP || x > W + STEP || y < -STEP || y > H + STEP) continue;

        var dx = x - px, dy = y - py;
        var d2 = dx * dx + dy * dy;
        var target = d2 < R2 ? 1 - Math.sqrt(d2) / R : 0;
        c.v += (target - c.v) * 0.14;

        var base = 0.028 + c.k * 0.022;
        var a = base + c.v * 0.5;
        gate(x, y, STEP * 0.34, a, c.v > 0.28);
      }
      requestAnimationFrame(frame);
    }

    build();
    var hero = cv.closest('.hero') || cv.parentNode;

    if (COARSE) {
      /* One static frame, and then the field answers a finger while it is on
         the glass. The permanent loop was the right thing to cut on a phone;
         cutting the interaction with it meant the one effect people actually
         comment on never existed on the device most of them arrive on. Bounded
         by the touch itself, so an idle phone still renders nothing. */
      running = false;
      frame(performance.now());
      var stop = null;

      function idle(after) {
        clearTimeout(stop);
        stop = setTimeout(function () { running = false; }, after);
      }
      function touchAt(e) {
        var t = e.touches && e.touches[0];
        if (!t) return;
        var r = cv.getBoundingClientRect();
        tpx = t.clientX - r.left;
        tpy = t.clientY - r.top;
        if (!running && !document.hidden) {
          running = true; t0 = performance.now();
          requestAnimationFrame(frame);
        }
        idle(900);
      }
      hero.addEventListener('touchstart', touchAt, { passive: true });
      hero.addEventListener('touchmove', touchAt, { passive: true });
      hero.addEventListener('touchend', function () {
        tpx = -9999; tpy = -9999;
        idle(700);
      }, { passive: true });
      return;
    }

    requestAnimationFrame(frame);

    hero.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect();
      tpx = e.clientX - r.left;
      tpy = e.clientY - r.top;
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { tpx = -9999; tpy = -9999; });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(build, 180);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { running = false; }
      else if (!running) { running = true; t0 = performance.now(); requestAnimationFrame(frame); }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        if (vis && !running && !document.hidden) {
          running = true; t0 = performance.now(); requestAnimationFrame(frame);
        } else if (!vis) { running = false; }
      }, { threshold: 0 }).observe(cv);
    }
  }

  /* ---------- 07 scroll-linked scrubs -------------------------------- */

  /* Two kinds of scroll-linked progress, both published as --p on the element
     so the whole animation can live in CSS as arithmetic.

     [data-scrub]  measures the element's own height. Correct for a tall
                   pinned block, useless for anything shorter than the
                   viewport, which is what the horizontal rail used to be.
     [data-view]   measures the element's travel through the viewport: 0 as
                   its top reaches 88% of the screen, 1 once it has cleared
                   the top third. Correct for everything else, which is why
                   the number module, the extruded mark and the working all
                   use it.

     Only elements currently near the viewport are measured, so the cost is
     bounded by what is on screen rather than by the length of the page. */
  function scrubs() {
    var own = $$('[data-scrub]');
    var view = $$('[data-view]');
    if (!own.length && !view.length) return;

    if (REDUCED) {
      /* No motion: the end state is the informative one. */
      view.forEach(function (n) { n.style.setProperty('--p', '1'); });
      own.forEach(function (n) { n.style.setProperty('--p', '1'); });
      return;
    }

    var nodes = own.concat(view);
    var live = nodes;
    var ticking = false;

    function apply() {
      var vh = window.innerHeight;
      for (var i = 0; i < live.length; i++) {
        var n = live[i];
        var r = n.getBoundingClientRect();
        var p;
        if (n.hasAttribute('data-scrub')) {
          var span = r.height - vh * 0.4;
          p = span > 0 ? clamp((vh * 0.6 - r.top) / span, 0, 1) : 0;
        } else {
          var travel = r.height + vh * 0.58;
          p = clamp((vh * 0.88 - r.top) / travel, 0, 1);
        }
        n.style.setProperty('--p', p.toFixed(4));
      }
      ticking = false;
    }

    function req() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }

    if ('IntersectionObserver' in window) {
      live = [];
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var k = live.indexOf(e.target);
          if (e.isIntersecting && k < 0) live.push(e.target);
          else if (!e.isIntersecting && k >= 0) live.splice(k, 1);
        });
        apply();
      }, { rootMargin: '25% 0px 25% 0px', threshold: 0 });
      nodes.forEach(function (n) { io.observe(n); });
    }

    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    apply();
  }

  /* ---------- 07d the extruded mark ---------------------------------- */

  /* Scroll turns it; the pointer nudges it. Two custom properties, one
     transform, and a CSS transition doing the smoothing so there is no
     animation loop running when nobody is moving. Desktop only: the media
     query that shows it is the same one that decides whether to listen. */
  function mark3d() {
    var el = $('.mark3d');
    if (!el || REDUCED || !FINE) return;
    if (!window.matchMedia('(min-width: 75rem)').matches) return;

    var host = el.closest('.hero') || document.body;
    var ticking = false;
    var mx = 0, my = 0;

    function write() {
      el.style.setProperty('--mx', mx.toFixed(3));
      el.style.setProperty('--my', my.toFixed(3));
      ticking = false;
    }

    host.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect();
      mx = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5) * 2;
      my = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5) * 2;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(write);
    }, { passive: true });

    host.addEventListener('pointerleave', function () {
      mx = 0; my = 0;
      requestAnimationFrame(write);
    });
  }

  /* ---------- 07e pointer tilt --------------------------------------- */

  /* Four degrees. Enough to say the surface is a plane in space, not enough
     to make anyone read a heading at an angle. The listener is attached on
     enter and removed on leave, so a page of twenty cards costs nothing
     until one of them is under the pointer. */
  function tilt() {
    if (REDUCED || !FINE) return;
    $$('[data-tilt]').forEach(function (el) {
      var raf = null, rect = null, x = 0, y = 0;

      function write() {
        raf = null;
        el.style.transform =
          'perspective(52rem) rotateY(' + (x * 4.2).toFixed(2) + 'deg) rotateX(' +
          (-y * 4.2).toFixed(2) + 'deg)';
      }
      function move(e) {
        if (!rect) return;
        x = clamp((e.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5) * 2;
        y = clamp((e.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5) * 2;
        if (raf) return;
        raf = requestAnimationFrame(write);
      }
      el.addEventListener('pointerenter', function () {
        rect = el.getBoundingClientRect();
        el.style.willChange = 'transform';
        el.addEventListener('pointermove', move, { passive: true });
      });
      el.addEventListener('pointerleave', function () {
        el.removeEventListener('pointermove', move);
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        rect = null;
        el.style.transform = '';
        el.style.willChange = '';
      });
    });
  }

  /* ---------- 07b parallax ------------------------------------------ */

  /* [data-parallax="0.2"] drifts at a fraction of the scroll, and the hero
     content fades as it leaves. Transform and opacity only, so it stays on
     the compositor and never triggers layout. */
  function parallax() {
    if (REDUCED) return;
    var nodes = $$('[data-parallax]');
    if (!nodes.length) return;
    var ticking = false;

    function apply() {
      var y = window.scrollY;
      var vh = window.innerHeight;
      nodes.forEach(function (n) {
        var f = parseFloat(n.getAttribute('data-parallax')) || 0.15;
        var r = n.getBoundingClientRect();
        var start = y + r.top;
        var d = y - start;
        if (d < -vh || d > vh * 1.5) return;
        var shift = clamp(d, 0, vh) * f;
        n.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
        /* The fade used to drop the headline to 10% opacity while it was
           still on screen, which is deletion rather than restraint. */
      });
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }, { passive: true });
    apply();
  }

  /* ---------- 08 magnetic buttons + reticle -------------------------- */

  /* ---------- 07f the motif leans towards the pointer ---------------- */

  /* The one effect on this site people comment on is the field of gates in the
     header answering the pointer. This gives the same behaviour to every large
     panel that carries the motif, for the cost of two custom properties and
     one composited transform. Only panels tall enough for the movement to read
     are wired, only on a fine pointer, and only while it is inside one. */
  function veilField() {
    if (REDUCED || !FINE) return;
    $$('.veil').forEach(function (el) {
      var box = el.getBoundingClientRect();
      if (box.height < 200) return;

      var raf = null, rect = null, x = 0, y = 0;

      function write() {
        raf = null;
        el.style.setProperty('--vx', x.toFixed(3));
        el.style.setProperty('--vy', y.toFixed(3));
      }
      function move(e) {
        if (!rect) return;
        x = clamp((e.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5) * 2;
        y = clamp((e.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5) * 2;
        if (raf) return;
        raf = requestAnimationFrame(write);
      }
      el.addEventListener('pointerenter', function () {
        rect = el.getBoundingClientRect();
        el.addEventListener('pointermove', move, { passive: true });
      });
      el.addEventListener('pointerleave', function () {
        el.removeEventListener('pointermove', move);
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        rect = null;
        x = 0; y = 0;
        write();
      });
    });
  }

  /* ---------- 09 intro: the name device ------------------------------ */

  /* UNCOMMON is spelled correctly, the O leaves the word and becomes the
     ring of the mark, the U drops into the empty slot. Brand guidelines s02.
     Runs once per browser session, on the landing page only, and is
     skippable. Any failure removes the overlay rather than trapping the
     page. */
  function intro() {
    var el = $('.intro');
    if (!el) return;

    function finish() {
      el.classList.add('done');
      document.documentElement.classList.remove('intro-lock');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1100);
    }

    var TOUCH = window.matchMedia('(pointer: coarse)').matches;
    if (REDUCED || sessionStorage.getItem('ul-intro') === '1') {
      el.parentNode.removeChild(el);
      document.documentElement.classList.remove('intro-lock');
      return;
    }

    /* On a phone this used to be 3.2 seconds of locked black screen carrying
       the instruction "press any key to skip" on a device with no keys, so it
       was cut entirely. It is back at two thirds the length, it never holds
       the page, and a touch anywhere ends it. */
    var K = 1;
    if (TOUCH) {
      K = 0.62;
      document.documentElement.classList.remove('intro-lock');
      var skip = $('.intro-skip', el);
      if (skip) skip.textContent = 'Touch to skip';
    }
    function at(fn, ms) { setTimeout(fn, Math.round(ms * K)); }

    try {
      sessionStorage.setItem('ul-intro', '1');
      var o = $('.iv-o', el);
      var u = $('.iv-u', el);
      var tri = $('.iv-tri', el);
      var ring = $('.iv-ring', el);
      var rule = $('.iv-rule', el);
      var word = $('.iv-word', el);

      /* the word, correctly spelled */
      at(function () { word.style.opacity = '1'; }, 40);
      /* the O leaves */
      at(function () {
        o.style.transform = 'translateX(1.1em) scale(.42)';
        o.style.opacity = '0';
      }, 300);
      /* the ring arrives in its place */
      at(function () { ring.style.opacity = '1'; ring.style.transform = 'none'; }, 420);
      /* the U drops into the slot */
      at(function () { u.style.opacity = '1'; u.style.transform = 'none'; }, 480);
      /* the triangle sweeps in */
      at(function () { tri.style.opacity = '1'; tri.style.transform = 'none'; }, 640);
      /* the rule lands */
      at(function () { rule.style.transform = 'scaleX(1)'; }, 820);
      at(finish, 1450);
    } catch (err) {
      finish();
      return;
    }

    el.addEventListener('click', finish);
    el.addEventListener('touchstart', finish, { passive: true });
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        document.removeEventListener('keydown', onKey);
        finish();
      }
    }
    document.addEventListener('keydown', onKey);
  }

  /* ---------- 10 nav current page ----------------------------------- */

  function markCurrent() {
    var path = location.pathname.replace(/index\.html$/, '');
    if (path.length > 1) path = path.replace(/\/$/, '') + '/';
    $$('.nav a[href], .drawer a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) !== '/') return;
      var norm = href.length > 1 ? href.replace(/\/$/, '') + '/' : '/';
      if (norm === path) a.setAttribute('aria-current', 'page');
    });
  }

  /* ---------- 11 contact details from config ------------------------ */

  function wireContacts() {
    var C = window.UL || {};
    /* BUG: without this guard a missing or malformed config.js rewrote every
       contact link to mailto:undefined and blanked its text, leaving links
       with no accessible name. The markup now carries the real details, so
       this function only ever corrects them. */
    if (!C.email || !C.phone) return;
    /* Write into the inner span where there is one. Replacing textContent on
       a .btn would delete the span the hover fill sits behind, and the label
       would disappear on hover. */
    function put(n, value) {
      if (n.hasAttribute('data-ul-keep')) return;
      var target = n.querySelector('span') || n;
      target.textContent = value;
    }
    $$('[data-ul="email"]').forEach(function (n) {
      if (n.tagName === 'A') n.href = 'mailto:' + C.email;
      put(n, C.email);
    });
    $$('[data-ul="phone"]').forEach(function (n) {
      if (n.tagName === 'A') n.href = 'tel:' + C.phone;
      put(n, C.phoneDisplay);
    });
    $$('[data-ul="year"]').forEach(function (n) {
      n.textContent = String(new Date().getFullYear());
    });
  }

  /* ---------- 12 portraits with a branded fallback ------------------ */

  /* No broken-image icons: if the photo is missing the seal shows instead. */
  function portraits() {
    $$('.portrait img').forEach(function (img) {
      function fail() {
        img.style.display = 'none';
        var fb = img.parentNode.querySelector('.portrait-fallback');
        if (fb) fb.hidden = false;
      }
      img.addEventListener('error', fail);
      if (img.complete && img.naturalWidth === 0) fail();
    });
  }

  /* ---------- boot -------------------------------------------------- */

  function boot() {
    try { prepareWords(); } catch (e) {}
    try { reveals(); } catch (e) {}
    try { counters(); } catch (e) {}
    try { scrollChrome(); } catch (e) {}
    try { drawer(); } catch (e) {}
    try { lattice(); } catch (e) {}
    try { scrubs(); } catch (e) {}
    try { mark3d(); } catch (e) {}
    try { tilt(); } catch (e) {}
    try { veilField(); } catch (e) {}
    try { parallax(); } catch (e) {}
    try { markCurrent(); } catch (e) {}
    try { wireContacts(); } catch (e) {}
    try { portraits(); } catch (e) {}
    try { intro(); } catch (e) {
      var i = $('.intro');
      if (i && i.parentNode) i.parentNode.removeChild(i);
      document.documentElement.classList.remove('intro-lock');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
