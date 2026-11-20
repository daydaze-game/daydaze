// Which weed counter the player stands at (a gas-station mart's, or the street
// dealer's corner), shared by the scene (which measures it) and the overlay's
// shop panel. `name` is empty when none.
import type { Shop } from "../../game/inventory.ts";
import { createStore } from "../rooms/shared/store.ts";

const none: { name: string; shop: Shop } = { name: "", shop: "gas" };

export const martNear = createStore(none);

/** The street dealer's counter name (a gas station's is its own name). */
export const DEALER_NAME = "Street dealer";
