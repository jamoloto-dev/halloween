# 🎃 Halloween Quiz Game 2.0

[![CI Pipeline](https://github.com/jafta1083/halloween/actions/workflows/ci.yml/badge.svg)](https://github.com/jafta1083/halloween/actions/workflows/ci.yml)
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

### 🌟 Key Enhancements in Version 2.0
1. **Zero Deployment Mismatch**: Container deployments cleanly execute `uvicorn run:app` or `gunicorn run:app` without boot crashes.
2. **Pure Client-Side Audio**: All server-side audio dependencies (`vlc`, `paplay`) have been eliminated. Sound effects are synthesized and played in the player's browser with volume controls, mute state saved to `localStorage`, and Web Audio procedural fallbacks.
3. **Smooth Countdown Timer**: Zero full-page reloads. High-frequency JavaScript timers provide color-shifting progress bars (Green ➔ Orange ➔ Red) and sound warnings.
4. **Curated 100+ Question Bank**: 108 trivia questions across 6 spooky categories:
   - 👻 **Spooky Stories**: Urban legends, haunted folklore, and ghost ships.
   - 🎭 **Costumes & Traditions**: Guising, soul cakes, Samhain origins.
   - 🎬 **Horror Movies**: Slasher icons, cult classics, iconic quotes.
   - 📜 **Halloween History**: Celtic rituals, Jack-o'-lantern turnip lore, Salem history.
   - 🍬 **Candy & Treats**: Candy Corn history, trick-or-treat stats, vintage sweets.
   - 🔮 **Paranormal Lore**: Cryptids, EVP, EMF equipment, parapsychology.
5. **Thread-Safe SQLite Leaderboard**: High scores are recorded with WAL mode enabled. Legacy `high_scores.csv` entries are migrated automatically without data loss.
6. **Cross-Platform Rich CLI**: Terminal game built with `rich` and `click`, utilizing non-blocking threads that run seamlessly on Windows, macOS, and Linux without Unix `SIGALRM`.

---

## 🚀 Quick Start

### 1. Local Setup (Virtual Environment)

```bash
# Clone repository
git clone https://github.com/jafta1083/halloween.git
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
