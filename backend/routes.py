import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.challenges import get_challenge_for_day, validate_answer
from backend.config import (
    DAY_OBJECTIVES,
    GAME_LAUNCH_DATETIME,
    GAME_TIMEZONE,
    HIDDEN_LETTERS,
    get_day_number,
    get_todays_letter,
    is_game_launched,
)
from backend.game import (
    add_coins,
    advance_day_if_needed,
    build_victory_message,
    defeat_enemy,
    is_portal_unlocked,
    new_game_state,
    unlock_todays_letter,
)
from backend.models import (
    ChallengeAnswerRequest,
    ChallengePromptResponse,
    ChallengeVerifyResponse,
    CollectCoinRequest,
    CollectCoinResponse,
    DefeatEnemyRequest,
    DefeatEnemyResponse,
    GameStatusResponse,
    NewGameRequest,
    NewGameResponse,
    ResumeRequest,
    ResumeResponse,
)
from backend.session import create_token, verify_token

router = APIRouter()


@router.get("/status", response_model=GameStatusResponse)
def get_game_status():
    """Returns official launch status, countdown seconds, and active day."""
    now = datetime.now(GAME_TIMEZONE)
    launched = is_game_launched()
    seconds_left = max(0, int((GAME_LAUNCH_DATETIME - now).total_seconds())) if not launched else 0
    day = get_day_number()
    obj = DAY_OBJECTIVES.get(day, DAY_OBJECTIVES[1])
    return GameStatusResponse(
        is_launched=launched,
        launch_time=GAME_LAUNCH_DATETIME.isoformat(),
        current_time=now.isoformat(),
        seconds_until_launch=seconds_left,
        day_number=day,
        day_name=obj["name"],
    )


@router.post("/new-game", response_model=NewGameResponse)
def new_game(request: NewGameRequest):
    """Starts a new game for the player, initializing 5 BIG WORDS Mystery quest."""
    state = new_game_state(request.player_name)
    token = create_token(state)
    obj = DAY_OBJECTIVES.get(state.day_number, DAY_OBJECTIVES[1])

    return NewGameResponse(
        state_token=token,
        day_number=state.day_number,
        day_name=obj["name"],
        required_items=obj["items"],
        required_enemies=obj["enemies"],
        item_label=obj["item_label"],
        todays_letter=state.todays_letter,
        collected_letters=state.collected_letters,
        total_xp=state.total_xp,
        coins=state.coins,
        enemies_defeated=state.enemies_defeated,
        daily_letter_unlocked=state.daily_letter_unlocked,
        grand_finale=state.grand_finale,
    )


@router.post("/collect-coin", response_model=CollectCoinResponse)
def collect_coin(request: CollectCoinRequest):
    """Authoritatively adds collected item/coin to player state and awards XP."""
    state = verify_token(request.state_token)
    state, _ = advance_day_if_needed(state)
    state = add_coins(state, request.coin_id)
    new_token = create_token(state)
    return CollectCoinResponse(
        state_token=new_token,
        coins=state.coins,
        total_xp=state.total_xp,
        portal_unlocked=is_portal_unlocked(state),
    )


@router.post("/defeat-enemy", response_model=DefeatEnemyResponse)
def defeat_enemy_endpoint(request: DefeatEnemyRequest):
    """Authoritatively records defeated enemy and awards XP."""
    state = verify_token(request.state_token)
    state, _ = advance_day_if_needed(state)
    state = defeat_enemy(state, request.enemy_id)
    new_token = create_token(state)
    return DefeatEnemyResponse(
        state_token=new_token,
        enemies_defeated=state.enemies_defeated,
        total_xp=state.total_xp,
        portal_unlocked=is_portal_unlocked(state),
    )


@router.get("/challenge/next", response_model=ChallengePromptResponse)
def get_next_riddle(state_token: str = Query(..., description="Signed GameState token")):
    """Retrieves the curated thematic riddle for the active day."""
    state = verify_token(state_token)
    state, rolled = advance_day_if_needed(state)
    challenge = get_challenge_for_day(state.day_number)
    new_token = create_token(state) if rolled else None
    return ChallengePromptResponse(
        challenge_id=challenge["challenge_id"],
        prompt=challenge["prompt"],
        day_number=state.day_number,
        state_token=new_token,
    )


@router.post("/challenge/verify", response_model=ChallengeVerifyResponse)
def verify_challenge(request: ChallengeAnswerRequest):
    """Validates riddle answer, unlocking secret letter and awarding XP."""
    state = verify_token(request.state_token)
    state, _ = advance_day_if_needed(state)
    state.attempts += 1

    is_correct = validate_answer(request.challenge_id, request.answer)
    victory_msg: Optional[str] = None

    if is_correct:
        if request.challenge_id not in state.solved_challenge_ids:
            state.solved_challenge_ids.append(request.challenge_id)
        state = unlock_todays_letter(state)

    if state.completed or state.grand_finale:
        victory_msg = build_victory_message(state)

    new_token = create_token(state)
    return ChallengeVerifyResponse(
        state_token=new_token,
        correct=is_correct,
        daily_letter_unlocked=state.daily_letter_unlocked,
        todays_letter=state.todays_letter,
        collected_letters=state.collected_letters,
        total_xp=state.total_xp,
        coins=state.coins,
        enemies_defeated=state.enemies_defeated,
        completed=state.completed,
        grand_finale=state.grand_finale,
        victory_message=victory_msg,
    )


@router.post("/state/resume", response_model=ResumeResponse)
def resume_game(request: ResumeRequest):
    """Resumes game session with full multi-day progress."""
    state = verify_token(request.state_token)
    state, day_rolled_over = advance_day_if_needed(state)

    victory_msg = build_victory_message(state) if (state.completed or state.grand_finale) else None
    obj = DAY_OBJECTIVES.get(state.day_number, DAY_OBJECTIVES[1])
    new_token = create_token(state)

    return ResumeResponse(
        state_token=new_token,
        expired=False,
        day_rolled_over=day_rolled_over,
        session_id=state.session_id,
        player_name=state.player_name,
        day_number=state.day_number,
        day_name=obj["name"],
        required_items=obj["items"],
        required_enemies=obj["enemies"],
        item_label=obj["item_label"],
        todays_letter=state.todays_letter,
        collected_letters=state.collected_letters,
        total_xp=state.total_xp,
        coins=state.coins,
        enemies_defeated=state.enemies_defeated,
        daily_letter_unlocked=state.daily_letter_unlocked,
        completed=state.completed,
        grand_finale=state.grand_finale,
        victory_message=victory_msg,
    )
