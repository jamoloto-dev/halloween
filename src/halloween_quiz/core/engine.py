"""Quiz Engine managing question selection, session state, and scoring logic."""

import hashlib
import json
import random
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from halloween_quiz.core.models import (
    CATEGORY_METADATA,
    AnswerResult,
    Difficulty,
    GameMode,
    Question,
    QuestionView,
    QuizConfig,
)
from halloween_quiz.core.scoring import ScoringService


class QuestionBank:
    """Loads, validates, and queries trivia questions."""

    def __init__(self, questions_path: str | Path = "assets/questions.json"):
        self.questions_path = Path(questions_path)
        self.questions: list[Question] = []
        self._by_category: dict[str, list[Question]] = {}
        self.load()

    def load(self) -> None:
        """Load questions from file and validate with Pydantic."""
        if not self.questions_path.exists():
            self.questions = []
            self._by_category = {}
            return

        with open(self.questions_path, encoding="utf-8") as f:
            data = json.load(f)

        loaded: list[Question] = []
        idx = 1

        if isinstance(data, dict):
            # Category-keyed dict e.g. {"spooky": [...], "candy": [...]}
            for cat_key, items in data.items():
                for item in items:
                    q_id = item.get("id") or f"q_{cat_key}_{idx}"
                    q_difficulty = Difficulty.from_str(item.get("difficulty", "medium"))
                    question_obj = Question(
                        id=str(q_id),
                        category=cat_key,
                        difficulty=q_difficulty,
                        question=item["question"],
                        options=item["options"],
                        correct_answer=item["correct_answer"],
                        explanation=item.get("explanation"),
                    )
                    loaded.append(question_obj)
                    idx += 1
        elif isinstance(data, list):
            for item in data:
                q_id = item.get("id") or f"q_{idx}"
                q_difficulty = Difficulty.from_str(item.get("difficulty", "medium"))
                question_obj = Question(
                    id=str(q_id),
                    category=item.get("category", "spooky"),
                    difficulty=q_difficulty,
                    question=item["question"],
                    options=item["options"],
                    correct_answer=item["correct_answer"],
                    explanation=item.get("explanation"),
                )
                loaded.append(question_obj)
                idx += 1

        # Also load curated audio riddles
        try:
            from halloween_quiz.core.audio_riddles import get_all_audio_riddles

            for riddle in get_all_audio_riddles():
                r_obj = Question(
                    id=riddle.id,
                    category=riddle.category,
                    difficulty=riddle.difficulty,
                    question=riddle.question,
                    options=riddle.options,
                    correct_answer=riddle.correct_answer,
                    explanation=riddle.explanation,
                    question_type="audio_riddle",
                    audio_clip_id=riddle.audio_clip_id,
                    accessible_transcript=riddle.accessible_transcript,
                )
                loaded.append(r_obj)
        except Exception:
            pass

        # Also load additive premium trivia packs if present
        prem_path = Path("assets/premium_questions.json")
        if prem_path.exists():
            try:
                with open(prem_path, encoding="utf-8") as pf:
                    p_data = json.load(pf)
                if isinstance(p_data, dict):
                    for p_cat, p_items in p_data.items():
                        for p_item in p_items:
                            p_id = p_item.get("id") or f"prem_{p_cat}_{idx}"
                            p_diff = Difficulty.from_str(p_item.get("difficulty", "medium"))
                            p_obj = Question(
                                id=str(p_id),
                                category=p_cat,
                                difficulty=p_diff,
                                question=p_item["question"],
                                options=p_item["options"],
                                correct_answer=p_item["correct_answer"],
                                explanation=p_item.get("explanation"),
                            )
                            loaded.append(p_obj)
                            idx += 1
            except Exception:
                pass

        self.questions = loaded
        self._by_category = {}
        for q in self.questions:
            self._by_category.setdefault(q.category, []).append(q)

    @property
    def total_count(self) -> int:
        return len(self.questions)

    def get_categories(self, include_premium: bool = False) -> list[dict]:
        """Return available categories with count and metadata.
        By default preserves the 6 canonical categories for backward compatibility.
        """
        from halloween_quiz.core.entitlements import PREMIUM_TOPICS_METADATA

        cats = []
        for cat_key, items in self._by_category.items():
            meta = CATEGORY_METADATA.get(cat_key, None)
            is_premium = False
            badge = ""
            if not meta and cat_key in PREMIUM_TOPICS_METADATA:
                meta = PREMIUM_TOPICS_METADATA[cat_key]
                is_premium = True
                badge = meta.get("badge", "Pass Pack")
            elif not meta:
                meta = {"name": cat_key.capitalize(), "icon": "🎃", "description": ""}

            if is_premium and not include_premium:
                continue

            cats.append(
                {
                    "id": cat_key,
                    "name": meta["name"],
                    "icon": meta["icon"],
                    "description": meta["description"],
                    "question_count": len(items),
                    "is_premium": is_premium,
                    "badge": badge,
                    "required_entitlement": "spooky_pass" if is_premium else None,
                }
            )
        return cats

    def get_premium_topics(self) -> list[dict]:
        """Return additive premium trivia topics."""
        from halloween_quiz.core.entitlements import PREMIUM_TOPICS_METADATA

        packs = []
        for cat_key, meta in PREMIUM_TOPICS_METADATA.items():
            items = self._by_category.get(cat_key, [])
            packs.append(
                {
                    "id": cat_key,
                    "name": meta["name"],
                    "icon": meta["icon"],
                    "description": meta["description"],
                    "question_count": len(items),
                    "is_premium": True,
                    "badge": meta.get("badge", "Pass Pack"),
                    "required_entitlement": "spooky_pass",
                }
            )
        return packs

    def select_questions(
        self,
        categories: list[str] | None = None,
        difficulty: Difficulty | None = None,
        count: int = 10,
    ) -> list[Question]:
        """Select a randomized batch of questions matching criteria."""
        if not self.questions:
            return []

        selected_cats = categories if categories else list(self._by_category.keys())
        eligible: list[Question] = []

        for cat in selected_cats:
            cat_questions = self._by_category.get(cat, [])
            if difficulty:
                # Prefer exact difficulty match
                diff_matched = [q for q in cat_questions if q.difficulty == difficulty]
                if diff_matched:
                    eligible.extend(diff_matched)
                else:
                    eligible.extend(cat_questions)
            else:
                eligible.extend(cat_questions)

        if not eligible:
            eligible = list(self.questions)

        # Deduplicate while preserving candidates
        unique_eligible = list({q.id: q for q in eligible}.values())
        random.shuffle(unique_eligible)
        return unique_eligible[:count]

    def select_daily_questions(
        self, date_str: str | None = None, count: int = 10
    ) -> list[Question]:
        """Return a deterministic daily challenge question batch seeded by UTC date."""
        if not self.questions:
            return []
        if not date_str:
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Deterministic pseudo-random sequence based on date and salt
        seed_int = int(hashlib.sha256(f"halloween-daily-{date_str}-v2".encode()).hexdigest(), 16)
        rng = random.Random(seed_int)

        # Pick evenly across categories
        all_cats = sorted(self._by_category.keys())
        picked: list[Question] = []
        for cat in all_cats:
            cat_pool = list(self._by_category.get(cat, []))
            if cat_pool:
                rng.shuffle(cat_pool)
                picked.append(cat_pool[0])

        # Fill remaining spots from the overall pool deterministically
        remaining_pool = [q for q in self.questions if q.id not in {p.id for p in picked}]
        rng.shuffle(remaining_pool)
        picked.extend(remaining_pool)

        # Shuffle final sequence deterministically
        rng.shuffle(picked)
        return picked[:count]

    def select_stage_questions(self, stage_id: str) -> list[Question]:
        """Select questions for a campaign stage matching its categories, difficulty, and count."""
        from halloween_quiz.core.campaign import get_stage_by_id

        stage = get_stage_by_id(stage_id)
        if not stage:
            return self.select_questions(count=5)

        return self.select_questions(
            categories=stage.categories,
            difficulty=stage.difficulty,
            count=stage.question_count,
        )

    def select_duel_questions(
        self,
        seed: int,
        count: int = 5,
        difficulty: Difficulty | None = None,
    ) -> list[Question]:
        """Return a deterministic challenge batch seeded for both players in a duel."""
        if not self.questions:
            return []
        rng = random.Random(seed)
        eligible = [q for q in self.questions if (difficulty is None or q.difficulty == difficulty)]
        if len(eligible) < count:
            eligible = list(self.questions)
        pool = list(eligible)
        rng.shuffle(pool)
        return pool[:count]


