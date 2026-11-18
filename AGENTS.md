# AGENTS.md

이 파일은 Codex가 이 저장소에서 작업할 때 따르는 프로젝트 지침이다.
가능한 한 최대한 간결하게 답변할 것.

## Project Overview

한국어로 지원되는 **심플한 웹 기반 비밀번호(계정 정보) 저장소**.

사용자가 사이트별로 서로 다른 강력한 비밀번호를 쓰되 모두 외울 필요 없이, 이 서비스에 한 번만 인증하면 저장해둔 계정 정보 목록을 보여주는 통합 비밀번호 관리 서비스다. 1Password, Bitwarden와 같은 범주지만, 부가 기능을 덜어내고 "저장하고 조회한다"는 핵심에만 집중하여 최대한 심플한 서비스를 제공하는 것이 목표다.

## Tech Stack
웹 서버			Nginx
WAS 			Gunicorn + Uvicorn (ASGI worker)
프레임워크		FastAPI
ORM				SQLAlchemy (2.0 스타일)
DB				PostgreSQL (Docker로 실행)
프론트엔드		Jinja2 + JavaScript (fetch / Web Crypto API) + Pico.css

## Security Design
- 영지식(zero-knowledge) 방식: 서버는 사용자 계정 정보의 평문을 절대 보지 못하며, 암호문만 저장한다.
- 마스터 비밀번호 단일 인증 (OAuth 미사용).
- 클라이언트 키 유도: masterKey = PBKDF2(마스터비번, salt = 'lazypassword:' + email, 반복 많이) (브라우저 Web Crypto 내장). salt를 서버에 따로 저장하지 않고 email을 salt로 사용한다(email-as-salt). 비밀번호를 직접 키로 쓰지 않는다.
- 인증/암호화 키 분리: masterKey에서 HKDF로 컨텍스트를 달리해 인증값(authValue)과 암호화 키(encKey)를 유도한다. authValue만 서버로 전송하고 encKey는 탭 세션 동안 브라우저 sessionStorage에 보관한다(서버로 전송하지 않음).
- 서버 저장: 받은 authValue를 Argon2로 한 번 더 해시해 auth_hash로 저장·검증한다. 서버에는 auth_hash와 암호문만 존재한다.
- 암호화/복호화: 계정 정보는 클라이언트에서 AES-GCM으로 암호화/복호화하며, 복호화는 오직 브라우저에서만 수행한다.

## Architecture

### 폴더 구조
```
app/
├── main.py            # FastAPI 앱 진입점, 라우터·템플릿 등록
├── core/
│   ├── config.py      # pydantic-settings 기반 환경변수·.env 로딩 (Settings)
│   └── database.py    # SQLAlchemy 엔진/세션/Base, get_db 의존성
├── models/            # SQLAlchemy ORM 모델 (User, VaultItem)
├── schemas/           # Pydantic 입출력 스키마
├── routers/           # 라우트 (auth, vault 등)
├── templates/         # Jinja2 HTML
└── static/            # CSS/JavaScript (fetch / Web Crypto API)
alembic/               # DB 마이그레이션 (env.py가 .env 기반 settings 사용)
tests/                 # pytest
```

### DB 스키마
- users: 'id', 'email'(unique), 'auth_hash'(Argon2 검증값), 'created_at', 'updated_at'
  - KDF salt는 저장하지 않음 — email을 salt로 사용(email-as-salt)
- vault_items: 'id', 'user_id'(FK→users, CASCADE), 'ciphertext'(암호문 base64), 'nonce'(AES-GCM IV), 'created_at', 'updated_at'

## Flow

### 회원가입
1. 클라이언트: masterKey = PBKDF2(비번, 'lazypassword:'+email) → HKDF로 authValue/encKey 유도 (encKey는 전송하지 않음)
2. 서버로 email, authValue 전송 → 서버가 auth_hash = Argon2(authValue) 저장

### 로그인
1. 클라이언트가 email을 salt로 masterKey 즉시 계산 → authValue 유도 → email, authValue를 한 번에 전송
2. 서버 Argon2.verify(auth_hash, authValue) 성공 시 세션 발급
3. 클라이언트는 encKey = HKDF(masterKey, 'enc')를 sessionStorage에 보관 (탭 닫으면 삭제)

### 볼트 조회·저장
- 조회: 서버는 ciphertext+nonce만 내려주고, 클라이언트가 AES-GCM으로 복호화해 표시
- 저장: 클라이언트가 {title,username,password,url,category}를 AES-GCM 암호화 → ciphertext+nonce만 서버에 전송

### 세션
- SECRET_KEY 기반 서명 쿠키(Starlette SessionMiddleware)로 로그인 상태 유지
- encKey는 세션/쿠키에 넣지 않는다 (영지식 유지)

## Commands
```bash
# 개발 앱·DB 실행 (Python 3.12, 초기 실행 전 .env 설정)
docker compose up --build             # 권한 이슈 시: sg docker -c "docker compose up --build"
docker compose logs -f app
docker compose down                  # DB 데이터 유지

# 마이그레이션
docker compose exec --user "$(id -u):$(id -g)" app .venv/bin/alembic revision --autogenerate -m "<설명>"
docker compose exec app uv run --no-sync alembic upgrade head

# 의존성 추가 (pyproject.toml·uv.lock에 반영)
docker compose run --rm --no-deps app uv add <패키지>
docker compose restart app
```

개발 실행·볼륨 분리·기존 데이터 관련 주의사항은 README.md를 참고한다.

## Open Source Policy
서비스에 대한 신뢰를 위해 모든 코드를 github에 공개할 것이다.
따라서 DB 비밀번호, 서버 시크릿 키 등은 .env에 두고 .gitignore로 제외하며 절대 commit하지 않는다.

## Git Convention

### 작업 흐름

GitHub Flow: 마일스톤 선정 → Issue 생성 → 브랜치 분리 → 작업/검증/커밋 → PR → 검토 후 main 병합.

- 이슈 하나당 브랜치 하나와 PR 하나를 기본으로 한다.
- PR 본문에 `Closes #이슈번호`를 적어 병합 시 관련 이슈를 자동으로 닫는다.
- 관련 이슈와 PR은 같은 마일스톤에 배정한다.
- 마일스톤은 포함된 작업이 모두 완료되고 관련 PR이 병합된 후 닫는다.

### 이슈·PR 제목 및 커밋

이슈 제목, PR 제목, 커밋 메시지는 `<타입>: <한국어 작업 내용>` 형식으로 작성한다.
파일명이나 구현 기술만 적기보다 무엇을 추가하거나 변경하는지 구체적으로 적는다.

- feat: 새 기능 추가
- fix: 버그 수정
- docs: 문서 변경
- refactor: 기능 변화 없는 구조 개선
- chore: 빌드·설정·패키지 등 잡무
- test: 테스트 추가·수정

예: `docs: AGENTS.md 전환 및 개발 규칙 정비`

### 브랜치 이름

`<타입>/<이슈번호>-<짧은-영문-설명>` 형식을 사용한다.
예: `docs/23-agents-guide`, `chore/24-server-readiness`

### 마일스톤

- 기능이나 개발 단계의 목표를 나타내는 한국어 이름을 사용한다.
- 새 작업을 시작할 때 적절한 진행 중 마일스톤에 배정하고, 없으면 새로 만든다.
- 이슈와 구현 PR을 함께 묶어 진행 상황과 완료 여부를 추적한다.
- 목표와 포함 범위는 마일스톤 설명에 적고, 기한은 합의된 경우에만 설정한다.
