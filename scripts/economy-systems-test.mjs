import assert from "node:assert/strict";
import { calculateFpsDonReward, fpsDonRewardCap } from "../economy-systems.mjs";

assert.deepEqual(calculateFpsDonReward({}, false), {
  kills: 0,
  damage: 0,
  items: 0,
  won: false,
  completionDon: 20,
  killDon: 0,
  damageDon: 0,
  itemDon: 0,
  victoryDon: 0,
  total: 20
});

assert.deepEqual(calculateFpsDonReward({ kills: 3, damageDealt: 249, itemPickups: 2 }, true), {
  kills: 3,
  damage: 249,
  items: 2,
  won: true,
  completionDon: 20,
  killDon: 75,
  damageDon: 8,
  itemDon: 30,
  victoryDon: 50,
  total: 183
});

const capped = calculateFpsDonReward({ kills: 50, damageDealt: 9999, itemPickups: 30 }, true);
assert.equal(capped.total, fpsDonRewardCap);
assert.equal(capped.kills, 50);
assert.equal(calculateFpsDonReward({ kills: -4, damageDealt: Number.NaN, itemPickups: 1.8 }).total, 35);

console.log("economy systems passed: completion, kills, damage, pickups, victory, sanitization, and 350 Don cap");
