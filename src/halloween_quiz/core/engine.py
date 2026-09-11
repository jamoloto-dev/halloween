"""Quiz Engine managing question selection, session state, and scoring logic."""

import json
import random
import uuid
from datetime import datetime, timezone
from pathlib import Path

from halloween_quiz.core.models import (
    CATEGORY_METADATA,
    AnswerResult,
    Difficulty,
    Question,
    QuestionView,
    QuizConfig,
)


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

        self.questions = loaded
        self._by_category = {}
        for q in self.questions:
            self._by_category.setdefault(q.category, []).append(q)

    @property
    def total_count(self) -> int:
        return len(self.questions)

    def get_categories(self) -> list[dict]:
        """Return available categories with count and metadata."""
        cats = []
        for cat_key, items in self._by_category.items():
            meta = CATEGORY_METADATA.get(
                cat_key,
                {"name": cat_key.capitalize(), "icon": "🎃", "description": ""}
            )
            cats.append({
                "id": cat_key,
                "name": meta["name"],
                "icon": meta["icon"],
                "description": meta["description"],
                "question_count": len(items)
            })
        return cats

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
        self.is_completed: bool = False
        self.started_at: datetime = datetime.now(timezone.utc)
        self.completed_at: datetime | None = None
        self.history: list[dict] = []

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

        meta = CATEGORY_METADATA.get(
            q.category,
            {"name": q.category.capitalize(), "icon": "🎃", "description": ""}
        )

        time_limit = self.config.time_limit_per_question or self.DIFFICULTY_DEFAULT_TIMES.get(
            q.difficulty, 30
        )

        return QuestionView(
            id=q.id,
            index=self.current_index + 1,
            total_questions=self.total_questions,
            category=q.category,
            category_name=meta["name"],
            category_icon=meta["icon"],
            difficulty=q.difficulty,
            question=q.question,
            options=q.options,
            time_limit=time_limit,
        )

    def submit_answer(self, answer: str, time_taken: float = 0.0) -> AnswerResult:
        """Process an answer submission and update session state."""
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
            )

        # Normalize answer: handle integer index or exact text
        selected = answer.strip()
        if selected.isdigit():
            idx = int(selected)
            if 0 <= idx < len(q.options):
                selected = q.options[idx]

        is_correct = selected.lower() == q.correct_answer.strip().lower()
        points = 0
        time_bonus = 0

        time_limit = self.config.time_limit_per_question or self.DIFFICULTY_DEFAULT_TIMES.get(
            q.difficulty, 30
        )

        if is_correct:
            self.correct_count += 1
            self.streak += 1
            if self.streak > self.max_streak:
                self.max_streak = self.streak

            base_pts = self.DIFFICULTY_BASE_POINTS.get(q.difficulty, 100)

            # Streak multiplier: +10% per streak up to 1.5x
            streak_mult = min(1.5, 1.0 + (self.streak - 1) * 0.10)

            # Time bonus: if responded in under time limit
            time_remaining = max(0.0, time_limit - time_taken)
            if time_limit > 0 and time_remaining > 0:
                time_ratio = time_remaining / time_limit
                time_bonus = int(base_pts * time_ratio * 0.5)

            points = int(base_pts * streak_mult) + time_bonus
            self.score += points
        else:
            self.streak = 0

        self.history.append({
            "question_id": q.id,
            "question": q.question,
            "selected_answer": selected,
            "correct_answer": q.correct_answer,
            "is_correct": is_correct,
            "points": points,
            "time_bonus": time_bonus,
            "time_taken": time_taken,
        })

        self.current_index += 1
        if self.current_index >= len(self.questions):
            self.is_completed = True
            self.completed_at = datetime.now(timezone.utc)

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
        )

    def timeout_current_question(self) -> AnswerResult:
        """Triggered when the question timer expires without an answer."""
        return self.submit_answer(
            answer="__TIMEOUT__",
            time_taken=float(self.config.time_limit_per_question),
        )

    def get_summary(self) -> dict:
        """Returns end-of-game summary report."""
        return {
            "session_id": self.session_id,
            "player_name": self.config.player_name,
            "difficulty": self.config.difficulty.value,
            "final_score": self.score,
            "correct_count": self.correct_count,
            "total_questions": self.total_questions,
            "percentage": self.percentage,
            "max_streak": self.max_streak,
            "is_completed": self.is_completed,
            "history": self.history,
        }
