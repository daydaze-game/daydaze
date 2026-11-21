"""Bake the crowd people: each look of src/game/crowd.ts as one static,
single-mesh, single-texture person per pose and tier.

Reads art/crowd/.cache/recipe.json and the painted faces (paint-run.ts) and the
shipped doll parts and clips (public/models/doll/), so it needs nothing but
the repo. Per bake:

1. Dress and pose the doll as the game does: body, hair, outfit and shoes on
   one rig, the look's face and body shape keys and tucks, and one frame of a
   mocap clip.
2. Freeze that into full-detail meshes with flat emission materials holding
   exactly the colors the game's materials show (texture x tint x vertex
   shade), as the bake source.
3. Build the low-poly person: solidify and voxel-remesh the dressed doll into
   one closed surface (skin under clothes and hair-card gaps vanish), then
   collapse it to the tier's triangle ceiling and unwrap it, with the head
   given extra texels.
4. Cycles-bake the source's colors onto it, selected to active, so each texel
   takes the outermost surface: clothes over skin, hair over scalp.

Writes art/crowd/.cache/out/<look>-<pose>-<tier>.glb at real size, feet on
the ground, facing +Z; build-crowd.sh compresses them into public/.
Run: blender --background --factory-startup --python-exit-code 1 \
       --python art/crowd/build_crowd.py [-- <look>-<pose>-<tier> ...]
"""

import json
import sys
from pathlib import Path

import bmesh
import bpy

# xatlas, installed for Blender's Python by build-crowd.sh
sys.path.append(str(Path(__file__).resolve().parent / ".cache" / "pylib"))
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PUBLIC = ROOT / "public"
CACHE = HERE / ".cache"
OUT = CACHE / "out"
RECIPE = json.loads((CACHE / "recipe.json").read_text())

# Bake resolution per tier; build-crowd.sh scales the shipped maps down.
TEXELS = {"near": 1024, "far": 512}
# Solidify shell and voxel size (meters): fine enough for fingers and lips,
# coarse enough to close hair cards and garment gaps into one surface.
SHELL = 0.004
VOXEL = 0.006
# How much denser the face's texels are than the rest of the body.
FACE_TEXELS = 3.0
# The face's decimation weight (the rest is 1) and the group's strength:
# a lower weight makes the face's edges dearer to collapse.
FACE_WEIGHT = 0.9
FACE_FACTOR = 1.0
# Skin counts as hidden within this reach of a garment (meters), when it
# lies under it or pokes less than POKE out through it, square to its face
# (the share of the offset along the garment's normal).
COVER = 0.08
POKE = 0.04
SQUARE = 0.7
# Hair shows its strands' dark undertone where the cards are cut out.
HAIR_GAP = 0.45


def srgb(hex_color):
    """A #rrggbb color as linear RGBA, as Blender's color inputs want."""
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    return [lin(int(hex_color[i:i + 2], 16)) for i in (1, 3, 5)] + [1.0]


def load(path):
    """Imports a glTF; returns the objects it added. Bones keep their glTF
    node axes, so a bone's pose is its node's transform (see pose())."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path), bone_heuristic="BLENDER")
    return [o for o in bpy.data.objects if o not in before]


def drop_faces(ob, keep):
    """Deletes the faces whose material name `keep` rejects."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    names = [m.name if m else "" for m in ob.data.materials]
    bad = [f for f in bm.faces if not keep(names[f.material_index])]
    bmesh.ops.delete(bm, geom=bad, context="FACES")
    bm.to_mesh(ob.data)
    bm.free()


