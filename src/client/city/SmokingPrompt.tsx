// Outdoor smoking spot prompt: when the player is in an allowed outdoor smoking
// spot (boardwalk bench, beach fire, rooftop) after dark at 18+, offers a prompt
// to smoke a joint or take a puff from a vape if in inventory or available.

import { useEffect, useState, type JSX } from "react";
import { activeTier, allows } from "../../game/age.ts";
import type { RoomId } from "../../game/rooms.ts";
import {
  smokingSpotAt,
  isAfterDark,
  type SmokingSpot,
} from "../../game/city/smokingSpots.ts";
import { cityHour } from "../city/daylight.ts";
import { playerSpot } from "../world/playerSpot.ts";
import { driving } from "../world/driving.ts";
import { pouchDesk } from "../inventory/pouchDesk.ts";
import { take } from "../effects/high.ts";
import { triggerSmoke } from "../effects/smokeEffect.ts";
import {
  ITEMS,
  itemOf,
  removeItem,
  type ItemId,
} from "../../game/inventory.ts";

export function SmokingPrompt({ room }: { room: RoomId }): JSX.Element | null {
  const [spot, setSpot] = useState<SmokingSpot | null>(null);
  const { inventory, giftDay, coins } = pouchDesk.use();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!allows(activeTier(), "drugs") || driving.session) {
        setSpot(null);
        return;
      }
      const hour = cityHour();
      if (!isAfterDark(hour)) {
        setSpot(null);
        return;
      }
      const s = smokingSpotAt(room, [playerSpot.x, playerSpot.z]);
      setSpot(s);
    }, 300);
    return () => window.clearInterval(id);
  }, [room]);

  if (!spot) return null;

  // Check inventory for joints or vapes
  const jointItem = ITEMS.find(
    (i) => i.dose === "joint" && (inventory[i.id] ?? 0) > 0,
  )?.id;
  const vapeItem = ITEMS.find(
    (i) => i.dose === "vape" && (inventory[i.id] ?? 0) > 0,
  )?.id;

  const handleSmoke = (itemId?: ItemId, fallbackDose?: "joint" | "vape") => {
    // Re-verify eligibility at action time
    if (!allows(activeTier(), "drugs") || driving.session) return;
    const hour = cityHour();
    if (!isAfterDark(hour)) return;
    const currentSpot = smokingSpotAt(room, [playerSpot.x, playerSpot.z]);
    if (!currentSpot) return;

    if (itemId) {
      const item = itemOf(itemId);
      const left = removeItem(inventory, itemId);
      if (item && left && take(item.dose, item.strain)) {
        triggerSmoke(item.dose);
        pouchDesk.set({
          inventory: left,
          giftDay,
          coins,
          note: `Used ${item.name}`,
        });
        pouchDesk.get().commit?.({ inventory: left, giftDay, coins });
      }
    } else if (fallbackDose) {
      if (take(fallbackDose)) {
        triggerSmoke(fallbackDose);
      }
    }
  };

  return (
    <section
      className="game-panel smoking-spot-panel"
      aria-label={`Smoking Spot: ${spot.name}`}
      data-smoking-spot={spot.id}
    >
      <div className="game-row" style={{ alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>
          {spot.name} (Outdoor smoking area)
        </span>
        {jointItem ? (
          <button
            type="button"
            className="drink"
            onClick={() => handleSmoke(jointItem)}
          >
            Light {itemOf(jointItem)?.name}
          </button>
        ) : (
          <button
            type="button"
            className="drink"
            onClick={() => handleSmoke(undefined, "joint")}
          >
            Light a joint
          </button>
        )}
        {vapeItem ? (
          <button
            type="button"
            className="drink"
            onClick={() => handleSmoke(vapeItem)}
          >
            Vape {itemOf(vapeItem)?.name}
          </button>
        ) : (
          <button
            type="button"
            className="drink"
            onClick={() => handleSmoke(undefined, "vape")}
          >
            Take a vape puff
          </button>
        )}
      </div>
    </section>
  );
}
