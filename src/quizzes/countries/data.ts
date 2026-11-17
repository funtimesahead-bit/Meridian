import type { SceneId } from "@/lib/geo/world";

/* "Name every country" quizzes. To add a continent: add a scene for it in
   src/lib/geo/world.ts, then a list here. */

export type QuizCountry = {
  name: string;
  /** Names of this country's shapes in the map outline file. */
  shapes: string[];
  /** Other accepted spellings. */
  aliases: string[];
  /** [lon, lat] of a ring marker, for countries too small to see. */
  marker?: [number, number];
};

export type CountryQuiz = {
  slug: string;
  title: string;
  blurb: string;
  region: string;
  scene: SceneId;
  countries: QuizCountry[];
  /** An optional harder version that adds more places, e.g. territories. */
  extra?: {
    label: string;
    baseLabel: string;
    places: QuizCountry[];
    /** A wider map for the bigger version, when the places reach further. */
    scene?: SceneId;
  };
};

type Options = { shapes?: string[]; aliases?: string[]; marker?: [number, number] };

function c(name: string, options: Options = {}): QuizCountry {
  return {
    name,
    shapes: options.shapes ?? [name],
    aliases: options.aliases ?? [],
    marker: options.marker,
  };
}

const EUROPE: QuizCountry[] = [
  c("Albania"),
  c("Andorra", { marker: [1.55, 42.55] }),
  c("Armenia"),
  c("Austria"),
  c("Azerbaijan"),
  c("Belarus"),
  c("Belgium"),
  c("Bosnia and Herzegovina", {
    shapes: ["Bosnia and Herz."],
    aliases: ["Bosnia", "Bosnia Herzegovina", "Bosnia & Herzegovina", "BiH"],
  }),
  c("Bulgaria"),
  c("Croatia"),
  c("Cyprus", { shapes: ["Cyprus", "N. Cyprus"] }),
  c("Czechia", { aliases: ["Czech Republic"] }),
  c("Denmark"),
  c("Estonia"),
  c("Finland"),
  c("France"),
  c("Georgia"),
  c("Germany"),
  c("Greece"),
  c("Hungary"),
  c("Iceland"),
  c("Ireland", { aliases: ["Republic of Ireland", "Eire"] }),
  c("Italy"),
  c("Kosovo"),
  c("Latvia"),
  c("Liechtenstein", { marker: [9.55, 47.16] }),
  c("Lithuania"),
  c("Luxembourg"),
  c("Malta", { marker: [14.4, 35.9] }),
  c("Moldova"),
  c("Monaco", { marker: [7.42, 43.74] }),
  c("Montenegro"),
  c("Netherlands", { aliases: ["The Netherlands", "Holland"] }),
  c("North Macedonia", { shapes: ["Macedonia"], aliases: ["Macedonia"] }),
  c("Norway"),
  c("Poland"),
  c("Portugal"),
  c("Romania"),
  c("Russia", { aliases: ["Russian Federation"] }),
  c("San Marino", { marker: [12.46, 43.94] }),
  c("Serbia"),
  c("Slovakia"),
  c("Slovenia"),
  c("Spain"),
  c("Sweden"),
  c("Switzerland"),
  c("Turkey", { aliases: ["Türkiye"] }),
  c("Ukraine"),
  c("United Kingdom", { aliases: ["UK", "Great Britain", "Britain"] }),
  c("Vatican City", {
    shapes: ["Vatican"],
    aliases: ["Vatican", "Holy See", "The Vatican"],
    marker: [12.45, 41.9],
  }),
];

