/**
 * 🎃 Spooky Master (Halloween Quiz) - Entitlements & Pass Module
 * Manages Spooky Master Pass tiers, developer test overrides,
 * modal dialogs, and Policy A entitlement verification.
 */

export class EntitlementsManager {
    constructor(app) {
        this.app = app;
    }

    get dom() {
        return this.app.dom;
    }

    get profile() {
        return this.app.profile;
    }

    get router() {
        return this.app.router;
    }

    isPremium() {
        return Boolean(this.app.entitlements && this.app.entitlements.is_premium);
    }

    syncEntitlementsUi() {
        if (!this.app.entitlements) return;

        // Dev mode button in premium modal
        if (this.dom.btnDevTogglePass) {
            if (this.app.entitlements.dev_mode_active) {
                this.dom.btnDevTogglePass.classList.remove("hidden");
                const isVip = this.app.entitlements.tier === "haunted_vip";
                const isPass = this.app.entitlements.tier === "spooky_pass";
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
            if (this.app.entitlements.tier === "haunted_vip") {
                this.dom.btnPassNav.textContent = "👑 VIP";
                this.dom.btnPassNav.classList.add("nav-pass-active");
            } else if (this.app.entitlements.is_premium) {
                this.dom.btnPassNav.textContent = "🎃 Pass Active";
                this.dom.btnPassNav.classList.add("nav-pass-active");
            } else {
                this.dom.btnPassNav.textContent = "🎃 Pass";
                this.dom.btnPassNav.classList.remove("nav-pass-active");
            }
        }

        // Status indicator in modal footer
        if (this.dom.premiumCurrentTierText) {
            if (this.app.entitlements.tier === "haunted_vip") {
                this.dom.premiumCurrentTierText.textContent = "Haunted VIP Pass 👑";
            } else if (this.app.entitlements.is_premium) {
                this.dom.premiumCurrentTierText.textContent = "Spooky Master Pass 🎃";
            } else {
                this.dom.premiumCurrentTierText.textContent = "Free Adventurer";
            }
        }

        if (this.app.themesMgr) {
            this.app.themesMgr.renderThemesGrid();
        } else if (this.app.renderThemesGrid) {
            this.app.renderThemesGrid();
        }

        if (this.app.campaignChapters && this.app.campaignChapters.length > 0) {
            this.app.renderChapterTabs();
        }
    }

    async fetchEntitlements(devTier = null) {
        try {
            const playerId = this.profile?.player_id || "player_default";
            let url = `/api/entitlements?player_id=${encodeURIComponent(playerId)}`;
            if (devTier) {
                url += `&tier=${encodeURIComponent(devTier)}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                this.app.entitlements = await res.json();
                this.syncEntitlementsUi();
            }
        } catch (err) {
            console.warn("Failed to fetch entitlements:", err);
        }
    }

    openPremiumModal() {
        if (this.router && window.location.pathname !== "/pass") {
            this.router.navigate("/pass");
            return;
        }
        this.app.closeAllModals();
        if (this.dom.modalPremium) {
            this.dom.modalPremium.classList.remove("hidden");
            this.dom.modalPremium.classList.add("active");
        }
        this.syncEntitlementsUi();
    }

    closePremiumModal() {
        if (this.dom.modalPremium) {
            this.dom.modalPremium.classList.add("hidden");
            this.dom.modalPremium.classList.remove("active");
        }
        if (this.router && window.location.pathname === "/pass") {
            this.router.navigate("/");
        }
    }

    async handlePurchasePass() {
        if (this.app.entitlements?.dev_override_active) {
            await this.fetchEntitlements("spooky_pass");
            this.app.showToast("Spooky Pass Activated!", "Test purchase completed in local dev mode.", "🎃");
        } else {
            this.app.showNotice("Payment Gateway Status: Live billing provider is not configured. The $4.99 price is a proposed configuration SKU. In local development, enable DEV_PREMIUM_MODE in .env for instant testing.");
            this.app.showToast("Proposed Pricing", "Live checkout is not enabled in this environment.", "💳");
        }
    }

    async handleSubscribeVip() {
        if (this.app.entitlements?.dev_override_active) {
            await this.fetchEntitlements("haunted_vip");
            this.app.showToast("Haunted VIP Active!", "Test VIP subscription enabled in local dev mode.", "👑");
        } else {
            this.app.showNotice("Subscription Gateway Status: Recurring billing provider is not configured. The $2.99/mo rate is a proposed configuration SKU. In local development, enable DEV_PREMIUM_MODE in .env for instant testing.");
            this.app.showToast("Proposed Pricing", "Live recurring billing is not enabled in this environment.", "👑");
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
                this.app.showToast("Restore Purchases", data.message, data.restored ? "✨" : "ℹ️");
            }
        } catch (e) {
            this.app.showToast("Restore Failed", "Could not verify purchase status with the server.", "⚠️");
        }
    }

    async handleDevTogglePass() {
        if (!this.app.entitlements?.dev_mode_active) return;
        const currentTier = this.app.entitlements.tier;
        let nextTier = "spooky_pass";
        if (currentTier === "spooky_pass") nextTier = "haunted_vip";
        else if (currentTier === "haunted_vip") nextTier = "free";
        await this.fetchEntitlements(nextTier);
        this.app.showToast("Dev Mode Changed", `Entitlement set to: ${nextTier}`, "⚡");
    }
}
