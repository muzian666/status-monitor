from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class CheckOutput:
    is_success: bool
    latency_ms: float | None = None
    status_code: int | None = None
    error_message: str | None = None
    dns_result: str | None = None


class BaseChecker(ABC):
    @abstractmethod
    async def check(self, target: str, timeout: float, **kwargs) -> CheckOutput:
        ...
