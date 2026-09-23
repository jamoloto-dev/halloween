"""Generative AI Avatar Architecture for Spooky Master.

Features:
- Personalized Supernatural Hunter avatar synthesis.
- Server-side prompt engineering with unified Spooky Master art direction.
- Multi-tier safety moderation (content filters, gore, hate, safety protection).
- Strict rate limiting & daily generation caps (cost control).
- Offline-first vector SVG synthesis provider (zero third-party dependency for testing/offline).
- Seamless integration with persistent storage and player profile.
- Preservation of existing illustrated avatars (zero regression).
"""

import hashlib
import logging
import re
import threading
import time
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger("halloween_quiz.ai_avatars")


class AvatarCreature(str, Enum):
    GHOST = "ghost"
    VAMPIRE = "vampire"
    WITCH = "witch"
    SKELETON = "skeleton"
    WEREWOLF = "werewolf"
    PUMPKIN_SPIRIT = "pumpkin_spirit"

    @classmethod
    def from_str(cls, value: str) -> "AvatarCreature":
        normalized = value.strip().lower().replace(" ", "_")
        for member in cls:
            if member.value == normalized:
                return member
        return cls.PUMPKIN_SPIRIT


class AvatarStyle(str, Enum):
    CUTE = "cute"
    DARK_FANTASY = "dark_fantasy"
    NEON_HORROR = "neon_horror"
    COMIC = "comic"
    GOTHIC = "gothic"

    @classmethod
    def from_str(cls, value: str) -> "AvatarStyle":
        normalized = value.strip().lower().replace(" ", "_")
        for member in cls:
            if member.value == normalized:
                return member
        return cls.DARK_FANTASY


class AvatarColor(str, Enum):
    PURPLE = "purple"
    GREEN = "green"
    ORANGE = "orange"
    BLUE = "blue"
    CRIMSON = "crimson"

    @classmethod
    def from_str(cls, value: str) -> "AvatarColor":
        normalized = value.strip().lower()
        for member in cls:
            if member.value == normalized:
                return member
        return cls.PURPLE


class AvatarAccessory(str, Enum):
    CROWN = "crown"
    LANTERN = "lantern"
    MAGIC_STAFF = "magic_staff"
    CAPE = "cape"
    HEADPHONES = "headphones"
    SPELL_BOOK = "spell_book"

    @classmethod
    def from_str(cls, value: str) -> "AvatarAccessory":
        normalized = value.strip().lower().replace(" ", "_")
        for member in cls:
            if member.value == normalized:
                return member
        return cls.LANTERN


class AvatarGenerationRequest(BaseModel):
    """Client request for generating a customized supernatural hunter."""

    player_id: str = Field(default="guest_default", max_length=128)
    creature: str = Field(default="pumpkin_spirit")
    style: str = Field(default="dark_fantasy")
    color: str = Field(default="purple")
    accessory: str = Field(default="lantern")
    customization: str | None = Field(default=None, max_length=120)

    @field_validator("customization")
    @classmethod
    def sanitize_customization(cls, v: str | None) -> str | None:
        if not v:
            return None
        cleaned = re.sub(r"[^\w\s\-,.!]", "", v).strip()
        return cleaned[:120] if cleaned else None


class AvatarGenerationResult(BaseModel):
    """Result of an avatar generation request."""

    avatar_id: str
    player_id: str
    asset_url: str
    creature: str
    style: str
    color: str
    accessory: str
    customization: str | None
    prompt_hash: str
    status: str = "approved"
    provider: str = "mock"
    cached: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AvatarSafetyFilter:
    """Content moderation engine blocking unsafe, hateful, or prohibited prompts."""

    PROHIBITED_TERMS = {
        "blood",
        "gore",
        "nsfw",
        "nude",
        "naked",
        "porn",
        "sexual",
        "hate",
        "nazi",
        "swastika",
        "racist",
        "terrorist",
        "kill",
        "murder",
        "suicide",
        "decapitated",
        "child",
        "minor",
        "exploit",
    }

    @classmethod
    def check_safety(cls, text: str | None) -> tuple[bool, str]:
        """Validate optional text customization against safety rules."""
        if not text:
            return True, "Safe"

        norm = text.lower()
        for term in cls.PROHIBITED_TERMS:
            if re.search(r"\b" + re.escape(term) + r"\b", norm):
                return False, f"Customization contains prohibited or unsafe term '{term}'"

        return True, "Safe"


