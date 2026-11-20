// The crowd's people (src/game/crowd.ts): doll looks baked by art/crowd/ into
// one textured, posed mesh each (public/models/crowd/), at real size, so a
// crowd of them is a few InstancedMeshes.

import { bakedGeometry } from "../../world/bakedGeometry.ts";
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { isMesh } from "../../world/guards.ts";
import { CREW_LOOK, FAN_LOOKS, crowdUrl } from "../../../game/crowd.ts";

/** Fans: four looks, standing or cheering (look-major: idle, then cheer). */
export const FAN_MODELS = FAN_LOOKS.flatMap((look) => [
  crowdUrl(look, "idle", "far"),
  crowdUrl(look, "cheer", "far"),
]);
/** The pit crew, kneeling at the wheels. */
export const CREW_MODEL = crowdUrl(CREW_LOOK, "crouch", "far");
for (const url of [...FAN_MODELS, CREW_MODEL]) useGLTF.preload(url);

/** The mesh and material of the baked person in the glTF at `path`. */
export function usePersonAt(path: string): {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
} | null {
  const { scene } = useGLTF(path);
  return useMemo(() => {
    let found: {
      geometry: THREE.BufferGeometry;
      material: THREE.Material;
    } | null = null;
    // the optimized files quantize positions and keep the real size in the
    // node's transform: bake it into a copy of the geometry
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (isMesh(o) && !Array.isArray(o.material) && !found)
        found = {
          geometry: bakedGeometry(o),
          material: o.material,
        };
    });
    return found;
  }, [scene]);
}
