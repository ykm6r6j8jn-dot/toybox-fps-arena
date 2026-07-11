export type MatchPhase = "waiting" | "countdown" | "active" | "result";

export type MatchLifecycle = {
  matchPhase: MatchPhase;
  phaseEndsAt: number;
  matchStarted: boolean;
};

export type MatchLifecycleContext = {
  mode?: string;
  cpuFill?: boolean;
  humanCount?: number;
  readyHumans?: number;
  winner?: { at?: number } | null;
};

export const matchPhases: readonly MatchPhase[];
export const matchCountdownMs: number;
export const matchResultHoldMs: number;
export function minimumHumansForMatch(mode?: string, cpuFill?: boolean): number;
export function matchWarmupMs(mode?: string, cpuFill?: boolean): number;
export function createMatchLifecycle(): MatchLifecycle;
export function stepMatchLifecycle(
  state: Partial<MatchLifecycle>,
  context: MatchLifecycleContext,
  now?: number
): MatchLifecycle & { minimumHumans: number; transition: "none" | "waiting" | "countdown" | "start" | "result" };
