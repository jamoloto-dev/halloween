/**
 * 🎃 Spooky Master (Halloween Quiz) - Utilities & Core Data Module
 * Pure ES-module exporting shared constants, animations, haptics, and procedural storytelling.
 */

export const CATEGORY_FACTS = {
    spooky: "Many ghost stories use familiar places because the ordinary can feel more unsettling than the unknown.",
    costumes: "Samhain disguises were once used to confuse wandering spirits during the changing of the seasons.",
    movies: "Horror films often use silence just before a scare to make the audience lean in.",
    history: "Early jack-o'-lanterns in Ireland were carved from turnips and beets, not pumpkins.",
    candy: "Candy corn was originally marketed as 'Chicken Feed' in the late 1800s.",
    paranormal: "EMF meters are commonly used in ghost hunting, although readings can have many ordinary domestic causes.",
};

export const SPOOKY_GUIDE_HINTS = [
    "Something strange is waiting inside the Abandoned Manor... Look closely at the ancient portraits.",
    "Whispers echo across the graveyard: swift answers awaken supernatural score multipliers.",
    "Ancient folklore speaks of the Samhain veil thinning when the midnight bells strike.",
    "Beware the Cursed Clock in Haunted Duels — every second lost is stolen by the shadows.",
    "The spirits favor curious minds. Conquer daily challenges to amass sacred diamonds.",
    "The Witch's Market holds mystical wards to shield your streak against the spectral unknown.",
    "Deep in the Carnival of Lost Souls, a phantom barker promises untold Halloween wisdom.",
    "A streak of three correct answers summons the Ghost Hunter badge from the beyond."
];

export const PREDEFINED_AVATARS = [
    { id: "pumpkin_hunter", name: "Pumpkin Hunter", icon: "🎃", asset: "/static/avatars/pumpkin_hunter.svg", desc: "Vigilant guardian of the pumpkin patch", is_premium: false },
    { id: "ghost", name: "Spectral Ghost", icon: "👻", asset: "/static/avatars/ghost.svg", desc: "Playful apparition wandering between realms", is_premium: false },
    { id: "vampire", name: "Crimson Vampire", icon: "🧛", asset: "/static/avatars/vampire.svg", desc: "Nocturnal aristocrat with refined tastes", is_premium: false },
    { id: "witch", name: "Mystic Witch", icon: "🧙", asset: "/static/avatars/witch.svg", desc: "Master of midnight brews and celestial spells", is_premium: false },
    { id: "skeleton", name: "Crypt Skeleton", icon: "💀", asset: "/static/avatars/skeleton.svg", desc: "Ancient resident of the bone chambers", is_premium: false },
    { id: "zombie", name: "Grave Walker", icon: "🧟", asset: "/static/avatars/zombie.svg", desc: "Stitched relentless crawler of the graveyard", is_premium: false },
    { id: "werewolf", name: "Lunar Werewolf", icon: "🐺", asset: "/static/avatars/werewolf.svg", desc: "Fierce beast awakened by the full moon", is_premium: false },
    { id: "night_bat", name: "Night Creature", icon: "🦇", asset: "/static/avatars/night_bat.svg", desc: "Obsidian shadow swooping through the mist", is_premium: false },
    // Premium Avatars (Unlocked via Spooky Master Pass · Purely Cosmetic)
    { id: "phantom_king", name: "Phantom King", icon: "👑", asset: "/static/avatars/phantom_king.svg", desc: "Monarch of the spectral realm", is_premium: true },
    { id: "shadow_witch", name: "Shadow Witch", icon: "🔮", asset: "/static/avatars/shadow_witch.svg", desc: "High sorceress of midnight eclipse", is_premium: true },
    { id: "vampire_lord", name: "Vampire Lord", icon: "🩸", asset: "/static/avatars/vampire_lord.svg", desc: "Ancient bloodline aristocrat", is_premium: true },
    { id: "banshee", name: "Wailing Banshee", icon: "🌫️", asset: "/static/avatars/banshee.svg", desc: "Herald of the misty moors", is_premium: true },
];

export const AVAILABLE_THEMES = [
    { id: "default", name: "Haunted Mansion", is_premium: false, icon: "🏚️", desc: "Classic purple & ember manor ambiance" },
    { id: "blood_moon", name: "Blood Moon", is_premium: true, icon: "🩸", desc: "Crimson glow and darkened scarlet accents" },
    { id: "phantom_forest", name: "Phantom Forest", is_premium: true, icon: "🌲", desc: "Eerie spectral mint & jade woodland mist" },
    { id: "neon_crypt", name: "Neon Crypt", is_premium: true, icon: "⚡", desc: "Electric magenta & cyan cyberpunk tombs" },
    { id: "midnight_graveyard", name: "Midnight Graveyard", is_premium: true, icon: "🪦", desc: "Starlight blue and obsidian tombstone calm" },
];

// Central source of truth for sampled audio. Web Audio synthesis remains the
// fallback for every event so a missing file can never interrupt gameplay.
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

export const AVAILABLE_TRACKS = [
    { id: "haunted_mansion", name: "Haunted Mansion (Default Ambience)", url: "/sounds/spooky-master-main.mp3" },
    { id: "horror-ambience", name: "Haunted Mansion (Default Ambience)", url: "/sounds/spooky-master-main.mp3" },
    { id: "silent", name: "Silent / No Music", url: null },
];

