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

const pageResponse = await fetch(baseUrl, { cache: "no-store" });
if (!pageResponse.ok) throw new Error(`page check failed: ${pageResponse.status} ${pageResponse.statusText}`);
const pageHtml = await pageResponse.text();
if (!pageHtml.includes("MOTION 2.0 操作・物理更新")) throw new Error("public page is missing the MOTION 2.0 update marker");
const assetNames = [...pageHtml.matchAll(/\/assets\/(?:index|three)-[^\"']+\.(?:js|css)/g)].map((match) => match[0]);
if (assetNames.length < 3) throw new Error(`public page asset list is incomplete: ${assetNames.join(", ")}`);

function openClient(name, room = "", options = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const state = { name, id: "", room: "", snapshots: [], teamPings: [], movementCorrections: [] };
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
      if (message.type === "team_ping") state.teamPings.push(message.ping);
      if (message.type === "movement_correction") state.movementCorrections.push(message);
      if (message.type === "error") {
        clearTimeout(timeout);
        reject(new Error(String(message.message || "public server rejected probe")));
      }
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

const probeName = `Probe${Math.random().toString(36).slice(2, 7)}`;
const probe = await openClient(probeName, "DONPCH", {
  cpuFill: false,
  gameMode: "oneLife",
  partySize: 1,
  relationMode: "versus"
});

await waitFor(
  () => probe.state.snapshots.some((snapshot) =>
    snapshot.players?.some((player) => player.id === probe.state.id) &&
    snapshot.vehicles?.length === 4 &&
    snapshot.vehicles.every((vehicle) => typeof vehicle.health === "number" && typeof vehicle.maxHealth === "number") &&
    typeof snapshot.safeZone?.enabled === "boolean"
  ),
  "public snapshot includes player, vehicle durability, and safe-zone state"
);

const snapshot = probe.state.snapshots.at(-1);
const self = snapshot.players.find((player) => player.id === probe.state.id);
send(probe.ws, { type: "team_ping", point: { x: self.x, y: 0.1, z: self.z } });
await waitFor(() => probe.state.teamPings.length > 0, "public server echoes a team-filtered ping");

send(probe.ws, { type: "state", x: self.x + 90, y: 80, z: self.z + 90, yaw: Math.PI * 13, pitch: 0 });
await waitFor(() => probe.state.movementCorrections.length > 0, "public server returns a movement correction");
const authorityPosition = probe.state.movementCorrections.at(-1).position;
await waitFor(() => {
  const player = probe.state.snapshots.at(-1)?.players?.find((item) => item.id === probe.state.id);
  return player
    && player.lastSeen > self.lastSeen
    && Math.hypot(player.x - authorityPosition.x, player.y - authorityPosition.y, player.z - authorityPosition.z) < 0.08;
}, "public movement correction reaches the snapshot");
const corrected = probe.state.snapshots.at(-1).players.find((player) => player.id === probe.state.id);
if (Math.hypot(corrected.x - self.x, corrected.z - self.z) > 6.3) throw new Error("public server accepted an excessive horizontal warp");
if (corrected.y - self.y > 6.3) throw new Error("public server accepted an excessive vertical warp");
if (corrected.yaw < -Math.PI || corrected.yaw >= Math.PI) throw new Error("public server did not normalize yaw");

send(probe.ws, { type: "leave" });
await new Promise((resolve) => setTimeout(resolve, 80));
probe.ws.close(1000, "leave");

console.log(`public verify passed: ${baseUrl.origin}, room ${probe.state.room}, movement corrected, assets ${assetNames.join(", ")}`);
