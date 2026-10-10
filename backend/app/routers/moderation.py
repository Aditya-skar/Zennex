"""Report + block endpoints (Phase 3 trust & safety)."""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import delete, select

from app.deps import CurrentUser, DbSession
from app.models import User, UserBlock, UserReport
from app.schemas import BlockStatus, OkResponse, ReportBody, ReportResponse

router = APIRouter(tags=["moderation"])


@router.post("/api/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(body: ReportBody, current_user: CurrentUser, db: DbSession) -> ReportResponse:
    if body.targetType == "user" and body.targetId == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot report yourself")

    report = UserReport(
        reporter_id=current_user.id,
        target_type=body.targetType,
        target_id=body.targetId.strip(),
        reason=body.reason.strip() or "other",
        details=(body.details or "").strip(),
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return ReportResponse(id=report.id, ok=True)


@router.post("/api/blocks/{user_id}", response_model=OkResponse, status_code=status.HTTP_201_CREATED)
async def block_user(user_id: str, current_user: CurrentUser, db: DbSession) -> OkResponse:
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot block yourself")

    target = await db.execute(select(User).where(User.id == user_id))
    if target.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = await db.execute(
        select(UserBlock).where(
            UserBlock.blocker_id == current_user.id,
            UserBlock.blocked_id == user_id,
        )
    )
    if existing.scalar_one_or_none() is None:
        db.add(UserBlock(blocker_id=current_user.id, blocked_id=user_id))
        await db.commit()
    return OkResponse(ok=True)


@router.delete("/api/blocks/{user_id}", response_model=OkResponse)
async def unblock_user(user_id: str, current_user: CurrentUser, db: DbSession) -> OkResponse:
    await db.execute(
        delete(UserBlock).where(
            UserBlock.blocker_id == current_user.id,
            UserBlock.blocked_id == user_id,
        )
    )
    await db.commit()
    return OkResponse(ok=True)


@router.get("/api/blocks/mine", response_model=list[str])
async def list_blocked(current_user: CurrentUser, db: DbSession) -> list[str]:
    rows = await db.execute(
        select(UserBlock.blocked_id).where(UserBlock.blocker_id == current_user.id)
    )
    return list(rows.scalars().all())


@router.get("/api/blocks/{user_id}", response_model=BlockStatus)
async def block_status(user_id: str, current_user: CurrentUser, db: DbSession) -> BlockStatus:
    row = await db.execute(
        select(UserBlock).where(
            UserBlock.blocker_id == current_user.id,
            UserBlock.blocked_id == user_id,
        )
    )
    return BlockStatus(blocked=row.scalar_one_or_none() is not None)
