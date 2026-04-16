"use client";

import { memo, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { NodeProps } from "@xyflow/react";

const PILLAR_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  Explore:    { bg: "rgba(99, 102, 241, 0.12)", border: "rgba(99, 102, 241, 0.55)", label: "#a5b4fc" },
  Grow:       { bg: "rgba(34, 197, 94, 0.12)",  border: "rgba(34, 197, 94, 0.55)",  label: "#86efac" },
  Manage:     { bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.55)", label: "#fcd34d" },
  Onboard:    { bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.55)", label: "#93c5fd" },
  Navigation: { bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.55)", label: "#d8b4fe" },
};

const PILLAR_COLORS_LIGHT: Record<string, { bg: string; border: string; label: string }> = {
  Explore:    { bg: "rgba(99, 102, 241, 0.14)", border: "rgba(99, 102, 241, 0.65)", label: "#4338ca" },
  Grow:       { bg: "rgba(34, 197, 94, 0.14)",  border: "rgba(34, 197, 94, 0.65)",  label: "#15803d" },
  Manage:     { bg: "rgba(245, 158, 11, 0.14)", border: "rgba(245, 158, 11, 0.65)", label: "#b45309" },
  Onboard:    { bg: "rgba(59, 130, 246, 0.14)", border: "rgba(59, 130, 246, 0.65)", label: "#1d4ed8" },
  Navigation: { bg: "rgba(168, 85, 247, 0.14)", border: "rgba(168, 85, 247, 0.65)", label: "#7e22ce" },
};

const DEFAULT_COLOR = {
  bg: "rgba(148, 163, 184, 0.12)",
  border: "rgba(148, 163, 184, 0.55)",
  label: "#cbd5e1",
};

const DEFAULT_COLOR_LIGHT = {
  bg: "rgba(148, 163, 184, 0.14)",
  border: "rgba(148, 163, 184, 0.65)",
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
