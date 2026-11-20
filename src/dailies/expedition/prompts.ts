import { normalize } from "@/games/name-the-city/match";
import { SHAPE_NEIGHBOURS } from "@/lib/geo/world";
import { worldCountry, WORLD_COUNTRIES, type Fame, type WorldCountry } from "@/lib/geo/countries";
import type { CityData } from "@/games/rings/data";
import { BROAD_PROMPTS } from "./broad";
import { applyWeightOverrides } from "./weights";

/* The Expedition's prompts. Every prompt has a complete list of valid
   answers, each with a starting guess at how often players will pick it
   (its weight). Real player counts take over as they come in. */

export type Answer = {
  /** Stable id, stored with player counts. Lowercase letters and digits only. */
  id: string;
  name: string;
  /** Normalised spellings that count as this answer. */
  keys: string[];
  /** Spellings to forgive typos against, when not all of `keys` should be. */
  typoKeys?: string[];
  /** Relative chance a player picks this, before any real data. */
  weight: number;
  /** Where to mark this answer on the map. */
  country?: WorldCountry;
  point?: [number, number];
};

export type Prompt = {
  id: string;
  text: string;
  kind: "list" | "borders" | "letter" | "cities";
  /** Prompts in the same group (e.g. "rivers") never appear together. */
  group?: string;
  answers: Answer[];
};

const FAME_WEIGHT: Record<Fame, number> = { famous: 10, known: 4, obscure: 1 };

function countryAnswer(name: string, weight?: number): Answer {
  const country = worldCountry(name);
  return {
    id: normalize(country.name),
    name: country.name,
    keys: [country.name, ...country.aliases].map(normalize),
    weight: weight ?? FAME_WEIGHT[country.fame],
    country,
  };
}

/** A place that is not a country. `weight` sets how commonly it comes to mind. */
function place(name: string, weight: number, lon: number, lat: number, ...aliases: string[]): Answer {
  return {
    id: normalize(name),
    name,
    keys: [name, ...aliases].map(normalize),
    weight,
    point: [lon, lat],
  };
}

function countries(id: string, text: string, names: string[]): Prompt {
  return { id, text, kind: "list", answers: names.map((n) => countryAnswer(n)) };
}

/* ---------- Hand-written prompts ---------- */

