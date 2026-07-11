import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = 54_000 + Math.floor(Math.random() * 1_000);
const endpoint = `ws://127.0.0.1:${port}/ws`;
let serverOutput = "";
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: "production",
    DONPACHI_QA_STATE: "1",
    DONPACHI_PROFILE_STORE: `/tmp/donpachi-vertical-test-${process.pid}.json`
  },
  stdio: ["ignore", "pipe", "pipe"]
});
server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, label, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return;
    await delay(55);
  }
  throw new Error(`timeout: ${label}\n${serverOutput}`);
}

const snapshots = [];
const statuses = [];
const impacts = [];
let ws;
let welcome;

const send = (payload) => ws.send(JSON.stringify(payload));
const latest = () => snapshots.at(-1);
const me = () => latest()?.players?.find((player) => player.id === welcome?.id);
const lift = () => latest()?.elevators?.find((elevator) => elevator.id === "aurora-lift");

try {
  await waitFor(async () => {
    try {
      return (await fetch(`http://127.0.0.1:${port}/health`)).ok;
    } catch {
      return false;
    }
  }, "vertical server start");

  welcome = await new Promise((resolve, reject) => {
    ws = new WebSocket(endpoint);
    const timeout = setTimeout(() => reject(new Error("timeout joining vertical room")), 5000);
    ws.on("open", () => ws.send(JSON.stringify({
      type: "join",
      name: "こーた",
      gameMode: "practice",
      cpuFill: false,
      relationMode: "coop"
    })));
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "welcome") {
        clearTimeout(timeout);
        resolve(message);
      } else if (message.type === "snapshot") {
        snapshots.push(message);
        if (snapshots.length > 420) snapshots.shift();
      } else if (message.type === "elevator_status") {
        statuses.push(message);
      } else if (message.type === "impact") {
        impacts.push(message);
      }
    });
    ws.on("error", reject);
  });

  await waitFor(() => latest()?.worldVersion === "VERTICAL 4.0" && latest()?.elevators?.length === 2, "shared vertical snapshot");
  send({ type: "ready", ready: true });
  await waitFor(() => latest()?.matchPhase === "active", "vertical room enters active combat", 7000);
  assert.equal(lift().currentFloor, 0);

  send({ type: "elevator_interact", elevatorId: "aurora-lift" });
  await delay(420);
  assert.equal(lift().targetFloor, 0, "remote elevator interaction must be rejected");

  send({ type: "creative_toggle", enabled: true });
  send({ type: "state", x: 79.7, y: 1.6, z: -29.15, yaw: 0, pitch: 0 });
  await waitFor(() => me() && Math.hypot(me().x - 79.7, me().z + 29.15) < 0.25, "creative elevator placement");
  send({ type: "creative_toggle", enabled: false });
  send({ type: "elevator_interact", elevatorId: "aurora-lift", direction: 1 });
  await waitFor(() => lift()?.moving && lift()?.targetFloor === 1, "elevator departs for floor two");
  await waitFor(() => lift()?.currentFloor === 1 && !lift()?.moving, "elevator reaches floor two", 6000);
  assert.ok(statuses.some((status) => status.status === "departing" && status.targetFloor === 1));

  send({ type: "creative_toggle", enabled: true });
  send({ type: "state", x: 79.7, y: 4, z: -29.15, yaw: 0, pitch: -1.2 });
  await waitFor(() => me()?.y > 3.9 && me()?.y < 4.1, "projectile platform placement");
  send({ type: "creative_toggle", enabled: false });
  send({
    type: "shoot",
    origin: { x: 79.7, y: 4, z: -29.15 },
    direction: { x: 0, y: 1, z: 0 },
    weapon: "rifle"
  });
  await waitFor(() => impacts.some((impact) => impact.point?.y > 5.3 && impact.point?.y < 5.7), "elevator platform blocks projectiles");

  send({ type: "set_cpu", count: 19 });
  await waitFor(() => latest()?.players?.filter((player) => player.isBot).length === 19, "19 CP vertical opponents", 9000);
  send({ type: "ready", ready: true });
  await waitFor(() => latest()?.matchPhase === "active", "vertical CP match restarts after CPU fill", 7000);
  send({ type: "creative_toggle", enabled: true });
  send({ type: "state", x: 74, y: 7.26, z: -20, yaw: 0, pitch: 0 });
  await waitFor(() => me()?.y > 7, "creative upper-floor placement");
  send({ type: "creative_toggle", enabled: false });

  const observedTracks = new Map();
  let sawVerticalTactic = false;
  let sawAscendingHeight = false;
  let maximumBotHeight = 1.6;
  let minimumVerticalDistance = Infinity;
  const observationStart = Date.now();
  while (Date.now() - observationStart < 12_000 && !sawAscendingHeight) {
    const snapshot = latest();
    for (const bot of snapshot?.players?.filter((player) => player.isBot) || []) {
      if (bot.botTactic === "vertical") sawVerticalTactic = true;
      if (bot.y > 3.2) sawAscendingHeight = true;
      maximumBotHeight = Math.max(maximumBotHeight, bot.y);
      if (bot.botTactic === "vertical") minimumVerticalDistance = Math.min(minimumVerticalDistance, Math.hypot(bot.x - 67.38, bot.z + 25.7));
      const previous = observedTracks.get(bot.id);
      if (previous && snapshot.now > previous.now) {
        const elapsed = (snapshot.now - previous.now) / 1000;
        const speed = Math.hypot(bot.x - previous.x, bot.y - previous.y, bot.z - previous.z) / elapsed;
        assert.ok(speed < 12, `CP ${bot.id} warped vertically at ${speed.toFixed(2)}m/s`);
      }
      observedTracks.set(bot.id, { x: bot.x, y: bot.y, z: bot.z, now: snapshot.now });
    }
    await delay(90);
  }
  const verticalPositions = (latest()?.players || [])
    .filter((player) => player.isBot && player.botTactic === "vertical")
    .slice(0, 8)
    .map((player) => ({
      x: Number(player.x.toFixed(1)),
      y: Number(player.y.toFixed(1)),
      z: Number(player.z.toFixed(1)),
      stage: player.qaVerticalStage,
      progress: Number((player.qaVerticalProgress || 0).toFixed(2)),
      index: player.qaBotIndex,
      block: player.qaMoveBlock
    }));
  const door = latest()?.doors?.find((item) => item.id === "aurora-entry");
  const diagnostic = `maxY=${maximumBotHeight.toFixed(2)} stairDistance=${minimumVerticalDistance.toFixed(2)} door=${JSON.stringify(door)} vertical=${JSON.stringify(verticalPositions)} human=${JSON.stringify(me())}`;
  assert.equal(sawVerticalTactic, true, `a CP must select the vertical route tactic (${diagnostic})`);
  assert.equal(sawAscendingHeight, true, `a CP must physically gain height on the spiral route (${diagnostic})`);

  send({ type: "leave" });
  await delay(80);
  console.log("vertical live passed: remote lift use rejected, two lifts synchronized, arrival and projectile collision completed, 19 CPs climbed without warping");
} finally {
  if (ws?.readyState === WebSocket.OPEN) ws.close(1000, "cleanup");
  if (server.exitCode === null) server.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => server.once("exit", resolve)), delay(1000)]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
