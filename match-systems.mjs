export const matchPhases = Object.freeze(["waiting", "countdown", "active", "result"]);
export const matchCountdownMs = 3200;
export const matchResultHoldMs = 5200;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePhase(value) {
  return matchPhases.includes(value) ? value : "waiting";
}

export function minimumHumansForMatch(mode = "oneLife", cpuFill = true) {
  return mode === "practice" || cpuFill ? 1 : 2;
}

export function matchWarmupMs(mode = "oneLife", cpuFill = true) {
  if (mode === "practice") return 4200;
  return cpuFill ? 6500 : 14000;
}

export function createMatchLifecycle() {
  return {
    matchPhase: "waiting",
    phaseEndsAt: 0,
    matchStarted: false
  };
}

export function stepMatchLifecycle(state, context, now = Date.now()) {
  const currentTime = finite(now, Date.now());
  const phase = normalizePhase(state?.matchPhase);
  const humanCount = Math.max(0, Math.floor(finite(context?.humanCount)));
  const readyHumans = Math.max(0, Math.min(humanCount, Math.floor(finite(context?.readyHumans))));
  const minimumHumans = minimumHumansForMatch(context?.mode, context?.cpuFill !== false);
  const winnerAt = finite(context?.winner?.at, currentTime);

  if (context?.winner) {
    return {
      matchPhase: "result",
      phaseEndsAt: winnerAt + matchResultHoldMs,
      matchStarted: Boolean(state?.matchStarted),
      minimumHumans,
      transition: phase === "result" ? "none" : "result"
    };
  }

  if (phase === "active") {
    return {
      matchPhase: "active",
      phaseEndsAt: 0,
      matchStarted: true,
      minimumHumans,
      transition: "none"
    };
  }

  if (humanCount < minimumHumans) {
    return {
      matchPhase: "waiting",
      phaseEndsAt: 0,
      matchStarted: false,
      minimumHumans,
      transition: phase === "waiting" ? "none" : "waiting"
    };
  }

  if (phase === "countdown") {
    const countdownEndsAt = finite(state?.phaseEndsAt, currentTime + matchCountdownMs);
    if (currentTime >= countdownEndsAt) {
      return {
        matchPhase: "active",
        phaseEndsAt: 0,
        matchStarted: true,
        minimumHumans,
        transition: "start"
      };
    }
    return {
      matchPhase: "countdown",
      phaseEndsAt: countdownEndsAt,
      matchStarted: false,
      minimumHumans,
      transition: "none"
    };
  }

  const allReady = humanCount > 0 && readyHumans >= humanCount;
  const currentDeadline = Math.max(0, finite(state?.phaseEndsAt));
  if (allReady || (currentDeadline > 0 && currentTime >= currentDeadline)) {
    return {
      matchPhase: "countdown",
      phaseEndsAt: currentTime + matchCountdownMs,
      matchStarted: false,
      minimumHumans,
      transition: "countdown"
    };
  }

  return {
    matchPhase: "waiting",
    phaseEndsAt: currentDeadline || currentTime + matchWarmupMs(context?.mode, context?.cpuFill !== false),
    matchStarted: false,
    minimumHumans,
    transition: "none"
  };
}
