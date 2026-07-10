import "./styles.css";
import * as THREE from "three";
import ArrowDown from "lucide/dist/esm/icons/arrow-down.js";
import ArrowLeft from "lucide/dist/esm/icons/arrow-left.js";
import ArrowRight from "lucide/dist/esm/icons/arrow-right.js";
import ArrowUp from "lucide/dist/esm/icons/arrow-up.js";
import CarFront from "lucide/dist/esm/icons/car-front.js";
import Check from "lucide/dist/esm/icons/check.js";
import ChevronsUp from "lucide/dist/esm/icons/chevrons-up.js";
import Copy from "lucide/dist/esm/icons/copy.js";
import Crosshair from "lucide/dist/esm/icons/crosshair.js";
import HeartPulse from "lucide/dist/esm/icons/heart-pulse.js";
import MapPin from "lucide/dist/esm/icons/map-pin.js";
import Maximize2 from "lucide/dist/esm/icons/maximize-2.js";
import MicOff from "lucide/dist/esm/icons/mic-off.js";
import Minimize2 from "lucide/dist/esm/icons/minimize-2.js";
import Repeat2 from "lucide/dist/esm/icons/repeat-2.js";
import RotateCcw from "lucide/dist/esm/icons/rotate-ccw.js";
import Scan from "lucide/dist/esm/icons/scan.js";
import Send from "lucide/dist/esm/icons/send.js";
import Settings from "lucide/dist/esm/icons/settings.js";
import Signal from "lucide/dist/esm/icons/signal.js";
import Smartphone from "lucide/dist/esm/icons/smartphone.js";
import Users from "lucide/dist/esm/icons/users.js";
import Volume2 from "lucide/dist/esm/icons/volume-2.js";
import X from "lucide/dist/esm/icons/x.js";
import Zap from "lucide/dist/esm/icons/zap.js";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PlayerColor = "blue" | "red";
type TeamChoice = PlayerColor | "auto";
type RelationMode = "versus" | "coop";
type GameMode = "oneLife" | "practice" | "life3" | "castle";
type ArenaId = "toybox";
type PartySize = 1 | 2 | 4;
type SkinId = "rounded" | "scout" | "heavy" | "bee";

type PlayerState = {
  id: string;
  name: string;
  color: PlayerColor;
  cosmeticColor?: string;
  skin?: SkinId;
  ready: boolean;
  health: number;
  score: number;
  kills: number;
  deaths: number;
  damageDealt?: number;
  damageTaken?: number;
  hits?: number;
  healsUsed?: number;
  specialsUsed?: number;
  barrierPickups?: number;
  lives?: number;
  eliminated?: boolean;
  creative?: boolean;
  healPacks?: number;
  equipmentTier?: number;
  focusTask?: FocusTask | null;
  donPunchCharge?: number;
  shieldUntil?: number;
  speedBoostUntil?: number;
  damageBoostUntil?: number;
  comebackUntil?: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  lastSeen: number;
  isBot?: boolean;
  weapon?: string;
  level?: number;
  spawnProtectedUntil?: number;
  vehicleId?: string;
};

type FocusTask = {
  kind: string;
  label: string;
  progress: number;
  target: number;
  expiresAt: number;
  reward?: string;
};

type FeedItem = {
  id: string;
  text: string;
  color: PlayerColor;
  at: number;
};

type ChatItem = {
  id: string;
  name: string;
  color: PlayerColor;
  text: string;
  at: number;
};

type DonPunchSnapshot = {
  id: string;
  type?: "donpachi";
  shooterId: string;
  targetId: string;
  x: number;
  y: number;
  z: number;
  expiresAt: number;
};

type VehicleSnapshot = {
  id: string;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  driverId?: string;
  color?: "green" | "blue" | "yellow" | "red";
  health?: number;
  maxHealth?: number;
  disabledUntil?: number;
  repairing?: boolean;
};

type SafeZoneSnapshot = {
  enabled: boolean;
  phase: number;
  stage: "inactive" | "waiting" | "shrinking" | "holding" | "final";
  x: number;
  z: number;
  radius: number;
  nextRadius: number;
  damage: number;
  endsAt: number;
};

type TeamPingSnapshot = {
  id: string;
  playerId: string;
  name: string;
  color: PlayerColor;
  x: number;
  y: number;
  z: number;
  expiresAt: number;
};

type BarrierSnapshot = {
  x: number;
  y: number;
  z: number;
  available: boolean;
  pickedBy?: string;
  respawnAt?: number;
};

type HealthPickupSnapshot = {
  x: number;
  y: number;
  z: number;
  available: boolean;
  respawnAt?: number;
};

type PowerupKind = "speed" | "ammo" | "damage" | "comeback";

type PowerupSnapshot = {
  id: string;
  kind: PowerupKind;
  x: number;
  y: number;
  z: number;
  available: boolean;
  respawnAt?: number;
};

type CastleCoreSnapshot = {
  team: PlayerColor;
  x: number;
  y: number;
  z: number;
  health: number;
  maxHealth: number;
};

type PokerPlayer = {
  id: string;
  name: string;
  chips: number;
  bet: number;
  folded: boolean;
  allIn: boolean;
  acted: boolean;
  isBot: boolean;
  seat: number;
  lastAction?: string;
  mood?: string;
  streak?: number;
  cards: string[];
  cardCount: number;
};

type PokerSnapshot = {
  room: string;
  selfId: string;
  players: PokerPlayer[];
  community: string[];
  pot: number;
  stage: string;
  dealerSeat: number;
  turnId: string;
  turnEndsAt: number;
  now: number;
  toCall: number;
  currentBet: number;
  minRaise: number;
  lastEvent: string;
  showdown?: {
    winners: { id: string; name: string; label: string; amount: number }[];
    revealed: { id: string; hand: string[] }[];
  };
};

type ProgressState = {
  xp: number;
  sessions: number;
  streakDays: number;
  lastPlayDate: string;
  bestScore: number;
  bestKills: number;
  pokerWins: number;
  lastReward: string;
};

type ProfileInventory = {
  healPacks: number;
  pokerDon: number;
  barrierCharges: number;
  boostTickets: number;
};

type LoginProfile = {
  name?: string;
  skin?: SkinId;
  cosmeticColor?: string;
  level?: number;
  progress?: Partial<ProgressState>;
  inventory?: Partial<ProfileInventory>;
};

const $ = <T extends HTMLElement>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
};

const maxHealth = 200;

type LucideNode = [string, Record<string, string | number>, LucideNode[]];

function createLucideElement(node: LucideNode): SVGElement {
  const [tag, attributes, children] = node;
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  for (const child of children || []) element.append(createLucideElement(child));
  return element;
}

function createIcons({ icons }: { icons: Record<string, LucideNode> }) {
  for (const placeholder of document.querySelectorAll<HTMLElement>("[data-lucide]")) {
    if (placeholder instanceof SVGElement) continue;
    const iconName = placeholder.dataset.lucide || "";
    const componentName = iconName.replace(/(^|-)([a-z0-9])/g, (_match, _dash, letter: string) => letter.toUpperCase());
    const icon = icons[componentName];
    if (!icon) continue;
    const svg = createLucideElement(icon);
    for (const attribute of placeholder.attributes) svg.setAttribute(attribute.name, attribute.value);
    const existingClass = svg.getAttribute("class") || "";
    svg.setAttribute("class", ["lucide", `lucide-${iconName}`, existingClass].filter(Boolean).join(" "));
    placeholder.replaceWith(svg);
  }
}

const lucideIcons = {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronsUp,
  CarFront,
  Check,
  Copy,
  Crosshair,
  HeartPulse,
  MapPin,
  Maximize2,
  MicOff,
  Minimize2,
  Repeat2,
  RotateCcw,
  Scan,
  Send,
  Settings,
  Signal,
  Smartphone,
  Users,
  Volume2,
  X,
  Zap
};

createIcons({ icons: lucideIcons });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

const canvas = $("#game") as HTMLCanvasElement;
const pwaSplash = $("#pwaSplash");
const minimapCanvas = $("#minimap") as HTMLCanvasElement;
const minimap = minimapCanvas.getContext("2d")!;
const joinPanel = $("#joinPanel");
const loginIdInput = $("#loginIdInput") as HTMLInputElement;
const createLoginIdButton = $("#createLoginId") as HTMLButtonElement;
const loginProfileButton = $("#loginProfile") as HTMLButtonElement;
const loginStatus = $("#loginStatus");
const nameInput = $("#nameInput") as HTMLInputElement;
const onlinePlayersEl = $("#onlinePlayers");
const modeSelect = $("#modeSelect");
const teamSelect = $("#teamSelect");
const partySelect = $("#partySelect");
const lobbyCpuFillSelect = $("#lobbyCpuFillSelect");
const relationSelect = $("#relationSelect");
const skinSelect = $("#skinSelect");
const settingsModeSelect = $("#settingsModeSelect");
const settingsTeamSelect = $("#settingsTeamSelect");
const settingsRelationSelect = $("#settingsRelationSelect");
const createRoomButton = $("#createRoom") as HTMLButtonElement;
const roomInput = $("#roomInput") as HTMLInputElement;
const joinRoomButton = $("#joinRoom") as HTMLButtonElement;
const joinPokerRoomButton = $("#joinPokerRoom") as HTMLButtonElement;
const createPokerRoomButton = $("#createPokerRoom") as HTMLButtonElement;
const pokerCpuSelect = $("#pokerCpuSelect");
const pokerPanel = $("#pokerPanel");
const pokerRoomCodeEl = $("#pokerRoomCode");
const pokerPotEl = $("#pokerPot");
const pokerStageEl = $("#pokerStage");
const pokerEventEl = $("#pokerEvent");
const pokerTimerEl = $("#pokerTimer");
const pokerHeaderTimerEl = $("#pokerHeaderTimer");
const pokerCommunityEl = $("#pokerCommunity");
const pokerSeatsEl = $("#pokerSeats");
const pokerMyCardsEl = $("#pokerMyCards");
const pokerStackLineEl = $("#pokerStackLine");
const pokerFoldButton = $("#pokerFold") as HTMLButtonElement;
const pokerCallButton = $("#pokerCall") as HTMLButtonElement;
const pokerRaiseButton = $("#pokerRaise") as HTMLButtonElement;
const pokerRaiseAmountInput = $("#pokerRaiseAmount") as HTMLInputElement;
const pokerRaisePresets = $("#pokerRaisePresets") as HTMLElement;
const pokerJankenPanel = $("#pokerJankenPanel") as HTMLElement;
const copyPokerInviteButton = $("#copyPokerInvite") as HTMLButtonElement;
const leavePokerButton = $("#leavePoker") as HTMLButtonElement;
const roomCodeEl = $("#roomCode");
const copyInviteButton = $("#copyInvite") as HTMLButtonElement;
const inviteButton = $("#inviteButton") as HTMLButtonElement;
const readyButton = $("#readyButton") as HTMLButtonElement;
const mobileFire = $("#mobileFire") as HTMLButtonElement;
const scoreboard = $("#scoreboard");
const scoreboardToggle = $("#scoreboardToggle") as HTMLButtonElement;
const closeScoreboard = $("#closeScoreboard") as HTMLButtonElement;
const settingsButton = $("#settingsButton") as HTMLButtonElement;
const muteButton = $("#muteButton") as HTMLButtonElement;
const audioUnlockButton = $("#audioUnlockButton") as HTMLButtonElement;
const settingsPanel = $("#settingsPanel");
const closeSettings = $("#closeSettings") as HTMLButtonElement;
const colorSwatches = $("#colorSwatches");
const soundToggle = $("#soundToggle") as HTMLButtonElement;
const cpuButtons = $("#cpuButtons");
const cpuFillButtons = $("#cpuFillButtons");
const resetButton = $("#resetButton") as HTMLButtonElement;
const endCelebrationButton = $("#endCelebration") as HTMLButtonElement;
const donPunchButton = $("#donPunchButton") as HTMLButtonElement;
const mobileAimZone = $("#mobileAimZone");
const mobileFullscreen = $("#mobileFullscreen") as HTMLButtonElement;
const mobileInstall = $("#mobileInstall") as HTMLButtonElement;
const mobileFullscreenGuide = $("#mobileFullscreenGuide");
const mobileFullscreenGuideText = $("#mobileFullscreenGuideText");
const mobileGuidePlay = $("#mobileGuidePlay") as HTMLButtonElement;
const mobileGuideInstall = $("#mobileGuideInstall") as HTMLButtonElement;
const mobileGuideClose = $("#mobileGuideClose") as HTMLButtonElement;
const mobileStick = $("#mobileStick");
const mobileStickKnob = $("#mobileStickKnob");
const mobileJump = $("#mobileJump") as HTMLButtonElement;
const mobileHeal = $("#mobileHeal") as HTMLButtonElement;
const mobileWeapon = $("#mobileWeapon") as HTMLButtonElement;
const mobileReload = $("#mobileReload") as HTMLButtonElement;
const mobileScope = $("#mobileScope") as HTMLButtonElement;
const mobilePing = $("#mobilePing") as HTMLButtonElement;
const mobileSkill = $("#mobileSkill") as HTMLButtonElement;
const mobileInteract = $("#mobileInteract") as HTMLButtonElement;
const interactionHint = $("#interactionHint");
const interactionHintText = $("#interactionHintText");
const hitMarker = $("#hitMarker");
const damageFeed = $("#damageFeed");
const killcamCard = $("#killcamCard");
const killcamTitle = $("#killcamTitle");
const killcamDetail = $("#killcamDetail");
const flowCard = $("#flowCard");
const flowLabel = $("#flowLabel");
const flowText = $("#flowText");
const flowBar = $("#flowBar") as HTMLElement;
const focusTaskCard = $("#focusTaskCard");
const focusTaskLabel = $("#focusTaskLabel");
const focusTaskText = $("#focusTaskText");
const focusTaskMeta = $("#focusTaskMeta");
const focusTaskBar = $("#focusTaskBar") as HTMLElement;
const zoneStatus = $("#zoneStatus");
const zonePhase = $("#zonePhase");
const zoneTimer = $("#zoneTimer");
const zoneDistance = $("#zoneDistance");
const vehicleStatus = $("#vehicleStatus");
const vehicleHealth = $("#vehicleHealth");
const vehicleHealthBar = $("#vehicleHealthBar") as HTMLElement;
const vehicleRepairState = $("#vehicleRepairState");
const spectatorCard = $("#spectatorCard");
const spectatorLabel = $("#spectatorLabel");
const spectatorNext = $("#spectatorNext") as HTMLButtonElement;
const healthEl = $("#health");
const healthBar = $("#healthBar");
const ammoEl = $("#ammo");
const weaponRangeEl = $("#weaponRange");
const movementStatusEl = $("#movementStatus");
const latencyEl = $("#latency");
const blueScoreEl = $("#blueScore");
const redScoreEl = $("#redScore");
const playerCountEl = $("#playerCount");
const memberToggle = $("#memberToggle") as HTMLButtonElement;
const playerSlots = $("#playerSlots");
const scoreRows = $("#scoreRows");
const feedEl = $("#feed");
const chatMessagesEl = $("#chatMessages");
const chatForm = $("#chatForm") as HTMLFormElement;
const chatInput = $("#chatInput") as HTMLInputElement;
const mobileSensitivity = $("#mobileSensitivity") as HTMLInputElement;
const mobileFireSize = $("#mobileFireSize") as HTMLInputElement;
const mobileJumpOffset = $("#mobileJumpOffset") as HTMLInputElement;
const resultPanel = $("#resultPanel");
const resultTitle = $("#resultTitle");
const closeResult = $("#closeResult") as HTMLButtonElement;
const resultRows = $("#resultRows");
const resultProgress = $("#resultProgress");
const progressRank = $("#progressRank");
const progressMeter = $("#progressMeter") as HTMLElement;
const progressStats = $("#progressStats");
const progressHint = $("#progressHint");
const updateLogButton = $("#updateLogButton") as HTMLButtonElement;
const updateLogPanel = $("#updateLogPanel");
const closeUpdateLog = $("#closeUpdateLog") as HTMLButtonElement;
const toast = $("#toast");
const roundClock = $("#roundClock");
const modeLabel = $("#modeLabel");
const targetScoreText = document.querySelector<HTMLElement>(".score-orb strong");
const launchParams = new URLSearchParams(location.search);
const progressStorageKey = "donpachi-progress-v1";
const inventoryStorageKey = "donpachi-inventory-v1";
const loginStorageKey = "donpachi-login-id";
const inviteRoomStorageKey = "donpachi-last-invite-room";
const globalFpsRoomCode = "DONPCH";
const installInviteRequested = launchParams.get("install") === "1";
const invitePlayMode = launchParams.get("play") === "poker" ? "poker" : "fps";
const autoJoinInviteRequested = launchParams.get("join") === "1" || (installInviteRequested && Boolean(launchParams.get("room")));
let progressState = loadProgressState();
let profileInventory = loadProfileInventory();
let loggedInLoginId = sanitizeLoginId(localStorage.getItem(loginStorageKey) || "");
let profileSyncTimer = 0;
let applyingProfile = false;
let lastPokerRewardKey = "";

nameInput.value = sanitizeTextInput(localStorage.getItem("toybox-name"), 14, `Player${Math.floor(Math.random() * 90 + 10)}`).replace(/[<>]/g, "");
nameInput.addEventListener("input", () => {
  const name = sanitizeTextInput(nameInput.value, 14).replace(/[<>]/g, "");
  if (name) localStorage.setItem("toybox-name", name);
  scheduleProfileSync();
});
loginIdInput.value = loggedInLoginId;
loginIdInput.addEventListener("input", () => {
  const nextId = sanitizeLoginId(loginIdInput.value);
  if (loginIdInput.value !== nextId) loginIdInput.value = nextId;
});
const urlRoomCode = sanitizeRoomCode(launchParams.get("room") || "");
if (urlRoomCode) localStorage.setItem(inviteRoomStorageKey, urlRoomCode);
const initialRoomCode = urlRoomCode || (invitePlayMode === "poker" ? sanitizeRoomCode(localStorage.getItem(inviteRoomStorageKey) || "") : globalFpsRoomCode);
roomInput.value = initialRoomCode || globalFpsRoomCode;
roomInput.addEventListener("input", () => {
  const nextCode = sanitizeRoomCode(roomInput.value);
  if (roomInput.value !== nextCode) roomInput.value = nextCode;
});
renderProgressCard();

const publicBaseUrl = "https://toybox-fps-arena.onrender.com";

function runningInNativeShell() {
  const maybeCapacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(maybeCapacitor?.isNativePlatform?.()) || location.protocol === "capacitor:" || location.protocol === "ionic:";
}

function appHttpUrl(path: string) {
  return runningInNativeShell() ? new URL(path, publicBaseUrl).toString() : path;
}

function appWebSocketUrl() {
  const base = new URL(runningInNativeShell() ? publicBaseUrl : location.origin);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = "/ws";
  base.search = "";
  base.hash = "";
  return base.toString();
}

function publicShareUrl(room: string, play: "fps" | "poker" = "fps") {
  const url = new URL("/", publicBaseUrl);
  url.searchParams.set("room", play === "fps" ? globalFpsRoomCode : room);
  url.searchParams.set("install", "1");
  url.searchParams.set("join", "1");
  if (play === "poker") url.searchParams.set("play", "poker");
  return url.toString();
}

function inviteShareUrl(room: string, play: "fps" | "poker" = "fps") {
  if (runningInNativeShell()) return publicShareUrl(room, play);
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("room", play === "fps" ? globalFpsRoomCode : room);
  url.searchParams.set("install", "1");
  url.searchParams.set("join", "1");
  if (play === "poker") url.searchParams.set("play", "poker");
  return url.toString();
}

const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
const dynamicShadowsAllowed = new URLSearchParams(location.search).get("ultra") === "1"
  && !coarsePointerQuery.matches
  && navigator.maxTouchPoints === 0
  && window.innerWidth >= 900
  && (navigator.hardwareConcurrency || 4) >= 12;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setClearColor(0x77c7ff);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.96;
renderer.shadowMap.enabled = dynamicShadowsAllowed;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6fc7f7);
scene.fog = new THREE.Fog(0x9ed9f5, 116, 228);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 220);
camera.position.set(0, 1.6, 8);

const clock = new THREE.Clock();
const playerMeshes = new Map<string, THREE.Group>();
const tracers: { mesh: THREE.Group; life: number }[] = [];
const bulletDecals: { mesh: THREE.Mesh; expiresAt: number }[] = [];
const fireworks: { mesh: THREE.Points; velocities: THREE.Vector3[]; life: number }[] = [];
const donPunches = new Map<string, { mesh: THREE.Group; expiresAt: number; targetId: string }>();
const players = new Map<string, PlayerState>();
let pokerJoined = false;
let pokerSelfId = "";
let pokerRoomCode = "";
let pokerCpuCount = Number(localStorage.getItem("donpachi-poker-cpu") || "2") || 2;
let latestPokerSnapshot: PokerSnapshot | null = null;
const arenaObjects: THREE.Object3D[] = [];
const minimapBoxes: { x: number; z: number; w: number; h: number }[] = [];
const keys = new Set<string>();
const movementKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "Space"]);
const arenaHalfSize = 96;
const vehicleRepairStations = [
  { id: "repair-east", x: 52, z: -14, radius: 4.6 },
  { id: "repair-south", x: 0, z: 70, radius: 4.6 },
  { id: "repair-west", x: -52, z: 42, radius: 4.6 }
] as const;
const playerRadius = 0.24;
const jumpVelocity = 7.2;
const nameTagCanvasWidth = 256;
const nameTagCanvasHeight = 64;
type GunKind = "rifle" | "ak47" | "aug" | "smg" | "shotgun" | "marksman" | "awm" | "type95";
type Gun = {
  kind: GunKind;
  name: string;
  magSize: number;
  fireDelay: number;
  pelletCount: number;
  spread: number;
  range: number;
  recoilPitch: number;
  recoilYaw: number;
  recoilDrift: number;
  kick: number;
  tracerColor: number;
};
const guns: Gun[] = [
  { kind: "rifle", name: "AR", magSize: 30, fireDelay: 115, pelletCount: 1, spread: 0.006, range: 72, recoilPitch: 0.008, recoilYaw: 0.007, recoilDrift: 0.0008, kick: 0.2, tracerColor: 0xfff36b },
  { kind: "ak47", name: "AK47", magSize: 30, fireDelay: 135, pelletCount: 1, spread: 0.011, range: 78, recoilPitch: 0.016, recoilYaw: 0.015, recoilDrift: 0.0032, kick: 0.31, tracerColor: 0xffb347 },
  { kind: "aug", name: "AUG", magSize: 30, fireDelay: 118, pelletCount: 1, spread: 0.004, range: 86, recoilPitch: 0.005, recoilYaw: 0.004, recoilDrift: -0.0006, kick: 0.17, tracerColor: 0x78f5ff },
  { kind: "smg", name: "SMG", magSize: 40, fireDelay: 72, pelletCount: 1, spread: 0.014, range: 44, recoilPitch: 0.0045, recoilYaw: 0.014, recoilDrift: -0.0015, kick: 0.16, tracerColor: 0x44d7ff },
  { kind: "shotgun", name: "SG", magSize: 8, fireDelay: 520, pelletCount: 6, spread: 0.055, range: 26, recoilPitch: 0.042, recoilYaw: 0.026, recoilDrift: 0.004, kick: 0.48, tracerColor: 0xff8a3d },
  { kind: "marksman", name: "DMR", magSize: 12, fireDelay: 310, pelletCount: 1, spread: 0.002, range: 105, recoilPitch: 0.024, recoilYaw: 0.007, recoilDrift: -0.001, kick: 0.36, tracerColor: 0xdfff7a },
  { kind: "awm", name: "AWM", magSize: 5, fireDelay: 1180, pelletCount: 1, spread: 0.0008, range: 135, recoilPitch: 0.058, recoilYaw: 0.019, recoilDrift: 0.0024, kick: 0.64, tracerColor: 0xffffff },
  { kind: "type95", name: "95式", magSize: 30, fireDelay: 205, pelletCount: 3, spread: 0.007, range: 76, recoilPitch: 0.012, recoilYaw: 0.011, recoilDrift: 0.002, kick: 0.26, tracerColor: 0xff4dff }
];
let currentGunIndex = 0;
const currentGun = () => guns[currentGunIndex];
const isScopedGun = (gun = currentGun()) => gun.kind === "marksman" || gun.kind === "awm";
let soundEnabled = localStorage.getItem("toybox-sound") !== "off";
let customColor = localStorage.getItem("toybox-color") || "#1598f0";
let currentSkin: SkinId = (["rounded", "scout", "heavy", "bee"].includes(localStorage.getItem("toybox-skin") || "")
  ? localStorage.getItem("toybox-skin")
  : "rounded") as SkinId;
let audioContext: AudioContext | null = null;
let audioUnlocked = false;
let audioUnlocking: Promise<void> | null = null;
const lobbyBgm = new Audio("/audio/lobby-bgm.m4a");
lobbyBgm.loop = true;
lobbyBgm.preload = "auto";
lobbyBgm.volume = 0.38;
lobbyBgm.setAttribute("playsinline", "true");
syncAudioDataset();
const self = {
  id: "",
  room: "",
  joined: false,
  ready: false,
  health: maxHealth,
  ammo: guns[0].magSize,
  reserve: 999,
  yaw: 0,
  pitch: 0,
  velocity: new THREE.Vector3(),
  position: new THREE.Vector3(0, 1.6, 8),
  lastShot: 0,
  pingStarted: 0,
  latency: 0
};
const lastSafePosition = self.position.clone();
let creativeMode = false;

let socket: WebSocket | null = null;
let lastStateSent = 0;
let reloadTimer = 0;
let roundSeconds = 525;
let targetScore = 0;
let gameMode: GameMode = "oneLife";
let arenaChoice: ArenaId = "toybox";
let currentArena: ArenaId = "toybox";
let teamChoice: TeamChoice = (localStorage.getItem("toybox-team") as TeamChoice) || "auto";
let partySize: PartySize = ([1, 2, 4].includes(Number(localStorage.getItem("toybox-party-size"))) ? Number(localStorage.getItem("toybox-party-size")) : 1) as PartySize;
let cpuFillEnabled = localStorage.getItem("toybox-cpu-fill") !== "off";
let relationMode: RelationMode = localStorage.getItem("toybox-relation-mode") === "coop" ? "coop" : "versus";
let matchMaxPlayers = 20;
let celebrationUntil = 0;
let lastFireworkAt = 0;
let winnerName = "";
let celebrationSeenWinner = "";
let weaponView: THREE.Group | null = null;
let scoped = false;
let weaponKick = 0;
let weaponSwayClock = 0;
let muzzleFlashMesh: THREE.Group | null = null;
let muzzleFlashLight: THREE.PointLight | null = null;
let muzzleFlashUntil = 0;
let sunLight: THREE.DirectionalLight | null = null;
let dynamicShadowsEnabled = dynamicShadowsAllowed;
let shadowPerformanceDrops = 0;

const palette = {
  concrete: 0xe2e3df,
  white: 0xf3f4f1,
  blue: 0x177fd2,
  green: 0x78c943,
  yellow: 0xf3c83e,
  red: 0xe95d4c,
  orange: 0xe79a46,
  purple: 0x7568d8,
  cyan: 0x2fc4bf,
  dark: 0x24313a
};

const colliders: THREE.Box3[] = [];
type StairZone = {
  origin: THREE.Vector3;
  yaw: number;
  count: number;
  rise: number;
  run: number;
  width: number;
};
type SpiralStairZone = {
  center: THREE.Vector3;
  radius: number;
  width: number;
  startAngle: number;
  totalAngle: number;
  direction: number;
  count: number;
  rise: number;
  baseY: number;
};
const stairZones: StairZone[] = [];
const spiralStairZones: SpiralStairZone[] = [];
const walkSurfaces: { minX: number; maxX: number; minZ: number; maxZ: number; y: number }[] = [];
const trampolines: { x: number; z: number; radius: number; force: number }[] = [];
const trampolineBoostSteps = [1, 1.5, 2.5, 3.5, 5, 6, 8, 10];
let lastWDownAt = 0;
let sprintUntil = 0;
let trampolineBoostStep = 0;
let trampolineChainActive = false;
let lastRunSoundAt = 0;
let lastHudRenderedAt = 0;
let lastMinimapRenderedAt = 0;
let slotsSignature = "";
let scoreboardSignature = "";
let feedSignature = "";
let chatSignature = "";
let lastToastAt = 0;
let jumpQueued = false;
let lastDonPunchReady = false;
let flowScore = 0;
let flowCombo = 0;
let flowUntil = 0;
let lastFlowAt = 0;
let lastSelfKills = 0;
let lastSelfScore = 0;
let lastSelfHealth = maxHealth;
let shotNoiseBuffer: AudioBuffer | null = null;
let barrierMesh: THREE.Group | null = null;
let healthPickupMesh: THREE.Group | null = null;
const powerupMeshes = new Map<string, THREE.Group>();
const vehicleSnapshots = new Map<string, VehicleSnapshot>();
const vehicleMeshes = new Map<string, { group: THREE.Group; wheels: THREE.Mesh[]; wheelSpin: number; statusBeacon: THREE.Mesh }>();
const teamPingMeshes = new Map<string, { group: THREE.Group; expiresAt: number; snapshot: TeamPingSnapshot }>();
let safeZoneSnapshot: SafeZoneSnapshot = { enabled: false, phase: -1, stage: "inactive", x: 0, z: 0, radius: 92, nextRadius: 92, damage: 0, endsAt: 0 };
let safeZoneVisual: { group: THREE.Group; ring: THREE.Mesh; wall: THREE.Mesh } | null = null;
let serverClockOffsetMs = 0;
let lastSafeZonePhase = -1;
let wasOutsideSafeZone = false;
let wasVehicleRepairing = false;
const automaticDoors: { left: THREE.Mesh; right: THREE.Mesh; center: THREE.Vector3; closedLeftX: number; closedRightX: number; openness: number }[] = [];
let bulletHoleTexture: THREE.CanvasTexture | null = null;
let bulletHoleOwnMaterial: THREE.MeshBasicMaterial | null = null;
let bulletHoleOtherMaterial: THREE.MeshBasicMaterial | null = null;
let lastBulletDecalAt = 0;
const castleCoreMeshes = new Map<PlayerColor, THREE.Group>();
const castleCores = new Map<PlayerColor, CastleCoreSnapshot>();
let castleEndsAt = 0;
let desktopFiring = false;
let mobileFiring = false;
let mobileAimPointer: number | null = null;
let mobileAimLastX = 0;
let mobileAimLastY = 0;
let mobileAimVelocityX = 0;
let mobileAimVelocityY = 0;
let mobileStickPointer: number | null = null;
let mobileStickOriginX = 0;
let mobileStickOriginY = 0;
let mobileMoveIntensity = 0;
let mobileMoveX = 0;
let mobileMoveY = 0;
let mobileBraking = false;
let mobileFirePointer: number | null = null;
let mobileFireLastX = 0;
let mobileFireLastY = 0;
let mobileAimSensitivityValue = Number(localStorage.getItem("toybox-mobile-sensitivity") || "1");
let mobileFireSizeValue = Number(localStorage.getItem("toybox-mobile-fire-size") || "88");
let mobileJumpOffsetValue = Number(localStorage.getItem("toybox-mobile-jump-offset") || "128");
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let mobileGuideDismissed = localStorage.getItem("toybox-mobile-fullscreen-guide") === "off";
let killcamUntil = 0;
let spectatorTargetId = "";
let resultWinnerSeen = "";
let lobbyReturnTimer = 0;
let inviteAutoJoinStarted = false;
const remotePositionScratch = new THREE.Vector3();
const donPunchPositionScratch = new THREE.Vector3();
let lastStableViewportHeight = window.innerHeight;
let viewportRecoveryTimers: number[] = [];
let viewportRecoveryUntil = 0;
let activeVehicleId = "";
let nearestVehicleId = "";
let lastVehicleInputSent = 0;
let lastInteractionCheckAt = 0;

function viewportSize() {
  const visualViewport = window.visualViewport;
  const width = Math.round(window.innerWidth || visualViewport?.width || 1);
  const height = effectiveViewportHeight();
  return { width, height };
}

function textInputActive() {
  return document.activeElement instanceof HTMLElement && Boolean(document.activeElement.closest("input, textarea, [contenteditable='true']"));
}

function mobileKeyboardOpen() {
  return textInputActive() && viewportLooksKeyboardShrunk();
}

function viewportLooksKeyboardShrunk() {
  const visualViewport = window.visualViewport;
  if (!visualViewport) return false;
  const visualHeight = Math.round(visualViewport.height);
  return visualHeight < Math.round(lastStableViewportHeight) - 120 || visualHeight < Math.round(window.innerHeight) - 120;
}

function holdingStableViewportAfterKeyboard() {
  return !textInputActive() && performance.now() < viewportRecoveryUntil && viewportLooksKeyboardShrunk();
}

function effectiveViewportHeight() {
  const visualHeight = Math.round(window.visualViewport?.height || window.innerHeight || lastStableViewportHeight);
  if (mobileKeyboardOpen()) return visualHeight;
  if (holdingStableViewportAfterKeyboard()) return Math.max(1, Math.round(lastStableViewportHeight));
  return Math.max(1, Math.round(window.innerHeight || visualHeight || lastStableViewportHeight));
}

function isCoarsePointer() {
  return coarsePointerQuery.matches || navigator.maxTouchPoints > 0;
}

const maxPixelRatio = () => Math.min(window.devicePixelRatio, viewportSize().width < 860 ? 1.26 : 1.72);
const minPixelRatio = () => Math.min(maxPixelRatio(), viewportSize().width < 860 ? 1.0 : 1.15);
let activePixelRatio = maxPixelRatio();
let frameAverageMs = 16.7;
let measuredFps: number | null = null;
let fpsFrameCount = 0;
let fpsWindowStartedAt = 0;
let lastQualityCheckAt = 0;
let lastClockText = "";

renderer.setPixelRatio(activePixelRatio);

function gameModeLabel(mode: GameMode) {
  return mode === "oneLife" ? "ワンライフ" : mode === "practice" ? "練習" : mode === "life3" ? "ライフ3" : "城攻め";
}

function setGameMode(mode: GameMode) {
  gameMode = mode;
  if (mode === "castle" && !castleEndsAt) roundSeconds = 240;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
    button.classList.toggle("active", button.dataset.mode === mode);
  }
  modeLabel.textContent = "ゲームモード";
  if (targetScoreText) targetScoreText.textContent = mode === "oneLife" ? "1 LIFE" : mode === "practice" ? "PRACTICE" : mode === "life3" ? "LIFE" : "CASTLE";
}

function setTeamChoice(team: TeamChoice) {
  teamChoice = team === "blue" || team === "red" ? team : "auto";
  localStorage.setItem("toybox-team", teamChoice);
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-team]")) {
    button.classList.toggle("active", button.dataset.team === teamChoice);
  }
}

function setPartySize(size: number) {
  const nextPartySize = (size === 2 || size === 4 ? size : 1) as PartySize;
  const changed = partySize !== nextPartySize;
  partySize = nextPartySize;
  if (changed) localStorage.setItem("toybox-party-size", String(partySize));
  for (const button of partySelect.querySelectorAll<HTMLButtonElement>("[data-party]")) {
    button.classList.toggle("active", Number(button.dataset.party) === partySize);
  }
}

