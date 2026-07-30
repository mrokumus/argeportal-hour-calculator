# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Chrome (MV3) + Firefox (MV2) browser extension, built with **WXT** + **React 19** + **TypeScript**, that overlays a working-hours summary panel onto the **PDKS Giriş-Çıkış Bilgileri** page inside ARGEPORTAL (a technopark management portal). It scrapes the portal's own DOM tables — there is no backend API. All state (leave days, OOO, calc mode) lives in the page's `localStorage`.

## Commands

```bash
npm run dev            # Chrome dev mode with hot reload
npm run dev:firefox    # Firefox dev mode
npm run build          # Chrome build → .output/chrome-mv3/
npm run build:firefox  # Firefox build → .output/firefox-mv2/
npm run zip            # Build + zip Chrome → .output/pdks-extension-<ver>-chrome.zip
npm test               # Jest unit tests (tests/**/*.test.ts, node env)
npm run typecheck      # wxt prepare && tsc --noEmit
```

Run a single test: `npx jest -t "calculateTime"` (or `npx jest tests/utils.test.ts`).

CI (`.github/workflows/ci.yml`) runs `npm test`, `npm run typecheck`, and `npm run build` on push/PR to `main`. Match all three before considering a change done.

**Version** lives in `package.json` and is imported into `wxt.config.ts`. Bump it there (the README's claim that it lives in `wxt.config.ts` is outdated).

## Architecture

The UI is a **browser-action popup** (`action.default_popup`). The core insight: "today worked" = *first check-in + now*, and completed days are static within a day — so the page only needs to be parsed **once a day**. That parse is cached as a `Snapshot` in `browser.storage.local`, and the popup recomputes everything from the snapshot + current time, even with the ARGEPORTAL page closed.

Because there's a popup, `action.onClicked` never fires — **there is no `background.ts`** (it was deleted; don't reintroduce icon-on-click logic there).

Data flow on popup open:

1. **`src/entrypoints/popup/App.tsx`** — orchestrator. Loads the cached `Snapshot` + `calcMode` + per-week leave/OOO from storage, then calls `requestParse()` to attempt a fresh parse of the active tab. Computes display values via `computeWeekData` and renders the shared components. Owns `weekOffset`/`calcMode`, shows a "last updated" line + Refresh button, an `ARGEPORTAL bulunamadı` state when the active tab isn't the portal (falls back to cached data), a staleness banner when the snapshot isn't from today, and ticks every 60s so "today" keeps counting while open.

