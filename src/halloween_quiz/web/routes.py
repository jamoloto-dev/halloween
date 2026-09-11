"""FastAPI REST API routes for Halloween Quiz."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from halloween_quiz.core.engine import QuestionBank, QuizSession
from halloween_quiz.core.models import (
    AnswerResult,
    AnswerSubmission,
    Category,
    Difficulty,
    LeaderboardResponse,
    QuestionView,
    QuizConfig,
    ScoreRecord,
)
from halloween_quiz.core.storage import ScoreRepository

router = APIRouter()


class StartQuizRequest(BaseModel):
    player_name: str = Field(default="Ghost Hunter", min_length=1, max_length=50)
    difficulty: str = Field(default="medium")
    categories: list[str] = Field(
        default_factory=lambda: [c.value for c in Category]
    )
    num_questions: int = Field(default=10, ge=1, le=50)
    time_limit_per_question: int = Field(default=30, ge=5, le=120)


class StartQuizResponse(BaseModel):
    session_id: str
    player_name: str
    difficulty: str
    total_questions: int
    first_question: QuestionView | None


class SessionStatusResponse(BaseModel):
    session_id: str
    player_name: str
    difficulty: str
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


def get_active_sessions(request: Request) -> dict[str, QuizSession]:
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
    except Exception:
        db_connected = False

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database_connected": db_connected,
        "questions_loaded": bank.total_count,
        "total_scores_recorded": score_count,
        "version": "2.0.0",
    }


@router.get("/api/categories")
def get_categories(bank: QuestionBank = Depends(get_question_bank)):
    """List available trivia categories and question counts."""
    return {
        "categories": bank.get_categories(),
        "difficulties": [d.value for d in Difficulty],
    }


@router.post("/api/quiz/start", response_model=StartQuizResponse)
def start_quiz(
    payload: StartQuizRequest,
    bank: QuestionBank = Depends(get_question_bank),
    sessions: dict[str, QuizSession] = Depends(get_active_sessions),
):
    """Start a new interactive quiz game session."""
    diff = Difficulty.from_str(payload.difficulty)
    config = QuizConfig(
        player_name=payload.player_name,
        difficulty=diff,
        categories=payload.categories,
        num_questions=payload.num_questions,
        time_limit_per_question=payload.time_limit_per_question,
    )

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
    sessions[session.session_id] = session

    return StartQuizResponse(
        session_id=session.session_id,
        player_name=session.config.player_name,
        difficulty=session.config.difficulty.value,
        total_questions=session.total_questions,
        first_question=session.get_current_question_view(),
    )


@router.get("/api/quiz/{session_id}", response_model=SessionStatusResponse)
def get_quiz_status(
    session_id: str,
    sessions: dict[str, QuizSession] = Depends(get_active_sessions),
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
        current_index=session.current_index + 1 if not session.is_completed else session.total_questions,
        total_questions=session.total_questions,
        score=session.score,
        streak=session.streak,
        is_completed=session.is_completed,
        current_question=session.get_current_question_view(),
        summary=summary,
    )


@router.post("/api/quiz/{session_id}/answer", response_model=AnswerResult)
def submit_answer(
    session_id: str,
    payload: AnswerSubmission,
    sessions: dict[str, QuizSession] = Depends(get_active_sessions),
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
            )
        except Exception as e:
            # Don't fail the response if DB write encounters issue
            print(f"Warning: Failed to save score for session {session_id}: {e}")

    return result


@router.post("/api/quiz/{session_id}/timeout", response_model=AnswerResult)
def timeout_question(
    session_id: str,
    sessions: dict[str, QuizSession] = Depends(get_active_sessions),
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
            )
        except Exception as e:
            print(f"Warning: Failed to save score for session {session_id}: {e}")

    return result


@router.get("/api/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    difficulty: str | None = Query(None, description="Filter by difficulty: easy, medium, hard"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Get top scores with optional difficulty filter and pagination."""
    entries = repo.get_leaderboard(difficulty=difficulty, limit=limit, offset=offset)
    total = repo.count_scores(difficulty=difficulty)
    return LeaderboardResponse(entries=entries, total=total)


@router.post("/api/leaderboard", response_model=ScoreRecord)
def record_score_manually(
    payload: ScoreRecord,
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Manually record a score to the leaderboard."""
    return repo.save_score(
        player_name=payload.player_name,
        difficulty=payload.difficulty,
        score=payload.score,
        total_questions=payload.total_questions,
        percentage=payload.percentage,
    )
