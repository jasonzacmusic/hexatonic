import type { Metadata, Viewport } from "next";
import { Archivo, Cormorant, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Link from "next/link";

const SITE = "https://hexatonic.nathanielschool.com";
const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || "local";
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const cormorant = Cormorant({
  subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"],
  variable: "--font-cormorant", display: "swap",
});
const plex = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Hexatonic — the six-note practice engine",
    template: "%s · Hexatonic",
  },
  description:
    "The only free, browser-based app built entirely around hexatonic practice. Six-note scales in every key, with generated pattern drills in Carnatic groupings that tell you exactly which bar they resolve on. Real notation, real piano.",
  keywords: [
    "hexatonic scale", "six note scale", "scale practice", "music theory",
    "tisra", "chatusra", "khanda", "misra", "gati", "konnakol",
    "triad pairs", "augmented scale", "Guidonian hexachord",
    "Nathaniel School of Music", "Jason Zac",
  ],
  authors: [{ name: "Jason Zac", url: "https://nathanielschool.com" }],
  creator: "Jason Zac",
  publisher: "Nathaniel School of Music",
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Hexatonic",
    title: "Hexatonic — the six-note practice engine",
    description:
      "Remove one note and the tritone goes with it. Practise six-note scales in any key, in groupings of 3, 4, 5, 6 or 7, and see exactly which bar they land on.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hexatonic — the six-note practice engine",
    description: "Six-note scales, Carnatic groupings, real notation, real piano.",
  },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  alternates: { canonical: SITE },
};

export const viewport: Viewport = {
  themeColor: "#0A0908",
  width: "device-width",
  initialScale: 1,
};

const SITE_URL = SITE;

const ORG = {
  "@type": "Organization",
  "@id": `${SITE_URL}#org`,
  name: "Nathaniel School of Music",
  url: "https://nathanielschool.com",
  founder: { "@type": "Person", name: "Jason Zac" },
};

const APP = {
  "@type": "WebApplication",
  "@id": `${SITE_URL}#app`,
  name: "Hexatonic",
  alternateName: "Hexatonic — the six-note practice engine",
  url: SITE_URL,
  applicationCategory: "EducationalApplication",
  applicationSubCategory: "Music education",
  operatingSystem: "Any modern browser",
  browserRequirements: "Requires JavaScript and Web Audio",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Hexatonic scales in all twelve keys",
    "Generated pattern drills in groupings of three to nine",
    "Resolution solver — the bar a pattern lands on",
    "Carnatic gati and konnakol",
    "Live staff notation",
    "Sampled grand piano",
    "Improvisation vamps built from the scale's own harmony",
    "Works offline",
  ],
  creator: { "@type": "Person", name: "Jason Zac", url: "https://nathanielschool.com" },
  publisher: { "@id": `${SITE_URL}#org` },
  inLanguage: "en",
  isAccessibleForFree: true,
};

/* Answers to what people actually type into a search box. Every one of these is
   a claim the app can defend — see docs/06-PRIOR-ART.md and docs/08-JAZZ-GOSPEL.md. */
const FAQ = {
  "@type": "FAQPage",
  "@id": `${SITE_URL}#faq`,
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a hexatonic scale?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A six-note scale. The most useful one is a major scale with the 4th or the 7th removed. A major scale contains exactly one tritone, and removing either member of it — and only those two notes — leaves a six-note scale with no tritone at all.",
      },
    },
    {
      "@type": "Question",
      name: "Why remove the 4th from a major scale?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Because the 4th is one of the two notes forming the scale's only tritone, F and B in C major. Removing either one produces the same tritone-free six-note collection. Removing any other degree leaves the tritone in place.",
      },
    },
    {
      "@type": "Question",
      name: "Is the hexatonic scale the same as the gospel scale?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. The term gospel scale usually means 1 2 b3 3 5 6, the major blues scale. The six-note collection here is better called the Ionian/Lydian hexatonic, after the two modes it sits between.",
      },
    },
    {
      "@type": "Question",
      name: "Can you practise a hexatonic scale in thirds?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not really. Stepping two degrees through a six-note scale gives two major thirds, two minor thirds and two perfect fourths — the fourths appearing where the removed note left a gap. Stepping three degrees, however, gives a perfect fourth or fifth on every single degree.",
      },
    },
    {
      "@type": "Question",
      name: "What are tisra, chatusra, khanda and misra?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "They are the Carnatic gati — the number of pulses subdividing each beat. Tisra is three, chatusra four, khanda five, misra seven and sankeerna nine. Misra means mixed, because seven is three plus four.",
      },
    },
  ],
};

const JSONLD = { "@context": "https://schema.org", "@graph": [ORG, APP, FAQ] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} />
      </head>
      <body className={`${archivo.variable} ${cormorant.variable} ${plex.variable} min-h-screen font-sans antialiased`}>
        <Nav />
        <main className="mx-auto max-w-content px-5 pb-28 pt-8 sm:px-8">{children}</main>

        <footer className="mt-10 border-t border-line">
          <div className="mx-auto flex max-w-content flex-wrap items-start justify-between gap-10 px-5 py-12 sm:px-8">
            <div className="max-w-sm">
              <Wordmark />
              <p className="quiet mt-3">
                Built by <span className="text-cream">Jason Zac</span> at Nathaniel School
                of Music. The theory here is computed rather than asserted — every claim
                the app makes is reproducible from its own engine.
              </p>
            </div>
            <div className="flex gap-14">
              <nav className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                <span className="text-cream/50">App</span>
                <Link href="/practice" className="transition hover:text-cream">Practice</Link>
                <Link href="/improvise" className="transition hover:text-cream">Improvise</Link>
                <Link href="/live" className="transition hover:text-cream">Presenter</Link>
                <Link href="/resolution" className="transition hover:text-cream">Resolution</Link>
              </nav>
              <nav className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                <span className="text-cream/50">Theory</span>
                <Link href="/learn" className="transition hover:text-cream">The five theorems</Link>
                <Link href="/harmony" className="transition hover:text-cream">Harmony</Link>
                <Link href="/scales" className="transition hover:text-cream">Scale library</Link>
                <Link href="/about" className="transition hover:text-cream">About</Link>
              </nav>
            </div>
          </div>
          <div className="border-t border-line/60">
            <p className="mx-auto max-w-content px-5 py-5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted/70 sm:px-8">
              Nathaniel School of Music · free to use · works offline
            </p>
          </div>
        </footer>

        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js?v=${encodeURIComponent(BUILD_VERSION)}').catch(function(){})})}`,
          }}
        />
      </body>
    </html>
  );
}

function Wordmark() {
  return (
    <span className="inline-flex items-baseline gap-2.5">
      <span className="display text-[19px] tracking-[0.02em]">Hexatonic</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">six</span>
    </span>
  );
}
