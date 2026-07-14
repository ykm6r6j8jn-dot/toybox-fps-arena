import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { settleBaccaratBets } from "../baccarat-systems.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = 59_000 + Math.floor(Math.random() * 700);
const endpoint = `ws://127.0.0.1:${port}/ws`;
const walletEndpoint = `http://127.0.0.1:${port}/api/wallet`;
const profileEndpoint = `http://127.0.0.1:${port}/api/profile`;
const profileStore = `/tmp/donpachi-baccarat-live-${process.pid}.json`;
let serverOutput = "";
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), NODE_ENV: "production", DONPACHI_PROFILE_STORE: profileStore },
  stdio: ["ignore", "pipe", "pipe"]
});
server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, label, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await delay(55);
  }
  throw new Error(`timeout: ${label}\n${serverOutput}`);
}

function openClient(name, guestToken = "", options = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(endpoint);
    const state = { welcome: null, snapshots: [], errors: [] };
    const timeout = setTimeout(() => reject(new Error(`timeout joining ${name}`)), 6000);
    ws.on("open", () => ws.send(JSON.stringify({ type: "baccarat_join", name, guestToken, ...options })));
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "baccarat_welcome") {
        state.welcome = message;
        clearTimeout(timeout);
        resolve({ ws, state });
      } else if (message.type === "baccarat_snapshot") {
        state.snapshots.push(message);
        if (state.snapshots.length > 180) state.snapshots.shift();
      } else if (message.type === "baccarat_error") {
        state.errors.push(String(message.message || ""));
      }
    });
    ws.on("error", reject);
  });
}

async function initializeWallet(guestToken) {
  const response = await fetch(walletEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ guestToken })
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.scope, "guest");
  assert.equal(payload.balance, 2000);
  assert.equal(payload.guestToken, guestToken);
  return payload;
}

function expectWalletRequired(name, guestToken) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(endpoint);
    const timeout = setTimeout(() => reject(new Error(`timeout rejecting uninitialized wallet ${name}`)), 6000);
    ws.on("open", () => ws.send(JSON.stringify({ type: "baccarat_join", name, guestToken })));
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type !== "baccarat_error") return;
      clearTimeout(timeout);
      ws.close(1000, "expected-rejection");
      resolve(String(message.message || ""));
    });
    ws.on("error", reject);
  });
}

function expectBaccaratError(payload, label) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(endpoint);
    const timeout = setTimeout(() => reject(new Error(`timeout rejecting ${label}`)), 6000);
    ws.on("open", () => ws.send(JSON.stringify({ type: "baccarat_join", ...payload })));
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type !== "baccarat_error") return;
      clearTimeout(timeout);
      ws.close(1000, "expected-rejection");
      resolve(String(message.message || ""));
    });
    ws.on("error", reject);
  });
}

const latest = (client) => client.state.snapshots.at(-1);
const send = (client, payload) => client.ws.send(JSON.stringify(payload));

