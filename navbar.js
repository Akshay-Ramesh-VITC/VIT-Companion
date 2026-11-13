(() => {
  "use strict";

  if (!/vtopcc/i.test(window.location.hostname)) {
    return;
  }

  const nav_bar_change = () => {
    // Don't inject on login page
    if (document.querySelector('input[type="password"]') || document.getElementById("captchaBlock")) {
      return false;
    }

    if (document.getElementById("navbar") || document.querySelector(".collapse.navbar-collapse #navbar")) {
      return true;
    }

    let nav = document.getElementsByClassName("collapse navbar-collapse");
    if (!nav || nav.length === 0) {
      return false;
    }

    let items_list = Array.from(document.getElementsByTagName("a")).filter(
      (e) => e.dataset && e.dataset.url
    );
    let marks, attendance, course_page, da_upload, time_table, calendar;
    for (let i = 0; i < items_list.length; i++) {
      let item = items_list[i].innerText.trim();
      if (item.includes("Class Attendance")) {
        attendance = i;
      } else if (item.includes("Course Page")) {
        course_page = i;
      } else if (item.includes("Digital Assignment Upload")) {
        da_upload = i;
      } else if (item.includes("Time Table")) {
        time_table = i;
      } else if (item.includes("Calendar")) {
        calendar = i;
      } else if (item.includes("Marks")) {
        marks = i;
      }
    }

    // If items_list is not available yet (e.g. sidebar not opened), wait for it
    if (items_list.length === 0) {
      return false;
    }

    let span = document.createElement("div");
    span.id = "navbar";
    span.innerHTML = `
      <span class="navbar-text px-0 px-sm-2 mx-0 mx-sm-1 text-light"></span>
      <button class="btn btn-primary border-primary shadow-none" type="button" style="background: rgba(13,110,253,0);border-style: none;" onclick="Array.from(document.getElementsByTagName('a')).filter((e) => e.dataset.url)[${marks}].click();" id="nav_short">Marks View</button>
      <button class="btn btn-primary border-primary shadow-none" type="button" style="background: rgba(13,110,253,0);border-style: none;" onclick="Array.from(document.getElementsByTagName('a')).filter((e) => e.dataset.url)[${attendance}].click()" id="nav_short">Attendance</button>
      <button class="btn btn-primary border-primary shadow-none" type="button" style="background: rgba(13,110,253,0);border-style: none;" onclick="Array.from(document.getElementsByTagName('a')).filter((e) => e.dataset.url)[${course_page}].click()" id="nav_short">Course Page</button>
    `;
    if (time_table !== undefined)
      span.innerHTML += `<button class="btn btn-primary border-primary shadow-none" type="button" style="background: rgba(13,110,253,0);border-style: none;" onclick="Array.from(document.getElementsByTagName('a')).filter((e) => e.dataset.url)[${time_table}].click()" id="nav_short">Time Table</button>`;
    else if (calendar !== undefined)
      span.innerHTML += `<button class="btn btn-primary border-primary shadow-none" type="button" style="background: rgba(13,110,253,0);border-style: none;" onclick="Array.from(document.getElementsByTagName('a')).filter((e) => e.dataset.url)[${calendar}].click()" id="nav_short">Calendar</button>`;
    nav[0].insertBefore(span, nav[0].children[0]);

    let buttons = document.querySelectorAll("[id=nav_short]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((but) => {
          but.disabled = true;
          setTimeout(() => {
            buttons.forEach((btn) => {
              btn.disabled = false;
            });
          }, 1500);
        });
      });
    });
    return true;
  };

  const tryNavChange = () => {
    try {
      if (
        document.getElementsByClassName("btn-group dropend")[0]?.style
          .backgroundColor === "red"
      ) {
        document.getElementsByClassName("btn-group dropend")[0].remove();
      }
      return nav_bar_change();
    } catch (error) {
      return false;
    }
  };

  chrome.runtime.onMessage.addListener((request) => {
    if (request.message === "nav_bar_change" || request.message === "vtopcc_nav_bar") {
      tryNavChange();
    }
  });

  // 1. Immediate call
  if (document.readyState === "complete" || document.readyState === "interactive") {
    tryNavChange();
  } else {
    document.addEventListener("DOMContentLoaded", tryNavChange);
    window.addEventListener("load", tryNavChange, false);
  }

  // 2. Continuous MutationObserver
  try {
    let debounce = null;
    const observer = new MutationObserver(() => {
      if (!document.getElementById("navbar")) {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(tryNavChange, 100);
      }
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  } catch (_e) {}

  // 3. Periodic fallback poll
  let polls = 0;
  const pollTimer = setInterval(() => {
    polls++;
    const done = tryNavChange();
    if (done || polls > 30) {
      clearInterval(pollTimer);
    }
  }, 500);
})();
