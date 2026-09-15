# Changelog — Asymmetric Matrix

## [1.0.1.0] — 2026-09-15

### Fixed
- **Pro never unlocked for a paying customer.** The licence check compared `spIdentifier` with
  `asymmetric-matrix-tcviz`, the offer id. The Pro plan is `pro`, and the Licensing API returns the full
  Service ID (`tino_callarisa.asymmetric-matrix-tcviz.pro`). It now accepts either, and the Warning
  (payment grace period) state.
- **No purchase path.** Power BI's `notifyFeatureBlocked` (English / Spanish) and licence icon are now
  raised when a Pro option is used without a licence, only once the licence has resolved and never
  where licences cannot be checked.
- **Pro options were hidden** from the Format Pane for free users. They are always visible now, labelled
  "(Pro)".
- **Keyboard focus was declared but not implemented.** Zones are focusable: Tab / arrow keys, Enter or
  Space to select, Escape to clear, Shift+F10 for the context menu, with screen reader labels.

### Added
- Pro preview: while editing a report without a licence, Pro options render under a "Pro preview"
  watermark. In reading view the free result is shown.
- High contrast mode support.
- Landing page lists the Pro plan features.

### Changed
- The chart is built with DOM APIs instead of an HTML string (`innerHTML`).
- `powerbi-visuals-tools` 7.2.1; ESLint with `eslint-plugin-powerbi-visuals`; `npm audit` clean.

## [1.0.0.0] — 2026-08 — Initial release

### Added
- Scatter plot with configurable asymmetric zones
- 1 horizontal Y-reference line (configurable value, color, style: solid / dashed / dotted)
- Up to 4 independent vertical dividers above the Y-ref (upper half)
- Zone labels, background colors and opacity per zone (upper and lower)
- Category field for color grouping of data points
- Bubble size field — maps a measure to point radius
- Tooltips field well — up to 10 extra fields shown on hover
- Cross-filter on zone click: selects all points in the zone and filters other visuals (toggle to deselect)
- Visual feedback on zone selection: selected zone at full opacity, rest dimmed to 25%
- Gridlines, tick size, tick color, tick decimal precision
- Landing page shown when no data fields are added

### Pro features (require AppSource license)
- Up to 4 independent vertical dividers below the Y-ref (lower asymmetry)
- Axis titles for X and Y axes, with configurable font size
- Fixed axis range — axis domain expands but never shrinks during cross-filtering
- Data labels displayed above each point
- Zone count cards — badge showing the number of points per zone
