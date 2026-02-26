/**
 * Privacy-friendly, cookie-free analytics.
 *
 * Sends a single pageview beacon to the Netlify Function endpoint.
 * No cookies, no localStorage, no fingerprinting, no external scripts.
 * Fully GDPR-compliant — no consent banner needed.
 *
 * Data is logged to Netlify Function logs and can be viewed in the
 * Netlify dashboard under Functions > pageview > Logs.
 */

// Skip analytics in development and for bots
const isBot = /bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent);
const isDev = location.hostname === "localhost" || location.hostname === "127.0.0.1";

if (!isBot && !isDev) {
  const lang = document.documentElement.lang || "unknown";

  // Use sendBeacon for a non-blocking request that survives page unload
  const data = JSON.stringify({
    path: location.pathname,
    referrer: document.referrer || "",
    lang,
  });

  // sendBeacon is fire-and-forget — no response handling needed
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/.netlify/functions/pageview", data);
  } else {
    // Fallback for older browsers
    fetch("/.netlify/functions/pageview", {
      method: "POST",
      body: data,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {
      // Silently ignore analytics failures
    });
  }
}
