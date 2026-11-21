"""Garments, swimsuits and shoes, each one object the client shows or hides.

Names: <Slot>_<id> for garments (Top_, Bottom_, Dress_, Outer_, Legwear_;
GARMENTS in src/game/wardrobe.ts), Swim_<id> (SWIMSUITS in
src/game/look.ts) and Shoes_<id>. Garments come from MakeHuman CC0 proxies or are cut from the base
mesh's tights and skirt helpers, so all of them follow the body sliders. Each
garment also adds a "tuck_<name>" shape key to the body that pulls the skin
under it inwards, so skin never pokes through cloth, in a pose or not.
"""

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

import proxies

TUCK = 0.03  # metres the skin a garment hides sinks, at most
DEPTH = 0.45  # ...and never more than this share of the body's thickness there
SNUG = 0.03  # metres within which proxy cloth takes the skin's bone weights
GRID = 0.002  # metres: the precision a tuck key is stored at
CLEAR = 0.008  # gap kept between sunk skin and the cloth
LEG_PULL = 1.0  # share of the way covered leg skin is drawn in to its leg's axis: 1 collapses it onto the axis, so there is nothing to show through
LEG_RAMP = 0.06  # metres up from a garment's lowest edge over which that pull fades in
SHARE = 0.03  # metres: hidden skin this near both pieces of a split suit goes with both
INTO = 0.02  # metres: cloth this far outside a shoe (or less) tucks into it fully...
INTO_FADE = 0.01  # ...fading out over this much further, so a wide hem stays over it
INSIDE = 0.015  # metres behind the shoe's surface tucked cloth goes: deep enough to stay in under any figure and pose (the leg skin there is drawn in further)


def heights(ctx):
    J = ctx.JB
    return {
        "knee": J["lShin"][2],
        "ankle": J["lFoot"][2],
        "hip": J["lLeg"][2],
        "shoulder": J["lArm"][2],
        "neck": J["head"][2],
    }


def flare(ctx, ob):
    """Bell-bottoms: below the knee, push leg cloth away from the leg's own
    axis, more towards the hem."""
    h = heights(ctx)
    for v in ob.data.vertices:
        z = v.co.z
        if z > h["knee"] or abs(v.co.x) < 0.01:
            continue
        side = "lShin" if v.co.x > 0 else "rShin"
        axis_x = ctx.JB[side][0] * 0.85
        t = (h["knee"] - z) / (h["knee"] - h["ankle"] + 1e-6)
        grow = 1 + 0.9 * min(t, 1.15) ** 1.6
        v.co.x = axis_x + (v.co.x - axis_x) * grow
        v.co.y = v.co.y * grow
    sync_keys(ob, np.array([v.co[:] for v in ob.data.vertices]))


