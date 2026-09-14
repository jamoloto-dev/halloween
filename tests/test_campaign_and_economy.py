"""Tests for Campaign Mode, Economy & Market, Duels, Audio Riddles, and Adaptive Difficulty."""

import pytest
from fastapi.testclient import TestClient

from halloween_quiz.core.adaptive import AdaptivePerformanceTracker
from halloween_quiz.core.audio_riddles import PROCEDURAL_AUDIO_RIDDLES
from halloween_quiz.core.campaign import calculate_stage_stars
from halloween_quiz.core.duels import PlayerDuelResult, determine_duel_winner
from halloween_quiz.core.models import Difficulty, GameMode
from halloween_quiz.web.app import create_app


@pytest.fixture
def client():
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def test_campaign_chapters_and_stage_lookup(client):
    """Verify campaign chapters endpoint and stage resolution."""
    res = client.get("/api/campaign/chapters")
    assert res.status_code == 200
    data = res.json()
    assert "chapters" in data
    assert len(data["chapters"]) == 6
    assert data["chapters"][0]["id"] == "ch1_abandoned_manor"
    assert len(data["chapters"][0]["stages"]) == 4

    # Stage lookup
    stage_res = client.get("/api/campaign/stages/ch1_s1")
    assert stage_res.status_code == 200
    stage_data = stage_res.json()
    assert stage_data["id"] == "ch1_s1"
    assert stage_data["reward_diamonds"] == 20

    # Star calculation
    assert calculate_stage_stars(95.0) == 3
    assert calculate_stage_stars(80.0) == 2
    assert calculate_stage_stars(60.0) == 1


