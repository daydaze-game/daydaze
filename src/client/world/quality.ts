// The render quality as React context, so scenes can pick detail levels: the
// content tier (low, high or ultra) and the advanced switches. Defaults to
// Balanced when no provider is mounted.

import { createContext, useContext } from "react";
import { presetGraphics, type Graphics } from "../../game/graphics.ts";

export type { QualityTier } from "../../game/graphics.ts";

const BALANCED = presetGraphics("balanced");

/**
 * Provides the active tier to the scene; World sets it from the Graphics
 * menu, the frame-rate monitor or the `?quality=` flag. Only Performance is
 * "low": a scene that adds detail asks `tier !== "low"`, so ultra gets all
 * of high's.
 */
export const QualityContext = createContext(BALANCED.tier);

/** The current quality tier from QualityContext. */
export const useQuality = () => useContext(QualityContext);

/** The tier plus the advanced switches (reflections, shadows ...) in force. */
export const GraphicsContext = createContext<Graphics>(BALANCED);

/** The graphics settings in force, after Auto and the URL flag are applied. */
export const useGraphics = () => useContext(GraphicsContext);
