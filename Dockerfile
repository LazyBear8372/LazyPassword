FROM python:3.12-slim

# uv 설치 (공식 이미지에서 바이너리 복사)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

# 의존성 먼저 설치 (레이어 캐시 활용)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# 앱 코드
COPY . .
RUN uv sync --frozen && chmod +x docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
