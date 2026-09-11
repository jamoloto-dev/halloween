"""Unit tests for Pydantic models."""

import pytest
from pydantic import ValidationError

from halloween_quiz.core.models import (
    Difficulty,
    Question,
    QuizConfig,
    ScoreRecord,
)


def test_valid_question():
    q = Question(
        id="q1",
        category="spooky",
        difficulty=Difficulty.EASY,
        question="What is a ghost's favorite fruit?",
        options=["Boo-berries", "Apples", "Bananas", "Oranges"],
        correct_answer="Boo-berries",
        explanation="Because ghosts love things that start with Boo!",
    )
    assert q.id == "q1"
    assert q.correct_answer in q.options
    assert q.difficulty == Difficulty.EASY


def test_question_correct_answer_must_be_in_options():
    with pytest.raises(ValidationError):
        Question(
            id="q2",
            category="spooky",
            difficulty=Difficulty.EASY,
            question="What is a ghost's favorite fruit?",
            options=["Apples", "Bananas", "Oranges", "Pears"],
            correct_answer="Boo-berries",
        )


def test_question_duplicate_options():
    with pytest.raises(ValidationError):
        Question(
            id="q3",
            category="spooky",
            difficulty=Difficulty.EASY,
            question="What is a ghost's favorite fruit?",
            options=["Apples", "Apples", "Bananas", "Pears"],
            correct_answer="Apples",
        )


def test_difficulty_from_str():
    assert Difficulty.from_str("easy") == Difficulty.EASY
    assert Difficulty.from_str("EASY") == Difficulty.EASY
    assert Difficulty.from_str("medium") == Difficulty.MEDIUM
    assert Difficulty.from_str("hard") == Difficulty.HARD
    assert Difficulty.from_str("unknown") == Difficulty.MEDIUM


def test_quiz_config_csv_injection_sanitization():
    config = QuizConfig(player_name="=cmd|'/C calc'!A0")
    assert not config.player_name.startswith("=")
    assert not config.player_name.startswith("+")

    config2 = QuizConfig(player_name="   +Danger   ")
    assert config2.player_name == "Danger"


def test_score_record_sanitization():
    score = ScoreRecord(
        player_name="@AdminUser",
        difficulty="hard",
        score=500,
        total_questions=5,
        percentage=100.0,
    )
    assert score.player_name == "AdminUser"
