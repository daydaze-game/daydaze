// Static architectural instances stream between districts. Aggregate bounds
// must not cull a family before the library can cull its individual buildings.
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import * as THREE from "three";
import type { DreamKind, DreamSpot } from "../../game/city/dream.ts";

export type FamilyMesh = {
  kind: DreamKind;
  far: boolean;
  mesh: InstancedMesh2;
};

export function createDreamMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
) {
  const mesh = new InstancedMesh2(geometry, material, { capacity: 64 });
  // Three caches an aggregate sphere, including an empty first view, but
  // these instances move between districts. The library still performs its
  // own per-building frustum culling before each draw.
  mesh.frustumCulled = false;
  return mesh;
}

const up = new THREE.Vector3(0, 1, 0);
const tint = new THREE.Color();

/** The plan changes infrequently; no grouping or allocation runs per frame. */
export function placeDreamMeshes(
  meshes: readonly FamilyMesh[],
  spots: readonly DreamSpot[],
) {
  const groups = new Map<string, DreamSpot[]>();
  for (const spot of spots) {
    const key = `${spot.kind}|${spot.far}`;
    const list = groups.get(key) ?? [];
    list.push(spot);
    groups.set(key, list);
  }
  for (const { kind, far, mesh } of meshes) {
    const list = groups.get(`${kind}|${far}`) ?? [];
    mesh.clearInstances();
    mesh.addInstances(list.length, (object, i) => {
      const spot = list[i];
      if (!spot) return;
      object.position.set(spot.x, spot.y, spot.z);
      object.quaternion.setFromAxisAngle(up, spot.yaw);
      object.scale.set(spot.sx, spot.sy, spot.sz);
      object.color = tint.set(spot.color);
    });
  }
}
