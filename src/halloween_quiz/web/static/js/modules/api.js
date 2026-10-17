/**
 * 🎃 Spooky Master (Halloween Quiz) - Centralized API Service Module
 * Handles all REST API communications with standard headers, error parsing,
 * network resilience, and authoritative player identity propagation.
 */

export class ApiError extends Error {
    constructor(message, status = 0, data = null) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}

export class ApiClient {
    constructor(getPlayerIdFn = null) {
        this.getPlayerId = getPlayerIdFn || (() => "guest_default");
    }

    getHeaders(extraHeaders = {}) {
        const playerId = this.getPlayerId();
        return {
            "Content-Type": "application/json",
            "X-Player-ID": playerId || "guest_default",
            ...extraHeaders,
        };
    }

    async request(url, options = {}) {
        const headers = this.getHeaders(options.headers);
        const config = {
            ...options,
            headers,
        };

        try {
            const res = await fetch(url, config);
            let data = null;
            const contentType = res.headers.get("content-type") || "";

            if (contentType.includes("application/json")) {
                try {
                    data = await res.json();
                } catch {
                    data = null;
                }
            } else {
                try {
                    data = await res.text();
                } catch {
                    data = null;
                }
            }

            if (!res.ok) {
                const message = (data && typeof data === "object" && (data.detail || data.error || data.message))
                    || `Server returned ${res.status}: ${res.statusText}`;
                throw new ApiError(message, res.status, data);
            }

            return data;
        } catch (err) {
            if (err instanceof ApiError) throw err;
            const offlineMsg = !navigator.onLine
                ? "You appear to be offline. Please check your internet connection."
                : `Network request failed: ${err.message}`;
            throw new ApiError(offlineMsg, 0, null);
        }
    }

    // ==========================================
    // QUIZ ENDPOINTS
    // ==========================================

    async startQuiz(params) {
        return this.request("/api/quiz/start", {
            method: "POST",
            body: JSON.stringify(params),
        });
    }

    async getQuizStatus(sessionId) {
        return this.request(`/api/quiz/${encodeURIComponent(sessionId)}`);
    }

    async submitAnswer(sessionId, submission) {
        return this.request(`/api/quiz/${encodeURIComponent(sessionId)}/answer`, {
            method: "POST",
            body: JSON.stringify(submission),
        });
    }

    async timeoutQuestion(sessionId) {
        return this.request(`/api/quiz/${encodeURIComponent(sessionId)}/timeout`, {
            method: "POST",
        });
    }

    async fetchCategories() {
        return this.request("/api/categories");
    }

    // ==========================================
    // CAMPAIGN ENDPOINTS
    // ==========================================

    async fetchCampaignChapters() {
        return this.request("/api/campaign/chapters");
    }

    // ==========================================
    // DUELS ENDPOINTS
    // ==========================================

    async createDuel(payload) {
        return this.request("/api/duels", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }

    async inspectDuel(code) {
        return this.request(`/api/duels/${encodeURIComponent(code)}`);
    }

    // ==========================================
    // LEADERBOARD ENDPOINTS
    // ==========================================

    async fetchLeaderboard(difficulty = null, mode = null) {
        const params = new URLSearchParams();
        if (difficulty && difficulty !== "all") params.append("difficulty", difficulty);
        if (mode && mode !== "all") params.append("mode", mode);
        const query = params.toString() ? `?${params.toString()}` : "";
        return this.request(`/api/leaderboard${query}`);
    }

    async fetchPersonalBest(playerId, difficulty = null, mode = null) {
        const params = new URLSearchParams({ player_id: playerId });
        if (difficulty && difficulty !== "all") params.append("difficulty", difficulty);
        if (mode && mode !== "all") params.append("mode", mode);
        return this.request(`/api/leaderboard/personal-best?${params.toString()}`);
    }

    // ==========================================
    // COMMUNITY HAUNT ENDPOINTS
    // ==========================================

    async fetchCommunityStats() {
        return this.request("/api/community");
    }

    async claimCommunityReward(playerId, goalId) {
        return this.request("/api/community/claim", {
            method: "POST",
            body: JSON.stringify({ player_id: playerId, goal_id: goalId }),
        });
    }

    // ==========================================
    // AI INTELLIGENCE & AVATARS
    // ==========================================

    async requestHint(payload) {
        return this.request("/api/ai/hint", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }

    async fetchAvatarOptions() {
        return this.request("/api/ai/avatar/options");
    }

    async generateAvatar(payload) {
        return this.request("/api/ai/avatar/generate", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }

    async fetchPlayerAvatars(playerId) {
        return this.request(`/api/ai/avatar/gallery/${encodeURIComponent(playerId)}`);
    }

    // ==========================================
    // ENTITLEMENTS & PASS
    // ==========================================

    async fetchEntitlements(playerId) {
        return this.request(`/api/entitlements?player_id=${encodeURIComponent(playerId)}`);
    }

    async verifyEntitlements(payload) {
        return this.request("/api/entitlements/verify", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }

    async simulatePurchase(payload) {
        return this.request("/api/entitlements/simulate-purchase", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }

    async activateBooster(boosterType) {
        return this.request("/api/entitlements/booster/activate", {
            method: "POST",
            body: JSON.stringify({ booster_type: boosterType }),
        });
    }
}
