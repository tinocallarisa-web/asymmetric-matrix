/**
 * visual.ts — Asymmetric Matrix
 *
 * Scatter plot with configurable asymmetric zones:
 *   · 1 horizontal Y-reference line
 *   · N vertical lines above it  (0-4, independent)
 *   · M vertical lines below it  (0-4, independent)
 *
 * Interaction: click a zone → cross-filter (toggle).
 * Tech stack:  pure SVG strings, no D3.
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

const SP_IDENTIFIER = "asymmetric-matrix-tcviz";

async function resolveLicense(lm: any): Promise<boolean> {
    try {
        const result = await new Promise<boolean>(resolve => {
            lm.getAvailableServicePlans().then(
                (r: any) => {
                    const plans: any[] = r?.plans ?? [];
                    const active = plans.some(
                        p => p.spIdentifier === SP_IDENTIFIER &&
                             (p.state as unknown as number) === 1 /* ServicePlanState.Active */
                    );
                    resolve(active);
                },
                () => resolve(false)
            );
        });
        return result;
    } catch { return false; }
}

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
function pointZoneKey(pt: DataPoint, settings: VisualSettings): string {
    const isUpper = pt.y >= settings.refLines.yRef;
    const half    = isUpper ? settings.upper : settings.lower;
    const lines   = sortedLines(half);
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
    private licenseRequested   = false;

    private lastDataView:  DataView | null = null;
    private lastSettings:  VisualSettings | null = null;
    private lastPoints:    DataPoint[] = [];
    private lastViewport:  powerbi.IViewport = { width: 400, height: 300 };
    private hasRenderedData = false;

    // Fixed-axes domain: stores the broadest range seen across all data updates
    private fixedDomain: { xMin: number; xMax: number; yMin: number; yMax: number } | null = null;

    // Selection state
    private selectedZoneKey: string | null = null;

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

        // Zone click via event delegation
        this.container.addEventListener("click", (e: MouseEvent) => this.onContainerClick(e));

        // Context menu (right-click) via event delegation
        this.container.addEventListener("contextmenu", (e: MouseEvent) => this.onContextMenu(e));

        // Tooltip via event delegation
        this.container.addEventListener("mousemove", (e: MouseEvent) => this.onMouseMove(e));
        this.container.addEventListener("mouseleave", ()              => this.onMouseLeave());
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);
        try {
            const dv = options?.dataViews?.[0];

            if (!dv) {
                // Landing page — show placeholder
                this.renderLanding(options.viewport);
                this.events.renderingFinished(options);
                return;
            }

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

            // Request license once after first render
            if (!this.licenseRequested) {
                this.licenseRequested = true;
                setTimeout(() => {
                    resolveLicense(this.licenseManager).then(isPro => this.applyLicense(isPro));
                }, 0);
            }

            this.events.renderingFinished(options);
        } catch (e) {
            this.events.renderingFailed(options, String(e));
        }
    }

    private applyLicense(isPro: boolean): void {
        if (!isPro || this.isPro) return;
        this.isPro = true;
        if (this.lastPoints && this.lastSettings) {
            this.render(this.lastPoints, this.lastSettings, this.lastViewport);
        }
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

    // ── Render ────────────────────────────────────────────────────────────────

    private render(points: DataPoint[], settings: VisualSettings, viewport: powerbi.IViewport): void {
        if (points.length === 0 && this.hasRenderedData) return;
        if (points.length > 0) this.hasRenderedData = true;

        const W = viewport.width;
        const H = viewport.height;

        // Margins
        const ML = 50, MR = 20, MT = 20, MB = 40;
        const plotW = W - ML - MR;
        const plotH = H - MT - MB;

        if (plotW <= 0 || plotH <= 0) return;

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

        // Option B (Pro): fixed axes locked off in free
        const useFixedAxes = this.isPro && settings.axes.fixedAxes;
        const domXMin = useFixedAxes ? this.fixedDomain.xMin : rawXMin;
        const domXMax = useFixedAxes ? this.fixedDomain.xMax : rawXMax;
        const domYMin = useFixedAxes ? this.fixedDomain.yMin : rawYMin;
        const domYMax = useFixedAxes ? this.fixedDomain.yMax : rawYMax;

        const xPad = (domXMax - domXMin) * 0.08 || 1;
        const yPad = (domYMax - domYMin) * 0.08 || 1;

        let xMin = domXMin - xPad;
        let xMax = domXMax + xPad;
        let yMin = domYMin - yPad;
        let yMax = domYMax + yPad;

        // Y ref siempre visible aunque esté fuera del rango de datos
        const yRef = settings.refLines.yRef;
        if (yRef < yMin) yMin = yRef - yPad;
        if (yRef > yMax) yMax = yRef + yPad;

        const xScale = (v: number) => ML + ((v - xMin) / (xMax - xMin)) * plotW;
        const yScale = (v: number) => MT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

        const yRefPx = yScale(yRef);
        // hasHighlights = filter-in mode active (at least one point is highlighted)
        const hasHighlights = points.some(p => p.highlighted);

        // Zone counts
        const upperLines = sortedLines(settings.upper);
        // Option C (Pro): lower asymmetry locked to 0 lines (1 zone) in free
        const lowerLines = this.isPro ? sortedLines(settings.lower) : [];
        const nUpper = upperLines.length + 1;
        const nLower = lowerLines.length + 1;

        // Count per zone for cards
        const zoneCounts: Record<string, number> = {};
        for (const pt of points) {
            const key = pointZoneKey(pt, settings);
            zoneCounts[key] = (zoneCounts[key] ?? 0) + 1;
        }

        // Build zone rectangles (bg) and labels (rendered separately, above points)
        let zoneBgHtml    = "";
        let zoneLabelHtml = "";

        const renderHalfZones = (
            isUpper: boolean,
            half: ZoneHalf,
            lines: number[]
        ) => {
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

                // Zone background rect (goes below points)
                zoneBgHtml += `<rect data-zone="${key}" x="${zx.toFixed(1)}" y="${zy.toFixed(1)}" ` +
                    `width="${zw.toFixed(1)}" height="${zoneH.toFixed(1)}" ` +
                    `fill="${color}" fill-opacity="${bgOpacity.toFixed(2)}" ` +
                    `stroke="none" cursor="pointer"/>`;

                // Zone label — floating centered, rendered ABOVE points
                const fs      = half.labelFontSize;
                const labelX  = zx + zw / 2;
                const labelY  = zy + zoneH / 2 + fs * 0.35;
                const bgPad   = 4;
                const bgW     = Math.min(zw - 8, label.length * fs * 0.6 + bgPad * 2);
                const bgH     = fs + bgPad * 2;
                const labelBgOp = half.labelBgOpacity / 100;
                if (labelBgOp > 0) {
                    zoneLabelHtml += `<rect x="${(labelX - bgW / 2).toFixed(1)}" y="${(labelY - fs - bgPad + fs * 0.35).toFixed(1)}" ` +
                        `width="${bgW.toFixed(1)}" height="${bgH.toFixed(1)}" rx="4" ry="4" ` +
                        `fill="${half.labelBgColor}" fill-opacity="${(labelBgOp * strokeOp).toFixed(2)}" pointer-events="none"/>`;
                }
                zoneLabelHtml += `<text data-zone="${key}" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" ` +
                    `text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="${fs}" ` +
                    `fill="#444444" opacity="${strokeOp.toFixed(2)}" pointer-events="none">` +
                    `${escapeXml(label)}</text>`;
            }
        };

        renderHalfZones(true,  settings.upper, upperLines);
        renderHalfZones(false, settings.lower, lowerLines);

        // Gridlines
        let gridHtml = "";
        if (settings.axes.showGridlines) {
            const tickCount = 5;
            for (let i = 0; i <= tickCount; i++) {
                const xv = xMin + (i / tickCount) * (xMax - xMin);
                const px = xScale(xv);
                gridHtml += `<line x1="${px.toFixed(1)}" y1="${MT}" x2="${px.toFixed(1)}" y2="${MT + plotH}" ` +
                    `stroke="#DDDDDD" stroke-width="1"/>`;
            }
            for (let i = 0; i <= tickCount; i++) {
                const yv = yMin + (i / tickCount) * (yMax - yMin);
                const py = yScale(yv);
                gridHtml += `<line x1="${ML}" y1="${py.toFixed(1)}" x2="${ML + plotW}" y2="${py.toFixed(1)}" ` +
                    `stroke="#DDDDDD" stroke-width="1"/>`;
            }
        }

        // Axis ticks
        const ts = settings.axes.tickSize;
        const tc = settings.axes.tickColor;
        let ticksHtml = "";
        const tickCount = 5;
        const td = settings.axes.tickDecimals;
        for (let i = 0; i <= tickCount; i++) {
            const xv  = xMin + (i / tickCount) * (xMax - xMin);
            const px  = xScale(xv);
            ticksHtml += `<line x1="${px.toFixed(1)}" y1="${MT + plotH}" x2="${px.toFixed(1)}" y2="${MT + plotH + 5}" stroke="${tc}" stroke-width="1"/>`;
            ticksHtml += `<text x="${px.toFixed(1)}" y="${MT + plotH + 16}" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="${ts}" fill="${tc}">${fmtNum(xv, td)}</text>`;

            const yv  = yMin + (i / tickCount) * (yMax - yMin);
            const py  = yScale(yv);
            ticksHtml += `<line x1="${ML - 5}" y1="${py.toFixed(1)}" x2="${ML}" y2="${py.toFixed(1)}" stroke="${tc}" stroke-width="1"/>`;
            ticksHtml += `<text x="${ML - 8}" y="${(py + ts * 0.35).toFixed(1)}" text-anchor="end" font-family="Segoe UI,sans-serif" font-size="${ts}" fill="${tc}">${fmtNum(yv, td)}</text>`;
        }

        // Axis titles (Pro only — Option A)
        let axisTitleHtml = "";
        if (this.isPro) {
            const tts = settings.axes.titleSize;
            if (settings.axes.xTitle) {
                axisTitleHtml += `<text x="${(ML + plotW / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="${tts}" fill="${tc}">${escapeXml(settings.axes.xTitle)}</text>`;
            }
            if (settings.axes.yTitle) {
                const cx = 12, cy = MT + plotH / 2;
                axisTitleHtml += `<text transform="rotate(-90,${cx},${cy})" x="${cx}" y="${cy}" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="${tts}" fill="${tc}">${escapeXml(settings.axes.yTitle)}</text>`;
            }
        }

        // Y reference line
        const yLineStyle = settings.refLines.yRefStyle === "dashed"
            ? 'stroke-dasharray="8,4"'
            : settings.refLines.yRefStyle === "dotted"
            ? 'stroke-dasharray="2,4"'
            : '';
        const yLineHtml = settings.refLines.showYRef
            ? `<line x1="${ML}" y1="${yRefPx.toFixed(1)}" x2="${ML + plotW}" y2="${yRefPx.toFixed(1)}" ` +
              `stroke="${settings.refLines.yRefColor}" stroke-width="1.5" ${yLineStyle}/>`
            : '';

        // Vertical zone divider lines
        let vLinesHtml = "";

        const renderVLines = (lines: number[], colors: string[], opacity: number, show: boolean) => {
            if (!show) return;
            for (let i = 0; i < lines.length; i++) {
                const px = xScale(lines[i]);
                const col = colors[i] ?? "#AAAAAA";
                vLinesHtml += `<line x1="${px.toFixed(1)}" y1="${MT}" x2="${px.toFixed(1)}" y2="${MT + plotH}" ` +
                    `stroke="${col}" stroke-width="1" stroke-dasharray="6,3" opacity="${opacity}"/>`;
            }
        };
        renderVLines(upperLines, settings.upper.lineColors, 0.8, settings.upper.showLines);
        renderVLines(lowerLines, settings.lower.lineColors, 0.8, settings.lower.showLines);

        // Data points
        let pointsHtml = "";
        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            const cx = xScale(pt.x);
            const cy = yScale(pt.y);
            const r  = pt.size;  // uses Size field if mapped, otherwise dataPoints.radius

            const zKey = pointZoneKey(pt, settings);
            const isInSelectedZone = this.selectedZoneKey === null || this.selectedZoneKey === zKey;
            const dimByZone = !isInSelectedZone;

            let circleOpacity = settings.dataPoints.opacity / 100;  // 0-100 → 0-1
            if (hasHighlights && !pt.highlighted) circleOpacity *= 0.25;
            if (dimByZone) circleOpacity *= 0.25;

            pointsHtml += `<circle data-idx="${i}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" ` +
                `fill="${pt.color}" opacity="${circleOpacity.toFixed(2)}" stroke="#FFFFFF" stroke-width="1" ` +
                `cursor="pointer"/>`;

            // Data label (Pro only)
            if (this.isPro && settings.dataPoints.showLabels) {
                pointsHtml += `<text x="${cx.toFixed(1)}" y="${(cy - r - 3).toFixed(1)}" ` +
                    `text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="10" fill="#333333" ` +
                    `opacity="${circleOpacity.toFixed(2)}" pointer-events="none">${escapeXml(pt.label)}</text>`;
            }
        }

        // Zone cards (Pro only)
        let cardsHtml = "";
        if (this.isPro && settings.cards.show) {
            const upperXBounds = [ML, ...upperLines.map(xScale), ML + plotW];
            const lowerXBounds = [ML, ...lowerLines.map(xScale), ML + plotW];
            cardsHtml = this.buildCards(
                settings, zoneCounts,
                upperXBounds, lowerXBounds,
                MT, yRefPx, MT + plotH
            );
        }

        // Clip path
        const clipId = "amClip";
        const svgBody = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="display:block">
  <defs>
    <clipPath id="${clipId}">
      <rect x="${ML}" y="${MT}" width="${plotW}" height="${plotH}"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect x="${ML}" y="${MT}" width="${plotW}" height="${plotH}" fill="#FFFFFF" stroke="#CCCCCC" stroke-width="1"/>

  <!-- Zone backgrounds (below everything) -->
  <g clip-path="url(#${clipId})">${zoneBgHtml}</g>

  <!-- Grid -->
  <g clip-path="url(#${clipId})">${gridHtml}</g>

  <!-- Vertical divider lines -->
  <g clip-path="url(#${clipId})">${vLinesHtml}</g>

  <!-- Y ref line -->
  <g clip-path="url(#${clipId})">${yLineHtml}</g>

  <!-- Axis ticks & titles -->
  ${ticksHtml}
  ${axisTitleHtml}

  <!-- Data points -->
  <g clip-path="url(#${clipId})">${pointsHtml}</g>

  <!-- Zone labels (above points) -->
  <g clip-path="url(#${clipId})">${zoneLabelHtml}</g>

  <!-- Zone cards -->
  ${cardsHtml}