function setCpuFill(enabled: boolean) {
  cpuFillEnabled = enabled;
  localStorage.setItem("toybox-cpu-fill", enabled ? "on" : "off");
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-cpu-fill]")) {
    button.classList.toggle("active", button.dataset.cpuFill === (enabled ? "on" : "off"));
  }
}

function setRelationMode(mode: RelationMode | string) {
  relationMode = mode === "coop" ? "coop" : "versus";
  localStorage.setItem("toybox-relation-mode", relationMode);
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-relation]")) {
    button.classList.toggle("active", button.dataset.relation === relationMode);
  }
}

function normalizeSkinId(skin?: string): SkinId {
  return skin === "scout" || skin === "heavy" || skin === "bee" ? skin : "rounded";
}

function setSkin(skin: SkinId | string) {
  currentSkin = normalizeSkinId(skin);
  localStorage.setItem("toybox-skin", currentSkin);
  for (const button of skinSelect.querySelectorAll<HTMLButtonElement>("[data-skin]")) {
    button.classList.toggle("active", button.dataset.skin === currentSkin);
  }
  send({ type: "customize", cosmeticColor: customColor, skin: currentSkin });
  scheduleProfileSync();
}

function isHostPlayer() {
  return (nameInput.value.trim() || "プレイヤー") === "ひでお";
}

function requestRoomConfig(nextMode = gameMode, nextTeam = teamChoice, nextCpuFill = cpuFillEnabled, nextRelation = relationMode) {
  if (!self.joined) return false;
  if (!isHostPlayer()) {
    showToast("試合設定はホスト「ひでお」が変更できます。");
    setGameMode(gameMode);
    setTeamChoice(teamChoice);
    setCpuFill(cpuFillEnabled);
    setRelationMode(relationMode);
    return true;
  }
  send({ type: "set_room_config", gameMode: nextMode, team: nextTeam, cpuFill: nextCpuFill, relationMode: nextRelation });
  return true;
}

function setArenaChoice(arena: ArenaId) {
  arenaChoice = "toybox";
}

function emptyProgressState(): ProgressState {
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

function loadProgressState(): ProgressState {
  try {
    const parsed = JSON.parse(localStorage.getItem(progressStorageKey) || "{}") as Partial<ProgressState>;
    const base = emptyProgressState();
    return {
      xp: Math.max(0, Math.floor(Number(parsed.xp) || base.xp)),
      sessions: Math.max(0, Math.floor(Number(parsed.sessions) || base.sessions)),
      streakDays: Math.max(0, Math.floor(Number(parsed.streakDays) || base.streakDays)),
      lastPlayDate: typeof parsed.lastPlayDate === "string" ? parsed.lastPlayDate : base.lastPlayDate,
      bestScore: Math.max(0, Math.floor(Number(parsed.bestScore) || base.bestScore)),
      bestKills: Math.max(0, Math.floor(Number(parsed.bestKills) || base.bestKills)),
      pokerWins: Math.max(0, Math.floor(Number(parsed.pokerWins) || base.pokerWins)),
      lastReward: typeof parsed.lastReward === "string" ? parsed.lastReward.slice(0, 48) : base.lastReward
    };
  } catch {
    return emptyProgressState();
  }
}

function saveProgressState() {
  localStorage.setItem(progressStorageKey, JSON.stringify(progressState));
}

function emptyProfileInventory(): ProfileInventory {
  return {
    healPacks: 5,
    pokerDon: 2000,
    barrierCharges: 0,
    boostTickets: 0
  };
}

function normalizeInventory(inventory?: Partial<ProfileInventory>): ProfileInventory {
  const base = emptyProfileInventory();
  return {
    healPacks: THREE.MathUtils.clamp(Math.floor(Number(inventory?.healPacks ?? base.healPacks)), 0, 12),
    pokerDon: THREE.MathUtils.clamp(Math.floor(Number(inventory?.pokerDon ?? base.pokerDon)), 0, 999999),
    barrierCharges: THREE.MathUtils.clamp(Math.floor(Number(inventory?.barrierCharges ?? base.barrierCharges)), 0, 9),
    boostTickets: THREE.MathUtils.clamp(Math.floor(Number(inventory?.boostTickets ?? base.boostTickets)), 0, 99)
  };
}

function loadProfileInventory(): ProfileInventory {
  try {
    return normalizeInventory(JSON.parse(localStorage.getItem(inventoryStorageKey) || "{}"));
  } catch {
    return emptyProfileInventory();
  }
}

function saveProfileInventory() {
  localStorage.setItem(inventoryStorageKey, JSON.stringify(profileInventory));
}

function sanitizeLoginId(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 32);
}

function generateLoginId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const byte of bytes) id += alphabet[byte % alphabet.length];
  return id;
}

function normalizeProgressState(progress?: Partial<ProgressState>): ProgressState {
  const base = emptyProgressState();
  return {
    xp: Math.max(0, Math.floor(Number(progress?.xp) || base.xp)),
    sessions: Math.max(0, Math.floor(Number(progress?.sessions) || base.sessions)),
    streakDays: Math.max(0, Math.floor(Number(progress?.streakDays) || base.streakDays)),
    lastPlayDate: typeof progress?.lastPlayDate === "string" ? progress.lastPlayDate : base.lastPlayDate,
    bestScore: Math.max(0, Math.floor(Number(progress?.bestScore) || base.bestScore)),
    bestKills: Math.max(0, Math.floor(Number(progress?.bestKills) || base.bestKills)),
    pokerWins: Math.max(0, Math.floor(Number(progress?.pokerWins) || base.pokerWins)),
    lastReward: typeof progress?.lastReward === "string" ? progress.lastReward.slice(0, 48) : base.lastReward
  };
}

function currentProfilePayload() {
  return {
    loginId: loggedInLoginId,
    name: sanitizePlayerNameInput(),
    skin: currentSkin,
    cosmeticColor: customColor,
    progress: progressState,
    inventory: profileInventory
  };
}

function applyLoginProfile(profile: LoginProfile) {
  applyingProfile = true;
  const nextName = sanitizeTextInput(profile.name, 14, nameInput.value).replace(/[<>]/g, "");
  if (nextName) {
    nameInput.value = nextName;
    localStorage.setItem("toybox-name", nextName);
  }
  if (profile.skin) setSkin(profile.skin);
  if (profile.cosmeticColor && /^#[0-9a-f]{6}$/i.test(profile.cosmeticColor)) setCustomColor(profile.cosmeticColor);
  if (profile.progress) {
    progressState = normalizeProgressState(profile.progress);
    saveProgressState();
  }
  if (profile.inventory) {
    profileInventory = normalizeInventory(profile.inventory);
    saveProfileInventory();
  }
  applyingProfile = false;
  renderProgressCard(`ログイン済み / 回復${profileInventory.healPacks}個`);
}

async function requestProfile(mode: "create" | "login" | "save") {
  const loginId = sanitizeLoginId(loginIdInput.value || loggedInLoginId);
  loginIdInput.value = loginId;
  if (loginId.length < 6) {
    showToast("ログインIDは6文字以上で、英数字・_・-だけ使えます");
    loginIdInput.focus();
    return null;
  }
  const response = await fetch(appHttpUrl("/api/profile"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...currentProfilePayload(), loginId, mode })
  });
  const data = await response.json().catch(() => null) as { ok?: boolean; message?: string; profile?: LoginProfile } | null;
  if (!response.ok || !data?.ok || !data.profile) {
    showToast(data?.message || "ログインに失敗しました");
    return null;
  }
  loggedInLoginId = loginId;
  localStorage.setItem(loginStorageKey, loginId);
  loginStatus.textContent = `ログイン中 Lv.${data.profile.level || 1}`;
  applyLoginProfile(data.profile);
  return data.profile;
}

function scheduleProfileSync(delay = 650) {
  if (!loggedInLoginId || applyingProfile) return;
  window.clearTimeout(profileSyncTimer);
  profileSyncTimer = window.setTimeout(() => {
    void requestProfile("save").catch(() => undefined);
    send({ type: "profile_progress", progress: progressState, inventory: profileInventory });
  }, delay);
}

function todayInJapan() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function dayNumber(date: string) {
  const stamp = Date.parse(`${date}T00:00:00+09:00`);
  return Number.isFinite(stamp) ? Math.floor(stamp / 86_400_000) : 0;
}

function progressInfo() {
  const level = Math.floor(Math.sqrt(progressState.xp / 120)) + 1;
  const previous = Math.max(0, (level - 1) * (level - 1) * 120);
  const next = level * level * 120;
  const titles = ["ルーキー", "ハチ見習い", "アリーナ常連", "ドンパチ職人", "首領蜂候補", "都市伝説"];
  const title = titles[Math.min(titles.length - 1, Math.floor((level - 1) / 3))];
  const progress = next > previous ? (progressState.xp - previous) / (next - previous) : 1;
  return { level, title, previous, next, progress: THREE.MathUtils.clamp(progress, 0, 1) };
}

function renderProgressCard(note = "") {
  const info = progressInfo();
  const remaining = Math.max(0, info.next - progressState.xp);
  progressRank.textContent = `${info.title} Lv.${info.level}`;
  progressMeter.style.width = `${Math.round(info.progress * 100)}%`;
  progressStats.textContent = `連続 ${progressState.streakDays}日 / 最高 ${progressState.bestScore}pt ${progressState.bestKills}K / 回復${profileInventory.healPacks} / ${profileInventory.pokerDon}Don`;
  progressHint.textContent = note || (progressState.lastReward ? `${progressState.lastReward} / 次まで ${remaining}XP` : `次のランクまで ${remaining}XP`);
  if (loggedInLoginId) loginStatus.textContent = `ログイン中 Lv.${info.level}`;
}

function touchProgressSession(kind: "fps" | "poker") {
  const today = todayInJapan();
  if (progressState.lastPlayDate !== today) {
    const diff = dayNumber(today) - dayNumber(progressState.lastPlayDate);
    progressState.streakDays = diff === 1 ? progressState.streakDays + 1 : 1;
    progressState.lastPlayDate = today;
  }
  progressState.sessions += 1;
  progressState.lastReward = kind === "poker" ? "ポーカー卓に着席" : "アリーナ出撃";
  saveProgressState();
  renderProgressCard();
  scheduleProfileSync();
}

function awardProgressXp(amount: number, reason: string) {
  const gained = Math.max(0, Math.round(amount));
  if (!gained) return { gained: 0, leveled: false, level: progressInfo().level };
  const before = progressInfo().level;
  progressState.xp += gained;
  progressState.lastReward = `+${gained}XP ${reason}`;
  saveProgressState();
  const after = progressInfo().level;
  renderProgressCard();
  scheduleProfileSync();
  return { gained, leveled: after > before, level: after };
}

function resultProgressHtml(reward: { gained: number; leveled: boolean; level: number; reason: string }) {
  if (!reward.gained) return "";
  const info = progressInfo();
  const levelText = reward.leveled ? `ランクアップ Lv.${reward.level}` : `${info.title} Lv.${info.level}`;
  const remaining = Math.max(0, info.next - progressState.xp);
  return `<strong>+${reward.gained}XP ${escapeHtml(reward.reason)} / ${escapeHtml(levelText)}</strong><span>次のランクまで ${remaining}XP。連続 ${progressState.streakDays}日プレイ中。</span>`;
}

function awardRoundProgress(winner: string, rows: PlayerState[]) {
  const me = rows.find((player) => player.id === self.id);
  if (!me) return { gained: 0, leveled: false, level: progressInfo().level, reason: "" };
  const won = winner.includes(me.name)
    || (winner.includes("青") && me.color === "blue")
    || (winner.includes("赤") && me.color === "red")
    || winner.includes(me.color === "blue" ? "Blue" : "Red");
  progressState.bestScore = Math.max(progressState.bestScore, Math.round(me.score || 0));
  progressState.bestKills = Math.max(progressState.bestKills, Math.round(me.kills || 0));
  const gained = Math.min(280, 28 + (me.kills || 0) * 18 + (me.score || 0) * 5 + Math.floor((me.hits || 0) * 2) + Math.floor((me.damageDealt || 0) / 90) + (won ? 52 : 0));
  const reward = awardProgressXp(gained, won ? "勝利ボーナス" : "バトル完走");
  return { ...reward, reason: won ? "勝利ボーナス" : "バトル完走" };
}

function awardPokerProgress(snapshot: PokerSnapshot) {
  if (snapshot.stage !== "showdown" || !snapshot.showdown) return;
  const winner = snapshot.showdown.winners.find((item) => item.id === snapshot.selfId);
  if (!winner) return;
  const key = `${snapshot.room}:${snapshot.community.join("")}:${snapshot.pot}:${winner.id}:${winner.amount}`;
  if (key === lastPokerRewardKey) return;
  lastPokerRewardKey = key;
  progressState.pokerWins += 1;
  const reward = awardProgressXp(Math.min(180, 42 + Math.floor(winner.amount / 22)), "ポーカー勝利");
  if (reward.gained) showToast(`+${reward.gained}XP ポーカー勝利`);
}

function trackArenaObject<T extends THREE.Object3D>(object: T) {
  arenaObjects.push(object);
  scene.add(object);
  return object;
}

function clearArenaObjects() {
  for (const vehicle of vehicleMeshes.values()) scene.remove(vehicle.group);
  vehicleMeshes.clear();
  vehicleSnapshots.clear();
  for (const ping of teamPingMeshes.values()) disposeGroup(ping.group);
  teamPingMeshes.clear();
  automaticDoors.length = 0;
  activeVehicleId = "";
  nearestVehicleId = "";
  for (const object of arenaObjects.splice(0)) {
    scene.remove(object);
    object.traverse((child) => {
      const mesh = child as THREE.Mesh | THREE.Line | THREE.Points;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) {
        for (const item of material) item.dispose();
      } else {
        material?.dispose();
      }
    });
  }
  colliders.length = 0;
  minimapBoxes.length = 0;
  stairZones.length = 0;
  spiralStairZones.length = 0;
  walkSurfaces.length = 0;
  trampolines.length = 0;
  barrierMesh = null;
  healthPickupMesh = null;
  powerupMeshes.clear();
  castleCoreMeshes.clear();
  castleCores.clear();
}

function switchArena(arena: ArenaId) {
  const nextArena = "toybox";
  if (currentArena === nextArena && arenaObjects.length > 0) return;
  clearArenaObjects();
  currentArena = nextArena;
  addToyboxArena();
  lastSafePosition.copy(self.position);
}

function makeMaterial(color: number, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: roughness < 0.55 ? 0.16 : 0.04 });
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createConcreteTexture(seed: number, base: string, repeatX: number, repeatY: number) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 512;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext("2d")!;
  const random = seededRandom(seed);
  context.fillStyle = base;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

  for (let i = 0; i < 1800; i += 1) {
    const light = random() > 0.56;
    const alpha = 0.026 + random() * 0.088;
    const shade = light ? 255 : 54 + Math.floor(random() * 30);
    context.fillStyle = `rgba(${shade},${shade},${shade},${alpha})`;
    const size = 0.8 + random() * 2.1;
    context.fillRect(random() * 512, random() * 512, size, size);
  }

  context.lineWidth = 1;
  context.strokeStyle = "rgba(47,62,72,0.12)";
  for (let i = 0; i <= 512; i += 128) {
    context.beginPath();
    context.moveTo(i + random() * 5 - 2.5, 0);
    context.lineTo(i + random() * 5 - 2.5, 512);
    context.moveTo(0, i + random() * 5 - 2.5);
    context.lineTo(512, i + random() * 5 - 2.5);
    context.stroke();
  }

  context.strokeStyle = "rgba(38,52,63,0.1)";
  for (let i = 0; i < 22; i += 1) {
    const startX = random() * 512;
    const startY = random() * 512;
    context.beginPath();
    context.moveTo(startX, startY);
    for (let j = 0; j < 3; j += 1) {
      context.lineTo(startX + (random() - 0.5) * 80, startY + (random() - 0.5) * 80);
    }
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
}

function createGrainTexture(seed: number) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d")!;
  const random = seededRandom(seed);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  for (let i = 0; i < 640; i += 1) {
    const alpha = 0.025 + random() * 0.052;
    const value = random() > 0.48 ? 255 : 52;
    context.fillStyle = `rgba(${value},${value},${value},${alpha})`;
    context.fillRect(random() * 256, random() * 256, 1 + random() * 1.6, 1 + random() * 1.6);
  }
  context.strokeStyle = "rgba(255,255,255,0.18)";
  context.lineWidth = 4;
  context.strokeRect(8, 8, 240, 240);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.8, 1.8);
  texture.anisotropy = 4;
  return texture;
}

function makeTexturedMaterial(color: number, texture: THREE.Texture, roughness = 0.82, bumpScale = 0) {
  const material = makeMaterial(color, roughness);
  material.map = texture;
  if (bumpScale > 0) {
    material.bumpMap = texture;
    material.bumpScale = bumpScale;
  }
  material.needsUpdate = true;
  return material;
}

const blockGrainTexture = createGrainTexture(7403);
const floorTexture = createConcreteTexture(3111, "#d4d6d3", 24, 24);
const wallTexture = createConcreteTexture(5119, "#e3e4e1", 3.4, 3.4);

const materials = {
  floor: makeTexturedMaterial(0xe8e9e6, floorTexture, 0.92, 0.036),
  wall: makeTexturedMaterial(0xf3f4f1, wallTexture, 0.84, 0.058),
  blue: makeTexturedMaterial(palette.blue, blockGrainTexture, 0.72, 0.024),
  green: makeTexturedMaterial(palette.green, blockGrainTexture, 0.72, 0.024),
  yellow: makeTexturedMaterial(palette.yellow, blockGrainTexture, 0.72, 0.024),
  red: makeTexturedMaterial(palette.red, blockGrainTexture, 0.78, 0.018),
  orange: makeTexturedMaterial(palette.orange, blockGrainTexture, 0.78, 0.018),
  purple: makeTexturedMaterial(palette.purple, blockGrainTexture, 0.78, 0.018),
  cyan: makeTexturedMaterial(palette.cyan, blockGrainTexture, 0.78, 0.018),
  dark: makeMaterial(0x1b252d, 0.58),
  metal: makeMaterial(0x46515a, 0.34),
  rubber: makeMaterial(0x10161b, 0.72),
  light: new THREE.MeshBasicMaterial({ color: 0xfff0a8 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x8bd7ff, roughness: 0.2, metalness: 0.02, transparent: true, opacity: 0.34 })
};
const shadowMaterial = new THREE.MeshBasicMaterial({
  color: 0x07121d,
  transparent: true,
  opacity: dynamicShadowsEnabled ? 0.08 : 0.2,
  depthWrite: false
});

function addLights() {
  scene.add(new THREE.HemisphereLight(0xdff3ff, 0x61705d, 1.22));
  const sun = new THREE.DirectionalLight(0xfff1d0, 3.15);
  sun.position.set(42, 72, 36);
  sun.castShadow = dynamicShadowsEnabled;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -72;
  sun.shadow.camera.right = 72;
  sun.shadow.camera.top = 72;
  sun.shadow.camera.bottom = -72;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 180;
  sun.shadow.bias = -0.0007;
  sun.shadow.normalBias = 0.035;
  sun.target.position.set(0, 0, 0);
  scene.add(sun.target);
  scene.add(sun);
  sunLight = sun;
  const rim = new THREE.DirectionalLight(0x7cc9ff, 0.32);
  rim.position.set(-28, 18, -32);
  scene.add(rim);
}

function addSoftShadow(name: string, position: [number, number, number], scale: [number, number, number]) {
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(1.2, scale[0] * 1.12), Math.max(1.2, scale[2] * 1.12)), shadowMaterial);
  shadow.name = `${name} shadow`;
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(position[0] + 0.38, 0.018, position[2] + 0.44);
  trackArenaObject(shadow);
}

function addBox(
  name: string,
  position: [number, number, number],
  scale: [number, number, number],
  material: THREE.Material,
  collidable = true
) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(scale[0], scale[1], scale[2]), material);
  box.name = name;
  box.position.set(position[0], position[1], position[2]);
  box.castShadow = dynamicShadowsEnabled
    && !material.transparent
    && Math.abs(position[0]) <= 62
    && Math.abs(position[2]) <= 62
    && scale[1] >= 2.2
    && scale[0] * scale[2] >= 14;
  box.receiveShadow = true;
  trackArenaObject(box);
  if (collidable && scale[1] > 1.2 && scale[0] * scale[2] > 10) addSoftShadow(name, position, scale);
  if (collidable) {
    const collider = new THREE.Box3().setFromObject(box);
    colliders.push(collider);
    minimapBoxes.push({
      x: position[0],
      z: position[2],
      w: scale[0],
      h: scale[2]
    });
  }
  return box;
}

