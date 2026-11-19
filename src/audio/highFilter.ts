// The high sound: cannabis can enhance music, bringing out a warm,
// gentle reverb bloom and a slight low-pass roll-off/resonance that makes
// tracks feel lush and enveloping in music rooms (vinyl vault, karaoke, DJ venues).
// Pure parameter mapping (`highFilterParams`); nodes built once and eased via setLevel.

const clamp01 = (x: number) =>
  Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;

/** Reverb / echo mix at full high level (0..1). Kept subtle and warm. */
export const HIGH_REVERB_MIX = 0.22;
/** Reverb echo feedback at full high level; kept low so it acts as warm bloom. */
export const HIGH_REVERB_FEEDBACK = 0.35;
/** Delay time for the music bloom, seconds: slightly longer than acid for a spacious room feel. */
export const HIGH_REVERB_SECONDS = 0.18;

/** Low-pass cutoff frequency at full high level, Hz: mild bloom / warmth. */
export const HIGH_LOWPASS_MIN_HZ = 3200;
/** Low-pass cutoff frequency when sober / level 0 (wide open). */
export const HIGH_LOWPASS_MAX_HZ = 20000;
/** Low-pass filter resonance (Q) at full high level: subtle warm resonance. */
export const HIGH_LOWPASS_Q = 1.8;

/** How long a level change takes to settle, seconds (time constant). */
const EASE = 0.5;

export type HighFilterParams = {
  reverbMix: number;
  reverbFeedback: number;
  lowpassHz: number;
  resonanceQ: number;
};

/** What the filter does at a high meter level (0..1). Sober (0) is clean/transparent. */
export function highFilterParams(level: number): HighFilterParams {
  const k = clamp01(level);
  return {
    reverbMix: HIGH_REVERB_MIX * k,
    reverbFeedback: HIGH_REVERB_FEEDBACK * k,
    lowpassHz:
      HIGH_LOWPASS_MAX_HZ - (HIGH_LOWPASS_MAX_HZ - HIGH_LOWPASS_MIN_HZ) * k,
    resonanceQ: HIGH_LOWPASS_Q * k,
  };
}

export type HighFilter = {
  input: AudioNode;
  output: AudioNode;
  /** Eases the filter toward the high meter's level. */
  setLevel(level: number): void;
};

/** Builds the music high filter:
 * input → lowpass → output
 *         ↓ (wet echo)
 *       delay → wet → output
 *       delay ↔ feedback
 * Throws if the context cannot make the nodes; callers fall back to dry. */
export function createHighFilter(ctx: AudioContext): HighFilter {
  const input = ctx.createGain();
  const output = ctx.createGain();

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = HIGH_LOWPASS_MAX_HZ;
  filter.Q.value = 0;

  const delay = ctx.createDelay(1);
  delay.delayTime.value = HIGH_REVERB_SECONDS;

  const wet = ctx.createGain();
  wet.gain.value = 0;

  const feedback = ctx.createGain();
  feedback.gain.value = 0;

  // Dry path through lowpass
  input.connect(filter);
  filter.connect(output);

  // Wet reverb / bloom loop
  filter.connect(delay);
  delay.connect(wet);
  wet.connect(output);

  delay.connect(feedback);
  feedback.connect(delay);

  return {
    input,
    output,
    setLevel(level) {
      const p = highFilterParams(level);
      const now = ctx.currentTime;
      filter.frequency.setTargetAtTime(p.lowpassHz, now, EASE);
      filter.Q.setTargetAtTime(p.resonanceQ, now, EASE);
      wet.gain.setTargetAtTime(p.reverbMix, now, EASE);
      feedback.gain.setTargetAtTime(p.reverbFeedback, now, EASE);
    },
  };
}
