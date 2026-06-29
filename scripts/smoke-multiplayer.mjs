import WebSocket from "ws";

const endpoint = process.env.SMOKE_WS || "ws://localhost:5188/ws";

function openClient(name, room = "") {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(endpoint);
    const state = { name, id: "", room: "", snapshots: [], respawns: [] };
    const timeout = setTimeout(() => reject(new Error(`timeout joining ${name}`)), 5000);

    ws.on("open", () => ws.send(JSON.stringify({ type: "join", name, room })));
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

const alpha = await openClient("Alpha");
const beta = await openClient("Beta", alpha.state.room);

send(alpha.ws, { type: "state", x: 24, y: 1.6, z: 24, yaw: 0, pitch: 0 });
send(beta.ws, { type: "state", x: 24, y: 1.6, z: 18, yaw: Math.PI, pitch: 0 });

await waitFor(
  () => alpha.state.snapshots.some((snapshot) => snapshot.players?.length === 2) &&
    beta.state.snapshots.some((snapshot) => snapshot.players?.length === 2),
  "both clients see two players"
);

send(alpha.ws, {
  type: "shoot",
  origin: { x: 24, y: 1.6, z: 24 },
  direction: { x: 0, y: 0, z: -1 }
});

await waitFor(
  () => alpha.state.snapshots.some((snapshot) =>
    snapshot.players?.some((player) => player.name === "Beta" && player.health === 75)
  ),
  "server resolves a hit"
);

for (let i = 0; i < 3; i += 1) {
  send(alpha.ws, {
    type: "shoot",
    origin: { x: 24, y: 1.6, z: 24 },
    direction: { x: 0, y: 0, z: -1 }
  });
}

await waitFor(
  () => beta.state.respawns.some((message) => message.target === beta.state.id),
  "target receives respawn without relying on snapshot warps"
);

alpha.ws.close();
beta.ws.close();
console.log(`smoke passed: room ${alpha.state.room}, 2 clients synced, hit resolved`);
