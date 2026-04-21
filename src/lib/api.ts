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

/**
 * Ticket columns in Coda come back as rich WebPage objects when the user has
 * pasted a URL — e.g. `{ "@type": "WebPage", url: "...", name?: "..." }`.
 * We return the URL (preferring a display name if Coda supplied one, joined
 * with the URL so the tooltip can still link out). Plain-text tickets like
 * "PROJ-123" come through as normal strings and are handled by parseValue.
 */
function parseTicket(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === "string") {
    const s = stripBackticks(val);
    return s || undefined;
  }
  if (typeof val === "object" && val !== null) {
    const v = val as Record<string, unknown>;
    const url = typeof v.url === "string" ? v.url : undefined;
    const name = typeof v.name === "string" ? v.name : undefined;
    if (url) return url;
    if (name) return name;
  }
  return parseValue(val) || undefined;
}

/**
 * Per-table column mapping. Defaults to the Features shape from codaConfig;
 * the Teams shape on pages like "Explore - P0" overrides nameColumn to "Team"
 * and uses a synthetic "Teams" pillar since the table has no Pillar column.
 */
export interface TableMapping {
  nameColumn: string;
  pillarColumn: string;
  /** If set, every row is forced to this pillar regardless of the column value. */
  pillarOverride?: string;
  /** Optional lookup column whose joined row-name becomes the card subtitle/notes. */
  featureRefColumn?: string;
}

const featuresMapping: TableMapping = {
  nameColumn: codaConfig.nameColumn,
  pillarColumn: codaConfig.pillarColumn,
};

const teamsMapping: TableMapping = {
  nameColumn: "Team",
  // Each team is its own pillar — use the Team column value for grouping so
  // "Enterprise AI" and "Enterprise Tech" render as sibling pillars alongside
  // the Features table's "Explore" pillar instead of collapsing into one.
  pillarColumn: "Team",
  featureRefColumn: "Feature",
};

