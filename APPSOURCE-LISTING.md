# Bubble & Scatter Chart — ficha de AppSource (1.1.0.0, 24-10-2026)

Texto para pegar en Partner Center → oferta `asymmetric-matrix-tcviz` → Offer listing. **Editar este fichero no
cambia la oferta:** cada campo hay que pegarlo a mano en la consola.

**Cambio de nombre — a mano en Partner Center.** La oferta se llamaba "Asymmetric Matrix". El nombre nuevo,
**Bubble & Scatter Chart by TCViz**, se cambia en Offer listing → Name. El `displayName` del paquete
("Bubble & Scatter Chart") no cambia el nombre de la oferta en el marketplace, y este fichero tampoco.

Cambios frente a la ficha de 1.0:
- Reposicionado de "matriz asimétrica" a gráfico de burbujas / dispersión con zonas (decidido 21-10).
- Etiquetas de datos y títulos de ejes pasan a Free; Pro nuevo: tabla de zonas y línea de tendencia.
- Nada de duración de prueba, "certified partner" ni WCAG. No se nombra a ningún competidor: solo el scatter nativo.

---

## Resumen de resultados de búsqueda (≤ 100)

```
Scatter and bubble chart with quadrants at the average, named zones and a Pro zone table.
```

## Descripción (≤ 5.000)

```
A plain scatter chart treats every business as symmetric. You get two axes and, at best, four equal quadrants. But that is rarely how you segment: large accounts need three bands of sales above your margin target and two below; high-impact risks need finer likelihood bands than low-impact ones. The native Power BI scatter chart can draw reference lines, but it does not name or colour the zones between them, count what falls in each one, or let a reader click a zone to filter.

Bubble & Scatter Chart (formerly Asymmetric Matrix) draws the zones you actually use, names and colours them, and lets every reader click one to filter the report.

ZONES THAT MATCH HOW YOU SEGMENT
• A Y line at a fixed value, the average or the median
• Up to four vertical dividers; the first one can follow the average or the median too
• Quadrants in one click, or one zone below the line
• Average and median move with the filters, so the quadrants stay meaningful on every page
• Up to five named, coloured zones per half, with their own labels
• Pro: different dividers below the line than above it, for truly asymmetric zones

A REAL BUBBLE CHART
• One bubble per customer, product or project; up to 30,000 rows
• Bubble area proportional to Size, small bubbles drawn on top
• Colour by legend group, one colour, each category or zone; fx conditional formatting
• Data labels that avoid overlapping, axis titles, log scale on X and Y
• The measure's own number format, in the report's language
• Legend with the share of each group, which switches to the selected zone when you click one

COUNT WHAT IS IN EACH ZONE (PRO)
The zone table crosses your legend groups with the zones: as % of row, % of column, number of points or sum of Size. "What share of Online customers sits in the high-value, low-margin zone?" is one glance. Zones exist only inside the visual (they follow the average and move with filters), so this table cannot be built anywhere else in the report. Click any cell to filter.

FREE AND PRO
Free is the whole chart: bubbles, size, colours, labels, axis titles, Y line, up to four dividers, quadrants, log scale, legend, templates and all interaction. It is never blocked or watermarked. Pro adds own lower dividers, the zone table, a trend line with R², zone counts on each zone and a fixed axis range that keeps the scale steady while you filter.

SEE PRO ON YOUR OWN DATA
While you edit, turn on a Pro feature, or use "Try Pro" in the setup tips, and it is drawn working under a "Pro preview" watermark: your own data, not a screenshot. Power BI shows its own notice with the way to get a licence. Reading view shows the free chart, so a published report never uses a feature nobody paid for.

IN THE REPORT
Click a bubble to filter by that point, a zone to filter by all of its points, a legend item by its group (Ctrl adds). Bookmarks, cross-highlighting, report page tooltips, context menu, keyboard navigation between zones, high contrast and on-object formatting. Five style templates, including Four quadrants and Dark background. Format pane in 12 languages.

PRIVACY
No network calls of any kind: no telemetry, no analytics, no CDN. All calculation and rendering happens inside Power BI.

GETTING STARTED
1. Category: one bubble per value. 2. X axis and Y axis: two measures. 3. Optional: Size, Legend, Tooltips. Then click "Quadrants at the average" in the setup tips. Use measures for ratios, e.g. DIVIDE(SUM(Margin), SUM(Sales)).

Documentation, FAQ and use cases: https://tinocallarisa-web.github.io/asymmetric-matrix/support.html Support: support@tcviz.com — a person answers.

WHAT'S NEW IN 1.1
New name and full rewrite. Click a bubble to filter by that point. Legend field, quadrants by default, average and median lines, log scale, model number format, style templates, setup tips, on-object formatting and 12 languages. Data labels and axis titles are now free; the zone table and trend line are new in Pro. Reports made with Asymmetric Matrix keep working.
```

## Palabras clave (3)

`scatter chart` · `bubble chart` · `quadrant analysis`

- **scatter chart** — es lo que busca quien quiere dos medidas en un plano; el nombre nuevo se apoya en ello y es la
  categoría con más volumen.
- **bubble chart** — el campo Size convierte el visual en un gráfico de burbujas, y quien busca "bubble" no suele
  escribir "scatter".
- **quadrant analysis** — el uso que diferencia al visual (cuadrantes en la media, zonas con nombre, tabla de zonas):
  capta al que busca la matriz 2×2 o la segmentación por cuadrantes, que el scatter nativo no dibuja.

"Asymmetric" sale de las palabras clave: nadie lo buscaba. Sigue en la descripción ("formerly Asymmetric Matrix")
para que quien tenga la versión 1.0 la reconozca.

## Vídeo

URL canónica (nunca `youtu.be`): `https://www.youtube.com/watch?v=5esHnUDLUok`.
Sustituye al vídeo de la 1.0: quitarlo de Offer listing → Videos y pegar este.

## Imágenes

- Logo 300×300: `assets/icon_300x300.png` (nuevo, icono de la serie)
- Capturas 1366×768: **pendientes de hacer** con la 1.1 (las de `assets/Screenshot*.png` son de la 1.0)
- Infografía: `assets/bubble-scatter-infographic.png` (1366×768, exportada de `docs/infographic.html` el 24-10)

## URLs

| Campo | Valor |
|---|---|
| Soporte | https://tinocallarisa-web.github.io/asymmetric-matrix/support.html |
| Privacidad | https://tinocallarisa-web.github.io/asymmetric-matrix/privacy.html |
| Términos | https://tinocallarisa-web.github.io/asymmetric-matrix/terms.html |
| Repo (rama certification) | https://github.com/tinocallarisa-web/asymmetric-matrix/tree/certification |
| Ficha web | https://tcviz.com/product/asymmetric-matrix/ (el slug no cambia) |

Cuenta de GitHub: `tinocallarisa-web`. Planes: `free` y `pro` (Plan ID `pro`).

## Notas para la certificación

`docs/CERTIFICATION-NOTES-SHORT.txt` — el campo se vacía en cada reenvío: pegarlo siempre.
