"use client";

import { memo } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  useNodes,
  Position,
  type EdgeProps,
  type Node,
  EdgeLabelRenderer,
} from "@xyflow/react";
import { useEdgeStyle, EdgeLabel } from "@synergycodes/overflow-ui";

const NODE_W = 250;
const NODE_H = 115;   // slightly taller than visual height to add clearance
const BYPASS_MARGIN = 28;
const CORNER_R = 14;

/** Polyline through `pts` with rounded corners of radius `r`. */
function smoothPoly(pts: [number, number][], r: number): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];

    const dx1 = cx - px, dy1 = cy - py, len1 = Math.hypot(dx1, dy1);
    const dx2 = nx - cx, dy2 = ny - cy, len2 = Math.hypot(dx2, dy2);

    if (len1 === 0 || len2 === 0) { d += ` L ${cx} ${cy}`; continue; }

    const rr = Math.min(r, len1 / 2, len2 / 2);
    const ax = cx - (rr / len1) * dx1, ay = cy - (rr / len1) * dy1;
    const bx = cx + (rr / len2) * dx2, by = cy + (rr / len2) * dy2;
    d += ` L ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
  }

  d += ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`;
  return d;
}

function routedPath(
  sx: number, sy: number,
  tx: number, ty: number,
  sourceId: string,
  targetId: string,
  nodes: Node[],
  bypassShift: number = 0,
): string {
  // Detect nodes whose bounding box intersects the direct vertical/horizontal
  // route from source to target.
  const minY = Math.min(sy, ty);
  const maxY = Math.max(sy, ty);
  const minX = Math.min(sx, tx) - 8;
  const maxX = Math.max(sx, tx) + 8;

  const blocking = nodes.filter((n) => {
    if (n.id === sourceId || n.id === targetId || n.type === "tierLabel") return false;
    const left  = n.position.x;
    const right = left + NODE_W;
    const top   = n.position.y;
    const bot   = top + NODE_H;
    // Must overlap both vertical and horizontal ranges of the path corridor
    return top < maxY && bot > minY && left <= maxX && right >= minX;
  });

  // Offset crossing by ±5px based on direction so left-going and right-going
  // edges that share the same tier pair don't overlap each other.
  const dirOffset = tx < sx ? -5 : tx > sx ? 5 : 0;
  const crossY = (sy + ty) / 2 + dirOffset;

  if (blocking.length === 0) {
    return smoothPoly([
      [sx, sy],
      [sx, crossY],
      [tx, crossY],
      [tx, ty],
    ], CORNER_R);
  }

  // Bypass: route to the left of every blocking node.
  const srcNode = nodes.find((n) => n.id === sourceId);
  const tgtNode = nodes.find((n) => n.id === targetId);

  const bypassX =
    Math.min(
      ...blocking.map((n) => n.position.x),
      srcNode?.position.x ?? sx,
      tgtNode?.position.x ?? tx,
    ) - BYPASS_MARGIN + bypassShift;

  const pts: [number, number][] = [
    [sx, sy],
    [sx, sy + BYPASS_MARGIN],
    [bypassX, sy + BYPASS_MARGIN],
    [bypassX, ty - BYPASS_MARGIN],
    [tx, ty - BYPASS_MARGIN],
    [tx, ty],
  ];

  return smoothPoly(pts, CORNER_R);
}

const CHANNEL_SPREAD = 20; // px between parallel bypass channels

function channelOffset(index: number, total: number): number {
  if (total <= 1) return 0;
  // Spread symmetrically around 0
  return (index - (total - 1) / 2) * CHANNEL_SPREAD;
}

function DependencyEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  style,
  source,
  target,
  data,
}: EdgeProps) {
  const nodes   = useNodes();
  const edgeState    = selected ? "selected" : "default";
  const overflowStyle = useEdgeStyle({ state: edgeState });

  // Spread every bypass channel by a unique global offset so no two edges
  // share the same corridor, regardless of which source card they come from.
  // Stems (the exit/entry verticals) are unaffected — they stay on the handle.
  const d = data as { edgeIndex?: number; edgeTotal?: number } | undefined;
  const shift = channelOffset(d?.edgeIndex ?? 0, d?.edgeTotal ?? 1);

  const edgePath = routedPath(sourceX, sourceY, targetX, targetY, source, target, nodes, shift);

  const mergedStyle = {
    ...overflowStyle,
    stroke: style?.stroke ?? overflowStyle.stroke,
    opacity: 0.6,
  };

  // Mid-point for the label
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={mergedStyle} />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            <EdgeLabel state={edgeState} size="extra-small" type="icon">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </EdgeLabel>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DependencyEdge = memo(DependencyEdgeComponent);
