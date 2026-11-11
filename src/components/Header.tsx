"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAME, TABS } from "@/lib/site";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/games" className="brand" aria-label={`${SITE_NAME} home`}>
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <circle cx="13" cy="13" r="11" fill="none" stroke="#32425a" strokeWidth="1.5" />
            <ellipse cx="13" cy="13" rx="4.6" ry="11" fill="none" stroke="#32425a" strokeWidth="1.5" />
            <line x1="13" y1="1.5" x2="13" y2="24.5" stroke="#f6b73c" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="13" cy="9" r="2.6" fill="#f6b73c" />
          </svg>
          <span>{SITE_NAME}</span>
        </Link>

        <nav className="tabs" aria-label="Sections">
          {TABS.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="tab"
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
