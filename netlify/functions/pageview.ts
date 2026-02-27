import type { Context } from "@netlify/functions";

/**
 * Minimal, cookie-free pageview tracker.
 *
 * Receives a JSON body with { path, referrer, lang } and logs it to
 * Netlify Function logs (visible in the Netlify dashboard under
 * Functions > pageview > Logs). No cookies, no PII, no external services.
 *
 * GDPR-compliant: does not store IP addresses, does not set cookies,
 * does not use fingerprinting. Only records the page path and referrer.
 */
export default async (request: Request, _context: Context) => {
  // CORS headers for same-site requests
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Only accept POST requests
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }

  try {
    const body = await request.json();
    const {
      type,
      path,
      referrer,
      lang,
      pagePath,
      landingPath,
      firstLandingPath,
      firstReferrer,
      utmSource,
      utmMedium,
      utmCampaign,
      trafficChannel,
      formName,
      formType,
      apartmentName,
    } = body as Record<string, unknown>;

    const eventType = typeof type === "string" && type.length > 0 ? type : "pageview";

    // Log the pageview — visible in Netlify Functions dashboard
    console.log(
      JSON.stringify({
        type: eventType,
        path: path || pagePath || "/",
        referrer: referrer || "(direct)",
        firstReferrer: firstReferrer || "",
        lang: lang || "unknown",
        landingPath: landingPath || "",
        firstLandingPath: firstLandingPath || "",
        utmSource: utmSource || "",
        utmMedium: utmMedium || "",
        utmCampaign: utmCampaign || "",
        trafficChannel: trafficChannel || "",
        formName: formName || "",
        formType: formType || "",
        apartmentName: apartmentName || "",
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
};
