"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GeoPermissibleObjects } from "d3-geo";
import { getScene, type Scene, type SceneId } from "@/lib/geo/world";
import styles from "./MapCanvas.module.css";

/* A pannable, zoomable blank map. Games describe what to draw on it
   (countries, outlines, markers) and it handles the rest. */

const MAX_ZOOM = 90;

type View = { k: number; x: number; y: number };

export type Tone = "accent" | "good" | "bad" | "dim" | "plain";

export type MapCountry = { name: string; tone?: Tone };

export type MapShape = {
  id: string;
  /** One object, or several whose outlines are combined (used for ring bands). */
  geo: GeoPermissibleObjects | GeoPermissibleObjects[];
  style: "ring" | "ringFaint" | "band" | "line";
};

export type MapMarker = {
  id: string;
  lon: number;
  lat: number;
  tone?: Tone;
  shape?: "dot" | "pin" | "slot";
  /** Dot radius in screen pixels. */
  size?: number;
  label?: string;
  /** Which side of the dot the label sits on. Defaults to the right, or left near the right edge. */
  labelSide?: "left" | "right";
  /** Hide the label until the pointer is over the dot. */
  labelOnHover?: boolean;
  pulse?: boolean;
};

export type MapFocus = {
  /** Change the key to fly to a new place. */
  key: string;
  /** What to fit in view. Leave out to show the whole map. */
  geo?: GeoPermissibleObjects;
  /** Extra room around the shape; 1 fits it edge to edge. */
  pad?: number;
  maxZoom?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function MapCanvas({
  scene: sceneProp = "world",
  borders = false,
  countries,
  shapes,
  markers,
  focus,
  onPick,
  tall = false,
  ariaLabel = "Map",
}: {
  /** A built-in map by name, or a custom one (e.g. centred on a city). */
  scene?: SceneId | Scene;
  /** Draw outlines around the listed countries. */
  borders?: boolean;
  countries?: MapCountry[];
  shapes?: MapShape[];
  markers?: MapMarker[];
  focus?: MapFocus;
  /** Called with the map position when the player clicks without dragging. */
  onPick?: (lon: number, lat: number) => void;
  /** Use a taller frame, for maps that are not wide. */
  tall?: boolean;
  ariaLabel?: string;
}) {
  const scene = useMemo(
    () => (typeof sceneProp === "string" ? getScene(sceneProp) : sceneProp),
    [sceneProp],
  );
  const W = scene.width;
  const H = scene.height;

  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: W, height: H });
  /** False until the frame has been measured; nothing is positioned before then. */
  const [measured, setMeasured] = useState(false);
  const [view, setView] = useState<View>({ k: 0, x: 0, y: 0 });

  const viewH = (W * size.height) / Math.max(1, size.width);
  const unit = W / Math.max(1, size.width);

  const clampView = useCallback(
    (v: View, vh: number): View => {
      const minZoom = Math.min(1, vh / H);
      const k = clamp(v.k, minZoom, MAX_ZOOM);
      const mapW = k * W;
      const mapH = k * H;
      const x = mapW <= W ? (W - mapW) / 2 : clamp(v.x, W - mapW, 0);
      const y = mapH <= vh ? (vh - mapH) / 2 : clamp(v.y, vh - mapH, 0);
      return { k, x, y };
    },
    [W, H],
  );

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
        setMeasured(true);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [W]);

  const stopAnimation = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);
  useEffect(() => stopAnimation, [stopAnimation]);

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
      const centre = (v: View) => ({
        cx: (W / 2 - v.x) / v.k,
        cy: (h / 2 - v.y) / v.k,
      });
      const a = centre(from);
      const b = centre(end);
      const duration = 700;
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
    [W, clampView, stopAnimation],
  );

  const viewFor = useCallback(
    (target: MapFocus | undefined): View => {
      const h = viewHRef.current;
      // With nothing particular to show, open on the map's home area.
      const whole: View = { k: 0, x: 0, y: 0 };
      const box = target?.geo ? scene.path.bounds(target.geo) : scene.home;
      if (!box) return whole;
      const [[x0, y0], [x1, y1]] = box;
      if (![x0, y0, x1, y1].every(Number.isFinite)) return whole;
      const pad = target?.geo ? (target.pad ?? 1.3) : 1;
      const k = Math.min(
        W / (Math.max(1, x1 - x0) * pad),
        h / (Math.max(1, y1 - y0) * pad),
        target?.maxZoom ?? (target?.geo ? 12 : MAX_ZOOM),
      );
      return {
        k,
        x: W / 2 - (k * (x0 + x1)) / 2,
        y: h / 2 - (k * (y0 + y1)) / 2,
      };
    },
    [W, scene],
  );

  // Fly to whatever the game wants in view.
  const focusRef = useRef(focus);
  useEffect(() => {
    focusRef.current = focus;
  });
  const focusKey = focus?.key;
  // Also re-run when the frame changes shape, so the fit stays right.
  const frameShape = Math.round(viewH);
  const settled = useRef(false);
  useEffect(() => {
    if (!measured) return;
    const target = viewFor(focusRef.current);
    if (settled.current) {
      animateTo(target);
    } else {
      // First paint: start in place instead of gliding in from the full map.
      settled.current = true;
      stopAnimation();
      setView(clampView(target, viewHRef.current));
    }
  }, [measured, focusKey, frameShape, animateTo, viewFor, stopAnimation, clampView]);

  /* ---- Drag to pan, pinch or scroll to zoom, click to pick ---- */

  const zoomAt = useCallback((v: View, factor: number, px: number, py: number): View => {
    const k = Math.max(0.01, v.k * factor);
    const ratio = k / v.k;
    return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
  }, []);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const press = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);

  const toMapUnits = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current!.getBoundingClientRect();
      const scale = W / rect.width;
      return { x: (clientX - rect.left) * scale, y: (clientY - rect.top) * scale };
    },
    [W],
  );

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    stopAnimation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, toMapUnits(event.clientX, event.clientY));
    press.current =
      pointers.current.size === 1
        ? { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
        : null;
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const active = pointers.current;
    const previous = active.get(event.pointerId);
    if (!previous) return;
    const current = toMapUnits(event.clientX, event.clientY);

    const pressed = press.current;
    if (pressed && pressed.id === event.pointerId && !pressed.moved) {
      if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < 5) return;
      pressed.moved = true;
    }

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
        const zoomed = zoomAt(clampView(v, viewHRef.current), factor, midBefore.x, midBefore.y);
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

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const pressed = press.current;
    pointers.current.delete(event.pointerId);
    if (!pressed || pressed.id !== event.pointerId) return;
    press.current = null;
    if (pressed.moved || !onPick) return;

    const point = toMapUnits(event.clientX, event.clientY);
    const v = clampView(viewRef.current, viewHRef.current);
    const sx = (point.x - v.x) / v.k;
    const sy = (point.y - v.y) / v.k;
    const lonLat = scene.projection.invert?.([sx, sy]);
    if (!lonLat || !lonLat.every(Number.isFinite)) return;
    // Clicks outside the globe invert to nonsense; check the round trip.
    const back = scene.projection(lonLat);
    if (!back || Math.hypot(back[0] - sx, back[1] - sy) > 1.5) return;
    onPick(lonLat[0], lonLat[1]);
  };

  const onPointerCancel = (event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    press.current = null;
  };

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
      setView((v) =>
        clampView(zoomAt(clampView(v, viewHRef.current), factor, px, py), viewHRef.current),
      );
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [W, clampView, stopAnimation, zoomAt]);

  const zoomBy = (factor: number) => {
    const v = clampView(viewRef.current, viewHRef.current);
    animateTo(zoomAt(v, factor, W / 2, viewHRef.current / 2));
  };

  /* ---- Drawing ---- */

  const shown = clampView(view, viewH);
  const dotScale = unit / shown.k;

  const base = useMemo(
    () => (
      <>
        {scene.backdropPath && <path d={scene.backdropPath} className={styles.ocean} />}
        <path d={scene.landPath} className={styles.land} />
      </>
    ),
    [scene],
  );

  const countryLayer = useMemo(
    () =>
      countries?.map((country) => (
        <path
          key={country.name}
          d={scene.countryPath(country.name)}
          className={`${styles.country} ${styles[`fill-${country.tone ?? "plain"}`]} ${
            borders ? styles.bordered : ""
          }`}
        />
      )),
    [countries, borders, scene],
  );

  // Lakes go above the countries so a filled country still shows its lakes.
  const lakeLayer = useMemo(
    () => (
      <path
        d={scene.lakesPath}
        className={scene.backdropPath ? styles.lakeOnOcean : styles.lakeOnFrame}
      />
    ),
    [scene],
  );

  const shapeLayer = useMemo(
    () =>
      shapes?.map((shape) => {
        const parts = Array.isArray(shape.geo) ? shape.geo : [shape.geo];
        const d = parts.map((geo) => scene.finePath(geo) ?? "").join(" ");
        return <path key={shape.id} d={d} className={styles[`shape-${shape.style}`]} />;
      }),
    [shapes, scene],
  );

  return (
    <div className={`${styles.frame} ${tall ? styles.tall : ""}`} ref={frameRef}>
      <svg
        ref={svgRef}
        className={`${styles.svg} ${onPick ? styles.picking : ""}`}
        viewBox={`0 0 ${W} ${viewH}`}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <g transform={`translate(${shown.x} ${shown.y}) scale(${shown.k})`}>
          {base}
          {countryLayer}
          {lakeLayer}
          {shapeLayer}

          {markers?.map((marker) => {
            const point = scene.projection([marker.lon, marker.lat]);
            if (!point) return null;
            const tone = marker.tone ?? "accent";
            const r = marker.size ?? 5;
            const screenX = point[0] * shown.k + shown.x;
            const labelLeft = marker.labelSide ? marker.labelSide === "left" : screenX > W * 0.72;
            return (
              <g
                key={marker.id}
                transform={`translate(${point[0]} ${point[1]}) scale(${dotScale})`}
                className={`${styles.marker} ${styles[`tone-${tone}`]} ${
                  marker.labelOnHover ? styles.hoverLabel : ""
                }`}
              >
                {marker.pulse && (
                  <>
                    <circle r={r + 1} className={styles.pulse} />
                    <circle r={r + 1} className={`${styles.pulse} ${styles.pulseLate}`} />
                  </>
                )}
                {marker.shape === "pin" ? (
                  <>
                    <path
                      d="M0 0 C-2 -7 -9 -11 -9 -18 A9 9 0 1 1 9 -18 C9 -11 2 -7 0 0 Z"
                      className={styles.pin}
                    />
                    <circle cy="-18" r="3.2" className={styles.pinHole} />
                  </>
                ) : marker.shape === "slot" ? (
                  <circle r={r} className={styles.slot} />
                ) : (
                  <circle r={r} className={styles.dot} />
                )}
                {marker.labelOnHover && <circle r={r + 7} className={styles.hit} />}
                {marker.label && (
                  <text
                    className={styles.label}
                    x={labelLeft ? -(r + 7) : r + 7}
                    y={marker.shape === "pin" ? -14 : 4.5}
                    textAnchor={labelLeft ? "end" : "start"}
                  >
                    {marker.label}
                  </text>
                )}
              </g>
            );
          })}
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
        {focus?.geo && (
          <button
            type="button"
            onClick={() => animateTo(viewFor(focus))}
            aria-label="Back to the area in play"
            title="Back to the area in play"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="3.2" />
              <path d="M8 1.5v2.6M8 11.9v2.6M1.5 8h2.6M11.9 8h2.6" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => animateTo(viewFor(undefined))}
          aria-label="Show the whole map"
          title="Show the whole map"
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
