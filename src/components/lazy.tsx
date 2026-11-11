"use client";

import dynamic from "next/dynamic";

/* Map-based games carry a large country outline file, so they are loaded in
   the browser only when their page is opened. */

function Loading() {
  return (
    <div className="page" style={{ color: "var(--faint)" }}>
      Loading…
    </div>
  );
}

export const LazyPinDrop = dynamic(() => import("@/games/pin-drop/PinDrop"), {
  ssr: false,
  loading: Loading,
});

export const LazyRingGame = dynamic(() => import("@/games/rings/RingGame"), {
  ssr: false,
  loading: Loading,
});

export const LazyBorderRun = dynamic(() => import("@/games/border-run/BorderRun"), {
  ssr: false,
  loading: Loading,
});

export const LazyCountryQuiz = dynamic(
  () => import("@/quizzes/countries/CountryQuiz"),
  { ssr: false, loading: Loading },
);
