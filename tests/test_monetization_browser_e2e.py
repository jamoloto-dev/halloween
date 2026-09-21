"""Playwright Browser E2E Tests for Monetization, Themes, Leaderboards, and Social Sharing."""

import os

import pytest
from playwright.sync_api import Page, expect

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:5000")


@pytest.fixture(scope="module", autouse=True)
def ensure_server_running():
    import urllib.request
    try:
        urllib.request.urlopen(f"{BASE_URL}/health", timeout=3)
    except Exception:
        pytest.skip(f"Test server not reachable at {BASE_URL}. Skipping browser E2E suite.")


def test_pass_nav_modal_flow(page: Page):
    """Spooky Master Pass modal can be opened from navigation, displays catalog, and closes."""
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    # Dismiss onboarding if open
    onboarding_save = page.locator("#btn-save-onboarding")
    if onboarding_save.is_visible():
        onboarding_save.click()
        page.wait_for_timeout(300)

    # Click Pass Nav button
    btn_pass = page.locator("#btn-pass-nav")
    expect(btn_pass).to_be_visible()
    btn_pass.click()

    # Premium modal is shown
    modal_premium = page.locator("#modal-premium")
    expect(modal_premium).to_be_visible()

    # Verify lifetime pass and VIP cards exist with zero-P2W fairness banner
    fairness = page.locator(".premium-fairness-banner")
    expect(fairness).to_be_visible()
    expect(fairness).to_contain_text("Strict Fair Play Guarantee")

    card_pass = page.locator("#card-product-pass")
    expect(card_pass).to_be_visible()
    expect(card_pass).to_contain_text("Spooky Master Pass")
    expect(card_pass).to_contain_text("$4.99")

    card_vip = page.locator("#card-product-vip")
    expect(card_vip).to_be_visible()
    expect(card_vip).to_contain_text("Haunted VIP Pass")
    expect(card_vip).to_contain_text("$2.99")

    # Close modal
    btn_close = page.locator("#btn-close-premium")
    expect(btn_close).to_be_visible()
    btn_close.click()
    expect(modal_premium).not_to_be_visible()


def test_leaderboard_view_switcher(page: Page):
    """Leaderboard view switcher toggles between All-Time, Today's Daily, and Personal Best."""
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    # Open leaderboard
    page.locator("#btn-leaderboard-open").click()
    modal_lb = page.locator("#modal-leaderboard")
    expect(modal_lb).to_be_visible()

    # PB container is hidden initially in All-Time view
    pb_container = page.locator("#leaderboard-pb-container")
    expect(pb_container).not_to_be_visible()

    # Switch to Personal Best
    page.locator('.lb-view-btn[data-view="pb"]').click()
    expect(pb_container).to_be_visible()
    expect(page.locator("#pb-high-score")).to_be_visible()

    # Switch to Daily
    page.locator('.lb-view-btn[data-view="daily"]').click()
    expect(pb_container).not_to_be_visible()

    # Switch back to All-Time
    page.locator('.lb-view-btn[data-view="all"]').click()
    expect(pb_container).not_to_be_visible()

    # Close modal
    page.locator("#btn-close-modal").click()
    expect(modal_lb).not_to_be_visible()


def test_atmospheric_themes_in_settings(page: Page):
    """Settings modal contains atmospheric theme selector and applies default theme."""
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    # Open settings
    page.locator("#btn-settings-open").click()
    modal_settings = page.locator("#modal-settings")
    expect(modal_settings).to_be_visible()

    # Themes grid is populated
    themes_grid = page.locator("#settings-themes-grid")
    expect(themes_grid).to_be_visible()

    # Haunted Mansion default theme card exists and is active
    default_card = themes_grid.locator(".theme-select-card").first
    expect(default_card).to_be_visible()
    expect(default_card).to_contain_text("Haunted Mansion")

    # Close settings
    page.locator("#btn-close-settings").click()
    expect(modal_settings).not_to_be_visible()
