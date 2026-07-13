export const fpsDonRewardCap = 350;

export function calculateFpsDonReward(stats = {}, won = false) {
  const kills = Math.max(0, Math.floor(Number(stats.kills) || 0));
  const damage = Math.max(0, Math.floor(Number(stats.damageDealt) || 0));
  const items = Math.max(0, Math.floor(Number(stats.itemPickups) || 0));
  const completionDon = 20;
  const killDon = kills * 25;
  const damageDon = Math.floor(damage / 50) * 2;
  const itemDon = items * 15;
  const victoryDon = won ? 50 : 0;
  return {
    kills,
    damage,
    items,
    won: Boolean(won),
    completionDon,
    killDon,
    damageDon,
    itemDon,
    victoryDon,
    total: Math.min(fpsDonRewardCap, completionDon + killDon + damageDon + itemDon + victoryDon)
  };
}
