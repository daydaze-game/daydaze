"""Build Daydaze's celestial garden architecture, including deliberate skyline LODs.

Free architecture packs (Poly Haven, Kenney and Quaternius) were searched first;
their ordinary buildings did not supply the requested fantasy silhouettes.
The supplied CC0 BlenderKit Art Nouveau Window (Davide Tirindelli) and Quaternius
Medieval Village MegaKit provide real frame, ironwork, roof, shutter and balcony
geometry. Their original .blend and glTF geometry inputs are preserved as data in
sources/dream-details.zip. No scripts from downloaded packs are executed.
Coordinates here are game coordinates (x, height, front); glTF exports are Y-up.

    nice -n 19 /snap/bin/blender -b --factory-startup \
      --python art/city/build_dream_city.py -- /tmp/dream-raw.glb
    PREVIEW=/tmp/dream-contact.png ...same command...

Compress with gltf-transform optimize --compress meshopt --simplify false
--flatten false --palette false --prune-attributes false --join false
--instance false. Preserve COLOR_0 and TEXCOORD_0: its x is a surface role,
stone=0, metal=.25, glass=.5, foliage=.75, luminous=1 (not texture coordinates).
The generated triangle costs describe the authored topology; compression must
not simplify it. All 24 objects share one material and one primitive each.
"""

import json
import math
import os
from pathlib import Path
import struct
import sys
import tempfile
from zipfile import ZipFile

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[sys.argv.index("--") + 1]) if "--" in sys.argv else ROOT / "public/models/city-dream/architecture.glb"
PREVIEW = os.environ.get("PREVIEW")
KINDS = ("observatory", "conservatory", "palazzo", "theater", "ribbon", "pagoda", "heritage", "shell", "sail", "storybook", "lantern", "terrace")


def linear(h):
    """Convert authored sRGB colors once; glTF vertex colors are linear."""
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4 for v in c) + (1,)


IVORY = linear("eee2c9")
PALE = linear("fff0d3")
STONE = linear("c8b5a6")
TEAL = linear("478f8b")
JADE = linear("347b77")
GOLD = linear("c59c52")
PINK = linear("b96f86")
ROSE = linear("e3b6ab")
GLASS = linear("527b84")
DARK = linear("254954")
GREEN = linear("467b59")
LEAF = linear("77a471")
LIGHT = linear("f8dda2")
LILAC = linear("a49bbd")
BLUE = linear("6d89a9")
TIMBER = linear("725c6b")
DETAILS = {}


def load_details():
    """Reduce the original CC0 meshes once, retaining their authored shapes."""
    with tempfile.TemporaryDirectory(prefix="daydaze-architecture-") as directory:
        with ZipFile(Path(__file__).parent / "sources/dream-details.zip") as archive:
            archive.extractall(directory)
        for file, key, ratio in [("art-nouveau.blend", "nouveau", .18),
                                 ("Roof_RoundTiles_6x8.gltf", "tiles", .38),
                                 ("Balcony_Cross_Straight.gltf", "balcony", 1),
                                 ("WindowShutters_Wide_Round_Open.gltf", "shutters", 1),
                                 ("Roof_FrontSupports.gltf", "timber", 1),
                                 ("Prop_Vine1.gltf", "vine", 1)]:
            before = set(bpy.data.objects)
            path=str(Path(directory) / file)
            if key == "nouveau":
                # Append mesh datablocks only; do not run anything in the file.
                with bpy.data.libraries.load(path, link=False) as (source,target):
                    target.objects=source.objects
                for obj in target.objects:
                    if obj is not None:
                        bpy.context.collection.objects.link(obj)
            else:
                bpy.ops.import_scene.gltf(filepath=path)
            parts = []
            imported = set(bpy.data.objects) - before
            for obj in imported:
                if obj.type != "MESH":
                    continue
                bpy.context.view_layer.objects.active = obj
                if key == "nouveau":
                    # Preserve the original material boundaries during reduction.
                    # Bevel tessellation is unnecessary at the city's scale.
                    for modifier in list(obj.modifiers):
                        if modifier.type=="MIRROR":
                            bpy.ops.object.modifier_apply(modifier=modifier.name)
                        else:
                            obj.modifiers.remove(modifier)
                    for slot,mat in enumerate(obj.data.materials):
                        mesh=obj.data.copy()
                        bm=bmesh.new()
                        bm.from_mesh(mesh)
                        bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.material_index!=slot],context="FACES")
                        bm.to_mesh(mesh)
                        bm.free()
                        part=bpy.data.objects.new("Window material detail",mesh)
                        bpy.context.collection.objects.link(part)
                        part.matrix_world=obj.matrix_world
                        bpy.context.view_layer.objects.active=part
                        mod=part.modifiers.new("Preserve curved source frame","DECIMATE")
                        mod.ratio=.26 if "brass" in mat.name else .13
                        bpy.ops.object.modifier_apply(modifier=mod.name)
                        vs=[part.matrix_world @ v.co for v in part.data.vertices]
                        role="glass" if "glass" in mat.name else "metal" if "brass" in mat.name else "paint"
                        parts.append(([(v.x,v.z,-v.y) for v in vs],[tuple(p.vertices) for p in part.data.polygons],role))
                        bpy.data.objects.remove(part,do_unlink=True)
                    continue
                if ratio < 1:
                    mod = obj.modifiers.new("Architectural silhouette reduction", "DECIMATE")
                    mod.ratio = ratio
                    bpy.ops.object.modifier_apply(modifier=mod.name)
                vertices = [obj.matrix_world @ v.co for v in obj.data.vertices]
                # Blender imported coordinates: x, depth, height.
                vertices = [(v.x, v.z, -v.y) for v in vertices]
                faces = [tuple(p.vertices) for p in obj.data.polygons]
                parts.append((vertices, faces, "paint"))
            # Face use excludes loose vertices left by material separation.
            all_vertices = [vertices[i] for vertices, faces, _ in parts for f in faces for i in f]
            mins = [min(v[i] for v in all_vertices) for i in range(3)]
            maxs = [max(v[i] for v in all_vertices) for i in range(3)]
            center = [(a+b)/2 for a,b in zip(mins,maxs)]
            size = [b-a for a,b in zip(mins,maxs)]
            DETAILS[key] = (parts, center, size)
            for obj in imported:
                bpy.data.objects.remove(obj, do_unlink=True)


