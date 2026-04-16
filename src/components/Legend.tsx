"use client";

import { STATUS_CONFIG } from "@/lib/types";

export function Legend() {
  return (
    <div className="flex justify-center gap-6 flex-wrap">
      {Object.entries(STATUS_CONFIG).map(([status, config]) => (
        <div
          key={status}
          className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
        >
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: config.color }}
          />
          {status}
        </div>
      ))}
    </div>
  );
}
