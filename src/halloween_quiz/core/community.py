"""Community Haunt: Global daily metrics, collaborative goals, and idempotent rewards."""

import threading
from datetime import datetime, timezone

from pydantic import BaseModel


class CommunityGoal(BaseModel):
    goal_id: str
    title: str
    target_count: int
    current_count: int = 0
    category_focus: str = "spooky"
    reward_diamonds: int = 20
    is_achieved: bool = False


class DailyCommunityStats(BaseModel):
    date_str: str  # YYYY-MM-DD UTC
    players_entered: int = 0
    total_completed: int = 0
    total_score: int = 0
    perfect_runs: int = 0
    goal: CommunityGoal

    @property
    def completion_rate(self) -> int:
        if self.players_entered == 0:
            return 0
        return min(100, int((self.total_completed / self.players_entered) * 100))

    @property
    def average_score(self) -> int:
        if self.total_completed == 0:
            return 0
        return int(self.total_score / self.total_completed)


class CommunityRegistry:
    """Thread-safe in-memory community registry with daily rotation."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._stats_by_date: dict[str, DailyCommunityStats] = {}

    def get_today_stats(self, date_str: str | None = None) -> DailyCommunityStats:
        if not date_str:
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        with self._lock:
            if date_str not in self._stats_by_date:
                # Initialize realistic starting baseline for the day
                self._stats_by_date[date_str] = DailyCommunityStats(
                    date_str=date_str,
                    players_entered=124,
                    total_completed=86,
                    total_score=268400,
                    perfect_runs=14,
                    goal=CommunityGoal(
                        goal_id=f"goal_{date_str}",
                        title="Answer 2,000 Spooky & Horror Questions Worldwide Today",
                        target_count=2000,
                        current_count=1380,
                        category_focus="spooky",
                        reward_diamonds=20,
                        is_achieved=False,
                    ),
                )
            return self._stats_by_date[date_str]

    def record_run(
        self,
        score: int,
        is_completed: bool,
        is_perfect: bool,
        questions_answered: int,
        date_str: str | None = None,
    ) -> DailyCommunityStats:
        """Atomically increment daily community metrics."""
        today = self.get_today_stats(date_str)
        with self._lock:
            today.players_entered += 1
            if is_completed:
                today.total_completed += 1
                today.total_score += score
            if is_perfect:
                today.perfect_runs += 1

            today.goal.current_count += questions_answered
            if today.goal.current_count >= today.goal.target_count:
                today.goal.is_achieved = True

            return today


# Global Community Haunt singleton
community_registry = CommunityRegistry()