class Builder:
    """One mesh with face-local painted color and surface-role attributes."""

    def __init__(self, low=False):
        self.low = low
        self.n = 8 if low else 24
        self.v = []
        self.f = []
        self.c = []
        self.flags = []
        self.smooth = []

    def face(self, points, color=IVORY, flag=0, smooth=False):
        start = len(self.v)
        self.v.extend(points)
        self.f.append(tuple(range(start, len(self.v))))
        self.c.append(color)
        self.flags.append(flag)
        self.smooth.append(smooth)

    def indexed(self, vertices, faces, color=IVORY, flag=0, smooth=False):
        # Welded topology inside each sculpted component gives correct normals.
        start = len(self.v)
        self.v.extend(vertices)
        for face in faces:
            self.f.append(tuple(start + i for i in face))
            self.c.append(color)
            self.flags.append(flag)
            self.smooth.append(smooth)

    def detail(self,key,x,y,z,w,h,d,color=GOLD,flag=.25):
        if self.low:
            return
        parts,center,size=DETAILS[key]
        for vertices,faces,role in parts:
            points=[(x+(v[0]-center[0])*w/size[0],y+(v[1]-center[1])*h/size[1],z+(v[2]-center[2])*d/size[2]) for v in vertices]
            paint=GLASS if role=="glass" else GOLD if role=="metal" else color
            surface=.5 if role=="glass" else .25 if role=="metal" else flag
            self.indexed(points,faces,paint,surface,False)

    def turned(self,action,angle):
        start=len(self.v)
        action()
        c,s=math.cos(angle),math.sin(angle)
        self.v[start:]=[(x*c+z*s,y,-x*s+z*c) for x,y,z in self.v[start:]]

    def side_windows(self,rows=(1.4,6.6),width=2,height=3.6):
        if self.low:
            return
        for a in [-math.pi/2,math.pi/2,math.pi]:
            depth=9.56 if abs(a)!=math.pi else 7.81
            for y in rows:
                for x in [-4.5,0,4.5]:
                    self.turned(lambda:self.arch(x,y,depth,width,height,frame=False),a)
            for x in [-6.8,6.8]:
                self.turned(lambda:self.block(x,.8,depth,.22,rows[-1]+height-.8,.18,PALE,0,0),a)

    def radial_windows(self,rx,rz,y,h,count=12):
        if self.low:
            return
        for i in range(count):
            a=i*math.pi*2/count
            if abs(a)<.01:
                continue
            start=len(self.v)
            self.turned(lambda:self.arch(0,y,rz+.035,1.8,h,frame=False),a)
            self.v[start:]=[(x*rx/rz,yy,z) for x,yy,z in self.v[start:]]

    def podium(self,color=IVORY,h=7.5,round=False):
        self.block(0,0,0,20,.45,16,STONE,bevel=0)
        if round:
            self.rings([(0,.45,0,9.5,7.55),(0,h,0,9.5,7.55)],color,0,n=8 if self.low else 32)
            self.rings([(0,h,0,9.7,7.7),(0,h+.28,0,9.7,7.7)],PALE,0)
        else:
            self.block(0,.45,0,19,h-.45,15.5,color)
        self.entry(7.82)

    def prism(self, points, bottom, top, color=IVORY, flag=0):
        n = len(points)
        vertices = [(x, bottom, z) for x, z in points] + [(x, top, z) for x, z in points]
        faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))]
        faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
        self.indexed(vertices, faces, color, flag)

    def block(self, x, y, z, w, h, d, color=IVORY, flag=0, bevel=.15):
        # The plan chamfers prevent the Lego-like knife edges of boxes.
        a, b = w / 2, d / 2
        c = min(bevel, a * .3, b * .3)
        pts = [(x - a + c, z - b), (x + a - c, z - b), (x + a, z - b + c), (x + a, z + b - c), (x + a - c, z + b), (x - a + c, z + b), (x - a, z + b - c), (x - a, z - b + c)] if c else [(x-a,z-b),(x+a,z-b),(x+a,z+b),(x-a,z+b)]
        self.prism(pts, y, y + h, color, flag)

    def rings(self, rings, color=IVORY, flag=0, n=None, smooth=True):
        """Elliptical or offset horizontal profiles; useful for domes and eaves."""
        n = n or self.n
        verts = [(x + rx * math.cos(2 * math.pi * i / n), y, z + rz * math.sin(2 * math.pi * i / n)) for x, y, z, rx, rz in rings for i in range(n)]
        faces = [tuple(reversed(range(n))), tuple(range((len(rings)-1)*n, len(rings)*n))]
        for j in range(len(rings)-1):
            for i in range(n):
                k = j * n + i
                q = j * n + (i+1) % n
                faces.append((k,q,q+n,k+n))
        start=len(self.f)
        self.indexed(verts, faces, color, flag, smooth)
        self.smooth[start]=False
        self.smooth[start+1]=False

    def dome(self, x, y, z, rx, rz, h, color=TEAL):
        steps = 3 if self.low else 8
        self.rings([(x,y+h*math.sin(j*math.pi/2/steps),z,max(.025,rx*math.cos(j*math.pi/2/steps)),max(.025,rz*math.cos(j*math.pi/2/steps))) for j in range(steps+1)],color,.25)

    def tube(self, path, r=.08, color=GOLD, flag=.25, sides=None):
        if len(path) < 2:
            return
        sides = sides or (3 if self.low else 5)
        verts = []
        for j,p in enumerate(path):
            tangent = Vector(path[min(len(path)-1,j+1)]) - Vector(path[max(0,j-1)])
            tangent.normalize()
            u = tangent.cross(Vector((0,0,1)))
            if u.length < .01:
                u = tangent.cross(Vector((1,0,0)))
            u.normalize()
            v = tangent.cross(u).normalized()
            for k in range(sides):
                offset = r * (u * math.cos(k*2*math.pi/sides) + v * math.sin(k*2*math.pi/sides))
                verts.append(tuple(Vector(p)+offset))
        faces = [tuple(reversed(range(sides))),tuple(range((len(path)-1)*sides,len(path)*sides))]
        for j in range(len(path)-1):
            for k in range(sides):
                a = j*sides+k
                b = j*sides+(k+1)%sides
                faces.append((a,b,b+sides,a+sides))
        self.indexed(verts,faces,color,flag,True)

    def arch(self,x,y,z,w,h,glass=GLASS,frame=True):
        # Broad round-headed glazing, with real raised curved stone surrounds.
        n = 4 if self.low else 12
        r = w/2
        shoulder = y+h-r
        points = [(x-r,y,z),(x+r,y,z)] + [(x+r*math.cos(i*math.pi/n),shoulder+r*math.sin(i*math.pi/n),z) for i in range(n+1)]
        self.face(points,glass,.5)
        if frame and not self.low:
            self.tube([(x-r,y,z+.04),(x-r,shoulder,z+.04)]+[(x-r*math.cos(i*math.pi/n),shoulder+r*math.sin(i*math.pi/n),z+.04) for i in range(n+1)]+[(x+r,y,z+.04)],.105,PALE,0)
            self.tube([(x,y+.1,z+.06),(x,y+h-.15,z+.06)],.045,GOLD)
            self.block(x,y-.08,z+.07,w+.35,.16,.23,STONE)
            self.block(x,shoulder-.1,z+.08,w-.1,.07,.12,GOLD,.25,0)

    def entry(self,z=7.91,y=.52):
        self.arch(0,y,z,3.2,4.8,DARK)
        if not self.low:
            self.block(0,y,z+.03,.12,3.6,.1,GOLD,.25,0)
            for x in [-.3,.3]:
                self.tube([(x,y+1.5,z+.12),(x,y+2.1,z+.12)],.055,GOLD)

    def balcony(self,x,y,z,w):
        if self.low:
            return
        self.block(x,y,z,w,.22,1.15,PALE)
        self.tube([(x-w/2,y+1,z+.5),(x+w/2,y+1,z+.5)],.07,GOLD)
        for j in range(9):
            xx=x-w/2+w*j/8
            self.tube([(xx,y+.2,z+.5),(xx,y+1,z+.5)],.035,GOLD)

    def foliage(self,x,y,z,w=2.5,h=2):
        if self.low:
            return
        # Cascading tapered ivy sprays attach to ledges, never float at random.
        for k in range(3):
            xx=x+(k-1)*w*.32
            for j in range(4):
                yy=y-j*h/4
                zz=z+.07*math.sin(j*2+k)
                rr=.32*(1-j*.12)
                self.face([(xx,yy+.28,zz),(xx-rr,yy,zz+.15),(xx,yy-.35,zz+.08),(xx+rr,yy,zz+.1)],GREEN if j%2 else LEAF,.75)

    def windows(self, xs, rows, z=7.82,w=2,h=3):
        if self.low:
            return
        for y in rows:
            for x in xs:
                self.arch(x,y,z,w,h)

    def base(self,color=IVORY,h=11.5):
        self.block(0,0,0,20,.5,16,STONE,bevel=0)
        self.block(0,.5,0,19,h,15.5,color)
        self.block(0,h+.35,0,19.5,.4,15.8,PALE)
        if not self.low:
            self.block(0,.7,0,19.35,.35,15.8,STONE)
            self.block(0,4.85,0,19.25,.2,15.7,STONE)
        self.entry()

    def make(self,name,mat):
        mesh=bpy.data.meshes.new(name)
        mesh.from_pydata([(x,-z,y) for x,y,z in self.v],[],self.f)
        mesh.update()
        # Recalculate each connected component, preserving the sculpted normals.
        bm=bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(mesh)
        bm.free()
        colors=mesh.color_attributes.new(name="Color",type="FLOAT_COLOR",domain="CORNER")
        uv=mesh.uv_layers.new(name="Surface")
        for p,c,f,s in zip(mesh.polygons,self.c,self.flags,self.smooth):
            p.use_smooth=s
            for li in p.loop_indices:
                colors.data[li].color=c
                uv.data[li].uv=(f,0)
        obj=bpy.data.objects.new(name,mesh)
        bpy.context.collection.objects.link(obj)
        mesh.materials.append(mat)
        return obj


