// The pouch's shared state and actions. The save holds the pouch, the gift day
// and the coins; App mirrors them into `pouchDesk` and installs `commit`, which
// writes a new set back into the save (the same pattern as the garden desk).
// Actions read the desk, not a render snapshot, so a fast double click can't
// spend or use the same thing twice. Everything is 18+ only: at 13+ nothing
// here does anything.

import { activeTier, allows } from "../../game/age.ts";
import { dayOf } from "../../game/challenges.ts";
import {
  buyItem,
  claimGift,
  itemOf,
  removeItem,
  type Inventory,
  type ItemId,
  type Shop,
} from "../../game/inventory.ts";
import { take } from "../effects/high.ts";
import { createStore } from "../rooms/shared/store.ts";

export type PouchSave = {
  inventory: Inventory;
  giftDay: number;
  coins: number;
};

const NONE: Inventory = {};

export const pouchDesk = createStore({
  inventory: NONE,
  giftDay: 0,
  coins: 0,
  /** What just happened, for the pouch panel's status line. */
  note: "",
  commit: null as ((next: PouchSave) => void) | null,
});

const commit = (next: PouchSave, note: string) => {
  pouchDesk.set({ ...next, note });
  pouchDesk.get().commit?.(next);
};

const open = () => allows(activeTier(), "drugs");

/** Buys `id` at `shop` into the pouch. Returns whether it was bought. */
export function buy(shop: Shop, id: ItemId): boolean {
  const d = pouchDesk.get();
  const bought = open() ? buyItem(shop, d.coins, d.inventory, id) : null;
  if (!bought) return false;
  commit(
    { inventory: bought.inventory, giftDay: d.giftDay, coins: bought.coins },
    `Bought a ${itemOf(id)?.name ?? "thing"}`,
  );
  return true;
}

/** Uses one `id` from the pouch (the dose starts only if it is taken).
 * Returns whether it was used. */
export function takeFromPouch(id: ItemId): boolean {
  const d = pouchDesk.get();
  const item = itemOf(id);
  const left = open() ? removeItem(d.inventory, id) : null;
  if (!item || !left || !take(item.dose, item.strain)) return false;
  commit({ inventory: left, giftDay: d.giftDay, coins: d.coins }, "");
  return true;
}

/** The friend's free item for today, if there is one and there's room.
 * Returns what she got, or null. */
export function takeGift(now = Date.now()): ItemId | null {
  const d = pouchDesk.get();
  const got = open() ? claimGift(d.inventory, d.giftDay, dayOf(now)) : null;
  if (!got) return null;
  commit(
    { inventory: got.inventory, giftDay: got.giftDay, coins: d.coins },
    `Your friend gave you a ${itemOf(got.item)?.name ?? "gift"}`,
  );
  return got.item;
}
