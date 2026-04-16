"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

interface TierLabelData {
  label: string;
  [key: string]: unknown;
}

function TierLabelComponent({ data }: NodeProps) {
  const labelData = data as unknown as TierLabelData;
  return (
    <div className="text-[10px] font-bold tracking-[3px] text-slate-500 dark:text-slate-500 uppercase select-none">
      {labelData.label}
    </div>
  );
}

export const TierLabel = memo(TierLabelComponent);
