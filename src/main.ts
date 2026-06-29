import "./styles.css";
import * as THREE from "three";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronsUp,
  Check,
  Copy,
  Crosshair,
  Maximize2,
  MicOff,
  Minimize2,
  Repeat2,
  RotateCcw,
  Scan,
  Send,
  Settings,
  Signal,
  Users,
  X,
  Zap,
  createIcons
} from "lucide";

type PlayerColor = "blue" | "red";
type TeamChoice = PlayerColor | "auto";
type GameMode = "score10" | "duel" | "life3" | "castle";

type PlayerState = {
  id: string;
  name: string;
  color: PlayerColor;
  cosmeticColor?: string;
  ready: boolean;
  health: number;
  score: number;
  kills: number;
  deaths: number;
  lives?: number;
  eliminated?: boolean;
  creative?: boolean;
  healPacks?: number;
  donPunchCharge?: number;
  shieldUntil?: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  lastSeen: number;
  isBot?: boolean;
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

type CastleCoreSnapshot = {
  team: PlayerColor;
  x: number;
  y: number;
  z: number;
  health: number;
  maxHealth: number;
};

const $ = <T extends HTMLElement>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
};

createIcons({
  icons: {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ChevronsUp,
    Check,
    Copy,
    Crosshair,
    Maximize2,
    MicOff,
    Minimize2,
    Repeat2,
    RotateCcw,
    Scan,
    Send,
    Settings,
    Signal,
    Users,
    X,
    Zap
  }
});

const canvas = $("#game") as HTMLCanvasElement;
const minimapCanvas = $("#minimap") as HTMLCanvasElement;
const minimap = minimapCanvas.getContext("2d")!;
const joinPanel = $("#joinPanel");
const nameInput = $("#nameInput") as HTMLInputElement;
const roomInput = $("#roomInput") as HTMLInputElement;
const onlinePlayersEl = $("#onlinePlayers");
const modeSelect = $("#modeSelect");
const teamSelect = $("#teamSelect");
const settingsModeSelect = $("#settingsModeSelect");
const settingsTeamSelect = $("#settingsTeamSelect");
const createRoomButton = $("#createRoom") as HTMLButtonElement;
const joinRoomButton = $("#joinRoom") as HTMLButtonElement;
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
const settingsPanel = $("#settingsPanel");
const closeSettings = $("#closeSettings") as HTMLButtonElement;
const colorSwatches = $("#colorSwatches");
const soundToggle = $("#soundToggle") as HTMLButtonElement;
const cpuButtons = $("#cpuButtons");
const resetButton = $("#resetButton") as HTMLButtonElement;
const endCelebrationButton = $("#endCelebration") as HTMLButtonElement;
const donPunchButton = $("#donPunchButton") as HTMLButtonElement;
const mobileAimZone = $("#mobileAimZone");
const mobileFullscreen = $("#mobileFullscreen") as HTMLButtonElement;
const mobileStick = $("#mobileStick");
const mobileStickKnob = $("#mobileStickKnob");
const mobileJump = $("#mobileJump") as HTMLButtonElement;
const mobileWeapon = $("#mobileWeapon") as HTMLButtonElement;
const mobileReload = $("#mobileReload") as HTMLButtonElement;
const mobileScope = $("#mobileScope") as HTMLButtonElement;
const mobileSkill = $("#mobileSkill") as HTMLButtonElement;
const hitMarker = $("#hitMarker");
const healthEl = $("#health");
const healthBar = $("#healthBar");
const ammoEl = $("#ammo");
const movementStatusEl = $("#movementStatus");
const latencyEl = $("#latency");
const blueScoreEl = $("#blueScore");
const redScoreEl = $("#redScore");
const playerCountEl = $("#playerCount");
const playerSlots = $("#playerSlots");
const scoreRows = $("#scoreRows");
const feedEl = $("#feed");
const chatMessagesEl = $("#chatMessages");
const chatForm = $("#chatForm") as HTMLFormElement;
const chatInput = $("#chatInput") as HTMLInputElement;
const toast = $("#toast");
const roundClock = $("#roundClock");
const modeLabel = $("#modeLabel");
const targetScoreText = document.querySelector<HTMLElement>(".score-orb strong");

const params = new URLSearchParams(location.search);
const requestedRoom = params.get("room");
if (requestedRoom) roomInput.value = requestedRoom.toUpperCase();
nameInput.value = localStorage.getItem("toybox-name") || `Player${Math.floor(Math.random() * 90 + 10)}`;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance"
});
renderer.setClearColor(0x77c7ff);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x81ccff);
scene.fog = new THREE.Fog(0xa9d5ee, 78, 190);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 220);
camera.position.set(0, 1.6, 8);

