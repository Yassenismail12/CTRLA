from fastapi import HTTPException

# Curated thematic riddle challenges for Days 1 to 6 in Egyptian Arabic
DAILY_RIDDLES: dict[int, dict] = {
    1: {
        "id": "riddle_day_1",
        "day": 1,
        "prompt": "صوتي زي صوت البحر، وبتدوس عليا مع الزرار المشهور عشان تنسخ الكلام! أنا رمز سرعة الضوء في الفيزيا، وتالت حرف في الحروف الإنجليزي.. ياترى أنا مين؟",
        "answers": ["c", "letter c", "see", "sea", "سي", "حرف c", "حرف السي", "حرف سي"],
    },
    2: {
        "id": "riddle_day_2",
        "day": 2,
        "prompt": "هل أنا تسلا ولا كوباية الشاي وزرع الشجر؟ أنا الزرار اللي بينقلك بين الصفحات (التابس) وأساس شاشة الأوامر السودة.. ياترى أنا أنهي حرف؟",
        "answers": ["t", "letter t", "tea", "tee", "تي", "حرف t", "حرف التي", "حرف تي"],
    },
    3: {
        "id": "riddle_day_3",
        "day": 3,
        "prompt": "رومانسي وسقفي حلو! صوتي عامل زي زئير الأسد، وبمثل ذاكرة القراءة وأمر الريستارت، وكليك يمين بالماوس.. ياترى أنا أنهي حرف؟",
        "answers": ["r", "letter r", "are", "our", "آر", "ار", "حرف r", "حرف الآر", "حرف الار", "حرف ار"],
    },
    4: {
        "id": "riddle_day_4",
        "day": 4,
        "prompt": "ورقة شجر ولا سكة طويلة؟ ببدأ اسم نظام لينكس الشهير، وماسك كل اللينكات واللفات البرمجية، وشكلي زاوية قايمة وعلى الشمال.. ياترى أنا أنهي حرف؟",
        "answers": ["l", "letter l", "el", "ell", "إل", "ال", "حرف l", "حرف الإل", "حرف الال", "حرف ال", "حرف إل"],
    },
    5: {
        "id": "riddle_day_5",
        "day": 5,
        "prompt": "أول كل حاجة! أنا أول حرف في الأبجدية، وبداية كل الخوارزميات والدرجات العالية، ولما بتدوس عليا مع الكنترول بحدد كل حاجة! ياترى أنا مين؟",
        "answers": ["a", "letter a", "all", "aye", "إيه", "ايه", "أ", "ا", "حرف a", "حرف الألف", "حرف الالف", "حرف الايه", "حرف ايه"],
    },
    6: {
        "id": "riddle_day_6",
        "day": 6,
        "prompt": "يا عيني عليك جمعت الـ 5 حروف السرية خلاص! على الكيبورد بقى، إيه هو الاختصار المشهور اللي بيعمل 'تحديد الكل'؟",
        "answers": ["ctrl a", "control a", "select all", "ctrl+a", "control+a", "ctrla", "تحديد الكل", "كنترول a", "كنترول إيه", "كنترول ايه", "كنترول + a", "ctrl + a", "تحديد كل شيء"],
    },
}

_RIDDLE_MAP = {r["id"]: r for r in DAILY_RIDDLES.values()}


def get_challenge_for_day(day_number: int) -> dict:
    """Returns challenge for the specific day (omitting answers)."""
    day_key = max(1, min(6, day_number))
    riddle = DAILY_RIDDLES[day_key]
    return {
        "challenge_id": riddle["id"],
        "prompt": riddle["prompt"],
        "day_number": riddle["day"],
    }


def get_challenge(challenge_id: str) -> dict:
    """Returns challenge public details by challenge_id."""
    if challenge_id not in _RIDDLE_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"معرف اللغز غير معروف: '{challenge_id}'.",
        )
    riddle = _RIDDLE_MAP[challenge_id]
    return {
        "challenge_id": riddle["id"],
        "prompt": riddle["prompt"],
        "day_number": riddle["day"],
    }


def get_next_challenge(solved_ids: list[str], current_day: int = 1) -> dict:
    """Returns the challenge for current_day."""
    return get_challenge_for_day(current_day)


def _normalize_str(val: str) -> str:
    """Normalizes string for comparison (lowercasing, trimming, Arabic normalization)."""
    val = val.strip().lower()
    val = val.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    val = val.replace("ة", "ه").replace("ى", "ي")
    val = " ".join(val.split())
    return val


def validate_answer(challenge_id: str, answer: str) -> bool:
    """Validates player answer against accepted variants (case-insensitive, trimmed, normalized)."""
    if challenge_id not in _RIDDLE_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"معرف اللغز غير معروف: '{challenge_id}'.",
        )
    if not answer or not isinstance(answer, str):
        return False

    cleaned = _normalize_str(answer)
    accepted = [_normalize_str(a) for a in _RIDDLE_MAP[challenge_id]["answers"]]
    return cleaned in accepted
