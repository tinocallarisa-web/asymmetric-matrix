/**
 * visual.ts — Bubble & Scatter Chart by TCViz (GUID asymmetricMatrixTCVIZ, antes "Asymmetric Matrix")
 *
 * Gráfico de dispersión y burbujas con cuadrantes y zonas:
 *   · una línea Y horizontal (valor fijo, media o mediana)
 *   · hasta 4 divisores verticales arriba; abajo, los mismos (cuadrantes), una sola zona o los suyos (Pro)
 *
 * Interacción: clic en una burbuja → filtra por ese punto (Ctrl suma); clic en el fondo de una zona → todos sus
 * puntos; clic fuera → limpia. Teclado: Tab / flechas entre zonas, Enter o Espacio, Escape, Shift+F10.
 * SVG con createElementNS + textContent: sin D3 y sin innerHTML.
 */

"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService, formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import {
    HtmlSubSelectableClass, HtmlSubSelectionHelper, SubSelectableDisplayNameAttribute,
    SubSelectableObjectNameAttribute, SubSelectableTypeAttribute,
} from "powerbi-visuals-utils-onobjectutils";
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions      = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual                  = powerbi.extensibility.visual.IVisual;
import IVisualHost              = powerbi.extensibility.visual.IVisualHost;
import ISelectionId             = powerbi.visuals.ISelectionId;
import ISelectionManager        = powerbi.extensibility.ISelectionManager;
import ILocalizationManager     = powerbi.extensibility.ILocalizationManager;
import VisualUpdateType         = powerbi.VisualUpdateType;
import VisualTooltipDataItem    = powerbi.extensibility.VisualTooltipDataItem;

import { VisualFormattingSettingsModel, ZonesSettings, TEMPLATES, GEOMETRY, ZONE_COLORS_DEFAULT } from "./settings";
import { getLicenseState, LicenseState, LicenseNotifier, FREE_STATE } from "./licenseManager";
import { STRINGS } from "./strings";
import { LANDING_ICON } from "./landingIcon";

/** Sello de compilación. Vacío en producción; build-test.js lo rellena en las builds de prueba. */
const BUILD_MARKER = "";

const URL_GUIDE   = "https://tinocallarisa-web.github.io/asymmetric-matrix/support.html";
const URL_PRODUCT = "https://tcviz.com/product/asymmetric-matrix/?ref=visual-asymmetric";
const URL_VIDEO   = "https://www.youtube.com/watch?v=5esHnUDLUok";
const TITLE       = "Bubble & Scatter Chart";

// ── SVG ───────────────────────────────────────────────────────────────────────

const SVG_NS = "http://www.w3.org/2000/svg";
type Attrs = { [key: string]: string | number };

/** Crea un elemento SVG con setAttribute y textContent: nada pasa por un parser HTML. */
function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs, parent?: Element, text?: string): SVGElementTagNameMap[K] {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k of Object.keys(attrs)) el.setAttribute(k, String(attrs[k]));
    if (text !== undefined) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
}
const f1 = (n: number): string => n.toFixed(1);

/** Mezcla un color hex con blanco (t > 0) o con negro (t < 0). */
function tono(hex: string, t: number): string {
    const v = String(hex || "#888888").replace("#", "");
    const f = v.length === 3 ? v.split("").map(c => c + c).join("") : v.slice(0, 6);
    const ch = [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16) || 0);
    const out = ch.map(c => Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t)));
    return "#" + out.map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function oscuro(hex: string): boolean {
    const v = String(hex || "").replace("#", "");
    if (v.length < 6) return false;
    const [r, g, b] = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45;
}
const dash = (style: string): string => style === "dashed" ? "8,4" : style === "dotted" ? "2,4" : "";

