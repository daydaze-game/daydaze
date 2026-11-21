"""Normalize three licensed downloaded landmarks without replacing their PBR art.

Inputs are the owner's untouched Sketchfab downloads. No asset scripts execute.
The adjacent sources/dream-landmark-provenance.zip preserves licenses, metadata
and SHA-256 source receipts; it does not duplicate the large source textures.

Probe facade orientation before conversion:
    LANDMARK_PROBE=/tmp/landmark-directions.png nice -n 19 blender -b -t 2 \
      --factory-startup --python art/city/convert_dream_landmarks.py
Build raw near/far GLBs and an actual textured review board:
    LANDMARK_PREVIEW=/tmp/dream-landmarks.png LANDMARK_OUT=/tmp/dream-landmarks \
      nice -n 19 blender -b -t 2 --factory-startup \
      --python art/city/convert_dream_landmarks.py
Then optimize each raw GLB with @gltf-transform/cli@4.5.1:
    optimize in.glb out.glb --compress meshopt --simplify false --texture-compress webp \
      --texture-size 1024 --flatten false --palette false --join false --instance false
Use --texture-size 512 for -lo files. Geometry, materials and UVs stay authored;
only triangle reduction, orientation, size, texture resolution and encoding change.
"""

import hashlib
import json
import math
import os
from pathlib import Path
import struct
import subprocess
from zipfile import ZipFile, ZIP_DEFLATED

import bpy
import bmesh
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
# The common checkout owns large local sources even from a linked worktree.
COMMON_GIT = Path(subprocess.check_output(["git", "rev-parse", "--git-common-dir"], cwd=ROOT, text=True).strip())
PROJECT = (ROOT / COMMON_GIT).resolve().parent
SOURCE = Path(os.environ.get("LANDMARK_SOURCE", str(PROJECT / "local-assets/downloads/game/curated-world/architecture")))
OUTPUT = Path(os.environ.get("LANDMARK_OUT", "/tmp/dream-landmarks"))
MODELS = {
    "palace": {"folder": "majestic-victorian-mansion-rapid-assets-cdd1a0", "title": "Majestic Victorian Mansion [Rapid Assets]", "author": "RapidAssets", "uid": "cdd1a04e6c8b4a14b2681baf3c8fb66a", "yaw": 270, "height": 20},
    "manor": {"folder": "free-fairytale-gothic-manor-house-524cb9", "title": "FREE Fairytale Gothic Manor House", "author": "Hamanzz", "uid": "524cb97cc77541b99e225970efd8abe8", "yaw": 0, "height": 26},
    "clocktower": {"folder": "whimsical-crimson-clocktower-65e765", "title": "Whimsical Crimson Clocktower", "author": "Mutasim", "uid": "65e765a675eb4b3fab20e29a9c0fd02e", "yaw": 0, "height": 26},
    "greenhouse": {"folder": "greenhouse-victorian-e00471", "title": "Greenhouse Victorian", "author": "Ryoce", "uid": "e00471c89eec45ae8ddb9b06e3f1966e", "yaw": 0, "height": 16},
    "rotunda": {"folder": "rotunda-ac2227", "title": "Rotunda", "author": "emelyarules", "uid": "ac22270d58af43b8af4af61e39c9b6c0", "yaw": 0, "height": 18},
    "shopfront": {"folder": "steampunk-shops-864459", "title": "steampunk Shops", "author": "jacques_3D", "uid": "86445970625a4ce8a66905322576e7c8", "yaw": 270, "height": 16},
}


def join_by_material(objects):
    groups = {}
    for obj in objects:
        mat_name = obj.data.materials[0].name if obj.data.materials else "None"
        groups.setdefault(mat_name, []).append(obj)
    joined = []
    for mat_name, objs in groups.items():
        if len(objs) == 1:
            joined.append(objs[0])
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.join()
        joined.append(objs[0])
    return joined


