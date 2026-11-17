// The buzz and high post-processing: one custom `Effect` that sways the
// screen, tints it and breathes the colors from the live drunk and high looks,
// and a small one before it for heavy drinking's double vision (it samples
// the input beside each pixel, so the composer gives it a pass of its own).
import { useFrame } from "@react-three/fiber";
import { Effect, EffectAttribute } from "postprocessing";
import { useMemo } from "react";
import { Uniform } from "three";
import { liveDrunk } from "./drunk.ts";
import { liveHigh } from "./high.ts";

// Sway moves the screen UVs; warmth tints the color; edge darkens the corners
// (the vignette stands in for an edge blur). All three are scaled by the buzz.
const SHADER = /* glsl */ `
uniform float sway;
uniform float warm;
uniform float edge;
uniform float time;
uniform float glow;
uniform float hue;
uniform float breathe;
uniform float drift;
uniform float glare;

// rotates a color round the gray axis by angle a
vec3 hueTurn(vec3 c, float a) {
	const vec3 k = vec3(0.57735);
	float s = sin(a);
	float co = cos(a);
	return c * co + cross(k, c) * s + k * dot(k, c) * (1.0 - co);
}

void mainUv(inout vec2 uv) {
	uv.x += sin(time * 2.2) * sway;
	uv.y += cos(time * 1.6) * sway * 0.5;
	// the trip: the whole view swells and settles, slower than a breath
	uv = 0.5 + (uv - 0.5) * (1.0 - breathe * sin(time * 1.57));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
	vec3 c = inputColor.rgb * vec3(1.0 + 0.12 * warm, 1.0, 1.0 - 0.18 * warm);
	// the high: lifted saturation and a soft glow
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	c = mix(vec3(l), c, 1.0 + 0.6 * glow) + glow * 0.08;
	// the trip: colors drift round the wheel, banded by height on screen
	c = hueTurn(c, hue * (time * 0.4 * drift + uv.y * 2.0));
	float d = length((uv - 0.5) * vec2(1.0, 0.8));
	c *= 1.0 - edge * smoothstep(0.3, 0.75, d);
	// a hangover: light hurts, so the bright parts wash out
	c = mix(c, vec3(1.0), glare * 0.35 * smoothstep(0.35, 1.0, l));
	outputColor = vec4(c, inputColor.a);
}
`;

class DrunkEffect extends Effect {
  readonly params: Record<
    | "sway"
    | "warm"
    | "edge"
    | "time"
    | "glow"
    | "hue"
    | "breathe"
    | "drift"
    | "glare",
    Uniform
  >;

  constructor() {
    const uniforms = {
      sway: new Uniform(0),
      warm: new Uniform(0),
      edge: new Uniform(0),
      time: new Uniform(0),
      glow: new Uniform(0),
      hue: new Uniform(0),
      breathe: new Uniform(0),
      drift: new Uniform(1),
      glare: new Uniform(0),
    };
    super("DrunkEffect", SHADER, {
      uniforms: new Map(Object.entries(uniforms)),
    });
    this.params = uniforms;
  }
}

// Double vision: a second, fainter copy of the view, offset sideways by up
// to about 1% of the screen and drifting slowly in and out (held still under
// reduced motion, where `drift` is 0). Under 0.3 Hz, never a strobe.
const GHOST_SHADER = /* glsl */ `
uniform float ghost;
uniform float time;
uniform float drift;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
	float off = ghost * 0.012 * (0.75 + 0.25 * sin(time * 1.3 * drift));
	vec3 second = texture2D(inputBuffer, uv + vec2(off, off * 0.2)).rgb;
	outputColor = vec4(mix(inputColor.rgb, second, 0.45 * ghost), inputColor.a);
}
`;

class GhostEffect extends Effect {
  readonly params: Record<"ghost" | "time" | "drift", Uniform>;

  constructor() {
    const uniforms = {
      ghost: new Uniform(0),
      time: new Uniform(0),
      drift: new Uniform(1),
    };
    super("GhostEffect", GHOST_SHADER, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map(Object.entries(uniforms)),
    });
    this.params = uniforms;
  }
}

/** The drunk post passes, inside the composer on the high tier only. */
export function DrunkPost() {
  const effect = useMemo(() => new DrunkEffect(), []);
  const ghost = useMemo(() => new GhostEffect(), []);
  useFrame((state) => {
    ghost.params.ghost.value = liveDrunk.ghost;
    ghost.params.time.value = state.clock.elapsedTime;
    ghost.params.drift.value = liveHigh.drift;
    effect.params.glare.value = liveDrunk.glare;
    effect.params.sway.value = liveDrunk.sway;
    effect.params.warm.value = liveDrunk.warm;
    effect.params.edge.value = liveDrunk.edge;
    effect.params.time.value = state.clock.elapsedTime;
    effect.params.glow.value = liveHigh.glow;
    effect.params.hue.value = liveHigh.hue;
    effect.params.breathe.value = liveHigh.breathe;
    effect.params.drift.value = liveHigh.drift;
  });
  return (
    <>
      <primitive object={ghost} />
      <primitive object={effect} />
    </>
  );
}
