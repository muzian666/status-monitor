from pydantic import BaseModel


class WSMessage(BaseModel):
    type: str
    data: dict | None = None
