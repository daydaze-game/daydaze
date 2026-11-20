// The measured frame rate and the tier in force, written by the 3D scene and
// read by the Graphics menu so players can judge their settings.
import type { QualityTier } from "../../game/graphics.ts";
import { createStore } from "../rooms/shared/store.ts";

/** `fps` is 0 until measured (or while the scene draws on demand). */
export const renderStats = createStore<{
  fps: number;
  tier: QualityTier | null;
}>({ fps: 0, tier: null });
