"""FastAPI Application Factory for Halloween Quiz."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from halloween_quiz.core.engine import QuestionBank
from halloween_quiz.core.storage import ScoreRepository
from halloween_quiz.web.routes import router


def init_app_state(app: FastAPI) -> None:
    """Ensure app state is initialized with repositories and database."""
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
            print(f"🎃 Migrated {migrated} legacy score records into {db_path}")

    app.state.question_bank = bank
    app.state.score_repo = score_repo
    app.state.active_sessions = {}
    app.state._is_initialized = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context: initialize databases and load assets."""
    init_app_state(app)
    yield
    if hasattr(app.state, "active_sessions"):
        app.state.active_sessions.clear()


def create_app() -> FastAPI:
    """Create and configure the FastAPI web application."""
    app = FastAPI(
        title="Halloween Quiz API",
        description="Interactive Spooky Trivia Game API & Web Application",
        version="2.0.0",
        lifespan=lifespan,
    )
    init_app_state(app)

    # Enable CORS for local dev, standalone PWA, and external frontends
    cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
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

    # Include REST API routes
    app.include_router(router)

    # Root route: Serve modern SPA
    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request):
        index_file = templates_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return HTMLResponse("<h1>🎃 Halloween Quiz API Running</h1>")

    return app


# Default ASGI application instance for uvicorn/gunicorn
app = create_app()
