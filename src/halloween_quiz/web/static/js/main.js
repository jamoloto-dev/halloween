/**
 * 🎃 Spooky Master (Halloween Quiz) - Modular Main Application Entrypoint
 * Coordinates modular subsystems: SoundEngine, CampaignManager, HintsManager,
 * HunterStudioManager, QuizLifecycleManager, ProfileManager, LeaderboardManager,
 * DuelsManager, SettingsManager, PwaManager, Confetti, and progressive haptics.
 */

import {
    CATEGORY_FACTS,
    SPOOKY_GUIDE_HINTS,
    PREDEFINED_AVATARS,
    AVAILABLE_THEMES,
    AVAILABLE_TRACKS,
    ALL_BADGES,
    MASTERY_TIERS,
    COSMETIC_GEAR_SLOTS,
    getMasteryTier,
    generateUuid,
    escapeHtml,
    triggerHaptic,
    generateProceduralStory,
    generateDuelShareLink,
    Confetti
} from "./modules/utils.js";

import { SoundEngine } from "./modules/audio.js";
import { CampaignManager } from "./modules/campaign.js";
import { HintsManager } from "./modules/hints.js";
import { HunterStudioManager } from "./modules/hunter-studio.js";
import { QuizLifecycleManager } from "./modules/quiz.js";
import { ProfileManager } from "./modules/profile.js";
import { LeaderboardManager } from "./modules/leaderboard.js";
import { DuelsManager } from "./modules/duels.js";
import { SettingsManager } from "./modules/settings.js";
import { PwaManager } from "./modules/pwa.js";

