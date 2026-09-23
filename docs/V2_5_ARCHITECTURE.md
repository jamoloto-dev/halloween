# Spooky Master v2.5 — Architecture & Foundation Reference

**Milestone**: Spooky Master v2.5 — Content Scale, Frontend Modularization & Replayability  
**Status**: Implemented & Verified  
**Runtime**: Python 3.12 (FastAPI), Vanilla JavaScript (ES Modules), SQLite (WAL), PWA Offline Shell

---

## 1. Executive Summary

Spooky Master v2.5 transitions the codebase from a single-file frontend monolith into an extensible, modular architecture while scaling gameplay content to over 330 validated trivia questions across 6 canonical categories.

Key accomplishments in this milestone:
1. **Trivia Scale & Cultural Diversity**: Expanded canonical trivia bank to 336 high-quality questions with balanced Easy, Medium, and Hard distributions, incorporating global folklore traditions (Samhain, Celtic, Día de los Muertos, Japanese Yōkai, Slavic, Caribbean, African, and Latin American folklore) respectfully and factually.
2. **Automated Content Validation Tooling**: Created regression-safe integrity testing suite (`tests/test_question_bank_integrity.py`) enforcing unique IDs, 4 distinct options, valid category bindings, balanced difficulties, and non-empty explanations.
3. **Multimedia Question Architecture**: Optional schema extensions (`media_type`, `media_url`, `media_alt`, `media_caption`) supporting SVG silhouette identification and 12 procedural audio riddles with accessible screen-reader transcripts.
4. **Incremental Frontend Modularization**: Refactored the 4,750+ line `app.js` into clean, single-responsibility ES modules under `static/js/modules/` coordinated by `main.js` and bootstrapped transparently by `app.js`.
5. **Zero Pay-to-Win and Security Integrity**: Strictly preserved server-side AI proxying, client-side secret immunity (zero client API keys), and competitive fairness across Daily Haunts and Haunted Duels.

---

## 2. Frontend Modularization Architecture

The frontend is structured into modular ES modules while preserving exact backwards compatibility:

```
src/halloween_quiz/web/static/
├── app.js                         # 45-line entrypoint & backwards-compatibility harness
├── js/
│   ├── main.js                    # Main Application coordinator (HalloweenQuizApp)
│   └── modules/
│       ├── audio.js               # SoundEngine: procedural Web Audio, sample cache, ducking
│       ├── campaign.js            # CampaignManager: Journey, chapters, stages, lore modal
│       ├── quiz.js                # QuizLifecycleManager: session loop, multimedia, timer HUD
│       ├── hints.js               # HintsManager: Spooky Guide, 3-level progressive clues
│       ├── hunter-studio.js       # HunterStudioManager: vector SVG avatar generation & studio
│       ├── profile.js             # ProfileManager: local storage, stats, badges, mastery
│       ├── leaderboard.js         # LeaderboardManager: all-time, daily, and personal bests
│       ├── duels.js               # DuelsManager: challenge codes, spooky traps, asynchronous PvP
│       ├── settings.js            # SettingsManager: theme selection, audio sliders, haptics
│       ├── pwa.js                 # PwaManager: service worker precache & install prompts
│       └── utils.js               # Shared helpers: haptics, story vignettes, share links, Confetti
```

### Module State Management
- **Single Source of Truth**: `HalloweenQuizApp` in `main.js` instantiates canonical managers and acts as the central event hub.
- **No Duplicate State**: Subsystem managers receive the parent application instance via their constructor (`this.app`), sharing profile data, audio engine, active sessions, and DOM registries without duplicating storage or listeners.

---

## 3. Multimedia Question Architecture

Questions optionally support visual silhouettes and audio clues without breaking standard text questions.

### Schema Fields
- `media_type`: `"none"` | `"image"` | `"audio"` (defaults to `"none"`)
- `media_url`: Optional relative URL string (e.g. `"/static/images/trivia/silhouette_haunted_mansion.svg"`)
- `media_alt`: Accessible text description for screen readers and high-contrast players
- `media_caption`: Optional display caption under illustration

### Procedural Audio Riddles
Audio riddle questions map to procedural Web Audio synthesis cues in `audio_riddles.py`:
- `werewolf_howl`: Rising pitch into guttural midnight growl
- `ghost_wail`: Wailing airy harmonic whistle
- `crypt_door`: Slow creaking rusted iron hinges and stone scrape
- `witch_cackle`: Staccato multi-octave laugh with bubbling cauldron
- `bat_swarm`: Ultrasonic echolocation chirps and leathery flutter
- `church_bell`: Deep bronze cathedral bell toll
- `thunder`: Rolling low-frequency rumble
- `chains`: Dragging iron links on stone
- `crow`: Raspy double-throat avian warning
- `heartbeat`: Rhythmic low-frequency lub-dub pulse
- `wind`: Resonant whistling autumn gale
- `organ_sting`: Dramatic dissonant minor pipe organ chord

All audio questions require `accessible_transcript` metadata to ensure hearing-impaired or muted players enjoy identical learning value.

---

## 4. Live Duels — Future WebSocket Architecture

Currently, Haunted Duels operate asynchronously via deterministic challenge codes and seeded question banks. The future real-time live duel architecture is designed as follows:

### Protocol & Endpoint
- **WebSocket Route**: `/ws/duel/{room_code}`
- **Authentication**: Ephemeral player ticket issued by server on room join.

### Room State Machine
```
[WAITING] ──> [READY] ──> [COUNTDOWN] ──> [QUESTION] ──> [ANSWER_LOCKED] ──> [ROUND_RESULT]
    │                                           ▲                                    │
    │                                           └────────── (Next Round) ────────────┘
    ▼
[MATCH_COMPLETE]
```

