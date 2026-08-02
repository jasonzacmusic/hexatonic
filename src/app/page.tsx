import Link from "next/link";
import { omissionSurvey, buildScale } from "@/lib/theory/scales";
import { solveResolution } from "@/lib/theory/resolution";
import { skipCycle } from "@/lib/theory/patterns";
import { noteName } from "@/lib/theory/note";
import ScaleRing from "@/components/ScaleRing";

export default function Home() {
  const rows = omissionSurvey("C");
  const scale = buildScale("C", "diatonic", 0);
  const hexa = (g: number) => solveResolution(6, 4, 4, g, "full").bars;
  const hept = (g: number) => solveResolution(7, 4, 4, g, "full").bars;
  const hexaFourths = skipCycle(scale.notes, 3);
  const heptFourths = skipCycle(
    ["C", "D", "E", "F", "G", "A", "B"].map((n) => ({ letter: n as any, alt: 0 as const, octave: 4 })),
    3
  );

  return (
    <div className="pb-16">
      {/* ── hero ──────────────────────────────────────────────────────── */}
      <section className="grid items-center gap-12 pb-24 pt-6 lg:grid-cols-[1.15fr_1fr] lg:pt-14">
        <div>
          {/* The "THE SIX-NOTE PRACTICE ENGINE" eyebrow is gone. It made the
              headline share its entrance with a label nobody reads, and the
              pull-quote directly below already says what the app is. */}
          <h1 className="display hx-rise text-[13vw] leading-[0.92] sm:text-[64px] lg:text-[76px]">
            Remove<br />one note.
          </h1>
          <p className="pull hx-rise hx-d2 mt-6 max-w-lg">
            The tritone goes with it — and what remains can stack into one rich,
            six-note harmony.
          </p>
          <p className="lede hx-rise hx-d3 mt-6 max-w-xl">
            A major scale holds exactly one tritone. Take out the 4th or the 7th, and only
            those two, and that tritone disappears. Hexatonic drills those six-note sets
            in every key, in groupings of three to nine, and tells you which bar the phrase
            lands on.
          </p>
          <div className="hx-rise hx-d4 mt-9 flex flex-wrap items-center gap-3">
            <Link href="/practice" className="btn btn-primary px-8 py-3.5 text-base">
              Start practising
            </Link>
            <Link href="/learn" className="btn btn-ghost px-8 py-3.5 text-base">
              Hear the proof
            </Link>
          </div>
          <p className="mt-5 font-mono text-[12px] tracking-[0.02em] text-muted">
            Free · no account · works offline
          </p>
        </div>

        <div className="hx-rise hx-d2 flex justify-center lg:justify-end">
          <div className="relative">
            <ScaleRing notes={scale.notes} removed={scale.removed} size={420} spin
                       className="max-w-full" />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="num text-6xl text-gold">6</span>
              <span className="mt-1 font-mono text-[12px] uppercase tracking-[0.1em] text-muted">
                of twelve
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── theorem 1 ─────────────────────────────────────────────────── */}
      <Section title={<>It isn&rsquo;t taste.<br />It&rsquo;s the only way.</>}>
        <p className="lede max-w-xl">
          Remove each degree of C major in turn and count the tritones left behind.
          Two removals — and only two — leave none.
        </p>
        <div className="mt-8 overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.02] text-left font-mono text-[12px] tracking-[0.02em] text-muted">
                <th className="px-5 py-3">removed</th>
                <th className="px-5 py-3">what&rsquo;s left</th>
                <th className="px-5 py-3 text-right">tritones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const good = r.tritones === 0;
                return (
                  <tr key={r.removedDegree}
                      className={`border-t border-line/70 ${good ? "bg-gold/[0.06]" : ""}`}>
                    <td className={`px-5 py-3 font-semibold ${good ? "text-gold" : "text-muted"}`}>
                      {r.removedNote}
                      {good && <span className="ml-2 font-normal opacity-70">
                        the {r.removedDegree === 4 ? "4th" : "7th"}
                      </span>}
                    </td>
                    <td className={`px-5 py-3 font-mono ${good ? "text-cream" : "text-muted"}`}>
                      {r.notes.join("  ")}
                    </td>
                    <td className={`px-5 py-3 text-right num ${good ? "text-gold" : "text-muted"}`}>
                      {r.tritones}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="quiet mt-6 max-w-xl">
          This proves a narrow, useful fact about the major scale: removing either
          endpoint of its one tritone is the only single-note removal that leaves no
          tritone behind.
        </p>
      </Section>

      {/* ── the fourths cycle ─────────────────────────────────────────── */}
      <Section title={<>Six perfect fourths<br />in a row.</>}>
        <p className="lede max-w-xl">
          Step three degrees at a time and every interval comes out a perfect fourth or
          fifth. Six for six. The seven-note scale cannot do it — and the note that breaks
          it is the note we removed.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="card border-gold/30">
            <p className="eyebrow">six notes</p>
            <p className="mt-3 font-mono text-lg leading-relaxed text-cream">
              {hexaFourths.pairs.map((p, i) => (
                <span key={i} className="mr-3 inline-block whitespace-nowrap">
                  {noteName(p.from)}<span className="text-muted">–</span>{noteName(p.to)}
                  <span className="ml-1 text-gold">{p.interval}</span>
                </span>
              ))}
            </p>
            <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.08em] text-gold">
              all perfect
            </p>
          </div>
          <div className="card border-amber/25">
            <p className="eyebrow text-amber">seven notes</p>
            <p className="mt-3 font-mono text-lg leading-relaxed text-muted">
              {heptFourths.pairs.map((p, i) => (
                <span key={i} className="mr-3 inline-block whitespace-nowrap">
                  {noteName(p.from)}<span className="opacity-50">–</span>{noteName(p.to)}
                  <span className={`ml-1 ${p.interval === "A4" ? "font-bold text-amber" : "text-muted/70"}`}>
                    {p.interval}
                  </span>
                </span>
              ))}
            </p>
            <p className="mt-4 font-mono text-[12px] tracking-[0.02em] text-amber">
              F–B breaks the chain
            </p>
          </div>
        </div>
      </Section>

      {/* ── the rhythm argument ───────────────────────────────────────── */}
      <Section title={<>Six beats seven.<br />Here is the arithmetic.</>}>
        <p className="lede max-w-xl">
          Play a scale in groups of five against 4/4 and the accent phases against the
          barline. The phrase resolves only when the tonic and the accent land on a
          downbeat together. Six shares factors with almost everything; seven shares
          factors with nothing.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[3, 4, 5, 6].map((g) => (
            <div key={g} className="card card-tight">
              <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted">
                groups of {g}
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="num text-4xl text-gold">{hexa(g)}</span>
                <span className="text-sm text-muted">bars · six notes</span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="num text-xl text-muted">{hept(g)}</span>
                <span className="text-sm text-muted/70">bars · seven notes</span>
              </div>
            </div>
          ))}
        </div>
        <p className="quiet mt-6 max-w-xl">
          Which makes the six-note scale, not the major scale, the right one on which to
          teach grouping. It is also why a room can land a cycle together: you can land a
          three-bar phrase in unison, and you cannot land a twenty-one-bar one.
        </p>
        <Link href="/resolution" className="link-gold mt-6 inline-block">
          Open the resolution calculator →
        </Link>
      </Section>

      {/* ── what's inside ─────────────────────────────────────────────── */}
      <Section title="What you get">
        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Every key, spelled properly", "A note is a letter, an alteration and an octave — never a number. F♯ gives F♯ G♯ A♯ C♯ D♯ E♯, with no letter used twice."],
            ["Real engraving", "Beams generated per beat, accents on the group starts, tuplets where they belong, and nothing crossing a barline."],
            ["Real piano", "A sampled Salamander grand, scheduled against the audio clock so the notes land exactly where the notation says."],
            ["The resolution solver", "A live bar-count for any combination of scale size, subdivision, grouping and range. Nothing else does this."],
            ["The Carnatic layer", "Tisra, chatusra, khanda, misra and sankeerna — with the konnakol that belongs to each."],
            ["Available harmony", "Four triads and three seventh-chord sets, two of which carry a second, equally correct name. Tap to flip the reading."],
          ].map(([h, p]) => (
            /* The 01–06 index labels are gone. Six cards in a grid are already
               visibly a set; numbering them was the page narrating its own
               structure. */
            <div key={h} className="card">
              <h3 className="font-semibold">{h}</h3>
              <p className="quiet mt-2">{p}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── honesty ───────────────────────────────────────────────────── */}
      <section className="mt-24">
        <div className="card mx-auto max-w-3xl">
          <p className="eyebrow">What this is not</p>
          <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-cream/85">
            It is not the first app to mention hexatonic scales. An iOS app called{" "}
            <em className="font-serif">Hexatonics</em> has existed since 2025, and mDecks&rsquo;
            Tessitura Pro has taught bi-triadic hexatonics since 2017. What appears to be
            genuinely new is the rhythm side — no tool anywhere generates melodic patterns
            in Carnatic groupings and reports the bar they resolve on. That is the part
            worth having, and it is the part this was built for.
          </p>
        </div>
      </section>

      <section className="mt-20 text-center">
        <h2 className="display text-3xl sm:text-4xl">Get your instrument.</h2>
        <p className="lede mx-auto mt-4 max-w-md">
          Pick a key, pick a grouping, and play until it lands on the one.
        </p>
        <Link href="/practice" className="btn btn-primary mt-8 px-10 py-4 text-base">
          Start practising
        </Link>
      </section>
    </div>
  );
}

/* The tracked uppercase kicker that used to sit above each heading is gone.
   It was editorial scaffolding — the page numbering its own chapters — and the
   headings carry their own weight without it. */
function Section({
  title, children,
}: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-24 border-t border-line pt-14">
      <h2 className="display text-3xl sm:text-[42px]">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}
