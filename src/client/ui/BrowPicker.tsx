// Eyebrow silhouettes use the same curves as the character's painted brows.
import { BROW_DESIGNS, browRise, type BrowDesign } from "../../game/brows.ts";
import { BROWS, type Look } from "../../game/look.ts";

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
  onPick,
}: {
  value: Look["brows"];
  onPick: (brows: Look["brows"]) => void;
}) {
  return (
    <div className="tiles brow-options" role="radiogroup" aria-label="Brows">
      {previews.map((option) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === option.id}
          className="tile"
          key={option.id}
          onClick={() => onPick(option.id)}
        >
          <svg viewBox="0 0 120 48" aria-hidden="true">
            <path d={option.path} fill={option.color} />
          </svg>
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
