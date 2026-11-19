import infoData from "./country-info.json";
import { WORLD_COUNTRIES, type WorldCountry } from "./countries";

/* Country facts from GeoNames (CC BY 4.0): ISO code, continent and capital.
   Built by scripts/build-country-info.mjs. */

export type ContinentCode = "AF" | "AS" | "EU" | "NA" | "SA" | "OC" | "AN";

type Info = { name: string; continent: ContinentCode; capital: string; lat?: number; lon?: number };
export const COUNTRY_INFO = infoData as Record<string, Info>;

/** Our country names where GeoNames words them differently. */
const NAME_TO_CODE: Record<string, string> = {
  Netherlands: "NL",
  "DR Congo": "CD",
  "Côte d'Ivoire": "CI",
  "Vatican City": "VA",
  Palestine: "PS",
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

const BY_NAME = new Map(Object.entries(COUNTRY_INFO).map(([code, v]) => [norm(v.name), code]));

export function codeOf(country: WorldCountry): string | undefined {
  return NAME_TO_CODE[country.name] ?? BY_NAME.get(norm(country.name));
}

/* ---------- Capitals ---------- */

/**
 * Capitals too small for the city list, plus corrections:
 * Equatorial Guinea's government sits in Malabo (GeoNames lists the planned
 * Ciudad de la Paz).
 */
const CAPITAL_FIXES: Record<string, { capital?: string; lat: number; lon: number }> = {
  BZ: { lat: 17.25, lon: -88.77 },
  FM: { lat: 6.92, lon: 158.16 },
  GD: { lat: 12.05, lon: -61.75 },
  GQ: { capital: "Malabo", lat: 3.75, lon: 8.78 },
  KN: { lat: 17.3, lon: -62.72 },
  LI: { lat: 47.14, lon: 9.52 },
  MN: { lat: 47.92, lon: 106.92 },
  MT: { lat: 35.9, lon: 14.51 },
  NR: { lat: -0.55, lon: 166.92 },
  PW: { capital: "Ngerulmud", lat: 7.5, lon: 134.62 },
  SM: { lat: 43.94, lon: 12.45 },
  TV: { lat: -8.52, lon: 179.2 },
  VA: { lat: 41.9, lon: 12.45 },
};

/** Left out of the capitals game: the capital itself is disputed. */
const NO_CAPITAL_QUESTION = new Set(["PS"]);

export type Capital = {
  country: WorldCountry;
  code: string;
  capital: string;
  lat: number;
  lon: number;
  continent: ContinentCode;
};

export const CAPITALS: Capital[] = WORLD_COUNTRIES.flatMap((country) => {
  const code = codeOf(country);
  if (!code || NO_CAPITAL_QUESTION.has(code)) return [];
  const info = COUNTRY_INFO[code];
  const fix = CAPITAL_FIXES[code];
  const lat = fix?.lat ?? info.lat;
  const lon = fix?.lon ?? info.lon;
  if (lat === undefined || lon === undefined || !info.capital) return [];
  return [
    {
      country,
      code,
      capital: fix?.capital ?? info.capital,
      lat,
      lon,
      continent: info.continent,
    },
  ];
});

/* ---------- Continents ---------- */

export const CONTINENTS: { code: Exclude<ContinentCode, "AN">; name: string }[] = [
  { code: "EU", name: "Europe" },
  { code: "AS", name: "Asia" },
  { code: "AF", name: "Africa" },
  { code: "NA", name: "North America" },
  { code: "SA", name: "South America" },
  { code: "OC", name: "Oceania" },
];

/** Countries that span two continents: their cities count for both. */
const ALSO_IN: Record<string, ContinentCode[]> = {
  RU: ["AS"],
  TR: ["EU"],
  KZ: ["EU"],
  GE: ["EU"],
  AZ: ["EU"],
  EG: ["AS"],
};

/** The continents a city counts for, from its country (and Hawaii for Oceania). */
export function continentsOf(countryCode: string, lon: number, lat: number): ContinentCode[] {
  const base = COUNTRY_INFO[countryCode]?.continent;
  if (!base) return [];
  const list: ContinentCode[] = [base, ...(ALSO_IN[countryCode] ?? [])];
  // Hawaii is in Oceania as well as the United States.
  if (countryCode === "US" && lon < -150 && lat < 30) list.push("OC");
  return list;
}
