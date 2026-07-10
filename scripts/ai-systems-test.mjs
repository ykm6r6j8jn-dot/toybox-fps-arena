import assert from "node:assert/strict";
import {
  chooseCpuTactic,
  computeCpuDestination,
  cpuCanFire,
  cpuDecisionInterval,
  cpuReactionDelay,
  cpuRoleForIndex,
  cpuRoles,
  scoreCpuCoverPoint,
  scoreCpuTarget,
  selectCpuWeapon
} from "../ai-systems.mjs";

assert.deepEqual([...cpuRoles], ["assault", "support", "flanker", "marksman"]);
assert.equal(cpuRoleForIndex(0), "assault");
assert.equal(cpuRoleForIndex(5), "support");
assert.ok(cpuDecisionInterval("assault", 0) < cpuDecisionInterval("marksman", 0));
assert.ok(cpuReactionDelay("assault", 12, 0) >= 400);
assert.ok(cpuReactionDelay("marksman", 60, 3) > cpuReactionDelay("assault", 12, 0));

assert.equal(chooseCpuTactic({ targetAvailable: true, outsideSafeZone: true }), "zone");
assert.equal(chooseCpuTactic({ targetAvailable: true, healthRatio: 0.2, visible: true }), "retreat");
assert.equal(chooseCpuTactic({ role: "flanker", targetAvailable: true, healthRatio: 1, distance: 26, visible: true }), "flank");
assert.equal(chooseCpuTactic({ role: "marksman", targetAvailable: true, healthRatio: 1, distance: 20, visible: true }), "retreat");
assert.equal(chooseCpuTactic({ role: "support", targetAvailable: true, healthRatio: 1, distance: 36, visible: true }), "hold");
assert.equal(chooseCpuTactic({ targetAvailable: false, objectiveActive: true }), "objective");

const bot = { x: 0, z: 0, botIndex: 2 };
const target = { x: 12, z: 0 };
const retreat = computeCpuDestination({ bot, target, tactic: "retreat", role: "assault", side: 1 });
const flankLeft = computeCpuDestination({ bot, target, tactic: "flank", role: "flanker", side: 1 });
const flankRight = computeCpuDestination({ bot, target, tactic: "flank", role: "flanker", side: -1 });
assert.ok(Math.hypot(retreat.x - target.x, retreat.z - target.z) > Math.hypot(bot.x - target.x, bot.z - target.z));
assert.ok(flankLeft.z * flankRight.z < 0, "flank sides must route around opposite sides of the target");
assert.ok(Math.abs(flankLeft.x) <= 94 && Math.abs(flankLeft.z) <= 94);

assert.ok(scoreCpuTarget({ distance: 24, visible: true, healthRatio: 0.4, sticky: true }) < scoreCpuTarget({ distance: 24, visible: false, healthRatio: 1 }));
const covered = scoreCpuCoverPoint({
  bot,
  target,
  point: { x: -3, z: 0, blockerX: -1, blockerZ: 0 },
  role: "assault"
});
const exposed = scoreCpuCoverPoint({
  bot,
  target,
  point: { x: 3, z: 0, blockerX: 1, blockerZ: 0 },
  role: "assault"
});
assert.ok(Number.isFinite(covered));
assert.equal(exposed, Infinity);

assert.equal(selectCpuWeapon({ role: "marksman", distance: 62, index: 0 }), "awm");
assert.equal(selectCpuWeapon({ role: "flanker", distance: 10, index: 0 }), "shotgun");
assert.equal(selectCpuWeapon({ role: "support", distance: 34, index: 0 }), "type95");
assert.equal(cpuCanFire({ now: 1400, targetSeenAt: 1000, visible: true, distance: 20, range: 50, reactionDelay: 500 }), false);
assert.equal(cpuCanFire({ now: 1500, targetSeenAt: 1000, visible: true, distance: 20, range: 50, reactionDelay: 500 }), true);
assert.equal(cpuCanFire({ now: 1800, targetSeenAt: 1000, visible: false, distance: 20, range: 50, reactionDelay: 500 }), false);

console.log("AI systems passed: roles, reaction time, tactics, cover, flanking, weapon choice, and fire gating are valid");
