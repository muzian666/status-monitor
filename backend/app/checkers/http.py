import time

import httpx

from app.checkers.base import BaseChecker, CheckOutput


class HttpChecker(BaseChecker):
    async def check(self, target: str, timeout: float = 5.0, **kwargs) -> CheckOutput:
        expected_status = kwargs.get("expected_status")
        try:
            async with httpx.AsyncClient(
                verify=False, timeout=timeout, follow_redirects=True
            ) as client:
                start = time.monotonic()
                resp = await client.get(target)
                elapsed = (time.monotonic() - start) * 1000

                if expected_status and resp.status_code != expected_status:
                    return CheckOutput(
                        is_success=False,
                        latency_ms=round(elapsed, 2),
                        status_code=resp.status_code,
                        error_message=f"Expected {expected_status}, got {resp.status_code}",
                    )
                is_success = 200 <= resp.status_code < 400
                return CheckOutput(
                    is_success=is_success,
                    latency_ms=round(elapsed, 2),
                    status_code=resp.status_code,
                )
        except httpx.TimeoutException:
            return CheckOutput(is_success=False, error_message="HTTP timeout")
        except Exception as e:
            return CheckOutput(is_success=False, error_message=str(e))
