"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # linguistic_scales
    op.create_table(
        "linguistic_scales",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("scale_type", sa.String(20), nullable=False),
        sa.Column("is_default", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # linguistic_terms
    op.create_table(
        "linguistic_terms",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("scale_id", UUID(as_uuid=True), sa.ForeignKey("linguistic_scales.id", ondelete="CASCADE"), nullable=False),
        sa.Column("term", sa.String(100), nullable=False),
        sa.Column("l", sa.Float(), nullable=False),
        sa.Column("m", sa.Float(), nullable=False),
        sa.Column("u", sa.Float(), nullable=False),
    )

    # problems
    op.create_table(
        "problems",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("application_area", sa.String(200), nullable=True),
        sa.Column("author", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # criteria
    op.create_table(
        "criteria",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("problem_id", UUID(as_uuid=True), sa.ForeignKey("problems.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("criterion_type", sa.String(10), nullable=False),
        sa.Column("weight_term", sa.String(100), nullable=False),
        sa.Column("weight_l", sa.Float(), nullable=False),
        sa.Column("weight_m", sa.Float(), nullable=False),
        sa.Column("weight_u", sa.Float(), nullable=False),
        sa.Column("position", sa.Integer(), default=0),
    )
    op.create_index("ix_criteria_problem_id", "criteria", ["problem_id"])

    # alternatives
    op.create_table(
        "alternatives",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("problem_id", UUID(as_uuid=True), sa.ForeignKey("problems.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("position", sa.Integer(), default=0),
    )
    op.create_index("ix_alternatives_problem_id", "alternatives", ["problem_id"])

    # alternative_evaluations
    op.create_table(
        "alternative_evaluations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("alternative_id", UUID(as_uuid=True), sa.ForeignKey("alternatives.id", ondelete="CASCADE"), nullable=False),
        sa.Column("criterion_id", UUID(as_uuid=True), sa.ForeignKey("criteria.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rating_term", sa.String(100), nullable=False),
        sa.Column("rating_l", sa.Float(), nullable=False),
        sa.Column("rating_m", sa.Float(), nullable=False),
        sa.Column("rating_u", sa.Float(), nullable=False),
    )

    # executions
    op.create_table(
        "executions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("problem_id", UUID(as_uuid=True), sa.ForeignKey("problems.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), default="pending"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_executions_problem_id", "executions", ["problem_id"])

    # execution_results
    op.create_table(
        "execution_results",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("execution_id", UUID(as_uuid=True), sa.ForeignKey("executions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("decision_matrix", sa.JSON(), nullable=False),
        sa.Column("normalized_matrix", sa.JSON(), nullable=False),
        sa.Column("weighted_matrix", sa.JSON(), nullable=False),
        sa.Column("fpis", sa.JSON(), nullable=False),
        sa.Column("fnis", sa.JSON(), nullable=False),
        sa.Column("distances_to_fpis", sa.JSON(), nullable=False),
        sa.Column("distances_to_fnis", sa.JSON(), nullable=False),
        sa.Column("closeness_coefficients", sa.JSON(), nullable=False),
        sa.Column("ranking", sa.JSON(), nullable=False),
        sa.Column("weights", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("execution_results")
    op.drop_table("executions")
    op.drop_table("alternative_evaluations")
    op.drop_table("alternatives")
    op.drop_table("criteria")
    op.drop_table("problems")
    op.drop_table("linguistic_terms")
    op.drop_table("linguistic_scales")
