# Tips & Hints — Asymmetric Matrix

## Getting Started

Add at minimum **X Value** and **Y Value** to see your data. The visual renders a landing page until both fields are mapped.

The **Category** field groups points by color — one color per unique value. Without it, all points share a single default color.

## Field Wells

| Field | Required | Notes |
|---|---|---|
| Category | No | Text/dimension field. One color per unique value. |
| X Value | Yes | Numeric measure. Horizontal axis. |
| Y Value | Yes | Numeric measure. Vertical axis. |
| Size | No | Numeric measure. Maps values to bubble radius proportionally. |
| Tooltips | No | Up to 10 measures. All appear in the hover tooltip. |

## Format Pane

### Reference Lines
Set **Y Reference Value** to the threshold that separates your upper and lower halves — for example, the average, a target, or zero. Change the line style to *Dashed* or *Dotted* to make it less visually dominant.

### Upper Zones
- Set **Number of vertical lines (above)** to 1–4 to divide the upper half into 2–5 columns.
- Set each **Line value** to the X threshold where the divider appears.
- Assign a **Zone label** to each zone — these float centered in the zone background.
- Use **Zone color** and **Zone opacity** (0–100) to create a color-coded risk or priority layout.
- **Label background color/opacity**: add a subtle fill behind the label text for legibility on colored zones.

### Lower Zones (Free: 1 zone · Pro: up to 5 zones)
In Free, the lower half is a single zone — configure its label, color and opacity.
With a Pro license, add up to 4 independent vertical dividers below the Y-ref. The lower divider positions are completely independent of the upper ones, enabling asymmetric layouts not possible with standard 2×2 matrices.

### Axes
- **Tick font size / Tick color**: adjust to match your report theme.
- **Tick decimals**: set to 0 for whole numbers, 1–5 for decimals, or −1 for auto-formatting (K/M suffixes for large numbers).
- **Show gridlines**: disable for a cleaner look when zone colors are visible.
- **X axis title / Y axis title** *(Pro)*: label your axes so the chart is self-explanatory without a legend.
- **Fixed axis range** *(Pro)*: when cross-filtering, the axes never shrink — points slide to the edge rather than the scale jumping. Recommended for dashboards where you need stable spatial positioning.

### Data Points
- **Default radius**: applies when no Size field is mapped. Increase for sparse data, decrease for dense.
- **Opacity** (0–100): lower slightly (e.g. 70) if points overlap heavily.
- **Data labels** *(Pro)*: shows the Category value above each point. Best used with fewer than ~30 points.

### Zone Cards (Pro)
Displays a small count badge in the top-left corner of each zone showing how many data points fall in that zone. Clickable — same cross-filter behavior as clicking the zone itself.

## Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Upper zones (up to 5) | ✅ | ✅ |
| 1 lower zone | ✅ | ✅ |
| Zone labels, colors, opacity | ✅ | ✅ |
| Category grouping | ✅ | ✅ |
| Bubble size | ✅ | ✅ |
| Tooltips (up to 10 fields) | ✅ | ✅ |
| Cross-filter on zone click | ✅ | ✅ |
| Lower asymmetry (up to 5 zones) | ❌ | ✅ |
| Axis titles | ❌ | ✅ |
| Fixed axis range | ❌ | ✅ |
| Data labels on points | ❌ | ✅ |
| Zone count cards | ❌ | ✅ |

## Tips & Best Practices

**Design your zones before setting values.** Sketch the matrix on paper first: how many zones above, how many below, and what each zone means conceptually (e.g. "High performance / Low risk"). Then set the X-threshold values to match.

**Use asymmetry intentionally.** The main advantage of this visual over a 2×2 is that the lower half can have different divisions than the upper. A common pattern: 3 zones above (Low / Mid / High performance) and 2 zones below (Acceptable / Needs attention).

**Coordinate zone colors with your report palette.** Use a traffic-light convention (green/yellow/red) or brand colors. Keep opacity at 30–50% so points remain readable.

**Fixed axis range for presentations.** Enable *Fixed axis range* (Pro) when showing the chart to an audience while switching slicers — the stable axes make it much easier to track where points move.

**Tooltips for context.** Add 2–3 extra measures to Tooltips (e.g. "Revenue", "Margin", "Region") so viewers can hover without needing to cross-reference another visual.

**Keep data labels lean.** Data labels (Pro) work best with fewer than 30 points. For denser data, rely on tooltips instead.

## Example Configurations

### 3×2 Asymmetric Matrix
- Upper: 2 vertical lines → 3 zones (Low / Medium / High)
- Lower: 1 vertical line (Pro) → 2 zones (Acceptable / At risk)
- Y-ref: average of Y Value measure

### Classic 2×2
- Upper: 1 vertical line → 2 zones
- Lower: 0 dividers → 1 zone (Free)
- Mirror the upper line value for the lower (Pro) to make it symmetric

### Performance vs Risk scatter
- X axis: Performance score (0–100)
- Y axis: Risk score (0–100)
- Y-ref: 50 (midpoint)
- Upper: 2 lines at X=33, X=66 → Low / Mid / High performance above median risk
- Lower (Pro): 1 line at X=50 → two zones for below-median risk

## Troubleshooting

**Points are not visible:** check that X Value and Y Value are both mapped to numeric measures (not text fields).

**Zone dividers appear in the wrong position:** line values are in the same units as your X Value measure. If X ranges from 0 to 1, set line values between 0 and 1.

**Cross-filter is not working with other visuals:** make sure the other visuals support cross-filtering, and that you have not accidentally clicked outside the zones (which clears the selection).

**Lower Zones lineCount option missing:** this is a Pro feature. The option appears only with an active Pro license.

**Axis titles not showing:** axis titles are a Pro feature. With a Pro license they appear in Format Pane → Axes.
