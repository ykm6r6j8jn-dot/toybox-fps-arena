import { createServer } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 5188);
const maxPlayers = 20;
const maxCpuPlayers = 19;
const maxWsMessageBytes = 8192;
const maxHttpJsonBytes = 12_288;
const pokerStartingChips = 2000;
const pokerTurnMs = 10_000;
const pokerSmallBlind = 10;
const pokerBigBlind = 20;
const maxPokerSeats = 6;
const maxPokerCpus = 5;
const pokerJankenChoices = new Set(["rock", "scissors", "paper"]);
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
const powerupRespawnMs = 18_000;
const powerupDurationMs = 10_000;
const powerupKinds = ["speed", "ammo", "damage", "comeback"];
const powerupSpawns = [
  { x: -58, y: 1.6, z: -24 },
  { x: 42, y: 1.6, z: -58 },
  { x: 64, y: 1.6, z: 34 },
  { x: -28, y: 1.6, z: 72 },
  { x: 4, y: 9.6, z: -82 },
  { x: 82, y: 5.0, z: -8 }
];
const initialHealPacks = 5;
const healPackAmount = 20;
const gameModes = new Set(["oneLife", "practice", "life3", "castle"]);
const partySizes = new Set([1, 2, 4]);
const arenas = new Set(["toybox"]);
const teams = new Set(["blue", "red"]);
const relationModes = new Set(["versus", "coop"]);
const skins = new Set(["rounded", "scout", "heavy", "bee"]);
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
const allowedWeapons = new Set(weaponDamage.keys());
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

function securityHeaders(contentType = "text/plain; charset=utf-8") {
  return {
    "content-type": contentType,
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "content-security-policy": "default-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
  };
}

function safeDecodePath(url = "/") {
  const rawPath = String(url || "/").split("?")[0];
  if (rawPath.length > 2048) return { error: 414, path: "" };
  try {
    const decoded = decodeURIComponent(rawPath);
    return { error: 0, path: decoded.startsWith("/") ? decoded : `/${decoded}` };
  } catch {
    return { error: 400, path: "" };
  }
}

function normalizeRoomCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function cleanText(value, maxLength, fallback = "") {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const clipped = [...normalized].slice(0, maxLength).join("").trim();
  return clipped || fallback;
}

function sanitizePlayerName(value) {
  return cleanText(value, 14, "プレイヤー").replace(/[<>]/g, "").trim() || "プレイヤー";
}

function sanitizeChatText(value) {
  return cleanText(value, 80, "");
}

function normalizeLoginId(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 32);
}

function profileHash(loginId) {
  return createHash("sha256").update(`donpachi-profile-v1:${loginId}`).digest("hex");
}

function emptyProgress() {
  return {
    xp: 0,
    sessions: 0,
    streakDays: 0,
    lastPlayDate: "",
    bestScore: 0,
    bestKills: 0,
    pokerWins: 0,
    lastReward: ""
  };
}

function sanitizeProgress(progress = {}) {
  const base = emptyProgress();
  return {
    xp: clamp(Math.floor(Number(progress.xp) || base.xp), 0, 9_999_999),
    sessions: clamp(Math.floor(Number(progress.sessions) || base.sessions), 0, 999_999),
    streakDays: clamp(Math.floor(Number(progress.streakDays) || base.streakDays), 0, 3650),
    lastPlayDate: /^\d{4}-\d{2}-\d{2}$/.test(String(progress.lastPlayDate || "")) ? String(progress.lastPlayDate) : base.lastPlayDate,
    bestScore: clamp(Math.floor(Number(progress.bestScore) || base.bestScore), 0, 999_999),
    bestKills: clamp(Math.floor(Number(progress.bestKills) || base.bestKills), 0, 99_999),
    pokerWins: clamp(Math.floor(Number(progress.pokerWins) || base.pokerWins), 0, 99_999),
    lastReward: cleanText(progress.lastReward, 48, base.lastReward)
  };
}

function sanitizeInventory(inventory = {}) {
  const healPacks = Number.isFinite(Number(inventory.healPacks)) ? Number(inventory.healPacks) : initialHealPacks;
  const pokerDon = Number.isFinite(Number(inventory.pokerDon)) ? Number(inventory.pokerDon) : pokerStartingChips;
  return {
    healPacks: clamp(Math.floor(healPacks), 0, 12),
    pokerDon: clamp(Math.floor(pokerDon), 0, 999_999),
    barrierCharges: clamp(Math.floor(Number(inventory.barrierCharges) || 0), 0, 9),
    boostTickets: clamp(Math.floor(Number(inventory.boostTickets) || 0), 0, 99)
  };
}

function levelFromXp(xp = 0) {
  return Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 120)) + 1;
}

function makeProfile() {
  const now = Date.now();
  return {
    name: "プレイヤー",
    skin: "rounded",
    cosmeticColor: "#1598f0",
    progress: emptyProgress(),
    inventory: sanitizeInventory(),
    createdAt: now,
    updatedAt: now
  };
}

async function loadProfileStore() {
  try {
    const parsed = JSON.parse(await readFile(profileStorePath, "utf8"));
    return {
      version: 1,
      profiles: parsed && typeof parsed.profiles === "object" && parsed.profiles ? parsed.profiles : {}
    };
  } catch {
    return { version: 1, profiles: {} };
  }
}

async function saveProfileStore() {
  await mkdir(resolve(profileStorePath, ".."), { recursive: true });
  await writeFile(profileStorePath, JSON.stringify(profileStore, null, 2), "utf8");
}

function getProfile(loginId) {
  const normalized = normalizeLoginId(loginId);
  if (normalized.length < 6) return null;
  return profileStore.profiles[profileHash(normalized)] || null;
}

function getOrCreateProfile(loginId) {
  const normalized = normalizeLoginId(loginId);
  if (normalized.length < 6) return null;
  const key = profileHash(normalized);
  profileStore.profiles[key] ||= makeProfile();
  return { key, profile: profileStore.profiles[key] };
}

function mergeProfile(profile, payload = {}) {
  if (!profile) return null;
  if (payload.name !== undefined) profile.name = sanitizePlayerName(payload.name);
  if (payload.skin !== undefined) profile.skin = normalizeSkin(payload.skin);
  if (payload.cosmeticColor !== undefined) profile.cosmeticColor = safeColor(payload.cosmeticColor) || profile.cosmeticColor || "#1598f0";
  if (payload.progress && typeof payload.progress === "object") {
    const next = sanitizeProgress(payload.progress);
    const current = sanitizeProgress(profile.progress);
    profile.progress = {
      ...current,
      ...next,
      xp: Math.max(current.xp, next.xp),
      sessions: Math.max(current.sessions, next.sessions),
      streakDays: Math.max(current.streakDays, next.streakDays),
      bestScore: Math.max(current.bestScore, next.bestScore),
      bestKills: Math.max(current.bestKills, next.bestKills),
      pokerWins: Math.max(current.pokerWins, next.pokerWins),
      lastReward: next.lastReward || current.lastReward
    };
  } else {
    profile.progress = sanitizeProgress(profile.progress);
  }
  if (payload.inventory && typeof payload.inventory === "object") {
    const next = sanitizeInventory(payload.inventory);
    const current = sanitizeInventory(profile.inventory);
    profile.inventory = {
      healPacks: clamp(Math.floor(Number(next.healPacks)), 0, 12),
      pokerDon: Math.max(current.pokerDon, next.pokerDon),
      barrierCharges: Math.max(current.barrierCharges, next.barrierCharges),
      boostTickets: Math.max(current.boostTickets, next.boostTickets)
    };
  } else {
    profile.inventory = sanitizeInventory(profile.inventory);
  }
  profile.updatedAt = Date.now();
  return profile;
}

