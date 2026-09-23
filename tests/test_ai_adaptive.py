"""Comprehensive tests for the Spooky Master AI Adaptive Learning Engine."""

from halloween_quiz.core.adaptive import (
    AdaptivePerformanceTracker,
    PlayerSkillProfile,
)
from halloween_quiz.core.engine import QuestionBank, QuizSession
from halloween_quiz.core.models import (
    Category,
    Difficulty,
    GameMode,
    QuizConfig,
)
from halloween_quiz.core.storage import ScoreRepository


def test_strong_player_gradually_increases_difficulty():
    """Verify strong player transitions Easy -> Medium -> Hard after evidence."""
    tracker = AdaptivePerformanceTracker(window_size=4, mode=GameMode.CLASSIC)
    assert tracker.is_adaptive_eligible is True
    assert tracker.current_difficulty == Difficulty.MEDIUM

    tracker.current_difficulty = Difficulty.EASY

    # Response 1: Fast correct answer (baseline gathering)
    d1 = tracker.record_response(
        is_correct=True, time_taken=1.5, time_limit=20.0, difficulty=Difficulty.EASY, category="spooky"
    )
    assert d1 == Difficulty.EASY
    assert tracker.last_decision.level_changed is False

    # Response 2: Fast correct answer (baseline gathering)
    d2 = tracker.record_response(
        is_correct=True, time_taken=1.8, time_limit=20.0, difficulty=Difficulty.EASY, category="spooky"
    )
    assert d2 == Difficulty.EASY
    assert tracker.last_decision.level_changed is False

    # Response 3: Fast correct answer (3 points in window -> should step up Easy -> Medium)
    d3 = tracker.record_response(
        is_correct=True, time_taken=1.2, time_limit=20.0, difficulty=Difficulty.EASY, category="spooky"
    )
    assert d3 == Difficulty.MEDIUM
    assert tracker.last_decision.level_changed is True
    assert tracker.last_decision.direction == "up"
    assert "Rising" in tracker.last_decision.feedback_message

    # Continue answering correctly at Medium: 3 more fast answers should step up to Hard
    tracker.record_response(
        is_correct=True, time_taken=1.5, time_limit=20.0, difficulty=Difficulty.MEDIUM, category="spooky"
    )
    tracker.record_response(
        is_correct=True, time_taken=1.6, time_limit=20.0, difficulty=Difficulty.MEDIUM, category="spooky"
    )
    d6 = tracker.record_response(
        is_correct=True, time_taken=1.4, time_limit=20.0, difficulty=Difficulty.MEDIUM, category="spooky"
    )
    assert d6 == Difficulty.HARD
    assert tracker.last_decision.direction == "up"


def test_struggling_player_gets_scaffolding_and_graceful_stepdown():
    """Verify struggling player receives pedagogical scaffolding and gradual step down."""
    tracker = AdaptivePerformanceTracker(window_size=4, mode=GameMode.CLASSIC)
    tracker.current_difficulty = Difficulty.HARD

    # 3 consecutive failures at Hard difficulty
    tracker.record_response(
        is_correct=False, time_taken=18.0, time_limit=20.0, difficulty=Difficulty.HARD, category="paranormal"
    )
    tracker.record_response(
        is_correct=False, time_taken=19.0, time_limit=20.0, difficulty=Difficulty.HARD, category="paranormal"
    )
    d3 = tracker.record_response(
        is_correct=False,
        time_taken=20.0,
        time_limit=20.0,
        difficulty=Difficulty.HARD,
        category="paranormal",
        is_timeout=True,
    )

    assert d3 == Difficulty.MEDIUM
    assert tracker.last_decision.level_changed is True
    assert tracker.last_decision.direction == "down"
    assert tracker.last_decision.scaffolding is not None
    assert tracker.last_decision.scaffolding.needed is True
    assert "paranormal" in tracker.last_decision.scaffolding.category
    assert "Take your time" in tracker.last_decision.scaffolding.guidance


def test_single_wrong_answer_does_not_cause_immediate_downgrade():
    """Verify system does NOT punish player immediately for a single wrong answer."""
    tracker = AdaptivePerformanceTracker(window_size=4, mode=GameMode.CLASSIC)
    tracker.current_difficulty = Difficulty.MEDIUM

    # 2 correct answers
    tracker.record_response(
        is_correct=True, time_taken=3.0, time_limit=20.0, difficulty=Difficulty.MEDIUM, category="history"
    )
    tracker.record_response(
        is_correct=True, time_taken=2.5, time_limit=20.0, difficulty=Difficulty.MEDIUM, category="history"
    )

    # 1 mistake
    d3 = tracker.record_response(
        is_correct=False, time_taken=8.0, time_limit=20.0, difficulty=Difficulty.MEDIUM, category="history"
    )

    # Must stay at MEDIUM! No knee-jerk downgrade
    assert d3 == Difficulty.MEDIUM
    assert tracker.last_decision.level_changed is False
    assert tracker.last_decision.direction == "stay"


