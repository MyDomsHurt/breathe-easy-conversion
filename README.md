# Breathe-Easy — Conversion Dashboard

Calm interactive view of HubSpot contact velocity and deal association by acquisition stream.

**Live:** https://mydomshurt.github.io/breathe-easy-conversion/

## What’s inside

- **Weekly Contact Flow** — New contacts each week vs how many already have a non–Closed Lost deal. Stream toggles + date range.
- **Stream Performance** — Deal *volume* (count of contacts with a deal) by stream and month. Also raw contact volume + detail table.
- **Base by Stream** — Two donuts + tables: full contact base and the subset that has a deal, filterable by create-date range.

## Data

- Snapshot: **12 Aug 2026**
- Contacts: **11,627** · With a deal (excl. Closed Lost): **4,352**
- Source: full HubSpot export for Breathe-Easyhk (portal 242969280)
- File: `data.js` — only volume fields stored; rates computed on the fly.

## Tech notes

- Static site (HTML + vanilla JS + Plotly + Firebase Auth allowlist)
- Cache-busted assets (`?v=YYYYMMDD`)
- Auth: Google sign-in restricted to allowlist in `auth.js`

## Refreshing data

Replace `data.js` with a new export that follows the same schema (see comments at top of the file). Bump the `?v=` query params in `index.html` when you push.
