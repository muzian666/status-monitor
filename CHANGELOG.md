# Changelog

Notable changes to **Status Monitor**. Format based on [Keep a Changelog](https://keepachangelog.com/); this project aims to follow [Semantic Versioning](https://semver.org/).

Issue / PR numbers link to GitHub. Rename `[Unreleased]` to a version when cutting a release.

## [Unreleased]

Baseline before this entry: the initial release (commits up to `ff78dbf`), advertised as `1.0.0` by the API.

### Security

- **Opt-in API key authentication** (#2, PR #37): set `SM_API_KEY` to require a key on all `/api/v1` routes (except health and auth-status) and the WebSocket; empty value keeps the API open (backwards compatible). Uses constant-time comparison; CORS preflight is exempt. The frontend shows an unlock prompt and attaches the key via an axios interceptor / `?api_key=` on the socket. Closes the unauthenticated monitor/traceroute surface (SSRF / internal-network probing).
- **TLS verification for HTTPS monitors is on by default** (#4, PR #35): the HTTP checker no longer hardcodes `verify=False`. Added a per-monitor `verify_tls` toggle (migration `0002`) for self-signed internal targets. Note: existing HTTPS monitors pointed at invalid certs will now fail until `verify_tls` is turned off per monitor.
- **CORS misconfiguration fixed** (#8, PR #20): `allow_origins=["*"]` + `allow_credentials=True` (which browsers reject) replaced by configurable `SM_CORS_ORIGINS`; credentials auto-enable only when origins are explicit.

### Added

- **Alembic migrations, auto-applied on startup** (PR #34): replaces `create_all`, so schema changes are safe for existing databases. Legacy pre-Alembic databases are stamped at the baseline revision (data preserved); fresh databases are created at head. Async `env.py` mirrors the runtime driver; `render_as_batch` is on for SQLite column changes.
- **DB-aware readiness probe** (#16, PR #26): `/api/v1/health/live` (liveness, no DB) and `/api/v1/health/ready` (readiness, runs `SELECT 1`); `/health` kept as an alias. k8s and Helm probes updated.
- **Result retention** (#6, PR #29): `SM_RETENTION_DAYS` (default 30, `0` = keep forever) with an hourly purge of old `check_results` and `traceroute_runs` (+ their hops). Added an index on `check_results(monitor_id, checked_at)`.
- **Traceroute controls** (#7, PR #30): overall run timeout `SM_TRACEROUTE_TIMEOUT` (default 120s) that kills a stuck process instead of hanging forever, and `SM_TRACEROUTE_MAX_CONCURRENCY` (default 8) semaphore. Launched tasks are now strongly referenced.
- **Live status on the manual topology** (#11, PR #25): nodes/links light up from each monitor's latest check result. Also fixes the frontend edge key mismatch (`latency` → `latency_ms`).
- **DNS honors `dns_record_type`** (#5, PR #28): switched from `getaddrinfo` (A/AAAA only) to `dnspython`, so A/AAAA/CNAME/MX/NS/TXT actually query the type the user selected.
- **Cascade-delete of topology links** when a node is removed (#10, PR #27).
- **Test suite** (#17): 0 → 53 tests across 12 files, including integration-test infrastructure (httpx ASGITransport + DB override) and a regression guard that fails fast if a breaking dependency major is installed.

### Changed

- **Timestamps are timezone-aware** (#18, PR #36): all `DateTime` columns are now `DateTime(timezone=True)`; `created_at`/`updated_at` use Python UTC defaults instead of the naive `CURRENT_TIMESTAMP`. Migration `0003`; the retention cutoff is now aware UTC. Pre-existing rows keep their original values until purged by retention.
- **Monitor edits no longer fire an immediate check** (#13, PR #22): the scheduler job is rebuilt only when `interval_seconds` or `is_active` actually changes; an interval-only edit defers the next run by one interval.
- **WebSocket broadcast is concurrent** (#15, PR #23): a slow client no longer blocks delivery to others (`asyncio.gather` + `return_exceptions`).
- **Pagination no longer calls `setState` during render** (#12, PR #24): dashboard, monitor list, and monitor detail derive a clamped `safePage` instead.
- **Dependencies pinned with upper bounds** (#9, PR #21): notably `apscheduler<4` (4.x rewrites the scheduler API and would crash at startup). Added `dnspython` and `alembic`.
- **HPA pinned to `maxReplicas: 1`** while on SQLite (#1, PR #33): documented as required until a shared DB + leader election are in place.
- **NetworkPolicy allows external egress** (#3, PR #32): the monitor can now reach user-defined targets outside the cluster (previously every external check was denied).

### Fixed

- `connect_args` (`check_same_thread`) is only injected for SQLite, so a non-sqlite `SM_DATABASE_URL` no longer errors (#14, PR #19).

[Unreleased]: https://github.com/muzian666/status-monitor/compare/ff78dbf...HEAD
