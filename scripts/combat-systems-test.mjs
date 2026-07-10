import assert from "node:assert/strict";
import {
  computeAimSpread,
  damageDirectionAngle,
  hitZoneDamage,
  raySphereEntryDistance,
  recoverShotBloom,
  resolveHumanoidHit
} from "../combat-systems.mjs";

const target = { x: 0, y: 1.6, z: 0 };
const forward = { x: 0, y: 0, z: -1 };

const head = resolveHumanoidHit({ x: 0, y: 1.6, z: 10 }, forward, target, 20);
assert.equal(head?.zone, "head");

const torso = resolveHumanoidHit({ x: 0, y: 0.9, z: 10 }, forward, target, 20);
assert.equal(torso?.zone, "torso");

const limbs = resolveHumanoidHit({ x: 0, y: 0.28, z: 10 }, forward, target, 20);
assert.equal(limbs?.zone, "limbs");

assert.equal(resolveHumanoidHit({ x: 1.2, y: 1.6, z: 10 }, forward, target, 20), null);
assert.equal(raySphereEntryDistance({ x: 0, y: 0, z: 5 }, forward, { x: 0, y: 0, z: 0 }, 1, 3), null);
assert.ok(Math.abs(raySphereEntryDistance({ x: 0, y: 0, z: 5 }, forward, { x: 0, y: 0, z: 0 }, 1, 10) - 4) < 0.001);

assert.equal(hitZoneDamage(25, "head"), 35);
assert.equal(hitZoneDamage(25, "torso"), 25);
assert.equal(hitZoneDamage(25, "limbs"), 21);

assert.equal(computeAimSpread(0.01), 0.01);
assert.ok(Math.abs(computeAimSpread(0.01, 0, { moving: true }) - 0.0162) < 0.00001);
assert.ok(Math.abs(computeAimSpread(0.01, 0, { moving: true, sneaking: true }) - 0.012) < 0.00001);
assert.ok(Math.abs(computeAimSpread(0.01, 0, { airborne: true }) - 0.0235) < 0.00001);
assert.ok(computeAimSpread(0.01, 0.005, { scoped: true, touch: true }) < 0.006, "scope and touch compensation should tighten aim");
assert.equal(recoverShotBloom(0.01, 0.02, 0.25), 0.005);
assert.equal(recoverShotBloom(0.004, 0.02, 0.25), 0);

assert.ok(Math.abs(damageDirectionAngle(0, target, { x: 0, z: -10 })) < 0.001, "front should be zero");
assert.ok(Math.abs(damageDirectionAngle(0, target, { x: 10, z: 0 }) - Math.PI / 2) < 0.001, "right should be positive 90 degrees");
assert.ok(Math.abs(Math.abs(damageDirectionAngle(0, target, { x: 0, z: 10 })) - Math.PI) < 0.001, "rear should be 180 degrees");
assert.ok(Math.abs(damageDirectionAngle(1e12, target, { x: 0, z: -10 })) <= Math.PI, "large yaw values must normalize in constant time");

console.log("combat systems passed: hit zones, applied damage, aim spread/recovery, and direction angles");
