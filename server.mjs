import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 5188);
const maxPlayers = 20;
const maxCpuPlayers = 19;
const matchTeamSize = maxPlayers / 2;
const maxHealth = 200;
const arenaHalfSize = 96;
const donpachiSpeed = 14.8;
const donpachiLifeMs = 5000;
const donpachiDamage = 120;
const ashinagaRange = 14;
const ashinagaDamage = 86;
const barrierDurationMs = 7000;
const barrierRespawnMs = 15000;
const barrierSpawn = { x: -88, y: 1.6, z: 82 };
const initialHealPacks = 5;
const healPackAmount = 20;
const gameModes = new Set(["oneLife", "life3", "castle"]);
const partySizes = new Set([1, 2, 4]);
const arenas = new Set(["toybox"]);
const teams = new Set(["blue", "red"]);
const playerCastleCoreMaxHealth = 7500;
const cpuCastleCoreMaxHealth = 10000;
const castleCoreRadius = 2.4;
const castleRoundMs = 240_000;
const castleCoreSpawns = {
  blue: { x: -82, y: 2.1, z: -72 },
  red: { x: 82, y: 2.1, z: 72 }
};
const weaponDamage = new Map([
  ["rifle", 25],
  ["ak47", 29],
  ["aug", 24],
  ["smg", 16],
  ["shotgun", 12],
  ["marksman", 45],
  ["awm", 86],
  ["type95", 18],
  ["cpu", 7]
]);
const weaponRange = new Map([
  ["rifle", 72],
  ["ak47", 78],
  ["aug", 86],
  ["smg", 44],
  ["shotgun", 26],
  ["marksman", 105],
  ["awm", 135],
  ["type95", 76],
  ["cpu", 34]
]);
const cpuWeaponMaxRange = new Map([
  ["rifle", 56],
  ["ak47", 58],
  ["aug", 64],
  ["smg", 34],
  ["shotgun", 18],
  ["marksman", 76],
  ["awm", 88],
  ["type95", 58],
  ["cpu", 30]
]);
const solidObstacles = [];
const okakoSolidObstacles = [];

function addSolidObstacle(position, scale, arena = "toybox") {
  const target = arena === "okakoj" ? okakoSolidObstacles : solidObstacles;
  target.push({
    minX: position[0] - scale[0] / 2,
    maxX: position[0] + scale[0] / 2,
    minY: position[1] - scale[1] / 2,
    maxY: position[1] + scale[1] / 2,
    minZ: position[2] - scale[2] / 2,
    maxZ: position[2] + scale[2] / 2
  });
}

function obstaclesForArena(arena = "toybox") {
  return arena === "okakoj" ? okakoSolidObstacles : solidObstacles;
}

function initSolidObstacles() {
  const boxes = [
    [[0, 1.2, -96.5], [194, 2.4, 1]], [[0, 1.2, 96.5], [194, 2.4, 1]],
    [[-96.5, 1.2, 0], [1, 2.4, 194]], [[96.5, 1.2, 0], [1, 2.4, 194]],
    [[8, 2.1, -7.5], [4.8, 4.2, 4.8]], [[20, 1.7, -4], [5.8, 3.4, 8]],
    [[-18, 1.4, -8], [9, 2.8, 3.2]], [[-4, 1.1, 1.5], [5, 2.2, 3.2]],
    [[6.5, 0.8, 5], [4, 1.6, 4]], [[-10, 0.9, 11], [2.4, 1.8, 2.4]],
    [[18, 0.9, 15], [8, 1.8, 5]], [[-7, 1.5, -22], [8, 3, 3]],
    [[-22, 0.8, 18], [3.8, 1.6, 3.8]], [[0, 0.55, -15], [4.5, 1.1, 2]],
    [[20, 1.1, 21], [5, 2.2, 3.5]], [[-24, 1.2, 5], [3, 2.4, 9]],
    [[13, 0.8, -18], [7, 1.6, 3]], [[-2, 1.2, 23], [11, 2.4, 2.8]],
    [[-23, 3.6, -23], [7, 7.2, 5]], [[24, 4.4, 24], [8, 8.8, 6]],
    [[2, 3.2, -27], [12, 6.4, 3.5]], [[-18, 2.7, 25], [11, 5.4, 5]],
    [[9, 2.4, 27], [9, 4.8, 4.2]], [[-28, 1.6, -9], [3.4, 3.2, 6.5]],
    [[27, 2.8, 8], [3.8, 5.6, 5.2]], [[-11, 2.3, -27], [7.5, 4.6, 3.6]],
    [[28, 1.45, -23], [5.2, 2.9, 8.4]], [[-28, 1.2, 27], [5.8, 2.4, 5.8]],
    [[-6, 6, 27], [4.8, 12, 4.8]], [[15, 6.8, -28], [5.2, 13.6, 4.4]],
    [[-6, 3.45, 20], [5.4, 0.5, 4.2]], [[15, 3.7, -20], [5.6, 0.5, 4.2]],
    [[3, 4.2, 21.5], [6, 0.7, 2.4]], [[29, 5.2, 0], [3.4, 10.4, 4.6]],
    [[-27, 6.4, 3], [4.2, 12.8, 4.2]], [[2, 2.3, -7], [5.2, 4.6, 4.2]],
    [[-15, 2.6, 2], [4.2, 5.2, 4.2]], [[23.5, 1.35, -18], [5, 2.7, 3.8]],
    [[-36, 2.8, -34], [9, 5.6, 5]], [[37, 6.2, -33], [5.5, 12.4, 5.5]],
    [[-34, 2.2, 33], [12, 4.4, 6]], [[35, 2.6, 34], [8, 5.2, 5]],
    [[-2, 2.1, 39], [10, 4.2, 4.6]], [[-38, 0.85, 6], [3.8, 1.7, 10]],
    [[38, 0.85, -6], [3.8, 1.7, 10]], [[-56, 2.2, -54], [10, 4.4, 5]],
    [[56, 5.2, 54], [5, 10.4, 5]], [[-54, 1.4, 52], [8, 2.8, 4]],
    [[54, 2.4, -52], [12, 4.8, 6]], [[0, 1.2, 58], [16, 2.4, 3]],
    [[0, 1.2, -58], [16, 2.4, 3]], [[-47, 7.4, 0], [5, 14.8, 5]],
    [[47, 4.5, -44], [7, 9, 5]], [[-58, 1.1, 18], [9, 2.2, 4]],
    [[58, 1.1, -18], [9, 2.2, 4]], [[-16, 3.1, 54], [8, 6.2, 5]],
    [[18, 2.6, -55], [10, 5.2, 4]], [[44, 1.2, 18], [4, 2.4, 12]],
    [[0, 4.2, -88.5], [22, 8.4, 0.5]], [[-7.3, 4.2, -75.5], [7.5, 8.4, 0.5]],
    [[7.3, 4.2, -75.5], [7.5, 8.4, 0.5]], [[-11, 4.2, -82], [0.5, 8.4, 13]],
    [[11, 4.2, -82], [0.5, 8.4, 13]], [[0, 15.4, -86], [12, 30.8, 7]],
    [[-80, 3.1, -25.5], [18, 6.2, 0.5]], [[-86, 3.1, -10.5], [6.2, 6.2, 0.5]],
    [[-74, 3.1, -10.5], [6.2, 6.2, 0.5]], [[-89, 3.1, -18], [0.5, 6.2, 15]],
    [[-71, 3.1, -18], [0.5, 6.2, 15]], [[80, 3.1, 10.5], [18, 6.2, 0.5]],
    [[74, 3.1, 25.5], [6.2, 6.2, 0.5]], [[86, 3.1, 25.5], [6.2, 6.2, 0.5]],
    [[71, 3.1, 18], [0.5, 6.2, 15]], [[89, 3.1, 18], [0.5, 6.2, 15]],
    [[-79, 13.5, -74], [13, 27, 10]], [[78, 14.8, 75], [12, 29.6, 11]],
    [[0, 3.4, 82], [34, 6.8, 12]], [[-22, 1.3, 79], [8, 2.6, 3.2]],
    [[72, 1.9, -54], [17, 3.8, 8]], [[-72, 1.9, 54], [17, 3.8, 8]],
    [[63, 1.05, -78], [9, 2.1, 3.4]], [[-62, 1.8, 78], [5.2, 3.6, 5.2]],
    [[45, 0.95, -83], [13, 1.9, 3]], [[-85, 0.95, 18], [3, 1.9, 13]],
    [[-48, 2.6, -28], [14, 5.2, 0.5]], [[-52.8, 2.6, -20], [4.4, 5.2, 0.5]],
    [[-43.2, 2.6, -20], [4.4, 5.2, 0.5]], [[-55, 2.6, -24], [0.5, 5.2, 8]],
    [[-41, 2.6, -24], [0.5, 5.2, 8]], [[-49.7, 1.35, -21.35], [0.9, 2.7, 0.9]]
  ];
  for (const [position, scale] of boxes) addSolidObstacle(position, scale);

  const okakoBoxes = [
    [[0, 1.2, -67.5], [136, 2.4, 1]], [[0, 1.2, 67.5], [136, 2.4, 1]],
    [[-67.5, 1.2, 0], [1, 2.4, 136]], [[67.5, 1.2, 0], [1, 2.4, 136]],
    [[-22, 2.2, -35], [48, 4.4, 0.42]], [[-36.9, 2.2, -21], [18.2, 4.4, 0.42]],
    [[-7.1, 2.2, -21], [18.2, 4.4, 0.42]], [[-46, 2.2, -28], [0.42, 4.4, 14]],
    [[2, 2.2, -28], [0.42, 4.4, 14]], [[-38, 1.25, -28.7], [0.24, 2.5, 7.7]],
    [[-30, 1.25, -28.7], [0.24, 2.5, 7.7]], [[-22, 1.25, -28.7], [0.24, 2.5, 7.7]],
    [[-14, 1.25, -28.7], [0.24, 2.5, 7.7]], [[-6, 1.25, -28.7], [0.24, 2.5, 7.7]],
    [[36, 2.6, -32], [24, 5.2, 0.42]], [[28.6, 2.6, -16], [9.1, 5.2, 0.42]],
    [[43.4, 2.6, -16], [9.1, 5.2, 0.42]], [[24, 2.6, -24], [0.42, 5.2, 16]],
    [[48, 2.6, -24], [0.42, 5.2, 16]], [[36, 1.25, -24.8], [0.24, 2.5, 8.8]],
    [[-44, 1.9, 16], [22, 3.8, 0.42]], [[-50.8, 1.9, 28], [8.4, 3.8, 0.42]],
    [[-37.2, 1.9, 28], [8.4, 3.8, 0.42]], [[-55, 1.9, 22], [0.42, 3.8, 12]],
    [[-33, 1.9, 22], [0.42, 3.8, 12]], [[30, 3.1, 17], [28, 6.2, 0.48]],
    [[21.5, 3.1, 39], [9, 6.2, 0.48]], [[39.5, 3.1, 39], [9, 6.2, 0.48]],
    [[16, 3.1, 28], [0.48, 6.2, 22]], [[44, 3.1, 28], [0.48, 6.2, 22]],
    [[30, 0.55, 18.8], [12, 1.1, 2.5]], [[34, 0.62, -27], [3.2, 1.24, 1.8]],
    [[41, 0.62, -22], [3.2, 1.24, 1.8]], [[29, 0.48, -19], [5.2, 0.96, 1.2]],
    [[39, 0.48, -30], [5.2, 0.96, 1.2]], [[-50, 0.45, 39], [11, 0.9, 2]],
    [[-50, 1.15, 43], [11, 0.9, 2]], [[-50, 1.85, 47], [11, 0.9, 2]],
    [[5, 3.2, -25], [20, 0.52, 2.4]]
  ];
  for (const [position, scale] of okakoBoxes) addSolidObstacle(position, scale, "okakoj");
}
initSolidObstacles();

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".json", "application/json; charset=utf-8"]
]);

