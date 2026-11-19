// Creates and holds the singleton OnlineSession.
import type { RoomId } from "../../game/rooms.ts";
import { createApi } from "../../net/client/api.ts";
import { OnlineSession } from "../../net/client/OnlineSession.ts";
import { WebSocketTransport } from "../../net/client/WebSocketTransport.ts";
import { loggedWebSocket } from "./devNetLog.ts";
import { readFlags } from "../flags.ts";

/** An invite link (`?join=room.copy`), which also switches online play on. */
const invite =
  typeof location === "undefined" ? null : readFlags(location.search).join;

export const ONLINE =
  invite !== null ||
  (typeof location !== "undefined" &&
    new URLSearchParams(location.search).get("online") === "1");

let shared: OnlineSession | null = null;
let started: Promise<unknown> | null = null;

/** The one online session, made on first use; null when offline. */
export function onlineSession(): OnlineSession | null {
  if (!ONLINE) return null;
  shared ??= new OnlineSession({
    api: createApi({ fetch: (url, init) => fetch(url, init) }),
    wsBaseUrl: location.origin.replace(/^http/, "ws"),
    // in development every frame also lands in the dev panel's network log
    openTransport: (url) =>
      new WebSocketTransport({
        url,
        WebSocket: import.meta.env.DEV ? loggedWebSocket() : WebSocket,
      }),
  });
  return shared;
}

export function startSession(session: OnlineSession): Promise<unknown> {
  started ??= session.start();
  return started;
}

/** Going to a friend: join their copy of that room when we get there. An
 * invite link sets it before the first join. */
export const joinCopy: { room: RoomId | null; copy: number } = {
  room: invite?.room ?? null,
  copy: invite?.copy ?? 1,
};
