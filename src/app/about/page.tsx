import type { Metadata } from "next";
import { pageMeta } from "@/lib/pageMeta";
import Link from "next/link";
import PageMark from "@/components/PageMark";
import { DIATONIC_MODES } from "@/lib/theory/scales";

export const metadata: Metadata = pageMeta("/about", "About",
  "Who made Hexatonic, how its theory is checked, and where the scale names come from.", "About");

const NO7 = DIATONIC_MODES[3];

export default function Page() {
  return (
    <div className="relative">
    <PageMark kind="about" className="hidden lg:block" />
    <article className="max-w-2xl pb-10 pt-2">
      <p className="eyebrow">About</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">Six notes, played properly.</h1>
      <p className="lede mt-6">
        Hexatonic is a free practice app for six-note scales, made by Jason Zac at
        Nathaniel School of Music.
      </p>

      <h2 className="mt-12 text-2xl font-extrabold">The theory is computed, not typed in</h2>
      <p className="quiet mt-3">
        Everything the app says about a scale — its spelling in any key, the chords inside
        it, the intervals in a drill, the bar on which a pattern lands — comes from one
        engine, and that engine is checked by automated tests. Nothing is typed in by
        hand and hoped for.
      </p>

      <h2 className="mt-12 text-2xl font-extrabold">Where the names come from</h2>
      <p className="quiet mt-3">
        The <strong className="font-semibold text-cream">gospel scale</strong> (1 2 ♭3 3
        5 6) is here as the major blues. It is not the major scale without its 4th.
      </p>
      <p className="quiet mt-3">
        The <strong className="font-semibold text-cream">Sunday Scale</strong> is a name
        made popular by Peter Martin (Open Studio). It means one rotation only:{" "}
        {NO7.name}, {NO7.degrees}. The other rotations carry plain names first and their
        modal names second, which list the two modes that share all six notes.
      </p>

      <p className="quiet mt-3">
        <strong className="font-semibold text-cream">Petrushka</strong> is from Stravinsky&rsquo;s
        ballet <em>Petrushka</em> (1911): two major chords a tritone apart (in G: G major and D♭ major).{" "}
        <strong className="font-semibold text-cream">Messiaen mode 5</strong> is one of Olivier
        Messiaen&rsquo;s modes of limited transposition; it repeats every tritone. Both are among
        the five six-note scales that repeat evenly inside the octave. The octatonic (diminished)
        scale is another symmetrical scale, one of several, with eight notes.
      </p>

      <h2 className="mt-12 text-2xl font-extrabold">Credits</h2>
      <p className="quiet mt-3">
        Piano: the Salamander Grand. Engraving: VexFlow. Where a source for a name or a
        claim could not be confirmed, the app leaves it out.
      </p>

      <p className="mt-10">
        <Link href="/practice" className="btn btn-primary">Start practising</Link>
      </p>
    </article>
    </div>
  );
}