const rooms = new Map();
let vite;

if (!isProd) {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
}

const server = createServer(async (req, res) => {
  if (req.url === "/health") {
    const now = Date.now();
    const players = [...rooms.values()].flatMap((room) => [...room.players.values()]
      .filter((player) => !player.isBot && now - player.lastSeen < 45_000)
      .map((player) => ({
        name: player.name,
        room: room.code,
        color: player.color,
        score: player.score
      })));
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, players }));
    return;
  }

  if (!isProd && vite) {
    vite.middlewares(req, res);
    return;
  }

  const publicRoot = resolve(__dirname, "dist");
  const safePath = decodeURIComponent((req.url || "/").split("?")[0]);
  const target = safePath === "/" ? "/index.html" : safePath;
  const filePath = resolve(join(publicRoot, target));

  if (!filePath.startsWith(publicRoot)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not file");
    res.writeHead(200, { "content-type": mimeTypes.get(extname(filePath)) || "application/octet-stream" });
    createReadStream(filePath).pipe(res);
  } catch {
    try {
      const html = await readFile(join(publicRoot, "index.html"), "utf8");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  }
});

const wss = new WebSocketServer({ server, path: "/ws" });

function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function normalizeGameMode(value) {
  const mode = String(value || "oneLife");
  return gameModes.has(mode) ? mode : "oneLife";
}

function normalizeArena(value) {
  return "toybox";
}

function modeLabel(mode) {
  if (mode === "oneLife") return "ワンライフ";
  if (mode === "life3") return "ライフ3";
  if (mode === "castle") return "城攻め";
  return "ワンライフ";
}

function normalizePartySize(value) {
  const size = Number(value);
  return partySizes.has(size) ? size : 1;
}

function normalizeTeam(value, room) {
  const requested = String(value || "auto");
  if (room.mode === "castle") {
    if (room.playerTeam) return room.playerTeam;
    return teams.has(requested) ? requested : "blue";
  }
  if (teams.has(requested)) return requested;
  const counts = { blue: 0, red: 0 };
  for (const player of room.players.values()) {
    if (player.color === "blue" || player.color === "red") counts[player.color] += 1;
  }
  return counts.blue <= counts.red ? "blue" : "red";
}

function humanPlayers(room) {
  return [...room.players.values()].filter((player) => !player.isBot);
}

function assignMatchTeam(room) {
  const counts = { blue: 0, red: 0 };
  for (const player of humanPlayers(room)) {
    if (player.color === "blue" || player.color === "red") counts[player.color] += 1;
  }
  return counts.blue <= counts.red ? "blue" : "red";
}

function oppositeTeam(team) {
  return team === "red" ? "blue" : "red";
}

function initialLivesForMode(mode) {
  if (mode === "life3") return 3;
  if (mode === "oneLife") return 1;
  return 0;
}

function createCastleCores(playerTeam = "blue") {
  const blueHealth = playerTeam === "blue" ? playerCastleCoreMaxHealth : cpuCastleCoreMaxHealth;
  const redHealth = playerTeam === "red" ? playerCastleCoreMaxHealth : cpuCastleCoreMaxHealth;
  return {
    blue: { team: "blue", ...castleCoreSpawns.blue, health: blueHealth, maxHealth: blueHealth },
    red: { team: "red", ...castleCoreSpawns.red, health: redHealth, maxHealth: redHealth }
  };
}

function nextHealthPickupAt(now = Date.now()) {
  return now + 25_000 + Math.floor(Math.random() * 16_000);
}

function randomPickupSpawn(arena = "toybox") {
  for (let i = 0; i < 24; i += 1) {
    const x = Math.round((Math.random() * 174 - 87) * 10) / 10;
    const z = Math.round((Math.random() * 174 - 87) * 10) / 10;
    if (!cpuCollides(x, z, 1.25, arena)) return { x, y: 1.6, z };
  }
  return { x: 0, y: 1.6, z: 0 };
}

function normalizeCpuFill(value) {
  return value !== false;
}

function findMatchRoom(mode = "oneLife", partySize = 1, cpuFill = true) {
  const gameMode = normalizeGameMode(mode);
  const size = normalizePartySize(partySize);
  const fill = normalizeCpuFill(cpuFill);
  for (const room of rooms.values()) {
    if (!room.matchmaking || room.winner || room.mode !== gameMode || room.partySize !== size || room.cpuFill !== fill) continue;
    if (humanPlayers(room).length < maxPlayers) return room;
  }
  return null;
}

function getRoom(code, mode = "oneLife", arena = "toybox", partySize = 1, matchmaking = true, cpuFill = true) {
  const normalized = (code || "").trim().toUpperCase();
  if (normalized && rooms.has(normalized)) return rooms.get(normalized);
  if (!normalized) {
    const match = findMatchRoom(mode, partySize, cpuFill);
    if (match) return match;
  }
  const createdCode = normalized && normalized.length === 6 ? normalized : roomCode();
  const gameMode = normalizeGameMode(mode);
  const arenaId = normalizeArena(arena);
  const size = normalizePartySize(partySize);
  const room = {
    code: createdCode,
    mode: gameMode,
    arena: arenaId,
    matchmaking,
    cpuFill: normalizeCpuFill(cpuFill),
    partySize: size,
    matchStarted: false,
    maxHumanPlayers: maxPlayers,
    weaponStats: {},
    movementStats: { samples: 0, moving: 0, airborne: 0 },
    targetScore: 0,
    createdAt: Date.now(),
    players: new Map(),
    feed: [],
    chat: [],
    winner: null,
    playerTeam: gameMode === "castle" ? "" : null,
    castleEndsAt: gameMode === "castle" ? Date.now() + castleRoundMs : 0,
    cpuCount: 0,
    donPunches: new Map(),
    castleCores: createCastleCores(),
    barrier: { ...barrierSpawn, available: true, pickedBy: "", respawnAt: 0 },
    healthPickup: { ...randomPickupSpawn(arenaId), available: false, respawnAt: gameMode === "oneLife" ? nextHealthPickupAt() : 0 }
  };
  rooms.set(createdCode, room);
  return room;
}

