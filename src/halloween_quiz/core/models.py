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
        "description": "Urban legends, haunted folklore, and spine-chilling tales."
    },
    Category.COSTUMES.value: {
        "name": "Costumes & Traditions",
        "icon": "🎭",
        "description": "Disguises, masquerades, and age-old Halloween traditions."
    },
    Category.MOVIES.value: {
        "name": "Horror Movies",
        "icon": "🎬",
        "description": "Iconic slashers, psychological thrillers, and spooky cinema."
    },
    Category.HISTORY.value: {
        "name": "Halloween History",
        "icon": "📜",
        "description": "From Celtic Samhain to modern trick-or-treating."
    },
    Category.CANDY.value: {
        "name": "Candy & Treats",
        "icon": "🍬",
        "description": "Sweet treats, sugary history, and trick-or-treat favorites."
    },
    Category.PARANORMAL.value: {
        "name": "Paranormal Lore",
        "icon": "🔮",
        "description": "Cryptids, ghost hunting gear, and inexplicable phenomena."
    }
}


class Question(BaseModel):
    id: str = Field(..., description="Unique question identifier")
    category: str = Field(..., description="Trivia category key")
    difficulty: Difficulty = Field(..., description="Difficulty level")
    question: str = Field(..., min_length=5, description="Trivia question text")
    options: list[str] = Field(..., min_length=2, max_length=6, description="List of possible answer choices")
    correct_answer: str = Field(..., description="The exact string of the correct answer")
    explanation: str | None = Field(None, description="Educational explanation for the answer")

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
    categories: list[str] = Field(
        default_factory=lambda: [c.value for c in Category]
    )
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
        return v or "Spooky Player"


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


class AnswerSubmission(BaseModel):
    answer: str = Field(..., description="Selected answer string or 0-indexed choice integer as string")
    time_taken: float = Field(default=0.0, ge=0.0, description="Elapsed seconds before answering")


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


class ScoreRecord(BaseModel):
    id: int | None = None
    player_name: str
    difficulty: str
    score: int
    total_questions: int
    percentage: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("player_name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        v = v.strip()
        while v and v[0] in ("=", "+", "-", "@", "\t", "\r"):
            v = v[1:].strip()
        return v or "Anonymous Ghost"


class LeaderboardResponse(BaseModel):
    entries: list[ScoreRecord]
    total: int
