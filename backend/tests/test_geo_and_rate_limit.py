import pytest

from app import rate_limit
from app.geo import bounding_box, haversine_km

from .test_moderation import make_event


# ---------------------------------------------------------------- geo unit tests


def test_bounding_box_contains_the_circle():
    lat, lng, r = 12.97, 77.59, 25.0
    min_lat, max_lat, min_lng, max_lng = bounding_box(lat, lng, r)
    assert min_lat < lat < max_lat and min_lng < lng < max_lng
    # Points exactly r km away on the compass axes must fall inside the box.
    from math import cos, degrees, radians

    north = lat + degrees(r / 6371.0)
    east = lng + degrees(r / 6371.0 / cos(radians(lat)))
    assert min_lat <= north <= max_lat + 1e-9
    assert min_lng <= east <= max_lng + 1e-9
    assert haversine_km(lat, lng, north, lng) == pytest.approx(r, rel=1e-3)


def test_bounding_box_antimeridian_and_poles_drop_longitude_bounds():
    _, _, min_lng, max_lng = bounding_box(0.0, 179.9, 100.0)
    assert min_lng is None and max_lng is None
    min_lat, max_lat, min_lng, max_lng = bounding_box(89.9, 10.0, 100.0)
    assert max_lat == 90.0 and min_lng is None and max_lng is None


# ---------------------------------------------------------------- list_events


async def test_event_radius_filter_and_pagination(client, make_user):
    host = await make_user("host")
    near = await make_event(client, host, "Near", (12.9716, 77.5946))
    near2 = await make_event(client, host, "Near2", (12.98, 77.60))
    await make_event(client, host, "Far", (28.6139, 77.2090))  # Delhi

    res = await client.get("/api/events", params={"lat": 12.9716, "lng": 77.5946, "radiusKm": 10})
    assert res.status_code == 200
    assert {e["id"] for e in res.json()} == {near["id"], near2["id"]}

    page = await client.get(
        "/api/events", params={"lat": 12.9716, "lng": 77.5946, "radiusKm": 10, "limit": 1}
    )
    assert len(page.json()) == 1
    page2 = await client.get(
        "/api/events", params={"lat": 12.9716, "lng": 77.5946, "radiusKm": 10, "limit": 1, "offset": 1}
    )
    assert len(page2.json()) == 1
    assert page.json()[0]["id"] != page2.json()[0]["id"]

    everything = await client.get("/api/events")
    assert len(everything.json()) == 3
    assert len((await client.get("/api/events", params={"limit": 2})).json()) == 2

    assert (await client.get("/api/events", params={"lat": 123, "lng": 0, "radiusKm": 1})).status_code == 422


# ---------------------------------------------------------------- rate limiting


@pytest.fixture
def limiting(settings):
    settings.rate_limit_enabled = True
    yield
    settings.rate_limit_enabled = False


async def test_memory_rate_limit_returns_429_with_retry_after(client, limiting):
    last = None
    for _ in range(6):
        last = await client.post("/api/auth/forgot-password", json={"email": "x@example.com"})
    assert last.status_code == 429
    assert int(last.headers["Retry-After"]) >= 1


async def test_rate_limit_only_applies_to_matching_write_paths(client, limiting):
    for _ in range(30):
        assert (await client.get("/api/events")).status_code == 200


class FakeRedis:
    """Just enough of redis.asyncio for the fixed-window limiter."""

    def __init__(self):
        self.counts: dict[str, int] = {}
        self.ttls: dict[str, int] = {}

    def pipeline(self, transaction=True):
        return FakePipeline(self)

    async def expire(self, key, seconds):
        self.ttls[key] = seconds


class FakePipeline:
    def __init__(self, redis):
        self.redis = redis
        self.ops = []

    def incr(self, key):
        self.ops.append(("incr", key))

    def ttl(self, key):
        self.ops.append(("ttl", key))

    async def execute(self):
        out = []
        for op, key in self.ops:
            if op == "incr":
                self.redis.counts[key] = self.redis.counts.get(key, 0) + 1
                out.append(self.redis.counts[key])
            else:
                out.append(self.redis.ttls.get(key, -1))
        return out


class BrokenRedis:
    def pipeline(self, transaction=True):
        raise ConnectionError("redis down")


async def test_redis_limiter_is_used_when_configured(client, limiting):
    fake = FakeRedis()
    rate_limit.set_redis_client(fake)
    codes = [
        (await client.post("/api/auth/forgot-password", json={"email": "x@example.com"})).status_code
        for _ in range(6)
    ]
    assert codes[-1] == 429
    assert all(c != 429 for c in codes[:5])
    assert any(k.startswith("rl:") for k in fake.counts)
    assert list(fake.ttls.values()) == [60]
    assert rate_limit._buckets == {}  # memory limiter untouched


async def test_redis_outage_fails_open_to_memory(client, limiting):
    rate_limit.set_redis_client(BrokenRedis())
    res = await client.post("/api/auth/forgot-password", json={"email": "x@example.com"})
    assert res.status_code == 200
    codes = [
        (await client.post("/api/auth/forgot-password", json={"email": "x@example.com"})).status_code
        for _ in range(6)
    ]
    assert 429 in codes  # still protected by the in-memory fallback
