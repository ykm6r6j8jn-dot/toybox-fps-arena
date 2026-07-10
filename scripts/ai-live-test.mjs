import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const port = 49_152 + Math.floor(Math.random() * 8_000);
const root = fileURLToPath(new URL("..", import.meta.url));
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), NODE_ENV: process.env.AI_TEST_NODE_ENV || "test" },
  stdio: ["ignore", "pipe", "pipe"]
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });

const healthUrl = `http://127.0.0.1:${port}/health`;
const endpoint = `ws://127.0.0.1:${port}/ws`;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, label, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return;
    await delay(60);
  }
  throw new Error(`timeout: ${label}`);
}

async function stopServer() {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    delay(1000)
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

let ws;
try {
  await waitFor(async () => {
    try {
      return (await fetch(healthUrl)).ok;
    } catch {
      return false;
    }
  }, "AI test server start", 7000);

  const snapshots = [];
  const shots = [];
  const welcome = await new Promise((resolve, reject) => {
    ws = new WebSocket(endpoint);
    const timeout = setTimeout(() => reject(new Error("timeout joining AI room")), 5000);
    ws.on("open", () => ws.send(JSON.stringify({
      type: "join",
      name: "AiObserver",
      gameMode: "practice",
      partySize: 1,
      cpuFill: true,
      relationMode: "coop"
    })));
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "welcome") {
        clearTimeout(timeout);
        resolve(message);
      }
      if (message.type === "snapshot") snapshots.push(message);
      if (message.type === "shot") shots.push(message);
    });
    ws.on("error", reject);
  });

  await waitFor(() => snapshots.some((snapshot) => snapshot.players?.filter((player) => player.isBot).length === 19), "19 tactical CPs", 8000);
  await delay(8000);
  const tacticalSnapshots = snapshots.filter((snapshot) => snapshot.aiVersion === "TACTICS 2.0");
  assert.ok(tacticalSnapshots.length >= 20, "server must continuously publish tactical snapshots");
  const latest = tacticalSnapshots.at(-1);
  const bots = latest.players.filter((player) => player.isBot);
  assert.equal(bots.length, 19);
  assert.deepEqual(new Set(bots.map((bot) => bot.botRole)), new Set(["assault", "support", "flanker", "marksman"]));
  assert.ok(bots.every((bot) => ["patrol", "objective", "zone", "push", "hold", "strafe", "flank", "retreat"].includes(bot.botTactic)));
  assert.ok(tacticalSnapshots.some((snapshot) => snapshot.players.some((player) => player.isBot && player.botTactic !== "patrol")), "at least one CP must enter a combat tactic");

  const tracks = new Map();
  let minimumHumanDistance = Infinity;
  let minimumHumanDistanceAt = null;
  for (const snapshot of tacticalSnapshots) {
    const human = snapshot.players.find((player) => player.id === welcome.id);
    for (const bot of snapshot.players.filter((player) => player.isBot)) {
      if (human) {
        const humanDistance = Math.hypot(bot.x - human.x, bot.z - human.z);
        if (humanDistance < minimumHumanDistance) {
          minimumHumanDistance = humanDistance;
          minimumHumanDistanceAt = { botId: bot.id, elapsedMs: snapshot.now - tacticalSnapshots[0].now };
        }
      }
      const previous = tracks.get(bot.id);
      if (previous) {
        const elapsed = Math.max(0.001, (snapshot.now - previous.now) / 1000);
        const speed = Math.hypot(bot.x - previous.x, bot.z - previous.z) / elapsed;
        assert.ok(speed <= 11.5, `CP ${bot.id} exceeded tactical movement budget: ${speed.toFixed(2)}m/s`);
      }
      tracks.set(bot.id, { x: bot.x, z: bot.z, now: snapshot.now });
    }
  }
  assert.ok([...tracks.values()].length === 19);
  assert.ok(minimumHumanDistance >= 2, `CP crossed the first-person safety radius: ${minimumHumanDistance.toFixed(2)}m ${JSON.stringify(minimumHumanDistanceAt)}`);
  assert.ok(tacticalSnapshots.some((snapshot, index) => {
    if (index < 1) return false;
    const previous = tacticalSnapshots[index - 1];
    return snapshot.players.some((bot) => {
      if (!bot.isBot) return false;
      const old = previous.players.find((player) => player.id === bot.id);
      return old && Math.hypot(bot.x - old.x, bot.z - old.z) > 0.03;
    });
  }), "CPs must move under server authority");

  const healthLatencies = [];
  for (let index = 0; index < 12; index += 1) {
    const startedAt = performance.now();
    const response = await fetch(healthUrl, { cache: "no-store" });
    assert.equal(response.ok, true);
    healthLatencies.push(performance.now() - startedAt);
  }
  assert.ok(Math.max(...healthLatencies) < 250, "19 CPs must not stall the health endpoint");

  ws.send(JSON.stringify({ type: "leave" }));
  await delay(80);
  ws.close(1000, "done");
  console.log(`AI live passed: room ${welcome.room}, 19 CPs, 4 roles, tactical movement, ${shots.length} visible shots, min player gap ${minimumHumanDistance.toFixed(2)}m, max health latency ${Math.max(...healthLatencies).toFixed(1)}ms`);
} catch (error) {
  throw new Error(`${error.message}\n${serverOutput}`);
} finally {
  if (ws?.readyState === WebSocket.OPEN) ws.close(1000, "cleanup");
  await stopServer();
}
