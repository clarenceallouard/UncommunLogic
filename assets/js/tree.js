/* ==========================================================================
   Uncommun Logic — the offer, as a tree
   One trunk, eleven branches, seventy-eight leaves. One branch open at a
   time, because eleven columns of leaves is a spreadsheet, not a map.
   The buttons are real buttons. The curves are drawn behind them and carry
   no information the buttons do not already carry, so losing the SVG loses
   nothing.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.getElementById('tree');
  if (!root) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var branchesEl = document.getElementById('branches');
  var leavesEl = document.getElementById('leaves');
  var linksEl = document.getElementById('treeLinks');
  var chipsEl = document.getElementById('segChips');
  var trunkCount = document.getElementById('trunkCount');
  var countEl = document.getElementById('solCount');
  var hoursEl = document.getElementById('solHours');
  var famEl = document.getElementById('solFams');
  var panel = document.getElementById('panel');
  var scrim = document.getElementById('scrim');

  var DATA = null;
  var seg = 'all';
  var openFamily = null;
  var openLeaf = null;
  var lastLeafTrigger = null;

  var SVG = 'http://www.w3.org/2000/svg';

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function sizeOf(item) { return item.blocks <= 1 ? 1 : item.blocks <= 7 ? 2 : 3; }

  function itemsOf(key) {
    return DATA.items
      .filter(function (i) { return i.family === key; })
      .sort(function (a, b) { return a.blocks - b.blocks; });
  }

  function visible(item) {
    return seg === 'all' || item.segments.indexOf(seg) !== -1;
  }

  /* ---------- the eleven branches ---------------------------------- */

  function gateGlyph() {
    return '<svg class="bg" viewBox="0 0 34 24" aria-hidden="true" focusable="false">' +
      '<path class="tri" d="M2 3 L20 12 L2 21 L5.6 12 Z"/>' +
      '<circle class="ring" cx="26.5" cy="12" r="3.6" fill="none" stroke-width="2.4"/>' +
      '</svg>';
  }

  function buildBranches() {
    branchesEl.innerHTML = '';
    Object.keys(DATA.families).forEach(function (key) {
      var fam = DATA.families[key];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'branch veil';
      b.setAttribute('data-family', key);
      b.setAttribute('aria-expanded', 'false');
      b.setAttribute('aria-controls', 'leaves');
      b.innerHTML = gateGlyph() +
        '<span class="bt">' + esc(fam.name) + '</span>' +
        '<span class="bn"><span data-count-of="' + key + '">' +
        itemsOf(key).length + '</span></span>';
      b.addEventListener('click', function () { toggleBranch(key, b); });
      branchesEl.appendChild(b);
    });
  }

  function toggleBranch(key, btn) {
    openFamily = openFamily === key ? null : key;
    closeLeaf();
    paintBranches();
    renderLeaves();
  }

  function paintBranches() {
    Array.prototype.forEach.call(branchesEl.children, function (b) {
      var key = b.getAttribute('data-family');
      var shown = itemsOf(key).filter(visible).length;
      b.setAttribute('aria-expanded', String(openFamily === key));
      b.classList.toggle('dim', shown === 0);
      var n = b.querySelector('[data-count-of]');
      if (n) n.textContent = String(shown);
    });
  }

  /* ---------- the leaves of the open branch ------------------------ */

  function renderLeaves() {
    leavesEl.classList.remove('in');
    leavesEl.innerHTML = '';

    if (!openFamily) {
      var p = document.createElement('p');
      p.className = 'leaf-empty';
      p.textContent = 'Pick a branch. Its leaves are the things we build there, '
        + 'smallest first, each one sized in two-hour blocks.';
      leavesEl.appendChild(p);
      drawLinks();
      return;
    }

    var fam = DATA.families[openFamily];
    var all = itemsOf(openFamily);
    var shown = all.filter(visible);

    var head = document.createElement('div');
    head.className = 'leaves-head';
    head.innerHTML = '<h3>' + esc(fam.name) + '</h3>' +
      '<span>' + shown.length + ' of ' + all.length + ' shown</span>';
    leavesEl.appendChild(head);

    var note = document.createElement('p');
    note.className = 'leaves-note';
    note.textContent = fam.note;
    leavesEl.appendChild(note);

    if (!shown.length) {
      var none = document.createElement('p');
      none.className = 'leaf-empty';
      none.textContent = 'Nothing in this branch fits that kind of business. '
        + 'Widen the filter, or bring us the process anyway.';
      leavesEl.appendChild(none);
      drawLinks();
      return;
    }

    shown.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'leaf veil';
      b.setAttribute('data-code', item.code);
      b.setAttribute('data-size', String(sizeOf(item)));
      b.setAttribute('aria-expanded', 'false');
      b.setAttribute('aria-controls', 'panel');
      b.innerHTML =
        '<span class="lc">' + esc(item.code) + '</span>' +
        '<span class="lt">' + esc(item.short) + '</span>' +
        '<span class="lh">~' + item.hours + ' h/mo</span>' +
        '<span class="lw" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '<span class="vh">, ' + item.blocks + ' two-hour block' +
        (item.blocks > 1 ? 's' : '') + ', about ' + item.hours +
        ' hours back a month</span>';
      b.addEventListener('click', function () { showLeaf(item, b); });
      leavesEl.appendChild(b);
    });

    /* let the browser lay it out before the stagger starts */
    requestAnimationFrame(function () {
      leavesEl.classList.add('in');
      drawLinks();
    });
  }

  /* ---------- the curves ------------------------------------------- */

  /* Purely decorative. Drawn from the open branch to each leaf, in the
     tree's own coordinate space, and redrawn on resize or scroll-driven
     reflow. Hidden below 64rem, where the two panes stack. */
  function drawLinks() {
    if (!linksEl) return;
    linksEl.innerHTML = '';
    if (REDUCED || window.innerWidth <= 1024 || !openFamily) return;

    var btn = branchesEl.querySelector('.branch[aria-expanded="true"]');
    var leaves = leavesEl.querySelectorAll('.leaf');
    if (!btn || !leaves.length) return;

    var box = root.getBoundingClientRect();
    linksEl.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    linksEl.setAttribute('preserveAspectRatio', 'none');

    var b = btn.getBoundingClientRect();
    var x1 = b.right - box.left + 2;
    var y1 = Math.round(b.top + b.height / 2 - box.top);

    /* Collect the leaf anchors first, so the spine knows how far it runs. */
    var anchors = [];
    Array.prototype.forEach.call(leaves, function (leaf) {
      var r = leaf.getBoundingClientRect();
      anchors.push({
        x: r.left - box.left - 2,
        y: Math.round(r.top + r.height / 2 - box.top)
      });
    });

    var leafX = anchors[0].x;
    var spineX = Math.round(x1 + (leafX - x1) * 0.42);
    var ys = anchors.map(function (a) { return a.y; });
    var top = Math.min.apply(null, ys.concat([y1]));
    var bottom = Math.max.apply(null, ys.concat([y1]));

    function add(d, delay) {
      var path = document.createElementNS(SVG, 'path');
      path.setAttribute('d', d);
      linksEl.appendChild(path);
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.style.transition =
        'stroke-dashoffset .8s cubic-bezier(.16,1,.3,1) ' + delay + 's';
      requestAnimationFrame(function () { path.style.strokeDashoffset = '0'; });
      return path;
    }

    var R = 10;

    /* 1. the stub out of the open branch */
    add('M' + x1 + ',' + y1 + ' L' + (spineX - R) + ',' + y1, 0);

    /* 2. the spine, drawn from the branch outwards in both directions */
    if (bottom - y1 > R) {
      add('M' + spineX + ',' + (y1 + R * 0) + ' L' + spineX + ',' + (bottom - R), 0.18);
    }
    if (y1 - top > R) {
      add('M' + spineX + ',' + y1 + ' L' + spineX + ',' + (top + R), 0.18);
    }

    /* 3. one elbow per leaf, staggered so the comb fills in downwards */
    anchors.forEach(function (a, i) {
      var d;
      if (Math.abs(a.y - y1) < 2) {
        d = 'M' + spineX + ',' + a.y + ' L' + a.x + ',' + a.y;
      } else {
        var dir = a.y > y1 ? 1 : -1;
        d = 'M' + spineX + ',' + (a.y - R * dir) +
            ' Q' + spineX + ',' + a.y + ' ' + (spineX + R) + ',' + a.y +
            ' L' + a.x + ',' + a.y;
      }
      var el = add(d, 0.3 + i * 0.03);
      el.setAttribute('data-leaf', String(i));
    });

    /* Hovering a leaf lights the branch it hangs from. */
    Array.prototype.forEach.call(leaves, function (leaf, i) {
      function on() {
        var pth = linksEl.querySelector('[data-leaf="' + i + '"]');
        if (pth) pth.classList.add('hot');
      }
      function off() {
        var pth = linksEl.querySelector('[data-leaf="' + i + '"]');
        if (pth) pth.classList.remove('hot');
      }
      leaf.addEventListener('pointerenter', on);
      leaf.addEventListener('pointerleave', off);
      leaf.addEventListener('focus', on);
      leaf.addEventListener('blur', off);
    });

    /* the corner where the stub meets the spine */
    var firstDown = bottom > y1;
    if (firstDown || top < y1) {
      add('M' + (spineX - R) + ',' + y1 + ' Q' + spineX + ',' + y1 + ' ' +
          spineX + ',' + (y1 + (firstDown ? R : -R)), 0.12);
    }
  }

  /* ---------- the filters ----------------------------------------- */

  function buildChips() {
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
        buildChips();
        paintBranches();
        renderLeaves();
        paintTotals();
      });
      chipsEl.appendChild(b);
    });
  }

  function paintTotals() {
    var shown = DATA.items.filter(visible);
    var fams = {};
    shown.forEach(function (i) { fams[i.family] = 1; });
    if (countEl) countEl.textContent = String(shown.length);
    if (famEl) famEl.textContent = String(Object.keys(fams).length);
    if (hoursEl) {
      hoursEl.textContent = String(shown.reduce(function (a, b) { return a + b.hours; }, 0));
    }
    if (trunkCount) trunkCount.textContent = String(shown.length);
  }

  /* ---------- the leaf detail ------------------------------------- */

  function closeLeaf() {
    openLeaf = null;
    if (panel) panel.classList.remove('is-open');
    if (scrim) scrim.classList.remove('is-on');
    Array.prototype.forEach.call(document.querySelectorAll('.leaf'), function (l) {
      l.setAttribute('aria-expanded', 'false');
    });
  }

  function showLeaf(item, trigger) {
    if (openLeaf === item.code) {
      closeLeaf();
      if (lastLeafTrigger) lastLeafTrigger.focus({ preventScroll: true });
      return;
    }
    openLeaf = item.code;
    lastLeafTrigger = trigger;

    Array.prototype.forEach.call(document.querySelectorAll('.leaf'), function (l) {
      l.setAttribute('aria-expanded', String(l.getAttribute('data-code') === item.code));
    });

    var tags = item.segments.map(function (k) {
      return '<span class="ptag">' + esc(DATA.segments[k] || k) + '</span>';
    }).join('');

    document.getElementById('panelBody').innerHTML =
      '<span class="pcode">' + esc(item.code) + '</span>' +
      '<h3>' + esc(item.title) + '</h3>' +
      '<p class="pd">' + esc(item.detail) + '</p>' +
      '<div class="pgrid">' +
        '<div><b>' + item.blocks + '</b><span>Two-hour build block' +
          (item.blocks > 1 ? 's' : '') + '</span></div>' +
        '<div><b>~' + item.hours + '</b><span>Hours back per month, estimated</span></div>' +
      '</div>' +
      '<div class="ptags">' + tags + '</div>' +
      (item.tools ? '<p class="ptools">Typically built with ' + esc(item.tools) + '</p>' : '') +
      '<p class="ptools">Hours back are an estimate until we measure them with you. ' +
      'The price is set after the return is calculated, not before.</p>' +
      '<div class="pcta"><a class="btn btn-ghost" href="/book/"><span>Book the hour</span>' +
      '<svg class="gate" viewBox="0 0 24 18" aria-hidden="true" focusable="false">' +
      '<path d="M0 0 L16 9 L0 18 L3.2 9 Z" fill="currentColor"/>' +
      '<circle cx="20" cy="9" r="2.6" fill="none" stroke="currentColor" stroke-width="1.9"/>' +
      '</svg></a></div>';

    panel.classList.add('is-open');
    if (scrim) scrim.classList.add('is-on');
    var close = document.getElementById('panelClose');
    if (close) close.focus({ preventScroll: true });
  }

  function wire() {
    var close = document.getElementById('panelClose');
    if (close) {
      close.addEventListener('click', function () {
        closeLeaf();
        if (lastLeafTrigger) lastLeafTrigger.focus({ preventScroll: true });
      });
    }
    if (scrim) scrim.addEventListener('click', closeLeaf);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (openLeaf) { closeLeaf(); if (lastLeafTrigger) lastLeafTrigger.focus({ preventScroll: true }); }
      else if (openFamily) { openFamily = null; paintBranches(); renderLeaves(); }
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(drawLinks, 160);
    });
  }

  fetch('/assets/data/solutions.json', { credentials: 'omit' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (json) {
      DATA = json;
      /* The static list has done its job for crawlers and for no-JS. */
      var fb = document.getElementById('treeFallback');
      if (fb) fb.hidden = true;
      buildBranches();
      buildChips();
      /* Open the first branch straight away. A visitor should not have to
         guess that the left column is clickable, and an empty right column
         teaches them nothing. */
      openFamily = Object.keys(DATA.families)[0];
      paintBranches();
      paintTotals();
      renderLeaves();
      wire();
    })
    .catch(function () {
      var C = window.UL || {};
      leavesEl.innerHTML = '<p class="lead">The catalogue could not load. ' +
        'Email <a class="link" href="mailto:' + (C.email || '') + '">' +
        (C.email || 'us') + '</a> and we will send it to you.</p>';
    });
})();
