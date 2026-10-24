# Changelog — Bubble & Scatter Chart (formerly Asymmetric Matrix)

All notable changes to Bubble & Scatter Chart are documented here. Up to 1.0.1.0 the visual was called Asymmetric
Matrix; it keeps the same ID, so reports made with it keep working.

## [1.1.0.0] — 2026-10-24

### Changed
- **New name: Bubble & Scatter Chart** (formerly Asymmetric Matrix), and a full rewrite. Same visual ID; every 1.0
  format setting keeps its name, so saved reports open with their settings.
- **Clicking a bubble filters by that point** (`Ctrl` adds or removes; clicking the only selected bubble again
  clears). In 1.0 a click on a point selected its whole zone. Clicking a zone background still selects every bubble
  in the zone, and a legend item selects its group.
- **The lower half defaults to quadrants**: the upper dividers continue below the Y line. Choose
  Lower zones → Lower half → One zone for the 1.0 look.
- **Bubbles default to one colour.** Choose Bubbles → Colour by → Each category for the 1.0 look.
- **Axis titles are on by default**, showing the field names.
- **Data labels and axis titles are free** (Pro in 1.0). Data labels avoid overlapping automatically.
- **Bubble area is proportional to Size**, relative to the largest value, and bubbles are drawn largest first so
  small ones stay on top.
- The visual reports exactly one rendering start and one finish (or failure) to Power BI per update; repaints after a
  click, a bookmark or the licence resolving raise none.

### Added
- **Legend** field: colour the bubbles by group, with an optional share of each group (by points or by Size), which
  switches to the share inside the selection or the selected zone.
- **Y line and divider 1 at the average or the median**, recalculated as the report is filtered.
- **Lower half layouts**: Same dividers as above (quadrants), One zone, or Own dividers (Pro).
- **Colour by** legend, one colour, each category or zone; **fx conditional formatting** on bubble colour; bubble
  border; opacity.
- **Log scale** on X and Y. With a value at or below 0 the axis is drawn linear and, while editing, a note says so.
- **Model number format**: axes, tooltips and the zone table use the measure's format string in the report's
  language; Axes → Decimals overrides the axis decimals.
- **Zone table (Pro)**: legend group × zone, as % of row, % of column, points or sum of Size, to the right of or
  below the chart. Click a cell, a zone header or a row to filter.
- **Trend line (Pro)**: least squares, with R²; drawn as a curve on log axes.
- **Style templates**: Classic, Four quadrants, Minimal, Soft and Dark background.
- **Setup tips** while editing: templates, "Quadrants at the average" and "Try Pro" buttons. Hide them with ✕ or in
  Format → Style template → Show setup tips.
- **Start screen** with the steps, a line naming the Pro features, and links to the guide, the product page and the video.
- **On-object formatting**, **12 languages** (English, Spanish, Portuguese (Brazil and Portugal), French, German,
  Italian, Dutch, Polish, Japanese, Chinese (Simplified), Korean), axis font, plot background, gridline colour,
  zone label colour.
- Bookmarks restore the selection; "No data for the current filters" when a filter leaves nothing to draw.

### Pro
- Own lower dividers, zone table, trend line, zone counts and fixed axis range. Fixed axis range now keeps the widest
  range seen since the page opened and resets only when the X or Y fields change.
- **Pro preview**: without a licence, while editing only, Pro settings that are turned on are drawn under a
  "Pro preview" watermark. Reading view, Publish to Web and export show the free result, with no watermark.

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