function hexToRgba(hex: string, alpha: number) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red},${green},${blue},${alpha})`;
}

function createSplatTexture(seed: number, color: string, smile = false) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d")!;
  const random = seededRandom(seed);
  context.clearRect(0, 0, 256, 256);
  context.fillStyle = hexToRgba(color, 0.92);
  context.beginPath();
  context.arc(128, 132, 58, 0, Math.PI * 2);
  context.fill();

  for (let i = 0; i < 28; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = 28 + random() * 76;
    const radius = 5 + random() * 21;
    const x = 128 + Math.cos(angle) * distance;
    const y = 128 + Math.sin(angle) * distance;
    context.fillStyle = hexToRgba(color, 0.58 + random() * 0.34);
    context.beginPath();
    context.ellipse(x, y, radius * (0.65 + random() * 0.75), radius, angle, 0, Math.PI * 2);
    context.fill();
  }

  context.globalCompositeOperation = "source-over";
  context.strokeStyle = "rgba(255,255,255,0.34)";
  context.lineWidth = 7;
  context.beginPath();
  context.arc(128, 132, 69, 0.18, Math.PI * 1.82);
  context.stroke();

  if (smile) {
    context.strokeStyle = "rgba(17,24,39,0.72)";
    context.lineWidth = 10;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(94, 110);
    context.lineTo(96, 110);
    context.moveTo(158, 110);
    context.lineTo(160, 110);
    context.stroke();
    context.beginPath();
    context.arc(128, 132, 32, 0.18, Math.PI - 0.18);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createArrowTexture(seed: number, color: string) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d")!;
  const random = seededRandom(seed);
  context.clearRect(0, 0, 256, 256);
  context.shadowColor = "rgba(0,0,0,0.2)";
  context.shadowBlur = 7;
  context.shadowOffsetY = 6;
  context.fillStyle = hexToRgba(color, 0.94);
  context.beginPath();
  context.moveTo(128, 22);
  context.lineTo(224, 116);
  context.lineTo(174, 116);
  context.lineTo(174, 224);
  context.lineTo(82, 224);
  context.lineTo(82, 116);
  context.lineTo(32, 116);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "rgba(255,255,255,0.22)";
  for (let i = 0; i < 24; i += 1) {
    context.fillRect(54 + random() * 148, 58 + random() * 136, 1 + random() * 4, 1 + random() * 4);
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createGlyphTexture(glyph: string, seed: number, color = "#ffffff", shadow = true) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d")!;
  const random = seededRandom(seed);
  context.clearRect(0, 0, 256, 256);
  if (shadow) {
    context.shadowColor = "rgba(0,0,0,0.2)";
    context.shadowBlur = 8;
    context.shadowOffsetY = 7;
  }
  context.fillStyle = hexToRgba(color, 0.95);
  context.font = "900 164px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(glyph, 128, 134);
  context.shadowBlur = 0;
  context.strokeStyle = "rgba(255,255,255,0.24)";
  context.lineWidth = 8;
  context.strokeRect(24, 24, 208, 208);
  context.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 22; i += 1) {
    context.fillRect(48 + random() * 160, 42 + random() * 168, 2 + random() * 4, 2 + random() * 4);
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createDropTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 128;
  textureCanvas.height = 128;
  const context = textureCanvas.getContext("2d")!;
  context.clearRect(0, 0, 128, 128);
  context.fillStyle = "rgba(255,255,255,0.72)";
  context.beginPath();
  context.moveTo(64, 18);
  context.bezierCurveTo(88, 50, 98, 70, 98, 88);
  context.bezierCurveTo(98, 112, 78, 122, 64, 122);
  context.bezierCurveTo(50, 122, 30, 112, 30, 88);
  context.bezierCurveTo(30, 70, 40, 50, 64, 18);
  context.fill();
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFlagTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 160;
  const context = textureCanvas.getContext("2d")!;
  context.clearRect(0, 0, 256, 160);
  context.fillStyle = "#78c946";
  context.fillRect(0, 0, 256, 160);
  context.fillStyle = "rgba(255,255,255,0.88)";
  context.beginPath();
  context.arc(92, 60, 11, 0, Math.PI * 2);
  context.arc(162, 60, 11, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.9)";
  context.lineWidth = 13;
  context.lineCap = "round";
  context.beginPath();
  context.arc(128, 74, 42, 0.18, Math.PI - 0.18);
  context.stroke();
  context.fillStyle = "rgba(255,255,255,0.22)";
  context.fillRect(0, 0, 256, 12);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeDecalMaterial(texture: THREE.Texture, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
}

const decalTextures = {
  greenSmile: createSplatTexture(1021, "#93e43c", true),
  yellowSplat: createSplatTexture(2047, "#ffc928"),
  blueSplat: createSplatTexture(3037, "#1598f0"),
  redSplat: createSplatTexture(4073, "#ff5757"),
  whiteArrow: createArrowTexture(5077, "#f8fbff"),
  yellowArrow: createArrowTexture(6089, "#ffd43d"),
  whiteA: createGlyphTexture("A", 7013),
  whiteX: createGlyphTexture("X", 8011),
  whiteCheck: createGlyphTexture("✓", 9011),
  drop: createDropTexture(),
  flagSmile: createFlagTexture()
};

function addWallDecal(name: string, position: [number, number, number], yaw: number, texture: THREE.Texture, width: number, height: number, opacity = 1) {
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(width, height), makeDecalMaterial(texture, opacity));
  decal.name = name;
  decal.position.set(position[0], position[1], position[2]);
  decal.rotation.y = yaw;
  trackArenaObject(decal);
  return decal;
}

function addGroundDecal(name: string, x: number, z: number, texture: THREE.Texture, width: number, height: number, rotation = 0, opacity = 0.92) {
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(width, height), makeDecalMaterial(texture, opacity));
  decal.name = name;
  decal.position.set(x, 0.038, z);
  decal.rotation.set(-Math.PI / 2, 0, rotation);
  trackArenaObject(decal);
  return decal;
}

function addWalkSurface(position: [number, number, number], scale: [number, number, number]) {
  walkSurfaces.push({
    minX: position[0] - scale[0] / 2,
    maxX: position[0] + scale[0] / 2,
    minZ: position[2] - scale[2] / 2,
    maxZ: position[2] + scale[2] / 2,
    y: position[1] + scale[1] / 2 + 1.6
  });
}

function addTrampoline(name: string, x: number, z: number, radius = 2.2, force = 13.8) {
  trampolines.push({ x, z, radius, force });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.18, 12), makeMaterial(0xff4dff, 0.45));
  pad.name = name;
  pad.position.set(x, 0.1, z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.08, 6, 16), materials.yellow);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, 0.24, z);
  trackArenaObject(pad);
  trackArenaObject(ring);
}

function addBarrierPowerup() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.16, 10), materials.glass);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48, 0), new THREE.MeshBasicMaterial({ color: 0x77f7ff }));
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.045, 5, 12), materials.cyan);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.035, 5, 10), materials.yellow);
  ringA.rotation.x = Math.PI / 2;
  ringB.rotation.z = Math.PI / 2;
  core.position.y = 0.78;
  ringA.position.y = 0.35;
  ringB.position.y = 0.78;
  group.add(base, core, ringA, ringB);
  group.position.set(-88, 0.16, 82);
  trackArenaObject(group);
  barrierMesh = group;
}

function addHealthPickupMesh() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 1.1), makeMaterial(0xffffff, 0.5));
  const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.72, 0.14), new THREE.MeshBasicMaterial({ color: 0x93e43c }));
  const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.26, 0.14), new THREE.MeshBasicMaterial({ color: 0x93e43c }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.045, 6, 14), materials.green);
  base.position.y = 0.18;
  vertical.position.y = 0.72;
  horizontal.position.y = 0.72;
  ring.position.y = 0.08;
  ring.rotation.x = Math.PI / 2;
  group.add(base, vertical, horizontal, ring);
  group.visible = false;
  trackArenaObject(group);
  healthPickupMesh = group;
}

function powerupColor(kind: PowerupKind) {
  if (kind === "speed") return 0x44d7ff;
  if (kind === "ammo") return 0xffd23a;
  if (kind === "damage") return 0xff4d4d;
  return 0xff4dff;
}

function createPowerupMesh(kind: PowerupKind) {
  const color = powerupColor(kind);
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.72, 0.12, 12), makeMaterial(0xffffff, 0.5));
  const coreGeometry = kind === "ammo"
    ? new THREE.BoxGeometry(0.58, 0.42, 0.58)
    : kind === "speed"
      ? new THREE.ConeGeometry(0.42, 0.82, 5)
      : kind === "damage"
        ? new THREE.OctahedronGeometry(0.48, 0)
        : new THREE.IcosahedronGeometry(0.52, 1);
  const core = new THREE.Mesh(coreGeometry, new THREE.MeshBasicMaterial({ color }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.04, 6, 16), makeMaterial(color, 0.46));
  base.position.y = 0.12;
  core.position.y = 0.72;
  ring.position.y = 0.42;
  ring.rotation.x = Math.PI / 2;
  group.add(base, core, ring);
  group.visible = false;
  trackArenaObject(group);
  return group;
}

function createCastleCoreMesh(team: PlayerColor) {
  const group = new THREE.Group();
  const baseMaterial = team === "blue" ? materials.blue : materials.red;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.8, 0.46, 24), baseMaterial);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 2.18, 0.32, 24), materials.wall);
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.38, 2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18, metalness: 0.16, emissive: 0xffffff, emissiveIntensity: 0.22 })
  );
  const glow = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.62, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, wireframe: true })
  );
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.075, 8, 28), team === "blue" ? materials.cyan : materials.orange);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(2.32, 0.045, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.46 })
  );
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.46, 4.4, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, depthWrite: false })
  );
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 8), materials.dark);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.54, 0.08), baseMaterial);
  base.position.y = 0.21;
  plinth.position.y = 0.62;
  core.position.y = 1.82;
  glow.position.y = 1.82;
  ring.position.y = 1.8;
  halo.position.y = 0.92;
  beam.position.y = 2.75;
  ring.rotation.x = Math.PI / 2;
  halo.rotation.x = Math.PI / 2;
  mast.position.set(-1.45, 1.44, 0);
  flag.position.set(-0.92, 2.35, 0);
  group.add(base, plinth, core, glow, ring, halo, beam, mast, flag);
  group.visible = false;
  trackArenaObject(group);
  return group;
}

function updateCastleCores(snapshot?: Record<PlayerColor, CastleCoreSnapshot>) {
  castleCores.clear();
  for (const team of ["blue", "red"] as PlayerColor[]) {
    const core = snapshot?.[team];
    let mesh = castleCoreMeshes.get(team);
    if (!mesh) {
      mesh = createCastleCoreMesh(team);
      castleCoreMeshes.set(team, mesh);
    }
    if (!core || gameMode !== "castle") {
      mesh.visible = false;
      continue;
    }
    castleCores.set(team, core);
    mesh.visible = true;
    mesh.position.set(core.x, 0, core.z);
    const healthRatio = Math.max(0, Math.min(1, core.health / Math.max(1, core.maxHealth)));
    mesh.scale.setScalar(0.82 + healthRatio * 0.18);
    mesh.children[2].visible = core.health > 0;
    mesh.children[3].visible = core.health > 0;
    mesh.children[6].visible = core.health > 0;
    mesh.children[2].rotation.y += 0.045;
    mesh.children[3].rotation.y -= 0.03;
    mesh.children[4].rotation.z += 0.025;
    ((mesh.children[3] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.08 + healthRatio * 0.18;
    ((mesh.children[6] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.05 + healthRatio * 0.12;
  }
}

function addRealismDetails() {
  const detail = new THREE.Object3D();
  const roadLineMaterial = new THREE.MeshBasicMaterial({ color: 0xb9c1c6 });
  const roadLines = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.08, 188), roadLineMaterial, 22);
  let lineIndex = 0;
  for (let x = -90; x <= 90; x += 18) {
    detail.position.set(x, 0.012, 0);
    detail.rotation.set(-Math.PI / 2, 0, 0);
    detail.updateMatrix();
    roadLines.setMatrixAt(lineIndex, detail.matrix);
    lineIndex += 1;
  }
  for (let z = -90; z <= 90; z += 18) {
    detail.position.set(0, 0.014, z);
    detail.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    detail.updateMatrix();
    roadLines.setMatrixAt(lineIndex, detail.matrix);
    lineIndex += 1;
  }
  roadLines.instanceMatrix.needsUpdate = true;
  trackArenaObject(roadLines);

  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x243847 });
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.52, 0.34), windowMaterial, 320);
  let windowIndex = 0;
  const addWindowFace = (
    x: number,
    y: number,
    z: number,
    columns: number,
    rows: number,
    spacingX: number,
    spacingY: number,
    face: "north" | "south" | "east" | "west"
  ) => {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (windowIndex >= windows.count) return;
        const offsetX = (column - (columns - 1) / 2) * spacingX;
        const offsetY = row * spacingY;
        if (face === "north" || face === "south") {
          detail.position.set(x + offsetX, y + offsetY, z);
          detail.rotation.set(0, face === "north" ? Math.PI : 0, 0);
        } else {
          detail.position.set(x, y + offsetY, z + offsetX);
          detail.rotation.set(0, face === "east" ? Math.PI / 2 : -Math.PI / 2, 0);
        }
        detail.updateMatrix();
        windows.setMatrixAt(windowIndex, detail.matrix);
        windowIndex += 1;
      }
    }
  };
  addWindowFace(-23, 1.8, -20.45, 4, 5, 1.25, 1.05, "south");
  addWindowFace(24, 2.1, 27.04, 5, 5, 1.2, 1.1, "north");
  addWindowFace(2, 1.8, -25.22, 7, 4, 1.35, 1.05, "south");
  addWindowFace(37, 2.1, -30.22, 3, 7, 1.05, 1.18, "south");
  addWindowFace(-47, 2.2, 2.54, 3, 8, 1.0, 1.18, "north");
  addWindowFace(56, 2.0, 56.54, 3, 5, 1.0, 1.1, "north");
  addWindowFace(-34, 1.7, 36.04, 7, 3, 1.35, 1.0, "north");
  addWindowFace(54, 1.7, -48.94, 7, 3, 1.35, 1.0, "south");
  addWindowFace(-36, 1.9, -31.45, 6, 4, 1.16, 1.02, "south");
  addWindowFace(35, 1.9, 31.45, 5, 4, 1.18, 1.04, "north");
  addWindowFace(18, 1.7, -52.94, 7, 3, 1.22, 0.98, "south");
  addWindowFace(-16, 2.0, 56.55, 5, 4, 1.18, 1.04, "north");
  addWindowFace(47.52, 2.0, -44, 3, 5, 0.92, 1.02, "west");
  addWindowFace(-49.52, 2.0, 0, 3, 7, 0.92, 1.02, "east");
  addWindowFace(0, 5.0, -82.45, 7, 12, 1.1, 1.45, "south");
  addWindowFace(-79, 4.5, -68.75, 6, 10, 1.25, 1.45, "north");
  addWindowFace(78, 5.0, 69.25, 5, 11, 1.25, 1.45, "south");
  addWindowFace(72, 1.8, -49.75, 7, 2, 1.25, 0.92, "north");
  addWindowFace(-72, 1.8, 49.75, 7, 2, 1.25, 0.92, "south");
  windows.instanceMatrix.needsUpdate = true;
  trackArenaObject(windows);

  const ventMaterial = new THREE.MeshBasicMaterial({ color: 0x6c757c });
  const vents = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 0.28, 0.5), ventMaterial, 30);
  for (let i = 0; i < vents.count; i += 1) {
    const angle = i * 1.71;
    detail.position.set(Math.sin(angle) * 74, 0.17, Math.cos(angle * 0.8) * 74);
    detail.rotation.set(0, angle, 0);
    detail.updateMatrix();
    vents.setMatrixAt(i, detail.matrix);
  }
  vents.instanceMatrix.needsUpdate = true;
  trackArenaObject(vents);

  const roofProps = new THREE.InstancedMesh(new THREE.BoxGeometry(1.05, 0.44, 0.78), materials.metal, 36);
  for (let i = 0; i < roofProps.count; i += 1) {
    const roof = [
      [-12.8, 12.28, 23],
      [8.2, 13.88, -24],
      [25.2, 10.73, 0],
      [36, 12.93, -33],
      [-47, 15.02, 0],
      [56, 10.62, 54],
      [18, 5.35, -55],
      [-16, 6.45, 54],
      [54, 4.84, -52]
    ][i % 9];
    const offset = (i % 4) - 1.5;
    detail.position.set(roof[0] + offset * 1.08, roof[1], roof[2] + Math.sin(i * 1.7) * 1.65);
    detail.rotation.set(0, i * 0.83, 0);
    detail.updateMatrix();
    roofProps.setMatrixAt(i, detail.matrix);
  }
  roofProps.instanceMatrix.needsUpdate = true;
  trackArenaObject(roofProps);

  const railMaterial = new THREE.MeshBasicMaterial({ color: 0xdfe7ec });
  const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), railMaterial, 56);
  const railCenters: Array<[number, number, number, number]> = [
    [-12.8, 12.42, 25.65, 0],
    [-12.8, 12.42, 20.35, 0],
    [8.2, 14.02, -21.35, 0],
    [8.2, 14.02, -26.65, 0],
    [36, 13.08, -29.8, 0],
    [36, 13.08, -36.2, 0],
    [-47, 15.18, 2.65, 0],
    [-47, 15.18, -2.65, 0]
  ];
  let railIndex = 0;
  for (const [x, y, z, yaw] of railCenters) {
    for (let i = -3; i <= 3 && railIndex < rails.count; i += 1) {
      detail.position.set(x + i * 1.15, y, z);
      detail.rotation.set(0, yaw, 0);
      detail.updateMatrix();
      rails.setMatrixAt(railIndex, detail.matrix);
      railIndex += 1;
    }
  }
  rails.instanceMatrix.needsUpdate = true;
  trackArenaObject(rails);

  const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xfff0a8 });
  const laneLights = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.08, 0.28), lightMaterial, 48);
  for (let i = 0; i < laneLights.count; i += 1) {
    const along = -54 + (i % 24) * 4.7;
    const side = i < 24 ? -1 : 1;
    detail.position.set(along, 0.035, side * 35);
    detail.rotation.set(0, i * 0.4, 0);
    detail.updateMatrix();
    laneLights.setMatrixAt(i, detail.matrix);
  }
  laneLights.instanceMatrix.needsUpdate = true;
  trackArenaObject(laneLights);

  const poleMaterial = new THREE.MeshBasicMaterial({ color: 0x2a343c });
  const lampPoles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.055, 2.9, 6), poleMaterial, 44);
  const lampHeads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.44, 0.16, 0.32), lightMaterial, 44);
  for (let i = 0; i < 44; i += 1) {
    const axis = i % 2 === 0;
    const lane = -84 + Math.floor(i / 2) * 8;
    const side = i % 4 < 2 ? -1 : 1;
    detail.position.set(axis ? lane : side * 37, 1.45, axis ? side * 37 : lane);
    detail.rotation.set(0, axis ? 0 : Math.PI / 2, 0);
    detail.updateMatrix();
    lampPoles.setMatrixAt(i, detail.matrix);
    detail.position.y = 2.96;
    detail.updateMatrix();
    lampHeads.setMatrixAt(i, detail.matrix);
  }
  lampPoles.instanceMatrix.needsUpdate = true;
  lampHeads.instanceMatrix.needsUpdate = true;
  trackArenaObject(lampPoles);
  trackArenaObject(lampHeads);

  const carMaterial = new THREE.MeshStandardMaterial({ color: 0x273746, roughness: 0.64, metalness: 0.1 });
  const parkedCars = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.78, 4.1), carMaterial, 24);
  for (let i = 0; i < parkedCars.count; i += 1) {
    const row = i % 2 === 0 ? -1 : 1;
    const x = -82 + (i % 12) * 14.4;
    const z = row * (i % 3 === 0 ? 70 : 84);
    detail.position.set(x, 0.43, z);
    detail.rotation.set(0, row > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
    detail.updateMatrix();
    parkedCars.setMatrixAt(i, detail.matrix);
  }
  parkedCars.instanceMatrix.needsUpdate = true;
  trackArenaObject(parkedCars);
}

function addOpenCityBuilding(prefix: string, x: number, z: number, w: number, d: number, h: number, material: THREE.Material, accent: THREE.Material) {
  addBox(`${prefix} floor`, [x, 0.04, z], [w, 0.12, d], materials.floor, false);
  addBox(`${prefix} roof`, [x, h + 0.12, z], [w, 0.24, d], materials.metal, false);
  addBox(`${prefix} back wall`, [x, h / 2, z - d / 2], [w, h, 0.5], material);
  addBox(`${prefix} front wall left`, [x - w * 0.33, h / 2, z + d / 2], [w * 0.34, h, 0.5], material);
  addBox(`${prefix} front wall right`, [x + w * 0.33, h / 2, z + d / 2], [w * 0.34, h, 0.5], material);
  addBox(`${prefix} west wall`, [x - w / 2, h / 2, z], [0.5, h, d], material);
  addBox(`${prefix} east wall`, [x + w / 2, h / 2, z], [0.5, h, d], material);
  addBox(`${prefix} rear color rail`, [x, h * 0.58, z - d / 2 + 0.28], [w * 0.74, 0.3, 0.08], accent, false);
  addBox(`${prefix} entry lintel`, [x, h - 0.72, z + d / 2 - 0.28], [w * 0.34, 0.38, 0.08], accent, false);
  addBox(`${prefix} inner route stripe`, [x, 0.08, z + d * 0.08], [w * 0.55, 0.035, 0.58], accent, false);
  addBox(`${prefix} left low room wall`, [x - w * 0.22, 0.88, z + d * 0.06], [0.34, 1.76, d * 0.42], materials.wall, false);
  addBox(`${prefix} right low room wall`, [x + w * 0.22, 0.88, z + d * 0.06], [0.34, 1.76, d * 0.42], materials.wall, false);
  addBox(`${prefix} ceiling light`, [x, h - 0.38, z + d * 0.04], [w * 0.54, 0.08, 0.14], materials.light, false);
  addBox(`${prefix} lobby desk`, [x, 0.48, z + d * 0.16], [w * 0.42, 0.76, 1.1], accent, false);
  addBox(`${prefix} inner column a`, [x - w * 0.25, 1.45, z - d * 0.12], [0.8, 2.9, 0.8], materials.dark);
  addBox(`${prefix} inner column b`, [x + w * 0.25, 1.45, z - d * 0.12], [0.8, 2.9, 0.8], materials.dark);
  addWalkSurface([x, h + 0.12, z], [w, 0.24, d]);
}

function addDetailBox(name: string, position: [number, number, number], scale: [number, number, number], material: THREE.Material, yaw = 0) {
  const mesh = addBox(name, position, scale, material, false);
  mesh.rotation.y = yaw;
  return mesh;
}

function addReferenceBarrel(name: string, x: number, z: number, yaw = 0, collidable = false) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 1.55, 22), materials.blue);
  shell.position.y = 0.78;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 22), materials.dark);
  top.position.y = 1.6;
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 22), materials.dark);
  bottom.position.y = 0.04;
  group.add(shell, top, bottom);
  for (const y of [0.46, 1.02, 1.45]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.035, 6, 20), materials.metal);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    group.add(ring);
  }
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.52), makeDecalMaterial(decalTextures.drop, 0.86));
  mark.position.set(0, 0.82, 0.805);
  group.add(mark);
  trackArenaObject(group);
  addSoftShadow(name, [x, 0.78, z], [1.6, 1.55, 1.6]);
  if (collidable) {
    colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.92, 0, z - 0.92), new THREE.Vector3(x + 0.92, 1.6, z + 0.92)));
    minimapBoxes.push({ x, z, w: 1.84, h: 1.84 });
  }
}

function addRailingRun(name: string, start: [number, number, number], count: number, spacing: number, yaw: number) {
  const forward = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
  for (let i = 0; i < count; i += 1) {
    const x = start[0] + forward.x * spacing * i;
    const z = start[2] + forward.z * spacing * i;
    addDetailBox(`${name} post ${i}`, [x, start[1] + 0.42, z], [0.08, 0.84, 0.08], materials.metal);
  }
  const length = Math.max(0.4, (count - 1) * spacing + 0.58);
  const rail = addDetailBox(`${name} rail`, [
    start[0] + forward.x * spacing * (count - 1) / 2,
    start[1] + 0.83,
    start[2] + forward.z * spacing * (count - 1) / 2
  ], [length, 0.08, 0.08], materials.metal, -yaw);
  rail.rotation.y = -yaw;
}

function addSpiralStairs(
  name: string,
  center: [number, number, number],
  count: number,
  radius: number,
  rise: number,
  startAngle: number,
  turnAngle: number,
  width = 2.25
) {
  const direction = Math.sign(turnAngle) || 1;
  const totalAngle = Math.abs(turnAngle);
  const baseY = center[1];
  spiralStairZones.push({
    center: new THREE.Vector3(center[0], center[1], center[2]),
    radius,
    width,
    startAngle,
    totalAngle,
    direction,
    count,
    rise,
    baseY
  });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, baseY + count * rise + 0.62, 10), materials.metal);
  pole.name = `${name} pole`;
  pole.position.set(center[0], (baseY + count * rise + 0.62) / 2, center[2]);
  trackArenaObject(pole);

  for (let i = 0; i < count; i += 1) {
    const progress = (i + 0.5) / count;
    const angle = startAngle + direction * totalAngle * progress;
    const x = center[0] + Math.cos(angle) * radius;
    const z = center[2] + Math.sin(angle) * radius;
    const y = baseY + rise * i + rise / 2;
    const material = i % 3 === 0 ? materials.wall : i % 3 === 1 ? materials.blue : materials.green;
    const step = addBox(`${name} step ${i}`, [x, y, z], [width, rise, 0.92], material, false);
    step.rotation.y = -angle;

    const outerX = center[0] + Math.cos(angle) * (radius + width * 0.56);
    const outerZ = center[2] + Math.sin(angle) * (radius + width * 0.56);
    addDetailBox(`${name} outer post ${i}`, [outerX, y + rise * 0.65, outerZ], [0.08, 0.88, 0.08], materials.metal, -angle);
    if (i % 2 === 0) {
      const innerX = center[0] + Math.cos(angle) * Math.max(0.38, radius - width * 0.52);
      const innerZ = center[2] + Math.sin(angle) * Math.max(0.38, radius - width * 0.52);
      addDetailBox(`${name} inner post ${i}`, [innerX, y + rise * 0.56, innerZ], [0.07, 0.72, 0.07], materials.metal, -angle);
    }
  }
}

function addInstancedTowerSpiral(name: string, center: [number, number, number], floors = 4, floorHeight = 5.5) {
  const stepsPerFloor = 14;
  const rise = floorHeight / stepsPerFloor;
  const radius = 2.35;
  const width = 1.86;
  const totalAngle = Math.PI * 1.82;
  const totalSteps = floors * stepsPerFloor;
  const stepMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(width, rise, 0.84), materials.green, totalSteps);
  stepMesh.name = `${name} steps`;
  const postCount = Math.ceil(totalSteps / 2);
  const postMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.055, 0.94, 6), materials.metal, postCount);
  postMesh.name = `${name} rail posts`;
  const dummy = new THREE.Object3D();
  let stepIndex = 0;
  let postIndex = 0;
  let startAngle = -Math.PI * 0.78;

  for (let floor = 0; floor < floors; floor += 1) {
    const baseY = center[1] + floor * floorHeight;
    spiralStairZones.push({
      center: new THREE.Vector3(center[0], baseY, center[2]),
      radius,
      width,
      startAngle,
      totalAngle,
      direction: 1,
      count: stepsPerFloor,
      rise,
      baseY
    });
    for (let step = 0; step < stepsPerFloor; step += 1) {
      const progress = (step + 0.5) / stepsPerFloor;
      const angle = startAngle + totalAngle * progress;
      const y = baseY + rise * step + rise / 2;
      dummy.position.set(center[0] + Math.cos(angle) * radius, y, center[2] + Math.sin(angle) * radius);
      dummy.rotation.set(0, -angle, 0);
      dummy.updateMatrix();
      stepMesh.setMatrixAt(stepIndex, dummy.matrix);
      stepIndex += 1;
      if (step % 2 === 0) {
        dummy.position.set(
          center[0] + Math.cos(angle) * (radius + width * 0.56),
          y + rise * 0.72 + 0.4,
          center[2] + Math.sin(angle) * (radius + width * 0.56)
        );
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        postMesh.setMatrixAt(postIndex, dummy.matrix);
        postIndex += 1;
      }
    }
    startAngle += totalAngle;
  }
  stepMesh.instanceMatrix.needsUpdate = true;
  postMesh.instanceMatrix.needsUpdate = true;
  stepMesh.receiveShadow = true;
  trackArenaObject(stepMesh);
  trackArenaObject(postMesh);

  const poleHeight = floors * floorHeight + 0.45;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, poleHeight, 10), materials.metal);
  pole.name = `${name} center pole`;
  pole.position.set(center[0], center[1] + poleHeight / 2, center[2]);
  trackArenaObject(pole);
}

function addAutomaticSlidingDoor(name: string, center: [number, number, number]) {
  const left = addDetailBox(`${name} left`, [center[0] - 1.35, center[1], center[2]], [2.55, 2.9, 0.1], materials.glass);
  const right = addDetailBox(`${name} right`, [center[0] + 1.35, center[1], center[2]], [2.55, 2.9, 0.1], materials.glass);
  addDetailBox(`${name} header`, [center[0], center[1] + 1.62, center[2] - 0.04], [6.2, 0.28, 0.32], materials.metal);
  addDetailBox(`${name} left frame`, [center[0] - 3.05, center[1], center[2] - 0.04], [0.18, 3.18, 0.3], materials.metal);
  addDetailBox(`${name} right frame`, [center[0] + 3.05, center[1], center[2] - 0.04], [0.18, 3.18, 0.3], materials.metal);
  automaticDoors.push({
    left,
    right,
    center: new THREE.Vector3(...center),
    closedLeftX: left.position.x,
    closedRightX: right.position.x,
    openness: 0
  });
}

function addAuroraTower() {
  const x = 74;
  const z = -22;
  const h = 22;
  addBox("aurora tower rear wall", [x, h / 2, z - 10], [20, h, 0.5], materials.wall);
  addBox("aurora tower front west", [67.6, h / 2, z + 10], [7.2, h, 0.5], materials.wall);
  addBox("aurora tower front east", [80.4, h / 2, z + 10], [7.2, h, 0.5], materials.wall);
  addBox("aurora tower west wall", [x - 10, h / 2, z], [0.5, h, 20], materials.wall);
  addBox("aurora tower east wall", [x + 10, h / 2, z], [0.5, h, 20], materials.wall);
  addBox("aurora lobby floor", [x, 0.04, z], [19.5, 0.12, 19.5], materials.floor, false);

  for (let level = 1; level <= 4; level += 1) {
    const floorY = level * 5.5 + 0.05;
    const floorMaterial = level === 4 ? materials.metal : materials.floor;
    const slabs: Array<{ position: [number, number, number]; scale: [number, number, number] }> = [
      { position: [65.025, floorY, z], scale: [1.55, 0.22, 19.5] },
      { position: [78.175, floorY, z], scale: [11.15, 0.22, 19.5] },
      { position: [69.2, floorY, -29.675], scale: [6.8, 0.22, 4.15] },
      { position: [69.2, floorY, -16.525], scale: [6.8, 0.22, 8.55] }
    ];
    for (const [slabIndex, slab] of slabs.entries()) {
      addBox(`aurora floor ${level}-${slabIndex}`, slab.position, slab.scale, floorMaterial, false);
      addWalkSurface(slab.position, slab.scale);
    }
    if (level < 4) {
      addDetailBox(`aurora level band ${level}`, [x, floorY + 0.16, z + 9.73], [19.2, 0.16, 0.08], level % 2 ? materials.green : materials.blue);
    }
  }

  for (let level = 0; level < 4; level += 1) {
    const windowY = 2.25 + level * 5.5;
    for (const offset of [-6.8, -2.3, 2.3, 6.8]) {
      addDetailBox(`aurora rear window ${level}-${offset}`, [x + offset, windowY, z - 9.72], [3.5, 2.7, 0.08], materials.glass);
    }
    addDetailBox(`aurora west window ${level}`, [x - 9.72, windowY, z + 2.8], [0.08, 2.7, 5.2], materials.glass);
    addDetailBox(`aurora east window ${level}`, [x + 9.72, windowY, z - 2.8], [0.08, 2.7, 5.2], materials.glass);
    addDetailBox(`aurora light ${level}`, [x, level * 5.5 + 5.12, z + 1.2], [8.4, 0.06, 0.18], materials.light);
  }

  addBox("aurora reception", [x + 3.6, 0.52, z + 4.3], [5.2, 0.9, 1.3], materials.blue);
  addDetailBox("aurora reception top", [x + 3.6, 1.01, z + 4.3], [5.4, 0.12, 1.5], materials.metal);
  addBox("aurora lift bank", [x + 5.7, 1.55, z - 9.68], [5.8, 3.1, 0.12], materials.dark);
  addDetailBox("aurora route stripe", [x - 2.4, 0.09, z + 2.6], [0.5, 0.04, 11], materials.green);
  addInstancedTowerSpiral("aurora spiral", [x - 4.8, 0.08, z - 2.2], 4, 5.5);
  addAutomaticSlidingDoor("aurora auto door", [x, 1.48, z + 10.28]);
  addSign("AURORA TOWER", [x, 3.85, z + 10.32], Math.PI, "#177fd2");
  addWallDecal("aurora lobby mural", [x, 2.45, z - 9.7], Math.PI, decalTextures.greenSmile, 5.6, 3.5, 0.78);
}

function addMetroAtrium() {
  const x = -48;
  const z = -24;
  const w = 14;
  const d = 8;
  const h = 5.2;
  addBox("metro atrium floor", [x, 0.04, z], [w, 0.12, d], materials.floor, false);
  addBox("metro atrium roof", [x, h + 0.12, z], [w + 0.8, 0.24, d + 0.8], materials.cyan, false);
  addBox("metro atrium back wall", [x, h / 2, z - d / 2], [w, h, 0.5], materials.wall);
  addBox("metro atrium front wall left", [x - 4.8, h / 2, z + d / 2], [4.4, h, 0.5], materials.wall);
  addBox("metro atrium front wall right", [x + 4.8, h / 2, z + d / 2], [4.4, h, 0.5], materials.wall);
  addBox("metro atrium west wall", [x - w / 2, h / 2, z], [0.5, h, d], materials.wall);
  addBox("metro atrium east wall", [x + w / 2, h / 2, z], [0.5, h, d], materials.wall);
  addBox("metro atrium rear blue rail", [x, 3.6, z - d / 2 + 0.28], [w - 1.2, 0.34, 0.08], materials.blue, false);
  addBox("metro atrium rear green rail", [x, 1.18, z - d / 2 + 0.3], [w - 1.6, 0.26, 0.08], materials.green, false);
  addBox("metro atrium entry yellow lintel", [x, 4.36, z + d / 2 - 0.28], [4.6, 0.42, 0.08], materials.yellow, false);
  addBox("metro atrium upper deck", [x + 2.15, 3.08, z - 0.55], [5.5, 0.26, 4.7], materials.wall, false);
  addBox("metro atrium upper deck stripe", [x + 2.15, 3.25, z + 1.88], [5.6, 0.16, 0.1], materials.blue, false);
  addBox("metro atrium under glow", [x - 1.1, 2.78, z + 0.68], [7.5, 0.08, 0.12], materials.light, false);
  addBox("metro atrium route stripe", [x - 0.8, 0.09, z + 0.35], [8.6, 0.04, 0.58], materials.green, false);
  addBox("metro atrium side bench a", [x - 4.9, 0.38, z - 1.8], [2.7, 0.44, 0.68], materials.blue, false);
  addBox("metro atrium side bench b", [x + 4.7, 0.38, z + 1.55], [2.9, 0.44, 0.68], materials.yellow, false);
  addBox("metro atrium service core", [x - 1.7, 1.35, z + 2.65], [0.9, 2.7, 0.9], materials.dark);
  addWalkSurface([x, h + 0.12, z], [w + 0.8, 0.24, d + 0.8]);
  addWalkSurface([x + 2.15, 3.08, z - 0.55], [5.5, 0.26, 4.7]);
  addSpiralStairs("metro indoor spiral", [x - 3.4, 0.08, z - 0.2], 12, 1.92, 0.43, -Math.PI * 0.88, Math.PI * 1.58, 2.3);
  addRailingRun("metro roof north guard", [x - 5.8, h + 0.42, z - d / 2 - 0.2], 10, 1.25, 0);
  addRailingRun("metro roof south guard", [x - 5.8, h + 0.42, z + d / 2 + 0.2], 10, 1.25, 0);
  addRailingRun("metro deck guard", [x + 0.2, 3.34, z + 1.9], 5, 1.1, 0);
  addWallDecal("metro interior smile mural", [x, 2.08, z - d / 2 + 0.035], Math.PI, decalTextures.greenSmile, 5.6, 3.6, 0.86);
}

function addStripedRampDetails() {
  for (let i = -2; i <= 2; i += 1) {
    const stripe = addDetailBox(`reference ramp stripe ${i}`, [17.2 + i * 0.62, 1.32, 9.22 + i * 0.18], [0.38, 0.035, 3.35], materials.wall);
    stripe.rotation.x = -0.45;
    stripe.rotation.y = -0.03;
  }
  addDetailBox("reference ramp side shadow", [18, 0.72, 12.0], [6.1, 0.08, 0.2], materials.dark);
}

function addFacadeDetails() {
  addDetailBox("smile wall blue cap", [-18, 2.78, -6.34], [8.2, 0.26, 0.08], materials.blue);
  addDetailBox("smile wall green base", [-18, 0.18, -6.33], [8.8, 0.34, 0.09], materials.green);
  addDetailBox("mid wall blue stripe", [-3.9, 1.8, 3.13], [4.4, 0.34, 0.08], materials.blue);
  addDetailBox("market yellow inset", [9, 2.05, 29.15], [4.2, 0.72, 0.08], materials.yellow);
  addDetailBox("control door dark", [8, 0.92, -5.08], [1.12, 1.84, 0.09], materials.dark);
  addDetailBox("control door trim", [8, 1.88, -5.04], [1.22, 0.16, 0.08], materials.wall);
  addDetailBox("blue block louver backing", [22.96, 1.92, -4], [0.08, 2.25, 1.22], materials.dark);
  for (let i = -2; i <= 2; i += 1) {
    addDetailBox(`blue block louver ${i}`, [23.01, 1.92 + i * 0.33, -4], [0.09, 0.08, 1.16], materials.metal);
  }
  addDetailBox("yellow cube bevel top", [6.5, 1.63, 5], [4.16, 0.1, 4.16], materials.wall);
  addDetailBox("yellow cube lower shadow", [6.5, 0.08, 7.03], [4.05, 0.16, 0.08], materials.dark);
}

function addFlagTowerDetails() {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 3.2, 8), materials.metal);
  pole.position.set(7.2, 5.86, -7.4);
  trackArenaObject(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.18), makeDecalMaterial(decalTextures.flagSmile, 0.98));
  flag.position.set(8.18, 6.76, -7.4);
  flag.rotation.y = Math.PI / 2;
  trackArenaObject(flag);
  addRailingRun("green roof north", [5.85, 4.47, -9.9], 5, 0.6, 0);
  addRailingRun("green roof east", [10.4, 4.47, -9.2], 5, 0.6, Math.PI / 2);
  addDetailBox("green roof antenna base", [8.8, 4.56, -6.1], [0.5, 0.28, 0.5], materials.metal);
  addDetailBox("green roof vent", [6.2, 4.58, -6.0], [0.72, 0.32, 0.46], materials.dark);
}

function addReferenceArenaDressing() {
  addReferenceBarrel("blue barrel proxy", -10, 11, Math.PI * 0.12, true);
  addReferenceBarrel("front blue barrel", -13.2, -3.4, Math.PI * 0.2, false);
  addReferenceBarrel("back blue barrel", 14.8, -4.2, -Math.PI * 0.16, false);
  addFacadeDetails();
  addFlagTowerDetails();
  addStripedRampDetails();
  addGroundDecal("left foreground paint puddle", -18.2, -3.2, decalTextures.greenSmile, 6.4, 5.5, 0.26, 0.5);
  addGroundDecal("yellow floor marking", 8.8, 8.5, decalTextures.yellowSplat, 5.2, 3.4, -0.12, 0.42);
  addWallDecal("near smile wall", [-18, 1.46, -6.31], 0, decalTextures.greenSmile, 7.4, 4.7, 0.94);
  addWallDecal("metro front left smile panel", [-52.8, 1.68, -19.72], 0, decalTextures.greenSmile, 3.15, 2.65, 0.78);
  addWallDecal("metro front right blue panel", [-43.2, 1.62, -19.72], 0, decalTextures.blueSplat, 3.05, 2.5, 0.72);
  addDetailBox("metro front blue band left", [-52.8, 2.74, -19.70], [3.9, 0.26, 0.08], materials.blue);
  addDetailBox("metro front blue band right", [-43.2, 2.74, -19.70], [3.9, 0.26, 0.08], materials.blue);
  addDetailBox("metro front green base left", [-52.8, 0.2, -19.69], [4.2, 0.32, 0.08], materials.green);
  addDetailBox("metro front green base right", [-43.2, 0.2, -19.69], [4.2, 0.32, 0.08], materials.green);
  addWallDecal("yellow block x mark", [6.5, 1.04, 7.04], 0, decalTextures.whiteX, 2.3, 2.1, 0.88);
  addWallDecal("blue block a mark", [20, 2.0, 0.05], 0, decalTextures.whiteA, 3.35, 3.15, 0.9);
  addWallDecal("green tower check mark", [5.57, 2.46, -7.5], -Math.PI / 2, decalTextures.whiteCheck, 2.15, 2.15, 0.82);
  addDetailBox("spawn smile wall green base", [-36.06, 0.2, 6], [0.08, 0.34, 9.5], materials.green);
  addWallDecal("spawn side smile wall", [-36.03, 1.02, 6], Math.PI / 2, decalTextures.greenSmile, 4.2, 3.1, 0.86);
}

function addToyboxVisualDecals() {
  addWallDecal("north smile mural", [-18, 2.25, -95.94], 0, decalTextures.greenSmile, 8.2, 6.2, 0.92);
  addWallDecal("north yellow mural", [16, 2.0, -95.93], 0, decalTextures.yellowSplat, 5.8, 4.8, 0.82);
  addWallDecal("south blue mural", [38, 2.05, 95.94], Math.PI, decalTextures.blueSplat, 6.4, 5.1, 0.82);
  addWallDecal("west red mural", [-95.94, 2.0, -34], Math.PI / 2, decalTextures.redSplat, 5.6, 4.7, 0.76);
  addWallDecal("east green mural", [95.94, 2.1, 28], -Math.PI / 2, decalTextures.greenSmile, 5.9, 4.9, 0.76);
  addWallDecal("blue block arrow", [20, 2.05, 0.06], 0, decalTextures.whiteArrow, 3.7, 3.7, 0.86);
  addWallDecal("green tower arrow", [10.46, 2.6, -7.5], Math.PI / 2, decalTextures.yellowArrow, 2.8, 2.8, 0.88);
  addWallDecal("south deck arrow", [-7.8, 4.6, 88.48], Math.PI, decalTextures.whiteArrow, 3.4, 3.4, 0.78);
  addGroundDecal("center green splat", -7, -4, decalTextures.greenSmile, 7.2, 7.2, -0.45, 0.66);
  addGroundDecal("center yellow splat", 12, 7, decalTextures.yellowSplat, 5.2, 5.2, 0.72, 0.68);
  addGroundDecal("lane blue splat", -28, 8, decalTextures.blueSplat, 4.4, 4.4, 0.34, 0.62);
  addGroundDecal("outer red splat", 44, -28, decalTextures.redSplat, 5.8, 5.8, -0.2, 0.58);
}

function addVehicleRepairStation(station: (typeof vehicleRepairStations)[number]) {
  const group = new THREE.Group();
  group.name = station.id;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(station.radius - 0.72, station.radius - 0.28, 32),
    new THREE.MeshBasicMaterial({ color: 0x65f2a0, transparent: true, opacity: 0.68, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.024;
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(station.radius - 0.82, 32),
    new THREE.MeshStandardMaterial({ color: 0x173a35, roughness: 0.74, metalness: 0.18 })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.012;
  const crossMaterial = new THREE.MeshBasicMaterial({ color: 0xd8ffe5, transparent: true, opacity: 0.92 });
  const crossA = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.035, 2.7), crossMaterial);
  const crossB = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.035, 0.72), crossMaterial);
  crossA.position.y = 0.045;
  crossB.position.y = 0.046;
  group.add(pad, ring, crossA, crossB);
  group.position.set(station.x, 0, station.z);
  trackArenaObject(group);
}

function addToyboxArena() {
  addBox("floor", [0, -0.05, 0], [194, 0.1, 194], materials.floor, false);
  for (const station of vehicleRepairStations) addVehicleRepairStation(station);

  addBox("north wall", [0, 1.2, -96.5], [194, 2.4, 1], materials.wall);
  addBox("south wall", [0, 1.2, 96.5], [194, 2.4, 1], materials.wall);
  addBox("west wall", [-96.5, 1.2, 0], [1, 2.4, 194], materials.wall);
  addBox("east wall", [96.5, 1.2, 0], [1, 2.4, 194], materials.wall);

  addBox("green tower", [8, 2.1, -7.5], [4.8, 4.2, 4.8], materials.green);
  addBox("blue block right", [20, 1.7, -4], [5.8, 3.4, 8], materials.blue);
  addBox("white left cover", [-18, 1.4, -8], [9, 2.8, 3.2], materials.wall);
  addBox("white mid cover", [-4, 1.1, 1.5], [5, 2.2, 3.2], materials.wall);
  addBox("yellow low cover", [6.5, 0.8, 5], [4, 1.6, 4], materials.yellow);
  addBox("green ramp landing", [18, 0.9, 15], [8, 1.8, 5], materials.green);
  addBox("white back cover", [-7, 1.5, -22], [8, 3, 3], materials.wall);
  addBox("yellow side cube", [-22, 0.8, 18], [3.8, 1.6, 3.8], materials.yellow);
  addBox("blue lane marker", [0, 0.55, -15], [4.5, 1.1, 2], materials.blue);
  addBox("green far cover", [20, 1.1, 21], [5, 2.2, 3.5], materials.green);
  addBox("blue left lane", [-24, 1.2, 5], [3, 2.4, 9], materials.blue);
  addBox("yellow center bridge", [13, 0.8, -18], [7, 1.6, 3], materials.yellow);
  addBox("white side wall break", [-2, 1.2, 23], [11, 2.4, 2.8], materials.wall);
  addBox("apartment block a", [-23, 3.6, -23], [7, 7.2, 5], materials.wall);
  addBox("apartment block b", [24, 4.4, 24], [8, 8.8, 6], materials.blue);
  addBox("control building", [2, 3.2, -27], [12, 6.4, 3.5], materials.green);
  addBox("warehouse", [-18, 2.7, 25], [11, 5.4, 5], materials.yellow);
  addBox("market hall", [9, 2.4, 27], [9, 4.8, 4.2], materials.wall);
  addBox("red kiosk", [-28, 1.6, -9], [3.4, 3.2, 6.5], materials.wall);
  addBox("blue watch post", [27, 2.8, 8], [3.8, 5.6, 5.2], materials.blue);
  addBox("green office", [-11, 2.3, -27], [7.5, 4.6, 3.6], materials.green);
  addBox("yellow garage", [28, 1.45, -23], [5.2, 2.9, 8.4], materials.yellow);
  addBox("white courtyard block", [-28, 1.2, 27], [5.8, 2.4, 5.8], materials.wall);
  addBox("high tower north", [-6, 6, 27], [4.8, 12, 4.8], materials.blue);
  addBox("high tower south", [15, 6.8, -28], [5.2, 13.6, 4.4], materials.green);
  addBox("sky stair landing north", [-6, 3.45, 20], [5.4, 0.5, 4.2], materials.wall);
  addBox("sky stair landing south", [15, 3.7, -20], [5.6, 0.5, 4.2], materials.wall);
  addBox("roof bridge block", [3, 4.2, 21.5], [6, 0.7, 2.4], materials.green);
  addBox("tall service core", [29, 5.2, 0], [3.4, 10.4, 4.6], materials.wall);
  addBox("north roof deck", [-12.8, 11.9, 23], [4.2, 0.35, 5.2], materials.green, false);
  addBox("south roof deck", [8.2, 13.5, -24], [4.2, 0.35, 5.2], materials.yellow, false);
  addBox("service roof deck", [25.2, 10.35, 0], [4.4, 0.35, 5.6], materials.blue, false);
  addBox("glass lookout", [-27, 6.4, 3], [4.2, 12.8, 4.2], materials.glass);
  addBox("lookout roof deck", [-23, 12.75, 3], [5.2, 0.35, 4.8], materials.green, false);
  addBox("new south depot", [2, 2.3, -7], [5.2, 4.6, 4.2], materials.wall);
  addBox("new west scaffold", [-15, 2.6, 2], [4.2, 5.2, 4.2], materials.yellow);
  addBox("new east bunker", [23.5, 1.35, -18], [5, 2.7, 3.8], materials.green);
  addBox("orange refinery", [-36, 2.8, -34], [9, 5.6, 5], materials.blue);
  addBox("purple data tower", [37, 6.2, -33], [5.5, 12.4, 5.5], materials.cyan);
  addBox("cyan hangar", [-34, 2.2, 33], [12, 4.4, 6], materials.cyan);
  addBox("red gatehouse", [35, 2.6, 34], [8, 5.2, 5], materials.wall);
  addBox("white clinic", [-2, 2.1, 39], [10, 4.2, 4.6], materials.wall);
  addBox("orange low maze a", [-38, 0.85, 6], [3.8, 1.7, 10], materials.wall);
  addBox("cyan low maze b", [38, 0.85, -6], [3.8, 1.7, 10], materials.cyan);
  addBox("outer cyan depot", [-56, 2.2, -54], [10, 4.4, 5], materials.cyan);
  addBox("outer orange tower", [56, 5.2, 54], [5, 10.4, 5], materials.green);
  addBox("outer purple bunker", [-54, 1.4, 52], [8, 2.8, 4], materials.cyan);
  addBox("outer white hangar", [54, 2.4, -52], [12, 4.8, 6], materials.wall);
  addBox("outer green cover", [0, 1.2, 58], [16, 2.4, 3], materials.green);
  addBox("outer blue cover", [0, 1.2, -58], [16, 2.4, 3], materials.blue);
  addBox("west mega tower", [-47, 7.4, 0], [5, 14.8, 5], materials.blue);
  addBox("east stair tower", [47, 4.5, -44], [7, 9, 5], materials.green);
  addBox("west hide wall", [-58, 1.1, 18], [9, 2.2, 4], materials.wall);
  addBox("east hide wall", [58, 1.1, -18], [9, 2.2, 4], materials.yellow);
  addBox("south mini tower", [-16, 3.1, 54], [8, 6.2, 5], materials.blue);
  addBox("north mini tower", [18, 2.6, -55], [10, 5.2, 4], materials.green);
  addBox("right long cover", [44, 1.2, 18], [4, 2.4, 12], materials.cyan);
  addBox("purple roof deck", [36, 12.55, -33], [5.8, 0.35, 6.2], materials.blue, false);
  addMetroAtrium();
  addBox("corner hotel", [51, 6.4, 24], [5.8, 12.8, 5.8], materials.wall);
  addBox("corner hotel roof", [51, 12.98, 24], [6.4, 0.35, 6.4], materials.cyan, false);
  addBox("broadcast mast base", [0, 4.7, 48], [4.4, 9.4, 4.4], materials.blue);
  addBox("broadcast mast roof", [0, 9.6, 48], [5.2, 0.35, 5.2], materials.yellow, false);
  addBox("underpass cover a", [-44, 0.75, -43], [10, 1.5, 2.4], materials.green);
  addBox("underpass cover b", [43, 0.75, 43], [10, 1.5, 2.4], materials.blue);
  addOpenCityBuilding("north office lobby", 0, -82, 22, 13, 8.4, materials.wall, materials.blue);
  addOpenCityBuilding("west shopping arcade", -80, -18, 18, 15, 6.2, materials.glass, materials.orange);
  addOpenCityBuilding("east civic hall", 80, 18, 18, 15, 6.2, materials.wall, materials.green);
  addBox("north office tower", [0, 15.4, -86], [12, 30.8, 7], materials.glass);
  addBox("north office roof", [0, 30.95, -86], [12.8, 0.35, 7.8], materials.cyan, false);
  addBox("west highrise", [-79, 13.5, -74], [13, 27, 10], materials.wall);
  addBox("west highrise roof", [-79, 27.2, -74], [13.8, 0.35, 10.8], materials.orange, false);
  addBox("east highrise", [78, 14.8, 75], [12, 29.6, 11], materials.glass);
  addBox("east highrise roof", [78, 29.75, 75], [12.8, 0.35, 11.8], materials.purple, false);
  addBox("central skywalk west", [-31, 8.6, -74], [44, 0.48, 3.2], materials.cyan, false);
  addBox("central skywalk east", [31, 8.6, -74], [44, 0.48, 3.2], materials.cyan, false);
  addBox("south parking deck", [0, 3.4, 82], [34, 6.8, 12], materials.wall);
  addBox("south parking roof", [0, 6.98, 82], [34.8, 0.35, 12.8], materials.yellow, false);
  addBox("south deck ramp wall", [-22, 1.3, 79], [8, 2.6, 3.2], materials.metal);
  addBox("east plaza shop", [72, 1.9, -54], [17, 3.8, 8], materials.wall);
  addBox("west plaza shop", [-72, 1.9, 54], [17, 3.8, 8], materials.green);
  addBox("bus shelter", [63, 1.05, -78], [9, 2.1, 3.4], materials.glass);
  addBox("monument cover", [-62, 1.8, 78], [5.2, 3.6, 5.2], materials.yellow);
  addBox("north alley cover", [45, 0.95, -83], [13, 1.9, 3], materials.dark);
  addBox("west alley cover", [-85, 0.95, 18], [3, 1.9, 13], materials.dark);
  addAuroraTower();
  addRealismDetails();
  addWalkSurface([0, 30.95, -86], [12.8, 0.35, 7.8]);
  addWalkSurface([-79, 27.2, -74], [13.8, 0.35, 10.8]);
  addWalkSurface([78, 29.75, 75], [12.8, 0.35, 11.8]);
  addWalkSurface([-31, 8.6, -74], [44, 0.48, 3.2]);
  addWalkSurface([31, 8.6, -74], [44, 0.48, 3.2]);
  addWalkSurface([0, 6.98, 82], [34.8, 0.35, 12.8]);
  addWalkSurface([36, 12.55, -33], [5.8, 0.35, 6.2]);
  addWalkSurface([-12.8, 11.9, 23], [4.2, 0.35, 5.2]);
  addWalkSurface([8.2, 13.5, -24], [4.2, 0.35, 5.2]);
  addWalkSurface([25.2, 10.35, 0], [4.4, 0.35, 5.6]);
  addWalkSurface([-23, 12.75, 3], [5.2, 0.35, 4.8]);
  addWalkSurface([-6, 6, 27], [4.8, 12, 4.8]);
  addWalkSurface([15, 6.8, -28], [5.2, 13.6, 4.4]);
  addWalkSurface([29, 5.2, 0], [3.4, 10.4, 4.6]);
  addWalkSurface([56, 5.2, 54], [5, 10.4, 5]);
  addWalkSurface([54, 2.4, -52], [12, 4.8, 6]);
  addWalkSurface([-47, 7.4, 0], [5, 14.8, 5]);
  addWalkSurface([47, 4.5, -44], [7, 9, 5]);
  addWalkSurface([-16, 3.1, 54], [8, 6.2, 5]);
  addWalkSurface([18, 2.6, -55], [10, 5.2, 4]);
  addWalkSurface([51, 12.98, 24], [6.4, 0.35, 6.4]);
  addWalkSurface([0, 9.6, 48], [5.2, 0.35, 5.2]);

  addStairs("stairs center", [-1.8, 0.15, -18], 6, 0.55, 1.3, 0);
  addStairs("stairs west", [-20, 0.15, 10], 5, 0.5, 1.2, Math.PI / 2);
  addStairs("stairs east", [19, 0.15, -14], 5, 0.5, 1.2, -Math.PI / 2);
  addStairs("tower stairs north", [-10.5, 0.15, 27], 22, 0.47, 0.92, Math.PI / 2);
  addStairs("tower stairs south", [10.5, 0.15, -28], 25, 0.48, 0.9, -Math.PI / 2);
  addStairs("service stairs", [25.2, 0.15, -4], 19, 0.46, 0.92, 0);
  addStairs("lookout stairs", [-23, 0.15, -7], 24, 0.47, 0.9, 0);
  addStairs("outer purple stairs", [36, 0.15, -41], 24, 0.48, 0.9, 0);
  addStairs("west mega stairs", [-51, 0.15, 0], 30, 0.48, 0.9, Math.PI / 2);
  addStairs("east outer stairs", [42.5, 0.15, -44], 18, 0.47, 0.92, -Math.PI / 2);
  addStairs("hotel stairs", [55, 0.15, 24], 27, 0.48, 0.9, Math.PI / 2);
  addStairs("broadcast stairs", [-4.2, 0.15, 48], 20, 0.47, 0.9, -Math.PI / 2);
  addStairs("north office stairs", [9, 0.15, -80], 17, 0.47, 0.9, Math.PI);
  addStairs("north tower stairs", [-7.5, 0.15, -89], 34, 0.82, 0.78, 0);
  addStairs("west highrise stairs", [-88, 0.15, -74], 31, 0.82, 0.78, Math.PI / 2);
  addStairs("east highrise stairs", [86, 0.15, 75], 34, 0.82, 0.78, -Math.PI / 2);
  addStairs("parking deck stairs", [-17, 0.15, 82], 12, 0.5, 1.0, Math.PI / 2);
  addTrampoline("trampoline center", 0, 8, 2.4, 14.8);
  addTrampoline("trampoline west", -18, -14, 2.2, 13.6);
  addTrampoline("trampoline east", 20, 12, 2.2, 13.6);
  addTrampoline("trampoline roof", -12.8, 20.2, 1.8, 12.8);
  addBarrierPowerup();
  addHealthPickupMesh();

  const ramp = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.28, 3.4), materials.green);
  ramp.rotation.x = -0.45;
  ramp.position.set(18, 0.9, 10);
  trackArenaObject(ramp);

  for (let i = 0; i < 14; i += 1) {
    const color = i % 3 === 0 ? materials.green : i % 3 === 1 ? materials.blue : materials.yellow;
    addBox(`paint-${i}`, [Math.sin(i * 2.7) * 26, 0.01, Math.cos(i * 1.8) * 26], [1.8, 0.04, 0.4], color, false)
      .rotation.y = i * 0.72;
  }

  addReferenceArenaDressing();
  addToyboxVisualDecals();
  addSign("METRO", [-48, 3.35, -21.55], 0, "#1598f0");
  addSign("HOTEL", [47.95, 8.3, 24], -Math.PI / 2, "#2186d9");
  addSign("BROADCAST", [0, 7.0, 45.75], 0, "#2fc4bf");
  addSign("ROOF ROUTE", [15, 4.8, -17.72], Math.PI, "#93e43c");
  addSign("CENTER", [0, 2.35, -57.45], Math.PI, "#111827");
}

function addOkakoJArena() {
  addBox("okako field", [0, -0.05, 0], [136, 0.1, 136], makeMaterial(0x9ecb72, 0.96), false);
  addBox("okako north fence", [0, 1.2, -67.5], [136, 2.4, 1], materials.wall);
  addBox("okako south fence", [0, 1.2, 67.5], [136, 2.4, 1], materials.wall);
  addBox("okako west fence", [-67.5, 1.2, 0], [1, 2.4, 136], materials.wall);
  addBox("okako east fence", [67.5, 1.2, 0], [1, 2.4, 136], materials.wall);

  const floorMat = makeMaterial(0xd9dde0, 0.9);
  const wallMat = makeMaterial(0xe8ecef, 0.82);
  const gymMat = makeMaterial(0xb8d4e8, 0.86);
  const labMat = makeMaterial(0xd7ddc7, 0.84);
  const trackMat = makeMaterial(0xb86551, 0.94);

  const addSchoolBuilding = (prefix: string, x: number, z: number, w: number, d: number, h: number, mat: THREE.Material) => {
    addBox(`${prefix} floor`, [x, 0.04, z], [w, 0.12, d], floorMat, false);
    addBox(`${prefix} roof`, [x, h + 0.08, z], [w, 0.18, d], materials.metal, false);
    addBox(`${prefix} back wall`, [x, h / 2, z - d / 2], [w, h, 0.42], mat);
    addBox(`${prefix} front wall left`, [x - w * 0.31, h / 2, z + d / 2], [w * 0.38, h, 0.42], mat);
    addBox(`${prefix} front wall right`, [x + w * 0.31, h / 2, z + d / 2], [w * 0.38, h, 0.42], mat);
    addBox(`${prefix} side wall west`, [x - w / 2, h / 2, z], [0.42, h, d], mat);
    addBox(`${prefix} side wall east`, [x + w / 2, h / 2, z], [0.42, h, d], mat);
    addBox(`${prefix} corridor line`, [x, 0.08, z + d * 0.18], [w - 3, 0.08, 0.32], materials.yellow, false);
    for (let i = -2; i <= 2; i += 1) {
      addBox(`${prefix} classroom partition ${i}`, [x + i * (w / 6), 1.25, z - d * 0.05], [0.24, 2.5, d * 0.55], wallMat);
      addBox(`${prefix} desk row ${i}`, [x + i * (w / 6), 0.44, z + d * 0.15], [2.2, 0.42, 0.72], materials.dark, false);
    }
    addWalkSurface([x, h + 0.08, z], [w, 0.18, d]);
  };

  addSchoolBuilding("okako main school", -22, -28, 48, 14, 4.4, wallMat);
  addSchoolBuilding("okako lab wing", 36, -24, 24, 16, 5.2, labMat);
  addSchoolBuilding("okako club wing", -44, 22, 22, 12, 3.8, wallMat);

  addBox("okako gym floor", [30, 0.05, 28], [28, 0.12, 22], floorMat, false);
  addBox("okako gym north wall", [30, 3.1, 17], [28, 6.2, 0.48], gymMat);
  addBox("okako gym south wall left", [21.5, 3.1, 39], [9, 6.2, 0.48], gymMat);
  addBox("okako gym south wall right", [39.5, 3.1, 39], [9, 6.2, 0.48], gymMat);
  addBox("okako gym west wall", [16, 3.1, 28], [0.48, 6.2, 22], gymMat);
  addBox("okako gym east wall", [44, 3.1, 28], [0.48, 6.2, 22], gymMat);
  addBox("okako gym roof", [30, 6.3, 28], [29, 0.28, 23], materials.metal, false);
  addBox("okako gym court", [30, 0.11, 28], [22, 0.08, 15], makeMaterial(0xe3b36c, 0.9), false);
  addBox("okako gym stage", [30, 0.55, 18.8], [12, 1.1, 2.5], materials.red);
  addWalkSurface([30, 6.3, 28], [29, 0.28, 23]);

  addBox("okako workshop machine a", [34, 0.62, -27], [3.2, 1.24, 1.8], materials.metal);
  addBox("okako workshop machine b", [41, 0.62, -22], [3.2, 1.24, 1.8], materials.metal);
  addBox("okako workshop table a", [29, 0.48, -19], [5.2, 0.96, 1.2], materials.dark);
  addBox("okako workshop table b", [39, 0.48, -30], [5.2, 0.96, 1.2], materials.dark);

  addBox("okako athletic track north", [-8, 0.04, 27], [44, 0.08, 2.2], trackMat, false);
  addBox("okako athletic track south", [-8, 0.04, 49], [44, 0.08, 2.2], trackMat, false);
  addBox("okako athletic track west", [-31, 0.04, 38], [2.2, 0.08, 22], trackMat, false);
  addBox("okako athletic track east", [15, 0.04, 38], [2.2, 0.08, 22], trackMat, false);
  addBox("okako soccer goal north", [-8, 1.0, 25], [8, 2, 0.4], materials.wall, false);
  addBox("okako soccer goal south", [-8, 1.0, 51], [8, 2, 0.4], materials.wall, false);
  addBox("okako bleacher a", [-50, 0.45, 39], [11, 0.9, 2], materials.blue);
  addBox("okako bleacher b", [-50, 1.15, 43], [11, 0.9, 2], materials.blue);
  addBox("okako bleacher c", [-50, 1.85, 47], [11, 0.9, 2], materials.blue);

  addBox("okako sky bridge", [5, 3.2, -25], [20, 0.52, 2.4], materials.glass, false);
  addWalkSurface([5, 3.2, -25], [20, 0.52, 2.4]);
  addStairs("okako main stairs", [-42, 0.15, -20], 10, 0.44, 0.9, Math.PI / 2);
  addStairs("okako lab stairs", [24, 0.15, -15], 12, 0.44, 0.88, -Math.PI / 2);
  addStairs("okako gym stairs", [18, 0.15, 40], 14, 0.44, 0.9, Math.PI);

  addTrampoline("okako long jump pad", -20, 32, 2.2, 13.2);
  addBarrierPowerup();
  addHealthPickupMesh();
  addSign("OKAKO-J", [-22, 5.2, -20.75], 0, "#1598f0");
  addSign("LAB", [35.8, 5.8, -15.75], 0, "#5f7d3b");
  addSign("GYM", [30, 4.7, 39.35], Math.PI, "#2563eb");
  addSign("FIELD", [-8, 1.8, 24], 0, "#b86551");
}

function addStairs(name: string, origin: [number, number, number], count: number, rise: number, run: number, yaw: number) {
  const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
  stairZones.push({
    origin: new THREE.Vector3(origin[0], origin[1], origin[2]),
    yaw,
    count,
    rise,
    run,
    width: 3.2
  });
  for (let i = 0; i < count; i += 1) {
    const center = new THREE.Vector3(origin[0], origin[1] + rise * i + rise / 2, origin[2])
      .addScaledVector(forward, i * run);
    const step = addBox(`${name}-${i}`, [center.x, center.y, center.z], [3.2, rise, run], i % 2 ? materials.wall : materials.green, false);
    step.rotation.y = yaw;
  }
}

function makeSignMaterial(label: string, background: string, foreground = "#f7fbff") {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 96;
  const context = textureCanvas.getContext("2d")!;
  context.fillStyle = background;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  context.strokeStyle = "rgba(255,255,255,0.42)";
  context.lineWidth = 8;
  context.strokeRect(6, 6, textureCanvas.width - 12, textureCanvas.height - 12);
  context.fillStyle = foreground;
  context.font = "900 34px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, textureCanvas.width / 2, textureCanvas.height / 2);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture });
}

function addSign(label: string, position: [number, number, number], yaw: number, background: string) {
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.18), makeSignMaterial(label, background));
  sign.position.set(position[0], position[1], position[2]);
  sign.rotation.y = yaw;
  trackArenaObject(sign);
}

function createCloudTexture(seed: number) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 512;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d")!;
  const random = seededRandom(seed);
  context.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
  for (let i = 0; i < 12; i += 1) {
    const x = 74 + random() * 360;
    const y = 80 + random() * 68;
    const radius = 42 + random() * 70;
    const gradient = context.createRadialGradient(x, y, radius * 0.08, x, y, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.94)");
    gradient.addColorStop(0.58, "rgba(255,255,255,0.76)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(x, y, radius * (1.12 + random() * 0.46), radius * (0.58 + random() * 0.26), 0, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = "rgba(255,255,255,0.52)";
  context.fillRect(74, 128, 360, 26);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addSky() {
  const clouds: Array<[number, number, number, number, number, number]> = [
    [-68, 31, -118, 44, 18, 0.9],
    [-12, 25, -132, 36, 14, 0.82],
    [54, 32, -116, 48, 20, 0.88],
    [-98, 27, 18, 38, 15, 0.68],
    [102, 29, 32, 42, 17, 0.7],
    [12, 36, 118, 52, 21, 0.64]
  ];
  clouds.forEach(([x, y, z, width, height, opacity], index) => {
    const material = new THREE.SpriteMaterial({
      map: createCloudTexture(8000 + index * 53),
      transparent: true,
      depthWrite: false,
      opacity,
      fog: false
    });
    const cloud = new THREE.Sprite(material);
    cloud.position.set(x, y, z);
    cloud.scale.set(width, height, 1);
    scene.add(cloud);
  });
}

function addWeapon() {
  if (weaponView) camera.remove(weaponView);
  const gun = currentGun();
  const weapon = new THREE.Group();
  weapon.name = "weaponView";
  const receiverLength = gun.kind === "shotgun" ? 1.34 : gun.kind === "smg" ? 0.82 : isScopedGun(gun) ? 1.42 : 1.12;
  const barrelLength = isScopedGun(gun) ? 1.46 : gun.kind === "shotgun" ? 1.08 : gun.kind === "smg" ? 0.66 : 0.96;
  const accentMaterial = gun.kind === "aug" || gun.kind === "awm" ? materials.cyan : gun.kind === "type95" ? materials.purple : materials.yellow;
  const tracerMaterial = makeMaterial(gun.tracerColor, 0.38);
  const skinMaterial = makeMaterial(0xffc0a0, 0.76);
  const addPart = (mesh: THREE.Mesh, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    weapon.add(mesh);
    return mesh;
  };
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, receiverLength), materials.rubber), [0.42, -0.33, -0.8]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.64), materials.metal), [0.42, -0.18, -0.86]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, gun.kind === "smg" ? 0.44 : 0.7), materials.metal), [0.42, -0.3, -1.2]);
  addPart(
    new THREE.Mesh(new THREE.CylinderGeometry(gun.kind === "shotgun" ? 0.088 : 0.048, gun.kind === "shotgun" ? 0.088 : 0.058, barrelLength, 14), materials.dark),
    [0.42, -0.29, -1.06 - barrelLength / 2],
    [Math.PI / 2, 0, 0]
  );
  addPart(
    new THREE.Mesh(new THREE.CylinderGeometry(gun.kind === "shotgun" ? 0.12 : 0.076, gun.kind === "shotgun" ? 0.12 : 0.076, 0.2, 14), materials.metal),
    [0.42, -0.29, -1.08 - barrelLength],
    [Math.PI / 2, 0, 0]
  );
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.052, receiverLength * 0.72), materials.dark), [0.42, -0.055, -0.82]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.18), materials.dark), [0.27, -0.29, -1.1 - barrelLength], [0, 0, 0.12]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.18), materials.dark), [0.57, -0.29, -1.1 - barrelLength], [0, 0, -0.12]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.56), accentMaterial), [0.22, -0.3, -0.72]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.56), accentMaterial), [0.62, -0.3, -0.72]);
  const stockLength = gun.kind === "smg" ? 0.28 : gun.kind === "shotgun" ? 0.62 : 0.54;
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, stockLength), materials.rubber), [0.45, -0.34, -0.14], [-0.16, 0, 0]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.12), materials.rubber), [0.45, -0.42, 0.18], [-0.18, 0, 0]);
  const magHeight = gun.kind === "smg" ? 0.54 : gun.kind === "shotgun" ? 0.18 : isScopedGun(gun) ? 0.28 : 0.38;
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.19, magHeight, 0.26), materials.metal), [0.42, -0.54, -0.68], [0.22, 0, 0]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.14), materials.rubber), [0.42, -0.54, -0.38], [-0.22, 0, 0]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.72), materials.metal), [0.25, -0.21, -0.95]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.72), materials.metal), [0.59, -0.21, -0.95]);
  if (isScopedGun(gun)) {
    addPart(new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.72, 16), materials.rubber), [0.42, -0.08, -0.92], [0, 0, Math.PI / 2]);
    addPart(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), materials.metal), [0.78, -0.08, -0.92], [0, 0, Math.PI / 2]);
    addPart(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), materials.metal), [0.06, -0.08, -0.92], [0, 0, Math.PI / 2]);
  } else {
    addPart(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.06), materials.metal), [0.42, -0.08, -1.28]);
    addPart(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.06), materials.metal), [0.42, -0.08, -0.58]);
    addPart(new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.012, 8, 16), materials.yellow), [0.42, -0.08, -1.1], [0, Math.PI / 2, 0]);
    addPart(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.014, 8, 18), materials.dark), [0.42, -0.075, -0.46], [0, Math.PI / 2, 0]);
  }
  if (gun.kind === "shotgun") {
    addPart(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.96, 12), materials.rubber), [0.42, -0.43, -1.18], [Math.PI / 2, 0, 0]);
  } else if (gun.kind !== "smg") {
    addPart(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.16), materials.rubber), [0.42, -0.55, -1.08], [-0.28, 0, 0]);
  }
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.42), accentMaterial), [0.42, -0.2, -0.48]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.16), tracerMaterial), [0.24, -0.19, -0.55]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.055, 0.42), materials.metal), [0.63, -0.16, -0.86]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.13, 0.26), materials.dark), [0.64, -0.21, -0.82]);
  addPart(new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.016, 8, 18, Math.PI * 1.45), materials.metal), [0.42, -0.47, -0.42], [Math.PI / 2, 0, 0.2]);
  for (let rail = 0; rail < 5; rail += 1) {
    addPart(new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.035, 0.055), materials.metal), [0.42, -0.025, -0.56 - rail * 0.16]);
  }
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.34), materials.rubber), [0.25, -0.68, -0.6], [0.08, 0.05, 0.18]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.24, 0.34), accentMaterial), [0.17, -0.84, -0.34], [0.12, -0.16, 0.1]);
  addPart(new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.15, 0.78, 10), accentMaterial), [0.12, -0.95, -0.28], [Math.PI / 2, 0.08, -0.16]);
  addPart(new THREE.Mesh(new THREE.SphereGeometry(0.155, 10, 8), materials.rubber), [0.26, -0.68, -0.64], [0, 0, 0]);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.28), skinMaterial), [0.36, -0.62, -0.84], [0.12, 0.05, -0.08]);
  addPart(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.92, 10), accentMaterial), [-0.08, -1.08, 0.02], [Math.PI / 2, -0.18, -0.1]);

  const muzzleFlash = new THREE.Group();
  const flashCore = new THREE.Mesh(
    new THREE.SphereGeometry(gun.kind === "shotgun" ? 0.15 : 0.1, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff6b8, transparent: true, opacity: 0.96, depthWrite: false })
  );
  const flashCone = new THREE.Mesh(
    new THREE.ConeGeometry(gun.kind === "shotgun" ? 0.18 : 0.12, gun.kind === "shotgun" ? 0.52 : 0.38, 6),
    new THREE.MeshBasicMaterial({ color: gun.tracerColor, transparent: true, opacity: 0.78, depthWrite: false })
  );
  flashCone.rotation.x = -Math.PI / 2;
  flashCone.position.z = -0.2;
  const flashLight = new THREE.PointLight(0xffd76b, 0, 4.5, 2);
  muzzleFlash.add(flashCore, flashCone, flashLight);
  muzzleFlash.position.set(0.42, -0.29, -1.19 - barrelLength);
  muzzleFlash.visible = false;
  weapon.add(muzzleFlash);
  muzzleFlashMesh = muzzleFlash;
  muzzleFlashLight = flashLight;

  weapon.scale.setScalar(0.61);
  camera.add(weapon);
  weaponView = weapon;
  scene.add(camera);
}

function createPlayerMesh(player: PlayerState) {
  const group = new THREE.Group();
  group.userData.skin = normalizeSkinId(player.skin);
  group.userData.nameTagKey = "";
  const skinId = normalizeSkinId(player.skin);
  const teamMaterial = makeMaterial(colorToNumber(player.cosmeticColor) ?? (player.color === "blue" ? palette.blue : palette.red), 0.7);
  const skinMaterial = makeMaterial(skinId === "bee" ? 0xffd23a : skinId === "scout" ? 0xf0b98d : 0xffc0a0, 0.76);
  const bootMaterial = makeMaterial(0x151b20, 0.78);
  const bodyGeometry = skinId === "heavy"
    ? new THREE.CapsuleGeometry(0.42, 0.76, 3, 7)
    : skinId === "scout"
      ? new THREE.CapsuleGeometry(0.28, 0.92, 3, 6)
      : new THREE.CapsuleGeometry(0.34, 0.82, 3, 6);
  const body = new THREE.Mesh(bodyGeometry, teamMaterial);
  body.position.y = skinId === "scout" ? 0.9 : 0.85;
  const head = new THREE.Mesh(skinId === "heavy" ? new THREE.SphereGeometry(0.28, 10, 8) : new THREE.SphereGeometry(0.25, 10, 8), skinMaterial);
  head.position.y = skinId === "scout" ? 1.66 : 1.58;
  const markerGeometry = skinId === "bee" ? new THREE.SphereGeometry(0.2, 10, 8) : new THREE.ConeGeometry(0.22, 0.32, 3);
  const marker = new THREE.Mesh(markerGeometry, makeMaterial(colorToNumber(player.cosmeticColor) ?? (player.color === "blue" ? 0x23b7ff : 0xff5757)));
  marker.position.y = 2.25;
  marker.rotation.x = Math.PI;
  const weapon = new THREE.Group();
  const weaponBody = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.62), materials.dark);
  const weaponStock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.22), materials.rubber);
  const weaponBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.034, 0.58, 8), materials.metal);
  const weaponSight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), materials.yellow);
  weaponBody.position.set(0, 0, -0.1);
  weaponStock.position.set(0, -0.02, 0.24);
  weaponBarrel.rotation.x = Math.PI / 2;
  weaponBarrel.position.set(0, 0.01, -0.6);
  weaponSight.position.set(0, 0.1, -0.18);
  weapon.add(weaponBody, weaponStock, weaponBarrel, weaponSight);
  weapon.position.set(0.36, 1.08, -0.42);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(skinId === "heavy" ? 0.32 : 0.265, 10, 6), bootMaterial);
  helmet.position.y = 1.68;
  helmet.scale.set(skinId === "heavy" ? 1.14 : 1.08, skinId === "scout" ? 0.42 : 0.56, 1.02);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.08), materials.dark);
  visor.position.set(0, 1.61, -0.22);
  const vest = new THREE.Mesh(new THREE.BoxGeometry(skinId === "heavy" ? 0.72 : 0.58, skinId === "scout" ? 0.42 : 0.54, skinId === "heavy" ? 0.5 : 0.42), teamMaterial);
  vest.position.y = 0.92;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.1, 0.44), bootMaterial);
  belt.position.y = 0.56;
  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.52, 2, 6), teamMaterial);
  leftArm.position.set(-0.38, 1.03, -0.05);
  leftArm.rotation.z = -0.24;
  const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.52, 2, 6), teamMaterial);
  rightArm.position.set(0.38, 1.02, -0.16);
  rightArm.rotation.z = 0.42;
  rightArm.rotation.x = -0.34;
  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.48, 2, 6), bootMaterial);
  leftLeg.position.set(-0.16, 0.25, 0);
  const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.48, 2, 6), bootMaterial);
  rightLeg.position.set(0.16, 0.25, 0);
  const leftGlove = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), bootMaterial);
  leftGlove.position.set(-0.43, 0.78, -0.1);
  const rightGlove = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), bootMaterial);
  rightGlove.position.set(0.48, 0.9, -0.42);
  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 1.85, 1.35),
    new THREE.MeshBasicMaterial({ color: 0x7df7ff, transparent: true, opacity: 0.14, wireframe: true })
  );
  shield.position.y = 0.98;
  shield.visible = false;
  group.add(body, head, marker, weapon, shield, helmet, visor, vest, belt, leftArm, rightArm, leftLeg, rightLeg, leftGlove, rightGlove);
  if (skinId === "bee") {
    const stripeMaterial = makeMaterial(0x111820, 0.7);
    const stripeA = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.45), stripeMaterial);
    const stripeB = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.43), stripeMaterial);
    stripeA.position.y = 0.99;
    stripeB.position.y = 0.78;
    group.add(stripeA, stripeB);
  }
  if (dynamicShadowsEnabled) {
    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }
  updatePlayerNameTag(group, player);
  scene.add(group);
  return group;
}

function clampNameTagText(name: string) {
  const safeName = (name || "Player").trim() || "Player";
  return safeName.length > 14 ? `${safeName.slice(0, 13)}...` : safeName;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function makeNameTagTexture(player: PlayerState) {
  const canvasTag = document.createElement("canvas");
  canvasTag.width = nameTagCanvasWidth;
  canvasTag.height = nameTagCanvasHeight;
  const ctx = canvasTag.getContext("2d")!;
  const label = clampNameTagText(player.name);
  const levelLabel = player.level && player.level > 1 ? `Lv.${player.level}` : "";
  const accent = colorToNumber(player.cosmeticColor) ?? (player.color === "blue" ? 0x23b7ff : 0xff5757);
  const accentCss = `#${accent.toString(16).padStart(6, "0")}`;

  ctx.clearRect(0, 0, nameTagCanvasWidth, nameTagCanvasHeight);
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  roundedRectPath(ctx, 10, 8, nameTagCanvasWidth - 20, 46, 16);
  ctx.fillStyle = "rgba(13, 20, 28, 0.78)";
  ctx.fill();
  ctx.restore();

  roundedRectPath(ctx, 14, 12, 10, 38, 6);
  ctx.fillStyle = accentCss;
  ctx.fill();

  ctx.font = "700 23px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.strokeText(label, nameTagCanvasWidth / 2 + 5, levelLabel ? 27 : 32);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, nameTagCanvasWidth / 2 + 5, levelLabel ? 27 : 32);
  if (levelLabel) {
    ctx.font = "800 12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#d9fbff";
    ctx.fillText(levelLabel, nameTagCanvasWidth / 2 + 5, 44);
  }

  const texture = new THREE.CanvasTexture(canvasTag);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function disposeNameTagSprite(sprite?: THREE.Sprite) {
  if (!sprite) return;
  disposeMaterial(sprite.material);
  sprite.parent?.remove(sprite);
}

