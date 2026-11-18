// The carried pouch: a toggle that opens the list of what she holds, with a
// "Use" button per item. 18+ only, and only when the pouch is not empty.

import { useState, type JSX } from "react";
import { activeTier } from "../../game/age.ts";
import { ITEMS, totalOf, usable } from "../../game/inventory.ts";
import { pouchDesk, takeFromPouch } from "./pouchDesk.ts";

export function PouchPanel(): JSX.Element | null {
  const { inventory, note } = pouchDesk.use();
  const [open, setOpen] = useState(false);
  if (!usable(activeTier(), inventory)) return null;
  return (
    <section className="game-panel" aria-label="Pouch" data-pouch="open">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Pouch ({totalOf(inventory)})
      </button>
      {note && <p role="status">{note}</p>}
      {open && (
        <div className="game-row">
          {ITEMS.filter((i) => (inventory[i.id] ?? 0) > 0).map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => takeFromPouch(i.id)}
            >
              Use {i.name} ({inventory[i.id]})
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
