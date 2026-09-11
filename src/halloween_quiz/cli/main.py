"""Modern cross-platform Rich CLI for Halloween Quiz."""

import os
import queue
import sys
import threading
import time
from pathlib import Path

import click
from rich.align import Align
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table
from rich.text import Text

from halloween_quiz.core.engine import QuestionBank, QuizSession
from halloween_quiz.core.models import Difficulty, QuizConfig
from halloween_quiz.core.storage import ScoreRepository

console = Console()

BANNER = r"""
[bold orange1]
  ██████╗ ██████╗  ██████╗  ██████╗ ██╗  ██╗██╗   ██╗
 ██╔════╝ ██╔══██╗██╔═══██╗██╔═══██╗██║ ██╔╝╚██╗ ██╔╝
 ╚█████╗  ██████╔╝██║   ██║██║   ██║█████╔╝  ╚████╔╝
  ╚═══██╗ ██╔═══╝ ██║   ██║██║   ██║██╔═██╗   ╚██╔╝
 ██████╔╝ ██║     ╚██████╔╝╚██████╔╝██║  ██╗   ██║
 ╚═════╝  ╚═╝      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝   ╚═╝
       🎃 H A L L O W E E N   Q U I Z   2 . 0 🎃
[/bold orange1]
"""


def timed_input(prompt_text: str, timeout_seconds: float) -> tuple[str | None, float]:
    """Cross-platform timed user input using a background daemon thread.

    Works identically on Windows, Linux, and macOS without relying on Unix signal.SIGALRM.
    Returns (answer_string_or_none, elapsed_seconds).
    """
    console.print(prompt_text, end="")
    q: queue.Queue = queue.Queue()
    start_time = time.time()

    def _worker():
        try:
            line = sys.stdin.readline()
            if line:
                q.put(line.strip())
            else:
                q.put(None)
        except Exception:
            q.put(None)

    worker_thread = threading.Thread(target=_worker, daemon=True)
    worker_thread.start()

    try:
        answer = q.get(timeout=timeout_seconds)
        elapsed = time.time() - start_time
        return answer, elapsed
    except queue.Empty:
        elapsed = time.time() - start_time
        return None, elapsed


def get_paths():
    root = Path(__file__).resolve().parent.parent.parent.parent
    questions_path = os.getenv("QUESTIONS_FILE", str(root / "assets" / "questions.json"))
    db_path = os.getenv("DATABASE_PATH", str(root / "data" / "halloween.db"))
    return questions_path, db_path


@click.group(invoke_without_command=True)
@click.pass_context
def cli(ctx):
    """🎃 Halloween Quiz - Interactive Spooky Terminal Game!"""
    if ctx.invoked_subcommand is None:
        play_game()


@cli.command("play")
@click.option("--name", "-n", default=None, help="Player nickname")
@click.option(
    "--difficulty",
    "-d",
    type=click.Choice(["easy", "medium", "hard"], case_sensitive=False),
    default=None,
    help="Game difficulty level",
)
@click.option("--questions", "-q", default=10, type=int, help="Number of questions (1-50)")
def play(name, difficulty, questions):
    """Start a new Halloween Quiz session in your terminal."""
    play_game(player_name=name, diff_str=difficulty, count=questions)


@cli.command("leaderboard")
@click.option("--difficulty", "-d", default=None, help="Filter by difficulty (easy, medium, hard)")
@click.option("--limit", "-l", default=10, help="Number of records to show")
def leaderboard(difficulty, limit):
    """Display top scores from the crypt."""
    _, db_path = get_paths()
    repo = ScoreRepository(db_path)
    entries = repo.get_leaderboard(difficulty=difficulty, limit=limit)

    table = Table(title="🎃 Crypt of High Scores", style="bold purple")
    table.add_column("Rank", style="bold yellow", justify="center")
    table.add_column("Hunter", style="bold white")
    table.add_column("Mode", justify="center")
    table.add_column("Score", style="bold green", justify="right")
    table.add_column("Accuracy", justify="right")
    table.add_column("Date", style="dim")

    if not entries:
        console.print("[dim italic]No high scores recorded yet in the crypt.[/dim italic]")
        return

    for idx, e in enumerate(entries, 1):
        medal = "🥇" if idx == 1 else "🥈" if idx == 2 else "🥉" if idx == 3 else str(idx)
        diff_color = "green" if e.difficulty == "easy" else "yellow" if e.difficulty == "medium" else "red"
        date_str = e.created_at.strftime("%Y-%m-%d %H:%M") if e.created_at else "-"
        table.add_row(
            medal,
            e.player_name,
            f"[{diff_color}]{e.difficulty.upper()}[/{diff_color}]",
            f"{e.score:,}",
            f"{e.percentage}%",
            date_str,
        )

    console.print(table)


@cli.command("stats")
def stats():
    """Display trivia question database statistics."""
    questions_path, db_path = get_paths()
    bank = QuestionBank(questions_path)
    repo = ScoreRepository(db_path)

    table = Table(title="🎃 Halloween Quiz Knowledge Base", style="bold orange1")
    table.add_column("Category", style="bold white")
    table.add_column("Icon", justify="center")
    table.add_column("Available Questions", justify="right", style="bold cyan")
    table.add_column("Description", style="dim")

    for c in bank.get_categories():
        table.add_row(c["name"], c["icon"], str(c["question_count"]), c["description"])

    console.print(table)
    console.print(f"\n[bold]Total Questions:[/bold] [green]{bank.total_count}[/green]")
    console.print(f"[bold]Total High Scores Recorded:[/bold] [yellow]{repo.count_scores()}[/yellow]\n")


