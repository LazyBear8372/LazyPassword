"""회원가입·로그인·로그아웃 라우터."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_auth_value, verify_auth_value
from app.models import User
from app.schemas.auth import LoginRequest, SignupRequest

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/signup", response_class=HTMLResponse)
def signup_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "signup.html")


@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "login.html")


@router.post("/signup")
def signup(request: Request, payload: SignupRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    exists = db.scalar(select(User).where(User.email == payload.email))
    if exists is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 가입된 이메일입니다.")

    user = User(email=payload.email, auth_hash=hash_auth_value(payload.auth_value))
    db.add(user)
    db.commit()
    db.refresh(user)

    request.session["user_id"] = user.id
    return {"status": "ok"}


@router.post("/login")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_auth_value(user.auth_hash, payload.auth_value):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="이메일 또는 비밀번호가 올바르지 않습니다."
        )

    request.session["user_id"] = user.id
    return {"status": "ok"}


@router.post("/logout")
def logout(request: Request) -> RedirectResponse:
    request.session.clear()
    return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
