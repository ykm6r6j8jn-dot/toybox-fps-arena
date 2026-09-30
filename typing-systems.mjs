// Browser-independent typing rules. A small state machine accepts every valid
// spelling without enumerating exponentially many full-word combinations.
const kana = {
  あ: ["a"],
  い: ["i", "yi"],
  う: ["u", "wu"],
  え: ["e"],
  お: ["o"],
  か: ["ka", "ca"],
  き: ["ki"],
  く: ["ku", "cu", "qu"],
  け: ["ke"],
  こ: ["ko", "co"],
  さ: ["sa"],
  し: ["shi", "si", "ci"],
  す: ["su"],
  せ: ["se", "ce"],
  そ: ["so"],
  た: ["ta"],
  ち: ["chi", "ti"],
  つ: ["tsu", "tu"],
  て: ["te"],
  と: ["to"],
  な: ["na"],
  に: ["ni"],
  ぬ: ["nu"],
  ね: ["ne"],
  の: ["no"],
  は: ["ha"],
  ひ: ["hi"],
  ふ: ["fu", "hu"],
  へ: ["he"],
  ほ: ["ho"],
  ま: ["ma"],
  み: ["mi"],
  む: ["mu"],
  め: ["me"],
  も: ["mo"],
  や: ["ya"],
  ゆ: ["yu"],
  よ: ["yo"],
  ら: ["ra"],
  り: ["ri"],
  る: ["ru"],
  れ: ["re"],
  ろ: ["ro"],
  わ: ["wa"],
  を: ["wo"],
  が: ["ga"],
  ぎ: ["gi"],
  ぐ: ["gu"],
  げ: ["ge"],
  ご: ["go"],
  ざ: ["za"],
  じ: ["ji", "zi"],
  ず: ["zu"],
  ぜ: ["ze"],
  ぞ: ["zo"],
  だ: ["da"],
  ぢ: ["di"],
  づ: ["du"],
  で: ["de"],
  ど: ["do"],
  ば: ["ba"],
  び: ["bi"],
  ぶ: ["bu"],
  べ: ["be"],
  ぼ: ["bo"],
  ぱ: ["pa"],
  ぴ: ["pi"],
  ぷ: ["pu"],
  ぺ: ["pe"],
  ぽ: ["po"],
  ぁ: ["la", "xa"],
  ぃ: ["li", "xi"],
  ぅ: ["lu", "xu"],
  ぇ: ["le", "xe"],
  ぉ: ["lo", "xo"],
  ゃ: ["lya", "xya"],
  ゅ: ["lyu", "xyu"],
  ょ: ["lyo", "xyo"],
  ー: ["-"],
  "！": ["!"],
  "？": ["?"],
  "、": [","],
  "。": ["."],
  きゃ: ["kya"],
  きゅ: ["kyu"],
  きょ: ["kyo"],
  しゃ: ["sha", "sya"],
  しゅ: ["shu", "syu"],
  しょ: ["sho", "syo"],
  ちゃ: ["cha", "tya", "cya"],
  ちゅ: ["chu", "tyu", "cyu"],
  ちょ: ["cho", "tyo", "cyo"],
  にゃ: ["nya"],
  にゅ: ["nyu"],
  にょ: ["nyo"],
  ひゃ: ["hya"],
  ひゅ: ["hyu"],
  ひょ: ["hyo"],
  みゃ: ["mya"],
  みゅ: ["myu"],
  みょ: ["myo"],
  りゃ: ["rya"],
  りゅ: ["ryu"],
  りょ: ["ryo"],
  ぎゃ: ["gya"],
  ぎゅ: ["gyu"],
  ぎょ: ["gyo"],
  じゃ: ["ja", "jya", "zya"],
  じゅ: ["ju", "jyu", "zyu"],
  じょ: ["jo", "jyo", "zyo"],
  びゃ: ["bya"],
  びゅ: ["byu"],
  びょ: ["byo"],
  ぴゃ: ["pya"],
  ぴゅ: ["pyu"],
  ぴょ: ["pyo"],
  ふぁ: ["fa"],
  ふぃ: ["fi"],
  ふぇ: ["fe"],
  ふぉ: ["fo"],
  てぃ: ["thi"],
  でぃ: ["dhi"],
  うぃ: ["wi"],
  うぇ: ["we"],
  うぉ: ["who"],
};

