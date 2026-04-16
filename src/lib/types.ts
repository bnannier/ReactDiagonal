export interface Project {
  id: string;
  name: string;
  status: string;
  owner: string;
  targetDate: string;
  pillar: string;
  notes: string;
  blockedBy: string[];
  dependsOn: string[];
}

export const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; text: string }
> = {
  "In Progress": {
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#f59e0b",
    text: "#92400e",
  },
  Blocked: {
    color: "#ef4444",
    bg: "#fef2f2",
    border: "#ef4444",
    text: "#991b1b",
  },
  "Not Started": {
    color: "#9ca3af",
    bg: "#f0f1f3",
    border: "#9ca3af",
    text: "#374151",
  },
  Complete: {
    color: "#22c55e",
    bg: "#f0fdf4",
    border: "#22c55e",
    text: "#166534",
  },
};

export const DEFAULT_STATUS_CONFIG = {
  color: "#9ca3af",
  bg: "#f0f1f3",
  border: "#9ca3af",
  text: "#374151",
};

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || DEFAULT_STATUS_CONFIG;
}