export class HalloweenQuizApp {
    constructor() {
        // Core Audio & FX Engines
        this.sound = new SoundEngine();
        this.confetti = new Confetti("confetti-canvas");

        // Game State
        this.sessionId = null;
        this.currentQuestion = null;
        this.nextQuestionData = null;
        this.currentScore = 0;
        this.currentStreak = 0;
        this.timeLimit = 20;
        this.timeRemaining = 20;
        this.timerInterval = null;
        this.lastTickTime = null;
        this.isAnswerPending = false;
        this.isFeedbackActive = false;
        this.isGameOver = false;
        this.selectedAnswerIndex = null;
        this.roundCorrect = 0;
        this.roundAnswered = 0;
        this.gameMode = "classic";
        this.strikesRemaining = 3;
        this.noticeTimer = null;
        this.selectedOnboardingAvatar = "pumpkin_hunter";

        // Expansion State
        this.campaignChapters = [];
        this.activeChapterId = "ch1_abandoned_manor";
        this.selectedStageId = null;
        this.currentStageId = null;
        this.activeDuelCode = null;
        this.isDuelCreator = false;
        this.activeDuelTraps = [];
        this.activeRiddleClip = null;
        this.boosterDoublePointsActive = false;
        this.boosterShieldActive = false;
        this.guideHintIndex = 0;
        this.guideHintInitialized = false;

        // AI Intelligence Layer State
        this.currentHintLevel = 1;
        this.lastSynthesizedAvatar = null;
        this.synthesizedAvatars = [];
        this.hunterStudioOptions = null;
        this.studioSelection = {
            creature: "pumpkin_spirit",
            style: "dark_fantasy",
            color: "purple",
            accessory: "lantern",
        };

        // Leaderboard & Entitlement State
        this.currentLbView = "all";
        this.currentLbDiff = null;
        this.currentLbMode = null;
        this.entitlements = null;

        // Screens
        this.screens = {
            start: document.getElementById("screen-start"),
            quiz: document.getElementById("screen-quiz"),
            gameover: document.getElementById("screen-gameover"),
        };

        // DOM Element Registry
        this.dom = {
            // Setup / Start Form
            formStart: document.getElementById("form-start-quiz"),
            playerName: document.getElementById("player-name"),
            startAvatarImg: document.getElementById("start-avatar-img"),
            btnStartChangeAvatar: document.getElementById("btn-start-change-avatar"),
            categoryPicker: document.getElementById("category-picker"),
            wrapNumQuestions: document.getElementById("wrap-num-questions"),
            numQuestionsSelect: document.getElementById("num-questions"),
            btnSelectAllCats: document.getElementById("btn-select-all-cats"),
            btnClearCats: document.getElementById("btn-clear-cats"),
            dailyBadgeCountdown: document.getElementById("daily-badge-countdown"),

            // Haunted Game Lobby Experience
            btnEnterTheHaunt: document.getElementById("btn-enter-the-haunt"),
            lobbyAvatarImg: document.getElementById("lobby-avatar-img"),
            btnLobbyAvatar: document.getElementById("btn-lobby-avatar"),
            lobbyPlayerName: document.getElementById("lobby-player-name"),
            lobbyPlayerTier: document.getElementById("lobby-player-tier"),
            lobbyDiamondsPill: document.getElementById("lobby-diamonds-pill"),
            lobbyDiamondCount: document.getElementById("lobby-diamond-count"),
            btnLobbyEditProfile: document.getElementById("btn-lobby-edit-profile"),
            lobbyJourneyHeading: document.getElementById("lobby-journey-heading"),
            lobbyJourneyIcon: document.getElementById("lobby-journey-icon"),
            lobbyJourneyChapter: document.getElementById("lobby-journey-chapter"),
            lobbyJourneyStage: document.getElementById("lobby-journey-stage"),
            lobbyJourneyBarFill: document.getElementById("lobby-journey-bar-fill"),
            lobbyJourneyProgressText: document.getElementById("lobby-journey-progress-text"),
            btnLobbyContinueJourney: document.getElementById("btn-lobby-continue-journey"),
            lobbyStageProgressionMap: document.getElementById("lobby-stage-progression-map"),
            btnLobbyQuickPlay: document.getElementById("btn-lobby-quick-play"),
            btnLobbyDailyHaunt: document.getElementById("btn-lobby-daily-haunt"),
            btnLobbyDuels: document.getElementById("btn-lobby-duels"),
            lobbyGuideQuote: document.getElementById("lobby-guide-quote"),
            btnGuideNextHint: document.getElementById("btn-guide-next-hint"),
            lobbyStatGames: document.getElementById("lobby-stat-games"),
            lobbyStatStreak: document.getElementById("lobby-stat-streak"),
            lobbyStatBadges: document.getElementById("lobby-stat-badges"),
            lobbyStatMastery: document.getElementById("lobby-stat-mastery"),
            lobbyAvatarCarousel: document.getElementById("lobby-avatar-carousel"),
            lobbyProgressSnapshot: document.getElementById("lobby-progress-snapshot"),
            btnLobbyProgress: document.getElementById("btn-lobby-progress"),
            btnLobbyLeaderboard: document.getElementById("btn-lobby-leaderboard"),
            btnLobbySettings: document.getElementById("btn-lobby-settings"),

            // In-App Notice & Toasts
            appNotice: document.getElementById("app-notice"),
            appNoticeText: document.getElementById("app-notice-text"),
            btnNoticeDismiss: document.getElementById("btn-notice-dismiss"),
            toastContainer: document.getElementById("toast-container"),

            // Top Navigation Bar
            btnHome: document.getElementById("nav-branding-home"),
            btnPwaInstall: document.getElementById("btn-pwa-install"),
            btnMasteryOpen: document.getElementById("btn-mastery-open"),
            btnLeaderboard: document.getElementById("btn-leaderboard-open"),
            btnSettingsOpen: document.getElementById("btn-settings-open"),
            btnPassNav: document.getElementById("btn-pass-nav"),

            // Modals
            modalLeaderboard: document.getElementById("modal-leaderboard"),
            btnCloseModal: document.getElementById("btn-close-modal"),
            leaderboardTbody: document.getElementById("leaderboard-tbody"),
            leaderboardPbContainer: document.getElementById("leaderboard-pb-container"),
            pbHighScore: document.getElementById("pb-high-score"),
            pbBestStreak: document.getElementById("pb-best-streak"),
            pbTotalGames: document.getElementById("pb-total-games"),
            pbBestAcc: document.getElementById("pb-best-acc"),

            modalSettings: document.getElementById("modal-settings"),
            settingsThemesGrid: document.getElementById("settings-themes-grid"),
            btnCloseSettings: document.getElementById("btn-close-settings"),
            settingsAvatarImg: document.getElementById("settings-avatar-img"),
            settingsPlayerName: document.getElementById("settings-player-name"),
            btnSettingsChangeAvatar: document.getElementById("btn-settings-change-avatar"),
            modalBtnBgmToggle: document.getElementById("modal-btn-bgm-toggle"),
            settingMusicTrack: document.getElementById("setting-music-track"),
            modalMusicSlider: document.getElementById("modal-music-slider"),
            musicVolVal: document.getElementById("music-vol-val"),
            modalBtnSoundToggle: document.getElementById("modal-btn-sound-toggle"),
            modalSfxSlider: document.getElementById("modal-sfx-slider"),
            sfxVolVal: document.getElementById("sfx-vol-val"),
            settingReducedMotion: document.getElementById("setting-reduced-motion"),
            settingVibration: document.getElementById("setting-vibration"),
            btnResetProgress: document.getElementById("btn-reset-progress"),

            modalMastery: document.getElementById("modal-mastery"),
            btnCloseMastery: document.getElementById("btn-close-mastery"),
            dashboardAvatarImg: document.getElementById("dashboard-avatar-img"),
            dashboardPlayerName: document.getElementById("dashboard-player-name"),
            dashboardTierBadge: document.getElementById("dashboard-tier-badge"),
            dashboardPlayerIdText: document.getElementById("dashboard-player-id-text"),
            btnDashboardEditProfile: document.getElementById("btn-dashboard-edit-profile"),
            dashStatGames: document.getElementById("dash-stat-games"),
            dashStatBestScore: document.getElementById("dash-stat-best-score"),
            dashStatBestStreak: document.getElementById("dash-stat-best-streak"),
            dashStatBadges: document.getElementById("dash-stat-badges"),
            badgesUnlockedCount: document.getElementById("badges-unlocked-count"),
            badgesGrid: document.getElementById("badges-grid"),
            masteryGrid: document.getElementById("mastery-grid"),

            modalOnboarding: document.getElementById("modal-onboarding"),
            btnCloseOnboarding: document.getElementById("btn-close-onboarding"),
            onboardingAvatarGrid: document.getElementById("onboarding-avatar-grid"),
            onboardingHunterName: document.getElementById("onboarding-hunter-name"),
            btnSaveOnboarding: document.getElementById("btn-save-onboarding"),
            btnSkipOnboarding: document.getElementById("btn-skip-onboarding"),

            modalAvatarPicker: document.getElementById("modal-avatar-picker"),
            btnCloseAvatarPicker: document.getElementById("btn-close-avatar-picker"),
            sharedAvatarGrid: document.getElementById("shared-avatar-grid"),

            // AI Learning Intelligence Dashboard
            aiLearningCard: document.getElementById("ai-learning-card"),
            aiDashChallengeLevel: document.getElementById("ai-dash-challenge-level"),
            aiStrongestVal: document.getElementById("ai-strongest-val"),
            aiWeakestVal: document.getElementById("ai-weakest-val"),
            aiGuidanceText: document.getElementById("ai-guidance-text"),

            // Supernatural Hunter Studio
            tabAvatarPredefined: document.getElementById("tab-avatar-predefined"),
            tabAvatarGenerator: document.getElementById("tab-avatar-generator"),
            pickerPredefinedBody: document.getElementById("picker-predefined-body"),
            pickerGeneratorBody: document.getElementById("picker-generator-body"),
            studioCreaturesGrid: document.getElementById("studio-creatures-grid"),
            studioStylesGrid: document.getElementById("studio-styles-grid"),
            studioColorsGrid: document.getElementById("studio-colors-grid"),
            studioAccessoriesGrid: document.getElementById("studio-accessories-grid"),
            studioFlairInput: document.getElementById("studio-flair-input"),
            btnGenerateHunter: document.getElementById("btn-generate-hunter"),
            studioStatusMsg: document.getElementById("studio-status-msg"),
            hunterPreviewImg: document.getElementById("hunter-preview-img"),
            hunterPreviewName: document.getElementById("hunter-preview-name"),
            hunterPreviewStyle: document.getElementById("hunter-preview-style"),
            btnEquipGeneratedHunter: document.getElementById("btn-equip-generated-hunter"),
            hunterGalleryGrid: document.getElementById("hunter-gallery-grid"),

            // Conversational Spooky Guide & Adaptive HUD
            btnAskSpookyGuide: document.getElementById("btn-ask-spooky-guide"),
            adaptiveChallengeBanner: document.getElementById("adaptive-challenge-banner"),
            adaptiveBannerIcon: document.getElementById("adaptive-banner-icon"),
            adaptiveBannerText: document.getElementById("adaptive-banner-text"),
            quizSpookyGuideBox: document.getElementById("quiz-spooky-guide-box"),
            quizGuideCharacterName: document.getElementById("quiz-guide-character-name"),
            quizGuideLevelBadge: document.getElementById("quiz-guide-level-badge"),
            btnQuizGuideDeeper: document.getElementById("btn-quiz-guide-deeper"),
            btnCloseGuideBubble: document.getElementById("btn-close-guide-bubble"),
            quizGuideHintText: document.getElementById("quiz-guide-hint-text"),
            feedbackAdaptiveBox: document.getElementById("feedback-adaptive-box"),
            feedbackAdaptiveBadge: document.getElementById("feedback-adaptive-badge"),
            feedbackAdaptiveText: document.getElementById("feedback-adaptive-text"),

            // Quiz HUD & Options
            qCounter: document.getElementById("q-counter"),
            qCategoryBadge: document.getElementById("q-category-badge"),
            qModeBadge: document.getElementById("q-mode-badge"),
            hudStrikes: document.getElementById("hud-strikes"),
            strikeIcons: document.getElementById("strike-icons"),
            streakCount: document.getElementById("streak-count"),
            liveScore: document.getElementById("live-score"),
            timerDisplay: document.getElementById("timer-display"),
            timerBar: document.getElementById("timer-bar"),
            questionText: document.getElementById("question-text"),
            optionsGrid: document.getElementById("options-grid"),

            // Feedback
            feedbackPanel: document.getElementById("feedback-panel"),
            feedbackStatus: document.getElementById("feedback-status"),
            feedbackExplanation: document.getElementById("feedback-explanation"),
            feedbackPoints: document.getElementById("feedback-points"),
            feedbackBonus: document.getElementById("feedback-bonus"),
            feedbackAchievement: document.getElementById("feedback-achievement"),
            feedbackFunfactBox: document.getElementById("feedback-funfact-box"),
            feedbackFunfact: document.getElementById("feedback-funfact"),
            btnNextQuestion: document.getElementById("btn-next-question"),

            // Game Over & Review
            statFinalScore: document.getElementById("stat-final-score"),
            statAccuracy: document.getElementById("stat-accuracy"),
            statCorrect: document.getElementById("stat-correct"),
            statMaxStreak: document.getElementById("stat-max-streak"),
            reviewList: document.getElementById("review-list"),
            btnShareResult: document.getElementById("btn-share-result"),
            shareFeedback: document.getElementById("share-feedback"),
            survivalShareCard: document.getElementById("survival-share-card"),
            shareCardAvatar: document.getElementById("share-card-avatar"),
            shareCardHunterName: document.getElementById("share-card-hunter-name"),
            shareCardTierBadge: document.getElementById("share-card-tier-badge"),
            shareCardScore: document.getElementById("share-card-score"),
            shareCardAcc: document.getElementById("share-card-acc"),
            shareCardStreak: document.getElementById("share-card-streak"),
            shareCardModeBadge: document.getElementById("share-card-mode-badge"),
            btnPlayAgain: document.getElementById("btn-play-again"),
            btnViewBoardFinish: document.getElementById("btn-view-board-finish"),
            btnViewMasteryFinish: document.getElementById("btn-view-mastery-finish"),

            // Diamond Economy & Top Nav
            btnMarketOpen: document.getElementById("btn-market-open"),
            headerDiamondCount: document.getElementById("header-diamond-count"),
            btnCampaignNav: document.getElementById("btn-campaign-nav"),
            btnDuelsNav: document.getElementById("btn-duels-nav"),

            // Community Haunt
            btnHeroJourney: document.getElementById("btn-hero-journey"),
            commProgressBar: document.getElementById("comm-progress-bar"),
            commProgressStats: document.getElementById("comm-progress-stats"),
            commGoalTitle: document.getElementById("comm-goal-title"),
            commPlayersCount: document.getElementById("comm-players-count"),
            commCountdownTimer: document.getElementById("comm-countdown-timer"),
            btnClaimCommunity: document.getElementById("btn-claim-community"),

            // Boosters HUD & Audio Riddles & Traps
            boosterHudBar: document.getElementById("booster-hud-bar"),
            boosterHint: document.getElementById("booster-hint"),
            boosterTime: document.getElementById("booster-time"),
            boosterDouble: document.getElementById("booster-double"),
            boosterShield: document.getElementById("booster-shield"),
            countBoosterHint: document.getElementById("count-booster-hint"),
            countBoosterTime: document.getElementById("count-booster-time"),
            countBoosterDouble: document.getElementById("count-booster-double"),
            countBoosterShield: document.getElementById("count-booster-shield"),
            audioRiddlePanel: document.getElementById("audio-riddle-panel"),
            audioWaveVisualizer: document.getElementById("audio-wave-visualizer"),
            btnPlayRiddleClip: document.getElementById("btn-play-riddle-clip"),
            btnToggleTranscript: document.getElementById("btn-toggle-transcript"),
            riddleTranscriptBox: document.getElementById("riddle-accessible-transcript"),
            riddleTranscriptText: document.getElementById("riddle-transcript-text"),
            duelTrapBanner: document.getElementById("duel-trap-banner"),
            duelTrapIcon: document.getElementById("duel-trap-icon"),
            duelTrapText: document.getElementById("duel-trap-text"),

            // Campaign Modal
            modalCampaign: document.getElementById("modal-campaign"),
            btnCloseCampaign: document.getElementById("btn-close-campaign"),
            campaignChapterTabs: document.getElementById("campaign-chapter-tabs"),
            chapterIcon: document.getElementById("chapter-icon"),
            chapterTitle: document.getElementById("chapter-title"),
            chapterSubtitle: document.getElementById("chapter-subtitle"),
            chapterDesc: document.getElementById("chapter-desc"),
            btnReadChapterStory: document.getElementById("btn-read-chapter-story"),
            stagesTrailList: document.getElementById("stages-trail-list"),
            stageDetailPanel: document.getElementById("stage-detail-panel"),
            stageDetailTitle: document.getElementById("stage-detail-title"),
            stageDetailDiff: document.getElementById("stage-detail-diff"),
            stageDetailDesc: document.getElementById("stage-detail-desc"),
            stageDetailQcount: document.getElementById("stage-detail-qcount"),
            stageDetailReward: document.getElementById("stage-detail-reward"),
            stageDetailStars: document.getElementById("stage-detail-stars"),
            btnStartStage: document.getElementById("btn-start-stage"),
            campaignStarsCount: document.getElementById("campaign-stars-count"),

            // Story Modal
            modalChapterStory: document.getElementById("modal-chapter-story"),
            btnCloseStory: document.getElementById("btn-close-story"),
            btnCloseStorySecondary: document.getElementById("btn-close-story-secondary"),
            storyEmblem: document.getElementById("story-emblem"),
            storyChapterTitle: document.getElementById("story-chapter-title"),
            storyText: document.getElementById("story-text"),
            btnEnterChapterFromStory: document.getElementById("btn-enter-chapter-from-story"),

            // Market / Shop Modal
            modalShop: document.getElementById("modal-shop"),
            btnCloseShop: document.getElementById("btn-close-shop"),
            shopDiamondBalance: document.getElementById("shop-diamond-balance"),
            tabShopBoosters: document.getElementById("tab-shop-boosters"),
            tabShopCosmetics: document.getElementById("tab-shop-cosmetics"),
            shopBoostersPanel: document.getElementById("shop-boosters-panel"),
            shopCosmeticsPanel: document.getElementById("shop-cosmetics-panel"),

            // Duels Modal
            modalDuels: document.getElementById("modal-duels"),
            btnCloseDuels: document.getElementById("btn-close-duels"),
            tabDuelCreate: document.getElementById("tab-duel-create"),
            tabDuelJoin: document.getElementById("tab-duel-join"),
            duelCreatePanel: document.getElementById("duel-create-panel"),
            duelJoinPanel: document.getElementById("duel-join-panel"),
            formCreateDuel: document.getElementById("form-create-duel"),
            duelShareCard: document.getElementById("duel-share-card"),
            displayDuelCode: document.getElementById("display-duel-code"),
            btnCopyDuelCode: document.getElementById("btn-copy-duel-code"),
            btnPlayCreatedDuel: document.getElementById("btn-play-created-duel"),
            formJoinDuel: document.getElementById("form-join-duel"),
            inputJoinDuelCode: document.getElementById("input-join-duel-code"),
            duelInspectCard: document.getElementById("duel-inspect-card"),
            btnAcceptAndPlayDuel: document.getElementById("btn-accept-and-play-duel"),

            // Spooky Master Pass & Premium Modal
            modalPremium: document.getElementById("modal-premium"),
            btnClosePremium: document.getElementById("btn-close-premium"),
            btnPurchasePass: document.getElementById("btn-purchase-pass"),
            btnSubscribeVip: document.getElementById("btn-subscribe-vip"),
            btnRestorePurchases: document.getElementById("btn-restore-purchases"),
            btnDevTogglePass: document.getElementById("btn-dev-toggle-pass"),
            premiumCurrentTierText: document.getElementById("premium-current-tier-text"),
        };

        // Subsystem Managers
        this.campaignMgr = new CampaignManager(this);
        this.hintsMgr = new HintsManager(this);
        this.hunterStudioMgr = new HunterStudioManager(this);
        this.quizMgr = new QuizLifecycleManager(this);
        this.profileMgr = new ProfileManager(this);
        this.leaderboardMgr = new LeaderboardManager(this);
        this.duelsMgr = new DuelsManager(this);
        this.settingsMgr = new SettingsManager(this);
        this.pwaMgr = new PwaManager(this);

        // Initialize Player Profile & Data
        this.profile = this.initPlayerProfile();
        this.loadSynthesizedAvatars();

        this.initEvents();
        this.initPwa();
        this.initDailyCountdown();
        this.sound.onBgmStateChange = () => this.syncSettingsUi();
        this.loadCategories();
        this.applyProfileToUi();
        this.applyTheme();
        this.fetchEntitlements();
        this.renderThemesGrid();
        this.updateDiamondDisplays();
        this.updateBoosterHud();
        this.purgeObsoleteCaches();
        this.fetchCommunityStats();
        this.loadCampaignData();
    }

