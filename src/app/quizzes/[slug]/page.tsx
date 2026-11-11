import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LazyCountryQuiz } from "@/components/lazy";
import { COUNTRY_QUIZZES, findQuiz } from "@/quizzes/countries/data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return COUNTRY_QUIZZES.map((quiz) => ({ slug: quiz.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const quiz = findQuiz((await params).slug);
  return quiz ? { title: quiz.title, description: quiz.blurb } : {};
}

export default async function QuizPage({ params }: Props) {
  const { slug } = await params;
  if (!findQuiz(slug)) notFound();
  return (
    <main>
      <LazyCountryQuiz slug={slug} />
    </main>
  );
}