def shell(ctx, name, groups, bands, push, mat, arms=0.3):
    """Cuts base-mesh helper shells (tights, skirt) to horizontal bands
    [(z_lo, z_hi), ...], clamps cut edges flat onto the band lines so hems
    are straight, and pushes the cloth out along its normals by `push`
    metres. Faces mostly on the arms (bone weight > `arms`) are dropped.
    A band's lower edge may be a function of (x, y) instead of a height, for
    a curved hem such as a bikini's leg line."""

    def edge(lo, p):
        return lo(p[0], p[1]) if callable(lo) else lo

    def overlaps(f, lo, hi):
        pts = ctx.PB[f]
        return pts[:, 2].min() < hi and any(p[2] > edge(lo, p) for p in pts)

    faces = []
    for g in groups:
        for f in ctx.FACES[g]:
            if arm_weight(ctx, f) > arms:
                continue
            if any(overlaps(f, lo, hi) for lo, hi in bands):
                faces.append(f)
    used = sorted({i for f in faces for i in f})
    remap = {o: n for n, o in enumerate(used)}
    co = ctx.PB[used].copy()
    for i, p in enumerate(co):
        # snap each vertex into the nearest band
        z = p[2]
        lo, hi = min(bands, key=lambda b: max(edge(b[0], p) - z, z - b[1], 0))
        co[i, 2] = min(max(z, edge(lo, p)), hi)
    # a vertex moved onto a hem may float off a curved body (a hip): put it
    # back on the shell's surface
    moved = np.abs(co[:, 2] - ctx.PB[used][:, 2]) > 1e-6
    if moved.any():
        bvh = BVHTree.FromPolygons(
            [tuple(p) for p in ctx.PB[used]], [[remap[i] for i in f] for f in faces]
        )
        for i in np.nonzero(moved)[0]:
            hit = bvh.find_nearest(Vector(co[i]))[0]
            if hit is not None:
                co[i] = (hit.x, hit.y, co[i, 2])
    ob = ctx.new_object(name, co, [[remap[i] for i in f] for f in faces])
    ob.data.materials.append(mat)
    me = ob.data
    me.update()
    normals = np.array([v.normal[:] for v in me.vertices])
    me.vertices.foreach_set("co", (co + normals * push).ravel())
    for p in me.polygons:
        p.use_smooth = True
    src = np.array(used)
    # the helper shells follow some targets less than the skin does (bust),
    # so each key moves the cloth like the nearest skin vertex, a touch more
    skin = np.array(sorted({i for f in ctx.FACES["body"] for i in f}))
    tree = KDTree(len(skin))
    for i, p in enumerate(ctx.PB[skin]):
        tree.insert(p, i)
    tree.balance()
    near = skin[[tree.find(ctx.PB[i])[1] for i in src]]
    proxies.attach(
        ctx, ob, ctx.W[src], {k: d[near] * (1.3 if k == "plus" else 1.05) for k, d in ctx.KEYS.items()}
    )
    return ob


def taper(ob, top, bottom, squeeze):
    """Takes a skirt in towards its hem: radial scale 1 at `top`, 1 -
    `squeeze` at `bottom`, about the skirt's own vertical axis."""
    co = np.array([v.co[:] for v in ob.data.vertices])
    cy = co[:, 1].mean()
    t = np.clip((top - co[:, 2]) / (top - bottom), 0, 1)
    k = 1 - squeeze * t
    co[:, 0] *= k
    co[:, 1] = cy + (co[:, 1] - cy) * k
    ob.data.vertices.foreach_set("co", co.ravel())
    sync_keys(ob, co)


def stretch(ob, top, hem, to):
    """Lengthens a skirt: below `top`, heights scale so the hem at `hem`
    falls to `to` instead (a midi or maxi from the short skirt helper)."""
    co = np.array([v.co[:] for v in ob.data.vertices])
    below = co[:, 2] < top
    k = (top - to) / (top - hem)
    co[below, 2] = top - (top - co[below, 2]) * k
    ob.data.vertices.foreach_set("co", co.ravel())
    sync_keys(ob, co)


def sync_keys(ob, basis):
    """After moving a mesh's basis, moves every shape key by the same."""
    keys = ob.data.shape_keys.key_blocks
    old = np.empty(len(basis) * 3)
    keys["Basis"].data.foreach_get("co", old)
    old = old.reshape(-1, 3)
    for k in keys:
        c = np.empty(len(basis) * 3)
        k.data.foreach_get("co", c)
        k.data.foreach_set("co", (c.reshape(-1, 3) - old + basis).ravel())


def arm_weight(ctx, f):
    i = ("lArm", "rArm", "lFore", "rFore")
    return sum(ctx.weight(g)[f] for g in i).max()


