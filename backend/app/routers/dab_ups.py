"""POST /api/dab-ups/request, GET /api/dab-ups/:userId — mutual connections."""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import or_, select

from app.blocks import is_blocked_between
from app.deps import CurrentUser, DbSession
from app.models import DabUp, User
from app.push import notify_users
from app.schemas import DabUpRequestBody, DabUpStatusResponse, DabbedUpIdsResponse

router = APIRouter(prefix="/api/dab-ups", tags=["social"])

DabUpStatus = str  # none | pending | dabbed_up


@router.post("/request", response_model=DabUpStatusResponse)
async def request_dab_up(body: DabUpRequestBody, current_user: CurrentUser, db: DbSession) -> DabUpStatusResponse:
    target_id = body.userId.strip()
    if target_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot dab up with yourself")

    if await db.get(User, target_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if await is_blocked_between(db, current_user.id, target_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can't dab up with this user")

    sender_name = current_user.full_name or current_user.username

    existing = await db.execute(
        select(DabUp).where(
            or_(
                (DabUp.requester_id == current_user.id) & (DabUp.target_id == target_id),
                (DabUp.requester_id == target_id) & (DabUp.target_id == current_user.id),
            )
        )
    )
    rows = existing.scalars().all()
    for row in rows:
        if row.status == "dabbed_up":
            return DabUpStatusResponse(status="dabbed_up")

    outbound = next((r for r in rows if r.requester_id == current_user.id and r.target_id == target_id), None)
    inbound = next((r for r in rows if r.requester_id == target_id and r.target_id == current_user.id), None)

    if inbound and inbound.status == "pending":
        inbound.status = "dabbed_up"
        if outbound:
            outbound.status = "dabbed_up"
        else:
            db.add(
                DabUp(
                    requester_id=current_user.id,
                    target_id=target_id,
                    status="dabbed_up",
                )
            )
        await db.commit()
        await notify_users(
            db,
            [target_id],
            title="You're dabbed up! 🤝",
            body=f"{sender_name} accepted your dab-up",
            data={"type": "dab_up", "userId": current_user.id},
        )
        return DabUpStatusResponse(status="dabbed_up")

    if outbound:
        return DabUpStatusResponse(status="pending" if outbound.status == "pending" else "dabbed_up")

    db.add(DabUp(requester_id=current_user.id, target_id=target_id, status="pending"))
    await db.commit()
    await notify_users(
        db,
        [target_id],
        title="New dab-up request",
        body=f"{sender_name} wants to dab up with you",
        data={"type": "dab_up_request", "userId": current_user.id},
    )
    return DabUpStatusResponse(status="pending")


@router.get("/mine", response_model=DabbedUpIdsResponse)
async def my_dabbed_up_ids(current_user: CurrentUser, db: DbSession) -> DabbedUpIdsResponse:
    result = await db.execute(
        select(DabUp).where(
            DabUp.status == "dabbed_up",
            or_(DabUp.requester_id == current_user.id, DabUp.target_id == current_user.id),
        )
    )
    ids: list[str] = []
    for row in result.scalars().all():
        other = row.target_id if row.requester_id == current_user.id else row.requester_id
        if other != current_user.id:
            ids.append(other)
    return DabbedUpIdsResponse(userIds=list(dict.fromkeys(ids)))


@router.get("/{user_id}", response_model=DabUpStatusResponse)
async def dab_up_status(user_id: str, current_user: CurrentUser, db: DbSession) -> DabUpStatusResponse:
    if user_id == current_user.id:
        return DabUpStatusResponse(status="none")

    result = await db.execute(
        select(DabUp).where(
            or_(
                (DabUp.requester_id == current_user.id) & (DabUp.target_id == user_id),
                (DabUp.requester_id == user_id) & (DabUp.target_id == current_user.id),
            )
        )
    )
    rows = result.scalars().all()
    if any(r.status == "dabbed_up" for r in rows):
        return DabUpStatusResponse(status="dabbed_up")
    if any(r.requester_id == current_user.id and r.status == "pending" for r in rows):
        return DabUpStatusResponse(status="pending")
    return DabUpStatusResponse(status="none")
