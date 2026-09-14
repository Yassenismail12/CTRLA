/**
 * لغز الكلمات الخمسة — تطبيق اللعبة
 * مغامرة تفاعلية وألغاز يومية متصاعدة عبر 6 أيام بالعامية المصرية
 * الألوان: الأساسي #1134a8 | الخلفية بيضاء #ffffff | الثانوي #ffbe02
 */

const state = {
  token: localStorage.getItem("collecting_a_word_token") || null,
  playerName: "",
  dayNumber: 1,
  dayName: "بداية المغامرة والتحدي",
  requiredItems: 3,
  requiredEnemies: 5,
  itemLabel: "قطع الطاقة",
  todaysLetter: "C",
  dailyLetterUnlocked: false,
  collectedLetters: [],
  totalXp: 0,
  coins: 0,
  enemiesDefeated: 0,
  completed: false,
  grandFinale: false,
  victoryMessage: "",
  currentChallengeId: null,
  soundEnabled: true,
};

const API_BASE = (function () {
  if (window.location.protocol === "file:") {
    return "http://127.0.0.1:8000/api";
  }
  const h = window.location.hostname;
  const isLocal = h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.") || h.startsWith("10.") || h.endsWith(".local");
  if (isLocal && window.location.port !== "8000" && window.location.port !== "") {
    return `http://${h}:8000/api`;
  }
  return "/api";
})();

let isModalActive = false;
let shrineCooldown = 0;

// تحميل صورة شخصية البطل الرسمية
const playerImg = new Image();
playerImg.src = "assets/character_player.png?v=3";
const playerImgBack = new Image();
playerImgBack.src = "assets/character_player_back.png?v=1";
const playerImgSide = new Image();
playerImgSide.src = "assets/character_player_side.png?v=1";

// المؤثرات الصوتية عبر Web Audio API
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playCoin() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playSpell() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  playEnemyHit() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playCorrect() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.15, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.35);
    });
  }

  playWrong() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.setValueAtTime(140, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playJump() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = "square";
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playBump() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(100, now + 0.07);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playBoost() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.35);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playDrift() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.setValueAtTime(280, now + 0.1);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playLap() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [587.33, 880.0, 1174.66];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.2);
    });
  }

  playPowerUp() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.08, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.12);
    });
  }

  playVictory() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, d: 0.15 },
      { f: 659.25, d: 0.15 },
      { f: 783.99, d: 0.15 },
      { f: 1046.5, d: 0.4 },
    ];
    let offset = 0;
    notes.forEach((n) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(n.f, now + offset);

      gain.gain.setValueAtTime(0.2, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + n.d);
      offset += n.d;
    });
  }
}

const audio = new SoundFX();

// التنقل بين الشاشات
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  const target = document.getElementById(screenId);
  if (target) target.classList.remove("hidden");
}

function getGameDateString() {
  const now = new Date();
  const cairoOptions = { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-US', cairoOptions).formatToParts(now);
  let y, m, d;
  for (let p of parts) {
    if (p.type === 'year') y = p.value;
    if (p.type === 'month') m = p.value;
    if (p.type === 'day') d = p.value;
  }
  return `${y}-${m}-${d}`;
}

function startMidnightCountdown() {
  const countdownEl = document.getElementById("midnight-countdown");
  function tick() {
    const now = new Date();
    const cairoOptions = { timeZone: 'Africa/Cairo', hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' };
    const parts = new Intl.DateTimeFormat('en-US', cairoOptions).formatToParts(now);
    let hour = 0, minute = 0, second = 0;
    for (let p of parts) {
      if (p.type === 'hour') hour = parseInt(p.value, 10);
      if (p.type === 'minute') minute = parseInt(p.value, 10);
      if (p.type === 'second') second = parseInt(p.value, 10);
    }
    if (hour === 24) hour = 0;

    const currentSeconds = hour * 3600 + minute * 60 + second;
    const targetSeconds = 22 * 3600; // 22:00:00 (10 PM Cairo Time)

    let diffSeconds = targetSeconds - currentSeconds;
    if (diffSeconds <= 0) {
      diffSeconds += 24 * 3600;
    }

    if (diffSeconds >= 24 * 3600 - 2) {
      if (countdownEl) countdownEl.textContent = "00:00:00 (بيفتح حالا...)";
      if (!window._isReloading) {
        window._isReloading = true;
        setTimeout(() => checkResumeState(), 2000);
      }
      return;
    }

    const hours = Math.floor(diffSeconds / 3600);
    const mins = Math.floor((diffSeconds % 3600) / 60);
    const secs = Math.floor(diffSeconds % 60);

    if (countdownEl) {
      countdownEl.textContent = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
  }
  tick();
  setInterval(tick, 1000);
}

// ─── إدارة حالة الانتظار والإطلاق (Launch & Waiting Management) ───────────────
function getCairoNow() {
  const now = new Date();
  const cairoOptions = {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  };
  const parts = new Intl.DateTimeFormat('en-US', cairoOptions).formatToParts(now);
  let y = 0, m = 0, d = 0, h = 0, min = 0, s = 0;
  for (let p of parts) {
    if (p.type === 'year') y = parseInt(p.value, 10);
    if (p.type === 'month') m = parseInt(p.value, 10);
    if (p.type === 'day') d = parseInt(p.value, 10);
    if (p.type === 'hour') h = parseInt(p.value, 10);
    if (p.type === 'minute') min = parseInt(p.value, 10);
    if (p.type === 'second') s = parseInt(p.value, 10);
  }
  if (h === 24) h = 0;
  return { year: y, month: m, day: d, hour: h, minute: min, second: s };
}

function isGameLaunchedClient() {
  const c = getCairoNow();
  // Target: 2026-09-14 22:00:00 (10:00 PM Cairo Time)
  if (c.year > 2026) return true;
  if (c.year < 2026) return false;
  if (c.month > 9) return true;
  if (c.month < 9) return false;
  if (c.day > 14) return true;
  if (c.day < 14) return false;
  // Today is 14-09-2026: launched if hour >= 22 (10 PM)
  return c.hour >= 22;
}

function getSecondsUntilLaunch() {
  if (isGameLaunchedClient()) return 0;
  const c = getCairoNow();
  if (c.year === 2026 && c.month === 9 && c.day === 14) {
    const currentSeconds = c.hour * 3600 + c.minute * 60 + c.second;
    const targetSeconds = 22 * 3600; // 22:00:00 (10:00 PM)
    return Math.max(0, targetSeconds - currentSeconds);
  }
  // Fallback for dates before Sept 14 (Cairo is UTC+3 in September)
  const targetMs = Date.UTC(2026, 8, 14, 19, 0, 0);
  return Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
}

let waitingCountdownInterval = null;

function updateWaitingDisplay(remaining) {
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const waitHoursEl = document.getElementById("wait-hours");
  const waitMinutesEl = document.getElementById("wait-minutes");
  const waitSecondsEl = document.getElementById("wait-seconds");

  if (waitHoursEl) waitHoursEl.textContent = String(hours).padStart(2, "0");
  if (waitMinutesEl) waitMinutesEl.textContent = String(minutes).padStart(2, "0");
  if (waitSecondsEl) waitSecondsEl.textContent = String(seconds).padStart(2, "0");
}

function startWaitingCountdown(serverSeconds) {
  if (waitingCountdownInterval) {
    clearInterval(waitingCountdownInterval);
    waitingCountdownInterval = null;
  }

  let remaining = (typeof serverSeconds === "number" && serverSeconds > 0)
    ? serverSeconds
    : getSecondsUntilLaunch();

  updateWaitingDisplay(remaining);

  waitingCountdownInterval = setInterval(() => {
    // Re-verify against Cairo time to prevent timer drift
    const clientRemaining = getSecondsUntilLaunch();
    if (clientRemaining <= 0 || isGameLaunchedClient()) {
      clearInterval(waitingCountdownInterval);
      waitingCountdownInterval = null;
      updateWaitingDisplay(0);

      // Auto-open the game smoothly when countdown ends!
      showScreen("name-gate");
      startMidnightCountdown();
      checkResumeState();
      return;
    }

    remaining = clientRemaining;
    updateWaitingDisplay(remaining);
  }, 1000);
}

async function initGameLifecycle() {
  const clientLaunched = isGameLaunchedClient();

  if (!clientLaunched) {
    // Before 10 PM launch: display waiting screen and run countdown
    showScreen("waiting-screen");
    startWaitingCountdown();

    // Sync authoritative countdown with backend
    try {
      const status = await apiRequest("/status");
      if (status && status.is_launched) {
        if (waitingCountdownInterval) {
          clearInterval(waitingCountdownInterval);
          waitingCountdownInterval = null;
        }
        showScreen("name-gate");
        startMidnightCountdown();
        checkResumeState();
        return;
      } else if (status && typeof status.seconds_until_launch === "number") {
        startWaitingCountdown(status.seconds_until_launch);
      }
    } catch (e) {
      console.warn("Could not sync launch status from server, using local Cairo time:", e);
    }
  } else {
    // Already launched (after 10 PM)
    showScreen("name-gate");
    startMidnightCountdown();
    checkResumeState();
  }
}

async function apiRequest(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (res.status === 401) {
      localStorage.removeItem("collecting_a_word_token");
      state.token = null;
      alert("الجلسة خلصت يا بطل.. هنبدأ جولة جديدة!");
      showScreen("name-gate");
      return null;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let msg = "";
      if (typeof err.detail === "string") {
        msg = err.detail;
      } else if (Array.isArray(err.detail) && err.detail.length > 0) {
        msg = err.detail[0].msg || JSON.stringify(err.detail);
        if (msg.startsWith("Value error, ")) msg = msg.replace("Value error, ", "");
      } else {
        msg = `فشل الطلب (${res.status})`;
      }
      throw new Error(msg);
    }

    return await res.json();
  } catch (err) {
    console.error("خطأ في الاتصال بالخادم:", err);
    throw err;
  }
}

// رسم خانات الحروف الخمسة
function renderCipherSlots() {
  const container = document.getElementById("cipher-slots");
  if (!container) return;

  const slots = container.querySelectorAll(".letter-slot");
  slots.forEach((el, idx) => {
    el.className = "letter-slot";

    if (state.collectedLetters && idx < state.collectedLetters.length) {
      el.classList.add("unlocked");
      el.textContent = state.collectedLetters[idx];
    } else if (idx === state.dayNumber - 1 && !state.dailyLetterUnlocked) {
      el.classList.add("target-today");
      el.textContent = "؟";
    } else {
      el.textContent = "؟";
    }
  });
}

function updateHUD() {
  const nameEl = document.getElementById("hud-player-name");
  const dayEl = document.getElementById("hud-day-text");
  const xpEl = document.getElementById("hud-total-xp");
  const itemEl = document.getElementById("obj-item-text");
  const enemyEl = document.getElementById("obj-enemy-text");

  if (nameEl) nameEl.textContent = state.playerName || "البطل";
  if (dayEl) dayEl.textContent = `اليوم ${state.dayNumber}: ${state.dayName}`;
  if (xpEl) xpEl.textContent = `${state.totalXp} نقطة خبرة`;

  const isLevel2 = (state.dayNumber === 2 || isPlatformer);
  const isLevel3 = (state.dayNumber === 3 || isRacing);
  const isLevel4 = (state.dayNumber === 4 || isInvaders);
  const isLevel5 = (state.dayNumber === 5 || isSnake);
  const isLevel6 = (state.dayNumber === 6 || isSubway);

  if (isLevel6) {
    if (itemEl) itemEl.textContent = `عملات المترو: ${state.coins}`;
    if (enemyEl) enemyEl.textContent = `المسافة: ${Math.floor(subwayDistance)}م / ${SUBWAY_TOTAL_DISTANCE}م`;
  } else if (isLevel5) {
    if (itemEl) itemEl.textContent = `تفاح الطاقة: ${snakeScore} / ${snakeTargetScore}`;
    if (enemyEl) enemyEl.textContent = `طول الثعبان: ${snakeBody.length}`;
  } else if (isLevel4) {
    if (itemEl) itemEl.textContent = `البيانات: ${state.coins}`;
    if (enemyEl) enemyEl.textContent = `الموجة: ${invadersWave} / 3`;
  } else if (isLevel3) {
    if (itemEl) itemEl.textContent = `العملات: ${state.coins}`;
    if (enemyEl) enemyEl.textContent = playerCar ? `اللفة: ${playerCar.lap} / 2` : `سباق السيارات`;
  } else if (isLevel2) {
    if (itemEl) itemEl.textContent = `العملات: ${state.coins}`;
    if (enemyEl) enemyEl.textContent = `الأعداء المهزومين: ${state.enemiesDefeated}`;
  } else {
    if (itemEl) itemEl.textContent = `${state.itemLabel}: ${state.coins} / ${state.requiredItems}`;
    if (enemyEl) enemyEl.textContent = `الأعداء اللي طاروا: ${state.enemiesDefeated} / ${state.requiredEnemies}`;
  }

  // تخصيص زر الأكشن للجوال حسب المرحلة الحالية
  const mobileAttackBtn = document.getElementById("btn-mobile-attack");
  if (mobileAttackBtn) {
    if (isLevel3) {
      mobileAttackBtn.innerHTML = "⚡<br>نيترو";
      mobileAttackBtn.style.display = "flex";
    } else if (isLevel2 || isLevel6) {
      mobileAttackBtn.innerHTML = "⬆️<br>نـط";
      mobileAttackBtn.style.display = "flex";
    } else if (isLevel5) {
      mobileAttackBtn.style.display = "none";
    } else {
      mobileAttackBtn.innerHTML = "💥<br>اضرب";
      mobileAttackBtn.style.display = "flex";
    }
  }

  const portalBadge = document.getElementById("portal-status-badge");
  const openBtn = document.getElementById("btn-open-challenge");

  const portalReady = (state.requiredItems === 0 && state.requiredEnemies === 0) ||
    (state.coins >= state.requiredItems && state.enemiesDefeated >= state.requiredEnemies);

  if (portalBadge && openBtn) {
    if (isLevel6) {
      portalBadge.className = "portal-status-badge unlocked";
      portalBadge.innerHTML = subwayFinished ? "<span>🏆 كسبت سباق المترو! ادخل للغز النهائي</span>" : `<span>🏃‍♂️ الهدف: اقطع ${SUBWAY_TOTAL_DISTANCE}م في خط المترو!</span>`;
      if (subwayFinished || subwayDistance >= SUBWAY_TOTAL_DISTANCE) {
        openBtn.className = "btn btn-gold btn-pulse";
        openBtn.classList.remove("hidden");
        openBtn.innerHTML = "<span>🏆 ادخل محطة التحدي النهائي</span>";
      } else {
        openBtn.classList.add("hidden");
      }
    } else if (isLevel5) {
      portalBadge.className = "portal-status-badge unlocked";
      portalBadge.innerHTML = snakeFinished ? "<span>🏆 جمعت تفاح الطاقة! ادخل للغز</span>" : `<span>🐍 الهدف: اكل ${snakeTargetScore} تفاحات!</span>`;
      if (snakeFinished || snakeScore >= snakeTargetScore) {
        openBtn.className = "btn btn-gold btn-pulse";
        openBtn.classList.remove("hidden");
        openBtn.innerHTML = "<span>🏆 ادخل بوابة اليوم 5</span>";
      } else {
        openBtn.classList.add("hidden");
      }
    } else if (isLevel4) {
      portalBadge.className = "portal-status-badge unlocked";
      portalBadge.innerHTML = (invadersWave > 3) ? "<span>🏆 تم القضاء على الفيروسات! ادخل للغز</span>" : `<span>📱 الهدف: دافع عن النظام! الموجة ${invadersWave}/3</span>`;
      if (invadersWave > 3) {
        openBtn.className = "btn btn-gold btn-pulse";
        openBtn.classList.remove("hidden");
        openBtn.innerHTML = "<span>🏆 استعادة النظام</span>";
      } else {
        openBtn.classList.add("hidden");
      }
    } else if (isLevel3) {
      portalBadge.className = "portal-status-badge unlocked";
      portalBadge.innerHTML = raceFinished ? "<span>🏆 كسبت السباق! ادخل للغز</span>" : "<span>🏎️ الهدف: اسبق ماريو واقطع 2500م!</span>";
      if (raceFinished || raceDistanceTraveled >= RACE_TOTAL_DISTANCE) {
        openBtn.className = "btn btn-gold btn-pulse";
        openBtn.classList.remove("hidden");
        openBtn.innerHTML = "<span>🏆 ادخل منصة التتويج</span>";
      } else {
        openBtn.classList.add("hidden");
      }
    } else if (isLevel2) {
      portalBadge.className = "portal-status-badge unlocked";
      portalBadge.innerHTML = "<span>🏰 الهدف: الوصول للقلعة في نهاية الطريق!</span>";
      if (player && player.x >= 4500) {
        openBtn.className = "btn btn-gold btn-pulse";
        openBtn.classList.remove("hidden");
        openBtn.innerHTML = "<span>🏰 ادخل القلعة</span>";
      } else {
        openBtn.classList.add("hidden");
      }
    } else {
      if (portalReady) {
        portalBadge.className = "portal-status-badge unlocked";
        portalBadge.innerHTML = "<span>🌌 بوابة الزمن جاهزة!</span>";
        openBtn.className = "btn btn-gold btn-pulse";
        openBtn.classList.remove("hidden");
        openBtn.innerHTML = "<span>🌌 ادخل بوابة الزمن</span>";
      } else {
        portalBadge.className = "portal-status-badge";
        portalBadge.innerHTML = "<span>🔒 بوابة الزمن مقفولة</span>";
        openBtn.classList.add("hidden");
      }
    }
  }

  const controlsHint = document.querySelector(".controls-hint span");
  if (controlsHint) {
    if (isLevel6) {
      controlsHint.textContent = "🎮 الحركة بين الحارات: الأسهم / A-D | ⬆️ النط فوق العوائق: سهم لأعلى / W / مسافة | ⬇️ الزحلقة تحت الإشارات: سهم لأسفل / S | 🏃‍♂️ تجنب القطارات!";
    } else if (isLevel5) {
      controlsHint.textContent = "🎮 توجيه الثعبان: الأسهم / W-A-S-D أو أزرار الاتجاهات بالجوال | 🐍 اجمع 10 تفاحات للوصول للهدف!";
    } else if (isLevel4) {
      controlsHint.textContent = "🎮 الحركة: الأسهم / A-D | 💥 إطلاق النار: مسافة / W / سهم لأعلى | دافع عن النظام من الفيروسات!";
    } else if (isLevel3) {
      controlsHint.textContent = "🎮 القيادة: الأسهم / W-A-S-D أو اسحب بالماوس/اللمس للتوجيه المباشر السلس | 🚀 المسافة للنيترو الصاروخي | 🏎️ اسبق ماريو واكسب السباق!";
    } else if (isLevel2) {
      controlsHint.textContent = "🎮 الحركة: الأسهم / A-D | ⬆️ النط: السهم لأعلى أو المسافة | 🏃 الجري: Shift | 🏰 الهدف: الوصول للقلعة!";
    } else {
      controlsHint.textContent = "🎮 الحركة: الأسهم أو لمس الشاشة | 💥 الضرب: زرار المسافة أو دوس على الوحوش";
    }
  }

  // تحديث حالة الشعار السري في شريط المعلومات (مغوش حتى اليوم السادس)
  const mysteryLogoEl = document.getElementById("hud-mystery-logo");
  const mysteryLabelEl = document.getElementById("hud-mystery-label");
  const mysteryPillEl = document.getElementById("hud-mystery-pill");

  if (state.dayNumber >= 6 || state.grandFinale) {
    if (mysteryLogoEl) {
      mysteryLogoEl.classList.remove("hud-mystery-blurred");
      mysteryLogoEl.classList.add("hud-mystery-revealed");
    }
    if (mysteryLabelEl) mysteryLabelEl.textContent = "CTRL+";
    if (mysteryPillEl) mysteryPillEl.title = "المشروع السري تم كشفه: CTRL+";
  } else {
    if (mysteryLogoEl) {
      mysteryLogoEl.classList.add("hud-mystery-blurred");
      mysteryLogoEl.classList.remove("hud-mystery-revealed");
    }
    if (mysteryLabelEl) mysteryLabelEl.textContent = "مشروع سري ؟";
    if (mysteryPillEl) mysteryPillEl.title = "المشروع السري (هيفتح في اليوم السادس)";
  }

  renderCipherSlots();
}

function displayVictory(victoryMsg) {
  isModalActive = false;
  const modal = document.getElementById("challenge-modal");
  if (modal) modal.classList.add("hidden");

  state.completed = true;
  state.victoryMessage = victoryMsg;

  const msgEl = document.getElementById("victory-server-message");
  if (msgEl) msgEl.textContent = victoryMsg;

  const dateEl = document.getElementById("victory-date-display");
  if (dateEl) dateEl.textContent = getGameDateString();

  const xpEl = document.getElementById("victory-xp-display");
  if (xpEl) xpEl.textContent = `⚡ ${state.totalXp} نقطة خبرة`;

  const trophyBadge = document.getElementById("victory-trophy-badge");
  const cardElement = document.getElementById("victory-card-element");
  const farewellText = document.getElementById("victory-farewell-subtext");

  if (trophyBadge && cardElement && farewellText) {
    if (state.grandFinale) {
      trophyBadge.textContent = "🏆 بطل التحدي النهائي الكبير 🏆";
      cardElement.classList.add("grand-finale-card");
      farewellText.textContent = "يا فنان! عديت الـ 5 عوالم كلهم وكشفت الشفرة الكبيرة!";
    } else {
      trophyBadge.textContent = `🏆 كشفت حرف النهاردة يا بطل! 🏆`;
      cardElement.classList.remove("grand-finale-card");
      farewellText.textContent = `استنانا بكره عشان تفتح اليوم رقم ${state.dayNumber + 1}!`;
    }
  }

  // رسم خانات الحروف في بطاقة الفوز
  const tilesContainer = document.getElementById("victory-cipher-slots");
  if (tilesContainer) {
    tilesContainer.innerHTML = "";
    for (let i = 0; i < 5; i++) {
      const tile = document.createElement("div");
      tile.className = "victory-tile";
      if (state.collectedLetters && i < state.collectedLetters.length) {
        tile.classList.add("unlocked");
        tile.textContent = state.collectedLetters[i];
      } else {
        tile.textContent = "؟";
      }
      tilesContainer.appendChild(tile);
    }
  }

  showScreen("victory-screen");
  audio.playVictory();
  startConfetti();
}

// التحقق من استئناف الجلسة
async function checkResumeState() {
  const todayStr = getGameDateString();
  const gateTodayDate = document.getElementById("gate-today-date");
  if (gateTodayDate) gateTodayDate.textContent = todayStr;

  if (!state.token) {
    showScreen("name-gate");
    return;
  }

  try {
    const data = await apiRequest("/state/resume", {
      method: "POST",
      body: JSON.stringify({ state_token: state.token }),
    });

    if (!data) return;

    if (data.expired) {
      localStorage.removeItem("collecting_a_word_token");
      state.token = null;
      showScreen("name-gate");
      return;
    }

    state.playerName = data.player_name;
    state.dayNumber = data.day_number;
    state.dayName = data.day_name || "بداية المغامرة والتحدي";
    state.requiredItems = data.required_items || 3;
    state.requiredEnemies = data.required_enemies || 5;
    state.itemLabel = data.item_label || "قطع الطاقة";
    state.todaysLetter = data.todays_letter;
    state.collectedLetters = data.collected_letters || [];
    state.totalXp = data.total_xp || 0;
    state.coins = data.coins || 0;
    state.enemiesDefeated = data.enemies_defeated || 0;
    state.dailyLetterUnlocked = data.daily_letter_unlocked;
    state.completed = data.completed;
    state.grandFinale = data.grand_finale;

    const gateBadge = document.getElementById("gate-day-badge");
    if (gateBadge) gateBadge.textContent = `اليوم ${state.dayNumber}: ${state.dayName}`;

    if ((data.completed || data.grand_finale) && data.victory_message) {
      displayVictory(data.victory_message);
    } else {
      updateHUD();
      showScreen("game-screen");
      initCanvasGame();
    }
  } catch (err) {
    console.error("فشل استئناف الجلسة:", err);
    localStorage.removeItem("collecting_a_word_token");
    state.token = null;
    showScreen("name-gate");
  }
}

// بدء لعبة جديدة
async function handleStartNewGame(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("player-name-input");
  const errorEl = document.getElementById("name-error-msg");
  const submitBtn = document.getElementById("btn-start-game");
  const name = input ? input.value.trim() : "";

  if (errorEl) {
    errorEl.classList.add("hidden");
    errorEl.textContent = "";
  }

  if (!name) {
    if (errorEl) {
      errorEl.textContent = "لازم تكتب اسم البطل الأول!";
      errorEl.classList.remove("hidden");
    }
    if (input) input.focus();
    return;
  }

  const originalBtnContent = submitBtn ? submitBtn.innerHTML : "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>جاري الدخول...</span>";
  }

  try {
    const data = await apiRequest("/new-game", {
      method: "POST",
      body: JSON.stringify({ player_name: name }),
    });

    if (!data) return;

    state.token = data.state_token;
    localStorage.setItem("collecting_a_word_token", data.state_token);
    state.playerName = name;
    state.dayNumber = data.day_number;
    state.dayName = data.day_name;
    state.requiredItems = data.required_items;
    state.requiredEnemies = data.required_enemies;
    state.itemLabel = data.item_label;
    state.todaysLetter = data.todays_letter;
    state.collectedLetters = data.collected_letters || [];
    state.totalXp = data.total_xp || 0;
    state.coins = data.coins || 0;
    state.enemiesDefeated = data.enemies_defeated || 0;
    state.dailyLetterUnlocked = data.daily_letter_unlocked;
    state.grandFinale = data.grand_finale;
    state.completed = false;

    updateHUD();
    showScreen("game-screen");
    initCanvasGame();
  } catch (err) {
    console.error("خطأ في بدء اللعبة:", err);
    if (errorEl) {
      errorEl.textContent = err.message || "حصلت مشكلة في بدء اللعبة الجديدة.";
      errorEl.classList.remove("hidden");
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnContent;
    }
  }
}

// جمع القطع من الخادم بشكل موثوق
let collectingInProgress = new Set();

async function collectItemOnServer(itemId) {
  if (!state.token || collectingInProgress.has(itemId)) return;
  collectingInProgress.add(itemId);

  try {
    const data = await apiRequest("/collect-coin", {
      method: "POST",
      body: JSON.stringify({ state_token: state.token, coin_id: itemId }),
    });

    if (!data) return;

    state.token = data.state_token;
    localStorage.setItem("collecting_a_word_token", data.state_token);
    state.coins = data.coins;
    state.totalXp = data.total_xp;

    audio.playCoin();
    updateHUD();
  } catch (err) {
    console.error("خطأ أثناء جمع القطعة:", err);
  } finally {
    collectingInProgress.delete(itemId);
  }
}

// هزيمة الأعداء من الخادم بشكل موثوق
let enemyDefeatInProgress = new Set();

async function defeatEnemyOnServer(enemyId) {
  if (!state.token || enemyDefeatInProgress.has(enemyId)) return;
  enemyDefeatInProgress.add(enemyId);

  try {
    const data = await apiRequest("/defeat-enemy", {
      method: "POST",
      body: JSON.stringify({ state_token: state.token, enemy_id: enemyId }),
    });

    if (!data) return;

    state.token = data.state_token;
    localStorage.setItem("collecting_a_word_token", data.state_token);
    state.enemiesDefeated = data.enemies_defeated;
    state.totalXp = data.total_xp;

    audio.playEnemyHit();
    updateHUD();
  } catch (err) {
    console.error("خطأ أثناء هزيمة العدو:", err);
  } finally {
    enemyDefeatInProgress.delete(enemyId);
  }
}

// فتح نافذة اللغز اليومي
async function handleOpenChallenge() {
  if (!state.token || isModalActive) return;
  isModalActive = true;

  const modal = document.getElementById("challenge-modal");
  const promptEl = document.getElementById("challenge-prompt");
  const answerInput = document.getElementById("challenge-answer-input");
  const feedbackEl = document.getElementById("challenge-feedback");
  const badgeEl = document.getElementById("modal-riddle-badge");
  const submitBtn = document.getElementById("btn-submit-answer");

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "ابعت الإجابة";
  }
  if (badgeEl) badgeEl.textContent = `🔮 اليوم ${state.dayNumber} — ${state.dayName}`;
  if (promptEl) promptEl.textContent = "بنجهّزلك اللغز ثانية واحدة...";
  if (answerInput) answerInput.value = "";
  if (feedbackEl) feedbackEl.className = "feedback-banner hidden";

  if (modal) modal.classList.remove("hidden");

  try {
    const data = await apiRequest(`/challenge/next?state_token=${encodeURIComponent(state.token)}`);
    if (!data) return;

    state.currentChallengeId = data.challenge_id;
    if (promptEl) promptEl.textContent = data.prompt;
    if (answerInput) answerInput.focus();
  } catch (err) {
    if (promptEl) promptEl.textContent = "اللغز معلق ثواني.. جرب تاني كمان شوية!";
  }
}

