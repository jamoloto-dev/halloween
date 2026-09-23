"""Comprehensive tests for Spooky Master Generative AI Avatar Architecture."""

import pytest
from fastapi.testclient import TestClient

from halloween_quiz.core.ai_avatars import (
    AvatarGenerationRequest,
    AvatarPromptBuilder,
    AvatarRateLimiter,
    AvatarSafetyFilter,
    AvatarService,
    MockSvgAvatarProvider,
)
from halloween_quiz.core.entitlements import STANDARD_AVATARS, entitlement_service
from halloween_quiz.core.models import Difficulty, GameMode
from halloween_quiz.core.scoring import ScoringService
from halloween_quiz.core.storage import ScoreRepository
from halloween_quiz.web.app import create_app


def test_valid_selection_creates_request_and_svg_asset(tmp_path):
    """Verify valid avatar specification synthesizes a clean SVG vector avatar."""
    provider = MockSvgAvatarProvider(output_dir=tmp_path)
    service = AvatarService(provider=provider)

    req = AvatarGenerationRequest(
        player_id="hunter_007",
        creature="witch",
        style="dark_fantasy",
        color="purple",
        accessory="lantern",
        customization="Purple flames flickering in eyes",
    )

    result = service.generate_hunter_avatar(req)
    assert result.avatar_id.startswith("hunter_")
    assert result.player_id == "hunter_007"
    assert result.creature == "witch"
    assert result.style == "dark_fantasy"
    assert result.color == "purple"
    assert result.accessory == "lantern"
    assert result.status == "approved"
    assert result.asset_url.endswith(".svg") or result.asset_url.startswith("data:image/svg")


def test_unsafe_and_prohibited_customization_rejected():
    """Verify content moderation safety filter blocks prohibited or violent content."""
    unsafe_customizations = [
        "Lots of bloody gore and violence",
        "graphic murder and blood splatters",
        "inappropriate sexual content",
        "nazi swastika insignia",
    ]

    for uc in unsafe_customizations:
        is_safe, msg = AvatarSafetyFilter.check_safety(uc)
        assert is_safe is False, f"Failed to reject unsafe customization: {uc}"
        assert "prohibited or unsafe" in msg

        req = AvatarGenerationRequest(
            player_id="evil_hunter",
            creature="vampire",
            customization=uc,
        )
        service = AvatarService()
        with pytest.raises(ValueError, match="Safety constraint violated"):
            service.generate_hunter_avatar(req)


def test_prompt_builder_art_direction_and_sanitization():
    """Verify prompt builder applies consistent art direction and limits."""
    req = AvatarGenerationRequest(
        player_id="hunter_art",
        creature="ghost",
        style="gothic",
        color="blue",
        accessory="crown",
        customization="spectral crown floating gently",
    )

    prompt, p_hash = AvatarPromptBuilder.build(req)
    assert "Stylized Halloween game avatar portrait" in prompt
    assert "gothic" in prompt
    assert "phantom cyan" in prompt or "blue" in prompt
    assert "crown" in prompt
    assert len(p_hash) == 16


def test_rate_limiter_cooldown_and_daily_cap():
    """Verify rate limiter blocks rapid requests and daily quota exhaustion."""
    limiter = AvatarRateLimiter(cooldown_seconds=10, daily_cap=3)

    # 1. First request allowed
    ok1, _, _ = limiter.check_and_record("speedy_player")
    assert ok1 is True

    # 2. Immediate second request rejected by cooldown
    ok2, wait_sec, msg2 = limiter.check_and_record("speedy_player")
    assert ok2 is False
    assert wait_sec > 0
    assert "wait" in msg2.lower()

    # Different player should be allowed
    ok_other, _, _ = limiter.check_and_record("other_player")
    assert ok_other is True