function parseRows(
  data: { items: { id: string; values: Record<string, unknown> }[] },
  mapping: TableMapping = featuresMapping,
): Project[] {
  return (data.items || []).map((row) => {
    const vals = row.values || {};
    const status = parseValue(vals[codaConfig.statusColumn]);
    // For team rows, stuff the linked feature name into `notes` so the tooltip
    // shows what this team is on the hook for.
    const defaultNotes = parseValue(vals[codaConfig.notesColumn]);
    const notes = mapping.featureRefColumn
      ? parseValue(vals[mapping.featureRefColumn]) || defaultNotes
      : defaultNotes;
    return {
      id: row.id,
      name: parseValue(vals[mapping.nameColumn]),
      status,
      // Snapshot the original Coda status before any derivation happens.
      rawStatus: status,
      owner: parseValue(vals[codaConfig.ownerColumn]),
      targetDate: parseDate(vals[codaConfig.targetDateColumn]),
      pillar: mapping.pillarOverride ?? parseValue(vals[mapping.pillarColumn]),
      notes,
      ticket: parseTicket(vals[codaConfig.ticketColumn]),
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

/**
 * Resolve every table sitting on a given Coda page, with its shape (features
 * vs teams) detected from the column definitions. Used for option-(b) page
 * embeds where a single URL renders multiple sibling tables as one graph.
 */
export interface PageTable {
  id: string;
  name: string;
  shape: "features" | "teams";
}

export async function resolveTableIdsForPage(
  docId: string,
  pageId: string,
): Promise<PageTable[]> {
  const token = process.env.CODA_API_TOKEN;
  if (!token) throw new Error("CODA_API_TOKEN not set");
  const auth = { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" as const };

  let canvasId = pageId.startsWith("canvas-") ? pageId : null;
  if (!canvasId) {
    const pagesResp = await fetch(`${CODA_API}/docs/${docId}/pages?limit=200`, auth);
    if (!pagesResp.ok) return [];
    const pagesData = await pagesResp.json();
    const pages = (pagesData.items || []) as { id: string; browserLink?: string }[];
    const match = pages.find((p) => (p.browserLink ?? "").split("_").pop() === pageId);
    if (!match) return [];
    canvasId = match.id;
  }

  const tablesResp = await fetch(`${CODA_API}/docs/${docId}/tables`, auth);
  if (!tablesResp.ok) return [];
  const tablesData = await tablesResp.json();
  const tables = (tablesData.items || []) as {
    id: string;
    name: string;
    parent?: { id?: string };
  }[];
  const mine = tables.filter((t) => t.parent?.id === canvasId);

  // Detect shape by inspecting the Feature column's format.type.
  const results: PageTable[] = [];
  for (const t of mine) {
    let shape: "features" | "teams" = "features";
    try {
      const colsResp = await fetch(
        `${CODA_API}/docs/${docId}/tables/${t.id}/columns?limit=200`,
        auth,
      );
      if (colsResp.ok) {
        const colsData = await colsResp.json();
        const cols = (colsData.items || []) as {
          name: string;
          format?: { type?: string };
        }[];
        const hasTeam = cols.some((c) => c.name === "Team");
        const featureCol = cols.find((c) => c.name === codaConfig.nameColumn);
        const featureType = featureCol?.format?.type;
        if (hasTeam && featureType && featureType !== "text") {
          shape = "teams";
        }
      }
    } catch {
      // Fall back to features shape on any inspection failure.
    }
    results.push({ id: t.id, name: t.name, shape });
  }
  return results;
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

async function fetchRawProjectsForTable(
  docId: string,
  tableId: string,
  token: string,
  mapping: TableMapping,
): Promise<Project[]> {
  const resp = await fetch(
    `${CODA_API}/docs/${docId}/tables/${tableId}/rows?useColumnNames=true&valueFormat=rich`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );
  if (!resp.ok) throw new Error(`Coda API returned ${resp.status} for ${tableId}`);
  const data = await resp.json();
  return parseRows(data, mapping);
}

export async function fetchProjectsServer(
  docIdArg?: string,
  tableIdArg?: string,
): Promise<Project[]> {
  const { docId, tableId } = requireIds(docIdArg, tableIdArg);
  const token = process.env.CODA_API_TOKEN;
  if (!token) throw new Error("CODA_API_TOKEN not set");
  const raw = await fetchRawProjectsForTable(docId, tableId, token, featuresMapping);
  const projects = attachTransitiveDependencies(raw);
  return syncDerivedStatus(projects, docId, tableId, token);
}

/**
 * Option-(b) multi-table page fetch: pull every table parented on the given
 * Coda page, parse each per its shape, and merge into one Project list so
 * Feature→Team and Team→Team edges render in the same graph. Derived-status
 * sync only runs against the primary Features table (where the app owns the
 * Status column); Team rows are treated as read-only nodes.
 */
export async function fetchProjectsForPage(
  docId: string,
  pageId: string,
): Promise<Project[]> {
  const token = process.env.CODA_API_TOKEN;
  if (!token) throw new Error("CODA_API_TOKEN not set");
  const tables = await resolveTableIdsForPage(docId, pageId);
  if (tables.length === 0) return [];

  const rows = await Promise.all(
    tables.map((t) =>
      fetchRawProjectsForTable(
        docId,
        t.id,
        token,
        t.shape === "teams" ? teamsMapping : featuresMapping,
      ),
    ),
  );

  const merged = attachTransitiveDependencies(rows.flat());

  // Only sync derived Status back to the Features table — the Teams table
  // doesn't own its own Blocked state the same way.
  const primary = tables.find((t) => t.shape === "features");
  if (!primary) return merged;
  const byId = new Map(merged.map((p) => [p.id, p] as const));
  const featureProjects = rows[tables.indexOf(primary)]
    .map((p) => byId.get(p.id))
    .filter((p): p is Project => !!p);
  const synced = syncDerivedStatus(featureProjects, docId, primary.id, token);
  const syncedById = new Map(synced.map((p) => [p.id, p] as const));
  return merged.map((p) => syncedById.get(p.id) ?? p);
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
 * Merge multiple tables' status-colour maps into one, and inject the synthetic
 * "Teams" pillar colour for option-(b) team cards. Pillar colours from the
 * Features table take precedence since that's where the real Pillar column
 * lives.
 */
export async function fetchPageColors(
  docId: string,
  pageId: string,
): Promise<{ statusColors: StatusColors; pillarColors: PillarColors }> {
  const token = process.env.CODA_API_TOKEN;
  if (!token) return { statusColors: {}, pillarColors: {} };
  const tables = await resolveTableIdsForPage(docId, pageId);
  const statusList = await Promise.all(
    tables.map((t) =>
      fetchSelectColumnColors(docId, t.id, token, codaConfig.statusColumn),
    ),
  );
  const features = tables.find((t) => t.shape === "features");
  const pillarColors: PillarColors = features
    ? await fetchSelectColumnColors(docId, features.id, token, codaConfig.pillarColumn)
    : {};
  // Give every team its own pillar colour so each team-pillar stands apart.
  // Walk a deterministic slate/teal/amber palette so repeat renders stay stable.
  const teamPalette = [
    { fg: "#e2e8f0", bg: "#334155" },
    { fg: "#ccfbf1", bg: "#115e59" },
    { fg: "#fde68a", bg: "#78350f" },
    { fg: "#fecaca", bg: "#7f1d1d" },
    { fg: "#e9d5ff", bg: "#581c87" },
    { fg: "#bae6fd", bg: "#0c4a6e" },
  ];
  const teamTables = tables.filter((t) => t.shape === "teams");
  for (const t of teamTables) {
    // Pull the distinct Team values from the table so we can seed colours.
    const rowsResp = await fetch(
      `${CODA_API}/docs/${docId}/tables/${t.id}/rows?useColumnNames=true&valueFormat=rich&limit=200`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!rowsResp.ok) continue;
    const rowsData = await rowsResp.json();
    const names = new Set<string>();
    for (const r of rowsData.items || []) {
      const v = (r.values || {})["Team"];
      const name = typeof v === "string" ? v.replace(/^```|```$/g, "").trim() : "";
      if (name) names.add(name);
    }
    let i = 0;
    for (const n of names) {
      if (!pillarColors[n]) {
        pillarColors[n] = teamPalette[i % teamPalette.length];
        i += 1;
      }
    }
  }
  const statusColors: StatusColors = {};
  for (const m of statusList) Object.assign(statusColors, m);
  return { statusColors, pillarColors };
}

/**
 * Pick a user-facing title for the page-mode embed. Prefers the Features
 * table's name; falls back to the first table's name.
 */
export async function fetchPageTitle(
  docId: string,
  pageId: string,
): Promise<string> {
  const tables = await resolveTableIdsForPage(docId, pageId);
  const features = tables.find((t) => t.shape === "features");
  return (features ?? tables[0])?.name ?? "";
}

/**
 * Client-side: fetch from our own API route (keeps the token hidden).
 */
export async function fetchProjectsClient(
  docId?: string,
  tableId?: string,
  pageId?: string,
): Promise<{
  projects: Project[];
  statusColors: StatusColors;
  pillarColors: PillarColors;
}> {
  const params = new URLSearchParams();
  if (docId) params.set("docId", docId);
  if (tableId) params.set("tableId", tableId);
  if (pageId && !tableId) params.set("pageId", pageId);
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
