import type { Metadata } from "next";
import Link from "next/link";
import { CityGameBest } from "@/components/CityGameBest";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = { title: "Games" };

/** Decorative card art: a scatter of dim dots with one lit up. */
function DotArt() {
  const dim: [number, number][] = [
    [42, 38], [70, 52], [96, 30], [118, 64], [150, 44], [176, 78], [204, 36],
    [232, 58], [258, 88], [286, 48], [60, 96], [132, 104], [220, 110], [300, 100],
    [24, 70], [188, 126], [270, 130], [100, 132],
  ];
  return (
    <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {dim.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" fill="#3a4c62" />
      ))}
      <circle cx="176" cy="78" r="22" fill="#f6b73c" opacity="0.08" />
      <circle cx="176" cy="78" r="13" fill="#f6b73c" opacity="0.16" />
      <circle cx="176" cy="78" r="5.5" fill="#f6b73c" />
    </svg>
  );
}

export default function GamesPage() {
  return (
    <main className="page">
      <div className="page-head">
        <h1>Games</h1>
        <p>Replayable geography games. Pick a difficulty and beat your own best.</p>
      </div>

      <div className="card-grid">
        {GAMES.filter((game) => game.available).map((game) => (
          <Link key={game.slug} href={`/games/${game.slug}`} className="game-card">
            <div className="game-card__art">
              <DotArt />
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
                {game.slug === "name-the-city" ? <CityGameBest /> : <span />}
                <span className="play-pill">Play</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
