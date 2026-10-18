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
            { path: "/hunt", page: "hunt", title: "Spooky Master — Hunt Mode Selection" },
            { path: "/genie", page: "genie", title: "Spooky Master — Spooky Genie & Oracle" },
            { path: "/play", page: "play", title: "Spooky Master — Play Setup" },
            { path: "/play/session", page: "quiz", title: "Spooky Master — Active Quiz" },
            { path: "/results", page: "results", title: "Spooky Master — Hunt Results" },
            { path: "/results/:sessionId", page: "results", title: "Spooky Master — Hunt Results" },
            { path: "/journey", page: "journey", title: "Spooky Master — Haunted Journey" },
            { path: "/journey/chapter/:chapterId", page: "journey_chapter", title: "Spooky Master — Chapter Journey" },
            { path: "/daily-haunt", page: "daily_haunt", title: "Spooky Master — Daily Haunt" },
            { path: "/duels", page: "duels", title: "Spooky Master — Haunted Duels" },
            { path: "/duels/:duelCode", page: "duel_invite", title: "Spooky Master — Duel Challenge" },
            { path: "/duel/:duelCode", page: "duel_invite", title: "Spooky Master — Duel Challenge" },
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
            const isAutomated = Boolean(window.__PLAYWRIGHT_TEST__ || (typeof navigator !== "undefined" && navigator.webdriver && !window.__REQUIRE_CONFIRM__));
            const confirmed = isAutomated ? true : window.confirm("Leave this hunt? Your current round will be abandoned.");
            if (!confirmed) return;
            if (this.app.abandonQuizSession) {
                this.app.abandonQuizSession();
            }
        }

        const match = this.matchRoute(pathname);
        if (!match || match.route.page === "privacy") {
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

        const isGated =
            resolved.route.page !== "privacy" &&
            this.app &&
            typeof this.app.hasEnteredGate === "function" &&
            !this.app.hasEnteredGate();

        if (isGated) {
            const isResultsWithSession =
                resolved.route.page === "results" && Boolean(resolved.params?.sessionId);
            const nonPostAuthPages = new Set(["home", "quiz", "results", "privacy"]);
            if (match && (!nonPostAuthPages.has(resolved.route.page) || isResultsWithSession)) {
                this.app.pendingPostAuthRoute = pathname;
            } else {
                this.app.pendingPostAuthRoute = null;
            }
        }

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
                (linkRoute === "/hunt" && pageName === "hunt") ||
                (linkRoute === "/genie" && pageName === "genie") ||
                (linkRoute === "/journey" && (pageName === "journey" || pageName === "journey_chapter")) ||
                (linkRoute === "/duels" && (pageName === "duels" || pageName === "duel_invite")) ||
                (linkRoute === "/progress" && pageName === "progress") ||
                (linkRoute === "/leaderboard" && pageName === "leaderboard") ||
                (linkRoute === "/settings" && pageName === "settings") ||
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
        // 1. Hide all page-view containers
        const allPages = document.querySelectorAll(".page-view");
        allPages.forEach((el) => {
            el.classList.remove("active");
            el.classList.add("hidden");
        });

        // 2. Hide all legacy game screens (including #screen-landing)
        const legacyScreens = [
            document.getElementById("screen-landing"),
            document.getElementById("screen-start"),
            document.getElementById("screen-quiz"),
            document.getElementById("screen-gameover"),
        ];
        legacyScreens.forEach((el) => {
            if (el) {
                el.classList.remove("active");
                el.classList.add("hidden");
            }
        });

        // 3. Map routed pages to modal overlays if backed by modal markup
        const modalMap = {
            journey: document.getElementById("modal-campaign"),
            journey_chapter: document.getElementById("modal-campaign"),
            duels: document.getElementById("modal-duels"),
            progress: document.getElementById("modal-mastery"),
            leaderboard: document.getElementById("modal-leaderboard"),
            settings: document.getElementById("modal-settings"),
            pass: document.getElementById("modal-premium"),
            hunters: document.getElementById("modal-avatar-picker"),
            hunter_studio: document.getElementById("modal-avatar-picker"),
        };

        const isGated =
            pageName !== "privacy" &&
            this.app &&
            typeof this.app.hasEnteredGate === "function" &&
            !this.app.hasEnteredGate();

        // Ensure all modal overlays are hidden unless targeted and gate is entered
        Object.entries(modalMap).forEach(([key, modalEl]) => {
            if (!modalEl) return;
            if (!isGated && key === pageName) {
                modalEl.classList.remove("hidden");
                modalEl.classList.add("active");
            } else {
                modalEl.classList.remove("active");
                modalEl.classList.add("hidden");
            }
        });

        if (isGated) {
            const authModal = document.getElementById("modal-auth");
            const landingScreen = document.getElementById("screen-landing");
            if (this.app._isEnteringFromLanding && authModal) {
                authModal.classList.remove("hidden");
                authModal.classList.add("active");
                document.body.setAttribute("data-active-screen", "auth");
            } else {
                if (authModal) {
                    authModal.classList.remove("active");
                    authModal.classList.add("hidden");
                }
                if (landingScreen) {
                    landingScreen.classList.remove("hidden");
                    landingScreen.classList.add("active");
                }
                document.body.setAttribute("data-active-screen", "landing");
            }
            return;
        }

        if (pageName !== "home") {
            const authModal = document.getElementById("modal-auth");
            if (authModal) {
                authModal.classList.remove("active");
                authModal.classList.add("hidden");
            }
            document.body.setAttribute("data-active-screen", pageName);
        }

        // 4. Activate specific screen / page container
        if (pageName === "home") {
            const startScreen = document.getElementById("screen-start");
            if (startScreen) {
                startScreen.classList.remove("hidden");
                startScreen.classList.add("active");
            }
            document.body.setAttribute("data-active-screen", "start");
        } else if (pageName === "play") {
            const startScreen = document.getElementById("screen-start");
            if (startScreen) {
                startScreen.classList.remove("hidden");
                startScreen.classList.add("active");
            }
            document.body.setAttribute("data-active-screen", "start");
        } else if (pageName === "quiz") {
            const quizScreen = document.getElementById("screen-quiz");
            if (quizScreen) {
                quizScreen.classList.remove("hidden");
                quizScreen.classList.add("active");
            }
            document.body.setAttribute("data-active-screen", "quiz");
        } else if (pageName === "results") {
            const resultsScreen = document.getElementById("screen-gameover");
            if (resultsScreen) {
                resultsScreen.classList.remove("hidden");
                resultsScreen.classList.add("active");
            }
            document.body.setAttribute("data-active-screen", "results");
        } else {
            // Activate corresponding page-view if present (e.g. #page-hunt, #page-genie, #page-daily-haunt)
            const targetPage = document.getElementById(`page-${pageName.replace(/_/g, "-")}`);
            if (targetPage) {
                targetPage.classList.remove("hidden");
                targetPage.classList.add("active");
            }
        }
    }

    bootstrapCurrentPage(pageName, params, isClientTransition) {
        if (!this.app) return;

        if (
            pageName !== "privacy" &&
            typeof this.app.hasEnteredGate === "function" &&
            !this.app.hasEnteredGate()
        ) {
            this.app.bootstrapHome?.();
            return;
        }

        switch (pageName) {
            case "home":
                this.app.bootstrapHome?.();
                break;
            case "hunt":
                this.app.bootstrapHunt?.();
                break;
            case "genie":
                this.app.bootstrapGenie?.();
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
