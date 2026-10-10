"""communities.conversation_id links group chat

Revision ID: 0011
Revises: 0010
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("communities", sa.Column("conversation_id", sa.String(length=32), nullable=True))
    op.create_foreign_key(
        "fk_communities_conversation_id",
        "communities",
        "conversations",
        ["conversation_id"],
        ["id"],
    )
    op.create_index("ix_communities_conversation_id", "communities", ["conversation_id"])


def downgrade() -> None:
    op.drop_index("ix_communities_conversation_id", table_name="communities")
    op.drop_constraint("fk_communities_conversation_id", "communities", type_="foreignkey")
    op.drop_column("communities", "conversation_id")
