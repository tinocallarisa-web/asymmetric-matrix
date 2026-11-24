/**
 * settings.ts — Bubble & Scatter Chart (antes Asymmetric Matrix)
 *
 * Panel de formato con FormattingSettingsService (1.1). Los objetos y propiedades publicados en 1.0 no cambian de
 * nombre ni de objeto: los informes guardados los siguen leyendo. Lo nuevo se añade al lado.
 */

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import Card  = formattingSettings.SimpleCard;
import Model = formattingSettings.Model;

const rango = (min: number, max: number): any => ({
    minValue: { type: powerbi.visuals.ValidatorType.Min, value: min },
    maxValue: { type: powerbi.visuals.ValidatorType.Max, value: max }
});
const item = (value: string, displayName: string, key: string) => ({ value, displayName, displayNameKey: key }) as any;
const FONT = "'Segoe UI', wf_segoe-ui_normal, helvetica, arial, sans-serif";

export const ZONE_COLORS_DEFAULT = ["#E8F4FD", "#FEF9E7", "#EAFAF1", "#FDF2F8", "#F0F3F4"];
/** Color del foco de teclado de siempre (1.1); Accesibilidad → Focus outline colour lo cambia. */
export const FOCUS_DEFAULT = "#005A9E";

/** Estilos de la colección TCViz (1.2, Pro): los seis de toda la cartera. */
export const PRO_STYLES = ["boardroom", "ledger", "editorial", "signal", "aurora", "terrace"];

/**
 * Lo que un estilo de la colección no puede decir con propiedades del panel: fondo del visual (y degradado), tinta,
 * gris secundario, rejilla, paleta de series y tipo de letra. Mismos valores que Marimekko, Calendar y Risk Matrix.
 */
export interface StyleTokens { bg: string; grad?: string; text: string; muted: string; grid: string; series: string[]; font?: string; dark?: boolean; }
export const STYLE_TOKENS: Record<string, StyleTokens> = {
    boardroom: { bg: "#16263D", text: "#F2F0E8", muted: "#9FB0C6", grid: "#2A3E5C", series: ["#C9A45C", "#8FB8E8", "#EB8A7B", "#6FCF97", "#C5D3E3"], dark: true },
    ledger:    { bg: "#FBF8EF", text: "#231F16", muted: "#6E6652", grid: "#D9D2BE", series: ["#7A1F1F", "#3A3528", "#2F6B3B", "#946A10", "#B7AD92"], font: "Georgia, serif" },
    editorial: { bg: "#FFFFFF", text: "#111111", muted: "#5F5F5F", grid: "#E2E2E2", series: ["#D7263D", "#111111", "#5F5F5F", "#BDBDBD", "#8C1C2B"], font: "Georgia, serif" },
    signal:    { bg: "#FFFFFF", text: "#14202B", muted: "#566472", grid: "#D9DEE4", series: ["#1F7A4D", "#14202B", "#B7791F", "#C0392B", "#9AA5B1"] },
    aurora:    { bg: "#10395E", grad: "linear-gradient(135deg, #1B1147, #10395E 50%, #0B5A5E)", text: "#FFFFFF", muted: "#C5D3E3", grid: "#3A5C7E",
                 series: ["#7CE7D0", "#FFD27D", "#FF9DB0", "#9DB7FF", "#C5D3E3"], dark: true },
    terrace:   { bg: "#FBF5EC", text: "#3A2A1E", muted: "#7A6450", grid: "#E5D6C2", series: ["#B5532A", "#5E7128", "#B5782A", "#B5372A", "#C9A77E"] },
};
const MODES = () => [item("fixed", "Fixed value", "Enum_fixed"), item("average", "Average", "Enum_average"), item("median", "Median", "Enum_median")];

const toggle = (name: string, displayName: string, key: string, value: boolean) =>
    new formattingSettings.ToggleSwitch({ name, displayName, displayNameKey: key, value });
const num = (name: string, displayName: string, key: string, value: number, min?: number, max?: number) =>
    new formattingSettings.NumUpDown({ name, displayName, displayNameKey: key, value, ...(min !== undefined ? { options: rango(min, max) } : {}) });
