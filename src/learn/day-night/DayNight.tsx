"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { geoCircle, geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import countries110 from "world-atlas/countries-110m.json";
import { CAPITALS } from "@/lib/geo/countryInfo";
import { TILT, dayLength, noonHeight, sunAt, sunElevation } from "./sun";
import styles from "./DayNight.module.css";

/* Day and Night: the world map with the night side shaded for any day of the
   year and any time of day, worked out from where the Sun is overhead. */

const W = 960;
const H = 500;
const DAY_MS = 86_400_000;

const projection = geoNaturalEarth1().fitExtent(
  [
    [6, 6],
    [W - 6, H - 6],
  ],
  { type: "Sphere" },
);
const path = geoPath(projection);

const landTopo = land110 as unknown as Topology;
const countryTopo = countries110 as unknown as Topology;
const LAND = path(feature(landTopo, landTopo.objects.land)) ?? "";
const BORDERS =
  path(
    mesh(
      countryTopo,
      countryTopo.objects.countries as GeometryCollection,
      (a, b) => a !== b,
    ),
  ) ?? "";
const SPHERE = path({ type: "Sphere" }) ?? "";
const GRATICULE = path(geoGraticule10()) ?? "";

function parallel(lat: number): string {
  const coordinates: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += 2) coordinates.push([lon, lat]);
  return path({ type: "LineString", coordinates }) ?? "";
}

const LINES = [
  { lat: 0, name: "Equator" },
  { lat: TILT, name: "Tropic of Cancer" },
  { lat: -TILT, name: "Tropic of Capricorn" },
  { lat: 90 - TILT, name: "Arctic Circle" },
  { lat: -(90 - TILT), name: "Antarctic Circle" },
].map((l) => ({ ...l, d: parallel(l.lat), y: projection([-178, l.lat])![1] }));

/** Night, then the three twilights: each band is where the Sun is a little lower. */
const BANDS = [90, 84, 78, 72];

const PRESETS = [
  { label: "March equinox", month: 2, day: 20 },
  { label: "June solstice", month: 5, day: 21 },
  { label: "September equinox", month: 8, day: 22 },
  { label: "December solstice", month: 11, day: 21 },
];

const pad = (n: number) => String(n).padStart(2, "0");
const hm = (hours: number) => {
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60) % 24}:${pad(total % 60)}`;
};
const span = (hours: number) => {
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)} h ${pad(total % 60)} min`;
};
const latText = (lat: number) => `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"}`;
const lonText = (lon: number) => `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? "E" : "W"}`;

type Place = { lon: number; lat: number; name?: string };

