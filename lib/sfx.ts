// Tiny, dependency-free game sound engine for the quiz "game mode".
// Uses the Web Audio API to synthesize short blips, so there are no audio
// files to ship and nothing to load. Sounds are off until the first user
// gesture (a browser requirement) and the learner's mute choice persists.

const MUTE_KEY = "toc-sfx-muted";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

// One short tone. type/decay shape the character of the blip.
function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.18) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.02);
}

// Call once from the Play button's click handler to "unlock" audio on iOS/Safari.
export function unlock() {
  getCtx();
}

export const sfx = {
  click() {
    if (isMuted()) return;
    tone(440, 0, 0.07, "triangle", 0.12);
  },
  // Rising major arpeggio — a happy "correct!"
  correct() {
    if (isMuted()) return;
    tone(523.25, 0, 0.1, "triangle", 0.16); // C5
    tone(659.25, 0.09, 0.1, "triangle", 0.16); // E5
    tone(783.99, 0.18, 0.16, "triangle", 0.18); // G5
  },
  // Low descending buzz — a gentle "not quite"
  wrong() {
    if (isMuted()) return;
    tone(220, 0, 0.16, "sawtooth", 0.1);
    tone(164.81, 0.12, 0.22, "sawtooth", 0.1);
  },
  // A soft tick for the final seconds of the clock
  tick() {
    if (isMuted()) return;
    tone(880, 0, 0.04, "square", 0.05);
  },
  // Streak "power-up" sparkle
  streak() {
    if (isMuted()) return;
    tone(880, 0, 0.07, "triangle", 0.12);
    tone(1174.66, 0.07, 0.1, "triangle", 0.13);
  },
  // Victory fanfare for the results screen
  win() {
    if (isMuted()) return;
    tone(523.25, 0, 0.12, "triangle", 0.16);
    tone(659.25, 0.12, 0.12, "triangle", 0.16);
    tone(783.99, 0.24, 0.12, "triangle", 0.16);
    tone(1046.5, 0.36, 0.28, "triangle", 0.2);
  },
};
