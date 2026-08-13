/* ==========================================================================
   Uncommun Logic — the brief builder
   Composes an email in the visitor's own mail client. Nothing reaches a
   server, nothing is stored, no third party is contacted. The arithmetic is
   deliberately visible: one stated assumption, no hidden model.

   The figure used to sit 733px below the inputs on a phone, declared
   transition: all 0s. It is now beside them and it moves, because it is the
   number that decides whether anyone gets in touch.
   ========================================================================== */

(function () {
  'use strict';

  var form = document.getElementById('brief');
  if (!form) return;

  /* Nowhere to submit to. Enter must not navigate. */
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* Forty-six working weeks over twelve months: the same leave-adjusted year
     the home page arithmetic uses, so the two figures agree. */
  var WEEKS = 46 / 12;
  var SHARE = 0.4;       /* stated assumption, not a measurement */
  var ARC_MAX = 120;     /* hours a month at which the ring reads full */

  var hours = document.getElementById('bHours');
  var people = document.getElementById('bPeople');
  var out = document.getElementById('bEst');
  var arc = document.querySelector('.est-arc');
  var send = document.getElementById('bSend');
  var status = document.getElementById('bStatus');

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function num(el, min, max, fallback) {
    var v = parseFloat(el.value);
    if (!isFinite(v)) return fallback;
    return Math.max(min, Math.min(max, v));
  }

  function estimate() {
    return Math.round(num(hours, 1, 40, 6) * num(people, 1, 50, 2) * WEEKS * SHARE);
  }

  /* One eased tween, on the same curve as everything else, so the number
     arrives rather than jumping. */
  var shown = estimate();
  var raf = null;

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function paint(v) {
    out.textContent = String(Math.round(v));
    if (arc) {
      var C = 2 * Math.PI * 27;
      var p = Math.max(0, Math.min(v / ARC_MAX, 1));
      arc.style.strokeDasharray = C.toFixed(1);
      arc.style.strokeDashoffset = (C * (1 - p)).toFixed(1);
    }
  }

  function tween() {
    var from = shown;
    var to = estimate();
    if (REDUCED || from === to) { shown = to; paint(to); return; }
    var t0 = null;
    if (raf) cancelAnimationFrame(raf);
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / 420, 1);
      paint(from + (to - from) * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else { shown = to; raf = null; }
    }
    raf = requestAnimationFrame(step);
  }

  [hours, people].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', tween);
    el.addEventListener('change', tween);
  });
  paint(shown);

  /* ---------- readiness ------------------------------------------------ */

  /* The button looked identical whether or not it could do anything, and only
     said so after being pressed. One field decides it: the description. The
     state is published on the panel so the CSS can fill the button the moment
     the brief is worth sending, and the message under it says what is missing
     rather than waiting to complain. */
  var panel = document.querySelector('.brief-send');
  var readyNote = document.getElementById('bReady');
  var processEl = document.getElementById('bProcess');

  function readiness() {
    if (!panel || !processEl) return;
    var n = processEl.value.trim().length;
    var ready = n >= 20;
    if (ready) panel.setAttribute('data-ready', '');
    else panel.removeAttribute('data-ready');
    if (readyNote) {
      readyNote.textContent = ready
        ? 'Ready to send'
        : (n === 0 ? 'Describe the process first'
                   : 'A sentence or two, so we can cost it');
    }
    if (ready) processEl.removeAttribute('aria-invalid');
  }

  if (processEl) {
    processEl.addEventListener('input', readiness);
    processEl.addEventListener('change', readiness);
  }
  readiness();

  /* ---------- the message ---------------------------------------------- */

  function value(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    if (el.tagName === 'SELECT') return el.options[el.selectedIndex].text;
    return el.value.trim();
  }

  function tools() {
    return Array.prototype.slice
      .call(form.querySelectorAll('input[name="tool"]:checked'))
      .map(function (i) { return i.value; });
  }

  send.addEventListener('click', function () {
    var C = window.UL || {};
    var email = C.email || 'Clarence.allouard@uncommunlogic.com';
    var process = value('bProcess');

    if (!process) {
      status.textContent = 'Describe the process first. One or two sentences is enough.';
      var t = document.getElementById('bProcess');
      t.setAttribute('aria-invalid', 'true');
      t.focus();
      return;
    }
    document.getElementById('bProcess').removeAttribute('aria-invalid');

    var picked = tools();
    var lines = [
      'THE PROCESS', process, '',
      'THE SHAPE OF IT',
      '- Kind of business: ' + value('bSegment'),
      '- Time it eats now: ' + num(hours, 1, 40, 6) + ' hours per person per week',
      '- People it touches: ' + num(people, 1, 50, 2),
      '- Tools already in use: ' + (picked.length ? picked.join(', ') : 'not stated'), '',
      'INDICATIVE FIGURE',
      '~' + estimate() + ' hours a month, assuming ' + Math.round(SHARE * 100) +
        '% of that time is automatable, across 46 working weeks.',
      'That assumption is mine, not a measurement. Measure it on the call.', '',
      'WHAT I WANT NEXT', 'The one-hour call.'
    ];

    var name = value('bName'), company = value('bCompany');
    if (name || company) {
      lines.push('', 'WHO I AM', [name, company].filter(Boolean).join(' - '));
    }

    var subject = 'Brief: ' + process.slice(0, 60).replace(/\s+/g, ' ') +
      (process.length > 60 ? '…' : '');

    function build(body) {
      return 'mailto:' + email + '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body.join('\n'));
    }

    var href = build(lines);
    /* mailto: above roughly 1,800 characters is unreliable across clients. */
    if (href.length > 1800) {
      lines[1] = process.slice(0, 600) + '…';
      href = build(lines);
      status.textContent = 'Long brief shortened to fit an email link. ' +
        'Paste the rest into the message before sending.';
    } else {
      status.textContent = 'Opening your mail app. Nothing was sent from this page.';
    }
    window.location.href = href;
  });
})();
