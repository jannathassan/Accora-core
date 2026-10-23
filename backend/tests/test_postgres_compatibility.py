"""
PostgreSQL Compatibility and Serverless Configuration Tests.
Verifies that all models, schemas, DDL statements, and database engine settings
are fully compatible with PostgreSQL and Vercel serverless functions.
"""
import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable
from app.core.config import Settings
from app.core.database import Base
import app.models  # Register all models on Base.metadata


def test_psycopg2_driver_available():
    """Verify psycopg2-binary driver is installed and importable."""
    import psycopg2
    assert psycopg2 is not None


def test_postgresql_ddl_compilation_all_models():
    """Verify that every model's DDL compiles cleanly for the PostgreSQL dialect."""
    dialect = postgresql.dialect()
    table_names = [table.name for table in Base.metadata.sorted_tables]
    
    expected_tables = {
        "users",
        "workspaces",
        "workspace_members",
        "transactions",
        "invoices",
        "notifications",
    }
    assert expected_tables.issubset(set(table_names)), f"Missing tables in metadata: {expected_tables - set(table_names)}"

    for table in Base.metadata.sorted_tables:
        ddl = str(CreateTable(table).compile(dialect=dialect))
        assert ddl is not None
        assert f"CREATE TABLE {table.name}" in ddl


def test_postgresql_specific_column_types():
    """Verify JSON, Boolean, DateTime with timezone, and Foreign Keys compile to valid PostgreSQL types."""
    dialect = postgresql.dialect()
    
    # Test invoices table (has JSON items column)
    invoices_table = Base.metadata.tables["invoices"]
    invoices_ddl = str(CreateTable(invoices_table).compile(dialect=dialect))
    assert "items JSON" in invoices_ddl
    assert "FOREIGN KEY(workspace_id) REFERENCES workspaces (id)" in invoices_ddl

    # Test users table (has BOOLEAN column)
    users_table = Base.metadata.tables["users"]
    users_ddl = str(CreateTable(users_table).compile(dialect=dialect))
    assert "is_active BOOLEAN" in users_ddl
    assert "TIMESTAMP WITH TIME ZONE" in users_ddl


def test_database_url_normalization():
    """Verify that legacy postgres:// URLs from Neon/Vercel are converted to postgresql://."""
    cfg = Settings(
        DATABASE_URL="postgres://accora_user:secure_pwd@ep-xy-123.neon.tech/accoradb?sslmode=require"
    )
    assert cfg.DATABASE_URL.startswith("postgresql://")
    assert "accora_user:secure_pwd@ep-xy-123.neon.tech/accoradb" in cfg.DATABASE_URL


def test_sqlite_fallback_still_supported():
    """Verify local SQLite continues to work seamlessly as a development fallback."""
    cfg = Settings(DATABASE_URL="sqlite:///./test_fallback.db")
    assert cfg.DATABASE_URL.startswith("sqlite:///")
    assert "test_fallback.db" in cfg.DATABASE_URL


def test_cors_origins_parsing():
    """Verify CORS origins parsing for wildcard and comma-delimited strings."""
    cfg_wildcard = Settings(ALLOWED_ORIGINS="*")
    assert cfg_wildcard.ALLOWED_ORIGINS == ["*"]

    cfg_multi = Settings(ALLOWED_ORIGINS="https://accora.vercel.app, https://preview.accora.vercel.app")
    assert "https://accora.vercel.app" in cfg_multi.ALLOWED_ORIGINS
    assert "https://preview.accora.vercel.app" in cfg_multi.ALLOWED_ORIGINS
