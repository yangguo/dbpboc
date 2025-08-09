"""No-op security utilities after removing authentication.

Left in place to avoid import errors where referenced.
"""

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return True

def get_password_hash(password: str) -> str:
    return password