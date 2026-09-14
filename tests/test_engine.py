"""Unit tests for QuizEngine and Session flow."""

import pytest

from halloween_quiz.core.engine import QuestionBank, QuizSession
from halloween_quiz.core.models import Difficulty, Question, QuizConfig


@pytest.fixture
def sample_questions():
    return [
        Question(
            id=f"q_{i}",
            category="spooky",
            difficulty=Difficulty.EASY if i < 2 else Difficulty.HARD,
            question=f"Spooky question {i}?",
            options=["Answer A", "Answer B", "Answer C", "Answer D"],
            correct_answer="Answer A",
            explanation=f"Explanation {i}",
        )
        for i in range(4)
    ]


def test_session_lifecycle(sample_questions):
    config = QuizConfig(
        player_name="Witch",
        difficulty=Difficulty.EASY,
        num_questions=4,
        time_limit_per_question=20,
    )
    session = QuizSession(config, sample_questions)

    assert session.total_questions == 4
    assert not session.is_completed

    # First question view
    view1 = session.get_current_question_view()
    assert view1 is not None
    assert view1.index == 1
    assert view1.question == "Spooky question 0?"
    assert not hasattr(view1, "correct_answer")

    # Correct answer
    res1 = session.submit_answer("Answer A", time_taken=5.0)
    assert res1.is_correct
    assert res1.points_awarded > 100  # includes time bonus
    assert res1.streak == 1
    assert session.score == res1.points_awarded

    # A numeric answer refers to the displayed (shuffled) option, not the
    # answer's original position in the question data.
    view2 = session.get_current_question_view()
    assert view2 is not None
    correct_display_index = view2.options.index("Answer A")
    res2 = session.submit_answer(str(correct_display_index), time_taken=2.0)
    assert res2.is_correct
    assert res2.streak == 2

    # Incorrect answer
    res3 = session.submit_answer("Answer B", time_taken=3.0)
    assert not res3.is_correct
    assert res3.streak == 0

    # Timeout
    res4 = session.timeout_current_question()
    assert not res4.is_correct
    assert res4.is_game_over
    assert session.is_completed

    summary = session.get_summary()
    assert summary["player_name"] == "Witch"
    assert summary["correct_count"] == 2
    assert summary["total_questions"] == 4
    assert summary["percentage"] == 50.0
    assert summary["max_streak"] == 2


def test_question_bank_loading():
    bank = QuestionBank("assets/questions.json")
    assert bank.total_count > 0
    categories = bank.get_categories()
    assert len(categories) > 0

    selected = bank.select_questions(count=5)
    assert len(selected) <= 5


def test_question_view_shuffles_options_and_preserves_answer_mapping(sample_questions):
    """Answer order is randomized per session, while validation uses the answer itself."""
    config = QuizConfig(player_name="Witch", difficulty=Difficulty.EASY, num_questions=1)
    positions = set()

    for _ in range(60):
        session = QuizSession(config, [sample_questions[0]])
        view = session.get_current_question_view()
        assert view is not None
        assert sorted(view.options) == sorted(sample_questions[0].options)

        correct_index = view.options.index(sample_questions[0].correct_answer)
        positions.add(correct_index)
        result = session.submit_answer(view.options[correct_index], time_taken=1.0)
        assert result.is_correct

    # Repeated independent shuffles make every displayed A–D position viable.
    assert positions == {0, 1, 2, 3}


def test_question_view_keeps_the_same_order_for_status_refreshes(sample_questions):
    session = QuizSession(
        QuizConfig(player_name="Witch", difficulty=Difficulty.EASY, num_questions=1),
        [sample_questions[0]],
    )
    first_view = session.get_current_question_view()
    refreshed_view = session.get_current_question_view()
    assert first_view is not None and refreshed_view is not None
    assert refreshed_view.options == first_view.options
