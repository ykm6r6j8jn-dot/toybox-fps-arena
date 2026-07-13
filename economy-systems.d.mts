export declare const fpsDonRewardCap: number;

export type FpsDonReward = {
  kills: number;
  damage: number;
  items: number;
  won: boolean;
  completionDon: number;
  killDon: number;
  damageDon: number;
  itemDon: number;
  victoryDon: number;
  total: number;
};

export declare function calculateFpsDonReward(
  stats?: { kills?: number; damageDealt?: number; itemPickups?: number },
  won?: boolean
): FpsDonReward;
