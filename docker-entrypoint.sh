#!/bin/sh
set -e

# DB 마이그레이션 적용 후 운영 서버(Gunicorn + Uvicorn worker) 기동
uv run alembic upgrade head
exec uv run gunicorn app.main:app \
  -k uvicorn.workers.UvicornWorker \
  -b 0.0.0.0:8000 \
  --workers "${WEB_CONCURRENCY:-2}"
