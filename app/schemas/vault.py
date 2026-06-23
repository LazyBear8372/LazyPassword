"""볼트 항목 Pydantic 스키마.

ciphertext/nonce는 클라이언트가 AES-GCM으로 암호화한 결과(base64)이며,
서버는 평문을 알지 못한 채 이 값들만 보관한다.
"""

from pydantic import BaseModel, ConfigDict


class VaultItemIn(BaseModel):
    ciphertext: str
    nonce: str


class VaultItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ciphertext: str
    nonce: str
