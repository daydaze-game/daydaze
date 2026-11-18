// The pouch: the weed she buys or is given and carries to use later. An item
// is a method (joint, vape, edible) of a strain (effects/substances.ts); the
// pouch is a sparse count per item with caps. Also the two shops' menus (the
// gas-station counter sells weak hemp, the dispensary every other strain) and
// the friend's one free item a day. Pure; the client keeps the pouch in the
// save. Everything that touches it is 18+ only (age.ts), but a teen save keeps
// its pouch rather than losing it.

import { allows, type ContentTier } from "./age.ts";
import { STRAINS, type Dose, type Strain } from "./effects/substances.ts";
import { spend } from "./wallet.ts";

/** The doses she can carry: the weed methods. */
export const WEED_DOSES = ["joint", "vape", "edible"] as const satisfies Dose[];
export type WeedDose = (typeof WEED_DOSES)[number];

export type ItemId = `${WeedDose}-${Strain}`;
export type Item = { id: ItemId; dose: WeedDose; strain: Strain; name: string };

const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** Every item, in a fixed order (cleaning and menus follow it). */
export const ITEMS: readonly Item[] = STRAINS.flatMap((strain) =>
  WEED_DOSES.map((dose): Item => {
    const id: ItemId = `${dose}-${strain}`;
    return { id, dose, strain, name: `${cap(strain)} ${dose}` };
  }),
);

const BY_ID = new Map<string, Item>(ITEMS.map((i) => [i.id, i]));
export const itemOf = (id: string): Item | null => BY_ID.get(id) ?? null;
export const isItemId = (x: unknown): x is ItemId =>
  typeof x === "string" && BY_ID.has(x);

/** Counts per item; items she has none of are absent. */
export type Inventory = Partial<Record<ItemId, number>>;

/** The most of one item, and of everything, the pouch holds. */
export const MAX_PER_ITEM = 10;
export const MAX_TOTAL = 30;

export const totalOf = (inv: Readonly<Inventory>): number =>
  ITEMS.reduce((sum, i) => sum + (inv[i.id] ?? 0), 0);

/** Validates and salvages a pouch from localStorage or network JSON: known
 * items only, whole positive counts, both caps. Idempotent (the server
 * rejects an upload that cleaning would change). */
export function cleanInventory(raw: unknown): Inventory {
  const out: Inventory = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  const stored = new Map(Object.entries(raw));
  let room = MAX_TOTAL;
  for (const { id } of ITEMS) {
    const n = stored.get(id);
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1) continue;
    const keep = Math.min(n, MAX_PER_ITEM, room);
    if (keep < 1) continue;
    out[id] = keep;
    room -= keep;
  }
  return out;
}

/** The pouch with `n` more of `id`, or null when that would pass a cap. */
export function addItem(
  inv: Readonly<Inventory>,
  id: ItemId,
  n = 1,
): Inventory | null {
  const have = inv[id] ?? 0;
  if (n < 1 || have + n > MAX_PER_ITEM || totalOf(inv) + n > MAX_TOTAL)
    return null;
  return { ...inv, [id]: have + n };
}

/** The pouch with one `id` taken out, or null when there is none. */
export function removeItem(
  inv: Readonly<Inventory>,
  id: ItemId,
): Inventory | null {
  const have = inv[id] ?? 0;
  if (have < 1) return null;
  const { [id]: _taken, ...rest } = inv;
  return have > 1 ? { ...rest, [id]: have - 1 } : rest;
}

/** Whether the pouch can be shown and used: 18+, and not empty. */
export const usable = (tier: ContentTier, inv: Readonly<Inventory>): boolean =>
  allows(tier, "drugs") && totalOf(inv) > 0;

export type Shop = "gas" | "dispensary";

const GAS_PRICE: Record<WeedDose, number> = { joint: 5, edible: 5, vape: 8 };
const SHOP_PRICE: Record<WeedDose, number> = {
  joint: 10,
  edible: 12,
  vape: 15,
};

/** What each shop sells, in coins (a snack is 3). Hemp is the weak, cheap
 * kind; the dispensary sells every other strain at a higher price. */
export const MENUS: Record<Shop, readonly { id: ItemId; price: number }[]> = {
  gas: ITEMS.filter((i) => i.strain === "hemp").map((i) => ({
    id: i.id,
    price: GAS_PRICE[i.dose],
  })),
  dispensary: ITEMS.filter((i) => i.strain !== "hemp").map((i) => ({
    id: i.id,
    price: SHOP_PRICE[i.dose],
  })),
};

/** The wallet and pouch after buying `id` at `shop`, or null when it isn't
 * on the menu, is too dear, or the pouch is full. */
export function buyItem(
  shop: Shop,
  coins: number,
  inv: Readonly<Inventory>,
  id: ItemId,
): { coins: number; inventory: Inventory } | null {
  const entry = MENUS[shop].find((m) => m.id === id);
  if (!entry) return null;
  const left = spend(coins, entry.price);
  const inventory = addItem(inv, id);
  return left === null || inventory === null
    ? null
    : { coins: left, inventory };
}

/** The friend's item on `day` (a day count: challenges.ts `dayOf`): one of the
 * dispensary's, rotating so every day differs from the last. */
export function giftFor(day: number): ItemId {
  const menu = MENUS.dispensary;
  const pick = menu[((day % menu.length) + menu.length) % menu.length];
  return pick ? pick.id : "joint-hybrid";
}

/** The friend's gift for `today`, once a day: the new pouch and day, or null
 * when she already got today's (or the clock ran backwards) or the pouch is
 * full (the day isn't used up). */
export function claimGift(
  inv: Readonly<Inventory>,
  giftDay: number,
  today: number,
): { inventory: Inventory; giftDay: number; item: ItemId } | null {
  if (giftDay >= today) return null;
  const item = giftFor(today);
  const inventory = addItem(inv, item);
  return inventory === null ? null : { inventory, giftDay: today, item };
}

/** A saved gift day: a non-negative whole day count, else 0 (never claimed). */
export const cleanGiftDay = (raw: unknown): number =>
  typeof raw === "number" && Number.isInteger(raw) && raw >= 0 ? raw : 0;
