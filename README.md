# PDKS Time Calculator — Browser Extension

A browser extension for **Chrome** and **Firefox** that displays a working-hours summary directly on the **PDKS Giriş-Çıkış Bilgileri Kartı** panel inside ARGEPORTAL.

> [ARGEPORTAL](https://sektorsoft.com/argeportal-teknopark-bilgi-yonetim-sistemi-yazilimi.html) is a management system used by technopark companies. This extension only works on ARGEPORTAL portals.

---

## Features

- **Today** — time worked since the first check-in of the day
- **Today Remaining** — time left to reach the daily 9-hour target
- **This Week** — total hours for completed days since Monday (excluding today)
- **Today + This Week** — running weekly total
- **Week Remaining** — time left to reach the weekly target
- **36 / 27 / 18-hour thresholds** — remaining hours for alternative weekly targets
- **Estimated exit time** — when you can leave today to hit the daily or weekly target
- **Automatic leave detection** — weekdays with no check-in are treated as leave days
- **OOO support** — out-of-office time is added to the weekly target
- **Previous weeks** — navigate back through past weeks using the ◀ / ▶ buttons

---

## Installation

> The extension is loaded as an unpacked extension — it is not published to any store.

### Chrome / Arc

1. Download the latest `pdks-extension-x.x.x-chrome.zip` from [Releases](../../releases/latest) and unzip it
2. Go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the unzipped folder

### Firefox

1. Download the latest `.xpi` file from [Releases](../../releases/latest)
2. Go to `about:addons`
3. Click the gear icon and select **Install Add-on From File**, then select the downloaded `.xpi` file

> Alternatively, drag and drop the `.xpi` file directly into Firefox to install it.

---

## Usage

1. Log in to **ARGEPORTAL**
2. Click the extension icon in the browser toolbar — a summary panel will appear on the page

### Leave / OOO inputs

At the bottom of the panel:

- **Leave (days):** weekdays with no check-in are filled in automatically. Editing manually disables auto-detection for that week.
- **OOO (H:MM):** enter time worked outside the office (e.g. `1:30`). This is added to the weekly target.

### Week navigation

Use the **◀ Prev** / **Next ▶** buttons at the top of the panel to view previous weeks within the current month.

---

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
| `npm run dev` | Start Chrome dev mode with hot reload |
| `npm run dev:firefox` | Start Firefox dev mode |
| `npm run build` | Production build for Chrome → `.output/chrome-mv3/` |
| `npm run build:firefox` | Production build for Firefox → `.output/firefox-mv2/` |
| `npm run zip` | Build + zip Chrome bundle → `.output/pdks-extension-x.x.x-chrome.zip` |
| `npm run zip:firefox` | Build + zip Firefox bundle → `.output/pdks-extension-x.x.x-firefox.zip` |
| `npm test` | Run unit tests |
| `npm run typecheck` | TypeScript type check |

### Bumping the version

The version is defined in **one place** — `wxt.config.ts`:

```ts
manifest: {
  version: '1.3.1',   // ← change this
  ...
}
```

Running `npm run zip` / `npm run zip:firefox` after the change will produce files named after the new version (e.g. `pdks-extension-1.3.1-chrome.zip`).

### Project structure

```
src/
  entrypoints/
    background.ts       service worker — icon animation, content script injection
    content/
      index.tsx         shadow DOM mount point
  components/           React UI components (each paired with a CSS Module)
  hooks/
    useWeekData.ts      core calculation logic
  lib/
    i18n.ts             language detection and string lookup
    time-utils.ts       time math (calculateTime, parseOOO, etc.)
    storage.ts          localStorage wrapper for leave/OOO data
    network.ts          GitHub version check
    dom-watcher.ts      MutationObserver-based waitForElement
  config.ts             portal DOM selectors + all numeric constants (single source of truth)
  locales/
    en.json             English strings
    tr.json             Turkish strings
  types/
    index.ts            shared TypeScript interfaces
public/
  icons/                extension icons copied to output root by WXT
tests/
  utils.test.ts         unit tests for time-utils (51 tests)
wxt.config.ts           WXT config — manifest, version, browser targets
```

---

## Credits

Based on the bookmarklet originally developed by **burakdemirtas-jtf**:
https://github.com/burakdemirtas-jtf/show-week-working-hours
