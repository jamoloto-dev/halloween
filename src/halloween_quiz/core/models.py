"""Core domain models for Halloween Quiz."""

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

    @classmethod
    def from_str(cls, value: str) -> "Difficulty":
        normalized = value.strip().lower()
        for diff in cls:
            if diff.value == normalized:
                return diff
        return cls.MEDIUM


class GameMode(str, Enum):
    CLASSIC = "classic"
    QUICK = "quick"
    DEEP = "deep"
    PANIC = "panic"
    ENDLESS = "endless"
    DAILY = "daily"
    CAMPAIGN = "campaign"
    DUEL = "duel"
    ADAPTIVE = "adaptive"

    @classmethod
    def from_str(cls, value: str) -> "GameMode":
        normalized = value.strip().lower()
        for mode in cls:
            if mode.value == normalized:
                return mode
        return cls.CLASSIC


class Category(str, Enum):
    SPOOKY = "spooky"
    COSTUMES = "costumes"
    MOVIES = "movies"
    HISTORY = "history"
    CANDY = "candy"
    PARANORMAL = "paranormal"


CATEGORY_METADATA = {
    Category.SPOOKY.value: {
        "name": "Spooky Stories",
        "icon": "👻",
        "description": "Urban legends, haunted folklore, and spine-chilling tales.",
    },
    Category.COSTUMES.value: {
        "name": "Costumes & Traditions",
        "icon": "🎭",
        "description": "Disguises, masquerades, and age-old Halloween traditions.",
    },
    Category.MOVIES.value: {
        "name": "Horror Movies",
        "icon": "🎬",
        "description": "Iconic slashers, psychological thrillers, and spooky cinema.",
    },
    Category.HISTORY.value: {
        "name": "Halloween History",
        "icon": "📜",
        "description": "From Celtic Samhain to modern trick-or-treating.",
    },
    Category.CANDY.value: {
        "name": "Candy & Treats",
        "icon": "🍬",
        "description": "Sweet treats, sugary history, and trick-or-treat favorites.",
    },
    Category.PARANORMAL.value: {
        "name": "Paranormal Lore",
        "icon": "🔮",
        "description": "Cryptids, ghost hunting gear, and inexplicable phenomena.",
    },
}


class Question(BaseModel):
    id: str = Field(..., description="Unique question identifier")
    category: str = Field(..., description="Trivia category key")
    difficulty: Difficulty = Field(..., description="Difficulty level")
    question: str = Field(..., min_length=5, description="Trivia question text")
    options: list[str] = Field(
        ..., min_length=2, max_length=6, description="List of possible answer choices"
    )
    correct_answer: str = Field(..., description="The exact string of the correct answer")
    explanation: str | None = Field(
        default=None, description="Educational explanation for the answer"
    )
    question_type: str = Field(
        default="multiple_choice", description="Question format: multiple_choice or audio_riddle"
    )
    audio_clip_id: str | None = Field(
        default=None, description="Identifier for synthesized audio clip"
    )
    accessible_transcript: str | None = Field(
        default=None, description="Accessible audio description/transcript"
    )

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: list[str]) -> list[str]:
        cleaned = [opt.strip() for opt in v if opt.strip()]
        if len(cleaned) != len(v):
            raise ValueError("Options cannot contain empty or blank strings")
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("All options must be unique")
        return cleaned

    @model_validator(mode="after")
    def validate_correct_answer_in_options(self) -> "Question":
        if self.correct_answer not in self.options:
            raise ValueError(
                f"correct_answer '{self.correct_answer}' must match one of the options: {self.options}"
            )
        return self


class QuizConfig(BaseModel):
    player_name: str = Field(default="Ghost Hunter", min_length=1, max_length=50)
    difficulty: Difficulty = Difficulty.MEDIUM
    mode: GameMode = GameMode.CLASSIC
    categories: list[str] = Field(default_factory=lambda: [c.value for c in Category])
    num_questions: int = Field(default=10, ge=1, le=50)
    time_limit_per_question: int = Field(default=30, ge=5, le=120)

    @field_validator("player_name")
    @classmethod
    def sanitize_player_name(cls, v: str) -> str:
        # Strip potential CSV formula prefixes to prevent CSV injection
        v = v.strip()
        if not v:
            return "Spooky Player"
        while v and v[0] in ("=", "+", "-", "@", "\t", "\r"):
            v = v[1:].strip()
        return v[:40] or "Spooky Player"


class QuestionView(BaseModel):
    id: str
    index: int
    total_questions: int
    category: str
    category_name: str
    category_icon: str
    difficulty: Difficulty
    question: str
    options: list[str]
    time_limit: int
    question_type: str = "multiple_choice"
    audio_clip_id: str | None = None
    accessible_transcript: str | None = None
    active_trap: str | None = None


class AnswerSubmission(BaseModel):
    answer: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Selected answer string or 0-indexed choice integer as string",
    )
    time_taken: float = Field(
        default=0.0, ge=0.0, le=120.0, description="Elapsed seconds before answering"
    )
    booster_used: str | None = Field(
        None, description="Optional booster activated during this question"
    )


class AnswerResult(BaseModel):
    question_id: str
    selected_answer: str
    is_correct: bool
    correct_answer: str
    explanation: str | None = None
    points_awarded: int = 0
    time_bonus: int = 0
    streak: int = 0
    total_score: int = 0
    is_game_over: bool = False
    next_question: QuestionView | None = None
    achievement_unlocked: str | None = None
    shield_absorbed: bool = False
    points_multiplier: int = 1


class ScoreRecord(BaseModel):
    id: int | None = None
    player_name: str
    difficulty: str
    mode: str = "classic"
    score: int
    total_questions: int
    percentage: float
    max_streak: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("player_name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        v = v.strip()
        while v and v[0] in ("=", "+", "-", "@", "\t", "\r"):
            v = v[1:].strip()
        return v[:40] or "Anonymous Ghost"


class LeaderboardResponse(BaseModel):
    entries: list[ScoreRecord]
    total: int


class BoosterType(str, Enum):
    HINT = "hint"
    TIME_EXTENSION = "time_extension"
    DOUBLE_POINTS = "double_points"
    SHIELD = "shield"


BOOSTER_COSTS = {
    BoosterType.HINT.value: 15,
    BoosterType.TIME_EXTENSION.value: 20,
    BoosterType.DOUBLE_POINTS.value: 30,
    BoosterType.SHIELD.value: 25,
}


class BoosterInventory(BaseModel):
    hints: int = 1
    time_extensions: int = 1
    double_points: int = 0
    shields: int = 0


class DiamondTransaction(BaseModel):
    id: str
    player_id: str
    amount: int
    type: str  # e.g. STAGE_REWARD, CHAPTER_REWARD, DAILY_CHALLENGE, PURCHASE_BOOSTER, PURCHASE_COSMETIC, DUEL_REWARD
    reason: str
    reference_id: str
    created_at: str
