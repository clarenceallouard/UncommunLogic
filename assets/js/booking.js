/* ==========================================================================
   Uncommun Logic — booking
   The Google Calendar appointment schedule is injected only when a URL is
   configured, and only if that URL is on calendar.google.com. An unset or
   foreign URL leaves the direct-contact panel in place rather than an empty
   frame. Matches the frame-src directive in the page policy.
   ========================================================================== */

(function () {
  'use strict';

  var slot = document.getElementById('bookingSlot');
  var fallback = document.getElementById('bookingFallback');
  if (!slot) return;

  var C = window.UL || {};
  var raw = (C.bookingUrl || '').trim();
  if (!raw) return;

  var url;
  try { url = new URL(raw); } catch (e) { return; }
  if (url.protocol !== 'https:' || url.hostname !== 'calendar.google.com') return;

  /* Google serves the embeddable form of the schedule when gv=true. */
  if (url.searchParams.get('gv') !== 'true') url.searchParams.set('gv', 'true');

  var frame = document.createElement('iframe');
  frame.src = url.toString();
  frame.className = 'booking-frame';
  frame.title = 'Book a one-hour call with Uncommun Logic';
  frame.setAttribute('loading', 'lazy');
  frame.setAttribute('referrerpolicy', 'no-referrer');
  frame.width = '100%';
  frame.height = '700';

  slot.appendChild(frame);
  slot.hidden = false;
  if (fallback) {
    var note = fallback.querySelector('[data-booking-note]');
    if (note) note.hidden = false;
    fallback.classList.add('is-secondary');
  }

  var link = document.getElementById('bookingLink');
  if (link) {
    link.href = (C.bookingLinkUrl || raw);
    link.hidden = false;
  }
})();
