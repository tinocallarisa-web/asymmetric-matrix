# -*- coding: utf-8 -*-
"""
Imágenes de la oferta (1366×768) de Bubble & Scatter Chart 1.2 con el visual REAL, sin Power BI Desktop: el bundle de
.tmp/drop (o el que diga DROP=<carpeta con pbiviz.json, visual.js y visual.css>) pintado en Chromium con el host simulado
de harness.py, licencia Pro simulada en el host (sin marca de agua) y los consejos apagados (style.guide false).
Receta de Calendar/tools/simulador/imagenes.py (24-11-2026).

Datos: Begudes Nord (empresa ficticia, datos/demo_rtm/csv_en): los puntos de venta de la zona Girona en 2025, una burbuja
por cliente. X = venta neta, Y = margen de contribución % (venta neta − coste de producto − logística − margen del
distribuidor, sobre venta neta), tamaño = litros, Legend = canal (subcanales agrupados en cuatro). Plantilla TCViz: fondo
#FAF9F5, tarjetas blancas radio 10, Poppins, paleta del tema TCViz (datos/demo_rtm/tema/TCViz.json).

Escribe en assets/: Screenshot.png (zonas asimétricas con nombre, colores elegidos, leyenda por tamaño), Screenshot_2.png
(Boardroom + tabla de zonas + recuentos), Screenshot_3.png (Aurora + tendencia con R², a tamaño de informe),
infographic-styles.png (docs/infographic-styles.html, que lleva dentro las capturas de estilos de .tmp/estilos/) y
bubble-scatter-infographic.png + infografic.png (docs/infographic.html).

    python tools/simulador/imagenes.py
    SOLO=capturas python tools/simulador/imagenes.py     # sin las infografías
"""
import asyncio, base64, csv, io, json, math, os, re, sys
from collections import defaultdict
from playwright.async_api import async_playwright

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import harness as H

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DROP = os.environ.get("DROP", H.DROP)
CSV = r"C:\tcviz\datos\demo_rtm\csv_en"
TEMA = r"C:\tcviz\datos\demo_rtm\tema\TCViz.json"
POPPINS = r"C:\tcviz\datos\demo_rtm\tema\Poppins"
LOGO = r"C:\tcviz\web\logos\tcviz-logo-light.svg"
ASSETS = os.path.join(ROOT, "assets")
DOCS = os.path.join(ROOT, "docs")
TMP = os.path.join(ROOT, ".tmp", "estilos")
ZONA, ANO = "Girona", "2025"

# Subcanal → canal de la leyenda (cuatro grupos que se leen).
CANAL = {"Bars & cafés": "Bars & cafés", "Restaurants": "Restaurants", "Catering": "Restaurants",
         "Supermarket": "Supermarkets", "Hypermarket": "Supermarkets", "Traditional store": "Shops", "Convenience": "Shops"}
# Colores elegidos en Series colours (tema TCViz): bares en azul, restaurantes en verde, súper en ocre, tiendas en morado.
ELEGIDOS = {"Bars & cafés": "#2B6CB0", "Restaurants": "#3E9C5B", "Supermarkets": "#D9A21B", "Shops": "#7A5FA8"}

_t = json.load(io.open(TEMA, encoding="utf-8"))
TEMA_TCVIZ = {"foreground": _t["foreground"], "background": _t["background"], "secondary": _t["foregroundNeutralSecondary"],
              "colors": _t["dataColors"]}


def leer():
    """Clientes de la zona en el año: [{Cliente, Canal, Ventas, Margen, Litros}] con margen de contribución %."""
    pdv = {r["outlet_id"]: r for r in csv.DictReader(io.open(os.path.join(CSV, "dim_outlet.csv"), encoding="utf-8-sig"))}
    agg = defaultdict(lambda: [0.0, 0.0, 0.0])
    for r in csv.DictReader(io.open(os.path.join(CSV, "fact_sales.csv"), encoding="utf-8-sig")):
        if not r["date"].startswith(ANO) or pdv[r["outlet_id"]]["zone"] != ZONA:
            continue
        a = agg[r["outlet_id"]]
        n = float(r["net_sales"])
        a[0] += n
        a[1] += n - float(r["product_cost"]) - float(r["logistics_cost"]) - float(r["distributor_margin"])
        a[2] += float(r["litres"])
    clientes = []
    for k, (v, m, l) in agg.items():
        if v <= 0:
            continue
        o = pdv[k]
        clientes.append({"Id": k, "Cliente": f"{o['outlet_name']} ({o['town']})", "Canal": CANAL[o["subchannel"]],
                         "Ventas": round(v, 2), "Margen": round(m / v, 4), "Litros": round(l, 1)})
    clientes.sort(key=lambda c: c["Id"])   # orden del modelo (id de punto de venta)
    return clientes


