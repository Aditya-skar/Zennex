"""GET/POST/DELETE /api/events — matches API_CONTRACT.md's Events section."""
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.geo import haversine_km
from app.models import Event, Post, PostLike
from app.schemas import EventCreate, EventDto

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[EventDto])
async def list_events(
    db: DbSession,
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
    radiusKm: float | None = Query(default=None),
    mainCategory: str | None = Query(default=None),
) -> list[EventDto]:
    query = select(Event)
    if mainCategory:
        query = query.where(Event.main_category == mainCategory)

    result = await db.execute(query.order_by(Event.created_at.desc()))
    events = result.scalars().all()

    if lat is not None and lng is not None and radiusKm is not None:
        events = [e for e in events if haversine_km(lat, lng, e.lat, e.lng) <= radiusKm]

    return [_to_dto(e) for e in events]


@router.post("", response_model=EventDto, status_code=status.HTTP_201_CREATED)
async def create_event(body: EventCreate, current_user: CurrentUser, db: DbSession) -> EventDto:
    event = Event(
        title=body.title,
        category=body.category,
        main_category=body.mainCategory,
        date=body.date,
        time=body.time,
        venue=body.venue,
        location=body.location,
        description=body.description,
        lat=body.coordinates[0],
        lng=body.coordinates[1],
        attendees=body.attendees,
        image=body.image,
        organizer_id=current_user.id,  # never trust client-supplied organizerId
        game_access=body.gameAccess,
        invite_list_ids=body.inviteListIds,
        invited_member_ids=body.invitedMemberIds,
        starts_at=body.startsAt,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return _to_dto(event)


@router.delete("/{event_id}")
async def delete_event(event_id: str, current_user: CurrentUser, db: DbSession) -> dict:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can delete this event")

    # No DB-level cascade (SQLite FK pragmas aren't enabled here), so delete
    # the backing post(s) + their likes explicitly, matching the client's
    # deletePublishedPost symmetry (see PHASE3 plan).
    post_ids = (
        (await db.execute(select(Post.id).where(Post.event_id == event_id))).scalars().all()
    )
    if post_ids:
        await db.execute(PostLike.__table__.delete().where(PostLike.post_id.in_(post_ids)))
        await db.execute(Post.__table__.delete().where(Post.id.in_(post_ids)))

    await db.delete(event)
    await db.commit()
    return {"ok": True}


def _to_dto(event: Event) -> EventDto:
    return EventDto(
        id=event.id,
        title=event.title,
        category=event.category,
        mainCategory=event.main_category,  # type: ignore[arg-type]
        date=event.date,
        time=event.time,
        venue=event.venue,
        location=event.location,
        description=event.description,
        coordinates=(event.lat, event.lng),
        attendees=event.attendees,
        image=event.image,
        organizerId=event.organizer_id,
        gameAccess=event.game_access,  # type: ignore[arg-type]
        inviteListIds=event.invite_list_ids,
        invitedMemberIds=event.invited_member_ids,
        startsAt=event.starts_at,
    )
