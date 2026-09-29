# 🎃 Halloween Quiz Game (Spooky Master) 2.6.0

[![CI Pipeline](https://github.com/jamoloto-dev/halloween/actions/workflows/ci.yml/badge.svg)](https://github.com/jamoloto-dev/halloween/actions/workflows/ci.yml)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An enterprise-grade, spooky trivia experience with an asynchronous **FastAPI REST backend**, modern **multi-page routed web application** with a shared HTML shell and Vanilla JS ES modules, pure client-side **Web Audio API sound synthesizers**, a **cross-platform Rich CLI**, and thread-safe **SQLite WAL persistence**.

---

## 🚦 Deployment & Readiness Status

- **Production Code Readiness**: **READY** (containerized, type-checked, full regression verified)
- **Live Render Deployment**: **NOT YET VERIFIED** (deployment API trigger skipped / pending production setup)
- **Production Target Domain**: `https://halloween.jamoloto.dev` (**NOT YET VERIFIED** in DNS/live environment)
- **Real Billing**: **NOT IMPLEMENTED** (Stripe / StoreKit / Google Play are simulated specifications under Policy A)

---

## 📸 Demo & Screenshots

<p align="center">
  <video controls width="720" poster="assets/screenshots/halloween_demo.png">
    <source src="assets/screenshots/halloween_demo.mp4" type="video/mp4">
    <source src="assets/screenshots/halloween_demo.webp" type="image/webp">
    <img src="assets/screenshots/halloween_demo.gif" alt="Halloween Quiz demo" />
  </video>
</p>

---

## ✨ Features & Architecture

```
halloween/
├── src/halloween_quiz/
│   ├── core/                  # Pure domain logic & models
│   │   ├── models.py          # Pydantic v2 schemas (Question, QuizConfig, ScoreRecord)
│   │   ├── engine.py          # State machine: timer, streak multipliers, speed bonus
│   │   ├── campaign.py        # 6-chapter Haunted Journey campaign engine
│   │   ├── ai_avatars.py      # Generative Hunter avatar synthesis & self-healing
│   │   ├── ai_hints.py        # Smart Hints / Spooky Guide multi-level hints
│   │   ├── duels.py           # Asynchronous PvP duels & spooky traps
│   │   ├── entitlements.py   # Zero pay-to-win policy & entitlement service
│   │   └── storage.py         # Thread-safe SQLite repository (WAL mode, migrations)
│   ├── cli/                   # Cross-platform rich terminal experience
│   │   └── main.py            # Rich tables, colored panels, non-blocking timer
│   └── web/                   # Production Web Backend & Frontend
│       ├── app.py             # FastAPI app factory, multi-page routes, avatar static mount
│       ├── routes.py          # REST endpoints (/health, /api/quiz/*, /api/duels, etc.)
│       ├── static/            # Modular ES modules (router, audio, quiz, hunter-studio, etc.)
│       └── templates/         # Clean HTML5 multi-page shell & templates
├── assets/
│   ├── questions.json         # 312 canonical schema-validated questions across 6 categories
│   └── sounds/                # Audio assets (synthesizer samples & background audio)
├── pwa/                       # Progressive Web App (Service Worker, offline cache v2.6.0)
├── tests/                     # 184 automated tests (131 Python + 53 Playwright E2E)
├── Dockerfile                 # Multi-stage non-root container build
├── docker-compose.yml         # Containerized production & local dev setup
└── pyproject.toml             # Modern packaging (Ruff, Mypy, Pytest)
```

### 🌟 Key Features in Version 2.6.0

1. **Multi-Page Routed Game Experience**:
   Full client-side router (`router.js`) synchronized with FastAPI server page endpoints, supporting direct link navigation, browser back/forward history (`popstate`), direct page refresh, and an active quiz leave guard:
   - `/` — Haunted Game Lobby & Mode Select
   - `/play` — Customized Hunt Setup & Options
   - `/play/session` — Active Quiz Session & HUD
   - `/results` & `/results/{session_id}` — Session Breakdown & Star Rating
   - `/journey` — The Haunted Journey Campaign Map (6 chapters, 36 stages)
   - `/journey/chapter/{chapter_id}` — Deep Link to Specific Campaign Chapters
   - `/daily-haunt` — Global UTC-Seeded Daily Challenge & Community Goals
   - `/duels` — Asynchronous PvP Duels Lobby & Challenge Creation
   - `/duels/{code}` & `/duel/{code}` — Duel Challenge Direct Accept Deep Links
   - `/progress` — Player Profile, Category Mastery & Badge Showcase
   - `/leaderboard` — Server-Authoritative Ranked Crypt High Scores
   - `/pass` — Spooky Master Pass & Entitlements Showcase
   - `/settings` — Audio, Haptics, Motion & Account Preferences
   - `/hunters` — Supernatural Hunter Guise Drawer
   - `/hunter-studio` — Generative AI Hunter Avatar Studio
   - `/privacy` — Compliant Privacy Policy

2. **336 Total Runtime Question Experiences**:
   - **312 Canonical Questions**: Curated across 6 balanced categories (52 questions each):
     - *Spooky Stories*: 52
     - *Costumes & Traditions*: 52
     - *Horror Movies*: 52
     - *Halloween History*: 52
     - *Candy & Treats*: 52
     - *Paranormal Lore*: 52
     - Difficulty balance: 108 Easy, 108 Medium, 96 Hard.
   - **12 Premium Expansion Questions**: Specialized lore packs for campaign extension.
   - **12 Procedural Audio Riddles**: Multi-sensory Web Audio questions with screen-reader transcripts.

3. **Visual Trivia & Procedural Audio Riddles**:
   Rich SVG silhouettes, accessible transcripts, and custom Web Audio tone synthesizers (`correct`, `incorrect`, `tick`, `ui`, `fanfare`, `werewolf_howl`, `spectral_whisper`).

4. **Hunter Studio & Persistent Generated Avatars**:
   Personalized supernatural Hunter avatar generation with server-side moderation and prompt-hash deduplication. Stored persistently on Render disk at `/app/data/generated_avatars` (public path `/generated-avatars/<file>.svg`) with deterministic on-demand self-healing (`SelfHealingStaticFiles`).

5. **Adaptive Learning & Smart Hints**:
   Composite real-time player scoring dynamically adjusting difficulty while maintaining strict standardization in competitive modes. Context-aware multi-tiered AI Spooky Guide hints.

6. **PWA & Offline Support**:
   Versioned cache (`spooky-master-v2.6.0`), service worker (`/sw.js`), web app manifest (`/manifest.json`), network-first routing with offline fallback shell (`/offline.html`).

7. **Persistent SQLite Production Storage**:
   Thread-safe SQLite with Write-Ahead Logging (WAL) mounted at `/app/data/halloween.db` on Render persistent disk. Survives process restarts and redeployments.

8. **Zero Pay-To-Win Policy (Policy A)**:
   Strictly enforced fair play: premium passes grant **0 free diamond currency**, boosters are prohibited in competitive modes (`daily`, `duel`), and high scores are 100% server-authoritative. Real-money gateways remain unconfigured/simulated.

9. **Server-Authoritative Anti-Cheat**:
   Monotonic server timestamps clamp client speed exploits; in-memory sliding window rate limits prevent brute-force abuse. Direct score posting is disabled in production.

10. **Mobile-Responsive Navigation Shell**:
    Dual-mode navigation featuring a streamlined desktop header bar, compact mobile bottom navigation bar (`.mobile-bottom-nav`), and mobile "More" drawer sheet.

## 🚀 Quick Start

### 1. Local Setup (Virtual Environment)

```bash
# Clone repository
git clone https://github.com/jamoloto-dev/halloween.git
cd halloween

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies and editable package
pip install -r requirements.txt
pip install -e ".[dev]"
```

### 2. Launch the Web Application

```bash
# Run web server (FastAPI + Uvicorn)
python run.py
```
Open **http://127.0.0.1:5000** in your browser to play!

### 3. Launch the Terminal Game (Rich CLI)

```bash
# Run the interactive rich CLI
python run.py --cli

# Or use the installed script command
halloween-quiz play --difficulty medium --questions 10

# View high scores in terminal
halloween-quiz leaderboard

# Check question database statistics
halloween-quiz stats
```

---

## 🐳 Docker & Container Deployment

### Local Docker Compose
```bash
docker compose up --build
```
Access the application at `http://127.0.0.1:5000`. High scores persist in `./data`.

### Production Docker Build
```bash
docker build -t halloween-quiz:latest .
docker run -p 5000:5000 -e PORT=5000 halloween-quiz:latest
```

---

## 🧪 Testing & Code Quality

Spooky Master v2.6.0 is covered by 184 automated tests across Python unit/integration tests and Playwright browser E2E tests:
- **Python Unit & Integration**: 131 passed, 0 failed, 3 skipped
- **Playwright Browser E2E**: 53 passed, 0 failed (cross-browser Chromium)
- **Static Analysis**: Ruff (0 errors) & Mypy (0 issues across 20 source files)

```bash
# Run unit and integration tests with coverage
pytest -m "not e2e" --cov=halloween_quiz

# Run browser end-to-end tests (requires chromium)
pytest tests/test_browser_e2e.py tests/test_monetization_browser_e2e.py tests/test_routes_e2e.py -m e2e

# Run Ruff linter and formatter check
ruff check .

# Run Mypy static type checker
mypy
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health, DB connectivity, question counts |
| `GET` | `/api/categories` | List trivia categories and difficulties |
| `POST` | `/api/quiz/start` | Initialize a new session with config |
| `GET` | `/api/quiz/{session_id}` | Fetch current question and status |
| `POST` | `/api/quiz/{session_id}/answer` | Submit answer with speed timing |
| `POST` | `/api/quiz/{session_id}/timeout` | Trigger question timer expiration |
| `GET` | `/api/leaderboard` | Query top high scores with difficulty filter |
| `POST` | `/api/leaderboard` | Record custom score entry |

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
