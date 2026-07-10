export type MotionSample = {
  at: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed?: number;
};

export type SampledMotion = MotionSample & {
  mode: "hold" | "interpolate" | "extrapolate";
};

export function shortestAngleDelta(from: number, to: number): number;
export function appendMotionSample(
  samples: MotionSample[],
  sample: MotionSample,
  options?: { maxSamples?: number; maxAgeMs?: number; teleportDistance?: number }
): { accepted: boolean; teleported: boolean };
export function sampleMotion(
  samples: MotionSample[],
  targetAt: number,
  options?: {
    allowExtrapolation?: boolean;
    maxExtrapolationMs?: number;
    maxSpeed?: number;
    maxVerticalSpeed?: number;
    maxAngularSpeed?: number;
  }
): SampledMotion | null;
export function rewindPose(
  samples: MotionSample[],
  requestedAt: number,
  now?: number,
  maxRewindMs?: number
): SampledMotion | null;
