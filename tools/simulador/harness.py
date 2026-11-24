# -*- coding: utf-8 -*-
"""Simulador Playwright de Bubble & Scatter Chart (1.2).

Carga el bundle de .tmp/drop (`node build-test.js --free`, licencia REAL: el código de producción) en un host simulado;
la licencia se simula en el stub (con plan o sin él), así una sola build cubre Pro, Free edición y Free lectura.
Datos: los 120 primeros clientes de BubbleScatter_Clientes.xlsx (Ventas, Margen %, Pedidos, Canal).

    node build-test.js --free
    python tools/simulador/harness.py                # comprobaciones + capturas en tools/simulador/capturas/
    PLAN=tino_callarisa.asymmetric-matrix-tcviz.pro python tools/simulador/harness.py   # plan con el que se simula el Pro

Termina con "TODO OK" o con la lista de fallos.
"""
import asyncio, io, json, os, sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
import openpyxl
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "capturas")
DROP = os.path.join(ROOT, ".tmp", "drop")
# Service ID completo del plan con el que se simula la licencia (por defecto, el nuevo de la 1.2).
PLAN = os.environ.get("PLAN", "tino_callarisa.asymmetric-matrix-tcviz.bubble-scatter-pro")
PLAN_VIEJO = "tino_callarisa.asymmetric-matrix-tcviz.pro"
PLAN_AJENO = "tino_callarisa.calendar-events-heatmap.calendar-pro"
FALLOS = []

# ── Datos ─────────────────────────────────────────────────────────────────────
wb = openpyxl.load_workbook(os.path.join(ROOT, "BubbleScatter_Clientes.xlsx"), read_only=True, data_only=True)
_filas = list(wb["Clientes"].iter_rows(values_only=True))
_cab = list(_filas[0])
CLIENTES = [dict(zip(_cab, r)) for r in _filas[1:121]]
CANALES = []
for c in CLIENTES:
    if c["Canal"] not in CANALES:
        CANALES.append(c["Canal"])


def dataview(objects=None, legend=True, size=True, guia=False, elegidos=None, dinamico=None, escala_x=1.0):
    """Vista categórica como la manda Power BI: Category y Legend en categories; X, Y y Size en values.
    elegidos = {canal: "#RRGGBB"}: colores guardados en seriesColors con el selector de la primera fila del canal."""
    objects = json.loads(json.dumps(objects or {}))
    if not guia:
        objects.setdefault("style", {}).setdefault("guide", False)
    n = len(CLIENTES)
    cat = {"source": {"displayName": "Cliente", "queryName": "c.Cliente", "roles": {"category": True}, "type": {"text": True}},
           "values": [c["Cliente"] for c in CLIENTES], "identity": [{"r": i} for i in range(n)]}
    cats = [cat]
    if legend:
        leg = {"source": {"displayName": "Canal", "queryName": "c.Canal", "roles": {"legend": True}, "type": {"text": True}},
               "values": [c["Canal"] for c in CLIENTES], "identity": [{"l": i} for i in range(n)]}
        if elegidos:
            objs = [None] * n
            for canal, color in elegidos.items():
                fila = next(i for i, c in enumerate(CLIENTES) if c["Canal"] == canal)
                objs[fila] = {"seriesColors": {"fill": {"solid": {"color": color}}}}
            leg["objects"] = objs
        cats.append(leg)
    xs = {"source": {"displayName": "Ventas", "queryName": "m.Ventas", "roles": {"xValue": True}, "type": {"numeric": True}, "isMeasure": True, "format": "#,0"},
          "values": [c["Ventas"] * escala_x for c in CLIENTES]}
    if dinamico:
        xs["objects"] = [{"general": {"formatString": dinamico}} for _ in range(n)]
    ys = {"source": {"displayName": "Margen %", "queryName": "m.Margen", "roles": {"yValue": True}, "type": {"numeric": True}, "isMeasure": True, "format": "0.0%"},
          "values": [c["Margen_pct_fila"] for c in CLIENTES]}
    vals = [xs, ys]
    if size:
        vals.append({"source": {"displayName": "Pedidos", "queryName": "m.Pedidos", "roles": {"size": True}, "type": {"numeric": True}, "isMeasure": True, "format": "#,0"},
                     "values": [c["Pedidos"] for c in CLIENTES]})
    cols = [c["source"] for c in cats] + [v["source"] for v in vals]
    return {"metadata": {"objects": objects, "columns": cols}, "categorical": {"categories": cats, "values": vals}}


TEMA_OSCURO = {"foreground": "#F0F0F0", "background": "#1E1E1E", "secondary": "#B0B0B0", "colors": ["#E8A33D", "#3DB7E8", "#9BE83D", "#E83D8C", "#8C3DE8"]}

