"use client";

import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
  EdgeLabelRenderer,
} from "@xyflow/react";
import { useEdgeStyle, EdgeLabel } from "@synergycodes/overflow-ui";

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
}: EdgeProps) {
  const edgeState = selected ? "selected" : "default";
  const overflowStyle = useEdgeStyle({ state: edgeState });

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  // Merge the Overflow edge styles with custom color from the edge style prop
  const mergedStyle = {
    ...overflowStyle,
    stroke: style?.stroke || overflowStyle.stroke,
    opacity: 0.6,
  };

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
