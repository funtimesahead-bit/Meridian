import { feature } from "topojson-client";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import data from "./borders.json";

/* Europe's borders from 1492 to today, built by scripts/build-europe-history.mjs.
   Before 1886 the map comes from snapshots of key years; from 1886 it is
   dated to the day (CShapes 2.0). */

/** i independent · v vassal or under another crown · c colony or protectorate · x occupied */
export type UnitKind = "i" | "v" | "c" | "x";

export type UnitProps = {
  n: string;
  /** First and last day these borders applied, as YYYYMMDD. */
  s: number;
  e: number;
  k: UnitKind;
  /** The overlord, crown or occupier, when there is one. */
  o?: string;
  /** Colour key, shared by a state across its renamings. */
  c: string;
};

export type Unit = Feature<Polygon | MultiPolygon, UnitProps>;

/** The snapshot years used before yearly data begins. */
export const SNAPSHOT_YEARS = [1492, 1500, 1530, 1600, 1650, 1700, 1715, 1783, 1800, 1815, 1880];
export const YEARLY_FROM = 1886;

/* topojson's simplification can flip small rings; wind them the way d3 wants. */
function ringArea(ring: Position[]): number {
  let sum = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

function rewindPolygon(rings: Position[][]): Position[][] {
  const out: Position[][] = [];
  rings.forEach((ring, i) => {
    if (ring.length < 4) return;
    const area = ringArea(ring);
    if (Math.abs(area) < 1e-6) return;
    const wantClockwise = i === 0;
    const isClockwise = area < 0;
    out.push(wantClockwise === isClockwise ? ring : [...ring].reverse());
  });
  return out;
}

function rewind(geometry: Polygon | MultiPolygon): Polygon | MultiPolygon {
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: rewindPolygon(geometry.coordinates) };
  }
  return {
    type: "MultiPolygon",
    coordinates: geometry.coordinates.map(rewindPolygon).filter((p) => p.length > 0),
  };
}

const topology = data as unknown as Topology;

export const UNITS: Unit[] = (
  feature(
    topology,
    topology.objects.units as GeometryCollection<UnitProps>,
  ) as unknown as { features: Unit[] }
).features
  .filter((u) => u.geometry)
  .map((unit) => ({ ...unit, geometry: rewind(unit.geometry) }));

/** Units that existed on a date (YYYYMMDD). */
export function unitsOn(date: number): Unit[] {
  return UNITS.filter((u) => u.properties.s <= date && u.properties.e >= date);
}
