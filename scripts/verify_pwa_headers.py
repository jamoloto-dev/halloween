#!/usr/bin/env python3
"""Pipeline verification script for PWA offline readiness and Netlify headers.

Validates that:
1. _headers, manifest.json, and the Service Worker (sw.js) exist in the build output.
2. Required Service-Worker-Allowed, Cache-Control, and CORS headers are configured.
3. SPA offline fallback routing (/* /index.html 200) is defined.
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_BUILD_DIR = ROOT_DIR / "dist"


def verify_pwa_headers(build_dir: Path) -> None:
    errors = []
    print(f"[verify-pwa-headers] Validating PWA offline headers in: {build_dir}")

    if not build_dir.exists():
        print(f"FAIL: Build directory does not exist: {build_dir}")
        sys.exit(1)

    # 1. Check required build output files
    headers_file = build_dir / "_headers"
    manifest_file = build_dir / "manifest.json"
    sw_file = build_dir / "sw.js"
    sw_alt = build_dir / "service-worker.js"
    redirects_file = build_dir / "_redirects"
    netlify_toml = build_dir / "netlify.toml"

    if not headers_file.exists():
        errors.append("Missing '_headers' file in build output.")

    if not manifest_file.exists():
        errors.append("Missing 'manifest.json' file in build output.")

    if not sw_file.exists() and not sw_alt.exists():
        errors.append("Missing Service Worker ('sw.js' or 'service-worker.js') in build output.")

    # 2. Inspect header rules in _headers and netlify.toml
    headers_text = headers_file.read_text(encoding="utf-8") if headers_file.exists() else ""
    toml_text = netlify_toml.read_text(encoding="utf-8") if netlify_toml.exists() else ""
    combined_headers = headers_text + chr(10) + toml_text

    # Service-Worker-Allowed check
    if "Service-Worker-Allowed" not in combined_headers or "/" not in combined_headers:
        errors.append("Missing 'Service-Worker-Allowed: /' in header configuration.")

    # Service Worker Cache-Control check
    if "no-cache" not in combined_headers or "no-store" not in combined_headers or "must-revalidate" not in combined_headers:
        errors.append("Missing 'Cache-Control: no-cache, no-store, must-revalidate' for service worker in header configuration.")

    # Web Manifest Cache-Control check
    if "max-age=0" not in combined_headers or "must-revalidate" not in combined_headers:
        errors.append("Missing 'Cache-Control: public, max-age=0, must-revalidate' for manifest in header configuration.")

    # Static assets Cache-Control & CORS check
    if "31536000" not in combined_headers or "immutable" not in combined_headers:
        errors.append("Missing 'Cache-Control: public, max-age=31536000, immutable' for static assets in header configuration.")

    if "Access-Control-Allow-Origin" not in combined_headers or "*" not in combined_headers:
        errors.append("Missing 'Access-Control-Allow-Origin: *' for static assets in header configuration.")

    # 3. Check SPA offline fallback routing
    redirects_text = redirects_file.read_text(encoding="utf-8") if redirects_file.exists() else ""
    has_redirect_fallback = False

    if redirects_file.exists() and "/index.html" in redirects_text and "200" in redirects_text:
        has_redirect_fallback = True
    elif netlify_toml.exists() and "/index.html" in toml_text and ("status = 200" in toml_text or "200" in toml_text):
        has_redirect_fallback = True

    if not has_redirect_fallback:
        errors.append("Missing offline fallback routing ('/* /index.html 200') in _redirects or netlify.toml.")

    if errors:
        print("[verify-pwa-headers] FAILED with the following errors:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)

    print("[verify-pwa-headers] PASSED: All PWA offline headers, assets, and fallback routing verified!")


if __name__ == "__main__":
    target = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_BUILD_DIR
    verify_pwa_headers(target)