const clock = new THREE.Clock();
const playerMeshes = new Map<string, THREE.Group>();
const tracers: { mesh: THREE.Group; life: number }[] = [];
const fireworks: { mesh: THREE.Points; velocities: THREE.Vector3[]; life: number }[] = [];
const donPunches = new Map<string, { mesh: THREE.Group; expiresAt: number; targetId: string }>();
const players = new Map<string, PlayerState>();
const minimapBoxes: { x: number; z: number; w: number; h: number }[] = [];
const keys = new Set<string>();
const movementKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "Space"]);
const arenaHalfSize = 66;
const playerRadius = 0.24;
const jumpVelocity = 7.2;
type GunKind = "rifle" | "smg" | "shotgun" | "marksman" | "burst";
type Gun = {
  kind: GunKind;
  name: string;
  magSize: number;
  fireDelay: number;
  pelletCount: number;
  spread: number;
  range: number;
  tracerColor: number;
};
const guns: Gun[] = [
  { kind: "rifle", name: "AR", magSize: 30, fireDelay: 115, pelletCount: 1, spread: 0.006, range: 72, tracerColor: 0xfff36b },
  { kind: "smg", name: "SMG", magSize: 40, fireDelay: 72, pelletCount: 1, spread: 0.014, range: 44, tracerColor: 0x44d7ff },
  { kind: "shotgun", name: "SG", magSize: 8, fireDelay: 520, pelletCount: 6, spread: 0.055, range: 26, tracerColor: 0xff8a3d },
  { kind: "marksman", name: "DMR", magSize: 12, fireDelay: 310, pelletCount: 1, spread: 0.002, range: 105, tracerColor: 0xdfff7a },
  { kind: "burst", name: "BRST", magSize: 24, fireDelay: 190, pelletCount: 3, spread: 0.01, range: 64, tracerColor: 0xff4dff }
];
let currentGunIndex = 0;
const currentGun = () => guns[currentGunIndex];
let soundEnabled = localStorage.getItem("toybox-sound") !== "off";
let customColor = localStorage.getItem("toybox-color") || "#1598f0";
let audioContext: AudioContext | null = null;
const self = {
  id: "",
  room: "",
  joined: false,
  ready: false,
  health: 100,
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
let targetScore = 10;
let gameMode: GameMode = "score10";
let teamChoice: TeamChoice = (localStorage.getItem("toybox-team") as TeamChoice) || "auto";
let celebrationUntil = 0;
let lastFireworkAt = 0;
let winnerName = "";
let celebrationSeenWinner = "";
let weaponView: THREE.Group | null = null;
let scoped = false;

const palette = {
  concrete: 0xe9edf0,
  white: 0xf7fafc,
  blue: 0x1598f0,
  green: 0x85cf39,
  yellow: 0xf0c433,
  red: 0xff4a48,
  orange: 0xff8a2a,
  purple: 0x9a62ff,
  cyan: 0x35d6c8,
  dark: 0x1f2d37
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
const stairZones: StairZone[] = [];
const walkSurfaces: { minX: number; maxX: number; minZ: number; maxZ: number; y: number }[] = [];
const trampolines: { x: number; z: number; radius: number; force: number }[] = [];
let lastWDownAt = 0;
let sprintUntil = 0;
let lastTrampolineHitAt = 0;
let trampolineBoost = 1;
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
let shotNoiseBuffer: AudioBuffer | null = null;
let barrierMesh: THREE.Group | null = null;
let healthPickupMesh: THREE.Group | null = null;
const castleCoreMeshes = new Map<PlayerColor, THREE.Group>();
const castleCores = new Map<PlayerColor, CastleCoreSnapshot>();
let castleEndsAt = 0;
let desktopFiring = false;
let mobileFiring = false;
let mobileAimPointer: number | null = null;
let mobileAimLastX = 0;
let mobileAimLastY = 0;
let mobileStickPointer: number | null = null;
const remotePositionScratch = new THREE.Vector3();
const donPunchPositionScratch = new THREE.Vector3();
const maxPixelRatio = () => Math.min(window.devicePixelRatio, window.innerWidth < 860 ? 1.08 : 1.45);
let activePixelRatio = maxPixelRatio();
let frameAverageMs = 16.7;
let lastQualityCheckAt = 0;
let lastClockText = "";

renderer.setPixelRatio(activePixelRatio);

function gameModeLabel(mode: GameMode) {
  return mode === "duel" ? "1:1モード" : mode === "life3" ? "ライフ3" : mode === "castle" ? "城攻め" : "10目標";
}

function setGameMode(mode: GameMode) {
  gameMode = mode;
  if (mode === "castle" && !castleEndsAt) roundSeconds = 240;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
    button.classList.toggle("active", button.dataset.mode === mode);
  }
  modeLabel.textContent = mode === "score10" ? "目標スコア" : "ゲームモード";
  if (targetScoreText) targetScoreText.textContent = mode === "score10" ? String(targetScore) : mode === "duel" ? "1:1" : mode === "life3" ? "LIFE" : "CASTLE";
}

function setTeamChoice(team: TeamChoice) {
  teamChoice = team === "blue" || team === "red" ? team : "auto";
  localStorage.setItem("toybox-team", teamChoice);
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-team]")) {
    button.classList.toggle("active", button.dataset.team === teamChoice);
  }
}

function isHostPlayer() {
  return (nameInput.value.trim() || "プレイヤー") === "ひでお";
}

function requestRoomConfig(nextMode = gameMode, nextTeam = teamChoice) {
  if (!self.joined) return false;
  if (!isHostPlayer()) {
    showToast("試合設定はホスト「ひでお」が変更できます。");
    setGameMode(gameMode);
    setTeamChoice(teamChoice);
    return true;
  }
  send({ type: "set_room_config", gameMode: nextMode, team: nextTeam });
  return true;
}

function makeMaterial(color: number, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04 });
}

const materials = {
  floor: makeMaterial(0xd9dde0, 0.92),
  wall: makeMaterial(0xe8edf1, 0.78),
  blue: makeMaterial(palette.blue),
  green: makeMaterial(palette.green),
  yellow: makeMaterial(palette.yellow),
  red: makeMaterial(palette.red),
  orange: makeMaterial(palette.orange),
  purple: makeMaterial(palette.purple),
  cyan: makeMaterial(palette.cyan),
  dark: makeMaterial(palette.dark, 0.65),
  glass: new THREE.MeshStandardMaterial({ color: 0x8bd7ff, roughness: 0.2, metalness: 0.02, transparent: true, opacity: 0.34 })
};

function addLights() {
  scene.add(new THREE.HemisphereLight(0xf6fbff, 0x8da66b, 2.05));
  const sun = new THREE.DirectionalLight(0xfff1d0, 1.85);
  sun.position.set(14, 24, 10);
  scene.add(sun);
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
  scene.add(box);
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
  scene.add(pad, ring);
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
  group.position.set(-60, 0.16, 60);
  scene.add(group);
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
  scene.add(group);
  healthPickupMesh = group;
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
  scene.add(group);
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
  const roadLines = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.08, 132), roadLineMaterial, 14);
  let lineIndex = 0;
  for (let x = -54; x <= 54; x += 18) {
    detail.position.set(x, 0.012, 0);
    detail.rotation.set(-Math.PI / 2, 0, 0);
    detail.updateMatrix();
    roadLines.setMatrixAt(lineIndex, detail.matrix);
    lineIndex += 1;
  }
  for (let z = -54; z <= 54; z += 18) {
    detail.position.set(0, 0.014, z);
    detail.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    detail.updateMatrix();
    roadLines.setMatrixAt(lineIndex, detail.matrix);
    lineIndex += 1;
  }
  roadLines.instanceMatrix.needsUpdate = true;
  scene.add(roadLines);

  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x243847 });
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.52, 0.34), windowMaterial, 96);
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
  windows.instanceMatrix.needsUpdate = true;
  scene.add(windows);

  const ventMaterial = new THREE.MeshBasicMaterial({ color: 0x6c757c });
  const vents = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 0.28, 0.5), ventMaterial, 18);
  for (let i = 0; i < vents.count; i += 1) {
    const angle = i * 1.71;
    detail.position.set(Math.sin(angle) * 48, 0.17, Math.cos(angle * 0.8) * 48);
    detail.rotation.set(0, angle, 0);
    detail.updateMatrix();
    vents.setMatrixAt(i, detail.matrix);
  }
  vents.instanceMatrix.needsUpdate = true;
  scene.add(vents);
}

