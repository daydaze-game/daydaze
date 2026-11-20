// The game menu: one button in the dock that opens a sheet holding every
// control you reach for now and then (sound, photo, map, phone, collections,
// friends, invite, skates, your car's options, mood, camera and graphics). The screen
// itself keeps only the place, your coins, chat, the dressing room and what
// the moment needs (a drink at the bar, a seat, a game). The sheet closes on
// Escape, on the Close button, and after an item that opens something else.

import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import type { Graphics } from "../../game/graphics.ts";
import { createStore } from "../rooms/shared/store.ts";

// the graphics sheet and its option tables are only needed once it is opened
const GraphicsPanel = lazy(() =>
  import("./GraphicsPanel.tsx").then((m) => ({ default: m.GraphicsPanel })),
);

// the credits ledger is 50 KB of text nobody needs until they open it
const CreditsPanel = lazy(() =>
  import("./CreditsPanel.tsx").then((m) => ({ default: m.CreditsPanel })),
);

export const gameMenu = createStore({ open: false });

/** Closes the menu: for items that open a panel of their own. */
export const closeMenu = () => gameMenu.set({ open: false });

export function GameMenu({
  children,
  graphics,
  setGraphics,
}: {
  children: ReactNode;
  graphics: Graphics;
  setGraphics: (graphics: Graphics) => void;
}): JSX.Element {
  const { open } = gameMenu.use();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [graphicsOpen, setGraphicsOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closeMenu();
      toggle.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button
        ref={toggle}
        type="button"
        className="menu-open"
        aria-expanded={open}
        aria-controls="game-menu"
        onClick={() => gameMenu.set({ open: !open })}
      >
        Menu
      </button>
      {open && (
        <section
          id="game-menu"
          className="game-menu"
          role="dialog"
          aria-label="Menu"
        >
          <div className="game-menu-head">
            <h2>Menu</h2>
            <button type="button" aria-label="Close menu" onClick={closeMenu}>
              Close
            </button>
          </div>
          {children}
          <div className="game-menu-items">
            <button
              type="button"
              className="drink"
              aria-haspopup="dialog"
              onClick={() => {
                closeMenu();
                setGraphicsOpen(true);
              }}
            >
              Graphics
            </button>
            <button
              type="button"
              className="drink"
              aria-haspopup="dialog"
              onClick={() => {
                closeMenu();
                setCreditsOpen(true);
              }}
            >
              Credits
            </button>
          </div>
        </section>
      )}
      {graphicsOpen && (
        <Suspense fallback={null}>
          <GraphicsPanel
            graphics={graphics}
            onChange={setGraphics}
            onClose={() => {
              setGraphicsOpen(false);
              toggle.current?.focus();
            }}
          />
        </Suspense>
      )}
      {creditsOpen && (
        <Suspense fallback={null}>
          <CreditsPanel
            onClose={() => {
              setCreditsOpen(false);
              toggle.current?.focus();
            }}
          />
        </Suspense>
      )}
    </>
  );
}
