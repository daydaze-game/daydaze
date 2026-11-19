// The dev panel itself, outside the Canvas: live readouts on a draggable
// header, then fold-away sections. Press ` (backquote) to show or hide it;
// where it sits, what is folded and the view switches are remembered.
// Development only; see DevTools.tsx.
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as THREE from "three";
import { cityHour, setDevHour } from "../../city/daylight.ts";
import {
  DEV_EVENTS,
  devStartEvent,
  devStartNight,
} from "../../city/eventClocks.ts";
import {
  netCounts,
  netFrames,
  netLogVersion,
  subscribeNetLog,
} from "../../net/devNetLog.ts";
import { devStartDanceOff } from "../../rooms/pulse/danceOffClock.ts";
import { CLUB_NIGHTS } from "../../../game/events.ts";
import { MINIGAME_IDS, type MinigameId } from "../../../game/hotspots.ts";
import { ROOMS, isRoomId, type RoomId } from "../../../game/rooms.ts";
import {
  clearCamOverride,
  formatCamOverride,
  getCamOverride,
  setCamOverride,
  subscribeCamOverride,
} from "../camOverride.ts";
import { Inspector } from "./Inspector.tsx";
import { RenderSection } from "./RenderSection.tsx";
import { SceneTree } from "./SceneTree.tsx";
import { actions, canvas, devState, patch, useDev } from "./store.ts";
import { Pick, Section, Toggle, formatHour } from "./widgets.tsx";

/** The movement stream (12 Hz out, constant in); hidden from the recent list. */
const NOISY = new Set(["update", "delta"]);

/** Online frames (`?online=1`): counts by type, then the latest few. */
function NetLog() {
  useSyncExternalStore(subscribeNetLog, netLogVersion);
  const counts = [...netCounts()];
  if (counts.length === 0) return null;
  const recent = netFrames()
    .filter((f) => !NOISY.has(f.type))
    .slice(-6);
  return (
    <Section title="network">
      <div>{counts.map(([k, n]) => `${k} ${n}`).join(" · ")}</div>
      {recent.map((f) => (
        <div
          key={`${f.at}-${f.dir}-${f.text.length}-${f.type}`}
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {f.dir === "in" ? "←" : "→"} {f.text}
        </div>
      ))}
    </Section>
  );
}

/** Rooms, games, events, the hour and the teleport. */
function GoSection({
  onGo,
  onGame,
}: {
  onGo: (room: RoomId) => void;
  onGame: (game: MinigameId) => void;
}) {
  // the dev hour pin; null follows ?time= or the real clock
  const [hour, setHour] = useState<number | null>(null);
  return (
    <Section title="go">
      <div>
        <Pick
          label="room"
          options={Object.keys(ROOMS)}
          onPick={(v) => isRoomId(v) && onGo(v)}
        />
        <Pick
          label="game"
          options={MINIGAME_IDS}
          onPick={(v) => {
            const g = MINIGAME_IDS.find((id) => id === v);
            if (g) onGame(g);
          }}
        />
        <Pick
          label="event night"
          options={CLUB_NIGHTS.map((n) => n.id)}
          onPick={devStartNight}
        />
        <Pick
          label="start event"
          options={[...DEV_EVENTS, "dance-off"]}
          onPick={(v) => {
            if (v === "dance-off") devStartDanceOff();
            const e = DEV_EVENTS.find((id) => id === v);
            if (e) devStartEvent(e);
          }}
        />
      </div>
      <div>
        <label>
          hour{" "}
          <input
            type="range"
            min={0}
            max={23.75}
            step={0.25}
            value={hour ?? cityHour()}
            onChange={(e) => {
              const h = Number(e.target.value);
              setHour(h);
              setDevHour(h);
            }}
            style={{ width: 200, verticalAlign: "middle" }}
          />{" "}
          {formatHour(hour ?? cityHour())}
        </label>{" "}
        {hour !== null && (
          <button
            type="button"
            onClick={() => {
              setHour(null);
              setDevHour(null);
            }}
          >
            real clock
          </button>
        )}
      </div>
      <button type="button" onClick={() => actions.teleport?.()}>
        teleport here
      </button>
    </Section>
  );
}

/**
 * Saves the canvas as a PNG. The buffer is cleared after each frame, so this
 * draws one more frame and reads it straight back; that frame skips the high
 * tier's bloom pass (a plain render), so glow looks flatter than on screen.
 */