function updatePlayerNameTag(group: THREE.Group, player: PlayerState) {
  const colorKey = player.cosmeticColor || player.color;
  const nextKey = `${player.name}|${colorKey}|${player.level || 1}`;
  if (group.userData.nameTagKey === nextKey && group.userData.nameTagSprite) return;
  disposeNameTagSprite(group.userData.nameTagSprite as THREE.Sprite | undefined);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeNameTagTexture(player),
    transparent: true,
    depthTest: true,
    depthWrite: false
  }));
  sprite.position.set(0, 2.48, 0);
  sprite.scale.set(1.34, 0.335, 1);
  sprite.renderOrder = 3;
  group.userData.nameTagSprite = sprite;
  group.userData.nameTagKey = nextKey;
  group.add(sprite);
}

function applyPlayerMeshColor(mesh: THREE.Group, player: PlayerState) {
  const nextSkin = normalizeSkinId(player.skin);
  if (mesh.userData.skin !== nextSkin) {
    const replacement = createPlayerMesh(player);
    replacement.position.copy(mesh.position);
    replacement.rotation.copy(mesh.rotation);
    playerMeshes.set(player.id, replacement);
    scene.remove(mesh);
    mesh.traverse((child) => {
      disposeObjectResources(child);
    });
    return;
  }
  updatePlayerNameTag(mesh, player);
  const color = colorToNumber(player.cosmeticColor) ?? (player.color === "blue" ? palette.blue : palette.red);
  const markerColor = colorToNumber(player.cosmeticColor) ?? (player.color === "blue" ? 0x23b7ff : 0xff5757);
  ((mesh.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(color);
  ((mesh.children[2] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(markerColor);
  ((mesh.children[7] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(color);
}

function colorToNumber(color?: string) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return null;
  return Number.parseInt(color.slice(1), 16);
}

function applyViewportSizeVars() {
  const { width } = viewportSize();
  const keyboardOpen = mobileKeyboardOpen();
  const visualHeight = Math.round(window.visualViewport?.height || window.innerHeight);
  const holdingStableHeight = holdingStableViewportAfterKeyboard();
  if (!keyboardOpen && !holdingStableHeight && window.innerHeight > 0) lastStableViewportHeight = Math.round(window.innerHeight);
  const height = effectiveViewportHeight();
  const keyboardOffset = keyboardOpen ? Math.max(0, Math.round(lastStableViewportHeight - visualHeight - (window.visualViewport?.offsetTop || 0))) : 0;
  document.documentElement.style.setProperty("--app-width", `${width}px`);
  document.documentElement.style.setProperty("--app-height", `${height}px`);
  document.documentElement.style.setProperty("--keyboard-offset", `${keyboardOffset}px`);
  document.body.classList.toggle("keyboard-open", keyboardOpen);
}

function resize() {
  applyViewportSizeVars();
  const { width, height } = viewportSize();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  activePixelRatio = Math.min(activePixelRatio, maxPixelRatio());
  renderer.setPixelRatio(activePixelRatio);
  renderer.setSize(width, height, false);
}

window.addEventListener("resize", resize);
window.visualViewport?.addEventListener("resize", resize);
window.visualViewport?.addEventListener("scroll", resize);
function recoverViewportAfterTextInput() {
  viewportRecoveryUntil = performance.now() + 1350;
  viewportRecoveryTimers.forEach((timer) => window.clearTimeout(timer));
  viewportRecoveryTimers = [];
  for (const delay of [0, 90, 240, 520, 900, 1320]) {
    const timer = window.setTimeout(() => {
      applyViewportSizeVars();
      resize();
      window.scrollTo(0, 0);
    }, delay);
    viewportRecoveryTimers.push(timer);
  }
}

document.addEventListener("focusin", (event) => {
  if (!isTextEntryTarget(event.target)) return;
  if (!viewportLooksKeyboardShrunk() && window.innerHeight > 0) lastStableViewportHeight = Math.round(window.innerHeight);
  window.setTimeout(resize, 40);
});
document.addEventListener("focusout", (event) => {
  if (!isTextEntryTarget(event.target)) return;
  recoverViewportAfterTextInput();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || !isTextEntryTarget(event.target)) return;
  const target = event.target as HTMLElement;
  target.blur();
  recoverViewportAfterTextInput();
});
window.addEventListener("orientationchange", () => {
  lastStableViewportHeight = Math.round(window.innerHeight || lastStableViewportHeight);
  viewportRecoveryUntil = 0;
  setTimeout(resize, 250);
  setTimeout(resize, 700);
});
resize();
addLights();
switchArena(arenaChoice);
addSky();
addWeapon();

document.addEventListener("keydown", (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
  if (event.code === "KeyW" && !event.repeat) {
    const now = performance.now();
    if (now - lastWDownAt < 320) sprintUntil = now + 2400;
    lastWDownAt = now;
  }
  if (event.code === "Space" && !event.repeat) jumpQueued = true;
  if (event.code === "KeyQ" && !event.repeat && self.joined) {
    event.preventDefault();
    triggerDonPunch();
  }
  if (event.code === "KeyE" && !event.repeat && self.joined) {
    event.preventDefault();
    toggleVehicleInteraction();
  }
  if (event.code === "KeyP" && !event.repeat && self.joined) {
    event.preventDefault();
    sendTeamPing();
  }
  if ((event.code === "ControlLeft" || event.code === "ControlRight" || event.code === "MetaLeft" || event.code === "MetaRight") && !event.repeat && self.joined) {
    event.preventDefault();
    useHealPack();
  }
  if (event.code === "Enter" && !event.repeat && self.joined) {
    event.preventDefault();
    const me = players.get(self.id);
    if (me?.name === "こーた" || nameInput.value.trim() === "こーた") {
      creativeMode = !creativeMode;
      self.velocity.set(0, 0, 0);
      send({ type: "creative_toggle", enabled: creativeMode });
      showToast(creativeMode ? "CREATIVE ON" : "CREATIVE OFF");
    } else {
      send({ type: "hadeon_burst" });
    }
  }
  keys.add(event.code);
  if (event.code === "Tab") {
    event.preventDefault();
    scoreboard.classList.add("open");
  }
  if (event.code === "KeyR") reload();
  if (/^Digit[1-8]$/.test(event.code)) switchGun(Number(event.code.slice(-1)) - 1);
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  if (event.code === "Tab") scoreboard.classList.remove("open");
});

document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas || !self.joined) return;
  self.yaw -= event.movementX * 0.0024;
  self.pitch -= event.movementY * 0.002;
  self.pitch = THREE.MathUtils.clamp(self.pitch, -1.15, 1.1);
});

document.addEventListener("wheel", (event) => {
  if (document.pointerLockElement !== canvas || !self.joined) return;
  event.preventDefault();
  switchGun(currentGunIndex + (event.deltaY > 0 ? 1 : -1));
}, { passive: false });

canvas.addEventListener("pointerdown", (event) => {
  if (!self.joined) return;
  if (event.pointerType === "touch") return;
  event.preventDefault();
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
  if (event.button === 1) {
    sendTeamPing();
    return;
  }
  if (event.button === 2 && isScopedGun()) {
    scoped = !scoped;
    document.body.classList.toggle("scoped", scoped);
    return;
  }
  if (event.button !== 0) return;
  desktopFiring = true;
  shoot();
});
const stopDesktopFire = () => {
  desktopFiring = false;
};
canvas.addEventListener("pointerup", stopDesktopFire);
canvas.addEventListener("pointercancel", stopDesktopFire);
canvas.addEventListener("pointerleave", stopDesktopFire);
document.addEventListener("pointerup", stopDesktopFire);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopDesktopFire();
    mobileFiring = false;
    mobileFirePointer = null;
    mobileBraking = false;
    releaseMobileStick();
  }
  updateLobbyBgm();
});
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
const unlockAudioFromGesture = () => {
  void unlockAudio();
};
document.addEventListener("pointerdown", unlockAudioFromGesture, { capture: true, passive: true });
document.addEventListener("pointerup", unlockAudioFromGesture, { capture: true, passive: true });
document.addEventListener("touchstart", unlockAudioFromGesture, { capture: true, passive: true });
document.addEventListener("touchend", unlockAudioFromGesture, { capture: true, passive: true });
document.addEventListener("click", unlockAudioFromGesture, { capture: true });
document.addEventListener("keydown", unlockAudioFromGesture, { capture: true });

