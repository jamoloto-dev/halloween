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
    """Browser E2E test verifying Landing -> ENTER -> Guest Auth -> Dashboard -> /hunt -> /genie mutual exclusivity."""
    if not _is_server_available(BASE_URL):
        pytest.skip(f"Web server at {BASE_URL} not reachable.")

    from playwright.sync_api import expect

    # 1. Start at home as a new visitor: verify Dedicated Landing Screen (#screen-landing) is active
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    landing_screen = page.locator("#screen-landing")
    start_screen = page.locator("#screen-start")
    expect(landing_screen).to_be_visible()
    expect(start_screen).not_to_be_visible()

    # Verify single visible primary button (ENTER) on landing screen and zero vertical scroll
    visible_buttons = page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll('button, a.btn-cta, a.btn-secondary'));
        return btns.filter(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        }).map(el => el.id || el.textContent.trim());
    }""")
    assert visible_buttons == ["btn-landing-enter"]

    has_vertical_scroll = page.evaluate(
        "() => document.documentElement.scrollHeight > window.innerHeight + 2"
    )
    assert not has_vertical_scroll

    # 2. Click ENTER (#btn-landing-enter) -> transitions to Dedicated Auth Sanctum (#modal-auth)
    page.locator("#btn-landing-enter").click()
    auth_modal = page.locator("#modal-auth")
    expect(auth_modal).to_be_visible()
    expect(landing_screen).not_to_be_visible()
    expect(start_screen).not_to_be_visible()

    # 3. Choose Play as Guest (#btn-auth-quick-guest) -> transitions to Compact Game Dashboard (#screen-start)
    page.locator("#btn-auth-quick-guest").click()
    expect(start_screen).to_be_visible()
    expect(auth_modal).not_to_be_visible()
    expect(page.locator("#dashboard-icon-grid")).to_be_visible()

    # 4. Navigate to /hunt: verify page-hunt is visible and screen-start is HIDDEN
    hunt_nav = page.locator('.top-nav a[data-route="/hunt"]')
    expect(hunt_nav).to_be_visible()
    hunt_nav.click()
    page.wait_for_timeout(200)

    expect(page).to_have_url(re.compile(r"/hunt$"))
    page_hunt = page.locator("#page-hunt")
    expect(page_hunt).to_be_visible()
    expect(start_screen).not_to_be_visible()

    # 5. Navigate to /genie: verify page-genie is visible and screen-start is HIDDEN
    genie_nav = page.locator('.top-nav a[data-route="/genie"]')
    expect(genie_nav).to_be_visible()
    genie_nav.click()
    page.wait_for_timeout(200)

    expect(page).to_have_url(re.compile(r"/genie$"))
    page_genie = page.locator("#page-genie")
    expect(page_genie).to_be_visible()
    expect(page_hunt).not_to_be_visible()
    expect(start_screen).not_to_be_visible()

    # 6. Open Auth Sanctum Modal from top nav
    auth_btn = page.locator("#btn-nav-auth")
    expect(auth_btn).to_be_visible()
    auth_btn.click()
    page.wait_for_timeout(200)

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


def test_cinematic_horror_world_hud_and_results_markup(client):
    """Verify landing screen, auth sanctum, compact dashboard, gothic world SVG, 9 realm portals, and HUD markup."""
    res = client.get("/")
    assert res.status_code == 200
    html = res.text

    # Dedicated Landing Screen & Single ENTER Action
    assert 'id="screen-landing"' in html
    assert 'id="btn-landing-enter"' in html
    assert 'id="btn-auth-music-toggle"' in html
    assert 'id="btn-auth-quick-guest"' in html
    assert 'id="dashboard-icon-grid"' in html
    assert 'id="bgm-audio" src="/sounds/spooky-master-main.mp3"' in html

    # Gothic architecture & hero mission select CTA
    assert 'class="gothic-citadel-svg"' in html
    assert 'id="btn-hero-hunt-modes"' in html

    # All 9 Haunted World realm portals
    for realm in [
        "classic",
        "quick",
        "panic",
        "deep",
        "endless",
        "daily",
        "adaptive",
        "journey",
        "duels",
    ]:
        assert f'data-realm="{realm}"' in html

    # All 3 Genie sanctum chambers & live telemetry strip
    for sanctum in ["oracle", "studio", "grimoire"]:
        assert f'data-sanctum="{sanctum}"' in html
    assert 'id="genie-live-telemetry-bar"' in html

    # Gameplay HUD controls & floating score delta
    assert 'id="btn-quiz-audio-toggle"' in html
    assert 'id="btn-quiz-exit"' in html
    assert 'id="hud-score-delta"' in html

    # Results Personal Best banner & Select Another Mission CTA
    assert 'id="summary-pb-banner"' in html
    assert 'id="btn-select-mission-finish"' in html


@pytest.mark.e2e
def test_browser_hud_controls_low_time_tension_and_mobile_hunt_overflow(page):
    """Verify in-game HUD exit/audio controls, low-time tension vignette, and mobile /hunt overflow."""
    if not _is_server_available(BASE_URL):
        pytest.skip(f"Web server at {BASE_URL} not reachable.")

    from playwright.sync_api import expect

    page.add_init_script("window.localStorage.setItem('spooky_gate_entered', 'true');")
    page.goto(f"{BASE_URL}/hunt")
    page.wait_for_load_state("networkidle")

    # Launch Quick Bite directly from /hunt portal
    quick_btn = page.locator('#page-hunt .btn-start-mode[data-mode="quick"]')
    expect(quick_btn).to_be_visible()
    quick_btn.click()

    quiz_screen = page.locator("#screen-quiz")
    expect(quiz_screen).to_be_visible()
    expect(page.locator("#page-hunt")).not_to_be_visible()

    # Footer is hidden during active gameplay for full-screen game immersion
    expect(page.locator(".app-footer")).not_to_be_visible()

    # Verify in-HUD audio toggle and exit buttons are visible
    audio_btn = page.locator("#btn-quiz-audio-toggle")
    exit_btn = page.locator("#btn-quiz-exit")
    expect(audio_btn).to_be_visible()
    expect(exit_btn).to_be_visible()

    # Trigger low-time (< 5s) tension state and verify .timer-critical on #active-quiz-card
    has_critical = page.evaluate("""() => {
        window.halloweenApp.quizMgr.updateTimerHud(3.5, 20);
        return document.getElementById('active-quiz-card').classList.contains('timer-critical');
    }""")
    assert has_critical is True

    # Exit crypt returns cleanly to main menu
    exit_btn.click()
    expect(page.locator("#screen-start")).to_be_visible()
    expect(quiz_screen).not_to_be_visible()

    # Check mobile 320px, 360px, 390px, 430px, 768px, and 1440px viewports for zero horizontal overflow
    for width, height in [(320, 568), (360, 800), (390, 844), (430, 932), (768, 1024), (1440, 900)]:
        page.set_viewport_size({"width": width, "height": height})
        for route in ["/", "/hunt", "/genie"]:
            page.goto(f"{BASE_URL}{route}")
            page.wait_for_load_state("networkidle")
            overflow = page.evaluate(
                "() => document.documentElement.scrollWidth > document.documentElement.clientWidth"
            )
            assert not overflow, f"Horizontal overflow on {route} at {width}x{height}"


@pytest.mark.e2e
def test_e2e_landing_audio_rejection_and_auth_register_login_flow(page):
    """Verify Landing -> ENTER audio playback & rejection resilience -> Auth validation, Register, Logout, Login."""
    if not _is_server_available(BASE_URL):
        pytest.skip(f"Web server at {BASE_URL} not reachable.")

    import uuid

    from playwright.sync_api import expect

    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    # 1. Verify no autoplay on initial landing screen load
    initial_audio_state = page.evaluate("""() => ({
        paused: document.getElementById('bgm-audio').paused,
        ambienceRequested: window.halloweenApp.sound.ambienceRequested,
        activeScreen: document.body.getAttribute('data-active-screen'),
    })""")
    assert initial_audio_state["paused"] is True
    assert initial_audio_state["ambienceRequested"] is False
    assert initial_audio_state["activeScreen"] == "landing"

    # 2. Simulate browser autoplay rejection on first ENTER click and verify app still transitions cleanly
    page.evaluate("""() => {
        const audio = document.getElementById('bgm-audio');
        window.__origPlay = audio.play.bind(audio);
        audio.play = () => Promise.reject(new DOMException('Autoplay blocked by test', 'NotAllowedError'));
    }""")

    page.locator("#btn-landing-enter").click()
    expect(page.locator("#modal-auth")).to_be_visible()
    assert page.evaluate("() => document.body.getAttribute('data-active-screen')") == "auth"
    expect(page.locator("#auth-music-status")).to_have_text("Music: OFF (Tap to Retry)")
    expect(page.locator("#btn-auth-music-toggle")).to_have_attribute("aria-pressed", "false")

    # Restore real play() and test the obvious music retry toggle (#btn-auth-music-toggle) on Auth screen
    page.evaluate("""() => {
        const audio = document.getElementById('bgm-audio');
        if (window.__origPlay) audio.play = window.__origPlay;
    }""")
    expect(page.locator("#btn-auth-music-toggle")).to_be_visible()
    page.locator("#btn-auth-music-toggle").click()
    expect(page.locator("#auth-music-status")).to_have_text("Music: ON")
    expect(page.locator("#btn-auth-music-toggle")).to_have_attribute("aria-pressed", "true")
    assert page.evaluate("() => window.halloweenApp.sound.ambienceRequested") is True

    # 3. Verify client-side validation on Sign In
    page.locator("#btn-auth-submit-login").click()
    expect(page.locator("#auth-login-status")).to_be_visible()
    expect(page.locator("#auth-login-status")).to_contain_text("Hunter Username and Password")

    # 4. Switch to Register, verify client-side validation, then register a new player account
    page.locator("#tab-auth-register").click()
    page.locator("#auth-reg-username").fill("ab")
    page.locator("#auth-reg-password").fill("123")
    page.locator("#btn-auth-submit-register").click()
    expect(page.locator("#auth-reg-status")).to_be_visible()
    expect(page.locator("#auth-reg-status")).to_contain_text("3–30 characters")

    unique_user = f"hunter_{uuid.uuid4().hex[:8]}"
    page.locator("#auth-reg-username").fill(unique_user)
    page.locator("#auth-reg-password").fill("spookypass123")
    page.locator("#auth-reg-nickname").fill("Lord Blackwood")
    page.locator("#btn-auth-submit-register").click()

    # Transitions into compact game dashboard (#screen-start) as authenticated non-guest player
    expect(page.locator("#screen-start")).to_be_visible()
    expect(page.locator("#modal-auth")).not_to_be_visible()
    expect(page.locator("#lobby-player-name")).to_have_text("Lord Blackwood")

    auth_state = page.evaluate("""() => ({
        role: window.halloweenApp.currentUser?.role,
        is_guest: window.halloweenApp.currentUser?.is_guest,
        username: window.halloweenApp.currentUser?.username,
    })""")
    assert auth_state["role"] == "player"
    assert auth_state["is_guest"] is False
    assert auth_state["username"] == unique_user

    # 5. Sign out and sign back in with the registered account
    page.evaluate("() => window.halloweenApp.handleLogout()")
    page.wait_for_timeout(200)
    page.locator("#btn-nav-auth").click()
    expect(page.locator("#modal-auth")).to_be_visible()
    page.locator("#auth-login-username").fill(unique_user)
    page.locator("#auth-login-password").fill("spookypass123")
    page.locator("#btn-auth-submit-login").click()

    expect(page.locator("#modal-auth")).not_to_be_visible()
    assert page.evaluate("() => window.halloweenApp.currentUser?.username") == unique_user

    # 6. Verify returning player with stored local profile (pre-gate) still experiences Landing -> Auth -> Dashboard with data preserved
    page.evaluate("""() => {
        localStorage.removeItem('spooky_gate_entered');
        localStorage.removeItem('spooky_session_token');
        const p = JSON.parse(localStorage.getItem('spooky_player_profile') || '{}');
        p.nickname = 'VeteranPhantom';
        p.diamonds = 275;
        p.stats = { games_played: 12, total_answered: 60, total_correct: 50, best_score: 4200, best_streak: 9, preferred_mode: 'classic' };
        localStorage.setItem('spooky_player_profile', JSON.stringify(p));
    }""")
    page.reload()
    page.wait_for_load_state("networkidle")
    expect(page.locator("#screen-landing")).to_be_visible()
    page.locator("#btn-landing-enter").click()
    expect(page.locator("#modal-auth")).to_be_visible()
    expect(page.locator("#auth-guest-nickname")).to_have_value("VeteranPhantom")
    page.locator("#btn-auth-quick-guest").click()
    expect(page.locator("#screen-start")).to_be_visible()
    expect(page.locator("#lobby-player-name")).to_have_text("VeteranPhantom")
    expect(page.locator("#lobby-diamond-count")).to_have_text("275")


