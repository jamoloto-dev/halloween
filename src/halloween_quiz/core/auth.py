"""Authentication and Session Management for Spooky Master.

Provides cryptographically secure PBKDF2 password hashing, tokenized session
management, guest identity creation, and role-based access authorization.
Guarantees normal players and guests NEVER receive administrative privileges.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
import secrets
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from halloween_quiz.core.storage import ScoreRepository

logger = logging.getLogger("halloween_quiz.auth")


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 rounds and random salt."""
    salt = secrets.token_hex(16)
    kdf = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"pbkdf2:sha256:100000${salt}${kdf.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against stored PBKDF2 hash using constant-time comparison."""
    try:
        parts = hashed.split("$")
        if len(parts) != 3:
            return False
        _, salt, target_hex = parts
        kdf = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
        return secrets.compare_digest(kdf.hex(), target_hex)
    except Exception:
        return False


class AuthService:
    """Authoritative Authentication Service backed by durable storage."""

    def __init__(self, repo: ScoreRepository | None = None):
        self.repo = repo

    def set_repository(self, repo: ScoreRepository) -> None:
        self.repo = repo

    def register_user(
        self,
        username: str,
        password: str,
        nickname: str | None = None,
        avatar_id: str | None = "pumpkin_hunter",
    ) -> dict:
        """Register a new user account with role='player' (never admin)."""
        if not self.repo:
            raise RuntimeError("AuthService repository not configured")

        clean_username = username.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_-]{3,30}$", clean_username):
            raise ValueError(
                "Username must be 3-30 characters containing only letters, numbers, hyphens, and underscores."
            )

        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters.")

        clean_nickname = (nickname or clean_username).strip()
        while clean_nickname and clean_nickname[0] in ("=", "+", "-", "@", "\t", "\r"):
            clean_nickname = clean_nickname[1:].strip()
        clean_nickname = clean_nickname[:40] or clean_username

        clean_avatar = (avatar_id or "pumpkin_hunter").strip()[:50]

        existing = self.repo.get_user_by_username(clean_username)
        if existing:
            raise ValueError(f"Username '{clean_username}' is already taken.")

        pwd_hash = hash_password(password)
        user_dict = self.repo.create_user(
            username=clean_username,
            password_hash=pwd_hash,
            role="player",  # STRICTLY player role
            nickname=clean_nickname,
            avatar_id=clean_avatar,
        )

        # Generate active session
        token = self.repo.create_user_session(
            user_id=user_dict["user_id"],
            role="player",
            is_guest=False,
            ttl_seconds=86400 * 30,  # 30 days
        )

        return {
            "token": token,
            "user_id": user_dict["user_id"],
            "username": clean_username,
            "role": "player",
            "nickname": clean_nickname,
            "avatar_id": clean_avatar,
            "is_guest": False,
            "message": "Account created successfully.",
        }

    def login_user(self, username: str, password: str) -> dict:
        """Authenticate user credentials and issue an active session token."""
        if not self.repo:
            raise RuntimeError("AuthService repository not configured")

        clean_username = username.strip().lower()
        user = self.repo.get_user_by_username(clean_username)
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid username or password.")

        # Ensure role is safe: only "admin" if explicitly set in DB
        role = user.role if user.role in ("admin", "player") else "player"

        token = self.repo.create_user_session(
            user_id=user.user_id,
            role=role,
            is_guest=False,
            ttl_seconds=86400 * 30,
        )

        return {
            "token": token,
            "user_id": user.user_id,
            "username": user.username,
            "role": role,
            "nickname": user.nickname,
            "avatar_id": user.avatar_id,
            "is_guest": False,
            "message": "Signed in successfully.",
        }

    def create_guest_session(
        self,
        nickname: str | None = None,
        avatar_id: str | None = "pumpkin_hunter",
    ) -> dict:
        """Create a transient guest player session. Guaranteed role='player' (never admin)."""
        if not self.repo:
            raise RuntimeError("AuthService repository not configured")

        guest_id = f"guest_{secrets.token_hex(12)}"
        clean_nickname = (nickname or "Ghost Hunter").strip()
        while clean_nickname and clean_nickname[0] in ("=", "+", "-", "@", "\t", "\r"):
            clean_nickname = clean_nickname[1:].strip()
        clean_nickname = clean_nickname[:40] or "Ghost Hunter"

        clean_avatar = (avatar_id or "pumpkin_hunter").strip()[:50]

        token = self.repo.create_user_session(
            user_id=guest_id,
            role="player",  # STRICTLY player role
            is_guest=True,
            ttl_seconds=86400 * 7,  # 7 days
        )

        return {
            "token": token,
            "user_id": guest_id,
            "username": f"guest_{guest_id[-6:]}",
            "role": "player",
            "nickname": clean_nickname,
            "avatar_id": clean_avatar,
            "is_guest": True,
            "message": "Guest session initialized.",
        }

    def authenticate_token(self, token: str | None) -> dict | None:
        """Validate an active session token and return user identity and role."""
        if not token or not self.repo:
            return None

        clean_token = token.strip()
        if clean_token.startswith("Bearer "):
            clean_token = clean_token[7:].strip()

        session_data = self.repo.get_session(clean_token)
        if not session_data:
            return None

        # Check expiration
        expires_at = session_data.get("expires_at")
        if expires_at:
            if isinstance(expires_at, str):
                try:
                    expires_at = datetime.fromisoformat(expires_at)
                except Exception:
                    expires_at = None
            if expires_at and hasattr(expires_at, "tzinfo") and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at and expires_at < datetime.now(timezone.utc):
                self.repo.delete_session(clean_token)
                return None

        user_id = session_data["user_id"]
        is_guest = session_data.get("is_guest", False)
        role = session_data.get("role", "player")

        if is_guest:
            return {
                "user_id": user_id,
                "username": f"guest_{user_id[-6:]}",
                "role": "player",  # Never admin
                "nickname": "Ghost Hunter",
                "avatar_id": "pumpkin_hunter",
                "is_guest": True,
            }

        user = self.repo.get_user_by_id(user_id)
        if not user:
            return None

        return {
            "user_id": user.user_id,
            "username": user.username,
            "role": user.role,
            "nickname": user.nickname,
            "avatar_id": user.avatar_id,
            "is_guest": False,
        }

    def logout_token(self, token: str | None) -> bool:
        """Invalidate an active session token."""
        if not token or not self.repo:
            return False

        clean_token = token.strip()
        if clean_token.startswith("Bearer "):
            clean_token = clean_token[7:].strip()

        return self.repo.delete_session(clean_token)


# Global singleton instance
auth_service = AuthService()
