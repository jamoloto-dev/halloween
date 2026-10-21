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

        let selectedCategories = formData.getAll("categories");
        if (selectedCategories.length === 0) {
            const checked = Array.from(document.querySelectorAll("input[name='categories']:checked")).map((el) => el.value);
            if (checked.length > 0) {
                selectedCategories = checked;
            }
        }
        if (selectedCategories.length === 0) {
            this.app.showNotice("Please select at least one category to enter the crypt!", "warning");
            alert("Please select at least one category!");
            return;
        }

        try {
            this.app.closeAllModals?.();
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
                const err = await res.json().catch(() => ({}));
                this.sound.stopBackgroundAmbience(true);
                this.app.showNotice(err.detail || "Failed to start quiz.", "warning");
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
            const screenQuizEl = document.getElementById("screen-quiz");
            if (screenQuizEl) {
                screenQuizEl.setAttribute("data-active-mode", (data.mode || mode || "classic").toLowerCase());
            }
            if (this.dom.qModeBadge) {
                const modeLabels = {
                    classic: "🎃 Classic",
                    quick: "⚡ Quick",
                    deep: "📖 Deep",
                    panic: "⏳ Panic",
                    endless: "💀 Endless",
                    daily: "🕯️ Daily",
                    adaptive: "🧠 Adaptive",
                    campaign: "🗺️ Campaign",
                    duel: "⚔️ Duel",
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
            this.app.showNotice("Could not connect to game server. Please try again.", "warning");
        }
    }

    async startGameWithParams(extraParams = {}) {
        this.app.closeAllModals?.();
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

            const screenQuizEl = document.getElementById("screen-quiz");
            if (screenQuizEl) {
                screenQuizEl.setAttribute("data-active-mode", (data.mode || mode || "classic").toLowerCase());
            }
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

        // Reset Panels & Tension States
        this.dom.feedbackPanel?.classList.add("hidden");
        this.dom.feedbackAdaptiveBox?.classList.add("hidden");
        document.getElementById("active-quiz-card")?.classList.remove("timer-critical", "timer-warning-state");
        const deltaBadge = document.getElementById("hud-score-delta");
        if (deltaBadge) {
            deltaBadge.classList.add("hidden");
            deltaBadge.classList.remove("delta-pop");
        }

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

        if (!timeLimit || timeLimit <= 0) {
            this.timerTotal = 0;
            this.timerRemaining = 0;
            this.updateTimerHud(0, 0);
            return;
        }

        this.timerTotal = timeLimit;
        this.timerRemaining = timeLimit;
        this.timeQuestionStarted = Date.now();
        this.questionDeadline = Date.now() + (timeLimit * 1000);
        this.isTimingOut = false;
        this.isAnswerPending = false;
        this.isFeedbackActive = false;
        this.app.isAnswerPending = false;
        this.app.isFeedbackActive = false;
        this.lastWarningSecond = null;

        this.updateTimerHud(this.timerRemaining, this.timerTotal);

        this.timerInterval = setInterval(() => {
            if (this.isTimingOut || this.isAnswerPending || this.isFeedbackActive || this.app.isGameOver) {
                return;
            }

            const now = Date.now();
            const remainingMs = Math.max(0, this.questionDeadline - now);
            const remainingSec = remainingMs / 1000;
            this.timerRemaining = remainingSec;

            this.updateTimerHud(remainingSec, this.timerTotal);

            const wholeSec = Math.ceil(remainingSec);
            if (wholeSec <= 5 && wholeSec > 0 && wholeSec !== this.lastWarningSecond) {
                this.lastWarningSecond = wholeSec;
                this.sound?.play?.("timer_warning");
            }

            if (remainingMs <= 0) {
                this.isTimingOut = true;
                this.stopQuestionTimer();
                this.handleTimeout();
            }
        }, 100);
    }

    startTimer(seconds) {
        this.startQuestionTimer(seconds);
    }

    stopTimer() {
        this.stopQuestionTimer();
    }

    stopQuestionTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.isTimingOut = false;
    }

    extendTimer(seconds = 10) {
        this.timerTotal += seconds;
        this.timerRemaining += seconds;
        if (this.questionDeadline) {
            this.questionDeadline += seconds * 1000;
        }
        this.updateTimerHud(this.timerRemaining, this.timerTotal);
    }

    updateTimerUi() {
        this.updateTimerHud(this.timerRemaining, this.timerTotal);
    }

    updateTimerHud(remaining, total) {
        const bar = this.dom.timerBar || this.dom.timerProgress || document.getElementById("timer-bar");
        const text = this.dom.timerDisplay || this.dom.timerText || document.getElementById("timer-display");
        const quizCard = document.getElementById("active-quiz-card");
        if (!bar && !text) return;

        if (total <= 0) {
            if (bar) {
                bar.style.width = "100%";
                bar.className = "progress-fill timer-bar-fill timer-normal";
            }
            if (text) {
                text.textContent = "Untimed";
            }
            quizCard?.classList.remove("timer-critical", "timer-warning-state");
            return;
        }

        const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
        if (bar) {
            bar.style.width = `${pct}%`;
            if (pct < 25) {
                bar.className = "progress-fill timer-bar-fill timer-danger";
            } else if (pct < 50) {
                bar.className = "progress-fill timer-bar-fill timer-warning";
            } else {
                bar.className = "progress-fill timer-bar-fill timer-normal";
            }
        }
        if (quizCard) {
            if (remaining <= 5 && remaining > 0) {
                quizCard.classList.add("timer-critical");
            } else {
                quizCard.classList.remove("timer-critical");
            }
        }
        if (text) {
            text.textContent = `${Math.max(0, remaining).toFixed(1)}s`;
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
        document.getElementById("active-quiz-card")?.classList.remove("timer-critical", "timer-warning-state");
        const prevScore = this.app.currentScore || 0;
        const totalScore = result.total_score !== undefined ? result.total_score : (result.current_score !== undefined ? result.current_score : this.app.currentScore);
        const streak = result.streak !== undefined ? result.streak : (result.current_streak !== undefined ? result.current_streak : this.app.currentStreak);
        const earnedDelta = result.points_awarded !== undefined ? result.points_awarded : Math.max(0, totalScore - prevScore);
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

        // Progressive Enhancement Haptics & Horror Reveal Audio
        triggerHaptic(
            result.is_correct ? "correct" : "incorrect",
            this.profile?.preferences?.haptics_enabled !== false
        );
        if (typeof this.sound.playHorrorReveal === "function") {
            this.sound.playHorrorReveal(result.is_correct);
        }

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

        // HUD Scores & Floating Delta
        if (this.dom.liveScore) this.dom.liveScore.textContent = this.app.currentScore;
        if (this.dom.streakCount) this.dom.streakCount.textContent = `${this.app.currentStreak} Streak`;
        if (this.dom.qScoreHud) this.dom.qScoreHud.textContent = `Score: ${this.app.currentScore}`;
        if (this.dom.qStreakHud) this.dom.qStreakHud.textContent = `🔥 ${this.app.currentStreak}`;
        const deltaBadge = document.getElementById("hud-score-delta");
        if (deltaBadge) {
            if (result.is_correct && earnedDelta > 0) {
                deltaBadge.textContent = `+${earnedDelta}`;
                deltaBadge.className = "hud-score-delta delta-pop delta-positive";
            } else {
                deltaBadge.textContent = "+0";
                deltaBadge.className = "hud-score-delta delta-pop delta-zero";
            }
        }

        // Feedback Panel
        this.dom.feedbackPanel?.classList.remove("hidden");
        this.dom.btnNextQuestion?.focus();
    }

    advanceToNext() {
        if (!this.isFeedbackActive && !this.app.isFeedbackActive) return;
        this.stopQuestionTimer();
        this.isFeedbackActive = false;
        this.app.isFeedbackActive = false;
        this.isAnswerPending = false;
        this.app.isAnswerPending = false;

        if (this.app.isGameOver) {
            this.finishGame();
        } else if (this.nextQuestionData || this.app.nextQuestionData) {
            const nextQ = this.nextQuestionData || this.app.nextQuestionData;
            this.nextQuestionData = null;
            this.app.nextQuestionData = null;
            this.renderQuestion(nextQ);
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

            // Update Profile Stats & Personal Best Comparison
            const prevBest = this.profile?.stats?.best_score || 0;
            const isNewPersonalBest = data.score > 0 && data.score > prevBest;
            if (this.profile && this.profile.stats) {
                this.profile.stats.games_played += 1;
                if (data.score > this.profile.stats.best_score) {
                    this.profile.stats.best_score = data.score;
                }
                this.app.saveProfile?.();
            }

            const pbBanner = document.getElementById("summary-pb-banner");
            if (pbBanner) {
                pbBanner.classList.remove("hidden");
                if (isNewPersonalBest) {
                    pbBanner.textContent = `🏆 NEW PERSONAL BEST! (${data.score} PTS)`;
                    pbBanner.className = "summary-pb-banner pb-new-record";
                } else {
                    const bestRecord = Math.max(data.score || 0, prevBest);
                    pbBanner.textContent = `📜 Verified Personal Best: ${bestRecord} PTS`;
                    pbBanner.className = "summary-pb-banner pb-comparison";
                }
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
