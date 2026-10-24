# -*- coding: utf-8 -*-
"""stringResources (12 idiomas), la lista de pbiviz.json y src/strings.ts para Bubble & Scatter Chart.

Inglés: displayName de capabilities.json (por displayNameKey), los displayName/displayNameKey de src/settings.ts y los
this.t/tf("Clave", "inglés") de src/visual.ts. El resto de idiomas: tools/i18n_bs.py, por TEXTO inglés (P) y por
patrón numerado (PAT, "Zone {n} colour"). Ejecutar desde la raíz:  python tools/i18n.py
Power BI Desktop solo traduce con getDisplayName las claves de capabilities.json: los textos propios del visual
(avisos, consejos, pantalla de inicio) viajan además en src/strings.ts, que t() consulta primero.
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from i18n_bs import P, PAT

L = ["pt-BR", "fr-FR", "de-DE", "it-IT", "nl-NL", "pl-PL", "ja-JP", "zh-CN", "ko-KR", "es-ES"]   # orden de las columnas
TODOS = ["en-US", "es-ES", "pt-BR", "pt-PT", "fr-FR", "de-DE", "it-IT", "nl-NL", "pl-PL", "ja-JP", "zh-CN", "ko-KR"]


def traducir(v):
    if v in P:
        return P[v]
    for pat, cols in PAT.items():
        rx = "^" + re.escape(pat).replace(re.escape("{n}"), r"(\d+)") + "$"
        m = re.match(rx, v)
        if m:
            return [c.replace("{n}", m.group(1)) for c in cols]
    return None


def main():
    caps = json.load(io.open(os.path.join(ROOT, "capabilities.json"), encoding="utf-8"))
    en = {}

    def poner(k, v):
        if k and v and k not in en:
            en[k] = v
    for r in caps["dataRoles"]:
        poner(r.get("displayNameKey"), r["displayName"]); poner(r.get("descriptionKey"), r.get("description"))
    for o in caps["objects"].values():
        poner(o.get("displayNameKey"), o["displayName"])
        for p in o["properties"].values():
            poner(p.get("displayNameKey"), p["displayName"])
            for e in p["type"].get("enumeration", []):
                poner(e.get("displayNameKey"), e["displayName"])
    st = io.open(os.path.join(ROOT, "src", "settings.ts"), encoding="utf-8").read()
    for dn, key in re.findall(r'displayName: "([^"]+)", displayNameKey: "([^"]+)"', st):
        poner(key, dn)
    for dn, key in re.findall(r'item\("[^"]*", "([^"]+)", "([^"]+)"\)', st):
        poner(key, dn)
    for dn, key in re.findall(r'group\([^,]+, "([^"]+)", "([^"]+)"', st):
        poner(key, dn)
    src = io.open(os.path.join(ROOT, "src", "visual.ts"), encoding="utf-8").read()
    rt = dict(re.findall(r'this\.tf?\(\s*"([A-Za-z0-9_]+)"\s*,\s*"((?:[^"\\]|\\.)*)"', src))
    for k, v in rt.items():
        poner(k, json.loads('"' + v + '"'))
    faltan = sorted({v for v in en.values() if traducir(v) is None})
    if faltan:
        print("SIN TRADUCIR (quedan en inglés):", json.dumps(faltan, ensure_ascii=False))
    out = {"en-US": en}
    for i, lg in enumerate(L):
        out[lg] = {k: ((traducir(v) or [v] * 10)[i]) for k, v in en.items()}
    out["pt-PT"] = dict(out["pt-BR"])
    for lg, d in out.items():
        p = os.path.join(ROOT, "stringResources", lg, "resources.resjson")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        io.open(p, "w", encoding="utf-8", newline="\n").write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
    pj = os.path.join(ROOT, "pbiviz.json")
    pb = json.load(io.open(pj, encoding="utf-8"))
    pb["stringResources"] = [f"stringResources/{lg}/resources.resjson" for lg in TODOS]
    io.open(pj, "w", encoding="utf-8", newline="\n").write(json.dumps(pb, indent=4, ensure_ascii=False) + "\n")
    capstxt = io.open(os.path.join(ROOT, "capabilities.json"), encoding="utf-8").read()
    # En el bundle: todo lo que t() pide y no está declarado en capabilities (Desktop no lo traduciría).
    # Grupos del panel: tampoco están en capabilities; el visual pone su displayName traducido desde el bundle.
    grupos = {k for _dn, k in re.findall(r'group\([^,]+, "([^"]+)", "([^"]+)"', st)}
    runtime = sorted(k for k in set(rt) | grupos if f'"{k}"' not in capstxt)
    tabla = {lg: {k: out[lg][k] for k in runtime if out[lg].get(k) and out[lg][k] != en[k]} for lg in TODOS if lg != "en-US"}
    ts = ["/**",
          " * Textos que escribe el propio visual, por idioma. Power BI Desktop solo traduce con getDisplayName las claves",
          " * declaradas en capabilities.json; estas viajan en el bundle. Generado por tools/i18n.py: no editar a mano.",
          " */",
          "export const STRINGS: Record<string, Record<string, string>> = " + json.dumps(tabla, ensure_ascii=False, indent=4) + ";", ""]
    io.open(os.path.join(ROOT, "src", "strings.ts"), "w", encoding="utf-8", newline="\n").write("\n".join(ts))
    print(len(en), "claves ·", len(TODOS), "idiomas ·", len(runtime), "en el bundle")


if __name__ == "__main__":
    main()
