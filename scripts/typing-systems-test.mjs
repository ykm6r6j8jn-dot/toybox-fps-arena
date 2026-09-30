import assert from "node:assert/strict";
import {
  RomajiMatcher,
  TypingSession,
  phrasePools,
  mochiCollection,
} from "../typing-systems.mjs";

const spellings = [
  ["しあわせ", "shiawase"],
  ["しあわせ", "siawase"],
  ["ちょこ", "choco"],
  ["ちょこ", "tyoko"],
  ["まっちゃ", "maccha"],
  ["まっちゃ", "mattya"],
  ["まっちゃ", "maltucha"],
  ["ぷりん", "purinn"],
  ["こんにちは", "konnnichiha"],
  ["こんにちは", "konnichiha"],
  ["おんがく", "ongaku"],
  ["おんがく", "onngaku"],
  ["しゅう", "shuu"],
  ["しゅう", "syuu"],
  ["ふぃーばー", "fi-ba-"],
  ["ねこ", "neco"],
  ["ちゃ", "tilya"],
  ["きゃ", "kixya"],
];
for (const [reading, spelling] of spellings) {
  const matcher = new RomajiMatcher(reading);
  for (const key of spelling)
    assert.equal(
      matcher.feed(key),
      true,
      `${reading} accepts ${spelling}: ${key}`,
    );
  assert.equal(matcher.complete, true, `${spelling} completes ${reading}`);
}
const typo = new RomajiMatcher("し");
assert.equal(typo.feed("s"), true);
assert.equal(typo.feed("x"), false);
assert.equal(typo.typed, "s", "a miss does not consume the valid prefix");
assert.equal(
  typo.feed("i"),
  true,
  "alternate spelling remains available after a miss",
);
assert.equal(typo.complete, true);
for (const pool of Object.values(phrasePools)) {
  assert.equal(
    pool.length,
    new Set(pool).size,
    "a deck has no duplicate phrases",
  );
  for (const phrase of pool) {
    const matcher = new RomajiMatcher(phrase);
    for (const key of matcher.remaining)
      assert.ok(matcher.feed(key), `canonical spelling for ${phrase}`);
    assert.ok(matcher.complete, `every shipped phrase is playable: ${phrase}`);
  }
}

const game = new TypingSession("easy", 60, () => 0.4);
assert.equal(
  game.accuracy,
  0,
  "an unplayed round does not report perfect accuracy",
);
game.start(1000);
game.update(6000);
assert.equal(game.remaining, 55);
game.pause(6000);
game.update(16000);
assert.equal(game.remaining, 55, "pause freezes remaining time");
assert.equal(
  game.feed("a", 16000).kind,
  "ignored",
  "paused typing cannot score",
);
game.resume(16000);
game.update(17000);
assert.equal(game.remaining, 54, "resume excludes paused time");
let now = 17000;
for (let word = 0; word < 10; word++) {
  const spelling = game.matcher.remaining;
  for (const key of spelling) game.feed(key, now++);
}
assert.equal(game.completed, 10);
assert.equal(game.combo, 10);
assert.ok(game.feverRemaining > 7, "ten complete words unlock fever");
assert.equal(game.accuracy, 100);
const scoreBefore = game.score;
const key = game.matcher.remaining[0];
assert.equal(
  game.feed(key, now++).points,
  20,
  "fever doubles correct-key points",
);
assert.ok(game.score > scoreBefore);
assert.equal(game.feed("!", now++).kind, "miss");
assert.equal(game.combo, 0);
assert.equal(game.maxCombo, 10);
assert.ok(game.accuracy < 100);
game.update(100000);
assert.equal(game.status, "results");
assert.equal(game.remaining, 0);
const finalScore = game.score;
assert.equal(game.feed("a", 100001).kind, "ignored");
assert.equal(game.score, finalScore, "no score changes after time expires");
assert.equal(mochiCollection.at(-1).threshold, 200);
console.log(
  `Typing passed: ${spellings.length} alternate spellings, all ${Object.values(phrasePools).flat().length} phrases, typo recovery, pause/resume, 10-word fever, scoring, and timeout.`,
);
