"""Regression tests for PWA service worker caching and portable URLs."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SW_JS = ROOT / "src" / "halloween_quiz" / "web" / "static" / "sw.js"
APP_JS = ROOT / "src" / "halloween_quiz" / "web" / "static" / "app.js"
INDEX_HTML = ROOT / "src" / "halloween_quiz" / "web" / "templates" / "index.html"
MANIFEST_JSON = ROOT / "src" / "halloween_quiz" / "web" / "static" / "manifest.json"


def test_pwa_manifest_is_portable() -> None:
    """PWA manifest start_url and scope must be relative/portable for production domains."""
    data = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))
    assert data.get("start_url") == "/"
    assert data.get("scope") == "/"
    assert "localhost" not in json.dumps(data)
    assert "127.0.0.1" not in json.dumps(data)


def test_service_worker_has_versioned_cache_and_cleans_stale_caches() -> None:
    """sw.js must define a versioned cache and purge obsolete caches on activate."""
    sw_content = SW_JS.read_text(encoding="utf-8")

    assert 'const CACHE_NAME = "spooky-master-v2.3.0";' in sw_content
    assert "self.skipWaiting()" in sw_content
    assert "self.clients.claim()" in sw_content
    assert "caches.delete(key)" in sw_content


def test_frontend_runtime_has_no_hardcoded_local_origin_urls() -> None:
    """Runtime frontend scripts must not hardcode localhost or 127.0.0.1 API URLs."""
    for script_file in (SW_JS, APP_JS):
        content = script_file.read_text(encoding="utf-8")
        assert "localhost:5000" not in content
        assert "127.0.0.1:5000" not in content
        assert "http://localhost" not in content
        assert "http://127.0.0.1" not in content


def test_index_html_uses_versioned_script_and_style_matching_sw() -> None:
    """index.html must specify version query parameters matching the service worker precache."""
    index_content = INDEX_HTML.read_text(encoding="utf-8")
    sw_content = SW_JS.read_text(encoding="utf-8")

    version_param = "v=20260921-spooky-master-v2.3.0"
    assert f"/static/app.js?{version_param}" in index_content
    assert f"/static/style.css?{version_param}" in index_content
    assert f"/static/app.js?{version_param}" in sw_content
    assert f"/static/style.css?{version_param}" in sw_content


def test_custom_domain_cors_and_reverse_proxy(monkeypatch) -> None:
    """FastAPI app must authorize CUSTOM_DOMAIN in production CORS and handle reverse proxy requests."""
    from fastapi.testclient import TestClient

    from halloween_quiz.web.app import create_app

    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("CUSTOM_DOMAIN", "halloween.jamoloto.dev")

    app = create_app()
    with TestClient(app) as client:
        # Request with authorized custom domain origin
        headers = {"Origin": "https://halloween.jamoloto.dev"}
        res = client.get("/api/categories", headers=headers)
        assert res.status_code == 200
        assert res.headers.get("access-control-allow-origin") == "https://halloween.jamoloto.dev"

        # Request with unauthorized origin
        unauth_res = client.get("/api/categories", headers={"Origin": "https://unauthorized-evil-site.com"})
        assert unauth_res.status_code == 200
        assert "access-control-allow-origin" not in unauth_res.headers


def test_render_blueprint_domain_and_disk_setup() -> None:
    """deploy/render.yaml must configure persistent disk, healthcheck, and custom domain."""
    render_yaml_file = ROOT / "deploy" / "render.yaml"
    content = render_yaml_file.read_text(encoding="utf-8")

    assert "halloween-quiz" in content
    assert "healthCheckPath: /health" in content
    assert "halloween.jamoloto.dev" in content
    assert "mountPath: /app/data" in content
    assert "CUSTOM_DOMAIN" in content


def test_domain_setup_documentation_is_accurate() -> None:
    """DOMAIN_SETUP.md must guide FastAPI/Docker deployment and not contain obsolete Streamlit/Netlify targets."""
    doc = (ROOT / "DOMAIN_SETUP.md").read_text(encoding="utf-8")

    assert "halloween.jamoloto.dev" in doc
    assert "render.com" in doc
    assert "Dockerfile" in doc
    # Obsolete targets should no longer be present as deployment instructions
    assert "src/web_game_streamlit.py" not in doc
    assert "Publish directory: pwa" not in doc

