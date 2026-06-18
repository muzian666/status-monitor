import asyncio

from app.services.ws_manager import WebSocketManager


class FakeWS:
    def __init__(self, *, fail: bool = False):
        self.fail = fail
        self.sent: list[str] = []

    async def send_text(self, data: str):
        if self.fail:
            raise RuntimeError("send failed")
        self.sent.append(data)


def test_broadcast_sends_to_all_connections():
    mgr = WebSocketManager()
    a, b = FakeWS(), FakeWS()
    mgr.connections = [a, b]
    asyncio.run(mgr.broadcast({"type": "ping"}))
    assert a.sent == ['{"type": "ping"}']
    assert b.sent == ['{"type": "ping"}']


def test_broadcast_drops_failed_connections():
    mgr = WebSocketManager()
    ok, bad = FakeWS(), FakeWS(fail=True)
    mgr.connections = [ok, bad]
    asyncio.run(mgr.broadcast({"type": "x"}))
    assert ok in mgr.connections
    assert bad not in mgr.connections


def test_broadcast_keeps_healthy_when_another_fails():
    # A failing client must not prevent delivery to healthy ones (the bug
    # gather fixes is the opposite: serial await would still deliver, but a
    # slow/raising one is dropped here without affecting others).
    mgr = WebSocketManager()
    ok1, bad, ok2 = FakeWS(), FakeWS(fail=True), FakeWS()
    mgr.connections = [ok1, bad, ok2]
    asyncio.run(mgr.broadcast({"type": "x"}))
    assert ok1.sent and ok2.sent
    assert bad not in mgr.connections
    assert ok1 in mgr.connections and ok2 in mgr.connections


def test_broadcast_no_connections_is_noop():
    mgr = WebSocketManager()
    asyncio.run(mgr.broadcast({"type": "x"}))  # must not raise
    assert mgr.connections == []
