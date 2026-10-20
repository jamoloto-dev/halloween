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
import { GameRouter } from "./modules/router.js";
import { ApiClient } from "./modules/api.js";
import { LobbyManager } from "./modules/lobby.js";
import { OnboardingManager } from "./modules/onboarding.js";
import { ThemesManager } from "./modules/themes.js";
import { ShopManager } from "./modules/shop.js";
import { EntitlementsManager } from "./modules/entitlements.js";

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
            landing: document.getElementById("screen-landing"),
            start: document.getElementById("screen-start"),
            quiz: document.getElementById("screen-quiz"),
            gameover: document.getElementById("screen-gameover"),
        };

        // DOM Element Registry
        this.dom = {
            // Landing Screen
            btnLandingEnter: document.getElementById("btn-landing-enter"),

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
            lobbyAuthModeBadge: document.getElementById("lobby-auth-mode-badge"),
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

            // Modal Decks (Zero-Scroll Command Deck)
            modalDeckCampaign: document.getElementById("modal-deck-campaign"),
            btnCloseDeckCampaign: document.getElementById("btn-close-deck-campaign"),
            tileDashCampaignPreview: document.getElementById("tile-dash-campaign-preview"),
            modalCryptRules: document.getElementById("modal-crypt-rules"),
            btnCloseCryptRules: document.getElementById("btn-close-crypt-rules"),
            tileDashCryptRules: document.getElementById("tile-dash-crypt-rules"),
            modalTriviaCategories: document.getElementById("modal-trivia-categories"),
            btnCloseTriviaCategories: document.getElementById("btn-close-trivia-categories"),
            tileDashTriviaCategories: document.getElementById("tile-dash-trivia-categories"),
            btnConfirmCategories: document.getElementById("btn-confirm-categories"),
            btnOpenCategoriesFromRules: document.getElementById("btn-open-categories-from-rules"),
            narratorLoreBanner: document.getElementById("narrator-lore-banner"),
            btnReplayLore: document.getElementById("btn-replay-lore"),
            btnSkipLore: document.getElementById("btn-skip-lore"),

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
            timerText: document.getElementById("timer-display"),
            timerProgress: document.getElementById("timer-bar"),
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

            // Navigation & Page Extensions
            btnNavHunt: document.getElementById("btn-nav-hunt"),
            btnNavGenie: document.getElementById("btn-nav-genie"),
            btnNavMusicToggle: document.getElementById("btn-nav-music-toggle"),
            navMusicStatus: document.getElementById("nav-music-status"),
            btnNavAuth: document.getElementById("btn-nav-auth"),
            navAuthLabel: document.getElementById("nav-auth-label"),
            pageHunt: document.getElementById("page-hunt"),
            pageGenie: document.getElementById("page-genie"),
            btnGenieConsultOracle: document.getElementById("btn-genie-consult-oracle"),
            genieOracleResult: document.getElementById("genie-oracle-result"),

            // Auth Modal / Dedicated Auth Screen
            modalAuth: document.getElementById("modal-auth"),
            btnCloseAuth: document.getElementById("btn-close-auth"),
            btnAuthMusicToggle: document.getElementById("btn-auth-music-toggle"),
            authMusicStatus: document.getElementById("auth-music-status"),
            btnAuthQuickGuest: document.getElementById("btn-auth-quick-guest"),
            btnAuthSubmitLogin: document.getElementById("btn-auth-submit-login"),
            btnAuthSubmitRegister: document.getElementById("btn-auth-submit-register"),
            btnAuthSubmitGuest: document.getElementById("btn-auth-submit-guest"),
            tabAuthLogin: document.getElementById("tab-auth-login"),
            tabAuthRegister: document.getElementById("tab-auth-register"),
            tabAuthGuest: document.getElementById("tab-auth-guest"),
            authPanelLogin: document.getElementById("auth-panel-login"),
            authPanelRegister: document.getElementById("auth-panel-register"),
            authPanelGuest: document.getElementById("auth-panel-guest"),
            formAuthLogin: document.getElementById("form-auth-login"),
            formAuthRegister: document.getElementById("form-auth-register"),
            formAuthGuest: document.getElementById("form-auth-guest"),
            authLoginUsername: document.getElementById("auth-login-username"),
            authLoginPassword: document.getElementById("auth-login-password"),
            authRegUsername: document.getElementById("auth-reg-username"),
            authRegPassword: document.getElementById("auth-reg-password"),
            authRegNickname: document.getElementById("auth-reg-nickname"),
            authGuestNickname: document.getElementById("auth-guest-nickname"),
            authLoginStatus: document.getElementById("auth-login-status"),
            authRegStatus: document.getElementById("auth-reg-status"),
            authGuestStatus: document.getElementById("auth-guest-status"),
        };

        // Subsystem Managers
        this.api = new ApiClient(() => this.profile?.player_id || "guest_default");
        this.campaignMgr = new CampaignManager(this);
        this.hintsMgr = new HintsManager(this);
        this.hunterStudioMgr = new HunterStudioManager(this);
        this.quizMgr = new QuizLifecycleManager(this);
        this.profileMgr = new ProfileManager(this);
        this.leaderboardMgr = new LeaderboardManager(this);
        this.duelsMgr = new DuelsManager(this);
        this.settingsMgr = new SettingsManager(this);
        this.pwaMgr = new PwaManager(this);
        this.router = new GameRouter(this);
        this.lobbyMgr = new LobbyManager(this);
        this.onboardingMgr = new OnboardingManager(this);
        this.themesMgr = new ThemesManager(this);
        this.shopMgr = new ShopManager(this);
        this.entitlementsMgr = new EntitlementsManager(this);
        this._isEnteringFromLanding = false;
        this._authSubmitting = false;
        this._authNetworkOffline = false;
        this.pendingPostAuthRoute = null;

        // Initialize Player Profile & Data
        this.profile = this.initPlayerProfile();
        this.loadSynthesizedAvatars();

        this.initEvents();
        this.initPwa();
        this.initDailyCountdown();
        this.sound.onBgmStateChange = (isPlaying) => {
            this.syncSettingsUi();
            this.updateMusicNavButton(isPlaying);
        };
        this.initAuth();
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

        // Initialize Client-side Router
        this.router.init();
    }

    hasEnteredGate() {
        if (localStorage.getItem("spooky_force_landing") === "true") {
            return false;
        }
        const hasToken = Boolean(localStorage.getItem("spooky_session_token"));
        if (hasToken) {
            if (this.currentUser) {
                return true;
            }
            if (this._authNetworkOffline) {
                return localStorage.getItem("spooky_gate_entered") === "true";
            }
            return false;
        }
        return localStorage.getItem("spooky_gate_entered") === "true";
    }

    ensureGateEntered() {
        if (!this.hasEnteredGate()) {
            this.bootstrapHome();
            return false;
        }
        return true;
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
        const modals = [
            this.dom.modalLeaderboard,
            this.dom.modalSettings,
            this.dom.modalMastery,
            this.dom.modalAvatarPicker,
            this.dom.modalOnboarding,
            this.dom.modalCampaign,
            this.dom.modalChapterStory,
            this.dom.modalShop,
            this.dom.modalDuels,
            this.dom.modalPremium,
            this.dom.modalAuth,
            this.dom.modalDeckCampaign,
            this.dom.modalCryptRules,
            this.dom.modalTriviaCategories,
        ];
        modals.forEach((m) => {
            if (m) {
                m.classList.add("hidden");
                m.classList.remove("active");
            }
        });
        const subpages = [
            document.getElementById("page-daily-haunt"),
            document.getElementById("page-duel-invite"),
            document.getElementById("page-hunt"),
            document.getElementById("page-genie"),
        ];
        subpages.forEach((p) => {
            if (p) {
                p.classList.add("hidden");
                p.classList.remove("active");
            }
        });
        this.syncModalScrollLock();
    }

    syncModalScrollLock() {
        const hasActiveModal = Boolean(
            document.querySelector(".modal-overlay.active:not(.hidden)")
        );
        document.body.classList.toggle("modal-open", hasActiveModal);
        document.documentElement.classList.toggle("modal-open", hasActiveModal);
    }

    openDeckCampaign() {
        this.closeAllModals();
        if (this.dom.modalDeckCampaign) {
            this.dom.modalDeckCampaign.classList.remove("hidden");
            this.dom.modalDeckCampaign.classList.add("active");
        }
        this.syncModalScrollLock();
        this.renderLobbyExperience();
    }

    closeDeckCampaign() {
        if (this.dom.modalDeckCampaign) {
            this.dom.modalDeckCampaign.classList.add("hidden");
            this.dom.modalDeckCampaign.classList.remove("active");
        }
        this.syncModalScrollLock();
    }

    openCryptRules() {
        this.closeAllModals();
        if (this.dom.modalCryptRules) {
            this.dom.modalCryptRules.classList.remove("hidden");
            this.dom.modalCryptRules.classList.add("active");
        }
        this.syncModalScrollLock();
    }

    closeCryptRules() {
        if (this.dom.modalCryptRules) {
            this.dom.modalCryptRules.classList.add("hidden");
            this.dom.modalCryptRules.classList.remove("active");
        }
        this.syncModalScrollLock();
    }

    openTriviaCategories() {
        this.closeAllModals();
        if (this.dom.modalTriviaCategories) {
            this.dom.modalTriviaCategories.classList.remove("hidden");
            this.dom.modalTriviaCategories.classList.add("active");
        }
        this.syncModalScrollLock();
    }

    closeTriviaCategories() {
        if (this.dom.modalTriviaCategories) {
            this.dom.modalTriviaCategories.classList.add("hidden");
            this.dom.modalTriviaCategories.classList.remove("active");
        }
        this.syncModalScrollLock();
    }

    playNarrativeIntro() {
        if (!this.sound) return;
        const banner = document.getElementById("narrator-lore-banner");
        if (banner) {
            banner.classList.add("speaking");
            banner.classList.remove("lore-completed");
        }
        this.sound.playHorrorIntroLore(() => {
            this.onNarrativeIntroFinished();
        });
    }

    skipNarrativeIntro() {
        if (this.sound) {
            this.sound.stopHorrorIntroLore();
        }
        this.onNarrativeIntroFinished();
    }

    onNarrativeIntroFinished() {
        const banner = document.getElementById("narrator-lore-banner");
        if (banner) {
            banner.classList.remove("speaking");
            banner.classList.add("lore-completed");
        }
        if (this.sound && this.sound.musicEnabled) {
            if (this.sound.bgmPlaying) {
                this.sound.fadeBackgroundTo(this.sound.musicVolume, 800);
            } else {
                this.sound.startBackgroundAmbience();
            }
        }
    }

    openHome() {
        if (this.router && window.location.pathname !== "/") {
            this.router.navigate("/");
            return;
        }
        this.closeAllModals();
        if (!this.hasEnteredGate()) {
            this.showScreen("landing");
            return;
        }
        this.showScreen("start");
        this.sound.startBackgroundAmbience();
        this.renderLobbyExperience();
    }

    showScreen(screenName) {
        if (screenName !== "landing" && !this.hasEnteredGate()) {
            screenName = "landing";
        }
        if (screenName !== "start") {
            this.sound?.stopHorrorIntroLore?.();
        }
        if (screenName === "quiz" || screenName === "gameover") {
            this.closeAllModals();
        }
        document.body.setAttribute("data-active-screen", screenName);
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

        if (this.router) {
            if (screenName === "quiz" && window.location.pathname !== "/play/session") {
                this.router.navigate("/play/session");
            } else if (screenName === "gameover" && !window.location.pathname.startsWith("/results")) {
                this.router.navigate(this.sessionId ? `/results/${this.sessionId}` : "/results");
            } else if (screenName === "start" && window.location.pathname !== "/" && window.location.pathname !== "/play") {
                this.router.navigate("/");
            }
        }

        window.scrollTo({ top: 0, behavior: "instant" });
    }

    isQuizActive() {
        return Boolean(this.sessionId && !this.isGameOver && (this.currentQuestion || this.quizMgr?.currentQuestion));
    }

    abandonQuizSession() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.quizMgr?.stopQuestionTimer();
        this.sessionId = null;
        this.currentQuestion = null;
        this.isGameOver = true;
        this.isAnswerPending = false;
        this.isFeedbackActive = false;
    }

    // ==========================================
    // ROUTE LIFECYCLE BOOTSTRAP METHODS (v2.6.0)
    // ==========================================
    bootstrapHome() {
        this.renderLobbyExperience();

        if (!this.hasEnteredGate()) {
            if (this._isEnteringFromLanding) {
                document.body.setAttribute("data-active-screen", "auth");
                this.dom.modalAuth?.classList.remove("hidden");
                this.dom.modalAuth?.classList.add("active");
                return;
            }
            this.closeAllModals();
            this._isEnteringFromLanding = false;
            if (this.dom.btnLandingEnter) {
                this.dom.btnLandingEnter.disabled = false;
            }
            this.showScreen("landing");
            return;
        }

        this.closeAllModals();
        this.showScreen("start");
        this.sound.startBackgroundAmbience();
    }

    bootstrapHunt() {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        document.body.setAttribute("data-active-screen", "hunt");
        Object.values(this.screens).forEach((s) => {
            s?.classList.remove("active");
            s?.classList.add("hidden");
        });
        if (this.dom.pageHunt) {
            this.dom.pageHunt.classList.remove("hidden");
            this.dom.pageHunt.classList.add("active");
        }
        this.sound.startBackgroundAmbience();
    }

    bootstrapGenie() {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        document.body.setAttribute("data-active-screen", "genie");
        Object.values(this.screens).forEach((s) => {
            s?.classList.remove("active");
            s?.classList.add("hidden");
        });
        if (this.dom.pageGenie) {
            this.dom.pageGenie.classList.remove("hidden");
            this.dom.pageGenie.classList.add("active");
        }
        const gGames = document.getElementById("genie-stat-games");
        const gBest = document.getElementById("genie-stat-best-score");
        const gStreak = document.getElementById("genie-stat-streak");
        if (this.profile?.stats) {
            if (gGames) gGames.textContent = String(this.profile.stats.games_played || 0);
            if (gBest) gBest.textContent = String(this.profile.stats.best_score || 0);
            if (gStreak) gStreak.textContent = String(this.profile.stats.best_streak || 0);
        }
        this.sound.startBackgroundAmbience();
    }

    bootstrapPlay() {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        this.showScreen("start");
        this.applyProfileToUi();
        this.openCryptRules();
        this.dom.playerName?.focus();
    }

    bootstrapQuiz() {
        if (!this.ensureGateEntered()) return;
        if (!this.isQuizActive()) {
            this.showScreen("start");
        } else {
            this.showScreen("quiz");
        }
    }

    async bootstrapResults(sessionId = null) {
        if (!this.ensureGateEntered()) return;
        if (this.sessionId && (!sessionId || this.sessionId === sessionId) && this.isGameOver) {
            this.showScreen("gameover");
            return;
        }
        if (sessionId) {
            try {
                const res = await fetch(`/api/quiz/${encodeURIComponent(sessionId)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.is_completed) {
                        this.sessionId = sessionId;
                        this.isGameOver = true;
                        const summary = data.summary || {};
                        if (this.dom.statFinalScore) this.dom.statFinalScore.textContent = String(data.score ?? 0);
                        if (this.dom.statAccuracy) this.dom.statAccuracy.textContent = `${summary.percentage || 0}%`;
                        if (this.dom.statCorrect) {
                            this.dom.statCorrect.textContent = `${summary.correct_count || 0}/${summary.total_questions || data.total_questions || 10}`;
                        }
                        if (this.dom.statMaxStreak) this.dom.statMaxStreak.textContent = String(summary.max_streak || 0);
                        if (this.dom.reviewList && Array.isArray(summary.history)) {
                            this.dom.reviewList.innerHTML = "";
                            summary.history.forEach((h, idx) => {
                                const row = document.createElement("div");
                                row.className = `review-item ${h.is_correct ? "item-correct" : "item-incorrect"}`;
                                row.innerHTML = `
                                    <div class="review-header">
                                        <span class="review-index">#${idx + 1}</span>
                                        <span class="review-q">${this.escapeHtml(h.question || "")}</span>
                                        <span class="review-badge">${h.is_correct ? "✔ Correct" : "✖ Missed"}</span>
                                    </div>
                                    <div class="review-answers">
                                        <div>Your Answer: <strong>${this.escapeHtml(h.selected_answer || "")}</strong></div>
                                        ${!h.is_correct ? `<div>Correct: <strong class="correct-text">${this.escapeHtml(h.correct_answer || "")}</strong></div>` : ""}
                                    </div>
                                `;
                                this.dom.reviewList.appendChild(row);
                            });
                        }
                        this.showScreen("gameover");
                        return;
                    }
                }
            } catch (err) {
                console.warn("Results hydration warning:", err);
            }
        }
        this.showScreen("start");
    }

    bootstrapJourney() {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        this.campaignMgr.openCampaign();
    }

    bootstrapJourneyChapter(chapterId) {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        this.campaignMgr.requestedChapterId = chapterId;
        this.campaignMgr.openCampaign();
        if (this.campaignChapters && this.campaignChapters.length > 0) {
            const ch = this.campaignChapters.find(
                (c) => c.id === chapterId || c.id === `ch${chapterId}` || String(c.chapter_number) === String(chapterId).replace(/\D/g, "")
            );
            if (ch) {
                this.campaignMgr.activeChapterId = ch.id;
                this.activeChapterId = ch.id;
                this.campaignMgr.renderChapterTabs();
                this.campaignMgr.renderChapterStages(ch.id);
            }
        }
    }

    bootstrapDailyHaunt() {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        const pageDaily = document.getElementById("page-daily-haunt");
        if (pageDaily) {
            pageDaily.classList.remove("hidden");
            pageDaily.classList.add("active");
        }
        this.initDailyCountdown();
    }

    bootstrapDuels() {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        this.duelsMgr.openDuels();
    }

    async bootstrapDuelInvite(duelCode) {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        const pageDuel = document.getElementById("page-duel-invite");
        if (pageDuel) {
            pageDuel.classList.remove("hidden");
            pageDuel.classList.add("active");
        }
        if (duelCode) {
            const displayEl = document.getElementById("invite-duel-code-display");
            if (displayEl) displayEl.textContent = duelCode;
            try {
                const res = await fetch(`/api/duels/${encodeURIComponent(duelCode)}`);
                if (res.ok) {
                    const data = await res.json();
                    const nameEl = document.getElementById("invite-challenger-name");
                    const avEl = document.getElementById("invite-challenger-avatar");
                    const diffEl = document.getElementById("invite-diff-badge");
                    const qcountEl = document.getElementById("invite-qcount-badge");
                    const trapsEl = document.getElementById("invite-traps-list");
                    if (nameEl) nameEl.textContent = data.creator_name || "Rival Hunter";
                    if (avEl) avEl.src = `/static/avatars/${data.creator_avatar || "pumpkin_hunter"}.svg`;
                    if (diffEl) diffEl.textContent = (data.difficulty || "medium").toUpperCase();
                    if (qcountEl) qcountEl.textContent = `${data.num_questions || 5} Questions`;
                    if (trapsEl && data.traps) {
                        trapsEl.innerHTML = data.traps.map((t) => `<span class="badge badge-warning">${t}</span>`).join(" ");
                    }
                }
            } catch (err) {
                console.warn("Duel invite fetch warning:", err);
            }
        }
    }

    bootstrapProgress() {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        if (this.dom.modalMastery) {
            this.dom.modalMastery.classList.remove("hidden");
            this.dom.modalMastery.classList.add("active");
        }
        this.renderMasteryModal();
    }

    bootstrapLeaderboard() {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        this.leaderboardMgr.openLeaderboard();
    }

    bootstrapPass() {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        if (this.dom.modalPremium) {
            this.dom.modalPremium.classList.remove("hidden");
            this.dom.modalPremium.classList.add("active");
        }
        this.syncEntitlementsUi();
    }

    bootstrapSettings() {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        this.settingsMgr.openSettings();
    }

    bootstrapHunters() {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        this.openAvatarPicker("avatars");
    }

    bootstrapHunterStudio() {
        if (!this.ensureGateEntered()) return;
        this.closeAllModals();
        this.openAvatarPicker("studio");
    }

    async purgeObsoleteCaches() {
        if ("caches" in window) {
            try {
                const currentCache = "spooky-master-v2.6.0";
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
        return this.shopMgr.getDiamonds();
    }

    addDiamonds(amount, reason, refId = null, soundKey = null) {
        return this.shopMgr.addDiamonds(amount, reason, refId, soundKey);
    }

    spendDiamonds(amount, reason) {
        return this.shopMgr.spendDiamonds(amount, reason);
    }

    updateDiamondDisplays() {
        return this.shopMgr.updateDiamondDisplays();
    }

    updateBoosterHud() {
        return this.shopMgr.updateBoosterHud();
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
                    asset: gen.asset_url || gen.asset || `/generated-avatars/${avatarId}.svg`,
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
                asset: `/generated-avatars/${avatarId}.svg`,
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
                    <input type="checkbox" name="categories" value="${cat.id}" form="form-start-quiz" checked>
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
        return this.lobbyMgr.initDailyCountdown();
    }

    // ==========================================
    // LOBBY EXPERIENCE
    // ==========================================
    renderLobbyExperience() {
        return this.lobbyMgr.renderLobbyExperience();
    }

    renderDynamicStageMap(stages, activeStageId, completedStages) {
        return this.lobbyMgr.renderDynamicStageMap(stages, activeStageId, completedStages);
    }

    handleLobbyContinueJourney() {
        return this.lobbyMgr.handleLobbyContinueJourney();
    }

    // ==========================================
    // ONBOARDING
    // ==========================================
    openOnboarding() {
        return this.onboardingMgr.openOnboarding();
    }

    closeOnboarding() {
        return this.onboardingMgr.closeOnboarding();
    }

    renderOnboardingAvatarGrid() {
        return this.onboardingMgr.renderOnboardingAvatarGrid();
    }

    completeOnboarding() {
        return this.onboardingMgr.completeOnboarding();
    }

    // ==========================================
    // HUNTER STUDIO & AVATAR PICKER
    // ==========================================
    openAvatarPicker(tabName = null) {
        if (this.router) {
            if (tabName === "studio" && window.location.pathname !== "/hunter-studio") {
                this.router.navigate("/hunter-studio");
                return;
            } else if (tabName === "avatars" && window.location.pathname !== "/hunters") {
                this.router.navigate("/hunters");
                return;
            }
        }
        this.hunterStudioMgr.openAvatarPicker();
        if (tabName) {
            this.hunterStudioMgr.switchAvatarTab(tabName);
        }
    }

    closeAvatarPicker() {
        this.hunterStudioMgr.closeAvatarPicker();
        if (this.router && (window.location.pathname === "/hunters" || window.location.pathname === "/hunter-studio")) {
            this.router.navigate("/");
        }
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

    cycleSpookyGuideHint() {
        return this.lobbyMgr.cycleSpookyGuideHint();
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
        return this.shopMgr.openShop();
    }

    closeShop() {
        return this.shopMgr.closeShop();
    }

    buyBooster(type, price) {
        return this.shopMgr.buyBooster(type, price);
    }

    buyCosmetic(avatarId, price) {
        return this.shopMgr.buyCosmetic(avatarId, price);
    }

    useBooster(type) {
        return this.shopMgr.useBooster(type);
    }

    // ==========================================
    // HUNT & GAMEPLAY LAUNCHER (v2.7.0)
    // ==========================================
    startModeHunt(mode) {
        if (!mode) return;
        this.abandonQuizSession();
        let numQuestions = 10;
        let timeLimit = 20;
        let difficulty = this.profile?.preferred_difficulty || "medium";

        if (mode === "quick") {
            numQuestions = 5;
            timeLimit = 20;
        } else if (mode === "deep") {
            numQuestions = 15;
            timeLimit = 20;
        } else if (mode === "panic") {
            numQuestions = 10;
            timeLimit = 10;
        } else if (mode === "endless") {
            numQuestions = 50;
            timeLimit = 20;
        } else if (mode === "adaptive") {
            numQuestions = 10;
            timeLimit = 20;
        } else if (mode === "classic") {
            numQuestions = 10;
            timeLimit = 20;
        }

        let cats = Array.isArray(this.categories) && this.categories.length > 0 ? this.categories : null;
        if (!cats || cats.length === 0) {
            const checked = Array.from(document.querySelectorAll("input[name='categories']:checked")).map((el) => el.value);
            if (checked.length > 0) {
                cats = checked;
            }
        }
        if (!cats || cats.length === 0) {
            cats = ["spooky", "costumes", "movies", "history", "candy", "paranormal"];
        }

        this.startGameWithParams({
            mode: mode,
            difficulty: difficulty,
            num_questions: numQuestions,
            time_limit_per_question: timeLimit,
            categories: cats,
            player_name: this.profile?.nickname || "Ghost Hunter",
            avatar_id: this.profile?.avatar_id || "pumpkin_hunter",
        });
    }

    async consultOracleWhisper() {
        const box = this.dom.genieOracleResult;
        if (!box) return;
        box.classList.remove("hidden");
        box.innerHTML = `<em>Consulting the ancient crypt whispers...</em>`;
        this.sound?.play?.("ui_click");

        try {
            const res = await fetch("/api/ai/hint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hint_level: 1 }),
            });
            if (res.ok) {
                const data = await res.json();
                box.innerHTML = `🔮 <strong>Oracle Whisper:</strong> "${escapeHtml(data.hint || data.message || "Beware the midnight shadows where trivia lurks.")}"`;
                this.sound?.play?.("achievement");
                return;
            }
        } catch (_) {}

        const whispers = [
            "The pumpkin glow illuminates truth only for those who answer swiftly.",
            "In the deepest crypt, speed without accuracy is merely a faster demise.",
            "Witches never reveal their true ingredients, but ancient lore whispers otherwise.",
            "Survive the three strikes of Endless Night to claim the Obsidian Crown.",
            "Every correct answer echoes across the spectral plane.",
        ];
        const chosen = whispers[Math.floor(Math.random() * whispers.length)];
        box.innerHTML = `🔮 <strong>Oracle Whisper:</strong> "${chosen}"`;
        this.sound?.play?.("achievement");
    }

    updateMusicNavButton(isPlaying = this.sound?.bgmPlaying) {
        const realPlaying = Boolean(
            isPlaying &&
            this.sound?.bgmAudio &&
            !this.sound.bgmAudio.paused &&
            !this.sound.bgmAudio.muted
        );
        const activeState = Boolean(
            realPlaying || (isPlaying && this.sound?.musicEnabled && !this.sound?.isAutoplayBlocked)
        );
        const isBlocked = Boolean(this.sound?.isAutoplayBlocked && !activeState);

        if (this.dom.btnNavMusicToggle && this.dom.navMusicStatus) {
            if (activeState) {
                this.dom.btnNavMusicToggle.classList.add("is-playing");
                this.dom.btnNavMusicToggle.classList.add("active");
                this.dom.navMusicStatus.textContent = "ON";
            } else {
                this.dom.btnNavMusicToggle.classList.remove("is-playing");
                this.dom.btnNavMusicToggle.classList.remove("active");
                this.dom.navMusicStatus.textContent = "OFF";
            }
            this.dom.btnNavMusicToggle.setAttribute("aria-pressed", String(activeState));
        }
        if (this.dom.btnAuthMusicToggle && this.dom.authMusicStatus) {
            this.dom.btnAuthMusicToggle.classList.toggle("is-playing", activeState);
            this.dom.btnAuthMusicToggle.classList.toggle("autoplay-blocked", isBlocked);
            this.dom.btnAuthMusicToggle.setAttribute("aria-pressed", String(activeState));
            if (activeState) {
                this.dom.authMusicStatus.textContent = "Music: ON";
            } else if (isBlocked) {
                this.dom.authMusicStatus.textContent = "Music: OFF (Tap to Retry)";
            } else {
                this.dom.authMusicStatus.textContent = "Music: OFF";
            }
        }
        const quizAudioBtn = document.getElementById("btn-quiz-audio-toggle");
        if (quizAudioBtn) {
            quizAudioBtn.textContent = activeState ? "🔊" : "🔇";
            quizAudioBtn.classList.toggle("is-muted", !activeState);
            quizAudioBtn.setAttribute("aria-pressed", String(activeState));
        }
    }

    handleLandingEnter() {
        if (this._isEnteringFromLanding) return;
        this._isEnteringFromLanding = true;

        if (this.dom.btnLandingEnter) {
            this.dom.btnLandingEnter.disabled = true;
        }

        // 1. Register genuine user gesture for Web Audio & HTML5 Audio
        this.sound.unlock();
        this.sound.play("ui_click");

        // 2. Attempt to start background music and handle returned playback promise gracefully
        const playPromise = this.sound.startBackgroundAmbience();
        if (playPromise && typeof playPromise.then === "function") {
            playPromise
                .then((started) => {
                    this.updateMusicNavButton(Boolean(started));
                })
                .catch(() => {
                    this.updateMusicNavButton(false);
                });
        } else {
            this.updateMusicNavButton(Boolean(this.sound.bgmPlaying));
        }

        // 3. Transition from dedicated landing screen to dedicated authentication sanctum
        Object.values(this.screens).forEach((s) => {
            if (s) {
                s.classList.remove("active");
                s.classList.add("hidden");
            }
        });
        document.body.setAttribute("data-active-screen", "auth");
        this.openAuth("login");
    }

    // ==========================================
    // AUTHENTICATION & PLAYER IDENTITY METHODS (v2.7.0)
    // ==========================================
    async initAuth() {
        const token = localStorage.getItem("spooky_session_token");
        if (token) {
            try {
                const res = await fetch("/api/auth/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    this._authNetworkOffline = false;
                    this.setAuthenticatedUser(data, token, false);
                    try {
                        if (localStorage.getItem("spooky_force_landing") !== "true") {
                            localStorage.setItem("spooky_gate_entered", "true");
                        }
                    } catch (_) {}
                    this.pendingPostAuthRoute = null;
                    if (!this._isEnteringFromLanding && this.hasEnteredGate()) {
                        this.router?.resolveRoute(window.location.pathname || "/", false);
                    }
                    return;
                }
                localStorage.removeItem("spooky_session_token");
                localStorage.removeItem("spooky_gate_entered");
                this.currentUser = null;
                if (!this._isEnteringFromLanding) {
                    this.router?.resolveRoute(window.location.pathname || "/", false);
                }
            } catch (err) {
                console.warn("Auth check failed:", err);
                this._authNetworkOffline = true;
                if (!this._isEnteringFromLanding && this.hasEnteredGate()) {
                    this.router?.resolveRoute(window.location.pathname || "/", false);
                }
            }
        }

        this.updateAuthUi();
    }

    setAuthenticatedUser(user, token, persistProfile = true) {
        this.currentUser = user;
        if (token) {
            localStorage.setItem("spooky_session_token", token);
        }
        if (this.profile) {
            if (!user.is_guest || persistProfile) {
                if (user.nickname) this.profile.nickname = user.nickname;
                if (user.avatar_id) this.profile.avatar_id = user.avatar_id;
            }
            if (user.user_id) this.profile.player_id = user.user_id;
            this.profile.is_guest = Boolean(user.is_guest);
            this.profile.role = "player";
            if (persistProfile || localStorage.getItem("spooky_player_profile")) {
                this.profileMgr?.saveProfile();
            }
            this.applyProfileToUi();
        }
        this.updateAuthUi();
    }

    completeAuthEntry() {
        try {
            localStorage.setItem("spooky_gate_entered", "true");
            localStorage.removeItem("spooky_force_landing");
        } catch (_) {}
        if (this.profileMgr) {
            this.profileMgr.hadStoredProfile = true;
            this.profileMgr.saveProfile();
        }
        this._isEnteringFromLanding = false;
        const targetRoute = this.pendingPostAuthRoute;
        this.pendingPostAuthRoute = null;

        this.dom.modalAuth?.classList.add("hidden");
        this.dom.modalAuth?.classList.remove("active");
        this.playNarrativeIntro();
        this.updateAuthUi();
        this.renderLobbyExperience();

        if (this.router && targetRoute) {
            const match = this.router.matchRoute(targetRoute);
            const isResultsWithSession =
                match && match.route.page === "results" && Boolean(match.params?.sessionId);
            const nonPostAuthPages = new Set(["home", "quiz", "results", "privacy"]);
            if (match && (!nonPostAuthPages.has(match.route.page) || isResultsWithSession)) {
                this.router.navigate(targetRoute, true);
                return;
            }
        }

        if (this.router && window.location.pathname !== "/" && window.location.pathname !== "/play") {
            this.router.navigate("/", true);
            return;
        }
        this.showScreen("start");
    }

    async initDefaultGuestSession() {
        const currentNick = this.profile?.nickname || "Ghost Hunter";
        const currentAvatar = this.profile?.avatar_id || "pumpkin_hunter";

        try {
            const res = await fetch("/api/auth/guest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nickname: currentNick,
                    avatar_id: currentAvatar,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                this.setAuthenticatedUser(data, data.token, true);
            }
        } catch (err) {
            console.warn("Guest session init error:", err);
        }
    }

    updateAuthUi() {
        const isRegistered = Boolean(this.currentUser && !this.currentUser.is_guest);
        if (this.dom.navAuthLabel) {
            if (isRegistered) {
                this.dom.navAuthLabel.textContent = this.currentUser.nickname || this.currentUser.username;
                this.dom.btnNavAuth?.classList.add("signed-in");
                this.dom.btnNavAuth?.setAttribute("title", `Signed in as ${this.currentUser.username} (player). Click to sign out.`);
            } else {
                this.dom.navAuthLabel.textContent = "Sign In";
                this.dom.btnNavAuth?.classList.remove("signed-in");
                this.dom.btnNavAuth?.setAttribute("title", "Sign in or create a player account");
            }
        }

        if (this.dom.lobbyAuthModeBadge) {
            if (isRegistered) {
                this.dom.lobbyAuthModeBadge.textContent = `🔑 ${this.currentUser.username}`;
                this.dom.lobbyAuthModeBadge.classList.add("is-authenticated");
            } else {
                this.dom.lobbyAuthModeBadge.textContent = "👻 Guest Session";
                this.dom.lobbyAuthModeBadge.classList.remove("is-authenticated");
            }
        }

        if (this.dom.lobbyPlayerName && this.profile?.nickname) {
            this.dom.lobbyPlayerName.textContent = this.profile.nickname;
        }
    }

    openAuth(tab = "login") {
        this.switchAuthTab(tab);
        if (this.profile?.nickname && this.profile.nickname !== "Ghost Hunter") {
            if (this.dom.authGuestNickname && !this.dom.authGuestNickname.value) {
                this.dom.authGuestNickname.value = this.profile.nickname;
            }
            if (this.dom.authRegNickname && !this.dom.authRegNickname.value) {
                this.dom.authRegNickname.value = this.profile.nickname;
            }
        }
        this.updateMusicNavButton(this.sound.bgmPlaying);
        this.dom.modalAuth?.classList.remove("hidden");
        this.dom.modalAuth?.classList.add("active");
    }

    closeAuth() {
        this.dom.modalAuth?.classList.add("hidden");
        this.dom.modalAuth?.classList.remove("active");
        if (document.body.getAttribute("data-active-screen") === "auth") {
            if (this.hasEnteredGate()) {
                this.showScreen("start");
            } else {
                this._isEnteringFromLanding = false;
                if (this.dom.btnLandingEnter) {
                    this.dom.btnLandingEnter.disabled = false;
                }
                this.showScreen("landing");
            }
        }
    }

    switchAuthTab(tabName) {
        const tabs = [this.dom.tabAuthLogin, this.dom.tabAuthRegister, this.dom.tabAuthGuest];
        const panels = [this.dom.authPanelLogin, this.dom.authPanelRegister, this.dom.authPanelGuest];

        tabs.forEach((t) => {
            t?.classList.remove("active");
            t?.setAttribute("aria-selected", "false");
        });
        panels.forEach((p) => p?.classList.add("hidden"));

        if (tabName === "register") {
            this.dom.tabAuthRegister?.classList.add("active");
            this.dom.tabAuthRegister?.setAttribute("aria-selected", "true");
            this.dom.authPanelRegister?.classList.remove("hidden");
            this.dom.authRegUsername?.focus();
        } else if (tabName === "guest") {
            this.dom.tabAuthGuest?.classList.add("active");
            this.dom.tabAuthGuest?.setAttribute("aria-selected", "true");
            this.dom.authPanelGuest?.classList.remove("hidden");
            this.dom.authGuestNickname?.focus();
        } else {
            this.dom.tabAuthLogin?.classList.add("active");
            this.dom.tabAuthLogin?.setAttribute("aria-selected", "true");
            this.dom.authPanelLogin?.classList.remove("hidden");
            this.dom.authLoginUsername?.focus();
        }
    }

    async handleLogin(username, password) {
        if (this._authSubmitting) return;
        const statusEl = this.dom.authLoginStatus;
        if (statusEl) {
            statusEl.className = "auth-status-msg hidden";
            statusEl.textContent = "";
        }

        const cleanUser = (username || "").trim();
        if (!cleanUser || !password) {
            if (statusEl) {
                statusEl.className = "auth-status-msg error";
                statusEl.textContent = "Please enter both your Hunter Username and Password.";
            }
            return;
        }

        this._authSubmitting = true;
        if (this.dom.btnAuthSubmitLogin) {
            this.dom.btnAuthSubmitLogin.disabled = true;
        }

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: cleanUser, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Invalid credentials.");
            }

            this.setAuthenticatedUser(data, data.token, true);
            this.completeAuthEntry();
            this.showToast("Signed In", `Welcome back, ${data.nickname || data.username}!`, "🔑");
        } catch (err) {
            if (statusEl) {
                statusEl.className = "auth-status-msg error";
                statusEl.textContent = err.message;
            }
        } finally {
            this._authSubmitting = false;
            if (this.dom.btnAuthSubmitLogin) {
                this.dom.btnAuthSubmitLogin.disabled = false;
            }
        }
    }

    async handleRegister(username, password, nickname) {
        if (this._authSubmitting) return;
        const statusEl = this.dom.authRegStatus;
        if (statusEl) {
            statusEl.className = "auth-status-msg hidden";
            statusEl.textContent = "";
        }

        const cleanUser = (username || "").trim();
        if (!cleanUser || !/^[a-zA-Z0-9_-]{3,30}$/.test(cleanUser)) {
            if (statusEl) {
                statusEl.className = "auth-status-msg error";
                statusEl.textContent = "Username must be 3–30 characters (letters, numbers, underscores, or hyphens).";
            }
            return;
        }
        if (!password || password.length < 6) {
            if (statusEl) {
                statusEl.className = "auth-status-msg error";
                statusEl.textContent = "Password must be at least 6 characters long.";
            }
            return;
        }

        this._authSubmitting = true;
        if (this.dom.btnAuthSubmitRegister) {
            this.dom.btnAuthSubmitRegister.disabled = true;
        }

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: cleanUser,
                    password,
                    nickname: (nickname || "").trim() || cleanUser,
                    avatar_id: this.profile?.avatar_id || "pumpkin_hunter",
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Registration failed.");
            }

            this.setAuthenticatedUser(data, data.token, true);
            this.completeAuthEntry();
            this.showToast("Account Created", `Welcome to the crypt, ${data.nickname}!`, "✨");
        } catch (err) {
            if (statusEl) {
                statusEl.className = "auth-status-msg error";
                statusEl.textContent = err.message;
            }
        } finally {
            this._authSubmitting = false;
            if (this.dom.btnAuthSubmitRegister) {
                this.dom.btnAuthSubmitRegister.disabled = false;
            }
        }
    }

    async handleGuest(nickname) {
        if (this._authSubmitting) return;
        const statusEl = this.dom.authGuestStatus;
        if (statusEl) {
            statusEl.className = "auth-status-msg hidden";
            statusEl.textContent = "";
        }

        const guestNick = (nickname || "").trim() || this.profile?.nickname || "Ghost Hunter";
        this._authSubmitting = true;
        if (this.dom.btnAuthSubmitGuest) this.dom.btnAuthSubmitGuest.disabled = true;
        if (this.dom.btnAuthQuickGuest) this.dom.btnAuthQuickGuest.disabled = true;

        try {
            const res = await fetch("/api/auth/guest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nickname: guestNick,
                    avatar_id: this.profile?.avatar_id || "pumpkin_hunter",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Guest entry failed.");

            this.setAuthenticatedUser(data, data.token, true);
            this.completeAuthEntry();
            this.showToast("Guest Session", `Entering as ${data.nickname}.`, "👻");
        } catch (err) {
            if (statusEl) {
                statusEl.className = "auth-status-msg error";
                statusEl.textContent = err.message;
            }
            // Offline fallback so guest entry never dead-ends
            this.setAuthenticatedUser(
                {
                    user_id: this.profile?.player_id || "guest_offline",
                    username: null,
                    nickname: guestNick,
                    avatar_id: this.profile?.avatar_id || "pumpkin_hunter",
                    role: "player",
                    is_guest: true,
                },
                null,
                true
            );
            this.completeAuthEntry();
            this.showToast("Guest Session", `Entering as ${guestNick}.`, "👻");
        } finally {
            this._authSubmitting = false;
            if (this.dom.btnAuthSubmitGuest) this.dom.btnAuthSubmitGuest.disabled = false;
            if (this.dom.btnAuthQuickGuest) this.dom.btnAuthQuickGuest.disabled = false;
        }
    }

    async handleLogout() {
        const token = localStorage.getItem("spooky_session_token");
        if (token) {
            try {
                await fetch("/api/auth/logout", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });
            } catch (err) {
                console.warn("Logout error:", err);
            }
        }
        localStorage.removeItem("spooky_session_token");
        this.currentUser = null;
        if (this.profile) {
            this.profile.is_guest = true;
            this.profile.role = "player";
        }
        this.updateAuthUi();
        this.showToast("Signed Out", "You have returned to guest status.", "👋");
    }

    // ==========================================
    // CAMPAIGN (THE HAUNTED JOURNEY)
    // ==========================================
    openCampaign() {
        if (this.router && window.location.pathname !== "/journey" && !window.location.pathname.startsWith("/journey/chapter")) {
            this.router.navigate("/journey");
            return;
        }
        this.campaignMgr.openCampaign();
    }

    closeCampaign() {
        this.campaignMgr.closeCampaign();
        if (this.router && (window.location.pathname === "/journey" || window.location.pathname.startsWith("/journey/chapter"))) {
            this.router.navigate("/");
        }
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
        if (this.router && window.location.pathname !== "/duels" && !window.location.pathname.startsWith("/duels/")) {
            this.router.navigate("/duels");
            return;
        }
        this.duelsMgr.openDuels();
    }

    closeDuels() {
        this.duelsMgr.closeDuels();
        if (this.router && (window.location.pathname === "/duels" || window.location.pathname.startsWith("/duels/"))) {
            this.router.navigate("/");
        }
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
        if (this.router && window.location.pathname !== "/leaderboard") {
            this.router.navigate("/leaderboard");
            return;
        }
        this.leaderboardMgr.openLeaderboard();
    }

    closeLeaderboard() {
        this.leaderboardMgr.closeLeaderboard();
        if (this.router && window.location.pathname === "/leaderboard") {
            this.router.navigate("/");
        }
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
        if (this.router && window.location.pathname !== "/settings") {
            this.router.navigate("/settings");
            return;
        }
        this.settingsMgr.openSettings();
    }

    closeSettings() {
        this.settingsMgr.closeSettings();
        if (this.router && window.location.pathname === "/settings") {
            this.router.navigate("/");
        }
    }

    syncSettingsUi() {
        this.settingsMgr.syncSettingsUi();
    }

    renderThemesGrid() {
        return this.themesMgr.renderThemesGrid();
    }

    setTheme(themeId) {
        return this.themesMgr.setTheme(themeId);
    }

    applyTheme(themeId = null) {
        return this.themesMgr.applyTheme(themeId);
    }

    resetProgressData() {
        this.settingsMgr.resetProgressData();
    }

    // ==========================================
    // MASTERY & LOCAL AI INSIGHTS
    // ==========================================
    openMastery() {
        if (this.router && window.location.pathname !== "/progress") {
            this.router.navigate("/progress");
            return;
        }
        this.closeAllModals();
        if (this.dom.modalMastery) this.dom.modalMastery.classList.remove("hidden");
        this.renderMasteryModal();
    }

    closeMastery() {
        if (this.dom.modalMastery) this.dom.modalMastery.classList.add("hidden");
        if (this.router && window.location.pathname === "/progress") {
            this.router.navigate("/");
        }
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
        return this.entitlementsMgr.isPremium();
    }

    syncEntitlementsUi() {
        return this.entitlementsMgr.syncEntitlementsUi();
    }

    fetchEntitlements(devTier = null) {
        return this.entitlementsMgr.fetchEntitlements(devTier);
    }

    openPremiumModal() {
        return this.entitlementsMgr.openPremiumModal();
    }

    closePremiumModal() {
        return this.entitlementsMgr.closePremiumModal();
    }

    handlePurchasePass() {
        return this.entitlementsMgr.handlePurchasePass();
    }

    handleSubscribeVip() {
        return this.entitlementsMgr.handleSubscribeVip();
    }

    handleRestorePurchases() {
        return this.entitlementsMgr.handleRestorePurchases();
    }

    handleDevTogglePass() {
        return this.entitlementsMgr.handleDevTogglePass();
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
        const unlockAndStartBgm = (event) => {
            if (document.body.getAttribute("data-active-screen") === "landing") {
                return;
            }
            const target = event?.target;
            if (target && typeof target.closest === "function") {
                if (target.closest("#btn-nav-music-toggle, #btn-auth-music-toggle, #btn-quiz-audio-toggle, #modal-btn-bgm-toggle")) {
                    return;
                }
            }
            this.sound.unlock();
            if (this.sound.musicEnabled && !this.sound.bgmPlaying && this.sound.ambienceRequested) {
                this.sound.startBackgroundAmbience();
            }
        };
        document.addEventListener("click", unlockAndStartBgm);
        document.addEventListener("keydown", unlockAndStartBgm);

        // Dedicated Landing Screen ENTER Action
        this.dom.btnLandingEnter?.addEventListener("click", () => {
            this.handleLandingEnter();
        });

        // Home Branding Navigation
        this.dom.btnHome?.addEventListener("click", () => this.openHome());
        this.dom.btnHome?.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                this.openHome();
            }
        });


        // UI Sound on buttons
        document.addEventListener("click", (event) => {
            if (!event.target || typeof event.target.closest !== "function") return;
            const button = event.target.closest("button");
            if (
                !button ||
                button.disabled ||
                button.id === "btn-landing-enter" ||
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

        // Command Deck Modal Triggers & Closers
        this.dom.tileDashCampaignPreview?.addEventListener("click", () => this.openDeckCampaign());
        this.dom.btnCloseDeckCampaign?.addEventListener("click", () => this.closeDeckCampaign());
        this.dom.modalDeckCampaign?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalDeckCampaign) this.closeDeckCampaign();
        });

        this.dom.tileDashCryptRules?.addEventListener("click", () => this.openCryptRules());
        this.dom.btnCloseCryptRules?.addEventListener("click", () => this.closeCryptRules());
        this.dom.modalCryptRules?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalCryptRules) this.closeCryptRules();
        });

        this.dom.tileDashTriviaCategories?.addEventListener("click", () => this.openTriviaCategories());
        this.dom.btnCloseTriviaCategories?.addEventListener("click", () => this.closeTriviaCategories());
        this.dom.btnConfirmCategories?.addEventListener("click", () => {
            const checked = document.querySelectorAll("input[name='categories']:checked");
            if (checked.length === 0) {
                this.showNotice("Please select at least one trivia category!", "warning");
                return;
            }
            this.closeTriviaCategories();
        });
        this.dom.btnOpenCategoriesFromRules?.addEventListener("click", () => this.openTriviaCategories());
        this.dom.modalTriviaCategories?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalTriviaCategories) this.closeTriviaCategories();
        });

        // Narrator Lore Banner Controls
        this.dom.btnReplayLore?.addEventListener("click", () => this.playNarrativeIntro());
        this.dom.btnSkipLore?.addEventListener("click", () => this.skipNarrativeIntro());

        // Subtle Horror Hover SFX on Interactive Elements (throttled & unique element guarded)
        let lastHoveredInteractive = null;
        document.addEventListener("mouseenter", (e) => {
            if (!e.target || typeof e.target.closest !== "function") return;
            const target = e.target.closest("button, .dash-icon-tile, .option-btn, .category-card, .lobby-quick-card");
            if (target && target !== lastHoveredInteractive && this.sound && typeof this.sound.playHorrorHover === "function") {
                lastHoveredInteractive = target;
                this.sound.playHorrorHover();
            }
        }, true);
        document.addEventListener("mouseleave", (e) => {
            if (e.target && e.target === lastHoveredInteractive) {
                lastHoveredInteractive = null;
            }
        }, true);
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
            const p = this.sound.toggleBgm();
            this.profile.preferences.music_enabled = this.sound.musicEnabled;
            this.saveProfile();
            this.syncSettingsUi();
            if (p && typeof p.then === "function") {
                p.then((started) => this.updateMusicNavButton(Boolean(started)));
            } else {
                this.updateMusicNavButton(this.sound.bgmPlaying);
            }
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

        // Routed Page Specific Actions (v2.6.0)
        const btnDailyPage = document.getElementById("btn-start-daily-haunt-page");
        btnDailyPage?.addEventListener("click", () => {
            this.startGameWithParams({ mode: "daily", num_questions: 10 });
        });

        const btnAcceptInvite = document.getElementById("btn-accept-duel-invite");
        btnAcceptInvite?.addEventListener("click", () => {
            const duelCodeDisplay = document.getElementById("invite-duel-code-display");
            const code = duelCodeDisplay?.textContent?.trim();
            if (code) {
                this.duelsMgr.joinHauntedDuel(code);
            }
        });

        // Hunt Mode Selection Buttons (v2.7.0)
        document.querySelectorAll(".btn-start-mode").forEach((btn) => {
            btn.addEventListener("click", () => {
                const mode = btn.getAttribute("data-mode");
                if (mode) this.startModeHunt(mode);
            });
        });

        // Spooky Genie & Oracle Consultation (v2.7.0)
        this.dom.btnGenieConsultOracle?.addEventListener("click", () => this.consultOracleWhisper());

        const handleMusicToggleClick = () => {
            const p = this.sound.toggleBgm();
            this.profile.preferences.music_enabled = this.sound.musicEnabled;
            this.saveProfile();
            this.syncSettingsUi();
            this.updateMusicNavButton(this.sound.musicEnabled);
            if (p && typeof p.then === "function") {
                p.then((started) => {
                    this.syncSettingsUi();
                    this.updateMusicNavButton(Boolean(started));
                });
            } else {
                this.updateMusicNavButton(this.sound.bgmPlaying);
            }
        };

        // Top Navigation Music Toggle Button (v2.7.0)
        this.dom.btnNavMusicToggle?.addEventListener("click", handleMusicToggleClick);

        // Auth Screen Music Toggle / Retry Button
        this.dom.btnAuthMusicToggle?.addEventListener("click", handleMusicToggleClick);

        // In-Game HUD Audio Toggle & Exit Crypt Controls
        const btnQuizAudioToggle = document.getElementById("btn-quiz-audio-toggle");
        btnQuizAudioToggle?.addEventListener("click", handleMusicToggleClick);

        const btnQuizExit = document.getElementById("btn-quiz-exit");
        btnQuizExit?.addEventListener("click", () => {
            this.abandonQuizSession();
            this.openHome();
        });

        // Top Navigation Auth Pill & Lobby Auth Badge -> Sanctum Modal (v2.7.0)
        const handleAuthTriggerClick = () => {
            const isRegistered = Boolean(this.currentUser && !this.currentUser.is_guest);
            if (isRegistered) {
                const conf = window.confirm(`Signed in as ${this.currentUser.nickname || this.currentUser.username}. Would you like to sign out?`);
                if (conf) {
                    this.handleLogout();
                }
            } else {
                this.openAuth("login");
            }
        };
        this.dom.btnNavAuth?.addEventListener("click", handleAuthTriggerClick);
        this.dom.lobbyAuthModeBadge?.addEventListener("click", handleAuthTriggerClick);

        this.dom.btnCloseAuth?.addEventListener("click", () => this.closeAuth());
        this.dom.modalAuth?.addEventListener("click", (e) => {
            if (e.target === this.dom.modalAuth && document.body.getAttribute("data-active-screen") !== "auth") {
                this.closeAuth();
            }
        });

        this.dom.tabAuthLogin?.addEventListener("click", () => this.switchAuthTab("login"));
        this.dom.tabAuthRegister?.addEventListener("click", () => this.switchAuthTab("register"));
        this.dom.tabAuthGuest?.addEventListener("click", () => this.switchAuthTab("guest"));

        this.dom.formAuthLogin?.addEventListener("submit", (e) => {
            e.preventDefault();
            const u = this.dom.authLoginUsername?.value?.trim();
            const p = this.dom.authLoginPassword?.value;
            this.handleLogin(u, p);
        });

        this.dom.formAuthRegister?.addEventListener("submit", (e) => {
            e.preventDefault();
            const u = this.dom.authRegUsername?.value?.trim();
            const p = this.dom.authRegPassword?.value;
            const n = this.dom.authRegNickname?.value?.trim();
            this.handleRegister(u, p, n);
        });

        this.dom.formAuthGuest?.addEventListener("submit", (e) => {
            e.preventDefault();
            const n = this.dom.authGuestNickname?.value?.trim();
            this.handleGuest(n);
        });

        this.dom.btnAuthQuickGuest?.addEventListener("click", () => {
            const n = this.dom.authGuestNickname?.value?.trim();
            this.handleGuest(n);
        });

        // Mobile More Sheet Drawer
        const btnMobileMore = document.getElementById("btn-mobile-more");
        const btnCloseMobileMore = document.getElementById("btn-close-mobile-more");
        const mobileMoreBackdrop = document.getElementById("mobile-more-backdrop");
        const mobileMoreSheet = document.getElementById("mobile-more-sheet");

        const toggleMobileMore = (open) => {
            if (!mobileMoreSheet) return;
            if (open) {
                mobileMoreSheet.classList.remove("hidden");
                btnMobileMore?.setAttribute("aria-expanded", "true");
            } else {
                mobileMoreSheet.classList.add("hidden");
                btnMobileMore?.setAttribute("aria-expanded", "false");
            }
        };

        btnMobileMore?.addEventListener("click", () => {
            const isHidden = mobileMoreSheet?.classList.contains("hidden");
            toggleMobileMore(isHidden);
        });
        btnCloseMobileMore?.addEventListener("click", () => toggleMobileMore(false));
        mobileMoreBackdrop?.addEventListener("click", () => toggleMobileMore(false));
        mobileMoreSheet?.querySelectorAll(".mobile-more-card").forEach((link) => {
            link.addEventListener("click", () => toggleMobileMore(false));
        });

        // Global Keyboard Shortcuts
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.closeAllModals();
                if (this.router && ["/progress", "/pass", "/leaderboard", "/settings", "/journey", "/hunters", "/hunter-studio"].includes(window.location.pathname)) {
                    this.router.navigate("/");
                }
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
