const CPU_ROLE_LIST = Object.freeze(["assault", "support", "flanker", "marksman"]);

const CPU_ROLE_PROFILES = Object.freeze({
  assault: Object.freeze({ minRange: 15, idealRange: 28, maxRange: 42, reactionMs: 410, decisionMs: 650, memoryMs: 2100 }),
  support: Object.freeze({ minRange: 22, idealRange: 37, maxRange: 52, reactionMs: 490, decisionMs: 760, memoryMs: 2500 }),
  flanker: Object.freeze({ minRange: 8, idealRange: 20, maxRange: 34, reactionMs: 470, decisionMs: 820, memoryMs: 2900 }),
  marksman: Object.freeze({ minRange: 34, idealRange: 54, maxRange: 70, reactionMs: 610, decisionMs: 930, memoryMs: 2400 })
});

const TACTICS = new Set(["patrol", "objective", "zone", "push", "hold", "strafe", "flank", "retreat"]);

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roleName(role) {
  return CPU_ROLE_PROFILES[role] ? role : "assault";
}

function horizontalDirection(from, to) {
  const dx = finite(to?.x) - finite(from?.x);
  const dz = finite(to?.z) - finite(from?.z);
  const distance = Math.hypot(dx, dz);
  if (distance < 0.001) return { x: 0, z: 1, distance: 0 };
  return { x: dx / distance, z: dz / distance, distance };
}

export const cpuRoles = CPU_ROLE_LIST;

export function cpuRoleForIndex(index = 0) {
  const normalized = Math.abs(Math.floor(finite(index))) % CPU_ROLE_LIST.length;
  return CPU_ROLE_LIST[normalized];
}

export function cpuRoleProfile(role = "assault") {
  return CPU_ROLE_PROFILES[roleName(role)];
}

export function cpuDecisionInterval(role = "assault", index = 0) {
  const profile = cpuRoleProfile(role);
  return profile.decisionMs + Math.abs(Math.floor(finite(index))) % 4 * 55;
}

export function cpuReactionDelay(role = "assault", distance = 0, index = 0) {
  const profile = cpuRoleProfile(role);
  const rangeDelay = clamp(finite(distance), 0, 80) * 2.6;
  const personalityDelay = Math.abs(Math.floor(finite(index))) % 5 * 32;
  return Math.round(profile.reactionMs + rangeDelay + personalityDelay);
}

export function cpuTargetMemoryMs(role = "assault") {
  return cpuRoleProfile(role).memoryMs;
}

export function scoreCpuTarget({ distance = Infinity, visible = false, healthRatio = 1, sticky = false, objectiveThreat = false } = {}) {
  const normalizedDistance = Math.max(0, finite(distance, 9999));
  const normalizedHealth = clamp(finite(healthRatio, 1), 0, 1);
  return normalizedDistance
    + (visible ? 0 : 26)
    + normalizedHealth * 7
    - (sticky ? 14 : 0)
    - (objectiveThreat ? 9 : 0);
}

export function chooseCpuTactic({
  role = "assault",
  healthRatio = 1,
  distance = Infinity,
  visible = false,
  targetAvailable = false,
  targetRemembered = false,
  outnumbered = false,
  outsideSafeZone = false,
  objectiveActive = false
} = {}) {
  const profile = cpuRoleProfile(role);
  const health = clamp(finite(healthRatio, 1), 0, 1);
  const range = Math.max(0, finite(distance, Infinity));
  if (outsideSafeZone) return "zone";
  if (!targetAvailable) return objectiveActive ? "objective" : "patrol";
  if (health <= 0.26 || (outnumbered && health < 0.58)) return "retreat";
  if (roleName(role) === "marksman" && range < profile.minRange) return "retreat";
  if (!visible) return targetRemembered ? "flank" : objectiveActive ? "objective" : "patrol";
  if (range < profile.minRange) return "retreat";
  if (roleName(role) === "flanker" && range > profile.minRange * 0.85) return "flank";
  if (range > profile.maxRange) return "push";
  if (roleName(role) === "marksman" || roleName(role) === "support") return "hold";
  return "strafe";
}

