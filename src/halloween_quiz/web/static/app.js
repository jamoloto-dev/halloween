/**
 * 🎃 Halloween Quiz Game - Modern Client Engine
 * Features: Pure client-side Web Audio API, Smooth zero-reload countdown timer,
 * Responsive UI, Keyboard shortcuts, and Leaderboard integrations.
 */

(function () {
    "use strict";

    // ==========================================
    // 1. CLIENT-SIDE WEB AUDIO ENGINE
    // ==========================================
    class SoundEngine {
        constructor() {
            this.muted = localStorage.getItem("halloween_muted") === "true";
            this.volume = parseFloat(localStorage.getItem("halloween_volume") || "0.7");
            this.audioCtx = null;
            this.bgmAudio = document.getElementById("bgm-audio");
            this.bgmPlaying = false;
            this.soundCache = {};

            // Preload standard HTML5 sound elements
            this.soundUrls = {
                start: "/sounds/start.mp3",
                correct: "/sounds/correct.mp3",
                incorrect: "/sounds/incorrect.mp3",
                congrats: "/sounds/congrats.mp3",
            };

            this.initAudioContext();
        }

        initAudioContext() {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass();
            }
        }

        unlock() {
            if (this.audioCtx && this.audioCtx.state === "suspended") {
                this.audioCtx.resume();
            }
        }

        setVolume(val) {
            this.volume = Math.max(0, Math.min(1, parseFloat(val)));
            localStorage.setItem("halloween_volume", this.volume.toString());
            if (this.bgmAudio) {
                this.bgmAudio.volume = this.volume * 0.5; // ambient music is softer
            }
        }

        toggleMute() {
            this.muted = !this.muted;
            localStorage.setItem("halloween_muted", this.muted.toString());
            if (this.bgmAudio) {
                this.bgmAudio.muted = this.muted;
            }
            return this.muted;
        }

        toggleBgm() {
            if (!this.bgmAudio) return false;
            this.unlock();

            if (this.bgmPlaying) {
                this.bgmAudio.pause();
                this.bgmPlaying = false;
            } else {
                this.bgmAudio.volume = this.volume * 0.5;
                this.bgmAudio.muted = this.muted;
                const playPromise = this.bgmAudio.play();
                if (playPromise) {
                    playPromise.then(() => {
                        this.bgmPlaying = true;
                    }).catch(() => {
                        this.bgmPlaying = false;
                    });
                }
            }
            return this.bgmPlaying;
        }

        play(soundKey) {
            if (this.muted) return;
            this.unlock();

            const url = this.soundUrls[soundKey];
            if (url) {
                const audio = new Audio(url);
                audio.volume = this.volume;
                audio.play().catch(() => {
                    // Fallback to Web Audio synthetic tone generator if file fails or is blocked
                    this.playSynthFallback(soundKey);
                });
            } else {
                this.playSynthFallback(soundKey);
            }
        }

        // Web Audio API procedural synthesizer (zero external network dependency)
        playSynthFallback(type) {
            if (this.muted || !this.audioCtx) return;
            try {
                const now = this.audioCtx.currentTime;
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();

                gain.connect(this.audioCtx.destination);
                osc.connect(gain);

                if (type === "correct") {
                    // Bright ascending two-tone chime
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(587.33, now); // D5
                    osc.frequency.setValueAtTime(880.0, now + 0.12); // A5
                    gain.gain.setValueAtTime(this.volume * 0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                    osc.start(now);
                    osc.stop(now + 0.45);
                } else if (type === "incorrect") {
                    // Low eerie sawtooth buzz
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(140, now);
                    osc.frequency.linearRampToValueAtTime(80, now + 0.35);
                    gain.gain.setValueAtTime(this.volume * 0.25, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                    osc.start(now);
                    osc.stop(now + 0.35);
                } else if (type === "tick") {
                    // Crisp hollow clock pulse
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(950, now);
                    gain.gain.setValueAtTime(this.volume * 0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                    osc.start(now);
                    osc.stop(now + 0.06);
                } else if (type === "start" || type === "congrats") {
                    // Harmonic chord flourish
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.setValueAtTime(554.37, now + 0.1);
                    osc.frequency.setValueAtTime(659.25, now + 0.2);
                    gain.gain.setValueAtTime(this.volume * 0.3, now);
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
                p.vy += 0.35; // gravity
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

            // DOM Elements
            this.screens = {
                start: document.getElementById("screen-start"),
                quiz: document.getElementById("screen-quiz"),
                gameover: document.getElementById("screen-gameover"),
            };

            this.dom = {
                formStart: document.getElementById("form-start-quiz"),
                categoryPicker: document.getElementById("category-picker"),
                btnLeaderboard: document.getElementById("btn-leaderboard-open"),
                btnSoundToggle: document.getElementById("btn-sound-toggle"),
                btnBgmToggle: document.getElementById("btn-bgm-toggle"),
                volumeSlider: document.getElementById("volume-slider"),
                modalLeaderboard: document.getElementById("modal-leaderboard"),
                btnCloseModal: document.getElementById("btn-close-modal"),
                leaderboardTbody: document.getElementById("leaderboard-tbody"),
                qCounter: document.getElementById("q-counter"),
                qCategoryBadge: document.getElementById("q-category-badge"),
                streakCount: document.getElementById("streak-count"),
                liveScore: document.getElementById("live-score"),
                timerDisplay: document.getElementById("timer-display"),
                timerBar: document.getElementById("timer-bar"),
                questionText: document.getElementById("question-text"),
                optionsGrid: document.getElementById("options-grid"),
                feedbackPanel: document.getElementById("feedback-panel"),
                feedbackStatus: document.getElementById("feedback-status"),
                feedbackExplanation: document.getElementById("feedback-explanation"),
                feedbackPoints: document.getElementById("feedback-points"),
                feedbackBonus: document.getElementById("feedback-bonus"),
                btnNextQuestion: document.getElementById("btn-next-question"),
                btnPlayAgain: document.getElementById("btn-play-again"),
                btnViewBoardFinish: document.getElementById("btn-view-board-finish"),
                statFinalScore: document.getElementById("stat-final-score"),
                statAccuracy: document.getElementById("stat-accuracy"),
                statCorrect: document.getElementById("stat-correct"),
                statMaxStreak: document.getElementById("stat-max-streak"),
                reviewList: document.getElementById("review-list"),
            };

            this.initEvents();
            this.loadCategories();
            this.updateAudioControlsUi();
        }

        initEvents() {
            // Unlock audio on any first click
            document.addEventListener("click", () => this.sound.unlock(), { once: true });
            document.addEventListener("keydown", () => this.sound.unlock(), { once: true });

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

            // Leaderboard Modal Open/Close
            this.dom.btnLeaderboard.addEventListener("click", () => this.openLeaderboard());
            this.dom.btnViewBoardFinish.addEventListener("click", () => this.openLeaderboard());
            this.dom.btnCloseModal.addEventListener("click", () => this.closeLeaderboard());
            this.dom.modalLeaderboard.addEventListener("click", (e) => {
                if (e.target === this.dom.modalLeaderboard) this.closeLeaderboard();
            });

            // Leaderboard Tab Switching
            const tabs = this.dom.modalLeaderboard.querySelectorAll(".tab-btn");
            tabs.forEach((tab) => {
                tab.addEventListener("click", () => {
                    tabs.forEach((t) => t.classList.remove("active"));
                    tab.classList.add("active");
                    const diff = tab.getAttribute("data-diff");
                    this.fetchLeaderboard(diff === "all" ? null : diff);
                });
            });

            // Sound Controls
            this.dom.btnSoundToggle.addEventListener("click", () => {
                const muted = this.sound.toggleMute();
                this.updateAudioControlsUi();
            });

            this.dom.btnBgmToggle.addEventListener("click", () => {
                const playing = this.sound.toggleBgm();
                this.updateAudioControlsUi();
            });

            this.dom.volumeSlider.addEventListener("input", (e) => {
                this.sound.setVolume(e.target.value);
            });

            // Keyboard Shortcuts
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    this.closeLeaderboard();
                    return;
                }

                // If feedback is showing, Enter or Space advances
                if (this.isFeedbackActive && (e.key === "Enter" || e.key === " " || e.key === "ArrowRight")) {
                    e.preventDefault();
                    this.advanceToNext();
                    return;
                }

                // During active question, keys 1-4 select answers
                if (!this.isAnswerPending && !this.isFeedbackActive && this.screens.quiz.classList.contains("active")) {
                    if (["1", "2", "3", "4"].includes(e.key)) {
                        const index = parseInt(e.key, 10) - 1;
                        const buttons = this.dom.optionsGrid.querySelectorAll(".option-btn");
                        if (buttons[index]) {
                            buttons[index].click();
                        }
                    }
                }
            });
        }

        updateAudioControlsUi() {
            this.dom.btnSoundToggle.textContent = this.sound.muted ? "🔇 Muted" : "🔊 Sound";
            this.dom.btnSoundToggle.classList.toggle("muted", this.sound.muted);

            this.dom.btnBgmToggle.textContent = this.sound.bgmPlaying ? "🎵 Music: On" : "🎵 Music: Off";
            this.dom.btnBgmToggle.classList.toggle("active", this.sound.bgmPlaying);

            this.dom.volumeSlider.value = this.sound.volume;
        }

        showScreen(screenName) {
            Object.values(this.screens).forEach((s) => s.classList.remove("active"));
            if (this.screens[screenName]) {
                this.screens[screenName].classList.add("active");
            }
        }

        async loadCategories() {
            try {
                const res = await fetch("/api/categories");
                if (!res.ok) throw new Error("Failed to load categories");
                const data = await res.json();

                this.dom.categoryPicker.innerHTML = "";
                data.categories.forEach((cat) => {
                    const label = document.createElement("label");
                    label.className = "category-chip";
                    label.innerHTML = `
                        <input type="checkbox" name="categories" value="${cat.id}" checked>
                        <div class="cat-content">
                            <span class="cat-icon">${cat.icon}</span>
                            <span class="cat-name">${cat.name}</span>
                            <small class="cat-count">${cat.question_count} Qs</small>
                        </div>
                    `;
                    this.dom.categoryPicker.appendChild(label);
                });
            } catch (err) {
                console.error("Error loading categories:", err);
            }
        }

        async startGame() {
            const formData = new FormData(this.dom.formStart);
            const playerName = formData.get("player_name") || "Ghost Hunter";
            const difficulty = formData.get("difficulty") || "medium";
            const numQuestions = parseInt(formData.get("num_questions") || "10", 10);
            const selectedCategories = formData.getAll("categories");

            if (selectedCategories.length === 0) {
                alert("Please select at least one category!");
                return;
            }

            try {
                const res = await fetch("/api/quiz/start", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        player_name: playerName,
                        difficulty: difficulty,
                        categories: selectedCategories,
                        num_questions: numQuestions,
                        time_limit_per_question: difficulty === "easy" ? 30 : difficulty === "hard" ? 15 : 20,
                    }),
                });

                if (!res.ok) {
                    const err = await res.json();
                    alert(err.detail || "Failed to start quiz.");
                    return;
                }

                const data = await res.json();
                this.sessionId = data.session_id;
                this.currentScore = 0;
                this.currentStreak = 0;

                this.sound.play("start");
                this.showScreen("quiz");
                this.renderQuestion(data.first_question);
            } catch (err) {
                console.error("Error starting game:", err);
                alert("Could not connect to game server. Please try again.");
            }
        }

        renderQuestion(qView) {
            if (!qView) return;
            this.currentQuestion = qView;
            this.isAnswerPending = false;
            this.isFeedbackActive = false;
            this.selectedAnswerIndex = null;

            // Update Status HUD
            this.dom.qCounter.textContent = `Question ${qView.index} of ${qView.total_questions}`;
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
                    <span class="opt-badge">${idx + 1}</span>
                    <span class="opt-text">${this.escapeHtml(opt)}</span>
                `;
                btn.addEventListener("click", () => this.handleAnswerSelect(opt, idx, btn));
                this.dom.optionsGrid.appendChild(btn);
            });

            // Hide Feedback Panel
            this.dom.feedbackPanel.classList.add("hidden");

            // Start Countdown Timer
            this.startTimer(qView.time_limit);
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

                // Warning sound on last 5 seconds (every whole integer second tick)
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

            // Smooth color grading
            if (fraction > 0.5) {
                this.dom.timerBar.style.backgroundColor = "#39ff14"; // Green
                this.dom.timerDisplay.style.color = "#39ff14";
            } else if (fraction > 0.2) {
                this.dom.timerBar.style.backgroundColor = "#ff7518"; // Pumpkin Orange
                this.dom.timerDisplay.style.color = "#ff7518";
            } else {
                this.dom.timerBar.style.backgroundColor = "#ff2a2a"; // Blood Red
                this.dom.timerDisplay.style.color = "#ff2a2a";
            }
        }

        async handleAnswerSelect(selectedAnswer, index, buttonEl) {
            if (this.isAnswerPending || this.isFeedbackActive) return;
            this.isAnswerPending = true;
            this.stopTimer();

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
            }
        }

        async handleTimeout() {
            if (this.isAnswerPending || this.isFeedbackActive) return;
            this.isAnswerPending = true;

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
            }
        }

        showAnswerResult(result, selectedAnswer) {
            this.isFeedbackActive = true;
            this.currentScore = result.total_score;
            this.currentStreak = result.streak;
            this.nextQuestionData = result.next_question;
            this.isGameOver = result.is_game_over;

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
                this.dom.feedbackStatus.textContent = "✨ Correct! Spooky Genius!";
                this.dom.feedbackStatus.className = "feedback-title correct-msg";
                this.dom.feedbackPoints.textContent = `+${result.points_awarded - result.time_bonus} pts`;
                this.dom.feedbackBonus.textContent = result.time_bonus > 0 ? `+${result.time_bonus} fast time bonus!` : "";
            } else {
                this.sound.play("incorrect");
                this.dom.feedbackStatus.textContent = "💀 Missed! Wandering in the dark...";
                this.dom.feedbackStatus.className = "feedback-title incorrect-msg";
                this.dom.feedbackPoints.textContent = "+0 pts";
                this.dom.feedbackBonus.textContent = `Correct answer: ${result.correct_answer}`;
            }

            this.dom.feedbackExplanation.textContent = result.explanation || "";
            this.dom.liveScore.textContent = this.currentScore;
            this.dom.streakCount.textContent = `${this.currentStreak} Streak`;

            this.dom.feedbackPanel.classList.remove("hidden");
            this.dom.btnNextQuestion.focus();
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

        async openLeaderboard() {
            this.dom.modalLeaderboard.classList.remove("hidden");
            this.fetchLeaderboard(null);
        }

        closeLeaderboard() {
            this.dom.modalLeaderboard.classList.add("hidden");
        }

        async fetchLeaderboard(difficulty = null) {
            this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;">Summoning records from the crypt...</td></tr>`;

            try {
                let url = "/api/leaderboard?limit=25";
                if (difficulty) url += `&difficulty=${encodeURIComponent(difficulty)}`;

                const res = await fetch(url);
                if (!res.ok) throw new Error("Leaderboard fetch failed");
                const data = await res.json();

                if (data.entries.length === 0) {
                    this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;">No ghost hunter records recorded yet!</td></tr>`;
                    return;
                }

                this.dom.leaderboardTbody.innerHTML = "";
                data.entries.forEach((entry, idx) => {
                    const tr = document.createElement("tr");
                    const dateStr = entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "-";
                    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`;

                    tr.innerHTML = `
                        <td class="rank-col">${medal}</td>
                        <td class="name-col"><strong>${this.escapeHtml(entry.player_name)}</strong></td>
                        <td><span class="badge badge-${entry.difficulty}">${entry.difficulty.toUpperCase()}</span></td>
                        <td class="score-col">${entry.score.toLocaleString()}</td>
                        <td>${entry.percentage}%</td>
                        <td class="date-col">${dateStr}</td>
                    `;
                    this.dom.leaderboardTbody.appendChild(tr);
                });
            } catch (err) {
                console.error("Leaderboard error:", err);
                this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="6" style="color:#ff5a5a;text-align:center;padding:24px;">Failed to load leaderboard.</td></tr>`;
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
