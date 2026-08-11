# Certification Notes — Asymmetric Matrix v1.0.0.0

## Repository

- **Certification branch:** `certification`
- **GitHub:** https://github.com/tinocallarisa-web/asymmetric-matrix
- **Branch URL:** https://github.com/tinocallarisa-web/asymmetric-matrix/tree/certification

## Web pages (GitHub Pages — active)

- **Support:** https://tinocallarisa-web.github.io/asymmetric-matrix/support.html
- **Privacy:** https://tinocallarisa-web.github.io/asymmetric-matrix/privacy.html
- **Terms:** https://tinocallarisa-web.github.io/asymmetric-matrix/terms.html

## Demo video

https://www.youtube.com/watch?v=6JP75Mn-g2Y

---

## Visual overview

**Asymmetric Matrix** is a scatter plot with configurable asymmetric zone divisions. Unlike a standard 2×2 matrix, the number of vertical dividers above and below the horizontal reference line can be independently configured, creating asymmetric analytical layouts.

---

## Free vs Pro features

| Feature | Free | Pro |
|---|---|---|
| Scatter plot with asymmetric zones | ✅ | ✅ |
| Horizontal Y-reference line (value, color, style) | ✅ | ✅ |
| Up to 4 vertical dividers above Y-ref | ✅ | ✅ |
| 1 zone below Y-ref | ✅ | ✅ |
| Zone labels, colors, opacity (upper & lower) | ✅ | ✅ |
| Category color grouping | ✅ | ✅ |
| Bubble size field | ✅ | ✅ |
| Tooltips (up to 10 fields) | ✅ | ✅ |
| Cross-filter on zone click (toggle) | ✅ | ✅ |
| Gridlines, tick size & color, tick decimals | ✅ | ✅ |
| Up to 4 vertical dividers below Y-ref (lower asymmetry) | ❌ | ✅ |
| Axis titles (X & Y) with configurable font size | ❌ | ✅ |
| Fixed axis range (stable during cross-filtering) | ❌ | ✅ |
| Data labels on points | ❌ | ✅ |
| Zone count cards | ❌ | ✅ |

---

## License validation

- Uses the official `IVisualLicenseManager` API (`host.licenseManager`) provided by Power BI — no external server involved.
- The `SP_IDENTIFIER` is `asymmetric-matrix-tcviz` and must match exactly the Plan ID configured in Partner Center.
- License resolution is **asynchronous and deferred**: called via `setTimeout(..., 0)` after the first successful render with data. The visual renders fully in Free mode immediately; Pro features unlock in the same session once the license resolves.
- The `isPro` flag only transitions Free → Pro. It never resets during a session (unless the visual is destroyed and recreated by Power BI).
- If `getAvailableServicePlans()` rejects or throws, the visual stays in Free mode silently. No error is surfaced to the user.

---

## Privacy & network access

- **No external HTTP requests.** The visual does not call any URL, API, or telemetry endpoint.
- **No local file access.** The visual does not read from or write to the local file system.
- **No cookies or persistent storage.** All state lives in memory during the session. Settings are persisted inside the `.pbix` file via the standard Power BI format pane mechanism.
- Data fields processed: Category (text/dimension), X Value (numeric measure), Y Value (numeric measure), Size (numeric measure, optional), Tooltips (up to 10 numeric/text measures, optional).

---

## Certification compliance checklist

- [x] `supportsHighlight: true` — cross-highlight from other visuals dims non-highlighted points to 25% opacity
- [x] `supportsSynchronizingFilterState: true`
- [x] `supportsLandingPage: true` — renders a placeholder SVG when no data fields are mapped
- [x] `supportsKeyboardFocus: true`
- [x] `supportsMultiVisualSelection: true`
- [x] Rendering events: `renderingStarted`, `renderingFinished`, `renderingFailed` in all code paths of `update()`
- [x] `isPro` resolved via `licenseManager`, never hardcoded in production build
- [x] No external dependencies (no D3, no CDN scripts)
- [x] Pure SVG rendering via string concatenation and `innerHTML` assignment
- [x] `node_modules/`, `dist/`, `.tmp/` excluded from `certification` branch via `.gitignore`

---

## Testing instructions — Free tier

1. Import the `.pbiviz` file in Power BI Desktop (no AppSource license active).
2. Add the visual to the canvas.
3. Verify the landing page appears with the "Add X Value and Y Value fields" message.
4. Drag numeric fields to X Value and Y Value. Verify points render.
5. Verify zone click selects points and cross-filters other visuals. Click again to deselect.
6. Verify cross-highlight: select items in a slicer — non-matching points dim to ~25%.
7. Open Format Pane → Upper Zones: set lineCount to 2, set line values. Verify 3 upper zones appear.
8. Open Format Pane → Lower Zones: verify `lineCount` option is NOT present (Free tier).
9. Open Format Pane → Axes: verify `xTitle`, `yTitle`, `fixedAxes` options are NOT present.
10. Open Format Pane → Data Points: verify `showLabels` toggle is present but no labels appear when enabled.
11. Open Format Pane → Zone Cards: verify the toggle is present but no cards appear when enabled.

## Testing instructions — Pro tier

1. Import the `_test` build (has `isPro = true` hardcoded) in Power BI Desktop.
2. Repeat steps 3–6 above to confirm Free features still work.
3. Open Format Pane → Lower Zones: verify `lineCount` is now present. Set to 2. Verify 3 lower zones appear independently from upper.
4. Open Format Pane → Axes: verify `xTitle`, `yTitle`, `titleSize`, `fixedAxes` are now present. Set titles and verify they render.
5. Enable `fixedAxes`. Apply a slicer filter. Verify the axis range does not change.
6. Enable `showLabels` in Data Points. Verify labels appear above each point.
7. Enable Zone Cards. Verify count badges appear in the top-left of each zone.
8. Click a zone card — verify it cross-filters the same as clicking the zone background.
