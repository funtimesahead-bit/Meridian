// Builds the US historical boundaries used by Learn > US History from the
// Newberry Library's Atlas of Historical County Boundaries, state and
// territory file, 0.01-degree version (US_AtlasHCB_StateTerr_Gen01.zip from
// https://digital.newberry.org/ahcb/pages/United_States.html).
//
// That data is licensed CC BY-NC-SA 4.0, and so are the files this writes.
//
//   node scripts/build-us-history.mjs path/to/US_HistStateTerr_Gen01
//   (the path without .shp / .dbf)
//
// Writes:
//   src/learn/us-history/boundaries.json  TopoJSON, one object "units"
//   src/learn/us-history/changes.json     what changed on each date

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as shapefile from "shapefile";
import { topology } from "topojson-server";
import { quantize } from "topojson-client";
import { presimplify, quantile, simplify } from "topojson-simplify";

const base = process.argv[2];
if (!base) {
  console.error("Usage: node scripts/build-us-history.mjs path/to/US_HistStateTerr_Gen01");
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "src/learn/us-history");

/** The data stops at 31 Dec 2000; anything still in place then is still in place. */
const OPEN_END = 99991231;
const TREATY_OF_PARIS = 17830903;

const TYPE_CODES = {
  State: "s",
  Territory: "t",
  "Unorganized Territory": "u",
  "District of Columbia": "d",
  Other: "o",
};

const source = await shapefile.open(`${base}.shp`, `${base}.dbf`, { encoding: "utf-8" });
const features = [];
const changes = [];
for (;;) {
  const { done, value } = await source.read();
  if (done) break;
  const p = value.properties;
  const end = p.END_N >= 20001231 ? OPEN_END : p.END_N;
  features.push({
    type: "Feature",
    properties: {
      id: p.ID,
      n: p.FULL_NAME || p.NAME,
      a: p.ABBR_NAME,
      t: TYPE_CODES[p.TERR_TYPE] ?? "o",
      s: p.START_N,
      e: end,
    },
    geometry: value.geometry,
  });
  // The 1783 records describe 1776 independence; the viewer has its own text for that.
  if (p.START_N !== TREATY_OF_PARIS && p.CHANGE) {
    changes.push({ d: p.START_N, n: p.FULL_NAME || p.NAME, text: p.CHANGE.trim() });
  }
}

// One change often creates several units; keep each description once.
const seen = new Set();
const uniqueChanges = changes
  .sort((a, b) => a.d - b.d || a.n.localeCompare(b.n))
  .filter((c) => {
    const key = `${c.d}|${c.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

let topo = topology({ units: { type: "FeatureCollection", features } }, 2e4);
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.55));
// Store coordinates as small whole-number steps; much smaller than decimals.
topo = quantize(topo, 1e4);

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "boundaries.json"), JSON.stringify(topo));
writeFileSync(resolve(outDir, "changes.json"), JSON.stringify(uniqueChanges));
console.log(`${features.length} boundary versions, ${uniqueChanges.length} changes -> ${outDir}`);
