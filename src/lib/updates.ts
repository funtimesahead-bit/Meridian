/* Meridian's version history, shown at the bottom of the home page.
   Newest first. Versions are BIG.SMALL.FIX: a big update bumps the first
   number, a small update the second, and bug fixes the last two digits. */

export type Update = {
  version: string;
  /** ISO date of the release. */
  date: string;
  title: string;
  notes: string[];
};

export const UPDATES: Update[] = [
  {
    version: "2.0.00",
    date: "2026-11-20",
    title: "Five new ways to play",
    notes: [
      "New daily, Unfurl: today's flag is hidden under tiles, and every wrong guess lifts four more. Six guesses, with a continent hint after three.",
      "New game, Neighbours: a country lights up on a map with all the borders drawn but no names. Name every country it touches by land.",
      "New game, Due North: pick which of two cities is further north, further south, or closer to the Equator. The map then shows both lines of latitude.",
      "New quizzes, Find the Country: a country is named and you click it on the map. One for every continent, three tries each, scored on accuracy.",
      "New in Learn, Day and Night: see where it is day and night for any date and time, play through a day or a whole year, and click anywhere for its daylight hours.",
      "Find on the map links added to each continent on the home page.",
    ],
  },
  {
    version: "1.2.00",
    date: "2026-11-20",
    title: "Europe Through Time",
    notes: [
      "New in Learn: an interactive map of Europe's borders from 1492 to today.",
      "Key-year maps from 1492 to 1880, then a map for every year from 1886, including both world wars, occupations and the breakup of the Soviet Union and Yugoslavia.",
      "Each key year has a short explainer, and more than 100 dated events say what changed and why.",
      "Hover or tap any country to see what it was and who ruled it. Zoom and pan to see small states, and use the arrow keys or Play to move through time.",
      "Links can open on a year, for example /learn/europe-history?year=1815.",
    ],
  },
  {
    version: "1.1.00",
    date: "2026-11-19",
    title: "Capitals quizzes",
    notes: [
      "New Capitals section with eight quizzes: the whole world, every continent, and the 50 US state capitals.",
      "Type capitals in any order and each one fills in next to its country, with an optional map where every capital is marked.",
      "Countries with more than one capital, such as South Africa and Bolivia, accept any of them. Older spellings like Kiev count too.",
      "The US capitals map shows state borders, Alaska and Hawaii included.",
      "Capitals links added to each continent on the home page.",
    ],
  },
  {
    version: "1.0.00",
    date: "2026-11-19",
    title: "Expedition launches, plus flag quizzes",
    notes: [
      "Expedition is open: a new daily with eight stops, where rarer right answers score more. Today is Expedition #1.",
      "Each answer now climbs an altitude gauge from Common to Legendary, with points counting up and a badge stamped where it lands.",
      "The results screen replays your route stop by stop as your total ticks up.",
      "Sound effects for Expedition, with a mute button that remembers your choice.",
      "Rarity estimates retuned using the first Quick Fire answers. Thanks to everyone who played.",
      "New flag quizzes for every continent and the 50 US states: click the named flag, three tries each, scored on accuracy.",
      "This update tracker.",
    ],
  },
];

export const VERSION = UPDATES[0].version;
