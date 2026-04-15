import { Project } from "./types";

const DOC_ID = "TRox5YL_Dr";
const TABLE_ID = "grid-JnGN_SjsL9";
const CODA_API = "https://coda.io/apis/v1";

// Format ISO date string to readable format
function parseDate(val: unknown): string {
  if (!val) return "";
  const s = typeof val === "string" ? stripBackticks(val) : String(val);
  if (!s) return "";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return s;
  }
}

// Strip Coda rich-value backtick wrapping: "```text```" → "text"
function stripBackticks(s: string): string {
  return s.replace(/^```|```$/g, "").trim();
}

// Parse Coda API rich value into a plain string
function parseValue(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return stripBackticks(val);
  if (Array.isArray(val)) {
    return val
      .map((item: Record<string, unknown>) => String(item.name || item))
      .join(", ");
  }
  if (typeof val === "object" && val !== null) {
    const v = val as Record<string, unknown>;
    if (v.name) return String(v.name);
    if (v.formatted) return String(v.formatted);
    if (v.content) return String(v.content);
  }
  return String(val);
}

// Parse lookup refs into array of names (handles plain arrays and single objects)
function parseLookupRefs(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === "string") {
    const s = stripBackticks(val);
    return s ? [s] : [];
  }
  if (Array.isArray(val)) {
    return val.map((item: Record<string, unknown>) =>
      String(item.name || item)
    );
  }
  if (typeof val === "object" && val !== null) {
    const v = val as Record<string, unknown>;
    if (v.name) return [String(v.name)];
  }
  return [];
}

function parseRows(data: {
  items: { id: string; values: Record<string, unknown> }[];
}): Project[] {
  return (data.items || []).map((row) => {
    const vals = row.values || {};
    return {
      id: row.id,
      name: parseValue(vals["Project / Initiative"]),
      status: parseValue(vals["Status"]),
      owner: parseValue(vals["Owner"]),
      targetDate: parseDate(vals["Target Date"]),
      dependencyType: parseValue(vals["Dependency Type"]),
      notes: parseValue(vals["Notes"]),
      dependsOn: parseLookupRefs(vals["Depends On"]),
      blocks: parseLookupRefs(vals["Blocks"]),
    };
  });
}

/**
 * Server-side: fetch directly from Coda API using the secret token.
 * Used in server components and API routes.
 */
export async function fetchProjectsServer(): Promise<Project[]> {
  const token = process.env.CODA_API_TOKEN;
  if (!token) throw new Error("CODA_API_TOKEN not set");

  const resp = await fetch(
    `${CODA_API}/docs/${DOC_ID}/tables/${TABLE_ID}/rows?useColumnNames=true&valueFormat=rich`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 },
    }
  );

  if (!resp.ok) throw new Error(`Coda API returned ${resp.status}`);
  const data = await resp.json();
  return parseRows(data);
}

/**
 * Client-side: fetch from our own API route (keeps the token hidden).
 */
export async function fetchProjectsClient(): Promise<Project[]> {
  const resp = await fetch("/api/rows");
  if (!resp.ok) throw new Error(`API returned ${resp.status}`);
  const data = await resp.json();
  return data.projects;
}
