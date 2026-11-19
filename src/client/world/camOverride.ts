// Live override of the overview camera framing (?cam=ex,ey,ez,lx,ly,lz).
// Can be set via URL flag, the __dd console handle, or the dev panel.

import * as THREE from "three";

export type CamShot = {
  eye: THREE.Vector3;
  look: THREE.Vector3;
};

function initialFromLocation(): CamShot | null {
  if (typeof location === "undefined") return null;
  const raw = new URLSearchParams(location.search).get("cam");
  return raw ? parseCamOverride(raw) : null;
}

let active: CamShot | null = initialFromLocation();
const listeners = new Set<(shot: CamShot | null) => void>();

/** Converts an eye/look vector pair or array into a CamShot. */
function toVector3(
  v: THREE.Vector3 | readonly [number, number, number] | undefined,
): THREE.Vector3 | null {
  if (!v) return null;
  if (v instanceof THREE.Vector3) {
    return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)
      ? v.clone()
      : null;
  }
  if (Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)) {
    return new THREE.Vector3(v[0], v[1], v[2]);
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/** Parses a cam override from a string, array, or object into a CamShot. */
export function parseCamOverride(input: unknown): CamShot | null {
  if (!input) return null;

  if (typeof input === "string") {
    let s = input.trim();
    if (!s) return null;
    if (s.startsWith("?cam=")) s = s.slice(5);
    else if (s.startsWith("cam=")) s = s.slice(4);
    const parts = s.split(",").map(Number);
    if (parts.length !== 6 || parts.some((n) => !Number.isFinite(n))) {
      return null;
    }
    return {
      eye: new THREE.Vector3(parts[0], parts[1], parts[2]),
      look: new THREE.Vector3(parts[3], parts[4], parts[5]),
    };
  }

  if (Array.isArray(input)) {
    if (
      input.length !== 6 ||
      input.some((n) => typeof n !== "number" || !Number.isFinite(n))
    ) {
      return null;
    }
    const nums = input as readonly number[];
    return {
      eye: new THREE.Vector3(nums[0], nums[1], nums[2]),
      look: new THREE.Vector3(nums[3], nums[4], nums[5]),
    };
  }

  if (isRecord(input) && "eye" in input && "look" in input) {
    const raw = input as {
      eye: THREE.Vector3 | readonly [number, number, number];
      look: THREE.Vector3 | readonly [number, number, number];
    };
    const eye = toVector3(raw.eye);
    const look = toVector3(raw.look);
    if (eye && look) return { eye, look };
  }

  return null;
}

/** Formats a CamShot as a comma-separated coordinate string. */
export function formatCamOverride(shot: CamShot | null): string {
  if (!shot) return "";
  const round = (n: number) => {
    const s = n.toFixed(2);
    return s.endsWith(".00") ? String(Math.round(n)) : s.replace(/0$/, "");
  };
  const e = shot.eye;
  const l = shot.look;
  return `${round(e.x)},${round(e.y)},${round(e.z)},${round(l.x)},${round(l.y)},${round(l.z)}`;
}

/** Returns the active camera override, if any. */
export function getCamOverride(): CamShot | null {
  return active;
}

/** Sets or clears the active camera override and notifies listeners. */
export function setCamOverride(input: unknown): CamShot | null {
  active = parseCamOverride(input);
  for (const listener of listeners) {
    listener(active);
  }
  return active;
}

/** Clears the active camera override. */
export function clearCamOverride(): void {
  setCamOverride(null);
}

/** Subscribes to changes to the camera override. */
export function subscribeCamOverride(
  listener: (shot: CamShot | null) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
