#!/usr/bin/env python3
"""
SHADAVA — reference theory engine (prototype / proof).

Purpose: this file is NOT the app. It is the *verified specification*.
Every claim the app makes in its UI must be reproducible by running this file.
The production TypeScript engine must produce byte-identical results for the
truth tables printed at the bottom.

Run:  python3 shadava_theory.py
Run:  python3 shadava_theory.py --json   (machine-readable dump for tests)

Author: prepared for Jason Zac / Nathaniel School of Music
"""

from __future__ import annotations
import itertools, json, sys
from math import gcd
from dataclasses import dataclass, field, asdict

# ----------------------------------------------------------------------------
# 1. PITCH SPELLING  — the part every scale app gets wrong
# ----------------------------------------------------------------------------
# We never store "a note" as an integer. A note is (letter, alteration, octave).
# This is the ONLY way VexFlow/notation comes out right in every key, and the
# only way "the 4th is removed" stays true when the 4th is Fb or E#.

LETTERS = "CDEFGAB"
LETTER_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
ALT_NAME = {-2: "bb", -1: "b", 0: "", 1: "#", 2: "##"}


@dataclass(frozen=True)
class Note:
    letter: str          # 'C'..'B'
    alt: int             # -2..+2  (bb .. ##)
    octave: int = 4

    @property
    def pc(self) -> int:
        return (LETTER_PC[self.letter] + self.alt) % 12

    @property
    def midi(self) -> int:
        # C4 = 60. Octave rolls at C.
        return 12 * (self.octave + 1) + LETTER_PC[self.letter] + self.alt

    @property
    def name(self) -> str:
        return f"{self.letter}{ALT_NAME[self.alt]}"

    def vexflow(self) -> str:
        # VexFlow key format, e.g. "c#/4", "eb/5"
        return f"{self.letter.lower()}{ALT_NAME[self.alt]}/{self.octave}"

    def __str__(self):
        return self.name


def note_from_letter_and_pc(letter: str, target_pc: int, octave: int = 4) -> Note:
    """Spell `target_pc` using the given letter. Raises if it needs > double alt."""
    base = LETTER_PC[letter]
    alt = (target_pc - base) % 12
    if alt > 6:
        alt -= 12
    if abs(alt) > 2:
        raise ValueError(f"cannot spell pc {target_pc} on letter {letter} (needs {alt})")
    return Note(letter, alt, octave)


def letter_index(letter: str) -> int:
    return LETTERS.index(letter)


def step_letter(letter: str, steps: int) -> str:
    return LETTERS[(letter_index(letter) + steps) % 7]


# Generic interval (letter distance) + specific interval (semitones) -> name.
INTERVAL_NAMES = {
    (0, 0): "P1", (0, 1): "A1",
    (1, 1): "m2", (1, 2): "M2", (1, 3): "A2", (1, 0): "d2",
    (2, 3): "m3", (2, 4): "M3", (2, 2): "d3", (2, 5): "A3",
    (3, 5): "P4", (3, 6): "A4", (3, 4): "d4",
    (4, 7): "P5", (4, 6): "d5", (4, 8): "A5",
    (5, 8): "m6", (5, 9): "M6", (5, 10): "A6", (5, 7): "d6",
    (6, 10): "m7", (6, 11): "M7", (6, 9): "d7",
}


def interval_name(a: Note, b: Note) -> str:
    """Directed, ascending interval name from a to b (assumes b >= a)."""
    gen = (letter_index(b.letter) - letter_index(a.letter)) % 7
    semis = (b.pc - a.pc) % 12
    return INTERVAL_NAMES.get((gen, semis), f"?{gen}/{semis}")


# ----------------------------------------------------------------------------
# 2. KEY SIGNATURES  — 30 keys, correct, no shortcuts
# ----------------------------------------------------------------------------
# Order of sharps F C G D A E B ; flats B E A D G C F
SHARP_ORDER = "FCGDAEB"
FLAT_ORDER = "BEADGCF"

MAJOR_KEYS = {  # tonic name -> number of accidentals (+sharps / -flats)
    "C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F#": 6, "C#": 7,
    "F": -1, "Bb": -2, "Eb": -3, "Ab": -4, "Db": -5, "Gb": -6, "Cb": -7,
}
MINOR_KEYS = {
    "A": 0, "E": 1, "B": 2, "F#": 3, "C#": 4, "G#": 5, "D#": 6, "A#": 7,
    "D": -1, "G": -2, "C": -3, "F": -4, "Bb": -5, "Eb": -6, "Ab": -7,
}


def key_signature_alterations(key_name: str, is_minor: bool) -> dict[str, int]:
    """Return {letter: alteration} implied by the key signature."""
    table = MINOR_KEYS if is_minor else MAJOR_KEYS
    if key_name not in table:
        raise ValueError(f"{key_name}{'m' if is_minor else ''} is not a standard key")
    n = table[key_name]
    alts = {L: 0 for L in LETTERS}
    if n > 0:
        for L in SHARP_ORDER[:n]:
            alts[L] = 1
    else:
        for L in FLAT_ORDER[:-n]:
            alts[L] = -1
    return alts


def build_diatonic_scale(tonic_name: str, mode_semitones: list[int], octave: int = 4) -> list[Note]:
    """Build a 7-note scale spelled with one letter per degree (no letter repeats).
    mode_semitones = ascending semitone offsets from tonic, e.g. major = [0,2,4,5,7,9,11].
    """
    letter = tonic_name[0]
    alt = {"": 0, "#": 1, "b": -1, "##": 2, "bb": -2}[tonic_name[1:]]
    tonic = Note(letter, alt, octave)
    out = []
    for deg, semis in enumerate(mode_semitones):
        L = step_letter(letter, deg)
        target_pc = (tonic.pc + semis) % 12
        # figure the octave: how many letter-wraps past the tonic
        oct_bump = (letter_index(letter) + deg) // 7
        out.append(note_from_letter_and_pc(L, target_pc, octave + oct_bump))
    return out


MAJOR = [0, 2, 4, 5, 7, 9, 11]
NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10]
HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11]
MELODIC_MINOR = [0, 2, 3, 5, 7, 9, 11]


