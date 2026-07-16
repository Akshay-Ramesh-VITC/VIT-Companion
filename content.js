(() => {
  "use strict";

  const STORAGE_KEY = "vitCredentialManagerData";
  const MASTER_KEY = "vit-credential-manager";

  function detectSiteKeyFromHostname(hostname) {
    if (hostname.includes("vtopcc.vit.ac.in")) {
      return "vtop";
    }
    if (hostname.includes("vtopregcc.vit.ac.in")) {
      return "ffcs";
    }
    if (hostname.includes("vconnectcc1.vit.ac.in") || hostname.includes("vtopconnect")) {
      return "codet";
    }
    if (hostname.includes("lms.vit.ac.in")) {
      return "lms";
    }
    if (hostname.includes("vitolcc.vit.ac.in")) {
      return "vitol";
    }
    return null;
  }

  const siteKey = detectSiteKeyFromHostname(window.location.hostname);
  if (!siteKey) {
    return;
  }

  function findUsernameField() {
    // fast path: many sites (including CodeTantra vconnect) use id="username"
    const fast = document.getElementById("username") || document.getElementById("userName");
    if (fast) return fast;

    const selectors = [
      "input[name*=user i]",
      "input[id*=user i]",
      "input[name*=userid i]",
      "input[id*=userid i]",
      "input[name*=username i]",
      "input[id*=username i]",
      "input[name*=reg i]",
      "input[id*=reg i]",
      "input[placeholder*=user i]",
      "input[type=text i]",
      "input[type=email i]",
      "input[id*=login i]",
      "input[name*=login i]"
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }

    // Search same-origin iframes for possible login inputs
    const iframes = Array.from(document.getElementsByTagName("iframe"));
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument;
        if (!doc) continue;
        for (const sel of selectors) {
          const el = doc.querySelector(sel);
          if (el) return el;
        }
      } catch (e) {
        // cross-origin iframe — ignore
      }
    }

    return null;
  }

  function findPasswordField() {
    // fast path: explicit id used by CodeTantra
    const fast = document.getElementById("password") || document.getElementById("pwd");
    if (fast) return fast;

    const selList = [
      'input[type="password"]',
      'input[id*=pass i]',
      'input[name*=pass i]',
      'input[id*=pwd i]',
      'input[name*=pwd i]'
    ];

    for (const s of selList) {
      const el = document.querySelector(s);
      if (el) return el;
    }

    const iframes = Array.from(document.getElementsByTagName("iframe"));
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument;
        if (!doc) continue;
        for (const s of selList) {
          const el = doc.querySelector(s);
          if (el) return el;
        }
      } catch (e) {
        // ignore cross-origin
      }
    }

    return null;
  }

  function findCaptchaField() {
    return document.querySelector(
      'input[name*="captcha" i], input[id*="captcha" i], input[placeholder*="captcha" i], input[aria-label*="captcha" i]'
    );
  }

  function findCaptchaInput() {
    return document.querySelector(
      "#captchaBlock ~ input[placeholder*='captcha' i], input[name*=captcha i], input[id*=captcha i], input[placeholder*='captcha' i], input[aria-label*='captcha' i]"
    );
  }

  function findCaptchaImage() {
    return (
      document.querySelector("#captchaBlock img") ||
      document.querySelector("#captchaBlock canvas") ||
      document.querySelector("img[aria-describedby='button-addon2']") ||
      document.querySelector(
        "img[src*='captcha' i], img[alt*='captcha' i], img[id*='captcha' i], img[class*='captcha' i], canvas[id*='captcha' i], canvas[class*='captcha' i]"
      )
    );
  }

  function highlightCaptcha(input) {
    if (!input) return;
    input.style.outline = "2px solid #ef4444";
    input.scrollIntoView({ block: "center", behavior: "smooth" });
    input.focus();
  }

  function imageToBase64(img) {
    try {
      const canvas = document.createElement("canvas");
      const width = 200;
      const height = 40;
      if (!width || !height) {
        return null;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return null;
      }
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL("image/png");
    } catch (error) {
      if (img.tagName === "IMG" && typeof img.src === "string" && img.src.startsWith("data:image/")) {
        return img.src;
      }
      return null;
    }
  }

  function solveChennai(img, textBox, callback) {
    if (!img || !textBox) {
      if (callback) {
        callback("");
      }
      return;
    }

    img.style.height = "40px";
    img.style.width = "200px";

    const base64 = imageToBase64(img);
    if (!base64) {
      if (callback) {
        callback("");
      }
      return;
    }

    const parser = window.VITCM_CAPTCHA;
    if (!parser || typeof parser.solveImageToText !== "function") {
      if (callback) {
        callback("");
      }
      return;
    }

    parser
      .solveImageToText(img)
      .then((text) => {
        const parsed = String(text || "").trim();
        if (!parsed) {
          if (callback) {
            callback("");
          }
          return;
        }
        dispatchInput(textBox, parsed);
        if (callback) {
          callback(parsed);
        }
      })
      .catch(() => {
        if (callback) {
          callback("");
        }
      });
  }

  function handleVtopCaptcha(autoSubmit, onSolved) {
    let captchaBlock = document.getElementById("captchaBlock");
    let img = captchaBlock && captchaBlock.children ? captchaBlock.children[0] : null;
    if (!img) {
      const formControls = document.getElementsByClassName("form-control bg-light border-0");
      img = formControls && formControls.length > 0 ? formControls[0] : null;
    }
    const textBox = document.getElementById("captchaStr");
    if (!img || !textBox) {
      return;
    }

    solveChennai(img, textBox, (text) => {
      if (onSolved) {
        onSolved(Boolean(text), text);
      }
      if (autoSubmit) {
        setTimeout(() => {
          const submitBtn = document.querySelector("#submitBtn");
          if (submitBtn) {
            submitBtn.click();
          }
        }, 500);
      }
    });

    const container = document.getElementById("captchaBlock");
    if (!container || container.dataset.vitCmObserved === "1") {
      return;
    }

    container.dataset.vitCmObserved = "1";
    const observer = new MutationObserver(() => {
      captchaBlock = document.getElementById("captchaBlock");
      img = captchaBlock && captchaBlock.children ? captchaBlock.children[0] : null;
      if (!img) {
        const formControls = document.getElementsByClassName("form-control bg-light border-0");
        img = formControls && formControls.length > 0 ? formControls[0] : null;
      }

      const box = document.getElementById("captchaStr");
      if (img && box) {
        solveChennai(img, box, () => {});
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  function handleFFCSCaptcha(autoSubmit, onSolved) {
    const wireObserverAndRefresh = (solver) => {
      const testDiv = document.getElementById("test");
      if (testDiv && testDiv.dataset.vitCmObserved !== "1") {
        testDiv.dataset.vitCmObserved = "1";
        const observer = new MutationObserver(() => {
          setTimeout(solver, 100);
        });
        observer.observe(testDiv, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["src"]
        });
      }

      const refreshButton = document.getElementById("refreshCaptchaProcess");
      if (refreshButton && refreshButton.dataset.vitCmHooked !== "1") {
        refreshButton.dataset.vitCmHooked = "1";
        refreshButton.addEventListener("click", () => {
          setTimeout(solver, 500);
        });
      }
    };

    if (document.getElementById("captchaStringProgInfo")) {
      const solveCaptchaStep2 = (notifySolve) => {
        const img = document.getElementById("captcha_id");
        const textBox = document.getElementById("captchaStringProgInfo");
        if (!img || !textBox) {
          return;
        }

        solveChennai(img, textBox, (text) => {
          if (notifySolve && onSolved) {
            onSolved(Boolean(text), text);
          }
          if (autoSubmit) {
            setTimeout(() => {
              const form = document.querySelector("form");
              if (form) {
                form.submit();
              }
            }, 500);
          }
        });
      };

      solveCaptchaStep2(true);
      wireObserverAndRefresh(() => solveCaptchaStep2(false));
      return;
    }

    if (document.getElementById("captchaString")) {
      const solveCaptchaStep1 = (notifySolve) => {
        const img = document.getElementById("captcha_id");
        const textBox = document.getElementById("captchaString");
        if (!img || !textBox) {
          return;
        }

        solveChennai(img, textBox, (text) => {
          if (notifySolve && onSolved) {
            onSolved(Boolean(text), text);
          }
          if (autoSubmit) {
            setTimeout(() => {
              const form = document.getElementById("studLogin");
              if (form) {
                form.submit();
              }
            }, 1000);
          }
        });
      };

      solveCaptchaStep1(true);
      wireObserverAndRefresh(() => solveCaptchaStep1(false));
    }
  }

  function tryUrls() {
    if (!document.body?.dataset?.vitCmFillCaptchaBound) {
      document.body.dataset.vitCmFillCaptchaBound = "1";
      document.addEventListener("fillCaptcha", (e) => {
        const autoSubmitRequested = Boolean(e?.detail?.autoSubmit);
        const currentUrl = window.location.href;
        if (currentUrl.includes("vtopcc.vit.ac.in")) {
          handleVtopCaptcha(autoSubmitRequested);
        } else if (currentUrl.includes("vtopregcc.vit.ac.in")) {
          handleFFCSCaptcha(autoSubmitRequested);
        }
      });
    }

    if (document.URL.includes("vtopcc.vit.ac.in")) {
      handleVtopCaptcha(false);
    } else if (document.URL.includes("https://vtopregcc.vit.ac.in/RegistrationNew/")) {
      handleFFCSCaptcha(false);
    }
  }

  function solveCaptchaForCurrentPage(autoSubmit, onSolved) {
    const currentUrl = window.location.href;
    if (currentUrl.includes("vtopcc.vit.ac.in")) {
      handleVtopCaptcha(autoSubmit, onSolved);
      return true;
    }
    if (currentUrl.includes("vtopregcc.vit.ac.in")) {
      handleFFCSCaptcha(autoSubmit, onSolved);
      return true;
    }
    return false;
  }

  function dispatchInput(el, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
  }

  function detectFormForSubmission(usernameField, passwordField) {
    return (
      usernameField?.closest("form") ||
      passwordField?.closest("form") ||
      document.querySelector("form")
    );
  }

  function highlightCaptchaField(captchaField) {
    captchaField.style.outline = "2px solid #22c55e";
    captchaField.style.outlineOffset = "2px";
    captchaField.dataset.vitCmMarked = "true";
    captchaField.title = "CAPTCHA detected by VIT Credential Manager";
  }

  async function loadSiteData() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const allData = result[STORAGE_KEY] || {};
    // If CodeTantra (codet) has no specific stored creds, fall back to VTOP creds
    if (siteKey === "codet") {
      if (allData["codet"] && allData["codet"].encrypted) {
        return allData["codet"];
      }
      if (allData["vtop"] && allData["vtop"].encrypted) {
        return allData["vtop"];
      }
      return allData["codet"] || null;
    }

    return allData[siteKey] || null;
  }

  async function runAutofill() {
    const siteData = await loadSiteData();
    if (!siteData) {
      return;
    }

    const toggles = siteData.toggles || {};
    const creds = await VITCM_CRYPTO.decryptJson(siteData.encrypted, MASTER_KEY).catch(() => null);
    if (!creds) {
      return;
    }

    const usernameField = findUsernameField();
    const passwordField = findPasswordField();
    const captchaField = findCaptchaField();

    if (toggles.fillForm) {
      if (usernameField && creds.username) {
        dispatchInput(usernameField, creds.username);
      }
      if (passwordField && creds.password) {
        dispatchInput(passwordField, creds.password);
      }
    }

    if (toggles.fillCaptcha && captchaField) {
      highlightCaptchaField(captchaField);
      captchaField.focus();
      document.dispatchEvent(
        new CustomEvent("fillCaptcha", {
          detail: {
            autoSubmit: Boolean(toggles.autoSubmit)
          }
        })
      );
    }

    if (toggles.autoSubmit) {
      if (captchaField) {
        return;
      }
      const form = detectFormForSubmission(usernameField, passwordField);
      if (form) {
        const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          submitButton.click();
        } else {
          form.requestSubmit();
        }
      }
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "VITCM_APPLY_SITE" || message.siteKey !== siteKey) {
      if (message?.type === "CAPTCHA_ASSIST") {
        const solved = solveCaptchaForCurrentPage(false, (ok, text) => {
          sendResponse({
            ok,
            reason: ok ? undefined : "ocr-failed",
            text: text || ""
          });
        });
        if (!solved) {
          sendResponse({ ok: false, reason: "unsupported-site" });
        }
        return true;
      }

      if (message?.type === "FILL_CAPTCHA" && typeof message.text === "string") {
        const input = findCaptchaInput() || findCaptchaField();
        if (input) {
          dispatchInput(input, message.text);
        }
      }

      return;
    }

    runAutofill()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));

    return true;
  });

  async function attemptAutofillWithRetries() {
    const maxAttempts = 12;
    let count = 0;
    let timer = null;

    const tick = async () => {
      count += 1;
      await runAutofill();

      const hasUser = Boolean(findUsernameField());
      const hasPass = Boolean(findPasswordField());
      if ((hasUser && hasPass) || count >= maxAttempts) {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }
    };

    await tick();
    if (count < maxAttempts) {
      timer = setInterval(tick, 600);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "VITCM_FILL_CAPTCHA") {
      return;
    }

    const captchaField = findCaptchaField();
    if (!captchaField) {
      sendResponse({ ok: false, reason: "captcha-field-not-found" });
      return;
    }

    dispatchInput(captchaField, String(message.value || ""));
    sendResponse({ ok: true });
  });

  if (findCaptchaInput() || findCaptchaImage()) {
    highlightCaptcha(findCaptchaInput() || findCaptchaField());
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(tryUrls, 100);
  }
  window.addEventListener("load", tryUrls, false);

  attemptAutofillWithRetries();
})();

