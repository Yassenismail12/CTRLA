from datetime import datetime, timedelta, date as _date
from typing import Optional
from zoneinfo import ZoneInfo

# The 5 hidden letters unlocked across Days 1 to 5
HIDDEN_LETTERS: list[str] = ["C", "T", "R", "L", "A"]

# Daily target objectives with Egyptian Arabic realm names and item labels
DAY_OBJECTIVES: dict[int, dict] = {
    1: {"name": "بداية المغامرة والتحدي", "items": 3, "enemies": 5, "item_label": "قطع الطاقة"},
    2: {"name": "طريق السفر عبر الزمن", "items": 0, "enemies": 0, "item_label": "العملات الذهبية"},
    3: {"name": "سباق السرعة والتحدي ضد ماريو", "items": 0, "enemies": 0, "item_label": "العملات الذهبية"},
    4: {"name": "غزاة الهاتف - دفاع النظام", "items": 0, "enemies": 0, "item_label": "البيانات المسترجعة"},
    5: {"name": "عالم الثعبان - تحدي الثعبان الكلاسيكي", "items": 10, "enemies": 0, "item_label": "تفاح الطاقة"},
    6: {"name": "تحديد الكل - محطة مترو المحطة الأخيرة", "items": 0, "enemies": 0, "item_label": "عملات المترو"},
}

# XP rewards
XP_PER_LETTER: int = 100
XP_PER_ITEM: int = 10
XP_PER_ENEMY: int = 15
XP_FINALE_BONUS: int = 500

# Rollover happens at 10 PM Cairo time (Africa/Cairo)
GAME_TIMEZONE = ZoneInfo("Africa/Cairo")

# ─── Event anchor ────────────────────────────────────────────────────────────
# Day 1 = September 14, 2026 (game-time date).
# The game clock rolls over at 22:00 Cairo (= get_game_time midnight),
# so Day 2 becomes active at 22:00 Cairo on September 14, 2026, etc.
GAME_START_DATE: _date = _date(2026, 9, 14)
# ─────────────────────────────────────────────────────────────────────────────


def get_game_time() -> datetime:
    """Returns the effective game time. Since rollover is at 10 PM (22:00) Cairo time, we offset by +2 hours."""
    return datetime.now(GAME_TIMEZONE) + timedelta(hours=2)


def todays_date_str() -> str:
    """Returns current date string (YYYY-MM-DD) for the current game day."""
    return get_game_time().date().isoformat()


def get_day_number() -> int:
    """Returns current day index (1–6) anchored to GAME_START_DATE (2026-09-14).

    Day 1 = 2026-09-14, Day 2 = 2026-09-15 … Day 6 = 2026-09-19.
    Returns 1 for any date before the launch and 6 for any date after Day 6.
    """
    today_date = get_game_time().date()
    delta = (today_date - GAME_START_DATE).days
    return max(1, min(6, delta + 1))


def get_todays_letter(day_num: Optional[int] = None) -> Optional[str]:
    """Returns the secret letter for the day (1=C, 2=T, 3=R, 4=L, 5=A, 6=None)."""
    if day_num is None:
        day_num = get_day_number()
    if 1 <= day_num <= len(HIDDEN_LETTERS):
        return HIDDEN_LETTERS[day_num - 1]
    return None