function publicProfile(profile) {
  const progress = sanitizeProgress(profile?.progress);
  const inventory = sanitizeInventory(profile?.inventory);
  return {
    name: sanitizePlayerName(profile?.name),
    skin: normalizeSkin(profile?.skin),
    cosmeticColor: safeColor(profile?.cosmeticColor) || "#1598f0",
    level: levelFromXp(progress.xp),
    progress,
    inventory
  };
}

function profileForPlayer(player) {
  return player?.profileKey ? profileStore.profiles[player.profileKey] : null;
}

function saveProfileSoon() {
  saveProfileStore().catch(() => undefined);
}

function readJsonRequest(req, limit = maxHttpJsonBytes) {
  return new Promise((resolveJson, rejectJson) => {
    let size = 0;
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > limit) {
        rejectJson(Object.assign(new Error("too large"), { status: 413 }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolveJson(body ? JSON.parse(body) : {});
      } catch {
        rejectJson(Object.assign(new Error("bad json"), { status: 400 }));
      }
    });
    req.on("error", rejectJson);
  });
}

async function handleProfileRequest(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, securityHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({ ok: false, message: "method not allowed" }));
    return;
  }
  try {
    const payload = await readJsonRequest(req);
    const loginId = normalizeLoginId(payload.loginId);
    if (loginId.length < 6) {
      res.writeHead(400, securityHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({ ok: false, message: "ログインIDは6文字以上の英数字で入力してください。" }));
      return;
    }
    const mode = String(payload.mode || "login");
    const existingProfile = getProfile(loginId);
    if (mode === "login" && !existingProfile) {
      res.writeHead(404, securityHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({ ok: false, message: "このログインIDはまだ作成されていません。" }));
      return;
    }
    const record = getOrCreateProfile(loginId);
    mergeProfile(record.profile, mode === "login" ? {} : payload);
    if (mode !== "login") await saveProfileStore();
    res.writeHead(200, securityHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({ ok: true, profile: publicProfile(record.profile) }));
  } catch (error) {
    res.writeHead(error?.status || 500, securityHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({ ok: false, message: "プロフィール処理に失敗しました。" }));
  }
}

const rooms = new Map();
const pokerRooms = new Map();
const profileStorePath = resolve(process.env.DONPACHI_PROFILE_STORE || join(__dirname, "data", "profiles.json"));
const profileStore = await loadProfileStore();
let vite;

if (!isProd) {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
}

const server = createServer(async (req, res) => {
  if (String(req.url || "").split("?")[0] === "/api/profile") {
    await handleProfileRequest(req, res);
    return;
  }

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
    res.writeHead(200, securityHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, players }));
    return;
  }

  if (!isProd && vite) {
    vite.middlewares(req, res);
    return;
  }

  const publicRoot = resolve(__dirname, "dist");
  const decodedPath = safeDecodePath(req.url);
  if (decodedPath.error) {
    res.writeHead(decodedPath.error, securityHeaders());
    res.end(decodedPath.error === 414 ? "uri too long" : "bad request");
    return;
  }
  const safePath = decodedPath.path;
  const target = safePath === "/" ? "/index.html" : safePath;
  const filePath = resolve(join(publicRoot, target));

  if (!filePath.startsWith(publicRoot)) {
    res.writeHead(403, securityHeaders());
    res.end("forbidden");
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not file");
    res.writeHead(200, securityHeaders(mimeTypes.get(extname(filePath)) || "application/octet-stream"));
    createReadStream(filePath).pipe(res);
  } catch {
    try {
      const html = await readFile(join(publicRoot, "index.html"), "utf8");
      res.writeHead(200, securityHeaders("text/html; charset=utf-8"));
      res.end(html);
    } catch {
      res.writeHead(404, securityHeaders());
      res.end("not found");
    }
  }
});

const wss = new WebSocketServer({ server, path: "/ws", maxPayload: maxWsMessageBytes });

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
  if (mode === "practice") return "練習";
  if (mode === "life3") return "ライフ3";
  if (mode === "castle") return "城攻め";
  return "ワンライフ";
}

function normalizePartySize(value) {
  const size = Number(value);
  return partySizes.has(size) ? size : 1;
}

function normalizeRelationMode(value) {
  const mode = String(value || "versus");
  return relationModes.has(mode) ? mode : "versus";
}

function normalizeSkin(value) {
  const skin = String(value || "rounded");
  return skins.has(skin) ? skin : "rounded";
}

