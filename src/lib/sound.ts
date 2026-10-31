export class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getCtx(): AudioContext | null {
    if (!this.enabled || typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTick(freq = 680) {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.025);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {
      // Audio is optional; ignore browsers that block it.
    }
  }

  playToggle(on = true) {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const startFreq = on ? 440 : 540;
      const endFreq = on ? 660 : 360;
      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.065);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.075);
    } catch {
      // Audio is optional; ignore browsers that block it.
    }
  }

  playScanChime() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        const start = ctx.currentTime + idx * 0.06;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.05, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.24);
      });
    } catch {
      // Audio is optional; ignore browsers that block it.
    }
  }

  playStampSuccess() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      [140, 587.33, 880, 1174.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? "triangle" : "sine";
        const start = ctx.currentTime + (idx === 0 ? 0 : 0.05);
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(idx === 0 ? 0.12 : 0.055, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.36);
      });
    } catch {
      // Audio is optional; ignore browsers that block it.
    }
  }
}

export const soundFX = new SoundEngine();
