// Instanced smoke wisps and a small flickering lighter glow when smoking.
// Kept strictly within the low-tier performance budget:
// - No new real lights (THREE.Light): lighter glow is a small emissive flame quad with flicker
// - Instanced wisps of rising smoke: allocated once, zero allocations in useFrame
// - Respects reduced motion (calm: static soft wisps without high oscillation)

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../motion.ts";
import { smokeStore } from "../effects/smokeEffect.ts";
import type { Player } from "../world/PlayerController.tsx";

const WISPS = 6;
const SMOKE_COLOR = new THREE.Color("#d1d5db");
const LIGHTER_COLOR = new THREE.Color("#ffaa33");

const scratchMatrix = new THREE.Matrix4();
const scratchPos = new THREE.Vector3();
const scratchRot = new THREE.Euler();
const scratchQuat = new THREE.Quaternion();
const scratchScale = new THREE.Vector3();

export function SmokeWisps({ player }: { player: Player }): JSX.Element | null {
  const calm = useReducedMotion();
  const smokeMesh = useRef<THREE.InstancedMesh>(null);
  const lighterMesh = useRef<THREE.Mesh>(null);

  const sphereGeom = useMemo(() => new THREE.SphereGeometry(0.12, 6, 6), []);
  const smokeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: SMOKE_COLOR,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    [],
  );

  const flameGeom = useMemo(() => new THREE.PlaneGeometry(0.08, 0.12), []);
  const flameMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: LIGHTER_COLOR,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  useFrame(({ clock }) => {
    const state = smokeStore.get();
    const now = Date.now() / 1000;
    const elapsed = now - state.startedAt;
    const active =
      state.dose !== null && elapsed >= 0 && elapsed < state.duration;

    const sm = smokeMesh.current;
    const lm = lighterMesh.current;

    if (!active) {
      if (sm && sm.visible) sm.visible = false;
      if (lm && lm.visible) lm.visible = false;
      return;
    }

    if (sm) sm.visible = true;

    // Anchor near player's chest / mouth area
    const px = player.pos.x;
    const py = player.pos.y + (player.sitting ? 0.9 : 1.35);
    const pz = player.pos.z;

    // Lighter flicker during first 1.5 seconds of lighting
    const isLighting = state.dose === "joint" && elapsed < 1.5;
    if (lm) {
      if (isLighting) {
        lm.visible = true;
        // Position slightly in front of player
        lm.position.set(px, py - 0.1, pz + 0.2);
        const t = clock.elapsedTime;
        const flicker = calm ? 1.0 : 0.7 + 0.3 * Math.sin(t * 35.0);
        lm.scale.set(flicker, flicker, flicker);
      } else {
        lm.visible = false;
      }
    }

    // Instanced smoke wisps rising and dispersing
    if (sm) {
      for (let i = 0; i < WISPS; i++) {
        // Offset life of each wisp; calm mode holds static phase per wisp
        const wispCycle = calm
          ? (i * (1 / WISPS)) % 1.0
          : (elapsed * 0.8 + i * (1 / WISPS)) % 1.0;
        const rise = wispCycle * 0.7; // rises 0.7m
        const spread = wispCycle * 0.25;
        const sway = calm ? 0 : Math.sin(wispCycle * 8 + i * 1.5) * 0.08;

        const x = px + Math.cos(i * 1.2) * spread + sway;
        const y = py + rise;
        const z = pz + Math.sin(i * 1.2) * spread;

        // Swell as it rises, fade toward end
        const s = (0.5 + wispCycle * 1.5) * (1 - wispCycle * 0.5);

        scratchPos.set(x, y, z);
        scratchRot.set(0, wispCycle * 2, 0);
        scratchQuat.setFromEuler(scratchRot);
        scratchScale.set(s, s, s);

        scratchMatrix.compose(scratchPos, scratchQuat, scratchScale);
        sm.setMatrixAt(i, scratchMatrix);
      }
      sm.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh
        ref={smokeMesh}
        args={[sphereGeom, smokeMat, WISPS]}
        frustumCulled={false}
        visible={false}
      />
      <mesh
        ref={lighterMesh}
        geometry={flameGeom}
        material={flameMat}
        frustumCulled={false}
        visible={false}
      />
    </>
  );
}