const color = (name: string, displayName: string, key: string, value: string) =>
    new formattingSettings.ColorPicker({ name, displayName, displayNameKey: key, value: { value } });
const text = (name: string, displayName: string, key: string, value: string, placeholder = "") =>
    new formattingSettings.TextInput({ name, displayName, displayNameKey: key, value, placeholder });
const group = (name: string, displayName: string, key: string, slices: formattingSettings.Slice[]) =>
    new formattingSettings.Group({ name, displayName, displayNameKey: key, slices } as any);

// ─── Línea Y ──────────────────────────────────────────────────────────────────

class RefLineSettings extends Card {
    showYRef  = toggle("showYRef", "Show Y line", "referenceLines_showYRef", true);
    yRefMode  = new formattingSettings.ItemDropdown({ name: "yRefMode", displayName: "Y line at", displayNameKey: "referenceLines_yRefMode",
        items: MODES(), value: item("fixed", "Fixed value", "Enum_fixed") });
    yRef      = num("yRef", "Y line value", "referenceLines_yRef", 0);
    yRefColor = color("yRefColor", "Y line colour", "referenceLines_yRefColor", "#666666");
    yRefStyle = new formattingSettings.ItemDropdown({ name: "yRefStyle", displayName: "Y line style", displayNameKey: "referenceLines_yRefStyle",
        items: [item("solid", "Solid", "Enum_solid"), item("dashed", "Dashed", "Enum_dashed"), item("dotted", "Dotted", "Enum_dotted")],
        value: item("dashed", "Dashed", "Enum_dashed") });
    name = "referenceLines";
    displayName = "Y line";
    displayNameKey = "card_referenceLines";
    slices = [this.showYRef, this.yRefMode, this.yRef, this.yRefColor, this.yRefStyle];
}

// ─── Zonas (mitad superior e inferior) ────────────────────────────────────────

export class ZonesSettings extends formattingSettings.CompositeCard {
    showLines: formattingSettings.ToggleSwitch;
    lineCount: formattingSettings.NumUpDown;
    line1Mode: formattingSettings.ItemDropdown;
    layout: formattingSettings.ItemDropdown;
    lineValue: formattingSettings.NumUpDown[] = [];
    lineColor: formattingSettings.ColorPicker[] = [];
    zoneLabel: formattingSettings.TextInput[] = [];
    zoneColor: formattingSettings.ColorPicker[] = [];
    zoneOpacity: formattingSettings.NumUpDown[] = [];
    labelFontSize: formattingSettings.NumUpDown;
    labelColor: formattingSettings.ColorPicker;
    labelBgColor: formattingSettings.ColorPicker;
    labelBgOpacity: formattingSettings.NumUpDown;
    name: string;
    displayName: string;
    displayNameKey: string;
    groups: formattingSettings.Group[];