def imported_meshes(folder):
    """Bake the imported world/rest-pose transforms; preserve UVs and materials."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(folder / "scene.gltf"))
    imported = set(bpy.data.objects) - before
    depsgraph = bpy.context.evaluated_depsgraph_get()
    result = []
    for source in imported:
        if source.type != "MESH" or not source.users_collection or source.hide_render or not source.visible_get():
            continue
        evaluated = source.evaluated_get(depsgraph)
        mesh = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=depsgraph)
        mesh.transform(source.matrix_world)
        obj = bpy.data.objects.new("Authored architecture", mesh)
        bpy.context.collection.objects.link(obj)
        result.append(obj)
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    return result


def bounds(objects):
    vertices = [obj.matrix_world @ v.co for obj in objects for v in obj.data.vertices]
    return ([min(v[i] for v in vertices) for i in range(3)], [max(v[i] for v in vertices) for i in range(3)])


def normalize(objects, yaw, height):
    rotation = Matrix.Rotation(math.radians(yaw), 4, "Z")
    for obj in objects:
        obj.data.transform(rotation)
    lower, upper = bounds(objects)
    size = [b-a for a,b in zip(lower,upper)]
    # The game's module contract is 20x16; height is explicit per landmark.
    # Preserve the source silhouette within that footprint, using modest axis
    # normalization instead of making a mansion as narrow as the tower.
    scale = (20/size[0], 16/size[1], height/size[2])
    for obj in objects:
        for vertex in obj.data.vertices:
            p = vertex.co
            vertex.co = ((p.x-(lower[0]+upper[0])/2)*scale[0], (p.y-(lower[1]+upper[1])/2)*scale[1], (p.z-lower[2])*scale[2])
    return {"sourceBoundsBlender": [lower,upper], "scale": scale, "yawDegreesBlender": yaw}


def copy_mesh(obj, name):
    copy = bpy.data.objects.new(name, obj.data.copy())
    bpy.context.collection.objects.link(copy)
    return copy


def triangles(objects):
    return sum(sum(len(face.vertices)-2 for face in obj.data.polygons) for obj in objects)


def reduce(objects, target):
    # Downloads split vertices at every UV/normal island. Weld positions first;
    # Blender keeps UVs on face corners, so authored seams remain intact.
    for obj in objects:
        bm=bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001)
        bm.to_mesh(obj.data)
        bm.free()
    ratio = min(1, target/triangles(objects))
    for obj in objects:
        bpy.context.view_layer.objects.active = obj
        if ratio < 1:
            mod = obj.modifiers.new("Landmark LOD", "DECIMATE")
            mod.ratio = ratio
            mod.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=mod.name)



def retain_roofs(objects):
    """Keep the original upper silhouette while simplifying the lower body.

    A decimator can delete an entire thin finial or pointed roof. Partition
    those faces first; the two meshes share the original UVs and materials.
    """
    lower, upper = bounds(objects)
    roofline = upper[2] - (upper[2] - lower[2]) * 0.2
    roofs = []
    for obj in objects:
        roof = copy_mesh(obj, obj.name + " roof")
        for mesh, keep_roof in [(obj.data, False), (roof.data, True)]:
            bm = bmesh.new()
            bm.from_mesh(mesh)
            remove = [face for face in bm.faces
                      if any(v.co.z >= roofline for v in face.verts) != keep_roof]
            bmesh.ops.delete(bm, geom=remove, context="FACES")
            bm.to_mesh(mesh)
            bm.free()
        if roof.data.polygons:
            roofs.append(roof)
        else:
            bpy.data.objects.remove(roof, do_unlink=True)
    return roofs


def export(objects, path):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(filepath=str(path), use_selection=True, export_format="GLB", export_apply=True, export_animations=False, export_cameras=False, export_lights=False, export_materials="EXPORT", export_texcoords=True, export_normals=True, export_tangents=True)
    raw = path.read_bytes()
    document = json.loads(raw[20:20+struct.unpack_from("<I",raw,12)[0]])
    primitives = [p for mesh in document["meshes"] for p in mesh["primitives"]]
    count = sum(document["accessors"][p["indices"]]["count"]//3 for p in primitives)
    lo, hi = bounds(objects)
    # Blender Z-up to glTF/game Y-up.
    return {"tris": count, "parts": len(primitives), "bounds": {"min": [lo[0],lo[2],-hi[1]], "max": [hi[0],hi[2],-lo[1]]}}


def render_board(groups, path, columns=3):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(path)
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 2
    scene.world.color = (.3,.3,.3)
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.exposure = .6
    scene.eevee.taa_render_samples = 16
    for image in bpy.data.images:
        if image.size[0] > 1024 or image.size[1] > 1024:
            image.scale(1024,1024)
    for i,(name,objects) in enumerate(groups):
        offset = Vector((i%columns*30,i//columns*38,0))
        for obj in objects:
            obj.location += offset
        curve = bpy.data.curves.new(name,"FONT")
        curve.body = name
        curve.align_x = "CENTER"
        curve.size = 1.2
        label = bpy.data.objects.new(name+" label",curve)
        scene.collection.objects.link(label)
        label.location = offset + Vector((0,-12,.05))
    target = Vector(((columns-1)*15, (math.ceil(len(groups)/columns)-1)*19, 7))
    camera = bpy.data.objects.new("Review camera",bpy.data.cameras.new("Review camera"))
    scene.collection.objects.link(camera)
    camera.location = target + Vector((32,-95,60))
    camera.rotation_euler = (target-camera.location).to_track_quat("-Z","Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 140 if len(groups) > 6 else (115 if columns == 4 else 100)
    scene.camera = camera
    sun = bpy.data.objects.new("Daylight",bpy.data.lights.new("Daylight","SUN"))
    scene.collection.objects.link(sun)
    sun.data.energy = 3
    sun.rotation_euler = (.35,-.3,-.4)
    sun.data.angle = .18
    area = bpy.data.objects.new("Sky fill",bpy.data.lights.new("Sky fill","AREA"))
    scene.collection.objects.link(area)
    area.location = target + Vector((-20,-25,60))
    area.data.energy = 15000
    area.data.size = 60
    bpy.ops.render.render(write_still=True)


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    probe = os.environ.get("LANDMARK_PROBE")
    preview = os.environ.get("LANDMARK_PREVIEW")
    groups = []
    costs = {}
    receipt = {}
    OUTPUT.mkdir(parents=True,exist_ok=True)
    archive_path = Path(__file__).parent / "sources/dream-landmark-provenance.zip"
    with ZipFile(archive_path,"w",ZIP_DEFLATED) as archive:
        for key, spec in MODELS.items():
            folder = SOURCE / spec["folder"]
            license_text = (folder/"license.txt").read_text()
            assert "CC-BY-4.0" in license_text and spec["author"] in license_text
            files = {str(p.relative_to(folder)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(folder.rglob("*")) if p.is_file()}
            archive.write(folder/"license.txt",key+"/license.txt")
            if (folder/"meta.json").exists():
                archive.write(folder/"meta.json",key+"/source-meta.json")
            archive.writestr(key+"/sha256.json",json.dumps(files,indent=2))
            originals = imported_meshes(folder)
            if len(originals) > 1:
                originals = join_by_material(originals)
            transform = normalize(originals,spec["yaw"],spec["height"])
            if probe:
                for yaw in [0,90,180,270]:
                    copies = [copy_mesh(obj,key+"-"+str(yaw)) for obj in originals]
                    for obj in copies:
                        obj.data.transform(Matrix.Rotation(math.radians(yaw),4,"Z"))
                    groups.append((key+" yaw "+str(yaw),copies))
                for obj in originals:
                    bpy.data.objects.remove(obj,do_unlink=True)
                continue
            near = [copy_mesh(obj,key) for obj in originals]
            far = [copy_mesh(obj,key+"-lo") for obj in originals]
            reduce(near,18000)
            roofs = retain_roofs(far)
            reduce(far,8000)
            far.extend(roofs)
            near_cost = export(near,OUTPUT/(key+".glb"))
            far_cost = export(far,OUTPUT/(key+"-lo.glb"))
            costs[key] = {"tris": near_cost["tris"],"lo": far_cost["tris"],"parts":near_cost["parts"],"loParts":far_cost["parts"]}
            receipt[key] = {**spec,"license":"CC-BY-4.0","source":"https://sketchfab.com/3d-models/"+spec["uid"],"normalization":transform,"near":near_cost,"far":far_cost,"sourceHashes":files}
            groups.extend([(key+" / near",near),(key+" / far",far)])
            for obj in originals:
                bpy.data.objects.remove(obj,do_unlink=True)
    if probe:
        render_board(groups,Path(probe),4)
        return
    (OUTPUT/"metadata.json").write_text(json.dumps(receipt,indent=2)+"\n")
    (ROOT/"src/game/city/dreamLandmarkCosts.generated.ts").write_text("/** Exact landmark export costs from art/city/convert_dream_landmarks.py. */\nexport const DREAM_LANDMARK_COST = "+json.dumps(costs,indent=2)+" as const;\n")
    if preview:
        render_board(groups,Path(preview),3)


main()
