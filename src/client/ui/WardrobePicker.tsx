// The closet's mix-and-match pickers: one row per wardrobe slot (top,
// bottom, one-piece, outerwear, legwear) with the garments the wardrobe may
// wear, and a color for the one worn. The layering rules are wardrobe.ts's.
import type { Look } from "../../game/look.ts";
import { OUTFIT_COLORS } from "../../game/look.ts";
import { wearableGarments } from "../../game/shop.ts";
import {
  encodeWear,
  putOn,
  takeOff,
  wearOf,
  type Slot,
} from "../../game/wardrobe.ts";
import { Chips, ColorPicker } from "./controls.tsx";

/** The slots in closet order, with their names. */
const ROWS: readonly { slot: Slot; label: string; optional: boolean }[] = [
  { slot: "top", label: "Top", optional: false },
  { slot: "bottom", label: "Bottom", optional: false },
  { slot: "dress", label: "One-piece", optional: false },
  { slot: "outer", label: "Outerwear", optional: true },
  { slot: "legwear", label: "Legwear", optional: true },
];

export function WardrobePicker({
  look,
  setLook,
  wardrobe,
}: {
  look: Look;
  setLook: (look: Look) => void;
  wardrobe: readonly string[];
}) {
  const wear = wearOf(look);
  const owned = wearableGarments(wardrobe);
  const wearIt = (next: typeof wear) =>
    setLook({ ...look, wear: encodeWear(next) });
  return (
    <>
      {ROWS.map(({ slot, label, optional }) => {
        const worn = wear[slot];
        const options = [
          ...(optional ? [{ id: "none", label: "None" }] : []),
          ...owned.filter((g) => g.slot === slot),
        ];
        return (
          <section key={slot} data-slot={slot}>
            <h3>{label}</h3>
            <Chips
              label={label}
              options={options}
              value={worn?.id ?? (optional ? "none" : "")}
              onPick={(id) =>
                wearIt(
                  id === "none"
                    ? takeOff(wear, slot)
                    : putOn(wear, id, worn?.color ?? look.outfitColor),
                )
              }
            />
            {worn && (
              <ColorPicker
                label={`${label} color`}
                options={OUTFIT_COLORS}
                value={worn.color}
                onPick={(color) => wearIt(putOn(wear, worn.id, color))}
              />
            )}
          </section>
        );
      })}
    </>
  );
}
