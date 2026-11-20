// The streak milestone chime, kept apart from worldSounds.ts so it ships with
// the lazy streak panel rather than the first download.

import { burst, sfx } from "./worldSounds.ts";

/** A streak milestone: a bell-bright rising run with a shimmer and a low
 * swell under it, longer for a bigger milestone (`level` 0..1). */
export function playStreakMilestone(level: number): boolean {
  const out = sfx();
  if (!out) return false;
  const { ctx, dest } = out;
  const now = ctx.currentTime;
  // a pentatonic climb: C D E G A C' E'
  const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1318.5];
  const count = 4 + Math.round(Math.max(0, Math.min(1, level)) * 3);
  for (let i = 0; i < count; i++) {
    const at = now + i * 0.075;
    const last = i === count - 1;
    const hold = last ? 0.9 : 0.22;
    for (const [type, mult, vol] of [
      ["sine", 1, 0.07],
      ["triangle", 2, 0.03],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(notes[i] * mult, at);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.setValueAtTime(vol, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + hold);
      osc.connect(gain).connect(dest);
      osc.start(at);
      osc.stop(at + hold + 0.02);
    }
  }
  // the swell under it
  const low = ctx.createOscillator();
  const lowGain = ctx.createGain();
  low.type = "sine";
  low.frequency.setValueAtTime(130.81, now);
  lowGain.gain.setValueAtTime(0.0001, now);
  lowGain.gain.linearRampToValueAtTime(0.08, now + 0.25);
  lowGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
  low.connect(lowGain).connect(dest);
  low.start(now);
  low.stop(now + 1.15);
  burst(ctx, dest, "highpass", 7000, 0.04, 0.7);
  return true;
}
