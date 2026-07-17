import { createServer } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt as cryptoRandomInt,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import {
  memoryUsageMiB,
  pruneTimedMap,
  websocketSendDecision
} from "./runtime-memory-systems.mjs";
import { computeSafeZone, isOutsideSafeZone, vehicleRepairStations } from "./gameplay-systems.mjs";
import { calculateFpsDonReward } from "./economy-systems.mjs";
import { createMatchLifecycle, minimumHumansForMatch, stepMatchLifecycle } from "./match-systems.mjs";
import {
  baccaratChaosWinPermille,
  addBaccaratPlayer,
  baccaratQaTableCode,
  baccaratSnapshotFor,
  baccaratVersion,
  clearBaccaratBets,
  createBaccaratTable,
  globalBaccaratTableCode,
  initialSharedDon,
  lockBaccaratBets,
  placeBaccaratBet,
  reconnectBaccaratPlayer,
  removeBaccaratPlayer,
  repeatBaccaratBets,
  undoBaccaratBet,
  updateBaccaratTable
} from "./baccarat-systems.mjs";
import { appendMotionSample, rewindPose } from "./network-systems.mjs";
import { hitZoneDamage, resolveHumanoidHit } from "./combat-systems.mjs";
import { clampMovementRequest, isNearToyboxTrampoline, wrapAngle } from "./movement-systems.mjs";
import {
  calculateFpsXpReward,
  levelFromProgressXp,
  progressionBonuses,
  progressionVersion,
  publicShopState,
  purchaseShopItem,
  sanitizeOwnedSkins,
  sanitizeUpgrades
} from "./progression-systems.mjs";
import {
  createDoorState,
  distanceToDoor,
  doorPanelBoxes,
  doorShouldOpen,
  stepDoorOpenness,
  toyboxDoorDefinitions
} from "./world-systems.mjs";
import {
  createElevatorState,
  elevatorPlatformBox,
  elevatorInteractionContext,
  elevatorTargetForInteraction,
  floorEyeY,
  nearestTowerFloor,
  setElevatorTarget,
  spiralRoutePoint,
  stepElevatorState,
  stepFloorProgress,
  stepVerticalHeight,
  towerAtPosition,
  toyboxElevatorDefinitions,
  toyboxTowerDefinitions
} from "./vertical-systems.mjs";

import {
  chooseCpuTactic,
  computeCpuDestination,
  cpuCanFire,
  cpuDecisionInterval,
  cpuFireDelayMultiplier,
  cpuReactionDelay,
  cpuRoleForIndex,
  cpuTargetMemoryMs,
  scoreCpuCoverPoint,
  scoreCpuTarget,
  selectCpuWeapon
} from "./ai-systems.mjs";

const configuredPrivilegedLoginIdHash = String(process.env.DONPACHI_PRIVILEGED_LOGIN_ID_HASH || "").trim().toLowerCase();
const privilegedLoginIdHash = /^[a-f0-9]{64}$/.test(configuredPrivilegedLoginIdHash)
  ? configuredPrivilegedLoginIdHash
  : "909f5cb6161de820bee3aa5e94b9ef77d21a6f94578c1b39154364558acbcb38";
const configuredAccountSecret = String(process.env.DONPACHI_ACCOUNT_SECRET || "").trim();
const accountSecret = configuredAccountSecret.length >= 32
  ? configuredAccountSecret
  : createHash("sha256").update(`donpachi-account-fallback:${privilegedLoginIdHash}`).digest("hex");
const accountEncryptionKey = createHash("sha256").update(accountSecret).digest();
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const authRateWindowMs = 10 * 60 * 1000;
const authRateMaxAttempts = 8;
const authRateMaxPerAddress = 24;
const authLockMs = 5 * 60 * 1000;
const maxConcurrentPasswordHashes = 2;
const scryptAsync = promisify(scryptCallback);
const authRateLimits = new Map();
let activePasswordHashes = 0;
let profileSavePromise = Promise.resolve();
let profileSaveTimer;

const runtimeMetrics = {
  startedAt: Date.now(),
  acceptedConnections: 0,
  rejectedHandshakes: 0,
  realtimeMessagesSkipped: 0,
  outboundRateLimited: 0,
  roomBroadcastsDropped: 0,
  slowSocketsTerminated: 0,
  heartbeatTerminations: 0,
  messagesSent: 0,
  inboundMessages: 0,
  inboundRateTerminated: 0,
  customizeMessagesSkipped: 0,
  inboundTypes: Object.create(null),
  inboundStatesProcessed: 0,
  inboundStatesSkipped: 0,
  fpsSnapshots: 0,
  baccaratSnapshots: 0,
  authBusyRejections: 0,
  cacheEntriesPruned: 0
};

function isPrivilegedLoginId(loginId) {
  const normalized = normalizeLoginId(loginId);
  if (!normalized) return false;
  return createHash("sha256").update(normalized).digest("hex") === privilegedLoginIdHash;
}

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const isProd = process.env.NODE_ENV === "production";
if (isProd && configuredAccountSecret.length < 32) {
  console.warn("DONPACHI_ACCOUNT_SECRET is not configured; set a 32+ character secret before public account use.");
}
const port = Number(process.env.PORT || 5188);
const exposeQaState = process.env.DONPACHI_QA_STATE === "1";
const maxPlayers = 20;
const globalFpsRoomCode = "DONPCH";
const maxCpuPlayers = 13;
const fpsTickMs = 180;
const cpuTickMs = 360;
const maxWsMessageBytes = 8192;
const websocketRateWindowMs = 1000;
const maxInboundMessagesPerWindow = 240;
const maxOutboundMessagesPerWindow = 96;
const maxRoomRealtimeBroadcastsPerWindow = 64;
const maxWsConnections = 64;
const wsHandshakeTimeoutMs = Math.max(1_000, Number(process.env.DONPACHI_WS_HANDSHAKE_MS) || 20_000);
const wsHeartbeatIntervalMs = Math.max(1_000, Number(process.env.DONPACHI_WS_HEARTBEAT_MS) || 30_000);
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
const cpuAiVersion = "TACTICS 2.0";
const worldVersion = "VERTICAL 4.0";
const matchVersion = "MATCH 5.0";
const runtimeGuardVersion = "PERF GUARD 2.3";
const donpachiSpeed = 14.8;
const donpachiLifeMs = 5000;
const donpachiDamage = 120;
const ashinagaRange = 14;
const ashinagaDamage = 86;
const barrierDurationMs = 7000;
const barrierRespawnMs = 15000;
const spawnProtectionMs = 5000;
const vehicleMaxHealth = 600;
const vehicleDisabledMs = 9000;
const vehicleRepairPerSecond = 72;
const reconnectGraceMs = 15_000;
const lagCompensationMs = 220;
const barrierSpawn = { x: -88, y: 1.6, z: 82 };
const powerupRespawnMs = 10_000;
const powerupDurationMs = 10_000;
const focusTaskDurationMs = 52_000;
const focusTaskCooldownMs = 8_000;
const powerupKinds = ["speed", "heal", "damage", "comeback"];
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
const weaponFireDelay = new Map([
  ["rifle", 115],
  ["ak47", 135],
  ["aug", 118],
  ["smg", 72],
  ["shotgun", 520],
  ["marksman", 310],
  ["awm", 1180],
  ["type95", 205]
]);
const weaponPellets = new Map([
  ["shotgun", 6],
  ["type95", 3]
]);
const weaponFalloff = new Map([
  ["rifle", { start: 0.58, minimum: 0.72 }],
  ["ak47", { start: 0.52, minimum: 0.68 }],
  ["aug", { start: 0.65, minimum: 0.76 }],
  ["smg", { start: 0.45, minimum: 0.58 }],
  ["shotgun", { start: 0.38, minimum: 0.42 }],
  ["marksman", { start: 0.72, minimum: 0.86 }],
  ["awm", { start: 0.78, minimum: 0.9 }],
  ["type95", { start: 0.58, minimum: 0.72 }]
]);
const cpuWeaponMaxRange = new Map([
  ["rifle", 50],
  ["ak47", 52],
  ["aug", 56],
  ["smg", 28],
  ["shotgun", 16],
  ["marksman", 64],
  ["awm", 72],
  ["type95", 50],
  ["cpu", 26]
]);
const cpuDamageMultiplier = 0.5;
const cpuCastleDamageMultiplier = 0.52;
const maxEquipmentTier = 5;
const allowedWeapons = new Set(weaponDamage.keys());
const solidObstacles = [];
const okakoSolidObstacles = [];
const staticObstacleGridCellSize = 16;
const staticObstacleGridPadding = 1.2;
const staticObstacleGrids = new Map();
const emptyStaticObstacleCell = Object.freeze([]);
const emptyDoorObstacles = Object.freeze([]);
const emptyElevatorObstacles = Object.freeze([]);
const doorDefinitionsById = new Map(toyboxDoorDefinitions.map((definition) => [definition.id, definition]));
const elevatorDefinitionsById = new Map(toyboxElevatorDefinitions.map((definition) => [definition.id, definition]));
const towerDefinitionsById = new Map(toyboxTowerDefinitions.map((definition) => [definition.id, definition]));
const vehicleSpawns = [
  { id: "roadster-east", x: 64, z: 2, yaw: 0, color: "green" },
  { id: "roadster-west", x: -66, z: -38, yaw: Math.PI / 2, color: "blue" },
  { id: "roadster-south", x: 62, z: 62, yaw: -Math.PI / 2, color: "yellow" },
  { id: "roadster-north", x: -58, z: 66, yaw: Math.PI, color: "red" }
];

function addSolidObstacle(position, scale, arena = "toybox", movement = true) {
  const target = arena === "okakoj" ? okakoSolidObstacles : solidObstacles;
  target.push({
    minX: position[0] - scale[0] / 2,
    maxX: position[0] + scale[0] / 2,
    minY: position[1] - scale[1] / 2,
    maxY: position[1] + scale[1] / 2,
    minZ: position[2] - scale[2] / 2,
    maxZ: position[2] + scale[2] / 2,
    movement
  });
}

function obstaclesForArena(arena = "toybox") {
  return arena === "okakoj" ? okakoSolidObstacles : solidObstacles;
}

function arenaForContext(context = "toybox") {
  return typeof context === "string" ? context : context?.arena || "toybox";
}

function staticObstacleGridKey(x, z) {
  return `${Math.floor(x / staticObstacleGridCellSize)}:${Math.floor(z / staticObstacleGridCellSize)}`;
}

function rebuildStaticObstacleGrid(arena) {
  const grid = new Map();
  for (const box of obstaclesForArena(arena)) {
    const minCellX = Math.floor((box.minX - staticObstacleGridPadding) / staticObstacleGridCellSize);
    const maxCellX = Math.floor((box.maxX + staticObstacleGridPadding) / staticObstacleGridCellSize);
    const minCellZ = Math.floor((box.minZ - staticObstacleGridPadding) / staticObstacleGridCellSize);
    const maxCellZ = Math.floor((box.maxZ + staticObstacleGridPadding) / staticObstacleGridCellSize);
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
        const key = `${cellX}:${cellZ}`;
        const cell = grid.get(key);
        if (cell) cell.push(box);
        else grid.set(key, [box]);
      }
    }
  }
  staticObstacleGrids.set(arena, grid);
}

function staticObstaclesNear(context, x, z) {
  const arena = arenaForContext(context);
  return staticObstacleGrids.get(arena)?.get(staticObstacleGridKey(x, z)) || emptyStaticObstacleCell;
}

function doorObstaclesForContext(context) {
  return typeof context === "object" && context?.arena === "toybox" && Array.isArray(context.doorObstacles)
    ? context.doorObstacles
    : emptyDoorObstacles;
}

function elevatorObstaclesForContext(context) {
  return typeof context === "object" && context?.arena === "toybox" && Array.isArray(context.elevatorObstacles)
    ? context.elevatorObstacles
    : emptyElevatorObstacles;
}

function createDoors(now = Date.now()) {
  return new Map(toyboxDoorDefinitions.map((definition) => [definition.id, createDoorState(definition, now)]));
}

function rebuildDoorObstacles(room) {
  room.doorObstacles = [];
  if (room.arena !== "toybox") return;
  for (const definition of toyboxDoorDefinitions) {
    const state = room.doors?.get(definition.id);
    if (!state) continue;
    room.doorObstacles.push(...doorPanelBoxes(definition, state.openness));
  }
}

function updateDoors(room, now = Date.now()) {
  if (room.arena !== "toybox" || !room.doors) return;
  const entities = [];
  let obstacleChanged = false;
  for (const player of room.players.values()) {
    if (player.disconnectedAt || player.eliminated || player.health <= 0 || player.vehicleId) continue;
    entities.push(player);
  }
  for (const vehicle of room.vehicles?.values?.() || []) {
    if (vehicle.health <= 0 || (vehicle.disabledUntil || 0) > now) continue;
    entities.push({ x: vehicle.x, y: 1.1, z: vehicle.z });
  }
  for (const definition of toyboxDoorDefinitions) {
    const state = room.doors.get(definition.id);
    if (!state) continue;
    const elapsed = Math.max(0, Math.min(0.25, (now - (state.updatedAt || now)) / 1000));
    const sensedByEntity = doorShouldOpen(definition, entities, 0, now);
    if (sensedByEntity) {
      state.holdOpenUntil = Math.max(state.holdOpenUntil || 0, now + 720);
    }
    const sensed = sensedByEntity || (state.holdOpenUntil || 0) > now;
    state.targetOpen = sensed;
    const previousOpenness = state.openness;
    state.openness = stepDoorOpenness(state.openness, state.targetOpen, elapsed, definition);
    if (Math.abs(state.openness - previousOpenness) > 0.0005) obstacleChanged = true;
    state.updatedAt = now;
  }
  if (obstacleChanged) rebuildDoorObstacles(room);
}

function publicDoor(state) {
  return {
    id: state.id,
    openness: Math.round(state.openness * 1000) / 1000,
    targetOpen: Boolean(state.targetOpen),
    updatedAt: state.updatedAt
  };
}

function createElevators(now = Date.now()) {
  return new Map(toyboxElevatorDefinitions.map((definition) => [definition.id, createElevatorState(definition, now)]));
}

function updateElevators(room, now = Date.now()) {
  if (room.arena !== "toybox" || !room.elevators) return;
  let obstacleChanged = false;
  for (const definition of toyboxElevatorDefinitions) {
    const state = room.elevators.get(definition.id);
    if (!state) continue;
    const previousY = state.platformY;
    stepElevatorState(state, definition, now);
    if (Math.abs(state.platformY - previousY) > 0.0005) obstacleChanged = true;
  }
  if (obstacleChanged) rebuildElevatorObstacles(room);
}

function rebuildElevatorObstacles(room) {
  room.elevatorObstacles = [];
  if (room.arena !== "toybox") return;
  for (const definition of toyboxElevatorDefinitions) {
    const state = room.elevators?.get(definition.id);
    if (state) room.elevatorObstacles.push(elevatorPlatformBox(definition, state.platformY));
  }
}

function publicElevator(state) {
  return {
    id: state.id,
    platformY: Math.round(state.platformY * 1000) / 1000,
    currentFloor: state.currentFloor,
    targetFloor: state.targetFloor,
    moving: Boolean(state.moving),
    direction: state.direction,
    arrivedAt: state.arrivedAt,
    updatedAt: state.updatedAt
  };
}

function buildCpuCoverPoints(arena = "toybox") {
  const points = [];
  let index = 0;
  for (const box of obstaclesForArena(arena)) {
    if (box.movement === false || box.minY > 1.9 || box.maxY < 1.25) continue;
    const width = box.maxX - box.minX;
    const depth = box.maxZ - box.minZ;
    if (width < 0.45 || depth < 0.45 || width > 32 || depth > 32) continue;
    const blockerX = (box.minX + box.maxX) / 2;
    const blockerZ = (box.minZ + box.maxZ) / 2;
    const gap = 1.05;
    const candidates = [
      { x: box.minX - gap, z: blockerZ },
      { x: box.maxX + gap, z: blockerZ },
      { x: blockerX, z: box.minZ - gap },
      { x: blockerX, z: box.maxZ + gap }
    ];
    for (const candidate of candidates) {
      if (Math.abs(candidate.x) > arenaHalfSize - 2 || Math.abs(candidate.z) > arenaHalfSize - 2) continue;
      points.push({ id: `${arena}-cover-${index++}`, ...candidate, blockerX, blockerZ });
    }
  }
  return Object.freeze(points);
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
    [[78, 14.8, 75], [12, 29.6, 11]],
    [[0, 3.4, 82], [34, 6.8, 12]], [[-22, 1.3, 79], [8, 2.6, 3.2]],
    [[72, 1.9, -54], [17, 3.8, 8]], [[-72, 1.9, 54], [17, 3.8, 8]],
    [[63, 1.05, -78], [9, 2.1, 3.4]], [[-62, 1.8, 78], [5.2, 3.6, 5.2]],
    [[45, 0.95, -83], [13, 1.9, 3]], [[-85, 0.95, 18], [3, 1.9, 13]],
    [[-48, 2.6, -28], [14, 5.2, 0.5]], [[-52.8, 2.6, -20], [4.4, 5.2, 0.5]],
    [[-43.2, 2.6, -20], [4.4, 5.2, 0.5]], [[-55, 2.6, -24], [0.5, 5.2, 8]],
    [[-41, 2.6, -24], [0.5, 5.2, 8]], [[-49.7, 1.35, -21.35], [0.9, 2.7, 0.9]]
  ];
  for (const [position, scale] of boxes) addSolidObstacle(position, scale);

  const auroraTowerWalls = [
    [[74, 11, -32], [20, 22, 0.5]],
    [[67.6, 11, -12], [7.2, 22, 0.5]],
    [[80.4, 11, -12], [7.2, 22, 0.5]],
    [[64, 11, -22], [0.5, 22, 20]],
    [[84, 11, -22], [0.5, 22, 20]],
    [[77.6, 0.52, -17.7], [5.2, 0.9, 1.3]],
    [[79.7, 1.55, -31.68], [5.8, 3.1, 0.12]],
    [[78.15, 11, -29.3], [0.22, 22, 5]],
    [[81.25, 11, -29.3], [0.22, 22, 5]]
  ];
  for (const [position, scale] of auroraTowerWalls) addSolidObstacle(position, scale);
  for (const y of [5.56, 11.06, 16.56, 22.06]) {
    const slabs = [
      [[65.025, y, -22], [1.55, 0.22, 19.5]],
      [[75.425, y, -22], [5.65, 0.22, 19.5]],
      [[82.45, y, -22], [2.6, 0.22, 19.5]],
      [[79.7, y, -19.825], [2.9, 0.22, 15.15]],
      [[69.2, y, -29.675], [6.8, 0.22, 4.15]],
      [[69.2, y, -16.525], [6.8, 0.22, 8.55]]
    ];
    for (const [position, scale] of slabs) addSolidObstacle(position, scale, "toybox", false);
  }

  const nexusWalls = [
    [[-79, 13.75, -81], [14, 27.5, 0.5]],
    [[-83.85, 13.75, -67], [4.3, 27.5, 0.5]],
    [[-74.15, 13.75, -67], [4.3, 27.5, 0.5]],
    [[-79, 15.35, -67], [5.4, 24.3, 0.5]],
    [[-86, 13.75, -74], [0.5, 27.5, 14]],
    [[-72, 13.75, -74], [0.5, 27.5, 14]],
    [[-75.6, 0.52, -69.5], [4.8, 0.9, 1.2]],
    [[-75.2, 1.55, -80.68], [4, 3.1, 0.12]],
    [[-76.6, 13.75, -78.7], [0.22, 27.5, 4.6]],
    [[-73.8, 13.75, -78.7], [0.22, 27.5, 4.6]]
  ];
  for (const [position, scale] of nexusWalls) addSolidObstacle(position, scale);
  for (let level = 1; level <= 5; level += 1) {
    const y = level * 5.5 + 0.05;
    const slabs = [
      [[-85.55, y, -74], [0.4, 0.22, 13.5]],
      [[-77.625, y, -74], [2.05, 0.22, 13.5]],
      [[-73.025, y, -74], [1.55, 0.22, 13.5]],
      [[-75.2, y, -71.925], [2.8, 0.22, 9.35]],
      [[-82, y, -79.175], [6.7, 0.22, 3.15]],
      [[-82, y, -69.075], [6.7, 0.22, 3.65]]
    ];
    for (const [position, scale] of slabs) addSolidObstacle(position, scale, "toybox", false);
    if (level >= 5) continue;
    const baseY = level * 5.5;
    addSolidObstacle([-75.9, baseY + 1.35, -76.4], [0.35, 2.7, 3.3]);
    addSolidObstacle([-74.1, baseY + 0.78, -71.9], [2.4, 1.56, 0.35]);
  }

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
rebuildStaticObstacleGrid("toybox");
rebuildStaticObstacleGrid("okakoj");
const cpuCoverPointsByArena = new Map([
  ["toybox", buildCpuCoverPoints("toybox")],
  ["okakoj", buildCpuCoverPoints("okakoj")]
]);

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
    "x-frame-options": "DENY",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
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

