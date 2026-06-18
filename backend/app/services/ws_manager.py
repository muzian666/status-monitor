import asyncio
import json
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)

    async def broadcast(self, message: dict):
        # Fan out concurrently so one slow/stuck client cannot block delivery
        # to everyone else. return_exceptions keeps a single failure from
        # cancelling the whole gather.
        conns = list(self.connections)
        if not conns:
            return
        data = json.dumps(message, default=str)
        results = await asyncio.gather(
            *(ws.send_text(data) for ws in conns),
            return_exceptions=True,
        )
        for ws, result in zip(conns, results):
            if isinstance(result, Exception):
                self.disconnect(ws)


ws_manager = WebSocketManager()
