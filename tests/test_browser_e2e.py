"""Playwright browser end-to-end tests for Spooky Master / Halloween Quiz."""

import json
import re
import urllib.error
import urllib.request

import pytest

# Gracefully skip entire module if playwright is not installed (e.g. in CI unit test runners)
pytest.importorskip("playwright")

from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:5000"

pytestmark = [pytest.mark.e2e]


def _is_server_available(url: str = BASE_URL) -> bool:
    try:
        with urllib.request.urlopen(f"{url}/health", timeout=1.0) as res:
            return bool(res.status == 200)
    except Exception:
        return False


@pytest.fixture(autouse=True, scope="module")
def ensure_server_running():
    """Ensure web server is running on BASE_URL before running any E2E tests."""
    if not _is_server_available(BASE_URL):
        pytest.skip(
            f"Live web server at {BASE_URL} is not reachable. "
            "Start the server with 'python run.py' before running browser E2E tests."
        )


@pytest.fixture(scope="function")
def live_page(page: Page) -> Page:
    """Fixture ensuring page is loaded and any initial onboarding is dismissed for standard tests."""
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_function("() => Boolean(window.halloweenApp)")
    onboarding = page.locator("#modal-onboarding")
    if onboarding.is_visible():
        page.locator("#btn-save-onboarding").click()
        expect(onboarding).not_to_be_visible()
    return page


def test_homepage_elements_and_categories(live_page: Page):
    """Verify title, branding, player name input, canonical categories, and top nav structure."""
    assert "Halloween Quiz" in live_page.title()
    assert "Spooky Master" in live_page.title()

    # Brand and setup card
    expect(live_page.locator(".brand-title")).to_be_visible()
    expect(live_page.locator("#player-name")).to_be_visible()

    # Top nav must contain only Brand, Progress, Leaderboard, Settings (and Install if available)
    # Audio controls MUST NOT be present in top nav
    expect(live_page.locator(".nav-actions #btn-mastery-open")).to_be_visible()
    expect(live_page.locator(".nav-actions #btn-leaderboard-open")).to_be_visible()
    expect(live_page.locator(".nav-actions #btn-settings-open")).to_be_visible()

    expect(live_page.locator(".top-nav #btn-bgm-toggle")).not_to_be_attached()
    expect(live_page.locator(".top-nav #btn-sound-toggle")).not_to_be_attached()
    expect(live_page.locator(".top-nav #music-volume-slider")).not_to_be_attached()
    expect(live_page.locator(".top-nav #sfx-volume-slider")).not_to_be_attached()

    # Verify all 6 canonical categories are rendered as interactive cards
    expected_categories = ["spooky", "costumes", "movies", "history", "candy", "paranormal"]
    for cat in expected_categories:
        cat_card = live_page.locator(f".category-card:has(input[value='{cat}'])")
        expect(cat_card).to_be_visible()
        cat_input = live_page.locator(f".category-card input[value='{cat}']")
        expect(cat_input).to_be_checked()

    # Verify difficulty options
    expect(live_page.locator("input[name='difficulty'][value='easy']")).to_be_attached()
    expect(live_page.locator("input[name='difficulty'][value='medium']")).to_be_checked()
    expect(live_page.locator("input[name='difficulty'][value='hard']")).to_be_attached()


def test_audio_controls_in_settings_modal(live_page: Page):
    """Verify centralized audio controls in Settings modal and persistence."""
    btn_settings = live_page.locator("#btn-settings-open")
    btn_settings.click()

    modal = live_page.locator("#modal-settings")
    if not modal.is_visible():
        live_page.wait_for_timeout(200)
        btn_settings.click()
    expect(modal).to_be_visible()

    bgm_btn = live_page.locator("#modal-btn-bgm-toggle")
    sound_btn = live_page.locator("#modal-btn-sound-toggle")
    track_select = live_page.locator("#setting-music-track")
    music_slider = live_page.locator("#modal-music-slider")
    sfx_slider = live_page.locator("#modal-sfx-slider")

    expect(bgm_btn).to_be_visible()
    expect(sound_btn).to_be_visible()
    expect(track_select).to_be_visible()
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

    # Change track selector to silent and verify
    track_select.select_option("silent")
    profile_raw = live_page.evaluate("() => localStorage.getItem('spooky_player_profile')")
    assert profile_raw is not None
    profile = json.loads(profile_raw)
    assert profile["preferences"]["music_track"] == "silent"

    # Restore haunted_mansion
    track_select.select_option("haunted_mansion")

    # Volume and SFX preferences must persist in the unified local profile.
    music_slider.evaluate("(el) => { el.value = '0.31'; el.dispatchEvent(new Event('input', { bubbles: true })); }")
    sfx_slider.evaluate("(el) => { el.value = '0.57'; el.dispatchEvent(new Event('input', { bubbles: true })); }")
    profile = json.loads(live_page.evaluate("() => localStorage.getItem('spooky_player_profile')"))
    assert profile["preferences"]["music_volume"] == 0.31
    assert profile["preferences"]["sfx_volume"] == 0.57

    # Close modal
    live_page.locator("#btn-close-settings").click()
    expect(modal).not_to_be_visible()


