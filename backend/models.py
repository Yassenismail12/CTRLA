import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class GameState(BaseModel):
    session_id: str
    player_name: str
    game_date: str
    day_number: int = 1
    todays_letter: Optional[str] = "C"
    daily_letter_unlocked: bool = False
    collected_letters: list[str] = Field(default_factory=list)
    total_xp: int = 0
    coins: int = 0
    enemies_defeated: int = 0
    solved_challenge_ids: list[str] = Field(default_factory=list)
    collected_coin_ids: list[str] = Field(default_factory=list)
    defeated_enemy_ids: list[str] = Field(default_factory=list)
    attempts: int = 0
    completed: bool = False  # Completed today's quest
    grand_finale: bool = False  # Day 6 / All 5 letters solved


class NewGameRequest(BaseModel):
    player_name: str

    @field_validator("player_name")
    @classmethod
    def validate_player_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("اسم البطل مينفعش يكون فاضي.")
        if len(trimmed) > 30:
            raise ValueError("اسم البطل مينفعش يزيد عن 30 حرف.")
        return trimmed


class CollectCoinRequest(BaseModel):
    state_token: str
    coin_id: str


class DefeatEnemyRequest(BaseModel):
    state_token: str
    enemy_id: str


class ChallengeAnswerRequest(BaseModel):
    state_token: str
    challenge_id: str
    answer: str


class ResumeRequest(BaseModel):
    state_token: str



# Response models
class NewGameResponse(BaseModel):
    state_token: str
    day_number: int
    day_name: str
    required_items: int
    required_enemies: int
    item_label: str
    todays_letter: Optional[str]
    collected_letters: list[str]
    total_xp: int
    coins: int
    enemies_defeated: int
    daily_letter_unlocked: bool
    grand_finale: bool


class CollectCoinResponse(BaseModel):
    state_token: str
    coins: int
    total_xp: int
    portal_unlocked: bool


class DefeatEnemyResponse(BaseModel):
    state_token: str
    enemies_defeated: int
    total_xp: int
    portal_unlocked: bool


class ChallengePromptResponse(BaseModel):
    challenge_id: str
    prompt: str
    day_number: int


class ChallengeVerifyResponse(BaseModel):
    state_token: str
    correct: bool
    daily_letter_unlocked: bool
    todays_letter: Optional[str]
    collected_letters: list[str]
    total_xp: int
    coins: int
    enemies_defeated: int
    completed: bool
    grand_finale: bool
    victory_message: Optional[str] = None


class ResumeResponse(BaseModel):
    state_token: Optional[str] = None
    expired: bool = False
    day_rolled_over: bool = False
    session_id: Optional[str] = None
    player_name: Optional[str] = None
    day_number: Optional[int] = None
    day_name: Optional[str] = None
    required_items: Optional[int] = None
    required_enemies: Optional[int] = None
    item_label: Optional[str] = None
    todays_letter: Optional[str] = None
    collected_letters: Optional[list[str]] = None
    total_xp: Optional[int] = None
    coins: Optional[int] = None
    enemies_defeated: Optional[int] = None
    daily_letter_unlocked: Optional[bool] = None
    completed: Optional[bool] = None
    grand_finale: Optional[bool] = None
    victory_message: Optional[str] = None


class GameStatusResponse(BaseModel):
    is_launched: bool
    launch_time: str
    current_time: str
    seconds_until_launch: int
    day_number: int
    day_name: str
