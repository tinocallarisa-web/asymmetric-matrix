/**
 * build-test.js — Asymmetric Matrix
 *
 * Patches visual.ts + pbiviz.json → runs pbiviz package → restores both.
 * The source always lives in production state (GUID without _test, isPro via licenseManager).
 *
 * Usage:  node build-test.js
 */

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const VISUAL_TS  = path.join(__dirname, "src", "visual.ts");
const PBIVIZ_JSON = path.join(__dirname, "pbiviz.json");

const ISPRO_MARKER    = "private isPro: boolean = false; // ISPRO_MARKER";
const ISPRO_PATCHED   = "private isPro: boolean = true; // ISPRO_MARKER";

// ── Read originals ─────────────────────────────────────────────────────────────

const origVisual = fs.readFileSync(VISUAL_TS,   "utf8");
const origPbiviz = fs.readFileSync(PBIVIZ_JSON, "utf8");

let patchedVisual = origVisual;
let patchedPbiviz = origPbiviz;

// ── Patch visual.ts ────────────────────────────────────────────────────────────

if (!origVisual.includes(ISPRO_MARKER)) {
    console.error(`\n❌  ISPRO_MARKER not found in src/visual.ts.`);
    console.error(`    Expected line containing: ${ISPRO_MARKER}`);
    process.exit(1);
}
patchedVisual = origVisual.replace(ISPRO_MARKER, ISPRO_PATCHED);

// ── Patch pbiviz.json (add _test suffix to guid) ───────────────────────────────

const pbivizObj = JSON.parse(origPbiviz);
const realGuid  = pbivizObj.visual.guid;

if (realGuid.endsWith("_test")) {
    console.error(`\n❌  GUID already ends with _test — source may already be patched. Aborting.`);
    process.exit(1);
}
pbivizObj.visual.guid = realGuid + "_test";
patchedPbiviz = JSON.stringify(pbivizObj, null, 2);

// ── Write patches ──────────────────────────────────────────────────────────────

fs.writeFileSync(VISUAL_TS,   patchedVisual, "utf8");
fs.writeFileSync(PBIVIZ_JSON, patchedPbiviz, "utf8");

console.log(`\n✅  Patched:  isPro = true,  guid = ${pbivizObj.visual.guid}`);
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
console.log(`\n🎉  Test build complete — find .pbiviz in dist/`);