def play_game(player_name: str | None = None, diff_str: str | None = None, count: int = 10):
    """Main interactive terminal game loop."""
    console.clear()
    console.print(Align.center(BANNER))

    questions_path, db_path = get_paths()
    bank = QuestionBank(questions_path)
    repo = ScoreRepository(db_path)

    if bank.total_count == 0:
        console.print("[red bold]Error:[/red bold] Question database is empty! Please verify questions.json.")
        return

    # Interactive setup prompts if options not provided via CLI flags
    if not player_name:
        player_name = Prompt.ask("[bold yellow]Enter your Ghost Hunter name[/bold yellow]", default="Ghost Hunter")

    if not diff_str:
        diff_str = Prompt.ask(
            "[bold yellow]Select difficulty[/bold yellow]",
            choices=["easy", "medium", "hard"],
            default="medium",
        )

    difficulty = Difficulty.from_str(diff_str)
    time_limit = 30 if difficulty == Difficulty.EASY else 15 if difficulty == Difficulty.HARD else 20

    config = QuizConfig(
        player_name=player_name,
        difficulty=difficulty,
        num_questions=max(1, min(50, count)),
        time_limit_per_question=time_limit,
    )

    questions = bank.select_questions(
        difficulty=config.difficulty,
        count=config.num_questions,
    )

    session = QuizSession(config, questions)

    console.print(
        f"\n[bold green]Welcome, {session.config.player_name}![/bold green] Prepare for [bold orange1]{session.total_questions}[/bold orange1] questions on [bold magenta]{session.config.difficulty.value.upper()}[/bold magenta] mode ({time_limit}s each).\n"
    )
    time.sleep(1)

    while not session.is_completed:
        q_view = session.get_current_question_view()
        if not q_view:
            break

        # Header panel
        header_text = (
            f"Question [bold cyan]{q_view.index}/{q_view.total_questions}[/bold cyan] | "
            f"{q_view.category_icon} [bold magenta]{q_view.category_name}[/bold magenta] | "
            f"🔥 Streak: [bold red]{session.streak}[/bold red] | "
            f"Score: [bold yellow]{session.score}[/bold yellow]"
        )
        console.print(Panel(header_text, style="bold purple", expand=False))

        # Question title
        console.print(f"\n[bold white]{q_view.question}[/bold white]\n")

        # Options table
        for idx, opt in enumerate(q_view.options, 1):
            console.print(f"  [bold cyan]({idx})[/bold cyan] {opt}")

        console.print(f"\n[dim]⏱ You have {time_limit} seconds to answer (Enter 1-4):[/dim]")

        user_input, elapsed = timed_input("[bold yellow]Your choice ➔ [/bold yellow]", timeout_seconds=float(time_limit))

        if user_input is None:
            console.print("\n[bold red]⌛ TIME IS UP! The specters claimed this round.[/bold red]")
            result = session.timeout_current_question()
        else:
            result = session.submit_answer(user_input, time_taken=elapsed)

        # Immediate feedback
        if result.is_correct:
            pts_str = f"+{result.points_awarded} pts"
            if result.time_bonus > 0:
                pts_str += f" (includes +{result.time_bonus} speed bonus)"
            feedback = f"[bold green]✔ CORRECT![/bold green] {pts_str}\n"
        else:
            feedback = f"[bold red]✖ INCORRECT![/bold red] The correct answer was: [bold green]{result.correct_answer}[/bold green]\n"

        if result.explanation:
            feedback += f"[dim italic]{result.explanation}[/dim italic]"

        console.print(Panel(feedback, style="green" if result.is_correct else "red"))
        console.print("-" * 60 + "\n")
        time.sleep(1.2)

    # End of Game Summary
    summary = session.get_summary()

    # Save to SQLite Database
    try:
        repo.save_score(
            player_name=session.config.player_name,
            difficulty=session.config.difficulty.value,
            score=session.score,
            total_questions=session.total_questions,
            percentage=session.percentage,
        )
        saved_msg = "[bold green]Your score has been inscribed into the crypt's high scores database![/bold green]"
    except Exception as err:
        saved_msg = f"[dim]Could not save score: {err}[/dim]"

    # Trophy rank calculation
    pct = session.percentage
    if pct >= 90:
        rank_title = "👑 Supreme Arch-Mage of Darkness"
    elif pct >= 70:
        rank_title = "🎃 Master Pumpkin Carver"
    elif pct >= 50:
        rank_title = "👻 Seasoned Ghost Whisperer"
    else:
        rank_title = "🦇 Wandering Crypt Zombie"

    summary_panel = Text()
    summary_panel.append(f"{rank_title}\n\n", style="bold yellow")
    summary_panel.append(f"Hunter: {session.config.player_name}\n", style="bold white")
    summary_panel.append(f"Difficulty: {session.config.difficulty.value.upper()}\n", style="magenta")
    summary_panel.append(f"Final Score: {session.score:,} points\n", style="bold green")
    summary_panel.append(f"Accuracy: {session.correct_count}/{session.total_questions} ({session.percentage}%)\n", style="cyan")
    summary_panel.append(f"Longest Streak: {summary['max_streak']}\n\n", style="bold red")
    summary_panel.append(saved_msg)

    console.print(Panel(Align.center(summary_panel), title="🎃 FINAL RESULTS", style="bold gold1"))

    # Display Top 5 Leaderboard
    console.print("\n[bold]Current Top 5 Hunters:[/bold]")
    top_scores = repo.get_leaderboard(limit=5)
    for i, s in enumerate(top_scores, 1):
        console.print(f"  {i}. [bold]{s.player_name}[/bold] - {s.score:,} pts ({s.difficulty})")

    console.print("\n[bold cyan]Thank you for playing Halloween Quiz 2.0![/bold cyan]\n")


if __name__ == "__main__":
    cli()
