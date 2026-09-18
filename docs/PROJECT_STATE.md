# Spooky Master Project State

Last Updated: 2026-09-18

Branch: `main`

Commit: `4d08a16c619f71656ea6e920da64d4fd4f0ae7b2` (`fix(ci): gracefully skip playwright e2e tests when playwright or live server is not present`)

Remote Status: `main` is exactly `origin/main` at the commit above, with no commits ahead of `origin/main`.  The pre-audit working tree had no uncommitted or untracked work; this tracker is the sole audit-created untracked file until committed.  Local branch `feat/production-game-expansion` points to ancestor `da09375`; it is already included in `main`.  No local or remote branch named `halloween` exists.

Canonical runtime: `run.py` imports `halloween_quiz.web.app:app`; it starts the FastAPI/uvicorn app (or the Rich CLI with `--cli`).  Dockerfile and Procfile also start `uvicorn run:app`.  The standalone `pwa/`, Streamlit files, and legacy `assets/static/` remain tracked but are not the canonical deployment target; FastAPI exposes the old PWA at `/pwa`.

Version: FastAPI and package metadata are `2.0.0`.  `CHANGELOG.md` claims 2.3.0 and README claims 2.1.0, so version documentation is inconsistent and must not be used as release evidence.

## Stable Foundation

- FastAPI SPA application under `src/halloween_quiz/web/`, domain logic under `core/`, Rich CLI under `cli/`.
- SQLite WAL score repository, optional `DATABASE_URL` path, six canonical question categories, 113 loaded questions (including five audio-riddle records).
- Server-side quiz session state, authoritative elapsed-time calculation, bounded session manager, rate limiter, PWA assets, and Docker/Procfile configuration.

## Implemented & Verified

- Core models, engine, question loading, storage migrations, SQLite leaderboard repository, CLI, deterministic daily selection, session limits, server-time scoring, panic/endless mechanics, audio-riddle model data, duel tiebreaker function, and adaptive tracker algorithm: 25 direct tests passed in this audit.
- All six category identifiers and display names remain: Spooky Stories, Costumes & Traditions, Horror Movies, Halloween History, Candy & Treats, and Paranormal Lore (`core/models.py`).
- Ruff and Mypy currently pass.

## Implemented but Needs Verification

- Browser SPA quiz flow, feedback, replay, category cards, onboarding, settings persistence, audio playback/ducking, accessibility behavior, responsive layouts, canonical PWA installation/offline behavior, campaign UI, shop UI, and duel UI all have code and E2E coverage, but browser tests could not launch in this sandbox.
- HTTP route tests could not run here because FastAPI `TestClient` hangs before context startup in this sandbox; the same happens with a minimal one-route FastAPI app, so this is not evidence of an application defect.  Re-run in normal CI/local infrastructure.
- Docker build is unverified because the local Docker daemon is unavailable.

## Partially Implemented

- The Haunted Journey has six chapters and 24 static stages, narrative UI, and local stage/star/reward persistence.  It is client-local rather than server-persisted or authenticated.
- Diamonds, booster inventory, cosmetic unlocks, and ledger are stored in `spooky_player_profile` in browser localStorage.  There is no server wallet or transaction ledger.
- Haunted Duels have server routes and an in-memory 48-hour registry, but the client submits result score, accuracy, and a fixed `time_taken_seconds: 25.0`; results are not bound to an authoritative quiz session or durable storage.
- Adaptive difficulty is an isolated `AdaptivePerformanceTracker`; no engine, route, or frontend flow constructs or uses it.
- Daily Haunt question selection is deterministic, but Community Haunt data is not durable or trustworthy; see Known Bugs.

## Planned / Not Started

- Secure account login, cross-device sync, and server-side player profiles.
- Durable server-side economy and inventory.
- Durable, session-authoritative competitive duels.
- Production-grade adaptive difficulty integration for permitted casual/campaign modes.

## Known Bugs

- `core/community.py` initializes every new UTC day with fabricated participant, completion, score, and goal values (124/86/268400/1380).  These are displayed through `/api/community`; they are not measured community data.  This violates the no-fabricated-community-numbers requirement.
- Community data and duel data are process-memory only and reset on restart or do not work across multiple workers/instances.
- `CHANGELOG.md`, `README.md`, and package/runtime version values disagree.

## Technical Debt

- Three application generations remain tracked: canonical FastAPI SPA, standalone PWA, and Streamlit/legacy static implementations.  They have different deployment documentation.
- E2E tests require a separately started server at `localhost:5000`; browser fixture creation occurs before its server-reachability skip can help when Chromium cannot launch.
- Documentation still contains obsolete Flask/Streamlit/Netlify deployment instructions and release claims.

## Security Concerns

- `POST /api/leaderboard` accepts arbitrary scores unless production has a non-empty `ADMIN_API_KEY`; it is not session-authoritative as claimed by the changelog.
- Duel endpoints accept client-supplied results and do not bind a result to the created quiz session; they are not anti-cheat safe.
- Community reward claiming has no server-side player identity or durable idempotency.
- Rate limiting, input/CSV sanitization, session TTL/capacity, SQLite WAL, CORS configuration, and `/health`, `/live`, `/ready` routes exist.  No security-header middleware was found (for example CSP, X-Content-Type-Options, frame policy), and development defaults to wildcard CORS with credentials enabled.

## Deployment Status

