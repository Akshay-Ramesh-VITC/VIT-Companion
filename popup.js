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

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[MARKS_STORAGE_KEY]) {
      renderStoredMarksDashboard();
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
});