function normalizeWeapon(value) {
  const weapon = String(value || "rifle");
  return allowedWeapons.has(weapon) ? weapon : "rifle";
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
  if (room.relationMode === "coop") return room.playerTeam || "blue";
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
  if (mode === "practice") return 0;
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

function createPowerups(now = Date.now()) {
  return powerupSpawns.map((spawn, index) => ({
    id: `powerup-${index}`,
    kind: powerupKinds[index % powerupKinds.length],
    ...spawn,
    available: index < 3,
    respawnAt: index < 3 ? 0 : now + powerupRespawnMs + index * 2400
  }));
}

function normalizeCpuFill(value) {
  return value !== false;
}

function findMatchRoom(mode = "oneLife", partySize = 1, cpuFill = true, relationMode = "versus") {
  const gameMode = normalizeGameMode(mode);
  const size = normalizePartySize(partySize);
  const fill = normalizeCpuFill(cpuFill);
  const relation = normalizeRelationMode(relationMode);
  for (const room of rooms.values()) {
    if (!room.matchmaking || room.winner || room.mode !== gameMode || room.partySize !== size || room.cpuFill !== fill || room.relationMode !== relation) continue;
    if (humanPlayers(room).length < maxPlayers) return room;
  }
  return null;
}

function getRoom(code, mode = "oneLife", arena = "toybox", partySize = 1, matchmaking = true, cpuFill = true, relationMode = "versus") {
  const normalized = normalizeRoomCode(code);
  if (normalized && rooms.has(normalized)) return rooms.get(normalized);
  if (!normalized) {
    const match = findMatchRoom(mode, partySize, cpuFill, relationMode);
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
    relationMode: normalizeRelationMode(relationMode),
    partySize: size,
    matchStarted: false,
    maxHumanPlayers: maxPlayers,
    weaponStats: Object.create(null),
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
    healthPickup: { ...randomPickupSpawn(arenaId), available: false, respawnAt: gameMode === "oneLife" ? nextHealthPickupAt() : 0 },
    powerups: createPowerups()
  };
  rooms.set(createdCode, room);
  return room;
}

function normalizePokerCpuCount(value) {
  return clamp(Math.floor(Number(value) || 0), 0, maxPokerCpus);
}

function secureRandomInt(maxExclusive) {
  if (maxExclusive <= 1) return 0;
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % maxExclusive;
}

function createDeck() {
  const suits = ["S", "H", "D", "C"];
  const deck = [];
  for (const suit of suits) {
    for (let rank = 2; rank <= 14; rank += 1) deck.push({ rank, suit });
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardCode(card) {
  return `${card.rank}${card.suit}`;
}

function getPokerRoom(code, cpuCount = 2) {
  const normalized = normalizeRoomCode(code);
  if (normalized && pokerRooms.has(normalized)) return pokerRooms.get(normalized);
  const roomCodeValue = normalized.length === 6 ? normalized : roomCode();
  const room = {
    code: roomCodeValue,
    createdAt: Date.now(),
    players: new Map(),
    seats: [],
    dealerSeat: -1,
    deck: [],
    community: [],
    pot: 0,
    stage: "waiting",
    currentBet: 0,
    minRaise: pokerBigBlind,
    turnSeat: -1,
    turnEndsAt: 0,
    handNumber: 0,
    lastEvent: "テキサスポーカーへようこそ",
    showdown: null,
    cpuTarget: normalizePokerCpuCount(cpuCount)
  };
  pokerRooms.set(roomCodeValue, room);
  syncPokerCpus(room, cpuCount);
  return room;
}

function pokerHumans(room) {
  return [...room.players.values()].filter((player) => !player.isBot);
}

function pokerActivePlayers(room) {
  const handInProgress = room.stage !== "waiting" && room.stage !== "showdown";
  return room.seats.map((id) => room.players.get(id)).filter((player) => {
    if (!player) return false;
    if (player.chips + player.bet > 0) return true;
    return handInProgress && player.hand.length > 0 && !player.folded;
  });
}

function pokerLivePlayers(room) {
  return pokerActivePlayers(room).filter((player) => !player.folded);
}

function createPokerBotProfile(index = 0) {
  const types = [
    { style: "慎重派", courage: 0.36, bluff: 0.08, trap: 0.2, curiosity: 0.38 },
    { style: "強気派", courage: 0.72, bluff: 0.2, trap: 0.12, curiosity: 0.7 },
    { style: "ブラフ派", courage: 0.58, bluff: 0.34, trap: 0.1, curiosity: 0.64 },
    { style: "読み合い派", courage: 0.5, bluff: 0.16, trap: 0.31, curiosity: 0.54 },
    { style: "ビビり派", courage: 0.27, bluff: 0.06, trap: 0.16, curiosity: 0.28 }
  ];
  const base = types[index % types.length];
  const variance = () => (Math.random() - 0.5) * 0.12;
  return {
    style: base.style,
    courage: clamp(base.courage + variance(), 0.18, 0.86),
    bluff: clamp(base.bluff + variance(), 0.02, 0.42),
    trap: clamp(base.trap + variance(), 0.04, 0.42),
    curiosity: clamp(base.curiosity + variance(), 0.18, 0.86)
  };
}

function syncPokerCpus(room, cpuCount = room.cpuTarget) {
  room.cpuTarget = normalizePokerCpuCount(cpuCount);
  const humans = pokerHumans(room).length;
  const targetCpu = Math.min(room.cpuTarget, Math.max(0, maxPokerSeats - humans));
  let cpus = [...room.players.values()].filter((player) => player.isBot);
  while (cpus.length > targetCpu) {
    const cpu = cpus.pop();
    room.players.delete(cpu.id);
    room.seats = room.seats.filter((id) => id !== cpu.id);
  }
  while (cpus.length < targetCpu && room.players.size < maxPokerSeats) {
    const id = `poker-cp-${crypto.randomUUID()}`;
    const cpu = {
      id,
      ws: null,
      name: `CP${cpus.length + 1}`,
      chips: pokerStartingChips,
      hand: [],
      bet: 0,
      folded: false,
      allIn: false,
      acted: false,
      isBot: true,
      seat: room.seats.length,
      lastAction: "待機",
      mood: "観察中",
      streak: 0,
      thinkUntil: 0,
      botProfile: createPokerBotProfile(cpus.length)
    };
    room.players.set(id, cpu);
    room.seats.push(id);
    cpus.push(cpu);
  }
  normalizePokerSeats(room);
}

function normalizePokerSeats(room) {
  room.seats = room.seats.filter((id) => room.players.has(id));
  room.seats.forEach((id, index) => {
    const player = room.players.get(id);
    if (player) player.seat = index;
  });
}

function maybeStartPokerHand(room) {
  if (room.stage !== "waiting" || pokerActivePlayers(room).length < 2) return;
  startPokerHand(room);
}

function setPokerWaiting(room, event = "Donがない時はCPじゃんけんで復帰できます") {
  room.stage = "waiting";
  room.turnSeat = -1;
  room.turnEndsAt = 0;
  room.currentBet = 0;
  room.minRaise = pokerBigBlind;
  room.community = [];
  room.pot = 0;
  room.showdown = null;
  room.lastEvent = event;
  for (const player of room.players.values()) {
    player.hand = [];
    player.bet = 0;
    player.allIn = false;
    player.folded = player.chips <= 0;
    player.acted = player.chips <= 0;
    player.thinkUntil = 0;
  }
}

function startPokerHand(room) {
  const seated = room.seats.map((id) => room.players.get(id)).filter(Boolean);
  for (const player of seated) {
    if (player.isBot && player.chips <= 0) {
      player.chips = 1200;
      player.lastAction = "CP補充 1200Don";
      player.mood = "再挑戦";
    }
  }
  const active = pokerActivePlayers(room);
  if (active.length < 2) {
    setPokerWaiting(room);
    return;
  }
  for (const player of seated) {
    player.hand = [];
    player.bet = 0;
    player.folded = player.chips <= 0;
    player.allIn = false;
    player.acted = player.chips <= 0;
    player.thinkUntil = 0;
    if (player.chips > 0) player.lastAction = "";
    if (player.isBot) player.mood = player.botProfile?.style || "観察中";
  }
  room.deck = createDeck();
  room.community = [];
  room.pot = 0;
  room.stage = "preflop";
  room.currentBet = pokerBigBlind;
  room.minRaise = pokerBigBlind;
  room.showdown = null;
  room.handNumber += 1;
  room.dealerSeat = nextPokerSeat(room, room.dealerSeat);
  const smallBlindSeat = active.length === 2 ? room.dealerSeat : nextPokerSeat(room, room.dealerSeat);
  const bigBlindSeat = nextPokerSeat(room, smallBlindSeat);
  for (let i = 0; i < 2; i += 1) {
    for (const player of active) player.hand.push(room.deck.pop());
  }
  postPokerBet(room, room.players.get(room.seats[smallBlindSeat]), pokerSmallBlind);
  postPokerBet(room, room.players.get(room.seats[bigBlindSeat]), pokerBigBlind);
  room.turnSeat = nextPokerSeat(room, bigBlindSeat);
  room.turnEndsAt = Date.now() + pokerTurnMs;
  room.lastEvent = `新しいハンド #${room.handNumber} / ブラインド ${pokerSmallBlind}/${pokerBigBlind}`;
}

function nextPokerSeat(room, fromSeat) {
  if (room.seats.length === 0) return -1;
  for (let step = 1; step <= room.seats.length; step += 1) {
    const seat = (fromSeat + step + room.seats.length) % room.seats.length;
    const player = room.players.get(room.seats[seat]);
    if (player && player.chips + player.bet > 0 && !player.folded && !player.allIn) return seat;
  }
  return -1;
}

function postPokerBet(room, player, amount) {
  if (!player || player.folded || player.chips <= 0) return 0;
  const paid = Math.min(player.chips, Math.max(0, amount));
  player.chips -= paid;
  player.bet += paid;
  player.allIn = player.chips <= 0;
  room.pot += paid;
  return paid;
}

function pokerToCall(room, player) {
  return Math.max(0, room.currentBet - (player?.bet || 0));
}

function handlePokerAction(room, player, action, raiseBy = 0, automatic = false) {
  if (!player || player.isBot || room.stage === "waiting" || room.stage === "showdown") return;
  if (room.seats[room.turnSeat] !== player.id) {
    send(player.ws, { type: "poker_error", message: "まだあなたのターンではありません。" });
    return;
  }
  applyPokerDecision(room, player, action, raiseBy, automatic);
}

function applyPokerDecision(room, player, action, raiseBy = 0, automatic = false) {
  const toCall = pokerToCall(room, player);
  if (action === "fold" && toCall > 0) {
    player.folded = true;
    player.acted = true;
    player.lastAction = automatic ? "時間切れフォールド" : "フォールド";
    room.lastEvent = `${player.name} がフォールド`;
  } else if (action === "raise" && player.chips > toCall) {
    const requestedRaise = Math.max(room.minRaise || pokerBigBlind, pokerBigBlind, Math.floor(Number(raiseBy) || pokerBigBlind));
    const paid = postPokerBet(room, player, toCall + requestedRaise);
    room.currentBet = Math.max(room.currentBet, player.bet);
    room.minRaise = requestedRaise;
    for (const other of pokerLivePlayers(room)) {
      if (other.id !== player.id && !other.allIn) other.acted = false;
    }
    player.acted = true;
    player.lastAction = `${paid}Don レイズ`;
    room.lastEvent = `${player.name} が ${player.bet}Don までレイズ`;
  } else {
    const paid = postPokerBet(room, player, toCall);
    player.acted = true;
    player.lastAction = paid > 0 ? `${paid}Don コール` : "チェック";
    room.lastEvent = `${player.name} が ${player.lastAction}`;
  }
  advancePokerAfterAction(room);
}

function advancePokerAfterAction(room) {
  const live = pokerLivePlayers(room);
  if (live.length <= 1) {
    awardPokerPot(room, live[0], `${live[0]?.name || "勝者"} が全員を降ろした`);
    return;
  }
  if (pokerBettingComplete(room)) {
    advancePokerStreet(room);
    return;
  }
  room.turnSeat = nextPokerSeat(room, room.turnSeat);
  room.turnEndsAt = Date.now() + pokerTurnMs;
}

function pokerBettingComplete(room) {
  const live = pokerLivePlayers(room);
  const pending = live.filter((player) => !player.allIn);
  if (pending.length === 0) return true;
  return pending.every((player) => player.acted && player.bet === room.currentBet) && live.every((player) => player.allIn || player.bet === room.currentBet);
}

function advancePokerStreet(room) {
  for (const player of room.players.values()) {
    player.bet = 0;
    player.acted = false;
  }
  room.currentBet = 0;
  room.minRaise = pokerBigBlind;
  if (room.stage === "preflop") {
    room.community.push(room.deck.pop(), room.deck.pop(), room.deck.pop());
    room.stage = "flop";
    room.lastEvent = "フロップ";
  } else if (room.stage === "flop") {
    room.community.push(room.deck.pop());
    room.stage = "turn";
    room.lastEvent = "ターン";
  } else if (room.stage === "turn") {
    room.community.push(room.deck.pop());
    room.stage = "river";
    room.lastEvent = "リバー";
  } else {
    resolvePokerShowdown(room);
    return;
  }
  room.turnSeat = nextPokerSeat(room, room.dealerSeat);
  room.turnEndsAt = Date.now() + pokerTurnMs;
  if (room.turnSeat < 0) resolvePokerShowdown(room);
}

function awardPokerPot(room, winner, reason) {
  if (winner) winner.chips += room.pot;
  for (const player of room.players.values()) {
    player.streak = winner && player.id === winner.id ? (player.streak || 0) + 1 : 0;
    if (player.isBot) player.mood = winner && player.id === winner.id ? "乗っている" : "立て直し中";
    const profile = profileForPlayer(player);
    if (profile) {
      profile.inventory = sanitizeInventory({ ...profile.inventory, pokerDon: player.chips });
      profile.updatedAt = Date.now();
    }
  }
  saveProfileSoon();
  room.showdown = {
    winners: winner ? [{ id: winner.id, name: winner.name, label: reason, amount: room.pot }] : [],
    revealed: [...room.players.values()].map((player) => ({ id: player.id, hand: player.hand.map(cardCode) }))
  };
  room.pot = 0;
  room.stage = "showdown";
  room.turnSeat = -1;
  room.turnEndsAt = Date.now() + 4500;
  room.lastEvent = reason;
}

function resolvePokerShowdown(room) {
  const contenders = pokerLivePlayers(room);
  let best = null;
  let winners = [];
  for (const player of contenders) {
    const evaluated = evaluateBestPokerHand([...player.hand, ...room.community]);
    player.lastAction = evaluated.label;
    if (!best || comparePokerScore(evaluated.score, best.score) > 0) {
      best = evaluated;
      winners = [player];
    } else if (comparePokerScore(evaluated.score, best.score) === 0) {
      winners.push(player);
    }
  }
  const share = winners.length ? Math.floor(room.pot / winners.length) : 0;
  for (const winner of winners) winner.chips += share;
  const winnerIds = new Set(winners.map((winner) => winner.id));
  for (const player of room.players.values()) {
    player.streak = winnerIds.has(player.id) ? (player.streak || 0) + 1 : 0;
    if (player.isBot) player.mood = winnerIds.has(player.id) ? "読み勝ち" : "反省中";
    const profile = profileForPlayer(player);
    if (profile) {
      profile.inventory = sanitizeInventory({ ...profile.inventory, pokerDon: player.chips });
      profile.updatedAt = Date.now();
    }
  }
  saveProfileSoon();
  room.showdown = {
    winners: winners.map((winner) => ({ id: winner.id, name: winner.name, label: best?.label || "勝利", amount: share })),
    revealed: [...room.players.values()].map((player) => ({ id: player.id, hand: player.hand.map(cardCode) }))
  };
  room.pot = 0;
  room.stage = "showdown";
  room.turnSeat = -1;
  room.turnEndsAt = Date.now() + 5500;
  room.lastEvent = `${winners.map((winner) => winner.name).join(" / ")} が ${best?.label || "勝利"}`;
}

function evaluateBestPokerHand(cards) {
  let best = null;
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            const score = evaluateFivePokerCards([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || comparePokerScore(score.score, best.score) > 0) best = score;
          }
        }
      }
    }
  }
  return best || { score: [0], label: "ハイカード" };
}

