"""Tests for PWA offline headers, build script, and Netlify pipeline validation."""

import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from halloween_quiz.web.app import create_app

ROOT_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT_DIR / "dist"
PUBLIC_DIR = ROOT_DIR / "public"
NETLIFY_TOML = ROOT_DIR / "netlify.toml"


def test_public_headers_and_netlify_toml_exist_in_repo() -> None:
    """public/_headers, public/_redirects, and netlify.toml must exist in repo root."""
    assert (PUBLIC_DIR / "_headers").exists(), "Missing public/_headers in repo"
    assert (PUBLIC_DIR / "_redirects").exists(), "Missing public/_redirects in repo"
    assert NETLIFY_TOML.exists(), "Missing netlify.toml in repo root"


def test_build_pwa_generates_complete_distribution_bundle() -> None:
    """scripts/build_pwa.py must package SPA shell, static assets, manifest, sw, and headers."""
    build_script = ROOT_DIR / "scripts" / "build_pwa.py"
    result = subprocess.run([sys.executable, str(build_script)], capture_output=True, text=True, check=True)
    assert "Successfully built Spooky Master PWA" in result.stdout

    assert (DIST_DIR / "index.html").exists()
    assert (DIST_DIR / "_headers").exists()
    assert (DIST_DIR / "_redirects").exists()
    assert (DIST_DIR / "manifest.json").exists()
    assert (DIST_DIR / "sw.js").exists()
    assert (DIST_DIR / "netlify.toml").exists()


def test_verify_pwa_headers_passes_for_build_distribution() -> None:
    """Verification CLI must pass without error on valid build directory."""
    build_script = ROOT_DIR / "scripts" / "build_pwa.py"
    subprocess.run([sys.executable, str(build_script)], check=True)

    verify_script = ROOT_DIR / "scripts" / "verify_pwa_headers.py"
    result = subprocess.run([sys.executable, str(verify_script)], capture_output=True, text=True, check=True)
    assert "PASSED" in result.stdout


def test_headers_content_and_offline_spa_redirects() -> None:
    """Header configuration and offline routing must specify all mandatory directives."""
    headers_content = (DIST_DIR / "_headers").read_text(encoding="utf-8")
    redirects_content = (DIST_DIR / "_redirects").read_text(encoding="utf-8")
    toml_content = (DIST_DIR / "netlify.toml").read_text(encoding="utf-8")

    # 1. Service Worker headers
    assert "Service-Worker-Allowed: /" in headers_content or "Service-Worker-Allowed" in toml_content
    assert "no-cache, no-store, must-revalidate" in headers_content
    assert "application/javascript" in headers_content

    # 2. Manifest headers
    assert "application/manifest+json" in headers_content
    assert "public, max-age=0, must-revalidate" in headers_content

    # 3. Static assets & audio/fonts caching and CORS
    assert "31536000, immutable" in headers_content
    assert "Access-Control-Allow-Origin: *" in headers_content

    # 4. Offline fallback routing
    assert "/* /index.html 200" in redirects_content or 'to = "/index.html"' in toml_content


def test_fastapi_serves_pwa_service_worker_and_manifest_headers(monkeypatch, tmp_path) -> None:
    """FastAPI application on Render must serve required offline PWA headers."""
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test_pwa.db"))
    app = create_app()

    with TestClient(app) as client:
        # Service worker route
        sw_res = client.get("/sw.js")
        assert sw_res.status_code == 200
        assert sw_res.headers.get("service-worker-allowed") == "/"
        assert "no-cache" in sw_res.headers.get("cache-control", "")
        assert "must-revalidate" in sw_res.headers.get("cache-control", "")

        # Manifest route
        manifest_res = client.get("/manifest.json")
        assert manifest_res.status_code == 200
        assert "application/manifest+json" in manifest_res.headers.get("content-type", "")
        assert "max-age=0" in manifest_res.headers.get("cache-control", "")

        # Static asset route
        static_res = client.get("/static/favicon.svg")
        assert static_res.status_code == 200
        assert static_res.headers.get("access-control-allow-origin") == "*"