    constructor(obj: "upperZones" | "lowerZones") {
        super();
        const upper = obj === "upperZones";
        const k = (p: string) => obj + "_" + p;
        this.name = obj;
        this.displayName = upper ? "Upper zones" : "Lower zones";
        this.displayNameKey = "card_" + obj;
        this.showLines = toggle("showLines", "Show divider lines", k("showLines"), true);
        this.lineCount = num("lineCount", "Number of dividers", k("lineCount"), upper ? 1 : 0, 0, 4);
        this.line1Mode = new formattingSettings.ItemDropdown({ name: "line1Mode", displayName: "Divider 1 at", displayNameKey: k("line1Mode"),
            items: MODES(), value: item("fixed", "Fixed value", "Enum_fixed") });
        this.layout = new formattingSettings.ItemDropdown({ name: "layout", displayName: "Lower half", displayNameKey: k("layout"),
            items: [item("mirror", "Same dividers as above", "Enum_mirror"), item("single", "One zone", "Enum_single"), item("own", "Own dividers (Pro)", "Enum_own")],
            value: item("mirror", "Same dividers as above", "Enum_mirror") });
        for (let i = 1; i <= 4; i++) {
            this.lineValue.push(num(`line${i}Value`, `Divider ${i} value`, k(`line${i}Value`), 0));
            this.lineColor.push(color(`line${i}Color`, `Divider ${i} colour`, k(`line${i}Color`), "#CCCCCC"));
        }
        for (let i = 1; i <= 5; i++) {
            this.zoneLabel.push(text(`zone${i}Label`, `Zone ${i} label`, k(`zone${i}Label`), ""));
            this.zoneColor.push(color(`zone${i}Color`, `Zone ${i} colour`, k(`zone${i}Color`), ZONE_COLORS_DEFAULT[i - 1]));
            this.zoneOpacity.push(num(`zone${i}Opacity`, `Zone ${i} opacity %`, k(`zone${i}Opacity`), 40, 0, 100));
        }
        this.labelFontSize  = num("labelFontSize", "Label font size", k("labelFontSize"), 11, 6, 32);
        this.labelColor     = color("labelColor", "Label colour", k("labelColor"), "#444444");
        this.labelBgColor   = color("labelBgColor", "Label background", k("labelBgColor"), "#FFFFFF");
        this.labelBgOpacity = num("labelBgOpacity", "Label background opacity %", k("labelBgOpacity"), 0, 0, 100);

        const lines: formattingSettings.Slice[] = [this.showLines, this.lineCount];
        if (upper) lines.push(this.line1Mode); else lines.unshift(this.layout);
        for (let i = 0; i < 4; i++) lines.push(this.lineValue[i], this.lineColor[i]);
        const zones: formattingSettings.Slice[] = [];
        for (let i = 0; i < 5; i++) zones.push(this.zoneLabel[i], this.zoneColor[i], this.zoneOpacity[i]);
        this.groups = [
            group(obj + "_grpLines", "Dividers", "grpLines", lines),
            group(obj + "_grpZones", "Zones", "grpZones", zones),
            group(obj + "_grpLabels", "Zone labels", "grpZoneLabels", [this.labelFontSize, this.labelColor, this.labelBgColor, this.labelBgOpacity])
        ];
    }
}

// ─── Ejes ─────────────────────────────────────────────────────────────────────

class AxesSettings extends formattingSettings.CompositeCard {
    fontFamily     = new formattingSettings.FontPicker({ name: "fontFamily", displayName: "Font", displayNameKey: "axes_fontFamily", value: FONT });
    tickSize       = num("tickSize", "Tick label size", "axes_tickSize", 11, 6, 24);
    tickColor      = color("tickColor", "Tick label colour", "axes_tickColor", "#666666");
    tickDecimals   = num("tickDecimals", "Decimals (-1 = model format)", "axes_tickDecimals", -1, -1, 5);
    showGridlines  = toggle("showGridlines", "Gridlines", "axes_showGridlines", true);
    gridColor      = color("gridColor", "Gridline colour", "axes_gridColor", "#E6E6E6");
    plotBackground = color("plotBackground", "Plot background", "axes_plotBackground", "#FFFFFF");
    logX           = toggle("logX", "Log scale X", "axes_logX", false);
    logY           = toggle("logY", "Log scale Y", "axes_logY", false);
    showTitles     = toggle("showTitles", "Axis titles", "axes_showTitles", true);
    xTitle         = text("xTitle", "X title", "axes_xTitle", "", "Field name");
    yTitle         = text("yTitle", "Y title", "axes_yTitle", "", "Field name");
    titleSize      = num("titleSize", "Title size", "axes_titleSize", 12, 8, 24);
    titleColor     = color("titleColor", "Title colour", "axes_titleColor", "#444444");
    fixedAxes      = toggle("fixedAxes", "Fixed axis range (Pro)", "axes_fixedAxes", false);
    name = "axes";
    displayName = "Axes";
    displayNameKey = "card_axes";
    groups = [
        group("grpTicks", "Values", "grpTicks", [this.fontFamily, this.tickSize, this.tickColor, this.tickDecimals]),
        group("grpPlot", "Plot area", "grpPlot", [this.logX, this.logY, this.showGridlines, this.gridColor, this.plotBackground, this.fixedAxes]),
        group("grpTitles", "Titles", "grpTitles", [this.showTitles, this.xTitle, this.yTitle, this.titleSize, this.titleColor])
    ];
}

