# Spooky Master Project State

**Last Updated**: 2026-09-29
**Branch**: `main`
**Current Commit**: `f07585bb2ad74aeb9aaade491804352b9b0002c3`
**Standardized Release Version**: `2.6.0`
**Canonical Runtime**: FastAPI-served multi-page/routed web application using shared HTML shell, Vanilla JS ES modules, client-side navigation, direct server routes, PWA, and SQLite persistence.

---

## 1. Executive Summary & Audit Reconciliations

This document tracks current architectural truth, monetization compliance (Policy A), persistent storage guarantees, and deployment readiness for Spooky Master v2.6.0.

### Key Architectural Truths & Fixes:
1. **Multi-Page Routed Web Application**: Replaced unrouted SPA architecture with a hybrid FastAPI server routing + client-side HTML5 History API router (`router.js`). Supports dedicated URLs, deep linking, browser back/forward history (`popstate`), direct refresh, and active quiz leave guards.
2. **Persistent Generated Avatar Storage**: Migrated from ephemeral static storage to persistent Render disk mount (`/app/data/generated_avatars` via `GENERATED_AVATAR_DIR`) and public endpoint `/generated-avatars/<file>.svg`. Missing files are deterministically reconstructed on-demand from SQLite metadata via `SelfHealingStaticFiles`.
3. **Entitlement Persistence**: Entitlements are backed by durable SQLite storage (`user_entitlements` table in `halloween.db` with WAL mode) and survive process restarts, container restarts, multi-worker deployments, and server reboots.
4. **Guest vs. Authenticated State**: All player identities are marked as `is_guest: true` with authoritative client UUIDs (`X-Player-ID`). Accidental score or personal best collisions across players sharing display nicknames are prevented.
5. **Policy A Zero Pay-To-Win Enforced**: Premium passes (`Spooky Master Pass`, `Haunted VIP`) grant **0 daily diamonds**. Diamonds remain 100% skill-earned via in-game achievements, campaign stars, daily challenges, and community goals. Boosters remain prohibited in ranked competitive modes (`daily`, `duel`).
6. **Billing & Storefront Honesty**: Prices ($4.99 lifetime, $2.99/mo) are explicitly designated as proposed configuration SKUs. Real-money gateways (Stripe Checkout, Apple StoreKit 2, Google Play Billing) are **DESIGNED FOR FUTURE / NOT IMPLEMENTED**.
7. **Receipt Validation Honesty**: `POST /api/entitlements/verify` returns `verified_by_provider: false`, `provider_configured: false`, and `simulation: true`.
8. **Ad Experience Honesty**: `FEATURE_ADS` is disabled (`false`) by default because no third-party ad network SDK is integrated.
9. **Version Uniformity**: Standardized on `2.6.0` across `pyproject.toml`, `__init__.py`, `app.py`, `routes.py`, `app.js`, `sw.js`, `index.html`, and documentation.
10. **Endpoint Lockdown**: `POST /api/leaderboard` is disabled in production (returns HTTP 403 Forbidden). All ranked leaderboard entries must originate from server-validated completed quiz sessions.

---

## 2. Monetization Implementation Truth Table

| Feature / Subsystem | Status | Active Code Location | Operational Reality |
| :--- | :--- | :--- | :--- |
| **Campaign Chapters 4–6 Gating** | 🟢 IMPLEMENTED & VERIFIED | `core/campaign.py`, `routes.py:start_quiz` | Enforced server-side (HTTP 403) for unentitled users. |
| **Supernatural Guises (Avatars)** | 🟢 IMPLEMENTED & VERIFIED | `core/entitlements.py`, `app.js` | Cosmetic only; validated upon quiz launch. |
| **Atmospheric Themes** | 🟢 IMPLEMENTED & VERIFIED | `core/entitlements.py`, `app.js` | Blood Moon, Phantom Forest, Neon Crypt, Midnight Graveyard. |
| **Advanced Trivia Topics** | 🟢 IMPLEMENTED & VERIFIED | `core/engine.py`, `core/entitlements.py` | Additive packs (Cryptids, Cinema Masters, Global Folklore). |
| **Durable Entitlement Storage** | 🟢 IMPLEMENTED & VERIFIED | `core/storage.py`, `core/entitlements.py` | Backed by SQLite table `user_entitlements`; survives restarts. |
| **Zero Pay-to-Win (Policy A)** | 🟢 IMPLEMENTED & VERIFIED | `core/entitlements.py`, `index.html` | Exactly 0 diamond currency granted by any premium pass. |
| **Guest Identity Separation** | 🟢 IMPLEMENTED & VERIFIED | `core/storage.py`, `routes.py`, `app.js` | Authoritative `player_id` stored in `high_scores`; `is_guest: true`. |
| **Dev Mode Override** | 🟡 DEV ONLY | `core/entitlements.py` | Gated by `ENVIRONMENT != "production"` and `DEV_PREMIUM_MODE`. |
| **Receipt Restore Simulation** | 🟡 DEV ONLY | `routes.py:verify_or_restore_purchase` | Explicit simulation flag; no external provider verification. |
| **Stripe Checkout / Webhooks** | 🔵 DESIGNED FOR FUTURE | `docs/MONETIZATION_ARCHITECTURE.md` | Specification written; no live SDK or webhook workers. |
| **StoreKit 2 / Google Play SDK**| 🔵 DESIGNED FOR FUTURE | `docs/MONETIZATION_ARCHITECTURE.md` | Future native wrapper specification. |
| **Ad Network SDK** | ⚪ NOT IMPLEMENTED | `core/entitlements.py` | `FEATURE_ADS=false`; no live ad provider. |

---

## 3. Latest Test & Verification Results

| Suite / Tool | Test Count | Result | Details |
| :--- | :--- | :--- | :--- |
| **Ruff Linter** | Entire codebase | 🟢 PASS | 0 errors |
| **Mypy Type Checker** | 20 source files | 🟢 PASS | 0 errors; strict typing validated |
| **Unit & Integration Suite** | 131 tests | 🟢 PASS (100%) | 131 passed, 0 failed, 3 skipped; 0 regressions |
| **Playwright Core Browser E2E** | 44 tests | 🟢 PASS (100%) | Cross-browser Chromium end-to-end verified |
| **Playwright Monetization E2E** | 3 tests | 🟢 PASS (100%) | Modal catalog, view switcher, theme switcher verified |
| **Playwright Routes E2E** | 6 tests | 🟢 PASS (100%) | Multi-page routing, deep linking, browser back/forward verified |
| **Total Automated Tests** | **184 tests** | 🟢 **PASS (100%)** | Full green regression run |
| **Docker / GHCR Build** | Container build & push | 🟢 PASS | Multi-stage image build and package publishing |
| **Render Live Deployment** | Web service | 🟡 NOT VERIFIED | Trigger skipped; pending live deployment verification |
| **Production Target Domain** | DNS / HTTPS | 🟡 NOT VERIFIED | Configured target domain: `halloween.jamoloto.dev` |

---

## 4. Residual Technical Debt & Future Milestones

1. **OAuth / User Accounts**: Replace client UUID guest identity with server-authoritative OAuth (e.g., Supabase / Firebase / Google Auth) when multi-device account syncing is prioritized.
2. **Server-Side Player Inventory**: Migrate client-side diamond and booster inventory (`spooky_player_profile` in localStorage) to server-authoritative wallet tables once user authentication is launched.
3. **External Payment Provider**: Implement Stripe Checkout sessions and cryptographic webhook verification (`stripe.Webhook.construct_event`) when merchant banking is established.
