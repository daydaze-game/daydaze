// The measured frame rate and the tier in force, written by the 3D scene and
// read by the Graphics menu so players can judge their settings.
import type { Graphics, QualityTier } from "../../game/graphics.ts";
import { createStore } from "../rooms/shared/store.ts";

/**
 * `fps` is 0 until measured (or while the scene draws on demand). `active` is
 * what is really rendering (Auto's step-down, or a tier forced by the URL), so
 * the menu can show it; `forced` says the URL flag is overriding the menu.
 */
export const renderStats = createStore<{
  fps: number;
  tier: QualityTier | null;
  active: Graphics | null;
  forced: boolean;
}>({ fps: 0, tier: null, active: null, forced: false });
