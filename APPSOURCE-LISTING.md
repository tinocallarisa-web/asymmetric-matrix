# Bubble & Scatter Chart — ficha de AppSource (1.2.0.0, 24-11-2026)

Texto para pegar en Partner Center → oferta `asymmetric-matrix-tcviz` → Offer listing. **Editar este fichero no
cambia la oferta:** cada campo hay que pegarlo a mano en la consola. La descripción se pega en HTML: el código de
`APPSOURCE-DESCRIPTION.html` (raíz del repo), con las etiquetas a la vista, nunca el texto de este fichero. Se genera con
`python C:\tcviz\utillaje\ficha_html.py "C:\tcviz\dev\Matriz asimetrica"`.

**1.2.0.0 cambia lo que ve el comprador**, así que la descripción cambia: colores por serie, orden de la leyenda, seis
estilos de colección (Pro), Report theme, tarjeta Accessibility, texto que encoge, formato dinámico y precio nuevo.

**A mano en Partner Center (1.2):**
- Plan nuevo con Plan ID **exacto** `bubble-scatter-pro`: USD 1,99/mes · 19/año por usuario. El plan `pro` se
  detiene, no se borra: quien ya lo pagó sigue en Pro (`src/licenseManager.ts` acepta los dos).
- Offer listing → Description (HTML), Search results summary; y las notas de certificación (el campo se vacía).
- Vídeo: **no se cambia** hasta que Tino suba el vídeo de la 1.2. Se queda el actual.

Cambios frente a la ficha de 1.1:
- Bloque WHAT'S NEW IN 1.2. Pro gana los seis estilos de colección; colores por serie, orden de la leyenda, Report
  theme, las cinco plantillas y Accessibility son gratis. Bloque ACCESSIBILITY propio.
- Nada de duración de prueba, "certified", WCAG ni "certified partner". No se nombra a ningún competidor: solo el
  scatter nativo.

Historial: la ficha de 1.1 (24-10-2026) cambió el nombre de la oferta de "Asymmetric Matrix" a **Bubble & Scatter
Chart by TCViz** (Offer listing → Name, a mano) y reposicionó el visual de "matriz asimétrica" a gráfico de burbujas /
dispersión con zonas.

---

## Resumen de resultados de búsqueda (≤ 100)

```
Scatter and bubble chart: quadrants at the average, named zones, series colours and a zone table.
```

## Descripción (≤ 5.000)

```
A plain scatter chart treats every business as symmetric. You get two axes and, at best, four equal quadrants. But that is rarely how you segment: large accounts need three bands of sales above your margin target and two below; high-impact risks need finer likelihood bands than low-impact ones. The native Power BI scatter chart can draw reference lines, but it does not name or colour the zones between them, count what falls in each one, or let a reader click a zone to filter.

Bubble & Scatter Chart (formerly Asymmetric Matrix) is a Power BI visual that draws the zones you actually use, names and colours them, and lets every reader click one to filter the report.

ZONES THAT MATCH HOW YOU SEGMENT
• A Y line at a fixed value, the average or the median
• Up to four vertical dividers; the first one can follow the average or the median too
• Quadrants in one click, or one zone below the line; average and median move with the filters
• Up to five named, coloured zones per half
• Pro: different dividers below the line than above it, for truly asymmetric zones

A REAL BUBBLE CHART
• One bubble per customer, product or project; up to 30,000 rows
• Bubble area proportional to Size, small bubbles drawn on top
• Colour by legend group, one colour, each category or zone; conditional formatting (fx): rules that colour each bubble by its result
• A colour for each legend group, and legend order by data, alphabet or size
• Data labels that avoid overlapping, axis titles, log scale on X and Y
• Dynamic format strings, so labels match the rest of your report
• Text shrinks with the visual in a small tile instead of overflowing

COUNT WHAT IS IN EACH ZONE (PRO)
The zone table crosses your legend groups with the zones: as % of row, % of column, number of points or sum of Size. Zones exist only inside the visual (they follow the average and move with filters), so this table cannot be built anywhere else in the report. Click any cell to filter.

FREE AND PRO
Free is the whole chart: bubbles, colours, series colours, labels, axis titles, Y line, dividers, quadrants, log scale, legend, Report theme, five templates, accessibility and all interaction. Never blocked or watermarked. Pro adds own lower dividers, the zone table, a trend line with R², zone counts, a fixed axis range and six collection styles (Boardroom, Ledger, Editorial, Signal, Aurora, Terrace). Pro: USD 1.99 per user per month or USD 19 per year.

SEE PRO ON YOUR OWN DATA
While you edit, turn on a Pro feature or a Pro style, or use "Try Pro" in the setup tips, and it is drawn working under a "Pro preview" watermark that names it: your own data, not a screenshot. Reading view shows the free chart.

ACCESSIBILITY
High contrast from Windows or on demand, focus outline colour and width, a minimum text size, keyboard navigation between zones and screen reader labels.

IN THE REPORT
Click a bubble to filter by that point, a zone by all of its points, a legend item by its group (Ctrl adds). Bookmarks, cross-highlighting, report page tooltips, context menu and on-object formatting. Format pane in 12 languages.

PRIVACY
No network calls of any kind: no telemetry, no analytics, no CDN. All calculation and rendering happens inside Power BI.

GETTING STARTED
You need a field for the bubbles and two measures.
1. Category: one bubble per value.
2. X axis and Y axis: two measures. Optional: Size, Legend, Tooltips.
3. Click "Quadrants at the average" in the setup tips. Use measures for ratios, e.g. DIVIDE(SUM(Margin), SUM(Sales)).

Documentation, FAQ and use cases: https://tinocallarisa-web.github.io/asymmetric-matrix/support.html
Support: support@tcviz.com — a person answers.

WHAT'S NEW IN 1.2
A colour for each legend group; legend order; Report theme style; six collection styles in Pro; an Accessibility card; text that scales with the visual; dynamic format strings; a lower Pro price. Reports made with earlier versions keep working, and licences bought before keep Pro.
```

