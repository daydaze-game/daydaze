// The per-frame driver for buzz and high: decays them, publishes the look the
// doll and `DrunkPost` read, and mirrors it onto canvas data attributes.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
  intensityFactor,
  visualParams,
  type Intensity,
} from "../../game/effects/buzz.ts";
import { highParams, strongest } from "../../game/effects/substances.ts";
import {
  ageHigh,
  dosesOnboard,
  getMeters,
  liveHigh,
  onHighChange,
} from "./high.ts";
import { useReducedMotion } from "../motion.ts";
import {
  ageBuzz,
  getBuzz,
  getHangover,
  liveDrunk,
  onBuzzChange,
} from "./drunk.ts";

/**
 * Fades the buzz, works out this frame's drunk look and publishes it to the
 * doll and the post pass. Always mounted, so `data-buzz` and `data-sway` read
 * on every quality tier. Writes the canvas attributes only when they change.
 */
export function DrunkState({ intensity }: { intensity: Intensity }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const calm = useReducedMotion();
  const shown = useRef({ buzz: -1, calm, intensity });

  useEffect(() => onBuzzChange(() => invalidate()), [invalidate]);
  useEffect(() => onHighChange(() => invalidate()), [invalidate]);
  const shownHigh = useRef({ high: -1, trip: -1, under: "", doses: -1 });

  useFrame((_, dt) => {
    ageBuzz(dt);
    const buzz = getBuzz();
    const look = visualParams(buzz, intensity, calm, getHangover());
    liveDrunk.sway = look.sway;
    liveDrunk.wobble = look.wobble;
    liveDrunk.warm = look.warm;
    liveDrunk.edge = look.edge;
    liveDrunk.ghost = look.ghost;
    liveDrunk.glare = look.glare;
    ageHigh(dt);
    const meters = getMeters();
    const lifted = highParams(meters, intensityFactor(intensity), calm);
    liveHigh.glow = lifted.glow;
    liveHigh.hue = lifted.hue;
    liveHigh.breathe = lifted.breathe;
    liveHigh.drift = lifted.drift;
    // read by tests: two decimals, so the canvas attributes change a few
    // times a second; `under` is the substance her body shows ("" sober)
    const h = Math.round(meters.high.level * 100) / 100;
    const t = Math.round(meters.trip.level * 100) / 100;
    const under = strongest(meters) ?? "";
    const doses = dosesOnboard();
    const was = shownHigh.current;
    if (
      h !== was.high ||
      t !== was.trip ||
      under !== was.under ||
      doses !== was.doses
    ) {
      shownHigh.current = { high: h, trip: t, under, doses };
      gl.domElement.dataset.high = h.toFixed(2);
      gl.domElement.dataset.trip = t.toFixed(2);
      gl.domElement.dataset.under = under;
      gl.domElement.dataset.doses = String(doses);
    }
    const seen = shown.current;
    if (
      buzz !== seen.buzz ||
      calm !== seen.calm ||
      intensity !== seen.intensity
    ) {
      seen.buzz = buzz;
      seen.calm = calm;
      seen.intensity = intensity;
      gl.domElement.dataset.buzz = buzz.toFixed(2);
      gl.domElement.dataset.sway = String(look.sway);
    }
  });

  return null;
}