function normalizeGuestWalletToken(value) {
  const token = String(value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  return token.length >= 16 ? token : "";
}

function secureBaccaratRandomInt(maxExclusive) {
  return cryptoRandomInt(Math.max(1, Math.floor(Number(maxExclusive) || 1)));
}

function getGuestWallet(token, create = false) {
  const normalized = normalizeGuestWalletToken(token);
  if (!normalized) return null;
  if (!guestWallets.has(normalized) && create) {
    guestWallets.set(normalized, { don: initialSharedDon, updatedAt: Date.now() });
  }
  const wallet = guestWallets.get(normalized) || null;
  if (wallet) wallet.updatedAt = Date.now();
  return wallet;
}

function walletDon(profileRecord, guestToken) {
  if (profileRecord?.profile) return sanitizeInventory(profileRecord.profile.inventory).don;
  return getGuestWallet(guestToken)?.don ?? null;
}

function persistPlayerWallet(player, amount = player?.chips) {
  if (!player) return 0;
  const don = clamp(Math.floor(Number(amount) || 0), 0, 999_999);
  player.chips = don;
  if (player.profileKey && profileStore.profiles[player.profileKey]) {
    const profile = profileStore.profiles[player.profileKey];
    profile.inventory = { ...sanitizeInventory(profile.inventory), don };
    profile.updatedAt = Date.now();
    return don;
  }
  const wallet = getGuestWallet(player.guestToken);
  if (wallet) {
    wallet.don = don;
    wallet.updatedAt = Date.now();
  }
  return don;
}

function playerWalletDon(player) {
  if (player?.profileKey && profileStore.profiles[player.profileKey]) {
    return sanitizeInventory(profileStore.profiles[player.profileKey].inventory).don;
  }
  return getGuestWallet(player?.guestToken)?.don ?? 0;
}

function creditPlayerWallet(player, amount) {
  const next = clamp(playerWalletDon(player) + Math.max(0, Math.floor(Number(amount) || 0)), 0, 999_999);
  if (player?.profileKey && profileStore.profiles[player.profileKey]) {
    const profile = profileStore.profiles[player.profileKey];
    profile.inventory = { ...sanitizeInventory(profile.inventory), don: next };
    profile.updatedAt = Date.now();
  } else {
    const wallet = getGuestWallet(player?.guestToken);
    if (wallet) {
      wallet.don = next;
      wallet.updatedAt = Date.now();
    }
  }
  return next;
}

function profileHash(loginId) {
  return createHash("sha256").update(`donpachi-profile-v1:${loginId}`).digest("hex");
}

function encodeTokenPart(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeTokenPart(value) {
  return Buffer.from(String(value || ""), "base64url");
}

function signedAccountToken(payload) {
  const body = encodeTokenPart(JSON.stringify(payload));
  const signature = createHmac("sha256", accountSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifySignedAccountToken(token) {
  const [body, signature, extra] = String(token || "").split(".");
  if (!body || !signature || extra) return null;
  const expected = createHmac("sha256", accountSecret).update(body).digest();
  let provided;
  try {
    provided = decodeTokenPart(signature);
  } catch {
    return null;
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    return JSON.parse(decodeTokenPart(body).toString("utf8"));
  } catch {
    return null;
  }
}

function issueAccountSession(profileKey) {
  return signedAccountToken({
    version: 1,
    profileKey,
    expiresAt: Date.now() + sessionLifetimeMs,
    nonce: randomBytes(12).toString("base64url")
  });
}

function verifyAccountSession(token, profileKey) {
  const payload = verifySignedAccountToken(token);
  return Boolean(
    payload
    && payload.version === 1
    && payload.profileKey === profileKey
    && Number(payload.expiresAt) > Date.now()
  );
}

function sealProfileVault(profileKey, profile) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", accountEncryptionKey, iv);
  const plaintext = Buffer.from(JSON.stringify({ version: 2, profileKey, profile }), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

function openProfileVault(vault) {
  const parts = String(vault || "").split(".");
  if (parts.length !== 3) return null;
  try {
    const [iv, tag, encrypted] = parts.map((part) => Buffer.from(part, "base64url"));
    if (iv.length !== 12 || tag.length !== 16 || encrypted.length > 32_768) return null;
    const decipher = createDecipheriv("aes-256-gcm", accountEncryptionKey, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const payload = JSON.parse(plaintext.toString("utf8"));
    return payload?.version === 2 ? payload : null;
  } catch {
    return null;
  }
}

function restoreProfileFromVault(loginId, vault) {
  const normalized = normalizeLoginId(loginId);
  if (normalized.length < 6 || !vault) return null;
  const expectedKey = profileHash(normalized);
  const payload = openProfileVault(vault);
  if (!payload || payload.profileKey !== expectedKey || !payload.profile?.auth?.passwordHash || !payload.profile?.auth?.salt) return null;
  const restored = {
    ...makeProfile(),
    ...payload.profile,
    name: sanitizePlayerName(payload.profile.name),
    skin: normalizeSkin(payload.profile.skin),
    cosmeticColor: safeColor(payload.profile.cosmeticColor) || "#1598f0",
    progress: sanitizeProgress(payload.profile.progress),
    inventory: sanitizeInventory(payload.profile.inventory, payload.profile.skin),
    auth: sanitizeStoredAuth(payload.profile.auth),
    updatedAt: Math.max(0, Number(payload.profile.updatedAt) || Date.now())
  };
  if (!restored.auth.passwordHash) return null;
  const existing = profileStore.profiles[expectedKey];
  const existingAuth = sanitizeStoredAuth(existing?.auth);
  const sameAccount = !existingAuth.passwordHash || existingAuth.passwordHash === restored.auth.passwordHash;
  if (!existing || (sameAccount && restored.updatedAt > (Number(existing.updatedAt) || 0))) {
    profileStore.profiles[expectedKey] = restored;
    saveProfileSoon();
  }
  return { key: expectedKey, profile: profileStore.profiles[expectedKey] };
}

function authenticatedProfileRecord(loginId, sessionToken, vault) {
  const normalized = normalizeLoginId(loginId);
  if (normalized.length < 6) return null;
  const key = profileHash(normalized);
  if (!verifyAccountSession(sessionToken, key)) return null;
  const record = restoreProfileFromVault(normalized, vault) || getProfileRecord(normalized);
  if (!record || record.key !== key) return null;
  return record;
}

function normalizePassword(value) {
  return String(value || "").normalize("NFKC").slice(0, 72);
}

function validPassword(password) {
  return password.length >= 10 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

function sanitizeStoredAuth(auth = {}) {
  if (!auth || typeof auth !== "object") auth = {};
  const salt = /^[A-Za-z0-9_-]{16,64}$/.test(String(auth.salt || "")) ? String(auth.salt) : "";
  const passwordHash = /^[A-Za-z0-9_-]{40,128}$/.test(String(auth.passwordHash || "")) ? String(auth.passwordHash) : "";
  return {
    salt,
    passwordHash,
    failedAttempts: clamp(Math.floor(Number(auth.failedAttempts) || 0), 0, 20),
    lockUntil: clamp(Math.floor(Number(auth.lockUntil) || 0), 0, Number.MAX_SAFE_INTEGER),
    passwordUpdatedAt: clamp(Math.floor(Number(auth.passwordUpdatedAt) || 0), 0, Number.MAX_SAFE_INTEGER)
  };
}

async function derivePassword(password, salt) {
  if (activePasswordHashes >= maxConcurrentPasswordHashes) {
    runtimeMetrics.authBusyRejections += 1;
    throw Object.assign(new Error("password hashing capacity reached"), {
      status: 503,
      publicMessage: "ログイン処理が混み合っています。数秒後に再試行してください。"
    });
  }
  activePasswordHashes += 1;
  try {
    return Buffer.from(await scryptAsync(password, salt, 64, {
      N: 16_384,
      r: 8,
      p: 1,
      maxmem: 32 * 1024 * 1024
    }));
  } finally {
    activePasswordHashes -= 1;
  }
}

async function createPasswordAuth(password) {
  const salt = randomBytes(18).toString("base64url");
  const derived = await derivePassword(password, salt);
  return {
    salt,
    passwordHash: derived.toString("base64url"),
    failedAttempts: 0,
    lockUntil: 0,
    passwordUpdatedAt: Date.now()
  };
}

async function verifyPassword(password, auth) {
  const stored = sanitizeStoredAuth(auth);
  const salt = stored.salt || "donpachi-dummy-auth";
  const expected = stored.passwordHash ? Buffer.from(stored.passwordHash, "base64url") : Buffer.alloc(64);
  const derived = await derivePassword(password, salt);
  return Boolean(stored.passwordHash && expected.length === derived.length && timingSafeEqual(expected, derived));
}

function requestAddress(req) {
  const forwardedParts = String(req.headers?.["x-forwarded-for"] || "").split(",").map((part) => part.trim()).filter(Boolean);
  const forwarded = forwardedParts.at(-1) || "";
  return forwarded || String(req.socket?.remoteAddress || "unknown");
}

function authRateAllowed(req, loginId) {
  const now = Date.now();
  if (authRateLimits.size > 1_000) {
    runtimeMetrics.cacheEntriesPruned += pruneTimedMap(authRateLimits, {
      now,
      maxAgeMs: 0,
      maxEntries: 1_000,
      timestamp: (entry) => entry.resetAt
    });
  }
  const address = requestAddress(req);
  const attempts = [
    [`address:${address}`, authRateMaxPerAddress],
    [`account:${address}:${profileHash(normalizeLoginId(loginId))}`, authRateMaxAttempts]
  ];
  let allowed = true;
  for (const [key, limit] of attempts) {
    const current = authRateLimits.get(key);
    const next = !current || current.resetAt <= now ? { count: 0, resetAt: now + authRateWindowMs } : current;
    next.count += 1;
    authRateLimits.set(key, next);
    if (next.count > limit) allowed = false;
  }
  return allowed;
}

function accountResponse(record, sessionToken = "") {
  return {
    profile: publicProfile(record.profile),
    sessionToken: sessionToken || issueAccountSession(record.key),
    accountVault: sealProfileVault(record.key, record.profile),
    shop: publicShopState(record.profile.inventory),
    progressionVersion
  };
}

function emptyProgress() {
  return {
    xp: 0,
    sessions: 0,
    streakDays: 0,
    lastPlayDate: "",
    bestScore: 0,
    bestKills: 0,
    baccaratWins: 0,
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
    baccaratWins: clamp(Math.floor(Number(progress.baccaratWins ?? progress.pokerWins) || base.baccaratWins), 0, 99_999),
    lastReward: cleanText(progress.lastReward, 48, base.lastReward)
  };
}

function sanitizeInventory(inventory = {}, selectedSkin = "rounded") {
  const healPacks = Number.isFinite(Number(inventory.healPacks)) ? Number(inventory.healPacks) : initialHealPacks;
  const storedDon = inventory.don ?? inventory.pokerDon;
  const don = Number.isFinite(Number(storedDon)) ? Number(storedDon) : initialSharedDon;
  return {
    healPacks: clamp(Math.floor(healPacks), 0, 12),
    don: clamp(Math.floor(don), 0, 999_999),
    barrierCharges: clamp(Math.floor(Number(inventory.barrierCharges) || 0), 0, 9),
    boostTickets: clamp(Math.floor(Number(inventory.boostTickets) || 0), 0, 20),
    upgrades: sanitizeUpgrades(inventory.upgrades),
    ownedSkins: sanitizeOwnedSkins(inventory.ownedSkins, selectedSkin)
  };
}

function levelFromXp(xp = 0) {
  return levelFromProgressXp(xp);
}

function makeProfile() {
  const now = Date.now();
  return {
    name: "プレイヤー",
    skin: "rounded",
    cosmeticColor: "#1598f0",
    progress: emptyProgress(),
    inventory: sanitizeInventory(),
    auth: sanitizeStoredAuth(),
    createdAt: now,
    updatedAt: now
  };
}

async function loadProfileStore() {
  try {
    const parsed = JSON.parse(await readFile(profileStorePath, "utf8"));
    return {
      version: 2,
      profiles: parsed && typeof parsed.profiles === "object" && parsed.profiles ? parsed.profiles : {}
    };
  } catch {
    return { version: 2, profiles: {} };
  }
}

function saveProfileStore() {
  const serialized = JSON.stringify(profileStore);
  profileSavePromise = profileSavePromise
    .catch(() => undefined)
    .then(async () => {
      await mkdir(resolve(profileStorePath, ".."), { recursive: true });
      await writeFile(profileStorePath, serialized, "utf8");
    });
  return profileSavePromise;
}

function getProfileRecord(loginId) {
  const normalized = normalizeLoginId(loginId);
  if (normalized.length < 6) return null;
  const key = profileHash(normalized);
  const profile = profileStore.profiles[key];
  return profile ? { key, profile } : null;
}

function getProfile(loginId) {
  return getProfileRecord(loginId)?.profile || null;
}

function getOrCreateProfile(loginId) {
  const normalized = normalizeLoginId(loginId);
  if (normalized.length < 6) return null;
  const key = profileHash(normalized);
  profileStore.profiles[key] ||= makeProfile();
  return { key, profile: profileStore.profiles[key] };
}

function mergeProfile(profile, payload = {}, options = {}) {
  if (!profile) return null;
  if (payload.name !== undefined) profile.name = sanitizePlayerName(payload.name);
  if (payload.skin !== undefined) {
    const requestedSkin = normalizeSkin(payload.skin);
    const ownedSkins = sanitizeInventory(profile.inventory, profile.skin).ownedSkins;
    if (ownedSkins.includes(requestedSkin) || options.allowLegacySkin) profile.skin = requestedSkin;
  }
  if (payload.cosmeticColor !== undefined) profile.cosmeticColor = safeColor(payload.cosmeticColor) || profile.cosmeticColor || "#1598f0";
  if (options.allowProgress && payload.progress && typeof payload.progress === "object") {
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
      baccaratWins: Math.max(current.baccaratWins, next.baccaratWins),
      lastReward: next.lastReward || current.lastReward
    };
  } else {
    profile.progress = sanitizeProgress(profile.progress);
  }
  if (options.allowInventory && payload.inventory && typeof payload.inventory === "object") {
    const next = sanitizeInventory(payload.inventory, profile.skin);
    const current = sanitizeInventory(profile.inventory, profile.skin);
    profile.inventory = {
      healPacks: clamp(Math.floor(Number(next.healPacks)), 0, 12),
      don: options.allowDon ? Math.max(current.don, next.don) : current.don,
      barrierCharges: Math.max(current.barrierCharges, next.barrierCharges),
      boostTickets: Math.max(current.boostTickets, next.boostTickets),
      upgrades: {
        attack: Math.max(current.upgrades.attack, next.upgrades.attack),
        armor: Math.max(current.upgrades.armor, next.upgrades.armor),
        recovery: Math.max(current.upgrades.recovery, next.upgrades.recovery)
      },
      ownedSkins: sanitizeOwnedSkins([...current.ownedSkins, ...next.ownedSkins], profile.skin)
    };
  } else {
    profile.inventory = sanitizeInventory(profile.inventory, profile.skin);
  }
  profile.auth = sanitizeStoredAuth(profile.auth);
  profile.updatedAt = Date.now();
  return profile;
}

function publicProfile(profile) {
  const progress = sanitizeProgress(profile?.progress);
  const inventory = sanitizeInventory(profile?.inventory, profile?.skin);
  const bonuses = progressionBonuses(progress.xp, inventory.upgrades);
  return {
    name: sanitizePlayerName(profile?.name),
    skin: normalizeSkin(profile?.skin),
    cosmeticColor: safeColor(profile?.cosmeticColor) || "#1598f0",
    level: levelFromXp(progress.xp),
    progress,
    inventory,
    bonuses,
    shop: publicShopState(inventory),
    progressionVersion
  };
}

function profileForPlayer(player) {
  return player?.profileKey ? profileStore.profiles[player.profileKey] : null;
}

function combatBonusesForProfile(profile) {
  const progress = sanitizeProgress(profile?.progress);
  const inventory = sanitizeInventory(profile?.inventory, profile?.skin);
  return progressionBonuses(progress.xp, inventory.upgrades);
}

function applyPersistentCombatBonuses(player) {
  if (!player || player.isBot) return;
  const profile = profileForPlayer(player);
  const bonuses = combatBonusesForProfile(profile);
  player.profileAttackMultiplier = bonuses.attackMultiplier;
  player.damageReduction = bonuses.damageReduction;
  player.healPacks = bonuses.startingHealPacks;
  player.equipmentTier = bonuses.startingEquipmentTier;
}

function consumeMatchItems(player, now = Date.now()) {
  if (!player || player.isBot) return false;
  const profile = profileForPlayer(player);
  if (!profile) return false;
  const inventory = sanitizeInventory(profile.inventory, profile.skin);
  let changed = false;
  if (inventory.barrierCharges > 0) {
    inventory.barrierCharges -= 1;
    player.shieldUntil = Math.max(player.shieldUntil || 0, now + barrierDurationMs);
    changed = true;
  }
  if (inventory.boostTickets > 0) {
    inventory.boostTickets -= 1;
    player.speedBoostUntil = Math.max(player.speedBoostUntil || 0, now + powerupDurationMs);
    changed = true;
  }
  if (!changed) return false;
  profile.inventory = sanitizeInventory(inventory, profile.skin);
  profile.updatedAt = now;
  send(player.ws, {
    type: "account_sync",
    profile: publicProfile(profile),
    accountVault: sealProfileVault(player.profileKey, profile),
    reason: "match_items"
  });
  return true;
}

function saveProfileSoon() {
  if (profileSaveTimer) return;
  profileSaveTimer = setTimeout(() => {
    profileSaveTimer = undefined;
    saveProfileStore().catch(() => undefined);
  }, 250);
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
      res.end(JSON.stringify({ ok: false, message: "ログインIDは6文字以上で、英数字・_・-だけ使えます。" }));
      return;
    }
    const mode = ["create", "login", "save"].includes(String(payload.mode)) ? String(payload.mode) : "login";
    const sessionToken = String(payload.sessionToken || "").slice(0, 1024);
    const accountVault = String(payload.accountVault || "").slice(0, 48_000);
    const authenticated = authenticatedProfileRecord(loginId, sessionToken, accountVault);

    if (mode === "save") {
      if (!authenticated) {
        res.writeHead(401, securityHeaders("application/json; charset=utf-8"));
        res.end(JSON.stringify({ ok: false, message: "ログイン期限が切れました。パスワードで再ログインしてください。" }));
        return;
      }
      mergeProfile(authenticated.profile, payload);
      await saveProfileStore();
      res.writeHead(200, securityHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({ ok: true, ...accountResponse(authenticated, sessionToken) }));
      return;
    }

    if (mode === "login" && authenticated) {
      res.writeHead(200, securityHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({ ok: true, ...accountResponse(authenticated, sessionToken) }));
      return;
    }

    if (!authRateAllowed(req, loginId)) {
      res.writeHead(429, { ...securityHeaders("application/json; charset=utf-8"), "retry-after": "600" });
      res.end(JSON.stringify({ ok: false, message: "ログイン試行が多すぎます。10分後に再試行してください。" }));
      return;
    }

    const password = normalizePassword(payload.password);
    if (!validPassword(password)) {
      res.writeHead(400, securityHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({ ok: false, message: "パスワードは英字と数字を含む10文字以上にしてください。" }));
      return;
    }

    let record = restoreProfileFromVault(loginId, accountVault) || getProfileRecord(loginId);
    if (mode === "create") {
      if (record?.profile?.auth?.passwordHash) {
        res.writeHead(409, securityHeaders("application/json; charset=utf-8"));
        res.end(JSON.stringify({ ok: false, message: "このログインIDは使用済みです。ログインを選んでください。" }));
        return;
      }
      const legacyMigration = Boolean(record) || payload.legacyMigration === true;
      record ||= getOrCreateProfile(loginId);
      record.profile.auth = await createPasswordAuth(password);
      mergeProfile(record.profile, payload, {
        allowProgress: legacyMigration,
        allowInventory: legacyMigration,
        allowDon: legacyMigration,
        allowLegacySkin: true
      });
      await saveProfileStore();
      const nextSession = issueAccountSession(record.key);
      res.writeHead(200, securityHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({ ok: true, migrated: legacyMigration, ...accountResponse(record, nextSession) }));
      return;
    }

    if (!record) {
      await verifyPassword(password, null);
      res.writeHead(404, securityHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({ ok: false, message: "このログインIDはまだ作成されていません。" }));
      return;
    }
    const auth = sanitizeStoredAuth(record.profile.auth);
    if (!auth.passwordHash) {
      res.writeHead(409, securityHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({ ok: false, message: "セキュリティ更新が必要です。「このIDで作成」からパスワードを登録してください。" }));
      return;
    }
    if (auth.lockUntil > Date.now()) {
      res.writeHead(423, securityHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({ ok: false, message: "このIDは一時ロック中です。5分後に再試行してください。" }));
      return;
    }
    if (!await verifyPassword(password, auth)) {
      auth.failedAttempts += 1;
      if (auth.failedAttempts >= 5) {
        auth.failedAttempts = 0;
        auth.lockUntil = Date.now() + authLockMs;
      }
      record.profile.auth = auth;
      await saveProfileStore();
      res.writeHead(401, securityHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({ ok: false, message: "ログインIDまたはパスワードが違います。" }));
      return;
    }
    record.profile.auth = { ...auth, failedAttempts: 0, lockUntil: 0 };
    record.profile.updatedAt = Date.now();
    await saveProfileStore();
    const nextSession = issueAccountSession(record.key);
    res.writeHead(200, securityHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({ ok: true, ...accountResponse(record, nextSession) }));
  } catch (error) {
    res.writeHead(error?.status || 500, securityHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({ ok: false, message: error?.publicMessage || "プロフィール処理に失敗しました。" }));
  }
}

async function handleWalletRequest(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, securityHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({ ok: false, message: "method not allowed" }));
    return;
  }
  try {
    const payload = await readJsonRequest(req);
    const loginId = normalizeLoginId(payload.loginId);
    if (loginId) {
      const sessionToken = String(payload.sessionToken || "").slice(0, 1024);
      const record = authenticatedProfileRecord(loginId, sessionToken, String(payload.accountVault || "").slice(0, 48_000));
      if (!record) {
        res.writeHead(401, securityHeaders("application/json; charset=utf-8"));
        res.end(JSON.stringify({ ok: false, message: "共通Donの同期には再ログインが必要です。" }));
        return;
      }
      res.writeHead(200, securityHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({
        ok: true,
        scope: "account",
        balance: sanitizeInventory(record.profile.inventory).don,
        guestToken: "",
        accountVault: sealProfileVault(record.key, record.profile)
      }));
      return;
    }
    const guestToken = normalizeGuestWalletToken(payload.guestToken) || crypto.randomUUID();
    const wallet = getGuestWallet(guestToken, true);
    res.writeHead(200, securityHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({
      ok: true,
      scope: "guest",
      balance: wallet.don,
      guestToken
    }));
  } catch (error) {
    res.writeHead(error?.status || 500, securityHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({ ok: false, message: "共通Donの同期に失敗しました。" }));
  }
}

async function handleShopRequest(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, securityHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({ ok: false, message: "method not allowed" }));
    return;
  }
  try {
    const payload = await readJsonRequest(req);
    const loginId = normalizeLoginId(payload.loginId);
    const sessionToken = String(payload.sessionToken || "").slice(0, 1024);
    const record = authenticatedProfileRecord(loginId, sessionToken, String(payload.accountVault || "").slice(0, 48_000));
    if (!record) {
      res.writeHead(401, securityHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({ ok: false, message: "ショップを使うにはログインしてください。" }));
      return;
    }
    const purchase = purchaseShopItem(sanitizeInventory(record.profile.inventory, record.profile.skin), String(payload.itemId || ""));
    if (!purchase.ok) {
      const messages = {
        insufficient_don: "Donが足りません。",
        max_level: "この強化は最大レベルです。",
        max_items: "このアイテムは所持上限です。",
        already_owned: "すでに所持しています。",
        unknown_item: "商品が見つかりません。"
      };
      res.writeHead(400, securityHeaders("application/json; charset=utf-8"));
      res.end(JSON.stringify({ ok: false, message: messages[purchase.reason] || "購入できませんでした。" }));
      return;
    }
    record.profile.inventory = sanitizeInventory(purchase.inventory, record.profile.skin);
    record.profile.updatedAt = Date.now();
    await saveProfileStore();
    res.writeHead(200, securityHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({
      ok: true,
      message: `${purchase.item.name}を購入しました。`,
      cost: purchase.cost,
      ...accountResponse(record, sessionToken)
    }));
  } catch (error) {
    res.writeHead(error?.status || 500, securityHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({ ok: false, message: "購入処理に失敗しました。" }));
  }
}