def observatory(b):
    b.block(0,0,0,20,.45,16,STONE,bevel=0)
    b.rings([(0,.45,0,7.6,7.65),(0,9.8,0,7.6,7.65)],IVORY,0,n=8 if b.low else 32)
    for x in [-7.2,7.2]:
        b.block(x,.45,-1.5,5.6,6.6,10.8,IVORY)
        b.block(x,7,-1.5,5.9,.35,11.1,PALE)
    b.radial_windows(7.6,7.65,1.3,5.2)
    b.entry(7.78)
    b.rings([(0,9.8,-.7,7.1,6.5),(0,15.3,-.7,7.1,6.5)],IVORY,0,n=8 if b.low else 32,smooth=False)
    b.rings([(0,14.9,-.7,7.3,6.7),(0,15.4,-.7,7.3,6.7)],GOLD,.25)
    b.dome(0,15.4,-.7,7.15,6.55,6.2)
    if not b.low:
        for a in range(0,360,45):
            t=math.radians(a)
            b.tube([(7.2*math.cos(t)*math.cos(j*math.pi/16),15.5+6.2*math.sin(j*math.pi/16),-.7+6.6*math.sin(t)*math.cos(j*math.pi/16)) for j in range(9)],.075)
        b.windows([-7.2,7.2],[1.3],z=3.94,w=2.2,h=4.7)
        for x in [-5,5]:
            b.arch(x,10.8,5.85,2,3.1)
    b.rings([(0,21.5,-.7,.6,.6),(0,23.2,-.7,.1,.1)],GOLD,.25,n=6)
    if not b.low:
        b.tube([(1.2*math.cos(t),24+.95*math.sin(t),-.7) for t in [i*math.pi/10+.6 for i in range(17)]],.15)


