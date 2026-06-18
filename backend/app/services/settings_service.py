"""Runtime settings.

A small registry of settings that can be tuned at runtime (persisted in
app_settings, overriding the env default). The effective value is also written
back onto the global `settings` object so existing readers
(`settings.retention_days`, the traceroute runner, etc.) pick it up without
each querying the DB.
"""
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session
from app.models.app_setting import AppSetting


@dataclass(frozen=True)
class SettingSpec:
    key: str
    env_attr: str  # attribute on `settings` that holds the env default
    minimum: int
    maximum: int
    unit: str
    description: str


REGISTRY: list[SettingSpec] = [
    SettingSpec(
        "retention_days",
        "retention_days",
        0,
        3650,
        "days",
        "How long to keep check results and traceroute runs (0 = forever).",
    ),
    SettingSpec(
        "traceroute_timeout",
        "traceroute_timeout",
        5,
        3600,
        "seconds",
        "Overall timeout for a single traceroute run.",
    ),
    SettingSpec(
        "traceroute_max_concurrency",
        "traceroute_max_concurrency",
        1,
        64,
        "runs",
        "Maximum number of traceroute runs executing at once.",
    ),
]

REGISTRY_BY_KEY: dict[str, SettingSpec] = {s.key: s for s in REGISTRY}


class InvalidSetting(ValueError):
    pass


def _env_default(spec: SettingSpec) -> int:
    return int(getattr(settings, spec.env_attr))


async def _db_overrides(db: AsyncSession) -> dict[str, str]:
    rows = (await db.execute(select(AppSetting))).scalars().all()
    return {r.key: r.value for r in rows}


async def get_all_effective(db: AsyncSession) -> list[dict]:
    overrides = await _db_overrides(db)
    out = []
    for spec in REGISTRY:
        overridden = spec.key in overrides
        try:
            value = int(overrides[spec.key]) if overridden else _env_default(spec)
        except (ValueError, TypeError):
            value = _env_default(spec)
            overridden = False
        out.append(
            {
                "key": spec.key,
                "value": value,
                "default": _env_default(spec),
                "overridden": overridden,
                "min": spec.minimum,
                "max": spec.maximum,
                "unit": spec.unit,
                "description": spec.description,
            }
        )
    return out


async def apply_db_overrides_to_settings() -> None:
    """At startup, push any persisted overrides onto the in-memory settings
    object so readers see the effective value."""
    async with async_session() as db:
        overrides = await _db_overrides(db)
    for spec in REGISTRY:
        raw = overrides.get(spec.key)
        if raw is None:
            continue
        try:
            setattr(settings, spec.env_attr, int(raw))
        except (ValueError, TypeError):
            pass


async def persist_updates(
    db: AsyncSession, updates: dict
) -> tuple[set[str], list[dict]]:
    """Validate and persist setting updates.

    Returns (changed_keys, effective_list). Also mutates the in-memory
    `settings` object for changed keys so readers pick them up immediately.
    Caller is responsible for any side effects (re-scheduling jobs, etc.).
    """
    changed: set[str] = set()
    for key, raw in updates.items():
        spec = REGISTRY_BY_KEY.get(key)
        if spec is None:
            raise InvalidSetting(f"Unknown setting: {key}")
        try:
            value = int(raw)
        except (ValueError, TypeError):
            raise InvalidSetting(f"{key} must be an integer")
        if value < spec.minimum or value > spec.maximum:
            raise InvalidSetting(
                f"{key} must be between {spec.minimum} and {spec.maximum}"
            )

        existing = await db.get(AppSetting, key)
        if existing and int(existing.value) == value:
            continue  # no change
        if existing:
            existing.value = str(value)
            existing.updated_at = datetime.now(timezone.utc)
        else:
            db.add(AppSetting(key=key, value=str(value)))
        changed.add(key)
        setattr(settings, spec.env_attr, value)

    if changed:
        await db.commit()
    effective = await get_all_effective(db)
    return changed, effective
