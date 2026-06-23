"""볼트 항목 CRUD 라우터. 모든 항목은 암호문 상태로만 다룬다."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user_id
from app.models import VaultItem
from app.schemas.vault import VaultItemIn, VaultItemOut

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/vault", response_class=HTMLResponse)
def vault_page(request: Request, _: int = Depends(get_current_user_id)) -> HTMLResponse:
    return templates.TemplateResponse(request, "vault.html")


@router.get("/vault/items", response_model=list[VaultItemOut])
def list_items(
    user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)
) -> list[VaultItem]:
    items = db.scalars(
        select(VaultItem).where(VaultItem.user_id == user_id).order_by(VaultItem.id)
    ).all()
    return list(items)


@router.post("/vault/items", response_model=VaultItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: VaultItemIn,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> VaultItem:
    item = VaultItem(user_id=user_id, ciphertext=payload.ciphertext, nonce=payload.nonce)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _get_owned_item(item_id: int, user_id: int, db: Session) -> VaultItem:
    item = db.get(VaultItem, item_id)
    if item is None or item.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="항목을 찾을 수 없습니다.")
    return item


@router.put("/vault/items/{item_id}", response_model=VaultItemOut)
def update_item(
    item_id: int,
    payload: VaultItemIn,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> VaultItem:
    item = _get_owned_item(item_id, user_id, db)
    item.ciphertext = payload.ciphertext
    item.nonce = payload.nonce
    db.commit()
    db.refresh(item)
    return item


@router.delete("/vault/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> None:
    item = _get_owned_item(item_id, user_id, db)
    db.delete(item)
    db.commit()
