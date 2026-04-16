"use client";

import { useStatusColors } from "./StatusColorsContext";

export function Legend() {
  const statusColors = useStatusColors();
  const entries = Object.entries(statusColors);
  if (entries.length === 0) return null;
  return (
    <div className="flex justify-center gap-6 flex-wrap">
      {entries.map(([status, c]) => (
        <div
          key={status}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: c.fg }}
          />
          {status}
        </div>
      ))}
    </div>
  );
}
