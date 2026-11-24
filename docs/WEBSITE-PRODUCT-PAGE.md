# Website Product Page — Bubble & Scatter Chart (formerly Asymmetric Matrix)

Content for https://tcviz.com/product/asymmetric-matrix/ — **the slug stays `asymmetric-matrix`** (live links and the
`?ref=visual-asymmetric` from the visual point there). Page title and headings use the new name.

- Name: **Bubble & Scatter Chart**
- Short line: *Scatter and bubble chart with quadrants at the average, your own zones, series colours and a zone table.*
- Version: 1.2.0.0 · Price: free, with an optional Pro plan — USD 1.99 per user per month or USD 19 per year (plan
  `bubble-scatter-pro`; licences on the earlier plan `pro` keep Pro)
- Video: https://www.youtube.com/watch?v=5esHnUDLUok (the 1.1 video; it stays until the 1.2 video exists)
- Support: https://tinocallarisa-web.github.io/asymmetric-matrix/support.html

---

## TAB 1: OVERVIEW

### The problem it solves

A plain scatter chart treats every business as symmetric. You get two axes and, at best, four equal quadrants that
you have to imagine. But segmentation rarely works that way: large accounts need three bands of sales above your margin
target and two below; high-impact risks need finer likelihood bands than low-impact ones. The native Power BI scatter chart can draw reference lines, but it does not name or colour the zones between them,
count what falls in each one, or let a reader click a zone to filter.

**Bubble & Scatter Chart** draws the zones you actually use — a Y line and up to four dividers, at fixed values, the
average or the median — names and colours them, and lets every reader click one to filter the report.

### How it works

Put the item you want one bubble for in Category, two measures in X and Y, and optionally a measure in Size and a
group in Legend. Click *Quadrants at the average* and you have a four-quadrant chart that moves with every filter.
From there, add dividers, name the zones, give each group its colour, pick a style — and, with Pro, give the lower
half its own dividers, count what is in each zone and use the TCViz collection styles.

### Who it is for

- **Sales and account managers**: customers by sales and margin, sized by orders, coloured by channel
- **PMOs and portfolio committees**: projects by effort and value, sized by budget
- **Risk and compliance teams**: risks by likelihood and impact, with finer bands where impact is high
- **Any Power BI report builder** who has drawn quadrants on a scatter chart by hand

### In one glance

- Scatter and bubble chart, up to 30,000 rows, bubble area proportional to Size
- Y line and divider 1 at a fixed value, the average or the median; up to 4 dividers; quadrants in one click
- Named, coloured zones; click a bubble, a zone or a group to filter
- Data labels without overlap, axis titles, log scale, model number format and dynamic format strings — all free
- A colour for each legend group, legend order, Report theme style, an Accessibility card — all free
- Pro: own lower dividers, zone table, trend line with R², zone counts, fixed axes, six collection styles
- Formerly **Asymmetric Matrix**: same visual, existing reports keep working

---

## TAB 2: FEATURES

### Free

**Quadrants that follow the data**
The Y line and the first divider can sit at the average or the median of the bubbles, recalculated as the report is
filtered. One click in the setup tips gives the classic four quadrants.

**Zones you name**
Up to four vertical dividers, so up to five zones above the line. Below it, the same dividers (quadrants) or one
zone. Each zone gets a label, a colour and an opacity.

**A real bubble chart**
Size by a measure, with the bubble's area — not its width — proportional to the value. Small bubbles are drawn on top.
Colour by legend group, one colour, each category or zone, with fx conditional formatting.

**Readable by default**
Data labels that hide themselves instead of overlapping, axis titles with the field names, log scale on X and Y, and
the measure's own number format in the report's language.

**Legend with shares, your colours and your order**
Show each group's share of the bubbles (or of Size) — and, when you click a zone, the mix inside that zone. Give each
group its own colour in *Series colours* (bubbles, legend, zone table and tooltip use it; no style overrides it), and
order the legend by data, alphabet or size.

**Filter by what you click**
A bubble filters by that point, a zone by all of its points, a legend item by its group. Ctrl adds. Bookmarks,
cross-highlighting, report page tooltips, context menu, keyboard navigation between zones and high contrast.

**Report theme and five style templates**
Report theme takes the colours and text of your report theme. Classic, Four quadrants, Minimal, Soft and Dark
background stay free — a style only fills what you have not set yourself.

**Accessible and readable at any size**
An Accessibility card with high contrast on demand, focus outline colour and width and a minimum text size. Text shrinks
with the visual in a small tile instead of overflowing.

**Made to be set up quickly**
A start screen with the steps, setup tips while you edit, on-object formatting, and the format pane in 12 languages.

### Pro

**Own lower dividers — asymmetric zones**
A different number and position of dividers below the Y line than above it. Three bands of sales for high-margin
customers, two for the rest. Up to five zones per half.

**Zone table**
A cross table of legend groups by zone: % of row, % of column, number of points or sum of Size. Click any cell to
filter. Zones exist only inside the visual — they follow the average and move with filters — so this table cannot be
built anywhere else in the report.

**Trend line**
Least-squares line with R², drawn as a curve on log axes.

**Zone counts**
The number of bubbles in each zone, and optionally its %, on the zone itself.

**Fixed axis range**
The axes keep the widest range seen since the page opened, so bubbles compare on the same scale while you change
slicers.

**Six collection styles**
Boardroom, Ledger, Editorial, Signal, Aurora and Terrace: background, text, grid, series palette and zone tints, the same
styles as in the other TCViz visuals.

