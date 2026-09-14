# Changelog

All notable changes to the **Halloween Quiz** project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-09-14

### Added
- **Six Distinct Game Modes**:
  - `Classic`: 10-round balanced quiz.
  - `Quick Bite`: 5-round rapid-fire trivia.
  - `Deep Dive`: 15-round marathon trivia challenge.
  - `Midnight Panic`: High-intensity 10-second timer per question with boosted speed bonuses.
  - `Endless Night`: Survival mode with 3 lives (strikes HUD), continuous play until 3 misses.
  - `Daily Haunt`: Deterministic UTC-seeded daily question batch identical for all players globally, with UTC midnight reset timer.
- **Player Progression & Category Mastery**:
  - Six tiered mastery ranks per category (`Lost Soul`, `Curious Ghost`, `Crypt Explorer`, `Spirit Hunter`, `Nightmare Expert`, `Master of the Crypt`).
  - Modal viewer displaying real-time accuracy progress bars and question completion counts.
- **Deterministic Badges & Achievements**:
  - Deterministic conditions for `Ghost Hunter` (3 streak), `Night Stalker` (5 streak), `Possessed` (10 streak), `Speed Demon` (<4s answer), `Perfect Séance` (100% accuracy), `Hard Mode Survivor` (Hard difficulty 70%+ score), `Endless Slayer` (10+ streak in Endless), `Daily Haunt Victor` (Daily Haunt completion).
  - Animated toast notifications on badge unlock.
- **Enterprise Security & Anti-Cheat**:
  - Authoritative server timing: `_question_presented_at` tracks monotonic server timestamps; answers submitted with impossible elapsed times are automatically clamped to server elapsed time.
  - In-memory sliding window rate limiting: 15 quiz starts/min, 60 actions/min per IP address.
  - Strict input sanitization for player names against CSV and formula injection (`=`, `+`, `-`, `@`, `|`, `%`).
  - High score submission validation ensuring only active, verified game sessions can submit scores.
- **PWA & Offline Consolidation**:
  - Canonical Service Worker (`/sw.js`) with cache versioning, assets precaching, and network-first navigation with offline fallback.
  - Canonical Web App Manifest (`/manifest.json`) supporting standalone display, `#ff7518` theme color, and 192x192 / 512x512 icons.
  - Offline fallback page (`/offline.html`) and compliant Privacy Policy (`/privacy`).
- **Accessible UI & Social Sharing**:
  - Settings modal with volume sliders, audio toggles, Reduced Motion toggle (`prefers-reduced-motion` override), and Haptic Feedback toggle.
  - Web Share API survival card generator with formatted clipboard fallback.
  - Non-blocking in-app notification banners replacing raw browser `alert()` popups while preserving test compatibility.
- **Production DevOps & Probes**:
  - Standardized Kubernetes health probes: `/live` (Liveness), `/ready` (Readiness), and `/health` (Deep diagnostics).
  - PostgreSQL / SQLite `DATABASE_URL` runtime compatibility with automatic schema migration.
  - Playwright browser end-to-end test suite (`tests/test_browser_e2e.py`) validating gameplay, HUD, modals, keyboard shortcuts, and viewports from 360px to 1920px.

### Changed
- Refactored `src/halloween_quiz/web/static/app.js` into an event-driven, accessible, zero-reload client engine.
- Enhanced responsive CSS (`src/halloween_quiz/web/static/style.css`) with 880px and 768px tablet breakpoints, eliminating horizontal overflow across all form factors.
- Upgraded `SessionManager` to enforce TTL-based automatic session pruning (3600s) and bounded memory capacity (1000 sessions).

---

## [2.0.0] - 2026-09-12

### Added
- Complete FastAPI backend architecture (`src/halloween_quiz/web/`).
- Pure browser Web Audio API procedural synthesizer for start, correct, incorrect, tick, and fanfare sounds.
- Rich CLI interface (`src/halloween_quiz/cli/main.py`).
- SQLite storage repository with automated migration from legacy `high_scores.csv`.
- Curated 108-question JSON database across 6 categories.
