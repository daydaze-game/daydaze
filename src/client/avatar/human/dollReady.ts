// Doll readiness checking for rendering and capture synchronization.

export type WornParts = {
  has(key: string): boolean;
};

export type RequiredParts = {
  outfit?: string | null | undefined;
  hair?: string | null | undefined;
  shoes?: string | null | undefined;
};

/**
 * Checks whether all parts the doll wears (outfit, hair, shoes) have loaded.
 * A doll stays hidden while any worn part is still downloading so body tuck
 * morphs and sole lift do not draw premature sunken geometry.
 */
export function isDollReady(worn: WornParts, parts: RequiredParts): boolean {
  return (
    (!parts.outfit || worn.has("outfit")) &&
    (!parts.hair || worn.has("hair")) &&
    (!parts.shoes || worn.has("shoes"))
  );
}
