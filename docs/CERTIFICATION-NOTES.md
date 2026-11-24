# Certification notes — Bubble & Scatter Chart 1.2.0.0 (formerly Asymmetric Matrix)

Short version to paste into Partner Center: `docs/CERTIFICATION-NOTES-SHORT.txt` (2,484 characters counting each
newline as CRLF; the field truncates at 2,500 without warning and is cleared on every resubmission).

```
Bubble & Scatter Chart 1.2.0.0 (formerly Asymmetric Matrix) - GUID asymmetricMatrixTCVIZ
Repo, branch certification: https://github.com/tinocallarisa-web/asymmetric-matrix/tree/certification
Docs: https://tinocallarisa-web.github.io/asymmetric-matrix/support.html
Video: https://www.youtube.com/watch?v=5esHnUDLUok

WHY THIS SUBMISSION
Replaces 1.1.0.0. Same GUID; nothing removed or renamed. New:
seriesColors, legend.order, accessibility card, general.formatString (dynamic format
strings), 6 Pro collection styles + free Report theme in style.template, text that
scales with the viewport. Render events 1:1 unchanged.

PRO PREVIEW
Without a licence, IN EDIT MODE ONLY, Pro settings turned on (own lower dividers, zone
table, trend line, zone counts, fixed axes, collection styles) render under the "Pro
preview" watermark that names them. Reading view, before the licence resolves and where
licences cannot be read: free result (a Pro style draws as Classic), no watermark.

TESTING - FREE (no plan)
1. "Bubble Scatter - sample.pbix": click a bubble, the native table filters; Ctrl adds;
zone click: its points. Bookmarks, right-click, Tab/arrows/Enter/Escape.
2. Series colours card (needs Legend + Colour by = Auto): change a group colour; bubbles,
legend, zone table, tooltip follow. Change style: it stays.
3. Legend > Order: Alphabetical, By size.
4. Style template > Report theme: theme colours, no watermark.
5. Accessibility > High contrast On: high contrast; Minimum text size 12.
Shrink the visual: text scales down.
6. Edit mode, tips bar: "Pro styles > Aurora" (visual >= 560 px wide) or "Try Pro > Zone
table": drawn under watermark, Power BI licence notice, Upgrade bar ~10 s later. Reading
view: Classic, no table. Turn off: notices clear.

TESTING - PRO (plan "bubble-scatter-pro" or "pro")
Own dividers, zone table, trend line, zone counts, fixed axes, the 6 styles: no
watermark, no notice.

PERSISTPROPERTIES
Only on a tips-bar click and once when the template changes in the format pane (clears
the settings templates define, never seriesColors). Never in the selection callback.

PRIVACY
No network, telemetry, cookies or storage. privileges: []. No innerHTML in src/.
Start-screen links open only on click via host.launchUrl.

LICENSING
IVisualLicenseManager only. Pro if Service ID ends in ".bubble-scatter-pro" or ".pro",
state Active or Warning. Never blocks render; failure = Free. No licensing UI of its own.
```

## Links

| | |
|---|---|
| GUID | `asymmetricMatrixTCVIZ` (unchanged since 1.0.0.0) |
| Repository, certification branch | https://github.com/tinocallarisa-web/asymmetric-matrix/tree/certification |
| Support | https://tinocallarisa-web.github.io/asymmetric-matrix/support.html |
| Privacy | https://tinocallarisa-web.github.io/asymmetric-matrix/privacy.html |
| Terms | https://tinocallarisa-web.github.io/asymmetric-matrix/terms.html |
| Changelog | https://tinocallarisa-web.github.io/asymmetric-matrix/changelog.html |
| Video | https://www.youtube.com/watch?v=5esHnUDLUok |

---

## Why this submission

1.1.0.0 is published. 1.2.0.0 adds colours per legend group, legend order, the TCViz collection styles (Pro), a free
Report theme style, an Accessibility card, text that scales with the viewport and dynamic format strings, and moves Pro
to a new, cheaper AppSource plan. The GUID does not change; saved reports keep working.

### Compatibility with 1.1

No data role, object or property was removed or renamed; the Format pane only changes order. Additions:

- New object `seriesColors` (`fill`). The card is built by the visual (one slice per legend group, selector of the
  group's first row via `withCategory` on Legend), only with a Legend field and `dataPoints.colorBy` = `auto`; up to
  100 groups are listed. Chosen colours are read from the Legend column's `objects` (or the first category column's).