def conservatory(b):
    b.podium(IVORY,2.1)
    # A long glass barrel vault, articulated by slender gilded ribs.
    n=6 if b.low else 20
    verts=[]
    for z in [-7.5,7.5]:
        verts += [(9*math.cos(j*math.pi/n),2.25+15*math.sin(j*math.pi/n),z) for j in range(n+1)]
    faces=[tuple(reversed(range(n+1))),tuple(range(n+1,2*n+2))]
    faces += [(j,j+1,j+n+2,j+n+1) for j in range(n)]
    b.indexed(verts,faces,GLASS,.5,True)
    b.smooth[-len(faces)]=False
    b.smooth[-len(faces)+1]=False
    if not b.low:
        for z in [-7.5,-5,-2.5,0,2.5,5,7.5]:
            b.tube([(9*math.cos(j*math.pi/n),2.25+15*math.sin(j*math.pi/n),z) for j in range(n+1)],.11,PALE,0)
        for j in [4,8,12,16]:
            t=j*math.pi/n
            b.tube([(9*math.cos(t),2.25+15*math.sin(t),-7.5),(9*math.cos(t),2.25+15*math.sin(t),7.5)],.08)
        b.detail("nouveau",0,9.4,7.58,5.1,7.5,.28,PALE,0)
        for x in [-6.9,6.9]:
            b.block(x,.45,7.65,.5,6.5,.4,PALE)
    b.block(0,5.8,7.6,6,.6,.5,GOLD,.25)
    b.entry(7.94)
    b.foliage(-7,7.3,7.9,3,3)
    b.foliage(7,7.3,7.9,3,3)


