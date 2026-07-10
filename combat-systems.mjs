const HIT_ZONE_MULTIPLIERS = Object.freeze({
  head: 1.38,
  torso: 1,
  limbs: 0.82
});

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizedDirection(direction) {
  const x = finite(direction?.x);
  const y = finite(direction?.y);
  const z = finite(direction?.z);
  const length = Math.hypot(x, y, z);
  if (length < 0.0001) return null;
  return { x: x / length, y: y / length, z: z / length };
}

function normalizeAngle(angle) {
  const fullTurn = Math.PI * 2;
  return ((finite(angle) + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI;
}

export function raySphereEntryDistance(origin, direction, center, radius, maxDistance = Infinity) {
  const ray = normalizedDirection(direction);
  if (!ray) return null;
  const safeRadius = Math.max(0.01, finite(radius, 0.01));
  const ox = finite(origin?.x) - finite(center?.x);
  const oy = finite(origin?.y) - finite(center?.y);
  const oz = finite(origin?.z) - finite(center?.z);
  const projection = ox * ray.x + oy * ray.y + oz * ray.z;
  const discriminant = projection * projection - (ox * ox + oy * oy + oz * oz - safeRadius * safeRadius);
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  let distance = -projection - root;
  if (distance < 0) distance = -projection + root;
  const limit = Math.max(0, finite(maxDistance, Infinity));
  return distance >= 0 && distance <= limit ? distance : null;
}

function hitboxRadii(skin) {
  if (skin === "heavy") return { head: 0.35, torso: 0.64, limbs: 0.5 };
  if (skin === "scout") return { head: 0.3, torso: 0.53, limbs: 0.43 };
  return { head: 0.32, torso: 0.58, limbs: 0.47 };
}

export function resolveHumanoidHit(origin, direction, pose, maxDistance = 70, skin = "rounded") {
  const x = finite(pose?.x);
  const y = finite(pose?.y, 1.6);
  const z = finite(pose?.z);
  const radii = hitboxRadii(skin);
  const zones = [
    { zone: "head", center: { x, y: y - 0.02, z }, radius: radii.head },
    { zone: "torso", center: { x, y: y - 0.72, z }, radius: radii.torso },
    { zone: "limbs", center: { x, y: y - 1.28, z }, radius: radii.limbs }
  ];
  let best = null;
  for (const candidate of zones) {
    const distance = raySphereEntryDistance(origin, direction, candidate.center, candidate.radius, maxDistance);
    if (distance === null || (best && distance >= best.distance)) continue;
    best = { zone: candidate.zone, distance, center: candidate.center, radius: candidate.radius };
  }
  return best;
}

export function hitZoneDamage(baseDamage, zone) {
  const multiplier = HIT_ZONE_MULTIPLIERS[zone] || 1;
  return Math.max(1, Math.round(Math.max(0, finite(baseDamage)) * multiplier));
}

export function computeAimSpread(baseSpread, bloom = 0, state = {}) {
  const base = Math.max(0, finite(baseSpread));
  const accumulated = Math.max(0, finite(bloom));
  const movementPenalty = state.moving ? base * (state.sneaking ? 0.2 : 0.62) : 0;
  const airbornePenalty = state.airborne ? base * 1.35 : 0;
  const scopeScale = state.scoped ? 0.42 : 1;
  const touchScale = state.touch ? 0.88 : 1;
  return (base + accumulated + movementPenalty + airbornePenalty) * scopeScale * touchScale;
}

export function recoverShotBloom(currentBloom, recoveryPerSecond, deltaSeconds) {
  return Math.max(0, finite(currentBloom) - Math.max(0, finite(recoveryPerSecond)) * Math.max(0, finite(deltaSeconds)));
}

export function damageDirectionAngle(playerYaw, playerPosition, sourcePosition) {
  const dx = finite(sourcePosition?.x) - finite(playerPosition?.x);
  const dz = finite(sourcePosition?.z) - finite(playerPosition?.z);
  if (Math.hypot(dx, dz) < 0.001) return 0;
  const sourceYaw = Math.atan2(-dx, -dz);
  return normalizeAngle(finite(playerYaw) - sourceYaw);
}