def test_category_specific_skills_remain_separate():
    """Verify player skill is tracked independently per category."""
    tracker = AdaptivePerformanceTracker(window_size=4, mode=GameMode.CLASSIC)

    # Strong performance in Costumes & Traditions
    for _ in range(5):
        tracker.record_response(
            is_correct=True,
            time_taken=1.5,
            time_limit=20.0,
            difficulty=Difficulty.MEDIUM,
            category="costumes",
        )

    # Struggling performance in Paranormal Lore
    for _ in range(5):
        tracker.record_response(
            is_correct=False,
            time_taken=18.0,
            time_limit=20.0,
            difficulty=Difficulty.MEDIUM,
            category="paranormal",
            is_timeout=True,
        )

    profile = tracker.get_skill_profile()
    costumes_rating = profile.category_ratings["costumes"]
    paranormal_rating = profile.category_ratings["paranormal"]

    assert costumes_rating > 65.0
    assert paranormal_rating < 40.0
    assert costumes_rating > paranormal_rating + 20.0

    strongest = profile.get_strongest_category()
    weakest = profile.get_weakest_category()
    assert strongest["category"] == "costumes"
    assert weakest["category"] == "paranormal"


def test_ranked_modes_do_not_adapt():
    """Verify Daily Haunt and Haunted Duels strictly refuse adaptive difficulty."""
    # Daily Haunt
    daily_tracker = AdaptivePerformanceTracker(window_size=4, mode=GameMode.DAILY)
    assert daily_tracker.is_adaptive_eligible is False

    d_res = daily_tracker.record_response(
        is_correct=True, time_taken=1.0, time_limit=20.0, difficulty=Difficulty.EASY
    )
    assert d_res == Difficulty.EASY
    assert daily_tracker.last_decision.level_changed is False
    assert "disabled in standardized mode" in daily_tracker.last_decision.reason

    # Haunted Duels
    duel_tracker = AdaptivePerformanceTracker(window_size=4, mode=GameMode.DUEL)
    assert duel_tracker.is_adaptive_eligible is False
    duel_res = duel_tracker.record_response(
        is_correct=False, time_taken=19.0, time_limit=20.0, difficulty=Difficulty.HARD
    )
    assert duel_res == Difficulty.HARD
    assert duel_tracker.last_decision.level_changed is False


def test_player_skill_history_persists_in_sqlite(tmp_path):
    """Verify player skill profile is saved to and restored from SQLite storage."""
    db_file = tmp_path / "test_skills.db"
    repo = ScoreRepository(str(db_file))

    # Retrieve initial default profile
    initial = repo.get_skill_profile("hunter_42")
    assert initial.player_id == "hunter_42"
    assert initial.overall_rating == 50.0

    # Modify profile with updated ratings and stats
    initial.overall_rating = 78.5
    initial.category_ratings["history"] = 85.0
    initial.category_ratings["movies"] = 72.0
    initial.questions_answered = 25
    initial.hints_used = 3
    initial.current_streak = 7
    repo.save_skill_profile(initial)

    # Reload from fresh repository instance
    repo2 = ScoreRepository(str(db_file))
    loaded = repo2.get_skill_profile("hunter_42")
    assert loaded.player_id == "hunter_42"
    assert loaded.overall_rating == 78.5
    assert loaded.category_ratings["history"] == 85.0
    assert loaded.category_ratings["movies"] == 72.0
    assert loaded.questions_answered == 25
    assert loaded.hints_used == 3
    assert loaded.current_streak == 7


def test_dashboard_insights_formatting():
    """Verify dashboard insights format strongest, needs practice, and challenge level."""
    profile = PlayerSkillProfile(
        player_id="test_hunter",
        overall_rating=82.4,
        category_ratings={
            Category.HISTORY.value: 88.0,
            Category.PARANORMAL.value: 42.0,
            Category.MOVIES.value: 70.0,
            Category.CANDY.value: 65.0,
            Category.COSTUMES.value: 80.0,
            Category.SPOOKY.value: 75.0,
        },
        recent_accuracy=0.85,
        questions_answered=40,
        hints_used=2,
        timeouts=1,
    )

    insights = profile.to_dashboard_insights()
    assert insights["player_id"] == "test_hunter"
    assert insights["overall_rating"] == 82.4
    assert insights["challenge_level"] == "Hard"
    assert insights["strongest_category"]["category"] == "history"
    assert insights["strongest_category"]["rating"] == 88.0
    assert insights["needs_practice_category"]["category"] == "paranormal"
    assert insights["needs_practice_category"]["rating"] == 42.0
    assert len(insights["category_breakdown"]) == 6


def test_real_time_adaptive_session_with_question_bank():
    """Verify QuizSession in GameMode.ADAPTIVE adapts difficulty and delivers feedback."""
    bank = QuestionBank("assets/questions.json")
    config = QuizConfig(
        player_name="AdaptTester",
        difficulty=Difficulty.EASY,
        mode=GameMode.ADAPTIVE,
        num_questions=6,
    )
    initial_questions = bank.select_questions(difficulty=Difficulty.EASY, count=6)
    session = QuizSession(config, initial_questions, question_bank=bank)

    assert session.tracker.is_adaptive_eligible is True

    # Answer 3 questions correctly and fast
    for _ in range(3):
        q = session.get_current_question()
        assert q is not None
        res = session.submit_answer(answer=q.correct_answer, time_taken=1.5)
        assert res.is_correct is True
        assert res.adaptive_feedback is not None

    # After 3 strong answers, difficulty stepped up from EASY
    assert session.tracker.current_difficulty in (Difficulty.MEDIUM, Difficulty.HARD)
    summary = session.get_summary()
    assert summary["adaptive_insights"] is not None
