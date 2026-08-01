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

chrome.runtime.onInstalled.addListener(() => {
  configurePanelBehavior();
});

chrome.runtime.onStartup.addListener(() => {
  configurePanelBehavior();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
