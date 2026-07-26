/**
 * Meters and talas.
 *
 * The drill was hard-wired to 4/4 from the first prototype, even though the
 * resolution solver always accepted any bar length. This closes that gap.
 *
 * MODEL: a meter is { top, bottom }. The "beat" is the bottom unit — a quarter in
 * X/4, an eighth in X/8. `subdivision` is how many notes you play per that unit.
 * So 4/4 with subdivision 4 is sixteenths; 7/8 with subdivision 2 is also
 * sixteenths, fourteen of them to the bar. This keeps one arithmetic for both
 * Western meters and Carnatic talas.
 */

export interface Meter {
  id: string;
  label: string;
  top: number;
  bottom: 4 | 8;
  /** grouping of beats for beaming and accent, e.g. 7/8 as 2+2+3 */
  grouping?: number[];
  family: "simple" | "compound" | "odd" | "tala";
  note?: string;
}

export const METERS: Meter[] = [
  { id: "4-4", label: "4/4", top: 4, bottom: 4, family: "simple",
    note: "The default. Everything in the theory documents is calculated against it." },
  { id: "3-4", label: "3/4", top: 3, bottom: 4, family: "simple" },
  { id: "2-4", label: "2/4", top: 2, bottom: 4, family: "simple" },
  { id: "5-4", label: "5/4", top: 5, bottom: 4, family: "odd",
    note: "Five quarters. A six-note scale in fives against this locks immediately." },
  { id: "7-4", label: "7/4", top: 7, bottom: 4, family: "odd" },
  { id: "6-8", label: "6/8", top: 6, bottom: 8, grouping: [3, 3], family: "compound",
    note: "Two dotted-quarter beats. The 6/8 gospel feel." },
  { id: "9-8", label: "9/8", top: 9, bottom: 8, grouping: [3, 3, 3], family: "compound" },
  { id: "12-8", label: "12/8", top: 12, bottom: 8, grouping: [3, 3, 3, 3], family: "compound" },
  { id: "5-8", label: "5/8", top: 5, bottom: 8, grouping: [3, 2], family: "odd" },
  { id: "7-8", label: "7/8", top: 7, bottom: 8, grouping: [2, 2, 3], family: "odd",
    note: "Counted 2+2+3. Misra gati's Western cousin." },
];

export const meterById = (id: string): Meter =>
  METERS.find((m) => m.id === id) ?? METERS[0];

/** Notes in one bar at a given subdivision. */
export const pulsesPerBar = (m: Meter, subdivision: number) => m.top * subdivision;

/** The VexFlow duration for one pulse, plus whether it needs a tuplet bracket.
 *  unitValue = bottom × subdivision, so 4/4+4 and 7/8+2 both come out sixteenths. */
export function pulseDuration(m: Meter, subdivision: number): {
  duration: string; tuplet: number | null;
} {
  const unit = m.bottom * subdivision;
  if (unit === 2) return { duration: "2", tuplet: null };
  if (unit === 4) return { duration: "4", tuplet: null };
  if (unit === 8) return { duration: "8", tuplet: null };
  if (unit === 16) return { duration: "16", tuplet: null };
  if (unit === 32) return { duration: "32", tuplet: null };
  if (unit === 12) return { duration: "8", tuplet: 3 };    // eighth triplets
  if (unit === 24) return { duration: "16", tuplet: 3 };   // sixteenth triplets
  if (unit === 6) return { duration: "4", tuplet: 3 };     // quarter triplets
  return { duration: "16", tuplet: null };
}

/** Beam groups, as a fraction of a whole note, honouring compound grouping. */
export function beamGroups(m: Meter): { num: number; den: number }[] {
  if (m.grouping) return m.grouping.map((g) => ({ num: g, den: m.bottom }));
  return [{ num: 1, den: 4 }];
}

/* ── Carnatic talas ────────────────────────────────────────────────────────
   The sapta talas, built from their anga structure. Laghu length is the jati;
   drutam is always 2; anudrutam is always 1.

   ⚠️ The akshara totals below are COMPUTED from the anga structure, not copied
   from a printed source — docs/07-CARNATIC.md flags this. The method validates
   on the one case everybody knows: chatusra-jati Triputa = 4+2+2 = 8 = Adi tala.
   Verify against Bhagyalekshmy or the Music Academy syllabus before printing
   these numbers as authoritative.                                            */

export type Anga = "L" | "D" | "U";
export const JATIS = [
  { id: 3, name: "Tisra" }, { id: 4, name: "Chatusra" }, { id: 5, name: "Khanda" },
  { id: 7, name: "Misra" }, { id: 9, name: "Sankeerna" },
];

export interface Tala {
  id: string;
  name: string;
  angas: Anga[];
  defaultJati: number;
}

export const SAPTA_TALAS: Tala[] = [
  { id: "dhruva",  name: "Dhruva",  angas: ["L", "D", "L", "L"], defaultJati: 4 },
  { id: "matya",   name: "Matya",   angas: ["L", "D", "L"],      defaultJati: 4 },
  { id: "rupaka",  name: "Rupaka",  angas: ["D", "L"],           defaultJati: 4 },
  { id: "jhampa",  name: "Jhampa",  angas: ["L", "U", "D"],      defaultJati: 7 },
  { id: "triputa", name: "Triputa", angas: ["L", "D", "D"],      defaultJati: 3 },
  { id: "ata",     name: "Ata",     angas: ["L", "L", "D", "D"], defaultJati: 5 },
  { id: "eka",     name: "Eka",     angas: ["L"],                defaultJati: 4 },
];

export const angaLength = (a: Anga, jati: number) => (a === "L" ? jati : a === "D" ? 2 : 1);

export const aksharas = (t: Tala, jati: number) =>
  t.angas.reduce((sum, a) => sum + angaLength(a, jati), 0);

/** A tala expressed as a Meter the drill engine can use directly. */
export function talaAsMeter(t: Tala, jati: number): Meter {
  const count = aksharas(t, jati);
  const jatiName = JATIS.find((j) => j.id === jati)?.name ?? String(jati);
  const isAdi = t.id === "triputa" && jati === 4;
  return {
    id: `tala-${t.id}-${jati}`,
    label: isAdi ? `Adi (${count})` : `${jatiName} ${t.name} (${count})`,
    top: count,
    bottom: 4,
    grouping: t.angas.map((a) => angaLength(a, jati)),
    family: "tala",
    note: isAdi
      ? "Chatusra-jati Triputa — the tala nearly everything is taught in."
      : `${t.angas.join(" ")} · laghu of ${jati}`,
  };
}

/** The 35 talas, as meters. */
export function allTalaMeters(): Meter[] {
  return SAPTA_TALAS.flatMap((t) => JATIS.map((j) => talaAsMeter(t, j.id)));
}

/** The seven usually taught first: each tala in its default jati. */
export function saptaTalaMeters(): Meter[] {
  return SAPTA_TALAS.map((t) => talaAsMeter(t, t.defaultJati));
}
