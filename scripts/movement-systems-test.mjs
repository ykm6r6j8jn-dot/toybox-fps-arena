import assert from "node:assert/strict";
import {
  approachPlanarVelocity,
  canConsumeBufferedJump,
  clampMovementRequest,
  curveStickInput,
  groundSurfaceReach,
  isNearToyboxTrampoline,
  movementEnvelope,
  shouldAutoSprint,
  toyboxTrampolinePads,
  wrapAngle
} from "../movement-systems.mjs";

const near = (actual, expected, epsilon = 0.0001) => assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${expected}, received ${actual}`);

near(wrapAngle(Math.PI * 5), -Math.PI);
near(wrapAngle(-Math.PI * 4.5), -Math.PI / 2);

assert.deepEqual(curveStickInput(0.04, -0.05), { x: 0, z: 0, intensity: 0 });
const fullDiagonal = curveStickInput(1, -1);
near(Math.hypot(fullDiagonal.x, fullDiagonal.z), 1);
near(fullDiagonal.intensity, 1);
const halfStick = curveStickInput(0, -0.55);
assert.ok(halfStick.intensity > 0.25 && halfStick.intensity < 0.55, "stick curve must preserve precise low-speed movement");

const accelerated = approachPlanarVelocity({ x: 0, z: 0 }, { x: 10, z: 0 }, 0.1, { acceleration: 24 });
near(accelerated.x, 2.4);
const stopped = approachPlanarVelocity({ x: 2.4, z: 0 }, { x: 0, z: 0 }, 0.1, { deceleration: 30 });
near(stopped.x, 0);

assert.equal(canConsumeBufferedJump(1000, 1100, 1050), true);
assert.equal(canConsumeBufferedJump(1120, 1100, 1200), false);
assert.equal(canConsumeBufferedJump(1080, 1200, 1050), false);
assert.equal(shouldAutoSprint(1300, 1000, -0.9, 0.92), true);
assert.equal(shouldAutoSprint(1200, 1000, -0.9, 0.92), false);
assert.equal(shouldAutoSprint(1400, 1000, -0.5, 0.92), false);
near(groundSurfaceReach(true, 0.9), 0.05);
near(groundSurfaceReach(false, 0.9), 0.9);
assert.equal(3.2 <= 2.5 + groundSurfaceReach(true), false, "ascending player must not snap onto an overhead surface");
assert.equal(3.2 <= 2.5 + groundSurfaceReach(false), true, "descending player must retain landing tolerance");

assert.equal(toyboxTrampolinePads.length, 4);
assert.equal(isNearToyboxTrampoline({ x: 0, z: 8 }), true);
assert.equal(isNearToyboxTrampoline({ x: 10, z: 8 }), false);

const normalEnvelope = movementEnvelope(0.1);
const trampolineEnvelope = movementEnvelope(0.1, { trampoline: true });
assert.ok(normalEnvelope.upward < 3, "normal jump envelope must reject vertical warps");
assert.ok(trampolineEnvelope.upward > 15, "trampoline envelope must preserve high launch velocity");

const clamped = clampMovementRequest(
  { x: 0, y: 1.6, z: 0 },
  { x: 40, y: 80, z: 0 },
  0.1
);
assert.equal(clamped.correctedHorizontal, true);
assert.equal(clamped.correctedVertical, true);
near(clamped.x, normalEnvelope.horizontal);
near(clamped.y, 1.6 + normalEnvelope.upward);

const trampolineMove = clampMovementRequest(
  { x: 0, y: 1.6, z: 8 },
  { x: 0.6, y: 13.5, z: 8 },
  0.1,
  { trampoline: true }
);
assert.equal(trampolineMove.correctedHorizontal, false);
assert.equal(trampolineMove.correctedVertical, false);

console.log("movement systems passed: angle wrapping, analog curve, auto sprint, acceleration, jump grace, and authority envelopes are valid");
