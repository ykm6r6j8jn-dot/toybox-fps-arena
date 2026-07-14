export const baccaratVersion = "BACCARAT 1.2";
export const globalBaccaratTableCode = "DONBAC";
export const baccaratQaTableCode = "DONQA";
export const initialSharedDon = 2000;
export const baccaratBettingMs = 12_000;
export const baccaratDealingMs = 2_600;
export const baccaratResultMs = 5_000;
export const baccaratMinBet = 10;
export const baccaratMaxBetPerRound = 100_000;
export const baccaratTargets = Object.freeze(["player", "tie", "banker", "playerPair", "bankerPair"]);

const targetSet = new Set(baccaratTargets);

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function emptyBets() {
  return Object.fromEntries(baccaratTargets.map((target) => [target, 0]));
}

function normalizedBets(bets = {}) {
  return Object.fromEntries(baccaratTargets.map((target) => [
    target,
    Math.max(0, Math.floor(finite(bets[target])))
  ]));
}

export function baccaratBetTotal(bets = {}) {
  return baccaratTargets.reduce((total, target) => total + Math.max(0, Math.floor(finite(bets[target]))), 0);
}

export function baccaratCardValue(card) {
  const rank = Math.max(1, Math.floor(finite(typeof card === "string" ? card.slice(0, -1) : card?.rank)));
  return rank >= 10 ? 0 : rank;
}

export function baccaratHandTotal(cards = []) {
  return cards.reduce((total, card) => total + baccaratCardValue(card), 0) % 10;
}

export function bankerDrawsThirdCard(bankerTotal, playerThirdValue) {
  const total = Math.max(0, Math.floor(finite(bankerTotal))) % 10;
  if (playerThirdValue === undefined || playerThirdValue === null) return total <= 5;
  const third = Math.max(0, Math.floor(finite(playerThirdValue))) % 10;
  if (total <= 2) return true;
  if (total === 3) return third !== 8;
  if (total === 4) return third >= 2 && third <= 7;
  if (total === 5) return third >= 4 && third <= 7;
  if (total === 6) return third === 6 || third === 7;
  return false;
}

export function createBaccaratShoe(deckCount = 8, randomInt = (max) => Math.floor(Math.random() * max)) {
  const decks = Math.max(1, Math.min(8, Math.floor(finite(deckCount, 8))));
  const cards = [];
  for (let deck = 0; deck < decks; deck += 1) {
    for (const suit of ["S", "H", "D", "C"]) {
      for (let rank = 1; rank <= 13; rank += 1) cards.push(`${rank}${suit}`);
    }
  }
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.max(0, Math.min(index, Math.floor(finite(randomInt(index + 1)))));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }
  return cards;
}

export function resolveBaccaratRound(shoe) {
  if (!Array.isArray(shoe) || shoe.length < 6) throw new Error("baccarat shoe is too short");
  const playerCards = [];
  const bankerCards = [];
  const dealSequence = [];
  const draw = (side) => {
    const card = shoe.pop();
    if (!card) throw new Error("baccarat shoe exhausted");
    (side === "player" ? playerCards : bankerCards).push(card);
    dealSequence.push({ side, card });
    return card;
  };

  draw("player");
  draw("banker");
  draw("player");
  draw("banker");

  let playerTotal = baccaratHandTotal(playerCards);
  let bankerTotal = baccaratHandTotal(bankerCards);
  const natural = playerTotal >= 8 || bankerTotal >= 8;
  let playerThirdValue;
  if (!natural && playerTotal <= 5) {
    playerThirdValue = baccaratCardValue(draw("player"));
    playerTotal = baccaratHandTotal(playerCards);
  }
  if (!natural && bankerDrawsThirdCard(bankerTotal, playerThirdValue)) {
    draw("banker");
    bankerTotal = baccaratHandTotal(bankerCards);
  }

  const winner = playerTotal > bankerTotal ? "player" : bankerTotal > playerTotal ? "banker" : "tie";
  return {
    playerCards,
    bankerCards,
    playerTotal,
    bankerTotal,
    playerPair: playerCards[0]?.slice(0, -1) === playerCards[1]?.slice(0, -1),
    bankerPair: bankerCards[0]?.slice(0, -1) === bankerCards[1]?.slice(0, -1),
    winner,
    natural,
    dealSequence
  };
}

function dominantBaccaratTarget(bets = {}) {
  return baccaratTargets.reduce((best, target) => {
    const amount = Math.max(0, Math.floor(finite(bets[target])));
    return amount > best.amount ? { target, amount } : best;
  }, { target: "", amount: 0 }).target;
}

