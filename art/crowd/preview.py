"""Renders baked crowd people (art/crowd/.cache/out/*.glb) in a row, front,
side and back, for checking a bake by eye: one PNG per view.

Run: blender --background --factory-startup --python-exit-code 1 \
       --python art/crowd/preview.py -- <out.png> <a.glb> [<b.glb> ...]
Add CLOSE=1 to the environment for a close view of the first, at the height
FOCUS (meters, default 1.55: head and shoulders).
"""

import math
import os
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
out, files = args[0], args[1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
people = []
for i, path in enumerate(files):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    for ob in set(bpy.data.objects) - before:
        if ob.parent is None:
            ob.location.x += i * 0.9
        people.append(ob)
world = bpy.data.worlds.new("sky")
world.color = (0.55, 0.6, 0.7)
scene.world = world
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
sun.data.energy = 3.5
sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
scene.collection.objects.link(sun)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
scene.collection.objects.link(cam)
scene.camera = cam
scene.render.engine = "CYCLES"
scene.cycles.samples = 16
scene.render.film_transparent = False
close = os.environ.get("CLOSE") == "1"
width = (len(files) - 1) * 0.9
scene.render.resolution_x = 600 if close else max(500, 260 * len(files))
scene.render.resolution_y = 600 if close else 640
mid = Vector((width / 2, 0, float(os.environ.get("FOCUS", 1.55)) if close else 0.9))
dist = 0.9 if close else max(3.2, width * 1.7 + 1.5)
for name, turn in (("front", 0), ("side", 90), ("back", 180)):
    a = math.radians(turn)
    # the people face +Z in glTF, -Y here
    cam.location = mid + Vector((math.sin(a) * dist, -math.cos(a) * dist, 0.1))
    cam.rotation_euler = (math.radians(88), 0, a)
    scene.render.filepath = out.replace(".png", f"-{name}.png")
    bpy.ops.render.render(write_still=True)
