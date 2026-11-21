// Builds src/learn/europe-history/borders.json: Europe's political borders
// from 1492 to today, as one TopoJSON layer of dated units.
//
//   node scripts/build-europe-history.mjs <historical-basemaps geojson dir> <cshapes_2_cow.topojson>
//
// Sources
//   1492–1885: historical-basemaps by André Ourednik (GPL-3.0),
//     https://github.com/aourednik/historical-basemaps — snapshot maps for
//     key years. They are rough, so names, overlords and a few gaps are
//     corrected below.
//   1886–today: CShapes 2.0 (Schvitz, Girardin, Rüegger, Weidmann, Cederman
//     and Gleditsch, 2022; GPL >= 2), https://icr.ethz.ch/data/cshapes/ —
//     dated borders of every state and colony, year by year.
//
// Each unit: { n: name, s: first day, e: last day (YYYYMMDD), k: kind,
//   o?: overlord, c: colour key }. Kinds: i independent, v vassal or under
//   another crown, c colony or protectorate, x occupied.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { geoArea, geoBounds, geoContains } from "d3-geo";
import { feature, quantize } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, quantile, simplify } from "topojson-simplify";

const [hbDir, cshapesFile] = process.argv.slice(2);
if (!hbDir || !cshapesFile) {
  console.error("Usage: node scripts/build-europe-history.mjs <hb geojson dir> <cshapes topojson>");
  process.exit(1);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Snapshot years before CShapes begins; each lasts until the next one. */
const SNAPSHOTS = [1492, 1500, 1530, 1600, 1650, 1700, 1715, 1783, 1800, 1815, 1880];
const CSHAPES_FROM = 18860101;
const OPEN_END = 99991231;

/** The area shown: west of the Urals, the Mediterranean shores, Anatolia. */
const VIEW = { west: -32, east: 62, south: 26, north: 82 };

function inView(f) {
  const [[w, s], [e, n]] = geoBounds(f);
  if (n < VIEW.south || s > VIEW.north) return false;
  if (w > e) return true; // crosses the antimeridian: Russia, so yes
  return e >= VIEW.west && w <= VIEW.east;
}

/** Make every polygon's outer ring wind the way d3 expects. */
function rewind(geometry) {
  const fix = (polygon) => {
    const area = geoArea({ type: "Polygon", coordinates: polygon });
    return area > 2 * Math.PI ? polygon.map((ring) => [...ring].reverse()) : polygon;
  };
  if (geometry.type === "Polygon") return { ...geometry, coordinates: fix(geometry.coordinates) };
  if (geometry.type === "MultiPolygon") {
    return { ...geometry, coordinates: geometry.coordinates.map(fix) };
  }
  return geometry;
}

/* ---------- Colour keys: one colour per lineage, across renames ---------- */

const LINEAGE = [
  [/^(England|Kingdom of England|Kingdom of Great Britain|United Kingdom)/, "britain"],
  [/^(Scotland|Kingdom of Scotland)/, "scotland"],
  [/^(Kingdom of Ireland|Ireland)$/, "ireland"],
  [/^(France|Kingdom of France|French)/, "france"],
  [/^(Castile|Crown of Castile|Spain|Spanish)/, "spain"],
  [/^Crown of Aragon/, "aragon"],
  [/^Portugal/, "portugal"],
  [/(Moscow|Muscovy|Tsardom of Russia|Russian Empire|Soviet|^Russia)/, "russia"],
  [/(Ottoman|^Turkey)/, "ottoman"],
  [/(Habsburg Monarchy|Austrian Empire|Austria-Hungary|^Austria$|Austrian Netherlands)/, "austria"],
  [/(Brandenburg|Prussia|German Empire|^Germany|West Germany)/, "germany"],
  [/East Germany/, "eastgermany"],
  [/(Poland|Polish)/, "poland"],
  [/^Lithuania/, "lithuania"],
  [/(Denmark)/, "denmark"],
  [/^(Sweden|Kalmar Union)/, "sweden"],
  [/^Norway/, "norway"],
  [/(Venice|Venetia)/, "venice"],
  [/^Papal States/, "papal"],
  [/(Swiss|Switzerland|Helvetic|Seven Tithes)/, "swiss"],
  [/(Dutch Republic|Netherlands|Batavian)/, "netherlands"],
  [/^Belgium/, "belgium"],
  [/(Sardinia|Savoy|Piedmont|^Italy)/, "italy"],
  [/(Naples|Sicily|Two Sicilies)/, "naples"],
  [/(Hungary)/, "hungary"],
  [/(Holy Roman Empire)/, "hre"],
  [/Habsburg \(Charles V\)/, "spain"],
  [/(Serbia|Yugoslavia|Serbs, Croats)/, "serbia"],
  [/^(Romania|Rumania)/, "romania"],
  [/^Bulgaria/, "bulgaria"],
  [/^Greece/, "greece"],
  [/(Persia|^Iran|Aq Qoyunlu|Safavid)/, "persia"],
];

function colourKey(name) {
  for (const [re, key] of LINEAGE) if (re.test(name)) return key;
  return name
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ---------- 1492–1885: snapshot names and overlords ---------- */

/** NAME as written in the snapshot -> name shown, for every year. */
const RENAME = {
  Castille: "Crown of Castile",
  "Aragón": "Crown of Aragon",
  Britany: "Duchy of Brittany",
  "Imperial Hungary": "Kingdom of Hungary",
  "Emirate of the White Sheep Turks": "Aq Qoyunlu",
  "Golden Horde": "Great Horde",
  "Hafsid Caliphate": "Hafsid Sultanate",
  "Wattasid Caliphate": "Wattasid Sultanate",
  "Zayyanid Caliphate": "Kingdom of Tlemcen",
  "Teutonic Knights": "Teutonic Order",
  "Republic of the Seven Zenden": "Seven Tithes (Valais)",
  "Swiss Confederation": "Old Swiss Confederacy",
  "England and Ireland": "Kingdom of England",
  "Polish–Lithuanian Commonwealth": "Polish–Lithuanian Commonwealth",
  "Kingdom of the Two Sicilies": "Kingdoms of Naples and Sicily",
  "Milano (Austria)": "Duchy of Milan",
  "Austria Hungary": "Austria-Hungary",
  Germany: "German Empire",
  Bulgaria: "Principality of Bulgaria",
  "Grand Duchy of Moscow": "Grand Duchy of Moscow",
  "Crimean Khanate": "Crimean Khanate",
  Netherlands: "Dutch Republic",
  "Kingdom of Sardinia": "Kingdom of Sardinia",
};

/** Per-snapshot fixes, applied after RENAME: { name -> { n?, o?, k?, drop? } }. */
const YEAR_FIX = {
  1492: {
    "Duchy of Brittany": { o: "Kingdom of France", k: "v" }, // Anne married Charles VIII, Dec 1491
    "Teutonic Order": { o: "Kingdom of Poland", k: "v" }, // a Polish fief since 1466
  },
  1500: {
    "Duchy of Brittany": { o: "Kingdom of France", k: "v" },
    "Teutonic Order": { o: "Kingdom of Poland", k: "v" },
  },
  1530: {
    "Duchy of Brittany": { o: "Kingdom of France", k: "v" },
    "Tsardom of Muscovy": { n: "Grand Duchy of Moscow" }, // tsardom from 1547
    Prussia: { n: "Duchy of Prussia", o: "Kingdom of Poland", k: "v" },
    Naples: { n: "Kingdom of Naples", o: "Spain", k: "v" },
    Sicily: { n: "Kingdom of Sicily", o: "Spain", k: "v" },
    Sardinia: { n: "Kingdom of Sardinia", o: "Spain", k: "v" },
    "Habsburg Netherlands": { o: "Habsburg (Charles V)", k: "v" },
    Florence: { n: "Republic of Florence" },
    Genoa: { n: "Republic of Genoa" },
    Milan: { n: "Duchy of Milan" },
    Savoy: { n: "Duchy of Savoy" },
    "Kingdom of England": { n: "Kingdom of England" },
  },
  1600: {
    "Tsardom of Muscovy": { n: "Tsardom of Russia" },
    Prussia: { n: "Duchy of Prussia", o: "Kingdom of Poland", k: "v" },
    Naples: { n: "Kingdom of Naples", o: "Spain", k: "v" },
    Sicily: { n: "Kingdom of Sicily", o: "Spain", k: "v" },
    Sardinia: { n: "Kingdom of Sardinia", o: "Spain", k: "v" },
    Milan: { n: "Duchy of Milan", o: "Spain", k: "v" },
    Portugal: { o: "Spain (Iberian Union)", k: "v" }, // 1580–1640
    "Habsburg Netherlands": { n: "Spanish Netherlands", o: "Spain", k: "v" },
    Florence: { n: "Grand Duchy of Tuscany" },
    Genoa: { n: "Republic of Genoa" },
    Savoy: { n: "Duchy of Savoy" },
    Finnmark: { n: "Finnmark", o: "Denmark-Norway", k: "v" },
  },
  1650: {
    "Austrian Empire": { n: "Habsburg Monarchy" },
    Luxembourg: { n: "Spanish Netherlands", o: "Spain", k: "v" },
    Prussia: { n: "Duchy of Prussia", o: "Polish–Lithuanian Commonwealth", k: "v" },
    "Tsardom of Muscovy": { n: "Tsardom of Russia" },
    Genoa: { n: "Republic of Genoa" },
    Tuscany: { n: "Grand Duchy of Tuscany" },
    "Sardinia-Piedmont": { n: "Duchy of Savoy" },
    Milan: { n: "Duchy of Milan", o: "Spain", k: "v" },
    Naples: { n: "Kingdom of Naples", o: "Spain", k: "v" },
    Sicily: { n: "Kingdom of Sicily", o: "Spain", k: "v" },
    Sardinia: { n: "Kingdom of Sardinia", o: "Spain", k: "v" },
    Spain: { n: "Spain", o: undefined, k: "i" },
    "Franche-Comté": { n: "Franche-Comté", o: "Spain", k: "v" },
    Finnmark: { n: "Finnmark", o: "Denmark-Norway", k: "v" },
  },
  1700: {
    "Austrian Empire": { n: "Habsburg Monarchy" },
    Luxembourg: { n: "Spanish Netherlands", o: "Spain", k: "v" },
    Prussia: { n: "Brandenburg-Prussia" },
    "Russian Empire": { n: "Tsardom of Russia" },
    "Tsardom of Muscovy": { n: "Tsardom of Russia" },
    Genoa: { n: "Republic of Genoa" },
    Tuscany: { n: "Grand Duchy of Tuscany" },
    "Sardinia-Piedmont": { n: "Duchy of Savoy" },
    Milan: { n: "Duchy of Milan", o: "Spain", k: "v" },
    // The snapshot gives these to Austria and Savoy, which only happened in 1713–14.
    Naples: { n: "Kingdom of Naples", o: "Spain", k: "v" },
    Sicily: { n: "Kingdom of Sicily", o: "Spain", k: "v" },
    Sardinia: { n: "Kingdom of Sardinia", o: "Spain", k: "v" },
    Spain: { n: "Spain", o: undefined, k: "i" },
    "Franche-Comté": { n: "Franche-Comté", o: "Kingdom of France", k: "v" }, // French since 1678
    Finnmark: { n: "Finnmark", o: "Denmark-Norway", k: "v" },
  },
  1715: {
    "Austrian Empire": { n: "Habsburg Monarchy" },
    "Austrian Netherlands": { n: "Austrian Netherlands", o: "Habsburg Monarchy", k: "v" },
    "United Kingdom": { n: "Kingdom of Great Britain" },
    "Kingdom of Ireland": { o: "Kingdom of Great Britain", k: "v" },
    Prussia: { n: "Kingdom of Prussia" },
    Brandenburg: { n: "Kingdom of Prussia", o: undefined, k: "i" },
    "Russian Empire": { n: "Tsardom of Russia" },
    "Tsardom of Muscovy": { n: "Tsardom of Russia" },
    Genoa: { n: "Republic of Genoa" },
    Tuscany: { n: "Grand Duchy of Tuscany" },
    "Sardinia-Piedmont": { n: "Duchy of Savoy" },
    Milan: { n: "Duchy of Milan", o: "Habsburg Monarchy", k: "v" },
    Naples: { n: "Kingdom of Naples", o: "Habsburg Monarchy", k: "v" },
    Sicily: { n: "Kingdom of Sicily", o: "Duchy of Savoy", k: "v" },
    Sardinia: { n: "Kingdom of Sardinia", o: "Habsburg Monarchy", k: "v" },
    Hanover: { n: "Electorate of Hanover" },
  },
  1783: {
    "Austrian Empire": { n: "Habsburg Monarchy" },
    "Austrian Netherlands": { n: "Austrian Netherlands", o: "Habsburg Monarchy", k: "v" },
    "Duchy of Milan": { o: "Habsburg Monarchy", k: "v" },
    "United Kingdom": { n: "Kingdom of Great Britain", o: undefined, k: "i" },
    "Kingdom of Ireland": { o: "Kingdom of Great Britain", k: "v" },
    Venetia: { n: "Republic of Venice" },
    Poland: { n: "Polish–Lithuanian Commonwealth" },
    Lombardy: { n: "Duchy of Milan", o: "Habsburg Monarchy", k: "v" },
    Hanover: { n: "Electorate of Hanover", o: "Kingdom of Great Britain", k: "v" },
  },
  1800: {
    "Austrian Empire": { n: "Habsburg Monarchy" }, // the Austrian Empire was proclaimed in 1804
    "Austrian Netherlands": { n: "Belgium (annexed by France)", o: "French Republic", k: "x" },
    "United Kingdom": { n: "Kingdom of Great Britain", o: undefined, k: "i" },
    "Kingdom of Ireland": { o: "Kingdom of Great Britain", k: "v" },
    "Kingdom of Sardinia": { n: "Kingdom of Sardinia" },
    Venetia: { n: "Venetia", o: "Habsburg Monarchy", k: "v" }, // Treaty of Campo Formio, 1797
    Lombardy: { n: "Cisalpine Republic", o: "French Republic", k: "v" },
    "Batavian Republic": { o: "French Republic", k: "v" },
    "Helvetic Republic": { o: "French Republic", k: "v" },
    Hanover: { n: "Electorate of Hanover", o: "Kingdom of Great Britain", k: "v" },
    "Mecklenburg-Strelitz": { o: undefined, k: "i" },
    Swabia: { n: "Swabian states (Holy Roman Empire)" },
    France: { n: "French Republic" },
    Algiers: { n: "Regency of Algiers", o: "Ottoman Empire", k: "v" },
    Tunis: { n: "Beylik of Tunis", o: "Ottoman Empire", k: "v" },
  },
  1815: {
    "Austrian Empire": { n: "Austrian Empire" },
    "United Kingdom of Great Britain and Ireland": { n: "United Kingdom" },
    Switzerland: { n: "Swiss Confederation" },
    "Sweden–Norway": { n: "Sweden–Norway" },
    Lombardy: { n: "Lombardy–Venetia", o: "Austrian Empire", k: "v" },
    Venetia: { n: "Lombardy–Venetia", o: "Austrian Empire", k: "v" },
    Modena: { o: undefined, k: "i" },
    Parma: { o: undefined, k: "i" },
    "Kingdoms of Naples and Sicily": { n: "Kingdom of the Two Sicilies" },
    Algiers: { n: "Regency of Algiers", o: "Ottoman Empire", k: "v" },
    Tunis: { n: "Beylik of Tunis", o: "Ottoman Empire", k: "v" },
  },
  1880: {
    "Algeria (FR)": { n: "French Algeria", o: "France", k: "c" },
    "United Kingdom of Great Britain and Ireland": { n: "United Kingdom" },
    Iceland: { n: "Iceland", o: "Denmark", k: "v" },
    Malta: { n: "Malta", o: "United Kingdom", k: "c" },
    "Bosnia-Herzegovina": { n: "Bosnia and Herzegovina", o: "Austria-Hungary", k: "x" },
    "Principality of Bulgaria": { o: "Ottoman Empire", k: "v" },
  },
};

/** Labels that are not states: left as plain land. */
const NOT_STATES = new Set(["Sámi", "central Asian khanates", "Nogai Horde"]);

function snapshotUnits(year, next) {
  const data = JSON.parse(readFileSync(`${hbDir}/world_${year}.geojson`, "utf8"));
  const s = year * 10000 + 101;
  // Lasts until 31 December of the year before the next snapshot.
  const end = next ? (next - 1) * 10000 + 1231 : CSHAPES_FROM - 1;
  const out = [];
  for (const f of data.features) {
    const raw = f.properties.NAME?.trim() || f.properties.SUBJECTO?.trim();
    if (!raw || !f.geometry || NOT_STATES.has(raw)) continue;
    if (!inView(f)) continue;
    let n = RENAME[raw] ?? raw;
    const subj = f.properties.SUBJECTO?.trim();
    let o;
    let k = "i";
    if (subj && subj !== raw && RENAME[subj] !== n && !/^\[?\d/.test(subj) && subj !== "UK") {
      o = RENAME[subj] ?? subj;
      k = "v";
    }
    const fix = YEAR_FIX[year]?.[n] ?? YEAR_FIX[year]?.[raw];
    if (fix) {
      if (fix.drop) continue;
      if (fix.n) n = fix.n;
      if ("o" in fix) o = fix.o;
      if (fix.k) k = fix.k;
    }
    if (o === "Spanish Habsburg") o = "Spain";
    if (o && (o === n || colourKey(o) === colourKey(n))) {
      o = undefined;
      k = "i";
    }
    out.push({
      type: "Feature",
      geometry: rewind(f.geometry),
      properties: { n, s, e: end, k, ...(o ? { o } : {}), c: colourKey(o && k !== "i" ? o : n) },
    });
  }
  return out;
}

/* ---------- 1886–today: CShapes ---------- */

const ymd = (iso) => Number(iso.replaceAll("-", ""));

/** Names that changed while CShapes kept one label. */
function cshapesName(raw, start) {
  switch (raw) {
    case "Germany (Prussia)":
      return start < 19181109 ? "German Empire" : "Germany";
    case "German Federal Republic":
      if (start >= 19901003) return "Germany";
      return start < 19490523 ? "West Germany (Allied occupation)" : "West Germany";
    case "German Democratic Republic":
      return start < 19491007 ? "East Germany (Soviet occupation)" : "East Germany";
    case "Russia (Soviet Union)":
      if (start < 19171107) return "Russian Empire";
      if (start < 19221230) return "Soviet Russia";
      return start < 19911226 ? "Soviet Union" : "Russia";
    case "Turkey (Ottoman Empire)":
      return start < 19221101 ? "Ottoman Empire" : "Turkey";
    case "Yugoslavia/Serbia":
      if (start < 19291003) return "Kingdom of Serbs, Croats and Slovenes";
      if (start < 19920427) return "Yugoslavia";
      return start < 20030204 ? "FR Yugoslavia" : "Serbia and Montenegro";
    case "Macedonia (FYROM/North Macedonia)":
      return start < 20190212 ? "Macedonia" : "North Macedonia";
    case "Italy/Sardinia":
      return "Italy";
    case "Rumania":
      return "Romania";
    case "Belarus (Byelorussia)":
      return "Belarus";
    case "Iran (Persia)":
      return start < 19350321 ? "Persia" : "Iran";
    case "Danzig":
      return "Free City of Danzig";
    case "Bosnia":
    case "Herzegovina":
      return "Bosnia and Herzegovina";
    case "Southern zone of Spanish Morocco":
      return "Spanish Morocco";
    default:
      return raw;
  }
}

/** Microstates CShapes only lists once they joined the UN; they are older. */
const BACKDATE = new Set(["Monaco", "Andorra", "San Marino", "Liechtenstein"]);

function cshapesUnits() {
  const topo = JSON.parse(readFileSync(cshapesFile, "utf8"));
  const all = feature(topo, topo.objects.cshapes_2_cow).features;
  const byCode = new Map();
  for (const f of all) {
    const p = f.properties;
    const list = byCode.get(p.cowcode) ?? [];
    list.push(p);
    byCode.set(p.cowcode, list);
  }
  const ownerName = (code, start) => {
    const recs = byCode.get(Number(code)) ?? [];
    const rec = recs.find((r) => ymd(r.start) <= start && ymd(r.end) >= start) ?? recs[0];
    return rec ? cshapesName(rec.country_name, start) : undefined;
  };
  const out = [];
  for (const f of all) {
    const p = f.properties;
    if (!f.geometry || !inView(f)) continue;
    let s = ymd(p.start);
    let e = ymd(p.end);
    if (e >= 20191231) e = OPEN_END; // no European border has moved since
    if (BACKDATE.has(p.country_name) && !all.some((g) => g !== f && g.properties.country_name === p.country_name && ymd(g.properties.start) < s)) {
      s = CSHAPES_FROM;
    }
    const n = cshapesName(p.country_name, s);
    let k = "i";
    let o;
    if (p.status === "occupied") k = "x";
    else if (["colony", "protectorate", "mandate"].includes(p.status)) k = "c";
    if (k !== "i" && p.owner && Number(p.owner) !== p.cowcode && Number(p.owner) !== 0) {
      o = ownerName(p.owner, s);
    }
    // Germany and Austria after 1945 were occupied jointly; show them in their own colour.
    if (p.country_name === "German Federal Republic" && k === "x") o = "the Western Allies (US, UK, France)";
    if (p.country_name === "Austria" && k === "x" && s >= 19450101) o = "the four Allied powers";
    if (o === "United States of America") o = "the United States";
    if (p.country_name === "Danzig") {
      k = "v";
      o = "League of Nations";
    }
    if (k !== "i" && !o) k = "i";
    out.push({
      type: "Feature",
      geometry: rewind(f.geometry),
      properties: {
        n,
        s,
        e,
        k,
        ...(o ? { o } : {}),
        c: colourKey((k === "x" && s < 19450508) || k === "c" ? o ?? n : n),
      },
    });
  }
  return out;
}

/** Gaps in CShapes filled from the 1900 snapshot. */
function patches() {
  const data = JSON.parse(readFileSync(`${hbDir}/world_1900.geojson`, "utf8"));
  const take = (name, props) => {
    const f = data.features.find((x) => x.properties.NAME === name);
    return { type: "Feature", geometry: rewind(f.geometry), properties: props };
  };
  return [
    // An Ottoman vassal until it declared independence on 5 October 1908.
    take("Bulgaria", { n: "Principality of Bulgaria", s: CSHAPES_FROM, e: 19081004, k: "v", o: "Ottoman Empire", c: "bulgaria" }),
    // Independent since 1878; CShapes only has it from 1915.
    take("Montenegro", { n: "Montenegro", s: CSHAPES_FROM, e: 19151231, k: "i", c: "montenegro" }),
  ];
}

/* ---------- Corrections drawn on top of the snapshots ---------- */

const snapshotEnd = (year) => {
  const next = SNAPSHOTS[SNAPSHOTS.indexOf(year) + 1];
  return next ? (next - 1) * 10000 + 1231 : CSHAPES_FROM - 1;
};

/** Rough hand-drawn outlines, [lon, lat], for states the snapshots leave out. */
const ROYAL_HUNGARY = [
  [16.9, 48.6], [17.2, 48.9], [18.0, 49.5], [19.0, 49.4], [19.8, 49.25], [20.9, 49.4],
  [22.0, 49.2], [22.6, 49.0], [22.2, 48.4], [21.6, 48.3], [20.8, 48.25], [19.9, 48.1],
  [19.1, 47.85], [18.7, 47.8], [18.1, 47.6], [17.6, 47.2], [17.2, 46.8], [16.9, 46.4],
  [16.6, 46.0], [16.0, 45.6], [15.6, 45.3], [15.0, 44.9], [14.6, 45.2], [15.2, 45.6],
  [15.7, 46.2], [16.1, 46.6], [16.4, 47.0], [16.5, 47.7], [16.9, 48.1], [16.9, 48.6],
];
const TRANSYLVANIA = [
  [22.0, 47.9], [23.5, 47.9], [24.8, 47.7], [25.3, 47.3], [25.9, 46.9], [26.2, 46.2],
  [25.6, 45.6], [24.6, 45.5], [23.4, 45.4], [22.4, 45.5], [21.9, 45.9], [21.6, 46.5],
  [21.7, 47.2], [21.9, 47.6], [22.0, 47.9],
];

function polygonFeature(ring, props) {
  return { type: "Feature", geometry: rewind({ type: "Polygon", coordinates: [ring] }), properties: props };
}

function snapshotFeatures(year) {
  return JSON.parse(readFileSync(`${hbDir}/world_${year}.geojson`, "utf8")).features;
}

/** The snapshot feature at a point (for borrowing or splitting shapes). */
function featureAt(year, name, point) {
  const f = snapshotFeatures(year).find(
    (x) =>
      x.geometry &&
      (!name || x.properties.NAME === name) &&
      geoContains({ type: "Feature", geometry: rewind(x.geometry) }, point),
  );
  return f && { ...f, geometry: rewind(f.geometry) };
}

/** One polygon of a multipolygon, picked by a point inside it. */
function pieceAt(geometry, point) {
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const hit = polys.find((p) => geoContains({ type: "Polygon", coordinates: p }, point));
  return hit ? { type: "Polygon", coordinates: hit } : null;
}

function corrections(units) {
  const out = [];
  const byYear = (year) => units.filter((u) => u.properties.s === year * 10000 + 101);

  // Iceland belonged to Norway, then Denmark-Norway, then Denmark; most
  // snapshots leave it blank. Borrow the 1880 outline.
  const iceland = featureAt(1880, null, [-19, 64.9]);
  for (const year of SNAPSHOTS.slice(0, -1)) {
    const list = byYear(year);
    if (list.some((u) => geoContains(u, [-19, 64.9]))) continue;
    const crown = list.find((u) => geoContains(u, [11.9, 55.5]))?.properties.n ?? "Denmark-Norway";
    out.push({
      type: "Feature",
      geometry: rewind(iceland.geometry),
      properties: { n: "Iceland", s: year * 10000 + 101, e: snapshotEnd(year), k: "v", o: crown, c: colourKey(crown) },
    });
  }

  // Naples was its own kingdom (an Aragonese branch line) until 1501–04,
  // but the 1492 and 1500 snapshots fold it into the Crown of Aragon.
  for (const year of [1492, 1500]) {
    const aragon = byYear(year).find((u) => u.properties.n === "Crown of Aragon");
    const piece = aragon && pieceAt(aragon.geometry, [15.5, 40.6]);
    if (!piece) continue;
    aragon.geometry = {
      type: "MultiPolygon",
      coordinates: (aragon.geometry.type === "Polygon" ? [aragon.geometry.coordinates] : aragon.geometry.coordinates).filter(
        (p) => p !== piece.coordinates,
      ),
    };
    out.push({
      type: "Feature",
      geometry: piece,
      properties: { n: "Kingdom of Naples", s: year * 10000 + 101, e: snapshotEnd(year), k: "i", c: "naples" },
    });
  }

  // Hungary after Mohács (1526): the snapshots paint all of it Ottoman.
  const oldHungary = featureAt(1492, "Imperial Hungary", [19.04, 47.5]);
  out.push({
    type: "Feature",
    geometry: rewind(oldHungary.geometry),
    properties: {
      n: "Kingdom of Hungary (contested)",
      s: 15300101,
      e: snapshotEnd(1530),
      k: "i",
      c: "hungary",
    },
  });
  for (const year of [1600, 1650]) {
    const s = year * 10000 + 101;
    const e = snapshotEnd(year);
    out.push(
      polygonFeature(ROYAL_HUNGARY, { n: "Royal Hungary", s, e, k: "v", o: "Habsburg Monarchy", c: "austria" }),
      polygonFeature(TRANSYLVANIA, {
        n: "Principality of Transylvania",
        s,
        e,
        k: "v",
        o: "Ottoman Empire",
        c: "transylvania",
      }),
    );
  }
  return out;
}

/* ---------- Put it together ---------- */

const features = [];
SNAPSHOTS.forEach((year, i) => features.push(...snapshotUnits(year, SNAPSHOTS[i + 1])));
features.push(...corrections(features));
features.push(...cshapesUnits(), ...patches());

// Crimea: CShapes gives it to Russia from March 2014. Shown as annexed.
for (const f of features) {
  const p = f.properties;
  if (p.n !== "Russia" || p.s < 20140318) continue;
  const piece = pieceAt(f.geometry, [34.1, 44.95]);
  if (!piece) continue;
  f.geometry = { type: "MultiPolygon", coordinates: f.geometry.coordinates.filter((c) => c !== piece.coordinates) };
  features.push({
    type: "Feature",
    geometry: piece,
    properties: { n: "Crimea", s: p.s, e: p.e, k: "x", o: "Russia (annexed 2014, not recognised)", c: "russia" },
  });
}

let topo = topology({ units: { type: "FeatureCollection", features } }, 1e5);
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.6));
topo = quantize(topo, 1e4);

const outFile = resolve(root, "src/learn/europe-history/borders.json");
writeFileSync(outFile, JSON.stringify(topo));
const names = new Set(features.map((f) => f.properties.n));
console.log(`${features.length} units, ${names.size} names, ${(JSON.stringify(topo).length / 1024).toFixed(0)} KB`);
