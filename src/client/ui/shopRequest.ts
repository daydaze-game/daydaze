// Which shop's counter is open: a clerk's tap opens it and the shop panel
// closes it.
import type { ShopId } from "../../game/shop.ts";
import { createStore } from "../rooms/shared/store.ts";

/** Which shop's counter is open: a clerk's tap opens it, the panel closes it. */
export const shopRequest = createStore<{ open: ShopId | null; name: string }>({
  open: null,
  name: "",
});

export function openShop(open: ShopId, name: string) {
  shopRequest.set({ open, name });
}

export function closeShop() {
  shopRequest.set({ open: null, name: "" });
}