def dataview(clientes, objects=None, elegidos=None):
    """Vista categórica como la manda Power BI (la de harness.dataview con los datos de Begudes Nord)."""
    objects = json.loads(json.dumps(objects or {}))
    objects.setdefault("style", {}).setdefault("guide", False)
    n = len(clientes)
    cat = {"source": {"displayName": "Customer", "queryName": "dim_outlet.outlet", "roles": {"category": True}, "type": {"text": True}},
           "values": [c["Cliente"] for c in clientes], "identity": [{"r": i} for i in range(n)]}
    leg = {"source": {"displayName": "Channel", "queryName": "dim_outlet.channel", "roles": {"legend": True}, "type": {"text": True}},
           "values": [c["Canal"] for c in clientes], "identity": [{"l": i} for i in range(n)]}
    if elegidos:
        objs = [None] * n
        for canal, color in elegidos.items():
            fila = next(i for i, c in enumerate(clientes) if c["Canal"] == canal)
            objs[fila] = {"seriesColors": {"fill": {"solid": {"color": color}}}}
        leg["objects"] = objs
    vals = [{"source": {"displayName": "Net sales", "queryName": "m.NetSales", "roles": {"xValue": True}, "type": {"numeric": True},
                        "isMeasure": True, "format": "€#,0"}, "values": [c["Ventas"] for c in clientes]},
            {"source": {"displayName": "Margin %", "queryName": "m.MarginPct", "roles": {"yValue": True}, "type": {"numeric": True},
                        "isMeasure": True, "format": "0.0%"}, "values": [c["Margen"] for c in clientes]},
            {"source": {"displayName": "Litres", "queryName": "m.Litres", "roles": {"size": True}, "type": {"numeric": True},
                        "isMeasure": True, "format": "#,0"}, "values": [c["Litros"] for c in clientes]}]
    cols = [cat["source"], leg["source"]] + [v["source"] for v in vals]
    return {"metadata": {"objects": objects, "columns": cols}, "categorical": {"categories": [cat, leg], "values": vals}}


def uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()


def fuentes():
    return "".join(f"@font-face{{font-family:'Poppins';font-weight:{w};src:url('{uri(os.path.join(POPPINS, f), 'font/ttf')}')}}"
                   for w, f in ((400, "Poppins-Regular.ttf"), (500, "Poppins-Medium.ttf"), (600, "Poppins-SemiBold.ttf")))


def plantilla(pregunta, subtitulo, cuerpo, lateral, ancho_lat=300):
    return f"""<html><head><style>{fuentes()}
body{{margin:0;background:#FAF9F5;font-family:'Segoe UI',sans-serif;color:#3D3929}}
#lienzo{{width:1366px;height:768px;box-sizing:border-box;padding:22px 30px;display:flex;flex-direction:column;gap:16px}}
.cab{{display:flex;align-items:center;gap:20px}} .cab img{{height:40px}} .sep{{width:1px;height:40px;background:#DAD9D4}}
.cab h1{{font-family:Poppins;font-weight:600;font-size:25px;margin:0;line-height:1.15}}
.cab p{{margin:2px 0 0;font-size:13px;color:#6B6A63}}
.fila{{display:flex;gap:16px;flex:1;min-height:0}}
.tarjeta{{background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(61,57,41,.10);padding:14px;box-sizing:border-box}}
.lat{{width:{ancho_lat}px;display:flex;flex-direction:column;gap:14px}}
.lat h3{{font-family:Poppins;font-weight:600;font-size:14px;margin:0 0 6px;color:#2B6CB0}}
.lat p{{margin:0;font-size:13.5px;line-height:1.5;color:#535146}} .lat b{{color:#3D3929}}
.pro{{font-family:Poppins;font-size:10px;font-weight:600;color:#fff;background:#2B6CB0;border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:2px}}
.kpi .n{{font-family:Poppins;font-weight:600;font-size:30px;line-height:1.1}} .kpi .t{{font-size:12.5px;color:#6B6A63}}
.host{{position:relative;overflow:hidden}}
.bs-build{{display:none!important}}
.lista{{border-collapse:collapse;width:100%;font-size:12.5px;color:#535146}} .lista td{{padding:2.5px 6px;border-top:1px solid #EDE9DE}} .lista td.n{{text-align:right;font-variant-numeric:tabular-nums;color:#3D3929}} /* sello "build hh:mm:ss" de las builds de prueba: la de producción no lo lleva */
</style></head><body><div id="lienzo">
<div class="cab"><img src="{uri(LOGO, 'image/svg+xml')}"><div class="sep"></div><div><h1>{pregunta}</h1><p>{subtitulo}</p></div></div>
<div class="fila">{cuerpo}<div class="lat">{lateral}</div></div></div></body></html>"""


