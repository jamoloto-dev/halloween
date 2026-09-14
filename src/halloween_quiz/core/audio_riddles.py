"""Audio Riddle Question models, procedural clip registry, and accessible descriptions."""

from pydantic import BaseModel

from halloween_quiz.core.models import Difficulty


class AudioRiddleQuestion(BaseModel):
    id: str
    category: str = "paranormal"
    difficulty: Difficulty = Difficulty.MEDIUM
    question: str
    audio_clip_id: str  # maps to procedural web audio synthesizer
    clip_duration_seconds: float = 3.5
    accessible_transcript: str  # Screen reader and muted accessible transcript
    options: list[str]
    correct_answer: str
    explanation: str


AUDIO_RIDDLES: list[AudioRiddleQuestion] = [
    AudioRiddleQuestion(
        id="riddle_werewolf",
        category="paranormal",
        difficulty=Difficulty.EASY,
        question="Listen closely to the midnight creature. Which beast makes this spine-chilling cry?",
        audio_clip_id="werewolf_howl",
        clip_duration_seconds=3.8,
        accessible_transcript=(
            "Accessible Audio Clue: A deep, resonant wolf howl that rises in pitch before descending into "
            "a guttural midnight growl under a full moon."
        ),
        options=["Lunar Werewolf", "Banshee", "Crypt Vampire", "Grave Walker"],
        correct_answer="Lunar Werewolf",
        explanation="The rising frequency and guttural overtone is the iconic acoustic signature of the werewolf howl.",
    ),
    AudioRiddleQuestion(
        id="riddle_ghost",
        category="spooky",
        difficulty=Difficulty.EASY,
        question="A cold draft chills the air as an ethereal entity laments. What presence is this?",
        audio_clip_id="ghost_wail",
        clip_duration_seconds=3.2,
        accessible_transcript=(
            "Accessible Audio Clue: A wailing, airy harmonic whistle that reverberates with a soft, eerie vibrato."
        ),
        options=["Spectral Ghost", "Poltergeist", "Black Cat", "Gargoyle"],
        correct_answer="Spectral Ghost",
        explanation="The spectral whistle and high-frequency resonance characterize a phantom wail.",
    ),
    AudioRiddleQuestion(
        id="riddle_crypt_door",
        category="history",
        difficulty=Difficulty.MEDIUM,
        question="A heavy stone and rusted iron mechanism echoes through the catacombs. What just moved?",
        audio_clip_id="crypt_door",
        clip_duration_seconds=3.0,
        accessible_transcript=(
            "Accessible Audio Clue: A slow, low-frequency creaking of rusted iron hinges followed by a heavy granite thud."
        ),
        options=[
            "Ancient Crypt Portal",
            "Falling Guilliotine",
            "Drawbridge Chain",
            "Tomb Sarcophagus",
        ],
        correct_answer="Ancient Crypt Portal",
        explanation="The resonant scrape of iron and stone indicates an ancient crypt door swinging open.",
    ),
    AudioRiddleQuestion(
        id="riddle_witch",
        category="costumes",
        difficulty=Difficulty.MEDIUM,
        question="A cauldron bubbles over embers as high-pitched laughter rings across the woods. Who laughs?",
        audio_clip_id="witch_cackle",
        clip_duration_seconds=2.8,
        accessible_transcript=(
            "Accessible Audio Clue: A rapid, staccato cackling laugh shifting between high octaves with bubbling liquid below."
        ),
        options=["Mystic Witch", "Vampire Lord", "Goblin Scout", "Harpy"],
        correct_answer="Mystic Witch",
        explanation="The classic witch cackle features rapid pitch inflections paired with bubbling cauldron tones.",
    ),
    AudioRiddleQuestion(
        id="riddle_bat_swarm",
        category="movies",
        difficulty=Difficulty.HARD,
        question="High-frequency squeaks and rapid wing-flutters fill the cavern ceiling. What approaches?",
        audio_clip_id="bat_swarm",
        clip_duration_seconds=2.5,
        accessible_transcript=(
            "Accessible Audio Clue: Rapid ultrasonic chirping clicks accompanied by the whirring flutter of dozens of leathery wings."
        ),
        options=["Night Bat Swarm", "Locust Plague", "Raven Flock", "Spectral Bats"],
        correct_answer="Night Bat Swarm",
        explanation="Echolocation clicks and leathery wing fluttering signify a disturbed cavern bat colony.",
    ),
]

PROCEDURAL_AUDIO_RIDDLES = AUDIO_RIDDLES


def get_all_audio_riddles() -> list[AudioRiddleQuestion]:
    return AUDIO_RIDDLES


def get_audio_riddle_by_id(riddle_id: str) -> AudioRiddleQuestion | None:
    for r in AUDIO_RIDDLES:
        if r.id == riddle_id:
            return r
    return None
