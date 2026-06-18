import asyncio

import httpx
import pytest

from app.checkers.http import HttpChecker


class _FakeResp:
    status_code = 200


class _FakeClient:
    """Records the kwargs passed to AsyncClient and returns a 200."""

    def __init__(self, **kwargs):
        self.captured = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, url):
        return _FakeResp()


def test_http_checker_passes_verify_tls_false(monkeypatch):
    captured = {}

    def fake_client(**kwargs):
        client = _FakeClient(**kwargs)
        captured.update(client.captured)
        return client

    monkeypatch.setattr(httpx, "AsyncClient", fake_client)
    out = asyncio.run(HttpChecker().check("https://example.com", 5, verify_tls=False))
    assert out.is_success
    assert captured["verify"] is False


def test_http_checker_defaults_verify_true(monkeypatch):
    captured = {}

    def fake_client(**kwargs):
        client = _FakeClient(**kwargs)
        captured.update(client.captured)
        return client

    monkeypatch.setattr(httpx, "AsyncClient", fake_client)
    asyncio.run(HttpChecker().check("https://example.com", 5))
    assert captured["verify"] is True


_ = pytest