- `legend.order` (`data`, `alpha`, `size`), visible only with a Legend field. `legend.shareBy` is now visible only
  while `legend.showShare` is on.
- New object `accessibility`: `highContrast` (`auto`, `on`), `focusColor`, `focusWidth` (1–6), `minTextSize` (6–24).
- `general.formatString` with `type: { formatting: { formatString: true } }`: per-row dynamic format strings are read
  from `objects[i].general.formatString` for tooltips, and for the axes when every row shares one.
- `style.template` gains `report` (free) and `boardroom`, `ledger`, `editorial`, `signal`, `aurora`, `terrace` (Pro).
  A 1.1 report keeps its template; Classic stays the default.
- Text sizes scale with the viewport below about 760 × 440 px (down to 60 %), never below 8 px (or the requested size
  if smaller) nor below `accessibility.minTextSize`.

Rendering events are unchanged: one `renderingStarted` and one `renderingFinished` / `renderingFailed` per
`update()`; repaints (licence, click, bookmark) go through `redraw()` and raise none.

---

## Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Scatter and bubble chart, Size as bubble area, up to 30,000 rows | ✅ | ✅ |
| Colour by legend / one colour / each category / zone, fx, border, opacity | ✅ | ✅ |
| Series colours (one colour per legend group), legend order | ✅ | ✅ |
| Data labels with collision avoidance, axis titles | ✅ | ✅ |
| Y line at fixed / average / median; up to 4 upper dividers (divider 1 fixed / average / median) | ✅ | ✅ |
| Lower half: same dividers as above (quadrants) or one zone | ✅ | ✅ |
| Log scale X / Y, model number format, dynamic format strings, tick decimals, legend with share of each group | ✅ | ✅ |
| Report theme style and the five templates (Classic, Four quadrants, Minimal, Soft, Dark background) | ✅ | ✅ |
| Accessibility card, text that scales with the visual | ✅ | ✅ |
| Setup tips, start screen, on-object formatting, 12 languages | ✅ | ✅ |
| Cross-filter, bookmarks, highlight, context menu, keyboard, high contrast, report page tooltips | ✅ | ✅ |
| Own lower dividers (asymmetric zones) | ❌ | ✅ |
| Zone table (legend group × zone) | ❌ | ✅ |
| Trend line with R² | ❌ | ✅ |
| Zone counts | ❌ | ✅ |
| Fixed axis range | ❌ | ✅ |
| Six collection styles (Boardroom, Ledger, Editorial, Signal, Aurora, Terrace) | ❌ | ✅ |

The free tier never blocks rendering. Without a licence and outside edit mode, Pro settings are simply not applied
(own lower dividers fall back to the quadrants; a collection style is drawn as Classic).

## Pro preview

`preview = !licensed && editing && licence resolved && !serviceUnavailable`. In that state only, the Pro settings the
author has set in `metadata.objects` (including a collection style in `style.template`) are drawn, under the "Pro
preview" watermark shared by all TCViz visuals (DOM, `textContent`), which names them. Free features never carry a
watermark. Reading view (`viewMode` 0), before the licence resolves, and where it cannot be read
(`isLicenseUnsupportedEnv`, `isLicenseInfoAvailable === false`: Publish to Web, embed, export) render the free result
with no watermark.

## Licensing

- Official `IVisualLicenseManager` only (`host.licenseManager`); no external server, no licensing UI of its own.
- Two Pro plans are accepted (`PLAN_IDS` in `src/licenseManager.ts`): the new `bubble-scatter-pro` (USD 1.99/month or
  19/year) and the earlier `pro`, so licences already bought keep Pro. Pro when a plan's `spIdentifier` equals one of
  them or ends in `.<plan>` (full Service ID, e.g. `tino_callarisa.asymmetric-matrix-tcviz.bubble-scatter-pro`), state
  Active (1) or Warning (2).
- `getAvailableServicePlans()` once, from the constructor; the result triggers a `redraw()` (no rendering events).
- Any failure resolves to Free and is logged to the console; it never invents a tier.
- Purchase path: `notifyFeatureBlocked` naming the Pro features in use (localized), then `notifyLicenseRequired(General)`
  about 10.5 s later so the banner does not replace it; cleared when the Pro settings are turned off. Not raised before
  the licence resolves, for a licensed user, or where licences cannot be read. The timer is cancelled in `destroy()`.

## persistProperties

Called only:

1. From a click in the setup tips bar (style buttons, Pro style buttons, "Quadrants at the average", the "Try Pro"
   buttons, ✕).