def test_category_selection_cards_and_guards(live_page: Page):
    """Verify category card toggle behavior, check indicators, and zero-category guard."""
    cards = live_page.locator(".category-card")
    expect(cards).to_have_count(6)

    # Category cards use their own sampled event, rather than generic button audio.
    live_page.evaluate("""() => {
        window.__audio_event_log = [];
        const sound = window.halloweenApp.sound;
        sound.play = (key) => window.__audio_event_log.push(key);
    }""")

    # Click first card to toggle off
    first_card = cards.nth(0)
    expect(first_card).to_have_class(re_pattern := "category-card category-chip selected")
    check_badge = first_card.locator(".cat-check-badge")
    expect(check_badge).to_have_text("✓")

    first_card.click()
    assert "category_select" in live_page.evaluate("() => window.__audio_event_log")
    expect(first_card).not_to_have_class(re_pattern)
    expect(check_badge).to_have_text("○")

    # Keyboard toggle: focus first card and press Space
    first_card.press("Space")
    expect(first_card).to_have_class(re_pattern)
    expect(check_badge).to_have_text("✓")

    # Uncheck all categories using Clear button
    live_page.locator("#btn-clear-cats").click()
    checkboxes = live_page.locator(".category-card input[type='checkbox']")
    for i in range(6):
        expect(checkboxes.nth(i)).not_to_be_checked()

    # Handle dialog alert when trying to start with 0 categories
    alert_messages = []

    def handle_dialog(dialog):
        alert_messages.append(dialog.message)
        dialog.dismiss()

    live_page.on("dialog", handle_dialog)

    live_page.locator("#btn-start").click()
    assert len(alert_messages) > 0
    assert "at least one category" in alert_messages[0].lower()
    expect(live_page.locator("#screen-start")).to_be_visible()
    expect(live_page.locator("#screen-quiz")).not_to_be_visible()

    # Restore all categories using Select All button
    live_page.locator("#btn-select-all-cats").click()
    for i in range(6):
        expect(checkboxes.nth(i)).to_be_checked()


def test_sampled_audio_failure_falls_back_without_throwing(live_page: Page):
    """A failed sampled effect must not block the browser game loop."""
    fallback_result = live_page.evaluate("""() => {
        const sound = window.halloweenApp.sound;
        sound.soundCache.delete('correct');
        try {
            sound.play('correct');
            return true;
        } catch (_) {
            return false;
        }
    }""")
    assert fallback_result is True


def test_first_launch_onboarding_flow(page: Page):
    """Verify first-launch onboarding modal displays when clean, saves profile, and does not repeat."""
    page.goto(BASE_URL)
    page.evaluate("() => localStorage.clear()")
    page.reload()
    page.wait_for_load_state("networkidle")

    onboarding = page.locator("#modal-onboarding")
    expect(onboarding).to_be_visible()

    # 8 predefined avatars must be rendered
    avatars = onboarding.locator(".avatar-option-card")
    expect(avatars).to_have_count(8)

    # Select vampire avatar
    vampire_btn = avatars.filter(has_text="Crimson Vampire")
    vampire_btn.click()
    expect(vampire_btn).to_have_class("avatar-option-card selected")

    # Enter custom hunter name
    name_input = onboarding.locator("#onboarding-hunter-name")
    name_input.fill("DraculaMaster")

    # Save profile / Enter Crypt
    onboarding.locator("#btn-save-onboarding").click()
    expect(onboarding).not_to_be_visible()

    # Verify profile stored in localStorage
    profile_raw = page.evaluate("() => localStorage.getItem('spooky_player_profile')")
    assert profile_raw is not None
    profile = json.loads(profile_raw)
    assert profile["nickname"] == "DraculaMaster"
    assert profile["avatar_id"] == "vampire"
    assert "player_id" in profile

    # Start screen should reflect chosen name
    expect(page.locator("#player-name")).to_have_value("DraculaMaster")

    # Reload page: onboarding should NEVER display again
    page.reload()
    page.wait_for_load_state("networkidle")
    expect(page.locator("#modal-onboarding")).not_to_be_visible()


def test_legacy_data_migration(page: Page):
    """Verify seamless migration from legacy localStorage keys without displaying onboarding."""
    page.goto(BASE_URL)
    # Seed legacy storage
    page.evaluate("""() => {
        localStorage.clear();
        localStorage.setItem('halloween_progress_v2', JSON.stringify({
            games_played: 15,
            total_answered: 75,
            total_correct: 62,
            best_score: 3800,
            best_streak: 8,
            mastery: { movies: { answered: 20, correct: 18 } },
            achievements: { first_blood: '2026-09-01T00:00:00Z' }
        }));
        localStorage.setItem('halloween_music_volume', '0.35');
        localStorage.setItem('halloween_sfx_volume', '0.75');
    }""")
    page.reload()
    page.wait_for_load_state("networkidle")

    # Onboarding MUST NOT display when legacy data exists
    expect(page.locator("#modal-onboarding")).not_to_be_visible()

    # Verify upgraded profile has legacy stats
    profile_raw = page.evaluate("() => localStorage.getItem('spooky_player_profile')")
    assert profile_raw is not None
    profile = json.loads(profile_raw)
    assert profile["stats"]["games_played"] == 15
    assert profile["stats"]["best_score"] == 3800
    assert profile["preferences"]["music_volume"] == 0.35
    assert profile["preferences"]["sfx_volume"] == 0.75


def test_profile_and_mastery_dashboard(live_page: Page):
    """Open profile & mastery dashboard, inspect hero card, stats, badges, and category bars."""
    btn_mastery = live_page.locator("#btn-mastery-open")
    btn_mastery.click()

    modal = live_page.locator("#modal-mastery")
    expect(modal).to_be_visible()

    # Dashboard hero card elements
    expect(live_page.locator("#dashboard-avatar-img")).to_be_visible()
    expect(live_page.locator("#dashboard-player-name")).to_be_visible()
    expect(live_page.locator("#dashboard-tier-badge")).to_be_visible()
    expect(live_page.locator("#dash-stat-games")).to_be_visible()
    expect(live_page.locator("#dash-stat-best-score")).to_be_visible()
    expect(live_page.locator("#dash-stat-best-streak")).to_be_visible()

    # Badges grid: 8 badges
    badges = live_page.locator("#badges-grid .badge-item")
    expect(badges).to_have_count(8)

    # Mastery grid: 6 categories
    mastery_items = live_page.locator("#mastery-grid .mastery-item")
    expect(mastery_items).to_have_count(6)

    # Close modal
    live_page.locator("#btn-close-mastery").click()
    expect(modal).not_to_be_visible()


def test_profile_customization_from_start_screen(live_page: Page):
    """Change avatar via picker drawer and verify persistence in profile."""
    avatar_btn = live_page.locator("#btn-start-change-avatar")
    expect(avatar_btn).to_be_visible()
    avatar_btn.click()

    picker_modal = live_page.locator("#modal-avatar-picker")
    expect(picker_modal).to_be_visible()

    # Select Werewolf
    werewolf_opt = picker_modal.locator(".avatar-option-card").filter(has_text="Lunar Werewolf")
    werewolf_opt.click()

    # Drawer closes automatically on selection
    expect(picker_modal).not_to_be_visible()

    # Start button avatar image updated
    expect(live_page.locator("#start-avatar-img")).to_have_attribute(
        "src", "/static/avatars/werewolf.svg"
    )

    # Verify profile updated
    profile_raw = live_page.evaluate("() => localStorage.getItem('spooky_player_profile')")
    profile = json.loads(profile_raw)
    assert profile["avatar_id"] == "werewolf"


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