def dress(look):
    """The doll in the look's parts, all skinned to the body's rig."""
    added = load(PUBLIC / "models/doll" / f"body{look['suffix']}.glb")
    rig = next(o for o in added if o.type == "ARMATURE")
    meshes = []
    for ob in added:
        if ob.type != "MESH":
            continue
        names = [m.name for m in ob.data.materials if m]
        # the eyelashes are alpha cards and the cornea a clear shell
        if "skin" in names or "eye" in names:
            drop_faces(ob, lambda n: n in ("skin", "eye"))
            meshes.append((ob, "skin" if "skin" in names else "eye"))
    for kind in ("hair", "outfit", "shoes"):
        # the outfit is a list: one file per garment worn
        files = look[kind] if isinstance(look[kind], list) else [look[kind]]
        for ob in (o for f in files for o in load(PUBLIC / "models/doll" / f)):
            if ob.type != "MESH" or ob.name.startswith("Icosphere"):
                continue
            world = ob.matrix_world.copy()
            ob.parent = rig
            ob.matrix_world = world
            for mod in ob.modifiers:
                if mod.type == "ARMATURE":
                    mod.object = rig
            meshes.append((ob, kind))
    # every part's own rig and marker goes; the body's rig drives them all
    keep = {rig} | {ob for ob, _ in meshes}
    for ob in list(bpy.data.objects):
        if ob not in keep:
            bpy.data.objects.remove(ob, do_unlink=True)
    for ob, _ in meshes:
        keys = ob.data.shape_keys
        if not keys:
            continue
        for key in keys.key_blocks[1:]:
            key.value = look["keys"].get(key.name, 0)
            if key.name in look["tucks"]:
                key.value = 1
    return rig, meshes


def rest_frames(path):
    """Each node's rest transform in a glTF, relative to the Hips' parent
    (the rig's own node), converted to Blender's Z-up as the importer does."""
    import struct

    data = path.read_bytes()
    size = struct.unpack_from("<I", data, 12)[0]
    nodes = json.loads(data[20:20 + size])["nodes"]
    parent = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
    # glTF Y-up to Blender Z-up: (x, y, z) -> (x, -z, y)
    axes = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))

    def local(n):
        x, y, z, w = n.get("rotation", (0, 0, 0, 1))
        sx, sy, sz = n.get("scale", (1, 1, 1))
        m = Quaternion((w, x, y, z)).to_matrix().to_4x4()
        m = m @ Matrix.Diagonal((sx, sy, sz, 1))
        m.translation = n.get("translation", (0, 0, 0))
        return m

    names = [n.get("name", "") for n in nodes]
    top = parent[names.index("mixamorig:Hips")]
    frames = {}
    for i, n in enumerate(nodes):
        m, j = Matrix.Identity(4), i
        while j != top and j in parent:
            m = local(nodes[j]) @ m
            j = parent[j]
        if j == top:
            frames[n.get("name", "")] = axes @ m @ axes.inverted()
    return frames


def hidden_skin(meshes):
    """The body's vertices the outfit and shoes hide, each with the kind of
    garment over it: within COVER of a garment's surface and under it, or
    poking less than POKE out through it (bare skin that close to cloth is
    pressed against it, out of sight). Hands never count. The bake paints
    that skin the garment's color, so no ray finds skin through a cuff, a
    seam or a fold that clips."""
    deps = bpy.context.evaluated_depsgraph_get()
    parts = {"outfit": ([], []), "shoes": ([], [])}
    body = []
    skin = None
    for ob, kind in meshes:
        me = ob.evaluated_get(deps).to_mesh()
        if kind == "skin":
            skin = ob
            body = [ob.matrix_world @ v.co for v in me.vertices]
        elif kind in parts:
            verts, polys = parts[kind]
            base = len(verts)
            verts += [ob.matrix_world @ v.co for v in me.vertices]
            polys += [[base + i for i in p.vertices] for p in me.polygons]
        ob.evaluated_get(deps).to_mesh_clear()
    # the outfit first: a cuff over the ankle wins over the shoe below it
    trees = [
        (kind, BVHTree.FromPolygons(verts, polys))
        for kind, (verts, polys) in parts.items()
        if polys
    ]
    hands = {g.index for g in skin.vertex_groups if "Hand" in g.name} if skin else set()
    hidden = {}
    for i, co in enumerate(body):
        if any(g.group in hands and g.weight > 0.3 for g in skin.data.vertices[i].groups):
            continue
        for kind, tree in trees:
            at, normal, _, d = tree.find_nearest(co, COVER)
            if at is None:
                continue
            # garments face out: under the surface is negative. Past a hem
            # the nearest point is the edge, off to the side, not over it.
            depth = (co - at).dot(normal)
            if depth < POKE and abs(depth) >= SQUARE * d:
                hidden[i] = kind
                break
    return hidden


