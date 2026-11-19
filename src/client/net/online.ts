// Creates the one `OnlineSession` and keeps it joined to the player's current
// room; everything else in `net/` reaches the server through it.
import { useEffect, useRef } from "react";
import { refreshAccount } from "./account.ts";
import type { Look } from "../../game/look.ts";
import { SOLO_ROOMS, type RoomId } from "../../game/rooms.ts";
import { beforeTravel } from "./party.ts";
import { enterApartment, homeVisit } from "./home.ts";
import type { HomeSave } from "../../game/home/home.ts";
import { onlineSession, joinCopy, startSession } from "./session.ts";

export { ONLINE, onlineSession, joinCopy } from "./session.ts";

/** Keeps the session in the room the player is in, wearing their look; at
 * home, it also keeps the apartment's layout (`home`) current online. */
export function useOnlineRoom(room: RoomId, look: Look, home: HomeSave) {
  const session = onlineSession();
  // the look as of now, for joining; a look change alone never rejoins
  const latestLook = useRef(look);
  const latestHome = useRef(home);
  // a new visit (or the end of one) while in the apartment re-enters it
  const visitingId = homeVisit.use().owner?.id ?? null;
  useEffect(() => {
    latestLook.current = look;
    latestHome.current = home;
  }, [look, home]);
  // join (and rejoin on each room change) once the session has an identity
  useEffect(() => {
    if (!session) return;
    let live = true;
    void (async () => {
      await startSession(session);
      refreshAccount();
      // only the live run takes the friend's copy: StrictMode's first,
      // discarded run must not use it up
      if (!live || !session.identity()) return;
      const copy = joinCopy.room === room ? joinCopy.copy : undefined;
      joinCopy.room = null;
      // still in the old copy: a party leader tells the members where to
      // follow, and a member heading off alone leaves the party
      const partyCopy = await beforeTravel(room);
      if (!live) return;
      // an apartment is its owner's own copy: yours, or a friend's you visit
      if (room === "apartment")
        await enterApartment(latestHome.current, latestLook.current);
      // the cells: nobody else's copy to join
      else if (SOLO_ROOMS.has(room)) session.leaveRoom();
      else await session.joinRoom(room, latestLook.current, partyCopy ?? copy);
    })();
    return () => {
      live = false;
    };
  }, [session, room, visitingId]);
  useEffect(() => {
    session?.setLook(look);
  }, [session, look]);
  // at your own place, every change to the layout (the door, a new chair)
  // goes out to your apartment copy
  useEffect(() => {
    if (room === "apartment" && !homeVisit.get().owner) session?.sendHome(home);
  }, [session, room, home]);
}
