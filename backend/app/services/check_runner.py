from datetime import datetime, timezone

from app.checkers.dns import DnsChecker
from app.checkers.http import HttpChecker
from app.checkers.ping import PingChecker
from app.checkers.tcp import TcpChecker
from app.database import async_session
from app.models.check_result import CheckResult
from app.services.ws_manager import ws_manager

_checkers = {
    "ping": PingChecker(),
    "http": HttpChecker(),
    "https": HttpChecker(),
    "tcp": TcpChecker(),
    "dns": DnsChecker(),
}


async def run_check(monitor) -> dict:
    checker = _checkers.get(monitor.protocol)
    if not checker:
        return {"error": f"Unknown protocol: {monitor.protocol}"}

    kwargs = {}
    if monitor.port:
        kwargs["port"] = monitor.port
    if monitor.expected_status:
        kwargs["expected_status"] = monitor.expected_status
    if monitor.dns_record_type:
        kwargs["dns_record_type"] = monitor.dns_record_type

    result = await checker.check(monitor.target, monitor.timeout_seconds, **kwargs)

    async with async_session() as db:
        check = CheckResult(
            monitor_id=monitor.id,
            is_success=result.is_success,
            latency_ms=result.latency_ms,
            status_code=result.status_code,
            error_message=result.error_message,
            dns_result=result.dns_result,
            checked_at=datetime.now(timezone.utc),
        )
        db.add(check)
        await db.commit()
        await db.refresh(check)

    await ws_manager.broadcast(
        {
            "type": "check_result",
            "data": {
                "id": check.id,
                "monitor_id": monitor.id,
                "monitor_name": monitor.name,
                "protocol": monitor.protocol,
                "is_success": result.is_success,
                "latency_ms": result.latency_ms,
                "status_code": result.status_code,
                "error_message": result.error_message,
                "dns_result": result.dns_result,
                "checked_at": check.checked_at.isoformat(),
            },
        }
    )

    return {
        "is_success": result.is_success,
        "latency_ms": result.latency_ms,
        "status_code": result.status_code,
        "error_message": result.error_message,
        "dns_result": result.dns_result,
    }
