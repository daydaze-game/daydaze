// Measures, once a frame, whether the player stands at a weed counter on foot
// (a gas-station mart's, or the street dealer's corner; not driving or seated)
// and tells the shop panel. Allocates nothing per frame (counterAt walks a
// prebuilt list).

import { useFrame } from "@react-three/fiber";
import { useEffect, type JSX } from "react";
import { dealerNear } from "../../game/city/dealer.ts";
import { counterAt } from "../../game/city/gasStations.ts";
import { driving } from "../world/driving.ts";
import type { Player } from "../world/PlayerController.tsx";
import { DEALER_NAME, martNear } from "./martNear.ts";

export function MartWatch({ player }: { player: Player }): JSX.Element | null {
  useEffect(() => () => martNear.set({ name: "" }), []);
  useFrame(() => {
    const walking = !player.seat && !driving.session && !driving.passenger;
    const { x, z } = player.pos;
    const station = walking ? counterAt(x, z) : null;
    const dealer = walking && dealerNear(x, z);
    const name = station ? station.name : dealer ? DEALER_NAME : "";
    const shop = dealer && !station ? "street" : "gas";
    const now = martNear.get();
    if (name !== now.name || shop !== now.shop) martNear.set({ name, shop });
  });
  return null;
}
