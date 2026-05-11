import asyncio
import platform
import re

from app.checkers.base import BaseChecker, CheckOutput


class PingChecker(BaseChecker):
    async def check(self, target: str, timeout: float = 5.0, **kwargs) -> CheckOutput:
        try:
            import aioping
            latency = await aioping.ping(target, timeout=timeout)
            return CheckOutput(is_success=True, latency_ms=round(latency * 1000, 2))
        except TimeoutError:
            return CheckOutput(is_success=False, error_message="Ping timeout")
        except Exception:
            pass

        # Fallback: subprocess ping
        return await self._subprocess_ping(target, timeout)

    async def _subprocess_ping(self, target: str, timeout: float) -> CheckOutput:
        system = platform.system().lower()
        try:
            if system == "windows":
                cmd = ["ping", "-n", "1", "-w", str(int(timeout * 1000)), target]
                latency_re = re.compile(r"=(\d+)ms")
            else:
                cmd = ["ping", "-c", "1", "-W", str(int(timeout)), target]
                latency_re = re.compile(r"time=([\d.]+)\s*ms")

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=timeout + 2
            )
            output = stdout.decode(errors="replace")

            if proc.returncode == 0:
                match = latency_re.search(output)
                latency = float(match.group(1)) if match else None
                return CheckOutput(is_success=True, latency_ms=latency)
            return CheckOutput(
                is_success=False,
                error_message=stderr.decode(errors="replace").strip() or "Ping failed",
            )
        except asyncio.TimeoutError:
            return CheckOutput(is_success=False, error_message="Ping timeout")
        except Exception as e:
            return CheckOutput(is_success=False, error_message=str(e))