function addArena() {
  addBox("floor", [0, -0.05, 0], [136, 0.1, 136], materials.floor, false);

  addBox("north wall", [0, 1.2, -67.5], [136, 2.4, 1], materials.wall);
  addBox("south wall", [0, 1.2, 67.5], [136, 2.4, 1], materials.wall);
  addBox("west wall", [-67.5, 1.2, 0], [1, 2.4, 136], materials.wall);
  addBox("east wall", [67.5, 1.2, 0], [1, 2.4, 136], materials.wall);

  addBox("green tower", [8, 2.1, -7.5], [4.8, 4.2, 4.8], materials.green);
  addBox("blue block right", [20, 1.7, -4], [5.8, 3.4, 8], materials.blue);
  addBox("white left cover", [-18, 1.4, -8], [9, 2.8, 3.2], materials.wall);
  addBox("white mid cover", [-4, 1.1, 1.5], [5, 2.2, 3.2], materials.wall);
  addBox("yellow low cover", [6.5, 0.8, 5], [4, 1.6, 4], materials.yellow);
  addBox("blue barrel proxy", [-10, 0.9, 11], [2.4, 1.8, 2.4], materials.blue);
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
  addBox("red kiosk", [-28, 1.6, -9], [3.4, 3.2, 6.5], materials.red);
  addBox("blue watch post", [27, 2.8, 8], [3.8, 5.6, 5.2], materials.blue);
  addBox("green office", [-11, 2.3, -27], [7.5, 4.6, 3.6], materials.green);
  addBox("yellow garage", [28, 1.45, -23], [5.2, 2.9, 8.4], materials.yellow);
  addBox("white courtyard block", [-28, 1.2, 27], [5.8, 2.4, 5.8], materials.wall);
  addBox("high tower north", [-6, 6, 27], [4.8, 12, 4.8], materials.blue);
  addBox("high tower south", [15, 6.8, -28], [5.2, 13.6, 4.4], materials.red);
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
  addBox("orange refinery", [-36, 2.8, -34], [9, 5.6, 5], materials.orange);
  addBox("purple data tower", [37, 6.2, -33], [5.5, 12.4, 5.5], materials.purple);
  addBox("cyan hangar", [-34, 2.2, 33], [12, 4.4, 6], materials.cyan);
  addBox("red gatehouse", [35, 2.6, 34], [8, 5.2, 5], materials.red);
  addBox("white clinic", [-2, 2.1, 39], [10, 4.2, 4.6], materials.wall);
  addBox("orange low maze a", [-38, 0.85, 6], [3.8, 1.7, 10], materials.orange);
  addBox("cyan low maze b", [38, 0.85, -6], [3.8, 1.7, 10], materials.cyan);
  addBox("outer cyan depot", [-56, 2.2, -54], [10, 4.4, 5], materials.cyan);
  addBox("outer orange tower", [56, 5.2, 54], [5, 10.4, 5], materials.orange);
  addBox("outer purple bunker", [-54, 1.4, 52], [8, 2.8, 4], materials.purple);
  addBox("outer white hangar", [54, 2.4, -52], [12, 4.8, 6], materials.wall);
  addBox("outer green cover", [0, 1.2, 58], [16, 2.4, 3], materials.green);
  addBox("outer blue cover", [0, 1.2, -58], [16, 2.4, 3], materials.blue);
  addBox("west mega tower", [-47, 7.4, 0], [5, 14.8, 5], materials.red);
  addBox("east stair tower", [47, 4.5, -44], [7, 9, 5], materials.green);
  addBox("west hide wall", [-58, 1.1, 18], [9, 2.2, 4], materials.wall);
  addBox("east hide wall", [58, 1.1, -18], [9, 2.2, 4], materials.yellow);
  addBox("south mini tower", [-16, 3.1, 54], [8, 6.2, 5], materials.blue);
  addBox("north mini tower", [18, 2.6, -55], [10, 5.2, 4], materials.orange);
  addBox("right long cover", [44, 1.2, 18], [4, 2.4, 12], materials.cyan);
  addBox("purple roof deck", [36, 12.55, -33], [5.8, 0.35, 6.2], materials.purple, false);
  addRealismDetails();
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
  addTrampoline("trampoline center", 0, 8, 2.4, 14.8);
  addTrampoline("trampoline west", -18, -14, 2.2, 13.6);
  addTrampoline("trampoline east", 20, 12, 2.2, 13.6);
  addTrampoline("trampoline roof", -12.8, 20.2, 1.8, 12.8);
  addBarrierPowerup();
  addHealthPickupMesh();

  const ramp = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.28, 3.4), materials.green);
  ramp.rotation.x = -0.45;
  ramp.position.set(18, 0.9, 10);
  scene.add(ramp);

  for (let i = 0; i < 14; i += 1) {
    const color = i % 3 === 0 ? materials.green : i % 3 === 1 ? materials.blue : materials.yellow;
    addBox(`paint-${i}`, [Math.sin(i * 2.7) * 26, 0.01, Math.cos(i * 1.8) * 26], [1.8, 0.04, 0.4], color, false)
      .rotation.y = i * 0.72;
  }
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

