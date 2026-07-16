export type AdaptiveQualityState = {
  pixelRatio: number;
  pressureSamples?: number;
  recoverySamples?: number;
  lastChangedAt?: number;
};

export type AdaptiveQualitySample = {
  frameAverageMs: number;
  now: number;
  minimum: number;
  maximum: number;
  cooldownMs?: number;
};

export function nextAdaptivePixelRatio(
  state: AdaptiveQualityState,
  sample: AdaptiveQualitySample
): {
  pixelRatio: number;
  changed: boolean;
  pressureSamples: number;
  recoverySamples: number;
  lastChangedAt: number;
};
