import type { Node, Edge } from "@xyflow/react";
import Dagre from "@dagrejs/dagre";
import { Project, getStatusConfig } from "./types";

export interface ProjectNodeData {
  project: Project;
  [key: string]: unknown;
}

const NODE_W = 280;
const NODE_H = 100;
const TIER_LABELS = ["UPSTREAM", "MIDSTREAM", "DOWNSTREAM", "TIER 4", "TIER 5"];

export function buildFlowGraph(projects: Project[]): {
  nodes: Node<ProjectNodeData>[];
  edges: Edge[];
} {
  const g = new Dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: 80,    // horizontal gap between nodes in the same rank
    ranksep: 160,   // vertical gap between ranks — gives edges room to route
    marginx: 120,
    marginy: 60,
    edgesep: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const nameToProject: Record<string, Project> = {};
  projects.forEach((p) => {
    nameToProject[p.name] = p;
    g.setNode(p.name, { width: NODE_W, height: NODE_H });
  });

  projects.forEach((p) => {
    p.blocks.forEach((blockedName) => {
      if (nameToProject[blockedName]) {
        g.setEdge(p.name, blockedName);
      }
    });
  });

  Dagre.layout(g);

  // Identify ranks by grouping nodes with the same (rounded) Y centre
  const ySet = new Set<number>();
  projects.forEach((p) => ySet.add(Math.round(g.node(p.name).y)));
  const sortedRankYs = Array.from(ySet).sort((a, b) => a - b);

  const nodes: Node<ProjectNodeData>[] = [];

  // Tier label nodes (one per rank, pinned to the left)
  sortedRankYs.forEach((rankY, idx) => {
    nodes.push({
      id: `tier-label-${idx}`,
      type: "tierLabel",
      position: { x: 20, y: rankY - NODE_H / 2 - 10 },
      data: { label: TIER_LABELS[idx] ?? `TIER ${idx + 1}`, project: {} as Project },
      draggable: false,
      selectable: false,
      connectable: false,
    });
  });

  // Project nodes at dagre-computed positions
  projects.forEach((p) => {
    const { x, y } = g.node(p.name);
    nodes.push({
      id: p.name,
      type: "projectNode",
      position: {
        x: Math.round(x - NODE_W / 2),
        y: Math.round(y - NODE_H / 2),
      },
      data: { project: p },
    });
  });

  // Edges — carry dagre bend-point waypoints so the edge component can draw
  // paths that route around intermediate nodes instead of through them.
  const edges: Edge[] = [];
  projects.forEach((p) => {
    p.blocks.forEach((blockedName) => {
      if (!nameToProject[blockedName]) return;
      const config = getStatusConfig(p.status);
      const edgeData = g.edge(p.name, blockedName);

      edges.push({
        id: `${p.name}->${blockedName}`,
        source: p.name,
        target: blockedName,
        type: "dependency",
        style: { stroke: config.color },
        animated: p.status === "In Progress",
        zIndex: 1,
        data: {
          waypoints: (edgeData?.points ?? []) as { x: number; y: number }[],
        },
      });
    });
  });

  return { nodes, edges };
}
