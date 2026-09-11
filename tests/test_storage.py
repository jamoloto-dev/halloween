"""Unit tests for SQLite storage and migration."""

import tempfile
from pathlib import Path

import pytest

from halloween_quiz.core.storage import ScoreRepository


@pytest.fixture
def temp_repo():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test_halloween.db"
        yield ScoreRepository(str(db_path))


def test_save_and_retrieve_score(temp_repo):
    saved = temp_repo.save_score(
        player_name="PumpkinKing",
        difficulty="hard",
        score=850,
        total_questions=10,
        percentage=85.0,
    )
    assert saved.id is not None
    assert saved.player_name == "PumpkinKing"
    assert saved.score == 850

    leaderboard = temp_repo.get_leaderboard()
    assert len(leaderboard) == 1
    assert leaderboard[0].player_name == "PumpkinKing"


def test_leaderboard_ordering_and_filtering(temp_repo):
    temp_repo.save_score("Player1", "easy", 300, 10, 30.0)
    temp_repo.save_score("Player2", "hard", 900, 10, 90.0)
    temp_repo.save_score("Player3", "easy", 600, 10, 60.0)

    # All entries sorted by score desc
    all_scores = temp_repo.get_leaderboard()
    assert len(all_scores) == 3
    assert [s.score for s in all_scores] == [900, 600, 300]

    # Filtered by easy
    easy_scores = temp_repo.get_leaderboard(difficulty="easy")
    assert len(easy_scores) == 2
    assert [s.score for s in easy_scores] == [600, 300]


def test_migrate_legacy_csv(temp_repo, tmp_path):
    csv_file = tmp_path / "legacy.csv"
    csv_content = """Max,easy,0/2,0.0%,2025-10-30 12:39:52
Mikey,medium,10/20,50.0%,2025-10-30 13:27:13
Jams,4,2025-10-30 15:30:41.695611,easy
Jams,6,2025-10-30 16:06:15.297942,easy
Jafta,9,2026-08-05 18:35:25.748647,hard
"""
    csv_file.write_text(csv_content, encoding="utf-8")

    migrated = temp_repo.migrate_legacy_csv(str(csv_file))
    assert migrated == 5

    # Re-running migration should not duplicate entries
    remigrated = temp_repo.migrate_legacy_csv(str(csv_file))
    assert remigrated == 0

    scores = temp_repo.get_leaderboard()
    assert len(scores) == 5
    top = scores[0]
    assert top.player_name in ("Mikey", "Jafta")
