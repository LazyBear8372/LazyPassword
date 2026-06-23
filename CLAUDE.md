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
- 마스터 비밀번호 단일 인증
- 키 유도: 마스터 비밀번호 → KDF(Argon2) → 암호화 키. 비밀번호를 직접 키로 쓰지 않는다.
- 인증/암호화 키 분리 — 같은 마스터 비번에서 서버 전달용 인증 해시와 클라이언트 전용 암호화 키를 서로 다르게 유도한다. 서버에는 인증 해시와 암호문만 저장된다.
- 복호화 위치 — 오직 클라이언트(브라우저)에서만 수행한다.

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