export default function DayNight() {
  const [year] = useState(() => new Date().getUTCFullYear());
  const [day, setDay] = useState(0); // days since 1 January
  const [minute, setMinute] = useState(0); // minutes since midnight UTC
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState<null | "day" | "year">(null);
  const [place, setPlace] = useState<Place | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const yearStart = Date.UTC(year, 0, 1);
  const daysInYear = Math.round((Date.UTC(year + 1, 0, 1) - yearStart) / DAY_MS);

  const setNow = () => {
    const now = Date.now();
    setDay(Math.floor((now - yearStart) / DAY_MS));
    const d = new Date(now);
    setMinute(d.getUTCHours() * 60 + d.getUTCMinutes());
  };

  useEffect(() => {
    setNow();
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      if (playing === "day") {
        // A whole day in about 12 seconds.
        setMinute((m) => (m + dt * 0.12) % 1440);
      } else {
        // A whole year in about 18 seconds.
        setDay((d) => (d + dt * 0.02) % daysInYear);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, daysInYear]);

  const date = new Date(yearStart + Math.floor(day) * DAY_MS + Math.floor(minute) * 60_000);
  const sun = sunAt(date);
  const anti: [number, number] = [sun.lon + 180, -sun.lat];

  const bands = useMemo(
    () => BANDS.map((r) => path(geoCircle().center(anti).radius(r)()) ?? ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anti[0].toFixed(2), anti[1].toFixed(2)],
  );
  const sunPoint = projection([sun.lon, sun.lat]);

  const capitals = CAPITALS.map((c) => ({
    ...c,
    up: sunElevation(sun, c.lon, c.lat) > -0.833,
    xy: projection([c.lon, c.lat]),
  }));
  const lit = capitals.filter((c) => c.up).length;

  const northDay = dayLength(89.9, sun.lat);
  const pick = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(svg.getScreenCTM()!.inverse());
    const lonLat = projection.invert?.([local.x, local.y]);
    if (!lonLat || !Number.isFinite(lonLat[0])) return;
    // Snap to a capital when the click is right on one.
    const near = capitals.find((c) => c.xy && Math.hypot(c.xy[0] - local.x, c.xy[1] - local.y) < 7);
    setPlace(near ? { lon: near.lon, lat: near.lat, name: `${near.capital}, ${near.country.name}` } : { lon: lonLat[0], lat: lonLat[1] });
  };

  const placeInfo = place && (() => {
    const elevation = sunElevation(sun, place.lon, place.lat);
    const length = dayLength(place.lat, sun.lat);
    const solar = (((place.lon - sun.lon) / 15 + 12) % 24 + 24) % 24;
    const noon = noonHeight(place.lat, sun.lat);
    return { elevation, length, solar, noon };
  })();

  const dateLabel = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
  const placeXY = place && projection([place.lon, place.lat]);

  return (
    <div className={styles.page}>
      <Link href="/learn" className={styles.back}>
        ← Learn
      </Link>
      <div>
        <h1 className={styles.title}>Day and Night</h1>
        <p className={styles.lede}>
          Where on Earth is it day right now? Slide through the hours and the seasons and watch
          the line between day and night sweep round the world and tilt with the year.
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.row}>
          <span className={`mono ${styles.big}`}>{dateLabel}</span>
          <span className={`mono ${styles.big}`}>
            {pad(date.getUTCHours())}:{pad(date.getUTCMinutes())} <small>UTC</small>
          </span>
          <button type="button" className={styles.button} onClick={() => { setPlaying(null); setNow(); }}>
            Now
          </button>
          <button
            type="button"
            className={`${styles.button} ${playing === "day" ? styles.on : ""}`}
            onClick={() => setPlaying(playing === "day" ? null : "day")}
          >
            {playing === "day" ? "Pause" : "Play a day"}
          </button>
          <button
            type="button"
            className={`${styles.button} ${playing === "year" ? styles.on : ""}`}
            onClick={() => setPlaying(playing === "year" ? null : "year")}
          >
            {playing === "year" ? "Pause" : "Play a year"}
          </button>
        </div>
        <label className={styles.slider}>
          <span>Time of day</span>
          <input
            type="range"
            min={0}
            max={1439}
            value={Math.floor(minute)}
            onChange={(e) => {
              setPlaying(null);
              setMinute(Number(e.target.value));
            }}
            aria-label="Time of day, UTC"
          />
        </label>
        <label className={styles.slider}>
          <span>Day of year</span>
          <input
            type="range"
            min={0}
            max={daysInYear - 1}
            value={Math.floor(day)}
            onChange={(e) => {
              setPlaying(null);
              setDay(Number(e.target.value));
            }}
            aria-label="Day of the year"
          />
        </label>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={styles.chip}
              onClick={() => {
                setPlaying(null);
                setDay(Math.round((Date.UTC(year, p.month, p.day) - yearStart) / DAY_MS));
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.mapFrame}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className={styles.svg}
          onClick={pick}
          role="img"
          aria-label={`World map showing day and night on ${dateLabel} at ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`}
        >
          <path d={SPHERE} className={styles.sea} />
          <path d={GRATICULE} className={styles.graticule} />
          <path d={LAND} className={styles.land} />
          <path d={BORDERS} className={styles.borders} />
          {LINES.map((l) => (
            <g key={l.name}>
              <path d={l.d} className={l.lat === 0 ? styles.equator : styles.circle} />
              <text x={W / 2} y={l.y - 4} className={styles.lineLabel} textAnchor="middle">
                {l.name}
              </text>
            </g>
          ))}
          {ready && bands.map((d, i) => <path key={i} d={d} className={styles.night} />)}
          {ready &&
            capitals.map(
              (c) =>
                c.xy && (
                  <circle
                    key={c.code}
                    cx={c.xy[0]}
                    cy={c.xy[1]}
                    r={2.2}
                    className={c.up ? styles.cityDay : styles.cityNight}
                  />
                ),
            )}
          {ready && sunPoint && (
            <g transform={`translate(${sunPoint[0]} ${sunPoint[1]})`} className={styles.sun}>
              <circle r={16} className={styles.sunGlow} />
              <circle r={7} className={styles.sunDisc} />
            </g>
          )}
          {placeXY && (
            <g transform={`translate(${placeXY[0]} ${placeXY[1]})`}>
              <circle r={6} className={styles.place} />
            </g>
          )}
        </svg>
      </div>

      <div className={styles.facts}>
        <div className={styles.fact}>
          <span className={styles.factLabel}>Sun overhead at</span>
          <span className="mono">
            {latText(sun.lat)}, {lonText(sun.lon)}
          </span>
        </div>
        <div className={styles.fact}>
          <span className={styles.factLabel}>Capitals in daylight</span>
          <span className="mono">
            {lit} of {capitals.length}
          </span>
        </div>
        <div className={styles.fact}>
          <span className={styles.factLabel}>North Pole</span>
          <span>{northDay >= 24 ? "Sun up all day" : northDay <= 0 ? "Sun down all day" : "Sunrise and sunset"}</span>
        </div>
        <div className={styles.fact}>
          <span className={styles.factLabel}>South Pole</span>
          <span>
            {dayLength(-89.9, sun.lat) >= 24
              ? "Sun up all day"
              : dayLength(-89.9, sun.lat) <= 0
                ? "Sun down all day"
                : "Sunrise and sunset"}
          </span>
        </div>
      </div>

      <div className={styles.placeCard} aria-live="polite">
        {place && placeInfo ? (
          <>
            <h2>
              {place.name ?? `${latText(place.lat)}, ${lonText(place.lon)}`}
              <button type="button" className={styles.clear} onClick={() => setPlace(null)} aria-label="Clear the picked place">
                ×
              </button>
            </h2>
            <dl>
              <div>
                <dt>Right now</dt>
                <dd>
                  {placeInfo.elevation > -0.833
                    ? `Day · Sun ${placeInfo.elevation.toFixed(0)}° up`
                    : placeInfo.elevation > -6
                      ? "Twilight"
                      : placeInfo.elevation > -18
                        ? "Dusk or dawn light"
                        : "Night"}
                </dd>
              </div>
              <div>
                <dt>Sun time</dt>
                <dd className="mono">{hm(placeInfo.solar)}</dd>
              </div>
              <div>
                <dt>Daylight on {dateLabel}</dt>
                <dd className="mono">
                  {placeInfo.length >= 24 ? "24 h (midnight sun)" : placeInfo.length <= 0 ? "None (polar night)" : span(placeInfo.length)}
                </dd>
              </div>
              <div>
                <dt>Sun at midday</dt>
                <dd className="mono">{placeInfo.noon > 0 ? `${placeInfo.noon.toFixed(0)}° high` : "below the horizon"}</dd>
              </div>
            </dl>
            <p className={styles.small}>
              Sun time is the time by the Sun, where 12:00 is when it is highest. Clock time can
              differ by an hour or more, because time zones are set by countries.
            </p>
          </>
        ) : (
          <p className={styles.small}>
            Click anywhere on the map, or on a capital’s dot, to see how long its day is and how
            high the Sun gets.
          </p>
        )}
      </div>

      <section className={styles.explain}>
        <article>
          <h2>Why the line curves</h2>
          <p>
            Half of the Earth always faces the Sun. On a flat map the edge of that half, called the
            terminator, bends into a wave. The wave is flat at the equinoxes, when the Sun is over
            the Equator and every place gets about 12 hours of daylight.
          </p>
        </article>
        <article>
          <h2>Why we have seasons</h2>
          <p>
            The Earth’s axis is tilted by about {TILT}°. In June the north leans towards the Sun:
            its days are long and the Sun climbs high, so it is summer there and winter in the
            south. In December it is the other way round. Distance from the Sun has very little to
            do with it.
          </p>
        </article>
        <article>
          <h2>Midnight sun and polar night</h2>
          <p>
            Beyond the Arctic and Antarctic Circles the tilt is enough for the Sun to stay up for a
            whole day around the summer solstice, or stay down around the winter one. At the poles
            each lasts about six months.
          </p>
        </article>
        <article>
          <h2>The tropics</h2>
          <p>
            The Sun is straight overhead somewhere between the Tropic of Cancer and the Tropic of
            Capricorn every day. It reaches the Tropic of Cancer at the June solstice and the Tropic
            of Capricorn in December. Watch the Sun’s dot as you play a year.
          </p>
        </article>
      </section>

      <p className={styles.small}>
        The shaded bands are night and the three twilights (civil, nautical and astronomical),
        each where the Sun is another 6° below the horizon. Positions use NOAA’s solar formulas
        and are accurate to within a few minutes.
      </p>
    </div>
  );
}