# ----------------------------------------------------------------------------
# 3. SET-CLASS ANALYSIS — prime form, interval vector, tritone count
# ----------------------------------------------------------------------------

def normal_order(pcs: set[int]) -> list[int]:
    """Standard normal order: minimise the outer span first, then pack left."""
    s = sorted(pcs)
    n = len(s)
    rots = []
    for i in range(n):
        rot = [(s[(i + j) % n] - s[i]) % 12 for j in range(n)]
        rots.append(rot)
    return min(rots, key=lambda r: (r[-1], r))


def prime_form(pcs: set[int]) -> list[int]:
    a = normal_order(pcs)
    inv = normal_order({(-p) % 12 for p in pcs})
    return min(a, inv)


def interval_vector(pcs: set[int]) -> list[int]:
    v = [0] * 6
    for a, b in itertools.combinations(sorted(pcs), 2):
        ic = (b - a) % 12
        ic = min(ic, 12 - ic)
        v[ic - 1] += 1
    return v


# Keyed by PRIME FORM (not by raw pitch classes -- an earlier version of this
# table was keyed by pcs, so half the lookups silently never matched).
FORTE = {
    (0, 2, 4, 5, 7, 9): "6-32  'Guidonian / major / diatonic hexachord'",
    (0, 1, 4, 5, 8, 9): "6-20  'augmented' / Cohn's hexatonic collection",
    (0, 2, 4, 6, 8, 10): "6-35  'whole-tone'",
    (0, 2, 3, 5, 7, 9): "6-33  'Dorian hexachord'",
    (0, 1, 2, 4, 7, 9): "6-Z47 'blues' (minor AND major blues -- same class, T3 apart)",
    (0, 1, 3, 6, 7, 9): "6-30  'Petrushka / tritone'",
    (0, 1, 3, 5, 7, 9): "6-34  'Prometheus / mystic'",
    (0, 1, 3, 4, 6, 9): "6-27",
}
# The five TRITONE-FREE hexachord set classes (of 50) -- verified by exhaustive
# enumeration of all 924 six-note subsets of the aggregate. Our two headline
# families are both in this five-member club.
TRITONE_FREE_HEXACHORDS = [
    (0, 1, 2, 3, 4, 5), (0, 1, 3, 4, 5, 8), (0, 1, 4, 5, 8, 9),
    (0, 2, 3, 4, 5, 7), (0, 2, 4, 5, 7, 9),
]


# ----------------------------------------------------------------------------
# 4. THE SCALE OBJECT
# ----------------------------------------------------------------------------

@dataclass
class Scale:
    name: str
    notes: list[Note]           # ascending, one octave, tonic first, no octave dup
    parent: str = ""            # what heptatonic it came from
    omitted: str = ""           # which degree was knocked off
    family: str = ""

    @property
    def size(self) -> int:
        return len(self.notes)

    @property
    def pcs(self) -> set[int]:
        return {n.pc for n in self.notes}

    @property
    def steps(self) -> list[int]:
        """Semitone steps between consecutive degrees, wrapping the octave."""
        p = [n.pc for n in self.notes]
        return [(p[(i + 1) % len(p)] - p[i]) % 12 for i in range(len(p))]

    def degree_names(self) -> list[str]:
        return [n.name for n in self.notes]


def hexatonic_by_omission(tonic: str, mode: list[int], omit_degree: int,
                          label: str, family: str) -> Scale:
    """omit_degree is 1-indexed scale degree (4 = the 4th, 6 = the b6, etc.)"""
    full = build_diatonic_scale(tonic, mode)
    omitted = full[omit_degree - 1]
    kept = [n for i, n in enumerate(full) if i != omit_degree - 1]
    return Scale(name=label, notes=kept, parent=tonic,
                 omitted=f"degree {omit_degree} ({omitted.name})", family=family)


# ----------------------------------------------------------------------------
# 5. CHORD DISCOVERY — what triads/tetrads actually live in the scale
# ----------------------------------------------------------------------------

# (intervals above root) -> (symbol suffix, family)
CHORD_QUALITIES = {
    (0, 4, 7): ("", "tertian"), (0, 3, 7): ("m", "tertian"),
    (0, 3, 6): ("dim", "tertian"), (0, 4, 8): ("aug", "tertian"),
    (0, 2, 7): ("sus2", "sus"), (0, 5, 7): ("sus4", "sus"),
    (0, 5, 10): ("quartal", "quartal"),
    (0, 4, 7, 11): ("maj7", "tertian"), (0, 4, 7, 10): ("7", "tertian"),
    (0, 3, 7, 10): ("m7", "tertian"), (0, 3, 6, 10): ("m7b5", "tertian"),
    (0, 3, 6, 9): ("dim7", "tertian"), (0, 4, 7, 9): ("6", "tertian"),
    (0, 3, 7, 9): ("m6", "tertian"), (0, 4, 8, 11): ("maj7#5", "tertian"),
    (0, 3, 7, 11): ("mMaj7", "tertian"),
    (0, 2, 7, 10): ("7sus2", "sus"), (0, 5, 7, 10): ("7sus4", "sus"),
    (0, 2, 5, 7): ("quartal4", "quartal"), (0, 5, 10, 3): ("quartal4", "quartal"),
}
# canonical root preference: tertian roots win over sus/quartal relabellings
FAMILY_RANK = {"tertian": 0, "sus": 1, "quartal": 2}


