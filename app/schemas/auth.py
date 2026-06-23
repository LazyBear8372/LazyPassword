"""인증 요청 Pydantic 스키마."""

from pydantic import BaseModel, EmailStr


class AuthRequest(BaseModel):
    """회원가입·로그인 공통 요청 형식.

    auth_value: 클라이언트가 PBKDF2+HKDF로 유도해 base64로 인코딩한 인증값.
    """

    email: EmailStr
    auth_value: str


class SignupRequest(AuthRequest):
    pass


class LoginRequest(AuthRequest):
    pass
