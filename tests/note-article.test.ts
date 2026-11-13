import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { note, noteArticle, notePretty } from "../src/lib/theory/note.ts";

test("drone article matches how the note is said", () => {
  assert.equal(noteArticle("F"), "an");
  assert.equal(noteArticle("F♯"), "an");
  assert.equal(noteArticle("A"), "an");
  assert.equal(noteArticle("E♭"), "an");
  assert.equal(noteArticle(notePretty(note("F", 1))), "an");
  assert.equal(noteArticle("G"), "a");
  assert.equal(noteArticle("B♭"), "a");
  assert.equal(noteArticle("D♭"), "a");
  assert.equal(noteArticle("C"), "a");
});

test("the practice page uses the article, so F is not 'a F'", () => {
  const src = readFileSync(new URL("../src/app/practice/PracticeClient.tsx", import.meta.url), "utf8");
  assert.match(src, /noteArticle\(notePretty\(/);
  assert.doesNotMatch(src, /Over a \$\{notePretty/);
});
