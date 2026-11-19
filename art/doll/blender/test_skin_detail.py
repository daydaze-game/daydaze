"""Self-check for skin_detail.draw: the nearest surface owns each atlas texel.

    blender --background --factory-startup --python-exit-code 1 --python art/doll/blender/test_skin_detail.py

The face atlas is a planar projection, so hidden eye-socket and mouth-interior
faces share texels with the visible lids and lips. A neutral front quad covers
the atlas; a red quad farther back (larger Blender Y) covers an under-eye patch.
Drawn in either order, the patch and a forehead texel must stay neutral.
"""

import importlib
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
skin_detail = importlib.import_module("skin_detail")

SIZE = 64
NEUTRAL = np.full((1, 1, 4), .5, dtype=np.float32)
RED = np.array([[[.6, .1, .2, 1]]], dtype=np.float32)


def quad(x0, y0, x1, y1, z, pixels):
    """Two triangles covering a pixel rectangle at depth z, one solid color."""
    corners = np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], dtype=float)
    return [(corners[ix], np.full(3, z), np.zeros((3, 2)), pixels) for ix in ([0, 1, 2], [0, 2, 3])]


front = quad(0, 0, SIZE, SIZE, -.1, NEUTRAL)
socket = quad(20, 36, 30, 42, -.08, RED)
for name, order in (("front first", front + socket), ("socket first", socket + front)):
    result = np.zeros((SIZE, SIZE, 4), dtype=np.float32)
    depth = np.full((SIZE, SIZE), np.inf, dtype=np.float32)
    for tri, z, source, pixels in order:
        skin_detail.draw(result, depth, tri, z, source, pixels)
    assert np.allclose(result[38, 25, :3], .5), f"{name}: socket painted the lid {result[38, 25]}"
    assert np.allclose(result[10, 32, :3], .5), f"{name}: forehead not neutral {result[10, 32]}"
    assert np.all(result[..., 3] == 1), f"{name}: atlas not fully covered"
print("skin_detail depth test passed")
