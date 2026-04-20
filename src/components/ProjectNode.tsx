"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type Project } from "@/lib/types";
import { useStatusColors } from "./StatusColorsContext";

// Status indicator dot
function StatusDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block w-2 h-2 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

// Small dependency arrow
function DependencyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="shrink-0"
    >
      <path d="M3 8h10M10 5l3 3-3 3" />
    </svg>
  );
}

interface ProjectNodeData {
  project: Project;
  blockedBy: number;
  [key: string]: unknown;
}

// Extract a short, human-readable label from a ticket URL. For Jira links we
// pull the issue key (e.g. "ROBO-2260"); otherwise we fall back to the final
// path segment so the tooltip never displays a wall of URL.
function ticketLabel(ticket: string): string {
  try {
    const u = new URL(ticket);
    // Jira: board URLs carry the key in ?selectedIssue=KEY-123
    const selected = u.searchParams.get("selectedIssue");
    if (selected) return selected;
    // Jira: /browse/KEY-123 or /jira/browse/KEY-123
    const jiraKey = ticket.match(/\b([A-Z][A-Z0-9]+-\d+)\b/);
    if (jiraKey) return jiraKey[1];
    // Fallback: last non-empty path segment
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || u.hostname;
  } catch {
    return ticket;
  }
}

// Apply a low-opacity version of a hex color for subtle card tints in any theme.
function hexWithAlpha(hex: string, alpha: string): string {
  // If it's already an 8-digit hex, replace the alpha; otherwise append alpha
  const clean = hex.startsWith("#") ? hex : `#${hex}`;
  if (clean.length === 9) return clean.slice(0, 7) + alpha;
  return clean + alpha;
}

function ProjectNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as ProjectNodeData;
  const { project, blockedBy } = nodeData;
  const statusLabel = project.status || "No Status";

  // Dynamic colors from Coda's Status column options.
  const statusColors = useStatusColors();
  const colors = statusColors[project.status];
  // Fallback neutral if no status / unknown status
  const dotColor = colors?.fg || "#9ca3af";
  const badgeBg = colors ? hexWithAlpha(colors.bg, "80") : undefined; // 50% alpha
  const badgeFg = colors?.fg;
  const badgeBorder = colors ? hexWithAlpha(colors.fg, "40") : undefined; // 25% alpha
  // Card tint: layer Coda's fg color (low alpha) on top of a white base so the
  // card renders as a clean pastel (not a washed-out tint on the dark page).
  // In dark mode we also override the card's CSS vars to the light-mode values
  // so text remains readable on the white background.
  const tintAlpha = colors ? hexWithAlpha(colors.bg, "E6") : undefined; // 90% alpha of Coda's bg over white
  const cardStyle: React.CSSProperties | undefined = colors
    ? ({
        // Background is driven by the --tint CSS var so the flash animation
        // can swap it between the status colour and red without losing the
        // white base layer.
        "--tint": tintAlpha,
        // --pulse-color drives the in-progress breathing glow (fg color at
        // moderate alpha so the glow reads without being overpowering).
        "--pulse-color": hexWithAlpha(colors.fg, "99"),
        background: `linear-gradient(${tintAlpha}, ${tintAlpha}), #ffffff`,
        borderColor: colors.fg,
        // Scope light-mode color vars to the card so shadcn text tokens stay readable.
        "--foreground": "222.2 84% 4.9%",
        "--muted-foreground": "215.4 16.3% 46.9%",
        "--card-foreground": "222.2 84% 4.9%",
        "--border": "214.3 31.8% 91.4%",
        color: "hsl(var(--card-foreground))",
      } as React.CSSProperties)
    : undefined;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Handle
            type="target"
            position={Position.Top}
            className="!opacity-0 !pointer-events-none !w-2 !h-2"
          />

          <Card
            className={cn(
              "w-[250px] gap-0 py-0 rounded-xl shadow-sm border-2 ring-0",
              "bg-card text-card-foreground",
              blockedBy > 0 && "animate-block-flash",
              project.status === "In Progress" && "animate-in-progress"
            )}
            style={cardStyle}
          >
            {/* Header: status badge */}
            <div className="px-3 pt-3 pb-1">
              <Badge
                variant="outline"
                className="gap-1.5 text-[10px] font-semibold tracking-wide uppercase"
                style={
                  colors
                    ? {
                        backgroundColor: badgeBg,
                        color: badgeFg,
                        borderColor: badgeBorder,
                      }
                    : undefined
                }
              >
                <StatusDot color={dotColor} />
                {statusLabel}
              </Badge>
            </div>

            {/* Content */}
            <div className="px-3 pb-3">
              <div className="text-sm font-semibold leading-tight text-foreground">
                {project.name.length > 32
                  ? project.name.slice(0, 30) + "\u2026"
                  : project.name}
              </div>
              {(project.targetDate || project.owner) && (
                <div className="text-[11px] mt-1 text-muted-foreground">
                  {[
                    project.targetDate ? `Target: ${project.targetDate}` : null,
                    project.owner ? project.owner : null,
                  ]
                    .filter(Boolean)
                    .join("  \u2022  ")}
                </div>
              )}
            </div>

            {/* Footer */}
            {(blockedBy > 0 ||
              project.blockedBy.length > 0 ||
              project.dependsOn.length > 0) && (
              <div className="flex items-center gap-1.5 px-3 pb-2 text-[10px] text-muted-foreground border-t border-border/50 pt-2">
                <DependencyIcon />
                <span>
                  {[
                    blockedBy > 0 ? `Blocks ${blockedBy}` : null,
                    project.blockedBy.length > 0
                      ? `Blocked by ${project.blockedBy.length}`
                      : null,
                    project.dependsOn.length > 0
                      ? `Depends on ${project.dependsOn.length}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" \u2022 ")}
                </span>
              </div>
            )}
          </Card>

          <Handle
            type="source"
            position={Position.Bottom}
            className="!opacity-0 !pointer-events-none !w-2 !h-2"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[260px]">
        <div className="text-xs leading-relaxed space-y-0.5">
          <div className="font-semibold">{project.name}</div>
          <div>Status: {project.status}</div>
          {project.targetDate && <div>Target: {project.targetDate}</div>}
          {project.owner && <div>Owner: {project.owner}</div>}
          {project.ticket && (
            <div>
              Ticket:{" "}
              {/^https?:\/\//i.test(project.ticket) ? (
                <a
                  href={project.ticket}
                  target="_blank"
                  rel="noopener noreferrer"
                  // Tooltip uses bg-primary/text-primary-foreground, so the
                  // link must inherit — text-primary would be invisible.
                  className="underline font-mono"
                >
                  {ticketLabel(project.ticket)}
                </a>
              ) : (
                <span className="font-mono">{project.ticket}</span>
              )}
            </div>
          )}
          {project.blockedBy.length > 0 && (
            <div>Blocked by: {project.blockedBy.join(", ")}</div>
          )}
          {project.dependsOn.length > 0 && (
            <div>Depends on: {project.dependsOn.join(", ")}</div>
          )}
          {(project.transitiveDependencies?.length ?? 0) > 0 && (
            <div className="text-slate-500 text-[11px] mt-1">
              Also transitively depends on:{" "}
              {project.transitiveDependencies!.join(", ")}
            </div>
          )}
          {project.notes && (
            <div className="mt-1 italic opacity-80">{project.notes}</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export const ProjectNode = memo(ProjectNodeComponent);
