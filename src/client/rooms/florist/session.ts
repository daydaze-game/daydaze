// Petal & Stem's shared state. The counter draft lives here; the saved
// bouquet and the coins live in the app's save: App mirrors them into
// floristDesk and installs `commit`, which writes a new pair back (the panel
// never touches storage itself).
import {
  addStem,
  buyBouquet,
  emptyBouquet,
  removeLastStem,
  STEMS,
  type Bouquet,
  type Stem,
} from "../../../game/florist.ts";
import { createStore } from "../shared/store.ts";

/** Every stem id, in the catalog's order (a guard, since keys are strings). */
export const STEM_IDS: Stem[] = Object.keys(STEMS).filter(
  (k): k is Stem => k in STEMS,
);

type FloristCoins = { coins: number; bouquet: Bouquet | null };

/** The saved bouquet (the one in the vase at home) and the coins. */
export const floristDesk = createStore<{
  bouquet: Bouquet | null;
  coins: number;
  commit: ((next: FloristCoins) => void) | null;
}>({
  bouquet: null,
  coins: 0,
  commit: null,
});

type CounterStatus = "idle" | "bought" | "broke";
// A function, not a const: a typed const would narrow back to its literal.
const startStatus = (): CounterStatus => "idle";

/** The bouquet being built at the counter, and how the last purchase went. */
export const counter = createStore({
  draft: emptyBouquet(),
  status: startStatus(),
});

export function pickStem(stem: Stem) {
  counter.set({ draft: addStem(counter.get().draft, stem), status: "idle" });
}
export function undoStem() {
  counter.set({ draft: removeLastStem(counter.get().draft), status: "idle" });
}
export function setWrap(wrap: Bouquet["wrap"]) {
  counter.set({ draft: { ...counter.get().draft, wrap } });
}
export function setRibbon(ribbon: Bouquet["ribbon"]) {
  counter.set({ draft: { ...counter.get().draft, ribbon } });
}
export function clearCounter() {
  counter.set({ draft: emptyBouquet(), status: "idle" });
}

/** Pays for the draft and sends it home; false when it is incomplete or too dear. */
export function buyDraft(): boolean {
  const { draft } = counter.get();
  const desk = floristDesk.get();
  const coins = buyBouquet(desk.coins, draft);
  if (coins === null) {
    counter.set({ status: "broke" });
    return false;
  }
  const next = { coins, bouquet: draft };
  floristDesk.set(next);
  desk.commit?.(next);
  counter.set({ draft: emptyBouquet(), status: "bought" });
  return true;
}
