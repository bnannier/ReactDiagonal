"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { usePillarColors } from "./PillarColorsContext";

function hexWithAlpha(hex: string, alphaHex: string): string {
  const clean = hex.startsWith("#") ? hex : `#${hex}`;
  if (clean.length === 9) return clean.slice(0, 7) + alphaHex;
  return clean + alphaHex;
}

function PillarGroupComponent({ data, width, height }: NodeProps) {
  const label = (data as { label: string }).label;
  const pillarColors = usePillarColors();
  const colors = pillarColors[label];

  // When Coda has no color for this pillar (or the pillar field is blank),
  // fall back to neutral shadcn-ish tones via inline rgba.
  const bg = colors ? hexWithAlpha(colors.bg, "33") : "rgba(148, 163, 184, 0.08)";
  const border = colors ? hexWithAlpha(colors.fg, "8c") : "rgba(148, 163, 184, 0.45)";
  const labelColor = colors?.fg ?? "#64748b";

  return (
    <div
      style={{
        width: width ?? "100%",
        height: height ?? "100%",
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 18,
        position: "relative",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 8,
          left: 14,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: labelColor,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export const PillarGroup = memo(PillarGroupComponent);