## Palabras clave (3)

`scatter chart` · `bubble chart` · `quadrant analysis`

- **scatter chart** — es lo que busca quien quiere dos medidas en un plano; el nombre nuevo se apoya en ello y es la
  categoría con más volumen.
- **bubble chart** — el campo Size convierte el visual en un gráfico de burbujas, y quien busca "bubble" no suele
  escribir "scatter".
- **quadrant analysis** — el uso que diferencia al visual (cuadrantes en la media, zonas con nombre, tabla de zonas):
  capta al que busca la matriz 2×2 o la segmentación por cuadrantes, que el scatter nativo no dibuja.

Sin cambios en 1.2. "Asymmetric" sale de las palabras clave: nadie lo buscaba. Sigue en la descripción ("formerly
Asymmetric Matrix") para que quien tenga la versión 1.0 la reconozca.

## Vídeo

URL canónica (nunca acortadores, `/shorts/` ni `/embed/`): `https://www.youtube.com/watch?v=gXInY9wfsrA` (vídeo de la
1.2, 24-11-2026). Pegarla en Offer listing → Videos. El enlace dentro del visual sigue llevando al vídeo de la 1.1
hasta la próxima versión.

## Imágenes

- Logo 300×300: `assets/icon_300x300.png` (icono de la serie)
- Capturas 1366×768 (1.2, hechas 24-11): `assets/Screenshot.png`, `assets/Screenshot_2.png`, `assets/Screenshot_3.png`
- Infografías: `assets/bubble-scatter-infographic.png` (exportada de docs/infographic.html 1.2) y
  `assets/infographic-styles.png` (estilos).

## URLs

| Campo | Valor |
|---|---|
| Soporte | https://tinocallarisa-web.github.io/asymmetric-matrix/support.html |
| Privacidad | https://tinocallarisa-web.github.io/asymmetric-matrix/privacy.html |
| Términos | https://tinocallarisa-web.github.io/asymmetric-matrix/terms.html |
| Repo (rama certification) | https://github.com/tinocallarisa-web/asymmetric-matrix/tree/certification |
| Ficha web | https://tcviz.com/product/asymmetric-matrix/ (el slug no cambia) |

Cuenta de GitHub: `tinocallarisa-web`. Planes: `free`, `pro` (antiguo, 4,99 · 49, detenido) y `bubble-scatter-pro`
(nuevo, 1,99 · 19). El visual acepta los dos de pago.

## Notas para la certificación

`docs/CERTIFICATION-NOTES-SHORT.txt` — el campo se vacía en cada reenvío: pegarlo siempre.

## Plan nuevo (1.2.0.0)

- ID del plan: `bubble-scatter-pro` (no se puede cambiar después)
- Nombre del plan: **Bubble & Scatter Pro**
- Precio: USD 1,99 por usuario y mes, o USD 19 por usuario y año
- El plan antiguo `pro` (4,99/49) se detiene cuando la 1.2.0.0 esté publicada, no antes (la 1.1 solo reconoce `pro`).

Descripción del plan:

```
Unlocks the Pro features of Bubble & Scatter Chart by TCViz for one user:
• Own dividers below the Y line, for asymmetric zones
• Zone table: each legend group across the zones, as % of row, % of column, point count or sum of size
• Zone counts and % of points shown in every zone
• Trend line with R²
• Fixed axis range
• Six collection styles shared by every TCViz visual: Boardroom, Ledger, Editorial, Signal, Aurora and Terrace

The free version stays complete: bubbles, quadrants, named zones, series colours, legend order, filtering, Report theme, five templates and accessibility.
Each person who views the Pro features in a report needs their own licence. No data leaves Power BI.
```
