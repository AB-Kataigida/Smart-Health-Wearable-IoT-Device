//My link /URL to the firebase database for the smart healthcare wearable IoT device.
const FIREBASE_URL =
  "https://smart-healthcare-iot-device-default-rtdb.europe-west1.firebasedatabase.app/Device.json";

const ACCOUNTS = [
  { username: "Abenentle", password: "Ndabeni", role: "Clinician" }, 
];

// Setting the login credentials to be case sensitive
function credentialsMatch(enteredUser, enteredPass, account) {
  const userOk = enteredUser === account.username; 
  const passOk = enteredPass === account.password;
  return userOk && passOk;
}

function evaluateAlert(v) {
  const mag = Math.hypot(v.accelX, v.accelY, v.accelZ);
  if (v.heartRate > 120) return "High heart rate";
  if (v.heartRate > 0 && v.heartRate < 50) return "Low heart rate";
  if (mag > 2.4) return "Possible fall detected";
  return "None";
}

function motionLabel(ax, ay, az) {
  const mag = Math.hypot(ax, ay, az);
  if (mag > 2.4) return "Fall risk";
  if (mag > 1.35) return "Active";
  return "Resting";
}

const app = document.querySelector("#app");
let session = null;
let phase = 0;
let timer = 0;
let history = [];
let wave = Array.from({ length: 120 }, () => 0);

function render() {
  if (!session) {
    app.innerHTML = loginMarkup();
    document.querySelector("#login").addEventListener("submit", onLogin);
    return;
  }
  app.innerHTML = dashboardMarkup();
  document.querySelector("#out").addEventListener("click", () => {
    clearInterval(timer);
    session = null;
    history = [];
    render();
  });
  drawWave();
}

function loginMarkup() {
  return `
  <div class="shell">
    <section class="hero">
      <div>
        <h1>Smart Healthcare Wearable</h1>
        <p>Remote monitor for the ESP32 unit: ECG, and motion.</p>
      </div>
      <ul>
        <li>AD8232 · electrical heart activity</li>
        <li>MPU-6050 · orientation and fall cues</li>
      </ul>
    </section>
    <section class="panel">
      <form class="card" id="login">
        <h2>Sign in</h2>
        <p class="muted">Checked with strict case-sensitive comparison.</p>
        <label for="user">Username</label>
        <input id="user" name="username" autocomplete="username" required />
        <label for="pass">Password</label>
        <input id="pass" name="password" type="password" autocomplete="current-password" required />
        <p class="error" id="err" hidden></p>
        <button class="primary" type="submit">Enter ward dashboard</button>
        <div class="hint">
          <strong>Demo account</strong><br />
          Abenentle · Ndabeni
        </div>
      </form>
    </section>
  </div>`;
}

function onLogin(event) {
  event.preventDefault();
  const username = document.querySelector("#user").value;
  const password = document.querySelector("#pass").value;
  const match = ACCOUNTS.find((account) => credentialsMatch(username, password, account));
  const err = document.querySelector("#err");
  if (!match) {
    err.hidden = false;
    err.textContent = "Username or password does not match. Comparison is case-sensitive.";
    return;
  }
  session = match;
  render();
  tick();
  timer = setInterval(tick, 1000);
}

function dashboardMarkup() {
  const v = window.__vitals || blankVitals();
  const warnHr = v.heartRate !== "--" && (v.heartRate < 50 || v.heartRate > 120);
  const warnO2 = v.spo2 !== "--" && v.spo2 < 92;
  const warnMotion = v.motionStatus === "Fall risk";
  const warnAlert = v.alert !== "None" && v.alert !== "NONE";
  
  const bars = history
    .map((p) => {
      const h = p.heartRate === "--" ? 8 : Math.max(8, (p.heartRate / 140) * 100);
      return `<span style="height:${h}%" title="${p.t} ${p.heartRate} BPM"></span>`;
    })
    .join("");

  return `
  <header class="top">
    <div>
      <p class="brand">WardLink</p>
      <p class="muted">ESP32 wearable · final-year prototype</p>
    </div>
    <div>
      <span class="muted">${session.username} · ${session.role}</span>
      <button class="ghost" id="out" type="button">Sign out</button>
    </div>
  </header>
  <div class="wrap">
    <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:end">
      <div>
        <h1>Patient monitor</h1>
        <p class="muted">Single wearer · arm unit with chest ECG leads</p>
      </div>
      <span class="badge ${v.source === "live" ? "live" : ""}">${v.source === "live" ? "Live Firebase feed" : "Simulator (no device data yet)"}</span>
    </div>
    <section class="grid four">
      ${tile("Heart rate", `${v.heartRate} <small>BPM</small>`, "AD8232 / MAX30102", warnHr)}
      ${tile("SpO₂", `${v.spo2} <small>%</small>`, "MAX30102 PPG", warnO2)}
      ${tile("Motion", v.motionStatus, "MPU-6050", warnMotion)}
      ${tile("Alert", (v.alert === "None" || v.alert === "NONE") ? "Stable" : v.alert, warnAlert ? "Check the wearer" : "Within demo thresholds", warnAlert)}
    </section>
    <section class="grid split">
      <article class="block">
        <h2>ECG trace</h2>
        <p class="muted">Single lead · AD8232</p>
        <svg class="ecg" id="ecg" viewBox="0 0 600 140" role="img" aria-label="ECG waveform"></svg>
      </article>
      <article class="block">
        <h2>Acceleration</h2>
        <p class="muted">MPU-6050, g-units</p>
        ${axis("X", v.accelX)}
        ${axis("Y", v.accelY)}
        ${axis("Z", v.accelZ)}
        <p class="muted">A magnitude above 2.4 g is flagged as a possible fall. Teaching rule only.</p>
      </article>
    </section>
    <article class="block" style="margin-top:0.8rem">
      <h2>Recent heart rate</h2>
      <div class="bars">${bars || '<p class="muted">Waiting for the first sample…</p>'}</div>
    </article>
    <section class="grid two">
      <article class="block">
        <h2>Thresholds in use</h2>
        <ul class="muted">
          <li>Heart rate under 50 or over 120 BPM</li>
          <li>SpO₂ under 92%</li>
          <li>Acceleration magnitude over 2.4 g</li>
        </ul>
      </article>
      <article class="block dark">
        <h2>Device</h2>
        <ul>
          <li>Controller: ESP32 DevKit V1</li>
          <li>On-body screen: 3.5" ILI9488, 320×480</li>
          <li>Cloud path: /Device on Firebase</li>
          <li>Remote monitor only — not a medical device.</li>
        </ul>
      </article>
    </section>
  </div>`;
}

