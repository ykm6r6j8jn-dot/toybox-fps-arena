import WebSocket from "ws";

const endpoint = process.env.COMBAT_WS || "ws://127.0.0.1:5188/ws";
const targetName = process.env.COMBAT_TARGET || "FixTest";
const ws = new WebSocket(endpoint);
const state = { id: "", snapshots: [], hits: [] };

function send(payload) {
  ws.send(JSON.stringify(payload));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function latestSnapshot() {
  return state.snapshots.at(-1);
}

function latestPlayer(id) {
  return latestSnapshot()?.players?.find((player) => player.id === id);
}

function waitFor(predicate, label, timeoutMs = 8000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(timer);
        reject(new Error(`timeout: ${label}`));
      }
    }, 50);
  });
}

async function moveAlong(waypoints) {
  await waitFor(() => latestPlayer(state.id), "probe spawn");
  let cursor = latestPlayer(state.id);
  for (const waypoint of waypoints) {
    while (Math.hypot(waypoint.x - cursor.x, waypoint.z - cursor.z) > 0.55) {
      const distance = Math.hypot(waypoint.x - cursor.x, waypoint.z - cursor.z);
      const step = Math.min(1.5, distance);
      cursor = {
        ...cursor,
        x: cursor.x + (waypoint.x - cursor.x) / distance * step,
        z: cursor.z + (waypoint.z - cursor.z) / distance * step
      };
      send({ type: "state", x: cursor.x, y: 1.6, z: cursor.z, yaw: 0, pitch: 0 });
      await delay(86);
    }
    await waitFor(() => {
      const probe = latestPlayer(state.id);
      return probe && Math.hypot(probe.x - waypoint.x, probe.z - waypoint.z) < 1.05;
    }, `probe reaches ${waypoint.x},${waypoint.z}`);
    cursor = latestPlayer(state.id);
  }
}

ws.on("message", (raw) => {
  const message = JSON.parse(String(raw));
  if (message.type === "welcome") state.id = message.id;
  if (message.type === "snapshot") {
    state.snapshots.push(message);
    if (state.snapshots.length > 8) state.snapshots.shift();
  }
  if (message.type === "hit") state.hits.push(message);
});

await new Promise((resolve, reject) => {
  ws.once("open", resolve);
  ws.once("error", reject);
});
send({
  type: "join",
  name: "CombatProbe",
  room: "DONPCH",
  gameMode: "practice",
  team: "red",
  cpuFill: false,
  relationMode: "versus"
});
await waitFor(() => state.id && latestSnapshot()?.players?.some((player) => player.name === targetName), `target ${targetName}`);

await moveAlong([
  { x: 32, z: -16 },
  { x: 32, z: -46 },
  { x: -66, z: -46 },
  { x: -66, z: 10 },
  { x: -44, z: 10 },
  { x: -44, z: 16 }
]);

console.log(`COMBAT_PROBE_READY target=${targetName}; press Enter to fire`);
await new Promise((resolve) => process.stdin.once("data", resolve));
process.stdin.pause();

const target = latestSnapshot().players.find((player) => player.name === targetName);
const probe = latestPlayer(state.id);
if (!target || !probe) throw new Error("target or probe disappeared before firing");
const direction = { x: target.x - probe.x, y: target.y - probe.y, z: target.z - probe.z };
const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
const hitsBefore = state.hits.length;
for (let pellet = 0; pellet < 3; pellet += 1) {
  send({
    type: "shoot",
    origin: { x: probe.x, y: probe.y, z: probe.z },
    direction: { x: direction.x / length, y: direction.y / length, z: direction.z / length },
    weapon: "type95"
  });
  await delay(18);
}

await waitFor(() => {
  const hits = state.hits.slice(hitsBefore).filter((hit) => hit.target === target.id && hit.hitZone === "head");
  return hits.reduce((total, hit) => total + Number(hit.damage || 0), 0) >= 75;
}, "three-point headshot burst");
const burstHits = state.hits.slice(hitsBefore).filter((hit) => hit.target === target.id && hit.hitZone === "head");
console.log(`COMBAT_PROBE_FIRED hits=${burstHits.length} damage=${burstHits.reduce((total, hit) => total + Number(hit.damage || 0), 0)}`);
await delay(2400);
send({ type: "leave" });
await delay(80);
ws.close(1000, "leave");
