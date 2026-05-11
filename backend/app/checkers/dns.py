import asyncio
import time

from app.checkers.base import BaseChecker, CheckOutput


class DnsChecker(BaseChecker):
    async def check(self, target: str, timeout: float = 5.0, **kwargs) -> CheckOutput:
        record_type = kwargs.get("dns_record_type", "A")
        try:
            start = time.monotonic()
            loop = asyncio.get_event_loop()
            results = await asyncio.wait_for(
                loop.getaddrinfo(target, None), timeout=timeout
            )
            elapsed = (time.monotonic() - start) * 1000

            addresses = list({r[4][0] for r in results})
            return CheckOutput(
                is_success=True,
                latency_ms=round(elapsed, 2),
                dns_result=", ".join(addresses),
            )
        except asyncio.TimeoutError:
            return CheckOutput(is_success=False, error_message="DNS resolution timeout")
        except Exception as e:
            return CheckOutput(is_success=False, error_message=str(e))