function handleCloseChallenge() {
  isModalActive = false;
  shrineCooldown = 120; // فترة تهدئة لمنع الفتح التلقائي
  const modal = document.getElementById("challenge-modal");
  if (modal) modal.classList.add("hidden");

  if (isPlatformer) {
    player.x = shrine.x - 70;
    player.vx = 0;
  } else {
    player.y = shrine.y + shrine.radius + player.size + 15;
    player.targetY = player.y;
  }
}

// إرسال إجابة اللغز
async function handleSubmitAnswer(e) {
  e.preventDefault();
  if (!state.token || !state.currentChallengeId) return;

  const answerInput = document.getElementById("challenge-answer-input");
  const feedbackEl = document.getElementById("challenge-feedback");
  const submitBtn = document.getElementById("btn-submit-answer");
  const answer = answerInput ? answerInput.value.trim() : "";

  if (!answer) return;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "بنشوف الإجابة...";
  }
  if (feedbackEl) feedbackEl.className = "feedback-banner hidden";

  try {
    const data = await apiRequest("/challenge/verify", {
      method: "POST",
      body: JSON.stringify({
        state_token: state.token,
        challenge_id: state.currentChallengeId,
        answer: answer,
      }),
    });

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "ابعت الإجابة";
    }

    if (!data) return;

    state.token = data.state_token;
    localStorage.setItem("collecting_a_word_token", data.state_token);
    state.collectedLetters = data.collected_letters || [];
    state.totalXp = data.total_xp;
    state.coins = data.coins;
    state.enemiesDefeated = data.enemies_defeated;
    state.dailyLetterUnlocked = data.daily_letter_unlocked;
    state.completed = data.completed;
    state.grandFinale = data.grand_finale;

    if (data.correct) {
      audio.playCorrect();
      if (feedbackEl) {
        feedbackEl.textContent = `✨ الله عليك يا وحش! إجابة صح وجبت الحرف السري! (+100 نقطة خبرة)`;
        feedbackEl.className = "feedback-banner success";
      }
      updateHUD();

      if (isPlatformer) {
        player.x = shrine.x;
        player.vx = 0;
      } else {
        player.y = shrine.y + shrine.radius + player.size + 30;
        player.targetY = player.y;
      }

      setTimeout(() => {
        handleCloseChallenge();
        if ((data.completed || data.grand_finale) && data.victory_message) {
          displayVictory(data.victory_message);
        }
      }, 1000);
    } else {
      audio.playWrong();
      if (feedbackEl) {
        feedbackEl.textContent = "❌ لا مش هي.. فكّر كدا وروّق وجرّب تاني!";
        feedbackEl.className = "feedback-banner error";
      }
      if (answerInput) answerInput.select();
    }
  } catch (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "ابعت الإجابة";
    }
    if (feedbackEl) {
      feedbackEl.textContent = err.message || "حصلت مشكلة في التحقق من الإجابة.";
      feedbackEl.className = "feedback-banner error";
    }
  }
}

// ==========================================
// محرك ساحة اللعب ثنائية الأبعاد (Canvas 2D)
// ==========================================
let canvas, ctx;
let isPlatformer = false;
let cameraX = 0;
let platforms = [];

let player = {
  x: 300,
  y: 200,
  vy: 0,
  isGrounded: false,
  size: 22,
  speed: 4.5,
  targetX: 300,
  targetY: 200,
  facing: "right",
  walkFrame: 0,
};

let spells = [];
let enemies = [];
let items = [];
let hazards = [];
let particles = [];
let shrine = { x: 300, y: 180, radius: 45, angle: 0 };
let keys = {};
let gameLoopRunning = false;
let spawnTimer = 0;
let coinPopups = [];
let coyoteTimer = 0;
let isRunning = false;
const LEVEL_WIDTH_DAY2 = 4800;

// ==========================================
// 🏎️ متغيرات وثوابت سباق الطريق السريع العمودي (Day 3 Vertical Highway Racer)
// ==========================================
let isRacing = false;
let highwayScrollY = 0;
const RACE_TOTAL_DISTANCE = 2500; // 2500 متر حتى خط النهاية
let raceDistanceTraveled = 0;

// ==========================================
// 📱 متغيرات غزاة الهاتف (Day 4 Phone Invaders)
// ==========================================
let isInvaders = false;
let invadersShip = null;
let invadersBugs = [];
let invadersFirewalls = [];
let invadersProjectiles = [];
let invadersPowerups = [];
let invadersParticles = [];
let invadersScore = 0;
let invadersBoss = null;
let invadersWave = 1;
let invadersGameActive = false;
let invadersBgY = 0;

// ==========================================
// 🐍 متغيرات لعبة الثعبان (Day 5 Snake Game)
// ==========================================
let isSnake = false;
let snakeBody = [];
let snakeDir = { x: 1, y: 0 };
let snakeNextDir = { x: 1, y: 0 };
let snakeFood = { x: 5, y: 5 };
let snakeScore = 0;
let snakeTargetScore = 10;
let snakeGridCols = 20;
let snakeGridRows = 15;
let snakeCellSize = 20;
let snakeMoveTimer = 0;
let snakeMoveInterval = 10;
let snakeFinished = false;

// ==========================================
// 🏃‍♂️🚇 متغيرات لعبة صب واي سرفرز (Day 6 Subway Surfers Runner)
// ==========================================
let isSubway = false;
let subwayPlayerLane = 1; // 0=Left, 1=Center, 2=Right
let subwayPlayerX = 0;
let subwayPlayerY = 0;
let subwayJumpY = 0;
let subwayJumpVy = 0;
let subwayIsJumping = false;
let subwaySlideTimer = 0;
let subwayScrollY = 0;
const SUBWAY_TOTAL_DISTANCE = 2500;
let subwayDistance = 0;
let subwaySpeed = 7.0;
let subwayCoins = [];
let subwayObstacles = [];
let subwayTrains = [];
let subwayFinished = false;




let playerCar = null;
let marioCar = null;
let trafficCars = [];
let boostPads = [];
let racingCoins = [];
let racingObstacles = [];
let raceFinished = false;
let marioSpeech = { text: "Let's-a Go! 🍄", timer: 140 };
let raceStandings = [];
let racingPointer = { active: false, x: 0, y: 0 };
let finishLineY = -9999;
let speedLines = [];
let lightningBtnRect = { x: 0, y: 0, w: 56, h: 56 };
let roadsideObjects = [];

function initCanvasGame() {
  canvas = document.getElementById("game-canvas");
  if (!canvas) return;
  ctx = canvas.getContext("2d");

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const logicalW = canvas.width / window.devicePixelRatio;
  const logicalH = canvas.height / window.devicePixelRatio;

  setupDayArena(logicalW, logicalH);

  if (!gameLoopRunning) {
    gameLoopRunning = true;
    requestAnimationFrame(gameLoop);
  }
}

function setupDayArena(w, h) {
  items = [];
  enemies = [];
  hazards = [];
  spells = [];
  platforms = [];
  cameraX = 0;
  cameraY = 0;

  const day = state.dayNumber;
  isPlatformer = (day === 2);
  isRacing = (day === 3);
  isInvaders = (day === 4);
  isSnake = (day === 5);
  isSubway = (day === 6);

  if (isSubway) {
    setupSubwayGame(w, h);
  } else if (isSnake) {
    setupSnakeGame(w, h);
  } else if (isInvaders) {
    setupInvadersGame(w, h);
  } else if (isRacing) {
    setupRacingTrack(w, h);
  } else if (isPlatformer) {
    // === MARIO-STYLE PLATFORMER LEVEL (Day 2) ===
    const lw = LEVEL_WIDTH_DAY2;
    coinPopups = [];
    coyoteTimer = 0;
    isRunning = false;
    playerDeadTimer = 0;

    const groundY = h - 50;
    const groundH = 50;

    // === Ground Segments (with gaps/pits between them) ===
    const groundSegs = [
      { x: 0, w: 1050 },
      { x: 1130, w: 750 },
      { x: 1980, w: 950 },
      { x: 3030, w: 850 },
      { x: 3980, w: 820 },
    ];
    groundSegs.forEach(seg => {
      platforms.push({ x: seg.x, y: groundY, w: seg.w, h: groundH, type: 'ground' });
    });

    // === Brick Platforms (floating brick rows) ===
    const brickRows = [
      { x: 320, y: h - 180, count: 4 },
      { x: 640, y: h - 180, count: 1 },
      { x: 1250, y: h - 240, count: 5 },
      { x: 1600, y: h - 180, count: 3 },
      { x: 2100, y: h - 260, count: 4 },
      { x: 2550, y: h - 180, count: 6 },
      { x: 3150, y: h - 240, count: 3 },
      { x: 3500, y: h - 180, count: 4 },
    ];
    brickRows.forEach(row => {
      for (let i = 0; i < row.count; i++) {
        platforms.push({ x: row.x + i * 32, y: row.y, w: 32, h: 32, type: 'brick' });
      }
    });

    // === ? Question Blocks (give coins when hit from below) ===
    const qBlocks = [
      { x: 256, y: h - 180 },
      { x: 480, y: h - 180 },
      { x: 384, y: h - 308 },
      { x: 1410, y: h - 240 },
      { x: 2050, y: h - 180 },
      { x: 2228, y: h - 260 },
      { x: 3246, y: h - 240 },
      { x: 3400, y: h - 180 },
    ];
    qBlocks.forEach((qb, idx) => {
      platforms.push({
        x: qb.x, y: qb.y, w: 32, h: 32,
        type: 'question', used: false, bounceTimer: 0,
        coinId: `qblock_coin_${idx + 1}`
      });
    });

    // === Pipes (green Mario pipes as obstacles) ===
    const pipeData = [
      { x: 880, ph: 64 },
      { x: 1750, ph: 96 },
      { x: 2850, ph: 64 },
      { x: 3800, ph: 80 },
    ];
    pipeData.forEach(pd => {
      platforms.push({
        x: pd.x, y: groundY - pd.ph, w: 64, h: pd.ph, type: 'pipe'
      });
    });

    // === Staircase (ascending before flagpole) ===
    for (let step = 0; step < 5; step++) {
      const stepH = (step + 1) * 32;
      platforms.push({
        x: 4300 + step * 32, y: groundY - stepH, w: 32, h: stepH, type: 'staircase'
      });
    }

    // === Player Start Position ===
    player.x = 80;
    player.y = h - 120;
    player.targetX = player.x;
    player.targetY = player.y;
    player.vy = 0;
    player.vx = 0;
    player.isGrounded = false;
    player.facing = "right";

    // === Castle / Shrine Position (at castle entrance) ===
    shrine.x = 4670;
    shrine.y = groundY - 28;
    shrine.radius = 45;

    // === Floating Coins ===
    const coinPositions = [
      { x: 350, y: h - 220 }, { x: 700, y: h - 250 },
      { x: 1000, y: h - 130 }, { x: 1350, y: h - 280 },
      { x: 1650, y: h - 220 }, { x: 2000, y: h - 290 },
      { x: 2300, y: h - 200 }, { x: 2700, y: h - 130 },
      { x: 3100, y: h - 280 }, { x: 3550, y: h - 220 },
    ];
    coinPositions.forEach((cp, idx) => {
      items.push({
        id: `item_${idx + 1}`,
        x: cp.x, y: cp.y,
        radius: 14,
        floatOffset: Math.random() * Math.PI * 2,
        vx: 0, vy: 0, collected: false, day: day
      });
    });

    // === Goomba Enemies ===
    const enemyPositions = [480, 750, 1300, 1650, 1700, 2400, 2650, 3250, 3600];
    enemyPositions.forEach((ex, idx) => {
      enemies.push({
        id: `enemy_${idx + 1}`,
        x: ex,
        y: groundY - 18,
        size: 18,
        vx: (idx % 2 === 0 ? 1 : -1) * 1.2,
        vy: 0,
        health: 1,
        defeated: false,
        day: day
      });
    });

  } else {
    // نظام الساحة المفتوحة (Top-down Arena) لباقي الأيام
    player.x = w / 2;
    player.y = h / 2 + 60;
    player.targetX = player.x;
    player.targetY = player.y;
    player.facing = "down";

    shrine.x = w / 2;
    shrine.y = h / 2 - 40;

    const itemCount = state.requiredItems + 3;
    for (let i = 1; i <= itemCount; i++) {
      spawnItem(w, h, `item_${Date.now()}_${i}`, day);
    }

    const enemyCount = Math.min(8, state.requiredEnemies);
    for (let i = 1; i <= enemyCount; i++) {
      spawnEnemy(w, h, `enemy_${Date.now()}_${i}`, day);
    }

    if (day >= 3) {
      hazards.push({ x: w * 0.25, y: h * 0.4, radius: 35, vx: 1.5, vy: 1, color: "#dc2626" });
      hazards.push({ x: w * 0.75, y: h * 0.6, radius: 35, vx: -1.2, vy: -1.4, color: "#dc2626" });
    }
  }
}

