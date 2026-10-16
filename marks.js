(() => {
  "use strict";

  const APPLIED_FLAG = "vitCmMarksEnhanced";

  const MARKS_STORAGE_KEY = "vit_stored_marks";

  const isMarksPage = () => document.querySelectorAll(".customTable-level1 > tbody").length > 0;

  const isApplied = () => {
    if (document.body?.dataset?.[APPLIED_FLAG] === "1") {
      return true;
    }
    return Boolean(document.querySelector(".tableContent-level1 b")?.textContent?.includes("Lost Weightage Marks"));
  };

  function extractCourseInfo(subHeaderRow, j) {
    let classNbr = "";
    let courseCode = "";
    let courseTitle = "";
    let courseType = "";
    let faculty = "";
    let slot = "";

    if (subHeaderRow && subHeaderRow.length > 0) {
      const texts = Array.from(subHeaderRow).map((td) => td.innerText.trim());

      // VTOP Standard Table Structure:
      // index 0: Sl.No. (e.g. 1, 2)
      // index 1: ClassNbr (e.g. CH2026270103305)
      // index 2: Course Code (e.g. BSSC102N, BCSE432E)
      // index 3: Course Title (e.g. Indian Constitution, Reinforcement Learning)
      // index 4: Course Type (e.g. Online Course, Embedded Theory)
      // index 5: Course System (e.g. CBCS)
      // index 6: Faculty (e.g. POOJA, BHARADWAJA KUMAR)
      // index 7: Slot (e.g. NIL, E1+TE1)
      // index 8: Course Mode (e.g. OCC02, CBL09)

      const codeRegex = /^[A-Z]{2,5}\d{3,4}[A-Z0-9]*$/i;

      if (texts.length >= 4) {
        if (codeRegex.test(texts[2]?.replace(/\s+/g, ""))) {
          classNbr = texts[1] || "";
          courseCode = texts[2] || "";
          courseTitle = texts[3] || "";
          courseType = texts[4] || "";
          faculty = texts[6] || "";
          slot = texts[7] || "";
        } else if (codeRegex.test(texts[1]?.replace(/\s+/g, "")) && !texts[1].toUpperCase().startsWith("CH20")) {
          courseCode = texts[1] || "";
          courseTitle = texts[2] || "";
          courseType = texts[3] || texts[4] || "";
          faculty = texts[5] || "";
          slot = texts[6] || "";
        } else {
          const foundIdx = texts.findIndex((t, idx) => idx > 0 && codeRegex.test(t.replace(/\s+/g, "")));
          if (foundIdx !== -1) {
            classNbr = texts[foundIdx - 1] || "";
            courseCode = texts[foundIdx];
            courseTitle = texts[foundIdx + 1] || "";
            courseType = texts[foundIdx + 2] || "";
            faculty = texts[foundIdx + 4] || "";
            slot = texts[foundIdx + 5] || "";
          } else {
            courseCode = texts[2] || texts[1] || `Course_${j + 1}`;
            courseTitle = texts[3] || texts[2] || courseCode;
            courseType = texts[4] || "";
          }
        }
      } else {
        courseCode = texts[1] || `Course_${j + 1}`;
        courseTitle = texts[2] || courseCode;
        courseType = texts[3] || "";
      }
    }

    if (!courseCode) {
      courseCode = `Course_${j + 1}`;
    }
    if (!courseTitle) {
      courseTitle = courseCode;
    }

    return {
      classNbr: classNbr.trim(),
      courseCode: courseCode.trim(),
      courseTitle: courseTitle.trim(),
      courseType: courseType.trim(),
      faculty: faculty.trim(),
      slot: slot.trim(),
      subType: courseType.trim()
    };
  }

  function detectSemesterInfo(root = document) {
    const semSelect = root.querySelector("#semesterSubId") ||
                      root.querySelector("select[name='semesterSubId']") ||
                      root.querySelector("select");

    let availableSemesters = [];
    let current = null;

    if (semSelect) {
      const validOptions = Array.from(semSelect.querySelectorAll("option")).filter(
        (o) =>
          o.value &&
          o.value.trim() &&
          !["all", "0", "none", "select", "-1"].includes(o.value.toLowerCase().trim()) &&
          !o.text.toLowerCase().includes("select")
      );

      availableSemesters = validOptions.map((o) => ({
        id: o.value.trim(),
        name: o.text.trim()
      }));

      const selectedOption =
        semSelect.querySelector("option[selected]:not([value='']):not([value='0'])") ||
        (semSelect.selectedIndex >= 0 && validOptions.includes(semSelect.options[semSelect.selectedIndex])
          ? semSelect.options[semSelect.selectedIndex]
          : null) ||
        validOptions[0];

      if (selectedOption) {
        current = {
          id: selectedOption.value.trim(),
          name: selectedOption.text.trim()
        };
      }
    }

    if (!current) {
      const headings = Array.from(
        root.querySelectorAll("h1, h2, h3, h4, h5, h6, .card-title, .panelHead, label, span, p, td, b")
      );
      for (const h of headings) {
        const text = h.innerText?.trim() || "";
        const match = text.match(/(?:Fall|Winter|Summer)\s+Semester\s+\d{4}-\d{2}/i);
        if (match) {
          const semName = match[0].trim();
          current = {
            id: semName.replace(/\s+/g, "_"),
            name: semName
          };
          break;
        }
      }
    }

    if (!current) {
      current = {
        id: "current_semester",
        name: "Current Semester"
      };
    }

    if (availableSemesters.length === 0) {
      availableSemesters = [current];
    }

    return { current, availableSemesters };
  }

  function scrapeMarksFromDocument(root = document) {
    const tables = root.querySelectorAll(".customTable-level1 > tbody");
    if (!tables || tables.length === 0) {
      return null;
    }

    const subjectHeader = Array.from(root.querySelectorAll(".tableContent"));
    let i = 0;
    const courses = {};

    for (let j = 0; j < tables.length; j += 1) {
      const subHeaderRow = subjectHeader[i]?.getElementsByTagName("td");
      i += 2;

      const courseInfo = extractCourseInfo(subHeaderRow, j);
      const courseKey = `${courseInfo.courseCode} - ${courseInfo.courseTitle} (${courseInfo.subType || courseInfo.courseType || "General"})`;

      const tableMarks = Array.from(tables[j].querySelectorAll(".tableContent-level1"));
      const assessments = [];
      let courseSummary = null;

      for (let k = 0; k < tableMarks.length; k += 1) {
        const row = tableMarks[k];
        const rowText = row.innerText || "";

        // Check if row is Total / Lost Weightage summary
        if (rowText.includes("Total:") || rowText.includes("Lost Weightage")) {
          const numbers = rowText.match(/[0-9]+(?:\.[0-9]+)?/g) || [];
          if (numbers.length >= 2) {
            courseSummary = {
              totalMaxMarks: numbers[0] || "-",
              totalWeightage: numbers[1] || "-",
              totalScored: numbers[2] || "-",
              totalWeightageScored: numbers[3] || "-",
              lostWeightage: numbers[4] || "-"
            };
          }
          continue;
        }

        if (
          (row.style.background && row.style.background !== "") ||
          rowText.includes("You need only") ||
          rowText.includes("Minimum marks required") ||
          rowText.includes("You have")
        ) {
          continue;
        }

        const tds = Array.from(row.getElementsByTagName("td")).map((td) => td.innerText.trim());
        if (tds.length < 4) {
          continue;
        }

        // Columns:
        // tds[0]: Sl.No.
        // tds[1]: Mark Title (e.g. Assessment - 1, Continuous Assessment Test - I)
        // tds[2]: Max. Mark
        // tds[3]: Weightage %
        // tds[4]: Status (e.g. Present)
        // tds[5]: Scored Mark (e.g. 9.0, 36.0, or -)
        // tds[6]: Weightage Mark (e.g. 9, 10.8)
        // tds[7]: Class Average
        // tds[8]: Mark Posted Strength
        // tds[9]: Remark
        let title = tds[1] || `Assessment ${k + 1}`;
        let maxMarks = tds[2] || "-";
        let weightagePercent = tds[3] || "-";
        let status = tds[4] || "";
        let scored = tds[5] !== undefined && tds[5] !== "" ? tds[5] : "-";
        let weightageEqui = tds[6] !== undefined && tds[6] !== "" ? tds[6] : "-";
        let classAvg = tds[7] !== undefined && tds[7] !== "" ? tds[7] : "-";

        assessments.push({
          title,
          maxMarks,
          weightagePercent,
          status,
          scored,
          weightageEqui,
          classAvg
        });
      }

      courses[courseKey] = {
        ...courseInfo,
        courseKey,
        summary: courseSummary,
        assessments
      };
    }

    const semInfo = detectSemesterInfo(root);

    return {
      courses,
      scrapedAt: Date.now(),
      semesterInfo: semInfo.current,
      availableSemesters: semInfo.availableSemesters
    };
  }

  async function processScrapedMarks(newData, semesterInfo = null, availableSemesters = null, triggerNotification = true) {
    if (!newData || !newData.courses || Object.keys(newData.courses).length === 0) {
      return { ok: false, reason: "no-data" };
    }

    const stored = await chrome.storage.local.get(MARKS_STORAGE_KEY);
    const oldData = stored[MARKS_STORAGE_KEY] || {};

    const semInfo = semesterInfo || newData.semesterInfo || detectSemesterInfo(document).current;
    const semId = semInfo.id;
    const semName = semInfo.name;

    const semesters = oldData.semesters || {};

    // Backward-compatibility: if oldData has courses but no semesters map, migrate it
    if (!oldData.semesters && oldData.courses && Object.keys(oldData.courses).length > 0) {
      const fallbackId = oldData.currentSemesterId || semId || "current_semester";
      const fallbackName = oldData.currentSemesterName || semName || "Current Semester";
      semesters[fallbackId] = {
        id: fallbackId,
        name: fallbackName,
        courses: oldData.courses,
        lastScraped: oldData.lastUpdated || Date.now()
      };
    }

    const oldSemRecord = semesters[semId] || null;
    const oldCourses = oldSemRecord ? oldSemRecord.courses : (oldData.courses || {});
    const updates = [];

    if (oldCourses && Object.keys(oldCourses).length > 0) {
      for (const [courseKey, newCourse] of Object.entries(newData.courses)) {
        const oldCourse = oldCourses[courseKey];

        if (!oldCourse) {
          for (const ass of newCourse.assessments) {
            if (ass.scored !== "-" && ass.scored !== "N/A" && ass.scored !== "") {
              updates.push({
                semesterId: semId,
                semesterName: semName,
                courseCode: newCourse.courseCode,
                courseTitle: newCourse.courseTitle,
                assessmentTitle: ass.title,
                oldScored: "-",
                newScored: ass.scored,
                maxMarks: ass.maxMarks,
                weightageEqui: ass.weightageEqui,
                timestamp: Date.now()
              });
            }
          }
        } else {
          for (const newAss of newCourse.assessments) {
            const oldAss = oldCourse.assessments.find(
              (a) => a.title.trim().toLowerCase() === newAss.title.trim().toLowerCase()
            );

            if (!oldAss) {
              if (newAss.scored !== "-" && newAss.scored !== "N/A" && newAss.scored !== "") {
                updates.push({
                  semesterId: semId,
                  semesterName: semName,
                  courseCode: newCourse.courseCode,
                  courseTitle: newCourse.courseTitle,
                  assessmentTitle: newAss.title,
                  oldScored: "-",
                  newScored: newAss.scored,
                  maxMarks: newAss.maxMarks,
                  weightageEqui: newAss.weightageEqui,
                  timestamp: Date.now()
                });
              }
            } else {
              const oldVal = (oldAss.scored || "-").trim();
              const newVal = (newAss.scored || "-").trim();
              if (newVal !== "-" && newVal !== "N/A" && newVal !== "" && oldVal !== newVal) {
                updates.push({
                  semesterId: semId,
                  semesterName: semName,
                  courseCode: newCourse.courseCode,
                  courseTitle: newCourse.courseTitle,
                  assessmentTitle: newAss.title,
                  oldScored: oldVal,
                  newScored: newVal,
                  maxMarks: newAss.maxMarks,
                  weightageEqui: newAss.weightageEqui,
                  timestamp: Date.now()
                });
              }
            }
          }
        }
      }
    }

    semesters[semId] = {
      id: semId,
      name: semName,
      courses: newData.courses,
      lastScraped: Date.now()
    };

    const existingAvail = oldData.availableSemesters || [];
    const mergedAvail = [...existingAvail];
    const incomingAvail = availableSemesters || newData.availableSemesters || [semInfo];
    for (const s of incomingAvail) {
      if (s && s.id && !mergedAvail.some((m) => m.id === s.id)) {
        mergedAvail.push(s);
      }
    }

    const existingUpdates = oldData?.recentUpdates || [];
    const mergedUpdates = [...updates, ...existingUpdates].slice(0, 30);

    const updatedRecord = {
      ...oldData,
      currentSemesterId: semId,
      currentSemesterName: semName,
      selectedSemesterId: oldData.selectedSemesterId || semId,
      availableSemesters: mergedAvail,
      semesters: semesters,
      courses: newData.courses,
      lastUpdated: updates.length > 0 ? Date.now() : (oldData?.lastUpdated || Date.now()),
      lastChecked: Date.now(),
      recentUpdates: mergedUpdates,
      unreadUpdatesCount: (oldData?.unreadUpdatesCount || 0) + (triggerNotification ? updates.length : 0)
    };

    await chrome.storage.local.set({ [MARKS_STORAGE_KEY]: updatedRecord });

    try {
      if (window.VITCM_DB?.saveMarksData) {
        await window.VITCM_DB.saveMarksData(updatedRecord);
      }
    } catch (_dbErr) {
      console.warn("VIT Companion: DB save error", _dbErr);
    }

    if (triggerNotification && updates.length > 0) {
      try {
        chrome.runtime.sendMessage({
          type: "VITCM_NOTIFY_MARKS",
          updates
        });
      } catch (_e) {}
    }

    return {
      ok: true,
      semesterId: semId,
      semesterName: semName,
      updatesCount: updates.length,
      coursesCount: Object.keys(newData.courses).length,
      updates
    };
  }

  async function autoFetchMarksInBackground(force = false, targetSemId = null) {
    if (!window.location.hostname.includes("vtopcc.vit.ac.in")) {
      return { ok: false, reason: "not-vtop" };
    }

    if (document.querySelector('input[type="password"]') || document.getElementById("captchaBlock")) {
      return { ok: false, reason: "on-login-page" };
    }

    if (isMarksPage() && !targetSemId) {
      const liveScraped = scrapeMarksFromDocument(document);
      if (liveScraped && Object.keys(liveScraped.courses).length > 0) {
        return await processScrapedMarks(
          liveScraped,
          liveScraped.semesterInfo,
          liveScraped.availableSemesters
        );
      }
    }

    if (!force) {
      try {
        const stored = await chrome.storage.local.get(MARKS_STORAGE_KEY);
        const lastChecked = stored[MARKS_STORAGE_KEY]?.lastChecked || 0;
        if (Date.now() - lastChecked < 5 * 60 * 1000) {
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
      const markViewUrls = [];

      const marksAnchor = Array.from(document.querySelectorAll("a[data-url]")).find(
        (a) => a.dataset.url && a.dataset.url.toLowerCase().includes("mark")
      );
      if (marksAnchor && marksAnchor.dataset.url) {
        let cleanUrl = marksAnchor.dataset.url.trim();
        if (!cleanUrl.startsWith("/")) cleanUrl = "/" + cleanUrl;
        markViewUrls.push(`${origin}${cleanUrl}`);
        if (!cleanUrl.startsWith("/vtop")) {
          markViewUrls.push(`${origin}/vtop${cleanUrl}`);
        }
      }

      markViewUrls.push(
        `${origin}/vtop/examinations/StudentMarkView`,
        `${origin}/examinations/StudentMarkView`
      );

      let res = null;
      let usedUrl = "";

      for (const url of markViewUrls) {
        try {
          const bodyParams = new URLSearchParams();
          if (csrfToken) bodyParams.append("_csrf", csrfToken);
          if (authId) bodyParams.append("authorizedID", authId);

          let r = await fetch(url, {
            method: "POST",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: bodyParams.toString() ? bodyParams.toString() : undefined,
            credentials: "include"
          });

          if (!r.ok) {
            r = await fetch(url, {
              method: "GET",
              headers: {
                "X-Requested-With": "XMLHttpRequest"
              },
              credentials: "include"
            });
          }

          if (r.ok) {
            res = r;
            usedUrl = url;
            break;
          }
        } catch (_err) {}
      }

      if (!res) {
        return { ok: false, reason: "failed-to-connect-markview" };
      }

      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      if (doc.querySelectorAll(".customTable-level1 > tbody").length > 0 && !targetSemId) {
        const scraped = scrapeMarksFromDocument(doc);
        if (scraped && Object.keys(scraped.courses).length > 0) {
          return await processScrapedMarks(
            scraped,
            scraped.semesterInfo,
            scraped.availableSemesters
          );
        }
      }

      const semSelect = doc.querySelector("#semesterSubId") ||
                        doc.querySelector("select[name='semesterSubId']") ||
                        doc.querySelector("select");

      const docCsrf = (
        doc.querySelector('input[name="_csrf"]')?.value ||
        doc.querySelector('input[id="_csrf"]')?.value ||
        doc.querySelector('input[id="csrf"]')?.value ||
        ""
      );
      if (docCsrf) csrfToken = docCsrf;

      const docAuthId = (
        doc.querySelector('input[name="authorizedID"]')?.value ||
        doc.getElementById("authorizedID")?.value ||
        ""
      );
      if (docAuthId) authId = docAuthId;

      if (semSelect) {
        const validOptions = Array.from(semSelect.querySelectorAll("option")).filter(
          (o) =>
            o.value &&
            o.value.trim() &&
            !["all", "0", "none", "select", "-1"].includes(o.value.toLowerCase().trim()) &&
            !o.text.toLowerCase().includes("select")
        );
        const availableSemesters = validOptions.map((o) => ({
          id: o.value.trim(),
          name: o.text.trim()
        }));

        let chosenOption = null;
        if (targetSemId) {
          chosenOption = validOptions.find((o) => o.value.trim() === targetSemId) || { value: targetSemId, text: targetSemId };
        } else {
          const selectedOption = semSelect.querySelector("option[selected]:not([value='']):not([value='0'])");
          chosenOption = selectedOption || validOptions[0];
        }
        const semId = chosenOption ? (chosenOption.value || chosenOption.id || "").trim() : "";
        const semName = chosenOption ? (chosenOption.text || chosenOption.name || semId).trim() : "Current Semester";

        if (semId) {
          const doBase = usedUrl.substring(0, usedUrl.lastIndexOf("/") + 1);
          const doUrl = `${doBase}doStudentMarkView`;

          const doParams = new URLSearchParams();
          if (csrfToken) doParams.append("_csrf", csrfToken);
          if (authId) doParams.append("authorizedID", authId);
          doParams.append("semesterSubId", semId);

          const doRes = await fetch(doUrl, {
            method: "POST",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: doParams.toString(),
            credentials: "include"
          });

          if (doRes.ok) {
            const doHtml = await doRes.text();
            const marksDoc = parser.parseFromString(doHtml, "text/html");
            if (marksDoc.querySelectorAll(".customTable-level1 > tbody").length > 0) {
              const scraped = scrapeMarksFromDocument(marksDoc);
              if (scraped && Object.keys(scraped.courses).length > 0) {
                return await processScrapedMarks(
                  scraped,
                  { id: semId, name: semName },
                  availableSemesters
                );
              }
            }
          }
        }
      }

      return { ok: false, reason: "marks-table-not-found" };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  }

  async function fetchAllSemestersInBackground() {
    if (!window.location.hostname.includes("vtopcc.vit.ac.in")) {
      return { ok: false, reason: "not-vtop" };
    }

    if (document.querySelector('input[type="password"]') || document.getElementById("captchaBlock")) {
      return { ok: false, reason: "on-login-page" };
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
      const markViewUrls = [];

      const marksAnchor = Array.from(document.querySelectorAll("a[data-url]")).find(
        (a) => a.dataset.url && a.dataset.url.toLowerCase().includes("mark")
      );
      if (marksAnchor && marksAnchor.dataset.url) {
        let cleanUrl = marksAnchor.dataset.url.trim();
        if (!cleanUrl.startsWith("/")) cleanUrl = "/" + cleanUrl;
        markViewUrls.push(`${origin}${cleanUrl}`);
        if (!cleanUrl.startsWith("/vtop")) {
          markViewUrls.push(`${origin}/vtop${cleanUrl}`);
        }
      }

      markViewUrls.push(
        `${origin}/vtop/examinations/StudentMarkView`,
        `${origin}/examinations/StudentMarkView`
      );

      let res = null;
      let usedUrl = "";

      for (const url of markViewUrls) {
        try {
          const bodyParams = new URLSearchParams();
          if (csrfToken) bodyParams.append("_csrf", csrfToken);
          if (authId) bodyParams.append("authorizedID", authId);

          let r = await fetch(url, {
            method: "POST",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: bodyParams.toString() ? bodyParams.toString() : undefined,
            credentials: "include"
          });

          if (!r.ok) {
            r = await fetch(url, {
              method: "GET",
              headers: { "X-Requested-With": "XMLHttpRequest" },
              credentials: "include"
            });
          }

          if (r.ok) {
            res = r;
            usedUrl = url;
            break;
          }
        } catch (_err) {}
      }

      if (!res) {
        return { ok: false, reason: "failed-to-connect-markview" };
      }

      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const semSelect = doc.querySelector("#semesterSubId") ||
                        doc.querySelector("select[name='semesterSubId']") ||
                        doc.querySelector("select");

      const docCsrf = (
        doc.querySelector('input[name="_csrf"]')?.value ||
        doc.querySelector('input[id="_csrf"]')?.value ||
        doc.querySelector('input[id="csrf"]')?.value ||
        ""
      );
      if (docCsrf) csrfToken = docCsrf;

      const docAuthId = (
        doc.querySelector('input[name="authorizedID"]')?.value ||
        doc.getElementById("authorizedID")?.value ||
        ""
      );
      if (docAuthId) authId = docAuthId;

      if (!semSelect) {
        return { ok: false, reason: "no-semester-select" };
      }

      const validOptions = Array.from(semSelect.querySelectorAll("option")).filter(
        (o) =>
          o.value &&
          o.value.trim() &&
          !["all", "0", "none", "select", "-1"].includes(o.value.toLowerCase().trim()) &&
          !o.text.toLowerCase().includes("select")
      );

      const availableSemesters = validOptions.map((o) => ({
        id: o.value.trim(),
        name: o.text.trim()
      }));

      const doBase = usedUrl.substring(0, usedUrl.lastIndexOf("/") + 1);
      const doUrl = `${doBase}doStudentMarkView`;
      let syncedCount = 0;

      for (let idx = 0; idx < validOptions.length; idx++) {
        const opt = validOptions[idx];
        const semId = opt.value.trim();
        const semName = opt.text.trim();

        try {
          const doParams = new URLSearchParams();
          if (csrfToken) doParams.append("_csrf", csrfToken);
          if (authId) doParams.append("authorizedID", authId);
          doParams.append("semesterSubId", semId);

          const doRes = await fetch(doUrl, {
            method: "POST",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: doParams.toString(),
            credentials: "include"
          });

          if (doRes.ok) {
            const doHtml = await doRes.text();
            const marksDoc = parser.parseFromString(doHtml, "text/html");
            if (marksDoc.querySelectorAll(".customTable-level1 > tbody").length > 0) {
              const scraped = scrapeMarksFromDocument(marksDoc);
              if (scraped && Object.keys(scraped.courses).length > 0) {
                await processScrapedMarks(scraped, { id: semId, name: semName }, availableSemesters, false);
                syncedCount++;
              }
            }
          }
        } catch (_fetchErr) {}

        if (idx < validOptions.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      }

      return {
        ok: true,
        syncedCount,
        totalAvailable: validOptions.length,
        semesters: availableSemesters
      };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  }

  const modifyMarksPage = () => {
    if (!isMarksPage() || isApplied()) {
      return;
    }

    try {
      const liveScraped = scrapeMarksFromDocument(document);
      if (liveScraped) {
        processScrapedMarks(liveScraped).catch(() => {});
      }
    } catch (_err) {}

    const tables = document.querySelectorAll(".customTable-level1 > tbody");
    const subjectHeader = Array.from(document.querySelectorAll(".tableContent"));
    let headerIdx = 0;

    for (let j = 0; j < tables.length; j += 1) {
      const subHeaderRow = subjectHeader[headerIdx]?.getElementsByTagName("td");
      headerIdx += 2;

      const courseInfo = extractCourseInfo(subHeaderRow, j);
      const courseType = (courseInfo.subType || courseInfo.courseType || "").trim();

      // Remove any previously inserted vitcm rows to prevent duplicates
      tables[j].querySelectorAll(".vitcm-enhanced-row").forEach((el) => el.remove());

      let totMaxMarks = 0;
      let totWeightagePercent = 0;
      let totScored = 0;
      let totWeightageEqui = 0;
      let totClassAvg = 0;
      let hasClassAvgCol = false;
      let maxColsFound = 8;

      const rows = Array.from(tables[j].querySelectorAll(".tableContent-level1"));

      for (let k = 0; k < rows.length; k += 1) {
        const row = rows[k];
        const rowText = row.innerText || "";

        // Skip existing summary or alert rows
        if (
          row.classList.contains("vitcm-enhanced-row") ||
          rowText.includes("Total:") ||
          rowText.includes("Lost Weightage") ||
          rowText.includes("grade") ||
          rowText.includes("passing") ||
          rowText.includes("Minimum marks") ||
          rowText.includes("You need only") ||
          rowText.includes("You have")
        ) {
          continue;
        }

        const tds = Array.from(row.getElementsByTagName("td")).map((td) => td.innerText.trim());
        if (tds.length < 4) {
          continue;
        }

        maxColsFound = Math.max(maxColsFound, tds.length);
        if (tds.length >= 8) {
          hasClassAvgCol = true;
        }

        const maxMarks = parseFloat(tds[2]?.replace(/[^0-9.]+/g, "")) || 0;
        const weightagePercent = parseFloat(tds[3]?.replace(/[^0-9.]+/g, "")) || 0;
        const scored = parseFloat(tds[5]?.replace(/[^0-9.]+/g, "")) || 0;
        const weightageEqui = parseFloat(tds[6]?.replace(/[^0-9.]+/g, "")) || 0;
        const classAvg = parseFloat(tds[7]?.replace(/[^0-9.]+/g, "")) || 0;

        totMaxMarks += maxMarks;
        totWeightagePercent += weightagePercent;
        totScored += scored;
        totWeightageEqui += weightageEqui;
        totClassAvg += classAvg;
      }

      const colspan = maxColsFound >= 10 ? maxColsFound : (hasClassAvgCol ? 10 : 8);
      const lostWeightage = Math.max(0, totWeightagePercent - totWeightageEqui);

      // Total & Lost Weightage Row
      let totalRowHtml = "";
      if (hasClassAvgCol) {
        totalRowHtml = `
          <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(60, 141, 188, 0.85); color: #ffffff; font-weight: bold;">
            <td></td>
            <td><b>Total:</b></td>
            <td>${totMaxMarks.toFixed(2)}</td>
            <td>${totWeightagePercent.toFixed(2)}</td>
            <td></td>
            <td><b>${totScored.toFixed(2)}</b></td>
            <td><b>${totWeightageEqui.toFixed(2)}</b></td>
            <td>${totClassAvg > 0 ? totClassAvg.toFixed(2) : ""}</td>
            <td></td>
            <td><b>Lost Weightage Marks:</b></td>
            <td><b>${lostWeightage.toFixed(2)}</b></td>
          </tr>
        `;
      } else {
        totalRowHtml = `
          <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(60, 141, 188, 0.85); color: #ffffff; font-weight: bold;">
            <td></td>
            <td><b>Total:</b></td>
            <td>${totMaxMarks.toFixed(2)}</td>
            <td>${totWeightagePercent.toFixed(2)}</td>
            <td></td>
            <td><b>${totScored.toFixed(2)}</b></td>
            <td><b>${totWeightageEqui.toFixed(2)}</b></td>
            <td colspan="${Math.max(1, colspan - 7)}"><b>Lost Weightage Marks: ${lostWeightage.toFixed(2)}</b></td>
          </tr>
        `;
      }

      // Requirement / Passing / Grade Banner
      let bannerHtml = "";
      const isOnline = courseType.toLowerCase().includes("online");
      const isEmbeddedTheory = courseType.toLowerCase().includes("embedded theory");
      const isEmbeddedLab = courseType.toLowerCase().includes("embedded lab");
      const isLab = !isEmbeddedTheory && (courseType.toLowerCase().includes("lab") || isEmbeddedLab);
      const isSTS = courseType.toLowerCase().includes("soft") || courseType.toLowerCase().includes("sts");
      const isTheory = !isLab && !isSTS && !isOnline;

      if (totWeightagePercent >= 99.5) {
        // Complete 100% course assessments
        let grade = "E";
        let bg = "rgba(255, 50, 0, 0.6)";
        if (totWeightageEqui >= 90) {
          grade = "S";
          bg = "rgba(0, 255, 0, 0.6)";
        } else if (totWeightageEqui >= 80) {
          grade = "A";
          bg = "rgba(152, 251, 152, 0.6)";
        } else if (totWeightageEqui >= 70) {
          grade = "B";
          bg = "rgba(255, 255, 0, 0.6)";
        } else if (totWeightageEqui >= 60) {
          grade = "C";
          bg = "rgba(255, 150, 0, 0.6)";
        } else if (totWeightageEqui >= 50) {
          grade = "D";
          bg = "rgba(255, 100, 0, 0.6)";
        }

        if (totWeightageEqui >= 40) {
          bannerHtml = `
            <tr class="tableContent-level1 vitcm-enhanced-row" style="background: ${bg}; font-weight: bold;">
              <td colspan="${colspan}" style="text-align:center; padding: 6px;">You have secured ${grade} grade !! 🥳 (${totWeightageEqui.toFixed(2)} / 100)</td>
            </tr>
          `;
        } else {
          bannerHtml = `
            <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(255, 0, 0, 0.6); font-weight: bold;">
              <td colspan="${colspan}" style="text-align:center; padding: 6px;">Total score: ${totWeightageEqui.toFixed(2)} / 100 (Below passing mark of 40/50)</td>
            </tr>
          `;
        }
      } else if (isOnline) {
        // Online Course (e.g. 50% continuous weightage or similar)
        if (totWeightageEqui >= 50) {
          bannerHtml = `
            <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(170, 255, 0, 0.6); font-weight: bold;">
              <td colspan="${colspan}" style="text-align:center; padding: 6px;">You have fulfilled the criteria for passing this Online Course! 🥳 (${totWeightageEqui.toFixed(2)} marks)</td>
            </tr>
          `;
        } else {
          const needed = 50 - totWeightageEqui;
          bannerHtml = `
            <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(255, 220, 0, 0.5); font-weight: bold;">
              <td colspan="${colspan}" style="text-align:center; padding: 6px;">Current Scored: ${totWeightageEqui.toFixed(2)} / ${totWeightagePercent.toFixed(2)} | Need ${needed.toFixed(2)} more marks in final assessment to reach 50% pass mark.</td>
            </tr>
          `;
        }
      } else if (isEmbeddedTheory || isTheory) {
        // Theory or Embedded Theory:
        // Rule: Passing requires 40/100 in Theory FAT AND 50% overall course mark
        const remainingFatWeightage = Math.max(1, 100 - totWeightagePercent);
        const neededFor50 = 50 - totWeightageEqui;
        const fatMarksNeededFor50 = (neededFor50 / remainingFatWeightage) * 100;
        const requiredFat = Math.max(40, fatMarksNeededFor50);

        if (requiredFat <= 40) {
          bannerHtml = `
            <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(170, 255, 0, 0.6); font-weight: bold;">
              <td colspan="${colspan}" style="text-align:center; padding: 6px;">You need only 40 marks out of 100 in FAT to pass the theory component. 🥳</td>
            </tr>
          `;
        } else if (requiredFat <= 100) {
          bannerHtml = `
            <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(255, 100, 0, 0.6); font-weight: bold;">
              <td colspan="${colspan}" style="text-align:center; padding: 6px;"><b>Minimum marks required to clear theory component: ${requiredFat.toFixed(2)} / 100 in FAT</b></td>
            </tr>
          `;
        } else {
          bannerHtml = `
            <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(255, 0, 0, 0.6); font-weight: bold;">
              <td colspan="${colspan}" style="text-align:center; padding: 6px;"><b>Need ${neededFor50.toFixed(2)} more weightage marks to reach 50% overall. Score maximum in FAT!</b></td>
            </tr>
          `;
        }
      } else if (isLab || isEmbeddedLab) {
        // Lab or Embedded Lab:
        // Rule: Passing requires 50% overall
        if (totWeightageEqui >= 50) {
          bannerHtml = `
            <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(170, 255, 0, 0.6); font-weight: bold;">
              <td colspan="${colspan}" style="text-align:center; padding: 6px;">You have fulfilled the criteria of passing the Lab Component. 🥳</td>
            </tr>
          `;
        } else {
          const passMarks = 50 - totWeightageEqui;
          bannerHtml = `
            <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(255, 100, 0, 0.6); font-weight: bold;">
              <td colspan="${colspan}" style="text-align:center; padding: 6px;"><b>Minimum marks required to clear this Lab component is: ${passMarks.toFixed(2)} weightage marks (in Lab FAT)</b></td>
            </tr>
          `;
        }
      } else if (isSTS) {
        // Soft Skills (STS):
        if (totWeightageEqui >= 50) {
          bannerHtml = `
            <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(170, 255, 0, 0.6); font-weight: bold;">
              <td colspan="${colspan}" style="text-align:center; padding: 6px;">You have fulfilled the criteria of passing STS. 🥳</td>
            </tr>
          `;
        } else {
          const passMarks = 50 - totWeightageEqui;
          bannerHtml = `
            <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(255, 100, 0, 0.6); font-weight: bold;">
              <td colspan="${colspan}" style="text-align:center; padding: 6px;"><b>Minimum marks required to clear STS is: ${passMarks.toFixed(2)} marks</b></td>
            </tr>
          `;
        }
      } else {
        // General / Other course
        if (totWeightageEqui >= 50) {
          bannerHtml = `
            <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(170, 255, 0, 0.6); font-weight: bold;">
              <td colspan="${colspan}" style="text-align:center; padding: 6px;">You have secured ${totWeightageEqui.toFixed(2)} marks and cleared the 50% passing threshold. 🥳</td>
            </tr>
          `;
        } else {
          const passMarks = 50 - totWeightageEqui;
          bannerHtml = `
            <tr class="tableContent-level1 vitcm-enhanced-row" style="background: rgba(255, 100, 0, 0.6); font-weight: bold;">
              <td colspan="${colspan}" style="text-align:center; padding: 6px;"><b>Marks needed to reach 50% passing: ${passMarks.toFixed(2)} weightage marks</b></td>
            </tr>
          `;
        }
      }

      tables[j].insertAdjacentHTML("beforeend", totalRowHtml + bannerHtml);
    }

    if (document.body) {
      document.body.dataset[APPLIED_FLAG] = "1";
    }
  };

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request?.message === "check_mark_view_applied") {
      sendResponse({
        onMarksPage: isMarksPage(),
        applied: isApplied()
      });
      return true;
    }

    if (request?.message === "mark_view_page") {
      try {
        modifyMarksPage();
        sendResponse({ ok: true });
      } catch (_error) {
        console.error("VIT Companion: modifyMarksPage error", _error);
        sendResponse({ ok: false, error: _error?.message || String(_error) });
      }
      return true;
    }

    if (request?.message === "scrape_marks_now") {
      (async () => {
        try {
          const targetSem = request.semesterSubId || null;
          if (isMarksPage() && !targetSem) {
            const liveScraped = scrapeMarksFromDocument(document);
            if (liveScraped) {
              const res = await processScrapedMarks(
                liveScraped,
                liveScraped.semesterInfo,
                liveScraped.availableSemesters
              );
              sendResponse({ ok: true, source: "live-dom", ...res });
              return;
            }
          }
          const bgRes = await autoFetchMarksInBackground(true, targetSem);
          sendResponse({ ok: true, source: "background-fetch", ...bgRes });
        } catch (err) {
          sendResponse({ ok: false, error: err.message || String(err) });
        }
      })();
      return true;
    }

    if (request?.message === "scrape_all_semesters") {
      (async () => {
        try {
          const res = await fetchAllSemestersInBackground();
          sendResponse(res);
        } catch (err) {
          sendResponse({ ok: false, error: err.message || String(err) });
        }
      })();
      return true;
    }
  });

  let scrapeTimer = null;
  function scheduleScrapeAndEnhance() {
    if (scrapeTimer) clearTimeout(scrapeTimer);
    scrapeTimer = setTimeout(() => {
      if (isMarksPage()) {
        if (!isApplied()) {
          try {
            modifyMarksPage();
          } catch (err) {
            console.error("VIT Companion: modifyMarksPage error", err);
          }
        } else {
          try {
            const liveScraped = scrapeMarksFromDocument(document);
            if (liveScraped) {
              processScrapedMarks(
                liveScraped,
                liveScraped.semesterInfo,
                liveScraped.availableSemesters
              ).catch(() => {});
            }
          } catch (_e) {}
        }
      }
    }, 400);
  }

  let postLoginFetchDone = false;
  function checkPostLoginFetch() {
    if (postLoginFetchDone) return;
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
        postLoginFetchDone = true;
        setTimeout(() => {
          autoFetchMarksInBackground(false).catch(() => {});
        }, 1500);
      }
    }
  }

  // Auto-run enhancement and continuous observation for SPA tab transitions
  try {
    if (isMarksPage()) {
      scheduleScrapeAndEnhance();
    } else {
      checkPostLoginFetch();
    }
    const observer = new MutationObserver(() => {
      if (isMarksPage()) {
        scheduleScrapeAndEnhance();
      } else {
        checkPostLoginFetch();
      }
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  } catch (e) {
    console.error("VIT Companion: auto-run error", e);
  }

  // Auto-fetch marks in background if user is already logged in
  if (window.location.hostname.includes("vtopcc.vit.ac.in")) {
    setTimeout(() => {
      autoFetchMarksInBackground(false).catch(() => {});
    }, 3000);

    // Periodic background check every 15 minutes while VTOP tab is open
    setInterval(() => {
      autoFetchMarksInBackground(false).catch(() => {});
    }, 15 * 60 * 1000);
  }

  window.VITCM_MARKS = {
    isMarksPage,
    isApplied,
    modifyMarksPage,
    scrapeMarksFromDocument,
    processScrapedMarks,
    autoFetchMarksInBackground,
    fetchAllSemestersInBackground,
    detectSemesterInfo
  };
})();
