#!/usr/bin/env python3
"""Build script for Spooky Master PWA / Netlify static publish bundle.

Packages all SPA templates, static assets, PWA manifest, service worker,
and Netlify headers/redirects into dist/ for deployment.
"""

import shutil
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT_DIR / "dist"
SRC_WEB_DIR = ROOT_DIR / "src" / "halloween_quiz" / "web"
STATIC_DIR = SRC_WEB_DIR / "static"
TEMPLATES_DIR = SRC_WEB_DIR / "templates"
ASSETS_DIR = ROOT_DIR / "assets"
PUBLIC_DIR = ROOT_DIR / "public"
NETLIFY_TOML = ROOT_DIR / "netlify.toml"


def build(output_dir: Path = DIST_DIR) -> None:
    print(f"Building Spooky Master PWA into {output_dir}...")

    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. HTML Shell Templates
    index_html = TEMPLATES_DIR / "index.html"
    if index_html.exists():
        shutil.copy2(index_html, output_dir / "index.html")
    offline_html = TEMPLATES_DIR / "offline.html"
    if offline_html.exists():
        shutil.copy2(offline_html, output_dir / "offline.html")
    privacy_html = TEMPLATES_DIR / "privacy.html"
    if privacy_html.exists():
        shutil.copy2(privacy_html, output_dir / "privacy.html")

    # 2. Static directory
    if STATIC_DIR.exists():
        shutil.copytree(STATIC_DIR, output_dir / "static", dirs_exist_ok=True)

    # 3. Root PWA files
    for root_file in ["sw.js", "manifest.json", "favicon.svg", "icon-192.png", "icon-512.png", "logo.svg"]:
        src_file = STATIC_DIR / root_file
        if src_file.exists():
            shutil.copy2(src_file, output_dir / root_file)

    # 4. Assets & Sounds
    if ASSETS_DIR.exists():
        shutil.copytree(ASSETS_DIR, output_dir / "assets", dirs_exist_ok=True)
        sounds_dir = ASSETS_DIR / "sounds"
        if sounds_dir.exists():
            shutil.copytree(sounds_dir, output_dir / "sounds", dirs_exist_ok=True)

    # 5. Public headers and redirects
    if PUBLIC_DIR.exists():
        for item in PUBLIC_DIR.iterdir():
            if item.is_file():
                shutil.copy2(item, output_dir / item.name)

    # Guarantee _headers and _redirects exist in dist
    headers_file = output_dir / "_headers"
    redirects_file = output_dir / "_redirects"

    if not headers_file.exists() and (PUBLIC_DIR / "_headers").exists():
        shutil.copy2(PUBLIC_DIR / "_headers", headers_file)
    if not redirects_file.exists() and (PUBLIC_DIR / "_redirects").exists():
        shutil.copy2(PUBLIC_DIR / "_redirects", redirects_file)

    # Guarantee netlify.toml is copied to build output
    if NETLIFY_TOML.exists():
        shutil.copy2(NETLIFY_TOML, output_dir / "netlify.toml")

    print(f"Successfully built Spooky Master PWA into {output_dir}")


if __name__ == "__main__":
    out = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DIST_DIR
    build(out)