@pytest.mark.parametrize(
    "width,height",
    [
        (360, 740),
        (390, 844),
        (768, 1024),
        (1366, 768),
        (1920, 1080),
    ],
)
def test_responsive_layout_no_horizontal_overflow(live_page: Page, width: int, height: int):
    """Verify that layout does not horizontally overflow across different viewports."""
    live_page.set_viewport_size({"width": width, "height": height})
    live_page.wait_for_timeout(200)

    # Verify no horizontal scrollbar
    is_scrollable_x = live_page.evaluate(
        "() => document.documentElement.scrollWidth > window.innerWidth"
    )
    assert not is_scrollable_x, f"Horizontal overflow detected at {width}x{height}"


def test_settings_modal_accessibility_toggles(live_page: Page):
    """Open settings modal, toggle accessibility preferences, verify persistence, and close."""
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


def test_campaign_journey_modal_and_stage_selection(live_page: Page):
    """Open the Haunted Journey campaign modal, inspect chapters, select stages, and view lore."""
    live_page.locator("#btn-campaign-nav").click()
    campaign_modal = live_page.locator("#modal-campaign")
    expect(campaign_modal).to_be_visible()

    # Verify 6 chapter tabs exist
    tabs = campaign_modal.locator("#campaign-chapter-tabs .tab-btn")
    expect(tabs).to_have_count(6)

    # Verify active chapter banner
    expect(campaign_modal.locator("#chapter-title")).to_be_visible()
    expect(campaign_modal.locator("#stages-trail-list .stage-node-card")).to_have_count(4)

    # Click first stage node and verify details panel
    first_stage = campaign_modal.locator("#stages-trail-list .stage-node-card").first
    first_stage.click()
    detail_panel = campaign_modal.locator("#stage-detail-panel")
    expect(detail_panel).to_be_visible()
    expect(campaign_modal.locator("#stage-detail-reward")).to_contain_text("💎")

    # Read Chapter Story lore
    campaign_modal.locator("#btn-read-chapter-story").click()
    story_modal = live_page.locator("#modal-chapter-story")
    expect(story_modal).to_be_visible()
    expect(story_modal.locator("#story-text")).not_to_be_empty()
    live_page.locator("#btn-close-story").click()
    expect(story_modal).not_to_be_visible()

    # Close campaign modal
    live_page.locator("#btn-close-campaign").click()
    expect(campaign_modal).not_to_be_visible()


def test_witch_market_diamond_economy_and_purchases(live_page: Page):
    """Open the Witch's Market, verify diamond wallet, purchase booster, switch tabs."""
    # Verify top-nav diamond pill shows balance
    diamond_pill = live_page.locator("#btn-market-open")
    expect(diamond_pill).to_be_visible()
    diamond_pill.click()

    shop_modal = live_page.locator("#modal-shop")
    expect(shop_modal).to_be_visible()
    expect(shop_modal.locator("#shop-diamond-balance")).to_contain_text("50")

    # Buy Hint Booster (💎 15)
    hint_buy_btn = shop_modal.locator(".btn-buy-booster[data-type='hint']")
    hint_buy_btn.click()

    # Balance should decrease to 35 and owned count increment to 2
    expect(shop_modal.locator("#shop-diamond-balance")).to_contain_text("35")
    expect(shop_modal.locator("#shop-owned-hint")).to_have_text("2")

    # Switch to Cosmetics Tab
    shop_modal.locator("#tab-shop-cosmetics").click()
    expect(shop_modal.locator("#shop-cosmetics-panel")).to_be_visible()
    expect(shop_modal.locator("#shop-boosters-panel")).not_to_be_visible()

    # Close market modal
    live_page.locator("#btn-close-shop").click()
    expect(shop_modal).not_to_be_visible()


def test_haunted_duels_creation_and_traps(live_page: Page):
    """Open Haunted Duels modal, configure match with traps, forge challenge code."""
    live_page.locator("#btn-duels-nav").click()
    duels_modal = live_page.locator("#modal-duels")
    expect(duels_modal).to_be_visible()

    # Verify trap options
    traps = duels_modal.locator("input[name='duel_trap']")
    expect(traps).to_have_count(4)

    # Submit form to create duel
    duels_modal.locator("#btn-submit-create-duel").click()

    # Verify generated duel code card is displayed
    share_card = duels_modal.locator("#duel-share-card")
    expect(share_card).to_be_visible()
    expect(duels_modal.locator("#display-duel-code")).to_contain_text("SPOOK-")

    # Close duels modal
    live_page.locator("#btn-close-duels").click()
    expect(duels_modal).not_to_be_visible()


def test_explore_chapter_map_button(live_page: Page):
    """Clicking 'Explore Chapter Map' button opens canonical Campaign modal."""
    btn = live_page.locator("#btn-hero-journey")
    expect(btn).to_be_visible()
    btn.click()

    campaign_modal = live_page.locator("#modal-campaign")
    expect(campaign_modal).to_be_visible()
    expect(campaign_modal.locator("#chapter-title")).to_be_visible()
    expect(campaign_modal.locator("#campaign-chapter-tabs .tab-btn")).to_have_count(6)

    # Close modal
    live_page.locator("#btn-close-campaign").click()
    expect(campaign_modal).not_to_be_visible()


def test_journey_navigation(live_page: Page):
    """Clicking 'Journey' button opens canonical Campaign modal."""
    btn = live_page.locator("#btn-campaign-nav")
    expect(btn).to_be_visible()
    btn.click()

    campaign_modal = live_page.locator("#modal-campaign")
    expect(campaign_modal).to_be_visible()
    expect(campaign_modal.locator("#chapter-title")).to_be_visible()

    # Close modal
    live_page.locator("#btn-close-campaign").click()
    expect(campaign_modal).not_to_be_visible()


