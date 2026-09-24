/**
 * 🎃 Spooky Master (Halloween Quiz) - Client-side Router Module (v2.6.0)
 * Manages real browser URL routing (HTML5 History API: pushState, replaceState, popstate),
 * active navigation state (aria-current="page", .active), deep-linking, direct page refresh,
 * safe quiz leaving confirmation, and page-specific lifecycle bootstrapping.
 */

export class GameRouter {
    constructor(app) {
        this.app = app;
        this.routes = [
            { path: "/", page: "home", title: "Spooky Master 🎃 Halloween Quiz Challenge" },
            { path: "/play", page: "play", title: "Spooky Master — Play Setup" },
            { path: "/play/session", page: "quiz", title: "Spooky Master — Active Quiz" },
            { path: "/results", page: "results", title: "Spooky Master — Hunt Results" },
            { path: "/journey", page: "journey", title: "Spooky Master — Haunted Journey" },
            { path: "/journey/chapter/:chapterId", page: "journey_chapter", title: "Spooky Master — Chapter Journey" },
            { path: "/daily-haunt", page: "daily_haunt", title: "Spooky Master — Daily Haunt" },
            { path: "/duels", page: "duels", title: "Spooky Master — Haunted Duels" },
            { path: "/duels/:duelCode", page: "duel_invite", title: "Spooky Master — Duel Challenge" },
            { path: "/progress", page: "progress", title: "Spooky Master — Hunter Progress & Mastery" },
            { path: "/leaderboard", page: "leaderboard", title: "Spooky Master — Leaderboard" },
            { path: "/pass", page: "pass", title: "Spooky Master — Spooky Master Pass" },
            { path: "/settings", page: "settings", title: "Spooky Master — Settings" },
            { path: "/hunters", page: "hunters", title: "Spooky Master — Hunter Guises" },
            { path: "/hunter-studio", page: "hunter_studio", title: "Spooky Master — Hunter Studio" },
            { path: "/privacy", page: "privacy", title: "Spooky Master — Privacy Policy" },
        ];
        this.currentRoute = null;
        this.currentParams = {};
        this.isNavigating = false;
    }

    init() {
        // Intercept all internal anchor clicks pointing to supported routes
        document.addEventListener("click", (e) => {
            const anchor = e.target.closest("a[href^='/']");
            if (!anchor) return;
            if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;

            const href = anchor.getAttribute("href");
            if (!href) return;

            // Check if href is an internal application route
            if (this.matchRoute(href)) {
                e.preventDefault();
                this.navigate(href);
            }
        });

        // Listen for browser Back/Forward navigation
        window.addEventListener("popstate", () => {
            this.resolveRoute(window.location.pathname, false);
        });

        // Prevent accidental tab closing during active quiz gameplay
        window.addEventListener("beforeunload", (e) => {
            if (this.app.isQuizActive && this.app.isQuizActive()) {
                e.preventDefault();
                e.returnValue = "Leave this hunt? Your current round will be abandoned.";
                return e.returnValue;
            }
        });

        // Initial route resolution on page load
        const initialPath = window.location.pathname || "/";
        this.resolveRoute(initialPath, false);
    }

    matchRoute(pathname) {
        const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";
        for (const r of this.routes) {
            const routeParts = r.path.split("/").filter(Boolean);
            const pathParts = cleanPath.split("/").filter(Boolean);

            if (r.path === "/" && cleanPath === "/") {
                return { route: r, params: {} };
            }

            if (routeParts.length !== pathParts.length) continue;

            let matches = true;
            const params = {};

            for (let i = 0; i < routeParts.length; i++) {
                if (routeParts[i].startsWith(":")) {
                    const paramName = routeParts[i].slice(1);
                    params[paramName] = decodeURIComponent(pathParts[i]);
                } else if (routeParts[i] !== pathParts[i]) {
                    matches = false;
                    break;
                }
            }

            if (matches) {
                return { route: r, params };
            }
        }
        return null;
    }

    navigate(pathname, replace = false) {
        // Active quiz safety confirmation if user tries to leave active game
        if (
            this.app.isQuizActive &&
            this.app.isQuizActive() &&
            pathname !== "/play/session" &&
            !pathname.startsWith("/results")
        ) {
            const confirmed = window.confirm("Leave this hunt? Your current round will be abandoned.");
            if (!confirmed) return;
            if (this.app.abandonQuizSession) {
                this.app.abandonQuizSession();
            }
        }

        const match = this.matchRoute(pathname);
        if (!match) {
            window.location.href = pathname;
            return;
        }

        const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
        const targetPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";

        if (currentPath !== targetPath) {
            if (replace) {
                window.history.replaceState(null, "", pathname);
            } else {
                window.history.pushState(null, "", pathname);
            }
        }

        this.resolveRoute(pathname, true);
    }

