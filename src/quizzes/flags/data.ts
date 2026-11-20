import { COUNTRY_QUIZZES } from "@/quizzes/countries/data";
import codes from "./codes.json";

/* "Click the flag" quizzes: one per continent, using the same places as the
   country quizzes (territories as an option where those have it), plus the
   US states.

   Country flags: flag-icons (MIT), in public/flags/world/<iso>.svg.
   State flags: Wikimedia Commons (public domain), in public/flags/us/<state>.png. */

export type Flag = { name: string; src: string };

export type FlagQuiz = {
  slug: string;
  title: string;
  blurb: string;
  region: string;
  flags: Flag[];
  extra?: { label: string; baseLabel: string; flags: Flag[] };
};

const CODES = codes as Record<string, string>;

const countryFlag = (name: string): Flag => ({ name, src: `/flags/world/${CODES[name]}.svg` });

/** Territories whose official flag is another country's (France's tricolour,
    the Dutch flag), so they could never be told apart. Left out here. */
const SHARED_FLAG = new Set([
  "Guadeloupe",
  "Saint Pierre and Miquelon",
  "Saint Barthélemy",
  "Saint Martin",
  "Wallis and Futuna",
  "Caribbean Netherlands",
]);

const flagsOf = (places: { name: string }[]) =>
  places.filter((p) => !SHARED_FLAG.has(p.name)).map((p) => countryFlag(p.name));

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas",
  "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
  "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

export const FLAG_QUIZZES: FlagQuiz[] = [
  ...COUNTRY_QUIZZES.map((quiz) => ({
    slug: quiz.slug.replace(/^countries-of-/, "flags-of-"),
    title: `Flags of ${quiz.region}`,
    blurb: `Find every flag of ${quiz.region} in the grid, one name at a time.`,
    region: quiz.region,
    flags: flagsOf(quiz.countries),
    extra: quiz.extra && {
      label: quiz.extra.label,
      baseLabel: quiz.extra.baseLabel,
      flags: flagsOf(quiz.extra.places),
    },
  })),
  {
    slug: "flags-of-us-states",
    title: "Flags of the US States",
    blurb: "All 50 state flags. Some are a lot harder to tell apart than others.",
    region: "the US",
    flags: US_STATES.map((name) => ({
      name,
      src: `/flags/us/${name.toLowerCase().replace(/ /g, "-")}.png`,
    })),
  },
];

export function findFlagQuiz(slug: string): FlagQuiz | undefined {
  return FLAG_QUIZZES.find((quiz) => quiz.slug === slug);
}
