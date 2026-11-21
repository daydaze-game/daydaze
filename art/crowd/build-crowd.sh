#!/usr/bin/env bash
# Builds the crowd people (src/game/crowd.ts) end to end into
# public/models/crowd/: paints their faces with the game's own painter
# (paint-run.ts), bakes each look and pose in Blender (build_crowd.py), then
# compresses each bake (meshopt geometry, WebP texture: 512 px near, 256 far).
# Pass bake names (<look>-<pose>-<tier>), or their starts ("male-d"), to
# build only those. On GitHub: .github/workflows/crowd-bake.yml.
# Needs Blender 5.x, uv (for xatlas in Blender's Python) and Node.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$ROOT/art/crowd"
OUT="$ROOT/public/models/crowd"
cd "$ROOT"

# xatlas charts the UVs; installed for Blender's own Python version
PY="$(blender --background --factory-startup --python-expr \
  'import sys; print("PYVER", "%d.%d" % sys.version_info[:2])' 2>/dev/null |
  sed -n 's/^PYVER //p')"
if ! ls "$HERE/.cache/pylib/"xatlas*.so >/dev/null 2>&1; then
  uv pip install --python-version "$PY" --python-platform x86_64-manylinux_2_28 \
    --only-binary :all: --no-deps --target "$HERE/.cache/pylib" xatlas==0.0.11
fi

node "$HERE/paint-run.ts"
nice -n 19 blender --background --factory-startup --python-exit-code 1 \
  --python "$HERE/build_crowd.py" -- "$@"

mkdir -p "$OUT"
for f in "$HERE"/.cache/out/*.glb; do
  name="$(basename "$f")"
  # only the files named, or starting with an argument ("male-d": all of his)
  if [ $# -gt 0 ]; then
    hit=0
    for a in "$@"; do [[ "$name" == "$a"* ]] && hit=1; done
    [ "$hit" = 1 ] || continue
  fi
  case "$name" in *-near.glb) size=512 ;; *) size=256 ;; esac
  npx -y @gltf-transform/cli@4.5.1 optimize "$f" "$OUT/$name" \
    --compress meshopt --texture-compress webp --texture-size "$size" \
    --simplify false
done
