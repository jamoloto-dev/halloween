/**
 * 🎃 Spooky Master (Halloween Quiz) - Player Profile & Economy Module
 * Manages player profile persistence (localStorage with legacy migration),
 * diamond wallet & ledger, mastery tracking, achievements, and entitlements.
 */

import { generateUuid, getMasteryTier, ALL_BADGES } from "./utils.js";

export class ProfileManager {
    constructor(app) {
        this.app = app;
        this.profile = null;
        this.entitlements = { tier: "free", active_features: [] };
    }

    get dom() {
        return this.app.dom;
    }

    loadProfile() {
        try {
            const raw = localStorage.getItem("spooky_player_profile");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                    if (!parsed.player_id) parsed.player_id = generateUuid();
                    if (!parsed.nickname) parsed.nickname = "Ghost Hunter";
                    if (!parsed.avatar_id) parsed.avatar_id = "pumpkin_hunter";
                    if (typeof parsed.diamonds !== "number") parsed.diamonds = 50;
                    if (!parsed.boosters) parsed.boosters = { hint: 1, time_extension: 1, double_points: 0, shield: 0 };
                    if (!Array.isArray(parsed.cosmetics_unlocked)) parsed.cosmetics_unlocked = ["pumpkin_hunter", "ghost"];
                    if (!parsed.campaign) parsed.campaign = { completed_stages: {}, claimed_stage_rewards: {}, claimed_chapter_rewards: {} };
                    if (!parsed.claimed_community_goals) parsed.claimed_community_goals = {};
                    if (!Array.isArray(parsed.diamond_ledger)) parsed.diamond_ledger = [];
                    if (!parsed.stats) parsed.stats = { games_played: 0, total_answered: 0, total_correct: 0, best_score: 0, best_streak: 0, preferred_mode: "classic" };

                    if (!parsed.preferences) {
                        parsed.preferences = {
                            music_enabled: true,
                            music_volume: 0.25,
                            music_track: "haunted_mansion",
                            sfx_enabled: true,
                            sfx_volume: 0.60,
                            reduced_motion: false,
                            vibration: true,
                            theme: "default",
                        };
                    } else {
                        if (parsed.preferences.music_enabled === undefined) parsed.preferences.music_enabled = true;
                        if (typeof parsed.preferences.music_volume !== "number" || isNaN(parsed.preferences.music_volume)) parsed.preferences.music_volume = 0.25;
                        if (!parsed.preferences.music_track || parsed.preferences.music_track === "horror-ambience") parsed.preferences.music_track = "haunted_mansion";
                        if (parsed.preferences.sfx_enabled === undefined) parsed.preferences.sfx_enabled = true;
                        if (typeof parsed.preferences.sfx_volume !== "number" || isNaN(parsed.preferences.sfx_volume)) parsed.preferences.sfx_volume = 0.60;
                        parsed.preferences.reduced_motion = Boolean(parsed.preferences.reduced_motion);
                        parsed.preferences.vibration = parsed.preferences.vibration !== false;
                        if (!parsed.preferences.theme) parsed.preferences.theme = "default";
                    }

                    this.profile = parsed;
                    this.app.profile = parsed;
                    this.app.sound.applyPreferences(parsed.preferences);
                    this.saveProfile(parsed);
                    return parsed;
                }
            }
        } catch (err) {
            console.warn("Could not read spooky_player_profile:", err);
        }

        // Legacy storage migration
        const legacyProgress = this.getLegacyProgress();
        const hasLegacyData = Boolean(
            localStorage.getItem("halloween_progress_v2") ||
            localStorage.getItem("halloween_progress_v1") ||
            localStorage.getItem("halloween_music_volume") ||
            localStorage.getItem("halloween_muted")
        );

        let defaultMusicVol = parseFloat(localStorage.getItem("halloween_music_volume") || "0.25");
        if (!Number.isFinite(defaultMusicVol) || defaultMusicVol < 0) defaultMusicVol = 0.25;
        let defaultSfxVol = parseFloat(localStorage.getItem("halloween_sfx_volume") || "0.60");
        if (!Number.isFinite(defaultSfxVol) || defaultSfxVol < 0) defaultSfxVol = 0.60;
        const isMuted = localStorage.getItem("halloween_muted") === "true";
        const isReducedMotion = localStorage.getItem("halloween_reduced_motion") === "true";
        const isVibration = localStorage.getItem("halloween_vibration") !== "false";

        const newProfile = {
            profile_version: 1,
            player_id: generateUuid(),
            nickname: "Ghost Hunter",
            avatar_id: "pumpkin_hunter",
            diamonds: 50,
            boosters: { hint: 1, time_extension: 1, double_points: 0, shield: 0 },
            cosmetics_unlocked: ["pumpkin_hunter", "ghost"],
            campaign: {
                completed_stages: {},
                claimed_stage_rewards: {},
                claimed_chapter_rewards: {},
            },
            claimed_community_goals: {},
            diamond_ledger: [
                { timestamp: new Date().toISOString(), amount: 50, reason: "Welcome Hunter Bounty", refId: "welcome" }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            stats: {
                games_played: legacyProgress.games_played || 0,
                total_answered: legacyProgress.total_answered || 0,
                total_correct: legacyProgress.total_correct || 0,
                best_score: legacyProgress.best_score || 0,
                best_streak: legacyProgress.best_streak || 0,
                preferred_mode: "classic",
            },
            preferences: {
                music_enabled: !isMuted,
                music_volume: Number.isFinite(defaultMusicVol) ? defaultMusicVol : 0.25,
                music_track: "haunted_mansion",
                sfx_enabled: !isMuted,
                sfx_volume: Number.isFinite(defaultSfxVol) ? defaultSfxVol : 0.60,
                reduced_motion: isReducedMotion,
                vibration: isVibration,
                theme: "default",
            },
        };

        this.profile = newProfile;
        this.app.profile = newProfile;
        this.app.sound.applyPreferences(newProfile.preferences);

        if (hasLegacyData) {
            this.saveProfile(newProfile);
        } else {
            this.app.openOnboarding?.();
        }

        return newProfile;
    }

    getLegacyProgress() {
        try {
            const p2 = JSON.parse(localStorage.getItem("halloween_progress_v2") || "null");
            if (p2) return p2;
            const p1 = JSON.parse(localStorage.getItem("halloween_progress_v1") || "null");
            if (p1) return p1;
        } catch (_) {}
        return { mastery: {}, achievements: {} };
    }

    saveProfile(profile) {
        this.profile = profile || this.profile;
        this.app.profile = this.profile;
        this.profile.updated_at = new Date().toISOString();
        try {
            localStorage.setItem("spooky_player_profile", JSON.stringify(this.profile));
            localStorage.setItem("halloween_music_volume", this.profile.preferences.music_volume.toString());
            localStorage.setItem("halloween_sfx_volume", this.profile.preferences.sfx_volume.toString());
            localStorage.setItem("halloween_muted", (!this.profile.preferences.sfx_enabled).toString());
            localStorage.setItem("halloween_reduced_motion", this.profile.preferences.reduced_motion.toString());
            localStorage.setItem("halloween_vibration", this.profile.preferences.vibration.toString());
        } catch (err) {
            console.warn("Failed to persist player profile:", err);
        }
    }

    updateNickname(newName) {
        if (!this.profile) return;
        this.profile.nickname = (newName || "Ghost Hunter").trim();
        this.saveProfile();
        this.app.renderLobbyExperience?.();
    }

    updateAvatar(avatarId) {
        if (!this.profile) return;
        this.profile.avatar_id = avatarId;
        this.saveProfile();
        this.app.renderLobbyExperience?.();
    }

    getDiamonds() {
        return this.profile?.diamonds || 0;
    }

    addDiamonds(amount, reason, refId = null, soundKey = null) {
        if (!this.profile) return false;
        const pts = Math.max(0, parseInt(amount, 10) || 0);
        if (pts <= 0) return false;

        this.profile.diamonds = (this.profile.diamonds || 0) + pts;
        this.profile.diamond_ledger.unshift({
            timestamp: new Date().toISOString(),
            amount: pts,
            reason: reason || "Bounty Claimed",
            refId: refId || null,
        });
        if (this.profile.diamond_ledger.length > 50) {
            this.profile.diamond_ledger.pop();
        }

        this.saveProfile();
        if (soundKey) {
            this.app.sound.play(soundKey);
        } else {
            this.app.sound.play("diamond_earned");
        }

        this.app.showToast("Diamonds Earned!", `+${pts} 💎 (${reason})`, "💎");
        this.app.renderLobbyExperience?.();
        return true;
    }

    spendDiamonds(amount, reason, refId = null) {
        if (!this.profile) return false;
        const pts = Math.max(0, parseInt(amount, 10) || 0);
        if ((this.profile.diamonds || 0) < pts) return false;

        this.profile.diamonds -= pts;
        this.profile.diamond_ledger.unshift({
            timestamp: new Date().toISOString(),
            amount: -pts,
            reason: reason || "Market Purchase",
            refId: refId || null,
        });
        if (this.profile.diamond_ledger.length > 50) {
            this.profile.diamond_ledger.pop();
        }

        this.saveProfile();
        this.app.renderLobbyExperience?.();
        return true;
    }

    isPremium() {
        return this.entitlements?.tier === "pass" || this.entitlements?.tier === "vip";
    }

    async fetchEntitlements(devTier = null) {
        try {
            const playerId = this.profile?.player_id || "player_default";
            let url = `/api/entitlements?player_id=${encodeURIComponent(playerId)}`;
            if (devTier) {
                url += `&tier=${encodeURIComponent(devTier)}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                this.entitlements = await res.json();
                this.app.entitlements = this.entitlements;
            }
        } catch (_) {}
    }

    recordGameScore(summary) {
        if (!this.profile) return;
        const stats = this.profile.stats;
        stats.games_played = (stats.games_played || 0) + 1;
        stats.total_answered = (stats.total_answered || 0) + (summary.total_questions || 0);
        stats.total_correct = (stats.total_correct || 0) + (summary.correct_answers || 0);
        stats.best_score = Math.max(stats.best_score || 0, summary.final_score || 0);
        stats.best_streak = Math.max(stats.best_streak || 0, summary.max_streak || 0);

        this.saveProfile();
    }
}
