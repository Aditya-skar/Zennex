"""Moderation back-office: report queue triage + user suspension.

Admins are users with `is_admin = true` or whose username is listed in the
`ADMIN_USERNAMES` env var (handy for bootstrapping the first admin).
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.content_removal import remove_message, remove_post
from app.deps import AdminUser, DbSession, is_admin_user
from app.models import Event, Message, Post, User, UserReport
from app.push import notify_users
from app.schemas import (
    AdminReportDto,
    AdminReportUpdate,
    AdminStatsDto,
    AdminUserUpdate,
    OkResponse,
    ReportStatus,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _to_dto(report: UserReport, reporter_username: str | None) -> AdminReportDto:
    return AdminReportDto(
        id=report.id,
        reporterId=report.reporter_id,
        reporterUsername=reporter_username,
        targetType=report.target_type,  # type: ignore[arg-type]
        targetId=report.target_id,
        reason=report.reason,
        details=report.details,
        status=report.status,  # type: ignore[arg-type]
        resolutionNote=report.resolution_note,
        resolvedBy=report.resolved_by,
        resolvedAt=report.resolved_at,
        createdAt=report.created_at,
    )


async def _load_report(db: DbSession, report_id: str) -> tuple[UserReport, str | None]:
    row = (
        await db.execute(
            select(UserReport, User.username)
            .outerjoin(User, User.id == UserReport.reporter_id)
            .where(UserReport.id == report_id)
        )
    ).one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return row[0], row[1]


@router.get("/stats", response_model=AdminStatsDto)
async def stats(_admin: AdminUser, db: DbSession) -> AdminStatsDto:
    async def count(model, *where) -> int:
        stmt = select(func.count()).select_from(model)
        for clause in where:
            stmt = stmt.where(clause)
        return int((await db.execute(stmt)).scalar_one())

    return AdminStatsDto(
        users=await count(User),
        suspendedUsers=await count(User, User.is_suspended.is_(True)),
        openReports=await count(UserReport, UserReport.status == "open"),
        reviewingReports=await count(UserReport, UserReport.status == "reviewing"),
        events=await count(Event),
        posts=await count(Post),
    )


@router.get("/reports", response_model=list[AdminReportDto])
async def list_reports(
    _admin: AdminUser,
    db: DbSession,
    status_filter: ReportStatus | None = Query(default=None, alias="status"),
    targetType: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[AdminReportDto]:
    query = select(UserReport, User.username).outerjoin(User, User.id == UserReport.reporter_id)
    if status_filter:
        query = query.where(UserReport.status == status_filter)
    if targetType:
        query = query.where(UserReport.target_type == targetType)
    query = query.order_by(UserReport.created_at.desc()).limit(limit).offset(offset)

    rows = (await db.execute(query)).all()
    return [_to_dto(report, username) for report, username in rows]


@router.get("/reports/{report_id}", response_model=AdminReportDto)
async def get_report(report_id: str, _admin: AdminUser, db: DbSession) -> AdminReportDto:
    report, username = await _load_report(db, report_id)
    return _to_dto(report, username)


async def _target_owner_id(db: DbSession, report: UserReport) -> str | None:
    """The account responsible for the reported content."""
    if report.target_type == "user":
        return report.target_id
    if report.target_type == "post":
        post = await db.get(Post, report.target_id)
        return post.author_id if post else None
    if report.target_type == "message":
        message = await db.get(Message, report.target_id)
        return message.author_id if message else None
    if report.target_type == "event":
        event = await db.get(Event, report.target_id)
        return event.organizer_id if event else None
    return None


async def _set_suspended(db: DbSession, admin: User, user_id: str, suspended: bool) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if suspended and (user.id == admin.id or is_admin_user(user)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can't suspend an admin account")

    user.is_suspended = suspended
    if suspended:
        # Kill live sessions immediately.
        user.tokens_valid_after = datetime.now(timezone.utc)
    return user


@router.patch("/reports/{report_id}", response_model=AdminReportDto)
async def update_report(
    report_id: str, body: AdminReportUpdate, admin: AdminUser, db: DbSession
) -> AdminReportDto:
    report, username = await _load_report(db, report_id)

    if body.action == "remove_content":
        if report.target_type == "post":
            removed = await remove_post(db, report.target_id)
        elif report.target_type == "message":
            removed = await remove_message(db, report.target_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="remove_content supports post and message reports only",
            )
        if not removed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reported content no longer exists")

    elif body.action == "suspend_user":
        owner_id = await _target_owner_id(db, report)
        if owner_id is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reported target no longer exists")
        await _set_suspended(db, admin, owner_id, True)

    report.status = body.status
    report.resolution_note = body.note.strip()
    if body.status in ("resolved", "dismissed"):
        report.resolved_by = admin.id
        report.resolved_at = datetime.now(timezone.utc)
    else:
        report.resolved_by = None
        report.resolved_at = None

    await db.commit()
    await db.refresh(report)

    if body.status == "resolved":
        await notify_users(
            db,
            [report.reporter_id],
            title="Thanks for your report",
            body="We reviewed it and took action.",
            data={"type": "report_resolved", "reportId": report.id},
        )
    return _to_dto(report, username)


@router.patch("/users/{user_id}", response_model=OkResponse)
async def update_user(user_id: str, body: AdminUserUpdate, admin: AdminUser, db: DbSession) -> OkResponse:
    await _set_suspended(db, admin, user_id, body.suspended)
    await db.commit()
    return OkResponse(ok=True)