function tile(label, value, note, warn) {
  return `<article class="tile ${warn ? "warn" : ""}"><p class="muted">${label}</p><p class="value">${value}</p><p class="muted">${note}</p></article>`;
}

function axis(name, value) {
  const width = Math.min(100, Math.max(8, Math.abs(value) * 40));
  return `<p style="display:flex;justify-content:space-between;margin:0.4rem 0 0"><span>${name}</span><span>${Number(value).toFixed(2)}</span></p><div class="meter"><i style="width:${width}%"></i></div>`;
}

function blankVitals() {
  return {
    heartRate: "--",
    spo2: "--",
    ecgValue: 512,
    accelX: 0.04,
    accelY: 0.02,
    accelZ: 0.98,
    motionStatus: "Resting",
    alert: "None",
    source: "simulator",
  };
}

function ecgSample(step, raw) {
  const beat = step % 28;
  if (beat === 8) return -0.25;
  if (beat === 9) return 0.15;
  if (beat === 10) return 1;
  if (beat === 11) return -0.45;
  if (beat === 12) return 0.2;
  if (beat === 16) return 0.28;
  return (((raw % 17) - 8) / 80) * 0.15;
}

function drawWave() {
  const svg = document.querySelector("#ecg");
  if (!svg) return;
  const d = wave
    .map((v, i) => {
      const x = (i / (wave.length - 1)) * 600;
      const y = 70 - v * 52;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  svg.innerHTML = `<path d="${d}" fill="none" stroke="#d7efe6" stroke-width="2.2" stroke-linejoin="round"/>`;
}

async function tick() {
  phase += 1;
  let next = null;
  try {
    const res = await fetch(FIREBASE_URL);
    if (res.ok) {
      const data = await res.json();
      
      // We check for the exact keys your ESP32 is sending
      if (data && data.ECGvalue !== undefined) {
        const ax = Number(data.accelX || 0);
        const ay = Number(data.accelY || 0);
        const az = Number(data.accelZ || 0);
        
        next = {
          heartRate: "--", // Hardware no longer sends this
          spo2: "--",      // Hardware no longer sends this
          ecgValue: Number(data.ECGvalue || 0),
          accelX: ax,
          accelY: ay,
          accelZ: az,
          motionStatus: String(data.motion_STATUS || motionLabel(ax, ay, az)),
          alert: String(data.Alert || "None"),
          source: "live",
        };
      }
    }
  } catch (error) {
    console.log("Fetch error:", error);
    next = null;
  }

  // If no data from Firebase, fall back to simulator so screen is never blank
  if (!next) {
    const hr = Math.round(78 + Math.sin(phase / 4) * 4 + (phase % 48 === 0 ? -18 : 0));
    const spo2 = phase % 70 === 0 ? 90 : Math.round(97 + Math.sin(phase / 9));
    const ax = Math.sin(phase / 7) * 0.08;
    const ay = Math.cos(phase / 9) * 0.06;
    const az = 0.98;
    next = {
      heartRate: hr,
      spo2,
      ecgValue: 400,
      accelX: ax,
      accelY: ay,
      accelZ: az,
      motionStatus: motionLabel(ax, ay, az),
      alert: evaluateAlert({ heartRate: hr, spo2, accelX: ax, accelY: ay, accelZ: az }),
      source: "simulator",
    };
  }

  window.__vitals = next;
  const stamp = new Date().toLocaleTimeString();
  history = [...history, { t: stamp, heartRate: next.heartRate }].slice(-24);
  wave = [...wave.slice(1), ecgSample(phase, next.ecgValue)];
  
  if (session) render();
}

render();