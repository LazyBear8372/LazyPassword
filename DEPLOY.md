# LazyPassword 배포 가이드 (AWS Lightsail)

단일 Lightsail 인스턴스에 Docker Compose로 앱 + Nginx + PostgreSQL을 올린다.

> 중요: 영지식이라도 인증값·세션은 네트워크를 지난다. 실제 데이터로 사용하기 전에 반드시 HTTPS(아래 6단계)를 적용한다. HTTP만으로는 테스트 용도로만 사용한다.

## 1. Lightsail 인스턴스 생성
1. AWS Lightsail 콘솔 → Create instance
2. 플랫폼: Linux/Unix, 블루프린트: OS Only → **Ubuntu 22.04 LTS**
3. 플랜 선택(가장 작은 것부터 가능) → 인스턴스 생성
4. **Networking → 고정 IP(Static IP)** 할당
5. **방화벽(Firewall)**: HTTP(80), HTTPS(443) 허용 추가 (SSH 22는 기본)

## 2. 서버 접속 + Docker 설치
콘솔의 "Connect using SSH" 또는 SSH로 접속 후:
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
# 그룹 적용을 위해 재접속(logout 후 다시 SSH)
```

## 3. 코드 가져오기
```bash
git clone https://github.com/LazyBear8372/LazyPassword.git
cd LazyPassword
```

## 4. 환경변수(.env) 작성
```bash
cp .env.example .env
nano .env
```
다음을 실제 값으로 채운다:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`(강한 무작위), `POSTGRES_DB`
- `SECRET_KEY`: 무작위 생성 → `python3 -c "import secrets;print(secrets.token_urlsafe(32))"`
- `SESSION_HTTPS_ONLY=false` (HTTPS 적용 전까지)

> `DATABASE_URL`은 운영 compose가 host=`db`로 자동 구성하므로 비워두거나 그대로 둬도 된다. `.env`는 절대 커밋하지 않는다.

## 5. 실행 (HTTP)
```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```
- 앱 컨테이너가 시작 시 자동으로 `alembic upgrade head`(테이블 생성)를 수행한다.
- 브라우저에서 `http://<고정IP>/` 접속 → 로그인 화면 확인.

로그 확인:
```bash
docker compose -f docker-compose.prod.yml logs -f app
```

## 6. 도메인 + HTTPS (실사용 전 필수)
1. 도메인의 A 레코드를 Lightsail 고정 IP로 연결
2. 호스트에 Certbot 설치 후 인증서 발급, 또는 nginx 컨테이너에 인증서를 마운트해 443 서버블록 추가
   - 간단한 방법: 호스트에 nginx/certbot을 두는 대신, [nginx-proxy + acme-companion] 또는 Caddy로 교체하는 방법도 있다.
3. `nginx/default.conf`에 443 서버블록과 80→443 리다이렉트를 추가하고 인증서 경로를 지정
4. `.env`에서 `SESSION_HTTPS_ONLY=true`로 변경 후 재기동:
```bash
docker compose -f docker-compose.prod.yml up -d
```

## 운영 메모
- 업데이트 배포: `git pull` 후 `docker compose -f docker-compose.prod.yml up -d --build`
- DB 백업: `docker compose -f docker-compose.prod.yml exec db pg_dump -U <user> <db> > backup.sql`
- DB를 Lightsail 관리형 데이터베이스로 옮기려면, `db` 서비스를 제거하고 `DATABASE_URL`을 관리형 DB 엔드포인트로 지정하면 된다.
