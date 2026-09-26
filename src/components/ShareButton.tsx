"use client";

/**
 * "Share" in the header: shares whatever is on screen. On Practice that is
 * the scale being drilled (read from the URL at the moment of the tap, since
 * the drill keeps its settings there); everywhere else it is the page, with
 * the words written for that page in src/lib/share.ts.
 */

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { decodeState } from "@/lib/useDrill";
import { CardSpec, PAGES, pageFor, scaleFace, scaleText } from "@/lib/share";
import ShareSheet from "@/components/ShareSheet";

export function shareForLocation(pathname: string, search: string): { spec: CardSpec; text: string; title: string } {
  const page = pageFor(pathname);
  if (page === "practice") {
    const s = decodeState(search.replace(/^\?/, ""));
    const spec: CardSpec = { kind: "scale", key: s.key, family: s.family, mode: s.mode, custom: s.custom };
    const face = scaleFace(spec);
    return { spec, title: `Share ${face.name}`, text: `Practising ${scaleText(face)}` };
  }
  return { spec: { kind: "page", page }, title: `Share ${PAGES[page].title}`, text: PAGES[page].text };
}

export default function ShareButton({ className = "", variant = "header" }: { className?: string; variant?: "header" | "menu" }) {
  const path = usePathname();
  const [open, setOpen] = useState<ReturnType<typeof shareForLocation> | null>(null);
  const close = useCallback(() => setOpen(null), []);
  if (variant === "menu")
    return (
      <>
        <button type="button" aria-haspopup="dialog"
                onClick={() => setOpen(shareForLocation(path, window.location.search))}
                className={`block w-full rounded-lg px-3 py-3 text-left font-mono text-[15px] uppercase tracking-[0.05em] text-cream/75 ${className}`}>
          Share this page
        </button>
        {open && <ShareSheet {...open} onClose={close} />}
      </>
    );
  return (
    <>
      {/* Icon only on a phone: the header also holds the logo, the support
          pill and the menu button, and must not scroll sideways at 360px. */}
      <button type="button" aria-haspopup="dialog" aria-label="Share this page"
              onClick={() => setOpen(shareForLocation(path, window.location.search))}
              className={`inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-lg border border-line px-2.5 font-mono text-[13px] uppercase tracking-[0.06em] text-cream/80 transition-colors hover:border-line-control hover:text-cream sm:h-auto sm:px-3 sm:py-1.5 ${className}`}>
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 10V2M5 5l3-3 3 3M3 9v4.5h10V9" />
        </svg>
        <span className="hidden sm:inline">Share</span>
      </button>
      {open && <ShareSheet {...open} onClose={close} />}
    </>
  );
}
