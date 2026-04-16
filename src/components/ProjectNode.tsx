"use client";

import { memo, useEffect, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useTheme } from "next-themes";
import {
  NodePanel,
  NodeDescription,
  NodeIcon,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@synergycodes/overflow-ui";
import { getStatusConfig, type Project } from "@/lib/types";

// Status indicator icons as SVG
function StatusDot({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="5" fill={color} />
    </svg>
  );
}

// Dependency arrow icon
function DependencyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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

function ProjectNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ProjectNodeData;
  const { project, blockedBy } = nodeData;
  const config = getStatusConfig(project.status);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true; // default dark to avoid FOUC
  const cardBg = isDark ? config.bgDark : config.bg;
  const footerText = isDark ? config.textDark : config.text;

  return (
    <Tooltip placement="right">
      <TooltipTrigger asChild>
        <div>
          <Handle type="target" position={Position.Top} className="!opacity-0 !pointer-events-none !w-2 !h-2" />

          <div style={{ position: "relative", width: 250, background: cardBg }} className="rounded-xl">
            {/* Absolute border overlay — wraps the NodePanel without affecting its layout */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                border: `2px solid ${config.border}`,
                borderRadius: "12px",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
          <NodePanel.Root
            selected={!!selected}
            className="!bg-transparent !shadow-none !border-0 !rounded-xl overflow-hidden [&>div]:!w-full [&>div]:!max-w-none"
          >
            <NodePanel.Header>
              <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                <NodeIcon
                  icon={<StatusDot color={config.color} />}
                />
                <span
                  className="text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: config.color }}
                >
                  {project.status}
                </span>
              </div>
            </NodePanel.Header>

            <NodePanel.Content>
              <div className="px-3 pb-3">
                <NodeDescription
                  label={
                    project.name.length > 32
                      ? project.name.slice(0, 30) + "\u2026"
                      : project.name
                  }
                  description={[
                    project.targetDate
                      ? `Target: ${project.targetDate}`
                      : null,
                    project.owner ? project.owner : null,
                  ]
                    .filter(Boolean)
                    .join("  \u2022  ")}
                />
              </div>
            </NodePanel.Content>

            {(blockedBy > 0 || project.dependsOn.length > 0) && (
              <NodePanel.Handles>
                <div className="flex items-center gap-1 px-3 pb-2 text-[10px]" style={{ color: footerText }}>
                  <DependencyIcon />
                  <span>
                    {blockedBy > 0 ? `Blocks ${blockedBy}` : ""}
                    {blockedBy > 0 && project.dependsOn.length > 0 ? " \u2022 " : ""}
                    {project.dependsOn.length > 0 ? `Depends on ${project.dependsOn.length}` : ""}
                  </span>
                </div>
              </NodePanel.Handles>
            )}
          </NodePanel.Root>
          </div>

          <Handle type="source" position={Position.Bottom} className="!opacity-0 !pointer-events-none !w-2 !h-2" />
        </div>
      </TooltipTrigger>
      <TooltipContent tooltipType="default">
        <div className="max-w-[260px] text-xs leading-relaxed text-slate-900 p-1">
          <div className="font-semibold mb-1 text-slate-900">{project.name}</div>
          <div className="text-slate-600">Status: {project.status}</div>
          {project.targetDate && (
            <div className="text-slate-600">Target: {project.targetDate}</div>
          )}
          {project.owner && (
            <div className="text-slate-600">Owner: {project.owner}</div>
          )}
          {project.dependsOn.length > 0 && (
            <div className="text-slate-600">
              Depends on: {project.dependsOn.join(", ")}
            </div>
          )}
          {project.notes && (
            <div className="text-slate-500 mt-1 italic">{project.notes}</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export const ProjectNode = memo(ProjectNodeComponent);
