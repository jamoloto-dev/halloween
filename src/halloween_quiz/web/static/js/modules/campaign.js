/**
 * 🎃 Spooky Master (Halloween Quiz) - The Haunted Journey (Campaign Module)
 * Manages campaign chapter progression, stages trail rendering, boss trials,
 * chapter lore storytelling modal, and campaign game launching.
 */

import { escapeHtml } from "./utils.js";

export class CampaignManager {
    constructor(app) {
        this.app = app;
        this.chapters = [];
        this.activeChapterId = "chapter_1";
        this.selectedStageId = "stage_1_1";
    }

    get dom() {
        return this.app.dom;
    }

    get profile() {
        return this.app.profile;
    }

    async loadCampaignData() {
        try {
            const res = await fetch("/api/campaign/chapters");
            if (!res.ok) return;
            const data = await res.json();
            this.chapters = data.chapters || [];
            this.app.campaignChapters = this.chapters; // sync reference
            this.renderChapterTabs();
            this.renderChapterStages(this.activeChapterId);
            this.app.renderLobbyExperience?.();
        } catch (err) {
            console.warn("Campaign load warning:", err);
        }
    }

    openCampaign() {
        this.app.closeAllModals();
        this.dom.modalCampaign?.classList.remove("hidden");
        if (!this.chapters || this.chapters.length === 0) {
            this.loadCampaignData();
        } else {
            this.renderChapterTabs();
            this.renderChapterStages(this.activeChapterId);
        }
    }

    closeCampaign() {
        this.dom.modalCampaign?.classList.add("hidden");
    }