const NORTH_AMERICA: QuizCountry[] = [
  c("Antigua and Barbuda", {
    shapes: ["Antigua and Barb."],
    aliases: ["Antigua", "Antigua Barbuda"],
    marker: [-61.8, 17.07],
  }),
  c("Bahamas", { aliases: ["The Bahamas"] }),
  c("Barbados", { marker: [-59.55, 13.17] }),
  c("Belize"),
  c("Canada"),
  c("Costa Rica"),
  c("Cuba"),
  c("Dominica", { marker: [-61.35, 15.42] }),
  c("Dominican Republic", {
    shapes: ["Dominican Rep."],
    aliases: ["Dominican Rep", "The Dominican Republic"],
  }),
  c("El Salvador"),
  c("Grenada", { marker: [-61.68, 12.12] }),
  c("Guatemala"),
  c("Haiti"),
  c("Honduras"),
  c("Jamaica"),
  c("Mexico"),
  c("Nicaragua"),
  c("Panama"),
  c("Saint Kitts and Nevis", {
    shapes: ["St. Kitts and Nevis"],
    aliases: ["Saint Kitts", "St Kitts Nevis"],
    marker: [-62.75, 17.33],
  }),
  c("Saint Lucia", { marker: [-60.98, 13.9] }),
  c("Saint Vincent and the Grenadines", {
    shapes: ["St. Vin. and Gren."],
    aliases: [
      "Saint Vincent",
      "St Vincent and Grenadines",
      "St Vincent Grenadines",
      "St Vincent the Grenadines",
    ],
    marker: [-61.2, 13.25],
  }),
  c("Trinidad and Tobago", {
    aliases: ["Trinidad", "Trinidad Tobago"],
    marker: [-61.25, 10.45],
  }),
  c("United States", {
    shapes: ["United States of America"],
    aliases: ["USA", "US", "United States of America", "America"],
  }),
];

/**
 * Dependent territories and overseas regions in North America.
 * `shapes: []` marks places with no outline of their own in the map file;
 * they are shown by their marker only.
 */
const NORTH_AMERICA_TERRITORIES: QuizCountry[] = [
  c("Anguilla", { marker: [-63.05, 18.22] }),
  c("Aruba", { marker: [-69.97, 12.52] }),
  c("Bermuda", { marker: [-64.75, 32.3] }),
  c("British Virgin Islands", {
    shapes: ["British Virgin Is."],
    aliases: ["BVI", "British Virgin Is"],
    marker: [-64.6, 18.45],
  }),
  c("Caribbean Netherlands", {
    shapes: [],
    aliases: ["Bonaire", "Bonaire Sint Eustatius and Saba", "BES Islands"],
    marker: [-68.27, 12.18],
  }),
  c("Cayman Islands", {
    shapes: ["Cayman Is."],
    aliases: ["Caymans", "Cayman Is", "Grand Cayman"],
    marker: [-81.25, 19.3],
  }),
  c("Curaçao", { marker: [-68.99, 12.17] }),
  c("Greenland"),
  c("Guadeloupe", { shapes: [], marker: [-61.55, 16.25] }),
  c("Martinique", { shapes: [], marker: [-61.0, 14.65] }),
  c("Montserrat", { marker: [-62.19, 16.74] }),
  c("Puerto Rico"),
  c("Saint Barthélemy", {
    shapes: ["St-Barthélemy"],
    aliases: ["St Barts", "Saint Barts", "St Barth", "Saint Barth"],
    marker: [-62.83, 17.9],
  }),
  c("Saint Martin", {
    shapes: ["St-Martin"],
    aliases: ["Saint Martin (French)", "French Saint Martin"],
    marker: [-63.06, 18.1],
  }),
  c("Saint Pierre and Miquelon", {
    shapes: ["St. Pierre and Miquelon"],
    aliases: ["St Pierre Miquelon", "Saint Pierre", "St Pierre et Miquelon"],
    marker: [-56.3, 46.9],
  }),
  c("Sint Maarten", {
    aliases: ["Sint Maarten (Dutch)", "Dutch Sint Maarten", "St Maarten"],
    marker: [-63.06, 18.02],
  }),
  c("Turks and Caicos Islands", {
    shapes: ["Turks and Caicos Is."],
    aliases: ["Turks and Caicos", "Turks Caicos", "Turks and Caicos Is"],
    marker: [-71.8, 21.75],
  }),
  c("US Virgin Islands", {
    shapes: ["U.S. Virgin Is."],
    aliases: ["USVI", "United States Virgin Islands", "Virgin Islands", "US Virgin Is"],
    marker: [-64.8, 17.95],
  }),
];

