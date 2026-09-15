/**
 * visual.ts — Asymmetric Matrix
 *
 * Scatter plot with configurable asymmetric zones:
 *   · 1 horizontal Y-reference line
 *   · N vertical lines above it  (0-4, independent)
 *   · M vertical lines below it  (0-4, independent)
 *
 * Interaction: click a zone → cross-filter (toggle). Keyboard: Tab / arrows between
 * zones, Enter or Space to select, Escape to clear, Shift+F10 for the context menu.
 * Tech stack:  SVG built with createElementNS + textContent, no D3, no innerHTML.
 */

"use strict";

import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions   = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions        = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual                    = powerbi.extensibility.visual.IVisual;
import IVisualHost                = powerbi.extensibility.visual.IVisualHost;
import DataView                   = powerbi.DataView;
import VisualUpdateType           = powerbi.VisualUpdateType;
import ISelectionId               = powerbi.visuals.ISelectionId;
import ISelectionManager          = powerbi.extensibility.ISelectionManager;

import { parseSettings, VisualSettings, ZoneHalf } from "./settings";

// ── License ──────────────────────────────────────────────────────────────────

// Plan ID tal como aparece en Partner Center (verificado 2026-09-15). Antes se
// comparaba con "asymmetric-matrix-tcviz", que es el id de la OFERTA: Pro no se
// activaba nunca.
const PLAN_ID = "pro";
// ServicePlanState es un const enum: en runtime hacen falta los numeros.
const STATE_ACTIVE  = 1;
const STATE_WARNING = 2;

// spIdentifier = Service ID completo (editor.oferta.plan); se acepta también el Plan ID solo
function matchesPlan(spIdentifier: unknown, planId: string): boolean {
    const sp = String(spIdentifier ?? "");
    return sp === planId || sp.endsWith("." + planId);
}

// La API de licencias exige localizar el texto del aviso (maximo 500 caracteres).
const ES_LABELS: Record<string, string> = {
    "lower zone dividers": "los divisores de la zona inferior",
    "axis titles":         "los títulos de eje",
    "fixed axis range":    "el rango de ejes fijo",
    "data labels":         "las etiquetas de datos",
    "zone cards":          "las tarjetas de zona"
};

// ── SVG helpers ───────────────────────────────────────────────────────────────

const SVG_NS = "http://www.w3.org/2000/svg";

type Attrs = { [key: string]: string | number };

/** Crea un elemento SVG con setAttribute y textContent: nada pasa por un parser HTML. */
function svgEl<K extends keyof SVGElementTagNameMap>(
    tag: K, attrs: Attrs, parent?: Element, text?: string
): SVGElementTagNameMap[K] {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k of Object.keys(attrs)) el.setAttribute(k, String(attrs[k]));
    if (text !== undefined) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
}

function f1(n: number): string { return n.toFixed(1); }

// ── Data model ────────────────────────────────────────────────────────────────

interface DataPoint {
    x: number;
    y: number;
    size: number;
    label: string;
    color: string;
    selectionId: ISelectionId;
    tooltips: { displayName: string; value: string }[];
    highlighted: boolean;
}

// ── Zone helpers ──────────────────────────────────────────────────────────────

/**
 * Given a half-spec (upper or lower) and a sorted list of line values (ascending),
 * return the zone index (0-based) for a given x value.
 */
function zoneIndex(xVal: number, sortedLineVals: number[]): number {
    for (let i = 0; i < sortedLineVals.length; i++) {
        if (xVal < sortedLineVals[i]) return i;
    }
    return sortedLineVals.length;
}

function sortedLines(half: ZoneHalf): number[] {
    return half.lineValues
        .slice(0, half.lineCount)
        .slice()
        .sort((a, b) => a - b);
}

/** Unique zone key for a data point: "U2" (upper, zone 2) or "L0" (lower, zone 0) */
function pointZoneKey(pt: DataPoint, settings: VisualSettings, lowerEnabled: boolean): string {
    const isUpper = pt.y >= settings.refLines.yRef;
    const half    = isUpper ? settings.upper : settings.lower;
    const lines   = isUpper || lowerEnabled ? sortedLines(half) : [];
    const idx     = zoneIndex(pt.x, lines);
    return (isUpper ? "U" : "L") + idx;
}

// ── Main visual ───────────────────────────────────────────────────────────────

export class Visual implements IVisual {

    private host:             IVisualHost;
    private container:        HTMLDivElement;
    private selectionManager: ISelectionManager;
    private events:           any;

    private licenseManager:    any; /* IVisualLicenseManager */
    private tooltipService:    any; /* ITooltipService */
    private isPro: boolean = false; // ISPRO_MARKER
    private licenseRequested      = false;
    private licenseResolved       = false;
    private licenseEnvUnsupported = false;
    private noticeShown           = false;
    private lastBlockedSig        = "";
    private attemptedPro: string[] = [];

    private lastOptions:   VisualUpdateOptions | null = null;
    private lastDataView:  DataView | null = null;
    private lastSettings:  VisualSettings | null = null;
    private lastPoints:    DataPoint[] = [];
    private lastViewport:  powerbi.IViewport = { width: 400, height: 300 };
    private hasRenderedData = false;
    // Id de clipPath unico por instancia (dos visuales en la misma pagina no comparten clip).
    private static instanceCount = 0;
    private readonly clipId = "amClip" + (++Visual.instanceCount);

    // Fixed-axes domain: stores the broadest range seen across all data updates
    private fixedDomain: { xMin: number; xMax: number; yMin: number; yMax: number } | null = null;

    // Selection and keyboard focus state
    private selectedZoneKey: string | null = null;
    private focusedZoneKey:  string | null = null;

