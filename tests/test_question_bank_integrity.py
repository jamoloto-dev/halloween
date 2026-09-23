"""Automated integrity validation for the Spooky Master question bank.

Enforces:
- Total questions >= 300
- 6 canonical categories with 45–60 questions each
- Unique IDs across all categories
- Unique question texts across all categories
- Exactly 4 plausible, unique answer options per question
- Correct answer strictly matching one of the options
- Valid difficulties (easy, medium, hard) with balanced distribution
- Non-empty educational explanations
- Multimedia question architecture integrity (media_type, media_url, media_alt, audio_clip_id)
"""

import json
from pathlib import Path

from halloween_quiz.core.engine import QuestionBank
from halloween_quiz.core.models import Category

QUESTIONS_FILE = Path("assets/questions.json")
CANONICAL_CATEGORIES = {c.value for c in Category}


def load_raw_questions() -> dict[str, list[dict]]:
    with open(QUESTIONS_FILE, encoding="utf-8") as f:
        data = json.load(f)
    assert isinstance(data, dict), "Questions file must be category-keyed dict"
    return data


def test_question_bank_total_scale_and_categories():
    data = load_raw_questions()
    total_questions = sum(len(items) for items in data.values())
    assert total_questions >= 300, f"Expected at least 300 questions, got {total_questions}"

    assert set(data.keys()) == CANONICAL_CATEGORIES, (
        f"Categories must match canonical set {CANONICAL_CATEGORIES}, got {set(data.keys())}"
    )

    for cat, items in data.items():
        assert 45 <= len(items) <= 60, (
            f"Category '{cat}' question count {len(items)} out of target 45–60 range"
        )


def test_question_bank_unique_ids():
    data = load_raw_questions()
    seen_ids: set[str] = set()
    for cat, items in data.items():
        for item in items:
            q_id = item.get("id")
            assert q_id, f"Missing id in category '{cat}'"
            assert isinstance(q_id, str), f"Question ID must be string in category '{cat}'"
            assert q_id not in seen_ids, f"Duplicate question ID found: '{q_id}'"
            seen_ids.add(q_id)


def test_question_bank_unique_question_texts():
    data = load_raw_questions()
    seen_texts: set[str] = set()
    for cat, items in data.items():
        for item in items:
            text = item.get("question", "").strip().lower()
            assert len(text) >= 10, f"Question text too short for '{item.get('id')}'"
            assert text not in seen_texts, (
                f"Duplicate question text detected for '{item.get('id')}': {item.get('question')}"
            )
            seen_texts.add(text)


def test_question_bank_options_and_answers_integrity():
    data = load_raw_questions()
    for cat, items in data.items():
        for item in items:
            q_id = item.get("id")
            options = item.get("options")
            assert isinstance(options, list), f"Options must be list for '{q_id}'"
            assert len(options) == 4, f"Options must contain exactly 4 choices for '{q_id}'"

            # Check for empty options
            stripped_options = [opt.strip() for opt in options]
            for opt in stripped_options:
                assert len(opt) > 0, f"Option in '{q_id}' cannot be empty"

            # Check for duplicate options
            assert len(set(stripped_options)) == 4, (
                f"Duplicate answer options in '{q_id}': {options}"
            )

            # Check correct answer exists in options
            correct_answer = item.get("correct_answer")
            assert correct_answer, f"Missing correct_answer for '{q_id}'"
            assert correct_answer in options, (
                f"Correct answer '{correct_answer}' not in options {options} for '{q_id}'"
            )


def test_question_bank_difficulties_and_balance():
    data = load_raw_questions()
    valid_diffs = {"easy", "medium", "hard"}
    total_by_diff: dict[str, int] = {"easy": 0, "medium": 0, "hard": 0}

    for cat, items in data.items():
        cat_diffs: dict[str, int] = {"easy": 0, "medium": 0, "hard": 0}
        for item in items:
            diff = item.get("difficulty")
            assert diff in valid_diffs, f"Invalid difficulty '{diff}' in '{item.get('id')}'"
            cat_diffs[diff] += 1
            total_by_diff[diff] += 1

        # Each category must have all three difficulties well represented
        assert cat_diffs["easy"] >= 10, f"Category '{cat}' has insufficient easy questions"
        assert cat_diffs["medium"] >= 10, f"Category '{cat}' has insufficient medium questions"
        assert cat_diffs["hard"] >= 10, f"Category '{cat}' has insufficient hard questions"

    # Global balance across 300+ questions
    assert total_by_diff["easy"] >= 80
    assert total_by_diff["medium"] >= 80
    assert total_by_diff["hard"] >= 80


def test_question_bank_explanations():
    data = load_raw_questions()
    for cat, items in data.items():
        for item in items:
            q_id = item.get("id")
            explanation = item.get("explanation")
            assert explanation, f"Missing explanation for '{q_id}'"
            assert isinstance(explanation, str)
            assert len(explanation.strip()) >= 15, f"Explanation too brief for '{q_id}'"


def test_multimedia_question_metadata():
    data = load_raw_questions()
    image_count = 0
    audio_count = 0

    for cat, items in data.items():
        for item in items:
            q_id = item.get("id")
            media_type = item.get("media_type", "none")
            assert media_type in ("none", "image", "audio"), (
                f"Invalid media_type '{media_type}' for '{q_id}'"
            )

            if media_type == "image":
                image_count += 1
                media_url = item.get("media_url")
                media_alt = item.get("media_alt")
                assert media_url, f"Image question '{q_id}' missing media_url"
                assert media_alt and len(media_alt.strip()) >= 5, (
                    f"Image question '{q_id}' missing accessible media_alt"
                )
                # Verify asset exists on disk if relative to /static
                if media_url.startswith("/static/"):
                    disk_path = Path("src/halloween_quiz/web") / media_url.lstrip("/")
                    assert disk_path.exists(), f"Image asset not found on disk: {disk_path}"

            elif media_type == "audio" or item.get("question_type") == "audio_riddle":
                audio_count += 1
                audio_clip_id = item.get("audio_clip_id")
                accessible_transcript = item.get("accessible_transcript")
                assert audio_clip_id, f"Audio question '{q_id}' missing audio_clip_id"
                assert accessible_transcript, (
                    f"Audio question '{q_id}' missing accessible_transcript"
                )

    assert image_count >= 5, f"Expected at least 5 image trivia questions, got {image_count}"
    assert audio_count >= 1, f"Expected at least 1 audio trivia question in bank, got {audio_count}"


def test_engine_question_bank_loading():
    bank = QuestionBank(QUESTIONS_FILE)
    # Bank loads questions.json + audio riddles + premium questions
    assert len(bank.questions) >= 312
    # Verify every category has questions loaded
    for cat in CANONICAL_CATEGORIES:
        cat_questions = bank._by_category.get(cat, [])
        assert len(cat_questions) >= 50
