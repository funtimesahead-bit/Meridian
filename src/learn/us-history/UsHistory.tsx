"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  geoAlbers,
  geoConicEqualArea,
  geoMercator,
  geoPath,
  type GeoPermissibleObjects,
  type GeoProjection,
} from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import landTopology from "world-atlas/land-50m.json";
import lakes from "@/lib/geo/lakes.json";
import { COUNTRY_SHAPES } from "@/lib/geo/world";
import {
  CHANGES,
  UNIT_TYPE_LABELS,
  unitsOn,
  UNITS,
  type Unit,
  type UnitType,
} from "./boundaries";
import { CIVIL_WAR_EVENTS, SECEDED, WAR_END, isSeceded } from "./civilwar";
import {
  GENERAL_EVENTS,
  HOLDINGS,
  INSETS,
  OCCUPATIONS,
  STATUS_LABELS,
  holdingStatus,
  type Holding,
  type InsetId,
  type OverseasStatus,
} from "./overseas";
import styles from "./UsHistory.module.css";

/* ---------- Dates ---------- */

const FIRST_YEAR = 1776;
const LAST_YEAR = Math.max(2026, new Date().getFullYear());
/** The boundary data begins with the Treaty of Paris. */
const FIRST_DATA_DATE = 17830903;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(d: number): string {
  const y = Math.floor(d / 10000);
  const m = Math.floor((d % 10000) / 100);
  const day = d % 100;
  return `${day} ${MONTHS[m - 1]} ${y}`;
}

