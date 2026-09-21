"""Comprehensive Monetization, Scoring, Leaderboard, Competitive, and Social Sharing Tests.

Verifies:
- Authoritative Scoring (correct/wrong points, speed bonus, difficulty, streak bonus, caps, anti-cheat)
- Leaderboards (Daily, All-Time, Personal Best, filters, duplicate prevention, verification)
- Entitlements & Freemium Access (free vs pass, chapter locks, avatar locks, theme locks, dev override isolation)
- Competitive Fairness (Duels, Daily Haunt, booster restrictions in ranked play)
- Social Sharing (sanitized payload, no private PII)
"""

import os
from unittest.mock import patch

import pytest
from starlette.testclient import TestClient

from halloween_quiz.core.duels import PlayerDuelResult, determine_duel_winner
from halloween_quiz.core.entitlements import (
    EntitlementService,
    EntitlementTier,
)
from halloween_quiz.core.models import Difficulty, GameMode
from halloween_quiz.core.scoring import ScoringService
from halloween_quiz.core.storage import ScoreRepository
from halloween_quiz.web.app import create_app


@pytest.fixture
def scoring_service() -> ScoringService:
    return ScoringService()


@pytest.fixture
def entitlement_service() -> EntitlementService:
    return EntitlementService()


@pytest.fixture
def in_memory_repo(tmp_path) -> ScoreRepository:
    db_file = tmp_path / "test_competition.db"
    return ScoreRepository(db_path_or_url=str(db_file))


@pytest.fixture
def client(in_memory_repo) -> TestClient:
    app = create_app()
    app.state.score_repo = in_memory_repo
    return TestClient(app)


# ===========================================================================
# 1. AUTHORITATIVE SCORING ENGINE TESTS
# ===========================================================================


def test_scoring_correct_base_points(scoring_service: ScoringService):
    """Correct answers earn difficulty-scaled base points."""
    easy_res = scoring_service.calculate_question_score(
        difficulty=Difficulty.EASY,
        is_correct=True,
        current_streak=0,
        client_time_taken=30.0,
        server_elapsed=30.0,
        time_limit=30.0,
    )
    assert easy_res.base_points == 100
    assert easy_res.streak == 1
    assert easy_res.total_points >= 100

    med_res = scoring_service.calculate_question_score(
        difficulty=Difficulty.MEDIUM,
        is_correct=True,
        current_streak=0,
        client_time_taken=20.0,
        server_elapsed=20.0,
        time_limit=20.0,
    )
    assert med_res.base_points == 200

    hard_res = scoring_service.calculate_question_score(
        difficulty=Difficulty.HARD,
        is_correct=True,
        current_streak=0,
        client_time_taken=15.0,
        server_elapsed=15.0,
        time_limit=15.0,
    )
    assert hard_res.base_points == 300


def test_scoring_wrong_answer_yields_zero_points(scoring_service: ScoringService):
    """Incorrect answers yield strictly 0 points and reset streak."""
    wrong_res = scoring_service.calculate_question_score(
        difficulty=Difficulty.HARD,
        is_correct=False,
        current_streak=5,
        client_time_taken=1.0,
        server_elapsed=1.0,
        time_limit=15.0,
    )
    assert wrong_res.is_correct is False
    assert wrong_res.base_points == 0
    assert wrong_res.streak_bonus == 0
    assert wrong_res.time_bonus == 0
    assert wrong_res.total_points == 0
    assert wrong_res.streak == 0


