// RGB color ids: the one check every look, wear and swim code uses for the
// colors that arrive from storage and the network.

/** A full RGB color, validated at the storage and network boundary. */
export function isColor(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(value) &&
    value.length === 7
  );
}
