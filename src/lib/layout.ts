import type { Node, Edge } from "@xyflow/react";
import Dagre from "@dagrejs/dagre";
import { Project, getStatusConfig } from "./types";

export interface ProjectNodeData {
  project: Project;
  [key: string]: unknown;
}

const NODE_W = 250;
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

  // Build edges first, then annotate with per-node source/target indices so
  // the edge component can spread the vertical stems and avoid overlapping.
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
        zIndex: 1,
        data: {},
      });
    });
  });

  // Give every edge a stable global index so the bypass channels
  // can be spread apart even when they come from different source nodes.
  const edgeTotal = edges.length;
  edges.forEach((e, i) => {
    e.data = { edgeIndex: i, edgeTotal };
  });

  return { nodes, edges };
}