def test_duels_navigation(live_page: Page):
    """Clicking 'Duels' button opens Haunted Duels modal."""
    btn = live_page.locator("#btn-duels-nav")
    expect(btn).to_be_visible()
    btn.click()

    duels_modal = live_page.locator("#modal-duels")
    expect(duels_modal).to_be_visible()
    expect(duels_modal.locator("#duel-diff")).to_be_visible()

    # Close modal
    live_page.locator("#btn-close-duels").click()
    expect(duels_modal).not_to_be_visible()


def test_progress_navigation(live_page: Page):
    """Clicking 'Progress' button in top nav opens Player Profile & Mastery modal."""
    btn = live_page.locator(".nav-actions #btn-mastery-open")
    expect(btn).to_be_visible()
    btn.click()

    mastery_modal = live_page.locator("#modal-mastery")
    expect(mastery_modal).to_be_visible()
    expect(mastery_modal.locator("#badges-grid")).to_be_visible()
    expect(mastery_modal.locator("#mastery-grid")).to_be_visible()

    # Close modal
    live_page.locator("#btn-close-mastery").click()
    expect(mastery_modal).not_to_be_visible()


def test_nav_branding_returns_home(live_page: Page):
    """Clicking top-nav branding returns to start screen from active quiz."""
    live_page.locator("#btn-start").click()
    expect(live_page.locator("#screen-quiz")).to_be_visible()

    live_page.locator("#nav-branding-home").click()
    expect(live_page.locator("#screen-start")).to_be_visible()
    expect(live_page.locator("#screen-quiz")).not_to_be_visible()


def test_background_music_source(live_page: Page):
    """Verify background music audio element points to canonical spooky-master-main.mp3."""
    bg_audio = live_page.locator("#bgm-audio")
    expect(bg_audio).to_be_attached()

    audio_state = live_page.evaluate("""() => {
        const sound = window.halloweenApp.sound;
        const audioEl = sound.bgmAudio;
        const sourceEl = audioEl ? audioEl.querySelector('source') : null;
        return {
            selectedTrack: sound.selectedTrack,
            bgmSrc: audioEl ? (audioEl.src || (sourceEl ? sourceEl.src : null)) : null,
            musicEnabled: sound.musicEnabled,
            musicVolume: sound.musicVolume,
        };
    }""")
    assert audio_state["bgmSrc"] is not None
    assert "spooky-master-main.mp3" in audio_state["bgmSrc"]
    assert audio_state["selectedTrack"] in ("haunted_mansion", "horror-ambience")


def test_correct_sample_mapping(live_page: Page):
    """Verify 'correct' event is mapped to /sounds/answer-correct.wav and triggers on correct answer."""
    mapping = live_page.evaluate("() => window.halloweenApp.sound.soundUrls['correct']")
    assert mapping == "/sounds/answer-correct.wav"

    # Start game to reach active question screen
    live_page.locator("#num-questions").select_option("5")
    live_page.locator("#btn-start").click()
    expect(live_page.locator("#screen-quiz")).to_be_visible()

    # Instrument sound.play to track played events
    live_page.evaluate("""() => {
        window.__audio_event_log = [];
        const origPlay = window.halloweenApp.sound.play.bind(window.halloweenApp.sound);
        window.halloweenApp.sound.play = (key) => {
            window.__audio_event_log.push(key);
            return origPlay(key);
        };
        window.halloweenApp.showAnswerResult({
            is_correct: true,
            points_awarded: 150,
            time_bonus: 50,
            streak: 1,
            total_score: 150,
            correct_answer: "Pumpkin",
            explanation: "Carved pumpkins ward off evil spirits.",
            is_game_over: false,
            next_question: null,
        }, "Pumpkin");
    }""")

    expect(live_page.locator("#feedback-panel")).to_be_visible()
    event_log = live_page.evaluate("() => window.__audio_event_log")
    assert "correct" in event_log

    # Return to home
    live_page.locator("#nav-branding-home").click()
    expect(live_page.locator("#screen-start")).to_be_visible()


def test_incorrect_sample_mapping(live_page: Page):
    """Verify 'incorrect' event is mapped to /sounds/answer-incorrect.wav and triggers on wrong answer."""
    mapping = live_page.evaluate("() => window.halloweenApp.sound.soundUrls['incorrect']")
    assert mapping == "/sounds/answer-incorrect.wav"

    # Start game to reach active question screen
    live_page.locator("#btn-start").click()
    expect(live_page.locator("#screen-quiz")).to_be_visible()

    live_page.evaluate("""() => {
        window.__audio_event_log = [];
        const origPlay = window.halloweenApp.sound.play.bind(window.halloweenApp.sound);
        window.halloweenApp.sound.play = (key) => {
            window.__audio_event_log.push(key);
            return origPlay(key);
        };
        window.halloweenApp.showAnswerResult({
            is_correct: false,
            points_awarded: 0,
            time_bonus: 0,
            streak: 0,
            total_score: 0,
            correct_answer: "Pumpkin",
            explanation: "Carved pumpkins ward off evil spirits.",
            is_game_over: false,
            next_question: null,
        }, "Turnip");
    }""")

    expect(live_page.locator("#feedback-panel")).to_be_visible()
    event_log = live_page.evaluate("() => window.__audio_event_log")
    assert "incorrect" in event_log

    # Return to home
    live_page.locator("#nav-branding-home").click()
    expect(live_page.locator("#screen-start")).to_be_visible()


def test_category_sound_mapping(live_page: Page):
    """Verify category selection plays category-select.wav."""
    mapping = live_page.evaluate("() => window.halloweenApp.sound.soundUrls['category_select']")
    assert mapping == "/sounds/category-select.wav"

    live_page.evaluate("""() => {
        window.__audio_event_log = [];
        const origPlay = window.halloweenApp.sound.play.bind(window.halloweenApp.sound);
        window.halloweenApp.sound.play = (key) => {
            window.__audio_event_log.push(key);
            return origPlay(key);
        };
    }""")

    cards = live_page.locator(".category-card")
    cards.first.click()

    event_log = live_page.evaluate("() => window.__audio_event_log")
    assert "category_select" in event_log