createRoomButton.addEventListener("click", () => join(""));
joinRoomButton.addEventListener("click", () => joinTypedRoom());
joinPokerRoomButton.addEventListener("click", () => joinTypedPokerRoom());
createLoginIdButton.addEventListener("click", () => {
  if (!sanitizeLoginId(loginIdInput.value)) loginIdInput.value = generateLoginId();
  void requestProfile("create")
    .then((profile) => {
      if (profile) showToast("このログインIDを作成しました。");
    })
    .catch(() => showToast("ログインIDを作成できませんでした。"));
});
loginProfileButton.addEventListener("click", () => {
  void requestProfile("login")
    .then((profile) => {
      if (profile) showToast("プロフィールを読み込みました。");
    })
    .catch(() => showToast("ログインできませんでした。"));
});
roomInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  joinTypedRoom();
});
for (const button of pokerCpuSelect.querySelectorAll<HTMLButtonElement>("button")) {
  button.classList.toggle("active", Number(button.dataset.pokerCpu) === pokerCpuCount);
  button.addEventListener("click", () => {
    pokerCpuCount = Number(button.dataset.pokerCpu) || 0;
    localStorage.setItem("donpachi-poker-cpu", String(pokerCpuCount));
    for (const item of pokerCpuSelect.querySelectorAll<HTMLButtonElement>("button")) item.classList.toggle("active", item === button);
  });
}
createPokerRoomButton.addEventListener("click", () => joinPoker(roomInput.value));
pokerFoldButton.addEventListener("click", () => sendPokerAction("fold"));
pokerCallButton.addEventListener("click", () => sendPokerAction("call"));
pokerRaiseButton.addEventListener("click", () => sendPokerAction("raise", currentPokerRaiseAmount()));
pokerRaiseAmountInput.addEventListener("change", () => {
  pokerRaiseAmountInput.value = String(currentPokerRaiseAmount());
});
for (const button of pokerRaisePresets.querySelectorAll<HTMLButtonElement>("[data-poker-raise-preset]")) {
  button.addEventListener("click", () => {
    const preset = button.dataset.pokerRaisePreset || "";
    const minimum = Math.max(20, Number(pokerRaiseAmountInput.min) || 20);
    const maximum = Math.max(minimum, Number(pokerRaiseAmountInput.max) || minimum);
    const amount = preset === "max" ? maximum : Math.min(maximum, Math.max(minimum, Math.floor(Number(preset) || minimum)));
    pokerRaiseAmountInput.value = String(amount);
  });
}
for (const button of pokerJankenPanel.querySelectorAll<HTMLButtonElement>("[data-poker-janken]")) {
  button.addEventListener("click", () => sendPokerJanken(button.dataset.pokerJanken || ""));
}
copyPokerInviteButton.addEventListener("click", copyInvite);
leavePokerButton.addEventListener("click", leavePokerRoom);
memberToggle.addEventListener("click", () => {
  const open = !document.body.classList.contains("members-open");
  document.body.classList.toggle("members-open", open);
  memberToggle.textContent = open ? "メンバー収納" : "メンバー確認";
});
readyButton.addEventListener("click", () => {
  self.ready = !self.ready;
  readyButton.classList.toggle("active", self.ready);
  readyButton.querySelector("span")!.textContent = self.ready ? "準備解除" : "準備完了";
  send({ type: "ready", ready: self.ready });
});
copyInviteButton.addEventListener("click", copyInvite);
inviteButton.addEventListener("click", copyInvite);
updateLogButton.addEventListener("click", () => updateLogPanel.classList.add("open"));
closeUpdateLog.addEventListener("click", () => updateLogPanel.classList.remove("open"));
updateLogPanel.addEventListener("click", (event) => {
  if (event.target === updateLogPanel) updateLogPanel.classList.remove("open");
});
scoreboardToggle.addEventListener("click", () => scoreboard.classList.toggle("open"));
closeScoreboard.addEventListener("click", () => scoreboard.classList.remove("open"));
settingsButton.addEventListener("click", () => settingsPanel.classList.toggle("open"));
closeSettings.addEventListener("click", () => settingsPanel.classList.remove("open"));
audioUnlockButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  setSoundEnabled(true);
  void unlockAudio(true);
});
audioUnlockButton.addEventListener("click", () => {
  setSoundEnabled(true);
  void unlockAudio(true);
});
muteButton.addEventListener("click", () => setSoundEnabled(!soundEnabled));
soundToggle.addEventListener("click", () => setSoundEnabled(!soundEnabled));
resetButton.addEventListener("click", () => resetSelf());
donPunchButton.addEventListener("click", triggerDonPunch);
playerSlots.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-team-change]");
  if (!button || !self.joined) return;
  const team = button.dataset.teamChange;
  if (team !== "blue" && team !== "red") return;
  send({ type: "change_team", team, targetId: button.dataset.playerId || self.id });
});
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
  button.addEventListener("click", () => {
    const mode = (button.dataset.mode as GameMode) || "oneLife";
    if (self.joined) {
      requestRoomConfig(mode, teamChoice, cpuFillEnabled, relationMode);
      return;
    }
    setGameMode(mode);
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-team]")) {
  button.addEventListener("click", () => {
    const team = (button.dataset.team as TeamChoice) || "auto";
    if (self.joined) {
      requestRoomConfig(gameMode, team, cpuFillEnabled, relationMode);
      return;
    }
    setTeamChoice(team);
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-cpu-fill]")) {
  button.addEventListener("click", () => {
    const enabled = button.dataset.cpuFill !== "off";
    if (self.joined) {
      requestRoomConfig(gameMode, teamChoice, enabled, relationMode);
      return;
    }
    setCpuFill(enabled);
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-relation]")) {
  button.addEventListener("click", () => {
    const nextRelation = button.dataset.relation === "coop" ? "coop" : "versus";
    if (self.joined) {
      requestRoomConfig(gameMode, teamChoice, cpuFillEnabled, nextRelation);
      return;
    }
    setRelationMode(nextRelation);
  });
}

for (const button of partySelect.querySelectorAll<HTMLButtonElement>("[data-party]")) {
  button.addEventListener("click", () => {
    if (self.joined) {
      showToast("人数形式は次の自動マッチで反映されます。");
      return;
    }
    setPartySize(Number(button.dataset.party));
  });
}
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = sanitizeTextInput(chatInput.value, 80);
  if (!text || !self.joined) return;
  send({ type: "chat", text });
  chatInput.value = "";
});
for (const button of colorSwatches.querySelectorAll<HTMLButtonElement>("button")) {
  const color = button.dataset.color || "#1598f0";
  button.style.background = color;
  button.addEventListener("click", () => setCustomColor(color));
}
for (const button of skinSelect.querySelectorAll<HTMLButtonElement>("[data-skin]")) {
  button.addEventListener("click", () => setSkin(button.dataset.skin || "rounded"));
}
for (const button of cpuButtons.querySelectorAll<HTMLButtonElement>("button")) {
  button.addEventListener("click", () => {
    const count = Number(button.dataset.cpu) || 0;
    for (const item of cpuButtons.querySelectorAll<HTMLButtonElement>("button")) item.classList.toggle("active", item === button);
    setCpuFill(count !== 0);
    send({ type: "set_cpu", count });
  });
}
endCelebrationButton.addEventListener("click", () => endCelebration());

function isFullscreenActive() {
  return Boolean(document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement);
}

function isStandaloneDisplay() {
  return window.matchMedia("(display-mode: fullscreen)").matches
    || window.matchMedia("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function showPwaSplashIfNeeded() {
  if (!(isStandaloneDisplay() || launchParams.get("source") === "pwa" || installInviteRequested)) return;
  pwaSplash.classList.add("show");
  window.setTimeout(() => pwaSplash.classList.remove("show"), autoJoinInviteRequested ? 1450 : 1150);
}

function isCoarseLandscape() {
  return window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(orientation: landscape)").matches;
}

function isMobileLikeDevice() {
  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function showMobileFullscreenGuide(force = false) {
  if (!force && mobileGuideDismissed) return;
  if ((!force && !isCoarseLandscape()) || !isMobileLikeDevice() || isStandaloneDisplay() || isFullscreenActive()) {
    mobileFullscreenGuide.classList.remove("show");
    return;
  }
  const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  mobileGuideInstall.textContent = isAppleMobile ? "追加手順" : "アプリ化";
  if (installInviteRequested) {
    mobileFullscreenGuideText.textContent = isAppleMobile
      ? "このリンクはアプリ招待です。今すぐ遊ぶか、共有ボタンから「ホーム画面に追加」で次回はアプリ風に起動できます。"
      : "このリンクはアプリ招待です。今すぐ遊ぶか、「アプリ化」でホーム画面に追加できます。";
  } else {
    mobileFullscreenGuideText.textContent = isAppleMobile
      ? "Safariの共有ボタンから「ホーム画面に追加」して起動すると、上下のブラウザバーをほぼ消せます。"
      : "全画面ボタン、または「アプリ化」でホーム画面に追加すると、上下のブラウザバーを減らせます。";
  }
  mobileFullscreenGuide.classList.add("show");
  setTimeout(() => {
    if (!mobileGuideDismissed) mobileFullscreenGuide.classList.remove("show");
  }, force ? 9000 : 4200);
}

function updateFullscreenButton() {
  const active = isFullscreenActive() || isStandaloneDisplay();
  mobileFullscreen.innerHTML = active ? '<i data-lucide="minimize-2"></i>' : '<i data-lucide="maximize-2"></i>';
  mobileFullscreen.setAttribute("aria-label", active ? "全画面中" : "全画面");
  mobileInstall.classList.toggle("hidden", isStandaloneDisplay() || (!deferredInstallPrompt && !/iPad|iPhone|iPod/.test(navigator.userAgent)));
  createIcons({ icons: lucideIcons });
}

async function toggleMobileFullscreen() {
  try {
    if (isFullscreenActive()) {
      const exitFullscreen = document.exitFullscreen?.bind(document);
      const webkitExitFullscreen = (document as Document & { webkitExitFullscreen?: () => Promise<void> | void }).webkitExitFullscreen?.bind(document);
      await (exitFullscreen?.() || webkitExitFullscreen?.());
    } else {
      const target = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
      const requestFullscreen = target.requestFullscreen?.bind(target);
      const webkitRequestFullscreen = target.webkitRequestFullscreen?.bind(target);
      if (!requestFullscreen && !webkitRequestFullscreen) {
        showMobileFullscreenGuide(true);
        showToast("このブラウザではホーム画面から起動すると上下バーを減らせます。");
        return;
      }
      await (requestFullscreen?.({ navigationUI: "hide" }) || webkitRequestFullscreen?.());
    }
    updateFullscreenButton();
  } catch {
    showMobileFullscreenGuide(true);
    showToast("全画面にできませんでした。ホーム画面から起動すると上下バーを減らせます。");
  }
}

async function requestMobileInstall() {
  if (deferredInstallPrompt) {
    await deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    updateFullscreenButton();
    return;
  }
  showMobileFullscreenGuide(true);
  showToast("iPhoneは共有から「ホーム画面に追加」でアプリ化できます。");
}

mobileFullscreen.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleMobileFullscreen();
});
document.addEventListener("fullscreenchange", updateFullscreenButton);
document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event as BeforeInstallPromptEvent;
  updateFullscreenButton();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  mobileGuideDismissed = true;
  localStorage.setItem("toybox-mobile-fullscreen-guide", "off");
  updateFullscreenButton();
});
mobileInstall.addEventListener("pointerdown", async (event) => {
  event.preventDefault();
  event.stopPropagation();
  await requestMobileInstall();
});
mobileGuidePlay.addEventListener("click", () => {
  mobileGuideDismissed = true;
  localStorage.setItem("toybox-mobile-fullscreen-guide", "off");
  mobileFullscreenGuide.classList.remove("show");
  if (roomInput.value.trim()) {
    joinTypedRoom();
    return;
  }
  createRoomButton.click();
});
mobileGuideInstall.addEventListener("click", () => {
  void requestMobileInstall();
});
mobileGuideClose.addEventListener("click", () => {
  mobileGuideDismissed = true;
  localStorage.setItem("toybox-mobile-fullscreen-guide", "off");
  mobileFullscreenGuide.classList.remove("show");
});
document.addEventListener("contextmenu", (event) => {
  const target = event.target as Node | null;
  if (target && (canvas.contains(target) || mobileAimZone.contains(target) || mobileStick.contains(target))) {
    event.preventDefault();
  }
});
const isTextEntryTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest("input, textarea, [contenteditable='true']"));
const preventMobileGesture = (event: Event) => {
  if (isTextEntryTarget(event.target)) return;
  event.preventDefault();
};
let lastTouchEndAt = 0;
document.addEventListener("gesturestart", preventMobileGesture, { passive: false });
document.addEventListener("gesturechange", preventMobileGesture, { passive: false });
document.addEventListener("gestureend", preventMobileGesture, { passive: false });
document.addEventListener("touchmove", (event) => {
  if (isTextEntryTarget(event.target)) return;
  if (event.touches.length > 1) event.preventDefault();
}, { passive: false });
document.addEventListener("touchend", (event) => {
  if (isTextEntryTarget(event.target)) return;
  const now = Date.now();
  if (now - lastTouchEndAt < 360) event.preventDefault();
  lastTouchEndAt = now;
}, { passive: false });
document.addEventListener("selectstart", (event) => {
  if (!isTextEntryTarget(event.target)) event.preventDefault();
});
window.addEventListener("orientationchange", () => setTimeout(() => showMobileFullscreenGuide(installInviteRequested), 700));
setTimeout(() => showMobileFullscreenGuide(installInviteRequested), 1000);
updateFullscreenButton();

function applyMobileTuning() {
  mobileAimSensitivityValue = THREE.MathUtils.clamp(Number(mobileSensitivity.value) || 1, 0.65, 1.65);
  mobileFireSizeValue = THREE.MathUtils.clamp(Number(mobileFireSize.value) || 88, 72, 96);
  mobileJumpOffsetValue = THREE.MathUtils.clamp(Number(mobileJumpOffset.value) || 128, 96, 176);
  localStorage.setItem("toybox-mobile-sensitivity", String(mobileAimSensitivityValue));
  localStorage.setItem("toybox-mobile-fire-size", String(mobileFireSizeValue));
  localStorage.setItem("toybox-mobile-jump-offset", String(mobileJumpOffsetValue));
  document.documentElement.style.setProperty("--mobile-fire-size", `${mobileFireSizeValue}px`);
  document.documentElement.style.setProperty("--mobile-jump-right", `${mobileJumpOffsetValue}px`);
}

mobileSensitivity.value = String(mobileAimSensitivityValue);
mobileFireSize.value = String(mobileFireSizeValue);
mobileJumpOffset.value = String(mobileJumpOffsetValue);
for (const input of [mobileSensitivity, mobileFireSize, mobileJumpOffset]) {
  input.addEventListener("input", applyMobileTuning);
}
applyMobileTuning();

function applyMobileAimDelta(dx: number, dy: number, scale = 1) {
  const filteredX = Math.abs(dx) < 0.35 ? 0 : dx;
  const filteredY = Math.abs(dy) < 0.35 ? 0 : dy;
  const magnitude = Math.hypot(filteredX, filteredY);
  const accel = 1 + Math.min(0.55, magnitude / 84);
  const scopeScale = scoped ? 0.7 : 1;
  mobileAimVelocityX = THREE.MathUtils.lerp(mobileAimVelocityX, filteredX, 0.38);
  mobileAimVelocityY = THREE.MathUtils.lerp(mobileAimVelocityY, filteredY, 0.38);
  self.yaw -= mobileAimVelocityX * 0.0038 * mobileAimSensitivityValue * accel * scopeScale * scale;
  self.pitch -= mobileAimVelocityY * 0.0033 * mobileAimSensitivityValue * accel * scopeScale * scale;
  self.pitch = THREE.MathUtils.clamp(self.pitch, -1.15, 1.1);
}

function isGameplayTouchTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest(
    "button, input, textarea, select, [contenteditable='true'], .join-panel, .settings-panel, .scoreboard, .chat-panel, .poker-panel, .lobby-strip"
  ));
}

function capturePointer(element: HTMLElement, pointerId: number) {
  try {
    element.setPointerCapture?.(pointerId);
  } catch {
    // Some mobile browsers only allow capture on the original pointerdown target.
  }
}

function beginFloatingMobileStick(event: PointerEvent) {
  const { width } = viewportSize();
  if (!self.joined || mobileStickPointer !== null || event.pointerType !== "touch") return;
  if (mobileAimPointer === event.pointerId || mobileFirePointer === event.pointerId) return;
  if (isGameplayTouchTarget(event.target)) return;
  if (event.clientX > width * 0.44 || event.clientY < 54) return;
  event.preventDefault();
  mobileStickPointer = event.pointerId;
  mobileStickOriginX = event.clientX;
  mobileStickOriginY = event.clientY;
  mobileStick.classList.add("floating");
  mobileStick.style.left = `${event.clientX - mobileStick.clientWidth / 2}px`;
  mobileStick.style.top = `${event.clientY - mobileStick.clientHeight / 2}px`;
  mobileStick.style.bottom = "auto";
  capturePointer(mobileStick, event.pointerId);
  updateMobileStick(event);
}

mobileAimZone.addEventListener("pointerdown", (event) => {
  if (!self.joined || mobileAimPointer !== null) return;
  event.preventDefault();
  mobileAimPointer = event.pointerId;
  mobileAimLastX = event.clientX;
  mobileAimLastY = event.clientY;
  capturePointer(mobileAimZone, event.pointerId);
});
mobileAimZone.addEventListener("pointermove", (event) => {
  if (mobileAimPointer !== event.pointerId || !self.joined) return;
  event.preventDefault();
  const dx = event.clientX - mobileAimLastX;
  const dy = event.clientY - mobileAimLastY;
  mobileAimLastX = event.clientX;
  mobileAimLastY = event.clientY;
  applyMobileAimDelta(dx, dy);
});
const releaseMobileAim = (event: PointerEvent) => {
  if (mobileAimPointer === event.pointerId) {
    mobileAimPointer = null;
    mobileAimVelocityX = 0;
    mobileAimVelocityY = 0;
  }
};
mobileAimZone.addEventListener("pointerup", releaseMobileAim);
mobileAimZone.addEventListener("pointercancel", releaseMobileAim);
mobileAimZone.addEventListener("lostpointercapture", (event) => {
  releaseMobileAim(event);
});

function clearMobileMoveKeys() {
  keys.delete("KeyW");
  keys.delete("KeyA");
  keys.delete("KeyS");
  keys.delete("KeyD");
}

function updateMobileStick(event: PointerEvent) {
  const rect = mobileStick.getBoundingClientRect();
  const centerX = mobileStickOriginX || rect.left + rect.width / 2;
  const centerY = mobileStickOriginY || rect.top + rect.height / 2;
  const max = rect.width * 0.36;
  const rawX = event.clientX - centerX;
  const rawY = event.clientY - centerY;
  const distance = Math.min(max, Math.hypot(rawX, rawY));
  const angle = Math.atan2(rawY, rawX);
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  const nx = x / max;
  const ny = y / max;

  mobileMoveIntensity = THREE.MathUtils.clamp(distance / max, 0, 1);
  mobileMoveX = Math.abs(nx) < 0.12 ? 0 : nx;
  mobileMoveY = Math.abs(ny) < 0.12 ? 0 : ny;
  mobileStickKnob.style.transform = `translate(${x}px, ${y}px)`;
  clearMobileMoveKeys();
  if (ny < -0.18) keys.add("KeyW");
  if (ny > 0.25) keys.add("KeyS");
  if (nx < -0.22) keys.add("KeyA");
  if (nx > 0.22) keys.add("KeyD");
  if (ny < -0.76 && mobileMoveIntensity > 0.82) sprintUntil = performance.now() + 420;
}

function releaseMobileStick() {
  mobileStickPointer = null;
  mobileStickOriginX = 0;
  mobileStickOriginY = 0;
  mobileMoveIntensity = 0;
  mobileMoveX = 0;
  mobileMoveY = 0;
  clearMobileMoveKeys();
  mobileStickKnob.style.transform = "translate(0, 0)";
  mobileStick.classList.remove("floating");
  mobileStick.style.left = "";
  mobileStick.style.top = "";
  mobileStick.style.bottom = "";
}

mobileStick.addEventListener("pointerdown", (event) => {
  if (!self.joined) return;
  event.preventDefault();
  event.stopPropagation();
  mobileStickPointer = event.pointerId;
  const rect = mobileStick.getBoundingClientRect();
  mobileStickOriginX = rect.left + rect.width / 2;
  mobileStickOriginY = rect.top + rect.height / 2;
  capturePointer(mobileStick, event.pointerId);
  updateMobileStick(event);
});
mobileStick.addEventListener("pointermove", (event) => {
  if (mobileStickPointer !== event.pointerId) return;
  event.preventDefault();
  event.stopPropagation();
  updateMobileStick(event);
});
mobileStick.addEventListener("pointerup", (event) => {
  if (mobileStickPointer === event.pointerId) releaseMobileStick();
});
mobileStick.addEventListener("pointercancel", (event) => {
  if (mobileStickPointer === event.pointerId) releaseMobileStick();
});
mobileStick.addEventListener("lostpointercapture", releaseMobileStick);
document.addEventListener("pointermove", (event) => {
  if (mobileStickPointer !== event.pointerId || !mobileStick.classList.contains("floating")) return;
  event.preventDefault();
  updateMobileStick(event);
}, { passive: false });
document.addEventListener("pointerup", (event) => {
  if (mobileStickPointer === event.pointerId) releaseMobileStick();
});
document.addEventListener("pointercancel", (event) => {
  if (mobileStickPointer === event.pointerId) releaseMobileStick();
});
document.addEventListener("pointerdown", beginFloatingMobileStick, { passive: false });

mobileFire.addEventListener("pointerdown", (event) => {
  if (mobileFirePointer !== null) return;
  event.preventDefault();
  event.stopPropagation();
  mobileFiring = true;
  mobileFirePointer = event.pointerId;
  mobileFireLastX = event.clientX;
  mobileFireLastY = event.clientY;
  capturePointer(mobileFire, event.pointerId);
  if (findMobileAimTarget()) shoot();
});
mobileFire.addEventListener("pointermove", (event) => {
  if (mobileFirePointer !== event.pointerId || !mobileFiring) return;
  event.preventDefault();
  event.stopPropagation();
  const dx = event.clientX - mobileFireLastX;
  const dy = event.clientY - mobileFireLastY;
  mobileFireLastX = event.clientX;
  mobileFireLastY = event.clientY;
  applyMobileAimDelta(dx, dy, 0.58);
});
const releaseMobileFire = (event?: PointerEvent) => {
  if (event && mobileFirePointer !== event.pointerId) return;
  mobileFiring = false;
  mobileFirePointer = null;
};
mobileFire.addEventListener("pointerup", releaseMobileFire);
mobileFire.addEventListener("pointercancel", releaseMobileFire);
mobileFire.addEventListener("lostpointercapture", releaseMobileFire);
mobileJump.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (activeVehicleId) mobileBraking = true;
  else {
    jumpQueued = true;
    pulseHaptic(12);
  }
});
const releaseMobileBrake = () => {
  mobileBraking = false;
};
mobileJump.addEventListener("pointerup", releaseMobileBrake);
mobileJump.addEventListener("pointercancel", releaseMobileBrake);
mobileJump.addEventListener("lostpointercapture", releaseMobileBrake);
mobileHeal.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  useHealPack();
});
mobileWeapon.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  switchGun(currentGunIndex + 1);
});
mobileReload.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  reload();
});
mobileScope.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (!isScopedGun()) {
    showToast("DMR/AWMのみスコープ");
    return;
  }
  scoped = !scoped;
  document.body.classList.toggle("scoped", scoped);
});
mobilePing.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  sendTeamPing();
});
mobileSkill.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  triggerDonPunch();
});
mobileInteract.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleVehicleInteraction();
});
setCustomColor(customColor);
setSoundEnabled(soundEnabled);
setGameMode(gameMode);
setTeamChoice(teamChoice);
setArenaChoice(arenaChoice);
setPartySize(partySize);
setCpuFill(cpuFillEnabled);
setRelationMode(relationMode);
setSkin(currentSkin);
showPwaSplashIfNeeded();
if (loggedInLoginId) {
  loginStatus.textContent = "自動ログイン中";
  void requestProfile("login").catch(() => {
    loginStatus.textContent = "未ログイン";
  });
}
window.setTimeout(maybeStartInviteAutoJoin, autoJoinInviteRequested ? 650 : 0);
void refreshOnlinePlayers();
setInterval(() => {
  if (!self.joined) void refreshOnlinePlayers();
}, 3500);

function triggerDonPunch() {
  send({ type: "donpunch" });
}

function useHealPack() {
  const me = players.get(self.id);
  if (!me || me.eliminated || me.health <= 0 || me.creative) return;
  if ((me.healPacks ?? 0) <= 0) {
    showToast("回復アイテムがありません");
    return;
  }
  if (me.health >= maxHealth) {
    showToast("HPは満タンです");
    return;
  }
  send({ type: "use_heal" });
}

function sanitizeRoomCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function sanitizeTextInput(value: unknown, maxLength: number, fallback = "") {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const clipped = [...normalized].slice(0, maxLength).join("").trim();
  return clipped || fallback;
}

function sanitizePlayerNameInput() {
  return sanitizeTextInput(nameInput.value, 14, "プレイヤー").replace(/[<>]/g, "").trim() || "プレイヤー";
}

function joinTypedRoom() {
  const code = sanitizeRoomCode(roomInput.value);
  roomInput.value = globalFpsRoomCode;
  if (code && code !== globalFpsRoomCode) showToast(`FPSは共通ルーム ${globalFpsRoomCode} に入室します`);
  join(globalFpsRoomCode);
}

function joinTypedPokerRoom() {
  const code = sanitizeRoomCode(roomInput.value);
  roomInput.value = code;
  if (code.length !== 6) {
    showToast("6文字のポーカールームコードを入力してください");
    roomInput.focus();
    return;
  }
  joinPoker(code);
}

function joinPoker(room: string) {
  const name = sanitizePlayerNameInput();
  nameInput.value = name;
  localStorage.setItem("toybox-name", name);
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();
  self.joined = false;
  pokerJoined = false;
  pokerSelfId = "";
  latestPokerSnapshot = null;
  const code = sanitizeRoomCode(room);
  if (code) roomInput.value = code;
  socket = new WebSocket(appWebSocketUrl());
  socket.addEventListener("open", () => {
    send({ type: "poker_join", name, room: code, cpuCount: pokerCpuCount, loginId: loggedInLoginId, cosmeticColor: customColor, skin: currentSkin, progress: progressState, inventory: profileInventory });
  });
  socket.addEventListener("message", handleMessage);
  socket.addEventListener("error", () => {
    if (!pokerJoined) showToast("オンライン接続に失敗しました。通信を確認してください。");
  });
  socket.addEventListener("close", () => {
    if (pokerJoined) showToast("ポーカールームから切断されました。");
  });
}

function leavePokerRoom() {
  pokerJoined = false;
  pokerSelfId = "";
  pokerRoomCode = "";
  latestPokerSnapshot = null;
  setFpsActive(false);
  pokerPanel.classList.remove("open");
  document.body.classList.remove("poker-open");
  joinPanel.classList.remove("hidden");
  history.replaceState(null, "", location.pathname);
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();
  socket = null;
  updateLobbyBgm();
}

function currentPokerRaiseAmount() {
  const parsed = Math.floor(Number(pokerRaiseAmountInput.value) || 0);
  const minimum = Math.max(20, Number(pokerRaiseAmountInput.min) || 20);
  const maximum = Math.max(minimum, Number(pokerRaiseAmountInput.max) || minimum);
  return Math.min(Math.max(parsed, minimum), maximum);
}

function sendPokerAction(action: "fold" | "call" | "raise", raiseBy = 0) {
  if (!pokerJoined) return;
  send({ type: "poker_action", action, raiseBy });
}

function sendPokerJanken(choice: string) {
  if (!pokerJoined) return;
  send({ type: "poker_janken", choice });
}

function join(room: string) {
  const name = sanitizePlayerNameInput();
  nameInput.value = name;
  localStorage.setItem("toybox-name", name);
  localStorage.setItem("toybox-skin", currentSkin);
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();

  const fpsRoom = globalFpsRoomCode;
  roomInput.value = fpsRoom;
  localStorage.setItem(inviteRoomStorageKey, fpsRoom);
  socket = new WebSocket(appWebSocketUrl());
  socket.addEventListener("open", () => {
    send({ type: "join", name, room: fpsRoom, gameMode, arena: arenaChoice, team: teamChoice, partySize, cpuFill: cpuFillEnabled, relationMode, cosmeticColor: customColor, skin: currentSkin, loginId: loggedInLoginId, progress: progressState, inventory: profileInventory });
  });
  socket.addEventListener("message", handleMessage);
  socket.addEventListener("error", () => {
    if (!self.joined) showToast("オンライン接続に失敗しました。通信を確認してください。");
  });
  socket.addEventListener("close", () => {
    if (self.joined) showToast("接続が切れました。再参加してください。");
  });
}

function maybeStartInviteAutoJoin() {
  if (!autoJoinInviteRequested || inviteAutoJoinStarted || self.joined || pokerJoined) return;
  inviteAutoJoinStarted = true;
  if (invitePlayMode === "poker") {
    const code = sanitizeRoomCode(roomInput.value || initialRoomCode);
    if (code.length === 6) {
      roomInput.value = code;
      joinPoker(code);
      return;
    }
  }
  roomInput.value = globalFpsRoomCode;
  join(globalFpsRoomCode);
}

