// The dev panel's scene tree: the live scene graph, folded by default, with a
// search over names and types. Clicking a row selects that object for the
// inspector (and outlines it). Development only.
import { useState } from "react";
import type * as THREE from "three";
import { searchScene } from "./sceneUtil.ts";
import { canvas, patch, useDev } from "./store.ts";
import { Section } from "./widgets.tsx";

/** Rows shown under one node, or as search hits, before "+N more". */
const ROW_LIMIT = 80;

const label = (o: THREE.Object3D) =>
  o.name ? `${o.name} (${o.type})` : o.type;

function Row({
  object,
  depth,
  open,
  onToggle,
}: {
  object: THREE.Object3D;
  depth: number;
  open: boolean | null;
  onToggle: () => void;
}) {
  const { selection } = useDev();
  const selected = selection?.object === object;
  return (
    <div
      style={{
        paddingLeft: depth * 10,
        whiteSpace: "nowrap",
        color: selected ? "#ff0" : object.visible ? undefined : "#777",
      }}
    >
      <button
        type="button"
        aria-label={open ? "fold" : "unfold"}
        onClick={onToggle}
        disabled={open === null}
        style={{ all: "unset", cursor: "pointer", width: 12 }}
      >
        {open === null ? " " : open ? "▾" : "▸"}
      </button>
      <button
        type="button"
        onClick={() => patch({ selection: { object, instanceId: null } })}
        style={{ all: "unset", cursor: "pointer" }}
      >
        {label(object)}
        {object.children.length > 0 && ` [${object.children.length}]`}
      </button>
    </div>
  );
}

function Branch({
  object,
  depth,
  expanded,
  toggle,
}: {
  object: THREE.Object3D;
  depth: number;
  expanded: ReadonlySet<string>;
  toggle: (id: string) => void;
}) {
  const open = expanded.has(object.uuid);
  const kids = object.children;
  return (
    <>
      <Row
        object={object}
        depth={depth}
        open={kids.length === 0 ? null : open}
        onToggle={() => toggle(object.uuid)}
      />
      {open &&
        kids
          .slice(0, ROW_LIMIT)
          .map((k) => (
            <Branch
              key={k.uuid}
              object={k}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
            />
          ))}
      {open && kids.length > ROW_LIMIT && (
        <div style={{ paddingLeft: (depth + 1) * 10, color: "#999" }}>
          +{kids.length - ROW_LIMIT} more (search to narrow)
        </div>
      )}
    </>
  );
}

export function SceneTree() {
  // re-reads the live scene on every stats tick
  useDev();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((now) => {
      const next = new Set(now);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const scene = canvas.scene;
  return (
    <Section title="scene">
      <input
        type="search"
        aria-label="search the scene"
        placeholder="search names and types"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: 220 }}
      />
      <div style={{ maxHeight: 260, overflowY: "auto", marginTop: 4 }}>
        {!scene ? null : query.trim() ? (
          <SearchHits scene={scene} query={query.trim()} />
        ) : (
          scene.children.map((k) => (
            <Branch
              key={k.uuid}
              object={k}
              depth={0}
              expanded={expanded}
              toggle={toggle}
            />
          ))
        )}
      </div>
    </Section>
  );
}

function SearchHits({ scene, query }: { scene: THREE.Scene; query: string }) {
  const { hits, total } = searchScene(scene, query, ROW_LIMIT);
  return (
    <>
      {hits.map((o) => (
        <Row
          key={o.uuid}
          object={o}
          depth={0}
          open={null}
          onToggle={() => {}}
        />
      ))}
      <div style={{ color: "#999" }}>
        {total} match{total === 1 ? "" : "es"}
        {total > hits.length && `, first ${hits.length} shown`}
      </div>
    </>
  );
}