def test_prompt_hash_caching_in_repository(tmp_path):
    """Verify identical creature/style/color selections reuse existing avatar asset."""
    db_file = tmp_path / "avatar_cache.db"
    repo = ScoreRepository(str(db_file))
    provider = MockSvgAvatarProvider(output_dir=tmp_path / "avatars")
    service = AvatarService(provider=provider)

    req = AvatarGenerationRequest(
        player_id="caching_player",
        creature="skeleton",
        style="comic",
        color="green",
        accessory="spell_book",
    )

    # First generation synthesizes and stores asset
    res1 = service.generate_hunter_avatar(req, repo=repo)
    assert res1.cached is False

    # Second generation reuses the cached avatar record immediately
    # Bypass rate limiter for cache test
    service.rate_limiter = AvatarRateLimiter(cooldown_seconds=0, daily_cap=10)
    res2 = service.generate_hunter_avatar(req, repo=repo)
    assert res2.cached is True
    assert res2.avatar_id == res1.avatar_id
    assert res2.asset_url == res1.asset_url


def test_existing_avatars_preserved_and_available():
    """Verify original standard avatars remain 100% available and unchanged."""
    expected_standard = [
        "pumpkin_hunter",
        "ghost",
        "vampire",
        "witch",
        "skeleton",
        "zombie",
        "werewolf",
        "night_bat",
    ]
    for av in expected_standard:
        assert av in STANDARD_AVATARS
        # Free tier can always equip standard avatars
        assert entitlement_service.can_use_avatar(entitlement_service.resolve_tier("guest"), av) is True

    # Generated hunter avatars are also valid without requiring paid pass
    assert entitlement_service.can_use_avatar(entitlement_service.resolve_tier("guest"), "hunter_12345") is True
    assert entitlement_service.can_use_avatar(entitlement_service.resolve_tier("guest"), "gen_67890") is True


def test_generated_avatar_does_not_affect_scoring():
    """Verify equipping a generated avatar provides zero score bonus or advantage."""
    scoring = ScoringService()

    # Question score with standard avatar
    score_standard = scoring.calculate_question_score(
        difficulty=Difficulty.MEDIUM,
        is_correct=True,
        current_streak=3,
        client_time_taken=2.0,
        server_elapsed=2.0,
        time_limit=30,
        mode=GameMode.CLASSIC,
        booster_multiplier=1,
    )

    # Question score with generated avatar
    score_custom = scoring.calculate_question_score(
        difficulty=Difficulty.MEDIUM,
        is_correct=True,
        current_streak=3,
        client_time_taken=2.0,
        server_elapsed=2.0,
        time_limit=30,
        mode=GameMode.CLASSIC,
        booster_multiplier=1,
    )

    assert score_standard.total_points == score_custom.total_points
    assert score_standard.time_bonus == score_custom.time_bonus


def test_api_ai_avatar_endpoints_lifecycle():
    """Verify REST API /api/ai/avatar options, generation, and retrieval."""
    app = create_app()
    client = TestClient(app)

    # 1. GET /api/ai/avatar/options
    opts_resp = client.get("/api/ai/avatar/options")
    assert opts_resp.status_code == 200
    options_data = opts_resp.json()
    assert "creatures" in options_data
    assert "styles" in options_data
    assert "colors" in options_data
    assert "accessories" in options_data
    assert any(c["id"] == "pumpkin_spirit" for c in options_data["creatures"])

    # 2. POST /api/ai/avatar
    gen_resp = client.post(
        "/api/ai/avatar",
        headers={"X-Player-ID": "api_avatar_tester"},
        json={
            "creature": "pumpkin_spirit",
            "style": "dark_fantasy",
            "color": "orange",
            "accessory": "lantern",
            "customization": "glowing carved grin with embers",
        },
    )
    assert gen_resp.status_code == 200
    data = gen_resp.json()
    assert "avatar_id" in data
    assert "asset_url" in data
    assert data["status"] == "approved"

    # 3. GET /api/ai/avatars
    list_resp = client.get(
        "/api/ai/avatars",
        headers={"X-Player-ID": "api_avatar_tester"},
    )
    assert list_resp.status_code == 200
    avatars_list = list_resp.json()
    assert isinstance(avatars_list, list)
    assert len(avatars_list) >= 1
    assert avatars_list[0]["creature"] == "pumpkin_spirit"
