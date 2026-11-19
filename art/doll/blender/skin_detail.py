"""Bake CC0 skin detail from MakeHuman UVs into the avatar's face projection.

The neutral value is 0.5 for the client's soft-light composite: pigment and
fine detail survive skin-tone changes without baking in lipstick or eyebrows.
Source: bobby_03's Young Female Hairless, MakeHuman skins01 CC0 pack.
"""
from pathlib import Path
import bpy
import numpy as np

SIZE = 1024


def blur(values, radius):
    """Separable box filter; keep the bake reproducible with Blender's NumPy."""
    result = values
    for axis in (0, 1):
        padding = [(0, 0)] * result.ndim
        padding[axis] = (radius, radius)
        padded = np.pad(result, padding, mode='edge')
        summed = np.cumsum(padded, axis=axis)
        padding[axis] = (1, 0)
        summed = np.pad(summed, padding, mode='constant')
        high = [slice(None)] * result.ndim
        low = high.copy()
        high[axis] = slice(2 * radius + 1, None)
        low[axis] = slice(None, -(2 * radius + 1))
        result = (summed[tuple(high)] - summed[tuple(low)]) / (2 * radius + 1)
    return result


def draw(result, depth, tri, z, source, pixels):
    """Rasterize one triangle into `result` (an RGBA atlas) by destination pixel.

    `tri` holds the three destination points in pixels, `z` their Blender Y and
    `source` their UVs in `pixels`, the (height, width, 4) source image. The
    planar face projection stacks hidden eye-socket and mouth-interior faces
    under the visible lids and lips, so the nearest surface (lowest Y, as the
    face looks down -Y) owns each texel, whatever order faces arrive in.
    """
    size = result.shape[0]
    low = np.maximum(np.floor(tri.min(0)).astype(int), 0)
    high = np.minimum(np.ceil(tri.max(0)).astype(int), size-1)
    if np.any(high < low):
        return
    yy, xx = np.mgrid[low[1]:high[1]+1, low[0]:high[0]+1] + .5
    (x1,y1),(x2,y2),(x3,y3) = tri
    den = (y2-y3)*(x1-x3)+(x3-x2)*(y1-y3)
    if abs(den) < 1e-9:
        return
    a = ((y2-y3)*(xx-x3)+(x3-x2)*(yy-y3))/den
    b = ((y3-y1)*(xx-x3)+(x1-x3)*(yy-y3))/den
    c = 1-a-b
    region_depth = depth[low[1]:high[1]+1,low[0]:high[0]+1]
    near = a*z[0] + b*z[1] + c*z[2]
    inside = (a >= -.003) & (b >= -.003) & (c >= -.003) & (near < region_depth)
    uv = a[...,None]*source[0] + b[...,None]*source[1] + c[...,None]*source[2]
    # Bilinear sampling keeps pores from aliasing in the face atlas.
    height, width = pixels.shape[:2]
    xy = np.clip(uv, 0, 1) * [width-1, height-1]
    ij = xy.astype(int); frac = xy-ij
    x,y = ij[...,0],ij[...,1]; fx,fy = frac[...,0,None],frac[...,1,None]
    xnext,ynext = np.minimum(x+1,width-1),np.minimum(y+1,height-1)
    color = (pixels[y,x]*(1-fx)+pixels[y,xnext]*fx)*(1-fy)+(pixels[ynext,x]*(1-fx)+pixels[ynext,xnext]*fx)*fy
    region = result[low[1]:high[1]+1,low[0]:high[0]+1]
    region[inside,:3] = color[inside,:3]
    region[inside,3] = 1
    region_depth[inside] = near[inside]