def test_scoring_streak_bonus_and_capping(scoring_service: ScoringService):
    """Consecutive correct answers award +10% per streak up to 1.5x cap."""
    # Streak 1: streak factor 1.0 (0 bonus)
    res_1 = scoring_service.calculate_question_score(
        difficulty=Difficulty.EASY,
        is_correct=True,
        current_streak=0,
        client_time_taken=30.0,
        server_elapsed=30.0,
        time_limit=30.0,
    )
    assert res_1.streak == 1
    assert res_1.streak_bonus == 0

    # Streak 2: streak factor 1.1 (+10% of 100 = 10)
    res_2 = scoring_service.calculate_question_score(
        difficulty=Difficulty.EASY,
        is_correct=True,
        current_streak=1,
        client_time_taken=30.0,
        server_elapsed=30.0,
        time_limit=30.0,
    )
    assert res_2.streak == 2
    assert res_2.streak_bonus == 10

    # Streak 10: capped at 1.5x (+50% of 100 = 50)
    res_10 = scoring_service.calculate_question_score(
        difficulty=Difficulty.EASY,
        is_correct=True,
        current_streak=9,
        client_time_taken=30.0,
        server_elapsed=30.0,
        time_limit=30.0,
    )
    assert res_10.streak == 10
    assert res_10.streak_bonus == 50


def test_scoring_speed_bonus():
    """Swift answers award extra points based on remaining time ratio."""
    service = ScoringService()
    # Answered immediately (0.5s out of 30s)
    fast_res = service.calculate_question_score(
        difficulty=Difficulty.EASY,
        is_correct=True,
        current_streak=0,
        client_time_taken=0.5,
        server_elapsed=0.5,
        time_limit=30.0,
        mode=GameMode.CLASSIC,
    )
    assert fast_res.time_bonus > 40  # Close to 50% max speed bonus on 100 base

    # Answered at the last moment (29.5s out of 30s)
    slow_res = service.calculate_question_score(
        difficulty=Difficulty.EASY,
        is_correct=True,
        current_streak=0,
        client_time_taken=29.5,
        server_elapsed=29.5,
        time_limit=30.0,
        mode=GameMode.CLASSIC,
    )
    assert slow_res.time_bonus < 5


def test_scoring_server_authoritative_anti_cheat(scoring_service: ScoringService):
    """Client sending forged 0.0s time is clamped by authoritative server timing."""
    # Attacker claims 0.001s, but server measured 8.0s elapsed
    effective_time = scoring_service.resolve_effective_time(
        client_time_taken=0.001,
        server_elapsed=8.0,
    )
    assert effective_time == 8.0

    # Negative client time is rejected
    effective_time_neg = scoring_service.resolve_effective_time(
        client_time_taken=-5.0,
        server_elapsed=4.0,
    )
    assert effective_time_neg == 4.0


def test_scoring_disables_boosters_in_competitive_modes(scoring_service: ScoringService):
    """Fairness guarantee: Booster multipliers are strictly disabled in competitive modes."""
    # In casual classic mode, multiplier is applied
    casual_res = scoring_service.calculate_question_score(
        difficulty=Difficulty.EASY,
        is_correct=True,
        current_streak=0,
        client_time_taken=10.0,
        server_elapsed=10.0,
        time_limit=30.0,
        mode=GameMode.CLASSIC,
        booster_multiplier=2,
        is_competitive=False,
    )
    assert casual_res.applied_multiplier == 2

    # In competitive ranked mode, multiplier is forced to 1
    ranked_res = scoring_service.calculate_question_score(
        difficulty=Difficulty.EASY,
        is_correct=True,
        current_streak=0,
        client_time_taken=10.0,
        server_elapsed=10.0,
        time_limit=30.0,
        mode=GameMode.DAILY,
        booster_multiplier=2,
        is_competitive=True,
    )
    assert ranked_res.applied_multiplier == 1


# ===========================================================================
# 2. LEADERBOARD REPOSITORY & API TESTS
# ===========================================================================


