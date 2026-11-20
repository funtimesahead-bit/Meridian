import type { Prompt } from "./prompts";

/* Hand-tuned starting weights for prompts where a country's general fame is
   a poor guide to what people actually say. "A country on the Baltic Sea"
   makes people think of the Baltic states, not the most famous countries.

   Weights are relative (about 10 = the obvious answer, 1 = a deep cut).
   They mix with real Quick Fire answers in scoring.ts; answer ids are
   untouched, so data already collected still applies. Checked against the
   first ~100 Quick Fire answers (19 Nov 2026), which agreed where they
   existed (e.g. Estonia for the Baltic, Lebanon for Israel's neighbours). */

export const WEIGHT_OVERRIDES: Record<string, Record<string, number>> = {
  equator: {
    Ecuador: 10, Brazil: 6, Kenya: 5, Colombia: 4, Indonesia: 4, Uganda: 3,
    "DR Congo": 3, Gabon: 2, Somalia: 2, "Republic of the Congo": 2,
    Maldives: 1, Kiribati: 1, "São Tomé and Príncipe": 1,
  },
  "landlocked-europe": {
    Switzerland: 10, Austria: 8, Czechia: 5, Hungary: 5, Luxembourg: 4,
    Liechtenstein: 4, "Vatican City": 4, "San Marino": 3, Andorra: 3,
    Slovakia: 3, Belarus: 3, Serbia: 2, Moldova: 2, "North Macedonia": 2, Kosovo: 2,
  },
  "landlocked-asia": {
    Mongolia: 9, Afghanistan: 8, Nepal: 7, Kazakhstan: 6, Laos: 5, Bhutan: 4,
    Uzbekistan: 3, Kyrgyzstan: 2, Tajikistan: 2, Turkmenistan: 2, Armenia: 2, Azerbaijan: 2,
  },
  "landlocked-africa": {
    Ethiopia: 6, Chad: 6, Mali: 6, Niger: 5, Uganda: 5, Rwanda: 5, Zimbabwe: 5,
    Botswana: 5, Zambia: 4, "Burkina Faso": 3, "Central African Republic": 3,
    "South Sudan": 3, Malawi: 3, Lesotho: 3, Burundi: 2, Eswatini: 2,
  },
  "south-america": {
    Brazil: 10, Argentina: 9, Chile: 6, Peru: 6, Colombia: 6, Venezuela: 4,
    Ecuador: 3, Bolivia: 3, Uruguay: 3, Paraguay: 2, Guyana: 1, Suriname: 1,
  },
  "central-america": {
    Panama: 8, "Costa Rica": 8, Guatemala: 6, Honduras: 5, Nicaragua: 4,
    "El Salvador": 4, Belize: 3,
  },
  stan: {
    Pakistan: 9, Afghanistan: 8, Kazakhstan: 8, Uzbekistan: 5, Turkmenistan: 3,
    Tajikistan: 3, Kyrgyzstan: 3,
  },
  mediterranean: {
    Italy: 10, Spain: 9, Greece: 9, France: 8, Turkey: 7, Egypt: 6, Croatia: 5,
    Cyprus: 4, Malta: 4, Morocco: 4, Libya: 4, Tunisia: 4, Israel: 4, Monaco: 3,
    Lebanon: 3, Algeria: 3, Syria: 2, Albania: 2, Montenegro: 2,
    "Bosnia and Herzegovina": 1, Slovenia: 1, Palestine: 1,
  },
  "black-sea": { Ukraine: 8, Turkey: 8, Russia: 7, Romania: 5, Bulgaria: 5, Georgia: 4 },
  "baltic-sea": {
    Estonia: 8, Sweden: 8, Latvia: 7, Lithuania: 7, Finland: 7, Poland: 5,
    Germany: 5, Russia: 5, Denmark: 4,
  },
  "caspian-sea": { Kazakhstan: 7, Iran: 7, Azerbaijan: 7, Russia: 6, Turkmenistan: 5 },
  "red-sea": {
    Egypt: 10, "Saudi Arabia": 8, Yemen: 5, Sudan: 4, Eritrea: 4, Djibouti: 2,
    Israel: 2, Jordan: 2,
  },
  "arabian-peninsula": {
    "Saudi Arabia": 10, Yemen: 6, Qatar: 6, "United Arab Emirates": 6, Oman: 5,
    Kuwait: 4, Bahrain: 3,
  },
  "caribbean-islands": {
    Cuba: 10, Jamaica: 9, "Dominican Republic": 6, Bahamas: 6, Haiti: 5,
    Barbados: 4, "Trinidad and Tobago": 3, "Saint Lucia": 2, Grenada: 2,
    "Antigua and Barbuda": 2, Dominica: 1, "Saint Kitts and Nevis": 1,
    "Saint Vincent and the Grenadines": 1,
  },
  spanish: {
    Spain: 10, Mexico: 10, Argentina: 6, Colombia: 5, Peru: 4, Chile: 4,
    Cuba: 3, Venezuela: 3, Ecuador: 2, Bolivia: 2, Uruguay: 2, Paraguay: 2,
    Guatemala: 2, Honduras: 2, "Costa Rica": 2, Panama: 2, Nicaragua: 1,
    "El Salvador": 1, "Dominican Republic": 2, "Equatorial Guinea": 1,
  },
  portuguese: {
    Brazil: 10, Portugal: 10, Angola: 4, Mozambique: 4, "Cabo Verde": 2,
    "Guinea-Bissau": 1, "Timor-Leste": 1, "São Tomé and Príncipe": 1,
    "Equatorial Guinea": 0.5,
  },
  "borders-israel": { Egypt: 7, Jordan: 6, Lebanon: 6, Syria: 5, Palestine: 3 },
};

/** Apply the hand-tuned weights to the prompts they name. */
export function applyWeightOverrides(prompts: Prompt[]): Prompt[] {
  return prompts.map((prompt) => {
    const overrides = WEIGHT_OVERRIDES[prompt.id];
    if (!overrides) return prompt;
    return {
      ...prompt,
      answers: prompt.answers.map((a) =>
        overrides[a.name] !== undefined ? { ...a, weight: overrides[a.name] } : a,
      ),
    };
  });
}