export const ALL_BADGES = [
    { id: "ghost_hunter", name: "Ghost Hunter", icon: "👻", desc: "Reach a streak of 3 correct answers" },
    { id: "night_stalker", name: "Night Stalker", icon: "🌙", desc: "Reach a streak of 5 correct answers" },
    { id: "possessed", name: "Possessed", icon: "🔮", desc: "Reach an uncanny streak of 10 correct answers" },
    { id: "speed_demon", name: "Speed Demon", icon: "⚡", desc: "Answer correctly in under 4.0 seconds" },
    { id: "perfect_round", name: "Perfect Séance", icon: "🕯️", desc: "Finish a round with 100% accuracy" },
    { id: "hard_survivor", name: "Hard Mode Survivor", icon: "💀", desc: "Survive Hard mode with 70%+ score" },
    { id: "endless_slayer", name: "Endless Slayer", icon: "🗡️", desc: "Reach a streak of 10 in Endless Night" },
    { id: "daily_victor", name: "Daily Haunt Victor", icon: "📜", desc: "Conquer the Daily Haunt challenge" },
];

export const MASTERY_TIERS = [
    { min: 91, title: "Master of the Crypt", icon: "👑" },
    { min: 76, title: "Nightmare Expert", icon: "💀" },
    { min: 51, title: "Spirit Hunter", icon: "🔮" },
    { min: 26, title: "Crypt Explorer", icon: "🕯️" },
    { min: 1,  title: "Curious Ghost", icon: "👻" },
    { min: 0,  title: "Lost Soul", icon: "🌑" },
];

// Cosmetic Hunter Equipment Layer (Cosmetic only, 0 stat power)
export const COSMETIC_GEAR_SLOTS = [
    { id: "head", name: "Headpiece", icon: "🎩" },
    { id: "cape", name: "Cloak & Cape", icon: "🧛" },
    { id: "companion", name: "Familiar Companion", icon: "🐈‍⬛" },
    { id: "lantern", name: "Spectral Lantern", icon: "🏮" },
    { id: "spellbook", name: "Ancient Grimoire", icon: "📖" },
    { id: "aura", name: "Mystic Aura", icon: "✨" },
];

export function getMasteryTier(percentage) {
    for (const tier of MASTERY_TIERS) {
        if (percentage >= tier.min) return tier;
    }
    return MASTERY_TIERS[MASTERY_TIERS.length - 1];
}

export function generateUuid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return "sm-" + Math.random().toString(36).substring(2, 10) + "-" + Date.now().toString(36);
}

export function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Progressive Enhancement Haptics
 * Safe wrapper around navigator.vibrate() respecting user preference and reduced motion.
 */
export function triggerHaptic(type = "correct", enabled = true) {
    if (!enabled) return;
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    try {
        switch (type) {
            case "correct":
                navigator.vibrate(28); // gentle positive tick
                break;
            case "incorrect":
                navigator.vibrate([40, 60, 40]); // double pulse
                break;
            case "boss_clear":
            case "stage_clear":
                navigator.vibrate([60, 50, 80, 50, 100]); // celebratory cadence
                break;
            default:
                navigator.vibrate(20);
                break;
        }
    } catch {
        // Silently ignore if blocked by browser policy
    }
}

/**
 * Procedural Story Foundation: Personalized campaign narration interface.
 * Deterministic template-based atmospheric vignette generator.
 */
export function generateProceduralStory(context = {}) {
    const {
        chapterTitle = "The Haunt",
        stageName = "The Chamber",
        stars = 3,
        accuracy = 100,
        streak = 3,
        isBoss = false
    } = context;

    const starPhrases = {
        3: `You mastered ${stageName} with three flawless stars`,
        2: `You escaped ${stageName} with two stars intact`,
        1: `You narrowly survived ${stageName} by the glow of a single star`,
        0: `The shadows of ${stageName} cling heavily to your cloaks`
    };

    const leadPhrase = starPhrases[stars] || starPhrases[1];
    let atmosphericLine = "The grand corridor ahead falls eerily quiet.";
    if (accuracy >= 90) {
        atmosphericLine = "Your unerring knowledge drives the encroaching spectral mist back into the floorboards.";
    } else if (accuracy >= 70) {
        atmosphericLine = "Distant whispering phantoms linger just beyond the candlelight, watching your advance.";
    } else {
        atmosphericLine = "Cold drafts extinguish several sconces as ancient floorboards groan beneath unseen steps.";
    }

    let conclusion = `The ancient mystery of ${chapterTitle} deepens before you.`;
    if (isBoss) {
        conclusion = `The spectral guardian of ${chapterTitle} has been banished—for now.`;
    } else if (streak >= 5) {
        conclusion = "Something ancient within Blackwood Manor has noticed your uncanny momentum.";
    }

    return `${leadPhrase}, and ${atmosphericLine.toLowerCase()} ${conclusion}`;
}

/**
 * Future Challenge Link Generator
 * Preserves player privacy: NO email, NO user UUID, NO authentication tokens.
 */
export function generateDuelShareLink(challengeCode) {
    const origin = (typeof window !== "undefined" && window.location && window.location.origin) ? window.location.origin : "";
    const cleanCode = encodeURIComponent(String(challengeCode || "").trim());
    return `${origin}/duel/${cleanCode}`;
}

/**
 * Particle Confetti system for stage clears and achievements.
 */
export class Confetti {
    constructor(canvasId = "confetti-canvas") {
        this.canvas = document.getElementById(canvasId) || document.getElementById("canvas-confetti");
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
        if (window.matchMedia && (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
            document.documentElement.classList.contains("reduced-motion") ||
            document.body.classList.contains("reduced-motion"))) {
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

    fire(count = 70) {
        this.burst();
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