function addSky() {
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  for (let i = 0; i < 4; i += 1) {
    const cloud = new THREE.Group();
    const baseX = -22 + i * 6;
    const baseY = 12 + (i % 3) * 1.1;
    const baseZ = -28 - (i % 2) * 5;
    for (let j = 0; j < 2; j += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1.2 + j * 0.24, 6, 4), cloudMaterial);
      puff.position.set(baseX + j * 1.4, baseY + Math.sin(j) * 0.3, baseZ);
      puff.scale.y = 0.45;
      cloud.add(puff);
    }
    scene.add(cloud);
  }
}

function addWeapon() {
  if (weaponView) camera.remove(weaponView);
  const gun = currentGun();
  const weapon = new THREE.Group();
  const receiverLength = gun.kind === "shotgun" ? 1.24 : gun.kind === "smg" ? 0.78 : gun.kind === "marksman" ? 1.32 : 1.1;
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, receiverLength), materials.dark);
  receiver.position.set(0.42, -0.33, -0.82);
  const barrelLength = gun.kind === "marksman" ? 1.34 : gun.kind === "shotgun" ? 1.05 : gun.kind === "smg" ? 0.62 : 0.95;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, gun.kind === "shotgun" ? 0.075 : 0.055, barrelLength, 12), materials.dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.42, -0.29, -1.08 - barrelLength / 2);
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.17, 0.58), materials.dark);
  handguard.position.set(0.42, -0.3, -1.22);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(gun.kind === "smg" ? 0.18 : 0.26, 0.2, gun.kind === "smg" ? 0.3 : 0.52), materials.dark);
  stock.position.set(0.45, -0.34, -0.18);
  stock.rotation.x = -0.16;
  const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.18, gun.kind === "smg" ? 0.48 : gun.kind === "shotgun" ? 0.16 : 0.34, 0.24), materials.dark);
  magazine.position.set(0.42, -0.55, -0.72);
  magazine.rotation.x = 0.18;
  const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.32), materials.dark);
  sightBase.position.set(0.42, -0.16, -1.02);
  const sightRing = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 16), materials.yellow);
  sightRing.rotation.y = Math.PI / 2;
  sightRing.position.set(0.42, -0.08, -1.1);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 12), materials.dark);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0.42, -0.29, -2.04);
  const accent = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.22), materials.yellow);
  accent.position.set(0.27, -0.21, -0.8);
  const labelPlate = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.16), makeMaterial(gun.tracerColor, 0.45));
  labelPlate.position.set(0.24, -0.19, -0.55);
  weapon.add(receiver, barrel, handguard, stock, magazine, sightBase, sightRing, muzzle, accent, labelPlate);
  camera.add(weapon);
  weaponView = weapon;
  scene.add(camera);
}

function createPlayerMesh(player: PlayerState) {
  const group = new THREE.Group();
  const teamMaterial = makeMaterial(colorToNumber(player.cosmeticColor) ?? (player.color === "blue" ? palette.blue : palette.red), 0.7);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.82, 3, 6), teamMaterial);
  body.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), makeMaterial(0x222f39, 0.5));
  head.position.y = 1.58;
  const marker = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.32, 3), makeMaterial(colorToNumber(player.cosmeticColor) ?? (player.color === "blue" ? 0x23b7ff : 0xff5757)));
  marker.position.y = 2.25;
  marker.rotation.x = Math.PI;
  const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.8), materials.dark);
  weapon.position.set(0.36, 1.08, -0.42);
  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 1.85, 1.35),
    new THREE.MeshBasicMaterial({ color: 0x7df7ff, transparent: true, opacity: 0.14, wireframe: true })
  );
  shield.position.y = 0.98;
  shield.visible = false;
  group.add(body, head, marker, weapon, shield);
  scene.add(group);
  return group;
}

function applyPlayerMeshColor(mesh: THREE.Group, player: PlayerState) {
  const color = colorToNumber(player.cosmeticColor) ?? (player.color === "blue" ? palette.blue : palette.red);
  const markerColor = colorToNumber(player.cosmeticColor) ?? (player.color === "blue" ? 0x23b7ff : 0xff5757);
  ((mesh.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(color);
  ((mesh.children[2] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(markerColor);
}

function colorToNumber(color?: string) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return null;
  return Number.parseInt(color.slice(1), 16);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  activePixelRatio = Math.min(activePixelRatio, maxPixelRatio());
  renderer.setPixelRatio(activePixelRatio);
  renderer.setSize(width, height, false);
}

window.addEventListener("resize", resize);
resize();
addLights();
addArena();
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
  if (["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"].includes(event.code)) switchGun(Number(event.code.slice(-1)) - 1);
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
  if (event.button === 2 && currentGun().kind === "marksman") {
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
  if (document.hidden) stopDesktopFire();
});
canvas.addEventListener("contextmenu", (event) => event.preventDefault());

createRoomButton.addEventListener("click", () => join(""));
joinRoomButton.addEventListener("click", () => join(roomInput.value));
readyButton.addEventListener("click", () => {
  self.ready = !self.ready;
  readyButton.classList.toggle("active", self.ready);
  readyButton.querySelector("span")!.textContent = self.ready ? "準備解除" : "準備完了";
  send({ type: "ready", ready: self.ready });
});
copyInviteButton.addEventListener("click", copyInvite);
inviteButton.addEventListener("click", copyInvite);
scoreboardToggle.addEventListener("click", () => scoreboard.classList.toggle("open"));
closeScoreboard.addEventListener("click", () => scoreboard.classList.remove("open"));
settingsButton.addEventListener("click", () => settingsPanel.classList.toggle("open"));
closeSettings.addEventListener("click", () => settingsPanel.classList.remove("open"));
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
    const mode = (button.dataset.mode as GameMode) || "score10";
    if (self.joined) {
      requestRoomConfig(mode, teamChoice);
      return;
    }
    setGameMode(mode);
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-team]")) {
  button.addEventListener("click", () => {
    const team = (button.dataset.team as TeamChoice) || "auto";
    if (self.joined) {
      requestRoomConfig(gameMode, team);
      return;
    }
    setTeamChoice(team);
  });
}
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !self.joined) return;
  send({ type: "chat", text });
  chatInput.value = "";
});
for (const button of colorSwatches.querySelectorAll<HTMLButtonElement>("button")) {
  const color = button.dataset.color || "#1598f0";
  button.style.background = color;
  button.addEventListener("click", () => setCustomColor(color));
}
for (const button of cpuButtons.querySelectorAll<HTMLButtonElement>("button")) {
  button.addEventListener("click", () => {
    const count = Number(button.dataset.cpu) || 0;
    for (const item of cpuButtons.querySelectorAll<HTMLButtonElement>("button")) item.classList.toggle("active", item === button);
    send({ type: "set_cpu", count });
  });
}
endCelebrationButton.addEventListener("click", () => endCelebration());

