/**
 * 🎃 Spooky Master (Halloween Quiz) - Client Engine v2.2.0
 * Features: Pure client-side Web Audio API, Smooth zero-reload countdown timer,
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

    const PREDEFINED_AVATARS = [
        { id: "pumpkin_hunter", name: "Pumpkin Hunter", icon: "🎃", asset: "/static/avatars/pumpkin_hunter.svg", desc: "Vigilant guardian of the pumpkin patch" },
        { id: "ghost", name: "Spectral Ghost", icon: "👻", asset: "/static/avatars/ghost.svg", desc: "Playful apparition wandering between realms" },
        { id: "vampire", name: "Crimson Vampire", icon: "🧛", asset: "/static/avatars/vampire.svg", desc: "Nocturnal aristocrat with refined tastes" },
        { id: "witch", name: "Mystic Witch", icon: "🧙", asset: "/static/avatars/witch.svg", desc: "Master of midnight brews and celestial spells" },
        { id: "skeleton", name: "Crypt Skeleton", icon: "💀", asset: "/static/avatars/skeleton.svg", desc: "Ancient resident of the bone chambers" },
        { id: "zombie", name: "Grave Walker", icon: "🧟", asset: "/static/avatars/zombie.svg", desc: "Stitched relentless crawler of the graveyard" },
        { id: "werewolf", name: "Lunar Werewolf", icon: "🐺", asset: "/static/avatars/werewolf.svg", desc: "Fierce beast awakened by the full moon" },
        { id: "night_bat", name: "Night Creature", icon: "🦇", asset: "/static/avatars/night_bat.svg", desc: "Obsidian shadow swooping through the mist" },
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
            this.selectedTrack = trackId;
            const track = AVAILABLE_TRACKS.find((t) => t.id === trackId);
            if (!track || !track.url || trackId === "silent") {
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
                audio.muted = false;
                audio.volume = targetVolume;
                audio.currentTime = 0;
                audio.play().catch(() => this.playSynthFallback(fallback));
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

                // In-App Notice & Toasts
                appNotice: document.getElementById("app-notice"),
                appNoticeText: document.getElementById("app-notice-text"),
                btnNoticeDismiss: document.getElementById("btn-notice-dismiss"),
                toastContainer: document.getElementById("toast-container"),

                // Top Navigation Bar
                btnPwaInstall: document.getElementById("btn-pwa-install"),
                btnMasteryOpen: document.getElementById("btn-mastery-open"),
                btnLeaderboard: document.getElementById("btn-leaderboard-open"),
                btnSettingsOpen: document.getElementById("btn-settings-open"),

                // Modals
                modalLeaderboard: document.getElementById("modal-leaderboard"),
                btnCloseModal: document.getElementById("btn-close-modal"),
                leaderboardTbody: document.getElementById("leaderboard-tbody"),

                modalSettings: document.getElementById("modal-settings"),
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
                onboardingAvatarGrid: document.getElementById("onboarding-avatar-grid"),
                onboardingHunterName: document.getElementById("onboarding-hunter-name"),
                btnSaveOnboarding: document.getElementById("btn-save-onboarding"),
                btnSkipOnboarding: document.getElementById("btn-skip-onboarding"),

                modalAvatarPicker: document.getElementById("modal-avatar-picker"),
                btnCloseAvatarPicker: document.getElementById("btn-close-avatar-picker"),
                sharedAvatarGrid: document.getElementById("shared-avatar-grid"),

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

            // Initialize Player Profile & Migration
            this.profile = this.initPlayerProfile();

            this.initEvents();
            this.initPwa();
            this.initDailyCountdown();
            this.sound.onBgmStateChange = () => this.syncSettingsUi();
            this.loadCategories();
            this.applyProfileToUi();
            this.updateDiamondDisplays();
            this.updateBoosterHud();
            this.fetchCommunityStats();
            this.loadCampaignData();
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
                    if (parsed && parsed.player_id) {
                        if (typeof parsed.diamonds !== "number") parsed.diamonds = 50;
                        if (!parsed.boosters) parsed.boosters = { hint: 1, time_extension: 1, double_points: 0, shield: 0 };
                        if (!parsed.cosmetics_unlocked) parsed.cosmetics_unlocked = ["pumpkin_hunter", "ghost"];
                        if (!parsed.campaign) {
                            parsed.campaign = {
                                completed_stages: {},
                                claimed_stage_rewards: {},
                                claimed_chapter_rewards: {},
                            };
                        }
                        if (!parsed.claimed_community_goals) parsed.claimed_community_goals = {};
                        if (!parsed.diamond_ledger) parsed.diamond_ledger = [];

                        this.sound.applyPreferences(parsed.preferences);
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

            const defaultMusicVol = parseFloat(localStorage.getItem("halloween_music_volume") || "0.25");
            const defaultSfxVol = parseFloat(localStorage.getItem("halloween_sfx_volume") || "0.60");
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

        applyProfileToUi() {
            if (!this.profile) return;
            const avatar = PREDEFINED_AVATARS.find((a) => a.id === this.profile.avatar_id) || PREDEFINED_AVATARS[0];

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
        }

        updateAvatar(avatarId) {
            const avatar = PREDEFINED_AVATARS.find((a) => a.id === avatarId);
            if (!avatar) return;
            this.profile.avatar_id = avatar.id;
            this.saveProfile();
            this.applyProfileToUi();
            this.showToast("Avatar Changed", `Selected ${avatar.name}`, avatar.icon);
        }

        updateNickname(name) {
            const sanitized = (name || "").trim().substring(0, 30);
            if (!sanitized) return;
            this.profile.nickname = sanitized;
            this.saveProfile();
            this.applyProfileToUi();
        }

        // ==========================================
        // EVENT INITIALIZATION
        // ==========================================
        initEvents() {
            // Unlock audio on any first user interaction
            document.addEventListener("click", () => this.sound.unlock(), { once: true });
            document.addEventListener("keydown", () => this.sound.unlock(), { once: true });
            document.addEventListener("pointerdown", () => this.sound.startBackgroundAmbience(), { once: true });

            // UI sound on interactive buttons
            document.addEventListener("click", (event) => {
                const button = event.target.closest("button");
                if (!button || button.disabled || button.id === "btn-start" || button.classList.contains("option-btn")) return;
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

            // Leaderboard Tabs
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

            // Onboarding Avatar Grid and Name Suggestions
            this.renderOnboardingAvatarGrid();
            this.dom.btnSaveOnboarding?.addEventListener("click", () => {
                this.completeOnboarding();
            });
            this.dom.btnSkipOnboarding?.addEventListener("click", () => {
                this.completeOnboarding();
            });
            document.querySelectorAll(".btn-suggestion").forEach((btn) => {
                btn.addEventListener("click", () => {
                    if (this.dom.onboardingHunterName) {
                        this.dom.onboardingHunterName.value = btn.textContent;
                        this.sound.playUiSound();
                    }
                });
            });

            // Shared Avatar Picker Modal
            this.dom.btnCloseAvatarPicker?.addEventListener("click", () => this.closeAvatarPicker());
            this.dom.modalAvatarPicker?.addEventListener("click", (e) => {
                if (e.target === this.dom.modalAvatarPicker) this.closeAvatarPicker();
            });

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
            this.dom.btnReadChapterStory?.addEventListener("click", () => this.openStory(this.activeChapterId));
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

            // In-Game Boosters HUD
            this.dom.boosterHint?.addEventListener("click", () => this.useBooster("hint"));
            this.dom.boosterTime?.addEventListener("click", () => this.useBooster("time_extension"));
            this.dom.boosterDouble?.addEventListener("click", () => this.useBooster("double_points"));
            this.dom.boosterShield?.addEventListener("click", () => this.useBooster("shield"));

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

            PREDEFINED_AVATARS.forEach((avatar, idx) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = `avatar-option-card ${avatar.id === this.selectedOnboardingAvatar ? "selected" : ""}`;
                btn.setAttribute("role", "radio");
                btn.setAttribute("aria-checked", avatar.id === this.selectedOnboardingAvatar ? "true" : "false");
                btn.setAttribute("aria-label", avatar.name);
                btn.innerHTML = `
                    <img src="${avatar.asset}" alt="${avatar.name}" class="avatar-card-img" width="56" height="56">
                    <span class="avatar-card-name">${avatar.name}</span>
                `;
                btn.addEventListener("click", () => {
                    this.selectedOnboardingAvatar = avatar.id;
                    this.dom.onboardingAvatarGrid.querySelectorAll(".avatar-option-card").forEach((c) => {
                        c.classList.remove("selected");
                        c.setAttribute("aria-checked", "false");
                    });
                    btn.classList.add("selected");
                    btn.setAttribute("aria-checked", "true");
                    this.sound.playUiSound();
                });
                this.dom.onboardingAvatarGrid.appendChild(btn);
            });
        }

        completeOnboarding() {
            const rawName = (this.dom.onboardingHunterName?.value || "").trim();
            const nickname = rawName || "GhostHunter";
            this.profile.nickname = nickname;
            this.profile.avatar_id = this.selectedOnboardingAvatar;
            this.saveProfile();
            this.applyProfileToUi();
            this.closeOnboarding();
            this.showToast("Welcome to Spooky Master!", `Identity established: ${nickname}`, "🎃");
            this.sound.play("quiz_start");
        }

        // ==========================================
        // SHARED AVATAR PICKER
        // ==========================================
        openAvatarPicker() {
            if (!this.dom.sharedAvatarGrid) return;
            this.dom.sharedAvatarGrid.innerHTML = "";

            PREDEFINED_AVATARS.forEach((avatar) => {
                const isCurrent = avatar.id === this.profile.avatar_id;
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = `avatar-option-card ${isCurrent ? "selected" : ""}`;
                btn.setAttribute("role", "radio");
                btn.setAttribute("aria-checked", isCurrent ? "true" : "false");
                btn.setAttribute("aria-label", avatar.name);
                btn.innerHTML = `
                    <img src="${avatar.asset}" alt="${avatar.name}" class="avatar-card-img" width="56" height="56">
                    <span class="avatar-card-name">${avatar.name}</span>
                    <small class="avatar-card-desc">${avatar.desc}</small>
                `;
                btn.addEventListener("click", () => {
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

        // ==========================================
        // PWA REGISTRATION
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

            // Boosters HUD
            if (this.gameMode === "daily" || this.gameMode === "duel") {
                this.dom.boosterHudBar?.classList.add("hidden");
            } else {
                this.dom.boosterHudBar?.classList.remove("hidden");
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
            const score = this.dom.statFinalScore.textContent;
            const accuracy = this.dom.statAccuracy.textContent;
            const correct = this.dom.statCorrect.textContent;
            const maxStreak = this.dom.statMaxStreak.textContent;
            const mode = this.gameMode.toUpperCase();

            const shareText = `🎃 Spooky Master Survival Card 🎃\n` +
                `Hunter: ${this.profile.nickname}\n` +
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
        // SETTINGS MODAL
        // ==========================================
        openSettings() {
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
            this.renderMasteryModal();
            this.dom.modalMastery?.classList.remove("hidden");
        }

        closeMastery() {
            this.dom.modalMastery?.classList.add("hidden");
        }

        renderMasteryModal() {
            const progress = this.getProgress();

            // Profile Hero Stats
            if (this.dom.dashStatGames) this.dom.dashStatGames.textContent = this.profile.stats.games_played || 0;
            if (this.dom.dashStatBestScore) this.dom.dashStatBestScore.textContent = (this.profile.stats.best_score || 0).toLocaleString();
            if (this.dom.dashStatBestStreak) this.dom.dashStatBestStreak.textContent = this.profile.stats.best_streak || 0;

            // Compute overall mastery tier
            const totalAnswered = this.profile.stats.total_answered || 0;
            const totalCorrect = this.profile.stats.total_correct || 0;
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
                    const unlocked = Boolean(progress.achievements[badge.id]);
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
            } catch (err) {
                console.warn("Campaign load warning:", err);
            }
        }

        openCampaign() {
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

                // Unlock check: Ch 1 unlocked. Ch N requires Ch N-1 boss completed
                let isUnlocked = idx === 0;
                if (idx > 0 && this.campaignChapters[idx - 1]) {
                    const prevBossId = this.campaignChapters[idx - 1].stages.find((s) => s.stage_type === "boss")?.id;
                    if (prevBossId && completedStages[prevBossId]) {
                        isUnlocked = true;
                    }
                }

                btn.disabled = !isUnlocked;
                btn.innerHTML = `${ch.icon} Ch ${ch.chapter_number}${!isUnlocked ? " 🔒" : ""}`;
                btn.addEventListener("click", () => {
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
            this.closeCampaign();
            this.currentStageId = stageId;
            this.gameMode = "campaign";
            this.startGameWithParams({ stage_id: stageId, mode: "campaign" });
        }

        openStory(chapterId) {
            const ch = this.campaignChapters.find((c) => c.id === chapterId) || this.campaignChapters[0];
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
                mode: extraParams.mode || this.gameMode,
                difficulty: extraParams.difficulty || "medium",
                ...extraParams,
            };

            try {
                const res = await fetch("/api/quiz/start", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
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