1. **WAITING**: Room host awaits challenger connection.
2. **READY**: Both players connected, synchronize clock offsets via ping/pong.
3. **COUNTDOWN**: 3-second synchronized visual countdown.
4. **QUESTION**: Authoritative question payload dispatched with synchronized epoch timestamp.
5. **ANSWER_LOCKED**: Player selection received; answer locked until timer expires or both submit.
6. **ROUND_RESULT**: Point delta, speed bonus, and trap activations revealed.
7. **MATCH_COMPLETE**: Match summary, Elo/rating update, and diamond rewards.

### Real-Time Trap Fairness Standards
To prevent unfairness or accessibility regressions:
- Traps must **never** make question text unreadable or hide answer buttons completely.
- Traps must **never** trigger rapid flashing (<3 Hz safe guidelines) to prevent seizure risks.
- Reduced Motion preference (`prefers-reduced-motion`) must substitute visual distortions with subtle static borders or audio cues.
- Minimum answer target touch target size (48x48px) and keyboard shortcuts (1–4 / A–D) must remain functional under all active traps.

### Shareable Challenge Links
- Format: `https://<domain>/duel/{challenge_code}`
- **Privacy Assurance**: The URL and share payload contain only the 6-character alphanumeric challenge code. Player emails, internal UUIDs, or authentication tokens are strictly prohibited from duel URLs.

---

## 5. Procedural Story Foundation

Personalized campaign storytelling is implemented via a template-driven engine in `js/modules/utils.js` (`generateProceduralStory`):

### Context Inputs
- `chapterTitle`: Name of current chapter (e.g. "The Abandoned Manor")
- `stageName`: Name of current stage (e.g. "The Cold Library")
- `stars`: Stars earned in the round (0–3)
- `accuracy`: Accuracy percentage (0–100%)
- `streak`: Maximum answer streak achieved
- `isBoss`: Whether this was a boss challenge stage

### Example Generated Narrative
> *"You escaped The Cold Library with two stars intact, and distant whispering phantoms linger just beyond the candlelight, watching your advance. Something ancient within Blackwood Manor has noticed your uncanny momentum."*

### Future External AI Integration
When server-side AI generation is enabled:
1. The client invokes `POST /api/campaign/vignette` with round performance metrics.
2. The server constructs a sandboxed atmospheric prompt with strict length and safety guards.
3. If the server is offline or times out (>2.0s), the client deterministically falls back to `generateProceduralStory()`.

---

## 6. Local Browser AI Evaluation (Future Foundation)

### Design Guidelines for WebLLM / Transformers.js
If local in-browser LLMs are evaluated in a future milestone:
1. **Explicit Opt-in**: Never automatically download models on page load. Download requires explicit user action in Settings.
2. **Transparency**: Display exact model download size (e.g., "Gemma-2B: 1.4 GB") before initiating transfer.
3. **Download Progress**: Present standard progress bar and cancel button.
4. **Storage & Deletion**: Store weights in Cache API / OPFS with a "Delete Model & Free Storage" button in Settings.
5. **Zero-Gameplay Blocking**: Core quiz gameplay, timer, scoring, and sound must continue uninterrupted regardless of local AI status.

---

## 7. Hunter Cosmetic Gear Foundation

To deepen player expression without compromising competitive integrity:
- **Gear Slots**: Defined in `COSMETIC_GEAR_SLOTS`:
  1. `head` (Headpiece)
  2. `cape` (Cloak & Cape)
  3. `companion` (Familiar Companion)
  4. `lantern` (Spectral Lantern)
  5. `spellbook` (Ancient Grimoire)
  6. `aura` (Mystic Aura)
- **Zero Stat Power (Policy A)**: Gear possesses zero point multipliers, zero timer extensions, and zero competitive advantages.
- **Unlock Mechanics**: Unlocked exclusively through Campaign star milestones, achievement badges, seasonal events, or cosmetic Pass unlocks.

---

## 8. Database Migration Roadmap (Alembic)

### Current Architecture
- SQLite with Write-Ahead Logging (`PRAGMA journal_mode=WAL`)
- In-code schema bootstrapping in `ScoreRepository._init_tables()` (`scores`, `player_skills`, `entitlements`, `generated_avatars`)
- Automatic legacy CSV migration (`high_scores.csv` -> `scores`)

### Migration Strategy to Alembic
1. **Alembic Baseline Initialization**:
   - Run `alembic init -t async migrations` (or standard synchronous engine matching SQLite).
   - Configure `env.py` to point to `halloween_quiz.core.models.Base`.
   - Generate initial migration revision stamping the current production schema as `001_baseline`.
2. **Versioned Revisions**:
   - `002_add_hunter_cosmetics_table`: Store unlocked cosmetic gear slots per player.
   - `003_add_live_duel_history`: Record multiplayer duel match outcomes.
3. **Data Safety Assurance**:
   - Perform automated `sqlite3` backup before executing migrations:
     `shutil.copyfile("halloween.db", f"halloween.db.backup.{timestamp}")`
   - Test migrations in CI against populated production databases to guarantee zero data loss for scores, skill profiles, and entitlements.

---

## 9. Performance & PWA Verification

- **Asset Compression**: SVG vector avatars and silhouettes (<5 KB each) eliminate heavy bitmap bandwidth.
- **Cache Invalidation**: Service Worker cache key versioned (`spooky-master-v2.3.0`) with explicit precache list covering all 12 ES modules.
- **Responsive Viewports**: Verified without horizontal overflow across 360px, 390px, 768px, 1366px, and 1920px viewports.
- **Console Integrity**: Verified 0 unhandled promise rejections, 0 syntax errors, and 0 missing module 404s.
