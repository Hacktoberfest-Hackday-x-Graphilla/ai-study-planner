// =========================================================
// POMODORO TIMER - pomodoro.js
// 1 Elements | 2 Settings | 3 Show on page | 4 Timer
// 5 When a session ends | 6 Buttons
// Everything is wrapped in ( function () { ... } )() so its names
// can never clash with the names in script.js.
// =========================================================
(function () {

  // ===== 1. ELEMENTS AND STATE =====
  const card = document.getElementById("pomodoro");
  const timeBox = document.getElementById("timerDisplay");
  const modeBox = document.getElementById("timerMode");
  const countBox = document.getElementById("timerCount");
  const progressFill = document.getElementById("progressFill");
  const dotsBox = document.getElementById("pomoDots");
  const startBtn = document.getElementById("startBtn");
  const startLabel = document.getElementById("startLabel");
  const settingsBox = document.getElementById("pomoSettings");
  const settingsBtn = document.getElementById("settingsBtn");
  const collapseBtn = document.getElementById("collapseBtn");

  // the three modes: the name under the time + the tab that belongs to it
  const MODES = {
    focus: { label: "Focus Time",  tab: "focusTab" },
    short: { label: "Short Break", tab: "breakTab" },
    long:  { label: "Long Break",  tab: "longTab" }
  };

  let mode = "focus";     // "focus", "short" or "long"
  let secondsLeft = 0;
  let totalSeconds = 1;   // full length of the current session
  let endTime = 0;        // the moment the timer should reach zero
  let timerId = null;     // null means the timer is not running
  let cycleDone = 0;      // focus sessions finished in this round (resets after the long break)


  // ===== 2. SETTINGS AND DAILY COUNT (saved in the browser) =====
  const DEFAULTS = { focus: 25, short: 5, long: 15, every: 4, auto: true, sound: true, notify: false };

  function loadJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (error) { return fallback; }
  }

  let settings = Object.assign({}, DEFAULTS, loadJson("pomodoroSettings", {}));

  function saveSettings() {
    localStorage.setItem("pomodoroSettings", JSON.stringify(settings));
  }

  // how many focus sessions (and minutes) you finished today
  function loadDaily() {
    const data = loadJson("pomodoro", {});
    return data.day === new Date().toDateString()
      ? { count: data.count || 0, minutes: data.minutes || 0 }
      : { count: 0, minutes: 0 };
  }

  let daily = loadDaily();

  function saveDaily() {
    localStorage.setItem("pomodoro", JSON.stringify({
      day: new Date().toDateString(), count: daily.count, minutes: daily.minutes
    }));
  }

  // the settings form: which input belongs to which setting
  const NUMBER_FIELDS = [
    { key: "focus", id: "focusMin", min: 1, max: 90 },
    { key: "short", id: "breakMin", min: 1, max: 30 },
    { key: "long",  id: "longMin",  min: 1, max: 60 },
    { key: "every", id: "everyN",   min: 2, max: 8 }
  ];
  const CHECK_FIELDS = [
    { key: "auto",   id: "autoStart" },
    { key: "sound",  id: "soundOn" },
    { key: "notify", id: "notifyOn" }
  ];

  function fillSettingsForm() {
    NUMBER_FIELDS.forEach(f => { document.getElementById(f.id).value = settings[f.key]; });
    CHECK_FIELDS.forEach(f => { document.getElementById(f.id).checked = settings[f.key]; });
  }

  function readSettingsForm() {
    NUMBER_FIELDS.forEach(f => {
      const value = Math.round(Number(document.getElementById(f.id).value));
      settings[f.key] = Math.min(f.max, Math.max(f.min, value || DEFAULTS[f.key]));
    });
    CHECK_FIELDS.forEach(f => { settings[f.key] = document.getElementById(f.id).checked; });
  }


  // ===== 3. SHOW EVERYTHING ON THE PAGE =====
  function drawDots() {
    let html = "";
    for (let i = 0; i < settings.every; i++) {
      let cls = "pomo-dot";
      if (i < cycleDone) cls += " done";                              // finished session
      else if (i === cycleDone && mode === "focus") cls += " current"; // the one you are on
      html += '<span class="' + cls + '"></span>';
    }
    dotsBox.innerHTML = html;
  }

  function updateStartButton() {
    card.classList.toggle("running", timerId !== null);
    if (timerId) startLabel.textContent = "Pause";
    else startLabel.textContent = secondsLeft === totalSeconds ? "Start" : "Resume";
  }

  function showTime() {
    const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const seconds = String(secondsLeft % 60).padStart(2, "0");
    timeBox.textContent = minutes + ":" + seconds;
    progressFill.style.width = ((1 - secondsLeft / totalSeconds) * 100) + "%";
    countBox.textContent = "Focus sessions today: " + daily.count + " (" + daily.minutes + " min)";
    document.title = timerId ? minutes + ":" + seconds + " - " + MODES[mode].label : "AI Study Planner";
    drawDots();
    updateStartButton();
  }

  // switch to focus / short / long and load that mode's time
  function setMode(newMode) {
    mode = newMode;
    secondsLeft = settings[newMode] * 60;
    totalSeconds = secondsLeft;
    modeBox.textContent = MODES[newMode].label;
    Object.keys(MODES).forEach(key => {
      const tab = document.getElementById(MODES[key].tab);
      tab.classList.toggle("active", key === newMode);
      tab.setAttribute("aria-selected", key === newMode);
    });
    showTime();
  }


  // ===== 4. THE TIMER =====
  // We compare with the clock instead of subtracting 1 each second,
  // so the timer stays correct even when the browser tab is in the background.
  function tick() {
    secondsLeft = Math.max(0, Math.round((endTime - Date.now()) / 1000));
    showTime();
    if (secondsLeft === 0) finishSession();
  }

  function startTimer() {
    if (timerId) return; // already running
    endTime = Date.now() + secondsLeft * 1000;
    timerId = setInterval(tick, 250);
    showTime();
  }

  function pauseTimer() {
    clearInterval(timerId);
    timerId = null;
    showTime();
  }

  function toggleTimer() {
    if (timerId) pauseTimer(); else startTimer();
  }

  function resetTimer() {
    pauseTimer();
    setMode(mode);
  }


  // ===== 5. WHEN A SESSION ENDS =====
  function beep() {
    try {
      const audio = new (window.AudioContext || window.webkitAudioContext)();
      const sound = audio.createOscillator();
      sound.connect(audio.destination);
      sound.frequency.value = 800;
      sound.start();
      sound.stop(audio.currentTime + 0.5);
    } catch (error) { /* no sound available: ignore */ }
  }

  function notify(text) {
    if (settings.notify && "Notification" in window && Notification.permission === "granted") {
      new Notification("Pomodoro", { body: text });
    }
  }

  function finishSession() {
    pauseTimer();
    if (settings.sound) beep();

    const finished = mode;
    let next;

    if (finished === "focus") {
      cycleDone++;
      daily.count++;
      daily.minutes += Math.round(totalSeconds / 60);
      saveDaily();
      next = cycleDone >= settings.every ? "long" : "short";   // long break after a full round
      notify("Focus session done. Time for a " + (next === "long" ? "long" : "short") + " break.");
    } else {
      if (finished === "long") cycleDone = 0;                  // new round starts
      next = "focus";
      notify("Break is over. Time to focus!");
    }

    setMode(next);
    if (settings.auto) startTimer();   // start the next session by itself (if enabled)
  }


  // ===== 6. BUTTONS =====
  startBtn.addEventListener("click", toggleTimer);
  document.getElementById("resetBtn").addEventListener("click", resetTimer);

  // tabs: switching by hand stops the timer first
  Object.keys(MODES).forEach(key => {
    document.getElementById(MODES[key].tab).addEventListener("click", () => {
      pauseTimer();
      setMode(key);
    });
  });

  // X button: collapse / expand the card (the X turns into a +)
  collapseBtn.addEventListener("click", () => {
    const collapsed = card.classList.toggle("collapsed");
    collapseBtn.setAttribute("aria-expanded", !collapsed);
    collapseBtn.setAttribute("aria-label", collapsed ? "Expand timer" : "Collapse timer");
  });

  // gear button: show / hide the settings panel
  settingsBtn.addEventListener("click", () => {
    settingsBox.hidden = !settingsBox.hidden;
    settingsBtn.setAttribute("aria-expanded", !settingsBox.hidden);
  });

  // asks the browser for permission to show notifications
  function askNotificationPermission() {
    const box = document.getElementById("notifyOn");
    if (!("Notification" in window)) { box.checked = false; return; }
    Notification.requestPermission().then(result => {
      if (result !== "granted") {
        box.checked = false;
        settings.notify = false;
        saveSettings();
      }
    });
  }

  // any change in the settings panel is saved and applied
  settingsBox.addEventListener("change", e => {
    if (e.target.id === "notifyOn" && e.target.checked) askNotificationPermission();
    readSettingsForm();
    saveSettings();
    if (cycleDone > settings.every) cycleDone = settings.every;
    fillSettingsForm();                     // shows corrected numbers if one was out of range
    if (timerId) showTime(); else setMode(mode);
  });

  // ----- start the page -----
  fillSettingsForm();
  setMode("focus");

})();
