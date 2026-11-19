import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <div className="empty empty--lost">
        <p className="empty__code mono">404</p>
        <h1>Off the edge of the map</h1>
        <p>This page doesn&apos;t exist, or it has moved. Here be dragons.</p>
        <div className="empty__actions">
          <Link href="/">Back home</Link>
          <Link href="/games">Browse games →</Link>
        </div>
      </div>
    </main>
  );
}