class AvatarPromptBuilder:
    """Server-side prompt builder enforcing consistent Spooky Master art direction."""

    ART_SPECIFICATION = (
        "Stylized Halloween game avatar portrait, centered character bust, dark supernatural atmosphere, "
        "clean silhouette, readable at 64x64 icon size, square 1:1 composition, dark vignette background, "
        "no text, no watermark, no logos"
    )

    COLOR_PALETTES = {
        "purple": "deep violet, eerie lavender mist, and amethyst embers",
        "green": "spectral emerald mist, toxic lime glow, and radioactive jade accents",
        "orange": "glowing jack-o'-lantern embers, warm pumpkin orange, and autumn fire",
        "blue": "phantom cyan starlight, icy cobalt glow, and deep midnight navy",
        "crimson": "dark scarlet shadows, blood-moon rubies, and menacing garnet aura",
    }

    STYLE_DESCRIPTIONS = {
        "cute": "chibi stylized proportions, charming spooky aesthetic, rounded expressive contours",
        "dark_fantasy": "atmospheric dark fantasy digital illustration, painterly rim lighting, ominous mist",
        "neon_horror": "vibrant cyber-spectral neon luminescence, high contrast synth-dark edges",
        "comic": "bold expressive comic book ink outlines, graphic cel-shading, dynamic graphic shapes",
        "gothic": "ornate Victorian gothic etching, intricate shadowy filigree, melancholic elegance",
    }

    CREATURE_DESCRIPTIONS = {
        "ghost": "a friendly yet ethereal floating phantom spirit with wispy translucent ectoplasm",
        "vampire": "an aristocratic vampire lord with refined features, subtle fangs, and high-collared attire",
        "witch": "a mysterious midnight spellcaster with arcane eyes, pointed mystic hat, and enchanted aura",
        "skeleton": "an animated ancient skeleton warrior with carved bone details and glowing eye sockets",
        "werewolf": "a fierce lunar werewolf beast with stylized fur tufts and sharp glowing eyes",
        "pumpkin_spirit": "a supernatural pumpkin hunter entity with a carved jack-o'-lantern visage and flickering interior flame",
    }

    ACCESSORY_DESCRIPTIONS = {
        "crown": "wearing an ornate antique wrought-iron crest crown",
        "lantern": "holding a small glowing wrought-iron supernatural lantern",
        "magic_staff": "wielding a gnarled wooden staff tipped with a glowing mystic orb",
        "cape": "draped in a tattered supernatural phantom cloak",
        "headphones": "wearing glowing spectral arcane headphones",
        "spell_book": "holding an ancient grimoire bound in midnight leather",
    }

    @classmethod
    def build(cls, request: AvatarGenerationRequest) -> tuple[str, str]:
        """Construct canonical art prompt and unique prompt hash."""
        creature_desc = cls.CREATURE_DESCRIPTIONS.get(
            request.creature, cls.CREATURE_DESCRIPTIONS["pumpkin_spirit"]
        )
        style_desc = cls.STYLE_DESCRIPTIONS.get(
            request.style, cls.STYLE_DESCRIPTIONS["dark_fantasy"]
        )
        palette_desc = cls.COLOR_PALETTES.get(request.color, cls.COLOR_PALETTES["purple"])
        accessory_desc = cls.ACCESSORY_DESCRIPTIONS.get(
            request.accessory, cls.ACCESSORY_DESCRIPTIONS["lantern"]
        )

        parts = [
            cls.ART_SPECIFICATION,
            f"Character: {creature_desc}",
            f"Art Style: {style_desc}",
            f"Color Palette: {palette_desc}",
            f"Accessory: {accessory_desc}",
        ]

        if request.customization:
            parts.append(f"Details: {request.customization}")

        constructed_prompt = " | ".join(parts)
        prompt_hash = hashlib.sha256(
            f"{request.creature}_{request.style}_{request.color}_{request.accessory}_{request.customization or ''}".encode()
        ).hexdigest()[:16]

        return constructed_prompt, prompt_hash


class AvatarRateLimiter:
    """Per-player cooldown and daily quota enforcement for cost control."""

    def __init__(self, cooldown_seconds: int = 15, daily_cap: int = 5) -> None:
        self.cooldown_seconds = cooldown_seconds
        self.daily_cap = daily_cap
        self._history: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def check_and_record(self, player_id: str) -> tuple[bool, int, str]:
        """Verify if player can generate an avatar. Returns (allowed, wait_seconds, message)."""
        now = time.time()
        with self._lock:
            timestamps = self._history.setdefault(player_id, [])

            # Prune timestamps older than 24 hours (86400 seconds)
            one_day_ago = now - 86400
            timestamps[:] = [t for t in timestamps if t > one_day_ago]

            # 1. Cooldown check
            if timestamps:
                last_time = timestamps[-1]
                elapsed = now - last_time
                if elapsed < self.cooldown_seconds:
                    wait = int(self.cooldown_seconds - elapsed) + 1
                    return (
                        False,
                        wait,
                        f"Spirits need rest: please wait {wait} seconds before generating again.",
                    )

            # 2. Daily cap check
            if len(timestamps) >= self.daily_cap:
                return (
                    False,
                    3600,
                    f"Daily supernatural limit reached ({self.daily_cap}/{self.daily_cap} generations). Return tomorrow for more hunter summons!",
                )

            # Record generation timestamp
            timestamps.append(now)
            return True, 0, "Approved"


