// The street dealer on her Downtown corner (game/city/dealer.ts): an ordinary
// pedestrian-looking doll who chats like anyone at 13+; her shop only opens
// at 18+ (inventory/MartWatch + GasMartPanel). Drawn only when the player is
// within range, since a talking doll is a costly figure.

import { useFrame } from "@react-three/fiber";
import { Suspense, useRef, useState, type JSX } from "react";
import { DEALER_AT } from "../../game/city/dealer.ts";
import { DEFAULT_LOOK, type Look } from "../../game/look.ts";
import type { Player } from "../world/PlayerController.tsx";
import { TalkingNpc } from "../rooms/shared/TalkingNpc.tsx";

/** Meters from which she is drawn. */
const DRAW_RANGE = 42;

const LOOK: Look = {
  ...DEFAULT_LOOK,
  hairStyle: "braids",
  outfit: "jeans",
  outfitColor: "#3d4a5c",
};

export function StreetDealer({
  player,
}: {
  player: Player;
}): JSX.Element | null {
  const [drawn, setDrawn] = useState(false);
  const was = useRef(false);
  useFrame(() => {
    const near =
      Math.hypot(player.pos.x - DEALER_AT[0], player.pos.z - DEALER_AT[1]) <=
      DRAW_RANGE;
    if (near === was.current) return;
    was.current = near;
    setDrawn(near);
  });
  if (!drawn) return null;
  return (
    <Suspense fallback={null}>
      <TalkingNpc
        name="Dex"
        role="dealer"
        look={LOOK}
        mood="idle"
        at={[DEALER_AT[0], 0, DEALER_AT[1]]}
        rot={Math.PI}
        seed={1700}
        context={{ neighborhood: "downtown" }}
      />
    </Suspense>
  );
}
