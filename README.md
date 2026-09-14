# 🔮 5 BIG WORDS Mystery — 6-Day Escalating Action & Riddle Quest

A server-authoritative 2D daily web game featuring 5 secret letters hidden across 5 escalating action realms. Players battle enemy swarms with magic spells, collect realm relics, dodge hazards, and solve enigmatic ciphers to unlock the Day 6 Grand Finale!

---

## 🗺️ Escalating 6-Day Realms

| Day | Realm Name | Objectives | Secret Letter Revealed |
|---|---|---|---|
| **Day 1** | **Super Mario Discovering** | 🪙 3 Mana Coins + 👾 Defeat 5 Mushroom Enemies | Unlocks **1st Secret Letter** (+100 XP) |
| **Day 2** | **Mario's Way through the Time** | ⚡ 4 Kinetic Orbs + 👾 Defeat 6 Speed Beetles | Unlocks **2nd Secret Letter** (+100 XP) |
| **Day 3** | **5 Different Things** | 💎 5 Elemental Relics + 👾 Defeat 8 Lightning Specters | Unlocks **3rd Secret Letter** (+100 XP) |
| **Day 4** | **Revealed Tracks** | 🌌 6 Quantum Sparks + 👾 Defeat 12 Cyber Drones | Unlocks **4th Secret Letter** (+100 XP) |
| **Day 5** | **Mario the Invader** | 🔮 7 Void Shards + 👾 Defeat 15 Phantom Invaders | Unlocks **5th Secret Letter** (+100 XP) |
| **Day 6** | **SELECT ALL - Master Terminal** | 🏆 Master Conduits + 👾 20 Glitch Entities | **`CONGRATULATIONS {name}! U SOLVED IT AND COLLECTED {total_xp} XP`** |

---

## 🎮 Controls & Mechanics
- **Move**: `W`, `A`, `S`, `D` or Arrow Keys or Click/Touch on canvas.
- **Attack / Cast Spell**: Press `SPACEBAR`, click directly on enemies, or tap `💥 ATTACK` on mobile.
- **Dodge Hazards**: Avoid wandering red void zones and laser hazards in later realms.
- **Solve the Realm Riddle**: Once both realm objectives are complete, enter the glowing ancient portal shrine to answer the riddle!

---

## 🔒 Anti-Cheat & Security Guarantees
- **Server-Authoritative**: Coin collections, enemy defeats, and letter reveals are validated and signed on the FastAPI backend.
- **Signed Tokens (`itsdangerous`)**: HMAC-signed tokens store player lifetime XP and unlocked letters while automatically handling UTC date rollovers.
- **No Early Letter Leaks**: The target letters and final synthesis phrase are concealed until authoritatively unlocked through riddle verification.

---

## 🚀 Running Locally
```bash
pip install -r requirements.txt
pip install uvicorn pytest httpx
python -m pytest -v tests/
python -m uvicorn api.index:app --reload --port 8000
```
Open `http://localhost:8000` in your browser.

---

## 🌐 Deploy to Vercel
```bash
vercel
```
Set `SECRET_KEY` in Vercel project environment variables and deploy with `vercel --prod`.
