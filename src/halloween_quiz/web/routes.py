"""FastAPI REST API routes for Halloween Quiz."""

import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from halloween_quiz import __version__
from halloween_quiz.core.ai_avatars import (
    AvatarGenerationRequest,
    AvatarGenerationResult,
    avatar_service,
)
from halloween_quiz.core.ai_hints import HintRequest, HintResponse, hint_service
from halloween_quiz.core.campaign import (
    CAMPAIGN_CHAPTERS,
    get_stage_by_id,
)
from halloween_quiz.core.community import community_registry
from halloween_quiz.core.duels import (
    PlayerDuelResult,
    duel_registry,
)
from halloween_quiz.core.engine import QuestionBank, QuizSession, SessionManager
from halloween_quiz.core.entitlements import (
    EntitlementStatus,
    entitlement_service,
)
from halloween_quiz.core.models import (
    AnswerResult,
    AnswerSubmission,
    Category,
    Difficulty,
    GameMode,
    LeaderboardResponse,
    PersonalBestResponse,
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
    avatar_id: str = Field(default="pumpkin_hunter")
    difficulty: str = Field(default="medium")
    mode: str = Field(default="classic")
    categories: list[str] = Field(default_factory=lambda: [c.value for c in Category])
    num_questions: int = Field(default=10, ge=1, le=50)
    time_limit_per_question: int = Field(default=30, ge=5, le=120)
    stage_id: str | None = None
    duel_code: str | None = None


class ClaimCommunityRewardRequest(BaseModel):
    player_id: str
    goal_id: str


class ActivateBoosterRequest(BaseModel):
    booster_type: str


class AIHintRequest(BaseModel):
    session_id: str | None = None
    question_id: str | None = None
    hint_level: int = Field(default=1, ge=1, le=3)
    category: str | None = None


class CreateDuelRequest(BaseModel):
    creator_id: str
    creator_name: str = Field(default="Ghost Hunter", min_length=1, max_length=40)
    creator_avatar: str = Field(default="pumpkin_hunter")
    difficulty: str = Field(default="medium")
    num_questions: int = Field(default=5, ge=3, le=15)
    traps: list[str] = Field(default_factory=list)


class AcceptDuelRequest(BaseModel):
    challenger_id: str
    challenger_name: str = Field(default="Wandering Spirit", min_length=1, max_length=40)
    challenger_avatar: str = Field(default="ghost")


class SubmitDuelRequest(BaseModel):
    player_id: str
    player_name: str
    avatar_id: str = Field(default="pumpkin_hunter")
    score: int
    accuracy: float
    streak: int
    time_taken_seconds: float
    is_creator: bool = False


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
        "version": __version__,
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
def get_categories(
    include_premium: bool = False,
    bank: QuestionBank = Depends(get_question_bank),
):
    """List available trivia categories, difficulties, and modes."""
    return {
        "categories": bank.get_categories(include_premium=include_premium),
        "premium_packs": bank.get_premium_topics(),
        "difficulties": [d.value for d in Difficulty],
        "modes": [m.value for m in GameMode],
    }


@router.get("/api/daily")
@router.get("/api/daily-haunt/info")
def get_daily_haunt_info():
    """Return info about today's deterministic UTC Daily Haunt challenge."""
    now_utc = datetime.now(timezone.utc)
    today_str = now_utc.strftime("%Y-%m-%d")
    # Time until next UTC midnight
    seconds_until_tomorrow = int(
        (
            datetime(now_utc.year, now_utc.month, now_utc.day, 23, 59, 59, tzinfo=timezone.utc)
            - now_utc
        ).total_seconds()
    )
    return {
        "date": today_str,
        "mode": "daily",
        "title": "Daily Haunt Challenge",
        "seconds_remaining": max(0, seconds_until_tomorrow),
        "rules": "Same 10 spooky questions for all hunters worldwide today.",
        "challenge_version": "2026-v1",
        "question_bank_version": "bank-1.0",
        "booster_restrictions": "Booster multipliers disabled in Daily Haunt (Strict Fair Play)",
        "scoring_rules": "Base points (Easy: 100, Med: 200, Hard: 300) + Monotonic speed bonus + Streak bonus",
    }


@router.post(
    "/api/quiz/start",
    response_model=StartQuizResponse,
    dependencies=[Depends(rate_limit_start_quiz)],
)
def start_quiz(
    payload: StartQuizRequest,
    request: Request,
    bank: QuestionBank = Depends(get_question_bank),
    sessions: SessionManager = Depends(get_active_sessions),
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Start a new interactive quiz game session."""
    diff = Difficulty.from_str(payload.difficulty)
    mode_enum = GameMode.from_str(payload.mode)
    player_id = request.headers.get("X-Player-ID", "player_default")
    tier = entitlement_service.resolve_tier(player_id)

    # Validate avatar entitlement (fairness: avatars are purely cosmetic)
    if payload.avatar_id and not entitlement_service.can_use_avatar(tier, payload.avatar_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"The supernatural guise '{payload.avatar_id}' requires the Spooky Master Pass.",
        )

    # Validate topic/category entitlement
    if payload.categories:
        for cat in payload.categories:
            if not entitlement_service.can_access_topic(tier, cat):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"The premium trivia pack '{cat}' requires the Spooky Master Pass.",
                )

    config = QuizConfig(
        player_id=player_id,
        player_name=payload.player_name,
        difficulty=diff,
        mode=mode_enum,
        categories=payload.categories,
        num_questions=payload.num_questions,
        time_limit_per_question=payload.time_limit_per_question,
        avatar_id=payload.avatar_id,
    )

    if payload.stage_id:
        stage = get_stage_by_id(payload.stage_id)
        if stage:
            ch_num = 1
            if (
                stage.chapter_id.startswith("ch")
                and len(stage.chapter_id) > 2
                and stage.chapter_id[2].isdigit()
            ):
                ch_num = int(stage.chapter_id[2])
            if ch_num > 3:
                if not entitlement_service.can_access_chapter(tier, ch_num):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="This campaign chapter requires the Spooky Master Pass.",
                    )
            config.difficulty = stage.difficulty
            config.categories = stage.categories
            config.num_questions = stage.question_count
            if "time_limit" in stage.special_rules:
                config.time_limit_per_question = stage.special_rules["time_limit"]
            questions = bank.select_stage_questions(payload.stage_id)
        else:
            questions = bank.select_questions(
                categories=config.categories,
                difficulty=config.difficulty,
                count=config.num_questions,
            )
    elif payload.duel_code:
        duel = duel_registry.get_duel(payload.duel_code)
        if not duel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Duel '{payload.duel_code}' not found or expired.",
            )
        config.difficulty = duel.difficulty
        config.num_questions = duel.num_questions
        if "cursed_clock" in duel.traps:
            config.time_limit_per_question = 10
        raw_questions = bank.select_duel_questions(
            seed=duel.question_seed,
            count=duel.num_questions,
            difficulty=duel.difficulty,
        )
        questions = []
        for idx, q in enumerate(raw_questions):
            assigned_trap = duel.traps[idx % len(duel.traps)] if duel.traps else None
            questions.append(q.model_copy(update={"active_trap": assigned_trap}))
    elif mode_enum == GameMode.DAILY:
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

    session = QuizSession(config, questions, question_bank=bank)
    if session.tracker.is_adaptive_eligible:
        try:
            saved_profile = repo.get_skill_profile(player_id)
            session.tracker.load_skill_profile(saved_profile)
        except Exception as e:
            logger.warning(f"Could not load skill profile for {player_id}: {e}")
    sessions.add(session)
    logger.info(
        f"Quiz started: session={session.session_id}, mode={mode_enum.value}, player={config.player_name}"
    )

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
        current_index=session.current_index + 1
        if not session.is_completed
        else session.total_questions,
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
    if session.is_completed and not session.score_saved:
        session.score_saved = True
        try:
            pid = getattr(session.config, "player_id", "guest_default") or "guest_default"
            is_guest = pid in ("guest_default", "player_default") or pid.startswith("guest_")
            repo.save_score(
                player_id=pid,
                player_name=session.config.player_name,
                difficulty=session.config.difficulty.value,
                score=session.score,
                total_questions=session.total_questions,
                percentage=session.percentage,
                mode=session.config.mode.value,
                max_streak=session.max_streak,
                avatar_id=getattr(session.config, "avatar_id", "pumpkin_hunter"),
                is_boosted=session.is_boosted,
                is_guest=is_guest,
            )
            logger.info(
                f"Session completed and saved: session={session_id}, score={session.score}, mode={session.config.mode.value}"
            )
            community_registry.record_run(
                score=session.score,
                is_completed=True,
                is_perfect=(session.percentage >= 100.0),
                questions_answered=session.total_questions,
            )
            if session.tracker.is_adaptive_eligible:
                repo.save_skill_profile(session.tracker.get_skill_profile())
        except Exception as e:
            logger.warning(f"Failed to save score or community stats for session {session_id}: {e}")

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

    if session.is_completed and not session.score_saved:
        session.score_saved = True
        try:
            pid = getattr(session.config, "player_id", "guest_default") or "guest_default"
            is_guest = pid in ("guest_default", "player_default") or pid.startswith("guest_")
            repo.save_score(
                player_id=pid,
                player_name=session.config.player_name,
                difficulty=session.config.difficulty.value,
                score=session.score,
                total_questions=session.total_questions,
                percentage=session.percentage,
                mode=session.config.mode.value,
                max_streak=session.max_streak,
                avatar_id=getattr(session.config, "avatar_id", "pumpkin_hunter"),
                is_boosted=session.is_boosted,
                is_guest=is_guest,
            )
            logger.info(
                f"Session completed via timeout and saved: session={session_id}, score={session.score}, mode={session.config.mode.value}"
            )
            community_registry.record_run(
                score=session.score,
                is_completed=True,
                is_perfect=(session.percentage >= 100.0),
                questions_answered=session.total_questions,
            )
        except Exception as e:
            logger.warning(f"Failed to save score or community stats for session {session_id}: {e}")

    return result


@router.get("/api/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    difficulty: str | None = Query(None, description="Filter by difficulty: easy, medium, hard"),
    mode: str | None = Query(
        None, description="Filter by game mode: classic, daily, panic, endless"
    ),
    timeframe: str | None = Query("all", description="Timeframe: all, daily"),
    challenge_date: str | None = Query(None, description="Specific challenge date YYYY-MM-DD"),
    unboosted_only: bool = Query(False, description="Exclude boosted runs from ranked leaderboard"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Get top scores with optional difficulty/mode/timeframe filter and pagination."""
    entries = repo.get_leaderboard(
        difficulty=difficulty,
        mode=mode,
        timeframe=timeframe,
        challenge_date=challenge_date,
        unboosted_only=unboosted_only,
        limit=limit,
        offset=offset,
    )
    total = repo.count_scores(
        difficulty=difficulty,
        mode=mode,
        timeframe=timeframe,
        challenge_date=challenge_date,
        unboosted_only=unboosted_only,
    )
    return LeaderboardResponse(entries=entries, total=total, timeframe=timeframe or "all")


@router.get("/api/leaderboard/personal-best", response_model=PersonalBestResponse)
def get_personal_best(
    request: Request,
    player_name: str = Query(..., min_length=1, max_length=100, description="Player name"),
    player_id: str | None = Query(None, description="Player identifier"),
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Retrieve high score, streak, and history for a specific player."""
    eff_player_id = player_id or request.headers.get("X-Player-ID") or "guest_default"
    data = repo.get_personal_best(player_name=player_name, player_id=eff_player_id)
    return PersonalBestResponse(**data)


@router.get("/api/player/{player_id}/insights")
def get_player_insights(
    player_id: str,
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Retrieve AI Learning Dashboard mastery metrics and pedagogical insights."""
    profile = repo.get_skill_profile(player_id)
    return profile.to_dashboard_insights()


class RestorePurchaseRequest(BaseModel):
    player_id: str = Field(default="player_default")
    purchase_token: str | None = None


@router.get("/api/entitlements", response_model=EntitlementStatus)
def get_entitlements(
    player_id: str = Query("player_default", description="Player identifier"),
    tier: str | None = Query(None, description="Dev override tier"),
):
    """Return player's active entitlement tier, capabilities, and product catalog."""
    return entitlement_service.get_status(player_id=player_id, requested_tier=tier)


@router.post("/api/entitlements/verify")
def verify_or_restore_purchase(
    payload: RestorePurchaseRequest,
):
    """Receipt verification and restore purchase handler."""
    status_info = entitlement_service.get_status(player_id=payload.player_id)
    return {
        "success": True,
        "restored": status_info.is_premium,
        "tier": status_info.tier.value,
        "verified_by_provider": False,
        "provider_configured": False,
        "simulation": True,
        "message": (
            "Active purchase restored."
            if status_info.is_premium
            else "No active external purchase records found for this account. Real billing connects via payment provider."
        ),
    }


@router.post("/api/leaderboard", response_model=ScoreRecord)
def record_score_manually(
    payload: ScoreRecord,
    request: Request,
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Score recording endpoint (strictly disabled in production to protect leaderboard integrity)."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    if env == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manual leaderboard submission is disabled in production. Ranked scores must be earned via active server-validated quiz sessions.",
        )

    admin_key = os.getenv("ADMIN_API_KEY")
    if admin_key:
        provided_key = request.headers.get("X-Admin-Key")
        if not provided_key or provided_key != admin_key:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid or missing X-Admin-Key header for manual score recording.",
            )

    pid = getattr(payload, "player_id", "guest_default") or "guest_default"
    is_guest = getattr(payload, "is_guest", True)
    return repo.save_score(
        player_id=pid,
        player_name=payload.player_name,
        difficulty=payload.difficulty,
        score=payload.score,
        total_questions=payload.total_questions,
        percentage=payload.percentage,
        mode=getattr(payload, "mode", "classic") or "classic",
        max_streak=getattr(payload, "max_streak", 0) or 0,
        avatar_id=getattr(payload, "avatar_id", "pumpkin_hunter") or "pumpkin_hunter",
        is_boosted=getattr(payload, "is_boosted", False),
        is_guest=is_guest,
    )


# ---------------------------------------------------------------------------
# Boosters & In-Game Power-Ups
# ---------------------------------------------------------------------------


@router.post("/api/quiz/{session_id}/booster")
def activate_quiz_booster(
    session_id: str,
    payload: ActivateBoosterRequest,
    sessions: SessionManager = Depends(get_active_sessions),
):
    """Activate an in-game booster power-up on the current question."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz session '{session_id}' not found or expired.",
        )
    if session.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot activate booster on a completed session.",
        )
    if session.config.mode in (GameMode.DAILY, GameMode.DUEL):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Boosters are strictly prohibited in competitive modes.",
        )

    result = session.activate_booster(payload.booster_type)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to activate booster."),
        )
    return result


# ---------------------------------------------------------------------------
# Smart Conversational AI Hint Endpoint
# ---------------------------------------------------------------------------


@router.post("/api/ai/hint", response_model=HintResponse)
def request_ai_hint(
    payload: AIHintRequest,
    bank: QuestionBank = Depends(get_question_bank),
    sessions: SessionManager = Depends(get_active_sessions),
):
    """Deliver a progressive, conversational hint from the Spooky Guide."""
    # Handle lobby / out-of-session hint
    if not payload.session_id or payload.session_id == "lobby":
        cat = payload.category or "spooky"
        candidates = bank._by_category.get(cat) or bank.questions
        target_q = candidates[0] if candidates else None
        if not target_q:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No trivia questions available.",
            )
        hint_req = HintRequest(
            question_id=target_q.id,
            question_text=target_q.question,
            options=target_q.options,
            correct_answer=target_q.correct_answer,
            category=target_q.category,
            difficulty=target_q.difficulty,
            hint_level=payload.hint_level,
            explanation=target_q.explanation,
        )
        return hint_service.request_hint(hint_req, session_mode=GameMode.CLASSIC)

    session = sessions.get(payload.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz session '{payload.session_id}' not found or expired.",
        )

    # Strictly disallow AI hints in competitive modes (fairness guarantee)
    if session.config.mode in (GameMode.DAILY, GameMode.DUEL):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI hints are strictly disabled in standardized competitive modes (Daily Haunt, Haunted Duels).",
        )

    # Locate target question
    target_q = None
    if payload.question_id:
        target_q = next((q for q in session.questions if q.id == payload.question_id), None)
    if not target_q:
        target_q = session.get_current_question()

    if not target_q:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active question found to provide a hint for.",
        )

    session._hint_used_on_current_question = True

    hint_req = HintRequest(
        question_id=target_q.id,
        question_text=target_q.question,
        options=target_q.options,
        correct_answer=target_q.correct_answer,
        category=target_q.category,
        difficulty=target_q.difficulty,
        hint_level=payload.hint_level,
        explanation=target_q.explanation,
    )

    try:
        return hint_service.request_hint(hint_req, session_mode=session.config.mode)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(ve))
    except Exception as e:
        logger.warning(f"Hint service error: {e}")
        fb = hint_service.fallback_provider.generate_hint(hint_req)
        return HintResponse(
            question_id=target_q.id,
            hint=fb,
            hint_level=payload.hint_level,
            source="fallback",
            fallback_used=True,
            character="Spooky Guide",
        )


# ---------------------------------------------------------------------------
# Generative AI Avatar Endpoints ("Supernatural Hunter Studio")
# ---------------------------------------------------------------------------


@router.get("/api/ai/avatar/options")
def get_avatar_creation_options():
    """Return available choices for the Supernatural Hunter avatar creator."""
    return {
        "creatures": [
            {"id": "ghost", "name": "Spectral Ghost", "icon": "👻"},
            {"id": "vampire", "name": "Crimson Vampire", "icon": "🧛"},
            {"id": "witch", "name": "Midnight Witch", "icon": "🧙"},
            {"id": "skeleton", "name": "Crypt Skeleton", "icon": "💀"},
            {"id": "werewolf", "name": "Lunar Werewolf", "icon": "🐺"},
            {"id": "pumpkin_spirit", "name": "Pumpkin Spirit", "icon": "🎃"},
        ],
        "styles": [
            {"id": "cute", "name": "Cute / Chibi"},
            {"id": "dark_fantasy", "name": "Dark Fantasy"},
            {"id": "neon_horror", "name": "Neon Horror"},
            {"id": "comic", "name": "Comic Book"},
            {"id": "gothic", "name": "Victorian Gothic"},
        ],
        "colors": [
            {"id": "purple", "name": "Eerie Purple", "hex": "#a855f7"},
            {"id": "green", "name": "Spectral Green", "hex": "#10b981"},
            {"id": "orange", "name": "Pumpkin Orange", "hex": "#f97316"},
            {"id": "blue", "name": "Midnight Blue", "hex": "#3b82f6"},
            {"id": "crimson", "name": "Blood Crimson", "hex": "#ef4444"},
        ],
        "accessories": [
            {"id": "crown", "name": "Phantom Crown", "icon": "👑"},
            {"id": "lantern", "name": "Spooky Lantern", "icon": "🏮"},
            {"id": "magic_staff", "name": "Arcane Staff", "icon": "🪄"},
            {"id": "cape", "name": "Midnight Cape", "icon": "🦇"},
            {"id": "headphones", "name": "Ghostly Beats", "icon": "🎧"},
            {"id": "spell_book", "name": "Ancient Grimoire", "icon": "📖"},
        ],
    }


@router.post("/api/ai/avatar", response_model=AvatarGenerationResult)
def generate_avatar(
    payload: AvatarGenerationRequest,
    request: Request,
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Synthesize a personalized supernatural hunter avatar with moderation and rate limiting."""
    header_id = request.headers.get("X-Player-ID")
    if header_id and (not payload.player_id or payload.player_id == "guest_default"):
        player_id = header_id
    else:
        player_id = payload.player_id or header_id or "guest_default"
    req_copy = payload.model_copy(update={"player_id": player_id})

    try:
        return avatar_service.generate_hunter_avatar(req_copy, repo=repo)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(pe))
    except Exception as e:
        logger.error(f"Avatar generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to synthesize hunter avatar. Please try again shortly.",
        )


@router.get("/api/ai/avatars")
def get_player_avatars(
    request: Request,
    player_id: str | None = Query(None),
    repo: ScoreRepository = Depends(get_score_repo),
):
    """Retrieve all synthesized supernatural hunter avatars for a player."""
    eff_player_id = player_id or request.headers.get("X-Player-ID") or "guest_default"
    return repo.get_player_generated_avatars(eff_player_id)


# ---------------------------------------------------------------------------
# Campaign ("The Haunted Journey") Endpoints
# ---------------------------------------------------------------------------


@router.get("/api/campaign/chapters")
def get_campaign_chapters():
    """Return all campaign chapters, stages, and story narratives."""
    return {"chapters": CAMPAIGN_CHAPTERS}


@router.get("/api/campaign/stages/{stage_id}")
def get_campaign_stage(stage_id: str):
    """Retrieve stage details by stage id."""
    stage = get_stage_by_id(stage_id)
    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stage '{stage_id}' not found.",
        )
    return stage


