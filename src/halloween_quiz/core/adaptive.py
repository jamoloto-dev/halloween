"""Dynamic Adaptive Difficulty: Performance modeling, category mastery, and learning zone calibration.

Evaluates rolling performance windows, category-specific mastery, answer streaks,
response speeds, timeout frequencies, and scaffolding needs while strictly preserving
competitive fairness in ranked modes (Daily Haunt, Haunted Duels).
"""

from collections import deque
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from halloween_quiz.core.models import (
    CATEGORY_METADATA,
    Category,
    Difficulty,
    GameMode,
)


class AdaptiveScaffolding(BaseModel):
    """Pedagogical scaffolding recommended when a player encounters friction."""

    needed: bool = False
    scaffolding_type: str = "none"  # "smart_hint" | "category_explanation" | "easier_question" | "refresher"
    category: str = "spooky"
    category_name: str = "Spooky Stories"
    guidance: str = ""
    reason: str = ""


class AdaptiveDecision(BaseModel):
    """Explainable difficulty adjustment decision with human-readable rationale."""

    previous_difficulty: Difficulty
    new_difficulty: Difficulty
    level_changed: bool
    direction: str  # "up" | "down" | "stay"
    reason: str
    feedback_message: str | None = None
    scaffolding: AdaptiveScaffolding | None = None


class PlayerSkillProfile(BaseModel):
    """Persistent, multi-dimensional skill model capturing category-specific mastery."""

    player_id: str = Field(default="guest_default", max_length=128)
    overall_rating: float = Field(default=50.0, ge=0.0, le=100.0)
    category_ratings: dict[str, float] = Field(
        default_factory=lambda: {c.value: 50.0 for c in Category}
    )
    recent_accuracy: float = Field(default=0.0, ge=0.0, le=1.0)
    recent_response_time: float = Field(default=0.0, ge=0.0)
    current_streak: int = Field(default=0, ge=0)
    questions_answered: int = Field(default=0, ge=0)
    hints_used: int = Field(default=0, ge=0)
    timeouts: int = Field(default=0, ge=0)
    difficulty_history: list[str] = Field(default_factory=list)
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def get_strongest_category(self) -> dict:
        """Return the player's highest rated category and metadata."""
        if not self.category_ratings:
            return {"category": "spooky", "name": "Spooky Stories", "rating": 50.0, "icon": "👻"}
        best_cat = max(self.category_ratings.keys(), key=lambda c: self.category_ratings[c])
        meta = CATEGORY_METADATA.get(best_cat, {"name": best_cat.title(), "icon": "🎃"})
        return {
            "category": best_cat,
            "name": meta["name"],
            "rating": round(self.category_ratings[best_cat], 1),
            "icon": meta["icon"],
        }

    def get_weakest_category(self) -> dict:
        """Return the category where the player struggles most."""
        if not self.category_ratings:
            return {"category": "spooky", "name": "Spooky Stories", "rating": 50.0, "icon": "👻"}
        weakest_cat = min(self.category_ratings.keys(), key=lambda c: self.category_ratings[c])
        meta = CATEGORY_METADATA.get(weakest_cat, {"name": weakest_cat.title(), "icon": "🎃"})
        return {
            "category": weakest_cat,
            "name": meta["name"],
            "rating": round(self.category_ratings[weakest_cat], 1),
            "icon": meta["icon"],
        }

    def to_dashboard_insights(self) -> dict:
        """Format player performance metrics for the AI Learning Dashboard."""
        strongest = self.get_strongest_category()
        weakest = self.get_weakest_category()

        # Determine current recommended challenge level
        if self.overall_rating >= 72.0:
            challenge_level = "Hard"
        elif self.overall_rating >= 45.0:
            challenge_level = "Medium"
        else:
            challenge_level = "Easy"

        # Calculate category breakdown with metadata
        breakdown = []
        for cat_val in [c.value for c in Category]:
            rating = round(self.category_ratings.get(cat_val, 50.0), 1)
            meta = CATEGORY_METADATA.get(cat_val, {"name": cat_val.title(), "icon": "🎃"})
            breakdown.append(
                {
                    "category": cat_val,
                    "name": meta["name"],
                    "icon": meta["icon"],
                    "rating": rating,
                }
            )

        return {
            "player_id": self.player_id,
            "overall_rating": round(self.overall_rating, 1),
            "challenge_level": challenge_level,
            "strongest_category": strongest,
            "needs_practice_category": weakest,
            "questions_answered": self.questions_answered,
            "recent_accuracy_pct": round(self.recent_accuracy * 100, 1),
            "hints_used": self.hints_used,
            "timeouts": self.timeouts,
            "category_breakdown": breakdown,
        }


