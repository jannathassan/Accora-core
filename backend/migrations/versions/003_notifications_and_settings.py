"""003_notifications_and_settings

Revision ID: 003_notif_settings
Revises: 002_tx_invoices
Create Date: 2026-10-23 00:48:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_notif_settings'
down_revision: Union[str, None] = '002_tx_invoices'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('workspace_id', sa.String(length=36), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False, server_default='medium'),
        sa.Column('read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('action_url', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('related_id', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('fingerprint', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)
    op.create_index(op.f('ix_notifications_workspace_id'), 'notifications', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_notifications_read'), 'notifications', ['read'], unique=False)
    op.create_index(op.f('ix_notifications_fingerprint'), 'notifications', ['fingerprint'], unique=False)

    # 2. Add extended settings & preferences columns to workspaces
    with op.batch_alter_table('workspaces', schema=None) as batch_op:
        batch_op.add_column(sa.Column('fiscal_year_start', sa.String(length=50), nullable=False, server_default='January'))
        batch_op.add_column(sa.Column('business_start_date', sa.String(length=50), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('employee_count', sa.Integer(), nullable=False, server_default='1'))
        batch_op.add_column(sa.Column('outstanding_ar', sa.Float(), nullable=False, server_default='0.0'))
        batch_op.add_column(sa.Column('outstanding_ap', sa.Float(), nullable=False, server_default='0.0'))
        batch_op.add_column(sa.Column('tax_rate', sa.Float(), nullable=False, server_default='0.0'))
        batch_op.add_column(sa.Column('date_format', sa.String(length=50), nullable=False, server_default='MMM DD, YYYY'))
        batch_op.add_column(sa.Column('default_view', sa.String(length=50), nullable=False, server_default='dashboard'))
        batch_op.add_column(sa.Column('proactive_insights', sa.Boolean(), nullable=False, server_default=sa.text('true')))
        batch_op.add_column(sa.Column('risk_tolerance', sa.String(length=50), nullable=False, server_default='moderate'))
        batch_op.add_column(sa.Column('forecast_horizon_months', sa.Integer(), nullable=False, server_default='3'))
        batch_op.add_column(sa.Column('email_alerts', sa.Boolean(), nullable=False, server_default=sa.text('true')))


def downgrade() -> None:
    with op.batch_alter_table('workspaces', schema=None) as batch_op:
        batch_op.drop_column('email_alerts')
        batch_op.drop_column('forecast_horizon_months')
        batch_op.drop_column('risk_tolerance')
        batch_op.drop_column('proactive_insights')
        batch_op.drop_column('default_view')
        batch_op.drop_column('date_format')
        batch_op.drop_column('tax_rate')
        batch_op.drop_column('outstanding_ap')
        batch_op.drop_column('outstanding_ar')
        batch_op.drop_column('employee_count')
        batch_op.drop_column('business_start_date')
        batch_op.drop_column('fiscal_year_start')

    op.drop_index(op.f('ix_notifications_fingerprint'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_read'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_workspace_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')
