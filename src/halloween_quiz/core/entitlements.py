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
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from halloween_quiz.core.storage import ScoreRepository

logger = logging.getLogger("halloween_quiz.entitlements")


class EntitlementTier(str, Enum):
    FREE = "free"
    SPOOKY_PASS = "spooky_pass"  # One-time unlock ($4.99 proposed configuration)
    HAUNTED_VIP = "haunted_vip"  # Monthly recurring pass ($2.99/mo proposed configuration)


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
    is_guest: bool = True
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
    is_live_price: bool = False
    price_currency: str = "USD"
    notice: str = "Proposed configuration price (not a live storefront charge)"


class EntitlementCapabilities(BaseModel):
    tier: EntitlementTier
    tier_name: str
    unlocked_chapters: list[int]
    unlocked_avatars: list[str]
    unlocked_themes: list[str]
    unlocked_topics: list[str]
    is_ad_free: bool
    daily_diamond_bonus: int = 0
    competitive_advantage: bool = False  # Strictly False by design (Fairness Guarantee)


class EntitlementStatus(BaseModel):
    player_id: str
    tier: EntitlementTier
    is_premium: bool
    is_guest: bool = True
    storage_type: str = "durable_sqlite"
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
    is_live_price=False,
    price_currency="USD",
    notice="Proposed configuration price (not a live storefront charge)",
    features=[
        "Unlock Campaign Chapters 4, 5 & 6",
        "Exclusive Avatars: Phantom King, Shadow Witch, Vampire Lord, Banshee",
        "Cosmetic Themes: Blood Moon, Phantom Forest, Neon Crypt & Midnight Graveyard",
        "Advanced Trivia Packs: Cryptids, Cinema Masters & Global Folklore",
        "Ad-Free Spooky Experience",
        "100% Pure Cosmetics & Content (No Pay-to-Win Currency)",
        "Zero Pay-To-Win: Strict Fair Play Guarantee",
    ],
)

HAUNTED_VIP_PASS = ProductInfo(
    id="haunted_vip_monthly",
    tier=EntitlementTier.HAUNTED_VIP,
    title="Haunted VIP Pass",
    price_display="$2.99 / mo",
    billing_type="recurring",
    description="Seasonal VIP membership with supernatural flair and priority content access.",
    badge="VIP Subscription",
    is_live_price=False,
    price_currency="USD",
    notice="Proposed configuration price (not a live storefront charge)",
    features=[
        "Everything in Spooky Master Pass",
        "Priority Access to Future Seasonal Chapters",
        "VIP Golden Name Flair on Leaderboards",
        "Pure Prestige Flair & Visual Perks (Zero Gameplay Power-Ups)",
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
    """Server-authoritative entitlement manager backed by durable SQLite storage."""

    def __init__(self, repo: ScoreRepository | None = None) -> None:
        self.repo: ScoreRepository | None = repo
        self._player_tiers: dict[str, EntitlementTier] = {}

    def set_repository(self, repo: ScoreRepository) -> None:
        """Connect durable storage repository."""
        self.repo = repo

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
        """Controlled feature flags reflecting honest deployment state."""
        return {
            "FEATURE_PREMIUM": True,
            "FEATURE_ADS": False,  # Disabled: No ad network SDK is integrated
            "FEATURE_SUBSCRIPTIONS": False,  # Disabled: No external recurring billing gateway
            "FEATURE_SHARE_CARDS": True,
            "FEATURE_ADVANCED_TOPICS": True,
        }

    def set_player_tier(
        self,
        player_id: str,
        tier: EntitlementTier,
        is_guest: bool = True,
        source: str = "manual_override",
    ) -> None:
        """Assign or update a player's entitlement tier in memory and durable storage."""
        clean_id = (player_id or "guest_default").strip()
        self._player_tiers[clean_id] = tier
        if self.repo:
            try:
                self.repo.save_entitlement(
                    user_id=clean_id,
                    tier=tier.value,
                    source=source,
                    is_guest=is_guest,
                )
            except Exception as e:
                logger.warning(f"Failed to persist entitlement for {clean_id}: {e}")

    def resolve_tier(self, player_id: str, requested_tier: str | None = None) -> EntitlementTier:
        """Resolve a player's authoritative tier from durable store or dev override."""
        clean_id = (player_id or "guest_default").strip()

        # 1. Non-production dev override with requested tier
        if self.is_dev_override_allowed() and requested_tier:
            try:
                return EntitlementTier(requested_tier)
            except ValueError:
                pass

        # 2. Non-production default dev premium mode
        if self.is_dev_override_allowed() and os.getenv("DEV_PREMIUM_MODE", "false").lower() in (
            "true",
            "1",
        ):
            if clean_id in self._player_tiers:
                return self._player_tiers[clean_id]
            return EntitlementTier.SPOOKY_PASS

        # 3. Check in-memory cached state
        if clean_id in self._player_tiers:
            return self._player_tiers[clean_id]

        # 4. Durable repository query
        if self.repo:
            try:
                record = self.repo.get_entitlement(clean_id)
                if record and record.get("is_active"):
                    exp = record.get("expires_at")
                    if exp and exp.tzinfo is None:
                        exp = exp.replace(tzinfo=timezone.utc)
                    if exp and exp < datetime.now(timezone.utc):
                        # Expired subscription
                        pass
                    else:
                        t_val = record.get("tier", "free")
                        try:
                            tier_enum = EntitlementTier(t_val)
                            self._player_tiers[clean_id] = tier_enum
                            return tier_enum
                        except ValueError:
                            pass
            except Exception as e:
                logger.warning(f"Error querying entitlement store for {clean_id}: {e}")

        return EntitlementTier.FREE

    def get_capabilities(self, tier: EntitlementTier) -> EntitlementCapabilities:
        """Return granted capabilities for an entitlement tier under Policy A (Zero Pay-to-Win)."""
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
            daily_diamond_bonus=0,  # Policy A: Zero Pay-To-Win (Diamonds are strictly earned in-game)
            competitive_advantage=False,  # Strict Non-Negotiable Fairness
        )

    def can_access_chapter(self, tier: EntitlementTier, chapter_number: int) -> bool:
        """Chapters 1-3 are free; chapters 4-6 require premium pass."""
        if chapter_number <= 3:
            return True
        return tier in (EntitlementTier.SPOOKY_PASS, EntitlementTier.HAUNTED_VIP)

    def can_use_avatar(self, tier: EntitlementTier, avatar_id: str) -> bool:
        """Standard and generated hunter avatars are free; premium avatars require pass."""
        if avatar_id in STANDARD_AVATARS:
            return True
        if avatar_id.startswith("hunter_") or avatar_id.startswith("gen_"):
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
        clean_id = (player_id or "guest_default").strip()
        is_guest = True
        if self.repo:
            rec = self.repo.get_entitlement(clean_id)
            if rec:
                is_guest = bool(rec.get("is_guest", True))
        tier = self.resolve_tier(clean_id, requested_tier)
        capabilities = self.get_capabilities(tier)
        is_premium = tier in (EntitlementTier.SPOOKY_PASS, EntitlementTier.HAUNTED_VIP)

        return EntitlementStatus(
            player_id=clean_id,
            tier=tier,
            is_premium=is_premium,
            is_guest=is_guest,
            storage_type="durable_sqlite" if self.repo else "in_memory_fallback",
            capabilities=capabilities,
            catalog=PRODUCT_CATALOG,
            environment=self.environment,
            dev_override_active=self.is_dev_override_allowed(),
            feature_flags=self.get_feature_flags(),
        )


# Global singleton service
entitlement_service = EntitlementService()