function spawnPoint(index = 0) {
  const points = [
    [-32, 1.6, -16],
    [32, 1.6, 16],
    [-42, 1.6, -18],
    [42, 1.6, 30],
    [-14, 1.6, -42],
    [14, 1.6, 42],
    [-64, 1.6, -8],
    [64, 1.6, 8],
    [-60, 1.6, 34],
    [64, 1.6, -34],
    [-48, 1.6, -62],
    [48, 1.6, 62],
    [-82, 1.6, -8],
    [82, 1.6, 8],
    [-84, 1.6, 42],
    [84, 1.6, -42],
    [-26, 1.6, 74],
    [26, 1.6, -66],
    [-6, 1.6, 72],
    [6, 1.6, -72]
  ];
  const point = points[index % points.length];
  const yaw = Math.atan2(-point[0], -point[2]);
  return { x: point[0], y: point[1], z: point[2], yaw };
}

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    color: player.color,
    cosmeticColor: player.cosmeticColor,
    ready: player.ready,
    health: player.health,
    score: player.score,
    kills: player.kills,
    deaths: player.deaths,
    damageDealt: player.damageDealt || 0,
    damageTaken: player.damageTaken || 0,
    hits: player.hits || 0,
    healsUsed: player.healsUsed || 0,
    specialsUsed: player.specialsUsed || 0,
    barrierPickups: player.barrierPickups || 0,
    lives: player.lives || 0,
    eliminated: Boolean(player.eliminated),
    creative: Boolean(player.creative),
    healPacks: player.healPacks || 0,
    donPunchCharge: player.donPunchCharge || 0,
    x: player.x,
    y: player.y,
    z: player.z,
    yaw: player.yaw,
    pitch: player.pitch,
    lastSeen: player.lastSeen,
    isBot: Boolean(player.isBot),
    weapon: player.botWeapon || "rifle",
    shieldUntil: player.shieldUntil || 0
  };
}

