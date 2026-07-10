import WebSocket from "ws";

const endpoint = process.env.SMOKE_WS || "ws://localhost:5188/ws";

function openClient(name, room = "", options = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(endpoint);
    const state = { name, id: "", room: "", snapshots: [], respawns: [], hits: [] };
    const timeout = setTimeout(() => reject(new Error(`timeout joining ${name}`)), 5000);

    ws.on("open", () => ws.send(JSON.stringify({ type: "join", name, room, ...options })));
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "welcome") {
        state.id = message.id;
        state.room = message.room;
        clearTimeout(timeout);
        resolve({ ws, state });
      }
      if (message.type === "snapshot") state.snapshots.push(message);
      if (message.type === "respawn") state.respawns.push(message);
      if (message.type === "hit") state.hits.push(message);
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
        () => shooter.state.hits?.some((hit) => hit.target === targetId && hit.damage === 25),
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

const roomCode = testRoomCode();
const alpha = await openClient("Alpha", roomCode, { cpuFill: false });
const beta = await openClient("Beta", alpha.state.room, { cpuFill: false });

await waitFor(
  () => alpha.state.snapshots.some((snapshot) =>
    snapshot.players?.some((player) => player.name === "Alpha") &&
    snapshot.players?.some((player) => player.name === "Beta") &&
    !snapshot.players?.some((player) => /^(CPU|CP)-/.test(String(player.name || "")))
  ) &&
    beta.state.snapshots.some((snapshot) =>
      snapshot.players?.some((player) => player.name === "Alpha") &&
      snapshot.players?.some((player) => player.name === "Beta") &&
      !snapshot.players?.some((player) => /^(CPU|CP)-/.test(String(player.name || "")))
    ),
  "both clients see each other without CP fill"
);

await waitFor(
  () => latestSnapshot(alpha)?.vehicles?.length === 4 && latestSnapshot(beta)?.vehicles?.length === 4,
  "both clients receive shared vehicles"
);

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

send(beta.ws, { type: "vehicle_exit" });
await waitFor(() => !latestPlayer(beta, beta.state.id)?.vehicleId, "target exits roadster");

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

alpha.ws.close();
beta.ws.close();
console.log(`smoke passed: room ${alpha.state.room}, clients synced, roadster driven, hit resolved`);
