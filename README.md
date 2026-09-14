# 🎃 Halloween Quiz Game 2.0

[![CI Pipeline](https://github.com/jamoloto-dev/halloween/actions/workflows/ci.yml/badge.svg)](https://github.com/jamoloto-dev/halloween/actions/workflows/ci.yml)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An enterprise-grade, spooky trivia experience with an asynchronous **FastAPI REST backend**, modern **responsive HTML5/JS SPA frontend** featuring pure client-side **Web Audio API sound synthesizers**, a **cross-platform Rich CLI**, and thread-safe **SQLite WAL persistence**.

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
│   │   └── storage.py         # Thread-safe SQLite repository (WAL mode, migration)
│   ├── cli/                   # Cross-platform rich terminal experience
│   │   └── main.py            # Rich tables, colored panels, non-blocking timer
│   └── web/                   # Production Web Backend & Frontend
│       ├── app.py             # FastAPI app factory, CORS, static mounting
│       ├── routes.py          # REST endpoints (/health, /api/quiz/*, /api/leaderboard)
│       ├── static/            # Pure client-side Web Audio & CSS3 animations
│       └── templates/         # Clean HTML5 SPA frontend
├── assets/
│   ├── questions.json         # 108 curated, schema-validated questions across 6 categories
│   └── sounds/                # Audio assets (MP3 fallbacks + Web Audio synthesizer)
├── pwa/                       # Progressive Web App (Service Worker, offline cache)
├── tests/                     # 20+ automated unit & integration tests
├── Dockerfile                 # Multi-stage non-root container build
├── docker-compose.yml         # Containerized production & local dev setup
└── pyproject.toml             # Modern packaging (Ruff, Mypy, Pytest)
```

### 🌟 Key Features in Version 2.1.0
1. **Six Engaging Game Modes**:
   - 🎃 **Classic**: Standard 10-question balanced spooky challenge.
   - ⚡ **Quick Bite**: Fast-paced 5-question round for casual play.
   - 📖 **Deep Dive**: 15-question marathon trivia exploration.
   - ⏳ **Midnight Panic**: High-intensity 10-second timer per question with boosted speed multipliers.
   - 💀 **Endless Night**: Survival mode with a 3-lives HUD (strikes indicator); survive as long as you can.
   - 🕯️ **Daily Haunt**: Deterministic UTC-seeded daily challenge identical for all players globally, resetting at midnight UTC.
2. **Category Mastery & Tier Progression**: Real-time accuracy tracking and tier ranks across all 6 categories (*Lost Soul*, *Curious Ghost*, *Crypt Explorer*, *Spirit Hunter*, *Nightmare Expert*, *Master of the Crypt*).
3. **Badges & Achievements**: Deterministic badge conditions with animated toast notifications (*Ghost Hunter*, *Night Stalker*, *Possessed*, *Speed Demon*, *Perfect Séance*, *Hard Mode Survivor*, *Endless Slayer*, *Daily Haunt Victor*).
4. **Anti-Cheat Authoritative Server Timing**: Monotonic server timestamps prevent client speed exploits; sliding-window rate limiting prevents brute-force abuse.
5. **Pure Client-Side Web Audio API**: Procedural tone synthesizers (`correct`, `incorrect`, `tick`, `ui`, `fanfare`) with custom volume controls and mute toggles.
6. **Accessible Settings & Social Sharing**: Settings modal with volume sliders, Haptic feedback toggle, and Reduced Motion toggle (`prefers-reduced-motion` override); Web Share API survival card generator.
7. **PWA & Offline Reliability**: Root Service Worker (`/sw.js`), Web App Manifest (`/manifest.json`), offline fallback page (`/offline.html`), and standalone installation prompt.
8. **Curated 100+ Question Bank**: 108 trivia questions across 6 categories (*Spooky Stories*, *Costumes & Traditions*, *Horror Movies*, *Halloween History*, *Candy & Treats*, *Paranormal Lore*).
9. **Production DevOps Probes**: Kubernetes-compatible `/live`, `/ready`, and `/health` endpoints with SQLite WAL and PostgreSQL support.

---

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
Open **http://localhost:5000** in your browser to play!

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
Access the application at `http://localhost:5000`. High scores persist in `./data`.

### Production Docker Build
```bash
docker build -t halloween-quiz:latest .
docker run -p 5000:5000 -e PORT=5000 halloween-quiz:latest
```

---

## 🧪 Testing & Code Quality

Run the complete test suite:
```bash
# Run unit and integration tests with coverage
pytest --cov=halloween_quiz

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