function send(ws, payload) {
  if (ws?.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
}

function broadcast(room, payload) {
  for (const player of room.players.values()) {
    if (!player.isBot) send(player.ws, payload);
  }
}

function addFeed(room, text, color = "blue") {
  room.feed.unshift({ id: `${Date.now()}-${Math.random()}`, text, color, at: Date.now() });
  room.feed = room.feed.slice(0, 8);
}

function distanceToRay(point, origin, direction, range = 70) {
  const px = point.x - origin.x;
  const py = point.y - origin.y;
  const pz = point.z - origin.z;
  const t = px * direction.x + py * direction.y + pz * direction.z;
  if (t < 0 || t > range) return Infinity;
  const cx = origin.x + direction.x * t;
  const cy = origin.y + direction.y * t;
  const cz = origin.z + direction.z * t;
  return Math.hypot(point.x - cx, point.y - cy, point.z - cz);
}

function projectionToRay(point, origin, direction) {
  return (point.x - origin.x) * direction.x + (point.y - origin.y) * direction.y + (point.z - origin.z) * direction.z;
}

function rayHitsBox(origin, direction, box, maxDistance) {
  let tMin = 0;
  let tMax = maxDistance;
  for (const axis of ["x", "y", "z"]) {
    const min = box[`min${axis.toUpperCase()}`];
    const max = box[`max${axis.toUpperCase()}`];
    const o = origin[axis];
    const d = direction[axis];
    if (Math.abs(d) < 1e-6) {
      if (o < min || o > max) return false;
      continue;
    }
    const inv = 1 / d;
    let t1 = (min - o) * inv;
    let t2 = (max - o) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return tMin > 0.05 && tMin < maxDistance;
}

function lineBlocked(origin, direction, targetDistance, arena = "toybox") {
  const endX = origin.x + direction.x * targetDistance;
  const endY = origin.y + direction.y * targetDistance;
  const endZ = origin.z + direction.z * targetDistance;
  const minX = Math.min(origin.x, endX) - 0.08;
  const maxX = Math.max(origin.x, endX) + 0.08;
  const minY = Math.min(origin.y, endY) - 0.08;
  const maxY = Math.max(origin.y, endY) + 0.08;
  const minZ = Math.min(origin.z, endZ) - 0.08;
  const maxZ = Math.max(origin.z, endZ) + 0.08;
  return obstaclesForArena(arena).some((box) => {
    if (box.maxX < minX || box.minX > maxX || box.maxY < minY || box.minY > maxY || box.maxZ < minZ || box.minZ > maxZ) {
      return false;
    }
    return rayHitsBox(origin, direction, box, targetDistance);
  });
}

function cpuCollides(x, z, radius = 0.55, arena = "toybox") {
  return obstaclesForArena(arena).some((box) => (
    x + radius > box.minX &&
    x - radius < box.maxX &&
    z + radius > box.minZ &&
    z - radius < box.maxZ &&
    1.8 > box.minY &&
    0.2 < box.maxY
  ));
}

function findNearestCpuSafeSpot(x, z, radius = 0.68, arena = "toybox") {
  const startX = clamp(x, -arenaHalfSize + 2, arenaHalfSize - 2);
  const startZ = clamp(z, -arenaHalfSize + 2, arenaHalfSize - 2);
  if (!cpuCollides(startX, startZ, radius, arena)) return { x: startX, z: startZ };

  const angleSteps = 16;
  for (let ring = 1; ring <= 18; ring += 1) {
    const distance = ring * 0.85;
    for (let i = 0; i < angleSteps; i += 1) {
      const angle = (Math.PI * 2 * i) / angleSteps;
      const candidateX = clamp(startX + Math.cos(angle) * distance, -arenaHalfSize + 2, arenaHalfSize - 2);
      const candidateZ = clamp(startZ + Math.sin(angle) * distance, -arenaHalfSize + 2, arenaHalfSize - 2);
      if (!cpuCollides(candidateX, candidateZ, radius, arena)) return { x: candidateX, z: candidateZ };
    }
  }

  return { x: 0, z: 0 };
}

function keepCpuOutOfWalls(bot, arena = "toybox") {
  if (!cpuCollides(bot.x, bot.z, 0.68, arena)) return false;
  const spot = findNearestCpuSafeSpot(bot.x, bot.z, 0.68, arena);
  bot.x = spot.x;
  bot.z = spot.z;
  bot.stuckTicks = 0;
  bot.botPhase += 0.45 + bot.botIndex * 0.05;
  return true;
}

function moveCpuAlongWalls(bot, desiredX, desiredZ, now, arena = "toybox") {
  const elapsed = Math.min(0.18, Math.max(0.06, (now - (bot.lastCpuMoveAt || now - 110)) / 1000));
  bot.lastCpuMoveAt = now;

  if (keepCpuOutOfWalls(bot, arena)) return;

  const dx = desiredX - bot.x;
  const dz = desiredZ - bot.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.05) return;

  const step = Math.min(distance, (4.7 + bot.botIndex * 0.22 + (bot.learnedSpeedBoost || 0)) * elapsed);
  const moveX = dx / distance * step;
  const moveZ = dz / distance * step;
  const nextX = clamp(bot.x + moveX, -arenaHalfSize + 2, arenaHalfSize - 2);
  const nextZ = clamp(bot.z + moveZ, -arenaHalfSize + 2, arenaHalfSize - 2);

  if (!cpuCollides(nextX, nextZ, 0.55, arena)) {
    bot.x = nextX;
    bot.z = nextZ;
    bot.stuckTicks = 0;
    return;
  }

  const canMoveX = !cpuCollides(nextX, bot.z, 0.55, arena);
  const canMoveZ = !cpuCollides(bot.x, nextZ, 0.55, arena);
  if (canMoveX || canMoveZ) {
    if (canMoveX) bot.x = nextX;
    if (canMoveZ) bot.z = nextZ;
    bot.stuckTicks = 0;
    return;
  }

  const tangentA = { x: -moveZ, z: moveX };
  const tangentB = { x: moveZ, z: -moveX };
  for (const tangent of [tangentA, tangentB]) {
    const tangentLength = Math.hypot(tangent.x, tangent.z) || 1;
    const sideX = clamp(bot.x + tangent.x / tangentLength * step * 0.85, -arenaHalfSize + 2, arenaHalfSize - 2);
    const sideZ = clamp(bot.z + tangent.z / tangentLength * step * 0.85, -arenaHalfSize + 2, arenaHalfSize - 2);
    if (!cpuCollides(sideX, sideZ, 0.55, arena)) {
      bot.x = sideX;
      bot.z = sideZ;
      bot.stuckTicks = 0;
      return;
    }
  }

  bot.stuckTicks = (bot.stuckTicks || 0) + 1;
  if (bot.stuckTicks > 10) {
    bot.botPhase += 0.35 + bot.botIndex * 0.08;
    bot.stuckTicks = 0;
  }
}

wss.on("connection", (ws) => {
  let currentRoom;
  let currentPlayer;

  ws.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (message.type === "join") {
      const requestedPartySize = normalizePartySize(message.partySize);
      const requestedCpuFill = normalizeCpuFill(message.cpuFill);
      const room = getRoom(message.room, message.gameMode, "toybox", requestedPartySize, true, requestedCpuFill);
      if (humanPlayers(room).length === 0) room.cpuFill = requestedCpuFill;
      if (room.matchmaking) {
        for (const player of [...room.players.values()]) {
          if (player.isBot) room.players.delete(player.id);
        }
      }
      const humanLimit = room.matchmaking ? room.maxHumanPlayers : maxPlayers;
      if (humanPlayers(room).length >= humanLimit) {
        send(ws, { type: "error", message: "このルームは満員です。" });
        return;
      }

      const id = crypto.randomUUID();
      const spawn = spawnPoint(room.players.size);
      const team = room.matchmaking ? assignMatchTeam(room) : normalizeTeam(message.team, room);
      if (room.mode === "castle" && !room.playerTeam) {
        room.playerTeam = team;
        room.castleCores = createCastleCores(room.playerTeam);
      }
      const player = {
        id,
        ws,
        name: String(message.name || "プレイヤー").slice(0, 14),
        color: team,
        cosmeticColor: safeColor(message.cosmeticColor) || (team === "blue" ? "#1598f0" : "#ff4d4d"),
        ready: false,
        health: maxHealth,
        score: 0,
        kills: 0,
        deaths: 0,
        damageDealt: 0,
        damageTaken: 0,
        hits: 0,
        healsUsed: 0,
        specialsUsed: 0,
        barrierPickups: 0,
        lives: initialLivesForMode(room.mode),
        eliminated: false,
        creative: false,
        healPacks: initialHealPacks,
        donPunchCharge: 0,
        yaw: 0,
        pitch: 0,
        lastSeen: Date.now(),
        isBot: false,
        ...spawn
      };

      room.players.set(id, player);
      currentRoom = room;
      currentPlayer = player;
      if (player.name === "ひでお") {
        applyRoomConfig(room, player, message.gameMode, message.team, message.cpuFill);
        addFeed(room, `ひでお が ${modeLabel(room.mode)} に変更`, player.color);
      }
      syncMatchCpuFill(room);
      addFeed(room, `${player.name} が参加`, player.color);
      const welcomeSpawn = { x: player.x, y: player.y, z: player.z, yaw: player.yaw };
      send(ws, { type: "welcome", id, room: room.code, gameMode: room.mode, arena: room.arena, team: player.color, partySize: room.partySize, cpuFill: room.cpuFill, targetScore: room.targetScore, maxPlayers: room.maxHumanPlayers || maxPlayers, spawn: welcomeSpawn });
      broadcast(room, { type: "feed", feed: room.feed });
      return;
    }

    if (!currentRoom || !currentPlayer) return;

    if (message.type === "state") {
      if (currentPlayer.eliminated) return;
      const previousX = currentPlayer.x;
      const previousY = currentPlayer.y;
      const previousZ = currentPlayer.z;
      currentPlayer.x = clamp(Number(message.x), -arenaHalfSize + 1, arenaHalfSize - 1);
      currentPlayer.y = clamp(Number(message.y), 1.4, 80);
      currentPlayer.z = clamp(Number(message.z), -arenaHalfSize + 1, arenaHalfSize - 1);
      currentPlayer.yaw = clamp(Number(message.yaw), -Math.PI * 2, Math.PI * 2);
      currentPlayer.pitch = clamp(Number(message.pitch), -1.35, 1.35);
      currentPlayer.lastSeen = Date.now();
      const horizontalMove = Math.hypot(currentPlayer.x - previousX, currentPlayer.z - previousZ);
      currentRoom.movementStats.samples += 1;
      if (horizontalMove > 0.12) currentRoom.movementStats.moving += 1;
      if (currentPlayer.y > Math.max(2.6, previousY + 0.3) || currentPlayer.y > 5) currentRoom.movementStats.airborne += 1;
      if (currentRoom.movementStats.samples > 1200) {
        currentRoom.movementStats.samples = Math.ceil(currentRoom.movementStats.samples * 0.5);
        currentRoom.movementStats.moving = Math.ceil(currentRoom.movementStats.moving * 0.5);
        currentRoom.movementStats.airborne = Math.ceil(currentRoom.movementStats.airborne * 0.5);
      }
      tryPickupBarrier(currentRoom, currentPlayer);
      tryPickupHealth(currentRoom, currentPlayer);
      return;
    }

    if (message.type === "ready") {
      currentPlayer.ready = Boolean(message.ready);
      addFeed(currentRoom, `${currentPlayer.name} ${currentPlayer.ready ? "準備完了" : "準備解除"}`, currentPlayer.color);
      broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
      return;
    }

    if (message.type === "chat") {
      const text = String(message.text || "").replace(/\s+/g, " ").trim().slice(0, 80);
      if (!text) return;
      const item = {
        id: `${Date.now()}-${Math.random()}`,
        name: currentPlayer.name,
        color: currentPlayer.color,
        text,
        at: Date.now()
      };
      currentRoom.chat.unshift(item);
      currentRoom.chat = currentRoom.chat.slice(0, 12);
      broadcast(currentRoom, { type: "chat", item, chat: currentRoom.chat });
      return;
    }

    if (message.type === "customize") {
      currentPlayer.cosmeticColor = safeColor(message.cosmeticColor) || currentPlayer.cosmeticColor;
      return;
    }

    if (message.type === "change_team") {
      if (currentRoom.mode !== "oneLife" && currentRoom.mode !== "life3") {
        send(currentPlayer.ws, { type: "error", message: "チーム変更はワンライフ/ライフ3で使用できます。" });
        return;
      }
      const requestedTeam = String(message.team || "");
      if (!teams.has(requestedTeam)) return;
      const targetPlayer = currentRoom.players.get(String(message.targetId || currentPlayer.id));
      if (!targetPlayer) return;
      targetPlayer.color = requestedTeam;
      targetPlayer.cosmeticColor = targetPlayer.cosmeticColor || (requestedTeam === "blue" ? "#1598f0" : "#ff4d4d");
      syncMatchCpuFill(currentRoom);
      addFeed(currentRoom, `${targetPlayer.name} が${requestedTeam === "blue" ? "青" : "赤"}チームへ移動`, targetPlayer.color);
      broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
      return;
    }

    if (message.type === "set_room_config") {
      if (currentPlayer.name !== "ひでお") {
        send(currentPlayer.ws, { type: "error", message: "試合設定はホスト「ひでお」が変更できます。" });
        return;
      }
      applyRoomConfig(currentRoom, currentPlayer, message.gameMode, message.team, message.cpuFill);
      addFeed(currentRoom, `ひでお が ${modeLabel(currentRoom.mode)} に変更`, currentPlayer.color);
      broadcast(currentRoom, {
        type: "room_config",
        gameMode: currentRoom.mode,
        cpuFill: currentRoom.cpuFill,
        targetScore: currentRoom.targetScore || 0,
        feed: currentRoom.feed,
        castleCores: currentRoom.castleCores,
        castleEndsAt: currentRoom.castleEndsAt || 0
      });
      return;
    }

    if (message.type === "creative_toggle") {
      if (currentPlayer.name !== "こーた") return;
      currentPlayer.creative = Boolean(message.enabled);
      currentPlayer.health = maxHealth;
      currentPlayer.eliminated = false;
      return;
    }

    if (message.type === "use_heal") {
      if (currentPlayer.eliminated || currentPlayer.health <= 0 || currentPlayer.creative) return;
      if ((currentPlayer.healPacks || 0) <= 0 || currentPlayer.health >= maxHealth) return;
      currentPlayer.healPacks -= 1;
      currentPlayer.healsUsed = (currentPlayer.healsUsed || 0) + 1;
      currentPlayer.health = Math.min(maxHealth, currentPlayer.health + healPackAmount);
      addFeed(currentRoom, `${currentPlayer.name} が回復アイテムを使用`, currentPlayer.color);
      send(currentPlayer.ws, { type: "sound", sound: "heal" });
      broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
      return;
    }

    if (message.type === "set_cpu") {
      if (currentRoom.matchmaking) {
        currentRoom.cpuFill = Number(message.count) !== 0;
        syncMatchCpuFill(currentRoom);
        addFeed(currentRoom, currentRoom.cpuFill ? "CPU補充 ON" : "CPU補充 OFF", currentPlayer.color);
        broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
        return;
      }
      setCpuCount(currentRoom, clamp(Number(message.count), 0, maxCpuPlayers));
      addFeed(currentRoom, `CPU ${currentRoom.cpuCount}体`, currentPlayer.color);
      broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
      return;
    }

    if (message.type === "reset_room") {
      resetRoomScores(currentRoom);
      addFeed(currentRoom, "点数をリセット", currentPlayer.color);
      broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
      return;
    }

    if (message.type === "hadeon_burst") {
      if (currentPlayer.name !== "こーた") return;
      applyHadeonBurst(currentRoom, currentPlayer);
      return;
    }

    if (message.type === "donpunch") {
      if (currentPlayer.eliminated || currentPlayer.health <= 0) return;
      const charge = currentPlayer.donPunchCharge || 0;
      if (charge >= 8) {
        const target = nearestEnemy(currentRoom, currentPlayer);
        if (!target) {
          send(currentPlayer.ws, { type: "error", message: "ドンパチの標的がいません。" });
          return;
        }
        currentPlayer.donPunchCharge -= 8;
        currentPlayer.specialsUsed = (currentPlayer.specialsUsed || 0) + 1;
        spawnDonpachi(currentRoom, currentPlayer, target);
        return;
      }

      const target = nearestEnemy(currentRoom, currentPlayer, ashinagaRange, true);
      if (charge < 4 || !target) {
        send(currentPlayer.ws, { type: "error", message: "アシナガバチは4キル、近距離で発動可能です。" });
        return;
      }
      currentPlayer.donPunchCharge -= 4;
      currentPlayer.specialsUsed = (currentPlayer.specialsUsed || 0) + 1;
      const origin = { x: currentPlayer.x, y: currentPlayer.y, z: currentPlayer.z };
      const targetPoint = { x: target.x, y: target.y, z: target.z };
      addFeed(currentRoom, `${currentPlayer.name} がアシナガバチを刺した`, currentPlayer.color);
      broadcast(currentRoom, { type: "ashinaga", shooter: currentPlayer.id, origin, target: targetPoint });
      applyDirectDamage(currentRoom, currentPlayer, target, ashinagaDamage, "アシナガバチ");
      return;
    }

    if (message.type === "shoot") {
      if (currentPlayer.eliminated || currentPlayer.health <= 0) return;
      const origin = vectorFrom(message.origin);
      const direction = normalize(vectorFrom(message.direction));
      const weapon = String(message.weapon);
      const range = weaponRange.get(weapon) || 70;
      currentRoom.weaponStats[weapon] = (currentRoom.weaponStats[weapon] || 0) + 1;
      currentPlayer.lastWeapon = weapon;
      applyShot(currentRoom, currentPlayer, origin, direction, weapon);
      broadcast(currentRoom, { type: "shot", shooter: currentPlayer.id, origin, direction, range, weapon });
      return;
    }

    if (message.type === "ping") {
      currentPlayer.lastSeen = Date.now();
      send(currentPlayer.ws, { type: "pong", at: Number(message.at) || 0, serverAt: Date.now() });
      return;
    }

    if (message.type === "pong") {
      currentPlayer.lastSeen = Date.now();
    }
  });

  ws.on("close", () => {
    if (!currentRoom || !currentPlayer) return;
    currentRoom.players.delete(currentPlayer.id);
    addFeed(currentRoom, `${currentPlayer.name} が退出`, currentPlayer.color);
    broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
    const humans = [...currentRoom.players.values()].filter((player) => !player.isBot);
    if (humans.length === 0) rooms.delete(currentRoom.code);
    else syncMatchCpuFill(currentRoom);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    let removedHuman = false;
    for (const player of room.players.values()) {
    if (!player.isBot && now - player.lastSeen > 45_000) {
        player.ws.close();
        room.players.delete(player.id);
        removedHuman = true;
      }
    }
    if (humanPlayers(room).length === 0) {
      rooms.delete(room.code);
      continue;
    }
    if (removedHuman) syncMatchCpuFill(room);
    updateBarrierRespawn(room, now);
    updateHealthPickup(room, now);
    updateDonPunchProjectiles(room, now);
    updateCpuPlayers(room, now);
    resolveCastleRoundByTimer(room, now);
    const players = [...room.players.values()].map(publicPlayer);
    const blueScore = players.filter((p) => p.color === "blue").reduce((sum, p) => sum + p.score, 0);
    const redScore = players.filter((p) => p.color === "red").reduce((sum, p) => sum + p.score, 0);
    const donPunches = [...room.donPunches.values()].map((punch) => ({
      id: punch.id,
      shooterId: punch.shooterId,
      targetId: punch.targetId,
      x: punch.x,
      y: punch.y,
      z: punch.z,
      expiresAt: punch.expiresAt,
      type: punch.type
    }));
    broadcast(room, {
      type: "snapshot",
      players,
      blueScore,
      redScore,
      feed: room.feed,
      chat: room.chat,
      now,
      winner: room.winner,
      gameMode: room.mode,
      arena: room.arena,
      partySize: room.partySize || 1,
      cpuFill: room.cpuFill,
      maxPlayers: room.maxHumanPlayers || maxPlayers,
      targetScore: room.targetScore || 0,
      castleCores: room.castleCores,
      castleEndsAt: room.castleEndsAt || 0,
      donPunches,
      barrier: room.barrier,
      healthPickup: room.healthPickup
    });
  }
}, 110);

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function vectorFrom(value) {
  return {
    x: Number(value?.x) || 0,
    y: Number(value?.y) || 0,
    z: Number(value?.z) || 0
  };
}