2. Once, inside `update()`, when the `style.template` value differs from the previous update while editing: it removes
   the colour/style properties defined by the templates (never the line geometry, never `seriesColors`) so the chosen
   style shows.

Series colours are written by Power BI from the Format pane, not by the visual. Never from `registerOnSelectCallback`,
a bubble/zone click or any repaint, so bookmarks are not overwritten.

## Privacy & network access

- No `fetch`, `XMLHttpRequest`, WebSocket, cookies, `localStorage` or `sessionStorage`. `privileges` is `[]`.
- No `innerHTML`: SVG and HTML are built with `createElementNS` / `createElement`, `setAttribute` and `textContent`.
- Start-screen links (support page, product page, video) have no `href` and open only on click or Enter/Space through
  `host.launchUrl`.
- Data processed: Category, Legend, X axis, Y axis, Size, Tooltips (up to 10).

## Accessibility and localization

- Zones are focusable (`tabindex`, `role="button"`, `aria-pressed`, `aria-label` with label and point count): Tab /
  arrows, Enter / Space, Escape, Shift+F10 or Menu key for the context menu. The zone table is a real `<table>` with
  `th scope`, and its cells are focusable.
- High contrast: `colorPalette.isHighContrast` → foreground / background / selection colours throughout;
  `accessibility.highContrast = on` forces a high-contrast rendering without a Windows high-contrast theme.
