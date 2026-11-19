import type { Metadata } from "next";
import Link from "next/link";
import { CardArt } from "@/components/CardArt";

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
        <div className="soon-card">
          <strong>Flashcards and more maps</strong>
          <span>Coming soon.</span>
        </div>
      </div>
    </main>
  );
}
