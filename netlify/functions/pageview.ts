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
  // Only accept POST requests
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

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

  try {
    const body = await request.json();
    const { path, referrer, lang } = body;

    // Log the pageview — visible in Netlify Functions dashboard
    console.log(
      JSON.stringify({
        type: "pageview",
        path: path || "/",
        referrer: referrer || "(direct)",
        lang: lang || "unknown",
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
