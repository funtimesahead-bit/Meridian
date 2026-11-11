import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Dailies" };

export default function DailiesPage() {
  return (
    <main className="page">
      <div className="page-head">
        <h1>Dailies</h1>
        <p>One fresh challenge a day, the same for everyone.</p>
      </div>

      <div className="empty">
        <h2>No dailies yet</h2>
        <p>
          Daily challenges will show up here once they are built. Until then,
          the Games tab has something to play.
        </p>
        <Link href="/games">Go to Games →</Link>
      </div>
    </main>
  );
}
