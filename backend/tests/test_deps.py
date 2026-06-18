"""Guards against dependency upgrades that break our usage of the library API.

These assert the *installed* major version, not pinned ranges. They turn a
silent runtime crash into an obvious test failure the moment a breaking
upgrade lands.
"""
import apscheduler
import pydantic
import sqlalchemy


def test_apscheduler_is_v3():
    # APScheduler 4.x removes AsyncIOScheduler.add_job (used by monitor_scheduler).
    assert apscheduler.version.startswith("3."), (
        f"APScheduler {apscheduler.version} is not v3; "
        "monitor_scheduler.py uses the 3.x API and will break."
    )


def test_pydantic_is_v2():
    assert pydantic.VERSION.startswith("2."), (
        f"pydantic {pydantic.VERSION} is not v2; schemas use the v2 API."
    )


def test_sqlalchemy_is_v2():
    assert sqlalchemy.__version__.startswith("2."), (
        f"SQLAlchemy {sqlalchemy.__version__} is not v2; "
        "models/mappers use the 2.0 API."
    )
