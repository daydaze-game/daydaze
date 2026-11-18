// The gas-station counter: shown at a mart's counter on foot (MartWatch), it
// sells hemp: weak, cheap weed. 18+ only (the shop panel gates itself).

import type { JSX } from "react";
import { martNear } from "./martNear.ts";
import { WeedShopPanel } from "./WeedShopPanel.tsx";

export function GasMartPanel(): JSX.Element | null {
  const { name } = martNear.use();
  return name ? <WeedShopPanel shop="gas" title={`${name} counter`} /> : null;
}
