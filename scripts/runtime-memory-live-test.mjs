import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const port = 57_000 + Math.floor(Math.random() * 1_000);
const root = fileURLToPath(new URL("..", import.meta.url));
const healthUrl = `http://127.0.0.1:${port}/health`;
const endpoint = `ws://127.0.0.1:${port}/ws`;
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: "production",
    NODE_OPTIONS: "--max-old-space-size=256",
    DONPACHI_ACCOUNT_SECRET: "runtime-memory-test-account-secret-2026",
    DONPACHI_WS_HANDSHAKE_MS: "1200",
    DONPACHI_WS_HEARTBEAT_MS: "1000"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });

const clients = [];
const pingTimers = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
    } catch {
      // Server startup can briefly refuse connections.
    }
    await delay(75);
  }
  throw new Error(`runtime memory server did not start\n${serverOutput}`);
}

function openSlowClient(index) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(endpoint);
    clients.push(ws);
    const timeout = setTimeout(() => reject(new Error(`slow client ${index} did not join`)), 5_000);
    ws.on("open", () => ws.send(JSON.stringify({
      type: "join",
      name: `Slow${index}`,
      gameMode: "practice",
      cpuFill: true,
      relationMode: "versus"
    })));
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type !== "welcome") return;
      clearTimeout(timeout);
      ws._socket.pause();
      pingTimers.push(setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        try {
          ws.send(JSON.stringify({ type: "ping", at: Date.now() }));
        } catch {
          // The server is expected to terminate the stalled socket.
        }
      }, 250));
      resolve();
    });
    ws.on("error", () => undefined);
  });
}

function openFloodClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(endpoint);
    clients.push(ws);
    const timeout = setTimeout(() => reject(new Error("message flood client was not rate limited")), 5_000);
    ws.on("open", () => ws.send(JSON.stringify({
      type: "join",
      name: "FloodProbe",
      gameMode: "practice",
      cpuFill: false,
      relationMode: "versus"
    })));
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type !== "welcome") return;
      for (let index = 0; index < 140; index += 1) {
        ws.send(JSON.stringify({ type: "ping", at: Date.now() + index }));
      }
    });
    ws.on("close", () => {
      clearTimeout(timeout);
      resolve();
    });
    ws.on("error", () => undefined);
  });
}

try {
  await waitForServer();
  await openFloodClient();
  const orphan = new WebSocket(endpoint);
  clients.push(orphan);
  await Promise.all(Array.from({ length: 7 }, (_, index) => openSlowClient(index)));
  await delay(4_000);

  const response = await fetch(healthUrl, { cache: "no-store" });
  assert.equal(response.ok, true);
  const health = await response.json();
  assert.equal(health.runtime.websockets.active, 0, "stalled and unjoined sockets must be removed");
  assert.ok(health.runtime.websockets.inboundRateTerminated >= 1, "message floods must be rate limited");
  assert.ok(health.runtime.websockets.outboundRateLimited >= 1, "outbound replies must respect the socket rate budget");
  assert.ok(health.runtime.websockets.heartbeatTerminated >= 7, "stalled clients must fail heartbeat checks");
  assert.ok(health.runtime.websockets.rejectedHandshakes >= 1, "unjoined sockets must fail the handshake deadline");
  assert.ok(health.runtime.memoryMiB.rss < 220, `RSS must stay below the free-tier budget: ${health.runtime.memoryMiB.rss} MiB`);
  console.log(`runtime memory live passed: ${health.runtime.memoryMiB.rss} MiB RSS, ${health.runtime.websockets.heartbeatTerminated} stalled sockets terminated`);
} catch (error) {
  throw new Error(`${error.message}\n${serverOutput}`);
} finally {
  for (const timer of pingTimers) clearInterval(timer);
  for (const ws of clients) {
    try {
      ws._socket?.resume();
      ws.terminate();
    } catch {
      // Already closed.
    }
  }
  if (server.exitCode === null) server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    delay(1_000)
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
