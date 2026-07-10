export type CpuRole = "assault" | "support" | "flanker" | "marksman";
export type CpuTactic = "patrol" | "objective" | "zone" | "push" | "hold" | "strafe" | "flank" | "retreat";

export type CpuRoleProfile = {
  minRange: number;
  idealRange: number;
  maxRange: number;
  reactionMs: number;
  decisionMs: number;
  memoryMs: number;
};

export const cpuRoles: readonly CpuRole[];
export function cpuRoleForIndex(index?: number): CpuRole;
export function cpuRoleProfile(role?: CpuRole): CpuRoleProfile;
export function cpuDecisionInterval(role?: CpuRole, index?: number): number;
export function cpuReactionDelay(role?: CpuRole, distance?: number, index?: number): number;
export function cpuTargetMemoryMs(role?: CpuRole): number;
export function scoreCpuTarget(options?: {
  distance?: number;
  visible?: boolean;
  healthRatio?: number;
  sticky?: boolean;
  objectiveThreat?: boolean;
}): number;
export function chooseCpuTactic(options?: {
  role?: CpuRole;
  healthRatio?: number;
  distance?: number;
  visible?: boolean;
  targetAvailable?: boolean;
  targetRemembered?: boolean;
  outnumbered?: boolean;
  outsideSafeZone?: boolean;
  objectiveActive?: boolean;
}): CpuTactic;
export function computeCpuDestination(options?: {
  bot?: { x?: number; z?: number; botIndex?: number };
  target?: { x?: number; z?: number } | null;
  objective?: { x?: number; z?: number } | null;
  tactic?: CpuTactic;
  role?: CpuRole;
  side?: number;
  phase?: number;
  arenaHalfSize?: number;
}): { x: number; z: number };
export function scoreCpuCoverPoint(options?: {
  bot?: { x?: number; z?: number };
  target?: { x?: number; z?: number };
  point?: { x?: number; z?: number; blockerX?: number; blockerZ?: number };
  role?: CpuRole;
  safeZone?: { enabled?: boolean; damage?: number; x?: number; z?: number; radius?: number } | null;
}): number;
export function selectCpuWeapon(options?: {
  role?: CpuRole;
  distance?: number;
  popularWeapon?: string;
  airborneRatio?: number;
  index?: number;
}): string;
export function cpuFireDelayMultiplier(role?: CpuRole, index?: number): number;
export function cpuCanFire(options?: {
  now?: number;
  targetSeenAt?: number;
  visible?: boolean;
  distance?: number;
  range?: number;
  reactionDelay?: number;
}): boolean;