    renderChapterTabs() {
        if (!this.dom.campaignChapterTabs) return;
        this.dom.campaignChapterTabs.innerHTML = "";

        let totalStars = 0;
        const completedStages = (this.profile && this.profile.campaign && this.profile.campaign.completed_stages) || {};
        Object.values(completedStages).forEach((s) => {
            totalStars += s.stars || 0;
        });
        if (this.dom.campaignStarsCount) {
            this.dom.campaignStarsCount.textContent = totalStars;
        }

        this.chapters.forEach((ch, idx) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `tab-btn ${ch.id === this.activeChapterId ? "active" : ""}`;

            // Progression unlock check: Ch 1 unlocked. Ch N requires Ch N-1 boss completed
            let isProgressionUnlocked = idx === 0;
            if (idx > 0 && this.chapters[idx - 1]) {
                const prevBossId = this.chapters[idx - 1].stages.find((s) => s.stage_type === "boss")?.id;
                if (prevBossId && completedStages[prevBossId]) {
                    isProgressionUnlocked = true;
                }
            }

            const isPremiumLocked = (ch.chapter_number > 3 || idx >= 3) && !this.app.isPremium();
            const lockText = isPremiumLocked ? " 🔒 PASS" : !isProgressionUnlocked ? " 🔒" : "";

            btn.innerHTML = `${ch.icon} Ch ${ch.chapter_number}${lockText}`;
            btn.addEventListener("click", () => {
                if (isPremiumLocked) {
                    this.app.openPremiumModal();
                    return;
                }
                if (!isProgressionUnlocked) {
                    this.app.showToast("Chapter Locked", "Conquer the previous chapter's Boss Trial first!", "🔒");
                    return;
                }
                this.activeChapterId = ch.id;
                this.app.activeChapterId = ch.id;
                this.renderChapterTabs();
                this.renderChapterStages(ch.id);
            });
            this.dom.campaignChapterTabs.appendChild(btn);
        });
    }

    renderChapterStages(chapterId) {
        const ch = this.chapters.find((c) => c.id === chapterId) || this.chapters[0];
        if (!ch) return;

        if (this.dom.chapterIcon) this.dom.chapterIcon.textContent = ch.icon;
        if (this.dom.chapterTitle) this.dom.chapterTitle.textContent = ch.title;
        if (this.dom.chapterSubtitle) this.dom.chapterSubtitle.textContent = ch.subtitle;
        if (this.dom.chapterDesc) this.dom.chapterDesc.textContent = ch.description;

        if (!this.dom.stagesTrailList) return;
        this.dom.stagesTrailList.innerHTML = "";

        const isPremiumLocked = (ch.chapter_number > 3 || this.chapters.indexOf(ch) >= 3) && !this.app.isPremium();
        if (isPremiumLocked) {
            const banner = document.createElement("div");
            banner.className = "premium-chapter-lock-banner";
            banner.innerHTML = `
                <div class="banner-icon">🎃</div>
                <div class="banner-content">
                    <h4>Spooky Master Pass Required</h4>
                    <p>Chapters 4, 5 & 6 are premium expansions. Unlock 18 additional stages, boss trials, and cosmetic rewards permanently.</p>
                    <button type="button" class="btn-cta btn-sm" id="btn-chapter-unlock-pass">Unlock Pass ($4.99)</button>
                </div>
            `;
            banner.querySelector("#btn-chapter-unlock-pass")?.addEventListener("click", () => {
                this.app.openPremiumModal();
            });
            this.dom.stagesTrailList.appendChild(banner);
            if (this.dom.stageDetailPanel) this.dom.stageDetailPanel.classList.add("hidden");
            return;
        }

        const completedStages = (this.profile && this.profile.campaign && this.profile.campaign.completed_stages) || {};

        ch.stages.forEach((st) => {
            const node = document.createElement("button");
            node.type = "button";
            node.className = "stage-node-card";
            node.setAttribute("data-stage-id", st.id);

            const isCompleted = Boolean(completedStages[st.id]);
            const stars = (completedStages[st.id] && completedStages[st.id].stars) || 0;
            let isUnlocked = true;
            if (st.unlock_requirement && !completedStages[st.unlock_requirement]) {
                isUnlocked = false;
            }

            if (isCompleted) node.classList.add("completed");
            if (!isUnlocked) node.classList.add("locked");
            if (st.id === this.selectedStageId) node.classList.add("selected");

            const starIcons = stars === 3 ? "⭐⭐⭐" : stars === 2 ? "⭐⭐" : stars === 1 ? "⭐" : "";

            node.innerHTML = `
                <div class="stage-node-num">${isUnlocked ? st.stage_number : "🔒"}</div>
                <div class="stage-node-info">
                    <strong>${escapeHtml(st.title)}</strong>
                    <small>${st.stage_type === "boss" ? "💀 Boss Trial" : `${st.question_count} Questions · ${st.difficulty}`}</small>
                </div>
                <div class="stage-node-stars">${isCompleted ? starIcons : `💎 ${st.reward_diamonds}`}</div>
            `;

            if (isUnlocked) {
                node.addEventListener("click", () => this.selectStage(st));
            }

            this.dom.stagesTrailList.appendChild(node);
        });

        // Pre-select first available stage in chapter
        const firstAvailable = ch.stages.find((s) => !s.unlock_requirement || completedStages[s.unlock_requirement]) || ch.stages[0];
        if (firstAvailable) this.selectStage(firstAvailable);
    }

    selectStage(stage) {
        this.selectedStageId = stage.id;
        this.app.selectedStageId = stage.id;
        const completedStages = (this.profile && this.profile.campaign && this.profile.campaign.completed_stages) || {};
        const stars = (completedStages[stage.id] && completedStages[stage.id].stars) || 0;

        if (this.dom.stageDetailPanel) this.dom.stageDetailPanel.classList.remove("hidden");
        if (this.dom.stageDetailTitle) this.dom.stageDetailTitle.textContent = `${stage.title} (${stage.stage_type.toUpperCase()})`;
        if (this.dom.stageDetailDiff) this.dom.stageDetailDiff.textContent = stage.difficulty.toUpperCase();
        if (this.dom.stageDetailDesc) this.dom.stageDetailDesc.textContent = stage.description;
        if (this.dom.stageDetailQcount) this.dom.stageDetailQcount.textContent = stage.question_count;
        if (this.dom.stageDetailReward) this.dom.stageDetailReward.textContent = `💎 ${stage.reward_diamonds}`;
        if (this.dom.stageDetailStars) {
            this.dom.stageDetailStars.textContent = stars > 0 ? `${stars} ⭐` : "Unconquered";
        }

        // Highlight in DOM
        this.dom.stagesTrailList?.querySelectorAll(".stage-node-card").forEach((btn) => {
            btn.classList.remove("selected");
        });
        const selectedBtn = this.dom.stagesTrailList?.querySelector(`[data-stage-id="${stage.id}"]`);
        if (selectedBtn) selectedBtn.classList.add("selected");
    }

    startStageGame(stageId) {
        const ch = this.chapters.find((c) => c.stages.some((s) => s.id === stageId));
        if (ch && (ch.chapter_number > 3 || this.chapters.indexOf(ch) >= 3) && !this.app.isPremium()) {
            this.app.openPremiumModal();
            return;
        }
        this.closeCampaign();
        this.app.currentStageId = stageId;
        this.app.gameMode = "campaign";
        this.app.startGameWithParams({ stage_id: stageId, mode: "campaign" });
    }

    openChapterStory() {
        this.openStory(this.activeChapterId);
    }

    openStory(chapterId) {
        const targetId = chapterId || this.activeChapterId;
        const ch = this.chapters.find((c) => c.id === targetId) || this.chapters[0];
        if (!ch) return;
        if (this.dom.storyEmblem) this.dom.storyEmblem.textContent = ch.icon;
        if (this.dom.storyChapterTitle) this.dom.storyChapterTitle.textContent = `${ch.title} — Lore`;
        if (this.dom.storyText) this.dom.storyText.textContent = ch.story_intro;
        this.dom.modalChapterStory?.classList.remove("hidden");
    }

    closeStory() {
        this.dom.modalChapterStory?.classList.add("hidden");
    }

    getCurrentCampaignProgress() {
        const completedStages = (this.profile && this.profile.campaign && this.profile.campaign.completed_stages) || {};
        let totalStars = 0;
        let stagesBeaten = 0;
        Object.values(completedStages).forEach((s) => {
            totalStars += s.stars || 0;
            if (s.completed) stagesBeaten += 1;
        });

        // 6 chapters * 6 stages = 36 total stages, 108 max stars
        const totalPossibleStages = 36;
        const percent = Math.min(100, Math.round((stagesBeaten / totalPossibleStages) * 100));

        let currentChapterNum = 1;
        if (this.chapters && this.chapters.length > 0) {
            for (let i = 0; i < this.chapters.length; i++) {
                const ch = this.chapters[i];
                const bossStage = ch.stages.find((s) => s.stage_type === "boss");
                if (bossStage && completedStages[bossStage.id]) {
                    currentChapterNum = Math.min(this.chapters.length, i + 2);
                }
            }
        }

        return {
            totalStars,
            stagesBeaten,
            totalPossibleStages,
            percent,
            currentChapterNum,
        };
    }
}
