import asyncio
import platform
import time

from app.checkers.base import BaseChecker, CheckOutput


class PingChecker(BaseChecker):
    async def check(self, target: str, timeout: float = 5.0, **kwargs) -> CheckOutput:
        system = platform.system().lower()
        try:
            if system == "windows":
                cmd = ["ping", "-n", "1", "-w", str(int(timeout * 1000)), target]
            else:
                cmd = ["ping", "-c", "1", "-W", str(int(timeout)), target]

            start = time.monotonic()
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=timeout + 2
            )
            elapsed = (time.monotonic() - start) * 1000

            if proc.returncode == 0:
                return CheckOutput(is_success=True, latency_ms=round(elapsed, 2))
            return CheckOutput(
                is_success=False,
                latency_ms=round(elapsed, 2),
                error_message=stderr.decode(errors="replace").strip() or "Ping failed",
            )
        except asyncio.TimeoutError:
            return CheckOutput(is_success=False, error_message="Ping timeout")
        except Exception as e:
            return CheckOutput(is_success=False, error_message=str(e))
