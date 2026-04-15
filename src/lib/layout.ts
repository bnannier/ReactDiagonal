import { Node, Edge } from "@xyflow/react";
import { Project, getStatusConfig } from "./types";

export interface ProjectNodeData {
  project: Project;
  [key: string]: unknown;
}

/**
 * Topological sort projects into tiers and create React Flow nodes + edges.
 */
export function buildFlowGraph(projects: Project[]): {
  nodes: Node<ProjectNodeData>[];
  edges: Edge[];
} {
  // Topological sort into tiers
  const tiers: string[][] = [];
  const assigned = new Set<string>();
  let remaining = [...projects];

  while (remaining.length > 0) {
    const currentTier = remaining.filter((p) =>
      p.dependsOn.every((d) => assigned.has(d))
    );
    if (currentTier.length === 0) {
      // Circular or unresolved — dump remaining into last tier
      tiers.push(remaining.map((p) => p.name));
      break;
    }
    tiers.push(currentTier.map((p) => p.name));
    currentTier.forEach((p) => assigned.add(p.name));
    remaining = remaining.filter((p) => !assigned.has(p.name));
  }

  // Layout constants
  const NODE_W = 280;
  const NODE_H = 100;
  const H_GAP = 80;
  const V_GAP = 120;
  const TOP_MARGIN = 80;

  const nameToProject: Record<string, Project> = {};
  projects.forEach((p) => {
    nameToProject[p.name] = p;
  });

  // Create nodes with positions
  const nodes: Node<ProjectNodeData>[] = [];
  const TIER_LABELS = [
    "UPSTREAM",
    "MIDSTREAM",
    "DOWNSTREAM",
    "TIER 4",
    "TIER 5",
  ];

  // Calculate the max width needed for centering
  const maxTierWidth = Math.max(
    ...tiers.map((tier) => tier.length * NODE_W + (tier.length - 1) * H_GAP)
  );
  const canvasWidth = Math.max(maxTierWidth + 200, 960);

  tiers.forEach((tier, tierIdx) => {
    const totalWidth = tier.length * NODE_W + (tier.length - 1) * H_GAP;
    const startX = (canvasWidth - totalWidth) / 2;

    // Add tier label node
    nodes.push({
      id: `tier-label-${tierIdx}`,
      type: "tierLabel",
      position: { x: 20, y: TOP_MARGIN + tierIdx * (NODE_H + V_GAP) - 30 },
      data: {
        label: TIER_LABELS[tierIdx] || `TIER ${tierIdx + 1}`,
        project: {} as Project,
      },
      draggable: false,
      selectable: false,
      connectable: false,
    });

    tier.forEach((name, i) => {
      const project = nameToProject[name];
      if (!project) return;

      nodes.push({
        id: project.name,
        type: "projectNode",
        position: {
          x: startX + i * (NODE_W + H_GAP),
          y: TOP_MARGIN + tierIdx * (NODE_H + V_GAP),
        },
        data: { project },
      });
    });
  });

  // Create edges
  const edges: Edge[] = [];
  projects.forEach((p) => {
    p.blocks.forEach((blockedName) => {
      if (!nameToProject[blockedName]) return;
      const config = getStatusConfig(p.status);
      edges.push({
        id: `${p.name}->${blockedName}`,
        source: p.name,
        target: blockedName,
        type: "dependency",
        style: { stroke: config.color },
        animated: p.status === "In Progress",
      });
    });
  });

  return { nodes, edges };
}