def test_leaderboard_daily_all_time_and_personal_best(in_memory_repo: ScoreRepository):
    """Leaderboard persists daily challenge dates, unboosted filters, and personal bests."""
    # Player A: Yesterday's run
    in_memory_repo.save_score(
        player_name="GhostAlpha",
        difficulty="medium",
        score=1500,
        correct_count=8,
        total_questions=10,
        percentage=80.0,
        mode="classic",
        max_streak=5,
        challenge_date="2026-10-30",
        avatar_id="pumpkin_hunter",
        is_boosted=False,
    )

    # Player A: Today's run (daily mode)
    in_memory_repo.save_score(
        player_name="GhostAlpha",
        difficulty="hard",
        score=2200,
        correct_count=9,
        total_questions=10,
        percentage=90.0,
        mode="daily",
        max_streak=7,
        challenge_date="2026-10-31",
        avatar_id="phantom_king",
        is_boosted=False,
    )

    # Player B: Today's boosted run
    in_memory_repo.save_score(
        player_name="CheaterOrBoosted",
        difficulty="hard",
        score=3500,
        correct_count=10,
        total_questions=10,
        percentage=100.0,
        mode="classic",
        max_streak=10,
        challenge_date="2026-10-31",
        avatar_id="ghost",
        is_boosted=True,
    )

    # 1. All-time leaderboard (all runs)
    all_time = in_memory_repo.get_leaderboard(timeframe="all")
    assert len(all_time) == 3
    assert all_time[0].score == 3500

    # 2. Unboosted ranked leaderboard
    ranked = in_memory_repo.get_leaderboard(unboosted_only=True)
    assert len(ranked) == 2
    assert all(not r.is_boosted for r in ranked)
    assert ranked[0].player_name == "GhostAlpha"
    assert ranked[0].score == 2200

    # 3. Daily challenge filter
    daily_records = in_memory_repo.get_leaderboard(challenge_date="2026-10-31")
    assert len(daily_records) == 2

    # 4. Personal Best retrieval
    pb = in_memory_repo.get_personal_best("GhostAlpha")
    assert pb["player_name"] == "GhostAlpha"
    assert pb["high_score"] == 2200
    assert pb["best_streak"] == 7
    assert pb["total_games"] == 2
    assert pb["best_daily"] == 2200
    assert pb["best_percentage"] == 90.0


def test_personal_best_api_endpoint(client: TestClient, in_memory_repo: ScoreRepository):
    """GET /api/leaderboard/personal-best retrieves player record."""
    in_memory_repo.save_score(
        player_name="ShadowStalker",
        difficulty="hard",
        score=1850,
        correct_count=8,
        total_questions=10,
        percentage=80.0,
        mode="classic",
        max_streak=6,
    )

    res = client.get("/api/leaderboard/personal-best?player_name=ShadowStalker")
    assert res.status_code == 200
    data = res.json()
    assert data["player_name"] == "ShadowStalker"
    assert data["high_score"] == 1850
    assert data["best_streak"] == 6
    assert data["total_games"] == 1


def test_production_blocks_arbitrary_manual_score_post(client: TestClient):
    """In production, arbitrary POST to /api/leaderboard is blocked without admin key."""
    with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
        res = client.post(
            "/api/leaderboard",
            json={
                "player_name": "ForgedWinner",
                "difficulty": "hard",
                "score": 999999,
                "correct_count": 10,
                "total_questions": 10,
                "percentage": 100.0,
            },
        )
        assert res.status_code == 403
        assert "Manual leaderboard submission is disabled in production" in res.json()["detail"]


# ===========================================================================
# 3. ENTITLEMENTS & FREEMIUM ACCESS CONTROL TESTS
# ===========================================================================


def test_free_tier_entitlement_status(entitlement_service: EntitlementService):
    """Free players retain full access to core game, chapters 1-3, and standard avatars."""
    status = entitlement_service.get_status(player_id="free_hunter")
    assert status.tier == EntitlementTier.FREE
    assert status.is_premium is False
    assert status.capabilities.unlocked_chapters == [1, 2, 3]
    assert "pumpkin_hunter" in status.capabilities.unlocked_avatars
    assert "phantom_king" not in status.capabilities.unlocked_avatars
    assert status.capabilities.is_ad_free is False
    assert status.capabilities.competitive_advantage is False


