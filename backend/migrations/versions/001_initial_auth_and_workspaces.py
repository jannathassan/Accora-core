"""001_initial_auth_and_workspaces

Revision ID: 001_auth_workspaces
Revises: None
Create Date: 2026-10-23 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_auth_workspaces'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. Create workspaces table
    op.create_table(
        'workspaces',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('industry', sa.String(length=100), nullable=False, server_default='Technology'),
        sa.Column('business_type', sa.String(length=100), nullable=False, server_default='SaaS / Software'),
        sa.Column('country', sa.String(length=100), nullable=False, server_default='United States'),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='USD'),
        sa.Column('opening_cash_balance', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('avg_monthly_revenue', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('monthly_fixed_expenses', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('monthly_variable_expenses', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('loan_balance', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('monthly_loan_repayment', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('expected_growth_rate', sa.Float(), nullable=False, server_default='15.0'),
        sa.Column('financial_goals', sa.Text(), nullable=False, server_default=''),
        sa.Column('onboarding_completed', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('owner_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workspaces_id'), 'workspaces', ['id'], unique=False)
    op.create_index(op.f('ix_workspaces_owner_id'), 'workspaces', ['owner_id'], unique=False)

    # 3. Create workspace_members table
    op.create_table(
        'workspace_members',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('workspace_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='member'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workspace_id', 'user_id', name='uq_workspace_user')
    )
    op.create_index(op.f('ix_workspace_members_id'), 'workspace_members', ['id'], unique=False)
    op.create_index(op.f('ix_workspace_members_workspace_id'), 'workspace_members', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_workspace_members_user_id'), 'workspace_members', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_table('workspace_members')
    op.drop_table('workspaces')
    op.drop_table('users')
