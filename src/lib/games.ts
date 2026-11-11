/** Registry of games shown on the Games tab. Add new games here. */
export type GameInfo = {
  slug: string;
  title: string;
  blurb: string;
  tags: string[];
  /** Which picture the card shows. */
  art: "dot" | "pin" | "rings" | "ring" | "route";
  /** Where the game's best scores are saved (see src/lib/scores.ts). */
  scoreKey?: string;
};

export const GAMES: GameInfo[] = [
  {
    slug: "name-the-city",
    title: "Name the City",
    blurb:
      "A dot lights up on a blank world map. No borders, no labels. Type the city it marks.",
    tags: ["Cities", "World", "Typing"],
    art: "dot",
  },
  {
    slug: "pin-drop",
    title: "Pin Drop",
    blurb:
      "You get a country and a borderless map. Drop a pin on it: inside is full marks, and near misses still score.",
    tags: ["Countries", "World", "Clicking"],
    art: "pin",
    scoreKey: "pin-drop",
  },
  {
    slug: "ring-of-five",
    title: "Ring of Five",
    blurb:
      "A ring is drawn around a city. Name five cities inside it, then five more in each wider band.",
    tags: ["Cities", "World", "Typing"],
    art: "rings",
    scoreKey: "ring-five",
  },
  {
    slug: "biggest-in-the-ring",
    title: "Biggest in the Ring",
    blurb:
      "Same rings, one answer: name the most populous city in each band. Three strikes per ring.",
    tags: ["Cities", "Population", "Typing"],
    art: "ring",
    scoreKey: "ring-biggest",
  },
  {
    slug: "border-run",
    title: "Border Run",
    blurb:
      "Two countries, joined by land. Name the countries in between to build the shortest route across the borders.",
    tags: ["Countries", "Borders", "Typing"],
    art: "route",
    scoreKey: "border-run",
  },
];
