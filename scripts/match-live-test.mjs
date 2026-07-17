import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = 58_000 + Math.floor(Math.random() * 1_000);
const endpoint = `ws://127.0.0.1:${port}/ws`;
let serverOutput = "";
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: "production",
    DONPACHI_PROFILE_STORE: `/tmp/donpachi-match-test-${process.pid}.json`,
    DONPACHI_ACCOUNT_SECRET: "match-live-test-account-secret-2026"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, label, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return;
    await delay(55);
  }
  throw new Error(`timeout: ${label}\n${serverOutput}`);
}

async function openClient(name, options = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(endpoint);
    const state = { id: "", snapshots: [], shots: [], respawns: [], errors: [] };
    const timeout = setTimeout(() => reject(new Error(`timeout joining ${name}`)), 6000);
    ws.on("open", () => ws.send(JSON.stringify({
      type: "join",
      name,
      gameMode: "oneLife",
      cpuFill: true,
      relationMode: "versus",
      ...options
    })));
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "welcome") {
        state.id = message.id;
        clearTimeout(timeout);
        resolve({ ws, state });
      } else if (message.type === "snapshot") {
        state.snapshots.push(message);
        if (state.snapshots.length > 240) state.snapshots.shift();
      } else if (message.type === "shot") {
        state.shots.push(message);
      } else if (message.type === "respawn") {
        state.respawns.push(message);
      } else if (message.type === "error") {
        state.errors.push(String(message.message || ""));
      }
    });
    ws.on("error", reject);
  });
}

const latest = (client) => client.state.snapshots.at(-1);
const send = (client, payload) => client.ws.send(JSON.stringify(payload));

try {
  await waitFor(async () => {
    try {
      return (await fetch(`http://127.0.0.1:${port}/health`)).ok;
    } catch {
      return false;
    }
  }, "match server start");

  const alpha = await openClient("MatchAlpha");
  await waitFor(() => {
    const snapshot = latest(alpha);
    return snapshot?.matchVersion === "MATCH 5.0"
      && snapshot.matchPhase === "waiting"
      && snapshot.matchStarted === false
      && snapshot.humanCount === 1
      && snapshot.minimumHumans === 1
      && snapshot.players?.length === 14;
  }, "server-owned warmup with CPU fill");

  const waitingSnapshot = latest(alpha);
  const waitingBots = new Map(waitingSnapshot.players.filter((player) => player.isBot).map((player) => [player.id, { x: player.x, y: player.y, z: player.z }]));
  const shotsBeforeWarmupProbe = alpha.state.shots.length;
  const me = waitingSnapshot.players.find((player) => player.id === alpha.state.id);
  send(alpha, {
    type: "shoot",
    weapon: "rifle",
    origin: { x: me.x, y: me.y, z: me.z },
    direction: { x: 1, y: 0, z: 0 }
  });
  await delay(420);
  assert.equal(alpha.state.shots.length, shotsBeforeWarmupProbe, "warmup fire must not reach peers");
  const afterWarmupProbe = latest(alpha);
  for (const bot of afterWarmupProbe.players.filter((player) => player.isBot)) {
    const before = waitingBots.get(bot.id);
    assert.ok(before, `missing warmup bot ${bot.id}`);
    assert.ok(Math.hypot(bot.x - before.x, bot.y - before.y, bot.z - before.z) < 0.04, `warmup bot ${bot.id} moved`);
  }

  send(alpha, { type: "ready", ready: true });
  await waitFor(() => latest(alpha)?.matchPhase === "countdown" && latest(alpha)?.readyHumans === 1, "ready accelerates countdown");
  const countdownEndsAt = latest(alpha).phaseEndsAt;
  assert.ok(countdownEndsAt > Date.now());

  await waitFor(() => latest(alpha)?.matchPhase === "active" && latest(alpha)?.matchStarted === true, "countdown starts combat", 6500);
  const activeSnapshot = latest(alpha);
  assert.ok(activeSnapshot.roundStartedAt > 0);
  assert.equal(activeSnapshot.readyHumans, 0);
  assert.equal(activeSnapshot.safeZone.enabled, true);
  assert.ok(alpha.state.respawns.length > 0, "match start must authoritatively respawn the player");

  const activePlayer = activeSnapshot.players.find((player) => player.id === alpha.state.id);
  const shotsBeforeActiveProbe = alpha.state.shots.length;
  send(alpha, {
    type: "shoot",
    weapon: "rifle",
    origin: { x: activePlayer.x, y: activePlayer.y, z: activePlayer.z },
    direction: { x: 1, y: 0, z: 0 }
  });
  await waitFor(() => alpha.state.shots.length > shotsBeforeActiveProbe, "active combat emits shots");

  send(alpha, { type: "set_cpu", count: 0 });
  await waitFor(() => {
    const snapshot = latest(alpha);
    return snapshot?.matchPhase === "waiting"
      && snapshot.matchStarted === false
      && snapshot.cpuFill === false
      && snapshot.minimumHumans === 2
      && snapshot.humanCount === 1
      && snapshot.phaseEndsAt === 0
      && snapshot.players?.every((player) => !player.isBot);
  }, "CPU-free mode waits for a real opponent");

  send(alpha, { type: "ready", ready: true });
  await delay(220);
  assert.equal(latest(alpha).matchPhase, "waiting", "one ready human cannot start a CPU-free match");

  const beta = await openClient("MatchBeta", { cpuFill: false });
  await waitFor(() => latest(alpha)?.humanCount === 2 && latest(alpha)?.minimumHumans === 2, "second human satisfies CPU-free threshold");
  send(beta, { type: "ready", ready: true });
  await waitFor(() => latest(alpha)?.matchPhase === "countdown" && latest(alpha)?.readyHumans === 2, "two ready humans start CPU-free countdown");

  for (const client of [alpha, beta]) send(client, { type: "leave" });
  await delay(100);
  for (const client of [alpha, beta]) client.ws.close(1000, "leave");
  console.log("match live passed: warmup froze CPs and blocked shots, ready accelerated countdown, active combat respawned and fired, CPU-free mode required two humans");
} finally {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      delay(1000)
    ]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
}
