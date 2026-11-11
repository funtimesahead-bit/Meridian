import { ALL_CITIES, type City } from "./cities";

/**
 * Reduce a name to a comparable key: no accents, case, punctuation or spaces.
 * "São Paulo" -> "saopaulo", "St. Louis" / "Saint Louis" -> "stlouis".
 */
export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/[đð]/g, "d")
    .replace(/ł/g, "l")
    .replace(/ı/g, "i")
    .replace(/\bsaint\b/g, "st")
    .replace(/[^a-z0-9]+/g, "");
}

/** Edit distance where swapping two neighbouring letters counts as one edit. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () =>
    new Array<number>(cols).fill(0),
  );
  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** How many typos to forgive for a name of this length. */
function allowedTypos(length: number): number {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  return 2;
}

function keysFor(city: City): string[] {
  return [city.name, ...city.alt].map(normalize);
}

/** Every accepted name of every city, used to stop typos matching the wrong place. */
const KNOWN_KEYS = new Map<string, Set<string>>();
for (const city of ALL_CITIES) {
  for (const key of keysFor(city)) {
    if (!KNOWN_KEYS.has(key)) KNOWN_KEYS.set(key, new Set());
    KNOWN_KEYS.get(key)!.add(city.id);
  }
}

export function isCorrectGuess(guess: string, city: City): boolean {
  const g = normalize(guess);
  if (!g) return false;

  const keys = keysFor(city);
  if (keys.includes(g)) return true;

  // The guess is exactly another city's name: that is a wrong answer, not a typo.
  const owners = KNOWN_KEYS.get(g);
  if (owners && !owners.has(city.id)) return false;

  return keys.some((key) => {
    const budget = allowedTypos(key.length);
    if (budget === 0 || Math.abs(key.length - g.length) > budget) return false;
    return editDistance(g, key) <= budget;
  });
}