def palazzo(b):
    b.base(ROSE,12)
    b.block(0,12.7,-1,11,2.7,12,IVORY)
    b.block(0,15.4,-1,11.6,.5,12.5,PALE)
    b.block(0,15.9,-1,7.5,2.3,10,ROSE)
    b.block(0,18.2,-1,8,.35,10.5,GOLD,.25)
    b.dome(0,18.5,-1,4,4,3.3,PINK)
    if not b.low:
        b.windows([-6.8,-3.6,3.6,6.8],[1.4,7],w=2.4,h=3.6)
        for x in [-3,0,3]:
            b.arch(x,12.9,5.05,1.8,2.1,frame=False)
        for x in [-7,7]:
            b.balcony(x,6.5,7.3,4)
            b.foliage(x,6.5,7.9,3.5,2)
        for x in [-9,-1.9,1.9,9]:
            b.block(x,.8,7.75,.35,11.2,.25,PALE)
    b.arch(0,6.2,7.91,3,4.6)
    b.balcony(0,5.9,7.2,5)
    b.side_windows()
    b.detail("nouveau",0,8.8,7.96,2.7,4.5,.21,PALE,0)


def theater(b):
    b.base(PINK,10.3)
    # Cascading Deco setbacks instead of a rectangular apartment roof.
    for w,y,h,d in [(16,10.9,2.2,13),(12.8,13.1,2.3,11),(9.4,15.4,2.3,9),(5.8,17.7,2.3,6.8)]:
        b.block(0,y,-1,w,h,d,ROSE)
        b.block(0,y+h-.18,-1,w+.3,.23,d+.3,GOLD,.25)
    b.arch(0,5.6,7.85,10.8,10,DARK,False)
    if not b.low:
        for r in [3.7,4.4,5.1,5.8]:
            b.tube([(-r,6.2,7.95),(-r,10.3,7.95)]+[(r*math.cos(math.pi-j*math.pi/20),10.3+r*math.sin(j*math.pi/20),7.95) for j in range(21)]+[(r,6.2,7.95)],.09,GOLD)
        for x in [-8,-6.5,6.5,8]:
            b.block(x,1,7.89,.28,9.2,.18,GOLD,.25)
        for x in [-8,8]:
            b.arch(x,1.3,7.92,1.5,4.5)
    b.block(0,5.4,7,12,.55,2,GOLD,.25)
    if not b.low:
        for x in [-5,-3,-1,1,3,5]:
            b.dome(x,5.3,7,1,1,.45,GOLD)
            b.block(x,5.2,7.7,.4,.12,.25,LIGHT,1)
    b.entry(7.97)
    b.side_windows((1.3,),2.5,7.6)


def ribbon(b):
    b.podium(PALE,3,True)
    # Glazing and roof follow the same undulating boundary, with no flat cap
    # intersecting a tilted plate. The silhouette has three gentle lobes.
    n=8 if b.low else 40
    wave=lambda a:1.15*math.sin(2*a+.5)+.45*math.cos(3*a)
    glass=[(9.4*math.cos(i*2*math.pi/n),y+(wave(i*2*math.pi/n) if y>3 else 0),7.5*math.sin(i*2*math.pi/n)) for y in [3,15.8] for i in range(n)]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    start=len(b.f)
    b.indexed(glass,faces,GLASS,.5,True)
    b.smooth[start]=False
    b.smooth[start+1]=False
    b.radial_windows(9.45,7.55,3.2,6.9)
    # Three continuous sculpted wave crowns wrap an oval pavilion.
    for level in [10.8,13.3,15.8]:
        n=8 if b.low else 40
        pts=[]
        for yoff in [0,.55]:
            for i in range(n):
                a=i*2*math.pi/n
                pts.append((9.5*math.cos(a),level+yoff+wave(a),7.6*math.sin(a)))
        faces=[tuple(range(n)),tuple(reversed(range(n,2*n)))]
        faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        b.indexed(pts,faces,IVORY if level!=13.3 else ROSE,0,True)
        if not b.low:
            b.tube([(9.5*math.cos(a),level+.56+wave(a),7.6*math.sin(a)) for a in [i*2*math.pi/n for i in range(n+1)]],.07,GOLD)
    if not b.low:
        for a in range(12):
            t=a*math.pi/6
            b.tube([(9.45*math.sin(t),3,7.55*math.cos(t)),(9.45*math.sin(t),15.8+wave(math.pi/2-t),7.55*math.cos(t))],.095,PALE,0)
    b.balcony(0,5.6,7.25,6)
    b.foliage(-7,11.1,7.8,4,3)
    b.foliage(6,13,7.8,4,3)


def pagoda(b):
    b.podium(LILAC,8.7,True)
    b.radial_windows(9.5,7.55,1.2,5.5)
    for y,rx,rz,h in [(9.2,9.8,7.8,3.8),(13,7.5,6.1,3.5),(16.5,5.2,4.3,4.2)]:
        b.rings([(0,y,0,rx,rz),(0,y+.4,0,rx*.94,rz*.94),(0,y+h*.6,0,rx*.68,rz*.68),(0,y+h,0,rx*.48,rz*.48)],JADE,.25,n=8 if b.low else 32,smooth=True)
        if not b.low:
            b.rings([(0,y-.16,0,rx,rz),(0,y+.07,0,rx,rz)],GOLD,.25)
            for a in [0,math.pi/2,math.pi,math.pi*1.5]:
                b.tube([(rx*math.cos(a)*(1-t*.52),y+.4+h*(t**1.7),rz*math.sin(a)*(1-t*.52)) for t in [i/10 for i in range(11)]],.075,GOLD)
    b.rings([(0,20.5,0,.55,.55),(0,23,0,.06,.06)],GOLD,.25,n=8)
    b.windows([-3,0,3],[11.8],z=4.8,w=1.6,h=2.7)
    for x in [-7,7]:
        b.foliage(x,8.8,7.8,3,3)


