import assert from "node:assert/strict";
import {
  calculateFpsXpReward,
  levelFromProgressXp,
  progressionBonuses,
  publicShopState,
  purchaseShopItem,
  sanitizeOwnedSkins,
  sanitizeUpgrades
} from "../progression-systems.mjs";

assert.equal(levelFromProgressXp(0), 1);
assert.equal(levelFromProgressXp(480), 3);
assert.deepEqual(sanitizeUpgrades({ attack: 99, armor: -4, recovery: 2.9 }), { attack: 5, armor: 0, recovery: 2 });
assert.deepEqual(sanitizeOwnedSkins(["bee", "bad"], "heavy"), ["rounded", "bee", "heavy"]);

const base = progressionBonuses(0, {});
const veteran = progressionBonuses(12_000, { attack: 5, armor: 5, recovery: 5 });
assert.equal(base.startingHealPacks, 5);
assert.ok(veteran.attackMultiplier > base.attackMultiplier);
assert.ok(veteran.damageReduction > 0);
assert.equal(veteran.startingHealPacks, 12);

const reward = calculateFpsXpReward({ kills: 4, score: 4, hits: 9, damageDealt: 540, itemPickups: 2 }, true);
assert.equal(reward.kills, 96);
assert.ok(reward.total > 150 && reward.total <= 420);

const inventory = {
  don: 2000,
  barrierCharges: 0,
  boostTickets: 0,
  upgrades: { attack: 0, armor: 0, recovery: 0 },
  ownedSkins: ["rounded"]
};
const attackPurchase = purchaseShopItem(inventory, "upgrade_attack");
assert.equal(attackPurchase.ok, true);
assert.equal(attackPurchase.inventory.don, 1500);
assert.equal(attackPurchase.inventory.upgrades.attack, 1);
const skinPurchase = purchaseShopItem(attackPurchase.inventory, "skin_scout");
assert.equal(skinPurchase.ok, true);
assert.ok(skinPurchase.inventory.ownedSkins.includes("scout"));
assert.equal(purchaseShopItem({ ...inventory, don: 10 }, "skin_bee").reason, "insufficient_don");
assert.equal(publicShopState(skinPurchase.inventory).find((item) => item.id === "skin_scout").owned, true);

console.log("progression systems test passed");