def pose(rig, look, clip, at):
    """Poses the rig as one moment of a doll clip.

    A clip file is the skeleton's bare nodes (empties), animated. A bone's
    rest frame and its node's differ by a fixed turn (the importer points
    bones along their node's +Y), measured from the file's rest pose; each
    bone then takes its node's posed frame, turned the same, parents first."""
    path = PUBLIC / RECIPE["clips"][clip][look["suffix"]].lstrip("/")
    rest = rest_frames(path)
    added = load(path)
    nodes = {o.name: o for o in added}
    # the clip's root node (named like the rig, so imported renamed)
    top = nodes["mixamorig:Hips"].parent
    action = bpy.data.actions[clip]
    for ob in added:
        slot = action.slots.get("OB" + ob.name)
        if ob.animation_data is None:
            ob.animation_data_create()
        ob.animation_data.action = action if slot else None
        if slot:
            ob.animation_data.action_slot = slot
    start, end = action.frame_range
    frame = start + (end - start) * at
    bpy.context.scene.frame_set(int(frame), subframe=frame % 1)
    root = top.matrix_world.inverted()
    for bone in rig.pose.bones:
        node = nodes.get(bone.name)
        if node and bone.name in rest:
            turn = rest[bone.name].inverted() @ bone.bone.matrix_local
            bone.matrix = root @ node.matrix_world @ turn
            bpy.context.view_layer.update()
    for ob in added:
        bpy.data.objects.remove(ob, do_unlink=True)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def emission(name, color, image=None, shade=False, cutout=False):
    """A flat material showing exactly `color` x texture x vertex shade."""
    mat = bpy.data.materials.new(name)
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new("ShaderNodeOutputMaterial")
    emit = tree.nodes.new("ShaderNodeEmission")
    tree.links.new(emit.outputs[0], out.inputs["Surface"])
    tint = tree.nodes.new("ShaderNodeRGB")
    tint.outputs[0].default_value = color
    socket = tint.outputs[0]
    if image is not None:
        tex = tree.nodes.new("ShaderNodeTexImage")
        tex.image = image
        uv = tree.nodes.new("ShaderNodeUVMap")
        uv.uv_map = "UVMap"
        tree.links.new(uv.outputs[0], tex.inputs["Vector"])
        mix = tree.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1
        tree.links.new(socket, mix.inputs["A"])
        tree.links.new(tex.outputs["Color"], mix.inputs["B"])
        socket = mix.outputs["Result"]
    if shade:
        attr = tree.nodes.new("ShaderNodeVertexColor")
        mix = tree.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1
        tree.links.new(socket, mix.inputs["A"])
        tree.links.new(attr.outputs["Color"], mix.inputs["B"])
        socket = mix.outputs["Result"]
    if cutout and image is not None:
        # where a strand card is cut out, the hair's dark undertone shows
        gap = tree.nodes.new("ShaderNodeRGB")
        gap.outputs[0].default_value = [c * HAIR_GAP for c in color[:3]] + [1]
        mix = tree.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        tree.links.new(tex.outputs["Alpha"], mix.inputs["Factor"])
        tree.links.new(gap.outputs[0], mix.inputs["A"])
        tree.links.new(socket, mix.inputs["B"])
        socket = mix.outputs["Result"]
    tree.links.new(socket, emit.inputs["Color"])
    return mat


def first_image(mat):
    """The base color texture a glTF material was imported with, if any."""
    if not mat or not mat.node_tree:
        return None
    for node in mat.node_tree.nodes:
        if node.type == "TEX_IMAGE" and node.image:
            return node.image
    return None


def mean_color(image, tint):
    """A garment texture's average color (where opaque) times its tint, linear."""
    import numpy as np

    px = np.array(image.pixels[:], np.float32).reshape(-1, 4)
    a = px[:, 3:4]
    mean = (px[:, :3] * a).sum(axis=0) / max(float(a.sum()), 1e-6)
    # 8-bit texture pixels read back sRGB-encoded
    return [float(c) ** 2.2 * t for c, t in zip(mean, tint[:3])] + [1.0]


def covered(me, hidden, look, meshes):
    """Gives the skin faces under clothes (any corner under them) the
    covering garment's plain color (material slots after the skin's own)."""
    plain = {}
    for ob, kind in meshes:
        if kind in ("outfit", "shoes") and kind not in plain:
            image = next(
                (first_image(m) for m in ob.data.materials if first_image(m)), None
            )
            tint = srgb(look["outfitColor" if kind == "outfit" else "shoesColor"])
            color = mean_color(image, tint) if image else tint
            me.materials.append(emission(f"under-{kind}", color))
            plain[kind] = len(me.materials) - 1
    for poly in me.polygons:
        under = [hidden[v] for v in poly.vertices if v in hidden]
        if under:
            poly.material_index = plain.get(max(set(under), key=under.count), 0)


