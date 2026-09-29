/**
 * 🎃 Spooky Master (Halloween Quiz) - Shop & Economy Module
 * Coordinates The Witch's Market modal, booster purchases & activations,
 * cosmetic guise unlocks, and the diamond ledger economy.
 */

export class ShopManager {
    constructor(app) {
        this.app = app;
    }

    get dom() {
        return this.app.dom;
    }

    get profile() {
        return this.app.profile;
    }

    getDiamonds() {
        return this.profile?.diamonds || 0;
    }

    addDiamonds(amount, reason, refId = null, soundKey = null) {
        if (!this.profile) return false;
        const pts = Math.max(0, parseInt(amount, 10) || 0);
        if (pts <= 0) return false;
        this.profile.diamonds = (this.profile.diamonds || 0) + pts;
        if (!this.profile.diamond_ledger) this.profile.diamond_ledger = [];
        this.profile.diamond_ledger.unshift({
            timestamp: new Date().toISOString(),
            amount: pts,
            reason: reason || "Bounty Claimed",
            refId: refId || null,
        });
        if (this.profile.diamond_ledger.length > 50) {
            this.profile.diamond_ledger.pop();
        }
        this.app.saveProfile();
        this.updateDiamondDisplays();
        if (soundKey) this.app.sound?.play(soundKey);
        this.app.showToast(`+${pts} 💎`, reason, "💎");
        return true;
    }

    spendDiamonds(amount, reason) {
        if (!this.profile) return false;
        const pts = Math.max(0, parseInt(amount, 10) || 0);
        if (this.getDiamonds() < pts) {
            this.app.showToast("Not Enough Diamonds!", "Earn more in the Haunted Journey and Community Haunt.", "💎");
            return false;
        }
        this.profile.diamonds -= pts;
        if (!this.profile.diamond_ledger) this.profile.diamond_ledger = [];
        this.profile.diamond_ledger.unshift({
            timestamp: new Date().toISOString(),
            amount: -pts,
            reason: reason || "Market Purchase",
            refId: null,
        });
        if (this.profile.diamond_ledger.length > 50) {
            this.profile.diamond_ledger.pop();
        }
        this.app.saveProfile();
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
        this.app.closeAllModals();
        if (this.dom.modalShop) this.dom.modalShop.classList.remove("hidden");
        this.updateDiamondDisplays();
    }

    closeShop() {
        if (this.dom.modalShop) this.dom.modalShop.classList.add("hidden");
    }

    buyBooster(type, price) {
        if (this.spendDiamonds(price, `Purchased ${type} booster`)) {
            if (!this.profile.boosters) this.profile.boosters = {};
            this.profile.boosters[type] = (this.profile.boosters[type] || 0) + 1;
            this.app.saveProfile();
            this.updateBoosterHud();
            this.app.sound?.play("achievement");
            this.app.showToast("Booster Acquired!", `Added 1x ${type}`, "🔮");
        }
    }

    buyCosmetic(avatarId, price) {
        if (!this.profile.cosmetics_unlocked) this.profile.cosmetics_unlocked = ["pumpkin_hunter", "ghost"];
        if (this.profile.cosmetics_unlocked.includes(avatarId)) {
            this.app.updateAvatar(avatarId);
            this.updateBoosterHud();
            return;
        }
        if (this.spendDiamonds(price, `Unlocked ${avatarId} avatar`)) {
            this.profile.cosmetics_unlocked.push(avatarId);
            this.app.updateAvatar(avatarId);
            this.updateBoosterHud();
            this.app.sound?.play("achievement");
            this.app.showToast("Cosmetic Unlocked!", `Equipped ${avatarId}`, "🎭");
        }
    }

    async useBooster(type) {
        if (this.app.gameMode === "daily" || this.app.gameMode === "duel") {
            this.app.showToast("Boosters Disabled", "Power-ups cannot be used in ranked or duel modes.", "⚠️");
            return;
        }
        const count = (this.profile?.boosters && this.profile.boosters[type]) || 0;
        if (count <= 0) {
            this.app.showToast("No Boosters Left", "Visit The Witch's Market to replenish.", "🔮");
            return;
        }
        if (this.app.isAnswerPending || this.app.isFeedbackActive || !this.app.currentQuestion) return;

        try {
            const res = await fetch(`/api/quiz/${this.app.sessionId}/booster`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ booster_type: type }),
            });
            if (!res.ok) throw new Error("Booster rejected");
            const data = await res.json();

            this.profile.boosters[type] -= 1;
            this.app.saveProfile();
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
                this.app.showToast("Ghost Whisper", "Eliminated 2 incorrect options", "💡");
            } else if (type === "time_extension") {
                this.app.timeRemaining += 10;
                this.app.timeLimit += 10;
                this.app.updateTimerUi();
                this.app.showToast("Hourglass Inverted", "+10s countdown extension", "⏳");
            } else if (type === "double_points") {
                this.app.boosterDoublePointsActive = true;
                this.app.showToast("Jack-o'-Lantern Surge", "2x points active for this question", "⚡");
            } else if (type === "shield") {
                this.app.boosterShieldActive = true;
                this.app.showToast("Spectral Ward", "Streak protected against one wrong answer", "🛡️");
            }

            this.app.sound?.play("booster");
        } catch (err) {
            console.warn("Booster activation error:", err);
        }
    }
}
