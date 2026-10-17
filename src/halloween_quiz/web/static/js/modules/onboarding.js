/**
 * 🎃 Spooky Master (Halloween Quiz) - Onboarding Module
 * Manages the first-launch new hunter setup modal, avatar selection grid,
 * nickname initialization, and initial profile persistence.
 */

import { PREDEFINED_AVATARS } from "./utils.js";

export class OnboardingManager {
    constructor(app) {
        this.app = app;
        this.selectedAvatar = "pumpkin_hunter";
    }

    get dom() {
        return this.app.dom;
    }

    get profile() {
        return this.app.profile;
    }

    openOnboarding() {
        this.app.closeAllModals();
        this.dom.modalOnboarding?.classList.remove("hidden");
        this.renderOnboardingAvatarGrid();
    }

    closeOnboarding() {
        this.dom.modalOnboarding?.classList.add("hidden");
    }

    renderOnboardingAvatarGrid() {
        if (!this.dom.onboardingAvatarGrid) return;
        this.dom.onboardingAvatarGrid.innerHTML = "";
        const baseAvatars = PREDEFINED_AVATARS.filter((av) => !av.is_premium);

        baseAvatars.forEach((avatar) => {
            const isSelected = avatar.id === (this.app.selectedOnboardingAvatar || this.selectedAvatar);
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `avatar-option-card ${isSelected ? "selected" : ""}`;
            btn.setAttribute("role", "radio");
            btn.setAttribute("aria-checked", isSelected ? "true" : "false");
            btn.innerHTML = `
                <img src="${avatar.asset}" alt="${avatar.name}" class="avatar-card-img" width="56" height="56">
                <span class="avatar-card-name">${avatar.name}</span>
                <small class="avatar-card-desc">${avatar.desc}</small>
            `;
            btn.addEventListener("click", () => {
                this.selectedAvatar = avatar.id;
                this.app.selectedOnboardingAvatar = avatar.id;
                this.renderOnboardingAvatarGrid();
            });
            this.dom.onboardingAvatarGrid.appendChild(btn);
        });
    }

    completeOnboarding() {
        const name = (this.dom.onboardingHunterName?.value || "Ghost Hunter").trim();
        const avatarId = this.app.selectedOnboardingAvatar || this.selectedAvatar || "pumpkin_hunter";

        this.app.updateNickname(name || "Ghost Hunter");
        this.app.updateAvatar(avatarId);
        if (this.profile) {
            this.profile.onboarding_completed = true;
            this.app.saveProfile(this.profile);
        }
        try {
            localStorage.setItem("spooky_gate_entered", "true");
        } catch (_) {}
        this.closeOnboarding();
        this.app.sound?.play("achievement");
        this.app.showToast("Welcome Hunter!", "Your profile is forged. The crypt awaits.", "🎃");
    }
}
