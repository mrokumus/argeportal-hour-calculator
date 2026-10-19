# Changelog

All notable changes to PDKS Time Calculator are documented here. Versions follow the `package.json` version and the matching `v`-prefixed GitHub Release tag.

## [1.7.0] - 2026-10-20

### Added

- Optional browser notifications when the daily target or the daily cap (including that day's OOO) is reached, with a test notification button. Notification permission is requested only when a notification is enabled.
- Out-of-office time can be assigned to individual days; it raises that day's daily cap and can be adjusted in 15-minute steps with the arrow keys. Today's OOO editor opens from the footer.
- Previous week summary within the current month, showing the counted date range and completion, with incomplete targets highlighted in red.
- Feedback form link in the popup footer.
- Clearer daily and weekly exit times.

### Fixed

- Session breaks are excluded from totals; leave limits are normalized.
- Active session check-ins are rounded up to the next minute, and exact exit times are preserved with conservative duration rounding.
- Weekly completion is validated against the daily cap, midnight and latest-exit limits, and earliest entry is respected.
- Popup layout sizes to its content again.

### Changed

- New `alarms` permission and optional `notifications` permission. The privacy policy describes both.

## [1.6.2] - 2026-10-09

### Added

- Redesigned popup with configurable work rules: daily target, daily cap, short-day threshold, earliest entry, earliest and latest exit, and workdays.
- Public privacy policy.

## [1.6.1] - 2026-08-26

### Changed

- Redesigned the tomorrow planner with clearer controls, 15-minute steppers for daily target and desired exit time, and today's exit information shown first.

### Fixed

- Week calculations use the supplied calculation date.
- Hardened portal date, time and duration parsing; first and last punch detection no longer depends on portal row order.

## [1.6.0] - 2026-08-13

### Added

- Configurable ARGEPORTAL address and more resilient work planning.
- Releases are published to the Chrome Web Store and Firefox Add-ons automatically.

## [1.5.1] - 2026-08-06

### Added

- Redesigned daily and weekly summary cards, color-coded daily segments on the weekly ring, and a Monday–Friday breakdown.
- Configurable daily target and check-in/check-out planning for today and tomorrow; Friday planning uses the remaining weekly target.

### Fixed

- Calculations around day changes, completed sessions, leave-adjusted weekly targets and exit times.

## [1.5.0] - 2026-07-31

### Changed

- Moved from an in-page overlay to a browser-action popup.
- Daily snapshot caching so the popup works with the portal tab closed, with a staleness indicator.
- New dashboard with progress rings and an estimated exit time card.

Earlier versions are listed on the [Releases](https://github.com/mrokumus/argeportal-hour-calculator/releases) page.

[1.7.0]: https://github.com/mrokumus/argeportal-hour-calculator/compare/v1.6.2...v1.7.0
[1.6.2]: https://github.com/mrokumus/argeportal-hour-calculator/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/mrokumus/argeportal-hour-calculator/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/mrokumus/argeportal-hour-calculator/compare/v1.5.1...v1.6.0
[1.5.1]: https://github.com/mrokumus/argeportal-hour-calculator/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/mrokumus/argeportal-hour-calculator/compare/v1.4.0...v1.5.0
