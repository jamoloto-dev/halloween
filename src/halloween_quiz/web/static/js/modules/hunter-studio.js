/**
 * 🎃 Spooky Master (Halloween Quiz) - Hunter Studio & Avatar Picker Module
 * Manages predefined avatars, procedural studio options (creatures, styles, colors, accessories),
 * real-time synthesis preview, equipping generated avatars, and the player hunter gallery.
 */

import { PREDEFINED_AVATARS, escapeHtml } from "./utils.js";

export class HunterStudioManager {
    constructor(app) {
        this.app = app;
        this.hunterStudioOptions = null;
        this.studioSelection = {
            creature: "ghost",
            style: "dark_fantasy",
            color: "purple",
            accessory: "lantern",
        };
        this.lastSynthesizedAvatar = null;
    }

    get dom() {
        return this.app.dom;
    }

    get profile() {
        return this.app.profile;
    }

    get synthesizedAvatars() {
        return this.app.synthesizedAvatars;
    }

    openAvatarPicker() {
        this.switchAvatarTab("predefined");
        if (!this.dom.sharedAvatarGrid) return;
        this.dom.sharedAvatarGrid.innerHTML = "";

        PREDEFINED_AVATARS.forEach((avatar) => {
            const isCurrent = avatar.id === this.profile.avatar_id;
            const isLocked = avatar.is_premium && !this.app.isPremium();
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
                    this.app.openPremiumModal();
                    return;
                }
                this.app.updateAvatar(avatar.id);
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
            this.app.lastSynthesizedAvatar = data;

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
                this.app.saveSynthesizedAvatars();
            }
            this.renderHunterGallery();
            this.app.sound.play("achievement");
            this.app.showToast("Hunter Synthesized!", data.name, "✨");
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
        this.app.updateAvatar(avId);
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
                    this.app.saveSynthesizedAvatars();
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
                <img src="${av.asset_url || av.asset}" alt="${escapeHtml(av.name)}" width="48" height="48">
                <span class="hunter-thumb-name">${escapeHtml(av.name)}</span>
            `;
            const selectItem = () => {
                this.lastSynthesizedAvatar = av;
                this.app.lastSynthesizedAvatar = av;
                if (this.dom.hunterPreviewImg) {
                    this.dom.hunterPreviewImg.src = av.asset_url || av.asset;
                    this.dom.hunterPreviewImg.alt = av.name;
                }
                if (this.dom.hunterPreviewName) this.dom.hunterPreviewName.textContent = av.name;
                if (this.dom.hunterPreviewStyle) this.dom.hunterPreviewStyle.textContent = (av.style || "").toUpperCase();
                if (this.dom.btnEquipGeneratedHunter) this.dom.btnEquipGeneratedHunter.classList.remove("hidden");
                this.app.updateAvatar(avId);
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
}