2. **`src/lib/refresh.ts`** — `requestParse()`: injects the parser content script into the active tab via `browser.scripting.executeScript` (`activeTab` grant), then `tabs.sendMessage(PDKS_PARSE)`. Any failure (non-scriptable page, or a page that isn't ARGEPORTAL) comes back as `{ ok: false }`.

3. **`src/entrypoints/content/index.ts`** — a thin, on-demand parser. Registers a single `runtime.onMessage` listener (guarded by a `window` flag against duplicate injection) that runs `parseSnapshot()` and returns the result via the returned Promise (works in Chrome MV3 and Firefox MV2 through the webext polyfill). Renders no UI. `registration: 'runtime'`, so it is *not* auto-injected.

4. **`src/lib/parser.ts`** — `parseSnapshot()` runs *in the page*. Navigates the PDKS menu (`openPdksPanel`) if the grid isn't shown and forces the month dropdown to the current month (`ensureCurrentMonthSelected`) — both click real elements / dispatch `change` events with fixed `setTimeout` delays (`*_DELAY_MS`). Then scrapes the two `div.flexgrid` tables into a serializable `Snapshot`: whole-month per-day totals for **both** calc modes plus today's first check-in (ISO). Returns `{ ok: true, snapshot } | { ok: false, reason }`.

5. **`src/lib/calc.ts`** — `computeWeekData(snapshot, weekOffset, calcMode, leaveData, now)`: **pure**, no DOM. The offline recomputation — auto-detects leave, applies the weekly-target formula, derives today/week totals/exit times from the cached daily totals + `firstRecordISO` vs. `now`. Returns `WeekData` plus a `leaveDataChanged` flag the caller persists.

6. **`src/lib/time-utils.ts`** — pure time math (`calculateTime`, `calculateRemaining`, `capDailyHours`, `parseOOO`, `countValidWorkdays`, week-boundary helpers). Fully unit-tested. Keep new time logic here and cover it in `tests/utils.test.ts`.

**Storage** (`src/lib/storage.ts`) is `browser.storage.local` and therefore **async** — the popup runs on a `chrome-extension://` origin and cannot read the page's `localStorage`. `getLeaveData`/`getCalcMode`/`getSnapshot` all return Promises.

### Config & constants — single source of truth

**`src/config.ts`** holds *all* portal DOM selectors and *all* numeric constants (daily 9h target, 11h daily cap, 5h short-day threshold, refresh interval, delays, storage key prefix). If the ARGEPORTAL DOM changes or a business rule changes, edit `config.ts`, not the call sites. Never hardcode a selector or magic number elsewhere.

### Calculation modes (`CalcMode`)

Two ways to total a day's hours, toggled in the UI and persisted via `saveCalcMode`. Both are scraped whole-month at parse time (see `scrapeSessions` / `scrapeSpan` in `parser.ts`) so the mode can be switched offline without re-parsing:
- **`sessions`** (default) — sums the portal's per-session worked-minutes column (`td:nth-child(6)` of the monthly totals table). Handles multiple in/out pairs per day.
- **`span`** — takes `last punch − first punch` for the day (ignores mid-day gaps), from the raw punch table.

### Business rules baked into the calc

- Weekly target = `validWorkdays × 9h − leaveDays × 9h + OOO`. `validWorkdays` counts only Mon–Fri within both the week *and* the current month, so a week split across a month boundary is targeted correctly.
- A weekday with < 5h and no manual leave entry is auto-detected as a leave day; manually editing leave for a week disables auto-detection for that week (`autoDetected: false`).
- Daily hours are capped at 11h when summing the week total.
- "Today" only counts on the current week and requires a same-day first check-in.
- On **Fridays**, the remaining-to-weekly-target drives the displayed exit time instead of the daily 9h.

### i18n

`src/lib/i18n.ts` — `t(key, params)` with `{param}` interpolation. Language is `tr` if `navigator.language` starts with `tr`, else `en`. Strings live in `src/locales/{en,tr}.json`; `en` is the fallback, so **every key added to `tr.json` must also exist in `en.json`**.

### Components

Each component under `src/components/<Name>/` pairs a `.tsx` with a CSS Module (`.module.css`). Presentational; state flows down from the popup's `App`.

## Gotchas

- **`src/utils.js` is dead code** — a legacy standalone JS copy of the time helpers, tracked but imported nowhere. The live implementation is `src/lib/time-utils.ts` (what the tests import). Don't edit `utils.js` expecting it to take effect.
- The portal DOM is scraped by CSS selector and column position (in the monthly totals table `td:nth-child(3)` = date, `td:nth-child(6)` = duration; in the raw punch table `td:nth-child(6)` = punch datetime). These are brittle to portal changes — selectors live in `config.ts`, scraping in the `scrape*` functions of `parser.ts`.
- Portal interactions rely on fixed `setTimeout` delays rather than event confirmation, so navigation timing is inherently racy; adjust the `*_DELAY_MS` constants if the portal is slow.
- The popup **auto-refreshes on every open** (`App.tsx` calls `requestParse()` on mount). While on the portal this re-navigates the page; off the portal it fails gracefully and falls back to the cached snapshot.
- Parsing can only be verified against a live ARGEPORTAL session (no portal access in CI). `typecheck` + `test` + `build` gate the refactor, but scraping correctness must be checked manually in the browser.
