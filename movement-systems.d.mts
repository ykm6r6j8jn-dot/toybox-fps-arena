export type PlanarVector = { x: number; z: number };
export type PositionVector = { x: number; y?: number; z: number };

export const toyboxTrampolinePads: readonly Readonly<{
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  force: number;
}>[];

export function wrapAngle(value: number): number;
export function curveStickInput(
  x: number,
  z: number,
  options?: { deadZone?: number; exponent?: number }
): PlanarVector & { intensity: number };
export function approachPlanarVelocity(
  current: PlanarVector,
  target: PlanarVector,
  deltaSeconds: number,
  options?: { acceleration?: number; deceleration?: number }
): PlanarVector;
export function canConsumeBufferedJump(now: number, bufferedUntil: number, groundedUntil: number): boolean;
export function shouldAutoSprint(now: number, startedAt: number, forwardInput: number, intensity: number, delayMs?: number): boolean;
export function groundSurfaceReach(ascending: boolean, normalReach?: number): number;
export function isNearToyboxTrampoline(position: PositionVector, padding?: number): boolean;
export function movementEnvelope(
  elapsedSeconds: number,
  options?: { creative?: boolean; boosted?: boolean; trampoline?: boolean }
): { horizontal: number; upward: number; downward: number };
export function clampMovementRequest(
  previous: PositionVector,
  requested: PositionVector,
  elapsedSeconds: number,
  options?: { creative?: boolean; boosted?: boolean; trampoline?: boolean }
): PositionVector & {
  y: number;
  correctedHorizontal: boolean;
  correctedVertical: boolean;
  envelope: { horizontal: number; upward: number; downward: number };
};
