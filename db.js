/**
 * VIT Companion - Database Module (IndexedDB & SQLite Export)
 * Persists marks, courses, and semesters into an on-disk IndexedDB database (vit_companion_marks_db)
 * and provides export to SQLite (.db) format.
 */
(() => {
  "use strict";

  const DB_NAME = "vit_companion_marks_db";
  const DB_VERSION = 2;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB not supported in this environment"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains("semesters")) {
          db.createObjectStore("semesters", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("courses")) {
          const courseStore = db.createObjectStore("courses", { keyPath: "key" });
          courseStore.createIndex("semesterId", "semesterId", { unique: false });
        }
        if (!db.objectStoreNames.contains("assessments")) {
          const assStore = db.createObjectStore("assessments", { keyPath: "key" });
          assStore.createIndex("semesterId", "semesterId", { unique: false });
          assStore.createIndex("courseKey", "courseKey", { unique: false });
        }
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("calendar")) {
          const calStore = db.createObjectStore("calendar", { keyPath: "key" });
          calStore.createIndex("semesterId", "semesterId", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveMarksData(data) {
    if (!data) return false;
    try {
      const db = await openDatabase();
      const tx = db.transaction(["semesters", "courses", "assessments", "metadata"], "readwrite");

      const semStore = tx.objectStore("semesters");
      const courseStore = tx.objectStore("courses");
      const assStore = tx.objectStore("assessments");
      const metaStore = tx.objectStore("metadata");

      // Save metadata
      metaStore.put({ key: "lastChecked", value: data.lastChecked || Date.now() });
      metaStore.put({ key: "lastUpdated", value: data.lastUpdated || Date.now() });
      metaStore.put({ key: "currentSemesterId", value: data.currentSemesterId || "" });
      metaStore.put({ key: "currentSemesterName", value: data.currentSemesterName || "" });
      metaStore.put({ key: "selectedSemesterId", value: data.selectedSemesterId || "" });
      metaStore.put({ key: "recentUpdates", value: data.recentUpdates || [] });
      metaStore.put({ key: "unreadUpdatesCount", value: data.unreadUpdatesCount || 0 });
      metaStore.put({ key: "availableSemesters", value: data.availableSemesters || [] });

      const semesters = data.semesters || {};
      for (const [semId, sem] of Object.entries(semesters)) {
        semStore.put({
          id: semId,
          name: sem.name || semId,
          lastScraped: sem.lastScraped || Date.now()
        });

        const courses = sem.courses || {};
        for (const [courseKey, course] of Object.entries(courses)) {
          const cKey = `${semId}__${courseKey}`;
          courseStore.put({
            key: cKey,
            semesterId: semId,
            courseKey,
            courseCode: course.courseCode || "",
            courseTitle: course.courseTitle || "",
            courseType: course.courseType || course.subType || "",
            subType: course.subType || course.courseType || "",
            classNbr: course.classNbr || "",
            faculty: course.faculty || "",
            slot: course.slot || "",
            summary: course.summary || null
          });

          const assessments = course.assessments || [];
          assessments.forEach((ass, idx) => {
            const aKey = `${cKey}__${idx}__${ass.title}`;
            assStore.put({
              key: aKey,
              semesterId: semId,
              courseKey: cKey,
              courseCode: course.courseCode || "",
              title: ass.title || "",
              maxMarks: ass.maxMarks || "-",
              weightagePercent: ass.weightagePercent || "-",
              status: ass.status || "",
              scored: ass.scored || "-",
              weightageEqui: ass.weightageEqui || "-",
              classAvg: ass.classAvg || "-"
            });
          });
        }
      }

      return new Promise((resolve) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (err) {
      console.warn("VIT Companion: IndexedDB save error", err);
      return false;
    }
  }

  async function loadMarksData() {
    try {
      const db = await openDatabase();
      const tx = db.transaction(["semesters", "courses", "assessments", "metadata"], "readonly");

      const semStore = tx.objectStore("semesters");
      const courseStore = tx.objectStore("courses");
      const assStore = tx.objectStore("assessments");
      const metaStore = tx.objectStore("metadata");

      const getAll = (store) =>
        new Promise((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });

      const [semList, courseList, assList, metaList] = await Promise.all([
        getAll(semStore),
        getAll(courseStore),
        getAll(assStore),
        getAll(metaStore)
      ]);

      if (semList.length === 0 && courseList.length === 0) {
        return null;
      }

      const metaMap = {};
      metaList.forEach((m) => {
        metaMap[m.key] = m.value;
      });

      const semesters = {};
      semList.forEach((s) => {
        semesters[s.id] = {
          id: s.id,
          name: s.name,
          lastScraped: s.lastScraped,
          courses: {}
        };
      });

      const assByCourseKey = {};
      assList.forEach((a) => {
        if (!assByCourseKey[a.courseKey]) {
          assByCourseKey[a.courseKey] = [];
        }
        assByCourseKey[a.courseKey].push({
          title: a.title,
          maxMarks: a.maxMarks,
          weightagePercent: a.weightagePercent,
          status: a.status,
          scored: a.scored,
          weightageEqui: a.weightageEqui,
          classAvg: a.classAvg
        });
      });

      courseList.forEach((c) => {
        if (!semesters[c.semesterId]) {
          semesters[c.semesterId] = {
            id: c.semesterId,
            name: c.semesterId,
            courses: {}
          };
        }
        semesters[c.semesterId].courses[c.courseKey] = {
          classNbr: c.classNbr,
          courseCode: c.courseCode,
          courseTitle: c.courseTitle,
          courseType: c.courseType,
          subType: c.subType,
          faculty: c.faculty,
          slot: c.slot,
          summary: c.summary,
          assessments: assByCourseKey[c.key] || []
        };
      });

      const currentSemId = metaMap.currentSemesterId || Object.keys(semesters)[0] || "";

      return {
        semesters,
        availableSemesters: metaMap.availableSemesters || Object.values(semesters).map((s) => ({ id: s.id, name: s.name })),
        currentSemesterId: currentSemId,
        currentSemesterName: metaMap.currentSemesterName || (semesters[currentSemId]?.name || "Current Semester"),
        selectedSemesterId: metaMap.selectedSemesterId || currentSemId,
        courses: semesters[currentSemId]?.courses || {},
        lastUpdated: metaMap.lastUpdated || Date.now(),
        lastChecked: metaMap.lastChecked || Date.now(),
        recentUpdates: metaMap.recentUpdates || [],
        unreadUpdatesCount: metaMap.unreadUpdatesCount || 0
      };
    } catch (err) {
      console.warn("VIT Companion: IndexedDB load error", err);
      return null;
    }
  }

  async function saveCalendarData(calData) {
    if (!calData || !calData.semesterId) return false;
    try {
      const db = await openDatabase();
      const tx = db.transaction(["calendar", "metadata"], "readwrite");
      const calStore = tx.objectStore("calendar");
      const metaStore = tx.objectStore("metadata");

      const semId = calData.semesterId;
      metaStore.put({ key: "calendar_latest_sem_id", value: semId });
      metaStore.put({ key: "calendar_last_checked", value: calData.lastChecked || Date.now() });

      calStore.put({
        key: `sem__${semId}`,
        semesterId: semId,
        semesterName: calData.semesterName || semId,
        lastUpdated: calData.lastUpdated || Date.now(),
        lastChecked: calData.lastChecked || Date.now(),
        daysCount: (calData.days || []).length,
        holidaysCount: calData.holidaysCount || 0,
        eventsCount: calData.eventsCount || 0,
        instructionalCount: calData.instructionalCount || 0,
        dayOrdersCount: calData.dayOrdersCount || 0,
        days: calData.days || []
      });

      (calData.days || []).forEach((d) => {
        calStore.put({
          key: `day__${semId}__${d.date}`,
          semesterId: semId,
          date: d.date,
          dayNumber: d.dayNumber,
          weekday: d.weekday,
          instructional: d.instructional ? 1 : 0,
          dayOrder: d.dayOrder || "",
          label: d.label || "",
          isHoliday: d.isHoliday ? 1 : 0,
          isEvent: d.isEvent ? 1 : 0,
          eventType: d.eventType || ""
        });
      });

      return new Promise((resolve) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (err) {
      console.warn("VIT Companion: IndexedDB calendar save error", err);
      return false;
    }
  }

  async function loadCalendarData(targetSemId = null) {
    try {
      const db = await openDatabase();
      const tx = db.transaction(["calendar", "metadata"], "readonly");
      const calStore = tx.objectStore("calendar");
      const metaStore = tx.objectStore("metadata");

      const getMeta = (k) =>
        new Promise((resolve) => {
          const req = metaStore.get(k);
          req.onsuccess = () => resolve(req.result ? req.result.value : null);
          req.onerror = () => resolve(null);
        });

      let semId = targetSemId;
      if (!semId) {
        semId = await getMeta("calendar_latest_sem_id");
      }

      if (!semId) {
        const allKeys = await new Promise((resolve) => {
          const req = calStore.getAllKeys();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
        const semKey = allKeys.find((k) => String(k).startsWith("sem__"));
        if (semKey) {
          semId = String(semKey).replace("sem__", "");
        }
      }

      if (!semId) return null;

      const semRecord = await new Promise((resolve) => {
        const req = calStore.get(`sem__${semId}`);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });

      return semRecord;
    } catch (err) {
      console.warn("VIT Companion: IndexedDB calendar load error", err);
      return null;
    }
  }

  function generateSqliteDump(data) {
    const lines = [
      "-- ========================================================",
      "-- VIT Companion - Database Export (.db / SQLite)",
      `-- Generated on: ${new Date().toISOString()}`,
      "-- ========================================================",
      "",
      "PRAGMA foreign_keys = ON;",
      "BEGIN TRANSACTION;",
      "",
      "CREATE TABLE IF NOT EXISTS semesters (",
      "  id TEXT PRIMARY KEY,",
      "  name TEXT NOT NULL,",
      "  last_scraped INTEGER",
      ");",
      "",
      "CREATE TABLE IF NOT EXISTS courses (",
      "  id TEXT PRIMARY KEY,",
      "  semester_id TEXT NOT NULL,",
      "  course_code TEXT NOT NULL,",
      "  course_title TEXT NOT NULL,",
      "  course_type TEXT,",
      "  faculty TEXT,",
      "  slot TEXT,",
      "  class_nbr TEXT,",
      "  FOREIGN KEY (semester_id) REFERENCES semesters(id)",
      ");",
      "",
      "CREATE TABLE IF NOT EXISTS assessments (",
      "  id TEXT PRIMARY KEY,",
      "  course_id TEXT NOT NULL,",
      "  semester_id TEXT NOT NULL,",
      "  course_code TEXT NOT NULL,",
      "  title TEXT NOT NULL,",
      "  max_marks TEXT,",
      "  weightage_percent TEXT,",
      "  status TEXT,",
      "  scored_mark TEXT,",
      "  weightage_mark TEXT,",
      "  class_avg TEXT,",
      "  FOREIGN KEY (course_id) REFERENCES courses(id)",
      ");",
      "",
      "CREATE TABLE IF NOT EXISTS summaries (",
      "  course_id TEXT PRIMARY KEY,",
      "  semester_id TEXT NOT NULL,",
      "  course_code TEXT NOT NULL,",
      "  total_max TEXT,",
      "  total_weightage TEXT,",
      "  total_scored TEXT,",
      "  total_weightage_scored TEXT,",
      "  lost_weightage TEXT,",
      "  FOREIGN KEY (course_id) REFERENCES courses(id)",
      ");",
      "",
      "CREATE TABLE IF NOT EXISTS academic_calendar (",
      "  date TEXT PRIMARY KEY,",
      "  semester_id TEXT NOT NULL,",
      "  semester_name TEXT,",
      "  weekday TEXT,",
      "  instructional INTEGER,",
      "  day_order TEXT,",
      "  label TEXT,",
      "  is_holiday INTEGER,",
      "  is_event INTEGER,",
      "  event_type TEXT",
      ");",
      ""
    ];

    const sqlEscape = (str) => {
      if (str === null || str === undefined) return "NULL";
      return `'${String(str).replace(/'/g, "''")}'`;
    };

    const semesters = data?.semesters || {};
    for (const [semId, sem] of Object.entries(semesters)) {
      lines.push(
        `INSERT OR REPLACE INTO semesters (id, name, last_scraped) VALUES (${sqlEscape(semId)}, ${sqlEscape(sem.name || semId)}, ${sem.lastScraped || Date.now()});`
      );

      const courses = sem.courses || {};
      for (const [courseKey, c] of Object.entries(courses)) {
        const courseDbId = `${semId}__${c.courseCode || courseKey}`;
        lines.push(
          `INSERT OR REPLACE INTO courses (id, semester_id, course_code, course_title, course_type, faculty, slot, class_nbr) VALUES (${sqlEscape(courseDbId)}, ${sqlEscape(semId)}, ${sqlEscape(c.courseCode)}, ${sqlEscape(c.courseTitle)}, ${sqlEscape(c.subType || c.courseType)}, ${sqlEscape(c.faculty)}, ${sqlEscape(c.slot)}, ${sqlEscape(c.classNbr)});`
        );

        if (c.summary) {
          lines.push(
            `INSERT OR REPLACE INTO summaries (course_id, semester_id, course_code, total_max, total_weightage, total_scored, total_weightage_scored, lost_weightage) VALUES (${sqlEscape(courseDbId)}, ${sqlEscape(semId)}, ${sqlEscape(c.courseCode)}, ${sqlEscape(c.summary.totalMaxMarks)}, ${sqlEscape(c.summary.totalWeightage)}, ${sqlEscape(c.summary.totalScored)}, ${sqlEscape(c.summary.totalWeightageScored)}, ${sqlEscape(c.summary.lostWeightage)});`
          );
        }

        const assessments = c.assessments || [];
        assessments.forEach((a, aIdx) => {
          const assDbId = `${courseDbId}__${aIdx}`;
          lines.push(
            `INSERT OR REPLACE INTO assessments (id, course_id, semester_id, course_code, title, max_marks, weightage_percent, status, scored_mark, weightage_mark, class_avg) VALUES (${sqlEscape(assDbId)}, ${sqlEscape(courseDbId)}, ${sqlEscape(semId)}, ${sqlEscape(c.courseCode)}, ${sqlEscape(a.title)}, ${sqlEscape(a.maxMarks)}, ${sqlEscape(a.weightagePercent)}, ${sqlEscape(a.status)}, ${sqlEscape(a.scored)}, ${sqlEscape(a.weightageEqui)}, ${sqlEscape(a.classAvg)});`
          );
        });
      }
    }

    const calendarDays = data?.calendar?.days || data?.academicCalendar?.days || [];
    const calSemId = data?.calendar?.semesterId || data?.academicCalendar?.semesterId || "";
    const calSemName = data?.calendar?.semesterName || data?.academicCalendar?.semesterName || "";
    for (const d of calendarDays) {
      lines.push(
        `INSERT OR REPLACE INTO academic_calendar (date, semester_id, semester_name, weekday, instructional, day_order, label, is_holiday, is_event, event_type) VALUES (${sqlEscape(d.date)}, ${sqlEscape(calSemId)}, ${sqlEscape(calSemName)}, ${sqlEscape(d.weekday)}, ${d.instructional ? 1 : 0}, ${sqlEscape(d.dayOrder || "")}, ${sqlEscape(d.label || "")}, ${d.isHoliday ? 1 : 0}, ${d.isEvent ? 1 : 0}, ${sqlEscape(d.eventType || "")});`
      );
    }

    lines.push("");
    lines.push("COMMIT;");
    lines.push("");
    return lines.join("\n");
  }

  window.VITCM_DB = {
    openDatabase,
    saveMarksData,
    loadMarksData,
    saveCalendarData,
    loadCalendarData,
    generateSqliteDump
  };
})();
