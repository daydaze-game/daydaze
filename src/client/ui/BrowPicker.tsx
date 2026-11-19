// Eyebrow silhouettes use the same curves as the character's painted brows.
import { BROW_DESIGNS, browRise, type BrowDesign } from "../../game/brows.ts";
import { BROWS, type Look } from "../../game/look.ts";
import { onRadioKeyDown } from "./controls.tsx";

function outline(brow: BrowDesign): string {
  const edge = (t: number, side: number) => {
    const x = 10 + t * 100;
    const y = 34 - (browRise(brow, t) - 0.03) * 500;
    const width = brow.thickness * (1 - 0.65 * t) * 250;
    return `${x.toFixed(2)},${(y + side * width).toFixed(2)}`;
  };
  const top = Array.from({ length: 41 }, (_, i) => edge(i / 40, -1));
  const bottom = Array.from({ length: 41 }, (_, i) => edge((40 - i) / 40, 1));
  return `M${top.join(" L")} L${bottom.join(" L")} Z`;
}

const previews = BROWS.map((option) => ({
  ...option,
  path: outline(BROW_DESIGNS[option.id]),
  color: BROW_DESIGNS[option.id].color,
}));

export function BrowPicker({
  value,
  color,
  onPick,
}: {
  value: Look["brows"];
  color?: string | undefined;
  onPick: (brows: Look["brows"]) => void;
}) {
  const selectedIndex = BROWS.findIndex((o) => o.id === value);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  return (
    <div className="tiles brow-options" role="radiogroup" aria-label="Brows">
      {previews.map((option, idx) => (
        <button
          type="button"
          role="radio"
          tabIndex={idx === activeIndex ? 0 : -1}
          aria-checked={value === option.id}
          className="tile"
          key={option.id}
          onClick={() => onPick(option.id)}
          onKeyDown={(e) => onRadioKeyDown(e, BROWS, idx, onPick)}
        >
          <svg viewBox="0 0 120 48" aria-hidden="true">
            <path d={option.path} fill={color ?? option.color} />
          </svg>
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
