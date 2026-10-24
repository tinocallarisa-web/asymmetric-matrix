# Tips & Hints — Bubble & Scatter Chart 1.1 (formerly Asymmetric Matrix)

## Getting started

1. **Category** — one bubble per value: customer, product, project. Without it (and without Legend) the whole table is one bubble.
2. **X axis** and **Y axis** — the two measures to compare. The chart appears as soon as both are in.
3. Optional: **Size** (bubble area), **Legend** (colour by group), **Tooltips** (up to 10 measures).
4. Click **Quadrants at the average** in the tips bar at the bottom, or pick a style template.

Until X and Y are in, the visual shows a start screen with the steps and links to the guide.

## Field wells

| Field | Required | Notes |
|---|---|---|
| Category | No, but needed for more than one bubble | One bubble per value. |
| Legend | No | Colours by group; rows of the zone table. One bubble per Category × Legend combination. |
| X axis | Yes | Measure. Horizontal position. |
| Y axis | Yes | Measure. Vertical position. |
| Size | No | Measure. Bubble **area** proportional to the value, relative to the largest. |
| Tooltips | No | Up to 10 measures. Report page tooltips are supported. |

Up to 30,000 rows.

## The one mistake to avoid: percentages as columns

Power BI aggregates X, Y and Size for each bubble — Sum by default. A margin % column summed per customer gives
300% for a customer with ten rows. Use a measure:

```
Margin % = DIVIDE(SUM(Sales[Margin]), SUM(Sales[Sales]))
```

The same for prices, rates and any ratio.

## Lines and zones

- **Y line** (card *Y line*): at a fixed value, the average or the median of the bubbles' Y.
- **Upper dividers** (card *Upper zones*): 0–4 vertical lines. Divider 1 can be at the average or the median; the
  others take fixed values.
- **Lower half** (card *Lower zones*):
  - *Same dividers as above* — quadrants (the default).
  - *One zone* — the 1.0 look.
  - *Own dividers* (Pro) — a different number and position of dividers below the line: the asymmetric zones.
- Up to five zones per half. Each gets a label (default *Zone A, B…*), a colour and an opacity.
- Average and median are unweighted (one value per bubble) and recalculated after filters. For a weighted reference,
  type a fixed value.

## Style templates

Classic · Four quadrants · Minimal · Soft · Dark background. A template only fills what you have not set. Choosing one
resets the colours and styles it defines — including a fixed bubble colour or an fx rule on it — but never your lines.
*Four quadrants* also puts the Y line and divider 1 at the average, if you have not set them.

## Format pane, card by card

- **Style template** — Template; Show setup tips.
- **Bubbles** — Colour by (Auto: legend if any / One colour / Each category / Zone), Colour with fx, Opacity; Size (no
  Size field), Border colour and width; Data labels, label size and colour.
- **Legend** — Show, Position, Font size, Text colour, Show share of each group (by Points or Size field). Needs a
  Legend field and Colour by = Auto.
- **Y line** — Show, Y line at, value, colour, style.
- **Upper zones** — Dividers, Zones, Zone labels (font size, colour, background, background opacity).
- **Lower zones** — Lower half, then the same groups (dividers only with Own dividers).
- **Axes** — Font, tick size and colour, Decimals (−1 = model format); Log scale X / Y, Gridlines, Plot background,
  Fixed axis range (Pro); Axis titles (default: field names), title size and colour.
- **Trend line (Pro)** — Show, colour, width, style, Show R².
- **Zone table (Pro)** — Show, Values (% of row, % of column, Points, Size field), Position, Width / height %, Font size.
- **Zone counts (Pro)** — Show, Show % of points, Font size.

## Interaction

- Click a **bubble**: filters by that point. **Ctrl** adds. Click the only selected bubble again: clears.
- Click a **zone background**: all bubbles in the zone. Again: clears.
- Click a **legend item**: that group.
- Click a **zone table** cell / zone header / row (Pro): those bubbles / the zone / the group.
- Click an empty area: clears. Right-click: context menu.
- Keyboard: Tab, arrows between zones, Enter or Space, Escape, Shift+F10.
- Bookmarks restore the selection. With *Show share of each group*, the legend shows the share inside the selection.

## Pro, and the preview

Pro: own lower dividers, zone table, trend line with R², zone counts, fixed axis range. Without a licence, while you
edit, any of them that you turn on is drawn under a **Pro preview** watermark and Power BI shows how to get a
licence. Readers without a licence see the free chart, with no watermark.

## Tips & best practices

**Start at the average.** Quadrants at the average give a meaningful split on any data and move with the filters.
Switch to fixed values once you know the thresholds your team uses (a margin target, a sales tier).

**Use asymmetry where the decision differs.** If high-margin customers need three sales tiers and low-margin ones only
two, use Own dividers (Pro) instead of forcing both halves into the same grid.

**Name the zones.** "Grow", "Protect", "Fix price", "Review" read faster than Zone A–D. Labels can also go in the zone
table header.

**Let the zone table do the counting (Pro).** *% of row* answers "where is each channel?"; *% of column* answers "what
is this zone made of?"; *Size field* answers "how much revenue sits in each zone?".

**Fixed axes for comparisons (Pro).** When the audience flips through regions with a slicer, fixed axes keep each
bubble's position comparable.

**Log scale for skewed measures.** Revenue and order counts are often skewed: log X spreads the small customers out.
Log Y works whenever every Y value is above 0; a Y line at 0 or below sits on the bottom edge.

**Keep labels for small sets.** Data labels avoid overlap by hiding the ones that would collide; with hundreds of bubbles,
rely on tooltips.

## Example configurations

### Customer portfolio (sales × margin %)
Category = Customer · X = Sales · Y = Margin % (measure) · Size = Orders · Legend = Channel. Quadrants at the average.
Pro: zone table in % of row.

### Project prioritisation
Category = Project · X = Effort · Y = Value · Size = Budget. Y line at the value threshold; upper: 2 dividers (Quick
wins / Plan / Major bets); lower (Pro own dividers): 1 divider (Fill-ins / Avoid).

### Risk register
Category = Risk · X = Likelihood · Y = Impact · Legend = Area. Upper: 2 dividers; lower (Pro): 1. Zone counts on,
fixed axes on.

## Troubleshooting

- **One bubble only** — put a field in Category.
- **Strange percentages** — use a DIVIDE measure, not a column.
- **More bubbles than customers** — Category × Legend makes one bubble per combination.
- **Log scale stays linear** — a value ≤ 0 on that axis (with Fixed axis range, also values seen earlier). A note
  says so while editing.
- **No legend** — Colour by must be Auto, and Show legend on.
- **Zone table missing** — turn it on, enlarge the visual (hidden in very small tiles); Pro or edit-mode preview.
- **"No data for the current filters"** — the filters leave no bubble with both X and Y.
- **A 1.0 report looks different** — lower half → One zone; Colour by → Each category; Axis titles off.
