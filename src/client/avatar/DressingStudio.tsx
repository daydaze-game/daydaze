// A private preview scene in the existing WebGL canvas. The world stays mounted
// so closing the dressing room returns to the player's exact location.
import { OrbitControls } from "@react-three/drei";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { bodyScales, type BodyShape } from "../../game/body.ts";
import { faceHeightOf } from "../../game/cameraZoom.ts";
import { bodyOf, type Look, type SwimLook } from "../../game/look.ts";
import type { View } from "../world/CameraRig.tsx";
import { HumanDoll } from "./human/HumanDoll.tsx";

function PreviewReady() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  useFrame(() => {
    if (++frames.current === 10) gl.domElement.dataset.studio = "ready";
  });
  return null;
}

export function DressingStudio({
  look,
  body,
  swim,
  view,
}: {
  look: Look;
  body: BodyShape;
  swim: SwimLook | null;
  view: View;
}) {
  const scene = useMemo(() => new THREE.Scene(), []);
  const camera = useMemo(
    () => new THREE.PerspectiveCamera(30, 1, 0.05, 30),
    [],
  );
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const setEvents = useThree((s) => s.setEvents);
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);
  const stage = useRef({ width: 1, height: 1, bottom: 0 });
  const close = view === "face" || view === "detail";
  const height = bodyScales(body).height;
  const targetY = close
    ? faceHeightOf(bodyOf(look), false) * height
    : 0.88 * height;
  const target = useMemo<[number, number, number]>(
    () => [0, targetY, 0],
    [targetY],
  );

  useEffect(() => {
    camera.position.set(0, targetY, close ? 1.15 : 4.2 * height);
    camera.lookAt(0, targetY, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, close, height, targetY, invalidate]);

  useEffect(() => {
    const enabled = get().events.enabled;
    setEvents({ enabled: false });
    gl.domElement.dataset.studio = "loading";
    return () => {
      setEvents({ enabled });
      delete gl.domElement.dataset.studio;
      const current = get().size;
      gl.setViewport(0, 0, current.width, current.height);
      gl.setScissorTest(false);
      invalidate();
    };
  }, [gl, get, setEvents, invalidate]);

  useLayoutEffect(() => {
    const panel = document.getElementById("dressing");
    const measure = () => {
      const rect = panel?.getBoundingClientRect();
      const phone = rect && rect.width >= size.width * 0.9;
      const width = Math.max(
        1,
        phone ? size.width : size.width - (rect?.width ?? 0),
      );
      const height = Math.max(
        1,
        phone ? size.height - rect.height : size.height,
      );
      stage.current = { width, height, bottom: size.height - height };
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      invalidate();
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (panel) observer.observe(panel);
    return () => observer.disconnect();
  }, [camera, invalidate, size.width, size.height]);

  // Positive priority takes over rendering: neither rooms nor NPCs are drawn.
  // Use the exposed part of the canvas, beside the drawer or above the sheet.
  useFrame(() => {
    const { width, height, bottom } = stage.current;
    gl.setScissorTest(false);
    gl.setViewport(0, 0, size.width, size.height);
    gl.setClearColor("#35303b", 1);
    gl.clear();
    gl.setViewport(0, bottom, width, height);
    gl.setScissor(0, bottom, width, height);
    gl.setScissorTest(true);
    gl.render(scene, camera);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, size.width, size.height);
    invalidate();
  }, 2);

  return createPortal(
    <>
      <color attach="background" args={["#35303b"]} />
      <hemisphereLight args={["#ffffff", "#61596a", 1.6]} />
      <directionalLight position={[2, 4, 5]} color="#fff5ed" intensity={2.4} />
      <directionalLight position={[-3, 2, 2]} color="#e5eeff" intensity={1.2} />
      <directionalLight position={[0, 3, -3]} intensity={1.6} />
      <Suspense fallback={null}>
        <HumanDoll
          own
          look={look}
          body={body}
          swim={swim}
          mood="idle"
          seed={0}
        />
        <PreviewReady />
      </Suspense>
      <OrbitControls
        camera={camera}
        domElement={gl.domElement}
        target={target}
        enablePan={false}
        minDistance={0.65}
        maxDistance={7}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI - 0.25}
      />
    </>,
    scene,
    { camera, events: { enabled: false } },
  );
}
