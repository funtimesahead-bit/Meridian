export type Difficulty = "easy" | "medium" | "hard";

export type PinCountry = {
  name: string;
  /** Names of this country's shapes in the map outline file. */
  shapes: string[];
};

/** `c("Bolivia")`, or `c("United States", "United States of America")` when the map file uses another name. */
function c(name: string, ...shapes: string[]): PinCountry {
  return { name, shapes: shapes.length ? shapes : [name] };
}

/** Easy: big or unmistakable countries. */
const EASY: PinCountry[] = [
  c("United States", "United States of America"),
  c("Canada"), c("Mexico"), c("Brazil"), c("Argentina"), c("Chile"), c("Peru"),
  c("Colombia"), c("Cuba"), c("United Kingdom"), c("Ireland"), c("France"),
  c("Spain"), c("Portugal"), c("Italy"), c("Germany"), c("Poland"), c("Greece"),
  c("Norway"), c("Sweden"), c("Finland"), c("Iceland"), c("Ukraine"), c("Russia"),
  c("Turkey"), c("Egypt"), c("Algeria"), c("Nigeria"), c("South Africa"),
  c("Madagascar"), c("Saudi Arabia"), c("Iran"), c("Kazakhstan"), c("India"),
  c("Pakistan"), c("China"), c("Mongolia"), c("Japan"), c("South Korea"),
  c("Thailand"), c("Indonesia"), c("Philippines"), c("Australia"), c("New Zealand"),
];

/** Medium: countries most people have heard of but may struggle to place. */
const MEDIUM: PinCountry[] = [
  c("Venezuela"), c("Ecuador"), c("Bolivia"), c("Paraguay"), c("Uruguay"),
  c("Guatemala"), c("Costa Rica"), c("Panama"), c("Jamaica"), c("Haiti"),
  c("Dominican Republic", "Dominican Rep."),
  c("Netherlands"), c("Belgium"), c("Switzerland"), c("Austria"), c("Denmark"),
  c("Czechia"), c("Hungary"), c("Romania"), c("Bulgaria"), c("Serbia"),
  c("Croatia"), c("Belarus"), c("Morocco"), c("Tunisia"), c("Libya"), c("Sudan"),
  c("Ethiopia"), c("Somalia", "Somalia", "Somaliland"), c("Kenya"), c("Tanzania"),
  c("DR Congo", "Dem. Rep. Congo"), c("Angola"), c("Namibia"), c("Botswana"),
  c("Zambia"), c("Zimbabwe"), c("Mozambique"), c("Cameroon"), c("Ghana"),
  c("Mali"), c("Niger"), c("Chad"), c("Israel"), c("Jordan"), c("Syria"),
  c("Iraq"), c("Yemen"), c("Oman"), c("United Arab Emirates"), c("Afghanistan"),
  c("Uzbekistan"), c("Turkmenistan"), c("Nepal"), c("Bangladesh"), c("Sri Lanka"),
  c("Myanmar"), c("Vietnam"), c("Cambodia"), c("Laos"), c("Malaysia"),
  c("North Korea"), c("Taiwan"), c("Papua New Guinea"),
];

/** Hard: small, tucked-away or rarely mentioned countries. */
const HARD: PinCountry[] = [
  c("Belize"), c("Honduras"), c("El Salvador"), c("Nicaragua"), c("Bahamas"),
  c("Trinidad and Tobago"), c("Guyana"), c("Suriname"),
  c("Estonia"), c("Latvia"), c("Lithuania"), c("Moldova"), c("Slovakia"),
  c("Slovenia"), c("Bosnia and Herzegovina", "Bosnia and Herz."), c("Montenegro"),
  c("Albania"), c("North Macedonia", "Macedonia"), c("Kosovo"), c("Luxembourg"),
  c("Cyprus", "Cyprus", "N. Cyprus"), c("Malta"),
  c("Georgia"), c("Armenia"), c("Azerbaijan"), c("Lebanon"), c("Kuwait"),
  c("Qatar"), c("Bahrain"), c("Kyrgyzstan"), c("Tajikistan"), c("Bhutan"),
  c("Brunei"), c("Timor-Leste"), c("Singapore"),
  c("Mauritania"), c("Senegal"), c("Gambia"), c("Guinea-Bissau"), c("Guinea"),
  c("Sierra Leone"), c("Liberia"), c("Côte d'Ivoire"), c("Burkina Faso"),
  c("Togo"), c("Benin"), c("Central African Republic", "Central African Rep."),
  c("South Sudan", "S. Sudan"), c("Eritrea"), c("Djibouti"), c("Uganda"),
  c("Rwanda"), c("Burundi"), c("Republic of the Congo", "Congo"), c("Gabon"),
  c("Equatorial Guinea", "Eq. Guinea"), c("Malawi"), c("Lesotho"),
  c("Eswatini", "eSwatini"), c("Cabo Verde"), c("Comoros"), c("Mauritius"),
  c("Fiji"), c("Solomon Islands", "Solomon Is."), c("Vanuatu"),
];

export const COUNTRY_POOLS: Record<Difficulty, PinCountry[]> = {
  easy: EASY,
  medium: MEDIUM,
  hard: HARD,
};

export function pickCountries(difficulty: Difficulty, count: number): PinCountry[] {
  const pool = [...COUNTRY_POOLS[difficulty]];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export const MAX_POINTS = 1000;

/** Full marks inside the country; outside, points fall away with distance. */
export function pointsFor(inside: boolean, km: number): number {
  if (inside) return MAX_POINTS;
  return Math.round(MAX_POINTS * Math.exp(-km / 600));
}
