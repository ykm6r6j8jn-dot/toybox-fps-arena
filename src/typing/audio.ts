export class TypingAudio {
  private context?: AudioContext;
  enabled = true;
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended")
        void this.context.resume().catch(() => {});
    } catch {
      /* Sound is optional; the game remains playable. */
    }
  }
  play(kind: "key" | "miss" | "word" | "fever" | "end" | "count") {
    if (!this.enabled) return;
    this.unlock();
    const context = this.context;
    if (!context || context.state !== "running") return;
    const notes = {
      key: [900],
      miss: [170],
      word: [523.25, 659.25, 783.99],
      fever: [523.25, 659.25, 783.99, 1046.5],
      end: [783.99, 659.25, 523.25],
      count: [440],
    }[kind];
    notes.forEach((frequency, index) => {
      const start = context.currentTime + index * 0.06;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "miss" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 0.8,
        start + 0.07,
      );
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(
        kind === "key" ? 0.022 : 0.07,
        start + 0.005,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        start + (kind === "key" ? 0.035 : 0.15),
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + 0.16);
    });
  }
}
