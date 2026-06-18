import asyncio

import dns.asyncresolver
import dns.resolver

from app.checkers.dns import DnsChecker


class _FakeAnswer:
    def __init__(self, text: str):
        self._text = text

    def to_text(self):
        return self._text


def _patch_resolver(monkeypatch, *, answers=None, exc=None):
    """Replace dns.asyncresolver.Resolver with a fake that records the query."""

    calls = {}

    class FakeResolver:
        def __init__(self):
            pass

        async def resolve(self, qname, rdtype, **kwargs):
            calls["qname"] = qname
            calls["rdtype"] = rdtype
            if exc is not None:
                raise exc
            return [_FakeAnswer(a) for a in (answers or [])]

    monkeypatch.setattr(dns.asyncresolver, "Resolver", FakeResolver)
    return calls


def test_dns_uses_requested_record_type(monkeypatch):
    calls = _patch_resolver(monkeypatch, answers=["mail.example.com."])
    out = asyncio.run(DnsChecker().check("example.com", 5, dns_record_type="MX"))
    assert out.is_success
    assert calls["rdtype"] == "MX"
    assert "mail.example.com." in out.dns_result


def test_dns_defaults_to_A_when_no_record_type(monkeypatch):
    calls = _patch_resolver(monkeypatch, answers=["1.2.3.4"])
    out = asyncio.run(DnsChecker().check("example.com", 5))
    assert out.is_success
    assert calls["rdtype"] == "A"


def test_dns_uppercases_record_type(monkeypatch):
    calls = _patch_resolver(monkeypatch, answers=["::1"])
    asyncio.run(DnsChecker().check("example.com", 5, dns_record_type="aaaa"))
    assert calls["rdtype"] == "AAAA"


def test_dns_handles_nxdomain(monkeypatch):
    _patch_resolver(monkeypatch, exc=dns.resolver.NXDOMAIN())
    out = asyncio.run(DnsChecker().check("nonexistent.invalid", 5, dns_record_type="A"))
    assert not out.is_success
    assert "NXDOMAIN" in out.error_message


def test_dns_handles_no_answer(monkeypatch):
    _patch_resolver(monkeypatch, exc=dns.resolver.NoAnswer())
    out = asyncio.run(DnsChecker().check("example.com", 5, dns_record_type="MX"))
    assert not out.is_success
    assert "MX" in out.error_message