def test_audio_settings_persistence(live_page: Page):
    """Verify settings modal volume, mute, and track options persist to profile and reload."""
    live_page.locator("#btn-settings-open").click()
    settings_modal = live_page.locator("#modal-settings")
    expect(settings_modal).to_be_visible()

    music_slider = live_page.locator("#modal-music-slider")
    sfx_slider = live_page.locator("#modal-sfx-slider")
    track_select = live_page.locator("#setting-music-track")

    # Set new audio preferences
    music_slider.evaluate("(el) => { el.value = '0.42'; el.dispatchEvent(new Event('input', { bubbles: true })); }")
    sfx_slider.evaluate("(el) => { el.value = '0.78'; el.dispatchEvent(new Event('input', { bubbles: true })); }")
    track_select.select_option("silent")

    # Close settings
    live_page.locator("#btn-close-settings").click()
    expect(settings_modal).not_to_be_visible()

    # Verify profile in localStorage
    profile = json.loads(live_page.evaluate("() => localStorage.getItem('spooky_player_profile')"))
    assert profile["preferences"]["music_volume"] == 0.42
    assert profile["preferences"]["sfx_volume"] == 0.78
    assert profile["preferences"]["music_track"] == "silent"

    # Reload page and verify state restored
    live_page.reload()
    live_page.wait_for_load_state("networkidle")

    sound_state = live_page.evaluate("""() => {
        const sound = window.halloweenApp.sound;
        return {
            musicVol: sound.musicVolume,
            sfxVol: sound.sfxVolume,
            track: sound.selectedTrack,
        };
    }""")
    assert sound_state["musicVol"] == 0.42
    assert sound_state["sfxVol"] == 0.78
    assert sound_state["track"] == "silent"

    # Restore default haunted_mansion track
    live_page.locator("#btn-settings-open").click()
    track_select.select_option("haunted_mansion")
    live_page.locator("#btn-close-settings").click()


def test_onboarding_overlay_dismissal_and_no_blocking(page: Page):
    """Verify fresh visitor can dismiss onboarding with close button and navigate cleanly."""
    page.goto(BASE_URL)
    page.evaluate("() => localStorage.clear()")
    page.reload()
    page.wait_for_load_state("networkidle")

    onboarding = page.locator("#modal-onboarding")
    expect(onboarding).to_be_visible()

    # Close button is visible and dismisses overlay
    close_btn = page.locator("#btn-close-onboarding")
    expect(close_btn).to_be_visible()
    close_btn.click()
    expect(onboarding).not_to_be_visible()

    # Explore Chapter Map can now be clicked directly without any overlay blocking
    page.locator("#btn-hero-journey").click()
    expect(page.locator("#modal-campaign")).to_be_visible()
    page.locator("#btn-close-campaign").click()
    expect(page.locator("#modal-campaign")).not_to_be_visible()


def test_lobby_hero_and_identity_banner(live_page: Page):
    """Verify the supernatural environment, hero branding, and returning player identity bar."""
    expect(live_page.locator(".supernatural-env")).to_be_attached()
    expect(live_page.locator(".supernatural-moon-wrap")).to_be_attached()
    expect(live_page.locator("#screen-start .lobby-hero")).to_be_visible()
    expect(live_page.locator("#start-title")).to_contain_text("SPOOKY MASTER")
    expect(live_page.locator("#btn-enter-the-haunt")).to_be_visible()

    # Identity banner elements
    expect(live_page.locator("#lobby-player-name")).to_be_visible()
    expect(live_page.locator("#lobby-player-tier")).to_be_visible()
    expect(live_page.locator("#lobby-diamond-count")).to_be_visible()

    # Avatar orb opens avatar selector
    live_page.locator("#btn-lobby-avatar").click(force=True)
    expect(live_page.locator("#modal-avatar-picker")).to_be_visible()
    live_page.locator("#btn-close-avatar-picker").click()
    expect(live_page.locator("#modal-avatar-picker")).not_to_be_visible()

    # Edit profile button opens settings modal
    live_page.locator("#btn-lobby-edit-profile").click()
    expect(live_page.locator("#modal-settings")).to_be_visible()
    live_page.locator("#btn-close-settings").click()
    expect(live_page.locator("#modal-settings")).not_to_be_visible()


def test_lobby_enter_the_haunt_flow(live_page: Page):
    """Verify that clicking ENTER THE HAUNT starts a quiz session immediately."""
    btn_enter = live_page.locator("#btn-enter-the-haunt")
    expect(btn_enter).to_be_visible()
    btn_enter.click()

    # Should transition to active quiz screen
    expect(live_page.locator("#screen-quiz")).to_be_visible(timeout=5000)
    expect(live_page.locator("#question-text")).to_be_visible()
    expect(live_page.locator(".options-container")).to_be_visible()

    # Return back to lobby to keep test clean
    live_page.locator("#nav-branding-home").click()
    expect(live_page.locator("#screen-start")).to_be_visible()


def test_lobby_journey_card_and_stage_preview(live_page: Page):
    """Verify Journey continue card, dynamic stage progression map, and navigation."""
    expect(live_page.locator("#lobby-journey-card")).to_be_visible()
    expect(live_page.locator("#lobby-journey-heading")).to_be_visible()
    expect(live_page.locator("#lobby-stage-progression-map")).to_be_visible()

    # At least one stage node exists with active badge
    active_node = live_page.locator(".lobby-stage-node.active-node")
    expect(active_node).to_be_visible()
    expect(active_node).to_contain_text("YOU ARE HERE")

    # Continue Journey button opens campaign modal
    btn_continue = live_page.locator("#btn-lobby-continue-journey")
    expect(btn_continue).to_be_visible()
    btn_continue.click()
    expect(live_page.locator("#modal-campaign")).to_be_visible()
    live_page.locator("#btn-close-campaign").click()
    expect(live_page.locator("#modal-campaign")).not_to_be_visible()


