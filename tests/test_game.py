from backend.config import XP_PER_ENEMY, XP_PER_ITEM, XP_PER_LETTER
from backend.game import (
    add_coins,
    advance_day_if_needed,
    build_victory_message,
    defeat_enemy,
    is_portal_unlocked,
    new_game_state,
    unlock_todays_letter,
)


def test_new_game_state_initialization():
    """Verify fresh game state defaults."""
    state = new_game_state("PlayerOne")
    assert state.player_name == "PlayerOne"
    assert state.coins == 0
    assert state.enemies_defeated == 0
    assert state.total_xp == 0
    assert not state.daily_letter_unlocked


def test_defeat_enemy_and_xp():
    """Verify defeating enemies adds to count and awards XP."""
    state = new_game_state("PlayerOne")
    state = defeat_enemy(state, "enemy_1")
    assert state.enemies_defeated == 1
    assert state.total_xp == XP_PER_ENEMY

    # Duplicate does not double count
    state = defeat_enemy(state, "enemy_1")
    assert state.enemies_defeated == 1
    assert state.total_xp == XP_PER_ENEMY


def test_portal_unlocked_thresholds():
    """Verify portal unlocks when items and enemy kill thresholds are met."""
    state = new_game_state("PlayerOne")
    state.day_number = 1  # requires 3 items, 5 enemies

    assert not is_portal_unlocked(state)

    for i in range(3):
        state = add_coins(state, f"item_{i}")
    assert not is_portal_unlocked(state)

    for i in range(5):
        state = defeat_enemy(state, f"enemy_{i}")
    assert is_portal_unlocked(state)


def test_level_2_no_targets_required():
    """Verify Level 2 (Day 2) does not require item/enemy targets to unlock portal."""
    state = new_game_state("MarioRunner")
    state.day_number = 2
    assert is_portal_unlocked(state) is True


def test_unlock_letter_and_grand_finale():
    """Verify unlocking letters awards XP and Day 6 triggers grand finale."""
    state = new_game_state("Alex")
    state.day_number = 1
    state.todays_letter = "C"

    state = unlock_todays_letter(state)
    assert state.daily_letter_unlocked is True
    assert "C" in state.collected_letters
    assert state.total_xp == XP_PER_LETTER

    # Test Day 6 Grand Finale
    state.day_number = 6
    state.collected_letters = ["C", "T", "R", "L", "A"]
    state.grand_finale = False
    state = unlock_todays_letter(state)
    assert state.grand_finale is True
    assert "ألف مبروك يا Alex! حليت اللغز الكبير وجمعت" in build_victory_message(state)


def test_auto_revealed_previous_letters_and_fresh_daily_level():
    """Verify that playing on Day N automatically reveals previous letters (1..N-1) and resets daily targets for a fresh level."""
    state = new_game_state("Explorer")
    state.day_number = 4  # Day 4 (Phone Invaders)
    state.todays_letter = "L"
    state = advance_day_if_needed(state)[0]  # ensure previous letters are updated

    # Previous letters (Day 1='C', Day 2='T', Day 3='R') must be automatically revealed
    assert "C" in state.collected_letters
    assert "T" in state.collected_letters
    assert "R" in state.collected_letters
    assert "L" not in state.collected_letters  # Today's target letter is not unlocked yet
    assert state.coins == 0  # Fresh level for today
    assert state.enemies_defeated == 0

