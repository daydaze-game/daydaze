// Dev-only render tools: a live FPS / draw-call / triangle readout, a wireframe
// switch, a free camera and a teleport. Press ` (backquote) to show or hide
// the panel.
// Everything is gated on import.meta.env.DEV at the call sites, so production
// builds drop it. Dependency-free: gl.info already has the numbers, and a
// module store carries them from the Canvas (its own React root) to the DOM.
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { cityHour, setDevHour } from "../city/daylight.ts";
import {
  DEV_EVENTS,
  devStartEvent,
  devStartNight,
} from "../city/eventClocks.ts";
import { devStartDanceOff } from "../rooms/pulse/danceOffClock.ts";
import { clampToArea, type WalkArea } from "../../game/area.ts";
import { CLUB_NIGHTS } from "../../game/events.ts";
import { MINIGAME_IDS, type MinigameId } from "../../game/hotspots.ts";
import { ROOMS, isRoomId, type RoomId } from "../../game/rooms.ts";
import { placePlayer, type Player } from "./PlayerController.tsx";

type DevState = {
  open: boolean;
  wireframe: boolean;
  freeCam: boolean;
  helpers: boolean;
  halfRes: boolean;
  paused: boolean;
  geometries: number;
  textures: number;
  lights: number;
  objects: number;
  fps: number;
  camera: string;
  calls: number;
  triangles: number;
};

let state: DevState = {
  open: false,
  wireframe: false,
  freeCam: false,
  helpers: false,
  halfRes: false,
  paused: false,
  geometries: 0,
  textures: 0,
  lights: 0,
  objects: 0,
  fps: 0,
  camera: "",
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

/** Panel buttons that act inside the Canvas; the probe fills them in. */
const actions: { teleport: (() => void) | null } = { teleport: null };

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

/** Every object in the scene graph, for a feel of how big a room is. */
function countObjects(scene: THREE.Scene): number {
  let n = 0;
  scene.traverse(() => n++);
  return n;
}

/**
 * Real (direct) lights in the scene; the low tier allows at most 4. Ambient
 * and hemisphere fills are cheap and don't count, but a direct light at
 * intensity 0 still costs shader work, so it does.
 */
function countLights(scene: THREE.Scene): number {
  let n = 0;
  scene.traverse((o) => {
    if (
      o instanceof THREE.DirectionalLight ||
      o instanceof THREE.PointLight ||
      o instanceof THREE.SpotLight ||
      o instanceof THREE.RectAreaLight
    ) {
      n++;
    }
  });
  return n;
}

/**
 * The world-space box of what a ray hit. An instanced hit gets the box of
 * that one instance, not the whole batch (a city block would cover the city).
 */
function pickBox(hit: THREE.Intersection, out: THREE.Box3): void {
  const o = hit.object;
  if (o instanceof THREE.InstancedMesh && hit.instanceId !== undefined) {
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const local = o.geometry.boundingBox;
    if (local) {
      const m = new THREE.Matrix4();
      o.getMatrixAt(hit.instanceId, m);
      out.copy(local).applyMatrix4(m.premultiply(o.matrixWorld));
      return;
    }
  }
  out.setFromObject(o);
}

/** Inside the Canvas: samples gl.info twice a second, applies the toggles. */
export function DevProbe({ player, area }: { player: Player; area: WalkArea }) {
  const scene = useThree((s) => s.scene);
  const wire = useSyncExternalStore(subscribe, () => state.wireframe);
  const tick = useRef({ frames: 0, since: performance.now() });
  useFrame(({ gl, camera }) => {
    const t = tick.current;
    t.frames++;
    const now = performance.now();
    if (now - t.since < 500) return;
    patch({
      fps: Math.round((t.frames * 1000) / (now - t.since)),
      camera: camera.position
        .toArray()
        .map((n) => n.toFixed(1))
        .join(", "),
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      lights: countLights(scene),
      objects: countObjects(scene),
    });
    t.frames = 0;
    t.since = now;
    // reapplied each tick so meshes that stream in join the wireframe
    if (state.wireframe) applyWireframe(scene, true);
  });
  useEffect(() => applyWireframe(scene, wire), [scene, wire]);
  const { helpers, halfRes, paused } = useSyncExternalStore(
    subscribe,
    () => state,
  );
  const setDpr = useThree((s) => s.setDpr);
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    if (!helpers) return;
    const grid = new THREE.GridHelper(100, 100);
    const axes = new THREE.AxesHelper(5);
    // drawn over everything: the ground sits at y 0 and would hide them
    for (const helper of [grid, axes]) {
      for (const m of [helper.material].flat()) m.depthTest = false;
      helper.renderOrder = 999;
    }
    scene.add(grid, axes);
    return () => {
      scene.remove(grid, axes);
      grid.dispose();
      axes.dispose();
    };
  }, [scene, helpers]);
  useEffect(() => {
    if (!halfRes) return;
    const before = window.devicePixelRatio;
    setDpr(0.5);
    return () => setDpr(Math.min(before, 1.5));
  }, [halfRes, setDpr]);
  // "never" also stops this probe's frames, so only the panel can resume
  useEffect(() => {
    setFrameloop(paused ? "never" : "always");
  }, [paused, setFrameloop]);
  // console handles, and the hook the Three.js Developer Tools extension
  // listens for, so it can see this R3F scene and renderer
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  useEffect(() => {
    const dd = {
      THREE,
      scene,
      gl,
      get,
      player,
      pick: null as THREE.Object3D | null,
    };
    Object.assign(window, { __dd: dd });
    // the extension's hook is an EventTarget on window; it takes the object
    const hook = Reflect.get(window, "__THREE_DEVTOOLS__");
    if (hook instanceof EventTarget) {
      hook.dispatchEvent(new CustomEvent("observe", { detail: scene }));
      hook.dispatchEvent(new CustomEvent("observe", { detail: gl }));
    }
    // shift+click logs what is under the cursor, keeps it as __dd.pick and
    // outlines it; shift+click on empty sky clears the outline
    const el = gl.domElement;
    const box = new THREE.Box3Helper(new THREE.Box3(), 0xffff00);
    for (const m of [box.material].flat()) m.depthTest = false;
    box.renderOrder = 999;
    const onDown = (e: PointerEvent) => {
      if (!e.shiftKey) return;
      const { camera, raycaster } = get();
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster
        .intersectObjects(scene.children, true)
        .find((h) => h.object !== box);
      if (!hit) {
        box.removeFromParent();
        return;
      }
      dd.pick = hit.object;
      pickBox(hit, box.box);
      scene.add(box);
      const path: string[] = [];
      for (let o: THREE.Object3D | null = hit.object; o; o = o.parent) {
        path.unshift(o.name || o.type);
      }
      const size = box.box.getSize(new THREE.Vector3());
      console.log(
        "[dev pick]",
        path.join(" > "),
        hit.instanceId === undefined ? "" : `instance ${hit.instanceId}`,
        { point: hit.point.toArray(), size: size.toArray() },
        hit.object,
      );
    };
    el.addEventListener("pointerdown", onDown);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      box.removeFromParent();
      box.dispose();
    };
  }, [scene, gl, get, player]);
  // teleport: put the doll where the middle of the view meets the floor
  // (y 0), clamped to the room's walkable area; not while seated or riding
  useEffect(() => {
    actions.teleport = () => {
      if (player.seat || player.ride) return;
      const { camera, raycaster } = get();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const p = raycaster.ray.intersectPlane(floor, new THREE.Vector3());
      if (!p) return;
      placePlayer(player, ...clampToArea(area, [p.x, p.z]));
    };
    return () => {
      actions.teleport = null;
    };
  }, [player, area, get]);
  const freeCam = useFreeCam();
  return freeCam ? <OrbitControls makeDefault /> : null;
}