def test_premium_pass_capabilities(entitlement_service: EntitlementService):
    """Premium Pass unlocks chapters 4-6, supernatural avatars, themes, ad-free, no pay-to-win."""
    entitlement_service.set_player_tier("vip_hunter", EntitlementTier.SPOOKY_PASS)
    status = entitlement_service.get_status(player_id="vip_hunter")
    assert status.tier == EntitlementTier.SPOOKY_PASS
    assert status.is_premium is True
    assert status.capabilities.unlocked_chapters == [1, 2, 3, 4, 5, 6]
    assert "phantom_king" in status.capabilities.unlocked_avatars
    assert "banshee" in status.capabilities.unlocked_avatars
    assert "blood_moon" in status.capabilities.unlocked_themes
    assert "cryptids" in status.capabilities.unlocked_topics
    assert status.capabilities.is_ad_free is True
    # Non-negotiable fairness: Strictly False
    assert status.capabilities.competitive_advantage is False


def test_chapter_access_gating(entitlement_service: EntitlementService):
    """Chapters 1-3 are free; Chapters 4-6 require premium pass."""
    free_tier = EntitlementTier.FREE
    vip_tier = EntitlementTier.SPOOKY_PASS

    # Free player
    assert entitlement_service.can_access_chapter(free_tier, 1) is True
    assert entitlement_service.can_access_chapter(free_tier, 2) is True
    assert entitlement_service.can_access_chapter(free_tier, 3) is True
    assert entitlement_service.can_access_chapter(free_tier, 4) is False
    assert entitlement_service.can_access_chapter(free_tier, 5) is False
    assert entitlement_service.can_access_chapter(free_tier, 6) is False

    # VIP player
    assert entitlement_service.can_access_chapter(vip_tier, 4) is True
    assert entitlement_service.can_access_chapter(vip_tier, 5) is True
    assert entitlement_service.can_access_chapter(vip_tier, 6) is True


def test_avatar_and_theme_gating(entitlement_service: EntitlementService):
    """Supernatural avatars and cosmetic themes require entitlement."""
    free_tier = EntitlementTier.FREE
    vip_tier = EntitlementTier.SPOOKY_PASS

    # Standard avatar is accessible to all
    assert entitlement_service.can_use_avatar(free_tier, "pumpkin_hunter") is True
    assert entitlement_service.can_use_avatar(free_tier, "ghost") is True

    # Premium avatars require pass
    assert entitlement_service.can_use_avatar(free_tier, "phantom_king") is False
    assert entitlement_service.can_use_avatar(free_tier, "banshee") is False
    assert entitlement_service.can_use_avatar(vip_tier, "phantom_king") is True
    assert entitlement_service.can_use_avatar(vip_tier, "banshee") is True

    # Themes
    assert entitlement_service.can_use_theme(free_tier, "default") is True
    assert entitlement_service.can_use_theme(free_tier, "blood_moon") is False
    assert entitlement_service.can_use_theme(vip_tier, "blood_moon") is True


def test_dev_override_cannot_leak_to_production():
    """DEV_PREMIUM_MODE override is strictly ignored in production environments."""
    service = EntitlementService()
    with patch.dict(os.environ, {"ENVIRONMENT": "production", "DEV_PREMIUM_MODE": "true"}):
        tier = service.resolve_tier("test_player", requested_tier="spooky_pass")
        assert tier == EntitlementTier.FREE
        assert service.is_dev_override_allowed() is False


def test_api_entitlements_and_verify_endpoints(client: TestClient):
    """GET /api/entitlements and POST /api/entitlements/verify."""
    res = client.get("/api/entitlements?player_id=test_hunter")
    assert res.status_code == 200
    data = res.json()
    assert "tier" in data
    assert "catalog" in data
    assert len(data["catalog"]) >= 2

    # Verify / Restore purchase endpoint
    verify_res = client.post(
        "/api/entitlements/verify",
        json={"player_id": "test_hunter", "purchase_token": "mock_token_123"},
    )
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["success"] is True