class QuizSession:
    """State machine tracking an individual quiz playthrough."""

    DIFFICULTY_BASE_POINTS = {
        Difficulty.EASY: 100,
        Difficulty.MEDIUM: 200,
        Difficulty.HARD: 300,
    }

    DIFFICULTY_DEFAULT_TIMES = {
        Difficulty.EASY: 30,
        Difficulty.MEDIUM: 20,
        Difficulty.HARD: 15,
    }

    def __init__(self, config: QuizConfig, questions: list[Question]):
        self.session_id: str = str(uuid.uuid4())
        self.config: QuizConfig = config
        self.questions: list[Question] = questions
        self.current_index: int = 0
        self.score: int = 0
        self.streak: int = 0
        self.max_streak: int = 0
        self.correct_count: int = 0
        self.strikes: int = 0
        self.is_completed: bool = False
        self.started_at: datetime = datetime.now(timezone.utc)
        self.last_activity: datetime = datetime.now(timezone.utc)
        self.completed_at: datetime | None = None
        self.history: list[dict] = []
        self.unlocked_achievements: list[str] = []
        self._display_options: dict[str, list[str]] = {}
        self._question_presented_at: float = time.monotonic()
        self.multiplier: int = 1
        self.shield_active: bool = False
        self.active_trap: str | None = getattr(config, "active_trap", None)
        self.scoring: ScoringService = ScoringService()
        self.is_boosted: bool = False
        self.score_saved: bool = False

    @property
    def total_questions(self) -> int:
        return len(self.questions)

    @property
    def percentage(self) -> float:
        if self.total_questions == 0:
            return 0.0
        return round((self.correct_count / self.total_questions) * 100.0, 1)

    def get_current_question(self) -> Question | None:
        if self.is_completed or self.current_index >= len(self.questions):
            return None
        return self.questions[self.current_index]

    def get_current_question_view(self) -> QuestionView | None:
        q = self.get_current_question()
        if not q:
            return None

        # Record authoritative presentation timestamp
        self._question_presented_at = time.monotonic()
        self.last_activity = datetime.now(timezone.utc)

        meta = CATEGORY_METADATA.get(
            q.category, {"name": q.category.capitalize(), "icon": "🎃", "description": ""}
        )

        # In Panic mode, enforce high-pressure 10 second timer
        if getattr(self.config, "mode", None) == GameMode.PANIC:
            time_limit = 10
        else:
            time_limit = self.config.time_limit_per_question or self.DIFFICULTY_DEFAULT_TIMES.get(
                q.difficulty, 30
            )

        options = self._display_options.get(q.id)
        if options is None:
            options = list(q.options)
            random.shuffle(options)
            self._display_options[q.id] = options

        return QuestionView(
            id=q.id,
            index=self.current_index + 1,
            total_questions=self.total_questions,
            category=q.category,
            category_name=meta["name"],
            category_icon=meta["icon"],
            difficulty=q.difficulty,
            question=q.question,
            options=options,
            time_limit=time_limit,
            question_type=getattr(q, "question_type", "multiple_choice"),
            audio_clip_id=getattr(q, "audio_clip_id", None),
            accessible_transcript=getattr(q, "accessible_transcript", None),
            active_trap=self.active_trap,
        )

    def activate_booster(self, booster_type: str) -> dict:
        """Activate an in-game booster power-up on the current question."""
        q = self.get_current_question()
        if not q or self.is_completed:
            return {"success": False, "error": "No active question"}

        self.is_boosted = True

        if booster_type == "hint":
            display_opts = self._display_options.get(q.id, list(q.options))
            wrong = [
                o for o in display_opts if o.strip().lower() != q.correct_answer.strip().lower()
            ]
            eliminated = random.sample(wrong, min(2, len(wrong)))
            return {"success": True, "booster": "hint", "eliminated_options": eliminated}

        elif booster_type == "time_extension":
            self._question_presented_at += 10.0
            return {"success": True, "booster": "time_extension", "seconds_added": 10}

        elif booster_type == "double_points":
            self.multiplier = 2
            return {"success": True, "booster": "double_points", "multiplier": 2}

        elif booster_type == "shield":
            self.shield_active = True
            return {"success": True, "booster": "shield", "shield_active": True}

        return {"success": False, "error": f"Unknown booster: {booster_type}"}

    def _check_new_achievements(self, is_correct: bool, effective_time: float) -> str | None:
        """Evaluate deterministic conditions for newly unlocked achievements."""
        new_badge: str | None = None

        def award(badge_name: str):
            nonlocal new_badge
            if badge_name not in self.unlocked_achievements:
                self.unlocked_achievements.append(badge_name)
                if not new_badge:
                    new_badge = badge_name

        if self.streak >= 10:
            award("Possessed")
        elif self.streak >= 5:
            award("Night Stalker")
        elif self.streak >= 3:
            award("Ghost Hunter")

        if is_correct and effective_time <= 4.0:
            award("Speed Demon")

        if self.is_completed:
            if self.percentage >= 100.0:
                award("Perfect Séance")
            if self.config.difficulty == Difficulty.HARD and self.percentage >= 70.0:
                award("Hard Mode Survivor")

        return new_badge

    def submit_answer(self, answer: str, time_taken: float = 0.0) -> AnswerResult:
        """Process an answer submission using server-authoritative timing and scoring."""
        self.last_activity = datetime.now(timezone.utc)
        q = self.get_current_question()
        if not q:
            self.is_completed = True
            return AnswerResult(
                question_id="",
                selected_answer=answer,
                is_correct=False,
                correct_answer="",
                explanation=None,
                points_awarded=0,
                time_bonus=0,
                streak=self.streak,
                total_score=self.score,
                is_game_over=True,
                next_question=None,
                achievement_unlocked=None,
            )

        # Calculate server-authoritative elapsed time
        server_elapsed = max(
            0.1,
            round(time.monotonic() - getattr(self, "_question_presented_at", time.monotonic()), 2),
        )
        # Validate client time_taken: accept only if plausible, otherwise enforce server timing
        if 0.1 <= time_taken <= server_elapsed + 1.5:
            effective_time = time_taken
        else:
            effective_time = server_elapsed

        # Normalize answer
        selected = answer.strip()
        if selected.isdigit():
            idx = int(selected)
            display_options = self._display_options.get(q.id, q.options)
            if 0 <= idx < len(display_options):
                selected = display_options[idx]

        is_correct = selected.lower() == q.correct_answer.strip().lower()
        points = 0
        time_bonus = 0

        if getattr(self.config, "mode", None) == GameMode.PANIC:
            time_limit = 10
        else:
            time_limit = self.config.time_limit_per_question or self.DIFFICULTY_DEFAULT_TIMES.get(
                q.difficulty, 30
            )

        mode_val = getattr(self.config, "mode", GameMode.CLASSIC)
        is_competitive = mode_val in (GameMode.DAILY, GameMode.DUEL)

        score_res = self.scoring.calculate_question_score(
            difficulty=q.difficulty,
            is_correct=is_correct,
            current_streak=self.streak,
            client_time_taken=time_taken,
            server_elapsed=server_elapsed,
            time_limit=time_limit,
            mode=mode_val,
            booster_multiplier=self.multiplier,
            is_competitive=is_competitive,
        )

        effective_time = score_res.effective_time
        shield_absorbed = False
        applied_multiplier = score_res.applied_multiplier

        if is_correct:
            self.correct_count += 1
            self.streak = score_res.streak
            if self.streak > self.max_streak:
                self.max_streak = self.streak

            points = score_res.total_points
            time_bonus = score_res.time_bonus
            self.multiplier = 1  # Reset multiplier after consumption
            self.score += points
        else:
            self.streak = 0
            points = 0
            time_bonus = 0
            if self.shield_active:
                self.shield_active = False
                shield_absorbed = True
            else:
                if getattr(self.config, "mode", None) == GameMode.ENDLESS:
                    self.strikes += 1

        self.history.append(
            {
                "question_id": q.id,
                "question": q.question,
                "selected_answer": selected,
                "correct_answer": q.correct_answer,
                "is_correct": is_correct,
                "points": points,
                "time_bonus": time_bonus,
                "time_taken": effective_time,
                "shield_absorbed": shield_absorbed,
                "points_multiplier": applied_multiplier,
            }
        )

        self.current_index += 1

        # Check completion conditions (regular pool exhausted or 3 strikes in Endless mode)
        if getattr(self.config, "mode", None) == GameMode.ENDLESS and self.strikes >= 3:
            self.is_completed = True
            self.completed_at = datetime.now(timezone.utc)
        elif self.current_index >= len(self.questions):
            self.is_completed = True
            self.completed_at = datetime.now(timezone.utc)

        unlocked_badge = self._check_new_achievements(is_correct, effective_time)
        next_q = self.get_current_question_view()

        return AnswerResult(
            question_id=q.id,
            selected_answer=selected,
            is_correct=is_correct,
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            points_awarded=points,
            time_bonus=time_bonus,
            streak=self.streak,
            total_score=self.score,
            is_game_over=self.is_completed,
            next_question=next_q,
            achievement_unlocked=unlocked_badge,
            shield_absorbed=shield_absorbed,
            points_multiplier=applied_multiplier,
        )

    def timeout_current_question(self) -> AnswerResult:
        """Triggered when the question timer expires without an answer."""
        time_limit = (
            10
            if getattr(self.config, "mode", None) == GameMode.PANIC
            else float(self.config.time_limit_per_question or 20)
        )
        return self.submit_answer(
            answer="__TIMEOUT__",
            time_taken=time_limit,
        )

    def get_summary(self) -> dict:
        """Returns end-of-game summary report."""
        return {
            "session_id": self.session_id,
            "player_name": self.config.player_name,
            "difficulty": self.config.difficulty.value,
            "mode": getattr(self.config, "mode", GameMode.CLASSIC).value,
            "final_score": self.score,
            "correct_count": self.correct_count,
            "total_questions": self.total_questions,
            "percentage": self.percentage,
            "max_streak": self.max_streak,
            "strikes": self.strikes,
            "is_completed": self.is_completed,
            "achievements": self.unlocked_achievements,
            "history": self.history,
        }


