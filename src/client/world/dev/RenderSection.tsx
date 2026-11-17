// The dev panel's render controls: exposure, fog, the field of view and every
// light in the scene with its own switch and intensity. Edits only touch the
// running scene and are lost on a room change or reload. Development only.
import * as THREE from "three";
import { canvas, patch, useDev } from "./store.ts";
import { Section } from "./widgets.tsx";

/** The fog taken out by the switch, put back when it is switched on again. */
let stashedFog: THREE.Scene["fog"] = null;

function Slider({
  label,
  min,
  max,
  step,
  value,
  set,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  set: (v: number) => void;
}) {
  return (
    <label style={{ marginRight: 8, whiteSpace: "nowrap" }}>
      {label}{" "}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          set(Number(e.target.value));
          patch({});
        }}
        style={{ width: 90, verticalAlign: "middle" }}
      />{" "}
      {value.toFixed(2)}
    </label>
  );
}

function LightRow({ light }: { light: THREE.Light }) {
  return (
    <div style={{ whiteSpace: "nowrap" }}>
      <label style={{ marginRight: 8 }}>
        <input
          type="checkbox"
          checked={light.visible}
          onChange={(e) => {
            light.visible = e.target.checked;
            patch({});
          }}
        />{" "}
        {light.name || light.type}
      </label>
      <input
        type="color"
        aria-label={`${light.name || light.type} color`}
        value={`#${light.color.getHexString()}`}
        onChange={(e) => {
          light.color.set(e.target.value);
          patch({});
        }}
        style={{ marginRight: 8 }}
      />
      <Slider
        label="intensity"
        min={0}
        max={Math.max(10, light.intensity * 2)}
        step={0.1}
        value={light.intensity}
        set={(v) => (light.intensity = v)}
      />
    </div>
  );
}

export function RenderSection() {
  // re-reads the live values on every stats tick
  useDev();
  const { scene, gl } = canvas;
  const camera = canvas.camera();
  if (!scene || !gl) return null;
  const lights: THREE.Light[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.Light) lights.push(o);
  });
  const fogOn = scene.fog !== null;
  return (
    <Section title="render">
      <div>
        <Slider
          label="exposure"
          min={0}
          max={3}
          step={0.05}
          value={gl.toneMappingExposure}
          set={(v) => (gl.toneMappingExposure = v)}
        />
        <label style={{ marginRight: 8 }}>
          <input
            type="checkbox"
            checked={fogOn}
            disabled={!fogOn && stashedFog === null}
            onChange={(e) => {
              if (e.target.checked) {
                scene.fog = stashedFog;
                stashedFog = null;
              } else {
                stashedFog = scene.fog;
                scene.fog = null;
              }
              patch({});
            }}
          />{" "}
          fog
        </label>
      </div>
      {camera instanceof THREE.PerspectiveCamera && (
        <div>
          <Slider
            label="fov"
            min={10}
            max={120}
            step={1}
            value={camera.fov}
            set={(v) => {
              camera.fov = v;
              camera.updateProjectionMatrix();
            }}
          />
          {/* the game camera sets its own field of view each frame */}
          <span style={{ color: "#999" }}>holds with free cam on</span>
        </div>
      )}
      <div>lights</div>
      {lights.map((l) => (
        <LightRow key={l.uuid} light={l} />
      ))}
    </Section>
  );
}