def leg_pull(ctx, body, co, covered, floor, share=LEG_PULL, ceil=np.inf):
    """Vectors drawing covered leg skin in to the axis of its leg.

    Sinking skin along its own normal does not clear the back of a bent knee:
    the blended weights swing a normal-wise sink sideways there, and the skin
    still shows through the crease. Skin collapsed onto the thigh-and-calf
    axis stays inside the limb whatever the bend does: with nothing left to
    poke out, the cloth hides it as if its faces were deleted. It fades in over
    LEG_RAMP above the garment's lowest edge (`floor`), so a hem leaves no
    step, and with the vertex's share of leg weight, so the hip is left alone.
    `share` scales the pull (HALF_PULL layers take half). Legwear that ends
    on the leg (knee socks) passes its top edge as `ceil`: the pull fades
    out the same way below it, so the bare leg above keeps its shape.
    The weights come from the body object's own groups, so the low-poly body
    gets the same."""
    names = {g.index: g.name for g in body.vertex_groups}
    pull = np.zeros_like(co)
    bones = ctx.rig.data.bones
    for side in ("Left", "Right"):
        legs = {f"mixamorig:{side}UpLeg", f"mixamorig:{side}Leg"}
        w = np.array([sum(g.weight for g in v.groups if names[g.group] in legs) for v in body.data.vertices])
        hip, knee, ankle = (np.array(bones[f"mixamorig:{side}{b}"].head_local) for b in ("UpLeg", "Leg", "Foot"))
        use = covered & (w > 0.5)
        if not use.any():
            continue
        # the nearer point of the thigh and the calf segment to each vertex
        best = None
        for a, b in ((hip, knee), (knee, ankle)):
            axis = b - a
            t = np.clip((co - a) @ axis / (axis @ axis), 0, 1)
            pt = a + t[:, None] * axis
            d = np.linalg.norm(co - pt, axis=1)
            best = (pt, d) if best is None else (np.where((d < best[1])[:, None], pt, best[0]), np.minimum(d, best[1]))
        ramp = (
            np.clip((co[:, 2] - floor) / LEG_RAMP, 0, 1)
            * np.clip((ceil - co[:, 2]) / LEG_RAMP, 0, 1)
            * np.clip((w - 0.5) * 4, 0, 1)
        )
        pull[use] = ((best[0] - co) * (share * ramp)[:, None])[use]
    return pull


def tuck(ctx, body, body_src, garment, name):
    """A body shape key sinking the skin a garment covers.

    Skin the garment hides (MakeHuman's delete_verts) sinks well into the
    body: the cloth's bone weights are a blend of its neighbors', so in a
    pose it slides a centimeter or two off the skin beneath, and skin only
    4 mm behind it shows through. Any other skin near the cloth sinks just
    far enough to sit CLEAR behind its surface. Leg skin under cloth is also
    drawn in toward the leg's axis (leg_pull)."""
    co = np.array([v.co[:] for v in body.data.vertices])
    normals = np.array([v.normal[:] for v in body.data.vertices])
    sink = np.zeros(len(co))
    behind = np.zeros(len(co), bool)  # skin the cloth wraps
    if "deleted" in garment:
        hidden = np.where(np.isin(body_src, np.array(garment["deleted"], int)))[0]
        inside = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
        for i in hidden:
            # how thick the body is here: the ray from just under the skin
            # to its far side (the sink stops short of the middle)
            far, _n, _f, thick = inside.ray_cast(Vector(co[i] - normals[i] * 1e-3), Vector(-normals[i]))
            sink[i] = TUCK if far is None else min(TUCK, DEPTH * thick)
        behind[hidden] = True
    bvh = BVHTree.FromObject(garment, bpy.context.evaluated_depsgraph_get())
    is_shoe = garment.name.startswith("Shoes")
    floor = min(v.co.z for v in garment.data.vertices) if not is_shoe else -1.0
    # legwear may end on the leg: the skin above its top edge stays bare
    ceil = max(v.co.z for v in garment.data.vertices) if garment.name.startswith("Legwear") else np.inf
    # skin sinks only within SNUG of the cloth; trousers and wide legs can sit
    # up to ~10 cm off the leg, so the wider reach only marks leg skin as
    # covered. Sinking everything within 10 cm tore the jaw and neck near a collar.
    reach = 0.03 if is_shoe else 0.10
    for i, p in enumerate(co):
        if not is_shoe and (p[2] < floor or p[2] > ceil):
            continue
        loc, _n, _f, dist = bvh.find_nearest(Vector(p), reach)
        if loc is None:
            continue
        if abs(p[0]) > 0.03 and np.sign(p[0]) != np.sign(loc[0]):
            continue
        outside = float(np.dot(p - np.array(loc), normals[i]))
        if outside < 0:
            behind[i] = True
        if dist <= SNUG and outside > -CLEAR:
            sink[i] = max(sink[i], min(outside + CLEAR, 0.03))
    # shoes ride on the same body next to the trousers and their keys add up:
    # a pull from the sole up would collapse the ankle the hem leaves bare
    move = -normals * sink[:, None]
    if not is_shoe:
        share = LEG_PULL / 2 if garment.name.startswith(HALF_PULL) else LEG_PULL
        move = move + leg_pull(ctx, body, co, behind, floor, share, ceil)
    sk = body.shape_key_add(name=f"tuck_{name}", from_mix=False)
    # on a GRID-metre grid: the key compresses far smaller, unseen
    sk.data.foreach_set("co", (co + np.round(move / GRID) * GRID).ravel())


