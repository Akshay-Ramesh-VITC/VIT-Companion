async function configurePanelBehavior() {
  const isOpera = typeof navigator !== "undefined" && /OPR\/|Opera/i.test(navigator.userAgent);

  if (isOpera) {
    try {
      await chrome.action.setPopup({ popup: "popup.html?view=popup" });
    } catch (_e) {
      // Ignore if action API is unavailable
    }
  } else {
    try {
      if (chrome.action?.setPopup) {
        await chrome.action.setPopup({ popup: "" });
      }
      if (chrome.sidePanel?.setPanelBehavior) {
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      }
    } catch (_e) {
      // Fallback to popup if side panel behavior fails or is unsupported
      if (chrome.action?.setPopup) {
        await chrome.action.setPopup({ popup: "popup.html?view=popup" }).catch(() => {});
      }
    }
  }
}

function setupMarksAlarm() {
  if (!chrome.alarms) return;
  chrome.alarms.get("vtop_marks_periodic_sync", (existing) => {
    if (!existing) {
      chrome.alarms.create("vtop_marks_periodic_sync", {
        periodInMinutes: 15
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  configurePanelBehavior();
  setupMarksAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  configurePanelBehavior();
  setupMarksAlarm();
});

if (chrome.alarms?.onAlarm) {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "vtop_marks_periodic_sync") {
      try {
        const tabs = await chrome.tabs.query({ url: "*://vtopcc.vit.ac.in/*" });
        if (tabs.length > 0 && tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { message: "scrape_marks_now" }).catch(() => {});
        }
      } catch (_e) {}
    }
  });
}

function showMarksNotification(updates) {
  if (!chrome.notifications || !Array.isArray(updates) || updates.length === 0) {
    return;
  }

  const notifId = `vtop_marks_${Date.now()}`;
  let title = "";
  let message = "";

  if (updates.length === 1) {
    const u = updates[0];
    title = `🎯 New Mark: ${u.courseCode}`;
    message = `${u.assessmentTitle}: ${u.newScored} / ${u.maxMarks}${u.courseTitle ? ` (${u.courseTitle})` : ""}`;
  } else {
    title = `🎯 ${updates.length} New Marks Updated on VTOP!`;
    const lines = updates.slice(0, 4).map(
      (u) => `${u.courseCode}: ${u.assessmentTitle} -> ${u.newScored}/${u.maxMarks}`
    );
    if (updates.length > 4) {
      lines.push(`+ ${updates.length - 4} more assessments updated`);
    }
    message = lines.join("\n");
  }

  try {
    chrome.notifications.create(
      notifId,
      {
        type: "basic",
        iconUrl: "icon48.png",
        title,
        message,
        priority: 2
      },
      () => {
        if (chrome.runtime.lastError) {
          chrome.notifications.create(notifId, {
            type: "basic",
            iconUrl: "icon16.png",
            title,
            message,
            priority: 2
          });
        }
      }
    );
  } catch (err) {
    console.error("Failed to show marks notification", err);
  }
}

if (chrome.notifications?.onClicked) {
  chrome.notifications.onClicked.addListener(async () => {
    try {
      const tabs = await chrome.tabs.query({ url: "*://vtopcc.vit.ac.in/*" });
      if (tabs.length > 0 && tabs[0]?.id) {
        chrome.tabs.update(tabs[0].id, { active: true });
      } else {
        chrome.tabs.create({ url: "https://vtopcc.vit.ac.in/vtop/open/page" });
      }
    } catch (_e) {}
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "VITCM_NOTIFY_MARKS") {
    showMarksNotification(message.updates || []);
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type !== "UPLOAD_TIMETABLE_IMAGE") {
    return;
  }

  (async () => {
    try {
      const dataUrl = String(message.dataUrl || "");
      if (!dataUrl.startsWith("data:image/png;base64,")) {
        sendResponse({ ok: false, error: "invalid-image" });
        return;
      }

      const base64 = dataUrl.split(",")[1] || "";
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "image/png" });

      const form = new FormData();
      form.append("file", blob, `vit-timetable-${Date.now()}.png`);

      const res = await fetch("https://file.io", {
        method: "POST",
        body: form
      });
      const json = await res.json().catch(() => null);
      const link = json?.link || json?.url;
      if (!res.ok || !link) {
        sendResponse({ ok: false, error: json?.error || "upload-failed" });
        return;
      }
      sendResponse({ ok: true, url: String(link) });
    } catch (error) {
      sendResponse({ ok: false, error: error?.message || "upload-error" });
    }
  })();

  return true;
});
