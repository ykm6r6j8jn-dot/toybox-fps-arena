import assert from "node:assert/strict";
import { nextAdaptivePixelRatio } from "../render-systems.mjs";

let state = { pixelRatio: 1.6, pressureSamples: 0, recoverySamples: 0, lastChangedAt: 0 };
state = nextAdaptivePixelRatio(state, { frameAverageMs: 24, now: 5000, minimum: 1.1, maximum: 1.7 });
assert.equal(state.changed, false, "one slow sample must not resize the renderer");
state = nextAdaptivePixelRatio(state, { frameAverageMs: 24, now: 6500, minimum: 1.1, maximum: 1.7 });
assert.equal(state.pixelRatio, 1.48, "sustained frame pressure should lower resolution once");
assert.equal(state.lastChangedAt, 6500);

for (const now of [7800, 9200, 10600, 12000]) {
  state = nextAdaptivePixelRatio(state, { frameAverageMs: 15.8, now, minimum: 1.1, maximum: 1.7 });
}
assert.equal(state.pixelRatio, 1.54, "stable fast frames should recover quality gradually after cooldown");

let floorState = { pixelRatio: 1.1, pressureSamples: 4, recoverySamples: 0, lastChangedAt: 0 };
floorState = nextAdaptivePixelRatio(floorState, { frameAverageMs: 28, now: 9000, minimum: 1.1, maximum: 1.7 });
assert.equal(floorState.pixelRatio, 1.1, "quality must never fall below the device floor");

console.log("render systems passed: quality changes use pressure, recovery, cooldown, and device bounds");
