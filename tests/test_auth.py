from fastapi.testclient import TestClient

ACCOUNT = {
    "email": "member@example.com",
    "auth_value": "dGVzdC1hdXRoLXZhbHVl",
}


def test_signup_creates_session_and_rejects_duplicate_email(client: TestClient) -> None:
    assert client.get("/").headers["location"] == "/login"

    signup = client.post("/signup", json=ACCOUNT)

    assert signup.status_code == 200
    assert signup.json() == {"status": "ok"}
    assert client.get("/").headers["location"] == "/vault"
    assert client.get("/vault").status_code == 200
    assert client.post("/signup", json=ACCOUNT).status_code == 409


def test_login_verifies_auth_value_and_logout_ends_session(client: TestClient) -> None:
    assert client.post("/signup", json=ACCOUNT).status_code == 200

    logout = client.post("/logout")

    assert logout.status_code == 303
    assert logout.headers["location"] == "/login"
    assert client.get("/vault/items").status_code == 401

    invalid_login = client.post("/login", json={**ACCOUNT, "auth_value": "incorrect"})

    assert invalid_login.status_code == 401
    assert client.get("/vault/items").status_code == 401

    login = client.post("/login", json=ACCOUNT)

    assert login.status_code == 200
    assert login.json() == {"status": "ok"}
    assert client.get("/vault/items").status_code == 200
