// The dev panel's inspector: what shift+click (or the scene tree) selected,
// with its transform, visibility and first material open for live edits.
// Edits only touch the running scene; "copy JSX" hands a transform back for
// the source. Development only.
import * as THREE from "three";
import { objectPath } from "./sceneUtil.ts";
import { actions, patch, useDev, type Selection } from "./store.ts";
import {
  readTransform,
  transformJsx,
  writeTransform,
  type TransformPart,
} from "./transform.ts";
import { Section } from "./widgets.tsx";

const PARTS: readonly TransformPart[] = ["position", "rotation", "scale"];
const AXES = [0, 1, 2] as const;

/** The first material of a mesh, line or points; null for anything else. */
function materialOf(o: THREE.Object3D): THREE.Material | null {
  if (
    o instanceof THREE.Mesh ||
    o instanceof THREE.Line ||
    o instanceof THREE.Points
  ) {
    const m: unknown = Array.isArray(o.material) ? o.material[0] : o.material;
    return m instanceof THREE.Material ? m : null;
  }
  return null;
}

/** A color picker bound to a material's color (or emissive). */
function ColorField({ label, color }: { label: string; color: THREE.Color }) {
  return (
    <label style={{ marginRight: 8 }}>
      {label}{" "}
      <input
        type="color"
        value={`#${color.getHexString()}`}
        onChange={(e) => {
          color.set(e.target.value);
          patch({});
        }}
      />
    </label>
  );
}

/** A 0..1 slider bound to a numeric material field. */
function UnitField({
  label,
  value,
  set,
}: {
  label: string;
  value: number;
  set: (v: number) => void;
}) {
  return (
    <label style={{ marginRight: 8 }}>
      {label}{" "}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => {
          set(Number(e.target.value));
          patch({});
        }}
        style={{ width: 70, verticalAlign: "middle" }}
      />
    </label>
  );
}

function MaterialFields({ material }: { material: THREE.Material }) {
  return (
    <div>
      <div>
        material {material.type}
        {material.name ? ` "${material.name}"` : ""}
        {/* shared materials change every mesh that uses them */}
        <span style={{ color: "#999" }}> (edits every mesh sharing it)</span>
      </div>
      {"color" in material && material.color instanceof THREE.Color && (
        <ColorField label="color" color={material.color} />
      )}
      {"emissive" in material && material.emissive instanceof THREE.Color && (
        <ColorField label="emissive" color={material.emissive} />
      )}
      {material instanceof THREE.MeshStandardMaterial && (
        <>
          <UnitField
            label="rough"
            value={material.roughness}
            set={(v) => (material.roughness = v)}
          />
          <UnitField
            label="metal"
            value={material.metalness}
            set={(v) => (material.metalness = v)}
          />
        </>
      )}
      <UnitField
        label="opacity"
        value={material.opacity}
        set={(v) => {
          material.opacity = v;
          material.transparent = v < 1 || material.transparent;
          material.needsUpdate = true;
        }}
      />
    </div>
  );
}

function SelectionFields({ sel }: { sel: Selection }) {
  const t = readTransform(sel);
  const material = materialOf(sel.object);
  return (
    <>
      <div style={{ wordBreak: "break-all" }}>
        {objectPath(sel.object)}
        {sel.instanceId !== null && ` · instance ${sel.instanceId}`}
      </div>
      {PARTS.map((part) => (
        <div key={part}>
          <span style={{ display: "inline-block", width: 64 }}>{part}</span>
          {AXES.map((axis) => (
            <input
              key={axis}
              type="number"
              aria-label={`${part} ${"xyz"[axis]}`}
              step={part === "rotation" ? 5 : 0.1}
              value={t[part][axis]}
              onChange={(e) => {
                writeTransform(sel, part, axis, e.target.valueAsNumber);
                patch({});
              }}
              style={{ width: 64, marginRight: 4 }}
            />
          ))}
        </div>
      ))}
      <div>
        {sel.instanceId === null && (
          <label style={{ marginRight: 8 }}>
            <input
              type="checkbox"
              checked={sel.object.visible}
              onChange={(e) => {
                sel.object.visible = e.target.checked;
                patch({});
              }}
            />{" "}
            visible
          </label>
        )}
        <button type="button" onClick={() => actions.focus?.()}>
          look at
        </button>{" "}
        <button
          type="button"
          onClick={() => {
            const jsx = transformJsx(t);
            console.log("[dev jsx]", jsx);
            void navigator.clipboard?.writeText(jsx).catch(() => {});
          }}
        >
          copy JSX
        </button>{" "}
        <button
          type="button"
          onClick={() => {
            Object.assign(window, { $sel: sel.object });
            console.log("[dev] $sel =", sel.object);
          }}
        >
          log as $sel
        </button>{" "}
        <button type="button" onClick={() => patch({ selection: null })}>
          clear
        </button>
      </div>
      {material && <MaterialFields material={material} />}
    </>
  );
}

export function Inspector() {
  const { selection } = useDev();
  return (
    <Section title="inspect">
      {selection ? (
        <SelectionFields sel={selection} />
      ) : (
        <div style={{ color: "#999" }}>shift+click something to inspect it</div>
      )}
    </Section>
  );
}
