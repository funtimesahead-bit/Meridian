/* Country shapes and map projections shared by the games and quizzes.
   This module pulls in the full country outline file, so only import it from
   components that are loaded lazily in the browser. */

import {
  geoAzimuthalEqualArea,
  geoAzimuthalEquidistant,
  geoContains,
  geoNaturalEarth1,
  geoPath,
  type GeoPath,
  type GeoPermissibleObjects,
  type GeoProjection,
} from "d3-geo";
import { feature, neighbors } from "topojson-client";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import atlas from "world-atlas/countries-50m.json";
import lakes from "./lakes.json";

const topology = atlas as unknown as Topology;

export type CountryFeature = Feature<Polygon | MultiPolygon, { name: string }>;

const collection = feature(
  topology,
  topology.objects.countries as GeometryCollection<{ name: string }>,
) as FeatureCollection<Polygon | MultiPolygon, { name: string }>;

/** Every country shape, keyed by its name in the outline file (names are unique). */
export const COUNTRY_SHAPES = new Map<string, CountryFeature>(
  collection.features.map((f) => [f.properties.name, f]),
);

const LAND = feature(topology, topology.objects.land);
/** The world's large lakes (Natural Earth), drawn as water on top of the land. */
const LAKES = lakes as unknown as GeoPermissibleObjects;

/** For each country shape, the shapes it shares a land border with. */
export const SHAPE_NEIGHBOURS: Map<string, string[]> = (() => {
  const geometries = (topology.objects.countries as GeometryCollection<{ name: string }>)
    .geometries;
  const adjacency = neighbors(geometries);
  const nameOf = (index: number) => (geometries[index].properties as { name: string }).name;
  return new Map(geometries.map((_, i) => [nameOf(i), adjacency[i].map(nameOf)]));
})();

/* ---------- Scenes: a projection plus the size of its drawing area ---------- */

export type SceneId = "world" | "europe" | "north-america" | "asia" | "oceania";

export type Scene = {
  id: string;
  width: number;
  height: number;
  projection: GeoProjection;
  path: GeoPath;
  /** Same projection with full precision, for shapes viewed zoomed far in. */
  finePath: GeoPath;
  landPath: string;
  lakesPath: string;
  /** Background shape behind the land (the globe outline on the world map). */
  backdropPath: string | null;
  /**
   * The part of the drawing area the map opens on, as [[x0, y0], [x1, y1]].
   * Continent maps are drawn larger than this so the surroundings fill the
   * frame whatever its shape. Left out when the whole map is the subject.
   */
  home?: [[number, number], [number, number]];
  countryPath: (name: string) => string;
};

type Built = {
  projection: GeoProjection;
  width: number;
  height: number;
  home?: [[number, number], [number, number]];
};

/**
 * Fit the given points into a box of `boxWidth` x `boxHeight` in the middle
 * of a drawing area that extends `bleed` further on every side.
 */
function fitToPoints(
  projection: GeoProjection,
  boxWidth: number,
  boxHeight: number,
  bleed: number,
  points: Position[],
): Built {
  const width = boxWidth + bleed * 2;
  const height = boxHeight + bleed * 2;
  const margin = 24;
  projection
    .fitExtent(
      [
        [bleed + margin, bleed + margin],
        [bleed + boxWidth - margin, bleed + boxHeight - margin],
      ],
      { type: "MultiPoint", coordinates: points },
    )
    .clipExtent([
      [0, 0],
      [width, height],
    ]);
  return {
    projection,
    width,
    height,
    home: [
      [bleed, bleed],
      [bleed + boxWidth, bleed + boxHeight],
    ],
  };
}

function buildProjection(id: SceneId): Built {
  if (id === "europe") {
    return fitToPoints(
      geoAzimuthalEqualArea().rotate([-14, -53]).clipAngle(60),
      1000,
      800,
      450,
      [
        [-24.5, 63.3], // west Iceland
        [-9.5, 36.9], // south-west Portugal
        [34, 34.5], // Cyprus
        [50.4, 40.3], // east Azerbaijan
        [31, 71.2], // north Norway
        [48, 62], // keep a slice of Russia
      ],
    );
  }
  if (id === "north-america") {
    return fitToPoints(
      geoAzimuthalEqualArea().rotate([96, -42]).clipAngle(75),
      1000,
      900,
      450,
      [
        [-168, 65.5], // west Alaska
        [-141, 70],
        [-75, 83], // north Canada
        [-35, 83.5], // north Greenland
        [-19, 72], // east Greenland
        [-52.6, 47.5], // Newfoundland
        [-59.4, 13.1], // Barbados
        [-61, 10], // Trinidad
        [-77.3, 7.3], // south Panama
        [-117, 32.5],
      ],
    );
  }
  if (id === "asia") {
    return fitToPoints(
      geoAzimuthalEqualArea().rotate([-88, -30]).clipAngle(80),
      1000,
      820,
      450,
      [
        [26.2, 39.5], // west Turkey
        [34.3, 31.3], // Gaza / Sinai edge
        [43.5, 12.7], // south-west Yemen
        [73.5, -0.6], // south Maldives
        [106, -8.5], // Java
        [125, -10.3], // Timor
        [140.9, -6], // east Indonesia
        [145.5, 43.5], // east Hokkaido
        [100, 56], // keep a slice of Russia
        [60, 55],
      ],
    );
  }
  if (id === "oceania") {
    return fitToPoints(
      geoAzimuthalEqualArea().rotate([-158, 17]).clipAngle(85),
      1000,
      780,
      450,
      [
        [113.2, -24], // west Australia
        [116, -35],
        [134.5, 8], // Palau
        [171, 10], // Marshall Islands
        [-171, -13.5], // Samoa
        [-174, -21.5], // Tonga
        [167.5, -47], // south New Zealand
        [147, -43.5], // Tasmania
      ],
    );
  }
  const width = 1000;
  const height = 500;
  const projection = geoNaturalEarth1().fitExtent(
    [
      [6, 6],
      [width - 6, height - 6],
    ],
    { type: "Sphere" },
  );
  return { projection, width, height };
}

