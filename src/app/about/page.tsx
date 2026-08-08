import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "https://hexatonic.nathanielschool.com/about" },
  title: "About",
  description: "How Hexatonic was built, what it claims, and what it deliberately does not claim.",
};

export default function Page() {
  return (
    <article className="max-w-2xl space-y-6 pb-10">
      <h1 className="text-3xl font-extrabold">About</h1>
      <p className="lede">
        Hexatonic is a practice tool for six-note scales, built at Nathaniel School of
        Music by Jason Zac.
      </p>
      <p className="text-muted">
        <em>Ṣāḍava</em> (षाडव) is the Carnatic term for a six-note raga. Its siblings are
        already named by the tradition — <em>audava</em> (five) and <em>sampūrṇa</em>{" "}
        (seven) — which is why the name carries the roadmap.
      </p>

      <h2 className="pt-4 text-xl font-extrabold">The theory is computed, not asserted</h2>
      <p className="text-muted">
        Everything this app states about a scale — its spelling in any key, the chords
        available inside it, the interval content of a drill, the bar on which a pattern
        resolves — comes from an engine that is unit-tested against a reference
        implementation. Nothing is typed in by hand and hoped for.
      </p>

      <h2 className="pt-4 text-xl font-extrabold">What it claims</h2>
      <p className="text-muted">
        That it is the only free, browser-based app built entirely around hexatonic
        practice. And that no other tool generates melodic patterns in Carnatic
        rhythmic groupings and reports which bar they resolve on.
      </p>

      <h2 className="pt-4 text-xl font-extrabold">What it does not claim</h2>
      <p className="text-muted">
        It is not the &ldquo;world&rsquo;s first hexatonic app&rdquo;. An iOS app named{" "}
        <em>Hexatonics</em> has existed since January 2025, and mDecks&rsquo; Tessitura Pro
        has shipped bi-triadic hexatonic practice — with pattern generation, notation
        and odd meters — since 2017.
      </p>
      <p className="text-muted">
        Two naming points, because both are commonly got wrong. The{" "}
        <strong className="text-cream">&ldquo;gospel scale&rdquo;</strong> is not the scale
        here — that name means 1 2 ♭3 3 5 6, the major blues scale. And the{" "}
        <strong className="text-cream">&ldquo;Sunday scale&rdquo;</strong> is Peter
        Martin/Open Studio&rsquo;s name for one exact rotation included here: the major
        scale without 7, 1 2 3 4 5 6. The other rotations retain modal-intersection
        names, which follow Cecil Sharp&rsquo;s folk-song classification and describe the
        ambiguity the removed note creates.
      </p>

      <h2 className="pt-4 text-xl font-extrabold">Credits</h2>
      <p className="text-muted">
        Piano is the Salamander Grand. Engraving is VexFlow. The Carnatic terminology was
        checked against the literature and carries an explicit list of things that could
        not be verified — where a source could not be confirmed, the app stays quiet
        rather than guessing.
      </p>
      <p className="pt-4">
        <Link href="/practice" className="btn btn-primary">Start practising</Link>
      </p>
    </article>
  );
}
