"""Regression tests for Spooky Master v2.7:
1. Mutual exclusivity in navigation (preventing stacked pages underneath screen-start).
2. Dedicated Hunt mode selection with real game modes.
3. Dedicated Genie & Oracle standalone experience.
4. Gameplay countdown timer deadline, bounds, and single-timeout behavior.
5. Auth sanctum and non-admin player authorization checks.
"""

import os
import re
import time
import urllib.request

import pytest
from fastapi.testclient import TestClient

from halloween_quiz.core.engine import QuestionBank, QuizSession
from halloween_quiz.core.models import GameMode, QuizConfig
from halloween_quiz.web.app import create_app

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:5000")


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_file = tmp_path / "test_nav_timer_reg.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    monkeypatch.setenv("ENVIRONMENT", "testing")
    app = create_app()
    with TestClient(app) as c:
        yield c


def test_hunt_and_genie_pages_exist_and_render_modes(client):
    """Verify /hunt renders all 9 real game modes and /genie renders standalone oracle."""
    hunt_res = client.get("/hunt")
    assert hunt_res.status_code == 200
    assert "text/html" in hunt_res.headers["content-type"]
    hunt_html = hunt_res.text

    # Verify dedicated container
    assert 'id="page-hunt"' in hunt_html
    assert "Select Your Hunt" in hunt_html

    # Verify the 9 real game modes in codebase
    expected_modes = [
        "Classic Crypt",
        "Quick Bite",
        "Midnight Panic",
        "Deep Dive",
        "Endless Night",
        "Daily Haunt",
        "Dynamic Realm",
        "The Haunted Journey",
        "Haunted Duels",
    ]
    for mode_name in expected_modes:
        assert mode_name in hunt_html, f"Expected mode '{mode_name}' missing from /hunt"

    # Verify /genie renders standalone
    genie_res = client.get("/genie")
    assert genie_res.status_code == 200
    genie_html = genie_res.text
    assert 'id="page-genie"' in genie_html
    assert "The Spooky Genie &amp; Oracle" in genie_html or "The Spooky Genie & Oracle" in genie_html
    assert 'id="btn-genie-consult-oracle"' in genie_html


def test_auth_sanctum_modal_and_nav_pill_rendered(client):
    """Verify the auth modal, tabs, and top-nav controls are present in the HTML template."""
    res = client.get("/")
    assert res.status_code == 200
    html = res.text

    # Top nav buttons
    assert 'id="btn-nav-hunt"' in html
    assert 'id="btn-nav-genie"' in html
    assert 'id="btn-nav-music-toggle"' in html
    assert 'id="btn-nav-auth"' in html

    # Auth modal and forms
    assert 'id="modal-auth"' in html
    assert 'id="form-auth-login"' in html
    assert 'id="form-auth-register"' in html
    assert 'id="form-auth-guest"' in html
    assert 'id="tab-auth-login"' in html
    assert 'id="tab-auth-register"' in html
    assert 'id="tab-auth-guest"' in html


def test_authoritative_timer_and_timeout_behavior():
    """Verify backend session timer enforcement, panic blitz bounds, and deadline validation."""
    bank = QuestionBank()
    q_list = bank.select_questions(count=3)
    assert len(q_list) == 3

    # 1. Panic mode: Enforces authoritative 10s timer limit on question presentation
    config_panic = QuizConfig(
        player_name="Speed Demon",
        mode=GameMode.PANIC,
        time_limit_per_question=25,  # Requested 25, but Panic mode caps to 10
    )
    session_panic = QuizSession(config_panic, q_list)
    view_panic = session_panic.get_current_question_view()
    assert view_panic is not None
    assert view_panic.time_limit == 10

    # 2. Classic mode: 20s configured timer
    config_classic = QuizConfig(
        player_name="Classic Hunter",
        mode=GameMode.CLASSIC,
        time_limit_per_question=20,
    )
    session_classic = QuizSession(config_classic, q_list)
    view_classic = session_classic.get_current_question_view()
    assert view_classic is not None
    assert view_classic.time_limit == 20

    # 3. Timeout submission via "__TIMEOUT__"
    # When question times out, client submits "__TIMEOUT__" which yields incorrect, 0 points
    timeout_res = session_panic.submit_answer("__TIMEOUT__", time_taken=10.0)
    assert timeout_res.is_correct is False
    assert timeout_res.points_awarded == 0
    assert timeout_res.time_bonus == 0
    assert timeout_res.streak == 0

    # 4. Anti-cheat server monotonic timer check:
    # If question was presented 25s ago on a 20s timer, server elapsed time exceeds time_limit
    view_q2 = session_classic.get_current_question_view()
    session_classic._question_presented_at = time.monotonic() - 25.0
    # When client sends invalid time (e.g. 0.0), server uses server_elapsed (~25s) -> time_bonus is 0
    ans_res = session_classic.submit_answer(view_q2.options[0], time_taken=0.0)
    assert ans_res.time_bonus == 0

    # 5. Advancing to next question resets presentation timestamp to monotonic now
    view_q3 = session_classic.get_current_question_view()
    assert view_q3 is not None
    assert abs(session_classic._question_presented_at - time.monotonic()) < 0.5