const rooms = new Map();
const pokerRooms = new Map();
const guestWallets = new Map();
const profileStorePath = resolve(process.env.DONPACHI_PROFILE_STORE || join(__dirname, "data", "profiles.json"));
const profileStore = await loadProfileStore();
const baccaratTable = createBaccaratTable(Date.now(), secureBaccaratRandomInt);
baccaratTable.chaosMode = true;
const baccaratQaTable = createBaccaratTable(Date.now(), secureBaccaratRandomInt);
baccaratQaTable.code = baccaratQaTableCode;
baccaratQaTable.qaMode = true;
let wss;
let vite;

function activeGuestWalletTokens() {
  const active = new Set();
  for (const room of rooms.values()) {
    for (const player of room.players.values()) {
      if (!player.isBot && player.guestToken) active.add(player.guestToken);
    }
  }
  for (const table of [baccaratTable, baccaratQaTable]) {
    for (const player of table.players.values()) {
      if (player.connected && player.guestToken) active.add(player.guestToken);
    }
  }
  return active;
}

function pruneRuntimeCaches(now = Date.now()) {
  runtimeMetrics.cacheEntriesPruned += pruneTimedMap(authRateLimits, {
    now,
    maxAgeMs: 0,
    maxEntries: 1_000,
    timestamp: (entry) => entry.resetAt
  });
  runtimeMetrics.cacheEntriesPruned += pruneTimedMap(guestWallets, {
    now,
    maxAgeMs: 24 * 60 * 60 * 1000,
    maxEntries: 2_000,
    timestamp: (wallet) => wallet.updatedAt,
    protectedKeys: activeGuestWalletTokens()
  });
}

function runtimeHealth() {
  return {
    version: runtimeGuardVersion,
    memoryMiB: {
      ...memoryUsageMiB(process.memoryUsage()),
      limit: 512
    },
    uptimeSeconds: Math.floor((Date.now() - runtimeMetrics.startedAt) / 1000),
    websockets: {
      active: wss?.clients?.size || 0,
      accepted: runtimeMetrics.acceptedConnections,
      rejectedHandshakes: runtimeMetrics.rejectedHandshakes,
      realtimeSkipped: runtimeMetrics.realtimeMessagesSkipped,
      outboundRateLimited: runtimeMetrics.outboundRateLimited,
      roomBroadcastsDropped: runtimeMetrics.roomBroadcastsDropped,
      slowTerminated: runtimeMetrics.slowSocketsTerminated,
      heartbeatTerminated: runtimeMetrics.heartbeatTerminations,
      sent: runtimeMetrics.messagesSent,
      inbound: runtimeMetrics.inboundMessages,
      inboundRateTerminated: runtimeMetrics.inboundRateTerminated,
      customizeSkipped: runtimeMetrics.customizeMessagesSkipped,
      inboundTypes: runtimeMetrics.inboundTypes,
      inboundStatesProcessed: runtimeMetrics.inboundStatesProcessed,
      inboundStatesSkipped: runtimeMetrics.inboundStatesSkipped
    },
    snapshots: {
      fps: runtimeMetrics.fpsSnapshots,
      baccarat: runtimeMetrics.baccaratSnapshots,
      intervalMs: fpsTickMs,
      cpuIntervalMs: cpuTickMs
    },
    auth: {
      activeHashes: activePasswordHashes,
      busyRejections: runtimeMetrics.authBusyRejections,
      rateEntries: authRateLimits.size
    },
    cache: {
      guestWallets: guestWallets.size,
      pruned: runtimeMetrics.cacheEntriesPruned
    }
  };
}

if (!isProd) {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, securityHeaders());
    res.end();
    return;
  }

  if (String(req.url || "").split("?")[0] === "/api/profile") {
    await handleProfileRequest(req, res);
    return;
  }

  if (String(req.url || "").split("?")[0] === "/api/wallet") {
    await handleWalletRequest(req, res);
    return;
  }

  if (String(req.url || "").split("?")[0] === "/api/shop") {
    await handleShopRequest(req, res);
    return;
  }

  if (req.url === "/health") {
    const now = Date.now();
    const players = [...rooms.values()].flatMap((room) => [...room.players.values()]
      .filter((player) => !player.isBot && !player.disconnectedAt && now - player.lastSeen < 45_000)
      .map((player) => ({
        name: player.name,
        room: room.code,
        color: player.color,
        score: player.score
      })));
    res.writeHead(200, securityHeaders("application/json; charset=utf-8"));
    res.end(JSON.stringify({
      ok: true,
      rooms: rooms.size,
      players,
      progressionVersion,
      maxCpuPlayers,
      runtime: runtimeHealth()
    }));
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

wss = new WebSocketServer({
  server,
  path: "/ws",
  maxPayload: maxWsMessageBytes,
  perMessageDeflate: false
});

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

function normalizeResumeToken(value) {
  const token = String(value || "").trim();
  return /^[a-f0-9-]{20,80}$/i.test(token) ? token : "";
}

function normalizeWeapon(value) {
  const weapon = String(value || "rifle");
  return allowedWeapons.has(weapon) ? weapon : "rifle";
}

function consumeShotBudget(player, weapon, now = Date.now()) {
  const burstLimit = weaponPellets.get(weapon) || 1;
  const continuingBurst = player.shotBurstWeapon === weapon
    && now - (player.shotBurstStartedAt || 0) <= 85
    && (player.shotBurstRemaining || 0) > 0;
  if (continuingBurst) {
    player.shotBurstRemaining -= 1;
    return true;
  }

  const delay = weaponFireDelay.get(weapon) || 115;
  if (now - (player.lastWeaponTriggerAt || 0) < delay * 0.82) return false;
  player.lastWeaponTriggerAt = now;
  player.shotBurstStartedAt = now;
  player.shotBurstWeapon = weapon;
  player.shotBurstRemaining = burstLimit - 1;
  return true;
}

function weaponDamageAtDistance(weapon, damage, distance, range) {
  const falloff = weaponFalloff.get(weapon);
  if (!falloff || range <= 0) return Math.max(1, Math.round(damage));
  const ratio = clamp(distance / range, 0, 1);
  if (ratio <= falloff.start) return Math.max(1, Math.round(damage));
  const progress = (ratio - falloff.start) / Math.max(0.001, 1 - falloff.start);
  const multiplier = 1 - progress * (1 - falloff.minimum);
  return Math.max(1, Math.round(damage * multiplier));
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

function connectedHumanPlayers(room) {
  return humanPlayers(room).filter((player) => !player.disconnectedAt);
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
  return now + 16_000 + Math.floor(Math.random() * 9_000);
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
    available: true,
    respawnAt: 0
  }));
}

function createVehicles(now = Date.now()) {
  return new Map(vehicleSpawns.map((spawn) => [spawn.id, {
    ...spawn,
    spawnX: spawn.x,
    spawnZ: spawn.z,
    spawnYaw: spawn.yaw,
    speed: 0,
    driverId: "",
    throttle: 0,
    targetThrottle: 0,
    steer: 0,
    targetSteer: 0,
    braking: false,
    health: vehicleMaxHealth,
    maxHealth: vehicleMaxHealth,
    disabledUntil: 0,
    repairing: false,
    lastInputAt: 0,
    updatedAt: now
  }]));
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
    ...createMatchLifecycle(),
    roundStartedAt: 0,
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
    castleEndsAt: 0,
    cpuCount: 0,
    donPunches: new Map(),
    vehicles: createVehicles(),
    castleCores: createCastleCores(),
    barrier: { ...barrierSpawn, available: true, pickedBy: "", respawnAt: 0 },
    healthPickup: { ...randomPickupSpawn(arenaId), available: false, respawnAt: gameMode === "oneLife" ? nextHealthPickupAt() : 0 },
    powerups: createPowerups()
  };
  room.doors = createDoors(room.createdAt);
  room.elevators = createElevators(room.createdAt);
  rebuildDoorObstacles(room);
  rebuildElevatorObstacles(room);
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

function broadcastBaccarat(table = baccaratTable, now = Date.now()) {
  let delivered = false;
  for (const player of table.players.values()) {
    if (!player.connected || !player.ws || player.ws.readyState !== 1) continue;
    delivered = send(player.ws, baccaratSnapshotFor(table, player.id, now)) || delivered;
  }
  if (delivered) runtimeMetrics.baccaratSnapshots += 1;
}

function spawnPoint(index = 0) {
  const points = [
    [-36, 1.6, 16],
    [36, 1.6, -16],
    [-42, 1.6, -18],
    [42, 1.6, 30],
    [-14, 1.6, -42],
    [14, 1.6, 42],
    [-64, 1.6, -8],
    [64, 1.6, 8],
    [-60, 1.6, 34],
    [64, 1.6, -34],
    [-79, 1.6, -62.25],
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
  const yaw = Math.atan2(point[0], point[2]);
  return { x: point[0], y: point[1], z: point[2], yaw };
}

function initialPlayerSpawnPoint(room, preferredIndex = 0) {
  const spawnCount = 20;
  for (let offset = 0; offset < spawnCount; offset += 1) {
    const candidate = spawnPoint(preferredIndex + offset);
    if (cpuSpawnIsClear(room, candidate.x, candidate.z)) return candidate;
  }

  const preferred = spawnPoint(preferredIndex);
  for (let ring = 1; ring <= 8; ring += 1) {
    const distance = ring * 2.15;
    for (let step = 0; step < 16; step += 1) {
      const angle = (Math.PI * 2 * step) / 16 + preferredIndex * 0.41;
      const x = clamp(preferred.x + Math.cos(angle) * distance, -arenaHalfSize + 2, arenaHalfSize - 2);
      const z = clamp(preferred.z + Math.sin(angle) * distance, -arenaHalfSize + 2, arenaHalfSize - 2);
      if (!cpuSpawnIsClear(room, x, z)) continue;
      return { x, y: 1.6, z, yaw: Math.atan2(x, z) };
    }
  }

  const fallback = findNearestCpuSafeSpot(preferred.x, preferred.z, 0.72, room);
  return { x: fallback.x, y: 1.6, z: fallback.z, yaw: Math.atan2(fallback.x, fallback.z) };
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
    itemPickups: player.itemPickups || 0,
    lives: player.lives || 0,
    eliminated: Boolean(player.eliminated),
    creative: Boolean(player.creative),
    healPacks: player.healPacks || 0,
    equipmentTier: player.equipmentTier || 0,
    attackBonus: Math.max(0, Math.round(((Number(player.profileAttackMultiplier) || 1) - 1) * 100)),
    armorBonus: Math.max(0, Math.round((Number(player.damageReduction) || 0) * 100)),
    focusTask: publicFocusTask(player.focusTask),
    donPunchCharge: player.donPunchCharge || 0,
    x: player.x,
    y: player.y,
    z: player.z,
    yaw: player.yaw,
    pitch: player.pitch,
    lastSeen: player.lastSeen,
    connected: !player.disconnectedAt,
    isBot: Boolean(player.isBot),
    weapon: player.botWeapon || "rifle",
    botRole: player.isBot ? player.botRole || cpuRoleForIndex(player.botIndex) : undefined,
    botTactic: player.isBot ? player.botTactic || "patrol" : undefined,
    shieldUntil: player.shieldUntil || 0,
    speedBoostUntil: player.speedBoostUntil || 0,
    damageBoostUntil: player.damageBoostUntil || 0,
    comebackUntil: player.comebackUntil || 0,
    spawnProtectedUntil: player.spawnProtectedUntil || 0,
    vehicleId: player.vehicleId || "",
    level: levelFromXp(profileForPlayer(player)?.progress?.xp || 0),
    ...(exposeQaState && player.isBot ? {
      qaVerticalStage: player.verticalStage || "",
      qaVerticalProgress: Number(player.verticalProgress) || 0,
      qaVerticalTower: player.verticalTowerId || "",
      qaMoveBlock: player.qaMoveBlock || "",
      qaBotIndex: player.botIndex || 0
    } : {})
  };
}

function recordPlayerPose(player, at = Date.now()) {
  player.poseHistory ||= [];
  appendMotionSample(player.poseHistory, {
    at,
    x: player.x,
    y: player.y,
    z: player.z,
    yaw: player.yaw
  }, { maxSamples: 18, maxAgeMs: 1200, teleportDistance: 24 });
}

function fpsWelcomePayload(player, room, profile, resumed = false) {
  return {
    type: "welcome",
    id: player.id,
    room: room.code,
    gameMode: room.mode,
    arena: room.arena,
    team: player.color,
    partySize: room.partySize,
    cpuFill: room.cpuFill,
    relationMode: room.relationMode,
    targetScore: room.targetScore,
    maxPlayers: room.maxHumanPlayers || maxPlayers,
    ...publicMatchLifecycle(room),
    spawn: { x: player.x, y: player.y, z: player.z, yaw: player.yaw },
    profile: profile ? publicProfile(profile) : null,
    accountVault: player.profileKey && profile ? sealProfileVault(player.profileKey, profile) : "",
    guestToken: player.guestToken || "",
    walletDon: playerWalletDon(player),
    isHost: Boolean(player.isHost),
    resumeToken: player.resumeToken,
    resumed
  };
}

function publicVehicle(vehicle) {
  return {
    id: vehicle.id,
    x: vehicle.x,
    z: vehicle.z,
    yaw: vehicle.yaw,
    speed: vehicle.speed,
    driverId: vehicle.driverId || "",
    color: vehicle.color,
    health: Math.max(0, Math.round(vehicle.health || 0)),
    maxHealth: vehicle.maxHealth || vehicleMaxHealth,
    disabledUntil: vehicle.disabledUntil || 0,
    repairing: Boolean(vehicle.repairing)
  };
}

function publicFocusTask(task) {
  if (!task) return null;
  return {
    kind: task.kind,
    label: task.label,
    progress: Math.max(0, Math.floor(Number(task.progress) || 0)),
    target: Math.max(1, Math.floor(Number(task.target) || 1)),
    expiresAt: Number(task.expiresAt) || 0,
    reward: task.reward || ""
  };
}

const criticalOutboundPayloadTypes = new Set([
  "welcome",
  "error",
  "respawn",
  "room_config",
  "celebration",
  "account_sync",
  "fps_don_reward",
  "baccarat_welcome",
  "baccarat_error"
]);
const rateLimitedRoomPayloadTypes = new Set([
  "shot",
  "hit",
  "impact",
  "feed",
  "ashinaga",
  "vehicle_damage",
  "vehicle_destroyed",
  "team_ping"
]);

function outboundRateAllowed(ws, payloadType, now = Date.now()) {
  let state = ws.donpachiOutboundRate;
  if (!state || now - state.startedAt >= websocketRateWindowMs) {
    state = { startedAt: now, sent: 0 };
    ws.donpachiOutboundRate = state;
  }
  const limit = criticalOutboundPayloadTypes.has(payloadType)
    ? maxOutboundMessagesPerWindow + 24
    : maxOutboundMessagesPerWindow;
  if (state.sent >= limit) {
    runtimeMetrics.outboundRateLimited += 1;
    if (payloadType === "snapshot" || payloadType === "baccarat_snapshot") {
      runtimeMetrics.realtimeMessagesSkipped += 1;
    }
    return false;
  }
  state.sent += 1;
  return true;
}

function roomBroadcastAllowed(room, payloadType, now = Date.now()) {
  if (!rateLimitedRoomPayloadTypes.has(payloadType)) return true;
  let state = room.outboundBroadcastRate;
  if (!state || now - state.startedAt >= websocketRateWindowMs) {
    state = { startedAt: now, sent: 0 };
    room.outboundBroadcastRate = state;
  }
  if (state.sent >= maxRoomRealtimeBroadcastsPerWindow) {
    runtimeMetrics.roomBroadcastsDropped += 1;
    return false;
  }
  state.sent += 1;
  return true;
}

function sendSerialized(ws, serialized, payloadType = "") {
  const decision = websocketSendDecision({
    readyState: ws?.readyState,
    bufferedAmount: ws?.bufferedAmount,
    payloadType
  });
  if (decision === "skip") {
    runtimeMetrics.realtimeMessagesSkipped += 1;
    return false;
  }
  if (decision === "terminate") {
    runtimeMetrics.slowSocketsTerminated += 1;
    ws.terminate();
    return false;
  }
  if (decision !== "send") return false;
  if (!outboundRateAllowed(ws, payloadType)) return false;
  try {
    ws.send(serialized);
    runtimeMetrics.messagesSent += 1;
    return true;
  } catch {
    ws.terminate();
    return false;
  }
}

function send(ws, payload) {
  if (!payload || typeof payload !== "object") return false;
  return sendSerialized(ws, JSON.stringify(payload), String(payload.type || ""));
}