const ASIA: QuizCountry[] = [
  c("Afghanistan"),
  c("Armenia"),
  c("Azerbaijan"),
  c("Bahrain", { marker: [50.55, 26.05] }),
  c("Bangladesh"),
  c("Bhutan"),
  c("Brunei", { marker: [114.7, 4.5] }),
  c("Cambodia"),
  c("China", { aliases: ["PRC", "Peoples Republic of China"] }),
  c("Cyprus", { shapes: ["Cyprus", "N. Cyprus"] }),
  c("Georgia"),
  c("India"),
  c("Indonesia"),
  c("Iran"),
  c("Iraq"),
  c("Israel"),
  c("Japan"),
  c("Jordan"),
  c("Kazakhstan"),
  c("Kuwait"),
  c("Kyrgyzstan"),
  c("Laos"),
  c("Lebanon"),
  c("Malaysia"),
  c("Maldives", { marker: [73.5, 3.2] }),
  c("Mongolia"),
  c("Myanmar", { aliases: ["Burma"] }),
  c("Nepal"),
  c("North Korea", { aliases: ["DPRK"] }),
  c("Oman"),
  c("Pakistan"),
  c("Palestine", { aliases: ["State of Palestine"], marker: [35.25, 31.95] }),
  c("Philippines", { aliases: ["The Philippines"] }),
  c("Qatar"),
  c("Russia", { aliases: ["Russian Federation"] }),
  c("Saudi Arabia"),
  c("Singapore", { marker: [103.82, 1.35] }),
  c("South Korea", { aliases: ["Republic of Korea", "ROK"] }),
  c("Sri Lanka"),
  c("Syria"),
  c("Taiwan"),
  c("Tajikistan"),
  c("Thailand"),
  c("Timor-Leste", { aliases: ["East Timor", "Timor Leste"] }),
  c("Turkey", { aliases: ["Türkiye"] }),
  c("Turkmenistan"),
  c("United Arab Emirates", { aliases: ["UAE", "Emirates"] }),
  c("Uzbekistan"),
  c("Vietnam"),
  c("Yemen"),
];

const AFRICA: QuizCountry[] = [
  c("Algeria"),
  c("Angola"),
  c("Benin"),
  c("Botswana"),
  c("Burkina Faso"),
  c("Burundi"),
  c("Cabo Verde", { aliases: ["Cape Verde"], marker: [-23.6, 15.1] }),
  c("Cameroon"),
  c("Central African Republic", { shapes: ["Central African Rep."], aliases: ["CAR"] }),
  c("Chad"),
  c("Comoros", { marker: [43.9, -11.9] }),
  c("DR Congo", {
    shapes: ["Dem. Rep. Congo"],
    aliases: [
      "DRC",
      "Democratic Republic of the Congo",
      "Democratic Republic of Congo",
      "Congo Kinshasa",
      "Zaire",
    ],
  }),
  c("Republic of the Congo", {
    shapes: ["Congo"],
    aliases: ["Congo", "Republic of Congo", "Congo Brazzaville", "Congo-Brazzaville"],
  }),
  c("Côte d'Ivoire", { aliases: ["Ivory Coast", "Cote d'Ivoire"] }),
  c("Djibouti"),
  c("Egypt"),
  c("Equatorial Guinea", { shapes: ["Eq. Guinea"] }),
  c("Eritrea"),
  c("Eswatini", { shapes: ["eSwatini"], aliases: ["Swaziland"] }),
  c("Ethiopia"),
  c("Gabon"),
  c("Gambia", { aliases: ["The Gambia"] }),
  c("Ghana"),
  c("Guinea"),
  c("Guinea-Bissau", { aliases: ["Guinea Bissau"] }),
  c("Kenya"),
  c("Lesotho"),
  c("Liberia"),
  c("Libya"),
  c("Madagascar"),
  c("Malawi"),
  c("Mali"),
  c("Mauritania"),
  c("Mauritius", { marker: [57.55, -20.25] }),
  c("Morocco"),
  c("Mozambique"),
  c("Namibia"),
  c("Niger"),
  c("Nigeria"),
  c("Rwanda"),
  c("São Tomé and Príncipe", {
    shapes: ["São Tomé and Principe"],
    aliases: ["Sao Tome and Principe", "Sao Tome"],
    marker: [6.7, 0.3],
  }),
  c("Senegal"),
  c("Seychelles", { marker: [55.5, -4.6] }),
  c("Sierra Leone"),
  c("Somalia", { shapes: ["Somalia", "Somaliland"] }),
  c("South Africa"),
  c("South Sudan", { shapes: ["S. Sudan"] }),
  c("Sudan"),
  c("Tanzania"),
  c("Togo"),
  c("Tunisia"),
  c("Uganda"),
  c("Zambia"),
  c("Zimbabwe"),
];

const SOUTH_AMERICA: QuizCountry[] = [
  c("Argentina"),
  c("Bolivia"),
  c("Brazil"),
  c("Chile"),
  c("Colombia"),
  c("Ecuador"),
  c("Guyana"),
  c("Paraguay"),
  c("Peru"),
  c("Suriname"),
  c("Uruguay"),
  c("Venezuela"),
];