function screenshot(): void {
  const { scene, gl } = canvas;
  const camera = canvas.camera();
  if (!scene || !gl || !camera) return;
  gl.render(scene, camera);
  gl.domElement.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `daydaze-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, "image/png");
}

/** Where the panel sits while dragged; saved once on release. */
function useDrag(): {
  at: readonly [number, number] | null;
  onPointerDown: (e: ReactPointerEvent) => void;
} {
  const saved = useDev().at;
  const [dragAt, setDragAt] = useState<readonly [number, number] | null>(null);
  const from = useRef<{ x: number; y: number; left: number; top: number }>(
    null,
  );
  const onPointerDown = (e: ReactPointerEvent) => {
    const panel = e.currentTarget.closest("[data-dev-panel]");
    if (!(panel instanceof HTMLElement)) return;
    const r = panel.getBoundingClientRect();
    from.current = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
    let last: readonly [number, number] = [r.left, r.top];
    const move = (ev: PointerEvent) => {
      const f = from.current;
      if (!f) return;
      last = [
        Math.max(0, f.left + ev.clientX - f.x),
        Math.max(0, f.top + ev.clientY - f.y),
      ];
      setDragAt(last);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      from.current = null;
      setDragAt(null);
      patch({ at: last });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return { at: dragAt ?? saved, onPointerDown };
}

/** Coins and the save: hand out money, or dump the save to the console. */
function GameSection({
  coins,
  save,
  onCoins,
}: {
  coins: number;
  save: unknown;
  onCoins: (n: number) => void;
}) {
  return (
    <Section title="game">
      {coins} coins{" "}
      <button type="button" onClick={() => onCoins(100)}>
        +100
      </button>{" "}
      <button type="button" onClick={() => onCoins(1000)}>
        +1000
      </button>{" "}
      <button
        type="button"
        onClick={() => {
          Object.assign(window, { $save: save });
          console.log("[dev] $save =", save);
        }}
      >
        log save as $save
      </button>{" "}
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard
            ?.writeText(JSON.stringify(save, null, 2))
            .catch(() => {});
        }}
      >
        copy save JSON
      </button>
    </Section>
  );
}

/** Runtime overview camera override controls. */
function CamOverrideControl() {
  const [override, setOverride] = useState(() => getCamOverride());
  const [text, setText] = useState(() => formatCamOverride(override));

  useEffect(() => {
    return subscribeCamOverride((shot) => {
      setOverride(shot);
      setText(formatCamOverride(shot));
    });
  }, []);

  const pinCurrent = () => {
    const camera = canvas.camera();
    if (!camera) return;
    const eye = camera.position;
    const dd = (
      window as unknown as {
        __dd?: { get?: () => { controls?: { target?: THREE.Vector3 } } };
      }
    ).__dd;
    const controls = dd?.get?.()?.controls;
    const look = controls?.target ?? new THREE.Vector3(0, 0, 0);
    setCamOverride({ eye, look });
  };

  const submit = () => {
    if (!text.trim()) {
      clearCamOverride();
    } else {
      setCamOverride(text);
    }
  };

  return (
    <div
      style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center" }}
    >
      <label style={{ display: "flex", gap: 4, alignItems: "center", flex: 1 }}>
        <span style={{ color: "#aaa" }}>cam:</span>
        <input
          value={text}
          placeholder="ex,ey,ez,lx,ly,lz"
          style={{
            flex: 1,
            minWidth: 0,
            background: "#111",
            color: "#0f0",
            border: "1px solid #333",
            borderRadius: 3,
            padding: "2px 4px",
            font: "inherit",
          }}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          onBlur={submit}
        />
      </label>
      <button
        type="button"
        onClick={pinCurrent}
        title="Pin current camera framing"
      >
        pin
      </button>
      {override && (
        <button
          type="button"
          onClick={() => clearCamOverride()}
          title="Clear camera override"
        >
          clear
        </button>
      )}
    </div>
  );
}

export function DevPanel({
  onGo,
  onGame,
  save,
  onCoins,
}: {
  onGo: (room: RoomId) => void;
  onGame: (game: MinigameId) => void;
  /** The player's save, for showing and dumping; edits go through onCoins. */
  save: { coins: number };
  onCoins: (n: number) => void;
}) {
  const s = useDev();
  const drag = useDrag();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Backquote") patch({ open: !devState().open });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!s.open) return null;
  return (
    <div
      data-dev-panel
      style={{
        position: "fixed",
        // default top center: the game's HUD owns the corners
        ...(drag.at
          ? { left: drag.at[0], top: drag.at[1] }
          : { top: 8, left: "50%", transform: "translateX(-50%)" }),
        zIndex: 9999,
        maxHeight: "90vh",
        maxWidth: 560,
        overflowY: "auto",
        padding: "6px 10px",
        font: "12px monospace",
        color: "#0f0",
        background: "rgba(0,0,0,0.75)",
        borderRadius: 6,
      }}
    >
      <div
        onPointerDown={drag.onPointerDown}
        title="drag to move; ` hides"
        style={{ cursor: "move", userSelect: "none" }}
      >
        <div>
          {s.fps} fps · {s.calls} calls · {(s.triangles / 1000).toFixed(0)}k
          tris
          {drag.at && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => patch({ at: null })}
              style={{ marginLeft: 8 }}
            >
              re-center
            </button>
          )}
        </div>
        <div>cam {s.camera}</div>
        <div>
          {s.geometries} geo · {s.textures} tex · {s.lights} lights ·{" "}
          {s.objects} objects
        </div>
      </div>
      <GoSection onGo={onGo} onGame={onGame} />
      <Section title="view">
        <Toggle name="wireframe" label="wireframe" />
        <Toggle name="freeCam" label="free cam" />
        <Toggle name="helpers" label="grid + axes" />
        <Toggle name="halfRes" label="half res" />
        <Toggle name="paused" label="pause" />
        <button type="button" onClick={screenshot}>
          screenshot
        </button>
        <CamOverrideControl />
      </Section>
      <GameSection coins={save.coins} save={save} onCoins={onCoins} />
      <RenderSection />
      <SceneTree />
      <Inspector />
      <NetLog />
    </div>
  );
}