    resolveRoute(pathname, isClientTransition = true) {
        const match = this.matchRoute(pathname);
        const resolved = match || {
            route: { path: "/", page: "home", title: "Spooky Master 🎃 Halloween Quiz Challenge" },
            params: {},
        };

        this.currentRoute = resolved.route;
        this.currentParams = resolved.params;

        // 1. Update Document Title
        document.title = resolved.route.title;

        // 2. Update Body State
        document.body.setAttribute("data-page", resolved.route.page);
        document.body.setAttribute("data-route", pathname);

        // 3. Update Active Navigation States (aria-current="page" and .active)
        this.updateNavigationElements(pathname, resolved.route.page);

        // 4. Update Page View Visibility
        this.activatePageView(resolved.route.page, resolved.params);

        // 5. Trigger Page-Specific Lifecycle Bootstrap
        this.bootstrapCurrentPage(resolved.route.page, resolved.params, isClientTransition);

        // 6. Scroll smoothly to top on page transitions
        if (isClientTransition) {
            window.scrollTo({ top: 0, behavior: "instant" });
        }
    }

    updateNavigationElements(pathname, pageName) {
        // Desktop Top Nav links
        const navLinks = document.querySelectorAll(".top-nav .nav-btn, .mobile-bottom-nav .mobile-nav-item, .mobile-more-card");
        navLinks.forEach((link) => {
            const linkRoute = link.getAttribute("data-route") || link.getAttribute("href");
            if (!linkRoute) return;

            const isCurrent =
                linkRoute === pathname ||
                (linkRoute === "/journey" && (pageName === "journey" || pageName === "journey_chapter")) ||
                (linkRoute === "/duels" && (pageName === "duels" || pageName === "duel_invite")) ||
                (linkRoute === "/" && pageName === "home");

            if (isCurrent) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            } else {
                link.classList.remove("active");
                link.removeAttribute("aria-current");
            }
        });
    }

    activatePageView(pageName, params) {
        // Hide all page containers
        const allPages = document.querySelectorAll(".page-view");
        allPages.forEach((el) => {
            el.classList.remove("active");
            el.classList.add("hidden");
        });

        // Match page element
        const targetPage = document.getElementById(`page-${pageName.replace(/_/g, "-")}`);
        if (targetPage) {
            targetPage.classList.remove("hidden");
            targetPage.classList.add("active");
        }

        // Also sync legacy screen containers and modals for complete backward compatibility
        const legacyScreens = {
            home: document.getElementById("screen-start"),
            play: document.getElementById("screen-start"),
            quiz: document.getElementById("screen-quiz"),
            results: document.getElementById("screen-gameover"),
        };

        Object.entries(legacyScreens).forEach(([key, el]) => {
            if (!el) return;
            if (key === pageName) {
                el.classList.remove("hidden");
                el.classList.add("active");
            } else if (pageName === "quiz" || pageName === "results") {
                el.classList.remove("active");
                el.classList.add("hidden");
            }
        });

        // Sync legacy modals (Journey, Duels, Mastery, Leaderboard, Settings, Pass)
        const modalMap = {
            journey: document.getElementById("modal-campaign"),
            journey_chapter: document.getElementById("modal-campaign"),
            duels: document.getElementById("modal-duels"),
            duel_invite: document.getElementById("modal-duels"),
            progress: document.getElementById("modal-mastery"),
            leaderboard: document.getElementById("modal-leaderboard"),
            settings: document.getElementById("modal-settings"),
            pass: document.getElementById("modal-premium"),
            hunters: document.getElementById("modal-avatar-picker"),
            hunter_studio: document.getElementById("modal-avatar-picker"),
        };

        // If on a routed page, ensure its corresponding container is active and not hidden
        Object.entries(modalMap).forEach(([key, modalEl]) => {
            if (!modalEl) return;
            if (key === pageName) {
                modalEl.classList.remove("hidden");
                modalEl.classList.add("active");
            } else if (modalEl && !document.querySelector(`.modal-overlay.active`)) {
                // Keep clean state
            }
        });
    }

    bootstrapCurrentPage(pageName, params, isClientTransition) {
        if (!this.app) return;

        switch (pageName) {
            case "home":
                this.app.bootstrapHome?.();
                break;
            case "play":
                this.app.bootstrapPlay?.();
                break;
            case "quiz":
                this.app.bootstrapQuiz?.();
                break;
            case "results":
                this.app.bootstrapResults?.(params.sessionId);
                break;
            case "journey":
                this.app.bootstrapJourney?.();
                break;
            case "journey_chapter":
                this.app.bootstrapJourneyChapter?.(params.chapterId);
                break;
            case "daily_haunt":
                this.app.bootstrapDailyHaunt?.();
                break;
            case "duels":
                this.app.bootstrapDuels?.();
                break;
            case "duel_invite":
                this.app.bootstrapDuelInvite?.(params.duelCode);
                break;
            case "progress":
                this.app.bootstrapProgress?.();
                break;
            case "leaderboard":
                this.app.bootstrapLeaderboard?.();
                break;
            case "pass":
                this.app.bootstrapPass?.();
                break;
            case "settings":
                this.app.bootstrapSettings?.();
                break;
            case "hunters":
                this.app.bootstrapHunters?.();
                break;
            case "hunter_studio":
                this.app.bootstrapHunterStudio?.();
                break;
            default:
                break;
        }
    }
}
