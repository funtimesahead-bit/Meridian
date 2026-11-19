import type { Metadata } from "next";
import { ExpeditionCard } from "@/components/ExpeditionCard";

export const metadata: Metadata = { title: "Dailies" };

export default function DailiesPage() {
  return (
    <main className="page">
      <div className="page-head">
        <p className="page-head__eyebrow">New every day</p>
        <h1>Dailies</h1>
        <p>One fresh challenge a day, the same for everyone. Come back tomorrow for the next.</p>
      </div>

      <div className="card-grid">
        <ExpeditionCard />
        <div className="soon-card">
          <strong>More dailies on the way</strong>
          <span>New daily challenges are in the works.</span>
        </div>
      </div>
    </main>
  );
}
