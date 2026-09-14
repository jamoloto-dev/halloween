"""Haunted Duels: Asynchronous PvP trivia matches and trap mechanics."""

import random
import threading
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum

from pydantic import BaseModel, Field

from halloween_quiz.core.models import Difficulty


class DuelStatus(str, Enum):
    CREATED = "created"
    WAITING_OPPONENT = "waiting_opponent"
    COMPLETED = "completed"
    EXPIRED = "expired"


class SpookyTrap(str, Enum):
    GHOST_FOG = "ghost_fog"
    CURSED_CLOCK = "cursed_clock"
    SWARM = "swarm"
    FLICKERING_CANDLE = "flickering_candle"
    SUDDEN_DEATH = "sudden_death"
    MYSTERY_CATEGORY = "mystery_category"


TRAP_METADATA: dict[str, dict[str, str]] = {
    SpookyTrap.GHOST_FOG.value: {
        "name": "Ghost Fog",
        "icon": "👻",
        "description": "Thick spectral mist briefly fades the question text after 2 seconds.",
        "accessible_fallback": "Replaced with a subtle purple text tint when Reduced Motion is enabled.",
    },
    SpookyTrap.CURSED_CLOCK.value: {
        "name": "Cursed Clock",
        "icon": "⏰",
        "description": "The sands of time slip faster! Answer window clamped to 10 seconds.",
        "accessible_fallback": "Strict 10s timer with clear high-contrast visual bar and ticking audio.",
    },
    SpookyTrap.SWARM.value: {
        "name": "Bat Swarm",
        "icon": "🦇",
        "description": "A flutter of bats scatters the answer options into a fresh shuffle before you answer.",
        "accessible_fallback": "Options shuffle instantly without rapid movement when Reduced Motion is enabled.",
    },
    SpookyTrap.FLICKERING_CANDLE.value: {
        "name": "Flickering Candle",
        "icon": "🕯️",
        "description": "Ambient room light dims and glows erratically as phantom drafts sweep through.",
        "accessible_fallback": "Disabled completely if Reduced Motion or photosensitivity settings are active.",
    },
    SpookyTrap.SUDDEN_DEATH.value: {
        "name": "Sudden Death",
        "icon": "💀",
        "description": "No second chances! A single incorrect answer ends the duel attempt immediately.",
        "accessible_fallback": "Clear skull warning badge displayed in the duel HUD.",
    },
    SpookyTrap.MYSTERY_CATEGORY.value: {
        "name": "Mystery Category",
        "icon": "🔮",
        "description": "The category orb is shrouded in smoke until the round commences.",
        "accessible_fallback": "Screen readers announce 'Category hidden by Mystery Trap'.",
    },
}


class PlayerDuelResult(BaseModel):
    player_id: str
    player_name: str
    avatar_id: str = "pumpkin_hunter"
    score: int = 0
    accuracy: float = 0.0
    streak: int = 0
    time_taken_seconds: float = 0.0
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DuelChallenge(BaseModel):
    duel_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    duel_code: str  # e.g. "SPOOK-7429"
    difficulty: Difficulty = Difficulty.MEDIUM
    num_questions: int = 5
    question_seed: int
    traps: list[str] = Field(default_factory=list)
    creator_id: str
    creator_name: str
    creator_avatar: str = "pumpkin_hunter"
    creator_result: PlayerDuelResult | None = None
    challenger_id: str | None = None
    challenger_name: str | None = None
    challenger_avatar: str | None = None
    challenger_result: PlayerDuelResult | None = None
    status: DuelStatus = DuelStatus.CREATED
    winner_player_id: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc) + timedelta(hours=48)
    )


def generate_duel_code() -> str:
    """Generate a clean, readable 8-character duel code."""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    suffix = "".join(random.choices(chars, k=4))
    return f"SPOOK-{suffix}"


