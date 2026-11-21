// Maps an HTTP method and path to a typed Route for the Worker: the fixed /api
// endpoints (progress and weekly leaderboards included), a room's copy list, a room copy's WebSocket and an apartment's
// (by owner). Unknown rooms, bad copy numbers and bad owner ids match nothing.

import { isPrizeGame, type PrizeGame } from "../../src/game/prizes.ts";
import {
  LADDERS,
  type Ladder,
} from "../../src/game/progression/progression.ts";
import { isRoomId, type RoomId } from "../../src/game/rooms.ts";

/**
 * Every endpoint the Worker serves; rooms and ws carry a validated room id (and
 * copy).
 */
export type Route =
  | {
      kind:
        | "guest"
        | "signup"
        | "login"
        | "logout"
        | "me"
        | "save-get"
        | "save-put"
        | "report"
        | "block"
        | "friend"
        | "unfriend"
        | "friends"
        | "progress"
        | "progress-score"
        | "progress-visit"
        | "progress-title"
        | "admin-ban"
        | "admin-reports";
    }
  | { kind: "rooms"; roomId: RoomId }
  /** This week's best scores in one minigame. */
  | { kind: "board-score"; game: PrizeGame }
  /** This week's XP earned on one ladder. */
  | { kind: "board-ladder"; ladder: Ladder }
  | { kind: "ws"; roomId: RoomId; copy: number }
  /** An apartment copy's socket: the owner's home, by their player id. */
  | { kind: "home"; ownerId: string };

const FIXED = new Map<string, Route>([
  ["POST /api/guest", { kind: "guest" }],
  ["POST /api/signup", { kind: "signup" }],
  ["POST /api/login", { kind: "login" }],
  ["POST /api/logout", { kind: "logout" }],
  ["GET /api/me", { kind: "me" }],
  ["GET /api/save", { kind: "save-get" }],
  ["PUT /api/save", { kind: "save-put" }],
  ["POST /api/report", { kind: "report" }],
  ["POST /api/block", { kind: "block" }],
  ["POST /api/friend", { kind: "friend" }],
  ["POST /api/unfriend", { kind: "unfriend" }],
  ["GET /api/friends", { kind: "friends" }],
  ["GET /api/progress", { kind: "progress" }],
  ["POST /api/progress/score", { kind: "progress-score" }],
  ["POST /api/progress/visit", { kind: "progress-visit" }],
  ["POST /api/progress/title", { kind: "progress-title" }],
  ["POST /api/admin/ban", { kind: "admin-ban" }],
  ["GET /api/admin/reports", { kind: "admin-reports" }],
]);

/** Copies are numbered 1 to 99 ("Downtown #1"). */
export function parseCopy(value: unknown): number | null {
  if (typeof value === "number")
    return Number.isInteger(value) && value >= 1 && value <= 99 ? value : null;
  return typeof value === "string" && /^[1-9]\d?$/.test(value)
    ? Number(value)
    : null;
}

/**
 * The route for a request, or null for an unknown path or a method it doesn't
 * allow. Room routes accept GET only.
 */
export function matchRoute(method: string, pathname: string): Route | null {
  const fixed = FIXED.get(`${method} ${pathname}`);
  if (fixed) return fixed;
  if (method !== "GET") return null;
  const rooms = /^\/api\/rooms\/([^/]+)$/.exec(pathname);
  if (rooms && isRoomId(rooms[1])) return { kind: "rooms", roomId: rooms[1] };
  const score = /^\/api\/leaderboard\/score\/([^/]+)$/.exec(pathname);
  if (score?.[1] && isPrizeGame(score[1]))
    return { kind: "board-score", game: score[1] };
  const ladder = /^\/api\/leaderboard\/ladder\/([^/]+)$/.exec(pathname);
  const found = LADDERS.find((name) => name === ladder?.[1]);
  if (found) return { kind: "board-ladder", ladder: found };
  const ws = /^\/ws\/room\/([^/]+)\/([^/]+)$/.exec(pathname);
  const copy = ws && parseCopy(ws[2]);
  if (ws && copy && isRoomId(ws[1])) return { kind: "ws", roomId: ws[1], copy };
  // player ids are short url-safe strings
  const home = /^\/ws\/home\/([A-Za-z0-9_-]{1,32})$/.exec(pathname);
  if (home?.[1]) return { kind: "home", ownerId: home[1] };
  return null;
}

/**
 * Whether a request's Origin header must be verified. Anything that changes
 * state (non-GET) and every WebSocket upgrade, room or apartment, qualifies:
 * browsers don't apply the same-origin policy to sockets, so without the check
 * any site could open one with the visitor's cookie (cross-site WebSocket
 * hijacking).
 */
export function needsOriginCheck(method: string, route: Route): boolean {
  return method !== "GET" || route.kind === "ws" || route.kind === "home";
}