def test_lobby_quick_cards_and_navigation(live_page: Page):
    """Verify Quick Play, Daily Haunt, and Haunted Duels quick action buttons."""
    # Duels button opens duels modal
    btn_duels = live_page.locator("#btn-lobby-duels")
    expect(btn_duels).to_be_visible()
    btn_duels.click()
    expect(live_page.locator("#modal-duels")).to_be_visible()
    live_page.locator("#btn-close-duels").click()
    expect(live_page.locator("#modal-duels")).not_to_be_visible()

    # Quick Play starts a 5-question session
    btn_quick = live_page.locator("#btn-lobby-quick-play")
    expect(btn_quick).to_be_visible()
    btn_quick.click()
    expect(live_page.locator("#screen-quiz")).to_be_visible(timeout=5000)
    expect(live_page.locator("#q-counter")).to_contain_text("of 5")
    live_page.locator("#nav-branding-home").click()
    expect(live_page.locator("#screen-start")).to_be_visible()


def test_lobby_spooky_guide_hint_cycling(live_page: Page):
    """Verify Spooky Guide box renders quotes and cycling button updates hint."""
    quote_el = live_page.locator("#lobby-guide-quote")
    expect(quote_el).to_be_visible()
    initial_text = quote_el.inner_text()
    assert len(initial_text) > 0

    btn_next = live_page.locator("#btn-guide-next-hint")
    expect(btn_next).to_be_visible()
    btn_next.click()
    live_page.wait_for_timeout(300)

    updated_text = quote_el.inner_text()
    assert updated_text != initial_text


def test_lobby_snapshot_and_nav_pills(live_page: Page):
    """Verify snapshot metrics and secondary nav pills (Leaderboard, Settings, Progress)."""
    expect(live_page.locator("#lobby-progress-snapshot")).to_be_visible()
    expect(live_page.locator("#lobby-stat-games")).to_be_visible()
    expect(live_page.locator("#lobby-stat-streak")).to_be_visible()
    expect(live_page.locator("#lobby-stat-badges")).to_be_visible()
    expect(live_page.locator("#lobby-stat-mastery")).to_be_visible()

    # Progress button opens mastery modal
    live_page.locator("#btn-lobby-progress").click()
    expect(live_page.locator("#modal-mastery")).to_be_visible()
    live_page.locator("#btn-close-mastery").click()
    expect(live_page.locator("#modal-mastery")).not_to_be_visible()

    # Leaderboard button opens leaderboard modal
    live_page.locator("#btn-lobby-leaderboard").click()
    expect(live_page.locator("#modal-leaderboard")).to_be_visible()
    live_page.locator("#btn-close-modal").click()
    expect(live_page.locator("#modal-leaderboard")).not_to_be_visible()

    # Settings button opens settings modal
    live_page.locator("#btn-lobby-settings").click()
    expect(live_page.locator("#modal-settings")).to_be_visible()
    live_page.locator("#btn-close-settings").click()
    expect(live_page.locator("#modal-settings")).not_to_be_visible()


def test_lobby_clean_console_and_page_health(page: Page):
    """Verify zero unhandled javascript exceptions or severe console errors on lobby load."""
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))

    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    onboarding = page.locator("#modal-onboarding")
    if onboarding.is_visible():
        page.locator("#btn-save-onboarding").click()

    page.wait_for_timeout(500)
    assert errors == [], f"Console errors detected on lobby: {errors}"


def test_lobby_avatar_guises_dock_switching(live_page: Page):
    """Verify the 8 supernatural avatar guises render in the dock and clicking updates active guise."""
    dock = live_page.locator("#lobby-avatar-carousel")
    expect(dock).to_be_visible()

    dock_orbs = dock.locator(".lobby-avatar-dock-orb")
    expect(dock_orbs).to_have_count(8)

    # Click on Spectral Ghost guise (second avatar)
    ghost_orb = dock_orbs.nth(1)
    ghost_orb.click()

    # Ghost orb is now selected and active avatar image reflects ghost.svg
    expect(ghost_orb).to_have_class(re.compile(r"\bselected\b"))
    expect(live_page.locator("#lobby-avatar-img")).to_have_attribute("src", re.compile(r"ghost\.svg"))


def test_lobby_daily_haunt_flow(live_page: Page):
    """Verify clicking DAILY HAUNT card starts a 10-question daily challenge session."""
    btn_daily = live_page.locator("#btn-lobby-daily-haunt")
    expect(btn_daily).to_be_visible()
    btn_daily.click()

    expect(live_page.locator("#screen-quiz")).to_be_visible(timeout=5000)
    expect(live_page.locator("#q-mode-badge")).to_contain_text("DAILY")
    expect(live_page.locator("#q-counter")).to_contain_text("of 10")

    # Return home
    live_page.locator("#nav-branding-home").click()
    expect(live_page.locator("#screen-start")).to_be_visible()


def test_lobby_progress_snapshot_card_click(live_page: Page):
    """Clicking anywhere on the progress snapshot card opens the full hunter mastery modal."""
    snapshot_card = live_page.locator("#lobby-progress-snapshot")
    expect(snapshot_card).to_be_visible()
    snapshot_card.click()

    expect(live_page.locator("#modal-mastery")).to_be_visible()
    live_page.locator("#btn-close-mastery").click()
    expect(live_page.locator("#modal-mastery")).not_to_be_visible()


def test_lobby_reduced_motion_behavior(live_page: Page):
    """Verify reduced motion toggle disables CSS animations cleanly across lobby elements."""
    # Open settings and toggle reduced motion
    live_page.locator("#btn-settings-open").click()
    expect(live_page.locator("#modal-settings")).to_be_visible()

    setting_checkbox = live_page.locator("#setting-reduced-motion")
    setting_checkbox.check()
    expect(live_page.locator("html")).to_have_class(re.compile(r"\breduced-motion\b"))

    # Close settings
    live_page.locator("#btn-close-settings").click()

    # Floating emblem has animation: none when reduced-motion is active
    anim_style = live_page.eval_on_selector(
        ".lobby-floating-emblem", "el => window.getComputedStyle(el).animationName"
    )
    assert anim_style == "none"

    # Reset reduced motion setting back off
    live_page.locator("#btn-settings-open").click()
    setting_checkbox.uncheck()
    live_page.locator("#btn-close-settings").click()


