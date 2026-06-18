from app.database import connect_args_for


def test_sqlite_gets_check_same_thread():
    assert connect_args_for("sqlite+aiosqlite:///tmp/status.db") == {
        "check_same_thread": False
    }


def test_postgres_gets_no_sqlite_args():
    # Passing check_same_thread to asyncpg raises an unexpected-argument error.
    assert connect_args_for("postgresql+asyncpg://u:p@host/db") == {}


def test_mysql_gets_no_sqlite_args():
    assert connect_args_for("mysql+aiomysql://u:p@host/db") == {}
