// The heist at City Trust, as seen on the street: the robbers running for the
// getaway car (or standing caught), the squad cars' flashing light bars, a red
// strobe over the bank door, and the alarm bell and sirens, louder the nearer
// the camera is. The cars themselves are drawn with the traffic (Traffic.tsx);
// everything moves on the shared heist clock (game/city/heist.ts).

import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  startAlarmBell,
  startSiren,
  type DistantLoop,
} from "../../audio/worldSounds.ts";
import {
  BANK_DOOR,
  blankHeist,
  COPS,
  heistFrame,
  heistInto,
  ROBBERS,
  type HeistActor,
} from "../../game/city/heist.ts";
import type { Look } from "../../game/look.ts";
import { Doll } from "../avatar/Doll.tsx";
import { useReducedMotion } from "../motion.ts";
import { heistClock } from "./eventClocks.ts";

/** Robbers are drawn only while the camera is this near the bank. */
const ROBBER_RANGE = 160;
/** How far off the alarm bell and the sirens can still be heard, meters. */
const BELL_RANGE = 240;
const SIREN_RANGE = 420;
/** Light bar on the cop body's roof, in its own frame (nose down +z). */
const BAR_Y = 1.62;
const BAR_SIDE = 0.32;
/** Seconds each side of a light bar stays lit before the other takes over. */
const FLASH = 0.18;

const RED = new THREE.Color("#ff2236").multiplyScalar(3);
const BLUE = new THREE.Color("#2a5bff").multiplyScalar(3);
const DIM_RED = new THREE.Color("#ff2236").multiplyScalar(0.25);
const DIM_BLUE = new THREE.Color("#2a5bff").multiplyScalar(0.25);
// the traffic yaw faces +x; bodies and dolls face +z
const NOSE = Math.PI / 2;

/** Dark hoodies, puffers and tracksuits: dressed for running, not for the club. */
const ROBBER_LOOKS: readonly Look[] = (
  [
    ["#94603f", "buzz", "#1b1014", "puffer", "#141018", "masculine"],
    ["#f3d4c4", "low-pony", "#4a2a1c", "hoodie-bikers", "#141018", "feminine"],
    ["#633c29", "cornrows", "#1b1014", "tracksuit-y2k", "#3a5a8a", "masculine"],
  ] as const
).map(([skin, hairStyle, hairColor, outfit, outfitColor, body]) => ({
  skin,
  hairStyle,
  hairColor,
  outfit,
  outfitColor,
  body,
  lips: "lips-bare-balm",
  brows: "brows-feathered-honey",
  shadow: "#8a5a3c",
}));

/** One robber: placed every frame from the shared heist frame. */
function Robber({
  look,
  actor,
  seed,
}: {
  look: Look;
  actor: HeistActor;
  seed: number;
}) {
  const g = useRef<THREE.Group>(null);
  const walking = useMemo(() => ({ current: { speed: 0 } }), []);
  useFrame(() => {
    const at = g.current;
    if (!at) return;
    at.visible = actor.visible;
    at.position.set(actor.x, 0, actor.z);
    at.rotation.y = actor.yaw + NOSE;
    walking.current.speed = actor.speed;
  });
  return (
    <group ref={g} visible={false}>
      <Doll look={look} mood="idle" walk={walking} seed={seed} />
    </group>
  );
}

/**
 * The heist's people, lights and sound. Mounts the robbers only while a heist
 * is on, so the city carries no extra dolls the rest of the time. Under
 * reduced motion the light bars and the door strobe glow steady instead of
 * flashing.
 */
export function Heist() {
  const calm = useReducedMotion();
  const camera = useThree((s) => s.camera);
  const frame = useMemo(blankHeist, []);
  const [on, setOn] = useState(false);
  const bars = useRef<THREE.InstancedMesh>(null);
  const strobe = useRef<THREE.Mesh>(null);
  const bell = useRef<DistantLoop | null>(null);
  const siren = useRef<DistantLoop | null>(null);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const local = useMemo(() => new THREE.Matrix4(), []);
  const turn = useMemo(() => new THREE.Quaternion(), []);
  const at = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const unit = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  useEffect(
    () => () => {
      bell.current?.stop();
      siren.current?.stop();
    },
    [],
  );

  useFrame(() => {
    const t = heistClock();
    heistFrame(t, frame);
    const live = heistInto(t) !== null;
    if (live !== on) setOn(live);
    const cx = camera.position.x;
    const cz = camera.position.z;

    // the bell, from the bank door
    const toBank = Math.hypot(cx - BANK_DOOR[0], cz - BANK_DOOR[1]);
    if (frame.alarm && toBank < BELL_RANGE) {
      bell.current ??= startAlarmBell();
      bell.current?.level((1 - toBank / BELL_RANGE) ** 2);
    } else if (bell.current) {
      bell.current.stop();
      bell.current = null;
    }

    // the sirens, from the nearest squad car racing in
    let nearest = Infinity;
    for (let k = 0; k < COPS; k++) {
      const cop = frame.cops[k];
      if (frame.lit[k] && cop.speed > 0.5)
        nearest = Math.min(nearest, Math.hypot(cx - cop.x, cz - cop.z));
    }
    if (frame.siren && nearest < SIREN_RANGE) {
      siren.current ??= startSiren();
      siren.current?.level((1 - nearest / SIREN_RANGE) ** 2);
    } else if (siren.current) {
      siren.current.stop();
      siren.current = null;
    }

    // light bars: red on one side, blue on the other, swapping
    const swap = Math.floor(t / FLASH) % 2 === 0;
    const mesh = bars.current;
    if (mesh) {
      let n = 0;
      for (let k = 0; k < COPS; k++) {
        const cop = frame.cops[k];
        if (!frame.lit[k]) continue;
        matrix.compose(
          at.set(cop.x, 0, cop.z),
          turn.setFromAxisAngle(up, cop.yaw + NOSE),
          unit,
        );
        for (const side of [-1, 1]) {
          local.makeTranslation(side * BAR_SIDE, BAR_Y, 0);
          mesh.setMatrixAt(n, local.premultiply(matrix));
          const red = side < 0;
          const bright = calm || (red ? swap : !swap);
          mesh.setColorAt(
            n,
            red ? (bright ? RED : DIM_RED) : bright ? BLUE : DIM_BLUE,
          );
          n++;
        }
      }
      mesh.count = n;
      mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // the strobe over the bank door
    if (strobe.current)
      strobe.current.visible =
        frame.alarm && (calm || Math.floor(t * 3) % 2 === 0);
  });

  const nearBank =
    Math.hypot(
      camera.position.x - BANK_DOOR[0],
      camera.position.z - BANK_DOOR[1],
    ) < ROBBER_RANGE;
  return (
    <>
      <instancedMesh
        ref={bars}
        args={[undefined, undefined, COPS * 2]}
        frustumCulled={false}
        visible={false}
      >
        <boxGeometry args={[0.5, 0.12, 0.26]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <mesh
        ref={strobe}
        position={[BANK_DOOR[0], 4.2, BANK_DOOR[1] + 0.15]}
        visible={false}
      >
        <boxGeometry args={[1.4, 0.35, 0.3]} />
        <meshBasicMaterial color={RED} toneMapped={false} />
      </mesh>
      {on && nearBank && (
        <Suspense fallback={null}>
          {Array.from({ length: ROBBERS }, (_, k) => (
            <Robber
              key={k}
              look={ROBBER_LOOKS[k]}
              actor={frame.robbers[k]}
              seed={700 + k}
            />
          ))}
        </Suspense>
      )}
    </>
  );
}