function normalize(value) {
  const length = Math.hypot(value.x, value.y, value.z) || 1;
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}

function safeColor(value) {
  const color = String(value || "");
  return /^#[0-9a-f]{6}$/i.test(color) ? color : null;
}

function applyShot(room, shooter, origin, direction, weapon = "rifle") {
  const baseDamage = weaponDamage.get(weapon) || 25;
  const damage = shooter.isBot ? Math.max(8, Math.ceil(baseDamage * 0.68)) : baseDamage;
  const range = weaponRange.get(weapon) || 70;
  let best;
  let bestDistance = Infinity;
  let bestTargetDistance = Infinity;
  for (const target of room.players.values()) {
    if (target.id === shooter.id || target.creative || target.eliminated || target.health <= 0 || target.color === shooter.color) continue;
    const targetDistance = projectionToRay({ x: target.x, y: target.y, z: target.z }, origin, direction);
    if (targetDistance < 0 || targetDistance > range || lineBlocked(origin, direction, targetDistance, room.arena)) continue;
    const distance = distanceToRay({ x: target.x, y: target.y, z: target.z }, origin, direction, range);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTargetDistance = targetDistance;
      best = target;
    }
  }

  const coreHit = room.mode === "castle" ? nearestCastleCoreHit(room, shooter, origin, direction, range) : null;
  if (coreHit && (!best || coreHit.targetDistance < bestTargetDistance)) {
    applyCastleCoreDamage(room, shooter, coreHit.core, damage);
    return;
  }

  if (!best || bestDistance >= 0.8) return;
  applyDirectDamage(room, shooter, best, damage, weapon);
}

function nearestCastleCoreHit(room, shooter, origin, direction, range) {
  let best = null;
  for (const core of Object.values(room.castleCores || {})) {
    if (!core || core.team === shooter.color || core.health <= 0) continue;
    const targetDistance = projectionToRay(core, origin, direction);
    if (targetDistance < 0 || targetDistance > range || lineBlocked(origin, direction, targetDistance, room.arena)) continue;
    const missDistance = distanceToRay(core, origin, direction, range);
    if (missDistance > castleCoreRadius) continue;
    if (!best || targetDistance < best.targetDistance) best = { core, targetDistance };
  }
  return best;
}