def split(ctx, ob, bottom, cut=None):
    """Splits a MakeHuman suit into its top (`ob`, kept) and its bottom, a
    new object named `bottom` (None drops it). A loose part reaching above
    mid-torso is the top's; a suit welded into one piece is cut at height
    `cut` instead, so a tucked-in shirt ends at the belt. The skin the suit
    hides (its "deleted" list) goes to whichever piece is nearer it, so each
    piece's tuck sinks only the skin under that piece."""
    h = heights(ctx)
    me = ob.data
    z = np.array([v.co.z for v in me.vertices])
    if cut is None:
        parent = np.arange(len(z))

        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a

        for e in me.edges:
            ra, rb = find(e.vertices[0]), find(e.vertices[1])
            if ra != rb:
                parent[ra] = rb
        roots = np.array([find(i) for i in range(len(z))])
        mid = (h["hip"] + h["shoulder"]) / 2
        upper = {r for r in set(roots.tolist()) if z[roots == r].max() > mid}
        lower = [p.index for p in me.polygons if roots[p.vertices[0]] not in upper]
    else:
        lower = [p.index for p in me.polygons if p.center.z < cut]
    piece = separate(ob, lower)
    deleted = np.array(ob["deleted"], int)
    if len(deleted):
        # each hidden skin vertex goes with every piece within SHARE of it
        # (a blouse tucked into its skirt covers the waist on its own too),
        # else with the nearer one
        near = []
        for part in (ob, piece):
            co = np.array([v.co[:] for v in part.data.vertices])
            tree = KDTree(len(co))
            for i, p in enumerate(co):
                tree.insert(p, i)
            tree.balance()
            near.append(np.array([tree.find(p)[2] for p in ctx.PB[deleted]]))
        mine = (near[0] <= near[1]) | (near[0] < SHARE)
        theirs = (near[1] < near[0]) | (near[1] < SHARE)
        ob["deleted"] = sorted(deleted[mine].tolist())
        piece["deleted"] = sorted(deleted[theirs].tolist())
    if bottom is None:
        bpy.data.objects.remove(piece)
        return None
    piece.name = piece.data.name = bottom
    return piece


def separate(ob, faces):
    """Moves `faces` of `ob` into a new object (shape keys, weights, UVs and
    materials come along) and returns it."""
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    # edit mode rebuilds face selection from the vertices': select those
    me = ob.data
    keep = np.zeros(len(me.polygons), bool)
    keep[list(faces)] = True
    me.polygons.foreach_set("select", keep)
    picked = np.zeros(len(me.vertices), bool)
    for i in faces:
        picked[list(me.polygons[i].vertices)] = True
    me.vertices.foreach_set("select", picked)
    me.edges.foreach_set("select", np.array([picked[a] and picked[b] for a, b in (e.vertices for e in me.edges)], bool))
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="SELECTED")
    bpy.ops.object.mode_set(mode="OBJECT")
    (piece,) = [o for o in bpy.context.selected_objects if o is not ob]
    return piece


def islands_kept(ob, keep):
    """Drops all but the `keep` largest loose parts of `ob` (by vertex
    count): a jacket's own shell without the shirt glimpsed inside it."""
    me = ob.data
    parent = np.arange(len(me.vertices))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for e in me.edges:
        ra, rb = find(e.vertices[0]), find(e.vertices[1])
        if ra != rb:
            parent[ra] = rb
    roots = np.array([find(i) for i in range(len(me.vertices))])
    sizes = {r: int((roots == r).sum()) for r in set(roots.tolist())}
    big = set(sorted(sizes, key=sizes.get, reverse=True)[:keep])
    drop = [p.index for p in me.polygons if roots[p.vertices[0]] not in big]
    if drop:
        bpy.data.objects.remove(separate(ob, drop))


