import Link from "next/link";
import { SITE_NAME, TABS } from "@/lib/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Link href="/" className="brand">
            <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden="true">
              <circle cx="13" cy="13" r="11" fill="none" stroke="#32425a" strokeWidth="1.5" />
              <ellipse cx="13" cy="13" rx="4.6" ry="11" fill="none" stroke="#32425a" strokeWidth="1.5" />
              <line x1="13" y1="1.5" x2="13" y2="24.5" stroke="#f6b73c" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="13" cy="9" r="2.6" fill="#f6b73c" />
            </svg>
            <span>{SITE_NAME}</span>
          </Link>
          <p>Free geography games. Your scores stay in your browser; no account needed.</p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer">
          <Link href="/">Home</Link>
          {TABS.map((tab) => (
            <Link key={tab.href} href={tab.href}>
              {tab.label}
            </Link>
          ))}
        </nav>

        <p className="site-footer__credits">
          Maps: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>{" "}
          via world-atlas. Cities:{" "}
          <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a> (CC BY 4.0).
          Historical US boundaries:{" "}
          <a href="https://digital.newberry.org/ahcb/" target="_blank" rel="noreferrer">
            Newberry Library
          </a>{" "}
          (CC BY-NC-SA 4.0). Flags:{" "}
          <a href="https://github.com/lipis/flag-icons" target="_blank" rel="noreferrer">
            flag-icons
          </a>{" "}
          (MIT) and{" "}
          <a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">
            Wikimedia Commons
          </a>{" "}
          (public domain).
        </p>
      </div>
    </footer>
  );
}