/** Dependent territories in Oceania. */
const OCEANIA_TERRITORIES: QuizCountry[] = [
  c("American Samoa", { marker: [-170.7, -14.3] }),
  c("Cook Islands", { shapes: ["Cook Is."], aliases: ["Cooks"], marker: [-159.8, -21.2] }),
  c("French Polynesia", {
    shapes: ["Fr. Polynesia"],
    aliases: ["Tahiti"],
    marker: [-149.4, -17.65],
  }),
  c("Guam", { marker: [144.8, 13.45] }),
  c("New Caledonia"),
  c("Niue", { marker: [-169.87, -19.05] }),
  c("Norfolk Island", { aliases: ["Norfolk"], marker: [167.95, -29.03] }),
  c("Northern Mariana Islands", {
    shapes: ["N. Mariana Is."],
    aliases: ["Northern Marianas", "Mariana Islands", "Marianas", "Saipan"],
    marker: [145.75, 15.2],
  }),
  c("Pitcairn Islands", {
    shapes: ["Pitcairn Is."],
    aliases: ["Pitcairn"],
    marker: [-130.1, -25.07],
  }),
  c("Tokelau", { shapes: [], marker: [-171.8, -9.2] }),
  c("Wallis and Futuna", {
    shapes: ["Wallis and Futuna Is."],
    aliases: ["Wallis", "Wallis Futuna"],
    marker: [-176.2, -13.3],
  }),
];

const OCEANIA: QuizCountry[] = [
  c("Australia"),
  c("Fiji", { marker: [178, -17.8] }),
  c("Kiribati", { marker: [173, 1.4] }),
  c("Marshall Islands", {
    shapes: ["Marshall Is."],
    aliases: ["Marshall Is", "Marshalls"],
    marker: [171.2, 7.1],
  }),
  c("Micronesia", {
    aliases: ["Federated States of Micronesia", "FSM"],
    marker: [158.2, 6.9],
  }),
  c("Nauru", { marker: [166.93, -0.53] }),
  c("New Zealand", { aliases: ["NZ", "Aotearoa"] }),
  c("Palau", { marker: [134.5, 7.4] }),
  c("Papua New Guinea", { aliases: ["PNG"] }),
  c("Samoa", { marker: [-172.1, -13.75] }),
  c("Solomon Islands", {
    shapes: ["Solomon Is."],
    aliases: ["Solomons", "Solomon Is"],
    marker: [160, -9.5],
  }),
  c("Tonga", { marker: [-175.2, -21.15] }),
  c("Tuvalu", { shapes: [], marker: [179.2, -8.5] }),
  c("Vanuatu", { marker: [167.5, -16.5] }),
];

export const COUNTRY_QUIZZES: CountryQuiz[] = [
  {
    slug: "countries-of-europe",
    title: "Countries of Europe",
    blurb: "Name all 50. Each one lights up on the map as you type it.",
    region: "Europe",
    scene: "europe",
    countries: EUROPE,
  },
  {
    slug: "countries-of-north-america",
    title: "Countries of North America",
    blurb: "Name all 23, Central America and the Caribbean included.",
    region: "North America",
    scene: "north-america",
    countries: NORTH_AMERICA,
    extra: {
      baseLabel: "Countries",
      label: "Countries + territories",
      places: NORTH_AMERICA_TERRITORIES,
    },
  },
  {
    slug: "countries-of-asia",
    title: "Countries of Asia",
    blurb: "Name all 50, from Turkey to Japan.",
    region: "Asia",
    scene: "asia",
    countries: ASIA,
  },
  {
    slug: "countries-of-oceania",
    title: "Countries of Oceania",
    blurb: "Name all 14. Two are easy; the islands are not.",
    region: "Oceania",
    scene: "oceania",
    countries: OCEANIA,
    extra: {
      baseLabel: "Countries",
      label: "Countries + territories",
      places: OCEANIA_TERRITORIES,
      scene: "oceania-wide",
    },
  },
  {
    slug: "countries-of-africa",
    title: "Countries of Africa",
    blurb: "Name all 54, island nations included.",
    region: "Africa",
    scene: "africa",
    countries: AFRICA,
  },
  {
    slug: "countries-of-south-america",
    title: "Countries of South America",
    blurb: "Name all 12. A good warm-up.",
    region: "South America",
    scene: "south-america",
    countries: SOUTH_AMERICA,
  },
];

export function findQuiz(slug: string): CountryQuiz | undefined {
  return COUNTRY_QUIZZES.find((quiz) => quiz.slug === slug);
}
