import WebSocket from "ws";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

let endpoint = process.env.SMOKE_WS || "";
let managedServer = null;
let managedServerOutput = "";

async function startManagedServer() {
  if (endpoint) return;
  const port = 50_000 + Math.floor(Math.random() * 1_000);
  endpoint = `ws://127.0.0.1:${port}/ws`;
  managedServer = spawn(process.execPath, ["server.mjs"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "production",
      DONPACHI_ACCOUNT_SECRET: "smoke-test-account-secret-2026"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  managedServer.stdout.on("data", (chunk) => {
    managedServerOutput += String(chunk);
  });
  managedServer.stderr.on("data", (chunk) => {
    managedServerOutput += String(chunk);
  });

  const healthUrl = `http://127.0.0.1:${port}/health`;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 7_000) {
    if (managedServer.exitCode !== null) {
      throw new Error(`smoke server exited early\n${managedServerOutput}`);
    }
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
    } catch {
      // The listener may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`timeout starting smoke server\n${managedServerOutput}`);
}

async function stopManagedServer() {
  if (!managedServer || managedServer.exitCode !== null) return;
  managedServer.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => managedServer.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 1_000))
  ]);
  if (managedServer.exitCode === null) managedServer.kill("SIGKILL");
}

function openClient(name, room = "", options = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(endpoint);
    const state = { name, id: "", room: "", resumeToken: "", resumed: false, snapshots: [], respawns: [], hits: [], shots: [], teamPings: [], movementCorrections: [], errors: [] };
    const timeout = setTimeout(() => reject(new Error(`timeout joining ${name}`)), 5000);

    ws.on("open", () => ws.send(JSON.stringify({ type: "join", name, room, ...options })));
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "welcome") {
        state.id = message.id;
        state.room = message.room;
        state.resumeToken = message.resumeToken || "";
        state.resumed = Boolean(message.resumed);
        clearTimeout(timeout);
        resolve({ ws, state });
      }
      if (message.type === "snapshot") state.snapshots.push(message);
      if (message.type === "respawn") state.respawns.push(message);
      if (message.type === "hit") state.hits.push(message);
      if (message.type === "shot") state.shots.push(message);
      if (message.type === "team_ping") state.teamPings.push(message.ping);
      if (message.type === "movement_correction") state.movementCorrections.push(message);
      if (message.type === "error") state.errors.push(message.message);
    });
    ws.on("error", reject);
  });
}

function waitFor(predicate, label, timeoutMs = 5000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error(`timeout: ${label}`));
      }
    }, 50);
  });
}

