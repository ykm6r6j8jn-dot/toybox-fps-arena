import type { Difficulty } from "../../typing-systems.mjs";

export type Progress = {
  version: 1;
  totalMochi: number;
  plays: number;
  best: Record<Difficulty, number>;
  daily: { date: string; words: number; maxCombo: number };
  sound: boolean;
  difficulty: Difficulty;
};
const key = "mochi-type-progress-v1";
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
export function loadProgress(): Progress {
  const defaults: Progress = {
    version: 1,
    totalMochi: 0,
    plays: 0,
    best: { easy: 0, normal: 0, hard: 0 },
    daily: { date: today(), words: 0, maxCombo: 0 },
    sound: true,
    difficulty: "hard",
  };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (!saved || saved.version !== 1) return defaults;
    return {
      ...defaults,
      totalMochi: number(saved.totalMochi),
      plays: number(saved.plays),
      best: {
        easy: number(saved.best?.easy),
        normal: number(saved.best?.normal),
        hard: number(saved.best?.hard),
      },
      daily:
        saved.daily?.date === today()
          ? {
              date: today(),
              words: number(saved.daily.words),
              maxCombo: number(saved.daily.maxCombo),
            }
          : defaults.daily,
      sound: typeof saved.sound === "boolean" ? saved.sound : true,
      difficulty: ["easy", "normal", "hard"].includes(saved.difficulty)
        ? saved.difficulty
        : defaults.difficulty,
    };
  } catch {
    return defaults;
  }
}
export function saveProgress(progress: Progress) {
  try {
    localStorage.setItem(key, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
export function refreshDay(progress: Progress) {
  if (progress.daily.date !== today())
    progress.daily = { date: today(), words: 0, maxCombo: 0 };
}
