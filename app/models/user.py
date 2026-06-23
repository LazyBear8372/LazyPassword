"""users 테이블 모델."""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)

    # 서버측 로그인 검증값: 클라이언트가 보낸 인증값을 Argon2로 다시 해시한 값
    # (KDF salt는 별도 저장하지 않고 email을 salt로 사용한다 — email-as-salt)
    auth_hash: Mapped[str] = mapped_column(String, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    items: Mapped[list["VaultItem"]] = relationship(  # noqa: F821
        back_populates="user", cascade="all, delete-orphan"
    )