function spawnItem(w, h, id, day) {
  const pad = 50;
  items.push({
    id: id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    x: pad + Math.random() * (w - pad * 2),
    y: pad + Math.random() * (h - pad * 2),
    radius: 14,
    floatOffset: Math.random() * Math.PI * 2,
    vx: day === 2 ? (Math.random() - 0.5) * 3 : 0,
    vy: day === 2 ? (Math.random() - 0.5) * 3 : 0,
    collected: false,
    day: day,
  });
}

function spawnEnemy(w, h, id, day) {
  const pad = 60;
  enemies.push({
    id: id || `enemy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    x: pad + Math.random() * (w - pad * 2),
    y: pad + Math.random() * (h - pad * 2),
    size: 18,
    vx: (Math.random() - 0.5) * (1.5 + day * 0.4),
    vy: (Math.random() - 0.5) * (1.5 + day * 0.4),
    health: 1,
    defeated: false,
    day: day,
  });
}

function castSpell(targetX, targetY) {
  audio.playSpell();
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = 7.5;

  spells.push({
    x: player.x,
    y: player.y - 8,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    radius: 7,
    life: 50,
  });
}

function createBurstParticles(x, y, color = "#ffbe02") {
  for (let i = 0; i < 14; i++) {
    const angle = (Math.PI * 2 / 14) * i;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 3,
      color,
      alpha: 1,
      decay: 0.04,
    });
  }
}

function gameLoop() {
  if (!canvas || !ctx) return;
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;

  ctx.clearRect(0, 0, w, h);

  if (isSubway) {
    updateSubwaySimulation(w, h);
    drawSubwayTheme(w, h);
  } else if (isSnake) {
    updateSnakeSimulation(w, h);
    drawSnakeTheme(w, h);
  } else if (isInvaders) {
    updateInvadersSimulation(w, h);
    drawInvadersTheme(w, h);
  } else if (isRacing) {
    updateRacingSimulation(w, h);
    drawRacingTheme(w, h);
  } else if (isPlatformer) {
    // Update camera
    cameraX = player.x - w / 2;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > LEVEL_WIDTH_DAY2 - w) cameraX = LEVEL_WIDTH_DAY2 - w;

    // Background (parallax, no camera offset)
    drawPlatformerTheme(w, h);

    // World elements (with camera offset)
    ctx.save();
    ctx.translate(-cameraX, 0);

    drawMarioPlatforms();
    drawMarioFlagpole(h - 50);
    drawMarioCastle(h - 50);
    updateItems(w, h);
    updateCoinPopups();
    updateEnemies(w, h);
    updateSpells(w, h);
    updatePlayerPlatformer(w, h);
    updateParticles();

    ctx.restore();
  } else {
    drawArenaTheme(w, h);
    drawShrine();
    updateHazards(w, h);
    updateItems(w, h);
    updateEnemies(w, h);
    updateSpells(w, h);
    updatePlayer(w, h);
    updateParticles();
  }

  requestAnimationFrame(gameLoop);
}

// ==========================================
// 🏃‍♂️🚇 محاكي صب واي سرفرز (Day 6 Subway Surfers Runner)
// ==========================================

function setupSubwayGame(w, h) {
  subwayPlayerLane = 1; // 0=Left, 1=Center, 2=Right
  subwayPlayerX = w / 2;
  subwayPlayerY = h - 120;
  subwayJumpY = 0;
  subwayJumpVy = 0;
  subwayIsJumping = false;
  subwaySlideTimer = 0;
  subwayScrollY = 0;
  subwayDistance = 0;
  subwaySpeed = 7.5;
  subwaySpeed = 3.5;
  subwayFinished = false;

  subwayCoins = [];
  subwayObstacles = [];
  subwayTrains = [];

  // Generate initial subway track entities
  for (let i = 0; i < 8; i++) {
    spawnSubwayEntities(w, h, -200 - i * 300);
  }
}

function spawnSubwayEntities(w, h, spawnY) {
  const laneW = Math.min(w * 0.75, 340) / 3;
  const trackLeft = (w - laneW * 3) / 2;
  const lane = Math.floor(Math.random() * 3);
  const laneX = trackLeft + laneW * (lane + 0.5);

  const rand = Math.random();
  if (rand < 0.4) {
    // String of 3 coins
    for (let c = 0; c < 3; c++) {
      subwayCoins.push({
        id: `subway_coin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${c}`,
        lane: lane,
        x: laneX,
        y: spawnY + c * 40,
        radius: 12,
        collected: false
      });
    }
  } else if (rand < 0.75) {
    // Low Barrier (Must Jump over) or High Sign (Must Slide under)
    const type = Math.random() > 0.5 ? "barrier_low" : "barrier_high";
    subwayObstacles.push({
      lane: lane,
      x: laneX,
      y: spawnY,
      w: laneW * 0.75,
      h: type === "barrier_low" ? 30 : 45,
      type: type
    });
  } else {
    // Train Car oncoming down the lane!
    subwayTrains.push({
      lane: lane,
      x: laneX,
      y: spawnY,
      w: laneW * 0.82,
      h: 110,
      color: "#dc2626"
    });
  }
}

function updateSubwaySimulation(w, h) {
  if (subwayFinished) return;

  const laneW = Math.min(w * 0.75, 340) / 3;
  const trackLeft = (w - laneW * 3) / 2;

  // Lane switching (Keyboard & D-pad)
  if (keys["ArrowLeft"] || keys["KeyA"] || keys["dpad_left"]) {
    if (subwayPlayerLane > 0 && !keys._laneLock) {
      subwayPlayerLane--;
      keys._laneLock = true;
      audio.playDrift();
    }
  } else if (keys["ArrowRight"] || keys["KeyD"] || keys["dpad_right"]) {
    if (subwayPlayerLane < 2 && !keys._laneLock) {
      subwayPlayerLane++;
      keys._laneLock = true;
      audio.playDrift();
    }
  } else {
    keys._laneLock = false;
  }

  // Smooth position interpolation to target lane X
  const targetX = trackLeft + laneW * (subwayPlayerLane + 0.5);
  subwayPlayerX += (targetX - subwayPlayerX) * 0.25;

  // Jump physics (Up, W, Space)
  const jumpTriggered = keys["ArrowUp"] || keys["KeyW"] || keys["Space"] || keys["dpad_up"];
  if (jumpTriggered && !subwayIsJumping && subwaySlideTimer <= 0) {
    subwayIsJumping = true;
    subwayJumpVy = -13;
    audio.playJump();
  }

  if (subwayIsJumping) {
    subwayJumpY += subwayJumpVy;
    subwayJumpVy += 0.8; // Gravity
    if (subwayJumpY >= 0) {
      subwayJumpY = 0;
      subwayJumpVy = 0;
      subwayIsJumping = false;
    }
  }

  // Slide physics (Down, S)
  const slideTriggered = keys["ArrowDown"] || keys["KeyS"] || keys["dpad_down"];
  if (slideTriggered && subwaySlideTimer <= 0 && !subwayIsJumping) {
    subwaySlideTimer = 22;
  }
  if (subwaySlideTimer > 0) subwaySlideTimer--;

  // Dynamic speed based on distance: start slow (3.5) and increase with progress up to 8.5
  subwaySpeed = 3.5 + Math.min(5.0, (subwayDistance / SUBWAY_TOTAL_DISTANCE) * 5.0);

  // Update distance
  subwayScrollY += subwaySpeed;
  subwayDistance += subwaySpeed * 0.5;

  // Finish Line / Station Check at 2500m
  if (subwayDistance >= SUBWAY_TOTAL_DISTANCE && !subwayFinished) {
    subwayFinished = true;
    audio.playVictory();
    startConfetti();
    updateHUD();
    setTimeout(() => {
      handleOpenChallenge();
    }, 1000);
  }

  // Move Coins
  subwayCoins.forEach(coin => {
    coin.y += subwaySpeed;
    if (!coin.collected && coin.lane === subwayPlayerLane) {
      if (Math.abs(coin.y - (subwayPlayerY + subwayJumpY)) < 30) {
        coin.collected = true;
        state.coins++;
        collectItemOnServer(coin.id);
        createBurstParticles(coin.x, coin.y, "#ffbe02");
        audio.playCoin();
      }
    }
  });
  subwayCoins = subwayCoins.filter(c => c.y < h + 100);

  // Move Obstacles & Collisions
  subwayObstacles.forEach(obs => {
    obs.y += subwaySpeed;
    if (obs.lane === subwayPlayerLane && Math.abs(obs.y - subwayPlayerY) < 35) {
      let hit = false;
      if (obs.type === "barrier_low") {
        if (subwayJumpY > -20) hit = true;
      } else if (obs.type === "barrier_high") {
        if (subwaySlideTimer <= 0) hit = true;
      }
      if (hit) {
        audio.playBump();
        createBurstParticles(subwayPlayerX, subwayPlayerY, "#ef4444");
        subwayDistance = Math.max(0, subwayDistance - 150);
        obs.y = h + 200;
      }
    }
  });
  subwayObstacles = subwayObstacles.filter(o => o.y < h + 100);

  // Move Trains & Collisions
  subwayTrains.forEach(tr => {
    tr.y += subwaySpeed * 1.25;
    if (tr.lane === subwayPlayerLane && Math.abs(tr.y - subwayPlayerY) < 50) {
      audio.playBump();
      createBurstParticles(subwayPlayerX, subwayPlayerY, "#ef4444");
      subwayDistance = Math.max(0, subwayDistance - 200);
      tr.y = h + 300;
    }
  });
  subwayTrains = subwayTrains.filter(t => t.y < h + 200);

  // Spawn new subway entities
  if (Math.random() < 0.05) {
    spawnSubwayEntities(w, h, -150);
  }
}

function drawSubwayTheme(w, h) {
  const laneW = Math.min(w * 0.75, 340) / 3;
  const trackLeft = (w - laneW * 3) / 2;
  const trackRight = trackLeft + laneW * 3;

  // 1. Dark Subway Tunnel Background
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, w, h);

  // Tunnel Walls (Left/Right)
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, trackLeft, h);
  ctx.fillRect(trackRight, 0, w - trackRight, h);

  // Tunnel Lights on Walls
  ctx.fillStyle = "#fde047";
  const lightScroll = (subwayScrollY * 0.8) % 100;
  for (let ly = -100 + lightScroll; ly < h + 100; ly += 100) {
    ctx.beginPath(); ctx.arc(trackLeft - 10, ly, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(trackRight + 10, ly, 6, 0, Math.PI * 2); ctx.fill();
  }

  // 2. 3 Steel Train Tracks & Wooden Ties
  for (let i = 0; i < 3; i++) {
    const lx = trackLeft + laneW * i;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(lx + 4, 0, laneW - 8, h);

    ctx.fillStyle = "#475569";
    const tieScroll = subwayScrollY % 30;
    for (let ty = -30 + tieScroll; ty < h + 30; ty += 30) {
      ctx.fillRect(lx + 8, ty, laneW - 16, 6);
    }

    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(lx + 12, 0, 4, h);
    ctx.fillRect(lx + laneW - 16, 0, 4, h);
  }

  // Yellow warning borders
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(trackLeft, 0); ctx.lineTo(trackLeft, h);
  ctx.moveTo(trackRight, 0); ctx.lineTo(trackRight, h);
  ctx.stroke();

  // 3. Draw Coins
  subwayCoins.forEach(coin => {
    if (coin.collected) return;
    ctx.save();
    ctx.translate(coin.x, coin.y);
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.arc(0, 0, coin.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#eab308";
    ctx.beginPath(); ctx.arc(0, 0, coin.radius - 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

  // 4. Draw Obstacles
  subwayObstacles.forEach(obs => {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    if (obs.type === "barrier_low") {
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-obs.w / 2 + 10, -obs.h / 2, 12, obs.h);
      ctx.fillRect(obs.w / 2 - 22, -obs.h / 2, 12, obs.h);
    } else {
      ctx.fillStyle = "#eab308";
      ctx.fillRect(-obs.w / 2, -obs.h / 2, obs.w, 16);
      ctx.fillStyle = "#000000";
      ctx.fillRect(-obs.w / 4, -obs.h / 2, 12, 16);
      ctx.fillRect(obs.w / 4 - 12, -obs.h / 2, 12, 16);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(-obs.w / 2, -obs.h / 2, 6, obs.h);
      ctx.fillRect(obs.w / 2 - 6, -obs.h / 2, 6, obs.h);
    }
    ctx.restore();
  });

  // 5. Draw Oncoming Red Metro Trains
  subwayTrains.forEach(tr => {
    ctx.save();
    ctx.translate(tr.x, tr.y);

    ctx.fillStyle = tr.color;
    ctx.beginPath();
    ctx.roundRect(-tr.w / 2, -tr.h / 2, tr.w, tr.h, 12);
    ctx.fill();

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-tr.w / 2 + 6, -tr.h / 2 + 12, tr.w - 12, 28);

    ctx.fillStyle = "#fef08a";
    ctx.beginPath(); ctx.arc(-tr.w / 2 + 10, tr.h / 2 - 16, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tr.w / 2 - 10, tr.h / 2 - 16, 8, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  });

  // 6. Draw Player Character
  const drawY = subwayPlayerY + subwayJumpY;

  ctx.save();
  ctx.translate(subwayPlayerX, drawY);

  if (subwayJumpY < 0) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, -subwayJumpY + 15, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (subwaySlideTimer > 0) {
    ctx.scale(1.2, 0.5);
  }

  if (playerImgBack.complete && playerImgBack.naturalWidth > 0) {
    const aspect = playerImgBack.naturalWidth / playerImgBack.naturalHeight;
    const drawH = 70;
    const drawW = drawH * aspect;
    ctx.drawImage(playerImgBack, -drawW / 2, -drawH + 10, drawW, drawH);
  } else {
    ctx.fillStyle = "#1134a8";
    ctx.beginPath(); ctx.arc(0, -15, 16, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // 7. On-Screen Distance Progress HUD
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px Cairo, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`🏃‍♂️ المسافة: ${Math.floor(subwayDistance)}م / ${SUBWAY_TOTAL_DISTANCE}م`, 15, 30);
  ctx.textAlign = "right";
  ctx.fillText(`🪙 عملات المترو: ${state.coins}`, w - 15, 30);

  updateParticles();
}

// ==========================================
// 🐍 محاكي لعبة الثعبان (Day 5 Snake Game)
// ==========================================

function setupSnakeGame(w, h) {
  snakeGridCols = 20;
  snakeGridRows = 15;
  snakeCellSize = Math.floor(Math.min(w / snakeGridCols, (h - 40) / snakeGridRows));
  if (snakeCellSize < 16) snakeCellSize = 16;

  const startX = Math.floor(snakeGridCols / 2);
  const startY = Math.floor(snakeGridRows / 2);

  snakeBody = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY }
  ];

  snakeDir = { x: 1, y: 0 };
  snakeNextDir = { x: 1, y: 0 };
  snakeScore = 0;
  snakeTargetScore = 10;
  snakeMoveTimer = 0;
  snakeMoveInterval = 10;
  snakeFinished = false;

  spawnSnakeFood();
}

function spawnSnakeFood() {
  let valid = false;
  let attempts = 0;
  while (!valid && attempts < 100) {
    attempts++;
    const fx = Math.floor(Math.random() * snakeGridCols);
    const fy = Math.floor(Math.random() * snakeGridRows);
    const inBody = snakeBody.some(seg => seg.x === fx && seg.y === fy);
    if (!inBody) {
      snakeFood = { x: fx, y: fy };
      valid = true;
    }
  }
}

function updateSnakeSimulation(w, h) {
  if (snakeFinished) return;

  // Handle steering inputs
  let dirX = 0;
  let dirY = 0;
  if (keys["ArrowLeft"] || keys["KeyA"] || keys["dpad_left"]) { dirX = -1; dirY = 0; }
  else if (keys["ArrowRight"] || keys["KeyD"] || keys["dpad_right"]) { dirX = 1; dirY = 0; }
  else if (keys["ArrowUp"] || keys["KeyW"] || keys["dpad_up"]) { dirX = 0; dirY = -1; }
  else if (keys["ArrowDown"] || keys["KeyS"] || keys["dpad_down"]) { dirX = 0; dirY = 1; }

  if (dirX !== 0 || dirY !== 0) {
    // Prevent 180-degree immediate reversal
    if (dirX !== -snakeDir.x || dirY !== -snakeDir.y) {
      snakeNextDir = { x: dirX, y: dirY };
    }
  }

  snakeMoveTimer++;
  if (snakeMoveTimer >= snakeMoveInterval) {
    snakeMoveTimer = 0;
    snakeDir = { ...snakeNextDir };

    const head = snakeBody[0];
    const newHead = {
      x: head.x + snakeDir.x,
      y: head.y + snakeDir.y
    };

    // Check Wall Collision -> Reset snake position
    if (newHead.x < 0 || newHead.x >= snakeGridCols || newHead.y < 0 || newHead.y >= snakeGridRows) {
      audio.playBump();
      createBurstParticles(
        (head.x + 0.5) * snakeCellSize + (w - snakeGridCols * snakeCellSize) / 2,
        (head.y + 0.5) * snakeCellSize + (h - snakeGridRows * snakeCellSize) / 2 + 20,
        "#ef4444"
      );
      const midX = Math.floor(snakeGridCols / 2);
      const midY = Math.floor(snakeGridRows / 2);
      snakeBody = [{ x: midX, y: midY }, { x: midX - 1, y: midY }, { x: midX - 2, y: midY }];
      snakeDir = { x: 1, y: 0 };
      snakeNextDir = { x: 1, y: 0 };
      return;
    }

    // Check Self Collision
    const selfHit = snakeBody.some(seg => seg.x === newHead.x && seg.y === newHead.y);
    if (selfHit) {
      audio.playBump();
      createBurstParticles(
        (head.x + 0.5) * snakeCellSize + (w - snakeGridCols * snakeCellSize) / 2,
        (head.y + 0.5) * snakeCellSize + (h - snakeGridRows * snakeCellSize) / 2 + 20,
        "#ef4444"
      );
      const midX = Math.floor(snakeGridCols / 2);
      const midY = Math.floor(snakeGridRows / 2);
      snakeBody = [{ x: midX, y: midY }, { x: midX - 1, y: midY }, { x: midX - 2, y: midY }];
      snakeDir = { x: 1, y: 0 };
      snakeNextDir = { x: 1, y: 0 };
      return;
    }

    snakeBody.unshift(newHead);

    // Check Food Collision
    if (newHead.x === snakeFood.x && newHead.y === snakeFood.y) {
      snakeScore++;
      state.coins = snakeScore;
      audio.playCoin();

      const screenX = (newHead.x + 0.5) * snakeCellSize + (w - snakeGridCols * snakeCellSize) / 2;
      const screenY = (newHead.y + 0.5) * snakeCellSize + (h - snakeGridRows * snakeCellSize) / 2 + 20;
      createBurstParticles(screenX, screenY, "#22c55e");
      collectItemOnServer(`snake_apple_${snakeScore}`);

      if (snakeScore >= snakeTargetScore && !snakeFinished) {
        snakeFinished = true;
        audio.playVictory();
        startConfetti();
        updateHUD();
        setTimeout(() => {
          handleOpenChallenge();
        }, 800);
      } else {
        spawnSnakeFood();
      }
    } else {
      snakeBody.pop();
    }
  }
}

function drawSnakeTheme(w, h) {
  // 1. Arcade Background
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, w, h);

  const gridW = snakeGridCols * snakeCellSize;
  const gridH = snakeGridRows * snakeCellSize;
  const offsetX = (w - gridW) / 2;
  const offsetY = (h - gridH) / 2 + 15;

  // Grid Background Box
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(offsetX, offsetY, gridW, gridH);

  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  for (let r = 0; r <= snakeGridRows; r++) {
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + r * snakeCellSize);
    ctx.lineTo(offsetX + gridW, offsetY + r * snakeCellSize);
    ctx.stroke();
  }
  for (let c = 0; c <= snakeGridCols; c++) {
    ctx.beginPath();
    ctx.moveTo(offsetX + c * snakeCellSize, offsetY);
    ctx.lineTo(offsetX + c * snakeCellSize, offsetY + gridH);
    ctx.stroke();
  }

  // Border glow
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 3;
  ctx.strokeRect(offsetX - 2, offsetY - 2, gridW + 4, gridH + 4);

  // 2. Draw Apple / Food
  const fx = offsetX + snakeFood.x * snakeCellSize + snakeCellSize / 2;
  const fy = offsetY + snakeFood.y * snakeCellSize + snakeCellSize / 2;
  const foodRadius = snakeCellSize * 0.42;

  // Apple glow
  ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
  ctx.beginPath();
  ctx.arc(fx, fy, foodRadius + 4, 0, Math.PI * 2);
  ctx.fill();

  // Apple body
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(fx, fy, foodRadius, 0, Math.PI * 2);
  ctx.fill();

  // Leaf
  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.ellipse(fx + 2, fy - foodRadius, 4, 2, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // 3. Draw Snake Body
  snakeBody.forEach((seg, idx) => {
    const sx = offsetX + seg.x * snakeCellSize;
    const sy = offsetY + seg.y * snakeCellSize;
    const isHead = idx === 0;

    if (isHead) {
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.roundRect(sx + 1, sy + 1, snakeCellSize - 2, snakeCellSize - 2, 6);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      let eye1X = sx + snakeCellSize / 2;
      let eye1Y = sy + snakeCellSize / 2;
      let eye2X = eye1X;
      let eye2Y = eye1Y;

      if (snakeDir.x === 1) { // Right
        eye1X = sx + snakeCellSize - 6; eye1Y = sy + 5;
        eye2X = sx + snakeCellSize - 6; eye2Y = sy + snakeCellSize - 5;
      } else if (snakeDir.x === -1) { // Left
        eye1X = sx + 6; eye1Y = sy + 5;
        eye2X = sx + 6; eye2Y = sy + snakeCellSize - 5;
      } else if (snakeDir.y === -1) { // Up
        eye1X = sx + 5; eye1Y = sy + 6;
        eye2X = sx + snakeCellSize - 5; eye2Y = sy + 6;
      } else { // Down
        eye1X = sx + 5; eye1Y = sy + snakeCellSize - 6;
        eye2X = sx + snakeCellSize - 5; eye2Y = sy + snakeCellSize - 6;
      }

      ctx.beginPath(); ctx.arc(eye1X, eye1Y, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eye2X, eye2Y, 2.5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#000000";
      ctx.beginPath(); ctx.arc(eye1X, eye1Y, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eye2X, eye2Y, 1.2, 0, Math.PI * 2); ctx.fill();
    } else {
      const alpha = Math.max(0.4, 1 - (idx / snakeBody.length) * 0.5);
      ctx.fillStyle = `rgba(52, 211, 153, ${alpha})`;
      ctx.beginPath();
      ctx.roundRect(sx + 2, sy + 2, snakeCellSize - 4, snakeCellSize - 4, 4);
      ctx.fill();
    }
  });

  // 4. Header HUD on Canvas
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px Cairo, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`🐍 تفاح الطاقة: ${snakeScore} / ${snakeTargetScore}`, offsetX, offsetY - 10);

  ctx.textAlign = "right";
  ctx.fillText(snakeFinished ? "🏆 تم الوصول للهدف!" : "🎮 استمتع باللعبة!", offsetX + gridW, offsetY - 10);

  updateParticles();
}

// ==========================================
// 📱 محاكي غزاة الهاتف (Day 4 Phone Invaders)
// ==========================================

function setupInvadersGame(w, h) {
  invadersGameActive = true;
  invadersScore = 0;
  invadersWave = 1;
  invadersBgY = 0;

  // سفينة اللاعب (مضاد فيروسات)
  invadersShip = {
    x: w / 2,
    y: h - 80,
    w: 40,
    h: 40,
    vx: 0,
    speed: 6,
    color: "#10b981", // أخضر مضاد فيروسات
    cooldown: 0,
    health: 3
  };

  invadersBugs = [];
  invadersFirewalls = [];
  invadersProjectiles = [];
  invadersPowerups = [];
  invadersParticles = [];

  // جدران الحماية (Firewalls)
  for (let i = 0; i < 3; i++) {
    invadersFirewalls.push({
      x: (w / 4) * (i + 1),
      y: h - 160,
      w: 60,
      h: 20,
      health: 10
    });
  }

  spawnInvadersWave(w, h);
}

function spawnInvadersWave(w, h) {
  invadersBugs = [];
  const rows = 3 + Math.floor(invadersWave / 2);
  const cols = 5 + Math.floor(invadersWave / 3);
  const spacingX = 45;
  const spacingY = 40;
  const startX = (w - (cols * spacingX)) / 2 + 20;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      invadersBugs.push({
        x: startX + c * spacingX,
        y: 60 + r * spacingY,
        w: 24,
        h: 24,
        type: r === 0 ? "malware" : "bug",
        hp: r === 0 ? 2 : 1,
        color: r === 0 ? "#ef4444" : "#eab308",
        baseX: startX + c * spacingX,
        time: Math.random() * 100
      });
    }
  }
}

function updateInvadersSimulation(w, h) {
  if (!invadersGameActive || !invadersShip) return;

  invadersBgY = (invadersBgY + 0.5) % 40;

  // تحكم السفينة
  let steer = 0;
  if (keys["ArrowLeft"] || keys["KeyA"]) steer -= 1;
  if (keys["ArrowRight"] || keys["KeyD"]) steer += 1;
  
  // اللمس
  if (racingPointer.active) {
    if (racingPointer.x < invadersShip.x - 10) steer = -1;
    if (racingPointer.x > invadersShip.x + 10) steer = 1;
  }

  invadersShip.x += steer * invadersShip.speed;
  invadersShip.x = Math.max(30, Math.min(w - 30, invadersShip.x));

  // إطلاق النار
  if (invadersShip.cooldown > 0) invadersShip.cooldown--;
  const isShooting = keys["Space"] || keys["ArrowUp"] || keys["KeyW"] || (racingPointer.active && Math.abs(steer) < 0.5);
  if (isShooting && invadersShip.cooldown <= 0) {
    invadersProjectiles.push({
      x: invadersShip.x,
      y: invadersShip.y - 20,
      vy: -10,
      isPlayer: true,
      color: "#34d399"
    });
    invadersShip.cooldown = 15;
    audio.playSpell();
  }

  // تحديث المقذوفات
  invadersProjectiles.forEach(p => {
    p.y += p.vy;
  });
  invadersProjectiles = invadersProjectiles.filter(p => p.y > -20 && p.y < h + 20);

  // تحديث الحشرات الغازية
  let hitEdge = false;
  invadersBugs.forEach(bug => {
    bug.time += 0.05;
    bug.x = bug.baseX + Math.sin(bug.time) * 30; // حركة تموجية
    
    // إطلاق النار من الحشرات
    if (Math.random() < 0.002 + (invadersWave * 0.0005)) {
      invadersProjectiles.push({
        x: bug.x,
        y: bug.y + 15,
        vy: 4 + (invadersWave * 0.5),
        isPlayer: false,
        color: "#f87171"
      });
    }
  });

  // التصادمات
  invadersProjectiles.forEach(p => {
    if (p.isPlayer) {
      // مقذوف اللاعب يضرب حشرة
      invadersBugs.forEach(bug => {
        if (!p.dead && Math.abs(p.x - bug.x) < 15 && Math.abs(p.y - bug.y) < 15) {
          p.dead = true;
          bug.hp--;
          if (bug.hp <= 0) {
            bug.dead = true;
            createBurstParticles(bug.x, bug.y, bug.color);
            audio.playEnemyHit();
            invadersScore += (bug.type === "malware" ? 20 : 10);
            
            // إسقاط Powerup
            if (Math.random() < 0.1) {
              invadersPowerups.push({
                x: bug.x,
                y: bug.y,
                vy: 2,
                type: "data"
              });
            }
          }
        }
      });
    } else {
      // مقذوف العدو يضرب السفينة
      if (!p.dead && Math.abs(p.x - invadersShip.x) < 20 && Math.abs(p.y - invadersShip.y) < 20) {
        p.dead = true;
        invadersShip.health--;
        createBurstParticles(invadersShip.x, invadersShip.y, "#ef4444");
        audio.playBump();
        if (invadersShip.health <= 0) {
          // رسوب
          setupInvadersGame(w, h); // إعادة تعيين
        }
      }
    }
    
    // المقذوفات تضرب جدران الحماية
    invadersFirewalls.forEach(fw => {
      if (!p.dead && p.x > fw.x - fw.w/2 && p.x < fw.x + fw.w/2 && p.y > fw.y - fw.h/2 && p.y < fw.y + fw.h/2) {
        p.dead = true;
        fw.health--;
        createBurstParticles(p.x, p.y, "#60a5fa");
      }
    });
  });

  invadersProjectiles = invadersProjectiles.filter(p => !p.dead);
  invadersBugs = invadersBugs.filter(b => !b.dead);
  invadersFirewalls = invadersFirewalls.filter(fw => fw.health > 0);

  // تحديث Powerups
  invadersPowerups.forEach(pu => {
    pu.y += pu.vy;
    if (Math.abs(pu.x - invadersShip.x) < 25 && Math.abs(pu.y - invadersShip.y) < 25) {
      pu.collected = true;
      state.coins++; // بيانات مسترجعة
      audio.playCoin();
      createBurstParticles(pu.x, pu.y, "#60a5fa");
    }
  });
  invadersPowerups = invadersPowerups.filter(pu => !pu.collected && pu.y < h + 20);

  // إنهاء الموجة
  if (invadersBugs.length === 0) {
    invadersWave++;
    if (invadersWave > 3) {
      // الفوز باللعبة المصغرة
      if (!state.completed) {
        audio.playVictory();
        startConfetti();
        updateHUD();
        handleOpenChallenge();
      }
    } else {
      spawnInvadersWave(w, h);
    }
  }
}

function drawInvadersTheme(w, h) {
  // خلفية شاشة الهاتف
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, w, h);
  
  // شريط علوي (Status Bar)
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, w, 24);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("5G  100%", 10, 16);
  ctx.textAlign = "right";
  ctx.fillText("12:00", w - 10, 16);

  // شبكة خلفية متحركة
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  for (let y = invadersBgY; y < h; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }

  // رسم جدران الحماية (Firewalls)
  invadersFirewalls.forEach(fw => {
    ctx.fillStyle = `rgba(56, 189, 248, ${fw.health / 10})`;
    ctx.fillRect(fw.x - fw.w/2, fw.y - fw.h/2, fw.w, fw.h);
    ctx.strokeStyle = "#0284c7";
    ctx.strokeRect(fw.x - fw.w/2, fw.y - fw.h/2, fw.w, fw.h);
  });

  // رسم المقذوفات
  invadersProjectiles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 6, 4, 12);
  });

  // رسم Powerups
  invadersPowerups.forEach(pu => {
    ctx.fillStyle = "#60a5fa";
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // رسم الحشرات (Malware/Bugs)
  invadersBugs.forEach(bug => {
    ctx.save();
    ctx.translate(bug.x, bug.y);
    ctx.fillStyle = bug.color;
    // شكل بكسلي للحشرة
    ctx.fillRect(-10, -5, 20, 10);
    ctx.fillRect(-5, -10, 10, 20);
    ctx.fillStyle = "#000";
    ctx.fillRect(-6, -2, 4, 4); // عين
    ctx.fillRect(2, -2, 4, 4);  // عين
    ctx.restore();
  });

  // رسم السفينة (Antivirus)
  if (invadersShip) {
    ctx.save();
    ctx.translate(invadersShip.x, invadersShip.y);
    ctx.fillStyle = invadersShip.color;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(15, 15);
    ctx.lineTo(-15, 15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#047857";
    ctx.fillRect(-5, 5, 10, 10);
    ctx.restore();
  }

  // رسم واجهة المستخدم
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Cairo, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`البيانات: ${state.coins}`, 10, h - 10);
  ctx.textAlign = "right";
  ctx.fillText(`الصحة: ${invadersShip ? invadersShip.health : 0} | موجة: ${invadersWave}/3`, w - 10, h - 10);
  
  updateParticles();
}

/// ==========================================
// 🏎️ محاكي سباق الطريق السريع العمودي (Vertical Highway Racing Simulation)
// ==========================================
function setupRacingTrack(w, h) {
  highwayScrollY = 0;
  raceDistanceTraveled = 0;
  raceFinished = false;
  marioSpeech = { text: "Let's-a Go! 🍄", timer: 140 };
  finishLineY = -9999;
  speedLines = [];
  roadsideObjects = [];

  const roadW = Math.min(w * 0.82, 380);
  const roadLeft = (w - roadW) / 2;
  const laneW = roadW / 4;

  // سيارة البطل (السيارة الزرقاء بخطين برتقاليين - مثل الصورة تماماً)
  playerCar = {
    x: roadLeft + laneW * 1.5, // الحارة الثانية من اليسار
    y: h - 130,
    w: 36,
    h: 70,
    vx: 0,
    speed: 7.2,
    baseSpeed: 7.2,
    maxSpeed: 10.5,
    boostSpeed: 16.0,
    tilt: 0,
    nitro: 100,
    nitroActive: false,
    boostTimer: 0,
    spinTimer: 0,
    name: state.playerName || "البطل",
    color: "#1d4ed8",
    stripeColor: "#f97316",
    isPlayer: true
  };

  // سيارة ماريو الرسمية (المنافس الرئيسي)
  marioCar = {
    x: roadLeft + laneW * 2.5, // الحارة الثالثة
    y: -80, // يبدأ أمام اللاعب
    w: 36,
    h: 70,
    lane: 2,
    speed: 6.9,
    targetLane: 2,
    laneChangeTimer: 70,
    boostTimer: 0,
    spinTimer: 0,
    name: "ماريو (MARIO)",
    color: "#dc2626",
    isMario: true
  };

  // سيارات حركة المرور والمنافسين (بما فيها السيارة الوردية من الصورة)
  trafficCars = [
    {
      x: roadLeft + laneW * 2.5,
      y: -280,
      w: 36,
      h: 68,
      lane: 2,
      speed: 4.8,
      color: "#c026d3", // Magenta / Pink sports car from reference image!
      name: "سيارة وردية",
      type: "magenta"
    },
    {
      x: roadLeft + laneW * 0.5,
      y: -580,
      w: 36,
      h: 68,
      lane: 0,
      speed: 5.2,
      color: "#16a34a", // Green sports car
      name: "سيارة خضراء",
      type: "green"
    },
    {
      x: roadLeft + laneW * 3.5,
      y: -900,
      w: 36,
      h: 68,
      lane: 3,
      speed: 4.5,
      color: "#eab308", // Yellow sports car
      name: "سيارة صفراء",
      type: "yellow"
    },
    {
      x: roadLeft + laneW * 1.5,
      y: -1250,
      w: 36,
      h: 68,
      lane: 1,
      speed: 5.0,
      color: "#9333ea", // Purple sports car
      name: "سيارة بنفسجية",
      type: "purple"
    }
  ];

  // عناصر الطريق المبدئية
  racingCoins = [];
  boostPads = [];
  racingObstacles = [];

  for (let i = 0; i < 7; i++) {
    spawnHighwayEntities(w, h, -250 - i * 350);
  }

  // أشجار وعلامات الطريق الجانبية
  for (let i = 0; i < 12; i++) {
    roadsideObjects.push({
      side: i % 2 === 0 ? "left" : "right",
      y: -i * 180,
      type: i % 3 === 0 ? "lamp" : "tree"
    });
  }
}

function spawnHighwayEntities(w, h, spawnY) {
  const roadW = Math.min(w * 0.82, 380);
  const roadLeft = (w - roadW) / 2;
  const laneW = roadW / 4;
  const randomLane = Math.floor(Math.random() * 4);
  const laneCenterX = roadLeft + laneW * (randomLane + 0.5);

  const randType = Math.random();
  if (randType < 0.45) {
    // 3 عملات ذهبية متتالية في الحارة
    for (let c = 0; c < 3; c++) {
      racingCoins.push({
        id: `coin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${c}`,
        x: laneCenterX,
        y: spawnY + c * 45,
        radius: 12,
        rot: Math.random() * Math.PI,
        collected: false
      });
    }
  } else if (randType < 0.72) {
    // منصة تيربو (Boost Pad)
    boostPads.push({
      x: laneCenterX,
      y: spawnY,
      w: 34,
      h: 48
    });
  } else if (randType < 0.90) {
    // عائق (زيت أو مخروط)
    racingObstacles.push({
      x: laneCenterX,
      y: spawnY,
      type: Math.random() > 0.5 ? 'oil' : 'cone'
    });
  }
}

function updateRacingSimulation(w, h) {
  if (!playerCar) return;

  const roadW = Math.min(w * 0.82, 380);
  const roadLeft = (w - roadW) / 2;
  const roadRight = roadLeft + roadW;
  const laneW = roadW / 4;

  // 1. تحكم البطل السلس في التوجيه الأفقي
  let steer = 0;
  if (keys["ArrowLeft"] || keys["KeyA"] || keys["dpad_left"]) steer -= 1;
  if (keys["ArrowRight"] || keys["KeyD"] || keys["dpad_right"]) steer += 1;

  if (racingPointer.active) {
    const targetX = Math.max(roadLeft + 25, Math.min(roadRight - 25, racingPointer.x));
    const dx = targetX - playerCar.x;
    if (Math.abs(dx) > 5) {
      steer = Math.sign(dx) * Math.min(1, Math.abs(dx) / 25);
    }
  }

  // حركة أفقية ناعمة مع انسيابية وميلان السيارة
  playerCar.vx = playerCar.vx * 0.80 + steer * 6.8 * 0.20;
  playerCar.x += playerCar.vx;
  playerCar.tilt = playerCar.vx * 0.045; // زاوية ميلان واقعية عند تغيير الحارات

  // حدود الطريق الأسفلتي
  if (playerCar.x < roadLeft + 22) {
    playerCar.x = roadLeft + 22;
    playerCar.vx = 0;
  }
  if (playerCar.x > roadRight - 22) {
    playerCar.x = roadRight - 22;
    playerCar.vx = 0;
  }

  // 2. التحكم في السرعة ودواسة البنزين والتيربو
  const isGas = keys["ArrowUp"] || keys["KeyW"] || keys["dpad_up"];
  const isBrake = keys["ArrowDown"] || keys["KeyS"] || keys["dpad_down"];
  const isNitro = keys["Space"] || keys["ShiftLeft"] || keys["ShiftRight"] || keys["KeyN"] || playerCar.nitroActive;

  let targetSpeed = playerCar.baseSpeed;
  if (isGas) targetSpeed = playerCar.maxSpeed;
  if (isBrake) targetSpeed = 4.2;
  if (playerCar.boostTimer > 0) targetSpeed = playerCar.boostSpeed;

  // تفعيل النيترو
  if (isNitro && playerCar.nitro > 5) {
    playerCar.boostTimer = Math.max(playerCar.boostTimer, 25);
    playerCar.nitro = Math.max(0, playerCar.nitro - 0.75);
    if (Math.random() < 0.25) audio.playBoost();
  }

  // شحن النيترو التلقائي المستمر
  if (playerCar.nitro < 100) {
    playerCar.nitro = Math.min(100, playerCar.nitro + 0.35);
  }

  // انتقال ناعم للسرعة
  playerCar.speed = playerCar.speed * 0.93 + targetSpeed * 0.07;
  if (playerCar.boostTimer > 0) playerCar.boostTimer--;

  // عقوبة بسيطة عند لمس العائق
  if (playerCar.spinTimer > 0) {
    playerCar.spinTimer--;
    playerCar.speed *= 0.95;
  }

  const currentSpeed = playerCar.speed;
  highwayScrollY += currentSpeed;
  raceDistanceTraveled += currentSpeed * 0.45; // مسافة السباق المقطوعة بالمتر

  // الوصول لخط النهاية عند 2500 متر
  if (raceDistanceTraveled >= RACE_TOTAL_DISTANCE && finishLineY === -9999) {
    finishLineY = -140; // ظهور خط النهاية من أعلى الشاشة
  }

  // خط النهاية ينزل مع حركة الطريق
  if (finishLineY > -9000) {
    finishLineY += currentSpeed;
    if (finishLineY >= playerCar.y && !raceFinished) {
      raceFinished = true;
      audio.playVictory();
      startConfetti();
      updateHUD();
      setTimeout(() => {
        handleOpenChallenge();
      }, 1200);
    }
  }

  // 3. تحديث ذكاء ماريو (Mario Rival AI)
  if (marioCar) {
    const marioRelSpeed = currentSpeed - marioCar.speed;
    marioCar.y += marioRelSpeed;

    // ماريو يغير حاراته بذكاء ويتسابق
    marioCar.laneChangeTimer--;
    if (marioCar.laneChangeTimer <= 0) {
      marioCar.laneChangeTimer = 80 + Math.floor(Math.random() * 80);
      const possibleLanes = [0, 1, 2, 3].filter(l => l !== marioCar.lane);
      marioCar.targetLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
    }

    const targetMarioX = roadLeft + laneW * (marioCar.targetLane + 0.5);
    marioCar.x += (targetMarioX - marioCar.x) * 0.08;

    // ماريو يزيد سرعته إذا تقدم عليه البطل
    if (marioCar.y > playerCar.y + 100) {
      marioCar.speed = 7.6; // يلحق باللاعب
    } else if (marioCar.y < -150) {
      marioCar.speed = 6.4; // ينتظر اللاعب
    } else {
      marioCar.speed = 6.9;
    }

    // فقاعة كلام ماريو التنافسية
    if (marioSpeech.timer > 0) {
      marioSpeech.timer--;
    } else {
      if (marioCar.y < playerCar.y && Math.abs(marioCar.y - playerCar.y) < 250) {
        marioSpeech = { text: "Wahoo! Haha! 🏎️", timer: 120 };
      } else if (playerCar.y < marioCar.y && Math.abs(playerCar.y - marioCar.y) < 250) {
        marioSpeech = { text: "Mamma Mia! 💨", timer: 120 };
      }
    }
  }

  // 4. تحديث حركة المرور والسيارات المنافسة (بما فيها السيارة الوردية)
  trafficCars.forEach(tc => {
    const relSpeed = currentSpeed - tc.speed;
    tc.y += relSpeed;

    // إعادة ظهور السيارة من الأعلى عند تجاوزها
    if (tc.y > h + 150) {
      tc.y = -220 - Math.random() * 350;
      tc.lane = Math.floor(Math.random() * 4);
      tc.x = roadLeft + laneW * (tc.lane + 0.5);
      tc.speed = 4.5 + Math.random() * 1.5;
    }
  });

  // 5. اصطدام البطل بالسيارات الأخرى (دفع لطيف وآمن)
  const allOpponents = [marioCar, ...trafficCars].filter(Boolean);
  allOpponents.forEach(car => {
    if (Math.abs(playerCar.x - car.x) < 32 && Math.abs(playerCar.y - car.y) < 55) {
      const dx = playerCar.x - car.x;
      playerCar.x += (dx >= 0 ? 1 : -1) * 8;
      car.x -= (dx >= 0 ? 1 : -1) * 6;
      playerCar.speed = Math.max(4.0, playerCar.speed * 0.88);
      audio.playBump();
      createBurstParticles((playerCar.x + car.x) / 2, (playerCar.y + car.y) / 2, "#ffd043");

      if (car.isMario) {
        marioSpeech = { text: "Mamma Mia! 💥", timer: 100 };
      }
    }
  });

  // 6. جمع العملات
  racingCoins.forEach(coin => {
    coin.y += currentSpeed;
    coin.rot += 0.08;
    if (!coin.collected && Math.hypot(playerCar.x - coin.x, playerCar.y - coin.y) < 28) {
      coin.collected = true;
      collectItemOnServer(coin.id);
      createBurstParticles(coin.x, coin.y, "#ffbe02");
      audio.playCoin();
    }
  });

  // حذف العملات التي خرجت من الشاشة وتوليد جديد
  racingCoins = racingCoins.filter(c => c.y < h + 100);

  // 7. منصات التيربو (Boost Pads)
  boostPads.forEach(bp => {
    bp.y += currentSpeed;
    if (Math.hypot(playerCar.x - bp.x, playerCar.y - bp.y) < 36 && playerCar.boostTimer <= 0) {
      playerCar.boostTimer = 45;
      audio.playBoost();
      createBurstParticles(bp.x, bp.y, "#06b6d4");
    }
  });
  boostPads = boostPads.filter(bp => bp.y < h + 100);

  // 8. العوائق
  racingObstacles.forEach(obs => {
    obs.y += currentSpeed;
    if (Math.hypot(playerCar.x - obs.x, playerCar.y - obs.y) < 26 && playerCar.spinTimer <= 0) {
      playerCar.spinTimer = 16;
      playerCar.speed *= 0.65;
      audio.playBump();
      createBurstParticles(obs.x, obs.y, "#334155");
    }
  });
  racingObstacles = racingObstacles.filter(o => o.y < h + 100);

  // توليد عناصر جديدة على الطريق باستمرار قبل الوصول للنهاية
  if (finishLineY === -9999 && Math.random() < 0.04) {
    spawnHighwayEntities(w, h, -180);
  }

  // 9. خطوط السرعة والتيربو (Speed Lines)
  if (playerCar.boostTimer > 0 || isGas) {
    if (Math.random() < 0.6) {
      speedLines.push({
        x: Math.random() * w,
        y: -20,
        len: 40 + Math.random() * 60,
        speed: currentSpeed * 1.6,
        color: playerCar.boostTimer > 0 ? "rgba(6, 182, 212, 0.8)" : "rgba(255, 255, 255, 0.4)"
      });
    }
  }
  speedLines.forEach(sl => { sl.y += sl.speed; });
  speedLines = speedLines.filter(sl => sl.y < h + 100);

  // 10. الأشجار والأعمدة الجانبية
  roadsideObjects.forEach(ro => {
    ro.y += currentSpeed * 0.9;
    if (ro.y > h + 100) {
      ro.y = -100 - Math.random() * 150;
      ro.type = Math.random() > 0.5 ? "tree" : "lamp";
    }
  });
}

function drawRacingTheme(w, h) {
  // 1. رسم الطريق السريع والعشب والخطوط (مطابق للصورة)
  drawHighwayRoad(w, h);

  // 2. العناصر الجانبية
  drawRoadsideObjects(w, h);

  // 3. منصات التيربو والعملات والعوائق
  drawBoostPadsVertical(w, h);
  drawCoinsVertical(w, h);
  drawObstaclesVertical(w, h);

  // 4. خط النهاية
  if (finishLineY > -500) {
    drawFinishLineBanner(w, h);
  }

  // 5. سيارات حركة المرور (بما فيها الوردية)
  trafficCars.forEach(car => drawTrafficCarVertical(car));

  // 6. سيارة ماريو
  if (marioCar) drawMarioCarVertical(marioCar);

  // 7. سيارة البطل (الزرقاء بالخطين البرتقاليين)
  if (playerCar) drawPlayerCarVertical(playerCar);

  // 8. جزيئات وخطوط السرعة
  drawSpeedLines(w, h);
  updateParticles();

  // 9. زر البرق والتيربو الأبيض أسفل اليمين (مطابق للصورة)
  drawLightningButton(w, h);

  // 10. واجهة شريط المسافة والسرعة
  drawVerticalRacingHUD(w, h);
}

function drawHighwayRoad(w, h) {
  const roadW = Math.min(w * 0.82, 380);
  const roadLeft = (w - roadW) / 2;
  const roadRight = roadLeft + roadW;
  const laneW = roadW / 4;

  // 1. عشب أخضر على الجانبين مع نمط القص العمودي
  ctx.fillStyle = "#388e3c";
  ctx.fillRect(0, 0, roadLeft, h);
  ctx.fillRect(roadRight, 0, w - roadRight, h);

  // خطوط قص العشب المتحركة
  ctx.fillStyle = "#2e7d32";
  const grassScroll = (highwayScrollY * 0.8) % 80;
  for (let gy = -80 + grassScroll; gy < h + 80; gy += 80) {
    ctx.fillRect(0, gy, roadLeft, 40);
    ctx.fillRect(roadRight, gy, w - roadRight, 40);
  }

  // حواف العشب الطبيعية
  ctx.fillStyle = "#1b5e20";
  ctx.fillRect(roadLeft - 4, 0, 4, h);
  ctx.fillRect(roadRight, 0, 4, h);

  // 2. أكتاف الطريق الإسفلتية المنسوجة (Shoulders)
  ctx.fillStyle = "#181e26";
  ctx.fillRect(roadLeft, 0, roadW, h);

  // سطح الأسفلت الرئيسي الأسود الحبيبي
  ctx.fillStyle = "#222831";
  ctx.fillRect(roadLeft + 6, 0, roadW - 12, h);

  // 3. الخطوط البيضاء الصلبة على حافتي الطريق (مطابقة للصورة)
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(roadLeft + 8, 0);
  ctx.lineTo(roadLeft + 8, h);
  ctx.moveTo(roadRight - 8, 0);
  ctx.lineTo(roadRight - 8, h);
  ctx.stroke();

  // 4. الخط الأصفر الفاصل في منتصف الطريق تماماً (مطابق للصورة)
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(roadLeft + roadW / 2, 0);
  ctx.lineTo(roadLeft + roadW / 2, h);
  ctx.stroke();

  // خط أصفر ذهبي ناصع في المنتصف
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(roadLeft + roadW / 2, 0);
  ctx.lineTo(roadLeft + roadW / 2, h);
  ctx.stroke();

  // 5. الخطوط البيضاء المتقطعة لتقسيم الحارات الـ 4 (مطابقة للصورة)
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3.5;
  const dashLen = 32;
  const dashGap = 28;
  const dashCycle = dashLen + dashGap;
  const dashScroll = highwayScrollY % dashCycle;

  ctx.setLineDash([dashLen, dashGap]);
  ctx.lineDashOffset = -dashScroll;

  // الخط الفاصل بين الحارة 0 و 1 (اليسار)
  ctx.beginPath();
  ctx.moveTo(roadLeft + laneW, -50);
  ctx.lineTo(roadLeft + laneW, h + 50);
  ctx.stroke();

  // الخط الفاصل بين الحارة 2 و 3 (اليمين)
  ctx.beginPath();
  ctx.moveTo(roadLeft + laneW * 3, -50);
  ctx.lineTo(roadLeft + laneW * 3, h + 50);
  ctx.stroke();

  ctx.setLineDash([]);
}

function drawRoadsideObjects(w, h) {
  const roadW = Math.min(w * 0.82, 380);
  const roadLeft = (w - roadW) / 2;
  const roadRight = roadLeft + roadW;

  roadsideObjects.forEach(ro => {
    const rx = ro.side === "left" ? roadLeft - 24 : roadRight + 24;
    ctx.save();
    ctx.translate(rx, ro.y);
    if (ro.type === "tree") {
      // شجرة كرتونية جانبية
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(2, 4, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(-2, -3, 10, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // عمود إضاءة
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(-2, -8, 4, 16);
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(ro.side === "left" ? 5 : -5, -8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawBoostPadsVertical(w, h) {
  boostPads.forEach(bp => {
    ctx.save();
    ctx.translate(bp.x, bp.y);

    // توهج نيون
    ctx.fillStyle = "rgba(6, 182, 212, 0.25)";
    ctx.beginPath();
    ctx.roundRect(-bp.w / 2 - 4, -bp.h / 2 - 4, bp.w + 8, bp.h + 8, 6);
    ctx.fill();

    // خلفية الداعم
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.beginPath();
    ctx.roundRect(-bp.w / 2, -bp.h / 2, bp.w, bp.h, 4);
    ctx.fill();
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // أسهم التيربو الثلاثية للأعلى ▲ ▲ ▲
    const glowColor = (Date.now() % 400 < 200) ? "#38bdf8" : "#facc15";
    ctx.fillStyle = glowColor;
    for (let i = 0; i < 3; i++) {
      const cy = -bp.h / 2 + 10 + i * 14;
      ctx.beginPath();
      ctx.moveTo(0, cy - 6);
      ctx.lineTo(10, cy + 3);
      ctx.lineTo(6, cy + 3);
      ctx.lineTo(0, cy - 2);
      ctx.lineTo(-6, cy + 3);
      ctx.lineTo(-10, cy + 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawCoinsVertical(w, h) {
  racingCoins.forEach(coin => {
    if (coin.collected) return;
    ctx.save();
    ctx.translate(coin.x, coin.y);

    const scaleX = Math.cos(coin.rot);

    // توهج العملة الذهبية
    ctx.fillStyle = "rgba(255, 190, 2, 0.35)";
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    // جسم العملة
    ctx.scale(scaleX, 1);
    ctx.fillStyle = "#eab308";
    ctx.beginPath();
    ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(0, 0, coin.radius - 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ca8a04";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("★", 0, 3.5);

    ctx.restore();
  });
}

function drawObstaclesVertical(w, h) {
  racingObstacles.forEach(obs => {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    if (obs.type === 'oil') {
      // بقعة زيت لماعة
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 10, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
      ctx.beginPath();
      ctx.ellipse(-3, -2, 8, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // مخروط مروري برتقالي مخطط بالأبيض
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(0, 8, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ea580c";
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(10, 8);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-5, -2, 10, 4);
    }
    ctx.restore();
  });
}

function drawFinishLineBanner(w, h) {
  const roadW = Math.min(w * 0.82, 380);
  const roadLeft = (w - roadW) / 2;

  ctx.save();
  ctx.translate(roadLeft, finishLineY);

  // خط النهاية الشطرنجي عبر الحارات الـ 4
  const sqSize = 14;
  const cols = Math.floor(roadW / sqSize);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#ffffff" : "#0f172a";
      ctx.fillRect(col * sqSize, row * sqSize, sqSize, sqSize);
    }
  }

  // لافتة خط النهاية العلوية
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.roundRect(roadW / 2 - 90, -32, 180, 26, 6);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px Cairo, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🏁 FINISH — خط النهاية 🏁", roadW / 2, -14);

  ctx.restore();
}

function drawPlayerCarVertical(car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.tilt || 0);

  // 1. ظل السيارة الناعم
  ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
  ctx.beginPath();
  ctx.roundRect(-car.w / 2 + 2, -car.h / 2 + 4, car.w, car.h, 10);
  ctx.fill();

  // 2. الكفرات الجانبية الأربعة
  ctx.fillStyle = "#090d16";
  const wheels = [
    { x: -car.w / 2 - 2, y: -car.h / 2 + 14 },
    { x: car.w / 2 - 2, y: -car.h / 2 + 14 },
    { x: -car.w / 2 - 2, y: car.h / 2 - 22 },
    { x: car.w / 2 - 2, y: car.h / 2 - 22 }
  ];
  wheels.forEach(wh => {
    ctx.fillRect(wh.x, wh.y, 4, 14);
  });

  // 3. هيكل السيارة الرياضية الأزرق الأنيق (مطابق للصورة بدقة)
  const bodyGrad = ctx.createLinearGradient(-car.w / 2, 0, car.w / 2, 0);
  bodyGrad.addColorStop(0, "#1d4ed8");
  bodyGrad.addColorStop(0.5, "#3b82f6");
  bodyGrad.addColorStop(1, "#1d4ed8");

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, [14, 14, 10, 10]);
  ctx.fill();

  ctx.strokeStyle = "#1e40af";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 4. الخطان البرتقاليان التوأم في المنتصف (Dual Orange Racing Stripes - مثل الصورة)
  ctx.fillStyle = "#ea580c";
  ctx.fillRect(-5, -car.h / 2 + 2, 4, car.h - 4);
  ctx.fillRect(1, -car.h / 2 + 2, 4, car.h - 4);

  // 5. الزجاج الأمامي المنحني والمظلل
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.roundRect(-car.w / 2 + 5, -car.h / 2 + 18, car.w - 10, 13, [5, 5, 2, 2]);
  ctx.fill();

  // انعكاس الضوء على الزجاج
  ctx.fillStyle = "rgba(56, 189, 248, 0.5)";
  ctx.beginPath();
  ctx.moveTo(-car.w / 2 + 8, -car.h / 2 + 20);
  ctx.lineTo(-car.w / 2 + 16, -car.h / 2 + 20);
  ctx.lineTo(-car.w / 2 + 10, -car.h / 2 + 28);
  ctx.closePath();
  ctx.fill();

  // 6. الزجاج الخلفي المنحني
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.roundRect(-car.w / 2 + 6, car.h / 2 - 24, car.w - 12, 10, [2, 2, 4, 4]);
  ctx.fill();

  // 7. الأضواء الأمامية البيضاء الساطعة
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(-car.w / 2 + 5, -car.h / 2 + 5, 3.5, 5, -0.2, 0, Math.PI * 2);
  ctx.ellipse(car.w / 2 - 5, -car.h / 2 + 5, 3.5, 5, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 8. المرايا الجانبية
  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(-car.w / 2 - 3, -car.h / 2 + 20, 3, 6);
  ctx.fillRect(car.w / 2, -car.h / 2 + 20, 3, 6);

  // 9. الأضواء الخلفية الحمراء
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(-car.w / 2 + 4, car.h / 2 - 2, 7, 2.5);
  ctx.fillRect(car.w / 2 - 11, car.h / 2 - 2, 7, 2.5);

  // 10. نيران العادم النفاثة (عند التيربو أو التسارع)
  if (car.boostTimer > 0) {
    const flameH = 18 + Math.random() * 12;
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.moveTo(-7, car.h / 2);
    ctx.lineTo(-3, car.h / 2 + flameH);
    ctx.lineTo(0, car.h / 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, car.h / 2);
    ctx.lineTo(4, car.h / 2 + flameH);
    ctx.lineTo(7, car.h / 2);
    ctx.fill();

    // لهب برتقالي داخلي
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(-5, car.h / 2);
    ctx.lineTo(-3, car.h / 2 + flameH * 0.6);
    ctx.lineTo(-1, car.h / 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(1, car.h / 2);
    ctx.lineTo(4, car.h / 2 + flameH * 0.6);
    ctx.lineTo(6, car.h / 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawMarioCarVertical(car) {
  ctx.save();
  ctx.translate(car.x, car.y);

  // ظل السيارة
  ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
  ctx.beginPath();
  ctx.roundRect(-car.w / 2 + 2, -car.h / 2 + 4, car.w, car.h, 10);
  ctx.fill();

  // هيكل سيارة ماريو الحمراء الرياضية
  const bodyGrad = ctx.createLinearGradient(-car.w / 2, 0, car.w / 2, 0);
  bodyGrad.addColorStop(0, "#b91c1c");
  bodyGrad.addColorStop(0.5, "#ef4444");
  bodyGrad.addColorStop(1, "#b91c1c");

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, [14, 14, 10, 10]);
  ctx.fill();
  ctx.strokeStyle = "#991b1b";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // غطاء المحرك والشعار الأبيض وحرف M
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, -car.h / 2 + 12, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#dc2626";
  ctx.font = "bold 8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("M", 0, -car.h / 2 + 15);

  // قمرة قيادة مفتوحة تظهر ماريو من الأعلى
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // ملابس ماريو الزرقاء
  ctx.fillStyle = "#1d4ed8";
  ctx.beginPath();
  ctx.arc(0, 4, 9, 0, Math.PI * 2);
  ctx.fill();

  // قبعة ماريو الحمراء
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.arc(0, -2, 8, 0, Math.PI * 2);
  ctx.fill();

  // حافة القبعة للأمام
  ctx.fillStyle = "#b91c1c";
  ctx.beginPath();
  ctx.arc(0, -6, 5, 0, Math.PI);
  ctx.fill();

  // الأضواء الأمامية
  ctx.fillStyle = "#fef08a";
  ctx.beginPath();
  ctx.ellipse(-car.w / 2 + 5, -car.h / 2 + 4, 3, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(car.w / 2 - 5, -car.h / 2 + 4, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // شارة اسم ماريو
  ctx.save();
  ctx.translate(car.x, car.y - 48);
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.roundRect(-36, -9, 72, 18, 9);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px Cairo, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("👑 ماريو (MARIO)", 0, 3.5);
  ctx.restore();

  // فقاعة كلام ماريو التنافسية
  if (marioSpeech.timer > 0 && marioSpeech.text) {
    ctx.save();
    ctx.translate(car.x + 35, car.y - 70);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(-10, -12, 100, 24, 8);
    ctx.fill();
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 2;
    ctx.stroke();

    // ذيل الفقاعة
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(5, 12);
    ctx.lineTo(-5, 20);
    ctx.lineTo(15, 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#dc2626";
    ctx.font = "bold 11px Cairo, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(marioSpeech.text, 40, 4);
    ctx.restore();
  }
}

function drawTrafficCarVertical(car) {
  ctx.save();
  ctx.translate(car.x, car.y);

  // ظل السيارة
  ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
  ctx.beginPath();
  ctx.roundRect(-car.w / 2 + 2, -car.h / 2 + 4, car.w, car.h, 10);
  ctx.fill();

  // كفرات
  ctx.fillStyle = "#090d16";
  ctx.fillRect(-car.w / 2 - 2, -car.h / 2 + 12, 3, 12);
  ctx.fillRect(car.w / 2 - 1, -car.h / 2 + 12, 3, 12);
  ctx.fillRect(-car.w / 2 - 2, car.h / 2 - 20, 3, 12);
  ctx.fillRect(car.w / 2 - 1, car.h / 2 - 20, 3, 12);

  // هيكل السيارة الرياضية الملون (كالوردية من الصورة)
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, [14, 14, 10, 10]);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // زجاج أمامي وخلفي
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.roundRect(-car.w / 2 + 5, -car.h / 2 + 18, car.w - 10, 12, [4, 4, 2, 2]);
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(-car.w / 2 + 6, car.h / 2 - 24, car.w - 12, 10, [2, 2, 4, 4]);
  ctx.fill();

  // أضواء أمامية
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(-car.w / 2 + 5, -car.h / 2 + 5, 3, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(car.w / 2 - 5, -car.h / 2 + 5, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // أضواء خلفية
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(-car.w / 2 + 4, car.h / 2 - 2, 6, 2);
  ctx.fillRect(car.w / 2 - 10, car.h / 2 - 2, 6, 2);

  ctx.restore();
}

function drawSpeedLines(w, h) {
  speedLines.forEach(sl => {
    ctx.strokeStyle = sl.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sl.x, sl.y);
    ctx.lineTo(sl.x, sl.y + sl.len);
    ctx.stroke();
  });
}

function drawLightningButton(w, h) {
  // زر البرق والتيربو الأبيض أسفل اليمين (مطابق للصورة بدقة)
  const btnX = w - 68;
  const btnY = h - 85;
  const btnSize = 56;
  lightningBtnRect = { x: btnX, y: btnY, w: btnSize, h: btnSize };

  ctx.save();
  ctx.translate(btnX + btnSize / 2, btnY + btnSize / 2);

  // دائرة التوهج الخلفية عند توفر النيترو
  const isNitroReady = (playerCar && playerCar.nitro > 10);
  if (isNitroReady) {
    const pulseScale = 1 + Math.sin(Date.now() * 0.008) * 0.08;
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.beginPath();
    ctx.arc(0, 0, (btnSize / 2 + 6) * pulseScale, 0, Math.PI * 2);
    ctx.fill();
  }

  // خلفية الزر الدائرية شبه الشفافة
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.beginPath();
  ctx.arc(0, 0, btnSize / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isNitroReady ? "#ffffff" : "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // أيقونة سهم البرق الأبيض للأعلى (مطابقة لأيقونة الصورة)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  // رأس السهم الخارجي
  ctx.moveTo(0, -18);
  ctx.lineTo(16, 4);
  ctx.lineTo(8, 4);
  ctx.lineTo(8, 16);
  ctx.lineTo(-8, 16);
  ctx.lineTo(-8, 4);
  ctx.lineTo(-16, 4);
  ctx.closePath();
  ctx.fill();

  // تفريغ شكل البرق بالداخل
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(1, -12);
  ctx.lineTo(-4, 0);
  ctx.lineTo(1, 0);
  ctx.lineTo(-2, 12);
  ctx.lineTo(4, 0);
  ctx.lineTo(-1, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawVerticalRacingHUD(w, h) {
  if (!playerCar) return;

  // 1. شريط تقدم مسافة السباق (Top Center)
  const barW = Math.min(w * 0.75, 340);
  const barH = 26;
  const barX = (w - barW) / 2;
  const barY = 16;

  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 13);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 190, 2, 0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // تقدم المسافة
  const progressRatio = Math.min(1, raceDistanceTraveled / RACE_TOTAL_DISTANCE);
  const fillW = Math.max(12, (barW - 8) * progressRatio);

  const fillGrad = ctx.createLinearGradient(barX + 4, 0, barX + 4 + fillW, 0);
  fillGrad.addColorStop(0, "#2563eb");
  fillGrad.addColorStop(1, "#38bdf8");
  ctx.fillStyle = fillGrad;
  ctx.beginPath();
  ctx.roundRect(barX + 4, barY + 4, fillW, barH - 8, 9);
  ctx.fill();

  // أيقونة البطل وماريو على شريط التقدم
  const playerIconX = barX + 4 + fillW;
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🏎️", playerIconX, barY + 18);

  const marioDist = (marioCar ? Math.max(0, raceDistanceTraveled - (marioCar.y - playerCar.y) * 0.45) : 0);
  const marioProgress = Math.min(1, marioDist / RACE_TOTAL_DISTANCE);
  const marioIconX = barX + 4 + (barW - 8) * marioProgress;
  ctx.fillText("🍄", marioIconX, barY + 18);

  // علامة النهاية
  ctx.fillText("🏁", barX + barW - 12, barY + 18);

  ctx.font = "bold 10px Cairo, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(`${Math.round(raceDistanceTraveled)}م / ${RACE_TOTAL_DISTANCE}م`, barX + 12, barY + 17);

  ctx.restore();

  // 2. عداد السرعة والنيترو (Bottom Left)
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.beginPath();
  ctx.roundRect(16, h - 85, 140, 68, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(6, 182, 212, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const speedKmh = Math.round(playerCar.speed * 20);
  ctx.font = "bold 16px Cairo, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(`⚡ ${speedKmh} كم/س`, 86, h - 58);

  // شريط النيترو
  ctx.fillStyle = "#334155";
  ctx.fillRect(26, h - 45, 120, 8);
  const nitroW = (playerCar.nitro / 100) * 120;
  const nGrad = ctx.createLinearGradient(26, 0, 146, 0);
  nGrad.addColorStop(0, "#0284c7");
  nGrad.addColorStop(1, "#38bdf8");
  ctx.fillStyle = nGrad;
  ctx.fillRect(26, h - 45, nitroW, 8);

  ctx.font = "bold 9px Cairo, sans-serif";
  ctx.fillStyle = "#ffbe02";
  ctx.fillText("🚀 نيترو (Space)", 86, h - 26);

  ctx.restore();

  // 3. المركز الحالي (Top Left)
  const isAheadOfMario = marioCar ? (playerCar.y <= marioCar.y) : true;
  ctx.save();
  ctx.fillStyle = isAheadOfMario ? "rgba(16, 185, 129, 0.9)" : "rgba(220, 38, 38, 0.9)";
  ctx.beginPath();
  ctx.roundRect(16, 16, 95, 28, 14);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 11px Cairo, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(isAheadOfMario ? "🥇 المركز 1" : "🥈 المركز 2", 63.5, 34);
  ctx.restore();
}

function drawPlatformerTheme(w, h) {
  // Classic Mario blue sky
  ctx.fillStyle = "#5c94fc";
  ctx.fillRect(0, 0, w, h);

  // Background hills (parallax at 0.15x)
  drawMarioBackground(w, h);

  // Clouds (parallax at 0.2x)
  ctx.save();
  ctx.translate(-(cameraX * 0.2), 0);
  ctx.fillStyle = "#ffffff";

  const cloudPositions = [
    { x: 120, y: 60, s: 1.0 }, { x: 480, y: 100, s: 1.4 },
    { x: 850, y: 50, s: 0.9 }, { x: 1250, y: 80, s: 1.2 },
    { x: 1600, y: 110, s: 0.8 }, { x: 2000, y: 55, s: 1.3 },
    { x: 2400, y: 90, s: 1.0 }, { x: 2800, y: 65, s: 1.1 },
    { x: 3200, y: 100, s: 0.9 }, { x: 3600, y: 50, s: 1.2 },
  ];
  cloudPositions.forEach(c => drawMarioCloud(c.x, c.y, c.s));
  ctx.restore();
}

function drawMarioCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.arc(30, -5, 20, 0, Math.PI * 2);
  ctx.arc(-25, 0, 18, 0, Math.PI * 2);
  ctx.arc(10, -15, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMarioBackground(w, h) {
  const groundTop = h - 50;

  // Large green hills (parallax at 0.15x)
  ctx.save();
  ctx.translate(-(cameraX * 0.15), 0);
  ctx.fillStyle = "#5ab552";
  for (let i = 0; i < 8; i++) {
    const hx = i * 700 + 100;
    ctx.beginPath();
    ctx.moveTo(hx, groundTop);
    ctx.quadraticCurveTo(hx + 140, groundTop - 100, hx + 280, groundTop);
    ctx.fill();
  }
  // Small hills
  ctx.fillStyle = "#6cc464";
  for (let i = 0; i < 10; i++) {
    const hx = i * 520 + 60;
    ctx.beginPath();
    ctx.moveTo(hx, groundTop);
    ctx.quadraticCurveTo(hx + 70, groundTop - 50, hx + 140, groundTop);
    ctx.fill();
  }
  ctx.restore();

  // Bushes (parallax at 0.25x)
  ctx.save();
  ctx.translate(-(cameraX * 0.25), 0);
  ctx.fillStyle = "#3d8c37";
  for (let i = 0; i < 12; i++) {
    const bx = i * 420 + 150;
    const bw = 50 + (i % 3) * 25;
    ctx.beginPath();
    ctx.ellipse(bx + bw / 2, groundTop, bw / 2, 18, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore();
}

function drawMarioPlatforms() {
  platforms.forEach(p => {
    let drawY = p.y;
    // Bounce animation for ? blocks
    if (p.bounceTimer && p.bounceTimer > 0) {
      drawY -= Math.sin(p.bounceTimer / 8 * Math.PI) * 8;
      p.bounceTimer--;
    }

    if (p.type === 'ground') {
      // Brown Mario ground blocks
      ctx.fillStyle = "#c84c09";
      ctx.fillRect(p.x, drawY, p.w, p.h);
      ctx.strokeStyle = "#8a3000";
      ctx.lineWidth = 1;
      for (let bx = 0; bx < p.w; bx += 32) {
        for (let by = 0; by < p.h; by += 32) {
          ctx.strokeRect(p.x + bx, drawY + by, 32, 32);
          // Highlight edges
          ctx.fillStyle = "#e87f24";
          ctx.fillRect(p.x + bx + 1, drawY + by + 1, 30, 3);
          ctx.fillRect(p.x + bx + 1, drawY + by + 1, 3, 30);
          ctx.fillStyle = "#c84c09";
        }
      }
    }
    else if (p.type === 'brick') {
      // Classic Mario brick block
      ctx.fillStyle = "#c84c0c";
      ctx.fillRect(p.x, drawY, p.w, p.h);
      ctx.fillStyle = "#000000";
      for (let by = 0; by < p.h; by += 16) {
        ctx.fillRect(p.x, drawY + by, p.w, 2);
        for (let bx = 0; bx < p.w; bx += 16) {
          let offset = ((by / 16) % 2 === 0) ? 0 : 8;
          ctx.fillRect(p.x + bx + offset, drawY + by, 2, 16);
        }
      }
    }
    else if (p.type === 'question') {
      // Yellow ? block (animated)
      ctx.fillStyle = "#e8a000";
      ctx.fillRect(p.x, drawY, p.w, p.h);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, drawY, p.w, p.h);
      // Highlight
      ctx.fillStyle = "#ffd040";
      ctx.fillRect(p.x + 2, drawY + 2, p.w - 4, 4);
      ctx.fillRect(p.x + 2, drawY + 2, 4, p.h - 4);
      // Shadow
      ctx.fillStyle = "#a06000";
      ctx.fillRect(p.x + p.w - 4, drawY + 2, 4, p.h - 4);
      ctx.fillRect(p.x + 2, drawY + p.h - 4, p.w - 4, 4);
      // ? symbol
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", p.x + p.w / 2, drawY + p.h / 2 + 1);
      ctx.textBaseline = "alphabetic";
    }
    else if (p.type === 'used-question') {
      // Brown empty block (used ? block)
      ctx.fillStyle = "#8a5c24";
      ctx.fillRect(p.x, drawY, p.w, p.h);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, drawY, p.w, p.h);
      ctx.fillStyle = "#6a4420";
      ctx.fillRect(p.x + p.w - 4, drawY + 2, 4, p.h - 4);
      ctx.fillRect(p.x + 2, drawY + p.h - 4, p.w - 4, 4);
    }
    else if (p.type === 'pipe') {
      // Green Mario pipe
      ctx.fillStyle = "#00a800";
      ctx.fillRect(p.x, drawY, p.w, p.h);
      // Pipe cap (wider lip on top)
      ctx.fillStyle = "#00c800";
      ctx.fillRect(p.x - 6, drawY, p.w + 12, 18);
      // Pipe highlight
      ctx.fillStyle = "#40e840";
      ctx.fillRect(p.x + 4, drawY + 18, 10, p.h - 18);
      ctx.fillRect(p.x - 2, drawY + 2, 10, 14);
      // Pipe shadow
      ctx.fillStyle = "#006800";
      ctx.fillRect(p.x + p.w - 14, drawY + 18, 10, p.h - 18);
      ctx.fillRect(p.x + p.w - 2, drawY + 2, 8, 14);
      // Outline
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, drawY, p.w, p.h);
      ctx.strokeRect(p.x - 6, drawY, p.w + 12, 18);
    }
    else if (p.type === 'staircase') {
      // Stone/brown staircase blocks
      ctx.fillStyle = "#c84c09";
      ctx.fillRect(p.x, drawY, p.w, p.h);
      ctx.strokeStyle = "#8a3000";
      ctx.lineWidth = 1;
      for (let by = 0; by < p.h; by += 32) {
        ctx.strokeRect(p.x, drawY + by, p.w, 32);
        ctx.fillStyle = "#e87f24";
        ctx.fillRect(p.x + 1, drawY + by + 1, p.w - 2, 3);
        ctx.fillStyle = "#c84c09";
      }
    }
  });
}

function drawMarioFlagpole(groundY) {
  const baseX = 4510;
  const poleHeight = 200;
  const poleTop = groundY - poleHeight;

  // Base block
  ctx.fillStyle = "#00a800";
  ctx.fillRect(baseX - 16, groundY - 32, 32, 32);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(baseX - 16, groundY - 32, 32, 32);

  // Pole
  ctx.fillStyle = "#aaaaaa";
  ctx.fillRect(baseX - 3, poleTop, 6, poleHeight);
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 1;
  ctx.strokeRect(baseX - 3, poleTop, 6, poleHeight);

  // Ball on top
  ctx.fillStyle = "#ffbe02";
  ctx.beginPath();
  ctx.arc(baseX, poleTop, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Flag
  ctx.fillStyle = "#00c800";
  ctx.beginPath();
  ctx.moveTo(baseX + 3, poleTop + 10);
  ctx.lineTo(baseX + 38, poleTop + 25);
  ctx.lineTo(baseX + 3, poleTop + 40);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Status text
  ctx.font = "bold 12px Cairo, sans-serif";
  ctx.fillStyle = "#00a800";
  ctx.textAlign = "center";
  ctx.fillText("🚩 كمل للقلعة!", baseX, groundY + 18);
}

function drawMarioCastle(groundY) {
  const cx = 4600;
  const cw = 140;
  const ch = 120;
  const cy = groundY - ch;

  ctx.save();

  // Castle Main Body (Red-brown brick style)
  ctx.fillStyle = "#b84418";
  ctx.fillRect(cx, cy, cw, ch);

  // Brick texture lines on main body
  ctx.fillStyle = "#682000";
  for (let by = cy; by < groundY; by += 16) {
    ctx.fillRect(cx, by, cw, 2);
    for (let bx = cx; bx < cx + cw; bx += 16) {
      let offset = (((by - cy) / 16) % 2 === 0) ? 0 : 8;
      ctx.fillRect(bx + offset, by, 2, 16);
    }
  }

  // Battlements on main body (crenellations)
  ctx.fillStyle = "#b84418";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(cx + i * 28, cy - 14, 18, 14);
    ctx.fillStyle = "#e87838";
    ctx.fillRect(cx + i * 28, cy - 14, 18, 2);
    ctx.fillStyle = "#b84418";
  }

  // Central Tower
  const tw = 60;
  const th = 50;
  const tx = cx + (cw - tw) / 2;
  const ty = cy - th;
  ctx.fillStyle = "#b84418";
  ctx.fillRect(tx, ty, tw, th);

  // Central Tower Brick texture
  ctx.fillStyle = "#682000";
  for (let by = ty; by < cy; by += 16) {
    ctx.fillRect(tx, by, tw, 2);
    for (let bx = tx; bx < tx + tw; bx += 16) {
      let offset = (((by - ty) / 16) % 2 === 0) ? 0 : 8;
      ctx.fillRect(bx + offset, by, 2, 16);
    }
  }

  // Central Tower Battlements
  ctx.fillStyle = "#b84418";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(tx + i * 20, ty - 12, 14, 12);
    ctx.fillStyle = "#e87838";
    ctx.fillRect(tx + i * 20, ty - 12, 14, 2);
    ctx.fillStyle = "#b84418";
  }

  // Flagpole & Flag on Central Tower
  ctx.fillStyle = "#aaaaaa";
  ctx.fillRect(tx + tw / 2 - 2, ty - 32, 3, 22);
  ctx.fillStyle = "#ffbe02";
  ctx.beginPath();
  ctx.moveTo(tx + tw / 2 + 1, ty - 32);
  ctx.lineTo(tx + tw / 2 + 20, ty - 23);
  ctx.lineTo(tx + tw / 2 + 1, ty - 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Castle Arched Doorway (Entrance)
  const dw = 38;
  const dh = 56;
  const dx = cx + (cw - dw) / 2;
  const dy = groundY - dh;

  // Door outer black arch
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(dx + dw / 2, dy + dw / 2, dw / 2, Math.PI, 0);
  ctx.rect(dx, dy + dw / 2, dw, dh - dw / 2);
  ctx.fill();

  // Door entrance warm light / mystery glow
  const glowGrad = ctx.createRadialGradient(dx + dw / 2, groundY - 20, 4, dx + dw / 2, groundY - 20, 24);
  glowGrad.addColorStop(0, "rgba(255, 190, 2, 0.7)");
  glowGrad.addColorStop(0.5, "rgba(255, 190, 2, 0.3)");
  glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(dx + dw / 2, groundY - 20, 24, 0, Math.PI * 2);
  ctx.fill();

  // Doorway stone arch border
  ctx.strokeStyle = "#e87838";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(dx + dw / 2, dy + dw / 2, dw / 2, Math.PI, 0);
  ctx.stroke();

  // Castle Windows (black arched slits)
  const winW = 10;
  const winH = 18;
  [cx + 18, cx + cw - 18 - winW].forEach(wx => {
    const wy = cy + 26;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(wx + winW / 2, wy + winW / 2, winW / 2, Math.PI, 0);
    ctx.rect(wx, wy + winW / 2, winW, winH - winW / 2);
    ctx.fill();
    ctx.strokeStyle = "#e87838";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Goal banner text above castle
  ctx.font = "bold 13px Cairo, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.shadowColor = "#000";
  ctx.shadowBlur = 4;
  ctx.fillText("🏰 قلعة النهاية", cx + cw / 2, ty - 40);
  ctx.shadowBlur = 0;

  ctx.restore();
}

function updateCoinPopups() {
  for (let i = coinPopups.length - 1; i >= 0; i--) {
    const cp = coinPopups[i];
    cp.y += cp.vy;
    cp.vy += 0.5;
    cp.life--;

    if (cp.life <= 0) {
      coinPopups.splice(i, 1);
      continue;
    }

    // Draw spinning coin
    const scaleX = Math.abs(Math.cos(cp.life * 0.4));
    ctx.save();
    ctx.translate(cp.x, cp.y);
    ctx.scale(scaleX, 1);
    ctx.fillStyle = "#ffbe02";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("$", 0, 4);
    ctx.restore();
  }
}

function drawArenaTheme(w, h) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(17, 52, 168, 0.06)";
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  ctx.strokeStyle = "#1134a8";
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, w - 4, h - 4);
}

function drawShrine() {
  shrine.angle += 0.015;
  const ready = state.coins >= state.requiredItems && state.enemiesDefeated >= state.requiredEnemies;

  ctx.save();
  ctx.translate(shrine.x, shrine.y);

  // هالة البعد الزمني (Aura)
  const auraGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, shrine.radius + 25);
  auraGrad.addColorStop(0, ready ? "rgba(6, 182, 212, 0.5)" : "rgba(88, 28, 135, 0.15)");
  auraGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, 0, shrine.radius + 25, 0, Math.PI * 2);
  ctx.fill();

  // دوران حلقات الزمن
  ctx.rotate(shrine.angle);

  // الحلقة الخارجية (Time Ring Outer)
  ctx.strokeStyle = ready ? "#06b6d4" : "#475569";
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 8, 4, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, 35, 0, Math.PI * 2);
  ctx.stroke();

  // الحلقة الداخلية (Time Ring Inner - تدور بالعكس)
  ctx.rotate(-shrine.angle * 2.5);
  ctx.strokeStyle = ready ? "#8b5cf6" : "#64748b"; 
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 10, 5, 10]);
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]); 

  // قلب البوابة الزمنية (Time Core)
  ctx.rotate(shrine.angle * 4);
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
  coreGrad.addColorStop(0, ready ? "#ffffff" : "#0f172a");
  coreGrad.addColorStop(0.4, ready ? "#06b6d4" : "#1e293b");
  coreGrad.addColorStop(1, ready ? "#4c1d95" : "#334155");
  
  ctx.fillStyle = coreGrad;
  ctx.shadowColor = ready ? "#06b6d4" : "transparent";
  ctx.shadowBlur = ready ? 25 : 0;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();

  // عقارب الزمن الوهمية
  if (ready) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -7); // عقرب الدقائق
    ctx.moveTo(0, 0);
    ctx.lineTo(5, 3);  // عقرب الساعات
    ctx.stroke();
  }

  ctx.restore();

  // نص البوابة
  ctx.font = "bold 13px Cairo, sans-serif";
  ctx.fillStyle = ready ? "#0891b2" : "#475569";
  ctx.textAlign = "center";
  if (ready) {
    ctx.shadowColor = "#a78bfa";
    ctx.shadowBlur = 5;
  }
  ctx.fillText(ready ? "🌌 بوابة الزمن جاهزة!" : "بوابة الزمن مغلقة", shrine.x, shrine.y + 55);
  ctx.shadowBlur = 0;
}

function updateHazards(w, h) {
  hazards.forEach((hzd) => {
    hzd.x += hzd.vx;
    hzd.y += hzd.vy;

    if (hzd.x < hzd.radius || hzd.x > w - hzd.radius) hzd.vx *= -1;
    if (hzd.y < hzd.radius || hzd.y > hzd.radius * 2 + h - hzd.radius * 3) hzd.vy *= -1;

    ctx.save();
    ctx.shadowColor = "#dc2626";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "rgba(220, 38, 38, 0.25)";
    ctx.beginPath();
    ctx.arc(hzd.x, hzd.y, hzd.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#dc2626";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⚡", hzd.x, hzd.y + 5);
    ctx.restore();

    const dist = Math.hypot(player.x - hzd.x, player.y - hzd.y);
    if (dist < player.size + hzd.radius) {
      const angle = Math.atan2(player.y - hzd.y, player.x - hzd.x);
      player.x += Math.cos(angle) * 15;
      player.y += Math.sin(angle) * 15;
      createBurstParticles(player.x, player.y, "#dc2626");
    }
  });
}

function updateItems(w, h) {
  const now = Date.now() * 0.004;

  items.forEach((item) => {
    if (item.collected) return;

    if (!isPlatformer) {
      item.x += item.vx || 0;
      item.y += item.vy || 0;
      if (item.x < 30 || item.x > w - 30) item.vx *= -1;
      if (item.y < 30 || item.y > h - 30) item.vy *= -1;
    }

    const floatY = Math.sin(now + item.floatOffset) * 4;
    const cy = item.y + floatY;

    ctx.save();
    ctx.shadowColor = "#ffbe02";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffbe02";
    ctx.beginPath();
    ctx.arc(item.x, cy, item.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#1134a8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#1134a8";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(state.dayNumber === 1 ? "★" : state.dayNumber === 3 ? "⚡" : "◆", item.x, cy + 4);
    ctx.restore();

    const dist = Math.hypot(player.x - item.x, player.y - cy);
    if (dist < player.size + item.radius) {
      item.collected = true;
      createBurstParticles(item.x, cy, "#ffbe02");
      collectItemOnServer(item.id);
    }
  });
}

function updateEnemies(w, h) {
  if (!isPlatformer) {
    spawnTimer++;
    if (enemies.filter((e) => !e.defeated).length < 4 && spawnTimer > 80) {
      spawnEnemy(w, h, null, state.dayNumber);
      spawnTimer = 0;
    }
  }

  enemies.forEach((en) => {
    if (en.defeated) return;

    if (isPlatformer) {
      // الجاذبية وحركة البلاتفورمر
      en.vy = (en.vy || 0) + 0.5;
      en.x += en.vx;
      en.y += en.vy;

      let onGround = false;
      platforms.forEach(p => {
        // Landing on platforms
        if (en.x > p.x && en.x < p.x + p.w &&
            en.y + en.size >= p.y && en.y + en.size <= p.y + p.h + 10 && en.vy > 0) {
          en.y = p.y - en.size;
          en.vy = 0;
          onGround = true;
          // Turn at platform edges (don't walk off)
          if (en.x < p.x + 15 || en.x > p.x + p.w - 15) {
             en.vx *= -1;
          }
        }
        // Pipe side collision
        if (p.type === 'pipe' && en.y + en.size > p.y && en.y - en.size < p.y + p.h) {
          if (en.x > p.x - 8 && en.x < p.x + 10) { en.vx = -Math.abs(en.vx); en.x = p.x - 8; }
          if (en.x < p.x + p.w + 8 && en.x > p.x + p.w - 10) { en.vx = Math.abs(en.vx); en.x = p.x + p.w + 8; }
        }
      });
      if (en.x < 0 || en.x > LEVEL_WIDTH_DAY2) en.vx *= -1;

      // Goomba Stomp: player lands on enemy from above
      const dist = Math.hypot(player.x - en.x, player.y - en.y);
      if (dist < player.size + en.size) {
        if (player.vy > 0 && player.y < en.y - 8) {
           en.defeated = true;
           player.vy = -12; // Strong bounce after stomp
           createBurstParticles(en.x, en.y, "#ffbe02");
           defeatEnemyOnServer(en.id);
        } else {
           // Side hit - knockback player
           const pushDir = player.x < en.x ? -1 : 1;
           player.x += pushDir * 15;
           player.vy = -6;
        }
      }

    } else {
      // حركة الساحة المفتوحة المعتادة
      en.x += en.vx;
      en.y += en.vy;
      if (en.x < 30 || en.x > w - 30) en.vx *= -1;
      if (en.y < 30 || en.y > h - 30) en.vy *= -1;

      const dist = Math.hypot(player.x - en.x, player.y - en.y);
      if (dist < player.size + en.size) {
        player.x -= en.vx * 4;
        player.y -= en.vy * 4;
      }
    }

    ctx.save();
    ctx.shadowColor = "#dc2626";
    ctx.shadowBlur = 8;
    ctx.fillStyle = state.dayNumber === 1 ? "#b45309" : state.dayNumber === 2 ? "#8B4513" : state.dayNumber === 5 ? "#581c87" : "#dc2626";
    ctx.beginPath();
    ctx.arc(en.x, en.y, en.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#1134a8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(en.x - 5, en.y - 3, 3, 0, Math.PI * 2);
    ctx.arc(en.x + 5, en.y - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(en.x - 5, en.y - 3, 1.5, 0, Math.PI * 2);
    ctx.arc(en.x + 5, en.y - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function updateSpells(w, h) {
  for (let sIdx = spells.length - 1; sIdx >= 0; sIdx--) {
    const sp = spells[sIdx];
    sp.x += sp.vx;
    sp.y += sp.vy;
    sp.life--;

    ctx.save();
    ctx.shadowColor = "#1134a8";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#1134a8";
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    let hit = false;
    enemies.forEach((en) => {
      if (en.defeated || hit) return;
      const dist = Math.hypot(sp.x - en.x, sp.y - en.y);
      if (dist < sp.radius + en.size) {
        hit = true;
        en.defeated = true;
        createBurstParticles(en.x, en.y, "#ffbe02");
        defeatEnemyOnServer(en.id);

        // Day 1 only: 30% chance the defeated enemy drops a collectible coin
        if (state.dayNumber === 1 && Math.random() < 0.3) {
          items.push({
            id: `coin_drop_${en.id}_${Date.now()}`,
            x: en.x,
            y: en.y,
            radius: 10,
            collected: false,
            floatOffset: Math.random() * Math.PI * 2,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
          });
        }
      }
    });

    if (hit || sp.life <= 0 || sp.x < 0 || sp.x > w || sp.y < 0 || sp.y > h) {
      spells.splice(sIdx, 1);
    }
  }
}

function updatePlayer(w, h) {
  let moveX = 0;
  let moveY = 0;

  if (keys["ArrowUp"] || keys["KeyW"] || keys["dpad_up"]) moveY -= 1;
  if (keys["ArrowDown"] || keys["KeyS"] || keys["dpad_down"]) moveY += 1;
  if (keys["ArrowLeft"] || keys["KeyA"] || keys["dpad_left"]) moveX -= 1;
  if (keys["ArrowRight"] || keys["KeyD"] || keys["dpad_right"]) moveX += 1;

  if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY);
    player.x += (moveX / len) * player.speed;
    player.y += (moveY / len) * player.speed;
    player.targetX = player.x;
    player.targetY = player.y;

    if (Math.abs(moveX) > Math.abs(moveY)) {
      player.facing = moveX > 0 ? "right" : "left";
    } else {
      player.facing = moveY > 0 ? "down" : "up";
    }
    player.walkFrame += 0.2;
  } else {
    const tdx = player.targetX - player.x;
    const tdy = player.targetY - player.y;
    const dist = Math.hypot(tdx, tdy);

    if (dist > 4) {
      player.x += (tdx / dist) * player.speed;
      player.y += (tdy / dist) * player.speed;
      player.walkFrame += 0.2;
      player.facing = tdx > 0 ? "right" : "left";
    }
  }

  const pad = player.size;
  player.x = Math.max(pad, Math.min(w - pad, player.x));
  player.y = Math.max(pad, Math.min(h - pad, player.y));

  if (shrineCooldown > 0) shrineCooldown--;

  const shrineDist = Math.hypot(player.x - shrine.x, player.y - shrine.y);
  const portalReady = state.coins >= state.requiredItems && state.enemiesDefeated >= state.requiredEnemies;

  if (
    shrineDist < player.size + shrine.radius &&
    portalReady &&
    !state.completed &&
    !isModalActive &&
    shrineCooldown <= 0
  ) {
    handleOpenChallenge();
  }

  drawPlayer();
}

function drawPlayer() {
  const isMoving = (
    keys["ArrowUp"] || keys["ArrowDown"] || keys["ArrowLeft"] || keys["ArrowRight"] ||
    keys["KeyW"] || keys["KeyS"] || keys["KeyA"] || keys["KeyD"] ||
    keys["dpad_up"] || keys["dpad_down"] || keys["dpad_left"] || keys["dpad_right"] ||
    Math.hypot(player.targetX - player.x, player.targetY - player.y) > 4
  );

  let bob = 0;
  let tilt = 0;

  if (isPlatformer) {
      // في وضع ماريو، المشي والنط ليهم حركات مختلفة
      if (player.isGrounded && Math.abs(player.vx) > 0.5) {
          bob = Math.abs(Math.sin(player.walkFrame)) * -4; 
          tilt = Math.sin(player.walkFrame) * 0.08;
      } else if (!player.isGrounded) {
          // وضعية النط في الهوا
          tilt = (player.vy < 0) ? -0.1 : 0.05;
      }
  } else {
      // الحركة العادية في الأبعاد التانية
      if (isMoving) {
          bob = Math.abs(Math.sin(player.walkFrame)) * -3; 
          tilt = Math.sin(player.walkFrame) * 0.06;
      }
  }

  // ظل ناعم تحت الشخصية
  ctx.save();
  const shadowScale = (isPlatformer && !player.isGrounded) ? 0.4 : (1 + (bob * 0.05)); 
  ctx.fillStyle = "rgba(17, 52, 168, 0.35)"; 
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 18, 16 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(player.x, player.y + 18 + bob);
  ctx.rotate(tilt);

  // تحديد الصورة بناءً على الاتجاه
  let currentImg = playerImg; 
  if (player.facing === "up" && !isPlatformer) {
    currentImg = playerImgBack;
  } else if (player.facing === "right" || player.facing === "left") {
    currentImg = playerImgSide;
  }

  // عكس الصورة للاتجاه الأيسر
  if (player.facing === "left") {
    ctx.scale(-1, 1);
  }

  if (currentImg.complete && currentImg.naturalWidth > 0) {
    // الحفاظ على الأبعاد الحقيقية للصورة عشان متبقاش ممطوطة
    const aspect = currentImg.naturalWidth / currentImg.naturalHeight;
    const drawH = 74; 
    const drawW = drawH * aspect; 
    ctx.drawImage(currentImg, -drawW / 2, -drawH, drawW, drawH);
  } else {
    // رسم احتياطي
    ctx.fillStyle = "#1134a8";
    ctx.beginPath();
    ctx.arc(0, -18, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function updatePlayerPlatformer(w, h) {
  // Handle death animation
  if (playerDeadTimer > 0) {
    playerDeadTimer--;
    player.vy += 0.8;
    player.y += player.vy;
    drawPlayer();
    if (playerDeadTimer <= 0) {
      // Respawn at start
      player.x = 80;
      player.y = h - 120;
      player.vx = 0;
      player.vy = 0;
      player.isGrounded = false;
      cameraX = 0;
    }
    return;
  }

  let moveX = 0;
  if (keys["ArrowLeft"] || keys["KeyA"] || keys["dpad_left"]) moveX -= 1;
  if (keys["ArrowRight"] || keys["KeyD"] || keys["dpad_right"]) moveX += 1;

  // Sprint (hold Shift for B-run)
  isRunning = keys["ShiftLeft"] || keys["ShiftRight"] || false;
  const maxSpeed = isRunning ? 8.5 : 5.5;
  const accel = isRunning ? 0.8 : 0.5;
  const friction = player.isGrounded ? 0.75 : 0.92;

  // 1. Horizontal movement (acceleration/deceleration)
  if (moveX !== 0) {
    player.vx = (player.vx || 0) + moveX * accel;
    if (player.vx > maxSpeed) player.vx = maxSpeed;
    if (player.vx < -maxSpeed) player.vx = -maxSpeed;
    player.facing = moveX > 0 ? "right" : "left";
    player.walkFrame += isRunning ? 0.45 : 0.3;
  } else {
    player.vx = (player.vx || 0) * friction;
    if (Math.abs(player.vx) < 0.3) player.vx = 0;
  }

  // 2. Update X position
  player.x += player.vx;

  // Level bounds
  if (player.x < player.size) { player.x = player.size; player.vx = 0; }
  if (player.x > LEVEL_WIDTH_DAY2 - player.size) { player.x = LEVEL_WIDTH_DAY2 - player.size; player.vx = 0; }

  // Horizontal collision with platforms
  platforms.forEach(p => {
    if (player.y + 17 > p.y && player.y - 17 < p.y + p.h) {
      if (player.vx > 0 && player.x + 12 > p.x && player.x - 12 < p.x) {
        player.x = p.x - 12;
        player.vx = 0;
      }
      else if (player.vx < 0 && player.x - 12 < p.x + p.w && player.x + 12 > p.x + p.w) {
        player.x = p.x + p.w + 12;
        player.vx = 0;
      }
    }
  });

  // Track grounded state for coyote time
  const wasGrounded = player.isGrounded;

  // 3. Jumping (variable-height Mario jump)
  const jumpPressed = keys["ArrowUp"] || keys["KeyW"] || keys["Space"] || keys["dpad_up"];
  if (jumpPressed) {
    if (player.isGrounded || coyoteTimer > 0) {
      player.vy = -14.5;
      player.isGrounded = false;
      coyoteTimer = 0;
      audio.playJump();
    }
  } else {
    // Short hop: cut upward velocity when button released
    if (player.vy < -5) player.vy = -5;
  }

  // 4. Gravity (lighter while holding jump for higher arc)
  const gravity = (player.vy < 0 && jumpPressed) ? 0.7 : 1.1;
  player.vy += gravity;
  if (player.vy > 16) player.vy = 16;

  // 5. Update Y position
  player.y += player.vy;
  player.isGrounded = false;

  // Vertical collision with platforms
  platforms.forEach(p => {
    if (player.x + 11 > p.x && player.x - 11 < p.x + p.w) {
      // Landing on top of platform
      if (player.vy >= 0 && player.y + 18 >= p.y && player.y + 18 - player.vy <= p.y + 12) {
        player.y = p.y - 18;
        player.vy = 0;
        player.isGrounded = true;
      }
      // Head bump from below
      else if (player.vy < 0 && player.y - 18 <= p.y + p.h && player.y - 18 - player.vy >= p.y + p.h - 12) {
        player.y = p.y + p.h + 18;
        player.vy = 1;

        // ? Block interaction: dispense coin
        if (p.type === 'question' && !p.used) {
          p.used = true;
          p.type = 'used-question';
          p.bounceTimer = 8;
          coinPopups.push({ x: p.x + p.w / 2, y: p.y - 10, vy: -7, life: 25 });
          audio.playPowerUp();
          collectItemOnServer(p.coinId);
        } else if (p.type !== 'used-question') {
          audio.playBump();
        }
      }
    }
  });

  // 6. Coyote time: brief grace period to jump after walking off an edge
  if (wasGrounded && !player.isGrounded && player.vy >= 0) {
    coyoteTimer = 6;
  }
  if (coyoteTimer > 0) coyoteTimer--;

  // 7. Pit death: fell below the screen
  if (player.y > h + 100) {
    playerDeadTimer = 40;
    player.vy = -10;
    createBurstParticles(player.x, h, "#dc2626");
  }

  // 8. Castle / portal interaction (reaching the castle triggers challenge)
  if (shrineCooldown > 0) shrineCooldown--;

  const atCastle = (player.x >= 4630) || (Math.hypot(player.x - shrine.x, player.y - shrine.y) < player.size + shrine.radius + 20);

  // Update HUD to show "ادخل القلعة" button if near castle
  if (player.x >= 4500) {
    const openBtn = document.getElementById("btn-open-challenge");
    if (openBtn && openBtn.classList.contains("hidden")) {
      openBtn.classList.remove("hidden");
      openBtn.className = "btn btn-gold btn-pulse";
      openBtn.innerHTML = "<span>🏰 ادخل القلعة</span>";
    }
  }

  if (
    atCastle &&
    !state.completed &&
    !isModalActive &&
    shrineCooldown <= 0
  ) {
    handleOpenChallenge();
  }

  drawPlayer();
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;

    if (p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// احتفال الفوز (Confetti)
let confettiPieces = [];
let confettiRunning = false;

function startConfetti() {
  const canvasConf = document.getElementById("confetti-canvas");
  if (!canvasConf) return;
  const ctxConf = canvasConf.getContext("2d");

  canvasConf.width = window.innerWidth;
  canvasConf.height = window.innerHeight;

  const colors = ["#1134a8", "#ffbe02", "#2554d7", "#ffd043", "#0284c7", "#059669"];
  confettiPieces = [];

  for (let i = 0; i < 150; i++) {
    confettiPieces.push({
      x: Math.random() * canvasConf.width,
      y: Math.random() * canvasConf.height - canvasConf.height,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      angle: Math.random() * 360,
      angleSpeed: (Math.random() - 0.5) * 6,
    });
  }

  if (!confettiRunning) {
    confettiRunning = true;
    function loopConfetti() {
      ctxConf.clearRect(0, 0, canvasConf.width, canvasConf.height);

      confettiPieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.angleSpeed;

        if (p.y > canvasConf.height) {
          p.y = -10;
          p.x = Math.random() * canvasConf.width;
        }

        ctxConf.save();
        ctxConf.translate(p.x, p.y);
        ctxConf.rotate((p.angle * Math.PI) / 180);
        ctxConf.fillStyle = p.color;
        ctxConf.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctxConf.restore();
      });

      requestAnimationFrame(loopConfetti);
    }
    requestAnimationFrame(loopConfetti);
  }
}

// نسخ نص الفوز ومشاركة لقطة الشاشة
async function copyVictoryText() {
  const btn = document.getElementById("btn-copy-text");
  const text = state.victoryMessage || "أنا خلّصت لغز الكلمات الخمسة النهاردة يا جماعة!";
  try {
    await navigator.clipboard.writeText(text);
    const orig = btn ? btn.innerHTML : "";
    if (btn) btn.innerHTML = "<span>✅ اتنسخت خلاص!</span>";
    setTimeout(() => {
      if (btn) btn.innerHTML = orig;
    }, 2000);
  } catch (err) {
    alert("معلش مش عارفين ننسخ الكلام:\n\n" + text);
  }
}

async function copyScreenshot() {
  const btn = document.getElementById("btn-copy-screenshot");
  const orig = btn ? btn.innerHTML : "";

  try {
    const snapshotCanvas = document.createElement("canvas");
    const sctx = snapshotCanvas.getContext("2d");

    const w = 680;
    const h = 520;
    snapshotCanvas.width = w;
    snapshotCanvas.height = h;

    const bgGrad = sctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, "#ffffff");
    bgGrad.addColorStop(1, "#f1f5f9");
    sctx.fillStyle = bgGrad;
    sctx.fillRect(0, 0, w, h);

    sctx.strokeStyle = "#1134a8";
    sctx.lineWidth = 6;
    sctx.strokeRect(6, 6, w - 12, h - 12);

    // رسم اللوجوهات الرسمية أعلى بطاقة السكرين شوت
    const loadImg = (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });

    const [imgMin, imgYly, imgS8] = await Promise.all([
      loadImg("assets/logo_ministry.png?v=2"),
      loadImg("assets/logo_yly.png"),
      loadImg("assets/logo_season8.png"),
    ]);

    // ترتيب اللوجوهات: YLY على الشمال (كبير)، الموسم الثامن في النص، الوزارة على اليمين
    if (imgYly) sctx.drawImage(imgYly, 30, 10, 56, 56);
    if (imgS8) sctx.drawImage(imgS8, w / 2 - 58, 16, 116, 38);
    if (imgMin) sctx.drawImage(imgMin, w - 160, 16, 130, 38);

    sctx.font = "bold 22px Cairo, sans-serif";
    sctx.fillStyle = "#1134a8";
    sctx.textAlign = "center";
    sctx.fillText(
      state.grandFinale ? "🏆 بطل التحدي النهائي الكبير 🏆" : "🏆 كشفت حرف النهاردة يا بطل! 🏆",
      w / 2,
      88
    );

    sctx.font = "14px Cairo, sans-serif";
    sctx.fillStyle = "#475569";
    sctx.fillText(`تاريخ النهاردة: ${getGameDateString()} | مجموع النقط: ${state.totalXp}`, w / 2, 116);

    sctx.fillStyle = "#ffffff";
    sctx.fillRect(40, 138, w - 80, 110);
    sctx.strokeStyle = "rgba(17, 52, 168, 0.2)";
    sctx.lineWidth = 1.5;
    sctx.strokeRect(40, 138, w - 80, 110);

    sctx.font = "bold 16px Cairo, sans-serif";
    sctx.fillStyle = "#1134a8";

    const words = (state.victoryMessage || "").split(" ");
    let line = "";
    let lineY = 178;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = sctx.measureText(testLine);
      if (metrics.width > w - 120 && n > 0) {
        sctx.fillText(line, w / 2, lineY);
        line = words[n] + " ";
        lineY += 28;
      } else {
        line = testLine;
      }
    }
    sctx.fillText(line, w / 2, lineY);

    sctx.font = "bold 13px Cairo, sans-serif";
    sctx.fillStyle = "#1134a8";
    sctx.fillText("شفرة الـ 5 حروف", w / 2, 290);

    const tileCount = 5;
    const tileSize = 44;
    const tileGap = 12;
    const totalWidth = tileCount * tileSize + (tileCount - 1) * tileGap;
    let startX = (w - totalWidth) / 2;

    for (let i = 0; i < 5; i++) {
      const isUnlocked = state.collectedLetters && i < state.collectedLetters.length;
      sctx.fillStyle = isUnlocked ? "#1134a8" : "#f1f5f9";
      sctx.fillRect(startX, 312, tileSize, tileSize);
      sctx.strokeStyle = isUnlocked ? "#ffbe02" : "#cbd5e1";
      sctx.lineWidth = 2;
      sctx.strokeRect(startX, 312, tileSize, tileSize);

      sctx.font = "bold 24px Cairo, serif";
      sctx.fillStyle = isUnlocked ? "#ffbe02" : "#94a3b8";
      sctx.fillText(isUnlocked ? state.collectedLetters[i] : "؟", startX + tileSize / 2, 344);

      startX += tileSize + tileGap;
    }

    sctx.font = "bold 15px Cairo, sans-serif";
    sctx.fillStyle = "#1134a8";
    sctx.fillText(
      state.grandFinale
        ? "حليت الـ 5 حروف كلهم وجمعت كل النقط.. عاش يا بطل!"
        : "استنانا بكره عشان تفتح العالم اللي بعده!",
      w / 2,
      430
    );

    snapshotCanvas.toBlob(async (blob) => {
      try {
        if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          if (btn) btn.innerHTML = "<span>✅ اتنسخت السكرين شوت!</span>";
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `loghz-al-kalimat-5-${getGameDateString()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          if (btn) btn.innerHTML = "<span>✅ نزلت الصورة عندك!</span>";
        }
      } catch (e) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `loghz-al-kalimat-5-${getGameDateString()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        if (btn) btn.innerHTML = "<span>✅ نزلت الصورة عندك!</span>";
      }
      setTimeout(() => {
        if (btn) btn.innerHTML = orig;
      }, 2500);
    });
  } catch (err) {
    console.error("خطأ في لقطة الشاشة:", err);
    alert("معلش مش عارفين نعمل لقطة الشاشة دلوقتي.");
  }
}

// تهيئة الأحداث
document.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.getElementById("player-name-input");
  const charCounter = document.getElementById("name-char-count");
  if (nameInput && charCounter) {
    nameInput.addEventListener("input", () => {
      charCounter.textContent = nameInput.value.length;
    });
  }

  const nameForm = document.getElementById("name-form");
  if (nameForm) nameForm.addEventListener("submit", handleStartNewGame);

  const startBtn = document.getElementById("btn-start-game");
  if (startBtn) {
    startBtn.addEventListener("click", (e) => {
      handleStartNewGame(e);
    });
  }

  if (nameInput) {
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleStartNewGame(e);
      }
    });
  }

  const challengeForm = document.getElementById("challenge-form");
  if (challengeForm) challengeForm.addEventListener("submit", handleSubmitAnswer);

  const openChallengeBtn = document.getElementById("btn-open-challenge");
  if (openChallengeBtn) openChallengeBtn.addEventListener("click", handleOpenChallenge);

  const closeChallengeBtn = document.getElementById("btn-close-modal");
  const cancelChallengeBtn = document.getElementById("btn-cancel-challenge");
  if (closeChallengeBtn) closeChallengeBtn.addEventListener("click", handleCloseChallenge);
  if (cancelChallengeBtn) cancelChallengeBtn.addEventListener("click", handleCloseChallenge);

  const restartBtn = document.getElementById("btn-restart-session");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      if (confirm("متأكد إنك عاوز تعيد اللعبة من الأول؟")) {
        localStorage.removeItem("collecting_a_word_token");
        state.token = null;
        showScreen("name-gate");
      }
    });
  }

  const soundBtn = document.getElementById("btn-sound-toggle");
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      state.soundEnabled = !state.soundEnabled;
      soundBtn.textContent = state.soundEnabled ? "🔊" : "🔇";
      audio.init();
    });
  }

  const copyTextBtn = document.getElementById("btn-copy-text");
  const copyScreenshotBtn = document.getElementById("btn-copy-screenshot");
  if (copyTextBtn) copyTextBtn.addEventListener("click", copyVictoryText);
  if (copyScreenshotBtn) copyScreenshotBtn.addEventListener("click", copyScreenshot);

  // التحكم بالهجوم بمفتاح المسافة / النيترو في السباق
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    audio.init();

    if (e.code === "Space" || e.code === "KeyN") {
      e.preventDefault();
      if (isRacing) {
        if (playerCar && playerCar.nitro > 10) {
          playerCar.nitroActive = true;
          audio.playBoost();
        }
      } else if (!isPlatformer) {
        const targetX = player.facing === "left" ? player.x - 100 : player.facing === "right" ? player.x + 100 : player.x;
        const targetY = player.facing === "up" ? player.y - 100 : player.facing === "down" ? player.y + 100 : player.y;
        castSpell(targetX, targetY);
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
    if (isRacing && (e.code === "Space" || e.code === "KeyN") && playerCar) {
      playerCar.nitroActive = false;
    }
  });

  // زر الهجوم في الجوال / النيترو في السباق
  // ─── منع الزوم والإيماءات المزعجة على الجوال (Anti-Zoom & Touch UX) ───
  let lastTouchEndTime = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (e.target.closest("#mobile-controls, #game-canvas, .canvas-container, .dpad-btn, .attack-btn")) {
      if (now - lastTouchEndTime <= 350) {
        if (e.cancelable) e.preventDefault();
      }
    }
    lastTouchEndTime = now;
  }, { passive: false });

  document.addEventListener("gesturestart", (e) => { if (e.cancelable) e.preventDefault(); });
  document.addEventListener("gesturechange", (e) => { if (e.cancelable) e.preventDefault(); });
  document.addEventListener("gestureend", (e) => { if (e.cancelable) e.preventDefault(); });

  // زر الأكشن في الجوال (ضرب / نط / نيترو حسب المرحلة)
  const mobileAttackBtn = document.getElementById("btn-mobile-attack");
  if (mobileAttackBtn) {
    const triggerAttackAction = (e) => {
      if (e) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
      audio.init();

      if (isRacing) {
        if (playerCar && playerCar.nitro > 10) {
          playerCar.nitroActive = true;
          audio.playBoost();
          setTimeout(() => {
            if (playerCar) playerCar.nitroActive = false;
          }, 1200);
        }
      } else if (isPlatformer) {
        // قفز ماريو
        if (player.isGrounded || coyoteTimer > 0) {
          player.vy = -14.5;
          player.isGrounded = false;
          coyoteTimer = 0;
          audio.playJump();
        }
      } else if (isSubway) {
        // قفز صب واي سيرفرز
        if (!subwayIsJumping && subwaySlideTimer <= 0) {
          subwayIsJumping = true;
          subwayJumpVy = -13;
          audio.playJump();
        }
      } else {
        // هجوم التعاويذ
        const targetX = player.facing === "left" ? player.x - 100 : player.facing === "right" ? player.x + 100 : player.x;
        const targetY = player.facing === "up" ? player.y - 100 : player.facing === "down" ? player.y + 100 : player.y;
        castSpell(targetX, targetY);
      }
    };

    mobileAttackBtn.addEventListener("touchstart", triggerAttackAction, { passive: false });
    mobileAttackBtn.addEventListener("mousedown", triggerAttackAction);
    mobileAttackBtn.addEventListener("touchend", (e) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    }, { passive: false });
    mobileAttackBtn.addEventListener("click", (e) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    });
  }

  // أزرار لوحة الاتجاهات في الجوال (D-Pad)
  document.querySelectorAll(".dpad-btn").forEach((btn) => {
    const dir = btn.dataset.dir;
    const key = `dpad_${dir}`;

    const handlePress = (e) => {
      if (e && e.cancelable) e.preventDefault();
      if (e) e.stopPropagation();
      keys[key] = true;
      audio.init();
    };
    const handleRelease = (e) => {
      if (e && e.cancelable) e.preventDefault();
      if (e) e.stopPropagation();
      keys[key] = false;
    };

    btn.addEventListener("touchstart", handlePress, { passive: false });
    btn.addEventListener("touchend", handleRelease, { passive: false });
    btn.addEventListener("touchcancel", handleRelease, { passive: false });
    btn.addEventListener("mousedown", handlePress);
    btn.addEventListener("mouseup", handleRelease);
    btn.addEventListener("mouseleave", handleRelease);
  });

  // النقر واللمس في الساحة للتحرك أو القيادة التفاعلية
  const canvasEl = document.getElementById("game-canvas");
  if (canvasEl) {
    const isLightningBtnHit = (cx, cy) => {
      if (!isRacing) return false;
      const btnCenterX = lightningBtnRect.x + lightningBtnRect.w / 2;
      const btnCenterY = lightningBtnRect.y + lightningBtnRect.h / 2;
      return Math.hypot(cx - btnCenterX, cy - btnCenterY) <= 36;
    };

    const updatePointerPos = (clientX, clientY) => {
      const rect = canvasEl.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;
      if (isRacing) {
        if (isLightningBtnHit(clickX, clickY)) {
          if (playerCar && playerCar.nitro > 10) {
            playerCar.nitroActive = true;
            audio.playBoost();
            setTimeout(() => {
              if (playerCar) playerCar.nitroActive = false;
            }, 1200);
          }
          return { clickX, clickY, isLightning: true };
        }
        racingPointer.x = clickX;
        racingPointer.y = clickY;
      }
      return { clickX, clickY, isLightning: false };
    };

    canvasEl.addEventListener("mousedown", (e) => {
      audio.init();
      if (isRacing) {
        const { isLightning } = updatePointerPos(e.clientX, e.clientY);
        if (!isLightning) {
          racingPointer.active = true;
        }
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (isRacing && racingPointer.active) {
        updatePointerPos(e.clientX, e.clientY);
      }
    });

    window.addEventListener("mouseup", () => {
      if (isRacing) racingPointer.active = false;
    });

    canvasEl.addEventListener("touchstart", (e) => {
      audio.init();
      if (e.touches.length > 0) {
        const t = e.touches[0];
        const { clickX, clickY, isLightning } = updatePointerPos(t.clientX, t.clientY);
        if (isRacing) {
          if (!isLightning) {
            racingPointer.active = true;
          }
        } else if (!isPlatformer) {
          player.targetX = clickX;
          player.targetY = clickY;
          castSpell(clickX, clickY);
        }
      }
    }, { passive: true });

    canvasEl.addEventListener("touchmove", (e) => {
      if (isRacing && racingPointer.active && e.touches.length > 0) {
        updatePointerPos(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    canvasEl.addEventListener("touchend", () => {
      if (isRacing) racingPointer.active = false;
    });

    canvasEl.addEventListener("touchcancel", () => {
      if (isRacing) racingPointer.active = false;
    });

    canvasEl.addEventListener("click", (e) => {
      const rect = canvasEl.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      if (isRacing) {
        if (isLightningBtnHit(clickX, clickY) && playerCar && playerCar.nitro > 10) {
          playerCar.nitroActive = true;
          audio.playBoost();
          setTimeout(() => {
            if (playerCar) playerCar.nitroActive = false;
          }, 1200);
        }
      } else if (!isPlatformer) {
        player.targetX = clickX;
        player.targetY = clickY;
        audio.init();
        castSpell(clickX, clickY);
      }
    });
  }

  initGameLifecycle();
});