function broadcast(room, payload) {
  if (!payload || typeof payload !== "object") return;
  const payloadType = String(payload.type || "");
  if (!roomBroadcastAllowed(room, payloadType)) return;
  const serialized = JSON.stringify(payload);
  for (const player of room.players.values()) {
    if (!player.isBot) sendSerialized(player.ws, serialized, payloadType);
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

function firstObstacleImpact(origin, direction, maxDistance, context = "toybox") {
  let bestDistance = maxDistance;
  let bestBox = null;
  for (const boxes of [obstaclesForArena(arenaForContext(context)), doorObstaclesForContext(context), elevatorObstaclesForContext(context)]) {
    for (const box of boxes) {
      const distance = rayBoxDistance(origin, direction, box, maxDistance);
      if (distance !== null && distance < bestDistance) {
        bestDistance = distance;
        bestBox = box;
      }
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

function lineBlocked(origin, direction, targetDistance, context = "toybox") {
  const endX = origin.x + direction.x * targetDistance;
  const endY = origin.y + direction.y * targetDistance;
  const endZ = origin.z + direction.z * targetDistance;
  const minX = Math.min(origin.x, endX) - 0.08;
  const maxX = Math.max(origin.x, endX) + 0.08;
  const minY = Math.min(origin.y, endY) - 0.08;
  const maxY = Math.max(origin.y, endY) + 0.08;
  const minZ = Math.min(origin.z, endZ) - 0.08;
  const maxZ = Math.max(origin.z, endZ) + 0.08;
  for (const boxes of [obstaclesForArena(arenaForContext(context)), doorObstaclesForContext(context), elevatorObstaclesForContext(context)]) {
    for (const box of boxes) {
      if (box.maxX < minX || box.minX > maxX || box.maxY < minY || box.minY > maxY || box.maxZ < minZ || box.minZ > maxZ) continue;
      if (rayHitsBox(origin, direction, box, targetDistance)) return true;
    }
  }
  return false;
}

function bodyCollides(x, z, radius, context, y) {
  const minY = y - 1.38;
  const maxY = y + 0.22;
  for (const box of staticObstaclesNear(context, x, z)) {
    if (
      box.movement !== false &&
      x + radius > box.minX &&
      x - radius < box.maxX &&
      z + radius > box.minZ &&
      z - radius < box.maxZ &&
      maxY > box.minY &&
      minY < box.maxY
    ) return true;
  }
  for (const boxes of [doorObstaclesForContext(context), elevatorObstaclesForContext(context)]) {
    for (const box of boxes) {
      if (
        box.movement !== false &&
        x + radius > box.minX &&
        x - radius < box.maxX &&
        z + radius > box.minZ &&
        z - radius < box.maxZ &&
        maxY > box.minY &&
        minY < box.maxY
      ) return true;
    }
  }
  return false;
}

function cpuCollides(x, z, radius = 0.55, context = "toybox", y = 1.6) {
  return bodyCollides(x, z, radius, context, y);
}

function playerCollides(x, y, z, context = "toybox", radius = 0.24) {
  return bodyCollides(x, z, radius, context, y);
}

function findNearestCpuSafeSpot(x, z, radius = 0.68, context = "toybox", y = 1.6) {
  const startX = clamp(x, -arenaHalfSize + 2, arenaHalfSize - 2);
  const startZ = clamp(z, -arenaHalfSize + 2, arenaHalfSize - 2);
  if (!cpuCollides(startX, startZ, radius, context, y)) return { x: startX, y, z: startZ };

  const angleSteps = 16;
  for (let ring = 1; ring <= 18; ring += 1) {
    const distance = ring * 0.85;
    for (let i = 0; i < angleSteps; i += 1) {
      const angle = (Math.PI * 2 * i) / angleSteps;
      const candidateX = clamp(startX + Math.cos(angle) * distance, -arenaHalfSize + 2, arenaHalfSize - 2);
      const candidateZ = clamp(startZ + Math.sin(angle) * distance, -arenaHalfSize + 2, arenaHalfSize - 2);
      if (!cpuCollides(candidateX, candidateZ, radius, context, y)) return { x: candidateX, y, z: candidateZ };
    }
  }

  return { x: 0, y, z: 0 };
}

function keepCpuOutOfWalls(bot, context = "toybox") {
  if (!cpuCollides(bot.x, bot.z, 0.68, context, bot.y)) return false;
  const spot = findNearestCpuSafeSpot(bot.x, bot.z, 0.68, context, bot.y);
  bot.x = spot.x;
  bot.y = spot.y;
  bot.z = spot.z;
  bot.stuckTicks = 0;
  bot.botPhase += 0.45 + bot.botIndex * 0.05;
  return true;
}

function cpuMovementCollides(room, x, z, radius = 0.55, mover = null, y = mover?.y ?? 1.6) {
  if (cpuCollides(x, z, radius, room, y)) return true;
  if (y < 3.4) {
    for (const vehicle of room.vehicles?.values?.() || []) {
      if (Math.hypot(vehicle.x - x, vehicle.z - z) < 1.48 + radius) return true;
    }
  }
  for (const player of room.players.values()) {
    if (player.id === mover?.id || player.disconnectedAt || player.eliminated || player.health <= 0 || player.vehicleId) continue;
    if (Math.abs((player.y ?? 1.6) - y) > 2.05) continue;
    const bothRouting = mover?.botTactic === "vertical" && player.isBot && player.botTactic === "vertical";
    const threshold = radius + (player.isBot ? (bothRouting ? 0.3 : 0.78) : 1.42);
    const nextDistance = Math.hypot(player.x - x, player.z - z);
    if (nextDistance >= threshold) continue;
    const currentDistance = mover ? Math.hypot(player.x - mover.x, player.z - mover.z) : Infinity;
    if (!mover || currentDistance >= threshold || nextDistance <= currentDistance + 0.005) return true;
  }
  return false;
}

function qaCpuMovementBlocker(room, x, z, radius, mover, y) {
  if (!exposeQaState) return "";
  const minY = y - 1.38;
  const maxY = y + 0.22;
  for (const boxes of [obstaclesForArena(arenaForContext(room)), doorObstaclesForContext(room), elevatorObstaclesForContext(room)]) {
    for (const box of boxes) {
      if (
        box.movement !== false &&
        x + radius > box.minX && x - radius < box.maxX &&
        z + radius > box.minZ && z - radius < box.maxZ &&
        maxY > box.minY && minY < box.maxY
      ) return box.doorId ? `door:${box.doorId}` : `wall:${box.minX.toFixed(1)},${box.maxX.toFixed(1)},${box.minZ.toFixed(1)},${box.maxZ.toFixed(1)}`;
    }
  }
  if (y < 3.4) {
    for (const vehicle of room.vehicles?.values?.() || []) {
      if (Math.hypot(vehicle.x - x, vehicle.z - z) < 1.48 + radius) return `vehicle:${vehicle.id}`;
    }
  }
  for (const player of room.players.values()) {
    if (player.id === mover?.id || player.disconnectedAt || player.eliminated || player.health <= 0 || player.vehicleId) continue;
    if (Math.abs((player.y ?? 1.6) - y) > 2.05) continue;
    const bothRouting = mover?.botTactic === "vertical" && player.isBot && player.botTactic === "vertical";
    const threshold = radius + (player.isBot ? (bothRouting ? 0.3 : 0.78) : 1.42);
    if (Math.hypot(player.x - x, player.z - z) < threshold) return `player:${player.id.slice(0, 12)}`;
  }
  return "unknown";
}

function moveCpuAlongWalls(bot, desiredX, desiredZ, now, room, desiredY = bot.y) {
  const arena = room.arena;
  const elapsed = Math.min(0.18, Math.max(0.06, (now - (bot.lastCpuMoveAt || now - 110)) / 1000));
  bot.lastCpuMoveAt = now;

  if (keepCpuOutOfWalls(bot, room)) return false;

  const dx = desiredX - bot.x;
  const dz = desiredZ - bot.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.05) return true;

  const step = Math.min(distance, (4.7 + bot.botIndex * 0.22 + (bot.learnedSpeedBoost || 0)) * elapsed);
  const moveX = dx / distance * step;
  const moveZ = dz / distance * step;
  const nextX = clamp(bot.x + moveX, -arenaHalfSize + 2, arenaHalfSize - 2);
  const nextZ = clamp(bot.z + moveZ, -arenaHalfSize + 2, arenaHalfSize - 2);

  if (!cpuMovementCollides(room, nextX, nextZ, 0.68, bot, desiredY)) {
    bot.x = nextX;
    bot.z = nextZ;
    bot.stuckTicks = 0;
    if (exposeQaState) bot.qaMoveBlock = "";
    return true;
  }
  if (exposeQaState) bot.qaMoveBlock = qaCpuMovementBlocker(room, nextX, nextZ, 0.68, bot, desiredY);

  const canMoveX = !cpuMovementCollides(room, nextX, bot.z, 0.68, bot, desiredY);
  const canMoveZ = !cpuMovementCollides(room, bot.x, nextZ, 0.68, bot, desiredY);
  if (canMoveX || canMoveZ) {
    if (canMoveX) bot.x = nextX;
    if (canMoveZ) bot.z = nextZ;
    bot.stuckTicks = 0;
    return true;
  }

  const tangentA = { x: -moveZ, z: moveX };
  const tangentB = { x: moveZ, z: -moveX };
  for (const tangent of [tangentA, tangentB]) {
    const tangentLength = Math.hypot(tangent.x, tangent.z) || 1;
    const sideX = clamp(bot.x + tangent.x / tangentLength * step * 0.85, -arenaHalfSize + 2, arenaHalfSize - 2);
    const sideZ = clamp(bot.z + tangent.z / tangentLength * step * 0.85, -arenaHalfSize + 2, arenaHalfSize - 2);
    if (!cpuMovementCollides(room, sideX, sideZ, 0.68, bot, desiredY)) {
      bot.x = sideX;
      bot.z = sideZ;
      bot.stuckTicks = 0;
      return true;
    }
  }

  bot.stuckTicks = (bot.stuckTicks || 0) + 1;
  if (bot.stuckTicks > 10) {
    bot.botPhase += 0.35 + bot.botIndex * 0.08;
    bot.stuckTicks = 0;
  }
  return false;
}

function findCpuCoverPoint(room, bot, target) {
  const ranked = [];
  for (const point of cpuCoverPointsByArena.get(room.arena) || []) {
    const score = scoreCpuCoverPoint({ bot, target, point, role: bot.botRole, safeZone: room.safeZone });
    if (!Number.isFinite(score) || cpuMovementCollides(room, point.x, point.z, 0.58, bot)) continue;
    ranked.push({ point, score });
  }
  ranked.sort((left, right) => left.score - right.score);
  for (const { point } of ranked.slice(0, 6)) {
    const origin = { x: point.x, y: 1.6, z: point.z };
    const distance = Math.hypot(target.x - point.x, target.y - 1.6, target.z - point.z);
    const direction = normalize({ x: target.x - point.x, y: target.y - 1.6, z: target.z - point.z });
    if (lineBlocked(origin, direction, distance, room)) return { x: point.x, z: point.z };
  }
  return null;
}

function applyCpuSeparation(room, bot, destination) {
  let repelX = 0;
  let repelZ = 0;
  for (const teammate of room.players.values()) {
    if (teammate.id === bot.id || teammate.color !== bot.color || teammate.disconnectedAt || teammate.eliminated || teammate.health <= 0) continue;
    if (Math.abs((teammate.y ?? 1.6) - bot.y) > 2.05) continue;
    let dx = bot.x - teammate.x;
    let dz = bot.z - teammate.z;
    let distance = Math.hypot(dx, dz);
    if (distance >= 3.1) continue;
    if (distance < 0.01) {
      const angle = (bot.botIndex + 1) * 1.73;
      dx = Math.cos(angle);
      dz = Math.sin(angle);
      distance = 1;
    }
    const strength = (3.1 - distance) / 3.1;
    repelX += dx / distance * strength;
    repelZ += dz / distance * strength;
  }
  return {
    x: clamp(destination.x + repelX * 4.2, -arenaHalfSize + 2, arenaHalfSize - 2),
    z: clamp(destination.z + repelZ * 4.2, -arenaHalfSize + 2, arenaHalfSize - 2)
  };
}

function clearCpuVerticalState(bot) {
  bot.verticalTowerId = "";
  bot.verticalProgress = 0;
  bot.verticalTargetFloor = 0;
  bot.verticalStage = "";
  bot.lastVerticalMoveAt = 0;
  bot.lastVerticalAlignAt = 0;
  bot.verticalEntryCommitted = false;
}

function cpuVerticalLane(bot) {
  return ((Math.abs(bot.botIndex || 0) % 3) - 1) * 0.2;
}

function moveCpuToVerticalWaypoint(bot, waypoint, now, room, reach = 1.05) {
  moveCpuAlongWalls(bot, waypoint.x, waypoint.z, now, room, bot.y);
  return Math.hypot(bot.x - waypoint.x, bot.z - waypoint.z) <= reach;
}

function updateCpuVerticalRoute(room, bot, target, now) {
  const targetTower = target ? towerAtPosition(target, 0.25) : null;
  const targetFloor = targetTower ? nearestTowerFloor(targetTower, target.y) : 0;
  const desiredTower = targetTower && targetFloor > 0 && target.y > 3.2 ? targetTower : null;
  let activeTower = towerDefinitionsById.get(bot.verticalTowerId || "") || null;

  if (!activeTower && bot.y > 3) {
    activeTower = towerAtPosition(bot, 0.45);
    if (activeTower) {
      bot.verticalTowerId = activeTower.id;
      bot.verticalProgress = nearestTowerFloor(activeTower, bot.y);
    }
  }
  if (!activeTower && !desiredTower) return false;
  if (!activeTower && desiredTower) {
    activeTower = desiredTower;
    bot.verticalTowerId = activeTower.id;
    bot.verticalProgress = 0;
    bot.verticalStage = "approach";
    bot.verticalEntryCommitted = false;
  }
  bot.botTactic = "vertical";

  const progress = clamp(Number(bot.verticalProgress) || 0, 0, activeTower.maxFloor);
  const changingTower = Boolean(desiredTower && desiredTower.id !== activeTower.id);
  const desiredProgress = changingTower || !desiredTower ? 0 : targetFloor;
  bot.verticalTargetFloor = desiredProgress;

  if (progress <= 0.02 && bot.y <= 2.7) {
    if (!desiredTower || changingTower) {
      clearCpuVerticalState(bot);
      return false;
    }
    const inside = towerAtPosition(bot, 0.05)?.id === activeTower.id;
    if (!inside || bot.verticalEntryCommitted) {
      bot.verticalStage = "entry";
      const entryDirection = Math.sign(activeTower.entryOutside.z - activeTower.entryInside.z) || 1;
      const entryLane = ((Math.abs(bot.botIndex || 0) % 3) - 1) * 1.34;
      const queueDepth = Math.floor((Math.abs(bot.botIndex || 0) % 18) / 3) * 1.08;
      const outsideWaypoint = {
        x: activeTower.entryOutside.x + entryLane,
        z: activeTower.entryOutside.z + entryDirection * queueDepth
      };
      const insideWaypoint = {
        x: activeTower.entryInside.x + entryLane * 0.72,
        z: activeTower.entryInside.z
      };
      if (Math.hypot(bot.x - outsideWaypoint.x, bot.z - outsideWaypoint.z) <= 0.92) bot.verticalEntryCommitted = true;
      const waypoint = bot.verticalEntryCommitted ? insideWaypoint : outsideWaypoint;
      const reached = moveCpuToVerticalWaypoint(bot, waypoint, now, room, bot.verticalEntryCommitted ? 0.72 : 1.05);
      bot.y = 1.6;
      if (!bot.verticalEntryCommitted || !inside || !reached) return true;
      bot.verticalEntryCommitted = false;
      bot.verticalStage = "landing";
      return true;
    }
  }

  if (Math.abs(progress - desiredProgress) <= 0.012) {
    bot.verticalProgress = desiredProgress;
    const floorY = floorEyeY(activeTower, desiredProgress);
    const elapsed = Math.min(0.18, Math.max(0.055, (now - (bot.lastVerticalAlignAt || now - 110)) / 1000));
    bot.lastVerticalAlignAt = now;
    bot.y = stepVerticalHeight(bot.y, floorY, elapsed);
    if (Math.abs(bot.y - floorY) > 0.04) {
      bot.verticalStage = "settling";
      return true;
    }
    bot.verticalStage = desiredProgress > 0 ? "floor" : "";
    if (desiredProgress === 0 && (!desiredTower || changingTower)) clearCpuVerticalState(bot);
    return false;
  }

  const lane = cpuVerticalLane(bot);
  const currentLanding = spiralRoutePoint(activeTower, progress, lane);
  const landingDistance = Math.hypot(bot.x - currentLanding.x, bot.z - currentLanding.z);
  if (landingDistance > 0.28 || Math.abs(bot.y - currentLanding.y) > 0.08) {
    bot.verticalStage = "landing";
    moveCpuToVerticalWaypoint(bot, currentLanding, now, room, 0.24);
    const elapsed = Math.min(0.18, Math.max(0.055, (now - (bot.lastVerticalAlignAt || now - 110)) / 1000));
    bot.lastVerticalAlignAt = now;
    bot.y = stepVerticalHeight(bot.y, currentLanding.y, elapsed);
    return true;
  }
  bot.lastVerticalAlignAt = 0;

  const elapsed = Math.min(0.18, Math.max(0.055, (now - (bot.lastVerticalMoveAt || now - 110)) / 1000));
  bot.lastVerticalMoveAt = now;
  const nextProgress = stepFloorProgress(progress, desiredProgress, elapsed, 0.31 + (Math.abs(bot.botIndex || 0) % 3) * 0.012);
  const nextPoint = spiralRoutePoint(activeTower, nextProgress, lane);
  bot.verticalStage = nextProgress > progress ? "ascending" : "descending";
  if (!cpuMovementCollides(room, nextPoint.x, nextPoint.z, 0.55, bot, nextPoint.y)) {
    bot.x = nextPoint.x;
    bot.y = nextPoint.y;
    bot.z = nextPoint.z;
    bot.yaw = nextPoint.yaw;
    bot.pitch = 0;
    bot.verticalProgress = nextProgress;
    bot.stuckTicks = 0;
  } else {
    bot.stuckTicks = (bot.stuckTicks || 0) + 1;
  }
  return true;
}

function vehicleCollides(room, vehicle, x, z) {
  if (cpuCollides(x, z, 1.48, room)) return true;
  for (const other of room.vehicles?.values?.() || []) {
    if (other.id === vehicle.id) continue;
    if (Math.hypot(other.x - x, other.z - z) < 3.05) return true;
  }
  for (const player of room.players.values()) {
    if (player.id === vehicle.driverId || player.disconnectedAt || player.eliminated || player.health <= 0) continue;
    if (Math.hypot(player.x - x, player.z - z) < 1.92) return true;
  }
  return false;
}

function releasePlayerVehicle(room, player, placeBeside = true) {
  const vehicleId = player?.vehicleId || "";
  const vehicle = room?.vehicles?.get?.(vehicleId);
  if (vehicle?.driverId === player.id) {
    vehicle.driverId = "";
    vehicle.throttle = 0;
    vehicle.targetThrottle = 0;
    vehicle.steer = 0;
    vehicle.targetSteer = 0;
    vehicle.braking = true;
  }
  player.vehicleId = "";
  if (!placeBeside || !vehicle) return;
  const candidateX = vehicle.x + Math.cos(vehicle.yaw) * 2.25;
  const candidateZ = vehicle.z - Math.sin(vehicle.yaw) * 2.25;
  const safe = findNearestCpuSafeSpot(candidateX, candidateZ, 0.4, room);
  player.x = safe.x;
  player.y = 1.6;
  player.z = safe.z;
}

function tryEnterVehicle(room, player, vehicleId) {
  if (!room?.vehicles || player.isBot || player.eliminated || player.health <= 0 || player.vehicleId) return;
  const vehicle = room.vehicles.get(String(vehicleId || ""));
  if (
    !vehicle ||
    vehicle.driverId ||
    vehicle.health <= 0 ||
    (vehicle.disabledUntil || 0) > Date.now() ||
    Math.hypot(vehicle.x - player.x, vehicle.z - player.z) > 3.35
  ) return;
  vehicle.driverId = player.id;
  vehicle.throttle = 0;
  vehicle.targetThrottle = 0;
  vehicle.steer = 0;
  vehicle.targetSteer = 0;
  vehicle.braking = true;
  vehicle.lastInputAt = Date.now();
  player.vehicleId = vehicle.id;
  player.x = vehicle.x;
  player.y = 1.82;
  player.z = vehicle.z;
  addFeed(room, `${player.name} がロードスターに乗車`, player.color);
  send(player.ws, { type: "vehicle_status", vehicleId: vehicle.id });
  broadcast(room, { type: "feed", feed: room.feed });
}

function updateVehicles(room, now) {
  for (const vehicle of room.vehicles?.values?.() || []) {
    const delta = Math.min(0.14, Math.max(0.016, (now - (vehicle.updatedAt || now - 80)) / 1000));
    vehicle.updatedAt = now;
    vehicle.maxHealth ||= vehicleMaxHealth;
    if (!Number.isFinite(vehicle.health)) vehicle.health = vehicle.maxHealth;

    if ((vehicle.disabledUntil || 0) > now || vehicle.health <= 0) {
      vehicle.speed = 0;
      vehicle.throttle = 0;
      vehicle.targetThrottle = 0;
      vehicle.steer = 0;
      vehicle.targetSteer = 0;
      vehicle.braking = true;
      vehicle.repairing = false;
      if ((vehicle.disabledUntil || 0) > now) continue;
      if (vehicleCollides(room, vehicle, vehicle.spawnX, vehicle.spawnZ)) {
        vehicle.disabledUntil = now + 1000;
        continue;
      }
      vehicle.x = vehicle.spawnX;
      vehicle.z = vehicle.spawnZ;
      vehicle.yaw = vehicle.spawnYaw;
      vehicle.health = vehicle.maxHealth;
      vehicle.disabledUntil = 0;
      addFeed(room, "ロードスターが再起動", vehicle.color === "red" ? "red" : "blue");
    }

    const driver = vehicle.driverId ? room.players.get(vehicle.driverId) : null;
    if (!driver || driver.eliminated || driver.health <= 0) {
      if (driver) releasePlayerVehicle(room, driver, false);
      vehicle.driverId = "";
      vehicle.throttle = 0;
      vehicle.targetThrottle = 0;
      vehicle.steer = 0;
      vehicle.targetSteer = 0;
    }

    if (vehicle.driverId && now - vehicle.lastInputAt > 650) {
      vehicle.targetThrottle = 0;
      vehicle.targetSteer = 0;
      vehicle.braking = true;
    }

    const requestedThrottle = clamp(Number(vehicle.targetThrottle) || 0, -1, 1);
    const requestedSteer = clamp(Number(vehicle.targetSteer) || 0, -1, 1);
    const throttleResponse = vehicle.braking ? 9.5 : 5.8;
    const steerResponse = Math.abs(requestedSteer) > 0.02 ? 7.8 : 10.5;
    vehicle.throttle += clamp(requestedThrottle - vehicle.throttle, -throttleResponse * delta, throttleResponse * delta);
    vehicle.steer += clamp(requestedSteer - vehicle.steer, -steerResponse * delta, steerResponse * delta);
    const throttle = clamp(vehicle.throttle, -1, 1);
    const targetSpeed = throttle >= 0 ? throttle * 11.8 : throttle * 5.4;
    const acceleration = throttle === 0 ? 4.2 : 7.2;
    const speedDelta = clamp(targetSpeed - vehicle.speed, -acceleration * delta, acceleration * delta);
    vehicle.speed += speedDelta;
    if (vehicle.braking) vehicle.speed *= Math.max(0, 1 - delta * 7.5);
    else if (Math.abs(throttle) < 0.02) vehicle.speed *= Math.max(0, 1 - delta * 1.45);
    if (Math.abs(vehicle.speed) < 0.025) vehicle.speed = 0;

    const wasRepairing = Boolean(vehicle.repairing);
    const repairStation = vehicleRepairStations.find((station) => Math.hypot(vehicle.x - station.x, vehicle.z - station.z) <= station.radius);
    vehicle.repairing = Boolean(repairStation && Math.abs(vehicle.speed) <= 1.2 && vehicle.health < vehicle.maxHealth);
    if (vehicle.repairing) {
      vehicle.health = Math.min(vehicle.maxHealth, vehicle.health + vehicleRepairPerSecond * delta);
      if (!wasRepairing && driver && !driver.isBot) send(driver.ws, { type: "vehicle_repair", station: repairStation.id });
    }

    const speedRatio = clamp(Math.abs(vehicle.speed) / 8, 0, 1);
    if (speedRatio > 0.025) {
      const reverseDirection = vehicle.speed < 0 ? -1 : 1;
      vehicle.yaw -= clamp(vehicle.steer, -1, 1) * reverseDirection * delta * (0.56 + speedRatio * 0.82);
    }

    const moveX = -Math.sin(vehicle.yaw) * vehicle.speed * delta;
    const moveZ = -Math.cos(vehicle.yaw) * vehicle.speed * delta;
    const nextX = clamp(vehicle.x + moveX, -arenaHalfSize + 2.2, arenaHalfSize - 2.2);
    const nextZ = clamp(vehicle.z + moveZ, -arenaHalfSize + 2.2, arenaHalfSize - 2.2);
    if (!vehicleCollides(room, vehicle, nextX, nextZ)) {
      vehicle.x = nextX;
      vehicle.z = nextZ;
    } else {
      const canMoveX = !vehicleCollides(room, vehicle, nextX, vehicle.z);
      const canMoveZ = !vehicleCollides(room, vehicle, vehicle.x, nextZ);
      if (canMoveX) vehicle.x = nextX;
      if (canMoveZ) vehicle.z = nextZ;
      if (!canMoveX && !canMoveZ) vehicle.speed = 0;
      else vehicle.speed *= 0.72;
    }

    const activeDriver = vehicle.driverId ? room.players.get(vehicle.driverId) : null;
    if (activeDriver) {
      activeDriver.vehicleId = vehicle.id;
      activeDriver.x = vehicle.x;
      activeDriver.y = 1.82;
      activeDriver.z = vehicle.z;
    }
  }
}

function updateSafeZone(room, now) {
  if (room.matchStarted && !room.roundStartedAt) room.roundStartedAt = now;
  const safeZone = computeSafeZone({
    roundStartedAt: room.roundStartedAt,
    now,
    mode: room.mode,
    matchStarted: room.matchStarted,
    winner: room.winner
  });
  room.safeZone = safeZone;
  if (!safeZone.enabled || safeZone.damage <= 0) return safeZone;

  for (const player of room.players.values()) {
    if (player.disconnectedAt || player.creative || player.eliminated || player.health <= 0 || !isOutsideSafeZone(player, safeZone, 0.4)) continue;
    if (now < (player.nextZoneDamageAt || 0)) continue;
    player.nextZoneDamageAt = now + 1000;
    const damage = Math.min(player.health, safeZone.damage);
    player.health = Math.max(0, player.health - safeZone.damage);
    player.damageTaken = (player.damageTaken || 0) + damage;
    broadcast(room, {
      type: "hit",
      shooter: "safe-zone",
      shooterName: "危険エリア",
      target: player.id,
      damage,
      weapon: "危険エリア"
    });
    if (player.health > 0) continue;
    player.deaths = (player.deaths || 0) + 1;
    addFeed(room, `${player.name} が危険エリアで脱落`, player.color);
    handleDeath(room, null, player);
  }
  return safeZone;
}

wss.on("connection", (ws) => {
  runtimeMetrics.acceptedConnections += 1;
  if (wss.clients.size > maxWsConnections) {
    runtimeMetrics.rejectedHandshakes += 1;
    ws.terminate();
    return;
  }
  let currentRoom;
  let currentPlayer;
  let currentBaccaratPlayer;
  let currentBaccaratTable;
  let sessionReady = false;
  let inboundRateStartedAt = Date.now();
  let inboundRateCount = 0;
  ws.isAlive = true;
  const handshakeTimer = setTimeout(() => {
    if (sessionReady || ws.readyState !== 1) return;
    runtimeMetrics.rejectedHandshakes += 1;
    ws.terminate();
  }, wsHandshakeTimeoutMs);
  const markSessionReady = () => {
    sessionReady = true;
    clearTimeout(handshakeTimer);
  };

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("error", () => {
    if (ws.readyState === ws.OPEN) ws.close(1009, "invalid websocket message");
  });

  ws.on("message", (raw) => {
    const receivedAt = Date.now();
    runtimeMetrics.inboundMessages += 1;
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
    const inboundType = /^[a-z][a-z0-9_]{0,31}$/.test(String(message.type || ""))
      ? String(message.type)
      : "other";
    runtimeMetrics.inboundTypes[inboundType] = (runtimeMetrics.inboundTypes[inboundType] || 0) + 1;
    if (inboundType === "customize") {
      if (receivedAt - (ws.donpachiLastCustomizeAt || 0) < 350) {
        runtimeMetrics.customizeMessagesSkipped += 1;
        return;
      }
      ws.donpachiLastCustomizeAt = receivedAt;
    }
    if (receivedAt - inboundRateStartedAt >= websocketRateWindowMs) {
      inboundRateStartedAt = receivedAt;
      inboundRateCount = 0;
    }
    inboundRateCount += 1;
    if (inboundRateCount > maxInboundMessagesPerWindow) {
      if (!ws.donpachiInboundRateClosed) {
        ws.donpachiInboundRateClosed = true;
        runtimeMetrics.inboundRateTerminated += 1;
        ws.close(1008, "message rate exceeded");
      }
      return;
    }

    if (String(message.type || "").startsWith("poker_")) {
      send(ws, { type: "baccarat_error", message: "ポーカーは廃止され、共通チップバカラへ移行しました。" });
      return;
    }

    if (message.type === "baccarat_join") {
      const requestedLoginId = normalizeLoginId(message.loginId);
      const qaRequested = Boolean(message.qaMode);
      const chaosConsent = message.chaosConsent === true;
      const profileRecord = requestedLoginId
        ? authenticatedProfileRecord(requestedLoginId, message.sessionToken, message.accountVault)
        : null;
      if (requestedLoginId && !profileRecord) {
        send(ws, { type: "baccarat_error", message: "安全な接続のため、ロビーで再ログインしてください。" });
        return;
      }
      const profile = profileRecord?.profile || null;
      const qaAuthorized = isPrivilegedLoginId(requestedLoginId);
      if (qaRequested && !qaAuthorized) {
        send(ws, { type: "baccarat_error", message: "検証卓は指定された検証アカウント専用です。" });
        return;
      }
      if (!qaRequested && !chaosConsent) {
        send(ws, { type: "baccarat_error", message: `公開CHAOSルール（優遇対象プレイヤーの最大ベット先が${(baccaratChaosWinPermille / 10).toFixed(1)}%で的中）への同意が必要です。` });
        return;
      }
      const table = qaRequested ? baccaratQaTable : baccaratTable;
      const guestToken = profileRecord ? "" : normalizeGuestWalletToken(message.guestToken);
      const balance = walletDon(profileRecord, guestToken);
      if (balance === null) {
        send(ws, { type: "baccarat_error", message: "ロビーで共通Donを同期してからバカラに入室してください。" });
        return;
      }
      const existing = [...table.players.values()].find((player) => (
        profileRecord?.key ? player.profileKey === profileRecord.key : player.guestToken === guestToken
      ));
      if (existing?.connected) {
        send(ws, { type: "baccarat_error", message: "同じウォレットが別の画面で使用中です。" });
        return;
      }
      const player = existing
        ? reconnectBaccaratPlayer(table, existing, { ws, name: sanitizePlayerName(profile?.name || message.name), chaosEligible: qaAuthorized }, Date.now())
        : addBaccaratPlayer(table, {
          id: crypto.randomUUID(),
          ws,
          profileKey: profileRecord?.key || "",
          guestToken,
          name: sanitizePlayerName(profile?.name || message.name),
          chaosEligible: qaAuthorized,
          chips: qaRequested ? initialSharedDon : balance
        });
      if (!player) {
        send(ws, { type: "baccarat_error", message: "バカラ卓への接続に失敗しました。" });
        return;
      }
      player.guestToken = guestToken;
      currentBaccaratPlayer = player;
      currentBaccaratTable = table;
      markSessionReady();
      send(ws, {
        type: "baccarat_welcome",
        id: player.id,
        table: table.code,
        version: baccaratVersion,
        walletDon: player.chips,
        walletScope: qaRequested ? "qa" : profileRecord ? "account" : "guest",
        qaMode: qaRequested,
        chaosMode: !qaRequested && Boolean(table.chaosMode),
        chaosWinPermille: !qaRequested ? baccaratChaosWinPermille : 0,
        guestToken,
        profile: profile ? publicProfile(profile) : null,
        accountVault: profileRecord ? sealProfileVault(profileRecord.key, profileRecord.profile) : ""
      });
      broadcastBaccarat(table);
      return;
    }

    if (message.type === "baccarat_action") {
      if (!currentBaccaratPlayer || !currentBaccaratTable?.players.has(currentBaccaratPlayer.id)) return;
      const action = String(message.action || "");
      const now = Date.now();
      let result;
      if (action === "bet") result = placeBaccaratBet(currentBaccaratTable, currentBaccaratPlayer, String(message.target || ""), Number(message.amount), now);
      else if (action === "undo") result = undoBaccaratBet(currentBaccaratTable, currentBaccaratPlayer, now);
      else if (action === "clear") result = clearBaccaratBets(currentBaccaratTable, currentBaccaratPlayer, now);
      else if (action === "repeat") result = repeatBaccaratBets(currentBaccaratTable, currentBaccaratPlayer, now);
      else if (action === "confirm") result = lockBaccaratBets(currentBaccaratTable, currentBaccaratPlayer, now);
      else result = { ok: false, message: "操作が正しくありません。" };
      currentBaccaratPlayer.lastSeen = now;
      if (!result.ok) send(ws, { type: "baccarat_error", message: result.message });
      broadcastBaccarat(currentBaccaratTable);
      return;
    }

    if (message.type === "baccarat_ping") {
      if (currentBaccaratPlayer) currentBaccaratPlayer.lastSeen = Date.now();
      send(ws, { type: "baccarat_pong", at: Number(message.at) || 0, serverAt: Date.now() });
      return;
    }

    if (message.type === "baccarat_leave") {
      ws.close(1000, "leave");
      return;
    }

    if (message.type === "join") {
      const requestedPartySize = normalizePartySize(message.partySize);
      const requestedCpuFill = normalizeCpuFill(message.cpuFill);
      const requestedRelationMode = normalizeRelationMode(message.relationMode);
      const requestedLoginId = normalizeLoginId(message.loginId);
      const profileRecord = requestedLoginId
        ? authenticatedProfileRecord(requestedLoginId, message.sessionToken, message.accountVault)
        : null;
      if (requestedLoginId && !profileRecord) {
        send(ws, { type: "error", message: "安全な接続のため、ロビーで再ログインしてください。" });
        return;
      }
      const loginProfile = profileRecord?.profile || null;
      const guestToken = profileRecord ? "" : normalizeGuestWalletToken(message.guestToken) || crypto.randomUUID();
      if (!profileRecord) getGuestWallet(guestToken, true);
      const room = getRoom(globalFpsRoomCode, message.gameMode, "toybox", requestedPartySize, true, requestedCpuFill, requestedRelationMode);
      const requestedResumeToken = normalizeResumeToken(message.resumeToken);
      const now = Date.now();
      const resumedPlayer = requestedResumeToken
        ? [...room.players.values()].find((player) => (
          !player.isBot &&
          player.resumeToken === requestedResumeToken &&
          player.disconnectedAt &&
          (player.reconnectDeadline || 0) >= now
        ))
        : null;
      if (resumedPlayer) {
        resumedPlayer.ws = ws;
        resumedPlayer.disconnectedAt = 0;
        resumedPlayer.reconnectDeadline = 0;
        resumedPlayer.explicitLeave = false;
        resumedPlayer.lastSeen = now;
        resumedPlayer.lastStateAt = now;
        resumedPlayer.spawnProtectedUntil = now + 1600;
        resumedPlayer.nextZoneDamageAt = Math.max(resumedPlayer.nextZoneDamageAt || 0, now + 1600);
        if (profileRecord?.key) resumedPlayer.profileKey = profileRecord.key;
        resumedPlayer.isHost = isPrivilegedLoginId(requestedLoginId);
        resumedPlayer.guestToken = guestToken || resumedPlayer.guestToken || "";
        currentRoom = room;
        currentPlayer = resumedPlayer;
        markSessionReady();
        recordPlayerPose(resumedPlayer, now);
        send(ws, fpsWelcomePayload(resumedPlayer, room, loginProfile, true));
        addFeed(room, `${resumedPlayer.name} が接続復旧`, resumedPlayer.color);
        broadcast(room, { type: "feed", feed: room.feed });
        return;
      }
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
      const spawn = room.safeZone?.enabled && room.safeZone.damage > 0
        ? safeRespawnPoint(room)
        : initialPlayerSpawnPoint(room, room.players.size);
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
        resumeToken: crypto.randomUUID(),
        disconnectedAt: 0,
        reconnectDeadline: 0,
        explicitLeave: false,
        poseHistory: [],
        profileKey: profileRecord?.key || "",
        isHost: isPrivilegedLoginId(requestedLoginId),
        guestToken,
        name: sanitizePlayerName(loginProfile?.name || message.name),
        color: team,
        cosmeticColor: safeColor(loginProfile?.cosmeticColor || message.cosmeticColor) || (team === "blue" ? "#1598f0" : "#ff4d4d"),
        skin: loginProfile ? normalizeSkin(loginProfile.skin) : "rounded",
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
        itemPickups: 0,
        lives: initialLivesForMode(room.mode),
        eliminated: false,
        creative: false,
        healPacks: sanitizeInventory(loginProfile?.inventory).healPacks,
        equipmentTier: 0,
        profileAttackMultiplier: 1,
        damageReduction: 0,
        focusTask: null,
        nextFocusTaskAt: Date.now() + 2400,
        donPunchCharge: 0,
        speedBoostUntil: 0,
        damageBoostUntil: 0,
        comebackUntil: 0,
        spawnProtectedUntil: Date.now() + spawnProtectionMs,
        vehicleId: "",
        lastStateAt: Date.now(),
        nextImpactAt: 0,
        nextTeamPingAt: 0,
        nextZoneDamageAt: 0,
        yaw: 0,
        pitch: 0,
        lastSeen: Date.now(),
        isBot: false,
        ...spawn
      };

      applyPersistentCombatBonuses(player);
      room.players.set(id, player);
      recordPlayerPose(player);
      currentRoom = room;
      currentPlayer = player;
      markSessionReady();
      if (player.isHost) {
        applyRoomConfig(room, player, message.gameMode, message.team, message.cpuFill, message.relationMode);
        addFeed(room, `ホストが ${modeLabel(room.mode)} に変更`, player.color);
      }
      syncMatchCpuFill(room);
      addFeed(room, `${player.name} が参加`, player.color);
      send(ws, fpsWelcomePayload(player, room, loginProfile, false));
      broadcast(room, { type: "feed", feed: room.feed });
      return;
    }

    if (!currentRoom || !currentPlayer || !currentRoom.players.has(currentPlayer.id)) return;

    if (message.type === "leave") {
      currentPlayer.explicitLeave = true;
      ws.close(1000, "leave");
      return;
    }

    if (message.type === "state") {
      if (currentPlayer.eliminated) return;
      const now = Date.now();
      currentPlayer.lastSeen = now;
      if (now - (currentPlayer.lastInboundStateAt || 0) < 70) {
        runtimeMetrics.inboundStatesSkipped += 1;
        return;
      }
      currentPlayer.lastInboundStateAt = now;
      const stateValues = [message.x, message.y, message.z, message.yaw, message.pitch].map(Number);
      if (!stateValues.every(Number.isFinite)) {
        runtimeMetrics.inboundStatesSkipped += 1;
        return;
      }
      runtimeMetrics.inboundStatesProcessed += 1;
      const previousX = currentPlayer.x;
      const previousY = currentPlayer.y;
      const previousZ = currentPlayer.z;
      const previousYaw = currentPlayer.yaw;
      currentPlayer.yaw = wrapAngle(stateValues[3]);
      currentPlayer.pitch = clamp(stateValues[4], -1.35, 1.35);
      if (currentPlayer.vehicleId) return;

      const requested = {
        x: clamp(stateValues[0], -arenaHalfSize + 1, arenaHalfSize - 1),
        y: clamp(stateValues[1], 1.4, 80),
        z: clamp(stateValues[2], -arenaHalfSize + 1, arenaHalfSize - 1)
      };
      const stateElapsed = Math.min(0.45, Math.max(0.04, (now - (currentPlayer.lastStateAt || now - 80)) / 1000));
      currentPlayer.lastStateAt = now;
      const constrained = clampMovementRequest(
        { x: previousX, y: previousY, z: previousZ },
        requested,
        stateElapsed,
        {
          creative: currentPlayer.creative,
          boosted: now < Math.max(currentPlayer.speedBoostUntil || 0, currentPlayer.comebackUntil || 0),
          trampoline: isNearToyboxTrampoline({ x: previousX, y: previousY, z: previousZ }, 0.65)
        }
      );
      let nextX = constrained.x;
      const nextY = constrained.y;
      let nextZ = constrained.z;

      if (currentPlayer.creative || !playerCollides(nextX, nextY, nextZ, currentRoom)) {
        currentPlayer.x = nextX;
        currentPlayer.y = nextY;
        currentPlayer.z = nextZ;
      } else {
        if (!playerCollides(nextX, nextY, previousZ, currentRoom)) currentPlayer.x = nextX;
        if (!playerCollides(currentPlayer.x, nextY, nextZ, currentRoom)) currentPlayer.z = nextZ;
        if (!playerCollides(currentPlayer.x, nextY, currentPlayer.z, currentRoom)) currentPlayer.y = nextY;
      }
      const correctionDistance = Math.hypot(
        currentPlayer.x - requested.x,
        currentPlayer.y - requested.y,
        currentPlayer.z - requested.z
      );
      if (
        !currentPlayer.creative &&
        (constrained.correctedHorizontal || constrained.correctedVertical || correctionDistance > 0.16) &&
        now >= (currentPlayer.nextMovementCorrectionAt || 0)
      ) {
        currentPlayer.nextMovementCorrectionAt = now + 180;
        send(currentPlayer.ws, {
          type: "movement_correction",
          position: { x: currentPlayer.x, y: currentPlayer.y, z: currentPlayer.z },
          reason: constrained.correctedVertical
            ? "vertical"
            : constrained.correctedHorizontal
              ? "speed"
              : "collision"
        });
      }
      const horizontalMove = Math.hypot(currentPlayer.x - previousX, currentPlayer.z - previousZ);
      currentRoom.movementStats.samples += 1;
      if (horizontalMove > 0.12) currentRoom.movementStats.moving += 1;
      if (currentPlayer.y > Math.max(2.6, previousY + 0.3) || currentPlayer.y > 5) currentRoom.movementStats.airborne += 1;
      if (currentRoom.movementStats.samples > 1200) {
        currentRoom.movementStats.samples = Math.ceil(currentRoom.movementStats.samples * 0.5);
        currentRoom.movementStats.moving = Math.ceil(currentRoom.movementStats.moving * 0.5);
        currentRoom.movementStats.airborne = Math.ceil(currentRoom.movementStats.airborne * 0.5);
      }
      const verticalMove = Math.abs(currentPlayer.y - previousY);
      if (horizontalMove > 0.01 || verticalMove > 0.01 || Math.abs(wrapAngle(currentPlayer.yaw - previousYaw)) > 0.004) {
        recordPlayerPose(currentPlayer, now);
      }
      if (horizontalMove > 0.02 || verticalMove > 0.02 || now >= (currentPlayer.nextPickupScanAt || 0)) {
        currentPlayer.nextPickupScanAt = now + 500;
        tryPickupBarrier(currentRoom, currentPlayer);
        tryPickupHealth(currentRoom, currentPlayer);
        tryPickupPowerups(currentRoom, currentPlayer);
      }
      return;
    }

    if (message.type === "vehicle_enter") {
      tryEnterVehicle(currentRoom, currentPlayer, message.vehicleId);
      return;
    }

    if (message.type === "vehicle_exit") {
      if (!currentPlayer.vehicleId) return;
      releasePlayerVehicle(currentRoom, currentPlayer, true);
      addFeed(currentRoom, `${currentPlayer.name} がロードスターから降車`, currentPlayer.color);
      send(currentPlayer.ws, { type: "vehicle_status", vehicleId: "", spawn: { x: currentPlayer.x, y: currentPlayer.y, z: currentPlayer.z } });
      broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
      return;
    }

    if (message.type === "door_interact") {
      if (currentPlayer.eliminated || currentPlayer.health <= 0 || currentPlayer.vehicleId || currentRoom.arena !== "toybox") return;
      const definition = doorDefinitionsById.get(String(message.doorId || ""));
      const state = definition ? currentRoom.doors?.get(definition.id) : null;
      if (
        !definition ||
        !state ||
        distanceToDoor(definition, currentPlayer) > definition.interactRadius + 0.35 ||
        Math.abs(currentPlayer.y - definition.y) > definition.verticalRange
      ) return;
      const now = Date.now();
      if (now < (currentPlayer.nextDoorInteractAt || 0)) return;
      currentPlayer.nextDoorInteractAt = now + 250;
      state.holdOpenUntil = Math.max(state.holdOpenUntil || 0, now + 4500);
      state.targetOpen = true;
      send(currentPlayer.ws, { type: "door_status", doorId: definition.id, opened: true });
      return;
    }

    if (message.type === "elevator_interact") {
      if (currentPlayer.eliminated || currentPlayer.health <= 0 || currentPlayer.vehicleId || currentRoom.arena !== "toybox") return;
      const definition = elevatorDefinitionsById.get(String(message.elevatorId || ""));
      const state = definition ? currentRoom.elevators?.get(definition.id) : null;
      const context = definition && state ? elevatorInteractionContext(currentPlayer, definition, state) : null;
      if (!definition || !state || !context) return;
      const now = Date.now();
      if (now < (currentPlayer.nextElevatorInteractAt || 0)) return;
      currentPlayer.nextElevatorInteractAt = now + 320;
      if (state.moving) {
        send(currentPlayer.ws, { type: "elevator_status", elevatorId: definition.id, status: "moving", targetFloor: state.targetFloor });
        return;
      }
      const targetFloor = elevatorTargetForInteraction(context, definition, state, Number(message.direction) || 1);
      setElevatorTarget(state, definition, targetFloor);
      send(currentPlayer.ws, {
        type: "elevator_status",
        elevatorId: definition.id,
        status: context.kind === "call" && targetFloor === context.floor ? "called" : "departing",
        targetFloor
      });
      return;
    }

    if (message.type === "vehicle_input") {
      const vehicle = currentRoom.vehicles?.get?.(currentPlayer.vehicleId || "");
      if (!vehicle || vehicle.driverId !== currentPlayer.id || vehicle.health <= 0 || (vehicle.disabledUntil || 0) > Date.now()) return;
      vehicle.targetThrottle = clamp(Number(message.throttle) || 0, -1, 1);
      vehicle.targetSteer = clamp(Number(message.steer) || 0, -1, 1);
      vehicle.braking = Boolean(message.braking);
      vehicle.lastInputAt = Date.now();
      currentPlayer.lastSeen = vehicle.lastInputAt;
      return;
    }

    if (message.type === "team_ping") {
      if (currentPlayer.eliminated || currentPlayer.health <= 0) return;
      const now = Date.now();
      if (now < (currentPlayer.nextTeamPingAt || 0)) return;
      currentPlayer.nextTeamPingAt = now + 900;
      const requested = vectorFrom(message.point);
      const deltaX = requested.x - currentPlayer.x;
      const deltaY = requested.y - currentPlayer.y;
      const deltaZ = requested.z - currentPlayer.z;
      const distance = Math.hypot(deltaX, deltaY, deltaZ);
      const scale = distance > 96 ? 96 / distance : 1;
      const ping = {
        id: crypto.randomUUID(),
        playerId: currentPlayer.id,
        name: currentPlayer.name,
        color: currentPlayer.color,
        x: clamp(currentPlayer.x + deltaX * scale, -arenaHalfSize + 1, arenaHalfSize - 1),
        y: clamp(currentPlayer.y + deltaY * scale, 0.08, 42),
        z: clamp(currentPlayer.z + deltaZ * scale, -arenaHalfSize + 1, arenaHalfSize - 1),
        expiresAt: now + 8500
      };
      for (const teammate of currentRoom.players.values()) {
        if (!teammate.isBot && teammate.color === currentPlayer.color) send(teammate.ws, { type: "team_ping", ping });
      }
      return;
    }

    if (message.type === "ready") {
      if (currentRoom.matchPhase === "active" || currentRoom.matchPhase === "result") return;
      currentPlayer.ready = Boolean(message.ready);
      addFeed(currentRoom, `${currentPlayer.name} ${currentPlayer.ready ? "準備完了" : "準備解除"}`, currentPlayer.color);
      updateMatchLifecycle(currentRoom);
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
      const profile = profileForPlayer(currentPlayer);
      if (profile) {
        const requestedSkin = normalizeSkin(message.skin || currentPlayer.skin);
        const ownedSkins = sanitizeInventory(profile.inventory, profile.skin).ownedSkins;
        currentPlayer.skin = ownedSkins.includes(requestedSkin) ? requestedSkin : normalizeSkin(profile.skin);
        mergeProfile(profile, {
          name: currentPlayer.name,
          skin: currentPlayer.skin,
          cosmeticColor: currentPlayer.cosmeticColor
        });
        saveProfileSoon();
        send(currentPlayer.ws, {
          type: "account_sync",
          profile: publicProfile(profile),
          accountVault: sealProfileVault(currentPlayer.profileKey, profile),
          reason: "customize"
        });
      } else {
        currentPlayer.skin = "rounded";
      }
      return;
    }

    if (message.type === "profile_progress") {
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

    if (message.type === "change_team") {
      if (currentRoom.mode !== "oneLife" && currentRoom.mode !== "practice" && currentRoom.mode !== "life3") {
        send(currentPlayer.ws, { type: "error", message: "チーム変更はワンライフ/練習/ライフ3で使用できます。" });
        return;
      }
      const requestedTeam = String(message.team || "");
      if (!teams.has(requestedTeam)) return;
      const targetPlayer = currentRoom.players.get(String(message.targetId || currentPlayer.id));
      if (!targetPlayer) return;
      if (targetPlayer.id !== currentPlayer.id && !currentPlayer.isHost) {
        send(currentPlayer.ws, { type: "error", message: "他プレイヤーのチーム変更はホストのみ可能です。" });
        return;
      }
      targetPlayer.color = requestedTeam;
      targetPlayer.cosmeticColor = targetPlayer.cosmeticColor || (requestedTeam === "blue" ? "#1598f0" : "#ff4d4d");
      syncMatchCpuFill(currentRoom);
      addFeed(currentRoom, `${targetPlayer.name} が${requestedTeam === "blue" ? "青" : "赤"}チームへ移動`, targetPlayer.color);
      broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
      return;
    }

    if (message.type === "set_room_config") {
      if (!currentPlayer.isHost) {
        send(currentPlayer.ws, { type: "error", message: "試合設定はホストのみ変更できます。" });
        return;
      }
      applyRoomConfig(currentRoom, currentPlayer, message.gameMode, message.team, message.cpuFill, message.relationMode);
      addFeed(currentRoom, `ホストが ${modeLabel(currentRoom.mode)} に変更`, currentPlayer.color);
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
      progressFocusTask(currentRoom, currentPlayer, "recover", 1);
      addFeed(currentRoom, `${currentPlayer.name} が回復アイテムを使用`, currentPlayer.color);
      send(currentPlayer.ws, { type: "sound", sound: "heal" });
      broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
      return;
    }

    if (message.type === "set_cpu") {
      if (currentRoom.matchmaking) {
        currentRoom.cpuFill = Number(message.count) !== 0;
        resetMatchToWaiting(currentRoom);
        resetRoomScores(currentRoom);
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
      resetMatchToWaiting(currentRoom);
      resetRoomScores(currentRoom);
      syncMatchCpuFill(currentRoom);
      addFeed(currentRoom, "点数をリセットしてマッチ待機", currentPlayer.color);
      broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
      return;
    }

    if (message.type === "hadeon_burst") {
      if (!currentRoom.matchStarted || currentRoom.winner || currentPlayer.name !== "こーた") return;
      applyHadeonBurst(currentRoom, currentPlayer);
      return;
    }

    if (message.type === "donpunch") {
      if (!currentRoom.matchStarted || currentRoom.winner || currentPlayer.eliminated || currentPlayer.health <= 0) return;
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
      if (!currentRoom.matchStarted || currentRoom.winner || currentPlayer.eliminated || currentPlayer.health <= 0) return;
      const weapon = normalizeWeapon(message.weapon);
      const now = Date.now();
      if (!consumeShotBudget(currentPlayer, weapon, now)) return;
      if ((currentPlayer.spawnProtectedUntil || 0) > now) currentPlayer.spawnProtectedUntil = 0;
      const reportedOrigin = vectorFrom(message.origin);
      const originDistance = Math.hypot(
        reportedOrigin.x - currentPlayer.x,
        reportedOrigin.y - currentPlayer.y,
        reportedOrigin.z - currentPlayer.z
      );
      const origin = originDistance <= 2.8
        ? reportedOrigin
        : { x: currentPlayer.x, y: currentPlayer.y, z: currentPlayer.z };
      const direction = normalize(vectorFrom(message.direction));
      const range = weaponRange.get(weapon) || 70;
      const viewedAt = Number.isFinite(Number(message.viewedAt)) ? Number(message.viewedAt) : now;
      currentRoom.weaponStats[weapon] = (currentRoom.weaponStats[weapon] || 0) + 1;
      currentPlayer.lastWeapon = weapon;
      const shotResult = applyShot(currentRoom, currentPlayer, origin, direction, weapon, viewedAt, now);
      const canEmitImpact = now >= (currentPlayer.nextImpactAt || 0);
      if (canEmitImpact) currentPlayer.nextImpactAt = now + (weapon === "shotgun" ? 140 : 70);
      const impact = canEmitImpact ? firstObstacleImpact(origin, direction, Math.min(range, 110), currentRoom) : null;
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

  ws.on("close", (code, reason) => {
    clearTimeout(handshakeTimer);
    if (currentBaccaratPlayer) {
      const table = currentBaccaratTable || baccaratTable;
      const removed = removeBaccaratPlayer(table, currentBaccaratPlayer, Date.now());
      if (removed.removed && !table.qaMode) {
        persistPlayerWallet(currentBaccaratPlayer);
        if (currentBaccaratPlayer.profileKey) saveProfileSoon();
      }
      broadcastBaccarat(table);
    }
    if (!currentRoom || !currentPlayer || !currentRoom.players.has(currentPlayer.id)) return;
    if (currentPlayer.vehicleId) releasePlayerVehicle(currentRoom, currentPlayer, false);
    const explicitLeave = currentPlayer.explicitLeave || (code === 1000 && String(reason || "") === "leave");
    if (!explicitLeave) {
      const disconnectedAt = Date.now();
      currentPlayer.ws = null;
      currentPlayer.disconnectedAt = disconnectedAt;
      currentPlayer.reconnectDeadline = disconnectedAt + reconnectGraceMs;
      currentPlayer.lastSeen = disconnectedAt;
      addFeed(currentRoom, `${currentPlayer.name} の接続復旧を待機`, currentPlayer.color);
      broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
      return;
    }
    currentRoom.players.delete(currentPlayer.id);
    addFeed(currentRoom, `${currentPlayer.name} が退出`, currentPlayer.color);
    broadcast(currentRoom, { type: "feed", feed: currentRoom.feed });
    const humans = [...currentRoom.players.values()].filter((player) => !player.isBot);
    if (humans.length === 0) rooms.delete(currentRoom.code);
    else syncMatchCpuFill(currentRoom);
  });
});

const websocketHeartbeatTimer = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      runtimeMetrics.heartbeatTerminations += 1;
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      ws.terminate();
    }
  }
}, wsHeartbeatIntervalMs);

const cacheMaintenanceTimer = setInterval(() => {
  pruneRuntimeCaches();
}, 60_000);

server.on("close", () => {
  clearInterval(websocketHeartbeatTimer);
  clearInterval(cacheMaintenanceTimer);
  if (profileSaveTimer) clearTimeout(profileSaveTimer);
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    let removedHuman = false;
    for (const player of room.players.values()) {
      if (player.isBot) continue;
      if (player.disconnectedAt) {
        if (now < (player.reconnectDeadline || 0)) continue;
        room.players.delete(player.id);
        addFeed(room, `${player.name} が接続タイムアウト`, player.color);
        removedHuman = true;
        continue;
      }
      if (now - player.lastSeen <= 45_000) continue;
      if (player.vehicleId) releasePlayerVehicle(room, player, false);
      player.explicitLeave = true;
      player.ws?.terminate();
      room.players.delete(player.id);
      removedHuman = true;
    }
    if (humanPlayers(room).length === 0) {
      rooms.delete(room.code);
      continue;
    }
    if (removedHuman) {
      syncMatchCpuFill(room);
      checkSurvivalWinner(room);
    }
    updateMatchLifecycle(room, now);
    updateBarrierRespawn(room, now);
    updateHealthPickup(room, now);
    updatePowerups(room, now);
    updateDonPunchProjectiles(room, now);
    updateDoors(room, now);
    updateElevators(room, now);
    updateVehicles(room, now);
    const safeZone = updateSafeZone(room, now);
    if (room.matchPhase === "active" && !room.winner) {
      const cpuUpdateParity = Math.abs(Number(room.cpuUpdateParity) || 0) % 2;
      updateCpuPlayers(room, now, cpuUpdateParity);
      room.cpuUpdateParity = cpuUpdateParity === 0 ? 1 : 0;
    } else room.cpuUpdateParity = 0;
    updateFocusTasks(room, now);
    resolveCastleRoundByTimer(room, now);
    for (const player of room.players.values()) {
      if (!player.disconnectedAt) recordPlayerPose(player, now);
    }
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
    runtimeMetrics.fpsSnapshots += 1;
    broadcast(room, {
      type: "snapshot",
      aiVersion: cpuAiVersion,
      worldVersion,
      ...publicMatchLifecycle(room),
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
      doors: [...room.doors.values()].map(publicDoor),
      elevators: [...room.elevators.values()].map(publicElevator),
      vehicles: [...room.vehicles.values()].map(publicVehicle),
      barrier: room.barrier,
      healthPickup: room.healthPickup,
      powerups: room.powerups,
      safeZone
    });
  }
}, fpsTickMs);

setInterval(() => {
  const now = Date.now();
  for (const table of [baccaratTable, baccaratQaTable]) {
    const update = updateBaccaratTable(table, now, secureBaccaratRandomInt);
    if (update.transition === "settled" && !table.qaMode) {
      let profileChanged = false;
      for (const settlement of update.settledPlayers) {
        const player = settlement.player;
        persistPlayerWallet(player);
        const profile = player.profileKey ? profileStore.profiles[player.profileKey] : null;
        if (profile) {
          const progress = sanitizeProgress(profile.progress);
          if (settlement.net > 0) {
            progress.baccaratWins += 1;
            progress.xp += Math.min(160, 25 + Math.floor(settlement.net / 25));
          }
          progress.lastReward = `バカラ ${settlement.net >= 0 ? "+" : ""}${settlement.net}Don`;
          profile.progress = sanitizeProgress(progress);
          profile.updatedAt = now;
          send(player.ws, {
            type: "account_sync",
            profile: publicProfile(profile),
            accountVault: sealProfileVault(player.profileKey, profile),
            reason: "baccarat_reward"
          });
          profileChanged = true;
        }
      }
      if (profileChanged) saveProfileSoon();
    }
    broadcastBaccarat(table, now);
  }
}, 250);

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

function equipmentTier(player) {
  return clamp(Math.floor(Number(player?.equipmentTier) || 0), 0, maxEquipmentTier);
}

function equipmentDamageMultiplier(player) {
  const profileMultiplier = clamp(Number(player?.profileAttackMultiplier) || 1, 1, 1.18);
  return profileMultiplier * (1 + equipmentTier(player) * 0.02);
}

function combatGrowthTargetTier(player) {
  if (!player || player.isBot) return 0;
  const damageTier = Math.floor((player.damageDealt || 0) / 180);
  const hitTier = Math.floor((player.hits || 0) / 4);
  const killTier = player.kills || 0;
  return clamp(Math.max(damageTier, hitTier, killTier), 0, maxEquipmentTier);
}

function awardCombatGrowth(room, player) {
  if (!player || player.isBot || player.eliminated || player.health <= 0) return;
  const currentTier = equipmentTier(player);
  const nextTier = combatGrowthTargetTier(player);
  if (nextTier <= currentTier) return;
  const gained = nextTier - currentTier;
  const now = Date.now();
  player.equipmentTier = nextTier;
  player.healPacks = clamp((player.healPacks || 0) + gained, 0, 12);
  player.speedBoostUntil = Math.max(player.speedBoostUntil || 0, now + 2600 + nextTier * 420);
  addFeed(room, `${player.name} の装備Lv.${nextTier} 強化`, player.color);
  send(player.ws, { type: "sound", sound: "reload" });
}

function focusTaskOptions(room, player) {
  const behind = teamScore(room, oppositeTeam(player.color)) - teamScore(room, player.color);
  const needsRecovery = player.health < maxHealth * 0.58 || (player.deaths || 0) > (player.kills || 0);
  const options = [];
  if (needsRecovery) {
    options.push({ kind: "recover", label: "回復かバリアを1回取る", target: 1, reward: "MED+1" });
  }
  if (room.mode === "castle") {
    options.push({ kind: "objectiveDamage", label: "白へ250ダメージ", target: 250, reward: "装備強化" });
  }
  options.push(
    { kind: "hit", label: "2回命中させる", target: 2, reward: "MED+1" },
    { kind: "damage", label: behind >= 2 ? "逆転へ160ダメージ" : "180ダメージ与える", target: behind >= 2 ? 160 : 180, reward: "短時間ブースト" },
    { kind: "item", label: "アイテムを1つ拾う", target: 1, reward: "FLOW加速" }
  );
  return options;
}

function assignFocusTask(room, player, now) {
  if (!player || player.isBot || player.eliminated || player.health <= 0 || room.winner) return;
  if (player.focusTask && now < player.focusTask.expiresAt) return;
  if (now < (player.nextFocusTaskAt || 0)) return;
  const options = focusTaskOptions(room, player);
  if (!options.length) return;
  const seed = (player.kills || 0) * 7 + (player.deaths || 0) * 5 + (player.hits || 0) + Math.floor(now / focusTaskDurationMs);
  const selected = options[Math.abs(seed) % options.length];
  player.focusTask = {
    ...selected,
    progress: 0,
    expiresAt: now + focusTaskDurationMs
  };
  player.nextFocusTaskAt = player.focusTask.expiresAt + focusTaskCooldownMs;
}

function updateFocusTasks(room, now) {
  for (const player of room.players.values()) {
    if (player.focusTask && now >= player.focusTask.expiresAt) {
      player.focusTask = null;
      player.nextFocusTaskAt = now + focusTaskCooldownMs;
    }
    assignFocusTask(room, player, now);
  }
}

function progressFocusTask(room, player, kind, amount = 1) {
  if (!player || player.isBot || !player.focusTask || player.eliminated || player.health <= 0) return;
  const task = player.focusTask;
  if (task.kind !== kind) return;
  task.progress = Math.min(task.target, (task.progress || 0) + Math.max(1, Math.floor(amount)));
  if (task.progress < task.target) return;
  player.focusTask = null;
  player.nextFocusTaskAt = Date.now() + focusTaskCooldownMs;
  player.healPacks = clamp((player.healPacks || 0) + 1, 0, 12);
  const now = Date.now();
  if (kind === "damage" || kind === "objectiveDamage") {
    player.equipmentTier = Math.min(maxEquipmentTier, equipmentTier(player) + 1);
    player.damageBoostUntil = Math.max(player.damageBoostUntil || 0, now + 4200);
  } else if (kind === "hit") {
    player.speedBoostUntil = Math.max(player.speedBoostUntil || 0, now + 3200);
  }
  const text = `${player.name} がFOCUS達成`;
  addFeed(room, text, player.color);
  send(player.ws, { type: "focus_task", text: "FOCUS達成" });
  send(player.ws, { type: "sound", sound: "reload" });
}

function nearestVehicleHit(room, origin, direction, range, excludedVehicleId = "") {
  let best = null;
  for (const vehicle of room.vehicles?.values?.() || []) {
    if (vehicle.id === excludedVehicleId) continue;
    const center = { x: vehicle.x, y: 0.86, z: vehicle.z };
    const targetDistance = projectionToRay(center, origin, direction);
    if (targetDistance < 0 || targetDistance > range || lineBlocked(origin, direction, targetDistance, room)) continue;
    const missDistance = distanceToRay(center, origin, direction, range);
    if (missDistance > 1.45) continue;
    if (!best || targetDistance < best.targetDistance) best = { vehicle, targetDistance };
  }
  return best;
}

function applyVehicleDamage(room, shooter, vehicle, damage, weapon) {
  if (!vehicle || vehicle.health <= 0 || (vehicle.disabledUntil || 0) > Date.now()) return;
  const scaledDamage = Math.max(4, Math.round(damage * 0.72));
  vehicle.health = Math.max(0, vehicle.health - scaledDamage);
  vehicle.repairing = false;
  broadcast(room, {
    type: "hit",
    shooter: shooter.id,
    shooterName: shooter.name,
    target: `vehicle:${vehicle.id}`,
    damage: scaledDamage,
    weapon: `${weapon} / 車両`
  });
  const driver = vehicle.driverId ? room.players.get(vehicle.driverId) : null;
  if (driver && !driver.isBot) {
    send(driver.ws, { type: "vehicle_damage", vehicleId: vehicle.id, damage: scaledDamage, health: vehicle.health });
  }
  if (vehicle.health > 0) return;

  const destroyedAt = Date.now();
  if (driver) {
    releasePlayerVehicle(room, driver, true);
    send(driver.ws, { type: "vehicle_status", vehicleId: "", spawn: { x: driver.x, y: driver.y, z: driver.z } });
  }
  vehicle.driverId = "";
  vehicle.speed = 0;
  vehicle.throttle = 0;
  vehicle.targetThrottle = 0;
  vehicle.steer = 0;
  vehicle.targetSteer = 0;
  vehicle.braking = true;
  vehicle.disabledUntil = destroyedAt + vehicleDisabledMs;
  addFeed(room, `${shooter.name} がロードスターを停止`, shooter.color);
  broadcast(room, {
    type: "vehicle_destroyed",
    vehicleId: vehicle.id,
    x: vehicle.x,
    y: 0.9,
    z: vehicle.z,
    respawnAt: vehicle.disabledUntil
  });
}

function applyShot(room, shooter, origin, direction, weapon = "rifle", viewedAt = Date.now(), now = Date.now()) {
  const baseDamage = weaponDamage.get(weapon) || 25;
  const boosted = !shooter.isBot && Date.now() < (shooter.damageBoostUntil || 0);
  const damageMultiplier = (boosted ? 1.18 : 1) * equipmentDamageMultiplier(shooter);
  const rawDamage = shooter.isBot ? Math.max(6, Math.ceil(baseDamage * cpuDamageMultiplier)) : Math.ceil(baseDamage * damageMultiplier);
  const range = weaponRange.get(weapon) || 70;
  let best;
  let bestHit = null;
  let bestTargetDistance = Infinity;
  for (const target of room.players.values()) {
    if (target.id === shooter.id || target.disconnectedAt || target.creative || target.eliminated || target.health <= 0 || target.color === shooter.color) continue;
    const rewound = rewindPose(target.poseHistory || [], viewedAt, now, lagCompensationMs) || target;
    const hit = resolveHumanoidHit(origin, direction, rewound, range, target.skin);
    if (!hit || lineBlocked(origin, direction, hit.distance, room)) continue;
    if (hit.distance < bestTargetDistance) {
      bestTargetDistance = hit.distance;
      best = target;
      bestHit = hit;
    }
  }

  const vehicleHit = nearestVehicleHit(room, origin, direction, range, shooter.vehicleId || "");
  const coreHit = room.mode === "castle" ? nearestCastleCoreHit(room, shooter, origin, direction, range) : null;
  const nearestActorDistance = Math.min(bestTargetDistance, coreHit?.targetDistance ?? Infinity);
  if (vehicleHit && vehicleHit.targetDistance <= nearestActorDistance + 0.22) {
    const damage = weaponDamageAtDistance(weapon, rawDamage, vehicleHit.targetDistance, range);
    applyVehicleDamage(room, shooter, vehicleHit.vehicle, damage, weapon);
    return { hit: "vehicle", targetDistance: vehicleHit.targetDistance };
  }
  if (coreHit && (!best || coreHit.targetDistance < bestTargetDistance)) {
    const damage = weaponDamageAtDistance(weapon, rawDamage, coreHit.targetDistance, range);
    applyCastleCoreDamage(room, shooter, coreHit.core, damage);
    return { hit: "castle", targetDistance: coreHit.targetDistance };
  }

  if (!best || !bestHit) return null;
  const rangedDamage = weaponDamageAtDistance(weapon, rawDamage, bestTargetDistance, range);
  const damage = hitZoneDamage(rangedDamage, bestHit.zone);
  applyDirectDamage(room, shooter, best, damage, weapon, { hitZone: bestHit.zone });
  return { hit: "player", targetDistance: bestTargetDistance, hitZone: bestHit.zone };
}

function nearestCastleCoreHit(room, shooter, origin, direction, range) {
  let best = null;
  for (const core of Object.values(room.castleCores || {})) {
    if (!core || core.team === shooter.color || core.health <= 0) continue;
    const targetDistance = projectionToRay(core, origin, direction);
    if (targetDistance < 0 || targetDistance > range || lineBlocked(origin, direction, targetDistance, room)) continue;
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
  awardCombatGrowth(room, shooter);
  progressFocusTask(room, shooter, "objectiveDamage", appliedDamage);
  addFeed(room, `${shooter.name} が敵の白を攻撃`, shooter.color);
  broadcast(room, { type: "hit", shooter: shooter.id, shooterName: shooter.name, target: `${core.team}-castle-core`, damage: scaledDamage, weapon: "白攻撃" });
}

function resolveCastleRoundByTimer(room, now) {
  if (!room.matchStarted || room.mode !== "castle" || room.winner || !room.castleEndsAt || now < room.castleEndsAt) return;
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

function applyDirectDamage(room, shooter, target, damage, weapon = "銃ダメージ", metadata = {}) {
  if (target.disconnectedAt) return;
  const hitZone = ["head", "torso", "limbs"].includes(metadata.hitZone) ? metadata.hitZone : "";
  const source = { x: shooter.x, y: shooter.y, z: shooter.z };
  if (target.creative) {
    broadcast(room, { type: "hit", shooter: shooter.id, shooterName: shooter.name, target: target.id, damage: 0, blocked: true, weapon, hitZone, source });
    return;
  }
  if ((target.spawnProtectedUntil || 0) > Date.now()) {
    broadcast(room, { type: "hit", shooter: shooter.id, shooterName: shooter.name, target: target.id, damage: 0, blocked: true, weapon: "スポーン保護", hitZone, source });
    return;
  }
  if ((target.shieldUntil || 0) > Date.now()) {
    addFeed(room, `${target.name} がバリアで防いだ`, target.color);
    broadcast(room, { type: "hit", shooter: shooter.id, shooterName: shooter.name, target: target.id, damage: 0, blocked: true, weapon, hitZone, source });
    return;
  }
  const damageReduction = target.isBot ? 0 : clamp(Number(target.damageReduction) || 0, 0, 0.14);
  const mitigatedDamage = Math.max(1, Math.round(damage * (1 - damageReduction)));
  const appliedDamage = Math.min(target.health, mitigatedDamage);
  target.health = Math.max(0, target.health - appliedDamage);
  const headshot = hitZone === "head" && appliedDamage > 0;
  shooter.hits = (shooter.hits || 0) + 1;
  shooter.damageDealt = (shooter.damageDealt || 0) + appliedDamage;
  target.damageTaken = (target.damageTaken || 0) + appliedDamage;
  progressFocusTask(room, shooter, "hit", 1);
  progressFocusTask(room, shooter, "damage", appliedDamage);
  if (target.health === 0) {
    shooter.score += 1;
    shooter.kills += 1;
    shooter.donPunchCharge = Math.min(8, (shooter.donPunchCharge || 0) + 1);
    awardCombatGrowth(room, shooter);
    target.deaths += 1;
    addFeed(room, headshot ? `${shooter.name} が ${target.name} をヘッドショット` : `${shooter.name} が ${target.name} をヒット`, shooter.color);
    if (!target.isBot) {
      send(target.ws, {
        type: "death_info",
        shooter: shooter.name,
        weapon,
        hitZone,
        headshot,
        from: { x: shooter.x, y: shooter.y, z: shooter.z }
      });
    }
    handleDeath(room, shooter, target);
  } else {
    awardCombatGrowth(room, shooter);
    const now = Date.now();
    if (shooter.lastHitFeedTarget !== target.id || now >= (shooter.nextHitFeedAt || 0)) {
      addFeed(room, `${shooter.name} -> ${target.name}`, shooter.color);
      shooter.lastHitFeedTarget = target.id;
      shooter.nextHitFeedAt = now + 220;
    }
  }
  broadcast(room, { type: "hit", shooter: shooter.id, shooterName: shooter.name, target: target.id, damage: appliedDamage, weapon, hitZone, headshot, source });
}

function handleDeath(room, _shooter, target) {
  if (target.vehicleId) releasePlayerVehicle(room, target, true);
  if (room.mode === "practice") {
    addFeed(room, `${target.name} 復帰練習`, target.color);
    respawnPlayer(target, room);
    return;
  }

  if (room.mode === "castle") {
    respawnPlayer(target, room);
    return;
  }

  if (room.mode === "life3") {
    target.lives = Math.max(0, (target.lives || 3) - 1);
    if (target.lives <= 0) {
      target.eliminated = true;
      target.health = 0;
      addFeed(room, `${target.name} ライフ終了`, target.color);
      checkSurvivalWinner(room);
      return;
    }
    respawnPlayer(target, room);
    addFeed(room, `${target.name} 残りライフ${target.lives}`, target.color);
    return;
  }

  target.eliminated = true;
  target.health = 0;
  target.lives = 0;
  addFeed(room, `${target.name} 脱落`, target.color);
  checkSurvivalWinner(room);
}

function safeRespawnPoint(room) {
  const safeZone = room?.safeZone;
  if (!safeZone?.enabled || safeZone.damage <= 0) return spawnPoint(Math.floor(Math.random() * 20));
  const usableRadius = Math.max(4, safeZone.radius - 4.5);
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * usableRadius;
    const x = clamp(safeZone.x + Math.cos(angle) * distance, -arenaHalfSize + 2, arenaHalfSize - 2);
    const z = clamp(safeZone.z + Math.sin(angle) * distance, -arenaHalfSize + 2, arenaHalfSize - 2);
    if (!cpuSpawnIsClear(room, x, z)) continue;
    return { x, y: 1.6, z, yaw: Math.atan2(x - safeZone.x, z - safeZone.z) };
  }
  const fallback = findNearestCpuSafeSpot(safeZone.x, safeZone.z, 0.72, room);
  return { x: fallback.x, y: 1.6, z: fallback.z, yaw: Math.atan2(fallback.x - safeZone.x, fallback.z - safeZone.z) };
}

function respawnPlayer(player, room) {
  const spawn = safeRespawnPoint(room);
  player.poseHistory = [];
  Object.assign(player, spawn, {
    health: maxHealth,
    eliminated: false,
    spawnProtectedUntil: Date.now() + spawnProtectionMs,
    nextZoneDamageAt: Date.now() + 1200,
    vehicleId: ""
  });
  if (player.isBot) Object.assign(player, createCpuTacticalState(player.botIndex));
  recordPlayerPose(player);
  if (!player.isBot) send(player.ws, { type: "respawn", target: player.id, spawn });
}

function checkSurvivalWinner(room) {
  if (!room.matchStarted || room.winner || room.mode === "practice") return;
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
  addFeed(room, `${room.winner.name} 勝利！`, color);
  broadcast(room, { type: "celebration", winner: room.winner });
}

function applyHadeonBurst(room, shooter) {
  shooter.specialsUsed = (shooter.specialsUsed || 0) + 1;
  addFeed(room, `${shooter.name} が銃ダメージ`, shooter.color);
  for (const target of room.players.values()) {
    if (target.id === shooter.id || target.disconnectedAt || target.creative || target.eliminated || target.health <= 0) continue;
    applyDirectDamage(room, shooter, target, 95, "銃ダメージ");
  }
  broadcast(room, { type: "feed", feed: room.feed });
}

function nearestEnemy(room, shooter, maxDistance = Infinity, requireLineOfSight = false) {
  let best;
  let bestDistance = Infinity;
  for (const target of room.players.values()) {
    if (target.id === shooter.id || target.disconnectedAt || target.creative || target.eliminated || target.health <= 0 || target.color === shooter.color) continue;
    if ((target.spawnProtectedUntil || 0) > Date.now()) continue;
    const distance = Math.hypot(target.x - shooter.x, target.y - shooter.y, target.z - shooter.z);
    if (distance > maxDistance) continue;
    if (requireLineOfSight) {
      const origin = { x: shooter.x, y: shooter.y, z: shooter.z };
      const direction = normalize({ x: target.x - shooter.x, y: target.y - shooter.y, z: target.z - shooter.z });
      if (lineBlocked(origin, direction, distance, room)) continue;
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      best = target;
    }
  }
  return best;
}

function createCpuTacticalState(index = 0, now = Date.now()) {
  const role = cpuRoleForIndex(index);
  return {
    botRole: role,
    botTactic: "patrol",
    targetId: "",
    targetSeenAt: 0,
    targetVisible: false,
    lastTargetVisibleAt: 0,
    nextDecisionAt: now + 220 + (index % 4) * 90,
    outnumbered: false,
    coverPoint: null,
    nextCoverSearchAt: 0,
    strafeDirection: index % 2 === 0 ? 1 : -1,
    nextStrafeFlipAt: now + 1500 + (index % 5) * 260,
    weaponReadyAt: now + 900 + index * 80,
    verticalTowerId: "",
    verticalProgress: 0,
    verticalTargetFloor: 0,
    verticalStage: "",
    lastVerticalMoveAt: 0,
    verticalEntryCommitted: false
  };
}

function isActiveCpuTarget(bot, target) {
  return Boolean(
    target &&
    target.id !== bot.id &&
    !target.disconnectedAt &&
    !target.creative &&
    !target.eliminated &&
    target.health > 0 &&
    (target.spawnProtectedUntil || 0) <= Date.now() &&
    target.color !== bot.color
  );
}

function cpuHasLineOfSight(room, bot, target) {
  const origin = { x: bot.x, y: bot.y, z: bot.z };
  const distance = Math.hypot(target.x - bot.x, target.y - bot.y, target.z - bot.z);
  const direction = normalize({ x: target.x - bot.x, y: target.y - bot.y, z: target.z - bot.z });
  return distance > 0.01 && !lineBlocked(origin, direction, distance, room);
}

function updateCpuAwareness(room, bot, targets, now) {
  bot.botRole ||= cpuRoleForIndex(bot.botIndex);
  let currentTarget = room.players.get(bot.targetId);
  if (!isActiveCpuTarget(bot, currentTarget)) currentTarget = null;
  if (now >= (bot.nextDecisionAt || 0) || !currentTarget) {
    const ownCore = room.castleCores?.[bot.color];
    const candidates = targets
      .filter((target) => isActiveCpuTarget(bot, target))
      .map((target) => {
        const distance = Math.hypot(target.x - bot.x, target.y - bot.y, target.z - bot.z);
        return {
          target,
          distance,
          healthRatio: clamp(target.health / maxHealth, 0, 1),
          sticky: target.id === bot.targetId,
          objectiveThreat: Boolean(ownCore?.health > 0 && Math.hypot(target.x - ownCore.x, target.z - ownCore.z) < 24)
        };
      })
      .sort((left, right) => (
        scoreCpuTarget({ ...left, visible: true }) - scoreCpuTarget({ ...right, visible: true })
      ))
      .slice(0, 5);
    let selected = null;
    let selectedScore = Infinity;
    for (const candidate of candidates) {
      const visible = cpuHasLineOfSight(room, bot, candidate.target);
      const score = scoreCpuTarget({ ...candidate, visible });
      if (score < selectedScore) {
        selected = candidate.target;
        selectedScore = score;
      }
    }
    if (selected?.id !== bot.targetId) {
      bot.targetId = selected?.id || "";
      bot.targetSeenAt = 0;
      bot.targetVisible = false;
      bot.lastTargetVisibleAt = 0;
      bot.coverPoint = null;
    }
    currentTarget = selected;
    let nearbyAllies = 0;
    let nearbyEnemies = 0;
    for (const player of room.players.values()) {
      if (player.disconnectedAt || player.eliminated || player.health <= 0) continue;
      if (Math.hypot(player.x - bot.x, player.z - bot.z) > 28) continue;
      if (player.color === bot.color) nearbyAllies += 1;
      else nearbyEnemies += 1;
    }
    bot.outnumbered = nearbyEnemies > nearbyAllies;
    bot.nextDecisionAt = now + cpuDecisionInterval(bot.botRole, bot.botIndex);
  }

  if (!currentTarget || !isActiveCpuTarget(bot, currentTarget)) {
    bot.targetId = "";
    bot.targetVisible = false;
    return { target: null, visible: false, remembered: false, distance: Infinity };
  }
  const visible = cpuHasLineOfSight(room, bot, currentTarget);
  if (visible) {
    if (!bot.targetVisible || !bot.targetSeenAt) bot.targetSeenAt = now;
    bot.lastTargetVisibleAt = now;
  }
  bot.targetVisible = visible;
  const remembered = now - (bot.lastTargetVisibleAt || 0) <= cpuTargetMemoryMs(bot.botRole);
  return {
    target: currentTarget,
    visible,
    remembered,
    distance: Math.hypot(currentTarget.x - bot.x, currentTarget.y - bot.y, currentTarget.z - bot.z)
  };
}

function cpuSpawnIsClear(room, x, z) {
  if (cpuCollides(x, z, 0.72, room)) return false;
  for (const vehicle of room.vehicles?.values?.() || []) {
    if (Math.hypot(vehicle.x - x, vehicle.z - z) < 2.35) return false;
  }
  for (const player of room.players.values()) {
    if (player.disconnectedAt || player.eliminated || player.health <= 0 || player.vehicleId) continue;
    const minimumPlayerGap = player.isBot ? 1.5 : 2.15;
    if (Math.hypot(player.x - x, player.z - z) < minimumPlayerGap) return false;
  }
  if (room.safeZone?.enabled && room.safeZone.damage > 0 && isOutsideSafeZone({ x, z }, room.safeZone, 2.5)) return false;
  return true;
}

function safeCpuSpawnPoint(room, index = 0) {
  const preferred = room.safeZone?.enabled && room.safeZone.damage > 0
    ? safeRespawnPoint(room)
    : spawnPoint(index + 3);
  if (cpuSpawnIsClear(room, preferred.x, preferred.z)) return preferred;
  for (let ring = 1; ring <= 8; ring += 1) {
    const distance = ring * 2.15;
    for (let step = 0; step < 16; step += 1) {
      const angle = (Math.PI * 2 * step) / 16 + index * 0.41;
      const x = clamp(preferred.x + Math.cos(angle) * distance, -arenaHalfSize + 2, arenaHalfSize - 2);
      const z = clamp(preferred.z + Math.sin(angle) * distance, -arenaHalfSize + 2, arenaHalfSize - 2);
      if (!cpuSpawnIsClear(room, x, z)) continue;
      return { x, y: 1.6, z, yaw: preferred.yaw };
    }
  }
  const fallback = findNearestCpuSafeSpot(preferred.x, preferred.z, 0.72, room);
  return { x: fallback.x, y: 1.6, z: fallback.z, yaw: preferred.yaw };
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
    const spawn = safeCpuSpawnPoint(room, i);
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
      itemPickups: 0,
      lives: initialLivesForMode(room.mode),
      eliminated: false,
      creative: false,
      healPacks: initialHealPacks,
      equipmentTier: 0,
      focusTask: null,
      nextFocusTaskAt: 0,
      donPunchCharge: 0,
      speedBoostUntil: 0,
      damageBoostUntil: 0,
      comebackUntil: 0,
      spawnProtectedUntil: Date.now() + spawnProtectionMs,
      vehicleId: "",
      nextImpactAt: 0,
      nextTeamPingAt: 0,
      nextZoneDamageAt: 0,
      yaw: spawn.yaw,
      pitch: 0,
      lastSeen: Date.now(),
      isBot: true,
      botIndex: i,
      botPhase: Math.random() * Math.PI * 2,
      botWeapon: ["ak47", "aug", "type95", "smg"][i % 4],
      nextWeaponSwitchAt: Date.now() + 1100 + i * 420,
      nextShotAt: Date.now() + 1100 + i * 280,
      ...createCpuTacticalState(i),
      ...spawn
    });
  }
  room.cpuCount = target;
}

function createCpuPlayer(room, id, index, team) {
  const spawn = safeCpuSpawnPoint(room, index);
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
    itemPickups: 0,
    lives: initialLivesForMode(room.mode),
    eliminated: false,
    creative: false,
    healPacks: initialHealPacks,
    equipmentTier: 0,
    focusTask: null,
    nextFocusTaskAt: 0,
    donPunchCharge: 0,
    speedBoostUntil: 0,
    damageBoostUntil: 0,
    comebackUntil: 0,
    spawnProtectedUntil: Date.now() + spawnProtectionMs,
    vehicleId: "",
    nextImpactAt: 0,
    nextTeamPingAt: 0,
    nextZoneDamageAt: 0,
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
    ...createCpuTacticalState(index),
    ...spawn
  };
}