def test_final_manual_journey_complete_sequence(live_page: Page):
    """
    Perform the complete canonical manual journey sequence required by Spooky Master:
    Open Spooky Master -> Opening page appears -> Existing hunter avatar/name shown
    -> Background music works -> Enter the Haunt -> Return Home -> Continue Journey
    -> Journey opens -> Explore Chapter Map -> Chapter map opens -> Return Home
    -> Daily Haunt -> Return Home -> Haunted Duels -> Return Home -> Progress
    -> Return Home -> Leaderboard -> Settings -> Adjust sound -> Return Home
    -> Quick Play -> Start quiz -> Answers -> Complete round.
    """
    # 1 & 2. Open Spooky Master & Opening page appears
    live_page.goto(BASE_URL)
    live_page.wait_for_load_state("networkidle")
    expect(live_page.locator("#screen-start")).to_be_visible()
    expect(live_page.locator("#start-title")).to_contain_text("SPOOKY MASTER")

    # 3. Existing hunter avatar/name shown
    expect(live_page.locator("#lobby-avatar-img")).to_be_visible()
    expect(live_page.locator("#lobby-player-name")).to_be_visible()
    expect(live_page.locator("#lobby-diamond-count")).to_be_visible()

    # 4. Background music works (canonical music track mapped)
    bgm_src = live_page.evaluate("""() => {
        const sound = window.halloweenApp.sound;
        const audioEl = sound.bgmAudio;
        const sourceEl = audioEl ? audioEl.querySelector('source') : null;
        return audioEl ? (audioEl.src || (sourceEl ? sourceEl.src : '')) : '';
    }""")
    assert "spooky-master-main.mp3" in bgm_src

    # 5. Enter the Haunt
    live_page.locator("#btn-enter-the-haunt").click()
    expect(live_page.locator("#screen-quiz")).to_be_visible(timeout=5000)

    # 6. Return Home
    live_page.locator("#nav-branding-home").click()
    expect(live_page.locator("#screen-start")).to_be_visible()

    # 7 & 8. Continue Journey & Journey opens
    live_page.locator("#btn-lobby-continue-journey").click()
    expect(live_page.locator("#modal-campaign")).to_be_visible()
    live_page.locator("#btn-close-campaign").click()
    expect(live_page.locator("#modal-campaign")).not_to_be_visible()

    # 9 & 10. Explore Chapter Map & Chapter map opens
    live_page.locator("#btn-hero-journey").click()
    expect(live_page.locator("#modal-campaign")).to_be_visible()
    live_page.locator("#btn-close-campaign").click()
    expect(live_page.locator("#modal-campaign")).not_to_be_visible()

    # 11. Return Home
    expect(live_page.locator("#screen-start")).to_be_visible()

    # 12 & 13. Daily Haunt & Return Home
    live_page.locator("#btn-lobby-daily-haunt").click()
    expect(live_page.locator("#screen-quiz")).to_be_visible(timeout=5000)
    live_page.locator("#nav-branding-home").click()
    expect(live_page.locator("#screen-start")).to_be_visible()

    # 14 & 15. Haunted Duels & Return Home
    live_page.locator("#btn-lobby-duels").click()
    expect(live_page.locator("#modal-duels")).to_be_visible()
    live_page.locator("#btn-close-duels").click()
    expect(live_page.locator("#modal-duels")).not_to_be_visible()
    expect(live_page.locator("#screen-start")).to_be_visible()

    # 16 & 17. Progress & Return Home
    live_page.locator("#btn-lobby-progress").click()
    expect(live_page.locator("#modal-mastery")).to_be_visible()
    live_page.locator("#btn-close-mastery").click()
    expect(live_page.locator("#modal-mastery")).not_to_be_visible()
    expect(live_page.locator("#screen-start")).to_be_visible()

    # 18. Leaderboard
    live_page.locator("#btn-lobby-leaderboard").click()
    expect(live_page.locator("#modal-leaderboard")).to_be_visible()
    live_page.locator("#btn-close-modal").click()
    expect(live_page.locator("#modal-leaderboard")).not_to_be_visible()

    # 19 & 20. Settings & Adjust sound
    live_page.locator("#btn-lobby-settings").click()
    expect(live_page.locator("#modal-settings")).to_be_visible()
    sound_toggle = live_page.locator("#modal-btn-sound-toggle")
    sound_toggle.click()
    sound_toggle.click()

    # 21. Return Home
    live_page.locator("#btn-close-settings").click()
    expect(live_page.locator("#modal-settings")).not_to_be_visible()
    expect(live_page.locator("#screen-start")).to_be_visible()

    # 22 & 23. Quick Play & Start quiz
    live_page.locator("#btn-lobby-quick-play").click()
    expect(live_page.locator("#screen-quiz")).to_be_visible(timeout=5000)
    expect(live_page.locator("#q-counter")).to_contain_text("of 5")

    # 24. Answer questions (correct/incorrect answer choices)
    for _ in range(5):
        expect(live_page.locator("#options-grid")).to_be_visible()
        options = live_page.locator(".option-btn")
        expect(options).to_have_count(4)
        options.nth(0).click()

        feedback = live_page.locator("#feedback-panel")
        expect(feedback).to_be_visible()
        live_page.locator("#btn-next-question").click()

    # 25. Complete round
    expect(live_page.locator("#screen-gameover")).to_be_visible(timeout=5000)
    expect(live_page.locator("#stat-final-score")).to_be_visible()
    live_page.locator("#btn-play-again").click()
    expect(live_page.locator("#screen-start")).to_be_visible()