def build(ctx, body, body_src):
    """Every garment as its own object, named <Slot>_<id> (GARMENTS in
    src/game/wardrobe.ts), then swimsuits and shoes. Each old outfit is split
    into its pieces (OUTFIT_WEAR there), so any top goes with any bottom."""
    h = heights(ctx)
    out = []
    cloth = bpy.data.materials.new("cloth")
    satin = bpy.data.materials.new("satin")
    fur = bpy.data.materials.new("fur")

    # sport crop top and flares, from the CC0 sports suit
    img = proxies.detail_texture(
        "clothes/female_sportsuit01/female_sportsuit01_diffuse.png", 1024
    )
    crop_top = proxies.build(
        ctx,
        "Top_sport-crop",
        "clothes/female_sportsuit01/female_sportsuit01.mhclo",
        proxies.textured("outfit_flares", img),
        snug=SNUG,
    )
    flares = split(ctx, crop_top, "Bottom_flares")
    flare(ctx, flares)
    out += [crop_top, flares]

    # everyday wear from the CC0 MakeHuman suits, each split into its top and
    # bottom: tee and skinny jeans, tee and denim shorts, a blouse and pencil
    # skirt. The tees' printed logo is painted out.
    logo = ((0.79, 0.27, 0.105),)
    waist = h["hip"] + 0.1
    for kind, top, bottom, suit, blank in (
        ("Top", "tee", "skinny-jeans", "female_casualsuit01", logo),
        ("Top", "scoop-tee", "denim-shorts", "female_casualsuit02", logo),
        ("Top", "blouse", "pencil-skirt", "female_elegantsuit01", ()),
        # menswear (worn by anyone): a denim shirt, a striped shirt, a puffer
        # jacket and a crew tee, all of whose suits wear the same jeans (kept
        # once, from the crew tee's); a suit; overalls, whole
        ("Top", "denim-shirt", None, "male_casualsuit01", ()),
        ("Top", "striped-shirt", None, "male_casualsuit03", ()),
        ("Outer", "puffer", None, "male_casualsuit05", ()),
        ("Top", "white-tee", "straight-jeans", "male_casualsuit06", ((0.245, 0.14, 0.05), (0.535, 0.16, 0.11), (0.74, 0.17, 0.02))),
        ("Top", "suit-jacket", "suit-trousers", "male_elegantsuit01", ()),
        ("Dress", "overalls", "", "male_worksuit01", ()),
    ):
        img = proxies.detail_texture(f"clothes/{suit}/{suit}_diffuse.png", 1024, blank=blank)
        ob = proxies.build(
            ctx, f"{kind}_{top}", f"clothes/{suit}/{suit}.mhclo", proxies.textured(f"outfit_{top}", img), snug=SNUG
        )
        out.append(ob)
        if bottom == "":
            continue
        # the denim shirt is welded to its jeans: cut at the belt
        rest = split(ctx, ob, bottom and f"Bottom_{bottom}", cut=waist - 0.02 if top == "denim-shirt" else None)
        if rest:
            out.append(rest)
        if top == "puffer":
            # the open jacket alone: the shirt glimpsed inside it would fight
            # whatever top is worn under
            islands_kept(ob, 1)

    # satin bandeau and mini: a strapless satin bodice on the tights helper, a
    # fitted skirt from the skirt helper ending mid-thigh
    bust = h["shoulder"] - 0.1
    hem = h["hip"] - 0.2
    out.append(shell(ctx, "Top_bandeau", ["helper-tights"], [(waist - 0.04, bust)], 0.002, satin))
    sk = shell(ctx, "Bottom_satin-mini", ["helper-skirt"], [(hem, waist)], 0.003, satin)
    taper(sk, waist, hem, 0.05)
    out.append(sk)

    # faux fur: a cropped jacket with sleeves to the wrist
    out.append(
        shell(ctx, "Outer_fur-jacket", ["helper-tights"], [(waist + 0.02, h["neck"] - 0.04)], 0.022, fur, arms=1.1)
    )

    # boutique and closet garments, each its own cut; all from the tights and
    # skirt helpers
    velour = bpy.data.materials.new("velour")
    sequin = bpy.data.materials.new("sequin")
    ankle = h["ankle"] + 0.02
    knee = h["knee"]
    midthigh = (h["hip"] + knee) / 2

    # Y2K velour tracksuit: a zip hoodie to the wrists, flared track pants
    out.append(
        shell(ctx, "Top_velour-hoodie", ["helper-tights"], [(waist - 0.03, h["neck"] - 0.035)], 0.012, velour, arms=1.1)
    )
    pants = shell(ctx, "Bottom_track-pants", ["helper-tights"], [(ankle, waist - 0.01)], 0.006, velour)
    flare(ctx, pants)
    out.append(pants)

    # baby tee and pleated mini: a fitted cropped tee with cap sleeves; a
    # short skirt that kicks out at the hem
    out.append(
        shell(ctx, "Top_baby-tee", ["helper-tights"], [(waist + 0.07, h["neck"] - 0.05)], 0.004, cloth, arms=0.55)
    )
    sk3 = shell(ctx, "Bottom_pleated-mini", ["helper-skirt"], [(hem + 0.05, waist)], 0.004, cloth)
    taper(sk3, waist, hem + 0.05, -0.18)
    out.append(sk3)

    # sequin slip gown: a strapless bodice and a skirt stretched to the ankle
    bod = shell(ctx, "Dress_sequin-gown", ["helper-tights"], [(waist - 0.04, bust)], 0.002, sequin)
    gown = shell(ctx, "slip_gown", ["helper-skirt"], [(hem, waist)], 0.004, sequin)
    stretch(gown, waist, hem, ankle + 0.03)
    taper(gown, waist, ankle + 0.03, -0.25)
    out.append(join(bod, gown))

    # glam faux-fur wrap: a long, plush coat to mid-thigh
    wrap = shell(ctx, "Outer_fur-wrap", ["helper-tights"], [(waist - 0.02, h["neck"] - 0.03)], 0.03, fur, arms=1.1)
    tail = shell(ctx, "wrap_tail", ["helper-skirt"], [(hem - 0.04, waist + 0.02)], 0.032, fur)
    taper(tail, waist, hem - 0.04, -0.12)
    out.append(join(wrap, tail))

    # corset and maxi skirt: a laced bodice cinched at the waist; a full skirt
    # to the floor
    out.append(shell(ctx, "Top_corset", ["helper-tights"], [(waist - 0.06, bust + 0.01)], 0.003, satin))
    maxi = shell(ctx, "Bottom_maxi-skirt", ["helper-skirt"], [(hem, waist - 0.04)], 0.006, cloth)
    stretch(maxi, waist - 0.04, hem, ankle)
    taper(maxi, waist - 0.04, ankle, -0.55)
    out.append(maxi)

    # cargo pants and a tube top: wide, roomy legs to the ankle and a cropped
    # vest top
    out.append(shell(ctx, "Top_tube-top", ["helper-tights"], [(waist + 0.09, bust + 0.03)], 0.003, cloth, arms=0.15))
    out.append(shell(ctx, "Bottom_cargos", ["helper-tights"], [(ankle, waist - 0.01)], 0.022, cloth))

    # sundress: a fitted bodice and a skirt flaring to the knee
    sun = shell(ctx, "Dress_sundress", ["helper-tights"], [(waist - 0.03, bust + 0.01)], 0.003, cloth)
    swing = shell(ctx, "sundress_skirt", ["helper-skirt"], [(hem, waist - 0.02)], 0.005, cloth)
    stretch(swing, waist - 0.02, hem, knee - 0.02)
    taper(swing, waist - 0.02, knee - 0.02, -0.4)
    out.append(join(sun, swing))

    # cropped hoodie and bike shorts
    out.append(
        shell(ctx, "Top_cropped-hoodie", ["helper-tights"], [(waist + 0.08, h["neck"] - 0.035)], 0.012, cloth, arms=1.1)
    )
    out.append(shell(ctx, "Bottom_bike-shorts", ["helper-tights"], [(midthigh, waist - 0.01)], 0.003, satin))

    # legwear, under everything: opaque tights from the waist over the feet,
    # and knee socks
    # and knee socks; both stop at the ankle, inside every pair of shoes
    out.append(shell(ctx, "Legwear_tights", ["helper-tights"], [(h["ankle"], waist - 0.02)], 0.001, cloth, arms=0.2))
    out.append(shell(ctx, "Legwear_knee-socks", ["helper-tights"], [(h["ankle"], knee - 0.04)], 0.0015, cloth, arms=0.2))

    # swimsuits. The bikini's leg line dips to the crotch and rises over the
    # hips to a thin side, lower at the back for fuller cover (front is -y)
    def leg_line(x, y):
        rise = 1.25 if y < 0 else 0.8
        # never above the waistband: a 1.5 cm strap stays over each hip
        return min(h["hip"] - 0.105 + abs(x) * rise, h["hip"] + 0.005)

    out.append(
        shell(ctx, "Swim_one-piece", ["helper-tights"], [(h["hip"] - 0.08, bust + 0.015)], 0.0015, cloth, arms=0.2)
    )
    out.append(
        shell(
            ctx,
            "Swim_bikini",
            ["helper-tights"],
            [(bust - 0.1, bust + 0.01), (leg_line, h["hip"] + 0.02)],
            0.0015,
            cloth,
            arms=0.2,
        )
    )

    # a high-waisted bikini: the same top, the briefs up to the waist
    out.append(
        shell(
            ctx,
            "Swim_high-waist",
            ["helper-tights"],
            [(bust - 0.1, bust + 0.01), (leg_line, waist + 0.02)],
            0.0015,
            cloth,
            arms=0.2,
        )
    )
    # a tankini: a long top to just above the briefs
    out.append(
        shell(
            ctx,
            "Swim_tankini",
            ["helper-tights"],
            [(h["hip"] + 0.1, bust + 0.015), (leg_line, h["hip"] + 0.02)],
            0.002,
            cloth,
            arms=0.2,
        )
    )
    # a racer one-piece, cut high to the collarbone
    out.append(
        shell(ctx, "Swim_racer", ["helper-tights"], [(h["hip"] - 0.08, h["neck"] - 0.07)], 0.0015, cloth, arms=0.2)
    )

    # shoes: CC0 sneakers keep their own colours
    shoe_img = proxies.detail_texture(
        "clothes/shoes06/shoes06_diffuse.png", 512, keep_colour=True
    )
    out.append(
        proxies.build(
            ctx,
            "Shoes_sneakers",
            "clothes/shoes06/shoes06.mhclo",
            proxies.textured("shoes_sneakers", shoe_img),
        )
    )
    gloss = bpy.data.materials.new("shoe_gloss")
    out.append(platforms(ctx, "Shoes_platforms", h["ankle"] + 0.02, gloss))
    out.append(platforms(ctx, "Shoes_boots", h["knee"] - 0.06, gloss))
    shoes = [ob for ob in out if ob.name.startswith("Shoes")]
    for ob in out:
        if ob.name.startswith(("Bottom", "Dress", "Legwear")):
            into_shoes(ob, shoes)
    for ob in out:
        tuck(ctx, body, body_src, ob, ob.name.split("_", 1)[1])
    return out


