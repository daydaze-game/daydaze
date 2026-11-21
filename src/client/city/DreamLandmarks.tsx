// Unique, textured addresses complement the instanced city vocabulary.
// These static glTF scenes keep their authored materials, UVs and normal maps.
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  landmarkPlacement,
  type DreamLandmark,
  type DreamSpot,
} from "../../game/city/dream.ts";

type LandmarkSpot = DreamSpot & { landmark: DreamLandmark };

export function isLandmark(spot: DreamSpot): spot is LandmarkSpot {
  return spot.landmark !== undefined;
}

export function DreamLandmarkBuilding({ spot }: { spot: LandmarkSpot }) {
  const placement = landmarkPlacement(spot);
  const name = `${spot.landmark}${spot.far ? "-lo" : ""}`;
  const gltf = useGLTF(`/models/city-dream/${name}.glb`);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf]);
  const canvas = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const attribute = `data-landmark-${spot.landmark}`;
    canvas.setAttribute(attribute, "ready");
    invalidate();
    return () => canvas.removeAttribute(attribute);
  }, [canvas, invalidate, spot.landmark, scene]);
  return (
    <group
      name={`landmark-${spot.id}`}
      position={[placement.x, placement.y, placement.z]}
      rotation={[0, spot.yaw, 0]}
      scale={placement.scale}
    >
      <primitive object={scene} dispose={null} />
    </group>
  );
}
