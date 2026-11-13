let nav_barcc = () => {
  if (!/vtopcc/i.test(window.location.hostname || document.URL)) {
    return false;
  }
  // Don't inject on login page
  if (document.querySelector('input[type="password"]') || document.getElementById("captchaBlock")) {
    return false;
  }
  // Prevent duplicate injection
  if (document.querySelector(".navbar-header .navbar-brand[data-vitcm='1']")) {
    return true;
  }
  const navHeaders = document.getElementsByClassName("navbar-header");
  if (!navHeaders || navHeaders.length === 0) {
    return false;
  }

  let span = document.createElement("div");
  span.className = "navbar-brand";
  span.dataset.vitcm = "1";
  span.style.paddingTop = "20px";
  span.innerHTML = `
    <a href="javascript:loadmydiv('examinations/StudentMarkView')" id="EXM0011" class="btnItem" onclick="toggleButtonMenuItem()" style="color: #fafafa;border-style: none;text-decoration: none; margin-left: 15px; font-size:15px">Marks View</a>
    <a href="javascript:loadmydiv('academics/common/StudentAttendance')" id="ACD0042" class="btnItem" onclick="toggleButtonMenuItem()" style="color: #fafafa;border-style: none;text-decoration: none; margin-left: 15px;font-size:15px">Class Attendance</a>
    <a href="javascript:loadmydiv('academics/common/StudentCoursePage')" id="ACD0045" class="btnItem" onclick="toggleButtonMenuItem()" style="color: #fafafa;border-style: none;text-decoration: none; margin-left: 15px; font-size:15px">Course Page</a>
    <a href="javascript:loadmydiv('academics/common/StudentTimeTable')" id="ACD0034" class="btnItem" onclick="toggleButtonMenuItem()" style="color: #fafafa;border-style: none;text-decoration: none; margin-left: 15px; font-size:15px">Time Table</a>
    <a href="javascript:loadmydiv('academics/common/CalendarPreview')" id="ACD0128" class="btnItem" onclick="toggleButtonMenuItem()" style="color: #fafafa;border-style: none;text-decoration: none; margin-left: 15px; font-size:15px">Academic Calendar</a>
    <a href="javascript:loadmydiv('examinations/examScheduleView/StudentExamSchedule')" id="EXM0018" class="btnItem" onclick="toggleButtonMenuItem()" style="color: #fafafa;border-style: none;text-decoration: none; margin-left: 15px; font-size:15px">Exam Schedule</a>
  `;

  navHeaders[0].insertAdjacentElement("beforeend", span);
  return true;
};

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "vtopcc_nav_bar" || request.message === "nav_bar_change") {
    try {
      nav_barcc();
    } catch (_error) {}
  }
});

const tryInitNavbarcc = () => {
  try {
    return nav_barcc();
  } catch (_error) {
    return false;
  }
};

// 1. Immediate execution if DOM is ready
if (document.readyState === "complete" || document.readyState === "interactive") {
  tryInitNavbarcc();
} else {
  document.addEventListener("DOMContentLoaded", tryInitNavbarcc);
  window.addEventListener("load", tryInitNavbarcc);
}

// 2. MutationObserver for dynamic SPA rendering on login / navigation
try {
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    if (!document.querySelector(".navbar-header .navbar-brand[data-vitcm='1']")) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(tryInitNavbarcc, 50);
    }
  });
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
} catch (_e) {}

// 3. Fallback poll after script injection (clears once injected or after 15s)
let navccPolls = 0;
const navccInterval = setInterval(() => {
  navccPolls++;
  const injected = tryInitNavbarcc();
  if (injected || navccPolls > 30) {
    clearInterval(navccInterval);
  }
}, 500);
