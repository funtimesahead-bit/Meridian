import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LazyCityRankQuiz, LazyCountryQuiz, LazyFlagQuiz } from "@/components/lazy";
import { CITY_QUIZZES, findCityQuiz } from "@/quizzes/cities/data";
import { COUNTRY_QUIZZES, findQuiz } from "@/quizzes/countries/data";
import { FLAG_QUIZZES, findFlagQuiz } from "@/quizzes/flags/data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return [...COUNTRY_QUIZZES, ...CITY_QUIZZES, ...FLAG_QUIZZES].map((quiz) => ({ slug: quiz.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const quiz = findQuiz(slug) ?? findCityQuiz(slug) ?? findFlagQuiz(slug);
  return quiz ? { title: quiz.title, description: quiz.blurb } : {};
}

export default async function QuizPage({ params }: Props) {
  const { slug } = await params;
  if (findQuiz(slug)) {
    return (
      <main>
        <LazyCountryQuiz slug={slug} />
      </main>
    );
  }
  if (findCityQuiz(slug)) {
    return (
      <main>
        <LazyCityRankQuiz slug={slug} />
      </main>
    );
  }
  if (findFlagQuiz(slug)) {
    return (
      <main>
        <LazyFlagQuiz slug={slug} />
      </main>
    );
  }
  notFound();
}