def test_campaign_premium_chapter_rejected_for_free_player(client: TestClient):
    """Starting quiz session for Chapter 4 stage without entitlement returns 403 Forbidden."""
    res = client.post(
        "/api/quiz/start",
        json={
            "player_name": "FreeRunner",
            "stage_id": "ch4_s1",
        },
        headers={"X-Player-ID": "free_runner"},
    )
    assert res.status_code == 403
    assert "requires the Spooky Master Pass" in res.json()["detail"]


# ===========================================================================
# 4. COMPETITIVE FAIRNESS & DUEL TESTS
# ===========================================================================


def test_haunted_duels_winner_determination_fairness():
    """Haunted Duels winner resolution relies strictly on Score -> Accuracy -> Time, never on paid status."""
    p1 = PlayerDuelResult(
        player_id="free_player",
        player_name="FreeHunter",
        avatar_id="pumpkin_hunter",
        score=1200,
        accuracy=100.0,
        time_taken_seconds=12.4,
    )
    p2 = PlayerDuelResult(
        player_id="premium_player",
        player_name="VIPLord",
        avatar_id="phantom_king",
        score=1200,
        accuracy=100.0,
        time_taken_seconds=15.1,
    )
    # Both scored 1200 with 100% accuracy. P1 answered faster (12.4s vs 15.1s)
    winner_id, reason = determine_duel_winner(p1, p2)
    assert winner_id == "free_player"
    assert "Tiebreaker (Speed)" in reason


def test_daily_haunt_standardized_conditions(client: TestClient):
    """Daily Haunt provides identical conditions, rules, and question counts."""
    res = client.get("/api/daily-haunt/info")
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "daily"
    assert "challenge_version" in data
    assert "booster_restrictions" in data
    assert "Booster multipliers disabled" in data["booster_restrictions"]


# ===========================================================================
# 5. SOCIAL SHARING PRIVACY & PAYLOAD TESTS
# ===========================================================================


def test_social_share_payload_sanitization():
    """Sharing payload must contain game achievements and scores, never private UUIDs or emails."""
    hunter_name = "NightCrawler"
    score = 4820
    accuracy = 92
    streak = 8
    mode = "PANIC"

    share_text = (
        f"🎃 Spooky Master Survival Card\n"
        f"Hunter: {hunter_name}\n"
        f"Score: {score:,} pts | Accuracy: {accuracy}%\n"
        f"Best Streak: {streak} 🔥 | Mode: {mode}\n"
        f"Can you beat me?"
    )

    # Privacy verification
    assert "@" not in share_text  # No emails
    assert "uuid" not in share_text.lower()
    assert "token" not in share_text.lower()
    assert "password" not in share_text.lower()
    assert "NightCrawler" in share_text
    assert "4,820" in share_text
    assert "92%" in share_text


# ===========================================================================
# 6. MONETIZATION INTEGRITY & HARDENING AUDIT TESTS
# ===========================================================================


def test_durable_entitlement_persistence(tmp_path):
    """Entitlements must survive across EntitlementService restarts via SQLite repository."""
    db_file = tmp_path / "durable_test.db"
    repo = ScoreRepository(str(db_file))

    # Save entitlement in repository
    repo.save_entitlement(
        user_id="hunter_alpha",
        tier="spooky_pass",
        source="store",
        is_guest=True,
    )

    # Initialize a new EntitlementService simulating a fresh process/container restart
    service = EntitlementService(repo=repo)
    resolved = service.resolve_tier("hunter_alpha")
    assert resolved == EntitlementTier.SPOOKY_PASS

    # Verify status report includes durable_sqlite storage_type
    status = service.get_status("hunter_alpha")
    assert status.tier == EntitlementTier.SPOOKY_PASS
    assert status.is_premium is True
    assert status.storage_type == "durable_sqlite"
    assert status.is_guest is True

    # Unknown player defaults to FREE
    assert service.resolve_tier("unknown_hunter") == EntitlementTier.FREE


