import { geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countries110 from "world-atlas/countries-110m.json";
import { getScene, type SceneId } from "@/lib/geo/world";

/* Card pictures for the continent quizzes: the continent itself, drawn at
   build time from low-detail map data, so each card shows its own map.
   Server-only; nothing here is sent to the browser except the SVG. */

const topo = countries110 as unknown as Topology;
const countries = topo.objects.countries as GeometryCollection;
const LAND = feature(topo, countries);
const BORDERS = mesh(topo, countries, (a, b) => a !== b);

export function ContinentArt({
  scene: sceneId,
  borders = false,
  dots = [],
}: {
  scene: SceneId;
  /** Draw country borders. */
  borders?: boolean;
  /** [lon, lat] points to mark, most important first. */
  dots?: [number, number][];
}) {
  const scene = getScene(sceneId);
  const [[x0, y0], [x1, y1]] = scene.home ?? [
    [0, 0],
    [scene.width, scene.height],
  ];
  const path = geoPath(scene.projection).digits(0);
  const width = x1 - x0;
  // Dot and line sizes are in map units, so scale them to the view.
  const unit = width / 320;

  return (
    <svg
      viewBox={`${x0} ${y0} ${width} ${y1 - y0}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <path d={path(LAND) ?? ""} fill="#2b3b4e" />
      {borders && (
        <path
          d={path(BORDERS) ?? ""}
          fill="none"
          stroke="#0b1016"
          strokeWidth={1.2 * unit}
          strokeLinejoin="round"
        />
      )}
      {dots.map((lonLat, i) => {
        const p = scene.projection(lonLat);
        if (!p) return null;
        const big = i < 3;
        return (
          <g key={i}>
            {big && <circle cx={p[0]} cy={p[1]} r={7 * unit} fill="#f6b73c" opacity={0.18} />}
            <circle
              cx={p[0]}
              cy={p[1]}
              r={(big ? 3.4 : 2.2) * unit}
              fill={big ? "#f6b73c" : "#8fa1b5"}
              stroke="#0b1016"
              strokeWidth={0.8 * unit}
            />
          </g>
        );
      })}
    </svg>
  );
}
