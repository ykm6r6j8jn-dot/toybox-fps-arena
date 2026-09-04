import assert from "node:assert/strict";
import { nextAdaptivePixelRatio, projectBoxShadow } from "../render-systems.mjs";

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

const building = { min: { x: 0, y: 0, z: 0 }, max: { x: 4, y: 10, z: 4 } };
const projected = projectBoxShadow(building, { x: 1, y: 2, z: 1 });
assert.equal(Math.min(...projected.map((point) => point.x)), -5, "shadow extends opposite the sun by height / elevation");
assert.equal(Math.max(...projected.map((point) => point.x)), 4, "footprint remains included");
assert.equal(projected.length, 6, "diagonal projection produces one convex hull");
assert.equal(projectBoxShadow(building, { x: 0, y: 1, z: 0 }).length, 4, "overhead sun matches footprint");
assert.deepEqual(projectBoxShadow(building, { x: 1, y: 0, z: 1 }), [], "invalid sun cannot create infinite geometry");
console.log("render systems passed: adaptive quality and physically directed static shadow projections");
