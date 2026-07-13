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
if (!pageHtml.includes("MATCH 5.0 マッチ進行更新")) throw new Error("public page is missing the MATCH 5.0 update marker");
if (!pageHtml.includes("ECONOMY 1.1 共通Donウォレット")) throw new Error("public page is missing the ECONOMY 1.1 update marker");
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

async function initializeSharedWallet(guestToken) {
  const response = await fetch(new URL("/api/wallet", baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ guestToken })
  });
  const payload = await response.json();
  if (!response.ok || !payload?.ok || payload.balance !== 2000 || payload.guestToken !== guestToken) {
    throw new Error(`shared wallet initialization failed: ${JSON.stringify(payload)}`);
  }
  return payload;
}

const probeName = `Probe${Math.random().toString(36).slice(2, 7)}`;
const probeWalletToken = `public-fps-${Date.now()}-${Math.random().toString(36).slice(2)}`;
await initializeSharedWallet(probeWalletToken);
const probe = await openClient(probeName, "DONPCH", {
  cpuFill: false,
  gameMode: "oneLife",
  partySize: 1,
  relationMode: "versus",
  guestToken: probeWalletToken
});

await waitFor(
  () => probe.state.snapshots.some((snapshot) =>
    snapshot.players?.some((player) => player.id === probe.state.id) &&
    snapshot.aiVersion === "TACTICS 2.0" &&
    snapshot.worldVersion === "VERTICAL 4.0" &&
    snapshot.matchVersion === "MATCH 5.0" &&
    ["waiting", "countdown", "active", "result"].includes(snapshot.matchPhase) &&
    typeof snapshot.matchStarted === "boolean" &&
    typeof snapshot.humanCount === "number" &&
    typeof snapshot.readyHumans === "number" &&
    typeof snapshot.minimumHumans === "number" &&
    snapshot.doors?.length === 6 &&
    snapshot.doors.every((door) => typeof door.openness === "number" && typeof door.targetOpen === "boolean") &&
    snapshot.elevators?.length === 2 &&
    snapshot.elevators.every((elevator) =>
      typeof elevator.platformY === "number" &&
      typeof elevator.currentFloor === "number" &&
      typeof elevator.targetFloor === "number" &&
      typeof elevator.moving === "boolean"
    ) &&
    snapshot.vehicles?.length === 4 &&
    snapshot.vehicles.every((vehicle) => typeof vehicle.health === "number" && typeof vehicle.maxHealth === "number") &&
    typeof snapshot.safeZone?.enabled === "boolean" &&
    snapshot.players.every((player) => !("qaVerticalStage" in player))
  ),
  "public snapshot includes MATCH 5.0 lifecycle, VERTICAL 4.0 elevators, doors, TACTICS 2.0, player, vehicle durability, and safe-zone state"
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

const baccaratWalletToken = `public-baccarat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
await initializeSharedWallet(baccaratWalletToken);
const baccaratProbe = await new Promise((resolve, reject) => {
  const ws = new WebSocket(wsUrl);
  const state = { welcome: null, snapshots: [], errors: [] };
  const timeout = setTimeout(() => reject(new Error("timeout joining public baccarat table")), 10_000);
  ws.on("open", () => ws.send(JSON.stringify({
    type: "baccarat_join",
    name: `Table${Math.random().toString(36).slice(2, 7)}`,
    guestToken: baccaratWalletToken
  })));
  ws.on("message", (raw) => {
    const message = JSON.parse(String(raw));
    if (message.type === "baccarat_welcome") {
      state.welcome = message;
      clearTimeout(timeout);
      resolve({ ws, state });
    } else if (message.type === "baccarat_snapshot") {
      state.snapshots.push(message);
      if (state.snapshots.length > 120) state.snapshots.shift();
    } else if (message.type === "baccarat_error") {
      state.errors.push(String(message.message || ""));
    }
  });
  ws.on("error", reject);
});

await waitFor(() => baccaratProbe.state.snapshots.some((table) => (
  table.version === "BACCARAT 1.1"
  && table.table === "DONBAC"
  && table.phase === "betting"
  && table.viewer?.chips >= 10
  && table.participantCount >= 1
)), "public BACCARAT 1.1 shared table accepts a lobby wallet", 20_000);
send(baccaratProbe.ws, { type: "baccarat_action", action: "bet", target: "player", amount: 10 });
await waitFor(() => baccaratProbe.state.snapshots.some((table) => table.viewer?.bets?.player === 10), "public baccarat table records an authoritative bet");
send(baccaratProbe.ws, { type: "baccarat_action", action: "undo" });
await waitFor(() => baccaratProbe.state.snapshots.at(-1)?.viewer?.bets?.player === 0, "public baccarat table refunds an undo");
send(baccaratProbe.ws, { type: "baccarat_leave" });
baccaratProbe.ws.close(1000, "leave");

console.log(`public verify passed: ${baseUrl.origin}, room ${probe.state.room}, MATCH 5.0 and BACCARAT 1.1 active, lobby wallet initialized before both games, shared DONBAC bet verified, assets ${assetNames.join(", ")}`);
