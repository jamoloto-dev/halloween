/**
 * 🎃 Spooky Master (Halloween Quiz) - Quiz Lifecycle & Gameplay Engine Module
 * Manages game sessions, question rendering (text, visual silhouettes, audio riddles),
 * timer presentation, authoritative scoring responses, trap interactions,
 * round progression, and game over results presentation.
 */

import { escapeHtml, triggerHaptic, generateProceduralStory, CATEGORY_FACTS, getMasteryTier } from "./utils.js";

export class QuizLifecycleManager {
    constructor(app) {
        this.app = app;
        this.questionTimer = null;
        this.timerInterval = null;
        this.currentQuestion = null;
        this.nextQuestionData = null;
        this.isAnswerPending = false;
        this.isFeedbackActive = false;
        this.timerRemaining = 0;
        this.timerTotal = 0;
        this.timeQuestionStarted = 0;
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

    async startGame() {
        const formData = new FormData(this.dom.formStart);
        const playerName = (formData.get("player_name") || this.profile.nickname || "Ghost Hunter").trim();
        const difficulty = formData.get("difficulty") || "medium";
        const mode = formData.get("mode") || "classic";
        this.app.gameMode = mode;

        if (playerName !== this.profile.nickname) {
            this.app.updateNickname(playerName);
        }

        let numQuestions = parseInt(formData.get("num_questions") || "10", 10);
        if (mode === "quick") numQuestions = 5;
        else if (mode === "deep") numQuestions = 15;
        else if (mode === "endless") numQuestions = 50;
        else if (mode === "daily") numQuestions = 10;

        const selectedCategories = formData.getAll("categories");
        if (selectedCategories.length === 0) {
            alert("Please select at least one category!");
            this.app.showNotice("Please select at least one category to enter the crypt!", "warning");
            return;
        }

        try {
            this.sound.startBackgroundAmbience();
            let timeLimit = difficulty === "easy" ? 30 : difficulty === "hard" ? 15 : 20;
            if (mode === "panic") timeLimit = 10;

            const res = await fetch("/api/quiz/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Player-ID": this.profile?.player_id || "player_default",
                },
                body: JSON.stringify({
                    player_name: playerName,
                    difficulty: difficulty,
                    mode: mode,
                    categories: selectedCategories,
                    num_questions: numQuestions,
                    time_limit_per_question: timeLimit,
                    avatar_id: this.profile?.avatar_id || "pumpkin_hunter",
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                this.sound.stopBackgroundAmbience(true);
                alert(err.detail || "Failed to start quiz.");
                return;
            }

            const data = await res.json();
            this.app.sessionId = data.session_id;
            this.app.currentScore = 0;
            this.app.currentStreak = 0;
            this.app.roundCorrect = 0;
            this.app.roundAnswered = 0;
            this.app.strikesRemaining = 3;

            // Mode-specific HUD elements
            if (this.dom.qModeBadge) {
                const modeLabels = {
                    classic: "🎃 Classic",
                    quick: "⚡ Quick",
                    deep: "📖 Deep",
                    panic: "⏳ Panic",
                    endless: "💀 Endless",
                    daily: "🕯️ Daily",
                    adaptive: "🧠 Adaptive",
                };
                const mKey = (data.mode || mode || "").toLowerCase();
                this.dom.qModeBadge.textContent = modeLabels[mKey] || (data.mode || mode).toUpperCase();
            }

            if (this.dom.hudStrikes) {
                if (mode === "endless") {
                    this.dom.hudStrikes.classList.remove("hidden");
                    this.updateStrikesUi();
                } else {
                    this.dom.hudStrikes.classList.add("hidden");
                }
            }

            this.sound.play("quiz_start");
            this.app.isGameOver = false;
            this.renderQuestion(data.first_question);
            this.app.showScreen("quiz");
        } catch (err) {
            console.error("Error starting game:", err);
            this.sound.stopBackgroundAmbience(true);
            alert("Could not connect to game server. Please try again.");
        }
    }

    async startGameWithParams(extraParams = {}) {
        this.sound.unlock();
        this.sound.startBackgroundAmbience();

        const playerName = this.profile.nickname || "Ghost Hunter";
        const difficulty = extraParams.difficulty || "medium";
        const mode = extraParams.mode || this.app.gameMode || "classic";
        this.app.gameMode = mode;

        try {
            const body = {
                player_name: playerName,
                difficulty: difficulty,
                mode: mode,
                avatar_id: this.profile.avatar_id || "pumpkin_hunter",
                ...extraParams,
            };

            const res = await fetch("/api/quiz/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Player-ID": this.profile?.player_id || "player_default",
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                this.sound.stopBackgroundAmbience(true);
                throw new Error(err.detail || "Failed to launch game.");
            }

            const data = await res.json();
            this.app.sessionId = data.session_id;
            this.app.currentScore = 0;
            this.app.currentStreak = 0;
            this.app.roundCorrect = 0;
            this.app.roundAnswered = 0;
            this.app.strikesRemaining = 3;

            if (this.dom.qModeBadge) {
                this.dom.qModeBadge.textContent = (data.mode || mode).toUpperCase();
            }

            if (this.dom.hudStrikes) {
                if (mode === "endless") {
                    this.dom.hudStrikes.classList.remove("hidden");
                    this.updateStrikesUi();
                } else {
                    this.dom.hudStrikes.classList.add("hidden");
                }
            }

            this.sound.play("quiz_start");
            this.app.isGameOver = false;
            this.renderQuestion(data.first_question);
            this.app.showScreen("quiz");
        } catch (err) {
            console.error("Start game with params error:", err);
            this.app.showNotice(err.message || "Failed to start round. Please try again.");
        }
    }

    updateStrikesUi() {
        if (!this.dom.strikeIcons) return;
        const strikes = this.app.strikesRemaining ?? 3;
        if (strikes === 3) {
            this.dom.strikeIcons.textContent = "💚 💚 💚";
        } else if (strikes === 2) {
            this.dom.strikeIcons.textContent = "💚 💚 🖤";
        } else if (strikes === 1) {
            this.dom.strikeIcons.textContent = "💚 🖤 🖤";
        } else {
            this.dom.strikeIcons.textContent = "💀 🖤 🖤";
        }
    }

    renderQuestion(qView) {
        if (!qView) return;
        this.currentQuestion = qView;
        this.app.currentQuestion = qView;
        this.isAnswerPending = false;
        this.isFeedbackActive = false;
        this.app.isAnswerPending = false;
        this.app.isFeedbackActive = false;

        // Reset Panels
        this.dom.feedbackPanel?.classList.add("hidden");
        this.dom.feedbackAdaptiveBox?.classList.add("hidden");

        // Question HUD
        const counterText = this.app.gameMode === "endless"
            ? `Survived: ${this.app.roundCorrect} Qs`
            : `Question ${qView.index} of ${qView.total_questions}`;
        if (this.dom.qCounter) {
            this.dom.qCounter.textContent = counterText;
        }
        if (this.dom.qProgressText) {
            this.dom.qProgressText.textContent = counterText;
        }
        if (this.dom.qCategoryBadge) {
            this.dom.qCategoryBadge.textContent = `${qView.category_icon} ${qView.category_name}`;
        }
        if (this.dom.qDifficultyBadge) {
            this.dom.qDifficultyBadge.textContent = qView.difficulty.toUpperCase();
            this.dom.qDifficultyBadge.className = `badge badge-${qView.difficulty}`;
        }
        if (this.dom.liveScore) {
            this.dom.liveScore.textContent = this.app.currentScore;
        }
        if (this.dom.qScoreHud) {
            this.dom.qScoreHud.textContent = `Score: ${this.app.currentScore}`;
        }
        if (this.dom.streakCount) {
            this.dom.streakCount.textContent = `${this.app.currentStreak} Streak`;
        }
        if (this.dom.qStreakHud) {
            this.dom.qStreakHud.textContent = `🔥 ${this.app.currentStreak}`;
        }

        // Question Text
        this.dom.questionText.textContent = qView.question;
        this.dom.questionText.classList.remove("fog-active", "fog-reduced-motion");

        // Multimedia Trivia: Visual Image Clues
        const mediaContainer = document.getElementById("quiz-media-container");
        const mediaImg = document.getElementById("quiz-media-img");
        const mediaCaption = document.getElementById("quiz-media-caption");

        if (qView.media_type === "image" && qView.media_url && mediaContainer && mediaImg) {
            mediaContainer.classList.remove("hidden");
            mediaImg.src = qView.media_url;
            mediaImg.alt = qView.media_alt || "Visual trivia clue illustration";
            if (mediaCaption) {
                if (qView.media_caption) {
                    mediaCaption.textContent = qView.media_caption;
                    mediaCaption.classList.remove("hidden");
                } else {
                    mediaCaption.classList.add("hidden");
                }
            }
        } else if (mediaContainer) {
            mediaContainer.classList.add("hidden");
        }

        // Audio Riddle Handling
        if (qView.audio_clip_id) {
            this.app.activeRiddleClip = qView.audio_clip_id;
            this.dom.audioRiddlePanel?.classList.remove("hidden");
            if (this.dom.riddleTranscriptText) {
                this.dom.riddleTranscriptText.textContent = qView.accessible_transcript || "Listen to identify the spectral presence.";
            }
            this.dom.riddleTranscriptBox?.classList.add("hidden");
        } else {
            this.app.activeRiddleClip = null;
            this.dom.audioRiddlePanel?.classList.add("hidden");
        }

        // Duel Trap Handling
        const activeTrap = qView.active_trap || (this.app.activeDuelTraps && this.app.activeDuelTraps.length > 0 ? this.app.activeDuelTraps[(qView.index - 1) % this.app.activeDuelTraps.length] : null);
        if (activeTrap && this.dom.duelTrapBanner) {
            this.dom.duelTrapBanner.classList.remove("hidden");
            const trapNames = {
                ghost_fog: { icon: "👻", name: "Ghost Fog", desc: "Question text will fade after 2s" },
                cursed_clock: { icon: "⏰", name: "Cursed Clock", desc: "Sands of time drain faster!" },
                swarm: { icon: "🦇", name: "Bat Swarm", desc: "Answers scattered by the swarm" },
                flickering_candle: { icon: "🕯️", name: "Flickering Candle", desc: "Lighting fluctuates" },
            };
            const meta = trapNames[activeTrap] || { icon: "💀", name: "Active Trap", desc: "" };
            if (this.dom.duelTrapIcon) this.dom.duelTrapIcon.textContent = meta.icon;
            if (this.dom.duelTrapText) this.dom.duelTrapText.textContent = `Active Trap: ${meta.name} — ${meta.desc}`;

            if (activeTrap === "ghost_fog") {
                const isReduced = this.profile?.preferences?.reduced_motion;
                if (isReduced) {
                    this.dom.questionText.classList.add("fog-reduced-motion");
                } else {
                    setTimeout(() => {
                        if (!this.isAnswerPending && !this.isFeedbackActive && this.dom.questionText) {
                            this.dom.questionText.classList.add("fog-active");
                        }
                    }, 2000);
                }
            } else if (activeTrap === "swarm") {
                setTimeout(() => {
                    if (!this.isAnswerPending && !this.isFeedbackActive && this.dom.optionsGrid) {
                        const btns = Array.from(this.dom.optionsGrid.children);
                        btns.sort(() => Math.random() - 0.5);
                        btns.forEach((b) => this.dom.optionsGrid.appendChild(b));
                    }
                }, 1200);
            }
        } else {
            this.dom.duelTrapBanner?.classList.add("hidden");
        }

        // Spooky Guide & Boosters HUD
        this.app.currentHintLevel = 1;
        this.dom.quizSpookyGuideBox?.classList.add("hidden");
        this.dom.adaptiveChallengeBanner?.classList.add("hidden");

        if (this.app.gameMode === "daily" || this.app.gameMode === "duel") {
            this.dom.boosterHudBar?.classList.add("hidden");
            this.dom.btnAskSpookyGuide?.classList.add("hidden");
        } else {
            this.dom.boosterHudBar?.classList.remove("hidden");
            this.dom.btnAskSpookyGuide?.classList.remove("hidden");
            this.app.updateBoosterHud?.();
        }

        // Render Options Grid
        this.dom.optionsGrid.innerHTML = "";
        const keyLetters = ["A", "B", "C", "D", "E", "F"];

        qView.options.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "option-btn";
            btn.setAttribute("role", "radio");
            btn.setAttribute("aria-checked", "false");
            btn.setAttribute("data-option-index", idx);

            const keyLetter = keyLetters[idx] || (idx + 1).toString();
            btn.innerHTML = `
                <span class="option-key">${keyLetter}</span>
                <span class="option-label">${escapeHtml(opt)}</span>
            `;

            btn.addEventListener("click", () => this.selectAnswer(opt, btn));
            this.dom.optionsGrid.appendChild(btn);
        });

        // Start Question Timer
        let limit = qView.time_limit || 20;
        if (activeTrap === "cursed_clock") {
            limit = Math.max(5, Math.round(limit * 0.7));
        }
        this.startQuestionTimer(limit);
    }