const LIST_PROMPTS: Prompt[] = [
  countries("equator", "A country the equator passes through", [
    "Ecuador", "Colombia", "Brazil", "São Tomé and Príncipe", "Gabon",
    "Republic of the Congo", "DR Congo", "Uganda", "Kenya", "Somalia",
    "Maldives", "Indonesia", "Kiribati",
  ]),
  countries("landlocked-africa", "A landlocked country in Africa", [
    "Mali", "Niger", "Chad", "Burkina Faso", "Central African Republic",
    "South Sudan", "Ethiopia", "Uganda", "Rwanda", "Burundi", "Zambia",
    "Malawi", "Zimbabwe", "Botswana", "Lesotho", "Eswatini",
  ]),
  countries("landlocked-europe", "A landlocked country in Europe", [
    "Andorra", "Austria", "Belarus", "Czechia", "Hungary", "Kosovo",
    "Liechtenstein", "Luxembourg", "Moldova", "North Macedonia", "San Marino",
    "Serbia", "Slovakia", "Switzerland", "Vatican City",
  ]),
  countries("landlocked-asia", "A landlocked country in Asia", [
    "Afghanistan", "Armenia", "Azerbaijan", "Bhutan", "Kazakhstan", "Kyrgyzstan",
    "Laos", "Mongolia", "Nepal", "Tajikistan", "Turkmenistan", "Uzbekistan",
  ]),
  countries("south-america", "A country in South America", [
    "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Guyana",
    "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela",
  ]),
  countries("central-america", "A country in Central America", [
    "Belize", "Guatemala", "Honduras", "El Salvador", "Nicaragua", "Costa Rica", "Panama",
  ]),
  countries("stan", "A country whose name ends in -stan", [
    "Afghanistan", "Kazakhstan", "Kyrgyzstan", "Pakistan", "Tajikistan",
    "Turkmenistan", "Uzbekistan",
  ]),
  countries("mediterranean", "A country with a Mediterranean coast", [
    "Spain", "France", "Monaco", "Italy", "Malta", "Slovenia", "Croatia",
    "Bosnia and Herzegovina", "Montenegro", "Albania", "Greece", "Turkey",
    "Cyprus", "Syria", "Lebanon", "Israel", "Palestine", "Egypt", "Libya",
    "Tunisia", "Algeria", "Morocco",
  ]),
  countries("black-sea", "A country on the Black Sea", [
    "Turkey", "Bulgaria", "Romania", "Ukraine", "Russia", "Georgia",
  ]),
  countries("baltic-sea", "A country on the Baltic Sea", [
    "Sweden", "Finland", "Russia", "Estonia", "Latvia", "Lithuania", "Poland",
    "Germany", "Denmark",
  ]),
  countries("caspian-sea", "A country on the Caspian Sea", [
    "Russia", "Kazakhstan", "Turkmenistan", "Iran", "Azerbaijan",
  ]),
  countries("red-sea", "A country on the Red Sea", [
    "Egypt", "Sudan", "Eritrea", "Djibouti", "Saudi Arabia", "Yemen", "Israel", "Jordan",
  ]),
  countries("arabian-peninsula", "A country on the Arabian Peninsula", [
    "Saudi Arabia", "Yemen", "Oman", "United Arab Emirates", "Qatar", "Bahrain", "Kuwait",
  ]),
  countries("caribbean-islands", "An island country in the Caribbean", [
    "Cuba", "Jamaica", "Haiti", "Dominican Republic", "Bahamas", "Barbados",
    "Trinidad and Tobago", "Antigua and Barbuda", "Dominica", "Grenada",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  ]),
  countries("spanish", "A country where Spanish is an official language", [
    "Spain", "Mexico", "Guatemala", "Honduras", "El Salvador", "Nicaragua",
    "Costa Rica", "Panama", "Cuba", "Dominican Republic", "Colombia", "Venezuela",
    "Ecuador", "Peru", "Bolivia", "Chile", "Argentina", "Paraguay", "Uruguay",
    "Equatorial Guinea",
  ]),
  countries("portuguese", "A country where Portuguese is an official language", [
    "Portugal", "Brazil", "Angola", "Mozambique", "Cabo Verde", "Guinea-Bissau",
    "São Tomé and Príncipe", "Timor-Leste", "Equatorial Guinea",
  ]),
  countries("euro", "A country that uses the euro", [
    "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Estonia", "Finland",
    "France", "Germany", "Greece", "Ireland", "Italy", "Latvia", "Lithuania",
    "Luxembourg", "Malta", "Netherlands", "Portugal", "Slovakia", "Slovenia",
    "Spain", "Andorra", "Monaco", "San Marino", "Vatican City", "Montenegro", "Kosovo",
  ]),
  {
    id: "us-canada-border",
    text: "A US state that borders Canada",
    kind: "list",
    answers: [
      place("Alaska", 10, -150, 64),
      place("Washington", 8, -120.5, 47.4, "Washington State"),
      place("Idaho", 2, -114.6, 44.4),
      place("Montana", 5, -109.6, 47),
      place("North Dakota", 4, -100.5, 47.5),
      place("Minnesota", 5, -94.3, 46.3),
      place("Michigan", 7, -84.7, 44.3),
      place("Ohio", 1, -82.8, 40.3),
      place("Pennsylvania", 1, -77.6, 40.9),
      place("New York", 8, -75.5, 43),
      place("Vermont", 4, -72.7, 44),
      place("New Hampshire", 2, -71.6, 43.7),
      place("Maine", 7, -69.2, 45.4),
    ],
  },
  {
    id: "canada-provinces",
    text: "A Canadian province or territory",
    kind: "list",
    answers: [
      place("Ontario", 10, -85, 50),
      place("Quebec", 10, -72, 52, "Québec"),
      place("British Columbia", 9, -125, 54, "BC"),
      place("Alberta", 8, -114.5, 55),
      place("Saskatchewan", 4, -106, 54),
      place("Manitoba", 4, -97, 55),
      place("Nova Scotia", 4, -63.3, 45),
      place("New Brunswick", 2, -66.4, 46.5),
      place("Newfoundland and Labrador", 3, -60, 53.5, "Newfoundland", "Labrador"),
      place("Prince Edward Island", 2, -63.2, 46.4, "PEI"),
      place("Yukon", 4, -135.5, 63.5),
      place("Northwest Territories", 2, -119, 64.5, "NWT"),
      place("Nunavut", 3, -90, 68),
    ],
  },
  {
    id: "australia-states",
    text: "An Australian state or territory",
    kind: "list",
    answers: [
      place("New South Wales", 9, 146.5, -32.5, "NSW"),
      place("Victoria", 8, 144.5, -37),
      place("Queensland", 9, 144.5, -22.5),
      place("Western Australia", 6, 121.5, -25.5, "WA"),
      place("South Australia", 4, 135.5, -30),
      place("Tasmania", 6, 146.6, -42),
      place("Northern Territory", 4, 133.5, -19.5, "NT"),
      place("Australian Capital Territory", 2, 149.1, -35.5, "ACT"),
    ],
  },
  {
    id: "great-lakes",
    text: "One of the Great Lakes of North America",
    kind: "list",
    answers: [
      place("Lake Superior", 10, -87.5, 47.7, "Superior"),
      place("Lake Michigan", 9, -87, 44, "Michigan"),
      place("Lake Huron", 5, -82.4, 44.8, "Huron"),
      place("Lake Erie", 6, -81.2, 42.2, "Erie"),
      place("Lake Ontario", 5, -77.9, 43.6, "Ontario"),
    ],
  },
  {
    id: "gulf-of-mexico-states",
    text: "A US state with a coast on the Gulf of Mexico",
    kind: "list",
    answers: [
      place("Texas", 9, -99, 31),
      place("Louisiana", 7, -92, 31),
      place("Mississippi", 3, -89.7, 32.7),
      place("Alabama", 3, -86.8, 32.8),
      place("Florida", 10, -81.7, 28),
    ],
  },
];