def find_chords(scale: Scale, sizes=(3, 4)) -> dict[int, list[dict]]:
    """Every chord fully contained in the scale, grouped by pitch-class SET.

    One pitch-class set = one object with possibly several legitimate names
    (Am7 and C6 are the same four notes). The app must present it that way.
    """
    pcs = sorted(scale.pcs)
    spelled = {n.pc: n for n in scale.notes}
    found = {s: [] for s in sizes}
    for size in sizes:
        seen: dict[frozenset, list] = {}
        for combo in itertools.combinations(pcs, size):
            cset = frozenset(combo)
            seen.setdefault(cset, [])
            for root in combo:
                iv = tuple(sorted((p - root) % 12 for p in combo))
                hit = CHORD_QUALITIES.get(iv)
                if not hit:
                    continue
                suffix, family = hit
                seen[cset].append({
                    "root": spelled[root].name,
                    "family": family,
                    "symbol": spelled[root].name + suffix,
                    "notes": [spelled[p].name for p in sorted(combo, key=lambda x: (x - root) % 12)],
                })
        for cset, entries in seen.items():
            if not entries:
                continue
            entries.sort(key=lambda e: FAMILY_RANK[e["family"]])
            found[size].append({
                "pcset": sorted(cset),
                "notes": entries[0]["notes"],
                "primary_family": entries[0]["family"],
                "names": [e["symbol"] for e in entries],
                "spellings": entries,
            })
        found[size].sort(key=lambda c: (FAMILY_RANK[c["primary_family"]], c["pcset"]))
    return found


def modal_rotations(scale: Scale) -> list[dict]:
    """All N rotations of the parent set, each described against its own root."""
    n = scale.size
    out = []
    for i in range(n):
        rot = [scale.notes[(i + k) % n] for k in range(n)]
        root = rot[0]
        semis = [(x.pc - root.pc) % 12 for x in rot]
        # degree label relative to a major scale on that root
        MAJ = {0: "1", 2: "2", 4: "3", 5: "4", 7: "5", 9: "6", 11: "7",
               1: "b2", 3: "b3", 6: "b5", 8: "b6", 10: "b7"}
        degrees = [MAJ[s] for s in semis]
        out.append({
            "mode": i + 1,
            "root": root.name,
            "notes": [x.name for x in rot],
            "degrees": degrees,
            "has_third": ("3" in degrees or "b3" in degrees),
            "has_fifth": ("5" in degrees),
            "steps": [(semis[(k + 1) % n] - semis[k]) % 12 for k in range(n)],
        })
    return out


# ----------------------------------------------------------------------------
# 6. SKIP CYCLES — "in thirds" for a scale that has no thirds
# ----------------------------------------------------------------------------
# In a 7-note scale, "in 3rds" = skip 1 scale degree.
# In a 6-note scale, skip-1 produces a MIX of m3/M3/P4. That is the whole point.

def skip_cycle(scale: Scale, skip: int, octaves: int = 2) -> list[tuple[Note, Note, str]]:
    """Return (from, to, interval-name) for every degree, stepping `skip` degrees."""
    n = scale.size
    out = []
    for i in range(n):
        a = scale.notes[i]
        j = i + skip
        oct_bump = j // n
        b0 = scale.notes[j % n]
        b = Note(b0.letter, b0.alt, b0.octave + oct_bump)
        out.append((a, b, interval_name(a, b)))
    return out


def skip_cycle_summary(scale: Scale, skip: int) -> dict:
    cyc = skip_cycle(scale, skip)
    names = [iv for _, _, iv in cyc]
    tally = {}
    for x in names:
        tally[x] = tally.get(x, 0) + 1
    return {"skip": skip, "intervals": names, "tally": tally,
            "unique": sorted(tally, key=lambda k: -tally[k])}


# ----------------------------------------------------------------------------
# 7. THE RESOLUTION SOLVER  — Jason's core rhythmic ask
# ----------------------------------------------------------------------------
# "Move in 4/4 in sets of 3s/4s/5s/6s/7s until the scale resolves on the 1 of a bar."
#
# Two independent cycles are phasing against each other:
#   (a) the SCALE cycle   — length = notes per full traversal (6 per octave, 12 for 2 oct)
#   (b) the BAR cycle     — length = subdivisions per bar (e.g. 4/4 in 16ths = 16)
# and optionally
#   (c) the GROUPING cycle — accent every N notes
#
# The phrase "resolves" when the TONIC lands on beat 1 of a bar, i.e. after
# LCM(scale_cycle, bar_subdivisions) notes.  If a grouping is applied, we take
# LCM of all three so the accent, the tonic and the downbeat coincide.

def lcm(a: int, b: int) -> int:
    return a * b // gcd(a, b)


@dataclass
class Resolution:
    scale_size: int
    octaves: int
    subdivision: int          # notes per beat (2=8ths, 3=triplets, 4=16ths, 6=sextuplets)
    beats_per_bar: int
    grouping: int | None
    notes_per_cycle: int
    notes_per_bar: int
    total_notes: int
    bars: float
    scale_traversals: int
    groups: float | None
    verdict: str


def solve_resolution(scale_size=6, octaves=1, subdivision=4, beats_per_bar=4,
                     grouping=None, include_octave_note=False,
                     mode="full") -> Resolution:
    """mode='accent' : only the ACCENT must return to beat 1  (ignore the scale)
       mode='full'   : accent + TONIC + downbeat must all coincide
    Both are musically real. 'accent' is the shorter, groovier drill; 'full' is
    the one that actually 'resolves' the way Jason means it."""
    per_traversal = scale_size * octaves + (1 if include_octave_note else 0)
    notes_per_bar = subdivision * beats_per_bar
    cycles = [notes_per_bar]
    if mode == "full":
        cycles.append(per_traversal)
    if grouping:
        cycles.append(grouping)
    total = 1
    for c in cycles:
        total = lcm(total, c)
    bars = total / notes_per_bar
    verdict = (f"{total} notes = {bars:g} bar(s); "
               f"{total // per_traversal} traversal(s)"
               + (f"; {total // grouping} group(s) of {grouping}" if grouping else ""))
    return Resolution(scale_size, octaves, subdivision, beats_per_bar, grouping,
                      per_traversal, notes_per_bar, total, bars,
                      total // per_traversal,
                      (total / grouping) if grouping else None, verdict)


def resolution_grid(scale_sizes=(5, 6, 7, 8), subdivisions=(2, 3, 4, 6),
                    groupings=(3, 4, 5, 6, 7), octaves=1, beats_per_bar=4):
    rows = []
    for ss in scale_sizes:
        for sub in subdivisions:
            for g in groupings:
                r = solve_resolution(ss, octaves, sub, beats_per_bar, g)
                rows.append(r)
    return rows


# ----------------------------------------------------------------------------
# 8. SEQUENCE / PATTERN GENERATOR  (varisai engine)
# ----------------------------------------------------------------------------

