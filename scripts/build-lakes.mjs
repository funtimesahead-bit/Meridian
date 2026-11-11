// Builds src/lib/geo/lakes.json from Natural Earth's ne_50m_lakes.geojson
// (https://github.com/nvkelso/natural-earth-vector, public domain).
// Keeps only large lakes so the maps stay clean.
//
//   node scripts/build-lakes.mjs path/to/ne_50m_lakes.geojson

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { geoArea } from "d3-geo";

const MIN_AREA_KM2 = 3000;
const EARTH_RADIUS_KM = 6371;

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/build-lakes.mjs path/to/ne_50m_lakes.geojson");
  process.exit(1);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "src/lib/geo/lakes.json");

const round = (c) =>
  typeof c[0] === "number"
    ? [Math.round(c[0] * 100) / 100, Math.round(c[1] * 100) / 100]
    : c.map(round);

const data = JSON.parse(readFileSync(source, "utf8"));
const kept = [];
for (const f of data.features) {
  const km2 = geoArea(f) * EARTH_RADIUS_KM ** 2;
  if (km2 < MIN_AREA_KM2) continue;
  kept.push({ name: f.properties.name, km2 });
}
const features = data.features
  .filter((f) => geoArea(f) * EARTH_RADIUS_KM ** 2 >= MIN_AREA_KM2)
  .map((f) => ({
    type: "Feature",
    properties: {},
    geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) },
  }));

writeFileSync(out, JSON.stringify({ type: "FeatureCollection", features }));
console.log(`${features.length} lakes -> ${out}`);
console.log(kept.sort((a, b) => b.km2 - a.km2).map((l) => `${l.name} ${Math.round(l.km2)}`).join(", "));
