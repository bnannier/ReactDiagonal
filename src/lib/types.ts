export interface Project {
  id: string;
  name: string;
  status: string;
  /**
   * The raw Coda Status value before any derivation (transitive block
   * propagation). Used by layout.ts to colour edges based on the TARGET's
   * original in-progress intent, even if the derived status is Blocked.
   */
  rawStatus?: string;
  owner: string;
  targetDate: string;
  pillar: string;
  notes: string;
  /**
   * Optional ticket reference (e.g. Jira key "PROJ-123" or a full URL). Rendered
   * in the card tooltip; if it parses as a URL it becomes a clickable link.
   */
  ticket?: string;
  blockedBy: string[];
  dependsOn: string[];
  /**
   * All upstream cards reachable via dependsOn / blockedBy chains, excluding
   * the direct entries already listed above. Shown in the card tooltip so users
   * can see the full impact chain without needing extra edges drawn.
   */
  transitiveDependencies?: string[];
}

export const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; bgDark: string; border: string; text: string; textDark: string }
> = {
  "In Progress": {
    color: "#f59e0b",
    bg: "#fffbeb",
    bgDark: "#2a1e05",
    border: "#f59e0b",
    text: "#92400e",
    textDark: "#fcd34d",
  },
  Blocked: {
    color: "#ef4444",
    bg: "#fef2f2",
    bgDark: "#2a0d0d",
    border: "#ef4444",
    text: "#991b1b",
    textDark: "#fca5a5",
  },
  "Not Started": {
    color: "#9ca3af",
    bg: "#f0f1f3",
    bgDark: "#1f2937",
    border: "#9ca3af",
    text: "#374151",
    textDark: "#d1d5db",
  },
  Complete: {
    color: "#22c55e",
    bg: "#f0fdf4",
    bgDark: "#0a2515",
    border: "#22c55e",
    text: "#166534",
    textDark: "#86efac",
  },
};

export const DEFAULT_STATUS_CONFIG = {
  color: "#9ca3af",
  bg: "#f0f1f3",
  bgDark: "#1f2937",
  border: "#9ca3af",
  text: "#374151",
  textDark: "#d1d5db",
};

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || DEFAULT_STATUS_CONFIG;
}
