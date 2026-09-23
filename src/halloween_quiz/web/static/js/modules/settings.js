/**
 * 🎃 Spooky Master (Halloween Quiz) - Settings & Customization Module
 * Manages audio toggles, volume sliders, track choices, visual theme selections,
 * accessibility controls (Reduced Motion, Haptics), and data export/reset.
 */

import { AVAILABLE_THEMES } from "./utils.js";

export class SettingsManager {
    constructor(app) {
        this.app = app;
    }

    get dom() {
        return this.app.dom;
    }

    get sound() {
        return this.app.sound;
    }

    get profile() {
        return this.app.profile;
    }

    openSettings() {
        this.app.closeAllModals();
        this.syncSettingsUi();
        this.dom.modalSettings?.classList.remove("hidden");
        if (this.dom.settingsPlayerName && this.profile?.nickname) {
            this.dom.settingsPlayerName.value = this.profile.nickname;
        }
    }

    closeSettings() {
        this.dom.modalSettings?.classList.add("hidden");
    }

    syncSettingsUi() {
        // Music Controls
        if (this.dom.modalBtnBgmToggle) {
            this.dom.modalBtnBgmToggle.textContent = this.sound.musicEnabled ? "Music: On" : "Music: Off";
            this.dom.modalBtnBgmToggle.classList.toggle("btn-active", this.sound.musicEnabled);
        }
        if (this.dom.settingMusicTrack) {
            this.dom.settingMusicTrack.value = this.sound.selectedTrack;
        }
        if (this.dom.modalMusicSlider) {
            this.dom.modalMusicSlider.value = this.sound.musicVolume;
        }
        if (this.dom.musicVolVal) {
            this.dom.musicVolVal.textContent = `${Math.round(this.sound.musicVolume * 100)}%`;
        }

        // SFX Controls
        if (this.dom.modalBtnSoundToggle) {
            this.dom.modalBtnSoundToggle.textContent = this.sound.sfxEnabled ? "Sound: On" : "Sound: Muted";
            this.dom.modalBtnSoundToggle.classList.toggle("btn-active", this.sound.sfxEnabled);
        }
        if (this.dom.modalSfxSlider) {
            this.dom.modalSfxSlider.value = this.sound.sfxVolume;
        }
        if (this.dom.sfxVolVal) {
            this.dom.sfxVolVal.textContent = `${Math.round(this.sound.sfxVolume * 100)}%`;
        }

        // Accessibility Controls
        if (this.dom.settingReducedMotion) {
            this.dom.settingReducedMotion.checked = Boolean(this.profile?.preferences?.reduced_motion);
        }
        if (this.dom.settingVibration) {
            this.dom.settingVibration.checked = this.profile?.preferences?.vibration !== false;
        }

        this.app.renderThemesGrid?.();
    }

    resetProgressData() {
        const confirmed = confirm("Are you sure you want to reset your local stats, badges, and category mastery? Your chosen avatar and name will be kept.");
        if (!confirmed) return;

        localStorage.removeItem("halloween_progress_v2");
        localStorage.removeItem("halloween_progress_v1");

        if (this.profile) {
            this.profile.stats = {
                games_played: 0,
                total_answered: 0,
                total_correct: 0,
                best_score: 0,
                best_streak: 0,
                preferred_mode: "classic",
            };
            this.app.saveProfile(this.profile);
        }
        this.app.loadCategories?.();
        this.app.applyProfileToUi?.();
        this.app.showToast("Progress Reset", "All local statistics and badges have been cleared.", "🧹");
    }
}
