"""POST /api/affinity/track + GET /api/affinity/mine — Phase 3.

See app/affinity.py for the full reason → weight table. Weights are always
looked up server-side; the client only ever reports *what* happened
(category/mainCategory/reason), never *how much* it should count."""
from fastapi import APIRouter
from sqlalchemy import select

from app import affinity as affinity_service
from app.deps import CurrentUser, DbSession
from app.models import Affinity
from app.schemas import AffinityMine, AffinityTrackBody

router = APIRouter(prefix="/api/affinity", tags=["affinity"])


@router.post("/track", status_code=204)
async def track_affinity(body: AffinityTrackBody, current_user: CurrentUser, db: DbSession) -> None:
    await affinity_service.record_interaction(
        db,
        current_user.id,
        body.category,
        body.mainCategory,
        body.reason,
        seconds=body.seconds,
        author_id=body.authorId,
    )
    await db.commit()


@router.get("/mine", response_model=AffinityMine)
async def get_my_affinity(current_user: CurrentUser, db: DbSession) -> AffinityMine:
    result = await db.execute(select(Affinity).where(Affinity.user_id == current_user.id))
    rows = result.scalars().all()

    categories = {row.key: row.score for row in rows if row.kind == "category"}
    authors = {row.key: row.score for row in rows if row.kind == "author"}
    return AffinityMine(categories=categories, authors=authors)
