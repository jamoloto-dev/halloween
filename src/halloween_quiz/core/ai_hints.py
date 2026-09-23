"""Smart Conversational Hint System for Spooky Master.

Features:
- Progressive Hint Levels (1: Gentle clue, 2: Stronger clue, 3: Guided reasoning).
- Atmospheric 'Spooky Guide' ghost persona.
- Strict Answer Leakage Protection & Content Validation.
- Deterministic Fallback Engine (gameplay never stalls on network/provider issues).
- Hard Timeout Protection (2.5 seconds maximum).
- Caching by question_id, hint_level, and model.
- Strict isolation from competitive modes (Daily Haunt, Haunted Duels).
"""

import hashlib
import logging
import os
import re
import threading
from abc import ABC, abstractmethod

from pydantic import BaseModel, Field

from halloween_quiz.core.models import (
    CATEGORY_METADATA,
    Difficulty,
    GameMode,
)

logger = logging.getLogger("halloween_quiz.ai_hints")


class HintRequest(BaseModel):
    """Contextual request for an intelligent hint."""

    question_id: str
    question_text: str
    options: list[str]
    correct_answer: str
    category: str
    difficulty: Difficulty = Difficulty.MEDIUM
    hint_level: int = Field(default=1, ge=1, le=3)
    explanation: str | None = None


class HintResponse(BaseModel):
    """Validated hint delivered to the player."""

    question_id: str
    hint: str
    hint_level: int
    source: str  # "ai" | "mock" | "fallback" | "cache"
    fallback_used: bool
    character: str = "Spooky Guide"
    cached: bool = False


class HintValidator:
    """Validates hints to ensure zero direct answer leakage and safe content."""

    OPTION_LETTER_PATTERN = re.compile(
        r"\b(?:option|choice|answer|pick|select|letter)\s*[:\-]?\s*([A-Da-d]|[1-4])\b",
        re.IGNORECASE,
    )
    DIRECT_LETTER_PATTERN = re.compile(r"^(?:the\s+answer\s+is\s+)?\b[A-Da-d]\b[\.\:\)]", re.IGNORECASE)
    URL_PATTERN = re.compile(r"(?:https?://|www\.)\S+", re.IGNORECASE)

    @classmethod
    def validate(cls, hint: str, request: HintRequest) -> tuple[bool, str]:
        """Verify the hint satisfies all safety and fairness constraints."""
        cleaned = hint.strip()
        if not cleaned:
            return False, "Hint is empty"

        if len(cleaned) > 320:
            return False, f"Hint exceeds maximum length limit ({len(cleaned)} > 320 chars)"

        # Check for URL injection
        if cls.URL_PATTERN.search(cleaned):
            return False, "Hint contains external links"

        # Check for option letter leakage (e.g., 'Option B', 'Pick A', 'The answer is C')
        if cls.OPTION_LETTER_PATTERN.search(cleaned) or cls.DIRECT_LETTER_PATTERN.search(cleaned):
            return False, "Hint contains direct option letter reference"

        # Check for exact correct answer leakage (case-insensitive substring)
        norm_hint = cleaned.lower()
        norm_answer = request.correct_answer.strip().lower()

        if norm_answer and norm_answer in norm_hint:
            return False, f"Hint directly contains the correct answer '{request.correct_answer}'"

        # For multi-word answers, verify primary key noun phrases are not quoted directly
        words = [w for w in re.split(r"\W+", norm_answer) if len(w) >= 4]
        if len(words) >= 2:
            # If all major words appear in the hint, flag as potential leakage
            matching_words = [w for w in words if re.search(r"\b" + re.escape(w) + r"\b", norm_hint)]
            if len(matching_words) == len(words):
                return False, "Hint leaks complete key phrase of correct answer"

        return True, "Valid"


class BaseHintProvider(ABC):
    """Abstract interface for hint generation providers."""

    @abstractmethod
    def generate_hint(self, request: HintRequest) -> str:
        """Produce a conversational hint text for the given request."""
        pass


