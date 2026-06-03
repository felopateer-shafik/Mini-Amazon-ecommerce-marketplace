const META_PIXEL_SCRIPT_ID = "meta-pixel-script";
const META_PIXEL_SRC = "https://connect.facebook.net/en_US/fbevents.js";

function getWindow() {
  return typeof window !== "undefined" ? window : null;
}

function normalizePixelId(value) {
  return String(value ?? "").trim();
}

function isValidPixelId(pixelId) {
  return /^[0-9]{5,30}$/.test(pixelId);
}

export function getConfiguredPixelId(settings = {}) {
  const settingsId = normalizePixelId(settings?.facebook_pixel_id);
  if (settingsId) return settingsId;
  return normalizePixelId(import.meta.env.VITE_FACEBOOK_PIXEL_ID);
}

export function initFacebookPixel(settings = {}) {
  const win = getWindow();
  if (!win) return false;

  const enabledFromSettings = settings?.facebook_pixel_enabled;
  const pixelEnabled = typeof enabledFromSettings === "boolean"
    ? enabledFromSettings
    : Boolean(getConfiguredPixelId(settings));

  const pixelId = getConfiguredPixelId(settings);
  if (!pixelEnabled || !isValidPixelId(pixelId)) {
    return false;
  }

  if (!win.fbq) {
    const fbq = function (...args) {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, args);
      } else {
        fbq.queue.push(args);
      }
    };

    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];

    win.fbq = fbq;
    win._fbq = fbq;

    if (!document.getElementById(META_PIXEL_SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = META_PIXEL_SCRIPT_ID;
      script.async = true;
      script.src = META_PIXEL_SRC;
      document.head.appendChild(script);
    }
  }

  if (win.__fbPixelId !== pixelId) {
    win.fbq("init", pixelId);
    win.__fbPixelId = pixelId;
  }

  win.__fbPixelReady = true;
  return true;
}

export function isFacebookPixelReady() {
  const win = getWindow();
  return Boolean(win?.__fbPixelReady && typeof win?.fbq === "function");
}

export function trackFacebookPageView() {
  const win = getWindow();
  if (!isFacebookPixelReady()) return;
  win.fbq("track", "PageView");
}

export function trackFacebookEvent(eventName, payload = {}) {
  const win = getWindow();
  if (!isFacebookPixelReady() || !eventName) return;
  win.fbq("track", eventName, payload);
}
