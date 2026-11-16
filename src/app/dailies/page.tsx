import type { Metadata } from "next";
import { ExpeditionCard } from "@/components/ExpeditionCard";

export const metadata: Metadata = { title: "Dailies" };

export default function DailiesPage() {
  return (
    <main className="page">
      <div className="page-head">
        <h1>Dailies</h1>
        <p>One fresh challenge a day, the same for everyone.</p>
      </div>

      <div className="card-grid">
        <ExpeditionCard />
      </div>
    </main>
  );
}