function evaluateFivePokerCards(cards) {
  const ranks = cards.map((card) => card.rank).sort((a, b) => b - a);
  const counts = new Map();
  for (const rank of ranks) counts.set(rank, (counts.get(rank) || 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const straightHigh = pokerStraightHigh(ranks);
  if (flush && straightHigh) return { score: [8, straightHigh], label: straightHigh === 14 ? "ロイヤル級ストレートフラッシュ" : "ストレートフラッシュ" };
  if (groups[0][1] === 4) return { score: [7, groups[0][0], groups[1][0]], label: "フォーカード" };
  if (groups[0][1] === 3 && groups[1]?.[1] === 2) return { score: [6, groups[0][0], groups[1][0]], label: "フルハウス" };
  if (flush) return { score: [5, ...ranks], label: "フラッシュ" };
  if (straightHigh) return { score: [4, straightHigh], label: "ストレート" };
  if (groups[0][1] === 3) return { score: [3, groups[0][0], ...groups.slice(1).map((group) => group[0])], label: "スリーカード" };
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) return { score: [2, groups[0][0], groups[1][0], groups[2][0]], label: "ツーペア" };
  if (groups[0][1] === 2) return { score: [1, groups[0][0], ...groups.slice(1).map((group) => group[0])], label: "ワンペア" };
  return { score: [0, ...ranks], label: "ハイカード" };
}

function pokerStraightHigh(ranks) {
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  for (let i = 0; i <= unique.length - 5; i += 1) {
    if (unique[i] - unique[i + 4] === 4) return unique[i];
  }
  return 0;
}

function comparePokerScore(a, b) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff) return diff;
  }
  return 0;
}

