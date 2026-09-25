"use client";

import { useRef, useState } from "react";

/**
 * The NSM support panel, in Hexatonic's clothes. Same words and order as every
 * other free NSM tool: PayPal, UPI, bank transfer. Never a cap — no amount is
 * ever baked into a link or the QR, and the bank route is always present
 * because UPI apps impose their own per-transfer ceilings.
 */
const SUPPORT = {
  paypal: "https://paypal.me/jasonzac?locale.x=en_GB&country.x=IN",
  upiVpa: "jasonzac-1@okhdfcbank",
  upiName: "Jason Zachariah",
  upiDeepLink: "upi://pay?pa=jasonzac-1@okhdfcbank&pn=Jason%20Zachariah&cu=INR",
  qr: "/support-upi-qr.png",
  bank: [
    ["Account", "Nathaniel School Of Music"],
    ["Bank", "HDFC Bank"],
    ["A/C No", "50200038076306"],
    ["IFSC", "HDFC0001748"],
    ["Branch", "Wilson Garden, Bangalore"],
  ] as const,
};

const APP_URL = "https://hexatonic.nathanielschool.com";

function Hex({ size = 18 }: { size?: number }) {
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={r + r * 0.68 * Math.cos(a)} cy={r + r * 0.68 * Math.sin(a)}
                       r={size * 0.12} fill="currentColor" />;
      })}
    </svg>
  );
}

export default function SupportPanel({ variant = "footer" }: { variant?: "footer" | "inline" | "nav" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1600); }
    catch { /* clipboard blocked — the text is still on screen to select */ }
  };
  const share = async () => {
    const data = { title: "Hexatonic", text: "Free six-note scale practice, in every key.", url: APP_URL };
    try { if (navigator.share) await navigator.share(data); else await copy(APP_URL, "link"); }
    catch { /* user cancelled */ }
  };

  return (
    <>
      {variant === "nav" ? (
        <button type="button" onClick={() => ref.current?.showModal()}
                className="hx-sheen inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-[#17130a]">
          <Hex size={13} /> Support
        </button>
      ) : variant === "footer" ? (
        <button type="button" onClick={() => ref.current?.showModal()}
                className="hx-sheen group inline-flex items-center gap-3 rounded-full px-5 py-2.5 text-[#17130a]">
          <Hex size={16} />
          <span className="font-serif text-[19px] font-semibold italic">Keep Hexatonic free</span>
          <span className="font-mono text-[12px] opacity-70">→</span>
        </button>
      ) : (
        <button type="button" onClick={() => ref.current?.showModal()} className="btn btn-ghost">
          Support these free tools
        </button>
      )}

      <dialog ref={ref} aria-labelledby="support-title"
              onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
              className="m-auto w-[min(440px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-cream shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm">
        <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Six notes, free for everyone</p>
              <h2 id="support-title" className="display mt-2 text-[28px]">Support these free tools</h2>
            </div>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Close"
                    className="rounded-lg px-2 py-1 text-[20px] leading-none text-muted transition hover:text-cream">×</button>
          </div>

          <p className="mt-4 text-[15px] leading-relaxed text-cream/85">
            <span className="text-cream">Hexatonic</span>, like every free tool from Nathaniel School of Music,
            is free for musicians and students. If it has helped you, a gift keeps it free and ad-free. Thank you.
          </p>
          <p className="mt-3 font-serif text-[18px] italic text-cream">
            Give any amount you like — there is no upper limit.
          </p>

          <div className="mt-5 grid gap-3">
            <a href={SUPPORT.paypal} target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-between rounded-xl border border-line bg-surface2 px-4 py-3 transition hover:border-line-control">
              <span className="font-semibold">PayPal</span>
              <span className="font-mono text-[13px] text-cream/75">paypal.me/jasonzac ↗</span>
            </a>

            <div className="rounded-xl border border-line bg-surface2 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <a href={SUPPORT.upiDeepLink} className="font-semibold hover:text-gold-hi">GPay / UPI</a>
                <button type="button" onClick={() => copy(SUPPORT.upiVpa, "upi")}
                        className="font-mono text-[13px] text-cream/75 transition hover:text-cream">
                  {copied === "upi" ? "Copied ✓" : `${SUPPORT.upiVpa} · copy`}
                </button>
              </div>
              <p className="mt-1 text-[13px] text-muted">{SUPPORT.upiName}</p>
              <div className="mt-3 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SUPPORT.qr} alt="UPI QR code for Jason Zachariah, no fixed amount"
                     width={112} height={112} className="rounded-lg bg-white p-1.5" />
                <p className="text-[13px] leading-relaxed text-cream/75">
                  Scan with Google Pay, PhonePe or any UPI app.<br />
                  The code carries no fixed amount — you type it in your own app.
                </p>
              </div>
            </div>

            <details className="group rounded-xl border border-line bg-surface2 px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                Bank transfer — for a larger gift
                <span className="text-muted transition group-open:rotate-90">›</span>
              </summary>
              <p className="mt-2 text-[13px] leading-relaxed text-cream/75">
                UPI apps set their own per-transfer ceilings. A NEFT or IMPS transfer has none.
              </p>
              <dl className="mt-3 grid grid-cols-[88px_1fr] gap-x-3 gap-y-1.5 text-[14px]">
                {SUPPORT.bank.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted">{k}</dt>
                    <dd className="font-mono text-cream select-all">{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>

          <p className="mt-5 text-[13px] text-muted">Contributions go to Jason Zac · Nathaniel School of Music</p>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            <button type="button" onClick={() => copy(APP_URL, "link")} className="btn btn-ghost text-[13px]">
              {copied === "link" ? "Link copied ✓" : "Copy link to the app"}
            </button>
            <button type="button" onClick={share} className="btn btn-ghost text-[13px]">Share the app…</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
