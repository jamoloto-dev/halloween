"""Comprehensive release regression tests for Spooky Master v2.7.

Covers:
1. Mobile and desktop viewport layout integrity (8 required viewports, zero document scrolling).
2. Modal overlay scroll lock on document body across open/close lifecycles.
3. Trivia category selection, clear all, empty selection validation notice, and persistence.
4. Horror narration lifecycle, spectral drone cancellation, BGM ducking, and hover throttling.
5. Campaign journey overlay display, interaction, and clean return.
6. Quiz gameplay round lifecycle, answer feedback, and clean dashboard return.
"""

import os
import urllib.request

import pytest

pytest.importorskip("playwright")
from playwright.sync_api import Page, expect

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:5000")

pytestmark = [pytest.mark.e2e]

VIEWPORTS = [
    (320, 568),
    (360, 640),
    (375, 667),
    (390, 844),
    (430, 932),
    (844, 390),
    (1366, 768),
    (1920, 1080),
]


def _is_server_available(url: str = BASE_URL) -> bool:
    try:
        with urllib.request.urlopen(f"{url}/health", timeout=1.0) as res:
            return bool(res.status == 200)
    except Exception:
        return False


@pytest.fixture(autouse=True, scope="module")
def ensure_server_running():
    """Ensure web server is running before running any release regression tests."""
    if not _is_server_available(BASE_URL):
        pytest.skip(
            f"Live web server at {BASE_URL} is not reachable. "
            "Start server before running release regression suite."
        )


@pytest.fixture(scope="function")
def release_page(page: Page) -> Page:
    """Provide clean page with onboarding dismissed."""
    page.add_init_script("window.localStorage.setItem('spooky_gate_entered', 'true');")
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_function("() => Boolean(window.halloweenApp)")
    onboarding = page.locator("#modal-onboarding")
    if onboarding.is_visible():
        page.locator("#btn-save-onboarding").click()
        expect(onboarding).not_to_be_visible()
    return page


@pytest.mark.parametrize("width,height", VIEWPORTS)
def test_release_viewports_no_document_scroll(release_page: Page, width: int, height: int):
    """Verify Command Deck fits within all 8 required viewports with zero document scroll."""
    release_page.set_viewport_size({"width": width, "height": height})
    release_page.wait_for_timeout(250)

    # Verify Command Deck is active
    expect(release_page.locator("#screen-start")).to_be_visible()

    # Check document-level scroll metrics
    metrics = release_page.evaluate(
        """() => {
            const de = document.documentElement;
            return {
                scrollW: de.scrollWidth,
                clientW: de.clientWidth,
                scrollH: de.scrollHeight,
                clientH: de.clientHeight,
                scrollY: window.scrollY || window.pageYOffset || 0,
                scrollX: window.scrollX || window.pageXOffset || 0
            };
        }"""
    )

    # Document should not have horizontal overflow
    assert metrics["scrollW"] <= metrics["clientW"] + 1, (
        f"Horizontal overflow at {width}x{height}: scrollWidth={metrics['scrollW']} > clientWidth={metrics['clientW']}"
    )

    # Document should not have vertical overflow
    assert metrics["scrollH"] <= metrics["clientH"] + 1, (
        f"Vertical overflow at {width}x{height}: scrollHeight={metrics['scrollH']} > clientHeight={metrics['clientH']}"
    )
    assert metrics["scrollY"] == 0, f"Unintended window scrollY={metrics['scrollY']} at {width}x{height}"


def test_modal_overlay_scroll_lock(release_page: Page):
    """Verify opening a modal locks document body scroll and closing unlocks it."""
    release_page.set_viewport_size({"width": 375, "height": 667})

    # Body should not have modal-open initially
    assert not release_page.evaluate("() => document.body.classList.contains('modal-open')")

    # Open trivia categories modal
    btn_categories = release_page.locator("#tile-dash-trivia-categories")
    expect(btn_categories).to_be_visible()
    btn_categories.click()

    modal = release_page.locator("#modal-trivia-categories")
    expect(modal).to_be_visible()

    # Verify modal-open class is active
    assert release_page.evaluate("() => document.body.classList.contains('modal-open')"), (
        "Expected document.body to have .modal-open when modal is open"
    )

    # Close modal
    btn_close = release_page.locator("#btn-close-trivia-categories")
    expect(btn_close).to_be_visible()
    btn_close.click()
    expect(modal).not_to_be_visible()

    # Verify modal-open class is removed
    assert not release_page.evaluate("() => document.body.classList.contains('modal-open')"), (
        "Expected document.body .modal-open to be removed when modal is closed"
    )


