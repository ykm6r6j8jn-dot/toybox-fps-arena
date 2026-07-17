export type ProgressionUpgrades = { attack: number; armor: number; recovery: number };
export type ProgressionBonuses = {
  level: number;
  attackMultiplier: number;
  attackPercent: number;
  damageReduction: number;
  armorPercent: number;
  startingHealPacks: number;
  startingEquipmentTier: number;
};
export type ShopEntry = {
  id: string;
  category: "upgrade" | "item" | "skin";
  name: string;
  description: string;
  cost: number;
  owned: boolean;
  level?: number;
  maxLevel?: number;
  count?: number;
  skin?: "rounded" | "scout" | "heavy" | "bee";
};

export const progressionVersion: string;
export const maxUpgradeLevel: number;
export const shopCatalog: readonly Record<string, unknown>[];
export function levelFromProgressXp(xp?: number): number;
export function sanitizeUpgrades(upgrades?: Partial<ProgressionUpgrades>): ProgressionUpgrades;
export function sanitizeOwnedSkins(ownedSkins?: unknown[], selectedSkin?: string): string[];
export function progressionBonuses(xp?: number, upgrades?: Partial<ProgressionUpgrades>): ProgressionBonuses;
export function calculateFpsXpReward(stats?: Record<string, number>, won?: boolean): Record<string, number> & { total: number };
export function publicShopState(inventory?: Record<string, unknown>): ShopEntry[];
export function purchaseShopItem(inventory?: Record<string, unknown>, itemId?: string): {
  ok: boolean;
  reason?: string;
  cost?: number;
  item?: Record<string, unknown>;
  inventory: Record<string, unknown>;
};