try {
  await waitFor(() => serverOutput.includes("listening") || serverOutput.includes(String(port)), "baccarat server start");
  const accountLoginId = `Wallet${process.pid}Account`;
  const accountProfileResponse = await fetch(profileEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "create", loginId: accountLoginId, name: "WalletAccount" })
  });
  const accountProfile = await accountProfileResponse.json();
  assert.equal(accountProfileResponse.status, 200);
  assert.equal(accountProfile.profile.inventory.don, 2000, "account creation owns the initial shared Don");
  const accountWalletResponse = await fetch(walletEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ loginId: accountLoginId })
  });
  const accountWallet = await accountWalletResponse.json();
  assert.equal(accountWallet.scope, "account");
  assert.equal(accountWallet.balance, 2000);

  const qaProfileResponse = await fetch(profileEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "create", loginId: "HIDEO0000", name: "ひでお" })
  });
  assert.equal(qaProfileResponse.status, 200);
  const qaDenied = await expectBaccaratError({
    name: "ひでお",
    loginId: accountLoginId,
    qaMode: true
  }, "QA access from a display-name impersonator");
  assert.match(qaDenied, /検証アカウント専用/);

  const qa = await openClient("ひでお", "", { loginId: "HIDEO0000", qaMode: true });
  assert.equal(qa.state.welcome.table, "DONQA");
  assert.equal(qa.state.welcome.qaMode, true);
  assert.equal(qa.state.welcome.walletScope, "qa");
  await waitFor(() => latest(qa)?.phase === "betting" && latest(qa)?.viewer?.chips === 2000, "authorized QA table entry");
  send(qa, { type: "baccarat_action", action: "bet", target: "player", amount: 10 });
  await waitFor(() => latest(qa)?.viewer?.bets?.player === 10 && latest(qa)?.viewer?.chips === 1990, "QA table accepts virtual bet");
  const qaWallet = await fetch(walletEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ loginId: "HIDEO0000" })
  }).then((response) => response.json());
  assert.equal(qaWallet.balance, 2000, "QA table must not alter the shared account wallet");
  send(qa, { type: "baccarat_leave" });
  qa.ws.close(1000, "leave");

  const rejectedMessage = await expectWalletRequired("NoLobbyGrant", `uninitialized-${process.pid}-wallet`);
  assert.match(rejectedMessage, /ロビーで共通Donを同期/);

  const alphaToken = `alpha-${process.pid}-wallet`;
  const betaToken = `beta-${process.pid}-wallet`;
  await initializeWallet(alphaToken);
  await initializeWallet(betaToken);
  const alpha = await openClient("BaccaratAlpha", alphaToken);
  const beta = await openClient("BaccaratBeta", betaToken);
  assert.equal(alpha.state.welcome.walletDon, 2000);
  assert.equal(beta.state.welcome.walletDon, 2000);
  assert.equal("startingDon" in alpha.state.welcome, false, "baccarat welcome must not grant starting chips");

  await waitFor(() => latest(alpha)?.phase === "betting" && latest(alpha)?.participantCount === 2 && latest(beta)?.participantCount === 2, "two players share global table");
  assert.equal(latest(alpha).table, "DONBAC");
  assert.equal(latest(beta).table, "DONBAC");
  assert.equal(latest(alpha).round, latest(beta).round);

  send(alpha, { type: "baccarat_action", action: "bet", target: "player", amount: 100 });
  send(beta, { type: "baccarat_action", action: "bet", target: "banker", amount: 50 });
  await waitFor(() => latest(alpha)?.viewer?.bets?.player === 100 && latest(beta)?.viewer?.bets?.banker === 50, "authoritative bets appear");
  await waitFor(() => latest(alpha)?.betTotals?.player === 100 && latest(alpha)?.betTotals?.banker === 50, "shared table totals appear");
  send(alpha, { type: "baccarat_action", action: "confirm" });
  send(beta, { type: "baccarat_action", action: "confirm" });
  await waitFor(() => latest(alpha)?.viewer?.locked && latest(beta)?.viewer?.locked, "both bets lock");

  await waitFor(() => latest(alpha)?.phase === "result" && latest(beta)?.phase === "result", "shared round settles", 18_000);
  const alphaResult = latest(alpha);
  const betaResult = latest(beta);
  assert.deepEqual(alphaResult.outcome, betaResult.outcome, "all clients must receive the same outcome");
  assert.deepEqual(alphaResult.playerCards, betaResult.playerCards);
  assert.deepEqual(alphaResult.bankerCards, betaResult.bankerCards);
  assert.equal(alphaResult.playerTotal, alphaResult.outcome.playerTotal);
  assert.equal(alphaResult.bankerTotal, alphaResult.outcome.bankerTotal);

  const alphaSettlement = settleBaccaratBets({ player: 100 }, alphaResult.outcome);
  const betaSettlement = settleBaccaratBets({ banker: 50 }, betaResult.outcome);
  assert.equal(alphaResult.viewer.chips, 1900 + alphaSettlement.payout);
  assert.equal(betaResult.viewer.chips, 1950 + betaSettlement.payout);
  assert.equal(alphaResult.viewer.lastNet, alphaSettlement.net);
  assert.equal(betaResult.viewer.lastNet, betaSettlement.net);
  assert.equal(alpha.state.errors.length, 0);
  assert.equal(beta.state.errors.length, 0);

  const alphaWallet = await fetch(walletEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ guestToken: alphaToken })
  }).then((response) => response.json());
  assert.equal(alphaWallet.balance, alphaResult.viewer.chips, "lobby wallet and baccarat result must share one balance");

  for (const client of [alpha, beta]) {
    send(client, { type: "baccarat_leave" });
    client.ws.close(1000, "leave");
  }
  console.log(`baccarat live passed: isolated QA access/wallet rules passed, lobby/account initialized shared Don, direct baccarat grant was rejected, and two players settled one shared balance (${alphaResult.outcome.winner})`);
} finally {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("exit", resolve)), delay(1000)]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
}
