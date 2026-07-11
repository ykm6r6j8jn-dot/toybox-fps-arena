import assert from "node:assert/strict";
import {
  createMatchLifecycle,
  matchCountdownMs,
  matchResultHoldMs,
  matchWarmupMs,
  minimumHumansForMatch,
  stepMatchLifecycle
} from "../match-systems.mjs";

assert.equal(minimumHumansForMatch("oneLife", true), 1);
assert.equal(minimumHumansForMatch("practice", false), 1);
assert.equal(minimumHumansForMatch("oneLife", false), 2);
assert.ok(matchWarmupMs("practice", true) < matchWarmupMs("oneLife", true));
assert.ok(matchWarmupMs("oneLife", true) < matchWarmupMs("oneLife", false));

const initial = createMatchLifecycle();
assert.deepEqual(initial, { matchPhase: "waiting", phaseEndsAt: 0, matchStarted: false });

const soloWaiting = stepMatchLifecycle(initial, {
  mode: "oneLife",
  cpuFill: false,
  humanCount: 1,
  readyHumans: 1
}, 1000);
assert.equal(soloWaiting.matchPhase, "waiting");
assert.equal(soloWaiting.phaseEndsAt, 0);
assert.equal(soloWaiting.minimumHumans, 2);

const populated = stepMatchLifecycle(initial, {
  mode: "oneLife",
  cpuFill: true,
  humanCount: 1,
  readyHumans: 0
}, 2000);
assert.equal(populated.matchPhase, "waiting");
assert.equal(populated.phaseEndsAt, 2000 + matchWarmupMs("oneLife", true));

const ready = stepMatchLifecycle(populated, {
  mode: "oneLife",
  cpuFill: true,
  humanCount: 1,
  readyHumans: 1
}, 2300);
assert.equal(ready.matchPhase, "countdown");
assert.equal(ready.phaseEndsAt, 2300 + matchCountdownMs);
assert.equal(ready.transition, "countdown");

const stillCounting = stepMatchLifecycle(ready, {
  mode: "oneLife",
  cpuFill: true,
  humanCount: 1,
  readyHumans: 1
}, ready.phaseEndsAt - 1);
assert.equal(stillCounting.matchPhase, "countdown");
assert.equal(stillCounting.transition, "none");

const active = stepMatchLifecycle(ready, {
  mode: "oneLife",
  cpuFill: true,
  humanCount: 1,
  readyHumans: 1
}, ready.phaseEndsAt);
assert.equal(active.matchPhase, "active");
assert.equal(active.matchStarted, true);
assert.equal(active.transition, "start");

const result = stepMatchLifecycle(active, {
  mode: "oneLife",
  cpuFill: true,
  humanCount: 1,
  readyHumans: 1,
  winner: { at: 9000 }
}, 9200);
assert.equal(result.matchPhase, "result");
assert.equal(result.phaseEndsAt, 9000 + matchResultHoldMs);
assert.equal(result.transition, "result");

console.log("match systems passed: player thresholds, automatic warmup, ready acceleration, countdown, active start, and result timing are deterministic");
