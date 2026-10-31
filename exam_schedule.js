/**
 * VIT Companion - Exam Schedule & Offline Seat Finder
 * Extracts exam schedules (CAT-1, CAT-2, FAT) with venue and seat location from VTOP
 * and stores them in IndexedDB and chrome.storage.local for 100% offline access.
 * Automatically syncs in the background on any VTOP page without manual navigation.
 */

const EXAM_SCHEDULE_STORAGE_KEY = "vit_stored_exam_schedule";

function parseVtopExamDateToIso(dateStr) {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  const monthNames = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
  };
  const parts = s.split(/[-/\s.]+/);
  if (parts.length === 3) {
    const mStr = parts[1].toLowerCase();
    if (monthNames[mStr]) {
      const d = String(parts[0]).padStart(2, "0");
      const m = monthNames[mStr];
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${y}-${m}-${d}`;
    }
    if (parts[0].length === 4) {
      return `${parts[0]}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`;
    }
    const d = String(parts[0]).padStart(2, "0");
    const m = String(parts[1]).padStart(2, "0");
    const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${y}-${m}-${d}`;
  }
  return s;
}

function parseExamTimeToMinutes(timeStr) {
  if (!timeStr) return { startMinutes: 570, endMinutes: 660 }; // Default 9:30 AM
  const matches = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/gi);
  if (!matches || matches.length === 0) return { startMinutes: 570, endMinutes: 660 };

  const parseOne = (t) => {
    const p = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!p) return 570;
    let h = parseInt(p[1], 10);
    const min = parseInt(p[2], 10);
    const ampm = (p[3] || "").toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + min;
  };

  const startMinutes = parseOne(matches[0]);
  const endMinutes = matches[1] ? parseOne(matches[1]) : startMinutes + 180;
  return { startMinutes, endMinutes };
}

function extractAllExamSchedule(root = document) {
  try {
    const tb = root.getElementsByTagName ? root.getElementsByTagName('tbody')[0] : root.querySelector('tbody');
    if (!tb || !tb.rows || tb.rows.length === 0) return [];

    const rows = Array.from(tb.rows);
    const exams = [];
    let currentSectionHeader = "Exam";

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const firstCell = r.children && r.children[0];
      if (!firstCell) continue;

      if (firstCell.className === 'panelHead-secondary') {
        currentSectionHeader = firstCell.innerText.trim() || "Exam";
        continue;
      }

      // Skip table header rows
      if (r.querySelector && r.querySelector('th')) continue;
      if (r.classList && (r.classList.contains('tableHeader') || r.classList.contains('header'))) continue;

      const code = (r.children[1] && (r.children[1].innerText || r.children[1].textContent) || "").trim();
      const title = (r.children[2] && (r.children[2].innerText || r.children[2].textContent) || "").trim();
      const rawDate = (r.children[6] && (r.children[6].innerText || r.children[6].textContent) || "").trim();

      if (!code || !title || code.length < 3) continue;

      const codeLower = code.toLowerCase();
      const titleLower = title.toLowerCase();
      const dateLower = rawDate.toLowerCase();
      if (codeLower === "course code" || codeLower === "code" || codeLower.includes("sl.no") || codeLower.includes("sl no")) continue;
      if (titleLower === "course title" || titleLower === "title") continue;
      if (dateLower === "exam date" || dateLower === "date") continue;

      // Validate genuine VIT course code (e.g. BCSE432E, MAT1001, CSE1001)
      if (!/^[A-Z]{2,5}\s*\d{3,4}[A-Z]?$/i.test(code.replace(/\s+/g, ''))) continue;
      if (!/\d{1,2}/.test(rawDate)) continue;

      const rawTime = (r.children[9] && (r.children[9].innerText || r.children[9].textContent) || "").trim();
      let rawVenue = (r.children[10] && (r.children[10].innerText || r.children[10].textContent) || "").trim();
      let rawSeat = (r.children[11] && (r.children[11].innerText || r.children[11].textContent) || "").trim();
      const slot = (r.children[3] && (r.children[3].innerText || r.children[3].textContent) || "").trim();

      if (!rawVenue || rawVenue === "-" || rawVenue === "--") rawVenue = "TBA";
      if (!rawSeat || rawSeat === "-" || rawSeat === "--") rawSeat = "TBA";

      const isoDate = parseVtopExamDateToIso(rawDate);
      const { startMinutes, endMinutes } = parseExamTimeToMinutes(rawTime);

      let epoch = 0;
      if (isoDate && isoDate.includes("-")) {
        const dp = isoDate.split("-").map(Number);
        epoch = new Date(dp[0], dp[1] - 1, dp[2], Math.floor(startMinutes / 60), startMinutes % 60).getTime();
      }

      let examType = "Exam";
      const hdrUpper = currentSectionHeader.toUpperCase();
      if (hdrUpper.includes("CAT-I") || hdrUpper.includes("CAT - I") || hdrUpper.includes("CAT 1") || hdrUpper.includes("CAT-1") || hdrUpper.includes("ASSESSMENT TEST - I")) {
        examType = "CAT-1";
      } else if (hdrUpper.includes("CAT-II") || hdrUpper.includes("CAT - II") || hdrUpper.includes("CAT 2") || hdrUpper.includes("CAT-2") || hdrUpper.includes("ASSESSMENT TEST - II")) {
        examType = "CAT-2";
      } else if (hdrUpper.includes("FAT") || hdrUpper.includes("FINAL") || hdrUpper.includes("TERMINAL")) {
        examType = hdrUpper.includes("LAB") ? "Lab FAT" : "FAT";
      } else {
        examType = currentSectionHeader.split("(")[0].trim() || "Exam";
      }

      const id = `${code}_${examType}_${isoDate || rawDate}`.replace(/\s+/g, "_");

      exams.push({
        id,
        courseCode: code,
        courseTitle: title,
        examType,
        rawExamType: currentSectionHeader,
        date: isoDate,
        rawDate,
        time: rawTime,
        venue: rawVenue,
        seat: rawSeat,
        slot,
        startMinutes,
        endMinutes,
        timestamp: epoch
      });
    }

    exams.sort((a, b) => {
      if (a.timestamp && b.timestamp) return a.timestamp - b.timestamp;
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return 0;
    });

    return exams;
  } catch (err) {
    console.error("VIT Companion: extractAllExamSchedule error", err);
    return [];
  }
}

