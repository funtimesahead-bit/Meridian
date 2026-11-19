import {
  geoArea,
  geoAzimuthalEqualArea,
  geoCentroid,
  geoCircle,
  geoDistance,
  geoPath,
  type GeoPermissibleObjects,
} from "d3-geo";
import type { MultiPolygon, Polygon, Position } from "geojson";
import type { WorldCountry } from "@/lib/geo/countries";
import { COUNTRY_SHAPES } from "@/lib/geo/world";

/* Drawing a country as a silhouette that fills the frame.

   - Far-off, small pieces are dropped, so France is not shrunk to a dot by
     French Guiana and the US is shown as its main block.
   - Scattered island nations get their 200-nautical-mile zone drawn around
     the islands, which is far more recognisable than a spray of specks. */

export const SIZE = 400;
const EARTH_KM = 6371;
const ZONE_KM = 370; // 200 nautical miles

/** Countries shown as a zone of sea around their islands. */
const SCATTERED = new Set([
  "Kiribati",
  "Tuvalu",
  "Marshall Islands",
  "Micronesia",
  "Palau",
  "Maldives",
  "Seychelles",
  "Tonga",
  "Cabo Verde",
  "Comoros",
  "Mauritius",
  "São Tomé and Príncipe",
  "Fiji",
  "Solomon Islands",
  "Vanuatu",
  "Bahamas",
  "Antigua and Barbuda",
  "Saint Kitts and Nevis",
  "Saint Vincent and the Grenadines",
  "Samoa",
]);

/** Only the main block, whatever the size of the far-off parts. */
const MAINLAND_ONLY = new Set(["United States", "France"]);

/** Islands too small for the map file, so the sea zone takes its true shape. */
const EXTRA_ISLANDS: Record<string, [number, number][]> = {
  Tuvalu: [
    [176.12, -5.67],
    [177.34, -6.11],
    [176.32, -6.29],
    [177.16, -7.24],
    [178.68, -7.48],
    [178.37, -8.0],
    [179.2, -8.52],
    [179.83, -9.38],
    [179.47, -10.79],
  ],
  // Gilbert, Phoenix and Line Islands: three groups spread over 4,000 km.
  Kiribati: [
    [172.98, 3.07], [173.0, 1.42], [173.85, 0.4], [174.83, -1.33], [176.45, -1.37],
    [176.83, -2.64], [169.53, -0.86],
    [-171.72, -2.81], [-171.08, -3.13], [-174.53, -4.67], [-172.2, -4.52],
    [-171.25, -4.45], [-174.13, -3.6],
    [-160.38, 4.68], [-159.36, 3.86], [-157.4, 1.87], [-154.93, -4.02],
    [-155.88, -5.62], [-150.21, -9.94], [-152.31, -10.06], [-151.82, -11.43],
  ],
  Mauritius: [
    [63.42, -19.72], // Rodrigues
    [56.6, -10.4], // Agaléga
    [59.6, -16.6], // Saint Brandon
  ],
  Palau: [
    [134.71, 8.07],
    [134.15, 6.9],
    [132.22, 5.33],
    [131.17, 3.0],
    [131.8, 2.97],
  ],
};

export type Silhouette = {
  /** The land, ready to draw in a SIZE x SIZE box. */
  land: string;
  /** The sea zone around scattered islands, if any. */
  zone: string | null;
  /** Points marking small islands so they can be seen. */
  islands: [number, number][];
};

function polygonsOf(country: WorldCountry): Position[][][] {
  const out: Position[][][] = [];
  for (const name of country.shapes) {
    const shape = COUNTRY_SHAPES.get(name);
    if (!shape) continue;
    const g = shape.geometry;
    if (g.type === "Polygon") out.push(g.coordinates);
    else out.push(...g.coordinates);
  }
  return out;
}

export function silhouette(country: WorldCountry): Silhouette {
  const polygons = polygonsOf(country);
  const scattered = SCATTERED.has(country.name) || polygons.length === 0;

  let kept = polygons;
  if (!scattered && polygons.length > 1) {
    const areas = polygons.map((p) => geoArea({ type: "Polygon", coordinates: p }));
    const total = areas.reduce((s, a) => s + a, 0);
    const main = polygons[areas.indexOf(Math.max(...areas))];
    const mainCentre = geoCentroid({ type: "Polygon", coordinates: main });
    kept = polygons.filter((p, i) => {
      const km = geoDistance(geoCentroid({ type: "Polygon", coordinates: p }), mainCentre) * EARTH_KM;
      if (MAINLAND_ONLY.has(country.name)) return km < 2500;
      return !(areas[i] / total < 0.03 && km > 600);
    });
  }

  const land: MultiPolygon = { type: "MultiPolygon", coordinates: kept };
  const islandPoints: [number, number][] = [
    ...kept.map((p) => geoCentroid({ type: "Polygon", coordinates: p }) as [number, number]),
    ...(EXTRA_ISLANDS[country.name] ?? []),
  ];
  if (islandPoints.length === 0 && country.point) islandPoints.push(country.point);

  let zone: GeoPermissibleObjects | null = null;
  if (scattered) {
    const circle = geoCircle().radius(ZONE_KM / 111.195).precision(4);
    zone = {
      type: "GeometryCollection",
      geometries: islandPoints.map((p) => circle.center(p)() as Polygon),
    };
  }

  const subject: GeoPermissibleObjects = zone ?? land;
  const centre = geoCentroid(subject);
  const projection = geoAzimuthalEqualArea()
    .rotate([-centre[0], -centre[1]])
    .fitExtent(
      [
        [24, 24],
        [SIZE - 24, SIZE - 24],
      ],
      subject,
    );
  const path = geoPath(projection).digits(1);

  return {
    land: kept.length ? (path(land) ?? "") : "",
    zone: zone ? (path(zone) ?? "") : null,
    islands: scattered
      ? islandPoints.flatMap((p) => {
          const xy = projection(p);
          return xy ? [xy as [number, number]] : [];
        })
      : [],
  };
}
