(() => {
  "use strict";

  const times = {
    A1: ["T08:00:00.000+05:30", "T09:00:00.000+05:30"],
    B1: ["T08:00:00.000+05:30", "T09:00:00.000+05:30"],
    C1: ["T08:00:00.000+05:30", "T09:00:00.000+05:30"],
    D1: ["T08:00:00.000+05:30", "T10:00:00.000+05:30"],
    E1: ["T08:00:00.000+05:30", "T10:00:00.000+05:30"],
    F1: ["T09:00:00.000+05:30", "T10:00:00.000+05:30"],
    G1: ["T09:00:00.000+05:30", "T10:00:00.000+05:30"],
    TA1: ["T10:00:00.000+05:30"],
    TB1: ["T11:00:00.000+05:30"],
    TC1: ["T11:00:00.000+05:30"],
    TD1: ["T12:00:00.000+05:30"],
    TE1: ["T11:00:00.000+05:30"],
    TF1: ["T11:00:00.000+05:30"],
    TG1: ["T12:00:00.000+05:30"],
    TAA1: ["T12:00:00.000+05:30"],
    TCC1: ["T12:00:00.000+05:30"],

    A2: ["T14:00:00.000+05:30", "T15:00:00.000+05:30"],
    B2: ["T14:00:00.000+05:30", "T15:00:00.000+05:30"],
    C2: ["T14:00:00.000+05:30", "T15:00:00.000+05:30"],
    D2: ["T14:00:00.000+05:30", "T16:00:00.000+05:30"],
    E2: ["T14:00:00.000+05:30", "T16:00:00.000+05:30"],
    F2: ["T15:00:00.000+05:30", "T16:00:00.000+05:30"],
    G2: ["T15:00:00.000+05:30", "T16:00:00.000+05:30"],
    TA2: ["T16:00:00.000+05:30"],
    TB2: ["T17:00:00.000+05:30"],
    TC2: ["T17:00:00.000+05:30"],
    TD2: ["T17:00:00.000+05:30"],
    TE2: ["T17:00:00.000+05:30"],
    TF2: ["T17:00:00.000+05:30"],
    TG2: ["T18:00:00.000+05:30"],
    TAA2: ["T18:00:00.000+05:30"],
    TBB2: ["T18:00:00.000+05:30"],
    TCC2: ["T18:00:00.000+05:30"],
    TDD2: ["T18:00:00.000+05:30"],

    L1: ["T08:00:00.000+05:30"],
    L3: ["T09:51:00.000+05:30"],
    L5: ["T11:40:00.000+05:30"],
    L7: ["T08:00:00.000+05:30"],
    L9: ["T09:51:00.000+05:30"],
    L11: ["T11:40:00.000+05:30"],
    L13: ["T08:00:00.000+05:30"],
    L15: ["T09:51:00.000+05:30"],
    L17: ["T11:40:00.000+05:30"],
    L19: ["T08:00:00.000+05:30"],
    L21: ["T09:51:00.000+05:30"],
    L23: ["T11:40:00.000+05:30"],
    L25: ["T08:00:00.000+05:30"],
    L27: ["T09:51:00.000+05:30"],
    L29: ["T11:40:00.000+05:30"],

    L31: ["T14:00:00.000+05:30"],
    L33: ["T15:51:00.000+05:30"],
    L35: ["T17:40:00.000+05:30"],
    L37: ["T14:00:00.000+05:30"],
    L39: ["T15:51:00.000+05:30"],
    L41: ["T17:40:00.000+05:30"],
    L43: ["T14:00:00.000+05:30"],
    L45: ["T15:51:00.000+05:30"],
    L47: ["T17:40:00.000+05:30"],
    L49: ["T14:00:00.000+05:30"],
    L51: ["T15:51:00.000+05:30"],
    L53: ["T17:40:00.000+05:30"],
    L55: ["T14:00:00.000+05:30"],
    L57: ["T15:51:00.000+05:30"],
    L59: ["T17:40:00.000+05:30"]
  };

  const days = {
    A1: ["d1", "d3"],
    B1: ["d2", "d4"],
    C1: ["d3", "d5"],
    D1: ["d4", "d1"],
    E1: ["d5", "d2"],
    F1: ["d1", "d3"],
    G1: ["d2", "d4"],
    TA1: ["d5"],
    TB1: ["d1"],
    TC1: ["d2"],
    TD1: ["d5"],
    TE1: ["d4"],
    TF1: ["d5"],
    TG1: ["d1"],
    TAA1: ["d2"],
    TCC1: ["d4"],

    A2: ["d1", "d3"],
    B2: ["d2", "d4"],
    C2: ["d3", "d5"],
    D2: ["d4", "d1"],
    E2: ["d5", "d2"],
    F2: ["d1", "d3"],
    G2: ["d2", "d4"],
    TA2: ["d5"],
    TB2: ["d1"],
    TC2: ["d2"],
    TD2: ["d3"],
    TE2: ["d4"],
    TF2: ["d5"],
    TG2: ["d1"],
    TAA2: ["d2"],
    TBB2: ["d3"],
    TCC2: ["d4"],
    TDD2: ["d5"],

    L1: ["d1"],
    L3: ["d1"],
    L5: ["d1"],
    L7: ["d2"],
    L9: ["d2"],
    L11: ["d2"],
    L13: ["d3"],
    L15: ["d3"],
    L17: ["d3"],
    L19: ["d4"],
    L21: ["d4"],
    L23: ["d4"],
    L25: ["d5"],
    L27: ["d5"],
    L29: ["d5"],
    L31: ["d1"],
    L33: ["d1"],
    L35: ["d1"],
    L37: ["d2"],
    L39: ["d2"],
    L41: ["d2"],
    L43: ["d3"],
    L45: ["d3"],
    L47: ["d3"],
    L49: ["d4"],
    L51: ["d4"],
    L53: ["d4"],
    L55: ["d5"],
    L57: ["d5"],
    L59: ["d5"]
  };

  let errorCode = 0;

  const toBase64Unicode = (str) => {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const getTimeTableDetails = () => {
    const details = {
      courseCode: [],
      courseTitle: [],
      slot: [],
      venue: [],
      facName: [],
      facSchool: [],
      allSlots: []
    };

    const tbody = document.getElementsByTagName("tbody")[0];
    if (!tbody || !tbody.children) {
      return details;
    }

    const tableRows = tbody.children;
    for (let i = 2; i < tableRows.length - 2; i += 1) {
      const td = tableRows[i].children;
      if (!td || td.length < 9) {
        continue;
      }

      const codeTitle = td[2].innerText.split("\n")[0].trim();
      const codeTitleParts = codeTitle.split("-");
      if (codeTitleParts.length < 2) {
        continue;
      }
      details.courseCode.push(codeTitleParts[0].trim());
      details.courseTitle.push(codeTitleParts.slice(1).join("-").trim());

      const slotVenue = td[7].innerText.replace(/(\r\n|\n|\r)/gm, "").split("-");
      if (slotVenue.length < 2) {
        continue;
      }
      const slot = slotVenue[0].trim();
      details.slot.push(slot);
      details.allSlots = details.allSlots.concat(slot.split("+"));
      details.venue.push(slotVenue.slice(1).join("-").trim());

      const facNameSchool = td[8].innerText.replace(/(\r\n|\n|\r)/gm, "").split("-");
      details.facName.push((facNameSchool[0] || "").trim());
      details.facSchool.push((facNameSchool[1] || "").trim());
    }

    return details;
  };

  const changeObj = (details) => {
    const obj = {
      allSlots: details.allSlots,
      courseInfo: []
    };
    for (let i = 0; i < details.courseCode.length; i += 1) {
      obj.courseInfo.push({
        courseCode: details.courseCode[i],
        courseTitle: details.courseTitle[i],
        slot: details.slot[i],
        facName: details.facName[i],
        facSchool: details.facSchool[i],
        venue: details.venue[i]
      });
    }
    return obj;
  };

  const getTimetableTableElement = () => {
    const tables = Array.from(document.querySelectorAll("table"));
    return tables.find((table) => {
      const txt = (table.innerText || "").toUpperCase();
      return txt.includes("MON") && txt.includes("TUE") && txt.includes("WED") && txt.includes("THEORY") && txt.includes("LAB");
    });
  };

  const addButtons = () => {
    if (document.getElementById("sync_dates_btn")) {
      return;
    }

    const table = document.getElementsByClassName("table-responsive")[0];
    if (!table) {
      return;
    }

    const div = document.createElement("div");
    div.style.textAlign = "center";

    const label = document.createElement("label");
    label.innerText = "*Choose Date for syncing time table :";
    label.style.color = "red";
    label.style.textAlign = "center";
    div.appendChild(label);

    const dateHolder = document.createElement("input");
    dateHolder.type = "date";
    dateHolder.style.width = "105px";
    dateHolder.style.height = "35px";
    dateHolder.style.fontSize = "1rem";
    dateHolder.style.borderRadius = "10px";
    dateHolder.style.margin = "10px";
    dateHolder.style.textAlign = "center";
    dateHolder.id = "min_date";
    const date = new Date();
    dateHolder.min = date.toISOString().split("T")[0];
    dateHolder.max = new Date(date.setMonth(date.getMonth() + 6)).toISOString().split("T")[0];
    div.appendChild(dateHolder);

    const btn = document.createElement("button");
    btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" data-name="Layer 1" viewBox="0 0 141.7 141.7" width="24" height="24"><path fill="#fff" d="M95.8,45.9H45.9V95.8H95.8Z"/><path fill="#34a853" d="M95.8,95.8H45.9v22.5H95.8Z"/><path fill="#4285f4" d="M95.8,23.4H30.9a7.55462,7.55462,0,0,0-7.5,7.5V95.8H45.9V45.9H95.8Z"/><path fill="#188038" d="M23.4,95.8v15a7.55462,7.55462,0,0,0,7.5,7.5h15V95.8Z"/><path fill="#fbbc04" d="M118.3,45.9H95.8V95.8h22.5Z"/><path fill="#1967d2" d="M118.3,45.9v-15a7.55462,7.55462,0,0,0-7.5-7.5h-15V45.9Z"/><path fill="#ea4335" d="M95.8,118.3l22.5-22.5H95.8Z"/><polygon fill="#2a83f8" points="77.916 66.381 75.53 63.003 84.021 56.868 87.243 56.868 87.243 85.747 82.626 85.747 82.626 62.772 77.916 66.381"/><path fill="#2a83f8" d="M67.29834,70.55785A7.88946,7.88946,0,0,0,70.78,64.12535c0-4.49-4-8.12-8.94-8.12a8.77525,8.77525,0,0,0-8.74548,6.45379l3.96252,1.58258a4.41779,4.41779,0,0,1,4.473-3.51635,4.138,4.138,0,1,1,.06256,8.24426v.00513h-.0559l-.00666.00061-.00964-.00061H59.15v3.87677h2.70642L61.88,72.65a4.70514,4.70514,0,1,1,0,9.37,5.35782,5.35782,0,0,1-3.96588-1.69354,4.59717,4.59717,0,0,1-.80408-1.2442l-.69757-1.69946L52.23005,79c.62,4.33,4.69,7.68,9.61,7.68,5.36,0,9.7-3.96,9.7-8.83A8.63346,8.63346,0,0,0,67.29834,70.55785Z"/></svg><span>Sync assignments with Google Calendar</span>`;
    btn.style = "display: flex;align-items: center;gap: 1rem;font-family: inherit;justify-content: space-around;color: #535353;font-size: 13px;font-weight: 500;margin: 8px auto;cursor: pointer;background-color: white;border-radius: 32px;transition: all 0.2s ease-in-out;padding: 6px 10px;border: 1px solid rgba(0, 0, 0, 0.25);";
    btn.id = "sync_dates_btn";
    div.appendChild(btn);

    table.insertAdjacentElement("beforebegin", div);
  };

  const getDates = (end) => {
    const startDate = new Date();
    const endDate = new Date(end);
    const date = new Date(startDate.getTime());
    const dates = {
      d1: [],
      d2: [],
      d3: [],
      d4: [],
      d5: []
    };

    let count = 0;
    while (date <= endDate) {
      const day = new Date(date).getDay();
      if (day === 1) dates.d1.push(new Date(date));
      if (day === 2) dates.d2.push(new Date(date));
      if (day === 3) dates.d3.push(new Date(date));
      if (day === 4) dates.d4.push(new Date(date));
      if (day === 5) dates.d5.push(new Date(date));
      date.setDate(date.getDate() + 1);
      count += 1;
      if (count === 7) break;
    }
    return dates;
  };

  const addTime = (start, add) => {
    const date = new Date(`2023${start}`);
    const newDate = new Date(date.getTime() + add * 60000);
    const hours = String(newDate.getHours()).padStart(2, "0");
    const minutes = String(newDate.getMinutes()).padStart(2, "0");
    return `T${hours}:${minutes}:00.000+05:30`;
  };

  const calendarTimeTable = async (
    title,
    code,
    venue,
    date,
    facName,
    slot,
    time,
    token,
    dayCount
  ) => {
    try {
      const endTime = slot.charAt(0) === "L" ? addTime(time, 100) : addTime(time, 50);
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&sendNotifications=true&alt=json&key=AIzaSyCPBz-DTZdoTLQ_ZiqsVUO520XItcomTn0",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
          },
          body: JSON.stringify({
            end: {
              dateTime: `${date}${endTime}`,
              timeZone: "Asia/Kolkata"
            },
            start: {
              dateTime: `${date}${time}`,
              timeZone: "Asia/Kolkata"
            },
            recurrence: [`RRULE:FREQ=WEEKLY;COUNT=${dayCount}`],
            eventType: "default",
            description: `${code}-${facName}`,
            summary: `${title}-${venue}`
          })
        }
      );
      const data = await res.json();

      if (data?.error?.code === 401) {
        errorCode = 401;
      } else if (data?.error?.code === 403) {
        await calendarTimeTable(title, code, venue, date, facName, slot, time, token, dayCount);
      }
    } catch (_error) {
      // Ignore network/transient errors to continue sync for remaining events.
    }
  };

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
  }

  function workingDayCount(startDate, endDate) {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    while (curDate <= endDate) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count += 1;
      curDate.setDate(curDate.getDate() + 1);
    }
    return count;
  }

  const syncCalendarTimeTable = () => {
    const details = getTimeTableDetails();
    chrome.storage.sync.get(["token"], (tokenObj) => {
      if (!tokenObj?.token) {
        if (document.getElementById("vit_tt_signin_notice")) {
          return;
        }
        const div = document.createElement("div");
        div.id = "vit_tt_signin_notice";
        const stmt = document.createElement("p");
        stmt.innerText = "**Sign in with Google in extension to sync your due dates with Google Calendar";
        stmt.style.color = "red";
        div.appendChild(stmt);
        const table = document.getElementsByClassName("table-responsive")[0];
        if (table) {
          table.insertAdjacentElement("beforebegin", div);
        }
        return;
      }

      addButtons();
      const syncBtn = document.getElementById("sync_dates_btn");
      if (!syncBtn || syncBtn.dataset.vitTtBound === "1") {
        return;
      }
      syncBtn.dataset.vitTtBound = "1";

      syncBtn.addEventListener("click", async () => {
        const tillDate = document.getElementById("min_date")?.value || "";
        if (!tillDate) {
          const date = new Date();
          const minDate = date.toISOString().split("T")[0];
          const maxDate = new Date(date.setMonth(date.getMonth() + 6)).toISOString().split("T")[0];
          alert(`Please enter the date in range of ${minDate} - ${maxDate}.`);
          return;
        }

        syncBtn.disabled = true;
        if (!document.getElementById("sync_wait_txt")) {
          const syncWait = document.createElement("div");
          const stmt = document.createElement("h4");
          stmt.innerText = "Please wait while the dates get synced.";
          stmt.style.textAlign = "center";
          stmt.style.color = "red";
          syncWait.appendChild(stmt);
          syncWait.id = "sync_wait_txt";
          syncBtn.insertAdjacentElement("afterend", syncWait);
        }

        const dayCount = Math.ceil(workingDayCount(new Date(), new Date(tillDate)) / 5);
        const dates = getDates(tillDate);
        errorCode = 0;

        for (let i = 0; i < details.slot.length; i += 1) {
          const individualSlot = details.slot[i].split("+");
          const courseCode = details.courseCode[i];
          const courseTitle = details.courseTitle[i];
          const facName = details.facName[i];
          const venue = details.venue[i];
          if (venue === "NIL") continue;

          for (let j = 0; j < individualSlot.length; j += 1) {
            const slotCode = individualSlot[j];
            const weekDay = days[slotCode];
            if (!weekDay || !times[slotCode]) {
              continue;
            }
            if (slotCode.charAt(0) === "L" && parseInt(slotCode.slice(1), 10) % 2 === 0) {
              continue;
            }

            if (errorCode === 401) {
              alert("Please re-login with your Google account and refresh the page.");
              chrome.storage.sync.set({ token: null });
              errorCode = 0;
              break;
            }

            for (let k = 0; k < weekDay.length; k += 1) {
              const date = formatDate(dates[weekDay[k]]);
              const time = times[slotCode][k];
              if (date.indexOf("NaN") !== 0 && time) {
                await calendarTimeTable(
                  courseTitle,
                  courseCode,
                  venue,
                  date,
                  facName,
                  slotCode,
                  time,
                  tokenObj.token,
                  dayCount
                );
              }
              if (errorCode === 401) {
                break;
              }
              await sleep(500);
            }
          }
        }

        const waitTxt = document.getElementById("sync_wait_txt");
        if (waitTxt) {
          waitTxt.hidden = true;
        }
        if (errorCode !== 401) {
          alert(`Time table synced to Calendar till ${tillDate}.`);
        }
        syncBtn.disabled = false;
      });
    });
  };

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request?.message === "check_time_table") {
      const tableElement = getTimetableTableElement();
      sendResponse({ onTimeTablePage: Boolean(tableElement) });
      return;
    }

    if (request?.message === "time_table") {
      syncCalendarTimeTable();
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: true });
  });
})();
