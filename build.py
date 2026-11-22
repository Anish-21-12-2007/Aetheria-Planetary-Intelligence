#!/usr/bin/env python3
"""
AETHERIA — Planetary Systems Intelligence Platform
Single-Entry-Point Production Bundler & GLSL 300 es Static Linter
Outputs one clean production entry point: index.html (and Canvas preview copy).
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_INDEX = os.path.join(ROOT, "index.html")
OUT_ARTIFACT = os.path.join(
    ROOT, "artifacts", "file_generation", "ttl=63d", "output", "index.html"
)

MANIFEST = [
    "src/math/MathCore.js",
    "src/core/MaterialsData.js",
    "src/core/ScienceModel.js",
    "src/core/IntelligenceEngine.js",
    "src/core/AppState.js",
    "src/story/StoryEngine.js",
    "src/engine/WebGL2Engine.js",
    "src/engine/PostProcess.js",
    "src/engine/CameraRig.js",
    "src/audio/AudioEngine.js",
    "src/scene/AetheriaCommunityScene.js",
    "src/scene/Fallback2DView.js",
    "src/ui/Charts.js",
    "src/ui/ReportBuilder.js",
    "src/ui/AetheriaApp.js",
]

CSS_PATH = os.path.join(ROOT, "src/ui/styles.css")
HTML_TEMPLATE_PATH = os.path.join(ROOT, "src/ui/index.template.html")


def audit_glsl_in_js(js_source, filename):
    errors = []
    pattern = re.compile(r"`([^`]*#version 300 es[^`]*)`", re.DOTALL)
    matches = pattern.findall(js_source)
    for idx, raw in enumerate(matches):
        cleaned = re.sub(r"\$\{[^}]+\}", "1", raw)
        lines = cleaned.splitlines()
        first_non_empty = next((l.strip() for l in lines if l.strip()), "")
        if not first_non_empty.startswith("#version 300 es"):
            errors.append(f"{filename} shader #{idx+1}: #version 300 es must be first line")
        if "precision " not in cleaned:
            errors.append(f"{filename} shader #{idx+1}: missing precision qualifier")
        if re.search(r"\btexture2D\s*\(", cleaned):
            errors.append(f"{filename} shader #{idx+1}: WebGL1 texture2D() leak")
        if re.search(r"\bgl_FragColor\b", cleaned):
            errors.append(f"{filename} shader #{idx+1}: WebGL1 gl_FragColor leak")
        if cleaned.count("{") != cleaned.count("}"):
            errors.append(f"{filename} shader #{idx+1}: unbalanced braces")
    return len(matches), errors


def build():
    included_js = []
    total_shaders = 0
    glsl_errors = []

    for rel in MANIFEST:
        full = os.path.join(ROOT, rel)
        if not os.path.exists(full):
            print(f"MISSING MODULE: {rel}", file=sys.stderr)
            sys.exit(1)
        with open(full, "r", encoding="utf-8") as f:
            src = f.read()
        scount, errs = audit_glsl_in_js(src, rel)
        total_shaders += scount
        glsl_errors.extend(errs)
        included_js.append(f"\n/* ==== MODULE: {rel} ==== */\n" + src)

    js_bundle = "\n".join(included_js)
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as tf:
        tf.write(js_bundle)
        tmp_js = tf.name
    try:
        res = subprocess.run(["node", "--check", tmp_js], capture_output=True, text=True)
        if res.returncode != 0:
            print("JS SYNTAX ERROR:\n" + res.stderr, file=sys.stderr)
            sys.exit(1)
    finally:
        os.unlink(tmp_js)

    if glsl_errors:
        print("GLSL AUDIT FAILED:\n" + "\n".join(glsl_errors), file=sys.stderr)
        sys.exit(1)

    with open(CSS_PATH, "r", encoding="utf-8") as f:
        css = f.read()
    with open(HTML_TEMPLATE_PATH, "r", encoding="utf-8") as f:
        tpl = f.read()

    html = tpl.replace("/*__CSS__*/", css).replace("/*__JS__*/", js_bundle)
    with open(OUT_INDEX, "w", encoding="utf-8") as f:
        f.write(html)
    os.makedirs(os.path.dirname(OUT_ARTIFACT), exist_ok=True)
    shutil.copy2(OUT_INDEX, OUT_ARTIFACT)

    size_kb = os.path.getsize(OUT_INDEX) / 1024.0
    print(f"BUILD OK: {len(MANIFEST)} modules | {total_shaders} GLSL 300 es shaders | {len(html.splitlines())} lines | {size_kb:.1f} KB -> index.html")


if __name__ == "__main__":
    build()
