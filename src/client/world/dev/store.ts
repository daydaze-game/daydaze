// The dev panel's shared state: a tiny module store that carries readouts and
// switches between the Canvas (its own React root) and the DOM panel, plus the
// switches and panel layout remembered in localStorage across reloads.
// Development only; see DevTools.tsx.
import { useSyncExternalStore } from "react";
import type * as THREE from "three";

/** Readouts the probe samples twice a second. */
export type DevStats = {
  fps: number;
  camera: string;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  lights: number;
  objects: number;
};

/** Switches and layout, all remembered across reloads. */
export type DevPrefs = {
  open: boolean;
  wireframe: boolean;
  freeCam: boolean;
  helpers: boolean;
  halfRes: boolean;
  /** Section titles the user has folded shut. */
  closed: readonly string[];
  /** Panel position from the top left, px; null is the default top center. */
  at: readonly [number, number] | null;
};

/** What the inspector shows: an object, or one instance of an instanced mesh. */
export type Selection = {
  object: THREE.Object3D;
  instanceId: number | null;
};

/** State that only lasts for the page (pausing survives no reload). */
export type DevState = DevStats &
  DevPrefs & {
    paused: boolean;
    selection: Selection | null;
  };

const PREFS_KEY = "daydaze:dev-panel";

const DEFAULT_PREFS: DevPrefs = {
  open: false,
  wireframe: false,
  freeCam: false,
  helpers: false,
  halfRes: false,
  closed: [],
  at: null,
};

/** Reads saved prefs, keeping only well-formed fields. */
export function parsePrefs(raw: string | null): DevPrefs {
  const prefs: DevPrefs = { ...DEFAULT_PREFS };
  if (raw === null) return prefs;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return prefs;
  }
  if (typeof parsed !== "object" || parsed === null) return prefs;
  const flags = ["open", "wireframe", "freeCam", "helpers", "halfRes"] as const;
  for (const key of flags) {
    const v: unknown = Reflect.get(parsed, key);
    if (typeof v === "boolean") prefs[key] = v;
  }
  const closed: unknown = Reflect.get(parsed, "closed");
  if (Array.isArray(closed)) {
    prefs.closed = closed.filter((c): c is string => typeof c === "string");
  }
  const at: unknown = Reflect.get(parsed, "at");
  if (
    Array.isArray(at) &&
    at.length === 2 &&
    at.every((n) => typeof n === "number" && Number.isFinite(n))
  ) {
    prefs.at = [Number(at[0]), Number(at[1])];
  }
  return prefs;
}

function loadPrefs(): DevPrefs {
  try {
    return parsePrefs(localStorage.getItem(PREFS_KEY));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

// made on first read, not at import, so a production build (which keeps only
// useFreeCam) does no work and touches no storage when the module loads
let state: DevState | null = null;

const initialState = (): DevState => ({
  ...loadPrefs(),
  paused: false,
  selection: null,
  fps: 0,
  camera: "",
  calls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  lights: 0,
  objects: 0,
});
const listeners = new Set<() => void>();

/** The current state, read outside React (in useFrame, handlers). */
export const devState = (): DevState => (state ??= initialState());

const PREF_KEYS: ReadonlySet<string> = new Set(Object.keys(DEFAULT_PREFS));

/** Merges `next` in, saves prefs if any changed and wakes subscribers. */
export function patch(next: Partial<DevState>): void {
  state = { ...devState(), ...next };
  // the stats tick (twice a second) touches no prefs, so it never writes
  if (Object.keys(next).some((k) => PREF_KEYS.has(k))) {
    const { open, wireframe, freeCam, helpers, halfRes, closed, at } = state;
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          open,
          wireframe,
          freeCam,
          helpers,
          halfRes,
          closed,
          at,
        }),
      );
    } catch {
      // storage full or blocked: the panel still works, it just forgets
    }
  }
  for (const fn of listeners) fn();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The whole state, re-rendering on every change. */
export function useDev(): DevState {
  return useSyncExternalStore(subscribe, devState);
}

/** Whether the free camera is on, so World can pause its own camera rig. */
export function useFreeCam(): boolean {
  return useSyncExternalStore(subscribe, () => devState().freeCam);
}

/** The live scene and renderer, registered by the probe for the panel. */
export const canvas: {
  scene: THREE.Scene | null;
  gl: THREE.WebGLRenderer | null;
  camera: () => THREE.Camera | null;
} = { scene: null, gl: null, camera: () => null };

/** Panel buttons that act inside the Canvas; the probe fills them in. */
export const actions: {
  teleport: (() => void) | null;
  /** Turns the free camera on and points it at the selection. */
  focus: (() => void) | null;
} = { teleport: null, focus: null };