def freeze(meshes, look, name, hidden):
    """The posed, shaped doll as plain meshes with bake-source materials."""
    face = bpy.data.images.load(str(CACHE / f"{name}-face.png"))
    iris = bpy.data.images.load(str(CACHE / f"{name}-iris.png"))
    white = srgb("#ffffff")
    deps = bpy.context.evaluated_depsgraph_get()
    frozen = []
    for ob, kind in meshes:
        me = bpy.data.meshes.new_from_object(
            ob.evaluated_get(deps), depsgraph=deps
        )
        if kind == "skin":
            covered(me, hidden, look, meshes)
        shade = len(me.color_attributes) > 0
        mats = []
        for old in me.materials:
            image = first_image(old)
            if old.name.startswith("under-"):
                mats.append(old)
            elif kind == "skin":
                mats.append(emission("skin", white, face))
            elif kind == "eye":
                mats.append(emission("eye", white, iris))
            elif kind == "hair":
                mats.append(
                    emission(
                        "hair",
                        srgb(look["hairColor"]),
                        image,
                        shade=shade,
                        cutout=True,
                    )
                )
            else:
                tint = look["outfitColor" if kind == "outfit" else "shoesColor"]
                mats.append(emission(kind, srgb(tint), image))
        me.materials.clear()
        for mat in mats:
            me.materials.append(mat)
        hi = bpy.data.objects.new(f"hi-{kind}", me)
        hi.matrix_world = ob.matrix_world
        bpy.context.collection.objects.link(hi)
        frozen.append(hi)
    return frozen


def select(objects, active=None):
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = active or objects[0]


