const clampInt = (value, min, max) => Math.min(max, Math.max(min, Math.floor(Number(value) || 0)));

export const progressionVersion = "PROGRESSION 2.0";
export const maxUpgradeLevel = 5;

export const shopCatalog = Object.freeze([
  Object.freeze({
    id: "upgrade_attack",
    category: "upgrade",
    stat: "attack",
    name: "ウェポンコア",
    description: "全武器の基礎ダメージを少し強化",
    costs: Object.freeze([500, 850, 1350, 2100, 3200])
  }),
  Object.freeze({
    id: "upgrade_armor",
    category: "upgrade",
    stat: "armor",
    name: "アーマーフレーム",
    description: "被ダメージを軽減し装備Lvを底上げ",
    costs: Object.freeze([450, 800, 1250, 1950, 3000])
  }),
  Object.freeze({
    id: "upgrade_recovery",
    category: "upgrade",
    stat: "recovery",
    name: "メディカルポーチ",
    description: "毎試合の回復アイテム所持数を追加",
    costs: Object.freeze([350, 650, 1000, 1550, 2400])
  }),
  Object.freeze({
    id: "item_barrier",
    category: "item",
    field: "barrierCharges",
    name: "携帯バリア",
    description: "次の試合開始時に短時間バリア",
    cost: 420,
    max: 9
  }),
  Object.freeze({
    id: "item_boost",
    category: "item",
    field: "boostTickets",
    name: "ブーストチケット",
    description: "次の試合開始時に移動ブースト",
    cost: 300,
    max: 20
  }),
  Object.freeze({
    id: "skin_scout",
    category: "skin",
    skin: "scout",
    name: "スカウトスキン",
    description: "軽量シルエットの限定外観",
    cost: 800
  }),
  Object.freeze({
    id: "skin_heavy",
    category: "skin",
    skin: "heavy",
    name: "ヘビースキン",
    description: "重装甲シルエットの限定外観",
    cost: 1200
  }),
  Object.freeze({
    id: "skin_bee",
    category: "skin",
    skin: "bee",
    name: "ハチスキン",
    description: "DonPaChi専用ハチ外観",
    cost: 1600
  })
]);

export function levelFromProgressXp(xp = 0) {
  return Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 120)) + 1;
}

export function sanitizeUpgrades(upgrades = {}) {
  return {
    attack: clampInt(upgrades.attack, 0, maxUpgradeLevel),
    armor: clampInt(upgrades.armor, 0, maxUpgradeLevel),
    recovery: clampInt(upgrades.recovery, 0, maxUpgradeLevel)
  };
}

export function sanitizeOwnedSkins(ownedSkins = [], selectedSkin = "rounded") {
  const allowed = new Set(["rounded", "scout", "heavy", "bee"]);
  const result = new Set(["rounded"]);
  if (Array.isArray(ownedSkins)) {
    for (const skin of ownedSkins) if (allowed.has(String(skin))) result.add(String(skin));
  }
  if (allowed.has(String(selectedSkin))) result.add(String(selectedSkin));
  return [...result];
}

export function progressionBonuses(xp = 0, upgrades = {}) {
  const level = levelFromProgressXp(xp);
  const normalized = sanitizeUpgrades(upgrades);
  const levelSteps = Math.min(10, Math.floor((level - 1) / 3));
  const attackMultiplier = Math.min(1.18, 1 + levelSteps * 0.006 + normalized.attack * 0.018);
  const damageReduction = Math.min(0.14, levelSteps * 0.004 + normalized.armor * 0.018);
  const startingHealPacks = clampInt(5 + Math.floor((level - 1) / 5) + normalized.recovery, 5, 12);
  const startingEquipmentTier = clampInt(Math.floor((level - 1) / 6) + Math.floor(normalized.armor / 2), 0, 5);
  return {
    level,
    attackMultiplier,
    attackPercent: Math.round((attackMultiplier - 1) * 100),
    damageReduction,
    armorPercent: Math.round(damageReduction * 100),
    startingHealPacks,
    startingEquipmentTier
  };
}

export function calculateFpsXpReward(stats = {}, won = false) {
  const kills = clampInt(stats.kills, 0, 99);
  const score = clampInt(stats.score, 0, 999);
  const hits = clampInt(stats.hits, 0, 9999);
  const damage = clampInt(stats.damageDealt, 0, 999999);
  const items = clampInt(stats.itemPickups, 0, 999);
  const breakdown = {
    participation: 24,
    kills: kills * 24,
    score: Math.min(80, score * 4),
    accuracy: Math.min(48, hits * 2),
    damage: Math.min(70, Math.floor(damage / 90)),
    items: Math.min(30, items * 5),
    victory: won ? 42 : 0
  };
  return {
    ...breakdown,
    total: Math.min(420, Object.values(breakdown).reduce((sum, value) => sum + value, 0))
  };
}

export function publicShopState(inventory = {}) {
  const upgrades = sanitizeUpgrades(inventory.upgrades);
  const ownedSkins = sanitizeOwnedSkins(inventory.ownedSkins);
  return shopCatalog.map((item) => {
    if (item.category === "upgrade") {
      const level = upgrades[item.stat];
      return {
        id: item.id,
        category: item.category,
        name: item.name,
        description: item.description,
        level,
        maxLevel: maxUpgradeLevel,
        cost: level >= maxUpgradeLevel ? 0 : item.costs[level],
        owned: level >= maxUpgradeLevel
      };
    }
    if (item.category === "skin") {
      const owned = ownedSkins.includes(item.skin);
      return { ...item, owned, cost: owned ? 0 : item.cost };
    }
    const count = clampInt(inventory[item.field], 0, item.max);
    return { ...item, count, owned: count >= item.max };
  });
}

export function purchaseShopItem(inventory = {}, itemId = "") {
  const item = shopCatalog.find((entry) => entry.id === itemId);
  if (!item) return { ok: false, reason: "unknown_item", inventory };

  const next = {
    ...inventory,
    don: clampInt(inventory.don, 0, 999999),
    barrierCharges: clampInt(inventory.barrierCharges, 0, 9),
    boostTickets: clampInt(inventory.boostTickets, 0, 20),
    upgrades: sanitizeUpgrades(inventory.upgrades),
    ownedSkins: sanitizeOwnedSkins(inventory.ownedSkins)
  };

  let cost = 0;
  if (item.category === "upgrade") {
    const level = next.upgrades[item.stat];
    if (level >= maxUpgradeLevel) return { ok: false, reason: "max_level", inventory: next };
    cost = item.costs[level];
    if (next.don < cost) return { ok: false, reason: "insufficient_don", inventory: next, cost };
    next.upgrades = { ...next.upgrades, [item.stat]: level + 1 };
  } else if (item.category === "skin") {
    if (next.ownedSkins.includes(item.skin)) return { ok: false, reason: "already_owned", inventory: next };
    cost = item.cost;
    if (next.don < cost) return { ok: false, reason: "insufficient_don", inventory: next, cost };
    next.ownedSkins = [...next.ownedSkins, item.skin];
  } else {
    const count = clampInt(next[item.field], 0, item.max);
    if (count >= item.max) return { ok: false, reason: "max_items", inventory: next };
    cost = item.cost;
    if (next.don < cost) return { ok: false, reason: "insufficient_don", inventory: next, cost };
    next[item.field] = count + 1;
  }

  next.don -= cost;
  return { ok: true, item, cost, inventory: next };
}
