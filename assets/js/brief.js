/* ==========================================================================
   Uncommun Logic — the brief builder
   Composes an email in the visitor's own mail client. Nothing is sent to a
   server, nothing is stored, no third party is contacted. The arithmetic is
   deliberately visible: one stated assumption, no hidden model.
   ========================================================================== */

(function () {
  'use strict';

  var form = document.getElementById('brief');
  if (!form) return;

  /* There is nowhere to submit to. Enter must not navigate. */
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  var WEEKS_PER_MONTH = 4.33;   /* 52 / 12 */
  var AUTOMATABLE = 0.6;        /* stated assumption, not a measurement */

  var hours = document.getElementById('bHours');
  var people = document.getElementById('bPeople');
  var hoursOut = document.getElementById('bHoursOut');
  var peopleOut = document.getElementById('bPeopleOut');
  var estOut = document.getElementById('bEst');
  var send = document.getElementById('bSend');
  var status = document.getElementById('bStatus');

  function estimate() {
    var h = parseFloat(hours.value);
    var p = parseFloat(people.value);
    return Math.round(h * p * WEEKS_PER_MONTH * AUTOMATABLE);
  }

  function sync() {
    hoursOut.textContent = hours.value;
    peopleOut.textContent = people.value;
    estOut.textContent = String(estimate());
  }

  hours.addEventListener('input', sync);
  people.addEventListener('input', sync);
  sync();

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
    var process = value('bProcess');

    if (!process) {
      status.textContent = 'Describe the process first. One or two sentences is enough.';
      document.getElementById('bProcess').focus();
      return;
    }

    var picked = tools();
    var lines = [
      'THE PROCESS',
      process,
      '',
      'THE SHAPE OF IT',
      '- Kind of business: ' + value('bSegment'),
      '- Time it eats now: ' + hours.value + ' hours per person per week',
      '- People it touches: ' + people.value,
      '- Tools already in use: ' + (picked.length ? picked.join(', ') : 'not stated'),
      '',
      'INDICATIVE FIGURE',
      '~' + estimate() + ' hours a month, on the assumption that ' +
        Math.round(AUTOMATABLE * 100) + '% of that time is automatable.',
      'That assumption is mine, not a measurement. Measure it on the call.',
      '',
      'WHAT I WANT NEXT',
      'The one-hour call.'
    ];

    var name = value('bName');
    var company = value('bCompany');
    if (name || company) {
      lines.push('', 'WHO I AM', [name, company].filter(Boolean).join(' — '));
    }

    var subject = 'Brief: ' + process.slice(0, 60).replace(/\s+/g, ' ') +
      (process.length > 60 ? '…' : '');

    var href = 'mailto:' + C.email +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\n'));

    /* mailto: URLs above roughly 1,800 characters are unreliable across mail
       clients. Truncate the process rather than hand over a broken link. */
    if (href.length > 1800) {
      lines[1] = process.slice(0, 600) + '…';
      href = 'mailto:' + C.email +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));
      status.textContent = 'Long brief shortened to fit an email link. ' +
        'Paste the rest into the message before sending.';
    } else {
      status.textContent = 'Opening your mail app. Nothing was sent from this page.';
    }

    window.location.href = href;
  });
})();
