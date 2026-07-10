const TAU = Math.PI * 2;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export const toyboxTrampolinePads = Object.freeze([
  Object.freeze({ id: "trampoline-center", name: "trampoline center", x: 0, z: 8, radius: 2.4, force: 14.8 }),
  Object.freeze({ id: "trampoline-west", name: "trampoline west", x: -18, z: -14, radius: 2.2, force: 13.6 }),
  Object.freeze({ id: "trampoline-east", name: "trampoline east", x: 20, z: 12, radius: 2.2, force: 13.6 }),
  Object.freeze({ id: "trampoline-roof", name: "trampoline roof", x: -12.8, z: 20.2, radius: 1.8, force: 12.8 })
]);

export function wrapAngle(value) {
  const angle = finite(value);
  return ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

export function curveStickInput(x, z, options = {}) {
  const rawX = finite(x);
  const rawZ = finite(z);
  const rawMagnitude = Math.hypot(rawX, rawZ);
  const magnitude = Math.min(1, rawMagnitude);
  const deadZone = clamp(finite(options.deadZone, 0.12), 0, 0.45);
  const exponent = clamp(finite(options.exponent, 1.28), 0.6, 2.4);
  if (magnitude <= deadZone || rawMagnitude <= 0) return { x: 0, z: 0, intensity: 0 };

  const normalizedMagnitude = clamp((magnitude - deadZone) / Math.max(0.001, 1 - deadZone), 0, 1);
  const intensity = normalizedMagnitude ** exponent;
  return {
    x: rawX / rawMagnitude * intensity,
    z: rawZ / rawMagnitude * intensity,
    intensity
  };
}

export function approachPlanarVelocity(current, target, deltaSeconds, options = {}) {
  const currentX = finite(current?.x);
  const currentZ = finite(current?.z);
  const targetX = finite(target?.x);
  const targetZ = finite(target?.z);
  const delta = clamp(finite(deltaSeconds), 0, 0.1);
  const targetMoving = Math.hypot(targetX, targetZ) > 0.001;
  const rate = targetMoving
    ? Math.max(0, finite(options.acceleration, 28))
    : Math.max(0, finite(options.deceleration, 36));
  const differenceX = targetX - currentX;
  const differenceZ = targetZ - currentZ;
  const difference = Math.hypot(differenceX, differenceZ);
  const maxChange = rate * delta;
  if (difference <= maxChange || difference <= 0.000001) return { x: targetX, z: targetZ };
  const scale = maxChange / difference;
  return { x: currentX + differenceX * scale, z: currentZ + differenceZ * scale };
}

export function canConsumeBufferedJump(now, bufferedUntil, groundedUntil) {
  const current = finite(now);
  return current <= finite(bufferedUntil, -1) && current <= finite(groundedUntil, -1);
}

export function shouldAutoSprint(now, startedAt, forwardInput, intensity, delayMs = 260) {
  const started = finite(startedAt);
  return started > 0
    && finite(now) - started >= Math.max(120, finite(delayMs, 260))
    && finite(forwardInput) < -0.68
    && finite(intensity) > 0.72;
}

export function groundSurfaceReach(ascending, normalReach = 0.75) {
  return ascending ? 0.05 : clamp(finite(normalReach, 0.75), 0.05, 1.2);
}

export function isNearToyboxTrampoline(position, padding = 0) {
  const x = finite(position?.x);
  const z = finite(position?.z);
  const extra = Math.max(0, finite(padding));
  return toyboxTrampolinePads.some((pad) => Math.hypot(x - pad.x, z - pad.z) <= pad.radius + extra);
}

export function movementEnvelope(elapsedSeconds, options = {}) {
  if (options.creative) {
    return { horizontal: Infinity, upward: Infinity, downward: Infinity };
  }
  const elapsed = clamp(finite(elapsedSeconds, 0.075), 0.04, 0.45);
  const boosted = Boolean(options.boosted);
  const trampoline = Boolean(options.trampoline);
  return {
    horizontal: Math.min(6.2, 0.62 + elapsed * (boosted ? 20 : 16.5)),
    upward: trampoline ? Math.min(27, 1 + elapsed * 165) : Math.min(6.2, 0.78 + elapsed * 13),
    downward: trampoline ? Math.min(30, 1.2 + elapsed * 52) : Math.min(24, 1.1 + elapsed * 38)
  };
}

export function clampMovementRequest(previous, requested, elapsedSeconds, options = {}) {
  const from = {
    x: finite(previous?.x),
    y: finite(previous?.y, 1.6),
    z: finite(previous?.z)
  };
  const desired = {
    x: finite(requested?.x, from.x),
    y: finite(requested?.y, from.y),
    z: finite(requested?.z, from.z)
  };
  const envelope = movementEnvelope(elapsedSeconds, options);
  const dx = desired.x - from.x;
  const dz = desired.z - from.z;
  const horizontalDistance = Math.hypot(dx, dz);
  const horizontalScale = horizontalDistance > envelope.horizontal && horizontalDistance > 0
    ? envelope.horizontal / horizontalDistance
    : 1;
  const verticalDelta = desired.y - from.y;
  const clampedVerticalDelta = clamp(verticalDelta, -envelope.downward, envelope.upward);
  return {
    x: from.x + dx * horizontalScale,
    y: from.y + clampedVerticalDelta,
    z: from.z + dz * horizontalScale,
    correctedHorizontal: horizontalScale < 1,
    correctedVertical: Math.abs(clampedVerticalDelta - verticalDelta) > 0.0001,
    envelope
  };
}
