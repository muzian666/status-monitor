import time

import dns.asyncresolver
import dns.resolver

from app.checkers.base import BaseChecker, CheckOutput


class DnsChecker(BaseChecker):
    async def check(self, target: str, timeout: float = 5.0, **kwargs) -> CheckOutput:
        # Honor the record type the user chose (A/AAAA/CNAME/MX/NS/TXT/...).
        # The old implementation called getaddrinfo, which only resolves A/AAAA
        # and silently ignored dns_record_type.
        record_type = (kwargs.get("dns_record_type") or "A").upper()
        try:
            resolver = dns.asyncresolver.Resolver()
            resolver.lifetime = timeout  # cap total query time
            start = time.monotonic()
            answers = await resolver.resolve(target, record_type)
            elapsed = (time.monotonic() - start) * 1000

            values = [r.to_text() for r in answers]
            return CheckOutput(
                is_success=True,
                latency_ms=round(elapsed, 2),
                dns_result=", ".join(values),
            )
        except dns.resolver.NXDOMAIN:
            return CheckOutput(is_success=False, error_message="NXDOMAIN (domain does not exist)")
        except dns.resolver.NoAnswer:
            return CheckOutput(
                is_success=False, error_message=f"No {record_type} record for {target}"
            )
        except (dns.resolver.NoNameservers, dns.resolver.LifetimeTimeout) as e:
            return CheckOutput(is_success=False, error_message=str(e))
        except Exception as e:
            return CheckOutput(is_success=False, error_message=str(e))