FALLOS = []


async def montar(b, html, hosts, W=1366, Hh=768, escala=1):
    """hosts: [(id, dataview, w, h)] → un visual en cada uno, con licencia Pro simulada y el tema TCViz."""
    guid = json.load(io.open(os.path.join(DROP, "pbiviz.json"), encoding="utf-8"))["visual"]["guid"]
    pg = await b.new_page(viewport={"width": W, "height": Hh}, device_scale_factor=escala)
    errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.set_content(html)
    await pg.add_style_tag(path=os.path.join(DROP, "visual.css"))
    await pg.add_script_tag(content=f"window.__plan = {json.dumps(H.PLAN)}; window.__hc = false; window.__locale = 'en-US'; "
                                    f"window.__theme = {json.dumps(TEMA_TCVIZ)};")
    await pg.add_script_tag(content=H.STUB)
    await pg.add_script_tag(path=os.path.join(DROP, "visual.js"))
    for hid, dv, w, h in hosts:
        await pg.evaluate("""([g, id, dv, w, h]) => { const v = powerbi.visuals.plugins[g].create({ element: document.getElementById(id), host: __host });
            window['v_' + id] = v; const o = () => ({ dataViews: [JSON.parse(JSON.stringify(dv))], viewport: {width: w, height: h}, type: 2, operationKind: 0, viewMode: 0, editMode: 0, jsonFilters: [] });
            v.update(o()); window['u_' + id] = () => v.update(o()); }""", [guid, hid, dv, w, h])
    await pg.wait_for_timeout(300)
    for hid, *_ in hosts:   # segunda pasada: la licencia ya está resuelta
        await pg.evaluate(f"() => window['u_{hid}']()")
    await pg.wait_for_timeout(400)
    for hid, *_ in hosts:
        wm = await pg.evaluate(f"() => {{ const w = document.querySelector('#{hid} .tcviz-wm'); return w && w.style.display !== 'none' && getComputedStyle(w).display !== 'none' ? w.textContent : ''; }}")
        if wm:
            FALLOS.append(f"{hid}: marca de agua visible con Pro ({wm})")
        g = await pg.evaluate(f"() => !!document.querySelector('#{hid} .bs-guide')")
        if g:
            FALLOS.append(f"{hid}: consejos visibles")
    if errs:
        FALLOS.append("errores de consola: " + " | ".join(errs[:3]))
    return pg


async def revisar(pg, hid, nombre):
    """Textos fuera del visual, tamaño mínimo y etiquetas de zona/recuento que se pisan entre sí."""
    r = await pg.evaluate(f"""() => {{ const h = document.getElementById('{hid}'), hr = h.getBoundingClientRect();
        const ts = Array.from(h.querySelectorAll('svg text, .bs-table th, .bs-table td')).filter(t => t.textContent.trim());
        const fuera = [], cajas = [];
        ts.forEach(t => {{ const r = t.getBoundingClientRect(); if (!r.width) return;
            if (r.left < hr.left - 1 || r.right > hr.right + 1 || r.top < hr.top - 1 || r.bottom > hr.bottom + 1.5) fuera.push(t.textContent);
            if (t.tagName.toLowerCase() === 'text' && !t.closest('[data-o="ticks"]') && t.getAttribute('data-o') !== 'ticks') cajas.push([t.textContent, r]); }});
        const pisan = [];
        for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {{
            const a = cajas[i][1], b = cajas[j][1];
            if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) pisan.push(cajas[i][0] + ' / ' + cajas[j][0]); }}
        const tam = ts.map(t => parseFloat(t.getAttribute('font-size') || getComputedStyle(t).fontSize));
        return {{ fuera: fuera.slice(0, 6), pisan: pisan.slice(0, 8), min: Math.min.apply(null, tam), n: h.querySelectorAll('circle[data-idx]').length }}; }}""")
    print(nombre, json.dumps(r, ensure_ascii=False))
    if r["fuera"]:
        FALLOS.append(f"{nombre}: texto fuera del visual {r['fuera']}")
    if r["pisan"]:
        FALLOS.append(f"{nombre}: textos que se pisan {r['pisan']}")
    if r["min"] < 8:
        FALLOS.append(f"{nombre}: texto de {r['min']} px")
    return r