    startQuestionTimer(timeLimit) {
        this.stopQuestionTimer();
        this.timerTotal = timeLimit;
        this.timerRemaining = timeLimit;
        this.timeQuestionStarted = Date.now();

        this.updateTimerHud(this.timerRemaining, this.timerTotal);

        this.timerInterval = setInterval(() => {
            this.timerRemaining -= 1;
            this.updateTimerHud(this.timerRemaining, this.timerTotal);

            if (this.timerRemaining <= 5 && this.timerRemaining > 0) {
                this.sound.play("timer_warning");
            }

            if (this.timerRemaining <= 0) {
                this.stopQuestionTimer();
                this.handleTimeout();
            }
        }, 1000);
    }

    stopQuestionTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerHud(remaining, total) {
        if (!this.dom.timerProgress || !this.dom.timerText) return;
        const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
        this.dom.timerProgress.style.width = `${pct}%`;
        this.dom.timerText.textContent = `${Math.max(0, remaining)}s`;

        if (pct < 25) {
            this.dom.timerProgress.className = "timer-bar-fill timer-danger";
        } else if (pct < 50) {
            this.dom.timerProgress.className = "timer-bar-fill timer-warning";
        } else {
            this.dom.timerProgress.className = "timer-bar-fill timer-normal";
        }
    }

