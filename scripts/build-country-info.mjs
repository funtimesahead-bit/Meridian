// Builds src/lib/geo/country-info.json from GeoNames' countryInfo.txt
// (https://download.geonames.org/export/dump/countryInfo.txt, CC BY 4.0)
// plus the city list in public/data/cities.json for capital coordinates.
//
//   node scripts/build-country-info.mjs path/to/countryInfo.txt
//
// Output: { [ISO code]: { name, continent, capital, lat?, lon? } }
// Capitals too small for the city list get no coordinates here; the app
// fills those from a short hand-written list.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/build-country-info.mjs path/to/countryInfo.txt");
  process.exit(1);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const key = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^(saint|st\.?)\s/, "st ")
    .replace(/[^a-z0-9]+/g, "");

// [name, ascii, lat, lon, population, countryCode, alts?], biggest first.
const cities = JSON.parse(readFileSync(resolve(root, "public/data/cities.json"), "utf8"));

const out = {};
const missing = [];
for (const line of readFileSync(source, "utf8").split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const f = line.split("\t");
  const [code, , , , name, capital, , , continent] = f;
  const entry = { name, continent, capital };
  if (capital) {
    const want = key(capital);
    const match = cities.find(
      (c) =>
        c[5] === code &&
        (key(c[0]) === want || (c[1] && key(c[1]) === want) || (c[6] ?? []).some((a) => key(a) === want)),
    );
    if (match) {
      entry.lat = match[2];
      entry.lon = match[3];
    } else {
      missing.push(`${code} ${capital}`);
    }
  }
  out[code] = entry;
}

writeFileSync(resolve(root, "src/lib/geo/country-info.json"), JSON.stringify(out));
console.log(`${Object.keys(out).length} countries; capitals without coordinates:`);
console.log(missing.join(", "));
