"""FastAPI Application Factory for Halloween Quiz."""

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from halloween_quiz.core.engine import QuestionBank, SessionManager
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
        version="2.0.0",
        lifespan=lifespan,
    )
    init_app_state(app)

    # Safe CORS configuration
    raw_cors = os.getenv("CORS_ORIGINS", "")
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

    # Root route: Serve modern SPA
    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request):
        index_file = templates_dir / "index.html"
        if index_file.exists():
            category_json = json.dumps(request.app.state.question_bank.get_categories()).replace(
                "</", "<\\/"
            )
            page = index_file.read_text(encoding="utf-8").replace(
                "__CATEGORY_DATA__", category_json
            )
            return HTMLResponse(page, headers={"Cache-Control": "no-store"})
        return HTMLResponse("<h1>🎃 Halloween Quiz API Running</h1>")

    return app


# Default ASGI application instance for uvicorn/gunicorn
app = create_app()
