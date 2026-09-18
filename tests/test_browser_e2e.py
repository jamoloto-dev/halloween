"""Playwright browser end-to-end tests for Spooky Master / Halloween Quiz."""

import json
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
    live_page.on("dialog", lambda dialog: (alert_messages.append(dialog.message), dialog.dismiss()))

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
