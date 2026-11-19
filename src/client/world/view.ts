// Camera view framing modes for the player doll and rooms.

/** `detail` is only reachable with `?view=detail`, for close-up screenshots. */
export type View = "room" | "full" | "face" | "detail";

export const VIEW_IDS: readonly View[] = ["room", "full", "face", "detail"];
