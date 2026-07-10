export const vehicleRepairStations = Object.freeze([
  Object.freeze({ id: "repair-east", x: 52, z: -14, radius: 4.6 }),
  Object.freeze({ id: "repair-south", x: 0, z: 70, radius: 4.6 }),
  Object.freeze({ id: "repair-west", x: -52, z: 42, radius: 4.6 })
]);

const safeZoneModes = new Set(["oneLife", "life3"]);
const safeZoneSegments = Object.freeze([
  Object.freeze({ duration: 65_000, stage: "waiting", from: [0, 0, 92], to: [0, 0, 92], damage: 0, nextRadius: 64 }),
  Object.freeze({ duration: 85_000, stage: "shrinking", from: [0, 0, 92], to: [-10, 8, 64], damage: 6, nextRadius: 64 }),
  Object.freeze({ duration: 40_000, stage: "holding", from: [-10, 8, 64], to: [-10, 8, 64], damage: 6, nextRadius: 38 }),
  Object.freeze({ duration: 80_000, stage: "shrinking", from: [-10, 8, 64], to: [14, -12, 38], damage: 10, nextRadius: 38 }),
  Object.freeze({ duration: 35_000, stage: "holding", from: [14, -12, 38], to: [14, -12, 38], damage: 10, nextRadius: 18 }),
  Object.freeze({ duration: 70_000, stage: "shrinking", from: [14, -12, 38], to: [6, -2, 18], damage: 14, nextRadius: 18 })
]);

function mix(from, to, ratio) {
  return from + (to - from) * ratio;
}

export function computeSafeZone({ roundStartedAt = 0, now = Date.now(), mode = "oneLife", matchStarted = false, winner = null } = {}) {
  const enabled = safeZoneModes.has(mode) && matchStarted && !winner && Number(roundStartedAt) > 0;
  if (!enabled) {
    return { enabled: false, phase: -1, stage: "inactive", x: 0, z: 0, radius: 92, nextRadius: 92, damage: 0, endsAt: 0 };
  }

  const startedAt = Number(roundStartedAt);
  const elapsed = Math.max(0, Number(now) - startedAt);
  let segmentStart = 0;
  for (let phase = 0; phase < safeZoneSegments.length; phase += 1) {
    const segment = safeZoneSegments[phase];
    const segmentEnd = segmentStart + segment.duration;
    if (elapsed < segmentEnd) {
      const ratio = segment.duration > 0 ? Math.min(1, Math.max(0, (elapsed - segmentStart) / segment.duration)) : 1;
      return {
        enabled: true,
        phase,
        stage: segment.stage,
        x: mix(segment.from[0], segment.to[0], ratio),
        z: mix(segment.from[1], segment.to[1], ratio),
        radius: mix(segment.from[2], segment.to[2], ratio),
        nextRadius: segment.nextRadius,
        damage: segment.damage,
        endsAt: startedAt + segmentEnd
      };
    }
    segmentStart = segmentEnd;
  }

  return { enabled: true, phase: safeZoneSegments.length, stage: "final", x: 6, z: -2, radius: 18, nextRadius: 18, damage: 18, endsAt: 0 };
}

export function isOutsideSafeZone(entity, zone, padding = 0) {
  if (!zone?.enabled || zone.damage <= 0) return false;
  const radius = Math.max(0, Number(zone.radius) - Math.max(0, Number(padding) || 0));
  return Math.hypot(Number(entity?.x) - zone.x, Number(entity?.z) - zone.z) > radius;
}