def proxy(frozen, head_z, tris):
    """One closed low-poly surface around the whole dressed doll."""
    copies = []
    for hi in frozen:
        ob = hi.copy()
        ob.data = hi.data.copy()
        bpy.context.collection.objects.link(ob)
        copies.append(ob)
    select(copies)
    bpy.ops.object.join()
    low = bpy.context.active_object
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    low.data.materials.clear()
    solid = low.modifiers.new("shell", "SOLIDIFY")
    solid.thickness = SHELL
    solid.offset = 0
    bpy.ops.object.modifier_apply(modifier=solid.name)
    low.data.remesh_voxel_size = VOXEL
    low.data.remesh_voxel_adaptivity = 0
    bpy.ops.object.voxel_remesh()
    # the face keeps more of its triangles: it carries the likeness. Weight
    # scales an edge's collapse cost; zero would lock it.
    group = low.vertex_groups.new(name="spend")
    face = face_of(low, head_z)
    for v in low.data.vertices:
        group.add([v.index], FACE_WEIGHT if v.index in face else 1.0, "REPLACE")
    have = sum(len(p.vertices) - 2 for p in low.data.polygons)
    dec = low.modifiers.new("budget", "DECIMATE")
    dec.ratio = (tris - 4) / have
    dec.vertex_group = group.name
    dec.vertex_group_factor = FACE_FACTOR
    bpy.ops.object.modifier_apply(modifier=dec.name)
    tri = low.modifiers.new("tris", "TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=tri.name)
    for poly in low.data.polygons:
        poly.use_smooth = True
    low.name = "crowd"
    return low


def face_of(low, head_z):
    """The vertices of the front of the head (the face, and bangs over it):
    above the neck, ahead of the head's middle (the doll faces -Y)."""
    head = [v for v in low.data.vertices if v.co.z >= head_z]
    mid_y = sum(v.co.y for v in head) / max(1, len(head))
    return {v.index for v in head if v.co.y < mid_y}


def unwrap(low, head_z, size):
    """Charts and packs the low-poly person's UVs with xatlas, the face given
    more texels.

    xatlas sizes charts by their 3D area, so the face is scaled up for the
    charting only."""
    import numpy as np
    import xatlas

    verts = np.array([v.co[:] for v in low.data.vertices], np.float32)
    head = np.zeros(len(verts), bool)
    head[list(face_of(low, head_z))] = True
    center = verts[head].mean(axis=0)
    verts[head] = center + (verts[head] - center) * FACE_TEXELS
    faces = np.array([p.vertices[:] for p in low.data.polygons], np.uint32)
    atlas = xatlas.Atlas()
    atlas.add_mesh(verts, faces)
    pack = xatlas.PackOptions()
    pack.resolution = size
    pack.padding = 4
    pack.bilinear = True
    pack.rotate_charts = True
    atlas.generate(pack_options=pack)
    _, indices, uvs = atlas[0]
    # the parts' own UVs ride through the join: only the atlas may remain
    while low.data.uv_layers:
        low.data.uv_layers.remove(low.data.uv_layers[0])
    layer = low.data.uv_layers.new(name="UVMap")
    for poly, corners in zip(low.data.polygons, indices):
        for loop, i in zip(poly.loop_indices, corners):
            layer.data[loop].uv = uvs[i]


def bake(frozen, low, size, path):
    """Cycles-bakes the source's emission onto the low-poly person."""
    image = bpy.data.images.new("crowd", size, size)
    mat = bpy.data.materials.new("crowd")
    tree = mat.node_tree
    bsdf = tree.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.8
    tex = tree.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    tree.nodes.active = tex
    low.data.materials.append(mat)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 4
    scene.render.bake.use_selected_to_active = True
    scene.render.bake.cage_extrusion = 0.03
    scene.render.bake.max_ray_distance = 0.08
    scene.render.bake.margin = 16
    scene.render.bake.margin_type = "EXTEND"
    select(frozen + [low], active=low)
    bpy.ops.object.bake(type="EMIT")
    image.filepath_raw = str(path)
    image.file_format = "PNG"
    image.save()
    image.pack()


def build(name, pose_id, tier):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    look = RECIPE["looks"][name]
    rig, meshes = dress(look)
    # under the clothes as they hang at rest (loose ones sit well off the
    # skin), then wherever the pose pushes skin through them
    hidden = hidden_skin(meshes)
    if pose_id == "idle":
        pose(rig, look, look["idle"], 0)
    else:
        spec = RECIPE["poses"][pose_id]
        pose(rig, look, spec["clip"], spec["at"])
    hidden = {**hidden_skin(meshes), **hidden}
    head = rig.pose.bones["mixamorig:Head"]
    neck = rig.pose.bones["mixamorig:Neck"]
    head_z = (rig.matrix_world @ ((head.head + neck.head) / 2)).z
    hips = rig.matrix_world @ rig.pose.bones["mixamorig:Hips"].head
    frozen = freeze(meshes, look, name, hidden)
    bpy.data.objects.remove(rig, do_unlink=True)
    for ob, _ in meshes:
        bpy.data.objects.remove(ob, do_unlink=True)
    low = proxy(frozen, head_z, RECIPE["tris"][tier])
    unwrap(low, head_z, TEXELS[tier])
    stem = f"{name}-{pose_id}-{tier}"
    OUT.mkdir(parents=True, exist_ok=True)
    bake(frozen, low, TEXELS[tier], OUT / f"{stem}.png")
    # stand on the ground, centered under the hips
    lowest = min(v.co.z for v in low.data.vertices)
    for v in low.data.vertices:
        v.co -= Vector((hips.x, hips.y, lowest))
    for hi in frozen:
        bpy.data.objects.remove(hi, do_unlink=True)
    tris = sum(len(p.vertices) - 2 for p in low.data.polygons)
    on_head = sum(1 for p in low.data.polygons if p.center.z > head_z - lowest)
    print("HEAD", stem, on_head, "of", tris, flush=True)
    if tris > RECIPE["tris"][tier]:
        raise ValueError(f"{stem}: {tris} triangles over the {tier} ceiling")
    select([low])
    bpy.ops.export_scene.gltf(
        filepath=str(OUT / f"{stem}.glb"),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_skins=False,
        export_morph=False,
    )
    print("CROWD", stem, tris, flush=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for b in RECIPE["bakes"]:
        stem = f"{b['look']}-{b['pose']}-{b['tier']}"
        # a name, or the start of one: "male-d" bakes every male-d file
        if not argv or any(stem.startswith(a) for a in argv):
            build(b["look"], b["pose"], b["tier"])


main()
