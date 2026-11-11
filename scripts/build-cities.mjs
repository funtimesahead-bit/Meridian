// Builds public/data/cities.json from GeoNames' cities15000.txt
// (https://download.geonames.org/export/dump/cities15000.zip, CC BY 4.0).
//
//   node scripts/build-cities.mjs path/to/cities15000.txt
//
// Output rows: [name, asciiName, lat, lon, population, countryCode, altNames?]
// sorted by population, largest first.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/build-cities.mjs path/to/cities15000.txt");
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/data/cities.json");

// Districts of a bigger city, and places that no longer exist, are not answers.
const SKIP_CODES = new Set(["PPLX", "PPLH", "PPLQ", "PPLW"]);
const ALT_NAME_MIN_POPULATION = 1_000_000;
const LATIN_NAME = /^[\p{Script=Latin}][\p{Script=Latin}\s'’.\-]*$/u;

const key = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const rows = [];
for (const line of readFileSync(source, "utf8").split("\n")) {
  if (!line) continue;
  const f = line.split("\t");
  if (f[6] !== "P" || SKIP_CODES.has(f[7])) continue;
  const population = Number(f[14]);
  if (!(population >= 15000)) continue;

  const name = f[1];
  const ascii = f[2];
  const row = [
    name,
    ascii === name ? 0 : ascii,
    Math.round(Number(f[4]) * 1000) / 1000,
    Math.round(Number(f[5]) * 1000) / 1000,
    population,
    f[8],
  ];

  if (population >= ALT_NAME_MIN_POPULATION && f[3]) {
    const seen = new Set([key(name), key(ascii)]);
    const alts = [];
    for (const alt of f[3].split(",")) {
      if (alt.length < 3 || alt.length > 30 || !LATIN_NAME.test(alt)) continue;
      const k = key(alt);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      alts.push(alt);
    }
    if (alts.length) row.push(alts);
  }
  rows.push(row);
}

rows.sort((a, b) => b[4] - a[4]);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(rows));
console.log(`${rows.length} cities -> ${out}`);
