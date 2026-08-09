/* ==========================================================================
   Uncommun Logic — the catalogue
   78 buildable systems, 11 families, 8 kinds of business. Rendered from
   /assets/data/solutions.json so the list has one source of truth.
   ========================================================================== */

(function () {
  'use strict';

  var mount = document.getElementById('families');
  if (!mount) return;

  var chipsEl = document.getElementById('segChips');
  var panel = document.getElementById('panel');
  var scrim = document.getElementById('scrim');
  var countEl = document.getElementById('solCount');
  var hoursEl = document.getElementById('solHours');
  var famEl = document.getElementById('solFams');

  var DATA = null;
  var seg = 'all';
  var open = null;
  var lastTrigger = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function sizeOf(item) { return item.blocks <= 1 ? 1 : item.blocks <= 7 ? 2 : 3; }

  function render() {
    var frag = document.createDocumentFragment();

    Object.keys(DATA.families).forEach(function (key) {
      var fam = DATA.families[key];
      var items = DATA.items.filter(function (i) { return i.family === key; })
        .sort(function (a, b) { return a.blocks - b.blocks; });

      var sec = document.createElement('section');
      sec.className = 'family';
      sec.id = 'family-' + key.toLowerCase();
      sec.setAttribute('data-reveal', 'up');

      var head = document.createElement('div');
      head.className = 'family-head';
      head.innerHTML = '<h2>' + esc(fam.name) + '</h2>' +
        '<span class="cnt">' + items.length + ' built here</span>';
      sec.appendChild(head);

      var note = document.createElement('p');
      note.className = 'family-note';
      note.textContent = fam.note;
      sec.appendChild(note);

      var tiles = document.createElement('div');
      tiles.className = 'tiles';

      items.forEach(function (item) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'tile';
        b.setAttribute('data-code', item.code);
        b.setAttribute('data-size', String(sizeOf(item)));
        b.setAttribute('aria-expanded', 'false');
        b.setAttribute('aria-controls', 'panel');
        b.innerHTML =
          '<span class="code mono">' + esc(item.code) + '</span>' +
          '<span class="t">' + esc(item.short) + '</span>' +
          '<span class="w" aria-hidden="true"><i></i><i></i><i></i></span>' +
          '<span class="vh">, ' + item.blocks + ' two-hour block' +
          (item.blocks > 1 ? 's' : '') + '</span>';
        b.addEventListener('click', function () { show(item, b); });
        tiles.appendChild(b);
      });

      sec.appendChild(tiles);
      frag.appendChild(sec);
    });

    mount.innerHTML = '';
    mount.appendChild(frag);
  }

  function chips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = '';
    var entries = [['all', 'Everyone']].concat(
      Object.keys(DATA.segments).map(function (k) { return [k, DATA.segments[k]]; })
    );
    entries.forEach(function (pair) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (pair[0] === 'all' ? ' chip-all' : '');
      b.textContent = pair[1];
      b.setAttribute('aria-pressed', String(seg === pair[0]));
      b.addEventListener('click', function () {
        seg = pair[0];
        chips();
        paint();
      });
      chipsEl.appendChild(b);
    });
  }

  function paint() {
    var n = 0, hours = 0, fams = {};
    Array.prototype.forEach.call(document.querySelectorAll('.tile'), function (t) {
      var item = byCode(t.getAttribute('data-code'));
      var ok = seg === 'all' || item.segments.indexOf(seg) !== -1;
      /* Dimmed tiles stay visible and clickable, so they must not be
         aria-hidden: a focusable element hidden from the accessibility tree
         is a defect, not a filter. */
      t.classList.toggle('dim', !ok);
      if (ok) { n++; hours += item.hours; fams[item.family] = 1; }
    });
    if (countEl) countEl.textContent = String(n);
    if (hoursEl) hoursEl.textContent = String(hours);
    if (famEl) famEl.textContent = String(Object.keys(fams).length);
  }

  function byCode(code) {
    for (var i = 0; i < DATA.items.length; i++) {
      if (DATA.items[i].code === code) return DATA.items[i];
    }
    return null;
  }

  function close() {
    open = null;
    if (panel) panel.classList.remove('is-open');
    if (scrim) scrim.classList.remove('is-on');
    Array.prototype.forEach.call(document.querySelectorAll('.tile'), function (t) {
      t.setAttribute('aria-expanded', 'false');
    });
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  }

  function show(item, trigger) {
    if (open === item.code) { close(); return; }
    open = item.code;
    lastTrigger = trigger;

    Array.prototype.forEach.call(document.querySelectorAll('.tile'), function (t) {
      t.setAttribute('aria-expanded', String(t.getAttribute('data-code') === item.code));
    });

    var tags = item.segments.map(function (s) {
      return '<span class="ptag">' + esc(DATA.segments[s] || s) + '</span>';
    }).join('');

    document.getElementById('panelBody').innerHTML =
      '<span class="pcode">' + esc(item.code) + '</span>' +
      '<h3 id="panelTitle">' + esc(item.title) + '</h3>' +
      '<p class="pd">' + esc(item.detail) + '</p>' +
      '<div class="pgrid">' +
        '<div><b>' + item.blocks + '</b><span>Two-hour build block' + (item.blocks > 1 ? 's' : '') + '</span></div>' +
        '<div><b>~' + item.hours + '</b><span>Hours back per month, estimated</span></div>' +
      '</div>' +
      '<div class="ptags">' + tags + '</div>' +
      (item.tools ? '<p class="ptools">Typically built with ' + esc(item.tools) + '</p>' : '') +
      '<p class="ptools">Hours back are an estimate until we measure them with you. ' +
      'The price is set after the ROI calculation, not before.</p>' +
      '<div class="pcta"><a class="btn btn-ghost" href="/book/"><span>Book the hour</span>' +
      '<svg class="gate" viewBox="0 0 24 18" aria-hidden="true" focusable="false">' +
      '<path d="M0 0 L16 9 L0 18 L3.2 9 Z" fill="currentColor"/>' +
      '<circle cx="20" cy="9" r="2.6" fill="none" stroke="currentColor" stroke-width="1.9"/>' +
      '</svg></a></div>';

    panel.classList.add('is-open');
    if (scrim) scrim.classList.add('is-on');
    var closeBtn = document.getElementById('panelClose');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function wire() {
    var closeBtn = document.getElementById('panelClose');
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (scrim) scrim.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) close();
    });
  }

  function stats() {
    var el = document.getElementById('catalogueTotal');
    if (el) el.textContent = String(DATA.items.length);
  }

  fetch('/assets/data/solutions.json', { credentials: 'omit' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (json) {
      DATA = json;
      render();
      chips();
      paint();
      wire();
      stats();
      /* the reveal engine has already run: opt the new nodes in */
      window.requestAnimationFrame(function () {
        Array.prototype.forEach.call(mount.querySelectorAll('[data-reveal]'), function (n) {
          n.classList.add('in');
        });
      });
    })
    .catch(function () {
      mount.innerHTML = '<p class="lead">The catalogue could not load. ' +
        'Email <a class="link" data-ul="email" href="#">us</a> and we will send it to you.</p>';
      var C = window.UL || {};
      var a = mount.querySelector('[data-ul="email"]');
      if (a && C.email) { a.href = 'mailto:' + C.email; a.textContent = C.email; }
    });
})();
