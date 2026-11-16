import type { Metadata } from "next";
import Link from "next/link";
import { LazyExpedition } from "@/components/lazy";
import { EXPEDITION_OPEN } from "@/dailies/expedition/config";

export const metadata: Metadata = {
  title: "Expedition",
  description: "Eight geography prompts a day. The rarer your answer, the more it scores.",
};

export default function ExpeditionPage() {
  if (!EXPEDITION_OPEN) {
    // Someone with a direct link gets the same message as the Dailies popup.
    return (
      <main className="page">
        <div className="popup__body popup__body--page">
          <h1 id="expedition-soon-title">Expedition opens soon</h1>
          <p>
            Expedition scores you on how rare your answers are, so it needs to know what
            people usually answer first. Help set it up by playing a few rounds of Quick Fire:
            ten fast questions, answered however you like.
          </p>
          <div className="popup__actions">
            <Link href="/dailies" className="popup__secondary">
              Back to Dailies
            </Link>
            <Link href="/quizzes/quick-fire" className="popup__primary">
              Play Quick Fire
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <LazyExpedition />
    </main>
  );
}
