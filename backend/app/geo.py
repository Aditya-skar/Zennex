"""Geo helpers for radius search.

`list_events` first narrows rows with a SQL bounding box (`bounding_box`, backed
by the `ix_events_lat_lng` index) and then applies the exact great-circle
`haversine_km` check in Python. That keeps the query index-friendly on plain
Postgres/SQLite without requiring the PostGIS extension; if the dataset ever
outgrows this, swap the box for `ST_DWithin` on a `geography` column.
"""
import math

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def bounding_box(
    lat: float, lng: float, radius_km: float
) -> tuple[float, float, float | None, float | None]:
    """Returns (min_lat, max_lat, min_lng, max_lng) enclosing the search circle.

    The longitude bounds are `None` when a longitude range can't be expressed as a
    single interval (circle crosses the antimeridian or covers a pole) — callers
    then filter on latitude only and let the haversine pass do the rest.
    """
    angular = radius_km / EARTH_RADIUS_KM  # radians
    d_lat = math.degrees(angular)
    min_lat, max_lat = lat - d_lat, lat + d_lat

    # Circle reaches a pole → every longitude is in range.
    if min_lat <= -90.0 or max_lat >= 90.0:
        return max(min_lat, -90.0), min(max_lat, 90.0), None, None

    d_lng = math.degrees(math.asin(min(1.0, math.sin(angular) / math.cos(math.radians(lat)))))
    min_lng, max_lng = lng - d_lng, lng + d_lng

    # Crosses the antimeridian.
    if min_lng < -180.0 or max_lng > 180.0:
        return min_lat, max_lat, None, None

    return min_lat, max_lat, min_lng, max_lng
