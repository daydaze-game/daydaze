// The grandstand crowd: baked doll people (peopleModel.ts), four looks
// standing or cheering, in rows. Each of the eight poses is one
// InstancedMesh, so the whole crowd is eight draw calls.

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { seeded } from "./canvasTextures.ts";
import { FAN_MODELS, usePersonAt } from "./peopleModel.ts";
import { FAN_LOOKS } from "../../../game/crowd.ts";

const ROWS = 6;
const COLS = 26;

type Seat = { x: number; y: number; z: number; yaw: number; scale: number };

/** Every seat's person, shared out among the eight poses (a quarter cheer). */
function seatPlan(): Seat[][] {
  const rand = seeded(42);
  const plan: Seat[][] = FAN_MODELS.map(() => []);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // an empty seat now and then
      if (rand() < 0.08) continue;
      const look = Math.floor(rand() * FAN_LOOKS.length);
      const cheers = rand() < 0.28 ? 1 : 0;
      plan[look * 2 + cheers]?.push({
        x: -21 + (c / (COLS - 1)) * 42 + (rand() - 0.5) * 0.2,
        y: r * 0.9 + 0.6,
        z: -r * 1.1 + 0.15,
        // facing the track (-z), a little each way
        yaw: Math.PI + (rand() - 0.5) * 0.4,
        // a little taller or shorter than the next fan
        scale: 0.94 + rand() * 0.12,
      });
    }
  }
  return plan;
}

function Pose({ url, seats }: { url: string; seats: Seat[] }) {
  const person = usePersonAt(url);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    seats.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(0, s.yaw, 0);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.count = seats.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [person, seats]);
  if (!person || seats.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[person.geometry, person.material, seats.length]}
      frustumCulled={false}
    />
  );
}

export function Crowd({
  origin = [0, -23],
}: {
  origin?: readonly [number, number];
}) {
  const plan = useMemo(seatPlan, []);
  return (
    <group position={[origin[0], 0, origin[1]]}>
      {FAN_MODELS.map((url, i) => (
        <Pose key={url} url={url} seats={plan[i] ?? []} />
      ))}
    </group>
  );
}