STUB = r"""
window.__ev = []; window.__persist = []; window.__notif = [];
window.powerbi = { visuals: { plugins: {} }, extensibility: {} };
(function(){
 let sel = [];
 const T = window.__theme || { foreground: '#252423', background: '#FFFFFF', secondary: '#605E5C',
   colors: ['#118DFF', '#12239E', '#E66C37', '#6B007B', '#E044A7', '#744EC2', '#D9B300', '#D64550'] };
 const asignados = {}; let nAsig = 0;
 window.__host = {
  eventService: { renderingStarted(){ __ev.push('S'); }, renderingFinished(){ __ev.push('F'); }, renderingFailed(o,m){ __ev.push('X'); console.error('FAILED', m); } },
  createSelectionManager(){ return { select(id, multi){ const a = Array.isArray(id) ? id : [id]; sel = multi ? sel.concat(a) : a; window.__sel = sel; return Promise.resolve(sel); },
     clear(){ sel = []; window.__sel = []; return Promise.resolve(); }, getSelectionIds(){ return sel; },
     hasSelection(){ return sel.length > 0; }, registerOnSelectCallback(cb){ window.__onSel = cb; }, showContextMenu(){ return Promise.resolve(); } }; },
  createSelectionIdBuilder(){ const k=[]; const b = { withCategory(c,i){ k.push(((c.source && c.source.displayName) || 'c') + i); return b; }, withSeries(){ return b; },
     withMeasure(){ return b; }, createSelectionId(){ const key=k.join('|'); return { key, getKey(){return key;}, getSelector(){ return {data:[key]}; }, equals(o){return !!o&&o.key===key;}, includes(){return false;} }; } }; return b; },
  createLocalizationManager(){ return { getDisplayName(k){ return k; } }; },
  tooltipService: { enabled(){ return true; }, show(o){ window.__tip = o; }, move(o){ window.__tip = o; }, hide(){} },
  subSelectionService: { subSelect(){}, updateRegionOutlines(){} },
  hostCapabilities: { allowInteractions: true }, locale: window.__locale || 'en-US',
  colorPalette: { isHighContrast: !!window.__hc,
    foreground:{value: window.__hc ? '#FFFF00' : T.foreground}, background:{value: window.__hc ? '#000000' : T.background},
    foregroundNeutralSecondary:{value: T.secondary}, foregroundSelected:{value:'#1AEBFF'},
    getColor(k){ if (!(k in asignados)) asignados[k] = T.colors[(nAsig++) % T.colors.length]; return {value: asignados[k]}; } },
  licenseManager: { getAvailableServicePlans(){ return Promise.resolve({ plans: window.__plan ? [{ spIdentifier: window.__plan, state: 1 }] : [], isLicenseUnsupportedEnv: false, isLicenseInfoAvailable: true }); },
     notifyFeatureBlocked(m){ __notif.push(m); return Promise.resolve(true); }, notifyLicenseRequired(){ return Promise.resolve(true); }, clearLicenseNotification(){ return Promise.resolve(true); } },
  persistProperties(p){ __persist.push(p); }, launchUrl(){}, applyJsonFilter(){}, displayWarningIcon(){}, refreshHostData(){},
 };
})();
"""


def check(name, ok, detail=""):
    print(f"  {'OK   ' if ok else 'FALLO'} {name}{'  — ' + detail if detail else ''}")
    if not ok:
        FALLOS.append(name)


async def page(b, dv, W=900, H=560, plan=PLAN, edit=False, hc=False, theme=None, name=None):
    """plan = Service ID del plan activo (None = sin licencia). edit = modo edición (vista previa Pro sin licencia)."""
    guid = json.load(io.open(os.path.join(DROP, "pbiviz.json"), encoding="utf-8"))["visual"]["guid"]
    pg = await b.new_page(viewport={"width": W + 20, "height": H + 20})
    errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.set_content(f"<html><body style='margin:0;background:#fff'><div id='host' style='position:relative;width:{W}px;height:{H}px;overflow:hidden'></div></body></html>")
    await pg.add_style_tag(path=os.path.join(DROP, "visual.css"))
    await pg.add_script_tag(content=f"window.__plan = {json.dumps(plan)}; window.__hc = {json.dumps(hc)}; window.__theme = {json.dumps(theme)};")
    await pg.add_script_tag(content=STUB)
    await pg.add_script_tag(path=os.path.join(DROP, "visual.js"))
    await pg.evaluate("(g) => { window.__v = powerbi.visuals.plugins[g].create({ element: document.getElementById('host'), host: __host }); }", guid)
    pg._errs, pg._dims, pg._vm = errs, (W, H), (1 if edit else 0)
    await upd(pg, dv)
    await pg.wait_for_timeout(150)   # la licencia resuelve después del primer pintado
    await upd(pg, dv)
    if name:
        os.makedirs(OUT, exist_ok=True)
        await pg.screenshot(path=os.path.join(OUT, name + ".png"), clip={"x": 0, "y": 0, "width": W, "height": H})
    return pg


