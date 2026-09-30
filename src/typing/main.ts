import "./styles.css";
import {
  TypingSession,
  mochiCollection,
  type Difficulty,
} from "../../typing-systems.mjs";
import { loadProgress, saveProgress, refreshDay } from "./storage";
import { TypingAudio } from "./audio";

const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const progress = loadProgress();
const audio = new TypingAudio();
audio.enabled = progress.sound;
let session = new TypingSession(progress.difficulty);
let countdownUntil = 0;
let lastCountdown = 0;
let lastTick = 0;
let handledResult = false;
let composing = false;
let storageWarned = false;
let runStartingMochi = progress.totalMochi;
let toastTimer = 0;
let rewardTimer = 0;
let bumpTimer = 0;
const capture = el<HTMLInputElement>("typingCapture");
const dialogs = [
  "pauseDialog",
  "resultDialog",
  "collectionDialog",
  "helpDialog",
].map((id) => el<HTMLDialogElement>(id));
const labels = { easy: "のんびり", normal: "ふつう", hard: "むずかしい" };
const format = (number: number) => number.toLocaleString("ja-JP");

function toast(message: string) {
  clearTimeout(toastTimer);
  el("toast").textContent = message;
  el("toast").classList.add("visible");
  toastTimer = window.setTimeout(
    () => el("toast").classList.remove("visible"),
    3200,
  );
}
function persist() {
  if (!saveProgress(progress) && !storageWarned) {
    storageWarned = true;
    toast(
      "このブラウザーでは記録を保存できません。ゲームはそのままあそべます。",
    );
  }
}
function sprite(element: HTMLElement, column: number, row: number) {
  element.style.backgroundPosition = `${column * 50}% ${row * 100}%`;
}
function renderSound() {
  el("soundButton").innerHTML =
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4V9Z"/>${progress.sound ? '<path d="M17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>' : '<path d="m17 9 5 6m0-6-5 6"/>'}</svg><span>音 ${progress.sound ? "ON" : "OFF"}</span>`;
  el("soundButton").setAttribute("aria-pressed", String(progress.sound));
  el("soundButton").setAttribute(
    "aria-label",
    progress.sound ? "効果音をOFFにする" : "効果音をONにする",
  );
}
function renderSidebar() {
  refreshDay(progress);
  el("missionCombo").textContent = String(
    Math.min(10, progress.daily.maxCombo),
  );
  el("missionWords").textContent = String(Math.min(15, progress.daily.words));
  el("missionCombo")
    .closest(".mission-row")
    ?.classList.toggle("complete", progress.daily.maxCombo >= 10);
  el("missionWords")
    .closest(".mission-row")
    ?.classList.toggle("complete", progress.daily.words >= 15);
  el("bestScore").textContent = format(progress.best[session.difficulty]);
  el("bestHint").textContent = progress.best[session.difficulty]
    ? `${labels[session.difficulty]}のベスト記録`
    : "最初の記録をつくろう";
  const next = mochiCollection.find(
    (mochi) => mochi.threshold > progress.totalMochi,
  );
  if (next) {
    sprite(el("nextMochi"), next.column, next.row);
    el("unlockLabel").textContent = "次のもちまで";
    el("unlockCounter").innerHTML =
      `あと <strong>${next.threshold - progress.totalMochi}</strong> こ`;
    el("unlockButton").setAttribute(
      "aria-label",
      `${next.name}まであと${next.threshold - progress.totalMochi}こ。もち図鑑を開く`,
    );
  } else {
    sprite(el("nextMochi"), 2, 1);
    el("unlockLabel").textContent = "もち図鑑コンプリート";
    el("unlockCounter").innerHTML = "<strong>6 / 6</strong> なかま";
  }
}
function renderTimer() {
  el("time").textContent = session.remaining.toFixed(1);
  el("timeFill").style.width =
    `${(session.remaining / session.duration) * 100}%`;
  el("timeTrack").setAttribute(
    "aria-valuenow",
    String(Math.round(session.remaining)),
  );
  el("time").classList.toggle(
    "urgent",
    session.remaining < 10 && session.status === "playing",
  );
  const fever = session.feverRemaining > 0;
  el("arena").classList.toggle("fever", fever);
  el("feverBadge").hidden = !fever;
  const ratio = fever ? session.feverRemaining / 8 : (session.combo % 10) / 10;
  el("feverFill").style.width = `${ratio * 100}%`;
  el("feverTrack").setAttribute("aria-valuemax", fever ? "8" : "10");
  el("feverTrack").setAttribute(
    "aria-valuenow",
    String(fever ? Math.ceil(session.feverRemaining) : session.combo % 10),
  );
  el("feverTrack").setAttribute(
    "aria-label",
    fever ? "フィーバーの残り秒数" : "次のフィーバーまでのコンボ",
  );
  el("feverLabel").textContent = fever
    ? `あと ${session.feverRemaining.toFixed(1)} 秒 ×2`
    : session.combo % 10
      ? `あと ${10 - (session.combo % 10)}コンボ`
      : "10コンボで発動";
}
function render() {
  renderTimer();
  el("score").textContent = format(session.score);
  el("combo").textContent = String(session.combo);
  el("phrase").textContent = session.phrase;
  el("reading").textContent = session.phrase;
  el("typed").textContent = session.matcher.typed;
  el("remaining").textContent = session.matcher.remaining;
  el("romaji").setAttribute(
    "aria-label",
    `入力済み ${session.matcher.typed || "なし"}、つづき ${session.matcher.remaining}`,
  );
  const active = session.status !== "ready" || countdownUntil > 0;
  el("startButton").hidden = active;
  el("playingStatus").hidden = !active;
  el("arena").classList.toggle("playing", active);
  capture.tabIndex = session.status === "playing" ? 0 : -1;
  document
    .querySelectorAll<HTMLButtonElement>("[data-difficulty]")
    .forEach((button) => {
      const selected = button.dataset.difficulty === session.difficulty;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = active;
    });
  renderSidebar();
}
function ready() {
  countdownUntil = 0;
  handledResult = false;
  session = new TypingSession(progress.difficulty);
  runStartingMochi = progress.totalMochi;
  el("countdownOverlay").hidden = true;
  el("inputHint").textContent = "ローマ字入力であそぼう · IMEはOFFに";
  el("playHint").textContent = "お題をローマ字で入力しよう";
  capture.value = "";
  render();
}
function begin() {
  if (
    session.status !== "ready" ||
    countdownUntil ||
    dialogs.some((dialog) => dialog.open)
  )
    return;
  audio.unlock();
  refreshDay(progress);
  runStartingMochi = progress.totalMochi;
  countdownUntil = performance.now() + 2400;
  lastCountdown = 0;
  el("countdownOverlay").hidden = false;
  capture.focus({ preventScroll: true });
  render();
}
function pause(showDialog = true) {
  session.pause(performance.now());
  if (session.remaining === 0) {
    finish();
    return;
  }
  if (session.status !== "paused") return;
  el("playHint").textContent = "ひとやすみ中。時間は止まっています";
  if (showDialog && !el<HTMLDialogElement>("pauseDialog").open)
    el<HTMLDialogElement>("pauseDialog").showModal();
  render();
}
function resume() {
  el<HTMLDialogElement>("pauseDialog").close();
  session.resume(performance.now());
  el("playHint").textContent = "お題をローマ字で入力しよう";
  capture.focus({ preventScroll: true });
  render();
}
function showUtility(id: "collectionDialog" | "helpDialog") {
  if (countdownUntil) ready();
  if (session.status === "playing") pause(false);
  if (id === "collectionDialog") renderCollection();
  el<HTMLDialogElement>(id).showModal();
}
function renderCollection() {
  const unlocked = mochiCollection.filter(
    (mochi) => mochi.threshold <= progress.totalMochi,
  ).length;
  el("collectionSummary").textContent =
    `なかま ${unlocked} / 6　·　これまでに作ったもち ${format(progress.totalMochi)}こ`;
  el("collectionGrid").innerHTML = mochiCollection
    .map((mochi) => {
      const available = progress.totalMochi >= mochi.threshold;
      return `<article class="collection-item ${available ? "unlocked" : "locked"}"><div class="collection-mochi mochi-sprite" style="background-position:${mochi.column * 50}% ${mochi.row * 100}%" role="img" aria-label="${available ? mochi.name : "まだ出会っていないもち"}"></div><h3>${available ? mochi.name : "？？？"}</h3><p>${available ? mochi.description : `あと ${mochi.threshold - progress.totalMochi}こで出会える`}</p><span>${available ? "なかまになった！" : `累計 ${mochi.threshold}こ`}</span></article>`;
    })
    .join("");
}
function finish() {
  if (handledResult) return;
  handledResult = true;
  const previousBest = progress.best[session.difficulty];
  const newBest = session.score > previousBest;
  progress.best[session.difficulty] = Math.max(previousBest, session.score);
  progress.plays++;
  persist();
  audio.play("end");
  el("resultRank").textContent =
    session.completed >= 30
      ? "伝説のもちもち職人"
      : session.completed >= 15
        ? "一人前のもちもち職人"
        : session.completed >= 5
          ? "もちもち職人のたまご"
          : "もちもちの第一歩";
  el("resultScore").textContent = format(session.score);
  el("resultBest").textContent = newBest
    ? "自己ベスト更新！"
    : `${labels[session.difficulty]}のベスト ${format(previousBest)} · 次は、きっともっと。`;
  el("resultWords").textContent = `${session.completed}こ`;
  el("resultCombo").textContent = String(session.maxCombo);
  el("resultAccuracy").textContent = `${session.accuracy.toFixed(1)}%`;
  el("resultWpm").textContent = session.wpm.toFixed(1);
  const newMochi = mochiCollection.filter(
    (mochi) =>
      mochi.threshold > runStartingMochi &&
      mochi.threshold <= progress.totalMochi,
  );
  el("resultReward").textContent = newMochi.length
    ? `${newMochi.map((mochi) => mochi.name).join("・")}が、なかまになった！`
    : `これまでに作ったもち ${format(progress.totalMochi)}こ。ひとつずつ、ふやしていこう。`;
  dialogs.forEach((dialog) => {
    if (dialog.open) dialog.close();
  });
  el<HTMLDialogElement>("resultDialog").showModal();
  render();
}
function feed(key: string) {
  if (
    session.status !== "playing" ||
    countdownUntil ||
    composing ||
    !/^[a-zA-Z'\-]$/.test(key)
  )
    return;
  const outcome = session.feed(key, performance.now());
  if (session.remaining === 0) {
    finish();
    return;
  }
  if (outcome.kind === "miss") {
    audio.play("miss");
    el("typingPrompt").classList.remove("mistake");
    void el("typingPrompt").offsetWidth;
    el("typingPrompt").classList.add("mistake");
    el("inputHint").textContent = "だいじょうぶ。その文字から、もう一度。";
  } else if (outcome.kind !== "ignored") {
    el("inputHint").textContent = "ローマ字入力であそぼう · IMEはOFFに";
    if (outcome.kind === "word") {
      refreshDay(progress);
      progress.totalMochi++;
      progress.daily.words++;
      progress.daily.maxCombo = Math.max(
        progress.daily.maxCombo,
        session.combo,
      );
      persist();
      audio.play(outcome.feverStarted ? "fever" : "word");
      clearTimeout(bumpTimer);
      el("mascot").classList.remove("bounce");
      void el("mascot").offsetWidth;
      el("mascot").classList.add("bounce");
      bumpTimer = window.setTimeout(
        () => el("mascot").classList.remove("bounce"),
        500,
      );
      clearTimeout(rewardTimer);
      el("rewardPop").textContent = `+${outcome.points}`;
      el("rewardPop").classList.remove("pop");
      void el("rewardPop").offsetWidth;
      el("rewardPop").classList.add("pop");
      rewardTimer = window.setTimeout(
        () => el("rewardPop").classList.remove("pop"),
        800,
      );
      const unlocked = mochiCollection.find(
        (mochi) =>
          mochi.threshold > 0 && mochi.threshold === progress.totalMochi,
      );
      if (unlocked)
        toast(`${unlocked.name}が、なかまになった！ もち図鑑で会ってみよう。`);
      else if (outcome.feverStarted)
        toast("もちもちフィーバー！ 8秒間、スコアが2倍！");
    } else audio.play("key");
  }
  render();
}
function tick(now: number) {
  if (countdownUntil) {
    const left = countdownUntil - now;
    if (left <= 0) {
      countdownUntil = 0;
      el("countdownOverlay").hidden = true;
      session.start(now);
      render();
    } else {
      const number = Math.ceil(left / 800);
      if (number !== lastCountdown) {
        lastCountdown = number;
        el("countdownNumber").textContent = String(number);
        audio.play("count");
      }
    }
  } else if (session.status === "playing" && now - lastTick > 50) {
    lastTick = now;
    const status = session.update(now);
    renderTimer();
    if (status === "results") finish();
  }
  requestAnimationFrame(tick);
}

el("startButton").addEventListener("click", begin);
el("pauseButton").addEventListener("click", () => pause());
el("resumeButton").addEventListener("click", resume);
el("restartButton").addEventListener("click", () => {
  el<HTMLDialogElement>("pauseDialog").close();
  ready();
  begin();
});
el("quitButton").addEventListener("click", () => {
  el<HTMLDialogElement>("pauseDialog").close();
  ready();
});
el("retryButton").addEventListener("click", () => {
  el<HTMLDialogElement>("resultDialog").close();
  ready();
  begin();
});
el("resultHomeButton").addEventListener("click", () => {
  el<HTMLDialogElement>("resultDialog").close();
  ready();
});
el<HTMLDialogElement>("pauseDialog").addEventListener("cancel", (event) => {
  event.preventDefault();
  resume();
});
el<HTMLDialogElement>("resultDialog").addEventListener("cancel", (event) => {
  event.preventDefault();
  el<HTMLDialogElement>("resultDialog").close();
  ready();
});
el("navCollection").addEventListener("click", () =>
  showUtility("collectionDialog"),
);
el("unlockButton").addEventListener("click", () =>
  showUtility("collectionDialog"),
);
el("navHelp").addEventListener("click", () => showUtility("helpDialog"));
el("navPlay").addEventListener("click", () => {
  if (session.status === "ready") el("startButton").focus();
  else if (session.status === "playing") capture.focus({ preventScroll: true });
});
el("soundButton").addEventListener("click", () => {
  progress.sound = !progress.sound;
  audio.enabled = progress.sound;
  audio.unlock();
  persist();
  renderSound();
});
document
  .querySelectorAll<HTMLButtonElement>("[data-close]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      el<HTMLDialogElement>(button.dataset.close!).close(),
    ),
  );
