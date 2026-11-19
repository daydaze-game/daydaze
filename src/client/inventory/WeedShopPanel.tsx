// A weed shop's menu: a button per item with its price, paid from the saved
// wallet into the pouch. Used by the gas-station counter (hemp), the Green
// Haze dispensary (every other strain) and the street dealer (a few a day). 18+ only.

import type { JSX } from "react";
import { activeTier, allows } from "../../game/age.ts";
import { dayOf } from "../../game/challenges.ts";
import {
  itemOf,
  MAX_PER_ITEM,
  MAX_TOTAL,
  menuFor,
  totalOf,
  type Shop,
} from "../../game/inventory.ts";
import { buy, pouchDesk } from "./pouchDesk.ts";

export function WeedShopPanel({
  shop,
  title,
}: {
  shop: Shop;
  title: string;
}): JSX.Element | null {
  const { coins, inventory } = pouchDesk.use();
  if (!allows(activeTier(), "drugs")) return null;
  const full = totalOf(inventory) >= MAX_TOTAL;
  return (
    <section className="game-panel" aria-label={title} data-shop={shop}>
      <p className="game-score">
        {title} · {coins} coins
      </p>
      {full && <p role="status">Your pouch is full</p>}
      <div className="game-row">
        {menuFor(shop, dayOf(Date.now())).map(({ id, price }) => (
          <button
            key={id}
            type="button"
            disabled={
              coins < price || full || (inventory[id] ?? 0) >= MAX_PER_ITEM
            }
            onClick={() => buy(shop, id)}
          >
            Buy {itemOf(id)?.name} · {price} coins
          </button>
        ))}
      </div>
    </section>
  );
}
