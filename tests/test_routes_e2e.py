"""🎃 Spooky Master v2.6 Multi-Page Game Experience — Browser Route Navigation & E2E Tests.

Tests real browser URLs, deep links, direct page refresh, client-side routing,
browser history (Back/Forward), active navigation indicators, mobile navigation,
and quiz leave confirmation guard.
"""

import re

import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:5000"


@pytest.fixture(autouse=True)
def ensure_server(page: Page):
    """Ensure page is loaded and server is reachable."""
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")


@pytest.mark.e2e
def test_direct_url_access_and_refresh(page: Page):
    """Verifies direct URL access and F5 refresh on major game routes."""
    routes_to_test = [
        ("/journey", "#modal-campaign", "Haunted Journey"),
        ("/duels", "#modal-duels", "Haunted Duels"),
        ("/progress", "#modal-mastery", "Progress & Mastery"),
        ("/leaderboard", "#modal-leaderboard", "Leaderboard"),
        ("/pass", "#modal-premium", "Spooky Master Pass"),
        ("/settings", "#modal-settings", "Settings"),
        ("/daily-haunt", "#page-daily-haunt", "Daily Haunt"),
        ("/play", "#crypt-custom-chamber", "Play Setup"),
    ]

    for route, expected_selector, expected_title_part in routes_to_test:
        page.goto(f"{BASE_URL}{route}")
        page.wait_for_load_state("networkidle")

        # URL matches route
        expect(page).to_have_url(re.compile(rf"{route}$"))
        assert expected_title_part in page.title()

        # Content container is visible
        expect(page.locator(expected_selector)).to_be_visible()

        # Direct page reload (F5) preserves the route URL and keeps view visible
        page.reload()
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(re.compile(rf"{route}$"))
        expect(page.locator(expected_selector)).to_be_visible()


@pytest.mark.e2e
def test_client_side_navigation_history_back_forward(page: Page):
    """Verifies that clicking links changes the browser URL and Back/Forward operates cleanly."""
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    expect(page).to_have_url(re.compile(r"/$"))

    # 1. Click Journey link
    journey_nav = page.locator('.top-nav a[data-route="/journey"]')
    expect(journey_nav).to_be_visible()
    journey_nav.click()

    expect(page).to_have_url(re.compile(r"/journey$"))
    expect(page.locator("#modal-campaign")).to_be_visible()
    expect(journey_nav).to_have_attribute("aria-current", "page")

    # 2. Click Duels link
    duels_nav = page.locator('.top-nav a[data-route="/duels"]')
    expect(duels_nav).to_be_visible()
    duels_nav.click()

    expect(page).to_have_url(re.compile(r"/duels$"))
    expect(page.locator("#modal-duels")).to_be_visible()
    expect(duels_nav).to_have_attribute("aria-current", "page")

    # 3. Click Progress link
    progress_nav = page.locator('.top-nav a[data-route="/progress"]')
    expect(progress_nav).to_be_visible()
    progress_nav.click()

    expect(page).to_have_url(re.compile(r"/progress$"))
    expect(page.locator("#modal-mastery")).to_be_visible()
    expect(progress_nav).to_have_attribute("aria-current", "page")

    # 4. Browser Back button: returns to /duels
    page.go_back()
    page.wait_for_timeout(200)
    expect(page).to_have_url(re.compile(r"/duels$"))
    expect(page.locator("#modal-duels")).to_be_visible()

    # 5. Browser Back button: returns to /journey
    page.go_back()
    page.wait_for_timeout(200)
    expect(page).to_have_url(re.compile(r"/journey$"))
    expect(page.locator("#modal-campaign")).to_be_visible()

    # 6. Browser Forward button: returns to /duels
    page.go_forward()
    page.wait_for_timeout(200)
    expect(page).to_have_url(re.compile(r"/duels$"))
    expect(page.locator("#modal-duels")).to_be_visible()


