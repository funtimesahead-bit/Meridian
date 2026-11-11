import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Quizzes" };

export default function QuizzesPage() {
  return (
    <main className="page">
      <div className="page-head">
        <h1>Quizzes</h1>
        <p>Fixed sets to work through: capitals, flags, countries and more.</p>
      </div>

      <div className="empty">
        <h2>No quizzes yet</h2>
        <p>
          Quizzes will show up here once they are built. Until then, the Games
          tab has something to play.
        </p>
        <Link href="/games">Go to Games →</Link>
      </div>
    </main>
  );
}