function applyCastleCoreDamage(room, shooter, core, damage) {
  if (room.winner || !core || core.health <= 0) return;
  const scaledDamage = Math.max(10, Math.round(damage * 1.1));
  const appliedDamage = Math.min(core.health, scaledDamage);
  core.health = Math.max(0, core.health - scaledDamage);
  shooter.score += 1;
  shooter.hits = (shooter.hits || 0) + 1;
  shooter.damageDealt = (shooter.damageDealt || 0) + appliedDamage;
  addFeed(room, `${shooter.name} が敵の白を攻撃`, shooter.color);
  broadcast(room, { type: "hit", shooter: shooter.id, shooterName: shooter.name, target: `${core.team}-castle-core`, damage: scaledDamage, weapon: "白攻撃" });
}

function resolveCastleRoundByTimer(room, now) {
  if (room.mode !== "castle" || room.winner || !room.castleEndsAt || now < room.castleEndsAt) return;
  const blueHp = room.castleCores?.blue?.health || 0;
  const redHp = room.castleCores?.red?.health || 0;
  let winnerColor = blueHp > redHp ? "blue" : redHp > blueHp ? "red" : "";
  if (!winnerColor) {
    const blueScore = [...room.players.values()]
      .filter((player) => player.color === "blue")
      .reduce((sum, player) => sum + player.score, 0);
    const redScore = [...room.players.values()]
      .filter((player) => player.color === "red")
      .reduce((sum, player) => sum + player.score, 0);
    winnerColor = blueScore > redScore ? "blue" : redScore > blueScore ? "red" : "";
  }
  if (!winnerColor) {
    room.winner = { color: "blue", name: "引き分け", at: now };
    addFeed(room, "城攻め 引き分け！", "blue");
    broadcast(room, { type: "celebration", winner: room.winner });
    return;
  }
  room.winner = {
    color: winnerColor,
    name: winnerColor === "blue" ? "ブルーチーム" : "レッドチーム",
    at: now
  };
  addFeed(room, `${room.winner.name} が残HPで城攻め勝利！`, winnerColor);
  broadcast(room, { type: "celebration", winner: room.winner });
}

function applyDirectDamage(room, shooter, target, damage, weapon = "銃ダメージ") {
  if (target.creative) {
    broadcast(room, { type: "hit", shooter: shooter.id, shooterName: shooter.name, target: target.id, damage: 0, blocked: true, weapon });
    return;
  }
  if ((target.shieldUntil || 0) > Date.now()) {
    addFeed(room, `${target.name} がバリアで防いだ`, target.color);
    broadcast(room, { type: "hit", shooter: shooter.id, shooterName: shooter.name, target: target.id, damage: 0, blocked: true, weapon });
    return;
  }
  const appliedDamage = Math.min(target.health, damage);
  target.health = Math.max(0, target.health - damage);
  shooter.hits = (shooter.hits || 0) + 1;
  shooter.damageDealt = (shooter.damageDealt || 0) + appliedDamage;
  target.damageTaken = (target.damageTaken || 0) + appliedDamage;
  if (target.health === 0) {
    shooter.score += 1;
    shooter.kills += 1;
    shooter.donPunchCharge = Math.min(8, (shooter.donPunchCharge || 0) + 1);
    target.deaths += 1;
    addFeed(room, `${shooter.name} が ${target.name} をヒット`, shooter.color);
    if (!target.isBot) {
      send(target.ws, {
        type: "death_info",
        shooter: shooter.name,
        weapon,
        from: { x: shooter.x, y: shooter.y, z: shooter.z }
      });
    }
    handleDeath(room, shooter, target);
  } else {
    addFeed(room, `${shooter.name} -> ${target.name}`, shooter.color);
  }
  broadcast(room, { type: "hit", shooter: shooter.id, shooterName: shooter.name, target: target.id, damage, weapon });
}

function handleDeath(room, shooter, target) {
  if (room.mode === "castle") {
    respawnPlayer(target);
    return;
  }

  if (room.mode === "life3") {
    target.lives = Math.max(0, (target.lives || 3) - 1);
    if (target.lives <= 0) {
      target.eliminated = true;
      target.health = 0;
      addFeed(room, `${target.name} ライフ終了`, target.color);
      checkSurvivalWinner(room, shooter);
      return;
    }
    respawnPlayer(target);
    addFeed(room, `${target.name} 残りライフ${target.lives}`, target.color);
    return;
  }

  target.eliminated = true;
  target.health = 0;
  target.lives = 0;
  addFeed(room, `${target.name} 脱落`, target.color);
  checkSurvivalWinner(room, shooter);
}

function respawnPlayer(player) {
  const spawn = spawnPoint(Math.floor(Math.random() * 16));
  Object.assign(player, spawn, { health: maxHealth, eliminated: false });
  if (!player.isBot) send(player.ws, { type: "respawn", target: player.id, spawn });
}

function checkSurvivalWinner(room, shooter) {
  if (room.winner) return;
  const aliveTeams = new Set([...room.players.values()]
    .filter((player) => !player.eliminated && player.health > 0)
    .map((player) => player.color));
  const activeTeams = new Set([...room.players.values()].map((player) => player.color));
  if (activeTeams.size < 2 || aliveTeams.size !== 1) return;
  const color = [...aliveTeams][0];
  room.winner = {
    color,
    name: color === "blue" ? "ブルーチーム" : "レッドチーム",
    at: Date.now()
  };
  addFeed(room, `${room.winner.name} 勝利！`, shooter.color);
  broadcast(room, { type: "celebration", winner: room.winner });
}

function applyHadeonBurst(room, shooter) {
  shooter.specialsUsed = (shooter.specialsUsed || 0) + 1;
  addFeed(room, `${shooter.name} が銃ダメージ`, shooter.color);
  for (const target of room.players.values()) {
    if (target.id === shooter.id || target.creative || target.eliminated || target.health <= 0) continue;
    applyDirectDamage(room, shooter, target, 95, "銃ダメージ");
  }
  broadcast(room, { type: "feed", feed: room.feed });
}

function nearestEnemy(room, shooter, maxDistance = Infinity, requireLineOfSight = false) {
  let best;
  let bestDistance = Infinity;
  for (const target of room.players.values()) {
    if (target.id === shooter.id || target.creative || target.eliminated || target.health <= 0 || target.color === shooter.color) continue;
    const distance = Math.hypot(target.x - shooter.x, target.y - shooter.y, target.z - shooter.z);
    if (distance > maxDistance) continue;
    if (requireLineOfSight) {
      const origin = { x: shooter.x, y: shooter.y, z: shooter.z };
      const direction = normalize({ x: target.x - shooter.x, y: target.y - shooter.y, z: target.z - shooter.z });
      if (lineBlocked(origin, direction, distance, room.arena)) continue;
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      best = target;
    }
  }
  return best;
}

function setCpuCount(room, count) {
  const target = Math.min(maxCpuPlayers, Math.max(0, Math.floor(count)));
  if (room.mode === "castle" && !room.playerTeam) room.playerTeam = "blue";
  const cpuTeam = room.mode === "castle" ? oppositeTeam(room.playerTeam || "blue") : "";
  for (const player of [...room.players.values()]) {
    if (player.isBot && Number(player.botIndex) >= target) room.players.delete(player.id);
  }
  for (let i = 0; i < target; i += 1) {
    const id = `cpu-${room.code}-${i}`;
    if (room.players.has(id)) continue;
    const spawn = spawnPoint(i + 3);
    room.players.set(id, {
      id,
      ws: null,
      name: `CPU-${i + 1}`,
      color: cpuTeam || (i % 2 === 0 ? "red" : "blue"),
      cosmeticColor: (cpuTeam || (i % 2 === 0 ? "red" : "blue")) === "red" ? "#ff4d4d" : "#1598f0",
      ready: true,
      health: maxHealth,
      score: 0,
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      damageTaken: 0,
      hits: 0,
      healsUsed: 0,
      specialsUsed: 0,
      barrierPickups: 0,
      lives: initialLivesForMode(room.mode),
      eliminated: false,
      creative: false,
      healPacks: initialHealPacks,
      donPunchCharge: 0,
      yaw: spawn.yaw,
      pitch: 0,
      lastSeen: Date.now(),
      isBot: true,
      botIndex: i,
      botPhase: Math.random() * Math.PI * 2,
      botWeapon: ["ak47", "aug", "type95", "smg"][i % 4],
      nextWeaponSwitchAt: Date.now() + 1100 + i * 420,
      nextShotAt: Date.now() + 1100 + i * 280,
      ...spawn
    });
  }
  room.cpuCount = target;
}

