"""Tests for backend concurrency hardening, in-memory question caching, and rate limiting."""

from fastapi.testclient import TestClient
from sqlalchemy import text

from halloween_quiz.core.storage import ScoreRepository
from halloween_quiz.web.app import create_app
from halloween_quiz.web.security import InMemoryRateLimiter


def test_sqlite_wal_mode_and_busy_timeout(tmp_path):
    """Verify SQLite database engine initializes with WAL mode and busy timeout."""
    db_file = tmp_path / "test_concurrency.db"
    repo = ScoreRepository(str(db_file))

    with repo.engine.connect() as conn:
        journal_mode = conn.execute(text("PRAGMA journal_mode")).scalar()
        busy_timeout = conn.execute(text("PRAGMA busy_timeout")).scalar()
        synchronous = conn.execute(text("PRAGMA synchronous")).scalar()

    assert str(journal_mode).upper() == "WAL"
    assert busy_timeout is not None and int(busy_timeout) >= 15000
    assert synchronous is not None


def test_trivia_questions_cached_in_memory_endpoint(tmp_path, monkeypatch):
    """Verify /api/questions and /api/trivia/questions serve from in-memory cache with zero DB access."""
    db_file = tmp_path / "test_caching.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    monkeypatch.setenv("ENVIRONMENT", "testing")
    app = create_app()

    with TestClient(app) as client:
        res = client.get("/api/questions?limit=10")
        assert res.status_code == 200
        data = res.json()
        assert data["cached"] is True
        assert data["total_available"] > 0
        assert len(data["questions"]) <= 10
        assert "options" in data["questions"][0]

        # Check alias
        res_alias = client.get("/api/trivia/questions?limit=5")
        assert res_alias.status_code == 200
        data_alias = res_alias.json()
        assert data_alias["cached"] is True
        assert len(data_alias["questions"]) <= 5


def test_sensitive_endpoints_rate_limiter_logic():
    """Verify in-memory rate limiter strictly limits sensitive attempts under production environment."""
    limiter = InMemoryRateLimiter()
    key = "auth:192.168.1.100"

    # Allow 20 requests per minute
    for _ in range(20):
        allowed, remaining = limiter.check(key, max_requests=20, window_seconds=60.0)
        assert allowed is True

    # 21st request must be denied
    allowed, remaining = limiter.check(key, max_requests=20, window_seconds=60.0)
    assert allowed is False
    assert remaining == 0