function resetMatchToWaiting(room) {
  Object.assign(room, createMatchLifecycle());
  room.roundStartedAt = 0;
  room.castleEndsAt = 0;
  room.winner = null;
}

function publicMatchLifecycle(room) {
  const humans = connectedHumanPlayers(room);
  return {
    matchVersion,
    matchPhase: room.matchPhase || "waiting",
    matchStarted: Boolean(room.matchStarted),
    phaseEndsAt: Number(room.phaseEndsAt) || 0,
    roundStartedAt: Number(room.roundStartedAt) || 0,
    humanCount: humans.length,
    readyHumans: humans.filter((player) => player.ready).length,
    minimumHumans: minimumHumansForMatch(room.mode, room.cpuFill)
  };
}

function fpsPlayerWon(room, player) {
  const winner = room.winner;
  if (!winner || winner.name === "引き分け") return false;
  return winner.color === player.color || winner.name === player.name;
}

function fpsDonReward(room, player) {
  return calculateFpsDonReward(player, fpsPlayerWon(room, player));
}

function awardFpsDonRewards(room) {
  if (room.donRewardsAwardedForRound) return;
  room.donRewardsAwardedForRound = true;
  let profileChanged = false;
  for (const player of room.players.values()) {
    if (player.isBot || player.disconnectedAt) continue;
    const breakdown = fpsDonReward(room, player);
    const balance = creditPlayerWallet(player, breakdown.total);
    const profile = profileForPlayer(player);
    const xpBreakdown = calculateFpsXpReward(player, fpsPlayerWon(room, player));
    let profilePayload = null;
    let accountVault = "";
    if (profile) {
      const progress = sanitizeProgress(profile.progress);
      progress.xp += xpBreakdown.total;
      progress.sessions += 1;
      progress.bestScore = Math.max(progress.bestScore, Math.floor(Number(player.score) || 0));
      progress.bestKills = Math.max(progress.bestKills, Math.floor(Number(player.kills) || 0));
      progress.lastReward = `FPS +${xpBreakdown.total}XP / +${breakdown.total}Don`;
      profile.progress = sanitizeProgress(progress);
      profile.updatedAt = Date.now();
      profilePayload = publicProfile(profile);
      accountVault = sealProfileVault(player.profileKey, profile);
      profileChanged = true;
    }
    send(player.ws, {
      type: "fps_don_reward",
      amount: breakdown.total,
      balance,
      breakdown,
      xp: xpBreakdown.total,
      xpBreakdown,
      profile: profilePayload,
      accountVault
    });
  }
  if (profileChanged) saveProfileSoon();
}

