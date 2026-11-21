import type { Metadata } from "next";
import Link from "next/link";
import { CardArt } from "@/components/CardArt";
import { ContinentArt } from "@/components/ContinentArt";

export const metadata: Metadata = { title: "Learn" };

export default function LearnPage() {
  return (
    <main className="page">
      <div className="page-head">
        <p className="page-head__eyebrow">Explore</p>
        <h1>Learn</h1>
        <p>Interactive maps, flashcards and explainers. No scores, just exploring.</p>
      </div>

      <div className="card-grid">
        <Link href="/learn/us-history" className="game-card">
          <div className="game-card__art">
            <CardArt kind="history" />
          </div>
          <div className="game-card__body">
            <h2 className="game-card__title">The United States, Year by Year</h2>
            <p className="game-card__blurb">
              Slide from 1776 to today and watch states, territories and overseas holdings
              appear, merge and split, with every change explained.
            </p>
            <div className="tag-row">
              <span className="tag">Interactive map</span>
              <span className="tag">History</span>
              <span className="tag">1776–today</span>
            </div>
            <div className="game-card__foot">
              <span className="card-best">Explore at your own pace</span>
              <span className="play-pill">Open</span>
            </div>
          </div>
        </Link>
        <Link href="/learn/europe-history" className="game-card">
          <div className="game-card__art">
            <ContinentArt scene="europe" borders />
          </div>
          <div className="game-card__body">
            <h2 className="game-card__title">Europe Through Time</h2>
            <p className="game-card__blurb">
              From 1492 to today: empires rise and split, borders move by treaty and by war.
              Key-year maps up to 1886, then every year, with each change explained.
            </p>
            <div className="tag-row">
              <span className="tag">Interactive map</span>
              <span className="tag">History</span>
              <span className="tag">1492–today</span>
            </div>
            <div className="game-card__foot">
              <span className="card-best">Explore at your own pace</span>
              <span className="play-pill">Open</span>
            </div>
          </div>
        </Link>
        <Link href="/learn/day-night" className="game-card">
          <div className="game-card__art">
            <CardArt kind="daynight" />
          </div>
          <div className="game-card__body">
            <h2 className="game-card__title">Day and Night</h2>
            <p className="game-card__blurb">
              Where is it day right now? Slide through the hours and the seasons to see the
              line between day and night move, and find out why the seasons happen.
            </p>
            <div className="tag-row">
              <span className="tag">Interactive map</span>
              <span className="tag">Earth and Sun</span>
              <span className="tag">Seasons</span>
            </div>
            <div className="game-card__foot">
              <span className="card-best">Explore at your own pace</span>
              <span className="play-pill">Open</span>
            </div>
          </div>
        </Link>
        <div className="soon-card">
          <strong>Flashcards and more maps</strong>
          <span>Coming soon.</span>
        </div>
      </div>
    </main>
  );
}