# the prefixes of every worn part's object name: each gets a body tuck key
WORN = ("Top", "Bottom", "Dress", "Outer", "Legwear", "Swim", "Shoes")
# layers that go over or under another garment draw covered leg skin in only
# halfway: their tucks add up with the bottom's, and two full pulls would
# fling the skin through the axis and out the far side of the leg
HALF_PULL = ("Top", "Outer", "Legwear")


def into_shoes(garment, shoes):
    """An "in_<shoe>" shape key per pair of shoes that tucks a garment's legs
    into them: cloth below the shoe's top that pokes through it, or sits
    within INTO outside it, moves INSIDE behind its surface (the skin there
    is drawn in further by the garment's own tuck, and the shoe's and the
    garment's weights and figure keys differ a little, so a shallow tuck
    shows through in a pose). Cloth further out fades back to
    its own place, so flares and gowns stay over the shoe. The client sets
    the key of the shoes worn."""
    co = np.array([v.co[:] for v in garment.data.vertices])
    for shoe in shoes:
        bvh = BVHTree.FromObject(shoe, bpy.context.evaluated_depsgraph_get())
        top = max(v.co.z for v in shoe.data.vertices)
        move = np.zeros_like(co)
        for i, p in enumerate(co):
            if p[2] > top:
                continue
            loc, normal, _f, _d = bvh.find_nearest(Vector(p), INTO + INTO_FADE)
            if loc is None:
                continue
            outside = float(np.dot(p - np.array(loc), normal))
            if outside < -INSIDE:
                continue
            fade = np.clip((INTO + INTO_FADE - outside) / INTO_FADE, 0, 1)
            move[i] = -np.array(normal) * (outside + INSIDE) * fade
        sk = garment.shape_key_add(name=f"in_{shoe.name.split('_', 1)[1]}", from_mix=False)
        sk.data.foreach_set("co", (co + move).ravel())