class AdaptivePerformanceTracker:
    """Tracks a rolling window of recent question responses to adapt difficulty.

    Strictly disabled in competitive/standardized modes:
    - Daily Haunt (GameMode.DAILY)
    - Haunted Duels (GameMode.DUEL)
    - Global Ranked Leaderboards
    """

    def __init__(
        self,
        window_size: int = 4,
        mode: GameMode = GameMode.CLASSIC,
        player_id: str = "guest_default",
    ) -> None:
        self.window_size = window_size
        self.mode = mode
        self.player_id = player_id
        self.history: deque[dict] = deque(maxlen=window_size)
        self.category_histories: dict[str, deque[dict]] = {
            c.value: deque(maxlen=window_size) for c in Category
        }
        self.current_difficulty: Difficulty = Difficulty.MEDIUM
        self.last_decision: AdaptiveDecision = AdaptiveDecision(
            previous_difficulty=Difficulty.MEDIUM,
            new_difficulty=Difficulty.MEDIUM,
            level_changed=False,
            direction="stay",
            reason="Session initiated at default baseline difficulty.",
            feedback_message=None,
            scaffolding=None,
        )
        self.profile: PlayerSkillProfile = PlayerSkillProfile(player_id=player_id)

    @property
    def is_adaptive_eligible(self) -> bool:
        """Adaptive difficulty is ONLY permitted in casual, campaign, and learning modes.

        Strictly prohibited in competitive modes (Daily Haunt, Haunted Duels).
        """
        return self.mode in (
            GameMode.CLASSIC,
            GameMode.QUICK,
            GameMode.DEEP,
            GameMode.ENDLESS,
            GameMode.CAMPAIGN,
            GameMode.ADAPTIVE,
        )

    def load_skill_profile(self, profile: PlayerSkillProfile) -> None:
        """Initialize the tracker with an existing durable player skill profile."""
        self.profile = profile
        # Calibrate baseline difficulty based on durable profile rating
        if profile.overall_rating >= 72.0:
            self.current_difficulty = Difficulty.HARD
        elif profile.overall_rating <= 38.0:
            self.current_difficulty = Difficulty.EASY
        else:
            self.current_difficulty = Difficulty.MEDIUM

    def record_response(
        self,
        is_correct: bool,
        time_taken: float,
        time_limit: float,
        difficulty: Difficulty,
        category: str | None = None,
        hint_used: bool = False,
        is_timeout: bool = False,
    ) -> Difficulty:
        """Record an answer outcome and compute the next difficulty level with explainability."""
        prev_diff = self.current_difficulty

        if not self.is_adaptive_eligible:
            self.last_decision = AdaptiveDecision(
                previous_difficulty=difficulty,
                new_difficulty=difficulty,
                level_changed=False,
                direction="stay",
                reason=f"Adaptive adjustments disabled in standardized mode '{self.mode.value}'.",
                feedback_message=None,
                scaffolding=None,
            )
            return difficulty

        cat_key = category or "spooky"
        if cat_key not in self.category_histories:
            self.category_histories[cat_key] = deque(maxlen=self.window_size)

        entry = {
            "is_correct": is_correct,
            "time_ratio": min(1.0, max(0.0, time_taken / max(1.0, time_limit))),
            "time_taken": time_taken,
            "difficulty": difficulty,
            "category": cat_key,
            "hint_used": hint_used,
            "is_timeout": is_timeout,
        }

        self.history.append(entry)
        self.category_histories[cat_key].append(entry)

        # Update persistent profile counters
        self.profile.questions_answered += 1
        if hint_used:
            self.profile.hints_used += 1
        if is_timeout:
            self.profile.timeouts += 1

        if is_correct:
            self.profile.current_streak += 1
        else:
            self.profile.current_streak = 0

        # Update rolling metrics
        all_entries = list(self.history)
        correct_count = sum(1 for h in all_entries if h["is_correct"])
        self.profile.recent_accuracy = correct_count / len(all_entries)
        self.profile.recent_response_time = sum(h["time_taken"] for h in all_entries) / len(
            all_entries
        )

        # Update category-specific rating
        self._update_category_rating(cat_key, is_correct, time_taken, time_limit, difficulty, hint_used, is_timeout)

        # Require at least 3 data points in the rolling window before adapting to avoid single-question swings
        if len(self.history) < 3:
            self.current_difficulty = difficulty
            self.last_decision = AdaptiveDecision(
                previous_difficulty=prev_diff,
                new_difficulty=self.current_difficulty,
                level_changed=False,
                direction="stay",
                reason=f"Gathering initial performance baseline ({len(self.history)}/3 questions answered).",
                feedback_message=None,
                scaffolding=None,
            )
            return self.current_difficulty

        # Compute composite multi-signal performance score
        # 1. Recent accuracy (40%)
        accuracy_score = (correct_count / len(self.history)) * 0.40

        # 2. Answer speed (20%) - Faster answer gets higher score
        avg_time_ratio = sum(h["time_ratio"] for h in self.history) / len(self.history)
        speed_score = (1.0 - avg_time_ratio) * 0.20

        # 3. Streak stability (20%) - Did last 2 answers succeed?
        last_two_correct = sum(1 for h in list(self.history)[-2:] if h["is_correct"])
        streak_score = (last_two_correct / 2.0) * 0.20

        # 4. Difficulty weighting (20%)
        diff_weights = {Difficulty.EASY: 0.05, Difficulty.MEDIUM: 0.12, Difficulty.HARD: 0.20}
        curr_diff_weight = diff_weights.get(difficulty, 0.12)

        # 5. Penalties for friction signals (timeouts & excessive hints)
        timeout_penalty = 0.05 if is_timeout else 0.0
        hint_penalty = 0.03 if hint_used else 0.0

        composite_performance = (
            accuracy_score + speed_score + streak_score + curr_diff_weight - timeout_penalty - hint_penalty
        )

        cat_meta = CATEGORY_METADATA.get(cat_key, {"name": cat_key.title(), "icon": "🎃"})
        scaffolding: AdaptiveScaffolding | None = None
        feedback_message: str | None = None
        direction = "stay"
        level_changed = False
        decision_reason = ""

        # Smooth difficulty transition thresholds
        # High performance (>= 0.70): Step up gradually
        if composite_performance >= 0.70:
            if difficulty == Difficulty.EASY:
                self.current_difficulty = Difficulty.MEDIUM
                direction = "up"
                level_changed = True
                decision_reason = (
                    f"Strong performance in {cat_meta['name']} (composite score {composite_performance:.2f} >= 0.70): "
                    f"stepping up from Easy to Medium."
                )
                feedback_message = (
                    f"🎃 Challenge Level Rising: You're crushing {cat_meta['name']}! "
                    "The next questions will be a little tougher."
                )
            elif difficulty == Difficulty.MEDIUM:
                self.current_difficulty = Difficulty.HARD
                direction = "up"
                level_changed = True
                decision_reason = (
                    f"Exceptional mastery in {cat_meta['name']} (composite score {composite_performance:.2f} >= 0.70): "
                    f"advancing to Hard."
                )
                feedback_message = (
                    f"🎃 Peak Challenge: Outstanding streak in {cat_meta['name']}! "
                    "Stepping into Hard mode questions."
                )
            else:
                self.current_difficulty = Difficulty.HARD
                decision_reason = "Player maintaining strong mastery at maximum Hard difficulty."

        # Struggling performance (<= 0.40): Provide scaffolding and conditionally step down
        elif composite_performance <= 0.40:
            # First provide pedagogical scaffolding
            scaffolding = AdaptiveScaffolding(
                needed=True,
                scaffolding_type="smart_hint" if hint_used else "category_explanation",
                category=cat_key,
                category_name=cat_meta["name"],
                guidance=(
                    f"The spirits of {cat_meta['name']} are testing your resolve. "
                    "Take your time and look for clues connecting to the lore."
                ),
                reason=f"Struggling in {cat_meta['name']} with accuracy {self.profile.recent_accuracy * 100:.0f}%.",
            )

            if difficulty == Difficulty.HARD:
                self.current_difficulty = Difficulty.MEDIUM
                direction = "down"
                level_changed = True
                decision_reason = (
                    f"Friction detected at Hard difficulty in {cat_meta['name']} "
                    f"(composite score {composite_performance:.2f} <= 0.40): gracefully stepping down to Medium."
                )
                feedback_message = (
                    f"👻 Spooky Guide: These {cat_meta['name']} questions are tricky. "
                    "Let's calibrate with a more balanced challenge."
                )
            elif difficulty == Difficulty.MEDIUM:
                # Require repeated struggle (e.g. at least 2 incorrect or a timeout) before dropping to Easy
                mistakes_in_window = sum(1 for h in self.history if not h["is_correct"])
                if mistakes_in_window >= 2 or is_timeout:
                    self.current_difficulty = Difficulty.EASY
                    direction = "down"
                    level_changed = True
                    decision_reason = (
                        f"Repeated mistakes ({mistakes_in_window}/window) in {cat_meta['name']}: "
                        "stepping down to Easy to reinforce foundational lore."
                    )
                    feedback_message = (
                        f"👻 Spooky Guide: The spirits offer guidance in {cat_meta['name']}. "
                        "Here's some practice to build your mastery."
                    )
                else:
                    self.current_difficulty = Difficulty.MEDIUM
                    decision_reason = (
                        f"Single mistake in {cat_meta['name']}; offering scaffolding while maintaining Medium difficulty."
                    )
            else:
                self.current_difficulty = Difficulty.EASY
                decision_reason = "Maintaining supportive Easy difficulty while offering pedagogical scaffolding."
        else:
            self.current_difficulty = difficulty
            decision_reason = (
                f"Player operating squarely in the Optimal Learning Zone (composite score {composite_performance:.2f})."
            )

        self.profile.difficulty_history.append(self.current_difficulty.value)
        self.profile.last_updated = datetime.now(timezone.utc)

        self.last_decision = AdaptiveDecision(
            previous_difficulty=prev_diff,
            new_difficulty=self.current_difficulty,
            level_changed=level_changed,
            direction=direction,
            reason=decision_reason,
            feedback_message=feedback_message,
            scaffolding=scaffolding,
        )

        return self.current_difficulty

    def _update_category_rating(
        self,
        category: str,
        is_correct: bool,
        time_taken: float,
        time_limit: float,
        difficulty: Difficulty,
        hint_used: bool,
        is_timeout: bool,
    ) -> None:
        """Update individual category rating using calibrated performance signals."""
        current = self.profile.category_ratings.get(category, 50.0)

        if is_correct:
            speed_ratio = max(0.0, 1.0 - (time_taken / max(1.0, time_limit)))
            diff_mult = {Difficulty.EASY: 1.0, Difficulty.MEDIUM: 1.4, Difficulty.HARD: 1.8}.get(
                difficulty, 1.2
            )
            # Fast, accurate answers on hard questions grant greater mastery gains
            gain = 4.0 * diff_mult * (0.6 + 0.4 * speed_ratio)
            new_rating = min(100.0, current + gain)
        else:
            # Penalize timeouts slightly more, but soften penalty if player requested a hint
            penalty = 5.0
            if is_timeout:
                penalty += 2.0
            if hint_used:
                penalty -= 1.5
            new_rating = max(0.0, current - penalty)

        self.profile.category_ratings[category] = round(new_rating, 1)

        # Update overall rating as the average of all category ratings
        ratings = list(self.profile.category_ratings.values())
        if ratings:
            self.profile.overall_rating = round(sum(ratings) / len(ratings), 1)

    def get_skill_profile(self) -> PlayerSkillProfile:
        """Return the current player skill profile."""
        return self.profile