function updatePokerRoom(room, now) {
  if (pokerHumans(room).length === 0) {
    pokerRooms.delete(room.code);
    return;
  }
  if (room.stage === "waiting") {
    maybeStartPokerHand(room);
    return;
  }
  if (room.stage === "showdown") {
    if (now >= room.turnEndsAt) {
      if (pokerActivePlayers(room).length >= 2) startPokerHand(room);
      else setPokerWaiting(room);
    }
    return;
  }
  const current = room.players.get(room.seats[room.turnSeat]);
  if (!current) {
    advancePokerAfterAction(room);
    return;
  }
  if (current.isBot && now < room.turnEndsAt) {
    if (!current.thinkUntil) current.thinkUntil = now + 700 + Math.floor(Math.random() * 1900);
    if (now < current.thinkUntil) return;
  }
  if (current.isBot || now >= room.turnEndsAt) {
    const decision = choosePokerBotAction(room, current, now >= room.turnEndsAt);
    current.thinkUntil = 0;
    applyPokerDecision(room, current, decision.action, decision.raiseBy, now >= room.turnEndsAt);
  }
}

function choosePokerBotAction(room, player, timedOut = false) {
  const toCall = pokerToCall(room, player);
  const profile = player.botProfile || createPokerBotProfile(player.seat || 0);
  const strength = estimatePokerStrength(player, room.community);
  const stack = Math.max(1, player.chips + player.bet);
  const pressure = toCall / stack;
  const potOdds = toCall > 0 ? toCall / Math.max(1, room.pot + toCall) : 0;
  const bigBet = toCall >= Math.max(90, stack * 0.18);
  const scaryBet = toCall >= Math.max(160, stack * 0.28);
  const canRaise = player.chips > toCall + Math.max(room.minRaise || pokerBigBlind, pokerBigBlind);
  const baseRaise = Math.max(room.minRaise || pokerBigBlind, pokerBigBlind);
  const raiseBy = Math.min(player.chips - toCall, baseRaise + Math.round((45 + Math.random() * 95) * (0.7 + strength)));

  if (timedOut) {
    player.mood = toCall > 0 ? "時間切れで弱気" : "時間切れチェック";
    return toCall > 0 ? { action: "fold" } : { action: "call" };
  }

  if (toCall <= 0) {
    const trap = strength > 0.72 && Math.random() < profile.trap;
    const valueBet = strength > 0.62 && Math.random() < 0.36 + profile.courage * 0.28;
    const bluff = strength < 0.42 && Math.random() < profile.bluff;
    if (trap) {
      player.mood = "罠を張る";
      return { action: "call" };
    }
    if (canRaise && (valueBet || bluff)) {
      player.mood = bluff ? "ブラフ気配" : "強気";
      return { action: "raise", raiseBy };
    }
    player.mood = strength > 0.55 ? "様子見の余裕" : "様子見";
    return { action: "call" };
  }

  const fear = clamp(pressure * 1.75 + potOdds * 0.45 - strength - profile.courage * 0.4, 0, 1);
  const curiosityCall = Math.random() < profile.curiosity * 0.18 && pressure < 0.16;
  if ((scaryBet || bigBet) && strength < 0.58 && Math.random() < fear + 0.18) {
    player.mood = scaryBet ? "かなりビビり" : "少しビビり";
    return { action: "fold" };
  }
  if (pressure > 0.42 && strength < 0.76 && !curiosityCall) {
    player.mood = "降りて守る";
    return { action: "fold" };
  }
  if (canRaise && strength > 0.74 && Math.random() < 0.52 + profile.courage * 0.22) {
    player.mood = "勝負に出る";
    return { action: "raise", raiseBy };
  }
  if (canRaise && strength < 0.36 && pressure < 0.12 && Math.random() < profile.bluff * 0.8) {
    player.mood = "ブラフ勝負";
    return { action: "raise", raiseBy: Math.min(player.chips - toCall, baseRaise + 40 + Math.floor(Math.random() * 90)) };
  }
  player.mood = bigBet ? "悩んでコール" : strength > 0.56 ? "追いかける" : "薄く参加";
  return { action: "call" };
}

function estimatePokerStrength(player, community) {
  const cards = [...player.hand, ...community];
  if (cards.length >= 5) {
    const evaluated = evaluateBestPokerHand(cards);
    const classScore = (evaluated.score[0] || 0) / 8;
    const kicker = Math.min(0.14, ((evaluated.score[1] || 0) - 2) / 90);
    return clamp(classScore + kicker, 0.08, 0.98);
  }
  const [a, b] = player.hand;
  if (!a || !b) return 0.3;
  const high = Math.max(a.rank, b.rank);
  const low = Math.min(a.rank, b.rank);
  const suited = a.suit === b.suit;
  const pair = a.rank === b.rank;
  const connected = Math.abs(a.rank - b.rank) <= 2;
  let score = 0.18 + (high - 2) / 28 + (low - 2) / 42;
  if (pair) score += 0.28 + high / 60;
  if (suited) score += 0.07;
  if (connected) score += 0.06;
  if (high >= 13 && low >= 10) score += 0.08;
  return clamp(score, 0.08, 0.92);
}

function pokerJankenLabel(choice) {
  if (choice === "rock") return "グー";
  if (choice === "scissors") return "チョキ";
  return "パー";
}

function handlePokerJanken(room, player, choice) {
  if (!player || player.isBot || !pokerJankenChoices.has(choice)) {
    if (player?.ws) send(player.ws, { type: "poker_error", message: "じゃんけんを選び直してください。" });
    return;
  }
  if (player.chips > 0) {
    send(player.ws, { type: "poker_error", message: "まだDonがあります。じゃんけんは破産時だけ使えます。" });
    return;
  }
  if (player.bet > 0 || player.allIn) {
    send(player.ws, { type: "poker_error", message: "オールイン中は勝敗確定まで待ってください。" });
    return;
  }
  const cpChoice = [...pokerJankenChoices][secureRandomInt(pokerJankenChoices.size)];
  const win =
    (choice === "rock" && cpChoice === "scissors") ||
    (choice === "scissors" && cpChoice === "paper") ||
    (choice === "paper" && cpChoice === "rock");
  const draw = choice === cpChoice;
  const amount = win ? 2000 : draw ? 1000 : 500;
  const result = win ? "勝ち" : draw ? "あいこ" : "負け";
  player.chips += amount;
  const profile = profileForPlayer(player);
  if (profile) {
    profile.inventory = sanitizeInventory({ ...profile.inventory, pokerDon: player.chips });
    profile.updatedAt = Date.now();
    saveProfileSoon();
  }
  player.folded = false;
  player.acted = false;
  player.allIn = false;
  player.lastAction = `CPじゃんけん ${result} +${amount}Don`;
  room.lastEvent = `${player.name}: ${pokerJankenLabel(choice)} / CP: ${pokerJankenLabel(cpChoice)} / ${amount}Don復帰`;
  send(player.ws, { type: "poker_janken_result", result, amount, playerChoice: choice, cpChoice });
  if (room.stage === "waiting") maybeStartPokerHand(room);
}

function publicPokerPlayer(player, viewerId) {
  return {
    id: player.id,
    name: player.name,
    chips: player.chips,
    bet: player.bet,
    folded: player.folded,
    allIn: player.allIn,
    acted: player.acted,
    isBot: player.isBot,
    seat: player.seat,
    lastAction: player.lastAction,
    mood: player.mood || "",
    streak: player.streak || 0,
    cards: player.id === viewerId || player.folded === false && false ? player.hand.map(cardCode) : [],
    cardCount: player.hand.length
  };
}

function pokerSnapshotFor(room, viewerId) {
  const viewer = room.players.get(viewerId);
  const current = room.players.get(room.seats[room.turnSeat]);
  const toCall = viewer ? pokerToCall(room, viewer) : 0;
  return {
    type: "poker_snapshot",
    room: room.code,
    selfId: viewerId,
    players: [...room.players.values()].map((player) => publicPokerPlayer(player, viewerId)),
    community: room.community.map(cardCode),
    pot: room.pot,
    stage: room.stage,
    dealerSeat: room.dealerSeat,
    turnId: current?.id || "",
    turnEndsAt: room.turnEndsAt,
    now: Date.now(),
    toCall,
    currentBet: room.currentBet,
    minRaise: room.minRaise,
    lastEvent: room.lastEvent,
    showdown: room.showdown
  };
}

