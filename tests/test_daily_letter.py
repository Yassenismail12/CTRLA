from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo
from backend.config import (
    GAME_TIMEZONE,
    HIDDEN_LETTERS,
    get_day_number,
    get_todays_letter,
    todays_date_str,
)


def test_hidden_letter_sequence():
    """Verify Day 1=C, Day 2=T, Day 3=R, Day 4=L, Day 5=A, Day 6=Finale."""
    assert get_todays_letter(1) == "C"
    assert get_todays_letter(2) == "T"
    assert get_todays_letter(3) == "R"
    assert get_todays_letter(4) == "L"
    assert get_todays_letter(5) == "A"
    assert get_todays_letter(6) is None  # Grand Finale


def test_day_number_cycle():
    """Verify get_day_number and is_game_launched in test deployment mode."""
    tz = ZoneInfo("Africa/Cairo")
    schedule_checks = [
        # (datetime, expected_day, expected_launched)
        (datetime(2026, 9, 13, 23, 59, 59, tzinfo=tz), 1, False), # Day before launch
        (datetime(2026, 9, 14, 0, 0, 0, tzinfo=tz), 1, True),     # Launch Day 1
        (datetime(2026, 9, 14, 11, 0, 0, tzinfo=tz), 1, True),    # Active Day 1 (now)
        (datetime(2026, 9, 15, 0, 0, 0, tzinfo=tz), 2, True),     # Day 2
        (datetime(2026, 9, 16, 0, 0, 0, tzinfo=tz), 3, True),     # Day 3
        (datetime(2026, 9, 17, 0, 0, 0, tzinfo=tz), 4, True),     # Day 4
        (datetime(2026, 9, 18, 0, 0, 0, tzinfo=tz), 5, True),     # Day 5
        (datetime(2026, 9, 19, 0, 0, 0, tzinfo=tz), 6, True),     # Day 6
        (datetime(2026, 9, 25, 12, 0, 0, tzinfo=tz), 6, True),    # Past Day 6
    ]
    for mock_dt, exp_day, exp_launch in schedule_checks:
        with patch("backend.config.datetime") as mock_obj:
            mock_obj.now.return_value = mock_dt
            from backend.config import is_game_launched
            assert is_game_launched() == exp_launch, f"{mock_dt}: expected launched={exp_launch}"
            assert get_day_number() == exp_day, f"{mock_dt}: expected day={exp_day}"
