"""Production hardening and game expansion unit/integration tests."""

import time

import pytest
from fastapi.testclient import TestClient

from halloween_quiz.core.engine import QuestionBank, QuizSession, SessionManager
from halloween_quiz.core.models import Difficulty, GameMode, QuizConfig
from halloween_quiz.web.app import create_app
from halloween_quiz.web.security import InMemoryRateLimiter


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_file = tmp_path / "test_prod.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    monkeypatch.setenv("ENVIRONMENT", "testing")
    app = create_app()
    with TestClient(app) as c:
        yield c


def test_liveness_and_readiness(client):
    """Test /live and /ready probes."""
    live_res = client.get("/live")
    assert live_res.status_code == 200
    assert live_res.json()["status"] == "alive"

    ready_res = client.get("/ready")
    assert ready_res.status_code == 200
    assert ready_res.json()["status"] == "ready"


def test_daily_haunt_api(client):
    """Verify daily challenge info endpoint."""
    res = client.get("/api/daily")
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "daily"
    assert "date" in data
    assert "seconds_remaining" in data


def test_pwa_and_privacy_routes(client):
    """Verify manifest.json, sw.js, offline.html, and privacy routes."""
    # Manifest
    manifest_res = client.get("/manifest.json")
    assert manifest_res.status_code == 200
    assert "application/manifest+json" in manifest_res.headers["content-type"]
    manifest_data = manifest_res.json()
    assert manifest_data["start_url"] == "/"
    assert manifest_data["theme_color"] == "#ff7518"

    # Service Worker
    sw_res = client.get("/sw.js")
    assert sw_res.status_code == 200
    assert "javascript" in sw_res.headers["content-type"]
    assert sw_res.headers["service-worker-allowed"] == "/"

    # Offline shell
    off_res = client.get("/offline.html")
    assert off_res.status_code == 200
    assert "text/html" in off_res.headers["content-type"]
    assert "Dead Zone" in off_res.text

    # Privacy page
    priv_res = client.get("/privacy")
    assert priv_res.status_code == 200
    assert "Privacy Policy" in priv_res.text


def test_session_manager_expiration_and_capacity():
    """Verify SessionManager TTL expiry and memory bounds."""
    # Create with 1 second TTL and max capacity 2
    mgr = SessionManager(ttl_seconds=1, max_sessions=2)
    bank = QuestionBank()
    q_list = bank.select_questions(count=2)

    s1 = QuizSession(QuizConfig(player_name="Player 1"), q_list)
    s2 = QuizSession(QuizConfig(player_name="Player 2"), q_list)
    s3 = QuizSession(QuizConfig(player_name="Player 3"), q_list)

    mgr.add(s1)
    mgr.add(s2)
    assert mgr.count() == 2
    assert s1.session_id in mgr
    assert s2.session_id in mgr

    # Adding s3 should evict oldest session
    mgr.add(s3)
    assert mgr.count() == 2
    assert s3.session_id in mgr

    # Test TTL expiration after 1.1s
    time.sleep(1.1)
    assert mgr.get(s3.session_id) is None
    assert mgr.count() == 0


def test_deterministic_daily_questions():
    """Verify that daily question selection is identical for identical dates."""
    bank = QuestionBank()
    today_questions_1 = bank.select_daily_questions(date_str="2026-10-31", count=10)
    today_questions_2 = bank.select_daily_questions(date_str="2026-10-31", count=10)
    different_day = bank.select_daily_questions(date_str="2026-11-01", count=10)

    assert len(today_questions_1) == 10
    assert [q.id for q in today_questions_1] == [q.id for q in today_questions_2]
    # Different date should yield different order / question set
    assert [q.id for q in today_questions_1] != [q.id for q in different_day]


def test_authoritative_server_timing_and_anti_cheat():
    """Verify server rejects fake client time_taken: 0 for full time bonus."""
    bank = QuestionBank()
    questions = bank.select_questions(count=2)
    config = QuizConfig(difficulty=Difficulty.MEDIUM, time_limit_per_question=20)
    session = QuizSession(config, questions)

    # Fetch question view to start server timer
    view = session.get_current_question_view()
    assert view is not None

    # Simulate fake client claiming 0 seconds when 0.2s elapsed on server
    time.sleep(0.2)
    result = session.submit_answer(answer=questions[0].correct_answer, time_taken=0.0)

    # Server should calculate bonus based on server elapsed time (~0.2s), NOT client's 0.0
    assert result.is_correct is True
    base_pts = session.DIFFICULTY_BASE_POINTS.get(questions[0].difficulty, 200)
    # Server elapsed time (~0.2s) must have reduced the bonus below maximum (base_pts * 0.5)
    max_bonus = int(base_pts * 0.5)
    assert result.time_bonus < max_bonus
    assert session.history[0]["time_taken"] >= 0.15


def test_game_modes_and_streak_achievements():
    """Verify Panic and Endless game modes and badges."""
    bank = QuestionBank()
    questions = bank.select_questions(count=12)

    # Test Panic mode: 10s timer limit
    panic_session = QuizSession(
        QuizConfig(mode=GameMode.PANIC, time_limit_per_question=30),
        questions,
    )
    view = panic_session.get_current_question_view()
    assert view.time_limit == 10

    # Test achievements unlock on streak
    res1 = panic_session.submit_answer(questions[0].correct_answer)
    assert res1.streak == 1
    res2 = panic_session.submit_answer(questions[1].correct_answer)
    assert res2.streak == 2
    res3 = panic_session.submit_answer(questions[2].correct_answer)
    assert res3.streak == 3
    # "Ghost Hunter" unlocked on streak 3
    assert res3.achievement_unlocked == "Ghost Hunter"

    # Test Endless mode: 3 strikes ends game
    endless_session = QuizSession(
        QuizConfig(mode=GameMode.ENDLESS),
        questions,
    )
    endless_session.get_current_question_view()
    endless_session.submit_answer("__WRONG_1__")
    assert endless_session.strikes == 1
    assert not endless_session.is_completed

    endless_session.get_current_question_view()
    endless_session.submit_answer("__WRONG_2__")
    assert endless_session.strikes == 2
    assert not endless_session.is_completed

    endless_session.get_current_question_view()
    res_final = endless_session.submit_answer("__WRONG_3__")
    assert endless_session.strikes == 3
    assert endless_session.is_completed is True
    assert res_final.is_game_over is True


def test_in_memory_rate_limiter():
    """Verify rate limiter allows up to limit and blocks after."""
    limiter = InMemoryRateLimiter()
    # Test key with max 3 requests in 1.0 second
    key = "test_ip_123"
    assert limiter.check(key, max_requests=3, window_seconds=1.0)[0] is True
    assert limiter.check(key, max_requests=3, window_seconds=1.0)[0] is True
    assert limiter.check(key, max_requests=3, window_seconds=1.0)[0] is True
    # 4th request must be blocked
    assert limiter.check(key, max_requests=3, window_seconds=1.0)[0] is False

    # After window passes, should allow again
    time.sleep(1.05)
    assert limiter.check(key, max_requests=3, window_seconds=1.0)[0] is True
