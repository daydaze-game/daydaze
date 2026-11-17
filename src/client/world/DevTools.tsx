// Dev-only render tools: a live FPS / draw-call / triangle readout, a wireframe
// switch and a free camera. Press ` (backquote) to show or hide the panel.
// Everything is gated on import.meta.env.DEV at the call sites, so production
// builds drop it. Dependency-free: gl.info already has the numbers, and a
// module store carries them from the Canvas (its own React root) to the DOM.
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";

type DevState = {
  open: boolean;
  wireframe: boolean;
  freeCam: boolean;
  fps: number;
  calls: number;
  triangles: number;
};

let state: DevState = {
  open: false,
  wireframe: false,
  freeCam: false,
  fps: 0,
  calls: 0,
  triangles: 0,
};
const listeners = new Set<() => void>();

function patch(next: Partial<DevState>): void {
  state = { ...state, ...next };
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Whether the free camera is on, so World can pause its own camera rig. */
export function useFreeCam(): boolean {
  return useSyncExternalStore(subscribe, () => state.freeCam);
}

/** Set wireframe on every material in the scene (new meshes included). */
function applyWireframe(scene: THREE.Scene, on: boolean): void {
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mats: THREE.Material[] = Array.isArray(o.material)
      ? o.material
      : [o.material];
    for (const m of mats) {
      if ("wireframe" in m && typeof m.wireframe === "boolean") {
        m.wireframe = on;
      }
    }
  });
}

/** Inside the Canvas: samples gl.info twice a second, applies the toggles. */
export function DevProbe() {
  const scene = useThree((s) => s.scene);
  const wire = useSyncExternalStore(subscribe, () => state.wireframe);
  const tick = useRef({ frames: 0, since: performance.now() });
  useFrame(({ gl }) => {
    const t = tick.current;
    t.frames++;
    const now = performance.now();
    if (now - t.since < 500) return;
    patch({
      fps: Math.round((t.frames * 1000) / (now - t.since)),
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
    });
    t.frames = 0;
    t.since = now;
    // reapplied each tick so meshes that stream in join the wireframe
    if (state.wireframe) applyWireframe(scene, true);
  });
  useEffect(() => applyWireframe(scene, wire), [scene, wire]);
  const freeCam = useFreeCam();
  return freeCam ? <OrbitControls makeDefault /> : null;
}

/** Outside the Canvas: the readout and the two switches. */
export function DevPanel() {
  const s = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Backquote") patch({ open: !state.open });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!s.open) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        zIndex: 9999,
        padding: "6px 10px",
        font: "12px monospace",
        color: "#0f0",
        background: "rgba(0,0,0,0.7)",
        borderRadius: 6,
      }}
    >
      <div>
        {s.fps} fps · {s.calls} calls · {(s.triangles / 1000).toFixed(0)}k tris
      </div>
      <label>
        <input
          type="checkbox"
          checked={s.wireframe}
          onChange={(e) => patch({ wireframe: e.target.checked })}
        />{" "}
        wireframe
      </label>{" "}
      <label>
        <input
          type="checkbox"
          checked={s.freeCam}
          onChange={(e) => patch({ freeCam: e.target.checked })}
        />{" "}
        free cam
      </label>
    </div>
  );
}
