# LazyPassword

브라우저에서 계정 정보를 암호화·복호화하는 웹 비밀번호 저장소.

## 개발 환경

Docker와 Docker Compose가 필요하다. 호스트에 Python·uv를 설치할 필요는 없다.

1. `.env.example`을 `.env`로 복사하고 개발용 `POSTGRES_*`, `SECRET_KEY` 값을 설정한다.
2. `docker compose up --build`로 앱과 PostgreSQL을 실행한다.
3. <http://127.0.0.1:8000>에 접속한다. 포트 변경은 `.env`의 `APP_PORT`로 지정한다.

앱은 DB 준비 후 의존성 동기화와 마이그레이션을 수행하고 Python 3.12의 Uvicorn으로 실행된다.
`app/`의 Python 소스를 수정하면 자동 재시작하며 템플릿·정적 파일도 연결된 소스를 사용한다.
개발 서버는 로컬 HTTP용이므로 운영 `.env`의 설정과 관계없이 Secure 쿠키를 사용하지 않는다.
개발·운영에는 각각 별도 디렉터리와 `.env`를 사용한다.

```bash
# 로그 확인 / 종료 (DB 데이터 유지)
docker compose logs -f app
docker compose down

# Python 버전 / DB 상태 확인
docker compose exec app uv run --no-sync python --version
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

# 의존성 추가·제거 후 앱 재시작
docker compose run --rm --no-deps app uv add <패키지>
docker compose run --rm --no-deps app uv remove <패키지>
docker compose restart app

# 마이그레이션 생성 / 적용
docker compose exec --user "$(id -u):$(id -g)" app .venv/bin/alembic revision --autogenerate -m "<설명>"
docker compose exec app uv run --no-sync alembic upgrade head
```

의존성 변경은 호스트의 `pyproject.toml`과 `uv.lock`에 반영된다.
새 환경이나 Dockerfile 변경 시 `docker compose up --build`로 다시 빌드한다.

## 데이터와 가상환경

- 개발 프로젝트 이름은 `lazypassword-dev`이며, 고정 컨테이너 이름을 사용하지 않는다.
- 개발 DB는 `lazypassword-dev_pgdata`, 가상환경은 `lazypassword-dev_app_venv` 볼륨에 저장한다.
- 호스트 `.venv`는 컨테이너 가상환경과 분리되며, DB는 호스트 포트를 공개하지 않는다.
- 기존 Compose의 DB 볼륨은 삭제하지 않는다. 이름이 달라 기존 데이터는 자동으로 연결되지 않으며 새 개발 DB에서 시작한다.
- `docker compose down`은 데이터를 유지한다. `down -v`는 개발 DB와 가상환경 볼륨까지 삭제하므로 초기화할 때만 사용한다.
- 운영 구성은 `docker compose -f docker-compose.prod.yml ...`로 별도 실행한다.
  개발 파일과 운영 파일을 `-f` 옵션으로 함께 병합하지 않는다.
