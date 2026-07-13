import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { settleBaccaratBets } from "../baccarat-systems.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = 59_000 + Math.floor(Math.random() * 700);
const endpoint = `ws://127.0.0.1:${port}/ws`;
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

function openClient(name, guestToken) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(endpoint);
    const state = { welcome: null, snapshots: [], errors: [] };
    const timeout = setTimeout(() => reject(new Error(`timeout joining ${name}`)), 6000);
    ws.on("open", () => ws.send(JSON.stringify({ type: "baccarat_join", name, guestToken })));
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

const latest = (client) => client.state.snapshots.at(-1);
const send = (client, payload) => client.ws.send(JSON.stringify(payload));

try {
  await waitFor(() => serverOutput.includes("listening") || serverOutput.includes(String(port)), "baccarat server start");
  const alpha = await openClient("BaccaratAlpha", `alpha-${process.pid}-wallet`);
  const beta = await openClient("BaccaratBeta", `beta-${process.pid}-wallet`);

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

  for (const client of [alpha, beta]) {
    send(client, { type: "baccarat_leave" });
    client.ws.close(1000, "leave");
  }
  console.log(`baccarat live passed: two players shared DONBAC, locked server bets, revealed one outcome, and settled balances (${alphaResult.outcome.winner})`);
} finally {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("exit", resolve)), delay(1000)]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
}
