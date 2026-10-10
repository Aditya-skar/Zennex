from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Message, MessageReaction, Post, PostLike, User


async def make_event(client, acct, title="Pickup", coords=(12.97, 77.59)):
    res = await client.post(
        "/api/events",
        headers=acct.headers,
        json={
            "title": title,
            "category": "Football",
            "mainCategory": "Sports",
            "coordinates": list(coords),
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


async def make_post(client, acct, event_id, caption="hello"):
    res = await client.post(
        "/api/posts", headers=acct.headers, json={"eventId": event_id, "type": "text", "caption": caption}
    )
    assert res.status_code == 201, res.text
    return res.json()


async def file_report(client, reporter, target_type, target_id, reason="spam"):
    res = await client.post(
        "/api/reports",
        headers=reporter.headers,
        json={"targetType": target_type, "targetId": target_id, "reason": reason},
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


async def test_admin_endpoints_require_admin(client, make_user):
    regular = await make_user("regular")
    assert (await client.get("/api/admin/reports", headers=regular.headers)).status_code == 403
    assert (await client.get("/api/admin/stats", headers=regular.headers)).status_code == 403
    assert (await client.get("/api/admin/reports")).status_code == 401


async def test_admin_by_username_bootstrap_and_stats(client, make_user):
    root = await make_user("root")
    res = await client.get("/api/admin/stats", headers=root.headers)
    assert res.status_code == 200
    assert res.json()["users"] == 1


async def test_report_queue_and_triage(client, make_user):
    root = await make_user("root")
    reporter = await make_user("reporter")
    offender = await make_user("offender")
    rid = await file_report(client, reporter, "user", offender.id)

    listing = await client.get("/api/admin/reports?status=open", headers=root.headers)
    assert listing.status_code == 200
    assert [r["id"] for r in listing.json()] == [rid]
    assert listing.json()[0]["reporterUsername"] == "reporter"

    res = await client.patch(
        f"/api/admin/reports/{rid}", headers=root.headers, json={"status": "reviewing", "note": "looking"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "reviewing"
    assert res.json()["resolvedAt"] is None

    res = await client.patch(
        f"/api/admin/reports/{rid}", headers=root.headers, json={"status": "dismissed", "note": "fine"}
    )
    assert res.json()["status"] == "dismissed"
    assert res.json()["resolvedBy"] == root.id
    assert res.json()["resolvedAt"]

    assert (await client.get("/api/admin/reports?status=open", headers=root.headers)).json() == []


async def test_remove_reported_post_cleans_dependents(client, make_user):
    root = await make_user("root")
    author = await make_user("author")
    fan = await make_user("fan")
    event = await make_event(client, author)
    post = await make_post(client, author, event["id"])
    assert (await client.post(f"/api/posts/{post['id']}/like", headers=fan.headers)).status_code == 200

    conv = await client.post(
        "/api/conversations", headers=author.headers, json={"type": "dm", "memberIds": [fan.id]}
    )
    cid = conv.json()["id"]
    msg = await client.post(
        f"/api/conversations/{cid}/messages",
        headers=author.headers,
        json={"kind": "post", "sharedPostId": post["id"]},
    )
    assert msg.status_code == 201

    # A reaction on the shared-post message must not block deletion (FK).
    async with AsyncSessionLocal() as db:
        mid = msg.json()["id"]
        db.add(MessageReaction(message_id=mid, user_id=fan.id, emoji="🔥"))
        await db.commit()

    rid = await file_report(client, fan, "post", post["id"])
    res = await client.patch(
        f"/api/admin/reports/{rid}",
        headers=root.headers,
        json={"status": "resolved", "action": "remove_content", "note": "removed"},
    )
    assert res.status_code == 200, res.text

    async with AsyncSessionLocal() as db:
        assert (await db.execute(select(Post))).scalars().all() == []
        assert (await db.execute(select(PostLike))).scalars().all() == []
        assert (await db.execute(select(Message))).scalars().all() == []
        assert (await db.execute(select(MessageReaction))).scalars().all() == []

    # Removing something already gone is a clean 404, not a crash.
    again = await client.patch(
        f"/api/admin/reports/{rid}",
        headers=root.headers,
        json={"status": "resolved", "action": "remove_content"},
    )
    assert again.status_code == 404


async def test_remove_content_rejects_unsupported_target(client, make_user):
    root = await make_user("root")
    reporter = await make_user("reporter")
    offender = await make_user("offender")
    rid = await file_report(client, reporter, "user", offender.id)
    res = await client.patch(
        f"/api/admin/reports/{rid}", headers=root.headers, json={"action": "remove_content"}
    )
    assert res.status_code == 400


async def test_suspend_owner_of_reported_post_kills_their_session(client, make_user):
    root = await make_user("root")
    author = await make_user("author")
    reporter = await make_user("reporter")
    event = await make_event(client, author)
    post = await make_post(client, author, event["id"])
    rid = await file_report(client, reporter, "post", post["id"])

    res = await client.patch(
        f"/api/admin/reports/{rid}",
        headers=root.headers,
        json={"status": "resolved", "action": "suspend_user"},
    )
    assert res.status_code == 200, res.text

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.id == author.id))).scalar_one()
        assert user.is_suspended is True
    assert (await client.get("/api/me/stats", headers=author.headers)).status_code in (401, 403)
    login = await client.post("/api/auth/login", json={"username": "author", "password": "secret123"})
    assert login.status_code == 403

    # Reversible.
    un = await client.patch(
        f"/api/admin/users/{author.id}", headers=root.headers, json={"suspended": False}
    )
    assert un.status_code == 200
    login = await client.post("/api/auth/login", json={"username": "author", "password": "secret123"})
    assert login.status_code == 200


async def test_cannot_suspend_admins(client, make_user):
    root = await make_user("root")
    res = await client.patch(f"/api/admin/users/{root.id}", headers=root.headers, json={"suspended": True})
    assert res.status_code == 400


async def test_blocking_hides_user_and_blocks_dms(client, make_user):
    a = await make_user("alice")
    b = await make_user("bobby")

    assert (await client.post(f"/api/blocks/{b.id}", headers=a.headers)).status_code == 201

    ids_for_a = [u["id"] for u in (await client.get("/api/users", headers=a.headers)).json()]
    assert b.id not in ids_for_a

    # Enforced in both directions.
    res = await client.post("/api/conversations", headers=a.headers, json={"type": "dm", "memberIds": [b.id]})
    assert res.status_code == 403
    res = await client.post("/api/conversations", headers=b.headers, json={"type": "dm", "memberIds": [a.id]})
    assert res.status_code == 403
    assert (await client.post(f"/api/follows/{a.id}", headers=b.headers)).status_code == 403
    assert (
        await client.post("/api/dab-ups/request", headers=b.headers, json={"userId": a.id})
    ).status_code == 403


async def test_account_deletion_with_shared_posts_and_reactions(client, make_user):
    a = await make_user("alice")
    b = await make_user("bobby")
    event = await make_event(client, a)
    post = await make_post(client, a, event["id"])
    conv = await client.post("/api/conversations", headers=b.headers, json={"type": "dm", "memberIds": [a.id]})
    msg = await client.post(
        f"/api/conversations/{conv.json()['id']}/messages",
        headers=b.headers,
        json={"kind": "post", "sharedPostId": post["id"]},
    )
    async with AsyncSessionLocal() as db:
        db.add(MessageReaction(message_id=msg.json()["id"], user_id=a.id, emoji="👍"))
        await db.commit()

    res = await client.delete("/api/me", headers=a.headers)
    assert res.status_code == 200, res.text
    async with AsyncSessionLocal() as db:
        assert (await db.execute(select(User).where(User.id == a.id))).scalar_one_or_none() is None
        assert (await db.execute(select(MessageReaction))).scalars().all() == []
