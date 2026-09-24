"""Integration tests for Spooky Master v2.6 Multi-Page Game Routes."""

import pytest
from fastapi.testclient import TestClient

from halloween_quiz.web.app import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_file = tmp_path / "test_routes.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.mark.parametrize(
    "route,expected_title_fragment",
    [
        ("/", "Spooky Master"),
        ("/play", "Play Setup"),
        ("/play/session", "Active Quiz"),
        ("/results", "Hunt Results"),
        ("/results/test-session-123", "Hunt Results"),
        ("/journey", "Haunted Journey"),
        ("/journey/chapter/ch1_abandoned_manor", "Chapter Journey"),
        ("/journey/chapter/chapter_1", "Chapter Journey"),
        ("/daily-haunt", "Daily Haunt"),
        ("/duels", "Haunted Duels"),
        ("/duels/SPOOK-TEST99", "Duel Challenge"),
        ("/progress", "Progress & Mastery"),
        ("/leaderboard", "Leaderboard"),
        ("/pass", "Spooky Master Pass"),
        ("/settings", "Settings"),
        ("/hunters", "Hunter Guises"),
        ("/hunter-studio", "Hunter Studio"),
        ("/privacy", "Privacy Policy"),
    ],
)
def test_all_game_routes_return_200(client, route, expected_title_fragment):
    res = client.get(route)
    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]
    assert expected_title_fragment in res.text
    if route != "/privacy":
        assert "window.__INITIAL_ROUTE__" in res.text
        assert "window.__INITIAL_PAGE__" in res.text