export function tokenize(reading) {
  const tokens = [];
  for (let i = 0; i < reading.length; i++) {
    const pair = reading.slice(i, i + 2);
    if (pair.length === 2 && kana[pair]) {
      const separate = [...kana[reading[i]]].flatMap((a) =>
        kana[reading[i + 1]].map((b) => a + b),
      );
      tokens.push({
        kana: pair,
        choices: [...new Set([...kana[pair], ...separate])],
      });
      i++;
    } else if (reading[i] === "ん") {
      const next = reading[i + 1];
      const choices =
        !next || /[あいうえおやゆよん]/.test(next)
          ? ["nn", "n'", "xn"]
          : ["n", "nn", "n'", "xn"];
      tokens.push({ kana: "ん", choices });
    } else if (reading[i] === "っ") {
      const next =
        kana[reading.slice(i + 1, i + 3)] || kana[reading[i + 1]] || [];
      const consonants = next
        .map((choice) => choice[0])
        .filter((letter) => !"aiueon".includes(letter));
      tokens.push({
        kana: "っ",
        choices: [...new Set([...consonants, "ltu", "xtu", "ltsu", "xtsu"])],
      });
    } else {
      if (!kana[reading[i]]) throw new Error(`Unsupported kana: ${reading[i]}`);
      tokens.push({ kana: reading[i], choices: kana[reading[i]] });
    }
  }
  return tokens;
}

export class RomajiMatcher {
  constructor(reading) {
    this.tokens = tokenize(reading);
    this.states = [{ token: 0, choice: -1, offset: 0 }];
    this.typed = "";
    this.complete = false;
  }
  get remaining() {
    if (this.complete) return "";
    const state = [...this.states].sort(
      (a, b) => b.token - a.token || b.offset - a.offset,
    )[0];
    const current = this.tokens[state.token];
    return (
      (state.choice < 0
        ? current.choices[0]
        : current.choices[state.choice].slice(state.offset)) +
      this.tokens
        .slice(state.token + 1)
        .map((token) => token.choices[0])
        .join("")
    );
  }
  feed(letter) {
    if (this.complete || letter.length !== 1) return false;
    const next = [];
    for (const state of this.states) {
      const token = this.tokens[state.token];
      const choices =
        state.choice < 0 ? token.choices.map((_, i) => i) : [state.choice];
      for (const choice of choices) {
        const spelling = token.choices[choice];
        if (spelling[state.offset] !== letter.toLowerCase()) continue;
        next.push(
          state.offset + 1 === spelling.length
            ? { token: state.token + 1, choice: -1, offset: 0 }
            : { token: state.token, choice, offset: state.offset + 1 },
        );
      }
    }
    if (!next.length) return false;
    this.typed += letter.toLowerCase();
    this.complete = next.some((state) => state.token === this.tokens.length);
    this.states = [
      ...new Map(next.map((state) => [JSON.stringify(state), state])).values(),
    ];
    return true;
  }
}

export const phrasePools = {
  easy: [
    "おもち",
    "いちご",
    "さくら",
    "あんこ",
    "おやつ",
    "ねこ",
    "ぷりん",
    "こねこ",
    "ほかほか",
    "もちもち",
    "ふわふわ",
    "ぱくぱく",
    "にこにこ",
    "おだんご",
    "きなこ",
    "おちゃ",
    "しあわせ",
    "おいしい",
    "だいふく",
    "あまい",
    "すやすや",
    "ぴょんぴょん",
    "まっちゃ",
    "うさぎ",
    "ぽかぽか",
    "しろもち",
    "ひなた",
    "ほうじちゃ",
    "みたらし",
    "こしあん",
    "こんぺいとう",
    "ぱんだ",
  ],
  normal: [
    "もちもちのしあわせ",
    "いちごだいふく",
    "おやつのじかん",
    "ほかほかのおもち",
    "ふわふわのこねこ",
    "さくらのさんぽ",
    "あんこたっぷり",
    "まっちゃのおとも",
    "きょうもいいひ",
    "ひなたでおひるね",
    "できたてだいふく",
    "あまいごほうび",
    "みたらしだんご",
    "ひみつのおやつ",
    "きなこのかおり",
    "おもちをこねよう",
    "しろもちのぼうけん",
    "とろけるぷりん",
    "ぷにぷにのほっぺ",
    "おちゃでひといき",
    "あしたもあそぼう",
    "ねこのあしあと",
    "おだんごびより",
    "もちっともういっこ",
    "こころもほかほか",
    "ちいさなもちやさん",
    "ゆめみるうさぎ",
    "わくわくのおやつ",
  ],
  hard: [
    "もちもちのしあわせ",
    "きょうもおもちがだいすき",
    "ふわふわのねこがまっている",
    "おいしいおもちをつくろう",
    "きなことあんこのだいぼうけん",
    "ちょっとひといきおちゃのじかん",
    "できたてのおもちをめしあがれ",
    "しあわせはおやつのじかん",
    "いちごだいふくをひとくち",
    "まっちゃのかおりにいやされる",
    "おだんごもっておはなみに",
    "ゆめのなかでももちもち",
    "とびっきりのごほうびをどうぞ",
    "ひなたぼっこでうとうと",
    "ねこのほっぺもぷにぷに",
    "あしたもきっといいひになる",
    "すてきなまいにちをつくろう",
    "もちもちふぃーばーはつどう",
    "おやつをわければしあわせにばい",
    "ちいさなもちからおおきなゆめ",
    "ゆっくりでもまえにすすもう",
    "もういっかいがいちばんたのしい",
  ],
};

