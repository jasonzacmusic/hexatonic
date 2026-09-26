"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SupportPanel from "@/components/SupportPanel";
import ShareButton from "@/components/ShareButton";

/* Six places, in the order a new player needs them. Everything else
   (About, the bar-count calculator) lives in the footer. */
const NAV = [
  { href: "/practice", label: "Practice" },
  { href: "/sounds", label: "Sounds" },
  { href: "/improvise", label: "Improvise" },
  { href: "/ear", label: "Ear" },
  { href: "/harmony", label: "Harmony" },
  { href: "/learn", label: "Learn" },
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
  const isActive = (href: string) => path === href || path.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-content items-center gap-5 py-3 pl-[max(20px,env(safe-area-inset-left))] pr-[max(20px,env(safe-area-inset-right))] sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          <Mark />
          <span className="display text-[19px] tracking-[-0.01em]">Hexatonic</span>
        </Link>

        {/* No overflow scroller: six items fit at 1024px and up, and below that
            the menu button takes over. */}
        <nav aria-label="Main" className="ml-3 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => {
            const active = isActive(n.href);
            return (
              <Link key={n.href} href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-mono text-[14px] uppercase tracking-[0.05em] transition-colors duration-150 ${
                      active ? "bg-white/[0.07] text-cream" : "text-cream/65 hover:text-cream"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ShareButton className="max-[379px]:hidden" />
          <SupportPanel variant="nav" />
          <button className="-mr-1.5 grid h-10 w-10 place-items-center rounded-lg lg:hidden"
                  aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}
                  aria-controls="mobile-navigation"
                  onClick={() => setOpen((v) => !v)}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d={open ? "M5 5l12 12M17 5L5 17" : "M3 6h16M3 11h16M3 16h16"}
                    stroke="#F4EFE4" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-navigation" aria-label="Main"
             className="border-t border-line px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2 lg:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={`block rounded-lg px-3 py-3 font-mono text-[15px] uppercase tracking-[0.05em] transition-colors ${
                    isActive(n.href) ? "bg-white/[0.07] text-cream" : "text-cream/75"}`}>
              {n.label}
            </Link>
          ))}
          <ShareButton variant="menu" />
          <div className="mt-3 border-t border-line/70 px-1 pt-4">
            <SupportPanel variant="inline" />
          </div>
        </nav>
      )}
    </header>
  );
}
