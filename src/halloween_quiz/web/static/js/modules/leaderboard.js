/**
 * 🎃 Spooky Master (Halloween Quiz) - Leaderboard Module
 * Manages daily and all-time leaderboards, difficulty filters, game mode tabs,
 * guest vs personal best segregation, and rankings table rendering.
 */

import { escapeHtml } from "./utils.js";

export class LeaderboardManager {
    constructor(app) {
        this.app = app;
    }

    get dom() {
        return this.app.dom;
    }

    get profile() {
        return this.app.profile;
    }

    openLeaderboard() {
        this.app.closeAllModals();
        this.dom.modalLeaderboard?.classList.remove("hidden");
        this.fetchLeaderboard(this.app.currentLbDiff, this.app.currentLbMode);
    }

    closeLeaderboard() {
        this.dom.modalLeaderboard?.classList.add("hidden");
    }

    async fetchLeaderboard(difficulty = null, mode = null) {
        // Handle Personal Best View
        if (this.app.currentLbView === "pb") {
            if (this.dom.leaderboardPbContainer) {
                this.dom.leaderboardPbContainer.classList.remove("hidden");
            }
            if (this.dom.leaderboardTbody) {
                this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">Gathering personal haunt history...</td></tr>`;
            }

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
                    if (this.dom.leaderboardTbody) {
                        this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">No personal runs recorded under "${escapeHtml(playerName)}" yet.</td></tr>`;
                    }
                    return;
                }

                if (this.dom.leaderboardTbody) {
                    this.dom.leaderboardTbody.innerHTML = "";
                    data.recent_records.forEach((entry, idx) => {
                        const tr = document.createElement("tr");
                        const dateStr = entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "-";
                        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`;
                        const entryMode = entry.mode ? entry.mode.toUpperCase() : "CLASSIC";
                        const av = this.app.getAvatarById(entry.avatar_id);
                        const avIcon = av ? av.icon : "🎃";

                        tr.innerHTML = `
                            <td class="rank-col">${medal}</td>
                            <td class="name-col"><span class="table-avatar-icon">${avIcon}</span> <strong>${escapeHtml(entry.player_name)}</strong></td>
                            <td><span class="badge badge-${entry.difficulty}">${entry.difficulty.toUpperCase()}</span></td>
                            <td><span class="badge badge-mode">${entryMode}</span></td>
                            <td class="score-col">${Number(entry.score || 0).toLocaleString()}</td>
                            <td>${entry.percentage}%</td>
                            <td class="date-col">${dateStr}</td>
                        `;
                        this.dom.leaderboardTbody.appendChild(tr);
                    });
                }
            } catch (err) {
                console.error("Personal best error:", err);
                if (this.dom.leaderboardTbody) {
                    this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="7" style="color:#ff5a5a;text-align:center;padding:24px;">Failed to load personal records.</td></tr>`;
                }
            }
            return;
        }

        // Normal / Daily Leaderboard View
        if (this.dom.leaderboardPbContainer) {
            this.dom.leaderboardPbContainer.classList.add("hidden");
        }
        if (this.dom.leaderboardTbody) {
            this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">Summoning records from the crypt...</td></tr>`;
        }

        try {
            let url = "/api/leaderboard?limit=25";
            if (this.app.currentLbView === "daily") {
                url += "&timeframe=daily";
            }
            if (difficulty) url += `&difficulty=${encodeURIComponent(difficulty)}`;
            if (mode) url += `&mode=${encodeURIComponent(mode)}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("Leaderboard fetch failed");
            const data = await res.json();
            const entries = data.entries || (Array.isArray(data) ? data : []);

            if (entries.length === 0) {
                if (this.dom.leaderboardTbody) {
                    this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">No ghost hunter records recorded yet!</td></tr>`;
                }
                return;
            }

            if (this.dom.leaderboardTbody) {
                this.dom.leaderboardTbody.innerHTML = "";
                entries.forEach((entry, idx) => {
                    const tr = document.createElement("tr");
                    const dateStr = entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "-";
                    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`;
                    const entryMode = entry.mode ? entry.mode.toUpperCase() : "CLASSIC";
                    const av = this.app.getAvatarById(entry.avatar_id);
                    const avIcon = av ? av.icon : "🎃";

                    tr.innerHTML = `
                        <td class="rank-col">${medal}</td>
                        <td class="name-col"><span class="table-avatar-icon">${avIcon}</span> <strong>${escapeHtml(entry.player_name)}</strong></td>
                        <td><span class="badge badge-${entry.difficulty}">${entry.difficulty.toUpperCase()}</span></td>
                        <td><span class="badge badge-mode">${entryMode}</span></td>
                        <td class="score-col">${Number(entry.score || 0).toLocaleString()}</td>
                        <td>${entry.percentage}%</td>
                        <td class="date-col">${dateStr}</td>
                    `;
                    this.dom.leaderboardTbody.appendChild(tr);
                });
            }
        } catch (err) {
            console.error("Leaderboard error:", err);
            if (this.dom.leaderboardTbody) {
                this.dom.leaderboardTbody.innerHTML = `<tr><td colspan="7" style="color:#ff5a5a;text-align:center;padding:24px;">Failed to load records from the crypt.</td></tr>`;
            }
        }
    }
}
