import { COUNTRY_POOLS, type PinCountry } from "@/games/pin-drop/countries";

/* Every country (193 UN members plus Taiwan, Kosovo, Vatican City and
   Palestine), with the names players might type and a rough fame level. */

export type Fame = "famous" | "known" | "obscure";

export type WorldCountry = {
  name: string;
  /** Names of this country's shapes in the map outline file (empty if too small to have one). */
  shapes: string[];
  aliases: string[];
  fame: Fame;
  /** [lon, lat] to mark the country by, for those with no shape of their own. */
  point?: [number, number];
};

const ALIASES: Record<string, string[]> = {
  "United States": ["USA", "US", "United States of America", "America"],
  "United Kingdom": ["UK", "Great Britain", "Britain"],
  "United Arab Emirates": ["UAE", "Emirates"],
  "DR Congo": [
    "DRC",
    "Democratic Republic of the Congo",
    "Democratic Republic of Congo",
    "Congo Kinshasa",
  ],
  "Republic of the Congo": ["Congo", "Republic of Congo", "Congo Brazzaville"],
  "Côte d'Ivoire": ["Ivory Coast"],
  Czechia: ["Czech Republic"],
  Myanmar: ["Burma"],
  Eswatini: ["Swaziland"],
  "North Macedonia": ["Macedonia"],
  "Bosnia and Herzegovina": ["Bosnia", "Bosnia Herzegovina"],
  "Timor-Leste": ["East Timor"],
  Turkey: ["Türkiye"],
  "Central African Republic": ["CAR"],
  Netherlands: ["Holland", "The Netherlands"],
  Russia: ["Russian Federation"],
  "South Korea": ["Republic of Korea", "Korea"],
  "North Korea": ["DPRK"],
  Gambia: ["The Gambia"],
  Bahamas: ["The Bahamas"],
  Philippines: ["The Philippines"],
  "Cabo Verde": ["Cape Verde"],
  "Vatican City": ["Vatican", "Holy See"],
  "São Tomé and Príncipe": ["Sao Tome", "Sao Tome and Principe"],
  "Saint Kitts and Nevis": ["St Kitts and Nevis", "St Kitts", "Saint Kitts"],
  "Saint Lucia": ["St Lucia"],
  "Saint Vincent and the Grenadines": [
    "St Vincent and the Grenadines",
    "Saint Vincent",
    "St Vincent",
  ],
  "Antigua and Barbuda": ["Antigua"],
  Micronesia: ["Federated States of Micronesia", "FSM"],
  "Marshall Islands": ["Marshalls"],
  "Solomon Islands": ["Solomons"],
  "Trinidad and Tobago": ["Trinidad"],
  "Papua New Guinea": ["PNG"],
  "New Zealand": ["NZ"],
};

/** Countries missing from the Pin Drop lists, mostly microstates and small islands. */
const EXTRA: { name: string; shapes: string[]; point?: [number, number] }[] = [
  { name: "Andorra", shapes: ["Andorra"], point: [1.55, 42.55] },
  { name: "Antigua and Barbuda", shapes: ["Antigua and Barb."], point: [-61.8, 17.07] },
  { name: "Barbados", shapes: ["Barbados"], point: [-59.55, 13.17] },
  { name: "Dominica", shapes: ["Dominica"], point: [-61.35, 15.42] },
  { name: "Grenada", shapes: ["Grenada"], point: [-61.68, 12.12] },
  { name: "Kiribati", shapes: ["Kiribati"], point: [173, 1.4] },
  { name: "Liechtenstein", shapes: ["Liechtenstein"], point: [9.55, 47.16] },
  { name: "Maldives", shapes: ["Maldives"], point: [73.5, 3.2] },
  { name: "Marshall Islands", shapes: ["Marshall Is."], point: [171.2, 7.1] },
  { name: "Micronesia", shapes: ["Micronesia"], point: [158.2, 6.9] },
  { name: "Monaco", shapes: ["Monaco"], point: [7.42, 43.74] },
  { name: "Nauru", shapes: ["Nauru"], point: [166.93, -0.53] },
  { name: "Palau", shapes: ["Palau"], point: [134.5, 7.4] },
  { name: "Saint Kitts and Nevis", shapes: ["St. Kitts and Nevis"], point: [-62.75, 17.33] },
  { name: "Saint Lucia", shapes: ["Saint Lucia"], point: [-60.98, 13.9] },
  {
    name: "Saint Vincent and the Grenadines",
    shapes: ["St. Vin. and Gren."],
    point: [-61.2, 13.25],
  },
  { name: "Samoa", shapes: ["Samoa"], point: [-172.1, -13.75] },
  { name: "San Marino", shapes: ["San Marino"], point: [12.46, 43.94] },
  { name: "São Tomé and Príncipe", shapes: ["São Tomé and Principe"], point: [6.7, 0.3] },
  { name: "Seychelles", shapes: ["Seychelles"], point: [55.5, -4.6] },
  { name: "Tonga", shapes: ["Tonga"], point: [-175.2, -21.15] },
  { name: "Tuvalu", shapes: [], point: [179.2, -8.5] },
  { name: "Vatican City", shapes: ["Vatican"], point: [12.45, 41.9] },
  { name: "Palestine", shapes: ["Palestine"], point: [35.25, 31.95] },
];

const fromPool = (pool: PinCountry[], fame: Fame): WorldCountry[] =>
  pool.map((c) => ({ name: c.name, shapes: c.shapes, aliases: ALIASES[c.name] ?? [], fame }));

export const WORLD_COUNTRIES: WorldCountry[] = [
  ...fromPool(COUNTRY_POOLS.easy, "famous"),
  ...fromPool(COUNTRY_POOLS.medium, "known"),
  ...fromPool(COUNTRY_POOLS.hard, "obscure"),
  ...EXTRA.map((c) => ({ ...c, aliases: ALIASES[c.name] ?? [], fame: "obscure" as const })),
].sort((a, b) => a.name.localeCompare(b.name));

const BY_NAME = new Map(WORLD_COUNTRIES.map((c) => [c.name, c]));

/** Look a country up by its display name. Throws on a typo in the code. */
export function worldCountry(name: string): WorldCountry {
  const country = BY_NAME.get(name);
  if (!country) throw new Error(`Unknown country: ${name}`);
  return country;
}
