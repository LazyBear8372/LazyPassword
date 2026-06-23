"""LazyPassword FastAPI 애플리케이션 진입점."""

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.routers import auth

app = FastAPI(title="LazyPassword", description="웹 비밀번호 저장소")
app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

templates = Jinja2Templates(directory="app/templates")

app.include_router(auth.router)


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    """로그인 상태면 홈, 아니면 로그인 페이지로 보낸다."""
    user_id = request.session.get("user_id")
    if user_id is None:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse(request, "home.html", {"user_id": user_id})