def eur(v):
    return f"€{v / 1e6:.2f}M" if v >= 1e6 else f"€{v / 1e3:,.0f}K"


# ── Configuración del gráfico ────────────────────────────────────────────────────────────────────────────────────────
Y_CORTE = 0.35          # margen objetivo: la línea Y
X_ARRIBA = [20000]      # mitad superior: pequeños rentables | grandes rentables
X_ABAJO = [5000, 30000]  # mitad inferior (Pro, divisores propios): cola | a vigilar | venden mucho y ganan poco
ZONAS_ARRIBA = ["Small & profitable", "Stars"]
ZONAS_ABAJO = ["Long tail", "Watch", "Sell a lot, earn little"]
COLOR_ARRIBA = ["#A9C4E2", "#8BBF6A"]             # tema TCViz: azul claro, verde
COLOR_ABAJO = ["#DAD9D4", "#F0D9A0", "#E8A59C"]   # gris, ocre claro, rojo claro


ETIQUETAS = {"labelFontSize": 12, "labelColor": {"solid": {"color": "#3D3929"}}, "labelBgOpacity": 85}


def zonas(extra=None):
    o = {"axes": {"logX": True, "xTitle": "Net sales 2025 (log)", "yTitle": "Contribution margin %"},
         "referenceLines": {"yRef": Y_CORTE},
         "upperZones": {"lineCount": len(X_ARRIBA), **{f"line{i + 1}Value": v for i, v in enumerate(X_ARRIBA)},
                        **{f"zone{i + 1}Label": t for i, t in enumerate(ZONAS_ARRIBA)},
                        **{f"zone{i + 1}Color": {"solid": {"color": c}} for i, c in enumerate(COLOR_ARRIBA)},
                        **{f"zone{i + 1}Opacity": 30 for i in range(len(COLOR_ARRIBA))}, **ETIQUETAS},
         "lowerZones": {"layout": "own", "lineCount": len(X_ABAJO), **{f"line{i + 1}Value": v for i, v in enumerate(X_ABAJO)},
                        **{f"zone{i + 1}Label": t for i, t in enumerate(ZONAS_ABAJO)},
                        **{f"zone{i + 1}Color": {"solid": {"color": c}} for i, c in enumerate(COLOR_ABAJO)},
                        **{f"zone{i + 1}Opacity": 30 for i in range(len(COLOR_ABAJO))}, **ETIQUETAS},
         "legend": {"order": "size"}}
    for k, v in (extra or {}).items():
        o.setdefault(k, {}).update(v)
    return o


def zonas_sin_color(extra=None):
    """Las mismas zonas y nombres, sin colores propios: el estilo de la colección pinta zonas y series."""
    o = zonas(extra)
    for mitad in ("upperZones", "lowerZones"):
        for k in [k for k in o[mitad] if re.match(r"zone\dColor|zone\dOpacity", k)]:
            del o[mitad][k]
    o["upperZones"].pop("labelColor", None); o["lowerZones"].pop("labelColor", None)
    return o


def r2_lineal(clientes):
    """R² de la recta margen ~ ventas en unidades de dato: la que ajusta el visual (con eje log la dibuja como curva)."""
    xs = [c["Ventas"] for c in clientes]; ys = [c["Margen"] for c in clientes]
    n = len(xs); mx = sum(xs) / n; my = sum(ys) / n
    sxy = sum((a - mx) * (b - my) for a, b in zip(xs, ys)); sxx = sum((a - mx) ** 2 for a in xs); syy = sum((b - my) ** 2 for b in ys)
    return sxy * sxy / (sxx * syy)


