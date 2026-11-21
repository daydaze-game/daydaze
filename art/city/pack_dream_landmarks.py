"""Compress converted landmark GLBs and generate exact runtime cost/receipt files.

Run convert_dream_landmarks.py first, then:
    nice -n 19 python art/city/pack_dream_landmarks.py /tmp/dream-landmarks
Requires the pinned glTF Transform CLI; six sequential bounded transforms keep
local CPU use modest. No source assets are modified and no provider APIs run.
"""

import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
RAW = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/dream-landmarks")
DEST = ROOT / "public/models/city-dream"
metadata = json.loads((RAW / "metadata.json").read_text())
costs = {}
for key in metadata:
    costs[key] = {}
    for low in (False, True):
        filename = key + ("-lo" if low else "") + ".glb"
        output = DEST / filename
        subprocess.run(["nice", "-n", "19", "npx", "-y", "@gltf-transform/cli@4.5.1", "optimize", str(RAW / filename), str(output), "--compress", "meshopt", "--simplify", "false", "--texture-compress", "webp", "--texture-size", "512" if low else "1024", "--flatten", "false", "--palette", "false", "--prune-attributes", "false", "--join", "false", "--instance", "false"], cwd=ROOT, check=True)
        data = output.read_bytes()
        document = json.loads(data[20:20 + struct.unpack_from("<I", data, 12)[0]])
        primitives = [p for mesh in document["meshes"] for p in mesh["primitives"]]
        tris = sum(document["accessors"][p["indices"]]["count"] // 3 for p in primitives)
        for p in primitives:
            assert "TEXCOORD_0" in p["attributes"] and "NORMAL" in p["attributes"]
        assert len(data) <= 2_000_000, (filename, "download budget exceeded")
        entry = metadata[key]["far" if low else "near"]
        assert entry["tris"] == tris, (filename, "compression changed geometry")
        entry.update({"file": "/models/city-dream/" + filename, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "textureSize": 512 if low else 1024, "textureCodec": "WebP", "geometryCodec": "meshopt"})
        costs[key]["lo" if low else "tris"] = tris
        costs[key]["loParts" if low else "parts"] = len(primitives)
        subprocess.run(["nice", "-n", "19", "npx", "-y", "@gltf-transform/cli@4.5.1", "validate", str(output)], cwd=ROOT, check=True)
(DEST / "landmarks.generated.json").write_text(json.dumps(metadata, indent=2) + "\n")
(ROOT / "src/game/city/dreamLandmarkCosts.generated.ts").write_text("/** Exact optimized landmark costs from art/city/pack_dream_landmarks.py. */\nexport const DREAM_LANDMARK_COST = " + json.dumps(costs, indent=2) + " as const;\n")
print("LANDMARK COSTS", json.dumps(costs), flush=True)
