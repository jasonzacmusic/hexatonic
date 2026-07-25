import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Link from "next/link";

const SITE = "https://hexatonic.nathanielschool.com";

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

const JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Hexatonic",
  alternateName: "Hexatonic — the six-note practice engine",
  url: SITE,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description:
    "A free browser app for practising hexatonic (six-note) scales, with generated pattern drills in Carnatic rhythmic groupings, live staff notation and sampled piano.",
  creator: { "@type": "Person", name: "Jason Zac" },
  publisher: {
    "@type": "Organization",
    name: "Nathaniel School of Music",
    url: "https://nathanielschool.com",
  },
  inLanguage: "en",
  isAccessibleForFree: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800;900&family=Cormorant:ital,wght@0,400;0,600;1,300;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
        <script type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
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
                <Link href="/live" className="transition hover:text-cream">Presenter</Link>
                <Link href="/resolution" className="transition hover:text-cream">Resolution</Link>
              </nav>
              <nav className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                <span className="text-cream/50">Theory</span>
                <Link href="/learn" className="transition hover:text-cream">The five theorems</Link>
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
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
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
