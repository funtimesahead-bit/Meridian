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

CITY_QUIZZES.push(
  {
    slug: "biggest-cities-south-america",
    title: "Biggest Cities of South America",
    blurb: "The 20 most populous metro areas from Bogotá to Buenos Aires.",
    region: "South America",
    scene: "south-america",
    cities: parse(`
      São Paulo | Sao Paulo = 22.8 @ -23.55, -46.63
      Buenos Aires = 15.8 @ -34.60, -58.38
      Rio de Janeiro | Rio = 13.8 @ -22.91, -43.17
      Bogotá | Bogota = 11.7 @ 4.71, -74.07
      Lima = 11.4 @ -12.05, -77.04
      Santiago | Santiago de Chile = 6.9 @ -33.45, -70.67
      Belo Horizonte = 6.3 @ -19.92, -43.94
      Brasília | Brasilia = 4.8 @ -15.79, -47.88
      Recife = 4.3 @ -8.05, -34.88
      Porto Alegre = 4.2 @ -30.03, -51.23
      Fortaleza = 4.2 @ -3.73, -38.53
      Medellín | Medellin = 4.1 @ 6.24, -75.58
      Salvador | Salvador da Bahia = 3.9 @ -12.97, -38.50
      Curitiba = 3.8 @ -25.43, -49.27
      Asunción | Asuncion = 3.6 @ -25.26, -57.58
      Campinas = 3.4 @ -22.91, -47.06
      Guayaquil = 3.1 @ -2.19, -79.89
      Caracas = 3.0 @ 10.48, -66.90
      Cali | Santiago de Cali = 2.9 @ 3.45, -76.53
      Goiânia | Goiania = 2.8 @ -16.69, -49.26
    `),
  },
  {
    slug: "biggest-cities-africa",
    title: "Biggest Cities of Africa",
    blurb: "The 20 most populous metro areas, from Cairo to Cape Town.",
    region: "Africa",
    scene: "africa",
    cities: parse(`
      Cairo = 23.1 @ 30.04, 31.24
      Kinshasa = 17.0 @ -4.44, 15.27
      Lagos = 16.5 @ 6.52, 3.38
      Luanda = 9.7 @ -8.84, 13.23
      Dar es Salaam = 8.6 @ -6.79, 39.21
      Khartoum = 6.8 @ 15.50, 32.56
      Johannesburg | Joburg | Jo'burg = 6.4 @ -26.20, 28.05
      Abidjan = 5.9 @ 5.36, -4.01
      Alexandria = 5.7 @ 31.20, 29.92
      Addis Ababa | Addis = 5.7 @ 9.03, 38.74
      Nairobi = 5.5 @ -1.29, 36.82
      Cape Town = 5.1 @ -33.92, 18.42
      Kano = 4.6 @ 12.00, 8.52
      Yaoundé | Yaounde = 4.5 @ 3.85, 11.50
      Douala = 4.2 @ 4.05, 9.70
      Casablanca = 4.0 @ 33.57, -7.59
      Ibadan = 4.0 @ 7.38, 3.95
      Kampala = 4.0 @ 0.35, 32.58
      Abuja = 4.0 @ 9.06, 7.49
      Antananarivo | Tana = 4.0 @ -18.88, 47.51
    `),
  },
  {
    slug: "biggest-cities-oceania",
    title: "Biggest Cities of Oceania",
    blurb: "The 15 most populous urban areas in Australia, New Zealand and the Pacific, Hawaii included.",
    region: "Oceania",
    scene: "oceania-cities",
    cities: parse(`
      Sydney = 5.5 @ -33.87, 151.21
      Melbourne = 5.3 @ -37.81, 144.96
      Brisbane = 2.7 @ -27.47, 153.03
      Perth = 2.3 @ -31.95, 115.86
      Auckland = 1.7 @ -36.85, 174.76
      Adelaide = 1.4 @ -34.93, 138.60
      Honolulu = 1.0 @ 21.31, -157.86
      Gold Coast = 0.73 @ -28.02, 153.40
      Newcastle = 0.52 @ -32.93, 151.78
      Canberra = 0.48 @ -35.28, 149.13
      Wellington = 0.44 @ -41.29, 174.78
      Port Moresby = 0.42 @ -9.44, 147.18
      Christchurch = 0.40 @ -43.53, 172.64
      Sunshine Coast = 0.38 @ -26.65, 153.07
      Wollongong = 0.31 @ -34.42, 150.89
    `),
  },
);

export function findCityQuiz(slug: string): CityQuiz | undefined {
  return CITY_QUIZZES.find((quiz) => quiz.slug === slug);
}
