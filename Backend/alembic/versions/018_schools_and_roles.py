"""018_schools_and_roles

Revision ID: 018_schools_and_roles
Revises: 017_unique_session_period
Create Date: 2026-05-13

Adds:
- schools table (school_code, name, admin_id FK)
- userrole enum on teachers (TEACHER / ADMIN)
- school_id FK on teachers → schools
- agreed_to_terms and agreed_to_privacy booleans on teachers
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "018_schools_and_roles"
down_revision = "017_unique_session_period"
branch_labels = None
depends_on = None

userrole_enum = postgresql.ENUM(
    "TEACHER", "ADMIN",
    name="userrole",
    create_type=False,
)


def upgrade() -> None:
    userrole_enum.create(op.get_bind(), checkfirst=True)

    # Create schools table (admin_id FK added after teachers columns exist)
    op.create_table(
        "schools",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_code", sa.String(8), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_schools_id", "schools", ["id"])
    op.create_index("ix_schools_school_code", "schools", ["school_code"], unique=True)

    # Add role and school_id to teachers
    op.add_column(
        "teachers",
        sa.Column(
            "role",
            userrole_enum,
            nullable=False,
            server_default="TEACHER",
        ),
    )
    op.add_column(
        "teachers",
        sa.Column("school_id", sa.Integer(), nullable=True),
    )

    # teachers.school_id → schools.id
    op.create_foreign_key(
        "fk_teachers_school_id",
        "teachers", "schools",
        ["school_id"], ["id"],
        ondelete="SET NULL",
    )

    # schools.admin_id → teachers.id (now that teachers.id exists)
    op.create_foreign_key(
        "fk_schools_admin_id",
        "schools", "teachers",
        ["admin_id"], ["id"],
        ondelete="SET NULL",
    )

    # Agreement booleans
    op.add_column(
        "teachers",
        sa.Column(
            "agreed_to_terms",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "teachers",
        sa.Column(
            "agreed_to_privacy",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("teachers", "agreed_to_privacy")
    op.drop_column("teachers", "agreed_to_terms")

    op.drop_constraint("fk_schools_admin_id", "schools", type_="foreignkey")
    op.drop_constraint("fk_teachers_school_id", "teachers", type_="foreignkey")

    op.drop_column("teachers", "school_id")
    op.drop_column("teachers", "role")

    op.drop_index("ix_schools_school_code", table_name="schools")
    op.drop_index("ix_schools_id", table_name="schools")
    op.drop_table("schools")

    userrole_enum.drop(op.get_bind(), checkfirst=True)
