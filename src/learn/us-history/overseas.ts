/* US holdings outside the Newberry data: overseas territories, islands,
   leases, trusteeships and military administrations, with the dates each
   status began. Hawaii and Alaska come from the Newberry data instead.

   Dates are YYYYMMDD numbers. A period with no `to` is still current. */

export type OverseasStatus =
  | "territory"
  | "commonwealth"
  | "trust"
  | "occupied"
  | "leased"
  | "minor";

export type InsetId = "caribbean" | "central-pacific" | "western-pacific";

export type Period = {
  from: number;
  to?: number;
  status: OverseasStatus;
  /** What happened when this period began, for the year's change list. */
  note: string;
};

export type Holding = {
  id: string;
  name: string;
  inset: InsetId;
  /** Country outlines in the world map file; small islands use only `point`. */
  shapes?: string[];
  point: [number, number];
  periods: Period[];
  /** What happened when the last period ended, if it has. */
  endNote?: string;
};

export const STATUS_LABELS: Record<OverseasStatus, string> = {
  territory: "Territory",
  commonwealth: "Commonwealth",
  trust: "UN trust territory",
  occupied: "Military government",
  leased: "Leased",
  minor: "Minor island",
};

export const INSETS: Record<InsetId, { label: string; bounds: [[number, number], [number, number]] }> = {
  caribbean: { label: "Caribbean and Panama", bounds: [[-86.5, 7], [-63.5, 24.5]] },
  "central-pacific": { label: "Pacific islands", bounds: [[-180, -16], [-158.5, 29.5]] },
  "western-pacific": { label: "Western Pacific", bounds: [[115.5, 2.5], [172.5, 30.5]] },
};

