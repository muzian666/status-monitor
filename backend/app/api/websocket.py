import json
import secrets

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings
from app.services.ws_manager import ws_manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    # Browsers cannot set custom headers on WebSocket handshakes, so the key is
    # passed as a query parameter when SM_API_KEY is configured.
    if settings.api_key:
        provided = ws.query_params.get("api_key", "")
        if not secrets.compare_digest(provided, settings.api_key):
            await ws.close(code=4401)
            return
    await ws_manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            # Handle ping for latency measurement
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    msg["type"] = "pong"
                    await ws.send_text(json.dumps(msg))
                    continue
            except (json.JSONDecodeError, KeyError):
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)
