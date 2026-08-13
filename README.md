# PDKS Time Calculator

A Chrome and Firefox extension that reads ARGEPORTAL PDKS records and displays a working-hours dashboard in the browser toolbar popup.

> [ARGEPORTAL](https://sektorsoft.com/argeportal-teknopark-bilgi-yonetim-sistemi-yazilimi.html) is a management system used by technopark companies. This extension only works with ARGEPORTAL portals.

## Features

- Live time worked today and remaining time for the 9-hour daily target
- Weekly and monthly totals with an 11-hour daily cap for weekly calculations
- Estimated exit time for the daily or weekly target
- Tomorrow planner with an adjustable target exit time
- Thursday-to-Friday planning based on the live weekly remainder
- Session-total and first-to-last calculation modes
- Automatic leave detection and manual leave overrides
- Out-of-office time support
- Cached snapshots when ARGEPORTAL is not the active tab
- Configurable ARGEPORTAL address
- Turkish and English interfaces

## Installation

### Browser stores

- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/pdks-time-calculator/)
- [Chrome Web Store](https://chromewebstore.google.com/detail/pdks-time-calculator/lfndjhccealnhplglfbfhbjfcabllmfc)

### Unpacked Chrome / Arc build

1. Download and extract the latest Chrome ZIP from [Releases](../../releases/latest).
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the extracted directory.

## Usage

1. Open the extension and select **Settings**.
2. Save your organization's ARGEPORTAL address.
3. Press **Refresh**.
   - If ARGEPORTAL is not open, the saved address is opened in a new tab.
   - If the active tab has an authenticated ARGEPORTAL session, PDKS data is fetched and calculated.
4. If the portal requires sign-in, complete it and refresh the extension again.

### Leave and OOO

- **Leave:** Previous weekdays below the configured work threshold are detected automatically. A manual edit disables automatic detection for the current week.
- **OOO:** Time worked outside the office can be entered as `H:MM` (for example `1:30`) and is included in the weekly target.

### Planning

On Monday through Wednesday, the planner calculates the next day's required check-in from the selected exit time and desired daily hours. On Thursday, it uses the live weekly remainder to calculate Friday's required duration and check-in time. Each additional minute worked on Thursday moves Friday's required check-in one minute later for a fixed exit time.

## Development

### Requirements

- Node.js 20+

### Setup

```bash
npm install
```

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start WXT Chrome development mode |
| `npm run dev:firefox` | Start WXT Firefox development mode |
| `npm run build` | Build Chrome MV3 into `.output/chrome-mv3/` |
| `npm run build:firefox` | Build Firefox MV2 into `.output/firefox-mv2/` |
| `npm run zip` | Create the Chrome store ZIP |
| `npm run zip:firefox` | Create the Firefox package and source ZIP |
| `npm test` | Run unit tests |
| `npm run typecheck` | Generate WXT types and run TypeScript checks |

### Architecture

```text
popup/App.tsx
  ├─ requests a fresh parse from the active tab
  ├─ falls back to the cached browser.storage.local snapshot
  └─ renders live calculations and planning controls

content/index.ts
  └─ registers the on-demand parser message handler

lib/parser.ts
  ├─ opens the PDKS panel and selects the current month
  └─ reads and normalizes portal work records

lib/calc.ts
  └─ computes daily, weekly, leave, OOO and exit-time values
```

Important directories:

```text
src/entrypoints/popup/  Popup application
src/entrypoints/content/ On-demand content script
src/components/         React UI components
src/lib/                Parser, calculations, storage and utilities
src/locales/            Turkish and English strings
tests/                  Calculation and time utility tests
```

### Versioning and releases

The version is defined in `package.json`. A GitHub Release tag must match it exactly with a `v` prefix, for example:

```text
package.json: 1.6.0
release tag:  v1.6.0
```

Publishing a GitHub Release runs `.github/workflows/release.yml`, attaches Chrome/Firefox artifacts to the release, and submits both existing store listings for review. The workflow can also retry only Chrome or only Firefox through `workflow_dispatch`.

## Credits

Based on the bookmarklet originally developed by [burakdemirtas-jtf](https://github.com/burakdemirtas-jtf/show-week-working-hours).
