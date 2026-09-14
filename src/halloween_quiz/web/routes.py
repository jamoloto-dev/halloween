"""FastAPI REST API routes for Halloween Quiz."""

import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from halloween_quiz.core.engine import QuestionBank, QuizSession, SessionManager
from halloween_quiz.core.models import (
    AnswerResult,
    AnswerSubmission,
    Category,
    Difficulty,
    GameMode,
    LeaderboardResponse,
    QuestionView,
    QuizConfig,
    ScoreRecord,
)
from halloween_quiz.core.storage import ScoreRepository
from halloween_quiz.web.security import rate_limit_quiz_action, rate_limit_start_quiz

logger = logging.getLogger("halloween_quiz.routes")

router = APIRouter()


class StartQuizRequest(BaseModel):
    player_name: str = Field(default="Ghost Hunter", min_length=1, max_length=40)
    difficulty: str = Field(default="medium")
    mode: str = Field(default="classic")
    categories: list[str] = Field(
        default_factory=lambda: [c.value for c in Category]
    )
    num_questions: int = Field(default=10, ge=1, le=50)
    time_limit_per_question: int = Field(default=30, ge=5, le=120)


class StartQuizResponse(BaseModel):
    session_id: str
    player_name: str
    difficulty: str
    mode: str
    total_questions: int
    first_question: QuestionView | None


class SessionStatusResponse(BaseModel):
    session_id: str
    player_name: str
    difficulty: str
    mode: str
    current_index: int
    total_questions: int
    score: int
    streak: int
    is_completed: bool
    current_question: QuestionView | None
    summary: dict | None = None


def get_question_bank(request: Request) -> QuestionBank:
    return request.app.state.question_bank


def get_score_repo(request: Request) -> ScoreRepository:
    return request.app.state.score_repo


def get_active_sessions(request: Request) -> SessionManager:
    return request.app.state.active_sessions


@router.get("/health")
def health_check(
    bank: QuestionBank = Depends(get_question_bank),
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Healthcheck endpoint reporting status, loaded questions, and database health."""
    db_connected = False
    score_count = 0
    try:
        score_count = repo.count_scores()
        db_connected = True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_connected = False

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database_connected": db_connected,
        "questions_loaded": bank.total_count,
        "total_scores_recorded": score_count,
        "version": "2.0.0",
    }


@router.get("/live")
def liveness_check():
    """Kubernetes / container orchestrator liveness probe."""
    return {"status": "alive"}


@router.get("/ready")
def readiness_check(
    bank: QuestionBank = Depends(get_question_bank),
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Readiness probe checking that database and question banks are loaded."""
    if bank.total_count == 0:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Question bank is empty",
        )
    try:
        repo.count_scores()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unavailable: {e}",
        )
    return {"status": "ready"}


@router.get("/api/categories")
def get_categories(bank: QuestionBank = Depends(get_question_bank)):
    """List available trivia categories, difficulties, and modes."""
    return {
        "categories": bank.get_categories(),
        "difficulties": [d.value for d in Difficulty],
        "modes": [m.value for m in GameMode],
    }


@router.get("/api/daily")
def get_daily_haunt_info():
    """Return info about today's deterministic UTC Daily Haunt challenge."""
    now_utc = datetime.now(timezone.utc)
    today_str = now_utc.strftime("%Y-%m-%d")
    # Time until next UTC midnight
    seconds_until_tomorrow = int(
        (datetime(now_utc.year, now_utc.month, now_utc.day, 23, 59, 59, tzinfo=timezone.utc) - now_utc).total_seconds()
    )
    return {
        "date": today_str,
        "mode": "daily",
        "title": "Daily Haunt Challenge",
        "seconds_remaining": max(0, seconds_until_tomorrow),
        "rules": "Same 10 spooky questions for all hunters worldwide today.",
    }


@router.post(
    "/api/quiz/start",
    response_model=StartQuizResponse,
    dependencies=[Depends(rate_limit_start_quiz)],
)
def start_quiz(
    payload: StartQuizRequest,
    bank: QuestionBank = Depends(get_question_bank),
    sessions: SessionManager = Depends(get_active_sessions),
):
    """Start a new interactive quiz game session."""
    diff = Difficulty.from_str(payload.difficulty)
    mode_enum = GameMode.from_str(payload.mode)

    config = QuizConfig(
        player_name=payload.player_name,
        difficulty=diff,
        mode=mode_enum,
        categories=payload.categories,
        num_questions=payload.num_questions,
        time_limit_per_question=payload.time_limit_per_question,
    )

    if mode_enum == GameMode.DAILY:
        questions = bank.select_daily_questions(count=payload.num_questions)
    elif mode_enum == GameMode.QUICK:
        questions = bank.select_questions(
            categories=config.categories,
            difficulty=config.difficulty,
            count=5,
        )
    elif mode_enum == GameMode.DEEP:
        questions = bank.select_questions(
            categories=config.categories,
            difficulty=config.difficulty,
            count=max(15, payload.num_questions),
        )
    elif mode_enum == GameMode.ENDLESS:
        questions = bank.select_questions(
            categories=config.categories,
            difficulty=config.difficulty,
            count=50,
        )
    else:
        questions = bank.select_questions(
            categories=config.categories,
            difficulty=config.difficulty,
            count=config.num_questions,
        )

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No questions available matching selected categories and difficulty.",
        )

    session = QuizSession(config, questions)
    sessions.add(session)
    logger.info(f"Quiz started: session={session.session_id}, mode={mode_enum.value}, player={config.player_name}")

    return StartQuizResponse(
        session_id=session.session_id,
        player_name=session.config.player_name,
        difficulty=session.config.difficulty.value,
        mode=session.config.mode.value,
        total_questions=session.total_questions,
        first_question=session.get_current_question_view(),
    )


