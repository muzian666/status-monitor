import asyncio
import platform
import re
from datetime import datetime

from sqlalchemy import select

from app.database import async_session
from app.models.traceroute import TracerouteHop, TracerouteRun, TracerouteStatus
from app.services.ws_manager import ws_manager


async def run_traceroute(run_id: int, target_host: str):
    system = platform.system().lower()

    if system == "windows":
        cmd = ["tracert", "-d", "-h", "30", "-w", "5000", target_host]
        hop_pattern = re.compile(
            r"^\s*(\d+)\s+"
            r"(?:<?\d+\s+ms\s+){0,3}"
            r"([\d.*]+|\*)"
        )
        timeout_pattern = re.compile(r"Request timed out")
    else:
        cmd = ["traceroute", "-n", "-m", "30", "-w", "5", target_host]
        hop_pattern = re.compile(
            r"^\s*(\d+)\s+"
            r"(?:([\d.]+)\s+)?"
            r"([\d.]+)\s+ms"
        )
        timeout_pattern = re.compile(r"\*\s+\*\s+\*")

    async with async_session() as db:
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            hop_number = 0
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                line_str = line.decode(errors="replace").strip()
                if not line_str:
                    continue

                is_timeout = bool(timeout_pattern.search(line_str))
                match = hop_pattern.match(line_str)

                if match or is_timeout:
                    hop_number += 1
                    ip_address = None
                    latency_ms = None

                    if match:
                        groups = match.groups()
                        ip_address = groups[1] if groups[1] and groups[1] != "*" else None
                        if not ip_address and len(groups) > 2:
                            ip_address = groups[2]

                    try:
                        latency_val = re.search(r"([\d.]+)\s*ms", line_str)
                        if latency_val:
                            latency_ms = float(latency_val.group(1))
                    except (ValueError, IndexError):
                        pass

                    if not ip_address and not is_timeout:
                        ip_match = re.search(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", line_str)
                        if ip_match:
                            ip_address = ip_match.group(1)

                    hop = TracerouteHop(
                        run_id=run_id,
                        hop_number=hop_number,
                        ip_address=ip_address,
                        latency_ms=latency_ms,
                        is_timeout=is_timeout or ip_address is None,
                    )
                    db.add(hop)
                    await db.commit()

                    await ws_manager.broadcast(
                        {
                            "type": "traceroute_hop",
                            "data": {
                                "run_id": run_id,
                                "hop_number": hop_number,
                                "ip_address": ip_address,
                                "latency_ms": latency_ms,
                                "is_timeout": is_timeout,
                            },
                        }
                    )

            await proc.wait()

            run = await db.get(TracerouteRun, run_id)
            if run:
                run.status = TracerouteStatus.COMPLETED
                run.completed_at = datetime.utcnow()
                run.total_hops = hop_number
                await db.commit()

            await ws_manager.broadcast(
                {
                    "type": "traceroute_complete",
                    "data": {"run_id": run_id, "total_hops": hop_number},
                }
            )

        except Exception as e:
            run = await db.get(TracerouteRun, run_id)
            if run:
                run.status = TracerouteStatus.FAILED
                run.completed_at = datetime.utcnow()
                await db.commit()

            await ws_manager.broadcast(
                {
                    "type": "traceroute_complete",
                    "data": {"run_id": run_id, "error": str(e)},
                }
            )
