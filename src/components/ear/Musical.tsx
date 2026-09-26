/**
 * Text with ♭ and ♯ set in the sans face. Cormorant has no accidentals, so in
 * an italic line they fell back to a system glyph that sat loose and low.
 */
export default function Musical({ text }: { text: string }) {
  const parts = text.split(/([♭♯])/);
  return (
    <>
      {parts.map((p, i) =>
        p === "♭" || p === "♯"
          ? <span key={i} className="font-sans text-[0.78em] not-italic">{p}</span>
          : p)}
    </>
  );
}
