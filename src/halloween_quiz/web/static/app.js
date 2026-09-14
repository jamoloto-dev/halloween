/**
 * 🎃 Halloween Quiz Game - Modern Client Engine v2.1.0
 * Features: Pure client-side Web Audio API, Smooth zero-reload countdown timer,
 * Game modes (Classic, Quick, Deep, Panic, Endless, Daily Haunt),
 * Category Mastery tiers, Badges & Achievements, PWA Service Worker,
 * Web Share API, Accessible settings, and Leaderboard integrations.
 */

(function () {
    "use strict";

    const CATEGORY_FACTS = {
        spooky: "Many ghost stories use familiar places because the ordinary can feel more unsettling than the unknown.",
        costumes: "Samhain disguises were once used to confuse wandering spirits during the changing of the seasons.",
        movies: "Horror films often use silence just before a scare to make the audience lean in.",
        history: "Early jack-o'-lanterns in Ireland were carved from turnips and beets, not pumpkins.",
        candy: "Candy corn was originally marketed as 'Chicken Feed' in the late 1800s.",
        paranormal: "EMF meters are commonly used in ghost hunting, although readings can have many ordinary domestic causes.",
    };

    const ALL_BADGES = [
        { id: "ghost_hunter", name: "Ghost Hunter", icon: "👻", desc: "Reach a streak of 3 correct answers" },
        { id: "night_stalker", name: "Night Stalker", icon: "🌙", desc: "Reach a streak of 5 correct answers" },
        { id: "possessed", name: "Possessed", icon: "🔮", desc: "Reach an uncanny streak of 10 correct answers" },
        { id: "speed_demon", name: "Speed Demon", icon: "⚡", desc: "Answer correctly in under 4.0 seconds" },
        { id: "perfect_round", name: "Perfect Séance", icon: "🕯️", desc: "Finish a round with 100% accuracy" },
        { id: "hard_survivor", name: "Hard Mode Survivor", icon: "💀", desc: "Survive Hard mode with 70%+ score" },
        { id: "endless_slayer", name: "Endless Slayer", icon: "🗡️", desc: "Reach a streak of 10 in Endless Night" },
        { id: "daily_victor", name: "Daily Haunt Victor", icon: "📜", desc: "Conquer the Daily Haunt challenge" },
    ];

    const MASTERY_TIERS = [
        { min: 91, title: "Master of the Crypt", icon: "👑" },
        { min: 76, title: "Nightmare Expert", icon: "💀" },
        { min: 51, title: "Spirit Hunter", icon: "🔮" },
        { min: 26, title: "Crypt Explorer", icon: "🕯️" },
        { min: 1,  title: "Curious Ghost", icon: "👻" },
        { min: 0,  title: "Lost Soul", icon: "🌑" },
    ];

    function getMasteryTier(percentage) {
        for (const tier of MASTERY_TIERS) {
            if (percentage >= tier.min) return tier;
        }
        return MASTERY_TIERS[MASTERY_TIERS.length - 1];
    }

    // ==========================================
    // 1. CLIENT-SIDE WEB AUDIO ENGINE
    // ==========================================
    class SoundEngine {
        constructor() {
            this.muted = localStorage.getItem("halloween_muted") === "true";
            this.musicVolume = this.getStoredVolume("halloween_music_volume", 0.25);
            this.sfxVolume = this.getStoredVolume("halloween_sfx_volume", 0.60);
            this.audioCtx = null;
            this.bgmAudio = document.getElementById("bgm-audio");
            this.bgmPlaying = false;
            this.backgroundAvailable = Boolean(this.bgmAudio);
            this.ambienceRequested = false;
            this.fadeFrame = null;
            this.duckRestoreTimer = null;
            this.soundCache = new Map();

            // Preload standard HTML5 sound elements
            this.soundUrls = {
                start: "/sounds/start.mp3",
                correct: "/sounds/correct.mp3",
                incorrect: "/sounds/incorrect.mp3",
                congrats: "/sounds/congrats.mp3",
            };
            this.soundLevels = {
                start: 0.80,
                correct: 1.00,
                incorrect: 1.00,
                congrats: 1.17,
            };
            this.duckDurations = {
                correct: 900,
                incorrect: 1100,
                congrats: 1800,
            };

            this.initAudioContext();
            this.preloadSoundEffects();

            if (this.bgmAudio) {
                this.bgmAudio.addEventListener("error", () => {
                    console.warn("Horror ambience could not be loaded; continuing without music.");
                    this.backgroundAvailable = false;
                    this.bgmPlaying = false;
                    this.notifyBgmStateChange();
                });
            }
        }

        initAudioContext() {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass();
            }
        }

        getStoredVolume(key, fallback) {
            const value = parseFloat(localStorage.getItem(key));
            return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
        }

        preloadSoundEffects() {
            Object.entries(this.soundUrls).forEach(([key, url]) => {
                const audio = new Audio(url);
                audio.preload = "auto";
                audio.addEventListener("error", () => {
                    this.soundCache.delete(key);
                });
                this.soundCache.set(key, audio);
            });
        }

        unlock() {
            if (this.audioCtx && this.audioCtx.state === "suspended") {
                this.audioCtx.resume();
            }
        }

        notifyBgmStateChange() {
            if (typeof this.onBgmStateChange === "function") {
                this.onBgmStateChange(this.bgmPlaying);
            }
        }

        setMusicVolume(val) {
            const parsed = parseFloat(val);
            this.musicVolume = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.25;
            localStorage.setItem("halloween_music_volume", this.musicVolume.toString());
            if (this.bgmAudio && this.bgmPlaying) {
                this.fadeBackgroundTo(this.musicVolume, 150);
            }
        }

        setSfxVolume(val) {
            const parsed = parseFloat(val);
            this.sfxVolume = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.60;
            localStorage.setItem("halloween_sfx_volume", this.sfxVolume.toString());
        }

        toggleMute() {
            this.muted = !this.muted;
            localStorage.setItem("halloween_muted", this.muted.toString());
            if (this.bgmAudio) {
                this.bgmAudio.muted = this.muted;
            }
            this.soundCache.forEach((audio) => {
                audio.muted = this.muted;
            });
            if (!this.muted && this.ambienceRequested) this.startBackgroundAmbience();
            return this.muted;
        }

        startBackgroundAmbience() {
            if (!this.bgmAudio || !this.backgroundAvailable) return false;
            this.unlock();
            this.ambienceRequested = true;
            if (this.muted) return false;

            if (!this.bgmAudio.paused) {
                this.bgmPlaying = true;
                this.fadeBackgroundTo(this.musicVolume, 300);
                this.notifyBgmStateChange();
                return true;
            }

            this.bgmAudio.volume = 0;
            this.bgmAudio.muted = false;
            this.bgmPlaying = true;
            this.notifyBgmStateChange();

            const playPromise = this.bgmAudio.play();
            if (playPromise) {
                playPromise.then(() => {
                    this.bgmPlaying = true;
                    this.fadeBackgroundTo(this.musicVolume, 1200);
                    this.notifyBgmStateChange();
                }).catch(() => {
                    this.bgmPlaying = false;
                    this.ambienceRequested = false;
                    this.notifyBgmStateChange();
                });
            }
            return true;
        }

        fadeBackgroundTo(target, duration, onComplete = null) {
            if (!this.bgmAudio) return;
            if (this.fadeFrame) cancelAnimationFrame(this.fadeFrame);
            const startVolume = this.bgmAudio.volume;
            const startedAt = performance.now();
            const step = (now) => {
                const progress = Math.min(1, (now - startedAt) / duration);
                this.bgmAudio.volume = startVolume + ((target - startVolume) * progress);
                if (progress < 1) {
                    this.fadeFrame = requestAnimationFrame(step);
                } else {
                    this.fadeFrame = null;
                    if (onComplete) onComplete();
                }
            };
            this.fadeFrame = requestAnimationFrame(step);
        }

        duckBackground(duration = 1000) {
            if (!this.bgmAudio || !this.bgmPlaying || this.muted || !this.ambienceRequested) return;
            if (this.duckRestoreTimer) clearTimeout(this.duckRestoreTimer);
            this.fadeBackgroundTo(this.musicVolume * 0.45, 120);
            this.duckRestoreTimer = setTimeout(() => {
                if (this.ambienceRequested && !this.muted) {
                    this.fadeBackgroundTo(this.musicVolume, 350);
                }
            }, duration);
        }

        stopBackgroundAmbience(reset = false, fadeDuration = 0) {
            if (!this.bgmAudio) return;
            this.ambienceRequested = false;
            if (this.duckRestoreTimer) clearTimeout(this.duckRestoreTimer);
            const stop = () => {
                this.bgmAudio.pause();
                if (reset) this.bgmAudio.currentTime = 0;
                this.bgmPlaying = false;
                this.notifyBgmStateChange();
            };
            if (fadeDuration > 0 && !this.bgmAudio.paused) {
                this.fadeBackgroundTo(0.08, fadeDuration, stop);
            } else {
                stop();
            }
        }

        toggleBgm() {
            if (!this.bgmAudio) return false;
            if (this.bgmPlaying || !this.bgmAudio.paused) {
                this.stopBackgroundAmbience(false, 200);
                return false;
            }
            return this.startBackgroundAmbience();
        }

        play(soundKey) {
            if (this.muted) return;
            this.unlock();

            const audio = this.soundCache.get(soundKey);
            if (audio) {
                audio.muted = false;
                audio.volume = Math.min(1, this.sfxVolume * (this.soundLevels[soundKey] || 1));
                audio.currentTime = 0;
                audio.play().catch(() => {
                    this.playSynthFallback(soundKey);
                });
            } else {
                this.playSynthFallback(soundKey);
            }
            if (this.duckDurations[soundKey]) this.duckBackground(this.duckDurations[soundKey]);
        }

        playUiSound() {
            if (this.muted) return;
            this.unlock();
            this.playSynthFallback("ui");
        }

        playSynthFallback(type) {
            if (this.muted || !this.audioCtx) return;
            try {
                const now = this.audioCtx.currentTime;
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();

                gain.connect(this.audioCtx.destination);
                osc.connect(gain);

                if (type === "correct") {
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(587.33, now); // D5
                    osc.frequency.setValueAtTime(880.0, now + 0.12); // A5
                    gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                    osc.start(now);
                    osc.stop(now + 0.45);
                } else if (type === "incorrect") {
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(140, now);
                    osc.frequency.linearRampToValueAtTime(80, now + 0.35);
                    gain.gain.setValueAtTime(this.sfxVolume * 0.30, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                    osc.start(now);
                    osc.stop(now + 0.35);
                } else if (type === "tick") {
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(950, now);
                    gain.gain.setValueAtTime(this.sfxVolume * 0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                    osc.start(now);
                    osc.stop(now + 0.06);
                } else if (type === "ui") {
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(520, now);
                    osc.frequency.exponentialRampToValueAtTime(390, now + 0.07);
                    gain.gain.setValueAtTime(this.sfxVolume * 0.18, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    osc.start(now);
                    osc.stop(now + 0.08);
                } else if (type === "start" || type === "congrats") {
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.setValueAtTime(554.37, now + 0.1);
                    osc.frequency.setValueAtTime(659.25, now + 0.2);
                    gain.gain.setValueAtTime(this.sfxVolume * 0.40, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                    osc.start(now);
                    osc.stop(now + 0.6);
                }
            } catch (err) {
                console.warn("Audio synthesis error:", err);
            }
        }
    }

    // ==========================================
    // 2. CONFETTI ANIMATION ENGINE
    // ==========================================
    class Confetti {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
            this.particles = [];
            this.animId = null;
            this.resize();
            window.addEventListener("resize", () => this.resize());
        }

        resize() {
            if (!this.canvas) return;
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }

        burst() {
            if (!this.ctx) return;
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
                document.documentElement.classList.contains("reduced-motion")) {
                return;
            }
            this.particles = [];
            const colors = ["#ff7518", "#39ff14", "#b300ff", "#ffd700", "#ff0055"];
            for (let i = 0; i < 90; i++) {
                this.particles.push({
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2,
                    vx: (Math.random() - 0.5) * 14,
                    vy: (Math.random() - 0.7) * 16,
                    size: Math.random() * 8 + 4,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    rot: Math.random() * Math.PI,
                    rotSpeed: (Math.random() - 0.5) * 0.2,
                    alpha: 1.0,
                });
            }
            if (!this.animId) {
                this.loop();
            }
        }

        loop() {
            if (!this.ctx) return;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            let active = false;

            for (const p of this.particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.35;
                p.rot += p.rotSpeed;
                p.alpha -= 0.009;

                if (p.alpha > 0) {
                    active = true;
                    this.ctx.save();
                    this.ctx.translate(p.x, p.y);
                    this.ctx.rotate(p.rot);
                    this.ctx.fillStyle = p.color;
                    this.ctx.globalAlpha = Math.max(0, p.alpha);
                    this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                    this.ctx.restore();
                }
            }

            if (active) {
                this.animId = requestAnimationFrame(() => this.loop());
            } else {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.animId = null;
            }
        }
    }

    // ==========================================
    // 3. MAIN GAME CONTROLLER
    // ==========================================
    class HalloweenQuizApp {
        constructor() {
            this.sound = new SoundEngine();
            this.confetti = new Confetti("confetti-canvas");

            // Game State
            this.sessionId = null;
            this.currentQuestion = null;
            this.currentScore = 0;
            this.currentStreak = 0;
            this.timeLimit = 20;
            this.timeRemaining = 20;
            this.timerInterval = null;
            this.lastTickTime = null;
            this.isAnswerPending = false;
            this.isFeedbackActive = false;
            this.selectedAnswerIndex = null;
            this.roundCorrect = 0;
            this.roundAnswered = 0;
            this.gameMode = "classic";
            this.strikesRemaining = 3;
            this.hapticEnabled = localStorage.getItem("halloween_vibration") !== "false";
            this.reducedMotion = localStorage.getItem("halloween_reduced_motion") === "true";

            // Apply saved reduced motion state
            if (this.reducedMotion) {
                document.documentElement.classList.add("reduced-motion");
            }

            // DOM Elements
            this.screens = {
                start: document.getElementById("screen-start"),
                quiz: document.getElementById("screen-quiz"),
                gameover: document.getElementById("screen-gameover"),
            };

            this.dom = {
                // Setup / Start
                formStart: document.getElementById("form-start-quiz"),
                playerName: document.getElementById("player-name"),
                categoryPicker: document.getElementById("category-picker"),
                wrapNumQuestions: document.getElementById("wrap-num-questions"),
                numQuestionsSelect: document.getElementById("num-questions"),
                btnSelectAllCats: document.getElementById("btn-select-all-cats"),
                btnClearCats: document.getElementById("btn-clear-cats"),
                dailyBadgeCountdown: document.getElementById("daily-badge-countdown"),

                // In-App Notice Banner & Toasts
                appNotice: document.getElementById("app-notice"),
                appNoticeText: document.getElementById("app-notice-text"),
                btnNoticeDismiss: document.getElementById("btn-notice-dismiss"),
                toastContainer: document.getElementById("toast-container"),

                // Top Nav Buttons & Quick Controls
                btnPwaInstall: document.getElementById("btn-pwa-install"),
                btnMasteryOpen: document.getElementById("btn-mastery-open"),
                btnLeaderboard: document.getElementById("btn-leaderboard-open"),
                btnSettingsOpen: document.getElementById("btn-settings-open"),
                btnSoundToggle: document.getElementById("btn-sound-toggle"),
                btnBgmToggle: document.getElementById("btn-bgm-toggle"),
                musicVolumeSlider: document.getElementById("music-volume-slider"),
                sfxVolumeSlider: document.getElementById("sfx-volume-slider"),

                // Modals
                modalLeaderboard: document.getElementById("modal-leaderboard"),
                btnCloseModal: document.getElementById("btn-close-modal"),
                leaderboardTbody: document.getElementById("leaderboard-tbody"),

                modalSettings: document.getElementById("modal-settings"),
                btnCloseSettings: document.getElementById("btn-close-settings"),
                modalBtnBgmToggle: document.getElementById("modal-btn-bgm-toggle"),
                modalMusicSlider: document.getElementById("modal-music-slider"),
                modalBtnSoundToggle: document.getElementById("modal-btn-sound-toggle"),
                modalSfxSlider: document.getElementById("modal-sfx-slider"),
                settingReducedMotion: document.getElementById("setting-reduced-motion"),
                settingVibration: document.getElementById("setting-vibration"),

                modalMastery: document.getElementById("modal-mastery"),
                btnCloseMastery: document.getElementById("btn-close-mastery"),
                badgesGrid: document.getElementById("badges-grid"),
                masteryGrid: document.getElementById("mastery-grid"),

                // Quiz HUD
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
                btnPlayAgain: document.getElementById("btn-play-again"),
                btnViewBoardFinish: document.getElementById("btn-view-board-finish"),
                btnViewMasteryFinish: document.getElementById("btn-view-mastery-finish"),
            };

            this.noticeTimer = null;
            this.initEvents();
            this.initPwa();
            this.initDailyCountdown();
            this.sound.onBgmStateChange = () => this.updateAudioControlsUi();
            this.loadCategories();
            this.updateAudioControlsUi();
            this.syncSettingsUi();
        }

        // ==========================================
        // EVENT INITIALIZATION
        // ==========================================
        initEvents() {
            // Unlock audio on any first interaction
            document.addEventListener("click", () => this.sound.unlock(), { once: true });
            document.addEventListener("keydown", () => this.sound.unlock(), { once: true });

            // UI click sound for all interactive buttons
            document.addEventListener("click", (event) => {
                const button = event.target.closest("button");
                if (!button || button.disabled || button.id === "btn-start" || button.classList.contains("option-btn")) return;
                this.sound.playUiSound();
            }, true);

            // Audio click for radio and checkbox changes
            document.addEventListener("change", (event) => {
                if (event.target.matches("input[name='categories'], input[name='difficulty'], input[name='mode']")) {
                    this.sound.playUiSound();
                }
            });

            // Game Mode Radio Selection change handler
            document.querySelectorAll("input[name='mode']").forEach((radio) => {
                radio.addEventListener("change", (e) => {
                    this.onModeChange(e.target.value);
                });
            });

            // Quick Category Select All / Clear buttons
            this.dom.btnSelectAllCats?.addEventListener("click", () => {
                this.setAllCategories(true);
            });
            this.dom.btnClearCats?.addEventListener("click", () => {
                this.setAllCategories(false);
            });

            // Start Form Submission
            this.dom.formStart.addEventListener("submit", (e) => {
                e.preventDefault();
                this.startGame();
            });

            // Next Question Button
            this.dom.btnNextQuestion.addEventListener("click", () => this.advanceToNext());

            // Play Again
            this.dom.btnPlayAgain.addEventListener("click", () => {
                this.showScreen("start");
            });

            // Notice Dismiss
            this.dom.btnNoticeDismiss?.addEventListener("click", () => {
                this.hideNotice();
            });

            // Share Survival Card
            this.dom.btnShareResult?.addEventListener("click", () => {
                this.shareSurvivalCard();
            });

            // Leaderboard Modal Open/Close
            this.dom.btnLeaderboard.addEventListener("click", () => this.openLeaderboard());
            this.dom.btnViewBoardFinish.addEventListener("click", () => this.openLeaderboard());
            this.dom.btnCloseModal.addEventListener("click", () => this.closeLeaderboard());
            this.dom.modalLeaderboard.addEventListener("click", (e) => {
                if (e.target === this.dom.modalLeaderboard) this.closeLeaderboard();
            });

            // Leaderboard Tab Switching (Difficulty + Mode)
            const tabs = this.dom.modalLeaderboard.querySelectorAll(".tab-btn");
            tabs.forEach((tab) => {
                tab.addEventListener("click", () => {
                    tabs.forEach((t) => t.classList.remove("active"));
                    tab.classList.add("active");
                    const diff = tab.getAttribute("data-diff");
                    const mode = tab.getAttribute("data-mode");
                    this.fetchLeaderboard(diff === "all" ? null : diff, mode || null);
                });
            });

            // Settings Modal Open/Close
            this.dom.btnSettingsOpen?.addEventListener("click", () => this.openSettings());
            this.dom.btnCloseSettings?.addEventListener("click", () => this.closeSettings());
            this.dom.modalSettings?.addEventListener("click", (e) => {
                if (e.target === this.dom.modalSettings) this.closeSettings();
            });

            // Mastery Modal Open/Close
            this.dom.btnMasteryOpen?.addEventListener("click", () => this.openMastery());
            this.dom.btnViewMasteryFinish?.addEventListener("click", () => this.openMastery());
            this.dom.btnCloseMastery?.addEventListener("click", () => this.closeMastery());
            this.dom.modalMastery?.addEventListener("click", (e) => {
                if (e.target === this.dom.modalMastery) this.closeMastery();
            });

            // Top Nav Sound Controls
            this.dom.btnSoundToggle?.addEventListener("click", () => {
                this.sound.toggleMute();
                this.updateAudioControlsUi();
                this.syncSettingsUi();
            });

            this.dom.btnBgmToggle?.addEventListener("click", () => {
                this.sound.toggleBgm();
                this.updateAudioControlsUi();
                this.syncSettingsUi();
            });

            this.dom.musicVolumeSlider?.addEventListener("input", (e) => {
                this.sound.setMusicVolume(e.target.value);
                this.syncSettingsUi();
            });

            this.dom.sfxVolumeSlider?.addEventListener("input", (e) => {
                this.sound.setSfxVolume(e.target.value);
                this.syncSettingsUi();
            });

            // Settings Modal Audio & Preferences Controls
            this.dom.modalBtnBgmToggle?.addEventListener("click", () => {
                this.sound.toggleBgm();
                this.updateAudioControlsUi();
                this.syncSettingsUi();
            });

            this.dom.modalBtnSoundToggle?.addEventListener("click", () => {
                this.sound.toggleMute();
                this.updateAudioControlsUi();
                this.syncSettingsUi();
            });

            this.dom.modalMusicSlider?.addEventListener("input", (e) => {
                this.sound.setMusicVolume(e.target.value);
                this.updateAudioControlsUi();
            });

            this.dom.modalSfxSlider?.addEventListener("input", (e) => {
                this.sound.setSfxVolume(e.target.value);
                this.updateAudioControlsUi();
            });

            this.dom.settingReducedMotion?.addEventListener("change", (e) => {
                this.reducedMotion = e.target.checked;
                localStorage.setItem("halloween_reduced_motion", this.reducedMotion.toString());
                document.documentElement.classList.toggle("reduced-motion", this.reducedMotion);
                this.showToast("Preference Updated", `Reduced motion is ${this.reducedMotion ? "enabled" : "disabled"}.`, "⚙️");
            });

            this.dom.settingVibration?.addEventListener("change", (e) => {
                this.hapticEnabled = e.target.checked;
                localStorage.setItem("halloween_vibration", this.hapticEnabled.toString());
                this.showToast("Preference Updated", `Haptic feedback is ${this.hapticEnabled ? "enabled" : "disabled"}.`, "📳");
            });

            // Global Keyboard Shortcuts
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    this.closeLeaderboard();
                    this.closeSettings();
                    this.closeMastery();
                    return;
                }

                // If feedback is showing, Enter or Space advances
                if (this.isFeedbackActive && (e.key === "Enter" || e.key === " " || e.key === "ArrowRight")) {
                    e.preventDefault();
                    this.advanceToNext();
                    return;
                }

                // During active question, keys 1-4 or A-D select answers
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

        // ==========================================
        // PWA REGISTRATION & PROMPT
        // ==========================================
        initPwa() {
            if ("serviceWorker" in navigator) {
                window.addEventListener("load", () => {
                    navigator.serviceWorker.register("/sw.js").catch((err) => {
                        console.warn("ServiceWorker registration:", err);
                    });
                });
            }

            let deferredPrompt = null;
            window.addEventListener("beforeinstallprompt", (e) => {
                e.preventDefault();
                deferredPrompt = e;
                if (this.dom.btnPwaInstall) {
                    this.dom.btnPwaInstall.classList.remove("hidden");
                    this.dom.btnPwaInstall.addEventListener("click", async () => {
                        this.dom.btnPwaInstall.classList.add("hidden");
                        if (deferredPrompt) {
                            deferredPrompt.prompt();
                            await deferredPrompt.userChoice;
                            deferredPrompt = null;
                        }
                    });
                }
            });
        }

        // ==========================================
        // DAILY RESET COUNTDOWN
        // ==========================================
        initDailyCountdown() {
            const update = () => {
                const now = new Date();
                const nextUtcMidnight = new Date(Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate() + 1,
                    0, 0, 0
                ));
                const diffMs = nextUtcMidnight - now;
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                if (this.dom.dailyBadgeCountdown) {
                    this.dom.dailyBadgeCountdown.textContent = `Resets in ${hours}h ${mins}m`;
                }
            };
            update();
            setInterval(update, 60000);
        }

        // ==========================================
        // MODE CHANGE HANDLER
        // ==========================================
        onModeChange(mode) {
            this.gameMode = mode;
            if (!this.dom.wrapNumQuestions) return;

            // In preset-count or dynamic modes, hide the question count picker
            if (["quick", "deep", "endless", "daily"].includes(mode)) {
                this.dom.wrapNumQuestions.style.display = "none";
            } else {
                this.dom.wrapNumQuestions.style.display = "block";
            }
        }

        setAllCategories(checked) {
            const boxes = this.dom.categoryPicker.querySelectorAll("input[name='categories']");
            boxes.forEach((cb) => {
                cb.checked = checked;
            });
            this.sound.playUiSound();
        }

        // ==========================================
        // IN-APP NOTICES & TOASTS
        // ==========================================
        showNotice(message, type = "warning", duration = 5000) {
            if (!this.dom.appNotice || !this.dom.appNoticeText) return;
            this.hideNotice();
            this.dom.appNoticeText.textContent = message;
            this.dom.appNotice.className = `app-notice notice-${type}`;
            if (duration > 0) {
                this.noticeTimer = setTimeout(() => this.hideNotice(), duration);
            }
        }

        hideNotice() {
            if (this.noticeTimer) clearTimeout(this.noticeTimer);
            if (this.dom.appNotice) this.dom.appNotice.classList.add("hidden");
        }

        showToast(title, message, icon = "🎃", duration = 3800) {
            if (!this.dom.toastContainer) return;
            const toast = document.createElement("div");
            toast.className = "toast";
            toast.innerHTML = `
                <span class="toast-icon">${icon}</span>
                <div class="toast-body">
                    <strong>${this.escapeHtml(title)}</strong>
                    <small>${this.escapeHtml(message)}</small>
                </div>
            `;
            this.dom.toastContainer.appendChild(toast);
            setTimeout(() => {
                toast.classList.add("fade-out");
                setTimeout(() => toast.remove(), 400);
            }, duration);
        }

        // ==========================================
        // UI & AUDIO CONTROLS SYNCHRONIZATION
        // ==========================================
        updateAudioControlsUi() {
            if (this.dom.btnSoundToggle) {
                this.dom.btnSoundToggle.textContent = this.sound.muted ? "🔇 Muted" : "🔊 Sound";
                this.dom.btnSoundToggle.classList.toggle("muted", this.sound.muted);
            }

            if (this.dom.btnBgmToggle) {
                this.dom.btnBgmToggle.textContent = this.sound.bgmPlaying ? "🎵 Ambience: On" : "🎵 Ambience: Off";
                this.dom.btnBgmToggle.classList.toggle("active", this.sound.bgmPlaying);
            }

            if (this.dom.musicVolumeSlider) this.dom.musicVolumeSlider.value = this.sound.musicVolume;
            if (this.dom.sfxVolumeSlider) this.dom.sfxVolumeSlider.value = this.sound.sfxVolume;
        }

        syncSettingsUi() {
            if (this.dom.modalBtnBgmToggle) {
                this.dom.modalBtnBgmToggle.textContent = this.sound.bgmPlaying ? "Turn Off" : "Turn On";
                this.dom.modalBtnBgmToggle.classList.toggle("btn-active", this.sound.bgmPlaying);
            }
            if (this.dom.modalBtnSoundToggle) {
                this.dom.modalBtnSoundToggle.textContent = this.sound.muted ? "Unmute" : "Mute";
            }
            if (this.dom.modalMusicSlider) this.dom.modalMusicSlider.value = this.sound.musicVolume;
            if (this.dom.modalSfxSlider) this.dom.modalSfxSlider.value = this.sound.sfxVolume;
            if (this.dom.settingReducedMotion) this.dom.settingReducedMotion.checked = this.reducedMotion;
            if (this.dom.settingVibration) this.dom.settingVibration.checked = this.hapticEnabled;
        }

        showScreen(screenName) {
            Object.values(this.screens).forEach((s) => s.classList.remove("active"));
            if (this.screens[screenName]) {
                this.screens[screenName].classList.add("active");
            }
            window.scrollTo({ top: 0, behavior: "smooth" });
        }

        // ==========================================
        // CATEGORIES LOADER
        // ==========================================
        async loadCategories() {
            const renderCategories = (categories) => {
                if (!Array.isArray(categories) || categories.length === 0) return false;
                this.dom.categoryPicker.innerHTML = "";
                const progress = this.getProgress();
                categories.forEach((cat) => {
                    const mastery = progress.mastery[cat.id];
                    const masteryPct = mastery && mastery.answered > 0
                        ? Math.round((mastery.correct / mastery.answered) * 100)
                        : null;
                    const tier = masteryPct !== null ? getMasteryTier(masteryPct) : null;
                    const masteryLabel = tier ? `${tier.icon} ${tier.title}` : "New trail";

                    const label = document.createElement("label");
                    label.className = "category-chip";
                    label.innerHTML = `
                        <input type="checkbox" name="categories" value="${cat.id}" checked>
                        <div class="cat-content">
                            <span class="cat-icon">${cat.icon}</span>
                            <span class="cat-name">${cat.name}</span>
                            <small class="cat-count">${cat.question_count} Qs · ${masteryLabel}</small>
                        </div>
                    `;
                    this.dom.categoryPicker.appendChild(label);
                });
                return true;
            };

            renderCategories(window.__HALLOWEEN_CATEGORY_FALLBACK__);
            try {
                const res = await fetch("/api/categories");
                if (!res.ok) throw new Error("Failed to load categories");
                const data = await res.json();
                renderCategories(data.categories);
            } catch (err) {
                if (!this.dom.categoryPicker.children.length) {
                    this.dom.categoryPicker.textContent = "Categories could not load. Please refresh the page.";
                }
                console.warn("Category refresh fallback:", err);
            }
        }

        // ==========================================
        // GAME LIFECYCLE
        // ==========================================
        async startGame() {
            const formData = new FormData(this.dom.formStart);
            const playerName = (formData.get("player_name") || "Ghost Hunter").trim();
            const difficulty = formData.get("difficulty") || "medium";
            const mode = formData.get("mode") || "classic";
            this.gameMode = mode;

            let numQuestions = parseInt(formData.get("num_questions") || "10", 10);
            if (mode === "quick") numQuestions = 5;
            else if (mode === "deep") numQuestions = 15;
            else if (mode === "endless") numQuestions = 50;
            else if (mode === "daily") numQuestions = 10;

            const selectedCategories = formData.getAll("categories");

            // Category Selection Guard
            if (selectedCategories.length === 0) {
                // Keep alert for automated E2E test assertions
                alert("Please select at least one category!");
                this.showNotice("Please select at least one category to enter the crypt!", "warning");
                return;
            }

            try {
                this.sound.startBackgroundAmbience();
                let timeLimit = difficulty === "easy" ? 30 : difficulty === "hard" ? 15 : 20;
                if (mode === "panic") timeLimit = 10;

                const res = await fetch("/api/quiz/start", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        player_name: playerName,
                        difficulty: difficulty,
                        mode: mode,
                        categories: selectedCategories,
                        num_questions: numQuestions,
                        time_limit_per_question: timeLimit,
                    }),
                });

                if (!res.ok) {
                    const err = await res.json();
                    this.sound.stopBackgroundAmbience(true);
                    alert(err.detail || "Failed to start quiz.");
                    return;
                }

                const data = await res.json();
                this.sessionId = data.session_id;
                this.currentScore = 0;
                this.currentStreak = 0;
                this.roundCorrect = 0;
                this.roundAnswered = 0;
                this.strikesRemaining = 3;

                // Mode-specific HUD elements
                if (this.dom.qModeBadge) {
                    const modeLabels = {
                        classic: "🎃 Classic",
                        quick: "⚡ Quick",
                        deep: "📖 Deep",
                        panic: "⏳ Panic",
                        endless: "💀 Endless",
                        daily: "🕯️ Daily",
                    };
                    this.dom.qModeBadge.textContent = modeLabels[mode] || mode.toUpperCase();
                }

                if (this.dom.hudStrikes) {
                    if (mode === "endless") {
                        this.dom.hudStrikes.classList.remove("hidden");
                        this.updateStrikesUi();
                    } else {
                        this.dom.hudStrikes.classList.add("hidden");
                    }
                }

                this.sound.play("start");
                this.showScreen("quiz");
                this.renderQuestion(data.first_question);
            } catch (err) {
                console.error("Error starting game:", err);
                this.sound.stopBackgroundAmbience(true);
                alert("Could not connect to game server. Please try again.");
            }
        }

        updateStrikesUi() {
            if (!this.dom.strikeIcons) return;
            if (this.strikesRemaining === 3) {
                this.dom.strikeIcons.textContent = "💚 💚 💚";
            } else if (this.strikesRemaining === 2) {
                this.dom.strikeIcons.textContent = "💚 💚 🖤";
            } else if (this.strikesRemaining === 1) {
                this.dom.strikeIcons.textContent = "💚 🖤 🖤";
            } else {
                this.dom.strikeIcons.textContent = "💀 🖤 🖤";
            }
        }

        renderQuestion(qView) {
            if (!qView) return;
            this.currentQuestion = qView;
            this.isAnswerPending = false;
            this.isFeedbackActive = false;
            this.selectedAnswerIndex = null;

            // Status HUD
            const counterText = this.gameMode === "endless"
                ? `Survived: ${this.roundCorrect} Qs`
                : `Question ${qView.index} of ${qView.total_questions}`;
            this.dom.qCounter.textContent = counterText;
            this.dom.qCategoryBadge.textContent = `${qView.category_icon} ${qView.category_name}`;
            this.dom.liveScore.textContent = this.currentScore;
            this.dom.streakCount.textContent = `${this.currentStreak} Streak`;

            // Question Text
            this.dom.questionText.textContent = qView.question;

            // Render Options
            this.dom.optionsGrid.innerHTML = "";
            qView.options.forEach((opt, idx) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "option-btn";
                btn.setAttribute("data-index", idx);
                btn.setAttribute("data-answer", opt);
                btn.innerHTML = `
                    <span class="opt-badge">${String.fromCharCode(65 + idx)}</span>
                    <span class="opt-text">${this.escapeHtml(opt)}</span>
                `;
                btn.addEventListener("click", () => this.handleAnswerSelect(opt, idx, btn));
                this.dom.optionsGrid.appendChild(btn);
            });

            // Reset & Hide Feedback Panel
            this.dom.feedbackPanel.classList.add("hidden");

            // Start Countdown Timer
            this.startTimer(qView.time_limit);
        }

        setAnswerButtonsDisabled(disabled) {
            this.dom.optionsGrid.querySelectorAll(".option-btn").forEach((button) => {
                button.disabled = disabled;
            });
        }

        startTimer(seconds) {
            this.stopTimer();
            this.timeLimit = seconds;
            this.timeRemaining = seconds;
            this.lastTickTime = performance.now();
            this.updateTimerUi();

            this.timerInterval = setInterval(() => {
                const now = performance.now();
                const deltaSec = (now - this.lastTickTime) / 1000;
                this.lastTickTime = now;
                this.timeRemaining = Math.max(0, this.timeRemaining - deltaSec);

                this.updateTimerUi();

                // Tick sound during final 5 seconds
                if (this.timeRemaining <= 5.0 && this.timeRemaining > 0) {
                    if (Math.floor(this.timeRemaining + deltaSec) !== Math.floor(this.timeRemaining)) {
                        this.sound.playSynthFallback("tick");
                    }
                }

                if (this.timeRemaining <= 0) {
                    this.stopTimer();
                    this.handleTimeout();
                }
            }, 50);
        }

        stopTimer() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        }

        updateTimerUi() {
            const fraction = Math.max(0, this.timeRemaining / this.timeLimit);
            const pct = (fraction * 100).toFixed(1);

            this.dom.timerDisplay.textContent = `${this.timeRemaining.toFixed(1)}s`;
            this.dom.timerBar.style.width = `${pct}%`;

            if (fraction > 0.5) {
                this.dom.timerBar.style.backgroundColor = "#39ff14";
                this.dom.timerDisplay.style.color = "#39ff14";
            } else if (fraction > 0.2) {
                this.dom.timerBar.style.backgroundColor = "#ff7518";
                this.dom.timerDisplay.style.color = "#ff7518";
            } else {
                this.dom.timerBar.style.backgroundColor = "#ff2a2a";
                this.dom.timerDisplay.style.color = "#ff2a2a";
            }
        }

        async handleAnswerSelect(selectedAnswer, index, buttonEl) {
            if (this.isAnswerPending || this.isFeedbackActive) return;
            this.isAnswerPending = true;
            this.stopTimer();
            this.setAnswerButtonsDisabled(true);

            buttonEl.classList.add("selected");
            const timeTaken = parseFloat((this.timeLimit - this.timeRemaining).toFixed(2));

            try {
                const res = await fetch(`/api/quiz/${this.sessionId}/answer`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        answer: selectedAnswer,
                        time_taken: timeTaken,
                    }),
                });

                if (!res.ok) throw new Error("Failed to submit answer");
                const result = await res.json();
                this.showAnswerResult(result, selectedAnswer);
            } catch (err) {
                console.error("Error submitting answer:", err);
                this.isAnswerPending = false;
                this.setAnswerButtonsDisabled(false);
            }
        }

        async handleTimeout() {
            if (this.isAnswerPending || this.isFeedbackActive) return;
            this.isAnswerPending = true;
            this.setAnswerButtonsDisabled(true);

            try {
                const res = await fetch(`/api/quiz/${this.sessionId}/timeout`, {
                    method: "POST",
                });

                if (!res.ok) throw new Error("Timeout call failed");
                const result = await res.json();
                this.showAnswerResult(result, "[TIME EXPIRED]");
            } catch (err) {
                console.error("Error processing timeout:", err);
                this.isAnswerPending = false;
                this.setAnswerButtonsDisabled(false);
            }
        }

        showAnswerResult(result, selectedAnswer) {
            this.isFeedbackActive = true;
            this.currentScore = result.total_score;
            this.currentStreak = result.streak;
            this.nextQuestionData = result.next_question;
            this.isGameOver = result.is_game_over;

            // Endless mode strike deduction
            if (this.gameMode === "endless" && !result.is_correct) {
                this.strikesRemaining = Math.max(0, this.strikesRemaining - 1);
                this.updateStrikesUi();
            }

            const newAchievements = this.recordProgress(result);

            // Highlight buttons
            const buttons = this.dom.optionsGrid.querySelectorAll(".option-btn");
            buttons.forEach((btn) => {
                const optText = btn.getAttribute("data-answer");
                btn.disabled = true;
                if (optText.toLowerCase() === result.correct_answer.toLowerCase()) {
                    btn.classList.add("correct");
                } else if (optText.toLowerCase() === selectedAnswer.toLowerCase()) {
                    btn.classList.add("incorrect");
                }
            });

            // Audio & Feedback Content
            if (result.is_correct) {
                this.sound.play("correct");
                this.vibrate([18]);
                this.dom.feedbackStatus.textContent = "✨ Correct! Spooky Genius!";
                this.dom.feedbackStatus.className = "feedback-title correct-msg";
                this.dom.feedbackPoints.textContent = `+${result.points_awarded - result.time_bonus} pts`;
                this.dom.feedbackBonus.textContent = result.time_bonus > 0 ? `+${result.time_bonus} fast time bonus!` : "";
            } else {
                this.sound.play("incorrect");
                this.vibrate([30, 35, 30]);
                this.dom.feedbackStatus.textContent = "💀 Missed! Wandering in the dark...";
                this.dom.feedbackStatus.className = "feedback-title incorrect-msg";
                this.dom.feedbackPoints.textContent = "+0 pts";
                this.dom.feedbackBonus.textContent = `Correct answer: ${result.correct_answer}`;
            }

            const explanation = result.explanation ? `Why: ${result.explanation}` : "";
            this.dom.feedbackExplanation.textContent = explanation;

            // Spooky category fun fact
            const fact = CATEGORY_FACTS[this.currentQuestion.category];
            if (this.dom.feedbackFunfactBox && this.dom.feedbackFunfact) {
                if (fact) {
                    this.dom.feedbackFunfact.textContent = fact;
                    this.dom.feedbackFunfactBox.classList.remove("hidden");
                } else {
                    this.dom.feedbackFunfactBox.classList.add("hidden");
                }
            }

            // Server achievement + local achievements
            const allEarned = [...newAchievements];
            if (result.achievement_unlocked && !allEarned.includes(result.achievement_unlocked)) {
                allEarned.push(result.achievement_unlocked);
            }

            if (allEarned.length > 0) {
                this.dom.feedbackAchievement.textContent = `🏅 ${allEarned.join(" · ")}`;
                this.dom.feedbackAchievement.classList.remove("hidden");
                allEarned.forEach((badge) => this.showToast("Achievement Unlocked!", badge, "🏆"));
            } else {
                this.dom.feedbackAchievement.classList.add("hidden");
            }

            this.dom.liveScore.textContent = this.currentScore;
            this.dom.streakCount.textContent = `${this.currentStreak} Streak`;

            this.dom.feedbackPanel.classList.remove("hidden");
            this.dom.btnNextQuestion.focus();
        }

        vibrate(pattern) {
            if (!this.hapticEnabled) return;
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
                document.documentElement.classList.contains("reduced-motion")) {
                return;
            }
            if (navigator.vibrate) navigator.vibrate(pattern);
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
            const category = this.currentQuestion.category;
            const mastery = progress.mastery[category] || { answered: 0, correct: 0 };
            mastery.answered += 1;
            if (result.is_correct) mastery.correct += 1;
            progress.mastery[category] = mastery;
            this.roundAnswered += 1;
            if (result.is_correct) this.roundCorrect += 1;

            const unlocked = [];
            const unlock = (key, label) => {
                if (!progress.achievements[key]) {
                    progress.achievements[key] = true;
                    unlocked.push(label);
                }
            };

            if (result.streak >= 3) unlock("ghost_hunter", "Ghost Hunter");
            if (result.streak >= 5) unlock("night_stalker", "Night Stalker");
            if (result.streak >= 10) unlock("possessed", "Possessed");
            if (result.is_game_over && this.roundCorrect === this.roundAnswered) unlock("perfect_round", "Perfect Séance");
            if (result.is_game_over && this.currentQuestion.difficulty === "hard" && (this.roundCorrect / this.roundAnswered) >= 0.7) {
                unlock("hard_survivor", "Hard Mode Survivor");
            }
            if (this.gameMode === "endless" && result.streak >= 10) {
                unlock("endless_slayer", "Endless Slayer");
            }
            if (this.gameMode === "daily" && result.is_game_over) {
                unlock("daily_victor", "Daily Haunt Victor");
            }

            localStorage.setItem("halloween_progress_v2", JSON.stringify(progress));
            return unlocked;
        }

        advanceToNext() {
            if (!this.isFeedbackActive) return;

            if (this.isGameOver) {
                this.finishGame();
            } else if (this.nextQuestionData) {
                this.renderQuestion(this.nextQuestionData);
            }
        }

        async finishGame() {
            this.stopTimer();
            this.sound.stopBackgroundAmbience(true, 450);
            this.updateAudioControlsUi();

            try {
                const res = await fetch(`/api/quiz/${this.sessionId}`);
                if (!res.ok) throw new Error("Failed to load summary");
                const data = await res.json();
                const summary = data.summary || {};

                this.dom.statFinalScore.textContent = data.score;
                this.dom.statAccuracy.textContent = `${summary.percentage || 0}%`;
                this.dom.statCorrect.textContent = `${summary.correct_count || 0}/${summary.total_questions || 10}`;
                this.dom.statMaxStreak.textContent = summary.max_streak || 0;

                // Render review list
                this.dom.reviewList.innerHTML = "";
                const history = summary.history || [];
                history.forEach((h, idx) => {
                    const row = document.createElement("div");
                    row.className = `review-item ${h.is_correct ? "item-correct" : "item-incorrect"}`;
                    row.innerHTML = `
                        <div class="review-header">
                            <span class="review-index">#${idx + 1}</span>
                            <span class="review-q">${this.escapeHtml(h.question)}</span>
                            <span class="review-badge">${h.is_correct ? "✔ Correct" : "✖ Missed"}</span>
                        </div>
                        <div class="review-answers">
                            <div>Your Answer: <strong>${this.escapeHtml(h.selected_answer)}</strong></div>
                            ${!h.is_correct ? `<div>Correct: <strong class="correct-text">${this.escapeHtml(h.correct_answer)}</strong></div>` : ""}
                        </div>
                    `;
                    this.dom.reviewList.appendChild(row);
                });

                this.sound.play("congrats");
                this.confetti.burst();
                this.showScreen("gameover");
            } catch (err) {
                console.error("Error loading finish summary:", err);
                this.showScreen("start");
            }
        }

        // ==========================================
        // SHARE SURVIVAL CARD
        // ==========================================
        async shareSurvivalCard() {
            const score = this.dom.statFinalScore.textContent;
            const accuracy = this.dom.statAccuracy.textContent;
            const correct = this.dom.statCorrect.textContent;
            const maxStreak = this.dom.statMaxStreak.textContent;
            const mode = this.gameMode.toUpperCase();

            const shareText = `🎃 Halloween Quiz Survival Card 🎃\n` +
                `Score: ${score} pts | Accuracy: ${accuracy} (${correct})\n` +
                `Max Streak: ${maxStreak} 🔥 | Mode: ${mode}\n` +
                `Dare to enter the crypt: ${window.location.origin}`;

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: "Halloween Quiz Survival Card",
                        text: shareText,
                        url: window.location.origin,
                    });
                    return;
                } catch (_) {
                    // User cancelled or share rejected; fallback to clipboard
                }
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(shareText);
                if (this.dom.shareFeedback) {
                    this.dom.shareFeedback.classList.remove("hidden");
                    setTimeout(() => this.dom.shareFeedback.classList.add("hidden"), 3000);
                }
                this.showToast("Card Copied to Clipboard!", "Share your score with fellow ghost hunters.", "📋");
            }
        }

        // ==========================================
        // LEADERBOARD MODAL
        // ==========================================
        async openLeaderboard() {
            this.dom.modalLeaderboard.classList.remove("hidden");
            this.fetchLeaderboard(null, null);
        }

        closeLeaderboard() {
            this.dom.modalLeaderboard.classList.add("hidden");
        }

        async fetchLeaderboard(difficulty = null, mode = null) {
            this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">Summoning records from the crypt...</td></tr>`;

            try {
                let url = "/api/leaderboard?limit=25";
                if (difficulty) url += `&difficulty=${encodeURIComponent(difficulty)}`;
                if (mode) url += `&mode=${encodeURIComponent(mode)}`;

                const res = await fetch(url);
                if (!res.ok) throw new Error("Leaderboard fetch failed");
                const data = await res.json();

                if (data.entries.length === 0) {
                    this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">No ghost hunter records recorded yet!</td></tr>`;
                    return;
                }

                this.dom.leaderboardTbody.innerHTML = "";
                data.entries.forEach((entry, idx) => {
                    const tr = document.createElement("tr");
                    const dateStr = entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "-";
                    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`;
                    const entryMode = entry.mode ? entry.mode.toUpperCase() : "CLASSIC";

                    tr.innerHTML = `
                        <td class="rank-col">${medal}</td>
                        <td class="name-col"><strong>${this.escapeHtml(entry.player_name)}</strong></td>
                        <td><span class="badge badge-${entry.difficulty}">${entry.difficulty.toUpperCase()}</span></td>
                        <td><span class="badge badge-mode">${entryMode}</span></td>
                        <td class="score-col">${entry.score.toLocaleString()}</td>
                        <td>${entry.percentage}%</td>
                        <td class="date-col">${dateStr}</td>
                    `;
                    this.dom.leaderboardTbody.appendChild(tr);
                });
            } catch (err) {
                console.error("Leaderboard error:", err);
                this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="7" style="color:#ff5a5a;text-align:center;padding:24px;">Failed to load leaderboard.</td></tr>`;
            }
        }

        // ==========================================
        // SETTINGS & ACCESSIBILITY MODAL
        // ==========================================
        openSettings() {
            this.syncSettingsUi();
            this.dom.modalSettings?.classList.remove("hidden");
        }

        closeSettings() {
            this.dom.modalSettings?.classList.add("hidden");
        }

        // ==========================================
        // MASTERY & PROGRESSION MODAL
        // ==========================================
        openMastery() {
            this.renderMasteryModal();
            this.dom.modalMastery?.classList.remove("hidden");
        }

        closeMastery() {
            this.dom.modalMastery?.classList.add("hidden");
        }

        renderMasteryModal() {
            const progress = this.getProgress();

            // Render Badges
            if (this.dom.badgesGrid) {
                this.dom.badgesGrid.innerHTML = "";
                ALL_BADGES.forEach((badge) => {
                    const unlocked = Boolean(progress.achievements[badge.id]);
                    const el = document.createElement("div");
                    el.className = `badge-item ${unlocked ? "unlocked" : "locked"}`;
                    el.innerHTML = `
                        <div class="badge-icon">${unlocked ? badge.icon : "🔒"}</div>
                        <div class="badge-info">
                            <strong>${badge.name}</strong>
                            <small>${badge.desc}</small>
                        </div>
                    `;
                    this.dom.badgesGrid.appendChild(el);
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
                    const tier = getMasteryTier(pct);

                    const el = document.createElement("div");
                    el.className = "mastery-item";
                    el.innerHTML = `
                        <div class="mastery-header">
                            <span class="mastery-name">${cat.icon} ${cat.name}</span>
                            <span class="mastery-tier">${tier.icon} ${tier.title}</span>
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
        }

        escapeHtml(str) {
            if (!str) return "";
            const div = document.createElement("div");
            div.textContent = str;
            return div.innerHTML;
        }
    }

    // Initialize application when DOM is ready
    document.addEventListener("DOMContentLoaded", () => {
        window.halloweenApp = new HalloweenQuizApp();
    });
})();