export const HOLDINGS: Holding[] = [
  /* ---------------- Caribbean and Panama ---------------- */
  {
    id: "puerto-rico",
    name: "Puerto Rico",
    inset: "caribbean",
    shapes: ["Puerto Rico"],
    point: [-66.5, 18.2],
    periods: [
      {
        from: 18980725,
        status: "occupied",
        note: "US troops landed in Puerto Rico during the Spanish–American War and placed it under military government.",
      },
      {
        from: 18981210,
        status: "territory",
        note: "Spain ceded Puerto Rico to the United States in the Treaty of Paris.",
      },
      {
        from: 19520725,
        status: "commonwealth",
        note: "Puerto Rico became a self-governing commonwealth under its own constitution, still a US territory.",
      },
    ],
  },
  {
    id: "cuba",
    name: "Cuba",
    inset: "caribbean",
    shapes: ["Cuba"],
    point: [-79.5, 21.8],
    periods: [
      {
        from: 18990101,
        to: 19020519,
        status: "occupied",
        note: "Spain gave up Cuba, which came under US military government.",
      },
      {
        from: 19060929,
        to: 19090127,
        status: "occupied",
        note: "The United States occupied Cuba again after an uprising, under a provisional governor.",
      },
    ],
    endNote: "US military government in Cuba ended.",
  },
  {
    id: "guantanamo",
    name: "Guantánamo Bay",
    inset: "caribbean",
    point: [-75.15, 19.95],
    periods: [
      {
        from: 19031210,
        status: "leased",
        note: "Cuba leased Guantánamo Bay to the United States as a naval station.",
      },
    ],
  },
  {
    id: "virgin-islands",
    name: "US Virgin Islands",
    inset: "caribbean",
    shapes: ["U.S. Virgin Is."],
    point: [-64.85, 18.05],
    periods: [
      {
        from: 19170331,
        status: "territory",
        note: "The United States bought the Danish West Indies from Denmark for $25 million; they became the US Virgin Islands.",
      },
    ],
  },
  {
    id: "canal-zone",
    name: "Panama Canal Zone",
    inset: "caribbean",
    point: [-79.75, 9.1],
    periods: [
      {
        from: 19040226,
        to: 19790930,
        status: "territory",
        note: "Panama granted the United States the Canal Zone, a strip ten miles wide across the isthmus.",
      },
    ],
    endNote: "The Panama Canal Zone was abolished and most of it returned to Panama (the canal itself followed in 1999).",
  },
  {
    id: "corn-islands",
    name: "Corn Islands",
    inset: "caribbean",
    point: [-83.05, 12.17],
    periods: [
      {
        from: 19160622,
        to: 19710424,
        status: "leased",
        note: "Nicaragua leased the Corn Islands to the United States under the Bryan–Chamorro Treaty.",
      },
    ],
    endNote: "The Bryan–Chamorro Treaty ended and the Corn Islands lease returned to Nicaragua.",
  },
  {
    id: "navassa",
    name: "Navassa Island",
    inset: "caribbean",
    point: [-75.03, 18.4],
    periods: [
      {
        from: 18571207,
        status: "minor",
        note: "The United States claimed Navassa Island under the Guano Islands Act.",
      },
    ],
  },
  {
    id: "swan-islands",
    name: "Swan Islands",
    inset: "caribbean",
    point: [-83.9, 17.4],
    periods: [
      {
        from: 18630101,
        to: 19720831,
        status: "minor",
        note: "The United States claimed the Swan Islands under the Guano Islands Act.",
      },
    ],
    endNote: "The United States recognised Honduran sovereignty over the Swan Islands.",
  },

  /* ---------------- Central Pacific (Hawaii comes from the main data) ---------------- */
  {
    id: "baker",
    name: "Baker Island",
    inset: "central-pacific",
    point: [-176.48, 0.19],
    periods: [
      { from: 18571028, status: "minor", note: "The United States claimed Baker Island under the Guano Islands Act." },
    ],
  },
  {
    id: "howland",
    name: "Howland Island",
    inset: "central-pacific",
    point: [-176.62, 0.81],
    periods: [
      { from: 18571203, status: "minor", note: "The United States claimed Howland Island under the Guano Islands Act." },
    ],
  },
  {
    id: "jarvis",
    name: "Jarvis Island",
    inset: "central-pacific",
    point: [-160.02, -0.37],
    periods: [
      { from: 18580227, status: "minor", note: "The United States claimed Jarvis Island under the Guano Islands Act." },
    ],
  },
  {
    id: "johnston",
    name: "Johnston Atoll",
    inset: "central-pacific",
    point: [-169.53, 16.73],
    periods: [
      { from: 18580319, status: "minor", note: "The United States claimed Johnston Atoll under the Guano Islands Act." },
    ],
  },
  {
    id: "midway",
    name: "Midway Atoll",
    inset: "central-pacific",
    point: [-177.37, 28.21],
    periods: [
      { from: 18670828, status: "minor", note: "The United States took formal possession of Midway Atoll." },
    ],
  },
  {
    id: "palmyra",
    name: "Palmyra Atoll",
    inset: "central-pacific",
    point: [-162.08, 5.88],
    periods: [
      {
        from: 18980707,
        status: "minor",
        note: "Palmyra Atoll came to the United States with the annexation of Hawaii (it was left out of the state in 1959).",
      },
    ],
  },
  {
    id: "kingman",
    name: "Kingman Reef",
    inset: "central-pacific",
    point: [-162.42, 6.4],
    periods: [
      { from: 19220510, status: "minor", note: "The United States formally annexed Kingman Reef." },
    ],
  },
  {
    id: "american-samoa",
    name: "American Samoa",
    inset: "central-pacific",
    shapes: ["American Samoa"],
    point: [-170.7, -14.3],
    periods: [
      {
        from: 19000417,
        status: "territory",
        note: "The chiefs of Tutuila ceded the island to the United States, forming American Samoa (Manuʻa followed in 1904, Swains Island in 1925).",
      },
    ],
  },

  /* ---------------- Western Pacific ---------------- */
  {
    id: "guam",
    name: "Guam",
    inset: "western-pacific",
    shapes: ["Guam"],
    point: [144.79, 13.44],
    periods: [
      {
        from: 18980621,
        to: 18981209,
        status: "occupied",
        note: "The USS Charleston captured Guam from Spain.",
      },
      {
        from: 18981210,
        status: "territory",
        note: "Spain ceded Guam to the United States in the Treaty of Paris (it was occupied by Japan from 1941 to 1944).",
      },
    ],
  },
  {
    id: "philippines",
    name: "Philippines",
    inset: "western-pacific",
    shapes: ["Philippines"],
    point: [122, 12],
    periods: [
      {
        from: 18980813,
        to: 18981209,
        status: "occupied",
        note: "US forces took Manila from Spain.",
      },
      {
        from: 18981210,
        to: 19351114,
        status: "territory",
        note: "Spain ceded the Philippines to the United States for $20 million in the Treaty of Paris.",
      },
      {
        from: 19351115,
        to: 19460703,
        status: "commonwealth",
        note: "The Commonwealth of the Philippines was set up as a step toward independence (Japan occupied the islands from 1942 to 1945).",
      },
    ],
    endNote: "The Philippines became independent on 4 July 1946.",
  },
  {
    id: "wake",
    name: "Wake Island",
    inset: "western-pacific",
    point: [166.63, 19.29],
    periods: [
      { from: 18990117, status: "minor", note: "The United States took possession of Wake Island." },
    ],
  },
  {
    id: "northern-marianas",
    name: "Northern Mariana Islands",
    inset: "western-pacific",
    shapes: ["N. Mariana Is."],
    point: [145.75, 15.2],
    periods: [
      {
        from: 19470718,
        to: 19861102,
        status: "trust",
        note: "The UN made Japan's former Pacific mandate a trust territory run by the United States: the Trust Territory of the Pacific Islands.",
      },
      {
        from: 19861103,
        status: "commonwealth",
        note: "The Northern Mariana Islands left the trust territory and became a US commonwealth.",
      },
    ],
  },
  {
    id: "marshall-islands",
    name: "Marshall Islands",
    inset: "western-pacific",
    shapes: ["Marshall Is."],
    point: [171.2, 7.1],
    periods: [
      { from: 19470718, to: 19861020, status: "trust", note: "" },
    ],
    endNote: "The Marshall Islands became independent in free association with the United States.",
  },
  {
    id: "micronesia",
    name: "Micronesia",
    inset: "western-pacific",
    shapes: ["Micronesia"],
    point: [158.2, 6.9],
    periods: [
      { from: 19470718, to: 19861102, status: "trust", note: "" },
    ],
    endNote: "The Federated States of Micronesia became independent in free association with the United States.",
  },
  {
    id: "palau",
    name: "Palau",
    inset: "western-pacific",
    shapes: ["Palau"],
    point: [134.5, 7.4],
    periods: [
      { from: 19470718, to: 19940930, status: "trust", note: "" },
    ],
    endNote: "Palau became independent in free association with the United States, ending the trust territory.",
  },
  {
    id: "ryukyu",
    name: "Ryukyu Islands (Okinawa)",
    inset: "western-pacific",
    point: [127.8, 26.3],
    periods: [
      {
        from: 19450621,
        to: 19720514,
        status: "occupied",
        note: "After the Battle of Okinawa the Ryukyu Islands came under US administration.",
      },
    ],
    endNote: "The United States returned Okinawa and the Ryukyu Islands to Japan.",
  },
  {
    id: "bonin",
    name: "Bonin and Volcano Islands",
    inset: "western-pacific",
    point: [142.2, 27.1],
    periods: [
      {
        from: 19450326,
        to: 19680625,
        status: "occupied",
        note: "After the Battle of Iwo Jima the Bonin and Volcano Islands came under US administration.",
      },
    ],
    endNote: "The United States returned the Bonin and Volcano Islands, including Iwo Jima, to Japan.",
  },
];

/** Events that are not tied to one holding or unit. */
export const GENERAL_EVENTS: { d: number; n: string; text: string }[] = [
  {
    d: 17760704,
    n: "Declaration of Independence",
    text: "The thirteen colonies declared independence from Britain as states. Their western borders were not settled; the map shows them as agreed in 1783.",
  },
  {
    d: 17830903,
    n: "Treaty of Paris",
    text: "Britain recognised American independence. The new nation stretched from the Atlantic to the Mississippi River, between British Canada and Spanish Florida.",
  },
];

/**
 * The status of a holding on a given date, if the US held it then.
 * A period without `to` lasts until the next period begins (or to today).
 */
export function holdingStatus(holding: Holding, date: number): Period | null {
  const { periods } = holding;
  for (let i = periods.length - 1; i >= 0; i--) {
    const p = periods[i];
    if (p.from > date) continue;
    const next = periods[i + 1];
    const end = p.to ?? (next ? next.from - 1 : Infinity);
    return end >= date ? p : null;
  }
  return null;
}
