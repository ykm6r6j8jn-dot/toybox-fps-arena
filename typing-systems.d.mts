export type Difficulty = "easy" | "normal" | "hard";
export type SessionStatus = "ready" | "playing" | "paused" | "results";
export class RomajiMatcher {
  constructor(reading: string);
  typed: string;
  complete: boolean;
  readonly remaining: string;
  feed(letter: string): boolean;
}
export function tokenize(
  reading: string,
): { kana: string; choices: string[] }[];
export const phrasePools: Record<Difficulty, string[]>;
export class TypingSession {
  constructor(
    difficulty?: Difficulty,
    duration?: number,
    random?: () => number,
  );
  difficulty: Difficulty;
  duration: number;
  status: SessionStatus;
  phrase: string;
  matcher: RomajiMatcher;
  score: number;
  combo: number;
  maxCombo: number;
  completed: number;
  correct: number;
  misses: number;
  remaining: number;
  elapsedMs: number;
  readonly feverRemaining: number;
  readonly accuracy: number;
  readonly wpm: number;
  start(now: number): void;
  update(now: number): SessionStatus;
  pause(now: number): void;
  resume(now: number): void;
  feed(
    key: string,
    now: number,
  ): {
    kind: "ignored" | "miss" | "correct" | "word";
    points: number;
    feverStarted: boolean;
  };
}
export const mochiCollection: {
  name: string;
  description: string;
  threshold: number;
  column: number;
  row: number;
}[];
