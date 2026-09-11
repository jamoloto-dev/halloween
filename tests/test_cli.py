"""Unit tests for the Rich CLI."""

import pytest
from click.testing import CliRunner

from halloween_quiz.cli.main import cli
from halloween_quiz.core.storage import ScoreRepository


@pytest.fixture
def runner():
    return CliRunner()


def test_cli_help(runner):
    res = runner.invoke(cli, ["--help"])
    assert res.exit_code == 0
    assert "Halloween Quiz" in res.output


def test_cli_stats(runner, monkeypatch, tmp_path):
    db_path = tmp_path / "test_cli.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_path))

    res = runner.invoke(cli, ["stats"])
    assert res.exit_code == 0
    assert "Knowledge Base" in res.output
    assert "Total Questions:" in res.output


def test_cli_leaderboard_empty(runner, monkeypatch, tmp_path):
    db_path = tmp_path / "test_cli.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_path))

    res = runner.invoke(cli, ["leaderboard"])
    assert res.exit_code == 0
    assert "No high scores recorded yet" in res.output


def test_cli_leaderboard_populated(runner, monkeypatch, tmp_path):
    db_path = tmp_path / "test_cli_pop.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_path))
    repo = ScoreRepository(str(db_path))
    repo.save_score("Frankenstein", "hard", 1100, 10, 100.0)

    res = runner.invoke(cli, ["leaderboard"])
    assert res.exit_code == 0
    assert "Crypt of High Scores" in res.output
    assert "Frankenstein" in res.output
