/**
 * 🎃 Spooky Master (Halloween Quiz) - PWA & Service Worker Module
 * Handles progressive web app registration, version update checks,
 * offline shell caching, and the install prompt banner.
 */

export class PwaManager {
    constructor(app) {
        this.app = app;
        this.deferredInstallPrompt = null;
    }

    get dom() {
        return this.app.dom;
    }

    initPwa() {
        if ("serviceWorker" in navigator) {
            window.addEventListener("load", () => {
                navigator.serviceWorker.register("/sw.js").then((reg) => {
                    // Check for updated service worker
                    reg.update().catch(() => {});
                }).catch((err) => {
                    console.warn("[SW] Registration warning:", err);
                });
            });

            // Reload when new service worker takes control
            let refreshing = false;
            navigator.serviceWorker.addEventListener("controllerchange", () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        }

        // Install prompt handling
        window.addEventListener("beforeinstallprompt", (e) => {
            e.preventDefault();
            this.deferredInstallPrompt = e;
            if (this.dom.btnInstallApp) {
                this.dom.btnInstallApp.classList.remove("hidden");
            }
        });

        window.addEventListener("appinstalled", () => {
            this.deferredInstallPrompt = null;
            if (this.dom.btnInstallApp) {
                this.dom.btnInstallApp.classList.add("hidden");
            }
            this.app.showToast("Installed!", "Spooky Master is ready to play offline!", "🎃");
        });
    }

    async promptInstall() {
        if (!this.deferredInstallPrompt) return;
        this.deferredInstallPrompt.prompt();
        const { outcome } = await this.deferredInstallPrompt.userChoice;
        if (outcome === "accepted") {
            this.deferredInstallPrompt = null;
            if (this.dom.btnInstallApp) {
                this.dom.btnInstallApp.classList.add("hidden");
            }
        }
    }
}
