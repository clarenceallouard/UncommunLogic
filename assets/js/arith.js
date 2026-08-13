/* ==========================================================================
   Uncommun Logic — the number
   Two published figures, three inputs the visitor controls, and arithmetic
   with nothing hidden in it.

     hours a week  x  people  x  share automatable  x  46 weeks  x  hourly cost

   The hourly cost is derived from the ABS release of 13 August 2026: average
   weekly ordinary time earnings for full-time adults, $2,083.70, over a
   38-hour week. That is earnings only. Superannuation, leave loading, payroll
   tax and the rest sit on top of it, so the real cost of an hour is higher
   than the figure this page uses. Understating it is the safer error.

   Nothing is transmitted. The inputs never leave the page.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.getElementById('calc');
  if (!root) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- the published figures ------------------------------------ */

  var AWOTE = 2083.70;   /* ABS 6302.0, May 2026, seasonally adjusted */
  var FT_WEEK = 38;      /* ordinary hours in a full-time week */
  var WEEKS = 46;        /* 52, less four weeks of leave and the holidays */
  /* Rounded to the cent, and the hours are rounded before they are multiplied
     by it, because the page prints both numbers and invites the reader to do
     the multiplication themselves. Carrying full precision internally would
     make our total disagree with our own working by a dollar. */
  var RATE = Math.round((AWOTE / FT_WEEK) * 100) / 100;   /* $54.83 an hour */

  /* ---------- the odometer --------------------------------------------- */

  /* One drum per digit, ten faces each, rotated on X. Always forward: from 9
     the drum climbs to 10 rather than snapping back to 0. */
  function Odo(el) {
    this.el = el;
    this.pattern = '';
    this.digits = [];
  }

  Odo.prototype.build = function (text, pattern) {
    this.el.textContent = '';
    this.digits = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch >= '0' && ch <= '9') {
        /* cell clips, drum turns inside it */
        var d = document.createElement('span');
        d.className = 'odo-d';
        var drum = document.createElement('span');
        drum.className = 'odo-r';
        for (var f = 0; f < 10; f++) {
          var face = document.createElement('i');
          face.textContent = String(f);
          /* the one the reduced-motion rule leaves visible */
          if (f === (+ch)) face.className = 'is-shown';
          drum.appendChild(face);
        }
        drum.style.transitionDelay = (this.digits.length * 0.028).toFixed(3) + 's';
        d.appendChild(drum);
        this.el.appendChild(d);
        this.digits.push({ el: drum, n: 0 });
      } else {
        var c = document.createElement('span');
        c.className = 'odo-c';
        c.textContent = ch;
        this.el.appendChild(c);
      }
    }
    this.pattern = pattern;
  };

  Odo.prototype.set = function (text) {
    if (REDUCED) { this.el.textContent = text; return; }
    var pattern = text.replace(/[0-9]/g, '#');
    if (pattern !== this.pattern) this.build(text, pattern);
    var k = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch < '0' || ch > '9') continue;
      var cell = this.digits[k++];
      if (!cell) break;
      var forward = ((+ch) - (cell.n % 10) + 10) % 10;
      cell.n += forward;
      cell.el.style.setProperty('--n', String(cell.n));
      /* Kept in step so that a visitor who turns reduced motion on after the
         page loaded reads the current digit rather than a stale one. */
      var faces = cell.el.children;
      for (var f = 0; f < faces.length; f++) {
        faces[f].className = (f === (+ch)) ? 'is-shown' : '';
      }
    }
  };

  /* ---------- the inputs ----------------------------------------------- */

  var hoursEl = document.getElementById('cHours');
  var peopleEl = document.getElementById('cPeople');
  var shareEl = document.getElementById('cShare');
  if (!hoursEl || !peopleEl || !shareEl) return;

  var moneyEl = document.getElementById('calcMoney');
  var srEl = document.getElementById('calcSr');
  var arc = root.querySelector('.calc-arc');
  var odo = moneyEl ? new Odo(moneyEl) : null;

  function out(id) { return document.getElementById(id); }

  function comma(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function read(el) {
    var v = parseFloat(el.value);
    return isFinite(v) ? v : parseFloat(el.getAttribute('value')) || 0;
  }

  var shown = { money: -1 };

  function paint() {
    var h = read(hoursEl), p = read(peopleEl), s = read(shareEl) / 100;

    var hoursWeek = h * p * s;
    var hoursYear = Math.round(hoursWeek * WEEKS);
    var dollars = Math.round(hoursYear * RATE);
    /* A full-time person is 38 hours across the same 46 weeks. */
    var fte = hoursYear / (FT_WEEK * WEEKS);

    /* the values beside each slider */
    var o;
    if ((o = out('cHoursOut'))) o.value = h + (h === 1 ? ' hour' : ' hours');
    if ((o = out('cPeopleOut'))) o.value = p + (p === 1 ? ' person' : ' people');
    if ((o = out('cShareOut'))) o.value = Math.round(s * 100) + '%';

    /* the working, term by term */
    if ((o = out('wHours'))) o.textContent = String(h);
    if ((o = out('wPeople'))) o.textContent = String(p);
    if ((o = out('wShare'))) o.textContent = Math.round(s * 100) + '%';
    if ((o = out('wRate'))) o.textContent = '$' + RATE.toFixed(2);
    if ((o = out('wHoursYear'))) o.textContent = comma(hoursYear) + ' hours';
    if ((o = out('wMoney'))) o.textContent = '$' + comma(dollars) + ' a year';

    /* the headline */
    if (odo && dollars !== shown.money) odo.set('$' + comma(dollars));
    shown.money = dollars;

    if ((o = out('calcHours'))) o.textContent = comma(hoursYear);
    if ((o = out('calcFte'))) o.textContent = (Math.round(fte * 100) / 100).toFixed(2);

    /* the dial reads the one number that is an assumption rather than a
       measurement, which is the share. */
    if (arc) {
      var C = 2 * Math.PI * 27;
      arc.style.strokeDasharray = C.toFixed(1);
      arc.style.strokeDashoffset = (C * (1 - s)).toFixed(1);
    }

    if (srEl) {
      srEl.textContent = '$' + comma(dollars) + ' a year, ' + comma(hoursYear) +
        ' hours a year, at ' + Math.round(s * 100) + ' per cent of ' + h +
        ' hours a week across ' + p + (p === 1 ? ' person.' : ' people.');
    }
  }

  [hoursEl, peopleEl, shareEl].forEach(function (el) {
    el.addEventListener('input', paint);
    el.addEventListener('change', paint);
  });

  paint();
})();
