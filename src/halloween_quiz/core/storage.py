"""Storage repository for Halloween Quiz using SQLite and SQLAlchemy."""

import csv
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Integer,
    String,
    create_engine,
    desc,
    event,
    func,
    select,
    text,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from halloween_quiz.core.models import ScoreRecord


class Base(DeclarativeBase):
    pass


class HighScoreDB(Base):
    __tablename__ = "high_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    mode: Mapped[str] = mapped_column(String(30), nullable=False, default="classic", index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    max_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    challenge_date: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    avatar_id: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default="pumpkin_hunter"
    )
    is_boosted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    def to_model(self) -> ScoreRecord:
        dt = self.created_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return ScoreRecord(
            id=self.id,
            player_name=str(self.player_name),
            difficulty=str(self.difficulty),
            mode=str(getattr(self, "mode", "classic") or "classic"),
            score=int(self.score),
            total_questions=int(self.total_questions),
            percentage=float(self.percentage),
            max_streak=int(getattr(self, "max_streak", 0) or 0),
            created_at=dt,
            challenge_date=getattr(self, "challenge_date", None),
            avatar_id=getattr(self, "avatar_id", "pumpkin_hunter") or "pumpkin_hunter",
            is_boosted=bool(getattr(self, "is_boosted", False)),
        )


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable WAL mode and busy timeout for SQLite to handle concurrency safely."""
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
    except Exception:
        pass
    finally:
        cursor.close()


class ScoreRepository:
    """Thread-safe persistence repository supporting SQLite (WAL) and PostgreSQL."""

    def __init__(self, db_path_or_url: str | None = None):
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raw_path = db_path_or_url or os.getenv("DATABASE_PATH") or "data/halloween.db"
            if raw_path != ":memory:":
                self.db_path = Path(raw_path)
                self.db_path.parent.mkdir(parents=True, exist_ok=True)
                db_url = f"sqlite:///{self.db_path.resolve()}"
            else:
                self.db_path = Path(":memory:")
                db_url = "sqlite:///:memory:"

            self.engine = create_engine(
                db_url,
                connect_args={"check_same_thread": False},
                pool_pre_ping=True,
            )
        else:
            # PostgreSQL URL handling (e.g. Render / Railway / Heroku)
            if db_url.startswith("postgres://"):
                db_url = db_url.replace("postgres://", "postgresql://", 1)
            self.engine = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
            )

        Base.metadata.create_all(self.engine)
        self._ensure_schema_compatibility()
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

    def _ensure_schema_compatibility(self) -> None:
        """Add any newly introduced columns to existing SQLite databases safely."""
        try:
            with self.engine.connect() as conn:
                # Check for SQLite schema migration
                if self.engine.dialect.name == "sqlite":
                    cols = [
                        row[1]
                        for row in conn.execute(text("PRAGMA table_info(high_scores)")).fetchall()
                    ]
                    if cols:
                        if "mode" not in cols:
                            conn.execute(
                                text(
                                    "ALTER TABLE high_scores ADD COLUMN mode VARCHAR(30) DEFAULT 'classic'"
                                )
                            )
                        if "max_streak" not in cols:
                            conn.execute(
                                text(
                                    "ALTER TABLE high_scores ADD COLUMN max_streak INTEGER DEFAULT 0"
                                )
                            )
                        if "challenge_date" not in cols:
                            conn.execute(
                                text(
                                    "ALTER TABLE high_scores ADD COLUMN challenge_date VARCHAR(20)"
                                )
                            )
                        if "avatar_id" not in cols:
                            conn.execute(
                                text(
                                    "ALTER TABLE high_scores ADD COLUMN avatar_id VARCHAR(50) DEFAULT 'pumpkin_hunter'"
                                )
                            )
                        if "is_boosted" not in cols:
                            conn.execute(
                                text(
                                    "ALTER TABLE high_scores ADD COLUMN is_boosted BOOLEAN DEFAULT 0"
                                )
                            )
                        conn.commit()
        except Exception:
            # Non-fatal if table doesn't exist yet or already has columns
            pass

    def save_score(
        self,
        player_name: str,
        difficulty: str,
        score: int,
        total_questions: int = 10,
        percentage: float | None = None,
        created_at: datetime | None = None,
        mode: str = "classic",
        max_streak: int = 0,
        challenge_date: str | None = None,
        avatar_id: str | None = "pumpkin_hunter",
        is_boosted: bool = False,
        correct_count: int | None = None,
        **kwargs: Any,
    ) -> ScoreRecord:
        """Persist a player's quiz score."""
        clean_name = player_name.strip()
        while clean_name and clean_name[0] in ("=", "+", "-", "@", "\t", "\r"):
            clean_name = clean_name[1:].strip()
        clean_name = clean_name[:100] or "Anonymous Ghost"

        if percentage is None:
            percentage = (
                round((score / (total_questions * 100)) * 100, 1) if total_questions > 0 else 0.0
            )

        if created_at is None:
            created_at = datetime.now(timezone.utc)

        if challenge_date is None:
            challenge_date = created_at.strftime("%Y-%m-%d")

        db_item = HighScoreDB(
            player_name=clean_name,
            difficulty=difficulty.lower(),
            mode=(mode or "classic").lower(),
            score=score,
            total_questions=total_questions,
            percentage=max(0.0, min(100.0, percentage)),
            max_streak=max_streak,
            created_at=created_at,
            challenge_date=challenge_date,
            avatar_id=avatar_id or "pumpkin_hunter",
            is_boosted=is_boosted,
        )

        with self.SessionLocal() as session:
            session.add(db_item)
            session.commit()
            session.refresh(db_item)
            return db_item.to_model()

    def get_leaderboard(
        self,
        difficulty: str | None = None,
        mode: str | None = None,
        timeframe: str | None = None,
        challenge_date: str | None = None,
        unboosted_only: bool = False,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ScoreRecord]:
        """Fetch top scores sorted by score descending, then created_at ascending."""
        limit = max(1, min(100, limit))
        offset = max(0, offset)

        if timeframe in ("daily", "today") and not challenge_date:
            challenge_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        with self.SessionLocal() as session:
            stmt = select(HighScoreDB)
            if difficulty and difficulty.lower() != "all":
                stmt = stmt.where(HighScoreDB.difficulty == difficulty.lower())
            if mode and mode.lower() != "all":
                stmt = stmt.where(HighScoreDB.mode == mode.lower())
            if challenge_date:
                stmt = stmt.where(HighScoreDB.challenge_date == challenge_date)
            if unboosted_only:
                stmt = stmt.where(HighScoreDB.is_boosted.is_(False))

            stmt = (
                stmt.order_by(desc(HighScoreDB.score), HighScoreDB.created_at.asc())
                .offset(offset)
                .limit(limit)
            )
            results = session.execute(stmt).scalars().all()
            return [row.to_model() for row in results]

    def count_scores(
        self,
        difficulty: str | None = None,
        mode: str | None = None,
        timeframe: str | None = None,
        challenge_date: str | None = None,
        unboosted_only: bool = False,
    ) -> int:
        """Count total scores recorded with efficient SQL COUNT."""
        if timeframe in ("daily", "today") and not challenge_date:
            challenge_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        with self.SessionLocal() as session:
            stmt = select(func.count(HighScoreDB.id))
            if difficulty and difficulty.lower() != "all":
                stmt = stmt.where(HighScoreDB.difficulty == difficulty.lower())
            if mode and mode.lower() != "all":
                stmt = stmt.where(HighScoreDB.mode == mode.lower())
            if challenge_date:
                stmt = stmt.where(HighScoreDB.challenge_date == challenge_date)
            if unboosted_only:
                stmt = stmt.where(HighScoreDB.is_boosted.is_(False))
            return int(session.execute(stmt).scalar() or 0)

    def get_personal_best(self, player_name: str) -> dict:
        """Fetch high score, streak, total games, and history for a player."""
        clean_name = player_name.strip()
        while clean_name and clean_name[0] in ("=", "+", "-", "@", "\t", "\r"):
            clean_name = clean_name[1:].strip()
        clean_name = clean_name[:100] or "Anonymous Ghost"

        with self.SessionLocal() as session:
            stmt = (
                select(HighScoreDB)
                .where(HighScoreDB.player_name == clean_name)
                .order_by(desc(HighScoreDB.score), HighScoreDB.created_at.asc())
            )
            results = session.execute(stmt).scalars().all()
            if not results:
                return {
                    "player_name": clean_name,
                    "high_score": 0,
                    "best_streak": 0,
                    "total_games": 0,
                    "best_percentage": 0.0,
                    "best_daily": 0,
                    "best_mode": "classic",
                    "best_record": None,
                    "records": [],
                }
            best_rec = results[0].to_model()
            max_streak = max((r.max_streak for r in results), default=0)
            max_pct = max((r.percentage for r in results), default=0.0)
            daily_scores = [r.score for r in results if getattr(r, "mode", "") == "daily"]
            best_daily = max(daily_scores, default=0)
            best_mode = getattr(best_rec, "mode", "classic") or "classic"
            return {
                "player_name": clean_name,
                "high_score": best_rec.score,
                "best_streak": max_streak,
                "total_games": len(results),
                "best_percentage": max_pct,
                "best_daily": best_daily,
                "best_mode": best_mode,
                "best_record": best_rec,
                "records": [r.to_model() for r in results[:10]],
            }

    def migrate_legacy_csv(self, csv_path: str = "high_scores.csv") -> int:
        """Migrate legacy high_scores.csv safely handling divergent schemas.

        Format A: Name,Difficulty,Score(fraction),Percentage,Date
                  Max,easy,0/2,0.0%,2025-10-30 12:39:52
        Format B: Name,Score,Date,Difficulty
                  Jams,4,2025-10-30 15:30:41.695611,easy
        """
        path = Path(csv_path)
        if not path.exists():
            return 0

        migrated_count = 0
        with open(path, encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f)
            for row in reader:
                if not row or not any(row):
                    continue

                parts = [p.strip() for p in row if p.strip()]
                if len(parts) < 4:
                    continue

                name = ""
                difficulty = "medium"
                score = 0
                total = 10
                percentage = 0.0
                dt = datetime.now(timezone.utc)

                # Format A check: 5 parts or parts[1] is difficulty
                if parts[1].lower() in ("easy", "medium", "hard"):
                    name = parts[0]
                    difficulty = parts[1].lower()
                    score_str = parts[2]
                    if "/" in score_str:
                        num, den = score_str.split("/", 1)
                        try:
                            score = int(num) * 100
                            total = max(1, int(den))
                        except ValueError:
                            score = 0
                    else:
                        try:
                            score = int(score_str)
                        except ValueError:
                            score = 0

                    if len(parts) >= 4:
                        pct_str = parts[3].replace("%", "").strip()
                        try:
                            percentage = float(pct_str)
                        except ValueError:
                            percentage = 0.0

                    if len(parts) >= 5:
                        date_str = parts[4]
                        try:
                            dt = datetime.fromisoformat(date_str)
                        except ValueError:
                            try:
                                dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                            except ValueError:
                                dt = datetime.now(timezone.utc)

                # Format B check: parts[3] is difficulty
                elif parts[-1].lower() in ("easy", "medium", "hard"):
                    name = parts[0]
                    difficulty = parts[-1].lower()
                    try:
                        # Streamlit score was number of correct answers (e.g. 4 -> 400 pts)
                        raw_score = int(parts[1])
                        score = raw_score * 100
                    except ValueError:
                        score = 0

                    date_str = parts[2]
                    try:
                        dt = datetime.fromisoformat(date_str)
                    except ValueError:
                        try:
                            dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                        except ValueError:
                            dt = datetime.now(timezone.utc)

                    percentage = round((score / 1000.0) * 100, 1)

                else:
                    continue

                # Check if already imported
                with self.SessionLocal() as session:
                    existing = session.execute(
                        select(HighScoreDB).where(
                            HighScoreDB.player_name == name,
                            HighScoreDB.score == score,
                            HighScoreDB.difficulty == difficulty,
                        )
                    ).first()

                    if not existing:
                        self.save_score(
                            player_name=name,
                            difficulty=difficulty,
                            score=score,
                            total_questions=total,
                            percentage=percentage,
                            created_at=dt,
                        )
                        migrated_count += 1

        return migrated_count