class BaseAvatarProvider(ABC):
    """Abstract provider for avatar generation."""

    @abstractmethod
    def generate_avatar(
        self, request: AvatarGenerationRequest, prompt: str, prompt_hash: str
    ) -> str:
        """Produce avatar and return reachable asset URL."""
        pass


class MockSvgAvatarProvider(BaseAvatarProvider):
    """Offline, fast vector SVG avatar synthesizer.

    Constructs a stylized SVG avatar embedding chosen creature silhouette,
    palette, accessory, and style. Requires zero internet connectivity and
    zero external API credentials.
    """

    COLOR_HEX = {
        "purple": ("#6b21a8", "#a855f7", "#c084fc"),
        "green": ("#065f46", "#10b981", "#34d399"),
        "orange": ("#c2410c", "#f97316", "#fb923c"),
        "blue": ("#1e3a8a", "#3b82f6", "#60a5fa"),
        "crimson": ("#991b1b", "#ef4444", "#f87171"),
    }

    CREATURE_EMOJIS = {
        "ghost": "👻",
        "vampire": "🧛",
        "witch": "🧙",
        "skeleton": "💀",
        "werewolf": "🐺",
        "pumpkin_spirit": "🎃",
    }

    ACCESSORY_EMOJIS = {
        "crown": "👑",
        "lantern": "🏮",
        "magic_staff": "🪄",
        "cape": "🦇",
        "headphones": "🎧",
        "spell_book": "📖",
    }

    def __init__(self, output_dir: str | Path = "src/halloween_quiz/web/static/avatars/generated"):
        self.output_dir = Path(output_dir)
        try:
            self.output_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass

    def generate_avatar(
        self, request: AvatarGenerationRequest, prompt: str, prompt_hash: str
    ) -> str:
        avatar_id = f"gen_{prompt_hash}"
        file_path = self.output_dir / f"{avatar_id}.svg"
        relative_url = f"/static/avatars/generated/{avatar_id}.svg"

        if file_path.exists():
            return relative_url

        dark_hex, mid_hex, light_hex = self.COLOR_HEX.get(
            request.color, self.COLOR_HEX["purple"]
        )
        c_emoji = self.CREATURE_EMOJIS.get(request.creature, "🎃")
        a_emoji = self.ACCESSORY_EMOJIS.get(request.accessory, "🏮")

        # Synthesize atmospheric SVG vector
        svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="{mid_hex}" stop-opacity="0.6"/>
      <stop offset="70%" stop-color="{dark_hex}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0a0518" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{light_hex}"/>
      <stop offset="100%" stop-color="{dark_hex}"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Background Vignette -->
  <rect width="200" height="200" rx="40" fill="url(#bgGlow)"/>

  <!-- Ornate Supernatural Frame Ring -->
  <circle cx="100" cy="100" r="88" fill="none" stroke="url(#ringGrad)" stroke-width="3" opacity="0.75" stroke-dasharray="10 4"/>
  <circle cx="100" cy="100" r="80" fill="#130924" fill-opacity="0.7"/>

  <!-- Spectral Particles / Embers -->
  <circle cx="45" cy="55" r="3" fill="{light_hex}" opacity="0.8"/>
  <circle cx="155" cy="65" r="2.5" fill="{light_hex}" opacity="0.7"/>
  <circle cx="35" cy="140" r="2" fill="{light_hex}" opacity="0.6"/>
  <circle cx="160" cy="135" r="3.5" fill="{light_hex}" opacity="0.85"/>

  <!-- Center Character Avatar Silhouette/Emoji -->
  <g filter="url(#shadow)">
    <circle cx="100" cy="105" r="50" fill="{dark_hex}" fill-opacity="0.4"/>
    <text x="100" y="125" font-size="72" text-anchor="middle" font-family="'Segoe UI Emoji', 'Apple Color Emoji', sans-serif">{c_emoji}</text>
  </g>

  <!-- Accessory Badge Overlay -->
  <g filter="url(#shadow)" transform="translate(132, 132)">
    <circle cx="14" cy="14" r="18" fill="#1e1035" stroke="{light_hex}" stroke-width="2"/>
    <text x="14" y="21" font-size="18" text-anchor="middle" font-family="'Segoe UI Emoji', 'Apple Color Emoji', sans-serif">{a_emoji}</text>
  </g>

  <!-- Supernatural Style Tag -->
  <rect x="50" y="172" width="100" height="18" rx="9" fill="#0d041a" fill-opacity="0.9" stroke="{mid_hex}" stroke-width="1"/>
  <text x="100" y="184" font-size="9" fill="{light_hex}" font-weight="bold" letter-spacing="1" text-anchor="middle" font-family="system-ui, sans-serif">{request.style.upper().replace('_', ' ')}</text>
