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
    lms: getDefaultSiteState()
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
  if ((!creds || (!creds.username && !creds.password)) && card.dataset.siteKey === "codet") {
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

        await setStorageData(nextData);
        updateCardBadge(card, nextData[siteKey]);
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
});

