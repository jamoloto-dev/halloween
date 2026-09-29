/**
 * 🎃 Spooky Master (Halloween Quiz) - Lobby Experience Module
 * Coordinates the returning player identity card, live diamond balance badges,
 * dynamic stage progression preview, Spooky Guide hints, and daily UTC countdown.
 */

import {
    getMasteryTier,
    escapeHtml,
    PREDEFINED_AVATARS,
    SPOOKY_GUIDE_HINTS
} from "./utils.js";

export class LobbyManager {
    constructor(app) {
        this.app = app;
        this.dailyInterval = null;
    }

    get dom() {
        return this.app.dom;
    }

    get profile() {
        return this.app.profile;
    }

    initDailyCountdown() {
        if (this.dailyInterval) clearInterval(this.dailyInterval);
        const updateCountdown = () => {
            if (!this.dom.dailyBadgeCountdown) return;
            const now = new Date();
            const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
            const diff = tomorrow - now;
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            this.dom.dailyBadgeCountdown.textContent = `Resets in ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        };
        updateCountdown();
        this.dailyInterval = setInterval(updateCountdown, 1000);
    }

    renderLobbyExperience() {
        if (!this.profile) return;
        const avatar = this.app.getAvatarById(this.profile.avatar_id);

        if (this.dom.lobbyAvatarImg) {
            this.dom.lobbyAvatarImg.src = avatar.asset;
            this.dom.lobbyAvatarImg.alt = avatar.name;
        }
        if (this.dom.lobbyPlayerName) {
            this.dom.lobbyPlayerName.textContent = this.profile.nickname || "Ghost Hunter";
        }
        const overallAccuracy = this.profile.stats?.total_answered > 0
            ? Math.round((this.profile.stats.total_correct / this.profile.stats.total_answered) * 100)
            : 0;
        const tier = getMasteryTier(overallAccuracy);
        if (this.dom.lobbyPlayerTier) {
            this.dom.lobbyPlayerTier.textContent = `${tier.title} ${tier.icon}`;
        }
        if (this.dom.lobbyDiamondCount) {
            this.dom.lobbyDiamondCount.textContent = this.app.getDiamonds();
        }

        const progress = this.app.getCurrentCampaignProgress();
        if (this.dom.lobbyJourneyHeading) {
            this.dom.lobbyJourneyHeading.textContent = progress.isNew ? "BEGIN YOUR JOURNEY" : "CONTINUE YOUR JOURNEY";
        }
        if (this.dom.btnLobbyContinueJourney) {
            const btnSpan = this.dom.btnLobbyContinueJourney.querySelector("span");
            if (btnSpan) {
                btnSpan.textContent = progress.isNew ? "🗺️ Begin Journey" : "🗺️ Continue Journey";
            }
        }
        if (progress.chapter) {
            if (this.dom.lobbyJourneyIcon) {
                this.dom.lobbyJourneyIcon.textContent = progress.chapter.icon || "🏚️";
            }
            if (this.dom.lobbyJourneyChapter) {
                this.dom.lobbyJourneyChapter.textContent = `Chapter ${progress.chapter.chapter_number}: ${progress.chapter.title}`;
            }
        }
        if (progress.activeStage) {
            if (this.dom.lobbyJourneyStage) {
                this.dom.lobbyJourneyStage.textContent = `Stage ${progress.activeStage.stage_number} — ${progress.activeStage.title}`;
            }
        }
        if (this.dom.lobbyJourneyBarFill) {
            this.dom.lobbyJourneyBarFill.style.width = `${progress.percent}%`;
        }
        if (this.dom.lobbyJourneyProgressText) {
            this.dom.lobbyJourneyProgressText.textContent = `${progress.completedInChapter} / ${progress.totalInChapter} Stages Cleared (${progress.percent}%)`;
        }

        if (this.dom.lobbyAvatarCarousel) {
            this.dom.lobbyAvatarCarousel.innerHTML = "";
            const baseAvatars = PREDEFINED_AVATARS.filter((av) => !av.is_premium);
            baseAvatars.forEach((av, idx) => {
                const isSelected = av.id === this.profile.avatar_id;
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = `lobby-avatar-dock-orb ${isSelected ? "selected" : ""}`;
                btn.setAttribute("role", "radio");
                btn.setAttribute("aria-checked", isSelected ? "true" : "false");
                btn.setAttribute("aria-label", `Switch guise to ${av.name}`);
                btn.title = `${av.name} (${av.desc})`;
                btn.style.animationDelay = `${(idx * 0.18).toFixed(2)}s`;
                btn.innerHTML = `
                    <img src="${av.asset}" alt="${av.name}" width="34" height="34" class="dock-avatar-img">
                    <span class="dock-avatar-label">${av.name.split(" ")[0]}</span>
                `;
                btn.addEventListener("click", () => {
                    this.app.updateAvatar(av.id);
                });
                this.dom.lobbyAvatarCarousel.appendChild(btn);
            });
        }

        const completedStages = (this.profile && this.profile.campaign && this.profile.campaign.completed_stages) || {};
        this.renderDynamicStageMap(progress.stages, progress.activeStage?.id, completedStages);

        if (this.dom.lobbyStatGames) {
            this.dom.lobbyStatGames.textContent = this.profile.stats?.games_played || 0;
        }
        if (this.dom.lobbyStatStreak) {
            this.dom.lobbyStatStreak.textContent = this.profile.stats?.best_streak || 0;
        }
        const unlockedBadges = Object.keys(this.profile.achievements || {}).filter((k) => Boolean(this.profile.achievements[k])).length;
        if (this.dom.lobbyStatBadges) {
            this.dom.lobbyStatBadges.textContent = `${unlockedBadges}/8`;
        }
        if (this.dom.lobbyStatMastery) {
            this.dom.lobbyStatMastery.textContent = `${overallAccuracy}%`;
        }

        if (this.dom.lobbyGuideQuote && !this.app.guideHintInitialized) {
            this.app.guideHintInitialized = true;
            this.dom.lobbyGuideQuote.textContent = `"${SPOOKY_GUIDE_HINTS[this.app.guideHintIndex]}"`;
        }
    }

    renderDynamicStageMap(stages, activeStageId, completedStages) {
        if (!this.dom.lobbyStageProgressionMap) return;
        this.dom.lobbyStageProgressionMap.innerHTML = "";

        if (!stages || stages.length === 0) return;

        stages.forEach((st) => {
            const isCompleted = Boolean(completedStages[st.id]);
            const isActive = st.id === activeStageId;
            let isUnlocked = true;
            if (st.unlock_requirement && !completedStages[st.unlock_requirement]) {
                isUnlocked = false;
            }

            const stars = (completedStages[st.id] && completedStages[st.id].stars) || 0;
            const starIcons = stars === 3 ? "⭐⭐⭐" : stars === 2 ? "⭐⭐" : stars === 1 ? "⭐" : "✓";

            const node = document.createElement("button");
            node.type = "button";
            node.className = `lobby-stage-node ${isCompleted ? "completed" : ""} ${isActive ? "active-node" : ""} ${!isUnlocked ? "locked-node" : ""}`;
            node.setAttribute("data-stage-id", st.id);
            node.setAttribute("aria-label", `Stage ${st.stage_number}: ${st.title}. ${isActive ? "You are here" : isCompleted ? "Completed" : isUnlocked ? "Unlocked" : "Locked"}`);

            let statusBadgeHtml = "";
            if (isActive) {
                statusBadgeHtml = `<span class="stage-here-badge"><span class="ghost-float" aria-hidden="true">👻</span> YOU ARE HERE</span>`;
            } else if (isCompleted) {
                statusBadgeHtml = `<span class="stage-done-badge">${starIcons}</span>`;
            } else if (!isUnlocked) {
                statusBadgeHtml = `<span class="stage-lock-badge">🔒 Locked</span>`;
            }

            node.innerHTML = `
                <div class="stage-node-orb" aria-hidden="true">
                    <span class="stage-orb-glyph">${isCompleted ? "✓" : isUnlocked ? st.stage_number : "🔒"}</span>
                </div>
                <div class="stage-node-info">
                    <div class="stage-node-title-row">
                        <strong class="stage-node-name">${escapeHtml(st.title)}</strong>
                        ${statusBadgeHtml}
                    </div>
                    <span class="stage-node-sub">${st.stage_type === "boss" ? "💀 Boss Trial" : `${st.question_count} Questions · ${st.difficulty}`}</span>
                </div>
            `;

            node.addEventListener("click", () => {
                this.app.openCampaign();
                this.app.selectStage(st);
            });

            this.dom.lobbyStageProgressionMap.appendChild(node);
        });
    }

    handleLobbyContinueJourney() {
        const progress = this.app.getCurrentCampaignProgress();
        this.app.openCampaign();
        if (progress.activeStage) {
            this.app.selectStage(progress.activeStage);
        }
    }

    async cycleSpookyGuideHint() {
        if (!this.dom.lobbyGuideQuote) return;
        this.dom.lobbyGuideQuote.classList.add("hint-fade");
        this.app.guideHintIndex = (this.app.guideHintIndex + 1) % SPOOKY_GUIDE_HINTS.length;
        const localHint = SPOOKY_GUIDE_HINTS[this.app.guideHintIndex];

        // Immediate responsive update within 50ms
        setTimeout(() => {
            if (this.dom.lobbyGuideQuote) {
                this.dom.lobbyGuideQuote.textContent = `"${localHint}"`;
                this.dom.lobbyGuideQuote.classList.remove("hint-fade");
            }
        }, 50);

        try {
            const res = await fetch("/api/ai/hint", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Player-ID": this.profile?.player_id || "guest_default",
                },
                body: JSON.stringify({
                    session_id: "lobby",
                    hint_level: 1,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.hint && this.dom.lobbyGuideQuote) {
                    this.dom.lobbyGuideQuote.textContent = `"${data.hint}"`;
                }
            }
        } catch (_) {
            // Graceful offline fallback already displayed
        }
    }

    nextSpookyGuideHint() {
        return this.cycleSpookyGuideHint();
    }
}
