# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

한국어로 지원되는 **심플한 웹 기반 비밀번호(계정 정보) 저장소**.

사용자가 사이트별로 서로 다른 강력한 비밀번호를 쓰되 모두 외울 필요 없이, 이 서비스에 한 번만 인증하면 저장해둔 계정 정보 목록을 보여주는 통합 비밀번호 관리 서비스다. 1Password, Bitwarden와 같은 범주지만, 부가 기능을 덜어내고 "저장하고 조회한다"는 핵심에만 집중하여 최대한 심플한 서비스를 제공하는 것이 목표다.

## Tech Stack
웹 서버			Nginx
WAS 			Gunicorn + Uvicorn (ASGI worker)
프레임워크		FastAPI
ORM				SQLAlchemy (2.0 스타일)
DB				PostgreSQL (Docker로 실행)
프론트엔드		Jinja2 + HTMX

## Security Design
- 영지식(zero-knowledge) 방식: 서버는 사용자 계정 정보의 평문을 절대 보지 못하며, 암호문만 저장한다.
- 마스터 비밀번호 단일 인증 (OAuth 미사용).
- 클라이언트 키 유도: masterKey = PBKDF2(마스터비번, salt = 'lazypassword:' + email, 반복 많이) (브라우저 Web Crypto 내장). salt를 서버에 따로 저장하지 않고 email을 salt로 사용한다(email-as-salt). 비밀번호를 직접 키로 쓰지 않는다.
- 인증/암호화 키 분리: masterKey에서 HKDF로 컨텍스트를 달리해 인증값(authValue)과 암호화 키(encKey)를 유도한다. authValue만 서버로 전송하고 encKey는 브라우저 메모리에만 둔다.
- 서버 저장: 받은 authValue를 Argon2로 한 번 더 해시해 auth_hash로 저장·검증한다. 서버에는 auth_hash와 암호문만 존재한다.
- 암호화/복호화: 계정 정보는 클라이언트에서 AES-GCM으로 암호화/복호화하며, 복호화는 오직 브라우저에서만 수행한다.

## Architecture

### 폴더 구조
```
app/
├── main.py            # FastAPI 앱 진입점, 라우터·템플릿 등록
├── core/
│   ├── config.py      # pydantic-settings 기반 .env 로딩 (Settings)
│   └── database.py    # SQLAlchemy 엔진/세션/Base, get_db 의존성
├── models/            # SQLAlchemy ORM 모델 (User, VaultItem)
├── schemas/           # Pydantic 입출력 스키마
├── routers/           # 라우트 (auth, vault 등)
├── templates/         # Jinja2 HTML
└── static/            # CSS/JS (HTMX)
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
3. 클라이언트는 encKey = HKDF(masterKey, 'enc')를 브라우저 메모리에만 보관

### 볼트 조회·저장
- 조회: 서버는 ciphertext+nonce만 내려주고, 클라이언트가 AES-GCM으로 복호화해 표시
- 저장: 클라이언트가 {title,username,password,url,category}를 AES-GCM 암호화 → ciphertext+nonce만 서버에 전송

### 세션
- SECRET_KEY 기반 서명 쿠키(Starlette SessionMiddleware)로 로그인 상태 유지
- encKey는 세션/쿠키에 넣지 않는다 (영지식 유지)

## Commands
```bash
# DB 기동 (Docker PostgreSQL)
docker compose up -d                  # 권한 이슈 시: sg docker -c "docker compose up -d"

# 마이그레이션
uv run alembic revision --autogenerate -m "<설명>"
uv run alembic upgrade head

# 개발 서버 실행
uv run uvicorn app.main:app --reload

# 의존성
uv sync                               # 잠금 파일대로 설치
uv add <패키지>                        # 의존성 추가
```

## Open Source Policy
서비스에 대한 신뢰를 위해 모든 코드를 github에 공개할 것이다.
따라서 DB 비밀번호, 서버 시크릿 키 등은 .env에 두고 .gitignore로 제외하며 절대 commit하지 않는다.

## Git Convention

GitHub Flow: Issue 생성 → 브랜치 분리 → 작업/커밋 → PR로 main 병합. PR 본문에 'Closes #이슈번호'를 적어 병합 시 이슈를 자동으로 닫는다.

Branch Naming: <타입>/<이슈번호>-<짧은-설명>
- 예: feat/12-master-login, fix/15-decrypt-error

Commit Convention: <타입>: <설명>
- feat: 새 기능 추가
- fix: 버그 수정
- docs: 문서 변경
- refactor: 기능 변화 없는 구조 개선
- chore: 빌드·설정·패키지 등 잡무