function broadcastPoker(room) {
  for (const player of room.players.values()) {
    if (!player.ws || player.ws.readyState !== 1) continue;
    send(player.ws, pokerSnapshotFor(room, player.id));
  }
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
  const color = teams.has(player.color) ? player.color : "blue";
  return {
    id: player.id,
    name: player.name,
    color,
    cosmeticColor: player.cosmeticColor,
    skin: normalizeSkin(player.skin),
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
    shieldUntil: player.shieldUntil || 0,
    speedBoostUntil: player.speedBoostUntil || 0,
    damageBoostUntil: player.damageBoostUntil || 0,
    comebackUntil: player.comebackUntil || 0,
    level: levelFromXp(profileForPlayer(player)?.progress?.xp || 0)
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
  room.feed.unshift({
    id: `${Date.now()}-${Math.random()}`,
    text: cleanText(text, 120, "更新"),
    color: teams.has(color) ? color : "blue",
    at: Date.now()
  });
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

function rayBoxDistance(origin, direction, box, maxDistance) {
  let tMin = 0;
  let tMax = maxDistance;
  for (const axis of ["x", "y", "z"]) {
    const min = box[`min${axis.toUpperCase()}`];
    const max = box[`max${axis.toUpperCase()}`];
    const o = origin[axis];
    const d = direction[axis];
    if (Math.abs(d) < 1e-6) {
      if (o < min || o > max) return null;
      continue;
    }
    const inv = 1 / d;
    let t1 = (min - o) * inv;
    let t2 = (max - o) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  return tMin > 0.05 && tMin < maxDistance ? tMin : null;
}

function rayHitsBox(origin, direction, box, maxDistance) {
  return rayBoxDistance(origin, direction, box, maxDistance) !== null;
}

function firstObstacleImpact(origin, direction, maxDistance, arena = "toybox") {
  let bestDistance = maxDistance;
  let bestBox = null;
  for (const box of obstaclesForArena(arena)) {
    const distance = rayBoxDistance(origin, direction, box, maxDistance);
    if (distance !== null && distance < bestDistance) {
      bestDistance = distance;
      bestBox = box;
    }
  }
  if (!bestBox || bestDistance >= maxDistance) return null;
  const point = {
    x: origin.x + direction.x * bestDistance,
    y: origin.y + direction.y * bestDistance,
    z: origin.z + direction.z * bestDistance
  };
  const normal = [
    { value: Math.abs(point.x - bestBox.minX), normal: { x: -1, y: 0, z: 0 } },
    { value: Math.abs(point.x - bestBox.maxX), normal: { x: 1, y: 0, z: 0 } },
    { value: Math.abs(point.y - bestBox.minY), normal: { x: 0, y: -1, z: 0 } },
    { value: Math.abs(point.y - bestBox.maxY), normal: { x: 0, y: 1, z: 0 } },
    { value: Math.abs(point.z - bestBox.minZ), normal: { x: 0, y: 0, z: -1 } },
    { value: Math.abs(point.z - bestBox.maxZ), normal: { x: 0, y: 0, z: 1 } }
  ].sort((a, b) => a.value - b.value)[0].normal;
  return { point, normal, distance: bestDistance };
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
  let currentPokerRoom;
  let currentPokerPlayer;

  ws.on("error", () => {
    if (ws.readyState === ws.OPEN) ws.close(1009, "invalid websocket message");
  });

  ws.on("message", (raw) => {
    const rawSize = typeof raw === "string" ? Buffer.byteLength(raw) : raw?.byteLength || raw?.length || 0;
    if (rawSize > maxWsMessageBytes) {
      ws.close(1009, "message too large");
      return;
    }
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!message || typeof message !== "object") return;

    if (message.type === "poker_join") {
      const requestedCpuCount = normalizePokerCpuCount(message.cpuCount);
      const room = getPokerRoom(message.room, requestedCpuCount);
      if (room.players.size >= maxPokerSeats) {
        const removableCpu = [...room.players.values()].find((player) => player.isBot);
        if (removableCpu) {
          room.players.delete(removableCpu.id);
          room.seats = room.seats.filter((id) => id !== removableCpu.id);
        }
      }
      if (room.players.size >= maxPokerSeats) {
        send(ws, { type: "poker_error", message: "このポーカールームは満席です。" });
        return;
      }
      const hadPokerProfile = Boolean(getProfile(message.loginId));
      const pokerProfileRecord = getOrCreateProfile(message.loginId);
      if (pokerProfileRecord) {
        mergeProfile(pokerProfileRecord.profile, hadPokerProfile
          ? { progress: message.progress }
          : {
            name: message.name,
            skin: message.skin,
            cosmeticColor: message.cosmeticColor,
            progress: message.progress,
            inventory: message.inventory
          });
        saveProfileSoon();
      }
      const pokerProfile = pokerProfileRecord?.profile || null;
      const id = crypto.randomUUID();
      const player = {
        id,
        ws,
        profileKey: pokerProfileRecord?.key || "",
        name: sanitizePlayerName(pokerProfile?.name || message.name),
        chips: sanitizeInventory(pokerProfile?.inventory).pokerDon,
        hand: [],
        bet: 0,
        folded: false,
        allIn: false,
        acted: false,
        isBot: false,
        seat: room.seats.length,
        lastAction: "参加",
        mood: "",
        streak: 0,
        thinkUntil: 0
      };
      if (room.stage !== "waiting" && room.stage !== "showdown") {
        player.folded = true;
        player.acted = true;
        player.lastAction = "次ハンド待ち";
      }
      room.players.set(id, player);
      room.seats.push(id);
      syncPokerCpus(room, requestedCpuCount);
      currentPokerRoom = room;
      currentPokerPlayer = player;
      room.lastEvent = `${player.name} がポーカールームに参加`;
      maybeStartPokerHand(room);
      send(ws, { type: "poker_welcome", id, room: room.code, startingChips: pokerStartingChips, turnMs: pokerTurnMs, profile: pokerProfile ? publicProfile(pokerProfile) : null });
      broadcastPoker(room);
      return;
    }

    if (message.type === "poker_action") {
      if (!currentPokerRoom || !currentPokerPlayer) return;
      handlePokerAction(currentPokerRoom, currentPokerPlayer, String(message.action || "call"), Number(message.raiseBy) || 0, false);
      broadcastPoker(currentPokerRoom);
      return;
    }

    if (message.type === "poker_janken") {
      if (!currentPokerRoom || !currentPokerPlayer) return;
      handlePokerJanken(currentPokerRoom, currentPokerPlayer, String(message.choice || ""));
      broadcastPoker(currentPokerRoom);
      return;
    }

    if (message.type === "join") {
      const requestedPartySize = normalizePartySize(message.partySize);
      const requestedCpuFill = normalizeCpuFill(message.cpuFill);
      const requestedRelationMode = normalizeRelationMode(message.relationMode);
      const hadProfile = Boolean(getProfile(message.loginId));
      const profileRecord = getOrCreateProfile(message.loginId);
      if (profileRecord) {
        mergeProfile(profileRecord.profile, hadProfile
          ? { progress: message.progress }
          : {
            name: message.name,
            skin: message.skin,
            cosmeticColor: message.cosmeticColor,
            progress: message.progress,
            inventory: message.inventory
          });
        saveProfileSoon();
      }
      const loginProfile = profileRecord?.profile || null;
      const room = getRoom(message.room, message.gameMode, "toybox", requestedPartySize, true, requestedCpuFill, requestedRelationMode);
      if (humanPlayers(room).length === 0) room.cpuFill = requestedCpuFill;
      if (humanPlayers(room).length === 0) room.relationMode = requestedRelationMode;
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
      if (room.relationMode === "coop" && !room.playerTeam) {
        room.playerTeam = teams.has(String(message.team || "")) ? String(message.team) : "blue";
      }
      const team = room.matchmaking ? assignMatchTeam(room) : normalizeTeam(message.team, room);
      if (room.mode === "castle" && !room.playerTeam) {
        room.playerTeam = team;
        room.castleCores = createCastleCores(room.playerTeam);
      }
      const player = {
        id,
        ws,
        profileKey: profileRecord?.key || "",
        name: sanitizePlayerName(loginProfile?.name || message.name),
        color: team,
        cosmeticColor: safeColor(loginProfile?.cosmeticColor || message.cosmeticColor) || (team === "blue" ? "#1598f0" : "#ff4d4d"),
        skin: normalizeSkin(loginProfile?.skin || message.skin),
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
        healPacks: sanitizeInventory(loginProfile?.inventory).healPacks,
        donPunchCharge: 0,
        speedBoostUntil: 0,
        damageBoostUntil: 0,
        comebackUntil: 0,
        nextImpactAt: 0,
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
        applyRoomConfig(room, player, message.gameMode, message.team, message.cpuFill, message.relationMode);
        addFeed(room, `ひでお が ${modeLabel(room.mode)} に変更`, player.color);
      }
      syncMatchCpuFill(room);
      addFeed(room, `${player.name} が参加`, player.color);
      const welcomeSpawn = { x: player.x, y: player.y, z: player.z, yaw: player.yaw };
      send(ws, { type: "welcome", id, room: room.code, gameMode: room.mode, arena: room.arena, team: player.color, partySize: room.partySize, cpuFill: room.cpuFill, relationMode: room.relationMode, targetScore: room.targetScore, maxPlayers: room.maxHumanPlayers || maxPlayers, spawn: welcomeSpawn, profile: loginProfile ? publicProfile(loginProfile) : null });
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
      tryPickupPowerups(currentRoom, currentPlayer);
      return;
    }

    if (message.type === "ready") {
      currentPlayer.ready = Boolean(message.ready);
      addFeed(currentRoom, `${currentPlayer.name} ${currentPlayer.ready ? "準備完了" : "準備解除"}`, currentPlayer.color);
      broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
      return;
    }

    if (message.type === "chat") {
      const text = sanitizeChatText(message.text);
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
      currentPlayer.skin = normalizeSkin(message.skin || currentPlayer.skin);
      const profile = profileForPlayer(currentPlayer);
      if (profile) {
        mergeProfile(profile, {
          name: currentPlayer.name,
          skin: currentPlayer.skin,
          cosmeticColor: currentPlayer.cosmeticColor
        });
        saveProfileSoon();
      }
      return;
    }

    if (message.type === "profile_progress") {
      const profile = profileForPlayer(currentPlayer);
      if (profile) {
        mergeProfile(profile, {
          name: currentPlayer.name,
          skin: currentPlayer.skin,
          cosmeticColor: currentPlayer.cosmeticColor,
          progress: message.progress,
          inventory: message.inventory
        });
        saveProfileSoon();
      }
      return;
    }

    if (message.type === "change_team") {
      if (currentRoom.mode !== "oneLife" && currentRoom.mode !== "practice" && currentRoom.mode !== "life3") {
        send(currentPlayer.ws, { type: "error", message: "チーム変更はワンライフ/練習/ライフ3で使用できます。" });
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
      applyRoomConfig(currentRoom, currentPlayer, message.gameMode, message.team, message.cpuFill, message.relationMode);
      addFeed(currentRoom, `ひでお が ${modeLabel(currentRoom.mode)} に変更`, currentPlayer.color);
      broadcast(currentRoom, {
        type: "room_config",
        gameMode: currentRoom.mode,
        cpuFill: currentRoom.cpuFill,
        relationMode: currentRoom.relationMode,
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
      const profile = profileForPlayer(currentPlayer);
      if (profile) {
        profile.inventory = sanitizeInventory({ ...profile.inventory, healPacks: currentPlayer.healPacks });
        profile.updatedAt = Date.now();
        saveProfileSoon();
      }
      addFeed(currentRoom, `${currentPlayer.name} が回復アイテムを使用`, currentPlayer.color);
      send(currentPlayer.ws, { type: "sound", sound: "heal" });
      broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
      return;
    }

    if (message.type === "set_cpu") {
      if (currentRoom.matchmaking) {
        currentRoom.cpuFill = Number(message.count) !== 0;
        syncMatchCpuFill(currentRoom);
        addFeed(currentRoom, currentRoom.cpuFill ? "CP補充 ON" : "CP補充 OFF", currentPlayer.color);
        broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
        return;
      }
      setCpuCount(currentRoom, clamp(Number(message.count), 0, maxCpuPlayers));
      addFeed(currentRoom, `CP ${currentRoom.cpuCount}体`, currentPlayer.color);
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
      const weapon = normalizeWeapon(message.weapon);
      const range = weaponRange.get(weapon) || 70;
      currentRoom.weaponStats[weapon] = (currentRoom.weaponStats[weapon] || 0) + 1;
      currentPlayer.lastWeapon = weapon;
      const shotResult = applyShot(currentRoom, currentPlayer, origin, direction, weapon);
      const now = Date.now();
      const canEmitImpact = now >= (currentPlayer.nextImpactAt || 0);
      if (canEmitImpact) currentPlayer.nextImpactAt = now + (weapon === "shotgun" ? 140 : 70);
      const impact = canEmitImpact ? firstObstacleImpact(origin, direction, Math.min(range, 110), currentRoom.arena) : null;
      if (impact && (!shotResult?.targetDistance || impact.distance < shotResult.targetDistance - 0.18)) {
        broadcast(currentRoom, {
          type: "impact",
          shooter: currentPlayer.id,
          point: impact.point,
          normal: impact.normal,
          weapon
        });
      }
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
    if (currentPokerRoom && currentPokerPlayer) {
      currentPokerRoom.players.delete(currentPokerPlayer.id);
      currentPokerRoom.seats = currentPokerRoom.seats.filter((id) => id !== currentPokerPlayer.id);
      currentPokerRoom.lastEvent = `${currentPokerPlayer.name} が退出`;
      if (pokerHumans(currentPokerRoom).length === 0) pokerRooms.delete(currentPokerRoom.code);
      else {
        syncPokerCpus(currentPokerRoom, currentPokerRoom.cpuTarget);
        if (currentPokerRoom.stage !== "waiting" && pokerLivePlayers(currentPokerRoom).length <= 1) {
          awardPokerPot(currentPokerRoom, pokerLivePlayers(currentPokerRoom)[0], "退出によりハンド終了");
        }
        broadcastPoker(currentPokerRoom);
      }
    }
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
    updatePowerups(room, now);
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
      relationMode: room.relationMode,
      maxPlayers: room.maxHumanPlayers || maxPlayers,
      targetScore: room.targetScore || 0,
      castleCores: room.castleCores,
      castleEndsAt: room.castleEndsAt || 0,
      donPunches,
      barrier: room.barrier,
      healthPickup: room.healthPickup,
      powerups: room.powerups
    });
  }
}, 110);

setInterval(() => {
  const now = Date.now();
  for (const room of pokerRooms.values()) {
    updatePokerRoom(room, now);
    if (pokerRooms.has(room.code)) broadcastPoker(room);
  }
}, 450);

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
  const boosted = !shooter.isBot && Date.now() < (shooter.damageBoostUntil || 0);
  const damageMultiplier = boosted ? 1.18 : 1;
  const damage = shooter.isBot ? Math.max(8, Math.ceil(baseDamage * 0.68)) : Math.ceil(baseDamage * damageMultiplier);
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
    return { hit: "castle", targetDistance: coreHit.targetDistance };
  }

  if (!best || bestDistance >= 0.8) return null;
  applyDirectDamage(room, shooter, best, damage, weapon);
  return { hit: "player", targetDistance: bestTargetDistance };
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
  if (room.mode === "practice") {
    addFeed(room, `${target.name} 復帰練習`, target.color);
    respawnPlayer(target);
    return;
  }

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
  if (room.winner || room.mode === "practice") return;
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
      name: `CP-${i + 1}`,
      color: cpuTeam || (i % 2 === 0 ? "red" : "blue"),
      cosmeticColor: (cpuTeam || (i % 2 === 0 ? "red" : "blue")) === "red" ? "#ff4d4d" : "#1598f0",
      skin: ["rounded", "scout", "heavy", "bee"][i % 4],
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
      speedBoostUntil: 0,
      damageBoostUntil: 0,
      comebackUntil: 0,
      nextImpactAt: 0,
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
    name: `CP-${index + 1}`,
    color: team,
    cosmeticColor: team === "red" ? "#ff4d4d" : "#1598f0",
    skin: ["rounded", "scout", "heavy", "bee"][index % 4],
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
    speedBoostUntil: 0,
    damageBoostUntil: 0,
    comebackUntil: 0,
    nextImpactAt: 0,
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
      addFeed(room, "CPなしバトル開始", "blue");
    }
    return;
  }
  const humans = humanPlayers(room);
  if (room.relationMode === "coop" && room.mode !== "castle") {
    room.playerTeam = room.playerTeam || humans[0]?.color || "blue";
    for (const player of humans) {
      player.color = room.playerTeam;
      player.cosmeticColor = player.cosmeticColor || (room.playerTeam === "blue" ? "#1598f0" : "#ff4d4d");
    }
    const botTeam = oppositeTeam(room.playerTeam);
    const needed = Math.max(0, maxPlayers - humans.length);
    let botIndex = 0;
    for (let i = 0; i < needed && botIndex < maxCpuPlayers && room.players.size < maxPlayers; i += 1) {
      const id = `cpu-${room.code}-match-${botTeam}-${i}`;
      room.players.set(id, createCpuPlayer(room, id, botIndex, botTeam));
      botIndex += 1;
    }
    room.cpuCount = botIndex;
    if (!room.matchStarted && humans.length > 0) {
      room.matchStarted = true;
      addFeed(room, `協力バトル開始 人間 vs CP`, room.playerTeam);
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

function applyRoomConfig(room, host, mode, teamChoice, cpuFill = room.cpuFill, relationMode = room.relationMode) {
  const nextMode = normalizeGameMode(mode);
  const requestedTeam = teams.has(String(teamChoice || "")) ? String(teamChoice) : "";
  room.mode = nextMode;
  room.cpuFill = normalizeCpuFill(cpuFill);
  room.relationMode = normalizeRelationMode(relationMode);
  room.targetScore = 0;
  room.playerTeam = nextMode === "castle" || room.relationMode === "coop" ? requestedTeam || host.color || "blue" : null;

  if (nextMode === "castle") {
    for (const player of room.players.values()) {
      player.color = player.isBot ? oppositeTeam(room.playerTeam) : room.playerTeam;
      player.cosmeticColor = player.cosmeticColor || (player.color === "blue" ? "#1598f0" : "#ff4d4d");
    }
  } else if (room.relationMode === "coop") {
    for (const player of room.players.values()) {
      player.color = player.isBot ? oppositeTeam(room.playerTeam) : room.playerTeam;
      player.cosmeticColor = player.cosmeticColor || (player.color === "blue" ? "#1598f0" : "#ff4d4d");
    }
  } else if (requestedTeam) {
    host.color = requestedTeam;
    host.cosmeticColor = host.cosmeticColor || (requestedTeam === "blue" ? "#1598f0" : "#ff4d4d");
  } else {
    let humanIndex = 0;
    for (const player of room.players.values()) {
      if (player.isBot) continue;
      player.color = humanIndex % 2 === 0 ? "blue" : "red";
      humanIndex += 1;
    }
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
  room.weaponStats = Object.create(null);
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
    player.speedBoostUntil = 0;
    player.damageBoostUntil = 0;
    player.comebackUntil = 0;
    player.nextImpactAt = 0;
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
  room.powerups = createPowerups();
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

function teamScore(room, team) {
  return [...room.players.values()]
    .filter((player) => player.color === team)
    .reduce((sum, player) => sum + (player.score || 0), 0);
}

function isComebackEligible(room, player) {
  const own = teamScore(room, player.color);
  const enemy = teamScore(room, oppositeTeam(player.color));
  return enemy - own >= 2 || (player.deaths || 0) > (player.kills || 0);
}

function tryPickupPowerups(room, player) {
  if (!room.powerups || player.isBot || player.eliminated || player.health <= 0) return;
  const now = Date.now();
  for (const powerup of room.powerups) {
    if (!powerup.available) continue;
    const distance = Math.hypot(player.x - powerup.x, player.y - powerup.y, player.z - powerup.z);
    if (distance > 1.9) continue;
    powerup.available = false;
    powerup.pickedBy = player.name;
    powerup.respawnAt = now + powerupRespawnMs + Math.floor(Math.random() * 6500);
    if (powerup.kind === "speed") {
      player.speedBoostUntil = now + powerupDurationMs;
      addFeed(room, `${player.name} がスピードブーストを取得`, player.color);
    } else if (powerup.kind === "ammo") {
      addFeed(room, `${player.name} が弾薬パックを取得`, player.color);
    } else if (powerup.kind === "damage") {
      player.damageBoostUntil = now + 8500;
      addFeed(room, `${player.name} が火力ブーストを取得`, player.color);
    } else if (powerup.kind === "comeback") {
      const eligible = isComebackEligible(room, player);
      player.comebackUntil = now + (eligible ? 12_000 : 6500);
      player.shieldUntil = Math.max(player.shieldUntil || 0, now + (eligible ? 4500 : 2200));
      player.damageBoostUntil = Math.max(player.damageBoostUntil || 0, now + (eligible ? 8000 : 3500));
      player.donPunchCharge = Math.min(8, (player.donPunchCharge || 0) + (eligible ? 2 : 1));
      addFeed(room, eligible ? `${player.name} が逆転ブーストを取得` : `${player.name} が小型ブーストを取得`, player.color);
    }
    send(player.ws, { type: "powerup", kind: powerup.kind });
    send(player.ws, { type: "sound", sound: powerup.kind === "ammo" ? "reload" : powerup.kind === "speed" ? "jump" : "barrier" });
    broadcast(room, { type: "feed", feed: room.feed });
    return;
  }
}

function updatePowerups(room, now) {
  if (!room.powerups) room.powerups = createPowerups(now);
  for (const powerup of room.powerups) {
    if (powerup.available || !powerup.respawnAt || now < powerup.respawnAt) continue;
    powerup.available = true;
    powerup.pickedBy = "";
    powerup.respawnAt = 0;
    powerup.kind = powerupKinds[(powerupKinds.indexOf(powerup.kind) + 1 + Math.floor(Math.random() * powerupKinds.length)) % powerupKinds.length];
  }
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
  console.log(`DonPaChi FPS running at http://localhost:${port}`);
});