def heritage(b):
    b.base(IVORY,12)
    # A genuine flared mansard profile, punctuated by an attached corner tower.
    b.rings([(0,12.6,-.3,9.7,7.8),(0,13.2,-.3,9.8,7.8),(0,16.8,-.3,7.1,5.2),(0,17.7,-.3,6.7,4.8)],TEAL,.25,n=8,smooth=False)
    b.rings([(-6.4,10.6,3.7,3.1,3.3),(-6.4,17.7,3.7,3.1,3.3)],ROSE,0,n=8,smooth=False)
    b.dome(-6.4,17.7,3.7,3.4,3.5,4.3,JADE)
    b.rings([(-6.4,21.8,3.7,.4,.4),(-6.4,23.5,3.7,.04,.04)],GOLD,.25,n=6)
    b.windows([-6.5,-3.2,3.2,6.5],[1.4,7],w=2.2,h=3.6)
    if not b.low:
        for x in [-2,2,6]:
            b.block(x,13,5.7,2.4,2.7,1.5,IVORY)
            b.arch(x,13.2,6.49,1.6,2.2)
            b.dome(x,15.6,5.7,1.4,1,1.1,TEAL)
        b.balcony(3.2,6.4,7.2,5)
        b.foliage(6,12.4,7.8,4,3)
        b.detail("balcony",3.2,7.1,7.9,5,1.2,.36,TIMBER,0)
        for x in [-3.2,3.2,6.5]:
            b.detail("shutters",x,8.8,7.98,3.1,3.7,.38,JADE,.25)
    b.side_windows()


def shell(b):
    b.podium(IVORY,3.2,True)
    b.rings([(0,3.4,0,9.4,7.45),(0,8,0,9.4,7.45)],GLASS,.5)
    # Scallop shell roof: radiating vaulted petals, a pearlescent coastal hall.
    n=6 if b.low else 18
    rings=3 if b.low else 10
    verts=[]
    for j in range(rings+1):
        t=j/rings
        for i in range(n+1):
            a=-math.pi/2+i*math.pi/n
            rr=math.sin(t*math.pi/2)
            scallop=1.6*math.sin(i*math.pi*6/n)**2
            verts.append((9.6*math.sin(a)*rr,8+(10+2*math.sin(a))*math.cos(t*math.pi/2)+scallop*rr,-6+13.5*math.cos(a)*rr))
    faces=[(j*(n+1)+i,j*(n+1)+i+1,(j+1)*(n+1)+i+1,(j+1)*(n+1)+i) for j in range(rings) for i in range(n)]
    b.indexed(verts,faces,ROSE,0,True)
    # Close the rear wall and underside: the shell is an exterior volume.
    b.face([(0,8,-6)]+[verts[j*(n+1)] for j in range(rings,-1,-1)]+[verts[j*(n+1)+n] for j in range(rings+1)],ROSE)
    b.face([verts[rings*(n+1)+i] for i in range(n+1)]+[(0,8,-6)],PALE)
    if not b.low:
        for k in range(7):
            a=-math.pi/2+k*math.pi/6
            b.tube([(9.6*math.sin(a)*math.sin(j*math.pi/20),8+(10+2*math.sin(a))*math.cos(j*math.pi/20),-6+13.5*math.cos(a)*math.sin(j*math.pi/20)) for j in range(11)],.1,GOLD)
        b.radial_windows(9.4,7.45,3.6,3.9)
        b.foliage(-7,7.6,7.8,3,2)
    b.arch(0,1.2,7.88,5.2,6.2,DARK)
    b.entry(7.95)