function handleMessage(event: MessageEvent<string>) {
  let message: Record<string, any>;
  try {
    message = JSON.parse(event.data);
  } catch {
    showToast("不正な通信データを無視しました。");
    return;
  }
  if (!message || typeof message !== "object") return;
  if (message.type === "poker_welcome") {
    setFpsActive(false);
    pokerJoined = true;
    pokerSelfId = String(message.id || "");
    pokerRoomCode = String(message.room || "");
    roomInput.value = pokerRoomCode;
    pokerRoomCodeEl.textContent = pokerRoomCode;
    roomCodeEl.textContent = pokerRoomCode;
    joinPanel.classList.add("hidden");
    pokerPanel.classList.add("open");
    document.body.classList.add("poker-open");
    updateLobbyBgm();
    history.replaceState(null, "", `?room=${pokerRoomCode}`);
    if (message.profile) applyLoginProfile(message.profile as LoginProfile);
    touchProgressSession("poker");
    showToast("テキサスポーカーに参加しました。");
    return;
  }
  if (message.type === "poker_snapshot") {
    latestPokerSnapshot = message as PokerSnapshot;
    const pokerMe = latestPokerSnapshot.players.find((player) => player.id === latestPokerSnapshot?.selfId);
    if (loggedInLoginId && pokerMe && pokerMe.chips !== profileInventory.pokerDon) {
      profileInventory.pokerDon = THREE.MathUtils.clamp(Math.floor(pokerMe.chips), 0, 999999);
      saveProfileInventory();
      renderProgressCard();
    }
    renderPoker(latestPokerSnapshot);
    awardPokerProgress(latestPokerSnapshot);
    return;
  }
  if (message.type === "poker_error") {
    showToast(String(message.message || "ポーカーエラー"));
    return;
  }
  if (message.type === "poker_janken_result") {
    showToast(`CPじゃんけん ${message.result} / +${message.amount}Don`);
    return;
  }
  if (message.type === "welcome") {
    self.id = message.id;
    self.room = message.room;
    self.joined = true;
    if (lobbyReturnTimer) {
      window.clearTimeout(lobbyReturnTimer);
      lobbyReturnTimer = 0;
    }
    resultWinnerSeen = "";
    resultPanel.classList.remove("open");
    self.position.set(message.spawn.x, message.spawn.y, message.spawn.z);
    self.yaw = typeof message.spawn.yaw === "number" ? message.spawn.yaw : Math.atan2(message.spawn.x, message.spawn.z);
    self.pitch = 0;
    flowScore = 0;
    flowCombo = 0;
    flowUntil = 0;
    lastFlowAt = 0;
    lastSelfKills = 0;
    lastSelfScore = 0;
    lastSelfHealth = maxHealth;
    updateFlowHud(performance.now());
    gameMode = (message.gameMode as GameMode) || "oneLife";
    arenaChoice = "toybox";
    if (message.partySize) setPartySize(Number(message.partySize));
    if (typeof message.cpuFill === "boolean") setCpuFill(message.cpuFill);
    if (message.relationMode) setRelationMode(message.relationMode as RelationMode);
    matchMaxPlayers = Number(message.maxPlayers) || 20;
    targetScore = Number(message.targetScore) || 0;
    setGameMode(gameMode);
    setArenaChoice(arenaChoice);
    switchArena(arenaChoice);
    setTeamChoice((message.team as TeamChoice) || teamChoice);
    if (message.profile) applyLoginProfile(message.profile as LoginProfile);
    roomCodeEl.textContent = self.room;
    roomInput.value = self.room;
    joinPanel.classList.add("hidden");
    setFpsActive(true);
    updateLobbyBgm();
    history.replaceState(null, "", `?room=${self.room}`);
    touchProgressSession("fps");
    showToast("ルームに参加しました。画面をクリックして開始。");
    ping();
    return;
  }
  if (message.type === "snapshot") {
    if (typeof message.now === "number") serverClockOffsetMs = Number(message.now) - Date.now();
    if (typeof message.targetScore === "number") targetScore = message.targetScore || 0;
    if (message.partySize) setPartySize(Number(message.partySize));
    if (typeof message.cpuFill === "boolean") setCpuFill(message.cpuFill);
    if (message.relationMode) setRelationMode(message.relationMode as RelationMode);
    if (message.maxPlayers) matchMaxPlayers = Number(message.maxPlayers) || matchMaxPlayers;
    if (message.gameMode) setGameMode(message.gameMode as GameMode);
    if (message.arena) {
      arenaChoice = "toybox";
      setArenaChoice(arenaChoice);
      switchArena(arenaChoice);
    }
    if (!message.winner) {
      resultWinnerSeen = "";
      resultPanel.classList.remove("open");
    }
    castleEndsAt = Number(message.castleEndsAt) || 0;
    if (gameMode === "castle" && castleEndsAt && typeof message.now === "number") {
      roundSeconds = Math.max(0, (castleEndsAt - Number(message.now)) / 1000);
    }
    syncVehicleSnapshots((message.vehicles || []) as VehicleSnapshot[]);
    syncSafeZone(message.safeZone as SafeZoneSnapshot | undefined);
    const previousVehicleId = activeVehicleId;
    players.clear();
    for (const player of message.players as PlayerState[]) players.set(player.id, player);
    const me = players.get(self.id);
    if (me) {
      self.health = me.health;
      activeVehicleId = me.vehicleId || "";
      if (!activeVehicleId && previousVehicleId) {
        self.position.set(me.x, me.y, me.z);
        self.velocity.set(0, 0, 0);
        lastSafePosition.copy(self.position);
      }
      setTeamChoice(me.color);
      if (loggedInLoginId && typeof me.healPacks === "number" && me.healPacks !== profileInventory.healPacks) {
        profileInventory.healPacks = THREE.MathUtils.clamp(Math.floor(me.healPacks), 0, 12);
        saveProfileInventory();
        renderProgressCard();
      }
    }
    const snapshotCores = message.castleCores as Record<PlayerColor, CastleCoreSnapshot> | undefined;
    blueScoreEl.textContent = gameMode === "castle" && snapshotCores?.blue ? String(Math.ceil(snapshotCores.blue.health)) : String(message.blueScore);
    redScoreEl.textContent = gameMode === "castle" && snapshotCores?.red ? String(Math.ceil(snapshotCores.red.health)) : String(message.redScore);
    if (message.winner) {
      const winner = message.winner.name || "勝利チーム";
      startCelebration(winner);
      showResults(winner);
    }
    syncDonPunchSnapshots((message.donPunches || []) as DonPunchSnapshot[]);
    updateCastleCores(snapshotCores);
    updateBarrierPowerup(message.barrier as BarrierSnapshot | undefined);
    updateHealthPickup(message.healthPickup as HealthPickupSnapshot | undefined);
    updatePowerups((message.powerups || []) as PowerupSnapshot[]);
    updateSpectatorState();
    updateHud(message.feed || []);
    updateChat(message.chat || []);
    return;
  }
  if (message.type === "room_config") {
    if (typeof message.targetScore === "number") targetScore = message.targetScore || 0;
    if (message.gameMode) setGameMode(message.gameMode as GameMode);
    if (typeof message.cpuFill === "boolean") setCpuFill(message.cpuFill);
    if (message.relationMode) setRelationMode(message.relationMode as RelationMode);
    castleEndsAt = Number(message.castleEndsAt) || 0;
    updateCastleCores(message.castleCores as Record<PlayerColor, CastleCoreSnapshot> | undefined);
    updateFeed(message.feed || []);
    showToast("ホスト設定を反映しました。");
    return;
  }
  if (message.type === "feed") updateFeed(message.feed || []);
  if (message.type === "chat") updateChat(message.chat || (message.item ? [message.item] : []));
  if (message.type === "shot") addTracer(
    message.origin,
    message.direction,
    message.shooter === self.id,
    Number(message.range) || 70,
    guns.find((gun) => gun.kind === message.weapon)?.tracerColor
  );
  if (message.type === "hit" && (message.target === self.id || message.shooter === self.id)) {
    const damagedSelf = message.target === self.id;
    const damage = Number(message.damage) || 0;
    const blocked = Boolean(message.blocked);
    showHitIndicator(damagedSelf, damage, blocked);
    pushDamageNotice(damagedSelf ? "taken" : "dealt", damage, message.weapon, damagedSelf ? message.shooter : message.target, blocked);
    pulseHaptic(blocked ? 12 : damagedSelf ? 32 : 16);
    if (damagedSelf && damage > 0) playDamageSound();
  }
  if (message.type === "death_info") showKillcam(message);
  if (message.type === "sound") playGameSound(message.sound);
  if (message.type === "focus_task") {
    const text = String(message.text || "フォーカス達成");
    showToast(text);
    addFlowReward(18, text);
  }
  if (message.type === "powerup") applyPowerupPickup(message.kind as PowerupKind);
  if (message.type === "team_ping") addTeamPing(message.ping as TeamPingSnapshot | undefined);
  if (message.type === "vehicle_damage") {
    const damage = Number(message.damage) || 0;
    showHitIndicator(true, damage, false);
    pushDamageNotice("taken", damage, "ROADSTER", message.vehicleId, false);
    playVehicleDamageSound();
    pulseHaptic(34);
  }
  if (message.type === "vehicle_repair") {
    playHealSound();
    showToast("ロードスター修理中");
  }
  if (message.type === "vehicle_destroyed") {
    spawnFireworkBurst(new THREE.Vector3(Number(message.x) || 0, Number(message.y) || 0.9, Number(message.z) || 0), 0xff8a3d);
    playVehicleExplosionSound();
  }
  if (message.type === "vehicle_status") {
    activeVehicleId = String(message.vehicleId || "");
    if (!activeVehicleId && message.spawn) {
      self.position.set(Number(message.spawn.x) || 0, Number(message.spawn.y) || 1.6, Number(message.spawn.z) || 0);
      self.velocity.set(0, 0, 0);
      lastSafePosition.copy(self.position);
      showToast("ロードスターから降りました");
    } else if (activeVehicleId) {
      showToast("ロードスターに乗りました");
    }
  }
  if (message.type === "impact") addBulletDecal(message.point, message.normal, message.shooter === self.id);
  if (message.type === "ashinaga") addAshinagaBurst(message.origin, message.target, message.shooter === self.id);
  if (message.type === "donpunch") showToast("ドンパンチ接近");
  if (message.type === "respawn" && message.target === self.id) {
    self.position.set(message.spawn.x, message.spawn.y, message.spawn.z);
    lastSafePosition.copy(self.position);
    self.yaw = typeof message.spawn.yaw === "number" ? message.spawn.yaw : self.yaw;
    self.pitch = 0;
    self.velocity.set(0, 0, 0);
    self.health = maxHealth;
    spectatorCard.classList.remove("show");
    showToast("リスポーン");
  }
  if (message.type === "celebration") {
    const winner = message.winner?.name || "勝利チーム";
    startCelebration(winner);
    showResults(winner);
  }
  if (message.type === "pong") {
    const sentAt = Number(message.at);
    if (Number.isFinite(sentAt) && sentAt > 0) {
      self.latency = Math.max(0, performance.now() - sentAt);
    }
  }
  if (message.type === "error") showToast(message.message);
}

function send(payload: Record<string, unknown>) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

async function refreshOnlinePlayers() {
  try {
    const response = await fetch(appHttpUrl("/health"), { cache: "no-store" });
    const data = await response.json();
    const onlinePlayers = Array.isArray(data.players) ? data.players.slice(0, 10) : [];
    onlinePlayersEl.innerHTML = onlinePlayers.length
      ? onlinePlayers
        .map((player: { name?: string; room?: string; score?: number }) => (
          `<span>${escapeHtml(String(player.name || "Player"))}<small>${escapeHtml(String(player.room || "------"))} / ${Number(player.score) || 0}pt</small></span>`
        ))
        .join("")
      : "<em>現在オンラインのプレイヤーはいません</em>";
  } catch {
    onlinePlayersEl.innerHTML = "<em>オンライン情報を取得できません</em>";
  }
}

function setCustomColor(color: string) {
  customColor = color;
  localStorage.setItem("toybox-color", color);
  document.documentElement.style.setProperty("--self-color", color);
  for (const button of colorSwatches.querySelectorAll<HTMLButtonElement>("button")) {
    button.classList.toggle("active", button.dataset.color === color);
  }
  send({ type: "customize", cosmeticColor: color, skin: currentSkin });
  scheduleProfileSync();
}

function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  localStorage.setItem("toybox-sound", enabled ? "on" : "off");
  soundToggle.textContent = enabled ? "ON" : "OFF";
  muteButton.classList.toggle("active", !enabled);
  if (enabled && navigator.userActivation?.isActive) void unlockAudio();
  else if (enabled) updateLobbyBgm();
  else lobbyBgm.pause();
  syncAudioDataset();
}

function isLobbyBgmAllowed() {
  return soundEnabled && !document.hidden && !self.joined && !joinPanel.classList.contains("hidden");
}

function getAudioContext() {
  if (!soundEnabled) return null;
  const audioWindow = window as Window &
    typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const AudioContextCtor = window.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext ||= new AudioContextCtor();
  return audioContext;
}

function unlockAudio(force = false) {
  if (!soundEnabled) return Promise.resolve();
  if (audioUnlocking && !force) return audioUnlocking;
  audioUnlocking = null;
  const context = getAudioContext();
  const resumePromise = context && context.state !== "running"
    ? context.resume().catch(() => undefined)
    : Promise.resolve();

  if (context && !audioUnlocked) {
    try {
      const buffer = context.createBuffer(1, 1, context.sampleRate);
      const source = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = 0.0001;
      source.buffer = buffer;
      source.connect(gain).connect(context.destination);
      source.start(0);
    } catch {
      // Some browsers reject silent unlock nodes while the context is still suspended.
    }
  }

  const wantsLobbyBgm = isLobbyBgmAllowed() && lobbyBgm.paused;
  if (wantsLobbyBgm) lobbyBgm.load();
  const bgmPromise = wantsLobbyBgm
    ? lobbyBgm.play().catch(() => undefined)
    : Promise.resolve();

  audioUnlocking = Promise.race([
    Promise.all([resumePromise, bgmPromise]).then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, 650))
  ]).then(() => {
    audioUnlocked = context?.state === "running";
    if (force && context?.state === "running") playUnlockChirp(context);
    syncAudioDataset();
  }).finally(() => {
    audioUnlocking = null;
  });
  return audioUnlocking;
}

function syncAudioDataset() {
  const contextState = audioContext?.state || "none";
  const needsUnlock = !soundEnabled || contextState !== "running";
  document.documentElement.dataset.soundEnabled = soundEnabled ? "true" : "false";
  document.documentElement.dataset.audioContext = contextState;
  document.documentElement.dataset.audioUnlocked = audioUnlocked ? "true" : "false";
  document.documentElement.dataset.lobbyAudio = lobbyBgm.paused ? "paused" : "playing";
  document.body.classList.toggle("audio-needs-unlock", needsUnlock);
}

function playUnlockChirp(context: AudioContext) {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(660, now);
  oscillator.frequency.exponentialRampToValueAtTime(1180, now + 0.11);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.15);
}

function updateLobbyBgm() {
  if (!isLobbyBgmAllowed()) {
    lobbyBgm.pause();
    return;
  }
  if (!lobbyBgm.paused) return;
  void unlockAudio();
}

function setFpsActive(active: boolean) {
  document.body.classList.toggle("game-active", active);
  if (!active) {
    document.body.classList.remove("members-open");
    scoreboard.classList.remove("open");
    settingsPanel.classList.remove("open");
  }
}

(window as Window &
  typeof globalThis & {
    __toyboxAudioState?: () => {
      soundEnabled: boolean;
      contextState: string;
      unlocked: boolean;
      lobbyPaused: boolean;
      lobbyReadyState: number;
    };
  }).__toyboxAudioState = () => ({
  soundEnabled,
  contextState: audioContext?.state || "none",
  unlocked: audioUnlocked,
  lobbyPaused: lobbyBgm.paused,
  lobbyReadyState: lobbyBgm.readyState
});

function playTone(frequency: number, duration = 0.07, volume = 0.04) {
  const context = getAudioContext();
  if (!context) return;
  void unlockAudio();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "square";
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function playSweep(start: number, end: number, duration: number, volume = 0.045, type: OscillatorType = "sine") {
  const context = getAudioContext();
  if (!context) return;
  void unlockAudio();
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(start, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playNoiseHit(duration = 0.12, volume = 0.08, frequency = 360) {
  const context = getAudioContext();
  if (!context) return;
  void unlockAudio();
  const now = context.currentTime;
  const samples = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, samples, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / samples);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = 1.1;
  const gain = context.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.connect(filter).connect(gain).connect(context.destination);
  source.start(now);
  source.stop(now + duration);
}

function playDamageSound() {
  playNoiseHit(0.16, 0.12, 260);
  playSweep(170, 74, 0.18, 0.05, "sawtooth");
}

function playVehicleDamageSound() {
  playNoiseHit(0.11, 0.07, 510);
  playSweep(240, 130, 0.12, 0.036, "square");
}

function playVehicleExplosionSound() {
  playNoiseHit(0.32, 0.16, 190);
  playSweep(110, 42, 0.34, 0.09, "sawtooth");
}

function playRunSound() {
  playNoiseHit(0.045, 0.026, 155);
  playSweep(90, 64, 0.04, 0.018, "triangle");
}

function playReloadSound() {
  playSweep(520, 270, 0.08, 0.035, "triangle");
  window.setTimeout(() => playSweep(330, 760, 0.09, 0.026, "square"), 95);
}

function playJumpSound() {
  playSweep(180, 430, 0.13, 0.042, "triangle");
}

function playBarrierSound() {
  playSweep(420, 1080, 0.18, 0.048, "sine");
  window.setTimeout(() => playSweep(620, 1480, 0.22, 0.034, "triangle"), 55);
}

function playHealSound() {
  playSweep(310, 620, 0.1, 0.038, "sine");
  window.setTimeout(() => playSweep(520, 980, 0.13, 0.034, "sine"), 85);
}

function playGameSound(name: unknown) {
  if (name === "barrier") playBarrierSound();
  if (name === "heal") playHealSound();
}

function playGunSound(gun: Gun) {
  const context = getAudioContext();
  if (!context) return;
  void unlockAudio();
  if (!shotNoiseBuffer) {
    shotNoiseBuffer = context.createBuffer(1, context.sampleRate * 0.18, context.sampleRate);
    const data = shotNoiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const now = context.currentTime;
  const profile = {
    rifle: { thump: 92, crack: 760, dur: 0.11, vol: 0.16 },
    ak47: { thump: 74, crack: 720, dur: 0.13, vol: 0.18 },
    aug: { thump: 96, crack: 940, dur: 0.1, vol: 0.14 },
    smg: { thump: 118, crack: 980, dur: 0.075, vol: 0.11 },
    shotgun: { thump: 64, crack: 520, dur: 0.18, vol: 0.22 },
    marksman: { thump: 78, crack: 1220, dur: 0.15, vol: 0.18 },
    awm: { thump: 48, crack: 1420, dur: 0.2, vol: 0.24 },
    type95: { thump: 104, crack: 860, dur: 0.09, vol: 0.12 }
  }[gun.kind];

  const noise = context.createBufferSource();
  noise.buffer = shotNoiseBuffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = profile.crack;
  filter.Q.value = gun.kind === "shotgun" ? 0.8 : 1.4;
  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(profile.vol, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + profile.dur);
  noise.connect(filter).connect(noiseGain).connect(context.destination);
  noise.start(now);
  noise.stop(now + profile.dur);

  const thump = context.createOscillator();
  const thumpGain = context.createGain();
  thump.type = "triangle";
  thump.frequency.setValueAtTime(profile.thump, now);
  thump.frequency.exponentialRampToValueAtTime(profile.thump * 0.45, now + profile.dur);
  thumpGain.gain.setValueAtTime(profile.vol * 0.7, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + profile.dur * 0.9);
  thump.connect(thumpGain).connect(context.destination);
  thump.start(now);
  thump.stop(now + profile.dur);
}

function ping() {
  if (!self.joined) return;
  self.pingStarted = performance.now();
  send({ type: "ping", at: self.pingStarted });
  setTimeout(ping, 2500);
}

function move(delta: number) {
  const me = players.get(self.id);
  if (me?.creative && !creativeMode) creativeMode = true;
  if (me?.eliminated || (me && me.health <= 0)) return;
  if (activeVehicleId) {
    jumpQueued = false;
    self.velocity.set(0, 0, 0);
    return;
  }
  if (creativeMode) {
    const speed = keys.has("ShiftLeft") ? 7.5 : 13.5;
    const forward = getLookDirection();
    const flatForward = forward.clone();
    flatForward.y = 0;
    flatForward.normalize();
    const right = new THREE.Vector3(-flatForward.z, 0, flatForward.x).normalize();
    const wish = new THREE.Vector3();
    if (keys.has("KeyW")) wish.add(flatForward);
    if (keys.has("KeyS")) wish.sub(flatForward);
    if (keys.has("KeyD")) wish.add(right);
    if (keys.has("KeyA")) wish.sub(right);
    if (keys.has("Space")) wish.y += 1;
    if (keys.has("ShiftLeft")) wish.y -= 1;
    if (wish.lengthSq() > 0) self.position.add(wish.normalize().multiplyScalar(speed * delta));
    self.position.x = THREE.MathUtils.clamp(self.position.x, -arenaHalfSize + 1, arenaHalfSize - 1);
    self.position.z = THREE.MathUtils.clamp(self.position.z, -arenaHalfSize + 1, arenaHalfSize - 1);
    self.position.y = THREE.MathUtils.clamp(self.position.y, 1.6, 80);
    self.velocity.set(0, 0, 0);
    lastSafePosition.copy(self.position);
    jumpQueued = false;
    return;
  }
  recoverIfStuck();

  const now = performance.now();
  const sneaking = keys.has("ShiftLeft");
  const sprinting = now < sprintUntil && keys.has("KeyW") && !sneaking;
  const boosted = Date.now() < ((me?.speedBoostUntil || 0) || (me?.comebackUntil || 0));
  const touchMoving = mobileMoveIntensity > 0;
  const touchScale = touchMoving ? 0.42 + mobileMoveIntensity * 0.42 : 1;
  const baseSpeed = sneaking ? 2.8 : sprinting ? (touchMoving ? 8.0 : 10.2) : 5.5;
  const speed = baseSpeed * (boosted ? 1.18 : 1) * touchScale;
  const forward = getLookDirection();
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
  const wish = new THREE.Vector3();
  if (touchMoving) {
    wish.addScaledVector(forward, -mobileMoveY);
    wish.addScaledVector(right, mobileMoveX);
  } else {
    if (keys.has("KeyW")) wish.add(forward);
    if (keys.has("KeyS")) wish.sub(forward);
    if (keys.has("KeyD")) wish.add(right);
    if (keys.has("KeyA")) wish.sub(right);
  }
  if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed * delta);

  moveWithSlide(wish);
  if (!collides(self.position)) {
    lastSafePosition.copy(self.position);
  }

  const groundY = groundHeightAt(self.position.x, self.position.z, self.position.y);
  const grounded = Math.abs(self.position.y - groundY) < 0.34 && self.velocity.y <= 0.35;
  if (sprinting && wish.lengthSq() > 0 && grounded && now - lastRunSoundAt > 255) {
    lastRunSoundAt = now;
    playRunSound();
  }
  if (grounded && self.position.y < groundY) self.position.y = groundY;
  if (jumpQueued && grounded) {
    self.velocity.y = jumpVelocity;
    playJumpSound();
  }
  jumpQueued = false;
  for (const trampoline of trampolines) {
    const dx = self.position.x - trampoline.x;
    const dz = self.position.z - trampoline.z;
    if (dx * dx + dz * dz <= trampoline.radius * trampoline.radius && self.position.y <= groundY + 0.35 && self.velocity.y <= 1) {
      trampolineBoostStep = trampolineChainActive ? Math.min(trampolineBoostStep + 1, trampolineBoostSteps.length - 1) : 0;
      trampolineChainActive = true;
      const trampolineBoost = trampolineBoostSteps[trampolineBoostStep];
      self.velocity.y = trampoline.force * trampolineBoost;
      showToast(`トランポリン x${trampolineBoost.toFixed(1)}`);
      break;
    }
  }
  self.velocity.y -= 13 * delta;
  self.position.y += self.velocity.y * delta;
  const landingY = groundHeightAt(self.position.x, self.position.z, self.position.y);
  if (self.position.y < landingY) {
    self.position.y = landingY;
    self.velocity.y = 0;
    if (!isOverTrampoline(self.position.x, self.position.z)) {
      trampolineBoostStep = 0;
      trampolineChainActive = false;
    }
  }

  if (reloadTimer > 0) {
    reloadTimer -= delta;
    if (reloadTimer <= 0) {
      const needed = currentGun().magSize - self.ammo;
      const loaded = Math.min(needed, self.reserve);
      self.ammo += loaded;
      self.reserve -= loaded;
      if (self.ammo === 0) self.reserve = 999;
    }
  }
}

function groundHeightAt(x: number, z: number, currentY = 1.6) {
  let ground = 1.6;
  for (const zone of stairZones) {
    const dx = x - zone.origin.x;
    const dz = z - zone.origin.z;
    const along = dx * Math.sin(zone.yaw) + dz * -Math.cos(zone.yaw);
    const side = dx * Math.cos(zone.yaw) + dz * Math.sin(zone.yaw);
    if (Math.abs(side) > zone.width / 2 + 0.36) continue;
    if (along < -0.5 || along > zone.count * zone.run + 0.5) continue;
    const stepIndex = THREE.MathUtils.clamp(Math.floor((along + 0.2) / zone.run), 0, zone.count - 1);
    const stepY = 1.6 + (stepIndex + 1) * zone.rise;
    if (stepY <= currentY + 0.85) ground = Math.max(ground, stepY);
  }
  for (const zone of spiralStairZones) {
    const dx = x - zone.center.x;
    const dz = z - zone.center.z;
    const distance = Math.hypot(dx, dz);
    if (distance < zone.radius - zone.width / 2 - 0.28 || distance > zone.radius + zone.width / 2 + 0.28) continue;
    let delta = (Math.atan2(dz, dx) - zone.startAngle) * zone.direction;
    const fullTurn = Math.PI * 2;
    while (delta < 0) delta += fullTurn;
    while (delta >= fullTurn) delta -= fullTurn;
    if (delta > zone.totalAngle + fullTurn / zone.count) continue;
    const progress = THREE.MathUtils.clamp(delta / zone.totalAngle, 0, 1);
    const stepIndex = THREE.MathUtils.clamp(Math.floor(progress * zone.count), 0, zone.count - 1);
    const stepY = 1.6 + zone.baseY + (stepIndex + 1) * zone.rise;
    if (stepY <= currentY + 0.9) ground = Math.max(ground, stepY);
  }
  for (const surface of walkSurfaces) {
    if (x < surface.minX || x > surface.maxX || z < surface.minZ || z > surface.maxZ) continue;
    if (surface.y <= currentY + 0.75) ground = Math.max(ground, surface.y);
  }
  for (const box of colliders) {
    if (x < box.min.x - playerRadius || x > box.max.x + playerRadius) continue;
    if (z < box.min.z - playerRadius || z > box.max.z + playerRadius) continue;
    const surfaceY = box.max.y + 1.6;
    if (surfaceY <= currentY + 0.75) ground = Math.max(ground, surfaceY);
  }
  return ground;
}

function recoverIfStuck() {
  if (!collides(self.position)) return;
  if (!collides(lastSafePosition)) {
    self.position.copy(lastSafePosition);
    self.velocity.set(0, 0, 0);
    return;
  }
  self.position.set(0, 1.6, 10);
  self.velocity.set(0, 0, 0);
  lastSafePosition.copy(self.position);
}

function resetSelf() {
  activeVehicleId = "";
  nearestVehicleId = "";
  document.body.classList.remove("driving");
  self.position.set(0, 1.6, 10);
  self.velocity.set(0, 0, 0);
  self.pitch = 0;
  self.yaw = 0;
  self.health = maxHealth;
  reloadTimer = 0;
  trampolineBoostStep = 0;
  trampolineChainActive = false;
  scoped = false;
  celebrationSeenWinner = "";
  resultWinnerSeen = "";
  killcamUntil = 0;
  flowScore = 0;
  flowCombo = 0;
  flowUntil = 0;
  lastFlowAt = 0;
  lastSelfKills = 0;
  lastSelfScore = 0;
  lastSelfHealth = maxHealth;
  updateFlowHud(performance.now());
  endCelebration();
  document.body.classList.remove("scoped");
  killcamCard.classList.remove("show");
  spectatorCard.classList.remove("show");
  resultPanel.classList.remove("open");
  lastSafePosition.copy(self.position);
  send({ type: "reset_room" });
  for (const tracer of tracers.splice(0)) {
    scene.remove(tracer.mesh);
    tracer.mesh.traverse((child) => {
      const mesh = child as THREE.Mesh | THREE.Line;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | undefined;
      material?.dispose();
    });
  }
  clearBulletDecals();
  showToast("リセットしました");
}

function moveWithSlide(wish: THREE.Vector3) {
  if (wish.lengthSq() === 0) return;

  const nextX = self.position.clone();
  nextX.x = THREE.MathUtils.clamp(nextX.x + wish.x, -arenaHalfSize + 0.7, arenaHalfSize - 0.7);
  if (!collides(nextX)) {
    self.position.x = nextX.x;
  }

  const nextZ = self.position.clone();
  nextZ.z = THREE.MathUtils.clamp(nextZ.z + wish.z, -arenaHalfSize + 0.7, arenaHalfSize - 0.7);
  if (!collides(nextZ)) {
    self.position.z = nextZ.z;
  }
}

function isOverTrampoline(x: number, z: number) {
  return trampolines.some((trampoline) => {
    const dx = x - trampoline.x;
    const dz = z - trampoline.z;
    return dx * dx + dz * dz <= trampoline.radius * trampoline.radius;
  });
}

function collides(position: THREE.Vector3) {
  const minY = position.y - 1.38;
  const maxY = position.y + 0.22;
  const playerBox = new THREE.Box3(
    new THREE.Vector3(position.x - playerRadius, minY, position.z - playerRadius),
    new THREE.Vector3(position.x + playerRadius, maxY, position.z + playerRadius)
  );
  if (colliders.some((box) => box.intersectsBox(playerBox))) return true;
  if (position.y > 3.4) return false;
  for (const vehicle of vehicleSnapshots.values()) {
    if (vehicle.id === activeVehicleId) continue;
    if (Math.hypot(position.x - vehicle.x, position.z - vehicle.z) < 1.72 + playerRadius) return true;
  }
  return false;
}

function shoot() {
  const me = players.get(self.id);
  if (activeVehicleId || me?.eliminated || (me && me.health <= 0)) return;
  const now = performance.now();
  const gun = currentGun();
  if (reloadTimer > 0 || now - self.lastShot < gun.fireDelay) return;
  if (self.ammo <= 0) {
    reload();
    return;
  }
  self.lastShot = now;
  self.ammo -= 1;
  applyShotRecoil(gun);
  flashMuzzle();
  for (let i = 0; i < gun.pelletCount; i += 1) {
    const direction = getLookDirection();
    direction.x += (Math.random() - 0.5) * gun.spread;
    direction.y += (Math.random() - 0.5) * gun.spread;
    direction.z += (Math.random() - 0.5) * gun.spread;
    direction.normalize();
    send({
      type: "shoot",
      weapon: gun.kind,
      range: gun.range,
      origin: { x: self.position.x, y: self.position.y, z: self.position.z },
      direction: { x: direction.x, y: direction.y, z: direction.z }
    });
  }
}

function applyShotRecoil(gun: Gun) {
  const scopeScale = scoped && isScopedGun(gun) ? 0.62 : 1;
  const pitchKick = gun.recoilPitch * scopeScale;
  const yawKick = ((Math.random() - 0.5) * gun.recoilYaw + gun.recoilDrift * (0.75 + Math.random() * 0.5)) * scopeScale;
  self.pitch = THREE.MathUtils.clamp(self.pitch + pitchKick, -1.15, 1.1);
  self.yaw += yawKick;
  weaponKick = Math.min(1, weaponKick + gun.kick);
}

function flashMuzzle() {
  playGunSound(currentGun());
  muzzleFlashUntil = performance.now() + (currentGun().kind === "shotgun" ? 92 : 64);
  if (!muzzleFlashMesh) return;
  muzzleFlashMesh.visible = true;
  muzzleFlashMesh.rotation.z = Math.random() * Math.PI;
  if (muzzleFlashLight) muzzleFlashLight.intensity = currentGun().kind === "shotgun" ? 5.4 : 3.8;
}

function reload() {
  if (reloadTimer > 0 || self.ammo === currentGun().magSize || self.reserve <= 0) return;
  reloadTimer = 1.15;
  playReloadSound();
  showToast("リロード");
}

function switchGun(index: number) {
  const next = (index + guns.length) % guns.length;
  if (next === currentGunIndex) return;
  currentGunIndex = next;
  scoped = false;
  document.body.classList.remove("scoped");
  self.ammo = currentGun().magSize;
  reloadTimer = 0;
  addWeapon();
  showToast(`${currentGun().name} / 飛距離 ${currentGun().range}m`);
}

function updateWeaponMotion(delta: number) {
  if (!weaponView) return;
  weaponView.visible = !activeVehicleId;
  if (activeVehicleId) {
    if (muzzleFlashMesh) muzzleFlashMesh.visible = false;
    if (muzzleFlashLight) muzzleFlashLight.intensity = 0;
    return;
  }
  weaponSwayClock += delta * (keys.size > 0 ? 8 : 3.2);
  weaponKick = Math.max(0, weaponKick - delta * 5.8);
  const walkSway = keys.size > 0 ? 1 : 0.32;
  weaponView.position.set(
    0.34 + Math.sin(weaponSwayClock) * 0.011 * walkSway,
    -0.31 + Math.abs(Math.cos(weaponSwayClock * 0.9)) * 0.009 * walkSway - weaponKick * 0.032,
    -0.26 + weaponKick * 0.14
  );
  weaponView.rotation.set(
    -weaponKick * 0.22 + Math.sin(weaponSwayClock * 0.8) * 0.006 * walkSway,
    Math.sin(weaponSwayClock * 0.55) * 0.006 * walkSway,
    Math.sin(weaponSwayClock) * 0.012 * walkSway
  );
  if (muzzleFlashMesh) {
    const firing = performance.now() < muzzleFlashUntil;
    muzzleFlashMesh.visible = firing;
    if (muzzleFlashLight && !firing) muzzleFlashLight.intensity = 0;
  }
}

function getLookDirection() {
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyEuler(new THREE.Euler(self.pitch, self.yaw, 0, "YXZ"));
  return direction.normalize();
}

function spectatorTargets() {
  const me = players.get(self.id);
  const alive = [...players.values()].filter((player) => player.id !== self.id && !player.eliminated && player.health > 0);
  const teammates = me ? alive.filter((player) => player.color === me.color) : [];
  return teammates.length ? teammates : alive;
}

function isSpectating() {
  const me = players.get(self.id);
  return Boolean(me && (me.eliminated || me.health <= 0));
}

function pickSpectatorTarget(next = false) {
  const targets = spectatorTargets();
  if (targets.length === 0) {
    spectatorTargetId = "";
    return null;
  }
  const currentIndex = targets.findIndex((player) => player.id === spectatorTargetId);
  const target = targets[next || currentIndex < 0 ? (currentIndex + 1 + targets.length) % targets.length : currentIndex];
  spectatorTargetId = target.id;
  return target;
}

function updateSpectatorState() {
  if (!isSpectating()) {
    spectatorCard.classList.remove("show");
    spectatorTargetId = "";
    return null;
  }
  const target = pickSpectatorTarget(false);
  spectatorCard.classList.add("show");
  spectatorLabel.textContent = target ? `観戦中 ${target.name}` : "観戦待機";
  return target;
}

spectatorNext.addEventListener("click", () => {
  const target = pickSpectatorTarget(true);
  spectatorLabel.textContent = target ? `観戦中 ${target.name}` : "観戦待機";
});

function showKillcam(message: { shooter?: string; weapon?: string; from?: { x: number; y: number; z: number } }) {
  const from = message.from;
  const distance = from ? Math.hypot(from.x - self.position.x, from.y - self.position.y, from.z - self.position.z) : 0;
  const angle = from ? Math.atan2(from.x - self.position.x, from.z - self.position.z) : 0;
  const relative = THREE.MathUtils.radToDeg(THREE.MathUtils.euclideanModulo(angle - self.yaw + Math.PI, Math.PI * 2) - Math.PI);
  const side = Math.abs(relative) < 35 ? "正面" : Math.abs(relative) > 145 ? "背後" : relative > 0 ? "右側" : "左側";
  killcamTitle.textContent = `${message.shooter || "敵"} に倒された`;
  killcamDetail.textContent = `${message.weapon || "攻撃"} / ${side}${distance ? ` / 約${Math.round(distance)}m` : ""}`;
  killcamUntil = performance.now() + 2000;
  killcamCard.classList.add("show");
}

function updateKillcam() {
  if (killcamUntil && performance.now() > killcamUntil) {
    killcamUntil = 0;
    killcamCard.classList.remove("show");
  }
}

function showResults(name: string) {
  if (resultWinnerSeen === name) return;
  resultWinnerSeen = name;
  resultTitle.textContent = `${name} 勝利 - リザルト`;
  const rows = [...players.values()].sort((a, b) => b.score - a.score || b.kills - a.kills || (b.damageDealt || 0) - (a.damageDealt || 0));
  const reward = awardRoundProgress(name, rows);
  resultRows.innerHTML = rows.map((player, index) => `
    <div class="result-row ${player.color}">
      <span>#${index + 1} ${escapeHtml(player.name)}</span>
      <strong>${player.score}pt</strong>
      <small>${player.kills}K/${player.deaths}D  与${Math.round(player.damageDealt || 0)}  被${Math.round(player.damageTaken || 0)}  命中${player.hits || 0}  回復${player.healsUsed || 0}  必殺${player.specialsUsed || 0}</small>
    </div>
  `).join("");
  resultProgress.innerHTML = resultProgressHtml(reward);
  resultProgress.classList.toggle("show", reward.gained > 0);
  resultPanel.classList.add("open");
  scheduleLobbyReturn();
}

closeResult.addEventListener("click", () => resultPanel.classList.remove("open"));

function scheduleLobbyReturn() {
  if (lobbyReturnTimer) return;
  showToast("5秒後にロビーへ戻ります。");
  lobbyReturnTimer = window.setTimeout(returnToLobbyAfterRound, 5200);
}

function returnToLobbyAfterRound() {
  lobbyReturnTimer = 0;
  self.joined = false;
  self.ready = false;
  setFpsActive(false);
  desktopFiring = false;
  mobileFiring = false;
  activeVehicleId = "";
  nearestVehicleId = "";
  document.body.classList.remove("driving");
  mobileInteract.classList.remove("available");
  interactionHint.classList.remove("show");
  roomCodeEl.textContent = "----";
  readyButton.classList.remove("active");
  readyButton.querySelector("span")!.textContent = "準備完了";
  resultPanel.classList.remove("open");
  spectatorCard.classList.remove("show");
  killcamCard.classList.remove("show");
  vehicleStatus.classList.remove("show", "repairing", "danger");
  syncSafeZone(undefined);
  lastSafeZonePhase = -1;
  document.body.classList.remove("outside-zone");
  for (const ping of teamPingMeshes.values()) disposeGroup(ping.group);
  teamPingMeshes.clear();
  joinPanel.classList.remove("hidden");
  clearBulletDecals();
  endCelebration();
  if (document.pointerLockElement) void document.exitPointerLock?.();
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();
  socket = null;
  history.replaceState(null, "", location.pathname);
  updateLobbyBgm();
  void refreshOnlinePlayers();
}

function updateCamera() {
  const spectated = updateSpectatorState();
  if (spectated) {
    const yaw = spectated.yaw || 0;
    camera.position.set(
      spectated.x + Math.sin(yaw) * 4.2,
      spectated.y + 2.25,
      spectated.z + Math.cos(yaw) * 4.2
    );
    camera.lookAt(spectated.x, spectated.y + 0.85, spectated.z);
  } else {
    camera.position.copy(self.position);
    camera.rotation.order = "YXZ";
    camera.rotation.y = self.yaw;
    camera.rotation.x = self.pitch;
  }
  const vehicleSpeed = activeVehicleId ? Math.abs(vehicleSnapshots.get(activeVehicleId)?.speed || 0) : 0;
  const targetFov = activeVehicleId
    ? THREE.MathUtils.clamp(74 + vehicleSpeed * 0.46, 74, 80)
    : scoped && isScopedGun() ? 31 : 72;
  if (Math.abs(camera.fov - targetFov) > 0.1) {
    camera.fov += (targetFov - camera.fov) * 0.28;
    camera.updateProjectionMatrix();
  }
}

Object.assign(window, {
  toyboxDebug: {
    press(code: string) {
      if (movementKeys.has(code)) keys.add(code);
    },
    release(code: string) {
      keys.delete(code);
    },
    clearKeys() {
      for (const code of movementKeys) keys.delete(code);
    },
    setPose(x: number, z: number, yaw = 0, pitch = 0) {
      self.position.set(x, 1.6, z);
      lastSafePosition.copy(self.position);
      self.yaw = yaw;
      self.pitch = pitch;
      self.velocity.set(0, 0, 0);
    },
    pose() {
      return {
        x: self.position.x,
        y: self.position.y,
        z: self.position.z,
        yaw: self.yaw,
        pitch: self.pitch,
        joined: self.joined
      };
    },
    serverPose() {
      const me = players.get(self.id);
      return me ? { x: me.x, y: me.y, z: me.z, vehicleId: me.vehicleId || "" } : null;
    }
  }
});

function syncState(now: number) {
  if (!self.joined || now - lastStateSent < 75) return;
  lastStateSent = now;
  if (activeVehicleId && now - lastVehicleInputSent >= 70) {
    const throttle = mobileMoveIntensity > 0
      ? THREE.MathUtils.clamp(-mobileMoveY, -1, 1)
      : (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
    const steer = mobileMoveIntensity > 0
      ? THREE.MathUtils.clamp(mobileMoveX, -1, 1)
      : (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    send({
      type: "vehicle_input",
      throttle,
      steer,
      braking: mobileBraking || keys.has("Space") || keys.has("ShiftLeft")
    });
    lastVehicleInputSent = now;
  }
  send({
    type: "state",
    x: self.position.x,
    y: self.position.y,
    z: self.position.z,
    yaw: self.yaw,
    pitch: self.pitch
  });
}

function updateRemotePlayers() {
  for (const [id, mesh] of playerMeshes) {
    if (!players.has(id) || id === self.id) {
      scene.remove(mesh);
      playerMeshes.delete(id);
    }
  }

  for (const player of players.values()) {
    if (player.id === self.id) continue;
    let mesh = playerMeshes.get(player.id);
    if (!mesh) {
      mesh = createPlayerMesh(player);
      playerMeshes.set(player.id, mesh);
    }
    applyPlayerMeshColor(mesh, player);
    mesh.position.lerp(remotePositionScratch.set(player.x, Math.max(0, player.y - 1.6), player.z), 0.38);
    mesh.rotation.y = player.yaw;
    mesh.children[4].visible = Math.max(player.shieldUntil || 0, player.spawnProtectedUntil || 0) > Date.now();
    mesh.visible = player.health > 0;
  }
}

function vehicleMaterial(color?: VehicleSnapshot["color"]) {
  if (color === "blue") return materials.blue;
  if (color === "yellow") return materials.yellow;
  if (color === "red") return materials.red;
  return materials.green;
}

function createVehicleMesh(snapshot: VehicleSnapshot) {
  const group = new THREE.Group();
  group.name = snapshot.id;
  const paint = vehicleMaterial(snapshot.color);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.42, 3.45), paint);
  body.position.y = 0.56;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.22, 3.18), materials.dark);
  lower.position.y = 0.34;
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.34, 1.22), paint);
  hood.position.set(0, 0.88, -1.02);
  hood.rotation.x = -0.055;
  const rear = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.48, 0.78), paint);
  rear.position.set(0, 0.9, 1.25);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.3, 0.28), materials.dark);
  dash.position.set(0, 1.08, -0.28);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.08), materials.glass);
  windshield.position.set(0, 1.35, -0.38);
  windshield.rotation.x = -0.23;
  const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 1.52), materials.metal);
  leftRail.position.set(-0.85, 1.2, 0.45);
  const rightRail = leftRail.clone();
  rightRail.position.x = 0.85;
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.16, 0.16), materials.metal);
  frontBumper.position.set(0, 0.42, -1.78);
  const rearBumper = frontBumper.clone();
  rearBumper.position.z = 1.78;
  group.add(body, lower, hood, rear, dash, windshield, leftRail, rightRail, frontBumper, rearBumper);

  for (const x of [-0.58, 0.58]) {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.08), materials.light);
    headlight.position.set(x, 0.88, -1.68);
    group.add(headlight);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.08), materials.red);
    tail.position.set(x, 0.82, 1.68);
    group.add(tail);
  }

  const wheels: THREE.Mesh[] = [];
  for (const x of [-1.02, 1.02]) {
    for (const z of [-1.15, 1.15]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12), materials.rubber);
      wheel.position.set(x, 0.42, z);
      wheel.rotation.z = Math.PI / 2;
      wheels.push(wheel);
      group.add(wheel);
    }
  }

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 4.2), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  const statusBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x65f2a0, transparent: true, opacity: 0.9, depthWrite: false })
  );
  statusBeacon.position.set(0, 1.86, 1.16);
  group.add(shadow, statusBeacon);
  group.position.set(snapshot.x, 0, snapshot.z);
  group.rotation.y = snapshot.yaw;
  scene.add(group);
  return { group, wheels, wheelSpin: 0, statusBeacon };
}

