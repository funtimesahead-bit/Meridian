import { feature } from "topojson-client";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import data from "./boundaries.json";
import changesData from "./changes.json";

/* Historical US states and territories, from the Newberry Library's Atlas of
   Historical County Boundaries (CC BY-NC-SA 4.0). See scripts/build-us-history.mjs. */

export type UnitType = "s" | "t" | "u" | "d" | "o";

export type UnitProps = {
  id: string;
  /** Full name, e.g. "Indiana Territory". */
  n: string;
  /** Short name, e.g. "IN Terr". */
  a: string;
  t: UnitType;
  /** First and last day this version of the unit existed, as YYYYMMDD. */
  s: number;
  e: number;
};

export type Unit = Feature<Polygon | MultiPolygon, UnitProps>;

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  s: "State",
  t: "Territory",
  u: "Unorganized territory",
  d: "Federal district",
  o: "Claimed, disputed or independent",
};

export type Change = { d: number; n: string; text: string };
export const CHANGES = changesData as Change[];

/** Signed area of a ring on the flat lon/lat plane (latitude up): negative when clockwise. */
function ringArea(ring: Position[]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return sum / 2;
}

/**
 * d3 draws a ring wound the "wrong" way as the whole globe minus that ring.
 * Simplification can flip tiny islands, so set every ring's direction:
 * outer rings clockwise, holes counter-clockwise. Drop rings that collapsed.
 */
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
).features.map((unit) => ({ ...unit, geometry: rewind(unit.geometry) }));

/** Units that existed on a date (YYYYMMDD). */
export function unitsOn(date: number): Unit[] {
  return UNITS.filter((u) => u.properties.s <= date && u.properties.e >= date);
}
