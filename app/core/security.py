"""인증값(authValue)에 대한 서버측 Argon2 해시/검증 유틸.

클라이언트가 보낸 authValue를 그대로 저장하지 않고 Argon2로 한 번 더 해시해 둔다.
"""

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

_hasher = PasswordHasher()


def hash_auth_value(auth_value: str) -> str:
    """authValue를 Argon2로 해시한다 (salt는 내부에서 자동 생성·포함)."""
    return _hasher.hash(auth_value)


def verify_auth_value(auth_hash: str, auth_value: str) -> bool:
    """저장된 auth_hash와 클라이언트가 보낸 authValue가 일치하는지 검증한다."""
    try:
        return _hasher.verify(auth_hash, auth_value)
    except (VerifyMismatchError, InvalidHashError):
        return False