// ─── Burbujas ─────────────────────────────────────────────────────────────────

class DataPointSettings extends formattingSettings.CompositeCard {
    colorBy = new formattingSettings.ItemDropdown({ name: "colorBy", displayName: "Colour by", displayNameKey: "dataPoints_colorBy",
        items: [item("auto", "Auto (legend if any)", "Enum_auto"), item("single", "One colour", "Enum_singleColor"),
            item("category", "Each category", "Enum_category"), item("zone", "Zone", "Enum_zone")],
        value: item("auto", "Auto (legend if any)", "Enum_auto") });
    // fx: instanceKind 3 (ConstantOrRule) + selector comodín. El color fijo se guarda a nivel general gracias a
    // altConstantValueSelector null, que se pone en getFormattingModel (receta de Bar Chart 1.11 y Waterfall 1.2).
    fill = new formattingSettings.ColorPicker({ name: "fill", displayName: "Colour", displayNameKey: "dataPoints_fill",
        value: { value: "#2B6CB0" }, selector: { data: [{ dataViewWildcard: { matchingOption: 0 } }] } as any, instanceKind: 3 });
    radius      = num("radius", "Size (no Size field)", "dataPoints_radius", 6, 2, 40);
    opacity     = num("opacity", "Opacity %", "dataPoints_opacity", 85, 5, 100);
    borderColor = color("borderColor", "Border colour", "dataPoints_borderColor", "#FFFFFF");
    borderWidth = num("borderWidth", "Border width", "dataPoints_borderWidth", 1, 0, 4);
    showLabels  = toggle("showLabels", "Data labels", "dataPoints_showLabels", false);
    labelSize   = num("labelSize", "Label size", "dataPoints_labelSize", 10, 6, 24);
    labelColor  = color("labelColor", "Label colour", "dataPoints_labelColor", "#333333");
    name = "dataPoints";
    displayName = "Bubbles";
    displayNameKey = "card_dataPoints";
    groups = [
        group("grpColor", "Colour", "grpColor", [this.colorBy, this.fill, this.opacity]),
        group("grpShape", "Size and border", "grpShape", [this.radius, this.borderColor, this.borderWidth]),
        group("grpLabels", "Data labels", "grpDataLabels", [this.showLabels, this.labelSize, this.labelColor])
    ];
}

class LegendSettings extends Card {
    show     = toggle("show", "Show legend", "legend_show", true);
    position = new formattingSettings.ItemDropdown({ name: "position", displayName: "Position", displayNameKey: "legend_position",
        items: [item("top", "Top", "Enum_top"), item("bottom", "Bottom", "Enum_bottom")], value: item("top", "Top", "Enum_top") });
    fontSize = num("fontSize", "Font size", "legend_fontSize", 10, 7, 18);
    color    = color("color", "Text colour", "legend_color", "#605E5C");
    // El peso de cada grupo junto a su nombre; con una zona o unos puntos seleccionados, el de la selección.
    showShare = toggle("showShare", "Show share of each group", "legend_showShare", false);
    // Orden de los grupos (1.2): el de los datos (como siempre), alfabético o por tamaño (suma de Size, o puntos).
    order    = new formattingSettings.ItemDropdown({ name: "order", displayName: "Order", displayNameKey: "legend_order",
        items: [item("data", "Data order", "Enum_dataOrder"), item("alpha", "Alphabetical", "Enum_alpha"), item("size", "By size", "Enum_bySize")],
        value: item("data", "Data order", "Enum_dataOrder") });
    shareBy  = new formattingSettings.ItemDropdown({ name: "shareBy", displayName: "Share of", displayNameKey: "legend_shareBy",
        items: [item("count", "Points", "Enum_count"), item("size", "Size field", "Enum_sizeField")], value: item("count", "Points", "Enum_count") });
    topLevelSlice = this.show;
    name = "legend";
    displayName = "Legend";
    displayNameKey = "card_legend";
    slices = [this.position, this.order, this.fontSize, this.color, this.showShare, this.shareBy];
}

