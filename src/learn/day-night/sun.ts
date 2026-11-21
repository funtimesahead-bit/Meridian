/* Where the Sun is overhead at a moment, and what that means for a place.
   Uses the NOAA low-precision formulas: good to a few minutes of time and
   a fraction of a degree, plenty for a world map. */

const RAD = Math.PI / 180;

export type Sun = {
  /** Latitude where the Sun is straight overhead (its declination), degrees. */
  lat: number;
  /** Longitude where it is solar noon right now, degrees. */
  lon: number;
};

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / 86_400_000) + 1;
}

export function sunAt(date: Date): Sun {
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const year = date.getUTCFullYear();
  const daysInYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
  const g = ((2 * Math.PI) / daysInYear) * (dayOfYear(date) - 1 + (hours - 12) / 24);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  let lon = -15 * (hours - 12 + eqTime / 60);
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { lat: decl / RAD, lon };
}

/** The Sun's height above the horizon at a place, in degrees (negative below). */
export function sunElevation(sun: Sun, lon: number, lat: number): number {
  const h = (lon - sun.lon) * RAD;
  const s =
    Math.sin(lat * RAD) * Math.sin(sun.lat * RAD) +
    Math.cos(lat * RAD) * Math.cos(sun.lat * RAD) * Math.cos(h);
  return Math.asin(Math.max(-1, Math.min(1, s))) / RAD;
}

/** Hours from sunrise to sunset at a latitude, given the Sun's declination. */
export function dayLength(lat: number, declination: number): number {
  const cos =
    (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(declination * RAD)) /
    (Math.cos(lat * RAD) * Math.cos(declination * RAD));
  if (cos <= -1) return 24;
  if (cos >= 1) return 0;
  return (2 * Math.acos(cos)) / RAD / 15;
}

/** How high the Sun gets at midday at a latitude, in degrees. */
export function noonHeight(lat: number, declination: number): number {
  return 90 - Math.abs(lat - declination);
}

export const TILT = 23.44;