class DeterministicFallbackHintProvider(BaseHintProvider):
    """Guaranteed offline, fast, zero-dependency hint provider.

    Constructs progressive atmospheric guidance derived from category lore,
    question context, and sanitized educational explanations.
    """

    # Atmospheric lore starters per category
    CATEGORY_THEMES = {
        "spooky": [
            "Ancient folklore whispers of mysterious apparitions and shadowy tales.",
            "Consider the restless urban legends whispered around cold hearths.",
            "Spectral encounters often hinge on unexplainable hauntings.",
        ],
        "costumes": [
            "Think about how disguise has disguised mortals from wandering spirits.",
            "Tradition and masquerade conceal true identities on All Hallows' Eve.",
            "Celtic customs shaped our modern garments of disguise.",
        ],
        "movies": [
            "Reflect on cinema history, iconic horror filmmakers, and suspenseful tropes.",
            "Spooky cinema draws from psychological terror and silver-screen legends.",
            "Consider the landmark horror films that defined the genre.",
        ],
        "history": [
            "Journey back to the ancient Celtic fire festival of Samhain.",
            "Centuries of autumnal ritual and medieval lore paved this path.",
            "Historical traditions bridged the boundary between the living and the spirit realm.",
        ],
        "candy": [
            "Sweet confectioneries and harvest delicacies carry sugary traditions.",
            "Trick-or-treat harvest customs transformed simple treats into Halloween favorites.",
            "Sugar recipes and autumn confections date back across the decades.",
        ],
        "paranormal": [
            "Supernatural investigators watch the electromagnetic mists and cryptid lore.",
            "Eerie phenomena leave subtle footprints in paranormal records.",
            "Bizarre sightings and ghostly apparitions defy ordinary science.",
        ],
    }

    def generate_hint(self, request: HintRequest) -> str:
        """Produce progressive hints (Levels 1, 2, 3) without leaking answers."""
        cat = request.category if request.category in self.CATEGORY_THEMES else "spooky"
        meta = CATEGORY_METADATA.get(cat, {"name": cat.title()})
        cat_name = meta["name"]

        # Level 1: Gentle thematic clue
        if request.hint_level == 1:
            themes = self.CATEGORY_THEMES.get(cat, self.CATEGORY_THEMES["spooky"])
            idx = int(hashlib.md5(request.question_id.encode()).hexdigest(), 16) % len(themes)
            theme_line = themes[idx]
            return f"👻 Spooky Guide: That one is intriguing. In {cat_name}, {theme_line.lower()}"

        # Level 2: Stronger contextual clue from explanation or options
        if request.hint_level == 2:
            if request.explanation:
                # Sanitize explanation by removing correct answer
                sanitized_expl = request.explanation
                pattern = re.compile(re.escape(request.correct_answer), re.IGNORECASE)
                sanitized_expl = pattern.sub("this entity", sanitized_expl)
                # Keep first sentence
                first_sent = sanitized_expl.split(".")[0].strip()
                if first_sent and len(first_sent) < 180:
                    return f"👻 Spooky Guide: Pay close attention to this detail: {first_sent}."

            # Fallback level 2: guidance on eliminating distant choices
            return (
                f"👻 Spooky Guide: Several options are modern distractions or belong to different lore. "
                f"Focus on the core essence of {cat_name}."
            )

        # Level 3: Guided deductive reasoning
        wrong_count = len(request.options) - 1
        return (
            f"👻 Spooky Guide: Reflect on which of the choices feels most authentic to the ancient legend. "
            f"Rule out the {wrong_count} conflicting details and trust your supernatural instincts."
        )


class MockHintProvider(BaseHintProvider):
    """Simulates an intelligent LLM conversational hint generator for testing and local dev."""

    def __init__(self) -> None:
        self.fallback = DeterministicFallbackHintProvider()

    def generate_hint(self, request: HintRequest) -> str:
        # Generate varied conversational responses with ghost persona
        cat_meta = CATEGORY_METADATA.get(request.category, {"name": request.category.title()})
        if request.hint_level == 1:
            return (
                f"👻 Spooky Guide: A chill in the air reminds me of {cat_meta['name']}. "
                "Think back to the earliest recorded origins of this spooky tale."
            )
        elif request.hint_level == 2:
            return (
                "👻 Spooky Guide: Notice the wording in the question carefully. "
                "Which option connects most naturally to ancient folklore?"
            )
        else:
            return (
                "👻 Spooky Guide: The spirits are guiding your hand. "
                "Connect the clues of time, place, and tradition to make your deduction."
            )


