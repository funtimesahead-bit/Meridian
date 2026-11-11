"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import landTopology from "world-atlas/land-50m.json";
import lakes from "@/lib/geo/lakes.json";
import styles from "./WorldMap.module.css";

/* The map is drawn once in a fixed 1000 x 500 coordinate space, then moved
   and scaled as a whole. No borders, no labels: just land and sea. */
const W = 1000;
const MAP_H = 500;
const MIN_ZOOM = 1;
const MAX_ZOOM = 16;
const FOCUS_ZOOM = 2.6;

const projection = geoNaturalEarth1().fitExtent(
  [
    [6, 6],
    [W - 6, MAP_H - 6],
  ],
  { type: "Sphere" },
);
const pathFor = geoPath(projection).digits(1);
const topology = landTopology as unknown as Topology;
const LAND_PATH = pathFor(feature(topology, topology.objects.land)) ?? "";
const SPHERE_PATH = pathFor({ type: "Sphere" }) ?? "";
const LAKES_PATH = pathFor(lakes as unknown as Parameters<typeof pathFor>[0]) ?? "";

type View = { k: number; x: number; y: number };

export type MapDot = { id: string; lon: number; lat: number; ok: boolean };

export type MapTarget = {
  id: string;
  lon: number;
  lat: number;
  status: "active" | "correct" | "missed";
  /** Shown beside the dot once the answer is revealed. */
  label?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Keep the map covering the viewport so you can never drag it out of sight. */
function clampView(view: View, viewH: number): View {
  const k = clamp(view.k, MIN_ZOOM, MAX_ZOOM);
  const x = clamp(view.x, W - k * W, 0);
  const mapH = k * MAP_H;
  const y = mapH <= viewH ? (viewH - mapH) / 2 : clamp(view.y, viewH - mapH, 0);
  return { k, x, y };
}

function zoomAt(view: View, factor: number, px: number, py: number): View {
  const k = clamp(view.k * factor, MIN_ZOOM, MAX_ZOOM);
  const ratio = k / view.k;
  return { k, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio };
}

function project(lon: number, lat: number): [number, number] {
  return projection([lon, lat]) ?? [W / 2, MAP_H / 2];
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function WorldMap({
  target,
  past,
}: {
  target: MapTarget | null;
  past: MapDot[];
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: W, height: MAP_H });
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });

  const viewH = (W * size.height) / Math.max(1, size.width);
  /** Map units per CSS pixel, so dots keep the same on-screen size at any zoom. */
  const unit = W / Math.max(1, size.width);

  const viewRef = useRef(view);
  const viewHRef = useRef(viewH);
  const animRef = useRef<number | null>(null);
  useEffect(() => {
    viewRef.current = view;
    viewHRef.current = viewH;
  });

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const rect = frame.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        viewHRef.current = (W * rect.height) / rect.width;
        setSize({ width: rect.width, height: rect.height });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const stopAnimation = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  /** Glide from the current view to `to`. */
  const animateTo = useCallback(
    (to: View) => {
      stopAnimation();
      const h = viewHRef.current;
      const from = clampView(viewRef.current, h);
      const end = clampView(to, h);
      if (prefersReducedMotion()) {
        setView(end);
        return;
      }
      // Interpolate the centre point and (geometrically) the zoom level.
      const centre = (v: View) => ({
        cx: (W / 2 - v.x) / v.k,
        cy: (h / 2 - v.y) / v.k,
      });
      const a = centre(from);
      const b = centre(end);
      const duration = 750;
      let start: number | null = null;

      const step = (now: number) => {
        if (start === null) start = now;
        const t = Math.min(1, (now - start) / duration);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const k = from.k * Math.pow(end.k / from.k, e);
        const cx = a.cx + (b.cx - a.cx) * e;
        const cy = a.cy + (b.cy - a.cy) * e;
        setView({ k, x: W / 2 - k * cx, y: h / 2 - k * cy });
        animRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      animRef.current = requestAnimationFrame(step);
    },
    [stopAnimation],
  );

  const focusOn = useCallback(
    (lon: number, lat: number, zoom = FOCUS_ZOOM) => {
      const [px, py] = project(lon, lat);
      animateTo({
        k: zoom,
        x: W / 2 - zoom * px,
        y: viewHRef.current / 2 - zoom * py,
      });
    },
    [animateTo],
  );

  // Fly to each new city as it comes up.
  const targetId = target?.id;
  const targetLon = target?.lon;
  const targetLat = target?.lat;
  useEffect(() => {
    if (targetLon === undefined || targetLat === undefined) return;
    focusOn(targetLon, targetLat);
  }, [targetId, targetLon, targetLat, focusOn]);

  useEffect(() => stopAnimation, [stopAnimation]);

  /* ---- Drag to pan, pinch or scroll to zoom ---- */

  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const toMapUnits = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const scale = W / rect.width;
    return { x: (clientX - rect.left) * scale, y: (clientY - rect.top) * scale };
  }, []);

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    stopAnimation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, toMapUnits(event.clientX, event.clientY));
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const active = pointers.current;
    const previous = active.get(event.pointerId);
    if (!previous) return;
    const current = toMapUnits(event.clientX, event.clientY);

    if (active.size === 1) {
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      setView((v) => clampView({ k: v.k, x: v.x + dx, y: v.y + dy }, viewHRef.current));
    } else if (active.size === 2) {
      const other = [...active.entries()].find(([id]) => id !== event.pointerId)![1];
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(current.x - other.x, current.y - other.y);
      const midBefore = { x: (previous.x + other.x) / 2, y: (previous.y + other.y) / 2 };
      const midAfter = { x: (current.x + other.x) / 2, y: (current.y + other.y) / 2 };
      const factor = before > 0 ? after / before : 1;
      setView((v) => {
        const zoomed = zoomAt(v, factor, midBefore.x, midBefore.y);
        return clampView(
          {
            k: zoomed.k,
            x: zoomed.x + (midAfter.x - midBefore.x),
            y: zoomed.y + (midAfter.y - midBefore.y),
          },
          viewHRef.current,
        );
      });
    }
    active.set(event.pointerId, current);
  };

  const onPointerEnd = (event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
  };

  // React registers wheel listeners as passive, so attach this one by hand
  // to be able to stop the page from scrolling while zooming the map.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stopAnimation();
      const rect = svg.getBoundingClientRect();
      const scale = W / rect.width;
      const px = (event.clientX - rect.left) * scale;
      const py = (event.clientY - rect.top) * scale;
      const delta = event.deltaMode === 1 ? event.deltaY * 32 : event.deltaY;
      const factor = Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.0016));
      setView((v) => clampView(zoomAt(v, factor, px, py), viewHRef.current));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [stopAnimation]);

  const zoomBy = (factor: number) => {
    const v = clampView(viewRef.current, viewHRef.current);
    animateTo(zoomAt(v, factor, W / 2, viewHRef.current / 2));
  };

  /* ---- Drawing ---- */

  const shown = clampView(view, viewH);
  const land = useMemo(
    () => (
      <>
        <path d={SPHERE_PATH} className={styles.ocean} />
        <path d={LAND_PATH} className={styles.land} />
        <path d={LAKES_PATH} className={styles.ocean} />
      </>
    ),
    [],
  );

  const dotScale = unit / shown.k;
  const targetPoint = target ? project(target.lon, target.lat) : null;
  // Put the label on the left of the dot when it sits near the right edge.
  const labelOnLeft = targetPoint
    ? targetPoint[0] * shown.k + shown.x > W * 0.68
    : false;

  return (
    <div className={styles.frame} ref={frameRef}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${W} ${viewH}`}
        role="img"
        aria-label="Blank world map with one city marked by a dot"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <g transform={`translate(${shown.x} ${shown.y}) scale(${shown.k})`}>
          {land}

          {past.map((dot) => {
            const [px, py] = project(dot.lon, dot.lat);
            return (
              <circle
                key={dot.id}
                cx={px}
                cy={py}
                r={3.2 * dotScale}
                className={dot.ok ? styles.pastGood : styles.pastBad}
              />
            );
          })}

          {target && targetPoint && (
            <g
              key={target.id}
              transform={`translate(${targetPoint[0]} ${targetPoint[1]}) scale(${dotScale})`}
              className={`${styles.target} ${target.status === "active" ? "" : styles[target.status]}`}
            >
              {target.status === "active" && (
                <>
                  <circle r="6" className={styles.pulse} />
                  <circle r="6" className={`${styles.pulse} ${styles.pulseLate}`} />
                </>
              )}
              <circle r="10.5" className={styles.halo} />
              <circle r="5.5" className={styles.core} />
              {target.label && (
                <text
                  className={styles.label}
                  x={labelOnLeft ? -13 : 13}
                  y="5"
                  textAnchor={labelOnLeft ? "end" : "start"}
                >
                  {target.label}
                </text>
              )}
            </g>
          )}
        </g>
      </svg>

      <div className={styles.controls}>
        <button type="button" onClick={() => zoomBy(1.7)} aria-label="Zoom in" title="Zoom in">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.7)} aria-label="Zoom out" title="Zoom out">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8h10" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => target && focusOn(target.lon, target.lat)}
          aria-label="Centre on the city"
          title="Centre on the city"
          disabled={!target}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="3.2" />
            <path d="M8 1.5v2.6M8 11.9v2.6M1.5 8h2.6M11.9 8h2.6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => animateTo({ k: 1, x: 0, y: 0 })}
          aria-label="Show the whole world"
          title="Show the whole world"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6" />
            <path d="M2 8h12M8 2c2.2 2 2.2 10 0 12M8 2c-2.2 2-2.2 10 0 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
