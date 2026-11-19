// Load the vending menu only near a machine; most visits never need it.
import { lazy, Suspense, type JSX } from "react";
import { vendingNear } from "./vendingNear.ts";

const VendingMenu = lazy(() =>
  import("./VendingMenu.tsx").then((m) => ({ default: m.VendingMenu })),
);

export function VendingPanel({
  coins,
  onSpend,
}: {
  coins: number;
  onSpend: (price: number) => boolean;
}): JSX.Element | null {
  const { near } = vendingNear.use();
  return !near ? null : (
    <Suspense fallback={null}>
      <VendingMenu coins={coins} onSpend={onSpend} />
    </Suspense>
  );
}
