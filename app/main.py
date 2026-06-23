"""LazyPassword FastAPI 애플리케이션 진입점."""

from fastapi import FastAPI

app = FastAPI(title="LazyPassword", description="웹 비밀번호 저장소")


@app.get("/")
def read_root() -> dict[str, str]:
    return {"status": "ok"}
