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
      var t = x;
      for (var i = 0; i < 8; i++) {
        var s = slope(t, x1, x2);
        if (s === 0) break;
        var e = calc(t, x1, x2) - x;
        t -= e / s;
      }
      var lo = 0, hi = 1;
      t = x;
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
     sequence. <br> is kept as a hard break. Runs before the observer so the
     initial state is set in one pass. */
  function prepareWords() {
    $$('[data-reveal="words"]').forEach(function (n) {
      if ($('.wd', n)) return;
      var html = n.innerHTML.replace(/<br\s*\/?>/gi, '\n');
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      var text = tmp.textContent;
      var out = '';
      var i = 0;
      text.split('\n').forEach(function (line, li) {
        if (li) out += '<br>';
        line.split(/\s+/).filter(Boolean).forEach(function (word, wi) {
          out += '<span class="wd"><i>' + word + '</i></span>';
          if (wi >= 0) out += ' ';
        });
      });
      n.innerHTML = out;
      $$('.wd > i', n).forEach(function (el, k) {
        el.style.transitionDelay = (k * 0.055).toFixed(3) + 's';
      });
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

  /* ---------- 03 scramble labels -------------------------------------- */

  function scramble() {
    if (REDUCED) return;
    var nodes = $$('[data-scramble]');
    if (!nodes.length || !('IntersectionObserver' in window)) return;
    var POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·';

    function run(el) {
      var target = el.textContent;
      var frames = 16;
      var i = 0;
      var tick = setInterval(function () {
        i++;
        var settled = Math.floor((i / frames) * target.length);
        var out = '';
        for (var c = 0; c < target.length; c++) {
          if (c < settled || target[c] === ' ') out += target[c];
          else out += POOL[Math.floor(Math.random() * POOL.length)];
        }
        el.textContent = out;
        if (i >= frames) { clearInterval(tick); el.textContent = target; }
      }, 28);
    }

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.8 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ---------- 04 scroll progress + header ----------------------------- */

  function scrollChrome() {
    var bar = $('.progress i');
    var header = $('.header');
    var last = window.scrollY;
    var ticking = false;

    function apply() {
      var y = window.scrollY;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.setProperty('--p', h > 0 ? clamp(y / h, 0, 1) : 0);
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
    apply();
  }

  /* ---------- 05 mobile drawer --------------------------------------- */

  function drawer() {
    var burger = $('.burger');
    var panel = $('.drawer');
    if (!burger || !panel) return;

    function set(open) {
      burger.setAttribute('aria-expanded', String(open));
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
    panel.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') set(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) set(false);
    });
  }

  /* ---------- 06 hero lattice ---------------------------------------- */

  /* A field of NOT gates on a grid. Cells near the pointer invert: the
     brand mechanism, made into the interaction. Paused off-screen and on
     hidden tabs. */
  function lattice() {
    var cv = $('.hero-canvas');
    if (!cv || REDUCED) return;
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
    requestAnimationFrame(frame);

    var hero = cv.closest('.hero') || cv.parentNode;
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

  /* Any [data-scrub] gets --p = 0..1 across its own scroll span.
     Used by the process rail and the horizontal family rail. */
  function scrubs() {
    var nodes = $$('[data-scrub]');
    var rails = $$('.rail-outer');
    if (!nodes.length && !rails.length) return;
    if (REDUCED) return;

    var ticking = false;

    function apply() {
      var vh = window.innerHeight;

      nodes.forEach(function (n) {
        var r = n.getBoundingClientRect();
        var span = r.height - vh * 0.4;
        var p = span > 0 ? clamp((vh * 0.6 - r.top) / span, 0, 1) : 0;
        n.style.setProperty('--p', p);
      });

      rails.forEach(function (outer) {
        var track = $('.rail-track', outer);
        if (!track) return;
        if (window.innerWidth <= 960) { track.style.transform = ''; return; }
        var over = track.scrollWidth - window.innerWidth;
        if (over <= 0) { track.style.transform = ''; return; }
        var r = outer.getBoundingClientRect();
        var span = r.height - vh;
        var p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
        track.style.transform = 'translate3d(' + (-over * p) + 'px,0,0)';
      });

      ticking = false;
    }

    function req() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }

    /* The rail needs a scroll span proportional to its overflow. */
    function sizeRails() {
      rails.forEach(function (outer) {
        var track = $('.rail-track', outer);
        if (!track) return;
        if (window.innerWidth <= 960) { outer.style.height = ''; return; }
        var over = Math.max(0, track.scrollWidth - window.innerWidth);
        outer.style.height = (window.innerHeight + over) + 'px';
      });
      apply();
    }

    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', function () { sizeRails(); });
    sizeRails();
    /* fonts land after first paint and change track width */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeRails);
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
        if (n.hasAttribute('data-parallax-fade')) {
          n.style.opacity = String(1 - clamp(d / (vh * 0.85), 0, 1) * 0.9);
        }
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

  function pointerCraft() {
    if (!FINE || REDUCED) return;

    $$('.btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.transform = 'translate(' + (dx * 5).toFixed(2) + 'px,' + (dy * 4).toFixed(2) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });

    var ret = $('.reticle');
    if (!ret) return;
    var x = -100, y = -100, tx = -100, ty = -100, on = false;

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; ret.classList.add('on'); x = tx; y = ty; }
      var t = e.target;
      var interactive = t.closest && t.closest('a, button, .tile, input, textarea, select');
      ret.classList.toggle('grow', !!interactive);
    }, { passive: true });

    document.addEventListener('pointerleave', function () { on = false; ret.classList.remove('on'); });

    (function loop() {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      ret.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
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

    if (REDUCED || sessionStorage.getItem('ul-intro') === '1') {
      el.parentNode.removeChild(el);
      document.documentElement.classList.remove('intro-lock');
      return;
    }

    try {
      sessionStorage.setItem('ul-intro', '1');
      var o = $('.iv-o', el);
      var u = $('.iv-u', el);
      var tri = $('.iv-tri', el);
      var ring = $('.iv-ring', el);
      var rule = $('.iv-rule', el);
      var word = $('.iv-word', el);

      /* 0 ms: the word, correctly spelled */
      setTimeout(function () { word.style.opacity = '1'; }, 60);
      /* 480 ms: the O leaves */
      setTimeout(function () {
        o.style.transform = 'translateX(1.1em) scale(.42)';
        o.style.opacity = '0';
      }, 480);
      /* 620 ms: the ring arrives in its place */
      setTimeout(function () { ring.style.opacity = '1'; ring.style.transform = 'none'; }, 620);
      /* 700 ms: the U drops into the slot */
      setTimeout(function () { u.style.opacity = '1'; u.style.transform = 'none'; }, 700);
      /* 900 ms: the triangle sweeps in */
      setTimeout(function () { tri.style.opacity = '1'; tri.style.transform = 'none'; }, 900);
      /* 1150 ms: the rule lands */
      setTimeout(function () { rule.style.transform = 'scaleX(1)'; }, 1150);
      setTimeout(finish, 1950);
    } catch (err) {
      finish();
      return;
    }

    var skip = $('.intro', document);
    skip.addEventListener('click', finish);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish();
    }, { once: true });
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
    try { scramble(); } catch (e) {}
    try { scrollChrome(); } catch (e) {}
    try { drawer(); } catch (e) {}
    try { lattice(); } catch (e) {}
    try { scrubs(); } catch (e) {}
    try { parallax(); } catch (e) {}
    try { pointerCraft(); } catch (e) {}
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