const scenes = new Map<SceneId, Scene>();

export function getScene(id: SceneId): Scene {
  const cached = scenes.get(id);
  if (cached) return cached;

  const { projection, width, height, home } = buildProjection(id);
  const path = geoPath(projection).digits(1);
  const countryPaths = new Map<string, string>();

  const scene: Scene = {
    id,
    width,
    height,
    projection,
    path,
    finePath: geoPath(projection),
    landPath: path(LAND) ?? "",
    lakesPath: path(LAKES) ?? "",
    backdropPath: id === "world" ? path({ type: "Sphere" }) : null,
    home,
    countryPath(name) {
      let d = countryPaths.get(name);
      if (d === undefined) {
        const shape = COUNTRY_SHAPES.get(name);
        d = shape ? (path(shape) ?? "") : "";
        countryPaths.set(name, d);
      }
      return d;
    },
  };
  scenes.set(id, scene);
  return scene;
}

let centredScene: Scene | null = null;

/**
 * A map centred on one place, where distance from the centre is true to
 * scale in every direction. Rings drawn around the centre come out as
 * perfect circles. Shows everything within `reachKm` of the centre, plus
 * a margin.
 */
export function getCentredScene(lon: number, lat: number, reachKm = 3500): Scene {
  // Degrees of arc to show: the reach plus a quarter, kept short of the far side of the globe.
  const reach = Math.round(Math.min(150, Math.max(25, (reachKm / 111.195) * 1.25)));
  const id = `centred:${lon},${lat},${reach}`;
  if (centredScene?.id === id) return centredScene;

  const size = 1000;
  const projection = geoAzimuthalEquidistant()
    .rotate([-lon, -lat])
    .clipAngle(reach)
    .fitExtent(
      [
        [4, 4],
        [size - 4, size - 4],
      ],
      { type: "Sphere" },
    );
  // The game zooms far in on this map, so keep more decimals than usual.
  const path = geoPath(projection).digits(2);
  const countryPaths = new Map<string, string>();

  centredScene = {
    id,
    width: size,
    height: size,
    projection,
    path,
    finePath: geoPath(projection),
    landPath: path(LAND) ?? "",
    lakesPath: path(LAKES) ?? "",
    backdropPath: path({ type: "Sphere" }),
    countryPath(name) {
      let d = countryPaths.get(name);
      if (d === undefined) {
        const shape = COUNTRY_SHAPES.get(name);
        d = shape ? (path(shape) ?? "") : "";
        countryPaths.set(name, d);
      }
      return d;
    },
  };
  return centredScene;
}

/* ---------- Distances ---------- */

const EARTH_RADIUS_KM = 6371;
const RAD = Math.PI / 180;

export function distanceKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function wrapLon(delta: number): number {
  return ((((delta + 180) % 360) + 360) % 360) - 180;
}

/**
 * Nearest point on a border segment, working on a flat map centred on the
 * query point. Accurate enough for scoring a pin drop.
 */
function nearestOnSegment(lon: number, lat: number, a: Position, b: Position): Position {
  const scale = Math.cos(lat * RAD);
  const ax = wrapLon(a[0] - lon) * scale;
  const ay = a[1] - lat;
  const bx = wrapLon(b[0] - lon) * scale;
  const by = b[1] - lat;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq));
  return [a[0] + wrapLon(b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export type CountryHit = {
  inside: boolean;
  /** Kilometres from the point to the country's edge (0 when inside). */
  km: number;
  /** Closest point of the country, for drawing a line to it. */
  nearest: Position;
};

/** Where a point falls relative to a country made of one or more shapes. */
export function measureToCountry(shapeNames: string[], lon: number, lat: number): CountryHit {
  const shapes = shapeNames
    .map((name) => COUNTRY_SHAPES.get(name))
    .filter((s): s is CountryFeature => Boolean(s));

  if (shapes.some((shape) => geoContains(shape, [lon, lat]))) {
    return { inside: true, km: 0, nearest: [lon, lat] };
  }

  let best = Infinity;
  let nearest: Position = [lon, lat];
  for (const shape of shapes) {
    const polygons =
      shape.geometry.type === "Polygon"
        ? [shape.geometry.coordinates]
        : shape.geometry.coordinates;
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (let i = 1; i < ring.length; i++) {
          const p = nearestOnSegment(lon, lat, ring[i - 1], ring[i]);
          const km = distanceKm(lon, lat, p[0], p[1]);
          if (km < best) {
            best = km;
            nearest = p;
          }
        }
      }
    }
  }
  return { inside: false, km: best, nearest };
}

/** The shapes of several countries as one object, e.g. to zoom the map to them. */
export function countryGeometry(shapeNames: string[]): GeoPermissibleObjects {
  return {
    type: "FeatureCollection",
    features: shapeNames
      .map((name) => COUNTRY_SHAPES.get(name))
      .filter((s): s is CountryFeature => Boolean(s)),
  };
}