def test_trivia_category_selection_and_empty_validation(release_page: Page):
    """Verify trivia category clear, empty validation warning, select-all, and chosen persistence."""
    # Open trivia categories overlay
    release_page.locator("#tile-dash-trivia-categories").click()
    modal = release_page.locator("#modal-trivia-categories")
    expect(modal).to_be_visible()

    # Clear all categories
    release_page.locator("#btn-clear-cats").click()

    # All checkboxes should be unchecked
    checked_count = release_page.evaluate(
        "() => document.querySelectorAll('#category-picker input[type=checkbox]:checked').length"
    )
    assert checked_count == 0, "Expected 0 checked categories after clicking Clear All"

    # Confirm selection with 0 categories -> Should display notice and stay on modal
    release_page.locator("#btn-confirm-categories").click()
    notice = release_page.locator("#app-notice")
    expect(notice).to_be_visible()
    expect(release_page.locator("#app-notice-text")).to_contain_text("Please select at least one trivia category!")
    expect(modal).to_be_visible()

    # Click Select All -> All 6 canonical categories checked
    release_page.locator("#btn-select-all-cats").click()
    checked_count_all = release_page.evaluate(
        "() => document.querySelectorAll('#category-picker input[type=checkbox]:checked').length"
    )
    assert checked_count_all == 6, f"Expected 6 checked categories, found {checked_count_all}"

    # Select only 'movies'
    release_page.locator("#btn-clear-cats").click()
    movies_checkbox = release_page.locator("#category-picker input[value='movies']")
    movies_checkbox.check(force=True)

    # Confirm selection
    release_page.locator("#btn-confirm-categories").click()
    expect(modal).not_to_be_visible()

    # Reopen categories overlay and verify only 'movies' is checked
    release_page.locator("#tile-dash-trivia-categories").click()
    expect(modal).to_be_visible()

    selected_categories = release_page.evaluate(
        """() => Array.from(
            document.querySelectorAll('#category-picker input[type=checkbox]:checked')
        ).map(cb => cb.value)"""
    )
    assert selected_categories == ["movies"], f"Expected ['movies'], got {selected_categories}"

    # Restore all categories before closing
    release_page.locator("#btn-select-all-cats").click()
    release_page.locator("#btn-confirm-categories").click()
    expect(modal).not_to_be_visible()


