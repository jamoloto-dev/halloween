/**
 * 🎃 Spooky Master (Halloween Quiz) - Conversational Spooky Guide & Hints Module
 * Manages progressive AI hint levels (1 to 3), Spooky Guide character dialog,
 * competitive-mode strict isolation (barred in Daily and Duel), and client-side fallback.
 * Strictly maintains server-authoritative external AI security (NO API keys on client).
 */

import { CATEGORY_FACTS, SPOOKY_GUIDE_HINTS } from "./utils.js";

export class HintsManager {
    constructor(app) {
        this.app = app;
        this.currentHintLevel = 1;
        this.hintIndex = 0;
    }

    get dom() {
        return this.app.dom;
    }

    get profile() {
        return this.app.profile;
    }

    cycleSpookyGuideHint() {
        const text = SPOOKY_GUIDE_HINTS[this.hintIndex % SPOOKY_GUIDE_HINTS.length];
        this.hintIndex += 1;
        if (this.dom.guideDialogue) {
            this.dom.guideDialogue.textContent = `"${text}"`;
        }
    }

    async requestSpookyGuideHint(level = 1) {
        if (this.app.gameMode === "daily" || this.app.gameMode === "duel") {
            this.app.showToast("Strict Isolation", "Spooky Guide hints are sealed in competitive trials!", "🔒");
            return;
        }
        if (this.app.isAnswerPending || this.app.isFeedbackActive || !this.app.currentQuestion) return;

        this.currentHintLevel = Math.max(1, Math.min(3, level));
        this.app.currentHintLevel = this.currentHintLevel;

        if (this.dom.quizSpookyGuideBox) {
            this.dom.quizSpookyGuideBox.classList.remove("hidden");
        }
        if (this.dom.quizGuideHintText) {
            this.dom.quizGuideHintText.textContent = "Listening to the whispers beyond...";
        }
        if (this.dom.quizGuideLevelBadge) {
            const badges = { 1: "Gentle Clue 🕯️", 2: "Stronger Clue 🔮", 3: "Guided Deduction 💀" };
            this.dom.quizGuideLevelBadge.textContent = badges[this.currentHintLevel] || "Spooky Clue";
        }
        if (this.dom.btnQuizGuideDeeper) {
            if (this.currentHintLevel >= 3) {
                this.dom.btnQuizGuideDeeper.classList.add("hidden");
            } else {
                this.dom.btnQuizGuideDeeper.classList.remove("hidden");
                this.dom.btnQuizGuideDeeper.disabled = false;
            }
        }

        try {
            const res = await fetch("/api/ai/hint", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Player-ID": this.profile?.player_id || "guest_default",
                },
                body: JSON.stringify({
                    session_id: this.app.sessionId,
                    question_id: this.app.currentQuestion.id || null,
                    category: this.app.currentQuestion.category || null,
                    hint_level: this.currentHintLevel,
                }),
            });

            if (res.status === 403) {
                if (this.dom.quizGuideHintText) {
                    this.dom.quizGuideHintText.textContent = "The spirits are bound by sacred oath: hints are barred in competitive trials.";
                }
                return;
            }

            if (!res.ok) throw new Error("Hint fetch failed");
            const data = await res.json();
            if (this.dom.quizGuideHintText) {
                this.dom.quizGuideHintText.textContent = `"${data.hint}"`;
            }
            if (this.dom.quizGuideCharacterName && data.character_persona) {
                this.dom.quizGuideCharacterName.textContent = data.character_persona;
            }
            this.app.sound.playUiSound();
        } catch (err) {
            console.warn("Spooky Guide hint fallback:", err);
            const cat = this.app.currentQuestion?.category || "spooky";
            const fallbackText = CATEGORY_FACTS[cat] || "Focus on the oldest lore of All Hallows' Eve.";
            if (this.dom.quizGuideHintText) {
                this.dom.quizGuideHintText.textContent = `"${fallbackText}"`;
            }
        }
    }

    closeGuideBubble() {
        this.dom.quizSpookyGuideBox?.classList.add("hidden");
    }
}
