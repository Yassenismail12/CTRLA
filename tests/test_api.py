from unittest.mock import patch
from fastapi.testclient import TestClient
from api.index import app
from backend.challenges import DAILY_RIDDLES

client = TestClient(app)


def test_new_game_endpoint():
    """Verify new game initialization returns day objectives and item labels."""
    res = client.post("/api/new-game", json={"player_name": "MarioHero"})
    assert res.status_code == 200
    data = res.json()
    assert "state_token" in data
    assert "required_items" in data
    assert "required_enemies" in data
    assert "day_name" in data


def test_collect_item_and_defeat_enemy():
    """Verify collecting items and defeating enemies tracks counts and XP."""
    res = client.post("/api/new-game", json={"player_name": "MarioHero"})
    token = res.json()["state_token"]

    # Collect item
    res_item = client.post("/api/collect-coin", json={"state_token": token, "coin_id": "item_1"})
    assert res_item.status_code == 200
    token = res_item.json()["state_token"]
    assert res_item.json()["coins"] == 1
    assert res_item.json()["total_xp"] == 10

    # Defeat enemy
    res_enemy = client.post("/api/defeat-enemy", json={"state_token": token, "enemy_id": "enemy_1"})
    assert res_enemy.status_code == 200
    assert res_enemy.json()["enemies_defeated"] == 1
    assert res_enemy.json()["total_xp"] == 25  # 10 + 15


def test_riddle_solution_and_victory():
    """Verify solving the daily riddle returns victory and letter unlock."""
    res = client.post("/api/new-game", json={"player_name": "Explorer"})
    token = res.json()["state_token"]

    # Fetch daily riddle
    res_riddle = client.get(f"/api/challenge/next?state_token={token}")
    assert res_riddle.status_code == 200
    ch_id = res_riddle.json()["challenge_id"]

    riddle = next(r for r in DAILY_RIDDLES.values() if r["id"] == ch_id)
    answer = riddle["answers"][0]

    # Verify riddle answer
    res_verify = client.post(
        "/api/challenge/verify",
        json={"state_token": token, "challenge_id": ch_id, "answer": answer},
    )
    assert res_verify.status_code == 200
    data = res_verify.json()
    assert data["correct"] is True
    assert data["daily_letter_unlocked"] is True
    assert data["total_xp"] >= 100
    assert "عاش يا Explorer!" in data["victory_message"]


def test_arabic_player_name():
    """Verify Arabic player names are accepted and returned properly."""
    arabic_name = "ماريو الشجاع"
    res = client.post("/api/new-game", json={"player_name": arabic_name})
    assert res.status_code == 200
    data = res.json()
    assert "state_token" in data
    token = data["state_token"]

    # Verify resume state preserves Arabic name
    res_resume = client.post("/api/state/resume", json={"state_token": token})
    assert res_resume.status_code == 200
    assert res_resume.json()["player_name"] == arabic_name


def test_dev_set_day_endpoint_is_removed():
    """Verify /dev/set-day endpoint no longer exists (returns 404) after security fix."""
    res = client.post("/api/new-game", json={"player_name": "DevTester"})
    assert res.status_code == 200
    token = res.json()["state_token"]

    # The dev route must be gone — any attempt should get 404 Not Found
    res_dev = client.post("/api/dev/set-day", json={"state_token": token, "target_day": 6})
    assert res_dev.status_code in (404, 405), (
        "SECURITY: /api/dev/set-day must not be accessible in production. "
        f"Got {res_dev.status_code} instead of 404/405."
    )


def test_game_status_endpoint():
    """Verify /api/status returns launch status and timing information."""
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert "is_launched" in data
    assert "launch_time" in data
    assert "current_time" in data
    assert "seconds_until_launch" in data
    assert "day_number" in data
    assert "day_name" in data


def test_outdated_token_auto_advances_riddle_and_level():
    """Verify that a token created with Day 1 automatically advances to Day 2 when hitting /api/challenge/next and /api/state/resume."""
    from backend.models import GameState
    from backend.session import create_token
    from backend.challenges import DAILY_RIDDLES

    s = GameState(
        session_id="test-retro-player",
        player_name="MarioTester",
        game_date="2026-09-14",
        day_number=1,
        todays_letter="C",
        daily_letter_unlocked=False,
        completed=False,
        total_xp=0,
    )
    old_token = create_token(s)

    # When get_day_number is mocked to 2 (Day 2):
    with patch("backend.game.get_day_number", return_value=2), patch("backend.routes.get_day_number", return_value=2):
        # 1. /api/challenge/next must deliver Day 2 riddle, NOT Day 1
        res_riddle = client.get(f"/api/challenge/next?state_token={old_token}")
        assert res_riddle.status_code == 200
        data_riddle = res_riddle.json()
        assert data_riddle["day_number"] == 2
        assert data_riddle["challenge_id"] == "riddle_day_2"
        assert data_riddle["prompt"] == DAILY_RIDDLES[2]["prompt"]

        # 2. /api/state/resume must also advance to Day 2
        res_resume = client.post("/api/state/resume", json={"state_token": old_token})
        assert res_resume.status_code == 200
        data_resume = res_resume.json()
        assert data_resume["day_number"] == 2
        assert data_resume["completed"] is False
        assert data_resume["todays_letter"] == "T"
        assert "C" in data_resume["collected_letters"]