- Focus ring colour and width from the Accessibility card (in high contrast, the theme's selection colour).
- Texts: 12 locales; texts drawn by the visual come from a table in the bundle (Desktop only translates keys present
  in capabilities.json).

## Testing instructions

Sample report: **Bubble Scatter - sample.pbix**, built on `BubbleScatter_Clientes` (400 customers, 4 channels). Fields:
Category = customer, Legend = channel, X = total sales, Y = margin % (a DIVIDE measure), Size = orders. A native table
beside the chart shows customer rows, to see the cross-filter.

### Free tier (no plan)

1. Remove the fields: the start screen shows the steps and links (they open only on click).
2. Restore them. Click a bubble: the table shows that customer. Ctrl+click a second: both. Click the only selected
   bubble again: cleared. Click a zone background: all its customers. Click a legend item: that channel.
3. Bookmark with a selection, clear, apply it: restored. Select rows in the native table: bubbles outside dim.
4. Keyboard: Tab into the chart, arrows between zones, Enter selects, Escape clears, Shift+F10 opens the menu.
5. Format → Series colours (Legend filled, Bubbles → Colour by = Auto): change a channel's colour. Bubbles, legend,
   zone table (Pro preview) and tooltip use it. Switch Style template: the chosen colour stays. Colour by = One colour:
   the card disappears.
6. Legend → Order → Alphabetical, then By size: legend (and zone table rows) reorder.
7. Style template → Report theme: theme colours, no watermark. Classic and the other four templates: no watermark.
8. Accessibility → High contrast → On: high-contrast rendering. Focus outline colour / width: the keyboard focus ring
   changes. Minimum text size = 12: small texts grow. Resize the visual small: texts shrink, the first and last X ticks
   are not cut.
9. A measure with a dynamic format string on X: the tooltip shows each row in its own format.
10. Edit mode, tips bar: "Pro styles → Aurora" (visual at least ~560 px wide) or "Try Pro → Zone table": drawn under the
    "Pro preview" watermark naming it; Power BI shows its licence banner, then the Upgrade bar about 10 s later.
    Reading view: Classic, no table, no watermark. Turn them off: watermark and notices clear.
11. Format mode: click a bubble or a zone: on-object options; no selection. allowInteractions false: no selection.
12. A filter that leaves no customer: "No data for the current filters".

### Pro tier (same package, plan "bubble-scatter-pro" or the earlier "pro")

Lower zones → Lower half → Own dividers, zone table, trend line with R², zone counts, fixed axis range and the six
collection styles all render with no watermark and no notification.

## Build

powerbi-visuals-tools, API 5.11.1, TypeScript, ESLint with `eslint-plugin-powerbi-visuals`. Run the lint and
`npm audit` and record the result before packaging.

---

# History — notes of 1.1.0.0


## Why this submission

1.0.1.0 is published and certified, with a soft failure noted by the review: **the visual did not filter out on a
point click** — clicking a point selected its whole zone. 1.1.0.0 is a full rewrite repositioned as a scatter and
bubble chart with zones, under the new display name *Bubble & Scatter Chart*. The GUID does not change, so it is an
update of the same offer and saved reports keep working.

### The soft failure: a bubble click now filters by that point

`onClick()` resolves the click target in this order:

| Target | Selection sent to `selectionManager.select()` |
|---|---|
| A bubble (`[data-idx]`) | That point's `ISelectionId`. `Ctrl`/`Meta` toggles it in a multi-selection. Clicking the only selected point again clears. |
| A legend item (`[data-series]`) | Every point of that group (`Ctrl` adds). |
| A zone background (`[data-zone]`) | Every point in the zone — all identities, not a representative one. Clicking the same zone again clears. |
| A zone table cell / zone header / row (Pro) | The points of that group in that zone / the zone / the group. |
| Anything else | `selectionManager.clear()`. |

Each point's identity is built with `withCategory()` on Category and, when present, Legend, so a selection filters
the other visuals by exactly those rows. `allowInteractions === false` disables selection (and the root gets
`pointer-events: none`). In format mode a click chooses the element to format and does not select.

### Rendering events 1:1

`update()` raises `renderingStarted`, runs the whole update synchronously, then raises `renderingFinished`, or
`renderingFailed` from the catch. Every other repaint — the licence resolving, a click, `registerOnSelectCallback`
(bookmarks, selection pane) — calls `redraw()`, which draws from the last state and raises no event. This is the fix
for the 1200.1.2 rejection seen on another visual of the publisher, applied from the start here.

### Compatibility with 1.0

No data role, object or property was removed or renamed. Additions:

- Data role `legend` (Grouping).
- `referenceLines.yRefMode`; `upperZones.line1Mode`, `labelColor`; `lowerZones.layout`, `labelColor`.
- `axes.logX`, `logY`, `showTitles`, `titleColor`, `plotBackground`, `gridColor`, `fontFamily`.
- `dataPoints.colorBy`, `fill` (fx: ConstantOrRule, wildcard selector, `altConstantValueSelector: null` so a fixed
  colour is stored at visual level), `borderColor`, `borderWidth`, `labelSize`, `labelColor`.
- `cards.fontSize`, `showPercent`.
- New objects `legend`, `trendLine`, `zoneTable`, `style`.
- `displayNameKey` on every role, card and property; 12 `stringResources`.

A 1.0 report with no `lowerZones.layout` saved is read as "Same dividers as above", or as "Own dividers" if it saved
lower dividers (`lowerZones.lineCount > 0`) — the Pro feature it already was in 1.0.

Capabilities: `supportsHighlight`, `supportsSynchronizingFilterState`, `supportsLandingPage`, `supportsEmptyDataView`,
`supportsKeyboardFocus`, `supportsMultiVisualSelection`, `supportsOnObjectFormatting`,
`enablePointerEventsFormatMode`, `tooltips` (default and canvas, i.e. report page tooltips), `privileges: []`.
`dataReductionAlgorithm`: top 30,000.

---

## Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Scatter and bubble chart, Size as bubble area, up to 30,000 rows | ✅ | ✅ |
| Colour by legend / one colour / each category / zone, fx, border, opacity | ✅ | ✅ |
| Data labels with collision avoidance, axis titles | ✅ | ✅ |
| Y line at fixed / average / median; up to 4 upper dividers (divider 1 fixed / average / median) | ✅ | ✅ |
| Lower half: same dividers as above (quadrants) or one zone | ✅ | ✅ |
| Log scale X / Y, model number format, tick decimals, legend with share of each group | ✅ | ✅ |
| Templates, setup tips, start screen, on-object formatting, 12 languages | ✅ | ✅ |
| Cross-filter, bookmarks, highlight, context menu, keyboard, high contrast, report page tooltips | ✅ | ✅ |
| Own lower dividers (asymmetric zones) | ❌ | ✅ |
| Zone table (legend group × zone) | ❌ | ✅ |
| Trend line with R² | ❌ | ✅ |
| Zone counts | ❌ | ✅ |
| Fixed axis range | ❌ | ✅ |

The free tier never blocks rendering. Without a licence and outside edit mode, Pro settings are simply not applied
(own lower dividers fall back to the quadrants).

## Pro preview

`preview = !licensed && editing && licence resolved && !serviceUnavailable`. In that state only, the Pro settings the
author has set in `metadata.objects` are drawn, and a "Pro preview" watermark (DOM, `textContent`, `aria-hidden`)
names them. Free features never carry a watermark. Reading view (`viewMode` 0), before the licence resolves, and where
it cannot be read (`isLicenseUnsupportedEnv`, `isLicenseInfoAvailable === false`: Publish to Web, embed, export) render
the free result with no watermark.

## Licensing

- Official `IVisualLicenseManager` only (`host.licenseManager`); no external server, no licensing UI of its own.
- `getAvailableServicePlans()` once, from the constructor; the result triggers a `redraw()` (no rendering events).
- Pro when a plan's `spIdentifier` equals `pro` or ends in `.pro` (full Service ID
  `tino_callarisa.asymmetric-matrix-tcviz.pro`), state Active (1) or Warning (2).
