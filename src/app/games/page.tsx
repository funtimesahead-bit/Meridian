import type { Metadata } from "next";
import Link from "next/link";
import { CardArt } from "@/components/CardArt";
import { CityGameBest } from "@/components/CityGameBest";
import { GameBest } from "@/components/GameBest";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: "Games" };

export default function GamesPage() {
  return (
    <main className="page">
      <div className="page-head">
        <p className="page-head__eyebrow">{GAMES.length} games</p>
        <h1>Games</h1>
        <p>
          Replayable geography games on blank maps. Pick a difficulty, play as often as you
          like, and beat your own best.
        </p>
      </div>

      <div className="card-grid">
        {GAMES.map((game) => (
          <Link key={game.slug} href={`/games/${game.slug}`} className="game-card">
            <div className="game-card__art">
              <CardArt kind={game.art} />
            </div>
            <div className="game-card__body">
              <h2 className="game-card__title">{game.title}</h2>
              <p className="game-card__blurb">{game.blurb}</p>
              <div className="tag-row">
                {game.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="game-card__foot">
                {game.scoreKey ? <GameBest scoreKey={game.scoreKey} /> : <CityGameBest />}
                <span className="play-pill">Play</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