</svg>`;

        /* eslint-disable powerbi-visuals/no-inner-outer-html */
        this.container.innerHTML = svgBody;
        /* eslint-enable powerbi-visuals/no-inner-outer-html */
    }

    // ── Zone cards builder ────────────────────────────────────────────────────
    //  xBounds: pixel X boundaries for each zone boundary (already scaled)
    //  yTop / yRef / yBottom: pixel Y positions

    private buildCards(
        settings: VisualSettings,
        counts: Record<string, number>,
        upperXBounds: number[],
        lowerXBounds: number[],
        yTop: number, yRef: number, yBottom: number
    ): string {
        let html = "";

        const renderHalfCards = (
            isUpper: boolean,
            half: typeof settings.upper,
            xBounds: number[]
        ) => {
            const bandTop = isUpper ? yTop : yRef;
            const nZones  = xBounds.length - 1;
            const PAD     = 5; // px from top-left corner of zone

            for (let zi = 0; zi < nZones; zi++) {
                const key    = (isUpper ? "U" : "L") + zi;
                const count  = counts[key] ?? 0;
                const zx     = xBounds[zi];
                // Badge: top-left corner of zone
                const bx     = zx + PAD;
                const by     = bandTop + PAD;
                const label  = String(count);
                const bw     = Math.max(26, label.length * 8 + 10);
                const bh     = 20;
                const tx     = bx + bw / 2;
                const ty     = by + bh / 2 + 4;

                html += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" ` +
                    `width="${bw}" height="${bh}" rx="4" fill="rgba(0,0,0,0.55)" ` +
                    `data-zone="${key}" cursor="pointer"/>`;
                html += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" ` +
                    `text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="11" font-weight="600" ` +
                    `fill="#FFFFFF" pointer-events="none">${count}</text>`;
            }
        };

        renderHalfCards(true,  settings.upper, upperXBounds);
        renderHalfCards(false, settings.lower, lowerXBounds);
        return html;
    }

    // ── Landing page ──────────────────────────────────────────────────────────

    private renderLanding(viewport: powerbi.IViewport): void {
        const W = viewport.width, H = viewport.height;
        /* eslint-disable powerbi-visuals/no-inner-outer-html */
        this.container.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#FAF9F5"/>
  <text x="${W / 2}" y="${H / 2 - 16}" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="16" font-weight="600" fill="#3D3929">Asymmetric Matrix</text>
  <text x="${W / 2}" y="${H / 2 + 8}" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="12" fill="#83827D">Add X Value and Y Value fields to get started</text>
</svg>`;
        /* eslint-enable powerbi-visuals/no-inner-outer-html */
    }

    // ── Click handler ─────────────────────────────────────────────────────────

    private onContainerClick(e: MouseEvent): void {
        const target = e.target as SVGElement;
        const zoneEl = target.closest ? (target.closest("[data-zone]") as SVGElement) : null;
        const ptEl   = target.closest ? (target.closest("[data-idx]")  as SVGElement) : null;

        // ── Click on individual data point bubble ─────────────────────────────
        // ptEl is non-null when the user clicks directly on a circle; zoneEl is
        // null because circles carry data-idx but not data-zone.  Without this
        // branch the click was silently ignored and selectionManager.select()
        // was never called, causing the "does not filter outwards" rejection.
        if (ptEl && !zoneEl) {
            const idx = parseInt(ptEl.getAttribute("data-idx") ?? "-1", 10);
            const pt  = this.lastPoints[idx];
            if (pt && this.lastSettings) {
                const zKey = pointZoneKey(pt, this.lastSettings);
                if (this.selectedZoneKey === zKey) {
                    // Toggle off
                    this.selectedZoneKey = null;
                    this.selectionManager.clear();
                } else {
                    // Select the whole zone this point belongs to
                    this.selectedZoneKey = zKey;
                    const ids = this.lastPoints
                        .filter(p => pointZoneKey(p, this.lastSettings!) === zKey)
                        .map(p => p.selectionId);
                    this.selectionManager.select(ids, false);
                }
                this.render(this.lastPoints, this.lastSettings, this.lastViewport);
            }
            return;
        }

        // ── Click on zone background rect / label / card ───────────────────────
        if (zoneEl) {
            const key = zoneEl.getAttribute("data-zone");
            if (this.selectedZoneKey === key) {
                this.selectedZoneKey = null;
                this.selectionManager.clear();
            } else {
                this.selectedZoneKey = key;
                const ids = this.lastPoints
                    .filter(pt => pointZoneKey(pt, this.lastSettings!) === key)
                    .map(pt => pt.selectionId);
                if (ids.length > 0) {
                    this.selectionManager.select(ids, false);
                } else {
                    // Zone exists but contains no data points — clear any prior selection
                    this.selectionManager.clear();
                }
            }

            if (this.lastSettings) {
                this.render(this.lastPoints, this.lastSettings, this.lastViewport);
            }
            return;
        }

        // ── Click on empty chart area ──────────────────────────────────────────
        if (!zoneEl && !ptEl) {
            this.selectedZoneKey = null;
            this.selectionManager.clear();
            if (this.lastSettings) {
                this.render(this.lastPoints, this.lastSettings, this.lastViewport);
            }
        }
    }

    // ── Context menu handler ──────────────────────────────────────────────────

    private onContextMenu(e: MouseEvent): void {
        e.preventDefault();
        const target = e.target as SVGElement;
        const ptEl   = target.closest ? (target.closest("[data-idx]")  as SVGElement) : null;
        const zoneEl = target.closest ? (target.closest("[data-zone]") as SVGElement) : null;

        let sid: ISelectionId | null = null;

        if (ptEl) {
            const idx = parseInt(ptEl.getAttribute("data-idx") ?? "-1", 10);
            const pt  = this.lastPoints[idx];
            if (pt) sid = pt.selectionId;
        } else if (zoneEl && this.lastSettings) {
            const key  = zoneEl.getAttribute("data-zone");
            const first = this.lastPoints.find(
                p => pointZoneKey(p, this.lastSettings!) === key
            );
            if (first) sid = first.selectionId;
        }

        this.selectionManager.showContextMenu(
            sid ?? ({} as ISelectionId),
            { x: e.clientX, y: e.clientY }
        );
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

        if (obj === "upperZones") {
            const props: { [key: string]: any } = { showLines: s.upper.showLines, lineCount: s.upper.lineCount };
            for (let i = 1; i <= 4; i++) {
                props[`line${i}Value`] = s.upper.lineValues[i - 1];
                props[`line${i}Color`] = { solid: { color: s.upper.lineColors[i - 1] } };
            }
            for (let i = 1; i <= 5; i++) {
                props[`zone${i}Label`]   = s.upper.zoneLabels[i - 1];
                props[`zone${i}Color`]   = { solid: { color: s.upper.zoneColors[i - 1] } };
                props[`zone${i}Opacity`] = s.upper.zoneOpacities[i - 1];
            }
            props["labelFontSize"]  = s.upper.labelFontSize;
            props["labelBgColor"]   = { solid: { color: s.upper.labelBgColor } };
            props["labelBgOpacity"] = s.upper.labelBgOpacity;
            instances.push({ objectName: obj, selector: null, properties: props });
        }

        if (obj === "lowerZones") {
            const props: { [key: string]: any } = { showLines: s.lower.showLines };
            // Lower line count / dividers: Pro only (Option C)
            if (this.isPro) {
                props["lineCount"] = s.lower.lineCount;
                for (let i = 1; i <= 4; i++) {
                    props[`line${i}Value`] = s.lower.lineValues[i - 1];
                    props[`line${i}Color`] = { solid: { color: s.lower.lineColors[i - 1] } };
                }
                // Show all 5 zone slots only when Pro (asymmetric zones possible)
                for (let i = 1; i <= 5; i++) {
                    props[`zone${i}Label`]   = s.lower.zoneLabels[i - 1];
                    props[`zone${i}Color`]   = { solid: { color: s.lower.zoneColors[i - 1] } };
                    props[`zone${i}Opacity`] = s.lower.zoneOpacities[i - 1];
                }
            } else {
                // Free: only 1 zone below, expose just that zone's label/color/opacity
                props[`zone1Label`]   = s.lower.zoneLabels[0];
                props[`zone1Color`]   = { solid: { color: s.lower.zoneColors[0] } };
                props[`zone1Opacity`] = s.lower.zoneOpacities[0];
            }
            props["labelFontSize"]  = s.lower.labelFontSize;
            props["labelBgColor"]   = { solid: { color: s.lower.labelBgColor } };
            props["labelBgOpacity"] = s.lower.labelBgOpacity;
            instances.push({ objectName: obj, selector: null, properties: props });
        }

        if (obj === "axes") {
            const axProps: { [key: string]: any } = {
                tickSize:      s.axes.tickSize,
                tickColor:     { solid: { color: s.axes.tickColor } },
                showGridlines: s.axes.showGridlines,
                tickDecimals:  s.axes.tickDecimals,
            };
            // Pro only options (A + B)
            if (this.isPro) {
                axProps["xTitle"]    = s.axes.xTitle;
                axProps["yTitle"]    = s.axes.yTitle;
                axProps["titleSize"] = s.axes.titleSize;
                axProps["fixedAxes"] = s.axes.fixedAxes;
            }
            instances.push({ objectName: obj, selector: null, properties: axProps });
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

function escapeXml(s: string): string {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function fmtNum(n: number, decimals = -1): string {
    if (decimals >= 0) return n.toFixed(decimals);
    if (Math.abs(n) >= 1e6)  return (n / 1e6).toFixed(1) + "M";
    if (Math.abs(n) >= 1e3)  return (n / 1e3).toFixed(1) + "K";
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2);
}