</svg>"""

        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(svg_content)
            return relative_url
        except Exception as e:
            logger.warning(f"Failed to write SVG avatar file: {e}; falling back to data URI")
            import base64

            b64 = base64.b64encode(svg_content.encode("utf-8")).decode("utf-8")
            return f"data:image/svg+xml;base64,{b64}"


class AvatarService:
    """Coordinates avatar prompt engineering, safety moderation, rate limiting, and persistence."""

    def __init__(self, provider: BaseAvatarProvider | None = None) -> None:
        self.mock_provider = MockSvgAvatarProvider()
        self.active_provider: BaseAvatarProvider = provider or self.mock_provider
        self.rate_limiter = AvatarRateLimiter(cooldown_seconds=15, daily_cap=5)

    def generate_hunter_avatar(
        self, request: AvatarGenerationRequest, repo: Any = None
    ) -> AvatarGenerationResult:
        """Process, validate, synthesize, and store a personalized supernatural hunter."""
        # 1. Safety check
        is_safe, safety_msg = AvatarSafetyFilter.check_safety(request.customization)
        if not is_safe:
            raise ValueError(f"Safety constraint violated: {safety_msg}")

        # 2. Rate limit check
        allowed, wait_sec, limit_msg = self.rate_limiter.check_and_record(request.player_id)
        if not allowed:
            raise PermissionError(limit_msg)

        # 3. Server-side prompt construction
        constructed_prompt, prompt_hash = AvatarPromptBuilder.build(request)

        # 4. Check existing cached asset in repository
        if repo:
            cached_avatar = repo.get_generated_avatar_by_hash(prompt_hash)
            if cached_avatar:
                if cached_avatar.get("player_id") != request.player_id:
                    new_id = f"hunter_{uuid.uuid4().hex[:10]}"
                    new_avatar = {
                        "id": new_id,
                        "player_id": request.player_id,
                        "creature": cached_avatar["creature"],
                        "style": cached_avatar["style"],
                        "color": cached_avatar["color"],
                        "accessory": cached_avatar["accessory"],
                        "customization": cached_avatar["customization"],
                        "prompt_hash": prompt_hash,
                        "asset_url": cached_avatar["asset_url"],
                        "provider": cached_avatar["provider"],
                        "moderation_status": "approved",
                        "active": True,
                    }
                    repo.save_generated_avatar(new_avatar)
                    return AvatarGenerationResult(
                        avatar_id=new_id,
                        player_id=request.player_id,
                        asset_url=cached_avatar["asset_url"],
                        creature=cached_avatar["creature"],
                        style=cached_avatar["style"],
                        color=cached_avatar["color"],
                        accessory=cached_avatar["accessory"],
                        customization=cached_avatar["customization"],
                        prompt_hash=prompt_hash,
                        status="approved",
                        provider=cached_avatar["provider"],
                        cached=True,
                        created_at=datetime.now(timezone.utc).isoformat(),
                    )
                return AvatarGenerationResult(
                    avatar_id=cached_avatar["id"],
                    player_id=request.player_id,
                    asset_url=cached_avatar["asset_url"],
                    creature=cached_avatar["creature"],
                    style=cached_avatar["style"],
                    color=cached_avatar["color"],
                    accessory=cached_avatar["accessory"],
                    customization=cached_avatar["customization"],
                    prompt_hash=prompt_hash,
                    status="approved",
                    provider=cached_avatar["provider"],
                    cached=True,
                    created_at=cached_avatar["created_at"],
                )

        # 5. Call active provider
        avatar_id = f"hunter_{uuid.uuid4().hex[:10]}"
        asset_url = self.active_provider.generate_avatar(
            request, constructed_prompt, prompt_hash
        )

        result = AvatarGenerationResult(
            avatar_id=avatar_id,
            player_id=request.player_id,
            asset_url=asset_url,
            creature=request.creature,
            style=request.style,
            color=request.color,
            accessory=request.accessory,
            customization=request.customization,
            prompt_hash=prompt_hash,
            status="approved",
            provider=type(self.active_provider).__name__,
            cached=False,
        )

        # 6. Persist to storage
        if repo:
            repo.save_generated_avatar(result.model_dump())

        return result


# Global singleton instance
avatar_service = AvatarService()
