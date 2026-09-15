# Website Product Page — Asymmetric Matrix

---

## TAB 1: OVERVIEW

### The problem it solves

A standard 2×2 matrix forces you into a symmetric grid: two equal halves above and below the midpoint, two equal halves left and right. But most real business problems are not symmetric. High-risk items might need three tiers of performance distinction, while low-risk items only need two. A classic matrix throws that nuance away.

**Asymmetric Matrix** lets you define a different number of zones above and below the horizontal reference line. Three zones above, two below. Four above, one below. Any combination you need — without custom development.

### How it works

Drop any two numeric measures onto the X and Y axes. Set a horizontal reference value (a target, an average, zero) that splits the chart into upper and lower halves. Then add vertical dividers independently in each half. Each resulting zone gets a label, a background color, and an opacity level. Click any zone to cross-filter the rest of your report.

### Who it is for

- **Strategy and performance teams** that use portfolio or scatter analysis with non-symmetric priority tiers
- **Sales and marketing analysts** tracking performance vs. potential with different segmentation logic above and below a baseline
- **Operations teams** mapping risk vs. effort with asymmetric criticality thresholds
- **Any Power BI report builder** who has wanted a scatter plot where the quadrant logic is not forced to be equal on both sides

### In one glance

- Scatter plot with configurable asymmetric zone divisions
- 1 horizontal reference line + up to 4 vertical dividers above + up to 4 below (Pro)
- Zone labels, colors and opacity per zone
- Cross-filter by clicking any zone
- Bubble size field, tooltips, category color grouping
- Pro tier: lower asymmetry, axis titles, fixed axis range, data labels, zone count cards

---

## TAB 2: FEATURES

### Core (Free)

**Asymmetric upper half**
Add 1 to 4 vertical dividers above the Y-reference line to create 2 to 5 distinct zones. Each zone gets its own label, background color, and opacity — independently of the lower half.

**Horizontal Y-reference line**
Set a numeric threshold that divides the plot into upper and lower halves. Configurable value, color, and line style (solid, dashed, dotted).

**Category color grouping**
Map a dimension field to color-code your data points by group. Each unique category value gets a distinct color from the Power BI color palette.

**Bubble size field**
Map a numeric measure to point radius. Values are normalized so the smallest positive value maps to the minimum radius and the largest to the maximum radius.

**Tooltips (up to 10 fields)**
Add up to 10 extra measures to the Tooltips field well. All appear in the standard Power BI hover tooltip alongside X and Y values.

**Cross-filter on zone click**
Click any zone to select all data points in that zone and cross-filter other visuals in the report. Click the same zone again to deselect (toggle). Clicking outside any zone clears the selection.

**Zone label styling**
Configure font size, background color, and background opacity for zone labels in both halves.

**Gridlines and tick formatting**
Toggle gridlines on/off. Set tick font size, color, and decimal precision (auto or fixed 0–5 decimal places).

### Pro

**Lower zone asymmetry**
Add 1 to 4 independent vertical dividers below the Y-reference line — completely independent of the upper configuration. This is the defining feature of the visual: a 3-zone upper half paired with a 2-zone lower half, for example, is not possible in any standard Power BI matrix visual.

**Axis titles**
Label the X and Y axes with custom text. Font size is configurable. Essential for self-contained charts that don't rely on external legends.

**Fixed axis range**
The axis domain expands as data is seen, but never shrinks during cross-filtering or slicing. Points slide toward the edge of the chart instead of the scale jumping. Recommended for dashboards and presentations where stable spatial positioning matters.

**Data labels**
Display the Category value (or data point label) above each bubble. Best for sparse datasets with fewer than ~30 points.

**Zone count cards**
A count badge in the top-left corner of each zone shows how many data points fall in that zone. Badges are clickable and trigger the same cross-filter behavior as clicking the zone background.

### Free vs Pro table