function isFullscreenActive() {
  return Boolean(document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement);
}

function updateFullscreenButton() {
  mobileFullscreen.innerHTML = isFullscreenActive() ? '<i data-lucide="minimize-2"></i>' : '<i data-lucide="maximize-2"></i>';
  mobileFullscreen.setAttribute("aria-label", isFullscreenActive() ? "全画面解除" : "全画面");
  createIcons({ icons: { Maximize2, Minimize2 } });
}

async function toggleMobileFullscreen() {
  try {
    if (isFullscreenActive()) {
      const exitFullscreen = document.exitFullscreen?.bind(document);
      const webkitExitFullscreen = (document as Document & { webkitExitFullscreen?: () => Promise<void> | void }).webkitExitFullscreen?.bind(document);
      await (exitFullscreen?.() || webkitExitFullscreen?.());
    } else {
      const target = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
      await (target.requestFullscreen?.({ navigationUI: "hide" }) || target.webkitRequestFullscreen?.());
    }
    updateFullscreenButton();
  } catch {
    showToast("全画面にできませんでした。ブラウザ側の許可を確認してください。");
  }
}

mobileFullscreen.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleMobileFullscreen();
});
document.addEventListener("fullscreenchange", updateFullscreenButton);
document.addEventListener("webkitfullscreenchange", updateFullscreenButton);

mobileAimZone.addEventListener("pointerdown", (event) => {
  if (!self.joined) return;
  event.preventDefault();
  mobileAimPointer = event.pointerId;
  mobileAimLastX = event.clientX;
  mobileAimLastY = event.clientY;
  mobileAimZone.setPointerCapture?.(event.pointerId);
});
mobileAimZone.addEventListener("pointermove", (event) => {
  if (mobileAimPointer !== event.pointerId || !self.joined) return;
  event.preventDefault();
  const dx = event.clientX - mobileAimLastX;
  const dy = event.clientY - mobileAimLastY;
  mobileAimLastX = event.clientX;
  mobileAimLastY = event.clientY;
  self.yaw -= dx * 0.0042;
  self.pitch -= dy * 0.0036;
  self.pitch = THREE.MathUtils.clamp(self.pitch, -1.15, 1.1);
});
const releaseMobileAim = (event: PointerEvent) => {
  if (mobileAimPointer === event.pointerId) mobileAimPointer = null;
};
mobileAimZone.addEventListener("pointerup", releaseMobileAim);
mobileAimZone.addEventListener("pointercancel", releaseMobileAim);
mobileAimZone.addEventListener("lostpointercapture", () => {
  mobileAimPointer = null;
});

function clearMobileMoveKeys() {
  keys.delete("KeyW");
  keys.delete("KeyA");
  keys.delete("KeyS");
  keys.delete("KeyD");
}

function updateMobileStick(event: PointerEvent) {
  const rect = mobileStick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const max = rect.width * 0.36;
  const rawX = event.clientX - centerX;
  const rawY = event.clientY - centerY;
  const distance = Math.min(max, Math.hypot(rawX, rawY));
  const angle = Math.atan2(rawY, rawX);
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  const nx = x / max;
  const ny = y / max;

  mobileStickKnob.style.transform = `translate(${x}px, ${y}px)`;
  clearMobileMoveKeys();
  if (ny < -0.22) keys.add("KeyW");
  if (ny > 0.25) keys.add("KeyS");
  if (nx < -0.22) keys.add("KeyA");
  if (nx > 0.22) keys.add("KeyD");
  if (ny < -0.82) sprintUntil = performance.now() + 260;
}

function releaseMobileStick() {
  mobileStickPointer = null;
  clearMobileMoveKeys();
  mobileStickKnob.style.transform = "translate(0, 0)";
}

mobileStick.addEventListener("pointerdown", (event) => {
  if (!self.joined) return;
  event.preventDefault();
  event.stopPropagation();
  mobileStickPointer = event.pointerId;
  mobileStick.setPointerCapture?.(event.pointerId);
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

mobileFire.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  mobileFiring = true;
  mobileFire.setPointerCapture?.(event.pointerId);
  shoot();
});
const releaseMobileFire = () => {
  mobileFiring = false;
};
mobileFire.addEventListener("pointerup", releaseMobileFire);
mobileFire.addEventListener("pointercancel", releaseMobileFire);
mobileFire.addEventListener("lostpointercapture", releaseMobileFire);
mobileJump.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  jumpQueued = true;
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
  if (currentGun().kind !== "marksman") {
    showToast("DMRのみスコープ");
    return;
  }
  scoped = !scoped;
  document.body.classList.toggle("scoped", scoped);
});
mobileSkill.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
  triggerDonPunch();
});
setCustomColor(customColor);
setSoundEnabled(soundEnabled);
setGameMode(gameMode);
setTeamChoice(teamChoice);
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
  if (me.health >= 100) {
    showToast("HPは満タンです");
    return;
  }
  send({ type: "use_heal" });
}

function join(room: string) {
  const name = nameInput.value.trim() || "プレイヤー";
  localStorage.setItem("toybox-name", name);
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();

  const protocol = location.protocol === "https:" ? "wss" : "ws";
  socket = new WebSocket(`${protocol}://${location.host}/ws`);
socket.addEventListener("open", () => {
    send({ type: "join", name, room: room.trim().toUpperCase(), gameMode, team: teamChoice, cosmeticColor: customColor });
  });
  socket.addEventListener("message", handleMessage);
  socket.addEventListener("close", () => {
    if (self.joined) showToast("接続が切れました。再参加してください。");
  });
}

