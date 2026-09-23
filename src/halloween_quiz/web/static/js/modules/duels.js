/**
 * 🎃 Spooky Master (Halloween Quiz) - Haunted Duels Module (Asynchronous PvP)
 * Manages challenge creation, trap selections, invite codes, and challenge sharing.
 * Future Live WebSocket Multiplayer foundation is documented and architected here.
 */

import { generateDuelShareLink } from "./utils.js";

export class DuelsManager {
    constructor(app) {
        this.app = app;
        this.selectedTraps = [];
    }

    get dom() {
        return this.app.dom;
    }

    get profile() {
        return this.app.profile;
    }

    openDuels() {
        this.app.closeAllModals();
        this.dom.modalDuels?.classList.remove("hidden");
    }

    closeDuels() {
        this.dom.modalDuels?.classList.add("hidden");
    }

    async createHauntedDuel() {
        const playerName = this.profile?.nickname || "Ghost Hunter";
        const difficulty = this.dom.duelDiffSelect ? this.dom.duelDiffSelect.value : "medium";

        try {
            const res = await fetch("/api/duels/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Player-ID": this.profile?.player_id || "guest_default",
                },
                body: JSON.stringify({
                    creator_name: playerName,
                    creator_id: this.profile?.player_id || "guest_default",
                    difficulty: difficulty,
                    traps: this.selectedTraps,
                    num_questions: 5,
                }),
            });

            if (!res.ok) throw new Error("Failed to create duel challenge");
            const data = await res.json();
            const duelCode = data.duel_code;

            if (this.dom.duelCodeDisplay) {
                this.dom.duelCodeDisplay.textContent = duelCode;
                this.dom.duelCodeBox?.classList.remove("hidden");
            }

            this.closeDuels();
            this.app.activeDuelTraps = this.selectedTraps;
            this.app.gameMode = "duel";
            this.app.startGameWithParams({ duel_code: duelCode, mode: "duel", difficulty });
        } catch (err) {
            console.error("Create duel error:", err);
            this.app.showNotice("Failed to initiate Haunted Duel. Please try again.");
        }
    }

    async joinHauntedDuel(codeFromInput = null) {
        const duelCode = (codeFromInput || (this.dom.duelJoinInput ? this.dom.duelJoinInput.value : "")).trim().toUpperCase();
        if (!duelCode) {
            this.app.showNotice("Please enter a valid Haunted Duel code.");
            return;
        }

        try {
            const res = await fetch(`/api/duels/${encodeURIComponent(duelCode)}`);
            if (!res.ok) throw new Error("Haunted Duel not found or expired.");
            const data = await res.json();

            this.closeDuels();
            this.app.activeDuelTraps = data.traps || [];
            this.app.gameMode = "duel";
            this.app.startGameWithParams({ duel_code: duelCode, mode: "duel" });
        } catch (err) {
            console.error("Join duel error:", err);
            this.app.showNotice(err.message || "Could not find Haunted Duel.");
        }
    }

    async shareDuelChallenge(duelCode) {
        const shareUrl = generateDuelShareLink(duelCode);
        const shareData = {
            title: "⚔️ Haunted Duel Challenge — Spooky Master",
            text: `${this.profile?.nickname || "A rival hunter"} challenges you to a Haunted Trivia Duel! Code: ${duelCode}`,
            url: shareUrl,
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                return;
            } catch (_) {}
        }

        // Clipboard fallback
        try {
            await navigator.clipboard.writeText(shareUrl);
            this.app.showToast("Link Copied!", "Share link copied to clipboard. Ready to challenge rivals!", "⚔️");
        } catch {
            this.app.showNotice(`Share this challenge link with your rival: ${shareUrl}`);
        }
    }
}
