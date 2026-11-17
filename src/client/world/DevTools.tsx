// Dev-only tools for poking around the game, built from the files in ./dev/:
// the panel (DevPanel, outside the Canvas) and its probe inside the Canvas
// (DevProbe). Press ` (backquote) to show or hide the panel. Every call site
// is gated on import.meta.env.DEV, so production builds drop all of it.
export { DevPanel } from "./dev/DevPanel.tsx";
export { DevProbe } from "./dev/DevProbe.tsx";
export { useFreeCam } from "./dev/store.ts";