def test_v25_full_regression_journey_complete_flow(live_page: Page):
    """
    Spooky Master v2.5 Canonical Full Regression Journey:
    Open game -> Profile loads -> Background audio -> Journey -> Read Lore ->
    Select stage -> Start stage -> Return Home -> Quick Play -> Answer questions ->
    Smart Hint -> Complete round -> Progress -> Hunter Studio -> Generate/equip hunter ->
    Leaderboard -> Settings -> Daily Haunt -> Confirm AI hints unavailable -> Duels ->
    Return Home.
    Verifies 0 broken buttons and 0 unhandled console/page errors.
    """
    console_errors: list[str] = []
    live_page.on(
        "console",
        lambda msg: console_errors.append(msg.text) if msg.type == "error" else None,
    )
    page_errors: list[str] = []
    live_page.on("pageerror", lambda err: page_errors.append(str(err)))

    # 1. Open game
    live_page.goto(BASE_URL)
    live_page.wait_for_load_state("networkidle")
    expect(live_page.locator("#screen-start")).to_be_visible()

    # 2. Profile loads
    expect(live_page.locator("#lobby-avatar-img")).to_be_visible()
    expect(live_page.locator("#lobby-player-name")).to_be_visible()
    expect(live_page.locator("#lobby-diamond-count")).to_be_visible()

    # 3. Background audio
    bgm_src = live_page.evaluate("""() => {
        const sound = window.halloweenApp?.sound;
        const audioEl = sound?.bgmAudio;
        const sourceEl = audioEl ? audioEl.querySelector('source') : null;
        return audioEl ? (audioEl.src || (sourceEl ? sourceEl.src : '')) : '';
    }""")
    assert "spooky-master-main.mp3" in bgm_src

    # 4. Journey
    live_page.locator("#btn-campaign-nav").click()
    campaign_modal = live_page.locator("#modal-campaign")
    expect(campaign_modal).to_be_visible()

    # 5. Read Lore
    live_page.locator("#btn-read-chapter-story").click()
    story_modal = live_page.locator("#modal-chapter-story")
    expect(story_modal).to_be_visible()
    expect(story_modal.locator("#story-text")).not_to_be_empty()
    live_page.locator("#btn-close-story").click()
    expect(story_modal).not_to_be_visible()

    # 6. Select stage
    first_stage = campaign_modal.locator("#stages-trail-list .stage-node-card").first
    first_stage.click()
    expect(campaign_modal.locator("#stage-detail-panel")).to_be_visible()

    # 7. Start stage
    campaign_modal.locator("#btn-start-stage").click()
    expect(live_page.locator("#screen-quiz")).to_be_visible(timeout=5000)

    # 8. Return Home
    live_page.locator("#nav-branding-home").click()
    expect(live_page.locator("#screen-start")).to_be_visible()

    # 9. Quick Play
    live_page.locator("#btn-lobby-quick-play").click()
    expect(live_page.locator("#screen-quiz")).to_be_visible(timeout=5000)

    # 10. Smart Hint
    expect(live_page.locator("#btn-ask-spooky-guide")).to_be_visible()
    live_page.locator("#btn-ask-spooky-guide").click()
    expect(live_page.locator("#quiz-spooky-guide-box")).to_be_visible()
    expect(live_page.locator("#quiz-guide-hint-text")).not_to_be_empty()
    live_page.locator("#btn-close-guide-bubble").click()
    expect(live_page.locator("#quiz-spooky-guide-box")).not_to_be_visible()

    # 11. Answer questions (5 questions in quick play)
    for _ in range(5):
        expect(live_page.locator("#options-grid")).to_be_visible()
        options = live_page.locator(".option-btn")
        expect(options).to_have_count(4)
        options.nth(0).click()

        feedback = live_page.locator("#feedback-panel")
        expect(feedback).to_be_visible()
        live_page.locator("#btn-next-question").click()

    # 12. Complete round
    expect(live_page.locator("#screen-gameover")).to_be_visible(timeout=5000)
    expect(live_page.locator("#stat-final-score")).to_be_visible()
    live_page.locator("#btn-play-again").click()
    expect(live_page.locator("#screen-start")).to_be_visible()

    # 13. Progress
    live_page.locator("#btn-lobby-progress").click()
    expect(live_page.locator("#modal-mastery")).to_be_visible()
    live_page.locator("#btn-close-mastery").click()
    expect(live_page.locator("#modal-mastery")).not_to_be_visible()

    # 14. Hunter Studio
    live_page.locator("#btn-start-change-avatar").click()
    expect(live_page.locator("#modal-avatar-picker")).to_be_visible()
    live_page.locator("#tab-avatar-generator").click()
    expect(live_page.locator("#picker-generator-body")).to_be_visible()

    # 15. Generate / equip hunter
    live_page.locator("#btn-generate-hunter").click()
    equip_btn = live_page.locator("#btn-equip-generated-hunter")
    expect(equip_btn).to_be_visible(timeout=5000)
    equip_btn.click()
    expect(live_page.locator("#modal-avatar-picker")).not_to_be_visible()

    # 16. Leaderboard
    live_page.locator("#btn-lobby-leaderboard").click()
    expect(live_page.locator("#modal-leaderboard")).to_be_visible()
    live_page.locator("#btn-close-modal").click()
    expect(live_page.locator("#modal-leaderboard")).not_to_be_visible()

    # 17. Settings
    live_page.locator("#btn-lobby-settings").click()
    expect(live_page.locator("#modal-settings")).to_be_visible()
    live_page.locator("#btn-close-settings").click()
    expect(live_page.locator("#modal-settings")).not_to_be_visible()

    # 18. Daily Haunt
    live_page.locator("#btn-lobby-daily-haunt").click()
    expect(live_page.locator("#screen-quiz")).to_be_visible(timeout=5000)

    # 19. Confirm AI hints unavailable in Daily Haunt
    expect(live_page.locator("#btn-ask-spooky-guide")).to_be_hidden()

    # 20. Duels
    live_page.locator("#nav-branding-home").click()
    expect(live_page.locator("#screen-start")).to_be_visible()
    live_page.locator("#btn-lobby-duels").click()
    expect(live_page.locator("#modal-duels")).to_be_visible()

    # 21. Return Home
    live_page.locator("#btn-close-duels").click()
    expect(live_page.locator("#modal-duels")).not_to_be_visible()
    expect(live_page.locator("#screen-start")).to_be_visible()

    # 22. Console & Page Error verification
    assert len(page_errors) == 0, f"Page errors encountered: {page_errors}"
    # Filter benign favicon/asset warnings if any
    filtered_console = [err for err in console_errors if "favicon" not in err.lower()]
    assert len(filtered_console) == 0, f"Console errors encountered: {filtered_console}"