class SessionManager:
    """Thread-safe session manager with TTL-based expiration and memory bounding."""

    def __init__(self, ttl_seconds: int = 3600, max_sessions: int = 1000):
        self.ttl_seconds = ttl_seconds
        self.max_sessions = max_sessions
        self._sessions: dict[str, QuizSession] = {}
        self._lock = threading.Lock()

    def get(self, session_id: str) -> QuizSession | None:
        """Retrieve a session by ID if it has not expired."""
        with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return None
            now = datetime.now(timezone.utc)
            delta = (now - session.last_activity).total_seconds()
            if delta > self.ttl_seconds:
                del self._sessions[session_id]
                return None
            session.last_activity = now
            return session

    def add(self, session: QuizSession) -> None:
        """Store a new session, pruning expired and least active sessions when over capacity."""
        with self._lock:
            self._prune_expired_locked()
            if len(self._sessions) >= self.max_sessions:
                oldest_id = min(
                    self._sessions.keys(),
                    key=lambda k: self._sessions[k].last_activity,
                )
                del self._sessions[oldest_id]
            self._sessions[session.session_id] = session

    def remove(self, session_id: str) -> bool:
        """Explicitly remove a session."""
        with self._lock:
            return self._sessions.pop(session_id, None) is not None

    def _prune_expired_locked(self) -> int:
        now = datetime.now(timezone.utc)
        expired = [
            sid
            for sid, s in self._sessions.items()
            if (now - s.last_activity).total_seconds() > self.ttl_seconds
        ]
        for sid in expired:
            del self._sessions[sid]
        return len(expired)

    def prune_expired(self) -> int:
        """Prune expired sessions."""
        with self._lock:
            return self._prune_expired_locked()

    def count(self) -> int:
        """Current number of stored active (unexpired) sessions."""
        with self._lock:
            self._prune_expired_locked()
            return len(self._sessions)

    def clear(self) -> None:
        """Clear all active sessions."""
        with self._lock:
            self._sessions.clear()

    # Dictionary-like compatibility methods
    def __getitem__(self, session_id: str) -> QuizSession:
        session = self.get(session_id)
        if session is None:
            raise KeyError(session_id)
        return session

    def __setitem__(self, session_id: str, session: QuizSession) -> None:
        self.add(session)

    def __contains__(self, session_id: str) -> bool:
        return self.get(session_id) is not None