def sail(b):
    b.podium(PALE,2.4,True)
    b.rings([(0,2.65,0,9.4,7.45),(0,9,0,9.4,7.45)],GLASS,.5)
    b.radial_windows(9.4,7.45,2.9,5.8)
    # Wind-sculpted ridges rise toward two off-center masts.
    for cx,w,h,zc in [(-3,12,13,-1),(4.1,9.4,17,-1.8)]:
        n=4 if b.low else 16
        verts=[]
        for i in range(n+1):
            t=i/n
            xx=cx-w/2+w*t
            ridge=9+h*math.sin(math.pi*t)**.8
            for z,yoff in [(-6.8,0),(zc,ridge-9),(6.6,0)]:
                verts.append((xx,9+yoff,z))
        faces=[]
        for i in range(n):
            for j in range(2):
                k=i*3+j
                faces.append((k,k+3,k+4,k+1))
        # The thin underside and closed perimeter give a real canopy thickness.
        top=len(verts)
        verts += [(x,y-.18,z) for x,y,z in verts]
        faces += [tuple(i+top for i in reversed(f)) for f in list(faces)]
        border=[i*3 for i in range(n+1)]+[n*3+1]+[i*3+2 for i in range(n,-1,-1)]+[1]
        faces += [(border[i],border[(i+1)%len(border)],border[(i+1)%len(border)]+top,border[i]+top) for i in range(len(border))]
        b.indexed(verts,faces,BLUE if cx<0 else PALE,.25,True)
        if not b.low:
            b.tube([(cx-w/2+w*i/n,9+h*math.sin(math.pi*i/n)**.8,zc) for i in range(n+1)],.12,GOLD)
            for i in [2,4,6,8,10,12,14]:
                t=i/n
                xx=cx-w/2+w*t
                peak=9+h*math.sin(math.pi*t)**.8
                b.tube([(xx,9,6.6),(xx,peak,zc),(xx,9,-6.8)],.055,PALE,0)
    b.foliage(6,9.3,7.8,4,2.5)


def storybook(b):
    b.base(ROSE,10.5)
    # Three tall gables have concave hips, broad eaves and gilded ridge lines.
    for x,w,h in [(-5.8,7.3,7),(0,8.6,11),(5.8,7.3,8)]:
        n=4 if b.low else 8
        profile=[(x-w/2+w*i/n,11+h*(1-abs(2*i/n-1))**1.5) for i in range(n+1)]
        verts=[(xx,yy,z) for z in [-7.4,7.4] for xx,yy in profile]
        faces=[tuple(range(n+1)),tuple(reversed(range(n+1,2*n+2)))]
        faces += [(i,i+1,i+n+2,i+n+1) for i in range(n)]
        b.indexed(verts,faces,JADE,.25)
        if not b.low:
            b.tube([(xx,yy+.05,7.45) for xx,yy in profile],.1,GOLD)
            b.tube([(x,11+h,-7.4),(x,11+h,7.4)],.1,GOLD)
            b.arch(x,11.2,7.5,min(2.8,w*.4),h*.55,GLASS)
    # Replace the left authored gable with the owner's curved tiled roof mesh.
    b.detail("tiles",-5.6,14.6,0,8.3,8.5,15.2,JADE,.25)
    b.detail("timber",0,10.6,7.93,17.5,.3,.42,TIMBER,0)
    b.windows([-7,-3.8,3.8,7],[1.2,6],w=2.2,h=3.6)
    b.balcony(0,6,7.2,5)
    for x in [-7,7]:
        b.foliage(x,10.7,7.8,4,4)
        b.detail("shutters",x,7.8,7.94,3,3.3,.38,TIMBER,0)
    b.detail("balcony",0,6.7,7.92,5,1.1,.32,TIMBER,0)
    b.side_windows()


def lantern(b):
    b.podium(BLUE,8.8,True)
    b.radial_windows(9.5,7.55,1.1,6.1)
    # An octagonal luminous jewel is a skyline marker, not another apartment.
    for y,rx,h in [(9.3,7.4,4.5),(14.4,5.8,4.1),(19.1,3.8,3.1)]:
        b.rings([(0,y,0,rx,rx*.84),(0,y+h,0,rx,rx*.84)],GLASS,.5,n=8,smooth=False)
        b.rings([(0,y-.25,0,rx+.4,(rx+.4)*.84),(0,y+.12,0,rx+.4,(rx+.4)*.84)],GOLD,.25,n=8,smooth=False)
        b.rings([(0,y+h,0,rx+.6,(rx+.6)*.84),(0,y+h+.6,0,rx*.65,rx*.55)],JADE,.25,n=8,smooth=False)
        if not b.low:
            for i in range(8):
                a=i*math.pi/4
                x,z=rx*math.cos(a),rx*.84*math.sin(a)
                b.tube([(x,y,z),(x,y+h,z)],.12,GOLD)
                b.tube([(x,y+.2,z),(rx*math.cos(a+math.pi/8),y+h-.2,rx*.84*math.sin(a+math.pi/8))],.05,GOLD)
    b.dome(0,22.8,0,3,2.8,1.8,TEAL)
    b.rings([(0,24.5,0,.38,.38),(0,25.8,0,.04,.04)],GOLD,.25,n=6)
    b.foliage(-7,9,7.8,3,2.5)
    b.foliage(7,9,7.8,3,2.5)


