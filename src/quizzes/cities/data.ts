import type { SceneId } from "@/lib/geo/world";

/* "Name the 20 most populous cities in ..." quizzes.

   Populations are urban-area (metro) estimates in millions, rounded, in the
   style of the UN's World Urbanization Prospects. Different sources rank the
   lower end differently, so the page says these are approximate.

   One line per city:  Name | other name | other name = millions @ lat, lon  */

export type RankedCity = {
  rank: number;
  name: string;
  aliases: string[];
  millions: number;
  lat: number;
  lon: number;
};

export type CityQuiz = {
  slug: string;
  title: string;
  blurb: string;
  region: string;
  scene: SceneId;
  cities: RankedCity[];
};

function parse(lines: string): RankedCity[] {
  return lines
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const [namesPart, rest] = line.split("=");
      const [millions, coords] = rest.split("@");
      const [lat, lon] = coords.split(",").map(Number);
      const [name, ...aliases] = namesPart.split("|").map((n) => n.trim());
      return { rank: i + 1, name, aliases, millions: Number(millions), lat, lon };
    });
}

export const CITY_QUIZZES: CityQuiz[] = [
  {
    slug: "biggest-cities-asia",
    title: "Biggest Cities of Asia",
    blurb: "The 20 most populous metro areas in Asia, from Tokyo down.",
    region: "Asia",
    scene: "asia",
    cities: parse(`
      Tokyo = 37.0 @ 35.69, 139.69
      Delhi | New Delhi = 34.7 @ 28.61, 77.21
      Shanghai = 30.5 @ 31.23, 121.47
      Dhaka | Dacca = 24.7 @ 23.81, 90.41
      Beijing | Peking = 22.6 @ 39.90, 116.41
      Mumbai | Bombay = 22.1 @ 19.08, 72.88
      Osaka | Osaka-Kobe | Kobe = 18.9 @ 34.69, 135.50
      Chongqing | Chungking = 17.8 @ 29.56, 106.55
      Karachi = 17.6 @ 24.86, 67.01
      Kolkata | Calcutta = 15.8 @ 22.57, 88.36
      Manila | Metro Manila | Quezon City = 15.0 @ 14.60, 120.98
      Guangzhou | Canton | Guangzhou-Foshan = 14.6 @ 23.13, 113.26
      Lahore = 14.4 @ 31.55, 74.34
      Tianjin = 14.3 @ 39.13, 117.20
      Bangalore | Bengaluru = 13.6 @ 12.97, 77.59
      Shenzhen = 13.3 @ 22.54, 114.06
      Chennai | Madras = 12.3 @ 13.08, 80.27
      Jakarta = 11.4 @ -6.21, 106.85
      Bangkok | Krung Thep = 11.1 @ 13.76, 100.50
      Hyderabad = 11.1 @ 17.39, 78.49
    `),
  },
  {
    slug: "biggest-cities-europe",
    title: "Biggest Cities of Europe",
    blurb: "The 20 most populous metro areas in Europe, Istanbul and Moscow included.",
    region: "Europe",
    scene: "europe",
    cities: parse(`
      Istanbul | Constantinople = 15.9 @ 41.01, 28.98
      Moscow | Moskva = 12.7 @ 55.76, 37.62
      Paris = 11.3 @ 48.86, 2.35
      London = 9.8 @ 51.51, -0.13
      Madrid = 6.8 @ 40.42, -3.70
      Barcelona = 5.7 @ 41.39, 2.17
      Saint Petersburg | St Petersburg | Petersburg | Leningrad = 5.6 @ 59.93, 30.34
      Rome | Roma = 4.3 @ 41.90, 12.50
      Berlin = 3.6 @ 52.52, 13.40
      Milan | Milano = 3.2 @ 45.46, 9.19
      Athens | Athina = 3.2 @ 37.98, 23.73
      Kyiv | Kiev = 3.0 @ 50.45, 30.52
      Lisbon | Lisboa = 3.0 @ 38.72, -9.14
      Manchester = 2.8 @ 53.48, -2.24
      Birmingham = 2.7 @ 52.49, -1.89
      Naples | Napoli = 2.2 @ 40.85, 14.27
      Brussels | Bruxelles | Brussel = 2.1 @ 50.85, 4.35
      Minsk = 2.1 @ 53.90, 27.56
      Vienna | Wien = 2.0 @ 48.21, 16.37
      Hamburg = 1.8 @ 53.55, 9.99
    `),
  },
  {
    slug: "biggest-cities-north-america",
    title: "Biggest Cities of North America",
    blurb: "The 20 most populous metro areas from Canada to the Caribbean.",
    region: "North America",
    scene: "north-america",
    cities: parse(`
      Mexico City | Ciudad de Mexico | CDMX = 22.8 @ 19.43, -99.13
      New York | New York City | NYC = 19.2 @ 40.71, -74.01
      Los Angeles | LA = 12.7 @ 34.05, -118.24
      Chicago = 9.0 @ 41.88, -87.63
      Houston = 6.7 @ 29.76, -95.37
      Dallas | Dallas-Fort Worth | Fort Worth | DFW = 6.6 @ 32.78, -96.80
      Toronto = 6.4 @ 43.65, -79.38
      Miami = 6.4 @ 25.76, -80.19
      Atlanta = 5.9 @ 33.75, -84.39
      Philadelphia | Philly = 5.8 @ 39.95, -75.17
      Guadalajara = 5.6 @ 20.67, -103.35
      Washington | Washington DC | Washington D.C. | DC = 5.4 @ 38.91, -77.04
      Monterrey = 5.3 @ 25.69, -100.32
      Phoenix = 4.6 @ 33.45, -112.07
      Boston = 4.4 @ 42.36, -71.06
      Montreal | Montréal = 4.3 @ 45.50, -73.57
      Detroit = 3.8 @ 42.33, -83.05
      Seattle = 3.8 @ 47.61, -122.33
      Santo Domingo = 3.6 @ 18.49, -69.93
      San Francisco | SF | San Francisco Bay Area | Bay Area | Oakland = 3.6 @ 37.77, -122.42
    `),
  },
];

export function findCityQuiz(slug: string): CityQuiz | undefined {
  return CITY_QUIZZES.find((quiz) => quiz.slug === slug);
}
