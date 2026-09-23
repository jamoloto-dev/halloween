"""Comprehensive tests for Spooky Master Smart AI Hint System."""

import pytest
from fastapi.testclient import TestClient

from halloween_quiz.core.ai_hints import (
    BaseHintProvider,
    DeterministicFallbackHintProvider,
    HintRequest,
    HintService,
    HintValidator,
    MockHintProvider,
)
from halloween_quiz.core.models import Difficulty, GameMode
from halloween_quiz.web.app import create_app


def test_hint_validator_rejects_direct_answer_leakage():
    """Verify validator catches and blocks exact correct answer strings."""
    req = HintRequest(
        question_id="spooky_01",
        question_text="What ghost is said to appear in mirrors when you say their name three times?",
        options=["Bloody Mary", "Casper", "The White Lady", "Slender Man"],
        correct_answer="Bloody Mary",
        category="spooky",
        difficulty=Difficulty.EASY,
        hint_level=1,
    )

    # Direct leakage of correct answer
    leak_hint = "👻 Spooky Guide: The mirror summons Bloody Mary if you dare."
    valid, msg = HintValidator.validate(leak_hint, req)
    assert valid is False
    assert "directly contains the correct answer" in msg

    # Safe guidance without answer
    safe_hint = (
        "👻 Spooky Guide: Think about popular slumber party folklore whispered before a dark mirror."
    )
    valid_safe, _ = HintValidator.validate(safe_hint, req)
    assert valid_safe is True


def test_hint_validator_rejects_option_letter_leakage():
    """Verify validator catches and blocks option letter reveals (A, B, C, D)."""
    req = HintRequest(
        question_id="spooky_02",
        question_text="What mythical creature drinks human blood and hates garlic?",
        options=["Vampire", "Werewolf", "Zombie", "Mummy"],
        correct_answer="Vampire",
        category="spooky",
        difficulty=Difficulty.EASY,
        hint_level=1,
    )

    bad_hints = [
        "👻 Spooky Guide: The answer is option A.",
        "👻 Spooky Guide: Pick choice B for this question.",
        "👻 Spooky Guide: Select letter C.",
        "👻 Spooky Guide: Choice 1 is the right path.",
    ]

    for bh in bad_hints:
        valid, msg = HintValidator.validate(bh, req)
        assert valid is False, f"Failed to reject bad hint: {bh}"
        assert "option letter" in msg


def test_hint_validator_rejects_urls_and_excessive_length():
    """Verify validator catches external URLs and oversized content."""
    req = HintRequest(
        question_id="candy_01",
        question_text="Which candy was originally called Chicken Feed?",
        options=["Candy Corn", "Jelly Beans", "Caramels", "Tootsie Rolls"],
        correct_answer="Candy Corn",
        category="candy",
        difficulty=Difficulty.EASY,
        hint_level=1,
    )

    url_hint = "👻 Spooky Guide: Look at https://spooky-wiki.com/candy for clues."
    valid, msg = HintValidator.validate(url_hint, req)
    assert valid is False
    assert "external links" in msg

    long_hint = "👻 Spooky Guide: " + ("A very long mysterious story about autumn harvest. " * 15)
    valid_long, msg_long = HintValidator.validate(long_hint, req)
    assert valid_long is False
    assert "maximum length" in msg_long


def test_progressive_hint_levels():
    """Verify Levels 1, 2, and 3 produce progressively deeper clues."""
    provider = DeterministicFallbackHintProvider()
    req = HintRequest(
        question_id="history_01",
        question_text="Which ancient Celtic festival is considered the precursor to Halloween?",
        options=["Samhain", "Beltane", "Lughnasadh", "Imbolc"],
        correct_answer="Samhain",
        category="history",
        difficulty=Difficulty.MEDIUM,
        explanation="Samhain marked the end of the harvest season and the beginning of winter.",
    )

    # Level 1: Gentle thematic lore
    req.hint_level = 1
    h1 = provider.generate_hint(req)
    assert "Spooky Guide" in h1
    assert "Samhain" not in h1
    assert HintValidator.validate(h1, req)[0] is True

    # Level 2: Stronger contextual detail
    req.hint_level = 2
    h2 = provider.generate_hint(req)
    assert "Spooky Guide" in h2
    assert "Samhain" not in h2
    assert HintValidator.validate(h2, req)[0] is True

    # Level 3: Guided deductive reasoning
    req.hint_level = 3
    h3 = provider.generate_hint(req)
    assert "Spooky Guide" in h3
    assert "Samhain" not in h3
    assert HintValidator.validate(h3, req)[0] is True

    # Ensure levels provide distinct guidance
    assert h1 != h2
    assert h2 != h3


def test_provider_failure_falls_back_cleanly():
    """Verify that an exception in the provider triggers the deterministic fallback."""

    class BrokenProvider(BaseHintProvider):
        def generate_hint(self, request: HintRequest) -> str:
            raise RuntimeError("External AI service connection timeout (HTTP 504)")

    service = HintService(provider=BrokenProvider())
    req = HintRequest(
        question_id="movies_01",
        question_text="What is the name of the masked killer in Halloween (1978)?",
        options=["Michael Myers", "Jason Voorhees", "Freddy Krueger", "Leatherface"],
        correct_answer="Michael Myers",
        category="movies",
        difficulty=Difficulty.EASY,
        hint_level=1,
    )

    resp = service.request_hint(req, session_mode=GameMode.CLASSIC)
    assert resp.fallback_used is True
    assert resp.source == "fallback"
    assert "Spooky Guide" in resp.hint
    assert "Michael Myers" not in resp.hint