function handleMessage(event: MessageEvent<string>) {
  const message = JSON.parse(event.data);
  if (message.type === "welcome") {
    self.id = message.id;
    self.room = message.room;
    self.joined = true;
    self.position.set(message.spawn.x, message.spawn.y, message.spawn.z);
    self.yaw = typeof message.spawn.yaw === "number" ? message.spawn.yaw : Math.atan2(message.spawn.x, message.spawn.z);
    self.pitch = 0;
    gameMode = (message.gameMode as GameMode) || "score10";
    targetScore = Number(message.targetScore) || 10;
    setGameMode(gameMode);
    setTeamChoice((message.team as TeamChoice) || teamChoice);
    roomCodeEl.textContent = self.room;
    joinPanel.classList.add("hidden");
    history.replaceState(null, "", `?room=${self.room}`);
    showToast("ルームに参加しました。画面をクリックして開始。");
    ping();
    return;
  }
  if (message.type === "snapshot") {
    if (typeof message.targetScore === "number") targetScore = message.targetScore || 10;
    if (message.gameMode) setGameMode(message.gameMode as GameMode);
    castleEndsAt = Number(message.castleEndsAt) || 0;
    if (gameMode === "castle" && castleEndsAt && typeof message.now === "number") {
      roundSeconds = Math.max(0, (castleEndsAt - Number(message.now)) / 1000);
    }
    players.clear();
    for (const player of message.players as PlayerState[]) players.set(player.id, player);
    const me = players.get(self.id);
    if (me) {
      self.health = me.health;
      setTeamChoice(me.color);
    }
    const snapshotCores = message.castleCores as Record<PlayerColor, CastleCoreSnapshot> | undefined;
    blueScoreEl.textContent = gameMode === "castle" && snapshotCores?.blue ? String(Math.ceil(snapshotCores.blue.health)) : String(message.blueScore);
    redScoreEl.textContent = gameMode === "castle" && snapshotCores?.red ? String(Math.ceil(snapshotCores.red.health)) : String(message.redScore);
    if (message.winner) startCelebration(message.winner.name || "勝利チーム");
    syncDonPunchSnapshots((message.donPunches || []) as DonPunchSnapshot[]);
    updateCastleCores(snapshotCores);
    updateBarrierPowerup(message.barrier as BarrierSnapshot | undefined);
    updateHealthPickup(message.healthPickup as HealthPickupSnapshot | undefined);
    updateHud(message.feed || []);
    updateChat(message.chat || []);
    return;
  }
  if (message.type === "room_config") {
    if (typeof message.targetScore === "number") targetScore = message.targetScore || 10;
    if (message.gameMode) setGameMode(message.gameMode as GameMode);
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
    showHitIndicator(damagedSelf, damage);
    if (damagedSelf && damage > 0) playDamageSound();
  }
  if (message.type === "sound") playGameSound(message.sound);
  if (message.type === "ashinaga") addAshinagaBurst(message.origin, message.target, message.shooter === self.id);
  if (message.type === "donpunch") showToast("ドンパンチ接近");
  if (message.type === "respawn" && message.target === self.id) {
    self.position.set(message.spawn.x, message.spawn.y, message.spawn.z);
    lastSafePosition.copy(self.position);
    self.yaw = typeof message.spawn.yaw === "number" ? message.spawn.yaw : self.yaw;
    self.pitch = 0;
    self.velocity.set(0, 0, 0);
    self.health = 100;
    showToast("リスポーン");
  }
  if (message.type === "celebration") startCelebration(message.winner?.name || "勝利チーム");
  if (message.type === "error") showToast(message.message);
}

function send(payload: Record<string, unknown>) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

async function refreshOnlinePlayers() {
  try {
    const response = await fetch("/health", { cache: "no-store" });
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
  send({ type: "customize", cosmeticColor: color });
}

function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  localStorage.setItem("toybox-sound", enabled ? "on" : "off");
  soundToggle.textContent = enabled ? "ON" : "OFF";
  muteButton.classList.toggle("active", !enabled);
}