function fixedQaOutcome(target, shouldWin) {
  let playerCards = ["9S", "13H"];
  let bankerCards = ["7D", "13C"];
  if ((target === "banker" && shouldWin) || (target === "player" && !shouldWin) || (target === "tie" && !shouldWin)) {
    playerCards = ["7S", "13H"];
    bankerCards = ["9D", "13C"];
  } else if (target === "tie" && shouldWin) {
    playerCards = ["1S", "7H"];
    bankerCards = ["2D", "6C"];
  } else if (target === "playerPair" && shouldWin) {
    playerCards = ["4S", "4H"];
    bankerCards = ["7D", "13C"];
  } else if (target === "bankerPair" && shouldWin) {
    playerCards = ["7S", "13H"];
    bankerCards = ["4D", "4C"];
  }
  const playerTotal = baccaratHandTotal(playerCards);
  const bankerTotal = baccaratHandTotal(bankerCards);
  return {
    playerCards,
    bankerCards,
    playerTotal,
    bankerTotal,
    playerPair: playerCards[0].slice(0, -1) === playerCards[1].slice(0, -1),
    bankerPair: bankerCards[0].slice(0, -1) === bankerCards[1].slice(0, -1),
    winner: playerTotal > bankerTotal ? "player" : bankerTotal > playerTotal ? "banker" : "tie",
    natural: playerTotal >= 8 || bankerTotal >= 8,
    dealSequence: [
      { side: "player", card: playerCards[0] },
      { side: "banker", card: bankerCards[0] },
      { side: "player", card: playerCards[1] },
      { side: "banker", card: bankerCards[1] }
    ]
  };
}

export function resolveBaccaratQaRound(table) {
  const player = [...table.players.values()].find((candidate) => candidate.connected && baccaratBetTotal(candidate.bets) > 0);
  const target = dominantBaccaratTarget(player?.bets);
  if (!target) return resolveBaccaratRound(table.shoe);
  const sequence = Math.max(0, Math.floor(finite(table.qaResolvedRounds)));
  const shouldWin = sequence % 1000 !== 999;
  table.qaResolvedRounds = sequence + 1;
  table.shoe.splice(Math.max(0, table.shoe.length - 4), 4);
  return fixedQaOutcome(target, shouldWin);
}

export function settleBaccaratBets(bets, outcome) {
  const normalized = normalizedBets(bets);
  const stake = baccaratBetTotal(normalized);
  let payout = 0;
  if (outcome.winner === "tie") {
    payout += normalized.player + normalized.banker;
    payout += normalized.tie * 9;
  } else if (outcome.winner === "player") {
    payout += normalized.player * 2;
  } else if (outcome.winner === "banker") {
    payout += Math.floor(normalized.banker * 1.95);
  }
  if (outcome.playerPair) payout += normalized.playerPair * 12;
  if (outcome.bankerPair) payout += normalized.bankerPair * 12;
  return { stake, payout, net: payout - stake };
}

export function createBaccaratTable(now = Date.now(), randomInt) {
  return {
    version: baccaratVersion,
    code: globalBaccaratTableCode,
    phase: "waiting",
    phaseEndsAt: 0,
    dealStartedAt: 0,
    round: 0,
    shoe: createBaccaratShoe(8, randomInt),
    shoeSize: 416,
    players: new Map(),
    playerCards: [],
    bankerCards: [],
    dealSequence: [],
    outcome: null,
    history: [],
    recentBets: [],
    qaMode: false,
    qaResolvedRounds: 0,
    createdAt: now
  };
}

export function addBaccaratPlayer(table, player, now = Date.now()) {
  const normalized = {
    id: String(player.id),
    ws: player.ws || null,
    profileKey: String(player.profileKey || ""),
    name: String(player.name || "プレイヤー"),
    chips: Math.max(0, Math.floor(finite(player.chips, 0))),
    bets: emptyBets(),
    lastBets: emptyBets(),
    betStack: [],
    locked: false,
    connected: true,
    lastPayout: 0,
    lastNet: 0,
    joinedAt: now,
    lastSeen: now
  };
  table.players.set(normalized.id, normalized);
  if (table.phase === "waiting") startBaccaratBetting(table, now);
  return normalized;
}

export function reconnectBaccaratPlayer(table, player, { id, ws, name }, now = Date.now()) {
  if (!player || !table.players.has(player.id)) return null;
  if (id && id !== player.id) {
    table.players.delete(player.id);
    player.id = String(id);
    table.players.set(player.id, player);
  }
  player.ws = ws || null;
  player.name = String(name || player.name);
  player.connected = true;
  player.lastSeen = now;
  return player;
}

export function removeBaccaratPlayer(table, player, now = Date.now()) {
  if (!player || !table.players.has(player.id)) return { removed: false, refunded: 0 };
  player.connected = false;
  player.ws = null;
  player.lastSeen = now;
  if (table.phase === "betting") {
    const refunded = baccaratBetTotal(player.bets);
    player.chips += refunded;
    player.bets = emptyBets();
    player.betStack = [];
    table.players.delete(player.id);
    return { removed: true, refunded };
  }
  return { removed: false, refunded: 0 };
}