def bake(body, base_obj, source_path, output, marks):
    if not Path(source_path).is_file():
        raise RuntimeError("Missing CC0 skin source; run fetch_skin.py first")
    tex = bpy.data.images.load(str(source_path), check_existing=True)
    tex.colorspace_settings.name = "Non-Color"
    width, height = tex.size
    pixels = np.array(tex.pixels[:], dtype=np.float32).reshape(height, width, 4)
    # OBJ loop UVs, keyed by vertex so bmesh's face-loop rotation is harmless.
    uv_points, source_faces = [], []
    group = None
    for line in Path(base_obj).read_text().splitlines():
        fields = line.split()
        if not fields:
            continue
        if fields[0] == "vt":
            uv_points.append([float(v) for v in fields[1:3]])
        elif fields[0] == "g":
            group = fields[1]
        elif fields[0] == "f" and group == "body":
            source_faces.append([(int(p.split('/')[0])-1, int(p.split('/')[1])-1) for p in fields[1:]])
    used = sorted({v for face in source_faces for v, _ in face})
    face_uv = {frozenset(v for v, _ in face): dict(face) for face in source_faces}
    uv_points = np.array(uv_points)
    result = np.zeros((SIZE, SIZE, 4), dtype=np.float32)
    depth = np.full((SIZE, SIZE), np.inf, dtype=np.float32)
    uv_layer = body.data.uv_layers.active.data
    for face in body.data.polygons:
        if face.material_index:
            continue
        loops = list(face.loop_indices)
        dest = np.array([uv_layer[i].uv[:] for i in loops])
        if np.allclose(dest, .004):
            continue
        vertices = [used[body.data.loops[i].vertex_index] for i in loops]
        lookup = face_uv[frozenset(vertices)]
        original = uv_points[[lookup[v] for v in vertices]]
        z = np.array([body.data.vertices[body.data.loops[i].vertex_index].co.y for i in loops])

        for k in range(1, len(loops)-1):
            ix = [0, k, k+1]
            draw(result, depth, dest[ix] * SIZE, z[ix], original[ix], pixels)
    # Neutralize the source's complexion using the central forehead. Preserve
    # relative red pigmentation (lips/nostrils) instead of imposing its skin tone.
    forehead = result[int(SIZE*.72):int(SIZE*.82),int(SIZE*.4):int(SIZE*.6)]
    reference = np.median(forehead[forehead[...,3] > 0,:3], axis=0)
    result[...,:3] = np.clip(.5 + (result[...,:3]-reference)*1.6, .06, .94)
    # Fade the projection boundary inwards; never paint a square seam on skin.
    alpha = result[...,3].copy()
    for _ in range(12):
        alpha = np.minimum.reduce([alpha,np.roll(alpha,1,0),np.roll(alpha,-1,0),np.roll(alpha,1,1),np.roll(alpha,-1,1)])
        result[...,3] += alpha
    result[...,3] /= 13
    # The source atlas includes eye-socket interiors. Those UV islands have
    # hard color borders that must never be projected onto visible eyelids.
    yy, xx = np.mgrid[0:SIZE, 0:SIZE] / SIZE
    for side in ('l', 'r'):
        lids = np.array(marks[side + 'LidUpper'] + marks[side + 'LidLower'])
        center = (lids.min(0) + lids.max(0)) / 2
        radius = (lids.max(0) - lids.min(0)) / 2 + [.018, .025]
        distance = np.sqrt(((xx-center[0])/radius[0])**2 + ((1-yy-center[1])/radius[1])**2)
        fade = np.clip((distance-1)/.55, 0, 1)
        result[...,3] *= fade*fade*(3-2*fade)
    result[...,:3][result[...,3] == 0] = .5
    # Separate surface relief from complexion. Only fine source detail affects
    # bump: broad shadows and lip pigmentation must not become dents. R is
    # height, G is roughness, so one shared non-color texture serves both maps.
    luminance = result[...,:3] @ np.array([.2126, .7152, .0722])
    coverage = result[...,3]
    relief = np.clip(luminance - blur(luminance, 4), -.1, .1)
    surface = np.ones((SIZE, SIZE, 4), dtype=np.float32)
    surface[...,0] = .5 + relief * coverage * 2
    surface[...,1] = .68
    for key, rx, ry, strength in [('noseTip', .065, .09, .2),
                                  ('lCheek', .12, .1, .06),
                                  ('rCheek', .12, .1, .06)]:
        center = marks[key]
        d = ((xx-center[0])/rx)**2 + ((1-yy-center[1])/ry)**2
        surface[...,1] -= strength * np.exp(-d*2) * coverage
    surface[...,2] = 0
    surface_image = bpy.data.images.new('SkinSurface', width=SIZE, height=SIZE, alpha=False)
    surface_image.colorspace_settings.name = 'Non-Color'
    surface_image.pixels.foreach_set(surface.ravel())
    surface_image.filepath_raw = str(Path(output).with_name(Path(output).name.replace('skin-detail', 'skin-surface')))
    surface_image.file_format = 'PNG'
    surface_image.save()
    bpy.data.images.remove(surface_image)
    image = bpy.data.images.new('SkinDetail', width=SIZE, height=SIZE, alpha=True)
    image.colorspace_settings.name = 'Non-Color'
    image.pixels.foreach_set(result.ravel())
    image.filepath_raw = str(output)
    image.file_format = 'PNG'
    image.save()
    bpy.data.images.remove(image)
    print('Baked skin detail',output,'reference',reference)
