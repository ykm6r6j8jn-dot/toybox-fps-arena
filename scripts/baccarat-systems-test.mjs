import assert from "node:assert/strict";
import {
  addBaccaratPlayer,
  baccaratBetTotal,
  baccaratBettingMs,
  baccaratCardValue,
  baccaratHandTotal,
  baccaratSnapshotFor,
  bankerDrawsThirdCard,
  clearBaccaratBets,
  createBaccaratShoe,
  createBaccaratTable,
  lockBaccaratBets,
  placeBaccaratBet,
  repeatBaccaratBets,
  resolveBaccaratQaRound,
  resolveBaccaratRound,
  settleBaccaratBets,
  undoBaccaratBet,
  updateBaccaratTable
} from "../baccarat-systems.mjs";

assert.equal(createBaccaratShoe(8, () => 0).length, 416);
assert.equal(baccaratCardValue("1S"), 1);
assert.equal(baccaratCardValue("10H"), 0);
assert.equal(baccaratCardValue("13D"), 0);
assert.equal(baccaratHandTotal(["9S", "8H", "3D"]), 0);

assert.equal(bankerDrawsThirdCard(3, 8), false);
assert.equal(bankerDrawsThirdCard(3, 7), true);
assert.equal(bankerDrawsThirdCard(4, 1), false);
assert.equal(bankerDrawsThirdCard(4, 2), true);
assert.equal(bankerDrawsThirdCard(5, 4), true);
assert.equal(bankerDrawsThirdCard(6, 5), false);
assert.equal(bankerDrawsThirdCard(6, 7), true);
assert.equal(bankerDrawsThirdCard(5), true);
assert.equal(bankerDrawsThirdCard(6), false);

const shoeFor = (drawOrder) => [...drawOrder].reverse();
const natural = resolveBaccaratRound(shoeFor(["4S", "3H", "5D", "4C", "2S", "2H"]));
assert.equal(natural.winner, "player");
assert.equal(natural.playerTotal, 9);
assert.equal(natural.bankerTotal, 7);
assert.equal(natural.dealSequence.length, 4);

const thirdCards = resolveBaccaratRound(shoeFor(["2S", "3H", "3D", "2C", "4S", "3C"]));
assert.equal(thirdCards.playerCards.length, 3);
assert.equal(thirdCards.bankerCards.length, 3);
assert.equal(thirdCards.playerTotal, 9);
assert.equal(thirdCards.bankerTotal, 8);
assert.equal(thirdCards.winner, "player");

assert.deepEqual(
  settleBaccaratBets({ player: 100, banker: 0, tie: 0, playerPair: 10, bankerPair: 0 }, { winner: "player", playerPair: true, bankerPair: false }),
  { stake: 110, payout: 320, net: 210 }
);
assert.deepEqual(
  settleBaccaratBets({ player: 100, banker: 100, tie: 20 }, { winner: "tie", playerPair: false, bankerPair: false }),
  { stake: 220, payout: 380, net: 160 }
);
assert.deepEqual(
  settleBaccaratBets({ banker: 100 }, { winner: "banker", playerPair: false, bankerPair: false }),
  { stake: 100, payout: 195, net: 95 }
);

const table = createBaccaratTable(1000, () => 0);
const noGrantTable = createBaccaratTable(1000, () => 0);
const noGrantPlayer = addBaccaratPlayer(noGrantTable, { id: "no-grant", name: "NoGrant" }, 1000);
assert.equal(noGrantPlayer.chips, 0, "entering baccarat must never create the initial shared balance");
const player = addBaccaratPlayer(table, { id: "p1", name: "Test", chips: 2000 }, 1000);
assert.equal(table.phase, "betting");
assert.equal(table.phaseEndsAt, 1000 + baccaratBettingMs);
assert.equal(placeBaccaratBet(table, player, "player", 100, 1200).ok, true);
assert.equal(placeBaccaratBet(table, player, "tie", 50, 1250).ok, true);
assert.equal(player.chips, 1850);
assert.equal(baccaratBetTotal(player.bets), 150);
assert.equal(undoBaccaratBet(table, player, 1300).refunded, 50);
assert.equal(clearBaccaratBets(table, player, 1350).refunded, 100);
assert.equal(player.chips, 2000);
player.lastBets.player = 100;
player.lastBets.bankerPair = 20;
assert.equal(repeatBaccaratBets(table, player, 1400).amount, 120);
assert.equal(lockBaccaratBets(table, player, 1500).ok, true);
assert.equal(placeBaccaratBet(table, player, "banker", 10, 1600).ok, false);

const dealing = updateBaccaratTable(table, table.phaseEndsAt, () => 0);
assert.equal(dealing.transition, "dealing");
assert.equal(table.phase, "dealing");
const partial = baccaratSnapshotFor(table, player.id, table.dealStartedAt + 410);
assert.equal(partial.revealCount, 2);
const settled = updateBaccaratTable(table, table.phaseEndsAt, () => 0);
assert.equal(settled.transition, "settled");
assert.equal(table.phase, "result");
assert.equal(table.history.length, 1);
assert.equal(settled.settledPlayers.length, 1);

const qaTable = createBaccaratTable(2000, () => 0);
qaTable.code = "DONQA";
qaTable.qaMode = true;
const qaPlayer = addBaccaratPlayer(qaTable, { id: "qa", name: "ひでお", chips: 2000 }, 2000);
qaPlayer.bets.player = 10;
let qaPlayerWins = 0;
for (let round = 0; round < 1000; round += 1) {
  const outcome = resolveBaccaratQaRound(qaTable);
  if (outcome.winner === "player") qaPlayerWins += 1;
}
assert.equal(qaPlayerWins, 999, "isolated QA table must produce exactly 999 dominant-target wins per 1000 resolved bets");
qaPlayer.bets.player = 0;
qaPlayer.bets.bankerPair = 10;
qaTable.qaResolvedRounds = 0;
assert.equal(resolveBaccaratQaRound(qaTable).bankerPair, true, "QA table supports pair-target verification");

console.log("baccarat systems passed: 8-deck shoe, third-card rules, payouts, authoritative bets, reveal timing, shared settlement, and isolated 99.9% QA sequencing");
