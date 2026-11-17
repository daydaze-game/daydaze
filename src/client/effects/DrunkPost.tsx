// The buzz and high post-processing: one custom `Effect` that sways the
// screen, tints it and breathes the colors from the live drunk and high looks,
// a small one before it for heavy drinking's double vision (it samples the
// input beside each pixel, so the composer gives it a pass of its own), and
// acid's tracers (it keeps its own history frame). Molly reuses the glow,
// radiance and tracer paths and adds an eye wiggle.
import { useFrame } from "@react-three/fiber";
import { Effect, EffectAttribute } from "postprocessing";
import { useEffect, useMemo } from "react";
import {
  HalfFloatType,
  ShaderMaterial,
  Uniform,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from "three";
import { FullScreenQuad } from "three-stdlib";
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
uniform float radiance;
uniform float geometry;
uniform float wiggle;

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
	// molly: the eyes wiggle, a hair of sideways jitter at about 1 Hz (held
	// still under reduced motion, where drift is 0)
	uv.x += sin(time * 6.0 * drift) * wiggle * 0.0015;
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
	// acid: radiant color and sharper contrast...
	c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.0 + 0.8 * radiance);
	c = (c - 0.5) * (1.0 + 0.12 * radiance) + 0.5;
	// ...and faint six-fold bands of hue round the edge, the center left clean
	// (held still under reduced motion, where drift is 0)
	vec2 fromMid = uv - 0.5;
	float bands = sin(atan(fromMid.y, fromMid.x) * 6.0 + time * 0.35 * drift) * 0.5 + 0.5;
	c = hueTurn(c, geometry * 0.6 * bands * smoothstep(0.05, 0.45, length(fromMid)));
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
    | "glare"
    | "radiance"
    | "geometry"
    | "wiggle",
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
      radiance: new Uniform(0),
      geometry: new Uniform(0),
      wiggle: new Uniform(0),
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

// Tracers: each frame's history is the brighter of the new frame and the last
// history faded by TRACER_DAMP, so bright things leave trails that die in
// about half a second. Two targets swap places each frame.
const TRACER_DAMP = 0.86;
const TRACER_SHADER = /* glsl */ `
uniform sampler2D history;
uniform float tracer;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
	outputColor = vec4(max(inputColor.rgb, texture2D(history, uv).rgb * 0.9 * tracer), inputColor.a);
}
`;
const BLEND_MATERIAL = () =>
  new ShaderMaterial({
    uniforms: {
      current: new Uniform<Texture | null>(null),
      old: new Uniform<Texture | null>(null),
      damp: new Uniform(0),
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D current;
      uniform sampler2D old;
      uniform float damp;
      varying vec2 vUv;
      void main() {
        gl_FragColor = max(texture2D(current, vUv), texture2D(old, vUv) * damp);
      }`,
    depthTest: false,
    depthWrite: false,
  });

class TracerEffect extends Effect {
  readonly params: Record<"tracer" | "history", Uniform>;
  private targets: [WebGLRenderTarget, WebGLRenderTarget] = [
    new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false }),
    new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false }),
  ];
  private readonly material = BLEND_MATERIAL();
  private readonly quad = new FullScreenQuad(this.material);
  /** True until a history frame has been written since tracers last
   * switched on, so no ghost of an old frame shows. */
  private stale = true;

  constructor() {
    const uniforms = { tracer: new Uniform(0), history: new Uniform(null) };
    super("TracerEffect", TRACER_SHADER, {
      uniforms: new Map(Object.entries(uniforms)),
    });
    this.params = uniforms;
  }

  override setSize(width: number, height: number): void {
    for (const t of this.targets) t.setSize(width, height);
    this.stale = true;
  }

  override update(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget,
  ): void {
    if (this.params.tracer.value <= 0.001) {
      this.stale = true;
      return;
    }
    const [read, write] = this.targets;
    const u = this.material.uniforms;
    if (u.current && u.old && u.damp) {
      u.current.value = inputBuffer.texture;
      u.old.value = read.texture;
      // a fresh start has no history: damp 0 copies the frame straight in
      u.damp.value = this.stale ? 0 : TRACER_DAMP;
    }
    const was = renderer.getRenderTarget();
    renderer.setRenderTarget(write);
    this.quad.render(renderer);
    renderer.setRenderTarget(was);
    this.stale = false;
    this.targets = [write, read];
    this.params.history.value = write.texture;
  }

  override dispose(): void {
    for (const t of this.targets) t.dispose();
    this.quad.dispose();
    this.material.dispose();
    super.dispose();
  }
}

/** The drunk post passes, inside the composer on the high tier only. */
export function DrunkPost() {
  const effect = useMemo(() => new DrunkEffect(), []);
  const ghost = useMemo(() => new GhostEffect(), []);
  const tracer = useMemo(() => new TracerEffect(), []);
  useEffect(() => () => tracer.dispose(), [tracer]);
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
    effect.params.radiance.value = liveHigh.radiance;
    effect.params.geometry.value = liveHigh.geometry;
    effect.params.wiggle.value = liveHigh.wiggle;
    tracer.params.tracer.value = liveHigh.tracer;
  });
  return (
    <>
      <primitive object={tracer} />
      <primitive object={ghost} />
      <primitive object={effect} />
    </>
  );
}
