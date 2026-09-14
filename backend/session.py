import os
import warnings
from fastapi import HTTPException
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from backend.models import GameState

# Max token age: 48 hours (172800 seconds)
TOKEN_MAX_AGE_SECONDS: int = 48 * 3600

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = "ctrl-a-game-secret-key-2026-secure-token-production-fallback"
    warnings.warn(
        "SECRET_KEY is not set. Using safe fallback key.",
        UserWarning,
        stacklevel=2,
    )

_serializer = URLSafeTimedSerializer(SECRET_KEY, salt="collecting-a-word-state")


def create_token(state: GameState) -> str:
    """Serializes and signs the GameState dictionary into a secure URL-safe token."""
    return _serializer.dumps(state.model_dump())


def verify_token(token: str) -> GameState:
    """Deserializes and validates the token signature and age.

    Raises HTTPException(401) on invalid or tampered tokens.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=401,
            detail="Session token missing or invalid format.",
        )
    try:
        data = _serializer.loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
        return GameState(**data)
    except SignatureExpired:
        raise HTTPException(
            status_code=401,
            detail="Session token has expired. Please restart the game.",
        )
    except BadSignature:
        raise HTTPException(
            status_code=401,
            detail="Tampered or invalid session token. Game session rejected.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail=f"Session validation failed: {str(exc)}",
        )

