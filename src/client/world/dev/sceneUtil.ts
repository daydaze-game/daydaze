// Scene walks the dev panel needs: wireframe on every material, object and
// light counts, and the world box of a picked object. Development only.
import * as THREE from "three";
import { isMesh, isInstancedMesh } from "../guards.ts";

/** Set wireframe on every material in the scene (new meshes included). */
export function applyWireframe(scene: THREE.Scene, on: boolean): void {
  scene.traverse((o) => {
    if (!isMesh(o)) return;
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
export function countObjects(scene: THREE.Scene): number {
  let n = 0;
  scene.traverse(() => n++);
  return n;
}

/** A direct light: the kind the low tier's 4-light budget counts. */
export function isDirectLight(
  o: THREE.Object3D,
): o is
  | THREE.DirectionalLight
  | THREE.PointLight
  | THREE.SpotLight
  | THREE.RectAreaLight {
  return (
    o instanceof THREE.DirectionalLight ||
    o instanceof THREE.PointLight ||
    o instanceof THREE.SpotLight ||
    o instanceof THREE.RectAreaLight
  );
}

/**
 * Real (direct) lights in the scene; the low tier allows at most 4. Ambient
 * and hemisphere fills are cheap and don't count, but a direct light at
 * intensity 0 still costs shader work, so it does.
 */
export function countLights(scene: THREE.Scene): number {
  let n = 0;
  scene.traverse((o) => {
    if (isDirectLight(o)) n++;
  });
  return n;
}

/**
 * The world-space box of an object. An instance of an instanced mesh gets the
 * box of that one instance, not the whole batch (a city block would cover the
 * city).
 */
export function objectBox(
  o: THREE.Object3D,
  instanceId: number | null,
  out: THREE.Box3,
): THREE.Box3 {
  if (isInstancedMesh(o) && instanceId !== null) {
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const local = o.geometry.boundingBox;
    if (local) {
      const m = new THREE.Matrix4();
      o.getMatrixAt(instanceId, m);
      return out.copy(local).applyMatrix4(m.premultiply(o.matrixWorld));
    }
  }
  return out.setFromObject(o);
}

/** "Scene > Group > name" for an object, by name or type. */
export function objectPath(o: THREE.Object3D): string {
  const path: string[] = [];
  for (let p: THREE.Object3D | null = o; p; p = p.parent) {
    path.unshift(p.name || p.type);
  }
  return path.join(" > ");
}

/** Objects whose name or type contains `query`, case-insensitive. */
export function searchScene(
  root: THREE.Object3D,
  query: string,
  limit: number,
): { hits: THREE.Object3D[]; total: number } {
  const q = query.toLowerCase();
  const hits: THREE.Object3D[] = [];
  let total = 0;
  root.traverse((o) => {
    if (o === root) return;
    if (!`${o.name} ${o.type}`.toLowerCase().includes(q)) return;
    total++;
    if (hits.length < limit) hits.push(o);
  });
  return { hits, total };
}