### See Pro on your own data

While you edit, turn on a Pro feature or a Pro style — or use *Try Pro* in the setup tips — and it is drawn working
under a "Pro preview" watermark that names it. Power BI shows its own notice with the way to get a licence. Readers without a licence see
the free chart.

### Free vs Pro table

| Feature | Free | Pro |
|---|---|---|
| Scatter and bubble chart, size by field, up to 30,000 rows | ✅ | ✅ |
| Colour by legend / one colour / category / zone, fx, border, opacity | ✅ | ✅ |
| Series colours and legend order | ✅ | ✅ |
| Data labels with collision avoidance, axis titles | ✅ | ✅ |
| Y line at fixed value, average or median | ✅ | ✅ |
| Up to 4 dividers; quadrants or one zone below | ✅ | ✅ |
| Zone labels, colours, opacity | ✅ | ✅ |
| Log scale, model number format, dynamic format strings, legend with shares | ✅ | ✅ |
| Report theme and five templates, setup tips, on-object formatting, 12 languages | ✅ | ✅ |
| Accessibility card, text that scales with the visual | ✅ | ✅ |
| Cross-filter, bookmarks, highlight, keyboard, high contrast, tooltips | ✅ | ✅ |
| Own lower dividers (asymmetric zones) | ❌ | ✅ |
| Zone table | ❌ | ✅ |
| Trend line with R² | ❌ | ✅ |
| Zone counts | ❌ | ✅ |
| Fixed axis range | ❌ | ✅ |
| Six collection styles | ❌ | ✅ |

---

## TAB 3: TECHNICAL

### Specifications

- **API version:** Power BI Visuals API 5.11.1
- **Tech stack:** TypeScript, SVG built with DOM APIs (no D3, no external libraries, no `innerHTML`)
- **Data points:** up to 30,000 rows
- **Tooltips:** up to 10 extra measures; report page tooltips
- **Zones:** up to 5 above and 5 below the Y line (own lower dividers require Pro)
- **Languages:** English, Spanish, Portuguese (Brazil and Portugal), French, German, Italian, Dutch, Polish, Japanese,
  Chinese (Simplified), Korean

### Field wells

| Field | Type | Max | Required |
|---|---|---|---|
| Category | Grouping | 1 | For more than one bubble |
| Legend | Grouping | 1 | No |
| X axis | Measure | 1 | Yes |
| Y axis | Measure | 1 | Yes |
| Size | Measure | 1 | No |
| Tooltips | Measure | 10 | No |

Ratios must be measures (e.g. `DIVIDE(SUM(Margin), SUM(Sales))`): Power BI aggregates each field per bubble.

### Format pane cards

Style template · Bubbles · Series colours (with a Legend field) · Y line · Upper zones · Lower zones · Trend line (Pro) ·
Zone table (Pro) · Zone counts (Pro) · Axes · Legend · Accessibility.

### Power BI integration

- Cross-filter by point, zone, legend group or zone table cell; multi-select with Ctrl
- Cross-highlight: bubbles outside the highlight are dimmed
- Bookmarks restore the selection
- Context menu, keyboard focus, high contrast, on-object formatting, landing page
- Report theme style; dynamic format strings of the measures

### Licensing

Pro is unlocked through the official Power BI licensing API (`IVisualLicenseManager`), plan `bubble-scatter-pro` of
the AppSource offer (USD 1.99 per user per month or USD 19 per year); licences on the earlier plan `pro` keep working. The free chart never waits for or depends on the licence. No licence server.

### Privacy

No network calls, no telemetry, no cookies, no storage outside the report. Privacy policy:
https://tinocallarisa-web.github.io/asymmetric-matrix/privacy.html

### Support

- Email: support@tcviz.com
- Support page: https://tinocallarisa-web.github.io/asymmetric-matrix/support.html
- Issues: https://github.com/tinocallarisa-web/asymmetric-matrix/issues

---

## TAB 4: CHANGELOG

Full history: https://tinocallarisa-web.github.io/asymmetric-matrix/changelog.html

### [1.2.0.0] — 24 November 2026

- Series colours: a colour for each legend group, used by bubbles, legend, zone table and tooltip.
- Legend order: data, alphabetical or by size; the zone table follows it.
- Pro: six collection styles (Boardroom, Ledger, Editorial, Signal, Aurora, Terrace).
- Report theme style (free); the five templates stay free.
- Accessibility card: high contrast on demand, focus outline, minimum text size.
- Text that scales with the visual; dynamic format strings.
- New Pro price: USD 1.99 per user per month or USD 19 per year; earlier licences keep Pro.

### [1.1.0.0] — 24 October 2026 — Bubble & Scatter Chart

- New name (formerly Asymmetric Matrix) and full rewrite; existing reports keep working.
- Click a bubble to filter by that point; zone and legend clicks select their bubbles.
- Legend field, quadrants by default, Y line and divider 1 at the average or median.
- Log scale, model number format, colour by legend / category / zone with fx, bubble border.
- Data labels (with collision avoidance) and axis titles are now free.
- Pro: zone table and trend line with R² are new.
- Style templates, setup tips, start screen, on-object formatting, 12 languages.

### [1.0.1.0] — 15 September 2026

- Licence fix (Pro now unlocks for buyers), purchase path, keyboard navigation, high contrast, Pro preview.

### [1.0.0.0] — August 2026 — Initial release as Asymmetric Matrix