async def upd(pg, dv, W=None, H=None):
    if W:
        pg._dims = (W, H)
        await pg.evaluate(f"() => {{ const h = document.getElementById('host'); h.style.width = '{W}px'; h.style.height = '{H}px'; }}")
    W, H = pg._dims
    await pg.evaluate("([dv, W, H, vm]) => __v.update({ dataViews: dv ? [JSON.parse(JSON.stringify(dv))] : [], viewport: { width: W, height: H }, type: 2, operationKind: 0, viewMode: vm, editMode: 0, jsonFilters: [] })",
                      [dv, W, H, pg._vm])
    await pg.wait_for_timeout(60)


async def eventos(pg, label):
    ev = await pg.evaluate("() => __ev.join('')")
    check(f"{label}: sin errores y eventos 1:1", not pg._errs and ev.count("S") == ev.count("F") and "X" not in ev, f"{ev[-12:]} {pg._errs[:2]}")


INFO = r"""() => {
  const h = document.getElementById('host'), root = h.querySelector('.bs'), hr = h.getBoundingClientRect();
  const wm = h.querySelector('.tcviz-wm');
  const rgb = c => { const m = String(c).match(/\d+(\.\d+)?/g); return m ? m.slice(0, 3).map(Number) : null; };
  const hex = c => { const m = /^#([0-9a-f]{6})$/i.exec(c || ''); return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : rgb(c); };
  const lum = a => { const l = a.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * l[0] + .7152 * l[1] + .0722 * l[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  // Colores del fondo del visual (con degradado, todas sus paradas).
  const bgTxt = root.style.background || '';
  const fondos = (bgTxt.match(/rgb\([^)]*\)|#[0-9a-f]{6}/gi) || []).map(hex);
  const ticks = Array.from(root.querySelectorAll('text[data-o="ticks"]'));
  const tickColor = ticks.length ? hex(ticks[0].getAttribute('fill')) : null;
  const contraste = fondos.length && tickColor ? Math.min.apply(null, fondos.map(f => ratio(tickColor, f))) : null;
  // Todo el texto visible: tamaño y si se sale del visual (lo recortado por el área de dibujo no cuenta).
  const textos = Array.from(root.querySelectorAll('svg text')).filter(t => t.textContent.trim());
  const celdas = Array.from(root.querySelectorAll('.bs-table th, .bs-table td, .bs-table caption')).filter(e => e.textContent.trim());
  const tam = textos.map(t => parseFloat(t.getAttribute('font-size') || getComputedStyle(t).fontSize)).concat(celdas.map(e => parseFloat(getComputedStyle(e).fontSize)));
  const fuera = [];
  textos.forEach(t => { if (t.closest('[clip-path]')) return; const r = t.getBoundingClientRect(); if (!r.width) return;
     if (r.left < hr.left - 1 || r.right > hr.right + 1 || r.top < hr.top - 1 || r.bottom > hr.bottom + 1.5) fuera.push(t.textContent + ' @' + [r.left - hr.left, r.top - hr.top, r.right - hr.left, r.bottom - hr.top].map(Math.round)); });
  const tabla = root.querySelector('.bs-table');
  if (tabla) { const r = tabla.getBoundingClientRect(); if (r.right > hr.right + 1 || r.bottom > hr.bottom + 1) fuera.push('tabla ' + [r.right - hr.left, r.bottom - hr.top].map(Math.round)); }
  const svg = root.querySelector('svg.bs-svg');
  if (svg) { const r = svg.getBoundingClientRect(); if (r.right > hr.right + 1 || r.bottom > hr.bottom + 1) fuera.push('svg'); }
  const circ = Array.from(root.querySelectorAll('circle[data-idx]'));
  const leg = Array.from(root.querySelectorAll('g.bs-leg')).map(g => ({ name: g.getAttribute('data-series'), color: (g.querySelector('circle') || {}).getAttribute ? g.querySelector('circle').getAttribute('fill') : null }));
  const filas = Array.from(root.querySelectorAll('.bs-table th[data-fila]')).map(th => ({ name: th.getAttribute('data-fila'), border: th.style.borderLeft }));
  return { bg: bgTxt, contraste, tickFont: ticks.length ? ticks[0].getAttribute('font-family') : '', tickFill: ticks.length ? ticks[0].getAttribute('fill') : '',
    tickSize: ticks.length ? parseFloat(ticks[0].getAttribute('font-size')) : 0, tickTexts: ticks.map(t => t.textContent),
    plotFill: (root.querySelector('rect[data-o="plot"]') || { getAttribute: () => null }).getAttribute('fill'),
    minFont: tam.length ? Math.min.apply(null, tam) : 0, maxFont: tam.length ? Math.max.apply(null, tam) : 0, fuera,
    wm: wm && wm.style.display !== 'none' ? wm.textContent : null, wmVieja: !!root.querySelector('.bs-watermark'),
    nCirc: circ.length, circFill: circ.map(c => ({ i: +c.getAttribute('data-idx'), fill: c.getAttribute('fill') })),
    leg, filas, trend: !!root.querySelector('polyline[data-o="trend"]'), tabla: !!tabla,
    foco: root.style.getPropertyValue('--bs-focus') + ' ' + root.style.getPropertyValue('--bs-focus-w') };
}"""


