"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { geoAzimuthalEqualArea, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import landTopology from "world-atlas/land-50m.json";
import lakes from "@/lib/geo/lakes.json";
import { SNAPSHOT_YEARS, YEARLY_FROM, unitsOn, type Unit, type UnitKind } from "./borders";
import { ERA_NOTES, EVENTS } from "./events";
import styles from "../us-history/UsHistory.module.css";
import own from "./EuropeHistory.module.css";

/* ---------- Time steps ---------- */

const LAST_YEAR = Math.max(2026, new Date().getFullYear());
const FIRST_YEAR = SNAPSHOT_YEARS[0];

/** Snapshot years, then every year from 1886. */
const STEPS: number[] = [
  ...SNAPSHOT_YEARS,
  ...Array.from({ length: LAST_YEAR - YEARLY_FROM + 1 }, (_, i) => YEARLY_FROM + i),
];

const isSnapshot = (year: number) => year < YEARLY_FROM;

/** The step a slider year lands on: the snapshot in force, or the year itself. */
function snap(year: number): number {
  let best = STEPS[0];
  for (const s of STEPS) if (s <= year) best = s;
  return best;
}

/** How things stood at the end of the chosen year. */
const dateFor = (year: number) => year * 10000 + 1231;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(d: number): string {
  const y = Math.floor(d / 10000);
  const m = Math.floor((d % 10000) / 100);
  const day = d % 100;
  if (m === 0) return String(y);
  if (day === 0) return `${MONTHS[m - 1]} ${y}`;
  return `${day} ${MONTHS[m - 1]} ${y}`;
}

/* ---------- Colours ---------- */

/** Fixed colours for the long-lived powers, so they read the same in every era. */
const FIXED: Record<string, string> = {
  france: "#3d7cc4",
  britain: "#c44f4f",
  spain: "#d9a338",
  russia: "#5e9e6e",
  ottoman: "#2f8f86",
  austria: "#d8d1bf",
  germany: "#6a7280",
  poland: "#c76fa0",
  sweden: "#5b86c9",
  denmark: "#b25d6a",
  portugal: "#3aa36a",
  hre: "#8e7a5a",
  italy: "#7dbb5a",
  venice: "#bf7a3a",
  papal: "#e0c86a",
  netherlands: "#e08a3c",
  hungary: "#9a6bbf",
  swiss: "#c0504d",
  naples: "#a8b84c",
  serbia: "#a06a8f",
  romania: "#d9c04a",
  bulgaria: "#5aa8a0",
  greece: "#6fa8dc",
  persia: "#8c7f4d",
  scotland: "#7a8fb8",
  ireland: "#6cbf7d",
  norway: "#6f9fd8",
  lithuania: "#c9a76a",
  eastgermany: "#8b6b6b",
  belgium: "#d6b656",
  aragon: "#e07b39",
};

const PALETTE = [
  "#7f9cbf", "#b88a5a", "#8fb36b", "#c27c9e", "#6bb3b0", "#b5a35a", "#9a86c4",
  "#c46e5a", "#5f9f8f", "#c9a0c0", "#8aa65a", "#d49a6a", "#6d8fc0", "#a47e9e",
];

