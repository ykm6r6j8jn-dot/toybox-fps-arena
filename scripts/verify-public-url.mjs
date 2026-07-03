import WebSocket from "ws";

const rawBaseUrl = process.argv[2] || process.env.PUBLIC_URL || "";

if (!rawBaseUrl) {
  console.error("Usage: npm run verify:public -- https://your-public-url.example");
  process.exit(1);
}

const baseUrl = new URL(rawBaseUrl);
baseUrl.pathname = "/";
baseUrl.search = "";
baseUrl.hash = "";

const healthUrl = new URL("/health", baseUrl);
const wsUrl = new URL("/ws", baseUrl);
wsUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";

const healthResponse = await fetch(healthUrl, { cache: "no-store" });
if (!healthResponse.ok) {
  throw new Error(`health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
}

const health = await healthResponse.json();
if (!health?.ok) throw new Error(`health check returned unexpected body: ${JSON.stringify(health)}`);

function openClient(name, room = "", options = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const state = { name, id: "", room: "", snapshots: [], respawns: [] };
    const timeout = setTimeout(() => reject(new Error(`timeout joining ${name}`)), 8000);

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
    });
    ws.on("error", reject);
  });
}

function waitFor(predicate, label, timeoutMs = 8000) {
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
    }, 80);
  });
}

function send(ws, payload) {
  ws.send(JSON.stringify(payload));
}

const alpha = await openClient("PublicAlpha", "", { cpuFill: false });
const beta = await openClient("PublicBeta", alpha.state.room, { cpuFill: false });

send(alpha.ws, { type: "state", x: 24, y: 1.6, z: 24, yaw: 0, pitch: 0 });
send(beta.ws, { type: "state", x: 24, y: 1.6, z: 18, yaw: Math.PI, pitch: 0 });

await waitFor(
  () => alpha.state.snapshots.some((snapshot) =>
    snapshot.players?.some((player) => player.name === "PublicAlpha") &&
    snapshot.players?.some((player) => player.name === "PublicBeta") &&
    !snapshot.players?.some((player) => String(player.name || "").startsWith("CPU-"))
  ) &&
    beta.state.snapshots.some((snapshot) =>
      snapshot.players?.some((player) => player.name === "PublicAlpha") &&
      snapshot.players?.some((player) => player.name === "PublicBeta") &&
      !snapshot.players?.some((player) => String(player.name || "").startsWith("CPU-"))
    ),
  "both public clients see each other without CPU fill"
);

send(alpha.ws, {
  type: "shoot",
  origin: { x: 24, y: 1.6, z: 24 },
  direction: { x: 0, y: 0, z: -1 },
  weapon: "rifle"
});

await waitFor(
  () => alpha.state.snapshots.some((snapshot) =>
    snapshot.players?.some((player) => player.name === "PublicBeta" && player.health === 175)
  ),
  "public server resolves hit"
);

alpha.ws.close();
beta.ws.close();

console.log(`public verify passed: ${baseUrl.origin}, room ${alpha.state.room}`);
