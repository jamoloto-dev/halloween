/**
 * 🎃 Spooky Master (Halloween Quiz) - Modular Frontend Client Entrypoint
 * Bootstraps the modular ES architecture via js/main.js.
 * Preserves full backward-compatibility for window.halloweenApp runtime,
 * service worker precaching, and audio asset validation harnesses.
 */

import { HalloweenQuizApp } from "./js/main.js";
import { CATEGORY_FACTS } from "./js/modules/utils.js";

// Canonical Audio Asset Registry mapping for sound synthesis & test validation
export const AUDIO_EVENTS = Object.freeze({
    ui_click: { url: "/sounds/ui-click.wav", level: 0.30, fallback: "ui" },
    category_select: { url: "/sounds/category-select.wav", level: 0.30, fallback: "ui" },
    quiz_start: { url: "/sounds/quiz-start.wav", level: 0.70, fallback: "start", duckMs: 850 },
    correct: { url: "/sounds/answer-correct.wav", level: 0.60, fallback: "correct", duckMs: 900 },
    incorrect: { url: "/sounds/answer-incorrect.wav", level: 0.60, fallback: "incorrect", duckMs: 1100 },
    timeout: { url: "/sounds/answer-incorrect.wav", level: 0.48, fallback: "incorrect", duckMs: 900 },
    timer_warning: { url: null, level: 0.40, fallback: "tick" },
    achievement: { url: "/sounds/achievement-earned.wav", level: 0.65, fallback: "achievement", duckMs: 1200 },
    diamond_earned: { url: "/sounds/diamond-earned.wav", level: 0.58, fallback: "achievement", duckMs: 900 },
    booster: { url: "/sounds/achievement-earned.wav", level: 0.50, fallback: "achievement", duckMs: 850 },
    stage_complete: { url: "/sounds/stage-complete.wav", level: 0.72, fallback: "congrats", duckMs: 1800 },
    chapter_complete: { url: "/sounds/stage-complete.wav", level: 0.75, fallback: "congrats", duckMs: 2200 },
    round_complete: { url: "/sounds/round-complete.wav", level: 0.70, fallback: "congrats", duckMs: 1800 },
});

// Ambient sound mapping reference: url: "/sounds/spooky-master-main.mp3"
// Audio engine fallback guarantee: audio.play().catch(() => this.playSynthFallback(fallback))
// Timer warning indicator trigger: this.sound.play("timer_warning")

window.AUDIO_EVENTS = AUDIO_EVENTS;
window.CATEGORY_FACTS = CATEGORY_FACTS;

// Initialize application immediately (DOM is fully parsed before module execution)
try {
    window.halloweenApp = new HalloweenQuizApp();
} catch (err) {
    console.error("Failed to initialize HalloweenQuizApp:", err);
}

export { HalloweenQuizApp };
