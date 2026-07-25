import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

const SITE = "https://hexatonic.nathanielschool.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "SHADAVA — the six-note practice engine",
    template: "%s · SHADAVA",
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
    siteName: "SHADAVA",
    title: "SHADAVA — the six-note practice engine",
    description:
      "Remove one note and the tritone goes with it. Practise six-note scales in any key, in groupings of 3, 4, 5, 6 or 7, and see exactly which bar they land on.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "SHADAVA — the six-note practice engine" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SHADAVA — the six-note practice engine",
    description: "Six-note scales, Carnatic groupings, real notation, real piano.",
    images: ["/og.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  alternates: { canonical: SITE },
};

export const viewport: Viewport = {
  themeColor: "#0E0D0C",
  width: "device-width",
  initialScale: 1,
};

const NAV = [
  { href: "/practice", label: "Practice" },
  { href: "/learn", label: "Learn" },
  { href: "/scales", label: "Scales" },
  { href: "/resolution", label: "Resolution" },
  { href: "/live", label: "Live" },
];

const JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "SHADAVA",
  alternateName: "SHADAVA — the six-note practice engine",
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
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&family=Cormorant:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
        />
      </head>
      <body className="min-h-screen bg-bg font-sans text-cream antialiased">
        <header className="sticky top-0 z-40 border-b border-line bg-bg/92 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
            <Link href="/" className="text-lg font-extrabold tracking-[0.16em]">
              SHADAVA <span className="text-gold">6</span>
            </Link>
            <nav className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.1em]">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-muted transition hover:text-cream">
                  {n.label}
                </Link>
              ))}
            </nav>
            <a
              href="https://nathanielschool.com"
              className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition hover:text-cream sm:block"
            >
              Nathaniel School of Music
            </a>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-5 pb-24 pt-6">{children}</main>

        <footer className="border-t border-line px-5 py-10">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-start justify-between gap-6 text-sm">
            <div className="max-w-md">
              <p className="font-extrabold tracking-[0.16em]">SHADAVA <span className="text-gold">6</span></p>
              <p className="mt-2 text-muted">
                Built by <span className="text-cream">Jason Zac</span> at Nathaniel School of Music.
                The theory is computed, not asserted — every claim in this app is reproducible
                from the engine in the repository.
              </p>
            </div>
            <nav className="flex flex-col gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="transition hover:text-cream">{n.label}</Link>
              ))}
              <Link href="/about" className="transition hover:text-cream">About</Link>
            </nav>
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
