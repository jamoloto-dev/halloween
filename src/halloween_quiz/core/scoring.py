"""Authoritative scoring service for Spooky Master / Halloween Quiz.

Provides server-authoritative score calculation, timing verification,
difficulty weighting, streak bonus balancing, and anti-cheat validation.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from halloween_quiz.core.models import Difficulty, GameMode


@dataclass(frozen=True)
class ScoringConfig:
    """Central configuration for quiz scoring parameters."""

    base_points: dict[Difficulty, int]
    max_streak_multiplier: float = 1.5
    streak_increment: float = 0.10
    standard_speed_multiplier: float = 0.50
    panic_speed_multiplier: float = 1.00
    server_time_tolerance_seconds: float = 1.50
    min_time_seconds: float = 0.10


DEFAULT_SCORING_CONFIG = ScoringConfig(
    base_points={
        Difficulty.EASY: 100,
        Difficulty.MEDIUM: 200,
        Difficulty.HARD: 300,
    },
    max_streak_multiplier=1.5,
    streak_increment=0.10,
    standard_speed_multiplier=0.50,
    panic_speed_multiplier=1.00,
    server_time_tolerance_seconds=1.50,
    min_time_seconds=0.10,
)


@dataclass(frozen=True)
class QuestionScoreResult:
    """Detailed breakdown of points awarded for a single question."""

    is_correct: bool
    base_points: int
    streak_bonus: int
    time_bonus: int
    applied_multiplier: int
    total_points: int
    effective_time: float
    streak: int
    is_competitive: bool


class ScoringService:
    """Authoritative scoring engine enforcing server timing, fairness, and anti-cheat."""

    def __init__(self, config: ScoringConfig = DEFAULT_SCORING_CONFIG):
        self.config = config

    def resolve_effective_time(
        self,
        client_time_taken: float,
        server_elapsed: float,
    ) -> float:
        """Enforce server-authoritative monotonic timing against client manipulation."""
        server_elapsed = max(self.config.min_time_seconds, round(server_elapsed, 2))

        # Reject impossible client times (e.g. 0.0s, negative, or suspiciously delayed)
        if (
            self.config.min_time_seconds
            <= client_time_taken
            <= server_elapsed + self.config.server_time_tolerance_seconds
        ):
            return round(client_time_taken, 2)

        return server_elapsed

    def calculate_question_score(
        self,
        difficulty: Difficulty,
        is_correct: bool,
        current_streak: int,
        client_time_taken: float,
        server_elapsed: float,
        time_limit: float,
        mode: GameMode = GameMode.CLASSIC,
        booster_multiplier: int = 1,
        is_competitive: bool = False,
    ) -> QuestionScoreResult:
        """Compute the official score for a question answer with full breakdown."""
        effective_time = self.resolve_effective_time(client_time_taken, server_elapsed)

        if not is_correct:
            return QuestionScoreResult(
                is_correct=False,
                base_points=0,
                streak_bonus=0,
                time_bonus=0,
                applied_multiplier=1,
                total_points=0,
                effective_time=effective_time,
                streak=0,
                is_competitive=is_competitive,
            )

        new_streak = current_streak + 1
        base_pts = self.config.base_points.get(difficulty, 100)

        # Streak calculation: +10% per consecutive correct answer, capped at 1.5x
        streak_factor = min(
            self.config.max_streak_multiplier,
            1.0 + (new_streak - 1) * self.config.streak_increment,
        )
        streak_bonus = int(base_pts * (streak_factor - 1.0))

        # Speed bonus calculation based on remaining time ratio
        time_bonus = 0
        if time_limit > 0:
            time_remaining = max(0.0, time_limit - effective_time)
            time_ratio = min(1.0, max(0.0, time_remaining / time_limit))
            speed_mult = (
                self.config.panic_speed_multiplier
                if mode == GameMode.PANIC
                else self.config.standard_speed_multiplier
            )
            time_bonus = int(base_pts * time_ratio * speed_mult)

        # Fairness Rule: In ranked competitive modes, score multipliers from boosters are disabled
        if is_competitive:
            applied_multiplier = 1
        else:
            applied_multiplier = max(1, booster_multiplier)

        total_points = int(base_pts + streak_bonus + time_bonus) * applied_multiplier

        return QuestionScoreResult(
            is_correct=True,
            base_points=base_pts,
            streak_bonus=streak_bonus,
            time_bonus=time_bonus,
            applied_multiplier=applied_multiplier,
            total_points=total_points,
            effective_time=effective_time,
            streak=new_streak,
            is_competitive=is_competitive,
        )

    def validate_session_integrity(
        self,
        reported_total_score: int,
        history: list[dict],
    ) -> bool:
        """Validate that total score matches sum of recorded question points."""
        expected_total = sum(int(item.get("points", 0)) for item in history)
        return math.isclose(reported_total_score, expected_total, abs_tol=1)