    selectAnswer(answerText, buttonElement) {
        if (this.isAnswerPending || this.isFeedbackActive) return;
        this.isAnswerPending = true;
        this.app.isAnswerPending = true;
        this.stopQuestionTimer();

        this.dom.optionsGrid.querySelectorAll(".option-btn").forEach((b) => {
            b.classList.remove("selected");
            b.setAttribute("aria-checked", "false");
            b.disabled = true;
        });

        if (buttonElement) {
            buttonElement.classList.add("selected");
            buttonElement.setAttribute("aria-checked", "true");
        }

        this.submitAnswer(answerText);
    }

    async submitAnswer(answerText, boosterUsed = null) {
        const timeTaken = Math.max(0.1, (Date.now() - this.timeQuestionStarted) / 1000);

        try {
            const res = await fetch(`/api/quiz/${this.app.sessionId}/answer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Player-ID": this.profile?.player_id || "player_default",
                },
                body: JSON.stringify({
                    answer: answerText,
                    time_taken: timeTaken,
                    booster_used: boosterUsed,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || "Answer submission failed.");
            }

            const result = await res.json();
            this.showAnswerResult(result, answerText);
        } catch (err) {
            console.error("Submit answer error:", err);
            this.showAnswerResult({
                is_correct: false,
                correct_answer: "Unknown",
                explanation: "Could not sync with the spirits. Continuing...",
                score_delta: 0,
                current_score: this.app.currentScore,
                current_streak: 0,
                is_game_over: false,
            }, answerText);
        }
    }

    async handleTimeout() {
        if (this.isAnswerPending || this.isFeedbackActive) return;
        this.isAnswerPending = true;
        this.app.isAnswerPending = true;
        this.stopQuestionTimer();

        this.dom.optionsGrid.querySelectorAll(".option-btn").forEach((b) => {
            b.disabled = true;
        });

        try {
            const res = await fetch(`/api/quiz/${this.app.sessionId}/timeout`, {
                method: "POST",
                headers: {
                    "X-Player-ID": this.profile?.player_id || "player_default",
                },
            });

            if (!res.ok) throw new Error("Timeout call failed");
            const result = await res.json();
            this.showAnswerResult(result, "[TIME EXPIRED]");
        } catch (err) {
            console.error("Error processing timeout:", err);
            this.showAnswerResult({
                is_correct: false,
                correct_answer: "Unknown",
                explanation: "Time expired in the crypt.",
                score_delta: 0,
                current_score: this.app.currentScore,
                current_streak: 0,
                is_game_over: false,
            }, "[TIME EXPIRED]");
        }
    }

    showAnswerResult(result, selectedAnswer = "") {
        this.isFeedbackActive = true;
        this.app.isFeedbackActive = true;
        const totalScore = result.total_score !== undefined ? result.total_score : (result.current_score !== undefined ? result.current_score : this.app.currentScore);
        const streak = result.streak !== undefined ? result.streak : (result.current_streak !== undefined ? result.current_streak : this.app.currentStreak);
        this.app.currentScore = totalScore;
        this.app.currentStreak = streak;
        this.nextQuestionData = result.next_question;
        this.app.nextQuestionData = result.next_question;
        this.app.isGameOver = Boolean(result.is_game_over);

        if (this.app.gameMode === "endless" && !result.is_correct) {
            this.app.strikesRemaining = Math.max(0, (this.app.strikesRemaining ?? 3) - 1);
            this.updateStrikesUi();
        }

        const newAchievements = this.app.recordProgress ? this.app.recordProgress(result) : [];

        // Progressive Enhancement Haptics
        triggerHaptic(
            result.is_correct ? "correct" : "incorrect",
            this.profile?.preferences?.haptics_enabled !== false
        );

        // Visual options highlight
        const optionsBtns = this.dom.optionsGrid.querySelectorAll(".option-btn");
        optionsBtns.forEach((btn) => {
            const optText = btn.getAttribute("data-answer") || btn.querySelector(".option-label")?.textContent.trim() || "";
            btn.disabled = true;
            if (optText.toLowerCase() === (result.correct_answer || "").toLowerCase()) {
                btn.classList.add("correct");
            } else if (selectedAnswer && optText.toLowerCase() === selectedAnswer.toLowerCase()) {
                btn.classList.add("incorrect");
            } else if (btn.classList.contains("selected") && !result.is_correct) {
                btn.classList.add("incorrect");
            }
        });

        // Audio
        if (result.is_correct) {
            this.sound.play("correct");
            this.app.vibrate?.([18]);
            if (this.dom.feedbackStatus) {
                this.dom.feedbackStatus.textContent = "✨ Correct! Spooky Genius!";
                this.dom.feedbackStatus.className = "feedback-title correct-msg";
            }
            if (this.dom.feedbackPoints) {
                const pts = (result.points_awarded || 0) - (result.time_bonus || 0);
                this.dom.feedbackPoints.textContent = `+${pts} pts`;
            }
            if (this.dom.feedbackBonus) {
                this.dom.feedbackBonus.textContent = result.time_bonus > 0 ? `+${result.time_bonus} fast time bonus!` : "";
            }
        } else {
            this.sound.play(selectedAnswer === "[TIME EXPIRED]" ? "timeout" : "incorrect");
            this.app.vibrate?.([30, 35, 30]);
            if (this.dom.feedbackStatus) {
                this.dom.feedbackStatus.textContent = "💀 Missed! Wandering in the dark...";
                this.dom.feedbackStatus.className = "feedback-title incorrect-msg";
            }
            if (this.dom.feedbackPoints) {
                this.dom.feedbackPoints.textContent = "+0 pts";
            }
            if (this.dom.feedbackBonus) {
                this.dom.feedbackBonus.textContent = `Correct answer: ${result.correct_answer}`;
            }
        }

        if (this.dom.feedbackExplanation) {
            this.dom.feedbackExplanation.textContent = result.explanation ? `Why: ${result.explanation}` : "";
        }

        // Fun Fact
        const categoryKey = this.currentQuestion?.category || this.app.currentQuestion?.category;
        const fact = CATEGORY_FACTS[categoryKey];
        if (this.dom.feedbackFunfactBox && this.dom.feedbackFunfact) {
            if (fact) {
                this.dom.feedbackFunfact.textContent = fact;
                this.dom.feedbackFunfactBox.classList.remove("hidden");
            } else {
                this.dom.feedbackFunfactBox.classList.add("hidden");
            }
        }

        // Achievement unmasked
        const allEarned = Array.isArray(newAchievements) ? [...newAchievements] : [];
        if (result.achievement_unlocked && !allEarned.includes(result.achievement_unlocked)) {
            allEarned.push(result.achievement_unlocked);
        }
        if (allEarned.length > 0) {
            this.sound.play("achievement");
            if (this.dom.feedbackAchievement) {
                this.dom.feedbackAchievement.textContent = `🏅 ${allEarned.join(" · ")}`;
                this.dom.feedbackAchievement.classList.remove("hidden");
            }
            allEarned.forEach((badge) => this.app.showToast?.("Achievement Unlocked!", badge, "🏆"));
        } else if (this.dom.feedbackAchievement) {
            this.dom.feedbackAchievement.classList.add("hidden");
        }

        // Adaptive Scaffolding Feedback
        if (result.adaptive_feedback) {
            const af = result.adaptive_feedback;
            const diff = af.current_difficulty || af.target_difficulty || "medium";
            if (this.dom.feedbackAdaptiveBox && this.dom.feedbackAdaptiveText) {
                this.dom.feedbackAdaptiveText.textContent = af.feedback_message || `Difficulty calibrated to ${diff.toUpperCase()}.`;
                if (this.dom.feedbackAdaptiveBadge) {
                    const badgeIcon = diff === "hard" ? "🔥 Nightmare" : diff === "easy" ? "🌱 Novice" : "🎃 Balanced";
                    this.dom.feedbackAdaptiveBadge.textContent = `${badgeIcon} (${diff.toUpperCase()})`;
                }
                this.dom.feedbackAdaptiveBox.classList.remove("hidden");
            }
            if (af.level_changed && this.dom.adaptiveChallengeBanner) {
                if (this.dom.adaptiveBannerText) {
                    this.dom.adaptiveBannerText.textContent = `Scaffolding: Challenge shifted to ${diff.toUpperCase()}!`;
                }
                this.dom.adaptiveChallengeBanner.classList.remove("hidden");
                setTimeout(() => {
                    this.dom.adaptiveChallengeBanner?.classList.add("hidden");
                }, 3500);
            }
        } else if (this.dom.feedbackAdaptiveBox) {
            this.dom.feedbackAdaptiveBox.classList.add("hidden");
        }

        // HUD Scores
        if (this.dom.liveScore) this.dom.liveScore.textContent = this.app.currentScore;
        if (this.dom.streakCount) this.dom.streakCount.textContent = `${this.app.currentStreak} Streak`;
        if (this.dom.qScoreHud) this.dom.qScoreHud.textContent = `Score: ${this.app.currentScore}`;
        if (this.dom.qStreakHud) this.dom.qStreakHud.textContent = `🔥 ${this.app.currentStreak}`;

        // Feedback Panel
        this.dom.feedbackPanel?.classList.remove("hidden");
        this.dom.btnNextQuestion?.focus();
    }

    advanceToNext() {
        if (!this.isFeedbackActive && !this.app.isFeedbackActive) return;
        if (this.app.isGameOver) {
            this.finishGame();
        } else if (this.nextQuestionData || this.app.nextQuestionData) {
            this.renderQuestion(this.nextQuestionData || this.app.nextQuestionData);
        }
    }

    async finishGame() {
        this.stopQuestionTimer();
        this.sound.stopBackgroundAmbience(true, 450);
        this.app.syncSettingsUi?.();

        try {
            const res = await fetch(`/api/quiz/${this.app.sessionId}`);
            if (!res.ok) throw new Error("Failed to load summary");
            const data = await res.json();
            const summary = data.summary || {};

            // Update Profile Stats
            if (this.profile && this.profile.stats) {
                this.profile.stats.games_played += 1;
                if (data.score > this.profile.stats.best_score) {
                    this.profile.stats.best_score = data.score;
                }
                this.app.saveProfile?.();
            }

            if (this.dom.statFinalScore) this.dom.statFinalScore.textContent = data.score;
            if (this.dom.statAccuracy) this.dom.statAccuracy.textContent = `${summary.percentage || 0}%`;
            if (this.dom.statCorrect) this.dom.statCorrect.textContent = `${summary.correct_count || 0}/${summary.total_questions || 10}`;
            if (this.dom.statMaxStreak) this.dom.statMaxStreak.textContent = summary.max_streak || 0;

            // Populate Visual Survival Share Card
            const currentAvatar = this.app.getAvatarById?.(this.profile?.avatar_id);
            const masteryTier = getMasteryTier(summary.percentage || 0);
            if (this.dom.shareCardAvatar && currentAvatar) this.dom.shareCardAvatar.src = currentAvatar.asset;
            if (this.dom.shareCardHunterName) this.dom.shareCardHunterName.textContent = this.profile?.nickname || "Ghost Hunter";
            if (this.dom.shareCardTierBadge) this.dom.shareCardTierBadge.textContent = `${masteryTier.title} ${masteryTier.icon}`;
            if (this.dom.shareCardScore) this.dom.shareCardScore.textContent = Number(data.score || 0).toLocaleString();
            if (this.dom.shareCardAcc) this.dom.shareCardAcc.textContent = `${summary.percentage || 0}%`;
            if (this.dom.shareCardStreak) this.dom.shareCardStreak.textContent = `${summary.max_streak || 0} 🔥`;
            if (this.dom.shareCardModeBadge) this.dom.shareCardModeBadge.textContent = (this.app.gameMode || "classic").toUpperCase();

            // Render review list
            if (this.dom.reviewList) {
                this.dom.reviewList.innerHTML = "";
                const history = summary.history || [];
                history.forEach((h, idx) => {
                    const row = document.createElement("div");
                    row.className = `review-item ${h.is_correct ? "item-correct" : "item-incorrect"}`;
                    row.innerHTML = `
                        <div class="review-header">
                            <span class="review-index">#${idx + 1}</span>
                            <span class="review-q">${escapeHtml(h.question)}</span>
                            <span class="review-badge">${h.is_correct ? "✔ Correct" : "✖ Missed"}</span>
                        </div>
                        <div class="review-answers">
                            <div>Your Answer: <strong>${escapeHtml(h.selected_answer)}</strong></div>
                            ${!h.is_correct ? `<div>Correct: <strong class="correct-text">${escapeHtml(h.correct_answer)}</strong></div>` : ""}
                        </div>
                    `;
                    this.dom.reviewList.appendChild(row);
                });
            }

            this.app.confetti?.burst();
            this.app.addDiamonds?.(5, "Round Completed", `round_${this.app.sessionId}`);

            // Campaign Stage Completion Handling
            if (this.app.gameMode === "campaign" && this.app.currentStageId) {
                const accuracyPct = summary.percentage || 0;
                let stars = 1;
                if (accuracyPct >= 90) stars = 3;
                else if (accuracyPct >= 75) stars = 2;

                const stageReward = 25;
                if (this.profile?.campaign && !this.profile.campaign.claimed_stage_rewards[this.app.currentStageId]) {
                    this.profile.campaign.claimed_stage_rewards[this.app.currentStageId] = true;
                    this.app.addDiamonds?.(stageReward, `Stage Cleared: ${this.app.currentStageId}`, `stage_${this.app.currentStageId}`);
                }

                if (this.profile?.campaign) {
                    const prev = this.profile.campaign.completed_stages[this.app.currentStageId] || {};
                    this.profile.campaign.completed_stages[this.app.currentStageId] = {
                        stars: Math.max(stars, prev.stars || 0),
                        score: Math.max(data.score, prev.score || 0),
                        completed_at: new Date().toISOString(),
                    };
                    this.app.saveProfile?.();
                }

                this.sound.play("stage_complete");
                this.app.showToast?.("Stage Complete!", `Awarded ${stars} ⭐ and 💎 ${stageReward}`, "🗺️");
            } else {
                this.sound.play("round_complete");
            }

            // Duel Submission Handling
            if (this.app.gameMode === "duel" && this.app.activeDuelCode) {
                try {
                    const duelPayload = {
                        player_id: this.profile?.player_id,
                        player_name: this.profile?.nickname,
                        avatar_id: this.profile?.avatar_id,
                        score: data.score,
                        accuracy: summary.percentage || 0,
                        streak: summary.max_streak || 0,
                        time_taken_seconds: 25.0,
                        is_creator: this.app.isDuelCreator,
                    };
                    const duelRes = await fetch(`/api/duels/${this.app.activeDuelCode}/submit`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(duelPayload),
                    });
                    if (duelRes.ok) {
                        const duelData = await duelRes.json();
                        if (duelData.winner_id) {
                            const won = duelData.winner_id === this.profile?.player_id;
                            this.app.showToast?.(won ? "⚔️ Duel Victory!" : "💀 Duel Defeat", duelData.reason, won ? "🏆" : "💀");
                        } else {
                            this.app.showToast?.("Duel Score Recorded!", "Awaiting rival hunter's round.", "⏳");
                        }
                    }
                } catch (e) {
                    console.warn("Duel score submit error:", e);
                }
            }

            this.app.fetchCommunityStats?.();
            this.app.showScreen("gameover");
        } catch (err) {
            console.error("Error loading finish summary:", err);
            this.app.showScreen("start");
        }
    }
}