    constructor(options: VisualConstructorOptions) {
        this.host             = options.host;
        this.selectionManager = options.host.createSelectionManager();
        this.events           = (options.host as any).eventService;
        this.licenseManager   = (options.host as any).licenseManager;
        this.tooltipService   = (options.host as any).tooltipService;

        this.container = document.createElement("div");
        this.container.className = "asymmetric-matrix-container";
        this.container.style.cssText = "width:100%;height:100%;overflow:hidden;position:relative;";
        options.element.appendChild(this.container);
        this.injectStyles();

        // Zone click via event delegation
        this.container.addEventListener("click", (e: MouseEvent) => this.onContainerClick(e));

        // Context menu (right-click) via event delegation
        this.container.addEventListener("contextmenu", (e: MouseEvent) => this.onContextMenu(e));

        // Tooltip via event delegation
        this.container.addEventListener("mousemove", (e: MouseEvent) => this.onMouseMove(e));
        this.container.addEventListener("mouseleave", ()              => this.onMouseLeave());

        // Keyboard navigation between zones
        this.container.addEventListener("keydown", (e: KeyboardEvent) => this.onKeyDown(e));
        this.container.addEventListener("focusin", (e: FocusEvent) => {
            const t = e.target as Element;
            if (t && t.getAttribute && t.getAttribute("data-zone") && t.classList.contains("am-zone")) {
                this.focusedZoneKey = t.getAttribute("data-zone");
            }
        });
    }