class TrendLineSettings extends Card {
    show   = toggle("show", "Show trend line (Pro)", "trendLine_show", false);
    color  = color("color", "Colour", "trendLine_color", "#C0504D");
    width  = num("width", "Width", "trendLine_width", 2, 1, 6);
    style  = new formattingSettings.ItemDropdown({ name: "style", displayName: "Style", displayNameKey: "trendLine_style",
        items: [item("solid", "Solid", "Enum_solid"), item("dashed", "Dashed", "Enum_dashed"), item("dotted", "Dotted", "Enum_dotted")],
        value: item("dashed", "Dashed", "Enum_dashed") });
    showR2 = toggle("showR2", "Show R²", "trendLine_showR2", true);
    name = "trendLine";
    displayName = "Trend line (Pro)";
    displayNameKey = "card_trendLine";
    slices = [this.show, this.color, this.width, this.style, this.showR2];
}

class CardSettings extends Card {
    show        = toggle("show", "Show zone counts (Pro)", "cards_show", false);
    showPercent = toggle("showPercent", "Show % of points", "cards_showPercent", false);
    fontSize    = num("fontSize", "Font size", "cards_fontSize", 11, 8, 20);
    name = "cards";
    displayName = "Zone counts (Pro)";
    displayNameKey = "card_cards";
    slices = [this.show, this.showPercent, this.fontSize];
}

// Tabla cruzada grupo de la leyenda × zona (Pro). Las zonas solo existen en el visual: fuera no se pueden cruzar.
class ZoneTableSettings extends Card {
    show     = toggle("show", "Show zone table (Pro)", "zoneTable_show", false);
    mode     = new formattingSettings.ItemDropdown({ name: "mode", displayName: "Values", displayNameKey: "zoneTable_mode",
        items: [item("rowPct", "% of row", "Enum_rowPct"), item("colPct", "% of column", "Enum_colPct"),
            item("count", "Points", "Enum_count"), item("size", "Size field", "Enum_sizeField")],
        value: item("rowPct", "% of row", "Enum_rowPct") });
    position = new formattingSettings.ItemDropdown({ name: "position", displayName: "Position", displayNameKey: "zoneTable_position",
        items: [item("right", "Right", "Enum_right"), item("bottom", "Bottom", "Enum_bottom")], value: item("right", "Right", "Enum_right") });
    sizePct  = num("sizePct", "Width / height %", "zoneTable_sizePct", 35, 20, 60);
    fontSize = num("fontSize", "Font size", "zoneTable_fontSize", 10, 7, 18);
    name = "zoneTable";
    displayName = "Zone table (Pro)";
    displayNameKey = "card_zoneTable";
    slices = [this.show, this.mode, this.position, this.sizePct, this.fontSize];
}

class StyleSettings extends Card {
    template = new formattingSettings.ItemDropdown({ name: "template", displayName: "Template", displayNameKey: "style_template",
        items: [item("report", "Report theme", "Enum_report"), item("classic", "Classic", "Enum_classic"), item("quadrant", "Four quadrants", "Enum_quadrant"),
            item("minimal", "Minimal", "Enum_minimal"), item("soft", "Soft", "Enum_soft"), item("dark", "Dark background", "Enum_dark"),
            ...PRO_STYLES.map(k => item(k, k.charAt(0).toUpperCase() + k.slice(1) + " [Pro]", "Enum_" + k))],
        value: item("classic", "Classic", "Enum_classic") });
    guide = toggle("guide", "Show setup tips", "style_guide", true);
    name = "style";
    displayName = "Style template";
    displayNameKey = "card_style";
    slices = [this.template, this.guide];
}

