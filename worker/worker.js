/**
 * IUX Dependency Map — Cloudflare Worker Proxy
 *
 * Proxies requests to the Coda API so the API token stays server-side.
 * Deploy with: npx wrangler deploy
 * Set your token: npx wrangler secret put CODA_API_TOKEN
 */

const DOC_ID = "TRox5YL_Dr";
const TABLE_ID = "grid-JnGN_SjsL9";
const CODA_API = "https://coda.io/apis/v1";

// Update this after deploying your GitHub Pages or app
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://*.github.io",
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((pattern) => {
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return regex.test(origin);
    }
    return origin === pattern;
  });
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(isOriginAllowed(origin) ? origin : null);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // GET /rows — fetch all rows from the dependency table
      if (path === "/rows" && request.method === "GET") {
        const resp = await fetch(
          `${CODA_API}/docs/${DOC_ID}/tables/${TABLE_ID}/rows?useColumnNames=true&valueFormat=rich`,
          {
            headers: {
              Authorization: `Bearer ${env.CODA_API_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          status: resp.status,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // PUT /rows/:rowId — update a row
      if (path.startsWith("/rows/") && request.method === "PUT") {
        const rowId = path.split("/rows/")[1];
        const body = await request.json();
        const resp = await fetch(
          `${CODA_API}/docs/${DOC_ID}/tables/${TABLE_ID}/rows/${rowId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${env.CODA_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );
        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          status: resp.status,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // GET /columns — fetch table columns
      if (path === "/columns" && request.method === "GET") {
        const resp = await fetch(
          `${CODA_API}/docs/${DOC_ID}/tables/${TABLE_ID}/columns`,
          {
            headers: {
              Authorization: `Bearer ${env.CODA_API_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          status: resp.status,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  },
};