@pytest.mark.e2e
def test_chapter_deep_link_and_tab_navigation(page: Page):
    """Verifies /journey/chapter/{id} deep link loads chapter stages and updates URL."""
    page.goto(f"{BASE_URL}/journey")
    page.wait_for_load_state("networkidle")
    expect(page.locator("#modal-campaign")).to_be_visible()

    # Click first chapter tab
    ch1_tab = page.locator("#campaign-chapter-tabs .tab-btn").first
    expect(ch1_tab).to_be_visible()
    ch1_tab.click()

    # URL updates to /journey/chapter/ch1_abandoned_manor or similar
    expect(page).to_have_url(re.compile(r"/journey/chapter/"))

    # Stage trail list is rendered
    stages = page.locator("#stages-trail-list .stage-node-card")
    expect(stages.first).to_be_visible()


@pytest.mark.e2e
def test_duel_invitation_route(page: Page):
    """Verifies /duels/{code} displays the duel invite page and challenger details."""
    page.goto(f"{BASE_URL}/duels/SPOOK-PHANTOM7")
    page.wait_for_load_state("networkidle")

    expect(page).to_have_url(re.compile(r"/duels/SPOOK-PHANTOM7$"))
    expect(page.locator("#page-duel-invite")).to_be_visible()
    expect(page.locator("#invite-duel-code-display")).to_contain_text("SPOOK-PHANTOM7")
    expect(page.locator("#btn-accept-duel-invite")).to_be_visible()


@pytest.mark.e2e
def test_mobile_bottom_navigation_and_more_drawer(page: Page):
    """Verifies compact mobile bottom navigation bar and 'More' drawer on mobile viewport."""
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    mobile_nav = page.locator(".mobile-bottom-nav")
    expect(mobile_nav).to_be_visible()

    # Journey link on bottom nav
    mobile_journey = mobile_nav.locator('a[data-route="/journey"]')
    expect(mobile_journey).to_be_visible()
    mobile_journey.click()
    expect(page).to_have_url(re.compile(r"/journey$"))
    expect(page.locator("#modal-campaign")).to_be_visible()

    # Open 'More' drawer sheet
    more_btn = page.locator("#btn-mobile-more")
    expect(more_btn).to_be_visible()
    more_btn.click()

    more_sheet = page.locator("#mobile-more-sheet")
    expect(more_sheet).to_be_visible()

    # Click Settings inside More drawer
    more_settings = more_sheet.locator('a[data-route="/settings"]')
    expect(more_settings).to_be_visible()
    more_settings.click()

    expect(page).to_have_url(re.compile(r"/settings$"))
    expect(page.locator("#modal-settings")).to_be_visible()
    expect(more_sheet).not_to_be_visible()


@pytest.mark.e2e
def test_active_quiz_leave_confirmation_guard(page: Page):
    """Verifies that attempting to leave an active quiz round prompts the player."""
    page.goto(f"{BASE_URL}/play")
    page.wait_for_load_state("networkidle")

    # Start a quick round
    page.locator("#num-questions").select_option("5")
    page.locator("#btn-start").click()
    expect(page.locator("#screen-quiz")).to_be_visible()
    expect(page).to_have_url(re.compile(r"/play/session$"))

    # Enable explicit prompt verification
    page.evaluate("() => { window.__REQUIRE_CONFIRM__ = true; }")

    # 1. Dismiss confirmation: player chooses Cancel -> round continues
    page.once("dialog", lambda dialog: dialog.dismiss())
    page.locator('.top-nav a[data-route="/journey"]').click()

    # Still on /play/session and quiz screen active
    expect(page).to_have_url(re.compile(r"/play/session$"))
    expect(page.locator("#screen-quiz")).to_be_visible()

    # 2. Accept confirmation: player chooses OK -> round abandoned and navigates
    page.once("dialog", lambda dialog: dialog.accept())
    page.locator('.top-nav a[data-route="/journey"]').click()

    # Successfully navigated away to /journey
    expect(page).to_have_url(re.compile(r"/journey$"))
    expect(page.locator("#modal-campaign")).to_be_visible()
