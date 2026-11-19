/* The Civil War: the eleven states that seceded and joined the Confederacy.
   While a state was out of the Union, the map shows it in the
   "claimed, disputed or independent" colour. Dates are YYYYMMDD. */

/** Armed resistance effectively ended; President Johnson declared it so on 10 May 1865. */
export const WAR_END = 18650509;

/** Boundary unit id -> the date the state seceded. */
export const SECEDED: Record<string, { name: string; date: number }> = {
  sc_state: { name: "South Carolina", date: 18601220 },
  ms_state: { name: "Mississippi", date: 18610109 },
  fl_state: { name: "Florida", date: 18610110 },
  al_state: { name: "Alabama", date: 18610111 },
  ga_state: { name: "Georgia", date: 18610119 },
  la_state: { name: "Louisiana", date: 18610126 },
  tx_state: { name: "Texas", date: 18610201 },
  va_state: { name: "Virginia", date: 18610417 },
  ar_state: { name: "Arkansas", date: 18610506 },
  nc_state: { name: "North Carolina", date: 18610520 },
  tn_state: { name: "Tennessee", date: 18610608 },
};

/** Whether a unit was a seceded state on a date. */
export function isSeceded(unitId: string, date: number): boolean {
  const s = SECEDED[unitId];
  return Boolean(s && date >= s.date && date <= WAR_END);
}

export const CIVIL_WAR_EVENTS: { d: number; n: string; text: string }[] = [
  ...Object.values(SECEDED).map((s) => ({
    d: s.date,
    n: s.name,
    text: `${s.name} declared its secession from the Union and joined the Confederacy. The United States never recognised secession.`,
  })),
  {
    d: 18610208,
    n: "Confederate States of America",
    text: "The seceded states formed the Confederate States of America at Montgomery, Alabama.",
  },
  {
    d: 18610412,
    n: "Fort Sumter",
    text: "Confederate forces fired on Fort Sumter in Charleston Harbor, starting the Civil War.",
  },
  {
    d: 18650409,
    n: "Appomattox",
    text: "General Lee surrendered the Army of Northern Virginia at Appomattox Court House.",
  },
  {
    d: 18650510,
    n: "End of the Confederacy",
    text: "President Johnson declared armed resistance virtually at an end. The seceded states were brought back under federal control, beginning Reconstruction.",
  },
];