function createCpuPlayer(room, id, index, team) {
  const spawn = spawnPoint(index + 3);
  return {
    id,
    ws: null,
    name: `CPU-${index + 1}`,
    color: team,
    cosmeticColor: team === "red" ? "#ff4d4d" : "#1598f0",
    ready: true,
    health: maxHealth,
    score: 0,
    kills: 0,
    deaths: 0,
    damageDealt: 0,
    damageTaken: 0,
    hits: 0,
    healsUsed: 0,
    specialsUsed: 0,
    barrierPickups: 0,
    lives: initialLivesForMode(room.mode),
    eliminated: false,
    creative: false,
    healPacks: initialHealPacks,
    donPunchCharge: 0,
    yaw: spawn.yaw,
    pitch: 0,
    lastSeen: Date.now(),
    isBot: true,
    matchBot: true,
    botIndex: index,
    botPhase: Math.random() * Math.PI * 2,
    botWeapon: ["ak47", "aug", "type95", "smg", "marksman", "rifle", "awm"][index % 7],
    nextWeaponSwitchAt: Date.now() + 1100 + index * 420,
    nextShotAt: Date.now() + 1100 + index * 280,
    ...spawn
  };
}

function syncMatchCpuFill(room) {
  if (!room.matchmaking) return;
  for (const player of [...room.players.values()]) {
    if (player.isBot) room.players.delete(player.id);
  }
  if (!room.cpuFill) {
    room.cpuCount = 0;
    if (!room.matchStarted && humanPlayers(room).length > 0) {
      room.matchStarted = true;
      addFeed(room, "CPUなしバトル開始", "blue");
    }
    return;
  }
  const teamTarget = matchTeamSize;
  const counts = { blue: 0, red: 0 };
  for (const player of humanPlayers(room)) {
    if (player.color === "blue" || player.color === "red") counts[player.color] += 1;
  }
  let botIndex = 0;
  for (const team of ["blue", "red"]) {
    const needed = Math.max(0, teamTarget - counts[team]);
    for (let i = 0; i < needed && botIndex < maxCpuPlayers && room.players.size < maxPlayers; i += 1) {
      const id = `cpu-${room.code}-match-${team}-${i}`;
      room.players.set(id, createCpuPlayer(room, id, botIndex, team));
      botIndex += 1;
    }
  }
  room.cpuCount = botIndex;
  if (!room.matchStarted && humanPlayers(room).length > 0) {
    room.matchStarted = true;
    addFeed(room, `自動マッチ開始 ${teamTarget}対${teamTarget}`, "blue");
  }
}

function applyRoomConfig(room, host, mode, teamChoice, cpuFill = room.cpuFill) {
  const nextMode = normalizeGameMode(mode);
  const requestedTeam = teams.has(String(teamChoice || "")) ? String(teamChoice) : "";
  room.mode = nextMode;
  room.cpuFill = normalizeCpuFill(cpuFill);
  room.targetScore = 0;
  room.playerTeam = nextMode === "castle" ? requestedTeam || host.color || "blue" : null;

  if (nextMode === "castle") {
    for (const player of room.players.values()) {
      player.color = player.isBot ? oppositeTeam(room.playerTeam) : room.playerTeam;
      player.cosmeticColor = player.cosmeticColor || (player.color === "blue" ? "#1598f0" : "#ff4d4d");
    }
  } else if (requestedTeam) {
    host.color = requestedTeam;
    host.cosmeticColor = host.cosmeticColor || (requestedTeam === "blue" ? "#1598f0" : "#ff4d4d");
  }

  resetRoomScores(room);
  if (room.matchmaking) {
    syncMatchCpuFill(room);
    return;
  }
  if (room.cpuCount > 0) {
    const cpuCount = room.cpuCount;
    setCpuCount(room, 0);
    setCpuCount(room, cpuCount);
  }
}

function resetRoomScores(room) {
  room.winner = null;
  room.weaponStats = {};
  room.movementStats = { samples: 0, moving: 0, airborne: 0 };
  if (room.mode === "castle" && !room.playerTeam) {
    const firstHuman = [...room.players.values()].find((player) => !player.isBot);
    room.playerTeam = firstHuman?.color || "blue";
  }
  let index = 0;
  for (const player of room.players.values()) {
    player.score = 0;
    player.kills = 0;
    player.deaths = 0;
    player.damageDealt = 0;
    player.damageTaken = 0;
    player.hits = 0;
    player.healsUsed = 0;
    player.specialsUsed = 0;
    player.barrierPickups = 0;
    player.lives = initialLivesForMode(room.mode);
    player.eliminated = false;
    player.creative = false;
    player.healPacks = initialHealPacks;
    player.donPunchCharge = 0;
    player.health = maxHealth;
    player.shieldUntil = 0;
    const spawn = spawnPoint(index);
    Object.assign(player, spawn);
    if (!player.isBot) send(player.ws, { type: "respawn", target: player.id, spawn });
    index += 1;
  }
  if (room.mode !== "castle") room.playerTeam = null;
  room.donPunches.clear();
  room.castleCores = createCastleCores(room.playerTeam || "blue");
  room.castleEndsAt = room.mode === "castle" ? Date.now() + castleRoundMs : 0;
  room.barrier = { ...barrierSpawn, available: true, pickedBy: "", respawnAt: 0 };
  room.healthPickup = { ...randomPickupSpawn(room.arena), available: false, respawnAt: room.mode === "oneLife" ? nextHealthPickupAt() : 0 };
}

function tryPickupBarrier(room, player) {
  if (!room.barrier?.available || player.isBot || player.health <= 0) return;
  const distance = Math.hypot(player.x - room.barrier.x, player.y - room.barrier.y, player.z - room.barrier.z);
  if (distance > 1.8) return;
  room.barrier.available = false;
  room.barrier.pickedBy = player.name;
  room.barrier.respawnAt = Date.now() + barrierRespawnMs;
  player.shieldUntil = Date.now() + barrierDurationMs;
  player.barrierPickups = (player.barrierPickups || 0) + 1;
  addFeed(room, `${player.name} が隠しバリアを拾った`, player.color);
  send(player.ws, { type: "sound", sound: "barrier" });
  broadcast(room, { type: "feed", feed: room.feed });
}

function updateBarrierRespawn(room, now) {
  if (!room.barrier || room.barrier.available || !room.barrier.respawnAt) return;
  if (now < room.barrier.respawnAt) return;
  room.barrier = { ...barrierSpawn, available: true, pickedBy: "", respawnAt: 0 };
  addFeed(room, "隠しバリアが再出現", "blue");
  broadcast(room, { type: "feed", feed: room.feed });
}

function tryPickupHealth(room, player) {
  if (room.mode !== "oneLife" || !room.healthPickup?.available || player.eliminated || player.health <= 0) return;
  const distance = Math.hypot(player.x - room.healthPickup.x, player.y - room.healthPickup.y, player.z - room.healthPickup.z);
  if (distance > 1.9) return;
  player.health = maxHealth;
  player.healsUsed = (player.healsUsed || 0) + 1;
  room.healthPickup.available = false;
  room.healthPickup.respawnAt = nextHealthPickupAt();
  addFeed(room, `${player.name} が全回復アイテムを取得`, player.color);
  send(player.ws, { type: "sound", sound: "heal" });
  broadcast(room, { type: "feed", feed: room.feed });
}

function updateHealthPickup(room, now) {
  if (room.mode !== "oneLife") {
    if (room.healthPickup) room.healthPickup.available = false;
    return;
  }
  if (!room.healthPickup) room.healthPickup = { ...randomPickupSpawn(room.arena), available: false, respawnAt: nextHealthPickupAt(now) };
  if (room.healthPickup.available || now < room.healthPickup.respawnAt) return;
  Object.assign(room.healthPickup, randomPickupSpawn(room.arena), { available: true, respawnAt: 0 });
  addFeed(room, "全回復アイテム出現", "blue");
  broadcast(room, { type: "feed", feed: room.feed });
}

function spawnDonpachi(room, shooter, target) {
  const origin = { x: shooter.x, y: shooter.y, z: shooter.z };
  const id = crypto.randomUUID();
  room.donPunches.set(id, {
    id,
    type: "donpachi",
    shooterId: shooter.id,
    targetId: target.id,
    x: origin.x,
    y: origin.y + 0.25,
    z: origin.z,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    expiresAt: Date.now() + donpachiLifeMs
  });
  addFeed(room, `${shooter.name} がドンパチを放った`, shooter.color);
  broadcast(room, { type: "feed", feed: room.feed });
}