async function saveExtractedExamSchedule(exams, semesterName = null, semesterId = null) {
  if (!Array.isArray(exams) || exams.length === 0) return false;
  try {
    const semName = semesterName ||
                    document.querySelector('#semesterSubId option[selected]')?.innerText?.trim() ||
                    document.querySelector('#semesterSubId')?.innerText?.trim() ||
                    "Current Semester";

    const semId = semesterId ||
                  document.querySelector('#semesterSubId option[selected]')?.value ||
                  document.querySelector('#semesterSubId')?.value ||
                  "";

    const payload = {
      lastSynced: Date.now(),
      semesterName: semName,
      semesterId: semId,
      exams
    };

    // 1. Primary: Save directly to .db (IndexedDB)
    if (window.VITCM_DB?.saveExamSchedule) {
      await window.VITCM_DB.saveExamSchedule(payload);
    }

    // 2. Mirror to chrome.storage.local for fast cache
    await chrome.storage.local.set({ [EXAM_SCHEDULE_STORAGE_KEY]: payload });

    try {
      chrome.runtime.sendMessage({ type: "EXAM_SCHEDULE_UPDATED", data: payload }).catch(() => {});
    } catch (_e) {}

    console.log(`VIT Companion: Stored ${exams.length} exam schedule items in .db successfully for ${semName}.`);
    return true;
  } catch (err) {
    console.warn("VIT Companion: Could not save exam schedule to .db", err);
    return false;
  }
}

/**
 * Background auto-sync for Exam Schedule & Seat Finder.
 * Syncs automatically even if user is on Attendance, Marks, or Dashboard page!
 */
