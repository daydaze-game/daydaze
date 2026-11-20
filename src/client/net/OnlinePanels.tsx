// Everything over the world that only exists online: another player's card,
// and the invites for duels, dances, cook-offs, parties, rides and races, and
// the connection note. App loads this module only with online play on, so an
// offline visit never downloads it.
import type { RoomId } from "../../game/rooms.ts";
import { ConnectionNote } from "./ConnectionNote.tsx";
import { CookOffInvite } from "./CookOffInvite.tsx";
import { DuelPanel } from "./DuelPanel.tsx";
import { PartyPanel } from "./PartyPanel.tsx";
import { PeerCard } from "./PeerCard.tsx";
import { RacePanel } from "./RacePanel.tsx";
import { RidePanel } from "./RidePanel.tsx";
import { TogetherPanel } from "./TogetherPanel.tsx";

/** The online-only panels; `onGo` follows the party leader to a room. */
export function OnlinePanels({ onGo }: { onGo: (room: RoomId) => void }) {
  return (
    <>
      <PeerCard />
      <DuelPanel />
      <TogetherPanel />
      <CookOffInvite />
      <PartyPanel onGo={onGo} />
      <RidePanel />
      <RacePanel />
      <ConnectionNote />
    </>
  );
}