def terrace(b):
    b.base(IVORY,7.2)
    for y,w,d,z in [(7.8,17,13,-.7),(11.5,13.5,10,-2.2),(15.2,9,7,-3.7)]:
        b.block(0,y,z,w,3.4,d,ROSE)
        b.block(0,y+3.3,z,w+.65,.4,d+.6,PALE)
        if not b.low:
            b.windows([-w*.32,0,w*.32],[y+.3],z=z+d/2+.04,w=2,h=2.8)
            b.block(0,y+3.72,z+d/2-.1,w-.6,.22,.75,GREEN,.75)
            for x in [-w*.35,w*.35]:
                b.foliage(x,y+3.7,z+d/2+.22,3,2.7)
                # Topiary forms are architectural garden crowns.
                b.rings([(x,y+3.7,z+d/2-.45,.65,.6),(x,y+5,z+d/2-.45,.9,.8),(x,y+5.5,z+d/2-.45,.35,.35)],GREEN,.75,n=8)
    b.windows([-6.8,-3.5,3.5,6.8],[1.1],w=2.3,h=5.5)
    b.balcony(0,6.3,7.2,7)
    b.side_windows((1.1,),2,5)
    b.detail("balcony",0,7,7.92,7,1.1,.35,GOLD,.25)
    for x in [-6.8,6.8]:
        b.detail("vine",x,6.1,7.99,2.8,3.7,.35,GREEN,.75)


BUILDERS={name:globals()[name] for name in KINDS}


def material():
    mat=bpy.data.materials.new("DreamSurface")
    mat.use_nodes=True
    nodes=mat.node_tree.nodes
    bsdf=nodes.get("Principled BSDF")
    colors=nodes.new("ShaderNodeVertexColor")
    colors.layer_name="Color"
    mat.node_tree.links.new(colors.outputs["Color"],bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value=.65
    return mat


def render_contact(objects):
    """A reproducible daylight board: actual vertex paint, shadows and labels."""
    scene=bpy.context.scene
    scene.render.engine="BLENDER_EEVEE"
    scene.render.resolution_x=1800
    scene.render.resolution_y=1500
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.world.color=(.3,.3,.3)
    scene.view_settings.view_transform="Standard"
    scene.render.film_transparent=False
    scene.render.image_settings.color_mode="RGBA"
    for i,obj in enumerate(objects):
        obj.location=(i%4*28, i//4*38, 0)
    # Camera looks from +x, front (-Blender Y), down enough to show roof craft.
    cam=bpy.data.objects.new("ContactCamera",bpy.data.cameras.new("ContactCamera"))
    scene.collection.objects.link(cam)
    target=Vector((42,35,4))
    cam.location=target+Vector((45,-110,100))
    cam.rotation_euler=(target-cam.location).to_track_quat("-Z","Y").to_euler()
    cam.data.type="ORTHO"
    cam.data.ortho_scale=137
    scene.camera=cam
    light=bpy.data.objects.new("Sun",bpy.data.lights.new("Sun","SUN"))
    scene.collection.objects.link(light)
    light.data.energy=3
    light.rotation_euler=(.5,-.4,-.5)
    light.data.angle=.15
    area=bpy.data.objects.new("Fill",bpy.data.lights.new("Fill","AREA"))
    scene.collection.objects.link(area)
    area.location=(20,-40,80)
    area.data.energy=10000
    area.data.shape="DISK"
    area.data.size=100
    for i,obj in enumerate(objects):
        curve=bpy.data.curves.new(obj.name,"FONT")
        curve.body=obj.name
        curve.align_x="CENTER"
        curve.size=1.5
        label=bpy.data.objects.new(obj.name+" label",curve)
        scene.collection.objects.link(label)
        label.location=(obj.location.x,obj.location.y-12,.1)
        label.rotation_euler=(0,0,0)
    scene.render.filepath=PREVIEW
    bpy.ops.render.render(write_still=True)


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    load_details()
    mat=material()
    objects=[]
    costs={}
    for kind in KINDS:
        costs[kind]={}
        for low in [False,True]:
            b=Builder(low)
            BUILDERS[kind](b)
            obj=b.make(kind+("-lo" if low else ""),mat)
            tri=sum(len(p.vertices)-2 for p in obj.data.polygons)
            costs[kind]["lo" if low else "tris"]=tri
            print("DREAM",obj.name,tri,"triangles",flush=True)
            objects.append(obj)
    OUT.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=str(OUT),export_format="GLB",export_materials="EXPORT",export_normals=True,export_texcoords=True,export_cameras=False,export_lights=False,export_apply=True)
    # Count the real exported triangle indices, including n-gon triangulation.
    # This intentionally does not estimate costs from the source polygon list.
    raw=OUT.read_bytes()
    length=struct.unpack_from("<I",raw,12)[0]
    document=json.loads(raw[20:20+length])
    for node in document["nodes"]:
        if "mesh" not in node:
            continue
        name=node["name"]
        key=name.removesuffix("-lo")
        primitive=document["meshes"][node["mesh"]]["primitives"]
        assert len(primitive)==1, (name,"must remain one draw primitive")
        tris=sum(document["accessors"][p["indices"]]["count"]//3 for p in primitive)
        costs[key]["lo" if name.endswith("-lo") else "tris"]=tris
    dest=ROOT/"src/game/city/dreamCosts.generated.ts"
    dest.write_text("/** Exact exported triangle counts from art/city/build_dream_city.py. Do not edit. */\nexport const DREAM_MODEL_COST = "+json.dumps(costs,indent=2)+" as const;\n")
    if PREVIEW:
        for obj in objects:
            obj.hide_render=obj.name.endswith("-lo")
        render_contact([obj for obj in objects if not obj.name.endswith("-lo")])


main()