/** Marcas "bonitas" de un eje (1, 2, 2,5, 5 × 10^n). */
function niceTicks(min: number, max: number, count: number): number[] {
    const span = max - min;
    if (!(span > 0) || !isFinite(span)) return [min];
    const raw = span / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? raw;
    const out: number[] = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return out;
}
function mediana(v: number[]): number {
    if (!v.length) return 0;
    const s = v.slice().sort((a, b) => a - b), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const media = (v: number[]): number => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;

// ── Datos ─────────────────────────────────────────────────────────────────────

interface Point {
    x: number;
    y: number;
    r: number;
    s: number;                  // valor del campo Size (NaN sin él): peso en la leyenda
    label: string;
    series: string | null;
    fx: string | null;          // color de una regla fx para esta fila
    id: ISelectionId;
    highlighted: boolean;
    tips: VisualTooltipDataItem[];
}

interface Line { v: number; color: string; }
interface LegItem { name: string; text: string; w: number; share?: string; lead?: boolean; }

/** Lo resuelto para un pintado: líneas efectivas, zonas y en qué zona cae cada punto. */
interface Layout {
    yRef: number;
    upper: Line[];
    lower: Line[];
    lowerMode: "mirror" | "single" | "own";
}

function zoneIndex(x: number, lines: Line[]): number {
    for (let i = 0; i < lines.length; i++) if (x < lines[i].v) return i;
    return lines.length;
}

// ── Visual ────────────────────────────────────────────────────────────────────

export class Visual implements IVisual {
    private host: IVisualHost;
    private root: HTMLElement;
    private selectionManager: ISelectionManager;
    private localization: ILocalizationManager;
    private settingsSvc: FormattingSettingsService;
    private settings: VisualFormattingSettingsModel;
    private subSelectionHelper: HtmlSubSelectionHelper;
    public visualOnObjectFormatting: powerbi.extensibility.visual.VisualOnObjectFormatting;

    private license: LicenseState = { ...FREE_STATE, resolved: false };
    private notifier: LicenseNotifier | null = null;

    private lastOptions: VisualUpdateOptions | null = null;
    private points: Point[] = [];
    private names = { x: "X", y: "Y", size: "", category: "", legend: "" };
    private fmtX: (v: number) => string = String;
    private fmtY: (v: number) => string = String;
    private fmtXcol = "";
    private fmtYcol = "";
    private fmtS: (v: number) => string = String;
    private layout: Layout | null = null;
    private editing = false;
    private formatMode = false;
    private tplVisto: string | null = null;
    /** Se pidió escala logarítmica pero hay valores ≤ 0: se dibuja lineal y, editando, se dice. */
    private logFallback = false;
    /** Campos de X e Y del último dato: si cambian, el rango fijo vuelve a aprender. */
    private fieldSignature = "";
    /** Lo que de verdad necesita la tabla de zonas (ancho a la derecha, alto debajo), medido en el pintado anterior. */
    private tableFit = 0;
    private refitting = false;

    // Rango aprendido para "ejes fijos" (Pro): solo crece.
    private fixedDomain: { xMin: number; xMax: number; yMin: number; yMax: number } | null = null;

    // Selección: índices de punto; y, si vino de un clic en zona, cuál.
    private selected = new Set<number>();
    private selectedZone: string | null = null;
    private focusedZone: string | null = null;

    private static instanceCount = 0;
    private readonly clipId = "bsClip" + (++Visual.instanceCount);

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.localization = this.host.createLocalizationManager();
        this.selectionManager = this.host.createSelectionManager();
        this.settingsSvc = new FormattingSettingsService(this.localization);
        this.settings = new VisualFormattingSettingsModel();

        this.root = document.createElement("div");
        this.root.className = "bs";
        options.element.appendChild(this.root);

        // Marcadores, panel de selección, "borrar filtros": solo repinta. Sin eventos de render ni persistProperties.
        this.selectionManager.registerOnSelectCallback((ids: ISelectionId[]) => {
            this.selectedZone = null;
            this.selected = this.indicesFrom(ids);
            this.redraw();
        });

        this.notifier = new LicenseNotifier(this.host);
        // ISPRO_BLOCK_START
        getLicenseState(this.host).then((state: LicenseState) => {
            this.license = state;
            // La licencia resuelve después del primer pintado: repintar, sin eventos (no es un update()).
            this.redraw();
        });
        // ISPRO_BLOCK_END

        this.root.addEventListener("click", (e: MouseEvent) => this.onClick(e));
        this.root.addEventListener("contextmenu", (e: MouseEvent) => this.onContextMenu(e));
        this.root.addEventListener("mousemove", (e: MouseEvent) => this.onMouseMove(e));
        this.root.addEventListener("mouseleave", () => this.host.tooltipService.hide({ immediately: false, isTouchEvent: false }));
        this.root.addEventListener("keydown", (e: KeyboardEvent) => this.onKeyDown(e));
        this.root.addEventListener("focusin", (e: FocusEvent) => {
            const t = e.target as Element;
            if (t?.classList?.contains("bs-zone")) this.focusedZone = t.getAttribute("data-zone");
        });

        this.subSelectionHelper = HtmlSubSelectionHelper.createHtmlSubselectionHelper({
            hostElement: options.element,
            subSelectionService: options.host.subSelectionService,
            selectionIdCallback: () => undefined,
        });
        this.visualOnObjectFormatting = {
            getSubSelectionStyles: (subs) => this.getSubSelectionStyles(subs),
            getSubSelectionShortcuts: (subs) => this.getSubSelectionShortcuts(subs),
            getSubSelectables: (filter) => this.subSelectionHelper.getAllSubSelectables(filter),
        };
    }

    // ── Textos ────────────────────────────────────────────────────────────────

    /** Texto por clave: primero la tabla del bundle (Desktop no traduce claves que no estén en capabilities). */
    private t(key: string, fallback: string): string {
        const loc = String(this.host?.locale || "");
        const tabla = STRINGS[loc] || STRINGS[Object.keys(STRINGS).find(l => l.slice(0, 2) === loc.slice(0, 2)) || ""];
        if (tabla && tabla[key]) return tabla[key];
        try {
            const s = this.localization?.getDisplayName(key);
            return s && s !== key ? s : fallback;
        } catch { return fallback; }
    }

    private tf(key: string, fallback: string, ...args: string[]): string {
        return this.t(key, fallback).replace(/\{(\d+)\}/g, (_m, i) => args[Number(i)] ?? "");
    }

    private interactionsAllowed(): boolean {
        const h = this.host as any;
        return (h?.hostCapabilities?.allowInteractions ?? h?.allowInteractions) !== false;
    }

    // ── Update: eventos de render 1:1 ─────────────────────────────────────────

    public update(options: VisualUpdateOptions): void {
        // Un renderingStarted y un Finished/Failed por update(). Los repintados que no vienen de update() (licencia,
        // clic, marcadores) usan redraw(), que no emite eventos (rechazo 1200.1.2 de Likert).
        this.host.eventService.renderingStarted(options);
        try {
            this.updateSync(options);
            this.host.eventService.renderingFinished(options);
        } catch (e) {
            this.host.eventService.renderingFailed(options, String(e));
        }
    }

    private updateSync(options: VisualUpdateOptions): void {
        const vm = (options as any).viewMode;
        this.editing = typeof vm === "number" && vm !== 0;
        this.formatMode = !!(options as any).formatMode;
        this.subSelectionHelper.setFormatMode(this.formatMode);
        this.root.classList.toggle("fmt", this.formatMode);
        this.root.style.pointerEvents = this.interactionsAllowed() ? "auto" : "none";
        const pal: any = this.host.colorPalette;
        this.root.style.setProperty("--bs-focus", pal?.isHighContrast ? (pal.foregroundSelected?.value || pal.foreground?.value || "#FFFF00") : "#005A9E");

        const dv = options.dataViews?.[0];
        const vals = dv?.categorical?.values ?? [];
        const hasXY = !!vals.find(v => v.source?.roles?.["xValue"]) && !!vals.find(v => v.source?.roles?.["yValue"]);
        this.lastOptions = options;
        if (!dv || !hasXY) {
            this.points = [];
            this.showLanding(options.viewport);
            return;
        }

        this.settings = this.settingsSvc.populateFormattingSettingsModel(VisualFormattingSettingsModel, dv);

        // El cambio de plantilla se detecta aquí, en un update, nunca en un repintado: persistProperties no debe
        // salir de registerOnSelectCallback.
        const objs: any = dv.metadata?.objects ?? {};
        const tpl = String(objs?.style?.template ?? "classic");
        if (this.editing && this.tplVisto !== null && this.tplVisto !== tpl) this.aplicarPlantilla(tpl);
        this.tplVisto = tpl;

        const isData = !options.type || (options.type & VisualUpdateType.Data) !== 0;
        if (isData || !this.points.length) {
            this.points = this.parse(dv);
            // El rango fijo solo vuelve a aprender si cambian los CAMPOS (otra medida en X o Y), nunca por filtrar:
            // antes se reiniciaba al llegar más filas que la vez anterior, y al pasar de un canal pequeño a uno
            // grande el eje se movía.
            const firma = (dv.metadata?.columns ?? []).filter(c => c.roles?.["xValue"] || c.roles?.["yValue"])
                .map(c => Object.keys(c.roles ?? {}).join("+") + ":" + c.queryName).sort().join("|");
            if (firma !== this.fieldSignature) { this.fixedDomain = null; this.fieldSignature = firma; }
            this.selected = this.indicesFrom(this.selectionManager.getSelectionIds() as ISelectionId[]);
        }
        this.draw();
    }

    /** Repinta con el último estado, fuera de update(): no emite eventos de render. */
    private redraw(): void {
        if (!this.lastOptions) return;
        try {
            if (this.points.length) this.draw();
        } catch { /* lo ya pintado se queda */ }
    }

    // ── Datos ─────────────────────────────────────────────────────────────────

    private formatterFor(col: powerbi.DataViewValueColumn | undefined, value: number): (v: number) => string {
        const format = col?.source?.format;
        try {
            const f = valueFormatter.create({ format, value, cultureSelector: this.host.locale });
            return (v: number) => f.format(v);
        } catch { return (v: number) => String(v); }
    }

    private parse(dv: powerbi.DataView): Point[] {
        const cat = dv.categorical;
        const cats = cat?.categories ?? [];
        const catCol = cats.find(c => c.source?.roles?.["category"]);
        const legCol = cats.find(c => c.source?.roles?.["legend"]);
        const values = cat?.values ?? [];
        const xCol = values.find(v => v.source?.roles?.["xValue"]);
        const yCol = values.find(v => v.source?.roles?.["yValue"]);
        const sizeCol = values.find(v => v.source?.roles?.["size"]);
        const tipCols = values.filter(v => v.source?.roles?.["tooltips"]);
        const rows = catCol?.values?.length ?? legCol?.values?.length ?? xCol?.values?.length ?? 0;

        this.names = {
            x: xCol?.source?.displayName ?? "X", y: yCol?.source?.displayName ?? "Y",
            size: sizeCol?.source?.displayName ?? "", category: catCol?.source?.displayName ?? "",
            legend: legCol?.source?.displayName ?? ""
        };
        const nums = (col: powerbi.DataViewValueColumn | undefined) => (col?.values ?? []).map(v => typeof v === "number" ? v : NaN);
        const xs = nums(xCol), ys = nums(yCol), ss = nums(sizeCol);
        const maxAbs = (a: number[]) => a.reduce((m, v) => isFinite(v) ? Math.max(m, Math.abs(v)) : m, 0);
        // Formato del modelo para tooltips y etiquetas (cadena de la medida, idioma del informe).
        const tipX = this.formatterFor(xCol, 0), tipY = this.formatterFor(yCol, 0), tipS = this.formatterFor(sizeCol, 0);
        this.fmtX = this.formatterFor(xCol, maxAbs(xs));
        this.fmtS = this.formatterFor(sizeCol, maxAbs(ss));
        this.fmtY = this.formatterFor(yCol, maxAbs(ys));
        this.fmtXcol = xCol?.source?.format ?? "";
        this.fmtYcol = yCol?.source?.format ?? "";
        const tipFmt = tipCols.map(c => {
            try { const f = valueFormatter.create({ format: c.source?.format, cultureSelector: this.host.locale }); return (v: any) => f.format(v); }
            catch { return (v: any) => String(v ?? ""); }
        });

        const baseR = this.settings.dataPoints.radius.value;
        const minR = Math.max(2, baseR * 0.4), maxR = Math.max(minR + 2, baseR * 4);
        let sMin = Infinity, sMax = -Infinity;
        for (const v of ss) if (isFinite(v) && v > 0) { sMin = Math.min(sMin, v); sMax = Math.max(sMax, v); }
        // Área proporcional al valor (no el radio): es lo que lee el ojo en un gráfico de burbujas.
        const rOf = (v: number) => {
            if (!sizeCol || !isFinite(v) || v <= 0 || !(sMax > 0)) return sizeCol ? minR : baseR;
            return Math.max(minR, maxR * Math.sqrt(v / sMax));
        };
        const objCol = cats[0];
        const out: Point[] = [];
        for (let i = 0; i < rows; i++) {
            const x = xs[i], y = ys[i];
            if (!isFinite(x) || !isFinite(y)) continue;
            const b = this.host.createSelectionIdBuilder();
            if (catCol) b.withCategory(catCol, i);
            if (legCol) b.withCategory(legCol, i);
            const label = catCol ? String(catCol.values[i] ?? "") : (legCol ? String(legCol.values[i] ?? "") : "");
            const series = legCol ? String(legCol.values[i] ?? "") : null;
            const fxv = (objCol?.objects?.[i] as any)?.dataPoints?.fill?.solid?.color;
            const tips: VisualTooltipDataItem[] = [];
            if (catCol) tips.push({ displayName: this.names.category, value: label });
            if (legCol) tips.push({ displayName: this.names.legend, value: series ?? "" });
            tips.push({ displayName: this.names.x, value: tipX(x) }, { displayName: this.names.y, value: tipY(y) });
            if (sizeCol) tips.push({ displayName: this.names.size, value: isFinite(ss[i]) ? tipS(ss[i]) : "" });
            tipCols.forEach((c, k) => tips.push({ displayName: c.source?.displayName ?? "", value: tipFmt[k](c.values[i]) }));
            const hl = xCol?.highlights;
            out.push({
                x, y, r: rOf(ss[i]), s: ss[i] ?? NaN, label, series, fx: typeof fxv === "string" ? fxv : null,
                id: b.createSelectionId(), highlighted: hl ? hl[i] !== null && hl[i] !== undefined : false, tips
            });
        }
        return out;
    }

    // ── Licencia y vista previa ───────────────────────────────────────────────

    /** Ajustes de pago que el autor ha encendido (metadata.objects: solo lo fijado). */
    private proTouched(objs: any): { kind: string; label: string; key: string }[] {
        const out: { kind: string; label: string; key: string }[] = [];
        const lz = objs?.lowerZones;
        const own = lz?.layout === "own" || (lz?.layout === undefined && Number(lz?.lineCount ?? 0) > 0);
        if (own) out.push({ kind: "own", label: this.t("Pro_Own", "own lower dividers"), key: "own=" + JSON.stringify(lz?.lineCount ?? 0) });
        if (objs?.trendLine?.show === true) out.push({ kind: "trend", label: this.t("Pro_Trend", "trend line"), key: "trend" });
        if (objs?.cards?.show === true) out.push({ kind: "cards", label: this.t("Pro_Cards", "zone counts"), key: "cards" });
        if (objs?.zoneTable?.show === true) out.push({ kind: "table", label: this.t("Pro_Table", "zone table"), key: "table" });
        if (objs?.axes?.fixedAxes === true) out.push({ kind: "fixed", label: this.t("Pro_Fixed", "fixed axis range"), key: "fixed" });
        return out;
    }

    // ── Dibujo ────────────────────────────────────────────────────────────────

    private draw(): void {
        const options = this.lastOptions!;
        const dv = options.dataViews?.[0];
        const objs: any = dv?.metadata?.objects ?? {};
        const tpl = String(objs?.style?.template ?? "classic");
        this.applyTemplateDefaults(tpl, objs);
        const s = this.settings;
        const points = this.points;

        const touched = this.proTouched(objs);
        const licensed = this.license.isLicensed;
        const preview = !licensed && this.editing && this.license.resolved && !this.license.serviceUnavailable;
        const on = (kind: string) => licensed || (preview && touched.some(x => x.kind === kind));

        // Un filtro que deja 0 puntos: aviso, nunca las burbujas anteriores (serían datos que no corresponden al filtro).
        if (!points.length) {
            this.clear();
            const m = document.createElement("div");
            m.className = "bs-empty";
            m.textContent = this.t("UI_NoData", "No data for the current filters");
            this.root.appendChild(m);
            this.notifier?.required(this.license, false);
            this.renderGuide(options.viewport);
            return;
        }

        const vp = options.viewport;
        const fullW = Math.max(60, vp.width), fullH = Math.max(60, vp.height);
        // Tabla de zonas (Pro): a la derecha o debajo; el gráfico ocupa el resto.
        const tableOn = on("table") && s.zoneTable.show.value && fullW >= 240 && fullH >= 160;
        const tableRight = (s.zoneTable.position.value as any)?.value !== "bottom";
        // El % del panel es un MÁXIMO: la tabla ocupa lo que necesita y el gráfico se queda con el resto (sin hueco).
        const tableMax = Math.round((tableRight ? fullW : fullH) * s.zoneTable.sizePct.value / 100);
        const tableSize = tableOn ? (this.tableFit > 0 ? Math.min(tableMax, this.tableFit) : tableMax) : 0;
        const W = tableRight ? fullW - tableSize : fullW, H = tableRight ? fullH : fullH - tableSize;

        const cp: any = this.host.colorPalette;
        const hc = !!cp?.isHighContrast;
        const fg = hc ? cp.foreground.value : "";
        const bg = hc ? cp.background.value : "";
        const fgSel = hc ? cp.foregroundSelected.value : "";
        const font = String(s.axes.fontFamily.value || "Segoe UI, sans-serif");
        const plotBg = hc ? bg : s.axes.plotBackground.value.value;
        const darkPlot = !hc && oscuro(plotBg);

        // ── Líneas efectivas ──────────────────────────────────────────────────
        const xsAll = points.map(p => p.x), ysAll = points.map(p => p.y);
        const stat = (mode: string, v: number[], fixed: number) => mode === "average" ? media(v) : mode === "median" ? mediana(v) : fixed;
        const yRef = stat(String((s.referenceLines.yRefMode.value as any)?.value ?? "fixed"), ysAll, s.referenceLines.yRef.value);
        const linesOf = (z: ZonesSettings, first?: number): Line[] => {
            const n = Math.max(0, Math.min(4, Math.round(z.lineCount.value)));
            const out: Line[] = [];
            for (let i = 0; i < n; i++) out.push({ v: i === 0 && first !== undefined ? first : z.lineValue[i].value, color: z.lineColor[i].value.value });
            return out.sort((a, b) => a.v - b.v);
        };
        const upperMode = String((s.upperZones.line1Mode.value as any)?.value ?? "fixed");
        const upper = linesOf(s.upperZones, upperMode === "fixed" ? undefined : stat(upperMode, xsAll, 0));
        let lowerMode = this.lowerModeOf(objs, tpl) as Layout["lowerMode"];
        if (lowerMode === "own" && !on("own")) lowerMode = "mirror";   // sin licencia: cuadrantes, que son gratis
        const lower = lowerMode === "own" ? linesOf(s.lowerZones) : lowerMode === "mirror" ? upper : [];
        const layout: Layout = { yRef, upper, lower, lowerMode };
        this.layout = layout;
        const zoneOf = (p: Point) => (p.y >= yRef ? "U" : "L") + zoneIndex(p.x, p.y >= yRef ? upper : lower);

        // ── Leyenda ───────────────────────────────────────────────────────────
        const series: string[] = [];
        const seriesSet = new Set<string>();
        for (const p of points) if (p.series !== null && !seriesSet.has(p.series)) { seriesSet.add(p.series); series.push(p.series); }
        const colorBy = String((s.dataPoints.colorBy.value as any)?.value ?? "auto");
        const byLegend = series.length > 0 && (colorBy === "auto");
        const seriesColor = (v: string) => this.host.colorPalette.getColor(v).value;
        const showLegend = byLegend && s.legend.show.value;
        const legPos = String((s.legend.position.value as any)?.value ?? "top");
        const legFs = s.legend.fontSize.value;
        // Peso de cada grupo: sobre la selección (zona o puntos), si no sobre lo resaltado, si no sobre todo.
        let shares: Map<string, string> | null = null;
        let shareLead = "";
        if (showLegend && s.legend.showShare.value) {
            const bySize = (s.legend.shareBy.value as any)?.value === "size" && points.some(p => isFinite(p.s));
            const base = this.selected.size ? points.filter((_p, i) => this.selected.has(i))
                : points.some(p => p.highlighted) ? points.filter(p => p.highlighted) : points;
            const w = (p: Point) => bySize ? (isFinite(p.s) ? Math.max(0, p.s) : 0) : 1;
            const tot = base.reduce((a, p) => a + w(p), 0);
            const acc = new Map<string, number>();
            for (const p of base) if (p.series !== null) acc.set(p.series, (acc.get(p.series) ?? 0) + w(p));
            shares = new Map(series.map(n => [n, tot > 0 ? Math.round((acc.get(n) ?? 0) * 100 / tot) + "%" : "0%"]));
            if (base !== points) shareLead = this.selectedZone
                ? this.tf("UI_ShareZone", "In {0}:", this.zoneName(this.selectedZone, upper.length + 1)) : this.t("UI_ShareSel", "Selection:");
        }
        const legRows = showLegend ? this.legendRows(series, W - 16, legFs, shares, shareLead) : [];
        const legH = legRows.length ? legRows.length * (legFs + 8) + 4 : 0;

        // ── Ejes y márgenes ───────────────────────────────────────────────────
        const fixedOn = on("fixed") && s.axes.fixedAxes.value;
        const rawXMin = xsAll.length ? Math.min(...xsAll) : -1, rawXMax = xsAll.length ? Math.max(...xsAll) : 1;
        const rawYMin = ysAll.length ? Math.min(...ysAll) : -1, rawYMax = ysAll.length ? Math.max(...ysAll) : 1;
        if (!this.fixedDomain) this.fixedDomain = { xMin: rawXMin, xMax: rawXMax, yMin: rawYMin, yMax: rawYMax };
        else {
            this.fixedDomain.xMin = Math.min(this.fixedDomain.xMin, rawXMin); this.fixedDomain.xMax = Math.max(this.fixedDomain.xMax, rawXMax);
            this.fixedDomain.yMin = Math.min(this.fixedDomain.yMin, rawYMin); this.fixedDomain.yMax = Math.max(this.fixedDomain.yMax, rawYMax);
        }
        const d = fixedOn ? this.fixedDomain : { xMin: rawXMin, xMax: rawXMax, yMin: rawYMin, yMax: rawYMax };
        const allLines = upper.concat(lower);
        // Escala logarítmica: solo si todo lo que se dibuja en ese eje es positivo; si no, lineal (no hay log de ≤ 0).
        // Un divisor en 0 o menos no la impide: con todos los puntos > 0 esa zona está vacía y el divisor queda en el borde.
        const logX = s.axes.logX.value && d.xMin > 0;
        // Igual que en X: una línea Y en 0 o menos no la impide; con todos los puntos > 0 queda en el borde inferior.
        const logY = s.axes.logY.value && d.yMin > 0;
        this.logFallback = (s.axes.logX.value && !logX) || (s.axes.logY.value && !logY);
        const tX = (v: number) => logX ? (v > 0 ? Math.log10(v) : -Infinity) : v, iX = (v: number) => logX ? Math.pow(10, v) : v;
        const tY = (v: number) => logY ? (v > 0 ? Math.log10(v) : -Infinity) : v, iY = (v: number) => logY ? Math.pow(10, v) : v;
        // A partir de aquí xMin… están en el espacio del eje (log10 si es logarítmico).
        const dx0 = tX(d.xMin), dx1 = tX(d.xMax), dy0 = tY(d.yMin), dy1 = tY(d.yMax);
        const xPad = (dx1 - dx0) * 0.06 || Math.abs(dx1) * 0.1 || 1;
        const yPad = (dy1 - dy0) * 0.08 || Math.abs(dy1) * 0.1 || 1;
        let xMin = dx0 - xPad, xMax = dx1 + xPad;
        let yMin = dy0 - yPad, yMax = dy1 + yPad;
        // Los divisores también siempre visibles: una zona que cae fuera del rango no existiría en pantalla.
        for (const l of allLines) {
            if (logX && l.v <= 0) continue;
            if (tX(l.v) < xMin) xMin = tX(l.v) - xPad;
            if (tX(l.v) > xMax) xMax = tX(l.v) + xPad;
        }
        if ((s.referenceLines.showYRef.value || lowerMode !== "mirror") && (!logY || yRef > 0)) {
            // La línea Y siempre visible, aunque quede fuera de los datos
            if (tY(yRef) < yMin) yMin = tY(yRef) - yPad;
            if (tY(yRef) > yMax) yMax = tY(yRef) + yPad;
        }
        /** Marcas de un eje logarítmico: potencias de 10 y, si caben, 2× y 5×. En unidades de dato. */
        const logTicks = (a: number, b: number, count: number): number[] => {
            const out: number[] = [];
            for (const m of [[1], [1, 2, 5], [1, 2, 3, 4, 5, 6, 7, 8, 9]]) {
                const t: number[] = [];
                for (let e = Math.floor(a); e <= Math.ceil(b); e++) for (const k of m) { const v = k * Math.pow(10, e); if (Math.log10(v) >= a && Math.log10(v) <= b) t.push(v); }
                if (t.length > count && out.length) break;
                out.length = 0; out.push(...t);
            }
            return out;
        };
        const ticksOf = (a: number, b: number, count: number, log: boolean) => log ? logTicks(a, b, count) : niceTicks(a, b, count);

        const ts = s.axes.tickSize.value;
        const td = Math.round(s.axes.tickDecimals.value);
        const tickFmt = (v: number, isX: boolean) => {
            // En un eje logarítmico cada marca lleva su propia unidad (1K, 10K, 1M): una sola para todo el eje se lee mal.
            if (td < 0 && (isX ? logX : logY)) {
                // La unidad por magnitud: 100.000 sale "100K" y no "0,1M" (el formateador pasa a millones antes de tiempo).
                const a = Math.abs(v), unidad = a >= 1e9 ? v : a >= 1e6 ? 1e6 : a >= 1e3 ? 1e4 : v;
                try { return valueFormatter.create({ format: isX ? this.fmtXcol : this.fmtYcol, value: unidad, cultureSelector: this.host.locale }).format(v); }
                catch { return String(v); }
            }
            if (td < 0) return isX ? this.fmtX(v) : this.fmtY(v);
            try { return valueFormatter.create({ format: isX ? this.fmtXcol : this.fmtYcol, value: Math.max(Math.abs(iX(xMax)), Math.abs(iX(xMin))), precision: td, cultureSelector: this.host.locale }).format(v); }
            catch { return v.toFixed(td); }
        };
        const yTicks = ticksOf(yMin, yMax, Math.max(2, Math.floor(H / 60)), logY);
        const yLabels = yTicks.map(v => tickFmt(v, false));
        const showTitles = s.axes.showTitles.value;
        const xTitle = showTitles ? (s.axes.xTitle.value || this.names.x) : "";
        const yTitle = showTitles ? (s.axes.yTitle.value || this.names.y) : "";
        const tts = s.axes.titleSize.value;
        const yLabW = Math.max(...yLabels.map(l => l.length), 1) * ts * 0.58;
        const ML = Math.round(yLabW + 12 + (yTitle ? tts + 8 : 0));
        const MR = 14;
        const MT = 10 + (legPos === "top" ? legH : 0);
        const MB = Math.round(ts + 12 + (xTitle ? tts + 8 : 0) + (legPos === "bottom" ? legH : 0));
        const plotW = W - ML - MR, plotH = H - MT - MB;
        if (plotW <= 20 || plotH <= 20) { this.clear(); return; }
        const xTicks = ticksOf(xMin, xMax, Math.max(2, Math.floor(plotW / Math.max(60, ts * 7))), logX);

        // Las escalas reciben unidades de dato y aplican el log si toca.
        const xs = (v: number) => ML + ((tX(v) - xMin) / (xMax - xMin)) * plotW;
        const ys = (v: number) => MT + plotH - ((tY(v) - yMin) / (yMax - yMin)) * plotH;
        const yRefPx = logY && yRef <= 0 ? MT + plotH : Math.max(MT, Math.min(MT + plotH, ys(yRef)));
        // En un visual pequeño las burbujas se encogen: la mayor no pasa de una décima parte del área de dibujo.
        const rMax = points.reduce((m, p) => Math.max(m, p.r), 0);
        const rk = rMax > 0 ? Math.min(1, Math.min(plotW, plotH) / 10 / rMax) : 1;
        const rad = (p: Point) => Math.max(1.5, p.r * rk);

        const hasHl = points.some(p => p.highlighted);
        const sel = this.selected;
        const zoneCounts: Record<string, number> = {};
        for (const p of points) { const k = zoneOf(p); zoneCounts[k] = (zoneCounts[k] ?? 0) + 1; }

        // ── Esqueleto ─────────────────────────────────────────────────────────
        const svg = svgEl("svg", { width: W, height: H, class: "bs-svg", role: "group",
            "aria-label": this.tf("Aria_Chart", "{0}, {1} points", TITLE, String(points.length)) });
        const clip = svgEl("clipPath", { id: this.clipId }, svgEl("defs", {}, svg));
        svgEl("rect", { x: ML, y: MT, width: plotW, height: plotH }, clip);
        svgEl("rect", { x: ML, y: MT, width: plotW, height: plotH, fill: plotBg, stroke: hc ? fg : (darkPlot ? "#3B3A39" : "#D0D0D0"), "stroke-width": 1, "data-o": "plot" }, svg);
        const ca = { "clip-path": `url(#${this.clipId})` };
        const gZones = svgEl("g", ca, svg), gGrid = svgEl("g", ca, svg), gLines = svgEl("g", ca, svg);
        const gAxes = svgEl("g", {}, svg), gPoints = svgEl("g", ca, svg), gTrend = svgEl("g", ca, svg);
        const gLabels = svgEl("g", ca, svg), gZoneLbl = svgEl("g", ca, svg), gCards = svgEl("g", {}, svg);

        // ── Zonas ─────────────────────────────────────────────────────────────
        const nUpper = upper.length + 1;
        const zoneLblColor = hc ? fg : (darkPlot ? "#E1DFDD" : "#444444");
        const zoneFill: Record<string, string> = {};
        const half = (isUpper: boolean, lines: Line[]) => {
            const z = isUpper ? s.upperZones : s.lowerZones;
            const zObj = isUpper ? objs?.upperZones : objs?.lowerZones;
            const tplZ: any = (TEMPLATES[tpl] ?? {})[isUpper ? "upperZones" : "lowerZones"] ?? {};
            const yTop = isUpper ? MT : yRefPx, yBot = isUpper ? yRefPx : MT + plotH;
            const zh = yBot - yTop;
            if (zh <= 0.5) return;
            const xb = [ML, ...lines.map(l => Math.max(ML, Math.min(ML + plotW, xs(l.v)))), ML + plotW];
            for (let i = 0; i <= lines.length && i < 5; i++) {
                const zx = xb[i], zw = xb[i + 1] - zx;
                if (zw <= 0.5) continue;
                const key = (isUpper ? "U" : "L") + i;
                // Abajo, los nombres y colores por defecto siguen la cuenta de arriba: A B | C D en cuadrantes.
                const letra = String.fromCharCode(65 + (isUpper ? i : nUpper + i));
                const label = z.zoneLabel[i].value || this.tf("UI_Zone", "Zone {0}", letra);
                const colorSet = zObj?.[`zone${i + 1}Color`] !== undefined || tplZ[`zone${i + 1}Color`] !== undefined;
                const color = isUpper || colorSet ? z.zoneColor[i].value.value : ZONE_COLORS_DEFAULT[(nUpper + i) % 5];
                zoneFill[key] = color;
                const op = z.zoneOpacity[i].value / 100;
                const isSel = this.selectedZone === key;
                const dim = this.selectedZone !== null && !isSel;
                const count = zoneCounts[key] ?? 0;
                svgEl("rect", {
                    "data-zone": key, "data-o": "z" + key, class: "bs-zone",
                    x: f1(zx), y: f1(yTop), width: f1(zw), height: f1(zh),
                    fill: hc ? bg : color, "fill-opacity": hc ? 0 : (dim ? op * 0.35 : op).toFixed(2),
                    stroke: hc ? (isSel ? fgSel : fg) : (isSel ? tono(color, -0.5) : "none"), "stroke-width": isSel ? 2 : (hc ? 1 : 0),
                    tabindex: 0, role: "button", "aria-pressed": isSel ? "true" : "false",
                    "aria-label": this.tf("Aria_Zone", "{0}: {1} points", label, String(count))
                }, gZones);
                const fs = z.labelFontSize.value;
                const lx = zx + zw / 2, ly = yTop + zh / 2 + fs * 0.35;
                const bgOp = z.labelBgOpacity.value / 100;
                if (bgOp > 0 && !hc) {
                    const bw = Math.max(0, Math.min(zw - 8, label.length * fs * 0.6 + 8));
                    svgEl("rect", { x: f1(lx - bw / 2), y: f1(ly - fs - 4 + fs * 0.35), width: f1(bw), height: f1(fs + 8), rx: 4,
                        fill: z.labelBgColor.value.value, "fill-opacity": (bgOp * (dim ? 0.35 : 1)).toFixed(2), "pointer-events": "none" }, gZoneLbl);
                }
                // Color del rótulo: el que fije el autor (o la plantilla); si no, automático según el fondo.
                const lblSet = zObj?.labelColor !== undefined || tplZ.labelColor !== undefined;
                svgEl("text", { x: f1(lx), y: f1(ly), "text-anchor": "middle", "font-family": font, "font-size": fs,
                    fill: hc ? fg : lblSet ? z.labelColor.value.value : zoneLblColor,
                    opacity: dim ? 0.35 : 1, "pointer-events": "none", "aria-hidden": "true", "data-o": isUpper ? "upperZones" : "lowerZones" }, gZoneLbl, label);
            }
        };
        half(true, upper);
        half(false, lower);

        // ── Rejilla y marcas ──────────────────────────────────────────────────
        const tc = hc ? fg : s.axes.tickColor.value.value;
        if (s.axes.showGridlines.value) {
            const gc = hc ? fg : s.axes.gridColor.value.value;
            for (const v of xTicks) svgEl("line", { x1: f1(xs(v)), y1: MT, x2: f1(xs(v)), y2: MT + plotH, stroke: gc, "stroke-width": 1, opacity: hc ? 0.3 : 1 }, gGrid);
            for (const v of yTicks) svgEl("line", { x1: ML, y1: f1(ys(v)), x2: ML + plotW, y2: f1(ys(v)), stroke: gc, "stroke-width": 1, opacity: hc ? 0.3 : 1 }, gGrid);
        }
        let lastRight = -Infinity;
        for (const v of xTicks) {
            const lbl = tickFmt(v, true), px = xs(v), w = lbl.length * ts * 0.58;
            if (px - w / 2 < lastRight + 6) continue;      // sin solapes entre etiquetas del eje X
            lastRight = px + w / 2;
            svgEl("text", { x: f1(px), y: MT + plotH + ts + 4, "text-anchor": "middle", "font-family": font, "font-size": ts, fill: tc, "data-o": "ticks" }, gAxes, lbl);
        }
        yTicks.forEach((v, i) => svgEl("text", { x: ML - 6, y: f1(ys(v) + ts * 0.35), "text-anchor": "end", "font-family": font, "font-size": ts, fill: tc, "data-o": "ticks" }, gAxes, yLabels[i]));
        const ttc = hc ? fg : s.axes.titleColor.value.value;
        if (xTitle) svgEl("text", { x: f1(ML + plotW / 2), y: f1(MT + plotH + ts + 10 + tts), "text-anchor": "middle", "font-family": font, "font-size": tts, fill: ttc, "data-o": "titles" }, gAxes, xTitle);
        if (yTitle) {
            const cx = tts, cy = MT + plotH / 2;
            svgEl("text", { transform: `rotate(-90,${cx},${f1(cy)})`, x: cx, y: f1(cy), "text-anchor": "middle", "font-family": font, "font-size": tts, fill: ttc, "data-o": "titles" }, gAxes, yTitle);
        }

        if (this.logFallback && this.editing) {
            svgEl("text", { x: ML + plotW - 4, y: MT + plotH - 6, "text-anchor": "end", "font-family": font, "font-size": 10,
                fill: hc ? fg : "#A4262C", "pointer-events": "none" }, gAxes, this.t("UI_LogFallback", "Log scale needs values above 0: shown linear"));
        }

        // ── Línea Y y divisores ───────────────────────────────────────────────
        if (s.referenceLines.showYRef.value) {
            const a: Attrs = { x1: ML, y1: f1(yRefPx), x2: ML + plotW, y2: f1(yRefPx), stroke: hc ? fg : s.referenceLines.yRefColor.value.value, "stroke-width": 1.5, "data-o": "yline" };
            const ds = dash(String((s.referenceLines.yRefStyle.value as any)?.value ?? "dashed"));
            if (ds) a["stroke-dasharray"] = ds;
            svgEl("line", a, gLines);
        }
        const vLines = (lines: Line[], y1: number, y2: number, show: boolean, obj: string) => {
            if (!show) return;
            for (const l of lines) {
                const px = xs(l.v);
                if (!isFinite(px)) continue;   // divisor ≤ 0 en un eje logarítmico: no existe en pantalla
                svgEl("line", { x1: f1(px), y1: f1(y1), x2: f1(px), y2: f1(y2), stroke: hc ? fg : l.color, "stroke-width": 1.2, "stroke-dasharray": "6,3", "data-o": obj }, gLines);
            }
        };
        vLines(upper, MT, yRefPx, s.upperZones.showLines.value, "upperZones");
        // En cuadrantes la mitad inferior usa los divisores de arriba con su color y su interruptor.
        vLines(lower, yRefPx, MT + plotH, lowerMode === "own" ? s.lowerZones.showLines.value : s.upperZones.showLines.value, lowerMode === "own" ? "lowerZones" : "upperZones");

        // ── Burbujas ──────────────────────────────────────────────────────────
        const fill = s.dataPoints.fill.value.value;
        const baseOp = s.dataPoints.opacity.value / 100;
        const bc = hc ? bg : s.dataPoints.borderColor.value.value;
        const bw = s.dataPoints.borderWidth.value;
        const zoneColorOf = (k: string) => {
            const z = k[0] === "U" ? s.upperZones : s.lowerZones;
            const i = Math.min(4, Number(k.slice(1)));
            return tono(z.zoneColor[i].value.value, -0.55);
        };
        const colorOf = (p: Point): string => {
            if (hc) return fg;
            if (p.fx) return p.fx;
            if (byLegend && p.series !== null) return seriesColor(p.series);
            if (colorBy === "category") return this.host.colorPalette.getColor(p.label).value;
            if (colorBy === "zone") return zoneColorOf(zoneOf(p));
            return fill;
        };
        // Orden de dibujo: las grandes primero, las pequeñas encima (no quedan tapadas).
        const order = points.map((_p, i) => i).sort((a, b) => points[b].r - points[a].r);
        for (const i of order) {
            const p = points[i];
            let op = baseOp;
            if (hasHl && !p.highlighted) op *= 0.25;
            if (sel.size && !sel.has(i)) op *= 0.25;
            const isSel = sel.has(i);
            svgEl("circle", { "data-idx": i, "data-o": "points", cx: f1(xs(p.x)), cy: f1(ys(p.y)), r: f1(rad(p)), fill: colorOf(p),
                "fill-opacity": op.toFixed(2), stroke: isSel && hc ? fgSel : bc, "stroke-width": isSel ? Math.max(2, bw) : bw,
                "stroke-opacity": Math.min(1, op + 0.15).toFixed(2) }, gPoints);
        }

        // ── Etiquetas de datos (sin solapes) ──────────────────────────────────
        if (s.dataPoints.showLabels.value && points.length) {
            const lfs = s.dataPoints.labelSize.value;
            const lc = hc ? fg : s.dataPoints.labelColor.value.value;
            const cell = 48, grid = new Map<string, number[][]>();
            const choque = (b: number[]) => {
                for (let gx = Math.floor(b[0] / cell); gx <= Math.floor(b[2] / cell); gx++)
                    for (let gy = Math.floor(b[1] / cell); gy <= Math.floor(b[3] / cell); gy++)
                        for (const o of grid.get(gx + ":" + gy) ?? []) if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return true;
                return false;
            };
            const poner = (b: number[]) => {
                for (let gx = Math.floor(b[0] / cell); gx <= Math.floor(b[2] / cell); gx++)
                    for (let gy = Math.floor(b[1] / cell); gy <= Math.floor(b[3] / cell); gy++) {
                        const k = gx + ":" + gy;
                        if (!grid.has(k)) grid.set(k, []);
                        grid.get(k).push(b);
                    }
            };
            let puestos = 0;
            for (const i of order) {
                if (puestos >= 1500) break;
                const p = points[i];
                if (!p.label) continue;
                const cx = xs(p.x), cy = ys(p.y) - rad(p) - 3;
                const w = p.label.length * lfs * 0.56;
                const box = [cx - w / 2, cy - lfs, cx + w / 2, cy + 2];
                if (box[0] < ML || box[2] > ML + plotW || box[1] < MT || choque(box)) continue;
                poner(box);
                puestos++;
                const dim = (hasHl && !p.highlighted) || (sel.size && !sel.has(i));
                svgEl("text", { x: f1(cx), y: f1(cy), "text-anchor": "middle", "font-family": font, "font-size": lfs, fill: lc,
                    opacity: dim ? 0.35 : 1, "pointer-events": "none", "data-o": "labels" }, gLabels, p.label);
            }
        }

        // ── Línea de tendencia (Pro) ──────────────────────────────────────────
        if (on("trend") && s.trendLine.show.value && points.length >= 2) {
            const n = points.length, mx = media(xsAll), my = media(ysAll);
            let sxy = 0, sxx = 0, syy = 0;
            for (const p of points) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; }
            if (sxx > 0) {
                const b = sxy / sxx, a = my - b * mx;
                const tcol = hc ? fg : s.trendLine.color.value.value;
                // Ajuste lineal en unidades de dato; con ejes logarítmicos se dibuja como curva (muestreada).
                const pts: string[] = [];
                for (let k = 0; k <= 60; k++) {
                    const xv = iX(xMin + (xMax - xMin) * k / 60), yv = a + b * xv;
                    if (isFinite(yv) && (!logY || yv > 0)) pts.push(f1(xs(xv)) + "," + f1(ys(yv)));
                }
                const at: Attrs = { points: pts.join(" "), fill: "none",
                    stroke: tcol, "stroke-width": s.trendLine.width.value, "data-o": "trend", "pointer-events": "none" };
                const ds = dash(String((s.trendLine.style.value as any)?.value ?? "dashed"));
                if (ds) at["stroke-dasharray"] = ds;
                if (pts.length > 1) svgEl("polyline", at, gTrend);
                if (s.trendLine.showR2.value && syy > 0 && n > 2) {
                    const r2 = (sxy * sxy) / (sxx * syy);
                    svgEl("text", { x: ML + plotW - 6, y: MT + 14, "text-anchor": "end", "font-family": font, "font-size": 11, fill: tcol,
                        "font-weight": 600, "data-o": "trend" }, gTrend, "R² " + r2.toLocaleString(this.host.locale || undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                }
            }
        }

        // ── Recuentos por zona (Pro) ──────────────────────────────────────────
        if (on("cards") && s.zoneCards.show.value) {
            const cfs = s.zoneCards.fontSize.value;
            const pct = s.zoneCards.showPercent.value;
            const total = points.length || 1;
            const put = (isUpper: boolean, lines: Line[]) => {
                const xb = [ML, ...lines.map(l => Math.max(ML, Math.min(ML + plotW, xs(l.v))))];
                const top = isUpper ? MT : yRefPx;
                if ((isUpper ? yRefPx - MT : MT + plotH - yRefPx) < cfs + 12) return;
                xb.forEach((x0, i) => {
                    // Una zona sin anchura en pantalla (divisor fuera del rango) no lleva tarjeta: taparía la de al lado.
                    if ((i + 1 < xb.length ? xb[i + 1] : ML + plotW) - x0 < 2) return;
                    const k = (isUpper ? "U" : "L") + i, c = zoneCounts[k] ?? 0;
                    const loc = this.host.locale || undefined;
                    const txt = pct ? `${c.toLocaleString(loc)} · ${Math.round(c * 100 / total)}%` : c.toLocaleString(loc);
                    const w = Math.max(24, txt.length * cfs * 0.62 + 12), h = cfs + 9;
                    svgEl("rect", { x: f1(x0 + 5), y: f1(top + 5), width: f1(w), height: h, rx: 4, fill: hc ? bg : "rgba(0,0,0,0.6)",
                        stroke: hc ? fg : "none", "data-o": "cards", "aria-hidden": "true", "pointer-events": "none" }, gCards);
                    svgEl("text", { x: f1(x0 + 5 + w / 2), y: f1(top + 5 + h / 2 + cfs * 0.35), "text-anchor": "middle", "font-family": font,
                        "font-size": cfs, "font-weight": 600, fill: hc ? fg : "#FFFFFF", "pointer-events": "none", "aria-hidden": "true" }, gCards, txt);
                });
            };
            put(true, upper);
            put(false, lower);
        }

        // ── Leyenda ───────────────────────────────────────────────────────────
        if (legRows.length) {
            const gl = svgEl("g", { "data-o": "legend", role: "list", "aria-label": this.names.legend }, svg);
            const y0 = legPos === "top" ? 6 : H - legH + 2;
            const lcol = hc ? fg : s.legend.color.value.value;
            legRows.forEach((row, ri) => {
                let x = 8;
                const y = y0 + ri * (legFs + 8) + legFs;
                for (const it of row) {
                    if (it.lead) {
                        svgEl("text", { x, y, "font-family": font, "font-size": legFs, "font-weight": 600, fill: lcol, "data-o": "legend" }, gl, it.text);
                        x += it.w;
                        continue;
                    }
                    const g = svgEl("g", { "data-series": it.name, class: "bs-leg", role: "listitem", cursor: "pointer" }, gl);
                    svgEl("circle", { cx: x + legFs / 2, cy: y - legFs * 0.35, r: legFs / 2 - 0.5, fill: hc ? fg : seriesColor(it.name) }, g);
                    const tx = svgEl("text", { x: x + legFs + 4, y, "font-family": font, "font-size": legFs, fill: lcol, "data-o": "legend" }, g, it.text);
                    if (it.share) svgEl("tspan", { "font-weight": 600, dx: 4 }, tx, it.share);
                    x += it.w;
                }
            });
        }

        // ── Cambio atómico, conservando el foco de teclado en la misma zona ──
        const doc = this.root.ownerDocument ?? document;
        const hadFocus = this.root.contains(doc.activeElement);
        this.clear();
        this.root.appendChild(svg);
        if (tableOn) {
            const zonas: string[] = [];
            for (let i = 0; i <= Math.min(4, upper.length); i++) zonas.push("U" + i);
            for (let i = 0; i <= Math.min(4, lower.length); i++) zonas.push("L" + i);
            const nat = this.renderZoneTable(zonas, series, zoneOf, zoneFill, { right: tableRight, size: tableSize, W, H, hc, fg, bg, font, dark: darkPlot });
            // Si la tabla necesita otro tamaño del que se le dio, un segundo pintado con la medida (una sola vez).
            if (!this.refitting && Math.abs(Math.min(tableMax, nat) - tableSize) > 2) {
                this.tableFit = nat;
                this.refitting = true;
                try { this.draw(); } finally { this.refitting = false; }
                return;
            }
        }
        if (hadFocus && this.focusedZone) {
            const z = svg.querySelector(`.bs-zone[data-zone="${this.focusedZone}"]`) as any;
            if (z?.focus) z.focus();
        }

        // ── Avisos de licencia, marca de agua, consejos ───────────────────────
        this.notifier?.required(this.license, touched.length > 0);
        if (touched.length) {
            this.notifier?.blocked(this.license,
                this.tf("UI_ProBlocked", "{0}: {1} — part of the Pro plan.", TITLE, touched.map(x => x.label).join(", ")),
                touched.map(x => x.key).sort().join("|"));
        }
        this.renderWatermark(preview && touched.length ? touched.map(x => x.label) : []);
        this.renderGuide(vp);
        this.renderBuildMarker();
        this.markSubSelectables();
        if (this.formatMode) this.subSelectionHelper.updateOutlinesFromSubSelections((options as any).subSelections ?? [], true);
    }

    /**
     * Mitad inferior: lo guardado; si no, lo que diga la plantilla; si no, 1.0 no tenía "layout" y un informe con
     * divisores inferiores guardados los sigue viendo como suyos.
     */
    private lowerModeOf(objs: any, tpl: string): string {
        const lz = objs?.lowerZones;
        const t = (TEMPLATES[tpl] ?? {}).lowerZones?.layout;
        return String(lz?.layout ?? t ?? (Number(lz?.lineCount ?? 0) > 0 ? "own" : "mirror"));
    }

    /** Reparte los nombres de la leyenda en filas (como mucho 2; el resto se corta con "…"). */
    private legendRows(series: string[], width: number, fs: number, shares: Map<string, string> | null, lead: string): LegItem[][] {
        const rows: LegItem[][] = [[]];
        let x = 0;
        if (lead) {
            const w = lead.length * fs * 0.6 + 10;
            rows[0].push({ name: "", text: lead, w, lead: true });
            x = w;
        }
        for (const name of series) {
            let text = name || this.t("UI_Blank", "(Blank)");
            if (text.length > 24) text = text.slice(0, 23) + "…";
            const share = shares?.get(name) ?? "";
            const w = fs + 4 + (text.length + (share ? share.length + 1 : 0)) * fs * 0.58 + 14;
            if (x + w > width && rows[rows.length - 1].length) {
                if (rows.length === 2) { rows[1].push({ name: "", text: "…", w: fs * 2, lead: true }); break; }
                rows.push([]);
                x = 0;
            }
            rows[rows.length - 1].push({ name, text, w, share });
            x += w;
        }
        return rows.filter(r => r.length);
    }

    /**
     * Tabla cruzada grupo de la leyenda × zona. Una tabla HTML de verdad (th con scope), textos con textContent.
     * Clic en una celda: los puntos de ese grupo en esa zona; en una cabecera de zona: la zona; en una fila: el grupo.
     */
    private renderZoneTable(zonas: string[], series: string[], zoneOf: (p: Point) => string, zoneFill: Record<string, string>,
        o: { right: boolean; size: number; W: number; H: number; hc: boolean; fg: string; bg: string; font: string; dark: boolean }): number {
        const s = this.settings, pts = this.points;
        const mode = String((s.zoneTable.mode.value as any)?.value ?? "rowPct");
        const bySize = mode === "size";
        const filas = series.length ? series : [null];
        const nUpper = zonas.filter(z => z[0] === "U").length;
        const val = new Map<string, number>(), idx = new Map<string, number[]>();
        const k = (f: string | null, z: string) => (f ?? "\u0000") + "|" + z;
        pts.forEach((p, i) => {
            const key = k(series.length ? p.series : null, zoneOf(p));
            val.set(key, (val.get(key) ?? 0) + (bySize ? (isFinite(p.s) ? p.s : 0) : 1));
            if (!idx.has(key)) idx.set(key, []);
            idx.get(key).push(i);
        });
        const filaTot = (f: string | null) => zonas.reduce((a, z) => a + (val.get(k(f, z)) ?? 0), 0);
        const colTot = (z: string) => filas.reduce((a, f) => a + (val.get(k(f, z)) ?? 0), 0);
        const total = filas.reduce((a, f) => a + filaTot(f), 0);
        const pct = (n: number, d: number) => d > 0 ? Math.round(n * 100 / d) + "%" : "–";
        const num = (n: number) => bySize ? this.fmtS(n) : n.toLocaleString(this.host.locale || undefined);
        const celda = (n: number, f: string | null, z: string): string =>
            mode === "rowPct" ? pct(n, filaTot(f)) : mode === "colPct" ? pct(n, colTot(z)) : num(n);

        const caja = document.createElement("div");
        caja.className = "bs-table" + (o.right ? " bs-table-r" : " bs-table-b");
        caja.setAttribute("data-o", "table");
        Object.assign(caja.style, o.right
            ? { left: o.W + "px", top: "0px", width: o.size + "px", height: o.H + "px" }
            : { left: "0px", top: o.H + "px", width: o.W + "px", height: o.size + "px" });
        const color = o.hc ? o.fg : s.legend.color.value.value;
        caja.style.color = color;
        caja.style.fontFamily = o.font;
        caja.style.fontSize = s.zoneTable.fontSize.value + "px";
        if (o.hc) caja.style.background = o.bg;
        const tabla = document.createElement("table");
        const cap = document.createElement("caption");
        cap.textContent = mode === "rowPct" ? this.t("UI_TblRow", "Share of each row across zones")
            : mode === "colPct" ? this.t("UI_TblCol", "Mix within each zone")
            : mode === "size" ? (this.names.size || this.t("Enum_sizeField", "Size field")) : this.t("Enum_count", "Points");
        tabla.appendChild(cap);
        const pulsable = (el: HTMLElement, accion: () => void) => {
            el.tabIndex = 0;
            el.classList.add("bs-tc");
            el.addEventListener("click", e => { e.stopPropagation(); if (!this.formatMode) accion(); });
            el.addEventListener("keydown", e => { if (!this.formatMode && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); accion(); } });
        };
        const thead = document.createElement("thead"), hr = document.createElement("tr");
        const esquina = document.createElement("th");
        esquina.textContent = series.length ? this.names.legend : "";
        hr.appendChild(esquina);
        for (const z of zonas) {
            const th = document.createElement("th");
            th.scope = "col";
            th.textContent = this.zoneName(z, nUpper);
            if (!o.hc) th.style.boxShadow = `inset 0 -3px 0 ${tono(zoneFill[z] ?? "#CCCCCC", -0.35)}`;
            if (this.selectedZone === z) th.classList.add("bs-on");
            pulsable(th, () => this.toggleZone(z));
            hr.appendChild(th);
        }
        const tt = document.createElement("th");
        tt.scope = "col";
        tt.textContent = this.t("UI_Total", "Total");
        hr.appendChild(tt);
        thead.appendChild(hr);
        tabla.appendChild(thead);
        const tbody = document.createElement("tbody");
        for (const f of filas) {
            const tr = document.createElement("tr");
            const th = document.createElement("th");
            th.scope = "row";
            th.textContent = f === null ? this.t("UI_All", "All") : (f || this.t("UI_Blank", "(Blank)"));
            if (f !== null) {
                if (!o.hc) th.style.borderLeft = "3px solid " + this.host.colorPalette.getColor(f).value;
                pulsable(th, () => { this.selectedZone = null; this.selectPoints(pts.map((p, i) => p.series === f ? i : -1).filter(i => i >= 0), false); });
            }
            tr.appendChild(th);
            for (const z of zonas) {
                const td = document.createElement("td");
                const n = val.get(k(f, z)) ?? 0;
                td.textContent = celda(n, f, z);
                const ids = idx.get(k(f, z)) ?? [];
                if (ids.length) pulsable(td, () => { this.selectedZone = null; this.selectPoints(ids, false); });
                if (ids.length && ids.every(i => this.selected.has(i)) && this.selected.size === ids.length) td.classList.add("bs-on");
                tr.appendChild(td);
            }
            const tdT = document.createElement("td");
            tdT.className = "bs-tot";
            tdT.textContent = mode === "rowPct" ? "100%" : mode === "colPct" ? pct(filaTot(f), total) : num(filaTot(f));
            tr.appendChild(tdT);
            tbody.appendChild(tr);
        }
        if (series.length) {
            const tr = document.createElement("tr");
            tr.className = "bs-tot";
            const th = document.createElement("th");
            th.scope = "row";
            th.textContent = this.t("UI_Total", "Total");
            tr.appendChild(th);
            for (const z of zonas) {
                const td = document.createElement("td");
                td.textContent = mode === "rowPct" ? pct(colTot(z), total) : mode === "colPct" ? "100%" : num(colTot(z));
                tr.appendChild(td);
            }
            const td = document.createElement("td");
            td.textContent = mode === "count" || mode === "size" ? num(total) : "100%";
            tr.appendChild(td);
            tbody.appendChild(tr);
        }
        tabla.appendChild(tbody);
        caja.appendChild(tabla);
        this.root.appendChild(caja);
        // Tamaño natural (con el relleno de la caja): ancho si va a la derecha, alto si va debajo.
        return Math.ceil(o.right ? tabla.offsetWidth + 22 : tabla.offsetHeight + 14);
    }

    /** Nombre visible de una zona ("U0", "L1"…), el mismo que se pinta en ella. */
    private zoneName(key: string, nUpper: number): string {
        const s = this.settings, up = key[0] === "U", i = Number(key.slice(1));
        const z = up ? s.upperZones : s.lowerZones;
        return z.zoneLabel[Math.min(4, i)].value || this.tf("UI_Zone", "Zone {0}", String.fromCharCode(65 + (up ? i : nUpper + i)));
    }

    private clear(): void {
        while (this.root.firstChild) this.root.removeChild(this.root.firstChild);
    }

    // ── Plantillas ────────────────────────────────────────────────────────────

    private applyTemplateDefaults(tpl: string, objs: any): void {
        const tp = TEMPLATES[tpl];
        if (!tp) return;
        Object.keys(tp).forEach(obj => {
            const card: any = (this.settings.cards as any[]).find(c => c.name === obj);
            if (!card) return;
            const todas: any[] = card.slices ?? (card.groups ?? []).flatMap((g: any) => g.slices ?? []);
            Object.keys(tp[obj]).forEach(prop => {
                if (objs?.[obj]?.[prop] !== undefined) return;
                const sl: any = todas.find((x: any) => x.name === prop);
                if (!sl) return;
                if (sl instanceof formattingSettings.ColorPicker) sl.value = { value: String(tp[obj][prop]) };
                else if (sl instanceof formattingSettings.ItemDropdown) sl.value = (sl.items as any[]).find(it => it.value === tp[obj][prop]) ?? sl.value;
                else sl.value = tp[obj][prop];
            });
        });
    }

    /** Al ELEGIR una plantilla se borran los ajustes guardados que ella define, para que se vea. */
    private aplicarPlantilla(nombre: string): void {
        const props = new Map<string, Set<string>>();
        // Se borra lo que define cualquier plantilla, no solo la nueva: si no, lo que dejó la anterior se quedaría.
        Object.keys(TEMPLATES).forEach(t => Object.keys(TEMPLATES[t]).forEach(obj => {
            if (!props.has(obj)) props.set(obj, new Set());
            Object.keys(TEMPLATES[t][obj]).forEach(p => { if ((GEOMETRY[obj] ?? []).indexOf(p) < 0) props.get(obj).add(p); });
        }));
        if (!TEMPLATES[nombre]) return;
        const remove: any[] = [];
        props.forEach((ps, obj) => remove.push({ objectName: obj, selector: null as any,
            properties: Array.from(ps).reduce((acc: any, p) => { acc[p] = null; return acc; }, {}) }));
        // El color de las burbujas admite fx: un color fijo guardado con el selector comodín pisaría la plantilla.
        remove.push({ objectName: "dataPoints", selector: { data: [{ dataViewWildcard: { matchingOption: 0 } }] } as any, properties: { fill: null } });
        this.host.persistProperties({ remove });
    }

    private persistir(merge: { objectName: string; properties: any }[]): void {
        this.host.persistProperties({ merge: merge.map(m => ({ objectName: m.objectName, selector: null as any, properties: m.properties })) });
    }

    // ── Vista previa Pro: marca de agua ───────────────────────────────────────

    /** "Pro preview" y debajo lo que la ha encendido. Con DOM y textContent, nunca innerHTML. */
    private renderWatermark(labels: string[]): void {
        this.root.querySelectorAll(".bs-watermark").forEach(n => n.remove());
        if (!labels.length) return;
        const capa = document.createElement("div");
        capa.className = "bs-watermark";
        capa.setAttribute("aria-hidden", "true");
        const w = this.root.clientWidth || 300, h = this.root.clientHeight || 200;
        const fs = Math.round(Math.max(20, Math.min(72, w / 8, h / 3.5)));
        const linea = (texto: string, px: number) => {
            const el = document.createElement("div");
            el.textContent = texto;
            el.style.fontSize = px + "px";
            capa.appendChild(el);
        };
        linea(this.t("UI_ProPreview", "Pro preview"), fs);
        linea(labels.join(" · "), Math.round(fs * 0.34));
        this.root.appendChild(capa);
    }

    // ── Consejos de configuración (solo editando) ─────────────────────────────

    /**
     * Barra de consejos abajo, solo editando, con datos y si cabe: plantillas en un clic, cuadrantes en la media y
     * las funciones Pro para probarlas con tus datos (sin licencia, bajo la marca de agua). persistProperties solo
     * desde un clic. ✕ la cierra (style.guide = false); se reabre en Formato → Plantilla de estilo.
     */
    private renderGuide(vp: powerbi.IViewport): void {
        this.root.querySelectorAll(".bs-guide").forEach(n => n.remove());
        const s = this.settings;
        if (!this.editing || this.formatMode || !s.style.guide.value || !this.interactionsAllowed()) return;
        if (!vp || vp.width < 360 || vp.height < 220) return;
        const pal: any = this.host.colorPalette;
        const hc = !!pal?.isHighContrast;
        const azul = hc ? (pal.foregroundSelected?.value || "#FFFF00") : "#2B6CB0";
        const fg = hc ? (pal.foreground?.value || "#FFF") : "";
        const g = document.createElement("div");
        g.className = "bs-guide";
        g.setAttribute("role", "region");
        g.setAttribute("aria-label", this.t("Guide_Title", "Setup tips"));
        if (hc) Object.assign(g.style, { background: pal.background?.value || "#000", color: fg, borderColor: azul });
        g.onclick = e => e.stopPropagation();
        g.onkeydown = e => e.stopPropagation();
        const fila = (titulo: string) => {
            const f = document.createElement("div");
            f.className = "bs-g-row";
            const l = document.createElement("span");
            l.className = "bs-g-lbl";
            l.textContent = titulo;
            f.appendChild(l);
            g.appendChild(f);
            return f;
        };
        const boton = (f: HTMLElement, texto: string, on: boolean, accion: () => void) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "bs-g-btn";
            b.textContent = texto;
            b.setAttribute("aria-pressed", String(on));
            b.style.borderColor = azul;
            if (on) { b.style.background = azul; b.style.color = hc ? (pal.background?.value || "#000") : "#FFFFFF"; } else b.style.color = azul;
            b.addEventListener("click", accion);
            f.appendChild(b);
        };
        const objs: any = this.lastOptions?.dataViews?.[0]?.metadata?.objects ?? {};
        const f1r = fila(this.t("Guide_TryStyle", "Try a style:"));
        const actual = String((s.style.template.value as any)?.value ?? "classic");
        ([["classic", "Classic"], ["quadrant", "Four quadrants"], ["minimal", "Minimal"], ["soft", "Soft"], ["dark", "Dark background"]] as [string, string][])
            .forEach(([v, d]) => boton(f1r, this.t("Enum_" + v, d), v === actual, () => this.persistir([{ objectName: "style", properties: { template: v } }])));
        const enMedia = (s.referenceLines.yRefMode.value as any)?.value === "average" && (s.upperZones.line1Mode.value as any)?.value === "average";
        boton(f1r, this.t("Guide_Average", "Quadrants at the average"), enMedia, () => this.persistir(enMedia
            ? [{ objectName: "referenceLines", properties: { yRefMode: "fixed" } }, { objectName: "upperZones", properties: { line1Mode: "fixed" } }]
            : [{ objectName: "referenceLines", properties: { yRefMode: "average", showYRef: true } },
                { objectName: "upperZones", properties: { line1Mode: "average", lineCount: Math.max(1, Math.round(s.upperZones.lineCount.value)) } }]));

        const f2 = fila(this.license.isLicensed ? this.t("Guide_ProOn", "Pro:") : this.t("Guide_TryPro", "Try Pro:"));
        const own = this.layout?.lowerMode === "own" || objs?.lowerZones?.layout === "own";
        boton(f2, this.t("Guide_Own", "Different dividers below"), own, () => {
            if (own) { this.persistir([{ objectName: "lowerZones", properties: { layout: "mirror" } }]); return; }
            // Para que se vea algo: dos divisores abajo en los terciles de X, si no había ninguno.
            const xsOrd = this.points.map(p => p.x).sort((a, b) => a - b);
            const q = (f: number) => xsOrd.length ? xsOrd[Math.floor(f * (xsOrd.length - 1))] : 0;
            const props: any = { layout: "own" };
            if (!(Number(objs?.lowerZones?.lineCount ?? 0) > 0)) Object.assign(props, { lineCount: 2, line1Value: q(1 / 3), line2Value: q(2 / 3) });
            this.persistir([{ objectName: "lowerZones", properties: props }]);
        });
        const trend = objs?.trendLine?.show === true;
        boton(f2, this.t("Guide_Trend", "Trend line"), trend, () => this.persistir([{ objectName: "trendLine", properties: { show: !trend } }]));
        const cards = objs?.cards?.show === true;
        const tabla = objs?.zoneTable?.show === true;
        boton(f2, this.t("Guide_Table", "Zone table"), tabla, () => this.persistir([{ objectName: "zoneTable", properties: { show: !tabla } }]));
        boton(f2, this.t("Guide_Cards", "Zone counts"), cards, () => this.persistir([{ objectName: "cards", properties: { show: !cards } }]));

        const x = document.createElement("button");
        x.type = "button";
        x.className = "bs-g-close";
        x.textContent = "✕";
        x.title = this.t("Guide_Close", "Hide tips (Format → Style template)");
        x.setAttribute("aria-label", x.title);
        if (hc) x.style.color = fg;
        x.addEventListener("click", () => this.persistir([{ objectName: "style", properties: { guide: false } }]));
        g.appendChild(x);
        this.root.appendChild(g);
    }

    /** Sello de compilación, solo en builds de prueba. */
    private renderBuildMarker(): void {
        if (!BUILD_MARKER) return;
        this.root.querySelectorAll(".bs-build").forEach(n => n.remove());
        const m = document.createElement("div");
        m.className = "bs-build";
        m.textContent = "build " + BUILD_MARKER;
        this.root.appendChild(m);
    }

    // ── Pantalla de inicio (serie TCViz) ──────────────────────────────────────

    /** En tres tamaños. Los enlaces solo se abren con un clic (host.launchUrl). */
    private showLanding(vp?: powerbi.IViewport): void {
        this.clear();
        const w = vp?.width || this.root.clientWidth || 0, h = vp?.height || this.root.clientHeight || 0;
        const size = (w >= 560 && h >= 300) ? "l" : (w >= 320 && h >= 200) ? "m" : "s";
        const pal: any = this.host.colorPalette;
        const hc = !!pal?.isHighContrast;
        const fg = hc ? (pal.foreground?.value || "#FFFFFF") : "";
        const el = document.createElement("div");
        el.className = "bs-landing bs-landing-" + size;
        if (hc) el.style.background = pal.background?.value || "#000000";
        const mk = (tag: string, cls?: string, text?: string): HTMLElement => {
            const n = document.createElement(tag);
            if (cls) n.className = cls;
            if (text !== undefined) n.textContent = text;
            if (fg) n.style.color = fg;
            return n;
        };
        const head = mk("div", "cl-head");
        const img = document.createElement("img");
        img.src = LANDING_ICON; img.alt = ""; img.className = "cl-icon";
        head.appendChild(img);
        const titles = mk("div");
        titles.appendChild(mk("div", "cl-title", TITLE));
        if (size !== "s") titles.appendChild(mk("div", "cl-tag", this.t("Landing_Tagline", "Two measures, one picture: where each item stands and which zone it falls in.")));
        head.appendChild(titles);
        el.appendChild(head);
        const link = (txt: string, url: string, cls: string, sub?: string): HTMLElement => {
            const a = mk("a", cls) as HTMLAnchorElement;
            // Sin href: ni el clic central ni "abrir en pestaña" se saltan host.launchUrl.
            a.setAttribute("role", "link"); a.tabIndex = 0;
            a.appendChild(document.createTextNode(txt));
            if (sub) a.appendChild(mk("span", "cl-sub", sub));
            if (hc) { a.style.background = "transparent"; a.style.borderColor = fg; }
            const open = (e: Event): void => { e.preventDefault(); e.stopPropagation(); if (this.interactionsAllowed()) this.host.launchUrl(url); };
            a.addEventListener("click", open);
            a.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") open(e); });
            return a;
        };
        if (size === "s") {
            el.appendChild(mk("p", "cl-do", this.t("Landing_Hint", "Add X axis and Y axis to draw the chart")));
            el.appendChild(link(this.t("Landing_Guide", "Guide"), URL_GUIDE, "cl-a"));
            this.root.appendChild(el);
            return;
        }
        const cols = mk("div", "cl-cols");
        const pasos = mk("div");
        pasos.appendChild(mk("div", "cl-lbl", this.t("Landing_Steps", "Get started")));
        const ol = mk("ol", "cl-steps");
        const paso = (n: string, b: string, txt: string) => {
            const li = mk("li");
            const num = mk("span", "cl-n", n);
            if (hc) Object.assign(num.style, { background: "transparent", border: "1px solid " + fg });
            li.appendChild(num);
            const sp = mk("span");
            sp.appendChild(mk("b", "cl-well", b));
            sp.appendChild(document.createTextNode(" — " + txt));
            li.appendChild(sp);
            ol.appendChild(li);
        };
        paso("1", this.t("Role_category", "Category"), this.t("Landing_Step1", "one point per value: customers, products, projects"));
        paso("2", this.t("Role_xValue", "X axis") + " · " + this.t("Role_yValue", "Y axis"), this.t("Landing_Step2", "the two measures to compare"));
        paso("3", this.t("Role_size", "Size") + " · " + this.t("Role_legend", "Legend"), this.t("Landing_Step3", "optional: bubble size and colour by group"));
        pasos.appendChild(ol);
        if (size === "l") {
            const pro = mk("div", "cl-pro");
            const chip = mk("span", "cl-chip", "Pro");
            if (hc) { chip.style.background = "transparent"; chip.style.border = "1px solid " + fg; }
            pro.appendChild(chip);
            pro.appendChild(mk("span", "", this.t("Landing_Pro", "Different dividers above and below, a channel × zone table, trend line, zone counts and fixed axes — try them on your data while you edit.")));
            pasos.appendChild(pro);
        }
        cols.appendChild(pasos);
        const links = mk("div");
        links.appendChild(mk("div", "cl-lbl", this.t("Landing_Help", "Help")));
        const ll = mk("div", "cl-links");
        ll.appendChild(link(this.t("Landing_Guide", "Guide"), URL_GUIDE, "cl-card", this.t("Landing_GuideSub", "support page")));
        ll.appendChild(link(this.t("Landing_Product", "Product page"), URL_PRODUCT, "cl-card", "tcviz.com"));
        if (size === "l") ll.appendChild(link(this.t("Landing_Video", "Video"), URL_VIDEO, "cl-card", "YouTube"));
        links.appendChild(ll);
        cols.appendChild(links);
        el.appendChild(cols);
        this.root.appendChild(el);
        this.renderBuildMarker();
    }

    // ── Selección ─────────────────────────────────────────────────────────────

    /** Los ids que llegan de un marcador son objetos reconstruidos: se comparan con equals(). */
    private indicesFrom(ids: ISelectionId[]): Set<number> {
        const out = new Set<number>();
        if (!ids?.length) return out;
        this.points.forEach((p, i) => { if (ids.some(id => (p.id as any).equals ? (p.id as any).equals(id) : p.id === id)) out.add(i); });
        return out;
    }

    private zoneKeyOf(p: Point): string {
        const l = this.layout;
        if (!l) return "U0";
        return (p.y >= l.yRef ? "U" : "L") + zoneIndex(p.x, p.y >= l.yRef ? l.upper : l.lower);
    }

    private selectPoints(idx: number[], multi: boolean): void {
        idx = idx.filter(i => !!this.points[i]);
        if (!this.interactionsAllowed() || !idx.length) return;
        if (multi) idx.forEach(i => this.selected.has(i) ? this.selected.delete(i) : this.selected.add(i));
        else this.selected = new Set(idx);
        if (this.selected.size === 0) this.selectionManager.clear();
        else this.selectionManager.select(Array.from(this.selected).map(i => this.points[i].id), false);
        this.redraw();
    }

    private toggleZone(key: string | null): void {
        if (!key || !this.interactionsAllowed()) return;
        if (this.selectedZone === key) { this.clearSelection(); return; }
        this.selectedZone = key;
        // Todas las filas de la zona: el filtro hacia fuera las lleva todas (lección de Calendar 13-10).
        const idx = this.points.map((p, i) => this.zoneKeyOf(p) === key ? i : -1).filter(i => i >= 0);
        this.selected = new Set(idx);
        if (idx.length) this.selectionManager.select(idx.map(i => this.points[i].id), false);
        else this.selectionManager.clear();
        this.redraw();
    }

    private clearSelection(): void {
        if (!this.interactionsAllowed()) return;
        this.selectedZone = null;
        this.selected = new Set();
        this.selectionManager.clear();
        this.redraw();
    }

    private onClick(e: MouseEvent): void {
        if (this.formatMode) return;   // en modo formato el clic elige qué formatear
        const t = e.target as Element;
        const pt = t?.closest?.("[data-idx]");
        if (pt && this.points[Number(pt.getAttribute("data-idx"))]) {
            const i = Number(pt.getAttribute("data-idx"));
            const multi = e.ctrlKey || e.metaKey;
            this.selectedZone = null;
            // Clic de nuevo sobre el único punto seleccionado: deselecciona.
            if (!multi && this.selected.size === 1 && this.selected.has(i)) this.clearSelection();
            else this.selectPoints([i], multi);
            return;
        }
        const leg = t?.closest?.("[data-series]");
        if (leg && leg.getAttribute("data-series") !== "") {
            const name = leg.getAttribute("data-series");
            const idx = this.points.map((p, i) => p.series === name ? i : -1).filter(i => i >= 0);
            this.selectedZone = null;
            if (idx.length) this.selectPoints(idx, e.ctrlKey || e.metaKey);
            return;
        }
        const zone = t?.closest?.("[data-zone]");
        if (zone) { this.toggleZone(zone.getAttribute("data-zone")); return; }
        if (this.selected.size || this.selectedZone) this.clearSelection();
    }

    private onKeyDown(e: KeyboardEvent): void {
        const zoneEl = (e.target as Element)?.closest?.(".bs-zone") as SVGElement | null;
        if (!zoneEl) return;
        const key = zoneEl.getAttribute("data-zone");
        this.focusedZone = key;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.toggleZone(key); }
        else if (e.key === "Escape") { e.preventDefault(); this.clearSelection(); }
        else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
            e.preventDefault();
            const r = zoneEl.getBoundingClientRect();
            const p = this.points.find(q => this.zoneKeyOf(q) === key);
            this.selectionManager.showContextMenu(p ? p.id : ({} as ISelectionId), { x: r.left + r.width / 2, y: r.top + r.height / 2 });
        } else if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].indexOf(e.key) >= 0) {
            e.preventDefault();
            const zones = Array.prototype.slice.call(this.root.querySelectorAll(".bs-zone")) as SVGElement[];
            const i = zones.indexOf(zoneEl);
            const step = (e.key === "ArrowRight" || e.key === "ArrowDown") ? 1 : -1;
            const next = zones[(i + step + zones.length) % zones.length] as any;
            if (next?.focus) { next.focus(); this.focusedZone = next.getAttribute("data-zone"); }
        }
    }

    private onContextMenu(e: MouseEvent): void {
        e.preventDefault();
        if (this.formatMode) return;
        const pt = (e.target as Element)?.closest?.("[data-idx]");
        const p = pt ? this.points[Number(pt.getAttribute("data-idx"))] : null;
        this.selectionManager.showContextMenu(p ? p.id : ({} as ISelectionId), { x: e.clientX, y: e.clientY });
    }

    private onMouseMove(e: MouseEvent): void {
        if (this.formatMode) return;
        const pt = (e.target as Element)?.closest?.("[data-idx]");
        if (!pt) { this.host.tooltipService.hide({ immediately: false, isTouchEvent: false }); return; }
        const p = this.points[Number(pt.getAttribute("data-idx"))];
        if (!p) return;
        const rect = this.root.getBoundingClientRect();
        this.host.tooltipService.show({
            coordinates: [e.clientX - rect.left, e.clientY - rect.top],
            identities: [p.id],
            dataItems: p.tips,
            isTouchEvent: false
        });
    }

    // ── On-object ─────────────────────────────────────────────────────────────

    /** Pieza → [tarjeta, clave del nombre, nombre en inglés]. Las zonas son "zU0", "zL1"… */
    private static readonly SUB: Record<string, [string, string, string]> = {
        points:     ["dataPoints", "card_dataPoints", "Bubbles"],
        labels:     ["dataPoints", "card_dataPoints", "Bubbles"],
        ticks:      ["axes", "card_axes", "Axes"],
        titles:     ["axes", "card_axes", "Axes"],
        plot:       ["axes", "card_axes", "Axes"],
        yline:      ["referenceLines", "card_referenceLines", "Y line"],
        upperZones: ["upperZones", "card_upperZones", "Upper zones"],
        lowerZones: ["lowerZones", "card_lowerZones", "Lower zones"],
        legend:     ["legend", "card_legend", "Legend"],
        trend:      ["trendLine", "card_trendLine", "Trend line (Pro)"],
        cards:      ["cards", "card_cards", "Zone counts (Pro)"],
        table:      ["zoneTable", "card_zoneTable", "Zone table (Pro)"],
    };

    private subInfo(o: string): [string, string, string] | undefined {
        if (/^z[UL]\d$/.test(o)) return o[1] === "U" ? Visual.SUB.upperZones : Visual.SUB.lowerZones;
        return Visual.SUB[o];
    }

    /** Marca lo que se puede elegir en modo formato. Fuera de él, no deja rastro. */
    private markSubSelectables(): void {
        this.root.querySelectorAll("[data-o]").forEach(el => {
            if (!this.formatMode) { el.classList.remove(HtmlSubSelectableClass); return; }
            const o = el.getAttribute("data-o");
            const info = this.subInfo(o);
            if (!info) return;
            el.classList.add(HtmlSubSelectableClass);
            el.setAttribute(SubSelectableObjectNameAttribute, o);
            el.setAttribute(SubSelectableDisplayNameAttribute, this.t(info[1], info[2]));
            const shape = o === "points" || o === "plot" || o[0] === "z" && o.length === 3;
            el.setAttribute(SubSelectableTypeAttribute, String(shape ? powerbi.visuals.SubSelectionStylesType.Shape : powerbi.visuals.SubSelectionStylesType.Text));
        });
    }

    private getSubSelectionStyles(subs: powerbi.visuals.CustomVisualSubSelection[]): powerbi.visuals.SubSelectionStyles | undefined {
        const o = subs[0]?.customVisualObjects[0]?.objectName;
        const ref = (obj: string, prop: string, key: string, def: string) => ({ reference: { objectName: obj, propertyName: prop }, label: this.t(key, def) });
        const Shape = powerbi.visuals.SubSelectionStylesType.Shape, Text = powerbi.visuals.SubSelectionStylesType.Text;
        if (/^z[UL]\d$/.test(o || "")) {
            const obj = o[1] === "U" ? "upperZones" : "lowerZones", n = Number(o[2]) + 1;
            return { type: Shape, fill: ref(obj, `zone${n}Color`, `${obj}_zone${n}Color`, `Zone ${n} colour`) } as any;
        }
        switch (o) {
            case "points": return { type: Shape, fill: ref("dataPoints", "fill", "dataPoints_fill", "Colour"),
                outline: ref("dataPoints", "borderColor", "dataPoints_borderColor", "Border colour") } as any;
            case "plot": return { type: Shape, fill: ref("axes", "plotBackground", "axes_plotBackground", "Plot background") } as any;
            case "labels": return { type: Text, fontSize: ref("dataPoints", "labelSize", "dataPoints_labelSize", "Label size"),
                fontColor: ref("dataPoints", "labelColor", "dataPoints_labelColor", "Label colour") } as any;
            case "ticks": return { type: Text, fontFamily: ref("axes", "fontFamily", "axes_fontFamily", "Font"),
                fontSize: ref("axes", "tickSize", "axes_tickSize", "Tick label size"), fontColor: ref("axes", "tickColor", "axes_tickColor", "Tick label colour") } as any;
            case "titles": return { type: Text, fontSize: ref("axes", "titleSize", "axes_titleSize", "Title size"),
                fontColor: ref("axes", "titleColor", "axes_titleColor", "Title colour") } as any;
            case "upperZones": case "lowerZones": return { type: Text, fontSize: ref(o, "labelFontSize", `${o}_labelFontSize`, "Label font size"),
                fontColor: ref(o, "labelColor", `${o}_labelColor`, "Label colour") } as any;
            case "yline": return { type: Text, fontColor: ref("referenceLines", "yRefColor", "referenceLines_yRefColor", "Y line colour") } as any;
            case "legend": return { type: Text, fontSize: ref("legend", "fontSize", "legend_fontSize", "Font size"),
                fontColor: ref("legend", "color", "legend_color", "Text colour") } as any;
            case "trend": return { type: Text, fontColor: ref("trendLine", "color", "trendLine_color", "Colour") } as any;
            case "cards": return { type: Text, fontSize: ref("cards", "fontSize", "cards_fontSize", "Font size") } as any;
            case "table": return { type: Text, fontSize: ref("zoneTable", "fontSize", "zoneTable_fontSize", "Font size") } as any;
        }
        return undefined;
    }

    private getSubSelectionShortcuts(subs: powerbi.visuals.CustomVisualSubSelection[]): powerbi.visuals.VisualSubSelectionShortcuts | undefined {
        const o = subs[0]?.customVisualObjects[0]?.objectName;
        const info = this.subInfo(o || "");
        if (!info) return undefined;
        const id = (obj: string, prop: string) => ({ objectName: obj, propertyName: prop });
        const toggle = (obj: string, prop: string, key: string, def: string) => ({ type: powerbi.visuals.VisualShortcutType.Toggle, ...id(obj, prop),
            relatedToggledFormattingIds: [id(obj, prop)], disabledLabel: this.t(key, def), enabledLabel: this.t(key, def) });
        const reset = (obj: string, props: string[]) => ({ type: powerbi.visuals.VisualShortcutType.Reset, relatedResetFormattingIds: props.map(p => id(obj, p)) });
        const picker = (obj: string, prop: string, key: string, def: string) => ({ type: powerbi.visuals.VisualShortcutType.Picker, ...id(obj, prop), label: this.t(key, def) });
        // FormattingSettingsService forma el uid "<objeto>-card" y Power BI lo publica como "Visual-<objeto>-card".
        const nav = { type: powerbi.visuals.VisualShortcutType.Navigate, destinationInfo: { cardUid: "Visual-" + info[0] + "-card" }, label: this.t(info[1], info[2]) };
        const div = { type: powerbi.visuals.VisualShortcutType.Divider };
        switch (o) {
            case "points": case "labels":
                return [picker("dataPoints", "colorBy", "dataPoints_colorBy", "Colour by"),
                    toggle("dataPoints", "showLabels", "dataPoints_showLabels", "Data labels"), div,
                    reset("dataPoints", ["fill", "opacity", "radius", "borderColor", "borderWidth"]), nav] as any;
            case "ticks": case "titles": case "plot":
                return [toggle("axes", "showTitles", "axes_showTitles", "Axis titles"),
                    toggle("axes", "showGridlines", "axes_showGridlines", "Gridlines"), div,
                    reset("axes", ["tickSize", "tickColor", "titleSize", "titleColor", "plotBackground"]), nav] as any;
            case "yline":
                return [picker("referenceLines", "yRefMode", "referenceLines_yRefMode", "Y line at"),
                    toggle("referenceLines", "showYRef", "referenceLines_showYRef", "Show Y line"), div, nav] as any;
            case "legend":
                return [picker("legend", "position", "legend_position", "Position"),
                    toggle("legend", "show", "legend_show", "Show legend"), div, reset("legend", ["fontSize", "color"]), nav] as any;
            case "trend":
                return [toggle("trendLine", "showR2", "trendLine_showR2", "Show R²"), div, reset("trendLine", ["color", "width", "style"]), nav] as any;
            case "cards":
                return [toggle("cards", "showPercent", "cards_showPercent", "Show % of points"), div, nav] as any;
            case "table":
                return [picker("zoneTable", "mode", "zoneTable_mode", "Values"), picker("zoneTable", "position", "zoneTable_position", "Position"), div, nav] as any;
            default:
                // Zonas (rótulos o fondo de una zona)
                if (info[0] === "lowerZones") return [picker("lowerZones", "layout", "lowerZones_layout", "Lower half"),
                    toggle("lowerZones", "showLines", "lowerZones_showLines", "Show divider lines"), div, nav] as any;
                return [picker("upperZones", "line1Mode", "upperZones_line1Mode", "Divider 1 at"),
                    toggle("upperZones", "showLines", "upperZones_showLines", "Show divider lines"), div, nav] as any;
        }
    }

    // ── Panel de formato ──────────────────────────────────────────────────────

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        const s = this.settings;
        // Solo los divisores que existen, y la línea Y a mano solo con valor fijo.
        const visibles = (z: ZonesSettings, own: boolean) => {
            const n = Math.round(z.lineCount.value);
            z.lineValue.forEach((sl, i) => { sl.visible = own && i < n; });
            z.lineColor.forEach((sl, i) => { sl.visible = own && i < n; });
            z.lineCount.visible = own;
            z.showLines.visible = own;
            const zonas = Math.min(5, n + 1);
            [z.zoneLabel, z.zoneColor, z.zoneOpacity].forEach(arr => arr.forEach((sl, i) => { sl.visible = i < zonas; }));
        };
        const objs: any = this.lastOptions?.dataViews?.[0]?.metadata?.objects ?? {};
        const lowerMode = this.lowerModeOf(objs, String(objs?.style?.template ?? "classic"));
        visibles(s.upperZones, true);
        if ((s.upperZones.line1Mode.value as any)?.value !== "fixed") s.upperZones.lineValue[0].visible = false;
        visibles(s.lowerZones, lowerMode === "own");
        if (lowerMode !== "own") {
            const zonas = lowerMode === "single" ? 1 : Math.min(5, Math.round(s.upperZones.lineCount.value) + 1);
            [s.lowerZones.zoneLabel, s.lowerZones.zoneColor, s.lowerZones.zoneOpacity].forEach(arr => arr.forEach((sl, i) => { sl.visible = i < zonas; }));
        }
        s.referenceLines.yRef.visible = (s.referenceLines.yRefMode.value as any)?.value === "fixed";
        s.axes.xTitle.visible = s.axes.yTitle.visible = s.axes.titleSize.visible = s.axes.titleColor.visible = !!s.axes.showTitles.value;
        s.axes.gridColor.visible = !!s.axes.showGridlines.value;
        s.dataPoints.labelSize.visible = s.dataPoints.labelColor.visible = !!s.dataPoints.showLabels.value;
        (s.cards as any[]).forEach(c => (c.groups ?? []).forEach((g: any) => {
            if (g.displayNameKey) { g.displayName = this.t(g.displayNameKey, g.displayName); g.displayNameKey = undefined; }
        }));
        const model = this.settingsSvc.buildFormattingModel(s);
        // fx en el color de las burbujas: el color FIJO se guarda a nivel general, no con el selector comodín
        // (si no, llega por fila y el visual lo toma por regla). Bar Chart 1.11, Waterfall 1.2.
        model.cards.forEach((card: any) => (card.groups ?? []).forEach((g: any) => (g.slices ?? []).forEach((sl: any) => {
            const d = sl?.control?.properties?.descriptor;
            if (d?.objectName === "dataPoints" && d?.propertyName === "fill") d.altConstantValueSelector = null;
        })));
        return model;
    }

    /** Power BI recrea el visual al cambiar de página: un temporizador vivo levantaría el Upgrade sobre la nada. */
    public destroy(): void {
        this.notifier?.dispose();
    }
}
