"""CRUD /api/people-lists — invite audiences for private events."""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import PeopleList
from app.schemas import OkResponse, PeopleListCreate, PeopleListDto, PeopleListPatch

router = APIRouter(prefix="/api/people-lists", tags=["people-lists"])


@router.get("", response_model=list[PeopleListDto])
async def list_people_lists(current_user: CurrentUser, db: DbSession) -> list[PeopleListDto]:
    result = await db.execute(
        select(PeopleList)
        .where(PeopleList.user_id == current_user.id)
        .order_by(PeopleList.updated_at.desc())
    )
    return [_to_dto(row) for row in result.scalars().all()]


@router.post("", response_model=PeopleListDto, status_code=status.HTTP_201_CREATED)
async def create_list(body: PeopleListCreate, current_user: CurrentUser, db: DbSession) -> PeopleListDto:
    row = PeopleList(
        user_id=current_user.id,
        name=body.name.strip() or "✨",
        member_ids=list(dict.fromkeys(body.memberIds)),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_dto(row)


@router.patch("/{list_id}", response_model=PeopleListDto)
async def update_list(
    list_id: str, body: PeopleListPatch, current_user: CurrentUser, db: DbSession
) -> PeopleListDto:
    row = await _owned_list(db, list_id, current_user.id)
    if body.name is not None:
        row.name = body.name.strip() or "✨"
    if body.memberIds is not None:
        row.member_ids = list(dict.fromkeys(body.memberIds))
    await db.commit()
    await db.refresh(row)
    return _to_dto(row)


@router.delete("/{list_id}", response_model=OkResponse)
async def delete_list(list_id: str, current_user: CurrentUser, db: DbSession) -> OkResponse:
    row = await _owned_list(db, list_id, current_user.id)
    await db.delete(row)
    await db.commit()
    return OkResponse(ok=True)


async def _owned_list(db: DbSession, list_id: str, user_id: str) -> PeopleList:
    result = await db.execute(select(PeopleList).where(PeopleList.id == list_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    if row.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your list")
    return row


def _to_dto(row: PeopleList) -> PeopleListDto:
    return PeopleListDto(
        id=row.id,
        name=row.name,
        memberIds=row.member_ids,
        updatedAt=int(row.updated_at.timestamp() * 1000),
    )
