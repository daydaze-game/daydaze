// The food the local doll holds, and the delivery orders in flight. In memory
// only, like the buzz: a reload empties the tray and cancels the couriers.
import {
  isDelivered,
  placeOrder,
  type Order,
} from "../../game/food/delivery.ts";
import { menuItemById, type MenuItem } from "../../game/food/venues.ts";
import { drink, relieve, setSoftDrinkListener } from "../effects/drunk.ts";
import { activeTier, allows } from "../../game/age.ts";
import { FELT } from "../../game/effects/substances.ts";
import {
  freshNeeds,
  satisfyNeed,
  stepNeeds,
  type Needs,
} from "../../game/food/needs.ts";
import { getMeters } from "../effects/high.ts";

export type FoodState = {
  held: MenuItem | null;
  orders: readonly Order[];
  /** The courier's last news, read by the live region, or null. */
  toast: string | null;
  needs: Needs;
};

let state: FoodState = {
  held: null,
  orders: [],
  toast: null,
  needs: freshNeeds(),
};
const listeners = new Set<() => void>();

function set(next: FoodState): void {
  state = next;
  for (const listen of listeners) listen();
}

export function getFoodState(): FoodState {
  return state;
}

export function onFoodChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Hands the doll a menu item to hold; a held item is replaced. */
export function holdItem(item: MenuItem): void {
  set({ ...state, held: item, toast: null });
}

/** Eats or sips the held item and empties the tray; 18+ alcohol raises the buzz. */
export function eatHeld(): void {
  const held = state.held;
  if (!held) return;
  if (held.alcohol) drink(held.alcohol);
  else consumeFood(held.kind);
  set({ ...state, held: null });
}

/** Shared by held food, quick snacks/water, street food and vending drinks.
 * Keeps the existing food/hangover relief; never changes the high meter. */
export function consumeFood(kind: "food" | "drink"): void {
  relieve(kind);
  if (!allows(activeTier(), "drugs")) return;
  const need = kind === "food" ? state.needs.hunger : state.needs.thirst;
  const feelsBetter = getMeters().high.level >= FELT && need > 0;
  set({
    ...state,
    needs: satisfyNeed(state.needs, kind),
    toast: feelsBetter
      ? kind === "food"
        ? "That snack really hit the spot."
        : "A cool drink feels extra refreshing."
      : state.toast,
  });
}

/** Called on the food HUD's timer, not inside the rendering loop. */
export function tickNeeds(seconds: number): void {
  const needs = stepNeeds(
    state.needs,
    getMeters().high.level,
    seconds,
    allows(activeTier(), "drugs"),
  );
  if (
    needs.hunger !== state.needs.hunger ||
    needs.thirst !== state.needs.thirst
  )
    set({ ...state, needs });
}

/** Places an order for a menu item; unknown items are ignored. */
export function orderItem(itemId: string, now: number): void {
  const order = placeOrder(itemId, now);
  if (!order) return;
  set({ ...state, orders: [...state.orders, order] });
}

/** Lands every due courier: the item goes in the doll's hands, with a toast. */
export function tickDeliveries(now: number): void {
  const due = state.orders.filter((order) => isDelivered(order, now));
  if (due.length === 0) return;
  let held = state.held;
  let toast = state.toast;
  for (const order of due) {
    const found = menuItemById(order.itemId);
    if (!found) continue;
    held = found.item;
    toast = `The courier dropped off ${found.item.name}.`;
  }
  set({
    ...state,
    held,
    toast,
    orders: state.orders.filter((order) => !due.includes(order)),
  });
}

export function clearToast(): void {
  if (state.toast !== null) set({ ...state, toast: null });
}

export function resetFood(): void {
  set({ held: null, orders: [], toast: null, needs: freshNeeds() });
}

// Mocktail names a 13+ player is served, in turn.
const MOCKTAILS = [
  "a Starlight Fizz",
  "a Violet Lemonade",
  "a Sunset Berry Fizz, zero percent",
  "a Mango Mint Cooler",
  "a Cherry Cream Soda",
] as const;
let served = 0;

/** A 13+ bar's drink: a mocktail toast (no buzz). */
export function sipMocktail(): void {
  set({
    ...state,
    toast: `You sip ${MOCKTAILS[served++ % MOCKTAILS.length]}.`,
  });
}
setSoftDrinkListener(sipMocktail);
