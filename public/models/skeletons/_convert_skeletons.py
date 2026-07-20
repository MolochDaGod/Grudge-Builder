"""
Headless Blender: import Skeletons_Free FBX → clean GLB.
Usage:
  blender -b -P _convert_skeletons.py
"""
import bpy
import os
import sys
import math
from mathutils import Vector

SRC_DIR = r"F:\GitHub\GrudgeBuilder\public\models\skeletons"
OUT_DIR = SRC_DIR
TEX_PATH = os.path.join(SRC_DIR, "Texture.png")
TARGET_HEIGHT = 1.7

JOBS = [
    ("Skeleton.fbx", "Skeleton.glb"),
    ("Skeleton_Archer.fbx", "Skeleton_Archer.glb"),
]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    # purge orphans
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.armatures, bpy.data.images, bpy.data.actions):
        for b in list(block):
            if b.users == 0:
                block.remove(b)


def import_fbx(path: str):
    # Prefer FBX import with animations + materials
    bpy.ops.import_scene.fbx(
        filepath=path,
        use_anim=True,
        automatic_bone_orientation=True,
        ignore_leaf_bones=False,
        force_connect_children=False,
        use_custom_normals=True,
        use_image_search=True,
    )


def apply_bone_material():
    """Bind Texture.png or ivory PBR if missing."""
    img = None
    if os.path.isfile(TEX_PATH):
        img = bpy.data.images.load(TEX_PATH, check_existing=True)

    for mat in bpy.data.materials:
        mat.use_nodes = True
        nt = mat.node_tree
        nodes = nt.nodes
        links = nt.links
        # clear and rebuild simple Principled
        nodes.clear()
        out = nodes.new("ShaderNodeOutputMaterial")
        bsdf = nodes.new("ShaderNodeBsdfPrincipled")
        bsdf.location = (0, 0)
        out.location = (300, 0)
        links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
        if img:
            tex = nodes.new("ShaderNodeTexImage")
            tex.image = img
            tex.location = (-300, 0)
            links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        else:
            bsdf.inputs["Base Color"].default_value = (0.91, 0.88, 0.83, 1.0)
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = 0.78
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = 0.04


def ground_and_scale(target_h: float):
    """Join scale: normalize max world height to target_h, feet on y=0."""
    # update depsgraph
    bpy.context.view_layer.update()
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        return

    # world bounds of all meshes
    min_c = Vector((1e9, 1e9, 1e9))
    max_c = Vector((-1e9, -1e9, -1e9))
    for o in meshes:
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            min_c.x = min(min_c.x, w.x)
            min_c.y = min(min_c.y, w.y)
            min_c.z = min(min_c.z, w.z)
            max_c.x = max(max_c.x, w.x)
            max_c.y = max(max_c.y, w.y)
            max_c.z = max(max_c.z, w.z)

    # Blender Z-up: height is Z
    height = max_c.z - min_c.z
    if height < 1e-6:
        return
    scale = target_h / height
    # Parent everything under empty for uniform transform, or scale roots
    roots = [o for o in bpy.context.scene.objects if o.parent is None]
    for o in roots:
        o.scale *= scale
        o.location *= scale
    bpy.context.view_layer.update()

    # re-measure and drop to ground
    min_c = Vector((1e9, 1e9, 1e9))
    max_c = Vector((-1e9, -1e9, -1e9))
    for o in bpy.context.scene.objects:
        if o.type != "MESH":
            continue
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            min_c.x = min(min_c.x, w.x)
            min_c.y = min(min_c.y, w.y)
            min_c.z = min(min_c.z, w.z)
            max_c.x = max(max_c.x, w.x)
            max_c.y = max(max_c.y, w.y)
            max_c.z = max(max_c.z, w.z)

    # center XZ, feet at Z=0
    cx = (min_c.x + max_c.x) * 0.5
    cy = (min_c.y + max_c.y) * 0.5
    for o in roots:
        o.location.x -= cx
        o.location.y -= cy
        o.location.z -= min_c.z
    bpy.context.view_layer.update()


def export_glb(path: str):
    # Select all for export
    bpy.ops.object.select_all(action="SELECT")
    kwargs = dict(
        filepath=path,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_animations=True,
        export_skins=True,
        export_morph=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_yup=True,  # glTF Y-up
    )
    # Blender version differences: try modern, fall back
    try:
        bpy.ops.export_scene.gltf(**kwargs)
    except TypeError:
        # older/newer API
        safe = {
            k: v
            for k, v in kwargs.items()
            if k
            in (
                "filepath",
                "export_format",
                "use_selection",
                "export_apply",
                "export_animations",
                "export_skins",
                "export_yup",
            )
        }
        bpy.ops.export_scene.gltf(**safe)


def convert_one(fbx_name: str, glb_name: str):
    fbx = os.path.join(SRC_DIR, fbx_name)
    glb = os.path.join(OUT_DIR, glb_name)
    if not os.path.isfile(fbx):
        print("MISSING", fbx)
        return False
    clear_scene()
    print("IMPORT", fbx)
    import_fbx(fbx)
    apply_bone_material()
    ground_and_scale(TARGET_HEIGHT)
    print("EXPORT", glb)
    export_glb(glb)
    size = os.path.getsize(glb) if os.path.isfile(glb) else 0
    print("OK", glb, size)
    return size > 0


def main():
    print("Blender", bpy.app.version_string)
    ok = True
    for fbx, glb in JOBS:
        if not convert_one(fbx, glb):
            ok = False
    # also copy-ready note
    print("DONE", "success" if ok else "partial")
    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