/** The day after a YYYYMMDD date. */
function nextDay(d: number): number {
  const date = new Date(Date.UTC(Math.floor(d / 10000), Math.floor((d % 10000) / 100) - 1, d % 100));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

/** The map shows how things stood at the end of the chosen year. */
const dateFor = (year: number) => Math.max(year * 10000 + 1231, FIRST_DATA_DATE);

/* ---------- Events ---------- */

const ALL_HOLDINGS: Holding[] = [...HOLDINGS, ...OCCUPATIONS];

type Event = { d: number; title: string; text: string };

const EVENTS: Event[] = (() => {
  const list: Event[] = [
    ...CHANGES.map((c) => ({ d: c.d, title: c.n, text: c.text })),
    ...GENERAL_EVENTS.map((e) => ({ d: e.d, title: e.n, text: e.text })),
    ...CIVIL_WAR_EVENTS.map((e) => ({ d: e.d, title: e.n, text: e.text })),
  ];
  for (const h of ALL_HOLDINGS) {
    h.periods.forEach((p, i) => {
      if (p.note) list.push({ d: p.from, title: h.name, text: p.note });
      const next = h.periods[i + 1];
      if (p.to !== undefined && !(next && next.from === nextDay(p.to)) && h.endNote) {
        list.push({ d: nextDay(p.to), title: h.name, text: h.endNote });
      }
    });
  }
  return list.sort((a, b) => a.d - b.d || a.title.localeCompare(b.title));
})();

const EVENT_YEARS = [...new Set(EVENTS.map((e) => Math.floor(e.d / 10000)))].sort((a, b) => a - b);

/* ---------- Map geometry ---------- */

const landTopo = landTopology as unknown as Topology;
const LAND = feature(landTopo, landTopo.objects.land) as GeoPermissibleObjects;
const LAKES = lakes as unknown as GeoPermissibleObjects;

type Region = "main" | "alaska" | "hawaii" | InsetId;

/** Which panel a unit belongs in. */
function regionOf(unit: Unit): Region {
  if (unit.properties.id.startsWith("ak_")) return "alaska";
  if (unit.properties.id.startsWith("hi_")) return "hawaii";
  return "main";
}

const UNIT_REGION = new Map(UNITS.map((u) => [u, regionOf(u)]));

type Panel = {
  id: Region;
  label: string;
  width: number;
  height: number;
  projection: GeoProjection;
};

function corners([[w, s], [e, n]]: [[number, number], [number, number]]): GeoPermissibleObjects {
  return {
    type: "MultiPoint",
    coordinates: [
      [w, s],
      [e, s],
      [w, n],
      [e, n],
      [(w + e) / 2, s],
      [(w + e) / 2, n],
    ],
  };
}

function makePanel(
  id: Region,
  label: string,
  width: number,
  height: number,
  projection: GeoProjection,
  bounds: [[number, number], [number, number]],
): Panel {
  projection
    .fitExtent(
      [
        [8, 8],
        [width - 8, height - 8],
      ],
      corners(bounds),
    )
    .clipExtent([
      [0, 0],
      [width, height],
    ]);
  return { id, label, width, height, projection };
}

const PANELS: Record<Region, Panel> = {
  main: makePanel("main", "", 1000, 620, geoAlbers(), [[-124.8, 24.4], [-66.9, 49.4]]),
  alaska: makePanel(
    "alaska",
    "Alaska",
    420,
    300,
    geoConicEqualArea().parallels([55, 65]).rotate([154, 0]),
    [[-170, 51.5], [-130, 71.5]],
  ),
  hawaii: makePanel("hawaii", "Hawaii", 420, 300, geoMercator(), [[-160.6, 18.7], [-154.6, 22.4]]),
  "central-pacific": makePanel(
    "central-pacific",
    INSETS["central-pacific"].label,
    420,
    300,
    geoMercator(),
    INSETS["central-pacific"].bounds,
  ),
  caribbean: makePanel("caribbean", INSETS.caribbean.label, 420, 300, geoMercator(), INSETS.caribbean.bounds),
  mexico: makePanel("mexico", INSETS.mexico.label, 420, 300, geoMercator(), INSETS.mexico.bounds),
  europe: makePanel("europe", INSETS.europe.label, 420, 300, geoMercator(), INSETS.europe.bounds),
  "east-asia": makePanel("east-asia", INSETS["east-asia"].label, 420, 300, geoMercator(), INSETS["east-asia"].bounds),
  "western-pacific": makePanel(
    "western-pacific",
    INSETS["western-pacific"].label,
    420,
    300,
    geoMercator(),
    INSETS["western-pacific"].bounds,
  ),
};

const INSET_ORDER: Region[] = [
  "alaska",
  "hawaii",
  "caribbean",
  "mexico",
  "central-pacific",
  "western-pacific",
  "east-asia",
  "europe",
];

/** Claims drawn across US land (Deseret, 1849–51) are shown as an outline on top. */
const OUTLINE_ONLY = new Set(["ds_deseret"]);

/** Draw order: claims underneath, then territories, then states on top. */
const DRAW_ORDER: Record<UnitType, number> = { o: 0, u: 1, t: 2, s: 3, d: 4 };

/* Path strings are worked out once per panel and reused for every year. */
const pathCache = new Map<string, string>();
function pathFor(panel: Panel, key: string, geo: GeoPermissibleObjects): string {
  const cacheKey = `${panel.id}|${key}`;
  let d = pathCache.get(cacheKey);
  if (d === undefined) {
    d = geoPath(panel.projection).digits(1)(geo) ?? "";
    pathCache.set(cacheKey, d);
  }
  return d;
}

const TYPE_CLASS: Record<UnitType, string> = {
  s: styles.state,
  t: styles.territory,
  u: styles.unorganized,
  d: styles.district,
  o: styles.other,
};

const STATUS_CLASS: Record<OverseasStatus, string> = {
  territory: styles.territory,
  commonwealth: styles.commonwealth,
  trust: styles.trust,
  occupied: styles.occupied,
  leased: styles.leased,
  minor: styles.minor,
};

type Picked = { name: string; detail: string };

/* ---------- One map panel ---------- */

function MapPanel({
  panel,
  units,
  holdings,
  date,
  onPick,
  picked,
}: {
  panel: Panel;
  units: Unit[];
  holdings: Holding[];
  date: number;
  onPick: (p: Picked | null) => void;
  picked: string | null;
}) {
  const geo = geoPath(panel.projection);
  const base = useMemo(
    () => (
      <>
        <path d={pathFor(panel, "land", LAND)} className={styles.land} />
        <path d={pathFor(panel, "lakes", LAKES)} className={styles.lake} />
      </>
    ),
    [panel],
  );

  const pick = (name: string, detail: string) => () => onPick({ name, detail });

  return (
    <svg
      viewBox={`0 0 ${panel.width} ${panel.height}`}
      className={styles.svg}
      role="img"
      aria-label={panel.label || "Map of the United States"}
    >
      <rect width={panel.width} height={panel.height} className={styles.sea} />
      {base}

      {[...units]
        .filter((u) => !OUTLINE_ONLY.has(u.properties.id))
        .sort((a, b) => DRAW_ORDER[a.properties.t] - DRAW_ORDER[b.properties.t])
        .map((u, i) => {
          const p = u.properties;
          const seceded = isSeceded(p.id, date);
          const detail = seceded
            ? `Seceded and joined the Confederacy on ${formatDate(SECEDED[p.id].date)}`
            : `${UNIT_TYPE_LABELS[p.t]} · these borders from ${formatDate(p.s)}`;
          return (
            <path
              key={`${p.id}-${p.s}-${i}`}
              d={pathFor(panel, `${p.id}-${p.s}-${p.e}`, u)}
              className={`${styles.unit} ${seceded ? styles.other : TYPE_CLASS[p.t]} ${
                picked === p.n ? styles.picked : ""
              }`}
              onMouseEnter={pick(p.n, detail)}
              onClick={pick(p.n, detail)}
            />
          );
        })}

      {units
        .filter((u) => OUTLINE_ONLY.has(u.properties.id))
        .map((u, i) => {
          const p = u.properties;
          const detail = `Proposed state, never recognised · ${formatDate(p.s)} to ${formatDate(p.e)}`;
          return (
            <path
              key={`outline-${p.id}-${i}`}
              d={pathFor(panel, `${p.id}-${p.s}-${p.e}`, u)}
              className={`${styles.outlineClaim} ${picked === p.n ? styles.picked : ""}`}
              onMouseEnter={pick(p.n, detail)}
              onClick={pick(p.n, detail)}
            />
          );
        })}

      {holdings.map((h) => {
        const status = holdingStatus(h, date)!;
        const detail = h.occupation
          ? `Military occupation, not US territory · from ${formatDate(status.from)}`
          : `${STATUS_LABELS[status.status]} since ${formatDate(status.from)}`;
        const shapes = (h.shapes ?? [])
          .map((s) => COUNTRY_SHAPES.get(s))
          .filter((s): s is NonNullable<typeof s> => Boolean(s));
        const point = panel.projection(h.point);
        return (
          <g
            key={h.id}
            className={`${styles.holding} ${STATUS_CLASS[status.status]} ${
              picked === h.name ? styles.picked : ""
            }`}
            onMouseEnter={pick(h.name, detail)}
            onClick={pick(h.name, detail)}
          >
            {shapes.map((s, i) => (
              <path key={i} d={pathFor(panel, `${h.id}-${i}`, s)} className={styles.unit} />
            ))}
            {point && (
              <>
                <circle cx={point[0]} cy={point[1]} r={12} className={styles.hit} />
                <circle cx={point[0]} cy={point[1]} r={4.5} className={styles.dot} />
              </>
            )}
          </g>
        );
      })}

      {/* Short names on the bigger units, so the map can be read at a glance. */}
      {panel.id === "main" &&
        units.map((u, i) => {
          if (OUTLINE_ONLY.has(u.properties.id)) return null;
          const area = geo.area(u);
          if (area < 900) return null;
          const [x, y] = geo.centroid(u);
          if (!Number.isFinite(x)) return null;
          return (
            <text key={`l-${u.properties.id}-${i}`} x={x} y={y} className={styles.label}>
              {u.properties.a}
            </text>
          );
        })}
    </svg>
  );
}

/* ---------- The viewer ---------- */

export default function UsHistory() {
  const [year, setYear] = useState(FIRST_YEAR);
  const [playing, setPlaying] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);

  const date = dateFor(year);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setYear((y) => {
        if (y >= LAST_YEAR) {
          setPlaying(false);
          return y;
        }
        return y + 1;
      });
    }, 350);
    return () => window.clearInterval(id);
  }, [playing]);

  const units = useMemo(() => unitsOn(date), [date]);
  const held = useMemo(() => ALL_HOLDINGS.filter((h) => holdingStatus(h, date)), [date]);
  const events = useMemo(() => EVENTS.filter((e) => Math.floor(e.d / 10000) === year), [year]);

  const byRegion = useMemo(() => {
    const out = new Map<Region, { units: Unit[]; holdings: Holding[] }>();
    for (const id of ["main", ...INSET_ORDER] as Region[]) out.set(id, { units: [], holdings: [] });
    for (const u of units) out.get(UNIT_REGION.get(u)!)!.units.push(u);
    for (const h of held) out.get(h.inset)!.holdings.push(h);
    return out;
  }, [units, held]);

  const counts = useMemo(() => {
    const names = (t: UnitType[]) =>
      new Set(units.filter((u) => t.includes(u.properties.t)).map((u) => u.properties.n)).size;
    return {
      states: names(["s"]),
      territories: names(["t", "u"]),
      seceded: units.filter((u) => isSeceded(u.properties.id, date)).length,
      holdings: held.filter((h) => !h.occupation).length,
      occupations: held.filter((h) => h.occupation).length,
    };
  }, [units, held, date]);

  const nextChange = EVENT_YEARS.find((y) => y > year);
  const previousChange = [...EVENT_YEARS].reverse().find((y) => y < year);

  const step = (to: number) => {
    setPlaying(false);
    setYear(Math.min(LAST_YEAR, Math.max(FIRST_YEAR, to)));
  };

  /** Move by a number of years from wherever the year is now (safe for key repeat). */
  const nudge = useCallback((delta: number) => {
    setPlaying(false);
    setYear((y) => Math.min(LAST_YEAR, Math.max(FIRST_YEAR, y + delta)));
  }, []);

  // Left and right arrow keys step the year; holding a key keeps going.
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

  // Pressing and holding the ‹ › buttons repeats, like holding a key.
  const holdTimer = useRef<number | null>(null);
  const stopHold = useCallback(() => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      window.clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);
  const startHold = (delta: number) => (event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    stopHold();
    nudge(delta);
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = window.setInterval(() => nudge(delta), 90);
    }, 380);
  };
  useEffect(() => stopHold, [stopHold]);
  const holdProps = (delta: number) => ({
    onPointerDown: startHold(delta),
    onPointerUp: stopHold,
    onPointerLeave: stopHold,
    onPointerCancel: stopHold,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        nudge(delta);
      }
    },
  });

  return (
    <div className={styles.page}>
      <Link href="/learn" className={styles.back}>
        ← Learn
      </Link>
      <div className={styles.head}>
        <h1 className={styles.title}>The United States, Year by Year</h1>
        <p className={styles.lede}>
          Drag through time to watch states, territories and overseas holdings come and go.
          Hover or tap a shape to see what it was.
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.yearRow}>
          <button
            type="button"
            className={styles.iconButton}
            {...holdProps(-1)}
            aria-label="Previous year"
            title="Previous year (← key; hold to keep going)"
          >
            ‹
          </button>
          <output className={`mono ${styles.year}`} aria-live="polite">
            {year}
          </output>
          <button
            type="button"
            className={styles.iconButton}
            {...holdProps(1)}
            aria-label="Next year"
            title="Next year (→ key; hold to keep going)"
          >
            ›
          </button>
          <button
            type="button"
            className={styles.playButton}
            onClick={() => {
              if (!playing && year >= LAST_YEAR) setYear(FIRST_YEAR);
              setPlaying((p) => !p);
            }}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <div className={styles.jumps}>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => previousChange && step(previousChange)}
              disabled={!previousChange}
            >
              ← Previous change
            </button>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => nextChange && step(nextChange)}
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
          onChange={(e) => step(Number(e.target.value))}
          className={styles.slider}
          aria-label="Year"
        />
        <div className={styles.scale} aria-hidden="true">
          {[1800, 1850, 1900, 1950, 2000].map((y) => (
            <span key={y} style={{ left: `${((y - FIRST_YEAR) / (LAST_YEAR - FIRST_YEAR)) * 100}%` }}>
              {y}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.stats}>
        <span>
          <strong className="mono">{counts.states}</strong> {counts.states === 1 ? "state" : "states"}
          {counts.seceded > 0 && <> ({counts.seceded} seceded)</>}
        </span>
        <span>
          <strong className="mono">{counts.territories}</strong> mainland{" "}
          {counts.territories === 1 ? "territory" : "territories"}
        </span>
        <span>
          <strong className="mono">{counts.holdings}</strong> overseas{" "}
          {counts.holdings === 1 ? "holding" : "holdings"}
        </span>
        {counts.occupations > 0 && (
          <span>
            <strong className="mono">{counts.occupations}</strong>{" "}
            {counts.occupations === 1 ? "occupation" : "occupations"}
          </span>
        )}
        <span className={styles.pickedInfo} aria-live="polite">
          {picked ? (
            <>
              <strong>{picked.name}</strong> · {picked.detail}
            </>
          ) : (
            "Hover or tap a shape for details"
          )}
        </span>
      </div>

      {date >= SECEDED.sc_state.date && date <= WAR_END && (
        <p className={styles.note}>
          Civil War: states that declared secession are shown in the claimed or independent
          colour. The United States never recognised secession, so they are still counted as
          states.
        </p>
      )}

      {year < 1783 && (
        <p className={styles.note}>
          Before the Treaty of Paris in 1783 the new nation's borders were not settled. The map
          shows them as agreed in 1783.
        </p>
      )}

      <div className={styles.main} onMouseLeave={() => setPicked(null)}>
        <MapPanel
          panel={PANELS.main}
          units={byRegion.get("main")!.units}
          holdings={[]}
          date={date}
          onPick={setPicked}
          picked={picked?.name ?? null}
        />
      </div>

      <div className={styles.insets}>
        {INSET_ORDER.map((id) => {
          const content = byRegion.get(id)!;
          if (content.units.length === 0 && content.holdings.length === 0) return null;
          return (
            <figure key={id} className={styles.inset} onMouseLeave={() => setPicked(null)}>
              <MapPanel
                panel={PANELS[id]}
                units={content.units}
                holdings={content.holdings}
                date={date}
                onPick={setPicked}
                picked={picked?.name ?? null}
              />
              <figcaption>{PANELS[id].label}</figcaption>
            </figure>
          );
        })}
      </div>

      <ul className={styles.legend}>
        {(["s", "t", "u", "d", "o"] as UnitType[]).map((t) => (
          <li key={t}>
            <span className={`${styles.swatch} ${TYPE_CLASS[t]}`} />
            {UNIT_TYPE_LABELS[t]}
          </li>
        ))}
        {(["commonwealth", "trust", "occupied", "leased", "minor"] as OverseasStatus[]).map((s) => (
          <li key={s}>
            <span className={`${styles.swatch} ${STATUS_CLASS[s]}`} />
            {STATUS_LABELS[s]}
          </li>
        ))}
      </ul>

      <section className={styles.events} aria-live="polite">
        <h2>
          Changes in <span className="mono">{year}</span>
        </h2>
        {events.length === 0 ? (
          <p className={styles.muted}>
            No territorial changes this year.
            {nextChange && (
              <>
                {" "}
                <button type="button" className={styles.textButton} onClick={() => step(nextChange)}>
                  Jump to {nextChange} →
                </button>
              </>
            )}
          </p>
        ) : (
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
        )}
      </section>

      <p className={styles.credit}>
        State and territory boundaries 1783–2000: Newberry Library,{" "}
        <a href="https://digital.newberry.org/ahcb/" target="_blank" rel="noreferrer">
          Atlas of Historical County Boundaries
        </a>{" "}
        (CC BY-NC-SA 4.0), simplified. Overseas holdings compiled for this site.
      </p>
    </div>
  );
}
