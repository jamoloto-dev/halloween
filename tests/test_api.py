"""Integration tests for FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient

from halloween_quiz.web.app import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    # Set temp database and questions
    db_file = tmp_path / "test_api.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    app = create_app()
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database_connected"] is True
    assert data["questions_loaded"] >= 100
    assert data["version"] == "2.0.0"


def test_categories_endpoint(client):
    res = client.get("/api/categories")
    assert res.status_code == 200
    data = res.json()
    assert "categories" in data
    assert len(data["categories"]) == 6
    assert "difficulties" in data


def test_quiz_flow(client):
    # 1. Start quiz
    start_payload = {
        "player_name": "Dracula",
        "difficulty": "medium",
        "categories": ["spooky", "movies"],
        "num_questions": 3,
        "time_limit_per_question": 20,
    }
    start_res = client.post("/api/quiz/start", json=start_payload)
    assert start_res.status_code == 200
    start_data = start_res.json()
    assert "session_id" in start_data
    session_id = start_data["session_id"]
    assert start_data["total_questions"] == 3
    assert start_data["first_question"] is not None

    # 2. Get status
    status_res = client.get(f"/api/quiz/{session_id}")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["score"] == 0
    assert not status_data["is_completed"]

    # 3. Answer question
    answer_payload = {
        "answer": "0",  # index 0
        "time_taken": 4.5,
    }
    ans_res = client.post(f"/api/quiz/{session_id}/answer", json=answer_payload)
    assert ans_res.status_code == 200
    ans_data = ans_res.json()
    assert "is_correct" in ans_data
    assert "points_awarded" in ans_data
    assert ans_data["next_question"] is not None

    # 4. Timeout next question
    timeout_res = client.post(f"/api/quiz/{session_id}/timeout")
    assert timeout_res.status_code == 200
    timeout_data = timeout_res.json()
    assert not timeout_data["is_correct"]

    # 5. Answer final question to complete session
    final_res = client.post(f"/api/quiz/{session_id}/answer", json={"answer": "0", "time_taken": 2.0})
    assert final_res.status_code == 200
    final_data = final_res.json()
    assert final_data["is_game_over"] is True

    # 6. Verify summary
    final_status = client.get(f"/api/quiz/{session_id}")
    assert final_status.status_code == 200
    assert final_status.json()["is_completed"] is True
    assert final_status.json()["summary"] is not None


def test_leaderboard_endpoints(client):
    # Post a score
    score_payload = {
        "player_name": "WitchOfEndor",
        "difficulty": "hard",
        "score": 1250,
        "total_questions": 10,
        "percentage": 100.0,
    }
    res = client.post("/api/leaderboard", json=score_payload)
    assert res.status_code == 200

    # Get leaderboard
    board_res = client.get("/api/leaderboard")
    assert board_res.status_code == 200
    board_data = board_res.json()
    assert board_data["total"] >= 1
    assert any(e["player_name"] == "WitchOfEndor" for e in board_data["entries"])


def test_root_serves_spa(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]
    assert "Halloween Quiz" in res.text