- Deployment target configuration points to FastAPI: Dockerfile, Procfile, docker-compose, and `deploy/render.yaml` (`main`).
- Docker build: not verified on 2026-09-18; Docker daemon was not running (`Cannot connect to the Docker daemon`).
- No live deployment URL or deployment health was verified in this audit.

## Latest Test Results

| Command | Result |
| --- | --- |
| `ruff check .` | PASS — no findings |
| `mypy src` | PASS — no issues; two informational unchecked-body notes in legacy `src/game.py` |
| `pytest -v` | INCOMPLETE — 57 collected; stalled at first FastAPI `TestClient` test in sandbox |
| Direct unit/storage/CLI tests | PASS — 17 passed in 0.45s |
| Direct production/campaign algorithm tests | PASS — 8 passed in 2.83s; 1 dependency deprecation warning |
| `pytest tests/test_browser_e2e.py -v` | NOT VERIFIED — 19 setup errors because sandbox Chromium exits with `sandbox_host_linux.cc:41 ... Operation not permitted` |
| `pytest --cov=halloween_quiz --cov-report=term-missing` | NOT RUN TO COMPLETION — blocked by the same TestClient environment issue |
| FastAPI startup | PASS — Uvicorn initialized 113 questions, database, and session manager; this sandbox then denied loopback access to its `127.0.0.1:5001` probes |
| `docker build -t spooky-master-audit .` | NOT VERIFIED — Docker daemon unavailable |

## Feature Status Matrix

| Feature | Status | Evidence | Next Action |
| --- | --- | --- | --- |
| Core Quiz | 🟡 PARTIALLY IMPLEMENTED | `core/engine.py`; 4 engine tests pass; API/browser flow unverified here | Re-run API/E2E outside sandbox |
| Categories | 🟡 PARTIALLY IMPLEMENTED | `Category`, fallback data, `loadCategories`, `setAllCategories`; six canonical names present | Browser-verify selection/guard |
| Game Modes | 🟡 PARTIALLY IMPLEMENTED | `GameMode`, `routes.py:start_quiz`; panic/endless direct test passes | Exercise all six through API/browser |
| Audio | 🔵 CODE EXISTS BUT NOT VERIFIED | `SoundEngine`, audio assets, Settings controls, ducking methods | Browser/audio-device verification |
| Player Profile | 🔵 CODE EXISTS BUT NOT VERIFIED | `spooky_player_profile`, onboarding/avatar code in `app.js` | Browser persistence verification |
| Mastery & Achievements | 🔵 CODE EXISTS BUT NOT VERIFIED | local profile progress and dashboard rendering in `app.js` | Browser persistence verification |
| Settings & Accessibility | 🔵 CODE EXISTS BUT NOT VERIFIED | settings modal, reduced motion, vibration, focus CSS | Browser/accessibility verification |
| PWA | 🔵 CODE EXISTS BUT NOT VERIFIED | `manifest.json`, `sw.js`, `offline.html`, registration code | Install/offline test in browser |
| Campaign / Chapter Map / Stories | 🟡 PARTIALLY IMPLEMENTED | `campaign.py`, campaign routes and modal; local-only progress | Decide/persist authoritative progression |
| Diamonds / Shop / Boosters / Cosmetics | 🟡 PARTIALLY IMPLEMENTED | local wallet/ledger/shop and in-session boosters | Establish durable trusted economy |
| Daily Haunt | 🟡 PARTIALLY IMPLEMENTED | deterministic question selector direct test passes | API/browser verification |
| Community Haunt | 🔴 BROKEN | `CommunityRegistry` hard-codes made-up metrics and is memory-only | Replace fabricated baseline with persisted actual metrics |
| Haunted Duels | 🟡 PARTIALLY IMPLEMENTED | server registry/routes/traps/tiebreaker; direct tiebreaker test passes | Bind results to durable authoritative sessions |
| Audio Riddles | 🟡 PARTIALLY IMPLEMENTED | question-type fields, five riddle definitions, UI transcript/player; direct data test passes | Browser playback/accessibility verification |
| Adaptive Difficulty | 🟡 PARTIALLY IMPLEMENTED | `adaptive.py` test passes; no call sites outside module/tests | Integrate only in allowed modes |
| Security | 🟡 PARTIALLY IMPLEMENTED | timing, rate limit, TTL, sanitization, probes; public score/duel gaps | Close identified integrity gaps |
| Deployment | 🔵 CODE EXISTS BUT NOT VERIFIED | `Dockerfile`, `Procfile`, Render config | Build and deploy after daemon/CI available |

## Current Development Phase

Feature-expansion code from `da09375` is integrated into `main`, followed by `4d08a16` to soften unavailable-Playwright behavior.  The project is at production-integrity and verification, not at a clean, independently verified release.  The last claimed 57/57 green result is not reproducible in this audit environment.

## Exact Next Task

Replace the Community Haunt fabricated daily baseline with zero-initialized, durable, server-recorded metrics (and only display measured values).  Add focused tests for rotation, persistence, and reward idempotency.  Do not build further game features before this integrity defect is resolved.

## Do Not Break

- The six canonical categories and their identifiers/display names.
- Quiz start, question retrieval, answer/timeout flow, score persistence, completion, and replay.
- Category fallback, Select All, Clear, and zero-category guard.
- Audio settings, sound fallback, ambience ducking, and local preference persistence.
- Keyboard shortcuts, visible focus states, responsive mobile support, and reduced-motion/vibration controls.
- Existing local player profile, mastery, achievements, best score/streak, and avatar/nickname data.
