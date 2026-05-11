import asyncio
import time

from app.checkers.base import BaseChecker, CheckOutput


class TcpChecker(BaseChecker):
    async def check(self, target: str, timeout: float = 5.0, **kwargs) -> CheckOutput:
        port = kwargs.get("port")
        if not port:
            return CheckOutput(is_success=False, error_message="Port is required for TCP check")
        try:
            start = time.monotonic()
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(target, port), timeout=timeout
            )
            elapsed = (time.monotonic() - start) * 1000
            writer.close()
            await writer.wait_closed()
            return CheckOutput(is_success=True, latency_ms=round(elapsed, 2))
        except asyncio.TimeoutError:
            return CheckOutput(is_success=False, error_message="TCP connection timeout")
        except ConnectionRefusedError:
            return CheckOutput(is_success=False, error_message="Connection refused")
        except Exception as e:
            return CheckOutput(is_success=False, error_message=str(e))
