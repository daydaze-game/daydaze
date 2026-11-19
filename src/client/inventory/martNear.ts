// Which gas-station mart counter the player stands at, shared by the scene
// (which measures it) and the overlay's counter panel. Empty when none.
import { createStore } from "../rooms/shared/store.ts";

export const martNear = createStore({ name: "" });