| Feature | Free | Pro |
|---|---|---|
| Scatter plot with asymmetric zones | ✅ | ✅ |
| Horizontal Y-reference line | ✅ | ✅ |
| Up to 4 vertical dividers above Y-ref | ✅ | ✅ |
| 1 zone below Y-ref | ✅ | ✅ |
| Zone labels, colors, opacity | ✅ | ✅ |
| Category color grouping | ✅ | ✅ |
| Bubble size field | ✅ | ✅ |
| Tooltips (up to 10 fields) | ✅ | ✅ |
| Cross-filter on zone click | ✅ | ✅ |
| Gridlines, tick size & color, tick decimals | ✅ | ✅ |
| Up to 4 vertical dividers below Y-ref | ❌ | ✅ |
| Axis titles (X & Y) | ❌ | ✅ |
| Fixed axis range | ❌ | ✅ |
| Data labels on points | ❌ | ✅ |
| Zone count cards | ❌ | ✅ |

---

## TAB 3: TECHNICAL

### Specifications

- **API version:** Power BI Visuals API 5.11.0
- **Tech stack:** TypeScript, pure SVG (no D3 or external charting libraries)
- **Data points:** up to 30,000 rows (configurable via `dataReductionAlgorithm`)
- **Tooltips fields:** up to 10 extra measures
- **Zone dividers:** 0–4 above, 0–4 below (below requires Pro)

### Field Wells

| Field | Type | Max | Required |
|---|---|---|---|
| Category | Grouping (dimension) | 1 | No |
| X Value | Measure | 1 | Yes |
| Y Value | Measure | 1 | Yes |
| Size | Measure | 1 | No |
| Tooltips | Measure | 10 | No |

### Format Pane sections

- **Reference Lines** — Y ref value, color, style
- **Upper Zones** — line count, line values & colors, zone labels/colors/opacity, label styling
- **Lower Zones** — same as upper (line count requires Pro)
- **Axes** — tick size/color/decimals, gridlines (Free); axis titles, title size, fixed axes (Pro)
- **Data Points** — radius, opacity; data labels (Pro)
- **Zone Cards** — show/hide (Pro)

### External files required

None. The visual is fully self-contained.

### Performance

SVG is built as a single string and assigned once per render (no node-by-node DOM construction). Event handling uses delegation from the container root. For large datasets (5,000+ points), consider pre-aggregating data in Power BI before passing it to the visual.

### Power BI integration

- **Cross-filter:** `selectionManager.select()` with array of `ISelectionId`s
- **Cross-highlight:** non-highlighted points dim to 25% opacity via the `highlights` array in the data view
- **Landing page:** renders when no data fields are mapped (`supportsLandingPage: true`)
- **Rendering events:** `renderingStarted` / `renderingFinished` / `renderingFailed` implemented in all code paths

### Licensing

Pro features are unlocked via the official Power BI `IVisualLicenseManager` API. License resolution is asynchronous and non-blocking — the visual renders in Free mode immediately and upgrades to Pro in the same session once the license resolves. If resolution fails, the visual stays in Free mode silently. No external server is contacted.

### Privacy

No external HTTP requests. No local file access. No cookies. No persistent storage outside the `.pbix` file. See full privacy policy: https://tcviz.github.io/asymmetric-matrix/privacy.html

### Dependencies

None. No third-party libraries.

### Browser/service compatibility

Works in all environments that support Power BI Visuals API 5.x: Power BI Desktop, Power BI Service, Power BI Embedded, and Power BI Mobile (read-only interaction).

### Support

- Issues: https://github.com/tcviz/asymmetric-matrix/issues
- Email: support@tcviz.com
- Support page: https://tcviz.github.io/asymmetric-matrix/support.html

---

## TAB 4: CHANGELOG

### [1.0.0.0] — August 2026 — Initial release

**Added**
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

**Pro features**
- Up to 4 independent vertical dividers below the Y-ref (lower asymmetry)
- Axis titles for X and Y axes with configurable font size
- Fixed axis range — axis domain expands but never shrinks during cross-filtering
- Data labels displayed above each point
- Zone count cards — badge showing the number of points per zone
