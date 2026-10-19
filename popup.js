(function detectOperaPopup() {
  if (
    (typeof navigator !== "undefined" && /OPR\/|Opera/i.test(navigator.userAgent)) ||
    window.location.search.includes("view=popup")
  ) {
    document.documentElement.classList.add("opera-popup");
  }
})();

const SITE_CONFIG = {
  vtop: {
    title: "VTOP Student",
    domain: "vtopcc.vit.ac.in"
  },
  codet: {
    title: "CodeTantra",
    domain: "https://auth.codetantra.com/a/?34dpcvse71dqs0yo9qg"
  },
  ffcs: {
    title: "VTOP FFCS",
    domain: "vtopregcc.vit.ac.in"
  },
  lms: {
    title: "LMS",
    domain: "lms.vit.ac.in"
  },
  vitol: {
    title: "VITOL",
    domain: "vitolcc.vit.ac.in"
  }
};

const STORAGE_KEY = "vitCredentialManagerData";
const MASTER_KEY = "vit-credential-manager";

async function getStoredGoogleToken() {
  const syncStored = await chrome.storage.sync.get(["token"]);
  const syncToken = syncStored?.token;
  if (typeof syncToken === "string" && syncToken.trim()) {
    return syncToken.trim();
  }

  const localStored = await chrome.storage.local.get(["token"]);
  const localToken = localStored?.token;
  if (typeof localToken === "string" && localToken.trim()) {
    return localToken.trim();
  }

  return "";
}

async function refreshGoogleSyncStatus() {
  const statusEl = document.getElementById("googleSyncStatus");
  if (!statusEl) {
    return;
  }

  const token = await getStoredGoogleToken();
  statusEl.textContent = token
    ? "Google Calendar: connected"
    : "Google Calendar: not connected";
}

async function connectGoogleCalendar() {
  const statusEl = document.getElementById("googleSyncStatus");
  if (statusEl) {
    statusEl.textContent = "Google Calendar: connecting...";
  }

  try {
    const response = await chrome.runtime.sendMessage({ type: "GOOGLE_AUTH_CONNECT" });
    if (!response?.ok) {
      const reason = String(response?.error || "auth-failed");
      if (statusEl) {
        statusEl.textContent = `Google Calendar: connection failed (${reason})`;
      }
      return;
    }
    await refreshGoogleSyncStatus();
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = `Google Calendar: connection failed (${error?.message || "unknown-error"})`;
    }
  }
}

async function disconnectGoogleCalendar() {
  const statusEl = document.getElementById("googleSyncStatus");
  if (statusEl) {
    statusEl.textContent = "Google Calendar: disconnecting...";
  }

  try {
    const response = await chrome.runtime.sendMessage({ type: "GOOGLE_AUTH_DISCONNECT" });
    if (!response?.ok) {
      const reason = String(response?.error || "disconnect-failed");
      if (statusEl) {
        statusEl.textContent = `Google Calendar: disconnect failed (${reason})`;
      }
      return;
    }
    await refreshGoogleSyncStatus();
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = `Google Calendar: disconnect failed (${error?.message || "unknown-error"})`;
    }
  }
}

function getCardForSite(siteKey) {
  return document.querySelector(`.site-card[data-site-key="${siteKey}"]`);
}

document.getElementById("vtopLaunch")
.addEventListener("click",()=>{

chrome.tabs.create({
url:"https://vtopcc.vit.ac.in/vtop/login"
});

});

document.getElementById("ffcsLaunch")
.addEventListener("click",()=>{

chrome.tabs.create({
url:"https://vtopregcc.vit.ac.in"
});

});

document.getElementById("lmsLaunch")
.addEventListener("click",()=>{

chrome.tabs.create({
url:"https://lms.vit.ac.in"
});

});

document.getElementById("vitolLaunch")
.addEventListener("click",()=>{

chrome.tabs.create({
url:"https://vitolcc.vit.ac.in/login/index.php"
});

});

document.getElementById("codetLaunch")
.addEventListener("click",()=>{

  chrome.tabs.create({
    url:"https://auth.codetantra.com/a/?34dpcvse71dqs0yo9qg"
  });

});

function getDefaultSiteState() {
  return {
    encrypted: null,
    toggles: {
      fillForm: true,
      fillCaptcha: false,
      autoSubmit: false
    }
  };
}

function getDefaultData() {
  return {
    vtop: getDefaultSiteState(),
    codet: getDefaultSiteState(),
    ffcs: getDefaultSiteState(),
    lms: getDefaultSiteState(),
    vitol: getDefaultSiteState()
  };
}

function detectSiteKeyFromUrl(url) {
  if (!url) {
    return null;
  }

  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes("vtopcc.vit.ac.in")) {
      return "vtop";
    }
    if (hostname.includes("vconnectcc1.vit.ac.in") || hostname.includes("vtopconnect")) {
      return "codet";
    }
    if (hostname.includes("vtopregcc.vit.ac.in")) {
      return "ffcs";
    }
    if (hostname.includes("lms.vit.ac.in")) {
      return "lms";
    }
    if (hostname.includes("vitolcc.vit.ac.in")) {
      return "vitol";
    }
  } catch (error) {
    return null;
  }

  return null;
}

async function getStorageData() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return { ...getDefaultData(), ...(stored[STORAGE_KEY] || {}) };
}

async function setStorageData(data) {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

async function decryptSiteCredentials(siteData) {
  if (!siteData.encrypted) {
    return { username: "", password: "" };
  }

  try {
    const decrypted = await VITCM_CRYPTO.decryptJson(siteData.encrypted, MASTER_KEY);
    return {
      username: decrypted?.username || "",
      password: decrypted?.password || ""
    };
  } catch (error) {
    return { username: "", password: "" };
  }
}

function applyCardStatus(card, message, mode = "success") {
  const status = card.querySelector("[data-status]");
  status.textContent = message;
  status.classList.remove("success", "error");
  if (mode === "success") {
    status.classList.add("success");
  }
  if (mode === "error") {
    status.classList.add("error");
  }
}

function updateCardBadge(card, siteData) {
  const badge = card.querySelector("[data-badge]");
  const toggles = siteData?.toggles || {};
  if (!badge) {
    return;
  }

  if (toggles.fillCaptcha) {
    badge.textContent = "CAPTCHA";
  } else if (toggles.autoSubmit) {
    badge.textContent = "AUTO";
  } else if (toggles.fillForm) {
    badge.textContent = "READY";
  } else {
    badge.textContent = "SECURE";
  }
}

function setCaptchaSuggestion(card, text) {
  const suggestion = card.querySelector("[data-captcha-suggestion]");
  if (!suggestion) {
    return;
  }

  suggestion.textContent = text ? `CAPTCHA: ${text}` : "CAPTCHA: waiting";
}

async function populateCard(card, siteData) {
  let creds = await decryptSiteCredentials(siteData);
  // If this is CodeTantra and no stored creds, try falling back to VTOP creds
  if ((!creds || (!creds.username && !creds.password)) && (card.dataset.siteKey === "codet" || card.dataset.siteKey === "ffcs")) {
    const all = await getStorageData();
    const vtopData = all && all.vtop ? all.vtop : null;
    if (vtopData) {
      const vcreds = await decryptSiteCredentials(vtopData);
      if (vcreds && (vcreds.username || vcreds.password)) {
        creds = vcreds;
        applyCardStatus(card, "Using VTOP credentials", "success");
      }
    }
  }
  const usernameInput = card.querySelector('[data-field="username"]');
  const passwordInput = card.querySelector('[data-field="password"]');
  usernameInput.value = creds.username;
  passwordInput.value = creds.password;

  Object.entries(siteData.toggles || {}).forEach(([key, val]) => {
    const toggle = card.querySelector(`[data-toggle="${key}"]`);
    if (toggle) {
      toggle.checked = Boolean(val);
    }
  });

  updateCardBadge(card, siteData);
}

function collectCardState(card) {
  const username = card.querySelector('[data-field="username"]').value.trim();
  const password = card.querySelector('[data-field="password"]').value;
  const fillForm = card.querySelector('[data-toggle="fillForm"]').checked;
  const fillCaptcha = card.querySelector('[data-toggle="fillCaptcha"]').checked;
  const autoSubmit = card.querySelector('[data-toggle="autoSubmit"]').checked;

  return {
    username,
    password,
    toggles: {
      fillForm,
      fillCaptcha,
      autoSubmit
    }
  };
}

async function applyToActiveTab(siteKey) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return false;
  }

  try {
    await sendMessageWithInjectionFallback(tab.id, {
      type: "VITCM_APPLY_SITE",
      siteKey
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function injectContentScripts(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: [
      "crypto.js",
      "bitmaps.js",
      "captchaparser.js",
      "db.js",
      "academic_calendar.js",
      "content.js",
      "timetable.js",
      "marks.js",
      "attendance.js",
      "exam_schedule.js",
      "navbar.js",
      "navbarcc.js"
    ]
  });
}

async function sendMessageWithInjectionFallback(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    const errText = String(error?.message || "");
    if (!errText.includes("Receiving end does not exist")) {
      throw error;
    }

    await injectContentScripts(tabId);
    return chrome.tabs.sendMessage(tabId, message);
  }
}

function isSupportedQuickActionUrl(url) {
  if (!url) {
    return false;
  }
  return /https:\/\/(vtopcc\.vit\.ac\.in|vtopregcc\.vit\.ac\.in)\//i.test(url);
}

async function runQuickAction(action) {
  const statusEl = document.getElementById("quickActionStatus");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !isSupportedQuickActionUrl(tab.url)) {
    if (statusEl) {
      statusEl.textContent = "Action requires an open VTOP/FFCS tab.";
    }
    return;
  }

  try {
    // if (action === "marks-view") {
    //   // const state = await sendMessageWithInjectionFallback(tab.id, {
    //   //   message: "check_mark_view_applied"
    //   // });

    //   if (!state?.onMarksPage) {
    //     if (statusEl) {
    //       statusEl.textContent = "Open the Marks page in VTOP first.";
    //     }
    //     return;
    //   }

    //   if (state?.applied) {
    //     if (statusEl) {
    //       statusEl.textContent = "Marks page is already enhanced.";
    //     }
    //     return;
    //   }

    //   await sendMessageWithInjectionFallback(tab.id, { message: "mark_view_page" });
    //   if (statusEl) {
    //     statusEl.textContent = "Marks page enhancement applied.";
    //   }
    //   return;
    // }
    if (action === "marks-view") {

  try {
    await sendMessageWithInjectionFallback(tab.id,{
      message:"mark_view_page"
    });

    statusEl.textContent="Marks enhancement forced.";
  }

  catch(e){
    statusEl.textContent=e.message;
  }

  return;
}

    if (action === "attendance-view") {

  try {

    await sendMessageWithInjectionFallback(tab.id,{
      message:"view_attendance"
    });

    statusEl.textContent =
      "Attendance page enhancement applied.";
  }

  catch(e){
    statusEl.textContent =
      `Action failed: ${e.message}`;
  }

  return;
}

    if (statusEl) {
      statusEl.textContent = "Unknown action requested.";
    }
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = `Action failed: ${error?.message || "unknown error"}`;
    }
  }
}

async function updateActiveSite() {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    const activeSite = tab?.url
        ? detectSiteKeyFromUrl(tab.url)
        : null;

    const hint = document.getElementById("activeSiteHint");

    if (activeSite && SITE_CONFIG[activeSite]) {
        hint.textContent = `Active site: ${SITE_CONFIG[activeSite].title}`;
    } else {
        hint.textContent = "Active site: Not detected";
    }
}

// Initial run
updateActiveSite();

// Auto update when tab changes
chrome.tabs.onActivated.addListener(updateActiveSite);

// Update when URL changes in current tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete") {
        updateActiveSite();
    }
});

async function autoApplyMarksEnhancement(tab) {
  const statusEl = document.getElementById("quickActionStatus");
  if (!tab?.id || !tab?.url || !/^https:\/\/vtopcc\.vit\.ac\.in\//i.test(tab.url)) {
    return;
  }

  try {
    const state = await sendMessageWithInjectionFallback(tab.id, {
      message: "check_mark_view_applied"
    });

    if (!state?.onMarksPage || state?.applied) {
      return;
    }

    await sendMessageWithInjectionFallback(tab.id, { message: "mark_view_page" });
    if (statusEl) {
      statusEl.textContent = "Marks page enhancement auto-applied.";
    }
  } catch (_error) {
    // No-op: avoid noisy popup errors for auto-apply.
  }
}

async function requestCaptchaAssist(siteKey) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { ok: false, reason: "active-tab-not-found", text: "" };
  }

  try {
    const response = await sendMessageWithInjectionFallback(tab.id, {
      type: "CAPTCHA_ASSIST",
      siteKey
    });
    return {
      ok: Boolean(response?.ok),
      reason: response?.reason || "captcha-parse-failed",
      text: String(response?.text || "")
    };
  } catch (error) {
    return { ok: false, reason: error?.message || "captcha-assist-send-failed", text: "" };
  }
}

const MARKS_STORAGE_KEY = "vit_stored_marks";

