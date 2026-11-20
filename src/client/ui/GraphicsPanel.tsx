// The Graphics sheet: a preset (Auto, Performance, Balanced, Realistic) and the
// advanced switches behind it, with the measured frame rate beside them. It
// stays open over the live world, so a change shows at once; changing any
// advanced switch moves the preset to Custom.

import { useEffect, type JSX } from "react";
import {
  changeAdvanced,
  FRAME_CAPS,
  MAX_BLOOM,
  presetGraphics,
  PRESETS,
  SCALES,
  type Advanced,
  type DrawDistance,
  type Graphics,
  type GraphicsPreset,
  type QualityTier,
} from "../../game/graphics.ts";
import { renderStats } from "../world/fps.ts";
import { Segmented, Slider } from "./controls.tsx";

const PRESET_LABELS: Record<GraphicsPreset, string> = {
  auto: "Auto",
  performance: "Performance",
  balanced: "Balanced",
  realistic: "Realistic",
  custom: "Custom",
};

const PRESET_HINTS: Record<GraphicsPreset, string> = {
  auto: "Starts at Balanced and steps down if your frame rate drops.",
  performance: "The lightest look: the best frame rate on any device.",
  balanced: "Reflective floors, glow and sharper pixels.",
  realistic:
    "Adds shadows and ambient occlusion. Wants a strong graphics card.",
  custom: "Your own mix of the switches below.",
};

/** What the tier in force is called in the menu. */
const TIER_NAME: Record<QualityTier, string> = {
  low: "Performance",
  high: "Balanced",
  ultra: "Realistic",
};

const DISTANCE_OPTIONS = [
  { id: "near", label: "Near" },
  { id: "medium", label: "Medium" },
  { id: "far", label: "Far" },
] as const satisfies readonly { id: DrawDistance; label: string }[];

const SCALE_OPTIONS = SCALES.map((s) => ({
  id: String(s),
  label: `${Math.round(s * 100)}%`,
}));

const CAP_OPTIONS = FRAME_CAPS.map((c) => ({
  id: String(c),
  label: c === 0 ? "None" : String(c),
}));

type Switch = "shadows" | "ao" | "reflections" | "post";

/** The on/off switches, with the sentence that says what each does. */
const SWITCHES: readonly [Switch, string, string][] = [
  ["shadows", "Shadows", "Dolls cast shadows on the ground."],
  ["ao", "Ambient occlusion", "Darkens creases and where things touch."],
  ["reflections", "Reflections", "Mirror floors; off uses a flat gloss."],
  ["post", "Post effects", "Bloom glow, tone mapping and vignette."],
];

/** The patch that sets one switch. */
function flip(key: Switch, on: boolean): Partial<Advanced> {
  switch (key) {
    case "shadows":
      return { shadows: on };
    case "ao":
      return { ao: on };
    case "reflections":
      return { reflections: on };
    case "post":
      return { post: on };
  }
}

/** A captioned control: the radio group's name, in view for everyone. */
function Field({
  label,
  children,
}: {
  label: string;
  children: JSX.Element;
}): JSX.Element {
  return (
    <div className="graphics-field">
      <span>{label}</span>
      {children}
    </div>
  );
}

export function GraphicsPanel({
  graphics,
  onChange,
  onClose,
}: {
  graphics: Graphics;
  onChange: (graphics: Graphics) => void;
  onClose: () => void;
}): JSX.Element {
  const { fps, tier } = renderStats.use();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const presets: { id: GraphicsPreset; label: string }[] = PRESETS.map(
    (id) => ({ id, label: PRESET_LABELS[id] }),
  );
  // Custom is a result, not a choice: it shows only once something is changed
  if (graphics.preset === "custom")
    presets.push({ id: "custom", label: PRESET_LABELS.custom });
  const set = (patch: Partial<Advanced>) =>
    onChange(changeAdvanced(graphics, patch));
  return (
    <section
      className="game-menu graphics-panel"
      role="dialog"
      aria-label="Graphics"
    >
      <div className="game-menu-head">
        <h2>Graphics</h2>
        <button type="button" aria-label="Close graphics" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="graphics-fps">
        {fps > 0 ? `${fps} frames per second` : "Measuring frame rate"}
        {tier && ` · ${TIER_NAME[tier]} look`}
      </p>
      <Segmented
        className="graphics-presets"
        label="Graphics preset"
        value={graphics.preset}
        options={presets}
        onPick={(id) => {
          const preset = PRESETS.find((p) => p === id);
          if (preset) onChange(presetGraphics(preset));
        }}
      />
      <p className="graphics-hint">{PRESET_HINTS[graphics.preset]}</p>
      <h3>Advanced</h3>
      <div className="graphics-switches" role="group" aria-label="Advanced">
        {SWITCHES.map(([key, label, hint]) => (
          <label key={key} className="graphics-switch">
            <input
              type="checkbox"
              checked={graphics[key]}
              onChange={(e) => set(flip(key, e.target.checked))}
            />
            <span>{label}</span>
            <small>{hint}</small>
          </label>
        ))}
      </div>
      <Slider
        label={`Bloom strength: ${graphics.bloom.toFixed(2)}`}
        value={graphics.bloom}
        min={0}
        max={MAX_BLOOM}
        step={0.05}
        onChange={(bloom) => set({ bloom })}
      />
      <Field label="Render distance">
        <Segmented
          className="graphics-row"
          label="Render distance"
          value={graphics.distance}
          options={DISTANCE_OPTIONS}
          onPick={(distance) => set({ distance })}
        />
      </Field>
      <Field label="Resolution scale">
        <Segmented
          className="graphics-row"
          label="Resolution scale"
          value={String(graphics.scale)}
          options={SCALE_OPTIONS}
          onPick={(id) => set({ scale: Number(id) })}
        />
      </Field>
      <Field label="Frame-rate cap">
        <Segmented
          className="graphics-row"
          label="Frame-rate cap"
          value={String(graphics.fpsCap)}
          options={CAP_OPTIONS}
          onPick={(id) =>
            set({ fpsCap: FRAME_CAPS.find((c) => String(c) === id) ?? 0 })
          }
        />
      </Field>
    </section>
  );
}