export function computeCpuDestination({
  bot,
  target,
  objective,
  tactic = "patrol",
  role = "assault",
  side = 1,
  phase = 0,
  arenaHalfSize = 96
} = {}) {
  const origin = { x: finite(bot?.x), z: finite(bot?.z) };
  const profile = cpuRoleProfile(role);
  const normalizedTactic = TACTICS.has(tactic) ? tactic : "patrol";
  const sideDirection = finite(side, 1) < 0 ? -1 : 1;
  const limit = Math.max(4, finite(arenaHalfSize, 96) - 2);
  let x = origin.x;
  let z = origin.z;

  if (normalizedTactic === "zone" || normalizedTactic === "objective") {
    const destination = objective || target || { x: 0, z: 0 };
    const orbit = normalizedTactic === "zone" ? 2.8 : 6.5;
    x = finite(destination.x) + Math.cos(finite(phase)) * orbit;
    z = finite(destination.z) + Math.sin(finite(phase)) * orbit;
  } else if (target) {
    const direction = horizontalDirection(origin, target);
    const perpendicular = { x: -direction.z * sideDirection, z: direction.x * sideDirection };
    if (normalizedTactic === "retreat") {
      const retreatDistance = direction.distance < profile.minRange ? 15 : 11;
      x = origin.x - direction.x * retreatDistance + perpendicular.x * 3.2;
      z = origin.z - direction.z * retreatDistance + perpendicular.z * 3.2;
    } else if (normalizedTactic === "flank") {
      const flankDepth = profile.idealRange * 0.72;
      x = finite(target.x) - direction.x * profile.idealRange * 0.68 + perpendicular.x * flankDepth;
      z = finite(target.z) - direction.z * profile.idealRange * 0.68 + perpendicular.z * flankDepth;
    } else if (normalizedTactic === "push") {
      x = finite(target.x) - direction.x * profile.idealRange * 0.78 + perpendicular.x * 1.8;
      z = finite(target.z) - direction.z * profile.idealRange * 0.78 + perpendicular.z * 1.8;
    } else if (normalizedTactic === "hold") {
      x = finite(target.x) - direction.x * profile.idealRange + perpendicular.x * 4.2;
      z = finite(target.z) - direction.z * profile.idealRange + perpendicular.z * 4.2;
    } else {
      const strafeWidth = 5.5 + Math.sin(finite(phase) * 1.7) * 1.5;
      x = finite(target.x) - direction.x * profile.idealRange * 0.9 + perpendicular.x * strafeWidth;
      z = finite(target.z) - direction.z * profile.idealRange * 0.9 + perpendicular.z * strafeWidth;
    }
  } else {
    const patrolRadius = 18 + (Math.abs(Math.floor(finite(bot?.botIndex))) % 6) * 8;
    x = Math.cos(finite(phase)) * patrolRadius;
    z = Math.sin(finite(phase) * 0.91) * patrolRadius;
  }

  return { x: clamp(x, -limit, limit), z: clamp(z, -limit, limit) };
}

export function scoreCpuCoverPoint({ bot, target, point, role = "assault", safeZone = null } = {}) {
  if (!bot || !target || !point) return Infinity;
  const botDistance = Math.hypot(finite(point.x) - finite(bot.x), finite(point.z) - finite(bot.z));
  if (botDistance < 1.2 || botDistance > 34) return Infinity;
  const candidateFromBlockerX = finite(point.x) - finite(point.blockerX);
  const candidateFromBlockerZ = finite(point.z) - finite(point.blockerZ);
  const threatFromBlockerX = finite(target.x) - finite(point.blockerX);
  const threatFromBlockerZ = finite(target.z) - finite(point.blockerZ);
  if (candidateFromBlockerX * threatFromBlockerX + candidateFromBlockerZ * threatFromBlockerZ >= -0.2) return Infinity;
  if (safeZone?.enabled && finite(safeZone.damage) > 0) {
    const safeDistance = Math.hypot(finite(point.x) - finite(safeZone.x), finite(point.z) - finite(safeZone.z));
    if (safeDistance > Math.max(0, finite(safeZone.radius) - 2.2)) return Infinity;
  }
  const targetDistance = Math.hypot(finite(point.x) - finite(target.x), finite(point.z) - finite(target.z));
  const profile = cpuRoleProfile(role);
  return botDistance + Math.abs(targetDistance - profile.idealRange) * 0.09;
}

export function selectCpuWeapon({ role = "assault", distance = 0, popularWeapon = "", airborneRatio = 0, index = 0 } = {}) {
  const normalizedRole = roleName(role);
  const range = Math.max(0, finite(distance));
  const popular = String(popularWeapon || "");
  const even = Math.abs(Math.floor(finite(index))) % 2 === 0;
  if (range > 72) return finite(airborneRatio) > 0.14 ? "awm" : "marksman";
  if (normalizedRole === "marksman") {
    if (range > 44) return even ? "awm" : "marksman";
    if (range > 25) return popular === "aug" ? "aug" : "marksman";
    return even ? "smg" : "aug";
  }
  if (normalizedRole === "flanker") {
    if (range < 15) return popular === "shotgun" ? "shotgun" : even ? "shotgun" : "smg";
    if (range < 38) return popular === "ak47" || popular === "smg" ? popular : "smg";
    return even ? "ak47" : "aug";
  }
  if (normalizedRole === "support") {
    if (range > 54) return even ? "aug" : "marksman";
    if (range > 20) return popular === "aug" || popular === "type95" ? popular : even ? "type95" : "aug";
    return "smg";
  }
  if (range > 56) return even ? "aug" : "marksman";
  if (range < 15) return popular === "shotgun" ? "shotgun" : even ? "shotgun" : "smg";
  if (["ak47", "aug", "type95", "smg"].includes(popular)) return popular;
  return even ? "ak47" : "type95";
}

export function cpuFireDelayMultiplier(role = "assault", index = 0) {
  const base = {
    assault: 0.96,
    support: 1.05,
    flanker: 1.02,
    marksman: 1.08
  }[roleName(role)];
  return base + Math.abs(Math.floor(finite(index))) % 3 * 0.035;
}

export function cpuCanFire({ now = 0, targetSeenAt = 0, visible = false, distance = Infinity, range = 0, reactionDelay = 0 } = {}) {
  if (!visible || finite(distance, Infinity) > Math.max(0, finite(range))) return false;
  const acquiredAt = finite(targetSeenAt);
  if (acquiredAt <= 0) return false;
  return finite(now) - acquiredAt >= Math.max(0, finite(reactionDelay));
}
