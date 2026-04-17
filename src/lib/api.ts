import { Project } from "./types";
import { codaConfig } from "./coda-config";

export type SelectColors = Record<string, { fg: string; bg: string }>;
export type StatusColors = SelectColors;
export type PillarColors = SelectColors;

// No hardcoded table IDs. Callers MUST pass a docId + tableId (usually from
// the ?docId=...&tableId=... URL query). Missing IDs surface the empty-state
// picker in the UI instead of loading some arbitrary default flowmap.
function requireIds(docId?: string, tableId?: string): { docId: string; tableId: string } {
  if (!docId || !tableId) {
    throw new Error("Missing docId/tableId — use ?docId=...&tableId=... in the URL");
  }
  return { docId, tableId };
}
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
    const status = parseValue(vals[codaConfig.statusColumn]);
    return {
      id: row.id,
      name: parseValue(vals[codaConfig.nameColumn]),
      status,
      // Snapshot the original Coda status before any derivation happens.
      rawStatus: status,
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
/**
 * Find the first table on a given Coda page. Accepts the short pageId that
 * appears in Coda URLs (e.g. "suYR1GHY" from .../Page-Name_suYR1GHY) or the
 * longer "canvas-..." page id. Returns the tableId (e.g. "grid-...") or null.
 */
export async function resolveTableIdForPage(
  docId: string,
  pageId: string,
): Promise<string | null> {
  const token = process.env.CODA_API_TOKEN;
  if (!token) throw new Error("CODA_API_TOKEN not set");
  const auth = { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" as const };

  // Step 1: resolve the canvas-* id. Accept either a short id ("suriNjLU")
  // from the Coda URL tail OR the full "canvas-..." id.
  let canvasId = pageId.startsWith("canvas-") ? pageId : null;
  if (!canvasId) {
    const pagesResp = await fetch(`${CODA_API}/docs/${docId}/pages?limit=200`, auth);
    if (!pagesResp.ok) return null;
    const pagesData = await pagesResp.json();
    const pages = (pagesData.items || []) as {
      id: string;
      browserLink?: string;
    }[];
    const match = pages.find((p) => (p.browserLink ?? "").split("_").pop() === pageId);
    if (!match) return null;
    canvasId = match.id;
  }

  // Step 2: find a table whose parent.id equals the canvas id. The table
  // endpoint's parent.browserLink is NOT reliable — always match by id.
  const tablesResp = await fetch(`${CODA_API}/docs/${docId}/tables`, auth);
  if (!tablesResp.ok) return null;
  const tablesData = await tablesResp.json();
  const tables = (tablesData.items || []) as {
    id: string;
    parent?: { id?: string };
  }[];
  const match = tables.find((t) => t.parent?.id === canvasId);
  return match?.id ?? null;
}

export async function fetchTableName(
  docIdArg?: string,
  tableIdArg?: string,
): Promise<string> {
  const { docId, tableId } = requireIds(docIdArg, tableIdArg);
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

/**
 * Walk each project's dependsOn + blockedBy chains and record every upstream
 * card reachable (excluding directly-listed entries). Populates
 * `transitiveDependencies` so the tooltip can surface the full impact chain
 * without us having to draw extra edges on the canvas.
 */
function attachTransitiveDependencies(projects: Project[]): Project[] {
  const byName = new Map(projects.map((p) => [p.name, p]));
  return projects.map((p) => {
    const direct = new Set<string>([...p.blockedBy, ...p.dependsOn]);
    const visited = new Set<string>();
    const stack: string[] = [...direct];
    while (stack.length > 0) {
      const name = stack.pop() as string;
      if (visited.has(name) || name === p.name) continue;
      visited.add(name);
      const upstream = byName.get(name);
      if (upstream) {
        for (const n of upstream.blockedBy) stack.push(n);
        for (const n of upstream.dependsOn) stack.push(n);
      }
    }
    const transitive = Array.from(visited).filter((n) => !direct.has(n));
    return { ...p, transitiveDependencies: transitive };
  });
}

/**
 * Fire-and-forget PATCH to Coda: set a single row's Status column.
 * We don't await; failures are logged but don't block the render.
 */
function pushStatusToCoda(
  docId: string,
  tableId: string,
  token: string,
  rowId: string,
  newStatus: string,
) {
  fetch(`${CODA_API}/docs/${docId}/tables/${tableId}/rows/${rowId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      row: {
        cells: [{ column: codaConfig.statusColumn, value: newStatus }],
      },
    }),
  }).catch((err) => {
    console.error(`[sync] Coda PUT failed for row ${rowId}:`, err);
  });
}

/**
 * Apply the derived-status rule and sync any drift back to Coda in the
 * background. Returns the projects list with the derived status already applied
 * so the UI renders correctly even before Coda catches up.
 *
 * Rules (transitive):
 *   - A project is "Blocked" if blockedBy has any value, OR if any entry in
 *     dependsOn resolves to a project that is itself Blocked (recursive).
 *   - If the raw Coda status is "Blocked" but the project no longer satisfies
 *     either condition above → reset to "In Progress".
 *   - Otherwise keep the raw Coda status.
 */
function syncDerivedStatus(
  projects: Project[],
  docId: string,
  tableId: string,
  token: string,
): Project[] {
  // Seed with cards that have at least one explicit blocker.
  const blockedSet = new Set<string>();
  for (const p of projects) {
    if (p.blockedBy.length > 0) blockedSet.add(p.name);
  }

  // Propagate: a card becomes blocked if ANY name in its dependsOn is already
  // blocked. Loop until a pass adds nothing.
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of projects) {
      if (blockedSet.has(p.name)) continue;
      for (const depName of p.dependsOn) {
        if (blockedSet.has(depName)) {
          blockedSet.add(p.name);
          grew = true;
          break;
        }
      }
    }
  }

  return projects.map((p) => {
    const directlyBlocked = p.blockedBy.length > 0;
    const transitivelyBlocked = blockedSet.has(p.name);

    // Coda sync — push for ANY block transition (direct OR transitive) so the
    // stored Status column always reflects delivery reality: if the feature
    // can't make progress (because it or any upstream is blocked), Coda says
    // Blocked. When the chain unblocks, we flip it back to In Progress.
    if (transitivelyBlocked && p.status !== "Blocked") {
      pushStatusToCoda(docId, tableId, token, p.id, "Blocked");
    } else if (!transitivelyBlocked && p.status === "Blocked") {
      pushStatusToCoda(docId, tableId, token, p.id, "In Progress");
    }

    // In-memory: apply transitive block for UI display. Raw Coda value stays
    // intact in p.rawStatus.
    if (transitivelyBlocked && p.status !== "Blocked") {
      return { ...p, status: "Blocked" };
    }
    if (!transitivelyBlocked && p.status === "Blocked") {
      return { ...p, status: "In Progress" };
    }
    return p;
  });
}

export async function fetchProjectsServer(
  docIdArg?: string,
  tableIdArg?: string,
): Promise<Project[]> {
  const { docId, tableId } = requireIds(docIdArg, tableIdArg);
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
  const projects = attachTransitiveDependencies(parseRows(data));
  return syncDerivedStatus(projects, docId, tableId, token);
}

/**
 * Generic: fetch a single select column's option colours from Coda.
 * Returns a map of option-name → { fg, bg } hex colors.
 */
async function fetchSelectColumnColors(
  docId: string,
  tableId: string,
  token: string,
  columnName: string,
): Promise<SelectColors> {
  // List columns to find the target column ID
  const colsResp = await fetch(
    `${CODA_API}/docs/${docId}/tables/${tableId}/columns`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    }
  );
  if (!colsResp.ok) return {};
  const colsData = await colsResp.json();
  const col = (colsData.items || []).find(
    (c: { name: string; id: string }) => c.name === columnName
  );
  if (!col?.id) return {};

  // Fetch the column detail to get its select options
  const detailResp = await fetch(
    `${CODA_API}/docs/${docId}/tables/${tableId}/columns/${col.id}`,
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

  const colors: SelectColors = {};
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
 * Server-side: fetch the Status column's select options with colors from Coda.
 */
export async function fetchStatusColors(
  docIdArg?: string,
  tableIdArg?: string,
): Promise<StatusColors> {
  const { docId, tableId } = requireIds(docIdArg, tableIdArg);
  const token = process.env.CODA_API_TOKEN;
  if (!token) return {};
  return fetchSelectColumnColors(docId, tableId, token, codaConfig.statusColumn);
}

/**
 * Server-side: fetch the Pillar column's select options with colors from Coda.
 */
export async function fetchPillarColors(
  docIdArg?: string,
  tableIdArg?: string,
): Promise<PillarColors> {
  const { docId, tableId } = requireIds(docIdArg, tableIdArg);
  const token = process.env.CODA_API_TOKEN;
  if (!token) return {};
  return fetchSelectColumnColors(docId, tableId, token, codaConfig.pillarColumn);
}

/**
 * Client-side: fetch from our own API route (keeps the token hidden).
 */
export async function fetchProjectsClient(
  docId?: string,
  tableId?: string,
): Promise<{
  projects: Project[];
  statusColors: StatusColors;
  pillarColors: PillarColors;
}> {
  const params = new URLSearchParams();
  if (docId) params.set("docId", docId);
  if (tableId) params.set("tableId", tableId);
  const qs = params.size ? `?${params}` : "";
  const resp = await fetch(`/api/rows${qs}`);
  if (!resp.ok) throw new Error(`API returned ${resp.status}`);
  const data = await resp.json();
  return {
    projects: data.projects,
    statusColors: data.statusColors || {},
    pillarColors: data.pillarColors || {},
  };
}