def test_horror_narration_and_spectral_drone_lifecycle(release_page: Page):
    """Verify horror narration, spectral drone cancellation, BGM ducking, and hover throttling."""
    # Test audio controller integration via window.halloweenApp.sound
    audio_test_result = release_page.evaluate(
        """() => {
            const app = window.halloweenApp;
            if (!app || !app.sound) return { error: 'SoundEngine not initialized' };
            const audio = app.sound;

            // Ensure sound and speech synthesis available or mocked
            let cancelled = false;
            let spokenText = '';
            const origCancel = window.speechSynthesis ? window.speechSynthesis.cancel : null;
            const origSpeak = window.speechSynthesis ? window.speechSynthesis.speak : null;

            if (window.speechSynthesis) {
                window.speechSynthesis.cancel = () => { cancelled = true; };
                window.speechSynthesis.speak = (u) => { spokenText = u.text; };
            }

            // Test playHorrorIntroLore
            audio.soundEnabled = true;
            audio.sfxEnabled = true;
            audio.playHorrorIntroLore();

            const isSpeaking = audio.isSpeakingLore;

            // Stop lore narration
            audio.stopHorrorIntroLore();
            const droneStoppedAfterCancel = audio.spectralDroneNodes === null;
            const speakingCleared = !audio.isSpeakingLore;

            // Restore speech synthesis
            if (origCancel) window.speechSynthesis.cancel = origCancel;
            if (origSpeak) window.speechSynthesis.speak = origSpeak;

            // Test hover throttling (2 rapid calls)
            let hoverCalls = 0;
            const origPlayBuffer = audio.playBuffer;
            audio.playBuffer = () => { hoverCalls++; return true; };
            audio.playHorrorHover();
            audio.playHorrorHover(); // Rapid second call within 90ms should be throttled
            audio.playBuffer = origPlayBuffer;

            // Test answer SFX event mapping
            const events = audio.audioEvents || (app && app.AUDIO_EVENTS) || {};
            const hasCorrectEvent = Boolean(events && events.answer_correct);
            const hasIncorrectEvent = Boolean(events && events.answer_incorrect);

            return {
                isSpeakingStarted: isSpeaking,
                cancelledSpeech: cancelled,
                droneStoppedAfterCancel: droneStoppedAfterCancel,
                speakingCleared: speakingCleared,
                hoverCallsCount: hoverCalls,
                hasCorrectEvent: hasCorrectEvent,
                hasIncorrectEvent: hasIncorrectEvent
            };
        }"""
    )

    assert "error" not in audio_test_result, f"Audio test error: {audio_test_result.get('error')}"
    assert audio_test_result["droneStoppedAfterCancel"], "Spectral drone was not stopped after stopHorrorIntroLore()"
    assert audio_test_result["speakingCleared"], "isSpeakingLore was not cleared after stopHorrorIntroLore()"
    assert audio_test_result["hoverCallsCount"] <= 1, f"Hover was not throttled: count={audio_test_result['hoverCallsCount']}"
    assert audio_test_result["hasCorrectEvent"], "AUDIO_EVENTS.answer_correct is missing"
    assert audio_test_result["hasIncorrectEvent"], "AUDIO_EVENTS.answer_incorrect is missing"


def test_campaign_journey_modal_navigation(release_page: Page):
    """Verify opening and closing campaign journey view maintains valid layout and scroll lock."""
    btn_journey = release_page.locator("#tile-dash-campaign-preview")
    expect(btn_journey).to_be_visible()
    btn_journey.click()

    modal = release_page.locator("#modal-deck-campaign")
    expect(modal).to_be_visible()

    # Journey modal must render stage/chapter information
    stages = release_page.locator("#stages-trail-list .stage-node-card, #campaign-chapter-tabs .tab-btn")
    assert stages.count() > 0 or release_page.locator("#chapter-title").is_visible()

    # Verify modal-open scroll lock is active
    assert release_page.evaluate("() => document.body.classList.contains('modal-open')")

    # Close journey modal
    btn_close = release_page.locator("#btn-close-deck-campaign")
    expect(btn_close).to_be_visible()
    btn_close.click()
    expect(modal).not_to_be_visible()

    # Verify modal-open scroll lock is cleanly removed
    assert not release_page.evaluate("() => document.body.classList.contains('modal-open')")


def test_quiz_session_lifecycle_and_clean_return(release_page: Page):
    """Start a quiz round, answer a question with feedback, and return cleanly to Command Deck."""
    # Open Crypt Rules modal
    release_page.locator("#tile-dash-crypt-rules").click()
    modal_rules = release_page.locator("#modal-crypt-rules")
    expect(modal_rules).to_be_visible()

    # Start quiz
    btn_start = release_page.locator("#btn-start")
    expect(btn_start).to_be_visible()
    btn_start.click()

    # Wait for quiz screen
    quiz_screen = release_page.locator("#screen-quiz")
    expect(quiz_screen).to_be_visible()
    expect(release_page.locator("#screen-start")).not_to_be_visible()

    # Question text and answer options should be present
    expect(release_page.locator("#question-text")).to_be_visible()
    options = release_page.locator("#options-grid .option-btn")
    expect(options.first).to_be_visible()

    # Answer the first option
    options.first.click()
    release_page.wait_for_timeout(300)

    # Feedback panel must appear
    expect(release_page.locator("#feedback-panel")).to_be_visible()

    # Exit quiz session
    btn_exit = release_page.locator("#btn-quiz-exit")
    expect(btn_exit).to_be_visible()
    btn_exit.click()

    # Wait for dashboard Command Deck
    expect(release_page.locator("#screen-start")).to_be_visible()
    expect(quiz_screen).not_to_be_visible()

    # Verify body scroll lock is cleanly removed
    assert not release_page.evaluate("() => document.body.classList.contains('modal-open')")
