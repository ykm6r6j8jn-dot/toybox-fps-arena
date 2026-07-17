import assert from "node:assert/strict";
import { appendMotionSample, rewindPose, sampleMotion, shortestAngleDelta, shouldSendMotionState } from "../network-systems.mjs";

const samples = [];
assert.deepEqual(
  appendMotionSample(samples, { at: 1000, x: 0, y: 1.6, z: 0, yaw: 3.1 }),
  { accepted: true, teleported: false }
);
appendMotionSample(samples, { at: 1100, x: 10, y: 2.6, z: 0, yaw: -3.1 });

const midpoint = sampleMotion(samples, 1050);
assert.equal(midpoint.mode, "interpolate");
assert.equal(midpoint.x, 5);
assert.equal(midpoint.y, 2.1);
assert.ok(Math.abs(Math.abs(midpoint.yaw) - Math.PI) < 0.05, "yaw should cross the short side of the wrap");

const extrapolated = sampleMotion(samples, 1150, { maxExtrapolationMs: 100, maxSpeed: 20 });
assert.equal(extrapolated.mode, "extrapolate");
assert.equal(extrapolated.x, 11, "horizontal extrapolation must respect the speed cap");

const held = sampleMotion(samples, 1250, { maxExtrapolationMs: 100, maxSpeed: 20 });
assert.equal(held.mode, "hold");
assert.equal(held.x, 10);

assert.equal(appendMotionSample(samples, { at: 1090, x: 9, y: 2.5, z: 0, yaw: 0 }).accepted, false);
assert.equal(samples.length, 2, "out-of-order samples must not change the track");

const teleported = appendMotionSample(samples, { at: 1200, x: 80, y: 1.6, z: 0, yaw: 0 }, { teleportDistance: 22 });
assert.equal(teleported.teleported, true);
assert.equal(samples.length, 1, "teleports must discard stale interpolation history");

const rewindHistory = [];
for (const [at, x] of [[900, -10], [1000, 0], [1100, 10], [1200, 20]]) {
  appendMotionSample(rewindHistory, { at, x, y: 1.6, z: 0, yaw: 0 }, { teleportDistance: 40 });
}
const clampedPast = rewindPose(rewindHistory, 700, 1200, 220);
assert.ok(Math.abs(clampedPast.x + 2) < 0.001, "rewind must clamp old client timestamps to 220ms");
const clampedFuture = rewindPose(rewindHistory, 1500, 1200, 220);
assert.equal(clampedFuture.x, 20, "rewind must never extrapolate into the future");
assert.ok(Math.abs(shortestAngleDelta(3.1, -3.1)) < 0.1);

const sentPose = { x: 4, y: 1.6, z: -2, yaw: 3.14, pitch: 0.1 };
assert.equal(shouldSendMotionState(sentPose, sentPose, { now: 80, lastSentAt: 0 }), false, "motion packets must respect the minimum interval");
assert.equal(shouldSendMotionState(sentPose, sentPose, { now: 500, lastSentAt: 100 }), false, "stationary players should not continuously resend poses");
assert.equal(shouldSendMotionState(sentPose, { ...sentPose, x: 4.08 }, { now: 500, lastSentAt: 100 }), true, "meaningful movement should be synchronized");
assert.equal(shouldSendMotionState(sentPose, { ...sentPose, yaw: -3.13 }, { now: 500, lastSentAt: 100 }), true, "wrapped aim changes should be synchronized");
assert.equal(shouldSendMotionState(sentPose, sentPose, { now: 1200, lastSentAt: 100 }), true, "stationary poses should still send a low-rate keepalive");

console.log("network systems passed: interpolation, capped extrapolation, teleport reset, and rewind clamp");
