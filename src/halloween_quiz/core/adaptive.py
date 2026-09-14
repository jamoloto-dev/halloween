"""Dynamic Adaptive Difficulty: Performance modeling, rolling evaluation, and difficulty stepping."""

from collections import deque

from halloween_quiz.core.models import Difficulty, GameMode


class AdaptivePerformanceTracker:
    """Tracks a rolling window of recent question responses to adapt difficulty.
    Strictly disabled in competitive/ranked modes (Global Leaderboard, Daily Haunt, Haunted Duels).
    """

    def __init__(self, window_size: int = 4, mode: GameMode = GameMode.CLASSIC) -> None:
        self.window_size = window_size
        self.mode = mode
        self.history: deque[dict] = deque(maxlen=window_size)
        self.current_difficulty: Difficulty = Difficulty.MEDIUM

    @property
    def is_adaptive_eligible(self) -> bool:
        """Adaptive difficulty is ONLY permitted in casual/campaign modes, never in ranked/daily."""
        return self.mode in (GameMode.CLASSIC, GameMode.QUICK, GameMode.DEEP, GameMode.ENDLESS)

    def record_response(
        self,
        is_correct: bool,
        time_taken: float,
        time_limit: float,
        difficulty: Difficulty,
    ) -> Difficulty:
        """Record an answer outcome and compute the next difficulty level."""
        if not self.is_adaptive_eligible:
            return difficulty

        self.history.append(
            {
                "is_correct": is_correct,
                "time_ratio": min(1.0, max(0.0, time_taken / max(1.0, time_limit))),
                "difficulty": difficulty,
            }
        )

        # Require at least 3 data points before adapting to avoid sudden swings
        if len(self.history) < 3:
            self.current_difficulty = difficulty
            return self.current_difficulty

        # 1. Recent accuracy (40%)
        correct_count = sum(1 for h in self.history if h["is_correct"])
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

        composite_performance = accuracy_score + speed_score + streak_score + curr_diff_weight

        # Performance threshold evaluation with smooth stepping
        # High performance (>= 0.70): Step up
        if composite_performance >= 0.70:
            if difficulty == Difficulty.EASY:
                self.current_difficulty = Difficulty.MEDIUM
            elif difficulty == Difficulty.MEDIUM:
                self.current_difficulty = Difficulty.HARD
        # Struggling performance (<= 0.40): Step down
        elif composite_performance <= 0.40:
            if difficulty == Difficulty.HARD:
                self.current_difficulty = Difficulty.MEDIUM
            elif difficulty == Difficulty.MEDIUM:
                self.current_difficulty = Difficulty.EASY
        else:
            self.current_difficulty = difficulty

        return self.current_difficulty
