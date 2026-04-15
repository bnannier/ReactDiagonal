"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
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
  [key: string]: unknown;
}

function ProjectNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ProjectNodeData;
  const { project } = nodeData;
  const config = getStatusConfig(project.status);

  return (
    <Tooltip placement="right">
      <TooltipTrigger asChild>
        <div>
          <Handle type="target" position={Position.Top} className="!opacity-0 !pointer-events-none !w-2 !h-2" />

          <div
            style={{
              background: config.bg,
              border: `2px solid ${config.border}`,
              width: 280,
              minHeight: 90,
              borderRadius: "0.75rem",
              overflow: "hidden",
            }}
          >
          <NodePanel.Root selected={!!selected}>
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

            {(project.dependsOn.length > 0 || project.blocks.length > 0) && (
              <NodePanel.Handles>
                <div className="flex items-center gap-1 px-3 pb-2 text-[10px]" style={{ color: config.text }}>
                  <DependencyIcon />
                  <span>
                    {project.blocks.length > 0
                      ? `Blocks ${project.blocks.length}`
                      : ""}
                    {project.blocks.length > 0 && project.dependsOn.length > 0
                      ? " \u2022 "
                      : ""}
                    {project.dependsOn.length > 0
                      ? `Depends on ${project.dependsOn.length}`
                      : ""}
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
        <div className="max-w-[260px] text-xs leading-relaxed">
          <div className="font-semibold mb-1">{project.name}</div>
          <div className="text-slate-400">Status: {project.status}</div>
          {project.targetDate && (
            <div className="text-slate-400">Target: {project.targetDate}</div>
          )}
          {project.owner && (
            <div className="text-slate-400">Owner: {project.owner}</div>
          )}
          {project.dependsOn.length > 0 && (
            <div className="text-slate-400">
              Depends on: {project.dependsOn.join(", ")}
            </div>
          )}
          {project.blocks.length > 0 && (
            <div className="text-slate-400">
              Blocks: {project.blocks.join(", ")}
            </div>
          )}
          {project.notes && (
            <div className="text-slate-400 mt-1 italic">{project.notes}</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export const ProjectNode = memo(ProjectNodeComponent);
