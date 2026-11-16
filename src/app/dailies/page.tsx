import type { Metadata } from "next";
import Link from "next/link";
import { CardArt } from "@/components/CardArt";
import { ExpeditionStatus } from "@/components/ExpeditionStatus";

export const metadata: Metadata = { title: "Dailies" };

export default function DailiesPage() {
  return (
    <main className="page">
      <div className="page-head">
        <h1>Dailies</h1>
        <p>One fresh challenge a day, the same for everyone.</p>
      </div>

      <div className="card-grid">
        <Link href="/dailies/expedition" className="game-card">
          <div className="game-card__art">
            <CardArt kind="trail" />
          </div>
          <div className="game-card__body">
            <h2 className="game-card__title">Expedition</h2>
            <p className="game-card__blurb">
              Eight stops, one answer each. Anyone can name the obvious answer; the rarer
              yours is, the more it scores.
            </p>
            <div className="tag-row">
              <span className="tag">Daily</span>
              <span className="tag">Rarity</span>
              <span className="tag">Typing</span>
            </div>
            <div className="game-card__foot">
              <ExpeditionStatus />
              <span className="play-pill">Play</span>
            </div>
          </div>
        </Link>
      </div>
    </main>
  );
}
