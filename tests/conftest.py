import os
from collections.abc import Callable, Iterator
from contextlib import ExitStack

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.main import app


@pytest.fixture(scope="session")
def test_engine() -> Iterator[Engine]:
    database_url = os.environ.get("TEST_DATABASE_URL")
    if not database_url:
        pytest.fail("마이그레이션을 적용한 테스트 DB를 TEST_DATABASE_URL에 지정하세요.")

    engine = create_engine(database_url)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def new_client(test_engine: Engine) -> Iterator[Callable[[], TestClient]]:
    with test_engine.connect() as connection:
        # 요청의 commit은 savepoint만 해제하고, 연결을 닫으면 테스트의 변경을 롤백한다.
        connection.begin()

        def get_test_db() -> Iterator[Session]:
            with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
                yield session

        app.dependency_overrides[get_db] = get_test_db
        try:
            with ExitStack() as clients:

                def make_client() -> TestClient:
                    return clients.enter_context(
                        TestClient(app, base_url="https://testserver", follow_redirects=False)
                    )

                yield make_client
        finally:
            app.dependency_overrides.pop(get_db)


@pytest.fixture
def client(new_client: Callable[[], TestClient]) -> TestClient:
    return new_client()