["collectionDialog", "helpDialog"].forEach((id) =>
  el<HTMLDialogElement>(id).addEventListener("close", () => {
    if (session.status === "paused") resume();
  }),
);
document
  .querySelectorAll<HTMLButtonElement>("[data-difficulty]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      if (session.status !== "ready" || countdownUntil) return;
      progress.difficulty = button.dataset.difficulty as Difficulty;
      persist();
      ready();
    }),
  );
el("typingPrompt").addEventListener("click", () => {
  if (session.status === "playing") capture.focus({ preventScroll: true });
});
document.addEventListener("keydown", (event) => {
  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.isComposing ||
    composing
  )
    return;
  if (dialogs.some((dialog) => dialog.open)) return;
  if (
    event.code === "Space" &&
    session.status === "ready" &&
    (!(event.target instanceof HTMLButtonElement) ||
      event.target.id === "startButton" ||
      event.target.hasAttribute("data-difficulty"))
  ) {
    event.preventDefault();
    begin();
  } else if (event.key === "Escape" && session.status === "playing") {
    event.preventDefault();
    pause();
  } else if (session.status === "playing" && /^[a-zA-Z'\-]$/.test(event.key)) {
    event.preventDefault();
    feed(event.key);
  }
});
capture.addEventListener("input", () => {
  if (composing) return;
  const value = capture.value;
  capture.value = "";
  if (/[^a-zA-Z'\-]/.test(value)) {
    toast("半角英数のローマ字で入力してね。IMEはOFFに。");
    return;
  }
  for (const key of value) feed(key);
});
capture.addEventListener("compositionstart", () => {
  composing = true;
});
capture.addEventListener("compositionend", () => {
  composing = false;
  capture.value = "";
  toast("IMEはOFFにして、半角英数のローマ字であそぼう。");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (countdownUntil) ready();
    else if (session.status === "playing") pause();
  } else {
    refreshDay(progress);
    renderSidebar();
  }
});
renderSound();
ready();
requestAnimationFrame(tick);
