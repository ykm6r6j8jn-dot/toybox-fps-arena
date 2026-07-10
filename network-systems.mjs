const DEFAULT_MAX_SAMPLES = 12;
const DEFAULT_TELEPORT_DISTANCE = 22;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function shortestAngleDelta(from, to) {
  let delta = finite(to) - finite(from);
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function normalizedSample(sample) {
  return {
    at: finite(sample?.at),
    x: finite(sample?.x),
    y: finite(sample?.y),
    z: finite(sample?.z),
    yaw: finite(sample?.yaw),
    speed: Number.isFinite(Number(sample?.speed)) ? Number(sample.speed) : undefined
  };
}

export function appendMotionSample(samples, sample, options = {}) {
  if (!Array.isArray(samples)) throw new TypeError("samples must be an array");
  const next = normalizedSample(sample);
  if (next.at <= 0) return { accepted: false, teleported: false };

  const last = samples.at(-1);
  if (last && next.at < last.at) return { accepted: false, teleported: false };
  if (last && next.at === last.at) {
    samples[samples.length - 1] = next;
    return { accepted: true, teleported: false };
  }

  const teleportDistance = Math.max(1, finite(options.teleportDistance, DEFAULT_TELEPORT_DISTANCE));
  const teleported = Boolean(last && Math.hypot(next.x - last.x, next.y - last.y, next.z - last.z) > teleportDistance);
  if (teleported) samples.length = 0;
  samples.push(next);

  const maxSamples = Math.max(2, Math.floor(finite(options.maxSamples, DEFAULT_MAX_SAMPLES)));
  if (samples.length > maxSamples) samples.splice(0, samples.length - maxSamples);
  const maxAgeMs = Math.max(250, finite(options.maxAgeMs, 1600));
  while (samples.length > 2 && next.at - samples[0].at > maxAgeMs) samples.shift();
  return { accepted: true, teleported };
}

function interpolatePose(left, right, amount, mode) {
  const t = clamp(amount, 0, 1);
  return {
    at: left.at + (right.at - left.at) * t,
    x: left.x + (right.x - left.x) * t,
    y: left.y + (right.y - left.y) * t,
    z: left.z + (right.z - left.z) * t,
    yaw: left.yaw + shortestAngleDelta(left.yaw, right.yaw) * t,
    speed: right.speed ?? left.speed,
    mode
  };
}

export function sampleMotion(samples, targetAt, options = {}) {
  if (!Array.isArray(samples) || samples.length === 0) return null;
  const at = finite(targetAt, samples.at(-1).at);
  const first = samples[0];
  const last = samples.at(-1);
  if (samples.length === 1 || at <= first.at) return { ...first, mode: "hold" };

  for (let index = 1; index < samples.length; index += 1) {
    const right = samples[index];
    if (at > right.at) continue;
    const left = samples[index - 1];
    const span = Math.max(1, right.at - left.at);
    return interpolatePose(left, right, (at - left.at) / span, "interpolate");
  }

  const maxExtrapolationMs = options.allowExtrapolation === false
    ? 0
    : Math.max(0, finite(options.maxExtrapolationMs, 100));
  const aheadMs = at - last.at;
  if (aheadMs <= 0 || aheadMs > maxExtrapolationMs || samples.length < 2) return { ...last, mode: "hold" };

  const previous = samples[samples.length - 2];
  const sampleDeltaSeconds = Math.max(0.001, (last.at - previous.at) / 1000);
  const aheadSeconds = aheadMs / 1000;
  let velocityX = (last.x - previous.x) / sampleDeltaSeconds;
  let velocityZ = (last.z - previous.z) / sampleDeltaSeconds;
  const horizontalSpeed = Math.hypot(velocityX, velocityZ);
  const maxSpeed = Math.max(0, finite(options.maxSpeed, 18));
  if (horizontalSpeed > maxSpeed && horizontalSpeed > 0) {
    const scale = maxSpeed / horizontalSpeed;
    velocityX *= scale;
    velocityZ *= scale;
  }
  const maxVerticalSpeed = Math.max(0, finite(options.maxVerticalSpeed, 170));
  const velocityY = clamp((last.y - previous.y) / sampleDeltaSeconds, -maxVerticalSpeed, maxVerticalSpeed);
  const maxAngularSpeed = Math.max(0, finite(options.maxAngularSpeed, 10));
  const angularVelocity = clamp(shortestAngleDelta(previous.yaw, last.yaw) / sampleDeltaSeconds, -maxAngularSpeed, maxAngularSpeed);
  return {
    ...last,
    at,
    x: last.x + velocityX * aheadSeconds,
    y: last.y + velocityY * aheadSeconds,
    z: last.z + velocityZ * aheadSeconds,
    yaw: last.yaw + angularVelocity * aheadSeconds,
    mode: "extrapolate"
  };
}

export function rewindPose(samples, requestedAt, now = Date.now(), maxRewindMs = 220) {
  const current = finite(now, Date.now());
  const rewindWindow = Math.max(0, finite(maxRewindMs, 220));
  const targetAt = clamp(finite(requestedAt, current), current - rewindWindow, current + 35);
  return sampleMotion(samples, targetAt, { allowExtrapolation: false });
}
