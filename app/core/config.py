"""애플리케이션 설정. .env 파일에서 값을 읽어온다."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # PostgreSQL 연결 문자열 (예: postgresql+psycopg2://user:pw@localhost:5432/lazypassword)
    database_url: str = "postgresql+psycopg2://lazypassword:lazypassword@localhost:5432/lazypassword"

    # 세션/토큰 서명 등에 쓰는 서버 시크릿 키
    secret_key: str = "change-me-in-env"


settings = Settings()
