import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = 57_000 + Math.floor(Math.random() * 800);
const baseUrl = `http://127.0.0.1:${port}`;
const profileStore = `/tmp/donpachi-account-live-${process.pid}.json`;
const accountSecret = randomBytes(48).toString("hex");
const loginId = `SecurePlayer${process.pid}`;
const password = "SecurePass2026";
let server;
let serverOutput = "";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 8_000) {
    try {
      if ((await fetch(`${baseUrl}/health`, { cache: "no-store" })).ok) return;
    } catch {
      // Server is still starting.
    }
    await delay(60);
  }
  throw new Error(`account test server did not start\n${serverOutput}`);
}

async function startServer() {
  serverOutput = "";
  server = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "production",
      DONPACHI_PROFILE_STORE: profileStore,
      DONPACHI_ACCOUNT_SECRET: accountSecret
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
  server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });
  await waitForServer();
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => server.once("exit", resolve)), delay(1_000)]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  return { response, payload };
}

try {
  await unlink(profileStore).catch(() => undefined);
  await startServer();

  const created = await post("/api/profile", {
    mode: "create",
    loginId,
    password,
    name: "Secure Player",
    progress: { xp: 999_999 },
    inventory: { don: 999_999 }
  });
  assert.equal(created.response.status, 200);
  assert.equal(created.payload.profile.progress.xp, 0, "a new account must not trust client XP");
  assert.equal(created.payload.profile.inventory.don, 2000, "a new account must not trust client Don");
  assert.ok(created.payload.sessionToken.length > 40);
  assert.ok(created.payload.accountVault.length > 100);

  const unauthenticatedWallet = await post("/api/wallet", { loginId });
  assert.equal(unauthenticatedWallet.response.status, 401);

  const wrongPassword = await post("/api/profile", {
    mode: "login",
    loginId,
    password: "Incorrect999"
  });
  assert.equal(wrongPassword.response.status, 401);

  const purchased = await post("/api/shop", {
    loginId,
    sessionToken: created.payload.sessionToken,
    accountVault: created.payload.accountVault,
    itemId: "upgrade_attack"
  });
  assert.equal(purchased.response.status, 200);
  assert.equal(purchased.payload.profile.inventory.don, 1500);
  assert.equal(purchased.payload.profile.inventory.upgrades.attack, 1);
  assert.equal(purchased.payload.profile.bonuses.attackPercent, 2);

  await stopServer();
  await unlink(profileStore).catch(() => undefined);
  await startServer();

  const tamperedVault = `${purchased.payload.accountVault.slice(0, -1)}x`;
  const rejectedRestore = await post("/api/wallet", {
    loginId,
    sessionToken: purchased.payload.sessionToken,
    accountVault: tamperedVault
  });
  assert.equal(rejectedRestore.response.status, 401, "tampered vault must not restore an account");

  const restored = await post("/api/wallet", {
    loginId,
    sessionToken: purchased.payload.sessionToken,
    accountVault: purchased.payload.accountVault
  });
  assert.equal(restored.response.status, 200);
  assert.equal(restored.payload.balance, 1500, "encrypted vault must restore Don after store replacement");

  const loggedIn = await post("/api/profile", {
    mode: "login",
    loginId,
    password
  });
  assert.equal(loggedIn.response.status, 200);
  assert.equal(loggedIn.payload.profile.inventory.upgrades.attack, 1);
  assert.equal(loggedIn.payload.profile.inventory.don, 1500);

  const duplicate = await post("/api/profile", {
    mode: "create",
    loginId,
    password
  });
  assert.equal(duplicate.response.status, 409);

  console.log("account progression live passed: password auth, authoritative economy, shop purchase, tamper rejection, and encrypted reset recovery");
} finally {
  await stopServer();
  await unlink(profileStore).catch(() => undefined);
}