function playTone(frequency: number, duration = 0.07, volume = 0.04) {
  if (!soundEnabled) return;
  audioContext ||= new AudioContext();
  void audioContext.resume();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "square";
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function playSweep(start: number, end: number, duration: number, volume = 0.045, type: OscillatorType = "sine") {
  if (!soundEnabled) return;
  audioContext ||= new AudioContext();
  void audioContext.resume();
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(start, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playNoiseHit(duration = 0.12, volume = 0.08, frequency = 360) {
  if (!soundEnabled) return;
  audioContext ||= new AudioContext();
  void audioContext.resume();
  const now = audioContext.currentTime;
  const samples = Math.max(1, Math.floor(audioContext.sampleRate * duration));
  const buffer = audioContext.createBuffer(1, samples, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / samples);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  const filter = audioContext.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = 1.1;
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.connect(filter).connect(gain).connect(audioContext.destination);
  source.start(now);
  source.stop(now + duration);
}

function playDamageSound() {
  playNoiseHit(0.16, 0.12, 260);
  playSweep(170, 74, 0.18, 0.05, "sawtooth");
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
  if (!soundEnabled) return;
  audioContext ||= new AudioContext();
  void audioContext.resume();
  if (!shotNoiseBuffer) {
    shotNoiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.18, audioContext.sampleRate);
    const data = shotNoiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const now = audioContext.currentTime;
  const profile = {
    rifle: { thump: 92, crack: 760, dur: 0.11, vol: 0.16 },
    smg: { thump: 118, crack: 980, dur: 0.075, vol: 0.11 },
    shotgun: { thump: 64, crack: 520, dur: 0.18, vol: 0.22 },
    marksman: { thump: 78, crack: 1220, dur: 0.15, vol: 0.18 },
    burst: { thump: 104, crack: 860, dur: 0.09, vol: 0.12 }
  }[gun.kind];

  const noise = audioContext.createBufferSource();
  noise.buffer = shotNoiseBuffer;
  const filter = audioContext.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = profile.crack;
  filter.Q.value = gun.kind === "shotgun" ? 0.8 : 1.4;
  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(profile.vol, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + profile.dur);
  noise.connect(filter).connect(noiseGain).connect(audioContext.destination);
  noise.start(now);
  noise.stop(now + profile.dur);

  const thump = audioContext.createOscillator();
  const thumpGain = audioContext.createGain();
  thump.type = "triangle";
  thump.frequency.setValueAtTime(profile.thump, now);
  thump.frequency.exponentialRampToValueAtTime(profile.thump * 0.45, now + profile.dur);
  thumpGain.gain.setValueAtTime(profile.vol * 0.7, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + profile.dur * 0.9);
  thump.connect(thumpGain).connect(audioContext.destination);
  thump.start(now);
  thump.stop(now + profile.dur);
}

function ping() {
  if (!self.joined) return;
  self.pingStarted = performance.now();
  send({ type: "pong", at: self.pingStarted });
  setTimeout(ping, 2500);
}

function move(delta: number) {
  const me = players.get(self.id);
  if (me?.creative && !creativeMode) creativeMode = true;
  if (me?.eliminated || (me && me.health <= 0)) return;
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
  const speed = sneaking ? 2.8 : sprinting ? 10.2 : 5.5;
  const forward = getLookDirection();
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
  const wish = new THREE.Vector3();
  if (keys.has("KeyW")) wish.add(forward);
  if (keys.has("KeyS")) wish.sub(forward);
  if (keys.has("KeyD")) wish.add(right);
  if (keys.has("KeyA")) wish.sub(right);
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
      trampolineBoost = now - lastTrampolineHitAt < 4200 ? Math.min(trampolineBoost * 1.5, 5.1) : 1;
      lastTrampolineHitAt = now;
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
  self.position.set(0, 1.6, 10);
  self.velocity.set(0, 0, 0);
  self.pitch = 0;
  self.yaw = 0;
  self.health = 100;
  reloadTimer = 0;
  trampolineBoost = 1;
  scoped = false;
  celebrationSeenWinner = "";
  endCelebration();
  document.body.classList.remove("scoped");
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

function collides(position: THREE.Vector3) {
  const minY = position.y - 1.38;
  const maxY = position.y + 0.22;
  const playerBox = new THREE.Box3(
    new THREE.Vector3(position.x - playerRadius, minY, position.z - playerRadius),
    new THREE.Vector3(position.x + playerRadius, maxY, position.z + playerRadius)
  );
  return colliders.some((box) => box.intersectsBox(playerBox));
}

function shoot() {
  const me = players.get(self.id);
  if (me?.eliminated || (me && me.health <= 0)) return;
  const now = performance.now();
  const gun = currentGun();
  if (reloadTimer > 0 || now - self.lastShot < gun.fireDelay) return;
  if (self.ammo <= 0) {
    reload();
    return;
  }
  self.lastShot = now;
  self.ammo -= 1;
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

function flashMuzzle() {
  playGunSound(currentGun());
  const flash = new THREE.PointLight(0xfff066, 4, 7);
  flash.position.copy(self.position).add(getLookDirection().multiplyScalar(1.5));
  scene.add(flash);
  setTimeout(() => scene.remove(flash), 55);
  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(currentGun().kind === "shotgun" ? 0.2 : 0.13, 8, 6),
    new THREE.MeshBasicMaterial({ color: currentGun().tracerColor, transparent: true, opacity: 0.85 })
  );
  spark.position.copy(self.position).add(getLookDirection().multiplyScalar(1.2));
  scene.add(spark);
  setTimeout(() => {
    scene.remove(spark);
    spark.geometry.dispose();
    (spark.material as THREE.Material).dispose();
  }, 80);
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
  showToast(`${currentGun().name} に変更`);
}

function getLookDirection() {
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyEuler(new THREE.Euler(self.pitch, self.yaw, 0, "YXZ"));
  return direction.normalize();
}

function updateCamera() {
  camera.position.copy(self.position);
  camera.rotation.order = "YXZ";
  camera.rotation.y = self.yaw;
  camera.rotation.x = self.pitch;
  const targetFov = scoped && currentGun().kind === "marksman" ? 31 : 72;
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
    }
  }
});

function syncState(now: number) {
  if (!self.joined || now - lastStateSent < 75) return;
  lastStateSent = now;
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
    mesh.children[4].visible = (player.shieldUntil || 0) > Date.now();
    mesh.visible = player.health > 0;
  }
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
  if (!pickup || gameMode !== "duel") {
    healthPickupMesh.visible = false;
    return;
  }
  healthPickupMesh.position.set(pickup.x, 0.16, pickup.z);
  healthPickupMesh.visible = Boolean(pickup.available);
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

function disposeGroup(group: THREE.Group) {
  scene.remove(group);
  group.traverse((child) => {
    const mesh = child as THREE.Mesh | THREE.Line;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material | undefined;
    material?.dispose();
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
  lastHudRenderedAt = now;
  const me = players.get(self.id);
  healthEl.textContent = String(Math.round(me?.health ?? self.health));
  healthBar.style.width = `${Math.max(0, me?.health ?? self.health)}%`;
  ammoEl.textContent = reloadTimer > 0 ? `--  MED ${me?.healPacks ?? 0}` : `${currentGun().name} ${self.ammo}  MED ${me?.healPacks ?? 0}`;
  const movingMode = keys.has("ShiftLeft") ? "SNEAK" : now < sprintUntil && keys.has("KeyW") ? "RUN" : "WALK";
  const shieldLeft = Math.max(0, ((me?.shieldUntil || 0) - Date.now()) / 1000);
  const lifeText = gameMode === "life3" ? `  LIFE ${me?.lives ?? 3}` : gameMode === "duel" ? "  1:1" : gameMode === "castle" ? "  CASTLE" : "";
  movementStatusEl.textContent = shieldLeft > 0
    ? `BARRIER ${shieldLeft.toFixed(1)}s`
    : me?.eliminated
      ? "ELIMINATED"
      : creativeMode || me?.creative
        ? `CREATIVE  高度 ${Math.max(0, self.position.y - 1.6).toFixed(1)}m`
        : `${movingMode}  高度 ${Math.max(0, self.position.y - 1.6).toFixed(1)}m${lifeText}`;
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
  if (ready && !lastDonPunchReady) showToast(charge >= 8 ? "ドンパチ発動可能" : "アシナガバチ発動可能");
  lastDonPunchReady = ready;
  latencyEl.textContent = self.latency ? `${Math.round(self.latency)}ms` : "24ms";
  playerCountEl.textContent = `(${players.size}/8)`;
  updateSlots();
  updateScoreboard();
  updateFeed(feed);
  if (now - lastMinimapRenderedAt > 500) {
    lastMinimapRenderedAt = now;
    drawMinimap();
  }
}

function showHitIndicator(damagedSelf: boolean, damage: number) {
  hitMarker.textContent = damagedSelf ? `DAMAGE -${damage}` : damage ? `HIT +${damage}` : "HIT";
  hitMarker.classList.toggle("danger", damagedSelf);
  hitMarker.classList.remove("show");
  void hitMarker.offsetWidth;
  hitMarker.classList.add("show");
}

function updateSlots() {
  const list = [...players.values()].sort((a, b) => b.score - a.score);
  const signature = `${gameMode}|${list.map((player) => `${player.id}:${player.color}:${player.score}:${player.ready}:${player.health}:${player.lives}:${player.eliminated}:${player.healPacks}`).join("|")}`;
  if (signature === slotsSignature) return;
  slotsSignature = signature;
  playerSlots.innerHTML = "";
  for (let i = 0; i < 8; i += 1) {
    const player = list[i];
    const slot = document.createElement("div");
    const canChangeTeam = Boolean(player) && (gameMode === "score10" || gameMode === "life3");
    slot.className = `player-slot ${player?.color || "empty"} ${player?.ready ? "ready" : ""} ${canChangeTeam ? "team-editable" : ""}`;
    const status = player?.eliminated ? "OUT" : gameMode === "life3" ? `L${player.lives ?? 3}` : player?.score;
    slot.innerHTML = player
      ? `<span>${i + 1}</span><strong>${escapeHtml(player.name)}</strong><small>${status}</small>${
          canChangeTeam
            ? `<div class="slot-team-actions" aria-label="チーム変更"><button data-player-id="${player.id}" data-team-change="blue" class="${player.color === "blue" ? "active" : ""}">青</button><button data-player-id="${player.id}" data-team-change="red" class="${player.color === "red" ? "active" : ""}">赤</button></div>`
            : ""
        }`
      : `<span>${i + 1}</span><strong>空き</strong><small>-</small>`;
    playerSlots.append(slot);
  }
}

function updateScoreboard() {
  const rows = [...players.values()].sort((a, b) => b.score - a.score);
  const signature = rows.map((player) => `${player.id}:${player.score}:${player.kills}:${player.deaths}:${player.ready}:${player.lives}:${player.eliminated}`).join("|");
  if (signature === scoreboardSignature) return;
  scoreboardSignature = signature;
  scoreRows.innerHTML = rows.map((player) => `
    <div class="score-row ${player.color}">
      <span>${escapeHtml(player.name)}</span>
      <strong>${player.score}</strong>
      <small>${player.kills}K / ${player.deaths}D</small>
      <em>${player.eliminated ? "out" : gameMode === "life3" ? `life ${player.lives ?? 3}` : player.ready ? "ready" : "wait"}</em>
    </div>
  `).join("");
}

function updateFeed(feed: FeedItem[]) {
  const signature = feed.slice(0, 4).map((item) => item.id).join("|");
  if (signature === feedSignature) return;
  feedSignature = signature;
  feedEl.innerHTML = feed.slice(0, 4).map((item) => `<div class="${item.color}">${escapeHtml(item.text)}</div>`).join("");
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
  const mapScale = 1.48;
  for (const box of minimapBoxes) {
    minimap.fillRect(
      110 + box.x * mapScale - box.w * mapScale / 2,
      110 + box.z * mapScale - box.h * mapScale / 2,
      box.w * mapScale,
      box.h * mapScale
    );
  }
  for (const player of players.values()) {
    minimap.fillStyle = player.id === self.id ? "#ffffff" : player.color === "blue" ? "#18aef5" : "#ff4a48";
    minimap.beginPath();
    minimap.arc(110 + player.x * mapScale, 110 + player.z * mapScale, player.id === self.id ? 8 : 6, 0, Math.PI * 2);
    minimap.fill();
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

function copyInvite() {
  if (!self.room) {
    showToast("先にルームを作成してください。");
    return;
  }
  const url = `${location.origin}${location.pathname}?room=${self.room}`;
  navigator.clipboard?.writeText(url).then(
    () => showToast("招待リンクをコピーしました"),
    () => showToast(url)
  );
}

function showToast(message: string) {
  const now = performance.now();
  if (now - lastToastAt < 550 && toast.textContent === message) return;
  lastToastAt = now;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
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

  const cap = maxPixelRatio();
  const nextPixelRatio = frameAverageMs > 24
    ? Math.max(0.72, activePixelRatio - 0.16)
    : frameAverageMs < 16.8
      ? Math.min(cap, activePixelRatio + 0.06)
      : activePixelRatio;

  if (Math.abs(nextPixelRatio - activePixelRatio) > 0.02) {
    activePixelRatio = nextPixelRatio;
    renderer.setPixelRatio(activePixelRatio);
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  if (document.hidden) {
    syncState(now);
    requestAnimationFrame(animate);
    return;
  }
  updateAdaptiveQuality(delta, now);
  roundSeconds = Math.max(0, roundSeconds - delta);
  const minutes = Math.floor(roundSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(roundSeconds % 60).toString().padStart(2, "0");
  const clockText = `${minutes}:${seconds}`;
  if (clockText !== lastClockText) {
    lastClockText = clockText;
    roundClock.textContent = clockText;
  }

  if (self.joined) move(delta);
  if (self.joined && (desktopFiring || mobileFiring)) shoot();
  updateCamera();
  updateRemotePlayers();
  updateTracers(delta);
  updateDonPunches(delta);
  updateBarrierAnimation(delta);
  updateHealthPickupAnimation(delta);
  updateFireworks(delta);
  syncState(now);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
