import WebSocket from "ws";

const endpoint = process.env.MOTION_WS || "ws://127.0.0.1:5188/ws";
const targetName = process.env.MOTION_TARGET || "QualityQA";
const ws = new WebSocket(endpoint);
const state = { id: "", snapshots: [] };

const send = (payload) => ws.send(JSON.stringify(payload));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const latestSnapshot = () => state.snapshots.at(-1);
const latestPlayer = (id) => latestSnapshot()?.players?.find((player) => player.id === id);

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
  await waitFor(() => latestPlayer(state.id), "motion probe spawn");
  let cursor = latestPlayer(state.id);
  for (const waypoint of waypoints) {
    while (Math.hypot(waypoint.x - cursor.x, waypoint.z - cursor.z) > 0.45) {
      const distance = Math.hypot(waypoint.x - cursor.x, waypoint.z - cursor.z);
      const step = Math.min(1.35, distance);
      cursor = {
        ...cursor,
        x: cursor.x + (waypoint.x - cursor.x) / distance * step,
        z: cursor.z + (waypoint.z - cursor.z) / distance * step
      };
      send({ type: "state", x: cursor.x, y: 1.6, z: cursor.z, yaw: 0, pitch: 0 });
      await delay(88);
    }
    await waitFor(() => {
      const player = latestPlayer(state.id);
      return player && Math.hypot(player.x - waypoint.x, player.z - waypoint.z) < 0.95;
    }, `motion probe reaches ${waypoint.x},${waypoint.z}`);
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
});

await new Promise((resolve, reject) => {
  ws.once("open", resolve);
  ws.once("error", reject);
});
send({ type: "join", name: "MotionRunner", room: "DONPCH", gameMode: "practice", team: "red", cpuFill: false, relationMode: "versus" });
await waitFor(() => state.id && latestSnapshot()?.players?.some((player) => player.name === targetName), `target ${targetName}`);
send({ type: "change_team", targetId: state.id, team: "red" });
await waitFor(() => latestPlayer(state.id)?.color === "red", "motion probe changes to red team");

await moveAlong([
  { x: 32, z: -16 },
  { x: 32, z: -46 },
  { x: -66, z: -46 },
  { x: -66, z: 10 },
  { x: -44, z: 10 },
  { x: -44, z: 16 }
]);

console.log(`MOTION_PROBE_READY target=${targetName}; press Enter to run`);
await new Promise((resolve) => process.stdin.once("data", resolve));
process.stdin.pause();

for (let frame = 0; frame < 84; frame += 1) {
  const target = latestSnapshot()?.players?.find((player) => player.name === targetName);
  const x = -44 + Math.sin(frame * 0.19) * 2.4;
  const z = 16 + Math.cos(frame * 0.19) * 1.15;
  const yaw = target ? Math.atan2(target.x - x, target.z - z) : 0;
  send({ type: "state", x, y: 1.6, z, yaw, pitch: 0 });
  await delay(88);
}

console.log("MOTION_PROBE_DONE");
send({ type: "leave" });
await delay(80);
ws.close(1000, "leave");
