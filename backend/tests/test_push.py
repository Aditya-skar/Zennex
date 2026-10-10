import json

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy import select

from app import push
from app.database import AsyncSessionLocal
from app.models import UserDeviceToken

from .test_moderation import make_event


@pytest.fixture(scope="module")
def service_account_json() -> str:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    return json.dumps(
        {
            "project_id": "demo-proj",
            "client_email": "svc@demo-proj.iam.gserviceaccount.com",
            "private_key": pem,
            "token_uri": "https://oauth2.example/token",
        }
    )


@pytest.fixture
def fcm(monkeypatch, settings, service_account_json):
    """Enables FCM and captures outgoing requests instead of hitting Google."""
    sent: list[dict] = []
    behaviour = {"fcm_status": 200, "fcm_text": "{}"}

    def fake_post(url, *, headers, body, timeout=15.0):
        if url == "https://oauth2.example/token":
            return 200, json.dumps({"access_token": "tok", "expires_in": 3600})
        payload = json.loads(body)["message"]
        sent.append({"url": url, "message": payload, "auth": headers.get("Authorization")})
        return behaviour["fcm_status"], behaviour["fcm_text"]

    monkeypatch.setattr(push, "_http_post", fake_post)
    monkeypatch.setattr(settings, "fcm_service_account_json", service_account_json)
    monkeypatch.setattr(push, "_client_cache", None)
    yield sent, behaviour
    push._client_cache = None


async def register_device(client, acct, token, platform="android"):
    res = await client.post(
        "/api/me/device-token", headers=acct.headers, json={"platform": platform, "token": token}
    )
    assert res.status_code == 200, res.text


async def test_push_is_noop_when_unconfigured(client, make_user):
    a = await make_user("alice")
    b = await make_user("bobby")
    await register_device(client, b, "bobby-device")
    res = await client.post("/api/follows/" + b.id, headers=a.headers)
    assert res.status_code == 201
    await push.drain()  # nothing queued, nothing raised


async def test_new_message_pushes_recipient_only(client, make_user, fcm):
    sent, _ = fcm
    a = await make_user("alice")
    b = await make_user("bobby")
    await register_device(client, a, "alice-device")
    await register_device(client, b, "bobby-device")

    conv = await client.post("/api/conversations", headers=a.headers, json={"type": "dm", "memberIds": [b.id]})
    res = await client.post(
        f"/api/conversations/{conv.json()['id']}/messages",
        headers=a.headers,
        json={"kind": "text", "text": "hey there"},
    )
    assert res.status_code == 201
    await push.drain()

    assert len(sent) == 1
    msg = sent[0]["message"]
    assert msg["token"] == "bobby-device"
    assert msg["notification"]["body"] == "hey there"
    assert msg["data"]["type"] == "message"
    assert sent[0]["auth"] == "Bearer tok"
    assert "demo-proj" in sent[0]["url"]


async def test_muted_conversation_and_blocked_sender_get_no_push(client, make_user, fcm):
    sent, _ = fcm
    a = await make_user("alice")
    b = await make_user("bobby")
    await register_device(client, b, "bobby-device")
    conv = await client.post("/api/conversations", headers=a.headers, json={"type": "dm", "memberIds": [b.id]})
    cid = conv.json()["id"]

    await client.patch(f"/api/conversations/{cid}/prefs", headers=b.headers, json={"muted": True})
    await client.post(f"/api/conversations/{cid}/messages", headers=a.headers, json={"kind": "text", "text": "x"})
    await push.drain()
    assert sent == []


async def test_follow_dab_up_and_event_join_notifications(client, make_user, fcm):
    sent, _ = fcm
    host = await make_user("host")
    guest = await make_user("guest")
    await register_device(client, host, "host-device")
    await register_device(client, guest, "guest-device")

    await client.post(f"/api/follows/{host.id}", headers=guest.headers)
    await push.drain()
    assert [(s["message"]["token"], s["message"]["data"]["type"]) for s in sent] == [("host-device", "follow")]

    sent.clear()
    await client.post("/api/dab-ups/request", headers=guest.headers, json={"userId": host.id})
    await push.drain()
    assert sent[-1]["message"]["token"] == "host-device"
    assert sent[-1]["message"]["data"]["type"] == "dab_up_request"

    sent.clear()
    await client.post("/api/dab-ups/request", headers=host.headers, json={"userId": guest.id})
    await push.drain()
    assert sent[-1]["message"]["token"] == "guest-device"
    assert sent[-1]["message"]["data"]["type"] == "dab_up"

    sent.clear()
    event = await make_event(client, host)
    res = await client.post(f"/api/events/{event['id']}/join", headers=guest.headers)
    assert res.status_code == 200, res.text
    await push.drain()
    assert sent[-1]["message"]["token"] == "host-device"
    assert sent[-1]["message"]["data"]["type"] == "event_join"

    # Re-joining is idempotent and must not notify twice.
    sent.clear()
    await client.post(f"/api/events/{event['id']}/join", headers=guest.headers)
    await push.drain()
    assert sent == []


async def test_dead_tokens_are_pruned(client, make_user, fcm):
    sent, behaviour = fcm
    behaviour["fcm_status"] = 404
    behaviour["fcm_text"] = json.dumps({"error": {"status": "NOT_FOUND", "message": "UNREGISTERED"}})

    a = await make_user("alice")
    b = await make_user("bobby")
    await register_device(client, b, "stale-device")
    await client.post(f"/api/follows/{b.id}", headers=a.headers)
    await push.drain()

    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(UserDeviceToken))).scalars().all()
        assert rows == []


async def test_device_token_moves_between_accounts_and_can_be_removed(client, make_user):
    a = await make_user("alice")
    b = await make_user("bobby")
    await register_device(client, a, "shared-phone")
    await register_device(client, b, "shared-phone")  # phone changed hands

    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(UserDeviceToken))).scalars().all()
        assert [(r.user_id, r.token) for r in rows] == [(b.id, "shared-phone")]

    res = await client.delete("/api/me/device-token", headers=b.headers, params={"platform": "android"})
    assert res.status_code == 200
    async with AsyncSessionLocal() as db:
        assert (await db.execute(select(UserDeviceToken))).scalars().all() == []


async def test_web_tokens_never_receive_push(client, make_user, fcm):
    sent, _ = fcm
    a = await make_user("alice")
    b = await make_user("bobby")
    await register_device(client, b, "browser-token", platform="web")
    await client.post(f"/api/follows/{b.id}", headers=a.headers)
    await push.drain()
    assert sent == []
