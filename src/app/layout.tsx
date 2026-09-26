import type { Metadata, Viewport } from "next";
import { Archivo, Cormorant, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Link from "next/link";
import SupportPanel from "@/components/SupportPanel";

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
    default: "Hexatonic — practise six-note scales",
    template: "%s · Hexatonic",
  },
  description:
    "A free practice app for six-note scales. Hear major, minor, blues, whole tone, augmented and more, then drill any of them in any key with real notation and a real piano.",
  keywords: [
    "hexatonic scale", "six note scale", "scale practice", "blues scale",
    "whole tone scale", "augmented scale", "major blues scale", "ear training",
    "music theory", "piano practice", "Nathaniel School of Music", "Jason Zac",
  ],
  authors: [{ name: "Jason Zac", url: "https://nathanielschool.com" }],
  creator: "Jason Zac",
  publisher: "Nathaniel School of Music",
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Hexatonic",
    title: "Hexatonic — practise six-note scales",
    description:
      "Six notes, a world of sounds. Pick a sound, pick a key, and play along with real notation and a real piano. Free, no account.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hexatonic — practise six-note scales",
    description: "Six notes, a world of sounds. Free, with real notation and a real piano.",
  },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  alternates: { canonical: SITE },
};

/* The page is dark in both schemes, so both status bars match the header.
   viewport-fit=cover lets the header paint under the notch; the header and
   footer pad themselves back out with env(safe-area-inset-*). Zoom is never
   disabled: inputs are 16px on touch screens instead. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0908" },
    { media: "(prefers-color-scheme: light)", color: "#0A0908" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
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
  alternateName: "Hexatonic — practise six-note scales",
  url: SITE_URL,
  applicationCategory: "EducationalApplication",
  applicationSubCategory: "Music education",
  operatingSystem: "Any modern browser",
  browserRequirements: "Requires JavaScript and Web Audio",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Six-note scales in all twelve keys: major, minor, blues, whole tone, augmented and more",
    "Pattern drills in groups of three to nine, with the bar count shown",
    "Live staff notation",
    "Sampled grand piano",
    "Backing loops built from the scale's own chords",
    "Ear-training games",
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
        text: "Not the major scale without its 4th. The name gospel scale usually means 1 2 b3 3 5 6, the major blues scale, which is also in the app. The major scale without its 4th (1 2 3 5 6 7) is sometimes called the Ionian/Lydian hexatonic, after the two modes it sits between.",
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
      name: "What does practising in groups of 5 mean?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You play the scale steadily and accent every fifth note. The accent drifts against the beat until it lands back on the downbeat, and the app shows how many bars that takes. In Carnatic music a phrase of five is called khanda.",
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
      <body className={`${archivo.variable} ${cormorant.variable} ${plex.variable} min-h-dvh font-sans antialiased`}>
        <Nav />
        <main className="mx-auto max-w-content pb-12 pl-[max(20px,env(safe-area-inset-left))] pr-[max(20px,env(safe-area-inset-right))] pt-8 sm:px-8">{children}</main>

        <footer className="mt-10 border-t border-line pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-content flex-wrap items-start justify-between gap-10 px-5 py-12 sm:px-8">
            <div className="max-w-sm">
              <Wordmark />
              <p className="quiet mt-3">
                Made by <span className="text-cream">Jason Zac</span> at Nathaniel School
                of Music. Every spelling, chord and bar count is calculated by the app and
                checked by tests.
              </p>
              <div className="mt-5"><SupportPanel /></div>
            </div>
            <div className="flex gap-14">
              <FooterLinks title="Play" links={[
                ["/practice", "Practice"], ["/sounds", "Sounds"],
                ["/improvise", "Improvise"], ["/ear", "Ear"],
              ]} />
              <FooterLinks title="Understand" links={[
                ["/harmony", "Harmony"], ["/learn", "Why six notes"],
                ["/resolution", "Bar-count calculator"], ["/about", "About"],
              ]} />
            </div>
          </div>
          <div className="border-t border-line/60">
            <div className="mx-auto max-w-content px-5 py-5 sm:px-8">
              <p className="font-mono text-[13px] text-muted">
                Nathaniel School of Music · free to use · works offline
              </p>
            </div>
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

function FooterLinks({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-2.5 font-mono text-[13px] uppercase tracking-[0.06em] text-muted">
      <span className="text-cream">{title}</span>
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="transition-colors hover:text-cream">{label}</Link>
      ))}
    </nav>
  );
}

function Wordmark() {
  return (
    <span className="inline-flex items-baseline gap-2.5">
      <span className="display text-[19px] tracking-[0.02em]">Hexatonic</span>
      <span className="font-mono text-[13px] uppercase tracking-[0.1em] text-muted">six notes</span>
    </span>
  );
}
