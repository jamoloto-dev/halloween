/**
 * 🎃 Spooky Master (Halloween Quiz) - Canonical Audio Engine Module
 * Manages background music, sampled SFX, procedural Web Audio synthesis, ducking,
 * volume preferences, autoplay unlocking, and procedural riddle audio cues.
 */

import { AUDIO_EVENTS, AVAILABLE_TRACKS } from "./utils.js";

export class SoundEngine {
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
        return this.playProceduralRiddleSound(clipId, onDone);
    }

    startBackgroundAmbience() {
        if (!this.bgmAudio || !this.backgroundAvailable || !this.musicEnabled || this.selectedTrack === "silent") {
            return;
        }

        this.ambienceRequested = true;
        this.unlock();

        if (this.bgmAudio.paused || this.bgmAudio.ended) {
            this.bgmAudio.loop = true;
            this.bgmAudio.volume = 0;
            this.bgmAudio.muted = false;

            const playPromise = this.bgmAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.bgmPlaying = true;
                    this.notifyBgmStateChange();
                    this.fadeBackgroundTo(this.musicVolume, 1500);
                }).catch((err) => {
                    console.warn("Autoplay blocked; waiting for user gesture.", err);
                    this.bgmPlaying = false;
                    this.notifyBgmStateChange();
                });
            }
        } else {
            this.bgmPlaying = true;
            this.notifyBgmStateChange();
            this.fadeBackgroundTo(this.musicVolume, 500);
        }
    }

    fadeBackgroundTo(targetVolume, durationMs = 1000, onDone = null) {
        if (!this.bgmAudio) return;
        if (this.fadeFrame) cancelAnimationFrame(this.fadeFrame);

        const startVolume = this.bgmAudio.volume;
        const boundedTarget = Math.max(0, Math.min(1, targetVolume));
        const startTime = performance.now();

        const step = (now) => {
            const progress = Math.min(1, (now - startTime) / durationMs);
            const current = startVolume + (boundedTarget - startVolume) * progress;
            this.bgmAudio.volume = Math.max(0, Math.min(1, current));

            if (progress < 1) {
                this.fadeFrame = requestAnimationFrame(step);
            } else {
                this.fadeFrame = null;
                if (onDone) onDone();
            }
        };

        this.fadeFrame = requestAnimationFrame(step);
    }

    duckBackground(durationMs = 900) {
        if (!this.bgmAudio || !this.bgmPlaying || !this.musicEnabled) return;

        const duckVolume = Math.max(0.04, this.musicVolume * 0.25);
        this.fadeBackgroundTo(duckVolume, 100);

        if (this.duckRestoreTimer) clearTimeout(this.duckRestoreTimer);
        this.duckRestoreTimer = setTimeout(() => {
            if (this.bgmPlaying && this.musicEnabled) {
                this.fadeBackgroundTo(this.musicVolume, 400);
            }
        }, durationMs);
    }

    playProceduralRiddleSound(clipId, onDone = null) {
        if (!this.sfxEnabled) {
            if (onDone) onDone();
            return;
        }
        this.unlock();
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

            } else if (clipId === "ghost_wail" || clipId === "ghost_whisper") {
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

            } else if (clipId === "crypt_door" || clipId === "creaking_door") {
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

            } else if (clipId === "church_bell") {
                // Procedural bronze church bell: fundamental + minor third + octave harmonics with long sustain
                const partials = [
                    { f: 220, g: 0.5 },
                    { f: 440, g: 0.4 },
                    { f: 523.25, g: 0.25 },
                    { f: 659.25, g: 0.2 },
                    { f: 880, g: 0.15 }
                ];
                partials.forEach(p => {
                    const osc = this.audioCtx.createOscillator();
                    const pGain = this.audioCtx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(p.f, now);
                    pGain.connect(this.audioCtx.destination);
                    osc.connect(pGain);
                    pGain.gain.setValueAtTime(this.sfxVolume * p.g, now);
                    pGain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);
                    osc.start(now);
                    osc.stop(now + 3.2);
                });
                setTimeout(() => { if (onDone) onDone(); }, 3200);

            } else if (clipId === "thunder") {
                // Procedural thunder: low-frequency rumble with resonant bandpass
                const osc = this.audioCtx.createOscillator();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(55, now);
                osc.frequency.linearRampToValueAtTime(28, now + 2.8);

                const filter = this.audioCtx.createBiquadFilter();
                filter.type = "lowpass";
                filter.frequency.setValueAtTime(140, now);
                filter.frequency.linearRampToValueAtTime(80, now + 2.8);

                osc.connect(filter);
                filter.connect(gain);
                gain.gain.setValueAtTime(this.sfxVolume * 0.85, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
                osc.start(now);
                osc.stop(now + 3.0);
                setTimeout(() => { if (onDone) onDone(); }, 3000);

            } else if (clipId === "chains") {
                // Procedural rattling chains: high metallic clinks in quick succession
                const clinks = [0.0, 0.15, 0.32, 0.55, 0.72, 0.95, 1.2, 1.45];
                clinks.forEach(t => {
                    const cTime = now + t;
                    const osc = this.audioCtx.createOscillator();
                    const cGain = this.audioCtx.createGain();
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(1200 + Math.random() * 800, cTime);
                    cGain.connect(this.audioCtx.destination);
                    osc.connect(cGain);
                    cGain.gain.setValueAtTime(this.sfxVolume * 0.35, cTime);
                    cGain.gain.exponentialRampToValueAtTime(0.001, cTime + 0.14);
                    osc.start(cTime);
                    osc.stop(cTime + 0.14);
                });
                setTimeout(() => { if (onDone) onDone(); }, 2000);

            } else if (clipId === "crow") {
                // Procedural crow caw: harsh bandpassed harmonic bursts
                [0.0, 0.35].forEach(t => {
                    const cTime = now + t;
                    const osc = this.audioCtx.createOscillator();
                    const cGain = this.audioCtx.createGain();
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(680, cTime);
                    osc.frequency.linearRampToValueAtTime(520, cTime + 0.28);

                    const filter = this.audioCtx.createBiquadFilter();
                    filter.type = "bandpass";
                    filter.frequency.setValueAtTime(950, cTime);
                    filter.Q.setValueAtTime(4.0, cTime);

                    osc.connect(filter);
                    filter.connect(cGain);
                    cGain.connect(this.audioCtx.destination);
                    cGain.gain.setValueAtTime(this.sfxVolume * 0.45, cTime);
                    cGain.gain.exponentialRampToValueAtTime(0.001, cTime + 0.30);
                    osc.start(cTime);
                    osc.stop(cTime + 0.30);
                });
                setTimeout(() => { if (onDone) onDone(); }, 1200);

            } else if (clipId === "heartbeat") {
                // Procedural heartbeat: double thump (lub-dub)
                [0.0, 0.22, 0.9, 1.12].forEach((t, i) => {
                    const hTime = now + t;
                    const osc = this.audioCtx.createOscillator();
                    const hGain = this.audioCtx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(i % 2 === 0 ? 65 : 55, hTime);
                    osc.frequency.linearRampToValueAtTime(35, hTime + 0.14);
                    hGain.connect(this.audioCtx.destination);
                    osc.connect(hGain);
                    hGain.gain.setValueAtTime(this.sfxVolume * 0.70, hTime);
                    hGain.gain.exponentialRampToValueAtTime(0.001, hTime + 0.16);
                    osc.start(hTime);
                    osc.stop(hTime + 0.16);
                });
                setTimeout(() => { if (onDone) onDone(); }, 2000);

            } else if (clipId === "wind") {
                // Procedural howling wind: fluctuating sine wave through lowpass filter
                const osc = this.audioCtx.createOscillator();
                osc.type = "sine";
                osc.frequency.setValueAtTime(260, now);
                osc.frequency.linearRampToValueAtTime(390, now + 1.2);
                osc.frequency.linearRampToValueAtTime(180, now + 2.8);

                const filter = this.audioCtx.createBiquadFilter();
                filter.type = "bandpass";
                filter.frequency.setValueAtTime(320, now);
                filter.Q.setValueAtTime(3.5, now);

                osc.connect(filter);
                filter.connect(gain);
                gain.gain.setValueAtTime(this.sfxVolume * 0.50, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
                osc.start(now);
                osc.stop(now + 3.0);
                setTimeout(() => { if (onDone) onDone(); }, 3000);

            } else if (clipId === "organ_sting") {
                // Procedural gothic minor chord on pipe organ (D minor: D4, F4, A4, D5)
                const freqs = [293.66, 349.23, 440.0, 587.33];
                freqs.forEach(f => {
                    const osc = this.audioCtx.createOscillator();
                    const oGain = this.audioCtx.createGain();
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(f, now);

                    const filter = this.audioCtx.createBiquadFilter();
                    filter.type = "lowpass";
                    filter.frequency.setValueAtTime(1200, now);

                    osc.connect(filter);
                    filter.connect(oGain);
                    oGain.connect(this.audioCtx.destination);
                    oGain.gain.setValueAtTime(this.sfxVolume * 0.22, now);
                    oGain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);
                    osc.start(now);
                    osc.stop(now + 2.6);
                });
                setTimeout(() => { if (onDone) onDone(); }, 2600);

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
            } catch {
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
