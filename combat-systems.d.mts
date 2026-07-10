export type HitZone = "head" | "torso" | "limbs";

export type VectorLike = { x: number; y?: number; z: number };

export type HumanoidHit = {
  zone: HitZone;
  distance: number;
  center: { x: number; y: number; z: number };
  radius: number;
};

export function raySphereEntryDistance(
  origin: VectorLike,
  direction: VectorLike,
  center: VectorLike,
  radius: number,
  maxDistance?: number
): number | null;

export function resolveHumanoidHit(
  origin: VectorLike,
  direction: VectorLike,
  pose: VectorLike,
  maxDistance?: number,
  skin?: string
): HumanoidHit | null;

export function hitZoneDamage(baseDamage: number, zone: HitZone | string): number;

export function computeAimSpread(
  baseSpread: number,
  bloom?: number,
  state?: { moving?: boolean; sneaking?: boolean; airborne?: boolean; scoped?: boolean; touch?: boolean }
): number;

export function recoverShotBloom(currentBloom: number, recoveryPerSecond: number, deltaSeconds: number): number;

export function damageDirectionAngle(
  playerYaw: number,
  playerPosition: VectorLike,
  sourcePosition: VectorLike
): number;
