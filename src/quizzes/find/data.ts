import type { SceneId } from "@/lib/geo/world";
import { COUNTRY_QUIZZES, type QuizCountry } from "@/quizzes/countries/data";

/* "Find the country" quizzes: a country is named and the player clicks it on
   a map with borders. Same places as the "name every country" quizzes. */

export type FindQuiz = {
  slug: string;
  title: string;
  blurb: string;
  region: string;
  scene: SceneId;
  countries: QuizCountry[];
};

export const FIND_QUIZZES: FindQuiz[] = COUNTRY_QUIZZES.map((quiz) => ({
  slug: quiz.slug.replace(/^countries-of-/, "find-in-"),
  title: `Find the Country: ${quiz.region}`,
  blurb: `All ${quiz.countries.length} countries of ${quiz.region}, one at a time. Click each one on the map.`,
  region: quiz.region,
  scene: quiz.scene,
  countries: quiz.countries,
}));

export function findFindQuiz(slug: string): FindQuiz | undefined {
  return FIND_QUIZZES.find((quiz) => quiz.slug === slug);
}
