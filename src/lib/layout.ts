import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import Dagre from "@dagrejs/dagre";
import { Project } from "./types";

export interface ProjectNodeData {
  project: Project;
  [key: string]: unknown;
}

const NODE_W = 250;
const NODE_H = 130;
const TIER_LABELS = ["UPSTREAM", "MIDSTREAM", "DOWNSTREAM", "TIER 4", "TIER 5"];
const PILLAR_PADDING = 28;
const PILLAR_LABEL_H = 22;

const MAX_PER_ROW = 5;
const NODESEP_X = 80;   // horizontal gap between nodes
const SUB_ROW_GAP = 80; // vertical gap between wrapped rows within a tier
const RANK_GAP = 160;   // vertical gap between tiers
const PILLAR_GAP = 60;  // extra horizontal gap between pillar groups
const LAYOUT_START_X = 150;
const LAYOUT_START_Y = 60;

export function buildFlowGraph(projects: Project[]): {
  nodes: Node<ProjectNodeData>[];
  edges: Edge[];
} {
  const g = new Dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: NODESEP_X,
    ranksep: RANK_GAP,
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
    p.blockedBy.forEach((blockerName) => {
      if (nameToProject[blockerName]) {
        g.setEdge(blockerName, p.name);
      }
    });
  });

  Dagre.layout(g);

  // Group projects by dagre rank (same rounded Y = same tier)
  const rankProjects: Record<number, Project[]> = {};
  projects.forEach((p) => {
    const rankY = Math.round(g.node(p.name).y);
    if (!rankProjects[rankY]) rankProjects[rankY] = [];
    rankProjects[rankY].push(p);
  });
  const sortedRankYs = Object.keys(rankProjects).map(Number).sort((a, b) => a - b);

  // Compute position overrides: group by pillar within each rank, wrap at MAX_PER_ROW
  const positionOverride: Record<string, { x: number; y: number }> = {};
  const rankActualBaseY: Record<number, number> = {};
  const nameTierIdx: Record<string, number> = {}; // project name → tier index
  let currentY = LAYOUT_START_Y;

  sortedRankYs.forEach((rankY, tierIdx) => {
    const rp = rankProjects[rankY];
    rankActualBaseY[rankY] = currentY;
    rp.forEach((p) => { nameTierIdx[p.name] = tierIdx; });

    // Sort by pillar, then by original dagre X within pillar to preserve relative order
    const sorted = [...rp].sort((a, b) => {
      const pComp = (a.pillar || "").localeCompare(b.pillar || "");
      if (pComp !== 0) return pComp;
      return g.node(a.name).x - g.node(b.name).x;
    });

    // Group by pillar maintaining sorted order
    const pillars: string[] = [];
    const byPillar: Record<string, Project[]> = {};
    sorted.forEach((p) => {
      const key = p.pillar || "";
      if (!byPillar[key]) { byPillar[key] = []; pillars.push(key); }
      byPillar[key].push(p);
    });

    let curX = LAYOUT_START_X;
    let maxSubRows = 1;

    pillars.forEach((pillar) => {
      const pp = byPillar[pillar];
      const subRows = Math.ceil(pp.length / MAX_PER_ROW);
      maxSubRows = Math.max(maxSubRows, subRows);

      pp.forEach((p, i) => {
        const col = i % MAX_PER_ROW;
        const subRow = Math.floor(i / MAX_PER_ROW);
        positionOverride[p.name] = {
          x: curX + col * (NODE_W + NODESEP_X),
          y: currentY + subRow * (NODE_H + SUB_ROW_GAP),
        };
      });

      const cols = Math.min(pp.length, MAX_PER_ROW);
      curX += cols * (NODE_W + NODESEP_X) + PILLAR_GAP;
    });

    const rankHeight = maxSubRows * NODE_H + (maxSubRows - 1) * SUB_ROW_GAP;
    currentY += rankHeight + RANK_GAP;
  });

  const nodes: Node<ProjectNodeData>[] = [];

  // Tier label nodes (one per rank, pinned to the left)
  sortedRankYs.forEach((rankY, idx) => {
    nodes.push({
      id: `tier-label-${idx}`,
      type: "tierLabel",
      position: { x: 20, y: rankActualBaseY[rankY] },
      data: { label: TIER_LABELS[idx] ?? `TIER ${idx + 1}`, project: {} as Project },
      width: 90,
      height: NODE_H,
      draggable: false,
      selectable: false,
      connectable: false,
    });
  });

  // Count how many projects list each project in their "Blocked By" column
  const blockedByCount: Record<string, number> = {};
  projects.forEach((p) => {
    p.blockedBy.forEach((blockerName) => {
      blockedByCount[blockerName] = (blockedByCount[blockerName] ?? 0) + 1;
    });
  });

  // Project nodes using pillar-sorted, wrapped grid positions
  projects.forEach((p) => {
    const pos = positionOverride[p.name] ?? {
      x: Math.round(g.node(p.name).x - NODE_W / 2),
      y: Math.round(g.node(p.name).y - NODE_H / 2),
    };
    nodes.push({
      id: p.name,
      type: "projectNode",
      position: pos,
      width: NODE_W,
      data: { project: p, blockedBy: blockedByCount[p.name] ?? 0 },
    });
  });

  // Pillar group background nodes — one bounding box per pillar per tier
  const pillarBounds: Record<string, { pillar: string; minX: number; maxX: number; minY: number; maxY: number }> = {};
  nodes
    .filter((n) => n.type === "projectNode")
    .forEach((n) => {
      const pillar = (n.data as ProjectNodeData).project.pillar;
      if (!pillar) return;
      const tierIdx = nameTierIdx[(n.data as ProjectNodeData).project.name] ?? 0;
      const key = `${pillar}__tier${tierIdx}`;
      const { x, y } = n.position;
      if (!pillarBounds[key]) {
        pillarBounds[key] = { pillar, minX: x, maxX: x + NODE_W, minY: y, maxY: y + NODE_H };
      } else {
        const b = pillarBounds[key];
        b.minX = Math.min(b.minX, x);
        b.maxX = Math.max(b.maxX, x + NODE_W);
        b.minY = Math.min(b.minY, y);
        b.maxY = Math.max(b.maxY, y + NODE_H);
      }
    });

  Object.entries(pillarBounds).forEach(([key, b]) => {
    const { pillar } = b;
    const pgW = b.maxX - b.minX + PILLAR_PADDING * 2;
    const pgH = b.maxY - b.minY + PILLAR_PADDING * 2 + PILLAR_LABEL_H;
    nodes.unshift({
      id: `pillar-group-${key}`,
      type: "pillarGroup",
      position: {
        x: b.minX - PILLAR_PADDING,
        y: b.minY - PILLAR_PADDING - PILLAR_LABEL_H,
      },
      width: pgW,
      height: pgH,
      style: {
        width: pgW,
        height: pgH,
      },
      data: { label: pillar, project: {} as Project },
      draggable: false,
      selectable: false,
      connectable: false,
      zIndex: -1,
    });
  });

  // Build edges: blockedBy = red solid arrow, dependsOn = amber dashed arrow
  const BLOCKED_COLOR = "#ef4444";
  const DEPENDS_COLOR = "#f59e0b";
  const edges: Edge[] = [];

  projects.forEach((p) => {
    // Blocked By: source → target means "source blocks target"
    p.blockedBy.forEach((blockerName) => {
      if (!nameToProject[blockerName]) return;
      edges.push({
        id: `blocked:${blockerName}->${p.name}`,
        source: blockerName,
        target: p.name,
        type: "dependency",
        style: { stroke: BLOCKED_COLOR },
        markerStart: { type: MarkerType.ArrowClosed, color: BLOCKED_COLOR, width: 16, height: 16 },
        zIndex: 1,
        data: {},
      });
    });

    // Depends On: source → target means "source must come before target"
    p.dependsOn.forEach((depName) => {
      if (!nameToProject[depName]) return;
      // Avoid duplicate if the same pair is already covered by blockedBy
      const dupId = `blocked:${depName}->${p.name}`;
      if (edges.find((e) => e.id === dupId)) return;
      edges.push({
        id: `depends:${depName}->${p.name}`,
        source: depName,
        target: p.name,
        type: "dependency",
        style: { stroke: DEPENDS_COLOR, strokeDasharray: "6 3" },
        markerStart: { type: MarkerType.Arrow, color: DEPENDS_COLOR, width: 16, height: 16 },
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