# ---------------------------------------------------------------------------
# Community Haunt Endpoints
# ---------------------------------------------------------------------------


@router.get("/api/community")
def get_community_stats():
    """Retrieve today's global Community Haunt stats and active goal."""
    stats = community_registry.get_today_stats()
    return {
        "date": stats.date_str,
        "players_entered": stats.players_entered,
        "total_completed": stats.total_completed,
        "completion_rate": stats.completion_rate,
        "average_score": stats.average_score,
        "perfect_runs": stats.perfect_runs,
        "goal": {
            "goal_id": stats.goal.goal_id,
            "title": stats.goal.title,
            "target_count": stats.goal.target_count,
            "current_count": stats.goal.current_count,
            "reward_diamonds": stats.goal.reward_diamonds,
            "is_achieved": stats.goal.is_achieved,
        },
    }


@router.post("/api/community/claim")
def claim_community_reward(payload: ClaimCommunityRewardRequest):
    """Claim diamonds for achieved daily community goal (idempotent validation)."""
    stats = community_registry.get_today_stats()
    if payload.goal_id != stats.goal.goal_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Goal ID does not match today's community goal.",
        )
    if not stats.goal.is_achieved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Community goal has not yet been achieved.",
        )

    return {
        "success": True,
        "goal_id": stats.goal.goal_id,
        "diamonds_awarded": stats.goal.reward_diamonds,
        "message": f"Claimed {stats.goal.reward_diamonds} Diamonds for community goal achievement!",
    }


