import { spawn, execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stateDir = path.join(root, "tmp");
const tunnelLog = path.join(stateDir, "lhr-tunnel.log");
const serverLog = path.join(stateDir, "server.log");
const currentUrlFile = path.join(stateDir, "current-lhr-url.txt");
const currentJsonFile = path.join(stateDir, "current-lhr-url.json");
const npmBin = "/usr/local/bin/npm";
const jobEnv = { ...process.env, PATH: `/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH || ""}` };
const force = process.argv.includes("--force");

function isWeekdayDaylight(date = new Date()) {
  const day = date.getDay();
  const hour = date.getHours();
  return day >= 1 && day <= 5 && hour >= 6 && hour <= 18;
}

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, { cwd: root, env: jobEnv, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
    child.stdin?.end();
  });
}

async function localHealthOk() {
  try {
    const response = await fetch("http://127.0.0.1:5188/health", { cache: "no-store" });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.ok === true;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await localHealthOk()) return;

  const out = await import("node:fs").then((fs) => fs.openSync(serverLog, "a"));
  const child = spawn(npmBin, ["run", "start"], {
    cwd: root,
    detached: true,
    stdio: ["ignore", out, out],
    env: { ...jobEnv, NODE_ENV: "production" }
  });
  child.unref();

  const started = Date.now();
  while (Date.now() - started < 15000) {
    if (await localHealthOk()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("local server did not become healthy on http://127.0.0.1:5188/health");
}

async function killOldTunnel() {
  await run("/bin/zsh", ["-lc", "pkill -f 'ssh .*nokey@localhost.run' || true"]);
}

async function startTunnel() {
  await writeFile(tunnelLog, "");
  const out = await import("node:fs").then((fs) => fs.openSync(tunnelLog, "a"));
  const child = spawn("ssh", [
    "-o", "StrictHostKeyChecking=accept-new",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=3",
    "-R", "80:localhost:5188",
    "nokey@localhost.run"
  ], {
    cwd: root,
    detached: true,
    stdio: ["ignore", out, out]
  });
  child.unref();

  const started = Date.now();
  while (Date.now() - started < 20000) {
    const log = existsSync(tunnelLog) ? await readFile(tunnelLog, "utf8") : "";
    const match = log.match(/https:\/\/[a-z0-9]+\.lhr\.life/);
    if (match) return match[0];
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("localhost.run did not return an lhr.life URL");
}

async function verifyPublicUrl(url) {
  await run(npmBin, ["run", "verify:public", "--", url], { timeout: 45000 });
}

async function main() {
  await mkdir(stateDir, { recursive: true });

  if (!force && !isWeekdayDaylight()) {
    console.log("skip: outside weekday daylight window");
    return;
  }

  await ensureServer();
  await killOldTunnel();
  const url = await startTunnel();
  await verifyPublicUrl(url);

  const payload = {
    url,
    checkedAt: new Date().toISOString(),
    note: "Verified by npm run verify:public"
  };
  await writeFile(currentUrlFile, `${url}\n`);
  await writeFile(currentJsonFile, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`ready: ${url}`);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
