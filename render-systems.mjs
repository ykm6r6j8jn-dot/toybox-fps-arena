function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function nextAdaptivePixelRatio(state = {}, sample = {}) {
  const minimum = Math.max(0.5, finite(sample.minimum, 1));
  const maximum = Math.max(minimum, finite(sample.maximum, minimum));
  const current = clamp(finite(state.pixelRatio, maximum), minimum, maximum);
  const frameMs = clamp(finite(sample.frameAverageMs, 16.7), 1, 100);
  const now = Math.max(0, finite(sample.now));
  const lastChangedAt = Math.max(0, finite(state.lastChangedAt));
  const cooldownMs = Math.max(1000, finite(sample.cooldownMs, 4000));

  let pressureSamples = frameMs > 21.5
    ? Math.min(8, Math.max(0, finite(state.pressureSamples)) + 1)
    : Math.max(0, finite(state.pressureSamples) - 1);
  let recoverySamples = frameMs < 17.15
    ? Math.min(12, Math.max(0, finite(state.recoverySamples)) + 1)
    : Math.max(0, finite(state.recoverySamples) - 1);
  let pixelRatio = current;
  let changed = false;

  if (now - lastChangedAt >= cooldownMs) {
    if (pressureSamples >= 2 && current > minimum + 0.001) {
      pixelRatio = Math.max(minimum, Math.round((current - 0.12) * 100) / 100);
      changed = pixelRatio !== current;
    } else if (recoverySamples >= 4 && current < maximum - 0.001) {
      pixelRatio = Math.min(maximum, Math.round((current + 0.06) * 100) / 100);
      changed = pixelRatio !== current;
    }
  }

  if (changed) {
    pressureSamples = 0;
    recoverySamples = 0;
  }

  return {
    pixelRatio,
    changed,
    pressureSamples,
    recoverySamples,
    lastChangedAt: changed ? now : lastChangedAt
  };
}