function formatMarksTimestamp(ts) {
  if (!ts) return "Not synced yet";
  const date = new Date(ts);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function renderStoredMarksDashboard() {
  const lastUpdatedEl = document.getElementById("marksLastUpdated");
  const badgeEl = document.getElementById("marksUpdateBadge");
  const recentBox = document.getElementById("recentMarksUpdatesBox");
  const recentList = document.getElementById("recentMarksUpdatesList");
  const coursesCountEl = document.getElementById("storedCoursesCount");
  const semBadgeEl = document.getElementById("storedMarksSemBadge");
  const containerEl = document.getElementById("storedMarksContainer");
  const semSelect = document.getElementById("marksSemesterSelect");
  const semBar = document.getElementById("marksSemesterBar");

  if (!lastUpdatedEl) return;

  const result = await chrome.storage.local.get(MARKS_STORAGE_KEY);
  let data = result[MARKS_STORAGE_KEY] || null;

  if (!data && window.VITCM_DB?.loadMarksData) {
    try {
      data = await window.VITCM_DB.loadMarksData();
      if (data) {
        await chrome.storage.local.set({ [MARKS_STORAGE_KEY]: data });
      }
    } catch (_dbLoadErr) {}
  }

  if (!data || !data.lastChecked) {
    lastUpdatedEl.textContent = "Not synced yet";
    if (badgeEl) badgeEl.style.display = "none";
    if (recentBox) recentBox.style.display = "none";
    if (coursesCountEl) coursesCountEl.textContent = "0";
    if (semBadgeEl) semBadgeEl.style.display = "none";
    if (semBar) semBar.style.display = "none";
    if (containerEl) {
      containerEl.innerHTML = '<p class="empty-marks-hint">Login to VTOP to automatically scrape and view your marks here.</p>';
    }
    return;
  }

  lastUpdatedEl.textContent = `Last checked: ${formatMarksTimestamp(data.lastChecked)}`;

  const unreadCount = data.unreadUpdatesCount || 0;
  if (badgeEl) {
    if (unreadCount > 0) {
      badgeEl.textContent = `${unreadCount} New`;
      badgeEl.style.display = "inline-block";
    } else {
      badgeEl.style.display = "none";
    }
  }

  const recentUpdates = data.recentUpdates || [];
  if (recentBox && recentList) {
    if (recentUpdates.length > 0) {
      recentBox.style.display = "flex";
      recentList.innerHTML = recentUpdates.slice(0, 6).map((u) => `
        <div class="recent-mark-item">
          <div>
            <div class="course-name">${escapeHtml(u.courseCode)} ${u.courseTitle ? `- ${escapeHtml(u.courseTitle)}` : ""}${u.semesterName ? ` <span style="font-size:9px;opacity:0.7">(${escapeHtml(u.semesterName)})</span>` : ""}</div>
            <div class="ass-name">${escapeHtml(u.assessmentTitle)} ${u.oldScored && u.oldScored !== "-" ? `<span style="opacity:0.6">(was ${escapeHtml(u.oldScored)})</span>` : ""}</div>
          </div>
          <div>
            <span class="score-tag">${escapeHtml(u.newScored)} / ${escapeHtml(u.maxMarks)}</span>
          </div>
        </div>
      `).join("");
    } else {
      recentBox.style.display = "none";
    }
  }

  // --- Semester resolution ---
  const semesters = data.semesters || {};
  if (Object.keys(semesters).length === 0 && data.courses && Object.keys(data.courses).length > 0) {
    const fallbackId = data.currentSemesterId || "current_semester";
    semesters[fallbackId] = {
      id: fallbackId,
      name: data.currentSemesterName || "Current Semester",
      courses: data.courses
    };
  }

  // Filter to semesters that have courses/marks (requirement 1)
  const nonZeroSemesters = Object.values(semesters).filter(
    (s) => s && s.courses && Object.keys(s.courses).length > 0
  );

  // Sort semesters chronologically so latest is first
  nonZeroSemesters.sort((a, b) => (b.lastScraped || 0) - (a.lastScraped || 0));

  // Determine latest semester id
  const latestSemId = (data.currentSemesterId && nonZeroSemesters.some((s) => s.id === data.currentSemesterId))
    ? data.currentSemesterId
    : (nonZeroSemesters[0]?.id || "");

  // Determine active semester: prefer existing valid selection, otherwise default to latest semester
  let activeSemId = semSelect?.value || data.selectedSemesterId;
  if (!activeSemId || !nonZeroSemesters.some((s) => s.id === activeSemId)) {
    activeSemId = latestSemId;
  }

  // Populate semester selector: only list semesters with marks/courses
  if (semSelect) {
    if (nonZeroSemesters.length > 0) {
      semSelect.innerHTML = nonZeroSemesters.map((s) => {
        const count = Object.keys(s.courses || {}).length;
        const isLatest = s.id === latestSemId;
        const label = `${s.name} (${count} course${count !== 1 ? "s" : ""})${isLatest ? " - Latest" : ""}`;
        const isSelected = s.id === activeSemId ? "selected" : "";
        return `<option value="${escapeHtml(s.id)}" ${isSelected}>${escapeHtml(label)}</option>`;
      }).join("");
      semSelect.value = activeSemId;
      if (semBar) semBar.style.display = "flex";
    } else {
      semSelect.innerHTML = '<option value="">No synced marks yet</option>';
      if (semBar) semBar.style.display = "flex";
    }
  }

  const activeSem = semesters[activeSemId] || null;
  const activeSemName = activeSem?.name || (availableSemesters.find((s) => s.id === activeSemId)?.name || "Selected Semester");

  if (semBadgeEl) {
    semBadgeEl.textContent = activeSemName;
    semBadgeEl.style.display = "inline-block";
  }

  const courses = activeSem?.courses || {};
  const courseKeys = Object.keys(courses);
  if (coursesCountEl) coursesCountEl.textContent = String(courseKeys.length);

  if (containerEl) {
    if (courseKeys.length === 0) {
      if (activeSem) {
        containerEl.innerHTML = `<p class="empty-marks-hint">No courses found in ${escapeHtml(activeSemName)}.</p>`;
      } else {
        containerEl.innerHTML = `
          <div class="empty-marks-sem-box">
            <p class="empty-marks-hint">Marks for <strong>${escapeHtml(activeSemName)}</strong> are not saved locally yet.</p>
            <button type="button" class="marks-sync-sem-btn" id="syncCurrentSelectedSemBtn">🔄 Sync ${escapeHtml(activeSemName)}</button>
          </div>
        `;
      }
    } else {
      containerEl.innerHTML = courseKeys.map((key) => {
        const c = courses[key];
        const assessments = c.assessments || [];
        return `
          <div class="course-marks-card">
            <div class="course-marks-card-title">
              <span><strong>${escapeHtml(c.courseCode)}</strong> - ${escapeHtml(c.courseTitle)}</span>
              <span class="course-type-pill">${escapeHtml(c.subType || c.courseType || "General")}</span>
            </div>
            ${(c.slot || c.faculty || c.classNbr) ? `
              <div class="course-marks-card-meta">
                ${c.slot ? `<span>Slot: <strong>${escapeHtml(c.slot)}</strong></span>` : ""}
                ${c.faculty ? `<span>Faculty: <strong>${escapeHtml(c.faculty)}</strong></span>` : ""}
                ${c.classNbr ? `<span>Class: <strong>${escapeHtml(c.classNbr)}</strong></span>` : ""}
              </div>
            ` : ""}
            <table class="marks-mini-table">
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Max</th>
                  <th>Wt%</th>
                  <th>Scored</th>
                  <th>Wt Scored</th>
                </tr>
              </thead>
              <tbody>
                ${assessments.map((a) => `
                  <tr>
                    <td>${escapeHtml(a.title)}</td>
                    <td>${escapeHtml(a.maxMarks)}</td>
                    <td>${escapeHtml(a.weightagePercent)}</td>
                    <td class="${a.scored !== "-" && a.scored !== "N/A" && a.scored !== "" ? "scored-val" : ""}">${escapeHtml(a.scored)}</td>
                    <td>${escapeHtml(a.weightageEqui)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            ${c.summary ? `
              <div class="course-marks-card-summary">
                <span>Total: <strong>${escapeHtml(c.summary.totalScored || "-")}</strong> / ${escapeHtml(c.summary.totalMaxMarks || "-")}</span>
                <span>Wt: <strong>${escapeHtml(c.summary.totalWeightageScored || "-")}</strong> / ${escapeHtml(c.summary.totalWeightage || "-")}</span>
                ${c.summary.lostWeightage && c.summary.lostWeightage !== "-" ? `<span class="lost-weightage">Lost Wt: <strong>${escapeHtml(c.summary.lostWeightage)}</strong></span>` : ""}
              </div>
            ` : ""}
          </div>
        `;
      }).join("");
    }
  }
}

const CALENDAR_STORAGE_KEY = "vit_academic_calendar";
let currentCalendarFilter = "all";
let currentCalendarSearch = "";
let cachedCalendarData = null;
let currentCalendarMonth = null;
let currentCalendarViewMode = "table";
let selectedDayDate = null;

function formatCalendarTimestamp(ts) {
  if (!ts) return "Not synced yet";
  const date = new Date(ts);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function weekdayOf(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return "";
  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return weekdays[d.getUTCDay()] || "";
}

function getActiveCalendarRecord() {
  return cachedCalendarData || null;
}

const PERSONAL_EVENTS_STORAGE_KEY = "vit_calendar_personal_events";
let cachedPersonalEvents = [];

async function getPersonalEvents() {
  const res = await chrome.storage.local.get(PERSONAL_EVENTS_STORAGE_KEY);
  let events = res[PERSONAL_EVENTS_STORAGE_KEY] || null;
  if (!events && window.VITCM_DB?.loadPersonalEvents) {
    try {
      events = await window.VITCM_DB.loadPersonalEvents();
    } catch (_e) {}
  }
  cachedPersonalEvents = Array.isArray(events) ? events : [];
  return cachedPersonalEvents;
}

async function savePersonalEvent(eventData) {
  const events = await getPersonalEvents();
  if (eventData.id) {
    const idx = events.findIndex((e) => e.id === eventData.id);
    if (idx !== -1) {
      events[idx] = { ...events[idx], ...eventData, updatedAt: Date.now() };
    } else {
      events.push(eventData);
    }
  } else {
    eventData.id = "pe_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    eventData.createdAt = Date.now();
    events.push(eventData);
  }

  events.sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.time || "").localeCompare(b.time || ""));
  cachedPersonalEvents = events;
  await chrome.storage.local.set({ [PERSONAL_EVENTS_STORAGE_KEY]: events });

  try {
    if (window.VITCM_DB?.savePersonalEvents) {
      await window.VITCM_DB.savePersonalEvents(events);
    }
  } catch (_e) {}

  return eventData;
}

async function deletePersonalEvent(eventId) {
  let events = await getPersonalEvents();
  events = events.filter((e) => e.id !== eventId);
  cachedPersonalEvents = events;
  await chrome.storage.local.set({ [PERSONAL_EVENTS_STORAGE_KEY]: events });

  try {
    if (window.VITCM_DB?.savePersonalEvents) {
      await window.VITCM_DB.savePersonalEvents(events);
    }
  } catch (_e) {}

  return true;
}

function openPersonalEventModal(prefillDate = null, editEvent = null) {
  const modal = document.getElementById("personalEventModal");
  const modalTitle = document.getElementById("personalEventModalTitle");
  const editId = document.getElementById("eventEditId");
  const titleInput = document.getElementById("eventTitleInput");
  const dateInput = document.getElementById("eventDateInput");
  const catSelect = document.getElementById("eventCategorySelect");
  const timeInput = document.getElementById("eventTimeInput");
  const descInput = document.getElementById("eventDescInput");

  if (!modal) return;

  const activeRecord = getActiveCalendarRecord();
  const days = activeRecord?.days || [];
  const semStartDate = activeRecord?.startDate || days[0]?.date || "";
  const semEndDate = activeRecord?.endDate || days[days.length - 1]?.date || "";

  if (dateInput) {
    if (semStartDate) dateInput.min = semStartDate;
    if (semEndDate) dateInput.max = semEndDate;
  }

  if (editEvent) {
    if (modalTitle) modalTitle.textContent = "Edit Personal Event";
    if (editId) editId.value = editEvent.id || "";
    if (titleInput) titleInput.value = editEvent.title || "";
    if (dateInput) dateInput.value = editEvent.date || "";
    if (catSelect) catSelect.value = editEvent.category || "personal";
    if (timeInput) timeInput.value = editEvent.time || "";
    if (descInput) descInput.value = editEvent.description || "";
  } else {
    if (modalTitle) modalTitle.textContent = "Add Personal Event";
    if (editId) editId.value = "";
    if (titleInput) titleInput.value = "";

    const todayStr = new Date().toISOString().slice(0, 10);
    let targetDate = prefillDate || selectedDayDate;
    if (!targetDate || (semStartDate && targetDate < semStartDate) || (semEndDate && targetDate > semEndDate)) {
      if (todayStr >= semStartDate && (!semEndDate || todayStr <= semEndDate)) {
        targetDate = todayStr;
      } else {
        targetDate = semStartDate || todayStr;
      }
    }

    if (dateInput) dateInput.value = targetDate;
    if (catSelect) catSelect.value = "personal";
    if (timeInput) timeInput.value = "";
    if (descInput) descInput.value = "";
  }

  modal.style.display = "flex";
  if (titleInput) {
    setTimeout(() => titleInput.focus(), 50);
  }
}

function closePersonalEventModal() {
  const modal = document.getElementById("personalEventModal");
  if (modal) modal.style.display = "none";
}

function showCalendarDayDetail(day) {
  const detailBox = document.getElementById("calendarSelectedDayDetail");
  if (!detailBox) return;

  if (!day) {
    detailBox.style.display = "none";
    return;
  }

  selectedDayDate = day.date;

  const dateParts = (day.date || "").split("-").map(Number);
  const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  const dateStrPretty = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  let badge = "";
  if (day.isExam) {
    badge = '<span class="cal-badge badge-exam">📝 Exam Day</span>';
  } else if (day.dayOrder) {
    badge = `<span class="cal-badge badge-dayorder">🔄 ${escapeHtml(day.dayOrder)} Day Order</span>`;
  } else if (day.isHoliday) {
    badge = '<span class="cal-badge badge-holiday">🏖️ Holiday</span>';
  } else if (day.isFest) {
    badge = '<span class="cal-badge badge-fest">🎉 College Fest</span>';
  } else if (day.isInstructional || day.instructional) {
    badge = '<span class="cal-badge badge-instructional">📚 Instructional Class Day</span>';
  } else {
    badge = '<span class="cal-badge">Non-Instructional</span>';
  }

  let desc = day.eventDescription || "";
  if (!desc) {
    if (day.dayOrder) desc = `Working Saturday following ${day.dayOrder} timetable schedule`;
    else if (day.isHoliday) desc = day.isSunday ? "Sunday (Weekend Holiday)" : "Holiday / Non-Instructional Day";
    else if (day.isInstructional || day.instructional) desc = "Regular instructional class schedule";
    else desc = "Non-instructional day";
  }

  // Personal events for this date
  const dayPersonalEvents = (cachedPersonalEvents || []).filter((e) => e.date === day.date);
  const categoryLabels = {
    personal: "📌 Personal",
    assignment: "📝 Assignment",
    exam: "⏰ Exam/Quiz",
    reminder: "🔔 Reminder",
    club: "👥 Club"
  };

  let peHtml = "";
  if (dayPersonalEvents.length > 0) {
    peHtml = `
      <div class="cal-pe-wrap">
        <div class="cal-pe-header">
          <span class="cal-pe-title">📌 Personal Events (${dayPersonalEvents.length})</span>
          <button type="button" class="btn-add-event-mini" data-action="add-pe" data-date="${escapeHtml(day.date)}">➕ Add More</button>
        </div>
        <div class="cal-pe-list">
          ${dayPersonalEvents.map((pe) => `
            <div class="cal-pe-item cat-${escapeHtml(pe.category || 'personal')}">
              <div class="cal-pe-top">
                <span class="cal-pe-name">${escapeHtml(pe.title)}</span>
                <div class="cal-pe-actions">
                  <button type="button" class="cal-pe-btn btn-edit" data-action="edit-pe" data-id="${escapeHtml(pe.id)}" title="Edit event">✏️</button>
                  <button type="button" class="cal-pe-btn btn-del" data-action="del-pe" data-id="${escapeHtml(pe.id)}" title="Delete event">🗑️</button>
                </div>
              </div>
              <div class="cal-pe-meta">
                <span class="cal-badge badge-${escapeHtml(pe.category || 'personal')}">${categoryLabels[pe.category] || "📌 Event"}</span>
                ${pe.time ? `<span>⏰ ${escapeHtml(pe.time)}</span>` : ""}
              </div>
              ${pe.description ? `<div class="cal-pe-desc">${escapeHtml(pe.description)}</div>` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  } else {
    peHtml = `
      <div class="cal-pe-wrap">
        <div class="cal-pe-header">
          <span class="cal-pe-title">📌 Personal Events</span>
          <button type="button" class="btn-add-event-mini" data-action="add-pe" data-date="${escapeHtml(day.date)}">➕ Add Event</button>
        </div>
      </div>
    `;
  }

  detailBox.style.display = "block";
  detailBox.innerHTML = `
    <div class="cal-detail-card">
      <div class="cal-detail-top">
        <strong>${escapeHtml(dateStrPretty)}</strong>
        ${badge}
      </div>
      <div class="cal-detail-desc">${escapeHtml(desc)}</div>
      <div class="cal-detail-sub">
        <span>Status: <strong>${escapeHtml(day.instructionalStatus || (day.isInstructional ? "Instructional Day" : "Non-Instructional Day"))}</strong></span>
        ${day.dayOrder ? `<span> · Timetable: <strong>${escapeHtml(day.dayOrder)} Day Order</strong></span>` : ""}
      </div>
      ${peHtml}
    </div>
  `;
}

function renderCalendarMonthTable(activeRecord, monthKey) {
  const tbody = document.getElementById("calendarTableBody");
  if (!tbody || !activeRecord) return;

  const days = activeRecord.days || [];
  if (!days.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-calendar-hint">No calendar days available.</td></tr>';
    return;
  }

  let year, month;
  if (monthKey && monthKey.includes("-")) {
    const parts = monthKey.split("-").map(Number);
    year = parts[0];
    month = parts[1];
  } else {
    const firstDate = days[0].date || "2026-10-01";
    const parts = firstDate.split("-").map(Number);
    year = parts[0];
    month = parts[1];
    monthKey = `${year}-${String(month).padStart(2, "0")}`;
  }

  const totalDays = new Date(year, month, 0).getDate();
  const firstDayWeekday = new Date(year, month - 1, 1).getDay();

  const monthDaysMap = new Map();
  days.forEach((d) => {
    if (d.date && d.date.startsWith(monthKey)) {
      const dNum = parseInt(d.date.split("-")[2], 10);
      monthDaysMap.set(dNum, d);
    }
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  let rowsHtml = "";
  let dayCounter = 1;
  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  while (dayCounter <= totalDays) {
    rowsHtml += "<tr>";
    for (let col = 0; col < 7; col++) {
      if (dayCounter === 1 && col < firstDayWeekday) {
        rowsHtml += '<td class="cal-table-cell empty"></td>';
      } else if (dayCounter > totalDays) {
        rowsHtml += '<td class="cal-table-cell empty"></td>';
      } else {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayCounter).padStart(2, "0")}`;
        const dayObj = monthDaysMap.get(dayCounter) || {
          date: dateStr,
          dayNumber: dayCounter,
          dayOfWeek: weekdays[col],
          isSunday: col === 0,
          isHoliday: col === 0,
          isInstructional: col !== 0 && col !== 6,
          instructionalStatus: (col === 0 || col === 6) ? "Non-Instructional Day" : "Instructional Day"
        };

        const isToday = dateStr === todayStr;
        let cellTypeClass = "";
        let tagHtml = "";

        if (dayObj.isExam) {
          cellTypeClass = "cell-exam";
          tagHtml = `<span class="cell-tag tag-exam" title="${escapeHtml(dayObj.eventDescription || 'Exam')}">📝 ${escapeHtml(dayObj.eventDescription || 'Exam')}</span>`;
        } else if (dayObj.dayOrder) {
          cellTypeClass = "cell-dayorder";
          tagHtml = `<span class="cell-tag tag-dayorder" title="${escapeHtml(dayObj.dayOrder)} Day Order">🔄 ${escapeHtml(dayObj.dayOrder)} Order</span>`;
        } else if (dayObj.isHoliday) {
          cellTypeClass = "cell-holiday";
          const holText = dayObj.eventDescription || (dayObj.isSunday ? "Sunday" : "Holiday");
          tagHtml = `<span class="cell-tag tag-holiday" title="${escapeHtml(holText)}">🏖️ ${escapeHtml(holText)}</span>`;
        } else if (dayObj.isFest) {
          cellTypeClass = "cell-fest";
          tagHtml = `<span class="cell-tag tag-fest" title="${escapeHtml(dayObj.eventDescription || 'Fest')}">🎉 ${escapeHtml(dayObj.eventDescription || 'Fest')}</span>`;
        } else if (dayObj.isInstructional || dayObj.instructional) {
          cellTypeClass = "cell-class";
          tagHtml = '<span class="cell-dot-class">● Class</span>';
        } else {
          tagHtml = '<span class="cell-empty-label">Off</span>';
        }

        // Personal events on this date
        const datePersonalEvents = (cachedPersonalEvents || []).filter((e) => e.date === dateStr);
        let peTagHtml = "";
        if (datePersonalEvents.length > 0) {
          const firstPe = datePersonalEvents[0];
          const peCategoryClass = firstPe.category === "assignment" ? "tag-assignment" : (firstPe.category === "exam" ? "tag-exam-personal" : (firstPe.category === "reminder" ? "tag-reminder" : (firstPe.category === "club" ? "tag-club" : "tag-personal")));
          const moreCount = datePersonalEvents.length > 1 ? ` (+${datePersonalEvents.length - 1})` : "";
          peTagHtml = `<span class="cell-tag ${peCategoryClass}" title="📌 ${escapeHtml(firstPe.title)}${moreCount}">📌 ${escapeHtml(firstPe.title)}${moreCount}</span>`;
        }

        const todayPill = isToday ? '<span class="cell-today-pill">TODAY</span>' : "";
        const isSelected = selectedDayDate === dateStr ? "selected-cell" : "";
        const hasPeClass = datePersonalEvents.length > 0 ? "has-personal" : "";

        rowsHtml += `
          <td class="cal-table-cell ${cellTypeClass} ${isToday ? 'cell-today' : ''} ${isSelected} ${hasPeClass}" data-date="${escapeHtml(dateStr)}">
            <div class="cell-top-row">
              <span class="cell-num">${dayCounter}</span>
              ${todayPill}
            </div>
            <div class="cell-body">
              ${tagHtml}
              ${peTagHtml}
            </div>
          </td>
        `;
        dayCounter++;
      }
    }
    rowsHtml += "</tr>";
  }

  tbody.innerHTML = rowsHtml;
}

function generateIcsCalendar(calData) {
  if (!calData || !Array.isArray(calData.days) || calData.days.length === 0) {
    return null;
  }

  const escapeIcs = (str) => {
    if (!str) return "";
    return String(str)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");
  };

  const getNextDateIcs = (dateStr) => {
    const parts = (dateStr || "").split("-").map(Number);
    if (parts.length < 3 || isNaN(parts[0])) return "";
    const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1));
    const ny = dt.getUTCFullYear();
    const nm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const nd = String(dt.getUTCDate()).padStart(2, "0");
    return `${ny}${nm}${nd}`;
  };

  const formatIcsDate = (dateStr) => (dateStr || "").replace(/-/g, "");
  const nowUtc = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const semName = calData.semesterName || "VIT Academic Calendar";
  const semId = calData.semesterId || "sem";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VIT Companion//Academic Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(`VIT Calendar - ${semName}`)}`,
    "X-WR-TIMEZONE:Asia/Kolkata",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Kolkata",
    "X-LIC-LOCATION:Asia/Kolkata",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0530",
    "TZOFFSETTO:+0530",
    "TZNAME:IST",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE"
  ];

  calData.days.forEach((d) => {
    if (d.dayOrder || /day\s*order|working\s*saturday/i.test(`${d.eventDescription || ""} ${d.label || ""}`)) {
      d.isHoliday = false;
      d.isInstructional = true;
      d.instructional = true;
      d.instructionalStatus = "Instructional Day";
    }
  });

  const events = calData.days.filter((d) =>
    d.isHoliday || d.isExam || d.isEvent || d.isFest || d.dayOrder || (d.eventDescription && d.eventDescription.trim())
  );

  events.forEach((day, idx) => {
    const dtStart = formatIcsDate(day.date);
    const dtEnd = getNextDateIcs(day.date);
    if (!dtStart || !dtEnd) return;

    let summary = "";
    const descLines = [];

    if (day.isExam) {
      summary = `📝 ${day.eventDescription || "Examination"}`;
      descLines.push(`VIT Examination: ${day.eventDescription || "Exam"}`);
      descLines.push(`Status: ${day.instructionalStatus || "Instructional Day"}`);
    } else if (day.dayOrder) {
      summary = `🔄 ${day.dayOrder} Day Order (Working Saturday)`;
      descLines.push(`Timetable: ${day.dayOrder} Day Order`);
      descLines.push(`Status: ${day.instructionalStatus || "Instructional Day"}`);
      if (day.eventDescription) descLines.push(`Note: ${day.eventDescription}`);
    } else if (day.isHoliday) {
      const holidayName = day.eventDescription || (day.isSunday ? "Sunday" : "Holiday / Non-Instructional");
      summary = `🏖️ Holiday: ${holidayName}`;
      descLines.push(`VIT Holiday: ${holidayName}`);
      descLines.push(`Status: ${day.instructionalStatus || "Non-Instructional Day"}`);
    } else if (day.isFest) {
      summary = `🎉 ${day.eventDescription || "College Fest"}`;
      descLines.push(`College Event / Fest: ${day.eventDescription || ""}`);
    } else {
      summary = `📌 ${day.eventDescription || day.instructionalStatus || "Academic Day"}`;
      descLines.push(`${day.eventDescription || day.instructionalStatus || ""}`);
    }

    descLines.push(`Semester: ${semName}`);
    descLines.push(`Exported by VIT Companion`);

    const uid = `vitcal-${semId}-${day.date}-${idx}@vitcompanion`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowUtc}`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(`SUMMARY:${escapeIcs(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcs(descLines.join("\n"))}`);
    lines.push("LOCATION:Vellore Institute of Technology");
    lines.push("STATUS:CONFIRMED");
    lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  });

  (cachedPersonalEvents || []).forEach((pe, pIdx) => {
    const dtStart = formatIcsDate(pe.date);
    const dtEnd = getNextDateIcs(pe.date);
    if (!dtStart || !dtEnd) return;

    const catEmoji = pe.category === "assignment" ? "📝" : (pe.category === "exam" ? "⏰" : (pe.category === "reminder" ? "🔔" : (pe.category === "club" ? "👥" : "📌")));
    const summary = `${catEmoji} ${pe.title}`;
    const descLines = [];
    if (pe.category) descLines.push(`Category: ${pe.category.toUpperCase()}`);
    if (pe.time) descLines.push(`Time: ${pe.time}`);
    if (pe.description) descLines.push(`Notes: ${pe.description}`);
    descLines.push("Personal Event in VIT Companion");

    const uid = `vitcal-personal-${pe.id || pIdx}@vitcompanion`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowUtc}`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(`SUMMARY:${escapeIcs(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcs(descLines.join("\n"))}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function generateMobileHtmlCalendar(calData) {
  if (!calData || !Array.isArray(calData.days) || calData.days.length === 0) {
    return null;
  }

  const semName = calData.semesterName || "VIT Academic Calendar";
  const days = calData.days;
  const icsString = generateIcsCalendar(calData) || "";
  const icsDataUri = "data:text/calendar;charset=utf-8," + encodeURIComponent(icsString);

  const monthsMap = new Map();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  days.forEach((d) => {
    if (d.dayOrder || /day\s*order|working\s*saturday/i.test(`${d.eventDescription || ""} ${d.label || ""}`)) {
      d.isHoliday = false;
      d.isInstructional = true;
      d.instructional = true;
      d.instructionalStatus = "Instructional Day";
      d.category = "dayorder";
    }
    const parts = (d.date || "").split("-");
    const y = parts[0] || "";
    const m = parseInt(parts[1] || "1", 10);
    const mKey = `${y}-${String(m).padStart(2, "0")}`;
    const mTitle = `${monthNames[m - 1] || "Month"} ${y}`;
    if (!monthsMap.has(mKey)) {
      monthsMap.set(mKey, { title: mTitle, days: [] });
    }
    monthsMap.get(mKey).days.push(d);
  });

  const instructionalCount = days.filter((d) => d.isInstructional || d.instructional).length;
  const holidaysCount = days.filter((d) => d.isHoliday).length;
  const eventsCount = days.filter((d) => d.isExam || d.isEvent || d.isFest).length;
  const dayOrdersCount = days.filter((d) => Boolean(d.dayOrder)).length;
  const personalEvents = cachedPersonalEvents || [];
  const personalCount = personalEvents.length;

  let monthsHtml = "";
  for (const [mKey, mGroup] of monthsMap.entries()) {
    const mHolidays = mGroup.days.filter((d) => d.isHoliday).length;
    const mClasses = mGroup.days.filter((d) => d.isInstructional || d.instructional).length;

    const [yStr, mStr] = mKey.split("-");
    const yNum = parseInt(yStr, 10);
    const mNum = parseInt(mStr, 10);
    const totalDays = new Date(yNum, mNum, 0).getDate();
    const firstDayWeekday = new Date(yNum, mNum - 1, 1).getDay();

    const monthDaysMap = new Map();
    mGroup.days.forEach((d) => {
      const parts = (d.date || "").split("-");
      const dNum = parseInt(parts[2] || "0", 10);
      if (dNum > 0) monthDaysMap.set(dNum, d);
    });

    const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    let monthTableRows = "";
    let dayCounter = 1;

    while (dayCounter <= totalDays) {
      monthTableRows += "<tr>";
      for (let col = 0; col < 7; col++) {
        if (dayCounter === 1 && col < firstDayWeekday) {
          monthTableRows += '<td class="mob-cell empty"></td>';
        } else if (dayCounter > totalDays) {
          monthTableRows += '<td class="mob-cell empty"></td>';
        } else {
          const dateStr = `${yNum}-${String(mNum).padStart(2, "0")}-${String(dayCounter).padStart(2, "0")}`;
          const day = monthDaysMap.get(dayCounter) || {
            date: dateStr,
            dayNumber: dayCounter,
            dayOfWeek: weekdays[col],
            isSunday: col === 0,
            isHoliday: col === 0,
            isInstructional: col !== 0 && col !== 6,
            instructionalStatus: (col === 0 || col === 6) ? "Non-Instructional Day" : "Instructional Day"
          };

          let cellType = "cell-regular";
          let chip = "";
          let badgeText = "";
          let descText = day.eventDescription || "";

          if (day.isExam) {
            cellType = "cell-exam";
            chip = `<span class="mob-chip chip-exam" title="${escapeHtml(descText || 'Exam')}">📝 ${escapeHtml(descText || 'Exam')}</span>`;
            badgeText = "📝 Exam";
          } else if (day.dayOrder) {
            cellType = "cell-dayorder";
            chip = `<span class="mob-chip chip-dayorder" title="${escapeHtml(day.dayOrder)} Day Order">🔄 ${escapeHtml(day.dayOrder)} Order</span>`;
            badgeText = `🔄 ${escapeHtml(day.dayOrder)} Day Order`;
            if (!descText) descText = `Working Saturday (${day.dayOrder} Day Order)`;
          } else if (day.isHoliday) {
            cellType = "cell-holiday";
            const hText = descText || (day.isSunday ? "Sunday" : "Holiday");
            chip = `<span class="mob-chip chip-holiday" title="${escapeHtml(hText)}">🏖️ ${escapeHtml(hText)}</span>`;
            badgeText = "🏖️ Holiday";
          } else if (day.isFest) {
            cellType = "cell-fest";
            chip = `<span class="mob-chip chip-fest" title="${escapeHtml(descText || 'Fest')}">🎉 ${escapeHtml(descText || 'Fest')}</span>`;
            badgeText = "🎉 Fest";
          } else if (day.isInstructional || day.instructional) {
            cellType = "cell-class";
            chip = '<span class="mob-dot-class">● Class</span>';
            badgeText = "📚 Class Day";
          }

          // Personal events on this date
          const datePersonalEvents = personalEvents.filter((e) => e.date === dateStr);
          let peChip = "";
          if (datePersonalEvents.length > 0) {
            const firstPe = datePersonalEvents[0];
            const catClass = firstPe.category === "assignment" ? "chip-assignment" : (firstPe.category === "exam" ? "chip-exam-pe" : (firstPe.category === "reminder" ? "chip-reminder" : (firstPe.category === "club" ? "chip-club" : "chip-personal")));
            const moreCount = datePersonalEvents.length > 1 ? ` (+${datePersonalEvents.length - 1})` : "";
            peChip = `<span class="mob-chip ${catClass}" title="📌 ${escapeHtml(firstPe.title)}${moreCount}">📌 ${escapeHtml(firstPe.title)}${moreCount}</span>`;
          }
          const hasPeClass = datePersonalEvents.length > 0 ? "has-personal" : "";

          monthTableRows += `
            <td class="mob-cell ${cellType} ${hasPeClass}" data-date="${escapeHtml(dateStr)}" data-day="${dayCounter}" data-title="${escapeHtml(descText || badgeText || 'Day ' + dayCounter)}" data-status="${escapeHtml(day.instructionalStatus || '')}" data-badge="${escapeHtml(badgeText)}" data-dayorder="${escapeHtml(day.dayOrder || '')}" data-pe="${escapeHtml(JSON.stringify(datePersonalEvents))}">
              <div class="mob-cell-top">
                <span class="mob-cell-num">${dayCounter}</span>
              </div>
              <div class="mob-cell-body">
                ${chip}
                ${peChip}
              </div>
            </td>
          `;
          dayCounter++;
        }
      }
      monthTableRows += "</tr>";
    }

    let daysInMonthHtml = "";
    mGroup.days.forEach((day) => {
      const parts = (day.date || "").split("-");
      const dayNum = parts[2] || "01";
      const wk = (day.dayOfWeek || "").toUpperCase();

      let cardType = "type-general";
      let badgeHtml = "";
      let titleText = "";
      const subText = day.instructionalStatus || "";

      if (day.isExam) {
        cardType = "type-exam";
        badgeHtml = `<span class="badge badge-exam">📝 Exam</span>`;
        titleText = day.eventDescription || "Examination";
      } else if (day.dayOrder) {
        cardType = "type-dayorder";
        badgeHtml = `<span class="badge badge-dayorder">🔄 ${escapeHtml(day.dayOrder)} Order</span>`;
        titleText = day.eventDescription || `Working Saturday (${day.dayOrder} Day Order)`;
      } else if (day.isHoliday) {
        cardType = "type-holiday";
        badgeHtml = `<span class="badge badge-holiday">🏖️ Holiday</span>`;
        titleText = day.eventDescription || (day.isSunday ? "Sunday" : "Holiday");
      } else if (day.isFest) {
        cardType = "type-fest";
        badgeHtml = `<span class="badge badge-fest">🎉 Fest</span>`;
        titleText = day.eventDescription || "College Event";
      } else if (day.isInstructional) {
        cardType = "type-class";
        badgeHtml = `<span class="badge badge-class">📚 Class</span>`;
        titleText = day.eventDescription || "Instructional Day";
      } else {
        titleText = day.eventDescription || day.instructionalStatus || "Scheduled Day";
      }

      // Personal events on this card
      const datePersonalEvents = personalEvents.filter((e) => e.date === day.date);
      let peSectionHtml = "";
      if (datePersonalEvents.length > 0) {
        peSectionHtml = `
          <div class="mob-pe-list">
            ${datePersonalEvents.map((pe) => `
              <div class="mob-pe-item">
                <div class="mob-pe-title-row">
                  <span class="mob-pe-name">📌 ${escapeHtml(pe.title)}</span>
                  ${pe.time ? `<span class="mob-pe-time">⏰ ${escapeHtml(pe.time)}</span>` : ""}
                </div>
                ${pe.description ? `<div class="mob-pe-desc">${escapeHtml(pe.description)}</div>` : ""}
              </div>
            `).join("")}
          </div>
        `;
      }
      const peSearchStr = datePersonalEvents.map((pe) => `${pe.title} ${pe.description || ""} ${pe.category || ""}`).join(" ");

      daysInMonthHtml += `
        <div class="day-card ${cardType} ${datePersonalEvents.length > 0 ? 'has-personal' : ''}" data-type="${cardType}" data-has-personal="${datePersonalEvents.length > 0 ? 'true' : 'false'}" data-search="${escapeHtml((day.date + " " + wk + " " + titleText + " " + subText + " " + peSearchStr).toLowerCase())}">
          <div class="date-col">
            <span class="date-num">${escapeHtml(dayNum)}</span>
            <span class="date-wk">${escapeHtml(wk)}</span>
          </div>
          <div class="info-col">
            <div class="day-header">
              <span class="day-title">${escapeHtml(titleText)}</span>
              ${badgeHtml}
            </div>
            ${subText ? `<span class="day-sub">${escapeHtml(subText)}</span>` : ""}
            ${peSectionHtml}
          </div>
        </div>
      `;
    });

    monthsHtml += `
      <section class="month-section" id="month-${escapeHtml(mKey)}">
        <div class="month-header" onclick="this.parentElement.classList.toggle('collapsed')">
          <span class="month-title">📅 ${escapeHtml(mGroup.title)}</span>
          <span class="month-meta">${mClasses} Classes · ${mHolidays} Holidays <span class="arrow">▼</span></span>
        </div>
        <div class="month-body">
          <div class="mob-table-container">
            <div class="mob-table-wrapper">
              <table class="mob-month-table">
                <thead>
                  <tr>
                    <th class="col-sun">SUN</th>
                    <th>MON</th>
                    <th>TUE</th>
                    <th>WED</th>
                    <th>THU</th>
                    <th>FRI</th>
                    <th class="col-sat">SAT</th>
                  </tr>
                </thead>
                <tbody>
                  ${monthTableRows}
                </tbody>
              </table>
            </div>
          </div>
          <div class="days-list" style="display: none;">
            ${daysInMonthHtml}
          </div>
        </div>
      </section>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>VIT Academic Calendar - ${escapeHtml(semName)}</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #131c2e;
      --card-border: #1e293b;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --holiday: #ef4444;
      --holiday-bg: rgba(239, 68, 68, 0.12);
      --exam: #a855f7;
      --exam-bg: rgba(168, 85, 247, 0.14);
      --dayorder: #38bdf8;
      --dayorder-bg: rgba(56, 189, 248, 0.14);
      --class: #22c55e;
      --class-bg: rgba(34, 197, 94, 0.12);
      --primary: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 12px;
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
    }
    header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
    }
    h1 { font-size: 18px; font-weight: 700; color: #fff; }
    .sem-badge {
      display: inline-block;
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.5);
      color: #fbbf24;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 20px;
      margin-top: 4px;
    }
    .actions-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s ease;
    }
    .btn:hover { opacity: 0.9; }
    .btn-ics {
      background: #2563eb;
      color: #fff;
    }
    .btn-print {
      background: #334155;
      color: #e2e8f0;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    @media (min-width: 500px) {
      .stats-grid { grid-template-columns: repeat(5, 1fr); }
    }
    .stat-chip {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 10px;
      text-align: center;
    }
    .stat-chip .val { font-size: 18px; font-weight: 700; color: #fff; display: block; }
    .stat-chip .lbl { font-size: 11px; color: var(--muted); }
    .filter-sticky {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--bg);
      padding: 8px 0;
      margin-bottom: 10px;
    }
    .view-switch-row {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .view-btn {
      flex: 1;
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      padding: 7px 10px;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s ease;
    }
    .view-btn.active {
      background: rgba(245, 158, 11, 0.25);
      border-color: rgba(245, 158, 11, 0.5);
      color: #fbbf24;
    }
    .search-box {
      width: 100%;
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 8px 12px;
      color: #fff;
      font-size: 13px;
      outline: none;
      margin-bottom: 8px;
    }
    .search-box:focus { border-color: var(--primary); }
    .tabs-bar {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .tab-btn {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      padding: 5px 12px;
      white-space: nowrap;
      cursor: pointer;
    }
    .tab-btn.active {
      background: rgba(245, 158, 11, 0.25);
      border-color: rgba(245, 158, 11, 0.5);
      color: #fbbf24;
    }
    /* Mobile Table Grid */
    .mob-table-container {
      width: 100%;
    }
    .mob-table-wrapper {
      width: 100%;
      overflow-x: auto;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.25);
      margin-bottom: 8px;
    }
    .mob-month-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 10px;
    }
    .mob-month-table th {
      background: #1e293b;
      color: #94a3b8;
      font-size: 9px;
      font-weight: 700;
      text-align: center;
      padding: 6px 2px;
      border-bottom: 1px solid var(--card-border);
    }
    .mob-month-table th.col-sun { color: #f87171; }
    .mob-month-table th.col-sat { color: #38bdf8; }
    .mob-cell {
      border: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: top;
      height: 48px;
      padding: 3px;
      box-sizing: border-box;
      position: relative;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s ease;
    }
    .mob-cell:hover, .mob-cell:active {
      background: rgba(255, 255, 255, 0.08);
    }
    .mob-cell.empty {
      background: rgba(0, 0, 0, 0.2);
      cursor: default;
    }
    .mob-cell.cell-holiday {
      background: var(--holiday-bg);
      border-color: rgba(239, 68, 68, 0.35);
    }
    .mob-cell.cell-dayorder {
      background: var(--dayorder-bg);
      border-color: rgba(56, 189, 248, 0.4);
    }
    .mob-cell.cell-exam {
      background: var(--exam-bg);
      border-color: rgba(168, 85, 247, 0.4);
    }
    .mob-cell.cell-fest {
      background: rgba(236, 72, 153, 0.12);
      border-color: rgba(236, 72, 153, 0.35);
    }
    .mob-cell.cell-class {
      background: rgba(255, 255, 255, 0.02);
    }
    .mob-cell.selected-cell {
      box-shadow: inset 0 0 0 2px #38bdf8;
    }
    .mob-cell.has-personal {
      border-bottom: 2px solid #3b82f6;
    }
    .mob-cell-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }
    .mob-cell-num {
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      line-height: 1;
    }
    .mob-cell-body {
      display: flex;
      flex-direction: column;
      gap: 1px;
      overflow: hidden;
    }
    .mob-chip {
      font-size: 8px;
      font-weight: 700;
      padding: 1px 3px;
      border-radius: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
      line-height: 1.1;
    }
    .chip-holiday { background: rgba(239, 68, 68, 0.25); color: #fca5a5; }
    .chip-dayorder { background: rgba(56, 189, 248, 0.25); color: #93c5fd; }
    .chip-exam { background: rgba(168, 85, 247, 0.25); color: #d8b4fe; }
    .chip-fest { background: rgba(236, 72, 153, 0.25); color: #f472b6; }
    .chip-personal { background: rgba(59, 130, 246, 0.25); color: #93c5fd; }
    .chip-assignment { background: rgba(245, 158, 11, 0.25); color: #fcd34d; }
    .chip-exam-pe { background: rgba(239, 68, 68, 0.25); color: #fca5a5; }
    .chip-reminder { background: rgba(16, 185, 129, 0.25); color: #6ee7b7; }
    .chip-club { background: rgba(168, 85, 247, 0.25); color: #d8b4fe; }
    .mob-dot-class { color: #4ade80; font-size: 8px; opacity: 0.7; }
    .mob-detail-box {
      background: #1e293b;
      border: 1px solid rgba(56, 189, 248, 0.5);
      border-radius: 12px;
      padding: 10px 14px;
      margin-bottom: 12px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }
    .mob-detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 4px;
    }
    .mob-detail-desc {
      font-size: 13px;
      font-weight: 600;
      color: #fbbf24;
      margin-bottom: 2px;
    }
    .mob-detail-sub {
      font-size: 11px;
      color: var(--muted);
    }
    .mob-detail-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 14px;
      cursor: pointer;
      padding: 0 4px;
    }
    .month-section {
      margin-bottom: 14px;
    }
    .month-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      padding: 10px 14px;
      border-radius: 10px;
      margin-bottom: 6px;
      cursor: pointer;
      user-select: none;
    }
    .month-title { font-size: 13px; font-weight: 700; color: #fff; }
    .month-meta { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
    .month-header .arrow { font-size: 9px; transition: transform 0.2s ease; }
    .month-section.collapsed .month-body { display: none; }
    .month-section.collapsed .arrow { transform: rotate(-90deg); }
    .days-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .day-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 8px 12px;
    }
    .day-card.type-holiday {
      background: var(--holiday-bg);
      border-color: rgba(239, 68, 68, 0.4);
    }
    .day-card.type-exam {
      background: var(--exam-bg);
      border-color: rgba(168, 85, 247, 0.45);
    }
    .day-card.type-dayorder {
      background: var(--dayorder-bg);
      border-color: rgba(56, 189, 248, 0.4);
    }
    .day-card.has-personal {
      border-left: 3px solid #3b82f6;
    }
    .date-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      background: rgba(0, 0, 0, 0.3);
      padding: 4px;
      border-radius: 6px;
    }
    .date-num { font-size: 15px; font-weight: 700; line-height: 1; color: #fff; }
    .date-wk { font-size: 9px; font-weight: 600; color: var(--muted); text-transform: uppercase; margin-top: 2px; }
    .info-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .day-header { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .day-title { font-size: 12px; font-weight: 600; color: #fff; }
    .day-sub { font-size: 10px; color: var(--muted); }
    .badge {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
    }
    .badge-holiday { background: rgba(239, 68, 68, 0.25); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .badge-exam { background: rgba(168, 85, 247, 0.25); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.45); }
    .badge-dayorder { background: rgba(56, 189, 248, 0.25); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); }
    .badge-fest { background: rgba(236, 72, 153, 0.25); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.4); }
    .badge-class { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
    .badge-personal { background: rgba(59, 130, 246, 0.25); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4); }
    .mob-pe-list { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; border-top: 1px dashed rgba(255, 255, 255, 0.1); padding-top: 5px; }
    .mob-pe-item { font-size: 11px; background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; padding: 4px 6px; border-radius: 4px; display: flex; flex-direction: column; gap: 2px; }
    .mob-pe-title-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .mob-pe-name { font-weight: 600; color: #93c5fd; font-size: 11px; }
    .mob-pe-time { font-size: 10px; color: #cbd5e1; }
    .mob-pe-desc { font-size: 10px; color: var(--muted); }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <header>
    <div class="header-top">
      <div>
        <h1>🗓️ VIT Academic Calendar</h1>
        <div class="sem-badge">${escapeHtml(semName)}</div>
      </div>
    </div>
    <div class="actions-bar">
      <a href="${icsDataUri}" download="vit_academic_calendar_${escapeHtml(calData.semesterId || "sem")}.ics" class="btn btn-ics">
        📅 Add to Phone Calendar (.ics)
      </a>
      <button onclick="window.print()" class="btn btn-print">🖨️ Print / PDF</button>
    </div>
  </header>

  <div class="stats-grid">
    <div class="stat-chip">
      <span class="val">${instructionalCount}</span>
      <span class="lbl">📚 Classes</span>
    </div>
    <div class="stat-chip">
      <span class="val">${holidaysCount}</span>
      <span class="lbl">🏖️ Holidays</span>
    </div>
    <div class="stat-chip">
      <span class="val">${eventsCount}</span>
      <span class="lbl">📝 Exams & Events</span>
    </div>
    <div class="stat-chip">
      <span class="val">${dayOrdersCount}</span>
      <span class="lbl">🔄 Day Orders</span>
    </div>
    <div class="stat-chip">
      <span class="val">${personalCount}</span>
      <span class="lbl">📌 Personal</span>
    </div>
  </div>

  <div class="filter-sticky">
    <div class="view-switch-row">
      <button type="button" class="view-btn active" id="mobViewTableBtn">🗓️ Calendar Table</button>
      <button type="button" class="view-btn" id="mobViewListBtn">📑 Detailed List</button>
    </div>
    <input type="text" id="mobileSearch" class="search-box" placeholder="🔍 Search event, holiday, day order, date..." />
    <div class="tabs-bar">
      <button class="tab-btn active" data-filter="all">All (${days.length})</button>
      <button class="tab-btn" data-filter="type-holiday">🏖️ Holidays (${holidaysCount})</button>
      <button class="tab-btn" data-filter="type-exam">📝 Exams (${eventsCount})</button>
      <button class="tab-btn" data-filter="type-dayorder">🔄 Day Orders (${dayOrdersCount})</button>
      <button class="tab-btn" data-filter="type-class">📚 Classes (${instructionalCount})</button>
      <button class="tab-btn" data-filter="type-personal">📌 Personal (${personalCount})</button>
    </div>
  </div>

  <div id="mobDayDetailBox" class="mob-detail-box" style="display: none;">
    <div class="mob-detail-header">
      <strong id="mobDetailDate">Date</strong>
      <span id="mobDetailBadge" class="badge">Badge</span>
      <button type="button" class="mob-detail-close" onclick="document.getElementById('mobDayDetailBox').style.display='none'">✕</button>
    </div>
    <div id="mobDetailDesc" class="mob-detail-desc"></div>
    <div id="mobDetailStatus" class="mob-detail-sub"></div>
    <div id="mobDetailPersonalEvents" style="display: none;"></div>
  </div>

  <main id="calendarMonthsContainer">
    ${monthsHtml}
  </main>

  <script>
    (function() {
      var currentFilter = 'all';
      var currentSearch = '';
      var currentView = 'table';
      var tabs = document.querySelectorAll('.tab-btn');
      var searchInput = document.getElementById('mobileSearch');
      var monthSections = document.querySelectorAll('.month-section');
      var viewTableBtn = document.getElementById('mobViewTableBtn');
      var viewListBtn = document.getElementById('mobViewListBtn');
      var detailBox = document.getElementById('mobDayDetailBox');
      var detailDate = document.getElementById('mobDetailDate');
      var detailBadge = document.getElementById('mobDetailBadge');
      var detailDesc = document.getElementById('mobDetailDesc');
      var detailStatus = document.getElementById('mobDetailStatus');
      var detailPe = document.getElementById('mobDetailPersonalEvents');

      function setView(view) {
        currentView = view;
        if (view === 'table') {
          if (viewTableBtn) viewTableBtn.classList.add('active');
          if (viewListBtn) viewListBtn.classList.remove('active');
          document.querySelectorAll('.mob-table-container').forEach(function(el) { el.style.display = 'block'; });
          document.querySelectorAll('.days-list').forEach(function(el) { el.style.display = 'none'; });
        } else {
          if (viewListBtn) viewListBtn.classList.add('active');
          if (viewTableBtn) viewTableBtn.classList.remove('active');
          document.querySelectorAll('.mob-table-container').forEach(function(el) { el.style.display = 'none'; });
          document.querySelectorAll('.days-list').forEach(function(el) { el.style.display = 'flex'; });
        }
      }

      if (viewTableBtn) {
        viewTableBtn.addEventListener('click', function() { setView('table'); });
      }
      if (viewListBtn) {
        viewListBtn.addEventListener('click', function() { setView('list'); });
      }

      document.querySelectorAll('.mob-cell:not(.empty)').forEach(function(cell) {
        cell.addEventListener('click', function() {
          document.querySelectorAll('.mob-cell').forEach(function(c) { c.classList.remove('selected-cell'); });
          cell.classList.add('selected-cell');
          var date = cell.getAttribute('data-date');
          var title = cell.getAttribute('data-title');
          var status = cell.getAttribute('data-status');
          var badge = cell.getAttribute('data-badge');
          var dayOrder = cell.getAttribute('data-dayorder');
          var peRaw = cell.getAttribute('data-pe');

          if (detailDate) detailDate.textContent = date;
          if (detailBadge) {
            detailBadge.textContent = badge || 'Scheduled';
            var bClass = 'badge ';
            if (cell.classList.contains('cell-holiday')) bClass += 'badge-holiday';
            else if (cell.classList.contains('cell-dayorder')) bClass += 'badge-dayorder';
            else if (cell.classList.contains('cell-exam')) bClass += 'badge-exam';
            else if (cell.classList.contains('cell-fest')) bClass += 'badge-fest';
            else bClass += 'badge-class';
            detailBadge.className = bClass;
          }
          if (detailDesc) detailDesc.textContent = title;
          if (detailStatus) {
            var subParts = [];
            if (status) subParts.push('Status: ' + status);
            if (dayOrder) subParts.push('Timetable: ' + dayOrder + ' Day Order');
            detailStatus.textContent = subParts.join(' · ');
          }

          if (detailPe) {
            var peItems = [];
            try { if (peRaw) peItems = JSON.parse(peRaw); } catch(e) {}
            if (peItems && peItems.length > 0) {
              detailPe.style.display = 'block';
              detailPe.innerHTML = '<div style="font-size:11px;font-weight:700;color:#93c5fd;margin:8px 0 3px;">📌 Personal Events:</div>' +
                peItems.map(function(p) {
                  return '<div style="font-size:11px;background:rgba(59,130,246,0.15);padding:4px 6px;border-radius:4px;margin-bottom:3px;border-left:2px solid #3b82f6;"><strong>' +
                    (p.title || '') + '</strong>' +
                    (p.time ? ' (⏰ ' + p.time + ')' : '') +
                    (p.description ? ' - ' + p.description : '') +
                  '</div>';
                }).join('');
            } else {
              detailPe.style.display = 'none';
              detailPe.innerHTML = '';
            }
          }

          if (detailBox) {
            detailBox.style.display = 'block';
            detailBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
      });

      function applyFilter() {
        var query = currentSearch.trim().toLowerCase();
        if (query && currentView !== 'list') {
          setView('list');
        }

        monthSections.forEach(function(sec) {
          var cards = sec.querySelectorAll('.day-card');
          var visibleInMonth = 0;
          cards.forEach(function(card) {
            var matchesType = (currentFilter === 'all') ||
              (currentFilter === 'type-personal' ? card.getAttribute('data-has-personal') === 'true' : card.classList.contains(currentFilter));
            var matchesSearch = !query || card.getAttribute('data-search').indexOf(query) !== -1;
            if (matchesType && matchesSearch) {
              card.classList.remove('hidden');
              visibleInMonth++;
            } else {
              card.classList.add('hidden');
            }
          });
          if (visibleInMonth === 0 && query) {
            sec.classList.add('hidden');
          } else {
            sec.classList.remove('hidden');
          }
        });
      }

      tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
          tabs.forEach(function(t) { t.classList.remove('active'); });
          tab.classList.add('active');
          currentFilter = tab.getAttribute('data-filter');
          if (currentFilter !== 'all' && currentView !== 'list') {
            setView('list');
          }
          applyFilter();
        });
      });

      if (searchInput) {
        searchInput.addEventListener('input', function(e) {
          currentSearch = e.target.value || '';
          applyFilter();
        });
      }
    })();
  <\/script>
</body>
</html>`;
}

async function renderAcademicCalendarDashboard(activeFilter = currentCalendarFilter, searchQuery = currentCalendarSearch) {
  currentCalendarFilter = activeFilter;
  currentCalendarSearch = searchQuery;

  const lastUpdatedEl = document.getElementById("calendarLastUpdated");
  const badgeEl = document.getElementById("calendarSemBadge");
  const semSelect = document.getElementById("calendarSemesterSelect");
  const statsBar = document.getElementById("calendarStatsBar");
  const statInst = document.getElementById("calStatInstructional");
  const statHol = document.getElementById("calStatHolidays");
  const statEve = document.getElementById("calStatEvents");
  const statDay = document.getElementById("calStatDayOrders");
  const statPersonal = document.getElementById("calStatPersonal");
  const daysCountEl = document.getElementById("calendarTotalDaysCount");
  const containerEl = document.getElementById("calendarDaysContainer");

  if (!lastUpdatedEl) return;

  await getPersonalEvents();

  const stored = await chrome.storage.local.get(CALENDAR_STORAGE_KEY);
  let calData = stored[CALENDAR_STORAGE_KEY] || null;

  if (!calData && window.VITCM_DB?.loadCalendarData) {
    try {
      calData = await window.VITCM_DB.loadCalendarData();
      if (calData) {
        await chrome.storage.local.set({ [CALENDAR_STORAGE_KEY]: calData });
      }
    } catch (_dbErr) {}
  }

  // Migrate legacy multi-semester calendar store if present: retain ONLY the latest semester
  if (calData && calData.semesters) {
    const chosenSemId = calData.selectedSemesterId || calData.semesterId || Object.keys(calData.semesters)[0];
    const latestSemRecord = calData.semesters[chosenSemId] || calData;
    calData = {
      semesterId: latestSemRecord.id || chosenSemId,
      semesterName: latestSemRecord.name || latestSemRecord.semesterName || "Current Semester",
      selectedSemesterId: latestSemRecord.id || chosenSemId,
      days: latestSemRecord.days || [],
      daysCount: (latestSemRecord.days || []).length,
      holidaysCount: latestSemRecord.holidaysCount || 0,
      eventsCount: latestSemRecord.eventsCount || 0,
      instructionalCount: latestSemRecord.instructionalCount || 0,
      dayOrdersCount: latestSemRecord.dayOrdersCount || 0,
      startDate: latestSemRecord.startDate || latestSemRecord.days?.[0]?.date || "",
      endDate: latestSemRecord.endDate || latestSemRecord.days?.[latestSemRecord.days?.length - 1]?.date || "",
      lastChecked: calData.lastChecked || Date.now(),
      lastUpdated: calData.lastUpdated || Date.now()
    };
    await chrome.storage.local.set({ [CALENDAR_STORAGE_KEY]: calData });
    if (window.VITCM_DB?.saveCalendarData) {
      await window.VITCM_DB.saveCalendarData(calData);
    }
  }

  cachedCalendarData = calData;

  if (!calData || !calData.days || calData.days.length === 0) {
    lastUpdatedEl.textContent = "Not synced yet";
    if (badgeEl) badgeEl.style.display = "none";
    if (statsBar) statsBar.style.display = "none";
    if (daysCountEl) daysCountEl.textContent = "0";
    if (semSelect) semSelect.innerHTML = '<option value="">Latest General Semester</option>';
    if (containerEl) {
      containerEl.innerHTML = '<p class="empty-calendar-hint">Log in to VTOP or click Sync to extract the Academic Calendar.</p>';
    }
    return;
  }

  const activeRecord = calData;
  const days = calData.days || [];
  const activeSemName = calData.semesterName || "Current Semester";
  const semStartDate = calData.startDate || days[0]?.date || "";
  const semEndDate = calData.endDate || days[days.length - 1]?.date || "";

  // Automatically delete any personal events from old semesters (outside current semester date bounds)
  if (days.length > 0 && semStartDate) {
    const validPes = (cachedPersonalEvents || []).filter((e) => {
      if (!e.date) return false;
      if (semStartDate && e.date < semStartDate) return false;
      if (semEndDate && e.date > semEndDate) return false;
      return true;
    });

    if (validPes.length !== (cachedPersonalEvents || []).length) {
      cachedPersonalEvents = validPes;
      await chrome.storage.local.set({ [PERSONAL_EVENTS_STORAGE_KEY]: validPes });
      if (window.VITCM_DB?.savePersonalEvents) {
        await window.VITCM_DB.savePersonalEvents(validPes);
      }
    }
  }

  const personalTotalCount = (cachedPersonalEvents || []).length;
  if (statPersonal) statPersonal.textContent = String(personalTotalCount);

  if (semSelect) {
    semSelect.innerHTML = `<option value="${escapeHtml(calData.semesterId)}" selected>${escapeHtml(activeSemName)} (Current)</option>`;
    semSelect.value = calData.semesterId;
  }

  // Normalize days: Working Saturdays & Day Orders are instructional working days, NEVER holidays
  days.forEach((d) => {
    const isWorkingSaturday = Boolean(d.dayOrder) || /day\s*order|working\s*saturday/i.test(`${d.eventDescription || ""} ${d.label || ""}`);
    if (isWorkingSaturday) {
      d.isHoliday = false;
      d.isInstructional = true;
      d.instructional = true;
      d.instructionalStatus = "Instructional Day";
      d.category = "dayorder";
    }
    if (d.isExam) {
      d.isHoliday = false;
      d.isInstructional = true;
      d.instructional = true;
    }
    if (d.isInstructional === undefined) d.isInstructional = Boolean(d.instructional);
    if (d.instructional === undefined) d.instructional = Boolean(d.isInstructional);
    if (!d.dayOfWeek) d.dayOfWeek = d.weekday || weekdayOf(d.date);
    if (!d.eventDescription) d.eventDescription = d.label || "";
  });

  lastUpdatedEl.textContent = `Last checked: ${formatCalendarTimestamp(calData.lastChecked || calData.lastUpdated)}`;
  if (badgeEl) {
    badgeEl.textContent = activeSemName;
    badgeEl.style.display = "inline-block";
  }

  const instCount = days.filter((d) => d.isInstructional || d.instructional).length;
  const holCount = days.filter((d) => d.isHoliday).length;
  const eveCount = days.filter((d) => d.isExam || d.isEvent || d.isFest).length;
  const dayOrderCount = days.filter((d) => Boolean(d.dayOrder)).length;

  if (statInst) statInst.textContent = String(instCount);
  if (statHol) statHol.textContent = String(holCount);
  if (statEve) statEve.textContent = String(eveCount);
  if (statDay) statDay.textContent = String(dayOrderCount);
  if (statPersonal) statPersonal.textContent = String(personalTotalCount);
  if (daysCountEl) daysCountEl.textContent = String(days.length);
  if (statsBar) statsBar.style.display = "flex";

  // Month resolution for Table view
  const monthNamesFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const availableMonths = [];
  days.forEach((d) => {
    if (d.date && d.date.length >= 7) {
      const mKey = d.date.slice(0, 7);
      if (!availableMonths.includes(mKey)) {
        availableMonths.push(mKey);
      }
    }
  });
  availableMonths.sort();

  const nowMonthKey = new Date().toISOString().slice(0, 7);
  if (!currentCalendarMonth || !availableMonths.includes(currentCalendarMonth)) {
    if (availableMonths.includes(nowMonthKey)) {
      currentCalendarMonth = nowMonthKey;
    } else {
      currentCalendarMonth = availableMonths[0] || nowMonthKey;
    }
  }

  const monthSelect = document.getElementById("calMonthSelect");
  if (monthSelect) {
    if (availableMonths.length > 0) {
      monthSelect.innerHTML = availableMonths.map((mKey) => {
        const parts = mKey.split("-").map(Number);
        const label = `${monthNamesFull[(parts[1] || 1) - 1] || "Month"} ${parts[0]}`;
        const isSel = mKey === currentCalendarMonth ? "selected" : "";
        return `<option value="${escapeHtml(mKey)}" ${isSel}>${escapeHtml(label)}</option>`;
      }).join("");
      monthSelect.value = currentCalendarMonth;
    } else {
      monthSelect.innerHTML = '<option value="">No Months</option>';
    }
  }

  // 1. Render Calendar Table View (Default)
  renderCalendarMonthTable(activeRecord, currentCalendarMonth);

  // Auto-inspect day detail
  if (selectedDayDate) {
    const sDay = days.find((d) => d.date === selectedDayDate);
    if (sDay) showCalendarDayDetail(sDay);
  } else {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayDay = days.find((d) => d.date === todayStr);
    if (todayDay && todayDay.date.startsWith(currentCalendarMonth)) {
      showCalendarDayDetail(todayDay);
    } else {
      const firstMonthDay = days.find((d) => d.date && d.date.startsWith(currentCalendarMonth) && (d.dayOrder || d.isHoliday || d.isExam));
      if (firstMonthDay) showCalendarDayDetail(firstMonthDay);
    }
  }

  // Toggle Table View vs List View
  const tableView = document.getElementById("calendarTableView");
  const listView = document.getElementById("calendarListView");
  const tableToggle = document.getElementById("calViewTableBtn");
  const listToggle = document.getElementById("calViewListBtn");

  if (currentCalendarViewMode === "table") {
    if (tableView) tableView.style.display = "block";
    if (listView) listView.style.display = "none";
    if (tableToggle) tableToggle.classList.add("active");
    if (listToggle) listToggle.classList.remove("active");
  } else {
    if (tableView) tableView.style.display = "none";
    if (listView) listView.style.display = "block";
    if (tableToggle) tableToggle.classList.remove("active");
    if (listToggle) listToggle.classList.add("active");
  }

  // 2. Render Calendar List View
  const query = (searchQuery || "").trim().toLowerCase();
  const filteredDays = days.filter((d) => {
    const dayPes = (cachedPersonalEvents || []).filter((e) => e.date === d.date);
    if (activeFilter === "working" && (!d.isInstructional && !d.instructional)) return false;
    if (activeFilter === "holidays" && !d.isHoliday) return false;
    if (activeFilter === "events" && !(d.isExam || d.isEvent || d.isFest)) return false;
    if (activeFilter === "dayorders" && !d.dayOrder) return false;
    if (activeFilter === "personal" && dayPes.length === 0) return false;

    if (query) {
      const peHaystack = dayPes.map((p) => `${p.title} ${p.description || ""} ${p.category || ""}`).join(" ");
      const haystack = `${d.date || ""} ${d.dayOfWeek || ""} ${d.eventDescription || ""} ${d.label || ""} ${d.instructionalStatus || ""} ${d.dayOrder || ""} ${peHaystack}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  if (!containerEl) return;

  if (filteredDays.length === 0) {
    containerEl.innerHTML = '<p class="empty-calendar-hint">No matching days found.</p>';
    return;
  }

  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  containerEl.innerHTML = filteredDays.map((day) => {
    const parts = (day.date || "").split("-");
    const moNum = parseInt(parts[1] || "1", 10);
    const da = parts[2] || "01";
    const moStr = monthNames[moNum - 1] || "";
    const wk = (day.dayOfWeek || "").toUpperCase();

    const cardClasses = ["cal-day-card"];
    if (day.isHoliday) cardClasses.push("is-holiday");
    if (day.isExam || day.isEvent || day.isFest) cardClasses.push("is-event");
    if (day.dayOrder) cardClasses.push("is-dayorder");
    if (!day.isHoliday && (day.isInstructional || day.instructional) && !day.isExam && !day.dayOrder) {
      cardClasses.push("is-class");
    }

    const badges = [];
    let mainTitle = "";
    let subText = "";

    if (day.isExam) {
      badges.push('<span class="cal-badge badge-exam">📝 Exam</span>');
      mainTitle = day.eventDescription || "Examination";
      subText = day.instructionalStatus || "";
    } else if (day.dayOrder) {
      badges.push(`<span class="cal-badge badge-dayorder">🔄 ${escapeHtml(day.dayOrder)} Day Order</span>`);
      mainTitle = day.eventDescription || `Working Saturday (${day.dayOrder} Day Order)`;
      subText = day.instructionalStatus || "Instructional Day";
    } else if (day.isHoliday) {
      badges.push('<span class="cal-badge badge-holiday">🏖️ Holiday</span>');
      mainTitle = day.eventDescription || (day.isSunday ? "Sunday" : "Holiday");
      subText = day.instructionalStatus || "Holiday";
    } else if (day.isFest) {
      badges.push('<span class="cal-badge badge-fest">🎉 Fest</span>');
      mainTitle = day.eventDescription || "College Fest";
      subText = day.instructionalStatus || "";
    } else if (day.isInstructional || day.instructional) {
      badges.push('<span class="cal-badge badge-instructional">📚 Class</span>');
      mainTitle = day.eventDescription || "Instructional Day";
      subText = day.instructionalStatus || "Instructional Day";
    } else {
      mainTitle = day.eventDescription || day.instructionalStatus || "Scheduled Day";
      subText = day.instructionalStatus || "";
    }

    // Include personal events badges
    const dayPes = (cachedPersonalEvents || []).filter((e) => e.date === day.date);
    if (dayPes.length > 0) {
      cardClasses.push("has-personal");
      dayPes.forEach((pe) => {
        const catEmoji = pe.category === "assignment" ? "📝" : (pe.category === "exam" ? "⏰" : (pe.category === "reminder" ? "🔔" : (pe.category === "club" ? "👥" : "📌")));
        badges.push(`<span class="cal-badge badge-${escapeHtml(pe.category || 'personal')}" title="${escapeHtml(pe.description || '')}">${catEmoji} ${escapeHtml(pe.title)}</span>`);
      });
    }

    return `
      <div class="${cardClasses.join(" ")}" data-date="${escapeHtml(day.date)}">
        <div class="cal-date-col">
          <span class="cal-date-num">${escapeHtml(da)}</span>
          <span class="cal-date-wk">${escapeHtml(moStr)} · ${escapeHtml(wk)}</span>
        </div>
        <div class="cal-info-col">
          <div class="cal-day-header">
            <span class="cal-day-title" title="${escapeHtml(mainTitle)}">${escapeHtml(mainTitle)}</span>
            ${badges.join(" ")}
          </div>
          ${subText ? `<div class="cal-day-sub">${escapeHtml(subText)}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  const cards = Array.from(document.querySelectorAll(".site-card"));
  const hint = document.getElementById("activeSiteHint");
  const quickActionButtons = Array.from(document.querySelectorAll("[data-quick-action]"));
  const googleConnectBtn = document.getElementById("googleConnectBtn");
  const googleDisconnectBtn = document.getElementById("googleDisconnectBtn");

  let activeSite = null;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    activeSite = detectSiteKeyFromUrl(tab.url);
  }

  if (hint) {
    if (activeSite && SITE_CONFIG[activeSite]) {
      hint.textContent = `Active site: ${SITE_CONFIG[activeSite].title}`;
    } else {
      hint.textContent = "Active site: Not detected";
    }
  }

  const data = await getStorageData();
  for (const card of cards) {
    const siteKey = card.dataset.siteKey;
    if (siteKey === activeSite) {
      card.classList.add("active-site");
    }

    await populateCard(card, data[siteKey] || getDefaultSiteState());
    applyCardStatus(card, "Stored locally", "success");
    setCaptchaSuggestion(card, "");

    const assistButton = card.querySelector('[data-action="assist"]');
    if (assistButton) {
      assistButton.addEventListener("click", async () => {
        setCaptchaSuggestion(card, "");
        applyCardStatus(card, "Captcha request sent", "success");

        const result = await requestCaptchaAssist(siteKey);
        if (!result.ok) {
          applyCardStatus(card, `Captcha assist failed: ${result.reason}`, "error");
          return;
        }

        const suggestion = String(result.text || "").trim();
        setCaptchaSuggestion(card, suggestion);
        applyCardStatus(card, suggestion ? `Captcha parsed: ${suggestion}` : "Captcha parse failed", suggestion ? "success" : "error");
      });
    }

    const saveButton = card.querySelector('[data-action="save"]');
    if (saveButton) {
      saveButton.addEventListener("click", async () => {
        const state = collectCardState(card);
        try {
          const encrypted = await VITCM_CRYPTO.encryptJson(
            { username: state.username, password: state.password },
            MASTER_KEY
          );

          const nextData = await getStorageData();
          nextData[siteKey] = {
            encrypted,
            toggles: state.toggles
          };

          if (siteKey === "vtop") {
            nextData["codet"] = {
              encrypted,
              toggles: nextData["codet"]?.toggles || { fillForm: true, fillCaptcha: false, autoSubmit: false }
            };
            nextData["ffcs"] = {
              encrypted,
              toggles: nextData["ffcs"]?.toggles || { fillForm: true, fillCaptcha: false, autoSubmit: false }
            };
          }

          await setStorageData(nextData);

          for (const c of cards) {
            const sKey = c.dataset.siteKey;
            await populateCard(c, nextData[sKey] || getDefaultSiteState());
          }

          const applied = await applyToActiveTab(siteKey);
          applyCardStatus(card, applied ? "Saved and applied" : "Stored locally", "success");
        } catch (error) {
          applyCardStatus(card, "Save failed", "error");
        }
      });
    }
  }

  quickActionButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      await runQuickAction(button.dataset.quickAction);
    });
  });

  if (googleConnectBtn) {
    googleConnectBtn.addEventListener("click", async () => {
      await connectGoogleCalendar();
    });
  }

  if (googleDisconnectBtn) {
    googleDisconnectBtn.addEventListener("click", async () => {
      await disconnectGoogleCalendar();
    });
  }

  const copyExamBtn = document.getElementById('copyExamBtn');
  if (copyExamBtn) {
    copyExamBtn.addEventListener('click', async () => {
      const statusEl = document.getElementById('quickActionStatus');
      statusEl.textContent = 'Copying exam schedule...';
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          statusEl.textContent = 'No active tab found.';
          return;
        }

        // Execute script in the page to extract exam data and return a markdown string
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: false },
          func: function () {
            try {
              const tb = document.getElementsByTagName('tbody')[0];
              if (!tb || !tb.rows) return '';
              const rows = Array.from(tb.rows);
              const sections = [];
              for (let i = 0; i < rows.length; i++) {
                const first = rows[i].children && rows[i].children[0];
                if (!first) continue;
                if (first.className === 'panelHead-secondary') {
                  const header = first.innerText.trim();
                  const details = { header, rows: [] };
                  let j = i + 1;
                  while (j < rows.length) {
                    const r = rows[j];
                    const c0 = r.children && r.children[0];
                    if (c0 && c0.className === 'panelHead-secondary') break;
                    const code = (r.children[1] && r.children[1].innerText) || '';
                    const title = (r.children[2] && r.children[2].innerText) || '';
                    const date = (r.children[6] && r.children[6].innerText) || '';
                    const time = (r.children[9] && r.children[9].innerText) || '';
                    const venue = (r.children[10] && r.children[10].innerText) || '';
                    const seat = (r.children[11] && r.children[11].innerText) || '';
                    details.rows.push({ code, title, date, time, venue, seat });
                    j++;
                  }
                  sections.push(details);
                }
              }
              // format as markdown
              const out = [];
              for (const s of sections) {
                out.push('### ' + s.header);
                out.push('| Course Code | Course Title | Date | Time | Venue | Seat Location |');
                out.push('|---|---|---|---|---|---|');
                for (const r of s.rows) {
                  const cols = [r.code, r.title, r.date, r.time, r.venue, r.seat].map(c => (c || '').replace(/\|/g, '\\|'));
                  out.push('| ' + cols.join(' | ') + ' |');
                }
                out.push('');
              }
              return out.join('\n');
            } catch (e) {
              return '';
            }
          }
        });

        const md = results && results[0] && results[0].result ? results[0].result : '';
        if (!md) {
          statusEl.textContent = 'No exam schedule found on the page.';
          return;
        }

        // Copy from the popup context (safer for clipboard)
        try {
          await navigator.clipboard.writeText(md);
          statusEl.textContent = 'Exam schedule copied to clipboard.';
        } catch (e) {
          // fallback: open a new tab with the markdown so user can copy manually
          statusEl.textContent = 'Copy failed (clipboard). Opening viewer.';
          const blob = new Blob([md], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          chrome.tabs.create({ url });
        }
      } catch (error) {
        document.getElementById('quickActionStatus').textContent = 'Copy failed: ' + (error && error.message ? error.message : String(error));
      }
    });
  }

  await refreshGoogleSyncStatus();

  await autoApplyMarksEnhancement(tab);

  // --- exam section picker and copy controls ---
  const copySelect = document.getElementById('copyExamSelect');
  const refreshBtn = document.getElementById('refreshExamBtn');
  const copyBtn = document.getElementById('copySelectedExamBtn');
  const statusEl = document.getElementById('quickActionStatus');

  const fetchSections = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return [];
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: false },
        func: function () {
          try {
            const tb = document.getElementsByTagName('tbody')[0];
            if (!tb || !tb.rows) return [];
            const rows = Array.from(tb.rows);
            const sections = [];
            for (let i = 0; i < rows.length; i++) {
              const first = rows[i].children && rows[i].children[0];
              if (!first) continue;
              if (first.className === 'panelHead-secondary') {
                const header = first.innerText.trim();
                let count = 0;
                let j = i + 1;
                while (j < rows.length) {
                  const r = rows[j];
                  const c0 = r.children && r.children[0];
                  if (c0 && c0.className === 'panelHead-secondary') break;
                  count++;
                  j++;
                }
                sections.push({ header, count });
              }
            }
            return sections;
          } catch (e) { return []; }
        }
      });
      return (res && res[0] && res[0].result) || [];
    } catch (e) {
      return [];
    }
  };

  const populateSelect = (sections) => {
    if (!copySelect) return;
    // clear existing (keep the ALL option)
    const allOption = copySelect.querySelector('option[value="ALL"]');
    copySelect.innerHTML = '';
    copySelect.appendChild(new Option('Select exam section', ''));
    copySelect.appendChild(allOption || new Option('Copy All Sections', 'ALL'));
    for (const s of sections) {
      const label = `${s.header} (${s.count} rows)`;
      copySelect.appendChild(new Option(label, s.header));
    }
  };

  const getMarkdownForHeader = async (header, format = 'MARKDOWN') => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return '';
    const res = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      func: function (targetHeader, targetFormat) {
        try {
          const tb = document.getElementsByTagName('tbody')[0];
          if (!tb || !tb.rows) return '';
          const rows = Array.from(tb.rows);
          const sections = [];
          for (let i = 0; i < rows.length; i++) {
            const first = rows[i].children && rows[i].children[0];
            if (!first) continue;
            if (first.className === 'panelHead-secondary') {
              const header = first.innerText.trim();
              const details = { header, rows: [] };
              let j = i + 1;
              while (j < rows.length) {
                const r = rows[j];
                const c0 = r.children && r.children[0];
                if (c0 && c0.className === 'panelHead-secondary') break;
                const code = (r.children[1] && r.children[1].innerText) || '';
                const title = (r.children[2] && r.children[2].innerText) || '';
                const date = (r.children[6] && r.children[6].innerText) || '';
                const time = (r.children[9] && r.children[9].innerText) || '';
                const venue = (r.children[10] && r.children[10].innerText) || '';
                const seat = (r.children[11] && r.children[11].innerText) || '';
                details.rows.push({ code, title, date, time, venue, seat });
                j++;
              }
              sections.push(details);
            }
          }
          const filtered = targetHeader === 'ALL' ? sections : sections.filter(s => s.header === targetHeader);
          const out = [];
          for (const s of filtered) {
            if (targetFormat === 'WHATSAPP') {
              out.push('*' + s.header + '*');
              for (const r of s.rows) {
                const line = `${r.code} — ${r.title}\n${r.date} | ${r.time} | ${r.venue} | ${r.seat}`;
                out.push(line);
              }
              out.push('');
            } else {
              out.push('### ' + s.header);
              out.push('| Course Code | Course Title | Date | Time | Venue | Seat Location |');
              out.push('|---|---|---|---|---|---|');
              for (const r of s.rows) {
                const cols = [r.code, r.title, r.date, r.time, r.venue, r.seat].map(c => (c || '').replace(/\|/g, '\\|'));
                out.push('| ' + cols.join(' | ') + ' |');
              }
              out.push('');
            }
          }
          return out.join('\n');
        } catch (e) { return ''; }
      },
      args: [header, format]
    });
    return (res && res[0] && res[0].result) || '';
  };

  // initialize
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      statusEl.textContent = 'Refreshing exam list...';
      const sections = await fetchSections();
      populateSelect(sections);
      statusEl.textContent = sections.length ? `Found ${sections.length} sections` : 'No exam sections found';
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const val = copySelect ? copySelect.value : '';
      if (!val) {
        statusEl.textContent = 'Please select a section to copy.';
        return;
      }
      const formatSelect = document.getElementById('copyFormatSelect');
      const format = formatSelect ? formatSelect.value : 'MARKDOWN';
      statusEl.textContent = format === 'WHATSAPP' ? 'Preparing WhatsApp text...' : 'Preparing exam markdown...';
      const md = await getMarkdownForHeader(val, format);
      if (!md) {
        statusEl.textContent = 'No data found for that section.';
        return;
      }
      try {
        await navigator.clipboard.writeText(md);
        statusEl.textContent = format === 'WHATSAPP' ? 'WhatsApp text copied to clipboard.' : 'Selected exam section copied to clipboard.';
      } catch (e) {
        statusEl.textContent = 'Copy failed: opening viewer.';
        const blob = new Blob([md], { type: format === 'WHATSAPP' ? 'text/plain' : 'text/markdown' });
        const url = URL.createObjectURL(blob);
        chrome.tabs.create({ url });
      }
    });
  }

  // auto-refresh on open
  (async () => {
    const sections = await fetchSections();
    populateSelect(sections);
    if (statusEl) statusEl.textContent = sections.length ? `Found ${sections.length} sections` : 'No exam sections found';
  })();

  // --- Marks Dashboard Setup ---
  await renderStoredMarksDashboard();

  // --- Academic Calendar Dashboard Setup ---
  await renderAcademicCalendarDashboard();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes[MARKS_STORAGE_KEY]) {
        renderStoredMarksDashboard();
      }
      if (changes[CALENDAR_STORAGE_KEY]) {
        renderAcademicCalendarDashboard();
      }
      if (changes[PERSONAL_EVENTS_STORAGE_KEY]) {
        renderAcademicCalendarDashboard();
      }
    }
  });

  const toggleStoredMarksBtn = document.getElementById("toggleStoredMarksBtn");
  const storedMarksPanel = document.getElementById("storedMarksPanel");
  const storedMarksArrow = document.getElementById("storedMarksArrow");

  if (toggleStoredMarksBtn && storedMarksPanel) {
    toggleStoredMarksBtn.addEventListener("click", () => {
      const isHidden = storedMarksPanel.style.display === "none";
      storedMarksPanel.style.display = isHidden ? "flex" : "none";
      if (storedMarksArrow) {
        if (isHidden) {
          storedMarksArrow.classList.add("open");
        } else {
          storedMarksArrow.classList.remove("open");
        }
      }
    });
  }

  const clearMarksBadgeBtn = document.getElementById("clearMarksBadgeBtn");
  if (clearMarksBadgeBtn) {
    clearMarksBadgeBtn.addEventListener("click", async () => {
      const recentBox = document.getElementById("recentMarksUpdatesBox");
      if (recentBox) recentBox.style.display = "none";
      const badgeEl = document.getElementById("marksUpdateBadge");
      if (badgeEl) badgeEl.style.display = "none";

      const stored = await chrome.storage.local.get(MARKS_STORAGE_KEY);
      if (stored[MARKS_STORAGE_KEY]) {
        stored[MARKS_STORAGE_KEY].unreadUpdatesCount = 0;
        stored[MARKS_STORAGE_KEY].recentUpdates = [];
        await chrome.storage.local.set({ [MARKS_STORAGE_KEY]: stored[MARKS_STORAGE_KEY] });
        try {
          if (window.VITCM_DB?.saveMarksData) {
            await window.VITCM_DB.saveMarksData(stored[MARKS_STORAGE_KEY]);
          }
        } catch (_e) {}
      }
    });
  }

  const marksSemesterSelect = document.getElementById("marksSemesterSelect");
  if (marksSemesterSelect) {
    marksSemesterSelect.addEventListener("change", async () => {
      const val = marksSemesterSelect.value;
      const stored = await chrome.storage.local.get(MARKS_STORAGE_KEY);
      if (stored[MARKS_STORAGE_KEY]) {
        stored[MARKS_STORAGE_KEY].selectedSemesterId = val;
        await chrome.storage.local.set({ [MARKS_STORAGE_KEY]: stored[MARKS_STORAGE_KEY] });
      }
      await renderStoredMarksDashboard();
    });
  }

  const storedMarksContainer = document.getElementById("storedMarksContainer");
  if (storedMarksContainer) {
    storedMarksContainer.addEventListener("click", (e) => {
      if (e.target && e.target.closest("#syncCurrentSelectedSemBtn")) {
        if (syncMarksBtn) syncMarksBtn.click();
      }
    });
  }

  const syncAllSemestersBtn = document.getElementById("syncAllSemestersBtn");
  if (syncAllSemestersBtn) {
    syncAllSemestersBtn.addEventListener("click", async () => {
      const origText = syncAllSemestersBtn.textContent;
      syncAllSemestersBtn.textContent = "Syncing All...";
      syncAllSemestersBtn.disabled = true;

      try {
        const tabs = await chrome.tabs.query({ url: "*://vtopcc.vit.ac.in/*" });
        if (tabs.length === 0 || !tabs[0]?.id) {
          if (quickActionStatus) {
            quickActionStatus.textContent = "Opening VTOP tab. Please log in to sync all semesters.";
          }
          chrome.tabs.create({ url: "https://vtopcc.vit.ac.in/vtop/open/page" });
          return;
        }

        if (quickActionStatus) {
          quickActionStatus.textContent = "Syncing all semesters from VTOP in background...";
        }

        const res = await sendMessageWithInjectionFallback(tabs[0].id, {
          message: "scrape_all_semesters"
        });

        if (res?.ok) {
          await renderStoredMarksDashboard();
          if (quickActionStatus) {
            quickActionStatus.textContent = `🎉 Synced ${res.syncedCount || 0} of ${res.totalAvailable || 0} semester(s)!`;
          }
        } else {
          if (quickActionStatus) {
            quickActionStatus.textContent = `Sync notice: ${res?.reason || res?.error || "Could not sync all semesters."}`;
          }
        }
      } catch (err) {
        if (quickActionStatus) {
          quickActionStatus.textContent = `Sync failed: ${err?.message || String(err)}`;
        }
      } finally {
        syncAllSemestersBtn.textContent = origText;
        syncAllSemestersBtn.disabled = false;
      }
    });
  }

  function generateMultiSheetExcel(data) {
    const escapeXml = (str) => {
      if (str === null || str === undefined) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    const semesters = data?.semesters || {};
    const validSems = Object.values(semesters).filter(
      (s) => s && s.courses && Object.keys(s.courses).length > 0
    );

    if (validSems.length === 0) {
      return null;
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
    xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
    xml += ' <Styles>\n';
    xml += '  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/></Style>\n';
    xml += '  <Style ss:ID="SemHeader"><Font ss:Bold="1" ss:Size="13" ss:Color="#FFFFFF"/><Interior ss:Color="#0F172A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>\n';
    xml += '  <Style ss:ID="CourseHeader"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>\n';
    xml += '  <Style ss:ID="ColHeader"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#334155" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>\n';
    xml += '  <Style ss:ID="TotalRow"><Font ss:Bold="1" ss:Color="#000000"/><Interior ss:Color="#CBD5E1" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>\n';
    xml += '  <Style ss:ID="DataCell"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>\n';
    xml += '  <Style ss:ID="DataLeft"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>\n';
    xml += ' </Styles>\n';

    const usedSheetNames = new Set();

    for (const sem of validSems) {
      let rawSheetName = (sem.name || sem.id || "Semester").replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31);
      if (!rawSheetName) rawSheetName = "Semester";
      let sheetName = rawSheetName;
      let counter = 1;
      while (usedSheetNames.has(sheetName)) {
        sheetName = `${rawSheetName.slice(0, 27)}_${counter++}`;
      }
      usedSheetNames.add(sheetName);

      xml += ` <Worksheet ss:Name="${escapeXml(sheetName)}">\n`;
      xml += '  <Table>\n';
      xml += '   <Column ss:Width="45"/>\n';
      xml += '   <Column ss:Width="200"/>\n';
      xml += '   <Column ss:Width="70"/>\n';
      xml += '   <Column ss:Width="85"/>\n';
      xml += '   <Column ss:Width="70"/>\n';
      xml += '   <Column ss:Width="80"/>\n';
      xml += '   <Column ss:Width="95"/>\n';
      xml += '   <Column ss:Width="80"/>\n';
      xml += '   <Column ss:Width="160"/>\n';

      // Semester Title Header
      xml += '   <Row ss:Height="24">\n';
      xml += `    <Cell ss:MergeAcross="8" ss:StyleID="SemHeader"><Data ss:Type="String">  ${escapeXml(sem.name || sem.id)}</Data></Cell>\n`;
      xml += '   </Row>\n';
      xml += '   <Row><Cell><Data ss:Type="String"></Data></Cell></Row>\n';

      const courses = sem.courses || {};
      let courseIndex = 1;

      for (const [courseKey, course] of Object.entries(courses)) {
        const courseTitleDisplay = `${course.courseCode || ""} - ${course.courseTitle || courseKey} (${course.subType || course.courseType || "General"})`;
        const facultySlot = [
          course.faculty ? `Faculty: ${course.faculty}` : "",
          course.slot ? `Slot: ${course.slot}` : "",
          course.classNbr ? `Class: ${course.classNbr}` : ""
        ].filter(Boolean).join(" | ");

        // Course Section Banner
        xml += '   <Row ss:Height="20">\n';
        xml += `    <Cell ss:MergeAcross="8" ss:StyleID="CourseHeader"><Data ss:Type="String">  ${courseIndex}. ${escapeXml(courseTitleDisplay)}${facultySlot ? `  [ ${escapeXml(facultySlot)} ]` : ""}</Data></Cell>\n`;
        xml += '   </Row>\n';

        // Assessment Column Headers
        xml += '   <Row ss:Height="18">\n';
        xml += '    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Sl.No.</Data></Cell>\n';
        xml += '    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Mark Title</Data></Cell>\n';
        xml += '    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Max Mark</Data></Cell>\n';
        xml += '    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Weightage %</Data></Cell>\n';
        xml += '    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Status</Data></Cell>\n';
        xml += '    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Scored Mark</Data></Cell>\n';
        xml += '    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Weightage Mark</Data></Cell>\n';
        xml += '    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Class Avg</Data></Cell>\n';
        xml += '    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Remark</Data></Cell>\n';
        xml += '   </Row>\n';

        const assessments = course.assessments || [];
        assessments.forEach((ass, aIdx) => {
          const scoredIsNum = ass.scored !== "-" && ass.scored !== "N/A" && ass.scored !== "" && !isNaN(Number(ass.scored));
          const wtIsNum = ass.weightageEqui !== "-" && ass.weightageEqui !== "N/A" && ass.weightageEqui !== "" && !isNaN(Number(ass.weightageEqui));
          const maxIsNum = !isNaN(Number(ass.maxMarks));
          const wtPIsNum = !isNaN(Number(ass.weightagePercent));

          xml += '   <Row>\n';
          xml += `    <Cell ss:StyleID="DataCell"><Data ss:Type="Number">${aIdx + 1}</Data></Cell>\n`;
          xml += `    <Cell ss:StyleID="DataLeft"><Data ss:Type="String">${escapeXml(ass.title)}</Data></Cell>\n`;
          xml += `    <Cell ss:StyleID="DataCell"><Data ss:Type="${maxIsNum ? "Number" : "String"}">${escapeXml(ass.maxMarks)}</Data></Cell>\n`;
          xml += `    <Cell ss:StyleID="DataCell"><Data ss:Type="${wtPIsNum ? "Number" : "String"}">${escapeXml(ass.weightagePercent)}</Data></Cell>\n`;
          xml += `    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(ass.status || "")}</Data></Cell>\n`;
          xml += `    <Cell ss:StyleID="DataCell"><Data ss:Type="${scoredIsNum ? "Number" : "String"}">${escapeXml(ass.scored)}</Data></Cell>\n`;
          xml += `    <Cell ss:StyleID="DataCell"><Data ss:Type="${wtIsNum ? "Number" : "String"}">${escapeXml(ass.weightageEqui)}</Data></Cell>\n`;
          xml += `    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(ass.classAvg || "-")}</Data></Cell>\n`;
          xml += '    <Cell ss:StyleID="DataCell"><Data ss:Type="String"></Data></Cell>\n';
          xml += '   </Row>\n';
        });

        // Summary row
        if (course.summary) {
          xml += '   <Row ss:StyleID="TotalRow">\n';
          xml += '    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">Total:</Data></Cell>\n';
          xml += '    <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>\n';
          xml += `    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">${escapeXml(course.summary.totalMaxMarks || "-")}</Data></Cell>\n`;
          xml += `    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">${escapeXml(course.summary.totalWeightage || "-")}</Data></Cell>\n`;
          xml += '    <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>\n';
          xml += `    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">${escapeXml(course.summary.totalScored || "-")}</Data></Cell>\n`;
          xml += `    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">${escapeXml(course.summary.totalWeightageScored || "-")}</Data></Cell>\n`;
          xml += '    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">-</Data></Cell>\n';
          xml += `    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">Lost Wt: ${escapeXml(course.summary.lostWeightage || "-")}</Data></Cell>\n`;
          xml += '   </Row>\n';
        }

        xml += '   <Row><Cell><Data ss:Type="String"></Data></Cell></Row>\n';
        courseIndex++;
      }

      xml += '  </Table>\n';
      xml += ' </Worksheet>\n';
    }

    xml += '</Workbook>\n';
    return xml;
  }

  const exportDbBtn = document.getElementById("exportDbBtn");
  if (exportDbBtn) {
    exportDbBtn.addEventListener("click", async () => {
      try {
        const stored = await chrome.storage.local.get(MARKS_STORAGE_KEY);
        let data = stored[MARKS_STORAGE_KEY];
        if (!data && window.VITCM_DB?.loadMarksData) {
          data = await window.VITCM_DB.loadMarksData();
        }
        if (!data || !data.semesters || Object.keys(data.semesters).length === 0) {
          if (quickActionStatus) quickActionStatus.textContent = "No marks found to export. Sync marks first.";
          return;
        }
        const sqlText = window.VITCM_DB?.generateSqliteDump ? window.VITCM_DB.generateSqliteDump(data) : "";
        if (!sqlText) {
          if (quickActionStatus) quickActionStatus.textContent = "Failed to generate database dump.";
          return;
        }
        const blob = new Blob([sqlText], { type: "application/x-sqlite3;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `vit_marks_${dateStr}.db`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (quickActionStatus) quickActionStatus.textContent = `💾 Exported database as vit_marks_${dateStr}.db`;
      } catch (err) {
        if (quickActionStatus) quickActionStatus.textContent = `Export .db failed: ${err.message || String(err)}`;
      }
    });
  }

  const exportExcelBtn = document.getElementById("exportExcelBtn");
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", async () => {
      try {
        const stored = await chrome.storage.local.get(MARKS_STORAGE_KEY);
        let data = stored[MARKS_STORAGE_KEY];
        if (!data && window.VITCM_DB?.loadMarksData) {
          data = await window.VITCM_DB.loadMarksData();
        }
        if (!data || !data.semesters || Object.keys(data.semesters).length === 0) {
          if (quickActionStatus) quickActionStatus.textContent = "No marks found to export. Sync marks first.";
          return;
        }
        const xml = generateMultiSheetExcel(data);
        if (!xml) {
          if (quickActionStatus) quickActionStatus.textContent = "No semester courses to export to Excel.";
          return;
        }
        const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `vit_marks_all_semesters_${dateStr}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (quickActionStatus) quickActionStatus.textContent = "📊 Exported multi-sheet Excel file!";
      } catch (err) {
        if (quickActionStatus) quickActionStatus.textContent = `Export Excel failed: ${err.message || String(err)}`;
      }
    });
  }

  const syncMarksBtn = document.getElementById("syncMarksBtn");
  const syncMarksIcon = document.getElementById("syncMarksIcon");
  const syncMarksBtnText = document.getElementById("syncMarksBtnText");
  const quickActionStatus = document.getElementById("quickActionStatus");

  if (syncMarksBtn) {
    syncMarksBtn.addEventListener("click", async () => {
      if (syncMarksIcon) syncMarksIcon.classList.add("spin");
      if (syncMarksBtnText) syncMarksBtnText.textContent = "Syncing...";

      try {
        const tabs = await chrome.tabs.query({ url: "*://vtopcc.vit.ac.in/*" });
        if (tabs.length === 0 || !tabs[0]?.id) {
          if (quickActionStatus) {
            quickActionStatus.textContent = "Opening VTOP tab. Please log in to sync marks.";
          }
          chrome.tabs.create({ url: "https://vtopcc.vit.ac.in/vtop/open/page" });
          return;
        }

        const tab = tabs[0];
        const semSelect = document.getElementById("marksSemesterSelect");
        const chosenSemId = semSelect ? semSelect.value : null;

        const res = await sendMessageWithInjectionFallback(tab.id, {
          message: "scrape_marks_now",
          semesterSubId: chosenSemId
        });

        if (res?.ok) {
          await renderStoredMarksDashboard();
          const count = res.updatesCount || 0;
          if (quickActionStatus) {
            quickActionStatus.textContent = count > 0
              ? `🎉 Synced! Found ${count} new mark update(s).`
              : "✅ Synced! Marks are up to date.";
          }
        } else {
          if (quickActionStatus) {
            quickActionStatus.textContent = `Sync notice: ${res?.reason || res?.error || "Make sure you are logged in to VTOP."}`;
          }
        }
      } catch (err) {
        if (quickActionStatus) {
          quickActionStatus.textContent = `Sync failed: ${err?.message || String(err)}`;
        }
      } finally {
        if (syncMarksIcon) syncMarksIcon.classList.remove("spin");
        if (syncMarksBtnText) syncMarksBtnText.textContent = "Sync";
      }
    });
  }

  // --- Academic Calendar Dashboard Event Listeners ---
  const toggleCalendarBtn = document.getElementById("toggleCalendarBtn");
  const calendarPanel = document.getElementById("calendarPanel");
  const calendarArrow = document.getElementById("calendarArrow");

  if (toggleCalendarBtn && calendarPanel) {
    toggleCalendarBtn.addEventListener("click", () => {
      const isHidden = calendarPanel.style.display === "none";
      calendarPanel.style.display = isHidden ? "flex" : "none";
      if (calendarArrow) {
        if (isHidden) {
          calendarArrow.classList.add("open");
        } else {
          calendarArrow.classList.remove("open");
        }
      }
    });
  }

  const calPrevMonthBtn = document.getElementById("calPrevMonthBtn");
  const calNextMonthBtn = document.getElementById("calNextMonthBtn");
  const calMonthSelect = document.getElementById("calMonthSelect");

  if (calPrevMonthBtn && calMonthSelect) {
    calPrevMonthBtn.addEventListener("click", () => {
      if (calMonthSelect.selectedIndex > 0) {
        calMonthSelect.selectedIndex -= 1;
        calMonthSelect.dispatchEvent(new Event("change"));
      }
    });
  }

  if (calNextMonthBtn && calMonthSelect) {
    calNextMonthBtn.addEventListener("click", () => {
      if (calMonthSelect.selectedIndex < calMonthSelect.options.length - 1) {
        calMonthSelect.selectedIndex += 1;
        calMonthSelect.dispatchEvent(new Event("change"));
      }
    });
  }

  if (calMonthSelect) {
    calMonthSelect.addEventListener("change", () => {
      currentCalendarMonth = calMonthSelect.value;
      const activeRecord = getActiveCalendarRecord();
      if (!activeRecord) return;
      renderCalendarMonthTable(activeRecord, currentCalendarMonth);

      const days = activeRecord.days || [];
      const interestingDay = days.find((d) => d.date && d.date.startsWith(currentCalendarMonth) && (d.dayOrder || d.isHoliday || d.isExam)) ||
                            days.find((d) => d.date && d.date.startsWith(currentCalendarMonth));
      if (interestingDay) {
        selectedDayDate = interestingDay.date;
        showCalendarDayDetail(interestingDay);
        const tbody = document.getElementById("calendarTableBody");
        if (tbody) {
          tbody.querySelectorAll(".cal-table-cell").forEach((c) => c.classList.remove("selected-cell"));
          const targetCell = tbody.querySelector(`[data-date="${interestingDay.date}"]`);
          if (targetCell) targetCell.classList.add("selected-cell");
        }
      } else {
        const detailBox = document.getElementById("calendarSelectedDayDetail");
        if (detailBox) detailBox.style.display = "none";
      }
    });
  }

  const calViewTableBtn = document.getElementById("calViewTableBtn");
  const calViewListBtn = document.getElementById("calViewListBtn");
  const calendarTableView = document.getElementById("calendarTableView");
  const calendarListView = document.getElementById("calendarListView");

  if (calViewTableBtn && calViewListBtn) {
    calViewTableBtn.addEventListener("click", () => {
      currentCalendarViewMode = "table";
      calViewTableBtn.classList.add("active");
      calViewListBtn.classList.remove("active");
      if (calendarTableView) calendarTableView.style.display = "block";
      if (calendarListView) calendarListView.style.display = "none";
    });

    calViewListBtn.addEventListener("click", () => {
      currentCalendarViewMode = "list";
      calViewListBtn.classList.add("active");
      calViewTableBtn.classList.remove("active");
      if (calendarTableView) calendarTableView.style.display = "none";
      if (calendarListView) calendarListView.style.display = "block";
    });
  }

  const calendarTableBody = document.getElementById("calendarTableBody");
  if (calendarTableBody) {
    calendarTableBody.addEventListener("click", (e) => {
      const cell = e.target.closest(".cal-table-cell");
      if (!cell || cell.classList.contains("empty")) return;
      const dateStr = cell.dataset.date;
      if (!dateStr) return;

      selectedDayDate = dateStr;
      calendarTableBody.querySelectorAll(".cal-table-cell").forEach((c) => c.classList.remove("selected-cell"));
      cell.classList.add("selected-cell");

      const activeRecord = getActiveCalendarRecord();
      const days = activeRecord?.days || [];
      const dayObj = days.find((d) => d.date === dateStr) || {
        date: dateStr,
        dayOfWeek: weekdayOf(dateStr),
        eventDescription: "",
        instructionalStatus: "Scheduled Day"
      };
      showCalendarDayDetail(dayObj);
    });
  }

  const calTabButtons = Array.from(document.querySelectorAll(".cal-tab-btn"));
  calTabButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      calTabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.calFilter || "all";
      await renderAcademicCalendarDashboard(filter, currentCalendarSearch);
    });
  });

  const calendarSearchInput = document.getElementById("calendarSearchInput");
  if (calendarSearchInput) {
    calendarSearchInput.addEventListener("input", async (e) => {
      const q = e.target.value || "";
      await renderAcademicCalendarDashboard(currentCalendarFilter, q);
    });
  }

  const calendarSemesterSelect = document.getElementById("calendarSemesterSelect");
  if (calendarSemesterSelect) {
    calendarSemesterSelect.addEventListener("change", async () => {
      const chosenSem = calendarSemesterSelect.value;
      const stored = await chrome.storage.local.get(CALENDAR_STORAGE_KEY);
      if (stored[CALENDAR_STORAGE_KEY]) {
        stored[CALENDAR_STORAGE_KEY].selectedSemesterId = chosenSem;
        await chrome.storage.local.set({ [CALENDAR_STORAGE_KEY]: stored[CALENDAR_STORAGE_KEY] });
      }
      await renderAcademicCalendarDashboard();
    });
  }

  const exportIcsBtn = document.getElementById("exportIcsBtn");
  if (exportIcsBtn) {
    exportIcsBtn.addEventListener("click", async () => {
      try {
        const stored = await chrome.storage.local.get(CALENDAR_STORAGE_KEY);
        let data = stored[CALENDAR_STORAGE_KEY];
        if (!data && window.VITCM_DB?.loadCalendarData) {
          data = await window.VITCM_DB.loadCalendarData();
        }
        if (!data || !data.days || data.days.length === 0) {
          if (quickActionStatus) quickActionStatus.textContent = "No calendar data to export. Sync calendar first.";
          return;
        }

        const activeRecord = data;
        const icsText = generateIcsCalendar(activeRecord);
        if (!icsText) {
          if (quickActionStatus) quickActionStatus.textContent = "Could not generate calendar events.";
          return;
        }

        const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const semClean = (activeRecord.semesterName || activeRecord.semesterId || "current_sem").replace(/[^a-zA-Z0-9_-]/g, "_");
        a.download = `vit_calendar_${semClean}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (quickActionStatus) quickActionStatus.textContent = `📅 Exported phone calendar (.ics) for ${activeRecord.semesterName || "current semester"}!`;
      } catch (err) {
        if (quickActionStatus) quickActionStatus.textContent = `Export .ics failed: ${err.message || String(err)}`;
      }
    });
  }

  const exportMobileHtmlBtn = document.getElementById("exportMobileHtmlBtn");
  if (exportMobileHtmlBtn) {
    exportMobileHtmlBtn.addEventListener("click", async () => {
      try {
        const stored = await chrome.storage.local.get(CALENDAR_STORAGE_KEY);
        let data = stored[CALENDAR_STORAGE_KEY];
        if (!data && window.VITCM_DB?.loadCalendarData) {
          data = await window.VITCM_DB.loadCalendarData();
        }
        if (!data || !data.days || data.days.length === 0) {
          if (quickActionStatus) quickActionStatus.textContent = "No calendar data to export. Sync calendar first.";
          return;
        }

        const activeRecord = data;
        const htmlText = generateMobileHtmlCalendar(activeRecord);
        if (!htmlText) {
          if (quickActionStatus) quickActionStatus.textContent = "Could not generate mobile HTML calendar.";
          return;
        }

        const blob = new Blob([htmlText], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const semClean = (activeRecord.semesterName || activeRecord.semesterId || "current_sem").replace(/[^a-zA-Z0-9_-]/g, "_");
        a.download = `vit_academic_calendar_${semClean}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (quickActionStatus) quickActionStatus.textContent = `📱 Exported mobile HTML calendar for ${activeRecord.semesterName || "current semester"}!`;
      } catch (err) {
        if (quickActionStatus) quickActionStatus.textContent = `Export HTML failed: ${err.message || String(err)}`;
      }
    });
  }

  const syncCalendarBtn = document.getElementById("syncCalendarBtn");
  const syncCalendarIcon = document.getElementById("syncCalendarIcon");
  const syncCalendarBtnText = document.getElementById("syncCalendarBtnText");

  if (syncCalendarBtn) {
    syncCalendarBtn.addEventListener("click", async () => {
      if (syncCalendarIcon) syncCalendarIcon.classList.add("spin");
      if (syncCalendarBtnText) syncCalendarBtnText.textContent = "Syncing...";

      try {
        const tabs = await chrome.tabs.query({ url: "*://vtopcc.vit.ac.in/*" });
        if (tabs.length === 0 || !tabs[0]?.id) {
          if (quickActionStatus) {
            quickActionStatus.textContent = "Opening VTOP tab. Please log in to sync academic calendar.";
          }
          chrome.tabs.create({ url: "https://vtopcc.vit.ac.in/vtop/open/page" });
          return;
        }

        const tab = tabs[0];
        const semSelect = document.getElementById("calendarSemesterSelect");
        const chosenSemId = semSelect ? semSelect.value : null;

        const res = await sendMessageWithInjectionFallback(tab.id, {
          message: "fetch_academic_calendar",
          semesterSubId: chosenSemId,
          force: true
        });

        if (res?.ok) {
          await renderAcademicCalendarDashboard();
          if (quickActionStatus) {
            quickActionStatus.textContent = `🗓️ Synced calendar! ${res.daysCount || 0} days (${res.holidaysCount || 0} holidays, ${res.eventsCount || 0} events).`;
          }
        } else {
          if (quickActionStatus) {
            quickActionStatus.textContent = `Calendar sync notice: ${res?.reason || res?.error || "Make sure you are logged in to VTOP."}`;
          }
        }
      } catch (err) {
        if (quickActionStatus) {
          quickActionStatus.textContent = `Calendar sync failed: ${err?.message || String(err)}`;
        }
      } finally {
        if (syncCalendarIcon) syncCalendarIcon.classList.remove("spin");
        if (syncCalendarBtnText) syncCalendarBtnText.textContent = "Sync";
      }
    });
  }

  // --- Personal Events Listeners ---
  const addPersonalEventBtn = document.getElementById("addPersonalEventBtn");
  if (addPersonalEventBtn) {
    addPersonalEventBtn.addEventListener("click", () => {
      openPersonalEventModal(selectedDayDate || null);
    });
  }

  const closeEventModalBtn = document.getElementById("closeEventModalBtn");
  const cancelEventBtn = document.getElementById("cancelEventBtn");
  const personalEventModal = document.getElementById("personalEventModal");

  if (closeEventModalBtn) closeEventModalBtn.addEventListener("click", closePersonalEventModal);
  if (cancelEventBtn) cancelEventBtn.addEventListener("click", closePersonalEventModal);
  if (personalEventModal) {
    personalEventModal.addEventListener("click", (e) => {
      if (e.target === personalEventModal) {
        closePersonalEventModal();
      }
    });
  }

  const personalEventForm = document.getElementById("personalEventForm");
  if (personalEventForm) {
    personalEventForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const idInput = document.getElementById("eventEditId");
      const titleInput = document.getElementById("eventTitleInput");
      const dateInput = document.getElementById("eventDateInput");
      const catSelect = document.getElementById("eventCategorySelect");
      const timeInput = document.getElementById("eventTimeInput");
      const descInput = document.getElementById("eventDescInput");

      const title = titleInput ? titleInput.value.trim() : "";
      const date = dateInput ? dateInput.value.trim() : "";
      if (!title || !date) return;

      const activeRecord = getActiveCalendarRecord();
      const semStart = activeRecord?.startDate || activeRecord?.days?.[0]?.date;
      const semEnd = activeRecord?.endDate || activeRecord?.days?.[activeRecord?.days?.length - 1]?.date;
      if (semStart && date < semStart) {
        alert(`Personal event date (${date}) cannot be earlier than the current semester start date (${semStart}).`);
        return;
      }
      if (semEnd && date > semEnd) {
        alert(`Personal event date (${date}) cannot be after the current semester end date (${semEnd}).`);
        return;
      }

      const eventPayload = {
        id: idInput && idInput.value ? idInput.value : undefined,
        title,
        date,
        category: catSelect ? catSelect.value : "personal",
        time: timeInput ? timeInput.value.trim() : "",
        description: descInput ? descInput.value.trim() : ""
      };

      await savePersonalEvent(eventPayload);
      closePersonalEventModal();
      selectedDayDate = date;
      await renderAcademicCalendarDashboard();

      if (quickActionStatus) {
        quickActionStatus.textContent = `📌 Saved event "${title}" on ${date}!`;
      }
    });
  }

  const calendarSelectedDayDetail = document.getElementById("calendarSelectedDayDetail");
  if (calendarSelectedDayDetail) {
    calendarSelectedDayDetail.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === "add-pe") {
        const targetDate = btn.dataset.date || selectedDayDate;
        openPersonalEventModal(targetDate);
      } else if (action === "edit-pe") {
        const id = btn.dataset.id;
        const ev = (cachedPersonalEvents || []).find((p) => p.id === id);
        if (ev) {
          openPersonalEventModal(ev.date, ev);
        }
      } else if (action === "del-pe") {
        const id = btn.dataset.id;
        if (id) {
          await deletePersonalEvent(id);
          await renderAcademicCalendarDashboard();
          if (quickActionStatus) {
            quickActionStatus.textContent = "🗑️ Personal event deleted.";
          }
        }
      }
    });
  }
});

