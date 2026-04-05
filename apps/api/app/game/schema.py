from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class GameStats(BaseModel):
    cash: int = 1000  # Initial cash
    reputation: int = 50  # Initial reputation
    alignment: int = 0  # -100 (Hero) to 100 (Godfather)

class Relationships(BaseModel):
    allies: List[str] = []
    enemies: List[str] = []
    debts: List[Dict[str, int]] = []  # List of {"from": user_id, "amount": 100}

class GameState(BaseModel):
    turn: int = 1
    timeline: str = "1920-01"
    protagonist: str = "林镇�?
    stats: GameStats = GameStats()
    assets: List[str] = ["吉隆坡祖�?]
    relationships: Relationships = Relationships()
    flags: List[str] = []

class UserDecision(BaseModel):
    user_id: str
    session_id: str
    input_text: str  # Could be A/B/C or custom text
    current_state: GameState

class GameResponse(BaseModel):
    story_text: str
    new_state: GameState
    options: List[Dict[str, str]]  # Generated ABC options

