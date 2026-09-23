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
    AudioRiddleQuestion(
        id="riddle_church_bell",
        category="history",
        difficulty=Difficulty.EASY,
        question="A solemn, deep bronze resonance tolls from a distant parish spire across the misty moors. What sound is this?",
        audio_clip_id="church_bell",
        clip_duration_seconds=3.5,
        accessible_transcript=(
            "Accessible Audio Clue: A deep, resonant bronze church bell tolling with long metallic harmonic reverberation."
        ),
        options=["Church Bell", "Ship Foghorn", "Fire Alarm", "Grandfather Clock"],
        correct_answer="Church Bell",
        explanation="The deep fundamental frequency and rich bronze overtones mark a gothic bell tolling the midnight hour.",
    ),
    AudioRiddleQuestion(
        id="riddle_thunder",
        category="spooky",
        difficulty=Difficulty.EASY,
        question="A sudden low-frequency acoustic rumble shakes the windows of the manor. What atmospheric event just occurred?",
        audio_clip_id="thunder",
        clip_duration_seconds=3.2,
        accessible_transcript=(
            "Accessible Audio Clue: A heavy, rumbling crack followed by a deep rolling bass rumble of distant thunder."
        ),
        options=["Distant Thunder", "Earth Tremor", "Cannon Fire", "Avalanche"],
        correct_answer="Distant Thunder",
        explanation="The sudden crack and low rolling bass rumble is the classic signature of atmospheric lightning and thunder.",
    ),
    AudioRiddleQuestion(
        id="riddle_chains",
        category="paranormal",
        difficulty=Difficulty.MEDIUM,
        question="Heavy rusted metallic links drag and scrape along the dungeon flagstones. What is creating this sound?",
        audio_clip_id="chains",
        clip_duration_seconds=2.8,
        accessible_transcript=(
            "Accessible Audio Clue: Heavy metallic clinking and scraping of iron chain links dragging across cold stone."
        ),
        options=["Rattling Chains", "Swords Clashing", "Coins Spilling", "Armor Dropping"],
        correct_answer="Rattling Chains",
        explanation="Rattling chains are an enduring motif of restless spirits such as Jacob Marley in classic ghost lore.",
    ),
    AudioRiddleQuestion(
        id="riddle_crow",
        category="spooky",
        difficulty=Difficulty.MEDIUM,
        question="A harsh, guttural avian caw echoes from the dead branches of the cemetery elm. Which bird calls out?",
        audio_clip_id="crow",
        clip_duration_seconds=2.4,
        accessible_transcript=(
            "Accessible Audio Clue: A sharp, raspy, double-throat cawing call of an ominous raven or crow."
        ),
        options=["Raven / Crow", "Barn Owl", "Night Parrot", "Vulture"],
        correct_answer="Raven / Crow",
        explanation="The raspy, staccato caw is the unmistakable warning call of a crow or raven keeping vigil over autumn grounds.",
    ),
    AudioRiddleQuestion(
        id="riddle_heartbeat",
        category="paranormal",
        difficulty=Difficulty.MEDIUM,
        question="A rhythmic, low-frequency double thud echoes beneath the floorboards, growing louder. What anatomical rhythm is this?",
        audio_clip_id="heartbeat",
        clip_duration_seconds=3.0,
        accessible_transcript=(
            "Accessible Audio Clue: A deep, muffled 'lub-dub' acoustic pulsation resembling a tense human heartbeat."
        ),
        options=["Tell-Tale Heartbeat", "Distant War Drums", "Footsteps Upstairs", "Water Pipe Hammer"],
        correct_answer="Tell-Tale Heartbeat",
        explanation="Edgar Allan Poe immortalized the haunting psychological guilt represented by the rhythmic 'lub-dub' of a beating heart.",
    ),
    AudioRiddleQuestion(
        id="riddle_wind",
        category="paranormal",
        difficulty=Difficulty.HARD,
        question="A fluctuating hollow gust moans through chimney flues and broken window panes. What natural force produces this whine?",
        audio_clip_id="wind",
        clip_duration_seconds=3.2,
        accessible_transcript=(
            "Accessible Audio Clue: A rising and falling eerie whoosh with resonant harmonic whistling through narrow gaps."
        ),
        options=["Howling Gale Wind", "Steam Vent", "Passing Locomotive", "Subterranean River"],
        correct_answer="Howling Gale Wind",
        explanation="The fluctuating pitch and filtered white-noise resonance characterizes a high-speed autumn wind whistling through masonry.",
    ),
    AudioRiddleQuestion(
        id="riddle_organ_sting",
        category="movies",
        difficulty=Difficulty.HARD,
        question="A dramatic, dissonant minor chord swells through the cathedral pipes. What musical instrument delivers this gothic sting?",
        audio_clip_id="organ_sting",
        clip_duration_seconds=2.8,
        accessible_transcript=(
            "Accessible Audio Clue: A full-bodied, dramatic minor chord played on a pipe organ with sustained reeds and pedal bass."
        ),
        options=["Pipe Organ", "Harpsichord", "Grand Piano", "Accordion"],
        correct_answer="Pipe Organ",
        explanation="The pipe organ's dramatic minor chords have set the sinister tone for gothic horror cinema since the silent era.",
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
