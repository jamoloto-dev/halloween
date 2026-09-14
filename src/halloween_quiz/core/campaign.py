"""Campaign Chapter and Stage Progression models for The Haunted Journey."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from halloween_quiz.core.models import Difficulty


class StageType(str, Enum):
    STANDARD = "standard"
    CHALLENGE = "challenge"
    BOSS = "boss"


class Stage(BaseModel):
    id: str
    chapter_id: str
    stage_number: int
    title: str
    description: str
    question_count: int = 5
    categories: list[str] = Field(default_factory=lambda: ["spooky"])
    difficulty: Difficulty = Difficulty.EASY
    stage_type: StageType = StageType.STANDARD
    reward_diamonds: int = 25
    unlock_requirement: str | None = None
    special_rules: dict[str, Any] = Field(default_factory=dict)


class Chapter(BaseModel):
    id: str
    chapter_number: int
    title: str
    subtitle: str
    description: str
    story_intro: str
    icon: str
    stages: list[Stage]
    completion_reward_diamonds: int = 100
    unlock_requirement: str | None = None


# Canonical Campaign Chapters for The Haunted Journey
CAMPAIGN_CHAPTERS: list[Chapter] = [
    Chapter(
        id="ch1_abandoned_manor",
        chapter_number=1,
        title="The Abandoned Manor",
        subtitle="Chapter 1 · Where the Shadows Linger",
        description="Explore the crumbling hallways and creaking floorboards of Blackwood Manor.",
        story_intro=(
            "The iron gates of Blackwood Manor screech open before you. A chill wind carries whispers "
            "from the past through shattered stained-glass windows. Dust motes dance in the moonlight, "
            "and in the gloom, ancient portraits seem to turn their heads as you cross the threshold..."
        ),
        icon="🏚️",
        stages=[
            Stage(
                id="ch1_s1",
                chapter_id="ch1_abandoned_manor",
                stage_number=1,
                title="The Wrought-Iron Gate",
                description="Test your baseline knowledge of urban legends and ghost lore.",
                question_count=5,
                categories=["spooky"],
                difficulty=Difficulty.EASY,
                reward_diamonds=20,
                unlock_requirement=None,
            ),
            Stage(
                id="ch1_s2",
                chapter_id="ch1_abandoned_manor",
                stage_number=2,
                title="The Grand Foyer",
                description="Uncover ancient traditions and historic folklore lingering in the foyer.",
                question_count=5,
                categories=["spooky", "history"],
                difficulty=Difficulty.EASY,
                reward_diamonds=25,
                unlock_requirement="ch1_s1",
            ),
            Stage(
                id="ch1_s3",
                chapter_id="ch1_abandoned_manor",
                stage_number=3,
                title="The Cold Library",
                description="Decipher dusty horror cinema volumes and eerie tales.",
                question_count=8,
                categories=["spooky", "movies"],
                difficulty=Difficulty.MEDIUM,
                reward_diamonds=30,
                unlock_requirement="ch1_s2",
            ),
            Stage(
                id="ch1_boss",
                chapter_id="ch1_abandoned_manor",
                stage_number=4,
                title="Chapter Challenge: Spirit of Blackwood",
                description="Confront the phantom resident of the manor in a multi-category trial!",
                question_count=10,
                categories=["spooky", "history", "movies", "paranormal"],
                difficulty=Difficulty.MEDIUM,
                stage_type=StageType.BOSS,
                reward_diamonds=50,
                unlock_requirement="ch1_s3",
                special_rules={"boss": True, "time_limit": 20},
            ),
        ],
        completion_reward_diamonds=100,
        unlock_requirement=None,
    ),
    Chapter(
        id="ch2_whispering_forest",
        chapter_number=2,
        title="The Whispering Forest",
        subtitle="Chapter 2 · Into the Tangled Mist",
        description="Navigate ancient gnarled boughs, dancing will-o'-the-wisps, and forest cryptids.",
        story_intro=(
            "Leaving the manor behind, you step beneath the twisted canopy of the Whispering Forest. "
            "Fog clutches at your boots like desperate fingers. The trees hum with forgotten Samhain chants, "
            "and strange glowing eyes blink from the hollow trunks of ancient oaks..."
        ),
        icon="🌲",
        stages=[
            Stage(
                id="ch2_s1",
                chapter_id="ch2_whispering_forest",
                stage_number=1,
                title="The Foggy Crossroads",
                description="Explore historical Samhain origins and autumn superstitions.",
                question_count=5,
                categories=["history"],
                difficulty=Difficulty.EASY,
                reward_diamonds=25,
                unlock_requirement="ch1_boss",
            ),
            Stage(
                id="ch2_s2",
                chapter_id="ch2_whispering_forest",
                stage_number=2,
                title="Witch's Hollow",
                description="Identify magical costume traditions and folklore rituals.",
                question_count=8,
                categories=["costumes", "spooky"],
                difficulty=Difficulty.MEDIUM,
                reward_diamonds=30,
                unlock_requirement="ch2_s1",
            ),
            Stage(
                id="ch2_s3",
                chapter_id="ch2_whispering_forest",
                stage_number=3,
                title="The Cryptid Grove",
                description="Face elusive cryptids and paranormal apparitions in the deep woods.",
                question_count=8,
                categories=["paranormal"],
                difficulty=Difficulty.MEDIUM,
                reward_diamonds=35,
                unlock_requirement="ch2_s2",
            ),
            Stage(
                id="ch2_boss",
                chapter_id="ch2_whispering_forest",
                stage_number=4,
                title="Chapter Challenge: The Ancient Woodwose",
                description="Survive the master of the wilderness in a speed trial!",
                question_count=10,
                categories=["history", "costumes", "paranormal"],
                difficulty=Difficulty.MEDIUM,
                stage_type=StageType.BOSS,
                reward_diamonds=60,
                unlock_requirement="ch2_s3",
                special_rules={"boss": True, "time_limit": 18},
            ),
        ],
        completion_reward_diamonds=120,
        unlock_requirement="ch1_abandoned_manor",
    ),
    Chapter(
        id="ch3_carnival_lost_souls",
        chapter_number=3,
        title="Carnival of Lost Souls",
        subtitle="Chapter 3 · The Midnight Sideshow",
        description="A decrepit traveling fairground where the calliope plays backwards.",
        story_intro=(
            "A carnival tent rises against the blood-red horizon. Derelict carousel horses with grinning jaws "
            "creak in the night breeze. Spectral performers juggle embers, and the fortune teller's crystal ball "
            "reveals questions that test the keenest minds..."
        ),
        icon="🎪",
        stages=[
            Stage(
                id="ch3_s1",
                chapter_id="ch3_carnival_lost_souls",
                stage_number=1,
                title="The Funhouse Mirrors",
                description="Twisted cinematic illusions and classic horror tropes.",
                question_count=6,
                categories=["movies"],
                difficulty=Difficulty.MEDIUM,
                reward_diamonds=30,
                unlock_requirement="ch2_boss",
            ),
            Stage(
                id="ch3_s2",
                chapter_id="ch3_carnival_lost_souls",
                stage_number=2,
                title="The Sugar Cauldron",
                description="Unwrap the sweet and savory secrets of Halloween candy and treats.",
                question_count=8,
                categories=["candy"],
                difficulty=Difficulty.MEDIUM,
                reward_diamonds=35,
                unlock_requirement="ch3_s1",
            ),
            Stage(
                id="ch3_s3",
                chapter_id="ch3_carnival_lost_souls",
                stage_number=3,
                title="The Hall of Phantoms",
                description="Identify ghostly occurrences and famous paranormal investigations.",
                question_count=8,
                categories=["paranormal", "spooky"],
                difficulty=Difficulty.MEDIUM,
                reward_diamonds=40,
                unlock_requirement="ch3_s2",
            ),
            Stage(
                id="ch3_boss",
                chapter_id="ch3_carnival_lost_souls",
                stage_number=4,
                title="Chapter Challenge: The Phantom Ringmaster",
                description="Match wits with the carnival's enigmatic host.",
                question_count=10,
                categories=["movies", "candy", "paranormal"],
                difficulty=Difficulty.HARD,
                stage_type=StageType.BOSS,
                reward_diamonds=70,
                unlock_requirement="ch3_s3",
                special_rules={"boss": True, "time_limit": 15},
            ),
        ],
        completion_reward_diamonds=150,
        unlock_requirement="ch2_whispering_forest",
    ),
    Chapter(
        id="ch4_forgotten_graveyard",
        chapter_number=4,
        title="The Forgotten Graveyard",
        subtitle="Chapter 4 · Beneath the Mossy Slabs",
        description="Weathered tombstones, sunken mausoleums, and timeless epitaphs.",
        story_intro=(
            "Centuries of autumn leaves smother the cracked slate markers of the hillside cemetery. "
            "Will-o'-the-wisps flicker over freshly disturbed soil. The crypt keeper's lantern beckons you "
            "toward the iron gates of the catacombs..."
        ),
        icon="🪦",
        stages=[
            Stage(
                id="ch4_s1",
                chapter_id="ch4_forgotten_graveyard",
                stage_number=1,
                title="The Mausoleum Steps",
                description="Ancient historical customs of honoring and warding off the dead.",
                question_count=6,
                categories=["history"],
                difficulty=Difficulty.MEDIUM,
                reward_diamonds=35,
                unlock_requirement="ch3_boss",
            ),
            Stage(
                id="ch4_s2",
                chapter_id="ch4_forgotten_graveyard",
                stage_number=2,
                title="The Charnel Walk",
                description="Gothic horror classics and cemetery cinema.",
                question_count=8,
                categories=["movies", "spooky"],
                difficulty=Difficulty.HARD,
                reward_diamonds=40,
                unlock_requirement="ch4_s1",
            ),
            Stage(
                id="ch4_s3",
                chapter_id="ch4_forgotten_graveyard",
                stage_number=3,
                title="The Whispering Vault",
                description="Paranormal EVP recordings and spectral phenomena.",
                question_count=8,
                categories=["paranormal"],
                difficulty=Difficulty.HARD,
                reward_diamonds=45,
                unlock_requirement="ch4_s2",
            ),
            Stage(
                id="ch4_boss",
                chapter_id="ch4_forgotten_graveyard",
                stage_number=4,
                title="Chapter Challenge: The Crypt Keeper's Trial",
                description="Withstand the guardian of the underground vaults.",
                question_count=10,
                categories=["history", "movies", "paranormal"],
                difficulty=Difficulty.HARD,
                stage_type=StageType.BOSS,
                reward_diamonds=80,
                unlock_requirement="ch4_s3",
                special_rules={"boss": True, "time_limit": 14},
            ),
        ],
        completion_reward_diamonds=180,
        unlock_requirement="ch3_carnival_lost_souls",
    ),
    Chapter(
        id="ch5_castle_eternal_night",
        chapter_number=5,
        title="Castle of Eternal Night",
        subtitle="Chapter 5 · Spire of the Blood Moon",
        description="A gothic citadel towering above jagged cliffs where the moon never sets.",
        story_intro=(
            "Carved from obsidian rock, the citadel pierces the crimson clouds. Raven sentinels watch "
            "from dizzying gargoyle perches. Inside, grand velvet halls echo with eerie chamber music, "
            "and shadowy figures glide between candelabras..."
        ),
        icon="🏰",
        stages=[
            Stage(
                id="ch5_s1",
                chapter_id="ch5_castle_eternal_night",
                stage_number=1,
                title="The Drawbridge",
                description="Legendary monster lore and historic masquerades.",
                question_count=6,
                categories=["costumes", "spooky"],
                difficulty=Difficulty.HARD,
                reward_diamonds=40,
                unlock_requirement="ch4_boss",
            ),
            Stage(
                id="ch5_s2",
                chapter_id="ch5_castle_eternal_night",
                stage_number=2,
                title="The Banquet of Phantoms",
                description="Confectionery mysteries and dark historical feasts.",
                question_count=8,
                categories=["candy", "history"],
                difficulty=Difficulty.HARD,
                reward_diamonds=45,
                unlock_requirement="ch5_s1",
            ),
            Stage(
                id="ch5_s3",
                chapter_id="ch5_castle_eternal_night",
                stage_number=3,
                title="The Sanguine Tower",
                description="Deep-cut horror films, director trivia, and cult favorites.",
                question_count=10,
                categories=["movies"],
                difficulty=Difficulty.HARD,
                reward_diamonds=50,
                unlock_requirement="ch5_s2",
            ),
            Stage(
                id="ch5_boss",
                chapter_id="ch5_castle_eternal_night",
                stage_number=4,
                title="Chapter Challenge: The Vampire Lord",
                description="Survive the ultimate midnight duel in the castle throne room.",
                question_count=12,
                categories=["movies", "spooky", "costumes", "history"],
                difficulty=Difficulty.HARD,
                stage_type=StageType.BOSS,
                reward_diamonds=100,
                unlock_requirement="ch5_s3",
                special_rules={"boss": True, "time_limit": 12},
            ),
        ],
        completion_reward_diamonds=220,
        unlock_requirement="ch4_forgotten_graveyard",
    ),
    Chapter(
        id="ch6_midnight_realm",
        chapter_number=6,
        title="The Midnight Realm",
        subtitle="Chapter 6 · Realm of the Spooky Master",
        description="The nexus of all spectral knowledge where dimensions blur and reality dissolves.",
        story_intro=(
            "The skies shatter into a kaleidoscope of cosmic aurora and autumn leaves. You stand before "
            "the Great Jack-o'-Lantern at the heart of the Midnight Realm. Every mystery you have unraveled "
            "leads to this final confrontation..."
        ),
        icon="🌌",
        stages=[
            Stage(
                id="ch6_s1",
                chapter_id="ch6_midnight_realm",
                stage_number=1,
                title="The Cosmic Threshold",
                description="High-tier multi-category rapid fire challenge.",
                question_count=8,
                categories=["spooky", "movies", "paranormal"],
                difficulty=Difficulty.HARD,
                reward_diamonds=50,
                unlock_requirement="ch5_boss",
            ),
            Stage(
                id="ch6_s2",
                chapter_id="ch6_midnight_realm",
                stage_number=2,
                title="The All-Seeing Séance",
                description="Obscure paranormal phenomena and esoteric folklore.",
                question_count=10,
                categories=["paranormal", "history", "candy"],
                difficulty=Difficulty.HARD,
                reward_diamonds=60,
                unlock_requirement="ch6_s1",
            ),
            Stage(
                id="ch6_s3",
                chapter_id="ch6_midnight_realm",
                stage_number=3,
                title="The Gauntlet of Shadows",
                description="All 6 categories in a relentless barrage of trivia.",
                question_count=12,
                categories=["spooky", "costumes", "movies", "history", "candy", "paranormal"],
                difficulty=Difficulty.HARD,
                reward_diamonds=75,
                unlock_requirement="ch6_s2",
            ),
            Stage(
                id="ch6_boss",
                chapter_id="ch6_midnight_realm",
                stage_number=4,
                title="The Spooky Master Final Trial",
                description="The ultimate test of Halloween supremacy! Claim the title of Spooky Master.",
                question_count=15,
                categories=["spooky", "costumes", "movies", "history", "candy", "paranormal"],
                difficulty=Difficulty.HARD,
                stage_type=StageType.BOSS,
                reward_diamonds=200,
                unlock_requirement="ch6_s3",
                special_rules={"boss": True, "time_limit": 10},
            ),
        ],
        completion_reward_diamonds=350,
        unlock_requirement="ch5_castle_eternal_night",
    ),
]


def get_all_chapters() -> list[Chapter]:
    """Return all campaign chapters."""
    return CAMPAIGN_CHAPTERS


def get_chapter_by_id(chapter_id: str) -> Chapter | None:
    """Find a chapter by id."""
    for ch in CAMPAIGN_CHAPTERS:
        if ch.id == chapter_id:
            return ch
    return None


def get_stage_by_id(stage_id: str) -> Stage | None:
    """Find a stage by id."""
    for ch in CAMPAIGN_CHAPTERS:
        for st in ch.stages:
            if st.id == stage_id:
                return st
    return None


def calculate_stage_stars(accuracy: float) -> int:
    """Deterministic star rating based on accuracy:
    ⭐ 1 star: stage complete
    ⭐⭐ 2 stars: 75%+ accuracy
    ⭐⭐⭐ 3 stars: 90%+ accuracy
    """
    if accuracy >= 90.0:
        return 3
    if accuracy >= 75.0:
        return 2
    return 1