export function startBaccaratBetting(table, now = Date.now(), randomInt) {
  if (table.shoe.length < 60) table.shoe = createBaccaratShoe(8, randomInt);
  table.phase = "betting";
  table.phaseEndsAt = now + baccaratBettingMs;
  table.dealStartedAt = 0;
  table.round += 1;
  table.playerCards = [];
  table.bankerCards = [];
  table.dealSequence = [];
  table.outcome = null;
  for (const player of table.players.values()) {
    player.bets = emptyBets();
    player.betStack = [];
    player.locked = false;
    player.lastPayout = 0;
    player.lastNet = 0;
  }
}

export function placeBaccaratBet(table, player, target, amount, now = Date.now()) {
  if (!player || !table.players.has(player.id) || !player.connected) return { ok: false, message: "テーブルに再接続してください。" };
  if (table.phase !== "betting" || now >= table.phaseEndsAt) return { ok: false, message: "ベット受付は終了しました。" };
  if (player.locked) return { ok: false, message: "このラウンドのベットは確定済みです。" };
  if (!targetSet.has(target)) return { ok: false, message: "ベット先が正しくありません。" };
  const value = Math.floor(finite(amount));
  if (value < baccaratMinBet || value % baccaratMinBet !== 0) return { ok: false, message: `ベットは${baccaratMinBet}Don単位です。` };
  if (value > player.chips) return { ok: false, message: "Donが足りません。" };
  if (baccaratBetTotal(player.bets) + value > baccaratMaxBetPerRound) return { ok: false, message: "1ラウンドの上限を超えています。" };
  player.chips -= value;
  player.bets[target] += value;
  player.betStack.push({ target, amount: value });
  player.lastSeen = now;
  table.recentBets.unshift({ id: `${player.id}:${now}:${player.betStack.length}`, playerId: player.id, name: player.name, target, amount: value, at: now });
  table.recentBets.length = Math.min(table.recentBets.length, 12);
  return { ok: true, amount: value, target };
}

export function undoBaccaratBet(table, player, now = Date.now()) {
  if (!player || table.phase !== "betting" || now >= table.phaseEndsAt || player.locked) return { ok: false, message: "現在は取り消せません。" };
  const last = player.betStack.pop();
  if (!last) return { ok: false, message: "取り消すベットがありません。" };
  player.bets[last.target] = Math.max(0, player.bets[last.target] - last.amount);
  player.chips += last.amount;
  return { ok: true, refunded: last.amount };
}

export function clearBaccaratBets(table, player, now = Date.now()) {
  if (!player || table.phase !== "betting" || now >= table.phaseEndsAt || player.locked) return { ok: false, message: "現在は取り消せません。" };
  const refunded = baccaratBetTotal(player.bets);
  if (!refunded) return { ok: false, message: "取り消すベットがありません。" };
  player.chips += refunded;
  player.bets = emptyBets();
  player.betStack = [];
  return { ok: true, refunded };
}

export function repeatBaccaratBets(table, player, now = Date.now()) {
  if (!player || table.phase !== "betting" || now >= table.phaseEndsAt || player.locked) return { ok: false, message: "現在はリピートできません。" };
  if (baccaratBetTotal(player.bets) > 0) return { ok: false, message: "先に現在のベットをクリアしてください。" };
  const previous = normalizedBets(player.lastBets);
  const total = baccaratBetTotal(previous);
  if (!total) return { ok: false, message: "前回のベットがありません。" };
  if (total > player.chips) return { ok: false, message: "前回と同じDonが足りません。" };
  player.chips -= total;
  player.bets = previous;
  player.betStack = baccaratTargets.filter((target) => previous[target] > 0).map((target) => ({ target, amount: previous[target] }));
  table.recentBets.unshift({ id: `${player.id}:${now}:repeat`, playerId: player.id, name: player.name, target: "repeat", amount: total, at: now });
  table.recentBets.length = Math.min(table.recentBets.length, 12);
  return { ok: true, amount: total };
}

export function lockBaccaratBets(table, player, now = Date.now()) {
  if (!player || table.phase !== "betting" || now >= table.phaseEndsAt) return { ok: false, message: "ベット受付は終了しました。" };
  if (!baccaratBetTotal(player.bets)) return { ok: false, message: "先にチップを置いてください。" };
  player.locked = true;
  return { ok: true };
}

