// Measures, once a frame, whether the player stands at a gas-station mart
// counter (on foot, not driving or seated) and tells the counter panel.
// Allocates nothing per frame (counterAt walks a prebuilt list).

import { useFrame } from "@react-three/fiber";
import { useEffect, type JSX } from "react";
import { counterAt } from "../../game/city/gasStations.ts";
import { driving } from "../world/driving.ts";
import type { Player } from "../world/PlayerController.tsx";
import { martNear } from "./martNear.ts";

export function MartWatch({ player }: { player: Player }): JSX.Element | null {
  useEffect(() => () => martNear.set({ name: "" }), []);
  useFrame(() => {
    const station =
      !player.seat && !driving.session && !driving.passenger
        ? counterAt(player.pos.x, player.pos.z)
        : null;
    const name = station ? station.name : "";
    if (name !== martNear.get().name) martNear.set({ name });
  });
  return null;
}
