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

function waitFor(predicate, label) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > 5000) {
        clearInterval(timer);
        reject(new Error(`timeout: ${label}`));
      }
    }, 50);
  });
}

function send(ws, payload) {
  ws.send(JSON.stringify(payload));
}

const alpha = await openClient("Alpha", "", { cpuFill: false });
const beta = await openClient("Beta", alpha.state.room, { cpuFill: false });

send(alpha.ws, { type: "state", x: 24, y: 1.6, z: 24, yaw: 0, pitch: 0 });
send(beta.ws, { type: "state", x: 24, y: 1.6, z: 18, yaw: Math.PI, pitch: 0 });

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

await new Promise((resolve) => setTimeout(resolve, 1500));

send(alpha.ws, {
  type: "shoot",
  origin: { x: 24, y: 1.6, z: 24 },
  direction: { x: 0, y: 0, z: -1 }
});

await waitFor(
  () => alpha.state.snapshots.some((snapshot) =>
    snapshot.players?.some((player) => player.name === "Beta" && player.health === 175)
  ) || alpha.state.hits?.some((hit) => hit.target === beta.state.id && hit.damage === 25),
  "server resolves a hit"
);

for (let i = 0; i < 7; i += 1) {
  send(alpha.ws, {
    type: "shoot",
    origin: { x: 24, y: 1.6, z: 24 },
    direction: { x: 0, y: 0, z: -1 }
  });
}

await waitFor(
  () => beta.state.snapshots.some((snapshot) =>
    snapshot.players?.some((player) => player.name === "Beta" && player.health === 0 && player.eliminated)
  ),
  "target is eliminated in one-life mode"
);

alpha.ws.close();
beta.ws.close();
console.log(`smoke passed: room ${alpha.state.room}, clients synced, hit resolved`);
