"""Storage repository for Halloween Quiz using SQLite and SQLAlchemy."""

import csv
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import (
    DateTime,
    Float,
    Integer,
    String,
    create_engine,
    desc,
    event,
    select,
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
    score: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_model(self) -> ScoreRecord:
        dt = self.created_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return ScoreRecord(
            id=self.id,
            player_name=str(self.player_name),
            difficulty=str(self.difficulty),
            score=int(self.score),
            total_questions=int(self.total_questions),
            percentage=float(self.percentage),
            created_at=dt,
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
    """Thread-safe SQLite repository for high score persistence and leaderboard queries."""

    def __init__(self, db_path: str = "data/halloween.db"):
        self.db_path = Path(db_path)
        if str(db_path) != ":memory:":
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            db_url = f"sqlite:///{self.db_path.resolve()}"
        else:
            db_url = "sqlite:///:memory:"

        self.engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

    def save_score(
        self,
        player_name: str,
        difficulty: str,
        score: int,
        total_questions: int = 10,
        percentage: float | None = None,
        created_at: datetime | None = None,
    ) -> ScoreRecord:
        """Persist a player's quiz score."""
        # Sanitize CSV/formula characters
        clean_name = player_name.strip()
        while clean_name and clean_name[0] in ("=", "+", "-", "@", "\t", "\r"):
            clean_name = clean_name[1:].strip()
        clean_name = clean_name[:100] or "Anonymous Ghost"

        if percentage is None:
            percentage = round((score / (total_questions * 100)) * 100, 1) if total_questions > 0 else 0.0

        if created_at is None:
            created_at = datetime.now(timezone.utc)

        db_item = HighScoreDB(
            player_name=clean_name,
            difficulty=difficulty.lower(),
            score=score,
            total_questions=total_questions,
            percentage=max(0.0, min(100.0, percentage)),
            created_at=created_at,
        )

        with self.SessionLocal() as session:
            session.add(db_item)
            session.commit()
            session.refresh(db_item)
            return db_item.to_model()

    def get_leaderboard(
        self,
        difficulty: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[ScoreRecord]:
        """Fetch top scores sorted by score descending, then created_at ascending."""
        limit = max(1, min(100, limit))
        offset = max(0, offset)

        with self.SessionLocal() as session:
            stmt = select(HighScoreDB)
            if difficulty:
                stmt = stmt.where(HighScoreDB.difficulty == difficulty.lower())
            stmt = stmt.order_by(desc(HighScoreDB.score), HighScoreDB.created_at.asc()).offset(offset).limit(limit)
            results = session.execute(stmt).scalars().all()
            return [row.to_model() for row in results]

    def count_scores(self, difficulty: str | None = None) -> int:
        """Count total scores recorded."""
        with self.SessionLocal() as session:
            stmt = select(HighScoreDB)
            if difficulty:
                stmt = stmt.where(HighScoreDB.difficulty == difficulty.lower())
            return len(session.execute(stmt).scalars().all())

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
