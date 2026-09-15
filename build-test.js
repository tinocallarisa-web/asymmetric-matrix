/**
 * build-test.js — Asymmetric Matrix
 *
 * Patches visual.ts + pbiviz.json → runs pbiviz package → restores both.
 * The source always lives in production state (GUID without _test, isPro via licenseManager).
 *
 * Usage:  node build-test.js [--free] [--debug]
 *   (no flag)  isPro forced to true, guid + "_test"
 *   --free     real licence check (free tier), guid + "_testfree"
 *   --debug    red DBG line with viewMode / licence state (test builds only)
 */

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const VISUAL_TS   = path.join(__dirname, "src", "visual.ts");
const PBIVIZ_JSON = path.join(__dirname, "pbiviz.json");
const forceFree   = process.argv.includes("--free");
const debug       = process.argv.includes("--debug");

const ISPRO_MARKER  = "private isPro: boolean = false; // ISPRO_MARKER";
const ISPRO_PATCHED = "private isPro: boolean = true; // ISPRO_MARKER — TEST BUILD";
const DEBUG_ANCHOR  = "this.renderWatermark(svg, W, H);";

// ── Read originals ─────────────────────────────────────────────────────────────

const origVisual = fs.readFileSync(VISUAL_TS,   "utf8");
const origPbiviz = fs.readFileSync(PBIVIZ_JSON, "utf8");

let patchedVisual = origVisual;

// ── Patch visual.ts ────────────────────────────────────────────────────────────

if (!origVisual.includes(ISPRO_MARKER)) {
    console.error(`\n❌  ISPRO_MARKER not found in src/visual.ts.`);
    console.error(`    Expected line containing: ${ISPRO_MARKER}`);
    process.exit(1);
}
if (!forceFree) patchedVisual = patchedVisual.replace(ISPRO_MARKER, ISPRO_PATCHED);

if (debug) {
    if (!patchedVisual.includes(DEBUG_ANCHOR)) {
        console.error(`\n❌  DEBUG_ANCHOR not found in src/visual.ts: ${DEBUG_ANCHOR}`);
        process.exit(1);
    }
    patchedVisual = patchedVisual.replace(DEBUG_ANCHOR, DEBUG_ANCHOR + `
        { const o: any = this.lastOptions || {};
          svgEl("text", { x: 4, y: 12, "font-size": 10, fill: "#C00000" }, svg,
            "DBG viewMode=" + o.viewMode + " lic=" + this.licenseResolved + " unsup=" + this.licenseEnvUnsupported +
            " pro=" + this.isPro + " preview=" + this.isPreview() + " attempted=" + this.attemptedPro.join(",")); }`);
}

// ── Patch pbiviz.json (guid suffix per mode) ───────────────────────────────────

const pbivizObj = JSON.parse(origPbiviz);
const realGuid  = pbivizObj.visual.guid;

if (/_test/.test(realGuid)) {
    console.error(`\n❌  GUID already contains _test — source may already be patched. Aborting.`);
    process.exit(1);
}
pbivizObj.visual.guid = realGuid + (forceFree ? "_testfree" : "_test");
const patchedPbiviz = JSON.stringify(pbivizObj, null, 2);

// ── Write patches ──────────────────────────────────────────────────────────────

fs.writeFileSync(VISUAL_TS,   patchedVisual, "utf8");
fs.writeFileSync(PBIVIZ_JSON, patchedPbiviz, "utf8");

console.log(`\n✅  Patched:  isPro = ${forceFree ? "licence (free)" : "true"},  guid = ${pbivizObj.visual.guid}${debug ? ",  DBG on" : ""}`);
console.log("▶   Running: npx pbiviz package ...\n");

let buildOk = false;

try {
    execSync("npx pbiviz package", { stdio: "inherit", cwd: __dirname });
    buildOk = true;
} catch (e) {
    console.error("\n❌  pbiviz package failed.");
} finally {
    // ── Restore originals (always) ─────────────────────────────────────────────
    fs.writeFileSync(VISUAL_TS,   origVisual,  "utf8");
    fs.writeFileSync(PBIVIZ_JSON, origPbiviz,  "utf8");
    console.log("\n✅  Restored: visual.ts and pbiviz.json");
}

if (!buildOk) process.exit(1);
console.log(`\n🎉  Test build complete — dist/${pbivizObj.visual.guid}.${pbivizObj.visual.version}.pbiviz`);
