"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/practice", label: "Practice" },
  { href: "/improvise", label: "Improvise" },
  { href: "/learn", label: "Learn" },
  { href: "/harmony", label: "Harmony" },
  { href: "/scales", label: "Scales" },
  { href: "/resolution", label: "Resolution" },
  { href: "/live", label: "Presenter" },
];

/** The mark: six dots, one hollow. The idea of the app at 20 pixels. */
function Mark({ size = 22 }: { size?: number }) {
  const r = size / 2;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return { x: r + r * 0.68 * Math.cos(a), y: r + r * 0.68 * Math.sin(a) };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {pts.map((p, i) =>
        i === 4 ? (
          <circle key={i} cx={p.x} cy={p.y} r={size * 0.115} fill="none"
                  stroke="#E8666C" strokeWidth={size * 0.075} />
        ) : (
          <circle key={i} cx={p.x} cy={p.y} r={size * 0.13} fill="#C9A227" />
        )
      )}
    </svg>
  );
}

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-content items-center gap-6 px-5 py-3.5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Mark />
          <span className="display text-[19px] tracking-[0.01em]">Hexatonic</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-0.5 overflow-x-auto md:flex">
          {NAV.map((n) => {
            const active = path === n.href;
            return (
              <Link key={n.href} href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition ${
                      active ? "bg-white/[0.06] text-cream" : "text-muted hover:text-cream"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link href="/practice"
                className="hidden whitespace-nowrap rounded-xl bg-white/[0.06] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-cream transition hover:bg-white/[0.1] lg:inline-block">
            Open the app
          </Link>
          <button className="md:hidden" aria-label="Menu" aria-expanded={open}
                  aria-controls="mobile-navigation"
                  onClick={() => setOpen((v) => !v)}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d={open ? "M5 5l12 12M17 5L5 17" : "M3 6h16M3 11h16M3 16h16"}
                    stroke="#F4EFE4" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-navigation" className="border-t border-line px-5 pb-4 pt-2 md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                  aria-current={path === n.href ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2.5 font-mono text-[12px] uppercase tracking-[0.14em] transition ${
                    path === n.href ? "bg-white/[0.06] text-cream" : "text-muted"}`}>
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