function updateMatchLifecycle(room, now = Date.now()) {
  const humans = connectedHumanPlayers(room);
  const next = stepMatchLifecycle(room, {
    mode: room.mode,
    cpuFill: room.cpuFill,
    humanCount: humans.length,
    readyHumans: humans.filter((player) => player.ready).length,
    winner: room.winner
  }, now);
  room.matchPhase = next.matchPhase;
  room.phaseEndsAt = next.phaseEndsAt;
  room.matchStarted = next.matchStarted;

  if (next.transition === "countdown") {
    addFeed(room, "マッチ開始カウントダウン", "blue");
  } else if (next.transition === "start") {
    resetRoomScores(room, now, true);
    room.matchPhase = "active";
    room.phaseEndsAt = 0;
    room.matchStarted = true;
    room.roundStartedAt = now;
    room.castleEndsAt = room.mode === "castle" ? now + castleRoundMs : 0;
    addFeed(room, `${modeLabel(room.mode)} BATTLE START`, "blue");
  } else if (next.transition === "result") {
    awardFpsDonRewards(room);
  }
  return next;
}

function syncMatchCpuFill(room) {
  if (!room.matchmaking) return;
  for (const player of [...room.players.values()]) {
    if (player.isBot) room.players.delete(player.id);
  }
  if (!room.cpuFill) {
    room.cpuCount = 0;
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

  resetMatchToWaiting(room);
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

function resetRoomScores(room, now = Date.now(), consumeItems = false) {
  room.winner = null;
  room.roundStartedAt = room.matchStarted ? now : 0;
  room.weaponStats = Object.create(null);
  room.donRewardsAwardedForRound = false;
  room.movementStats = { samples: 0, moving: 0, airborne: 0 };
  if (room.mode === "castle" && !room.playerTeam) {
    const firstHuman = [...room.players.values()].find((player) => !player.isBot);
    room.playerTeam = firstHuman?.color || "blue";
  }
  let index = 0;
  let profileItemsChanged = false;
  for (const player of room.players.values()) {
    player.score = 0;
    player.ready = false;
    player.kills = 0;
    player.deaths = 0;
    player.damageDealt = 0;
    player.damageTaken = 0;
    player.hits = 0;
    player.healsUsed = 0;
    player.specialsUsed = 0;
    player.barrierPickups = 0;
    player.itemPickups = 0;
    player.lives = initialLivesForMode(room.mode);
    player.eliminated = false;
    player.creative = false;
    player.healPacks = initialHealPacks;
    player.equipmentTier = 0;
    player.focusTask = null;
    player.nextFocusTaskAt = now + 2400;
    player.donPunchCharge = 0;
    player.health = maxHealth;
    player.shieldUntil = 0;
    player.speedBoostUntil = 0;
    player.damageBoostUntil = 0;
    player.comebackUntil = 0;
    player.spawnProtectedUntil = now + spawnProtectionMs;
    player.vehicleId = "";
    player.lastStateAt = now;
    player.nextImpactAt = 0;
    player.nextZoneDamageAt = 0;
    player.nextTeamPingAt = 0;
    player.poseHistory = [];
    if (!player.isBot) {
      applyPersistentCombatBonuses(player);
      if (consumeItems) profileItemsChanged = consumeMatchItems(player, now) || profileItemsChanged;
    }
    const spawn = spawnPoint(index);
    Object.assign(player, spawn);
    recordPlayerPose(player);
    if (!player.isBot) send(player.ws, { type: "respawn", target: player.id, spawn });
    index += 1;
  }
  if (profileItemsChanged) saveProfileSoon();
  if (room.mode !== "castle" && room.relationMode !== "coop") room.playerTeam = null;
  room.donPunches.clear();
  room.vehicles = createVehicles();
  room.elevators = createElevators();
  rebuildElevatorObstacles(room);
  room.castleCores = createCastleCores(room.playerTeam || "blue");
  room.castleEndsAt = room.mode === "castle" && room.matchStarted ? now + castleRoundMs : 0;
  room.barrier = { ...barrierSpawn, available: true, pickedBy: "", respawnAt: 0 };
  room.healthPickup = { ...randomPickupSpawn(room.arena), available: false, respawnAt: room.mode === "oneLife" ? nextHealthPickupAt() : 0 };
  room.powerups = createPowerups(now);
  room.safeZone = computeSafeZone({
    roundStartedAt: room.roundStartedAt,
    now,
    mode: room.mode,
    matchStarted: room.matchStarted,
    winner: room.winner
  });
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
  player.itemPickups = (player.itemPickups || 0) + 1;
  progressFocusTask(room, player, "recover", 1);
  progressFocusTask(room, player, "item", 1);
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
  player.itemPickups = (player.itemPickups || 0) + 1;
  room.healthPickup.available = false;
  room.healthPickup.respawnAt = nextHealthPickupAt();
  progressFocusTask(room, player, "recover", 1);
  progressFocusTask(room, player, "item", 1);
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
    powerup.respawnAt = now + powerupRespawnMs + Math.floor(Math.random() * 3500);
    player.itemPickups = (player.itemPickups || 0) + 1;
    if (powerup.kind === "speed") {
      player.speedBoostUntil = now + powerupDurationMs;
      addFeed(room, `${player.name} がスピードブーストを取得`, player.color);
    } else if (powerup.kind === "heal") {
      player.health = Math.min(maxHealth, player.health + 40);
      player.healPacks = Math.min(12, (player.healPacks || 0) + 1);
      addFeed(room, `${player.name} がメディカルキットを取得`, player.color);
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
    progressFocusTask(room, player, "item", 1);
    send(player.ws, { type: "powerup", kind: powerup.kind });
    send(player.ws, { type: "sound", sound: powerup.kind === "heal" ? "heal" : powerup.kind === "speed" ? "jump" : "barrier" });
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
    if (!shooter || !target || target.disconnectedAt || target.health <= 0 || now >= punch.expiresAt) {
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

function cpuAimSpread(weapon, distance, index = 0) {
  const base = {
    rifle: 0.028,
    ak47: 0.04,
    aug: 0.024,
    smg: 0.046,
    shotgun: 0.07,
    marksman: 0.02,
    awm: 0.026,
    type95: 0.036
  }[weapon] || 0.04;
  return base * 1.12 + Math.min(0.052, Math.max(0, distance) * 0.00082) + (index % 3) * 0.0055;
}

function applyCpuAimError(direction, weapon, distance, index = 0) {
  const spread = cpuAimSpread(weapon, distance, index);
  return normalize({
    x: direction.x + (Math.random() - 0.5) * spread,
    y: direction.y + (Math.random() - 0.5) * spread * 0.72,
    z: direction.z + (Math.random() - 0.5) * spread
  });
}

function updateCpuWeapon(room, bot, distance, now) {
  if (now < (bot.nextWeaponSwitchAt || 0)) return bot.botWeapon || "rifle";
  const nextWeapon = chooseCpuWeapon(room, distance, bot.botIndex, bot.botRole);
  if (nextWeapon !== bot.botWeapon) {
    bot.botWeapon = nextWeapon;
    bot.weaponReadyAt = now + 260 + (bot.botIndex % 4) * 35;
  }
  bot.nextWeaponSwitchAt = now + 2300 + bot.botIndex * 120;
  return bot.botWeapon || "rifle";
}

function tryCpuCastleShot(room, bot, attackCore, now) {
  if (!attackCore?.health || now < (bot.nextShotAt || 0)) return false;
  const distance = Math.hypot(attackCore.x - bot.x, attackCore.y - bot.y, attackCore.z - bot.z);
  const weapon = updateCpuWeapon(room, bot, distance, now);
  const weaponRangeLimit = cpuWeaponMaxRange.get(weapon) || 34;
  if (distance > weaponRangeLimit || now < (bot.weaponReadyAt || 0)) return false;
  const origin = { x: bot.x, y: bot.y, z: bot.z };
  const idealDirection = normalize({ x: attackCore.x - bot.x, y: attackCore.y - bot.y, z: attackCore.z - bot.z });
  const direction = applyCpuAimError(idealDirection, weapon, distance, bot.botIndex);
  const targetDistance = projectionToRay(attackCore, origin, direction);
  const coreMissDistance = distanceToRay(attackCore, origin, direction, weaponRangeLimit);
  bot.yaw = Math.atan2(direction.x, direction.z);
  bot.pitch = Math.asin(clamp(direction.y, -1, 1));
  if (targetDistance <= 0 || targetDistance > weaponRangeLimit || coreMissDistance > castleCoreRadius * 0.82) return false;
  if (lineBlocked(origin, direction, targetDistance, room)) return false;
  const baseDamage = weaponDamage.get(weapon) || 25;
  const damage = Math.max(6, Math.ceil(baseDamage * cpuCastleDamageMultiplier));
  applyCastleCoreDamage(room, bot, attackCore, damage);
  broadcast(room, { type: "shot", shooter: bot.id, origin, direction, range: weaponRangeLimit, weapon });
  bot.nextShotAt = now + cpuFireDelay(weapon, bot.botRole, bot.botIndex);
  return true;
}

function tryCpuPlayerShot(room, bot, awareness, now) {
  const target = awareness.target;
  if (!target || now < (bot.nextShotAt || 0)) return false;
  const distance = Math.hypot(target.x - bot.x, target.y - bot.y, target.z - bot.z);
  const weapon = updateCpuWeapon(room, bot, distance, now);
  const weaponRangeLimit = cpuWeaponMaxRange.get(weapon) || 34;
  const reactionDelay = cpuReactionDelay(bot.botRole, distance, bot.botIndex);
  if (!cpuCanFire({
    now,
    targetSeenAt: bot.targetSeenAt,
    visible: awareness.visible,
    distance,
    range: weaponRangeLimit,
    reactionDelay
  }) || now < (bot.weaponReadyAt || 0)) {
    bot.nextShotAt = now + 140 + (bot.botIndex % 3) * 35;
    return false;
  }
  const origin = { x: bot.x, y: bot.y, z: bot.z };
  const idealDirection = normalize({ x: target.x - bot.x, y: target.y - bot.y, z: target.z - bot.z });
  const direction = applyCpuAimError(idealDirection, weapon, distance, bot.botIndex);
  bot.yaw = Math.atan2(direction.x, direction.z);
  bot.pitch = Math.asin(clamp(direction.y, -1, 1));
  applyShot(room, bot, origin, direction, weapon);
  broadcast(room, { type: "shot", shooter: bot.id, origin, direction, range: weaponRangeLimit, weapon });
  bot.nextShotAt = now + cpuFireDelay(weapon, bot.botRole, bot.botIndex);
  return true;
}

function updateCpuPlayers(room, now, updateParity = -1) {
  const samples = room.movementStats.samples || 0;
  const movingRatio = samples ? room.movementStats.moving / samples : 0;
  const airborneRatio = samples ? room.movementStats.airborne / samples : 0;
  const activeCombatants = [...room.players.values()].filter((player) => (
    !player.disconnectedAt && !player.creative && !player.eliminated && player.health > 0
  ));
  for (const bot of room.players.values()) {
    if (!bot.isBot) continue;
    if (updateParity >= 0 && Math.abs(Number(bot.botIndex) || 0) % 2 !== updateParity) continue;
    if (bot.eliminated || bot.health <= 0) {
      bot.lastSeen = now;
      continue;
    }
    bot.botRole ||= cpuRoleForIndex(bot.botIndex);
    const phase = (now / 1000) * 0.34 + bot.botPhase;
    const attackCore = room.mode === "castle" ? room.castleCores?.[oppositeTeam(bot.color)] : null;
    const seekSafeZone = isOutsideSafeZone(bot, room.safeZone, 3.2);
    const targets = activeCombatants.filter((player) => player.id !== bot.id && player.color !== bot.color);
    const awareness = updateCpuAwareness(room, bot, targets, now);
    const tactic = chooseCpuTactic({
      role: bot.botRole,
      healthRatio: bot.health / maxHealth,
      distance: awareness.distance,
      visible: awareness.visible,
      targetAvailable: Boolean(awareness.target),
      targetRemembered: awareness.remembered,
      outnumbered: Boolean(bot.outnumbered),
      outsideSafeZone: seekSafeZone,
      objectiveActive: Boolean(attackCore?.health > 0)
    });
    bot.botTactic = tactic;
    if (now >= (bot.nextStrafeFlipAt || 0)) {
      bot.strafeDirection = (bot.strafeDirection || 1) * -1;
      bot.nextStrafeFlipAt = now + 1500 + (bot.botIndex % 5) * 260;
    }
    const routingVertically = updateCpuVerticalRoute(room, bot, seekSafeZone ? null : awareness.target, now);
    if (routingVertically) {
      bot.botTactic = "vertical";
      bot.coverPoint = null;
      bot.lastSeen = now;
      if (!room.winner && awareness.target) tryCpuPlayerShot(room, bot, awareness, now);
      continue;
    }
    const objective = seekSafeZone
      ? { x: room.safeZone.x, z: room.safeZone.z }
      : attackCore?.health > 0
        ? { x: attackCore.x, z: attackCore.z }
        : null;
    let destination = computeCpuDestination({
      bot,
      target: awareness.target,
      objective,
      tactic,
      role: bot.botRole,
      side: bot.strafeDirection,
      phase: phase + bot.botIndex * 0.37,
      arenaHalfSize
    });
    const wantsCover = bot.y < 3 && awareness.target && !seekSafeZone && (tactic === "retreat" || (tactic === "hold" && bot.botRole === "marksman"));
    if (wantsCover) {
      if (now >= (bot.nextCoverSearchAt || 0)) {
        bot.coverPoint = findCpuCoverPoint(room, bot, awareness.target);
        bot.nextCoverSearchAt = now + 950 + (bot.botIndex % 5) * 130;
      }
      if (bot.coverPoint) destination = bot.coverPoint;
    } else if (tactic !== "flank") {
      bot.coverPoint = null;
    }
    destination = applyCpuSeparation(room, bot, destination);
    bot.learnedSpeedBoost = samples > 30 && movingRatio > 0.62 ? 0.38 : 0;
    bot.learnedAirborneBias = samples > 30 && airborneRatio > 0.16;
    moveCpuAlongWalls(bot, destination.x, destination.z, now, room);
    keepCpuOutOfWalls(bot, room);
    bot.lastSeen = now;
    if (room.winner) continue;
    if (tryCpuCastleShot(room, bot, attackCore, now)) continue;
    if (tryCpuPlayerShot(room, bot, awareness, now)) continue;
    if (awareness.target) {
      bot.yaw = Math.atan2(awareness.target.x - bot.x, awareness.target.z - bot.z);
      bot.pitch = 0;
    } else {
      bot.yaw = Math.atan2(destination.x - bot.x, destination.z - bot.z);
      bot.pitch = 0;
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

function chooseCpuWeapon(room, distance, index = 0, role = cpuRoleForIndex(index)) {
  const popular = dominantHumanWeapon(room);
  const samples = room.movementStats.samples || 0;
  const airborneRatio = samples ? room.movementStats.airborne / samples : 0;
  return selectCpuWeapon({ role, distance, popularWeapon: popular, airborneRatio, index });
}

function cpuFireDelay(weapon, role = "assault", index = 0) {
  const baseDelay = {
    rifle: 1180,
    ak47: 1260,
    aug: 1160,
    smg: 980,
    shotgun: 1800,
    marksman: 1950,
    awm: 2600,
    type95: 1320
  }[weapon] || 1240;
  return Math.round(baseDelay * cpuFireDelayMultiplier(role, index));
}

server.listen(port, "0.0.0.0", () => {
  console.log(`DonPaChi FPS running at http://localhost:${port}`);
});
