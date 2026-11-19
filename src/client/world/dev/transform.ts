// Reading and writing the inspector's selection transform: an object's own
// position, rotation and scale, or one instance's matrix in an instanced mesh.
// Rotation is in degrees for editing. Development only.
import * as THREE from "three";
import type { Selection } from "./store.ts";
import { isInstancedMesh } from "../guards.ts";

export type Vec3 = [number, number, number];

/** Position, rotation (degrees) and scale of the selection, local space. */
export type Transform = { position: Vec3; rotation: Vec3; scale: Vec3 };
export type TransformPart = keyof Transform;

const DEG = 180 / Math.PI;
const round = (n: number) => Math.round(n * 1000) / 1000;
const triple = (a: readonly number[]): Vec3 => [
  round(a[0] ?? 0),
  round(a[1] ?? 0),
  round(a[2] ?? 0),
];

/** One instance's matrix pulled apart. */
function instanceParts(mesh: THREE.InstancedMesh, id: number) {
  const m = new THREE.Matrix4();
  mesh.getMatrixAt(id, m);
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  m.decompose(position, quaternion, scale);
  return {
    position,
    rotation: new THREE.Euler().setFromQuaternion(quaternion),
    scale,
  };
}

function partsOf(sel: Selection) {
  const o = sel.object;
  if (isInstancedMesh(o) && sel.instanceId !== null) {
    return instanceParts(o, sel.instanceId);
  }
  return { position: o.position, rotation: o.rotation, scale: o.scale };
}

export function readTransform(sel: Selection): Transform {
  const p = partsOf(sel);
  return {
    position: triple(p.position.toArray()),
    rotation: triple([
      p.rotation.x * DEG,
      p.rotation.y * DEG,
      p.rotation.z * DEG,
    ]),
    scale: triple(p.scale.toArray()),
  };
}

/** Sets one axis (0 x, 1 y, 2 z) of one part; rotation `value` in degrees. */
export function writeTransform(
  sel: Selection,
  part: TransformPart,
  axis: 0 | 1 | 2,
  value: number,
): void {
  if (!Number.isFinite(value)) return;
  const o = sel.object;
  const p = partsOf(sel);
  const key = (["x", "y", "z"] as const)[axis];
  if (part === "rotation") p.rotation[key] = value / DEG;
  else p[part][key] = value;
  if (isInstancedMesh(o) && sel.instanceId !== null) {
    const q = new THREE.Quaternion().setFromEuler(p.rotation);
    o.setMatrixAt(
      sel.instanceId,
      new THREE.Matrix4().compose(p.position, q, p.scale),
    );
    o.instanceMatrix.needsUpdate = true;
    // raycasts test the batch's bounds first, so a moved instance stays pickable
    o.computeBoundingSphere();
    o.computeBoundingBox();
  }
}

/** The transform as R3F props (rotation back in radians), for pasting. */
export function transformJsx(t: Transform): string {
  const rad = t.rotation.map((d) => round(d / DEG));
  return `position={[${t.position.join(", ")}]} rotation={[${rad.join(", ")}]} scale={[${t.scale.join(", ")}]}`;
}
