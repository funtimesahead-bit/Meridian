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
