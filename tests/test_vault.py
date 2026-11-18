from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

OWNER = {"email": "owner@example.com", "auth_value": "b3duZXItYXV0aC12YWx1ZQ=="}
OTHER_USER = {"email": "other@example.com", "auth_value": "b3RoZXItYXV0aC12YWx1ZQ=="}
ITEM = {"ciphertext": "ZW5jcnlwdGVkLWl0ZW0=", "nonce": "AAECAwQFBgcICQoL"}
UPDATED_ITEM = {"ciphertext": "ZW5jcnlwdGVkLXVwZGF0ZQ==", "nonce": "DA0ODxAREhMUFRYX"}


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("GET", "/vault/items", None),
        ("POST", "/vault/items", ITEM),
        ("PUT", "/vault/items/1", ITEM),
        ("DELETE", "/vault/items/1", None),
    ],
)
def test_vault_requires_session(
    client: TestClient, method: str, path: str, payload: dict[str, str] | None
) -> None:
    assert client.request(method, path, json=payload).status_code == 401


def test_vault_item_crud_preserves_ciphertext_and_nonce(client: TestClient) -> None:
    assert client.post("/signup", json=OWNER).status_code == 200
    assert client.get("/vault/items").json() == []

    created = client.post("/vault/items", json=ITEM)

    assert created.status_code == 201
    item_id = created.json()["id"]
    assert created.json() == {"id": item_id, **ITEM}
    assert client.get("/vault/items").json() == [created.json()]

    updated = client.put(f"/vault/items/{item_id}", json=UPDATED_ITEM)

    assert updated.status_code == 200
    assert updated.json() == {"id": item_id, **UPDATED_ITEM}
    assert client.get("/vault/items").json() == [updated.json()]

    assert client.delete(f"/vault/items/{item_id}").status_code == 204
    assert client.get("/vault/items").json() == []


def test_other_user_cannot_list_update_or_delete_item(
    client: TestClient, new_client: Callable[[], TestClient]
) -> None:
    assert client.post("/signup", json=OWNER).status_code == 200
    created = client.post("/vault/items", json=ITEM)
    assert created.status_code == 201
    item_path = f"/vault/items/{created.json()['id']}"

    other = new_client()
    assert other.post("/signup", json=OTHER_USER).status_code == 200

    assert other.get("/vault/items").json() == []
    assert other.put(item_path, json=UPDATED_ITEM).status_code == 404
    assert other.delete(item_path).status_code == 404
    assert client.get("/vault/items").json() == [created.json()]