    // ==========================================
    // UTILITIES & NOTICES
    // ==========================================
    escapeHtml(str) {
        return escapeHtml(str);
    }

    showNotice(message, type = "warning", duration = 5000) {
        if (!this.dom.appNotice || !this.dom.appNoticeText) return;
        this.dom.appNoticeText.textContent = message;
        this.dom.appNotice.className = `app-notice ${type}`;
        this.dom.appNotice.classList.remove("hidden");
        if (this.noticeTimer) clearTimeout(this.noticeTimer);
        if (duration > 0) {
            this.noticeTimer = setTimeout(() => this.hideNotice(), duration);
        }
    }

    hideNotice() {
        if (this.dom.appNotice) this.dom.appNotice.classList.add("hidden");
        if (this.noticeTimer) clearTimeout(this.noticeTimer);
    }

    showToast(title, message, icon = "🎃", duration = 3800) {
        if (!this.dom.toastContainer) return;
        const toast = document.createElement("div");
        toast.className = "spooky-toast";
        toast.setAttribute("role", "status");
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <div class="toast-body">
                <strong>${this.escapeHtml(title)}</strong>
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
        this.dom.toastContainer.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add("visible"));
        setTimeout(() => {
            toast.classList.remove("visible");
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    vibrate(pattern) {
        if (!this.profile?.preferences?.vibration) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
            document.documentElement.classList.contains("reduced-motion")) {
            return;
        }
        if (navigator.vibrate) navigator.vibrate(pattern);
    }

    closeAllModals() {
        this.closeLeaderboard();
        this.closeSettings();
        this.closeMastery();
        this.closeAvatarPicker();
        this.closeOnboarding();
        this.closeCampaign();
        this.closeStory();
        this.closeShop();
        this.closeDuels();
        this.closePremiumModal();
    }

    openHome() {
        this.closeAllModals();
        this.showScreen("start");
        this.sound.startBackgroundAmbience();
        this.renderLobbyExperience();
    }

    showScreen(screenName) {
        Object.entries(this.screens).forEach(([name, screen]) => {
            if (!screen) return;
            if (name === screenName) {
                screen.classList.add("active");
                screen.classList.remove("hidden");
            } else {
                screen.classList.remove("active");
                screen.classList.add("hidden");
            }
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async purgeObsoleteCaches() {
        if ("caches" in window) {
            try {
                const currentCache = "spooky-master-v2.3.0";
                const keys = await caches.keys();
                for (const key of keys) {
                    if (key !== currentCache) {
                        await caches.delete(key);
                    }
                }
            } catch (_) {}
        }
    }

    // ==========================================
    // PROFILE & ECONOMY DELEGATION
    // ==========================================
    initPlayerProfile() {
        return this.profileMgr.loadProfile();
    }

    getLegacyProgress() {
        return this.profileMgr.getLegacyProgress();
    }

    saveProfile(profile) {
        this.profileMgr.saveProfile(profile);
    }

    getDiamonds() {
        return this.profile?.diamonds || 0;
    }

    addDiamonds(amount, reason, refId = null, soundKey = null) {
        if (!this.profile) return false;
        const pts = Math.max(0, parseInt(amount, 10) || 0);
        if (pts <= 0) return false;
        this.profile.diamonds = (this.profile.diamonds || 0) + pts;
        if (!this.profile.diamond_ledger) this.profile.diamond_ledger = [];
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
        this.updateDiamondDisplays();
        if (soundKey) this.sound.play(soundKey);
        this.showToast(`+${pts} 💎`, reason, "💎");
        return true;
    }

    spendDiamonds(amount, reason) {
        if (!this.profile) return false;
        const pts = Math.max(0, parseInt(amount, 10) || 0);
        if (this.getDiamonds() < pts) {
            this.showToast("Not Enough Diamonds!", "Earn more in the Haunted Journey and Community Haunt.", "💎");
            return false;
        }
        this.profile.diamonds -= pts;
        if (!this.profile.diamond_ledger) this.profile.diamond_ledger = [];
        this.profile.diamond_ledger.unshift({
            timestamp: new Date().toISOString(),
            amount: -pts,
            reason: reason || "Market Purchase",
            refId: null,
        });
        if (this.profile.diamond_ledger.length > 50) {
            this.profile.diamond_ledger.pop();
        }
        this.saveProfile();
        this.updateDiamondDisplays();
        return true;
    }

    updateDiamondDisplays() {
        const balance = this.getDiamonds();
        if (this.dom.headerDiamondCount) this.dom.headerDiamondCount.textContent = balance;
        if (this.dom.shopDiamondBalance) this.dom.shopDiamondBalance.textContent = balance;
        if (this.dom.lobbyDiamondCount) this.dom.lobbyDiamondCount.textContent = balance;
    }

    updateBoosterHud() {
        if (!this.profile) return;
        const boosters = this.profile.boosters || { hint: 0, time_extension: 0, double_points: 0, shield: 0 };
        if (this.dom.countBoosterHint) this.dom.countBoosterHint.textContent = boosters.hint || 0;
        if (this.dom.countBoosterTime) this.dom.countBoosterTime.textContent = boosters.time_extension || 0;
        if (this.dom.countBoosterDouble) this.dom.countBoosterDouble.textContent = boosters.double_points || 0;
        if (this.dom.countBoosterShield) this.dom.countBoosterShield.textContent = boosters.shield || 0;

        const shopHint = document.getElementById("shop-owned-hint");
        const shopTime = document.getElementById("shop-owned-time");
        const shopDouble = document.getElementById("shop-owned-double");
        const shopShield = document.getElementById("shop-owned-shield");
        if (shopHint) shopHint.textContent = boosters.hint || 0;
        if (shopTime) shopTime.textContent = boosters.time_extension || 0;
        if (shopDouble) shopDouble.textContent = boosters.double_points || 0;
        if (shopShield) shopShield.textContent = boosters.shield || 0;

        // Sync cosmetic unlock states in market
        const unlockedCosmetics = this.profile.cosmetics_unlocked || ["pumpkin_hunter", "ghost"];
        ["vampire", "werewolf", "witch", "zombie"].forEach((id) => {
            const statusEl = document.getElementById(`status-cosmetic-${id}`);
            const btnEl = document.querySelector(`.btn-buy-cosmetic[data-id="${id}"]`);
            if (unlockedCosmetics.includes(id)) {
                if (statusEl) statusEl.textContent = this.profile.avatar_id === id ? "Equipped" : "Unlocked";
                if (btnEl) btnEl.textContent = this.profile.avatar_id === id ? "Active" : "Equip";
            } else {
                if (statusEl) statusEl.textContent = "Locked";
                if (btnEl) btnEl.textContent = "Unlock";
            }
        });
    }

    updateAvatar(avatarId) {
        if (!this.profile) return;
        this.profile.avatar_id = avatarId;
        this.saveProfile();
        const avatar = this.getAvatarById(avatarId);
        this.applyProfileToUi();
        this.showToast("Avatar Changed", `Selected ${avatar.name}`, avatar.icon || "✨");
    }

    updateNickname(name) {
        const sanitized = (name || "").trim().substring(0, 30);
        if (!sanitized || !this.profile) return;
        this.profile.nickname = sanitized;
        this.saveProfile();
        this.applyProfileToUi();
    }

    applyProfileToUi() {
        if (!this.profile) return;
        const avatar = this.getAvatarById(this.profile.avatar_id);

        if (this.dom.playerName) this.dom.playerName.value = this.profile.nickname;
        if (this.dom.startAvatarImg) {
            this.dom.startAvatarImg.src = avatar.asset;
            this.dom.startAvatarImg.alt = avatar.name;
        }

        if (this.dom.settingsPlayerName) this.dom.settingsPlayerName.value = this.profile.nickname;
        if (this.dom.settingsAvatarImg) {
            this.dom.settingsAvatarImg.src = avatar.asset;
            this.dom.settingsAvatarImg.alt = avatar.name;
        }

        if (this.dom.dashboardPlayerName) this.dom.dashboardPlayerName.textContent = this.profile.nickname;
        if (this.dom.dashboardAvatarImg) {
            this.dom.dashboardAvatarImg.src = avatar.asset;
            this.dom.dashboardAvatarImg.alt = avatar.name;
        }
        if (this.dom.dashboardPlayerIdText && this.profile.player_id) {
            this.dom.dashboardPlayerIdText.textContent = this.profile.player_id.substring(0, 8);
        }

        document.documentElement.classList.toggle("reduced-motion", Boolean(this.profile.preferences?.reduced_motion));

        this.syncSettingsUi();
        this.renderLobbyExperience();
    }

    loadSynthesizedAvatars() {
        try {
            const stored = localStorage.getItem("spooky_hunter_avatars_v1");
            if (stored) {
                this.synthesizedAvatars = JSON.parse(stored);
            }
        } catch (_) {
            this.synthesizedAvatars = [];
        }
    }

    saveSynthesizedAvatars() {
        try {
            localStorage.setItem("spooky_hunter_avatars_v1", JSON.stringify(this.synthesizedAvatars));
        } catch (_) {}
    }

    getAvatarById(avatarId) {
        if (!avatarId) return PREDEFINED_AVATARS[0];
        const pre = PREDEFINED_AVATARS.find((a) => a.id === avatarId);
        if (pre) return pre;
        if (this.synthesizedAvatars && this.synthesizedAvatars.length > 0) {
            const gen = this.synthesizedAvatars.find((a) => (a.id === avatarId || a.avatar_id === avatarId));
            if (gen) {
                return {
                    id: gen.id || gen.avatar_id,
                    name: gen.name || "Supernatural Hunter",
                    icon: "✨",
                    asset: gen.asset_url || gen.asset || `/static/avatars/generated/${avatarId}.svg`,
                    desc: `${gen.style || ""} ${gen.creature || "Hunter"}`.trim(),
                    is_premium: false,
                };
            }
        }
        if (typeof avatarId === "string" && (avatarId.startsWith("hunter_") || avatarId.startsWith("gen_"))) {
            return {
                id: avatarId,
                name: "Supernatural Hunter",
                icon: "✨",
                asset: `/static/avatars/generated/${avatarId}.svg`,
                desc: "Synthesized AI Hunter",
                is_premium: false,
            };
        }
        return PREDEFINED_AVATARS[0];
    }

    // ==========================================
    // CATEGORIES & GAME SETUP
    // ==========================================
    async loadCategories() {
        const renderCategoryCards = (categories) => {
            if (!this.dom.categoryPicker || !Array.isArray(categories)) return false;
            this.dom.categoryPicker.innerHTML = "";
            const progress = this.getProgress();
            categories.forEach((cat) => {
                const mastery = progress.mastery[cat.id];
                const masteryPct = mastery && mastery.answered > 0
                    ? Math.round((mastery.correct / mastery.answered) * 100)
                    : 0;
                const tier = getMasteryTier(masteryPct);
                const masteryLabel = mastery && mastery.answered > 0
                    ? `${tier.icon} ${masteryPct}% (${tier.title})`
                    : "New Trail";

                const card = document.createElement("label");
                card.className = "category-card category-chip selected";
                card.setAttribute("role", "checkbox");
                card.setAttribute("aria-checked", "true");
                card.setAttribute("tabindex", "0");
                card.innerHTML = `
                    <input type="checkbox" name="categories" value="${cat.id}" checked>
                    <div class="card-inner">
                        <div class="card-top-row">
                            <span class="cat-icon">${cat.icon}</span>
                            <span class="cat-check-badge" aria-hidden="true">✓</span>
                        </div>
                        <div class="card-text-body">
                            <strong class="cat-name">${cat.name}</strong>
                            <div class="cat-meta-row">
                                <span class="cat-qcount">${cat.question_count} Qs</span>
                                <span class="cat-mastery-tag">${masteryLabel}</span>
                            </div>
                            <div class="cat-progress-track">
                                <div class="cat-progress-bar" style="width: ${masteryPct}%;"></div>
                            </div>
                        </div>
                    </div>
                `;

                const input = card.querySelector("input[type='checkbox']");
                const checkBadge = card.querySelector(".cat-check-badge");

                const syncCardState = () => {
                    const isChecked = input.checked;
                    card.classList.toggle("selected", isChecked);
                    card.setAttribute("aria-checked", isChecked ? "true" : "false");
                    if (checkBadge) checkBadge.textContent = isChecked ? "✓" : "○";
                };

                input.addEventListener("change", () => {
                    syncCardState();
                    this.sound.play("category_select");
                });

                // Keyboard accessible toggling
                card.addEventListener("keydown", (e) => {
                    if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        input.checked = !input.checked;
                        syncCardState();
                        input.dispatchEvent(new Event("change"));
                    }
                });

                this.dom.categoryPicker.appendChild(card);
            });
            return true;
        };

        if (window.__HALLOWEEN_CATEGORY_FALLBACK__) {
            renderCategoryCards(window.__HALLOWEEN_CATEGORY_FALLBACK__);
        }
        try {
            const res = await fetch("/api/categories");
            if (res.ok) {
                const data = await res.json();
                renderCategoryCards(data.categories || data);
            }
        } catch (_) {}
    }

    setAllCategories(checked) {
        const checkboxes = document.querySelectorAll("input[name='categories']");
        checkboxes.forEach((cb) => {
            cb.checked = checked;
            const card = cb.closest(".category-card");
            if (card) {
                card.classList.toggle("selected", checked);
                card.setAttribute("aria-checked", checked ? "true" : "false");
                const badge = card.querySelector(".cat-check-badge");
                if (badge) badge.textContent = checked ? "✓" : "○";
            }
        });
        this.sound.play("category_select");
    }

    onModeChange(mode) {
        this.gameMode = mode;
        if (this.dom.wrapNumQuestions) {
            this.dom.wrapNumQuestions.style.display = (mode === "endless" || mode === "daily") ? "none" : "block";
        }
    }

    initDailyCountdown() {
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
        setInterval(updateCountdown, 1000);
    }

    // ==========================================
    // LOBBY EXPERIENCE
    // ==========================================
    renderLobbyExperience() {
        if (!this.profile) return;
        const avatar = this.getAvatarById(this.profile.avatar_id);

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
            this.dom.lobbyDiamondCount.textContent = this.getDiamonds();
        }

        const progress = this.getCurrentCampaignProgress();
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
                    this.updateAvatar(av.id);
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

        if (this.dom.lobbyGuideQuote && !this.guideHintInitialized) {
            this.guideHintInitialized = true;
            this.dom.lobbyGuideQuote.textContent = `"${SPOOKY_GUIDE_HINTS[this.guideHintIndex]}"`;
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
                        <strong class="stage-node-name">${this.escapeHtml(st.title)}</strong>
                        ${statusBadgeHtml}
                    </div>
                    <span class="stage-node-sub">${st.stage_type === "boss" ? "💀 Boss Trial" : `${st.question_count} Questions · ${st.difficulty}`}</span>
                </div>
            `;

            node.addEventListener("click", () => {
                this.openCampaign();
                this.selectStage(st);
            });

            this.dom.lobbyStageProgressionMap.appendChild(node);
        });
    }

    handleLobbyContinueJourney() {
        const progress = this.getCurrentCampaignProgress();
        this.openCampaign();
        if (progress.activeStage) {
            this.selectStage(progress.activeStage);
        }
    }

    // ==========================================
    // ONBOARDING
    // ==========================================
    openOnboarding() {
        this.closeAllModals();
        this.dom.modalOnboarding?.classList.remove("hidden");
    }

    closeOnboarding() {
        this.dom.modalOnboarding?.classList.add("hidden");
    }

    renderOnboardingAvatarGrid() {
        if (!this.dom.onboardingAvatarGrid) return;
        this.dom.onboardingAvatarGrid.innerHTML = "";
        const baseAvatars = PREDEFINED_AVATARS.filter((av) => !av.is_premium);
        baseAvatars.forEach((avatar) => {
            const isSelected = avatar.id === this.selectedOnboardingAvatar;
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
                this.selectedOnboardingAvatar = avatar.id;
                this.renderOnboardingAvatarGrid();
            });
            this.dom.onboardingAvatarGrid.appendChild(btn);
        });
    }

    completeOnboarding() {
        const name = (this.dom.onboardingHunterName?.value || "Ghost Hunter").trim();
        this.updateNickname(name || "Ghost Hunter");
        this.updateAvatar(this.selectedOnboardingAvatar || "pumpkin_hunter");
        this.profile.onboarding_completed = true;
        this.saveProfile();
        this.closeOnboarding();
        this.sound.play("achievement");
        this.showToast("Welcome Hunter!", "Your profile is forged. The crypt awaits.", "🎃");
    }

    // ==========================================
    // HUNTER STUDIO & AVATAR PICKER
    // ==========================================
    openAvatarPicker() {
        this.hunterStudioMgr.openAvatarPicker();
    }

    closeAvatarPicker() {
        this.hunterStudioMgr.closeAvatarPicker();
    }

    switchAvatarTab(tabName) {
        this.hunterStudioMgr.switchAvatarTab(tabName);
    }

    renderStudioPills() {
        this.hunterStudioMgr.renderStudioPills();
    }

    updateStudioPreview() {
        this.hunterStudioMgr.updateStudioPreview();
    }

    generateHunterAvatar() {
        return this.hunterStudioMgr.generateHunterAvatar();
    }

    equipGeneratedHunter() {
        this.hunterStudioMgr.equipGeneratedHunter();
    }

    fetchPlayerGeneratedAvatars() {
        return this.hunterStudioMgr.fetchPlayerGeneratedAvatars();
    }

    renderHunterGallery() {
        this.hunterStudioMgr.renderHunterGallery();
    }

    // ==========================================
    // SPOOKY GUIDE HINTS
    // ==========================================
    requestSpookyGuideHint(level = 1) {
        return this.hintsMgr.requestSpookyGuideHint(level);
    }

    async cycleSpookyGuideHint() {
        if (!this.dom.lobbyGuideQuote) return;
        this.dom.lobbyGuideQuote.classList.add("hint-fade");

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
                if (data && data.hint) {
                    setTimeout(() => {
                        if (this.dom.lobbyGuideQuote) {
                            this.dom.lobbyGuideQuote.textContent = `"${data.hint}"`;
                            this.dom.lobbyGuideQuote.classList.remove("hint-fade");
                        }
                    }, 180);
                    return;
                }
            }
        } catch (_) {
            // Graceful offline fallback below
        }

        this.guideHintIndex = (this.guideHintIndex + 1) % SPOOKY_GUIDE_HINTS.length;
        setTimeout(() => {
            if (this.dom.lobbyGuideQuote) {
                this.dom.lobbyGuideQuote.textContent = `"${SPOOKY_GUIDE_HINTS[this.guideHintIndex]}"`;
                this.dom.lobbyGuideQuote.classList.remove("hint-fade");
            }
        }, 180);
    }

    // ==========================================
    // QUIZ GAMEPLAY & LIFECYCLE
    // ==========================================
    startGame() {
        return this.quizMgr.startGame();
    }

    startGameWithParams(extraParams = {}) {
        return this.quizMgr.startGameWithParams(extraParams);
    }

    renderQuestion(qView) {
        this.quizMgr.renderQuestion(qView);
    }

    updateStrikesUi() {
        this.quizMgr.updateStrikesUi();
    }

    setAnswerButtonsDisabled(disabled) {
        this.quizMgr.setAnswerButtonsDisabled?.(disabled);
    }

    startTimer(seconds) {
        this.quizMgr.startTimer(seconds);
    }

    stopTimer() {
        this.quizMgr.stopTimer();
    }

    updateTimerUi() {
        this.quizMgr.updateTimerUi();
    }

    showAnswerResult(result, selectedAnswer = "") {
        this.quizMgr.showAnswerResult(result, selectedAnswer);
    }

    advanceToNext() {
        this.quizMgr.advanceToNext();
    }

    finishGame() {
        return this.quizMgr.finishGame();
    }

    getProgress() {
        try {
            const saved = JSON.parse(localStorage.getItem("halloween_progress_v2") || "{}");
            return {
                mastery: saved.mastery || {},
                achievements: saved.achievements || {},
            };
        } catch (_) {
            return { mastery: {}, achievements: {} };
        }
    }

    recordProgress(result) {
        const progress = this.getProgress();
        const category = this.currentQuestion?.category || "spooky";
        const mastery = progress.mastery[category] || { answered: 0, correct: 0 };
        mastery.answered += 1;
        if (result.is_correct) mastery.correct += 1;
        progress.mastery[category] = mastery;
        this.roundAnswered += 1;
        if (result.is_correct) this.roundCorrect += 1;

        if (this.profile?.stats) {
            this.profile.stats.total_answered += 1;
            if (result.is_correct) this.profile.stats.total_correct += 1;
            const streak = result.streak !== undefined ? result.streak : (result.current_streak || 0);
            if (streak > this.profile.stats.best_streak) {
                this.profile.stats.best_streak = streak;
            }
        }

        const unlocked = [];
        const unlock = (key, label) => {
            if (!progress.achievements[key]) {
                progress.achievements[key] = true;
                unlocked.push(label);
            }
        };

        const currentStreak = result.streak !== undefined ? result.streak : (result.current_streak || 0);
        if (currentStreak >= 3) unlock("ghost_hunter", "Ghost Hunter");
        if (currentStreak >= 5) unlock("night_stalker", "Night Stalker");
        if (currentStreak >= 10) unlock("possessed", "Possessed");
        if (result.is_game_over && this.roundCorrect === this.roundAnswered) unlock("perfect_round", "Perfect Séance");
        if (result.is_game_over && this.currentQuestion?.difficulty === "hard" && (this.roundCorrect / this.roundAnswered) >= 0.7) {
            unlock("hard_survivor", "Hard Mode Survivor");
        }
        if (this.gameMode === "endless" && currentStreak >= 10) {
            unlock("endless_slayer", "Endless Slayer");
        }
        if (this.gameMode === "daily" && result.is_game_over) {
            unlock("daily_victor", "Daily Haunt Victor");
        }

        localStorage.setItem("halloween_progress_v2", JSON.stringify(progress));
        this.saveProfile();
        return unlocked;
    }

    playActiveRiddleSound() {
        if (!this.activeRiddleClip) return;
        const viz = this.dom.audioWaveVisualizer;
        viz?.classList.add("animating");
        this.sound.playRiddleClip(this.activeRiddleClip, () => {
            viz?.classList.remove("animating");
        });
    }

    toggleRiddleTranscript() {
        this.dom.riddleTranscriptBox?.classList.toggle("hidden");
    }

    async shareSurvivalCard() {
        const score = this.dom.statFinalScore?.textContent || "0";
        const accuracy = this.dom.statAccuracy?.textContent || "0%";
        const correct = this.dom.statCorrect?.textContent || "0";
        const maxStreak = this.dom.statMaxStreak?.textContent || "0";
        const mode = (this.gameMode || "classic").toUpperCase();
        const hunter = this.profile?.nickname || "Ghost Hunter";

        const shareText = `🎃 Spooky Master Survival Card 🎃\n` +
            `Hunter: ${hunter}\n` +
            `Score: ${score} pts | Accuracy: ${accuracy} (${correct})\n` +
            `Max Streak: ${maxStreak} 🔥 | Mode: ${mode}\n` +
            `Dare to enter the crypt: ${window.location.origin}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Spooky Master Survival Card",
                    text: shareText,
                    url: window.location.origin,
                });
                return;
            } catch (_) {}
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareText);
            if (this.dom.shareFeedback) {
                this.dom.shareFeedback.classList.remove("hidden");
                setTimeout(() => this.dom.shareFeedback.classList.add("hidden"), 3000);
            }
            this.showToast("Survival Card Copied!", "Share with fellow ghost hunters.", "📋");
        }
    }

    // ==========================================
    // BOOSTERS & SHOP
    // ==========================================
    openShop() {
        this.closeAllModals();
        if (this.dom.modalShop) this.dom.modalShop.classList.remove("hidden");
        this.updateDiamondDisplays();
    }

    closeShop() {
        if (this.dom.modalShop) this.dom.modalShop.classList.add("hidden");
    }

    buyBooster(type, price) {
        if (this.spendDiamonds(price, `Purchased ${type} booster`)) {
            if (!this.profile.boosters) this.profile.boosters = {};
            this.profile.boosters[type] = (this.profile.boosters[type] || 0) + 1;
            this.saveProfile();
            this.updateBoosterHud();
            this.sound.play("achievement");
            this.showToast("Booster Acquired!", `Added 1x ${type}`, "🔮");
        }
    }

    buyCosmetic(avatarId, price) {
        if (!this.profile.cosmetics_unlocked) this.profile.cosmetics_unlocked = ["pumpkin_hunter", "ghost"];
        if (this.profile.cosmetics_unlocked.includes(avatarId)) {
            this.updateAvatar(avatarId);
            this.updateBoosterHud();
            return;
        }
        if (this.spendDiamonds(price, `Unlocked ${avatarId} avatar`)) {
            this.profile.cosmetics_unlocked.push(avatarId);
            this.updateAvatar(avatarId);
            this.updateBoosterHud();
            this.sound.play("achievement");
            this.showToast("Cosmetic Unlocked!", `Equipped ${avatarId}`, "🎭");
        }
    }

    async useBooster(type) {
        if (this.gameMode === "daily" || this.gameMode === "duel") {
            this.showToast("Boosters Disabled", "Power-ups cannot be used in ranked or duel modes.", "⚠️");
            return;
        }
        const count = (this.profile?.boosters && this.profile.boosters[type]) || 0;
        if (count <= 0) {
            this.showToast("No Boosters Left", "Visit The Witch's Market to replenish.", "🔮");
            return;
        }
        if (this.isAnswerPending || this.isFeedbackActive || !this.currentQuestion) return;

        try {
            const res = await fetch(`/api/quiz/${this.sessionId}/booster`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ booster_type: type }),
            });
            if (!res.ok) throw new Error("Booster rejected");
            const data = await res.json();

            this.profile.boosters[type] -= 1;
            this.saveProfile();
            this.updateBoosterHud();

            if (type === "hint" && data.eliminated_options) {
                const btns = this.dom.optionsGrid.querySelectorAll(".option-btn");
                btns.forEach((btn) => {
                    const opt = btn.getAttribute("data-answer");
                    if (data.eliminated_options.includes(opt)) {
                        btn.classList.add("option-eliminated");
                        btn.disabled = true;
                    }
                });
                this.showToast("Ghost Whisper", "Eliminated 2 incorrect options", "💡");
            } else if (type === "time_extension") {
                this.timeRemaining += 10;
                this.timeLimit += 10;
                this.updateTimerUi();
                this.showToast("Hourglass Inverted", "+10s countdown extension", "⏳");
            } else if (type === "double_points") {
                this.boosterDoublePointsActive = true;
                this.showToast("Jack-o'-Lantern Surge", "2x points active for this question", "⚡");
            } else if (type === "shield") {
                this.boosterShieldActive = true;
                this.showToast("Spectral Ward", "Streak protected against one wrong answer", "🛡️");
            }

            this.sound.play("booster");
        } catch (err) {
            console.warn("Booster activation error:", err);
        }
    }

    // ==========================================
    // CAMPAIGN (THE HAUNTED JOURNEY)
    // ==========================================
    openCampaign() {
        this.campaignMgr.openCampaign();
    }

    closeCampaign() {
        this.campaignMgr.closeCampaign();
    }

    loadCampaignData() {
        return this.campaignMgr.loadCampaignData();
    }

    renderChapterTabs() {
        this.campaignMgr.renderChapterTabs();
    }

    renderChapterStages(chapterId) {
        this.campaignMgr.renderChapterStages(chapterId);
    }

    selectStage(stage) {
        this.campaignMgr.selectStage(stage);
    }

    startStageGame(stageId) {
        this.campaignMgr.startStageGame(stageId);
    }

    openChapterStory() {
        this.campaignMgr.openChapterStory();
    }

    openStory(chapterId) {
        this.campaignMgr.openStory(chapterId);
    }

    closeStory() {
        this.campaignMgr.closeStory();
    }

    getCurrentCampaignProgress() {
        const completedStages = (this.profile && this.profile.campaign && this.profile.campaign.completed_stages) || {};
        const chapters = this.campaignChapters || [];

        if (!chapters || chapters.length === 0) {
            return {
                chapter: {
                    chapter_number: 1,
                    title: "The Abandoned Manor",
                    icon: "🏚️",
                },
                activeStage: {
                    id: "ch1_s1",
                    stage_number: 1,
                    title: "The Wrought-Iron Gate",
                    stage_type: "standard",
                    question_count: 5,
                    difficulty: "Easy",
                },
                stages: [
                    { id: "ch1_s1", stage_number: 1, title: "The Wrought-Iron Gate", stage_type: "standard", question_count: 5, difficulty: "Easy", unlock_requirement: null },
                    { id: "ch1_s2", stage_number: 2, title: "The Grand Foyer", stage_type: "standard", question_count: 5, difficulty: "Easy", unlock_requirement: "ch1_s1" },
                    { id: "ch1_s3", stage_number: 3, title: "The Cold Library", stage_type: "standard", question_count: 8, difficulty: "Medium", unlock_requirement: "ch1_s2" },
                    { id: "ch1_boss", stage_number: 4, title: "Spirit of Blackwood", stage_type: "boss", question_count: 10, difficulty: "Hard", unlock_requirement: "ch1_s3" },
                ],
                completedInChapter: 0,
                totalInChapter: 4,
                percent: 0,
                isNew: true,
                totalCompleted: 0,
            };
        }

        let totalCompleted = 0;
        Object.values(completedStages).forEach((st) => {
            if (st && (st.stars || st.score)) totalCompleted += 1;
        });

        let currentChapter = chapters[0];
        for (let i = 0; i < chapters.length; i++) {
            const ch = chapters[i];
            const incomplete = ch.stages.some((s) => !completedStages[s.id]);
            if (incomplete) {
                currentChapter = ch;
                break;
            }
            currentChapter = ch;
        }

        const stages = currentChapter.stages || [];
        let completedInChapter = 0;
        stages.forEach((s) => {
            if (completedStages[s.id]) completedInChapter += 1;
        });

        let activeStage = stages[0];
        for (let i = 0; i < stages.length; i++) {
            const s = stages[i];
            if (!completedStages[s.id]) {
                activeStage = s;
                break;
            }
        }

        const totalInChapter = stages.length || 4;
        const percent = totalInChapter > 0 ? Math.round((completedInChapter / totalInChapter) * 100) : 0;

        return {
            chapter: currentChapter,
            activeStage,
            stages,
            completedInChapter,
            totalInChapter,
            percent,
            isNew: totalCompleted === 0,
            totalCompleted,
        };
    }

    // ==========================================
    // HAUNTED DUELS (ASYNC PVP)
    // ==========================================
    openDuels() {
        this.duelsMgr.openDuels();
    }

    closeDuels() {
        this.duelsMgr.closeDuels();
    }

    async handleCreateDuel() {
        const diff = document.getElementById("duel-diff")?.value || document.getElementById("duel-create-diff")?.value || "medium";
        const trapInputs = document.querySelectorAll("input[name='duel_trap']:checked, input[name='duel_traps']:checked");
        const traps = Array.from(trapInputs).map((i) => i.value);

        try {
            const res = await fetch("/api/duels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    creator_id: this.profile?.player_id || "hunter_default",
                    creator_name: this.profile?.nickname || "Ghost Hunter",
                    creator_avatar: this.profile?.avatar_id || "pumpkin_hunter",
                    difficulty: diff,
                    num_questions: 5,
                    traps: traps,
                }),
            });
            if (!res.ok) throw new Error("Failed to create duel");
            const duel = await res.json();
            this.activeDuelCode = duel.duel_code;
            this.activeDuelTraps = duel.traps || [];
            this.isDuelCreator = true;

            if (this.dom.displayDuelCode) this.dom.displayDuelCode.textContent = duel.duel_code;
            this.dom.duelShareCard?.classList.remove("hidden");
            this.sound.play("achievement");
            this.showToast("Challenge Forged!", `Duel Code: ${duel.duel_code}`, "⚔️");
        } catch (err) {
            console.warn("Create duel error:", err);
            this.showNotice(err.message || "Failed to create duel challenge.");
        }
    }

    async handleInspectDuel() {
        const code = (this.dom.inputJoinDuelCode?.value || "").trim().toUpperCase();
        if (!code) return;

        try {
            const res = await fetch(`/api/duels/${encodeURIComponent(code)}`);
            if (!res.ok) {
                this.showToast("Duel Not Found", "Check code and try again.", "⚠️");
                return;
            }
            const duel = await res.json();
            this.activeDuelCode = duel.duel_code;
            this.activeDuelTraps = duel.traps || [];
            this.isDuelCreator = false;

            const creatorEl = document.getElementById("duel-inspect-creator");
            const diffEl = document.getElementById("duel-inspect-diff");
            const trapsEl = document.getElementById("duel-inspect-traps-list");
            if (creatorEl) creatorEl.innerHTML = `Challenger: <strong>${this.escapeHtml(duel.creator_name || duel.creator_nickname)}</strong>`;
            if (diffEl) diffEl.innerHTML = `Difficulty: <strong>${duel.difficulty.toUpperCase()}</strong>`;
            if (trapsEl) trapsEl.textContent = (duel.traps && duel.traps.length > 0) ? duel.traps.join(", ") : "None";

            this.dom.duelInspectCard?.classList.remove("hidden");
            if (this.dom.btnAcceptAndPlayDuel) this.dom.btnAcceptAndPlayDuel.classList.remove("hidden");
        } catch (err) {
            console.warn("Inspect duel error:", err);
            this.showNotice(err.message || "Invalid duel code.");
        }
    }

    async handleAcceptAndPlayDuel() {
        if (!this.activeDuelCode) return;
        try {
            const res = await fetch(`/api/duels/${this.activeDuelCode}/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    challenger_id: this.profile.player_id,
                    challenger_name: this.profile.nickname,
                    challenger_avatar: this.profile.avatar_id,
                }),
            });
            if (res.ok) {
                this.closeDuels();
                this.startDuelGame(this.activeDuelCode, false);
            }
        } catch (err) {
            console.warn("Accept duel error:", err);
        }
    }

    startDuelGame(duelCode, isCreator) {
        this.activeDuelCode = duelCode;
        this.isDuelCreator = isCreator;
        this.gameMode = "duel";
        this.startGameWithParams({ duel_code: duelCode, mode: "duel" });
    }

    // ==========================================
    // LEADERBOARD
    // ==========================================
    openLeaderboard() {
        this.leaderboardMgr.openLeaderboard();
    }

    closeLeaderboard() {
        this.leaderboardMgr.closeLeaderboard();
    }

    fetchLeaderboard(difficulty = null, mode = null) {
        return this.leaderboardMgr.fetchLeaderboard(difficulty || "all", mode || "classic", this.currentLbView || "daily");
    }

    renderLeaderboard(scores) {
        this.leaderboardMgr.renderLeaderboard(scores);
    }

    // ==========================================
    // SETTINGS & CUSTOMIZATION
    // ==========================================
    openSettings() {
        this.settingsMgr.openSettings();
    }

    closeSettings() {
        this.settingsMgr.closeSettings();
    }

    syncSettingsUi() {
        this.settingsMgr.syncSettingsUi();
    }

    renderThemesGrid() {
        const grid = this.dom.settingsThemesGrid;
        if (!grid) return;
        grid.innerHTML = "";
        const activeTheme = this.profile?.preferences?.theme || "default";

        AVAILABLE_THEMES.forEach((theme) => {
            const isCurrent = theme.id === activeTheme;
            const isLocked = theme.is_premium && !this.isPremium();
            const card = document.createElement("button");
            card.type = "button";
            card.className = `theme-select-card ${isCurrent ? "active" : ""} ${isLocked ? "theme-locked" : ""}`;
            card.setAttribute("role", "radio");
            card.setAttribute("aria-checked", isCurrent ? "true" : "false");
            card.innerHTML = `
                <div class="theme-card-icon">${theme.icon}</div>
                <div class="theme-card-body">
                    <strong class="theme-card-name">${this.escapeHtml(theme.name)}</strong>
                    <small class="theme-card-desc">${this.escapeHtml(theme.desc)}</small>
                </div>
                ${isLocked ? `<span class="theme-lock-badge">🔒 PASS</span>` : ""}
            `;
            card.addEventListener("click", () => {
                if (isLocked) {
                    this.openPremiumModal();
                    return;
                }
                this.setTheme(theme.id);
            });
            grid.appendChild(card);
        });
    }

    setTheme(themeId) {
        if (!this.profile.preferences) this.profile.preferences = {};
        this.profile.preferences.theme = themeId;
        this.saveProfile();
        this.applyTheme(themeId);
        this.renderThemesGrid();
        this.showToast("Atmosphere Set", `Theme changed to ${themeId.replace("_", " ")}`, "🎨");
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

    resetProgressData() {
        this.settingsMgr.resetProgressData();
    }

    // ==========================================
    // MASTERY & LOCAL AI INSIGHTS
    // ==========================================
    openMastery() {
        this.closeAllModals();
        if (this.dom.modalMastery) this.dom.modalMastery.classList.remove("hidden");
        this.renderMasteryModal();
    }

    closeMastery() {
        if (this.dom.modalMastery) this.dom.modalMastery.classList.add("hidden");
    }

    renderMasteryModal() {
        if (!this.profile) return;
        const currentAvatar = this.getAvatarById(this.profile.avatar_id);
        const overallAccuracy = this.profile.stats?.total_answered > 0
            ? Math.round((this.profile.stats.total_correct / this.profile.stats.total_answered) * 100)
            : 0;
        const tier = getMasteryTier(overallAccuracy);

        if (this.dom.dashboardAvatarImg) this.dom.dashboardAvatarImg.src = currentAvatar.asset;
        if (this.dom.dashboardPlayerName) this.dom.dashboardPlayerName.textContent = this.profile.nickname;
        if (this.dom.dashboardTierBadge) this.dom.dashboardTierBadge.textContent = `${tier.title} ${tier.icon}`;
        if (this.dom.dashboardPlayerIdText) this.dom.dashboardPlayerIdText.textContent = `ID: ${this.profile.player_id}`;
        if (this.dom.dashStatGames) this.dom.dashStatGames.textContent = this.profile.stats?.games_played || 0;
        if (this.dom.dashStatBestScore) this.dom.dashStatBestScore.textContent = this.profile.stats?.best_score || 0;
        if (this.dom.dashStatBestStreak) this.dom.dashStatBestStreak.textContent = this.profile.stats?.best_streak || 0;

        const progress = this.getProgress();
        const unlockedCount = Object.keys(progress.achievements || {}).filter(k => Boolean(progress.achievements[k])).length;
        if (this.dom.dashStatBadges) this.dom.dashStatBadges.textContent = `${unlockedCount}/8`;
        if (this.dom.badgesUnlockedCount) this.dom.badgesUnlockedCount.textContent = `${unlockedCount}/8 Unlocked`;

        // Render Badges
        if (this.dom.badgesGrid) {
            this.dom.badgesGrid.innerHTML = "";
            ALL_BADGES.forEach((b) => {
                const isEarned = Boolean(progress.achievements[b.id]);
                const badgeEl = document.createElement("div");
                badgeEl.className = `badge-item ${isEarned ? "earned" : "locked"}`;
                badgeEl.innerHTML = `
                    <div class="badge-icon">${b.icon}</div>
                    <div class="badge-title">${this.escapeHtml(b.name)}</div>
                    <small class="badge-desc">${this.escapeHtml(b.desc)}</small>
                `;
                this.dom.badgesGrid.appendChild(badgeEl);
            });
        }

        // Render Category Masteries
        if (this.dom.masteryGrid) {
            this.dom.masteryGrid.innerHTML = "";
            const categories = [
                { id: "spooky", name: "Spooky Stories", icon: "👻" },
                { id: "costumes", name: "Costumes & Legends", icon: "🧙‍♀️" },
                { id: "movies", name: "Horror Movies", icon: "🎬" },
                { id: "history", name: "Halloween History", icon: "🕯️" },
                { id: "candy", name: "Candy & Treats", icon: "🍬" },
                { id: "paranormal", name: "Paranormal & Lore", icon: "🔮" },
            ];

            categories.forEach((cat) => {
                const m = progress.mastery[cat.id] || { answered: 0, correct: 0 };
                const pct = m.answered > 0 ? Math.round((m.correct / m.answered) * 100) : 0;
                const catTier = getMasteryTier(pct);

                const el = document.createElement("div");
                el.className = "mastery-item";
                el.innerHTML = `
                    <div class="mastery-header">
                        <span class="mastery-name">${cat.icon} ${cat.name}</span>
                        <span class="mastery-tier">${catTier.icon} ${catTier.title} (${pct}%)</span>
                    </div>
                    <div class="mastery-bar-wrap">
                        <div class="mastery-bar" style="width: ${pct}%;"></div>
                    </div>
                    <div class="mastery-stats">
                        <span>Accuracy: ${pct}%</span>
                        <span>${m.correct}/${m.answered} answered</span>
                    </div>
                `;
                this.dom.masteryGrid.appendChild(el);
            });
        }

        this.renderLocalAiInsights();
    }

    renderLocalAiInsights() {
        const progress = this.getProgress();
        let weakestCat = "None";
        let weakestAcc = 100;
        let strongestCat = "None";
        let strongestAcc = 0;

        Object.entries(CATEGORY_FACTS).forEach(([catKey]) => {
            const m = progress.mastery[catKey] || { answered: 0, correct: 0 };
            if (m.answered >= 3) {
                const acc = Math.round((m.correct / m.answered) * 100);
                if (acc < weakestAcc) {
                    weakestAcc = acc;
                    weakestCat = catKey;
                }
                if (acc > strongestAcc) {
                    strongestAcc = acc;
                    strongestCat = catKey;
                }
            }
        });

        if (this.dom.aiStrongestVal) {
            this.dom.aiStrongestVal.textContent = strongestCat !== "None" ? `${this.formatCategoryName(strongestCat)} (${strongestAcc}%)` : "Need 3+ questions";
        }
        if (this.dom.aiWeakestVal) {
            this.dom.aiWeakestVal.textContent = weakestCat !== "None" ? `${this.formatCategoryName(weakestCat)} (${weakestAcc}%)` : "Need 3+ questions";
        }
        if (this.dom.aiGuidanceText) {
            if (weakestCat !== "None" && weakestAcc < 60) {
                this.dom.aiGuidanceText.textContent = `The Crypt Keeper suggests focusing on ${this.formatCategoryName(weakestCat)} to strengthen your spiritual defenses.`;
            } else {
                this.dom.aiGuidanceText.textContent = "Your supernatural instincts are well balanced across the ethereal realms.";
            }
        }
    }

    formatCategoryName(catKey) {
        const map = {
            spooky: "👻 Spooky Stories",
            costumes: "🎭 Costumes & Traditions",
            movies: "🎬 Horror Movies",
            history: "📜 Halloween History",
            candy: "🍬 Candy & Treats",
            paranormal: "🔮 Paranormal Lore",
        };
        return map[catKey] || catKey.toUpperCase();
    }

    // ==========================================
    // MONETIZATION & ENTITLEMENTS
    // ==========================================
    isPremium() {
        return Boolean(this.entitlements && this.entitlements.is_premium);
    }

    syncEntitlementsUi() {
        if (!this.entitlements) return;

        // Dev mode button in premium modal
        if (this.dom.btnDevTogglePass) {
            if (this.entitlements.dev_mode_active) {
                this.dom.btnDevTogglePass.classList.remove("hidden");
                const isVip = this.entitlements.tier === "haunted_vip";
                const isPass = this.entitlements.tier === "spooky_pass";
                this.dom.btnDevTogglePass.textContent = isVip
                    ? "⚡ Dev Pass: VIP (Click to Reset Free)"
                    : isPass
                    ? "⚡ Dev Pass: Pass (Click for VIP)"
                    : "⚡ Toggle Dev Pass (Test Mode)";
            } else {
                this.dom.btnDevTogglePass.classList.add("hidden");
            }
        }

        // Top Nav Pass Button
        if (this.dom.btnPassNav) {
            if (this.entitlements.tier === "haunted_vip") {
                this.dom.btnPassNav.textContent = "👑 VIP";
                this.dom.btnPassNav.classList.add("nav-pass-active");
            } else if (this.entitlements.is_premium) {
                this.dom.btnPassNav.textContent = "🎃 Pass Active";
                this.dom.btnPassNav.classList.add("nav-pass-active");
            } else {
                this.dom.btnPassNav.textContent = "🎃 Pass";
                this.dom.btnPassNav.classList.remove("nav-pass-active");
            }
        }

        // Status indicator in modal footer
        if (this.dom.premiumCurrentTierText) {
            if (this.entitlements.tier === "haunted_vip") {
                this.dom.premiumCurrentTierText.textContent = "Haunted VIP Pass 👑";
            } else if (this.entitlements.is_premium) {
                this.dom.premiumCurrentTierText.textContent = "Spooky Master Pass 🎃";
            } else {
                this.dom.premiumCurrentTierText.textContent = "Free Adventurer";
            }
        }

        this.renderThemesGrid();
        if (this.campaignChapters && this.campaignChapters.length > 0) {
            this.renderChapterTabs();
        }
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
                this.syncEntitlementsUi();
            }
        } catch (err) {
            console.warn("Failed to fetch entitlements:", err);
        }
    }

    openPremiumModal() {
        this.closeAllModals();
        if (this.dom.modalPremium) this.dom.modalPremium.classList.remove("hidden");
        this.syncEntitlementsUi();
    }

    closePremiumModal() {
        if (this.dom.modalPremium) this.dom.modalPremium.classList.add("hidden");
    }

    async handlePurchasePass() {
        if (this.entitlements?.dev_override_active) {
            await this.fetchEntitlements("spooky_pass");
            this.showToast("Spooky Pass Activated!", "Test purchase completed in local dev mode.", "🎃");
        } else {
            this.showNotice("Payment Gateway Status: Live billing provider is not configured. The $4.99 price is a proposed configuration SKU. In local development, enable DEV_PREMIUM_MODE in .env for instant testing.");
            this.showToast("Proposed Pricing", "Live checkout is not enabled in this environment.", "💳");
        }
    }

    async handleSubscribeVip() {
        if (this.entitlements?.dev_override_active) {
            await this.fetchEntitlements("haunted_vip");
            this.showToast("Haunted VIP Active!", "Test VIP subscription enabled in local dev mode.", "👑");
        } else {
            this.showNotice("Subscription Gateway Status: Recurring billing provider is not configured. The $2.99/mo rate is a proposed configuration SKU. In local development, enable DEV_PREMIUM_MODE in .env for instant testing.");
            this.showToast("Proposed Pricing", "Live recurring billing is not enabled in this environment.", "👑");
        }
    }

    async handleRestorePurchases() {
        try {
            const res = await fetch("/api/entitlements/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ player_id: this.profile?.player_id || "player_default" }),
            });
            if (res.ok) {
                const data = await res.json();
                await this.fetchEntitlements();
                this.showToast("Restore Purchases", data.message, data.restored ? "✨" : "ℹ️");
            }
        } catch (e) {
            this.showToast("Restore Failed", "Could not verify purchase status with the server.", "⚠️");
        }
    }

    async handleDevTogglePass() {
        if (!this.entitlements?.dev_mode_active) return;
        const currentTier = this.entitlements.tier;
        let nextTier = "spooky_pass";
        if (currentTier === "spooky_pass") nextTier = "haunted_vip";
        else if (currentTier === "haunted_vip") nextTier = "free";
        await this.fetchEntitlements(nextTier);
        this.showToast("Dev Mode Changed", `Entitlement set to: ${nextTier}`, "⚡");
    }

    // ==========================================
    // COMMUNITY HAUNT GOALS
    // ==========================================
    async fetchCommunityStats() {
        try {
            const res = await fetch("/api/community");
            if (!res.ok) return;
            const data = await res.json();

            if (this.dom.commPlayersCount) {
                this.dom.commPlayersCount.textContent = `${data.players_entered} Hunters Entered Today`;
            }

            if (data.goal) {
                if (this.dom.commGoalTitle) this.dom.commGoalTitle.textContent = data.goal.title;
                const pct = Math.min(100, Math.round((data.goal.current_count / Math.max(1, data.goal.target_count)) * 100));
                if (this.dom.commProgressBar) this.dom.commProgressBar.style.width = `${pct}%`;
                if (this.dom.commProgressStats) {
                    this.dom.commProgressStats.textContent = `${data.goal.current_count.toLocaleString()} / ${data.goal.target_count.toLocaleString()} Questions (${pct}%)`;
                }

                const claimedGoals = (this.profile && this.profile.claimed_community_goals) || {};
                const isClaimed = Boolean(claimedGoals[data.goal.goal_id]);

                if (data.goal.is_achieved && !isClaimed && this.dom.btnClaimCommunity) {
                    this.dom.btnClaimCommunity.classList.remove("hidden");
                    this.dom.btnClaimCommunity.setAttribute("data-goal-id", data.goal.goal_id);
                    this.dom.btnClaimCommunity.setAttribute("data-reward", data.goal.reward_diamonds);
                } else if (this.dom.btnClaimCommunity) {
                    this.dom.btnClaimCommunity.classList.add("hidden");
                }
            }
        } catch (err) {
            console.warn("Community stats fetch error:", err);
        }
    }

    async claimCommunityReward() {
        const goalId = this.dom.btnClaimCommunity?.getAttribute("data-goal-id");
        const reward = parseInt(this.dom.btnClaimCommunity?.getAttribute("data-reward") || "20", 10);
        if (!goalId) return;

        try {
            const res = await fetch("/api/community/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    player_id: this.profile.player_id,
                    goal_id: goalId,
                }),
            });
            if (!res.ok) throw new Error("Claim failed");
            if (!this.profile.claimed_community_goals) this.profile.claimed_community_goals = {};
            this.profile.claimed_community_goals[goalId] = true;
            this.addDiamonds(reward, "Community Haunt Goal Claimed", goalId, "diamond_earned");
            if (this.dom.btnClaimCommunity) this.dom.btnClaimCommunity.classList.add("hidden");
            this.showToast("Bounty Claimed!", `+${reward} 💎 Community Goal Reward`, "🌐");
        } catch (err) {
            console.warn("Claim community reward error:", err);
        }
    }

    // ==========================================
    // PWA & SERVICE WORKER
    // ==========================================
    initPwa() {
        this.pwaMgr.initPwa();
    }

    // ==========================================
    // EVENT BINDINGS
    // ==========================================
    initEvents() {
        const unlockAndStartBgm = () => {
            this.sound.unlock();
            if (this.sound.musicEnabled && !this.sound.bgmPlaying) {
                this.sound.startBackgroundAmbience();
            }
        };
        document.addEventListener("click", unlockAndStartBgm);
        document.addEventListener("keydown", unlockAndStartBgm);
        document.addEventListener("pointerdown", unlockAndStartBgm);

        // Home Branding Navigation
        this.dom.btnHome?.addEventListener("click", () => this.openHome());
        this.dom.btnHome?.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                this.openHome();
            }
        });

        // Global Escape closes active modals
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.closeAllModals();
            }
        });

        // UI Sound on buttons
        document.addEventListener("click", (event) => {
            const button = event.target.closest("button");
            if (
                !button ||
                button.disabled ||
                button.id === "btn-start" ||
                button.id === "btn-enter-the-haunt" ||
                button.id === "btn-lobby-quick-play" ||
                button.id === "btn-lobby-daily-haunt" ||
                button.classList.contains("option-btn")
            ) return;
            const isCategoryAction = button.id === "btn-select-all-cats" || button.id === "btn-clear-cats";
            this.sound.play(isCategoryAction ? "category_select" : "ui_click");
        }, true);

        // UI sound on form inputs
        document.addEventListener("change", (event) => {
            if (event.target.matches("input[name='categories'], input[name='difficulty'], input[name='mode']")) {
                this.sound.playUiSound();
            }
        });

        // Start screen avatar click
        this.dom.btnStartChangeAvatar?.addEventListener("click", () => {
            this.openAvatarPicker();
        });

        // Start screen player name sync
        this.dom.playerName?.addEventListener("change", (e) => {
            this.updateNickname(e.target.value);
        });

        // Game Mode Radio change handler
        document.querySelectorAll("input[name='mode']").forEach((radio) => {
            radio.addEventListener("change", (e) => {
                this.onModeChange(e.target.value);
            });
        });

        // Quick Category Select All / Clear
        this.dom.btnSelectAllCats?.addEventListener("click", () => {
            this.setAllCategories(true);
        });
        this.dom.btnClearCats?.addEventListener("click", () => {
            this.setAllCategories(false);
        });

        // Start Form Submission
        this.dom.formStart?.addEventListener("submit", (e) => {
            e.preventDefault();
            this.startGame();
        });

        // Lobby Actions
        this.dom.btnEnterTheHaunt?.addEventListener("click", () => this.startGame());
        this.dom.btnLobbyContinueJourney?.addEventListener("click", () => this.handleLobbyContinueJourney());
        this.dom.btnLobbyQuickPlay?.addEventListener("click", () => {
            this.startGameWithParams({ mode: "quick", num_questions: 5 });
        });
        this.dom.btnLobbyDailyHaunt?.addEventListener("click", () => {
            this.startGameWithParams({ mode: "daily", num_questions: 10 });
        });
        this.dom.btnLobbyDuels?.addEventListener("click", () => this.openDuels());
        this.dom.btnLobbyAvatar?.addEventListener("click", () => this.openAvatarPicker());
        this.dom.btnLobbyEditProfile?.addEventListener("click", () => this.openSettings());
        this.dom.lobbyDiamondsPill?.addEventListener("click", () => this.openShop());
        this.dom.lobbyProgressSnapshot?.addEventListener("click", () => this.openMastery());
        this.dom.btnLobbyProgress?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.openMastery();
        });
        this.dom.btnLobbyLeaderboard?.addEventListener("click", () => this.openLeaderboard());
        this.dom.btnLobbySettings?.addEventListener("click", () => this.openSettings());
        this.dom.btnGuideNextHint?.addEventListener("click", () => this.cycleSpookyGuideHint());

        // Quiz Question / Feedback Actions
        this.dom.btnNextQuestion?.addEventListener("click", () => this.advanceToNext());
        this.dom.btnPlayAgain?.addEventListener("click", () => {
            this.showScreen("start");
            this.sound.startBackgroundAmbience();
        });
        this.dom.btnNoticeDismiss?.addEventListener("click", () => this.hideNotice());
        this.dom.btnShareResult?.addEventListener("click", () => this.shareSurvivalCard());

        // Navigation Buttons
        this.dom.btnLeaderboard?.addEventListener("click", () => this.openLeaderboard());
        this.dom.btnViewBoardFinish?.addEventListener("click", () => this.openLeaderboard());
        this.dom.btnCloseModal?.addEventListener("click", () => this.closeLeaderboard());
        this.dom.modalLeaderboard?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalLeaderboard) this.closeLeaderboard();
        });

        // Leaderboard View Switcher
        const lbViewBtns = this.dom.modalLeaderboard?.querySelectorAll(".lb-view-btn");
        lbViewBtns?.forEach((btn) => {
            btn.addEventListener("click", () => {
                lbViewBtns.forEach((b) => {
                    b.classList.remove("active");
                    b.setAttribute("aria-selected", "false");
                });
                btn.classList.add("active");
                btn.setAttribute("aria-selected", "true");
                this.currentLbView = btn.getAttribute("data-view") || "all";
                this.fetchLeaderboard(this.currentLbDiff, this.currentLbMode);
            });
        });

        // Leaderboard Secondary Filter Tabs
        const tabs = this.dom.modalLeaderboard?.querySelectorAll("#leaderboard-filter-tabs .tab-btn");
        tabs?.forEach((tab) => {
            tab.addEventListener("click", () => {
                tabs.forEach((t) => {
                    t.classList.remove("active");
                    t.setAttribute("aria-selected", "false");
                });
                tab.classList.add("active");
                tab.setAttribute("aria-selected", "true");
                const diff = tab.getAttribute("data-diff");
                const mode = tab.getAttribute("data-mode");
                this.currentLbDiff = diff === "all" ? null : diff;
                this.currentLbMode = mode || null;
                this.fetchLeaderboard(this.currentLbDiff, this.currentLbMode);
            });
        });

        // Spooky Master Pass & Premium Events
        this.dom.btnPassNav?.addEventListener("click", () => this.openPremiumModal());
        this.dom.btnClosePremium?.addEventListener("click", () => this.closePremiumModal());
        this.dom.modalPremium?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalPremium) this.closePremiumModal();
        });
        this.dom.btnPurchasePass?.addEventListener("click", () => this.handlePurchasePass());
        this.dom.btnSubscribeVip?.addEventListener("click", () => this.handleSubscribeVip());
        this.dom.btnRestorePurchases?.addEventListener("click", () => this.handleRestorePurchases());
        this.dom.btnDevTogglePass?.addEventListener("click", () => this.handleDevTogglePass());

        // Settings Events
        this.dom.btnSettingsOpen?.addEventListener("click", () => this.openSettings());
        this.dom.btnCloseSettings?.addEventListener("click", () => this.closeSettings());
        this.dom.modalSettings?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalSettings) this.closeSettings();
        });
        this.dom.btnSettingsChangeAvatar?.addEventListener("click", () => this.openAvatarPicker());
        this.dom.settingsPlayerName?.addEventListener("change", (e) => {
            this.updateNickname(e.target.value);
        });

        this.dom.modalBtnBgmToggle?.addEventListener("click", () => {
            this.sound.toggleBgm();
            this.profile.preferences.music_enabled = this.sound.musicEnabled;
            this.saveProfile();
            this.syncSettingsUi();
        });
        this.dom.settingMusicTrack?.addEventListener("change", (e) => {
            this.sound.setTrack(e.target.value);
            this.profile.preferences.music_track = e.target.value;
            this.saveProfile();
        });
        this.dom.modalMusicSlider?.addEventListener("input", (e) => {
            this.sound.setMusicVolume(e.target.value);
            this.profile.preferences.music_volume = this.sound.musicVolume;
            this.saveProfile();
            if (this.dom.musicVolVal) {
                this.dom.musicVolVal.textContent = `${Math.round(this.sound.musicVolume * 100)}%`;
            }
        });
        this.dom.modalBtnSoundToggle?.addEventListener("click", () => {
            this.sound.toggleSfx();
            this.profile.preferences.sfx_enabled = this.sound.sfxEnabled;
            this.saveProfile();
            this.syncSettingsUi();
        });
        this.dom.modalSfxSlider?.addEventListener("input", (e) => {
            this.sound.setSfxVolume(e.target.value);
            this.profile.preferences.sfx_volume = this.sound.sfxVolume;
            this.saveProfile();
            if (this.dom.sfxVolVal) {
                this.dom.sfxVolVal.textContent = `${Math.round(this.sound.sfxVolume * 100)}%`;
            }
        });
        this.dom.settingReducedMotion?.addEventListener("change", (e) => {
            this.profile.preferences.reduced_motion = e.target.checked;
            this.saveProfile();
            document.documentElement.classList.toggle("reduced-motion", e.target.checked);
            this.showToast("Preference Updated", `Reduced motion is ${e.target.checked ? "enabled" : "disabled"}.`, "⚙️");
        });
        this.dom.settingVibration?.addEventListener("change", (e) => {
            this.profile.preferences.vibration = e.target.checked;
            this.saveProfile();
            this.showToast("Preference Updated", `Haptic feedback is ${e.target.checked ? "enabled" : "disabled"}.`, "📳");
        });
        this.dom.btnResetProgress?.addEventListener("click", () => {
            this.resetProgressData();
        });

        // Mastery & Profile Modal
        this.dom.btnMasteryOpen?.addEventListener("click", () => this.openMastery());
        this.dom.btnViewMasteryFinish?.addEventListener("click", () => this.openMastery());
        this.dom.btnCloseMastery?.addEventListener("click", () => this.closeMastery());
        this.dom.btnDashboardEditProfile?.addEventListener("click", () => {
            this.closeMastery();
            this.openSettings();
        });
        this.dom.modalMastery?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalMastery) this.closeMastery();
        });

        // Onboarding
        this.renderOnboardingAvatarGrid();
        this.dom.btnSaveOnboarding?.addEventListener("click", () => this.completeOnboarding());
        this.dom.btnSkipOnboarding?.addEventListener("click", () => this.completeOnboarding());
        this.dom.btnCloseOnboarding?.addEventListener("click", () => this.completeOnboarding());
        this.dom.modalOnboarding?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalOnboarding) this.completeOnboarding();
        });
        document.querySelectorAll(".btn-suggestion").forEach((btn) => {
            btn.addEventListener("click", () => {
                if (this.dom.onboardingHunterName) {
                    this.dom.onboardingHunterName.value = btn.textContent;
                    this.sound.playUiSound();
                }
            });
        });

        // Hunter Studio & Avatar Picker
        this.dom.btnCloseAvatarPicker?.addEventListener("click", () => this.closeAvatarPicker());
        this.dom.modalAvatarPicker?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalAvatarPicker) this.closeAvatarPicker();
        });
        this.dom.tabAvatarPredefined?.addEventListener("click", () => this.switchAvatarTab("predefined"));
        this.dom.tabAvatarGenerator?.addEventListener("click", () => this.switchAvatarTab("generator"));
        this.dom.btnGenerateHunter?.addEventListener("click", () => this.generateHunterAvatar());
        this.dom.btnEquipGeneratedHunter?.addEventListener("click", () => this.equipGeneratedHunter());

        // Market / Shop
        this.dom.btnMarketOpen?.addEventListener("click", () => this.openShop());
        this.dom.btnCloseShop?.addEventListener("click", () => this.closeShop());
        this.dom.modalShop?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalShop) this.closeShop();
        });
        this.dom.tabShopBoosters?.addEventListener("click", () => {
            this.dom.tabShopBoosters.classList.add("active");
            this.dom.tabShopCosmetics.classList.remove("active");
            this.dom.shopBoostersPanel.classList.remove("hidden");
            this.dom.shopCosmeticsPanel.classList.add("hidden");
        });
        this.dom.tabShopCosmetics?.addEventListener("click", () => {
            this.dom.tabShopCosmetics.classList.add("active");
            this.dom.tabShopBoosters.classList.remove("active");
            this.dom.shopCosmeticsPanel.classList.remove("hidden");
            this.dom.shopBoostersPanel.classList.add("hidden");
        });
        this.dom.modalShop?.addEventListener("click", (e) => {
            const buyBoosterBtn = e.target.closest(".btn-buy-booster");
            if (buyBoosterBtn) {
                const type = buyBoosterBtn.getAttribute("data-type");
                const price = parseInt(buyBoosterBtn.getAttribute("data-price"), 10);
                this.buyBooster(type, price);
                return;
            }
            const buyCosmeticBtn = e.target.closest(".btn-buy-cosmetic");
            if (buyCosmeticBtn) {
                const id = buyCosmeticBtn.getAttribute("data-id");
                const price = parseInt(buyCosmeticBtn.getAttribute("data-price"), 10);
                this.buyCosmetic(id, price);
            }
        });

        // Campaign
        this.dom.btnCampaignNav?.addEventListener("click", () => this.openCampaign());
        this.dom.btnHeroJourney?.addEventListener("click", () => this.openCampaign());
        this.dom.btnCloseCampaign?.addEventListener("click", () => this.closeCampaign());
        this.dom.modalCampaign?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalCampaign) this.closeCampaign();
        });
        this.dom.btnReadChapterStory?.addEventListener("click", () => this.openChapterStory());
        this.dom.btnStartStage?.addEventListener("click", () => {
            if (this.selectedStageId) this.startStageGame(this.selectedStageId);
        });

        // Chapter Story Modal
        this.dom.btnCloseStory?.addEventListener("click", () => this.closeStory());
        this.dom.btnCloseStorySecondary?.addEventListener("click", () => this.closeStory());
        this.dom.btnEnterChapterFromStory?.addEventListener("click", () => {
            this.closeStory();
            this.openCampaign();
        });
        this.dom.modalChapterStory?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalChapterStory) this.closeStory();
        });

        // Community Haunt
        this.dom.btnClaimCommunity?.addEventListener("click", () => this.claimCommunityReward());

        // In-Game Boosters HUD & Conversational Spooky Guide
        this.dom.boosterHint?.addEventListener("click", () => this.useBooster("hint"));
        this.dom.boosterTime?.addEventListener("click", () => this.useBooster("time_extension"));
        this.dom.boosterDouble?.addEventListener("click", () => this.useBooster("double_points"));
        this.dom.boosterShield?.addEventListener("click", () => this.useBooster("shield"));
        this.dom.btnAskSpookyGuide?.addEventListener("click", () => this.requestSpookyGuideHint(this.currentHintLevel || 1));
        this.dom.btnQuizGuideDeeper?.addEventListener("click", () => this.requestSpookyGuideHint((this.currentHintLevel || 1) + 1));
        this.dom.btnCloseGuideBubble?.addEventListener("click", () => {
            this.dom.quizSpookyGuideBox?.classList.add("hidden");
        });

        // Audio Riddles
        this.dom.btnPlayRiddleClip?.addEventListener("click", () => this.playActiveRiddleSound());
        this.dom.btnToggleTranscript?.addEventListener("click", () => this.toggleRiddleTranscript());

        // Duels
        this.dom.btnDuelsNav?.addEventListener("click", () => this.openDuels());
        this.dom.btnCloseDuels?.addEventListener("click", () => this.closeDuels());
        this.dom.modalDuels?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalDuels) this.closeDuels();
        });
        this.dom.tabDuelCreate?.addEventListener("click", () => {
            this.dom.tabDuelCreate.classList.add("active");
            this.dom.tabDuelJoin.classList.remove("active");
            this.dom.duelCreatePanel.classList.remove("hidden");
            this.dom.duelJoinPanel.classList.add("hidden");
        });
        this.dom.tabDuelJoin?.addEventListener("click", () => {
            this.dom.tabDuelJoin.classList.add("active");
            this.dom.tabDuelCreate.classList.remove("active");
            this.dom.duelJoinPanel.classList.remove("hidden");
            this.dom.duelCreatePanel.classList.add("hidden");
        });
        this.dom.formCreateDuel?.addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleCreateDuel();
        });
        this.dom.btnCopyDuelCode?.addEventListener("click", () => {
            if (this.activeDuelCode && navigator.clipboard) {
                navigator.clipboard.writeText(this.activeDuelCode);
                this.showToast("Duel Code Copied", this.activeDuelCode, "📋");
            }
        });
        this.dom.btnPlayCreatedDuel?.addEventListener("click", () => {
            this.closeDuels();
            this.startDuelGame(this.activeDuelCode, true);
        });
        this.dom.formJoinDuel?.addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleInspectDuel();
        });
        this.dom.btnAcceptAndPlayDuel?.addEventListener("click", () => {
            this.handleAcceptAndPlayDuel();
        });

        // Global Keyboard Shortcuts
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.closeLeaderboard();
                this.closeSettings();
                this.closeMastery();
                this.closeAvatarPicker();
                this.closeOnboarding();
                this.closeCampaign();
                this.closeStory();
                this.closeShop();
                this.closeDuels();
                this.closePremiumModal();
                return;
            }

            if (this.isFeedbackActive && (e.key === "Enter" || e.key === " " || e.key === "ArrowRight")) {
                e.preventDefault();
                this.advanceToNext();
                return;
            }

            if (!this.isAnswerPending && !this.isFeedbackActive && this.screens.quiz.classList.contains("active")) {
                const key = e.key.toUpperCase();
                if (["1", "2", "3", "4", "A", "B", "C", "D"].includes(key)) {
                    const index = /^[1-4]$/.test(key) ? parseInt(key, 10) - 1 : key.charCodeAt(0) - 65;
                    const buttons = this.dom.optionsGrid.querySelectorAll(".option-btn");
                    if (buttons[index]) {
                        buttons[index].click();
                    }
                }
            }
        });
    }
}
