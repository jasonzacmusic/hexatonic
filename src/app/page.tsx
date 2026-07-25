import Link from "next/link";
import { omissionSurvey } from "@/lib/theory/scales";
import { solveResolution } from "@/lib/theory/resolution";

export default function Home() {
  const rows = omissionSurvey("C");
  const hexa = (g: number) => solveResolution(6, 4, 4, g, "full").bars;
  const hept = (g: number) => solveResolution(7, 4, 4, g, "full").bars;

  return (
    <div className="space-y-20 pb-10">
      {/* hero */}
      <section className="pt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
          ṣāḍava · षाडव · the six-note raga
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-[1.08] sm:text-6xl">
          Remove one note.<br />
          The tritone goes with it.
        </h1>
        <p className="lede mt-6 max-w-2xl">
          A major scale contains exactly one tritone. Take out the 4th or the 7th — and
          only those two — and what is left has none. What is left is also a single chord
          you cannot play a wrong note in.
        </p>
        <p className="lede mt-4 max-w-2xl">
          SHADAVA drills that scale in every key, in groupings of 3, 4, 5, 6 or 7, and
          tells you exactly which bar the pattern lands on.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/practice" className="btn btn-primary px-7 py-3 text-base">Start practising</Link>
          <Link href="/learn" className="btn btn-ghost px-7 py-3 text-base">See the proof</Link>
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          Free · works offline · no account
        </p>
      </section>

      {/* theorem 1 */}
      <section>
        <h2 className="text-2xl font-extrabold">It isn&rsquo;t taste. It&rsquo;s the only way.</h2>
        <p className="lede mt-3 max-w-2xl">
          Remove each degree of C major in turn and count the tritones left behind.
          Two removals — and only two — leave none.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full max-w-2xl text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                <th className="py-2 pr-4">removed</th>
                <th className="py-2 pr-4">what&rsquo;s left</th>
                <th className="py-2 pr-4">tritones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const good = r.tritones === 0;
                return (
                  <tr key={r.removedDegree}
                      className={`border-b border-line/60 ${good ? "text-gold" : "text-muted"}`}>
                    <td className="py-2 pr-4 font-semibold">
                      {r.removedNote}{good ? ` (the ${r.removedDegree === 4 ? "4th" : "7th"})` : ""}
                    </td>
                    <td className="py-2 pr-4 font-mono">{r.notes.join(" ")}</td>
                    <td className="py-2 pr-4 font-bold tabular-nums">{r.tritones}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-5 max-w-2xl text-sm text-muted">
          Gospel, bluegrass, Celtic, Carnatic and West African music all arrived at
          &ldquo;drop the 4 or the 7&rdquo; independently. This table is why.
        </p>
      </section>

      {/* the rhythm argument */}
      <section>
        <h2 className="text-2xl font-extrabold">Six beats seven. Here is the arithmetic.</h2>
        <p className="lede mt-3 max-w-2xl">
          Play a scale in groups of 3, 4, 5 or 6 against 4/4 and the accent phases against
          the barline. The pattern resolves when the tonic and the accent land on a downbeat
          together. Six shares factors with almost everything; seven shares factors with nothing.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full max-w-xl text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                <th className="py-2 pr-6">grouping, 16ths</th>
                <th className="py-2 pr-6">hexatonic</th>
                <th className="py-2 pr-6">major scale</th>
              </tr>
            </thead>
            <tbody>
              {[3, 4, 5, 6].map((g) => (
                <tr key={g} className="border-b border-line/60">
                  <td className="py-2 pr-6 font-mono">{g}s</td>
                  <td className="py-2 pr-6 font-bold tabular-nums text-gold">{hexa(g)} bars</td>
                  <td className="py-2 pr-6 tabular-nums text-muted">{hept(g)} bars</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 max-w-2xl text-sm text-muted">
          Which makes the six-note scale, not the major scale, the right one on which to
          teach rhythmic grouping. It is also why a room full of people can land a cycle
          together — you can land a 3-bar phrase in unison; you cannot land a 21-bar one.
        </p>
        <Link href="/resolution" className="mt-5 inline-block font-mono text-[11px] uppercase tracking-[0.1em] text-gold hover:underline">
          Open the resolution calculator →
        </Link>
      </section>

      {/* what's inside */}
      <section>
        <h2 className="text-2xl font-extrabold">What&rsquo;s in it</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Every key, spelled properly", "A note is a letter, an alteration and an octave — never a number. F♯ gives F♯ G♯ A♯ C♯ D♯ E♯, not a bag of enharmonics."],
            ["Real notation", "VexFlow engraving with beams generated per beat, accents on the group starts, and nothing crossing a barline."],
            ["Real piano", "Sampled Salamander grand, scheduled against the audio clock so the notes land where the notation says they do."],
            ["The resolution solver", "Live bar-count for any combination of scale size, subdivision, grouping and octave range."],
            ["The Carnatic layer", "Tisra, chatusra, khanda, misra and sankeerna, with the konnakol that goes with them."],
            ["Available harmony", "Four triads. Three seventh-chord sets, two of them with a second correct name. Tap to flip the reading."],
          ].map(([h, p]) => (
            <div key={h} className="card">
              <h3 className="font-semibold">{h}</h3>
              <p className="mt-2 text-sm text-muted">{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card max-w-3xl">
        <h2 className="text-xl font-extrabold">A note on what this is not</h2>
        <p className="mt-3 text-sm text-muted">
          It isn&rsquo;t the first app to mention hexatonic scales — an iOS app called
          <em> Hexatonics</em> exists, and mDecks&rsquo; Tessitura Pro has taught bi-triadic
          hexatonics since 2017. What appears to be genuinely new is the rhythm side:
          no tool anywhere generates melodic patterns in Carnatic groupings and tells you
          which bar they resolve on. That is the part worth having.
        </p>
      </section>
    </div>
  );
}
