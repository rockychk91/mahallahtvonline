/* ===============================
   SCREEN MANAGER (AGGRESSIVE MODE)
   =============================== */

const ScreenManager = (() => {

  const DEFAULT_OFF = "21:00";
  const DEFAULT_ON  = "04:00";
  const IDLE_TIMEOUT = 20000; // 20 detik

  let offTime = localStorage.getItem("screenOffTime") || DEFAULT_OFF;
  let onTime  = localStorage.getItem("screenOnTime")  || DEFAULT_ON;

  let watcher = null;
  let scheduleEnabled = true; // auto aktif
  let lastActivityTime = Date.now();
  let screenActive = false;

  let rafBackup = null;
  let styleBackup = null;

  /* ===============================
     ACTIVITY TRACKER
     =============================== */
  function updateActivity() {
    lastActivityTime = Date.now();
  }

  function isIdle() {
    return (Date.now() - lastActivityTime) >= IDLE_TIMEOUT;
  }

  function initActivityListener() {
    ["mousemove", "mousedown", "keydown", "touchstart"].forEach(evt => {
      document.addEventListener(evt, updateActivity, true);
    });
  }

  /* ===============================
     AGGRESSIVE STOP
     =============================== */
  function killEverything() {

    /* 1. STOP AUDIO */
    document.querySelectorAll("audio").forEach(a => {
      a.pause();
      a.currentTime = 0;
      a.src = ""; // cegah reload
    });

    /* 2. STOP INTERVAL & TIMEOUT */
    for (let i = 1; i < 99999; i++) {
      clearInterval(i);
      clearTimeout(i);
    }

    /* 3. STOP ANIMATION FRAME */
    if (!rafBackup) {
      rafBackup = window.requestAnimationFrame;
      window.requestAnimationFrame = () => {};
    }

    /* 4. STOP CSS ANIMATION */
    if (!styleBackup) {
      styleBackup = document.createElement("style");
      styleBackup.innerHTML = `
        * {
          animation: none !important;
          transition: none !important;
        }
      `;
      document.head.appendChild(styleBackup);
    }

    /* 5. BLUR EVENT LOOP (opsional) */
    document.body.style.pointerEvents = "none";
    document.getElementById("screenblack").style.pointerEvents = "auto";
  }

  /* ===============================
     SCREEN CONTROL
     =============================== */
  function showScreenBlack() {
    if (screenActive) return;
    screenActive = true;

    killEverything();
    
    const sb = document.getElementById("screenblack");
    sb.style.display = "block";
    sb.style.pointerEvents = "auto"; // ⬅ WAJIB
  }

  function hideScreenBlack() {
    // JANGAN restore manual → refresh saja
    location.reload();
  }

  /* ===============================
     AUTO SCHEDULER + IDLE
     =============================== */
  function startWatcher() {
    if (watcher) return;

    watcher = setInterval(() => {
      if (!scheduleEnabled) return;
      if (!isIdle()) return;

      const now = new Date();
      const cur = now.getHours() * 60 + now.getMinutes();

      const [oh, om] = offTime.split(":").map(Number);
      const [ih, im] = onTime.split(":").map(Number);

      const offMin = oh * 60 + om;
      const onMin  = ih * 60 + im;

      let inOffTime =
        offMin < onMin
          ? cur >= offMin && cur < onMin
          : cur >= offMin || cur < onMin;

      if (inOffTime) showScreenBlack();
      if (cur === onMin && screenActive) hideScreenBlack();

    }, 5000);
  }

  /* ===============================
     FORM UI
     =============================== */
  function openForm() {
    const html = `
      <div class="popup-overlay" id="screenForm" style="display:flex; top:-50px">
      <div class="popup-content position-relative">

        <!-- TOMBOL CLOSE -->
        <button 
          type="button"
          class="btn-close position-absolute"
          style="top:10px; right:10px"
          onclick="ScreenManager.closeForm()">
        </button>
            <h4 class="mb-3">⏻ Screen OFF</h4>

          <label>Jam OFF</label>
          <input type="time" id="offInput" class="form-control mb-2" value="${offTime}">

          <label>Jam ON</label>
          <input type="time" id="onInput" class="form-control mb-3" value="${onTime}">

          <button class="btn btn-success w-100 mb-2" onclick="ScreenManager.save()">Simpan</button>
          <button class="btn btn-danger w-100" onclick="ScreenManager.forceOff()">Matikan Sekarang</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
  }

  function closeForm() {
    const f = document.getElementById("screenForm");
    if (f) f.remove();
  }

  function save() {
    offTime = document.getElementById("offInput").value;
    onTime  = document.getElementById("onInput").value;

    localStorage.setItem("screenOffTime", offTime);
    localStorage.setItem("screenOnTime", onTime);

    closeForm();
    toast("Berhasil menyimpan jam OFF & ON");
    startWatcher();
  }

  function forceOff() {
    closeForm();
    showScreenBlack();
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast-notification alert alert-success";
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ===============================
     PUBLIC API
     =============================== */
  return {
    init() {
      initActivityListener();
      startWatcher();
      document.getElementById("screenOffBtn").onclick = openForm;
      document.getElementById("screenblack").onclick = hideScreenBlack;
    },
    save,
    forceOff,
      closeForm   // ⬅ TAMBAHKAN INI

  };

})();

document.addEventListener("DOMContentLoaded", ScreenManager.init);