PLATFORM = 0.05  # sole height in metres; the client lifts the doll by this


def hull2d(pts):
    """Convex hull of 2D points, counter-clockwise (monotone chain)."""
    p = sorted(map(tuple, pts))
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower, upper = [], []
    for q in p:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], q) <= 0:
            lower.pop()
        lower.append(q)
    for q in reversed(p):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], q) <= 0:
            upper.pop()
        upper.append(q)
    return np.array(lower[:-1] + upper[:-1])


def chaikin(ring, rounds):
    """Rounds a closed polygon's corners by corner cutting."""
    for _ in range(rounds):
        nxt = np.roll(ring, -1, axis=0)
        ring = np.stack([ring * 0.75 + nxt * 0.25, ring * 0.25 + nxt * 0.75], 1).reshape(-1, 2)
    return ring


def platforms(ctx, name, top, mat):
    """Y2K platforms: an upper cut from the tights helper around the foot (up
    to `top`, so ankle pumps or knee boots) on a chunky sole block per foot.
    The sole hangs below the foot; the client lifts the doll to stand on it."""
    upper = shell(ctx, name, ["helper-tights"], [(-1.0, top)], 0.0035, mat, arms=0.2)
    co = np.array([v.co[:] for v in upper.data.vertices])
    sole_parts = []
    for side, bone in (("l", "lFoot"), ("r", "rFoot")):
        sel = co[(co[:, 0] > 0) == (side == "l")]
        sel = sel[sel[:, 2] < ctx.JB[bone][2] + 0.01]
        # the sole follows the foot's own outline (rounded toe, narrower
        # heel), a few millimetres proud of it, extruded straight down
        mid = sel[:, :2].mean(0)
        out = mid + (sel[:, :2] - mid) * 1.06
        ring = chaikin(hull2d(out), 3)
        bm = bmesh.new()
        top = [bm.verts.new((x, y, 0.012)) for x, y in ring]
        bot = [bm.verts.new((x, y, -PLATFORM)) for x, y in ring]
        n = len(ring)
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((bot[i], bot[j], top[j], top[i]))
        bm.faces.new(top)
        bm.faces.new(bot[::-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(f"{name}_{side}_sole")
        bm.to_mesh(me)
        bm.free()
        sole = bpy.data.objects.new(me.name, me)
        bpy.context.scene.collection.objects.link(sole)
        mod = sole.modifiers.new("bevel", "BEVEL")
        mod.width = 0.008
        mod.segments = 3
        mod.limit_method = "ANGLE"  # round the rims, not the hull's facets
        bpy.context.view_layer.objects.active = sole
        bpy.ops.object.select_all(action="DESELECT")
        sole.select_set(True)
        bpy.ops.object.modifier_apply(modifier="bevel")
        for poly in sole.data.polygons:
            poly.use_smooth = True
        sole.data.materials.append(mat)
        n = len(sole.data.vertices)
        w = np.zeros((n, len(ctx.BONES)))
        w[:, ctx.BONES.index(ctx.GROUPS[bone][0])] = 1
        proxies.attach(ctx, sole, w, {k: np.zeros((n, 3)) for k in ctx.KEYS})
        sole_parts.append(sole)
    for sole in sole_parts:
        upper = join(upper, sole)
    upper["lift"] = PLATFORM
    return upper


def join(a, b):
    bpy.ops.object.select_all(action="DESELECT")
    a.select_set(True)
    b.select_set(True)
    bpy.context.view_layer.objects.active = a
    bpy.ops.object.join()
    return a