/* ---------- Generated prompts ---------- */

/** Borders that only exist through a far-away overseas territory. */
const NOT_REALLY_NEIGHBOURS = new Set(["France|Brazil", "France|Suriname"]);

/** Land neighbours of every country, microstates included. */
function landNeighbours(): Map<string, string[]> {
  const byShape = new Map(
    WORLD_COUNTRIES.flatMap((c) => c.shapes.map((shape) => [shape, c.name] as const)),
  );
  const result = new Map<string, string[]>();
  for (const country of WORLD_COUNTRIES) {
    const found = new Set<string>();
    for (const shape of country.shapes) {
      for (const other of SHAPE_NEIGHBOURS.get(shape) ?? []) {
        const name = byShape.get(other);
        if (!name || name === country.name) continue;
        if (
          NOT_REALLY_NEIGHBOURS.has(`${country.name}|${name}`) ||
          NOT_REALLY_NEIGHBOURS.has(`${name}|${country.name}`)
        ) {
          continue;
        }
        found.add(name);
      }
    }
    result.set(country.name, [...found].sort());
  }
  return result;
}

/** "A country that borders X", for every country with at least four land neighbours. */
function borderPrompts(): Prompt[] {
  const prompts: Prompt[] = [];
  const neighbours = landNeighbours();
  for (const country of WORLD_COUNTRIES) {
    const names = neighbours.get(country.name) ?? [];
    if (names.length < 4) continue;
    prompts.push({
      id: `borders-${normalize(country.name)}`,
      text: `A country that borders ${country.name}`,
      kind: "borders",
      answers: names.map((n) => countryAnswer(n)),
    });
  }
  return prompts;
}

/** "A country starting with X", for letters with 6 to 20 countries. */
function letterPrompts(): Prompt[] {
  const byLetter = new Map<string, WorldCountry[]>();
  for (const country of WORLD_COUNTRIES) {
    const letter = normalize(country.name)[0].toUpperCase();
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), country]);
  }
  return [...byLetter]
    .filter(([, list]) => list.length >= 6 && list.length <= 20)
    .map(([letter, list]) => ({
      id: `letter-${letter.toLowerCase()}`,
      text: `A country whose name starts with ${letter}`,
      kind: "letter" as const,
      answers: list.map((c) => countryAnswer(c.name)),
    }));
}

const CITY_MIN_POPULATION = 1_000_000;

/**
 * How each city prompt names its country. Only these countries get a city
 * prompt, so a change in the city data cannot produce an oddly worded one.
 */
const CITY_COUNTRIES: Record<string, string> = {
  AU: "Australia",
  BD: "Bangladesh",
  BR: "Brazil",
  CA: "Canada",
  CD: "DR Congo",
  ID: "Indonesia",
  IQ: "Iraq",
  IR: "Iran",
  JP: "Japan",
  KR: "South Korea",
  MX: "Mexico",
  NG: "Nigeria",
  PH: "the Philippines",
  PK: "Pakistan",
  RU: "Russia",
  SA: "Saudi Arabia",
  TR: "Turkey",
  TW: "Taiwan",
  US: "the United States",
  VN: "Vietnam",
  ZA: "South Africa",
};