function updateDonPunchProjectiles(room, now) {
  for (const punch of room.donPunches.values()) {
    const shooter = room.players.get(punch.shooterId);
    const target = room.players.get(punch.targetId);
    if (!shooter || !target || target.health <= 0 || now >= punch.expiresAt) {
      room.donPunches.delete(punch.id);
      continue;
    }

    const delta = Math.min(0.12, Math.max(0.016, (now - punch.updatedAt) / 1000));
    punch.updatedAt = now;
    const direction = normalize({ x: target.x - punch.x, y: target.y + 0.35 - punch.y, z: target.z - punch.z });
    const step = donpachiSpeed * delta;
    const distance = Math.hypot(target.x - punch.x, target.y + 0.35 - punch.y, target.z - punch.z);
    if (distance <= Math.max(0.9, step + 0.32)) {
      room.donPunches.delete(punch.id);
      applyDirectDamage(room, shooter, target, donpachiDamage, "ドンパチ");
      continue;
    }
    punch.x += direction.x * step;
    punch.y += direction.y * step;
    punch.z += direction.z * step;
  }
}

function updateCpuPlayers(room, now) {
  const samples = room.movementStats.samples || 0;
  const movingRatio = samples ? room.movementStats.moving / samples : 0;
  const airborneRatio = samples ? room.movementStats.airborne / samples : 0;
  for (const bot of room.players.values()) {
    if (!bot.isBot) continue;
    if (bot.eliminated || bot.health <= 0) {
      bot.lastSeen = now;
      continue;
    }
    const phase = (now / 1000) * 0.34 + bot.botPhase;
    const radius = 16 + bot.botIndex * 8.5;
    const attackCore = room.mode === "castle" ? room.castleCores?.[oppositeTeam(bot.color)] : null;
    const coreOrbit = 13 + bot.botIndex * 1.8;
    const desiredX = attackCore?.health > 0
      ? clamp(attackCore.x + Math.cos(phase + bot.botIndex) * coreOrbit, -arenaHalfSize + 2, arenaHalfSize - 2)
      : clamp(Math.cos(phase) * radius, -arenaHalfSize + 2, arenaHalfSize - 2);
    const desiredZ = attackCore?.health > 0
      ? clamp(attackCore.z + Math.sin(phase + bot.botIndex) * coreOrbit, -arenaHalfSize + 2, arenaHalfSize - 2)
      : clamp(Math.sin(phase * 0.9) * radius, -arenaHalfSize + 2, arenaHalfSize - 2);
    bot.learnedSpeedBoost = samples > 30 && movingRatio > 0.62 ? 0.38 : 0;
    bot.learnedAirborneBias = samples > 30 && airborneRatio > 0.16;
    moveCpuAlongWalls(bot, desiredX, desiredZ, now, room.arena);
    keepCpuOutOfWalls(bot, room.arena);
    bot.y = 1.6;
    bot.lastSeen = now;
    const targets = [...room.players.values()].filter((player) => player.id !== bot.id && !player.creative && !player.eliminated && player.health > 0 && player.color !== bot.color);
    if ((targets.length > 0 || attackCore?.health > 0) && now >= bot.nextShotAt) {
      if (attackCore?.health > 0) {
        const distance = Math.hypot(attackCore.x - bot.x, attackCore.y - bot.y, attackCore.z - bot.z);
        if (now >= (bot.nextWeaponSwitchAt || 0)) {
          bot.botWeapon = chooseCpuWeapon(room, distance, bot.botIndex);
          bot.nextWeaponSwitchAt = now + 2300 + bot.botIndex * 260;
        }
        const weapon = bot.botWeapon || "rifle";
        const weaponRangeLimit = cpuWeaponMaxRange.get(weapon) || 34;
        const origin = { x: bot.x, y: bot.y, z: bot.z };
        const direction = normalize({ x: attackCore.x - bot.x, y: attackCore.y - bot.y, z: attackCore.z - bot.z });
        const targetDistance = projectionToRay(attackCore, origin, direction);
        bot.yaw = Math.atan2(direction.x, direction.z);
        bot.pitch = Math.asin(clamp(direction.y, -1, 1));
        if (targetDistance > 0 && targetDistance <= weaponRangeLimit && !lineBlocked(origin, direction, targetDistance, room.arena)) {
          const baseDamage = weaponDamage.get(weapon) || 25;
          const damage = Math.max(8, Math.ceil(baseDamage * 0.68));
          applyCastleCoreDamage(room, bot, attackCore, damage);
          broadcast(room, { type: "shot", shooter: bot.id, origin, direction, range: weaponRangeLimit, weapon });
          bot.nextShotAt = now + cpuFireDelay(bot.botWeapon || "rifle") + bot.botIndex * 110;
          continue;
        }
      }

      if (targets.length === 0) {
        bot.nextShotAt = now + 360 + bot.botIndex * 60;
        continue;
      }

      const visibleTarget = targets
        .map((player) => {
          const distance = Math.hypot(player.x - bot.x, player.y - bot.y, player.z - bot.z);
          const direction = normalize({ x: player.x - bot.x, y: player.y - bot.y, z: player.z - bot.z });
          const targetDistance = projectionToRay(player, { x: bot.x, y: bot.y, z: bot.z }, direction);
          return { player, distance, direction, targetDistance };
        })
        .filter((entry) => entry.targetDistance > 0 && !lineBlocked({ x: bot.x, y: bot.y, z: bot.z }, entry.direction, entry.targetDistance, room.arena))
        .sort((a, b) => a.distance - b.distance)[0];
      if (!visibleTarget) {
        bot.nextShotAt = now + 280 + bot.botIndex * 45;
        continue;
      }
      const target = visibleTarget.player;
      const distance = Math.hypot(target.x - bot.x, target.y - bot.y, target.z - bot.z);
      if (now >= (bot.nextWeaponSwitchAt || 0)) {
        bot.botWeapon = chooseCpuWeapon(room, distance, bot.botIndex);
        bot.nextWeaponSwitchAt = now + 2300 + bot.botIndex * 260;
      }
      const weapon = bot.botWeapon || "rifle";
      const weaponRangeLimit = cpuWeaponMaxRange.get(weapon) || 34;
      const origin = { x: bot.x, y: bot.y, z: bot.z };
      const direction = normalize({ x: target.x - bot.x, y: target.y - bot.y, z: target.z - bot.z });
      bot.yaw = Math.atan2(direction.x, direction.z);
      bot.pitch = Math.asin(clamp(direction.y, -1, 1));
      const targetDistance = projectionToRay(target, origin, direction);
      const aimMissDistance = distanceToRay({ x: target.x, y: target.y, z: target.z }, origin, direction, weaponRangeLimit);
      if (
        targetDistance > 0 &&
        targetDistance <= weaponRangeLimit &&
        aimMissDistance < 0.9 &&
        !lineBlocked(origin, direction, targetDistance, room.arena)
      ) {
        applyShot(room, bot, origin, direction, weapon);
        broadcast(room, { type: "shot", shooter: bot.id, origin, direction, range: weaponRangeLimit, weapon });
      }
      bot.nextShotAt = now + cpuFireDelay(bot.botWeapon || "rifle") + bot.botIndex * 110;
    } else if (targets.length > 0) {
      const target = targets[0];
      bot.yaw = Math.atan2(target.x - bot.x, target.z - bot.z);
    } else {
      bot.yaw = phase + Math.PI / 2;
    }
  }
}

function dominantHumanWeapon(room) {
  let bestWeapon = "";
  let bestCount = 0;
  for (const [weapon, count] of Object.entries(room.weaponStats || {})) {
    if (!weaponRange.has(weapon) || weapon === "cpu") continue;
    if (count > bestCount) {
      bestWeapon = weapon;
      bestCount = count;
    }
  }
  return bestCount >= 8 ? bestWeapon : "";
}

function chooseCpuWeapon(room, distance, index = 0) {
  const popular = dominantHumanWeapon(room);
  const samples = room.movementStats.samples || 0;
  const airborneRatio = samples ? room.movementStats.airborne / samples : 0;
  if (distance > 78) return airborneRatio > 0.14 ? "awm" : "marksman";
  if (distance > 58) return popular === "awm" ? "awm" : index % 2 === 0 ? "aug" : "marksman";
  if (distance > 42) return popular === "aug" || popular === "type95" ? popular : index % 2 === 0 ? "ak47" : "aug";
  if (distance < 16) return popular === "shotgun" ? "shotgun" : index % 2 === 0 ? "shotgun" : "smg";
  if (popular === "ak47" || popular === "aug" || popular === "type95" || popular === "smg") return popular;
  return index % 2 === 0 ? "type95" : "ak47";
}

function cpuFireDelay(weapon) {
  return {
    rifle: 980,
    ak47: 1080,
    aug: 940,
    smg: 780,
    shotgun: 1500,
    marksman: 1650,
    awm: 2100,
    type95: 1120
  }[weapon] || 1050;
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Toybox FPS Arena running at http://localhost:${port}`);
});
