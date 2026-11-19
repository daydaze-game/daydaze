// Which weed counter the player stands at (a gas-station mart's, or the street
// dealer's corner), shared by the scene (which measures it) and the overlay's
// shop panel. `name` is empty when none.
import type { Shop } from "../../game/inventory.ts";
import { createStore } from "../rooms/shared/store.ts";

export const DEALER_NAME = "Street dealer";

const none: { name: string; shop: Shop } = { name: "", shop: "gas" };

export const martNear = createStore(none);
