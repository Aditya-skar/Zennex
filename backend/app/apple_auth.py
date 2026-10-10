"""Verify Sign in with Apple identity tokens."""
import json
from urllib.request import urlopen

from jose import jwt
from jose.exceptions import JWTError

APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"
_keys_cache: dict | None = None


def _apple_public_keys() -> dict:
    global _keys_cache
    if _keys_cache is None:
        with urlopen(APPLE_KEYS_URL, timeout=10) as resp:
            _keys_cache = json.load(resp)
    return _keys_cache


def verify_apple_id_token(id_token: str, client_id: str) -> dict:
    keys = _apple_public_keys()
    try:
        return jwt.decode(
            id_token,
            keys,
            algorithms=["RS256"],
            audience=client_id,
            options={"verify_exp": True},
        )
    except JWTError as exc:
        raise ValueError("Invalid Apple token") from exc
