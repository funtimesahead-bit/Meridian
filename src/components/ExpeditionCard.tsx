"use client";

import { useRef } from "react";
import Link from "next/link";
import { CardArt } from "@/components/CardArt";
import { ExpeditionStatus } from "@/components/ExpeditionStatus";
import { EXPEDITION_OPEN } from "@/dailies/expedition/config";

/* The Expedition card on the Dailies tab. While the Expedition is closed,
   it opens a popup that points players to Quick Fire instead. */

function CardBody({ open }: { open: boolean }) {
  return (
    <>
      <div className="game-card__art">
        <CardArt kind="trail" />
      </div>
      <div className="game-card__body">
        <h2 className="game-card__title">Expedition</h2>
        <p className="game-card__blurb">
          Eight stops, one answer each. Anyone can name the obvious answer; the rarer yours is,
          the more it scores.
        </p>
        <div className="tag-row">
          <span className="tag">Daily</span>
          <span className="tag">Rarity</span>
          <span className="tag">Typing</span>
        </div>
        <div className="game-card__foot">
          {open ? <ExpeditionStatus /> : <span className="card-best">Opening soon</span>}
          <span className={`play-pill ${open ? "" : "play-pill--off"}`}>
            {open ? "Play" : "Soon"}
          </span>
        </div>
      </div>
    </>
  );
}

export function ExpeditionCard() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (EXPEDITION_OPEN) {
    return (
      <Link href="/dailies/expedition" className="game-card">
        <CardBody open />
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className="game-card game-card--button"
        onClick={() => dialogRef.current?.showModal()}
        aria-haspopup="dialog"
      >
        <CardBody open={false} />
      </button>
      <ExpeditionSoonDialog ref={dialogRef} />
    </>
  );
}

export function ExpeditionSoonDialog({ ref }: { ref: React.Ref<HTMLDialogElement> }) {
  return (
    <dialog
      ref={ref}
      className="popup"
      aria-labelledby="expedition-soon-title"
      onClick={(event) => {
        // A click on the dimmed backdrop (the dialog itself) closes it.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="popup__body">
        <h2 id="expedition-soon-title">Expedition opens soon</h2>
        <p>
          Expedition scores you on how rare your answers are, so it needs to know what
          people usually answer first. Help set it up by playing a few rounds of Quick Fire:
          ten fast questions, answered however you like.
        </p>
        <div className="popup__actions">
          <form method="dialog">
            <button type="submit" className="popup__secondary">
              Not now
            </button>
          </form>
          <Link href="/quizzes/quick-fire" className="popup__primary">
            Play Quick Fire
          </Link>
        </div>
      </div>
    </dialog>
  );
}
