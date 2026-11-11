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
  },
];

export function findQuiz(slug: string): CountryQuiz | undefined {
  return COUNTRY_QUIZZES.find((quiz) => quiz.slug === slug);
}
