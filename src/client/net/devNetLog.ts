// Development only: a log of every WebSocket frame the online session sends
// and receives, for the dev panel (DevTools.tsx) and the console
// (`__ddNet`). online.ts swaps in loggedWebSocket() when import.meta.env.DEV,
// so nothing here runs in production and src/net/ stays untouched.

/** One frame, newest last. `type` is the protocol message type if it has one. */
export type NetFrame = {
  dir: "in" | "out";
  type: string;
  at: number;
  text: string;
};

/** How many frames to keep; `update` goes out at 12 Hz, so this is seconds. */
const KEEP = 300;

const frames: NetFrame[] = [];
/** Frames seen per direction and type since the page loaded. */
const counts = new Map<string, number>();
let version = 0;
const listeners = new Set<() => void>();

/** The message type of a JSON frame, or a placeholder for anything else. */
export function frameType(text: string): string {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "type" in parsed &&
      typeof parsed.type === "string"
    ) {
      return parsed.type;
    }
  } catch {
    // not JSON: fall through
  }
  return "(raw)";
}

function record(dir: "in" | "out", data: unknown): void {
  const text = typeof data === "string" ? data : `<${typeof data}>`;
  const type = frameType(text);
  frames.push({ dir, type, at: Date.now(), text });
  if (frames.length > KEEP) frames.splice(0, frames.length - KEEP);
  const key = `${dir} ${type}`;
  counts.set(key, (counts.get(key) ?? 0) + 1);
  version++;
  for (const fn of listeners) fn();
}

/** For useSyncExternalStore: changes whenever a frame is logged. */
export const netLogVersion = () => version;
export function subscribeNetLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const netFrames = (): readonly NetFrame[] => frames;
export const netCounts = (): ReadonlyMap<string, number> => counts;

let logged: typeof WebSocket | null = null;

/** A WebSocket that logs its frames, made on first use (browsers only). */
export function loggedWebSocket(): typeof WebSocket {
  Object.assign(window, { __ddNet: frames });
  logged ??= class LoggedWebSocket extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      this.addEventListener("message", (e) => record("in", e.data));
    }
    override send(data: Parameters<WebSocket["send"]>[0]): void {
      record("out", data);
      super.send(data);
    }
  };
  return logged;
}
