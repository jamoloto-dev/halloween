"""Playwright browser end-to-end tests for Halloween Quiz."""

import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:5000"


@pytest.fixture(scope="function")
def live_page(page: Page) -> Page:
    """Fixture ensuring page is loaded and local storage is clean."""
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    return page


def test_homepage_elements_and_categories(live_page: Page):
    """Verify title, branding, player name input, and all 6 categories."""
    assert "Halloween Quiz" in live_page.title()

    # Brand and setup card
    expect(live_page.locator(".brand-title")).to_be_visible()
    expect(live_page.locator("#player-name")).to_be_visible()

    # Verify all 6 canonical categories are rendered
    expected_categories = ["spooky", "costumes", "movies", "history", "candy", "paranormal"]
    for cat in expected_categories:
        cat_item = live_page.locator(f".category-chip input[value='{cat}']")
        expect(cat_item).to_be_attached()
        expect(cat_item).to_be_checked()

    # Verify difficulty options
    expect(live_page.locator("input[name='difficulty'][value='easy']")).to_be_attached()
    expect(live_page.locator("input[name='difficulty'][value='medium']")).to_be_checked()
    expect(live_page.locator("input[name='difficulty'][value='hard']")).to_be_attached()


def test_audio_controls_interaction(live_page: Page):
    """Verify audio toggle buttons, sliders, and localStorage persistence."""
    bgm_btn = live_page.locator("#btn-bgm-toggle")
    sound_btn = live_page.locator("#btn-sound-toggle")
    music_slider = live_page.locator("#music-volume-slider")
    sfx_slider = live_page.locator("#sfx-volume-slider")

    expect(bgm_btn).to_be_visible()
    expect(sound_btn).to_be_visible()
    expect(music_slider).to_be_visible()
    expect(sfx_slider).to_be_visible()

    # Click sound toggle (mute/unmute)
    initial_text = sound_btn.inner_text()
    sound_btn.click()
    new_text = sound_btn.inner_text()
    assert initial_text != new_text

    # Verify muted state stored in localStorage
    muted_storage = live_page.evaluate("() => localStorage.getItem('halloween_muted')")
    assert muted_storage in ("true", "false")


def test_category_selection_guards(live_page: Page):
    """Verify that user cannot start a game with zero categories selected."""
    # Handle the alert dialog
    alert_messages = []
    live_page.on("dialog", lambda dialog: (alert_messages.append(dialog.message), dialog.dismiss()))

    # Uncheck all categories
    checkboxes = live_page.locator(".category-chip input[type='checkbox']")
    count = checkboxes.count()
    assert count == 6
    for i in range(count):
        checkboxes.nth(i).set_checked(False, force=True)

    # Try starting the quiz
    live_page.locator("#btn-start").click()

    # Should have triggered alert and screen-start must still be active
    assert len(alert_messages) > 0
    assert "at least one category" in alert_messages[0].lower()
    expect(live_page.locator("#screen-start")).to_be_visible()
    expect(live_page.locator("#screen-quiz")).not_to_be_visible()


def test_complete_quiz_gameplay_flow(live_page: Page):
    """Start game, answer questions, inspect feedback, use keyboard, complete round."""
    # Set player name and select 5 questions for a quick round
    name_input = live_page.locator("#player-name")
    name_input.fill("Playwright Hunter")
    live_page.locator("#num-questions").select_option("5")

    # Start quiz
    live_page.locator("#btn-start").click()

    # Active quiz screen should appear
    expect(live_page.locator("#screen-quiz")).to_be_visible()
    expect(live_page.locator("#screen-start")).not_to_be_visible()

    # HUD checks
    expect(live_page.locator("#q-counter")).to_contain_text("Question 1 of 5")
    expect(live_page.locator("#question-text")).to_be_visible()
    expect(live_page.locator("#options-grid")).to_be_visible()

    options = live_page.locator(".option-btn")
    expect(options).to_have_count(4)

    # Click first option
    options.nth(0).click()

    # Feedback panel must appear
    feedback = live_page.locator("#feedback-panel")
    expect(feedback).to_be_visible()
    expect(live_page.locator("#feedback-status")).to_be_visible()
    expect(live_page.locator("#btn-next-question")).to_be_visible()

    # Click Next Question
    live_page.locator("#btn-next-question").click()

    # Question 2: Use keyboard shortcut '1'
    expect(live_page.locator("#q-counter")).to_contain_text("Question 2 of 5")
    live_page.keyboard.press("1")
    expect(feedback).to_be_visible()
    live_page.locator("#btn-next-question").click()

    # Answer remaining 3 questions to complete round
    for i in range(3, 6):
        expect(feedback).not_to_be_visible()
        expect(live_page.locator("#q-counter")).to_contain_text(f"Question {i} of 5")
        live_page.locator(".option-btn").nth(0).click()
        expect(feedback).to_be_visible()
        live_page.locator("#btn-next-question").click()

    # Game Over screen
    expect(live_page.locator("#screen-gameover")).to_be_visible()
    expect(live_page.locator("#stat-final-score")).to_be_visible()
    expect(live_page.locator("#stat-accuracy")).to_be_visible()
    expect(live_page.locator("#review-list")).to_be_visible()

    # Play again button restores setup screen
    play_again_btn = live_page.locator("#btn-play-again")
    expect(play_again_btn).to_be_visible()
    play_again_btn.click()
    expect(live_page.locator("#screen-start")).to_be_visible()


