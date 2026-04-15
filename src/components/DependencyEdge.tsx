"use client";

import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
  EdgeLabelRenderer,
} from "@xyflow/react";
import { useEdgeStyle, EdgeLabel } from "@synergycodes/overflow-ui";

type Pt = { x: number; y: number };

/**
 * Build a smooth SVG path through an ordered list of points.
 * Straight segments between waypoints, with a small quadratic-bezier
 * rounded corner at each bend — so the path never cuts through nodes.
 */
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  const R = 14; // corner-rounding radius (px)
  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const len1 = Math.hypot(dx1, dy1);

    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.hypot(dx2, dy2);

    if (len1 === 0 || len2 === 0) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const r = Math.min(R, len1 / 2, len2 / 2);

    // Point just before the corner
    const ax = curr.x - (r / len1) * dx1;
    const ay = curr.y - (r / len1) * dy1;

    // Point just after the corner
    const bx = curr.x + (r / len2) * dx2;
    const by = curr.y + (r / len2) * dy2;

    d += ` L ${ax} ${ay} Q ${curr.x} ${curr.y} ${bx} ${by}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function labelMidpoint(pts: Pt[]): [number, number] {
  const mid = Math.floor((pts.length - 1) / 2);
  const a = pts[mid];
  const b = pts[mid + 1] ?? a;
  return [(a.x + b.x) / 2, (a.y + b.y) / 2];
}

function DependencyEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style,
  data,
}: EdgeProps) {
  const edgeState = selected ? "selected" : "default";
  const overflowStyle = useEdgeStyle({ state: edgeState });

  const mergedStyle = {
    ...overflowStyle,
    stroke: style?.stroke ?? overflowStyle.stroke,
    opacity: 0.6,
  };

  // Use dagre waypoints when available; fall back to a simple bezier.
  const rawWaypoints = (data as { waypoints?: Pt[] } | undefined)?.waypoints ?? [];

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (rawWaypoints.length > 2) {
    // Dagre gives us the full path including points at the node boundaries.
    // Replace the first/last dagre points with the actual React Flow handle
    // positions so the line connects exactly to the handles.
    const innerPts = rawWaypoints.slice(1, -1);
    const pts: Pt[] = [
      { x: sourceX, y: sourceY },
      ...innerPts,
      { x: targetX, y: targetY },
    ];
    edgePath = smoothPath(pts);
    [labelX, labelY] = labelMidpoint(pts);
  } else {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
  }

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
                <path
                  d="M2 6h8M7 3l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </EdgeLabel>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DependencyEdge = memo(DependencyEdgeComponent);