// Accesibilidad (1.2, gratis): la tarjeta común de la cartera (Calendar 1.3, Risk Matrix 1.1).
class AccessibilitySettings extends Card {
    highContrast = new formattingSettings.ItemDropdown({ name: "highContrast", displayName: "High contrast", displayNameKey: "accessibility_highContrast",
        items: [item("auto", "Auto (follow Windows)", "Enum_hcAuto"), item("on", "On", "Enum_hcOn")], value: item("auto", "Auto (follow Windows)", "Enum_hcAuto") });
    focusColor  = color("focusColor", "Focus outline colour", "accessibility_focusColor", FOCUS_DEFAULT);
    focusWidth  = num("focusWidth", "Focus outline width", "accessibility_focusWidth", 2, 1, 6);
    minTextSize = num("minTextSize", "Minimum text size", "accessibility_minTextSize", 8, 6, 24);
    name = "accessibility";
    displayName = "Accessibility";
    displayNameKey = "card_accessibility";
    slices = [this.highContrast, this.focusColor, this.focusWidth, this.minTextSize];
}

/**
 * Orden del panel (1.2), el común de la cartera: Style template primero, las tarjetas propias, ejes, leyenda y
 * Accessibility al final. "Series colours" (una muestra por grupo de la leyenda) la añade el visual detrás de Bubbles,
 * porque sus selectores dependen de los datos. Los nombres internos no cambian: solo el orden.
 */
export class VisualFormattingSettingsModel extends Model {
    style          = new StyleSettings();
    dataPoints     = new DataPointSettings();
    legend         = new LegendSettings();
    referenceLines = new RefLineSettings();
    upperZones     = new ZonesSettings("upperZones");
    lowerZones     = new ZonesSettings("lowerZones");
    axes           = new AxesSettings();
    trendLine      = new TrendLineSettings();
    zoneTable      = new ZoneTableSettings();
    zoneCards      = new CardSettings();
    accessibility  = new AccessibilitySettings();
    cards          = [this.style, this.dataPoints, this.referenceLines, this.upperZones, this.lowerZones,
        this.trendLine, this.zoneTable, this.zoneCards, this.axes, this.legend, this.accessibility] as formattingSettings.Cards[];
}

/**
 * Plantillas: valores que la plantilla pone donde el autor no ha fijado nada, por objeto. "classic" es el aspecto de
 * 1.0. Al ELEGIR una, el visual borra esas propiedades guardadas para que se vea.
 */
