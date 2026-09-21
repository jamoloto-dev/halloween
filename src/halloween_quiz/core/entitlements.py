"""Entitlement and Monetization Architecture for Spooky Master / Halloween Quiz.

Manages player entitlement tiers (Free, Spooky Master Pass, Haunted VIP),
feature gating (Campaign chapters 4-6, supernatural avatars, cosmetic themes,
advanced trivia topics), ad-free indicators, and strict competitive fairness rules.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field

logger = logging.getLogger("halloween_quiz.entitlements")


class EntitlementTier(str, Enum):
    FREE = "free"
    SPOOKY_PASS = "spooky_pass"  # One-time unlock ($4.99)
    HAUNTED_VIP = "haunted_vip"  # Monthly recurring pass ($2.99/mo)


class EntitlementRecordStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    PENDING = "pending"


class UserEntitlement(BaseModel):
    """Authoritative entitlement record for persistent or synced identity."""

    user_id: str
    entitlement: str  # e.g. "spooky_pass", "haunted_vip", "ad_free"
    source: str = "store"  # "stripe", "apple_app_store", "google_play", "manual_dev"
    provider_reference: str | None = None
    status: EntitlementRecordStatus = EntitlementRecordStatus.ACTIVE
    granted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductInfo(BaseModel):
    id: str
    tier: EntitlementTier
    title: str
    price_display: str
    billing_type: str  # "one_time" | "recurring"
    description: str
    badge: str
    features: list[str]


class EntitlementCapabilities(BaseModel):
    tier: EntitlementTier
    tier_name: str
    unlocked_chapters: list[int]
    unlocked_avatars: list[str]
    unlocked_themes: list[str]
    unlocked_topics: list[str]
    is_ad_free: bool
    daily_diamond_bonus: int
    competitive_advantage: bool = False  # Strictly False by design (Fairness Guarantee)


class EntitlementStatus(BaseModel):
    player_id: str
    tier: EntitlementTier
    is_premium: bool
    capabilities: EntitlementCapabilities
    catalog: list[ProductInfo]
    environment: str
    dev_override_active: bool = False
    feature_flags: dict[str, bool] = Field(default_factory=dict)


# Canonical products
SPOOKY_MASTER_PASS = ProductInfo(
    id="spooky_pass_lifetime",
    tier=EntitlementTier.SPOOKY_PASS,
    title="Spooky Master Pass",
    price_display="$4.99",
    billing_type="one_time",
    description="Permanent unlock for all campaign chapters, supernatural guises, premium themes, and advanced topics.",
    badge="Lifetime Unlock",
    features=[
        "Unlock Campaign Chapters 4, 5 & 6",
        "Exclusive Avatars: Phantom King, Shadow Witch, Vampire Lord, Banshee",
        "Cosmetic Themes: Blood Moon, Phantom Forest, Neon Crypt & Midnight Graveyard",
        "Advanced Trivia Packs: Cryptids, Cinema Masters & Global Folklore",
        "Ad-Free Spooky Experience",
        "Bonus +50 Daily Haunt Diamonds",
        "Zero Pay-To-Win: Strict Fair Play Guarantee",
    ],
)

HAUNTED_VIP_PASS = ProductInfo(
    id="haunted_vip_monthly",
    tier=EntitlementTier.HAUNTED_VIP,
    title="Haunted VIP Pass",
    price_display="$2.99 / mo",
    billing_type="recurring",
    description="Seasonal VIP membership with recurring diamond drops and supernatural flair.",
    badge="VIP Subscription",
    features=[
        "Everything in Spooky Master Pass",
        "Priority Access to Future Seasonal Chapters",
        "VIP Golden Name Flair on Leaderboards",
        "Continuous +50 Daily Diamond Grant",
        "Cancel Anytime in Account Settings",
        "Zero Pay-To-Win: Strict Fair Play Guarantee",
    ],
)

PRODUCT_CATALOG: list[ProductInfo] = [SPOOKY_MASTER_PASS, HAUNTED_VIP_PASS]

# Standard vs Premium Avatars
STANDARD_AVATARS = [
    "pumpkin_hunter",
    "ghost",
    "vampire",
    "witch",
    "skeleton",
    "zombie",
    "werewolf",
    "night_bat",
]

PREMIUM_AVATARS = [
    "phantom_king",
    "shadow_witch",
    "vampire_lord",
    "banshee",
]

# Standard vs Premium Themes
STANDARD_THEMES = ["default", "haunted_mansion"]
PREMIUM_THEMES = ["blood_moon", "phantom_forest", "neon_crypt", "midnight_graveyard"]

# Additive Premium Trivia Packs (Preserving canonical 6 categories)
PREMIUM_TOPICS_METADATA = {
    "cryptids": {
        "id": "cryptids",
        "name": "Cryptids & Urban Legends",
        "icon": "👣",
        "description": "Mothman, Wendigo, Jersey Devil, and nocturnal folklore creatures.",
        "badge": "Pass Pack",
        "required_entitlement": "spooky_pass",
    },
    "cinema_masters": {
        "id": "cinema_masters",
        "name": "Horror Cinema Masters",
        "icon": "📽️",
        "description": "Deep cuts from classic vintage horror, giallo, and supernatural thrillers.",
        "badge": "Pass Pack",
        "required_entitlement": "spooky_pass",
    },
    "global_folklore": {
        "id": "global_folklore",
        "name": "Global Supernatural Folklore",
        "icon": "🔮",
        "description": "Yokai, Celtic banshees, La Llorona, and worldwide midnight mythologies.",
        "badge": "Pass Pack",
        "required_entitlement": "spooky_pass",
    },
}


class EntitlementService:
    """Server-authoritative entitlement manager with strict non-production dev override."""

    def __init__(self) -> None:
        # In-memory store for session/player entitlement state
        self._player_tiers: dict[str, EntitlementTier] = {}
        self._user_records: dict[str, list[UserEntitlement]] = {}

    @property
    def environment(self) -> str:
        return os.getenv("ENVIRONMENT", "development").lower()

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    def is_dev_override_allowed(self) -> bool:
        """Dev override is only permitted in non-production environments."""
        if self.is_production:
            return False
        return os.getenv("DEV_PREMIUM_MODE", "false").lower() in ("true", "1", "yes")

    def get_feature_flags(self) -> dict[str, bool]:
        """Controlled feature flags."""
        return {
            "FEATURE_PREMIUM": True,
            "FEATURE_ADS": True,
            "FEATURE_SUBSCRIPTIONS": True,
            "FEATURE_SHARE_CARDS": True,
            "FEATURE_ADVANCED_TOPICS": True,
        }

    def set_player_tier(self, player_id: str, tier: EntitlementTier) -> None:
        """Assign or update a player's entitlement tier."""
        self._player_tiers[player_id] = tier

    def resolve_tier(self, player_id: str, requested_tier: str | None = None) -> EntitlementTier:
        """Resolve a player's authoritative tier, honoring safe dev override only if permitted."""
        # Non-production dev override with requested tier
        if self.is_dev_override_allowed() and requested_tier:
            try:
                return EntitlementTier(requested_tier)
            except ValueError:
                pass

        # Non-production default dev premium mode
        if self.is_dev_override_allowed() and os.getenv("DEV_PREMIUM_MODE", "false").lower() in (
            "true",
            "1",
        ):
            return self._player_tiers.get(player_id, EntitlementTier.SPOOKY_PASS)

        return self._player_tiers.get(player_id, EntitlementTier.FREE)

    def get_capabilities(self, tier: EntitlementTier) -> EntitlementCapabilities:
        """Return granted capabilities for an entitlement tier."""
        is_premium = tier in (EntitlementTier.SPOOKY_PASS, EntitlementTier.HAUNTED_VIP)
        unlocked_chapters = [1, 2, 3] + ([4, 5, 6] if is_premium else [])
        unlocked_avatars = list(STANDARD_AVATARS) + (list(PREMIUM_AVATARS) if is_premium else [])
        unlocked_themes = list(STANDARD_THEMES) + (list(PREMIUM_THEMES) if is_premium else [])
        unlocked_topics = list(PREMIUM_TOPICS_METADATA.keys()) if is_premium else []

        tier_name = {
            EntitlementTier.FREE: "Free Adventurer",
            EntitlementTier.SPOOKY_PASS: "Spooky Master Pass",
            EntitlementTier.HAUNTED_VIP: "Haunted VIP",
        }.get(tier, "Free Adventurer")

        return EntitlementCapabilities(
            tier=tier,
            tier_name=tier_name,
            unlocked_chapters=unlocked_chapters,
            unlocked_avatars=unlocked_avatars,
            unlocked_themes=unlocked_themes,
            unlocked_topics=unlocked_topics,
            is_ad_free=is_premium,
            daily_diamond_bonus=50 if is_premium else 0,
            competitive_advantage=False,  # Strict Non-Negotiable Fairness
        )

    def can_access_chapter(self, tier: EntitlementTier, chapter_number: int) -> bool:
        """Chapters 1-3 are free; chapters 4-6 require premium pass."""
        if chapter_number <= 3:
            return True
        return tier in (EntitlementTier.SPOOKY_PASS, EntitlementTier.HAUNTED_VIP)

    def can_use_avatar(self, tier: EntitlementTier, avatar_id: str) -> bool:
        """Supernatural avatars require premium pass."""
        if avatar_id in STANDARD_AVATARS:
            return True
        if avatar_id in PREMIUM_AVATARS:
            return tier in (EntitlementTier.SPOOKY_PASS, EntitlementTier.HAUNTED_VIP)
        return False

    def can_use_theme(self, tier: EntitlementTier, theme_id: str) -> bool:
        """Cosmetic themes require premium pass."""
        if theme_id in STANDARD_THEMES:
            return True
        if theme_id in PREMIUM_THEMES:
            return tier in (EntitlementTier.SPOOKY_PASS, EntitlementTier.HAUNTED_VIP)
        return False

    def can_access_topic(self, tier: EntitlementTier, topic_id: str) -> bool:
        """Additive premium trivia packs require premium pass."""
        if topic_id not in PREMIUM_TOPICS_METADATA:
            return True
        return tier in (EntitlementTier.SPOOKY_PASS, EntitlementTier.HAUNTED_VIP)

    def get_status(
        self,
        player_id: str,
        requested_tier: str | None = None,
    ) -> EntitlementStatus:
        """Full status payload for frontend consumption."""
        tier = self.resolve_tier(player_id, requested_tier)
        capabilities = self.get_capabilities(tier)
        is_premium = tier in (EntitlementTier.SPOOKY_PASS, EntitlementTier.HAUNTED_VIP)

        return EntitlementStatus(
            player_id=player_id,
            tier=tier,
            is_premium=is_premium,
            capabilities=capabilities,
            catalog=PRODUCT_CATALOG,
            environment=self.environment,
            dev_override_active=self.is_dev_override_allowed(),
            feature_flags=self.get_feature_flags(),
        )


# Global singleton service
entitlement_service = EntitlementService()