class OpenAICompatibleHintProvider(BaseHintProvider):
    """Server-side provider that connects to an OpenAI-compatible LLM endpoint."""

    def __init__(self, api_key: str, api_url: str | None = None, model: str = "gpt-4o-mini") -> None:
        self.api_key = api_key
        self.api_url = api_url or "https://api.openai.com/v1/chat/completions"
        self.model = model

    def generate_hint(self, request: HintRequest) -> str:
        import json
        import urllib.request

        system_prompt = (
            "You are the 'Spooky Guide', a wise and playful supernatural ghost in the Halloween trivia game 'Spooky Master'. "
            "Your task is to provide a brief, helpful, progressive hint (1 to 2 sentences, max 35 words). "
            "CRITICAL RULES: "
            "1. NEVER reveal, mention, or quote the correct answer. "
            "2. NEVER mention option letters (A, B, C, D) or index numbers. "
            "3. Guide the player's reasoning through folklore, historical clues, or deductive questions. "
            "4. Start with '👻 Spooky Guide:'."
        )

        user_content = (
            f"Category: {request.category}\n"
            f"Difficulty: {request.difficulty.value}\n"
            f"Question: {request.question_text}\n"
            f"Options: {', '.join(request.options)}\n"
            f"Correct Answer: {request.correct_answer}\n"
            f"Requested Hint Level (1=Gentle clue, 2=Stronger clue, 3=Guided deduction): {request.hint_level}\n"
            f"Explanation Context: {request.explanation or 'None'}\n"
            "Generate hint:"
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "max_tokens": 100,
            "temperature": 0.7,
        }

        req = urllib.request.Request(
            self.api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=2.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return str(data["choices"][0]["message"]["content"]).strip()


class HintService:
    """Orchestrates hint generation, caching, timeout protection, and validation."""

    def __init__(self, provider: BaseHintProvider | None = None) -> None:
        self.fallback_provider = DeterministicFallbackHintProvider()
        self.mock_provider = MockHintProvider()
        self.active_provider: BaseHintProvider = provider or self._detect_provider()
        self._cache: dict[tuple[str, int, str], str] = {}
        self._cache_lock = threading.Lock()

    def _detect_provider(self) -> BaseHintProvider:
        """Resolve active provider based on environment configuration."""
        hints_enabled = os.getenv("AI_HINTS_ENABLED", "false").lower() in ("true", "1", "yes")
        api_key = os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY")

        if hints_enabled and api_key:
            api_url = os.getenv("AI_API_URL")
            model = os.getenv("AI_MODEL", "gpt-4o-mini")
            return OpenAICompatibleHintProvider(api_key=api_key, api_url=api_url, model=model)

        # Default to simulated mock in development/testing, fallback always ready
        return self.mock_provider

    def request_hint(
        self,
        request: HintRequest,
        session_mode: GameMode | None = None,
    ) -> HintResponse:
        """Deliver a validated, safe, progressive hint with fallback resilience."""
        # 1. Competitive fairness check: refuse AI hints in standardized modes
        if session_mode in (GameMode.DAILY, GameMode.DUEL):
            raise ValueError(
                f"Hints are strictly disabled in standardized competitive mode '{session_mode.value}'."
            )

        provider_name = type(self.active_provider).__name__
        cache_key = (request.question_id, request.hint_level, provider_name)

        # 2. Check cache
        with self._cache_lock:
            cached_hint = self._cache.get(cache_key)
            if cached_hint:
                return HintResponse(
                    question_id=request.question_id,
                    hint=cached_hint,
                    hint_level=request.hint_level,
                    source="cache",
                    fallback_used=False,
                    cached=True,
                )

        raw_hint: str | None = None
        fallback_used = False
        source = "ai"

        # 3. Call active provider with fallback safety
        try:
            raw_hint = self.active_provider.generate_hint(request)
            source = "ai" if isinstance(self.active_provider, OpenAICompatibleHintProvider) else "mock"
        except Exception as e:
            logger.warning(f"Active hint provider failed or timed out: {e}; using fallback.")
            raw_hint = self.fallback_provider.generate_hint(request)
            fallback_used = True
            source = "fallback"

        # 4. Strict validation (leakage protection, length, option letters)
        is_valid, validation_msg = HintValidator.validate(raw_hint or "", request)
        if not is_valid:
            logger.warning(
                f"Hint failed validation ({validation_msg}); invoking deterministic fallback."
            )
            raw_hint = self.fallback_provider.generate_hint(request)
            fallback_used = True
            source = "fallback"

            # Re-validate fallback to guarantee safety
            is_valid_fb, _ = HintValidator.validate(raw_hint, request)
            if not is_valid_fb:
                raw_hint = (
                    "👻 Spooky Guide: Ponder the ancient origins of this Halloween tale "
                    "and listen to the whispers of intuition."
                )

        # 5. Populate cache
        with self._cache_lock:
            self._cache[cache_key] = raw_hint

        return HintResponse(
            question_id=request.question_id,
            hint=raw_hint,
            hint_level=request.hint_level,
            source=source,
            fallback_used=fallback_used,
            cached=False,
        )


# Global singleton instance
hint_service = HintService()