export const TEMPLATES: Record<string, Record<string, Record<string, string | number | boolean>>> = {
    classic: {},
    quadrant: {
        upperZones: { zone1Color: "#FDECEA", zone2Color: "#E6F4EA", zone1Opacity: 70, zone2Opacity: 70, labelFontSize: 12, line1Mode: "average", lineCount: 1 },
        lowerZones: { zone1Color: "#F3F2F1", zone2Color: "#FFF4CE", zone1Opacity: 70, zone2Opacity: 70, labelFontSize: 12, layout: "mirror" },
        dataPoints: { fill: "#1F4E79", borderColor: "#FFFFFF" },
        referenceLines: { yRefColor: "#8A8886", yRefStyle: "solid", yRefMode: "average", showYRef: true },
        axes: { gridColor: "#EDEBE9" }
    },
    minimal: {
        upperZones: { zone1Opacity: 0, zone2Opacity: 0, zone3Opacity: 0, zone4Opacity: 0, zone5Opacity: 0 },
        lowerZones: { zone1Opacity: 0, zone2Opacity: 0, zone3Opacity: 0, zone4Opacity: 0, zone5Opacity: 0 },
        dataPoints: { fill: "#605E5C", opacity: 75, borderColor: "#FFFFFF" },
        axes: { showGridlines: false, tickColor: "#8A8886", titleColor: "#605E5C" },
        referenceLines: { yRefColor: "#A19F9D" }
    },
    soft: {
        upperZones: { zone1Color: "#DCEBF7", zone2Color: "#E8F3E8", zone3Color: "#FBEFD9", zone4Color: "#F4E1EC", zone5Color: "#ECEAF5", zone1Opacity: 55, zone2Opacity: 55, zone3Opacity: 55, zone4Opacity: 55, zone5Opacity: 55 },
        lowerZones: { zone1Color: "#F4E1EC", zone2Color: "#FBEFD9", zone3Color: "#E8F3E8", zone4Color: "#DCEBF7", zone5Color: "#ECEAF5", zone1Opacity: 55, zone2Opacity: 55, zone3Opacity: 55, zone4Opacity: 55, zone5Opacity: 55 },
        dataPoints: { fill: "#5B8DB8", opacity: 80 },
        axes: { tickColor: "#8A8886", titleColor: "#605E5C", gridColor: "#F0EFEE" }
    },
    dark: {
        upperZones: { zone1Color: "#2E4A62", zone2Color: "#2F5233", zone3Color: "#5C4B1F", zone4Color: "#5A2E45", zone5Color: "#3B3B4F", zone1Opacity: 60, zone2Opacity: 60, zone3Opacity: 60, zone4Opacity: 60, zone5Opacity: 60, labelBgColor: "#1F1F1F" },
        lowerZones: { zone1Color: "#5A2E45", zone2Color: "#5C4B1F", zone3Color: "#2F5233", zone4Color: "#2E4A62", zone5Color: "#3B3B4F", zone1Opacity: 60, zone2Opacity: 60, zone3Opacity: 60, zone4Opacity: 60, zone5Opacity: 60, labelBgColor: "#1F1F1F" },
        dataPoints: { fill: "#5FB0F0", borderColor: "#1F1F1F", labelColor: "#F3F2F1" },
        referenceLines: { yRefColor: "#C8C6C4" },
        axes: { plotBackground: "#1F1F1F", gridColor: "#3B3A39", tickColor: "#C8C6C4", titleColor: "#E1DFDD" },
        legend: { color: "#C8C6C4" },
        trendLine: { color: "#F2C80F" }
    },
    // Report theme (1.2, gratis): los valores salen del tema del informe en cada pintado (visual.ts, temaInforme()).
    report: {},
    // Colección TCViz (1.2, Pro). Solo propiedades que ya define alguna plantilla de la 1.1: elegir un estilo no borra
    // más ajustes guardados que antes. Los colores elegidos por serie (seriesColors) no se tocan nunca.
    ...Object.keys(STYLE_TOKENS).reduce((acc, k) => { acc[k] = estilo(STYLE_TOKENS[k]); return acc; },
        {} as Record<string, Record<string, Record<string, string | number | boolean>>>)
};

/** Mezcla de dos colores #RRGGBB (t = 0 el primero, 1 el segundo). */
function mix(a: string, b: string, t: number): string {
    const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) || 0);
    const x = p(a), y = p(b);
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function estilo(k: StyleTokens): Record<string, Record<string, string | number | boolean>> {
    // Zonas: tintes de la paleta del estilo sobre su fondo (opacidad 100). Un color de serie al 20 % quedaba turbio en
    // los estilos claros con tinta oscura (Ledger, Editorial).
    const s = k.series, t = k.dark ? [0.16, 0.24] : [0.10, 0.17];
    const zonas = (orden: number[]) => orden.reduce((acc, c, i) => {
        acc[`zone${i + 1}Color`] = mix(k.bg, s[c], t[i % 2]); acc[`zone${i + 1}Opacity`] = 100; return acc;
    }, { labelBgColor: k.bg } as Record<string, string | number>);
    return {
        upperZones: zonas([0, 1, 2, 3, 4]),
        lowerZones: zonas([2, 3, 4, 0, 1]),
        dataPoints: { fill: s[0], borderColor: k.bg, labelColor: k.text },
        referenceLines: { yRefColor: k.muted },
        axes: { tickColor: k.muted, titleColor: k.text, gridColor: k.grid, plotBackground: k.bg },
        legend: { color: k.muted },
        trendLine: { color: s[1] }
    };
}

/**
 * Geometría que una plantilla puede poner (Four quadrants: en la media, un divisor). Al elegir plantilla NO se borra:
 * si el autor ya fijó sus líneas, se respetan; la plantilla solo la pone donde no hay nada guardado.
 */
export const GEOMETRY: Record<string, string[]> = {
    referenceLines: ["yRefMode", "showYRef"],
    upperZones: ["line1Mode", "lineCount"],
    lowerZones: ["layout"]
};
