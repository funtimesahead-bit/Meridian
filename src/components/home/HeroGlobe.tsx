"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import landTopology from "world-atlas/land-110m.json";
import styles from "./HeroGlobe.module.css";

/* A slowly turning globe for the home page. Drag to spin it. Cities pulse
   on the side facing you, and a route arcs between them, in the spirit of
   the games. Holds still for people who prefer reduced motion. */

const SIZE = 520;
const RADIUS = 236;
const TILT = -18;
const DEGREES_PER_SECOND = 5;

const topo = landTopology as unknown as Topology;
const LAND = feature(topo, topo.objects.land);
const GRATICULE = geoGraticule10();

const CITIES: { name: string; at: [number, number] }[] = [
  { name: "Tokyo", at: [139.69, 35.69] },
  { name: "Cairo", at: [31.24, 30.04] },
  { name: "London", at: [-0.13, 51.51] },
  { name: "New York", at: [-74.01, 40.71] },
  { name: "São Paulo", at: [-46.63, -23.55] },
  { name: "Lagos", at: [3.38, 6.52] },
  { name: "Mumbai", at: [72.88, 19.08] },
  { name: "Sydney", at: [151.21, -33.87] },
  { name: "Mexico City", at: [-99.13, 19.43] },
  { name: "Moscow", at: [37.62, 55.76] },
  { name: "Nairobi", at: [36.82, -1.29] },
  { name: "Lima", at: [-77.04, -12.05] },
  { name: "Jakarta", at: [106.85, -6.21] },
  { name: "Reykjavik", at: [-21.94, 64.15] },
];

/** Legs of a looping journey, drawn as great-circle arcs. */
const ROUTE: [number, number][] = [
  [3, 2],
  [2, 9],
  [9, 6],
  [6, 12],
  [12, 7],
  [4, 11],
  [11, 8],
  [8, 3],
  [1, 10],
  [5, 1],
];

function arc(a: [number, number], b: [number, number]) {
  const interpolate = geoInterpolate(a, b);
  const coordinates = Array.from({ length: 33 }, (_, i) => interpolate(i / 32));
  return { type: "LineString" as const, coordinates };
}

const ARCS = ROUTE.map(([a, b]) => arc(CITIES[a].at, CITIES[b].at));

export default function HeroGlobe() {
  const [rotation, setRotation] = useState<[number, number]>([-20, TILT]);
  const frame = useRef<number | null>(null);
  const dragging = useRef<{ x: number; y: number; r: [number, number] } | null>(null);
  const visible = useRef(true);
  const svgRef = useRef<SVGSVGElement>(null);

  // Spin, unless the visitor prefers less motion or the globe is off screen.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const svg = svgRef.current;
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
    });
    if (svg) observer.observe(svg);

    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      acc += dt;
      // About 30 frames a second is plenty for a slow spin.
      if (acc >= 33 && visible.current && !dragging.current) {
        const step = (DEGREES_PER_SECOND * acc) / 1000;
        setRotation(([lambda, phi]) => [lambda + step, phi]);
        acc = 0;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      observer.disconnect();
    };
  }, []);

  const projection = useMemo(
    () =>
      geoOrthographic()
        .scale(RADIUS)
        .translate([SIZE / 2, SIZE / 2])
        .clipAngle(90)
        .rotate(rotation),
    [rotation],
  );
  const path = useMemo(() => geoPath(projection).digits(1), [projection]);
  const centre: [number, number] = [-rotation[0], -rotation[1]];

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = { x: event.clientX, y: event.clientY, r: rotation };
  };
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const d = dragging.current;
    if (!d) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const k = 180 / (rect.width * 0.9);
    const lambda = d.r[0] + (event.clientX - d.x) * k;
    const phi = Math.max(-60, Math.min(60, d.r[1] - (event.clientY - d.y) * k));
    setRotation([lambda, phi]);
  };
  const onPointerUp = () => {
    dragging.current = null;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={styles.globe}
      role="img"
      aria-label="A turning globe with cities and a route drawn between them"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <defs>
        <radialGradient id="globe-sea" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#172230" />
          <stop offset="70%" stopColor="#0d141c" />
          <stop offset="100%" stopColor="#090e14" />
        </radialGradient>
        <radialGradient id="globe-glow" cx="50%" cy="50%" r="50%">
          <stop offset="82%" stopColor="rgba(246, 183, 60, 0)" />
          <stop offset="92%" stopColor="rgba(246, 183, 60, 0.10)" />
          <stop offset="100%" stopColor="rgba(246, 183, 60, 0)" />
        </radialGradient>
        <radialGradient id="globe-shade" cx="30%" cy="28%" r="80%">
          <stop offset="55%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
        </radialGradient>
      </defs>

      <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#globe-glow)" />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="url(#globe-sea)" />
      <path d={path(GRATICULE) ?? ""} className={styles.graticule} />
      <path d={path(LAND) ?? ""} className={styles.land} />

      {ARCS.map((a, i) => (
        <path
          key={i}
          d={path(a) ?? ""}
          className={styles.route}
          style={{ animationDelay: `${-i * 0.7}s` }}
        />
      ))}

      {CITIES.map((city, i) => {
        if (geoDistance(city.at, centre) > Math.PI / 2 - 0.08) return null;
        const p = projection(city.at);
        if (!p) return null;
        return (
          <g key={city.name} transform={`translate(${p[0]} ${p[1]})`}>
            <circle r="4" className={styles.pulse} style={{ animationDelay: `${-(i % 5) * 0.55}s` }} />
            <circle r="3.4" className={styles.city} />
          </g>
        );
      })}

      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="url(#globe-shade)" pointerEvents="none" />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} className={styles.rim} />
    </svg>
  );
}
