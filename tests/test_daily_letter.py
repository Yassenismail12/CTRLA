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
    """Verify get_day_number is anchored to 2026-09-14 (Day 1) → 2026-09-19 (Day 6)."""
    # Expected schedule: Day N = 2026-09-(13+N)
    expected = {
        14: 1,  # Sep 14 → Day 1
        15: 2,  # Sep 15 → Day 2
        16: 3,  # Sep 16 → Day 3
        17: 4,  # Sep 17 → Day 4
        18: 5,  # Sep 18 → Day 5
        19: 6,  # Sep 19 → Day 6
        20: 6,  # Sep 20 → still Day 6 (event over, capped)
    }
    for dom, day in expected.items():
        # Mock at noon Cairo so the +2 h offset keeps the same calendar date
        mock_dt = datetime(2026, 9, dom, 12, 0, 0, tzinfo=ZoneInfo("Africa/Cairo"))
        with patch("backend.config.datetime") as mock_obj:
            mock_obj.now.return_value = mock_dt
            assert get_day_number() == day, f"Sep {dom}: expected Day {day}"
            assert todays_date_str() == f"2026-09-{dom:02d}"

    # Any date before launch must return Day 1
    pre_launch = datetime(2026, 9, 13, 12, 0, 0, tzinfo=ZoneInfo("Africa/Cairo"))
    with patch("backend.config.datetime") as mock_obj:
        mock_obj.now.return_value = pre_launch
        assert get_day_number() == 1, "Pre-launch dates must return Day 1"
