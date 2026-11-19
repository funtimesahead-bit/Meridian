import type { Metadata } from "next";
import Link from "next/link";
import { CardArt } from "@/components/CardArt";
import { ContinentArt } from "@/components/ContinentArt";
import { GameBest } from "@/components/GameBest";
import { CITY_QUIZZES } from "@/quizzes/cities/data";
import { COUNTRY_QUIZZES } from "@/quizzes/countries/data";

export const metadata: Metadata = { title: "Quizzes" };

export default function QuizzesPage() {
  return (
    <main className="page">
      <div className="page-head">
        <p className="page-head__eyebrow">
          {COUNTRY_QUIZZES.length + CITY_QUIZZES.length + 1} quizzes
        </p>
        <h1>Quizzes</h1>
        <p>
          Fixed sets to work through against the stopwatch. No countdown, just your time, and
          your best is saved.
        </p>
      </div>

      <div className="card-grid">
        <Link href="/quizzes/quick-fire" className="game-card">
          <div className="game-card__art">
            <CardArt kind="quickfire" />
          </div>
          <div className="game-card__body">
            <h2 className="game-card__title">Quick Fire</h2>
            <p className="game-card__blurb">
              Ten quick questions with lots of right answers. Type the first one that comes to
              mind.
            </p>
            <div className="tag-row">
              <span className="tag">Mixed</span>
              <span className="tag">15 s each</span>
              <span className="tag">Replayable</span>
            </div>
            <div className="game-card__foot">
              <GameBest scoreKey="quickfire" showSetup={false} />
              <span className="play-pill">Start</span>
            </div>
          </div>
        </Link>
      </div>

      <h2 className="section-title">Countries</h2>
      <p className="section-note">Name every country on a blank map with borders. Each one lights up as you type it.</p>
      <div className="card-grid">
        {COUNTRY_QUIZZES.map((quiz) => (
          <Link key={quiz.slug} href={`/quizzes/${quiz.slug}`} className="game-card">
            <div className="game-card__art">
              <ContinentArt scene={quiz.scene} borders />
            </div>
            <div className="game-card__body">
              <h2 className="game-card__title">{quiz.title}</h2>
              <p className="game-card__blurb">{quiz.blurb}</p>
              <div className="tag-row">
                <span className="tag">{quiz.region}</span>
                <span className="tag">{quiz.countries.length} answers</span>
                {quiz.extra && <span className="tag">+ territories option</span>}
              </div>
              <div className="game-card__foot">
                <GameBest scoreKey={`quiz-${quiz.slug}`} showSetup={false} />
                <span className="play-pill">Start</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="section-title">Cities</h2>
      <p className="section-note">Name the biggest metro areas from their populations. Turn the map off for the harder version.</p>
      <div className="card-grid">
        {CITY_QUIZZES.map((quiz) => (
          <Link key={quiz.slug} href={`/quizzes/${quiz.slug}`} className="game-card">
            <div className="game-card__art">
              <ContinentArt
                scene={quiz.scene}
                dots={quiz.cities.map((c) => [c.lon, c.lat] as [number, number])}
              />
            </div>
            <div className="game-card__body">
              <h2 className="game-card__title">{quiz.title}</h2>
              <p className="game-card__blurb">{quiz.blurb}</p>
              <div className="tag-row">
                <span className="tag">{quiz.region}</span>
                <span className="tag">Top {quiz.cities.length}</span>
                <span className="tag">Map optional</span>
              </div>
              <div className="game-card__foot">
                <GameBest scoreKey={`cities-${quiz.slug}`} />
                <span className="play-pill">Start</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
