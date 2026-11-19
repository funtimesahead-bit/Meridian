import Link from "next/link";
import { CardArt } from "@/components/CardArt";
import { ContinentArt } from "@/components/ContinentArt";
import { ExpeditionCard } from "@/components/ExpeditionCard";
import { LazyHeroGlobe } from "@/components/lazy";
import { YourProgress } from "@/components/home/YourProgress";
import { BROAD_PROMPTS } from "@/dailies/expedition/broad";
import { EXPEDITION_OPEN } from "@/dailies/expedition/config";
import { CITY_POOLS } from "@/games/name-the-city/cities";
import { GAMES } from "@/lib/games";
import { CITY_QUIZZES } from "@/quizzes/cities/data";
import { COUNTRY_QUIZZES } from "@/quizzes/countries/data";
import styles from "./home.module.css";

/* The landing page. Everything here is worked out at build time. */

const quizCount = COUNTRY_QUIZZES.length + CITY_QUIZZES.length + 1;
const answerCount =
  COUNTRY_QUIZZES.reduce((n, q) => n + q.countries.length + (q.extra?.places.length ?? 0), 0) +
  CITY_QUIZZES.reduce((n, q) => n + q.cities.length, 0) +
  BROAD_PROMPTS.reduce((n, p) => n + p.answers.length, 0) +
  Object.values(CITY_POOLS).reduce((n, pool) => n + pool.length, 0);
const roundedAnswers = Math.floor(answerCount / 100) * 100;

/** Continents in display order, with each one's country and city quiz. */
const CONTINENTS = ["Europe", "Asia", "Africa", "North America", "South America", "Oceania"].map(
  (region) => ({
    region,
    countries: COUNTRY_QUIZZES.find((q) => q.region === region),
    cities: CITY_QUIZZES.find((q) => q.region === region),
  }),
);

export default function Home() {
  return (
    <main className={styles.home}>
      {/* ---------------- Hero ---------------- */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              Free geography games, no sign-up
            </p>
            <h1 className={styles.headline}>
              Know the world <span className={styles.accent}>by heart.</span>
            </h1>
            <p className={styles.lede}>
              Name cities from a single dot on a blank map, connect countries border by border,
              race the clock through every continent, and watch the map of America redraw
              itself across 250 years.
            </p>
            <div className={styles.ctas}>
              <Link
                href={EXPEDITION_OPEN ? "/dailies/expedition" : "/quizzes/quick-fire"}
                className={styles.primary}
              >
                {EXPEDITION_OPEN ? "Play today's Expedition" : "Play Quick Fire"}
                <span aria-hidden="true">→</span>
              </Link>
              <Link href="/games" className={styles.secondary}>
                Browse games
              </Link>
            </div>
            <dl className={styles.facts}>
              <div>
                <dt>Games</dt>
                <dd className="mono">{GAMES.length}</dd>
              </div>
              <div>
                <dt>Quizzes</dt>
                <dd className="mono">{quizCount}</dd>
              </div>
              <div>
                <dt>Answers known</dt>
                <dd className="mono">{roundedAnswers.toLocaleString("en")}+</dd>
              </div>
            </dl>
          </div>
          <div className={styles.globeWrap}>
            <LazyHeroGlobe />
          </div>
        </div>
      </section>

      {/* ---------------- Today ---------------- */}
      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>Start here</p>
            <h2>Play today</h2>
          </div>
        </header>
        <div className={styles.todayGrid}>
          <ExpeditionCard />
          <Link href="/quizzes/quick-fire" className="game-card">
            <div className="game-card__art">
              <CardArt kind="quickfire" />
            </div>
            <div className="game-card__body">
              <h3 className="game-card__title">Quick Fire</h3>
              <p className="game-card__blurb">
                Ten fast questions with lots of right answers. A new set every time.
              </p>
              <div className="game-card__foot">
                <span className="card-best">15 seconds a question</span>
                <span className="play-pill">Play</span>
              </div>
            </div>
          </Link>
          <Link href="/games/name-the-city" className="game-card">
            <div className="game-card__art">
              <CardArt kind="dot" />
            </div>
            <div className="game-card__body">
              <h3 className="game-card__title">Name the City</h3>
              <p className="game-card__blurb">
                The classic: a dot lights up on a blank map. What city is it?
              </p>
              <div className="game-card__foot">
                <span className="card-best">Three difficulties</span>
                <span className="play-pill">Play</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ---------------- Games ---------------- */}
      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>Replayable</p>
            <h2>Games</h2>
          </div>
          <Link href="/games" className={styles.more}>
            All games →
          </Link>
        </header>
        <div className={styles.gameStrip}>
          {GAMES.map((game) => (
            <Link key={game.slug} href={`/games/${game.slug}`} className={styles.gameTile}>
              <div className={styles.gameTileArt}>
                <CardArt kind={game.art} />
              </div>
              <div className={styles.gameTileText}>
                <h3>{game.title}</h3>
                <p>{game.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- Quizzes ---------------- */}
      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>Against the stopwatch</p>
            <h2>Quizzes by continent</h2>
          </div>
          <Link href="/quizzes" className={styles.more}>
            All quizzes →
          </Link>
        </header>
        <div className={styles.continents}>
          {CONTINENTS.map(({ region, countries, cities }) => (
            <div key={region} className={styles.continent}>
              {countries && (
                <div className={styles.continentArt}>
                  <ContinentArt scene={countries.scene} borders />
                </div>
              )}
              <h3>{region}</h3>
              <div className={styles.continentLinks}>
                {countries && (
                  <Link href={`/quizzes/${countries.slug}`}>
                    <span>Countries</span>
                    <span className="mono">{countries.countries.length}</span>
                  </Link>
                )}
                {cities && (
                  <Link href={`/quizzes/${cities.slug}`}>
                    <span>Biggest cities</span>
                    <span className="mono">{cities.cities.length}</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Learn ---------------- */}
      <section className={styles.section}>
        <Link href="/learn/us-history" className={styles.learn}>
          <div className={styles.learnText}>
            <p className={styles.kicker}>Learn</p>
            <h2>The United States, year by year</h2>
            <p>
              Slide from 1776 to today and watch states form, territories split, a civil war
              tear the map in two, and an empire of islands come and go. Every change is
              explained.
            </p>
            <span className={styles.primary}>
              Open the map <span aria-hidden="true">→</span>
            </span>
          </div>
          <div className={styles.learnArt} aria-hidden="true">
            <CardArt kind="history" />
          </div>
        </Link>
      </section>

      <section className={styles.section}>
        <YourProgress />
      </section>
    </main>
  );
}
