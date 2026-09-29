/**
 * 🎃 Spooky Master (Halloween Quiz) - Atmospheric Themes Module
 * Manages atmospheric visual themes, entitlement lock checking,
 * settings grid rendering, and document theme class application.
 */

import { AVAILABLE_THEMES, escapeHtml } from "./utils.js";

export class ThemesManager {
    constructor(app) {
        this.app = app;
    }

    get dom() {
        return this.app.dom;
    }

    get profile() {
        return this.app.profile;
    }

    renderThemesGrid() {
        const grid = this.dom.settingsThemesGrid;
        if (!grid) return;
        grid.innerHTML = "";
        const activeTheme = this.profile?.preferences?.theme || "default";

        AVAILABLE_THEMES.forEach((theme) => {
            const isCurrent = theme.id === activeTheme;
            const isLocked = theme.is_premium && !this.app.isPremium();
            const card = document.createElement("button");
            card.type = "button";
            card.className = `theme-select-card ${isCurrent ? "active" : ""} ${isLocked ? "theme-locked" : ""}`;
            card.setAttribute("role", "radio");
            card.setAttribute("aria-checked", isCurrent ? "true" : "false");
            card.innerHTML = `
                <div class="theme-card-icon">${theme.icon}</div>
                <div class="theme-card-body">
                    <strong class="theme-card-name">${escapeHtml(theme.name)}</strong>
                    <small class="theme-card-desc">${escapeHtml(theme.desc)}</small>
                </div>
                ${isLocked ? `<span class="theme-lock-badge">🔒 PASS</span>` : ""}
            `;
            card.addEventListener("click", () => {
                if (isLocked) {
                    this.app.openPremiumModal();
                    return;
                }
                this.setTheme(theme.id);
            });
            grid.appendChild(card);
        });
    }

    setTheme(themeId) {
        if (!this.profile) return;
        if (!this.profile.preferences) this.profile.preferences = {};
        this.profile.preferences.theme = themeId;
        this.app.saveProfile(this.profile);
        this.applyTheme(themeId);
        this.renderThemesGrid();
        this.app.sound?.play("ui_click");
        this.app.showToast("Atmosphere Set", `Theme changed to ${themeId.replace("_", " ")}`, "🎨");
    }

    applyTheme(themeId = null) {
        const theme = themeId || (this.profile?.preferences?.theme) || "default";
        if (theme === "default") {
            document.documentElement.removeAttribute("data-theme");
            document.body.removeAttribute("data-theme");
        } else {
            document.documentElement.setAttribute("data-theme", theme);
            document.body.setAttribute("data-theme", theme);
        }
    }
}