    /** style/visual.less no se empaqueta: el anillo de foco se inyecta desde aqui. */
    private injectStyles(): void {
        const ID = "asymmetric-matrix-styles";
        const doc = this.container.ownerDocument ?? document;
        if (doc.getElementById(ID)) return;
        const st = doc.createElement("style");
        st.id = ID;
        st.textContent = ".asymmetric-matrix-container .am-zone:focus{outline:none;stroke:#1F1F1F;stroke-width:2px}";
        (doc.head ?? this.container).appendChild(st);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);
        this.lastOptions = options;
        try {
            const dv = options?.dataViews?.[0];

            if (!dv) {
                // Landing page — show placeholder
                this.renderLanding(options.viewport);
                this.events.renderingFinished(options);
            } else {
                this.lastDataView = dv;
                const settings = parseSettings(dv);
                this.lastSettings = settings;

                const isDataUpdate = !options.type || (options.type & VisualUpdateType.Data) !== 0;

                if (isDataUpdate) {
                    // Reset fixed domain when data fields change (full reload)
                    const prevRowCount = this.lastPoints.length;
                    this.lastPoints = this.parseDataView(dv, settings);
                    // If new data is larger than previous (not a filter), reset domain so it re-learns
                    if (this.lastPoints.length > prevRowCount) {
                        this.fixedDomain = null;
                    }
                }

                this.lastViewport = options.viewport;
                this.render(this.lastPoints, settings, options.viewport);
                this.events.renderingFinished(options);
            }
        } catch (e) {
            this.events.renderingFailed(options, String(e));
        }
        // Fuera del try: un fallo de licencia nunca convierte un render correcto en renderingFailed.
        this.requestLicenseDeferred();
        this.syncLicenseNotification();
    }

    // ── License ───────────────────────────────────────────────────────────────

    /** Modo edicion (ViewMode: View=0, Edit=1, InFocusEdit=2). Sin viewMode, lectura. */
    private isEditing(): boolean {
        const vm = (this.lastOptions as any)?.viewMode;
        return typeof vm === "number" && vm !== 0;
    }

    /**
     * Vista previa Pro: Free, editando, con la licencia ya resuelta y en un entorno que
     * puede leerla. Las funciones de pago se pintan con marca de agua, que las
     * directrices de publicacion de Microsoft permiten para funciones de pago. En
     * lectura, antes de resolver, o donde la licencia no se puede leer (Publish to Web,
     * exportacion) se pinta el resultado gratuito sin marca.
     */
    private isPreview(): boolean {
        return !this.isPro && this.isEditing() && this.licenseResolved && !this.licenseEnvUnsupported;
    }

    /** Pide la licencia una vez, fuera del camino critico. Si no resuelve, se queda en Free. */
    private requestLicenseDeferred(): void {
        if (this.licenseRequested || this.isPro) return;
        this.licenseRequested = true;
        setTimeout(() => {
            try {
                const lm = this.licenseManager;
                if (!lm) { this.licenseEnvUnsupported = true; this.licenseResolved = true; return; }
                // getAvailableServicePlans devuelve IPromise2: se consume con then(ok, err).
                lm.getAvailableServicePlans().then(
                    (result: any) => {
                        if (result?.isLicenseUnsupportedEnv === true || result?.isLicenseInfoAvailable === false) {
                            this.licenseEnvUnsupported = true;
                        }
                        this.licenseResolved = true;
                        const plans: any[] = result?.plans ?? [];
                        // Warning es periodo de gracia por un problema de pago: sigue siendo usable.
                        const pro = plans.some(p =>
                            matchesPlan(p.spIdentifier, PLAN_ID) &&
                            (p.state === STATE_ACTIVE || p.state === STATE_WARNING));
                        if (pro) this.isPro = true;
                        // Repinta: de Free a Pro, o a la vista previa si toca.
                        this.repaint();
                        this.syncLicenseNotification();
                    },
                    () => { this.licenseEnvUnsupported = true; this.licenseResolved = true; });
            } catch (_) {
                this.licenseEnvUnsupported = true;
                this.licenseResolved = true;
            }
        }, 0);
    }

    /** Repinta con el ultimo estado fuera de update(): no emite rendering events. */
    private repaint(): void {
        if (!this.lastSettings || !this.lastDataView) return;
        try {
            this.render(this.lastPoints, this.lastSettings, this.lastViewport);
        } catch (_) { /* lo ya pintado se queda */ }
    }

    /** La ruta de compra la pone Power BI, nunca el visual. */
    private syncLicenseNotification(): void {
        const lm = this.licenseManager;
        if (!lm) return;
        try {
            if (this.isPro || this.attemptedPro.length === 0) {
                if (this.noticeShown) {
                    this.noticeShown = false;
                    this.lastBlockedSig = "";
                    lm.clearLicenseNotification?.();
                }
                return;
            }
            // Hasta que la licencia responde no se sabe si el usuario paga.
            if (!this.licenseResolved || this.licenseEnvUnsupported) return;
            const sig = this.attemptedPro.join("|");
            if (sig === this.lastBlockedSig) return;
            this.lastBlockedSig = sig;
            this.noticeShown = true;
            const n = this.attemptedPro.length;
            const es = (this.host.locale || "").toLowerCase().startsWith("es");
            const items = es ? this.attemptedPro.map(a => ES_LABELS[a] || a) : this.attemptedPro;
            const list = n === 1 ? items[0]
                : items.slice(0, -1).join(", ") + (es ? " y " : " and ") + items[n - 1];
            const msg = es
                ? `Asymmetric Matrix: ${list} ${n === 1 ? "forma" : "forman"} parte del plan Pro y se muestran como vista previa con marca de agua mientras editas.`
                : `Asymmetric Matrix: ${list} ${n === 1 ? "is" : "are"} part of the Pro plan, shown as a watermarked preview while editing.`;
            // Banner de 10 s con la accion concreta, y el icono persistente de modo edicion.
            lm.notifyFeatureBlocked?.(msg.slice(0, 500));
            lm.notifyLicenseRequired?.(0 /* LicenseNotificationType.General */);
        } catch (_) { /* la notificacion nunca rompe el render */ }
    }

    // ── Parse DataView ────────────────────────────────────────────────────────

    private parseDataView(dv: DataView, settings: VisualSettings): DataPoint[] {
        const cat  = dv.categorical;
        if (!cat) return [];

        const categories  = cat.categories?.[0];
        const values      = cat.values ?? [];
        const rowCount    = categories?.values?.length ?? values[0]?.values?.length ?? 0;
        if (rowCount === 0) return [];

        // Identify value columns by role
        const xCol       = values.filter(v => v.source?.roles?.["xValue"])[0];
        const yCol       = values.filter(v => v.source?.roles?.["yValue"])[0];
        const sizeCol    = values.filter(v => v.source?.roles?.["size"])[0];
        const tipCols    = values.filter(v => v.source?.roles?.["tooltips"]);

        const palette  = this.host.colorPalette;
        const points: DataPoint[] = [];

        // Pre-compute size range for normalization when Size field is mapped
        const baseR  = settings.dataPoints.radius;
        const minR   = Math.max(2, baseR * 0.3);
        const maxR   = baseR * 3;
        let sizeMin = Infinity, sizeMax = -Infinity;
        if (sizeCol) {
            for (let i = 0; i < rowCount; i++) {
                const v = sizeCol.values[i] as number;
                if (typeof v === "number" && !isNaN(v) && v > 0) {
                    if (v < sizeMin) sizeMin = v;
                    if (v > sizeMax) sizeMax = v;
                }
            }
        }
        const sizeRange = sizeMax > sizeMin ? sizeMax - sizeMin : 1;

        for (let i = 0; i < rowCount; i++) {
            const x = (xCol?.values[i] as number) ?? 0;
            const y = (yCol?.values[i] as number) ?? 0;

            const catLabel = String(categories?.values?.[i] ?? i);
            const color    = palette.getColor(catLabel).value;

            const sid = this.host.createSelectionIdBuilder()
                .withCategory(categories, i)
                .createSelectionId();

            const sizeRaw = sizeCol ? (sizeCol.values[i] as number) : NaN;
            const size    = (sizeCol && !isNaN(sizeRaw) && sizeRaw > 0)
                ? minR + ((sizeRaw - sizeMin) / sizeRange) * (maxR - minR)
                : baseR;

            const tooltips: { displayName: string; value: string }[] = [
                { displayName: xCol?.source?.displayName ?? "X", value: fmtNum(x) },
                { displayName: yCol?.source?.displayName ?? "Y", value: fmtNum(y) },
                ...tipCols.map(tc => ({
                    displayName: tc.source?.displayName ?? "",
                    value: String(tc.values[i] ?? "")
                }))
            ];

            // Highlight: non-null highlight value means this row is highlighted
            const hlVal   = xCol?.highlights?.[i];
            const hasHl   = xCol?.highlights != null;
            const highlighted = hasHl ? (hlVal !== null && hlVal !== undefined) : false;

            points.push({ x, y, size, label: catLabel, color, selectionId: sid, tooltips, highlighted });
        }
        return points;
    }

    /** Si la zona inferior asimetrica esta disponible (Pro o vista previa). */
    private lowerEnabled(): boolean {
        return this.isPro || this.isPreview();
    }

    private zoneKeyOf(pt: DataPoint): string {
        return pointZoneKey(pt, this.lastSettings!, this.lowerEnabled());
    }

    // ── Render ────────────────────────────────────────────────────────────────

    private render(points: DataPoint[], settings: VisualSettings, viewport: powerbi.IViewport): void {
        // Lo que el usuario ha pedido y el tier gratuito no da: alimenta el aviso y la marca.
        const attempted: string[] = [];
        if (settings.lower.lineCount > 0)                    attempted.push("lower zone dividers");
        if (settings.axes.xTitle || settings.axes.yTitle)    attempted.push("axis titles");
        if (settings.axes.fixedAxes)                         attempted.push("fixed axis range");
        if (settings.dataPoints.showLabels)                  attempted.push("data labels");
        if (settings.cards.show)                             attempted.push("zone cards");
        this.attemptedPro = this.isPro ? [] : attempted;

        if (points.length === 0 && this.hasRenderedData) return;
        if (points.length > 0) this.hasRenderedData = true;

        const pro = this.isPro || this.isPreview();

        const W = viewport.width;
        const H = viewport.height;

        // Margins
        const ML = 50, MR = 20, MT = 20, MB = 40;
        const plotW = W - ML - MR;
        const plotH = H - MT - MB;

        if (plotW <= 0 || plotH <= 0) return;

        // High contrast: el significado no puede ir en el relleno.
        const cp: any = this.host.colorPalette;
        const hc = !!cp?.isHighContrast;
        const fg    = hc ? cp.foreground.value : "";
        const bg    = hc ? cp.background.value : "";
        const fgSel = hc ? cp.foregroundSelected.value : "";

        // Data extents from current points
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        const rawXMin = xs.length ? Math.min(...xs) : -1;
        const rawXMax = xs.length ? Math.max(...xs) : 1;
        const rawYMin = ys.length ? Math.min(...ys) : -1;
        const rawYMax = ys.length ? Math.max(...ys) : 1;

        // Update fixed domain: always expand, never shrink
        if (!this.fixedDomain) {
            this.fixedDomain = { xMin: rawXMin, xMax: rawXMax, yMin: rawYMin, yMax: rawYMax };
        } else {
            if (rawXMin < this.fixedDomain.xMin) this.fixedDomain.xMin = rawXMin;
            if (rawXMax > this.fixedDomain.xMax) this.fixedDomain.xMax = rawXMax;
            if (rawYMin < this.fixedDomain.yMin) this.fixedDomain.yMin = rawYMin;
            if (rawYMax > this.fixedDomain.yMax) this.fixedDomain.yMax = rawYMax;
        }

        // Fixed axes (Pro)
        const useFixedAxes = pro && settings.axes.fixedAxes;
        const domXMin = useFixedAxes ? this.fixedDomain.xMin : rawXMin;
        const domXMax = useFixedAxes ? this.fixedDomain.xMax : rawXMax;
        const domYMin = useFixedAxes ? this.fixedDomain.yMin : rawYMin;
        const domYMax = useFixedAxes ? this.fixedDomain.yMax : rawYMax;

        const xPad = (domXMax - domXMin) * 0.08 || 1;
        const yPad = (domYMax - domYMin) * 0.08 || 1;

        let xMin = domXMin - xPad;
        const xMax = domXMax + xPad;
        let yMin = domYMin - yPad;
        let yMax = domYMax + yPad;
        xMin = Math.min(xMin, xMax - 1e-9);

        // Y ref siempre visible aunque esté fuera del rango de datos
        const yRef = settings.refLines.yRef;
        if (yRef < yMin) yMin = yRef - yPad;
        if (yRef > yMax) yMax = yRef + yPad;

        const xScale = (v: number) => ML + ((v - xMin) / (xMax - xMin)) * plotW;
        const yScale = (v: number) => MT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

        const yRefPx = yScale(yRef);
        // hasHighlights = filter-in mode active (at least one point is highlighted)
        const hasHighlights = points.some(p => p.highlighted);

        const upperLines = sortedLines(settings.upper);
        // Lower asymmetry (Pro): in free, 0 lines (1 zone)
        const lowerLines = pro ? sortedLines(settings.lower) : [];

        // Count per zone for cards and aria labels
        const zoneCounts: Record<string, number> = {};
        for (const pt of points) {
            const key = pointZoneKey(pt, settings, pro);
            zoneCounts[key] = (zoneCounts[key] ?? 0) + 1;
        }

        // ── SVG skeleton ──────────────────────────────────────────────────────
        const svg = svgEl("svg", {
            width: W, height: H, style: "display:block", role: "group",
            "aria-label": `Asymmetric Matrix, ${points.length} points`
        });
        const defs = svgEl("defs", {}, svg);
        const clip = svgEl("clipPath", { id: this.clipId }, defs);
        svgEl("rect", { x: ML, y: MT, width: plotW, height: plotH }, clip);

        svgEl("rect", {
            x: ML, y: MT, width: plotW, height: plotH,
            fill: hc ? bg : "#FFFFFF", stroke: hc ? fg : "#CCCCCC", "stroke-width": 1
        }, svg);

        const clipAttr = { "clip-path": `url(#${this.clipId})` };
        const gZones  = svgEl("g", clipAttr, svg);
        const gGrid   = svgEl("g", clipAttr, svg);
        const gVLines = svgEl("g", clipAttr, svg);
        const gYLine  = svgEl("g", clipAttr, svg);
        const gTicks  = svgEl("g", {}, svg);
        const gTitles = svgEl("g", {}, svg);
        const gPoints = svgEl("g", clipAttr, svg);
        const gLabels = svgEl("g", clipAttr, svg);
        const gCards  = svgEl("g", {}, svg);

        // ── Zones ─────────────────────────────────────────────────────────────
        const renderHalfZones = (isUpper: boolean, half: ZoneHalf, lines: number[]) => {
            const yTop    = isUpper ? MT : yRefPx;
            const yBottom = isUpper ? yRefPx : MT + plotH;
            const zoneH   = Math.abs(yBottom - yTop);

            const xBoundaries = [ML, ...lines.map(xScale), ML + plotW];

            for (let zi = 0; zi < lines.length + 1; zi++) {
                const zx    = xBoundaries[zi];
                const zw    = xBoundaries[zi + 1] - zx;
                const zy    = Math.min(yTop, yBottom);
                const key   = (isUpper ? "U" : "L") + zi;
                const label = half.zoneLabels[zi] ?? `Zone ${zi + 1}`;
                const color = half.zoneColors[zi] ?? "#EEEEEE";
                const opacity = (half.zoneOpacities[zi] ?? 40) / 100;  // 0-100 → 0-1

                const isSelected = this.selectedZoneKey === key;
                const isDimmed   = this.selectedZoneKey !== null && !isSelected;

                const bgOpacity = isDimmed ? opacity * 0.3 : opacity;
                const strokeOp  = isDimmed ? 0.3 : 1;
                const count     = zoneCounts[key] ?? 0;

                // Zone background rect (goes below points); focusable for keyboard users
                svgEl("rect", {
                    "data-zone": key, class: "am-zone",
                    x: f1(zx), y: f1(zy), width: f1(zw), height: f1(zoneH),
                    fill: hc ? bg : color,
                    "fill-opacity": hc ? 0 : bgOpacity.toFixed(2),
                    stroke: hc ? (isSelected ? fgSel : fg) : "none",
                    "stroke-width": hc ? (isSelected ? 3 : 1) : 0,
                    cursor: "pointer", tabindex: 0, role: "button",
                    "aria-pressed": isSelected ? "true" : "false",
                    "aria-label": `${isUpper ? "Upper" : "Lower"} zone ${label}: ${count} point${count === 1 ? "" : "s"}`
                }, gZones);

                // Zone label — floating centered, rendered ABOVE points
                const fs      = half.labelFontSize;
                const labelX  = zx + zw / 2;
                const labelY  = zy + zoneH / 2 + fs * 0.35;
                const bgPad   = 4;
                const bgW     = Math.max(0, Math.min(zw - 8, label.length * fs * 0.6 + bgPad * 2));
                const bgH     = fs + bgPad * 2;
                const labelBgOp = half.labelBgOpacity / 100;
                if (labelBgOp > 0 && !hc) {
                    svgEl("rect", {
                        x: f1(labelX - bgW / 2), y: f1(labelY - fs - bgPad + fs * 0.35),
                        width: f1(bgW), height: f1(bgH), rx: 4, ry: 4,
                        fill: half.labelBgColor, "fill-opacity": (labelBgOp * strokeOp).toFixed(2),
                        "pointer-events": "none"
                    }, gLabels);
                }
                svgEl("text", {
                    "data-zone": key, x: f1(labelX), y: f1(labelY),
                    "text-anchor": "middle", "font-family": "Segoe UI,sans-serif", "font-size": fs,
                    fill: hc ? fg : "#444444", opacity: strokeOp.toFixed(2), "pointer-events": "none",
                    "aria-hidden": "true"
                }, gLabels, label);
            }
        };

        renderHalfZones(true,  settings.upper, upperLines);
        renderHalfZones(false, settings.lower, lowerLines);

        // ── Gridlines ─────────────────────────────────────────────────────────
        const tickCount = 5;
        if (settings.axes.showGridlines) {
            const gridStroke = hc ? fg : "#DDDDDD";
            const gridOpacity = hc ? 0.3 : 1;
            for (let i = 0; i <= tickCount; i++) {
                const px = xScale(xMin + (i / tickCount) * (xMax - xMin));
                svgEl("line", { x1: f1(px), y1: MT, x2: f1(px), y2: MT + plotH, stroke: gridStroke, "stroke-width": 1, opacity: gridOpacity }, gGrid);
            }
            for (let i = 0; i <= tickCount; i++) {
                const py = yScale(yMin + (i / tickCount) * (yMax - yMin));
                svgEl("line", { x1: ML, y1: f1(py), x2: ML + plotW, y2: f1(py), stroke: gridStroke, "stroke-width": 1, opacity: gridOpacity }, gGrid);
            }
        }

        // ── Axis ticks ────────────────────────────────────────────────────────
        const ts = settings.axes.tickSize;
        const tc = hc ? fg : settings.axes.tickColor;
        const td = settings.axes.tickDecimals;
        for (let i = 0; i <= tickCount; i++) {
            const xv = xMin + (i / tickCount) * (xMax - xMin);
            const px = xScale(xv);
            svgEl("line", { x1: f1(px), y1: MT + plotH, x2: f1(px), y2: MT + plotH + 5, stroke: tc, "stroke-width": 1 }, gTicks);
            svgEl("text", { x: f1(px), y: MT + plotH + 16, "text-anchor": "middle", "font-family": "Segoe UI,sans-serif", "font-size": ts, fill: tc }, gTicks, fmtNum(xv, td));

            const yv = yMin + (i / tickCount) * (yMax - yMin);
            const py = yScale(yv);
            svgEl("line", { x1: ML - 5, y1: f1(py), x2: ML, y2: f1(py), stroke: tc, "stroke-width": 1 }, gTicks);
            svgEl("text", { x: ML - 8, y: f1(py + ts * 0.35), "text-anchor": "end", "font-family": "Segoe UI,sans-serif", "font-size": ts, fill: tc }, gTicks, fmtNum(yv, td));
        }

        // ── Axis titles (Pro) ─────────────────────────────────────────────────
        if (pro) {
            const tts = settings.axes.titleSize;
            if (settings.axes.xTitle) {
                svgEl("text", { x: f1(ML + plotW / 2), y: H - 4, "text-anchor": "middle", "font-family": "Segoe UI,sans-serif", "font-size": tts, fill: tc }, gTitles, settings.axes.xTitle);
            }
            if (settings.axes.yTitle) {
                const cx = 12, cy = MT + plotH / 2;
                svgEl("text", { transform: `rotate(-90,${cx},${cy})`, x: cx, y: cy, "text-anchor": "middle", "font-family": "Segoe UI,sans-serif", "font-size": tts, fill: tc }, gTitles, settings.axes.yTitle);
            }
        }

        // ── Y reference line ──────────────────────────────────────────────────
        if (settings.refLines.showYRef) {
            const attrs: Attrs = {
                x1: ML, y1: f1(yRefPx), x2: ML + plotW, y2: f1(yRefPx),
                stroke: hc ? fg : settings.refLines.yRefColor, "stroke-width": 1.5
            };
            if (settings.refLines.yRefStyle === "dashed") attrs["stroke-dasharray"] = "8,4";
            if (settings.refLines.yRefStyle === "dotted") attrs["stroke-dasharray"] = "2,4";
            svgEl("line", attrs, gYLine);
        }

        // ── Vertical zone divider lines ───────────────────────────────────────
        const renderVLines = (lines: number[], colors: string[], show: boolean) => {
            if (!show) return;
            for (let i = 0; i < lines.length; i++) {
                const px = xScale(lines[i]);
                svgEl("line", {
                    x1: f1(px), y1: MT, x2: f1(px), y2: MT + plotH,
                    stroke: hc ? fg : (colors[i] ?? "#AAAAAA"), "stroke-width": 1,
                    "stroke-dasharray": "6,3", opacity: 0.8
                }, gVLines);
            }
        };
        renderVLines(upperLines, settings.upper.lineColors, settings.upper.showLines);
        renderVLines(lowerLines, settings.lower.lineColors, settings.lower.showLines);

        // ── Data points ───────────────────────────────────────────────────────
        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            const cx = xScale(pt.x);
            const cy = yScale(pt.y);
            const r  = pt.size;  // uses Size field if mapped, otherwise dataPoints.radius

            const zKey = pointZoneKey(pt, settings, pro);
            const dimByZone = this.selectedZoneKey !== null && this.selectedZoneKey !== zKey;

            let circleOpacity = settings.dataPoints.opacity / 100;  // 0-100 → 0-1
            if (hasHighlights && !pt.highlighted) circleOpacity *= 0.25;
            if (dimByZone) circleOpacity *= 0.25;

            svgEl("circle", {
                "data-idx": i, cx: f1(cx), cy: f1(cy), r: f1(r),
                fill: hc ? fg : pt.color, opacity: circleOpacity.toFixed(2),
                stroke: hc ? bg : "#FFFFFF", "stroke-width": 1, cursor: "pointer"
            }, gPoints);

            // Data label (Pro)
            if (pro && settings.dataPoints.showLabels) {
                svgEl("text", {
                    x: f1(cx), y: f1(cy - r - 3), "text-anchor": "middle",
                    "font-family": "Segoe UI,sans-serif", "font-size": 10, fill: hc ? fg : "#333333",
                    opacity: circleOpacity.toFixed(2), "pointer-events": "none"
                }, gPoints, pt.label);
            }
        }

        // ── Zone cards (Pro) ──────────────────────────────────────────────────
        if (pro && settings.cards.show) {
            const upperXBounds = [ML, ...upperLines.map(xScale), ML + plotW];
            const lowerXBounds = [ML, ...lowerLines.map(xScale), ML + plotW];
            this.buildCards(gCards, zoneCounts, upperXBounds, lowerXBounds, MT, yRefPx, hc, fg, bg);
        }

        this.renderWatermark(svg, W, H);

        // ── Atomic swap, keeping keyboard focus on the same zone ─────────────
        const doc = this.container.ownerDocument ?? document;
        const hadFocus = this.container.contains(doc.activeElement);
        while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
        this.container.appendChild(svg);
        if (hadFocus && this.focusedZoneKey) {
            const z = svg.querySelector(`.am-zone[data-zone="${this.focusedZoneKey}"]`) as SVGElement | null;
            if (z && typeof (z as any).focus === "function") (z as any).focus();
        }
    }

    /** Marca de agua solo sobre funciones de pago usadas sin licencia (vista previa Pro). */
    private renderWatermark(svg: SVGSVGElement, W: number, H: number): void {
        if (!this.isPreview() || this.attemptedPro.length === 0) return;
        const cx = W / 2, cy = H / 2;
        svgEl("text", {
            x: cx, y: cy, "text-anchor": "middle", "dominant-baseline": "middle",
            transform: `rotate(-20 ${cx} ${cy})`, "font-family": "Segoe UI,sans-serif",
            "font-size": Math.max(14, Math.min(W, H) / 9), "font-weight": 700,
            fill: "#83827D", opacity: 0.22, "pointer-events": "none", "aria-hidden": "true"
        }, svg, "Pro preview");
    }

    // ── Zone cards builder ────────────────────────────────────────────────────
    //  xBounds: pixel X boundaries for each zone boundary (already scaled)

    private buildCards(
        parent: SVGGElement,
        counts: Record<string, number>,
        upperXBounds: number[],
        lowerXBounds: number[],
        yTop: number, yRef: number,
        hc: boolean, fg: string, bg: string
    ): void {
        const renderHalfCards = (isUpper: boolean, xBounds: number[]) => {
            const bandTop = isUpper ? yTop : yRef;
            const nZones  = xBounds.length - 1;
            const PAD     = 5; // px from top-left corner of zone

            for (let zi = 0; zi < nZones; zi++) {
                const key    = (isUpper ? "U" : "L") + zi;
                const count  = counts[key] ?? 0;
                const bx     = xBounds[zi] + PAD;
                const by     = bandTop + PAD;
                const label  = String(count);
                const bw     = Math.max(26, label.length * 8 + 10);
                const bh     = 20;

                svgEl("rect", {
                    x: f1(bx), y: f1(by), width: bw, height: bh, rx: 4,
                    fill: hc ? bg : "rgba(0,0,0,0.55)", stroke: hc ? fg : "none",
                    "data-zone": key, cursor: "pointer", "aria-hidden": "true"
                }, parent);
                svgEl("text", {
                    x: f1(bx + bw / 2), y: f1(by + bh / 2 + 4), "text-anchor": "middle",
                    "font-family": "Segoe UI,sans-serif", "font-size": 11, "font-weight": 600,
                    fill: hc ? fg : "#FFFFFF", "pointer-events": "none", "aria-hidden": "true"
                }, parent, label);
            }
        };

        renderHalfCards(true,  upperXBounds);
        renderHalfCards(false, lowerXBounds);
    }

    // ── Landing page ──────────────────────────────────────────────────────────

    private renderLanding(viewport: powerbi.IViewport): void {
        const W = viewport.width, H = viewport.height;
        const svg = svgEl("svg", {
            width: W, height: H, style: "display:block", role: "img",
            "aria-label": "Asymmetric Matrix: add X Value and Y Value fields to get started"
        });
        svgEl("rect", { width: W, height: H, fill: "#FAF9F5" }, svg);
        const lines: [string, number, number, string, number][] = [
            ["Asymmetric Matrix", 16, 600, "#3D3929", 0],
            ["Add X Value and Y Value fields to get started", 12, 400, "#83827D", 24],
            ["Category, Size and Tooltips are optional", 12, 400, "#83827D", 18],
            ["Pro plan on Microsoft AppSource: lower-zone dividers, axis titles,", 11, 600, "#9C87F5", 28],
            ["fixed axis range, data labels and zone cards", 11, 600, "#9C87F5", 16]
        ];
        let y = H / 2 - 44;
        for (const [text, size, weight, color, dy] of lines) {
            y += dy;
            svgEl("text", {
                x: W / 2, y: f1(y), "text-anchor": "middle", "font-family": "Segoe UI,sans-serif",
                "font-size": size, "font-weight": weight, fill: color
            }, svg, text);
        }
        while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
        this.container.appendChild(svg);
    }

    // ── Selection ─────────────────────────────────────────────────────────────

    private canInteract(): boolean {
        return (this.host as any).allowInteractions !== false;
    }

    private toggleZone(key: string | null): void {
        if (!key || !this.lastSettings || !this.canInteract()) return;
        if (this.selectedZoneKey === key) {
            this.selectedZoneKey = null;
            this.selectionManager.clear();
        } else {
            this.selectedZoneKey = key;
            const ids = this.lastPoints
                .filter(pt => this.zoneKeyOf(pt) === key)
                .map(pt => pt.selectionId);
            if (ids.length > 0) {
                this.selectionManager.select(ids, false);
            } else {
                // Zone exists but contains no data points — clear any prior selection
                this.selectionManager.clear();
            }
        }
        this.render(this.lastPoints, this.lastSettings, this.lastViewport);
    }

    private clearSelection(): void {
        if (!this.lastSettings || !this.canInteract()) return;
        this.selectedZoneKey = null;
        this.selectionManager.clear();
        this.render(this.lastPoints, this.lastSettings, this.lastViewport);
    }

    // ── Click handler ─────────────────────────────────────────────────────────

    private onContainerClick(e: MouseEvent): void {
        const target = e.target as SVGElement;
        const zoneEl = target.closest ? (target.closest("[data-zone]") as SVGElement) : null;
        const ptEl   = target.closest ? (target.closest("[data-idx]")  as SVGElement) : null;

        // Click on a data point bubble selects the whole zone it belongs to
        if (ptEl && !zoneEl) {
            const idx = parseInt(ptEl.getAttribute("data-idx") ?? "-1", 10);
            const pt  = this.lastPoints[idx];
            if (pt && this.lastSettings) this.toggleZone(this.zoneKeyOf(pt));
            return;
        }

        // Click on zone background rect / label / card
        if (zoneEl) {
            this.toggleZone(zoneEl.getAttribute("data-zone"));
            return;
        }

        // Click on empty chart area
        this.clearSelection();
    }

    // ── Keyboard handler ──────────────────────────────────────────────────────

    private onKeyDown(e: KeyboardEvent): void {
        const target = e.target as Element;
        const zoneEl = target && target.closest ? (target.closest(".am-zone") as SVGElement) : null;
        if (!zoneEl) return;
        const key = zoneEl.getAttribute("data-zone");
        this.focusedZoneKey = key;

        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.toggleZone(key);
        } else if (e.key === "Escape") {
            e.preventDefault();
            this.clearSelection();
        } else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
            e.preventDefault();
            const r = zoneEl.getBoundingClientRect();
            this.showMenuForZone(key, r.left + r.width / 2, r.top + r.height / 2);
        } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            const zones = Array.prototype.slice.call(this.container.querySelectorAll(".am-zone")) as SVGElement[];
            const i = zones.indexOf(zoneEl);
            const step = (e.key === "ArrowRight" || e.key === "ArrowDown") ? 1 : -1;
            const next = zones[(i + step + zones.length) % zones.length];
            if (next && typeof (next as any).focus === "function") {
                (next as any).focus();
                this.focusedZoneKey = next.getAttribute("data-zone");
            }
        }
    }

    // ── Context menu handler ──────────────────────────────────────────────────

    private onContextMenu(e: MouseEvent): void {
        e.preventDefault();
        const target = e.target as SVGElement;
        const ptEl   = target.closest ? (target.closest("[data-idx]")  as SVGElement) : null;
        const zoneEl = target.closest ? (target.closest("[data-zone]") as SVGElement) : null;

        if (ptEl) {
            const idx = parseInt(ptEl.getAttribute("data-idx") ?? "-1", 10);
            const pt  = this.lastPoints[idx];
            this.selectionManager.showContextMenu(
                pt ? pt.selectionId : ({} as ISelectionId),
                { x: e.clientX, y: e.clientY }
            );
            return;
        }
        this.showMenuForZone(zoneEl ? zoneEl.getAttribute("data-zone") : null, e.clientX, e.clientY);
    }

    private showMenuForZone(key: string | null, x: number, y: number): void {
        let sid: ISelectionId | null = null;
        if (key && this.lastSettings) {
            const first = this.lastPoints.find(p => this.zoneKeyOf(p) === key);
            if (first) sid = first.selectionId;
        }
        this.selectionManager.showContextMenu(sid ?? ({} as ISelectionId), { x, y });
    }

    // ── Tooltip handlers ─────────────────────────────────────────────────────

    private onMouseMove(e: MouseEvent): void {
        const target = e.target as SVGElement;
        const ptEl   = target.closest ? (target.closest("[data-idx]") as SVGElement) : null;
        if (!ptEl || !this.tooltipService) return;

        const idx = parseInt(ptEl.getAttribute("data-idx") ?? "-1", 10);
        const pt  = this.lastPoints[idx];
        if (!pt) return;

        const dataItems = pt.tooltips.map(t => ({
            displayName: t.displayName,
            value:       t.value
        }));

        this.tooltipService.show({
            coordinates:   [e.clientX, e.clientY],
            identities:    [pt.selectionId],
            dataItems,
            isTouchEvent:  false
        });
    }

    private onMouseLeave(): void {
        if (this.tooltipService) {
            this.tooltipService.hide({ immediately: false, isTouchEvent: false });
        }
    }

    // ── Format Pane ───────────────────────────────────────────────────────────
    //  Todas las opciones se muestran siempre; las de pago llevan "(Pro)" en
    //  capabilities.json. Antes se ocultaban a Free y nadie descubria que existian.

    public enumerateObjectInstances(
        options: powerbi.EnumerateVisualObjectInstancesOptions
    ): powerbi.VisualObjectInstanceEnumeration {
        const s  = this.lastSettings;
        const obj = options.objectName;
        const instances: powerbi.VisualObjectInstance[] = [];

        if (!s) return instances;

        if (obj === "referenceLines") {
            instances.push({
                objectName: obj, selector: null,
                properties: {
                    showYRef:  s.refLines.showYRef,
                    yRef:      s.refLines.yRef,
                    yRefColor: { solid: { color: s.refLines.yRefColor } },
                    yRefStyle: s.refLines.yRefStyle
                }
            });
        }

        const halfProps = (half: ZoneHalf): { [key: string]: any } => {
            const props: { [key: string]: any } = { showLines: half.showLines, lineCount: half.lineCount };
            for (let i = 1; i <= 4; i++) {
                props[`line${i}Value`] = half.lineValues[i - 1];
                props[`line${i}Color`] = { solid: { color: half.lineColors[i - 1] } };
            }
            for (let i = 1; i <= 5; i++) {
                props[`zone${i}Label`]   = half.zoneLabels[i - 1];
                props[`zone${i}Color`]   = { solid: { color: half.zoneColors[i - 1] } };
                props[`zone${i}Opacity`] = half.zoneOpacities[i - 1];
            }
            props["labelFontSize"]  = half.labelFontSize;
            props["labelBgColor"]   = { solid: { color: half.labelBgColor } };
            props["labelBgOpacity"] = half.labelBgOpacity;
            return props;
        };

        if (obj === "upperZones") {
            instances.push({ objectName: obj, selector: null, properties: halfProps(s.upper) });
        }

        if (obj === "lowerZones") {
            instances.push({ objectName: obj, selector: null, properties: halfProps(s.lower) });
        }

        if (obj === "axes") {
            instances.push({
                objectName: obj, selector: null,
                properties: {
                    tickSize:      s.axes.tickSize,
                    tickColor:     { solid: { color: s.axes.tickColor } },
                    showGridlines: s.axes.showGridlines,
                    tickDecimals:  s.axes.tickDecimals,
                    xTitle:        s.axes.xTitle,
                    yTitle:        s.axes.yTitle,
                    titleSize:     s.axes.titleSize,
                    fixedAxes:     s.axes.fixedAxes
                }
            });
        }

        if (obj === "dataPoints") {
            instances.push({
                objectName: obj, selector: null,
                properties: {
                    radius:     s.dataPoints.radius,
                    opacity:    s.dataPoints.opacity,
                    showLabels: s.dataPoints.showLabels
                }
            });
        }

        if (obj === "cards") {
            instances.push({
                objectName: obj, selector: null,
                properties: { show: s.cards.show }
            });
        }

        return instances;
    }
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function fmtNum(n: number, decimals = -1): string {
    if (decimals >= 0) return n.toFixed(decimals);
    if (Math.abs(n) >= 1e6)  return (n / 1e6).toFixed(1) + "M";
    if (Math.abs(n) >= 1e3)  return (n / 1e3).toFixed(1) + "K";
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2);
}
