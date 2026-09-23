/**
 * 🎃 Spooky Master (Halloween Quiz) - Client Engine v2.4.0
 * Features: AI Intelligence Layer (Adaptive Scaffolding, Conversational Spooky Guide,
 * Supernatural Hunter Studio SVG Generation), Pure client-side Web Audio API,
 * Six Game Modes (Classic, Quick, Deep, Panic, Endless, Daily Haunt),
 * First-Launch Player Onboarding, Predefined Illustrated Avatar System,
 * Local Player Profile & Seamless Migration, Centralized Settings Control Center,
 * Interactive Category Cards, Category Mastery Tiers, Deterministic Badges,
 * PWA Service Worker, Web Share API, and Full Accessibility.
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

    const SPOOKY_GUIDE_HINTS = [
        "Something strange is waiting inside the Abandoned Manor... Look closely at the ancient portraits.",
        "Whispers echo across the graveyard: swift answers awaken supernatural score multipliers.",
        "Ancient folklore speaks of the Samhain veil thinning when the midnight bells strike.",
        "Beware the Cursed Clock in Haunted Duels — every second lost is stolen by the shadows.",
        "The spirits favor curious minds. Conquer daily challenges to amass sacred diamonds.",
        "The Witch's Market holds mystical wards to shield your streak against the spectral unknown.",
        "Deep in the Carnival of Lost Souls, a phantom barker promises untold Halloween wisdom.",
        "A streak of three correct answers summons the Ghost Hunter badge from the beyond."
    ];

    const PREDEFINED_AVATARS = [
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

    const AVAILABLE_THEMES = [
        { id: "default", name: "Haunted Mansion", is_premium: false, icon: "🏚️", desc: "Classic purple & ember manor ambiance" },
        { id: "blood_moon", name: "Blood Moon", is_premium: true, icon: "🩸", desc: "Crimson glow and darkened scarlet accents" },
        { id: "phantom_forest", name: "Phantom Forest", is_premium: true, icon: "🌲", desc: "Eerie spectral mint & jade woodland mist" },
        { id: "neon_crypt", name: "Neon Crypt", is_premium: true, icon: "⚡", desc: "Electric magenta & cyan cyberpunk tombs" },
        { id: "midnight_graveyard", name: "Midnight Graveyard", is_premium: true, icon: "🪦", desc: "Starlight blue and obsidian tombstone calm" },
    ];

    // Central source of truth for sampled audio. Web Audio synthesis remains the
    // fallback for every event so a missing file can never interrupt gameplay.
    const AUDIO_EVENTS = Object.freeze({
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

    const AVAILABLE_TRACKS = [
        { id: "haunted_mansion", name: "Haunted Mansion (Default Ambience)", url: "/sounds/spooky-master-main.mp3" },
        { id: "horror-ambience", name: "Haunted Mansion (Default Ambience)", url: "/sounds/spooky-master-main.mp3" },
        { id: "silent", name: "Silent / No Music", url: null },
    ];

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

    function generateUuid() {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        return "sm-" + Math.random().toString(36).substring(2, 10) + "-" + Date.now().toString(36);
    }

    // ==========================================
    // 1. CLIENT-SIDE WEB AUDIO ENGINE
    // ==========================================
    class SoundEngine {
        constructor() {
            this.audioCtx = null;
            this.bgmAudio = document.getElementById("bgm-audio");
            this.bgmPlaying = false;
            this.backgroundAvailable = Boolean(this.bgmAudio);
            this.ambienceRequested = false;
            this.fadeFrame = null;
            this.duckRestoreTimer = null;
            this.soundCache = new Map();

            // Default audio state (overwritten by profile initialization)
            this.musicEnabled = true;
            this.musicVolume = 0.25;
            this.selectedTrack = "haunted_mansion";
            this.sfxEnabled = true;
            this.sfxVolume = 0.60;

            // Audio balance levels (starting hierarchy)
            this.audioEvents = AUDIO_EVENTS;
            this.soundUrls = Object.fromEntries(
                Object.entries(this.audioEvents)
                    .filter(([, event]) => Boolean(event.url))
                    .map(([key, event]) => [key, event.url])
            );

            this.initAudioContext();
            this.preloadSoundEffects();

            if (this.bgmAudio) {
                this.bgmAudio.addEventListener("error", () => {
                    console.warn("Background music file error; continuing without music.");
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

        applyPreferences(prefs) {
            if (!prefs) return;
            this.musicEnabled = prefs.music_enabled !== false;
            this.musicVolume = Number.isFinite(prefs.music_volume) ? Math.max(0, Math.min(1, prefs.music_volume)) : 0.25;
            this.selectedTrack = prefs.music_track || "haunted_mansion";
            this.sfxEnabled = prefs.sfx_enabled !== false;
            this.sfxVolume = Number.isFinite(prefs.sfx_volume) ? Math.max(0, Math.min(1, prefs.sfx_volume)) : 0.60;

            if (this.bgmAudio) {
                this.bgmAudio.muted = !this.musicEnabled;
                if (this.bgmPlaying) {
                    this.fadeBackgroundTo(this.musicVolume, 150);
                }
            }

            this.setTrack(this.selectedTrack, false);
        }

        setMusicEnabled(enabled) {
            this.musicEnabled = Boolean(enabled);
            if (this.bgmAudio) {
                this.bgmAudio.muted = !this.musicEnabled;
            }
            if (this.musicEnabled && this.ambienceRequested) {
                this.startBackgroundAmbience();
            } else if (!this.musicEnabled && this.bgmPlaying) {
                this.stopBackgroundAmbience(false, 200);
            }
            this.notifyBgmStateChange();
        }

        setMusicVolume(val) {
            const parsed = parseFloat(val);
            this.musicVolume = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.25;
            if (this.bgmAudio && this.bgmPlaying) {
                this.fadeBackgroundTo(this.musicVolume, 150);
            }
        }

        setTrack(trackId, restartIfPlaying = true) {
            const canonicalId = (trackId === "horror-ambience" || !trackId) ? "haunted_mansion" : trackId;
            this.selectedTrack = canonicalId;
            const track = AVAILABLE_TRACKS.find((t) => t.id === canonicalId);
            if (!track || !track.url || canonicalId === "silent") {
                if (this.bgmAudio && this.bgmPlaying) {
                    this.stopBackgroundAmbience(false, 250);
                }
                return;
            }

            if (this.bgmAudio) {
                const wasPlaying = this.bgmPlaying;
                this.bgmAudio.src = track.url;
                if (wasPlaying && restartIfPlaying && this.musicEnabled) {
                    this.startBackgroundAmbience();
                }
            }
        }

        setSfxEnabled(enabled) {
            this.sfxEnabled = Boolean(enabled);
        }

        setSfxVolume(val) {
            const parsed = parseFloat(val);
            this.sfxVolume = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.60;
        }

        toggleBgm() {
            if (!this.bgmAudio) return false;
            if (this.bgmPlaying || !this.bgmAudio.paused) {
                this.setMusicEnabled(false);
                return false;
            }
            this.setMusicEnabled(true);
            return this.startBackgroundAmbience();
        }

        toggleSfx() {
            this.sfxEnabled = !this.sfxEnabled;
            return this.sfxEnabled;
        }

        startBackgroundAmbience() {
            if (!this.bgmAudio || !this.backgroundAvailable || this.selectedTrack === "silent") return false;
            this.unlock();
            this.ambienceRequested = true;
            if (!this.musicEnabled) return false;

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
            if (!this.bgmAudio || !this.bgmPlaying || !this.musicEnabled || !this.ambienceRequested) return;
            if (this.duckRestoreTimer) clearTimeout(this.duckRestoreTimer);
            this.fadeBackgroundTo(this.musicVolume * 0.35, 120);
            this.duckRestoreTimer = setTimeout(() => {
                if (this.ambienceRequested && this.musicEnabled) {
                    this.fadeBackgroundTo(this.musicVolume, 350);
                }
            }, duration);
        }

        duckBackgroundDeep(duration = 3500) {
            if (!this.bgmAudio || !this.bgmPlaying || !this.musicEnabled) return;
            if (this.duckRestoreTimer) clearTimeout(this.duckRestoreTimer);
            this.fadeBackgroundTo(this.musicVolume * 0.15, 180);
            this.duckRestoreTimer = setTimeout(() => {
                if (this.ambienceRequested && this.musicEnabled) {
                    this.fadeBackgroundTo(this.musicVolume, 450);
                }
            }, duration);
        }

        playRiddleClip(clipId, onDone) {
            this.unlock();
            this.duckBackgroundDeep(3500);

            if (!this.audioCtx) {
                this.initAudioContext();
            }
            if (!this.audioCtx) {
                if (onDone) onDone();
                return;
            }

            try {
                const now = this.audioCtx.currentTime;
                const gain = this.audioCtx.createGain();
                gain.connect(this.audioCtx.destination);
                gain.gain.setValueAtTime(this.sfxVolume * 0.70, now);

                if (clipId === "werewolf_howl") {
                    const osc = this.audioCtx.createOscillator();
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(140, now);
                    osc.frequency.exponentialRampToValueAtTime(380, now + 1.2);
                    osc.frequency.exponentialRampToValueAtTime(80, now + 3.2);

                    const filter = this.audioCtx.createBiquadFilter();
                    filter.type = "lowpass";
                    filter.frequency.setValueAtTime(450, now);
                    filter.frequency.exponentialRampToValueAtTime(1100, now + 1.2);
                    filter.frequency.exponentialRampToValueAtTime(280, now + 3.2);

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.4);
                    osc.start(now);
                    osc.stop(now + 3.4);
                    setTimeout(() => { if (onDone) onDone(); }, 3400);

                } else if (clipId === "ghost_wail") {
                    const osc1 = this.audioCtx.createOscillator();
                    const osc2 = this.audioCtx.createOscillator();
                    osc1.type = "sine";
                    osc2.type = "sine";
                    osc1.frequency.setValueAtTime(440, now);
                    osc1.frequency.linearRampToValueAtTime(560, now + 1.4);
                    osc1.frequency.linearRampToValueAtTime(360, now + 3.0);
                    osc2.frequency.setValueAtTime(446, now);
                    osc2.frequency.linearRampToValueAtTime(568, now + 1.4);
                    osc2.frequency.linearRampToValueAtTime(365, now + 3.0);

                    osc1.connect(gain);
                    osc2.connect(gain);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.1);
                    osc1.start(now);
                    osc2.start(now);
                    osc1.stop(now + 3.1);
                    osc2.stop(now + 3.1);
                    setTimeout(() => { if (onDone) onDone(); }, 3100);

                } else if (clipId === "crypt_door") {
                    const osc = this.audioCtx.createOscillator();
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(85, now);
                    osc.frequency.linearRampToValueAtTime(30, now + 2.3);

                    const filter = this.audioCtx.createBiquadFilter();
                    filter.type = "bandpass";
                    filter.frequency.setValueAtTime(190, now);
                    filter.Q.setValueAtTime(7, now);

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.gain.setValueAtTime(this.sfxVolume * 0.75, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
                    osc.start(now);
                    osc.stop(now + 2.5);
                    setTimeout(() => { if (onDone) onDone(); }, 2500);

                } else if (clipId === "witch_cackle") {
                    const notes = [650, 840, 620, 920, 710, 1040, 790, 580];
                    notes.forEach((f, i) => {
                        const noteTime = now + (i * 0.28);
                        const osc = this.audioCtx.createOscillator();
                        const noteGain = this.audioCtx.createGain();
                        osc.type = "triangle";
                        osc.frequency.setValueAtTime(f, noteTime);
                        noteGain.connect(this.audioCtx.destination);
                        osc.connect(noteGain);
                        noteGain.gain.setValueAtTime(this.sfxVolume * 0.45, noteTime);
                        noteGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.24);
                        osc.start(noteTime);
                        osc.stop(noteTime + 0.24);
                    });
                    setTimeout(() => { if (onDone) onDone(); }, 2500);

                } else if (clipId === "bat_swarm") {
                    for (let i = 0; i < 14; i++) {
                        const chirpTime = now + (Math.random() * 2.2);
                        const osc = this.audioCtx.createOscillator();
                        const chirpGain = this.audioCtx.createGain();
                        osc.type = "sine";
                        osc.frequency.setValueAtTime(2800 + Math.random() * 1600, chirpTime);
                        chirpGain.connect(this.audioCtx.destination);
                        osc.connect(chirpGain);
                        chirpGain.gain.setValueAtTime(this.sfxVolume * 0.30, chirpTime);
                        chirpGain.gain.exponentialRampToValueAtTime(0.001, chirpTime + 0.08);
                        osc.start(chirpTime);
                        osc.stop(chirpTime + 0.08);
                    }
                    setTimeout(() => { if (onDone) onDone(); }, 2400);
                } else {
                    this.playSynthFallback("start");
                    setTimeout(() => { if (onDone) onDone(); }, 800);
                }
            } catch (err) {
                console.warn("Riddle sound error:", err);
                if (onDone) onDone();
            }
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
                this.fadeBackgroundTo(0.05, fadeDuration, stop);
            } else {
                stop();
            }
        }

        play(soundKey) {
            if (!this.sfxEnabled) return;
            this.unlock();

            const event = this.audioEvents[soundKey] || {};
            const audio = this.soundCache.get(soundKey);
            const targetVolume = Math.min(1, this.sfxVolume * (event.level || 1.0));
            const fallback = event.fallback || soundKey;

            if (audio) {
                try {
                    audio.currentTime = 0;
                    audio.volume = targetVolume;
                    audio.muted = false;
                    audio.play().catch(() => this.playSynthFallback(fallback));
                } catch (err) {
                    this.playSynthFallback(fallback);
                }
            } else {
                this.playSynthFallback(fallback);
            }

            if (event.duckMs) {
                this.duckBackground(event.duckMs);
            }
        }

        playUiSound() {
            this.play("ui_click");
        }

        playSynthFallback(type) {
            if (!this.sfxEnabled || !this.audioCtx) return;
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
                    gain.gain.setValueAtTime(this.sfxVolume * 0.32, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                    osc.start(now);
                    osc.stop(now + 0.35);
                } else if (type === "tick") {
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(950, now);
                    gain.gain.setValueAtTime(this.sfxVolume * 0.18, now);
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
                } else if (type === "achievement") {
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(523.25, now); // C5
                    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
                    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
                    osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
                    gain.gain.setValueAtTime(this.sfxVolume * 0.40, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
                    osc.start(now);
                    osc.stop(now + 0.7);
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
                console.warn("Web Audio synthesis warning:", err);
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

            // DOM Elements
            this.screens = {
                start: document.getElementById("screen-start"),
                quiz: document.getElementById("screen-quiz"),
                gameover: document.getElementById("screen-gameover"),
            };

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

            // Initialize Player Profile & Migration
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

        async purgeObsoleteCaches() {
            if ("caches" in window) {
                try {
                    const currentCache = "spooky-master-v2.3.0";
                    const keys = await caches.keys();
                    for (const key of keys) {
                        if (key !== currentCache) {
                            console.log("[CACHE] Purging obsolete cache:", key);
                            await caches.delete(key);
                        }
                    }
                } catch (err) {
                    console.warn("[CACHE] Cache cleanup warning:", err);
                }
            }
        }

        escapeHtml(str) {
            if (str === null || str === undefined) return "";
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        // ==========================================
        // PLAYER PROFILE & MIGRATION SYSTEM
        // ==========================================
        initPlayerProfile() {
            try {
                const storedRaw = localStorage.getItem("spooky_player_profile");
                if (storedRaw) {
                    const parsed = JSON.parse(storedRaw);
                    if (parsed && typeof parsed === "object") {
                        if (!parsed.player_id) parsed.player_id = generateUuid();
                        if (!parsed.nickname) parsed.nickname = "Ghost Hunter";
                        if (!parsed.avatar_id) parsed.avatar_id = "pumpkin_hunter";
                        if (typeof parsed.diamonds !== "number") parsed.diamonds = 50;

                        if (!parsed.boosters || typeof parsed.boosters !== "object") {
                            parsed.boosters = { hint: 1, time_extension: 1, double_points: 0, shield: 0 };
                        } else {
                            if (typeof parsed.boosters.hint !== "number") parsed.boosters.hint = 1;
                            if (typeof parsed.boosters.time_extension !== "number") parsed.boosters.time_extension = 1;
                            if (typeof parsed.boosters.double_points !== "number") parsed.boosters.double_points = 0;
                            if (typeof parsed.boosters.shield !== "number") parsed.boosters.shield = 0;
                        }

                        if (!Array.isArray(parsed.cosmetics_unlocked)) {
                            parsed.cosmetics_unlocked = ["pumpkin_hunter", "ghost"];
                        }

                        if (!parsed.campaign || typeof parsed.campaign !== "object") {
                            parsed.campaign = {
                                completed_stages: {},
                                claimed_stage_rewards: {},
                                claimed_chapter_rewards: {},
                            };
                        } else {
                            if (!parsed.campaign.completed_stages) parsed.campaign.completed_stages = {};
                            if (!parsed.campaign.claimed_stage_rewards) parsed.campaign.claimed_stage_rewards = {};
                            if (!parsed.campaign.claimed_chapter_rewards) parsed.campaign.claimed_chapter_rewards = {};
                        }

                        if (!parsed.claimed_community_goals || typeof parsed.claimed_community_goals !== "object") {
                            parsed.claimed_community_goals = {};
                        }
                        if (!Array.isArray(parsed.diamond_ledger)) {
                            parsed.diamond_ledger = [];
                        }

                        if (!parsed.stats || typeof parsed.stats !== "object") {
                            parsed.stats = {
                                games_played: 0,
                                total_answered: 0,
                                total_correct: 0,
                                best_score: 0,
                                best_streak: 0,
                                preferred_mode: "classic",
                            };
                        } else {
                            if (typeof parsed.stats.games_played !== "number") parsed.stats.games_played = 0;
                            if (typeof parsed.stats.total_answered !== "number") parsed.stats.total_answered = 0;
                            if (typeof parsed.stats.total_correct !== "number") parsed.stats.total_correct = 0;
                            if (typeof parsed.stats.best_score !== "number") parsed.stats.best_score = 0;
                            if (typeof parsed.stats.best_streak !== "number") parsed.stats.best_streak = 0;
                            if (!parsed.stats.preferred_mode) parsed.stats.preferred_mode = "classic";
                        }

                        if (!parsed.preferences || typeof parsed.preferences !== "object") {
                            parsed.preferences = {
                                music_enabled: true,
                                music_volume: 0.25,
                                music_track: "haunted_mansion",
                                sfx_enabled: true,
                                sfx_volume: 0.60,
                                reduced_motion: false,
                                vibration: true,
                                theme: "default",
                            };
                        } else {
                            if (parsed.preferences.music_enabled === undefined) parsed.preferences.music_enabled = true;
                            if (typeof parsed.preferences.music_volume !== "number" || isNaN(parsed.preferences.music_volume)) parsed.preferences.music_volume = 0.25;
                            if (!parsed.preferences.music_track || parsed.preferences.music_track === "horror-ambience") parsed.preferences.music_track = "haunted_mansion";
                            if (parsed.preferences.sfx_enabled === undefined) parsed.preferences.sfx_enabled = true;
                            if (typeof parsed.preferences.sfx_volume !== "number" || isNaN(parsed.preferences.sfx_volume)) parsed.preferences.sfx_volume = 0.60;
                            parsed.preferences.reduced_motion = Boolean(parsed.preferences.reduced_motion);
                            parsed.preferences.vibration = parsed.preferences.vibration !== false;
                            if (!parsed.preferences.theme) parsed.preferences.theme = "default";
                        }

                        this.sound.applyPreferences(parsed.preferences);
                        this.saveProfile(parsed);
                        return parsed;
                    }
                }
            } catch (err) {
                console.warn("Could not read spooky_player_profile:", err);
            }

            // Check for legacy storage to perform seamless upgrade
            const legacyProgress = this.getLegacyProgress();
            const hasLegacyData = Boolean(
                localStorage.getItem("halloween_progress_v2") ||
                localStorage.getItem("halloween_progress_v1") ||
                localStorage.getItem("halloween_music_volume") ||
                localStorage.getItem("halloween_muted")
            );

            let defaultMusicVol = parseFloat(localStorage.getItem("halloween_music_volume") || "0.25");
            if (!Number.isFinite(defaultMusicVol) || defaultMusicVol < 0) defaultMusicVol = 0.25;
            let defaultSfxVol = parseFloat(localStorage.getItem("halloween_sfx_volume") || "0.60");
            if (!Number.isFinite(defaultSfxVol) || defaultSfxVol < 0) defaultSfxVol = 0.60;
            const isMuted = localStorage.getItem("halloween_muted") === "true";
            const isReducedMotion = localStorage.getItem("halloween_reduced_motion") === "true";
            const isVibration = localStorage.getItem("halloween_vibration") !== "false";

            const newProfile = {
                profile_version: 1,
                player_id: generateUuid(),
                nickname: "Ghost Hunter",
                avatar_id: "pumpkin_hunter",
                diamonds: 50,
                boosters: { hint: 1, time_extension: 1, double_points: 0, shield: 0 },
                cosmetics_unlocked: ["pumpkin_hunter", "ghost"],
                campaign: {
                    completed_stages: {},
                    claimed_stage_rewards: {},
                    claimed_chapter_rewards: {},
                },
                claimed_community_goals: {},
                diamond_ledger: [
                    { timestamp: new Date().toISOString(), amount: 50, reason: "Welcome Hunter Bounty", refId: "welcome" }
                ],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                stats: {
                    games_played: legacyProgress.games_played || 0,
                    total_answered: legacyProgress.total_answered || 0,
                    total_correct: legacyProgress.total_correct || 0,
                    best_score: legacyProgress.best_score || 0,
                    best_streak: legacyProgress.best_streak || 0,
                    preferred_mode: "classic",
                },
                preferences: {
                    music_enabled: !isMuted,
                    music_volume: Number.isFinite(defaultMusicVol) ? defaultMusicVol : 0.25,
                    music_track: "haunted_mansion",
                    sfx_enabled: !isMuted,
                    sfx_volume: Number.isFinite(defaultSfxVol) ? defaultSfxVol : 0.60,
                    reduced_motion: isReducedMotion,
                    vibration: isVibration,
                    theme: "default",
                },
            };

            this.sound.applyPreferences(newProfile.preferences);

            if (hasLegacyData) {
                // If existing legacy data, silently save upgraded profile
                this.saveProfile(newProfile);
            } else {
                // If completely new player (no legacy data), trigger onboarding
                this.openOnboarding();
            }

            return newProfile;
        }

        getLegacyProgress() {
            try {
                const p2 = JSON.parse(localStorage.getItem("halloween_progress_v2") || "null");
                if (p2) return p2;
                const p1 = JSON.parse(localStorage.getItem("halloween_progress_v1") || "null");
                if (p1) return p1;
            } catch (_) {}
            return { mastery: {}, achievements: {} };
        }

        saveProfile(profile) {
            this.profile = profile || this.profile;
            this.profile.updated_at = new Date().toISOString();
            try {
                localStorage.setItem("spooky_player_profile", JSON.stringify(this.profile));
                // Mirror legacy keys for external/test backward compatibility
                localStorage.setItem("halloween_music_volume", this.profile.preferences.music_volume.toString());
                localStorage.setItem("halloween_sfx_volume", this.profile.preferences.sfx_volume.toString());
                localStorage.setItem("halloween_muted", (!this.profile.preferences.sfx_enabled).toString());
                localStorage.setItem("halloween_reduced_motion", this.profile.preferences.reduced_motion.toString());
                localStorage.setItem("halloween_vibration", this.profile.preferences.vibration.toString());
            } catch (err) {
                console.warn("Failed to persist player profile:", err);
            }
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

        applyProfileToUi() {
            if (!this.profile) return;
            const avatar = this.getAvatarById(this.profile.avatar_id);

            // Setup Form
            if (this.dom.playerName) this.dom.playerName.value = this.profile.nickname;
            if (this.dom.startAvatarImg) {
                this.dom.startAvatarImg.src = avatar.asset;
                this.dom.startAvatarImg.alt = avatar.name;
            }

            // Settings Modal
            if (this.dom.settingsPlayerName) this.dom.settingsPlayerName.value = this.profile.nickname;
            if (this.dom.settingsAvatarImg) {
                this.dom.settingsAvatarImg.src = avatar.asset;
                this.dom.settingsAvatarImg.alt = avatar.name;
            }

            // Dashboard Modal
            if (this.dom.dashboardPlayerName) this.dom.dashboardPlayerName.textContent = this.profile.nickname;
            if (this.dom.dashboardAvatarImg) {
                this.dom.dashboardAvatarImg.src = avatar.asset;
                this.dom.dashboardAvatarImg.alt = avatar.name;
            }
            if (this.dom.dashboardPlayerIdText) {
                this.dom.dashboardPlayerIdText.textContent = this.profile.player_id.substring(0, 8);
            }

            // Reduced motion state
            document.documentElement.classList.toggle("reduced-motion", Boolean(this.profile.preferences.reduced_motion));

            this.syncSettingsUi();
            this.renderLobbyExperience();
        }

        updateAvatar(avatarId) {
            const avatar = this.getAvatarById(avatarId);
            if (!avatar) return;
            this.profile.avatar_id = avatar.id;
            this.saveProfile();
            this.applyProfileToUi();
            this.showToast("Avatar Changed", `Selected ${avatar.name}`, avatar.icon || "✨");
        }

        updateNickname(name) {
            const sanitized = (name || "").trim().substring(0, 30);
            if (!sanitized) return;
            this.profile.nickname = sanitized;
            this.saveProfile();
            this.applyProfileToUi();
        }

        // ==========================================
        // HAUNTED GAME LOBBY EXPERIENCE
        // ==========================================
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

        renderLobbyExperience() {
            if (!this.profile) return;
            const avatar = this.getAvatarById(this.profile.avatar_id);

            // 1. Player Identity Bar
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

            // 2. Continue Journey Card & Dynamic Stage Progression Map
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

            // Floating Supernatural Guises Dock Carousel
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

            // Dynamic Stage Map
            const completedStages = (this.profile && this.profile.campaign && this.profile.campaign.completed_stages) || {};
            this.renderDynamicStageMap(progress.stages, progress.activeStage?.id, completedStages);

            // 3. Progress Snapshot
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

            // 4. Spooky Guide initial hint
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
        // EVENT INITIALIZATION
        // ==========================================
        initEvents() {
            // Robust audio unlock and background ambience start on user interaction
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

            // Global Escape key closes active modals
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    this.closeAllModals();
                }
            });

            // UI sound on interactive buttons
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

            // Start screen avatar click to change avatar
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

            // Haunted Game Lobby Actions
            this.dom.btnEnterTheHaunt?.addEventListener("click", () => {
                this.startGame();
            });

            this.dom.btnLobbyContinueJourney?.addEventListener("click", () => {
                this.handleLobbyContinueJourney();
            });

            this.dom.btnLobbyQuickPlay?.addEventListener("click", () => {
                this.startGameWithParams({ mode: "quick", num_questions: 5 });
            });

            this.dom.btnLobbyDailyHaunt?.addEventListener("click", () => {
                this.startGameWithParams({ mode: "daily", num_questions: 10 });
            });

            this.dom.btnLobbyDuels?.addEventListener("click", () => {
                this.openDuels();
            });

            this.dom.btnLobbyAvatar?.addEventListener("click", () => {
                this.openAvatarPicker();
            });

            this.dom.btnLobbyEditProfile?.addEventListener("click", () => {
                this.openSettings();
            });

            this.dom.lobbyDiamondsPill?.addEventListener("click", () => {
                this.openShop();
            });

            this.dom.lobbyProgressSnapshot?.addEventListener("click", () => {
                this.openMastery();
            });

            this.dom.btnLobbyProgress?.addEventListener("click", (e) => {
                e.stopPropagation();
                this.openMastery();
            });

            this.dom.btnLobbyLeaderboard?.addEventListener("click", () => {
                this.openLeaderboard();
            });

            this.dom.btnLobbySettings?.addEventListener("click", () => {
                this.openSettings();
            });

            this.dom.btnGuideNextHint?.addEventListener("click", () => {
                this.cycleSpookyGuideHint();
            });

            // Next Question Button
            this.dom.btnNextQuestion.addEventListener("click", () => this.advanceToNext());

            // Play Again
            this.dom.btnPlayAgain.addEventListener("click", () => {
                this.showScreen("start");
                this.sound.startBackgroundAmbience();
            });

            // Notice Dismiss
            this.dom.btnNoticeDismiss?.addEventListener("click", () => {
                this.hideNotice();
            });

            // Share Survival Card
            this.dom.btnShareResult?.addEventListener("click", () => {
                this.shareSurvivalCard();
            });

            // Navigation Buttons
            this.dom.btnLeaderboard?.addEventListener("click", () => this.openLeaderboard());
            this.dom.btnViewBoardFinish?.addEventListener("click", () => this.openLeaderboard());
            this.dom.btnCloseModal?.addEventListener("click", () => this.closeLeaderboard());
            this.dom.modalLeaderboard?.addEventListener("click", (e) => {
                if (e.target === this.dom.modalLeaderboard) this.closeLeaderboard();
            });

            // Leaderboard View Switcher (All-Time, Today's Daily, Personal Best)
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

            // Spooky Master Pass & VIP Modal Events
            this.dom.btnPassNav?.addEventListener("click", () => this.openPremiumModal());
            this.dom.btnClosePremium?.addEventListener("click", () => this.closePremiumModal());
            this.dom.modalPremium?.addEventListener("click", (e) => {
                if (e.target === this.dom.modalPremium) this.closePremiumModal();
            });
            this.dom.btnPurchasePass?.addEventListener("click", () => this.handlePurchasePass());
            this.dom.btnSubscribeVip?.addEventListener("click", () => this.handleSubscribeVip());
            this.dom.btnRestorePurchases?.addEventListener("click", () => this.handleRestorePurchases());
            this.dom.btnDevTogglePass?.addEventListener("click", () => this.handleDevTogglePass());

            // Settings Modal Open/Close
            this.dom.btnSettingsOpen?.addEventListener("click", () => this.openSettings());
            this.dom.btnCloseSettings?.addEventListener("click", () => this.closeSettings());
            this.dom.modalSettings?.addEventListener("click", (e) => {
                if (e.target === this.dom.modalSettings) this.closeSettings();
            });

            // Settings: Change Avatar
            this.dom.btnSettingsChangeAvatar?.addEventListener("click", () => {
                this.openAvatarPicker();
            });

            // Settings: Hunter Name change
            this.dom.settingsPlayerName?.addEventListener("change", (e) => {
                this.updateNickname(e.target.value);
            });

            // Settings: Audio Controls
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

            // Settings: Accessibility Controls
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

            // Settings: Reset Data
            this.dom.btnResetProgress?.addEventListener("click", () => {
                this.resetProgressData();
            });

            // Mastery / Profile Modal Open/Close
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

            // Onboarding Avatar Grid, Close, and Name Suggestions
            this.renderOnboardingAvatarGrid();
            this.dom.btnSaveOnboarding?.addEventListener("click", () => {
                this.completeOnboarding();
            });
            this.dom.btnSkipOnboarding?.addEventListener("click", () => {
                this.completeOnboarding();
            });
            this.dom.btnCloseOnboarding?.addEventListener("click", () => {
                this.completeOnboarding();
            });
            this.dom.modalOnboarding?.addEventListener("click", (e) => {
                if (e.target === this.dom.modalOnboarding) {
                    this.completeOnboarding();
                }
            });
            document.querySelectorAll(".btn-suggestion").forEach((btn) => {
                btn.addEventListener("click", () => {
                    if (this.dom.onboardingHunterName) {
                        this.dom.onboardingHunterName.value = btn.textContent;
                        this.sound.playUiSound();
                    }
                });
            });

            // Shared Avatar Picker Modal & Supernatural Hunter Studio
            this.dom.btnCloseAvatarPicker?.addEventListener("click", () => this.closeAvatarPicker());
            this.dom.modalAvatarPicker?.addEventListener("click", (e) => {
                if (e.target === this.dom.modalAvatarPicker) this.closeAvatarPicker();
            });
            this.dom.tabAvatarPredefined?.addEventListener("click", () => this.switchAvatarTab("predefined"));
            this.dom.tabAvatarGenerator?.addEventListener("click", () => this.switchAvatarTab("generator"));
            this.dom.btnGenerateHunter?.addEventListener("click", () => this.generateHunterAvatar());
            this.dom.btnEquipGeneratedHunter?.addEventListener("click", () => this.equipGeneratedHunter());

            // Diamond Market / Shop
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

            // Campaign: The Haunted Journey
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

            // Community Haunt Claim
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

            // Audio Riddles Panel
            this.dom.btnPlayRiddleClip?.addEventListener("click", () => this.playActiveRiddleSound());
            this.dom.btnToggleTranscript?.addEventListener("click", () => this.toggleRiddleTranscript());

            // Haunted Duels
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

        // ==========================================
        // FIRST-LAUNCH ONBOARDING
        // ==========================================
        openOnboarding() {
            this.dom.modalOnboarding?.classList.remove("hidden");
            if (this.dom.onboardingHunterName) {
                this.dom.onboardingHunterName.focus();
            }
        }

        closeOnboarding() {
            this.dom.modalOnboarding?.classList.add("hidden");
        }

        renderOnboardingAvatarGrid() {
            if (!this.dom.onboardingAvatarGrid) return;
            this.dom.onboardingAvatarGrid.innerHTML = "";

            const baseAvatars = PREDEFINED_AVATARS.filter((avatar) => !avatar.is_premium);
            baseAvatars.forEach((avatar, idx) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = `avatar-option-card ${avatar.id === this.selectedOnboardingAvatar ? "selected" : ""}`;
                btn.setAttribute("role", "radio");
                btn.setAttribute("aria-checked", avatar.id === this.selectedOnboardingAvatar ? "true" : "false");
                btn.setAttribute("aria-label", avatar.name);
                btn.innerHTML = `
                    <img src="${avatar.asset}" alt="${avatar.name}" class="avatar-card-img" width="56" height="56">
                    <span class="avatar-card-name">${avatar.name}</span>
                    <small class="avatar-card-desc">${avatar.desc}</small>
                `;
                btn.addEventListener("click", () => {
                    this.selectedOnboardingAvatar = avatar.id;
                    this.renderOnboardingAvatarGrid();
                    this.sound.playUiSound();
                });
                this.dom.onboardingAvatarGrid.appendChild(btn);
            });
        }

        completeOnboarding() {
            const hunterInput = this.dom.onboardingHunterName?.value.trim();
            const nickname = hunterInput || "Ghost Hunter";
            const avatarId = this.selectedOnboardingAvatar || "pumpkin_hunter";

            this.updateNickname(nickname);
            this.updateAvatar(avatarId);

            this.closeOnboarding();
            this.showToast("Welcome to Spooky Master!", `Identity established: ${nickname}`, "🎃");
            this.sound.play("quiz_start");
        }

        closeAllModals() {
            if (this.dom.modalOnboarding && !this.dom.modalOnboarding.classList.contains("hidden")) {
                this.completeOnboarding();
            }
            this.dom.modalCampaign?.classList.add("hidden");
            this.dom.modalChapterStory?.classList.add("hidden");
            this.dom.modalDuels?.classList.add("hidden");
            this.dom.modalMastery?.classList.add("hidden");
            this.dom.modalLeaderboard?.classList.add("hidden");
            this.dom.modalSettings?.classList.add("hidden");
            this.dom.modalShop?.classList.add("hidden");
            this.dom.modalAvatarPicker?.classList.add("hidden");
            this.dom.modalPremium?.classList.add("hidden");
        }

        openHome() {
            this.closeAllModals();
            this.showScreen("start");
            this.renderLobbyExperience();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }

        // ==========================================
        // SHARED AVATAR PICKER & HUNTER STUDIO
        // ==========================================
        openAvatarPicker() {
            this.switchAvatarTab("predefined");
            if (!this.dom.sharedAvatarGrid) return;
            this.dom.sharedAvatarGrid.innerHTML = "";

            PREDEFINED_AVATARS.forEach((avatar) => {
                const isCurrent = avatar.id === this.profile.avatar_id;
                const isLocked = avatar.is_premium && !this.isPremium();
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = `avatar-option-card ${isCurrent ? "selected" : ""} ${isLocked ? "avatar-locked" : ""}`;
                btn.setAttribute("role", "radio");
                btn.setAttribute("aria-checked", isCurrent ? "true" : "false");
                btn.setAttribute("aria-label", avatar.name);
                btn.innerHTML = `
                    ${isLocked ? `<span class="avatar-lock-badge">🔒 PASS</span>` : ""}
                    <img src="${avatar.asset}" alt="${avatar.name}" class="avatar-card-img" width="56" height="56">
                    <span class="avatar-card-name">${avatar.name}</span>
                    <small class="avatar-card-desc">${avatar.desc}</small>
                `;
                btn.addEventListener("click", () => {
                    if (isLocked) {
                        this.openPremiumModal();
                        return;
                    }
                    this.updateAvatar(avatar.id);
                    this.closeAvatarPicker();
                });
                this.dom.sharedAvatarGrid.appendChild(btn);
            });

            this.dom.modalAvatarPicker?.classList.remove("hidden");
        }

        closeAvatarPicker() {
            this.dom.modalAvatarPicker?.classList.add("hidden");
        }

        switchAvatarTab(tabName) {
            if (tabName === "generator") {
                this.dom.tabAvatarGenerator?.classList.add("active");
                this.dom.tabAvatarGenerator?.setAttribute("aria-selected", "true");
                this.dom.tabAvatarPredefined?.classList.remove("active");
                this.dom.tabAvatarPredefined?.setAttribute("aria-selected", "false");
                this.dom.pickerGeneratorBody?.classList.remove("hidden");
                this.dom.pickerPredefinedBody?.classList.add("hidden");
                this.initHunterStudio();
            } else {
                this.dom.tabAvatarPredefined?.classList.add("active");
                this.dom.tabAvatarPredefined?.setAttribute("aria-selected", "true");
                this.dom.tabAvatarGenerator?.classList.remove("active");
                this.dom.tabAvatarGenerator?.setAttribute("aria-selected", "false");
                this.dom.pickerPredefinedBody?.classList.remove("hidden");
                this.dom.pickerGeneratorBody?.classList.add("hidden");
            }
        }

        async initHunterStudio() {
            if (!this.hunterStudioOptions) {
                this.hunterStudioOptions = {
                    creatures: [
                        { id: "ghost", name: "Spectral Ghost", icon: "👻" },
                        { id: "vampire", name: "Crimson Vampire", icon: "🧛" },
                        { id: "witch", name: "Midnight Witch", icon: "🧙" },
                        { id: "skeleton", name: "Crypt Skeleton", icon: "💀" },
                        { id: "werewolf", name: "Lunar Werewolf", icon: "🐺" },
                        { id: "pumpkin_spirit", name: "Pumpkin Spirit", icon: "🎃" },
                    ],
                    styles: [
                        { id: "dark_fantasy", name: "Dark Fantasy" },
                        { id: "cute", name: "Cute / Chibi" },
                        { id: "neon_horror", name: "Neon Horror" },
                        { id: "comic", name: "Comic Book" },
                        { id: "gothic", name: "Victorian Gothic" },
                    ],
                    colors: [
                        { id: "purple", name: "Eerie Purple", hex: "#a855f7" },
                        { id: "green", name: "Spectral Green", hex: "#10b981" },
                        { id: "orange", name: "Pumpkin Orange", hex: "#f97316" },
                        { id: "blue", name: "Midnight Blue", hex: "#3b82f6" },
                        { id: "crimson", name: "Blood Crimson", hex: "#ef4444" },
                    ],
                    accessories: [
                        { id: "lantern", name: "Spooky Lantern", icon: "🏮" },
                        { id: "crown", name: "Phantom Crown", icon: "👑" },
                        { id: "magic_staff", name: "Arcane Staff", icon: "🪄" },
                        { id: "cape", name: "Midnight Cape", icon: "🦇" },
                        { id: "headphones", name: "Ghostly Beats", icon: "🎧" },
                        { id: "spell_book", name: "Ancient Grimoire", icon: "📖" },
                    ],
                };

                try {
                    const res = await fetch("/api/ai/avatar/options");
                    if (res.ok) {
                        const data = await res.json();
                        if (data.creatures) this.hunterStudioOptions = data;
                    }
                } catch (_) {}
            }

            this.renderStudioPills();
            this.updateStudioPreview();
            this.fetchPlayerGeneratedAvatars();
        }

        renderStudioPills() {
            if (!this.hunterStudioOptions) return;

            // 1. Creatures
            if (this.dom.studioCreaturesGrid) {
                this.dom.studioCreaturesGrid.innerHTML = "";
                this.hunterStudioOptions.creatures.forEach((c) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = `studio-pill ${this.studioSelection.creature === c.id ? "active" : ""}`;
                    btn.innerHTML = `<span class="pill-icon">${c.icon || "🎃"}</span> <span class="pill-label">${c.name}</span>`;
                    btn.addEventListener("click", () => {
                        this.studioSelection.creature = c.id;
                        this.renderStudioPills();
                        this.updateStudioPreview();
                    });
                    this.dom.studioCreaturesGrid.appendChild(btn);
                });
            }

            // 2. Styles
            if (this.dom.studioStylesGrid) {
                this.dom.studioStylesGrid.innerHTML = "";
                this.hunterStudioOptions.styles.forEach((s) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = `studio-pill ${this.studioSelection.style === s.id ? "active" : ""}`;
                    btn.innerHTML = `<span class="pill-label">${s.name}</span>`;
                    btn.addEventListener("click", () => {
                        this.studioSelection.style = s.id;
                        this.renderStudioPills();
                        this.updateStudioPreview();
                    });
                    this.dom.studioStylesGrid.appendChild(btn);
                });
            }

            // 3. Colors
            if (this.dom.studioColorsGrid) {
                this.dom.studioColorsGrid.innerHTML = "";
                this.hunterStudioOptions.colors.forEach((col) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = `studio-pill pill-color ${this.studioSelection.color === col.id ? "active" : ""}`;
                    btn.innerHTML = `<span class="pill-color-dot" style="background:${col.hex};"></span> <span class="pill-label">${col.name}</span>`;
                    btn.addEventListener("click", () => {
                        this.studioSelection.color = col.id;
                        this.renderStudioPills();
                        this.updateStudioPreview();
                    });
                    this.dom.studioColorsGrid.appendChild(btn);
                });
            }

            // 4. Accessories
            if (this.dom.studioAccessoriesGrid) {
                this.dom.studioAccessoriesGrid.innerHTML = "";
                this.hunterStudioOptions.accessories.forEach((a) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = `studio-pill ${this.studioSelection.accessory === a.id ? "active" : ""}`;
                    btn.innerHTML = `<span class="pill-icon">${a.icon || "✨"}</span> <span class="pill-label">${a.name}</span>`;
                    btn.addEventListener("click", () => {
                        this.studioSelection.accessory = a.id;
                        this.renderStudioPills();
                        this.updateStudioPreview();
                    });
                    this.dom.studioAccessoriesGrid.appendChild(btn);
                });
            }
        }

        updateStudioPreview() {
            const cObj = this.hunterStudioOptions?.creatures.find(c => c.id === this.studioSelection.creature);
            const sObj = this.hunterStudioOptions?.styles.find(s => s.id === this.studioSelection.style);

            const creatureName = cObj ? cObj.name : "Hunter";
            const styleName = sObj ? sObj.name : "Dark Fantasy";

            if (this.dom.hunterPreviewName) this.dom.hunterPreviewName.textContent = creatureName;
            if (this.dom.hunterPreviewStyle) this.dom.hunterPreviewStyle.textContent = styleName;
        }

        async generateHunterAvatar() {
            if (!this.dom.btnGenerateHunter) return;
            this.dom.btnGenerateHunter.disabled = true;
            this.dom.btnGenerateHunter.textContent = "⏳ Synthesizing Hunter...";

            if (this.dom.studioStatusMsg) {
                this.dom.studioStatusMsg.textContent = "Weaving supernatural vectors from the ether...";
                this.dom.studioStatusMsg.className = "studio-status-text info";
            }

            const trait = this.dom.studioFlairInput ? this.dom.studioFlairInput.value.trim() : "";
            const playerId = this.profile?.player_id || "guest_default";

            try {
                const res = await fetch("/api/ai/avatar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Player-ID": playerId,
                    },
                    body: JSON.stringify({
                        player_id: playerId,
                        creature: this.studioSelection.creature,
                        style: this.studioSelection.style,
                        color: this.studioSelection.color,
                        accessory: this.studioSelection.accessory,
                        custom_trait: trait || null,
                    }),
                });

                if (res.status === 429) {
                    const errData = await res.json().catch(() => ({ detail: "Daily synthesis limit reached." }));
                    throw new Error(errData.detail || "Cooling down. The crypt requires rest between summonings.");
                }
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({ detail: "Summoning failed." }));
                    throw new Error(errData.detail || "Failed to synthesize hunter avatar.");
                }

                const data = await res.json();
                this.lastSynthesizedAvatar = data;

                if (this.dom.hunterPreviewImg) {
                    this.dom.hunterPreviewImg.src = data.asset_url;
                    this.dom.hunterPreviewImg.alt = data.name;
                }
                if (this.dom.hunterPreviewName) this.dom.hunterPreviewName.textContent = data.name;
                if (this.dom.hunterPreviewStyle) this.dom.hunterPreviewStyle.textContent = (data.style || "").toUpperCase();
                if (this.dom.btnEquipGeneratedHunter) {
                    this.dom.btnEquipGeneratedHunter.classList.remove("hidden");
                }

                if (this.dom.studioStatusMsg) {
                    this.dom.studioStatusMsg.textContent = data.is_cached
                        ? "✨ Grimoire Memory: Restored ancient manifestation from the archives!"
                        : "✨ Supernatural Hunter materialized and bound to your spirit!";
                    this.dom.studioStatusMsg.className = "studio-status-text success";
                }

                const exists = this.synthesizedAvatars.some(a => (a.id || a.avatar_id) === data.id);
                if (!exists) {
                    this.synthesizedAvatars.unshift(data);
                    this.saveSynthesizedAvatars();
                }
                this.renderHunterGallery();
                this.sound.play("achievement");
                this.showToast("Hunter Synthesized!", data.name, "✨");
            } catch (err) {
                if (this.dom.studioStatusMsg) {
                    this.dom.studioStatusMsg.textContent = err.message || "Failed to summon hunter.";
                    this.dom.studioStatusMsg.className = "studio-status-text error";
                }
            } finally {
                if (this.dom.btnGenerateHunter) {
                    this.dom.btnGenerateHunter.disabled = false;
                    this.dom.btnGenerateHunter.textContent = "✨ Summon Supernatural Hunter";
                }
            }
        }

        equipGeneratedHunter() {
            if (!this.lastSynthesizedAvatar) return;
            const avId = this.lastSynthesizedAvatar.id || this.lastSynthesizedAvatar.avatar_id;
            this.updateAvatar(avId);
            this.closeAvatarPicker();
        }

        async fetchPlayerGeneratedAvatars() {
            const playerId = this.profile?.player_id || "guest_default";
            try {
                const res = await fetch("/api/ai/avatars", {
                    headers: { "X-Player-ID": playerId },
                });
                if (res.ok) {
                    const list = await res.json();
                    if (Array.isArray(list)) {
                        list.forEach((item) => {
                            const id = item.id || item.avatar_id;
                            if (!this.synthesizedAvatars.some(a => (a.id || a.avatar_id) === id)) {
                                this.synthesizedAvatars.push(item);
                            }
                        });
                        this.saveSynthesizedAvatars();
                    }
                }
            } catch (_) {}

            this.renderHunterGallery();
        }

        renderHunterGallery() {
            if (!this.dom.hunterGalleryGrid) return;
            this.dom.hunterGalleryGrid.innerHTML = "";

            if (!this.synthesizedAvatars || this.synthesizedAvatars.length === 0) {
                this.dom.hunterGalleryGrid.innerHTML = `<p class="gallery-empty-text">No synthesized hunters yet. Summon your first companion!</p>`;
                return;
            }

            this.synthesizedAvatars.forEach((av) => {
                const avId = av.id || av.avatar_id;
                const isCurrent = this.profile.avatar_id === avId;
                const card = document.createElement("div");
                card.className = `hunter-gallery-item ${isCurrent ? "selected" : ""}`;
                card.setAttribute("role", "button");
                card.setAttribute("tabindex", "0");
                card.setAttribute("title", `Equip ${av.name}`);
                card.innerHTML = `
                    <img src="${av.asset_url || av.asset}" alt="${this.escapeHtml(av.name)}" width="48" height="48">
                    <span class="hunter-thumb-name">${this.escapeHtml(av.name)}</span>
                `;
                const selectItem = () => {
                    this.lastSynthesizedAvatar = av;
                    if (this.dom.hunterPreviewImg) {
                        this.dom.hunterPreviewImg.src = av.asset_url || av.asset;
                        this.dom.hunterPreviewImg.alt = av.name;
                    }
                    if (this.dom.hunterPreviewName) this.dom.hunterPreviewName.textContent = av.name;
                    if (this.dom.hunterPreviewStyle) this.dom.hunterPreviewStyle.textContent = (av.style || "").toUpperCase();
                    if (this.dom.btnEquipGeneratedHunter) this.dom.btnEquipGeneratedHunter.classList.remove("hidden");
                    this.updateAvatar(avId);
                    this.renderHunterGallery();
                };
                card.addEventListener("click", selectItem);
                card.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectItem();
                    }
                });
                this.dom.hunterGalleryGrid.appendChild(card);
            });
        }

        // ==========================================
        // CONVERSATIONAL SPOOKY GUIDE HINTS
        // ==========================================
        async requestSpookyGuideHint(level = 1) {
            if (this.gameMode === "daily" || this.gameMode === "duel") {
                this.showToast("Strict Isolation", "Spooky Guide hints are sealed in competitive trials!", "🔒");
                return;
            }
            if (this.isAnswerPending || this.isFeedbackActive || !this.currentQuestion) return;

            this.currentHintLevel = Math.max(1, Math.min(3, level));
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
                        session_id: this.sessionId,
                        question_id: this.currentQuestion.id || null,
                        category: this.currentQuestion.category || null,
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
                this.sound.playUiSound();
            } catch (err) {
                console.warn("Spooky Guide hint fallback:", err);
                const cat = this.currentQuestion?.category || "spooky";
                const fallbackText = CATEGORY_FACTS[cat] || "Focus on the oldest lore of All Hallows' Eve.";
                if (this.dom.quizGuideHintText) {
                    this.dom.quizGuideHintText.textContent = `"${fallbackText}"`;
                }
            }
        }

        // ==========================================
        // PWA REGISTRATION
        // ==========================================
        initPwa() {
            if ("serviceWorker" in navigator) {
                window.addEventListener("load", () => {
                    navigator.serviceWorker.register("/sw.js").then((reg) => {
                        // Immediately check for updated service worker
                        reg.update().catch(() => {});
                    }).catch((err) => {
                        console.warn("[PWA] ServiceWorker registration warning:", err);
                    });
                });

                // Listen for active service worker controller changes
                navigator.serviceWorker.addEventListener("controllerchange", () => {
                    console.log("[PWA] New service worker took control; application shell updated.");
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

        onModeChange(mode) {
            this.gameMode = mode;
            if (!this.dom.wrapNumQuestions) return;

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
                const card = cb.closest(".category-card");
                if (card) {
                    card.classList.toggle("selected", checked);
                    card.setAttribute("aria-checked", checked ? "true" : "false");
                    const checkBadge = card.querySelector(".cat-check-badge");
                    if (checkBadge) checkBadge.textContent = checked ? "✓" : "○";
                }
            });
        }

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
        // SETTINGS & UI SYNCHRONIZATION
        // ==========================================
        syncSettingsUi() {
            // Music Controls
            if (this.dom.modalBtnBgmToggle) {
                this.dom.modalBtnBgmToggle.textContent = this.sound.musicEnabled ? "Music: On" : "Music: Off";
                this.dom.modalBtnBgmToggle.classList.toggle("btn-active", this.sound.musicEnabled);
            }
            if (this.dom.settingMusicTrack) {
                this.dom.settingMusicTrack.value = this.sound.selectedTrack;
            }
            if (this.dom.modalMusicSlider) {
                this.dom.modalMusicSlider.value = this.sound.musicVolume;
            }
            if (this.dom.musicVolVal) {
                this.dom.musicVolVal.textContent = `${Math.round(this.sound.musicVolume * 100)}%`;
            }

            // SFX Controls
            if (this.dom.modalBtnSoundToggle) {
                this.dom.modalBtnSoundToggle.textContent = this.sound.sfxEnabled ? "Sound: On" : "Sound: Muted";
                this.dom.modalBtnSoundToggle.classList.toggle("btn-active", this.sound.sfxEnabled);
            }
            if (this.dom.modalSfxSlider) {
                this.dom.modalSfxSlider.value = this.sound.sfxVolume;
            }
            if (this.dom.sfxVolVal) {
                this.dom.sfxVolVal.textContent = `${Math.round(this.sound.sfxVolume * 100)}%`;
            }

            // Accessibility Controls
            if (this.dom.settingReducedMotion) {
                this.dom.settingReducedMotion.checked = Boolean(this.profile?.preferences?.reduced_motion);
            }
            if (this.dom.settingVibration) {
                this.dom.settingVibration.checked = this.profile?.preferences?.vibration !== false;
            }
            this.renderThemesGrid();
        }

        renderThemesGrid() {
            const grid = this.dom.settingsThemesGrid || document.getElementById("settings-themes-grid");
            if (!grid) return;
            grid.innerHTML = "";

            const activeTheme = (this.profile && this.profile.preferences && this.profile.preferences.theme) || "default";

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

        applyTheme(themeId) {
            const theme = themeId || (this.profile?.preferences?.theme) || "default";
            if (theme === "default") {
                document.documentElement.removeAttribute("data-theme");
                document.body.removeAttribute("data-theme");
            } else {
                document.documentElement.setAttribute("data-theme", theme);
                document.body.setAttribute("data-theme", theme);
            }
        }

        // ==========================================
        // ENTITLEMENTS & SPOOKY MASTER PASS SYSTEM
        // ==========================================
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

        openPremiumModal() {
            this.closeAllModals();
            this.dom.modalPremium?.classList.remove("hidden");
            this.fetchEntitlements();
        }

        closePremiumModal() {
            this.dom.modalPremium?.classList.add("hidden");
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

        showScreen(screenName) {
            Object.values(this.screens).forEach((s) => s.classList.remove("active"));
            if (this.screens[screenName]) {
                this.screens[screenName].classList.add("active");
            }
            window.scrollTo({ top: 0, behavior: "smooth" });
        }

        // ==========================================
        // CATEGORIES (INTERACTIVE CARDS REDESIGN)
        // ==========================================
        async loadCategories() {
            const renderCategoryCards = (categories) => {
                if (!Array.isArray(categories) || categories.length === 0) return false;
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

            renderCategoryCards(window.__HALLOWEEN_CATEGORY_FALLBACK__);
            try {
                const res = await fetch("/api/categories");
                if (!res.ok) throw new Error("Failed to load categories");
                const data = await res.json();
                renderCategoryCards(data.categories);
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
            const playerName = (formData.get("player_name") || this.profile.nickname || "Ghost Hunter").trim();
            const difficulty = formData.get("difficulty") || "medium";
            const mode = formData.get("mode") || "classic";
            this.gameMode = mode;

            // Sync updated name into profile if changed
            if (playerName !== this.profile.nickname) {
                this.updateNickname(playerName);
            }

            let numQuestions = parseInt(formData.get("num_questions") || "10", 10);
            if (mode === "quick") numQuestions = 5;
            else if (mode === "deep") numQuestions = 15;
            else if (mode === "endless") numQuestions = 50;
            else if (mode === "daily") numQuestions = 10;

            const selectedCategories = formData.getAll("categories");

            // Category Selection Guard
            if (selectedCategories.length === 0) {
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
                        adaptive: "🧠 Adaptive",
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

                this.sound.play("quiz_start");
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
            this.boosterDoublePointsActive = false;
            this.boosterShieldActive = false;

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
            this.dom.questionText.classList.remove("fog-active", "fog-reduced-motion");

            // Audio Riddle Handling
            if (qView.audio_clip_id) {
                this.activeRiddleClip = qView.audio_clip_id;
                this.dom.audioRiddlePanel?.classList.remove("hidden");
                if (this.dom.riddleTranscriptText) {
                    this.dom.riddleTranscriptText.textContent = qView.accessible_transcript || "Listen to identify the spectral presence.";
                }
                this.dom.riddleTranscriptBox?.classList.add("hidden");
            } else {
                this.activeRiddleClip = null;
                this.dom.audioRiddlePanel?.classList.add("hidden");
            }

            // Duel Trap Handling
            const activeTrap = qView.active_trap || (this.activeDuelTraps && this.activeDuelTraps.length > 0 ? this.activeDuelTraps[(qView.index - 1) % this.activeDuelTraps.length] : null);
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

            // Conversational Spooky Guide & Boosters HUD
            this.currentHintLevel = 1;
            this.dom.quizSpookyGuideBox?.classList.add("hidden");
            this.dom.adaptiveChallengeBanner?.classList.add("hidden");
            this.dom.feedbackAdaptiveBox?.classList.add("hidden");

            if (this.gameMode === "daily" || this.gameMode === "duel") {
                this.dom.boosterHudBar?.classList.add("hidden");
                this.dom.btnAskSpookyGuide?.classList.add("hidden");
            } else {
                this.dom.boosterHudBar?.classList.remove("hidden");
                this.dom.btnAskSpookyGuide?.classList.remove("hidden");
                this.updateBoosterHud();
            }

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

            this.dom.feedbackPanel.classList.add("hidden");
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

                // Warning sound during final 5 seconds
                if (this.timeRemaining <= 5.0 && this.timeRemaining > 0) {
                    if (Math.floor(this.timeRemaining + deltaSec) !== Math.floor(this.timeRemaining)) {
                        this.sound.play("timer_warning");
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
                    headers: {
                        "Content-Type": "application/json",
                        "X-Player-ID": this.profile?.player_id || "guest_default",
                    },
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
                this.sound.play(selectedAnswer === "[TIME EXPIRED]" ? "timeout" : "incorrect");
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

            // Unlocked badges feedback
            const allEarned = [...newAchievements];
            if (result.achievement_unlocked && !allEarned.includes(result.achievement_unlocked)) {
                allEarned.push(result.achievement_unlocked);
            }

            if (allEarned.length > 0) {
                this.sound.play("achievement");
                this.dom.feedbackAchievement.textContent = `🏅 ${allEarned.join(" · ")}`;
                this.dom.feedbackAchievement.classList.remove("hidden");
                allEarned.forEach((badge) => this.showToast("Achievement Unlocked!", badge, "🏆"));
            } else {
                this.dom.feedbackAchievement.classList.add("hidden");
            }

            // Adaptive Learning Scaffolding Feedback
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
            } else {
                this.dom.feedbackAdaptiveBox?.classList.add("hidden");
            }

            this.dom.liveScore.textContent = this.currentScore;
            this.dom.streakCount.textContent = `${this.currentStreak} Streak`;

            this.dom.feedbackPanel.classList.remove("hidden");
            this.dom.btnNextQuestion.focus();
        }

        vibrate(pattern) {
            if (!this.profile?.preferences?.vibration) return;
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

            // Profile stats update
            this.profile.stats.total_answered += 1;
            if (result.is_correct) this.profile.stats.total_correct += 1;
            if (result.streak > this.profile.stats.best_streak) {
                this.profile.stats.best_streak = result.streak;
            }

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
            this.saveProfile();
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
            this.syncSettingsUi();

            try {
                const res = await fetch(`/api/quiz/${this.sessionId}`);
                if (!res.ok) throw new Error("Failed to load summary");
                const data = await res.json();
                const summary = data.summary || {};

                // Update Profile Stats
                this.profile.stats.games_played += 1;
                if (data.score > this.profile.stats.best_score) {
                    this.profile.stats.best_score = data.score;
                }
                this.saveProfile();

                this.dom.statFinalScore.textContent = data.score;
                this.dom.statAccuracy.textContent = `${summary.percentage || 0}%`;
                this.dom.statCorrect.textContent = `${summary.correct_count || 0}/${summary.total_questions || 10}`;
                this.dom.statMaxStreak.textContent = summary.max_streak || 0;

                // Populate Visual Survival Share Card
                const currentAvatar = this.getAvatarById(this.profile.avatar_id);
                const masteryTier = getMasteryTier(summary.percentage || 0);
                if (this.dom.shareCardAvatar) this.dom.shareCardAvatar.src = currentAvatar.asset;
                if (this.dom.shareCardHunterName) this.dom.shareCardHunterName.textContent = this.profile.nickname;
                if (this.dom.shareCardTierBadge) this.dom.shareCardTierBadge.textContent = `${masteryTier.title} ${masteryTier.icon}`;
                if (this.dom.shareCardScore) this.dom.shareCardScore.textContent = Number(data.score || 0).toLocaleString();
                if (this.dom.shareCardAcc) this.dom.shareCardAcc.textContent = `${summary.percentage || 0}%`;
                if (this.dom.shareCardStreak) this.dom.shareCardStreak.textContent = `${summary.max_streak || 0} 🔥`;
                if (this.dom.shareCardModeBadge) this.dom.shareCardModeBadge.textContent = this.gameMode.toUpperCase();

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

                this.confetti.burst();

                // Economy: award 5 diamonds for completing any round
                this.addDiamonds(5, "Round Completed", `round_${this.sessionId}`);

                // Campaign Stage Completion Handling
                if (this.gameMode === "campaign" && this.currentStageId) {
                    const accuracyPct = summary.percentage || 0;
                    let stars = 1;
                    if (accuracyPct >= 90) stars = 3;
                    else if (accuracyPct >= 75) stars = 2;

                    const stageReward = 25;
                    if (!this.profile.campaign.claimed_stage_rewards[this.currentStageId]) {
                        this.profile.campaign.claimed_stage_rewards[this.currentStageId] = true;
                        this.addDiamonds(stageReward, `Stage Cleared: ${this.currentStageId}`, `stage_${this.currentStageId}`);
                    }

                    const prev = this.profile.campaign.completed_stages[this.currentStageId] || {};
                    this.profile.campaign.completed_stages[this.currentStageId] = {
                        stars: Math.max(stars, prev.stars || 0),
                        score: Math.max(data.score, prev.score || 0),
                        completed_at: new Date().toISOString(),
                    };
                    this.saveProfile();
                    this.sound.play("stage_complete");
                    this.showToast("Stage Complete!", `Awarded ${stars} ⭐ and 💎 ${stageReward}`, "🗺️");
                } else {
                    this.sound.play("round_complete");
                }

                // Haunted Duel Submission Handling
                if (this.gameMode === "duel" && this.activeDuelCode) {
                    try {
                        const duelPayload = {
                            player_id: this.profile.player_id,
                            player_name: this.profile.nickname,
                            avatar_id: this.profile.avatar_id,
                            score: data.score,
                            accuracy: summary.percentage || 0,
                            streak: summary.max_streak || 0,
                            time_taken_seconds: 25.0,
                            is_creator: this.isDuelCreator,
                        };
                        const duelRes = await fetch(`/api/duels/${this.activeDuelCode}/submit`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(duelPayload),
                        });
                        if (duelRes.ok) {
                            const duelData = await duelRes.json();
                            if (duelData.winner_id) {
                                const won = duelData.winner_id === this.profile.player_id;
                                this.showToast(won ? "⚔️ Duel Victory!" : "💀 Duel Defeat", duelData.reason, won ? "🏆" : "💀");
                            } else {
                                this.showToast("Duel Score Recorded!", "Awaiting rival hunter's round.", "⏳");
                            }
                        }
                    } catch (e) {
                        console.warn("Duel score submit error:", e);
                    }
                }

                this.fetchCommunityStats();
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
            const score = this.dom.statFinalScore?.textContent || "0";
            const accuracy = this.dom.statAccuracy?.textContent || "0%";
            const correct = this.dom.statCorrect?.textContent || "0";
            const maxStreak = this.dom.statMaxStreak?.textContent || "0";
            const mode = this.gameMode.toUpperCase();
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
        // LEADERBOARD MODAL
        // ==========================================
        async openLeaderboard() {
            this.closeAllModals();
            this.dom.modalLeaderboard.classList.remove("hidden");
            this.fetchLeaderboard(this.currentLbDiff, this.currentLbMode);
        }

        closeLeaderboard() {
            this.dom.modalLeaderboard.classList.add("hidden");
        }

        async fetchLeaderboard(difficulty = null, mode = null) {
            // Handle Personal Best View
            if (this.currentLbView === "pb") {
                if (this.dom.leaderboardPbContainer) {
                    this.dom.leaderboardPbContainer.classList.remove("hidden");
                }
                this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">Gathering personal haunt history...</td></tr>`;

                try {
                    const playerName = this.profile?.nickname || "Ghost Hunter";
                    const playerId = this.profile?.player_id || "player_default";
                    const res = await fetch(`/api/leaderboard/personal-best?player_name=${encodeURIComponent(playerName)}&player_id=${encodeURIComponent(playerId)}`);
                    if (!res.ok) throw new Error("Personal best fetch failed");
                    const data = await res.json();

                    if (this.dom.pbHighScore) this.dom.pbHighScore.textContent = Number(data.high_score || 0).toLocaleString();
                    if (this.dom.pbBestStreak) this.dom.pbBestStreak.textContent = `${data.best_streak || 0} 🔥`;
                    if (this.dom.pbTotalGames) this.dom.pbTotalGames.textContent = data.total_games || 0;
                    if (this.dom.pbBestAcc) this.dom.pbBestAcc.textContent = `${data.best_percentage || 0}%`;

                    if (!data.recent_records || data.recent_records.length === 0) {
                        this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">No personal runs recorded under "${this.escapeHtml(playerName)}" yet.</td></tr>`;
                        return;
                    }

                    this.dom.leaderboardTbody.innerHTML = "";
                    data.recent_records.forEach((entry, idx) => {
                        const tr = document.createElement("tr");
                        const dateStr = entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "-";
                        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`;
                        const entryMode = entry.mode ? entry.mode.toUpperCase() : "CLASSIC";
                        const av = this.getAvatarById(entry.avatar_id);
                        const avIcon = av ? av.icon : "🎃";

                        tr.innerHTML = `
                            <td class="rank-col">${medal}</td>
                            <td class="name-col"><span class="table-avatar-icon">${avIcon}</span> <strong>${this.escapeHtml(entry.player_name)}</strong></td>
                            <td><span class="badge badge-${entry.difficulty}">${entry.difficulty.toUpperCase()}</span></td>
                            <td><span class="badge badge-mode">${entryMode}</span></td>
                            <td class="score-col">${entry.score.toLocaleString()}</td>
                            <td>${entry.percentage}%</td>
                            <td class="date-col">${dateStr}</td>
                        `;
                        this.dom.leaderboardTbody.appendChild(tr);
                    });
                } catch (err) {
                    console.error("Personal best error:", err);
                    this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="7" style="color:#ff5a5a;text-align:center;padding:24px;">Failed to load personal records.</td></tr>`;
                }
                return;
            }

            // Normal / Daily Leaderboard View
            if (this.dom.leaderboardPbContainer) {
                this.dom.leaderboardPbContainer.classList.add("hidden");
            }
            this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">Summoning records from the crypt...</td></tr>`;

            try {
                let url = "/api/leaderboard?limit=25";
                if (this.currentLbView === "daily") {
                    url += "&timeframe=daily";
                }
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
                    const av = this.getAvatarById(entry.avatar_id);
                    const avIcon = av ? av.icon : "🎃";

                    tr.innerHTML = `
                        <td class="rank-col">${medal}</td>
                        <td class="name-col"><span class="table-avatar-icon">${avIcon}</span> <strong>${this.escapeHtml(entry.player_name)}</strong></td>
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
        // SETTINGS MODAL
        // ==========================================
        openSettings() {
            this.closeAllModals();
            this.syncSettingsUi();
            this.dom.modalSettings?.classList.remove("hidden");
            if (this.dom.settingsPlayerName) {
                this.dom.settingsPlayerName.value = this.profile.nickname;
            }
        }

        closeSettings() {
            this.dom.modalSettings?.classList.add("hidden");
        }

        resetProgressData() {
            const confirmed = confirm("Are you sure you want to reset your local stats, badges, and category mastery? Your chosen avatar and name will be kept.");
            if (!confirmed) return;

            localStorage.removeItem("halloween_progress_v2");
            localStorage.removeItem("halloween_progress_v1");

            this.profile.stats = {
                games_played: 0,
                total_answered: 0,
                total_correct: 0,
                best_score: 0,
                best_streak: 0,
                preferred_mode: "classic",
            };
            this.saveProfile();
            this.loadCategories();
            this.applyProfileToUi();
            this.showToast("Progress Reset", "All local statistics and badges have been cleared.", "🧹");
        }

        // ==========================================
        // PLAYER PROFILE & MASTERY DASHBOARD
        // ==========================================
        openMastery() {
            this.closeAllModals();
            this.renderMasteryModal();
            this.dom.modalMastery?.classList.remove("hidden");
        }

        closeMastery() {
            this.dom.modalMastery?.classList.add("hidden");
        }

        renderMasteryModal() {
            const progress = this.getProgress() || { mastery: {}, achievements: {} };
            const achievements = progress.achievements || {};
            const stats = (this.profile && this.profile.stats) || {};

            // Profile Hero Stats
            if (this.dom.dashStatGames) this.dom.dashStatGames.textContent = stats.games_played || 0;
            if (this.dom.dashStatBestScore) this.dom.dashStatBestScore.textContent = (stats.best_score || 0).toLocaleString();
            if (this.dom.dashStatBestStreak) this.dom.dashStatBestStreak.textContent = stats.best_streak || 0;

            // Compute overall mastery tier
            const totalAnswered = stats.total_answered || 0;
            const totalCorrect = stats.total_correct || 0;
            const overallPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
            const currentTier = getMasteryTier(overallPct);

            if (this.dom.dashboardTierBadge) {
                this.dom.dashboardTierBadge.textContent = `${currentTier.title} ${currentTier.icon}`;
            }

            // Render Badges
            let unlockedCount = 0;
            if (this.dom.badgesGrid) {
                this.dom.badgesGrid.innerHTML = "";
                ALL_BADGES.forEach((badge) => {
                    const unlocked = Boolean(achievements[badge.id]);
                    if (unlocked) unlockedCount += 1;

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

            if (this.dom.dashStatBadges) this.dom.dashStatBadges.textContent = `${unlockedCount}/8`;
            if (this.dom.badgesUnlockedCount) this.dom.badgesUnlockedCount.textContent = unlockedCount;

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
                            <span class="mastery-tier">${tier.icon} ${tier.title} (${pct}%)</span>
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

            // Load and render AI Learning Dashboard insights
            this.loadAiDashboardInsights();
        }

        async loadAiDashboardInsights() {
            const playerId = this.profile?.player_id;
            if (!playerId) {
                this.renderLocalAiInsights();
                return;
            }

            try {
                const res = await fetch(`/api/player/${encodeURIComponent(playerId)}/insights`, {
                    headers: {
                        "X-Player-ID": playerId,
                    },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (this.dom.aiDashChallengeLevel) {
                        const diff = (data.challenge_level || data.target_difficulty || "medium").toUpperCase();
                        this.dom.aiDashChallengeLevel.textContent = `Challenge: ${diff}`;
                    }
                    if (this.dom.aiStrongestVal) {
                        const s = data.strongest_category;
                        const sName = typeof s === "object" && s
                            ? `${s.icon || "🎃"} ${s.name || s.category}`
                            : this.formatCategoryName(s);
                        const sRating = typeof s === "object" && s?.rating !== undefined
                            ? Math.round(s.rating)
                            : Math.round((data.recent_accuracy_pct || data.rolling_accuracy || 0.5) * 100);
                        this.dom.aiStrongestVal.textContent = `${sName} (${sRating}%)`;
                    }
                    if (this.dom.aiWeakestVal) {
                        const w = data.needs_practice_category || data.weakest_category;
                        const wName = typeof w === "object" && w
                            ? `${w.icon || "🎯"} ${w.name || w.category}`
                            : this.formatCategoryName(w);
                        const wRating = typeof w === "object" && w?.rating !== undefined
                            ? ` (${Math.round(w.rating)}%)`
                            : "";
                        this.dom.aiWeakestVal.textContent = `${wName}${wRating}`;
                    }
                    if (this.dom.aiGuidanceText && data.pedagogical_guidance) {
                        this.dom.aiGuidanceText.innerHTML = `👻 <em>Spooky Guide: ${this.escapeHtml(data.pedagogical_guidance)}</em>`;
                    }
                    return;
                }
            } catch (_) {
                // Fallback to local computation
            }

            this.renderLocalAiInsights();
        }

        renderLocalAiInsights() {
            const progress = this.getProgress();
            const categories = [
                { id: "spooky", name: "Spooky Stories" },
                { id: "costumes", name: "Costumes & Legends" },
                { id: "movies", name: "Horror Movies" },
                { id: "history", name: "Halloween History" },
                { id: "candy", name: "Candy & Treats" },
                { id: "paranormal", name: "Paranormal & Lore" },
            ];

            let highestPct = -1;
            let lowestPct = 999;
            let strongest = "Costumes & Legends";
            let weakest = "Paranormal & Lore";
            let totalAnswered = 0;
            let totalCorrect = 0;

            categories.forEach((cat) => {
                const m = progress.mastery[cat.id] || { answered: 0, correct: 0 };
                totalAnswered += m.answered;
                totalCorrect += m.correct;
                if (m.answered > 0) {
                    const pct = Math.round((m.correct / m.answered) * 100);
                    if (pct > highestPct) {
                        highestPct = pct;
                        strongest = `${cat.name} (${pct}%)`;
                    }
                    if (pct < lowestPct) {
                        lowestPct = pct;
                        weakest = `${cat.name} (${pct}%)`;
                    }
                }
            });

            if (highestPct === -1) strongest = "Awaiting first séance";
            if (lowestPct === 999) weakest = "Uncharted realm";

            const overallAcc = totalAnswered > 0 ? totalCorrect / totalAnswered : 0.5;
            const diff = overallAcc >= 0.75 ? "HARD" : overallAcc <= 0.4 ? "EASY" : "MEDIUM";

            if (this.dom.aiDashChallengeLevel) {
                this.dom.aiDashChallengeLevel.textContent = `Challenge: ${diff}`;
            }
            if (this.dom.aiStrongestVal) {
                this.dom.aiStrongestVal.textContent = strongest;
            }
            if (this.dom.aiWeakestVal) {
                this.dom.aiWeakestVal.textContent = weakest;
            }
            if (this.dom.aiGuidanceText) {
                const guidance = totalAnswered < 5
                    ? "Answer questions across categories to calibrate your supernatural lore profile."
                    : overallAcc >= 0.75
                    ? "Your spectral mastery is formidable! Keep pushing your boundaries across Hard and Panic modes."
                    : "Review missed questions in your weakest categories to strengthen your spirit ward.";
                this.dom.aiGuidanceText.innerHTML = `👻 <em>Spooky Guide: ${guidance}</em>`;
            }
        }

        formatCategoryName(catKey) {
            const map = {
                spooky: "Spooky Stories",
                costumes: "Costumes & Legends",
                movies: "Horror Movies",
                history: "Halloween History",
                candy: "Candy & Treats",
                paranormal: "Paranormal & Lore",
            };
            return map[catKey] || catKey || "General Lore";
        }

        // ==========================================
        // DIAMOND ECONOMY & THE WITCH'S MARKET
        // ==========================================
        getDiamonds() {
            return this.profile?.diamonds || 0;
        }

        addDiamonds(amount, reason, refId = null, soundKey = null) {
            if (!this.profile) return false;
            if (refId) {
                const alreadyRecorded = (this.profile.diamond_ledger || []).some((item) => item.refId === refId);
                if (alreadyRecorded) return false;
            }
            this.profile.diamonds = (this.profile.diamonds || 0) + amount;
            if (!this.profile.diamond_ledger) this.profile.diamond_ledger = [];
            this.profile.diamond_ledger.push({
                timestamp: new Date().toISOString(),
                amount,
                reason,
                refId,
            });
            this.saveProfile();
            this.updateDiamondDisplays();
            if (soundKey) this.sound.play(soundKey);
            this.showToast(`+${amount} 💎`, reason, "💎");
            return true;
        }

        spendDiamonds(amount, reason) {
            if (!this.profile) return false;
            if (this.getDiamonds() < amount) {
                this.showToast("Not Enough Diamonds!", "Earn more in the Haunted Journey and Community Haunt.", "💎");
                return false;
            }
            this.profile.diamonds -= amount;
            if (!this.profile.diamond_ledger) this.profile.diamond_ledger = [];
            this.profile.diamond_ledger.push({
                timestamp: new Date().toISOString(),
                amount: -amount,
                reason,
                refId: null,
            });
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

        openShop() {
            this.closeAllModals();
            this.updateDiamondDisplays();
            this.updateBoosterHud();
            this.dom.modalShop?.classList.remove("hidden");
        }

        closeShop() {
            this.dom.modalShop?.classList.add("hidden");
        }

        buyBooster(type, price) {
            if (this.spendDiamonds(price, `Purchased ${type} booster`)) {
                if (!this.profile.boosters) this.profile.boosters = {};
                this.profile.boosters[type] = (this.profile.boosters[type] || 0) + 1;
                this.saveProfile();
                this.updateBoosterHud();
                this.sound.playUiSound();
                this.showToast("Power-Up Acquired!", `+1 ${type}`, "⚡");
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
        // THE HAUNTED JOURNEY (CAMPAIGN MODE)
        // ==========================================
        async loadCampaignData() {
            try {
                const res = await fetch("/api/campaign/chapters");
                if (!res.ok) return;
                const data = await res.json();
                this.campaignChapters = data.chapters || [];
                this.renderChapterTabs();
                this.renderChapterStages(this.activeChapterId);
                this.renderLobbyExperience();
            } catch (err) {
                console.warn("Campaign load warning:", err);
            }
        }

        openCampaign() {
            this.closeAllModals();
            this.dom.modalCampaign?.classList.remove("hidden");
            if (!this.campaignChapters || this.campaignChapters.length === 0) {
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

            this.campaignChapters.forEach((ch, idx) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = `tab-btn ${ch.id === this.activeChapterId ? "active" : ""}`;

                // Progression unlock check: Ch 1 unlocked. Ch N requires Ch N-1 boss completed
                let isProgressionUnlocked = idx === 0;
                if (idx > 0 && this.campaignChapters[idx - 1]) {
                    const prevBossId = this.campaignChapters[idx - 1].stages.find((s) => s.stage_type === "boss")?.id;
                    if (prevBossId && completedStages[prevBossId]) {
                        isProgressionUnlocked = true;
                    }
                }

                const isPremiumLocked = (ch.chapter_number > 3 || idx >= 3) && !this.isPremium();
                const lockText = isPremiumLocked ? " 🔒 PASS" : !isProgressionUnlocked ? " 🔒" : "";

                btn.innerHTML = `${ch.icon} Ch ${ch.chapter_number}${lockText}`;
                btn.addEventListener("click", () => {
                    if (isPremiumLocked) {
                        this.openPremiumModal();
                        return;
                    }
                    if (!isProgressionUnlocked) {
                        this.showToast("Chapter Locked", "Conquer the previous chapter's Boss Trial first!", "🔒");
                        return;
                    }
                    this.activeChapterId = ch.id;
                    this.renderChapterTabs();
                    this.renderChapterStages(ch.id);
                });
                this.dom.campaignChapterTabs.appendChild(btn);
            });
        }

        renderChapterStages(chapterId) {
            const ch = this.campaignChapters.find((c) => c.id === chapterId) || this.campaignChapters[0];
            if (!ch) return;

            if (this.dom.chapterIcon) this.dom.chapterIcon.textContent = ch.icon;
            if (this.dom.chapterTitle) this.dom.chapterTitle.textContent = ch.title;
            if (this.dom.chapterSubtitle) this.dom.chapterSubtitle.textContent = ch.subtitle;
            if (this.dom.chapterDesc) this.dom.chapterDesc.textContent = ch.description;

            if (!this.dom.stagesTrailList) return;
            this.dom.stagesTrailList.innerHTML = "";

            const isPremiumLocked = (ch.chapter_number > 3 || this.campaignChapters.indexOf(ch) >= 3) && !this.isPremium();
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
                    this.openPremiumModal();
                });
                this.dom.stagesTrailList.appendChild(banner);
                if (this.dom.stageDetailPanel) this.dom.stageDetailPanel.classList.add("hidden");
                return;
            }

            const completedStages = (this.profile && this.profile.campaign && this.profile.campaign.completed_stages) || {};

            ch.stages.forEach((st, idx) => {
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
                        <strong>${this.escapeHtml(st.title)}</strong>
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
            const ch = this.campaignChapters.find((c) => c.stages.some((s) => s.id === stageId));
            if (ch && (ch.chapter_number > 3 || this.campaignChapters.indexOf(ch) >= 3) && !this.isPremium()) {
                this.openPremiumModal();
                return;
            }
            this.closeCampaign();
            this.currentStageId = stageId;
            this.gameMode = "campaign";
            this.startGameWithParams({ stage_id: stageId, mode: "campaign" });
        }

        openChapterStory() {
            this.openStory(this.activeChapterId);
        }

        openStory(chapterId) {
            const targetId = chapterId || this.activeChapterId;
            const ch = this.campaignChapters.find((c) => c.id === targetId) || this.campaignChapters[0];
            if (!ch) return;
            if (this.dom.storyEmblem) this.dom.storyEmblem.textContent = ch.icon;
            if (this.dom.storyChapterTitle) this.dom.storyChapterTitle.textContent = `${ch.title} — Lore`;
            if (this.dom.storyText) this.dom.storyText.textContent = ch.story_intro;
            this.dom.modalChapterStory?.classList.remove("hidden");
        }

        closeStory() {
            this.dom.modalChapterStory?.classList.add("hidden");
        }

        // ==========================================
        // DAILY COMMUNITY HAUNT
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
                this.dom.btnClaimCommunity?.classList.add("hidden");
                this.showToast("Bounty Claimed!", `+${reward} 💎 Community Goal Reward`, "🌐");
            } catch (err) {
                console.warn("Claim community reward error:", err);
            }
        }

        // ==========================================
        // HAUNTED DUELS (ASYNCHRONOUS PVP)
        // ==========================================
        openDuels() {
            this.closeAllModals();
            this.dom.modalDuels?.classList.remove("hidden");
        }

        closeDuels() {
            this.dom.modalDuels?.classList.add("hidden");
        }

        async handleCreateDuel() {
            const diff = document.getElementById("duel-diff")?.value || "medium";
            const trapInputs = document.querySelectorAll("input[name='duel_trap']:checked");
            const traps = Array.from(trapInputs).map((i) => i.value);

            try {
                const res = await fetch("/api/duels", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        creator_id: this.profile.player_id,
                        creator_name: this.profile.nickname,
                        creator_avatar: this.profile.avatar_id,
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
                this.showToast("Challenge Forged!", `Duel Code: ${duel.duel_code}`, "⚔️");
            } catch (err) {
                console.warn("Create duel error:", err);
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
                if (creatorEl) creatorEl.innerHTML = `Challenger: <strong>${this.escapeHtml(duel.creator_name)}</strong>`;
                if (diffEl) diffEl.innerHTML = `Difficulty: <strong>${duel.difficulty.toUpperCase()}</strong>`;
                if (trapsEl) trapsEl.textContent = (duel.traps && duel.traps.length > 0) ? duel.traps.join(", ") : "None";

                this.dom.duelInspectCard?.classList.remove("hidden");
            } catch (err) {
                console.warn("Inspect duel error:", err);
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
        // AUDIO RIDDLES PLAYER
        // ==========================================
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

        // ==========================================
        // UNIVERSAL GAME LAUNCHER WITH PARAMS
        // ==========================================
        async startGameWithParams(extraParams = {}) {
            this.sound.unlock();
            this.sound.startBackgroundAmbience();

            const playerName = this.profile?.nickname || "Ghost Hunter";
            const payload = {
                player_name: playerName,
                avatar_id: this.profile?.avatar_id || "pumpkin_hunter",
                mode: extraParams.mode || this.gameMode,
                difficulty: extraParams.difficulty || "medium",
                ...extraParams,
            };

            try {
                const res = await fetch("/api/quiz/start", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Player-ID": this.profile?.player_id || "player_default",
                    },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.detail || "Failed to start quiz session");
                }

                const data = await res.json();
                this.sessionId = data.session_id;
                this.currentScore = 0;
                this.currentStreak = 0;
                this.roundCorrect = 0;
                this.roundAnswered = 0;
                this.gameMode = data.mode;
                this.strikesRemaining = 3;

                this.dom.qModeBadge.textContent = data.mode.toUpperCase();
                if (this.gameMode === "endless") {
                    this.dom.hudStrikes.classList.remove("hidden");
                    this.updateStrikesUi();
                } else {
                    this.dom.hudStrikes.classList.add("hidden");
                }

                this.sound.play("quiz_start");
                this.showScreen("quiz");
                this.renderQuestion(data.first_question);
            } catch (err) {
                console.error("Start game with params error:", err);
                this.showNotice(err.message || "Failed to start round. Please try again.");
            }
        }

    }

    // Initialize application when DOM is ready
    document.addEventListener("DOMContentLoaded", () => {
        window.halloweenApp = new HalloweenQuizApp();
    });
})();
