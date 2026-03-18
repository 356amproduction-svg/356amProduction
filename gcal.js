// gcal.js — Google Calendar availability integration
// ─────────────────────────────────────────────────────────────────────
// SETUP (do this once):
//
// 1. Go to https://console.cloud.google.com
//    → Create a project → Enable "Google Calendar API"
//    → Credentials → Create API Key
//    → Restrict it: Application restrictions → HTTP referrers
//      Add: https://356amproduction-svg.github.io/*
//
// 2. Make your calendar public:
//    Google Calendar → Settings (gear) → your calendar name
//    → "Access permissions for events" → check "Make available to public"
//
// 3. Find your Calendar ID:
//    Same settings page → "Integrate calendar" section → copy Calendar ID
//    (looks like: yourname@gmail.com  or  abc123xyz@group.calendar.google.com)
//
// 4. Paste both below and deploy.
// ─────────────────────────────────────────────────────────────────────

const GCAL_API_KEY    = 'AIzaSyDIK-WNS7ymgiL3OCqGIwAhq4qLIW-i8I0';
const GCAL_CALENDAR_ID = 'faithwithsnappr@gmail.com';  // e.g. faith@gmail.com

// ── Cache: "YYYY-MM" → Set of busy "YYYY-MM-DD" strings ──────────────
const _cache = {};

// Exposed globally so the calendar renderer can read it
window.busyDates     = new Set();
window.gcalReady     = false;
window.gcalEnabled   = GCAL_API_KEY !== 'YOUR_API_KEY_HERE';

/**
 * Fetch busy dates for a given year/month from Google Calendar freebusy API.
 * Results are cached so navigating back/forward doesn't re-fetch.
 */
window.gcalFetchMonth = async function (year, month) {
  if (!window.gcalEnabled) return;   // not configured yet — skip silently

  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  if (_cache[key]) {
    window.busyDates = _cache[key];
    return;
  }

  const timeMin = new Date(year, month, 1).toISOString();
  const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  try {
    // Use freebusy endpoint — returns ONLY time ranges, no event titles
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/freeBusy?key=${GCAL_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeMin,
          timeMax,
          items: [{ id: GCAL_CALENDAR_ID }]
        })
      }
    );

    if (!res.ok) throw new Error(`Calendar API ${res.status}`);
    const data = await res.json();

    const busy = new Set();
    const busyRanges = data?.calendars?.[GCAL_CALENDAR_ID]?.busy || [];

    busyRanges.forEach(({ start, end }) => {
      // Mark every calendar date covered by this busy range
      const s = new Date(start);
      const e = new Date(end);
      const cursor = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      const endDay = new Date(e.getFullYear(), e.getMonth(), e.getDate());
      while (cursor <= endDay) {
        busy.add(toDateStr(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    _cache[key] = busy;
    window.busyDates = busy;
    window.gcalReady = true;

  } catch (err) {
    console.warn('[356am] Google Calendar fetch failed:', err.message);
    // Graceful fallback — calendar renders normally without availability markers
    _cache[key] = new Set();
    window.busyDates = new Set();
  }
};

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
