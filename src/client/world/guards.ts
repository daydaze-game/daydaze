// Type guards for three.js scene-graph nodes. `x instanceof THREE.Mesh`
// narrows to `Mesh<any, any>` (instanceof cannot infer a generic class's
// arguments), which makes every `.geometry` and `.material` read unsafe; these
// narrow to the real default types instead.
import * as THREE from "three";

/** A Mesh whose geometry and material have their real types. */
export function isMesh(o: THREE.Object3D | null | undefined): o is THREE.Mesh {
  return o instanceof THREE.Mesh;
}

/** A SkinnedMesh with its real geometry and material types. */
export function isSkinnedMesh(
  o: THREE.Object3D | null | undefined,
): o is THREE.SkinnedMesh {
  return o instanceof THREE.SkinnedMesh;
}

/** A Bone with its real event map type. */
export function isBone(o: THREE.Object3D | null | undefined): o is THREE.Bone {
  return o instanceof THREE.Bone;
}

/** A Points object with its real geometry and material types. */
export function isPoints(
  o: THREE.Object3D | null | undefined,
): o is THREE.Points {
  return o instanceof THREE.Points;
}

/** An InstancedMesh with its real geometry and material types. */
export function isInstancedMesh(
  o: THREE.Object3D | null | undefined,
): o is THREE.InstancedMesh {
  return o instanceof THREE.InstancedMesh;
}