function syncVehicleSnapshots(snapshots: VehicleSnapshot[]) {
  const seen = new Set<string>();
  vehicleSnapshots.clear();
  for (const snapshot of snapshots) {
    if (!snapshot?.id || !Number.isFinite(snapshot.x) || !Number.isFinite(snapshot.z)) continue;
    seen.add(snapshot.id);
    vehicleSnapshots.set(snapshot.id, snapshot);
    if (!vehicleMeshes.has(snapshot.id)) vehicleMeshes.set(snapshot.id, createVehicleMesh(snapshot));
  }
  for (const [id, visual] of vehicleMeshes) {
    if (seen.has(id)) continue;
    scene.remove(visual.group);
    vehicleMeshes.delete(id);
  }
}

function updateVehicleVisuals(delta: number) {
  const blend = 1 - Math.pow(0.002, Math.min(0.05, delta));
  for (const [id, snapshot] of vehicleSnapshots) {
    const visual = vehicleMeshes.get(id);
    if (!visual) continue;
    visual.group.position.lerp(remotePositionScratch.set(snapshot.x, 0, snapshot.z), blend);
    visual.group.rotation.y += shortestAngleDelta(visual.group.rotation.y, snapshot.yaw) * blend;
    visual.wheelSpin += snapshot.speed * delta / 0.38;
    for (const wheel of visual.wheels) wheel.rotation.x = visual.wheelSpin;
    const healthRatio = THREE.MathUtils.clamp((snapshot.health ?? 600) / Math.max(1, snapshot.maxHealth ?? 600), 0, 1);
    const disabled = (snapshot.disabledUntil || 0) > Date.now() || healthRatio <= 0;
    const beaconMaterial = visual.statusBeacon.material as THREE.MeshBasicMaterial;
    beaconMaterial.color.setHex(disabled ? 0xff4d4d : snapshot.repairing ? 0x65f2a0 : healthRatio < 0.34 ? 0xff8a3d : 0xfff36b);
    beaconMaterial.opacity = disabled ? 0.48 + Math.sin(performance.now() * 0.012) * 0.28 : snapshot.repairing ? 0.98 : 0.62;
    visual.statusBeacon.scale.setScalar(snapshot.repairing ? 1.2 + Math.sin(performance.now() * 0.009) * 0.18 : 1);
  }
  const activeVisual = activeVehicleId ? vehicleMeshes.get(activeVehicleId) : null;
  if (activeVisual) {
    self.position.set(activeVisual.group.position.x, 1.82, activeVisual.group.position.z);
    self.velocity.set(0, 0, 0);
    lastSafePosition.copy(self.position);
  }
}

function ensureSafeZoneVisual() {
  if (safeZoneVisual) return safeZoneVisual;
  const group = new THREE.Group();
  group.name = "safe-zone";
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.985, 1.015, 72),
    new THREE.MeshBasicMaterial({ color: 0x5fe8ff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.075;
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 10, 72, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x49b9ff, transparent: true, opacity: 0.075, depthWrite: false, side: THREE.DoubleSide })
  );
  wall.position.y = 5;
  group.add(ring, wall);
  group.visible = false;
  scene.add(group);
  safeZoneVisual = { group, ring, wall };
  return safeZoneVisual;
}

function syncSafeZone(snapshot?: SafeZoneSnapshot) {
  if (!snapshot || !Number.isFinite(snapshot.x) || !Number.isFinite(snapshot.z) || !Number.isFinite(snapshot.radius)) {
    safeZoneSnapshot = { enabled: false, phase: -1, stage: "inactive", x: 0, z: 0, radius: 92, nextRadius: 92, damage: 0, endsAt: 0 };
    return;
  }
  if (lastSafeZonePhase >= 0 && snapshot.phase > lastSafeZonePhase) {
    showToast(snapshot.stage === "shrinking" ? "安全エリア縮小開始" : snapshot.stage === "final" ? "最終安全エリア" : "次の縮小まで待機");
    playSweep(720, 360, 0.18, 0.035, "triangle");
  }
  lastSafeZonePhase = snapshot.phase;
  safeZoneSnapshot = snapshot;
}

function updateSafeZoneVisual(delta: number) {
  const visual = ensureSafeZoneVisual();
  visual.group.visible = safeZoneSnapshot.enabled;
  zoneStatus.classList.toggle("active", safeZoneSnapshot.enabled);
  if (!safeZoneSnapshot.enabled) {
    document.body.classList.remove("outside-zone");
    wasOutsideSafeZone = false;
    visual.group.userData.initialized = false;
    return;
  }

  if (!visual.group.userData.initialized) {
    visual.group.position.set(safeZoneSnapshot.x, 0, safeZoneSnapshot.z);
    visual.group.scale.set(safeZoneSnapshot.radius, 1, safeZoneSnapshot.radius);
    visual.group.userData.initialized = true;
  }

  visual.group.position.x = THREE.MathUtils.damp(visual.group.position.x, safeZoneSnapshot.x, 5.4, delta);
  visual.group.position.z = THREE.MathUtils.damp(visual.group.position.z, safeZoneSnapshot.z, 5.4, delta);
  const radius = THREE.MathUtils.damp(visual.group.scale.x || safeZoneSnapshot.radius, safeZoneSnapshot.radius, 6.2, delta);
  visual.group.scale.set(radius, 1, radius);
  const outside = safeZoneSnapshot.damage > 0
    && Math.hypot(self.position.x - safeZoneSnapshot.x, self.position.z - safeZoneSnapshot.z) > safeZoneSnapshot.radius - 0.4;
  document.body.classList.toggle("outside-zone", outside);
  (visual.wall.material as THREE.MeshBasicMaterial).opacity = outside ? 0.13 : 0.065;
  if (outside && !wasOutsideSafeZone) {
    showToast("危険エリア外です");
    pulseHaptic(38);
  }
  wasOutsideSafeZone = outside;
}

function createTeamPingMesh(snapshot: TeamPingSnapshot) {
  const group = new THREE.Group();
  group.name = `team-ping-${snapshot.id}`;
  const color = snapshot.color === "red" ? 0xff8a70 : 0xfff36b;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.065, 7, 22),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, depthWrite: false })
  );
  ring.rotation.x = Math.PI / 2;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 3.3, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false })
  );
  beam.position.y = 1.65;
  const marker = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.2, 0),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.98, depthWrite: false })
  );
  marker.position.y = 3.3;
  group.add(ring, beam, marker);
  group.position.set(snapshot.x, Math.max(0.1, snapshot.y), snapshot.z);
  scene.add(group);
  return group;
}

function addTeamPing(snapshot?: TeamPingSnapshot) {
  if (!snapshot?.id || !Number.isFinite(snapshot.x) || !Number.isFinite(snapshot.y) || !Number.isFinite(snapshot.z)) return;
  const existing = teamPingMeshes.get(snapshot.id);
  if (existing) {
    existing.expiresAt = snapshot.expiresAt;
    existing.snapshot = snapshot;
    return;
  }
  teamPingMeshes.set(snapshot.id, { group: createTeamPingMesh(snapshot), expiresAt: snapshot.expiresAt, snapshot });
  while (teamPingMeshes.size > 4) {
    const oldest = [...teamPingMeshes.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
    if (!oldest) break;
    disposeGroup(oldest[1].group);
    teamPingMeshes.delete(oldest[0]);
  }
  showToast(`${snapshot.name || "味方"} がピン`);
  pulseHaptic(14);
}

function updateTeamPings(delta: number) {
  const now = Date.now();
  for (const [id, ping] of teamPingMeshes) {
    if (ping.expiresAt <= now) {
      disposeGroup(ping.group);
      teamPingMeshes.delete(id);
      continue;
    }
    const marker = ping.group.children[2];
    marker.rotation.y += delta * 2.8;
    marker.position.y = 3.3 + Math.sin(performance.now() * 0.006 + ping.snapshot.x) * 0.14;
    const pulse = 1 + Math.sin(performance.now() * 0.007 + ping.snapshot.z) * 0.06;
    ping.group.children[0].scale.setScalar(pulse);
  }
}

function updateAutomaticDoors(delta: number) {
  for (const door of automaticDoors) {
    let nearest = self.joined ? Math.hypot(self.position.x - door.center.x, self.position.z - door.center.z) : Infinity;
    for (const player of players.values()) {
      nearest = Math.min(nearest, Math.hypot(player.x - door.center.x, player.z - door.center.z));
    }
    const target = nearest < 4.2 ? 1 : 0;
    door.openness = THREE.MathUtils.damp(door.openness, target, 8.5, delta);
    door.left.position.x = door.closedLeftX - door.openness * 2.32;
    door.right.position.x = door.closedRightX + door.openness * 2.32;
  }
}

function pulseHaptic(duration = 18) {
  if (!isCoarsePointer() || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(Math.max(8, Math.min(45, duration)));
}

function updateVehicleInteraction(now = performance.now()) {
  if (now - lastInteractionCheckAt < 90) return;
  lastInteractionCheckAt = now;
  nearestVehicleId = "";
  let nearestDistance = Infinity;
  if (!activeVehicleId) {
    for (const vehicle of vehicleSnapshots.values()) {
      if (vehicle.driverId || (vehicle.health ?? 600) <= 0 || (vehicle.disabledUntil || 0) > Date.now()) continue;
      const distance = Math.hypot(vehicle.x - self.position.x, vehicle.z - self.position.z);
      if (distance < 3.35 && distance < nearestDistance) {
        nearestDistance = distance;
        nearestVehicleId = vehicle.id;
      }
    }
  }
  const available = Boolean(activeVehicleId || nearestVehicleId);
  document.body.classList.toggle("driving", Boolean(activeVehicleId));
  if (activeVehicleId) mobileFiring = false;
  mobileInteract.classList.toggle("available", available);
  interactionHint.classList.toggle("show", available && !isCoarsePointer());
  interactionHintText.textContent = activeVehicleId ? "ロードスターから降りる" : "ロードスターに乗る";
  mobileInteract.setAttribute("aria-label", activeVehicleId ? "車から降りる" : "車に乗る");
  mobileJump.setAttribute("aria-label", activeVehicleId ? "ブレーキ" : "ジャンプ");
}

function updateVehicleHud() {
  const vehicle = activeVehicleId ? vehicleSnapshots.get(activeVehicleId) : null;
  vehicleStatus.classList.toggle("show", Boolean(vehicle));
  if (!vehicle) {
    wasVehicleRepairing = false;
    return;
  }
  const maximum = Math.max(1, Math.round(vehicle.maxHealth || 600));
  const current = Math.max(0, Math.round(vehicle.health ?? maximum));
  const ratio = THREE.MathUtils.clamp(current / maximum, 0, 1);
  vehicleHealth.textContent = String(current);
  vehicleHealthBar.style.width = `${Math.round(ratio * 100)}%`;
  vehicleRepairState.textContent = vehicle.repairing ? "REPAIR" : ratio < 0.34 ? "CRITICAL" : "READY";
  vehicleStatus.classList.toggle("repairing", Boolean(vehicle.repairing));
  vehicleStatus.classList.toggle("danger", ratio < 0.34);
  if (vehicle.repairing && !wasVehicleRepairing) pulseHaptic(20);
  wasVehicleRepairing = Boolean(vehicle.repairing);
}

function updateSafeZoneHud() {
  if (!safeZoneSnapshot.enabled) {
    zoneStatus.classList.remove("active", "danger", "shrinking");
    return;
  }
  const serverNow = Date.now() + serverClockOffsetMs;
  const remaining = safeZoneSnapshot.endsAt ? Math.max(0, safeZoneSnapshot.endsAt - serverNow) : 0;
  const minutes = Math.floor(remaining / 60_000).toString().padStart(2, "0");
  const seconds = Math.floor((remaining % 60_000) / 1000).toString().padStart(2, "0");
  const centerDistance = Math.hypot(self.position.x - safeZoneSnapshot.x, self.position.z - safeZoneSnapshot.z);
  const outsideDistance = Math.max(0, centerDistance - safeZoneSnapshot.radius);
  const phaseLabels: Record<SafeZoneSnapshot["stage"], string> = {
    inactive: "SAFE",
    waiting: "準備",
    shrinking: "縮小",
    holding: "安定",
    final: "FINAL"
  };
  zonePhase.textContent = phaseLabels[safeZoneSnapshot.stage] || "SAFE";
  zoneTimer.textContent = safeZoneSnapshot.endsAt ? `${minutes}:${seconds}` : "FINAL";
  zoneDistance.textContent = outsideDistance > 0 ? `OUT ${Math.ceil(outsideDistance)}m` : `R ${Math.ceil(safeZoneSnapshot.radius)}m`;
  zoneStatus.classList.add("active");
  zoneStatus.classList.toggle("danger", outsideDistance > 0 && safeZoneSnapshot.damage > 0);
  zoneStatus.classList.toggle("shrinking", safeZoneSnapshot.stage === "shrinking");
}

function toggleVehicleInteraction() {
  if (!self.joined) return;
  if (activeVehicleId) {
    send({ type: "vehicle_exit" });
    pulseHaptic(28);
    return;
  }
  if (!nearestVehicleId) return;
  send({ type: "vehicle_enter", vehicleId: nearestVehicleId });
  pulseHaptic(28);
}

function rayBoxDistance(origin: THREE.Vector3, direction: THREE.Vector3, box: THREE.Box3, maxDistance: number) {
  let tMin = 0;
  let tMax = maxDistance;
  for (const axis of ["x", "y", "z"] as const) {
    const min = box.min[axis];
    const max = box.max[axis];
    const o = origin[axis];
    const d = direction[axis];
    if (Math.abs(d) < 1e-6) {
      if (o < min || o > max) return null;
      continue;
    }
    const inv = 1 / d;
    let near = (min - o) * inv;
    let far = (max - o) * inv;
    if (near > far) [near, far] = [far, near];
    tMin = Math.max(tMin, near);
    tMax = Math.min(tMax, far);
    if (tMin > tMax) return null;
  }
  return tMin > 0.08 && tMin < maxDistance ? tMin : null;
}

function firstObstacleDistance(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number) {
  let best = maxDistance;
  for (const box of colliders) {
    const hit = rayBoxDistance(origin, direction, box, maxDistance);
    if (hit !== null && hit < best) best = hit;
  }
  return best;
}

function sendTeamPing() {
  const me = players.get(self.id);
  if (!self.joined || me?.eliminated || (me && me.health <= 0)) return;
  const origin = self.position.clone();
  const direction = getLookDirection();
  const maxDistance = 90;
  const obstacleDistance = firstObstacleDistance(origin, direction, maxDistance);
  let distance = obstacleDistance < maxDistance - 0.1 ? obstacleDistance : 46;
  if (obstacleDistance >= maxDistance - 0.1 && direction.y < -0.02) {
    const groundDistance = (0.1 - origin.y) / direction.y;
    if (groundDistance > 0 && groundDistance < maxDistance) distance = groundDistance;
  }
  const point = origin.add(direction.multiplyScalar(distance));
  send({
    type: "team_ping",
    point: {
      x: THREE.MathUtils.clamp(point.x, -arenaHalfSize + 1, arenaHalfSize - 1),
      y: THREE.MathUtils.clamp(point.y, 0.1, 42),
      z: THREE.MathUtils.clamp(point.z, -arenaHalfSize + 1, arenaHalfSize - 1)
    }
  });
}

function addTracer(
  origin: THREE.Vector3 | { x: number; y: number; z: number },
  direction: THREE.Vector3 | { x: number; y: number; z: number },
  ownShot: boolean,
  range = 70,
  color?: number
) {
  const start = new THREE.Vector3(origin.x, origin.y - 0.12, origin.z);
  const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
  const visibleRange = firstObstacleDistance(start, dir, Math.min(range, 105));
  const end = start.clone().add(dir.clone().multiplyScalar(visibleRange));
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const tracerColor = color ?? (ownShot ? 0xfff36b : 0xff3d3d);
  const material = new THREE.LineBasicMaterial({ color: tracerColor, transparent: true, opacity: 1 });
  const line = new THREE.Line(geometry, material);
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.18),
    new THREE.MeshBasicMaterial({ color: tracerColor })
  );
  core.position.copy(start).add(dir.multiplyScalar(2.2));
  const group = new THREE.Group();
  group.add(line, core);
  scene.add(group);
  tracers.push({ mesh: group, life: 0.22 });
  while (tracers.length > 8) {
    const old = tracers.shift();
    if (!old) break;
    scene.remove(old.mesh);
    old.mesh.traverse((child) => {
      const mesh = child as THREE.Mesh | THREE.Line;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | undefined;
      material?.dispose();
    });
  }
}

function addAshinagaBurst(
  origin: THREE.Vector3 | { x: number; y: number; z: number },
  target: THREE.Vector3 | { x: number; y: number; z: number },
  own: boolean
) {
  const start = new THREE.Vector3(origin.x, origin.y + 0.1, origin.z);
  const end = new THREE.Vector3(target.x, target.y + 0.55, target.z);
  const group = new THREE.Group();
  const color = own ? 0xfff36b : 0xff8a2a;
  for (let i = 0; i < 2; i += 1) {
    const offset = new THREE.Vector3((i - 1) * 0.18, Math.sin(i) * 0.12, (1 - i) * 0.14);
    const geometry = new THREE.BufferGeometry().setFromPoints([start.clone().add(offset), end.clone().sub(offset)]);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    group.add(new THREE.Line(geometry, material));
  }
  const sting = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 8), new THREE.MeshBasicMaterial({ color: 0x111111 }));
  sting.position.copy(end);
  sting.rotation.x = Math.PI / 2;
  group.add(sting);
  scene.add(group);
  tracers.push({ mesh: group, life: 0.34 });
  while (tracers.length > 8) {
    const old = tracers.shift();
    if (!old) break;
    disposeGroup(old.mesh);
  }
  if (own) showHitIndicator(false, 86);
}

function updateTracers(delta: number) {
  for (let i = tracers.length - 1; i >= 0; i -= 1) {
    const tracer = tracers[i];
    tracer.life -= delta;
    for (const child of tracer.mesh.children) {
      const material = (child as THREE.Mesh | THREE.Line).material as THREE.Material & { opacity?: number };
      if ("opacity" in material) material.opacity = Math.max(0, tracer.life / 0.22);
    }
    if (tracer.life <= 0) {
      scene.remove(tracer.mesh);
      tracer.mesh.traverse((child) => {
        const mesh = child as THREE.Mesh | THREE.Line;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | undefined;
        material?.dispose();
      });
      tracers.splice(i, 1);
    }
  }
}

function createDonPunchMesh(own: boolean, type: DonPunchSnapshot["type"] = "donpachi") {
  const bee = new THREE.Group();
  const bodyMaterial = new THREE.MeshBasicMaterial({ color: own ? 0xfff36b : 0xff5a24 });
  const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const wingMaterial = new THREE.MeshBasicMaterial({ color: 0xdff8ff });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.42), bodyMaterial);
  body.scale.set(1.25, 0.8, 0.8);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.58, 0.58), stripeMaterial);
  stripe.position.x = 0.05;
  const wingA = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.04, 0.24), wingMaterial);
  wingA.position.set(0, 0.38, 0.22);
  wingA.rotation.z = 0.35;
  const wingB = wingA.clone();
  wingB.position.z = -0.22;
  wingB.rotation.z = -0.35;
  bee.add(body, stripe, wingA, wingB);
  bee.scale.setScalar(type === "donpachi" ? 1.28 : 1.08);
  scene.add(bee);
  return bee;
}

function syncDonPunchSnapshots(snapshots: DonPunchSnapshot[]) {
  const seen = new Set<string>();
  for (const snapshot of snapshots) {
    seen.add(snapshot.id);
    let punch = donPunches.get(snapshot.id);
    if (!punch) {
      punch = {
        mesh: createDonPunchMesh(snapshot.shooterId === self.id, snapshot.type),
        expiresAt: snapshot.expiresAt,
        targetId: snapshot.targetId
      };
      punch.mesh.position.set(snapshot.x, snapshot.y, snapshot.z);
      donPunches.set(snapshot.id, punch);
    }
    punch.expiresAt = snapshot.expiresAt;
    punch.targetId = snapshot.targetId;
    punch.mesh.position.lerp(donPunchPositionScratch.set(snapshot.x, snapshot.y, snapshot.z), 0.72);
  }
  for (const [id, punch] of donPunches) {
    if (seen.has(id)) continue;
    disposeGroup(punch.mesh);
    donPunches.delete(id);
  }
}

function updateBarrierPowerup(barrier?: BarrierSnapshot) {
  if (!barrierMesh || !barrier) return;
  barrierMesh.position.set(barrier.x, 0.16, barrier.z);
  barrierMesh.visible = Boolean(barrier.available);
}

function updateHealthPickup(pickup?: HealthPickupSnapshot) {
  if (!healthPickupMesh) return;
  if (!pickup || gameMode !== "oneLife") {
    healthPickupMesh.visible = false;
    return;
  }
  healthPickupMesh.position.set(pickup.x, 0.16, pickup.z);
  healthPickupMesh.visible = Boolean(pickup.available);
}

function updatePowerups(powerups: PowerupSnapshot[]) {
  const seen = new Set<string>();
  for (const powerup of powerups) {
    seen.add(powerup.id);
    let mesh = powerupMeshes.get(powerup.id);
    if (!mesh) {
      mesh = createPowerupMesh(powerup.kind);
      powerupMeshes.set(powerup.id, mesh);
    }
    if (mesh.userData.kind !== powerup.kind) {
      const color = powerupColor(powerup.kind);
      for (const child of mesh.children) {
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial | undefined;
        material?.color?.setHex(color);
      }
    }
    mesh.userData.kind = powerup.kind;
    mesh.position.set(powerup.x, 0.16, powerup.z);
    mesh.visible = Boolean(powerup.available);
  }
  for (const [id, mesh] of powerupMeshes) {
    if (seen.has(id)) continue;
    disposeGroup(mesh);
    powerupMeshes.delete(id);
  }
}

function applyPowerupPickup(kind: PowerupKind) {
  if (kind === "ammo") {
    self.reserve = Math.max(self.reserve, 999);
    self.ammo = currentGun().magSize;
    reloadTimer = 0;
    showToast("弾薬パック取得");
  } else if (kind === "speed") {
    showToast("スピードブースト取得");
  } else if (kind === "damage") {
    showToast("火力ブースト取得");
  } else {
    showToast("逆転ブースト取得");
  }
}

function bulletHoleMap() {
  if (bulletHoleTexture) return bulletHoleTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 30);
  gradient.addColorStop(0, "rgba(7, 10, 12, 0.92)");
  gradient.addColorStop(0.35, "rgba(22, 25, 26, 0.72)");
  gradient.addColorStop(0.68, "rgba(60, 54, 48, 0.26)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  context.strokeStyle = "rgba(255,255,255,0.18)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(31, 32, 13, 0, Math.PI * 2);
  context.stroke();
  bulletHoleTexture = new THREE.CanvasTexture(canvas);
  bulletHoleTexture.colorSpace = THREE.SRGBColorSpace;
  return bulletHoleTexture;
}

function bulletHoleMaterial(own: boolean) {
  if (own) {
    bulletHoleOwnMaterial ??= new THREE.MeshBasicMaterial({
      map: bulletHoleMap(),
      transparent: true,
      depthWrite: false,
      opacity: 0.86,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3
    });
    return bulletHoleOwnMaterial;
  }
  bulletHoleOtherMaterial ??= new THREE.MeshBasicMaterial({
    map: bulletHoleMap(),
    transparent: true,
    depthWrite: false,
    opacity: 0.58,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3
  });
  return bulletHoleOtherMaterial;
}

function addBulletDecal(
  point: { x: number; y: number; z: number },
  normal: { x: number; y: number; z: number },
  own: boolean
) {
  const now = performance.now();
  if (now - lastBulletDecalAt < 42 && bulletDecals.length > 12) return;
  lastBulletDecalAt = now;
  const normalVector = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();
  if (normalVector.lengthSq() < 0.5) return;
  const size = own ? 0.34 : 0.28;
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(size, size), bulletHoleMaterial(own));
  decal.position.set(point.x, point.y, point.z).add(normalVector.clone().multiplyScalar(0.018));
  decal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalVector);
  decal.rotateZ(Math.random() * Math.PI * 2);
  scene.add(decal);
  bulletDecals.push({ mesh: decal, expiresAt: now + 22_000 });
  while (bulletDecals.length > 28) {
    const old = bulletDecals.shift();
    if (!old) break;
    scene.remove(old.mesh);
    old.mesh.geometry.dispose();
  }
}

function updateDonPunches(delta: number) {
  for (const [id, punch] of donPunches) {
    punch.mesh.rotation.y += delta * 6;
    if (punch.expiresAt <= Date.now()) {
      disposeGroup(punch.mesh);
      donPunches.delete(id);
    }
  }
}

function updateBarrierAnimation(delta: number) {
  if (!barrierMesh || !barrierMesh.visible) return;
  barrierMesh.rotation.y += delta * 1.1;
}

