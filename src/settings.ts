/**
 * settings.ts — Asymmetric Matrix
 * Reads Format Pane values from the dataView objects.
 */

import powerbi from "powerbi-visuals-api";

export interface RefLineSettings {
    showYRef: boolean;
    yRef: number;
    yRefColor: string;
    yRefStyle: "solid" | "dashed" | "dotted";
}

export interface ZoneHalf {
    showLines: boolean;                    // show/hide vertical dividers
    lineCount: number;                     // 0..4 vertical dividers
    lineValues: number[];                  // up to 4 values
    lineColors: string[];
    zoneLabels: string[];                  // lineCount+1 labels
    zoneColors: string[];
    zoneOpacities: number[];
    labelFontSize: number;                 // font size for zone labels
    labelBgColor: string;                  // background color behind label text
    labelBgOpacity: number;               // opacity of label background (0=transparent)
}

export interface AxesSettings {
    xTitle: string;
    yTitle: string;
    tickSize: number;
    tickColor: string;
    showGridlines: boolean;
    tickDecimals: number;   // −1 = auto, 0-5 = fixed decimal places
    titleSize: number;      // font size for axis titles
    fixedAxes: boolean;     // keep axis range fixed when filtering
}

export interface DataPointSettings {
    radius: number;
    opacity: number;
    showLabels: boolean;                   // Pro only
}

export interface CardSettings {
    show: boolean;                         // Pro only
}

export interface VisualSettings {
    refLines: RefLineSettings;
    upper: ZoneHalf;
    lower: ZoneHalf;
    axes: AxesSettings;
    dataPoints: DataPointSettings;
    cards: CardSettings;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const ZONE_COLORS_DEFAULT = [
    "#E8F4FD", "#FEF9E7", "#EAFAF1", "#FDF2F8", "#F0F3F4"
];

function defaultHalf(lineCount: number): ZoneHalf {
    return {
        showLines: true,
        lineCount,
        lineValues: [0, 0, 0, 0],
        lineColors: ["#CCCCCC", "#CCCCCC", "#CCCCCC", "#CCCCCC"],
        zoneLabels: ["Zone A", "Zone B", "Zone C", "Zone D", "Zone E"],
        zoneColors: [...ZONE_COLORS_DEFAULT],
        zoneOpacities: [40, 40, 40, 40, 40],   // 0-100
        labelFontSize: 11,
        labelBgColor: "#FFFFFF",
        labelBgOpacity: 0,                      // 0-100
    };
}

export const DEFAULT_SETTINGS: VisualSettings = {
    refLines: {
        showYRef: true,
        yRef: 0,
        yRefColor: "#666666",
        yRefStyle: "dashed",
    },
    upper: defaultHalf(1),
    lower: defaultHalf(0),
    axes: {
        xTitle: "",
        yTitle: "",
        tickSize: 11,
        tickColor: "#666666",
        showGridlines: true,
        tickDecimals: -1,
        titleSize: 12,
        fixedAxes: false,
    },
    dataPoints: {
        radius: 6,
        opacity: 85,    // 0-100
        showLabels: false,
    },
    cards: {
        show: false,
    },
};

// ── Parser ────────────────────────────────────────────────────────────────────

function solidColor(
    obj: powerbi.DataViewObject | undefined,
    key: string,
    fallback: string
): string {
    try {
        const v = obj?.[key] as any;
        return v?.solid?.color ?? fallback;
    } catch { return fallback; }
}

function num(
    obj: powerbi.DataViewObject | undefined,
    key: string,
    fallback: number
): number {
    const v = obj?.[key];
    return (typeof v === "number" && !isNaN(v)) ? v : fallback;
}

function bool(
    obj: powerbi.DataViewObject | undefined,
    key: string,
    fallback: boolean
): boolean {
    const v = obj?.[key];
    return typeof v === "boolean" ? v : fallback;
}

function str(
    obj: powerbi.DataViewObject | undefined,
    key: string,
    fallback: string
): string {
    const v = obj?.[key];
    return typeof v === "string" ? v : fallback;
}

function parseHalf(
    obj: powerbi.DataViewObject | undefined,
    defaultCount: number
): ZoneHalf {
    const showLines = bool(obj, "showLines", true);
    const lineCount = Math.min(4, Math.max(0, Math.round(num(obj, "lineCount", defaultCount))));
    const lineValues: number[] = [];
    const lineColors: string[] = [];
    for (let i = 1; i <= 4; i++) {
        lineValues.push(num(obj, `line${i}Value`, 0));
        lineColors.push(solidColor(obj, `line${i}Color`, "#CCCCCC"));
    }
    const zoneLabels: string[] = [];
    const zoneColors: string[] = [];
    const zoneOpacities: number[] = [];
    for (let i = 1; i <= 5; i++) {
        zoneLabels.push(str(obj, `zone${i}Label`, `Zone ${String.fromCharCode(64 + i)}`));
        zoneColors.push(solidColor(obj, `zone${i}Color`, ZONE_COLORS_DEFAULT[i - 1]));
        zoneOpacities.push(Math.min(100, Math.max(0, num(obj, `zone${i}Opacity`, 40))));
    }
    const labelFontSize  = Math.min(32, Math.max(6, num(obj, "labelFontSize", 11)));
    const labelBgColor   = solidColor(obj, "labelBgColor", "#FFFFFF");
    const labelBgOpacity = Math.min(100, Math.max(0, num(obj, "labelBgOpacity", 0)));
    return { showLines, lineCount, lineValues, lineColors, zoneLabels, zoneColors, zoneOpacities, labelFontSize, labelBgColor, labelBgOpacity };
}

export function parseSettings(dataView: powerbi.DataView): VisualSettings {
    const objs = dataView?.metadata?.objects;

    const rl    = objs?.["referenceLines"] as powerbi.DataViewObject | undefined;
    const upper = objs?.["upperZones"]     as powerbi.DataViewObject | undefined;
    const lower = objs?.["lowerZones"]     as powerbi.DataViewObject | undefined;
    const ax    = objs?.["axes"]           as powerbi.DataViewObject | undefined;
    const dp    = objs?.["dataPoints"]     as powerbi.DataViewObject | undefined;
    const ca    = objs?.["cards"]          as powerbi.DataViewObject | undefined;

    return {
        refLines: {
            showYRef:  bool(rl, "showYRef", true),
            yRef:      num(rl, "yRef", 0),
            yRefColor: solidColor(rl, "yRefColor", "#666666"),
            yRefStyle: (str(rl, "yRefStyle", "dashed") as any) ?? "dashed",
        },
        upper: parseHalf(upper, 1),
        lower: parseHalf(lower, 0),
        axes: {
            xTitle:       str(ax, "xTitle", ""),
            yTitle:       str(ax, "yTitle", ""),
            tickSize:     num(ax, "tickSize", 11),
            tickColor:    solidColor(ax, "tickColor", "#666666"),
            showGridlines: bool(ax, "showGridlines", true),
            tickDecimals: Math.max(-1, Math.min(5, Math.round(num(ax, "tickDecimals", -1)))),
            titleSize:    Math.max(8, Math.min(24, num(ax, "titleSize", 12))),
            fixedAxes:    bool(ax, "fixedAxes", false),
        },
        dataPoints: {
            radius:     num(dp, "radius", 6),
            opacity:    Math.min(100, Math.max(0, num(dp, "opacity", 85))),
            showLabels: bool(dp, "showLabels", false),
        },
        cards: {
            show: bool(ca, "show", false),
        },
    };
}
