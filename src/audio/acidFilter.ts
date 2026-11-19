// The acid sound: LSD can make everything seem tinny and echoing
// (docs/research/substances.md section 4). A procedural filter on the master
// bus: a high-shelf lift for the tinny edge plus a short feedback echo, both
// easing in and out with the acid meter and silent at 0. The level-to-
// parameter mapping is pure (`acidParams`); the nodes are built once.

const clamp01 = (x: number) =>
  Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;

/** High-shelf gain at full level, dB, above ACID_SHELF_HZ: a light tinny edge. */
export const ACID_SHELF_DB = 6;
export const ACID_SHELF_HZ = 3500;
/** Echo loudness at full level, as a share of the dry sound. */
export const ACID_ECHO_MIX = 0.3;
/** Echo repeats at full level; under 1 so each repeat is quieter and it dies. */
export const ACID_ECHO_FEEDBACK = 0.45;
/** Gap between echo repeats, seconds: short, so it reads as a room, not a delay. */
export const ACID_ECHO_SECONDS = 0.13;
/** How long a level change takes to settle, seconds (time constant). */
const EASE = 0.4;

export type AcidParams = {
  shelfDb: number;
  echoMix: number;
  echoFeedback: number;
};

/** What the filter does at an acid meter level (0..1); all zero when sober. */
export function acidParams(level: number): AcidParams {
  const k = clamp01(level);
  return {
    shelfDb: ACID_SHELF_DB * k,
    echoMix: ACID_ECHO_MIX * k,
    echoFeedback: ACID_ECHO_FEEDBACK * k,
  };
}

export type AcidFilter = {
  input: AudioNode;
  output: AudioNode;
  /** Eases the filter toward the acid meter's level. */
  setLevel(level: number): void;
};

/** Builds the filter: input → shelf → output, with shelf → delay → output
 * (the echo) and the delay feeding itself. Throws if the context can't make
 * the nodes; the bus then goes without it. */
export function createAcidFilter(ctx: AudioContext): AcidFilter {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const shelf = ctx.createBiquadFilter();
  shelf.type = "highshelf";
  shelf.frequency.value = ACID_SHELF_HZ;
  shelf.gain.value = 0;
  const delay = ctx.createDelay(1);
  delay.delayTime.value = ACID_ECHO_SECONDS;
  const wet = ctx.createGain();
  wet.gain.value = 0;
  const feedback = ctx.createGain();
  feedback.gain.value = 0;
  input.connect(shelf);
  shelf.connect(output);
  shelf.connect(delay);
  delay.connect(wet);
  wet.connect(output);
  delay.connect(feedback);
  feedback.connect(delay);
  return {
    input,
    output,
    setLevel(level) {
      const p = acidParams(level);
      const now = ctx.currentTime;
      shelf.gain.setTargetAtTime(p.shelfDb, now, EASE);
      wet.gain.setTargetAtTime(p.echoMix, now, EASE);
      feedback.gain.setTargetAtTime(p.echoFeedback, now, EASE);
    },
  };
}