async def info(pg):
    return await pg.evaluate(INFO)


def color_de(i, canal):
    """Colores de las burbujas de un canal (índice de punto = índice de fila: todos los clientes tienen X e Y)."""
    return {c["fill"].upper() for c in i["circFill"] if CLIENTES[c["i"]]["Canal"] == canal}


def rgb(hexc):
    h = hexc.lstrip("#")
    return f"rgb({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)})"


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        print("Base (Pro, " + PLAN + ")")
        pg = await page(b, dataview(legend=False), name="01_base")
        i = await info(pg)
        check("burbujas pintadas (120)", i["nCirc"] == 120, str(i["nCirc"]))
        check("Classic: fondo transparente como en la 1.1", i["bg"] == "", i["bg"])
        check("sin la marca de agua propia de la 1.1 (.bs-watermark)", not i["wmVieja"])
        check("ejes con el formato del modelo (Y en %)", any("%" in t for t in i["tickTexts"]), str(i["tickTexts"][:6]))
        await eventos(pg, "base")
        await pg.close()
        pg = await page(b, dataview(legend=False, escala_x=0.1))
        i = await info(pg)
        check("eje de ~120.000: en miles, no '0,1M' (displayUnitSystemType 2)", any(t.endswith("K") for t in i["tickTexts"]) and not any("M" in t for t in i["tickTexts"]), str(i["tickTexts"]))
        await pg.close()

        print("Colores de la 1.1 sin tocar nada (Classic con leyenda)")
        pg = await page(b, dataview())
        i = await info(pg)
        # La 1.1 pedía los colores al tema al dibujar, burbujas grandes primero: el canal de la burbuja mayor, el 1.º.
        smax = max(c["Pedidos"] for c in CLIENTES)
        r = [max(2.4, 24 * (c["Pedidos"] / smax) ** 0.5) for c in CLIENTES]
        orden = []
        for k in sorted(range(len(CLIENTES)), key=lambda k: -r[k]):
            if CLIENTES[k]["Canal"] not in orden:
                orden.append(CLIENTES[k]["Canal"])
        tema = ['#118DFF', '#12239E', '#E66C37', '#6B007B']
        check("cada canal con el color que le daba la 1.1", all(color_de(i, c) == {tema[orden.index(c)]} for c in CANALES),
              str([(c, color_de(i, c)) for c in CANALES]))
        await pg.close()

        print("Estilos de la colección (con licencia, lectura)")
        for est in ["boardroom", "ledger", "editorial", "signal", "aurora", "terrace"]:
            pg = await page(b, dataview({"style": {"template": est}}), name=f"02_estilo_{est}")
            i = await info(pg)
            check(f"{est}: fondo propio", i["bg"] != "", i["bg"][:60])
            if est in ("ledger", "editorial"):
                check(f"{est}: Georgia", "Georgia" in i["tickFont"], i["tickFont"])
            else:
                check(f"{est}: sin Georgia", "Georgia" not in i["tickFont"], i["tickFont"])
            check(f"{est}: marcas del eje legibles sobre el fondo (≥3:1)", (i["contraste"] or 0) >= 3, f"{i['contraste']}")
            check(f"{est}: sin marca de agua con licencia", not i["wm"], str(i["wm"]))
            await eventos(pg, est)
            await pg.close()

        print("Report theme (tema oscuro simulado)")
        pg = await page(b, dataview({"style": {"template": "report"}}, legend=False), theme=TEMA_OSCURO, name="03_report_theme")
        i = await info(pg)
        check("Report theme: burbujas con el primer color del tema", color_de(i, CANALES[0]) == {"#E8A33D"}, str(color_de(i, CANALES[0])))
        check("Report theme: área de dibujo con el fondo del tema", (i["plotFill"] or "").upper() == "#1E1E1E", str(i["plotFill"]))
        check("Report theme: marcas con el gris secundario del tema", (i["tickFill"] or "").upper() == "#B0B0B0", i["tickFill"])
        check("Report theme: sin fondo propio (lo pinta Power BI)", i["bg"] == "", i["bg"])
        await eventos(pg, "report")
        await pg.close()
        pg = await page(b, dataview({"style": {"template": "report"}}), theme=TEMA_OSCURO)
        i = await info(pg)
        check("Report theme con leyenda: cada canal con un color del tema", all(len(color_de(i, c)) == 1 for c in CANALES)
              and len({next(iter(color_de(i, c))) for c in CANALES}) == len(CANALES), str([color_de(i, c) for c in CANALES]))
        await pg.close()

        print("Colores por serie")
        ONLINE = "Online" if "Online" in CANALES else CANALES[1]
        tabla = {"zoneTable": {"show": True}}
        pg = await page(b, dataview(tabla), name="04_series_sin_elegir")
        antes = await info(pg)
        await pg.close()
        pg = await page(b, dataview(tabla, elegidos={ONLINE: "#FF00AA"}), name="05_series_elegido")
        i = await info(pg)
        check("color elegido: burbujas del canal", color_de(i, ONLINE) == {"#FF00AA"}, str(color_de(i, ONLINE)))
        lc = next((x["color"] for x in i["leg"] if x["name"] == ONLINE), None)
        check("color elegido: leyenda", (lc or "").upper() == "#FF00AA", str(lc))
        fb = next((x["border"] for x in i["filas"] if x["name"] == ONLINE), "")
        check("color elegido: fila de la tabla de zonas", rgb("#FF00AA") in fb or "#FF00AA" in fb.upper(), fb)
        otros = [c for c in CANALES if c != ONLINE]
        check("los demás canales conservan su color de la 1.1 (tema)", all(color_de(i, c) == color_de(antes, c) for c in otros), "")
        # Ayuda emergente: el color junto al canal
        await pg.evaluate("() => { window.__tip = null; }")
        idx = next(k for k, c in enumerate(CLIENTES) if c["Canal"] == ONLINE)
        await pg.evaluate("(i) => { const c = document.querySelector('circle[data-idx=\"' + i + '\"]'); const r = c.getBoundingClientRect(); c.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })); }", idx)
        tip = await pg.evaluate("() => window.__tip && window.__tip.dataItems")
        tc = next((d.get("color") for d in (tip or []) if d.get("displayName") == "Canal"), None)
        check("color elegido: ayuda emergente junto al canal", (tc or "").upper() == "#FF00AA", str(tc))
        # Panel: una muestra por canal, con el color efectivo y el selector de su fila
        card = await pg.evaluate("() => __v.getFormattingModel().cards.find(c => c.uid === 'seriesColors-card')")
        sl = card["groups"][0]["slices"] if card else []
        check("panel: Series colours con una muestra por canal", len(sl) == len(CANALES), str(len(sl)))
        mo = next((x for x in sl if x["displayName"] == ONLINE), None)
        check("panel: la muestra enseña el color elegido y lleva selector", mo and mo["control"]["properties"]["value"]["value"].upper() == "#FF00AA"
              and mo["control"]["properties"]["descriptor"]["selector"], json.dumps(mo)[:200] if mo else "sin muestra")
        await eventos(pg, "series")
        await pg.close()
        pg = await page(b, dataview({"style": {"template": "boardroom"}, **tabla}, elegidos={ONLINE: "#FF00AA"}), name="06_series_boardroom")
        i = await info(pg)
        check("un estilo de la colección no pisa el color elegido (burbujas)", color_de(i, ONLINE) == {"#FF00AA"}, str(color_de(i, ONLINE)))
        lc = next((x["color"] for x in i["leg"] if x["name"] == ONLINE), None)
        check("… ni la leyenda", (lc or "").upper() == "#FF00AA", str(lc))
        fb = next((x["border"] for x in i["filas"] if x["name"] == ONLINE), "")
        check("… ni la tabla de zonas", rgb("#FF00AA") in fb, fb)
        pal = ["#C9A45C", "#8FB8E8", "#EB8A7B", "#6FCF97", "#C5D3E3"]
        check("los demás canales toman la paleta de Boardroom", all(next(iter(color_de(i, c))) in pal for c in otros), str([color_de(i, c) for c in otros]))
        await pg.close()

        print("Orden de la leyenda")
        tam = {}
        for c in CLIENTES:
            tam[c["Canal"]] = tam.get(c["Canal"], 0) + c["Pedidos"]
        esperado = {"data": CANALES, "alpha": sorted(CANALES, key=str.lower), "size": sorted(CANALES, key=lambda c: -tam[c])}
        for modo in ("data", "alpha", "size"):
            obj = {} if modo == "data" else {"legend": {"order": modo}}
            pg = await page(b, dataview({**obj, **tabla}), name=f"07_orden_{modo}")
            i = await info(pg)
            orden = [x["name"] for x in i["leg"]]
            check(f"leyenda en orden '{modo}'", orden == esperado[modo], f"{orden} vs {esperado[modo]}")
            check(f"tabla de zonas en el mismo orden ('{modo}')", [x["name"] for x in i["filas"]] == esperado[modo], str([x["name"] for x in i["filas"]]))
            await pg.close()
        cnt = {}
        for c in CLIENTES:
            cnt[c["Canal"]] = cnt.get(c["Canal"], 0) + 1
        pg = await page(b, dataview({"legend": {"order": "size"}}, size=False))
        i = await info(pg)
        esp = sorted(CANALES, key=lambda c: (-cnt[c], CANALES.index(c)))
        check("sin Size, 'By size' ordena por número de puntos", [x["name"] for x in i["leg"]] == esp, f"{[x['name'] for x in i['leg']]} vs {esp}")
        await pg.close()

        print("Tamaño real de informe (Pro: leyenda, tabla, etiquetas, recuentos, tendencia)")
        lleno = {"zoneTable": {"show": True}, "dataPoints": {"showLabels": True}, "cards": {"show": True}, "trendLine": {"show": True},
                 "upperZones": {"lineCount": 2, "line1Value": 50000, "line2Value": 150000}, "referenceLines": {"yRef": 0.2}}
        grande = None
        for W, H, nom in [(1100, 640, "08_grande"), (500, 300, "09_mosaico_500"), (380, 260, "10_mosaico_380")]:
            pg = await page(b, dataview(lleno), W=W, H=H, name=nom)
            i = await info(pg)
            check(f"{W}×{H}: ningún texto por debajo de 8 px", i["minFont"] >= 8, f"min {i['minFont']} max {i['maxFont']}")
            check(f"{W}×{H}: nada se sale del visual", not i["fuera"], str(i["fuera"][:4]))
            check(f"{W}×{H}: la tabla de zonas sigue ahí (se escala, no se quita)", i["tabla"], "")
            if grande is None:
                grande = i
            else:
                check(f"{W}×{H}: el texto encoge (marcas {i['tickSize']} < {grande['tickSize']})", i["tickSize"] < grande["tickSize"], "")
            await eventos(pg, f"{W}×{H}")
            await pg.close()

        print("Tabla de zonas con 5 zonas y nombres largos a tamaño de informe (debe caber sin perder columnas)")
        largo = {"zoneTable": {"show": True}, "upperZones": {"lineCount": 2, "line1Value": 50000, "line2Value": 150000,
                 "zone1Label": "Small & profitable", "zone2Label": "Stars of the year", "zone3Label": "Big accounts"},
                 "lowerZones": {"layout": "own", "lineCount": 1, "line1Value": 80000, "zone1Label": "Long tail", "zone2Label": "Sell a lot, earn little"},
                 "referenceLines": {"yRef": 0.2}}
        for W, H in [(1100, 640), (700, 420), (500, 320)]:
            pg = await page(b, dataview(largo), W=W, H=H, name=f"20_tabla_larga_{W}")
            r = await pg.evaluate("""() => { const c = document.querySelector('.bs-table'); if (!c) return null; const t = c.querySelector('table');
                const fs = parseFloat(getComputedStyle(c).fontSize);
                return { cabe: t.offsetWidth <= c.clientWidth + 1 && t.offsetHeight <= c.clientHeight + 1, w: t.offsetWidth, cw: c.clientWidth, fs,
                         cols: c.querySelectorAll('thead th').length }; }""")
            check(f"{W}×{H}: la tabla de zonas cabe entera (sin columnas cortadas)", r and r["cabe"], str(r))
            await pg.close()

        print("Cero del eje sin unidad")
        pg = await page(b, dataview({"axes": {"logX": False}}), name="21_cero")
        z = await pg.evaluate("() => [...document.querySelectorAll('svg text')].map(t => t.textContent).filter(t => /^\D*0\D*$/.test(t) || /0M|0K/.test(t))")
        check("el 0 del eje no lleva unidad (nada de '0M')", not any(t.strip().endswith(("0M", "0K")) and t.strip().rstrip("MK").strip("€$ ") == "0" for t in z), str(z[:6]))
        await pg.close()
        for est in ("ledger", "aurora"):
            pg = await page(b, dataview({**lleno, "style": {"template": est}}), W=380, H=260, name=f"11_mosaico_380_{est}")
            i = await info(pg)
            check(f"380×260 {est}: nada se sale y nada < 8 px", not i["fuera"] and i["minFont"] >= 8, f"{i['fuera'][:3]} min {i['minFont']}")
            await pg.close()
        pg = await page(b, dataview({**lleno, "accessibility": {"minTextSize": 11}}), W=380, H=260, name="12_minimo_11")
        i = await info(pg)
        check("mínimo de Accesibilidad 11 respetado a 380×260", i["minFont"] >= 11, f"min {i['minFont']}")
        await pg.close()

        print("Alto contraste")
        pg = await page(b, dataview({"style": {"template": "aurora"}, "accessibility": {"highContrast": "on", "focusColor": {"solid": {"color": "#FF00AA"}}, "focusWidth": 4}},
                                    elegidos={CANALES[0]: "#FF00AA"}), name="13_alto_contraste_forzado")
        i = await info(pg)
        fills = {c["fill"].upper() for c in i["circFill"]}
        check("forzado: burbujas en negro (ni estilo ni color elegido)", fills == {"#000000"}, str(fills))
        check("forzado: fondo blanco", "255, 255, 255" in i["bg"] or "#FFFFFF" in i["bg"].upper(), i["bg"])
        check("forzado: foco en el color del tema forzado y grosor 4", "#1A3FBF" in i["foco"].upper() and "4px" in i["foco"], i["foco"])
        await eventos(pg, "alto contraste forzado")
        await pg.close()
        pg = await page(b, dataview(), hc=True, name="14_alto_contraste_windows")
        i = await info(pg)
        fills = {c["fill"].upper() for c in i["circFill"]}
        check("Windows: burbujas en el primer plano del tema", fills == {"#FFFF00"}, str(fills))
        await pg.close()
        pg = await page(b, dataview({"accessibility": {"focusColor": {"solid": {"color": "#FF00AA"}}}}))
        i = await info(pg)
        check("foco: color de Accesibilidad", "#FF00AA" in i["foco"].upper() and "2px" in i["foco"], i["foco"])
        await pg.close()
        pg = await page(b, dataview())
        i = await info(pg)
        check("foco: sin tocar, el de la 1.1 (#005A9E)", "#005A9E" in i["foco"].upper(), i["foco"])
        await pg.close()

        print("Sin licencia")
        pro = {"trendLine": {"show": True}, "style": {"template": "aurora"}}
        pg = await page(b, dataview(pro), plan=None, edit=True, name="15_free_edicion")
        i = await info(pg)
        check("Free edición: estilo y tendencia en vista previa", i["bg"] != "" and i["trend"], f"{i['bg'][:30]} {i['trend']}")
        check("Free edición: marca de agua común con las funciones", bool(i["wm"]) and "trend line" in i["wm"] and "collection styles" in i["wm"], str(i["wm"]))
        notif = await pg.evaluate("() => __notif")
        check("Free edición: aviso de Power BI con las funciones", any("collection styles" in n for n in notif), str(notif[:1]))
        await eventos(pg, "free edición")
        await pg.close()
        pg = await page(b, dataview(pro), plan=None, edit=False, name="16_free_lectura")
        i = await info(pg)
        check("Free lectura: resultado gratis (Classic, sin tendencia)", i["bg"] == "" and not i["trend"], f"{i['bg'][:30]} {i['trend']}")
        check("Free lectura: sin marca de agua", not i["wm"], str(i["wm"]))
        await eventos(pg, "free lectura")
        await pg.close()
        pg = await page(b, dataview({"style": {"template": "soft"}, "legend": {"order": "alpha"}}, elegidos={CANALES[0]: "#FF00AA"}), plan=None, edit=False)
        i = await info(pg)
        check("Free lectura: plantillas gratis, orden y colores por serie siguen (gratis)", color_de(i, CANALES[0]) == {"#FF00AA"} and not i["wm"]
              and [x["name"] for x in i["leg"]] == sorted(CANALES, key=str.lower), str(color_de(i, CANALES[0])))
        await pg.close()

        print("Licencia: Service ID completo")
        for plan, quiere in [(PLAN_VIEJO, True), ("tino_callarisa.asymmetric-matrix-tcviz.bubble-scatter-pro", True), ("bubble-scatter-pro", True), (PLAN_AJENO, False)]:
            pg = await page(b, dataview(pro), plan=plan, edit=False)
            i = await info(pg)
            es_pro = i["trend"] and i["bg"] != ""
            check(f"{plan} → {'Pro' if quiere else 'Free (control)'}", es_pro == quiere, f"tendencia {i['trend']}, fondo {i['bg'][:20]}")
            await pg.close()

        print("Formato dinámico")
        pg = await page(b, dataview(legend=False, dinamico="€ #,0.00"))
        await pg.evaluate("() => { const c = document.querySelector('circle[data-idx=\"0\"]'); const r = c.getBoundingClientRect(); c.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: r.x + 2, clientY: r.y + 2 })); }")
        tip = await pg.evaluate("() => window.__tip && window.__tip.dataItems")
        vx = next((d["value"] for d in (tip or []) if d["displayName"] == "Ventas"), "")
        check("ayuda emergente con la cadena dinámica de la fila", "€" in vx, vx)
        i = await info(pg)
        check("eje X con la cadena dinámica (común a todas las filas)", any("€" in t for t in i["tickTexts"]), str(i["tickTexts"][:4]))
        await pg.close()

        print("Selección")
        pg = await page(b, dataview())
        await pg.evaluate("() => document.querySelector('g.bs-leg').dispatchEvent(new MouseEvent('click', { bubbles: true }))")
        n = await pg.evaluate("() => (window.__sel || []).length")
        check("clic en la leyenda: filtra con todas las filas del canal", n == sum(1 for c in CLIENTES if c["Canal"] == CANALES[0]), str(n))
        await eventos(pg, "selección")
        await pg.close()

        print("Sin datos")
        pg = await page(b, None, name="19_inicio")
        n = await pg.evaluate("() => document.querySelectorAll('.bs-landing').length")
        check("sin campos: pantalla de inicio", n == 1, str(n))
        await eventos(pg, "inicio")
        vacio = dataview({"style": {"template": "aurora"}})
        for c in vacio["categorical"]["categories"]:
            c["values"], c["identity"] = [], []
            c.pop("objects", None)
        for v in vacio["categorical"]["values"]:
            v["values"] = []
        await upd(pg, vacio)
        n = await pg.evaluate("() => [document.querySelectorAll('.bs-empty').length, document.querySelectorAll('circle[data-idx]').length]")
        check("filtro sin filas: aviso y ninguna burbuja", n == [1, 0], str(n))
        await eventos(pg, "sin filas")
        await pg.close()

        print("Consejos (edición)")
        pg = await page(b, dataview(guia=True), plan=None, edit=True, name="17_guia")
        g = await pg.evaluate("() => { const g = document.querySelector('.bs-guide'); return g ? Array.from(g.querySelectorAll('button')).map(b => b.textContent) : null; }")
        check("consejos: Report theme entre los estilos gratis", g and "Report theme" in g, str(g))
        check("consejos: fila de estilos Pro con los seis", g and all(x in g for x in ["Boardroom", "Ledger", "Editorial", "Signal", "Aurora", "Terrace"]), str(g))
        await pg.evaluate("() => Array.from(document.querySelectorAll('.bs-guide button')).find(b => b.textContent === 'Aurora').click()")
        per = await pg.evaluate("() => JSON.stringify(__persist[__persist.length - 1] || null)")
        check("consejos: un clic en Aurora guarda la plantilla", '"template": "aurora"' in per.replace('":"', '": "'), per)
        await eventos(pg, "consejos")
        await pg.close()
        for W, H in [(500, 300), (380, 260)]:
            pg = await page(b, dataview(guia=True), W=W, H=H, plan=None, edit=True, name=f"18_guia_{W}")
            r = await pg.evaluate("() => { const g = document.querySelector('.bs-guide'); if (!g) return null; const h = document.getElementById('host').getBoundingClientRect(), r = g.getBoundingClientRect();"
                                  " return { dentro: r.top >= h.top - 1 && r.bottom <= h.bottom + 1 && r.left >= h.left - 1 && r.right <= h.right + 1, fs: parseFloat(getComputedStyle(g).fontSize), alto: r.height }; }")
            check(f"consejos a {W}×{H}: dentro del visual y con texto ≥ 8 px", r and r["dentro"] and r["fs"] >= 8, str(r))
            await pg.close()

        print("Panel")
        pg = await page(b, dataview())
        orden = await pg.evaluate("() => __v.getFormattingModel().cards.map(c => c.uid.replace('-card', ''))")
        check("orden común: Style template primero; Axes, Legend y Accessibility al final", orden[0] == "style" and orden[-3:] == ["axes", "legend", "accessibility"], str(orden))
        check("Series colours justo después de Bubbles", orden[1:3] == ["dataPoints", "seriesColors"], str(orden))
        tpl = await pg.evaluate("() => { const c = __v.getFormattingModel().cards[0]; return c.groups[0].slices[0].control.properties.items.map(i => i.value); }")
        check("plantillas: Report theme primero, las 5 gratis y los 6 estilos Pro", tpl == ["report", "classic", "quadrant", "minimal", "soft", "dark",
              "boardroom", "ledger", "editorial", "signal", "aurora", "terrace"], str(tpl))
        await pg.close()
        pg = await page(b, dataview(legend=False))
        orden = await pg.evaluate("() => __v.getFormattingModel().cards.map(c => c.uid.replace('-card', ''))")
        check("sin Legend no hay tarjeta Series colours", "seriesColors" not in orden, str(orden))
        await pg.close()

        await b.close()
    print("\nTODO OK" if not FALLOS else f"\nFALLOS ({len(FALLOS)}): {FALLOS}")
    sys.exit(1 if FALLOS else 0)


if __name__ == "__main__":
    asyncio.run(main())