def test_provider_leakage_triggers_fallback():
    """Verify that if a buggy AI provider leaks the answer, fallback is used instead."""

    class LeakyProvider(BaseHintProvider):
        def generate_hint(self, request: HintRequest) -> str:
            return f"👻 Spooky Guide: Obviously the answer is {request.correct_answer}!"

    service = HintService(provider=LeakyProvider())
    req = HintRequest(
        question_id="spooky_99",
        question_text="What creature transforms during a full moon?",
        options=["Werewolf", "Vampire", "Goblin", "Banshee"],
        correct_answer="Werewolf",
        category="spooky",
        difficulty=Difficulty.EASY,
        hint_level=1,
    )

    resp = service.request_hint(req, session_mode=GameMode.CLASSIC)
    # The leaky response must be rejected by HintValidator and replaced by fallback
    assert resp.fallback_used is True
    assert "Werewolf" not in resp.hint


def test_hint_caching():
    """Verify repeated hint requests for the same question and level return cached response."""
    service = HintService(provider=MockHintProvider())
    req = HintRequest(
        question_id="cache_test_01",
        question_text="What vegetable was originally carved before pumpkins?",
        options=["Turnip", "Potato", "Beet", "Rutabaga"],
        correct_answer="Turnip",
        category="history",
        difficulty=Difficulty.MEDIUM,
        hint_level=1,
    )

    resp1 = service.request_hint(req, session_mode=GameMode.CLASSIC)
    assert resp1.cached is False

    resp2 = service.request_hint(req, session_mode=GameMode.CLASSIC)
    assert resp2.cached is True
    assert resp2.source == "cache"
    assert resp1.hint == resp2.hint


def test_ranked_mode_refuses_ai_hints():
    """Verify Daily Haunt and Haunted Duels refuse AI hints for competitive fairness."""
    service = HintService()
    req = HintRequest(
        question_id="comp_01",
        question_text="Sample competitive question?",
        options=["A", "B", "C", "D"],
        correct_answer="A",
        category="spooky",
        difficulty=Difficulty.MEDIUM,
        hint_level=1,
    )

    with pytest.raises(ValueError, match="strictly disabled in standardized competitive mode"):
        service.request_hint(req, session_mode=GameMode.DAILY)

    with pytest.raises(ValueError, match="strictly disabled in standardized competitive mode"):
        service.request_hint(req, session_mode=GameMode.DUEL)


def test_api_ai_hint_endpoint_lifecycle():
    """Verify REST API /api/ai/hint integration with running quiz sessions."""
    app = create_app()
    client = TestClient(app)

    # 1. Start a casual quiz session
    start_resp = client.post(
        "/api/quiz/start",
        json={
            "player_name": "HintSeeker",
            "mode": "classic",
            "difficulty": "medium",
            "num_questions": 5,
        },
    )
    assert start_resp.status_code == 200
    data = start_resp.json()
    session_id = data["session_id"]
    first_q_id = data["first_question"]["id"]

    # 2. Request Level 1 hint
    h1_resp = client.post(
        "/api/ai/hint",
        json={"session_id": session_id, "question_id": first_q_id, "hint_level": 1},
    )
    assert h1_resp.status_code == 200
    h1_data = h1_resp.json()
    assert "hint" in h1_data
    assert h1_data["hint_level"] == 1
    assert "Spooky Guide" in h1_data["character"]

    # 3. Request Level 2 hint
    h2_resp = client.post(
        "/api/ai/hint",
        json={"session_id": session_id, "question_id": first_q_id, "hint_level": 2},
    )
    assert h2_resp.status_code == 200
    assert h2_resp.json()["hint_level"] == 2

    # 4. Request lobby hint without active session
    lobby_resp = client.post(
        "/api/ai/hint",
        json={"session_id": "lobby", "category": "spooky", "hint_level": 1},
    )
    assert lobby_resp.status_code == 200
    assert "hint" in lobby_resp.json()


def test_api_ai_hint_rejected_in_daily_haunt():
    """Verify REST API /api/ai/hint returns 403 Forbidden in Daily Haunt mode."""
    app = create_app()
    client = TestClient(app)

    # Start Daily Haunt session
    start_resp = client.post(
        "/api/quiz/start",
        json={
            "player_name": "CompetitiveSpirit",
            "mode": "daily",
            "difficulty": "medium",
            "num_questions": 5,
        },
    )
    assert start_resp.status_code == 200
    session_id = start_resp.json()["session_id"]

    # Request hint in Daily Haunt -> Must return 403
    hint_resp = client.post(
        "/api/ai/hint",
        json={"session_id": session_id, "hint_level": 1},
    )
    assert hint_resp.status_code == 403
    assert "strictly disabled" in hint_resp.json()["detail"]