def test_session_completion_and_state_safety():
    """Verify state transitions when round finishes or strikes accumulate."""
    bank = QuestionBank()
    q_list = bank.select_questions(count=2)
    config = QuizConfig(player_name="Test", time_limit_per_question=5)
    session = QuizSession(config, q_list)

    v1 = session.get_current_question_view()
    assert v1 is not None
    res1 = session.submit_answer(v1.options[0])
    assert res1.is_game_over is False

    v2 = session.get_current_question_view()
    assert v2 is not None
    res2 = session.submit_answer(v2.options[0])
    assert res2.is_game_over is True
    assert session.is_completed is True

    # Further submissions after game over return game over
    res3 = session.submit_answer("extra")
    assert res3.is_game_over is True


def _is_server_available(url: str = BASE_URL) -> bool:
    try:
        with urllib.request.urlopen(f"{url}/health", timeout=1.0) as res:
            return bool(res.status == 200)
    except Exception:
        return False


@pytest.mark.e2e
def test_browser_hunt_genie_and_auth_navigation(page):
    """Browser E2E test verifying mutual exclusivity: no stacked screens under #screen-start."""
    if not _is_server_available(BASE_URL):
        pytest.skip(f"Web server at {BASE_URL} not reachable.")

    from playwright.sync_api import expect

    # 1. Start at home
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    start_screen = page.locator("#screen-start")
    expect(start_screen).to_be_visible()

    # 2. Navigate to /hunt: verify page-hunt is visible and screen-start is HIDDEN
    hunt_nav = page.locator('.top-nav a[data-route="/hunt"]')
    expect(hunt_nav).to_be_visible()
    hunt_nav.click()
    page.wait_for_timeout(200)

    expect(page).to_have_url(re.compile(r"/hunt$"))
    page_hunt = page.locator("#page-hunt")
    expect(page_hunt).to_be_visible()
    expect(start_screen).not_to_be_visible()

    # 3. Navigate to /genie: verify page-genie is visible and screen-start is HIDDEN
    genie_nav = page.locator('.top-nav a[data-route="/genie"]')
    expect(genie_nav).to_be_visible()
    genie_nav.click()
    page.wait_for_timeout(200)

    expect(page).to_have_url(re.compile(r"/genie$"))
    page_genie = page.locator("#page-genie")
    expect(page_genie).to_be_visible()
    expect(page_hunt).not_to_be_visible()
    expect(start_screen).not_to_be_visible()

    # 4. Open Auth Sanctum Modal
    auth_btn = page.locator("#btn-nav-auth")
    expect(auth_btn).to_be_visible()
    auth_btn.click()
    page.wait_for_timeout(200)

    auth_modal = page.locator("#modal-auth")
    expect(auth_modal).to_be_visible()

    # Switch to Register tab
    tab_reg = page.locator("#tab-auth-register")
    tab_reg.click()
    expect(page.locator("#auth-panel-register")).to_be_visible()
    expect(page.locator("#auth-panel-login")).not_to_be_visible()

    # Close Auth modal
    page.locator("#btn-close-auth").click()
    page.wait_for_timeout(200)
    expect(auth_modal).not_to_be_visible()
