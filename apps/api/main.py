from fastapi import FastAPI, HTTPException
from app.game.schema import GameState, UserDecision, GameResponse
from app.game.engine import process_next_turn

app = FastAPI(title="sourcerating & Nanyang Richest Man API")

@app.get("/")
async def root():
    return {"message": "Hello sourcerating & Nanyang AI API"}

@app.post("/game/next_turn", response_model=GameResponse)
async def next_turn(decision: UserDecision):
    """
    Core Game Endpoint: Processes the user's action and returns the next narrative step.
    Supports: A/B/C options OR free-text input.
    """
    try:
        response = await process_next_turn(
            user_id=decision.user_id,
            input_text=decision.input_text,
            state=decision.current_state
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/game/social/ranking")
async def get_ranking():
    """
    Social: Global ranking of players by Assets and Reputation.
    """
    # Mock data for now
    return [
        {"user": "James", "cash": 50000, "reputation": 95, "title": "南洋教父"},
        {"user": "Reader_001", "cash": 12000, "reputation": 70, "title": "橡胶大王"}
    ]