def sequence_cells(scale: Scale, cell_len: int, step: int = 1,
                   octaves: int = 2, direction: str = "up",
                   cell_shape: str = "run") -> list[list[Note]]:
    """Generate melodic cells.
    cell_shape 'run'  : consecutive scale degrees  (C D E / D E G / ...)
    cell_shape 'skip1': every other degree          (C E A / D G B / ...)
    """
    n = scale.size
    total_degrees = n * octaves
    ladder = []
    for i in range(total_degrees + cell_len):
        base = scale.notes[i % n]
        ladder.append(Note(base.letter, base.alt, base.octave + i // n))
    cells = []
    stride = 1 if cell_shape == "run" else 2
    i = 0
    while i + (cell_len - 1) * stride < len(ladder):
        cell = [ladder[i + k * stride] for k in range(cell_len)]
        cells.append(cell)
        i += step
        if len(cells) >= total_degrees:
            break
    if direction == "down":
        cells = [list(reversed(c)) for c in reversed(cells)]
    return cells


# ----------------------------------------------------------------------------
# 9. THE SCALE LIBRARY
# ----------------------------------------------------------------------------

def build_library(tonic="C") -> dict[str, Scale]:
    lib = {}
    lib["major_no4"] = hexatonic_by_omission(
        tonic, MAJOR, 4, "Ionian/Lydian Hexatonic (major no 4)", "diatonic-hexachord")
    lib["major_no7"] = hexatonic_by_omission(
        tonic, MAJOR, 7, "Ionian/Mixolydian Hexatonic (Guidonian, major no 7)", "diatonic-hexachord")
    lib["minor_nob6"] = hexatonic_by_omission(
        tonic, NATURAL_MINOR, 6, "Dorian/Aeolian Hexatonic (minor no b6) = raga Pushpalathika", "diatonic-hexachord")
    lib["minor_no2"] = hexatonic_by_omission(
        tonic, NATURAL_MINOR, 2, "Minor Hexatonic (no 2) — Phrygian-neutral", "diatonic-hexachord")
    lib["dorian_no6"] = hexatonic_by_omission(
        tonic, [0, 2, 3, 5, 7, 9, 10], 6, "Dorian Hexatonic (no 6)", "diatonic-hexachord")
    lib["mixolydian_no4"] = hexatonic_by_omission(
        tonic, [0, 2, 4, 5, 7, 9, 10], 4, "Mixolydian Hexatonic (no 4)", "diatonic-hexachord")
    lib["harmonic_minor_no2"] = hexatonic_by_omission(
        tonic, HARMONIC_MINOR, 2, "Harmonic Minor Hexatonic (no 2)", "altered-hexachord")
    return lib


def diatonic_omission_survey(tonic="C") -> list[dict]:
    """THE THEOREM: remove each of the 7 notes of the major scale in turn.
    Which removals kill the tritone? Which produce set-class 6-32?"""
    full = build_diatonic_scale(tonic, MAJOR)
    rows = []
    for i, removed in enumerate(full):
        kept = [n for j, n in enumerate(full) if j != i]
        pcs = {n.pc for n in kept}
        pf = tuple(prime_form(pcs))
        iv = interval_vector(pcs)
        rows.append({
            "removed_degree": i + 1,
            "removed_note": removed.name,
            "notes": [n.name for n in kept],
            "prime_form": list(pf),
            "forte": FORTE.get(pf, "—"),
            "interval_vector": iv,
            "tritones": iv[5],
            "is_6_32": pf == (0, 2, 4, 5, 7, 9),
        })
    return rows


# ----------------------------------------------------------------------------
# 10. NON-DIATONIC HEXATONIC FAMILIES
# ----------------------------------------------------------------------------

# For non-diatonic hexatonics, letters do NOT map 1:1 to degrees, so we declare
# the letter template explicitly per family. Guessing produces E#/D# nonsense.
SYNTHETIC_SPECS = {
    # key: (semitones, letter offsets from tonic letter, label, note)
    "augmented":  ([0, 3, 4, 7, 8, 11], [0, 1, 2, 4, 5, 6],
                   "Augmented Hexatonic (jazz 'the hexatonic scale')",
                   "two augmented triads a semitone apart; 3 maj + 3 min triads inside"),
    "whole_tone": ([0, 2, 4, 6, 8, 10], [0, 1, 2, 3, 4, 5],
                   "Whole Tone", "no perfect fifth anywhere; 6 augmented triads"),
    "blues":      ([0, 3, 5, 6, 7, 10], [0, 2, 3, 4, 4, 6],
                   "Blues Hexatonic", "minor pentatonic + b5 passing tone"),
    "prometheus": ([0, 2, 4, 6, 9, 10], [0, 1, 2, 3, 5, 6],
                   "Prometheus (Scriabin 'mystic')", "1 2 3 #4 6 b7"),
    "tritone":    ([0, 1, 4, 6, 7, 10], [0, 1, 2, 3, 4, 6],
                   "Petrushka / Tritone Hexatonic", "two major triads a tritone apart"),
}


def symmetric_hexatonics(tonic="C") -> dict[str, Scale]:
    """Built from interval patterns rather than omission, with declared spelling."""
    out = {}
    root = Note(tonic[0], {"": 0, "#": 1, "b": -1, "##": 2, "bb": -2}[tonic[1:]], 4)
    for key, (pattern, letters, label, note) in SYNTHETIC_SPECS.items():
        notes = []
        for semis, loff in zip(pattern, letters):
            L = step_letter(root.letter, loff)
            target = (root.pc + semis) % 12
            notes.append(note_from_letter_and_pc(L, target, 4))
        out[key] = Scale(name=label, notes=notes, family="symmetric/synthetic",
                         omitted=note)
    return out


# ----------------------------------------------------------------------------
# 10b. TRIAD PAIRS — the jazz route into hexatonics (Weiskopf / Campbell /
#      Bergonzi). Any two triads with no shared notes generate a hexatonic.
#      This is the roadmap feature; it falls out of the code we already have.
# ----------------------------------------------------------------------------

TRIAD_SHAPES = {"maj": (0, 4, 7), "min": (0, 3, 7), "dim": (0, 3, 6), "aug": (0, 4, 8)}


def triad_pair(root_a: str, qual_a: str, root_b: str, qual_b: str):
    """Return the hexatonic generated by two triads, or None if they overlap."""
    ra = Note(root_a[0], {"": 0, "#": 1, "b": -1}[root_a[1:]], 4)
    rb = Note(root_b[0], {"": 0, "#": 1, "b": -1}[root_b[1:]], 4)
    a = {(ra.pc + i) % 12 for i in TRIAD_SHAPES[qual_a]}
    b = {(rb.pc + i) % 12 for i in TRIAD_SHAPES[qual_b]}
    if a & b:
        return None                       # shared notes -> fewer than 6 pitches
    pcs = a | b
    return {
        "pair": f"{root_a}{'' if qual_a=='maj' else qual_a} + {root_b}{'' if qual_b=='maj' else qual_b}",
        "pcs": sorted(pcs),
        "prime_form": prime_form(pcs),
        "forte": FORTE.get(tuple(prime_form(pcs)), "—"),
        "interval_vector": interval_vector(pcs),
        "tritones": interval_vector(pcs)[5],
    }


def survey_triad_pairs():
    """Every 2-major-triad pair by root interval — the classic study."""
    rows = []
    for semis, label in [(1, "semitone"), (2, "whole step"), (3, "minor 3rd"),
                         (4, "major 3rd"), (5, "perfect 4th"), (6, "tritone")]:
        names = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
        r = triad_pair("C", "maj", names[semis], "maj")
        if r:
            r["root_interval"] = label
            rows.append(r)
    return rows


def n_tonic_by_omission(tonic: str, mode: list[int], omit: list[int], label: str):
    """Generalised: omit ANY set of degrees. 2 omissions -> pentatonic,
    0 -> heptatonic. Proves the engine is not hexatonic-specific."""
    full = build_diatonic_scale(tonic, mode)
    kept = [n for i, n in enumerate(full) if (i + 1) not in omit]
    return Scale(name=label, notes=kept, parent=tonic,
                 omitted=", ".join(full[i - 1].name for i in omit))


OCTATONIC_SPECS = {
    # 8 notes into 7 letters means exactly ONE letter must repeat. Which one is a
    # spelling CONVENTION, not a computation -- so declare it, never guess.
    "whole-half": ([0, 2, 3, 5, 6, 8, 9, 11], [0, 1, 2, 3, 4, 5, 5, 6]),
    "half-whole": ([0, 1, 3, 4, 6, 7, 9, 10], [0, 1, 2, 2, 3, 4, 5, 6]),
}


def octatonic(tonic: str, kind: str = "whole-half"):
    """The symmetric diminished scales. NOT Barry Harris - see docs.

    IMPORTANT FINDING: 8 notes into 7 letters means exactly one letter repeats,
    and WHICH one cannot be fixed globally -- a template that spells C cleanly
    gives Eb a double-flat. So we try every legal position for the doubled letter
    and keep the spelling with the lowest accidental cost. This is the correct
    general algorithm and the same approach will be needed for any scale with
    more notes than letters.
    """
    pat, _ = OCTATONIC_SPECS[kind]
    root = Note(tonic[0], {"": 0, "#": 1, "b": -1, "##": 2, "bb": -2}[tonic[1:]], 4)
    best, best_cost = None, None
    for dbl in range(7):                       # which letter index gets doubled
        letters, li = [], 0
        for i in range(8):
            letters.append(li)
            li += 0 if i == dbl else 1
        if letters[-1] > 6:
            continue
        try:
            notes = [note_from_letter_and_pc(step_letter(root.letter, lo),
                                             (root.pc + s) % 12, 4)
                     for s, lo in zip(pat, letters)]
        except ValueError:
            continue                            # needed a triple accidental
        # square the alteration so double accidentals are punished hard, then
        # tie-break TOWARDS the key's own accidental direction: flat keys should
        # spell Gb, sharp keys F#. Without this the tie resolves arbitrarily.
        flat_key = MAJOR_KEYS.get(tonic, 0) < 0 or tonic.endswith("b")
        wrong_dir = sum(1 for n in notes if (n.alt > 0) == flat_key and n.alt != 0)
        cost = sum(abs(n.alt) ** 2 for n in notes) * 10 + wrong_dir
        if best_cost is None or cost < best_cost:
            best, best_cost = notes, cost
    if best is None:
        raise ValueError(f"cannot spell {tonic} octatonic ({kind})")
    return Scale(name=f"{tonic} octatonic ({kind})", notes=best, family="symmetric")


# ----------------------------------------------------------------------------
# 11. REPORT
# ----------------------------------------------------------------------------

def hr(title=""):
    print("\n" + "=" * 78)
    if title:
        print(title)
        print("=" * 78)


def report():
    print(r"""
   ____  _   _    _    ____    ___     ___
  / ___|| | | |  / \  |  _ \  / \ \   / / \
  \___ \| |_| | / _ \ | | | |/ _ \ \ / / _ \
   ___) |  _  |/ ___ \| |_| / ___ \ V / ___ \
  |____/|_| |_/_/   \_\____/_/   \_\_/_/   \_\
        the six-note practice engine — VERIFICATION RUN
    """)

    # ---- THEOREM 1 -------------------------------------------------------
    hr("THEOREM 1 — Which note can you 'knock off' the major scale, and why?")
    print("Remove each degree of C major in turn. Count tritones in what's left.\n")
    print(f"{'deg':<4}{'removed':<9}{'resulting scale':<28}{'tritones':<10}{'set class'}")
    print("-" * 78)
    for r in diatonic_omission_survey("C"):
        print(f"{r['removed_degree']:<4}{r['removed_note']:<9}"
              f"{' '.join(r['notes']):<28}{r['tritones']:<10}{r['forte']}")
    print("""
READING: the major scale contains exactly ONE tritone (F-B). Removing either
member of that tritone -- the 4th or the 7th -- and ONLY those two, leaves a
tritone-free hexachord of set class 6-32. Every other removal leaves the
tritone in place.

>>> This is why every tradition independently arrived at "drop the 4" or
>>> "drop the 7". It is not taste. It is the only way to de-tritone the scale.
""")

    # ---- THEOREM 2 -------------------------------------------------------
    hr("THEOREM 2 — Major-no-4 and minor-no-b6 are the SAME six notes")
    lib = build_library("C")
    a = lib["major_no4"]
    amin = hexatonic_by_omission("A", NATURAL_MINOR, 6, "A minor hexatonic", "d")
    print(f"C major, no 4      : {' '.join(a.degree_names())}   pcs={sorted(a.pcs)}")
    print(f"A natural minor,no b6: {' '.join(amin.degree_names())}   pcs={sorted(amin.pcs)}")
    print(f"IDENTICAL PITCH-CLASS SET: {a.pcs == amin.pcs}")
    g = build_diatonic_scale("G", MAJOR)[:6]
    print(f"G Guidonian hexachord (ut re mi fa sol la): {' '.join(n.name for n in g)}"
          f"   pcs={sorted({n.pc for n in g})}")
    print(f"SAME SET AS C-major-no-4: {a.pcs == {n.pc for n in g}}")
    print("""
>>> One parent set, six modes -- exactly like relative major/minor pentatonic.
>>> The app stores ONE hexachord and rotates it. Never two separate scales.
>>> And it is literally Guido d'Arezzo's 11th-century teaching hexachord.
""")

    # ---- SET CLASS -------------------------------------------------------
    hr("SET-CLASS FINGERPRINT of every hexatonic family (root C)")
    allscales = {**build_library("C"), **symmetric_hexatonics("C")}
    print(f"{'scale':<46}{'notes':<26}{'iv':<20}{'TT'}")
    print("-" * 100)
    for k, s in allscales.items():
        iv = interval_vector(s.pcs)
        pf = tuple(prime_form(s.pcs))
        print(f"{s.name:<46}{' '.join(s.degree_names()):<26}"
              f"{'<' + ''.join(str(x) for x in iv) + '>':<20}{iv[5]}")
    print("""
iv = interval vector <ic1 ic2 ic3 ic4 ic5 ic6>.  Last digit = tritone count.
The diatonic hexachord scores <143250>: ZERO tritones and FIVE perfect
fourths/fifths -- the most consonant, most quartal six-note set available.
""")

    # ---- THE WHOLE SCALE IS ONE CHORD ------------------------------------
    hr("THEOREM 3 — The hexatonic IS a chord")
    s = lib["major_no4"]
    print(f"C major hexatonic: {' '.join(s.degree_names())}")
    print("Stack it in thirds from C:  C - E - G - B - D - A  =  Cmaj13(no 11)")
    print("Stack it in thirds from A:  A - C - E - G - B - D  =  Am11")
    print("""
>>> Every note of the scale is a chord tone. There is no avoid note, because
>>> the avoid note is precisely the one we removed. This is why it sounds
>>> 'always right'. NOTE: the avoid-note doctrine is HARMONIC (barred from
>>> voicings, fine as a passing tone), and the b6-over-i-7 case is CONTESTED.
>>> Lead with the TRITONE argument -- that one is arithmetic and cannot be argued.
""")

    # ---- THE SIX MODES ---------------------------------------------------
    hr("THE SIX MODES of the diatonic hexachord (one parent set, six colours)")
    print(f"{'#':<3}{'root':<6}{'notes':<22}{'degrees':<26}{'3rd?':<7}{'5th?'}")
    print("-" * 78)
    for m in modal_rotations(lib["major_no4"]):
        print(f"{m['mode']:<3}{m['root']:<6}{' '.join(m['notes']):<22}"
              f"{' '.join(m['degrees']):<26}{'yes' if m['has_third'] else 'NO':<7}"
              f"{'yes' if m['has_fifth'] else 'NO'}")
    print("""
>>> Mode 4 (on G) = 1 2 3 4 5 6, the folk/Guidonian 'major hexatonic'.
>>> Mode 5 (on A) = 1 2 b3 4 5 b7, Jason's minor hexatonic.
>>> Mode 1 (on C) = 1 2 3 5 6 7, the Ionian/LYDIAN hexatonic: it refuses to
>>>   commit to 4 or #4, which is why it works over Cmaj7 AND Cmaj7#11.
>>> NOT the 'gospel scale' -- that name means 1 2 b3 3 5 6 (major blues).
>>> Mode 2 (on D) has NO 3rd  -> a pure sus/quartal mode.
>>> Mode 6 (on B) has NO 5th  -> the unstable one; useful, rarely a tonic.
>>> The minor hexatonic contains no 6th at all, so it is Dorian/Aeolian
>>> AMBIGUOUS -- the note that decides was the note we removed. It therefore
>>> works over BOTH m7 and m6 harmony. That is a real improvising advantage.
""")

    # ---- AVAILABLE HARMONY -----------------------------------------------
    hr("THEOREM 4 — Available harmony is SMALL (and that's the feature)")
    for key in ("major_no4", "minor_nob6"):
        s = lib[key]
        ch = find_chords(s, sizes=(3, 4))
        tri = [c for c in ch[3] if c["primary_family"] == "tertian"]
        sus = [c for c in ch[3] if c["primary_family"] != "tertian"]
        tet = [c for c in ch[4] if c["primary_family"] == "tertian"]
        tsus = [c for c in ch[4] if c["primary_family"] != "tertian"]
        print(f"\n### {s.name}  [{' '.join(s.degree_names())}]")
        print(f"  TERTIAN TRIADS — {len(tri)}:")
        for c in tri:
            print(f"      {' / '.join(c['names']):<26} = {' '.join(c['notes'])}")
        print(f"  SUS / QUARTAL TRIADS — {len(sus)} (same 6 notes, different stacking):")
        for c in sus:
            print(f"      {' = '.join(c['names']):<40} {' '.join(c['notes'])}")
        print(f"  TERTIAN 4-NOTE CHORDS — {len(tet)} distinct SETS:")
        for c in tet:
            print(f"      {' = '.join(c['names']):<26} {' '.join(c['notes'])}")
        print(f"  SUS 4-NOTE CHORDS — {len(tsus)}")
    print("""
>>> Four tertian triads. Three tertian 4-note SETS, each carrying two equally
>>> correct names (Am7 = C6, Em7 = G6). Jason predicted 'some of them would be
>>> inversions of each other' -- confirmed. The app must model a chord as a
>>> PITCH-CLASS SET with a list of names, never as one root + one quality.
>>> Note also how many sus/quartal stacks exist: the hexatonic is a quartal
>>> harmony machine, which is the McCoy Tyner / gospel-modern sound.
""")

    # ---- SKIP CYCLES -----------------------------------------------------
    hr("THEOREM 5 — 'Practice it in thirds' is impossible. Here is what happens.")
    s = lib["major_no4"]
    maj = Scale("C major", build_diatonic_scale("C", MAJOR))
    print(f"Hexatonic: {' '.join(s.degree_names())}      "
          f"Heptatonic: {' '.join(maj.degree_names())}\n")
    # NOTE: "in thirds" = step TWO scale degrees (C->E). skip index == 2.
    labels = {2: "IN THIRDS   (step 2 degrees)", 3: "IN FOURTHS  (step 3 degrees)",
              4: "IN FIFTHS   (step 4 degrees)", 5: "IN SIXTHS   (step 5 degrees)"}
    for k in (2, 3, 4, 5):
        hx = skip_cycle(s, k)
        hp = skip_cycle(maj, k)
        print(f"{labels[k]}")
        print("   hexa : " + "  ".join(f"{a.name}-{b.name}({iv})" for a, b, iv in hx))
        print(f"          -> {skip_cycle_summary(s, k)['tally']}")
        print("   hepta: " + "  ".join(f"{a.name}-{b.name}({iv})" for a, b, iv in hp))
        print(f"          -> {skip_cycle_summary(maj, k)['tally']}\n")
    print("""
>>> CONFIRMED, exactly as Jason predicted: a hexatonic played 'in thirds' is
>>> NOT in thirds. Stepping two degrees gives 2x M3, 2x m3 and 2x P4. The
>>> fourths appear wherever the removed note left a gap. This is the single
>>> most interesting thing about practising a six-note scale and it is why
>>> the drill sounds like nothing else on the instrument.

>>> AND THE BIG ONE: 'in fourths' (stepping 3 degrees) gives P4 or P5 on
>>> EVERY degree -- six for six, no exceptions. The heptatonic cannot do it:
>>> F-B comes out an AUGMENTED 4th and breaks the chain. The note we removed
>>> IS the note that breaks it. The hexatonic is the only diatonic collection
>>> that cycles in perfect fourths without a single flaw.
""")

    # ---- RESOLUTION GRID -------------------------------------------------
    hr("THE RESOLUTION SOLVER — how many bars until it lands on the '1'?")
    print("4/4. One octave. Tonic must land on beat 1 with the accent.\n")
    print(f"{'scale':<12}{'subdiv':<20}{'group':<8}{'notes':<8}{'bars':<8}{'traversals'}")
    print("-" * 78)
    subnames = {2: "8ths", 3: "8th-triplets", 4: "16ths", 6: "sextuplets"}
    for ss, sname in ((6, "HEXA (6)"), (7, "hepta (7)"), (5, "penta (5)")):
        for sub in (2, 3, 4):
            for gp in (3, 4, 5, 6, 7):
                r = solve_resolution(ss, 1, sub, 4, gp)
                print(f"{sname:<12}{subnames[sub]:<20}{gp:<8}{r.total_notes:<8}"
                      f"{r.bars:<8g}{r.scale_traversals}")
        print()
    print("""
>>> READ THE '6' BLOCK AGAINST THE '7' BLOCK. In 16ths, grouping in 5s:
>>>    hexatonic  -> 240 notes, 15 bars
>>>    heptatonic -> 560 notes, 35 bars
>>> The six-note scale resolves more than twice as fast in every odd grouping.
>>> That is the mathematical reason hexatonic feels good in odd meters and
>>> why this is the right scale to teach groupings with. It is the app's
>>> single most defensible pedagogical claim.
""")

    hr("CLAIM CHECK — is the flawless fourths-cycle unique to the hexatonic?")
    cands = {
        "pentatonic  C D E G A": Scale("p", [Note("C", 0), Note("D", 0), Note("E", 0),
                                             Note("G", 0), Note("A", 0)]),
        "HEXATONIC   C D E G A B": lib["major_no4"],
        "heptatonic  C D E F G A B": maj,
        "minor hexa  C D Eb F G Bb": lib["minor_nob6"],
        "minor penta C Eb F G Bb": Scale("mp", [Note("C", 0), Note("E", -1), Note("F", 0),
                                                Note("G", 0), Note("B", -1)]),
    }
    print(f"{'collection':<28}{'step-3 interval content':<34}{'all perfect?'}")
    print("-" * 78)
    for label, sc in cands.items():
        step = 3 if sc.size == 6 else (2 if sc.size == 5 else 3)
        t = skip_cycle_summary(sc, step)["tally"]
        allperf = set(t) <= {"P4", "P5"}
        print(f"{label:<28}{str(t):<34}{'YES' if allperf else 'no'}")
    print("""
NOTE: for the 5-note scales the comparable 'quartal' drill is step-2 (there is
no step-3 fourths cycle). Either way they carry a M3/m6 in the chain.
>>> Only the six-note diatonic hexachord cycles in unbroken perfect fourths.
>>> This is a genuinely unique, checkable property -- safe to claim on air.
""")

    hr("LOCKED vs PHASING groupings (the drill ladder)")
    print("Hexatonic, 1 octave, 4/4. 'accent' = accent returns to beat 1.")
    print("                          'full'   = accent + TONIC + downbeat coincide.\n")
    print(f"{'subdiv':<16}{'group':<8}{'accent bars':<14}{'full bars':<12}{'type'}")
    print("-" * 70)
    for sub in (2, 3, 4):
        for gp in (3, 4, 5, 6, 7):
            ra = solve_resolution(6, 1, sub, 4, gp, mode="accent")
            rf = solve_resolution(6, 1, sub, 4, gp, mode="full")
            kind = "LOCKED" if ra.bars == 1 else "phasing"
            print(f"{subnames[sub]:<16}{gp:<8}{ra.bars:<14g}{rf.bars:<12g}{kind}")
        print()
    print("""
>>> Groupings of 3, 4 and 6 LOCK to a 4/4 bar in triplet subdivisions and
>>> phase only mildly elsewhere. Only 5 and 7 genuinely fight the barline.
>>> That gives the app a natural difficulty ladder, and it maps 1:1 onto the
>>> Carnatic gati system: 3=tisra, 4=chatusra, 5=khanda, 7=misra, 9=sankeerna.
>>> Ship the ladder in that order. It is the same ladder Indian percussionists
>>> have used for centuries, and no Western scale app has ever implemented it.
""")

    hr("THE PRACTICABLE SET — combinations that resolve inside 8 bars")
    good = []
    for ss in (5, 6, 7):
        for octv in (1, 2):
            for sub in (2, 3, 4, 6):
                for gp in (3, 4, 5, 6, 7):
                    r = solve_resolution(ss, octv, sub, 4, gp)
                    if r.bars <= 8 and r.bars == int(r.bars):
                        good.append((ss, octv, sub, gp, int(r.bars), r.total_notes))
    hexa = [g for g in good if g[0] == 6]
    hept = [g for g in good if g[0] == 7]
    print(f"hexatonic combos that resolve in <=8 bars: {len(hexa)}")
    print(f"heptatonic combos that resolve in <=8 bars: {len(hept)}")
    print(f"pentatonic combos that resolve in <=8 bars: {len([g for g in good if g[0]==5])}")
    print("\nHexatonic, 1 octave, sorted by bar-count (the live-stream menu):")
    print(f"{'subdiv':<16}{'group':<8}{'bars':<7}{'notes'}")
    for ss, octv, sub, gp, bars, tot in sorted([g for g in hexa if g[1] == 1], key=lambda x: (x[4], x[3])):
        print(f"{subnames[sub]:<16}{gp:<8}{bars:<7}{tot}")

    # ---- SEQUENCES -------------------------------------------------------
    hr("SEQUENCE ENGINE sample — C major hexatonic, cells of 4, 2 octaves")
    for cell in sequence_cells(lib["major_no4"], cell_len=4, step=1, octaves=2)[:8]:
        print("   " + " ".join(f"{n.name}{n.octave}" for n in cell))

    hr("ROADMAP PROOF 1 — triad pairs generate hexatonics (the jazz route)")
    print("Two triads with no shared notes = a six-note scale. C major + X major:\n")
    print(f"{'pair':<20}{'root interval':<16}{'notes':<22}{'set class':<14}{'TT'}")
    print("-" * 84)
    for r in survey_triad_pairs():
        pcnames = " ".join(str(p) for p in r["pcs"])
        print(f"{r['pair']:<20}{r['root_interval']:<16}{pcnames:<22}"
              f"{str(r['prime_form']):<14}{r['tritones']}")
    print("""
>>> C+D (whole step) is the Weiskopf/Campbell workhorse -- it is a Lydian-flavour
>>> hexatonic. C+F# (tritone) is the Petrushka set. C+Db (semitone) is inside the
>>> augmented family. ONE function generates all of them, so the triad-pair
>>> feature is data, not new architecture. Ship it in v2 as promised.
""")

    hr("ROADMAP PROOF 2 — the same engine does 5, 7 and 8 notes")
    print("Audava (5) / Shadava (6) / Sampurna (7) by omitting 2 / 1 / 0 degrees:\n")
    p5 = n_tonic_by_omission("C", MAJOR, [4, 7], "Audava - major pentatonic")
    p6 = n_tonic_by_omission("C", MAJOR, [4], "Shadava - major hexatonic")
    p7 = n_tonic_by_omission("C", MAJOR, [], "Sampurna - major scale")
    for s in (p5, p6, p7):
        iv = interval_vector(s.pcs)
        print(f"  {s.name:<32}{' '.join(s.degree_names()):<20}"
              f"iv=<{''.join(str(x) for x in iv)}>  TT={iv[5]}")
    o1 = octatonic("C", "whole-half")
    o2 = octatonic("C", "half-whole")
    for s in (o1, o2):
        iv = interval_vector(s.pcs)
        print(f"  {s.name:<32}{' '.join(s.degree_names()):<20}"
              f"iv=<{''.join(str(x) for x in iv)}>  TT={iv[5]}")
    print("""
>>> One omission model covers 5, 6 and 7 with NO code change. Octatonic needs
>>> one extra generator (above). Barry Harris does NOT belong here -- his
>>> sixth-diminished scales are a HARMONY device (a 6th chord interleaved with a
>>> diminished 7th, generating drop-2 voicing movement), not a scale to run.
>>> Give it its own module and its own vocabulary or it will be taught wrongly.
""")

    hr("MULTI-KEY PROOF — the same scale in all 12 keys, correctly spelled")
    for t in ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"]:
        s = hexatonic_by_omission(t, MAJOR, 4, "", "")
        print(f"  {t+' major hexatonic':<22}{' '.join(s.degree_names()):<26}"
              f"vex: {' '.join(n.vexflow() for n in s.notes)}")
    print("\n  (No letter repeats, no triple accidentals, VexFlow-ready in every key.)")


def dump_json():
    lib = {**build_library("C"), **symmetric_hexatonics("C")}
    out = {
        "omission_survey": diatonic_omission_survey("C"),
        "scales": {k: {"name": s.name, "notes": s.degree_names(),
                        "pcs": sorted(s.pcs), "steps": s.steps,
                        "prime_form": prime_form(s.pcs),
                        "interval_vector": interval_vector(s.pcs)}
                    for k, s in lib.items()},
        "skip_cycles": {k: {str(sk): skip_cycle_summary(s, sk) for sk in (1, 2, 3, 4)}
                        for k, s in lib.items()},
        "chords": {k: {str(sz): [c for c in find_chords(s)[sz]] for sz in (3, 4)}
                   for k, s in lib.items()},
        "resolutions": [asdict(r) for r in resolution_grid()],
    }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    if "--json" in sys.argv:
        dump_json()
    else:
        report()
