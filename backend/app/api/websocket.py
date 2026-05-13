import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.ws_manager import ws_manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
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