function send(ws, payload) {
  ws.send(JSON.stringify(payload));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function latestSnapshot(client) {
  return client.state.snapshots.at(-1);
}

function latestPlayer(client, playerId) {
  return latestSnapshot(client)?.players?.find((player) => player.id === playerId);
}

async function moveAlong(client, playerId, waypoints, label) {
  await waitFor(() => latestPlayer(client, playerId), `${label} initial position`, 6000);
  let cursor = latestPlayer(client, playerId);
  for (const waypoint of waypoints) {
    while (Math.hypot(waypoint.x - cursor.x, waypoint.z - cursor.z) > 0.55) {
      const distance = Math.hypot(waypoint.x - cursor.x, waypoint.z - cursor.z);
      const step = Math.min(1.5, distance);
      cursor = {
        ...cursor,
        x: cursor.x + (waypoint.x - cursor.x) / distance * step,
        z: cursor.z + (waypoint.z - cursor.z) / distance * step
      };
      send(client.ws, { type: "state", x: cursor.x, y: 1.6, z: cursor.z, yaw: 0, pitch: 0 });
      await delay(86);
    }
    await waitFor(() => {
      const player = latestPlayer(client, playerId);
      return player && Math.hypot(player.x - waypoint.x, player.z - waypoint.z) < 1.05;
    }, `${label} reaches ${waypoint.x},${waypoint.z}`, 5000);
    cursor = latestPlayer(client, playerId);
  }
}

function testRoomCode() {
  return `T${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
}

async function shootUntilHit(shooter, targetId, label) {
  const started = Date.now();
  while (Date.now() - started < 7000) {
    send(shooter.ws, {
      type: "shoot",
      origin: { x: -36, y: 1.6, z: 16 },
      direction: { x: -1, y: 0, z: 0 },
      weapon: "rifle"
    });
    try {
      await waitFor(
        () => shooter.state.hits?.some((hit) => hit.target === targetId && hit.damage === 35 && hit.hitZone === "head" && hit.headshot),
        label,
        450
      );
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
  }
  throw new Error(`timeout: ${label}`);
}

try {
await startManagedServer();

const vacated = await openClient("SpawnVacated", "", { cpuFill: false });
const keeper = await openClient("SpawnKeeper", vacated.state.room, { cpuFill: false });
await waitFor(
  () => latestSnapshot(keeper)?.players?.some((player) => player.id === vacated.state.id),
  "spawn keeper sees the first player"
);
send(vacated.ws, { type: "leave" });
await delay(80);
vacated.ws.close(1000, "leave");
await waitFor(
  () => latestSnapshot(keeper)?.players?.every((player) => player.id !== vacated.state.id),
  "vacated spawn is removed"
);
const replacement = await openClient("SpawnReplacement", keeper.state.room, { cpuFill: false });
await waitFor(
  () => latestPlayer(keeper, replacement.state.id) && latestPlayer(keeper, keeper.state.id),
  "replacement spawn is synchronized"
);
const keeperSpawn = latestPlayer(keeper, keeper.state.id);
const replacementSpawn = latestPlayer(keeper, replacement.state.id);
if (Math.hypot(keeperSpawn.x - replacementSpawn.x, keeperSpawn.z - replacementSpawn.z) < 2.15) {
  throw new Error("replacement reused an occupied spawn slot");
}
for (const client of [keeper, replacement]) send(client.ws, { type: "leave" });
await delay(80);
for (const client of [keeper, replacement]) client.ws.close(1000, "leave");

const roomCode = testRoomCode();
const alpha = await openClient("Alpha", roomCode, { cpuFill: false });
const beta = await openClient("Beta", alpha.state.room, { cpuFill: false });
let gamma = await openClient("Gamma", alpha.state.room, { cpuFill: false });

await waitFor(
  () => alpha.state.snapshots.some((snapshot) =>
    snapshot.players?.some((player) => player.name === "Alpha") &&
    snapshot.players?.some((player) => player.name === "Beta") &&
    snapshot.players?.some((player) => player.name === "Gamma") &&
    !snapshot.players?.some((player) => /^(CPU|CP)-/.test(String(player.name || "")))
  ) &&
    beta.state.snapshots.some((snapshot) =>
      snapshot.players?.some((player) => player.name === "Alpha") &&
      snapshot.players?.some((player) => player.name === "Beta") &&
      snapshot.players?.some((player) => player.name === "Gamma") &&
      !snapshot.players?.some((player) => /^(CPU|CP)-/.test(String(player.name || "")))
    ) &&
    gamma.state.snapshots.some((snapshot) =>
      snapshot.players?.some((player) => player.name === "Alpha") &&
      snapshot.players?.some((player) => player.name === "Beta") &&
      snapshot.players?.some((player) => player.name === "Gamma") &&
      !snapshot.players?.some((player) => /^(CPU|CP)-/.test(String(player.name || "")))
    ),
  "three clients see each other without CP fill"
);

for (const client of [alpha, beta, gamma]) send(client.ws, { type: "ready", ready: true });
await waitFor(
  () => [alpha, beta, gamma].every((client) => latestSnapshot(client)?.matchPhase === "active" && latestSnapshot(client)?.matchStarted === true),
  "three ready clients enter active combat",
  7000
);

await waitFor(
  () => [alpha, beta, gamma].every((client) =>
    latestSnapshot(client)?.vehicles?.length === 4 &&
    latestSnapshot(client)?.vehicles?.every((vehicle) => vehicle.health === 600 && vehicle.maxHealth === 600) &&
    latestSnapshot(client)?.safeZone?.enabled === true &&
    latestSnapshot(client)?.safeZone?.stage === "waiting"
  ),
  "clients receive shared vehicle durability and safe-zone state"
);

const gammaBeforeWarp = latestPlayer(gamma, gamma.state.id);
send(gamma.ws, {
  type: "state",
  x: gammaBeforeWarp.x + 90,
  y: 80,
  z: gammaBeforeWarp.z + 90,
  yaw: Math.PI * 13,
  pitch: 0
});
await waitFor(() => gamma.state.movementCorrections.length > 0, "server returns an authoritative movement correction");
await waitFor(() => {
  const corrected = latestPlayer(alpha, gamma.state.id);
  return corrected && corrected.lastSeen > gammaBeforeWarp.lastSeen;
}, "corrected movement reaches peers");
const gammaAfterWarp = latestPlayer(alpha, gamma.state.id);
if (Math.hypot(gammaAfterWarp.x - gammaBeforeWarp.x, gammaAfterWarp.z - gammaBeforeWarp.z) > 6.3) {
  throw new Error("server accepted an excessive horizontal warp");
}
if (gammaAfterWarp.y - gammaBeforeWarp.y > 6.3) throw new Error("server accepted an excessive vertical warp");
if (gammaAfterWarp.yaw < -Math.PI || gammaAfterWarp.yaw >= Math.PI) throw new Error("server did not normalize player yaw");

send(alpha.ws, { type: "team_ping", point: { x: 6, y: 0.1, z: 6 } });
await waitFor(
  () => alpha.state.teamPings.length > 0 && gamma.state.teamPings.length > 0,
  "same-team clients receive a shared ping"
);
await delay(420);
if (beta.state.teamPings.length > 0) throw new Error("enemy client received a team-only ping");

const gammaTeamBefore = latestPlayer(alpha, gamma.state.id).color;
send(beta.ws, { type: "change_team", targetId: gamma.state.id, team: gammaTeamBefore === "blue" ? "red" : "blue" });
await waitFor(() => beta.state.errors.includes("他プレイヤーのチーム変更はホストのみ可能です。"), "non-host team edit is rejected");
await delay(180);
if (latestPlayer(alpha, gamma.state.id).color !== gammaTeamBefore) throw new Error("non-host changed another player's team");

const gammaIdBeforeReconnect = gamma.state.id;
const gammaResumeToken = gamma.state.resumeToken;
if (!gammaResumeToken) throw new Error("server did not issue a resume token");
gamma.ws.close();
await waitFor(
  () => latestSnapshot(alpha)?.players?.some((player) => player.id === gammaIdBeforeReconnect && player.connected === false),
  "disconnected player enters reconnect grace"
);
gamma = await openClient("Gamma", alpha.state.room, { cpuFill: false, resumeToken: gammaResumeToken });
if (!gamma.state.resumed) throw new Error("reconnect did not report a resumed session");
if (gamma.state.id !== gammaIdBeforeReconnect) throw new Error("reconnect changed the player id");
await waitFor(
  () => latestSnapshot(alpha)?.players?.some((player) => player.id === gammaIdBeforeReconnect && player.connected === true),
  "resumed player becomes connected"
);
const resumedGamma = latestPlayer(alpha, gammaIdBeforeReconnect);
if ((resumedGamma?.spawnProtectedUntil || 0) > Date.now() + 3_000) {
  throw new Error("reconnect granted excessive spawn protection");
}

await moveAlong(beta, beta.state.id, [
  { x: 32, z: -16 },
  { x: 32, z: -46 },
  { x: -66, z: -46 },
  { x: -66, z: -38 }
], "target route to roadster");

send(beta.ws, { type: "vehicle_enter", vehicleId: "roadster-west" });
await waitFor(
  () => latestPlayer(beta, beta.state.id)?.vehicleId === "roadster-west",
  "target enters roadster"
);

send(alpha.ws, { type: "vehicle_enter", vehicleId: "roadster-west" });
await delay(350);
if (latestPlayer(alpha, alpha.state.id)?.vehicleId) throw new Error("occupied roadster accepted a second driver");

const vehicleBefore = latestSnapshot(beta).vehicles.find((vehicle) => vehicle.id === "roadster-west");
for (let i = 0; i < 9; i += 1) {
  send(beta.ws, { type: "vehicle_input", throttle: 1, steer: 0, braking: false });
  await delay(95);
}
await waitFor(() => {
  const vehicle = latestSnapshot(beta)?.vehicles?.find((item) => item.id === "roadster-west");
  return vehicle && Math.hypot(vehicle.x - vehicleBefore.x, vehicle.z - vehicleBefore.z) > 0.65;
}, "roadster movement is server synchronized");

const vehicleBeforeRightTurn = latestSnapshot(beta).vehicles.find((vehicle) => vehicle.id === "roadster-west");
for (let i = 0; i < 8; i += 1) {
  send(beta.ws, { type: "vehicle_input", throttle: 1, steer: 1, braking: false });
  await delay(95);
}
await waitFor(() => {
  const vehicle = latestSnapshot(beta)?.vehicles?.find((item) => item.id === "roadster-west");
  if (!vehicle) return false;
  const yawDelta = Math.atan2(Math.sin(vehicle.yaw - vehicleBeforeRightTurn.yaw), Math.cos(vehicle.yaw - vehicleBeforeRightTurn.yaw));
  return yawDelta < -0.08;
}, "right input turns roadster right");

const shotsBeforeVehicleFire = beta.state.shots.length;
const vehicleHealthBeforeDriverFire = latestSnapshot(beta).vehicles.find((vehicle) => vehicle.id === "roadster-west").health;
const betaInVehicle = latestPlayer(beta, beta.state.id);
send(beta.ws, {
  type: "shoot",
  origin: { x: betaInVehicle.x, y: betaInVehicle.y, z: betaInVehicle.z },
  direction: { x: 0, y: 0, z: -1 },
  weapon: "rifle"
});
await waitFor(
  () => beta.state.shots.slice(shotsBeforeVehicleFire).some((shot) => shot.shooter === beta.state.id),
  "driver can fire from roadster"
);
await delay(180);
const vehicleHealthAfterDriverFire = latestSnapshot(beta).vehicles.find((vehicle) => vehicle.id === "roadster-west").health;
if (vehicleHealthAfterDriverFire !== vehicleHealthBeforeDriverFire) throw new Error("driver shot damaged its own roadster");

send(beta.ws, { type: "vehicle_exit" });
await waitFor(() => !latestPlayer(beta, beta.state.id)?.vehicleId, "target exits roadster");

const damagedVehicleBefore = latestSnapshot(beta).vehicles.find((vehicle) => vehicle.id === "roadster-west");
const betaAfterExit = latestPlayer(beta, beta.state.id);
const vehicleShotDirection = {
  x: damagedVehicleBefore.x - betaAfterExit.x,
  y: 0.86 - betaAfterExit.y,
  z: damagedVehicleBefore.z - betaAfterExit.z
};
const vehicleShotLength = Math.hypot(vehicleShotDirection.x, vehicleShotDirection.y, vehicleShotDirection.z) || 1;
send(beta.ws, {
  type: "shoot",
  origin: { x: betaAfterExit.x, y: betaAfterExit.y, z: betaAfterExit.z },
  direction: {
    x: vehicleShotDirection.x / vehicleShotLength,
    y: vehicleShotDirection.y / vehicleShotLength,
    z: vehicleShotDirection.z / vehicleShotLength
  },
  weapon: "rifle"
});
await waitFor(
  () => latestSnapshot(beta)?.vehicles?.find((vehicle) => vehicle.id === "roadster-west")?.health < damagedVehicleBefore.health,
  "roadster takes server-authoritative weapon damage"
);

await moveAlong(beta, beta.state.id, [
  { x: -66, z: 10 },
  { x: -44, z: 10 },
  { x: -44, z: 16 }
], "target route to firing lane");

await waitFor(
  () => {
    const player = latestPlayer(alpha, beta.state.id);
    return player && Math.hypot(player.x + 44, player.z - 16) < 1.05;
  },
  "server receives target position"
);

const historicalSnapshot = latestSnapshot(alpha);
const historicalViewedAt = historicalSnapshot.now;
const hitsBeforeRewindShot = alpha.state.hits.length;
send(beta.ws, { type: "state", x: -44, y: 1.6, z: 18, yaw: 0, pitch: 0 });
await waitFor(
  () => {
    const player = latestPlayer(alpha, beta.state.id);
    return player && Math.hypot(player.x + 44, player.z - 18) < 0.8;
  },
  "target moves away from historical sight line"
);
send(alpha.ws, {
  type: "shoot",
  viewedAt: historicalViewedAt,
  origin: { x: -36, y: 1.6, z: 16 },
  direction: { x: -1, y: 0, z: 0 },
  weapon: "rifle"
});
await waitFor(
  () => alpha.state.hits.slice(hitsBeforeRewindShot).some((hit) => hit.target === beta.state.id && hit.damage === 35 && hit.hitZone === "head" && hit.headshot),
  "bounded lag compensation resolves the historical hit"
);
send(beta.ws, { type: "state", x: -44, y: 1.6, z: 16, yaw: 0, pitch: 0 });
await waitFor(
  () => {
    const player = latestPlayer(alpha, beta.state.id);
    return player && Math.hypot(player.x + 44, player.z - 16) < 0.8;
  },
  "target returns to firing lane"
);

await shootUntilHit(alpha, beta.state.id, "server resolves a hit");

await delay(180);
for (let i = 0; i < 8; i += 1) {
  send(alpha.ws, {
    type: "shoot",
    origin: { x: -36, y: 1.6, z: 16 },
    direction: { x: -1, y: 0, z: 0 },
    weapon: "rifle"
  });
  await delay(180);
}

await waitFor(
  () => beta.state.snapshots.some((snapshot) =>
    snapshot.players?.some((player) => player.name === "Beta" && player.health === 0 && player.eliminated)
  ),
  "target is eliminated in one-life mode"
);
const appliedPlayerDamage = alpha.state.hits
  .filter((hit) => hit.target === beta.state.id && !hit.blocked)
  .reduce((total, hit) => total + Number(hit.damage || 0), 0);
if (appliedPlayerDamage !== 200) throw new Error(`reported applied damage must equal target health, received ${appliedPlayerDamage}`);

for (const client of [alpha, beta, gamma]) send(client.ws, { type: "leave" });
await delay(80);
for (const client of [alpha, beta, gamma]) client.ws.close(1000, "leave");
console.log(`smoke passed: room ${alpha.state.room}, occupied spawn reuse prevented, movement warp corrected, yaw normalized, team edits protected, reconnect resumed, lag-compensated headshot resolved, applied damage capped at 200, team ping isolated, safe zone synced, roadster driven/right-steered/fired/damaged`);
} finally {
  await stopManagedServer();
}
