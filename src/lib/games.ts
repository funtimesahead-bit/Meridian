/** Registry of games shown on the Games tab. Add new games here. */
export type GameInfo = {
  slug: string;
  title: string;
  blurb: string;
  tags: string[];
  /** Games without a page yet are listed as "coming soon". */
  available: boolean;
};

export const GAMES: GameInfo[] = [
  {
    slug: "name-the-city",
    title: "Name the City",
    blurb:
      "A dot lights up on a blank world map. No borders, no labels. Type the city it marks.",
    tags: ["Cities", "World", "Typing"],
    available: true,
  },
];