/** Places the city data lists separately that are really parts of a bigger city. */
const NOT_CITIES = new Set(
  [
    "Brooklyn", "Queens", "Manhattan", "The Bronx", "Staten Island", // New York City
    "Iztapalapa", "Gustavo Adolfo Madero", // Mexico City
    "Soweto", // Johannesburg
    "Sadr City", // Baghdad
    "Budta", "Malingao", // villages in the Philippines
  ].map(normalize),
);

/** "A city of over a million people in X", for countries with 5 to 30 of them. */
export function cityPrompts(data: CityData): Prompt[] {
  const byCountry = new Map<string, CityData["cities"]>();
  for (const city of data.cities) {
    if (city.population < CITY_MIN_POPULATION) break; // the data is sorted by size
    if (NOT_CITIES.has(normalize(city.name))) continue;
    byCountry.set(city.countryCode, [...(byCountry.get(city.countryCode) ?? []), city]);
  }
  const prompts: Prompt[] = [];
  for (const [code, list] of byCountry) {
    if (list.length < 5 || list.length > 30) continue;
    const countryName = CITY_COUNTRIES[code];
    if (!countryName) continue;
    const seen = new Set<string>();
    const answers: Answer[] = [];
    list.forEach((city, rank) => {
      const id = normalize(city.name);
      if (!id || seen.has(id)) return;
      seen.add(id);
      answers.push({
        id,
        name: city.name,
        keys: city.keys,
        // Forgive typos only on the main names, not obscure historic ones
        // (Calgary's "Calgaria" would otherwise accept "Bulgaria").
        typoKeys: city.keys.slice(0, 2),
        // The biggest cities come to mind first.
        weight: Math.max(1, 12 - rank * 1.5),
        point: [city.lon, city.lat],
      });
    });
    prompts.push({
      id: `cities-${code.toLowerCase()}`,
      text: `A city of over a million people in ${countryName}`,
      kind: "cities",
      answers,
    });
  }
  return prompts;
}

/* ---------- Picking today's eight ---------- */

export const STOPS = 8;

/** Expedition needs room for rare answers; smaller prompts stay in Quick Fire only. */
export const MIN_EXPEDITION_ANSWERS = 10;

/** How many prompts of each kind one day may use. */
const KIND_LIMITS: Record<Prompt["kind"], number> = {
  list: 8,
  borders: 2,
  letter: 1,
  cities: 2,
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

let staticPrompts: Prompt[] | null = null;

/** Every spelling of every answer in the bank, so a real name is never read as a typo of another. */
export const KNOWN_NAMES = new Set<string>();

export function allPrompts(data: CityData | null): Prompt[] {
  staticPrompts ??= applyWeightOverrides([
    ...LIST_PROMPTS,
    ...BROAD_PROMPTS,
    ...borderPrompts(),
    ...letterPrompts(),
  ]);
  const all = data ? [...staticPrompts, ...cityPrompts(data)] : staticPrompts;
  for (const prompt of all) for (const a of prompt.answers) for (const k of a.keys) KNOWN_NAMES.add(k);
  for (const c of WORLD_COUNTRIES) for (const k of [c.name, ...c.aliases]) KNOWN_NAMES.add(normalize(k));
  return all;
}

/**
 * The same eight prompts for everyone on a given day.
 * Each prompt gets its own random rank for the day, so adding or removing a
 * prompt in the bank only changes the days where that prompt ranks high.
 */
export function promptsForDay(day: string, data: CityData | null): Prompt[] {
  const rank = (prompt: Prompt) => hash(`meridian-expedition|${day}|${prompt.id}`);
  const pool = allPrompts(data)
    .filter((p) => p.answers.length >= MIN_EXPEDITION_ANSWERS)
    .sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
  const groups = new Set<string>();
  const used: Record<Prompt["kind"], number> = { list: 0, borders: 0, letter: 0, cities: 0 };
  const picked: Prompt[] = [];
  for (const prompt of pool) {
    if (used[prompt.kind] >= KIND_LIMITS[prompt.kind]) continue;
    if (prompt.group && groups.has(prompt.group)) continue;
    used[prompt.kind]++;
    if (prompt.group) groups.add(prompt.group);
    picked.push(prompt);
    if (picked.length === STOPS) break;
  }
  return picked;
}

/* ---------- Days ---------- */

/** Expedition #1: launch day. */
const FIRST_DAY = "2026-11-19";

/** Today's date in the player's own time zone, as YYYY-MM-DD. */
export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function expeditionNumber(day: string): number {
  const ms = Date.parse(`${day}T00:00:00Z`) - Date.parse(`${FIRST_DAY}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}