export class TypingSession {
  constructor(difficulty = "normal", duration = 60, random = Math.random) {
    this.difficulty = difficulty;
    this.duration = duration;
    this.random = random;
    this.status = "ready";
    this.phrase = "もちもちのしあわせ";
    this.matcher = new RomajiMatcher(this.phrase);
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.completed = 0;
    this.correct = 0;
    this.misses = 0;
    this.feverUntil = 0;
    this.elapsedMs = 0;
    this.remaining = duration;
    this.startedAt = 0;
    this.pauseStartedAt = 0;
    this.pausedMs = 0;
    this.deck = [];
  }
  start(now) {
    if (this.status !== "ready") return;
    this.startedAt = now;
    this.status = "playing";
    this.nextPhrase();
  }
  nextPhrase() {
    if (!this.deck.length) {
      this.deck = [...phrasePools[this.difficulty]];
      for (let i = this.deck.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
      }
      if (this.deck.at(-1) === this.phrase)
        [this.deck[0], this.deck[this.deck.length - 1]] = [
          this.deck[this.deck.length - 1],
          this.deck[0],
        ];
    }
    this.phrase = this.deck.pop();
    this.matcher = new RomajiMatcher(this.phrase);
  }
  update(now) {
    if (this.status === "playing") {
      this.elapsedMs = Math.min(
        this.duration * 1000,
        Math.max(0, now - this.startedAt - this.pausedMs),
      );
      this.remaining = Math.max(0, this.duration - this.elapsedMs / 1000);
      if (this.remaining === 0) this.status = "results";
    }
    return this.status;
  }
  pause(now) {
    this.update(now);
    if (this.status !== "playing") return;
    this.pauseStartedAt = now;
    this.status = "paused";
  }
  resume(now) {
    if (this.status !== "paused") return;
    this.pausedMs += now - this.pauseStartedAt;
    this.status = "playing";
  }
  get feverRemaining() {
    return Math.max(0, this.feverUntil - this.elapsedMs) / 1000;
  }
  get accuracy() {
    return this.correct + this.misses
      ? (this.correct / (this.correct + this.misses)) * 100
      : 0;
  }
  get wpm() {
    return this.elapsedMs ? this.correct / 5 / (this.elapsedMs / 60000) : 0;
  }
  feed(key, now) {
    this.update(now);
    if (this.status !== "playing")
      return { kind: "ignored", points: 0, feverStarted: false };
    if (!this.matcher.feed(key)) {
      this.misses++;
      this.combo = 0;
      return { kind: "miss", points: 0, feverStarted: false };
    }
    this.correct++;
    const factor = { easy: 1, normal: 1.2, hard: 1.5 }[this.difficulty];
    let points = Math.round(10 * factor * (this.feverRemaining > 0 ? 2 : 1));
    let feverStarted = false;
    let kind = "correct";
    if (this.matcher.complete) {
      kind = "word";
      this.completed++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      if (this.combo % 10 === 0) {
        this.feverUntil = this.elapsedMs + 8000;
        feverStarted = true;
      }
      points += Math.round(
        (100 + Math.min(this.combo, 30) * 15) *
          factor *
          (this.feverRemaining > 0 ? 2 : 1),
      );
      this.nextPhrase();
    }
    this.score += points;
    return { kind, points, feverStarted };
  }
}

export const mochiCollection = [
  {
    name: "しろもち",
    description: "すべてのもちの、はじまり。",
    threshold: 0,
    column: 0,
    row: 0,
  },
  {
    name: "いちごもち",
    description: "ちょっぴり甘ずっぱい、人気もの。",
    threshold: 0,
    column: 1,
    row: 0,
  },
  {
    name: "さくらもち",
    description: "春の風を連れてくる。",
    threshold: 20,
    column: 2,
    row: 0,
  },
  {
    name: "まっちゃもち",
    description: "おちゃといっしょに、ひとやすみ。",
    threshold: 50,
    column: 0,
    row: 1,
  },
  {
    name: "ちょこもち",
    description: "がんばった日のごほうび。",
    threshold: 100,
    column: 1,
    row: 1,
  },
  {
    name: "おうさまもち",
    description: "もちもち界の、やさしい王さま。",
    threshold: 200,
    column: 2,
    row: 1,
  },
];