def test_start_campaign_quiz_session(client):
    """Test starting a quiz session tied to a campaign stage."""
    res = client.post(
        "/api/quiz/start",
        json={
            "player_name": "Valiant Hunter",
            "stage_id": "ch1_s1",
            "mode": "campaign",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "session_id" in data
    assert data["total_questions"] == 5
    assert data["first_question"] is not None


def test_booster_activation_lifecycle(client):
    """Test activating boosters in casual session and prohibition in daily mode."""
    # Casual session allows boosters
    res = client.post(
        "/api/quiz/start",
        json={"player_name": "Witch Doctor", "mode": "classic", "num_questions": 5},
    )
    session_id = res.json()["session_id"]

    # 1. Activate Hint
    hint_res = client.post(f"/api/quiz/{session_id}/booster", json={"booster_type": "hint"})
    assert hint_res.status_code == 200
    assert hint_res.json()["success"] is True
    assert "eliminated_options" in hint_res.json()

    # 2. Activate Double Points
    dp_res = client.post(f"/api/quiz/{session_id}/booster", json={"booster_type": "double_points"})
    assert dp_res.status_code == 200
    assert dp_res.json()["multiplier"] == 2

    # 3. Activate Shield
    shield_res = client.post(f"/api/quiz/{session_id}/booster", json={"booster_type": "shield"})
    assert shield_res.status_code == 200
    assert shield_res.json()["shield_active"] is True

    # Daily Mode prohibits boosters (fairness guard)
    daily_start = client.post(
        "/api/quiz/start",
        json={"player_name": "Ranked Player", "mode": "daily", "num_questions": 5},
    )
    daily_session_id = daily_start.json()["session_id"]
    daily_booster = client.post(
        f"/api/quiz/{daily_session_id}/booster",
        json={"booster_type": "hint"},
    )
    assert daily_booster.status_code == 400
    assert "strictly prohibited" in daily_booster.json()["detail"].lower()


def test_community_haunt_stats_and_claim(client):
    """Verify community stats retrieval and claim validation."""
    res = client.get("/api/community")
    assert res.status_code == 200
    data = res.json()
    assert "players_entered" in data
    assert "goal" in data
    goal = data["goal"]
    assert "target_count" in goal

    # Incomplete goal cannot be claimed
    claim_res = client.post(
        "/api/community/claim",
        json={"player_id": "test_player", "goal_id": goal["goal_id"]},
    )
    if not goal["is_achieved"]:
        assert claim_res.status_code == 400


def test_haunted_duels_flow_and_tiebreaker(client):
    """Verify creating a duel, accepting it, and determining winner via tiebreaker."""
    # 1. Create duel
    create_res = client.post(
        "/api/duels",
        json={
            "creator_id": "p1_ghost",
            "creator_name": "Ghost Lord",
            "creator_avatar": "ghost",
            "difficulty": "medium",
            "num_questions": 5,
            "traps": ["ghost_fog", "cursed_clock"],
        },
    )
    assert create_res.status_code == 200
    duel = create_res.json()
    code = duel["duel_code"]
    assert code.startswith("SPOOK-")
    assert "ghost_fog" in duel["traps"]

    # 2. Get duel by code
    get_res = client.get(f"/api/duels/{code}")
    assert get_res.status_code == 200
    assert get_res.json()["duel_code"] == code

    # 3. Accept duel
    accept_res = client.post(
        f"/api/duels/{code}/accept",
        json={
            "challenger_id": "p2_witch",
            "challenger_name": "Wicked Witch",
            "challenger_avatar": "witch",
        },
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["challenger_id"] == "p2_witch"

    # 4. Creator submits score
    submit_p1 = client.post(
        f"/api/duels/{code}/submit",
        json={
            "player_id": "p1_ghost",
            "player_name": "Ghost Lord",
            "avatar_id": "ghost",
            "score": 800,
            "accuracy": 80.0,
            "streak": 4,
            "time_taken_seconds": 22.5,
            "is_creator": True,
        },
    )
    assert submit_p1.status_code == 200
    assert submit_p1.json()["winner_id"] is None

    # 5. Challenger submits score (higher score wins)
    submit_p2 = client.post(
        f"/api/duels/{code}/submit",
        json={
            "player_id": "p2_witch",
            "player_name": "Wicked Witch",
            "avatar_id": "witch",
            "score": 950,
            "accuracy": 100.0,
            "streak": 5,
            "time_taken_seconds": 18.0,
            "is_creator": False,
        },
    )
    assert submit_p2.status_code == 200
    assert submit_p2.json()["winner_id"] == "p2_witch"
    assert "scored 950 pts vs 800 pts" in submit_p2.json()["reason"]


def test_duel_tiebreaker_hierarchy():
    """Verify tiebreaker logic: Score > Accuracy > Elapsed Time."""
    p1 = PlayerDuelResult(
        player_id="p1", player_name="P1", score=1000, accuracy=80.0, time_taken_seconds=30.0
    )
    p2 = PlayerDuelResult(
        player_id="p2", player_name="P2", score=1000, accuracy=90.0, time_taken_seconds=35.0
    )

    # Equal score, higher accuracy wins
    winner_id, reason = determine_duel_winner(p1, p2)
    assert winner_id == "p2"
    assert "Accuracy" in reason

    # Equal score and accuracy, faster time wins
    p3 = PlayerDuelResult(
        player_id="p3", player_name="P3", score=1000, accuracy=90.0, time_taken_seconds=25.0
    )
    winner_id2, reason2 = determine_duel_winner(p2, p3)
    assert winner_id2 == "p3"
    assert "Speed" in reason2


def test_audio_riddles_and_accessible_transcripts():
    """Verify procedural audio riddles contain sound cues and accessible fallbacks."""
    assert len(PROCEDURAL_AUDIO_RIDDLES) >= 5
    for riddle in PROCEDURAL_AUDIO_RIDDLES:
        assert riddle.audio_clip_id is not None
        assert riddle.accessible_transcript is not None
        assert len(riddle.accessible_transcript) > 10
        assert riddle.correct_answer in riddle.options


def test_adaptive_difficulty_tracker():
    """Verify rolling performance tracker stepping up and stepping down."""
    tracker = AdaptivePerformanceTracker(window_size=4, mode=GameMode.CLASSIC)
    assert tracker.is_adaptive_eligible is True

    # 3 fast correct answers should step up difficulty
    tracker.record_response(
        is_correct=True, time_taken=2.0, time_limit=20.0, difficulty=Difficulty.EASY
    )
    tracker.record_response(
        is_correct=True, time_taken=2.0, time_limit=20.0, difficulty=Difficulty.EASY
    )
    next_diff = tracker.record_response(
        is_correct=True, time_taken=2.0, time_limit=20.0, difficulty=Difficulty.EASY
    )
    assert next_diff in (Difficulty.MEDIUM, Difficulty.HARD)

    # 3 wrong or slow answers should step down difficulty
    tracker.record_response(
        is_correct=False, time_taken=19.0, time_limit=20.0, difficulty=Difficulty.HARD
    )
    tracker.record_response(
        is_correct=False, time_taken=19.0, time_limit=20.0, difficulty=Difficulty.HARD
    )
    stepped_down = tracker.record_response(
        is_correct=False, time_taken=19.0, time_limit=20.0, difficulty=Difficulty.HARD
    )
    assert stepped_down in (Difficulty.MEDIUM, Difficulty.EASY)