function updateHealthPickupAnimation(delta: number) {
  if (!healthPickupMesh || !healthPickupMesh.visible) return;
  healthPickupMesh.rotation.y += delta * 1.6;
  healthPickupMesh.position.y = 0.16 + Math.sin(performance.now() * 0.004) * 0.08;
}

function updatePowerupAnimation(delta: number) {
  const now = performance.now();
  for (const mesh of powerupMeshes.values()) {
    if (!mesh.visible) continue;
    mesh.rotation.y += delta * 1.45;
    mesh.position.y = 0.16 + Math.sin(now * 0.004 + mesh.position.x) * 0.07;
  }
}

function updateBulletDecals() {
  const now = performance.now();
  for (let i = bulletDecals.length - 1; i >= 0; i -= 1) {
    const decal = bulletDecals[i];
    if (decal.expiresAt > now) continue;
    scene.remove(decal.mesh);
    decal.mesh.geometry.dispose();
    bulletDecals.splice(i, 1);
  }
}

function clearBulletDecals() {
  for (const decal of bulletDecals.splice(0)) {
    scene.remove(decal.mesh);
    decal.mesh.geometry.dispose();
  }
}

function disposeMaterial(material?: THREE.Material | THREE.Material[]) {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach((item) => disposeMaterial(item));
    return;
  }
  const mappedMaterial = material as THREE.Material & { map?: THREE.Texture };
  mappedMaterial.map?.dispose();
  material.dispose();
}

function disposeObjectResources(object: THREE.Object3D) {
  const renderable = object as THREE.Object3D & { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
  renderable.geometry?.dispose();
  disposeMaterial(renderable.material);
}

function disposeGroup(group: THREE.Group) {
  scene.remove(group);
  group.traverse((child) => {
    disposeObjectResources(child);
  });
}

function startCelebration(name: string) {
  if (celebrationSeenWinner === name) return;
  if (performance.now() < celebrationUntil && winnerName === name) return;
  winnerName = name;
  celebrationSeenWinner = name;
  celebrationUntil = performance.now() + 5000;
  document.body.classList.add("celebrating");
  document.body.dataset.winner = `${name} ${gameModeLabel(gameMode)} 勝利！首領蜂フィーバーMAX！`;
  spawnFireworkBurst(new THREE.Vector3(0, 13, -18), 0xfff36b);
  spawnFireworkBurst(new THREE.Vector3(-14, 11, -10), 0x44d7ff);
  spawnFireworkBurst(new THREE.Vector3(14, 12, -8), 0xff4d4d);
}

function endCelebration() {
  celebrationUntil = 0;
  winnerName = "";
  document.body.classList.remove("celebrating");
  for (const firework of fireworks.splice(0)) {
    scene.remove(firework.mesh);
    firework.mesh.geometry.dispose();
    (firework.mesh.material as THREE.Material).dispose();
  }
}

function spawnFireworkBurst(position: THREE.Vector3, color: number) {
  const count = 18;
  const positions = new Float32Array(count * 3);
  const velocities: THREE.Vector3[] = [];
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
    velocities.push(new THREE.Vector3(
      (Math.random() - 0.5) * 14,
      (Math.random() - 0.1) * 11,
      (Math.random() - 0.5) * 14
    ));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size: 0.38, transparent: true, opacity: 1 });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  fireworks.push({ mesh: points, velocities, life: 2.4 });
  while (fireworks.length > 3) {
    const old = fireworks.shift();
    if (!old) break;
    scene.remove(old.mesh);
    old.mesh.geometry.dispose();
    (old.mesh.material as THREE.Material).dispose();
  }
}

function updateFireworks(delta: number) {
  const now = performance.now();
  if (now < celebrationUntil && now - lastFireworkAt > 620) {
    lastFireworkAt = now;
    spawnFireworkBurst(
      new THREE.Vector3((Math.random() - 0.5) * 42, 10 + Math.random() * 8, -8 - Math.random() * 22),
      [0xfff36b, 0x44d7ff, 0xff4d4d, 0x93e43c][Math.floor(Math.random() * 4)]
    );
  }
  if (now >= celebrationUntil) {
    if (document.body.classList.contains("celebrating")) endCelebration();
  }
  for (let i = fireworks.length - 1; i >= 0; i -= 1) {
    const firework = fireworks[i];
    firework.life -= delta;
    const positions = firework.mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let j = 0; j < firework.velocities.length; j += 1) {
      firework.velocities[j].y -= 5.8 * delta;
      positions.setXYZ(
        j,
        positions.getX(j) + firework.velocities[j].x * delta,
        positions.getY(j) + firework.velocities[j].y * delta,
        positions.getZ(j) + firework.velocities[j].z * delta
      );
    }
    positions.needsUpdate = true;
    const material = firework.mesh.material as THREE.PointsMaterial;
    material.opacity = Math.max(0, firework.life / 2.4);
    if (firework.life <= 0) {
      scene.remove(firework.mesh);
      firework.mesh.geometry.dispose();
      material.dispose();
      fireworks.splice(i, 1);
    }
  }
}

function updateHud(feed: FeedItem[]) {
  const now = performance.now();
  if (now - lastHudRenderedAt < 240) return;
  updateFlowHud(now);
  lastHudRenderedAt = now;
  const me = players.get(self.id);
  if (me) {
    if (me.kills > lastSelfKills) addFlowReward(34 + Math.min(18, (me.kills - lastSelfKills - 1) * 6), "連続キル");
    if (me.score > lastSelfScore && me.kills === lastSelfKills) addFlowReward(18, "チーム前進");
    if (me.health < lastSelfHealth - 12) addFlowReward(8, "立て直し");
    lastSelfKills = me.kills;
    lastSelfScore = me.score;
    lastSelfHealth = me.health;
  }
  updateFocusTaskHud(me?.focusTask);
  updateSafeZoneHud();
  updateVehicleHud();
  healthEl.textContent = String(Math.round(me?.health ?? self.health));
  healthBar.style.width = `${THREE.MathUtils.clamp(((me?.health ?? self.health) / maxHealth) * 100, 0, 100)}%`;
  ammoEl.textContent = reloadTimer > 0 ? "--" : String(self.ammo);
  const gearTier = Math.max(0, Math.floor(Number(me?.equipmentTier) || 0));
  const gearText = gearTier > 0 ? ` / 装備Lv.${gearTier}` : "";
  const activeVehicle = activeVehicleId ? vehicleSnapshots.get(activeVehicleId) : null;
  const vehicleKmh = Math.round(Math.abs(activeVehicle?.speed || 0) * 3.6);
  weaponRangeEl.textContent = activeVehicle
    ? `ROADSTER · ${vehicleKmh}km/h`
    : reloadTimer > 0
    ? `リロード中 / MED ${me?.healPacks ?? 0}${gearText}`
    : `${currentGun().name} · ${currentGun().range}m · MED ${me?.healPacks ?? 0}${gearText}`;
  const movingMode = keys.has("ShiftLeft") ? "SNEAK" : now < sprintUntil && keys.has("KeyW") ? "RUN" : "WALK";
  const shieldLeft = Math.max(0, ((me?.shieldUntil || 0) - Date.now()) / 1000);
  const spawnSafeLeft = Math.max(0, ((me?.spawnProtectedUntil || 0) - Date.now()) / 1000);
  const speedLeft = Math.max(0, (((me?.speedBoostUntil || 0) || (me?.comebackUntil || 0)) - Date.now()) / 1000);
  const damageLeft = Math.max(0, ((me?.damageBoostUntil || 0) - Date.now()) / 1000);
  const lifeText = gameMode === "life3" ? `  LIFE ${me?.lives ?? 3}` : gameMode === "oneLife" ? "  1 LIFE" : gameMode === "practice" ? "  PRACTICE" : gameMode === "castle" ? "  CASTLE" : "";
  const powerText = speedLeft > 0 ? `  SPD ${speedLeft.toFixed(0)}s` : damageLeft > 0 ? `  DMG ${damageLeft.toFixed(0)}s` : gearTier > 0 ? `  GEAR ${gearTier}` : "";
  movementStatusEl.textContent = shieldLeft > 0
    ? `BARRIER ${shieldLeft.toFixed(1)}s`
    : activeVehicle
      ? `DRIVE  ${vehicleKmh}km/h`
      : spawnSafeLeft > 0
        ? `SPAWN SAFE ${spawnSafeLeft.toFixed(1)}s`
    : me?.eliminated
      ? "ELIMINATED"
      : creativeMode || me?.creative
        ? `CREATIVE  高度 ${Math.max(0, self.position.y - 1.6).toFixed(1)}m`
        : `${movingMode}  高度 ${Math.max(0, self.position.y - 1.6).toFixed(1)}m${lifeText}${powerText}`;
  movementStatusEl.parentElement?.classList.toggle("shielded", shieldLeft > 0);
  const charge = Math.min(8, me?.donPunchCharge ?? 0);
  const ready = charge >= 4;
  donPunchButton.textContent = charge >= 8
    ? "ドンパチ(Q) 発動"
    : charge >= 4
      ? `アシナガバチ(Q) 発動  ドンパチ ${charge}/8`
      : `アシナガバチ(Q) ${charge}/4`;
  donPunchButton.classList.toggle("ready", ready);
  donPunchButton.classList.toggle("super", charge >= 8);
  if (ready && !lastDonPunchReady) {
    addFlowReward(charge >= 8 ? 24 : 16, charge >= 8 ? "ドンパチ準備完了" : "必殺準備完了");
    showToast(charge >= 8 ? "ドンパチ発動可能" : "アシナガバチ発動可能");
  }
  lastDonPunchReady = ready;
  const latency = self.latency > 0 ? Math.round(self.latency) : null;
  const fps = measuredFps;
  latencyEl.textContent = `${latency === null ? "--" : latency}ms ${fps === null ? "--" : fps}fps`;
  const latencyBox = latencyEl.parentElement;
  const badConnection = (latency !== null && latency > 140) || (fps !== null && fps < 35);
  const okConnection = !badConnection && ((latency !== null && latency > 80) || (fps !== null && fps < 50));
  const goodConnection = latency !== null && fps !== null && latency <= 80 && fps >= 50;
  latencyBox?.classList.toggle("bad", badConnection);
  latencyBox?.classList.toggle("ok", okConnection);
  latencyBox?.classList.toggle("good", goodConnection);
  playerCountEl.textContent = `(${players.size}/${matchMaxPlayers})`;
  updateSlots();
  updateScoreboard();
  updateFeed(feed);
  if (now - lastMinimapRenderedAt > 100) {
    lastMinimapRenderedAt = now;
    drawMinimap();
  }
}

function weaponDisplayName(weapon: unknown) {
  const key = String(weapon || "");
  return guns.find((gun) => gun.kind === key)?.name || sanitizeTextInput(key, 12, "銃");
}

function combatTargetName(targetId: unknown) {
  const id = String(targetId || "");
  if (id.includes("castle-core")) return "城コア";
  const player = players.get(id);
  return sanitizeTextInput(player?.name, 14, "相手").replace(/[<>]/g, "") || "相手";
}

function pushDamageNotice(kind: "dealt" | "taken", damage: number, weapon: unknown, targetId: unknown, blocked = false) {
  const roundedDamage = Math.max(0, Math.round(damage));
  const card = document.createElement("div");
  card.className = `damage-card ${kind}${blocked ? " blocked" : ""}`;

  const value = document.createElement("strong");
  value.textContent = blocked ? "防御" : `${kind === "taken" ? "-" : "+"}${roundedDamage}`;

  const detail = document.createElement("span");
  const title = document.createElement("b");
  title.textContent = kind === "taken" ? "被ダメージ" : "与ダメージ";
  detail.append(title, document.createTextNode(`${weaponDisplayName(weapon)} / ${combatTargetName(targetId)}`));

  card.append(value, detail);
  damageFeed.prepend(card);
  while (damageFeed.childElementCount > 4) damageFeed.lastElementChild?.remove();
  window.setTimeout(() => card.remove(), 2200);
}

function showHitIndicator(damagedSelf: boolean, damage: number, blocked = false) {
  hitMarker.textContent = blocked ? (damagedSelf ? "BARRIER" : "BLOCK") : damagedSelf ? `DAMAGE -${damage}` : damage ? `HIT +${damage}` : "HIT";
  hitMarker.classList.toggle("danger", damagedSelf);
  hitMarker.classList.toggle("blocked", blocked);
  hitMarker.classList.remove("show");
  void hitMarker.offsetWidth;
  hitMarker.classList.add("show");
  if (!damagedSelf && damage > 0) addFlowReward(Math.min(22, 8 + damage / 5), damage >= 70 ? "大ダメージ" : "命中継続");
}

function addFlowReward(amount: number, label: string) {
  const now = performance.now();
  flowScore = Math.min(100, flowScore + amount);
  flowCombo = now < flowUntil ? Math.min(9, flowCombo + 1) : 1;
  flowUntil = now + 2600;
  flowLabel.textContent = flowCombo >= 3 ? `FLOW x${flowCombo}` : "FLOW";
  flowText.textContent = label;
  flowCard.classList.remove("pulse");
  void flowCard.offsetWidth;
  flowCard.classList.add("pulse");
  updateFlowHud(now);
}

function updateFlowHud(now = performance.now()) {
  const elapsed = Math.min(0.5, Math.max(0, (now - (lastFlowAt || now)) / 1000));
  lastFlowAt = now;
  if (now > flowUntil) {
    flowScore = Math.max(0, flowScore - elapsed * 10);
    flowCombo = 0;
    if (flowScore <= 1) {
      flowLabel.textContent = "FLOW";
      flowText.textContent = "次の一撃";
    }
  } else {
    flowScore = Math.max(0, flowScore - elapsed * 2.2);
  }
  const hot = flowScore >= 68;
  const active = flowScore >= 12 || now < flowUntil;
  flowBar.style.width = `${Math.round(flowScore)}%`;
  flowCard.classList.toggle("active", active);
  flowCard.classList.toggle("hot", hot);
  document.body.classList.toggle("flowing", hot);
}

function updateFocusTaskHud(task?: FocusTask | null) {
  const active = Boolean(task && task.target > 0 && Date.now() < task.expiresAt);
  focusTaskCard.classList.toggle("show", active);
  if (!active || !task) return;
  const progress = Math.min(task.target, Math.max(0, Math.floor(task.progress || 0)));
  const target = Math.max(1, Math.floor(task.target));
  const secondsLeft = Math.max(0, Math.ceil((task.expiresAt - Date.now()) / 1000));
  focusTaskLabel.textContent = secondsLeft <= 12 ? "FOCUS !" : "FOCUS";
  focusTaskText.textContent = task.label || "任意目標";
  focusTaskMeta.textContent = `${progress}/${target}  残り${secondsLeft}s`;
  focusTaskBar.style.width = `${THREE.MathUtils.clamp((progress / target) * 100, 0, 100)}%`;
}

function updateSlots() {
  const list = [...players.values()].sort((a, b) => b.score - a.score);
  const signature = `${gameMode}|${matchMaxPlayers}|${list.map((player) => `${player.id}:${player.color}:${player.cosmeticColor}:${player.skin}:${player.score}:${player.ready}:${player.health}:${player.lives}:${player.eliminated}:${player.healPacks}:${player.equipmentTier}`).join("|")}`;
  if (signature === slotsSignature) return;
  slotsSignature = signature;
  playerSlots.innerHTML = "";
  for (let i = 0; i < matchMaxPlayers; i += 1) {
    const player = list[i];
    const slot = document.createElement("div");
    const canChangeTeam = Boolean(player) && (gameMode === "oneLife" || gameMode === "practice" || gameMode === "life3");
    const shape = player?.skin || ["circle", "triangle", "hex", "dot", "square"][i % 5];
    slot.className = `player-slot ${player?.color || "empty"} ${player?.ready ? "ready" : ""} ${canChangeTeam ? "team-editable" : ""} shape-${shape}`;
    const status = player?.eliminated ? "OUT" : gameMode === "life3" ? `L${player.lives ?? 3}` : gameMode === "oneLife" ? "IN" : gameMode === "practice" ? `${player?.kills ?? 0}K` : player?.score;
    slot.innerHTML = player
      ? `<span class="slot-key">${i + 1}</span><b class="slot-avatar" style="--slot-color:${escapeHtml(player.cosmeticColor || "")}"></b><strong>${escapeHtml(player.name)}</strong><small>${status}</small>${
          canChangeTeam
            ? `<div class="slot-team-actions" aria-label="チーム変更"><button data-player-id="${escapeHtml(player.id)}" data-team-change="blue" class="${player.color === "blue" ? "active" : ""}">青</button><button data-player-id="${escapeHtml(player.id)}" data-team-change="red" class="${player.color === "red" ? "active" : ""}">赤</button></div>`
            : ""
        }`
      : `<span class="slot-key">${i + 1}</span><b class="slot-avatar"></b><strong>空き</strong><small>-</small>`;
    playerSlots.append(slot);
  }
}

function updateScoreboard() {
  const rows = [...players.values()].sort((a, b) => b.score - a.score);
  const signature = rows.map((player) => `${player.id}:${player.score}:${player.kills}:${player.deaths}:${player.damageDealt}:${player.hits}:${player.ready}:${player.lives}:${player.eliminated}`).join("|");
  if (signature === scoreboardSignature) return;
  scoreboardSignature = signature;
  scoreRows.innerHTML = rows.map((player, index) => `
    <div class="score-row ${player.color}">
      <span>#${index + 1} ${escapeHtml(player.name)}</span>
      <strong>${player.score}</strong>
      <small>${player.kills}K/${player.deaths}D  与${Math.round(player.damageDealt || 0)}  命中${player.hits || 0}</small>
      <em>${player.eliminated ? "out" : gameMode === "life3" ? `life ${player.lives ?? 3}` : gameMode === "oneLife" ? "alive" : gameMode === "practice" ? "practice" : player.ready ? "ready" : "wait"}</em>
    </div>
  `).join("");
}

function updateFeed(feed: FeedItem[]) {
  const signature = feed.slice(0, 4).map((item) => item.id).join("|");
  if (signature === feedSignature) return;
  feedSignature = signature;
  feedEl.innerHTML = feed.slice(0, 4).map((item) => {
    const [left, right] = item.text.split(" -> ");
    if (left && right) {
      return `<div class="${item.color}"><span>${escapeHtml(left)}</span><i>▰</i><strong>${escapeHtml(right)}</strong></div>`;
    }
    return `<div class="${item.color}"><span>${escapeHtml(item.text)}</span></div>`;
  }).join("");
}

function updateChat(chat: ChatItem[]) {
  const visible = chat.slice(0, 8);
  const signature = visible.map((item) => item.id).join("|");
  if (signature === chatSignature) return;
  chatSignature = signature;
  chatMessagesEl.innerHTML = visible.map((item) => `
    <div class="${item.color}">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.text)}</span>
    </div>
  `).join("");
}

function pokerStageLabel(stage: string) {
  return {
    waiting: "待機中",
    preflop: "プリフロップ",
    flop: "フロップ",
    turn: "ターン",
    river: "リバー",
    showdown: "ショーダウン"
  }[stage] || stage;
}

function parseCard(card: string) {
  const suit = card.slice(-1);
  const rankValue = Number(card.slice(0, -1));
  const rank = { 14: "A", 13: "K", 12: "Q", 11: "J" }[rankValue as 11 | 12 | 13 | 14] || String(rankValue);
  const symbol = { S: "♠", H: "♥", D: "♦", C: "♣" }[suit as "S" | "H" | "D" | "C"] || "?";
  const red = suit === "H" || suit === "D";
  return { rank, symbol, red };
}

function renderCard(card?: string, hidden = false, variant = "") {
  if (!card || hidden) {
    return `<div class="playing-card card-back ${variant}"><span></span></div>`;
  }
  const parsed = parseCard(card);
  const suitClass = parsed.red ? "red" : "black";
  return `
    <div class="playing-card ${suitClass} ${variant}">
      <div class="card-corner top"><strong>${parsed.rank}</strong><span>${parsed.symbol}</span></div>
      <div class="card-pip">${parsed.symbol}</div>
      <div class="card-rank-main">${parsed.rank}</div>
      <div class="card-corner bottom"><strong>${parsed.rank}</strong><span>${parsed.symbol}</span></div>
    </div>
  `;
}

function renderPoker(snapshot: PokerSnapshot) {
  pokerRoomCodeEl.textContent = snapshot.room;
  pokerPotEl.textContent = `${snapshot.pot}Don`;
  pokerStageEl.textContent = pokerStageLabel(snapshot.stage);
  pokerEventEl.textContent = snapshot.lastEvent || "進行中";
  const remaining = snapshot.turnEndsAt ? Math.max(0, Math.ceil((snapshot.turnEndsAt - snapshot.now) / 1000)) : 0;
  const timerText = snapshot.stage === "showdown" || snapshot.stage === "waiting" ? "--" : `${remaining}s`;
  pokerTimerEl.textContent = timerText;
  pokerHeaderTimerEl.textContent = timerText;
  pokerTimerEl.classList.toggle("danger", remaining <= 3 && remaining > 0);
  pokerHeaderTimerEl.classList.toggle("danger", remaining <= 3 && remaining > 0);
  pokerCommunityEl.innerHTML = [0, 1, 2, 3, 4].map((index) => renderCard(snapshot.community[index], !snapshot.community[index])).join("");

  const revealed = new Map((snapshot.showdown?.revealed || []).map((item) => [item.id, item.hand]));
  pokerSeatsEl.innerHTML = snapshot.players.map((player) => {
    const isMe = player.id === snapshot.selfId;
    const isTurn = player.id === snapshot.turnId;
    const winner = snapshot.showdown?.winners.find((item) => item.id === player.id);
    const cards = isMe ? player.cards : revealed.get(player.id) || [];
    const streak = player.streak && player.streak > 1 ? `<b class="poker-streak">${player.streak}連勝</b>` : "";
    const cardHtml = player.cardCount
      ? [0, 1].map((index) => renderCard(cards[index], !cards[index])).join("")
      : "";
    return `
      <div class="poker-seat ${isMe ? "me" : ""} ${isTurn ? "turn" : ""} ${player.folded ? "folded" : ""}">
        <div class="seat-cards">${cardHtml}</div>
        <strong>${escapeHtml(player.name)}</strong>
        <span>${player.chips}Don</span>
        <small>${escapeHtml(player.bet ? `BET ${player.bet}` : player.lastAction || (player.isBot ? "CP" : "PLAYER"))}</small>
        ${streak}
        ${winner ? `<em>${escapeHtml(winner.label)} +${winner.amount}Don</em>` : ""}
      </div>
    `;
  }).join("");

  const me = snapshot.players.find((player) => player.id === snapshot.selfId);
  pokerMyCardsEl.innerHTML = me?.cards?.length ? me.cards.map((card) => renderCard(card, false, "my-card")).join("") : `${renderCard("", true, "my-card")}${renderCard("", true, "my-card")}`;
  const bankrupt = Boolean(me && me.chips <= 0 && me.bet <= 0);
  pokerJankenPanel.hidden = !bankrupt;
  pokerStackLineEl.textContent = me ? `${me.name} / ${me.chips}Don / コール ${snapshot.toCall}Don${bankrupt ? " / じゃんけん復帰待ち" : ""}` : "2000Don";
  const myTurn = snapshot.turnId === snapshot.selfId && snapshot.stage !== "showdown" && snapshot.stage !== "waiting";
  const requestedMinRaise = Math.max(20, Math.floor(Number(snapshot.minRaise) || 20));
  const maxRaise = me ? Math.max(0, me.chips - snapshot.toCall) : 0;
  const minRaise = maxRaise > 0 ? Math.min(requestedMinRaise, maxRaise) : requestedMinRaise;
  const canRaise = Boolean(myTurn && me && maxRaise > 0 && !bankrupt);
  pokerRaiseAmountInput.min = String(minRaise);
  pokerRaiseAmountInput.max = String(Math.max(minRaise, maxRaise));
  pokerRaiseAmountInput.step = "10";
  const sanitizedRaise = currentPokerRaiseAmount();
  if (pokerRaiseAmountInput.value !== String(sanitizedRaise)) pokerRaiseAmountInput.value = String(sanitizedRaise);
  pokerRaiseAmountInput.disabled = !canRaise;
  pokerFoldButton.disabled = !myTurn || bankrupt;
  pokerCallButton.disabled = !myTurn || bankrupt;
  pokerRaiseButton.disabled = !canRaise;
  pokerCallButton.textContent = snapshot.toCall > 0 ? `コール ${snapshot.toCall}` : "チェック";
  pokerRaiseButton.textContent = canRaise && sanitizedRaise >= maxRaise ? `オールイン ${maxRaise}` : `レイズ ${sanitizedRaise}`;
}

function drawMinimap() {
  minimap.clearRect(0, 0, 220, 220);
  minimap.fillStyle = "rgba(20, 31, 43, .62)";
  minimap.beginPath();
  minimap.arc(110, 110, 104, 0, Math.PI * 2);
  minimap.fill();
  minimap.strokeStyle = "rgba(255,255,255,.8)";
  minimap.lineWidth = 3;
  minimap.stroke();
  minimap.fillStyle = "rgba(255,255,255,.18)";
  const mapScale = 1.08;
  for (const box of minimapBoxes) {
    minimap.fillRect(
      110 + box.x * mapScale - box.w * mapScale / 2,
      110 + box.z * mapScale - box.h * mapScale / 2,
      box.w * mapScale,
      box.h * mapScale
    );
  }
  if (safeZoneSnapshot.enabled) {
    minimap.strokeStyle = safeZoneSnapshot.damage > 0 ? "rgba(95,232,255,.92)" : "rgba(255,255,255,.48)";
    minimap.lineWidth = safeZoneSnapshot.stage === "shrinking" ? 3.5 : 2.5;
    minimap.beginPath();
    minimap.arc(
      110 + safeZoneSnapshot.x * mapScale,
      110 + safeZoneSnapshot.z * mapScale,
      safeZoneSnapshot.radius * mapScale,
      0,
      Math.PI * 2
    );
    minimap.stroke();
  }
  for (const station of vehicleRepairStations) {
    const x = 110 + station.x * mapScale;
    const z = 110 + station.z * mapScale;
    minimap.strokeStyle = "rgba(101,242,160,.9)";
    minimap.lineWidth = 2;
    minimap.beginPath();
    minimap.moveTo(x - 3.5, z);
    minimap.lineTo(x + 3.5, z);
    minimap.moveTo(x, z - 3.5);
    minimap.lineTo(x, z + 3.5);
    minimap.stroke();
  }
  for (const ping of teamPingMeshes.values()) {
    const x = 110 + ping.snapshot.x * mapScale;
    const z = 110 + ping.snapshot.z * mapScale;
    minimap.fillStyle = ping.snapshot.color === "red" ? "#ff8a70" : "#fff36b";
    minimap.beginPath();
    minimap.moveTo(x, z - 5);
    minimap.lineTo(x + 4, z);
    minimap.lineTo(x, z + 5);
    minimap.lineTo(x - 4, z);
    minimap.closePath();
    minimap.fill();
  }
  const me = players.get(self.id);
  if (me || self.joined) {
    const selfX = 110 + self.position.x * mapScale;
    const selfZ = 110 + self.position.z * mapScale;
    const yaw = self.yaw;
    const forwardX = Math.sin(yaw) * -1;
    const forwardZ = -Math.cos(yaw);
    minimap.save();
    minimap.translate(selfX, selfZ);
    minimap.strokeStyle = "rgba(147, 228, 60, .55)";
    minimap.lineWidth = 5;
    minimap.lineCap = "round";
    minimap.beginPath();
    minimap.moveTo(0, 0);
    minimap.lineTo(forwardX * 25, forwardZ * 25);
    minimap.stroke();
    minimap.rotate(-yaw);
    minimap.fillStyle = "#ffffff";
    minimap.strokeStyle = "rgba(147, 228, 60, .95)";
    minimap.lineWidth = 3;
    minimap.beginPath();
    minimap.moveTo(0, -14);
    minimap.lineTo(8, 8);
    minimap.lineTo(0, 4);
    minimap.lineTo(-8, 8);
    minimap.closePath();
    minimap.fill();
    minimap.stroke();
    minimap.restore();
  }
  if (gameMode === "castle") {
    for (const core of castleCores.values()) {
      minimap.fillStyle = "#ffffff";
      minimap.strokeStyle = core.team === "blue" ? "#18aef5" : "#ff4a48";
      minimap.lineWidth = 2;
      minimap.beginPath();
      minimap.rect(110 + core.x * mapScale - 5, 110 + core.z * mapScale - 5, 10, 10);
      minimap.fill();
      minimap.stroke();
    }
  }
}

function flashPokerInviteButton(label: string) {
  if (!pokerJoined) return;
  copyPokerInviteButton.textContent = label;
  window.setTimeout(() => {
    copyPokerInviteButton.textContent = "友達招待";
  }, 1400);
}

async function writeClipboardText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea copy path.
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

async function copyInvite() {
  const play = pokerJoined && pokerRoomCode ? "poker" : "fps";
  const room = play === "poker" ? pokerRoomCode : (self.room || globalFpsRoomCode);
  if (!room) {
    showToast("先にルームを作成してください。");
    return;
  }
  const url = inviteShareUrl(room, play);
  const copied = await writeClipboardText(url);
  if (copied) {
    flashPokerInviteButton("コピー済み");
    showToast(play === "poker" ? "ポーカー招待リンクをコピーしました" : "共通ルーム招待リンクをコピーしました");
    return;
  }
  roomInput.value = room;
  flashPokerInviteButton("コード表示");
  showToast(`コピー不可: コード ${room} を入力欄に表示`);
}

function showToast(message: string) {
  const now = performance.now();
  if (now - lastToastAt < 550 && toast.textContent === message) return;
  lastToastAt = now;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]!);
}

function updateAdaptiveQuality(delta: number, now: number) {
  frameAverageMs = frameAverageMs * 0.94 + delta * 1000 * 0.06;
  if (now - lastQualityCheckAt < 1400) return;
  lastQualityCheckAt = now;

  if (dynamicShadowsEnabled) {
    shadowPerformanceDrops = frameAverageMs > 20.5 ? shadowPerformanceDrops + 1 : Math.max(0, shadowPerformanceDrops - 1);
    if (shadowPerformanceDrops >= 2) {
      dynamicShadowsEnabled = false;
      renderer.shadowMap.enabled = false;
      if (sunLight) sunLight.castShadow = false;
      shadowMaterial.opacity = 0.2;
      shadowMaterial.needsUpdate = true;
    }
  }

  const cap = maxPixelRatio();
  const floor = minPixelRatio();
  const nextPixelRatio = frameAverageMs > 21.2
    ? Math.max(floor, activePixelRatio - 0.08)
    : frameAverageMs < 17.4
      ? Math.min(cap, activePixelRatio + 0.03)
      : activePixelRatio;

  if (Math.abs(nextPixelRatio - activePixelRatio) > 0.02) {
    activePixelRatio = nextPixelRatio;
    renderer.setPixelRatio(activePixelRatio);
  }
}

function updateMeasuredFps(now: number) {
  if (!fpsWindowStartedAt) {
    fpsWindowStartedAt = now;
    fpsFrameCount = 0;
    measuredFps = null;
  }
  fpsFrameCount += 1;
  const elapsed = now - fpsWindowStartedAt;
  if (elapsed >= 1000) {
    measuredFps = Math.max(1, Math.round((fpsFrameCount * 1000) / elapsed));
    fpsWindowStartedAt = now;
    fpsFrameCount = 0;
  }
}

function shortestAngleDelta(from: number, to: number) {
  return THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
}

function findMobileAimTarget() {
  if (!isCoarsePointer()) return null;
  const me = players.get(self.id);
  if (!me || me.eliminated || me.health <= 0) return null;
  const gun = currentGun();
  const maxDistance = Math.min(gun.range, scoped ? 96 : 62);
  const yawLimit = scoped ? 0.18 : 0.16;
  const pitchLimit = scoped ? 0.15 : 0.13;
  let best: { target: PlayerState; yawDelta: number; pitchDelta: number; distance: number; score: number } | null = null;
  for (const target of players.values()) {
    if (target.id === self.id || target.color === me.color || target.eliminated || target.health <= 0 || target.creative) continue;
    const dx = target.x - self.position.x;
    const dy = target.y + 0.65 - self.position.y;
    const dz = target.z - self.position.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance <= 0.1 || distance > maxDistance) continue;
    const targetYaw = Math.atan2(-dx, -dz);
    const targetPitch = Math.asin(THREE.MathUtils.clamp(dy / distance, -0.98, 0.98));
    const yawDelta = shortestAngleDelta(self.yaw, targetYaw);
    const pitchDelta = targetPitch - self.pitch;
    if (Math.abs(yawDelta) > yawLimit || Math.abs(pitchDelta) > pitchLimit) continue;
    const direction = new THREE.Vector3(dx, dy, dz).normalize();
    if (firstObstacleDistance(self.position, direction, distance) < distance - 0.38) continue;
    const score = Math.hypot(yawDelta * 1.25, pitchDelta);
    if (!best || score < best.score) best = { target, yawDelta, pitchDelta, distance, score };
  }
  return best;
}

function applyMobileAimAssist(delta: number) {
  const target = findMobileAimTarget();
  if (!target) return;
  const strength = THREE.MathUtils.clamp(delta * (mobileFiring ? 2.4 : scoped ? 1.25 : 1.05), 0, mobileFiring ? 0.075 : scoped ? 0.045 : 0.034);
  self.yaw += target.yawDelta * strength;
  self.pitch = THREE.MathUtils.clamp(self.pitch + target.pitchDelta * strength, -1.15, 1.1);
  const autoFireCone = scoped ? 0.064 : 0.082;
  if (!mobileFiring && target.score <= autoFireCone && Math.abs(target.yawDelta) <= 0.075 && Math.abs(target.pitchDelta) <= 0.07) {
    shoot();
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  if (document.hidden) {
    fpsWindowStartedAt = 0;
    fpsFrameCount = 0;
    measuredFps = null;
    syncState(now);
    requestAnimationFrame(animate);
    return;
  }
  updateMeasuredFps(now);
  updateAdaptiveQuality(delta, now);
  roundSeconds = Math.max(0, roundSeconds - delta);
  const minutes = Math.floor(roundSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(roundSeconds % 60).toString().padStart(2, "0");
  const clockText = `${minutes}:${seconds}`;
  if (clockText !== lastClockText) {
    lastClockText = clockText;
    roundClock.textContent = clockText;
  }

  updateVehicleVisuals(delta);
  updateSafeZoneVisual(delta);
  updateTeamPings(delta);
  updateAutomaticDoors(delta);
  if (self.joined) updateVehicleInteraction(now);
  if (self.joined) move(delta);
  if (self.joined) applyMobileAimAssist(delta);
  if (self.joined && desktopFiring) shoot();
  if (self.joined && mobileFiring && findMobileAimTarget()) shoot();
  updateKillcam();
  updateCamera();
  updateWeaponMotion(delta);
  updateRemotePlayers();
  updateTracers(delta);
  updateDonPunches(delta);
  updateBarrierAnimation(delta);
  updateHealthPickupAnimation(delta);
  updatePowerupAnimation(delta);
  updateBulletDecals();
  updateFireworks(delta);
  syncState(now);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
