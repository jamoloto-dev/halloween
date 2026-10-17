"""Tests for authentication, session management, and role authorization."""

import pytest
from fastapi.testclient import TestClient

from halloween_quiz.core.auth import hash_password, verify_password
from halloween_quiz.web.app import create_app


@pytest.fixture
def test_client(tmp_path, monkeypatch):
    db_file = tmp_path / "test_auth.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    monkeypatch.setenv("ENVIRONMENT", "development")
    app = create_app()
    with TestClient(app) as client:
        yield client


def test_password_hashing():
    pwd = "SecretSpookyPassword123"
    hashed = hash_password(pwd)
    assert hashed.startswith("pbkdf2:sha256:100000$")
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_user_registration_and_login(test_client):
    # 1. Register new user
    reg_resp = test_client.post(
        "/api/auth/register",
        json={
            "username": "night_hunter",
            "password": "Password123!",
            "nickname": "Night Hunter",
            "avatar_id": "pumpkin_hunter",
        },
    )
    assert reg_resp.status_code == 200
    data = reg_resp.json()
    assert data["username"] == "night_hunter"
    assert data["role"] == "player"
    assert data["is_guest"] is False
    assert "token" in data

    # 2. Duplicate registration fails
    dup_resp = test_client.post(
        "/api/auth/register",
        json={
            "username": "night_hunter",
            "password": "Password123!",
        },
    )
    assert dup_resp.status_code == 400
    assert "already taken" in dup_resp.json()["detail"]

    # 3. Invalid username validation
    bad_user_resp = test_client.post(
        "/api/auth/register",
        json={
            "username": "ab",  # too short
            "password": "Password123!",
        },
    )
    assert bad_user_resp.status_code in (400, 422)

    # 4. Login with correct credentials
    login_resp = test_client.post(
        "/api/auth/login",
        json={
            "username": "night_hunter",
            "password": "Password123!",
        },
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["role"] == "player"
    login_token = login_data["token"]

    # 5. Login with invalid password
    bad_login = test_client.post(
        "/api/auth/login",
        json={
            "username": "night_hunter",
            "password": "WrongPassword",
        },
    )
    assert bad_login.status_code == 401

    # 6. Verify /api/auth/me
    me_resp = test_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {login_token}"},
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == "night_hunter"
    assert me_data["role"] == "player"

    # 7. Logout
    logout_resp = test_client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {login_token}"},
    )
    assert logout_resp.status_code == 200

    # 8. Me after logout fails
    me_after_resp = test_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {login_token}"},
    )
    assert me_after_resp.status_code == 401


def test_guest_session_creation(test_client):
    guest_resp = test_client.post(
        "/api/auth/guest",
        json={
            "nickname": "Wandering Soul",
            "avatar_id": "ghost",
        },
    )
    assert guest_resp.status_code == 200
    data = guest_resp.json()
    assert data["role"] == "player"
    assert data["is_guest"] is True
    assert data["nickname"] == "Wandering Soul"
    token = data["token"]

    # Verify /api/auth/me for guest
    me_resp = test_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["role"] == "player"
    assert me_data["is_guest"] is True


def test_normal_player_forbidden_from_manual_score_submission(test_client):
    # Register normal player
    reg_resp = test_client.post(
        "/api/auth/register",
        json={
            "username": "regular_guy",
            "password": "Password123!",
        },
    )
    token = reg_resp.json()["token"]

    score_payload = {
        "player_name": "regular_guy",
        "difficulty": "hard",
        "score": 5000,
        "total_questions": 10,
        "percentage": 100.0,
    }

    # Posting score as regular authenticated player must be blocked with 403
    res = test_client.post(
        "/api/scores",
        json=score_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    assert "requires administrator privileges" in res.json()["detail"]