export function updateBaccaratTable(table, now = Date.now(), randomInt) {
  const connected = [...table.players.values()].filter((player) => player.connected);
  if (table.phase === "waiting") {
    if (connected.length) {
      startBaccaratBetting(table, now, randomInt);
      return { transition: "betting", settledPlayers: [] };
    }
    return { transition: "none", settledPlayers: [] };
  }
  if (table.phase === "betting" && now >= table.phaseEndsAt) {
    if (table.shoe.length < 60) table.shoe = createBaccaratShoe(8, randomInt);
    const outcome = table.qaMode ? resolveBaccaratQaRound(table) : resolveBaccaratRound(table.shoe);
    table.playerCards = outcome.playerCards;
    table.bankerCards = outcome.bankerCards;
    table.dealSequence = outcome.dealSequence;
    table.outcome = outcome;
    table.phase = "dealing";
    table.dealStartedAt = now;
    table.phaseEndsAt = now + baccaratDealingMs;
    return { transition: "dealing", settledPlayers: [] };
  }
  if (table.phase === "dealing" && now >= table.phaseEndsAt) {
    const settledPlayers = [];
    for (const player of table.players.values()) {
      const settlement = settleBaccaratBets(player.bets, table.outcome);
      player.lastBets = normalizedBets(player.bets);
      player.chips += settlement.payout;
      player.lastPayout = settlement.payout;
      player.lastNet = settlement.net;
      settledPlayers.push({ player, ...settlement });
    }
    table.history.unshift({
      round: table.round,
      winner: table.outcome.winner,
      playerTotal: table.outcome.playerTotal,
      bankerTotal: table.outcome.bankerTotal,
      playerPair: table.outcome.playerPair,
      bankerPair: table.outcome.bankerPair,
      at: now
    });
    table.history.length = Math.min(table.history.length, 40);
    table.phase = "result";
    table.phaseEndsAt = now + baccaratResultMs;
    return { transition: "settled", settledPlayers };
  }
  if (table.phase === "result" && now >= table.phaseEndsAt) {
    for (const player of [...table.players.values()]) {
      if (!player.connected) table.players.delete(player.id);
    }
    if ([...table.players.values()].some((player) => player.connected)) {
      startBaccaratBetting(table, now, randomInt);
      return { transition: "betting", settledPlayers: [] };
    }
    table.phase = "waiting";
    table.phaseEndsAt = 0;
    return { transition: "waiting", settledPlayers: [] };
  }
  return { transition: "none", settledPlayers: [] };
}

export function baccaratSnapshotFor(table, viewerId, now = Date.now()) {
  const viewer = table.players.get(viewerId);
  const revealCount = table.phase === "result"
    ? table.dealSequence.length
    : table.phase === "dealing"
      ? Math.min(table.dealSequence.length, Math.max(0, Math.floor((now - table.dealStartedAt) / 400) + 1))
      : 0;
  const visiblePlayerCards = [];
  const visibleBankerCards = [];
  for (const item of table.dealSequence.slice(0, revealCount)) {
    (item.side === "player" ? visiblePlayerCards : visibleBankerCards).push(item.card);
  }
  const connectedPlayers = [...table.players.values()].filter((player) => player.connected);
  const totals = emptyBets();
  for (const player of table.players.values()) {
    for (const target of baccaratTargets) totals[target] += player.bets[target] || 0;
  }
  return {
    type: "baccarat_snapshot",
    version: baccaratVersion,
    table: table.code,
    selfId: viewerId,
    phase: table.phase,
    phaseEndsAt: table.phaseEndsAt,
    serverNow: now,
    round: table.round,
    participantCount: connectedPlayers.length,
    players: connectedPlayers
      .sort((a, b) => baccaratBetTotal(b.bets) - baccaratBetTotal(a.bets) || b.chips - a.chips)
      .slice(0, 40)
      .map((player) => ({ id: player.id, name: player.name, chips: player.chips, bet: baccaratBetTotal(player.bets), locked: player.locked })),
    viewer: viewer ? {
      chips: viewer.chips,
      bets: normalizedBets(viewer.bets),
      lastBets: normalizedBets(viewer.lastBets),
      locked: viewer.locked,
      lastPayout: viewer.lastPayout,
      lastNet: viewer.lastNet
    } : null,
    betTotals: totals,
    playerCards: visiblePlayerCards,
    bankerCards: visibleBankerCards,
    playerCardCount: table.playerCards.length,
    bankerCardCount: table.bankerCards.length,
    revealCount,
    playerTotal: revealCount >= table.dealSequence.length && table.outcome ? table.outcome.playerTotal : null,
    bankerTotal: revealCount >= table.dealSequence.length && table.outcome ? table.outcome.bankerTotal : null,
    outcome: table.phase === "result" ? table.outcome : null,
    cardsRemaining: table.shoe.length,
    shoeSize: table.shoeSize,
    history: table.history,
    recentBets: table.recentBets
  };
}
