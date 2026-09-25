import Link from "next/link";
import HomeHero from "./HomeHero";

/* Home: say what it is, let people hear it, and point to the four doors.
   The theory lives on /learn; this page stays short on purpose. */

const DOORS: { href: string; title: string; body: string; cta: string }[] = [
  {
    href: "/practice", title: "Practice", cta: "Start practising",
    body: "Run any six-note scale in any key: up and down, in fourths, in patterns and in rhythms. The app counts the bars with you.",
  },
  {
    href: "/sounds", title: "Explore the sounds", cta: "Hear them all",
    body: "Hear major, minor, blues, whole tone, augmented and more side by side, and find the colour you like.",
  },
  {
    href: "/improvise", title: "Improvise", cta: "Start a loop",
    body: "Play over a backing loop built from the scale's own chords. The notes to land on light up as the chords change.",
  },
  {
    href: "/ear", title: "Train your ear", cta: "Play a round",
    body: "Tell major from minor, name the sound you heard, and catch the missing note.",
  },
];

export default function Home() {
  return (
    <div className="pb-8">
      <HomeHero />

      <section aria-label="Where to start" className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DOORS.map((d) => (
          <Link key={d.href} href={d.href} className="door group">
            <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.015em]">{d.title}</h2>
            <p className="quiet mt-2.5 flex-1">{d.body}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-[13px] uppercase tracking-[0.08em] text-cream/80 transition-colors group-hover:text-cream">
              {d.cta}
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="mt-20 border-t border-line pt-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <h2 className="display text-4xl sm:text-5xl">Built to be played.</h2>
          <div>
            <p className="lede">
              Every key is spelled correctly. Every chord and bar count is calculated by
              the app and checked by tests, so nothing is typed in by hand. Free, no
              account, works offline.
            </p>
            <p className="quiet mt-4">
              Made by <span className="text-cream">Jason Zac</span> at Nathaniel School
              of Music.{" "}
              <Link href="/learn" className="text-cream underline decoration-line-control underline-offset-4 transition-colors hover:decoration-cream">
                Why six notes?
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