# ---------------------------------------------------------------------------
# Haunted Duels Endpoints
# ---------------------------------------------------------------------------


@router.post("/api/duels")
def create_duel(payload: CreateDuelRequest):
    """Create a new Haunted Duel challenge with selected traps."""
    diff = Difficulty.from_str(payload.difficulty)
    duel = duel_registry.create_duel(
        creator_id=payload.creator_id,
        creator_name=payload.creator_name,
        creator_avatar=payload.creator_avatar,
        difficulty=diff,
        num_questions=payload.num_questions,
        traps=payload.traps,
    )
    return duel


@router.get("/api/duels/{code}")
def get_duel(code: str):
    """Retrieve challenge state for a Haunted Duel code."""
    duel = duel_registry.get_duel(code)
    if not duel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Duel '{code}' not found or expired.",
        )
    return duel


@router.post("/api/duels/{code}/accept")
def accept_duel(code: str, payload: AcceptDuelRequest):
    """Accept an invitation to a Haunted Duel."""
    duel = duel_registry.accept_duel(
        duel_code=code,
        challenger_id=payload.challenger_id,
        challenger_name=payload.challenger_name,
        challenger_avatar=payload.challenger_avatar,
    )
    if not duel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Duel '{code}' not found or expired.",
        )
    return duel


@router.post("/api/duels/{code}/submit")
def submit_duel(code: str, payload: SubmitDuelRequest):
    """Submit a completed duel run and resolve tiebreaker hierarchy if match is finished."""
    result = PlayerDuelResult(
        player_id=payload.player_id,
        player_name=payload.player_name,
        avatar_id=payload.avatar_id,
        score=payload.score,
        accuracy=payload.accuracy,
        streak=payload.streak,
        time_taken_seconds=payload.time_taken_seconds,
    )
    if payload.is_creator:
        updated = duel_registry.record_creator_result(code, result)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Duel '{code}' not found or expired.",
            )
        return {
            "duel": updated,
            "winner_id": None,
            "reason": "Waiting for challenger to complete their round.",
        }
    else:
        res = duel_registry.submit_challenger_result(code, result)
        if not res:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not resolve duel '{code}'. Please ensure creator has completed their run.",
            )
        updated_duel, winner_id, reason = res
        return {
            "duel": updated_duel,
            "winner_id": winner_id,
            "reason": reason,
        }
