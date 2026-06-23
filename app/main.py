"""LazyPassword FastAPI 애플리케이션 진입점."""

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.routers import auth, vault

app = FastAPI(title="LazyPassword", description="웹 비밀번호 저장소")
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    https_only=settings.session_https_only,
    same_site="lax",
)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(auth.router)
app.include_router(vault.router)


@app.get("/")
def index(request: Request) -> RedirectResponse:
    """로그인 상태면 볼트로, 아니면 로그인 페이지로 보낸다."""
    if request.session.get("user_id") is None:
        return RedirectResponse(url="/login")
    return RedirectResponse(url="/vault")
