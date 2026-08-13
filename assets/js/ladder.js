/* ==========================================================================
   Uncommun Logic — the gate ladder
   Replaces the two-column tree, which on a phone put its answer 998px below
   the fold and stopped being a tree at all once the columns stacked.

   You cannot search for a thing you cannot name, so this asks instead of
   indexing. Three questions, each answered in one tap, each inverting a gate.
   Seventy-eight becomes four or five. A search field and the full list are
   always one tap away, because a triage that traps you is worse than a list.

   State lives in the URL, so an answer set is shareable and the back button
   works. Nothing animates that is not entering.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.getElementById('ladder');
  if (!root) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var stepsEl = document.getElementById('ladderSteps');
  var resultsEl = document.getElementById('ladderResults');
  var countEl = document.getElementById('ladderCount');
  var searchEl = document.getElementById('ladderSearch');
  var liveEl = document.getElementById('ladderLive');

  var DATA = null;
  var answers = { seg: null, fam: null, size: null };
  var query = '';
  var showAll = false;

  /* ---------- questions ------------------------------------------------ */

  /* The family keys are grouped into symptoms, because "DOC" and "MSG" mean
     nothing to a visitor. Every key below exists in solutions.json. */
  var SYMPTOMS = [
    { id: 'typing',  label: 'Typing the same thing again',      fams: ['MSG', 'DOC'] },
    { id: 'winning', label: 'Winning and booking work',         fams: ['LEAD', 'BOOK'] },
    { id: 'money',   label: 'Invoices, receipts, tax time',     fams: ['CASH'] },
    { id: 'numbers', label: 'Not knowing my numbers',           fams: ['DATA'] },
    { id: 'field',   label: 'Paperwork out on the job',         fams: ['FIELD'] },
    { id: 'seen',    label: 'Being found and being seen',       fams: ['SHOW'] },
    { id: 'ms',      label: 'Microsoft licences we barely use', fams: ['MS'] },
    { id: 'start',   label: 'We have not started with AI yet',  fams: ['SETUP'] }
  ];

  var SIZES = [
    { id: 'quick', label: 'A quick win',   hint: 'Two hours of build',      test: function (i) { return i.blocks <= 1; } },
    { id: 'job',   label: 'A normal job',  hint: 'Two to seven blocks',     test: function (i) { return i.blocks > 1 && i.blocks <= 7; } },
    { id: 'full',  label: 'A full system', hint: 'Eight blocks or more',    test: function (i) { return i.blocks > 7; } },
    { id: 'any',   label: 'No idea yet',   hint: 'Show me everything',      test: function () { return true; } }
  ];

  /* Business segments only. Household admin and job hunting sit oddly next
     to a costed automation and are excluded from this view. */
  var SEGMENTS = [
    { id: 'mid',   label: 'A business on Microsoft', hint: '20 people or more' },
    { id: 'micro', label: 'A small team',            hint: 'Two to five of us' },
    { id: 'solo',  label: 'Just me',                 hint: 'Sole trader or freelance' },
    { id: 'trade', label: 'Trades or mobile work',   hint: 'Vans, sites, callouts' },
    { id: 'host',  label: 'Short-stay hosting',      hint: 'One property or many' },
    { id: 'investor', label: 'Property investment',  hint: 'Rent, rates, agents' }
  ];

  var QUESTIONS = [
    { key: 'seg',  ask: 'Who is asking?',            options: SEGMENTS },
    { key: 'fam',  ask: 'What eats the most time?',  options: SYMPTOMS },
    { key: 'size', ask: 'How big a job is it?',      options: SIZES }
  ];

  /* ---------- matching ------------------------------------------------- */

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function famsFor(id) {
    var s = SYMPTOMS.filter(function (x) { return x.id === id; })[0];
    return s ? s.fams : null;
  }

  function sizeTest(id) {
    var s = SIZES.filter(function (x) { return x.id === id; })[0];
    return s ? s.test : function () { return true; };
  }

  function matches() {
    var q = query.trim().toLowerCase();
    return DATA.items.filter(function (i) {
      /* Household and job-hunting items are out of scope for this page. */
      if (i.family === 'HOME') return false;

      if (q) {
        var hay = (i.short + ' ' + i.title + ' ' + i.detail + ' ' + (i.tools || '') +
                   ' ' + (DATA.families[i.family] || {}).name).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
        return true;
      }
      if (showAll) return true;
      if (answers.seg && i.segments.indexOf(answers.seg) === -1) return false;
      if (answers.fam) {
        var fams = famsFor(answers.fam);
        if (fams && fams.indexOf(i.family) === -1) return false;
      }
      if (answers.size && !sizeTest(answers.size)(i)) return false;
      return true;
    }).sort(function (a, b) { return b.hours - a.hours; });
  }

  function answered() {
    return QUESTIONS.filter(function (q) { return answers[q.key]; }).length;
  }

  /* ---------- the gate glyph, which is the answer indicator ------------ */

  function gate(on) {
    return '<svg class="lg-gate' + (on ? ' is-on' : '') + '" viewBox="0 0 34 24" ' +
      'aria-hidden="true" focusable="false">' +
      '<path class="lg-tri" d="M2 3 L20 12 L2 21 L5.6 12 Z"/>' +
      '<circle class="lg-ring" cx="26.5" cy="12" r="3.6" fill="none" stroke-width="2.4"/>' +
      '</svg>';
  }

  /* ---------- render --------------------------------------------------- */

  /* Which answer changed on this pass, so that only its line animates. */
  var justAnswered = null;

  function renderSteps() {
    stepsEl.innerHTML = '';

    QUESTIONS.forEach(function (q, qi) {
      var chosen = answers[q.key];
      var opt = chosen ? q.options.filter(function (o) { return o.id === chosen; })[0] : null;

      var wrap = document.createElement('div');
      wrap.className = 'lg-step' + (chosen ? ' is-done' : '');

      /* Answered questions collapse to one tappable line. Unanswered ones
         past the current point stay shut, so there is only ever one open. */
      if (chosen) {
        /* Only the line that just changed replays its hand-off. Three answers
           redrawing themselves on every tap is noise, and the one that matters
           would be lost in it. */
        var fresh = (justAnswered === q.key) ? ' is-new' : '';
        wrap.innerHTML =
          '<button type="button" class="lg-chosen' + fresh + '" data-edit="' + q.key + '">' +
          gate(true) +
          '<span class="lg-q">' + esc(q.ask) + '</span>' +
          '<span class="lg-a">' + esc(opt ? opt.label : chosen) + '</span>' +
          '<span class="lg-change">Change</span>' +
          '</button>';
      } else if (qi === answered()) {
        var html = '<p class="lg-ask">' + gate(false) + '<span>' + esc(q.ask) + '</span></p>' +
          '<div class="lg-options">';
        q.options.forEach(function (o) {
          html += '<button type="button" class="lg-opt" data-key="' + q.key +
            '" data-val="' + o.id + '">' +
            '<span class="lg-opt-l">' + esc(o.label) + '</span>' +
            (o.hint ? '<span class="lg-opt-h">' + esc(o.hint) + '</span>' : '') +
            '</button>';
        });
        html += '</div>';
        wrap.innerHTML = html;
        wrap.classList.add('is-open');
      } else {
        wrap.innerHTML = '<p class="lg-ask is-waiting">' + gate(false) +
          '<span>' + esc(q.ask) + '</span></p>';
      }
      stepsEl.appendChild(wrap);
    });

    Array.prototype.forEach.call(stepsEl.querySelectorAll('.lg-opt'), function (b) {
      b.addEventListener('click', function () {
        answers[b.getAttribute('data-key')] = b.getAttribute('data-val');
        justAnswered = b.getAttribute('data-key');
        showAll = false;
        query = '';
        if (searchEl) searchEl.value = '';
        commit(b);
      });
    });
    Array.prototype.forEach.call(stepsEl.querySelectorAll('[data-edit]'), function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-edit');
        /* Changing one answer must not reset the ones after it unless they
           are now impossible; the visitor asked to change one thing. */
        answers[k] = null;
        justAnswered = null;
        commit(b);
      });
    });
  }

  /* The count is the only thing on the page that says the three questions did
     something. It used to jump from 72 to 11, which reads as a redraw rather
     than as a result. It now counts down on the same curve as every other
     number on the site, in under half a second, and the answer itself is never
     waiting on it. */
  var shownCount = null;
  var countRaf = null;

  function paintCount(n, total) {
    var suffix = (n === total) ? ' things we build' : ' of ' + total;
    if (REDUCED || shownCount === null) {
      countEl.textContent = n + suffix;
      shownCount = n;
      return;
    }
    var from = shownCount, t0 = null;
    if (countRaf) cancelAnimationFrame(countRaf);
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / 460, 1);
      var e = 1 - Math.pow(1 - p, 3);
      countEl.textContent = Math.round(from + (n - from) * e) + suffix;
      if (p < 1) { countRaf = requestAnimationFrame(frame); return; }
      countEl.textContent = n + suffix;
      shownCount = n;
      countRaf = null;
    }
    countRaf = requestAnimationFrame(frame);
  }

  function renderResults() {
    var found = matches();

    /* Three answers in, and something to show for them. The bar draws its
       line: the only place on this page that says the work is done. It stays
       undrawn on an empty result, because congratulating someone on finding
       nothing is worse than saying nothing at all. */
    var root = document.getElementById('ladder');
    if (root) {
      if (answered() === QUESTIONS.length && found.length) root.setAttribute('data-done', '');
      else root.removeAttribute('data-done');
    }
    var total = DATA.items.filter(function (i) { return i.family !== 'HOME'; }).length;

    if (countEl) paintCount(found.length, total);
    if (liveEl) {
      liveEl.textContent = found.length + ' result' + (found.length === 1 ? '' : 's');
    }

    resultsEl.innerHTML = '';

    if (!found.length) {
      resultsEl.innerHTML = '<p class="lg-none">Nothing matches that combination. ' +
        'Widen an answer, or describe the process in two sentences and we will tell ' +
        'you straight whether it is worth building.</p>' +
        '<p class="lg-none"><a class="btn" href="/talk/"><span>Describe it instead</span></a></p>';
      return;
    }

    /* Until all three are answered, show a preview rather than a wall. */
    var full = showAll || query || answered() === QUESTIONS.length;
    var list = full ? found : found.slice(0, 4);

    list.forEach(function (item) {
      var d = document.createElement('details');
      d.className = 'lg-item';
      d.innerHTML =
        '<summary>' +
          '<span class="lg-it">' + esc(item.short) + '</span>' +
          '<span class="lg-ih"><b>~' + item.hours + '</b> h/mo</span>' +
          '<span class="lg-ib">' + item.blocks + ' block' + (item.blocks > 1 ? 's' : '') + '</span>' +
        '</summary>' +
        '<div class="lg-body">' +
          '<p class="lg-full">' + esc(item.title) + '</p>' +
          '<p>' + esc(item.detail) + '</p>' +
          (item.tools ? '<p class="lg-tools">Typically built with ' + esc(item.tools) + '</p>' : '') +
          '<p class="lg-est">The hours are our estimate, made before we have seen your ' +
          'business. We measure the real figure on the call, and the price follows from ' +
          'it rather than from this page.</p>' +
        '</div>';
      resultsEl.appendChild(d);
    });

    if (!full && found.length > list.length) {
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'lg-more';
      more.textContent = 'Show the other ' + (found.length - list.length);
      more.addEventListener('click', function () { showAll = true; commit(more); });
      resultsEl.appendChild(more);
    }

    if (!REDUCED) {
      requestAnimationFrame(function () { resultsEl.classList.add('in'); });
    } else {
      resultsEl.classList.add('in');
    }
  }

  /* ---------- state ---------------------------------------------------- */

  function toUrl() {
    var p = new URLSearchParams();
    if (answers.seg) p.set('who', answers.seg);
    if (answers.fam) p.set('what', answers.fam);
    if (answers.size) p.set('size', answers.size);
    if (query) p.set('q', query);
    if (showAll) p.set('all', '1');
    var qs = p.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  function fromUrl() {
    var p = new URLSearchParams(location.search);
    var seg = p.get('who'), fam = p.get('what'), size = p.get('size');
    if (seg && SEGMENTS.some(function (o) { return o.id === seg; })) answers.seg = seg;
    if (fam && SYMPTOMS.some(function (o) { return o.id === fam; })) answers.fam = fam;
    if (size && SIZES.some(function (o) { return o.id === size; })) answers.size = size;
    query = p.get('q') || '';
    showAll = p.get('all') === '1';
    if (searchEl && query) searchEl.value = query;
  }

  /* Re-render, then put the answer where the thumb already is. */
  function commit(trigger) {
    resultsEl.classList.remove('in');
    renderSteps();
    renderResults();
    toUrl();

    if (trigger && !REDUCED) {
      /* The old tree's worst failure was a tap whose result landed 998px
         below the fold. Scroll the results into view unless they already
         are, and keep the ladder visible above them. */
      var r = resultsEl.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight * 0.75) {
        resultsEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
    /* Move focus to the first open option, or to the results if we are done. */
    var next = stepsEl.querySelector('.lg-step.is-open .lg-opt');
    if (next) next.focus({ preventScroll: true });
  }

  function wireSearch() {
    if (!searchEl) return;
    var t;
    searchEl.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        query = searchEl.value;
        showAll = false;
        renderResults();
        toUrl();
      }, 160);
    });
  }

  function wireReset() {
    var b = document.getElementById('ladderReset');
    if (!b) return;
    b.addEventListener('click', function () {
      answers = { seg: null, fam: null, size: null };
      query = ''; showAll = false;
      if (searchEl) searchEl.value = '';
      commit(b);
      root.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  function wireAll() {
    var b = document.getElementById('ladderAll');
    if (!b) return;
    b.addEventListener('click', function () {
      showAll = true; query = '';
      if (searchEl) searchEl.value = '';
      commit(b);
    });
  }

  fetch('/assets/data/solutions.json', { credentials: 'omit' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (json) {
      DATA = json;
      var fb = document.getElementById('ladderFallback');
      if (fb) fb.hidden = true;
      fromUrl();
      renderSteps();
      renderResults();
      wireSearch();
      wireReset();
      wireAll();
      root.setAttribute('data-ready', '');
    })
    .catch(function () {
      var fb = document.getElementById('ladderFallback');
      if (fb) fb.hidden = false;
      root.hidden = true;
    });
})();