def recuento(clientes):
    """Clientes y venta por zona (como las cuenta el visual: mitad por la línea Y, columna por los divisores)."""
    z = defaultdict(lambda: [0, 0.0])
    for c in clientes:
        arriba = c["Margen"] >= Y_CORTE
        cortes, nombres = (X_ARRIBA, ZONAS_ARRIBA) if arriba else (X_ABAJO, ZONAS_ABAJO)
        k = nombres[sum(1 for x in cortes if c["Ventas"] >= x)]
        z[k][0] += 1
        z[k][1] += c["Ventas"]
    return z


async def main():
    if not os.path.exists(os.path.join(DROP, "visual.js")):
        print("Falta el bundle:", DROP); sys.exit(2)
    clientes = leer()
    os.makedirs(ASSETS, exist_ok=True); os.makedirs(TMP, exist_ok=True)
    total = sum(c["Ventas"] for c in clientes)
    z = recuento(clientes)
    malos = sorted((c for c in clientes if c["Margen"] < Y_CORTE and c["Ventas"] >= X_ABAJO[-1]), key=lambda c: -c["Ventas"])
    print(f"{len(clientes)} clientes, {eur(total)}; zonas:", {k: (v[0], eur(v[1])) for k, v in z.items()})
    sub = f"Bubble &amp; Scatter Chart 1.2 · Begudes Nord · fictitious beverage distributor · {len(clientes)} customers in {ZONA}, {ANO}"
    W, Hh = 1000, 650

    async with async_playwright() as p:
        b = await p.chromium.launch()

        # 1 · Zonas asimétricas con nombre, colores elegidos por canal y leyenda por tamaño.
        cuerpo = f'<div class="tarjeta host" id="c1" style="width:{W}px;height:{Hh}px;padding:0"></div>'
        nm, vm = z[ZONAS_ABAJO[-1]]
        lat = (f'<div class="tarjeta kpi"><div class="n">{nm} customers</div><div class="t">sell over {eur(X_ABAJO[-1])} a year below the '
               f'{Y_CORTE:.0%} margin line — {eur(vm)}, {vm / total:.0%} of the zone\'s sales</div></div>'
               f'<div class="tarjeta kpi"><div class="n">{malos[0]["Margen"]:.1%}</div><div class="t">margin of the biggest one, '
               f'{malos[0]["Cliente"].split(" (")[0]} ({eur(malos[0]["Ventas"])})</div></div>'
               '<div class="tarjeta"><h3>Zones that fit the question</h3><p>Two zones above the target line and '
               '<b>three below it</b>: each half with its own dividers<span class="pro">PRO</span>, names and colours.</p>'
               '<p style="margin-top:8px"><b>Series colours</b> picked per channel, and the legend ordered <b>by size</b>.</p></div>')
        pg = await montar(b, plantilla("Which customers sell a lot but earn little?", sub, cuerpo, lat),
                          [("c1", dataview(clientes, zonas(), ELEGIDOS), W, Hh)])
        await pg.screenshot(path=os.path.join(ASSETS, "Screenshot.png"))
        await revisar(pg, "c1", "Screenshot")
        await pg.close()

        # 2 · Boardroom (Pro) con la tabla de zonas (Pro) y el recuento en cada zona (Pro). Sin colores propios de zona ni de
        # serie: lo pinta todo el estilo. A todo el ancho, para que la tabla quepa a la derecha sin comerse el gráfico.
        W2, H2 = 1306, 540
        cuerpo = f'<div class="tarjeta host" id="c2" style="width:{W2}px;height:{H2}px;padding:0;flex:none"></div>'
        estrellas = z[ZONAS_ARRIBA[-1]]
        lat = (f'<div class="tarjeta kpi" style="flex:1"><div class="n">{estrellas[0]} stars · {estrellas[1] / total:.0%}</div>'
               f'<div class="t">{estrellas[0] / len(clientes):.0%} of the customers bring {eur(estrellas[1])} of {eur(total)} — above the margin line</div></div>'
               f'<div class="tarjeta kpi" style="flex:1"><div class="n">{z[ZONAS_ABAJO[0]][0]} in the long tail</div><div class="t">'
               f'small and below {Y_CORTE:.0%}: {eur(z[ZONAS_ABAJO[0]][1])} between them, {z[ZONAS_ABAJO[0]][1] / total:.0%} of sales</div></div>'
               '<div class="tarjeta" style="flex:1.7"><h3>Zone table<span class="pro">PRO</span> · counts<span class="pro">PRO</span> · Boardroom<span class="pro">PRO</span></h3>'
               '<p>Each channel across the five zones as <b>% of row</b> — or % of column, points, sum of Size. Click a cell to filter the page. '
               'The zones exist only in the visual, so no other visual can cross them.</p></div>')
        html = plantilla("Where does each channel land?", sub, cuerpo, lat).replace(
            ".fila{display:flex;gap:16px;", ".fila{display:flex;flex-direction:column;gap:14px;").replace(
            ".lat{width:300px;display:flex;flex-direction:column;", ".lat{display:flex;flex-direction:row;flex:1;")
        pg = await montar(b, html, [("c2", dataview(clientes, zonas_sin_color({"style": {"template": "boardroom"},
                                                                                "zoneTable": {"show": True, "sizePct": 40},
                                                                                "cards": {"show": True, "showPercent": True}})), W2, H2)])
        await pg.screenshot(path=os.path.join(ASSETS, "Screenshot_2.png"))
        await revisar(pg, "c2", "Screenshot_2")
        await pg.close()

        # 3 · Aurora (Pro) con la línea de tendencia y R² (Pro), a tamaño de informe (660×440), con la lista de los clientes de la zona roja debajo.
        W3, H3 = 660, 440
        r2 = r2_lineal(clientes)
        top = max(clientes, key=lambda c: c["Ventas"])
        cuerpo = (f'<div style="display:flex;flex-direction:column;gap:16px;width:{W3}px">'
                  f'<div class="tarjeta host" id="c3" style="width:{W3}px;height:{H3}px;padding:0;flex:none"></div>'
                  f'<div class="tarjeta" style="flex:1;padding:12px 16px"><h3 style="font-family:Poppins;font-weight:600;font-size:14px;margin:0 0 6px;color:#2B6CB0">'
                  f'Sell a lot, earn little — the {len(malos)} customers</h3><table class="lista">'
                  + "".join(f'<tr><td>{c["Cliente"]}</td><td>{c["Canal"]}</td><td class="n">{eur(c["Ventas"])}</td><td class="n">{c["Margen"]:.1%}</td></tr>' for c in malos)
                  + '</table></div></div>')
        lat = (f'<div class="tarjeta kpi"><div class="n">R² {r2:.2f}</div><div class="t">size alone does not predict margin: what a customer earns us '
               f'depends on its terms and mix, not on how much it buys.</div></div>'
               '<div class="tarjeta"><h3>Trend line<span class="pro">PRO</span></h3><p>Least-squares line with <b>R²</b>. On a log axis the straight fit '
               f'is drawn as a curve — here pulled up by the {eur(top["Ventas"])} hypermarket. Colour, width and style in the Format pane.</p></div>'
               '<div class="tarjeta"><h3>Style: Aurora<span class="pro">PRO</span></h3><p>Background, text, grid, series palette and zone '
               'tints in one click, shared with the other TCViz visuals. A colour you set yourself always wins.</p></div>'
               f'<div class="tarjeta"><h3>Report tile size</h3><p>At <b>{W3} × {H3} px</b> ticks, zone names, legend and R² scale down with the visual '
               'instead of overflowing.</p></div>')
        html = plantilla("Do bigger customers earn more?", sub, cuerpo, lat, ancho_lat=1306 - W3 - 16).replace(
            "</style>", ".lat > .tarjeta{flex:1;display:flex;flex-direction:column;justify-content:center}</style>", 1)
        pg = await montar(b, html,
                          [("c3", dataview(clientes, zonas_sin_color({"style": {"template": "aurora"},
                                                                       "trendLine": {"show": True, "showR2": True}})), W3, H3)])
        await pg.screenshot(path=os.path.join(ASSETS, "Screenshot_3.png"))
        await revisar(pg, "c3", "Screenshot_3")
        r2v = await pg.evaluate("() => Array.from(document.querySelectorAll('#c3 text')).map(t => t.textContent).find(t => t.startsWith('R²'))")
        print("R² del visual:", r2v, "· calculado:", f"{r2:.2f}")
        if not r2v or r2v.replace(",", ".") != f"R² {r2:.2f}":
            FALLOS.append(f"R² del visual {r2v} ≠ {r2:.2f}")
        await pg.close()

        # 4 · Estilos para la infografía: los mismos clientes en Report theme (tema TCViz), las 5 plantillas gratis y los 6
        # estilos Pro. Línea Y y divisor de arriba fijos, mitad de abajo espejo y sin nombres de zona (a este tamaño serían
        # ruido); Four quadrants pone las líneas en la media, que es lo suyo. A doble resolución: la infografía los muestra a
        # unos 200 px de ancho.
        ew, eh = 360, 300
        estilos = ["report", "classic", "quadrant", "minimal", "soft", "dark", "boardroom", "ledger", "editorial", "signal", "aurora", "terrace"]
        # Dark background es para páginas oscuras: se pinta sobre fondo oscuro (sobre blanco, leyenda y ejes no se leen).
        celdas = "".join(f'<div class="host" id="e_{t}" style="width:{ew}px;height:{eh}px;background:{"#252423" if t == "dark" else "#fff"}"></div>' for t in estilos)
        html = (f"<html><head><style>.bs-build{{display:none!important}}</style></head><body style='margin:0;background:#fff'>"
                f"<div style='display:grid;grid-template-columns:repeat(4,{ew}px);gap:10px'>{celdas}</div></body></html>")
        mini = {"axes": {"logX": True, "xTitle": "Net sales (log)", "yTitle": "Margin %"}, "referenceLines": {"yRef": Y_CORTE},
                "upperZones": {"lineCount": 1, "line1Value": X_ARRIBA[0]}, "legend": {"order": "size"}}
        pg = await montar(b, html, [(f"e_{t}", dataview(clientes, {**json.loads(json.dumps(mini)), "style": {"template": t}}), ew, eh)
                                    for t in estilos], escala=2)
        for t in estilos:
            await (await pg.query_selector(f"#e_{t}")).screenshot(path=os.path.join(TMP, f"{t}.png"))
            await revisar(pg, f"e_{t}", f"estilo {t}")
        await pg.close()

        if os.environ.get("SOLO") == "capturas":
            await b.close()
            for f in FALLOS:
                print("  FALLO", f)
            return
        # 5 · Infografías: docs/*.html → assets/*.png. La de estilos lleva las capturas de arriba incrustadas. La general se
        # guarda con los dos nombres que ya tenía la oferta (bubble-scatter-infographic.png y el antiguo infografic.png).
        incrustar_estilos(estilos)
        for nombre, destinos in (("infographic", ["bubble-scatter-infographic.png", "infografic.png"]),
                                 ("infographic-styles", ["infographic-styles.png"])):
            pg = await b.new_page(viewport={"width": 1366, "height": 768}, device_scale_factor=1)
            await pg.goto("file:///" + os.path.join(DOCS, nombre + ".html").replace("\\", "/"))
            await pg.wait_for_load_state("networkidle")
            await pg.evaluate("() => document.fonts.ready")
            await pg.add_style_tag(content="#dl-bar,#fit-check,#dl,#warn{display:none!important}")
            await pg.wait_for_timeout(400)
            alto = await pg.evaluate("() => document.getElementById('infographic').scrollHeight")
            if alto > 768:
                FALLOS.append(f"{nombre}.html se desborda: {alto} px")
            for d in destinos:
                await (await pg.query_selector("#infographic")).screenshot(path=os.path.join(ASSETS, d))
            await pg.close()

        await b.close()
    for f in FALLOS:
        print("  FALLO", f)


def incrustar_estilos(estilos):
    """Sustituye en docs/infographic-styles.html cada <img data-estilo="x"> por la captura de .tmp/estilos/x.png."""
    p = os.path.join(DOCS, "infographic-styles.html")
    s = io.open(p, encoding="utf-8").read()
    for t in estilos:
        s = re.sub(rf'(<img data-estilo="{t}" src=")[^"]*(")', lambda m: m.group(1) + uri(os.path.join(TMP, t + ".png"), "image/png") + m.group(2), s)
    io.open(p, "w", encoding="utf-8", newline="\n").write(s)


if __name__ == "__main__":
    asyncio.run(main())
