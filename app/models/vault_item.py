"""vault_items 테이블 모델: 영지식 암호문으로 저장되는 계정 항목."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class VaultItem(Base):
    __tablename__ = "vault_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # {title, username, password, url, memo} JSON을 클라이언트에서 AES-GCM 암호화한 결과 (base64)
    ciphertext: Mapped[str] = mapped_column(Text, nullable=False)
    # AES-GCM 복호화에 필요한 nonce/IV (base64)
    nonce: Mapped[str] = mapped_column(String, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="items")  # noqa: F821
