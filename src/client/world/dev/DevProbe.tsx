// The dev panel's half inside the Canvas: samples gl.info twice a second,
// applies the view switches (wireframe, grid, half res, pause, free cam),
// handles shift+click picking (the inspector's selection, outlined in
// yellow), the teleport and "look at", and exposes `__dd` to the console. Development only; see DevTools.tsx.
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { clampToArea, type WalkArea } from "../../../game/area.ts";
import { placePlayer, type Player } from "../PlayerController.tsx";
import {
  applyWireframe,
  countLights,
  countObjects,
  objectBox,
  objectPath,
} from "./sceneUtil.ts";
import { actions, devState, patch, useDev, useFreeCam } from "./store.ts";

export function DevProbe({ player, area }: { player: Player; area: WalkArea }) {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const setDpr = useThree((s) => s.setDpr);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const { wireframe, helpers, halfRes, paused, selection } = useDev();
  const tick = useRef({ frames: 0, since: performance.now() });
  // the selection's outline, kept on it every frame so it follows a moving
  // doll or an edit from the inspector
  const box = useMemo(() => {
    const helper = new THREE.Box3Helper(new THREE.Box3(), 0xffff00);
    for (const m of [helper.material].flat()) m.depthTest = false;
    helper.renderOrder = 999;
    return helper;
  }, []);
  useEffect(() => {
    if (!selection) return;
    scene.add(box);
    return () => {
      box.removeFromParent();
    };
  }, [scene, box, selection]);
  useEffect(() => () => box.dispose(), [box]);
  useFrame(({ camera }) => {
    const sel = devState().selection;
    if (sel) objectBox(sel.object, sel.instanceId, box.box);
    const t = tick.current;
    t.frames++;
    const now = performance.now();
    if (now - t.since < 500) return;
    patch({
      fps: Math.round((t.frames * 1000) / (now - t.since)),
      camera: camera.position
        .toArray()
        .map((n) => n.toFixed(1))
        .join(", "),
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      lights: countLights(scene),
      objects: countObjects(scene),
    });
    t.frames = 0;
    t.since = now;
    // reapplied each tick so meshes that stream in join the wireframe
    if (devState().wireframe) applyWireframe(scene, true);
  });
  useEffect(() => applyWireframe(scene, wireframe), [scene, wireframe]);
  useEffect(() => {
    if (!helpers) return;
    const grid = new THREE.GridHelper(100, 100);
    const axes = new THREE.AxesHelper(5);
    // drawn over everything: the ground sits at y 0 and would hide them
    for (const helper of [grid, axes]) {
      for (const m of [helper.material].flat()) m.depthTest = false;
      helper.renderOrder = 999;
    }
    scene.add(grid, axes);
    return () => {
      scene.remove(grid, axes);
      grid.dispose();
      axes.dispose();
    };
  }, [scene, helpers]);
  useEffect(() => {
    if (!halfRes) return;
    const before = window.devicePixelRatio;
    setDpr(0.5);
    return () => setDpr(Math.min(before, 1.5));
  }, [halfRes, setDpr]);
  // "never" also stops this probe's frames, so only the panel can resume
  useEffect(() => {
    setFrameloop(paused ? "never" : "always");
  }, [paused, setFrameloop]);
  // console handles, and the hook the Three.js Developer Tools extension
  // listens for, so it can see this R3F scene and renderer
  useEffect(() => {
    const dd = {
      THREE,
      scene,
      gl,
      get,
      player,
      pick: null as THREE.Object3D | null,
    };
    Object.assign(window, { __dd: dd });
    // the extension's hook is an EventTarget on window; it takes the object
    const hook = Reflect.get(window, "__THREE_DEVTOOLS__");
    if (hook instanceof EventTarget) {
      hook.dispatchEvent(new CustomEvent("observe", { detail: scene }));
      hook.dispatchEvent(new CustomEvent("observe", { detail: gl }));
    }
    // shift+click selects what is under the cursor for the inspector, logs
    // it and keeps it as __dd.pick; shift+click on empty sky clears it
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      if (!e.shiftKey) return;
      const { camera, raycaster } = get();
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster
        .intersectObjects(scene.children, true)
        .find((h) => h.object !== box);
      if (!hit) {
        patch({ selection: null });
        return;
      }
      dd.pick = hit.object;
      const instanceId = hit.instanceId ?? null;
      patch({ selection: { object: hit.object, instanceId } });
      const size = objectBox(hit.object, instanceId, new THREE.Box3()).getSize(
        new THREE.Vector3(),
      );
      console.log(
        "[dev pick]",
        objectPath(hit.object),
        hit.instanceId === undefined ? "" : `instance ${hit.instanceId}`,
        { point: hit.point.toArray(), size: size.toArray() },
        hit.object,
      );
    };
    el.addEventListener("pointerdown", onDown);
    return () => el.removeEventListener("pointerdown", onDown);
  }, [scene, box, gl, get, player]);
  // teleport: put the doll where the middle of the view meets the floor
  // (y 0), clamped to the room's walkable area; not while seated or riding
  useEffect(() => {
    actions.teleport = () => {
      if (player.seat || player.ride) return;
      const { camera, raycaster } = get();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const p = raycaster.ray.intersectPlane(floor, new THREE.Vector3());
      if (!p) return;
      placePlayer(player, ...clampToArea(area, [p.x, p.z]));
    };
    return () => {
      actions.teleport = null;
    };
  }, [player, area, get]);
  // look at: free cam on, orbiting the selection from a little way off
  useEffect(() => {
    actions.focus = () => {
      const sel = devState().selection;
      if (!sel) return;
      const b = objectBox(sel.object, sel.instanceId, new THREE.Box3());
      const center = b.getCenter(new THREE.Vector3());
      const reach = Math.max(2, b.getSize(new THREE.Vector3()).length());
      // the camera rig's own orbit controls give way to the free cam's on
      // the next render; aim once the free cam's are the ones in charge
      const rigControls = devState().freeCam ? null : get().controls;
      patch({ freeCam: true });
      let tries = 30;
      const aim = () => {
        const { camera, controls } = get();
        if (controls instanceof OrbitControlsImpl && controls !== rigControls) {
          const away = camera.position.clone().sub(center).normalize();
          camera.position.copy(center).addScaledVector(away, reach);
          controls.target.copy(center);
          controls.update();
        } else if (tries-- > 0) {
          requestAnimationFrame(aim);
        }
      };
      aim();
    };
    return () => {
      actions.focus = null;
    };
  }, [get]);
  const freeCam = useFreeCam();
  return freeCam ? <OrbitControls makeDefault /> : null;
}
