import uuid
from typing import Optional
from backend.config import (
    DAY_OBJECTIVES,
    HIDDEN_LETTERS,
    XP_FINALE_BONUS,
    XP_PER_ENEMY,
    XP_PER_ITEM,
    XP_PER_LETTER,
    get_day_number,
    get_todays_letter,
    todays_date_str,
)
from backend.models import GameState


def ensure_previous_letters_revealed(state: GameState) -> GameState:
    """Ensures all letters from previous days (days 1 to day_number - 1) are guaranteed to be revealed in collected_letters."""
    prev_letters = [HIDDEN_LETTERS[d - 1] for d in range(1, state.day_number) if d - 1 < len(HIDDEN_LETTERS)]
    for letter in prev_letters:
        if letter not in state.collected_letters:
            state.collected_letters.append(letter)

    if state.daily_letter_unlocked and state.todays_letter and state.todays_letter not in state.collected_letters:
        state.collected_letters.append(state.todays_letter)

    state.collected_letters = [ch for ch in HIDDEN_LETTERS if ch in state.collected_letters]
    return state


def new_game_state(player_name: str) -> GameState:
    """Builds a fresh GameState for the daily quest with previous days' letters automatically revealed."""
    day_num = get_day_number()
    letter = get_todays_letter(day_num)
    is_day_6 = day_num == 6

    state = GameState(
        session_id=str(uuid.uuid4()),
        player_name=player_name,
        game_date=todays_date_str(),
        day_number=day_num,
        todays_letter=letter,
        daily_letter_unlocked=False,
        collected_letters=[],
        total_xp=0,
        coins=0,
        enemies_defeated=0,
        solved_challenge_ids=[],
        collected_coin_ids=[],
        defeated_enemy_ids=[],
        attempts=0,
        completed=False,
        grand_finale=is_day_6,
    )
    return ensure_previous_letters_revealed(state)


def add_coins(state: GameState, coin_id: str, amount: int = 1) -> GameState:
    """Adds collected items/coins and awards XP, deduplicating IDs."""
    if coin_id not in state.collected_coin_ids:
        state.collected_coin_ids.append(coin_id)
        state.coins += amount
        state.total_xp += amount * XP_PER_ITEM
    return state


def defeat_enemy(state: GameState, enemy_id: str) -> GameState:
    """Records defeated enemy authoritatively and awards XP, deduplicating IDs."""
    if enemy_id not in state.defeated_enemy_ids:
        state.defeated_enemy_ids.append(enemy_id)
        state.enemies_defeated += 1
        state.total_xp += XP_PER_ENEMY
    return state


def is_portal_unlocked(state: GameState) -> bool:
    """Checks if player collected required items and defeated required enemies for today's quest."""
    obj = DAY_OBJECTIVES.get(state.day_number, DAY_OBJECTIVES[1])
    return state.coins >= obj["items"] and state.enemies_defeated >= obj["enemies"]


def unlock_todays_letter(state: GameState) -> GameState:
    """Authoritatively unlocks today's letter, awards XP, and checks for Day 6 completion."""
    if not state.daily_letter_unlocked:
        state.daily_letter_unlocked = True
        state.completed = True

        if state.todays_letter and state.todays_letter not in state.collected_letters:
            state.collected_letters.append(state.todays_letter)

        state.total_xp += XP_PER_LETTER

    state = ensure_previous_letters_revealed(state)

    # Check for Grand Finale (Day 6 or all 5 letters C-T-R-L-A unlocked)
    has_all_letters = all(ch in state.collected_letters for ch in HIDDEN_LETTERS)
    if (state.day_number == 6 or has_all_letters) and not state.grand_finale:
        state.grand_finale = True
        state.total_xp += XP_FINALE_BONUS

    return state


def advance_day_if_needed(state: GameState) -> tuple[GameState, bool]:
    """Advances player session if the calendar date has rolled over, resetting daily level progress and ensuring all previous letters are revealed."""
    current_date = todays_date_str()
    if state.game_date != current_date:
        state.game_date = current_date
        state.day_number = get_day_number()
        state.todays_letter = get_todays_letter(state.day_number)
        state.daily_letter_unlocked = False
        state.completed = False
        state.coins = 0
        state.enemies_defeated = 0
        state.collected_coin_ids = []
        state.defeated_enemy_ids = []
        state.collected_letters = []

        state = ensure_previous_letters_revealed(state)

        if state.day_number == 6 or all(ch in state.collected_letters for ch in HIDDEN_LETTERS):
            state.grand_finale = True

        return state, True

    state = ensure_previous_letters_revealed(state)
    return state, False


def build_victory_message(state: GameState) -> str:
    """Builds the authoritative server-side victory message in Egyptian Arabic."""
    if state.grand_finale:
        return f"ألف مبروك يا {state.player_name}! حليت اللغز الكبير وجمعت {state.total_xp} نقطة خبرة!"

    return (
        f"عاش يا {state.player_name}! جبت حرف النهاردة بنجاح "
        f"(خد سكرين شوت واستنانا بكره)"
    )