- Any failure resolves to Free and is logged to the console; it never invents a tier.
- Purchase path: `notifyFeatureBlocked` naming the Pro features in use (localized), then `notifyLicenseRequired(General)`
  about 10.5 s later so the banner does not replace it; cleared when the Pro settings are turned off. Not raised before
  the licence resolves, for a licensed user, or where licences cannot be read. The timer is cancelled in `destroy()`.

## persistProperties

Called only:

1. From a click in the setup tips bar (template buttons, "Quadrants at the average", the "Try Pro" buttons, ✕).
2. Once, inside `update()`, when the `style.template` value differs from the previous update while editing: it removes
   the colour/style properties defined by the templates (never the line geometry) so the chosen template shows.

Never from `registerOnSelectCallback`, a bubble/zone click or any repaint, so bookmarks are not overwritten.

## Privacy & network access

- No `fetch`, `XMLHttpRequest`, WebSocket, cookies, `localStorage` or `sessionStorage`. `privileges` is `[]`.
- No `innerHTML`: SVG and HTML are built with `createElementNS` / `createElement`, `setAttribute` and `textContent`.
- Start-screen links (support page, product page, video) have no `href` and open only on click or Enter/Space through
  `host.launchUrl`.
- Data processed: Category, Legend, X axis, Y axis, Size, Tooltips (up to 10).

## Accessibility and localization

- Zones are focusable (`tabindex`, `role="button"`, `aria-pressed`, `aria-label` with label and point count): Tab /
  arrows, Enter / Space, Escape, Shift+F10 or Menu key for the context menu. The zone table is a real `<table>` with
  `th scope`, and its cells are focusable.
- High contrast: `colorPalette.isHighContrast` → foreground / background / selection colours throughout.
- Texts: 12 locales; texts drawn by the visual come from a table in the bundle (Desktop only translates keys present
  in capabilities.json).

## Testing instructions

Sample report: **Bubble Scatter - sample.pbix**, built on `BubbleScatter_Clientes` (400 customers, 4 channels). Fields:
Category = customer, Legend = channel, X = total sales, Y = margin % (a DIVIDE measure), Size = orders. A native table
beside the chart shows customer rows, to see the cross-filter.

### Free tier (no plan)

1. Remove the fields: the start screen shows the steps and links (they open only on click).
2. Restore them. Click a bubble: the table shows that customer. Ctrl+click a second: both. Click the only selected
   bubble again: cleared.
3. Click a zone background: all its customers. Click it again or an empty area: cleared. Click a legend item: that
   channel.
4. Save a bookmark with a selection, clear, apply it: the selection is restored.
5. Select rows in the native table: bubbles outside the highlight dim.
6. Keyboard: Tab into the chart, arrows between zones, Enter selects, Escape clears, Shift+F10 opens the menu.
7. Edit mode: the tips bar at the bottom. "Quadrants at the average": Y line and divider 1 at the average, four
   quadrants. "Try Pro > Zone table": the table renders under the "Pro preview" watermark; Power BI shows its licence
   banner, then the Upgrade bar about 10 s later. Turn it off: watermark and notices clear.
8. Reading view with the zone table still on: no table, no watermark.
9. Format → Style template → Dark background: colours change (one persistProperties). Format mode: click a bubble or a
   zone: on-object options; no selection.
10. Axes → Log scale X: the X axis becomes logarithmic (all sales are positive).
11. A filter that leaves no customer: "No data for the current filters".

### Pro tier (same package, plan "pro")

Lower zones → Lower half → Own dividers (2 dividers), zone table, trend line with R², zone counts and fixed axis range
(change a slicer: the axes keep their range) all render with no watermark and no notification.

## Build

powerbi-visuals-tools, API 5.11.1, TypeScript, ESLint with `eslint-plugin-powerbi-visuals`. Run the lint and
`npm audit` and record the result before packaging.

---

# History — notes of 1.0.1.0

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