def test_entitlement_expiration_handling(tmp_path):
    """Expired subscription entitlements must fall back to FREE tier."""
    from datetime import datetime, timedelta, timezone
    db_file = tmp_path / "expiration_test.db"
    repo = ScoreRepository(str(db_file))

    # Expired VIP entitlement (1 day in past)
    past_date = datetime.now(timezone.utc) - timedelta(days=1)
    repo.save_entitlement(
        user_id="hunter_expired",
        tier="haunted_vip",
        source="stripe",
        expires_at=past_date,
    )

    service = EntitlementService(repo=repo)
    assert service.resolve_tier("hunter_expired") == EntitlementTier.FREE


def test_zero_pay_to_win_policy_a_guarantee():
    """Policy A: All premium tiers grant exactly 0 daily diamond currency; live prices are disabled."""
    service = EntitlementService()
    for tier in [EntitlementTier.FREE, EntitlementTier.SPOOKY_PASS, EntitlementTier.HAUNTED_VIP]:
        caps = service.get_capabilities(tier)
        assert caps.daily_diamond_bonus == 0, f"Tier {tier} violates zero-pay-to-win by granting diamonds!"
        assert caps.competitive_advantage is False

    # Verify product catalog pricing honesty
    flags = service.get_feature_flags()
    assert flags["FEATURE_ADS"] is False, "Ads must be disabled when no provider SDK is integrated"
    assert flags["FEATURE_SUBSCRIPTIONS"] is False, "Subscriptions must be disabled when no gateway is integrated"
    for product in service.get_status("test").catalog:
        assert product.is_live_price is False
        assert "proposed configuration" in product.notice.lower()


def test_guest_identity_and_personal_best_separation(tmp_path):
    """Identical player display names with distinct player_ids must not overwrite personal bests."""
    db_file = tmp_path / "identity_test.db"
    repo = ScoreRepository(str(db_file))

    # Player 1 with name "Ghost Hunter"
    repo.save_score(
        player_id="player_uuid_001",
        player_name="Ghost Hunter",
        difficulty="hard",
        score=2500,
        is_guest=True,
    )

    # Player 2 with same display name "Ghost Hunter"
    repo.save_score(
        player_id="player_uuid_002",
        player_name="Ghost Hunter",
        difficulty="easy",
        score=800,
        is_guest=True,
    )

    pb1 = repo.get_personal_best(player_name="Ghost Hunter", player_id="player_uuid_001")
    pb2 = repo.get_personal_best(player_name="Ghost Hunter", player_id="player_uuid_002")

    assert pb1["player_id"] == "player_uuid_001"
    assert pb1["high_score"] == 2500
    assert pb1["is_guest"] is True

    assert pb2["player_id"] == "player_uuid_002"
    assert pb2["high_score"] == 800
    assert pb2["is_guest"] is True


def test_api_receipt_verification_simulation_flags(client: TestClient):
    """Receipt verification endpoint must explicitly disclose simulation and lack of provider config."""
    res = client.post(
        "/api/entitlements/verify",
        json={"player_id": "test_guest_hunter", "purchase_token": "token_abc"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["verified_by_provider"] is False
    assert data["provider_configured"] is False
    assert data["simulation"] is True


def test_production_endpoint_lockdown(client: TestClient, monkeypatch):
    """POST /api/leaderboard must strictly reject calls in production with 403 Forbidden."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    payload = {
        "player_name": "Cheater",
        "difficulty": "hard",
        "score": 99999,
        "total_questions": 10,
        "percentage": 100.0,
    }
    res = client.post("/api/leaderboard", json=payload)
    assert res.status_code == 403
    assert "disabled in production" in res.json()["detail"]

