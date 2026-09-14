from backend.challenges import (
    DAILY_RIDDLES,
    get_challenge,
    get_challenge_for_day,
    validate_answer,
)


def test_daily_riddles_count():
    """Verify all 6 days have customized thematic riddles."""
    assert len(DAILY_RIDDLES) == 6


def test_day_1_riddle_validation():
    """Verify Day 1 riddle: 'صوت البحر'"""
    riddle = get_challenge_for_day(1)
    assert "صوت البحر" in riddle["prompt"]
    assert validate_answer(riddle["challenge_id"], "c") is True
    assert validate_answer(riddle["challenge_id"], "letter c") is True
    assert validate_answer(riddle["challenge_id"], "see") is True
    assert validate_answer(riddle["challenge_id"], "سي") is True
    assert validate_answer(riddle["challenge_id"], "حرف c") is True
    assert validate_answer(riddle["challenge_id"], "wrong") is False


def test_day_2_riddle_validation():
    """Verify Day 2 riddle: 'تسلا'"""
    riddle = get_challenge_for_day(2)
    assert "تسلا" in riddle["prompt"]
    assert validate_answer(riddle["challenge_id"], "t") is True
    assert validate_answer(riddle["challenge_id"], "tea") is True
    assert validate_answer(riddle["challenge_id"], "تي") is True


def test_day_3_riddle_validation():
    """Verify Day 3 riddle: 'رومانسي'"""
    riddle = get_challenge_for_day(3)
    assert "رومانسي" in riddle["prompt"]
    assert validate_answer(riddle["challenge_id"], "r") is True
    assert validate_answer(riddle["challenge_id"], "آر") is True
    assert validate_answer(riddle["challenge_id"], "ار") is True


def test_day_4_riddle_validation():
    """Verify Day 4 riddle: 'ورقة شجر'"""
    riddle = get_challenge_for_day(4)
    assert "ورقة شجر" in riddle["prompt"]
    assert validate_answer(riddle["challenge_id"], "l") is True
    assert validate_answer(riddle["challenge_id"], "إل") is True
    assert validate_answer(riddle["challenge_id"], "ال") is True


def test_day_5_riddle_validation():
    """Verify Day 5 riddle: 'أول كل حاجة'"""
    riddle = get_challenge_for_day(5)
    assert "أول كل حاجة" in riddle["prompt"]
    assert validate_answer(riddle["challenge_id"], "a") is True
    assert validate_answer(riddle["challenge_id"], "all") is True
    assert validate_answer(riddle["challenge_id"], "إيه") is True
    assert validate_answer(riddle["challenge_id"], "أ") is True


def test_day_6_grand_finale_riddle():
    """Verify Day 6 riddle: 'تحديد الكل' synthesis."""
    riddle = get_challenge_for_day(6)
    assert "تحديد الكل" in riddle["prompt"]
    assert validate_answer(riddle["challenge_id"], "ctrl a") is True
    assert validate_answer(riddle["challenge_id"], "select all") is True
    assert validate_answer(riddle["challenge_id"], "control a") is True
    assert validate_answer(riddle["challenge_id"], "تحديد الكل") is True
    assert validate_answer(riddle["challenge_id"], "كنترول a") is True