@router.get("/api/quiz/{session_id}", response_model=SessionStatusResponse)
def get_quiz_status(
    session_id: str,
    sessions: SessionManager = Depends(get_active_sessions),
):
    """Retrieve current question and state for a running session."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz session '{session_id}' not found or expired.",
        )

    summary = session.get_summary() if session.is_completed else None

    return SessionStatusResponse(
        session_id=session.session_id,
        player_name=session.config.player_name,
        difficulty=session.config.difficulty.value,
        mode=session.config.mode.value,
        current_index=session.current_index + 1 if not session.is_completed else session.total_questions,
        total_questions=session.total_questions,
        score=session.score,
        streak=session.streak,
        is_completed=session.is_completed,
        current_question=session.get_current_question_view(),
        summary=summary,
    )


@router.post(
    "/api/quiz/{session_id}/answer",
    response_model=AnswerResult,
    dependencies=[Depends(rate_limit_quiz_action)],
)
def submit_answer(
    session_id: str,
    payload: AnswerSubmission,
    sessions: SessionManager = Depends(get_active_sessions),
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Submit an answer to the current active question."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz session '{session_id}' not found or expired.",
        )

    if session.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This quiz session has already ended.",
        )

    result = session.submit_answer(
        answer=payload.answer,
        time_taken=payload.time_taken,
    )

    # If this answer finished the quiz, persist score to database
    if session.is_completed:
        try:
            repo.save_score(
                player_name=session.config.player_name,
                difficulty=session.config.difficulty.value,
                score=session.score,
                total_questions=session.total_questions,
                percentage=session.percentage,
                mode=session.config.mode.value,
                max_streak=session.max_streak,
            )
            logger.info(
                f"Session completed and saved: session={session_id}, score={session.score}, mode={session.config.mode.value}"
            )
        except Exception as e:
            logger.warning(f"Failed to save score for session {session_id}: {e}")

    return result


@router.post(
    "/api/quiz/{session_id}/timeout",
    response_model=AnswerResult,
    dependencies=[Depends(rate_limit_quiz_action)],
)
def timeout_question(
    session_id: str,
    sessions: SessionManager = Depends(get_active_sessions),
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Trigger timeout for current question when countdown hits zero."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz session '{session_id}' not found or expired.",
        )

    if session.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This quiz session has already ended.",
        )

    result = session.timeout_current_question()

    if session.is_completed:
        try:
            repo.save_score(
                player_name=session.config.player_name,
                difficulty=session.config.difficulty.value,
                score=session.score,
                total_questions=session.total_questions,
                percentage=session.percentage,
                mode=session.config.mode.value,
                max_streak=session.max_streak,
            )
            logger.info(
                f"Session completed via timeout and saved: session={session_id}, score={session.score}, mode={session.config.mode.value}"
            )
        except Exception as e:
            logger.warning(f"Failed to save score for session {session_id}: {e}")

    return result


@router.get("/api/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    difficulty: str | None = Query(None, description="Filter by difficulty: easy, medium, hard"),
    mode: str | None = Query(None, description="Filter by game mode: classic, daily, panic, endless"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Get top scores with optional difficulty/mode filter and pagination."""
    entries = repo.get_leaderboard(difficulty=difficulty, mode=mode, limit=limit, offset=offset)
    total = repo.count_scores(difficulty=difficulty, mode=mode)
    return LeaderboardResponse(entries=entries, total=total)


@router.post("/api/leaderboard", response_model=ScoreRecord)
def record_score_manually(
    payload: ScoreRecord,
    request: Request,
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Score recording endpoint (protected against client manipulation in production)."""
    admin_key = os.getenv("ADMIN_API_KEY")
    env = os.getenv("ENVIRONMENT", "development").lower()
    if env == "production" and admin_key:
        provided_key = request.headers.get("X-Admin-Key")
        if provided_key != admin_key:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Manual leaderboard submission is disabled in production.",
            )

    return repo.save_score(
        player_name=payload.player_name,
        difficulty=payload.difficulty,
        score=payload.score,
        total_questions=payload.total_questions,
        percentage=payload.percentage,
        mode=getattr(payload, "mode", "classic") or "classic",
        max_streak=getattr(payload, "max_streak", 0) or 0,
    )
