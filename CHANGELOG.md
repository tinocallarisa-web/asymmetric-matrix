# Changelog — Asymmetric Matrix

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
