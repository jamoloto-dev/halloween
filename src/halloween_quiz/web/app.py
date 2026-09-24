"""FastAPI Application Factory for Halloween Quiz."""

import json
import logging
import os
import re
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from halloween_quiz import __version__
from halloween_quiz.core.engine import QuestionBank, SessionManager
from halloween_quiz.core.entitlements import entitlement_service
from halloween_quiz.core.storage import ScoreRepository
from halloween_quiz.web.routes import router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("halloween_quiz.app")


def init_app_state(app: FastAPI) -> None:
    """Ensure app state is initialized with repositories, question bank, and session store."""
    if getattr(app.state, "_is_initialized", False):
        return

    root_dir = Path(__file__).resolve().parent.parent.parent.parent
    assets_dir = root_dir / "assets"
    questions_path = os.getenv("QUESTIONS_FILE", str(assets_dir / "questions.json"))
    db_path = os.getenv("DATABASE_PATH", str(root_dir / "data" / "halloween.db"))
    csv_path = os.getenv("LEGACY_CSV_PATH", str(root_dir / "high_scores.csv"))

    bank = QuestionBank(questions_path)
    score_repo = ScoreRepository(db_path)
    entitlement_service.set_repository(score_repo)

    if Path(csv_path).exists():
        migrated = score_repo.migrate_legacy_csv(csv_path)
        if migrated > 0:
            logger.info(f"🎃 Migrated {migrated} legacy score records into {db_path}")

    session_ttl = int(os.getenv("SESSION_TTL", "3600"))
    max_sessions = int(os.getenv("MAX_SESSIONS", "1000"))

    app.state.question_bank = bank
    app.state.score_repo = score_repo
    app.state.active_sessions = SessionManager(ttl_seconds=session_ttl, max_sessions=max_sessions)
    app.state._is_initialized = True
    logger.info(
        f"Application state initialized: {bank.total_count} questions loaded, "
        f"DB ready, SessionManager(ttl={session_ttl}s, max={max_sessions})"
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context: initialize databases and clean up on shutdown."""
    init_app_state(app)
    yield
    if hasattr(app.state, "active_sessions"):
        app.state.active_sessions.clear()
    logger.info("Application shutdown complete.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI web application."""
    app = FastAPI(
        title="Halloween Quiz API",
        description="Interactive Spooky Trivia Game API & Web Application",
        version=__version__,
        lifespan=lifespan,
    )
    init_app_state(app)

    # Safe CORS and custom domain configuration
    raw_cors = os.getenv("CORS_ORIGINS", "")
    custom_domain = os.getenv("CUSTOM_DOMAIN", os.getenv("DOMAIN", "")).strip().lower()

    if raw_cors:
        cors_origins = [o.strip() for o in raw_cors.split(",") if o.strip()]
    else:
        env = os.getenv("ENVIRONMENT", "development").lower()
        if env == "production":
            cors_origins = [
                "https://halloween.jamoloto.dev",
                "https://halloween-quiz.onrender.com",
            ]
        else:
            cors_origins = ["*"]

    if custom_domain:
        clean_domain = custom_domain.replace("https://", "").replace("http://", "").strip("/")
        origins_to_add = [
            f"https://{clean_domain}",
            f"http://{clean_domain}",
        ]
        if not clean_domain.startswith("www.") and clean_domain.count(".") == 1:
            origins_to_add.append(f"https://www.{clean_domain}")
            origins_to_add.append(f"http://www.{clean_domain}")

        for orig in origins_to_add:
            if orig not in cors_origins and "*" not in cors_origins:
                cors_origins.append(orig)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Determine paths
    root_dir = Path(__file__).resolve().parent.parent.parent.parent
    web_dir = Path(__file__).resolve().parent
    static_dir = web_dir / "static"
    templates_dir = web_dir / "templates"
    sounds_dir = root_dir / "assets" / "sounds"
    pwa_dir = root_dir / "pwa"

    # Mount static assets
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    if sounds_dir.exists():
        app.mount("/sounds", StaticFiles(directory=str(sounds_dir)), name="sounds")

    if pwa_dir.exists():
        app.mount("/pwa", StaticFiles(directory=str(pwa_dir), html=True), name="pwa")

    # Root PWA routes
    @app.get("/manifest.json")
    async def get_manifest():
        manifest_file = static_dir / "manifest.json"
        if manifest_file.exists():
            return FileResponse(manifest_file, media_type="application/manifest+json")
        return HTMLResponse("{}", media_type="application/json")

    @app.get("/sw.js")
    async def get_service_worker():
        sw_file = static_dir / "sw.js"
        if sw_file.exists():
            return FileResponse(
                sw_file,
                media_type="application/javascript",
                headers={
                    "Service-Worker-Allowed": "/",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                },
            )
        return HTMLResponse("// SW not found", media_type="application/javascript")

    @app.get("/offline.html", response_class=HTMLResponse)
    async def get_offline():
        offline_file = templates_dir / "offline.html"
        if offline_file.exists():
            return HTMLResponse(offline_file.read_text(encoding="utf-8"))
        return HTMLResponse("<h1>Offline</h1><p>Check your internet connection.</p>")

    @app.get("/privacy", response_class=HTMLResponse)
    async def get_privacy():
        privacy_file = templates_dir / "privacy.html"
        if privacy_file.exists():
            return HTMLResponse(privacy_file.read_text(encoding="utf-8"))
        return HTMLResponse("<h1>Privacy Policy</h1>")

    # Include REST API routes
    app.include_router(router)

    # Helper for rendering multi-page game experiences with shared shell and route state
    def render_game_page(
        request: Request,
        page_name: str,
        page_title: str,
        page_params: dict | None = None,
    ) -> HTMLResponse:
        index_file = templates_dir / "index.html"
        if not index_file.exists():
            return HTMLResponse("<h1>🎃 Halloween Quiz API Running</h1>")

        category_json = json.dumps(request.app.state.question_bank.get_categories()).replace(
            "</", "<\\/"
        )
        params_json = json.dumps(page_params or {}).replace("</", "<\\/")
        page = index_file.read_text(encoding="utf-8")

        # Set title
        page = re.sub(r"<title>.*?</title>", f"<title>{page_title}</title>", page)
        # Inject category data
        page = page.replace("__CATEGORY_DATA__", category_json)
        # Inject server route state script
        server_route_script = (
            f'<script id="server-route-data">\n'
            f'window.__INITIAL_ROUTE__ = "{request.url.path}";\n'
            f'window.__INITIAL_PAGE__ = "{page_name}";\n'
            f'window.__PAGE_PARAMS__ = {params_json};\n'
            f'</script>'
        )
        if "<!-- SERVER_ROUTE_DATA -->" in page:
            page = page.replace("<!-- SERVER_ROUTE_DATA -->", server_route_script)
        else:
            page = page.replace("</head>", f"{server_route_script}\n</head>")

        return HTMLResponse(page, headers={"Cache-Control": "no-store"})

    # Multi-page Game Routes (Spooky Master v2.6.0)
    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request):
        return render_game_page(request, "home", "Spooky Master 🎃 Halloween Quiz Challenge")

    @app.get("/play", response_class=HTMLResponse)
    async def play_setup(request: Request):
        return render_game_page(request, "play", "Spooky Master — Play Setup")

    @app.get("/play/session", response_class=HTMLResponse)
    async def play_session(request: Request):
        return render_game_page(request, "quiz", "Spooky Master — Active Quiz")

    @app.get("/results", response_class=HTMLResponse)
    async def results_page(request: Request):
        return render_game_page(request, "results", "Spooky Master — Hunt Results")

    @app.get("/results/{session_id}", response_class=HTMLResponse)
    async def results_session(request: Request, session_id: str):
        return render_game_page(
            request, "results", "Spooky Master — Hunt Results", {"sessionId": session_id}
        )

    @app.get("/journey", response_class=HTMLResponse)
    async def journey_page(request: Request):
        return render_game_page(request, "journey", "Spooky Master — Haunted Journey")

    @app.get("/journey/chapter/{chapter_id}", response_class=HTMLResponse)
    async def journey_chapter_page(request: Request, chapter_id: str):
        return render_game_page(
            request, "journey_chapter", "Spooky Master — Chapter Journey", {"chapterId": chapter_id}
        )

    @app.get("/daily-haunt", response_class=HTMLResponse)
    async def daily_haunt_page(request: Request):
        return render_game_page(request, "daily_haunt", "Spooky Master — Daily Haunt")

    @app.get("/duels", response_class=HTMLResponse)
    async def duels_page(request: Request):
        return render_game_page(request, "duels", "Spooky Master — Haunted Duels")

    @app.get("/duels/{code}", response_class=HTMLResponse)
    async def duel_invite_page(request: Request, code: str):
        return render_game_page(
            request, "duel_invite", "Spooky Master — Duel Challenge", {"duelCode": code}
        )

    @app.get("/progress", response_class=HTMLResponse)
    async def progress_page(request: Request):
        return render_game_page(request, "progress", "Spooky Master — Hunter Progress & Mastery")

    @app.get("/leaderboard", response_class=HTMLResponse)
    async def leaderboard_page(request: Request):
        return render_game_page(request, "leaderboard", "Spooky Master — Leaderboard")

    @app.get("/pass", response_class=HTMLResponse)
    async def pass_page(request: Request):
        return render_game_page(request, "pass", "Spooky Master — Spooky Master Pass")

    @app.get("/settings", response_class=HTMLResponse)
    async def settings_page(request: Request):
        return render_game_page(request, "settings", "Spooky Master — Settings")

    @app.get("/hunters", response_class=HTMLResponse)
    async def hunters_page(request: Request):
        return render_game_page(request, "hunters", "Spooky Master — Hunter Guises")

    @app.get("/hunter-studio", response_class=HTMLResponse)
    async def hunter_studio_page(request: Request):
        return render_game_page(request, "hunter_studio", "Spooky Master — Hunter Studio")

    return app


# Default ASGI application instance for uvicorn/gunicorn
app = create_app()
