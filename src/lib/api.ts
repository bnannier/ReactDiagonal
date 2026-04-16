import { Project } from "./types";
import { codaConfig } from "./coda-config";

export type StatusColors = Record<string, { fg: string; bg: string }>;

const DEFAULT_DOC_ID = process.env.CODA_DOC_ID ?? "TRox5YL_Dr";
const DEFAULT_TABLE_ID = process.env.CODA_TABLE_ID ?? "grid-JnGN_SjsL9";
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
    if (v.content) {
      const c = v.content as Record<string, unknown>;
      if (c.name) return String(c.name);
      return String(v.content);
    }
  }
  return String(val);
}

// Extract a display name from a single Coda relation/lookup item object
function extractItemName(item: unknown): string {
  if (!item) return "";
  if (typeof item === "string") return stripBackticks(item);
  if (typeof item === "object" && item !== null) {
    const v = item as Record<string, unknown>;
    // Direct name field
    if (typeof v.name === "string" && v.name) return v.name.trim();
    // Nested inside content
    if (v.content && typeof v.content === "object") {
      const c = v.content as Record<string, unknown>;
      if (typeof c.name === "string" && c.name) return c.name.trim();
    }
    // displayName fallback
    if (typeof v.displayName === "string" && v.displayName) return v.displayName.trim();
  }
  return "";
}

// Parse lookup/relation refs into array of names (handles arrays and single objects)
function parseLookupRefs(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === "string") {
    const s = stripBackticks(val);
    return s ? [s] : [];
  }
  if (Array.isArray(val)) {
    return val.map(extractItemName).filter(Boolean);
  }
  if (typeof val === "object" && val !== null) {
    const name = extractItemName(val);
    return name ? [name] : [];
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
      name: parseValue(vals[codaConfig.nameColumn]),
      status: parseValue(vals[codaConfig.statusColumn]),
      owner: parseValue(vals[codaConfig.ownerColumn]),
      targetDate: parseDate(vals[codaConfig.targetDateColumn]),
      pillar: parseValue(vals[codaConfig.pillarColumn]),
      notes: parseValue(vals[codaConfig.notesColumn]),
      blockedBy: parseLookupRefs(vals[codaConfig.blockedByColumn]),
      dependsOn: parseLookupRefs(vals[codaConfig.dependsOnColumn]),
    };
  });
}

/**
 * Server-side: fetch directly from Coda API using the secret token.
 * Used in server components and API routes.
 */
export async function fetchTableName(
  docId = DEFAULT_DOC_ID,
  tableId = DEFAULT_TABLE_ID,
): Promise<string> {
  const token = process.env.CODA_API_TOKEN;
  if (!token) throw new Error("CODA_API_TOKEN not set");

  const resp = await fetch(
    `${CODA_API}/docs/${docId}/tables/${tableId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    }
  );

  if (!resp.ok) throw new Error(`Coda API returned ${resp.status}`);
  const data = await resp.json();
  return data.name as string;
}

export async function fetchProjectsServer(
  docId = DEFAULT_DOC_ID,
  tableId = DEFAULT_TABLE_ID,
): Promise<Project[]> {
  const token = process.env.CODA_API_TOKEN;
  if (!token) throw new Error("CODA_API_TOKEN not set");

  const resp = await fetch(
    `${CODA_API}/docs/${docId}/tables/${tableId}/rows?useColumnNames=true&valueFormat=rich`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!resp.ok) throw new Error(`Coda API returned ${resp.status}`);
  const data = await resp.json();
  return parseRows(data);
}

/**
 * Server-side: fetch the Status column's select options with colors from Coda.
 * Returns a map of status-name → { fg, bg } hex colors set in the Coda table.
 */
export async function fetchStatusColors(
  docId = DEFAULT_DOC_ID,
  tableId = DEFAULT_TABLE_ID,
): Promise<StatusColors> {
  const token = process.env.CODA_API_TOKEN;
  if (!token) return {};

  // List columns to find the Status column ID
  const colsResp = await fetch(
    `${CODA_API}/docs/${docId}/tables/${tableId}/columns`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    }
  );
  if (!colsResp.ok) return {};
  const colsData = await colsResp.json();
  const statusCol = (colsData.items || []).find(
    (c: { name: string; id: string }) => c.name === codaConfig.statusColumn
  );
  if (!statusCol?.id) return {};

  // Fetch the status column detail to get its select options
  const detailResp = await fetch(
    `${CODA_API}/docs/${docId}/tables/${tableId}/columns/${statusCol.id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    }
  );
  if (!detailResp.ok) return {};
  const detail = await detailResp.json();

  const options = detail?.format?.options as
    | { name: string; foregroundColor?: string; backgroundColor?: string }[]
    | undefined;
  if (!options) return {};

  const colors: StatusColors = {};
  for (const o of options) {
    if (!o?.name) continue;
    colors[o.name] = {
      fg: o.foregroundColor || "#64748b",
      bg: o.backgroundColor || "#f1f5f9",
    };
  }
  return colors;
}

/**
 * Client-side: fetch from our own API route (keeps the token hidden).
 */
export async function fetchProjectsClient(
  docId?: string,
  tableId?: string,
): Promise<{ projects: Project[]; statusColors: StatusColors }> {
  const params = new URLSearchParams();
  if (docId) params.set("docId", docId);
  if (tableId) params.set("tableId", tableId);
  const qs = params.size ? `?${params}` : "";
  const resp = await fetch(`/api/rows${qs}`);
  if (!resp.ok) throw new Error(`API returned ${resp.status}`);
  const data = await resp.json();
  return { projects: data.projects, statusColors: data.statusColors || {} };
}
