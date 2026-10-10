from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import User

from .conftest import tick


async def me(client, acct):
    return await client.get("/api/users/me", headers=acct.headers)


async def test_signup_login_and_me(client, make_user):
    a = await make_user("alice", email="alice@example.com")
    res = await client.post("/api/auth/login", json={"username": "alice", "password": "secret123"})
    assert res.status_code == 200
    assert res.json()["user"]["id"] == a.id
    assert res.json()["user"]["emailVerified"] is False

    bad = await client.post("/api/auth/login", json={"username": "alice", "password": "nope"})
    assert bad.status_code == 401


async def test_duplicate_username_and_email(client, make_user):
    await make_user("alice", email="alice@example.com")
    res = await client.post(
        "/api/auth/signup",
        json={"username": "alice", "password": "secret123", "fullName": "x"},
    )
    assert res.status_code == 409
    res = await client.post(
        "/api/auth/signup",
        json={"username": "alice2", "password": "secret123", "fullName": "x", "email": "ALICE@example.com"},
    )
    assert res.status_code == 409


async def test_requires_token(client):
    res = await client.get("/api/me/stats")
    assert res.status_code == 401
    res = await client.get("/api/me/stats", headers={"Authorization": "Bearer garbage"})
    assert res.status_code == 401


async def test_logout_revokes_only_that_token(client, make_user):
    a = await make_user("alice")
    await tick()
    other = await client.post("/api/auth/login", json={"username": "alice", "password": "secret123"})
    other_headers = {"Authorization": f"Bearer {other.json()['token']}"}

    assert (await client.post("/api/auth/logout", headers=a.headers)).status_code == 200
    assert (await client.get("/api/me/stats", headers=a.headers)).status_code == 401
    assert (await client.get("/api/me/stats", headers=other_headers)).status_code == 200


async def test_logout_all_invalidates_every_session_but_new_logins_work(client, make_user):
    a = await make_user("alice")
    await tick()
    second = await client.post("/api/auth/login", json={"username": "alice", "password": "secret123"})
    second_headers = {"Authorization": f"Bearer {second.json()['token']}"}

    await tick()
    assert (await client.post("/api/auth/logout-all", headers=a.headers)).status_code == 200
    assert (await client.get("/api/me/stats", headers=a.headers)).status_code == 401
    assert (await client.get("/api/me/stats", headers=second_headers)).status_code == 401

    await tick()
    fresh = await client.post("/api/auth/login", json={"username": "alice", "password": "secret123"})
    fresh_headers = {"Authorization": f"Bearer {fresh.json()['token']}"}
    assert (await client.get("/api/me/stats", headers=fresh_headers)).status_code == 200


async def test_change_password_signs_out_other_devices(client, make_user):
    a = await make_user("alice")
    await tick()

    wrong = await client.post(
        "/api/auth/change-password",
        headers=a.headers,
        json={"currentPassword": "bad", "newPassword": "brandnew1"},
    )
    assert wrong.status_code == 401

    await tick()
    res = await client.post(
        "/api/auth/change-password",
        headers=a.headers,
        json={"currentPassword": "secret123", "newPassword": "brandnew1"},
    )
    assert res.status_code == 200
    new_headers = {"Authorization": f"Bearer {res.json()['token']}"}

    assert (await client.get("/api/me/stats", headers=a.headers)).status_code == 401
    assert (await client.get("/api/me/stats", headers=new_headers)).status_code == 200

    login = await client.post("/api/auth/login", json={"username": "alice", "password": "brandnew1"})
    assert login.status_code == 200


async def test_forgot_and_reset_password_flow(client, make_user):
    a = await make_user("alice", email="alice@example.com")

    unknown = await client.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})
    assert unknown.status_code == 200
    assert unknown.json().get("resetToken") is None  # never reveals existence

    res = await client.post("/api/auth/forgot-password", json={"email": "alice@example.com"})
    assert res.status_code == 200
    token = res.json()["resetToken"]  # dev mode: Resend unset → token echoed
    assert token

    await tick()
    ok = await client.post("/api/auth/reset-password", json={"token": token, "newPassword": "reset-pass-1"})
    assert ok.status_code == 200

    reuse = await client.post("/api/auth/reset-password", json={"token": token, "newPassword": "another-1"})
    assert reuse.status_code == 400

    # Old sessions are dead, new password works, and ownership was proven.
    assert (await client.get("/api/me/stats", headers=a.headers)).status_code == 401
    login = await client.post("/api/auth/login", json={"username": "alice", "password": "reset-pass-1"})
    assert login.status_code == 200
    assert login.json()["user"]["emailVerified"] is True


async def test_email_verification_flow(client, make_user):
    a = await make_user("alice", email="alice@example.com")

    res = await client.post("/api/auth/send-verification", headers=a.headers)
    assert res.status_code == 200
    token = res.json()["verificationToken"]
    assert token

    assert (await client.post("/api/auth/verify-email", json={"token": "wrong"})).status_code == 400
    assert (await client.post("/api/auth/verify-email", json={"token": token})).status_code == 200
    # Single use.
    assert (await client.post("/api/auth/verify-email", json={"token": token})).status_code == 400

    again = await client.post("/api/auth/send-verification", headers=a.headers)
    assert again.json()["alreadyVerified"] is True

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.id == a.id))).scalar_one()
        assert user.email_verified is True


async def test_send_verification_requires_email(client, make_user):
    a = await make_user("noemail")
    res = await client.post("/api/auth/send-verification", headers=a.headers)
    assert res.status_code == 400


async def test_verification_token_is_bound_to_the_mailed_address(client, make_user):
    a = await make_user("alice", email="alice@example.com")
    token = (await client.post("/api/auth/send-verification", headers=a.headers)).json()["verificationToken"]

    async with AsyncSessionLocal() as db:  # simulate an email change after the mail went out
        user = (await db.execute(select(User).where(User.id == a.id))).scalar_one()
        user.email = "attacker@example.com"
        await db.commit()

    assert (await client.post("/api/auth/verify-email", json={"token": token})).status_code == 400


async def test_suspended_user_is_locked_out(client, make_user):
    a = await make_user("alice")
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.id == a.id))).scalar_one()
        user.is_suspended = True
        await db.commit()

    assert (await client.get("/api/me/stats", headers=a.headers)).status_code == 403
    login = await client.post("/api/auth/login", json={"username": "alice", "password": "secret123"})
    assert login.status_code == 403


async def test_oauth_disabled_without_client_ids(client):
    assert (await client.post("/api/auth/google", json={"idToken": "x"})).status_code == 501
    assert (await client.post("/api/auth/apple", json={"idToken": "x"})).status_code == 501
