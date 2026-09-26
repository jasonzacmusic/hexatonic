"use client";

/**
 * The share sheet. One component for every share in the app: a preview of the
 * card in the chosen size, the phone's own share menu (which is how Instagram
 * and WhatsApp stories take an image), direct links for WhatsApp, X and
 * Facebook, and save / copy fallbacks for everything else.
 *
 * The card image is fetched as soon as the sheet opens or the size changes,
 * so pressing Share hands the file over at once. Browsers only allow the
 * share menu straight after a tap; waiting on a download first would lose it.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CardFormat, CardSpec, FORMATS, cardQuery, shareLink } from "@/lib/share";

interface Props {
  spec: CardSpec;
  /** the words of the post; the link is added after them */
  text: string;
  title: string;
  onClose: () => void;
}

const ORDER: CardFormat[] = ["story", "post", "og"];

export default function ShareSheet({ spec, text, title, onClose }: Props) {
  const [format, setFormat] = useState<CardFormat>("story");
  const [done, setDone] = useState<string | null>(null);
  const [canFiles, setCanFiles] = useState(false);
  const blob = useRef<{ format: CardFormat; file: File } | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const url = shareLink(spec);
  const img = `/card?${cardQuery(spec, format)}`;
  const post = `${text} ${url}`;
  const fileName = `hexatonic-${spec.kind}-${format}.png`;

  const flash = (msg: string) => { setDone(msg); window.setTimeout(() => setDone(null), 1800); };

  /* prefetch the image for this size */
  useEffect(() => {
    let alive = true;
    blob.current = null;
    fetch(img).then((r) => r.blob()).then((b) => {
      if (!alive) return;
      const file = new File([b], fileName, { type: "image/png" });
      blob.current = { format, file };
      try { setCanFiles(!!navigator.canShare?.({ files: [file] })); } catch { setCanFiles(false); }
    }).catch(() => {});
    return () => { alive = false; };
  }, [img, fileName, format]);

  /* Escape closes; focus moves into the sheet and back out */
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); before?.focus?.(); };
  }, [onClose]);

  const copy = useCallback(async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); flash(label); }
    catch { flash("Copy failed. Select the text and copy it."); }
  }, []);

  const nativeShare = async () => {
    const file = blob.current?.format === format ? blob.current.file : null;
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: post, title });
        return;
      }
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await copy(post, "Copied. Paste it anywhere.");
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") await copy(post, "Copied. Paste it anywhere.");
    }
  };

  const save = async () => {
    try {
      const file = blob.current?.format === format ? blob.current.file : new File([await (await fetch(img)).blob()], fileName);
      const href = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = href; a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 2000);
      flash("Image saved");
    } catch { flash("Could not save the image"); }
  };

  const enc = encodeURIComponent;
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(post)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
  ];

  const { w, h } = FORMATS[format];
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
         onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="share-title"
           className="hx-rise max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[calc(20px+env(safe-area-inset-bottom))] sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Share</p>
            <h2 id="share-title" className="display mt-2 text-[26px] leading-tight">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-cream/80 hover:text-cream">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,240px)_1fr]">
          <div className="flex flex-col gap-3">
            <div className="seg w-full" role="group" aria-label="Image size">
              {ORDER.map((f) => (
                <button key={f} type="button" data-on={f === format} aria-pressed={f === format}
                        className="flex-1" onClick={() => setFormat(f)}>
                  {FORMATS[f].label}
                </button>
              ))}
            </div>
            <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-xl border border-line bg-bg"
                 style={{ aspectRatio: `${w} / ${h}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`Share card, ${FORMATS[format].label.toLowerCase()} size`} width={w} height={h}
                   className="h-full w-full object-contain" />
            </div>
            <p className="text-center font-mono text-[13px] text-muted">{FORMATS[format].use}</p>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <p className="rounded-xl border border-line bg-surface2 p-3.5 text-[15px] leading-relaxed text-cream/90">
              {text} <span className="break-all text-cream/60">{url}</span>
            </p>
            <button type="button" className="btn btn-primary min-h-[52px] text-[16px]" onClick={nativeShare}>
              {canFiles ? "Share image…" : "Share…"}
            </button>
            <div className="grid grid-cols-3 gap-2">
              {links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                   className="btn btn-ghost min-h-[46px] justify-center text-center">{l.label}</a>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" className="btn btn-ghost min-h-[46px]" onClick={save}>Save image</button>
              <button type="button" className="btn btn-ghost min-h-[46px]" onClick={() => copy(url, "Link copied")}>Copy link</button>
              <button type="button" className="btn btn-ghost min-h-[46px]" onClick={() => copy(post, "Text copied")}>Copy text</button>
            </div>
            <p className="text-[14px] leading-relaxed text-cream/70">
              <b className="text-cream/90">Instagram:</b> on your phone, press {canFiles ? "Share image" : "Share"} and pick
              Instagram, or save the Story image and post it from Instagram.
            </p>
            <p aria-live="polite" className="min-h-[20px] font-mono text-[13px] text-cream">{done}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
