// The per-frame driver for buzz and high: decays them, publishes the look the
// doll and `DrunkPost` read, and mirrors it onto canvas data attributes.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
  intensityFactor,
  visualParams,
  type Intensity,
} from "../../game/effects/buzz.ts";
import {
  highParams,
  strongest,
  SUBSTANCES,
  type Substance,
} from "../../game/effects/substances.ts";
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
  // what the canvas attributes last showed: each meter at two decimals
  const shownHigh = useRef({
    levels: {
      high: -1,
      trip: -1,
      acid: -1,
      molly: -1,
      cocaine: -1,
    } satisfies Record<Substance, number>,
    under: "",
    doses: -1,
  });

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
    liveHigh.radiance = lifted.radiance;
    liveHigh.geometry = lifted.geometry;
    liveHigh.tracer = lifted.tracer;
    liveHigh.wiggle = lifted.wiggle;
    // read by tests: two decimals, so the canvas attributes change a few
    // times a second; `under` is the substance her body shows ("" sober)
    const was = shownHigh.current;
    const under = strongest(meters) ?? "";
    const doses = dosesOnboard();
    let dirty = under !== was.under || doses !== was.doses;
    for (const sub of SUBSTANCES) {
      const level = Math.round(meters[sub].level * 100) / 100;
      if (level !== was.levels[sub]) {
        was.levels[sub] = level;
        dirty = true;
      }
    }
    if (dirty) {
      was.under = under;
      was.doses = doses;
      for (const sub of SUBSTANCES)
        gl.domElement.dataset[sub] = was.levels[sub].toFixed(2);
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