function colourFor(key: string): string {
  if (FIXED[key]) return FIXED[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const KIND_TEXT: Record<UnitKind, (o?: string) => string> = {
  i: () => "Independent",
  v: (o) => (o ? `Under ${o}` : "Under another crown"),
  c: (o) => (o ? `Colony or protectorate of ${o}` : "Colony or protectorate"),
  x: (o) => (o ? `Occupied by ${o}` : "Occupied"),
};

/** Shorter names for labels on the map. */
function shortName(name: string): string {
  return name
    .replace(/^(Kingdom|Grand Duchy|Duchy|Republic|Principality|Tsardom|Electorate|Crown|Regency|Beylik) of (the )?/, "")
    .replace(/ \(.*\)$/, "")
    .replace(/^Polish–Lithuanian Commonwealth$/, "Poland–Lithuania")
    .replace(/^Old Swiss Confederacy$/, "Swiss Confederacy")
    .replace(/^Kingdom of Serbs, Croats and Slovenes$/, "Kingdom SHS");
}

/* ---------- Map ---------- */

const WIDTH = 1000;
const HEIGHT = 800;

const projection = geoAzimuthalEqualArea()
  .rotate([-14, -52])
  .fitExtent(
    [
      [10, 10],
      [WIDTH - 10, HEIGHT - 10],
    ],
    {
      type: "MultiPoint",
      coordinates: [
        [-24, 64],
        [-10, 36],
        [-6, 31],
        [36, 32],
        [45, 37],
        [50, 44],
        [52, 60],
        [30, 71],
        [8, 64],
      ],
    },
  )
  .clipExtent([
    [0, 0],
    [WIDTH, HEIGHT],
  ]);

const path = geoPath(projection).digits(1);
const landTopo = landTopology as unknown as Topology;
const LAND_PATH = path(feature(landTopo, landTopo.objects.land) as GeoPermissibleObjects) ?? "";
const LAKES_PATH = path(lakes as unknown as GeoPermissibleObjects) ?? "";

const pathCache = new WeakMap<Unit, string>();
function unitPath(u: Unit): string {
  let d = pathCache.get(u);
  if (d === undefined) {
    d = path(u) ?? "";
    pathCache.set(u, d);
  }
  return d;
}

type Picked = { name: string; detail: string };

const MAX_ZOOM = 8;

function EuropeMap({
  units,
  snapshot,
  onPick,
  picked,
}: {
  units: Unit[];
  snapshot: number | null;
  onPick: (p: Picked | null) => void;
  picked: string | null;
}) {
  // Pan and zoom by changing the viewBox.
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);

  const clampView = (x: number, y: number, k: number) => {
    const kk = Math.min(MAX_ZOOM, Math.max(1, k));
    const w = WIDTH / kk;
    const h = HEIGHT / kk;
    return {
      k: kk,
      x: Math.min(WIDTH - w, Math.max(0, x)),
      y: Math.min(HEIGHT - h, Math.max(0, y)),
    };
  };

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(1, v.k * factor));
      const w0 = WIDTH / v.k;
      const h0 = HEIGHT / v.k;
      const w1 = WIDTH / k;
      const h1 = HEIGHT / k;
      // Keep the point under (cx, cy) in place.
      const px = v.x + cx * w0;
      const py = v.y + cy * h0;
      return clampView(px - cx * w1, py - cy * h1, k);
    });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomAt(
        event.deltaY < 0 ? 1.25 : 0.8,
        (event.clientX - rect.left) / rect.width,
        (event.clientY - rect.top) / rect.height,
      );
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const labelled = useMemo(() => {
    // One label per name, on its biggest piece, when that piece is big enough to hold it.
    const best = new Map<string, { area: number; x: number; y: number }>();
    for (const u of units) {
      // Place the label on the unit's largest piece, not the middle of all of them
      // (Denmark's centre with Greenland and Iceland would be in the Atlantic).
      const g = u.geometry;
      const pieces: GeoPermissibleObjects[] =
        g.type === "MultiPolygon"
          ? g.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }) as GeoPermissibleObjects)
          : [g];
      let biggest = pieces[0];
      let area = -1;
      for (const piece of pieces) {
        const a = path.area(piece);
        if (a > area) {
          area = a;
          biggest = piece;
        }
      }
      const [x, y] = path.centroid(biggest);
      if (!Number.isFinite(x)) continue;
      const cur = best.get(u.properties.n);
      if (!cur || area > cur.area) best.set(u.properties.n, { area, x, y });
    }
    return [...best.entries()].map(([name, b]) => ({ name, ...b }));
  }, [units]);

  const pick = (u: Unit) => () => {
    if (drag.current?.moved) return;
    const p = u.properties;
    const since = snapshot ? `as on the ${snapshot} map` : `these borders from ${formatDate(p.s)}`;
    onPick({ name: p.n, detail: `${KIND_TEXT[p.k](p.o)} · ${since}` });
  };

  const fontScale = 1 / Math.sqrt(view.k);

  return (
    <div className={own.mapWrap}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${WIDTH / view.k} ${HEIGHT / view.k}`}
        className={`${styles.svg} ${own.svg}`}
        role="img"
        aria-label="Map of Europe's political borders"
        // Only hold on to drags once zoomed in, so the page still scrolls on phones.
        style={{ touchAction: view.k > 1 ? "none" : "pan-y" }}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          if (view.k <= 1) return;
          drag.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y, moved: false };
        }}
        onPointerMove={(event) => {
          const d = drag.current;
          if (!d || !svgRef.current) return;
          const rect = svgRef.current.getBoundingClientRect();
          const dx = ((event.clientX - d.x) / rect.width) * (WIDTH / view.k);
          const dy = ((event.clientY - d.y) / rect.height) * (HEIGHT / view.k);
          if (Math.abs(event.clientX - d.x) + Math.abs(event.clientY - d.y) > 4) {
            d.moved = true;
            svgRef.current.setPointerCapture?.(event.pointerId);
          }
          if (d.moved) setView((v) => clampView(d.vx - dx, d.vy - dy, v.k));
        }}
        onPointerUp={() => {
          window.setTimeout(() => (drag.current = null), 0);
        }}
      >
        <rect width={WIDTH} height={HEIGHT} className={styles.sea} />
        <path d={LAND_PATH} className={styles.land} />
        {units.map((u, i) => {
          const p = u.properties;
          const colour = colourFor(p.c);
          return (
            <path
              key={`${p.n}-${p.s}-${i}`}
              d={unitPath(u)}
              className={`${styles.unit} ${own.unit} ${own[`kind-${p.k}`]} ${picked === p.n ? styles.picked : ""}`}
              style={{ "--fill": colour } as React.CSSProperties}
              onMouseEnter={(e) => {
                if (e.buttons === 0) pick(u)();
              }}
              onClick={pick(u)}
            />
          );
        })}
        <path d={LAKES_PATH} className={styles.lake} />
        {labelled.map((l) => {
          const minArea = 1400 / (view.k * view.k);
          if (l.area < minArea) return null;
          return (
            <text
              key={l.name}
              x={l.x}
              y={l.y}
              className={styles.label}
              style={{ fontSize: `${11 * fontScale}px`, strokeWidth: `${2.5 * fontScale}px` }}
            >
              {shortName(l.name)}
            </text>
          );
        })}
      </svg>
      <div className={own.zoom}>
        <button type="button" onClick={() => zoomAt(1.5, 0.5, 0.5)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomAt(1 / 1.5, 0.5, 0.5)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={() => setView({ x: 0, y: 0, k: 1 })} aria-label="Reset view">
          ⟲
        </button>
      </div>
    </div>
  );
}

/* ---------- The viewer ---------- */

export default function EuropeHistory() {
  // A link can open on a year: /learn/europe-history?year=1815
  const [year, setYear] = useState(() => {
    const asked = Number(new URLSearchParams(window.location.search).get("year"));
    return asked >= FIRST_YEAR && asked <= LAST_YEAR ? snap(asked) : FIRST_YEAR;
  });
  const [playing, setPlaying] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);

  const index = STEPS.indexOf(year);
  const snapshot = isSnapshot(year) ? year : null;
  const date = dateFor(year);

  const goTo = useCallback((i: number) => {
    setYear(STEPS[Math.min(STEPS.length - 1, Math.max(0, i))]);
  }, []);

  useEffect(() => {
    if (!playing) return;
    // Linger on the snapshot maps, which each cover decades.
    const delay = isSnapshot(year) ? 1600 : 380;
    const id = window.setTimeout(() => {
      const i = STEPS.indexOf(year);
      if (i >= STEPS.length - 1) setPlaying(false);
      else setYear(STEPS[i + 1]);
    }, delay);
    return () => window.clearTimeout(id);
  }, [playing, year]);

  const units = useMemo(() => unitsOn(date), [date]);

  const previous = index > 0 ? STEPS[index - 1] : null;
  /** Events since the previous step (a snapshot covers everything since the last map). */
  const events = useMemo(() => {
    const from = previous === null ? 0 : dateFor(previous);
    return EVENTS.filter((e) => e.d > from && e.d <= date).sort((a, b) => a.d - b.d);
  }, [previous, date]);

  const eventYears = useMemo(() => new Set(EVENTS.map((e) => snap(Math.floor(e.d / 10000)))), []);
  const nextChange = STEPS.slice(index + 1).find((y) => eventYears.has(y));
  const previousChange = [...STEPS.slice(0, index)].reverse().find((y) => eventYears.has(y));

  const nudge = useCallback(
    (delta: number) => {
      setPlaying(false);
      setYear((y) => STEPS[Math.min(STEPS.length - 1, Math.max(0, STEPS.indexOf(y) + delta))]);
    },
    [],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "TEXTAREA" ||
          (target.tagName === "INPUT" && (target as HTMLInputElement).type !== "range") ||
          target.isContentEditable);
      if (typing || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      nudge(event.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nudge]);

  const states = useMemo(
    () => new Set(units.filter((u) => u.properties.k === "i").map((u) => u.properties.n)).size,
    [units],
  );

  const scaleYears = [1500, 1600, 1700, 1800, 1900, 2000];
  const pct = (y: number) => ((y - FIRST_YEAR) / (LAST_YEAR - FIRST_YEAR)) * 100;

  return (
    <div className={styles.page}>
      <Link href="/learn" className={styles.back}>
        ← Learn
      </Link>
      <div>
        <h1 className={styles.title}>Europe Through Time</h1>
        <p className={styles.lede}>
          From the year Columbus sailed to today: empires rise and break apart, borders are
          redrawn by treaty and by war. Drag through time, and hover or tap a country to see
          what it was.
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.yearRow}>
          <button type="button" className={styles.iconButton} onClick={() => nudge(-1)} aria-label="Previous map">
            ‹
          </button>
          <output className={`mono ${styles.year}`} aria-live="polite">
            {year}
          </output>
          <button type="button" className={styles.iconButton} onClick={() => nudge(1)} aria-label="Next map">
            ›
          </button>
          <button
            type="button"
            className={styles.playButton}
            onClick={() => {
              if (!playing && index >= STEPS.length - 1) setYear(FIRST_YEAR);
              setPlaying((p) => !p);
            }}
          >
            {playing ? "Pause" : "Play"}
          </button>
          {snapshot && <span className={own.snapshotTag}>Key-year map</span>}
          <div className={styles.jumps}>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => previousChange && (setPlaying(false), setYear(previousChange))}
              disabled={!previousChange}
            >
              ← Previous change
            </button>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => nextChange && (setPlaying(false), setYear(nextChange))}
              disabled={!nextChange}
            >
              Next change →
            </button>
          </div>
        </div>
        <input
          type="range"
          min={FIRST_YEAR}
          max={LAST_YEAR}
          value={year}
          onChange={(e) => {
            setPlaying(false);
            setYear(snap(Number(e.target.value)));
          }}
          className={styles.slider}
          aria-label="Year"
        />
        <div className={styles.scale} aria-hidden="true">
          {scaleYears.map((y) => (
            <span key={y} style={{ left: `${pct(y)}%` }}>
              {y}
            </span>
          ))}
        </div>
        <div className={own.ticks} aria-hidden="true">
          {SNAPSHOT_YEARS.map((y) => (
            <span key={y} style={{ left: `${pct(y)}%` }} />
          ))}
          <span className={own.yearlyBand} style={{ left: `${pct(YEARLY_FROM)}%`, right: 0 }} />
        </div>
      </div>

      <div className={styles.stats}>
        <span>
          <strong className="mono">{states}</strong> independent {states === 1 ? "state" : "states"} shown
        </span>
        <span className={styles.pickedInfo} aria-live="polite">
          {picked ? (
            <>
              <strong>{picked.name}</strong> · {picked.detail}
            </>
          ) : (
            "Hover or tap a country for details · scroll or use + and − to zoom"
          )}
        </span>
      </div>

      {snapshot && (
        <p className={styles.note}>
          Before {YEARLY_FROM} the map shows key years only: this is Europe in {snapshot}, held until
          the next key year ({STEPS[index + 1]}). Borders in between are not drawn, and the
          historical maps behind these are approximate, especially for small states.
        </p>
      )}

      <div className={styles.main} onMouseLeave={() => setPicked(null)}>
        <EuropeMap units={units} snapshot={snapshot} onPick={setPicked} picked={picked?.name ?? null} />
      </div>

      <ul className={styles.legend}>
        <li>
          <span className={`${styles.swatch} ${own.swatchI}`} /> Independent state (each its own colour)
        </li>
        <li>
          <span className={`${styles.swatch} ${own.swatchV}`} /> Vassal, or ruled by another crown (in its overlord&apos;s colour)
        </li>
        <li>
          <span className={`${styles.swatch} ${own.swatchC}`} /> Colony or protectorate
        </li>
        <li>
          <span className={`${styles.swatch} ${own.swatchX}`} /> Military occupation
        </li>
      </ul>

      <section className={styles.events} aria-live="polite">
        <h2>
          {snapshot ? (
            <>
              Europe in <span className="mono">{year}</span>
            </>
          ) : (
            <>
              Changes in <span className="mono">{year}</span>
            </>
          )}
        </h2>
        {snapshot && ERA_NOTES[snapshot] && <p className={own.era}>{ERA_NOTES[snapshot]}</p>}
        {events.length > 0 ? (
          <>
            {(snapshot || (previous !== null && isSnapshot(previous))) && previous !== null && (
              <h3 className={own.since}>Since the {previous} map</h3>
            )}
            <ol>
              {events.map((e, i) => (
                <li key={i}>
                  <span className={styles.eventDate}>{formatDate(e.d)}</span>
                  <div>
                    <strong>{e.title}</strong>
                    <p>{e.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </>
        ) : (
          !snapshot && (
            <p className={styles.muted}>
              No major border changes this year.
              {nextChange && (
                <>
                  {" "}
                  <button type="button" className={styles.textButton} onClick={() => setYear(nextChange)}>
                    Jump to {nextChange} →
                  </button>
                </>
              )}
            </p>
          )
        )}
      </section>

      <p className={styles.credit}>
        Borders 1492–1885:{" "}
        <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noreferrer">
          historical-basemaps
        </a>{" "}
        by André Ourednik (GPL-3.0), with corrections. Borders 1886–today:{" "}
        <a href="https://icr.ethz.ch/data/cshapes/" target="_blank" rel="noreferrer">
          CShapes 2.0
        </a>{" "}
        (Schvitz et al., 2022; GPL), simplified. Notes written for this site.
      </p>
    </div>
  );
}
