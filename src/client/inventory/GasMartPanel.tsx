// The weed counter panel: shown at a gas-station mart's counter (hemp: weak,
// cheap) or at the street dealer's corner (a few strains a day), as measured
// by MartWatch. 18+ only (the shop panel gates itself).

import type { JSX } from "react";
import { DEALER_NAME } from "./MartWatch.tsx";
import { martNear } from "./martNear.ts";
import { WeedShopPanel } from "./WeedShopPanel.tsx";

export function GasMartPanel(): JSX.Element | null {
  const { name, shop } = martNear.use();
  if (!name) return null;
  return (
    <WeedShopPanel
      shop={shop}
      title={name === DEALER_NAME ? name : `${name} counter`}
    />
  );
}