async function autoFetchExamScheduleInBackground(force = false) {
  if (!window.location.hostname.includes("vtopcc.vit.ac.in")) {
    return { ok: false, reason: "not-vtop" };
  }

  if (document.querySelector('input[type="password"]') || document.getElementById("captchaBlock")) {
    return { ok: false, reason: "on-login-page" };
  }

  // 1. If currently on the exam schedule page with table rendered, scrape directly!
  const liveTb = document.getElementsByTagName('tbody')[0];
  if (liveTb && liveTb.querySelector && liveTb.querySelector('.panelHead-secondary')) {
    const liveExams = extractAllExamSchedule(document);
    if (liveExams.length > 0) {
      await saveExtractedExamSchedule(liveExams);
      return { ok: true, exams: liveExams, source: "live-dom" };
    }
  }

  // Check throttle if not forced (10 minutes)
  if (!force) {
    try {
      const stored = await chrome.storage.local.get(EXAM_SCHEDULE_STORAGE_KEY);
      const last = stored[EXAM_SCHEDULE_STORAGE_KEY]?.lastSynced || 0;
      if (Date.now() - last < 10 * 60 * 1000 && stored[EXAM_SCHEDULE_STORAGE_KEY]?.exams?.length > 0) {
        return { ok: true, reason: "throttled", exams: stored[EXAM_SCHEDULE_STORAGE_KEY].exams };
      }
    } catch (_e) {}
  }

  try {
    const origin = window.location.origin;
    let csrfToken = (
      document.querySelector('input[name="_csrf"]')?.value ||
      document.querySelector('input[id="_csrf"]')?.value ||
      document.querySelector('input[id="csrf"]')?.value ||
      document.querySelector('meta[name="_csrf"]')?.content ||
      (typeof window !== "undefined" && window._csrf ? window._csrf : "") ||
      ""
    );
    let authId = (
      document.querySelector('input[name="authorizedID"]')?.value ||
      document.getElementById("authorizedID")?.value ||
      ""
    );

    let semSubId = (
      document.querySelector("#semesterSubId option[selected]")?.value ||
      document.querySelector("#semesterSubId")?.value ||
      ""
    );

    let semName = (
      document.querySelector("#semesterSubId option[selected]")?.innerText?.trim() ||
      document.querySelector("#semesterSubId")?.innerText?.trim() ||
      ""
    );

    if (!semSubId) {
      const storedMarks = await chrome.storage.local.get("vit_stored_marks");
      semSubId = storedMarks?.vit_stored_marks?.selectedSemesterId ||
                 storedMarks?.vit_stored_marks?.currentSemesterId ||
                 "";
      semName = storedMarks?.vit_stored_marks?.currentSemesterName || "";
    }

    // VTOP Exam Schedule Endpoints (from VtopMCP)
    const candidateUrls = [
      `${origin}/vtop/examinations/doSearchExamScheduleForStudent`,
      `${origin}/examinations/doSearchExamScheduleForStudent`,
      `${origin}/vtop/examinations/examScheduleView/StudentExamSchedule`,
      `${origin}/vtop/examinations/examScheduleView`
    ];

    let html = "";
    for (const url of candidateUrls) {
      try {
        const bodyParams = new URLSearchParams();
        if (csrfToken) bodyParams.append("_csrf", csrfToken);
        if (authId) bodyParams.append("authorizedID", authId);
        if (semSubId) bodyParams.append("semesterSubId", semSubId);

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest"
          },
          body: bodyParams.toString(),
          credentials: "include"
        });

        if (res.ok) {
          const text = await res.text();
          if (text.includes("panelHead-secondary") || (text.includes("Exam Date") && text.includes("Venue"))) {
            html = text;
            break;
          }
        }
      } catch (_fetchErr) {}
    }

    if (!html) {
      return { ok: false, reason: "endpoint-unavailable" };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const extracted = extractAllExamSchedule(doc);

    if (extracted.length > 0) {
      const detectedSemName = doc.querySelector('#semesterSubId option[selected]')?.innerText?.trim() || semName || "Current Semester";
      await saveExtractedExamSchedule(extracted, detectedSemName, semSubId);
      return { ok: true, exams: extracted, source: "background-fetch", semesterName: detectedSemName };
    }

    return { ok: false, reason: "no-exams-in-response" };
  } catch (err) {
    console.error("VIT Companion: autoFetchExamScheduleInBackground error", err);
    return { ok: false, error: err.message };
  }
}

// Runtime message listener for on-demand sync from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.message === "fetch_exam_schedule" || request?.message === "scrape_exams_now" || request?.message === "exam_schedule") {
    autoFetchExamScheduleInBackground(true).then((res) => {
      sendResponse(res);
    }).catch((err) => {
      sendResponse({ ok: false, error: err.message });
    });
    return true; // Keep channel open for async response
  }
});

// Auto-run in background when logged into VTOP
if (window.location.hostname.includes("vtopcc.vit.ac.in")) {
  setTimeout(() => {
    autoFetchExamScheduleInBackground(false).catch(() => {});
  }, 3000);

  // Observe SPA view changes
  try {
    const observer = new MutationObserver(() => {
      const tb = document.getElementsByTagName('tbody')[0];
      if (tb && tb.querySelector && tb.querySelector('.panelHead-secondary')) {
        const exams = extractAllExamSchedule(document);
        if (exams.length > 0) {
          saveExtractedExamSchedule(exams).catch(() => {});
        }
      }
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  } catch (_e) {}
}

// Maintain UI copy buttons if on exam schedule page
let is_venue = (i) => {
  i++;
  let row = document.getElementsByTagName("tbody")[0].rows;
  let empty_venue_count = 0;
  while (row[i] && row[i].children[0].className !== "panelHead-secondary") {
    if (row[i].children[11] && row[i].children[11].innerText == "-") {
      empty_venue_count++;
    }
    i++;
    if (i == row.length) break;
  }
  return !(empty_venue_count > 2);
};

let exam_schedule_sync = () => {
  let tb = document.getElementsByTagName("tbody")[0];
  if (!tb || !tb.rows) return;
  let row = tb.rows;
  for (let i = 0; i < row.length; i++) {
    try {
      if (row[i].children[0].className === "panelHead-secondary" && is_venue(i)) {
        let headerCell = row[i].children[0];
        if (headerCell.querySelector && headerCell.querySelector('.copy-schedule-btn')) continue;
        let exam_type = headerCell.innerText || "Exam";
        let copy_button = document.createElement("button");
        copy_button.innerText = `Copy ${exam_type} schedule to clipboard`;
        copy_button.id = `copy-${i}`;
        copy_button.className = "btn btn-secondary copy-schedule-btn";
        copy_button.style.marginLeft = "1%";
        headerCell.appendChild(copy_button);
      }
    } catch (_e) {}
  }
};
