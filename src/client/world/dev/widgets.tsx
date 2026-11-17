// Small building blocks for the dev panel: a fold-away section, a dropdown
// that fires on choosing, and the hour format. Development only.
import type { ReactNode } from "react";
import { devState, patch, useDev } from "./store.ts";

/** 21.5 as "21:30". */
export function formatHour(h: number): string {
  const m = Math.round(h * 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** A titled block that folds shut on a click; folded titles are remembered. */
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { closed } = useDev();
  const open = !closed.includes(title);
  return (
    <section style={{ marginTop: 4 }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          const now = devState().closed;
          patch({
            closed: open ? [...now, title] : now.filter((t) => t !== title),
          });
        }}
        style={{
          all: "unset",
          cursor: "pointer",
          color: "#8f8",
          fontWeight: "bold",
        }}
      >
        {open ? "▾" : "▸"} {title}
      </button>
      {open && <div style={{ paddingLeft: 12 }}>{children}</div>}
    </section>
  );
}

/** A dropdown that fires on choosing, then resets to its label. */
export function Pick({
  label,
  options,
  onPick,
}: {
  label: string;
  options: readonly string[];
  onPick: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value=""
      onChange={(e) => onPick(e.target.value)}
      style={{ marginRight: 8, maxWidth: 110 }}
    >
      <option value="">{label}…</option>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

/** A checkbox bound to one of the panel's boolean switches. */
export function Toggle({
  name,
  label,
}: {
  name: "wireframe" | "freeCam" | "helpers" | "halfRes" | "paused";
  label: string;
}) {
  const s = useDev();
  return (
    <label style={{ marginRight: 8 }}>
      <input
        type="checkbox"
        checked={s[name]}
        onChange={(e) => patch({ [name]: e.target.checked })}
      />{" "}
      {label}
    </label>
  );
}