def test_leaderboard_modal(live_page: Page):
    """Open leaderboard, switch difficulty tabs, verify contents, and close."""
    btn_open = live_page.locator("#btn-leaderboard-open")
    btn_open.click()

    modal = live_page.locator("#modal-leaderboard")
    expect(modal).to_be_visible()

    # Switch tabs
    easy_tab = live_page.locator(".tab-btn[data-diff='easy']")
    easy_tab.click()
    expect(easy_tab).to_have_class("tab-btn active")

    hard_tab = live_page.locator(".tab-btn[data-diff='hard']")
    hard_tab.click()
    expect(hard_tab).to_have_class("tab-btn active")

    # Close modal
    btn_close = live_page.locator("#btn-close-modal")
    btn_close.click()
    expect(modal).not_to_be_visible()


@pytest.mark.parametrize("width,height", [
    (360, 740),
    (390, 844),
    (768, 1024),
    (1366, 768),
    (1920, 1080),
])
def test_responsive_layout_no_horizontal_overflow(live_page: Page, width: int, height: int):
    """Verify that layout does not horizontally overflow across different viewports."""
    live_page.set_viewport_size({"width": width, "height": height})
    live_page.wait_for_timeout(200)

    # Verify no horizontal scrollbar
    is_scrollable_x = live_page.evaluate(
        "() => document.documentElement.scrollWidth > window.innerWidth"
    )
    assert not is_scrollable_x, f"Horizontal overflow detected at {width}x{height}"


def test_settings_modal(live_page: Page):
    """Open settings modal, toggle preferences, verify localStorage persistence, and close."""
    btn_settings = live_page.locator("#btn-settings-open")
    btn_settings.click()

    modal = live_page.locator("#modal-settings")
    expect(modal).to_be_visible()

    # Toggle reduced motion checkbox
    reduced_motion = live_page.locator("#setting-reduced-motion")
    reduced_motion.check()
    stored_motion = live_page.evaluate("() => localStorage.getItem('halloween_reduced_motion')")
    assert stored_motion == "true"

    # Close modal
    live_page.locator("#btn-close-settings").click()
    expect(modal).not_to_be_visible()


def test_mastery_and_badges_modal(live_page: Page):
    """Open mastery modal, verify badges and category progress items are rendered, and close."""
    btn_mastery = live_page.locator("#btn-mastery-open")
    btn_mastery.click()

    modal = live_page.locator("#modal-mastery")
    expect(modal).to_be_visible()

    badges = live_page.locator("#badges-grid .badge-item")
    expect(badges).to_have_count(8)

    mastery_items = live_page.locator("#mastery-grid .mastery-item")
    expect(mastery_items).to_have_count(6)

    # Close modal
    live_page.locator("#btn-close-mastery").click()
    expect(modal).not_to_be_visible()


def test_endless_mode_hud_and_strikes(live_page: Page):
    """Select Endless mode and verify the 3-lives HUD appears during gameplay."""
    # Select Endless mode
    endless_radio = live_page.locator("input[name='mode'][value='endless']")
    endless_radio.check(force=True)

    # Start quiz
    live_page.locator("#btn-start").click()
    expect(live_page.locator("#screen-quiz")).to_be_visible()

    # Verify Endless strikes HUD and badge
    strikes_hud = live_page.locator("#hud-strikes")
    expect(strikes_hud).to_be_visible()
    expect(live_page.locator("#strike-icons")).to_contain_text("💚 💚 💚")
    expect(live_page.locator("#q-mode-badge")).to_contain_text("Endless")

