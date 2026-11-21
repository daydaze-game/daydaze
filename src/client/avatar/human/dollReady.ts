// Doll readiness checking for rendering and capture synchronization.

export type WornParts = {
  has(key: string): boolean;
};

export type RequiredParts = {
  /** The worn garments (or the swimsuit), each tracked under its key. */
  garments?: readonly { key: string }[] | undefined;
  hair?: string | null | undefined;
  shoes?: string | null | undefined;
};

/**
 * Checks whether all parts the doll wears (every garment, hair, shoes) have
 * loaded. A doll stays hidden while any worn part is still downloading so
 * body tuck morphs and sole lift do not draw premature sunken geometry.
 */
export function isDollReady(worn: WornParts, parts: RequiredParts): boolean {
  return (
    (parts.garments ?? []).every((g) => worn.has(g.key)) &&
    (!parts.hair || worn.has("hair")) &&
    (!parts.shoes || worn.has("shoes"))
  );
}
