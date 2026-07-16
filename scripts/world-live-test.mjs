import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = 52_000 + Math.floor(Math.random() * 1_000);
const endpoint = `ws://127.0.0.1:${port}/ws`;
let serverOutput = "";
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: "production",
    DONPACHI_PROFILE_STORE: `/tmp/donpachi-world-test-${process.pid}.json`
  },
  stdio: ["ignore", "pipe", "pipe"]
});
server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, label, timeoutMs = 6000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return;
    await delay(45);
  }
  throw new Error(`timeout: ${label}\n${serverOutput}`);
}

async function startServer() {
  await waitFor(async () => {
    try {
      return (await fetch(`http://127.0.0.1:${port}/health`)).ok;
    } catch {
      return false;
    }
  }, "world test server start", 8000);
}

function openClient(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(endpoint);
    const state = { id: "", snapshots: [], impacts: [], corrections: [] };
    const timeout = setTimeout(() => reject(new Error(`timeout joining ${name}`)), 5000);
    ws.on("open", () => ws.send(JSON.stringify({ type: "join", name, cpuFill: false, gameMode: "practice" })));
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "welcome") {
        state.id = message.id;
        clearTimeout(timeout);
        resolve({ ws, state });
      } else if (message.type === "snapshot") {
        state.snapshots.push(message);
        if (state.snapshots.length > 160) state.snapshots.shift();
      } else if (message.type === "impact") {
        state.impacts.push(message);
      } else if (message.type === "movement_correction") {
        state.corrections.push(message);
      }
    });
    ws.on("error", reject);
  });
}

const send = (client, payload) => client.ws.send(JSON.stringify(payload));
const latestSnapshot = (client) => client.state.snapshots.at(-1);
const latestPlayer = (client) => latestSnapshot(client)?.players?.find((player) => player.id === client.state.id);
const latestDoor = (client, id) => latestSnapshot(client)?.doors?.find((door) => door.id === id);

async function moveAlong(client, waypoints) {
  await waitFor(() => latestPlayer(client), "initial player snapshot");
  let cursor = latestPlayer(client);
  for (const waypoint of waypoints) {
    while (Math.hypot(waypoint.x - cursor.x, waypoint.z - cursor.z) > 0.4) {
      const distance = Math.hypot(waypoint.x - cursor.x, waypoint.z - cursor.z);
      const step = Math.min(1.15, distance);
      const requested = {
        x: cursor.x + (waypoint.x - cursor.x) / distance * step,
        z: cursor.z + (waypoint.z - cursor.z) / distance * step
      };
      send(client, { type: "state", x: requested.x, y: 1.6, z: requested.z, yaw: 0, pitch: 0 });
      await delay(92);
      cursor = latestPlayer(client) || { ...cursor, ...requested };
    }
    await waitFor(() => {
      const player = latestPlayer(client);
      return player && Math.hypot(player.x - waypoint.x, player.z - waypoint.z) < 0.95;
    }, `player reaches ${waypoint.x},${waypoint.z}`);
    cursor = latestPlayer(client);
  }
}

try {
  await startServer();
  const alpha = await openClient("WorldAlpha");
  const observer = await openClient("WorldObserver");

  await waitFor(() => [alpha, observer].every((client) => latestSnapshot(client)?.doors?.length === 6), "both clients receive six shared doors");
  for (const client of [alpha, observer]) send(client, { type: "ready", ready: true });
  await waitFor(() => [alpha, observer].every((client) => latestSnapshot(client)?.matchPhase === "active"), "world clients enter active combat", 7000);
  if (latestSnapshot(alpha).doors.some((door) => door.openness !== 0)) throw new Error("doors must begin closed away from players");

  send(alpha, { type: "door_interact", doorId: "metro-entry" });
  await delay(350);
  if (latestDoor(alpha, "metro-entry")?.targetOpen) throw new Error("server accepted a remote door interaction");

  await moveAlong(alpha, [{ x: -44, z: 16 }, { x: -44, z: -10 }, { x: -48, z: -10 }]);
  await waitFor(() => (latestDoor(alpha, "metro-entry")?.openness || 0) < 0.02, "metro door remains closed outside sensor range");
  const shooter = latestPlayer(alpha);
  send(alpha, {
    type: "shoot",
    origin: { x: shooter.x, y: shooter.y, z: shooter.z },
    direction: { x: 0, y: 0, z: -1 },
    weapon: "rifle"
  });
  await waitFor(() => alpha.state.impacts.some((impact) => impact.point?.z < -19.4 && impact.point?.z > -20.05), "closed door blocks the projectile");

  await moveAlong(alpha, [{ x: -48, z: -16.9 }]);
  await waitFor(
    () => (latestDoor(alpha, "metro-entry")?.openness || 0) > 0.72 && (latestDoor(observer, "metro-entry")?.openness || 0) > 0.72,
    "approach opens the same door for all clients"
  );

  send(alpha, { type: "door_interact", doorId: "metro-entry" });
  await moveAlong(alpha, [{ x: -48, z: -10 }]);
  await delay(900);
  if (!latestDoor(alpha, "metro-entry")?.targetOpen) throw new Error("manual interaction did not hold the door open");

  await waitFor(
    () => (latestDoor(alpha, "metro-entry")?.openness ?? 1) < 0.04 && (latestDoor(observer, "metro-entry")?.openness ?? 1) < 0.04,
    "shared door closes after hold expires",
    10_000
  );

  send(alpha, { type: "leave" });
  send(observer, { type: "leave" });
  await delay(80);
  console.log("world live passed: six doors synchronized, remote use rejected, closed projectile blocked, proximity opened, manual hold expired");
} finally {
  if (server.exitCode === null) server.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => server.once("exit", resolve)), delay(1000)]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
