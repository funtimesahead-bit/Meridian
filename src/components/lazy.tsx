"use client";

import dynamic from "next/dynamic";
import homeStyles from "@/app/home.module.css";

/* Map-based games carry a large country outline file, so they are loaded in
   the browser only when their page is opened. */

function Loading() {
  return (
    <div className="page loading" role="status">
      <span className="loading__spinner" aria-hidden="true" />
      Loading…
    </div>
  );
}

export const LazyHeroGlobe = dynamic(() => import("@/components/home/HeroGlobe"), {
  ssr: false,
  loading: () => <div className={homeStyles.globePlaceholder} />,
});

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

export const LazyExpedition = dynamic(() => import("@/dailies/expedition/Expedition"), {
  ssr: false,
  loading: Loading,
});

export const LazyQuickFire = dynamic(() => import("@/quizzes/quickfire/QuickFire"), {
  ssr: false,
  loading: Loading,
});

export const LazyCityRankQuiz = dynamic(() => import("@/quizzes/cities/CityRankQuiz"), {
  ssr: false,
  loading: Loading,
});

export const LazyUsHistory = dynamic(() => import("@/learn/us-history/UsHistory"), {
  ssr: false,
  loading: Loading,
});

export const LazyCountryQuiz = dynamic(
  () => import("@/quizzes/countries/CountryQuiz"),
  { ssr: false, loading: Loading },
);
