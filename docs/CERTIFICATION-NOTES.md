# Certification Notes — Asymmetric Matrix v1.0.1.0

The short version to paste into Partner Center is `docs/CERTIFICATION-NOTES-SHORT.txt`; that field
truncates at 2,500 characters without warning.

## Repository

- **GitHub:** https://github.com/tinocallarisa-web/asymmetric-matrix
- **Certification branch:** https://github.com/tinocallarisa-web/asymmetric-matrix/tree/certification

Earlier notes pointed to `github.com/tcviz/asymmetric-matrix` and `tcviz.github.io`, which belong to a
different account. The URLs below are the ones in `pbiviz.json`.

## Web pages (GitHub Pages)

- **Support:** https://tinocallarisa-web.github.io/asymmetric-matrix/support.html
- **Privacy:** https://tinocallarisa-web.github.io/asymmetric-matrix/privacy.html
- **Terms:** https://tinocallarisa-web.github.io/asymmetric-matrix/terms.html

## Demo video

https://www.youtube.com/watch?v=6JP75Mn-g2Y

---

## What changed in 1.0.1.0

1.0.0.3 is published. Its source had never been committed; it now is (commit `88ef5f6`, "fuente de la
1.0.0.3 publicada"), followed by the 1.0.1.0 release commit.

| Problem in 1.0.0.3 | Fix in 1.0.1.0 |
|---|---|
| `spIdentifier === "asymmetric-matrix-tcviz"` — the offer id, not the plan. Pro never unlocked for a buyer | `matchesPlan()` against Plan ID `pro`, as the full Service ID (`tino_callarisa.asymmetric-matrix-tcviz.pro`) or the Plan ID alone |
| Only `Active` accepted | `Warning` (payment grace period) accepted too |
| `isLicenseUnsupportedEnv` / `isLicenseInfoAvailable` ignored | Honoured: no purchase prompt where a Pro customer cannot be recognised |
| No purchase path: no `notifyFeatureBlocked` / `notifyLicenseRequired` | `notifyFeatureBlocked` (localized en/es, under 500 characters) names what was used, plus `notifyLicenseRequired(General)` |
| Pro options hidden from the Format Pane for free users | All options always visible; paid ones labelled "(Pro)" |
| The whole chart was built as a string and assigned with `innerHTML` | SVG built with `createElementNS`, `setAttribute` and `textContent`. No `innerHTML` anywhere |
| `supportsKeyboardFocus` declared without keyboard support | Zones are focusable (`tabindex`, `role="button"`, `aria-pressed`, `aria-label`); Tab / arrows, Enter / Space, Escape, Shift+F10 |
| No high contrast handling; `allowInteractions` ignored | `colorPalette.isHighContrast` honoured; selection skipped when `allowInteractions` is false |
| No ESLint; `npm audit` warnings | `eslint` script and `eslint-plugin-powerbi-visuals`; `npm run eslint` returns no errors. `powerbi-visuals-tools` 7.2.1 plus `overrides` for `qs` and `uuid`; `npm audit` returns 0 vulnerabilities |

**Pro preview.** Following the publishing guidelines ("use watermarks only for paid features used
without a valid licence"), a free user editing a report, whose licence has resolved, in an environment
that supports licensing, sees Pro options working under a "Pro preview" watermark. In reading view
(`viewMode` 0), before the licence resolves, or where it cannot be read, the free result renders with
no watermark. Free features never carry a watermark.

No data role, no `capabilities.json` property name and no default changed, so existing reports keep
their settings. Only five display names gained "(Pro)".

---

## Free vs Pro features

| Feature | Free | Pro |
|---|---|---|
| Scatter plot with asymmetric zones (up to 30,000 rows) | ✅ | ✅ |
| Horizontal Y-reference line (value, color, style) | ✅ | ✅ |
| Up to 4 vertical dividers above Y-ref | ✅ | ✅ |
| 1 zone below Y-ref | ✅ | ✅ |
| Zone labels, colors, opacity (upper & lower) | ✅ | ✅ |
| Category color grouping, bubble size, tooltips (up to 10 fields) | ✅ | ✅ |
| Cross-filter on zone or point click (toggle), highlight, context menu | ✅ | ✅ |
| Gridlines, tick size & color, tick decimals | ✅ | ✅ |
| Keyboard navigation, high contrast, landing page | ✅ | ✅ |
| Up to 4 vertical dividers below Y-ref (lower asymmetry) | ❌ | ✅ |
| Axis titles (X & Y) with configurable font size | ❌ | ✅ |
| Fixed axis range (stable during cross-filtering) | ❌ | ✅ |
| Data labels on points | ❌ | ✅ |
| Zone count cards | ❌ | ✅ |

---

## License validation

- Official `IVisualLicenseManager` only (`host.licenseManager`) — no external server.
- `getAvailableServicePlans()` is requested once, deferred with `setTimeout(..., 0)`, outside the render
  path. It is consumed with `then(ok, err)` (IPromise2).
- Pro when a plan matches `pro` with state Active (1) or Warning (2). On error or unsupported
  environment the visual stays on Free and no purchase prompt is shown.
- The notification is raised only after the licence has resolved.

---

## Privacy & network access

- **No external HTTP requests.** No `fetch`, `XMLHttpRequest` or WebSocket. `privileges` is `[]`.
- **No local file access, no cookies, no local or session storage.** Settings persist inside the `.pbix`
  through the standard Format Pane mechanism.
- Data fields processed: Category, X Value, Y Value, Size (optional), Tooltips (up to 10, optional).

---

## Certification compliance checklist

- [x] `supportsHighlight` — non-highlighted points dim to 25% opacity
- [x] `supportsSynchronizingFilterState`
- [x] `supportsLandingPage` — getting-started page when no fields are mapped
- [x] `supportsKeyboardFocus` — implemented (see above)
- [x] `supportsMultiVisualSelection`
- [x] Rendering events on every path of `update()`; licence request and notification run after the try/catch
- [x] `isPro` resolved via `licenseManager`, never hardcoded in the production build
- [x] No `innerHTML`, `eval`, `Function`, `fetch` or `XMLHttpRequest`
- [x] `npm install`, `pbiviz package`, `npm audit` (0) and `npm run eslint` (0 errors) pass
- [x] `node_modules/`, `dist/`, `.tmp/` in `.gitignore`

Known build warning, not a gap: Format Pane (classic `enumerateObjectInstances` API).

---

## Testing instructions — Free tier (submitted package, no active plan)

1. Add the visual with no fields: the landing page explains the data roles and the Pro plan.
2. Drag numeric fields to X Value and Y Value. Points render.
3. Click a zone or a point: points in that zone are selected and other visuals cross-filter. Click again to deselect.
4. Select items in a slicer: non-matching points dim to ~25%.
5. Format Pane → Upper Zones: set the number of lines to 2 and their values. Three upper zones appear.
6. Keyboard: Tab into the visual, use the arrow keys between zones, Enter selects, Escape clears.
7. In edit mode, Format Pane → Lower Zones → *Number of vertical lines (below) (Pro)* = 2: the lower zones
   render under a "Pro preview" watermark and Power BI raises its licence banner and icon.
8. Same for Axes → titles / fixed range, Data Points → data labels, Zone Cards (Pro) → show.
9. Turn those options off: the watermark and the notification clear.
10. Reading view (Power BI Service): with those options on, the free result shows, with no watermark.

## Testing instructions — Pro tier (same package, active "pro" plan)

1. Lower Zones → 2 lines: three independent lower zones.
2. Axes: titles render; enable Fixed axis range, apply a slicer — the axis range does not shrink.
3. Data Points → Data labels: labels above each point.
4. Zone Cards → Show: count badges in the top-left of each zone; clicking one cross-filters like the zone.
5. No watermark and no licence notification.
