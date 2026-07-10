import assert from "node:assert/strict";
import { computeSafeZone, isOutsideSafeZone, vehicleRepairStations } from "../gameplay-systems.mjs";

const startedAt = 1_000_000;

const inactive = computeSafeZone({ roundStartedAt: startedAt, now: startedAt, mode: "practice", matchStarted: true });
assert.equal(inactive.enabled, false, "practice mode must not enable the safe zone");

const waiting = computeSafeZone({ roundStartedAt: startedAt, now: startedAt + 20_000, mode: "oneLife", matchStarted: true });
assert.equal(waiting.stage, "waiting");
assert.equal(waiting.damage, 0);
assert.equal(waiting.radius, 92);

const firstShrink = computeSafeZone({ roundStartedAt: startedAt, now: startedAt + 107_500, mode: "oneLife", matchStarted: true });
assert.equal(firstShrink.stage, "shrinking");
assert.ok(firstShrink.radius < 92 && firstShrink.radius > 64, "first shrink radius must interpolate");
assert.equal(firstShrink.damage, 6);

const finalZone = computeSafeZone({ roundStartedAt: startedAt, now: startedAt + 500_000, mode: "life3", matchStarted: true });
assert.equal(finalZone.stage, "final");
assert.equal(finalZone.radius, 18);
assert.equal(finalZone.damage, 18);
assert.equal(isOutsideSafeZone({ x: finalZone.x, z: finalZone.z }, finalZone), false);
assert.equal(isOutsideSafeZone({ x: finalZone.x + 20, z: finalZone.z }, finalZone), true);

assert.equal(vehicleRepairStations.length, 3);
assert.equal(new Set(vehicleRepairStations.map((station) => station.id)).size, 3, "repair station ids must be unique");

console.log("gameplay systems passed: safe-zone phases and repair stations are valid");
