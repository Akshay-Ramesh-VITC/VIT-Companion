/**
 * VIT Companion - Academic Calendar Module
 * Background extractor, persistent store, and parser for VTOP Academic Calendar.
 * Automatically resolves the latest general (non-industry) semester, fetches calendar months,
 * categorizes holidays, exams (CAT/FAT), college fests, and working Saturday day orders.
 */
(() => {
  "use strict";

  const CALENDAR_STORAGE_KEY = "vit_academic_calendar";

  const MONTH_NUM = {
    JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
    JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
  };

  const pad2 = (n) => String(n).padStart(2, "0");

  function calDateMonthKey(calDate) {
    const parts = (calDate || "").split("-");
    if (parts.length < 3) return "";
    const mon = MONTH_NUM[(parts[1] || "").toUpperCase()];
    const yr = parts[2];
    return mon && yr ? `${yr}-${pad2(mon)}` : "";
  }

  function weekdayOf(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00Z");
    if (isNaN(d.getTime())) return "";
    const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return weekdays[d.getUTCDay()] || "";
  }

  /**
   * Filter and pick the latest, general semester (non-industry).
   */
  function findLatestGeneralSemester(availableSemesters) {
    if (!Array.isArray(availableSemesters) || availableSemesters.length === 0) {
      return null;
    }

    // 1. Exclude industry, internship, co-op, collaborative terms
    const nonIndustry = availableSemesters.filter((s) => {
      const name = (s.name || s.id || "").toLowerCase();
      if (name.includes("industry")) return false;
      if (name.includes("intern")) return false;
      if (name.includes("co-op") || name.includes("coop")) return false;
      if (name.includes("collaborative")) return false;
      if (name.includes("select") || name === "0" || name === "-1") return false;
      return true;
    });

    const pool = nonIndustry.length > 0 ? nonIndustry : availableSemesters;

    // 2. Prefer regular Fall or Winter semesters
    const regular = pool.filter((s) => {
      const name = (s.name || s.id || "").toLowerCase();
      return name.includes("fall") || name.includes("winter") || name.includes("semester");
    });

    const candidates = regular.length > 0 ? regular : pool;

    // 3. Score to pick latest
    const scored = candidates.map((s) => {
      const name = s.name || s.id || "";
      const matchYear = name.match(/20(\d{2})[-–](\d{2})/);
      const startYear = matchYear ? parseInt(matchYear[1], 10) : 0;
      const isWinter = /winter/i.test(name);
      const isFall = /fall/i.test(name);
      const seasonWeight = isWinter ? 2 : (isFall ? 1 : 0);
      const score = startYear * 10 + seasonWeight;
      return { ...s, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0] || null;
  }

  /**
   * Extract month tokens (e.g. "01-JUL-2026") from getListForSemester response.
   */
  function parseCalendarMonths(html) {
    if (!html) return [];
    const matches = [...html.matchAll(/processViewCalendar\([^)]*?(\d{2}-[A-Z]{3}-\d{4})/gi)].map((m) => m[1]);
    const fallback = [...html.matchAll(/\b(\d{2}-[A-Z]{3}-\d{4})\b/g)].map((m) => m[1]);
    const set = new Set([...matches, ...fallback]);
    const list = Array.from(set);

    list.sort((a, b) => {
      const kA = calDateMonthKey(a);
      const kB = calDateMonthKey(b);
      return kA.localeCompare(kB);
    });

    return list;
  }

  /**
   * Categorize whether a day is a holiday, exam, festival, milestone, or working day order.
   * Working Saturdays with Day Orders are instructional working days, NEVER holidays.
   */
  function classifyDay(dateStr, weekday, instructional, dayOrder, label, rawInfo = "") {
    const l = (label || "").toLowerCase();
    const info = (rawInfo || "").toLowerCase();
    const fullText = `${l} ${info} ${weekday} ${dayOrder || ""}`.toLowerCase();

    let isHoliday = false;
    let isExam = false;
    let isEvent = false;
    let isFest = false;
    let isInstructional = Boolean(instructional);
    let eventType = "NORMAL";
    let badgeLabel = "";
    let category = "class";

    // 1. Day Order / Working Saturday Check
    // A Working Saturday / Day Order is ALWAYS an instructional working day, NEVER a holiday!
    const isWorkingSaturday = Boolean(dayOrder) || /day\s*order|working\s*saturday/i.test(fullText);

    if (isWorkingSaturday) {
      isInstructional = true;
      isHoliday = false;
      eventType = "DAY_ORDER";
      badgeLabel = dayOrder ? `${dayOrder} Day Order` : "Working Saturday";
      category = "dayorder";
    }

    // 2. Exam detection (Exams are NOT holidays!)
    if (fullText.match(/cat\s*[-–]?\s*[1i]|continuous assessment test\s*[-–]?\s*[1i]/i)) {
      isExam = true;
      isEvent = true;
      isHoliday = false;
      isInstructional = true;
      eventType = "EXAM_CAT1";
      badgeLabel = "CAT-I Exam";
      category = "exam";
    } else if (fullText.match(/cat\s*[-–]?\s*[2ii]|continuous assessment test\s*[-–]?\s*[2ii]/i)) {
      isExam = true;
      isEvent = true;
      isHoliday = false;
      isInstructional = true;
      eventType = "EXAM_CAT2";
      badgeLabel = "CAT-II Exam";
      category = "exam";
    } else if (fullText.match(/lab\s+fat|lab\s+assessment/i)) {
      isExam = true;
      isEvent = true;
      isHoliday = false;
      isInstructional = true;
      eventType = "EXAM_LAB_FAT";
      badgeLabel = "Lab FAT Exam";
      category = "exam";
    } else if (fullText.match(/\bfat\b|final assessment test/i)) {
      isExam = true;
      isEvent = true;
      isHoliday = false;
      isInstructional = true;
      eventType = "EXAM_FAT";
      badgeLabel = "FAT Exam";
      category = "exam";
    }

    // 3. Academic Milestones
    if (fullText.match(/commencement|classes begin|semester start|instruction begins/i)) {
      isEvent = true;
      isInstructional = true;
      isHoliday = false;
      eventType = "COMMENCEMENT";
      badgeLabel = "Semester Begins";
      if (category !== "exam" && category !== "dayorder") category = "milestone";
    } else if (fullText.match(/last instructional|instruction ends|classes end/i)) {
      isEvent = true;
      isInstructional = true;
      isHoliday = false;
      eventType = "LAST_DAY";
      badgeLabel = "Last Working Day";
      if (category !== "exam" && category !== "dayorder") category = "milestone";
    } else if (fullText.match(/course registration|add[- ]drop|re-registration/i)) {
      isEvent = true;
      eventType = "REGISTRATION";
      badgeLabel = "Course Registration";
      if (category !== "exam" && category !== "dayorder") category = "milestone";
    }

    // 4. College Fests
    if (fullText.match(/technovit|riviera|vibrance|fest|sports day|convocation|cultural/i)) {
      isFest = true;
      isEvent = true;
      eventType = "FEST";
      badgeLabel = "College Fest";
      if (category !== "exam" && category !== "dayorder") category = "fest";
    }

    // 5. Holiday detection
    // ONLY check if it's NOT a Working Saturday / Day Order and NOT an Exam!
    if (!isWorkingSaturday && !isExam) {
      const hasHolidayKeyword = (
        fullText.includes("holiday") ||
        fullText.includes("pongal") ||
        fullText.includes("diwali") ||
        fullText.includes("deepavali") ||
        fullText.includes("republic") ||
        fullText.includes("independence") ||
        fullText.includes("christmas") ||
        fullText.includes("gandhi") ||
        fullText.includes("ayudha") ||
        fullText.includes("new year") ||
        fullText.includes("muharram") ||
        fullText.includes("good friday") ||
        fullText.includes("bakrid") ||
        fullText.includes("ramzan") ||
        fullText.includes("eid") ||
        fullText.includes("mahavir") ||
        fullText.includes("buddha") ||
        fullText.includes("onam") ||
        fullText.includes("milad") ||
        fullText.includes("ambedkar") ||
        fullText.includes("labour day") ||
        fullText.includes("may day") ||
        fullText.includes("vacation") ||
        fullText.includes("semester break")
      );

      if (hasHolidayKeyword) {
        isHoliday = true;
        isInstructional = false;
        eventType = "HOLIDAY";
        badgeLabel = "Holiday";
        category = "holiday";
      } else if (weekday === "SUN") {
        isHoliday = true;
        isInstructional = false;
        eventType = "HOLIDAY";
        badgeLabel = "Sunday";
        category = "holiday";
      } else if (!isInstructional) {
        isHoliday = true;
        eventType = "HOLIDAY";
        badgeLabel = weekday === "SAT" ? "Saturday (Off)" : "Non-Instructional";
        category = "holiday";
      }
    }

    if (isInstructional && !isHoliday && category === "class") {
      eventType = "INSTRUCTIONAL";
      badgeLabel = "Instructional Day";
    }

    return {
      isHoliday,
      isExam,
      isEvent,
      isFest,
      isInstructional,
      instructional: isInstructional,
      instructionalStatus: isInstructional ? "Instructional Day" : "Non-Instructional Day",
      eventType,
      badgeLabel,
      category
    };
  }

  /**
   * Parse calendar table HTML for one month.
   */
  function parseAcademicCalendarHtml(html, calDate) {
    if (!html || !calDate) return [];
    const parts = calDate.split("-");
    const mon = parts[1];
    const yr = parts[2];
    const monthNum = MONTH_NUM[(mon || "").toUpperCase()];
    const year = parseInt(yr || "", 10);
    if (!monthNum || isNaN(year)) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const table = doc.querySelector("table.calendar-table") ||
                  doc.querySelector("#list-wrapper table") ||
                  doc.querySelector("table");
    if (!table) return [];

    const days = [];
    const tds = Array.from(table.querySelectorAll("td"));

    for (const td of tds) {
      const spans = Array.from(td.querySelectorAll("span"))
        .map((s) => s.textContent.replace(/\s+/g, " ").trim())
        .filter(Boolean);

      if (spans.length === 0) continue;

      const dayNum = parseInt(spans[0], 10);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;

      const dateStr = `${year}-${pad2(monthNum)}-${pad2(dayNum)}`;
      const weekday = weekdayOf(dateStr);

      const info = spans[1] || "";
      const joined = spans.join(" ");

      const m = joined.match(/(SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY)\s+Day Order/i);
      const dayOrder = m ? m[1].toUpperCase().slice(0, 3) : null;

      let instructional = /^instructional day/i.test(info) || (/instructional/i.test(joined) && !/no instructional/i.test(joined));
      if (dayOrder) {
        instructional = true;
      }

      // Extract labels from parenthesis
      const details = spans
        .slice(1)
        .filter((s) => /^\(/.test(s))
        .map((s) => s.replace(/^\(|\)$/g, "").trim())
        .filter(Boolean);

      let label = Array.from(new Set(details)).join(" / ");
      if (!label && info && !/^no instructional/i.test(info) && !/^instructional day/i.test(info)) {
        label = info;
      }

      const classification = classifyDay(dateStr, weekday, instructional, dayOrder, label, joined);

      let eventDescription = label;
      if (!eventDescription) {
        if (dayOrder) {
          eventDescription = `Working Saturday (${dayOrder} Day Order)`;
        } else if (classification.isHoliday) {
          eventDescription = weekday === "SUN" ? "Sunday" : "Holiday / Non-Instructional";
        } else {
          eventDescription = classification.instructionalStatus || "Instructional Day";
        }
      }

      days.push({
        date: dateStr,
        dayNumber: dayNum,
        month: monthNum,
        year: year,
        weekday: weekday,
        dayOfWeek: weekday,
        dayOrder: dayOrder,
        label: label,
        eventDescription: eventDescription,
        ...classification
      });
    }

    return days;
  }

  /**
   * Save and process scraped calendar data.
   * Strictly stores ONLY the latest / current semester calendar.
   * Automatically clears out old semester calendar data and auto-deletes old semester personal events.
   */
  async function processCalendarData(days, semesterInfo, availableSemesters = null) {
    if (!days || days.length === 0) {
      return { ok: false, reason: "no-days" };
    }

    const semId = semesterInfo?.id || "current_semester";
    const semName = semesterInfo?.name || "Current Semester";

    // Deduplicate and sort days chronologically
    const dayMap = {};
    days.forEach((d) => {
      dayMap[d.date] = d;
    });
    const sortedDays = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    const holidaysCount = sortedDays.filter((d) => d.isHoliday).length;
    const eventsCount = sortedDays.filter((d) => d.isExam || d.isEvent || d.isFest).length;
    const instructionalCount = sortedDays.filter((d) => d.isInstructional || d.instructional).length;
    const dayOrdersCount = sortedDays.filter((d) => Boolean(d.dayOrder)).length;

    const startDate = sortedDays[0]?.date || "";
    const endDate = sortedDays[sortedDays.length - 1]?.date || "";

    // Keep ONLY the latest / current semester calendar (no old semester retention)
    const calendarRecord = {
      semesterId: semId,
      semesterName: semName,
      selectedSemesterId: semId,
      days: sortedDays,
      daysCount: sortedDays.length,
      holidaysCount,
      eventsCount,
      instructionalCount,
      dayOrdersCount,
      startDate,
      endDate,
      lastChecked: Date.now(),
      lastUpdated: Date.now()
    };

    // 1. Overwrite storage with ONLY the current / latest semester calendar
    await chrome.storage.local.set({ [CALENDAR_STORAGE_KEY]: calendarRecord });

    // 2. Automatically delete/prune old semester personal events
    const peKey = "vit_calendar_personal_events";
    const storedPe = await chrome.storage.local.get(peKey);
    let currentPersonalEvents = storedPe[peKey] || [];
    if (Array.isArray(currentPersonalEvents) && currentPersonalEvents.length > 0 && startDate) {
      const prunedEvents = currentPersonalEvents.filter((e) => {
        if (!e.date) return false;
        if (startDate && e.date < startDate) return false;
        if (endDate && e.date > endDate) return false;
        return true;
      });

      if (prunedEvents.length !== currentPersonalEvents.length) {
        currentPersonalEvents = prunedEvents;
        await chrome.storage.local.set({ [peKey]: prunedEvents });
      }
    }

    // 3. Persist to on-disk IndexedDB (clears out old semester calendar rows and updates personal events)
    try {
      if (window.VITCM_DB?.saveCalendarData) {
        await window.VITCM_DB.saveCalendarData(calendarRecord);
      }
      if (window.VITCM_DB?.savePersonalEvents) {
        await window.VITCM_DB.savePersonalEvents(currentPersonalEvents);
      }
    } catch (_dbErr) {
      console.warn("VIT Companion: DB save calendar error", _dbErr);
    }

    return {
      ok: true,
      semesterId: semId,
      semesterName: semName,
      daysCount: sortedDays.length,
      holidaysCount,
      eventsCount,
      instructionalCount,
      dayOrdersCount,
      startDate,
      endDate
    };
  }

  /**
   * Background extractor for Academic Calendar.
   * Can run without navigating to the Academic Calendar page!
   */
  async function autoFetchCalendarInBackground(force = false, targetSemId = null) {
    if (!window.location.hostname.includes("vtopcc.vit.ac.in")) {
      return { ok: false, reason: "not-vtop" };
    }

    if (document.querySelector('input[type="password"]') || document.getElementById("captchaBlock")) {
      return { ok: false, reason: "on-login-page" };
    }

    if (!force) {
      try {
        const stored = await chrome.storage.local.get(CALENDAR_STORAGE_KEY);
        const lastChecked = stored[CALENDAR_STORAGE_KEY]?.lastChecked || 0;
        if (Date.now() - lastChecked < 6 * 60 * 60 * 1000) {
          return { ok: true, reason: "throttled" };
        }
      } catch (_e) {}
    }

    try {
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

      const origin = window.location.origin;

      // Step 1: Establish page context with CalendarPreview
      const previewUrls = [
        `${origin}/vtop/academics/common/CalendarPreview`,
        `${origin}/academics/common/CalendarPreview`
      ];

      let previewDoc = null;
      let usedBase = `${origin}/vtop/`;

      for (const pUrl of previewUrls) {
        try {
          const bodyParams = new URLSearchParams();
          if (csrfToken) bodyParams.append("_csrf", csrfToken);
          if (authId) bodyParams.append("authorizedID", authId);

          const r = await fetch(pUrl, {
            method: "POST",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: bodyParams.toString(),
            credentials: "include"
          });

          if (r.ok) {
            const pHtml = await r.text();
            const parser = new DOMParser();
            previewDoc = parser.parseFromString(pHtml, "text/html");
            usedBase = pUrl.substring(0, pUrl.lastIndexOf("/") + 1);
            break;
          }
        } catch (_err) {}
      }

      // Extract semester options from previewDoc or fallback
      let availableSemesters = [];
      if (previewDoc) {
        const docCsrf = previewDoc.querySelector('input[name="_csrf"]')?.value ||
                        previewDoc.querySelector('input[id="_csrf"]')?.value;
        if (docCsrf) csrfToken = docCsrf;

        const docAuth = previewDoc.querySelector('input[name="authorizedID"]')?.value ||
                        previewDoc.getElementById("authorizedID")?.value;
        if (docAuth) authId = docAuth;

        const semSelect = previewDoc.querySelector("#semesterSubId") ||
                          previewDoc.querySelector("select[name='semesterSubId']") ||
                          previewDoc.querySelector("select");

        if (semSelect) {
          availableSemesters = Array.from(semSelect.querySelectorAll("option"))
            .map((o) => ({ id: (o.value || "").trim(), name: (o.text || "").trim() }))
            .filter((o) => o.id && !["0", "-1", "all", "none"].includes(o.id.toLowerCase()) && !o.name.toLowerCase().includes("select"));
        }
      }

      // Fallback: If no semesters found in CalendarPreview, fetch from StudentTimeTableChn
      if (availableSemesters.length === 0) {
        try {
          const semFetchParams = new URLSearchParams();
          if (csrfToken) semFetchParams.append("_csrf", csrfToken);
          if (authId) semFetchParams.append("authorizedID", authId);
          semFetchParams.append("verifyMenu", "true");
          semFetchParams.append("nocache", String(Date.now()));

          const semRes = await fetch(`${origin}/vtop/academics/common/StudentTimeTableChn`, {
            method: "POST",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: semFetchParams.toString(),
            credentials: "include"
          });

          if (semRes.ok) {
            const semHtml = await semRes.text();
            const sParser = new DOMParser();
            const sDoc = sParser.parseFromString(semHtml, "text/html");
            const selectEl = sDoc.querySelector("select");
            if (selectEl) {
              availableSemesters = Array.from(selectEl.querySelectorAll("option"))
                .map((o) => ({ id: (o.value || "").trim(), name: (o.text || "").trim() }))
                .filter((o) => o.id && !["0", "-1", "all", "none"].includes(o.id.toLowerCase()) && !o.name.toLowerCase().includes("select"));
            }
          }
        } catch (_semErr) {}
      }

      // Also check if marks store already has detected semesters
      if (availableSemesters.length === 0) {
        try {
          const marksStored = await chrome.storage.local.get("vit_stored_marks");
          const mSems = marksStored?.vit_stored_marks?.availableSemesters || [];
          if (mSems.length > 0) availableSemesters = mSems;
        } catch (_mErr) {}
      }

      // Pick target semester: latest, general, non-industry (per user request)
      let chosenSem = null;
      if (targetSemId) {
        chosenSem = availableSemesters.find((s) => s.id === targetSemId) || { id: targetSemId, name: targetSemId };
      } else {
        chosenSem = findLatestGeneralSemester(availableSemesters);
      }

      if (!chosenSem || !chosenSem.id) {
        return { ok: false, reason: "semester-not-found" };
      }

      const chosenSemId = chosenSem.id;
      const chosenSemName = chosenSem.name || chosenSemId;

      // Step 2: Fetch month list via getListForSemester
      const listParams = new URLSearchParams();
      if (csrfToken) listParams.append("_csrf", csrfToken);
      if (authId) listParams.append("authorizedID", authId);
      listParams.append("paramReturnId", "getListForSemester");
      listParams.append("semSubId", chosenSemId);
      listParams.append("classGroupId", "COMB");
      listParams.append("x", new Date().toUTCString());

      let listHtml = "";
      const listUrls = [
        `${origin}/vtop/getListForSemester`,
        `${origin}/getListForSemester`
      ];

      for (const lUrl of listUrls) {
        try {
          const lRes = await fetch(lUrl, {
            method: "POST",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: listParams.toString(),
            credentials: "include"
          });
          if (lRes.ok) {
            listHtml = await lRes.text();
            break;
          }
        } catch (_lErr) {}
      }

      const monthTokens = parseCalendarMonths(listHtml);
      if (monthTokens.length === 0) {
        return { ok: false, reason: "no-months-returned", semesterId: chosenSemId, semesterName: chosenSemName };
      }

      // Step 3: Fetch each month's days table via processViewCalendar
      const allDays = [];
      const calUrls = [
        `${origin}/vtop/processViewCalendar`,
        `${origin}/processViewCalendar`
      ];

      for (let mIdx = 0; mIdx < monthTokens.length; mIdx++) {
        const cd = monthTokens[mIdx];
        const monthParams = new URLSearchParams();
        if (csrfToken) monthParams.append("_csrf", csrfToken);
        if (authId) monthParams.append("authorizedID", authId);
        monthParams.append("calDate", cd);
        monthParams.append("semSubId", chosenSemId);
        monthParams.append("classGroupId", "COMB");
        monthParams.append("x", new Date().toUTCString());

        let monthHtml = "";
        for (const cUrl of calUrls) {
          try {
            const mRes = await fetch(cUrl, {
              method: "POST",
              headers: {
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
              },
              body: monthParams.toString(),
              credentials: "include"
            });
            if (mRes.ok) {
              monthHtml = await mRes.text();
              break;
            }
          } catch (_mErr) {}
        }

        if (monthHtml) {
          const mDays = parseAcademicCalendarHtml(monthHtml, cd);
          allDays.push(...mDays);
        }

        // Polite throttle between month fetches
        if (mIdx < monthTokens.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      }

      const result = await processCalendarData(
        allDays,
        { id: chosenSemId, name: chosenSemName },
        availableSemesters
      );

      return {
        ...result,
        monthsCount: monthTokens.length,
        months: monthTokens
      };
    } catch (err) {
      console.error("VIT Companion: autoFetchCalendarInBackground error", err);
      return { ok: false, error: err.message || String(err) };
    }
  }

  // Handle messages from popup / background
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request?.message === "fetch_academic_calendar") {
      (async () => {
        try {
          const targetSem = request.semesterSubId || null;
          const force = request.force !== undefined ? request.force : true;
          const res = await autoFetchCalendarInBackground(force, targetSem);
          sendResponse(res);
        } catch (err) {
          sendResponse({ ok: false, error: err.message || String(err) });
        }
      })();
      return true;
    }

    if (request?.message === "get_saved_academic_calendar") {
      (async () => {
        try {
          const stored = await chrome.storage.local.get(CALENDAR_STORAGE_KEY);
          sendResponse({ ok: true, data: stored[CALENDAR_STORAGE_KEY] || null });
        } catch (err) {
          sendResponse({ ok: false, error: err.message || String(err) });
        }
      })();
      return true;
    }
  });

  // Auto-fetch in background after login if on VTOP tab
  let calPostLoginDone = false;
  function checkPostLoginCalendarFetch() {
    if (calPostLoginDone) return;
    if (window.location.hostname.includes("vtopcc.vit.ac.in")) {
      const isLoginPage = Boolean(
        document.querySelector('input[type="password"]') || document.getElementById("captchaBlock")
      );
      const isDashboardLoaded = Boolean(
        document.getElementById("authorizedID") ||
        document.querySelector(".navbar") ||
        document.querySelector(".page-content") ||
        document.querySelector(".collapse.navbar-collapse")
      );
      if (!isLoginPage && isDashboardLoaded) {
        calPostLoginDone = true;
        setTimeout(() => {
          autoFetchCalendarInBackground(false).catch(() => {});
        }, 3500);
      }
    }
  }

  try {
    checkPostLoginCalendarFetch();
    const observer = new MutationObserver(() => {
      checkPostLoginCalendarFetch();
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  } catch (_e) {}

  window.VITCM_CALENDAR = {
    CALENDAR_STORAGE_KEY,
    weekdayOf,
    findLatestGeneralSemester,
    parseCalendarMonths,
    parseAcademicCalendarHtml,
    classifyDay,
    processCalendarData,
    autoFetchCalendarInBackground
  };
})();
