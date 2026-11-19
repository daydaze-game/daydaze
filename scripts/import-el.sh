#!/usr/bin/env bash
# Builds the El's train cars from Quaternius' Train Pack (CC0), unzipped under $TRAINS.
set -euo pipefail
TMP="$(mktemp -d)"
ELOUT="$(dirname "$0")/../public/models/el"
mkdir -p "$ELOUT"
blender --background --factory-startup --python-exit-code 1 --python "$(dirname "$0")/../art/city/el_train.py" -- "$TMP/el" > /dev/null
for f in train-front train-wagon; do
  npx -y @gltf-transform/cli@4.5.1 optimize "$TMP/el/$f.glb" "$ELOUT/$f.glb" \
    --compress meshopt --simplify false --join false --instance false \
    --flatten false --palette false --prune-attributes false
done
rm -r "$TMP"