def determine_duel_winner(
    creator: PlayerDuelResult, challenger: PlayerDuelResult
) -> tuple[str, str]:
    """Server-authoritative tiebreaker hierarchy:
    1. Score (higher wins)
    2. Accuracy percentage (higher wins)
    3. Elapsed time in seconds (faster wins)
    4. Tie / Co-victors
    Returns (winner_player_id, reason_string).
    """
    # 1. Compare Score
    if creator.score > challenger.score:
        return (
            creator.player_id,
            f"{creator.player_name} scored {creator.score} pts vs {challenger.score} pts",
        )
    if challenger.score > creator.score:
        return (
            challenger.player_id,
            f"{challenger.player_name} scored {challenger.score} pts vs {creator.score} pts",
        )

    # 2. Compare Accuracy
    if creator.accuracy > challenger.accuracy:
        return (
            creator.player_id,
            f"Tiebreaker (Accuracy): {creator.accuracy:.1f}% vs {challenger.accuracy:.1f}%",
        )
    if challenger.accuracy > creator.accuracy:
        return (
            challenger.player_id,
            f"Tiebreaker (Accuracy): {challenger.accuracy:.1f}% vs {creator.accuracy:.1f}%",
        )

    # 3. Compare Time Taken (Faster wins)
    if creator.time_taken_seconds < challenger.time_taken_seconds:
        return (
            creator.player_id,
            f"Tiebreaker (Speed): {creator.time_taken_seconds:.1f}s vs {challenger.time_taken_seconds:.1f}s",
        )
    if challenger.time_taken_seconds < creator.time_taken_seconds:
        return (
            challenger.player_id,
            f"Tiebreaker (Speed): {challenger.time_taken_seconds:.1f}s vs {creator.time_taken_seconds:.1f}s",
        )

    # Exact tie
    return creator.player_id, "Exact tie! Honors shared in the Midnight Crypt."


class DuelRegistry:
    """Thread-safe in-memory registry for Haunted Duels with expiration."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._duels: dict[str, DuelChallenge] = {}

    def create_duel(
        self,
        creator_id: str,
        creator_name: str,
        creator_avatar: str = "pumpkin_hunter",
        difficulty: Difficulty = Difficulty.MEDIUM,
        num_questions: int = 5,
        traps: list[str] | None = None,
    ) -> DuelChallenge:
        with self._lock:
            code = generate_duel_code()
            while code in self._duels:
                code = generate_duel_code()

            duel = DuelChallenge(
                duel_code=code,
                difficulty=difficulty,
                num_questions=num_questions,
                question_seed=random.randint(100000, 999999),
                traps=traps or [],
                creator_id=creator_id,
                creator_name=creator_name,
                creator_avatar=creator_avatar,
                status=DuelStatus.CREATED,
            )
            self._duels[code] = duel
            return duel

    def get_duel(self, duel_code: str) -> DuelChallenge | None:
        with self._lock:
            duel = self._duels.get(duel_code.upper().strip())
            if not duel:
                return None
            if datetime.now(timezone.utc) > duel.expires_at:
                duel.status = DuelStatus.EXPIRED
            return duel

    def record_creator_result(
        self,
        duel_code: str,
        result: PlayerDuelResult,
    ) -> DuelChallenge | None:
        with self._lock:
            duel = self._duels.get(duel_code.upper().strip())
            if not duel:
                return None
            duel.creator_result = result
            duel.status = DuelStatus.WAITING_OPPONENT
            return duel

    def accept_duel(
        self,
        duel_code: str,
        challenger_id: str,
        challenger_name: str,
        challenger_avatar: str = "ghost",
    ) -> DuelChallenge | None:
        with self._lock:
            duel = self._duels.get(duel_code.upper().strip())
            if not duel:
                return None
            duel.challenger_id = challenger_id
            duel.challenger_name = challenger_name
            duel.challenger_avatar = challenger_avatar
            return duel

    def submit_challenger_result(
        self,
        duel_code: str,
        result: PlayerDuelResult,
    ) -> tuple[DuelChallenge, str, str] | None:
        with self._lock:
            duel = self._duels.get(duel_code.upper().strip())
            if not duel or not duel.creator_result:
                return None
            duel.challenger_result = result
            duel.status = DuelStatus.COMPLETED
            winner_id, reason = determine_duel_winner(duel.creator_result, result)
            duel.winner_player_id = winner_id
            return duel, winner_id, reason


# Global duel registry singleton
duel_registry = DuelRegistry()
