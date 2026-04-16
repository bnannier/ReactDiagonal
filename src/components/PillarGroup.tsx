"use client";

import { memo, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { NodeProps } from "@xyflow/react";

const PILLAR_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  Explore:    { bg: "rgba(99, 102, 241, 0.035)", border: "rgba(99, 102, 241, 0.14)", label: "#818cf8" },
  Grow:       { bg: "rgba(34, 197, 94, 0.035)",  border: "rgba(34, 197, 94, 0.14)",  label: "#4ade80" },
  Manage:     { bg: "rgba(245, 158, 11, 0.035)", border: "rgba(245, 158, 11, 0.14)", label: "#fbbf24" },
  Onboard:    { bg: "rgba(59, 130, 246, 0.035)", border: "rgba(59, 130, 246, 0.14)", label: "#60a5fa" },
  Navigation: { bg: "rgba(168, 85, 247, 0.035)", border: "rgba(168, 85, 247, 0.14)", label: "#c084fc" },
};

const PILLAR_COLORS_LIGHT: Record<string, { bg: string; border: string; label: string }> = {
  Explore:    { bg: "rgba(99, 102, 241, 0.07)", border: "rgba(99, 102, 241, 0.275)", label: "#4338ca" },
  Grow:       { bg: "rgba(34, 197, 94, 0.07)",  border: "rgba(34, 197, 94, 0.275)",  label: "#15803d" },
  Manage:     { bg: "rgba(245, 158, 11, 0.07)", border: "rgba(245, 158, 11, 0.275)", label: "#b45309" },
  Onboard:    { bg: "rgba(59, 130, 246, 0.07)", border: "rgba(59, 130, 246, 0.275)", label: "#1d4ed8" },
  Navigation: { bg: "rgba(168, 85, 247, 0.07)", border: "rgba(168, 85, 247, 0.275)", label: "#7e22ce" },
};

const DEFAULT_COLOR = {
  bg: "rgba(148, 163, 184, 0.035)",
  border: "rgba(148, 163, 184, 0.14)",
  label: "#94a3b8",
};

const DEFAULT_COLOR_LIGHT = {
  bg: "rgba(148, 163, 184, 0.08)",
  border: "rgba(148, 163, 184, 0.275)",
  label: "#475569",
};

function PillarGroupComponent({ data, width, height }: NodeProps) {
  const label = (data as { label: string }).label;
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && resolvedTheme === "light";
  const palette = isLight ? PILLAR_COLORS_LIGHT : PILLAR_COLORS;
  const fallback = isLight ? DEFAULT_COLOR_LIGHT : DEFAULT_COLOR;
  const c = palette[label] ?? fallback;

  return (
    <div
      style={{
        width: width ?? "100%",
        height: height ?? "100%",
        background: c.bg,
        border: `1.5px solid ${c.border}`,
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
          color: c.label,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export const PillarGroup = memo(PillarGroupComponent);