/** 21.5 as "21:30". */
function formatHour(h: number): string {
  const m = Math.round(h * 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** A dropdown that fires on choosing, then resets to its label. */
function Pick({
  label,
  options,
  onPick,
}: {
  label: string;
  options: readonly string[];
  onPick: (value: string) => void;
}) {
  return (
    <select
      value=""
      onChange={(e) => onPick(e.target.value)}
      style={{ marginRight: 8, maxWidth: 110 }}
    >
      <option value="">{label}…</option>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

const TOGGLES = [
  ["wireframe", "wireframe"],
  ["freeCam", "free cam"],
  ["helpers", "grid + axes"],
  ["halfRes", "half res"],
  ["paused", "pause"],
] as const;

/** Outside the Canvas: the readout and the switches. */
export function DevPanel({
  onGo,
  onGame,
}: {
  onGo: (room: RoomId) => void;
  onGame: (game: MinigameId) => void;
}) {
  const s = useSyncExternalStore(subscribe, () => state);
  // the dev hour pin; null follows ?time= or the real clock
  const [hour, setHour] = useState<number | null>(null);
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
        // top center: the game's HUD owns the corners
        top: 8,
        left: "50%",
        transform: "translateX(-50%)",
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
      <div>cam {s.camera}</div>
      <div>
        {s.geometries} geo · {s.textures} tex · {s.lights} lights · {s.objects}{" "}
        objects
      </div>
      <div style={{ marginTop: 4 }}>
        <Pick
          label="room"
          options={Object.keys(ROOMS)}
          onPick={(v) => isRoomId(v) && onGo(v)}
        />
        <Pick
          label="game"
          options={MINIGAME_IDS}
          onPick={(v) => {
            const g = MINIGAME_IDS.find((id) => id === v);
            if (g) onGame(g);
          }}
        />
        <Pick
          label="event night"
          options={CLUB_NIGHTS.map((n) => n.id)}
          onPick={devStartNight}
        />
        <Pick
          label="start event"
          options={[...DEV_EVENTS, "dance-off"]}
          onPick={(v) => {
            if (v === "dance-off") devStartDanceOff();
            const e = DEV_EVENTS.find((id) => id === v);
            if (e) devStartEvent(e);
          }}
        />
      </div>
      <div>
        <label>
          hour{" "}
          <input
            type="range"
            min={0}
            max={23.75}
            step={0.25}
            value={hour ?? cityHour()}
            onChange={(e) => {
              const h = Number(e.target.value);
              setHour(h);
              setDevHour(h);
            }}
            style={{ width: 200, verticalAlign: "middle" }}
          />{" "}
          {formatHour(hour ?? cityHour())}
        </label>{" "}
        {hour !== null && (
          <button
            type="button"
            onClick={() => {
              setHour(null);
              setDevHour(null);
            }}
          >
            real clock
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => actions.teleport?.()}
        style={{ marginRight: 8 }}
      >
        teleport here
      </button>
      {TOGGLES.map(([key, label]) => (
        <label key={key} style={{ marginRight: 8 }}>
          <input
            type="checkbox"
            checked={s[key]}
            onChange={(e) => patch({ [key]: e.target.checked })}
          />{" "}
          {label}
        </label>
      ))}
    </div>
  );
}
